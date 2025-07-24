// heroSpellbook.js - Hero Spellbook Management Module

import { getCardInfo } from './cardDatabase.js';

export class HeroSpellbookManager {
    constructor() {
        // Track spellbooks for each hero position
        // Each hero has a spellbook that can contain spell cards
        this.heroSpellbooks = {
            left: [],
            center: [],
            right: []
        };
        
        // References to other managers (will be set by heroSelection)
        this.handManager = null;
        this.formationManager = null;
        this.onStateChange = null; // Callback for when state changes
        
        console.log('HeroSpellbookManager initialized');
    }

    // Initialize with references to other managers
    init(handManager, formationManager, onStateChange) {
        this.handManager = handManager;
        this.formationManager = formationManager;
        this.onStateChange = onStateChange;
        console.log('HeroSpellbookManager initialized with manager references');
    }

    // Check if a card is a spell card
    isSpellCard(cardName) {
        const cardInfo = getCardInfo(cardName);
        return cardInfo && cardInfo.cardType === 'Spell';
    }

    // Check if there's a hero at the given position
    hasHeroAtPosition(heroPosition) {
        // Validate position
        if (!this.heroSpellbooks.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return false;
        }
        
        // Use the direct reference to FormationManager
        if (this.formationManager) {
            const formation = this.formationManager.getBattleFormation();
            const hasHero = formation && formation[heroPosition] !== null && formation[heroPosition] !== undefined;
            
            if (!hasHero) {
                console.log(`No hero in formation at position: ${heroPosition}`);
            }
            
            return hasHero;
        }
        
        // If FormationManager is not available, log an error
        console.error('FormationManager reference not available in HeroSpellbookManager');
        return false;
    }

    // Get the spellbook for a specific hero
    getHeroSpellbook(heroPosition) {
        if (!this.heroSpellbooks.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return [];
        }
        
        // Return a copy to prevent external modification
        return [...this.heroSpellbooks[heroPosition]];
    }

    // Add a spell to a hero's spellbook
    addSpellToHero(heroPosition, spellCardName) {
        if (!this.hasHeroAtPosition(heroPosition)) {
            console.log(`Cannot add spell - no hero at position: ${heroPosition}`);
            return false;
        }

        // Get the full card info
        const cardInfo = getCardInfo(spellCardName);
        if (!cardInfo) {
            console.error(`Card not found in database: ${spellCardName}`);
            return false;
        }

        // Verify it's a spell
        if (cardInfo.cardType !== 'Spell') {
            console.error(`Card ${spellCardName} is not a Spell card (type: ${cardInfo.cardType})`);
            return false;
        }

        // Add the full card info to the spellbook
        this.heroSpellbooks[heroPosition].push({
            ...cardInfo,
            addedAt: Date.now() // Track when the spell was added
        });

        console.log(`Added spell ${spellCardName} to ${heroPosition} hero's spellbook`);
        console.log(`${heroPosition} hero now has ${this.heroSpellbooks[heroPosition].length} spells`);
        
        // Notify state change
        if (this.onStateChange) {
            this.onStateChange();
        }

        return true;
    }

    // Remove a spell from a hero's spellbook by index
    removeSpellFromHero(heroPosition, spellIndex) {
        if (!this.heroSpellbooks.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return null;
        }

        const spellbook = this.heroSpellbooks[heroPosition];
        if (spellIndex < 0 || spellIndex >= spellbook.length) {
            console.error(`Invalid spell index: ${spellIndex}`);
            return null;
        }

        // Remove and return the spell
        const removedSpell = spellbook.splice(spellIndex, 1)[0];
        console.log(`Removed spell ${removedSpell.name} from ${heroPosition} hero's spellbook`);
        
        // Notify state change
        if (this.onStateChange) {
            this.onStateChange();
        }

        return removedSpell;
    }

    // Check if a hero has a specific spell
    heroHasSpell(heroPosition, spellName) {
        const spellbook = this.getHeroSpellbook(heroPosition);
        return spellbook.some(spell => spell.name === spellName);
    }

