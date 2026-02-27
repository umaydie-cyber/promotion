export type Realm = "炼气" | "筑基" | "金丹" | "元婴" | "化神";

export type CharacterId = "swordsman";

export interface StarterCard {
    id: string;
    name: string;
    count: number;
}

export interface CharacterDef {
    id: CharacterId;
    name: string;
    realm: Realm;
    maxHp: number;
    energy: number;
    starterDeck: StarterCard[];
}

export const CHARACTERS: CharacterDef[] = [
    {
        id: "swordsman",
        name: "剑修",
        realm: "炼气",
        maxHp: 120,
        energy: 3,
        starterDeck: [
            { id: "strike", name: "挥砍", count: 5 },
            { id: "defend", name: "招架", count: 5 },
            { id: "riposte", name: "还击", count: 1 },
        ],
    },
];
