// ./Creatures/criminalMonkee.js - CriminalMonkee Creature that triggers on exactly 4 Gold gained

export class CriminalMonkeeCreature {
    constructor(heroSelection) {
        this.heroSelection = heroSelection;
        this.activeEffects = new Set(); // Track active visual effects for cleanup
        
        // Track which CriminalMonkees have activated this turn
        // Format: { "left_0": true, "center_1": true } where key is position_index
        this.activatedThisTurn = {};
        
        // Heist animation timing
        this.HEIST_ANIMATION_TIME = 1500; // 1.5 second heist animation
        
        // Inject CSS styles
        this.injectCriminalMonkeeStyles();
        
        // Set up gold gain event listener
        this.setupGoldGainListener();
        
        console.log('🦹 CriminalMonkee Creature module initialized');
    }

    // Check if a creature is CriminalMonkee
    static isCriminalMonkee(creatureName) {
        return creatureName === 'CriminalMonkee';
    }

    // Set up gold gain event listener
    setupGoldGainListener() {
        // Hook into the GoldManager's callback system
        if (this.heroSelection.goldManager) {
            // Store the original callback if it exists
            const originalCallback = this.heroSelection.goldManager.goldChangeCallback;
            
            // Set our enhanced callback that calls the original and handles monkee triggering
            this.heroSelection.goldManager.goldChangeCallback = (goldChangeData) => {
                // Call original callback first if it exists
                if (originalCallback) {
                    originalCallback(goldChangeData);
                }
                
                // Handle gold gain for CriminalMonkee triggering
                this.handleGoldGain(goldChangeData);
            };
        }
    }

    // Handle when gold is gained
    handleGoldGain(goldChangeData) {
        // Only trigger on player gold gains of exactly 4
        if (goldChangeData.type !== 'player_gold_change' || goldChangeData.change !== 4) {
            return;
        }
        
        // Don't trigger during battle or if we're not in team building
        const currentPhase = this.heroSelection.getCurrentPhase();
        if (currentPhase !== 'team_building') {
            return;
        }
        
        // EXCLUDE gold gains from card disenchantment - only trigger on effects!
        if (goldChangeData.reason === 'card_disenchant') {
            console.log('🦹 CriminalMonkee ignoring gold gain from card disenchantment');
            return;
        }
        
        // FIND ALL CRIMINALMONKEE CREATURES THAT HAVEN'T ACTIVATED THIS TURN
        const formation = this.heroSelection.formationManager.getBattleFormation();
        let eligibleCriminalMonkees = [];
        
        ['left', 'center', 'right'].forEach(position => {
            if (!formation[position]) return; // No hero at this position
            
            const heroCreaturesArray = this.heroSelection.heroCreatureManager.heroCreatures[position];
            if (!heroCreaturesArray) return;
            
            heroCreaturesArray.forEach((creature, index) => {
                if (creature.name && CriminalMonkeeCreature.isCriminalMonkee(creature.name)) {
                    const activationKey = `${position}_${index}`;
                    
                    // Only include if not activated this turn
                    if (!this.activatedThisTurn[activationKey]) {
                        eligibleCriminalMonkees.push({
                            position: position,
                            index: index,
                            activationKey: activationKey
                        });
                    }
                }
            });
        });
        
        // ONLY PROCEED IF THERE ARE ELIGIBLE CRIMINALMONKEE CREATURES
        if (eligibleCriminalMonkees.length === 0) {
            console.log('🦹 No eligible CriminalMonkee creatures to trigger (all activated or none present)');
            return;
        }
        
        console.log(`🦹 CriminalMonkee witnessing exactly 4 gold gain (reason: ${goldChangeData.reason}) with ${eligibleCriminalMonkees.length} eligible CriminalMonkees`);
        
        // Activate all eligible CriminalMonkees
        this.activateEligibleCriminalMonkees(goldChangeData, eligibleCriminalMonkees);
    }

