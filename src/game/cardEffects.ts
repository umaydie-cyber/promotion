import { getCardDef } from "../data/cards";

/**
 * 战斗中“打出卡牌”的效果结算（把逻辑从 BattleScene 里拆出来）。
 *
 * 注意：为了兼容较老的 TS（不支持 `import { type X }` / `import type`），
 * 这里不强依赖 CardId 的类型导入，BattleScene 传进来的 cardId 只要能被 getCardDef 识别即可。
 */

export type CardPlayContext<EnemyId extends string> = {
    spendEnergy: (n: number) => void;
    gainBlock: (n: number) => void;
    gainSwordIntent: (n: number) => void; // 剑意：每次造成伤害 +x

    /**
     * 对单个敌人造成一次伤害。
     * 伤害是否吃“剑意加成”由 BattleScene 的实现决定（建议在 BattleScene 统一加成）。
     */
    dealDamage: (enemyId: EnemyId, amount: number) => void;

    /** 对所有敌人造成一次伤害（同样由 BattleScene 决定是否吃剑意） */
    dealDamageToAll: (amount: number) => void;

    /** 雁回：本回合内，每次被攻击后对攻击者造成 damage 点伤害 */
    setRiposteThisTurn: (damage: number) => void;

    /** 清风：本回合内，每打出一张攻击牌时，对该攻击牌目标额外造成 damage 点伤害 */
    setAttackBonusThisTurn: (damage: number) => void;

    /** 归元：强制结束回合 */
    forceEndTurn: () => void;

    log?: (msg: string) => void;
};

export function playCard<EnemyId extends string>(
    cardId: any,
    ctx: CardPlayContext<EnemyId>,
    targetId?: EnemyId
) {
    const def = getCardDef(cardId as any);

    // 费用统一在这里扣（BattleScene 只做“够不够能量”的校验）
    ctx.spendEnergy(def.cost);

    switch (def.id) {
        case "strike": {
            if (!targetId) throw new Error("strike requires a target");
            ctx.dealDamage(targetId, 6);
            ctx.log?.(`你使用【挥砍】造成 6 伤害。`);
            break;
        }
        case "defend": {
            ctx.gainBlock(5);
            ctx.log?.(`你使用【招架】获得 5 格挡。`);
            break;
        }
        case "riposte": {
            ctx.gainBlock(4);
            ctx.setRiposteThisTurn(5);
            ctx.log?.(`你使用【雁回】获得 4 格挡，本回合受到攻击后将反击。`);
            break;
        }

        // ===== 炼气期·剑修可获取 =====
        case "qingfeng": {
            if (!targetId) throw new Error("qingfeng requires a target");
            ctx.dealDamage(targetId, 3);
            ctx.setAttackBonusThisTurn(3);
            ctx.log?.(`你使出【清风】造成 3 伤害，本回合攻击牌将追加伤害。`);
            break;
        }
        case "luoxing": {
            if (!targetId) throw new Error("luoxing requires a target");
            ctx.dealDamage(targetId, 5);
            ctx.dealDamage(targetId, 5);
            ctx.log?.(`你使出【落星】造成 2 次 5 伤害。`);
            break;
        }
        case "guiyuan": {
            ctx.dealDamageToAll(12);
            ctx.log?.(`你使出【归元】对所有敌人造成 12 伤害，并强制结束回合。`);
            ctx.forceEndTurn();
            break;
        }
        case "ningshuang": {
            ctx.gainBlock(8);
            ctx.gainSwordIntent(2);
            ctx.log?.(`你运起【凝霜】获得 8 格挡，并获得 2 点剑意。`);
            break;
        }
        default: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _unknown: never = def.id as never;
            break;
        }
    }
}
