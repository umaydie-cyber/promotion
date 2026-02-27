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
        intentDamage: 8,
    };

    private drawPile: CardInstance[] = [];
    private discardPile: CardInstance[] = [];
    private hand: CardInstance[] = [];

    private playerSprite?: Phaser.GameObjects.Sprite;
    private enemySprite?: Phaser.GameObjects.Sprite;

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

        this.createPlaceholderAnimations();

        // 人物 / 怪物（占位动态）
        this.playerSprite = this.add.sprite(200, 280, "player_0").setScale(2).setDepth(5);
        this.playerSprite.play("player_idle");

        this.enemySprite = this.add.sprite(760, 170, "enemy_0").setScale(2).setDepth(5);
        this.enemySprite.play("enemy_idle");

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
        this.player.energy = this.player.maxEnergy;
        this.player.block = 0;

        this.drawToHandSize(5);

        this.log(isFirstTurn ? "战斗开始！你的回合。" : "你的回合。");
        this.refreshAllUI();
    }

    private endPlayerTurn() {
        this.discardPile.push(...this.hand);
        this.hand = [];
        this.refreshHandUI();

        this.log("你结束了回合。敌人行动！");
        this.enemyAct();
    }

    private enemyAct() {
        const dmg = this.enemy.intentDamage;
        this.applyDamageToPlayer(dmg);

        this.enemy.intentDamage = Phaser.Math.Between(6, 10);

        if (this.player.hp <= 0) {
            this.log("你败了（MVP：返回角色选择）");
            this.time.delayedCall(700, () => this.scene.start("CharacterSelect"));
            return;
        }

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

        this.player.energy -= def.cost;

        if (def.id === "strike") {
            this.applyDamageToEnemy(6);
            this.log(`你使用【挥砍】造成 6 伤害。`);
        } else if (def.id === "defend") {
            this.player.block += 5;
            this.log(`你使用【招架】获得 5 格挡。`);
        }

        const [used] = this.hand.splice(indexInHand, 1);
        this.discardPile.push(used);

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
        // UI 刷新交给 refreshAllUI() 统一处理
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
    private applyDamageToEnemy(amount: number) {
        this.enemy.hp = Math.max(0, this.enemy.hp - amount);
        this.hitFx(this.enemySprite);
        this.refreshHpBars();
    }

    private applyDamageToPlayer(amount: number) {
        const blocked = Math.min(this.player.block, amount);
        const taken = amount - blocked;

        this.player.block -= blocked;
        this.player.hp = Math.max(0, this.player.hp - taken);

        this.hitFx(this.playerSprite);
        this.refreshHpBars();

        this.log(
            blocked > 0
                ? `敌人攻击 ${amount}，你格挡了 ${blocked}，受到 ${taken}。`
                : `敌人攻击 ${amount}，你受到 ${taken}。`
        );
    }

    private hitFx(target?: Phaser.GameObjects.Sprite) {
        if (!target) return;

        target.setTintFill(0xffffff);

        this.time.delayedCall(80, () => {
            target.clearTint();
        });

        const baseX = target.x;
        const baseY = target.y;

        this.tweens.add({
            targets: target,
            x: baseX + 6,
            y: baseY - 4,
            duration: 60,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                target.setPosition(baseX, baseY);
            },
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

            this.enemyHpBar.lineStyle(2, 0x334155, 1);
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

            this.playerHpBar.lineStyle(2, 0x334155, 1);
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
        const lines = next.split("\n").slice(-12);
        this.ui.logText?.setText(lines.join("\n"));
    }

    // 占位动画：更稳的纹理生成方式
    private createPlaceholderAnimations() {
        if (this.textures.exists("player_0")) return;

        for (let i = 0; i < 4; i++) {
            const g = this.add.graphics();
            g.fillStyle(0x22c55e, 1);
            g.fillCircle(32, 32, 18 + i);
            g.lineStyle(4, 0x14532d, 1);
            g.strokeCircle(32, 32, 18 + i);
            g.generateTexture(`player_${i}`, 64, 64);
            g.destroy();
        }

        for (let i = 0; i < 4; i++) {
            const g = this.add.graphics();
            g.fillStyle(0xef4444, 1);
            g.fillRoundedRect(10 - i, 14, 44 + i * 2, 40, 8);
            g.lineStyle(4, 0x7f1d1d, 1);
            g.strokeRoundedRect(10 - i, 14, 44 + i * 2, 40, 8);
            g.generateTexture(`enemy_${i}`, 64, 64);
            g.destroy();
        }

        this.anims.create({
            key: "player_idle",
            frames: [{ key: "player_0" }, { key: "player_1" }, { key: "player_2" }, { key: "player_3" }],
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: "enemy_idle",
            frames: [{ key: "enemy_0" }, { key: "enemy_1" }, { key: "enemy_2" }, { key: "enemy_3" }],
            frameRate: 6,
            repeat: -1,
        });
    }
}
