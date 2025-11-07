// heroEquipment.js - Hero Equipment Management System

import { getCardInfo } from './cardDatabase.js';

export class HeroEquipmentManager {
    constructor() {
        // Equipment storage per hero position
        this.heroEquipment = {
            left: [],
            center: [],
            right: []
        };
        
        // References to other managers
        this.handManager = null;
        this.formationManager = null;
        this.goldManager = null;
        this.onEquipmentChangeCallback = null;
    }
    
    // Initialize with dependencies
    init(handManager, formationManager, goldManager, onEquipmentChangeCallback) {
        this.handManager = handManager;
        this.formationManager = formationManager;
        this.goldManager = goldManager;
        this.onEquipmentChangeCallback = onEquipmentChangeCallback;
    }
    
    // Check if a card is an equip artifact
    isEquipArtifactCard(cardName) {
        const cardInfo = getCardInfo(cardName);
        return cardInfo && cardInfo.cardType === 'Artifact' && cardInfo.subtype === 'Equip';
    }
    
    // Get the effective cost of an artifact (handles dynamic costs)
    getArtifactEffectiveCost(artifactCardName) {
        // Check for special artifacts with dynamic costs
        if (artifactCardName === 'FutureTechLaserCannon' && window.futureTechLaserCannonEffect) {
            return window.futureTechLaserCannonEffect.calculateEffectiveCost();
        }
        
        // Default: return base cost from card database
        const artifactInfo = getCardInfo(artifactCardName);
        return artifactInfo?.cost || 0;
    }
    
    // Add an artifact to a hero's equipment
    addArtifactToHero(heroPosition, artifactCardName) {
        // Validate position
        if (!['left', 'center', 'right'].includes(heroPosition)) {
            return { success: false, reason: 'Invalid hero position!' };
        }
        
        // Check if there's a hero at this position
        const formation = this.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        if (!hero) {
            return { success: false, reason: 'No hero at this position!' };
        }
        
        // Get artifact info
        const artifactInfo = getCardInfo(artifactCardName);
        if (!artifactInfo) {
            return { success: false, reason: 'Invalid artifact!' };
        }
        
        // Check if it's an equip artifact
        if (!this.isEquipArtifactCard(artifactCardName)) {
            return { success: false, reason: `${artifactCardName} is not an Equip artifact!` };
        }
        
        // Check if player can afford it
        const artifactCost = this.getArtifactEffectiveCost(artifactCardName);
        if (this.goldManager) {
            const playerGold = this.goldManager.getPlayerGold();
            if (playerGold < artifactCost) {
                return { 
                    success: false, 
                    reason: `Not enough gold! Need ${artifactCost} gold but only have ${playerGold}.`
                };
            }
        }
        
        // Add artifact to hero's equipment
        const equipmentEntry = {
            name: artifactCardName,
            cardName: artifactCardName,
            cost: artifactCost,
            image: artifactInfo.image || `./Cards/All/${artifactCardName}.png`,
            equippedAt: Date.now()
        };
        
        this.heroEquipment[heroPosition].push(equipmentEntry);
        
        // Deduct gold if cost > 0
        if (artifactCost > 0 && this.goldManager) {
            this.goldManager.addPlayerGold(-artifactCost, `equipped_${artifactCardName}`);
        }
                
        // Trigger Ancient Tech effect update if this is an Energy Core
        if (artifactCardName === 'AncientTechInfiniteEnergyCore' && 
            window.ancientTechInfiniteEnergyCoreEffect) {
            window.ancientTechInfiniteEnergyCoreEffect.onEquipmentChange();
        }
        // Trigger Skull Necklace effect update if this is a Skull Necklace
        if (artifactCardName === 'SkullNecklace' && 
            window.skullNecklaceEffect) {
            window.skullNecklaceEffect.onEquipmentChange();
        }
        // Trigger Future Tech Gun effect update if this is a Future Tech Gun
        if (artifactCardName === 'FutureTechGun' && 
            window.futureTechGunEffect) {
            window.futureTechGunEffect.onEquipmentChange();
        }
        // Trigger Future Tech Laser Cannon effect update if this is a Future Tech Laser Cannon
        if (artifactCardName === 'FutureTechLaserCannon' && 
            window.futureTechLaserCannonEffect) {
            window.futureTechLaserCannonEffect.onEquipmentChange();
        }
        
        // Trigger callback
        if (this.onEquipmentChangeCallback) {
            this.onEquipmentChangeCallback({
                type: 'artifact_equipped',
                heroPosition,
                artifactName: artifactCardName,
                hero: hero
            });
        }
        
        return { success: true };
    }
    