    // Activate all eligible CriminalMonkees
    async activateEligibleCriminalMonkees(goldChangeData, eligibleCriminalMonkees) {
        let activationCount = 0;
        
        for (const criminalMonkee of eligibleCriminalMonkees) {
            // Mark this CriminalMonkee as activated
            this.activatedThisTurn[criminalMonkee.activationKey] = true;
            
            // Add NonFungibleMonkee to hand
            const success = this.heroSelection.handManager.addCardToHand('NonFungibleMonkee');
            
            if (success) {
                // Show heist animation
                setTimeout(() => {
                    this.playHeistAnimation(criminalMonkee.position, criminalMonkee.index, goldChangeData);
                }, 100 * activationCount); // Stagger animations slightly
                
                activationCount++;
                
                console.log(`🦹 CriminalMonkee at ${criminalMonkee.position}[${criminalMonkee.index}] stole a NonFungibleMonkee!`);
            } else {
                console.warn(`🦹 CriminalMonkee at ${criminalMonkee.position}[${criminalMonkee.index}] failed to steal (hand full?)`);
                // Still mark as activated to prevent retry
            }
        }
        
        if (activationCount > 0) {
            console.log(`🦹 ${activationCount} CriminalMonkee(s) activated and stole NonFungibleMonkee cards!`);
            
            // Update UI to show new hand contents
            this.heroSelection.updateHandDisplay();
            
            // Save state to persist the activations
            await this.heroSelection.saveGameState();
            
            // Send formation update to opponent
            await this.heroSelection.sendFormationUpdate();
        }
    }

    // Play heist animation on activated creature
    playHeistAnimation(heroPosition, creatureIndex, goldChangeData) {
        // Find the creature element
        const creatureElement = document.querySelector(
            `.hero-creatures[data-hero-position="${heroPosition}"] .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) {
            console.warn(`🦹 Could not find creature element at ${heroPosition}[${creatureIndex}] for heist animation`);
            return;
        }

        // Add heisting class for glow effect
        creatureElement.classList.add('heisting-monkee');

        // Create heist effect overlay
        const heistEffect = document.createElement('div');
        heistEffect.className = 'criminal-monkee-heist-effect';
        heistEffect.innerHTML = `
            <div class="heist-icons">
                <div class="heist-icon heist-icon-1">💰</div>
                <div class="heist-icon heist-icon-2">💎</div>
                <div class="heist-icon heist-icon-3">🔓</div>
            </div>
            <div class="heist-indicator">
                <span class="heist-text">+NonFungibleMonkee!</span>
            </div>
        `;
        
        // Position it over the creature
        creatureElement.style.position = 'relative';
        creatureElement.appendChild(heistEffect);
        
        this.activeEffects.add(heistEffect);
        
        // Remove effect and class after animation completes
        setTimeout(() => {
            if (heistEffect.parentNode) {
                heistEffect.parentNode.removeChild(heistEffect);
            }
            creatureElement.classList.remove('heisting-monkee');
            this.activeEffects.delete(heistEffect);
        }, this.HEIST_ANIMATION_TIME);
    }

    // Reset turn-based tracking - called at start of each turn
    resetTurnBasedTracking() {
        this.activatedThisTurn = {};
        console.log('🦹 CriminalMonkee turn-based tracking reset');
    }

    // Export state for saving
    exportState() {
        return {
            activatedThisTurn: { ...this.activatedThisTurn }
        };
    }

    // Import state for loading
    importState(state) {
        if (state && typeof state === 'object') {
            this.activatedThisTurn = state.activatedThisTurn || {};
            console.log(`🦹 CriminalMonkee state imported: ${Object.keys(this.activatedThisTurn).length} activations tracked`);
            return true;
        }
        return false;
    }

    // Reset for new game
    reset() {
        this.activatedThisTurn = {};
        this.cleanup();
        console.log('🦹 CriminalMonkee reset for new game');
    }

    // Clean up all active effects
    cleanup() {
        console.log(`🦹 Cleaning up ${this.activeEffects.size} active CriminalMonkee heist effects`);
        
        // Clean up heist effects
        this.activeEffects.forEach(effect => {
            try {
                if (effect && effect.parentNode) {
                    effect.remove();
                }
            } catch (error) {
                console.warn('Error removing heist effect during cleanup:', error);
            }
        });
        
        this.activeEffects.clear();

        // Also remove any orphaned elements
        try {
            const orphanedEffects = document.querySelectorAll('.criminal-monkee-heist-effect');
            
            orphanedEffects.forEach(effect => {
                if (effect.parentNode) {
                    effect.remove();
                }
            });
            
            if (orphanedEffects.length > 0) {
                console.log(`🦹 Cleaned up ${orphanedEffects.length} orphaned heist effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned heist effects:', error);
        }
    }

