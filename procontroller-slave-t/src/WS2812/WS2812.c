#include "WS2812.h"
#include "WS2812.pio.h"
#include <stdlib.h>
#include <string.h>

// #define DEBUG

#ifdef DEBUG
#include <stdio.h>
#endif

// Internal helper function (equivalent to the private initialize method)
static void ws2812_initialize(ws2812_t *ws, uint pin, uint length, PIO pio, uint sm,
                              ws2812_data_byte_t b1, ws2812_data_byte_t b2,
                              ws2812_data_byte_t b3, ws2812_data_byte_t b4);

// Internal helper function (equivalent to the private convertData method)
static uint32_t ws2812_convert_data(ws2812_t *ws, uint32_t rgbw);

// Initialization functions
ws2812_t *ws2812_init(uint pin, uint length, PIO pio, uint sm)
{
    ws2812_t *ws = (ws2812_t *)malloc(sizeof(ws2812_t));
    if (ws == NULL)
    {
        return NULL;
    }
    ws2812_initialize(ws, pin, length, pio, sm, WS2812_BYTE_NONE, WS2812_BYTE_GREEN, WS2812_BYTE_RED, WS2812_BYTE_BLUE);
    return ws;
}

ws2812_t *ws2812_init_format(uint pin, uint length, PIO pio, uint sm, ws2812_data_format_t format)
{
    ws2812_t *ws = (ws2812_t *)malloc(sizeof(ws2812_t));
    if (ws == NULL)
    {
        return NULL;
    }

    switch (format)
    {
    case WS2812_FORMAT_RGB:
        ws2812_initialize(ws, pin, length, pio, sm, WS2812_BYTE_NONE, WS2812_BYTE_RED, WS2812_BYTE_GREEN, WS2812_BYTE_BLUE);
        break;
    case WS2812_FORMAT_GRB:
        ws2812_initialize(ws, pin, length, pio, sm, WS2812_BYTE_NONE, WS2812_BYTE_GREEN, WS2812_BYTE_RED, WS2812_BYTE_BLUE);
        break;
    case WS2812_FORMAT_WRGB:
        ws2812_initialize(ws, pin, length, pio, sm, WS2812_BYTE_WHITE, WS2812_BYTE_RED, WS2812_BYTE_GREEN, WS2812_BYTE_BLUE);
        break;
    }
    return ws;
}

ws2812_t *ws2812_init_bytes_3(uint pin, uint length, PIO pio, uint sm,
                              ws2812_data_byte_t b1, ws2812_data_byte_t b2, ws2812_data_byte_t b3)
{
    ws2812_t *ws = (ws2812_t *)malloc(sizeof(ws2812_t));
    if (ws == NULL)
    {
        return NULL;
    }
    ws2812_initialize(ws, pin, length, pio, sm, b1, b1, b2, b3);
    return ws;
}

ws2812_t *ws2812_init_bytes_4(uint pin, uint length, PIO pio, uint sm,
                              ws2812_data_byte_t b1, ws2812_data_byte_t b2,
                              ws2812_data_byte_t b3, ws2812_data_byte_t b4)
{
    ws2812_t *ws = (ws2812_t *)malloc(sizeof(ws2812_t));
    if (ws == NULL)
    {
        return NULL;
    }
    ws2812_initialize(ws, pin, length, pio, sm, b1, b2, b3, b4);
    return ws;
}

// Cleanup function
void ws2812_free(ws2812_t *ws)
{
    if (ws != NULL)
    {
        if (ws->data != NULL)
        {
            free(ws->data);
        }
        free(ws);
    }
}

