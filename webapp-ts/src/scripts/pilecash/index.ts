// 1. select camera with navigator.mediaDevices.getUserMedia
async function selectCamera(constraints: MediaStreamConstraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const videoTracks = stream.getVideoTracks();
    console.log("Using video device: " + videoTracks[0].label);
    return stream;
  } catch (error) {
    console.error("Error accessing media devices.", error);
    throw error;
  }
}

// put the camera stream to top left video element
async function setupCamera() {
  const constraints: MediaStreamConstraints = {
    video: { width: 1920, height: 1080 },
    audio: false,
  };
  const stream = await selectCamera(constraints);
  const videoElement = document.createElement("video");
  videoElement.autoplay = true;

  const descElem = document.createElement("div");
  descElem.textContent = "Camera Preview";
  descElem.style.position = "absolute";
  descElem.style.top = "0";
  descElem.style.left = "0";
  descElem.style.color = "white";
  descElem.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  descElem.style.padding = "4px";

  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = "min(100%, 640px)";
  container.appendChild(videoElement);
  container.appendChild(descElem);
  document.body.appendChild(container);

  videoElement.onloadedmetadata = () => {
    console.log(
      "Video dimensions: " +
        videoElement.videoWidth +
        "x" +
        videoElement.videoHeight,
    );

    videoElement.style.width = "min(100%, 640px)";
  };

  let colorPickTarget = { x: 0, y: 0 };
  videoElement.addEventListener("pointermove", (event) => {
    const rect = videoElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    colorPickTarget = {
      x: Math.floor((x / rect.width) * videoElement.videoWidth),
      y: Math.floor((y / rect.height) * videoElement.videoHeight),
    };
  });

  const colorPickInterval = async () => {
    try {
      const { r, g, b } = await getRGBAt(colorPickTarget.x, colorPickTarget.y);
      descElem.textContent =
        `X: ${colorPickTarget.x}, Y: ${colorPickTarget.y} - ` +
        `RGB(${r}, ${g}, ${b})`;
    } catch (e) {
      console.error("Error getting RGB at point:", e);
    } finally {
      requestAnimationFrame(colorPickInterval);
    }
  };
  colorPickInterval();

  videoElement.srcObject = stream;
  await videoElement.play();
}

async function getRGBAt(x: number, y: number) {
  const videoElement = document.querySelector("video") as HTMLVideoElement;
  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to get canvas context");
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const pixelData = context.getImageData(x, y, 1, 1).data;
  return { r: pixelData[0], g: pixelData[1], b: pixelData[2] };
}

async function waitForColor(
  x: number,
  y: number,
  targetColor: { r: number; g: number; b: number },
  tolerance = 30,
) {
  while (true) {
    const { r, g, b } = await getRGBAt(x, y);
    const distance = Math.sqrt(
      (r - targetColor.r) ** 2 +
        (g - targetColor.g) ** 2 +
        (b - targetColor.b) ** 2,
    );
    console.log(
      `Current color at (${x}, ${y}): rgb(${r}, ${g}, ${b}), distance: ${distance}`,
    );
    if (distance <= tolerance) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function cameraToPngBase64() {
  const videoElement = document.querySelector("video");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!videoElement) throw new Error("Video element not found");
  if (!context) throw new Error("Failed to get canvas context");
  // Render only the bottom half of the video
  // Render only 1/3 center part of the video
  const sourceX = 739;
  const sourceWidth = 500;
  const sourceY = 780;
  const sourceHeight = 200;
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  context.drawImage(
    videoElement,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas.toDataURL("image/png");
}

let OPEN_AI_KEY = localStorage.getItem("OPEN_AI_KEY") || "";
const keyInput = document.getElementById("openAiKey") as HTMLInputElement;
keyInput.value = OPEN_AI_KEY;
keyInput.addEventListener("change", () => {
  OPEN_AI_KEY = keyInput.value;
  localStorage.setItem("OPEN_AI_KEY", OPEN_AI_KEY);
});

async function getHasCachPile(imageBase64: string): Promise<boolean> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPEN_AI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: '오늘의 아이템을 보고 돈다발이 있는지 JSON형식으로 응답하시오.\n{"exists": true} 또는 {"exists": false} 형식으로 응답하시오.',
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: imageBase64,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
      reasoning: {},
      tools: [],
      temperature: 1,
      max_output_tokens: 2048,
      top_p: 1,
    }),
  });
  const data = await response.json();
  try {
    return JSON.parse(data.output[0].content[0].text).exists;
  } catch (e) {
    console.error("Failed to parse response:", e);
    return false;
  }
}

import type { NS } from "../../global";

const waitForNS = async (): Promise<NS> => {
  while (!window.ns) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return window.ns;
};

let runStatus: "RUNNING" | "STOPPED" | "STOP_NEXT_LOOP" = "STOPPED";
const rsBtn = document.getElementById("runStatus") as HTMLButtonElement;
rsBtn.addEventListener("click", () => {
  if (runStatus === "RUNNING") {
    runStatus = "STOP_NEXT_LOOP";
    rsBtn.textContent = "실행 상태 (중지중)";
    rsBtn.style.backgroundColor = "#FFA500";
  } else {
    runStatus = "RUNNING";
    rsBtn.textContent = "실행 상태 (실행중)";
    rsBtn.style.backgroundColor = "#FF4444";
  }
});

function setLog(text: string, tried: number) {
  const logElem = document.getElementById("stats")!;
  logElem.textContent = `시도 횟수: ${tried}회 | ${text}`;
}

setupCamera()
  .then(() => waitForNS())
  .then(async (ns) => {
    let tried = 0;
    while (true) {
      if (runStatus === "STOPPED") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      if (runStatus === "STOP_NEXT_LOOP") {
        runStatus = "STOPPED";
        rsBtn.textContent = "실행 상태 (중지됨)";
        continue;
      }
      setLog("창 나가기...", tried);
      await ns.b("B", true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await ns.b("B", false);
      await new Promise((resolve) => setTimeout(resolve, 100));

      setLog("타임슬립중...", tried);
      await ns.replay.play("timesleepnday");
      let repeatA = true;
      (async () => {
        while (repeatA) {
          await ns.b("A", true);
          await ns.b("B", true);
          await new Promise((resolve) => setTimeout(resolve, 100));
          await ns.b("A", false);
          await ns.b("B", false);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      })();
      setLog("맵 로딩 대기중...", tried);
      await waitForColor(
        1695,
        978,
        {
          r: 63,
          g: 134,
          b: 62,
        },
        20,
      );
      repeatA = false;
      setLog("오늘 아이템 확인 중...", tried);
      await ns.replay.play("viewtodayItem");

      setLog("오늘 아이템 창 대기중...", tried);
      await waitForColor(1293, 862, {
        r: 255,
        g: 255,
        b: 226,
      });
      // to png base64 url
      setLog("OCR 확인중...", tried);
      const imageBase64 = await cameraToPngBase64();
      const hasCash = await getHasCachPile(imageBase64);

      tried += 1;
      document.getElementById("stats")!.textContent = `시도 횟수: ${tried}회`;

      if (hasCash) {
        document.getElementById("result")!.textContent = `돈다발 발견!`;
        runStatus = "STOPPED";
        rsBtn.textContent = "실행 상태 (중지됨)";
      }
    }
  });