    // Inject CSS styles for CriminalMonkee effects
    injectCriminalMonkeeStyles() {
        if (document.getElementById('criminalMonkeeCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'criminalMonkeeCreatureStyles';
        style.textContent = `
            /* CriminalMonkee Heist Effect */
            .criminal-monkee-heist-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }

            /* Heist Icons Container */
            .heist-icons {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            /* Individual Heist Icons */
            .heist-icon {
                position: absolute;
                font-size: 14px;
                animation: heistIconFloat 1.5s ease-out;
            }

            /* Heist Icon Positions */
            .heist-icon-1 {
                top: 10%;
                left: 15%;
                animation-delay: 0s;
            }
            .heist-icon-2 {
                top: 20%;
                right: 20%;
                animation-delay: 0.3s;
            }
            .heist-icon-3 {
                top: 5%;
                left: 55%;
                animation-delay: 0.6s;
            }

            /* Heist Indicator */
            .heist-indicator {
                position: absolute;
                bottom: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(138, 43, 226, 0.9);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: bold;
                white-space: nowrap;
                animation: heistIndicatorShow 1.5s ease-out;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }

            /* Add purple glow to creature during heist */
            .creature-icon.heisting-monkee {
                animation: monkeeHeistGlow 1.5s ease-out;
            }

            .creature-icon.heisting-monkee .creature-sprite {
                filter: brightness(1.2) drop-shadow(0 0 10px rgba(138, 43, 226, 0.8));
            }

            /* Keyframe Animations */
            @keyframes heistIconFloat {
                0% {
                    transform: scale(0) rotate(0deg);
                    opacity: 0;
                }
                20% {
                    transform: scale(1.2) rotate(20deg);
                    opacity: 1;
                }
                40% {
                    transform: scale(1) rotate(-15deg);
                    opacity: 1;
                }
                60% {
                    transform: scale(1.1) rotate(10deg);
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

            @keyframes heistIndicatorShow {
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

            @keyframes monkeeHeistGlow {
                0% {
                    filter: brightness(1.4) drop-shadow(0 0 15px rgba(138, 43, 226, 1));
                    transform: scale(0.95);
                }
                25% {
                    filter: brightness(1.3) drop-shadow(0 0 12px rgba(138, 43, 226, 0.9));
                    transform: scale(1.02);
                }
                50% {
                    filter: brightness(1.2) drop-shadow(0 0 10px rgba(138, 43, 226, 0.8));
                    transform: scale(1);
                }
                75% {
                    filter: brightness(1.1) drop-shadow(0 0 8px rgba(138, 43, 226, 0.6));
                    transform: scale(0.98);
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(138, 43, 226, 0));
                    transform: scale(1);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const CriminalMonkeeHelpers = {
    // Check if any creature in a list is CriminalMonkee
    hasCriminalMonkeeInList(creatures) {
        return creatures.some(creature => CriminalMonkeeCreature.isCriminalMonkee(creature.name));
    },

    // Get all CriminalMonkee creatures from a list
    getCriminalMonkeesFromList(creatures) {
        return creatures.filter(creature => CriminalMonkeeCreature.isCriminalMonkee(creature.name));
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

export default CriminalMonkeeCreature;