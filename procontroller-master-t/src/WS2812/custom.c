#include "pico/types.h"
#include "WS2812/WS2812.h"

ws2812_t *ledStrip = NULL;

// HSV to RGB conversion function
// h: hue (0.0 to 1.0), s: saturation (0.0 to 1.0), v: value/brightness (0.0 to 1.0)
// Returns RGB values via pointers
static void hsv_to_rgb(float h, float s, float v, uint8_t *r, uint8_t *g, uint8_t *b)
{
    int i;
    float f, p, q, t;

    if (s == 0)
    {
        // Achromatic (grey)
        *r = *g = *b = (uint8_t)(v * 255);
        return;
    }

    h *= 6.0f; // sector 0 to 5
    i = (int)h;
    f = h - i; // factorial part of h
    p = v * (1 - s);
    q = v * (1 - s * f);
    t = v * (1 - s * (1 - f));

    switch (i)
    {
    case 0:
        *r = (uint8_t)(v * 255);
        *g = (uint8_t)(t * 255);
        *b = (uint8_t)(p * 255);
        break;
    case 1:
        *r = (uint8_t)(q * 255);
        *g = (uint8_t)(v * 255);
        *b = (uint8_t)(p * 255);
        break;
    case 2:
        *r = (uint8_t)(p * 255);
        *g = (uint8_t)(v * 255);
        *b = (uint8_t)(t * 255);
        break;
    case 3:
        *r = (uint8_t)(p * 255);
        *g = (uint8_t)(q * 255);
        *b = (uint8_t)(v * 255);
        break;
    case 4:
        *r = (uint8_t)(t * 255);
        *g = (uint8_t)(p * 255);
        *b = (uint8_t)(v * 255);
        break;
    default: // case 5:
        *r = (uint8_t)(v * 255);
        *g = (uint8_t)(p * 255);
        *b = (uint8_t)(q * 255);
        break;
    }
}

// Rainbow gradient function based on percentage (0-1000)
// Creates a smooth rainbow transition across the full spectrum
void rainbowWS2812(uint32_t percentage)
{
    if (ledStrip == NULL)
        return;

    // Convert percentage (0-1000) to hue (0.0-1.0)
    // Use 0.85 to avoid wrapping back to red at the end (stops at magenta)
    float hue = (percentage / 1000.0f);

    // Full saturation and brightness for vibrant colors
    float saturation = 1.0f;
    float brightness = 0.1f;

    uint8_t r, g, b;
    hsv_to_rgb(hue, saturation, brightness, &r, &g, &b);

    // Set the LED color
    ws2812_set_pixel_color_rgb(ledStrip, 0, r, g, b);
    ws2812_show(ledStrip);
}

void initLEDStrip()
{
    ledStrip = ws2812_init_format(
        WS2812_PIN,       // Data line is connected to pin 23. (GP23)
        WS2812_LENGTH,    // Strip is 1 LED long.
        pio0,             // Use PIO 0 for creating the state machine.
        0,                // Index of the state machine that will be created for controlling the LED strip
                          // You can have 4 state machines per PIO-Block up to 8 overall.
                          // See Chapter 3 in: https://datasheets.raspberrypi.org/rp2040/rp2040-datasheet.pdf
        WS2812_FORMAT_GRB // Pixel format used by the LED strip
    );

    if (ledStrip != NULL)
    {
        ws2812_set_pixel_color_rgb(ledStrip, 0, 0, 0, 32);
        ws2812_show(ledStrip);
    }
}