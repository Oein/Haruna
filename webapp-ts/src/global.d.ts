import type { StateInstance } from "./state";

export type NS = {
  replay: {
    play: (name: string) => Promise<void>;
    stop: () => void;
  };
  gamepad: {
    setButton: (buttons: number) => void;
    setButtonByName: (name: string, pressed: boolean) => void;
    setDpad: (dpad: number) => void;
    setDpad: (
      up: boolean,
      down: boolean,
      left: boolean,
      right: boolean,
    ) => void;
    setStick: (
      leftX: number,
      leftY: number,
      rightX: number,
      rightY: number,
    ) => void;
    setLeftX: (value: number) => void;
    setLeftY: (value: number) => void;
    setRightX: (value: number) => void;
    setRightY: (value: number) => void;
    setLeftStick: (x: number, y: number) => void;
    setRightStick: (x: number, y: number) => void;
  };
  log: {
    info: (msg: string) => void;
    error: (msg: string) => void;
  };

  b: (name: string, pressed: boolean) => void;
  d: (up: boolean, down: boolean, left: boolean, right: boolean) => void;
  l: (x: number, y: number) => void;
  r: (x: number, y: number) => void;
};

export type DevNS = {
  b: (name: string, pressed: boolean) => void;
  d: (up: boolean, down: boolean, left: boolean, right: boolean) => void;
  l: (x: number, y: number) => void;
  r: (x: number, y: number) => void;
};

declare global {
  interface Window {
    ns: NS;
    ds: DevNS;
    dinstance: StateInstance;
    waitForNS: () => Promise<NS>;
    delay: (ms: number) => Promise<void>;
  }
}

export {};
