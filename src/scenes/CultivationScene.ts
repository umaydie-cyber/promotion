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
        this.cameras.main.setBackgroundColor("#f3ede2");
        this.drawInkWashBackground();

        this.add.text(34, 22, "修仙界", {
            fontFamily: "serif",
            fontSize: "46px",
            color: "#2b2118",
        });

        this.renderCharacterPanel();

        this.makeButton(this.scale.width - 226, 34, 88, 36, "修炼卡组", () => {
            this.showToast(`修炼卡组：${STARTER_CULTIVATION_DECK.map((c) => `${c.name}x${c.count}`).join("、")}`);
        });

        this.makeButton(this.scale.width - 126, 34, 88, 36, "战斗卡组", () => {
            const battleDeck = this.currentCharacter.starterDeck.map((c) => `${c.name}x${c.count}`).join("、");
            this.showToast(`战斗卡组：${battleDeck}`);
        });

        this.add.text(this.scale.width / 2, this.scale.height - 274, "可用修炼卡牌", {
            fontFamily: "serif",
            fontSize: "30px",
            color: "#3a2d21",
        }).setOrigin(0.5);

        this.renderCultivationCards();

        this.add
            .text(this.scale.width - 18, 12, "⛶", { fontSize: "22px", color: "#3a2d21" })
            .setOrigin(1, 0)
            .setDepth(999)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                if (this.scale.isFullscreen) this.scale.stopFullscreen();
                else this.scale.startFullscreen();
            });
    }

    private drawInkWashBackground() {
        const ink = this.add.graphics().setDepth(-10);
        ink.fillStyle(0xb9ad98, 0.25);
        ink.fillCircle(190, 128, 140);
        ink.fillCircle(770, 180, 170);
        ink.fillCircle(460, 542, 220);

        ink.lineStyle(3, 0x3f3328, 0.18);
        ink.beginPath();
        ink.moveTo(40, 620);
        ink.lineTo(220, 575);
        ink.lineTo(470, 625);
        ink.lineTo(910, 590);
        ink.strokePath();

        const texture = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xe9e0d0, 0.32).setOrigin(0);
        texture.setDepth(-20);
    }

    private renderCharacterPanel() {
        const panel = this.add.rectangle(30, 88, 430, 282, 0xf7f0e5, 0.92).setOrigin(0);
        panel.setStrokeStyle(2, 0x5a4b3a, 0.8);

        this.add.text(48, 104, `人物：${this.currentCharacter.name}`, {
            fontFamily: "serif",
            fontSize: "22px",
            color: "#2f2419",
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

        this.add.text(48, 140, attrs.join("\n"), {
            fontFamily: "serif",
            fontSize: "19px",
            color: "#3d3125",
            lineSpacing: 8,
        });
    }

    private renderCultivationCards() {
        const cardW = 138;
        const cardH = 188;
        const gap = 14;
        const totalW = STARTER_CULTIVATION_DECK.length * cardW + (STARTER_CULTIVATION_DECK.length - 1) * gap;
        const startX = (this.scale.width - totalW) / 2;
        const y = this.scale.height - cardH - 34;

        STARTER_CULTIVATION_DECK.forEach((card, idx) => {
            const x = startX + idx * (cardW + gap);

            const cardBg = this.add
                .rectangle(x, y, cardW, cardH, 0xf5efe3, 0.98)
                .setOrigin(0)
                .setStrokeStyle(2, 0x4d4033, 0.95)
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", () => this.playCultivationCard(card));

            this.add.rectangle(x + 9, y + 9, cardW - 18, 66, 0xe0d2bb, 0.58).setOrigin(0);

            this.add
                .ellipse(x + 20, y + 20, 28, 28, 0x58493b, 1)
                .setStrokeStyle(1, 0x2b2219, 1);

            this.add.text(x + 20, y + 20, `${card.count}`, {
                fontFamily: "serif",
                fontSize: "17px",
                color: "#f8f2e8",
            }).setOrigin(0.5);

            this.add.text(x + cardW / 2, y + 85, card.name, {
                fontFamily: "serif",
                fontSize: "25px",
                color: "#2e2419",
            }).setOrigin(0.5, 0);

            this.add.text(x + 12, y + 122, card.desc, {
                fontFamily: "serif",
                fontSize: "14px",
                color: "#5c4d3f",
                wordWrap: { width: cardW - 24 },
            });

            this.add.text(x + cardW - 10, y + cardH - 9, "修炼", {
                fontFamily: "serif",
                fontSize: "13px",
                color: "#756556",
            }).setOrigin(1, 1);

            cardBg.on("pointerover", () => cardBg.setFillStyle(0xede0ca, 1));
            cardBg.on("pointerout", () => cardBg.setFillStyle(0xf5efe3, 0.98));
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
            .rectangle(x, y, w, h, 0x3f3326, 0.95)
            .setOrigin(0)
            .setStrokeStyle(1, 0x6f5f4d, 1)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", onClick);

        this.add.text(x + w / 2, y + h / 2, label, {
            fontFamily: "serif",
            fontSize: "15px",
            color: "#f6ecdc",
        }).setOrigin(0.5);

        btn.on("pointerover", () => btn.setFillStyle(0x5a4937, 1));
        btn.on("pointerout", () => btn.setFillStyle(0x3f3326, 0.95));
    }

    private showToast(msg: string) {
        const toast = this.add
            .text(this.scale.width / 2, this.scale.height - 42, msg, {
                fontFamily: "serif",
                fontSize: "16px",
                color: "#f9f3e8",
                backgroundColor: "#33281d",
                padding: { x: 10, y: 6 },
            })
            .setOrigin(0.5)
            .setDepth(2000);

        this.time.delayedCall(1500, () => toast.destroy());
    }
}
