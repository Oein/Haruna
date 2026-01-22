// --- Replay/Record Feature ---
let isRecording = false;
let recordStartTime = 0;
let recordedFrames = [];
let replayTimeouts = [];

const replayList = document.getElementById("replayList");

function getCurrentFrame() {
  return {
    t: performance.now() - recordStartTime,
    state: JSON.parse(JSON.stringify(gamepadState)),
  };
}

function startRecording() {
  isRecording = true;
  recordStartTime = performance.now();
  recordedFrames = [];
  recordBtn.disabled = true;
  stopBtn.disabled = false;
  saveReplayBtn.disabled = true;
  addLog("Recording started", "info");
}

function stopRecording() {
  isRecording = false;
  stopBtn.disabled = true;
  recordBtn.disabled = false;
  saveReplayBtn.disabled = recordedFrames.length === 0;
  addLog(
    `Recording stopped. ${recordedFrames.length} frames recorded.`,
    "info",
  );
}

function saveReplay() {
  const name =
    prompt("Name for replay?") || `Replay ${new Date().toLocaleString()}`;
  if (!recordedFrames.length) return;
  const replays = JSON.parse(localStorage.getItem("replays") || "[]");
  replays.push({ name, frames: recordedFrames });
  localStorage.setItem("replays", JSON.stringify(replays));
  addLog(`Replay saved as '${name}'`, "info");
  saveReplayBtn.disabled = true;
  renderReplayList();
}

function renderReplayList() {
  const replays = JSON.parse(localStorage.getItem("replays") || "[]");
  replayList.innerHTML = "";
  let table = document.createElement("table");
  if (replays.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No replays saved.";
    replayList.appendChild(li);
    return;
  }
  replays.forEach((r, idx) => {
    const nameEl = document.createElement("span");
    const replayBtn = document.createElement("button");
    const deleteBtn = document.createElement("button");
    const exportBtn = document.createElement("button");

    // Delete button
    deleteBtn.textContent = "Delete";
    deleteBtn.style.marginLeft = "6px";

    nameEl.textContent = r.name + ` (${r.frames.length} frames) `;
    replayBtn.textContent = "Replay";
    exportBtn.textContent = "Export";
    replayBtn.className = "replayBtn";
    replayBtn.addEventListener("click", () => {
      ns.replay.replay(r.name);
    });
    deleteBtn.addEventListener("click", () => {
      ns.replay.deleteReplay(r.name);
    });
    exportBtn.style.marginLeft = "6px";
    exportBtn.addEventListener("click", () => {
      ns.replay.exportReplay(r.name);
    });

    const tr1 = document.createElement("tr");
    const td1 = document.createElement("td");
    td1.appendChild(nameEl);
    const td2 = document.createElement("td");
    td2.appendChild(replayBtn);
    td2.classList.add("align-right-td");
    td2.appendChild(exportBtn);
    td2.appendChild(deleteBtn);
    tr1.appendChild(td1);
    tr1.appendChild(td2);
    table.appendChild(tr1);
  });

  replayList.appendChild(table);
}

document.getElementById("recordBtn")?.addEventListener("click", startRecording);
document.getElementById("stopBtn")?.addEventListener("click", stopRecording);
document.getElementById("saveReplayBtn")?.addEventListener("click", saveReplay);
document.getElementById("stopReplayBtn")?.addEventListener("click", () => {
  ns.replay.stopAllReplays();
});

renderReplayList();

// --- Serial/Gamepad Feature ---

let port = null;
let writer = null;
let reader = null;
let gamepadState = {
  buttons: 0,
  leftX: 0x80,
  leftY: 0x80,
  rightX: 0x80,
  rightY: 0x80,
  dpad: 0,
};
let lastGamepadState = {
  buttons: 0,
  leftX: 0x80,
  leftY: 0x80,
  rightX: 0x80,
  rightY: 0x80,
  dpad: 0,
};

// UI Elements
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const serialStatus = document.getElementById("serialStatus");
const serialText = document.getElementById("serialText");
const log = document.getElementById("log");
const seriallog = document.getElementById("seriallog");

// Logging function
function addLog(message, type = "info") {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;

  // Keep only last 50 entries
  while (log.children.length > 50) {
    log.removeChild(log.firstChild);
  }
}

function addSerialLog(message, type = "info") {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
  seriallog.appendChild(entry);
  seriallog.scrollTop = seriallog.scrollHeight;

  // Keep only last 50 entries
  while (seriallog.children.length > 50) {
    seriallog.removeChild(seriallog.firstChild);
  }
}

