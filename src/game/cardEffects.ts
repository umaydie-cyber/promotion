import { getCardDef, type CardId } from "../data/cards";

/**
 * 战斗中“打出卡牌”的效果结算。
 * - 卡牌数据（名称/费用/描述/目标等）在 data/cards.ts
 * - 这里放“效果逻辑”，避免写死在 BattleScene 里
 */

export type CardPlayContext<EnemyId extends string> = {
    spendEnergy: (n: number) => void;
    gainBlock: (n: number) => void;
    dealDamage: (enemyId: EnemyId, amount: number) => void;

    /**
     * 还击：本回合内，每次被攻击后对攻击者造成 damage 点伤害
     *（BattleScene 负责在受到攻击时触发）
     */
    setRiposteThisTurn: (damage: number) => void;

    log?: (msg: string) => void;
};

export function playCard<EnemyId extends string>(
    cardId: CardId,
    ctx: CardPlayContext<EnemyId>,
    targetId?: EnemyId
) {
    const def = getCardDef(cardId);

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
            // 设计：先给格挡，再启用本回合“还击”效果
            ctx.gainBlock(4);
            ctx.setRiposteThisTurn(6);
            ctx.log?.(`你使用【还击】获得 4 格挡，本回合受到攻击后将反击。`);
            break;
        }
        default: {
            // TS 穷举保护
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _exhaustive: never = def.id;
            break;
        }
    }
}
