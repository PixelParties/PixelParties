// futureTechGun.js - Future Tech Gun equip artifact effect

export class FutureTechGunEffect {
    constructor() {
        this.isInitialized = false;
        this.heroSelection = null;
        this.lastGraveyardGunCount = 0;
    }

    // Initialize with heroSelection reference
    init(heroSelection) {
        if (this.isInitialized) return;
        
        this.heroSelection = heroSelection;
        this.isInitialized = true;
        
        // Set up graveyard change monitoring
        this.setupGraveyardMonitoring();
        
        console.log('FutureTechGun effect system initialized');
    }

    // Set up monitoring for graveyard changes
    setupGraveyardMonitoring() {
        if (!this.heroSelection?.graveyardManager) return;

        // Override the addCard method to trigger stat updates
        const originalAddCard = this.heroSelection.graveyardManager.addCard.bind(this.heroSelection.graveyardManager);
        this.heroSelection.graveyardManager.addCard = (cardName) => {
            const result = originalAddCard(cardName);
            if (result) {
                // Only refresh if a FutureTechGun was added and we have guns equipped
                if (cardName === 'FutureTechGun' && this.hasAnyFutureTechGun()) {
                    const newGunCount = this.heroSelection.graveyardManager.getCardCount('FutureTechGun');
                    if (newGunCount !== this.lastGraveyardGunCount) {
                        this.lastGraveyardGunCount = newGunCount;
                        this.refreshHeroStats();
                    }
                }
            }
            return result;
        };

        // Initialize tracking
        this.lastGraveyardGunCount = this.heroSelection.graveyardManager.getCardCount('FutureTechGun');
    }

    // Called when equipment changes (new gun equipped or removed)
    onEquipmentChange() {
        // Check if any hero has Future Tech Guns equipped
        if (this.hasAnyFutureTechGun()) {
            // Trigger stat recalculation
            this.refreshHeroStats();
        }
    }

    // Check if any hero has a Future Tech Gun equipped
    hasAnyFutureTechGun() {
        if (!this.heroSelection?.heroEquipmentManager) return false;
        
        const allEquipment = this.heroSelection.heroEquipmentManager.getAllEquipment();
        
        for (const position of ['left', 'center', 'right']) {
            const equipment = allEquipment[position] || [];
            const hasGun = equipment.some(item => {
                const name = item.name || item.cardName;
                return name === 'FutureTechGun';
            });
            
            if (hasGun) return true;
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
        
        const gunCount = this.heroSelection.graveyardManager.getCardCount('FutureTechGun');
        const cappedCount = Math.min(gunCount, 15);
        const bonusPerGun = cappedCount * 10;
        
        return {
            gunsInGraveyard: gunCount,
            cappedGunsCount: cappedCount,
            bonusPerEquippedGun: bonusPerGun,
            isCapped: gunCount >= 15
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

        // Count Future Tech Guns equipped on this hero
        const equippedGunCount = equipment.filter(item => {
            const name = item.name || item.cardName;
            return name === 'FutureTechGun';
        }).length;

        if (equippedGunCount === 0) {
            return 0;
        }

        // Count FutureTechGun copies in graveyard
        const graveyardGunCount = this.heroSelection.graveyardManager.getCardCount('FutureTechGun');
        
        // Cap at 15 copies (150 attack max per equipped gun)
        const cappedGraveyardCount = Math.min(graveyardGunCount, 15);
        
        // Calculate bonus: capped graveyard guns * 10 attack * number of equipped guns
        const bonus = cappedGraveyardCount * 10 * equippedGunCount;
        
        return bonus;
    }

    // Reset for new game
    reset() {
        this.lastGraveyardGunCount = 0;
        this.isInitialized = false;
        this.heroSelection = null;
    }

    // Export state (minimal - main calculation is done in calculateEffectiveHeroStats)
    exportState() {
        return {
            lastGraveyardGunCount: this.lastGraveyardGunCount
        };
    }

    // Import state
    importState(stateData) {
        if (stateData) {
            this.lastGraveyardGunCount = stateData.lastGraveyardGunCount || 0;
        }
    }
}

// Create global instance
export const futureTechGunEffect = new FutureTechGunEffect();

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.futureTechGunEffect = futureTechGunEffect;
}

export default futureTechGunEffect;