import * as Phaser from "phaser";
import { CHARACTERS, type CharacterDef } from "../data/characters";

type CycleCardId = "market" | "travel" | "training" | "bounty";

type CycleCard = {
    id: CycleCardId;
    name: string;
    count: number;
    desc: string;
};

type CycleCardView = {
    card: CycleCard;
    bg: Phaser.GameObjects.Rectangle;
    originX: number;
    originY: number;
};

type CycleSlot = {
    zone: Phaser.GameObjects.Zone;
    bg: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    card?: CycleCard;
    cardView?: CycleCardView;
    deleteBtn?: Phaser.GameObjects.Rectangle;
    deleteText?: Phaser.GameObjects.Text;
};

const STARTER_CYCLE_DECK: CycleCard[] = [
    { id: "market", name: "坊市", count: 1, desc: "获取资源（占位效果）" },
    { id: "travel", name: "游历山河", count: 1, desc: "触发游历事件（占位效果）" },
    { id: "training", name: "历练", count: 2, desc: "获得历练收益（占位效果）" },
    { id: "bounty", name: "悬赏", count: 1, desc: "承接悬赏任务（占位效果）" },
];

export default class CultivationScene extends Phaser.Scene {
    private currentCharacter!: CharacterDef;
    private cycleSlots: CycleSlot[] = [];
    private roundIndex = 0;
    private cycleStageIndex = 0;
    private cycleStageText?: Phaser.GameObjects.Text;

    private readonly cycleStageLabels = ["准备阶段", "阶段一", "阶段二", "阶段三", "阶段四"];

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

        this.add.text(34, 22, "修真界", {
            fontFamily: "serif",
            fontSize: "46px",
            color: "#2b2118",
        });

        this.renderCharacterPanel();

        this.makeButton(this.scale.width - 324, 34, 88, 36, "周期卡组", () => {
            this.showToast(`周期卡组：${STARTER_CYCLE_DECK.map((c) => `${c.name}x${c.count}`).join("、")}`);
        });

        this.makeButton(this.scale.width - 226, 34, 88, 36, "修炼卡组", () => {
            this.showToast("修炼卡组：敬请期待");
        });

        this.makeButton(this.scale.width - 128, 34, 88, 36, "战斗卡组", () => {
            const battleDeck = this.currentCharacter.starterDeck.map((c) => `${c.name}x${c.count}`).join("、");
            this.showToast(`战斗卡组：${battleDeck}`);
        });

        this.add.text(this.scale.width / 2, this.scale.height - 292, "周期卡牌（先拖拽填充周期，再每轮触发）", {
            fontFamily: "serif",
            fontSize: "28px",
            color: "#3a2d21",
        }).setOrigin(0.5);

        this.renderCycleCardsArea();

        this.makeButton(this.scale.width - 178, this.scale.height - 278, 140, 36, "开始修行", () => {
            this.resolveRound();
        });

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
        ink.strokeLineShape(new Phaser.Geom.Line(40, 620, 220, 575));
        ink.strokeLineShape(new Phaser.Geom.Line(220, 575, 470, 625));
        ink.strokeLineShape(new Phaser.Geom.Line(470, 625, 910, 590));

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

        const leftAttrs = [
            `境界：${this.currentCharacter.realm}`,
            "境界进度：炼气 0/300",
            `当前血量：${this.currentCharacter.maxHp}/${this.currentCharacter.maxHp}`,
            "符箓：[_] [_] [_]",
            "丹药：[_] [_] [_]",
            "寿元：50（炼气期）",
            "道心：100/100",
            "灵石：0",
        ];

        this.add.text(48, 140, leftAttrs.join("\n"), {
            fontFamily: "serif",
            fontSize: "18px",
            color: "#3d3125",
            lineSpacing: 6,
        });

        const rightAttrs = ["精力：100/100", "灵力：50/50", "神识：30/30", "道韵：10/10"];
        this.add.text(252, 140, rightAttrs.join("\n"), {
            fontFamily: "serif",
            fontSize: "18px",
            color: "#3d3125",
            lineSpacing: 6,
        });

