declare global {
  interface Window {
    ns: {
      replay: {
        replay: (scriptName: string) => Promise<void>;
        listReplays: () => string[];
        deleteReplay: (scriptName: string) => void;
        exportReplay: (scriptName: string) => void;
        stopAllReplays: () => void;
        onReplayStatus: (callback: () => void) => void;
        offReplayStatus: (callback: () => void) => void;
      };
      gamepad: {
        button: (
          name:
            | "A"
            | "B"
            | "X"
            | "Y"
            | "L"
            | "R"
            | "ZL"
            | "ZR"
            | "MINUS"
            | "PLUS"
            | "LSTICK"
            | "RSTICK"
            | "HOME"
            | "CAPTURE",
        ) => boolean;

        setButtons: (buttons: number) => void;
        setDPad: (direction: number) => void;
        setLeftStick: (x: number, y: number) => void;
        setRightStick: (x: number, y: number) => void;
        setLeftX: (x: number) => void;
        setLeftY: (y: number) => void;
        setRightX: (x: number) => void;
        setRightY: (y: number) => void;
        setSticks: (lx: number, ly: number, rx: number, ry: number) => void;
      };
    };
  }
}

export {};
