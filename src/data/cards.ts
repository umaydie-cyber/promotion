// 炼气期·剑修卡牌（可继续往这里加，不要把定义写死在战斗场景里）
export type CardId =
    | "strike"      // 挥砍
    | "defend"      // 招架
    | "riposte"     // 雁回（原“还击”）
    | "qingfeng"    // 清风
    | "luoxing"     // 落星
    | "guiyuan"     // 归元
    | "ningshuang"; // 凝霜
export type CardType = "attack" | "skill";

export type CardDef = {
    id: CardId;
    name: string;
    cost: number;
    type: CardType;
    desc: string;
    target: "none" | "enemy"; // 以后扩展：self/allEnemy 等
};

export const CARD_DEFS: Record<CardId, CardDef> = {
    strike:  { id: "strike",  name: "挥砍", cost: 1, type: "attack", target: "enemy", desc: "造成 6 点伤害" },
    defend:  { id: "defend",  name: "招架", cost: 1, type: "skill",  target: "none",  desc: "获得 5 点格挡" },
    riposte: { id: "riposte", name: "雁回", cost: 1, type: "skill",  target: "none",  desc: "获得 4 点格挡。本回合内，每次被攻击后，对攻击者造成 5 点伤害。" },

    // ===== 炼气期·剑修可获取 =====
    qingfeng: {
        id: "qingfeng",
        name: "清风",
        cost: 1,
        type: "attack",
        target: "enemy",
        desc: "对目标造成 3 点伤害。本回合每打出一张攻击牌时，额外对目标造成 3 点伤害（所有伤害获得剑意加成）",
    },
    luoxing: {
        id: "luoxing",
        name: "落星",
        cost: 1,
        type: "attack",
        target: "enemy",
        desc: "对目标造成 2 次 5 点伤害",
    },
    guiyuan: {
        id: "guiyuan",
        name: "归元",
        cost: 1,
        type: "attack",
        // UI 目前只有“无目标/单体目标”，群体效果由 cardEffects 结算
        target: "none",
        desc: "对所有敌人造成 12 点伤害，强制结束回合。",
    },
    ningshuang: {
        id: "ningshuang",
        name: "凝霜",
        cost: 2,
        type: "skill",
        target: "none",
        desc: "获得 8 点格挡，获取 2 点剑意。",
    },
};

export function getCardDef(id: CardId) {
    return CARD_DEFS[id];
}
