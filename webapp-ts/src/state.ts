const buttonMap = {
  Y: 0,
  B: 1,
  A: 2,
  X: 3,
  L: 4,
  R: 5,
  ZL: 6,
  ZR: 7,
  PLUS: 8,
  MINUS: 9,
  LSTICK: 10,
  RSTICK: 11,
  HOME: 12,
  CAPTURE: 13,
};

export class TimingValue<T = number> {
  value: T;
  lastUpdate: number;

  constructor(value: T) {
    this.value = value;
    this.lastUpdate = 0;
  }
  setValue(newValue: T) {
    if (this.value !== newValue) {
      this.value = newValue;
      this.lastUpdate = Date.now();
    }
  }
}

export class StateInstance {
  buttons: { [key in keyof typeof buttonMap]: TimingValue<boolean> };
  dpad: TimingValue<number>;
  leftX: TimingValue<number>;
  leftY: TimingValue<number>;
  rightX: TimingValue<number>;
  rightY: TimingValue<number>;

  constructor() {
    this.buttons = {} as {
      [key in keyof typeof buttonMap]: TimingValue<boolean>;
    };
    for (const key in buttonMap) {
      this.buttons[key as keyof typeof buttonMap] = new TimingValue<boolean>(
        false,
      );
    }
    this.dpad = new TimingValue<number>(0);
    this.leftX = new TimingValue<number>(128);
    this.leftY = new TimingValue<number>(128);
    this.rightX = new TimingValue<number>(128);
    this.rightY = new TimingValue<number>(128);
  }

  setButton(buttons: number) {
    for (const key in buttonMap) {
      const bit = buttonMap[key as keyof typeof buttonMap];
      const isPressed = (buttons >> bit) & 1 ? true : false;
      this.buttons[key as keyof typeof buttonMap].setValue(isPressed);
    }
  }
  setButtonByName(name: keyof typeof buttonMap, pressed: boolean) {
    this.buttons[name].setValue(pressed);
  }

  setDpad(
    dpad: number | boolean,
    down: boolean = false,
    left: boolean = false,
    right: boolean = false,
  ) {
    if (typeof dpad === "number") {
      this.dpad.setValue(dpad);
      return;
    }

    let dpadValue = 0;
    if (dpad) dpadValue |= 0b1000;
    if (right) dpadValue |= 0b0100;
    if (down) dpadValue |= 0b0010;
    if (left) dpadValue |= 0b0001;
    this.dpad.setValue(dpadValue);
  }

  setLeftX(value: number) {
    this.leftX.setValue(value);
  }
  setLeftY(value: number) {
    this.leftY.setValue(value);
  }
  setRightX(value: number) {
    this.rightX.setValue(value);
  }
  setRightY(value: number) {
    this.rightY.setValue(value);
  }
  setLeftStick(x: number, y: number) {
    this.leftX.setValue(x);
    this.leftY.setValue(y);
  }
  setRightStick(x: number, y: number) {
    this.rightX.setValue(x);
    this.rightY.setValue(y);
  }
  setSticks(leftX: number, leftY: number, rightX: number, rightY: number) {
    this.leftX.setValue(leftX);
    this.leftY.setValue(leftY);
    this.rightX.setValue(rightX);
    this.rightY.setValue(rightY);
  }
}

class StateManager {
  instances: Map<string, StateInstance>;

  forceSet: Uint8Array | null = null;

  constructor() {
    this.instances = new Map();
  }

  getInstance(id: string): StateInstance {
    if (!this.instances.has(id)) {
      this.instances.set(id, new StateInstance());
    }
    return this.instances.get(id)!;
  }

  createInstance(id: string): StateInstance {
    const instance = new StateInstance();
    this.instances.set(id, instance);
    return instance;
  }

  deleteInstance(id: string): void {
    this.instances.delete(id);
  }

