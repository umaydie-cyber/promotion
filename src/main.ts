import * as Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import CharacterSelectScene from "./scenes/CharacterSelectScene";
import EventScene from "./scenes/EventScene";
import BattleScene from "./scenes/BattleScene";

new Phaser.Game({
    type: Phaser.AUTO,
    parent: "app",
    backgroundColor: "#111827",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 960,
        height: 680,
    },
    scene: [BootScene, CharacterSelectScene, EventScene, BattleScene],
});