// Internal helper function (equivalent to the private initialize method)
static void ws2812_initialize(ws2812_t *ws, uint pin, uint length, PIO pio, uint sm,
                              ws2812_data_byte_t b1, ws2812_data_byte_t b2,
                              ws2812_data_byte_t b3, ws2812_data_byte_t b4)
{
    ws->pin = pin;
    ws->length = length;
    ws->pio = pio;
    ws->sm = sm;
    ws->data = (uint32_t *)malloc(length * sizeof(uint32_t));
    if (ws->data != NULL)
    {
        memset(ws->data, 0, length * sizeof(uint32_t));
    }
    ws->bytes[0] = b1;
    ws->bytes[1] = b2;
    ws->bytes[2] = b3;
    ws->bytes[3] = b4;

    uint offset = pio_add_program(pio, &ws2812_program);
    uint bits = (b1 == WS2812_BYTE_NONE ? 24 : 32);

#ifdef DEBUG
    printf("WS2812 / Initializing SM %u with offset %X at pin %u and %u data bits...\n", sm, offset, pin, bits);
#endif

    ws2812_program_init(pio, sm, offset, pin, 800000, bits);
}

// Internal helper function (equivalent to the private convertData method)
static uint32_t ws2812_convert_data(ws2812_t *ws, uint32_t rgbw)
{
    uint32_t result = 0;
    for (uint b = 0; b < 4; b++)
    {
        switch (ws->bytes[b])
        {
        case WS2812_BYTE_RED:
            result |= (rgbw & 0xFF);
            break;
        case WS2812_BYTE_GREEN:
            result |= (rgbw & 0xFF00) >> 8;
            break;
        case WS2812_BYTE_BLUE:
            result |= (rgbw & 0xFF0000) >> 16;
            break;
        case WS2812_BYTE_WHITE:
            result |= (rgbw & 0xFF000000) >> 24;
            break;
        }
        result <<= 8;
    }
    return result;
}

// Color utility functions
uint32_t ws2812_rgb(uint8_t red, uint8_t green, uint8_t blue)
{
    return (uint32_t)(blue) << 16 | (uint32_t)(green) << 8 | (uint32_t)(red);
}

uint32_t ws2812_rgbw(uint8_t red, uint8_t green, uint8_t blue, uint8_t white)
{
    return (uint32_t)(white) << 24 | (uint32_t)(blue) << 16 | (uint32_t)(green) << 8 | (uint32_t)(red);
}

// Pixel manipulation functions
void ws2812_set_pixel_color(ws2812_t *ws, uint index, uint32_t color)
{
    if (ws != NULL && ws->data != NULL && index < ws->length)
    {
        ws->data[index] = ws2812_convert_data(ws, color);
    }
}

void ws2812_set_pixel_color_rgb(ws2812_t *ws, uint index, uint8_t red, uint8_t green, uint8_t blue)
{
    ws2812_set_pixel_color(ws, index, ws2812_rgb(red, green, blue));
}

void ws2812_set_pixel_color_rgbw(ws2812_t *ws, uint index, uint8_t red, uint8_t green, uint8_t blue, uint8_t white)
{
    ws2812_set_pixel_color(ws, index, ws2812_rgbw(red, green, blue, white));
}

// Fill functions
void ws2812_fill(ws2812_t *ws, uint32_t color)
{
    if (ws != NULL)
    {
        ws2812_fill_range(ws, color, 0, ws->length);
    }
}

void ws2812_fill_from(ws2812_t *ws, uint32_t color, uint first)
{
    if (ws != NULL && first < ws->length)
    {
        ws2812_fill_range(ws, color, first, ws->length - first);
    }
}

void ws2812_fill_range(ws2812_t *ws, uint32_t color, uint first, uint count)
{
    if (ws == NULL || ws->data == NULL)
    {
        return;
    }

    uint last = (first + count);
    if (last > ws->length)
    {
        last = ws->length;
    }

    color = ws2812_convert_data(ws, color);
    for (uint i = first; i < last; i++)
    {
        ws->data[i] = color;
    }
}

// Display function
void ws2812_show(ws2812_t *ws)
{
    if (ws == NULL || ws->data == NULL)
    {
        return;
    }

#ifdef DEBUG
    for (uint i = 0; i < ws->length; i++)
    {
        printf("WS2812 / Put data: %08X\n", ws->data[i]);
    }
#endif

    for (uint i = 0; i < ws->length; i++)
    {
        pio_sm_put_blocking(ws->pio, ws->sm, ws->data[i]);
    }
}