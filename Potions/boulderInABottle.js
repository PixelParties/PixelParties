// ./Potions/boulderInABottle.js - Boulder In A Bottle Potion Implementation
// Spawns Boulder creatures at the front of all player's heroes at battle start

export class BoulderInABottlePotion {
    constructor() {
        this.name = 'BoulderInABottle';
    }

    /**
     * Handle BoulderInABottle potion effects for a player
     * @param {Array} effects - Array of BoulderInABottle effects to process
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - Battle manager instance
     * @returns {number} Number of effects processed
     */
    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0) {
            return 0;
        }

        console.log(`🪨 Applying ${effects.length} BoulderInABottle effects for ${playerRole}`);

        // Inject summoning animation CSS
        this.injectSummoningAnimationCSS();

        // BoulderInABottle is a defensive potion that helps the player who used it
        // Determine which heroes to target based on who the effects belong to and who is processing them
        const isProcessingOwnEffects = (battleManager.isHost && playerRole === 'host') || 
                                    (!battleManager.isHost && playerRole === 'guest');

        const targetHeroes = isProcessingOwnEffects ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);

        let effectsProcessed = 0;

        // Process each BoulderInABottle effect
        for (const effect of effects) {
            // Create Boulder for each hero that exists and is alive
            let bouldersCreated = 0;
            
            for (const hero of targetHeroes) {
                if (hero && hero.alive) {
                    this.createBoulderForHero(hero, battleManager.currentTurn);
                    
                    // Play quick summoning animation on the boulder itself
                    this.playQuickSummoningEffect(hero);
                    bouldersCreated++;
                }
            }
            
            effectsProcessed++;
            
            // Log each boulder creation with detail
            if (bouldersCreated > 0) {
                const playerType = isProcessingOwnEffects ? 'You' : 'Opponent';
                const logType = isProcessingOwnEffects ? 'success' : 'error';
                
                battleManager.addCombatLog(
                    `🪨 ${playerType} summon ${bouldersCreated} Boulder(s) to defend heroes!`,
                    logType
                );
            }
        }

        // Summary log if multiple effects were processed
        if (effectsProcessed > 1) {
            battleManager.addCombatLog(
                `🪨 ${effectsProcessed} BoulderInABottle potions activated!`,
                'info'
            );
        }

        return effectsProcessed;
    }

    /**
     * Play boulder summoning animation for a hero
     * @param {Object} hero - Hero who is summoning the boulder
     * @param {Object} battleManager - Battle manager for delay functions
     */
    playQuickSummoningEffect(hero) {
        // Use setTimeout to not block execution
        setTimeout(() => {
            // Find the boulder creature element (should be the first creature since we unshift it)
            const boulderElement = document.querySelector(
                `.${hero.side}-slot.${hero.position}-slot .creature-icon[data-creature-index="0"]`
            );
            
            if (!boulderElement) {
                console.warn(`Could not find boulder element for summoning effect`);
                return;
            }

            // Create summoning circle overlay
            const summoningEffect = document.createElement('div');
            summoningEffect.className = 'boulder-summoning-effect';
            summoningEffect.innerHTML = `
                <div class="summoning-circle"></div>
                <div class="summoning-particles">
                    ${Array.from({length: 6}, (_, i) => 
                        `<div class="summon-particle particle-${i + 1}"></div>`
                    ).join('')}
                </div>
            `;
            
            // Position it over the boulder
            boulderElement.style.position = 'relative';
            boulderElement.appendChild(summoningEffect);
            
            // Remove effect after animation completes
            setTimeout(() => {
                if (summoningEffect.parentNode) {
                    summoningEffect.parentNode.removeChild(summoningEffect);
                }
            }, 800); // Total animation duration
            
        }, 50); // Small delay to ensure boulder is rendered
    }

    /**
     * Inject CSS for boulder summoning animations
     */
    injectSummoningAnimationCSS() {
        if (document.getElementById('boulderSummoningStyles')) {
            return; // Already injected
        }
        
        const style = document.createElement('style');
        style.id = 'boulderSummoningStyles';
        style.textContent = `
            /* Quick Boulder Summoning Effect */
            .boulder-summoning-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }

            /* Summoning Circle */
            .summoning-circle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 40px;
                height: 40px;
                border: 2px solid rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                box-shadow: 
                    0 0 10px rgba(255, 255, 255, 0.6),
                    inset 0 0 8px rgba(255, 255, 255, 0.3);
                animation: summonCircleAppear 0.8s ease-out;
            }

            /* Summoning Particles */
            .summoning-particles {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .summon-particle {
                position: absolute;
                width: 3px;
                height: 3px;
                background: white;
                border-radius: 50%;
                box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
                animation: summonParticle 0.8s ease-out;
            }

            /* Particle Positions */
            .particle-1 {
                top: 20%;
                left: 50%;
                animation-delay: 0s;
            }
            .particle-2 {
                top: 40%;
                left: 80%;
                animation-delay: 0.1s;
            }
            .particle-3 {
                top: 80%;
                left: 70%;
                animation-delay: 0.2s;
            }
            .particle-4 {
                top: 80%;
                left: 30%;
                animation-delay: 0.3s;
            }
            .particle-5 {
                top: 40%;
                left: 20%;
                animation-delay: 0.4s;
            }
            .particle-6 {
                top: 60%;
                left: 50%;
                animation-delay: 0.5s;
            }

            /* Keyframe Animations */
            @keyframes summonCircleAppear {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                    border-color: rgba(255, 255, 255, 0);
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 1;
                    border-color: rgba(255, 255, 255, 1);
                    box-shadow: 
                        0 0 15px rgba(255, 255, 255, 1),
                        inset 0 0 10px rgba(255, 255, 255, 0.5);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                    border-color: rgba(255, 255, 255, 0);
                }
            }

            @keyframes summonParticle {
                0% {
                    transform: scale(0) translateY(10px);
                    opacity: 0;
                }
                30% {
                    transform: scale(1.5) translateY(0);
                    opacity: 1;
                    box-shadow: 0 0 8px rgba(255, 255, 255, 1);
                }
                70% {
                    transform: scale(1) translateY(-5px);
                    opacity: 1;
                }
                100% {
                    transform: scale(0) translateY(-15px);
                    opacity: 0;
                }
            }

            /* Add slight glow to boulder during summoning */
            .boulder-summoning-effect + .creature-sprite-container .creature-sprite {
                filter: brightness(1.3) drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
                animation: boulderSummonGlow 0.8s ease-out;
            }

            @keyframes boulderSummonGlow {
                0% {
                    filter: brightness(1.3) drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
                }
                50% {
                    filter: brightness(1.6) drop-shadow(0 0 12px rgba(255, 255, 255, 0.8));
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(255, 255, 255, 0));
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Utility delay function that works with battle manager speed
     * @param {Object} battleManager - Battle manager instance
     * @param {number} ms - Milliseconds to delay
     */
    async delay(battleManager, ms) {
        const adjustedMs = battleManager && battleManager.delay ? 
            await battleManager.delay(ms) : 
            new Promise(resolve => setTimeout(resolve, ms));
        return adjustedMs;
    }

    /**
     * Create a Boulder creature for a specific hero
     * @param {Object} hero - Hero to add Boulder to
     * @param {number} currentTurn - Current turn number for HP calculation
     */
    createBoulderForHero(hero, currentTurn) {
        // Calculate Boulder HP: 50 base + 50 * current turn
        const baseHp = 50;
        const turnBonus = 50 * Math.max(1, currentTurn); // Ensure at least turn 1
        const finalHp = baseHp + turnBonus;

        // Create Boulder creature with full properties
        const boulder = {
            name: 'Boulder',
            image: './Creatures/Boulder.png', // Standard creature image path
            currentHp: finalHp,
            maxHp: finalHp,
            atk: 0, // Boulder doesn't attack
            alive: true,
            type: 'creature',
            addedAt: Date.now(),
            statusEffects: [],
            temporaryModifiers: {},
            isBoulder: true, // Special flag to identify boulders for cleanup
            createdFromPotion: true, // Additional flag for potion origin
            creationTurn: currentTurn // Track when it was created
        };

        // Add Boulder to the FRONT of the hero's creatures array
        // This makes it the first creature, so it will be targeted first
        hero.creatures.unshift(boulder);

        console.log(`🪨 Boulder created for ${hero.name} with ${finalHp} HP (Turn ${currentTurn})`);
        
        // Update hero's max necromancy stacks if applicable (Boulders can be revived)
        if (hero.hasAbility && hero.hasAbility('Necromancy')) {
            // Don't increase necromancy stacks for Boulder - it's a special summon
        }
    }

    /**
     * Static method to clean up all boulders after battle ends
     * @param {Object} battleManager - Battle manager instance
     * @returns {number} Number of boulders removed
     */
    static cleanupBouldersAfterBattle(battleManager) {
        if (!battleManager) {
            return 0;
        }

        // Get all heroes from both sides
        const allHeroes = [
            ...Object.values(battleManager.playerHeroes || {}),
            ...Object.values(battleManager.opponentHeroes || {})
        ];

        let bouldersRemoved = 0;
        
        for (const hero of allHeroes) {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                const originalLength = hero.creatures.length;
                
                // Filter out all boulders
                hero.creatures = hero.creatures.filter(creature => 
                    !creature.isBoulder && !creature.createdFromPotion
                );
                
                const removed = originalLength - hero.creatures.length;
                bouldersRemoved += removed;
                
                if (removed > 0) {
                    console.log(`🪨 Removed ${removed} Boulder(s) from ${hero.name}`);
                }
            }
        }

        if (bouldersRemoved > 0) {
            console.log(`🧹 Total: Removed ${bouldersRemoved} Boulders after battle ended`);
        }

        return bouldersRemoved;
    }

    /**
     * Check if a creature is a Boulder
     * @param {Object} creature - Creature to check
     * @returns {boolean} True if creature is a Boulder
     */
    static isBoulder(creature) {
        return creature && (creature.isBoulder || creature.name === 'Boulder');
    }

    /**
     * Get Boulder count for a hero
     * @param {Object} hero - Hero to check
     * @returns {number} Number of Boulders the hero has
     */
    static getBoulderCount(hero) {
        if (!hero || !hero.creatures) {
            return 0;
        }
        
        return hero.creatures.filter(creature => this.isBoulder(creature)).length;
    }
}