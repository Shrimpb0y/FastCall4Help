const form = document.querySelector("#distressForm");
const preview = document.querySelector("#messagePreview");
const copyStatus = document.querySelector("#copyStatus");
const copyAgainButton = document.querySelector("#copyAgainButton");
const loadSampleButton = document.querySelector("#loadSampleButton");

let latestMessage = "";

const sampleDistress = {
  characterName: "Shrimp Boy",
  systemName: "AW1-2I",
  fleetName: "未知"
};

async function readDistressInput(formElement) {
  const data = new FormData(formElement);
  const rawInput = Object.fromEntries(data.entries());
  const localLogFile = formElement.elements.namedItem("localLogFile").files[0];
  const fleetLogFile = formElement.elements.namedItem("fleetLogFile").files[0];

  if (localLogFile) {
    const localLogText = await readLogFile(localLogFile);
    rawInput.characterName = extractChatListener(localLogText) || rawInput.characterName;
    rawInput.systemName = extractLastLocalSystem(localLogText) || rawInput.systemName;
  }

  if (fleetLogFile) {
    const fleetLogText = await readLogFile(fleetLogFile);
    rawInput.fleetName = extractChannelName(fleetLogText) || rawInput.fleetName;
  }

  return FC4HAssembler.createManualDistressEvent(rawInput);
}

async function readLogFile(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer).replace(/^\uFEFF/, "");
  }

  return new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");
}

function extractChatListener(text) {
  const match = text.match(/^\s*Listener:\s*(.+?)\s*$/m);
  return match?.[1]?.trim() ?? "";
}

function extractLastLocalSystem(text) {
  const matches = [...text.matchAll(/频道更换为本地：(.+?)\s*$/gm)];
  const lastMatch = matches.at(-1);

  return lastMatch?.[1]?.trim() ?? "";
}

function extractChannelName(text) {
  const match = text.match(/^\s*Channel Name:\s*(.+?)\s*$/m);
  return match?.[1]?.trim() ?? "";
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("clipboard_copy_failed");
  }
}

function setStatus(text, mode = "neutral") {
  copyStatus.textContent = text;
  copyStatus.dataset.mode = mode;
}

async function assembleAndCopy() {
  const event = await readDistressInput(form);
  latestMessage = FC4HAssembler.assembleDistressMessage(event);
  preview.textContent = latestMessage;

  try {
    await copyToClipboard(latestMessage);
    setStatus("已复制", "success");
  } catch (error) {
    setStatus("需手动复制", "warning");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await assembleAndCopy();
});

copyAgainButton.addEventListener("click", async () => {
  if (!latestMessage) {
    setStatus("无内容", "warning");
    return;
  }

  try {
    await copyToClipboard(latestMessage);
    setStatus("已复制", "success");
  } catch (error) {
    setStatus("需手动复制", "warning");
  }
});

loadSampleButton.addEventListener("click", () => {
  Object.entries(sampleDistress).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  });
  setStatus("示例已填", "neutral");
});
