#ifndef WS2812_H
#define WS2812_H

#include "pico/types.h"
#include "hardware/pio.h"
#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C"
{
#endif

#define WS2812_PIN 23
#define WS2812_LENGTH 1

    // Enums for data configuration
    typedef enum
    {
        WS2812_BYTE_NONE = 0,
        WS2812_BYTE_RED = 1,
        WS2812_BYTE_GREEN = 2,
        WS2812_BYTE_BLUE = 3,
        WS2812_BYTE_WHITE = 4
    } ws2812_data_byte_t;

    typedef enum
    {
        WS2812_FORMAT_RGB = 0,
        WS2812_FORMAT_GRB = 1,
        WS2812_FORMAT_WRGB = 2
    } ws2812_data_format_t;

    // WS2812 structure (replaces the C++ class)
    typedef struct
    {
        uint pin;
        uint length;
        PIO pio;
        uint sm;
        ws2812_data_byte_t bytes[4];
        uint32_t *data;
    } ws2812_t;

    // Function prototypes

    // Initialization functions
    ws2812_t *ws2812_init(uint pin, uint length, PIO pio, uint sm);
    ws2812_t *ws2812_init_format(uint pin, uint length, PIO pio, uint sm, ws2812_data_format_t format);
    ws2812_t *ws2812_init_bytes_3(uint pin, uint length, PIO pio, uint sm,
                                  ws2812_data_byte_t b1, ws2812_data_byte_t b2, ws2812_data_byte_t b3);
    ws2812_t *ws2812_init_bytes_4(uint pin, uint length, PIO pio, uint sm,
                                  ws2812_data_byte_t b1, ws2812_data_byte_t b2,
                                  ws2812_data_byte_t b3, ws2812_data_byte_t b4);

    // Cleanup function
    void ws2812_free(ws2812_t *ws);

    // Color utility functions
    uint32_t ws2812_rgb(uint8_t red, uint8_t green, uint8_t blue);
    uint32_t ws2812_rgbw(uint8_t red, uint8_t green, uint8_t blue, uint8_t white);

    // Pixel manipulation functions
    void ws2812_set_pixel_color(ws2812_t *ws, uint index, uint32_t color);
    void ws2812_set_pixel_color_rgb(ws2812_t *ws, uint index, uint8_t red, uint8_t green, uint8_t blue);
    void ws2812_set_pixel_color_rgbw(ws2812_t *ws, uint index, uint8_t red, uint8_t green, uint8_t blue, uint8_t white);

    // Fill functions
    void ws2812_fill(ws2812_t *ws, uint32_t color);
    void ws2812_fill_from(ws2812_t *ws, uint32_t color, uint first);
    void ws2812_fill_range(ws2812_t *ws, uint32_t color, uint first, uint count);

    // Display function
    void ws2812_show(ws2812_t *ws);

#ifdef __cplusplus
}
#endif

#endif // WS2812_H