    // Get count of a specific spell in hero's spellbook
    getSpellCount(heroPosition, spellName) {
        const spellbook = this.getHeroSpellbook(heroPosition);
        return spellbook.filter(spell => spell.name === spellName).length;
    }

    // Clear spellbook when hero is removed from position
    clearHeroSpellbook(heroPosition) {
        if (!this.heroSpellbooks.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return;
        }

        this.heroSpellbooks[heroPosition] = [];
        console.log(`Cleared spellbook for ${heroPosition} hero`);
    }

    // Move spellbook when heroes swap positions
    moveHeroSpellbook(fromPosition, toPosition) {
        if (!this.heroSpellbooks.hasOwnProperty(fromPosition) || 
            !this.heroSpellbooks.hasOwnProperty(toPosition)) {
            console.error(`Invalid hero positions: ${fromPosition} or ${toPosition}`);
            return;
        }

        // Swap spellbooks
        const temp = this.heroSpellbooks[fromPosition];
        this.heroSpellbooks[fromPosition] = this.heroSpellbooks[toPosition];
        this.heroSpellbooks[toPosition] = temp;
        
        console.log(`Swapped spellbooks between ${fromPosition} and ${toPosition}`);
    }

    // Update hero placement (called when formation changes)
    updateHeroPlacement(heroPosition, heroData) {
        if (!heroData) {
            // Hero removed from this position
            this.clearHeroSpellbook(heroPosition);
        }
        // If hero is placed, keep existing spellbook (spells persist)
    }

    // Get all spells across all heroes
    getAllSpells() {
        const allSpells = [];
        
        for (const position in this.heroSpellbooks) {
            const spellbook = this.heroSpellbooks[position];
            spellbook.forEach(spell => {
                allSpells.push({
                    ...spell,
                    heroPosition: position
                });
            });
        }
        
        return allSpells;
    }

    // Get total spell count across all heroes
    getTotalSpellCount() {
        let total = 0;
        for (const position in this.heroSpellbooks) {
            total += this.heroSpellbooks[position].length;
        }
        return total;
    }

    // Export state for saving
    exportSpellbooksState() {
        // Deep copy the spellbooks
        const exportState = {};
        for (const position in this.heroSpellbooks) {
            exportState[position] = this.heroSpellbooks[position].map(spell => ({ ...spell }));
        }
        
        return {
            heroSpellbooks: exportState
        };
    }

    // Import state for loading
    importSpellbooksState(state) {
        if (!state || !state.heroSpellbooks) {
            console.log('No spellbook state to import');
            return false;
        }

        // Validate the structure
        const validPositions = ['left', 'center', 'right'];
        for (const position of validPositions) {
            if (state.heroSpellbooks[position] && Array.isArray(state.heroSpellbooks[position])) {
                this.heroSpellbooks[position] = state.heroSpellbooks[position].map(spell => ({ ...spell }));
            } else {
                this.heroSpellbooks[position] = [];
            }
        }

        console.log('Imported hero spellbooks state');
        console.log('Total spells across all heroes:', this.getTotalSpellCount());
        
        return true;
    }

    // Reset to initial state
    reset() {
        this.heroSpellbooks = {
            left: [],
            center: [],
            right: []
        };
        
        this.handManager = null;
        this.formationManager = null;
        this.onStateChange = null;
        
        console.log('HeroSpellbookManager reset');
    }

    // Debug method to log current state
    logSpellbookState() {
        console.log('=== HERO SPELLBOOK STATE ===');
        for (const position in this.heroSpellbooks) {
            const spellbook = this.heroSpellbooks[position];
            console.log(`${position} hero: ${spellbook.length} spells`);
            spellbook.forEach((spell, index) => {
                console.log(`  [${index}] ${spell.name} (Level ${spell.level || 0})`);
            });
        }
        console.log(`Total spells: ${this.getTotalSpellCount()}`);
        console.log('===========================');
    }
}

// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.HeroSpellbookManager = HeroSpellbookManager;
}