// 预警关联器原型：
// 1. 从 Gamelog 中匹配“XXX 正在尝试跃迁扰断你”一类事件。
// 2. 用事件中的攻击者名称，到预警频道 Chatlog 的时间窗口内寻找相关上报。

function extractWarpDisruptEvents(gameLogText) {
  const events = [];
  const disruptKeywords = [
    "正在尝试跃迁扰断你",
    "正在尝试跃迁扰频你",
    "正在尝试阻止你跃迁"
  ];

  for (const rawLine of gameLogText.split(/\r?\n/)) {
    const line = rawLine.trim();
    const lineMatch = line.match(/^\[\s*(.+?)\s*\]\s*(?:\((.+?)\)\s*)?(.+)$/);
    if (!lineMatch) continue;

    const [, timestamp, level = "unknown", message] = lineMatch;
    const cleanMessage = stripHtml(message);

    for (const keyword of disruptKeywords) {
      const keywordIndex = cleanMessage.indexOf(keyword);
      if (keywordIndex === -1) continue;

      events.push({
        type: "warp_disrupt_attempt",
        timestamp: parseEveTimestamp(timestamp),
        rawTimestamp: timestamp.trim(),
        level,
        attackerName: cleanMessage.slice(0, keywordIndex).trim(),
        message: cleanMessage
      });
      break;
    }
  }

  return events;
}

function correlateAlertReports(disruptEvent, alertChatText, options = {}) {
  const windowMinutes = options.windowMinutes ?? 5;
  const reports = parseChatMessages(alertChatText);
  const attackerName = disruptEvent.attackerName.toLowerCase();

  return reports.filter((report) => {
    if (!report.timestamp || !disruptEvent.timestamp) return false;

    const diffMs = Math.abs(report.timestamp.getTime() - disruptEvent.timestamp.getTime());
    const inTimeWindow = diffMs <= windowMinutes * 60 * 1000;
    const mentionsAttacker = report.message.toLowerCase().includes(attackerName);

    return inTimeWindow && mentionsAttacker;
  });
}

function parseChatMessages(chatText) {
  const messages = [];
  const linePattern = /^\uFEFF?\[\s*(.+?)\s*\]\s*(.+?)\s*>\s*(.+)$/gm;

  for (const line of chatText.matchAll(linePattern)) {
    const [, timestamp, speaker, message] = line;

    messages.push({
      timestamp: parseEveTimestamp(timestamp),
      rawTimestamp: timestamp.trim(),
      speaker: speaker.trim(),
      message: message.trim()
    });
  }

  return messages;
}

function stripHtml(text) {
  return text.replace(/<[^>]+>/g, "").trim();
}

function parseEveTimestamp(value) {
  const match = value.trim().match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match.map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

module.exports = {
  correlateAlertReports,
  extractWarpDisruptEvents,
  parseChatMessages
};
