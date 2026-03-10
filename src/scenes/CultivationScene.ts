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

type CultivationCardId = "qi_infusion" | "epiphany" | "channel_qi" | "focus" | "visualize" | "micro_orbit" | "lingtai" | "spirit_sword";

type CultivationCardDef = {
    id: CultivationCardId;
    name: string;
    realm: "炼气" | "筑基";
    cost: { energy: number; aura?: number; spirit?: number };
    desc: string;
    upgradedDesc: string;
    onPlay: (scene: CultivationScene) => void;
};

type ResourceType = "aura" | "spirit";

type HandCardView = {
    def: CultivationCardDef;
    container: Phaser.GameObjects.Container;
};

type RealmTier = "炼气" | "筑基" | "金丹" | "元婴" | "化神";

type UIButton = {
    bg: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;
    shadow: Phaser.GameObjects.Rectangle;
    shine: Phaser.GameObjects.Rectangle;
    onClick: () => void;
    enabled: boolean;
};

type HandLayout = {
    cardW: number;
    cardH: number;
    gap: number;
    startX: number;
    y: number;
};

const STARTER_CYCLE_DECK: CycleCard[] = [
    { id: "market", name: "坊市", count: 1, desc: "进入坊市" },
    { id: "travel", name: "游历山河", count: 1, desc: "触发游历事件（占位）" },
    { id: "training", name: "历练", count: 2, desc: "获得历练收益（占位）" },
    { id: "bounty", name: "悬赏", count: 1, desc: "承接悬赏任务（占位）" },
];

const CULTIVATION_CARD_DEFS: Record<CultivationCardId, CultivationCardDef> = {
    qi_infusion: {
        id: "qi_infusion",
        name: "引气入体",
        realm: "炼气",
        cost: { energy: 1, spirit: 1, aura: 3 },
        desc: "生成5道韵。",
        upgradedDesc: "升级：生成7道韵。",
        onPlay: (scene) => scene.gainDaoYun(5),
    },
    epiphany: {
        id: "epiphany",
        name: "顿悟",
        realm: "炼气",
        cost: { energy: 2, spirit: 5 },
        desc: "生成8道韵。",
        upgradedDesc: "升级：生成10道韵。",
        onPlay: (scene) => scene.gainDaoYun(8),
    },
    channel_qi: {
        id: "channel_qi",
        name: "运气",
        realm: "炼气",
        cost: { energy: 1 },
        desc: "生成2点灵气。",
        upgradedDesc: "升级：生成3点灵气。",
        onPlay: (scene) => scene.gainAura(2),
    },
    focus: {
        id: "focus",
        name: "凝神",
        realm: "炼气",
        cost: { energy: 1 },
        desc: "生成2点神识。",
        upgradedDesc: "升级：生成3点神识。",
        onPlay: (scene) => scene.gainSpirit(2),
    },
    visualize: {
        id: "visualize",
        name: "观想",
        realm: "炼气",
        cost: { energy: 1 },
        desc: "生成1点神识并抽1张牌。",
        upgradedDesc: "升级：生成2点神识并抽1张牌。",
        onPlay: (scene) => {
            scene.gainSpirit(1);
            scene.drawCultivationCards(1);
        },
    },
    micro_orbit: {
        id: "micro_orbit",
        name: "小周天",
        realm: "炼气",
        cost: { energy: 1 },
        desc: "置于任脉区，每回合首次获得灵气时额外+1灵气。",
        upgradedDesc: "升级：消耗改为0精力。",
        onPlay: (scene) => {
            scene.activateRenMai();
        },
    },
    lingtai: {
        id: "lingtai",
        name: "灵台",
        realm: "炼气",
        cost: { energy: 1 },
        desc: "置于督脉区，每回合开始时获得1神识。",
        upgradedDesc: "升级：每回合开始获得2神识。",
        onPlay: (scene) => {
            scene.activateDuMai(1);
        },
    },
    spirit_sword: {
        id: "spirit_sword",
        name: "蕴灵剑",
        realm: "筑基",
        cost: { energy: 2 },
        desc: "剑修专属。生成5点灵气并生成1点道韵。",
        upgradedDesc: "升级：生成7点灵气、2点道韵。",
        onPlay: (scene) => {
            scene.gainAura(5);
            scene.gainDaoYun(1);
        },
    },
};