  buttonStatus2Binary(buttonStatus: {
    [key in keyof typeof buttonMap]: TimingValue<boolean>;
  }) {
    let binary = 0;
    for (const key in buttonMap) {
      const bit = buttonMap[key as keyof typeof buttonMap];
      if (buttonStatus[key as keyof typeof buttonMap].value) {
        binary |= 1 << bit;
      }
    }
    return binary;
  }

  getGamepadStatus() {
    if (this.forceSet) {
      const data = this.forceSet;
      const buttons: { [key in keyof typeof buttonMap]: TimingValue<boolean> } =
        {} as { [key in keyof typeof buttonMap]: TimingValue<boolean> };
      const buttonVal = data[0] | (data[1] << 8);
      for (const key in buttonMap) {
        const bit = buttonMap[key as keyof typeof buttonMap];
        const isPressed = (buttonVal >> bit) & 1 ? true : false;
        buttons[key as keyof typeof buttonMap] = new TimingValue<boolean>(
          isPressed,
        );
      }
      let hiddpad2dpad = 0;
      const dpadVal = data[2];
      if (dpadVal === 0)
        hiddpad2dpad = 8; // Up
      else if (dpadVal === 1)
        hiddpad2dpad = 10; // Up-Right
      else if (dpadVal === 2) hiddpad2dpad = 4;
      else if (dpadVal === 3)
        hiddpad2dpad = 6; // Down-Right
      else if (dpadVal === 4) hiddpad2dpad = 2;
      else if (dpadVal === 5)
        hiddpad2dpad = 3; // Down-Left
      else if (dpadVal === 6) hiddpad2dpad = 1;
      else if (dpadVal === 7) hiddpad2dpad = 9; // Up-Left
      const dpad = new TimingValue<number>(hiddpad2dpad);
      const leftX = new TimingValue<number>(data[3]);
      const leftY = new TimingValue<number>(data[4]);
      const rightX = new TimingValue<number>(data[5]);
      const rightY = new TimingValue<number>(data[6]);
      return {
        buttons,
        dpad,
        leftX,
        leftY,
        rightX,
        rightY,
      };
    }
    const buttonStatus: {
      [key in keyof typeof buttonMap]: TimingValue<boolean>;
    } = {} as { [key in keyof typeof buttonMap]: TimingValue<boolean> };
    let dpad: TimingValue<number> = new TimingValue<number>(0);
    let leftX: TimingValue<number> = new TimingValue<number>(128);
    let leftY: TimingValue<number> = new TimingValue<number>(128);
    let rightX: TimingValue<number> = new TimingValue<number>(128);
    let rightY: TimingValue<number> = new TimingValue<number>(128);
    for (const key in buttonMap) {
      buttonStatus[key as keyof typeof buttonMap] = new TimingValue<boolean>(
        false,
      );
    }

    for (const instance of this.instances.values()) {
      for (const key in buttonMap) {
        // use newer value
        if (
          instance.buttons[key as keyof typeof buttonMap].lastUpdate >
          buttonStatus[key as keyof typeof buttonMap].lastUpdate
        ) {
          buttonStatus[key as keyof typeof buttonMap] =
            instance.buttons[key as keyof typeof buttonMap];
        }
      }

      if (instance.dpad.lastUpdate > dpad.lastUpdate) {
        dpad = instance.dpad;
      }
      if (instance.leftX.lastUpdate > leftX.lastUpdate) {
        leftX = instance.leftX;
      }
      if (instance.leftY.lastUpdate > leftY.lastUpdate) {
        leftY = instance.leftY;
      }
      if (instance.rightX.lastUpdate > rightX.lastUpdate) {
        rightX = instance.rightX;
      }
      if (instance.rightY.lastUpdate > rightY.lastUpdate) {
        rightY = instance.rightY;
      }
    }

    return {
      buttons: buttonStatus,
      dpad,
      leftX,
      leftY,
      rightX,
      rightY,
    };
  }
}

export const stateManager = new StateManager();
