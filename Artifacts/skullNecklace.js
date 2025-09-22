// skullNecklace.js - Skull Necklace equip artifact effect

export class SkullNecklaceEffect {
    constructor() {
        this.isInitialized = false;
        this.heroSelection = null;
        this.lastGraveyardSize = 0;
    }

    // Initialize with heroSelection reference
    init(heroSelection) {
        if (this.isInitialized) return;
        
        this.heroSelection = heroSelection;
        this.isInitialized = true;
        
        // Set up graveyard change monitoring
        this.setupGraveyardMonitoring();
        
        console.log('SkullNecklace effect system initialized');
    }

    // Set up monitoring for graveyard changes
    setupGraveyardMonitoring() {
        if (!this.heroSelection?.graveyardManager) return;

        // Override the addCard method to trigger stat updates
        const originalAddCard = this.heroSelection.graveyardManager.addCard.bind(this.heroSelection.graveyardManager);
        this.heroSelection.graveyardManager.addCard = (cardName) => {
            const result = originalAddCard(cardName);
            if (result) {
                // Check if graveyard size changed
                const newGraveyardSize = this.heroSelection.graveyardManager.getSize();
                if (newGraveyardSize !== this.lastGraveyardSize) {
                    this.lastGraveyardSize = newGraveyardSize;
                    
                    // Trigger stat recalculation for all heroes
                    this.refreshHeroStats();
                }
            }
            return result;
        };

        // Initialize tracking
        this.lastGraveyardSize = this.heroSelection.graveyardManager.getSize();
    }

    // Called when equipment changes (new skull necklace equipped or removed)
    onEquipmentChange() {
        // Check if any hero has skull necklaces equipped
        if (this.hasAnySkullNecklace()) {
            // Trigger stat recalculation
            this.refreshHeroStats();
        }
    }

    // Check if any hero has a Skull Necklace equipped
    hasAnySkullNecklace() {
        if (!this.heroSelection?.heroEquipmentManager) return false;
        
        const allEquipment = this.heroSelection.heroEquipmentManager.getAllEquipment();
        
        for (const position of ['left', 'center', 'right']) {
            const equipment = allEquipment[position] || [];
            const hasSkullNecklace = equipment.some(item => {
                const name = item.name || item.cardName;
                return name === 'SkullNecklace';
            });
            
            if (hasSkullNecklace) return true;
        }
        
        return false;
    }

    // Trigger hero stat refresh through the existing system
    refreshHeroStats() {
        // Small delay to ensure all state is updated
        setTimeout(() => {
            // Use the existing stat refresh system
            if (this.heroSelection?.refreshHeroStats) {
                this.heroSelection.refreshHeroStats();
            }
            
            // Also trigger individual position updates if available
            if (window.updateAllHeroStats) {
                window.updateAllHeroStats();
            }
        }, 50);
    }

    // Get current bonus information for display (utility method)
    getCurrentBonusInfo() {
        if (!this.heroSelection?.graveyardManager) return null;
        
        const totalCards = this.heroSelection.graveyardManager.getSize();
        const bonusPerNecklace = totalCards;
        
        return {
            totalCardsInGraveyard: totalCards,
            bonusPerSkullNecklace: bonusPerNecklace
        };
    }

    // Calculate attack bonus for a hero (used by calculateEffectiveHeroStats)
    calculateAttackBonus(heroPosition) {
        if (!this.heroSelection?.heroEquipmentManager || !this.heroSelection?.graveyardManager) {
            return 0;
        }

        // Get equipment for this hero
        const equipment = this.heroSelection.heroEquipmentManager.getHeroEquipment(heroPosition);
        if (!equipment || equipment.length === 0) {
            return 0;
        }

        // Count skull necklaces
        const skullNecklaceCount = equipment.filter(item => {
            const name = item.name || item.cardName;
            return name === 'SkullNecklace';
        }).length;

        if (skullNecklaceCount === 0) {
            return 0;
        }

        // Calculate bonus: total cards in graveyard * 1 * number of skull necklaces
        const totalCards = this.heroSelection.graveyardManager.getSize();
        const bonus = totalCards * 1 * skullNecklaceCount;
        
        return bonus;
    }

    // Reset for new game
    reset() {
        this.lastGraveyardSize = 0;
        this.isInitialized = false;
        this.heroSelection = null;
    }

    // Export state (minimal - main calculation is done in calculateEffectiveHeroStats)
    exportState() {
        return {
            lastGraveyardSize: this.lastGraveyardSize
        };
    }

    // Import state
    importState(stateData) {
        if (stateData) {
            this.lastGraveyardSize = stateData.lastGraveyardSize || 0;
        }
    }
}

// Create global instance
export const skullNecklaceEffect = new SkullNecklaceEffect();

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.skullNecklaceEffect = skullNecklaceEffect;
}

export default skullNecklaceEffect;