const STARTER_CULTIVATION_DECK: CultivationCardId[] = [
    "qi_infusion",
    "epiphany",
    "channel_qi",
    "channel_qi",
    "channel_qi",
    "channel_qi",
    "focus",
    "focus",
    "focus",
    "visualize",
];

const UI_FONT_FAMILY = '"Noto Serif SC", "Source Han Serif SC", "STSong", "SimSun", serif';

const REALM_BADGE_STYLE: Record<RealmTier, { fill: number; stroke: number; text: string }> = {
    炼气: { fill: 0xf6f1e8, stroke: 0xcbc0aa, text: "#433628" },
    筑基: { fill: 0x4e8f4a, stroke: 0x2e5f2f, text: "#f2fce9" },
    金丹: { fill: 0x3f78c9, stroke: 0x274f90, text: "#ecf5ff" },
    元婴: { fill: 0x8452c7, stroke: 0x5a3691, text: "#f5edff" },
    化神: { fill: 0xdb8b2d, stroke: 0xa56317, text: "#fff6e6" },
};

const CULTIVATION_ART_STYLE: Record<CultivationCardId, { colorA: number; colorB: number; icon: string }> = {
    qi_infusion: { colorA: 0xb7d7ff, colorB: 0x5c8dd8, icon: "气" },
    epiphany: { colorA: 0xffd898, colorB: 0xc98438, icon: "悟" },
    channel_qi: { colorA: 0xc5f4b2, colorB: 0x5da959, icon: "灵" },
    focus: { colorA: 0xd8e4ff, colorB: 0x7289d9, icon: "神" },
    visualize: { colorA: 0xf3d7ff, colorB: 0xaa72c4, icon: "观" },
    micro_orbit: { colorA: 0xc4ebff, colorB: 0x4c94be, icon: "周" },
    lingtai: { colorA: 0xccdcff, colorB: 0x6a81cb, icon: "台" },
    spirit_sword: { colorA: 0xffd1d1, colorB: 0xc16161, icon: "剑" },
};

export default class CultivationScene extends Phaser.Scene {
    private currentCharacter!: CharacterDef;
    private cycleSlots: CycleSlot[] = [];
    private roundIndex = 0;
    private cycleStageIndex = 0;
    private cycleStageText?: Phaser.GameObjects.Text;

    private readonly cycleStageLabels = ["准备阶段", "阶段一", "阶段二", "阶段三", "阶段四"];

    private energy = 3;
    private aura = 0;
    private spirit = 0;
    private daoYun = 0;

    private resourcesText?: Phaser.GameObjects.Text;
    private cultivationRoundText?: Phaser.GameObjects.Text;
    private cultivationStatusText?: Phaser.GameObjects.Text;

    private cultivationDeck: CultivationCardDef[] = [];
    private cultivationDiscard: CultivationCardDef[] = [];
    private handCards: CultivationCardDef[] = [];
    private handCardViews: HandCardView[] = [];

