// heroSpellbook.js - Hero Spellbook Management Module with Spell Toggle Functionality

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
    }

    // Initialize with references to other managers
    init(handManager, formationManager, onStateChange) {
        this.handManager = handManager;
        this.formationManager = formationManager;
        this.onStateChange = onStateChange;
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

        // NEW RULE: Check if spell has "Area" subtype - Heroes cannot learn Area spells
        if (cardInfo.subtype === 'Area') {
            console.error(`Card ${spellCardName} cannot be learned by heroes (Area subtype spells are restricted)`);
            return false;
        }

        // Add the full card info to the spellbook with enabled state
        this.heroSpellbooks[heroPosition].push({
            ...cardInfo,
            addedAt: Date.now(), // Track when the spell was added
            enabled: true // NEW: All spells start enabled by default
        });
        
        // Notify state change
        if (this.onStateChange) {
            this.onStateChange();
        }

        return true;
    }

    // Check if a hero's spellbook is locked
    isSpellbookLocked(heroPosition) {
        if (!this.formationManager) return false;
        
        const formation = this.formationManager.getBattleFormation();
        const hero = formation?.[heroPosition];
        return hero?.spellbookLocked || false;
    }

    // Lock spellbook and reactivate all spells
    lockHeroSpellbook(heroPosition) {
        if (!this.formationManager) return false;
        
        const formation = this.formationManager.getBattleFormation();
        const hero = formation?.[heroPosition];
        if (!hero) return false;
        
        // Set the lock flag
        hero.spellbookLocked = true;
        
        // Reactivate all disabled spells
        const spellbook = this.heroSpellbooks[heroPosition];
        let reactivatedCount = 0;
        
        spellbook.forEach(spell => {
            if (spell.enabled === false) {
                spell.enabled = true;
                reactivatedCount++;
            }
        });
                
        // Notify state change
        if (this.onStateChange) {
            this.onStateChange();
        }
        
        return true;
    }

    // Modified toggleSpellEnabled method
    toggleSpellEnabled(heroPosition, spellIndex) {
        if (!this.heroSpellbooks.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return false;
        }

        // Check if spellbook is locked
        if (this.isSpellbookLocked(heroPosition)) {
            return false;
        }

        const spellbook = this.heroSpellbooks[heroPosition];
        if (spellIndex < 0 || spellIndex >= spellbook.length) {
            console.error(`Invalid spell index: ${spellIndex}`);
            return false;
        }

        // Toggle the enabled state
        spellbook[spellIndex].enabled = !spellbook[spellIndex].enabled;
                
        // Notify state change for persistence
        if (this.onStateChange) {
            this.onStateChange();
        }

        return spellbook[spellIndex].enabled;
    }

    // Check if a specific spell is enabled
    isSpellEnabled(heroPosition, spellIndex) {
        if (!this.heroSpellbooks.hasOwnProperty(heroPosition)) {
            return false;
        }

        const spellbook = this.heroSpellbooks[heroPosition];
        if (spellIndex < 0 || spellIndex >= spellbook.length) {
            return false;
        }

        // Return enabled state (default to true for backward compatibility)
        return spellbook[spellIndex].enabled !== false;
    }

    // Check if a hero can learn a specific spell (NEW: includes Area restriction)
    canHeroLearnSpell(heroPosition, spellCardName) {
        if (!this.hasHeroAtPosition(heroPosition)) {
            return { canLearn: false, reason: 'No hero at this position' };
        }

        const cardInfo = getCardInfo(spellCardName);
        if (!cardInfo) {
            return { canLearn: false, reason: 'Card not found in database' };
        }

        if (cardInfo.cardType !== 'Spell') {
            return { canLearn: false, reason: 'Card is not a Spell' };
        }

        // Check for Area subtype restriction
        if (cardInfo.subtype === 'Area') {
            return { canLearn: false, reason: 'Heroes cannot learn Area spells' };
        }

        return { canLearn: true, reason: 'Spell can be learned' };
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

    // Get statistics about learnable vs non-learnable spells (NEW)
    getSpellRestrictionStats() {
        const allCardNames = Object.keys(window.heroSelection?.cardDatabase || {});
        const spellCards = allCardNames.filter(cardName => {
            const cardInfo = getCardInfo(cardName);
            return cardInfo && cardInfo.cardType === 'Spell';
        });
        
        const areaSpells = spellCards.filter(cardName => {
            const cardInfo = getCardInfo(cardName);
            return cardInfo && cardInfo.subtype === 'Area';
        });
        
        const learnableSpells = spellCards.filter(cardName => {
            const cardInfo = getCardInfo(cardName);
            return cardInfo && cardInfo.subtype !== 'Area';
        });
        
        return {
            totalSpells: spellCards.length,
            areaSpells: areaSpells.length,
            learnableSpells: learnableSpells.length,
            restrictedSpells: areaSpells,
            restriction: 'Heroes cannot learn Area spells'
        };
    }

    // Export state for saving
    exportSpellbooksState() {
        // Deep copy the spellbooks (enabled state will be included automatically)
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
            return false;
        }

        // Validate the structure
        const validPositions = ['left', 'center', 'right'];
        for (const position of validPositions) {
            if (state.heroSpellbooks[position] && Array.isArray(state.heroSpellbooks[position])) {
                // Filter out any Area spells that might have been saved before this restriction
                const filteredSpells = state.heroSpellbooks[position].filter(spell => {
                    if (spell.subtype === 'Area') {
                        console.warn(`Removing Area spell "${spell.name}" from ${position} hero during state import (now restricted)`);
                        return false;
                    }
                    return true;
                });
                
                this.heroSpellbooks[position] = filteredSpells.map(spell => {
                    // Ensure backward compatibility for spells without enabled property
                    return {
                        ...spell,
                        enabled: spell.enabled !== false // Default to true if not specified
                    };
                });
            } else {
                this.heroSpellbooks[position] = [];
            }
        }        
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
    }
}

// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.HeroSpellbookManager = HeroSpellbookManager;
}