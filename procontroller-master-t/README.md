## Setup env

```sh
mkdir build
cd build
cmake ..
```

## Build uf2

```sh
cd build
make
```

## I2C Control Interface

The Pico exposes an I2C slave interface (address `0x55`) on GPIO 4 (SDA) and GPIO 5 (SCL) to control the gamepad remotely.

### I2C Command Protocol

| Command | Byte | Data | Function                                |
| ------- | ---- | ---- | --------------------------------------- |
| 0x01    | 1    | 2    | Set buttons (16-bit mask)               |
| 0x02    | 1    | 1    | Press button (0-13)                     |
| 0x03    | 1    | 1    | Release button (0-13)                   |
| 0x04    | 1    | 0    | Release all buttons                     |
| 0x10    | 1    | 1    | Set left X axis (0-255)                 |
| 0x11    | 1    | 1    | Set left Y axis (0-255)                 |
| 0x12    | 1    | 1    | Set right X axis (0-255)                |
| 0x13    | 1    | 1    | Set right Y axis (0-255)                |
| 0x14    | 1    | 2    | Set left axis (X, Y)                    |
| 0x15    | 1    | 2    | Set right axis (X, Y)                   |
| 0x16    | 1    | 4    | Set all axes (LX, LY, RX, RY)           |
| 0x20    | 1    | 1    | Set D-Pad (bits: up, right, down, left) |

#### D-Pad Encoding (0x20)

- Byte: `0000abcd` where `a`=up, `b`=right, `c`=down, `d`=left
- Example: `0x01` = right, `0x08` = up, `0x09` = up-right

### I2C Test Client

Use the included Python test client to verify I2C communication:

```bash
pip install smbus2
python3 i2c_test_client.py
```

This script cycles through buttons, axes, and D-Pad states.

## Raspberry Pi (USB Gadget) Port

- Supports running on Raspberry Pi Zero/Zero 2/Compute Module in USB device mode as a Nintendo Switch Pro Controller.
- Uses Linux USB gadget (libcomposite) to expose a HID interface with the same report descriptor as `src/procon.h`.

### Setup

1. Enable gadget mode (Pi Zero/CM) and run the setup script:

```bash
cd rpi
sudo ./setup_gadget.sh
```

This creates a HID gadget with VID/PID `0x0f0d:0x00c1` and report length 8. It exposes `/dev/hidg0` for sending reports.

2. Build the demo that sends reports:

```bash
gcc -O2 -Wall -o demo_rpi rpi/demo_rpi.c
sudo ./demo_rpi
```

3. Remove gadget when done:

```bash
sudo ./setup_gadget.sh --remove
```

Notes:

- USB device mode is only available on Pi Zero/Zero 2/Compute Module via the USB OTG port. Pi 4/3 in host-only mode cannot emulate a USB device without additional hardware.
- The demo sends randomized axes and cycles through buttons/dpad, similar to `demo.c`.
