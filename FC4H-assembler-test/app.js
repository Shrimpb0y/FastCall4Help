const form = document.querySelector("#distressForm");
const preview = document.querySelector("#messagePreview");
const copyStatus = document.querySelector("#copyStatus");
const copyAgainButton = document.querySelector("#copyAgainButton");
const loadSampleButton = document.querySelector("#loadSampleButton");

let latestMessage = "";

const sampleDistress = {
  characterName: "New Capsuleer",
  systemName: "1DQ1-A",
  shipType: "Nyx",
  shield: "21",
  armor: "68",
  hull: "100",
  hostileCount: "8",
  hostileShipTypes: "HIC, DIC, Loki",
  scoutShipType: "Loki",
  cynoType: "black",
  mainFleetStatus: "not_arrived",
  note: "已被反跳，需要旗舰救援"
};

function readDistressForm(formElement) {
  const data = new FormData(formElement);
  return FC4HAssembler.createManualDistressEvent(Object.fromEntries(data.entries()));
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
  const event = readDistressForm(form);
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
