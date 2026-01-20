#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

#include "pico/stdlib.h"
#include "pico/time.h"
#include "pico/types.h"
#include "hardware/timer.h"
#include "hardware/spi.h"
#include "hardware/adc.h"
#include "hardware/i2c.h"
#include "hardware/gpio.h"

#include "tusb.h"
#include "tusb_config.h"
#include "./usb_descriptors.h"

#include "bsp/board_api.h"
#include "class/hid/hid.h"
#include "class/hid/hid_device.h"
#include <vector>

#include "WS2812/WS2812.h"
#include "WS2812/custom.h"
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/i2c.h"
#include "hardware/gpio.h"
#include "bsp/board.h"
#include "tusb.h"

// ---------- I2C SLAVE ----------
#define I2C_PORT i2c0
#define I2C_SDA_PIN 4
#define I2C_SCL_PIN 5
#define I2C_BAUD 100000
#define SLAVE_ADDR 0x55

// ---------- Protocol ----------
static uint8_t toSend[7] = {
    0,
    0, // buttons
    0, // dpad
    128,
    128, // left stick
    128,
    128, // right stick
};

// TX burst
static uint8_t tx_buf[32];
static volatile uint8_t tx_len = 0;
static volatile uint8_t tx_idx = 0;

// ---------- Debug flags/counters (NO USB in ISR) ----------
static volatile uint32_t log_flags = 0;
#define LOG_REQ (1u << 0)
#define LOG_RES1 (1u << 1)
#define LOG_RES2 (1u << 2)

static volatile uint32_t isr_rdreq = 0;
static volatile uint32_t isr_rxfull = 0;
static volatile uint32_t isr_stop = 0;

static inline void prepare_tx_from_pending(void)
{
    tx_len = 0;
    tx_idx = 0;

    memcpy(tx_buf, toSend, sizeof(toSend));
    tx_len = (uint8_t)sizeof(toSend);
}

static inline void handle_rx_byte(uint8_t b)
{
    log_flags |= LOG_REQ;
}

// ---------- I2C ISR ----------
static inline void fill_tx_fifo(i2c_hw_t *hw)
{
    // tx fifo depth = 16
    while (tx_idx < tx_len && hw->txflr < 16)
    {
        hw->data_cmd = tx_buf[tx_idx++];
    }
}

static void i2c0_slave_isr(void)
{
    i2c_hw_t *hw = i2c_get_hw(I2C_PORT);
    uint32_t status = hw->raw_intr_stat;

    // 1) master read request (START + addr(R))
    if (status & I2C_IC_INTR_STAT_R_RD_REQ_BITS)
    {
        (void)hw->clr_rd_req;
        isr_rdreq++;

        // 새 read 트랜잭션 시작: 전송 버퍼 준비
        prepare_tx_from_pending();

        // TX FIFO를 가능한 만큼 채워두기
        fill_tx_fifo(hw);
    }

    // 2) TX fifo empty -> keep feeding remaining bytes
    if (status & I2C_IC_INTR_STAT_R_TX_EMPTY_BITS)
    {
        fill_tx_fifo(hw);
        // 다 보냈으면 그냥 둬도 되고,
        // 폭주가 심하면 tx_idx>=tx_len일 때 TX_EMPTY mask 잠시 끄는 방식도 가능
    }

    // 3) master write rx
    if (status & I2C_IC_INTR_STAT_R_RX_FULL_BITS)
    {
        isr_rxfull++;
        while (hw->rxflr)
        {
            uint8_t in = (uint8_t)(hw->data_cmd & 0xFF);
            handle_rx_byte(in);
        }
    }

    // 4) stop
    if (status & I2C_IC_INTR_STAT_R_STOP_DET_BITS)
    {
        (void)hw->clr_stop_det;
        isr_stop++;

        tx_len = 0;
        tx_idx = 0;

        // (선택) TX FIFO flush 느낌으로 intr clear
        (void)hw->clr_intr;
    }
}