// Serial connection
connectBtn.addEventListener("click", async () => {
  try {
    port = await navigator.serial.requestPort();
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
  } catch (error) {
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
  } catch (error) {
    addSerialLog(`Disconnection error: ${error.message}`, "error");
  }
});

// ----------- Gamepad State Handling ----------- //

// Update gamepad display
function updateButtonDisplay() {
  for (let i = 0; i < 16; i++) {
    const btn = document.querySelector(`.button-display[data-btn="${i}"]`);
    if (!btn) continue;
    const isPressed = (gamepadState.buttons >> i) & 1;
    if (isPressed) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  }
}

function updateDpadDisplay() {
  const up = (gamepadState.dpad >> 3) & 1;
  const right = (gamepadState.dpad >> 2) & 1;
  const down = (gamepadState.dpad >> 1) & 1;
  const left = gamepadState.dpad & 1;

  document.getElementById("dpad-up").classList.toggle("active", up);
  document.getElementById("dpad-right").classList.toggle("active", right);
  document.getElementById("dpad-down").classList.toggle("active", down);
  document.getElementById("dpad-left").classList.toggle("active", left);
}

function updateStickDisplay() {
  const leftStick = document.getElementById("leftStick");
  const rightStick = document.getElementById("rightStick");

  const leftX = ((gamepadState.leftX - 128) / 128) * 30;
  const leftY = ((gamepadState.leftY - 128) / 128) * 30;
  const rightX = ((gamepadState.rightX - 128) / 128) * 30;
  const rightY = ((gamepadState.rightY - 128) / 128) * 30;

  leftStick.style.transform = `translate(calc(-50% + ${leftX}px), calc(-50% + ${leftY}px))`;
  rightStick.style.transform = `translate(calc(-50% + ${rightX}px), calc(-50% + ${rightY}px))`;
}

async function hidInterval(isIntervalCall = false) {
  let hasDifference = false;
  for (let key of Object.keys(gamepadState)) {
    if (gamepadState[key] !== lastGamepadState[key]) {
      // console.log(
      //   `State change detected: ${key} from ${lastGamepadState[key]} to ${gamepadState[key]}`,
      // );
      hasDifference = true;
      break;
    }
  }
  lastGamepadState = JSON.parse(JSON.stringify(gamepadState));
  // if (hasDifference) console.log("Gamepad state changed:", gamepadState);
  if (hasDifference && writer) {
    let sendDpad = 0x0f;
    if (gamepadState.dpad === 8)
      sendDpad = 0; // Up
    else if (gamepadState.dpad === 10)
      sendDpad = 1; // Up-Right
    else if (gamepadState.dpad === 4)
      sendDpad = 2; // Right
    else if (gamepadState.dpad === 6)
      sendDpad = 3; // Down-Right
    else if (gamepadState.dpad === 2)
      sendDpad = 4; // Down
    else if (gamepadState.dpad === 3)
      sendDpad = 5; // Down-Left
    else if (gamepadState.dpad === 1)
      sendDpad = 6; // Left
    else if (gamepadState.dpad === 9) sendDpad = 7; // Up-Left
    const toSend = [
      0x55,
      0xaa,
      gamepadState.buttons & 0xff,
      (gamepadState.buttons >> 8) & 0xff,
      sendDpad,
      gamepadState.leftX,
      gamepadState.leftY,
      gamepadState.rightX,
      gamepadState.rightY,
      0x0d,
      0x0a,
    ];
    await writer.write(new Uint8Array(toSend));
    // If recording, store this frame
    if (isRecording) {
      recordedFrames.push(getCurrentFrame());
    }
    updateButtonDisplay();
    updateDpadDisplay();
    updateStickDisplay();
  }
  if (isIntervalCall) setTimeout(hidInterval, 20);
}
hidInterval(true);

const setter = (() => {
  const replayPercentageFill = document.querySelector("#replayPercentageFill");
  const replayPercentageText = document.querySelector("#replayPercentageText");

  return (idx, total, percent) => {
    const clamped = Math.min(Math.max(percent * 100, 0), 100);
    replayPercentageFill.style.width = `${clamped}%`;
    replayPercentageText.textContent = `${clamped.toFixed(1)}% (${idx + 1}/${total})`;
  };
})();

