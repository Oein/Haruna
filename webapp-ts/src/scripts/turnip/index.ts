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
  const sourceX = Math.floor(videoElement.videoWidth / 5);
  const sourceWidth = Math.floor(videoElement.videoWidth / 3);
  const sourceY = Math.floor(
    videoElement.videoHeight / 2 + videoElement.videoHeight / 6,
  );
  const sourceHeight = Math.floor(videoElement.videoHeight / 6);
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

async function getPriceFromImageBase64(imageBase64: string): Promise<number> {
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
              text: '현제 무 가격을 확인하고 JSON으로 반환하세요.\n알수 없을경우 -1벨로 답합니다.\n응답은 반드시 json형식으로만 해주세요.\n예시: {"price": 500} or {"price": -1}',
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
    return JSON.parse(data.output[0].content[0].text).price;
  } catch (e) {
    console.error("Failed to parse response:", e);
    return 0;
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

setupCamera()
  .then(() => waitForNS())
  .then(async (ns) => {
    let prices = JSON.parse(localStorage.getItem("trumpMakerPrices") || "[]");
    const sendStatus = (price: number) =>
      fetch(
        "https://discord.com/api/webhooks/1463522536531689575/3gXBOr1bO7V78Cq3G0vbAQEHrq6o0CAjumo8dGmQIJ4569MG8SUitxmUZ6usAFp6u9oE",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: null,
            embeds: [
              {
                title: "무 주식 가격",
                color: null,
                fields: [
                  {
                    name: "현재가",
                    value: price.toString(),
                  },
                  {
                    name: "최저가",
                    value: Math.min(...prices).toString(),
                    inline: true,
                  },
                  {
                    name: "평균가",
                    value: (
                      prices.reduce((a: number, b: number) => a + b, 0) /
                      prices.length
                    )
                      .toFixed(2)
                      .toString(),
                    inline: true,
                  },
                  {
                    name: "최고가",
                    value: Math.max(...prices).toString(),
                    inline: true,
                  },
                  {
                    name: "시도 횟수",
                    value: prices.length.toString(),
                  },
                ],
              },
            ],
            username: "무주식",
            avatar_url: "https://turnipprophet.io/img/favicon-196.png",
            attachments: [],
          }),
        },
      ).catch((error) => {
        console.error("Error sending Discord webhook:", error);
      });
    if (prices.length > 0) {
      document.getElementById("stats")!.textContent =
        `시도 : ${prices.length} | ` +
        `최고가 : ${Math.max(...prices)} | ` +
        `최저가 : ${Math.min(...prices)} | ` +
        `평균가 : ${(
          prices.reduce((a: number, b: number) => a + b, 0) / prices.length
        ).toFixed(2)}`;
      sendStatus(prices[prices.length - 1]);
    } else {
      document.getElementById("stats")!.textContent = "기록이 없습니다.";
    }
    document.getElementById("clearHistory")!.addEventListener("click", () => {
      prices = [];
      localStorage.setItem("trumpMakerPrices", JSON.stringify(prices));
      document.getElementById("stats")!.textContent =
        "기록이 초기화되었습니다.";
    });
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
      await ns.replay.play("timesleep");
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
      await ns.replay.play("home2view");
      // to png base64 url
      let price = -1;
      while (price === -1) {
        const imageBase64 = await cameraToPngBase64();
        price = await getPriceFromImageBase64(imageBase64);
        console.log("Detected price:", price);
      }
      prices.push(price);
      document.getElementById("stats")!.textContent =
        `시도 : ${prices.length} | ` +
        `가격 : ${price} | ` +
        `최고가 : ${Math.max(...prices)} | ` +
        `최저가 : ${Math.min(...prices)} | ` +
        `평균가 : ${(
          prices.reduce((a: number, b: number) => a + b, 0) / prices.length
        ).toFixed(2)}`;
      sendStatus(price);
      localStorage.setItem("trumpMakerPrices", JSON.stringify(prices));
      if (price >= 450) {
        return;
      }
    }
  });
