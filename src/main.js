import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import CharacterSelectScene from "./scenes/CharacterSelectScene";
import EventScene from "./scenes/EventScene";
import BattleScene from "./scenes/BattleScene";
new Phaser.Game({
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    parent: "app",
    backgroundColor: "#111827",
    scene: [BootScene, CharacterSelectScene, EventScene, BattleScene],
});