    // Remove an artifact from a hero's equipment
    removeArtifactFromHero(heroPosition, artifactIndex) {
        if (!['left', 'center', 'right'].includes(heroPosition)) {
            return null;
        }
        
        const equipment = this.heroEquipment[heroPosition];
        if (artifactIndex < 0 || artifactIndex >= equipment.length) {
            return null;
        }
        
        const removedArtifact = equipment.splice(artifactIndex, 1)[0];
                
        // Trigger callback
        if (this.onEquipmentChangeCallback) {
            this.onEquipmentChangeCallback({
                type: 'artifact_removed',
                heroPosition,
                artifactName: removedArtifact.name
            });
        }
        
        return removedArtifact;
    }
    
    // Get equipment for a specific hero (sorted alphabetically)
    getHeroEquipment(heroPosition) {
        if (!['left', 'center', 'right'].includes(heroPosition)) {
            return [];
        }
        
        // Return sorted copy
        return [...this.heroEquipment[heroPosition]].sort((a, b) => {
            const nameA = a.name || a.cardName || '';
            const nameB = b.name || b.cardName || '';
            return nameA.localeCompare(nameB);
        });
    }
    
    // Get all equipment
    getAllEquipment() {
        return {
            left: this.getHeroEquipment('left'),
            center: this.getHeroEquipment('center'),
            right: this.getHeroEquipment('right')
        };
    }
    
    // Clear equipment for a specific hero
    clearHeroEquipment(heroPosition) {
        if (['left', 'center', 'right'].includes(heroPosition)) {
            this.heroEquipment[heroPosition] = [];
        }
    }
    
    // Move hero equipment when heroes swap positions
    moveHeroEquipment(fromPosition, toPosition) {
        if (!['left', 'center', 'right'].includes(fromPosition) || 
            !['left', 'center', 'right'].includes(toPosition)) {
            return;
        }
        
        // If swapping, we need to swap equipment
        const fromEquipment = [...this.heroEquipment[fromPosition]];
        const toEquipment = [...this.heroEquipment[toPosition]];
        
        this.heroEquipment[fromPosition] = toEquipment;
        this.heroEquipment[toPosition] = fromEquipment;
    }
    
    // Check if hero has a specific artifact equipped
    heroHasArtifact(heroPosition, artifactName) {
        return this.getHeroEquipment(heroPosition).some(
            item => item.name === artifactName || item.cardName === artifactName
        );
    }
    
    // Get total equipment count for a hero
    getHeroEquipmentCount(heroPosition) {
        return this.getHeroEquipment(heroPosition).length;
    }
    
    // Get total equipment value for a hero
    getHeroEquipmentValue(heroPosition) {
        return this.getHeroEquipment(heroPosition).reduce(
            (total, item) => total + (item.cost || 0), 0
        );
    }
    
    // Export equipment state for persistence
    exportEquipmentState() {
        return {
            heroEquipment: {
                left: [...this.heroEquipment.left],
                center: [...this.heroEquipment.center],
                right: [...this.heroEquipment.right]
            },
            timestamp: Date.now()
        };
    }
    
    // Import equipment state for restoration
    importEquipmentState(state) {
        if (!state || !state.heroEquipment) {
            console.error('Invalid equipment state provided');
            return false;
        }
        
        try {
            // Restore equipment for each position
            ['left', 'center', 'right'].forEach(position => {
                if (Array.isArray(state.heroEquipment[position])) {
                    this.heroEquipment[position] = [...state.heroEquipment[position]];
                }
            });
            
            return true;
        } catch (error) {
            console.error('Error importing equipment state:', error);
            return false;
        }
    }
    
    // Reset all equipment
    reset() {
        this.heroEquipment = {
            left: [],
            center: [],
            right: []
        };
    }
    
    // Get equipment statistics
    getEquipmentStats() {
        const stats = {
            totalEquipment: 0,
            totalValue: 0,
            byPosition: {}
        };
        
        ['left', 'center', 'right'].forEach(position => {
            const equipment = this.getHeroEquipment(position);
            const value = this.getHeroEquipmentValue(position);
            
            stats.byPosition[position] = {
                count: equipment.length,
                value: value,
                items: equipment.map(e => e.name || e.cardName)
            };
            
            stats.totalEquipment += equipment.length;
            stats.totalValue += value;
        });
        
        return stats;
    }