// Scriptable API
let replay_status_callbacks = [setter];
let isReplaying = false;
let timeFillInterval = null;
window.isPlayingGetter = () => isReplaying;
window.ns = {
  replay: {
    /**
     * Replay a saved replay by name. Returns a Promise that resolves when finished.
     * @param {string} name
     */
    async replay(name) {
      const replays = JSON.parse(localStorage.getItem("replays") || "[]");
      const found = replays.find((r) => r.name === name);
      if (!found) throw new Error("Replay not found: " + name);
      if (!writer) throw new Error("Serial not connected");
      document.getElementById("stopReplayBtn").disabled = false;
      isReplaying = true;
      // Cancel any previous replay
      replayTimeouts.forEach(clearTimeout);
      replayTimeouts = [];
      addLog(
        `(API) Replaying '${name}' (${found.frames.length} frames)...`,
        "info",
      );
      return new Promise((resolve) => {
        let maxT = found.frames[found.frames.length - 1].t;
        let startAt = performance.now();
        found.frames.forEach((frame, i) => {
          const delay = frame.t;
          const timeout = setTimeout(async () => {
            replay_status_callbacks.forEach((cb) =>
              cb(i, found.frames.length, frame.t / maxT),
            );
            gamepadState = JSON.parse(JSON.stringify(frame.state));
            console.log("Replaying frame:", frame);
            await hidInterval();
            if (i === found.frames.length - 1) {
              addLog("(API) Replay finished", "info");
              document.getElementById("stopReplayBtn").disabled = true;
              isReplaying = false;
              resolve();
            }
          }, delay);
          replayTimeouts.push(timeout);
        });
        if (timeFillInterval) clearInterval(timeFillInterval);
        timeFillInterval = setInterval(() => {
          const elapsed = performance.now() - startAt;
          const percent = Math.min(elapsed / maxT, 1);
          const timeFill = document.getElementById("replayTimeFill");
          timeFill.style.width = `${(percent * 100).toFixed(1)}%`;
          if (percent >= 1) {
            clearInterval(timeFillInterval);
            timeFillInterval = null;
            timeFill.style.width = `0%`;
          }
        }, 100);
      });
    },
    /**
     * List all saved replay names
     */
    listReplays() {
      const replays = JSON.parse(localStorage.getItem("replays") || "[]");
      return replays.map((r) => r.name);
    },
    /**
     * Delete a replay by name
     */
    deleteReplay(name) {
      let replays = JSON.parse(localStorage.getItem("replays") || "[]");
      const before = replays.length;
      replays = replays.filter((r) => r.name !== name);
      localStorage.setItem("replays", JSON.stringify(replays));
      renderReplayList();
      addLog(
        `(API) Deleted replay '${name}' (${before - replays.length} removed)`,
        "info",
      );
    },
    /**
     * Export a replay by name (downloads as JSON)
     */
    exportReplay(name) {
      const replays = JSON.parse(localStorage.getItem("replays") || "[]");
      const found = replays.find((r) => r.name === name);
      if (!found) throw new Error("Replay not found: " + name);
      const data = JSON.stringify([found], null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `procon_replay_${found.name.replace(/[^a-z0-9_-]+/gi, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    },
    stopAllReplays() {
      document.getElementById("stopReplayBtn").disabled = true;
      isReplaying = false;
      clearInterval(timeFillInterval);
      timeFillInterval = null;
      replayTimeouts.forEach(clearTimeout);
      replayTimeouts = [];
      gamepadState = {
        buttons: 0,
        leftX: 0x80,
        leftY: 0x80,
        rightX: 0x80,
        rightY: 0x80,
        dpad: 0,
      };
      hidInterval();
      addLog("(API) Stopped all replays", "info");
    },
    onReplayStatus(callback) {
      replay_status_callbacks.push(callback);
    },
    offReplayStatus(callback) {
      replay_status_callbacks = replay_status_callbacks.filter(
        (x) => x != callback,
      );
    },
  },
  gamepad: {
    button: (name, pressed) => {
      if (isReplaying) return;
      const buttonMap = {
        Y: 0,
        B: 1,
        A: 2,
        X: 3,
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
      const bit = buttonMap[name.toUpperCase()];
      if (bit === undefined) {
        throw new Error("Invalid button name: " + name);
      }
      if (pressed) {
        gamepadState.buttons |= 1 << bit;
      } else {
        gamepadState.buttons &= ~(1 << bit);
      }
      hidInterval();
    },
    setButtons: (buttons) => {
      if (isReplaying) return;
      gamepadState.buttons = buttons;
    },
    setDPad: (dpad, down = undefined, left = undefined, right = undefined) => {
      if (isReplaying) return;
      if (typeof dpad === "number") {
        gamepadState.dpad = dpad;
      }
      if (
        typeof dpad == "boolean" &&
        typeof down === "boolean" &&
        typeof left === "boolean" &&
        typeof right === "boolean"
      ) {
        // use dpad as up
        gamepadState.dpad =
          (dpad ? 8 : 0) | (right ? 4 : 0) | (down ? 2 : 0) | (left ? 1 : 0);
      }
    },
    setLeftStick: (x, y) => {
      if (isReplaying) return;
      gamepadState.leftX = x;
      gamepadState.leftY = y;
    },
    setRightStick: (x, y) => {
      if (isReplaying) return;
      gamepadState.rightX = x;
      gamepadState.rightY = y;
    },
    setLeftX: (x) => {
      if (isReplaying) return;
      gamepadState.leftX = x;
    },
    setLeftY: (y) => {
      if (isReplaying) return;
      gamepadState.leftY = y;
    },
    setRightX: (x) => {
      if (isReplaying) return;
      gamepadState.rightX = x;
    },
    setRightY: (y) => {
      if (isReplaying) return;
      gamepadState.rightY = y;
    },
    setSticks: (leftX, leftY, rightX, rightY) => {
      if (isReplaying) return;
      gamepadState.leftX = leftX;
      gamepadState.leftY = leftY;
      gamepadState.rightX = rightX;
      gamepadState.rightY = rightY;
    },
    hidInterval: () => {
      if (isReplaying) return;
      return hidInterval();
    },
  },
  log: {
    info: (msg) => addLog(msg, "info"),
    error: (msg) => addLog(msg, "error"),
  },
};

window.addEventListener("message", (event) => {
  const data = event.data;
  if (data.type === "ns") {
    const key = data.api;
    const args = data.args || [];
    // key can be like "replay.replay"
    const keys = key.split(".");
    let func = window.ns;
    for (let k of keys) {
      if (func[k] === undefined) {
        addLog(`API call failed: ns.${key} not found`, "error");
        return;
      }
      func = func[k];
    }
    if (typeof func !== "function") {
      addLog(`API call failed: ns.${key} is not a function`, "error");
      return;
    }
    try {
      const result = func(...args);
    } catch (e) {
      addLog(`API call error: ns.${key} - ${e.message}`, "error");
    }
  }
});

// --- Scripts ---
function createScriptIframe(src) {
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.addEventListener("load", () => {
    iframe.contentWindow.ns = {};
    const nsDFS = (obj = ns, key = []) => {
      for (let k of Object.keys(obj)) {
        if (typeof obj[k] === "function") {
          iframe.contentWindow.eval(
            `ns.${key.concat([k]).join(".")} = (...args) => {
              parent.postMessage({ type: "ns", api: "${key.concat([k]).join(".")}", args }, "*");
            }`,
          );
        } else if (typeof obj[k] === "object") {
          iframe.contentWindow.ns[key.concat([k]).join(".")] = {};
          nsDFS(obj[k], key.concat([k]));
        }
      }
    };
    nsDFS();
  });
  // resizeable Y iframe
  iframe.style.resize = "vertical";
  return iframe;
}

async function fetchScriptList() {
  const iframeContainer = document.getElementById("iframeContainer");
  try {
    const response = await fetch("scripts.json");
    if (!response.ok) throw new Error("Failed to fetch scripts.json");
    const scripts = await response.json();
    const containers = [];
    for (const script of scripts) {
      const div = document.createElement("div");
      div.setAttribute("data-script-name", script);
      containers.push(div);
      iframeContainer.appendChild(div);
    }
    const scriptContainer = document.getElementById("scriptContainer");
    scripts.forEach((scriptSrc, i) => {
      const button = document.createElement("button");
      button.textContent = `${scriptSrc}`;
      let hasFrame = false;
      let scriptDiv = containers[i];
      button.style.background = "#333";
      button.addEventListener("click", () => {
        if (hasFrame) {
          // remove existing iframe
          scriptDiv.innerHTML = "";
          hasFrame = false;
          addLog(`Unloaded script: ${scriptSrc}`, "info");
          button.style.background = "#333";
          return;
        }
        const iframe = createScriptIframe(scriptSrc);
        scriptDiv.appendChild(iframe);
        hasFrame = true;
        button.style.background = "#82AAFF";
        addLog(`Loaded script: ${scriptSrc}`, "info");
      });
      scriptContainer.appendChild(button);
    });
  } catch (e) {
    addLog(`Error loading scripts: ${e.message}`, "error");
  }
}
fetchScriptList();

addLog("System initialized", "info");
addSerialLog("System initialized", "info");
