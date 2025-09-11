// ./Creatures/nimbleMonkee.js - NimbleMonkee Creature with Self-Cloning on Gold Gain
// Maximum 3 spawns per turn, prioritizes highest max HP

import { getCardInfo } from '../cardDatabase.js';

export class NimbleMonkeeCreature {
    constructor(heroSelection) {
        this.heroSelection = heroSelection;
        this.activeMonkeeEffects = new Set(); // Track active visual effects for cleanup
        
        // Turn-based spawn tracking - MAX 3 spawns per turn total
        this.spawnsThisTurn = 0;
        this.MAX_SPAWNS_PER_TURN = 3;
        
        // Gold gain event tracking to prevent newly spawned monkees from triggering
        this.currentGoldGainId = null;
        this.monkeesExistingBeforeGain = new Set(); // Track which monkees existed before this gold gain
        
        // NimbleMonkee animation timing
        this.SPAWN_ANIMATION_TIME = 267; // 0.267 second spawn animation (same as GraveWorm)
        
        // Inject CSS styles
        this.injectNimbleMonkeeStyles();
        
        // Set up gold gain event listener
        this.setupGoldGainListener();
        
        console.log('🐒 NimbleMonkee Creature module initialized with spawn cap of', this.MAX_SPAWNS_PER_TURN);
    }

    // Check if a creature is NimbleMonkee
    static isNimbleMonkee(creatureName) {
        return creatureName === 'NimbleMonkee';
    }

    // ============================================
    // GOLD GAIN LISTENING FUNCTIONALITY
    // ============================================

