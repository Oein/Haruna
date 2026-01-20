# Haruna:Slave

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

## Port

- SDA: GP4
- SCL: GP5
- GND: GND
- I2C : 0x55

## I2C Communication

1. Master send 0x10
2. Slave send 7 bytes data (Buttons0, Buttons1, DPAD, LX, LY, RX, RY)

## CDC Communication

Directly send cdc input to i2c master. (should only send when requested)
