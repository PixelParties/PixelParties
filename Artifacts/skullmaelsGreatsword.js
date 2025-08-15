// ./Artifacts/skullmaelsGreatsword.js - Skullmael's Greatsword Artifact Implementation
// 20% chance per Greatsword to summon a random Skeleton creature when attacking

import { getCardInfo, getCardsBySubtype } from '../cardDatabase.js';

export class SkullmaelsGreatswordArtifact {
    constructor() {
        this.name = 'SkullmaelsGreatsword';
        this.procChance = 0.20; // 20% chance per sword
    }

    /**
     * Check if Skullmael's Greatsword should trigger for an attacker
     * @param {Object} attacker - The attacking hero
     * @param {Object} battleManager - Battle manager instance
     * @returns {boolean} Whether a skeleton should be summoned
     */
    shouldTriggerSkeletonSummon(attacker, battleManager) {
        if (!attacker || attacker.type === 'creature') {
            return false; // Only heroes can use equipment
        }

        // Count how many Greatswords the hero has equipped
        const greatswordCount = attacker.countEquipment ? 
            attacker.countEquipment('SkullmaelsGreatsword') : 0;
        
        if (greatswordCount === 0) {
            return false;
        }

        // Roll for each Greatsword, but only summon once max
        let triggered = false;
        for (let i = 0; i < greatswordCount; i++) {
            const roll = battleManager.getRandomFloat(0, 1);
            if (roll < this.procChance) {
                triggered = true;
                break; // Only need one success
            }
        }

        return triggered;
    }

    /**
     * Get a random Skeleton creature from the card database
     * @param {Object} battleManager - Battle manager instance
     * @returns {Object|null} Random skeleton card info or null
     */
    getRandomSkeletonCard(battleManager) {
        // Get all creature cards
        const allCreatures = getCardsBySubtype('Creature');
        
        // Filter for skeletons (name contains "Skeleton")
        const skeletonCreatures = allCreatures.filter(card => 
            card.name.toLowerCase().includes('skeleton')
        );

        if (skeletonCreatures.length === 0) {
            console.error('No skeleton creatures found in database!');
            return null;
        }

        // Pick a random skeleton
        const randomSkeleton = battleManager.getRandomChoice(skeletonCreatures);
        
        console.log(`🦴 Selected random skeleton: ${randomSkeleton.name}`);
        return randomSkeleton;
    }

    /**
     * Execute skeleton summoning for a hero
     * @param {Object} attacker - The attacking hero
     * @param {Object} battleManager - Battle manager instance
     */
    async executeSkeletonSummon(attacker, battleManager) {
        if (!battleManager.isAuthoritative) return;

        const skeletonCard = this.getRandomSkeletonCard(battleManager);
        if (!skeletonCard) {
            console.error('Failed to get random skeleton card');
            return;
        }

        // Inject summoning animation CSS
        this.injectSummoningAnimationCSS();

        // Create the skeleton creature (data model)
        this.createSkeletonForHero(attacker, skeletonCard, battleManager.currentTurn);

        // Log the summoning
        battleManager.addCombatLog(
            `⚔️🦴 ${attacker.name}'s Greatsword summons ${skeletonCard.name}!`,
            attacker.side === 'player' ? 'success' : 'error'
        );

        // Send network update to guest
        battleManager.sendBattleUpdate('greatsword_skeleton_summon', {
            attackerAbsoluteSide: attacker.absoluteSide,
            attackerPosition: attacker.position,
            attackerName: attacker.name,
            skeletonName: skeletonCard.name,
            skeletonHp: skeletonCard.hp || 50,
            turn: battleManager.currentTurn
        });

        // Update visuals and THEN play animation
        if (battleManager.battleScreen) {
            // Re-render creatures first
            battleManager.battleScreen.renderCreaturesAfterInit();
            
            // Wait for DOM to update, then play animation
            setTimeout(() => {
                this.playQuickSummoningEffect(attacker, 0);
            }, 50);
        } else {
            // Fallback if no battleScreen
            setTimeout(() => {
                this.playQuickSummoningEffect(attacker, 0);
            }, 100);
        }
    }