static void i2c_slave_init(void)
{
    gpio_set_function(I2C_SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(I2C_SCL_PIN, GPIO_FUNC_I2C);

    // 내장 풀업은 약함: 외부 4.7k~10k 권장(3.3V로)
    gpio_pull_up(I2C_SDA_PIN);
    gpio_pull_up(I2C_SCL_PIN);

    i2c_init(I2C_PORT, I2C_BAUD);

    // ✅ 핵심: SDK로 슬레이브 모드 전환/주소 설정
    i2c_set_slave_mode(I2C_PORT, true, SLAVE_ADDR);

    // interrupt enable (RD_REQ, RX_FULL, STOP)
    i2c_hw_t *hw = i2c_get_hw(I2C_PORT);
    (void)hw->clr_intr;
    hw->intr_mask =
        I2C_IC_INTR_MASK_M_RD_REQ_BITS |
        I2C_IC_INTR_MASK_M_RX_FULL_BITS |
        I2C_IC_INTR_MASK_M_STOP_DET_BITS |
        I2C_IC_INTR_MASK_M_TX_EMPTY_BITS;

    irq_set_exclusive_handler(I2C0_IRQ, i2c0_slave_isr);
    irq_set_priority(I2C0_IRQ, 0xC0);
    irq_set_enabled(I2C0_IRQ, true);
}

static void cdc_write(const char *s)
{
    tud_cdc_write_str(s);
    tud_cdc_write_flush();
}

static void cdc_poll_logs(void)
{
    static uint32_t last = 0;
    uint32_t now = board_millis();
    if (now - last >= 1000)
    {
        last = now;
        char buf[120];
        snprintf(buf, sizeof(buf),
                 "rq=%lu rxf=%lu stop=%lu addr=0x%02X\r\n",
                 (unsigned long)isr_rdreq,
                 (unsigned long)isr_rxfull,
                 (unsigned long)isr_stop,
                 SLAVE_ADDR);
        tud_cdc_write_str(buf);
        tud_cdc_write_flush();
        sprintf(buf, "sending %d %d %d %d %d %d %d\r\n",
                toSend[0], toSend[1], toSend[2], toSend[3],
                toSend[4], toSend[5], toSend[6]);
        tud_cdc_write_str(buf);
        tud_cdc_write_flush();
    }
}

// ---------- MAIN ----------
#define BUF_SIZE 16

uint8_t buf[BUF_SIZE] = {0};
uint8_t buf_len = 0;

const uint8_t magicByte[] = {0x55, 0xAA};
const uint8_t endMagicByte[] = {0x0D, 0x0A};

void process_data(uint8_t *data, uint8_t len)
{
    if (len != 7)
        return; // 잘못된 길이 무시
    // 데이터 복사
    memcpy(toSend, data, len);
}

void push_byte(uint8_t b)
{
    if (buf_len < BUF_SIZE)
    {
        buf[buf_len++] = b;
    }
}

void try_parse_packet()
{
    // 최소 길이: start(2) + end(2)
    if (buf_len < 4)
        return;

    for (uint8_t i = 0; i <= buf_len - 4; i++)
    {
        // start magic 검사
        if (buf[i] == magicByte[0] && buf[i + 1] == magicByte[1])
        {
            // end magic 찾기
            for (uint8_t j = i + 2; j <= buf_len - 2; j++)
            {
                if (buf[j] == endMagicByte[0] && buf[j + 1] == endMagicByte[1])
                {
                    uint8_t data_len = j - (i + 2);

                    // data 복사
                    uint8_t data[BUF_SIZE];
                    memcpy(data, &buf[i + 2], data_len);

                    process_data(data, data_len);

                    // 🔥 사용한 바이트 제거 (buffer compact)
                    uint8_t remove_len = (j + 2);
                    memmove(buf, &buf[remove_len], buf_len - remove_len);
                    buf_len -= remove_len;

                    return; // 한 패킷 처리 후 종료
                }
            }
        }
    }
}

int main()
{
    board_init();
    tusb_init();

    // USB 열거 안정화
    absolute_time_t t0 = get_absolute_time();
    while (!tud_mounted())
    {
        tud_task();
        sleep_ms(1);
        if (absolute_time_diff_us(t0, get_absolute_time()) > 800 * 1000)
            break;
    }

    i2c_slave_init();

    gpio_init(PICO_DEFAULT_LED_PIN);
    gpio_set_dir(PICO_DEFAULT_LED_PIN, GPIO_OUT);

    cdc_write("SLAVE UP\r\n");

    while (true)
    {
        tud_task();
        cdc_poll_logs();

        static uint32_t last = 0;
        uint32_t now = board_millis();
        if (now - last >= 500)
        {
            last = now;
            static bool s = false;
            gpio_put(PICO_DEFAULT_LED_PIN, s);
            s = !s;
        }

        while (tud_cdc_available())
        {
            uint8_t ch = (uint8_t)tud_cdc_read_char();
            push_byte(ch);
            try_parse_packet();
        }

        sleep_ms(1);
    }
}

// TinyUSB callbacks (필수는 아님)
void tud_mount_cb(void) {}
void tud_umount_cb(void) {}
void tud_suspend_cb(bool remote_wakeup_en) { (void)remote_wakeup_en; }
void tud_resume_cb(void) {}
void tud_cdc_line_state_cb(uint8_t itf, bool dtr, bool rts)
{
    (void)itf;
    (void)dtr;
    (void)rts;
}
void tud_cdc_rx_cb(uint8_t itf) { (void)itf; }