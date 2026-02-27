import * as Phaser from "phaser";
import { CardView } from "../ui/CardView";

type CardId = "strike" | "defend";
type CardType = "attack" | "skill";

type Card = {
    id: CardId;
    name: string;
    cost: number;
    type: CardType;
    desc: string;
};

const CARD_DEFS: Record<CardId, Card> = {
    strike: { id: "strike", name: "挥砍", cost: 1, type: "attack", desc: "对单体造成 6 点伤害（需要选目标）" },
    defend: { id: "defend", name: "招架", cost: 1, type: "skill", desc: "获得 5 点格挡" },
};

type CardInstance = { defId: CardId };

type EnemyId = "wolfA" | "wolfB";
type Enemy = {
    id: EnemyId;
    name: string;
    hp: number;
    maxHp: number;
    intentDamage: number;
};

function shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super("Battle");
    }

    // ======== 常量（布局用） ========
    private readonly cardW = 120;
    private readonly cardH = 170;
    private readonly cardGapMax = 18;
    private readonly rightPanelW = 280;
    private readonly bottomPadding = 18;

    private hoveredHandIndex: number | null = null;

    // ======== 状态 ========
    private player = {
        hp: 70,
        maxHp: 70,
        block: 0,
        energy: 3,
        maxEnergy: 3,
    };

    private enemies: Enemy[] = [
        { id: "wolfA", name: "赤鳞狼·甲", hp: 40, maxHp: 40, intentDamage: 7 },
        { id: "wolfB", name: "赤鳞狼·乙", hp: 46, maxHp: 46, intentDamage: 9 },
    ];

    private drawPile: CardInstance[] = [];
    private discardPile: CardInstance[] = [];
    private hand: CardInstance[] = [];

    // ======== 战场对象（形状占位） ========
    private playerAvatar?: Phaser.GameObjects.Arc;
    private enemyAvatar: Record<EnemyId, Phaser.GameObjects.Rectangle | undefined> = {
        wolfA: undefined,
        wolfB: undefined,
    };

    // ======== 血条 ========
    private playerHpBar?: Phaser.GameObjects.Graphics;
    private enemyHpBar: Record<EnemyId, Phaser.GameObjects.Graphics | undefined> = {
        wolfA: undefined,
        wolfB: undefined,
    };

    private enemyText: Record<EnemyId, Phaser.GameObjects.Text | undefined> = {
        wolfA: undefined,
        wolfB: undefined,
    };
    private intentText: Record<EnemyId, Phaser.GameObjects.Text | undefined> = {
        wolfA: undefined,
        wolfB: undefined,
    };

    private ui = {
        playerText: null as Phaser.GameObjects.Text | null,
        energyText: null as Phaser.GameObjects.Text | null,
        logText: null as Phaser.GameObjects.Text | null,
        endTurnBtn: null as Phaser.GameObjects.Rectangle | null,
        endTurnText: null as Phaser.GameObjects.Text | null,
        fullscreenText: null as Phaser.GameObjects.Text | null,
    };

    private handViews: CardView[] = [];

    // ======== 选目标模式（核心） ========
    private targetMode:
        | {
        active: true;
        cardIndex: number;
        card: CardInstance;
        arrow: Phaser.GameObjects.Graphics;
        hint: Phaser.GameObjects.Text;
    }
        | { active: false } = { active: false };

    // ======== 生命周期 ========
    create() {
        this.cameras.main.setBackgroundColor("#111827");

        this.setupDeck();
        this.setupUI();
        this.createAvatars();
        this.createEnemyHud();

        this.playerHpBar = this.add.graphics().setDepth(20);
        this.enemyHpBar.wolfA = this.add.graphics().setDepth(20);
        this.enemyHpBar.wolfB = this.add.graphics().setDepth(20);

        this.startPlayerTurn(true);

        this.applyLayout();
        this.scale.on("resize", () => {
            this.applyLayout();
            this.refreshAllUI();
        });

        // update 用来刷新箭头跟随
        this.events.on("update", () => this.updateTargetArrow());

        // 取消选目标：Esc / 右键
        this.input.keyboard?.on("keydown-ESC", () => this.cancelTargetMode());
        this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
            if (p.rightButtonDown()) this.cancelTargetMode();
        });
    }

    // ======== 初始化 ========
    private setupDeck() {
        const deck: CardInstance[] = [];
        for (let i = 0; i < 5; i++) deck.push({ defId: "strike" });
        for (let i = 0; i < 5; i++) deck.push({ defId: "defend" });

        this.drawPile = shuffle(deck);
        this.discardPile = [];
        this.hand = [];
    }

    private setupUI() {
        this.ui.playerText = this.add.text(40, 420, "", {
            fontFamily: "sans-serif",
            fontSize: "20px",
            color: "#ffffff",
        });

        this.ui.energyText = this.add.text(40, 450, "", {
            fontFamily: "sans-serif",
            fontSize: "16px",
            color: "#cbd5e1",
        });

        this.ui.logText = this.add.text(520, 30, "", {
            fontFamily: "sans-serif",
            fontSize: "14px",
            color: "#e2e8f0",
            lineSpacing: 6,
            wordWrap: { width: 420 },
        });

        const btn = this.add
            .rectangle(820, 480, 160, 50, 0x2563eb, 1)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.endPlayerTurn());
        btn.setStrokeStyle(2, 0x93c5fd, 1);

        const btnText = this.add
            .text(820, 480, "结束回合", { fontFamily: "sans-serif", fontSize: "20px", color: "#ffffff" })
            .setOrigin(0.5);

        this.ui.endTurnBtn = btn;
        this.ui.endTurnText = btnText;

        const fs = this.add
            .text(this.scale.width - 10, 10, "⛶", { fontFamily: "sans-serif", fontSize: "22px", color: "#ffffff" })
            .setOrigin(1, 0)
            .setDepth(3000)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                if (this.scale.isFullscreen) this.scale.stopFullscreen();
                else this.scale.startFullscreen();
            });
        this.ui.fullscreenText = fs;
    }

    private createAvatars() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.playerAvatar = this.add.circle(W * 0.2, H * 0.45, 34, 0x22c55e, 1).setDepth(10);
        this.playerAvatar.setStrokeStyle(6, 0x14532d, 1);

        // 两头狼
        this.enemyAvatar.wolfA = this.add.rectangle(W * 0.72, H * 0.26, 80, 70, 0xef4444, 1).setDepth(10);
        this.enemyAvatar.wolfA.setStrokeStyle(6, 0x7f1d1d, 1);

        this.enemyAvatar.wolfB = this.add.rectangle(W * 0.84, H * 0.34, 80, 70, 0xf97316, 1).setDepth(10);
        this.enemyAvatar.wolfB.setStrokeStyle(6, 0x7c2d12, 1);

        // 呼吸/轻抖
        this.tweens.add({
            targets: this.playerAvatar,
            scale: 1.06,
            duration: 560,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });

        this.tweens.add({
            targets: [this.enemyAvatar.wolfA, this.enemyAvatar.wolfB].filter(Boolean) as Phaser.GameObjects.GameObject[],
            angle: 3,
            duration: 320,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });
    }

    private createEnemyHud() {
        // 两头狼各自一套文字
        this.enemyText.wolfA = this.add.text(40, 24, "", { fontFamily: "sans-serif", fontSize: "20px", color: "#ffffff" });
        this.intentText.wolfA = this.add.text(40, 50, "", { fontFamily: "sans-serif", fontSize: "14px", color: "#cbd5e1" });

        this.enemyText.wolfB = this.add.text(40, 86, "", { fontFamily: "sans-serif", fontSize: "20px", color: "#ffffff" });
        this.intentText.wolfB = this.add.text(40, 112, "", { fontFamily: "sans-serif", fontSize: "14px", color: "#cbd5e1" });
    }

    // ======== 布局 ========
    private applyLayout() {
        const W = this.scale.width;
        const H = this.scale.height;

        const handAreaH = this.cardH + 2 * this.bottomPadding + 20;
        const rightPanelX = W - this.rightPanelW / 2;
        const handCenterY = H - handAreaH / 2;

        this.ui.endTurnBtn?.setPosition(rightPanelX, handCenterY);
        this.ui.endTurnText?.setPosition(rightPanelX, handCenterY);

        const playerHudY = H - handAreaH - 80;
        this.ui.playerText?.setPosition(40, playerHudY);
        this.ui.energyText?.setPosition(40, playerHudY + 30);

        this.ui.logText?.setPosition(Math.max(520, Math.floor(W * 0.52)), 24);
        this.ui.fullscreenText?.setPosition(W - 10, 10);

        // 战场区域
        const battlefieldBottom = H - handAreaH;
        const playerY = Math.floor(battlefieldBottom * 0.75);
        const enemyY1 = Math.floor(battlefieldBottom * 0.26);
        const enemyY2 = Math.floor(battlefieldBottom * 0.34);

        this.playerAvatar?.setPosition(Math.floor(W * 0.20), playerY);
        this.enemyAvatar.wolfA?.setPosition(Math.floor(W * 0.72), enemyY1);
        this.enemyAvatar.wolfB?.setPosition(Math.floor(W * 0.84), enemyY2);

        // 血条刷新会用到这些位置
        this.refreshHandUI();
        this.refreshHpBars();
    }

    // ======== 回合 ========
    private startPlayerTurn(isFirstTurn = false) {
        this.player.energy = this.player.maxEnergy;
        this.player.block = 0;

        this.drawToHandSize(5);

        this.log(isFirstTurn ? "战斗开始！你的回合。" : "你的回合。");
        this.refreshAllUI();
    }

    private endPlayerTurn() {
        // 结束回合前取消选目标
        this.cancelTargetMode();

        this.discardPile.push(...this.hand);
        this.hand = [];
        this.refreshHandUI();

        this.log("你结束了回合。敌人行动！");
        this.enemyAct();
    }

    private enemyAct() {
        // 两头狼都攻击一次（简单 demo：顺序攻击）
        for (const e of this.aliveEnemies()) {
            this.applyDamageToPlayer(e.intentDamage);
            e.intentDamage = Phaser.Math.Between(6, 10);
            if (this.player.hp <= 0) break;
        }

        if (this.player.hp <= 0) {
            this.log("你败了（MVP：返回角色选择）");
            this.time.delayedCall(700, () => this.scene.start("CharacterSelect"));
            return;
        }

        this.startPlayerTurn();
    }

    private aliveEnemies() {
        return this.enemies.filter((e) => e.hp > 0);
    }

    // ======== 出牌 ========
    private onCardClicked(indexInHand: number) {
        const inst = this.hand[indexInHand];
        if (!inst) return;

        const def = CARD_DEFS[inst.defId];

        // 能量不够直接提示
        if (this.player.energy < def.cost) {
            this.log("灵力不足！");
            return;
        }

        // ✅ 攻击牌：进入选目标模式
        if (def.type === "attack") {
            this.enterTargetMode(indexInHand, inst);
            return;
        }

        // ✅ 非攻击牌：直接使用
        this.useCardNoTarget(indexInHand);
    }

    private useCardNoTarget(indexInHand: number) {
        const inst = this.hand[indexInHand];
        if (!inst) return;
        const def = CARD_DEFS[inst.defId];
        if (this.player.energy < def.cost) return;

        this.player.energy -= def.cost;

        if (def.id === "defend") {
            this.player.block += 5;
            this.log(`你使用【招架】获得 5 格挡。`);
            if (this.playerAvatar) this.floatText(this.playerAvatar.x, this.playerAvatar.y - 60, `+5 格挡`, "#93c5fd");
        }

        const [used] = this.hand.splice(indexInHand, 1);
        this.discardPile.push(used);

        this.refreshAllUI();
    }

    // ======== 选目标模式 ========
    private enterTargetMode(cardIndex: number, card: CardInstance) {
        this.cancelTargetMode(); // 防止重复进入

        const arrow = this.add.graphics().setDepth(9999);
        const hint = this.add
            .text(this.scale.width / 2, 140, "选择一个目标（点击狼）\nEsc/右键取消", {
                fontFamily: "sans-serif",
                fontSize: "18px",
                color: "#fbbf24",
                align: "center",
                stroke: "#0b1220",
                strokeThickness: 6,
            })
            .setOrigin(0.5)
            .setDepth(9999);

        // 高亮可选敌人：加交互
        for (const e of this.aliveEnemies()) {
            const sprite = this.enemyAvatar[e.id];
            if (!sprite) continue;

            sprite.setInteractive({ useHandCursor: true });
            sprite.once("pointerdown", () => {
                this.confirmTargetAndUse(cardIndex, e.id);
            });

            // 轻微闪光提示
            this.tweens.add({
                targets: sprite,
                alpha: 0.65,
                duration: 220,
                yoyo: true,
                repeat: 2,
            });
        }

        this.targetMode = { active: true, cardIndex, card, arrow, hint };
    }

    private confirmTargetAndUse(cardIndex: number, targetId: EnemyId) {
        if (!this.targetMode.active) return;

        const inst = this.hand[cardIndex];
        if (!inst) {
            this.cancelTargetMode();
            return;
        }
        const def = CARD_DEFS[inst.defId];

        // 二次校验能量
        if (this.player.energy < def.cost) {
            this.log("灵力不足！");
            this.cancelTargetMode();
            return;
        }

        // 结算
        this.player.energy -= def.cost;

        if (def.id === "strike") {
            this.applyDamageToEnemy(targetId, 6);
            this.log(`你使用【挥砍】对 ${this.getEnemy(targetId)?.name ?? "目标"} 造成 6 伤害。`);
        }

        // 移出手牌→弃牌堆
        const [used] = this.hand.splice(cardIndex, 1);
        this.discardPile.push(used);

        // 清理模式（要在刷新 UI 前）
        this.cancelTargetMode(true);

        // 胜利判定：两头都死
        if (this.aliveEnemies().length === 0) {
            this.refreshAllUI();
            this.log("敌人被击败！（MVP：返回事件界面）");
            this.time.delayedCall(700, () => this.scene.start("Event", { characterId: "swordsman" as any }));
            return;
        }

        this.refreshAllUI();
    }

    private cancelTargetMode(silent = false) {
        if (!this.targetMode.active) return;

        // 取消敌人交互
        for (const e of this.enemies) {
            const sprite = this.enemyAvatar[e.id];
            if (!sprite) continue;
            sprite.disableInteractive();
            sprite.setAlpha(1);
            sprite.removeAllListeners("pointerdown");
        }

        this.targetMode.arrow.destroy();
        this.targetMode.hint.destroy();
        this.targetMode = { active: false };

        if (!silent) this.log("取消选目标。");
    }

    private updateTargetArrow() {
        if (!this.targetMode.active) return;

        const arrow = this.targetMode.arrow;
        arrow.clear();

        const fromX = this.playerAvatar?.x ?? 200;
        const fromY = (this.playerAvatar?.y ?? 300) - 20;

        const toX = this.input.activePointer.worldX;
        const toY = this.input.activePointer.worldY;

        // 线
        arrow.lineStyle(6, 0xfbbf24, 1);
        arrow.beginPath();
        arrow.moveTo(fromX, fromY);
        arrow.lineTo(toX, toY);
        arrow.strokePath();

        // 箭头（小三角）
        const ang = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
        const headLen = 18;
        const left = ang + Math.PI * 0.85;
        const right = ang - Math.PI * 0.85;

        arrow.fillStyle(0xfbbf24, 1);
        arrow.beginPath();
        arrow.moveTo(toX, toY);
        arrow.lineTo(toX + Math.cos(left) * headLen, toY + Math.sin(left) * headLen);
        arrow.lineTo(toX + Math.cos(right) * headLen, toY + Math.sin(right) * headLen);
        arrow.closePath();
        arrow.fillPath();
    }

    private getEnemy(id: EnemyId) {
        return this.enemies.find((e) => e.id === id);
    }

    // ======== 抽牌 ========
    private drawToHandSize(size: number) {
        while (this.hand.length < size) {
            const card = this.drawOne();
            if (!card) break;
            this.hand.push(card);
        }
    }

    private drawOne(): CardInstance | null {
        if (this.drawPile.length === 0) {
            if (this.discardPile.length === 0) return null;
            this.drawPile = shuffle(this.discardPile);
            this.discardPile = [];
            this.log("洗牌！");
        }
        return this.drawPile.pop() ?? null;
    }

    // ======== 伤害结算 ========
    private applyDamageToEnemy(enemyId: EnemyId, amount: number) {
        const e = this.getEnemy(enemyId);
        if (!e || e.hp <= 0) return;

        e.hp = Math.max(0, e.hp - amount);

        const avatar = this.enemyAvatar[enemyId];
        this.hitFx(avatar as any);
        if (avatar) this.floatText(avatar.x, avatar.y - 70, `-${amount}`, "#ef4444");

        this.refreshHpBars();
    }

    private applyDamageToPlayer(amount: number) {
        const blocked = Math.min(this.player.block, amount);
        const taken = amount - blocked;

        this.player.block -= blocked;
        this.player.hp = Math.max(0, this.player.hp - taken);

        this.hitFx(this.playerAvatar as any);

        if (this.playerAvatar) {
            if (taken > 0) this.floatText(this.playerAvatar.x, this.playerAvatar.y - 70, `-${taken}`, "#ef4444");
            else if (blocked > 0) this.floatText(this.playerAvatar.x, this.playerAvatar.y - 70, `格挡`, "#93c5fd");
        }

        this.refreshHpBars();
        this.log(
            blocked > 0
                ? `敌人攻击 ${amount}，你格挡了 ${blocked}，受到 ${taken}。`
                : `敌人攻击 ${amount}，你受到 ${taken}。`
        );
    }

    private hitFx(target?: Phaser.GameObjects.GameObject & { x: number; y: number; setAlpha: (a: number) => any }) {
        if (!target) return;

        this.tweens.add({
            targets: target,
            alpha: 0.25,
            duration: 60,
            yoyo: true,
            repeat: 2,
            onComplete: () => target.setAlpha(1),
        });

        const baseX = target.x;
        const baseY = target.y;

        this.tweens.add({
            targets: target,
            x: baseX + 10,
            y: baseY - 6,
            duration: 60,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                target.x = baseX;
                target.y = baseY;
                target.setAlpha(1);
            },
        });
    }

    private floatText(x: number, y: number, text: string, color: string) {
        const t = this.add
            .text(x, y, text, {
                fontFamily: "sans-serif",
                fontSize: "22px",
                color,
                stroke: "#0b1220",
                strokeThickness: 6,
            })
            .setOrigin(0.5)
            .setDepth(9999);

        this.tweens.add({
            targets: t,
            y: y - 30,
            alpha: 0,
            duration: 650,
            ease: "Cubic.Out",
            onComplete: () => t.destroy(),
        });
    }

    // ======== UI 刷新 ========
    private refreshTopUI() {
        // 玩家
        this.ui.playerText?.setText(`你（剑修） HP ${this.player.hp}/${this.player.maxHp}   格挡 ${this.player.block}`);
        this.ui.energyText?.setText(`灵力：${this.player.energy}/${this.player.maxEnergy}`);

        // 两头狼
        const a = this.getEnemy("wolfA")!;
        const b = this.getEnemy("wolfB")!;

        this.enemyText.wolfA?.setText(`${a.name}  HP ${a.hp}/${a.maxHp}`);
        this.intentText.wolfA?.setText(`意图：下回合造成 ${a.intentDamage} 伤害`);

        this.enemyText.wolfB?.setText(`${b.name}  HP ${b.hp}/${b.maxHp}`);
        this.intentText.wolfB?.setText(`意图：下回合造成 ${b.intentDamage} 伤害`);
    }

    private refreshHpBars() {
        const H = this.scale.height;

        const barW = 220;
        const barH = 12;

        // 手牌区高度（跟布局一致）
        const handAreaH = this.cardH + 2 * this.bottomPadding + 20;
        const playerBarY = H - handAreaH - 20;

        // 玩家血条
        this.playerHpBar?.clear();
        if (this.playerHpBar) {
            const pct = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
            this.playerHpBar.fillStyle(0x0b1220, 1);
            this.playerHpBar.fillRoundedRect(40, playerBarY, barW, barH, 4);
            this.playerHpBar.fillStyle(0x22c55e, 1);
            this.playerHpBar.fillRoundedRect(40, playerBarY, Math.floor(barW * pct), barH, 4);
            this.playerHpBar.lineStyle(2, 0x93c5fd, 1);
            this.playerHpBar.strokeRoundedRect(40, playerBarY, barW, barH, 4);
        }

        // 敌人 A 血条
        this.enemyHpBar.wolfA?.clear();
        if (this.enemyHpBar.wolfA) {
            const e = this.getEnemy("wolfA")!;
            const pct = Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1);
            this.enemyHpBar.wolfA.fillStyle(0x0b1220, 1);
            this.enemyHpBar.wolfA.fillRoundedRect(40, 68, barW, barH, 4);
            this.enemyHpBar.wolfA.fillStyle(0xef4444, 1);
            this.enemyHpBar.wolfA.fillRoundedRect(40, 68, Math.floor(barW * pct), barH, 4);
            this.enemyHpBar.wolfA.lineStyle(2, 0x93c5fd, 1);
            this.enemyHpBar.wolfA.strokeRoundedRect(40, 68, barW, barH, 4);
        }

        // 敌人 B 血条
        this.enemyHpBar.wolfB?.clear();
        if (this.enemyHpBar.wolfB) {
            const e = this.getEnemy("wolfB")!;
            const pct = Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1);
            this.enemyHpBar.wolfB.fillStyle(0x0b1220, 1);
            this.enemyHpBar.wolfB.fillRoundedRect(40, 130, barW, barH, 4);
            this.enemyHpBar.wolfB.fillStyle(0xf97316, 1);
            this.enemyHpBar.wolfB.fillRoundedRect(40, 130, Math.floor(barW * pct), barH, 4);
            this.enemyHpBar.wolfB.lineStyle(2, 0x93c5fd, 1);
            this.enemyHpBar.wolfB.strokeRoundedRect(40, 130, barW, barH, 4);
        }
    }

    private refreshHandUI() {
        // 先销毁旧 UI
        this.handViews.forEach((v) => v.destroy());
        this.handViews = [];

        const W = this.scale.width;
        const H = this.scale.height;

        const n = this.hand.length;
        if (n <= 0) return;

        // 可用宽度（右侧给结束回合按钮留位）
        const leftPadding = 20;
        const usableW = W - this.rightPanelW - leftPadding * 2;

        // 手牌 y 基线（靠底）
        const handAreaH = this.cardH + 2 * this.bottomPadding + 20;
        const baseY = H - handAreaH / 2 + 10;

        // 计算合理 gap（保证都放得下）
        let gap = this.cardGapMax;
        if (n > 1) {
            const maxGap = Math.floor((usableW - n * this.cardW) / (n - 1));
            gap = Phaser.Math.Clamp(maxGap, 10, this.cardGapMax);
        }

        const totalW = n * this.cardW + (n - 1) * gap;
        const startLeft = leftPadding + Math.max(0, (usableW - totalW) / 2);

        // 先创建 CardView（位置先放直线）
        for (let i = 0; i < n; i++) {
            const def = CARD_DEFS[this.hand[i].defId];
            const x = startLeft + i * (this.cardW + gap) + this.cardW / 2;

            const v = new CardView(this, x, baseY, this.cardW, this.cardH);
            v.setBaseDepth(100 + i);
            v.setBasePos(x, baseY);

            v.setModel({
                name: def.name,
                cost: def.cost,
                desc: def.desc,
                level: "入门",
                playable: this.player.energy >= def.cost,
            });

            // 点击
            v.on("pointerdown", () => this.onCardClicked(i));

            // hover：记录 index 并重新布局（让位）
            v.on("pointerover", () => {
                this.hoveredHandIndex = i;
                this.layoutHandFan();
            });

            v.on("pointerout", () => {
                // 只有当前 hover 的那张离开才清空
                if (this.hoveredHandIndex === i) this.hoveredHandIndex = null;
                this.layoutHandFan();
            });

            this.handViews.push(v);
        }

        // 初次扇形布局
        this.layoutHandFan();
    }

    private layoutHandFan() {
        const n = this.handViews.length;
        if (n <= 0) return;

        const W = this.scale.width;
        const H = this.scale.height;

        // 手牌 y 基线
        const handAreaH = this.cardH + 2 * this.bottomPadding + 20;
        const baseY = H - handAreaH / 2 + 10;

        // 手牌中心 x：在可用区域中心
        const leftPadding = 20;
        const usableW = W - this.rightPanelW - leftPadding * 2;
        const centerX = leftPadding + usableW / 2;

        // 扇形参数（随手牌数量变化）
        const maxAngle = Phaser.Math.Clamp(12 + n * 1.5, 14, 26); // 总扇形角度
        const angleStep = n === 1 ? 0 : maxAngle / (n - 1);

        const radius = Phaser.Math.Clamp(520 - n * 18, 340, 520); // 半径越大越平
        const spread = Phaser.Math.Clamp(72 + n * 4, 80, 140); // hover 时左右让位距离

        // 计算每张牌的目标位置（扇形）
        // 我们把扇形中心放在屏幕下方，形成上拱弧线
        const arcCenterX = centerX;
        const arcCenterY = baseY + radius; // 圆心在手牌下方

        const mid = (n - 1) / 2;

        for (let i = 0; i < n; i++) {
            const v = this.handViews[i];

            // 角度：左负右正
            const angDeg = (i - mid) * angleStep;
            const ang = Phaser.Math.DegToRad(angDeg);

            // 圆弧点：x 方向按 sin，y 方向按 cos
            let targetX = arcCenterX + Math.sin(ang) * radius;
            let targetY = arcCenterY - Math.cos(ang) * radius;

            // hover 让位：hover 左边往左挪，右边往右挪
            if (this.hoveredHandIndex !== null) {
                if (i < this.hoveredHandIndex) targetX -= spread;
                if (i > this.hoveredHandIndex) targetX += spread;
            }

            // 设置 base pos（非 hover 时会贴合）
            v.setBasePos(targetX, targetY);

            // 非 hover 的牌：恢复到 base（位置 + scale 1 + depth base）
            // hover 的牌：强制 hover on（上浮放大 + depth+1000）
            if (this.hoveredHandIndex === i) {
                v.forceHoverOn();
            } else {
                v.forceHoverOff();
            }

            // 视觉旋转（尖塔味道）
            v.rotation = ang * 0.55;
        }
    }

    private refreshAllUI() {
        this.refreshTopUI();
        this.refreshHpBars();
        this.refreshHandUI();
    }

    private log(line: string) {
        const cur = this.ui.logText?.text ?? "";
        const next = (cur ? cur + "\n" : "") + line;
        const lines = next.split("\n").slice(-12);
        this.ui.logText?.setText(lines.join("\n"));
    }
}
