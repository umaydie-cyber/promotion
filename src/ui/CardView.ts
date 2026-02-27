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
    private costBadge: Phaser.GameObjects.Ellipse;
    private costText: Phaser.GameObjects.Text;
    private nameText: Phaser.GameObjects.Text;
    private descText: Phaser.GameObjects.Text;
    private levelText: Phaser.GameObjects.Text;
    private disabledMask: Phaser.GameObjects.Rectangle;

    private baseY: number;
    private baseX: number;
    private isHovering = false;
    private baseDepth: number = 0;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        private cardW: number = 120,
        private cardH: number = 170
    ) {
        super(scene, x, y);
        scene.add.existing(this);

        this.baseY = y;
        this.baseX = x;

        const w = this.cardW;
        const h = this.cardH;

        this.bg = scene.add.rectangle(0, 0, w, h, 0x0f172a, 1).setOrigin(0.5);
        this.bg.setStrokeStyle(2, 0x334155, 1);

        this.costBadge = scene.add.ellipse(-w / 2 + 18, -h / 2 + 18, 26, 26, 0x2563eb, 1);
        this.costText = scene.add
            .text(-w / 2 + 18, -h / 2 + 18, "1", {
                fontFamily: "sans-serif",
                fontSize: "16px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.nameText = scene.add
            .text(0, -h / 2 + 10, "卡牌名", {
                fontFamily: "sans-serif",
                fontSize: "18px",
                color: "#ffffff",
            })
            .setOrigin(0.5, 0);

        const art = scene.add.rectangle(0, -10, w - 24, 60, 0x0b1220, 1).setOrigin(0.5);
        art.setStrokeStyle(2, 0x1f2937, 1);

        this.descText = scene.add
            .text(-w / 2 + 14, 40, "描述", {
                fontFamily: "sans-serif",
                fontSize: "14px",
                color: "#cbd5e1",
                wordWrap: { width: w - 28 },
            })
            .setOrigin(0, 0);

        this.levelText = scene.add
            .text(w / 2 - 10, h / 2 - 10, "入门", {
                fontFamily: "sans-serif",
                fontSize: "14px",
                color: "#94a3b8",
            })
            .setOrigin(1, 1);

        this.disabledMask = scene.add.rectangle(0, 0, w, h, 0x000000, 0.35).setOrigin(0.5);
        this.disabledMask.setVisible(false);

        this.add([this.bg, this.costBadge, this.costText, this.nameText, art, this.descText, this.levelText, this.disabledMask]);

        // ✅ 命中区域覆盖整卡
        this.setSize(w, h);
        this.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

        this.on("pointerover", () => this.hoverOn());
        this.on("pointerout", () => this.hoverOff());
    }

    /** BattleScene 创建后调用：给每张牌设置基础层级，hover 时会在此基础上抬高 */
    setBaseDepth(d: number) {
        this.baseDepth = d;
        this.setDepth(d);
    }

    /** BattleScene 重排卡牌 y 时调用 */
    setBaseY(y: number) {
        this.baseY = y;
        // 如果不在 hover 状态，立即贴合
        if (this.scale === 1) this.y = y;
    }

    setModel(m: CardViewModel) {
        this.nameText.setText(m.name);
        this.costText.setText(String(m.cost));
        this.descText.setText(m.desc);
        this.levelText.setText(m.level);

        this.disabledMask.setVisible(!m.playable);
        this.bg.setStrokeStyle(2, m.playable ? 0x93c5fd : 0x334155, 1);
    }

    setBasePos(x: number, y: number) {
        this.baseX = x;
        this.baseY = y;
        if (!this.isHovering) {
            this.x = x;
            this.y = y;
        }
    }

    forceHoverOn() {
        this.isHovering = true;
        this.scene.tweens.killTweensOf(this);
        this.setDepth(this.baseDepth + 1000);
        this.scene.tweens.add({
            targets: this,
            x: this.baseX,
            y: this.baseY - 26,
            scale: 1.08,
            duration: 110,
            ease: "Quad.Out",
        });
    }

    forceHoverOff() {
        this.isHovering = false;
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            x: this.baseX,
            y: this.baseY,
            scale: 1,
            duration: 140,
            ease: "Quad.Out",
            onComplete: () => this.setDepth(this.baseDepth),
        });
    }

    private hoverOn() {
        this.forceHoverOn();
    }

    private hoverOff() {
        this.forceHoverOff();
    }
}