        this.cycleStageText = this.add.text(252, 275, `周期：${this.cycleStageLabels[this.cycleStageIndex]}`, {
            fontFamily: "serif",
            fontSize: "18px",
            color: "#3d3125",
        });
    }

    private renderCycleCardsArea() {
        const slotW = 150;
        const slotH = 92;
        const slotGap = 14;
        const slotStartX = (this.scale.width - (slotW * 4 + slotGap * 3)) / 2;
        const slotY = this.scale.height - 248;

        this.cycleSlots = [];
        for (let i = 0; i < 4; i++) {
            const x = slotStartX + i * (slotW + slotGap);
            const bg = this.add
                .rectangle(x, slotY, slotW, slotH, 0xf8f3ea, 0.8)
                .setOrigin(0)
                .setStrokeStyle(2, 0x6c5b47, 0.8);
            const label = this.add.text(x + slotW / 2, slotY + slotH / 2, `第${i + 1}轮\n拖入周期卡`, {
                fontFamily: "serif",
                fontSize: "18px",
                color: "#695744",
                align: "center",
            }).setOrigin(0.5);

            const zone = this.add.zone(x, slotY, slotW, slotH).setOrigin(0);
            zone.setRectangleDropZone(slotW, slotH);

            this.cycleSlots.push({ zone, bg, label });
        }

        const cardW = 118;
        const cardH = 138;
        const cardGap = 16;
        const expandedDeck: CycleCard[] = STARTER_CYCLE_DECK.flatMap((card) =>
            Array.from({ length: card.count }, () => ({ ...card, count: 1 })),
        );
        const cardsTotalW = expandedDeck.length * cardW + (expandedDeck.length - 1) * cardGap;
        const startX = (this.scale.width - cardsTotalW) / 2;
        const cardY = this.scale.height - cardH - 22;

        const cycleCardViews: CycleCardView[] = [];

        expandedDeck.forEach((card, idx) => {
            const x = startX + idx * (cardW + cardGap);
            const bg = this.add
                .rectangle(x, cardY, cardW, cardH, 0xf5efe3, 0.98)
                .setOrigin(0)
                .setStrokeStyle(2, 0x4d4033, 0.95)
                .setInteractive({ draggable: true, useHandCursor: true });

            this.add.rectangle(x + 8, cardY + 8, cardW - 16, 44, 0xe0d2bb, 0.58).setOrigin(0);
            this.add.text(x + cardW / 2, cardY + 18, card.name, {
                fontFamily: "serif",
                fontSize: "24px",
                color: "#2e2419",
            }).setOrigin(0.5, 0);

            this.add.text(x + 10, cardY + 66, card.desc, {
                fontFamily: "serif",
                fontSize: "14px",
                color: "#5c4d3f",
                wordWrap: { width: cardW - 20 },
            });

            cycleCardViews.push({ card, bg, originX: x, originY: cardY });
        });

        this.input.on("drag", (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
            const dragTarget = gameObject as Phaser.GameObjects.Rectangle;
            dragTarget.setPosition(dragX, dragY);
        });

        this.input.on(
            "dragend",
            (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
                const dragTarget = gameObject as Phaser.GameObjects.Rectangle;
                const view = cycleCardViews.find((v) => v.bg === dragTarget);
                if (!view) {
                    return;
                }
                if (!dropped) {
                    dragTarget.setPosition(view.originX, view.originY);
                }
            },
        );

        this.input.on(
            "drop",
            (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropZone: Phaser.GameObjects.GameObject) => {
                const dragTarget = gameObject as Phaser.GameObjects.Rectangle;
                const view = cycleCardViews.find((v) => v.bg === dragTarget);
                const slot = this.cycleSlots.find((s) => s.zone === dropZone);
                if (!view || !slot || slot.card) {
                    return;
                }

                slot.card = view.card;
                slot.cardView = view;
                slot.label.setText(`第${this.cycleSlots.indexOf(slot) + 1}轮\n${view.card.name}`);
                slot.bg.setFillStyle(0xe8dcc9, 0.95);

                dragTarget.disableInteractive();
                dragTarget.setVisible(false);

                if (slot.deleteBtn) {
                    slot.deleteBtn.destroy();
                }
                if (slot.deleteText) {
                    slot.deleteText.destroy();
                }

                const deleteBtn = this.add
                    .rectangle(slot.bg.x + slot.bg.width - 12, slot.bg.y + 12, 18, 18, 0x7b2b22, 0.95)
                    .setOrigin(0.5)
                    .setDepth(30)
                    .setStrokeStyle(1, 0xe9d8c0, 0.9)
                    .setInteractive({ useHandCursor: true });

                const deleteText = this.add
                    .text(deleteBtn.x, deleteBtn.y - 1, "×", {
                        fontFamily: "serif",
                        fontSize: "15px",
                        color: "#f8e7d5",
                    })
                    .setOrigin(0.5)
                    .setDepth(31);

                deleteBtn.on("pointerdown", () => {
                    slot.card = undefined;
                    slot.cardView = undefined;
                    slot.label.setText(`第${this.cycleSlots.indexOf(slot) + 1}轮\n拖入周期卡`);
                    slot.bg.setFillStyle(0xf8f3ea, 0.8);

                    view.bg.setPosition(view.originX, view.originY);
                    view.bg.setVisible(true);
                    view.bg.setInteractive({ draggable: true, useHandCursor: true });

                    deleteBtn.destroy();
                    deleteText.destroy();
                    slot.deleteBtn = undefined;
                    slot.deleteText = undefined;
                });

                slot.deleteBtn = deleteBtn;
                slot.deleteText = deleteText;
            },
        );
    }

    private resolveRound() {
        if (!this.cycleSlots.every((slot) => slot.card)) {
            this.showToast("请先拖拽5张周期卡中的4张到周期轮次。");
            return;
        }

        if (this.roundIndex >= 4) {
            this.showToast("本周期4轮已结束，消耗10寿元并进入下一周期（占位逻辑）。");
            this.roundIndex = 0;
            this.cycleStageIndex = 0;
            this.cycleSlots.forEach((slot, idx) => {
                slot.bg.setFillStyle(0xe8dcc9, 0.95);
                slot.label.setText(`第${idx + 1}轮\n${slot.card?.name ?? "拖入周期卡"}`);
            });
            this.updateCycleStageText();
            return;
        }

        const currentSlot = this.cycleSlots[this.roundIndex];
        const cardName = currentSlot.card?.name ?? "未知卡牌";
        this.showToast(`第${this.roundIndex + 1}轮结束，触发周期卡【${cardName}】。`);
        currentSlot.bg.setFillStyle(0xccbba2, 1);
        this.roundIndex += 1;
        this.cycleStageIndex = Math.min(this.roundIndex, this.cycleStageLabels.length - 1);
        this.updateCycleStageText();
    }

    private updateCycleStageText() {
        this.cycleStageText?.setText(`周期：${this.cycleStageLabels[this.cycleStageIndex]}`);
    }

    private makeButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void) {
        const shadow = this.add
            .rectangle(x + 2, y + 3, w, h, 0x1f1811, 0.24)
            .setOrigin(0)
            .setDepth(9);

        const btn = this.add
            .rectangle(x, y, w, h, 0x4b3d2f, 0.94)
            .setOrigin(0)
            .setDepth(10)
            .setStrokeStyle(1, 0x86745f, 0.95)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                btn.setY(y + 1.5);
                shadow.setY(y + 2.5);
                onClick();
            })
            .on("pointerup", () => {
                btn.setY(y);
                shadow.setY(y + 3);
            })
            .on("pointerout", () => {
                btn.setY(y);
                shadow.setY(y + 3);
            });

        const shine = this.add
            .rectangle(x + 4, y + 3, w - 8, h * 0.45, 0xf1e2c8, 0.13)
            .setOrigin(0)
            .setDepth(11);

        const btnText = this.add.text(x + w / 2, y + h / 2, label, {
            fontFamily: "serif",
            fontSize: "15px",
            color: "#f6ecdc",
        }).setOrigin(0.5).setDepth(12);

        const btnBaseY = y;
        const textBaseY = y + h / 2;
        const shineBaseY = y + 3;

        btn.on("pointerover", () => {
            btn.setFillStyle(0x5a4937, 0.98);
            this.tweens.add({
                targets: [btn, btnText, shine],
                y: `-=${1}`,
                duration: 120,
                ease: "Sine.easeOut",
            });
        });

        btn.on("pointerout", () => {
            btn.setFillStyle(0x4b3d2f, 0.94);
            this.tweens.add({
                targets: btn,
                y: btnBaseY,
                duration: 140,
                ease: "Sine.easeOut",
            });
            this.tweens.add({
                targets: btnText,
                y: textBaseY,
                duration: 140,
                ease: "Sine.easeOut",
            });
            this.tweens.add({
                targets: shine,
                y: shineBaseY,
                duration: 140,
                ease: "Sine.easeOut",
            });
        });
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
