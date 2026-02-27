import * as Phaser from "phaser";

type CardViewModel = {
    name: string;
    cost: number;
    desc: string;
    level: string;
    playable: boolean;
};

export class CardView extends Phaser.GameObjects.Container {
    private bg: Phaser.GameObjects.Rectangle;
    private hitZone: Phaser.GameObjects.Zone;

    private costBadge: Phaser.GameObjects.Ellipse;
    private costText: Phaser.GameObjects.Text;
    private nameText: Phaser.GameObjects.Text;
    private descText: Phaser.GameObjects.Text;
    private levelText: Phaser.GameObjects.Text;
    private disabledMask: Phaser.GameObjects.Rectangle;

    private baseX: number;
    private baseY: number;
    private baseDepth = 0;
    private isHovering = false;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        private cardW: number = 120,
        private cardH: number = 170
    ) {
        super(scene, x, y);
        scene.add.existing(this);

        this.baseX = x;
        this.baseY = y;

        const w = this.cardW;
        const h = this.cardH;

        // ✅ 1) 命中层：用 Zone 做 hit test（稳定，不会出现“整体左偏半宽”）
        this.hitZone = scene.add.zone(0, 0, w, h).setOrigin(0.5);
        this.hitZone.setInteractive({ useHandCursor: true });

        // ✅ 把 Zone 的事件转发给 CardView（BattleScene 仍然监听 v.on(...)）
        this.hitZone.on("pointerover", () => this.emit("pointerover"));
        this.hitZone.on("pointerout", () => this.emit("pointerout"));
        this.hitZone.on("pointerdown", (p: Phaser.Input.Pointer) => this.emit("pointerdown", p));

        // 背景（纯视觉，不做交互）
        this.bg = scene.add.rectangle(0, 0, w, h, 0x0f172a, 1).setOrigin(0.5);
        this.bg.setStrokeStyle(2, 0x334155, 1);

        // 费用徽章
        this.costBadge = scene.add.ellipse(-w / 2 + 18, -h / 2 + 18, 26, 26, 0x2563eb, 1);
        this.costText = scene.add
            .text(-w / 2 + 18, -h / 2 + 18, "1", {
                fontFamily: "sans-serif",
                fontSize: "16px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // 标题
        this.nameText = scene.add
            .text(0, -h / 2 + 10, "卡牌名", {
                fontFamily: "sans-serif",
                fontSize: "18px",
                color: "#ffffff",
            })
            .setOrigin(0.5, 0);

        // 插画占位
        const art = scene.add.rectangle(0, -10, w - 24, 60, 0x0b1220, 1).setOrigin(0.5);
        art.setStrokeStyle(2, 0x1f2937, 1);

        // 描述
        this.descText = scene.add
            .text(-w / 2 + 14, 40, "描述", {
                fontFamily: "sans-serif",
                fontSize: "14px",
                color: "#cbd5e1",
                wordWrap: { width: w - 28 },
            })
            .setOrigin(0, 0);

        // 等级
        this.levelText = scene.add
            .text(w / 2 - 10, h / 2 - 10, "入门", {
                fontFamily: "sans-serif",
                fontSize: "14px",
                color: "#94a3b8",
            })
            .setOrigin(1, 1);

        // 不可用遮罩
        this.disabledMask = scene.add.rectangle(0, 0, w, h, 0x000000, 0.35).setOrigin(0.5);
        this.disabledMask.setVisible(false);

        // ✅ hitZone 必须在最底层（否则会挡住视觉没问题，但这里我们放最底）
        this.add([
            this.hitZone,
            this.bg,
            this.costBadge,
            this.costText,
            this.nameText,
            art,
            this.descText,
            this.levelText,
            this.disabledMask,
        ]);

        // 让 CardView 自己也能做 hover 动画（BattleScene 也可以统一控制）
        this.on("pointerover", () => this.forceHoverOn());
        this.on("pointerout", () => this.forceHoverOff());
    }

    setBaseDepth(d: number) {
        this.baseDepth = d;
        this.setDepth(d);
    }

    setBasePos(x: number, y: number) {
        this.baseX = x;
        this.baseY = y;
        if (!this.isHovering) {
            this.setPosition(x, y);
        }
    }

    setModel(m: CardViewModel) {
        this.nameText.setText(m.name);
        this.costText.setText(String(m.cost));
        this.descText.setText(m.desc);
        this.levelText.setText(m.level);

        this.disabledMask.setVisible(!m.playable);
        this.bg.setStrokeStyle(2, m.playable ? 0x93c5fd : 0x334155, 1);
    }

    forceHoverOn() {
        if (this.isHovering) return;
        this.isHovering = true;

        this.scene.tweens.killTweensOf(this);
        this.setDepth(this.baseDepth + 1000);

        this.scene.tweens.add({
            targets: this,
            x: this.baseX,
            y: this.baseY - 22,
            scale: 1.06,
            duration: 110,
            ease: "Quad.Out",
        });
    }

    forceHoverOff() {
        if (!this.isHovering) return;
        this.isHovering = false;

        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            x: this.baseX,
            y: this.baseY,
            scale: 1,
            duration: 130,
            ease: "Quad.Out",
            onComplete: () => this.setDepth(this.baseDepth),
        });
    }

    immediateReset() {
        this.scene.tweens.killTweensOf(this);
        this.isHovering = false;
        this.setDepth(this.baseDepth);
        this.setScale(1);
        this.setPosition(this.baseX, this.baseY);
    }

    snapToBaseIfNeeded() {
        if (this.isHovering) return;
        if (Math.abs(this.x - this.baseX) > 0.5 || Math.abs(this.y - this.baseY) > 0.5) {
            this.setPosition(this.baseX, this.baseY);
        }
    }
}
