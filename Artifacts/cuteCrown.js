// cuteCrown.js - CuteCrown Equip Artifact that increases CuteBird evolution chances

export class CuteCrownEffect {
    constructor() {
        this.isInitialized = false;
        this.heroSelection = null;
    }

    // Initialize with heroSelection reference
    init(heroSelection) {
        if (this.isInitialized) return;
        
        this.heroSelection = heroSelection;
        this.isInitialized = true;
        
        console.log('CuteCrown effect system initialized');
    }

    // Called when equipment changes (new crown equipped or removed)
    onEquipmentChange() {
        // CuteCrown doesn't need real-time stat updates like Ancient Tech,
        // it only affects evolution chances during post-battle processing
        console.log('CuteCrown equipment updated');
    }

    // Calculate evolution chance bonus for a hero's CuteBirds
    calculateEvolutionChanceBonus(heroPosition) {
        if (!this.heroSelection?.heroEquipmentManager) {
            return 0;
        }

        // Get equipment for this hero
        const equipment = this.heroSelection.heroEquipmentManager.getHeroEquipment(heroPosition);
        if (!equipment || equipment.length === 0) {
            return 0;
        }

        // Count CuteCrowns
        const cuteCrownCount = equipment.filter(item => {
            const name = item.name || item.cardName;
            return name === 'CuteCrown';
        }).length;

        if (cuteCrownCount === 0) {
            return 0;
        }

        // Each CuteCrown adds 10% (0.1) to evolution chance
        const bonus = cuteCrownCount * 0.1;
        
        return bonus;
    }

    // Get evolution chance for a specific hero's CuteBirds (base 10% + crown bonuses)
    getEvolutionChanceForHero(heroPosition) {
        const baseChance = 0.1; // 10% base chance
        const bonus = this.calculateEvolutionChanceBonus(heroPosition);
        const totalChance = baseChance + bonus;
        
        // Cap at 100% to prevent impossible chances
        return Math.min(1.0, totalChance);
    }

    // Check if any hero has CuteCrowns equipped (utility method)
    hasAnyCuteCrown() {
        if (!this.heroSelection?.heroEquipmentManager) return false;
        
        const allEquipment = this.heroSelection.heroEquipmentManager.getAllEquipment();
        
        for (const position of ['left', 'center', 'right']) {
            const equipment = allEquipment[position] || [];
            const hasCuteCrown = equipment.some(item => {
                const name = item.name || item.cardName;
                return name === 'CuteCrown';
            });
            
            if (hasCuteCrown) return true;
        }
        
        return false;
    }

    // Get current bonus information for display (utility method)
    getCurrentBonusInfo() {
        if (!this.heroSelection?.heroEquipmentManager) return null;
        
        const bonusInfo = {};
        const allEquipment = this.heroSelection.heroEquipmentManager.getAllEquipment();
        
        for (const position of ['left', 'center', 'right']) {
            const equipment = allEquipment[position] || [];
            const cuteCrownCount = equipment.filter(item => {
                const name = item.name || item.cardName;
                return name === 'CuteCrown';
            }).length;
            
            if (cuteCrownCount > 0) {
                const evolutionChance = this.getEvolutionChanceForHero(position);
                bonusInfo[position] = {
                    cuteCrownCount: cuteCrownCount,
                    evolutionChanceBonus: cuteCrownCount * 10, // Display as percentage
                    totalEvolutionChance: Math.round(evolutionChance * 100) // Display as percentage
                };
            }
        }
        
        return Object.keys(bonusInfo).length > 0 ? bonusInfo : null;
    }

    // Reset for new game
    reset() {
        this.isInitialized = false;
        this.heroSelection = null;
    }

    // Export state (minimal - no persistent state needed)
    exportState() {
        return {};
    }

    // Import state
    importState(stateData) {
        return true;
    }
}

// Create global instance
export const cuteCrownEffect = new CuteCrownEffect();

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.cuteCrownEffect = cuteCrownEffect;
}

export default cuteCrownEffect;