const chooseFolderBtn = document.getElementById("chooseFolder");
const captureBtn = document.getElementById("capture");
const folderLabel = document.getElementById("folderLabel");
const fileNamePatternInput = document.getElementById("fileNamePattern");
const messageEl = document.getElementById("message");

let directoryHandle = null;

function setMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function setFolderLabel(name) {
  folderLabel.textContent = name ? `Saving to: ${name}` : "No folder selected";
}

function sanitizePattern(pattern) {
  const trimmed = pattern.trim().replace(/\.png$/i, "");
  const safe = trimmed.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-");
  return safe.replace(/^-+|-+$/g, "") || "quickcap";
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getNextNumber(directoryHandle, base) {
  let max = 0;
  const re = new RegExp(`^${escapeRegex(base)}-(\\d+)\\.png$`, "i");

  for await (const entry of directoryHandle.values()) {
    if (entry.kind !== "file") continue;
    const match = entry.name.match(re);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }

  return max + 1;
}

async function buildFilename(directoryHandle, pattern) {
  const base = sanitizePattern(pattern);
  const n = await getNextNumber(directoryHandle, base);
  return `${base}-${n}.png`;
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function ensurePermission(handle) {
  const opts = { mode: "readwrite" };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

async function captureActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.windowId) throw new Error("No active tab found.");
  if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
    throw new Error("Cannot capture Chrome internal pages.");
  }
  return chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
}

async function saveScreenshot(handle, dataUrl, pattern) {
  const ok = await ensurePermission(handle);
  if (!ok) throw new Error("Folder access denied. Click Choose folder again.");

  const filename = await buildFilename(handle, pattern);
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(dataUrlToBlob(dataUrl));
  await writable.close();
  return filename;
}

async function pickFolder() {
  if (!window.showDirectoryPicker) {
    throw new Error("Folder picker is not supported. Use Google Chrome.");
  }
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  directoryHandle = handle;
  await saveDirectoryHandle(handle);
  setFolderLabel(handle.name);
  return handle;
}

chooseFolderBtn.addEventListener("click", async () => {
  setMessage("");
  try {
    await pickFolder();
    setMessage("Folder ready.", "success");
  } catch (err) {
    if (err.name === "AbortError") return;
    setMessage(err.message || String(err), "error");
  }
});

fileNamePatternInput.addEventListener("change", () => {
  chrome.storage.local.set({ fileNamePattern: fileNamePatternInput.value });
});

captureBtn.addEventListener("click", async () => {
  setMessage("");
  captureBtn.disabled = true;

  try {
    if (!directoryHandle) {
      setMessage("Pick a folder first.", "error");
      await pickFolder();
      if (!directoryHandle) return;
    }

    const pattern = fileNamePatternInput.value;
    await chrome.storage.local.set({ fileNamePattern: pattern });

    const dataUrl = await captureActiveTab();
    const filename = await saveScreenshot(directoryHandle, dataUrl, pattern);
    setMessage(`Saved ${filename}`, "success");
  } catch (err) {
    if (err.name === "AbortError") return;
    setMessage(err.message || String(err), "error");
  } finally {
    captureBtn.disabled = false;
  }
});

loadDirectoryHandle()
  .then((handle) => {
    if (!handle) return;
    directoryHandle = handle;
    setFolderLabel(handle.name);
  })
  .catch(() => {});

chrome.storage.local.get("fileNamePattern", ({ fileNamePattern }) => {
  if (fileNamePattern) fileNamePatternInput.value = fileNamePattern;
});
