import { stateManager } from "./state";

let recordStartTime: number | null = null;
let recordedData: [number[], number][] = [];
let timeout: number | null = null;

export type RecordPlayListener = (props: {
  index: number;
  total: number;
  timingPercent: number; // 0 to 1
}) => void;

let recordPlayListeners: RecordPlayListener[] = [];

export function addRecordPlayListener(listener: RecordPlayListener) {
  recordPlayListeners.push(listener);
}

export function removeRecordPlayListener(listener: RecordPlayListener) {
  recordPlayListeners = recordPlayListeners.filter((l) => l !== listener);
}

function emitRecordPlayEvent(
  index: number,
  total: number,
  timingPercent: number,
) {
  for (const listener of recordPlayListeners) {
    listener({ index, total, timingPercent });
  }
}

export function recordData(binary: number[]) {
  if (recordStartTime === null) return;
  const currentTime = performance.now();
  recordedData.push([binary, currentTime - recordStartTime]);
}

export function startRecording() {
  recordStartTime = performance.now();
  recordedData = [];
  updateUI();
}

export function stopRecording() {
  recordStartTime = null;
  updateUI();
  return recordedData;
}

export function saveRecording(name: string) {
  localStorage.setItem(`rcd::item::${name}`, JSON.stringify(recordedData));
  const recordings = JSON.parse(localStorage.getItem("rcd::list") || "[]");
  if (!recordings.includes(name)) {
    recordings.push(name);
    localStorage.setItem("rcd::list", JSON.stringify(recordings));
  }
  updateUI();
}

export function getRecordingList() {
  return JSON.parse(localStorage.getItem("rcd::list") || "[]");
}

export function removeRecording(name: string) {
  localStorage.removeItem(`rcd::item::${name}`);
  const recordings = JSON.parse(localStorage.getItem("rcd::list") || "[]");
  localStorage.setItem(
    "rcd::list",
    JSON.stringify(recordings.filter((n: string) => n !== name)),
  );
  updateUI();
}

export function playRecording(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dataStr = localStorage.getItem(`rcd::item::${name}`);
    if (!dataStr) {
      reject(new Error("Recording not found"));
      return;
    }
    const data: [number[], number][] = JSON.parse(dataStr);
    let startTime = performance.now();
    let index = 0;

    let maxTimestamp = data[data.length - 1][1];

    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }

    function scheduleNext() {
      if (index >= data.length) {
        resolve();
        stateManager.forceSet = null;
        timeout = null;
        return;
      }
      console.log(`Playing index ${index}`);
      const [binary, timestamp] = data[index];

      const delay = timestamp - (performance.now() - startTime);
      const timeoutId = window.setTimeout(
        () => {
          stateManager.forceSet = new Uint8Array(binary);
          emitRecordPlayEvent(
            index + 1,
            data.length,
            Math.min(1, timestamp / maxTimestamp),
          );
          index++;
          scheduleNext();
        },
        Math.max(0, delay),
      );
      timeout = timeoutId;
    }

    scheduleNext();
  });
}

export function stopPlaying() {
  if (timeout !== null) {
    clearTimeout(timeout);
    timeout = null;
  }
  stateManager.forceSet = null;
}

// ============== UI CONTROLS ==============

function updateUI() {
  renderReplayList();
  const recordBtn = document.getElementById("recordBtn") as HTMLButtonElement;
  const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
  if (recordStartTime !== null) {
    recordBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  }

  const saveReplayBtn = document.getElementById(
    "saveReplayBtn",
  ) as HTMLButtonElement;
  saveReplayBtn.disabled =
    recordStartTime !== null || recordedData.length === 0;
  const stopReplayBtn = document.getElementById(
    "stopReplayBtn",
  ) as HTMLButtonElement;
  stopReplayBtn.disabled = timeout === null;
}

