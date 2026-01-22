export function updateButtonDisplay(buttons: number) {
  for (let i = 0; i < 16; i++) {
    const btn = document.querySelector(`.button-display[data-btn="${i}"]`);
    if (!btn) continue;
    const isPressed = (buttons >> i) & 1;
    if (isPressed) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  }
}

export function updateDpadDisplay(dpad: number) {
  const up = !!((dpad >> 3) & 1);
  const right = !!((dpad >> 2) & 1);
  const down = !!((dpad >> 1) & 1);
  const left = !!(dpad & 1);
  const dpadUp = document.getElementById("dpad-up");
  const dpadRight = document.getElementById("dpad-right");
  const dpadDown = document.getElementById("dpad-down");
  const dpadLeft = document.getElementById("dpad-left");

  dpadUp && dpadUp.classList.toggle("active", up);
  dpadRight && dpadRight.classList.toggle("active", right);
  dpadDown && dpadDown.classList.toggle("active", down);
  dpadLeft && dpadLeft.classList.toggle("active", left);
}

export function updateStickDisplay(
  leftXVal: number,
  leftYVal: number,
  rightXVal: number,
  rightYVal: number,
) {
  const leftStick = document.getElementById("leftStick");
  const rightStick = document.getElementById("rightStick");

  if (!leftStick || !rightStick) return;

  const leftX = ((leftXVal - 128) / 128) * 30;
  const leftY = ((leftYVal - 128) / 128) * 30;
  const rightX = ((rightXVal - 128) / 128) * 30;
  const rightY = ((rightYVal - 128) / 128) * 30;

  leftStick.style.transform = `translate(calc(-50% + ${leftX}px), calc(-50% + ${leftY}px))`;
  rightStick.style.transform = `translate(calc(-50% + ${rightX}px), calc(-50% + ${rightY}px))`;
}
