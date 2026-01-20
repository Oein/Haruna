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
#include "procon.h"

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

#define I2C_PORT i2c0
#define I2C_SDA_PIN 4
#define I2C_SCL_PIN 5
#define I2C_BAUD 100000

#define SLAVE_ADDR 0x55

HID_NSGamepadReport_Data_t gamepad_report = {0};

void hid_task(void);

static void i2c_master_init(void)
{
    i2c_init(I2C_PORT, I2C_BAUD);
    gpio_set_function(I2C_SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(I2C_SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(I2C_SDA_PIN);
    gpio_pull_up(I2C_SCL_PIN);
}

static bool i2c_write_all(const uint8_t *data, size_t len, uint32_t timeout_us)
{
    int r = i2c_write_timeout_us(I2C_PORT, SLAVE_ADDR, data, len, false, timeout_us);
    return r == (int)len;
}

static bool i2c_read_all(uint8_t *data, size_t len, uint32_t timeout_us)
{
    int r = i2c_read_timeout_us(I2C_PORT, SLAVE_ADDR, data, len, false, timeout_us);
    return r == (int)len;
}

static int last_i2c_err = 0;
static uint32_t last_i2c_abrt = 0;

static void capture_i2c_error(void)
{
    // i2c0 기준 (포트 바꾸면 맞춰줘)
    last_i2c_abrt = i2c0->hw->tx_abrt_source;
    i2c0->hw->clr_tx_abrt;
}

int main(void)
{
    board_init();
    i2c_master_init();
    tusb_init();

    gpio_init(PICO_DEFAULT_LED_PIN);
    gpio_set_dir(PICO_DEFAULT_LED_PIN, GPIO_OUT);

    uint32_t last = 0;
    uint32_t blink_ms = 1000;
    static const uint8_t CMD_GET = 0x10;

    while (1)
    {
        tud_task();
        hid_task();

        uint32_t now = board_millis();

        // 10ms 마다 데이터 요청
        if (now - last >= 10)
        {
            last = now;

            bool ok = true;
            uint8_t inData[7] = {0};
            ok &= i2c_write_all(&CMD_GET, 1, 3000);

            if (ok)
            {
                ok &= i2c_read_all(inData, 7, 3000);
                if (ok)
                {
                    // 성공적으로 읽음
                    // 데이터 파싱
                    uint16_t buttons = (uint16_t)inData[0] | ((uint16_t)inData[1] << 8);
                    uint8_t dpad = inData[2];
                    uint8_t leftX = inData[3];
                    uint8_t leftY = inData[4];
                    uint8_t rightX = inData[5];
                    uint8_t rightY = inData[6];

                    gamepad_report.buttons = buttons;
                    gamepad_report.dPad = dpad;
                    gamepad_report.leftXAxis = leftX;
                    gamepad_report.leftYAxis = leftY;
                    gamepad_report.rightXAxis = rightX;
                    gamepad_report.rightYAxis = rightY;
                }
            }

        done:

            blink_ms = ok ? 100 : 1000;
        }

        // LED heartbeat
        static uint32_t led_last = 0;
        if (now - led_last >= blink_ms)
        {
            led_last = now;
            static bool s = false;
            gpio_put(PICO_DEFAULT_LED_PIN, s);
            s = !s;
        }

        sleep_ms(1);
    }
}

void tud_mount_cb(void) {}
void tud_umount_cb(void) {}
void tud_suspend_cb(bool remote_wakeup_en) { (void)remote_wakeup_en; }
void tud_resume_cb(void) {}

// ========================
// HID Task
// ========================

void send_gamepad_report(void)
{
    // skip if hid is not ready
    if (tud_hid_n_ready(ITF_NUM_GAMEPAD))
    {
        tud_hid_n_report(ITF_NUM_GAMEPAD, 0, &gamepad_report, sizeof(gamepad_report));
    }
}

void hid_task(void)
{
    // Poll every 10ms
    const uint32_t interval_ms = 10;
    static uint32_t start_ms = 0;

    uint32_t now = board_millis();
    if (now - start_ms < interval_ms)
        return;
    start_ms = now;

    send_gamepad_report();
}

void tud_hid_report_complete_cb(uint8_t instance, uint8_t const *report, uint16_t len)
{
    (void)len;
    (void)report;
    (void)instance;
    // Don't send from callback, let hid_task() and keyboard_task() handle periodic sending
}

uint16_t tud_hid_get_report_cb(uint8_t instance, uint8_t report_id, hid_report_type_t report_type, uint8_t *buffer, uint16_t reqlen)
{
    (void)instance;
    (void)report_id;
    (void)report_type;
    (void)buffer;
    (void)reqlen;

    return 0;
}

void tud_hid_set_report_cb(uint8_t instance, uint8_t report_id, hid_report_type_t report_type, uint8_t const *buffer, uint16_t bufsize)
{
    (void)instance;
    (void)report_id;
    (void)report_type;
    (void)buffer;
    (void)bufsize;
}