    /**
     * Create a skeleton creature for a specific hero
     * @param {Object} hero - Hero to add skeleton to
     * @param {Object} skeletonCard - Card info for the skeleton
     * @param {number} currentTurn - Current turn number
     */
    createSkeletonForHero(hero, skeletonCard, currentTurn) {
        // Get base HP from card info (default 50 for skeletons)
        const baseHp = skeletonCard.hp || 50;
        
        // Apply SummoningMagic bonus if hero has it
        let hpMultiplier = 1.0;
        if (hero.hasAbility && hero.hasAbility('SummoningMagic')) {
            const summoningMagicLevel = hero.getAbilityStackCount('SummoningMagic');
            hpMultiplier = 1 + (0.25 * summoningMagicLevel);
        }
        
        const finalHp = Math.floor(baseHp * hpMultiplier);

        // Create skeleton creature with full properties
        const skeleton = {
            name: skeletonCard.name,
            image: `./Creatures/${skeletonCard.name}.png`, // Standard creature image path
            currentHp: finalHp,
            maxHp: finalHp,
            atk: 0, // Skeletons summoned this way don't attack
            alive: true,
            type: 'creature',
            addedAt: Date.now(),
            statusEffects: [],
            temporaryModifiers: {},
            isGreatswordSkeleton: true, // Special flag for cleanup
            createdFromGreatsword: true, // Additional flag for origin
            creationTurn: currentTurn // Track when it was created
        };

        // Add skeleton to the FRONT of the hero's creatures array
        hero.creatures.unshift(skeleton);

        console.log(`⚔️🦴 ${skeletonCard.name} created for ${hero.name} with ${finalHp} HP (Turn ${currentTurn})`);
    }

