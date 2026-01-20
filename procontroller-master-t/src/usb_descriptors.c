#include "tusb.h"
#include "usb_descriptors.h"
#include "class/hid/hid.h"
#include "device/usbd.h"

//--------------------------------------------------------------------+
// Device Descriptors
//--------------------------------------------------------------------+
tusb_desc_device_t const desc_device =
    {
        .bLength = sizeof(tusb_desc_device_t),
        .bDescriptorType = TUSB_DESC_DEVICE,
        .bcdUSB = 0x0200,
        .bDeviceClass = 0x00,
        .bDeviceSubClass = 0x00,
        .bDeviceProtocol = 0x00,
        .bMaxPacketSize0 = CFG_TUD_ENDPOINT0_SIZE,

        // Vendor/Product matching Nintendo Switch Pro Controller
        .idVendor = 0x0f0d,
        .idProduct = 0x00c1,
        .bcdDevice = 0x0100,

        .iManufacturer = 0x01,
        .iProduct = 0x02,
        .iSerialNumber = 0x03,

        .bNumConfigurations = 0x01};

// Use NS gamepad descriptor from procon.h -> desc_hid_report

uint8_t const desc_hid_nintendo[] = {
    // Gamepad for Nintendo Switch
    // 14 buttons, 1 8-way dpad, 2 analog sticks (4 axes)
    0x05,
    0x01, // Usage Page (Generic Desktop Ctrls)
    0x09,
    0x05, // Usage (Game Pad)
    0xA1,
    0x01, // Collection (Application)
    0x15,
    0x00, //   Logical Minimum (0)
    0x25,
    0x01, //   Logical Maximum (1)
    0x35,
    0x00, //   Physical Minimum (0)
    0x45,
    0x01, //   Physical Maximum (1)
    0x75,
    0x01, //   Report Size (1)
    0x95,
    0x0E, //   Report Count (14)
    0x05,
    0x09, //   Usage Page (Button)
    0x19,
    0x01, //   Usage Minimum (0x01)
    0x29,
    0x0E, //   Usage Maximum (0x0E)
    0x81,
    0x02, //   Input (Data,Var,Abs,No Wrap,Linear,Preferred State,No Null Position)
    0x95,
    0x02, //   Report Count (2)
    0x81,
    0x01, //   Input (Const,Array,Abs,No Wrap,Linear,Preferred State,No Null Position)
    0x05,
    0x01, //   Usage Page (Generic Desktop Ctrls)
    0x25,
    0x07, //   Logical Maximum (7)
    0x46,
    0x3B,
    0x01, //   Physical Maximum (315)
    0x75,
    0x04, //   Report Size (4)
    0x95,
    0x01, //   Report Count (1)
    0x65,
    0x14, //   Unit (System: English Rotation, Length: Centimeter)
    0x09,
    0x39, //   Usage (Hat switch)
    0x81,
    0x42, //   Input (Data,Var,Abs,No Wrap,Linear,Preferred State,Null State)
    0x65,
    0x00, //   Unit (None)
    0x95,
    0x01, //   Report Count (1)
    0x81,
    0x01, //   Input (Const,Array,Abs,No Wrap,Linear,Preferred State,No Null Position)
    0x26,
    0xFF,
    0x00, //   Logical Maximum (255)
    0x46,
    0xFF,
    0x00, //   Physical Maximum (255)
    0x09,
    0x30, //   Usage (X)
    0x09,
    0x31, //   Usage (Y)
    0x09,
    0x32, //   Usage (Z)
    0x09,
    0x35, //   Usage (Rz)
    0x75,
    0x08, //   Report Size (8)
    0x95,
    0x04, //   Report Count (4)
    0x81,
    0x02, //   Input (Data,Var,Abs,No Wrap,Linear,Preferred State,No Null Position)
    0x75,
    0x08, //   Report Size (8)
    0x95,
    0x01, //   Report Count (1)
    0x81,
    0x01, //   Input (Const,Array,Abs,No Wrap,Linear,Preferred State,No Null Position)
    0xC0, // End Collection
};

// Invoked when received GET DEVICE DESCRIPTOR
// Application return pointer to descriptor
uint8_t const *tud_descriptor_device_cb(void)
{
  return (uint8_t const *)&desc_device;
}

//--------------------------------------------------------------------+
// Configuration Descriptor
//--------------------------------------------------------------------+

#define EPNUM_GAMEPAD 0x81

#define CONFIG_TOTAL_LEN (TUD_CONFIG_DESC_LEN + TUD_HID_DESC_LEN)
uint8_t const desc_configuration[] =
    {
        // Configuration number, interface count, string index, total length, attribute, power in mA
        TUD_CONFIG_DESCRIPTOR(1, ITF_NUM_TOTAL, 0, CONFIG_TOTAL_LEN, 0, 100),

        TUD_HID_DESCRIPTOR(ITF_NUM_GAMEPAD, 0, HID_ITF_PROTOCOL_NONE, sizeof(desc_hid_nintendo), EPNUM_GAMEPAD, CFG_TUD_HID_EP_BUFSIZE, 1),
};

// Invoked when received GET CONFIGURATION DESCRIPTOR
// Application return pointer to descriptor
// Descriptor contents must exist long enough for transfer to complete
uint8_t const *tud_descriptor_configuration_cb(uint8_t index)
{
  (void)index; // for multiple configurations
  return desc_configuration;
}

uint8_t const *tud_hid_descriptor_report_cb(uint8_t instance)
{
  switch (instance)
  {
  case ITF_NUM_GAMEPAD:
    return desc_hid_nintendo;
  // case ITF_NUM_CDC:
  //   return NULL;
  default:
    return NULL;
  }
}

//--------------------------------------------------------------------+
// String Descriptors
//--------------------------------------------------------------------+

// array of pointer to string descriptors
char const *string_desc_arr[] =
    {
        (const char[]){0x09, 0x04}, // 0: is supported language is English (0x0409)
        "Nintendo Co., Ltd",        // 1: Manufacturer
        "Pro Controller",           // 2: Product
        "000000000001",             // 3: Serials
};

static uint16_t _desc_str[32];

// Invoked when received GET STRING DESCRIPTOR request
// Application return pointer to descriptor, whose contents must exist long enough for transfer to complete
uint16_t const *tud_descriptor_string_cb(uint8_t index, uint16_t langid)
{
  (void)langid;

  uint8_t chr_count;

  if (index == 0)
  {
    memcpy(&_desc_str[1], string_desc_arr[0], 2);
    chr_count = 1;
  }
  else
  {
    // Note: the 0xEE index string is a Microsoft OS 1.0 Descriptors.
    // https://docs.microsoft.com/en-us/windows-hardware/drivers/usbcon/microsoft-defined-usb-descriptors

    if (!(index < sizeof(string_desc_arr) / sizeof(string_desc_arr[0])))
      return NULL;

    const char *str = string_desc_arr[index];

    // Cap at max char
    chr_count = strlen(str);
    if (chr_count > 31)
      chr_count = 31;

    // Convert ASCII string into UTF-16
    for (uint8_t i = 0; i < chr_count; i++)
    {
      _desc_str[1 + i] = str[i];
    }
  }

  // first byte is length (including header), second byte is string type
  _desc_str[0] = (TUSB_DESC_STRING << 8) | (2 * chr_count + 2);

  return _desc_str;
}