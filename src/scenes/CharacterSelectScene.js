import Phaser from "phaser";
import { CHARACTERS } from "../data/characters";
export default class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: "CharacterSelect" });
    }
    create() {
        const c = CHARACTERS[0];
        this.add.text(40, 30, "万世飞升", {
            fontFamily: "sans-serif",
            fontSize: "40px",
            color: "#ffffff",
        });
        this.add.text(40, 90, "选择角色", {
            fontFamily: "sans-serif",
            fontSize: "26px",
            color: "#cbd5e1",
        });
        // 角色卡片框
        const cardX = 40;
        const cardY = 140;
        const w = 420;
        const h = 320;
        const bg = this.add.rectangle(cardX, cardY, w, h, 0x0b1220, 1).setOrigin(0);
        bg.setStrokeStyle(2, 0x334155, 1);
        this.add.text(cardX + 20, cardY + 18, c.name, {
            fontFamily: "sans-serif",
            fontSize: "32px",
            color: "#ffffff",
        });
        this.add.text(cardX + 20, cardY + 60, `初始境界：${c.realm}`, {
            fontFamily: "sans-serif",
            fontSize: "18px",
            color: "#cbd5e1",
        });
        this.add.text(cardX + 20, cardY + 86, `生命：${c.maxHp}   灵力：${c.energy}`, {
            fontFamily: "sans-serif",
            fontSize: "18px",
            color: "#cbd5e1",
        });
        this.add.text(cardX + 20, cardY + 130, "初始卡组：", {
            fontFamily: "sans-serif",
            fontSize: "18px",
            color: "#ffffff",
        });
        const deckLines = c.starterDeck.map((it) => `${it.name} x${it.count}`);
        this.add.text(cardX + 40, cardY + 160, deckLines.join("\n"), {
            fontFamily: "sans-serif",
            fontSize: "18px",
            color: "#e2e8f0",
            lineSpacing: 8,
        });
        // 开始按钮
        const btn = this.add
            .rectangle(520, 360, 340, 64, 0x2563eb, 1)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
            this.scene.start("Battle");
        });
        this.add.text(520, 360, "开始修行", {
            fontFamily: "sans-serif",
            fontSize: "26px",
            color: "#ffffff",
        }).setOrigin(0.5);
        this.add.text(520, 420, "（MVP：先进入事件界面）", {
            fontFamily: "sans-serif",
            fontSize: "14px",
            color: "#94a3b8",
        }).setOrigin(0.5);
    }
}
