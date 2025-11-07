// futureTechLaserCannon.js - Future Tech Laser Cannon equip artifact effect
// Always gives +100 Attack, but cost reduces by 10 per copy in graveyard (min 0)

import { getCardInfo } from '../cardDatabase.js';

export class FutureTechLaserCannonEffect {
    constructor() {
        this.isInitialized = false;
        this.heroSelection = null;
        this.BASE_COST = 100; // Default base cost (can be overridden by card database)
        this.COST_REDUCTION_PER_COPY = 10;
        this.ATTACK_BONUS = 100; // Fixed attack bonus
    }

    // Initialize with heroSelection reference
    init(heroSelection) {
        if (this.isInitialized) return;
        
        this.heroSelection = heroSelection;
        this.isInitialized = true;
        
        // Try to get base cost from card database
        const cardInfo = getCardInfo('FutureTechLaserCannon');
        if (cardInfo && typeof cardInfo.cost === 'number') {
            this.BASE_COST = cardInfo.cost;
        }
        
        console.log('FutureTechLaserCannon effect system initialized');
    }

    // Calculate the effective cost based on graveyard count
    calculateEffectiveCost() {
        if (!this.heroSelection?.graveyardManager) {
            return this.BASE_COST;
        }

        // Count FutureTechLaserCannon copies in graveyard
        const graveyardCount = this.heroSelection.graveyardManager.getCardCount('FutureTechLaserCannon');
        
        // Calculate cost reduction
        const costReduction = graveyardCount * this.COST_REDUCTION_PER_COPY;
        
        // Calculate effective cost (minimum 0)
        const effectiveCost = Math.max(0, this.BASE_COST - costReduction);
        
        return effectiveCost;
    }

    // Get cost information for display
    getCostInfo() {
        const graveyardCount = this.heroSelection?.graveyardManager?.getCardCount('FutureTechLaserCannon') || 0;
        const effectiveCost = this.calculateEffectiveCost();
        const costReduction = graveyardCount * this.COST_REDUCTION_PER_COPY;
        
        return {
            baseCost: this.BASE_COST,
            graveyardCount: graveyardCount,
            costReduction: costReduction,
            effectiveCost: effectiveCost,
            isMinimum: effectiveCost === 0
        };
    }

    // Calculate attack bonus for a hero (always +100 if equipped)
    calculateAttackBonus(heroPosition) {
        if (!this.heroSelection?.heroEquipmentManager) {
            return 0;
        }

        // Get equipment for this hero
        const equipment = this.heroSelection.heroEquipmentManager.getHeroEquipment(heroPosition);
        if (!equipment || equipment.length === 0) {
            return 0;
        }

        // Count FutureTechLaserCannon equipped on this hero
        const equippedCount = equipment.filter(item => {
            const name = item.name || item.cardName;
            return name === 'FutureTechLaserCannon';
        }).length;

        // Return fixed bonus per equipped cannon
        return equippedCount * this.ATTACK_BONUS;
    }

    // Called when equipment changes (not really needed for this artifact but kept for consistency)
    onEquipmentChange() {
        // Laser Cannon doesn't need to refresh stats on equipment change
        // since it provides a fixed bonus, but we keep this method for consistency
    }

    // Reset for new game
    reset() {
        this.isInitialized = false;
        this.heroSelection = null;
    }

    // Export state (minimal)
    exportState() {
        return {
            baseCost: this.BASE_COST
        };
    }

    // Import state
    importState(stateData) {
        if (stateData && typeof stateData.baseCost === 'number') {
            this.BASE_COST = stateData.baseCost;
        }
    }
}

// Create global instance
export const futureTechLaserCannonEffect = new FutureTechLaserCannonEffect();

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.futureTechLaserCannonEffect = futureTechLaserCannonEffect;
}

export default futureTechLaserCannonEffect;