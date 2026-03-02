import type { CardInstance } from "./CardInstance";

function shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export class CombatDeck {
    drawPile: CardInstance[] = [];
    discardPile: CardInstance[] = [];
    hand: CardInstance[] = [];

    constructor(starter: CardInstance[]) {
        this.drawPile = shuffle([...starter]);
    }

    drawToHandSize(size: number, onShuffle?: () => void) {
        while (this.hand.length < size) {
            const c = this.drawOne(onShuffle);
            if (!c) break;
            this.hand.push(c);
        }
    }

    drawOne(onShuffle?: () => void): CardInstance | null {
        if (this.drawPile.length === 0) {
            if (this.discardPile.length === 0) return null;
            this.drawPile = shuffle(this.discardPile);
            this.discardPile = [];
            onShuffle?.();
        }
        return this.drawPile.pop() ?? null;
    }

    discardHand() {
        this.discardPile.push(...this.hand);
        this.hand = [];
    }

    moveHandCardToDiscard(indexInHand: number) {
        const [used] = this.hand.splice(indexInHand, 1);
        if (used) this.discardPile.push(used);
    }
}
