import { addSerialLog } from "./log";
import { recordData } from "./recording";
import { stateManager } from "./state";
import {
  updateButtonDisplay,
  updateDpadDisplay,
  updateStickDisplay,
} from "./visual";

export let port: SerialPort | null = null;
export let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
export let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

const connectBtn = document.getElementById("connectBtn")! as HTMLButtonElement;
const disconnectBtn = document.getElementById(
  "disconnectBtn",
)! as HTMLButtonElement;
const serialStatus = document.getElementById("serialStatus")! as HTMLDivElement;
const serialText = document.getElementById("serialText")! as HTMLDivElement;
if (!connectBtn || !disconnectBtn || !serialStatus || !serialText) {
  throw new Error("Missing required DOM elements");
}

// Serial connection
connectBtn.addEventListener("click", async () => {
  try {
    port = await navigator.serial.requestPort();
    if (!port) {
      addSerialLog("No port selected", "error");
      return;
    }

    await port.open({ baudRate: 115200 });
    writer = port.writable.getWriter();
    reader = port.readable.getReader();

    // log incomming data if exists
    (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          addSerialLog("Serial port closed", "info");
          break;
        }
        if (value) {
          const textDecoder = new TextDecoder();
          const receivedText = textDecoder.decode(value);
          addSerialLog(`Received: ${receivedText}`, "info");
        }
      }
    })();

    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    serialStatus.classList.add("connected");
    serialText.textContent = "Connected";
    addSerialLog("Serial port connected", "info");
  } catch (error: any) {
    addSerialLog(`Connection failed: ${error.message}`, "error");
  }
});

disconnectBtn.addEventListener("click", async () => {
  try {
    if (writer) {
      await writer.close();
      writer = null;
    }
    if (port) {
      await port.close();
      port = null;
    }

    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    serialStatus.classList.remove("connected");
    serialText.textContent = "Not connected";
    addSerialLog("Serial port disconnected", "info");
  } catch (error: any) {
    addSerialLog(`Disconnection error: ${error.message}`, "error");
  }
});

let sentData = new Uint8Array([
  0x55, 0xaa, 0, 0, 0x0f, 128, 128, 128, 128, 0x0d, 0x0a,
]);
async function hidInterval() {
  if (writer) {
    const conData = stateManager.getGamepadStatus();
    const buttonBinary = stateManager.buttonStatus2Binary(conData.buttons);

    const dpadVal = conData.dpad.value;
    let sendDpad = 0x0f;

    if (dpadVal === 8)
      sendDpad = 0; // Up
    else if (dpadVal === 10)
      sendDpad = 1; // Up-Right
    else if (dpadVal === 4)
      sendDpad = 2; // Right
    else if (dpadVal === 6)
      sendDpad = 3; // Down-Right
    else if (dpadVal === 2)
      sendDpad = 4; // Down
    else if (dpadVal === 3)
      sendDpad = 5; // Down-Left
    else if (dpadVal === 1)
      sendDpad = 6; // Left
    else if (dpadVal === 9) sendDpad = 7; // Up-Left

    const data = [
      0x55,
      0xaa,
      buttonBinary & 0xff,
      (buttonBinary >> 8) & 0xff,
      sendDpad,
      conData.leftX.value,
      conData.leftY.value,
      conData.rightX.value,
      conData.rightY.value,
      0x0d,
      0x0a,
    ];

    const uint8Data = new Uint8Array(data);
    if (!uint8Data.every((value, index) => value === sentData[index])) {
      sentData = uint8Data;
      try {
        recordData([
          buttonBinary & 0xff,
          (buttonBinary >> 8) & 0xff,
          sendDpad,
          conData.leftX.value,
          conData.leftY.value,
          conData.rightX.value,
          conData.rightY.value,
        ]);
        await writer.write(uint8Data);
        updateButtonDisplay(buttonBinary);
        updateDpadDisplay(dpadVal);
        updateStickDisplay(
          conData.leftX.value,
          conData.leftY.value,
          conData.rightX.value,
          conData.rightY.value,
        );
        // addSerialLog(`Sent: ${Array.from(uint8Data).map(b => b.toString(16).padStart(2, '0')).join(' ')}`, "info");
      } catch (error: any) {
        addSerialLog(`Write error: ${error.message}`, "error");
      }
    }
  }
}
setInterval(hidInterval, 10);
