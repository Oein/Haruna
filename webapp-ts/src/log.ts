const log = document.getElementById("log") as HTMLDivElement;
const seriallog = document.getElementById("seriallog") as HTMLDivElement;

// Logging function
export function addLog(message: string, type = "info") {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;

  // Keep only last 50 entries
  while (log.children.length > 50) {
    log.firstChild && log.removeChild(log.firstChild);
  }
}

export function addSerialLog(message: string, type = "info") {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
  seriallog.appendChild(entry);
  seriallog.scrollTop = seriallog.scrollHeight;

  // Keep only last 50 entries
  while (seriallog.children.length > 50) {
    seriallog.firstChild && seriallog.removeChild(seriallog.firstChild);
  }
}
