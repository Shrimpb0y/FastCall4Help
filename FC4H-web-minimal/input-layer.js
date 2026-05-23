const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DEFAULT_UNKNOWN = "未知";

// 最简单输入层：默认本机只登录一个角色，读取本地频道和舰队频道日志。
function readLatestSingleCharacterInput() {
  const eveLogsPath = path.join(os.homedir(), "Documents", "EVE", "logs");
  const chatLogsPath = path.join(eveLogsPath, "Chatlogs");
  const gameLogsPath = path.join(eveLogsPath, "Gamelogs");

  const latestLocalLog = findLatestFile(chatLogsPath, (fileName) =>
    fileName.startsWith("本地_") && fileName.endsWith(".txt")
  );
  const latestGameLog = findLatestFile(gameLogsPath, (fileName) =>
    fileName.endsWith(".txt")
  );
  const latestFleetChatLog = findLatestFile(chatLogsPath, (fileName) =>
    isFleetChatLogName(fileName)
  );

  const localLogText = latestLocalLog ? readTextFile(latestLocalLog.fullPath) : "";
  const gameLogText = latestGameLog ? readTextFile(latestGameLog.fullPath) : "";
  const fleetChatLogText = latestFleetChatLog ? readTextFile(latestFleetChatLog.fullPath) : "";

  const characterName =
    extractChatListener(localLogText) ||
    extractGameListener(gameLogText) ||
    DEFAULT_UNKNOWN;
  const systemName = extractLastLocalSystem(localLogText) || DEFAULT_UNKNOWN;
  const fleetName = extractChannelName(fleetChatLogText) || DEFAULT_UNKNOWN;

  return {
    characterName,
    systemName,
    fleetName,
    source: {
      localLog: latestLocalLog?.fullPath ?? null,
      gameLog: latestGameLog?.fullPath ?? null,
      fleetChatLog: latestFleetChatLog?.fullPath ?? null
    }
  };
}

function findLatestFile(folderPath, predicate) {
  if (!fs.existsSync(folderPath)) return null;

  return fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => {
      const fullPath = path.join(folderPath, entry.name);
      const stat = fs.statSync(fullPath);

      return {
        name: entry.name,
        fullPath,
        lastWriteTime: stat.mtimeMs
      };
    })
    .sort((a, b) => b.lastWriteTime - a.lastWriteTime)[0] ?? null;
}

function readTextFile(filePath) {
  const buffer = fs.readFileSync(filePath);

  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString("utf16le").replace(/^\uFEFF/, "");
  }

  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

function extractChatListener(text) {
  const match = text.match(/^\s*Listener:\s*(.+?)\s*$/m);
  return match?.[1]?.trim() ?? "";
}

function extractGameListener(text) {
  const match = text.match(/^\s*收听者:\s*(.+?)\s*$/m);
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

function isFleetChatLogName(fileName) {
  return (
    fileName.endsWith(".txt") &&
    (fileName.startsWith("舰队_") ||
      fileName.toLowerCase().startsWith("fleet_") ||
      fileName.includes("舰队"))
  );
}

if (require.main === module) {
  const input = readLatestSingleCharacterInput();
  console.log(JSON.stringify(input, null, 2));
}

module.exports = {
  extractChatListener,
  extractChannelName,
  extractGameListener,
  extractLastLocalSystem,
  isFleetChatLogName,
  readLatestSingleCharacterInput
};
