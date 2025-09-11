// ./Creatures/resilientMonkee.js - ResilientMonkee Creature that buffs all Monkee creatures on gold gain

export class ResilientMonkeeCreature {
    constructor(heroSelection) {
        this.heroSelection = heroSelection;
        this.activeEffects = new Set(); // Track active visual effects for cleanup
        
        // Rage mark animation timing
        this.RAGE_ANIMATION_TIME = 1500; // 1.5 second rage animation
        
        // Inject CSS styles
        this.injectResilientMonkeeStyles();
        
        // Set up gold gain event listener
        this.setupGoldGainListener();
        
        console.log('💪 ResilientMonkee Creature module initialized');
    }

    // Check if a creature is ResilientMonkee
    static isResilientMonkee(creatureName) {
        return creatureName === 'ResilientMonkee';
    }

    // Set up gold gain event listener
    setupGoldGainListener() {
        // Hook into the GoldManager's callback system
        if (this.heroSelection.goldManager) {
            // Store the original callback if it exists
            const originalCallback = this.heroSelection.goldManager.goldChangeCallback;
            
            // Set our enhanced callback that calls the original and handles monkee buffing
            this.heroSelection.goldManager.goldChangeCallback = (goldChangeData) => {
                // Call original callback first if it exists
                if (originalCallback) {
                    originalCallback(goldChangeData);
                }
                
                // Handle gold gain for monkee buffing
                this.handleGoldGain(goldChangeData);
            };
        }
    }

    // Handle when gold is gained
    handleGoldGain(goldChangeData) {
        // Only trigger on player gold gains (positive amounts)
        if (goldChangeData.type !== 'player_gold_change' || goldChangeData.change <= 0) {
            return;
        }
        
        // Don't trigger during battle or if we're not in team building
        const currentPhase = this.heroSelection.getCurrentPhase();
        if (currentPhase !== 'team_building') {
            return;
        }
        
        // EXCLUDE gold gains from card disenchantment - only trigger on effects!
        if (goldChangeData.reason === 'card_disenchant') {
            console.log('💪 ResilientMonkee ignoring gold gain from card disenchantment');
            return;
        }
        
        // COUNT HOW MANY RESILIENTMONKEE CREATURES ARE IN PLAY
        const formation = this.heroSelection.formationManager.getBattleFormation();
        let resilientMonkeeCount = 0;
        
        ['left', 'center', 'right'].forEach(position => {
            if (!formation[position]) return; // No hero at this position
            
            const heroCreaturesArray = this.heroSelection.heroCreatureManager.heroCreatures[position];
            if (!heroCreaturesArray) return;
            
            heroCreaturesArray.forEach(creature => {
                if (creature.name && ResilientMonkeeCreature.isResilientMonkee(creature.name)) {
                    resilientMonkeeCount++;
                }
            });
        });
        
        // ONLY PROCEED IF THERE ARE RESILIENTMONKEE CREATURES IN PLAY
        if (resilientMonkeeCount === 0) {
            console.log('💪 No ResilientMonkee creatures in play, ignoring gold gain');
            return;
        }
        
        console.log(`💪 ResilientMonkee witnessing gold gain of ${goldChangeData.change} (reason: ${goldChangeData.reason}) with ${resilientMonkeeCount} ResilientMonkees in play`);
        
        // Find and buff all Monkee creatures (once per ResilientMonkee)
        this.buffAllMonkeeCreatures(goldChangeData, resilientMonkeeCount);
    }

