import Phaser from "phaser";
export class CardView extends Phaser.GameObjects.Container {
    w;
    h;
    bg;
    costBadge;
    costText;
    nameText;
    descText;
    levelText;
    disabledMask;
    baseY;
    constructor(scene, x, y, w = 120, h = 170) {
        super(scene, x, y);
        this.w = w;
        this.h = h;
        scene.add.existing(this);
        this.baseY = y;
        this.bg = scene.add.rectangle(0, 0, w, h, 0x0f172a, 1).setOrigin(0.5);
        this.bg.setStrokeStyle(2, 0x334155, 1);
        // 费用徽章
        this.costBadge = scene.add.ellipse(-w / 2 + 18, -h / 2 + 18, 26, 26, 0x2563eb, 1);
        this.costText = scene.add.text(-w / 2 + 18, -h / 2 + 18, "1", {
            fontFamily: "sans-serif",
            fontSize: "16px",
            color: "#ffffff",
        }).setOrigin(0.5);
        this.nameText = scene.add.text(0, -h / 2 + 10, "卡牌名", {
            fontFamily: "sans-serif",
            fontSize: "16px",
            color: "#ffffff",
        }).setOrigin(0.5, 0);
        // 插画占位
        const art = scene.add.rectangle(0, -10, w - 16, 60, 0x111827, 1).setOrigin(0.5);
        art.setStrokeStyle(1, 0x334155, 1);
        this.descText = scene.add.text(-w / 2 + 10, 35, "描述", {
            fontFamily: "sans-serif",
            fontSize: "12px",
            color: "#cbd5e1",
            wordWrap: { width: w - 20 },
            lineSpacing: 4,
        }).setOrigin(0, 0);
        this.levelText = scene.add.text(w / 2 - 8, h / 2 - 10, "入门", {
            fontFamily: "sans-serif",
            fontSize: "11px",
            color: "#94a3b8",
        }).setOrigin(1, 1);
        this.disabledMask = scene.add.rectangle(0, 0, w, h, 0x000000, 0.45).setOrigin(0.5);
        this.disabledMask.setVisible(false);
        this.add([
            this.bg,
            this.costBadge,
            this.costText,
            this.nameText,
            art,
            this.descText,
            this.levelText,
            this.disabledMask,
        ]);
        // 交互区域
        this.setSize(w, h);
        this.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
        // hover 动效
        this.on("pointerover", () => this.hoverOn());
        this.on("pointerout", () => this.hoverOff());
    }
    setModel(m) {
        this.nameText.setText(m.name);
        this.costText.setText(String(m.cost));
        this.descText.setText(m.desc);
        this.levelText.setText(m.level);
        // 是否可出
        this.disabledMask.setVisible(!m.playable);
        // 描边提示
        if (m.playable) {
            this.bg.setStrokeStyle(2, 0x93c5fd, 1); // 亮蓝
        }
        else {
            this.bg.setStrokeStyle(2, 0x334155, 1); // 灰
        }
    }
    hoverOn() {
        this.scene.tweens.add({
            targets: this,
            y: this.baseY - 18,
            scale: 1.15,
            duration: 90,
            ease: "Quad.Out",
        });
    }
    hoverOff() {
        this.scene.tweens.add({
            targets: this,
            y: this.baseY,
            scale: 1,
            duration: 90,
            ease: "Quad.Out",
        });
    }
}
