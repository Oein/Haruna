#ifndef USB_DESCRIPTORS_H_
#define USB_DESCRIPTORS_H_

#include "tusb.h"

enum
{
  ITF_NUM_GAMEPAD = 0,
  ITF_NUM_TOTAL
};

// Use HID_NSGamepadReport_Data_t from procon.h for gamepad reports
// typedef kept out to avoid duplication; include procon.h instead.

// Use TinyUSB's standard keyboard report
// hid_keyboard_report_t is already defined in TinyUSB

#endif /* USB_DESCRIPTORS_H_ */