    canEquipArtifact(heroPosition, artifactCardName) {
        // Validate position
        if (!['left', 'center', 'right'].includes(heroPosition)) {
            return { canEquip: false, reason: 'Invalid hero position!' };
        }
        
        // Check if there's a hero at this position
        const formation = this.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        if (!hero) {
            return { canEquip: false, reason: 'No hero at this position!' };
        }
        
        // Get artifact info
        const artifactInfo = getCardInfo(artifactCardName);
        if (!artifactInfo) {
            return { canEquip: false, reason: 'Invalid artifact!' };
        }
        
        // Check if it's an equip artifact
        if (!this.isEquipArtifactCard(artifactCardName)) {
            return { canEquip: false, reason: `${artifactCardName} is not an Equip artifact!` };
        }
        
        // Check if player can afford it
        const artifactCost = this.getArtifactEffectiveCost(artifactCardName);
        if (this.goldManager) {
            const playerGold = this.goldManager.getPlayerGold();
            if (playerGold < artifactCost) {
                return { 
                    canEquip: false, 
                    reason: `Not enough gold! Need ${artifactCost} gold but only have ${playerGold}.`
                };
            }
        }
        
        // All checks passed
        return { canEquip: true };
    }

    // Add permanent equipment from battle (no cost, no checks - for ArmsTrade transfers)
    addPermanentEquipmentFromBattle(heroPosition, artifactCardName) {
        if (!['left', 'center', 'right'].includes(heroPosition)) {
            console.warn(`Invalid hero position for permanent equipment: ${heroPosition}`);
            return { success: false, reason: 'Invalid hero position!' };
        }
        
        // Get artifact info
        const artifactInfo = getCardInfo(artifactCardName);
        if (!artifactInfo) {
            console.warn(`Invalid artifact for permanent equipment: ${artifactCardName}`);
            return { success: false, reason: 'Invalid artifact!' };
        }
        
        // Check if it's an equip artifact
        if (!this.isEquipArtifactCard(artifactCardName)) {
            console.warn(`${artifactCardName} is not an Equip artifact!`);
            return { success: false, reason: `${artifactCardName} is not an Equip artifact!` };
        }
        
        // Add artifact to hero's equipment (no cost, no checks)
        const equipmentEntry = {
            name: artifactCardName,
            cardName: artifactCardName,
            cost: 0, // No cost for permanent transfers
            image: artifactInfo.image || `./Cards/All/${artifactCardName}.png`,
            equippedAt: Date.now(),
            source: 'ArmsTrade' // Mark as permanent from ArmsTrade
        };
        
        this.heroEquipment[heroPosition].push(equipmentEntry);
        
        console.log(`⚔️ Permanently added ${artifactCardName} to ${heroPosition} hero from ArmsTrade`);
        
        // Trigger Ancient Tech effect update if this is an Energy Core
        if (artifactCardName === 'AncientTechInfiniteEnergyCore' && 
            window.ancientTechInfiniteEnergyCoreEffect) {
            window.ancientTechInfiniteEnergyCoreEffect.onEquipmentChange();
        }
        // Trigger Skull Necklace effect update if this is a Skull Necklace
        if (artifactCardName === 'SkullNecklace' && 
            window.skullNecklaceEffect) {
            window.skullNecklaceEffect.onEquipmentChange();
        }
        // Trigger Future Tech Gun effect update if this is a Future Tech Gun
        if (artifactCardName === 'FutureTechGun' && 
            window.futureTechGunEffect) {
            window.futureTechGunEffect.onEquipmentChange();
        }
        // Trigger Future Tech Laser Cannon effect update if this is a Future Tech Laser Cannon
        if (artifactCardName === 'FutureTechLaserCannon' && 
            window.futureTechLaserCannonEffect) {
            window.futureTechLaserCannonEffect.onEquipmentChange();
        }
        
        // Trigger callback
        if (this.onEquipmentChangeCallback) {
            this.onEquipmentChangeCallback({
                type: 'artifact_equipped',
                heroPosition,
                artifactName: artifactCardName
            });
        }
        
        return { success: true };
    }

