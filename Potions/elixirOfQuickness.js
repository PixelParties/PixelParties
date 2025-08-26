// Potions/elixirOfQuickness.js - ElixirOfQuickness Potion Implementation - Draw Extra Cards Only

export class ElixirOfQuicknessPotion {
    constructor() {
        this.name = 'ElixirOfQuickness';
        this.displayName = 'Elixir of Quickness';
        this.description = 'Draw 2 cards instead of 1 when used. Has no battle effects.';
        this.effectType = 'card_draw';
        this.targetType = 'self';
        this.extraCardsDraw = 1; // Draws 1 additional card (2 total instead of 1)
        
        console.log('ElixirOfQuickness potion initialized - card draw only, no battle effects');
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is ElixirOfQuickness
    static isElixirOfQuickness(potionName) {
        return potionName === 'ElixirOfQuickness';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'ElixirOfQuickness',
            displayName: 'Elixir of Quickness',
            description: 'Draw 2 cards instead of 1 when used. Has no battle effects.',
            cardType: 'Potion',
            cost: 0,
            effect: 'Immediately draws 2 cards instead of the normal 1 card when consumed',
            extraCardsDraw: 1,
            hasBattleEffects: false
        };
    }

    // Static method to create a new instance
    static create() {
        return new ElixirOfQuicknessPotion();
    }

    // Static method to get extra cards to draw (utility for potionHandler)
    static getExtraCardsToDraw() {
        return 1; // Draw 1 additional card (2 total instead of 1)
    }

    // ===== NOTE: NO BATTLE EFFECT METHODS =====
    // ElixirOfQuickness has no battle effects, so no handlePotionEffectsForPlayer method
    // or other battle-related methods are implemented. This keeps it simple and focused
    // on its single purpose: drawing extra cards when consumed.
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.ElixirOfQuicknessPotion = ElixirOfQuicknessPotion;
}

console.log('ElixirOfQuickness potion module loaded - card draw only, no battle effects');