    // Find and buff all creatures with "Monkee" in their name
    async buffAllMonkeeCreatures(goldChangeData, resilientMonkeeCount = 1) {
        const formation = this.heroSelection.formationManager.getBattleFormation();
        const hpBuffPerResilientMonkee = 20;
        const totalHpBuff = hpBuffPerResilientMonkee * resilientMonkeeCount;
        let buffedCount = 0;
        
        // Check all hero positions for Monkee creatures
        ['left', 'center', 'right'].forEach(position => {
            if (!formation[position]) return; // No hero at this position
            
            // Get mutable reference to the actual creatures array
            const heroCreaturesArray = this.heroSelection.heroCreatureManager.heroCreatures[position];
            if (!heroCreaturesArray) return;
            
            heroCreaturesArray.forEach((creature, index) => {
                if (creature.name && creature.name.includes('Monkee')) {
                    // Permanently increase max HP (all HP values need to be updated)
                    const currentHp = creature.currentHp || creature.hp || 0;
                    const maxHp = creature.maxHp || creature.hp || 0;
                    
                    creature.hp = (creature.hp || 0) + totalHpBuff;
                    creature.currentHp = currentHp + totalHpBuff;
                    creature.maxHp = maxHp + totalHpBuff;
                    
                    // Show rage mark animation
                    setTimeout(() => {
                        this.playRageMarkAnimation(position, index, totalHpBuff, goldChangeData);
                    }, 100 * buffedCount); // Stagger animations slightly
                    
                    buffedCount++;
                    
                    console.log(`💪 Buffed ${creature.name} at ${position}[${index}] by +${totalHpBuff} HP (${resilientMonkeeCount} ResilientMonkees × ${hpBuffPerResilientMonkee}) (now ${creature.maxHp} max HP)`);
                }
            });
        });
        
        if (buffedCount > 0) {
            console.log(`💪 ResilientMonkee buffed ${buffedCount} Monkee creatures by +${totalHpBuff} HP each (${resilientMonkeeCount} ResilientMonkees)`);
            
            // Notify state change to update UI
            if (this.heroSelection.heroCreatureManager.onStateChange) {
                this.heroSelection.heroCreatureManager.onStateChange();
            }
            
            // Save state to persist the buffs
            await this.heroSelection.saveGameState();
            
            // Send formation update to opponent
            await this.heroSelection.sendFormationUpdate();
        }
    }

    // Play rage mark animation on buffed creature
    playRageMarkAnimation(heroPosition, creatureIndex, hpBuff, goldChangeData) {
        // Find the creature element
        const creatureElement = document.querySelector(
            `.hero-creatures[data-hero-position="${heroPosition}"] .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) {
            console.warn(`💪 Could not find creature element at ${heroPosition}[${creatureIndex}] for rage animation`);
            return;
        }

        // Add raging class for glow effect
        creatureElement.classList.add('raging-monkee');

        // Create rage mark overlay
        const rageEffect = document.createElement('div');
        rageEffect.className = 'resilient-monkee-rage-effect';
        rageEffect.innerHTML = `
            <div class="rage-marks">
                <div class="rage-mark rage-mark-1">💢</div>
                <div class="rage-mark rage-mark-2">💢</div>
                <div class="rage-mark rage-mark-3">💢</div>
            </div>
            <div class="buff-indicator">
                <span class="buff-text">+${totalHpBuff} HP!</span>
            </div>
        `;
        
        // Position it over the creature
        creatureElement.style.position = 'relative';
        creatureElement.appendChild(rageEffect);
        
        this.activeEffects.add(rageEffect);
        
        // Remove effect and class after animation completes
        setTimeout(() => {
            if (rageEffect.parentNode) {
                rageEffect.parentNode.removeChild(rageEffect);
            }
            creatureElement.classList.remove('raging-monkee');
            this.activeEffects.delete(rageEffect);
        }, this.RAGE_ANIMATION_TIME);
    }

    // Reset for new turn - no turn-based state to reset
    resetTurnBasedTracking() {
        // ResilientMonkee doesn't have turn-based limitations
    }

    // Export state for saving - no persistent state needed
    exportState() {
        return {
            // No state to export - buffs are permanent on creatures themselves
        };
    }

    // Import state for loading - no persistent state needed
    importState(state) {
        // No state to import - buffs are permanent on creatures themselves
        return true;
    }

    // Reset for new game
    reset() {
        this.cleanup();
    }

    // Clean up all active effects
    cleanup() {
        console.log(`💪 Cleaning up ${this.activeEffects.size} active ResilientMonkee rage effects`);
        
        // Clean up rage effects
        this.activeEffects.forEach(effect => {
            try {
                if (effect && effect.parentNode) {
                    effect.remove();
                }
            } catch (error) {
                console.warn('Error removing rage effect during cleanup:', error);
            }
        });
        
        this.activeEffects.clear();

        // Also remove any orphaned elements
        try {
            const orphanedEffects = document.querySelectorAll('.resilient-monkee-rage-effect');
            
            orphanedEffects.forEach(effect => {
                if (effect.parentNode) {
                    effect.remove();
                }
            });
            
            if (orphanedEffects.length > 0) {
                console.log(`💪 Cleaned up ${orphanedEffects.length} orphaned rage effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned rage effects:', error);
        }
    }

