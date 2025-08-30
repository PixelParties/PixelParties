// ancientTechInfiniteEnergyCore.js - Simplified Ancient Tech Infinite Energy Core effects

export class AncientTechInfiniteEnergyCoreEffect {
    constructor() {
        this.isInitialized = false;
        this.heroSelection = null;
        this.lastGraveyardSize = 0;
        this.lastUniqueCardCount = 0;
    }

    // Initialize with heroSelection reference
    init(heroSelection) {
        if (this.isInitialized) return;
        
        this.heroSelection = heroSelection;
        this.isInitialized = true;
        
        // Set up graveyard change monitoring
        this.setupGraveyardMonitoring();
        
        console.log('AncientTechInfiniteEnergyCore effect system initialized');
    }

    // Set up monitoring for graveyard changes
    setupGraveyardMonitoring() {
        if (!this.heroSelection?.graveyardManager) return;

        // Override the addCard method to trigger stat updates
        const originalAddCard = this.heroSelection.graveyardManager.addCard.bind(this.heroSelection.graveyardManager);
        this.heroSelection.graveyardManager.addCard = (cardName) => {
            const result = originalAddCard(cardName);
            if (result) {
                // Check if unique card count changed
                const newUniqueCount = this.heroSelection.graveyardManager.getUniqueCards().length;
                if (newUniqueCount !== this.lastUniqueCardCount) {
                    this.lastUniqueCardCount = newUniqueCount;
                    
                    // Trigger stat recalculation for all heroes
                    this.refreshHeroStats();
                }
            }
            return result;
        };

        // Initialize tracking
        this.lastUniqueCardCount = this.heroSelection.graveyardManager.getUniqueCards().length;
    }

    // Called when equipment changes (new energy core equipped or removed)
    onEquipmentChange() {
        // Check if any hero has energy cores equipped
        if (this.hasAnyEnergyCore()) {
            // Trigger stat recalculation
            this.refreshHeroStats();
        }
    }

    // Check if any hero has an Ancient Tech Infinite Energy Core equipped
    hasAnyEnergyCore() {
        if (!this.heroSelection?.heroEquipmentManager) return false;
        
        const allEquipment = this.heroSelection.heroEquipmentManager.getAllEquipment();
        
        for (const position of ['left', 'center', 'right']) {
            const equipment = allEquipment[position] || [];
            const hasEnergyCore = equipment.some(item => {
                const name = item.name || item.cardName;
                return name === 'AncientTechInfiniteEnergyCore';
            });
            
            if (hasEnergyCore) return true;
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
        
        const uniqueCardCount = this.heroSelection.graveyardManager.getUniqueCards().length;
        const bonusPerCore = uniqueCardCount * 10;
        
        return {
            uniqueCardsInGraveyard: uniqueCardCount,
            bonusPerEnergyCore: bonusPerCore
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

        // Count energy cores
        const energyCoreCount = equipment.filter(item => {
            const name = item.name || item.cardName;
            return name === 'AncientTechInfiniteEnergyCore';
        }).length;

        if (energyCoreCount === 0) {
            return 0;
        }

        // Calculate bonus: unique cards in graveyard * 10 * number of energy cores
        const uniqueCardCount = this.heroSelection.graveyardManager.getUniqueCards().length;
        const bonus = uniqueCardCount * 10 * energyCoreCount;
        
        return bonus;
    }

    // Reset for new game
    reset() {
        this.lastGraveyardSize = 0;
        this.lastUniqueCardCount = 0;
        this.isInitialized = false;
        this.heroSelection = null;
    }

    // Export state (minimal - main calculation is done in calculateEffectiveHeroStats)
    exportState() {
        return {
            lastUniqueCardCount: this.lastUniqueCardCount,
            lastGraveyardSize: this.lastGraveyardSize
        };
    }

    // Import state
    importState(stateData) {
        if (stateData) {
            this.lastUniqueCardCount = stateData.lastUniqueCardCount || 0;
            this.lastGraveyardSize = stateData.lastGraveyardSize || 0;
        }
    }
}

// Create global instance
export const ancientTechInfiniteEnergyCoreEffect = new AncientTechInfiniteEnergyCoreEffect();

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.ancientTechInfiniteEnergyCoreEffect = ancientTechInfiniteEnergyCoreEffect;
}

export default ancientTechInfiniteEnergyCoreEffect;