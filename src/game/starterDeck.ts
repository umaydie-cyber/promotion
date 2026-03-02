import type { CharacterDef } from "../data/characters";
import type { CardId } from "../data/cards";
import { getCardDef } from "../data/cards";
import type { CardInstance } from "./CardInstance";

/**
 * 由角色配置（data/characters.ts）生成“初始卡组”（一堆 CardInstance）。
 * - CardInstance 只保存 defId，真正的卡牌定义在 data/cards.ts
 * - 这样 BattleScene 不需要写死 5 挥砍/5 招架/1 还击
 */
export function buildStarterDeck(c: CharacterDef): CardInstance[] {
    const out: CardInstance[] = [];

    for (const it of c.starterDeck) {
        // 运行时校验：避免写错 id
        const id = it.id as CardId;
        if (!getCardDef(id)) throw new Error(`Unknown card id in starterDeck: ${it.id}`);

        for (let i = 0; i < it.count; i++) out.push({ defId: id });
    }

    return out;
}