    /**
     * Play skeleton summoning animation
     * @param {Object} hero - Hero who is summoning
     * @param {number} creatureIndex - Index of the creature (0 for front)
     */
    playQuickSummoningEffect(hero, creatureIndex = 0) {
        // Find the skeleton creature element
        const skeletonElement = document.querySelector(
            `.${hero.side}-slot.${hero.position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!skeletonElement) {
            console.warn(`Could not find skeleton element for summoning effect`);
            return;
        }

        // Add summoning class for glow effect
        skeletonElement.classList.add('summoning-skeleton');

        // Create summoning circle overlay with white light theme
        const summoningEffect = document.createElement('div');
        summoningEffect.className = 'skeleton-summoning-effect';
        summoningEffect.innerHTML = `
            <div class="summoning-circle-skeleton"></div>
            <div class="summoning-particles-skeleton">
                ${Array.from({length: 8}, (_, i) => 
                    `<div class="summon-particle-skeleton particle-${i + 1}"></div>`
                ).join('')}
            </div>
        `;
        
        // Position it over the skeleton
        skeletonElement.style.position = 'relative';
        skeletonElement.appendChild(summoningEffect);
        
        // Remove effect and class after animation completes
        setTimeout(() => {
            if (summoningEffect.parentNode) {
                summoningEffect.parentNode.removeChild(summoningEffect);
            }
            skeletonElement.classList.remove('summoning-skeleton');
        }, 800); // Total animation duration
    }

    /**
     * Inject CSS for skeleton summoning animations
     */
    injectSummoningAnimationCSS() {
        if (document.getElementById('skeletonSummoningStyles')) {
            return; // Already injected
        }
        
        const style = document.createElement('style');
        style.id = 'skeletonSummoningStyles';
        style.textContent = `
            /* Skeleton Summoning Effect - White/Bright Theme */
            .skeleton-summoning-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }

            /* Summoning Circle - Bright white */
            .summoning-circle-skeleton {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 45px;
                height: 45px;
                border: 3px solid rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                box-shadow: 
                    0 0 20px rgba(255, 255, 255, 0.8),
                    0 0 40px rgba(255, 255, 255, 0.6),
                    inset 0 0 15px rgba(255, 255, 255, 0.4);
                animation: summonCircleAppearSkeleton 0.8s ease-out;
            }

            /* Summoning Particles - Bright white sparkles */
            .summoning-particles-skeleton {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .summon-particle-skeleton {
                position: absolute;
                width: 4px;
                height: 4px;
                background: white;
                border-radius: 50%;
                box-shadow: 
                    0 0 6px rgba(255, 255, 255, 1),
                    0 0 12px rgba(255, 255, 255, 0.8);
                animation: summonParticleSkeleton 0.8s ease-out;
            }

            /* Add some star-shaped particles for variety */
            .summon-particle-skeleton:nth-child(even) {
                width: 3px;
                height: 3px;
                background: radial-gradient(circle, white 0%, rgba(255, 255, 255, 0.6) 100%);
            }

            /* Particle Positions - arranged in a circle */
            .summon-particle-skeleton.particle-1 {
                top: 15%;
                left: 50%;
                animation-delay: 0s;
            }
            .summon-particle-skeleton.particle-2 {
                top: 30%;
                left: 75%;
                animation-delay: 0.08s;
            }
            .summon-particle-skeleton.particle-3 {
                top: 50%;
                left: 80%;
                animation-delay: 0.16s;
            }
            .summon-particle-skeleton.particle-4 {
                top: 70%;
                left: 65%;
                animation-delay: 0.24s;
            }
            .summon-particle-skeleton.particle-5 {
                top: 70%;
                left: 35%;
                animation-delay: 0.32s;
            }
            .summon-particle-skeleton.particle-6 {
                top: 50%;
                left: 20%;
                animation-delay: 0.40s;
            }
            .summon-particle-skeleton.particle-7 {
                top: 30%;
                left: 25%;
                animation-delay: 0.48s;
            }
            .summon-particle-skeleton.particle-8 {
                top: 50%;
                left: 50%;
                animation-delay: 0.56s;
            }

            /* Keyframe Animations */
            @keyframes summonCircleAppearSkeleton {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 0;
                    border-color: rgba(255, 255, 255, 0);
                    filter: blur(3px);
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.3) rotate(90deg);
                    opacity: 1;
                    border-color: rgba(255, 255, 255, 1);
                    box-shadow: 
                        0 0 30px rgba(255, 255, 255, 1),
                        0 0 60px rgba(255, 255, 255, 0.8),
                        inset 0 0 20px rgba(255, 255, 255, 0.6);
                    filter: blur(0px);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1) rotate(180deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.7) rotate(360deg);
                    opacity: 0;
                    border-color: rgba(255, 255, 255, 0);
                    filter: blur(2px);
                }
            }

            @keyframes summonParticleSkeleton {
                0% {
                    transform: scale(0) translateY(15px);
                    opacity: 0;
                    filter: brightness(2);
                }
                30% {
                    transform: scale(1.8) translateY(0);
                    opacity: 1;
                    box-shadow: 
                        0 0 10px rgba(255, 255, 255, 1),
                        0 0 20px rgba(255, 255, 255, 0.8);
                    filter: brightness(1.5);
                }
                70% {
                    transform: scale(1) translateY(-8px);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(0) translateY(-20px);
                    opacity: 0;
                    filter: brightness(0.5);
                }
            }

            /* Add bright white glow to skeleton during summoning */
            .creature-icon.summoning-skeleton {
                animation: skeletonSummonGlow 0.8s ease-out;
            }

            .creature-icon.summoning-skeleton .creature-sprite {
                filter: brightness(1.5) drop-shadow(0 0 15px rgba(255, 255, 255, 0.8));
            }

            @keyframes skeletonSummonGlow {
                0% {
                    filter: brightness(2) drop-shadow(0 0 20px rgba(255, 255, 255, 1));
                    transform: scale(0.8);
                }
                50% {
                    filter: brightness(1.8) drop-shadow(0 0 25px rgba(255, 255, 255, 0.9));
                    transform: scale(1.05);
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(255, 255, 255, 0));
                    transform: scale(1);
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Handle guest receiving skeleton summon message
     * @param {Object} data - Summon data from host
     * @param {Object} battleManager - Battle manager instance
     */
    handleGuestSkeletonSummon(data, battleManager) {
        const { attackerAbsoluteSide, attackerPosition, attackerName, skeletonName, skeletonHp, turn } = data;
        
        // ✅ Convert absoluteSide to guest's local perspective
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const attackerLocalSide = (attackerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the hero using the correct converted side
        const heroes = attackerLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const hero = heroes[attackerPosition];
        
        if (!hero) {
            console.error(`Could not find hero at ${attackerLocalSide} ${attackerPosition}`);
            return;
        }

        // Get skeleton card info
        const skeletonCard = getCardInfo(skeletonName);
        if (!skeletonCard) {
            console.error(`Could not find card info for ${skeletonName}`);
            return;
        }

        // Inject animation CSS
        this.injectSummoningAnimationCSS();

        // Create the skeleton (data model)
        this.createSkeletonForHero(hero, skeletonCard, turn);

        // Log the summoning with correct side perspective
        battleManager.addCombatLog(
            `⚔️🦴 ${attackerName}'s Greatsword summons ${skeletonName}!`,
            attackerLocalSide === 'player' ? 'success' : 'error'  // ✅ Use converted side
        );

        // Update visuals and THEN play animation
        if (battleManager.battleScreen) {
            // Re-render creatures first
            battleManager.battleScreen.renderCreaturesAfterInit();
            
            // Wait for DOM to update, then play animation
            setTimeout(() => {
                this.playQuickSummoningEffect(hero, 0);
            }, 50);
        } else {
            // Fallback if no battleScreen
            setTimeout(() => {
                this.playQuickSummoningEffect(hero, 0);
            }, 100);
        }
    }

    /**
     * Static method to clean up all greatsword skeletons after battle ends
     * @param {Object} battleManager - Battle manager instance
     * @returns {number} Number of skeletons removed
     */
    static cleanupGreatswordSkeletonsAfterBattle(battleManager) {
        if (!battleManager) {
            return 0;
        }

        // Get all heroes from both sides
        const allHeroes = [
            ...Object.values(battleManager.playerHeroes || {}),
            ...Object.values(battleManager.opponentHeroes || {})
        ];

        let skeletonsRemoved = 0;
        
        for (const hero of allHeroes) {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                const originalLength = hero.creatures.length;
                
                // Filter out all greatsword skeletons
                hero.creatures = hero.creatures.filter(creature => 
                    !creature.isGreatswordSkeleton && !creature.createdFromGreatsword
                );
                
                const removed = originalLength - hero.creatures.length;
                skeletonsRemoved += removed;
                
                if (removed > 0) {
                    console.log(`⚔️🦴 Removed ${removed} Greatsword Skeleton(s) from ${hero.name}`);
                }
            }
        }

        if (skeletonsRemoved > 0) {
            console.log(`🧹 Total: Removed ${skeletonsRemoved} Greatsword Skeletons after battle ended`);
        }

        return skeletonsRemoved;
    }

    /**
     * Check if a creature is a Greatsword Skeleton
     * @param {Object} creature - Creature to check
     * @returns {boolean} True if creature is a Greatsword Skeleton
     */
    static isGreatswordSkeleton(creature) {
        return creature && (creature.isGreatswordSkeleton || creature.createdFromGreatsword);
    }
}

// Create singleton instance
export const skullmaelsGreatswordArtifact = new SkullmaelsGreatswordArtifact();

// Export for easier integration with AttackEffectsManager
export default SkullmaelsGreatswordArtifact;

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.skullmaelsGreatswordArtifact = skullmaelsGreatswordArtifact;
}