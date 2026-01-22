import type { NS } from "../../global";

const waitForNS = async (): Promise<NS> => {
  while (!window.ns) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return window.ns;
};

waitForNS().then((ns) => {
  let gamepadConnected = false;
  async function pollGamepad() {
    const gamepads = navigator.getGamepads();
    let activeGamepad = null;

    for (let gp of gamepads) {
      if (gp && gp.id.includes("057e")) {
        activeGamepad = gp;
        document.getElementById("gamepad")!.textContent =
          `Gamepad connected: ${gp.id}`;
        break;
      }
    }

    if (activeGamepad) {
      if (!gamepadConnected) {
        gamepadConnected = true;
        ns.log.info(`Gamepad detected: ${activeGamepad.id}`);
      }

      // Read buttons
      let buttons = 0;
      let reMap: any = {
        2: 0,
        0: 1,
        1: 2,
        16: 12,
        17: 13,
        18: 14,
      };
      const toIgnore = [12, 13, 14, 15]; // D-Pad buttons
      for (let i = 0; i < activeGamepad.buttons.length; i++) {
        if (toIgnore.includes(i)) continue;
        if (activeGamepad.buttons[i].pressed) {
          const mappedIndex = reMap[i] !== undefined ? reMap[i] : i;
          buttons |= 1 << mappedIndex;
        }
      }
      ns.gamepad.setButton(buttons);

      // Read D-Pad
      let dpad = 0x0f; // centered
      if (activeGamepad.buttons.length > 12) {
        const up = activeGamepad.buttons[12].pressed;
        const down = activeGamepad.buttons[13].pressed;
        const left = activeGamepad.buttons[14].pressed;
        const right = activeGamepad.buttons[15].pressed;
        dpad = (up ? 8 : 0) | (right ? 4 : 0) | (down ? 2 : 0) | (left ? 1 : 0);
      }
      ns.gamepad.setDpad(dpad);

      // Read analog sticks
      if (activeGamepad.axes.length >= 4) {
        ns.gamepad.setLeftX(Math.round((activeGamepad.axes[0] + 1) * 127.5));
        ns.gamepad.setLeftY(Math.round((activeGamepad.axes[1] + 1) * 127.5));
        ns.gamepad.setRightX(Math.round((activeGamepad.axes[2] + 1) * 127.5));
        ns.gamepad.setRightY(Math.round((activeGamepad.axes[3] + 1) * 127.5));
      }
    } else {
      if (gamepadConnected) {
        gamepadConnected = false;
        ns.log.info("Gamepad disconnected");
        document.getElementById("gamepad")!.textContent =
          "Please connect your gamepad.";
      }
    }

    requestAnimationFrame(pollGamepad);
  }
  pollGamepad();
});
