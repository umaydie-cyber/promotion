import Phaser from "phaser";
import { CHARACTERS } from "../data/characters";
export default class EventScene extends Phaser.Scene {
    step = 1;
    constructor() {
        super({ key: "Event" });
    }
    init(data) {
        const c = CHARACTERS.find((x) => x.id === data.characterId);
        // 你后面会把 runState 放到一个全局对象里，这里先简化
        this.registry.set("character", c);
        this.step = 1;
    }
    create() {
        const c = this.registry.get("character");
        this.add.text(40, 30, `境界：${c.realm}`, {
            fontFamily: "sans-serif",
            fontSize: "24px",
            color: "#ffffff",
        });
        const stepText = this.add.text(40, 70, `本境界事件：${this.step}/20`, {
            fontFamily: "sans-serif",
            fontSize: "18px",
            color: "#cbd5e1",
        });
        this.add.text(40, 120, "事件（占位）：「坊市摊位」", {
            fontFamily: "sans-serif",
            fontSize: "22px",
            color: "#ffffff",
        });
        const optA = this.makeOption(40, 180, "A：删 1 张牌（占位）");
        const optB = this.makeOption(40, 260, "B：升级 1 张牌（占位）");
        const onPick = () => {
            this.step++;
            if (this.step > 20) {
                // 先占位：未来这里跳 Boss 战
                this.scene.start("CharacterSelect");
                return;
            }
            stepText.setText(`本境界事件：${this.step}/20`);
        };
        optA.on("pointerdown", onPick);
        optB.on("pointerdown", onPick);
    }
    makeOption(x, y, label) {
        const w = 520;
        const h = 56;
        const box = this.add
            .rectangle(x, y, w, h, 0x0f172a, 1)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true });
        box.setStrokeStyle(2, 0x334155, 1);
        this.add.text(x + 18, y + 14, label, {
            fontFamily: "sans-serif",
            fontSize: "18px",
            color: "#e2e8f0",
        });
        return box;
    }
}