    /**
     * Recalculate equipment bonuses for a hero during battle
     * This handles all equipment-based stat bonuses including:
     * - Toras equipment bonus (+20 ATK per equipment)
     * - Ancient Tech Energy Core bonuses
     * - Skull Necklace bonuses
     * - Future Tech Gun bonuses
     * - Future Tech Laser Cannon bonuses
     * - Other equipment-specific bonuses
     * @param {Object} hero - The hero whose equipment bonuses need recalculation
     * @param {Object} battleManager - Reference to battleManager for graveyard access and display updates
     */
    recalculateEquipmentBonuses(hero, battleManager) {
        if (!hero) {
            console.warn('⚠️ Cannot recalculate equipment bonuses: invalid hero');
            return;
        }

        if (!battleManager) {
            console.warn('⚠️ Cannot recalculate equipment bonuses: battleManager not provided');
            return;
        }

        const heroEquipment = hero.equipment || [];
        const equipmentCount = heroEquipment.length;
        
        // Store the old attack for comparison
        const oldAttack = hero.atk;
        
        // Calculate Toras equipment bonus
        let torasEquipmentBonus = 0;
        if (hero.name === 'Toras') {
            torasEquipmentBonus = equipmentCount * 20;
        }
        
        // Calculate Ancient Tech Infinite Energy Core bonus
        let energyCoreBonus = 0;
        const energyCoreCount = heroEquipment.filter(item => {
            const name = item.name || item.cardName || item;
            return name === 'AncientTechInfiniteEnergyCore';
        }).length;
        
        if (energyCoreCount > 0) {
            // Get unique graveyard cards
            const graveyard = hero.side === 'player' ? battleManager.playerGraveyard : battleManager.opponentGraveyard;
            const uniqueGraveyardCards = graveyard ? new Set(graveyard).size : 0;
            energyCoreBonus = uniqueGraveyardCards * 5 * energyCoreCount;
        }
        
        // Calculate Skull Necklace bonus
        let skullNecklaceBonus = 0;
        const hasSkullNecklace = heroEquipment.some(item => {
            const name = item.name || item.cardName || item;
            return name === 'SkullNecklace';
        });
        
        if (hasSkullNecklace && window.skullNecklaceEffect) {
            // Trigger recalculation of skull necklace bonus
            // The effect manager will update the hero's stats
            try {
                window.skullNecklaceEffect.onEquipmentChange();
            } catch (error) {
                console.warn('Error updating Skull Necklace bonus:', error);
            }
        }
        
        // Trigger Future Tech Gun recalculation if equipped
        const hasFutureTechGun = heroEquipment.some(item => {
            const name = item.name || item.cardName || item;
            return name === 'FutureTechGun';
        });
        
        if (hasFutureTechGun && window.futureTechGunEffect) {
            try {
                window.futureTechGunEffect.onEquipmentChange();
            } catch (error) {
                console.warn('Error updating Future Tech Gun bonus:', error);
            }
        }
        
        // Trigger Future Tech Laser Cannon recalculation if equipped
        const hasFutureTechLaserCannon = heroEquipment.some(item => {
            const name = item.name || item.cardName || item;
            return name === 'FutureTechLaserCannon';
        });
        
        if (hasFutureTechLaserCannon && window.futureTechLaserCannonEffect) {
            try {
                window.futureTechLaserCannonEffect.onEquipmentChange();
            } catch (error) {
                console.warn('Error updating Future Tech Laser Cannon bonus:', error);
            }
        }
        
        // Calculate the total equipment bonus
        const totalEquipmentBonus = torasEquipmentBonus + energyCoreBonus + skullNecklaceBonus;
        
        // Get base attack from hero info
        const heroInfo = getCardInfo(hero.name);
        const baseAttack = heroInfo ? heroInfo.atk : 10;
        
        // Calculate other bonuses that should remain
        const fightingStacks = hero.getAbilityStackCount('Fighting');
        const fightingBonus = fightingStacks * 20;
        
        // Get permanent bonuses
        const permanentAttackBonus = hero.attackBonusses || 0;
        const trulyPermanentAttackBonus = hero.permanentAttackBonusses || 0;
        const battleAttackBonus = hero.battleAttackBonus || 0;
        
        // Recalculate total attack
        const newAttack = baseAttack + fightingBonus + totalEquipmentBonus + 
                         permanentAttackBonus + trulyPermanentAttackBonus + battleAttackBonus;
        
        // Update hero's attack
        hero.atk = newAttack;
        
        // Log the change
        if (newAttack !== oldAttack) {
            const change = newAttack - oldAttack;
            const changeStr = change > 0 ? `+${change}` : `${change}`;
            console.log(`⚔️ ${hero.name}'s attack recalculated: ${oldAttack} → ${newAttack} (${changeStr})`);
            
            // Add to combat log if significant change
            if (Math.abs(change) >= 10 && battleManager.addCombatLog) {
                battleManager.addCombatLog(
                    `⚔️ ${hero.name}'s equipment grants ${changeStr} attack!`,
                    hero.side === 'player' ? 'success' : 'error'
                );
            }
        }
        
        // Update the hero display
        if (battleManager.updateHeroDisplay) {
            battleManager.updateHeroDisplay(hero);
        }
    }
}

// Create and export singleton instance
export const heroEquipmentManager = new HeroEquipmentManager();

// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.heroEquipmentManager = heroEquipmentManager;
}