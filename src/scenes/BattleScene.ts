import * as Phaser from "phaser";
import { CardView } from "../ui/CardView";

type CardId = "strike" | "defend";

type Card = {
    id: CardId;
    name: string;
    cost: number;
    desc: string;
};

const CARD_DEFS: Record<CardId, Card> = {
    strike: { id: "strike", name: "挥砍", cost: 1, desc: "造成 6 点伤害" },
    defend: { id: "defend", name: "招架", cost: 1, desc: "获得 5 点格挡" },
};

type CardInstance = { defId: CardId };

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

    // ======== 状态 ========
    private player = {
        hp: 70,
        maxHp: 70,
        block: 0,
        energy: 3,
        maxEnergy: 3,
    };

    private enemy = {
        name: "赤鳞狼",
        hp: 40,
        maxHp: 40,
        intentDamage: 8, // 下回合打你多少
    };

    private drawPile: CardInstance[] = [];
    private discardPile: CardInstance[] = [];
    private hand: CardInstance[] = [];

    // 形状占位“动态图片”
    private playerAvatar?: Phaser.GameObjects.Arc;
    private enemyAvatar?: Phaser.GameObjects.Rectangle;

    private playerHpBar?: Phaser.GameObjects.Graphics;
    private enemyHpBar?: Phaser.GameObjects.Graphics;

    private ui = {
        playerText: null as Phaser.GameObjects.Text | null,
        enemyText: null as Phaser.GameObjects.Text | null,
        intentText: null as Phaser.GameObjects.Text | null,
        energyText: null as Phaser.GameObjects.Text | null,
        logText: null as Phaser.GameObjects.Text | null,
        endTurnBtn: null as Phaser.GameObjects.Rectangle | null,
    };

    private handViews: CardView[] = [];

    // ======== 生命周期 ========
    create() {
        this.cameras.main.setBackgroundColor("#111827");

        // ✅ 人物（绿色圆形呼吸）
        this.playerAvatar = this.add.circle(200, 280, 34, 0x22c55e, 1).setDepth(5);
        this.playerAvatar.setStrokeStyle(6, 0x14532d, 1);

        this.tweens.add({
            targets: this.playerAvatar,
            scale: 1.06,
            duration: 550,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });

        // ✅ 怪物（红色方块抖动）
        this.enemyAvatar = this.add.rectangle(760, 170, 80, 70, 0xef4444, 1).setDepth(5);
        this.enemyAvatar.setStrokeStyle(6, 0x7f1d1d, 1);

        this.tweens.add({
            targets: this.enemyAvatar,
            scaleX: 1.06,
            scaleY: 0.94,
            duration: 420,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });

        this.setupDeck();
        this.setupUI();

        // 血条
        this.enemyHpBar = this.add.graphics().setDepth(20);
        this.playerHpBar = this.add.graphics().setDepth(20);
        this.refreshHpBars();

        this.startPlayerTurn(true);

        // 全屏按钮
        this.add
            .text(930, 10, "⛶", { fontSize: "22px", color: "#ffffff" })
            .setOrigin(1, 0)
            .setDepth(999)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                if (this.scale.isFullscreen) this.scale.stopFullscreen();
                else this.scale.startFullscreen();
            });
    }

    // ======== 初始化 ========
    private setupDeck() {
        // 剑修初始牌库：5挥砍 5招架（MVP 先不放还击，下一步再加）
        const deck: CardInstance[] = [];
        for (let i = 0; i < 5; i++) deck.push({ defId: "strike" });
        for (let i = 0; i < 5; i++) deck.push({ defId: "defend" });

        this.drawPile = shuffle(deck);
        this.discardPile = [];
        this.hand = [];
    }

    private setupUI() {
        // 敌人区
        this.ui.enemyText = this.add.text(40, 30, "", {
            fontFamily: "sans-serif",
            fontSize: "22px",
            color: "#ffffff",
        });

        this.ui.intentText = this.add.text(40, 60, "", {
            fontFamily: "sans-serif",
            fontSize: "16px",
            color: "#cbd5e1",
        });

        // 玩家区
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

        // log
        this.ui.logText = this.add.text(520, 30, "", {
            fontFamily: "sans-serif",
            fontSize: "14px",
            color: "#e2e8f0",
            lineSpacing: 6,
            wordWrap: { width: 400 },
        });

        // 结束回合按钮
        const btn = this.add
            .rectangle(820, 480, 160, 50, 0x2563eb, 1)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.endPlayerTurn());

        btn.setStrokeStyle(2, 0x93c5fd, 1);

        this.add
            .text(820, 480, "结束回合", {
                fontFamily: "sans-serif",
                fontSize: "20px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.ui.endTurnBtn = btn;

        this.refreshTopUI();
    }

    // ======== 回合流程 ========
    private startPlayerTurn(isFirstTurn = false) {
        // 回合开始：重置能量，清空格挡（尖塔规则）
        this.player.energy = this.player.maxEnergy;
        this.player.block = 0;

        // 抽牌：把手牌补到 5
        this.drawToHandSize(5);

        this.log(isFirstTurn ? "战斗开始！你的回合。" : "你的回合。");
        this.refreshAllUI();
    }

    private endPlayerTurn() {
        // 弃掉手牌
        this.discardPile.push(...this.hand);
        this.hand = [];

        this.refreshHandUI();

        this.log("你结束了回合。敌人行动！");
        this.enemyAct();
    }

    private enemyAct() {
        // 敌人造成伤害
        const dmg = this.enemy.intentDamage;
        this.applyDamageToPlayer(dmg);

        // 生成下一回合意图（MVP：随机 6~10）
        this.enemy.intentDamage = Phaser.Math.Between(6, 10);

        // 胜负判定
        if (this.player.hp <= 0) {
            this.log("你败了（MVP：返回角色选择）");
            this.time.delayedCall(700, () => this.scene.start("CharacterSelect"));
            return;
        }

        // 回到玩家回合
        this.startPlayerTurn();
    }

    // ======== 出牌 ========
    private playCard(indexInHand: number) {
        const inst = this.hand[indexInHand];
        if (!inst) return;

        const def = CARD_DEFS[inst.defId];
        if (this.player.energy < def.cost) {
            this.log("灵力不足！");
            return;
        }

        // 扣能量
        this.player.energy -= def.cost;

        // 执行效果
        if (def.id === "strike") {
            this.applyDamageToEnemy(6);
            this.log(`你使用【挥砍】造成 6 伤害。`);
        } else if (def.id === "defend") {
            this.player.block += 5;
            this.log(`你使用【招架】获得 5 格挡。`);
        }

        // 移出手牌→弃牌堆
        const [used] = this.hand.splice(indexInHand, 1);
        this.discardPile.push(used);

        // 胜利判定
        if (this.enemy.hp <= 0) {
            this.refreshAllUI();
            this.log("敌人被击败！（MVP：返回事件界面）");
            this.time.delayedCall(700, () => this.scene.start("Event", { characterId: "swordsman" as any }));
            return;
        }

        this.refreshAllUI();
    }

    // ======== 抽牌/洗牌 ========
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
            // 洗弃牌堆进抽牌堆
            this.drawPile = shuffle(this.discardPile);
            this.discardPile = [];
            this.log("洗牌！");
        }
        return this.drawPile.pop() ?? null;
    }

    // ======== 伤害结算 ========
    private applyDamageToEnemy(amount: number) {
        this.enemy.hp = Math.max(0, this.enemy.hp - amount);

        // 受击特效 + 飘字
        this.hitFx(this.enemyAvatar as any);
        if (this.enemyAvatar) this.floatText(this.enemyAvatar.x, this.enemyAvatar.y - 60, `-${amount}`, "#ef4444");

        this.refreshHpBars();
    }

    private applyDamageToPlayer(amount: number) {
        const blocked = Math.min(this.player.block, amount);
        const taken = amount - blocked;

        this.player.block -= blocked;
        this.player.hp = Math.max(0, this.player.hp - taken);

        // 受击特效 + 飘字（只在真正掉血时显示）
        this.hitFx(this.playerAvatar as any);
        if (taken > 0 && this.playerAvatar) this.floatText(this.playerAvatar.x, this.playerAvatar.y - 60, `-${taken}`, "#ef4444");
        if (taken <= 0 && blocked > 0 && this.playerAvatar) this.floatText(this.playerAvatar.x, this.playerAvatar.y - 60, `格挡`, "#93c5fd");

        this.refreshHpBars();

        this.log(
            blocked > 0
                ? `敌人攻击 ${amount}，你格挡了 ${blocked}，受到 ${taken}。`
                : `敌人攻击 ${amount}，你受到 ${taken}。`
        );
    }

    // ======== 受击特效：闪烁 + 抖动（适配形状对象） ========
    private hitFx(target?: Phaser.GameObjects.GameObject & { x: number; y: number; setAlpha: (a: number) => any }) {
        if (!target) return;

        // 闪烁
        this.tweens.add({
            targets: target,
            alpha: 0.25,
            duration: 60,
            yoyo: true,
            repeat: 2,
        });

        // 抖动
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
            },
        });
    }

    // ======== 掉血飘字 ========
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
            .setDepth(999);

        this.tweens.add({
            targets: t,
            y: y - 30,
            alpha: 0,
            duration: 650,
            ease: "Cubic.Out",
            onComplete: () => t.destroy(),
        });
    }

    // ======== UI ========
    private refreshTopUI() {
        this.ui.enemyText?.setText(`${this.enemy.name}  HP ${this.enemy.hp}/${this.enemy.maxHp}`);
        this.ui.intentText?.setText(`意图：下回合造成 ${this.enemy.intentDamage} 伤害`);

        this.ui.playerText?.setText(`你（剑修） HP ${this.player.hp}/${this.player.maxHp}   格挡 ${this.player.block}`);
        this.ui.energyText?.setText(`灵力：${this.player.energy}/${this.player.maxEnergy}`);
    }

    private refreshHpBars() {
        const barW = 220;
        const barH = 12;

        // 敌人血条
        if (this.enemyHpBar) {
            this.enemyHpBar.clear();
            const pct = Phaser.Math.Clamp(this.enemy.hp / this.enemy.maxHp, 0, 1);

            this.enemyHpBar.fillStyle(0x0b1220, 1);
            this.enemyHpBar.fillRoundedRect(40, 90, barW, barH, 4);

            this.enemyHpBar.fillStyle(0xef4444, 1);
            this.enemyHpBar.fillRoundedRect(40, 90, Math.floor(barW * pct), barH, 4);

            // 更亮的描边，避免“看不见”
            this.enemyHpBar.lineStyle(2, 0x93c5fd, 1);
            this.enemyHpBar.strokeRoundedRect(40, 90, barW, barH, 4);
        }

        // 玩家血条
        if (this.playerHpBar) {
            this.playerHpBar.clear();
            const pct = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);

            this.playerHpBar.fillStyle(0x0b1220, 1);
            this.playerHpBar.fillRoundedRect(40, 480, barW, barH, 4);

            this.playerHpBar.fillStyle(0x22c55e, 1);
            this.playerHpBar.fillRoundedRect(40, 480, Math.floor(barW * pct), barH, 4);

            this.playerHpBar.lineStyle(2, 0x93c5fd, 1);
            this.playerHpBar.strokeRoundedRect(40, 480, barW, barH, 4);
        }
    }

    // 手牌：居中 + 上移
    private refreshHandUI() {
        this.handViews.forEach((v) => v.destroy());
        this.handViews = [];

        const W = this.scale.width;
        const H = this.scale.height;

        const cardW = 120;
        const cardH = 170;
        const gap = 18;

        const n = this.hand.length;
        const totalW = n * cardW + (n - 1) * gap;
        const startLeft = (W - totalW) / 2;

        const y = H - 210;

        for (let i = 0; i < n; i++) {
            const def = CARD_DEFS[this.hand[i].defId];
            const x = startLeft + i * (cardW + gap) + cardW / 2;

            const v = new CardView(this, x, y, cardW, cardH);
            v.setModel({
                name: def.name,
                cost: def.cost,
                desc: def.desc,
                level: "入门",
                playable: this.player.energy >= def.cost,
            });

            v.on("pointerdown", () => this.playCard(i));
            this.handViews.push(v);
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
        // 只保留最后 12 行
        const lines = next.split("\n").slice(-12);
        this.ui.logText?.setText(lines.join("\n"));
    }
}
