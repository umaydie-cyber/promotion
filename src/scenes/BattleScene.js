import Phaser from "phaser";
import { CardView } from "../ui/CardView";
const CARD_DEFS = {
    strike: { id: "strike", name: "挥砍", cost: 1, desc: "造成 6 点伤害" },
    defend: { id: "defend", name: "招架", cost: 1, desc: "获得 5 点格挡" },
};
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: "Battle" });
    }
    // ======== 状态 ========
    player = {
        hp: 70,
        maxHp: 70,
        block: 0,
        energy: 3,
        maxEnergy: 3,
    };
    enemy = {
        name: "赤鳞狼",
        hp: 40,
        maxHp: 40,
        intentDamage: 8, // 下回合打你多少
    };
    drawPile = [];
    discardPile = [];
    hand = [];
    ui = {
        playerText: null,
        enemyText: null,
        intentText: null,
        energyText: null,
        logText: null,
        endTurnBtn: null,
    };
    handUI = [];
    // ======== 生命周期 ========
    create() {
        this.cameras.main.setBackgroundColor("#111827");
        this.setupDeck();
        this.setupUI();
        this.startPlayerTurn(true);
    }
    // ======== 初始化 ========
    setupDeck() {
        // 剑修初始牌库：5挥砍 5招架（MVP 先不放还击，下一步再加）
        const deck = [];
        for (let i = 0; i < 5; i++)
            deck.push({ defId: "strike" });
        for (let i = 0; i < 5; i++)
            deck.push({ defId: "defend" });
        this.drawPile = shuffle(deck);
        this.discardPile = [];
        this.hand = [];
    }
    setupUI() {
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
            .rectangle(780, 470, 160, 50, 0x2563eb, 1)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.endPlayerTurn());
        btn.setStrokeStyle(2, 0x93c5fd, 1);
        this.add
            .text(780, 470, "结束回合", {
            fontFamily: "sans-serif",
            fontSize: "20px",
            color: "#ffffff",
        })
            .setOrigin(0.5);
        this.ui.endTurnBtn = btn;
        this.refreshTopUI();
    }
    // ======== 回合流程 ========
    startPlayerTurn(isFirstTurn = false) {
        // 回合开始：重置能量，清空格挡（尖塔规则）
        this.player.energy = this.player.maxEnergy;
        this.player.block = 0;
        // 抽牌：把手牌补到 5
        this.drawToHandSize(5);
        this.log(isFirstTurn ? "战斗开始！你的回合。" : "你的回合。");
        this.refreshAllUI();
    }
    endPlayerTurn() {
        // 弃掉手牌
        this.discardPile.push(...this.hand);
        this.hand = [];
        this.refreshHandUI();
        this.log("你结束了回合。敌人行动！");
        this.enemyAct();
    }
    enemyAct() {
        // 敌人造成伤害
        const dmg = this.enemy.intentDamage;
        this.applyDamageToPlayer(dmg);
        // 生成下一回合意图（MVP：固定8，可做一点随机）
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
    playCard(indexInHand) {
        const inst = this.hand[indexInHand];
        if (!inst)
            return;
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
        }
        else if (def.id === "defend") {
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
            this.time.delayedCall(700, () => this.scene.start("Event", { characterId: "swordsman" }));
            return;
        }
        this.refreshAllUI();
    }
    // ======== 抽牌/洗牌 ========
    drawToHandSize(size) {
        while (this.hand.length < size) {
            const card = this.drawOne();
            if (!card)
                break;
            this.hand.push(card);
        }
        this.refreshHandUI();
    }
    drawOne() {
        if (this.drawPile.length === 0) {
            if (this.discardPile.length === 0)
                return null;
            // 洗弃牌堆进抽牌堆
            this.drawPile = shuffle(this.discardPile);
            this.discardPile = [];
            this.log("洗牌！");
        }
        return this.drawPile.pop() ?? null;
    }
    // ======== 伤害结算 ========
    applyDamageToEnemy(amount) {
        this.enemy.hp = Math.max(0, this.enemy.hp - amount);
    }
    applyDamageToPlayer(amount) {
        const blocked = Math.min(this.player.block, amount);
        const taken = amount - blocked;
        this.player.block -= blocked;
        this.player.hp = Math.max(0, this.player.hp - taken);
        this.log(blocked > 0
            ? `敌人攻击 ${amount}，你格挡了 ${blocked}，受到 ${taken}。`
            : `敌人攻击 ${amount}，你受到 ${taken}。`);
    }
    // ======== UI ========
    refreshTopUI() {
        this.ui.enemyText?.setText(`${this.enemy.name}  HP ${this.enemy.hp}/${this.enemy.maxHp}`);
        this.ui.intentText?.setText(`意图：下回合造成 ${this.enemy.intentDamage} 伤害`);
        this.ui.playerText?.setText(`你（剑修） HP ${this.player.hp}/${this.player.maxHp}   格挡 ${this.player.block}`);
        this.ui.energyText?.setText(`灵力：${this.player.energy}/${this.player.maxEnergy}`);
    }
    refreshHandUI() {
        this.handViews.forEach(v => v.destroy());
        this.handViews = [];
        const startX = 220;
        const y = 450;
        const gap = 14;
        for (let i = 0; i < this.hand.length; i++) {
            const def = CARD_DEFS[this.hand[i].defId];
            const x = startX + i * (120 + gap);
            const v = new CardView(this, x, y, 120, 170);
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
    handViews = [];
    refreshAllUI() {
        this.refreshTopUI();
        this.refreshHandUI();
    }
    log(line) {
        const cur = this.ui.logText?.text ?? "";
        const next = (cur ? cur + "\n" : "") + line;
        // 只保留最后 12 行
        const lines = next.split("\n").slice(-12);
        this.ui.logText?.setText(lines.join("\n"));
    }
}
