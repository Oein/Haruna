import type { NS } from "../../global";

const waitForNS = async (): Promise<NS> => {
  while (!window.ns) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return window.ns;
};

waitForNS().then((ns) => {
  async function runner(targetX: number, targetY: number, runTimes: number) {
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
    ns.b("L", true);
    await delay(100);
    ns.b("L", true);
    await delay(100);
    ns.b("L", true);
    await delay(500);
    for (let i = 0; i < runTimes; i++) {
      ns.b("A", true);
      await delay(70);
      ns.b("A", false);
      await delay(2100);
      ns.l(targetX, targetY);
      await delay(200);
      ns.l(128, 128);
      await delay(600);
    }
    ns.b("L", false);
  }

  const getRunTimes = () => {
    const input = document.getElementById("times") as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (isNaN(value) || value < 1) {
      return -1;
    }
    return value;
  };

  document.getElementById("left")?.addEventListener("click", async () => {
    const times = getRunTimes();
    if (times === -1) {
      alert("Please enter a valid number of times.");
      return;
    }
    await runner(0, 128, times);
  });

  document.getElementById("right")?.addEventListener("click", async () => {
    const times = getRunTimes();
    if (times === -1) {
      alert("Please enter a valid number of times.");
      return;
    }
    await runner(255, 128, times);
  });

  document.getElementById("up")?.addEventListener("click", async () => {
    const times = getRunTimes();
    if (times === -1) {
      alert("Please enter a valid number of times.");
      return;
    }
    await runner(128, 0, times);
  });

  document.getElementById("down")?.addEventListener("click", async () => {
    const times = getRunTimes();
    if (times === -1) {
      alert("Please enter a valid number of times.");
      return;
    }
    await runner(128, 255, times);
  });
});
