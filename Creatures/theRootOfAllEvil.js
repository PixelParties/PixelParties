// ./Creatures/theRootOfAllEvil.js - The Root Of All Evil Creature Implementation
// Duplicates a random ally creature (excluding other copies of itself)

export class TheRootOfAllEvilCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        // Inject summoning animation CSS (reused from BoulderInABottle pattern)
        this.injectSummoningAnimationCSS();
        
        console.log('👹 The Root Of All Evil Creature module initialized');
    }

    // Check if a creature is The Root Of All Evil
    static isTheRootOfAllEvil(creatureName) {
        return creatureName === 'TheRootOfAllEvil';
    }

    // Execute The Root Of All Evil special attack - duplicate a random ally creature
    async executeSpecialAttack(rootActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const rootCreature = rootActor.data;
        const rootHero = rootActor.hero;
        const attackerSide = rootHero.side;
        
        // Safety check: ensure Root is still alive
        if (!rootCreature.alive || rootCreature.currentHp <= 0) {
            console.log(`The Root Of All Evil is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `👹 ${rootCreature.name} seeks to corrupt and multiply the living!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find all possible ally creature targets (excluding other Root Of All Evil copies)
        const allyTargets = this.findValidAllyCreatures(attackerSide, rootHero, rootActor.index);
        
        if (allyTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${rootCreature.name} finds no creatures to duplicate - no valid allies!`, 
                'info'
            );
            return;
        }

        // Select a random target creature to duplicate
        const selectedTarget = this.selectRandomTarget(allyTargets);
        
        if (!selectedTarget) {
            this.battleManager.addCombatLog(
                `💨 ${rootCreature.name} cannot find a suitable creature to duplicate!`, 
                'warning'
            );
            return;
        }
        
        this.battleManager.addCombatLog(
            `🔄 ${rootCreature.name} targets ${selectedTarget.creature.name} for duplication!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE starting host animation
        this.sendSpecialAttackUpdate(rootActor, selectedTarget, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute the duplication
        await this.executeDuplication(rootActor, selectedTarget, position);
    }

    // Find all valid ally creatures for duplication (excluding other Root Of All Evil)
    findValidAllyCreatures(attackerSide, rootHero, rootActorIndex) {
        const allyHeroes = attackerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const targets = [];

        // Scan all ally positions for valid creatures
        for (const position of ['left', 'center', 'right']) {
            const hero = allyHeroes[position];
            if (hero && hero.alive && hero.creatures && hero.creatures.length > 0) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive && creature.currentHp > 0) {
                        // Exclude other copies of The Root Of All Evil
                        if (TheRootOfAllEvilCreature.isTheRootOfAllEvil(creature.name)) {
                            return; // Skip this creature
                        }
                        
                        // Exclude the acting Root creature itself (same hero, same index)
                        if (hero === rootHero && index === rootActorIndex) {
                            return; // Skip the acting creature
                        }
                        
                        // Double-check that the creature element exists
                        const creatureElement = document.querySelector(
                            `.${attackerSide}-slot.${position}-slot .creature-icon[data-creature-index="${index}"]`
                        );
                        if (creatureElement) {
                            targets.push({
                                creature: creature,
                                hero: hero,
                                creatureIndex: index,
                                position: position,
                                side: attackerSide
                            });
                        }
                    }
                });
            }
        }

        console.log(`The Root Of All Evil found ${targets.length} valid ally targets:`, 
            targets.map(t => `${t.creature.name} at ${t.position}`));
        return targets;
    }

    // Select a random target from available creatures
    selectRandomTarget(availableTargets) {
        if (availableTargets.length === 0) {
            return null;
        }
        
        const shuffledTargets = this.battleManager.shuffleArray([...availableTargets]);
        return shuffledTargets[0];
    }

    // Execute the creature duplication
    async executeDuplication(rootActor, targetData, position) {
        const attackerSide = rootActor.hero.side;
        const rootHero = rootActor.hero;
        
        // Create a copy of the target creature
        const originalCreature = targetData.creature;
        const duplicatedCreature = this.createCreatureCopy(originalCreature);
        
        // Add the duplicated creature to the same hero as the Root Of All Evil
        rootHero.creatures.push(duplicatedCreature);
        
        // Play summoning animation
        await this.playDuplicationSummoningEffect(rootHero, duplicatedCreature);
        
        // Update displays
        if (this.battleManager.battleScreen && typeof this.battleManager.battleScreen.renderCreaturesAfterInit === 'function') {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
        }

        // Update necromancy displays if applicable
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.initializeNecromancyStackDisplays();
        }

        this.battleManager.addCombatLog(
            `✨ ${rootActor.data.name} successfully duplicates ${originalCreature.name}!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );
    }

    // Create a copy of a creature with identical stats
    createCreatureCopy(originalCreature) {
        return {
            name: originalCreature.name,
            image: originalCreature.image || `./Creatures/${originalCreature.name}.png`,
            currentHp: originalCreature.currentHp,
            maxHp: originalCreature.maxHp,
            atk: originalCreature.atk || 0,
            alive: true,
            type: 'creature',
            addedAt: Date.now(),
            statusEffects: [...(originalCreature.statusEffects || [])],
            temporaryModifiers: {...(originalCreature.temporaryModifiers || {})},
            isDuplicated: true, // Special flag to identify duplicated creatures
            duplicatedFrom: originalCreature.name, // Track what it was duplicated from
            createdByRootOfAllEvil: true // Track creation source
        };
    }

    // Play summoning animation for the duplicated creature (reused from BoulderInABottle)
    async playDuplicationSummoningEffect(hero, duplicatedCreature) {
        // Add extra delay to ensure creature is fully rendered
        setTimeout(() => {
            // Find the newly added creature element (should be the last creature)
            const newCreatureIndex = hero.creatures.length - 1;
            
            // Try multiple selectors to find the creature element
            let creatureElement = null;
            
            // Primary selector
            creatureElement = document.querySelector(
                `.${hero.side}-slot.${hero.position}-slot .creature-icon[data-creature-index="${newCreatureIndex}"]`
            );
            
            // Fallback selector
            if (!creatureElement) {
                creatureElement = document.querySelector(
                    `.${hero.side}-slot.${hero.position}-slot .creatures-container .creature-icon:last-child`
                );
            }
            
            // Another fallback
            if (!creatureElement) {
                const creatureContainer = document.querySelector(
                    `.${hero.side}-slot.${hero.position}-slot .creatures-container`
                );
                if (creatureContainer) {
                    const creatureIcons = creatureContainer.querySelectorAll('.creature-icon');
                    if (creatureIcons.length > 0) {
                        creatureElement = creatureIcons[creatureIcons.length - 1];
                    }
                }
            }
            
            if (!creatureElement) {
                console.warn(`Could not find duplicated creature element for summoning effect (index: ${newCreatureIndex})`);
                return;
            }

            console.log(`Found duplicated creature element, playing summoning animation`);

            // Create summoning circle overlay
            const summoningEffect = document.createElement('div');
            summoningEffect.className = 'root-duplication-summoning-effect';
            summoningEffect.innerHTML = `
                <div class="summoning-circle"></div>
                <div class="summoning-particles">
                    ${Array.from({length: 8}, (_, i) => 
                        `<div class="summon-particle particle-${i + 1}"></div>`
                    ).join('')}
                </div>
            `;
            
            // Position it over the duplicated creature
            creatureElement.style.position = 'relative';
            creatureElement.appendChild(summoningEffect);
            
            // Remove effect after animation completes
            setTimeout(() => {
                if (summoningEffect.parentNode) {
                    summoningEffect.parentNode.removeChild(summoningEffect);
                }
            }, 900);
            
        }, 200); // Increased delay for better timing
    }

    // Send special attack data to guest for synchronization
    sendSpecialAttackUpdate(rootActor, targetData, position) {
        const attackerSide = rootActor.hero.side;
        
        this.battleManager.sendBattleUpdate('root_of_all_evil_special_attack', {
            rootData: {
                side: attackerSide,
                position: position,
                creatureIndex: rootActor.index,
                name: rootActor.data.name,
                absoluteSide: rootActor.hero.absoluteSide
            },
            targetData: {
                creatureName: targetData.creature.name,
                position: targetData.position,
                side: targetData.side,
                absoluteSide: targetData.hero.absoluteSide,
                duplicatedCreature: this.createCreatureCopy(targetData.creature)
            }
        });
    }

    // Handle Root Of All Evil special attack on guest side
    handleGuestSpecialAttack(data) {
        const { rootData, targetData } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const rootLocalSide = (rootData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💹 ${rootData.name} corrupts reality and duplicates ${targetData.creatureName}!`, 
            rootLocalSide === 'player' ? 'success' : 'error'
        );

        // CRITICAL FIX: Add small delay to ensure proper timing
        setTimeout(() => {
            this.createGuestDuplication(rootData, targetData, myAbsoluteSide);
        }, 100);
    }

    // Create duplication on guest side
    async createGuestDuplication(rootData, targetData, myAbsoluteSide) {
        const rootLocalSide = (rootData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the root hero on guest side
        const rootHeroes = rootLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const rootHero = rootHeroes[rootData.position];
        
        if (!rootHero) {
            console.warn('Root hero not found on guest side for duplication');
            return;
        }

        // Ensure duplicated creature data is complete
        const duplicatedCreature = targetData.duplicatedCreature;
        if (!duplicatedCreature) {
            console.warn('No duplicated creature data received on guest side');
            return;
        }

        // Add the duplicated creature to the root hero
        rootHero.creatures.push(duplicatedCreature);
        
        console.log(`Guest: Added duplicated ${duplicatedCreature.name} to ${rootHero.name}'s creatures array`);
        
        // Force immediate visual update with multiple fallbacks
        this.forceGuestVisualUpdate();
        
        // Play summoning animation AFTER visual update
        setTimeout(async () => {
            await this.playDuplicationSummoningEffect(rootHero, duplicatedCreature);
        }, 150);
        
        this.battleManager.addCombatLog(
            `✨ A perfect copy of ${targetData.creatureName} emerges from dark magic!`, 
            rootLocalSide === 'player' ? 'success' : 'error'
        );
    }

    forceGuestVisualUpdate() {
        // Method 1: Standard creature rendering
        if (this.battleManager.battleScreen && 
            typeof this.battleManager.battleScreen.renderCreaturesAfterInit === 'function') {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
            console.log('Guest: Forced creature rendering via renderCreaturesAfterInit');
        }

        // Method 2: Necromancy display update
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.initializeNecromancyStackDisplays();
            console.log('Guest: Updated necromancy displays');
        }

        // Method 3: Direct visual refresh fallback
        setTimeout(() => {
            if (this.battleManager.updateAllHeroVisuals) {
                this.battleManager.updateAllHeroVisuals();
                console.log('Guest: Forced hero visual update');
            }
        }, 50);

        // Method 4: Force DOM refresh if available
        setTimeout(() => {
            this.forceCreatureElementRefresh();
        }, 100);
    }

    forceCreatureElementRefresh() {
        try {
            // Find all creature containers and force a repaint
            const creatureContainers = document.querySelectorAll('.creatures-container, .hero-creatures-container');
            creatureContainers.forEach(container => {
                // Force style recalculation
                const display = container.style.display;
                container.style.display = 'none';
                container.offsetHeight; // Force reflow
                container.style.display = display || '';
            });
            
            console.log('Guest: Forced DOM creature refresh');
        } catch (error) {
            console.warn('Error during DOM creature refresh:', error);
        }
    }

    // Clean up duplicated creatures after battle ends
    static cleanupDuplicatedCreaturesAfterBattle(battleManager) {
        if (!battleManager) {
            return 0;
        }

        // Get all heroes from both sides
        const allHeroes = [
            ...Object.values(battleManager.playerHeroes || {}),
            ...Object.values(battleManager.opponentHeroes || {})
        ];

        let duplicatesRemoved = 0;
        
        for (const hero of allHeroes) {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                const originalLength = hero.creatures.length;
                
                // Filter out all duplicated creatures
                hero.creatures = hero.creatures.filter(creature => 
                    !creature.isDuplicated && !creature.createdByRootOfAllEvil
                );
                
                const removed = originalLength - hero.creatures.length;
                duplicatesRemoved += removed;
                
                if (removed > 0) {
                    console.log(`👹 Removed ${removed} duplicated creature(s) from ${hero.name}`);
                }
            }
        }

        if (duplicatesRemoved > 0) {
            console.log(`🧹 Total: Removed ${duplicatesRemoved} duplicated creatures after battle ended`);
        }

        return duplicatesRemoved;
    }

    // Inject CSS styles for summoning effects (reused from BoulderInABottle pattern)
    injectSummoningAnimationCSS() {
        if (document.getElementById('rootDuplicationSummoningStyles')) {
            return; // Already injected
        }
        
        const style = document.createElement('style');
        style.id = 'rootDuplicationSummoningStyles';
        style.textContent = `
            /* Root Of All Evil Duplication Summoning Effect */
            .root-duplication-summoning-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }

            /* Summoning Circle - darker theme for Root Of All Evil */
            .root-duplication-summoning-effect .summoning-circle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 45px;
                height: 45px;
                border: 2px solid rgba(139, 0, 139, 0.9); /* Dark magenta */
                border-radius: 50%;
                box-shadow: 
                    0 0 12px rgba(139, 0, 139, 0.8),
                    inset 0 0 10px rgba(139, 0, 139, 0.4);
                animation: rootSummonCircleAppear 0.9s ease-out;
            }

            /* Summoning Particles - dark magic theme */
            .root-duplication-summoning-effect .summoning-particles {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .root-duplication-summoning-effect .summon-particle {
                position: absolute;
                width: 4px;
                height: 4px;
                background: #8B008B; /* Dark magenta */
                border-radius: 50%;
                box-shadow: 0 0 6px rgba(139, 0, 139, 0.9);
                animation: rootSummonParticle 0.9s ease-out;
            }

            /* Extended Particle Positions for 8 particles */
            .root-duplication-summoning-effect .particle-1 {
                top: 15%;
                left: 50%;
                animation-delay: 0s;
            }
            .root-duplication-summoning-effect .particle-2 {
                top: 25%;
                left: 85%;
                animation-delay: 0.1s;
            }
            .root-duplication-summoning-effect .particle-3 {
                top: 50%;
                left: 85%;
                animation-delay: 0.2s;
            }
            .root-duplication-summoning-effect .particle-4 {
                top: 75%;
                left: 85%;
                animation-delay: 0.3s;
            }
            .root-duplication-summoning-effect .particle-5 {
                top: 85%;
                left: 50%;
                animation-delay: 0.4s;
            }
            .root-duplication-summoning-effect .particle-6 {
                top: 75%;
                left: 15%;
                animation-delay: 0.5s;
            }
            .root-duplication-summoning-effect .particle-7 {
                top: 50%;
                left: 15%;
                animation-delay: 0.6s;
            }
            .root-duplication-summoning-effect .particle-8 {
                top: 25%;
                left: 15%;
                animation-delay: 0.7s;
            }

            /* Dark magic keyframe animations */
            @keyframes rootSummonCircleAppear {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                    border-color: rgba(139, 0, 139, 0);
                }
                30% {
                    transform: translate(-50%, -50%) scale(1.3);
                    opacity: 1;
                    border-color: rgba(139, 0, 139, 1);
                    box-shadow: 
                        0 0 20px rgba(139, 0, 139, 1),
                        inset 0 0 15px rgba(139, 0, 139, 0.6);
                }
                60% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.7);
                    opacity: 0;
                    border-color: rgba(139, 0, 139, 0);
                }
            }

            @keyframes rootSummonParticle {
                0% {
                    transform: scale(0) translateY(15px);
                    opacity: 0;
                }
                40% {
                    transform: scale(1.8) translateY(0);
                    opacity: 1;
                    box-shadow: 0 0 10px rgba(139, 0, 139, 1);
                }
                80% {
                    transform: scale(1.2) translateY(-8px);
                    opacity: 1;
                }
                100% {
                    transform: scale(0) translateY(-20px);
                    opacity: 0;
                }
            }

            /* Add dark glow to duplicated creature during summoning */
            .root-duplication-summoning-effect + .creature-sprite-container .creature-sprite {
                filter: brightness(1.4) drop-shadow(0 0 10px rgba(139, 0, 139, 0.7));
                animation: rootDuplicationGlow 0.9s ease-out;
            }

            @keyframes rootDuplicationGlow {
                0% {
                    filter: brightness(1.4) drop-shadow(0 0 10px rgba(139, 0, 139, 0.7));
                }
                60% {
                    filter: brightness(1.8) drop-shadow(0 0 16px rgba(139, 0, 139, 1));
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(139, 0, 139, 0));
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Clean up method (called on battle end/reset)
    cleanup() {
        // Remove any orphaned summoning effects
        try {
            const orphanedEffects = document.querySelectorAll('.root-duplication-summoning-effect');
            orphanedEffects.forEach(effect => {
                if (effect.parentNode) {
                    effect.remove();
                }
            });
            
            if (orphanedEffects.length > 0) {
                console.log(`Cleaned up ${orphanedEffects.length} orphaned Root duplication effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up Root duplication effects:', error);
        }
    }
}