    // Inject CSS styles for ResilientMonkee effects
    injectResilientMonkeeStyles() {
        if (document.getElementById('resilientMonkeeCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'resilientMonkeeCreatureStyles';
        style.textContent = `
            /* ResilientMonkee Rage Effect */
            .resilient-monkee-rage-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }

            /* Rage Marks Container */
            .rage-marks {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            /* Individual Rage Marks */
            .rage-mark {
                position: absolute;
                font-size: 14px;
                animation: rageMarkFloat 1.5s ease-out;
            }

            /* Rage Mark Positions */
            .rage-mark-1 {
                top: 10%;
                left: 20%;
                animation-delay: 0s;
            }
            .rage-mark-2 {
                top: 15%;
                right: 25%;
                animation-delay: 0.2s;
            }
            .rage-mark-3 {
                top: 5%;
                left: 60%;
                animation-delay: 0.4s;
            }

            /* Buff Indicator */
            .buff-indicator {
                position: absolute;
                bottom: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(220, 53, 69, 0.9);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: bold;
                white-space: nowrap;
                animation: buffIndicatorShow 1.5s ease-out;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }

            /* Add red glow to creature during rage */
            .creature-icon.raging-monkee {
                animation: monkeeRageGlow 1.5s ease-out;
            }

            .creature-icon.raging-monkee .creature-sprite {
                filter: brightness(1.2) drop-shadow(0 0 10px rgba(220, 53, 69, 0.8));
            }

            /* Keyframe Animations */
            @keyframes rageMarkFloat {
                0% {
                    transform: scale(0) rotate(0deg);
                    opacity: 0;
                }
                20% {
                    transform: scale(1.3) rotate(15deg);
                    opacity: 1;
                }
                40% {
                    transform: scale(1) rotate(-10deg);
                    opacity: 1;
                }
                60% {
                    transform: scale(1.1) rotate(5deg);
                    opacity: 0.8;
                }
                80% {
                    transform: scale(0.9) rotate(-5deg);
                    opacity: 0.5;
                }
                100% {
                    transform: scale(0) rotate(0deg);
                    opacity: 0;
                }
            }

            @keyframes buffIndicatorShow {
                0% { 
                    opacity: 0; 
                    transform: translateX(-50%) translateY(10px) scale(0.7); 
                }
                25% { 
                    opacity: 1; 
                    transform: translateX(-50%) translateY(0) scale(1.1); 
                }
                75% { 
                    opacity: 1; 
                    transform: translateX(-50%) translateY(0) scale(1); 
                }
                100% { 
                    opacity: 0; 
                    transform: translateX(-50%) translateY(-15px) scale(0.8); 
                }
            }

            @keyframes monkeeRageGlow {
                0% {
                    filter: brightness(1.4) drop-shadow(0 0 15px rgba(220, 53, 69, 1));
                    transform: scale(0.95);
                }
                25% {
                    filter: brightness(1.3) drop-shadow(0 0 12px rgba(220, 53, 69, 0.9));
                    transform: scale(1.02);
                }
                50% {
                    filter: brightness(1.2) drop-shadow(0 0 10px rgba(220, 53, 69, 0.8));
                    transform: scale(1);
                }
                75% {
                    filter: brightness(1.1) drop-shadow(0 0 8px rgba(220, 53, 69, 0.6));
                    transform: scale(0.98);
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(220, 53, 69, 0));
                    transform: scale(1);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const ResilientMonkeeHelpers = {
    // Check if any creature in a list is ResilientMonkee
    hasResilientMonkeeInList(creatures) {
        return creatures.some(creature => ResilientMonkeeCreature.isResilientMonkee(creature.name));
    },

    // Get all ResilientMonkee creatures from a list
    getResilientMonkeesFromList(creatures) {
        return creatures.filter(creature => ResilientMonkeeCreature.isResilientMonkee(creature.name));
    },

    // Check if a creature name contains "Monkee"
    isMonkeeCreature(creatureName) {
        return creatureName && creatureName.includes('Monkee');
    },

    // Get all Monkee creatures from a list
    getMonkeeCreaturesFromList(creatures) {
        return creatures.filter(creature => this.isMonkeeCreature(creature.name));
    }
};

export default ResilientMonkeeCreature;