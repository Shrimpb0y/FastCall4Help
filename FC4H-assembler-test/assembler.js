const FC4HAssembler = (() => {
  const cynoLabels = {
    unknown: "未知",
    black: "黑诱导",
    white: "白诱导",
    none: "未发现诱导"
  };

  // 敌方主力状态目前用于原型判断，后续接 AI 时仍可沿用这个输入字段。
  const mainFleetStatusLabels = {
    unknown: "未知",
    not_arrived: "尚未进场",
    arrived: "已经进场"
  };

  function normalizeText(value, fallback = "未知") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function normalizeNumber(value, fallback = "未知") {
    const text = String(value ?? "").trim();
    if (text === "") return fallback;

    const number = Number(text);
    if (!Number.isFinite(number)) return fallback;

    return String(Math.max(0, Math.min(100, Math.round(number))));
  }

  // 把表单输入转换成逻辑层可以处理的 manual_distress 事件。
  function createManualDistressEvent(rawInput, now = new Date()) {
    const aiInput = {
      hostileCount: normalizeText(rawInput.hostileCount, ""),
      hostileShipTypes: normalizeText(rawInput.hostileShipTypes, ""),
      scoutShipType: normalizeText(rawInput.scoutShipType, ""),
      cynoType: normalizeText(rawInput.cynoType, "unknown"),
      mainFleetStatus: normalizeText(rawInput.mainFleetStatus, "unknown"),
      note: normalizeText(rawInput.note, "")
    };

    return {
      type: "manual_distress",
      characterName: normalizeText(rawInput.characterName),
      systemName: normalizeText(rawInput.systemName),
      shipType: normalizeText(rawInput.shipType),
      shipHealth: {
        shield: normalizeNumber(rawInput.shield),
        armor: normalizeNumber(rawInput.armor),
        hull: normalizeNumber(rawInput.hull)
      },
      hostileCount: normalizeText(aiInput.hostileCount, "未确认"),
      hostileShipTypes: normalizeText(aiInput.hostileShipTypes, "未确认"),
      aiInput,
      aiSuggestion: analyzeThreat(aiInput),
      note: normalizeText(rawInput.note, "无"),
      createdAt: now
    };
  }

  // ThreatAnalyzer 的临时规则版。后续训练模型接入时，优先替换这个函数的实现。
  function analyzeThreat(input) {
    const candidateFleetTypes = inferFleetTypes(input.cynoType);
    const signals = [];
    let estimatedCount = input.hostileCount || "未确认";
    let estimatedShipTypes = input.hostileShipTypes || "未确认";

    if (input.scoutShipType) {
      signals.push(`前置车头：${input.scoutShipType}`);
    }

    if (input.cynoType !== "unknown") {
      signals.push(`诱导：${cynoLabels[input.cynoType] ?? input.cynoType}`);
    }

    // 黑隐队等场景里，抓人时可能只有车头在场，主力随后才进入。
    if (input.mainFleetStatus === "not_arrived") {
      signals.push("主力尚未进场，当前人数可能只包含车头");

      if (!input.hostileCount) {
        estimatedCount = input.scoutShipType ? "1+主力未知" : "主力未知";
      }

      if (!input.hostileShipTypes && input.scoutShipType) {
        estimatedShipTypes = `${input.scoutShipType} + 主力未知`;
      }
    }

    if (input.cynoType === "white") {
      signals.push("白诱导规则：暂排除 T3 队和黑隐队");
    }

    if (input.cynoType === "black") {
      signals.push("黑诱导规则：保留黑隐队 / T3队 / 常规 / 无畏可能");
    }

    return {
      provider: "prototype_rules",
      confidence: input.cynoType === "unknown" ? "低" : "中",
      estimatedCount,
      estimatedShipTypes,
      candidateFleetTypes,
      signals
    };
  }

  function inferFleetTypes(cynoType) {
    if (cynoType === "white") {
      return ["常规", "无畏"];
    }

    if (cynoType === "black") {
      return ["黑隐队", "T3队", "常规", "无畏"];
    }

    if (cynoType === "none") {
      return ["常规", "未知"];
    }

    return ["未知"];
  }

  // 信息组装器的最终输出：这里决定复制到剪贴板的求救文本格式。
  function assembleDistressMessage(event) {
    const ai = event.aiSuggestion;
    const aiSignals = ai.signals.length > 0 ? ai.signals.join("；") : "无";

    return [
      "[FC4H][旗舰被抓]",
      `驾驶员：${event.characterName}`,
      `位置：${event.systemName}`,
      `舰船：${event.shipType}`,
      `血量：盾 ${event.shipHealth.shield}% / 甲 ${event.shipHealth.armor}% / 结构 ${event.shipHealth.hull}%`,
      `敌对：${formatHostileCount(ai.estimatedCount)}，${ai.estimatedShipTypes}`,
      `判断：${ai.candidateFleetTypes.join(" / ")}，置信度：${ai.confidence}`,
      `信号：${aiSignals}`,
      `备注：${event.note}`,
      `时间：${formatTimestamp(event.createdAt)}`
    ].join("\n");
  }

  function formatHostileCount(count) {
    return /^\d+$/.test(String(count)) ? `${count} 人` : count;
  }

  function formatTimestamp(date) {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);
  }

  return {
    analyzeThreat,
    assembleDistressMessage,
    createManualDistressEvent,
    inferFleetTypes,
    mainFleetStatusLabels
  };
})();

globalThis.FC4HAssembler = FC4HAssembler;