    private cultivationStarted = false;
    private renMaiActive = false;
    private renMaiTriggeredThisTurn = false;
    private duMaiSpiritPerTurn = 0;
    private meridianText?: Phaser.GameObjects.Text;
    private breakthroughBtn?: Phaser.GameObjects.Rectangle;
    private breakthroughText?: Phaser.GameObjects.Text;
    private startCultivationBtn?: UIButton;
    private endCycleBtn?: UIButton;
    private cycleDeckObjects: Phaser.GameObjects.GameObject[] = [];
    private cycleSlotObjects: Phaser.GameObjects.GameObject[] = [];

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
            fontFamily: UI_FONT_FAMILY,
            fontSize: "46px",
            color: "#2b2118",
        });

        this.renderCharacterPanel();

        this.makeButton(this.scale.width - 324, 34, 88, 36, "周期卡组", () => {
            this.showToast(`周期卡组：${STARTER_CYCLE_DECK.map((c) => `${c.name}x${c.count}`).join("、")}`);
        });

        this.makeButton(this.scale.width - 226, 34, 88, 36, "修炼卡组", () => {
            this.showToast("修炼卡组：引气入体x1、顿悟x1、运气x4、凝神x3、观想x1");
        });

        this.makeButton(this.scale.width - 128, 34, 88, 36, "战斗卡组", () => {
            const battleDeck = this.currentCharacter.starterDeck.map((c) => `${c.name}x${c.count}`).join("、");
            this.showToast(`战斗卡组：${battleDeck}`);
        });

        this.renderCycleCardsArea();
        this.renderCultivationArea();

        this.startCultivationBtn = this.makeButton(this.scale.width - 178, this.scale.height - 278, 140, 36, "开始修行", () => {
            this.startCultivation();
        });

        this.endCycleBtn = this.makeButton(this.scale.width - 178, this.scale.height - 236, 140, 36, "结束周期", () => {
            this.endCycleRound();
        });
        this.setButtonVisible(this.endCycleBtn, false);

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
        const panel = this.add.rectangle(30, 88, 430, 306, 0xf7f0e5, 0.92).setOrigin(0);
        panel.setStrokeStyle(2, 0x5a4b3a, 0.8);

        this.add.text(48, 104, `人物：${this.currentCharacter.name}`, {
            fontFamily: UI_FONT_FAMILY,
            fontSize: "22px",
            color: "#2f2419",
        });

        const leftAttrs = [
            `境界：${this.currentCharacter.realm}`,
            `当前血量：${this.currentCharacter.maxHp}/${this.currentCharacter.maxHp}`,
            "符箓：[_] [_] [_]",
            "丹药：[_] [_] [_]",
            "寿元：50（炼气期）",
            "道心：100/100",
            "灵石：0",
        ];

        this.add.text(48, 140, leftAttrs.join("\n"), {
            fontFamily: UI_FONT_FAMILY,
            fontSize: "18px",
            color: "#3d3125",
            lineSpacing: 10,
        });

        this.resourcesText = this.add.text(252, 140, "", {
            fontFamily: UI_FONT_FAMILY,
            fontSize: "18px",
            color: "#3d3125",
            lineSpacing: 10,
        });

        this.meridianText = this.add.text(252, 238, "", {
            fontFamily: UI_FONT_FAMILY,
            fontSize: "16px",
            color: "#3d3125",
            lineSpacing: 6,
        });

        this.cycleStageText = this.add.text(252, 278, `周期：${this.cycleStageLabels[this.cycleStageIndex]}`, {
            fontFamily: UI_FONT_FAMILY,
            fontSize: "18px",
            color: "#3d3125",
        });

        this.cultivationRoundText = this.add.text(252, 306, "修炼轮次：未开始", {
            fontFamily: UI_FONT_FAMILY,
            fontSize: "16px",
            color: "#3d3125",
        });

        this.cultivationStatusText = this.add.text(48, 334, "点击【开始修行】后抽5张修炼卡进入第一轮出牌。", {
            fontFamily: UI_FONT_FAMILY,
            fontSize: "14px",
            color: "#4a3a2b",
            wordWrap: { width: 390 },
        });

        this.breakthroughBtn = this.add.rectangle(336, 362, 110, 30, 0x6b5b46, 0.55).setOrigin(0.5);
        this.breakthroughBtn.setStrokeStyle(1, 0x9c8a73, 0.8);
        this.breakthroughText = this.add.text(336, 362, "筑基未解锁", {
            fontFamily: UI_FONT_FAMILY,
            fontSize: "14px",
            color: "#d8ccbc",
        }).setOrigin(0.5);

        this.updateResourceText();
        this.updateMeridianText();
    }

    private renderCultivationArea() {
        this.add.rectangle(this.scale.width / 2, 478, 752, 36, 0xe4d7c3, 0.4).setStrokeStyle(1, 0xc4b395, 0.65);
        this.add.text(this.scale.width / 2, 478, "修炼手牌区", {
            fontFamily: UI_FONT_FAMILY,
            fontSize: "22px",
            color: "#3a2d21",
        }).setOrigin(0.5);
    }

    private startCultivation() {
        if (!this.cycleSlots.every((slot) => slot.card)) {
            this.showToast("请先拖拽5张周期卡中的4张到周期轮次。", 1800);
            return;
        }

        this.cultivationStarted = true;
        this.roundIndex = 0;
        this.cycleStageIndex = 1;
        this.energy = 3;
        this.aura = 0;
        this.spirit = 0;
        this.daoYun = 0;
        this.renMaiTriggeredThisTurn = false;
        this.renMaiActive = false;
        this.duMaiSpiritPerTurn = 0;
        this.cultivationDeck = Phaser.Utils.Array.Shuffle(STARTER_CULTIVATION_DECK.map((id) => CULTIVATION_CARD_DEFS[id]));
        this.cycleDeckObjects.forEach((obj) => {
            obj.setVisible(false);
            if ("disableInteractive" in obj) {
                (obj as Phaser.GameObjects.GameObject & { disableInteractive: () => void }).disableInteractive();
            }
        });
        this.cycleSlotObjects.forEach((obj) => {
            obj.setVisible(false);
            if ("disableInteractive" in obj) {
                (obj as Phaser.GameObjects.GameObject & { disableInteractive: () => void }).disableInteractive();
            }
        });
        this.cultivationDiscard = [];
        this.handCards = [];
        this.clearHandViews();
        this.drawCultivationCards(5);
        this.updateResourceText();
        this.updateCycleStageText();
        this.updateMeridianText();
        this.updateRoundText();
        this.showStatus("修行开始：已抽5张修炼卡，进入第一轮出牌。", "#2f2419");
        if (this.startCultivationBtn) {
            this.setButtonVisible(this.startCultivationBtn, false);
            this.setButtonEnabled(this.startCultivationBtn, false);
        }
        if (this.endCycleBtn) {
            this.setButtonVisible(this.endCycleBtn, true);
            this.setButtonEnabled(this.endCycleBtn, true);
        }
    }

    private endCycleRound() {
        if (!this.cultivationStarted) {
            this.showToast("请先点击开始修行。", 1200);
            return;
        }

        const currentSlot = this.cycleSlots[this.roundIndex];
        const cardName = currentSlot.card?.name ?? "未知卡牌";
        this.resolveCycleCard(currentSlot.card);
        this.showToast(`结束第${this.roundIndex + 1}轮，触发周期卡【${cardName}】。`, 1800);
        currentSlot.bg.setFillStyle(0xccbba2, 1);

        this.roundIndex += 1;
        if (this.roundIndex >= 4) {
            this.cultivationStarted = false;
            this.cycleStageIndex = 0;
            this.roundIndex = 0;
            this.handCards = [];
            this.clearHandViews();
            this.cycleSlots.forEach((slot, idx) => {
                slot.bg.setFillStyle(0xe8dcc9, 0.95);
                slot.label.setText(`第${idx + 1}轮\n${slot.card?.name ?? "拖入周期卡"}`);
            });
            this.updateCycleStageText();
            this.updateRoundText();
            this.showStatus("本周期修行结束，可重新点击开始修行进入下一周期。", "#4a3a2b");
            if (this.startCultivationBtn) {
                this.setButtonVisible(this.startCultivationBtn, true);
                this.setButtonEnabled(this.startCultivationBtn, true);
            }
            if (this.endCycleBtn) {
                this.setButtonEnabled(this.endCycleBtn, false);
                this.setButtonVisible(this.endCycleBtn, false);
            }
            return;
        }

        this.cycleStageIndex = Math.min(this.roundIndex + 1, this.cycleStageLabels.length - 1);
        this.startNewTurn();
    }

    private startNewTurn() {
        this.energy = 3;
        this.renMaiTriggeredThisTurn = false;
        if (this.duMaiSpiritPerTurn > 0) {
            this.gainSpirit(this.duMaiSpiritPerTurn);
        }
        this.drawCultivationCards(5 - this.handCards.length);
        this.updateResourceText();
        this.updateCycleStageText();
        this.updateRoundText();
        this.showStatus(`进入第${this.roundIndex + 1}轮，可继续出牌。`, "#2f2419");
    }

    private resolveCycleCard(card?: CycleCard) {
        if (!card) return;
        if (card.id === "market") {
            this.showStatus("周期效果：进入坊市界面（当前为占位提示）。", "#6b2d1a");
        }
    }

    public gainAura(amount: number) {
        let gain = amount;
        if (this.renMaiActive && !this.renMaiTriggeredThisTurn) {
            gain += 1;
            this.renMaiTriggeredThisTurn = true;
            this.showToast("任脉【小周天】触发：本回合首次获得灵气+1", 1600);
        }
        this.aura += gain;
        this.updateResourceText();
    }

    public gainSpirit(amount: number) {
        this.spirit += amount;
        this.updateResourceText();
    }

    public gainDaoYun(amount: number) {
        this.daoYun += amount;
        this.updateResourceText();
    }

    public drawCultivationCards(count: number) {
        for (let i = 0; i < count; i += 1) {
            if (this.cultivationDeck.length === 0) {
                if (this.cultivationDiscard.length === 0) break;
                this.cultivationDeck = Phaser.Utils.Array.Shuffle([...this.cultivationDiscard]);
                this.cultivationDiscard = [];
            }
            const card = this.cultivationDeck.shift();
            if (card) this.handCards.push(card);
        }
        this.renderHandCards();
    }

    public activateRenMai() {
        this.renMaiActive = true;
        this.updateMeridianText();
    }

    public activateDuMai(spiritPerTurn: number) {
        this.duMaiSpiritPerTurn = Math.max(this.duMaiSpiritPerTurn, spiritPerTurn);
        this.updateMeridianText();
    }

    private playCultivationCard(card: CultivationCardDef) {
        if (!this.cultivationStarted) {
            this.showToast("尚未开始修行。", 1200);
            return;
        }

        const auraCost = card.cost.aura ?? 0;
        const spiritCost = card.cost.spirit ?? 0;
        if (this.energy < card.cost.energy || this.aura < auraCost || this.spirit < spiritCost) {
            this.showToast("资源不足，无法打出该卡。", 1200);
            return;
        }

        this.energy -= card.cost.energy;
        this.aura -= auraCost;
        this.spirit -= spiritCost;

        card.onPlay(this);

        const idx = this.handCards.indexOf(card);
        if (idx >= 0) {
            this.handCards.splice(idx, 1);
        }
        this.cultivationDiscard.push(card);
        this.renderHandCards();
        this.updateResourceText();
        this.showStatus(`已打出【${card.name}】。`, "#2f2419");
    }

    private updateResourceText() {
        this.resourcesText?.setText([
            `精力：${this.energy}/3`,
            `灵气：${this.aura}`,
            `神识：${this.spirit}`,
            `道韵：${this.daoYun}`,
        ].join("\n"));

        const unlocked = this.daoYun >= 60;
        if (this.breakthroughBtn && this.breakthroughText) {
            this.breakthroughBtn.setFillStyle(unlocked ? 0x365e32 : 0x6b5b46, unlocked ? 0.95 : 0.55);
            this.breakthroughBtn.setInteractive(unlocked ? { useHandCursor: true } : undefined);
            this.breakthroughText.setText(unlocked ? "筑基（已解锁）" : "筑基未解锁");
            this.breakthroughText.setColor(unlocked ? "#eef6e8" : "#d8ccbc");
            this.breakthroughBtn.removeAllListeners("pointerdown");
            if (unlocked) {
                this.breakthroughBtn.on("pointerdown", () => {
                    this.showToast("道韵已达60，可进行筑基突破。", 1600);
                });
            }
        }
    }

    private updateRoundText() {
        if (!this.cultivationStarted) {
            this.cultivationRoundText?.setText("修炼轮次：未开始");
            return;
        }
        this.cultivationRoundText?.setText(`修炼轮次：第${this.roundIndex + 1}轮`);
    }

    private updateMeridianText() {
        const renMaiState = this.renMaiActive ? "任脉：小周天（已激活）" : "任脉：空";
        const duMaiState = this.duMaiSpiritPerTurn > 0 ? `督脉：灵台（每回合+${this.duMaiSpiritPerTurn}神识）` : "督脉：空";
        this.meridianText?.setText(["经脉区", renMaiState, duMaiState].join("\n"));
    }

    private showStatus(text: string, color: string) {
        this.cultivationStatusText?.setText(text);
        this.cultivationStatusText?.setColor(color);
    }

    private renderHandCards() {
        this.clearHandViews();
        if (this.handCards.length === 0) return;

        const layout = this.getHandLayout(this.handCards.length);
        const { cardW, cardH, gap, startX, y } = layout;

        this.handCards.forEach((card, idx) => {
            const x = startX + idx * (cardW + gap);
            const container = this.add.container(0, 0);

            const realmTier = (card.realm as RealmTier) ?? "炼气";
            const realmBadge = REALM_BADGE_STYLE[realmTier] ?? REALM_BADGE_STYLE.炼气;
            const artStyle = CULTIVATION_ART_STYLE[card.id];
            const spiritCost = card.cost.spirit ?? 0;

            const cardShell = this.add.graphics();
            cardShell.fillStyle(0x2a221a, 0.82);
            const shellRadius = Math.max(10, Math.floor(cardW * 0.11));
            const cardRadius = Math.max(8, Math.floor(cardW * 0.085));
            cardShell.fillRoundedRect(x - 4, y - 4, cardW + 8, cardH + 8, shellRadius);
            cardShell.fillStyle(0xf3ebdc, 1);
            cardShell.fillRoundedRect(x, y, cardW, cardH, cardRadius);
            cardShell.lineStyle(4, 0x7f6f58, 0.95);
            cardShell.strokeRoundedRect(x, y, cardW, cardH, cardRadius);

            const marble = this.add.graphics();
            marble.lineStyle(1.2, 0xe6dbc7, 0.9);
            for (let i = 0; i < 9; i++) {
                const offset = 12 + i * 18;
                marble.beginPath();
                marble.moveTo(x + 6, y + offset);
                marble.quadraticCurveTo(x + cardW * 0.45, y + offset - 8, x + cardW - 8, y + offset + 4);
                marble.strokePath();
            }

            const frame = this.add.graphics();
            frame.fillStyle(0xdbc9ad, 0.95);
            frame.fillRoundedRect(x + 10, y + 34, cardW - 20, cardH * 0.38, 10);
            frame.lineStyle(2, 0x8d7356, 0.95);
            frame.strokeRoundedRect(x + 10, y + 34, cardW - 20, cardH * 0.38, 10);

            const artBg = this.add.graphics();
            artBg.fillGradientStyle(artStyle.colorA, artStyle.colorA, artStyle.colorB, artStyle.colorB, 1);
            artBg.fillRoundedRect(x + 16, y + 40, cardW - 32, cardH * 0.31, 8);

            const artName = this.add.text(x + cardW / 2, y + 56, card.name, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: `${Math.max(14, Math.floor(cardW * 0.11))}px`,
                color: "#2e2419",
            }).setOrigin(0.5, 0);

            const artIcon = this.add.text(x + cardW / 2, y + 86, artStyle.icon, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: `${Math.max(20, Math.floor(cardW * 0.18))}px`,
                color: "#fff8eb",
            }).setOrigin(0.5);

            const energyBadge = this.add.circle(x + 20, y + 20, 16, 0x2c74d1, 1);
            energyBadge.setStrokeStyle(3, 0xd8ebff, 1);
            const energyCostText = this.add.text(energyBadge.x, energyBadge.y, `${card.cost.energy}`, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: `${Math.max(14, Math.floor(cardW * 0.1))}px`,
                color: "#ffffff",
                fontStyle: "bold",
            }).setOrigin(0.5);

            const spiritBadge = this.add.circle(x + cardW - 20, y + 20, 16, spiritCost > 0 ? 0x9454e6 : 0x69737f, 1);
            spiritBadge.setStrokeStyle(3, spiritCost > 0 ? 0xe7d5ff : 0xc4ccd8, 1);
            const spiritCostText = this.add.text(spiritBadge.x, spiritBadge.y, `${spiritCost}`, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: `${Math.max(14, Math.floor(cardW * 0.1))}px`,
                color: "#ffffff",
                fontStyle: "bold",
            }).setOrigin(0.5);

            const realmEllipse = this.add.ellipse(x + cardW / 2, y + 130, 76, 24, realmBadge.fill, 1);
            realmEllipse.setStrokeStyle(2, realmBadge.stroke, 1);
            const realmText = this.add.text(x + cardW / 2, y + 130, card.realm, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: `${Math.max(12, Math.floor(cardW * 0.085))}px`,
                color: realmBadge.text,
                fontStyle: "bold",
            }).setOrigin(0.5);

            const descPanel = this.add.graphics();
            descPanel.fillStyle(0xe8dcc7, 0.96);
            descPanel.fillRoundedRect(x + 12, y + 144, cardW - 24, cardH - 156, 8);
            descPanel.lineStyle(1.5, 0xa48a68, 0.95);
            descPanel.strokeRoundedRect(x + 12, y + 144, cardW - 24, cardH - 156, 8);

            const descText = this.add.text(x + 20, y + 152, `${card.desc}\n${card.upgradedDesc}`, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: `${Math.max(10, Math.floor(cardW * 0.072))}px`,
                color: "#4b3f31",
                wordWrap: { width: cardW - 40 },
                lineSpacing: 2,
                maxLines: 5,
            });

            const bg = this.add.rectangle(x, y, cardW, cardH, 0xffffff, 0.001).setOrigin(0);

            bg.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
                this.playCultivationCard(card);
            });

            container.add([
                cardShell,
                marble,
                frame,
                artBg,
                artName,
                artIcon,
                energyBadge,
                energyCostText,
                spiritBadge,
                spiritCostText,
                realmEllipse,
                realmText,
                descPanel,
                descText,
                bg,
            ]);
            this.handCardViews.push({ def: card, container });
        });
    }

    private getHandLayout(cardCount: number): HandLayout {
        const safeWidth = this.scale.width - 48;
        const maxCardW = 168;
        const minCardW = 112;
        const gapRatio = 0.1;

        let cardW = maxCardW;
        let gap = Math.round(cardW * gapRatio);
        let totalW = cardCount * cardW + (cardCount - 1) * gap;

        if (totalW > safeWidth) {
            const raw = safeWidth / (cardCount + (cardCount - 1) * gapRatio);
            cardW = Phaser.Math.Clamp(Math.floor(raw), minCardW, maxCardW);
            gap = Math.max(8, Math.round(cardW * gapRatio));
            totalW = cardCount * cardW + (cardCount - 1) * gap;
        }

        const cardH = Math.round(cardW * 1.36);
        const startX = (this.scale.width - totalW) / 2;
        return { cardW, cardH, gap, startX, y: 500 };
    }

    private clearHandViews() {
        this.handCardViews.forEach((v) => v.container.destroy(true));
        this.handCardViews = [];
    }

    private renderCycleCardsArea() {
        const slotW = 150;
        const slotH = 92;
        const slotGap = 14;
        const slotStartX = (this.scale.width - (slotW * 4 + slotGap * 3)) / 2;
        const slotY = this.scale.height - 302;

        this.cycleSlots = [];
        this.cycleSlotObjects = [];
        for (let i = 0; i < 4; i++) {
            const x = slotStartX + i * (slotW + slotGap);
            const bg = this.add
                .rectangle(x, slotY, slotW, slotH, 0xf8f3ea, 0.8)
                .setOrigin(0)
                .setStrokeStyle(2, 0x6c5b47, 0.8);
            const label = this.add.text(x + slotW / 2, slotY + slotH / 2, `第${i + 1}轮\n拖入周期卡`, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: "16px",
                color: "#695744",
                align: "center",
            }).setOrigin(0.5);

            const zone = this.add.zone(x, slotY, slotW, slotH).setOrigin(0);
            zone.setRectangleDropZone(slotW, slotH);

            this.cycleSlots.push({ zone, bg, label });
            this.cycleSlotObjects.push(bg, label, zone);
        }

        const cardW = 118;
        const cardH = 126;
        const cardGap = 16;
        const expandedDeck: CycleCard[] = STARTER_CYCLE_DECK.flatMap((card) =>
            Array.from({ length: card.count }, () => ({ ...card, count: 1 })),
        );
        const cardsTotalW = expandedDeck.length * cardW + (expandedDeck.length - 1) * cardGap;
        const startX = (this.scale.width - cardsTotalW) / 2;
        const cardY = this.scale.height - cardH - 18;

        const cycleCardViews: CycleCardView[] = [];
        this.cycleDeckObjects = [];

        expandedDeck.forEach((card, idx) => {
            const x = startX + idx * (cardW + cardGap);
            const bg = this.add
                .rectangle(x, cardY, cardW, cardH, 0xf5efe3, 0.98)
                .setOrigin(0)
                .setStrokeStyle(2, 0x4d4033, 0.95)
                .setInteractive({ draggable: true, useHandCursor: true });

            const header = this.add.rectangle(x + 8, cardY + 8, cardW - 16, 44, 0xe0d2bb, 0.58).setOrigin(0);
            const nameText = this.add.text(x + cardW / 2, cardY + 18, card.name, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: "21px",
                color: "#2e2419",
            }).setOrigin(0.5, 0);

            const descText = this.add.text(x + 10, cardY + 66, card.desc, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: "14px",
                color: "#5c4d3f",
                wordWrap: { width: cardW - 20 },
            });

            this.cycleDeckObjects.push(bg, header, nameText, descText);
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
                        fontFamily: UI_FONT_FAMILY,
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
                this.cycleSlotObjects.push(deleteBtn, deleteText);
            },
        );
    }

    private updateCycleStageText() {
        this.cycleStageText?.setText(`周期：${this.cycleStageLabels[this.cycleStageIndex]}`);
    }

    private makeButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void): UIButton {
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
                if (button.enabled) onClick();
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
            fontFamily: UI_FONT_FAMILY,
            fontSize: "15px",
            color: "#f6ecdc",
        }).setOrigin(0.5).setDepth(12);

        const btnBaseY = y;
        const textBaseY = y + h / 2;
        const shineBaseY = y + 3;

        btn.on("pointerover", () => {
            if (!button.enabled) return;
            btn.setFillStyle(0x5a4937, 0.98);
        });

        btn.on("pointerout", () => {
            btn.setFillStyle(0x4b3d2f, 0.94);
            btn.setY(btnBaseY);
            btnText.setY(textBaseY);
            shine.setY(shineBaseY);
        });

        const button: UIButton = { bg: btn, text: btnText, shadow, shine, onClick, enabled: true };
        return button;
    }

    private setButtonVisible(button: UIButton, visible: boolean) {
        button.bg.setVisible(visible);
        button.text.setVisible(visible);
        button.shadow.setVisible(visible);
        button.shine.setVisible(visible);
    }

    private setButtonEnabled(button: UIButton, enabled: boolean) {
        button.enabled = enabled;
        if (enabled) {
            button.bg.setFillStyle(0x4b3d2f, 0.94);
            button.bg.setInteractive({ useHandCursor: true });
            button.text.setColor("#f6ecdc");
            return;
        }
        button.bg.disableInteractive();
        button.bg.setFillStyle(0x7a7a7a, 0.95);
        button.text.setColor("#dedede");
    }

    private showToast(msg: string, duration = 1500) {
        const toast = this.add
            .text(this.scale.width / 2, this.scale.height - 42, msg, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: "16px",
                color: "#f9f3e8",
                backgroundColor: "#33281d",
                padding: { x: 10, y: 6 },
            })
            .setOrigin(0.5)
            .setDepth(2000);

        this.time.delayedCall(duration, () => toast.destroy());
    }
}
