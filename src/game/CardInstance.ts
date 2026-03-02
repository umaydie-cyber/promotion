import type { CardId } from "../data/cards";

export type CardInstance = {
    defId: CardId;
    // 以后需要“升级/临时变化/随机词条”，就在这里加字段
    // upgrade?: boolean;
};
