window.focus();
window.addEventListener("focus", () => {
  document.getElementById("focused")!.textContent = "Focused";
});
window.addEventListener("blur", () => {
  document.getElementById("focused")!.textContent = "Blurred";
});

import type { NS } from "../../global";

const waitForNS = async (): Promise<NS> => {
  while (!window.ns) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return window.ns;
};

const keyNames = [
  "A",
  "B",
  "X",
  "Y",
  "L",
  "R",
  "ZL",
  "ZR",
  "MINUS",
  "PLUS",
  "LSTICK",
  "RSTICK",
  "HOME",
  "CAPTURE",
];
const dpadKeys = ["DPAD_UP", "DPAD_DOWN", "DPAD_LEFT", "DPAD_RIGHT"];
const stickKeys = ["STICK_UP", "STICK_DOWN", "STICK_LEFT", "STICK_RIGHT"];
const defaultKeys: any = {
  A: "l",
  B: "k",
  X: "i",
  Y: "j",
  L: "q",
  R: "e",
  ZL: "1",
  ZR: "3",
  MINUS: "-",
  PLUS: "=",
  HOME: "9",
  CAPTURE: "0",
  DPAD_UP: "arrowup",
  DPAD_DOWN: "arrowdown",
  DPAD_LEFT: "arrowleft",
  DPAD_RIGHT: "arrowright",
  LSTICK: "[",
  RSTICK: "]",
  STICK_UP: "w",
  STICK_DOWN: "s",
  STICK_LEFT: "a",
  STICK_RIGHT: "d",
  RSTICK_UP: "t",
  RSTICK_DOWN: "g",
  RSTICK_LEFT: "f",
  RSTICK_RIGHT: "h",
};
let myKeys: { [key: string]: string } = {
  A: "l",
  B: "k",
  X: "i",
  Y: "j",
  L: "q",
  R: "e",
  ZL: "1",
  ZR: "3",
  MINUS: "-",
  PLUS: "=",
  HOME: "9",
  CAPTURE: "0",
  DPAD_UP: "arrowup",
  DPAD_DOWN: "arrowdown",
  DPAD_LEFT: "arrowleft",
  DPAD_RIGHT: "arrowright",
  LSTICK: "[",
  RSTICK: "]",
  STICK_UP: "w",
  STICK_DOWN: "s",
  STICK_LEFT: "a",
  STICK_RIGHT: "d",
  RSTICK_UP: "t",
  RSTICK_DOWN: "g",
  RSTICK_LEFT: "f",
  RSTICK_RIGHT: "h",
};
let isToggleKey = Object.fromEntries(
  Object.keys(defaultKeys).map((k) => [k, false]),
);
const keyToButton = {
  A: 2,
  B: 1,
  X: 3,
  Y: 0,
  L: 4,
  R: 5,
  ZL: 6,
  ZR: 7,
  MINUS: 8,
  PLUS: 9,
  LSTICK: 10,
  RSTICK: 11,
  HOME: 12,
  CAPTURE: 13,
};
isToggleKey = JSON.parse(
  localStorage.getItem("keyboardToggleKeys") || JSON.stringify(isToggleKey),
);
const loadKeys = () => {
  const keys =
    JSON.parse(localStorage.getItem("keyboardKeys") || "null") || myKeys;
  const table = document.getElementById("keys")!;
  table.innerHTML = "";
  for (const key of [...keyNames, ...dpadKeys, ...stickKeys]) {
    const row = document.createElement("tr");
    const cellName = document.createElement("td");
    cellName.textContent = key;
    const cellInput = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.value = keys[key];
    input.style.width = "150px";
    input.addEventListener("focus", (e) => {
      (e.target as HTMLInputElement).select();
      input.value = "Press a key, Esc to cancel";
    });
    input.addEventListener("keydown", (e) => {
      e.preventDefault();
      if (e.key === "Escape") {
        input.value = keys[key];
        input.blur();
        return;
      }
      keys[key] = e.key;
      input.value = e.key;
      localStorage.setItem("keyboardKeys", JSON.stringify(keys));
      input.blur();
    });
    const toggleCell = document.createElement("td");
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = isToggleKey[key];
    toggleInput.addEventListener("change", (e) => {
      isToggleKey[key] = (e.target as HTMLInputElement).checked;
      localStorage.setItem("keyboardToggleKeys", JSON.stringify(isToggleKey));
    });
    toggleCell.appendChild(toggleInput);
    row.appendChild(toggleCell);
    cellInput.appendChild(input);
    row.appendChild(cellName);
    row.appendChild(cellInput);
    table.appendChild(row);
  }
  return keys;
};
myKeys = loadKeys();
console.log("Using keys:", myKeys);

