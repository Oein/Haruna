#pragma once

#include <stdint.h>

typedef uint8_t NSDirection_t;
#define NSGAMEPAD_DPAD_UP 0
#define NSGAMEPAD_DPAD_UP_RIGHT 1
#define NSGAMEPAD_DPAD_RIGHT 2
#define NSGAMEPAD_DPAD_DOWN_RIGHT 3
#define NSGAMEPAD_DPAD_DOWN 4
#define NSGAMEPAD_DPAD_DOWN_LEFT 5
#define NSGAMEPAD_DPAD_LEFT 6
#define NSGAMEPAD_DPAD_UP_LEFT 7
#define NSGAMEPAD_DPAD_CENTERED 0xF

enum NSButtons
{
    NSButton_Y = 0,
    NSButton_B,
    NSButton_A,
    NSButton_X,
    NSButton_LeftTrigger,
    NSButton_RightTrigger,
    NSButton_LeftThrottle,
    NSButton_RightThrottle,
    NSButton_Minus,
    NSButton_Plus,
    NSButton_LeftStick,
    NSButton_RightStick,
    NSButton_Home,
    NSButton_Capture,
    NSButton_Reserved1,
    NSButton_Reserved2
};

#define ATTRIBUTE_PACKED __attribute__((packed, aligned(1)))

// 14 Buttons, 4 Axes, 1 D-Pad
typedef struct ATTRIBUTE_PACKED
{
    uint16_t buttons;

    uint8_t dPad;

    uint8_t leftXAxis;
    uint8_t leftYAxis;

    uint8_t rightXAxis;
    uint8_t rightYAxis;
    uint8_t filler;
} HID_NSGamepadReport_Data_t;