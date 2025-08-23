// ./Potions/monsterInABottle.js - Monster In A Bottle Potion Implementation
// Spawns random level 1 or lower creatures at the front of all player's heroes at battle start

import { getCardInfo, getCardsByType } from '../cardDatabase.js';

export class MonsterInABottlePotion {
    constructor() {
        this.name = 'MonsterInABottle';
    }

    /**
     * Handle MonsterInABottle potion effects for a player
     * @param {Array} effects - Array of MonsterInABottle effects to process
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - Battle manager instance
     * @returns {number} Number of effects processed
     */
    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0) {
            return 0;
        }

        console.log(`🎲 Applying ${effects.length} MonsterInABottle effects for ${playerRole}`);

        // Inject summoning animation CSS
        this.injectSummoningAnimationCSS();

        const isProcessingOwnEffects = (battleManager.isHost && playerRole === 'host') || 
                                    (!battleManager.isHost && playerRole === 'guest');

        const targetHeroes = isProcessingOwnEffects ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);

        let effectsProcessed = 0;
        const creaturesCreated = []; // Track created creatures for network sync

        // Process each MonsterInABottle effect
        for (const effect of effects) {
            let creaturesThisEffect = 0;
            
            for (const hero of targetHeroes) {
                if (hero && hero.alive) {
                    const newCreature = this.createRandomCreatureForHero(hero, battleManager.currentTurn, battleManager);
                    
                    // Track the created creature for network sync
                    if (newCreature) {
                        creaturesCreated.push({
                            heroPosition: hero.position,
                            heroAbsoluteSide: hero.absoluteSide,
                            creature: newCreature
                        });
                    }
                    
                    this.playQuickSummoningEffect(hero);
                    creaturesThisEffect++;
                }
            }
            
            effectsProcessed++;
            
            if (creaturesThisEffect > 0) {
                const playerType = isProcessingOwnEffects ? 'You' : 'Opponent';
                const logType = isProcessingOwnEffects ? 'success' : 'error';
                
                battleManager.addCombatLog(
                    `🎲 ${playerType} summon ${creaturesThisEffect} random creature(s) to aid heroes!`,
                    logType
                );
            }
        }

        // 🔧 NEW: Send network sync for created creatures
        if (battleManager.isAuthoritative && creaturesCreated.length > 0) {
            battleManager.sendBattleUpdate('monster_bottle_creatures_created', {
                creaturesCreated: creaturesCreated,
                playerRole: playerRole,
                timestamp: Date.now()
            });
        }

        if (effectsProcessed > 1) {
            battleManager.addCombatLog(
                `🎲 ${effectsProcessed} MonsterInABottle potions activated!`,
                'info'
            );
        }

        return effectsProcessed;
    }

    /**
     * Get all level 1 or lower creatures from the card database
     * @returns {Array} Array of eligible creature card names
     */
    getEligibleCreatures() {
        // Get all spell cards (creatures have cardType 'Spell' and subtype 'Creature')
        const allSpells = getCardsByType('Spell');
        
        // Filter for creatures that are level 1 or lower
        const eligibleCreatures = allSpells.filter(card => 
            card.subtype === 'Creature' && 
            card.level !== undefined && 
            card.level <= 1
        );
        
        console.log(`🎲 Found ${eligibleCreatures.length} eligible creatures for MonsterInABottle:`, 
                   eligibleCreatures.map(c => `${c.name} (lv${c.level})`));
        
        return eligibleCreatures.map(card => card.name);
    }

    /**
     * Play creature summoning animation for a hero
     * @param {Object} hero - Hero who is summoning the creature
     */
    playQuickSummoningEffect(hero) {
        // Use setTimeout to not block execution
        setTimeout(() => {
            // Find the creature element (should be the first creature since we unshift it)
            const creatureElement = document.querySelector(
                `.${hero.side}-slot.${hero.position}-slot .creature-icon[data-creature-index="0"]`
            );
            
            if (!creatureElement) {
                console.warn(`Could not find creature element for summoning effect`);
                return;
            }

            // Create summoning circle overlay
            const summoningEffect = document.createElement('div');
            summoningEffect.className = 'monster-summoning-effect';
            summoningEffect.innerHTML = `
                <div class="summoning-circle"></div>
                <div class="summoning-particles">
                    ${Array.from({length: 6}, (_, i) => 
                        `<div class="summon-particle particle-${i + 1}"></div>`
                    ).join('')}
                </div>
            `;
            
            // Position it over the creature
            creatureElement.style.position = 'relative';
            creatureElement.appendChild(summoningEffect);
            
            // Remove effect after animation completes
            setTimeout(() => {
                if (summoningEffect.parentNode) {
                    summoningEffect.parentNode.removeChild(summoningEffect);
                }
            }, 800); // Total animation duration
            
        }, 50); // Small delay to ensure creature is rendered
    }

    /**
     * Inject CSS for creature summoning animations
     */
    injectSummoningAnimationCSS() {
        if (document.getElementById('monsterSummoningStyles')) {
            return; // Already injected
        }
        
        const style = document.createElement('style');
        style.id = 'monsterSummoningStyles';
        style.textContent = `
            /* Quick Monster Summoning Effect */
            .monster-summoning-effect {
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
                border: 2px solid rgba(138, 43, 226, 0.8);
                border-radius: 50%;
                box-shadow: 
                    0 0 10px rgba(138, 43, 226, 0.6),
                    inset 0 0 8px rgba(138, 43, 226, 0.3);
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
                background: #8a2be2;
                border-radius: 50%;
                box-shadow: 0 0 4px rgba(138, 43, 226, 0.8);
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
                    border-color: rgba(138, 43, 226, 0);
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 1;
                    border-color: rgba(138, 43, 226, 1);
                    box-shadow: 
                        0 0 15px rgba(138, 43, 226, 1),
                        inset 0 0 10px rgba(138, 43, 226, 0.5);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                    border-color: rgba(138, 43, 226, 0);
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
                    box-shadow: 0 0 8px rgba(138, 43, 226, 1);
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

            /* Add slight glow to creature during summoning */
            .monster-summoning-effect + .creature-sprite-container .creature-sprite {
                filter: brightness(1.3) drop-shadow(0 0 8px rgba(138, 43, 226, 0.5));
                animation: monsterSummonGlow 0.8s ease-out;
            }

            @keyframes monsterSummonGlow {
                0% {
                    filter: brightness(1.3) drop-shadow(0 0 8px rgba(138, 43, 226, 0.5));
                }
                50% {
                    filter: brightness(1.6) drop-shadow(0 0 12px rgba(138, 43, 226, 0.8));
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(138, 43, 226, 0));
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Create a random level 1 or lower creature for a specific hero
     * @param {Object} hero - Hero to add creature to
     * @param {number} currentTurn - Current turn number for HP calculation
     * @param {Object} battleManager - Battle manager instance
     */
    createRandomCreatureForHero(hero, currentTurn, battleManager) {
        // Get eligible creatures
        const eligibleCreatures = this.getEligibleCreatures();
        
        if (eligibleCreatures.length === 0) {
            console.warn('No eligible creatures found for MonsterInABottle');
            return;
        }

        // Randomly select a creature using battleManager's deterministic randomness
        const randomCreatureName = battleManager.getRandomChoice(eligibleCreatures);
        
        // Get creature info from card database
        const creatureInfo = getCardInfo(randomCreatureName);
        
        if (!creatureInfo) {
            console.error(`Could not find creature info for ${randomCreatureName}`);
            return;
        }

        // Calculate creature HP (use base HP with SummoningMagic bonuses like other creatures)
        const baseHp = creatureInfo.hp || 10;
        
        let hpMultiplier = 1.0;
        if (hero.hasAbility('SummoningMagic')) {
            const summoningMagicLevel = hero.getAbilityStackCount('SummoningMagic');
            hpMultiplier = 1 + (0.25 * summoningMagicLevel);
        }
        
        const finalHp = Math.floor(baseHp * hpMultiplier);

        // Create creature with full properties
        const randomCreature = {
            name: randomCreatureName,
            image: creatureInfo.image,
            currentHp: finalHp,
            maxHp: finalHp,
            atk: creatureInfo.atk || 0,
            alive: true,
            type: 'creature',
            addedAt: Date.now(),
            statusEffects: [],
            temporaryModifiers: {},
            isMonsterInABottle: true, // Special flag to identify creatures from this potion
            createdFromPotion: true, // Additional flag for potion origin
            creationTurn: currentTurn, // Track when it was created
            level: creatureInfo.level || 0,
            physicalAttack: creatureInfo.physicalAttack
        };

        // Add creature to the FRONT of the hero's creatures array
        hero.creatures.unshift(randomCreature);

        console.log(`🎲 Random creature ${randomCreatureName} (lv${creatureInfo.level}) created for ${hero.name} with ${finalHp} HP (Turn ${currentTurn})`);
        
        return randomCreature;
    }

    /**
     * Handle guest synchronization of created creatures
     * @param {Object} data - Network data containing created creatures
     * @param {Object} battleManager - Battle manager instance
     */
    handleGuestCreaturesCreated(data, battleManager) {
        if (battleManager.isAuthoritative) {
            console.warn('Host should not receive monster bottle creatures created messages');
            return;
        }

        const { creaturesCreated, playerRole } = data;
        
        console.log(`🎲 Guest: Receiving ${creaturesCreated.length} MonsterInABottle creatures`);

        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';

        // Apply each created creature to the guest's local state
        for (const creatureData of creaturesCreated) {
            const { heroPosition, heroAbsoluteSide, creature } = creatureData;
            
            // Determine local side for guest
            const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            
            // Find the target hero
            const heroes = heroLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
            const targetHero = heroes[heroPosition];
            
            if (targetHero) {
                // Add creature to the front of the hero's creatures array (same as host)
                targetHero.creatures.unshift(creature);
                
                console.log(`🎲 Guest: Added ${creature.name} to ${heroLocalSide} ${targetHero.name}`);
            } else {
                console.error(`Guest: Could not find hero for MonsterInABottle creature: ${heroLocalSide} ${heroPosition}`);
            }
        }

        // Re-render creatures on guest side
        if (battleManager.battleScreen && typeof battleManager.battleScreen.renderCreaturesAfterInit === 'function') {
            battleManager.battleScreen.renderCreaturesAfterInit();
            console.log('🎲 Guest: Re-rendered creatures after MonsterInABottle sync');
        }

        // Update necromancy displays if needed
        if (battleManager.necromancyManager) {
            battleManager.necromancyManager.initializeNecromancyStackDisplays();
        }

        // Add confirmation to combat log
        const playerType = (playerRole === 'host' && battleManager.isHost) || 
                        (playerRole === 'guest' && !battleManager.isHost) ? 'You' : 'Opponent';
        const logType = playerType === 'You' ? 'success' : 'error';
        
        battleManager.addCombatLog(
            `🎲 ${playerType} summoned ${creaturesCreated.length} creature(s) to aid heroes!`,
            logType
        );
    }

    /**
     * Static method to clean up all monster bottle creatures after battle ends
     * @param {Object} battleManager - Battle manager instance
     * @returns {number} Number of creatures removed
     */
    static cleanupMonsterBottleAfterBattle(battleManager) {
        if (!battleManager) {
            return 0;
        }

        // Get all heroes from both sides
        const allHeroes = [
            ...Object.values(battleManager.playerHeroes || {}),
            ...Object.values(battleManager.opponentHeroes || {})
        ];

        let creaturesRemoved = 0;
        
        for (const hero of allHeroes) {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                const originalLength = hero.creatures.length;
                
                // Filter out all MonsterInABottle creatures
                hero.creatures = hero.creatures.filter(creature => 
                    !creature.isMonsterInABottle && 
                    !(creature.createdFromPotion && creature.name !== 'Boulder') // Keep Boulders but remove other potion creatures
                );
                
                const removed = originalLength - hero.creatures.length;
                creaturesRemoved += removed;
                
                if (removed > 0) {
                    console.log(`🎲 Removed ${removed} MonsterInABottle creature(s) from ${hero.name}`);
                }
            }
        }

        if (creaturesRemoved > 0) {
            console.log(`🧹 Total: Removed ${creaturesRemoved} MonsterInABottle creatures after battle ended`);
        }

        return creaturesRemoved;
    }

    /**
     * Check if a creature is from MonsterInABottle
     * @param {Object} creature - Creature to check
     * @returns {boolean} True if creature is from MonsterInABottle
     */
    static isMonsterInABottleCreature(creature) {
        return creature && creature.isMonsterInABottle;
    }

    /**
     * Get MonsterInABottle creature count for a hero
     * @param {Object} hero - Hero to check
     * @returns {number} Number of MonsterInABottle creatures the hero has
     */
    static getMonsterInABottleCount(hero) {
        if (!hero || !hero.creatures) {
            return 0;
        }
        
        return hero.creatures.filter(creature => this.isMonsterInABottleCreature(creature)).length;
    }
}