// Static helper methods
export const TheRootOfAllEvilHelpers = {
    // Check if any creature in a list is The Root Of All Evil
    hasTheRootOfAllEvilInList(creatures) {
        return creatures.some(creature => TheRootOfAllEvilCreature.isTheRootOfAllEvil(creature.name));
    },

    // Get all The Root Of All Evil creatures from a list
    getTheRootOfAllEvilFromList(creatures) {
        return creatures.filter(creature => TheRootOfAllEvilCreature.isTheRootOfAllEvil(creature.name));
    },

    // Get the level reduction for TheRootOfAllEvil based on total creatures owned
    getLevelReduction(heroCreatureManager, formationManager) {
        if (!heroCreatureManager || !formationManager) return 0;
        
        const formation = formationManager.getBattleFormation();
        let totalCreatures = 0;
        
        ['left', 'center', 'right'].forEach(position => {
            if (formation[position]) {
                const heroCreatures = heroCreatureManager.getHeroCreatures(position);
                totalCreatures += heroCreatures.length;
            }
        });
        
        return totalCreatures;
    },

    // Count duplicated creatures for cleanup purposes
    countDuplicatedCreatures(battleManager) {
        if (!battleManager) return 0;
        
        const allHeroes = [
            ...Object.values(battleManager.playerHeroes || {}),
            ...Object.values(battleManager.opponentHeroes || {})
        ];

        let duplicatedCount = 0;
        
        for (const hero of allHeroes) {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                duplicatedCount += hero.creatures.filter(creature => 
                    creature.isDuplicated || creature.createdByRootOfAllEvil
                ).length;
            }
        }
        
        return duplicatedCount;
    }
};

export default TheRootOfAllEvilCreature;