    // Set up gold gain event listener
    setupGoldGainListener() {
        // Hook into the GoldManager's callback system
        if (this.heroSelection.goldManager) {
            // Store the original callback if it exists
            const originalCallback = this.heroSelection.goldManager.goldChangeCallback;
            
            // Set our enhanced callback that calls the original and handles monkee spawning
            this.heroSelection.goldManager.goldChangeCallback = (goldChangeData) => {
                // Call original callback first if it exists
                if (originalCallback) {
                    originalCallback(goldChangeData);
                }
                
                // Handle gold gain for monkee spawning
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
            console.log('🐒 NimbleMonkee ignoring gold gain from card disenchantment');
            return;
        }
        
        console.log(`🐒 NimbleMonkee witnessing gold gain of ${goldChangeData.change} (reason: ${goldChangeData.reason})`);
        
        // Start new gold gain event
        const goldGainId = `${Date.now()}-${goldChangeData.change}-${goldChangeData.reason}`;
        this.currentGoldGainId = goldGainId;
        
        // Record which monkees exist BEFORE this gold gain (only these can spawn)
        this.recordExistingMonkees();
        
        console.log(`🐒 Starting new gold gain event (ID: ${goldGainId}), spawn cap: ${this.MAX_SPAWNS_PER_TURN}, current spawns: ${this.spawnsThisTurn}`);
        
        // Find eligible monkees and try to spawn
        this.processMonkeeSpawning(goldChangeData);
    }

    // Record which monkees existed before this gold gain event
    recordExistingMonkees() {
        this.monkeesExistingBeforeGain.clear();
        
        const formation = this.heroSelection.formationManager.getBattleFormation();
        
        // Check all hero positions for existing NimbleMonkees
        ['left', 'center', 'right'].forEach(position => {
            if (!formation[position]) return; // No hero at this position
            
            const heroCreatures = this.heroSelection.heroCreatureManager.getHeroCreatures(position);
            
            heroCreatures.forEach((heroCreature, index) => {
                if (NimbleMonkeeCreature.isNimbleMonkee(heroCreature.name)) {
                    const monkeeKey = `${position}-${index}`;
                    this.monkeesExistingBeforeGain.add(monkeeKey);
                }
            });
        });
        
        console.log(`🐒 Recorded ${this.monkeesExistingBeforeGain.size} existing monkees before gold gain`);
    }

    // Process monkee spawning for this gold gain event
    processMonkeeSpawning(goldChangeData) {
        // Check if we've hit the per-turn spawn cap
        if (this.spawnsThisTurn >= this.MAX_SPAWNS_PER_TURN) {
            console.log(`🐒 Cannot spawn more monkees - turn cap reached (${this.spawnsThisTurn}/${this.MAX_SPAWNS_PER_TURN})`);
            return;
        }
        
        // Get all eligible monkees (those that existed before this gold gain)
        const eligibleMonkees = this.getEligibleMonkeesForSpawning();
        
        if (eligibleMonkees.length === 0) {
            console.log(`🐒 No eligible monkees found for spawning`);
            return;
        }
        
        // Sort by max HP (highest first)
        eligibleMonkees.sort((a, b) => (b.creature.maxHp || b.creature.hp || 0) - (a.creature.maxHp || a.creature.hp || 0));
        
        // Spawn monkees up to the turn limit
        const remainingSpawns = this.MAX_SPAWNS_PER_TURN - this.spawnsThisTurn;
        const spawnsToProcess = Math.min(eligibleMonkees.length, remainingSpawns);
        
        console.log(`🐒 Processing ${spawnsToProcess} spawns from ${eligibleMonkees.length} eligible monkees`);
        
        for (let i = 0; i < spawnsToProcess; i++) {
            const monkeeData = eligibleMonkees[i];
            this.createNimbleMonkeeClone(monkeeData.position, monkeeData.creature, goldChangeData);
            this.spawnsThisTurn++;
        }
        
        console.log(`🐒 Gold gain event complete: ${this.spawnsThisTurn}/${this.MAX_SPAWNS_PER_TURN} total spawns this turn`);
    }

    // Get all eligible monkees for spawning (existed before this gold gain)
    getEligibleMonkeesForSpawning() {
        const eligibleMonkees = [];
        const formation = this.heroSelection.formationManager.getBattleFormation();
        
        // Check all hero positions for eligible NimbleMonkees
        ['left', 'center', 'right'].forEach(position => {
            if (!formation[position]) return; // No hero at this position
            
            const heroCreatures = this.heroSelection.heroCreatureManager.getHeroCreatures(position);
            
            heroCreatures.forEach((heroCreature, index) => {
                if (NimbleMonkeeCreature.isNimbleMonkee(heroCreature.name)) {
                    const monkeeKey = `${position}-${index}`;
                    
                    // Only include if it existed before this gold gain
                    if (this.monkeesExistingBeforeGain.has(monkeeKey)) {
                        eligibleMonkees.push({
                            position: position,
                            index: index,
                            creature: heroCreature,
                            key: monkeeKey
                        });
                    }
                }
            });
        });
        
        return eligibleMonkees;
    }

    // ============================================
    // MONKEE CLONING FUNCTIONALITY
    // ============================================

    // Create an exact clone of the NimbleMonkee
    async createNimbleMonkeeClone(heroPosition, originalMonkee, goldChangeData) {
        // Get the full card info for NimbleMonkee to ensure we have all properties
        const cardInfo = getCardInfo('NimbleMonkee');
        if (!cardInfo) {
            console.error('NimbleMonkee card not found in database');
            return;
        }
        
        // Create the clone with same stats as original, but use fresh card data as base
        const clone = {
            ...cardInfo,  // Start with fresh card data
            // Copy over any modified stats from the original
            maxHp: originalMonkee.maxHp || cardInfo.hp,
            currentHp: originalMonkee.currentHp || cardInfo.hp,
            hp: originalMonkee.hp || cardInfo.hp,
            // Copy other potentially modified properties
            statusEffects: [...(originalMonkee.statusEffects || [])], // Deep copy status effects
            counters: originalMonkee.counters || 0,
            // Set metadata
            addedAt: Date.now(),
            type: 'creature',
            isPermanent: true, // Mark as permanent for persistence
            clonedFrom: originalMonkee.name,
            triggeredBy: `gold_gain_${goldChangeData.change}`
        };
        
        // Add to the hero's creatures array using the existing method
        const success = this.heroSelection.heroCreatureManager.addCreatureToHero(heroPosition, 'NimbleMonkee');
        
        if (success) {
            // Get the index of the newly added creature (should be last)
            const heroCreatures = this.heroSelection.heroCreatureManager.getHeroCreatures(heroPosition);
            const newCreatureIndex = heroCreatures.length - 1;
            
            // Replace the auto-generated creature with our custom clone
            if (this.heroSelection.heroCreatureManager.heroCreatures[heroPosition]) {
                this.heroSelection.heroCreatureManager.heroCreatures[heroPosition][newCreatureIndex] = clone;
            }
            
            // Show clone creation effect with delay to let UI update
            setTimeout(() => {
                this.playNimbleMonkeeSpawnEffect(heroPosition, newCreatureIndex, goldChangeData);
            }, 100);
            
            // Notify state change
            if (this.heroSelection.heroCreatureManager.onStateChange) {
                this.heroSelection.heroCreatureManager.onStateChange();
            }
            
            // Save state
            await this.heroSelection.saveGameState();
            
            // Send formation update
            await this.heroSelection.sendFormationUpdate();
            
            console.log(`🐒 NimbleMonkee at ${heroPosition} created a clone in response to ${goldChangeData.change} gold gain (${goldChangeData.reason})`);
        } else {
            console.error(`🐒 Failed to add NimbleMonkee clone at ${heroPosition}`);
        }
    }

    // Play NimbleMonkee spawning visual effect
    playNimbleMonkeeSpawnEffect(heroPosition, creatureIndex, goldChangeData) {
        // Find the new clone element
        const cloneElement = document.querySelector(
            `.hero-creatures[data-hero-position="${heroPosition}"] .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!cloneElement) {
            console.warn(`🐒 Could not find NimbleMonkee clone element at ${heroPosition}[${creatureIndex}] for spawn effect`);
            return;
        }

        // Add spawning class for glow effect
        cloneElement.classList.add('spawning-nimble-monkee');

        // Create spawning circle overlay with gold/banana theme
        const spawningEffect = document.createElement('div');
        spawningEffect.className = 'nimble-monkee-spawning-effect';
        spawningEffect.innerHTML = `
            <div class="spawning-circle-monkee"></div>
            <div class="spawning-particles-monkee">
                ${Array.from({length: 6}, (_, i) => 
                    `<div class="spawn-particle-monkee particle-${i + 1}">🍌</div>`
                ).join('')}
            </div>
            <div class="gold-tribute">
                <span class="tribute-text">Excited by +${goldChangeData.change} Gold!</span>
            </div>
        `;
        
        // Position it over the clone
        cloneElement.style.position = 'relative';
        cloneElement.appendChild(spawningEffect);
        
        this.activeMonkeeEffects.add(spawningEffect);
        
        // Remove effect and class after animation completes
        setTimeout(() => {
            if (spawningEffect.parentNode) {
                spawningEffect.parentNode.removeChild(spawningEffect);
            }
            cloneElement.classList.remove('spawning-nimble-monkee');
            this.activeMonkeeEffects.delete(spawningEffect);
        }, this.SPAWN_ANIMATION_TIME);
    }

    // ============================================
    // TURN MANAGEMENT AND STATE PERSISTENCE
    // ============================================

    // Reset turn-based tracking
    resetTurnBasedTracking() {
        console.log(`🐒 Resetting NimbleMonkee turn-based tracking (${this.spawnsThisTurn} spawns this turn)`);
        this.spawnsThisTurn = 0;
        
        // Also reset gold gain tracking on turn change
        this.currentGoldGainId = null;
        this.monkeesExistingBeforeGain.clear();
    }

    // Export state for saving
    exportState() {
        return {
            spawnsThisTurn: this.spawnsThisTurn,
            currentGoldGainId: this.currentGoldGainId,
            monkeesExistingBeforeGain: Array.from(this.monkeesExistingBeforeGain)
        };
    }

    // Import state for loading
    importState(state) {
        if (!state) return false;

        if (typeof state.spawnsThisTurn === 'number') {
            this.spawnsThisTurn = state.spawnsThisTurn;
        }
        
        if (state.currentGoldGainId !== undefined) {
            this.currentGoldGainId = state.currentGoldGainId;
        }
        
        if (Array.isArray(state.monkeesExistingBeforeGain)) {
            this.monkeesExistingBeforeGain = new Set(state.monkeesExistingBeforeGain);
        }

        console.log(`🐒 Restored NimbleMonkee state: ${this.spawnsThisTurn} spawns this turn`);
        return true;
    }

    // Reset for new game
    reset() {
        this.spawnsThisTurn = 0;
        this.currentGoldGainId = null;
        this.monkeesExistingBeforeGain.clear();
        this.cleanup();
    }

    // Clean up all active effects
    cleanup() {
        console.log(`🐒 Cleaning up ${this.activeMonkeeEffects.size} active NimbleMonkee spawn effects`);
        
        // Clean up spawning effects
        this.activeMonkeeEffects.forEach(monkeeEffect => {
            try {
                if (monkeeEffect && monkeeEffect.parentNode) {
                    monkeeEffect.remove();
                }
            } catch (error) {
                console.warn('Error removing monkee effect during cleanup:', error);
            }
        });
        
        this.activeMonkeeEffects.clear();

        // Also remove any orphaned elements
        try {
            const orphanedMonkees = document.querySelectorAll('.nimble-monkee-spawning-effect');
            
            orphanedMonkees.forEach(monkeeEffect => {
                if (monkeeEffect.parentNode) {
                    monkeeEffect.remove();
                }
            });
            
            if (orphanedMonkees.length > 0) {
                console.log(`🐒 Cleaned up ${orphanedMonkees.length} orphaned spawn effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned monkee effects:', error);
        }
    }

    // Inject CSS styles for NimbleMonkee effects
    injectNimbleMonkeeStyles() {
        if (document.getElementById('nimbleMonkeeCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'nimbleMonkeeCreatureStyles';
        style.textContent = `
            /* NimbleMonkee Spawning Effect - Gold/Banana Theme */
            .nimble-monkee-spawning-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }

            /* Spawning Circle - Gold/yellow */
            .spawning-circle-monkee {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 45px;
                height: 45px;
                border: 3px solid rgba(255, 215, 0, 0.9);
                border-radius: 50%;
                box-shadow: 
                    0 0 20px rgba(255, 215, 0, 0.8),
                    0 0 40px rgba(255, 193, 7, 0.6),
                    inset 0 0 15px rgba(255, 235, 59, 0.4);
                animation: spawnCircleAppearMonkee 0.267s ease-out;
            }

            /* Spawning Particles - Banana emojis */
            .spawning-particles-monkee {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .spawn-particle-monkee {
                position: absolute;
                font-size: 16px;
                animation: spawnParticleMonkee 0.267s ease-out;
            }

            /* Particle Positions */
            .spawn-particle-monkee.particle-1 {
                top: 20%;
                left: 50%;
                animation-delay: 0s;
            }
            .spawn-particle-monkee.particle-2 {
                top: 35%;
                left: 70%;
                animation-delay: 0.033s;
            }
            .spawn-particle-monkee.particle-3 {
                top: 50%;
                left: 75%;
                animation-delay: 0.067s;
            }
            .spawn-particle-monkee.particle-4 {
                top: 65%;
                left: 60%;
                animation-delay: 0.1s;
            }
            .spawn-particle-monkee.particle-5 {
                top: 65%;
                left: 40%;
                animation-delay: 0.133s;
            }
            .spawn-particle-monkee.particle-6 {
                top: 35%;
                left: 30%;
                animation-delay: 0.167s;
            }

            /* Gold tribute text */
            .gold-tribute {
                position: absolute;
                bottom: -25px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 215, 0, 0.9);
                color: #8B4513;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                white-space: nowrap;
                animation: tributeFadeInOutMonkee 0.667s ease-out;
            }

            /* Add golden glow to NimbleMonkee during spawning */
            .creature-icon.spawning-nimble-monkee {
                animation: nimbleMonkeeSpawnGlow 0.267s ease-out;
            }

            .creature-icon.spawning-nimble-monkee .creature-sprite {
                filter: brightness(1.3) drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
            }

            /* Keyframe Animations */
            @keyframes spawnCircleAppearMonkee {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 0;
                    border-color: rgba(255, 215, 0, 0);
                    filter: blur(3px);
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.3) rotate(90deg);
                    opacity: 1;
                    border-color: rgba(255, 215, 0, 1);
                    box-shadow: 
                        0 0 30px rgba(255, 215, 0, 1),
                        0 0 60px rgba(255, 193, 7, 0.8),
                        inset 0 0 20px rgba(255, 235, 59, 0.6);
                    filter: blur(0px);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1) rotate(180deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.7) rotate(360deg);
                    opacity: 0;
                    border-color: rgba(255, 215, 0, 0);
                    filter: blur(2px);
                }
            }

            @keyframes spawnParticleMonkee {
                0% {
                    transform: scale(0) translateY(15px) rotate(0deg);
                    opacity: 0;
                    filter: brightness(2);
                }
                30% {
                    transform: scale(1.8) translateY(0) rotate(180deg);
                    opacity: 1;
                    filter: brightness(1.5);
                }
                70% {
                    transform: scale(1) translateY(-8px) rotate(270deg);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(0) translateY(-20px) rotate(360deg);
                    opacity: 0;
                    filter: brightness(0.5);
                }
            }

            @keyframes tributeFadeInOutMonkee {
                0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            }

            @keyframes nimbleMonkeeSpawnGlow {
                0% {
                    filter: brightness(1.8) drop-shadow(0 0 20px rgba(255, 215, 0, 1));
                    transform: scale(0.9);
                }
                50% {
                    filter: brightness(1.5) drop-shadow(0 0 25px rgba(255, 215, 0, 0.9));
                    transform: scale(1.05);
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(255, 215, 0, 0));
                    transform: scale(1);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const NimbleMonkeeHelpers = {
    // Check if any creature in a list is NimbleMonkee
    hasNimbleMonkeeInList(creatures) {
        return creatures.some(creature => NimbleMonkeeCreature.isNimbleMonkee(creature.name));
    },

    // Get all NimbleMonkee creatures from a list
    getNimbleMonkeesFromList(creatures) {
        return creatures.filter(creature => NimbleMonkeeCreature.isNimbleMonkee(creature.name));
    }
};

export default NimbleMonkeeCreature;