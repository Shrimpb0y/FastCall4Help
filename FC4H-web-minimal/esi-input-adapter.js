// ESI 输入适配器占位。
// 当前文件只定义接口形状，不发起真实网络请求。
// 后续接入 EVE SSO 和 ESI 后，应把返回值整理成 assembler 可接受的输入对象。

async function readEsiInput(context) {
  return {
    characterName: context.characterName ?? "未知",
    systemName: context.systemName ?? "未知",
    shipType: "未知",
    shield: "未知",
    armor: "未知",
    hull: "未知",
    hostileCount: "",
    hostileShipTypes: "",
    scoutShipType: "",
    cynoType: "unknown",
    mainFleetStatus: "unknown",
    note: "ESI 输入适配器尚未接入，当前使用占位数据",
    source: {
      esi: {
        enabled: false,
        scopes: [],
        characterId: context.characterId ?? null
      }
    }
  };
}

module.exports = {
  readEsiInput
};
