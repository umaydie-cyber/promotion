export type CardId = "strike" | "defend" | "riposte";
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

    // ✅ 新牌：还击
    riposte: { id: "riposte", name: "还击", cost: 1, type: "skill",  target: "none",  desc: "获得 4 点格挡。本回合内，每次被攻击后，对攻击者造成 6 点伤害。" },
};

export function getCardDef(id: CardId) {
    return CARD_DEFS[id];
}
