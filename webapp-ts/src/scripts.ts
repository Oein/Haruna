import { addLog } from "./log";
import { playRecording, stopPlaying } from "./recording";
import { StateInstance, stateManager } from "./state";

function createScriptIframe(src: string, instance: StateInstance) {
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.style.resize = "vertical";

  iframe.addEventListener("load", () => {
    const window = iframe.contentWindow;
    if (!window) {
      addLog(`Failed to access iframe window for script: ${src}`, "error");
      return;
    }
    // Provide the instance to the iframe
    (window as any).instance = instance;
    window.ns = {
      replay: {
        play: (name: string) => {
          return playRecording(name);
        },
        stop: () => {
          return stopPlaying();
        },
      },
      gamepad: {
        setButton(buttons) {
          instance.setButton(buttons);
        },
        setButtonByName(name: string, pressed: boolean) {
          instance.setButtonByName(name as any, pressed);
        },
        setDpad(
          dpad: boolean | number,
          down?: boolean,
          left?: boolean,
          right?: boolean,
        ) {
          instance.setDpad(dpad, down, left, right);
        },
        setStick(leftX: number, leftY: number, rightX: number, rightY: number) {
          instance.setSticks(leftX, leftY, rightX, rightY);
        },
        setLeftX(value: number) {
          instance.setLeftX(value);
        },
        setLeftY(value: number) {
          instance.setLeftY(value);
        },
        setRightX(value: number) {
          instance.setRightX(value);
        },
        setRightY(value: number) {
          instance.setRightY(value);
        },
        setLeftStick(x: number, y: number) {
          instance.setLeftStick(x, y);
        },
        setRightStick(x: number, y: number) {
          instance.setRightStick(x, y);
        },
      },
      log: {
        info: (msg: string) => {
          addLog(`[${src}] ${msg}`, "info");
        },
        error: (msg: string) => {
          addLog(`[${src}] ${msg}`, "error");
        },
      },
    };
  });

  return iframe;
}

async function fetchScriptList() {
  const iframeContainer = document.getElementById("iframeContainer");
  if (!iframeContainer) return;
  try {
    const response = await fetch("/src/scripts/manifest.json");
    if (!response.ok) throw new Error("Failed to fetch scripts.json");
    // src, name
    const scripts: [string, string][] = await response.json();
    const containers: HTMLDivElement[] = [];
    for (const [scriptSrc, _scriptName] of scripts) {
      const div = document.createElement("div");
      div.setAttribute("data-script-name", scriptSrc);
      containers.push(div);
      iframeContainer.appendChild(div);
    }
    const scriptContainer = document.getElementById("scriptContainer");
    if (!scriptContainer) return;
    scripts.forEach(([scriptSrc, scriptName], i) => {
      const button = document.createElement("button");
      button.textContent = `${scriptName}`;
      let hasFrame = false;
      let scriptDiv = containers[i];
      button.style.background = "#333";
      let instance = stateManager.createInstance(scriptName);

      button.addEventListener("click", () => {
        if (hasFrame) {
          // remove existing iframe
          scriptDiv.innerHTML = "";
          hasFrame = false;
          addLog(`Unloaded script: ${scriptSrc}`, "info");
          button.style.background = "#333";
          return;
        }
        const iframe = createScriptIframe(scriptSrc, instance);
        scriptDiv.appendChild(iframe);
        hasFrame = true;
        button.style.background = "#82AAFF";
        addLog(`Loaded script: ${scriptSrc}`, "info");
      });
      scriptContainer.appendChild(button);
    });
  } catch (e: any) {
    addLog(`Error loading scripts: ${e.message}`, "error");
  }
}
fetchScriptList();