document.getElementById("recordBtn")?.addEventListener("click", () => {
  startRecording();
  updateUI();
});
document.getElementById("stopBtn")?.addEventListener("click", () => {
  stopRecording();
  updateUI();
});
document.getElementById("saveReplayBtn")?.addEventListener("click", () => {
  const name = prompt("Enter a name for the recording:");
  if (name) {
    saveRecording(name);
    alert(`Recording saved as "${name}"`);
  }
  updateUI();
});
document.getElementById("stopReplayBtn")?.addEventListener("click", () => {
  stopPlaying();
  updateUI();
});

const replayList = document.getElementById("replayList");

function renderReplayList() {
  if (!replayList) return;
  const replays = JSON.parse(
    localStorage.getItem("rcd::list") || "[]",
  ) as string[];
  replayList.innerHTML = "";
  let table = document.createElement("table");
  if (replays.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No replays saved.";
    replayList.appendChild(li);
    return;
  }
  replays.forEach((r) => {
    const nameEl = document.createElement("span");
    const replayBtn = document.createElement("button");
    const replayMultiBtn = document.createElement("button");
    const deleteBtn = document.createElement("button");
    const exportBtn = document.createElement("button");
    const emptyDiv = document.createElement("div");

    // Delete button
    deleteBtn.textContent = "Delete";
    deleteBtn.style.marginLeft = "6px";

    nameEl.textContent = r;
    replayBtn.textContent = "Replay";
    exportBtn.textContent = "Export";
    replayBtn.className = "replayBtn";
    replayBtn.addEventListener("click", () => {
      playRecording(r);
    });
    replayMultiBtn.textContent = "Replay (nTimes)";
    replayMultiBtn.style.marginLeft = "6px";
    replayMultiBtn.addEventListener("click", () => {
      const nStr = prompt("Enter number of times to replay:");
      const n = nStr ? parseInt(nStr) : 1;
      if (isNaN(n) || n <= 0) {
        alert("Invalid number");
        return;
      }
      const stopButton = document.createElement("button");
      stopButton.textContent = "Stop";
      stopButton.style.marginLeft = "6px";
      replayMultiBtn.disabled = true;
      replayBtn.disabled = true;

      emptyDiv.appendChild(stopButton);

      let stopped = false;
      stopButton.addEventListener("click", () => {
        stopped = true;
        replayMultiBtn.disabled = false;
        replayBtn.disabled = false;
        emptyDiv.removeChild(stopButton);
        stopPlaying();
      });
      (async () => {
        for (let i = 0; i < n; i++) {
          try {
            await playRecording(r);
          } catch (e) {
            alert(`Error during replay: ${(e as Error).message}`);
            break;
          }
          if (stopped) {
            // Stopped
            break;
          }
        }
        replayMultiBtn.disabled = false;
        replayBtn.disabled = false;
        if (emptyDiv.contains(stopButton)) {
          emptyDiv.removeChild(stopButton);
        }
      })();
    });

    deleteBtn.addEventListener("click", () => {
      if (confirm(`Are you sure you want to delete the recording "${r}"?`)) {
        removeRecording(r);
      }
    });
    exportBtn.style.marginLeft = "6px";
    exportBtn.addEventListener("click", () => {
      const dataStr = localStorage.getItem(`rcd::item::${r}`);
      if (!dataStr) {
        alert("Recording not found");
        return;
      }
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    const tr1 = document.createElement("tr");
    const td1 = document.createElement("td");
    td1.appendChild(nameEl);
    const td2 = document.createElement("td");
    td2.appendChild(replayBtn);
    td2.appendChild(replayMultiBtn);
    td2.appendChild(emptyDiv);
    td2.classList.add("align-right-td");
    td2.appendChild(exportBtn);
    td2.appendChild(deleteBtn);
    tr1.appendChild(td1);
    tr1.appendChild(td2);
    table.appendChild(tr1);
  });

  replayList.appendChild(table);
}

updateUI();
setInterval(updateUI, 1000);