waitForNS().then((ns) => {
  // Keyboard to gamepad mapping
  const keyState: any = {};

  const input = document.querySelector(
    'input[type="text"]',
  ) as HTMLInputElement;
  input.addEventListener("keydown", (e) => {
    e.preventDefault();
    if (e.repeat) return; // Ignore repeat events
    // ignore if it is toggle key
    for (const [key, code] of Object.entries(myKeys)) {
      if (e.key.toLowerCase() === code.toLowerCase() && isToggleKey[key]) {
        return;
      }
    }
    keyState[e.key.toLowerCase()] = true;
  });
  input.addEventListener("keyup", (e) => {
    e.preventDefault();

    // Handle toggle keys
    for (const [key, code] of Object.entries(myKeys)) {
      if (e.key.toLowerCase() === code.toLowerCase() && isToggleKey[key]) {
        keyState[code.toLowerCase()] = !keyState[code.toLowerCase()];
        return;
      }
    }

    keyState[e.key.toLowerCase()] = false;
  });
  // Clear keyState when input loses focus
  input.addEventListener("blur", () => {
    for (const key in keyState) keyState[key] = false;
  });

  function getButtons() {
    let buttons = 0;
    for (const [key, bit] of Object.entries(keyToButton)) {
      if (
        keyState[
          key in myKeys
            ? myKeys[key].toLowerCase()
            : defaultKeys[key].toLowerCase()
        ]
      ) {
        buttons |= 1 << bit;
      }
    }
    return buttons;
  }

  function getDPad() {
    // DPad: up=8, right=4, down=2, left=1, centered=0x0f
    let dpad = 0;
    if (keyState[myKeys["DPAD_UP"].toLowerCase()]) dpad |= 8;
    if (keyState[myKeys["DPAD_RIGHT"].toLowerCase()]) dpad |= 4;
    if (keyState[myKeys["DPAD_DOWN"].toLowerCase()]) dpad |= 2;
    if (keyState[myKeys["DPAD_LEFT"].toLowerCase()]) dpad |= 1;
    return dpad;
  }

  function getLeftStick() {
    // 0~255, 128 is center
    let x = 128,
      y = 128;
    if (keyState[myKeys["STICK_LEFT"].toLowerCase()]) x = 0;
    else if (keyState[myKeys["STICK_RIGHT"].toLowerCase()]) x = 255;
    if (keyState[myKeys["STICK_UP"].toLowerCase()]) y = 0;
    else if (keyState[myKeys["STICK_DOWN"].toLowerCase()]) y = 255;
    return { x, y };
  }
  function getRightStick() {
    // 0~255, 128 is center
    let x = 128,
      y = 128;
    if (keyState[myKeys["RSTICK_LEFT"].toLowerCase()]) x = 0;
    else if (keyState[myKeys["RSTICK_RIGHT"].toLowerCase()]) x = 255;
    if (keyState[myKeys["RSTICK_UP"].toLowerCase()]) y = 0;
    else if (keyState[myKeys["RSTICK_DOWN"].toLowerCase()]) y = 255;
    return { x, y };
  }

  function pollKeyboard() {
    ns.gamepad.setButton(getButtons());
    ns.gamepad.setDpad(getDPad());
    const stick = getLeftStick();
    const rstick = getRightStick();
    ns.gamepad.setStick(stick.x, stick.y, rstick.x, rstick.y);
    // Right stick not mapped
    requestAnimationFrame(pollKeyboard);
  }
  pollKeyboard();
});
