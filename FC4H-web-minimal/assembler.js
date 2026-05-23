const FC4HAssembler = (() => {
  function normalizeText(value, fallback = "未知") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  // 轻量版事件：只保留本地日志能稳定提供或后续较容易补齐的字段。
  function createManualDistressEvent(rawInput, now = new Date()) {
    return {
      type: "manual_distress",
      characterName: normalizeText(rawInput.characterName),
      systemName: normalizeText(rawInput.systemName),
      fleetName: normalizeText(rawInput.fleetName),
      createdAt: now
    };
  }

  // 信息组装器最终输出。当前版本只输出：被抓人员、当前地点、所在舰队。
  function assembleDistressMessage(event) {
    return [
      "[FC4H][被抓]",
      `被抓人员：${event.characterName}`,
      `当前地点：${event.systemName}`,
      `所在舰队：${event.fleetName}`
    ].join("\n");
  }

  return {
    assembleDistressMessage,
    createManualDistressEvent
  };
})();

globalThis.FC4HAssembler = FC4HAssembler;
