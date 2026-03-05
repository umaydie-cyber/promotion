import * as Phaser from "phaser";
import { CHARACTERS, type CharacterDef } from "../data/characters";

type CultivationCard = {
    id: "market" | "qi" | "comprehend" | "travel" | "daoHeart";
    name: string;
    count: number;
    desc: string;
};

const STARTER_CULTIVATION_DECK: CultivationCard[] = [
    { id: "market", name: "坊市", count: 1, desc: "获取资源（占位效果）" },
    { id: "qi", name: "引气入体", count: 5, desc: "提升修为进度（占位效果）" },
    { id: "comprehend", name: "参悟功法", count: 1, desc: "悟性相关收益（占位效果）" },
    { id: "travel", name: "游历山河", count: 1, desc: "打出后进入事件" },
    { id: "daoHeart", name: "问心", count: 1, desc: "稳定道心（占位效果）" },
];

export default class CultivationScene extends Phaser.Scene {
    private currentCharacter!: CharacterDef;

    constructor() {
        super({ key: "Cultivation" });
    }

    init(data: { characterId?: string }) {
        const picked = CHARACTERS.find((x) => x.id === data.characterId) ?? CHARACTERS[0];
        this.currentCharacter = picked;
        this.registry.set("character", picked);
    }

    create() {
        this.cameras.main.setBackgroundColor("#0f172a");

        this.add.text(28, 22, "修仙界", {
            fontFamily: "sans-serif",
            fontSize: "40px",
            color: "#f8fafc",
        });

        this.add.text(30, 78, `角色：${this.currentCharacter.name}`, {
            fontFamily: "sans-serif",
            fontSize: "18px",
            color: "#cbd5e1",
        });

        const attrs = [
            `境界：${this.currentCharacter.realm}`,
            "境界进度：炼气 0/300",
            `当前血量：${this.currentCharacter.maxHp}/${this.currentCharacter.maxHp}`,
            "符箓：[_] [_] [_]",
            "丹药：[_] [_] [_]",
            "精力：100/100",
            "寿命：70",
            "道心：100/100",
            "正邪值：0",
            "灵石：0",
        ];

        const statPanel = this.add.rectangle(30, 118, 430, 290, 0x111827, 1).setOrigin(0);
        statPanel.setStrokeStyle(2, 0x334155, 1);

        this.add.text(48, 136, attrs.join("\n"), {
            fontFamily: "sans-serif",
            fontSize: "20px",
            color: "#e2e8f0",
            lineSpacing: 8,
        });

        this.makeButton(520, 120, 190, 52, "修炼卡组", () => {
            this.showToast(`修炼卡组：${STARTER_CULTIVATION_DECK.map((c) => `${c.name}x${c.count}`).join("、")}`);
        });

        this.makeButton(730, 120, 190, 52, "战斗卡组", () => {
            const battleDeck = this.currentCharacter.starterDeck.map((c) => `${c.name}x${c.count}`).join("、");
            this.showToast(`战斗卡组：${battleDeck}`);
        });

        this.add.text(520, 195, "修炼卡牌区（点击卡牌打出）", {
            fontFamily: "sans-serif",
            fontSize: "24px",
            color: "#f8fafc",
        });

        this.renderCultivationCards();

        this.add
            .text(this.scale.width - 18, 12, "⛶", { fontSize: "22px", color: "#ffffff" })
            .setOrigin(1, 0)
            .setDepth(999)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                if (this.scale.isFullscreen) this.scale.stopFullscreen();
                else this.scale.startFullscreen();
            });
    }

    private renderCultivationCards() {
        const cardW = 170;
        const cardH = 140;
        const startX = 520;
        const startY = 240;
        const gap = 14;

        STARTER_CULTIVATION_DECK.forEach((card, idx) => {
            const x = startX + (idx % 2) * (cardW + gap);
            const y = startY + Math.floor(idx / 2) * (cardH + gap);

            const bg = this.add
                .rectangle(x, y, cardW, cardH, 0x1e293b, 1)
                .setOrigin(0)
                .setStrokeStyle(2, 0x64748b, 1)
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", () => this.playCultivationCard(card));

            this.add.text(x + 10, y + 10, `${card.name} x${card.count}`, {
                fontFamily: "sans-serif",
                fontSize: "22px",
                color: "#ffffff",
            });

            this.add.text(x + 10, y + 48, card.desc, {
                fontFamily: "sans-serif",
                fontSize: "16px",
                color: "#cbd5e1",
                wordWrap: { width: cardW - 20 },
            });

            bg.on("pointerover", () => bg.setFillStyle(0x334155, 1));
            bg.on("pointerout", () => bg.setFillStyle(0x1e293b, 1));
        });
    }

    private playCultivationCard(card: CultivationCard) {
        if (card.id === "travel") {
            this.scene.start("Event", { characterId: this.currentCharacter.id });
            return;
        }
        this.showToast(`打出【${card.name}】：${card.desc}`);
    }

    private makeButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void) {
        const btn = this.add
            .rectangle(x, y, w, h, 0x2563eb, 1)
            .setOrigin(0)
            .setStrokeStyle(2, 0x93c5fd, 1)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", onClick);

        this.add.text(x + w / 2, y + h / 2, label, {
            fontFamily: "sans-serif",
            fontSize: "24px",
            color: "#ffffff",
        }).setOrigin(0.5);

        btn.on("pointerover", () => btn.setFillStyle(0x1d4ed8, 1));
        btn.on("pointerout", () => btn.setFillStyle(0x2563eb, 1));
    }

    private showToast(msg: string) {
        const toast = this.add
            .text(this.scale.width / 2, this.scale.height - 44, msg, {
                fontFamily: "sans-serif",
                fontSize: "16px",
                color: "#f8fafc",
                backgroundColor: "#0b1220",
                padding: { x: 10, y: 6 },
            })
            .setOrigin(0.5)
            .setDepth(2000);

        this.time.delayedCall(1500, () => toast.destroy());
    }
}
