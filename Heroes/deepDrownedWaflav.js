// deepDrownedWaflav.js - DeepDrownedWaflav Hero Battle Effects System
// Defeats random enemy creatures equal to evolution counter count at battle start
// Does not consume evolution counters, only uses them as a limit

export class DeepDrownedWaflavHeroEffect {
    
    // Apply DeepDrownedWaflav effects at battle start
    static async applyDeepDrownedWaflavEffectsAtBattleStart(battleManager) {
        if (!battleManager.isAuthoritative) return;

        try {
            // Check BOTH sides independently for DeepDrownedWaflav heroes
            // This ensures both host and guest DeepDrownedWaflav effects can trigger
            
            // Check and process host's DeepDrownedWaflav
            const hostDeepDrownedWaflav = this.findDeepDrownedWaflavHero(battleManager.playerHeroes);
            if (hostDeepDrownedWaflav) {
                await this.processDeepDrownedWaflavBattleStartEffect(battleManager, 'player');
            }
            
            // Check and process guest's DeepDrownedWaflav (independent of host's status)
            const guestDeepDrownedWaflav = this.findDeepDrownedWaflavHero(battleManager.opponentHeroes);
            if (guestDeepDrownedWaflav) {
                await this.processDeepDrownedWaflavBattleStartEffect(battleManager, 'opponent');
            }

        } catch (error) {
            console.error('Error applying DeepDrownedWaflav battle start effects:', error);
        }
    }

    // Find DeepDrownedWaflav hero in hero collection
    static findDeepDrownedWaflavHero(heroes) {
        for (const position of ['left', 'center', 'right']) {
            const hero = heroes[position];
            if (hero && hero.alive && hero.name === 'DeepDrownedWaflav') {
                return { hero, position };
            }
        }
        return null;
    }

    // Process the DeepDrownedWaflav battle start effect for the specified side
    static async processDeepDrownedWaflavBattleStartEffect(battleManager, heroSide) {
        console.log('🌊 DeepDrownedWaflav: Processing battle start effect for', heroSide);
        
        // Get the appropriate counter collection
        const counters = heroSide === 'player' ? battleManager.playerCounters : battleManager.opponentCounters;
        
        if (!counters || !counters.evolutionCounters || counters.evolutionCounters <= 0) {
            console.log('🌊 DeepDrownedWaflav: No evolution counters available', counters);
            return; // No counters to use as limit
        }

        const evolutionCounters = counters.evolutionCounters;
        const heroName = heroSide === 'player' ? 'your DeepDrownedWaflav' : 'enemy DeepDrownedWaflav';

        console.log(`🌊 DeepDrownedWaflav: ${heroName} using ${evolutionCounters} evolution counters as drowning limit`);

        // Find the hero
        const heroes = heroSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const deepDrownedWaflavData = this.findDeepDrownedWaflavHero(heroes);
        if (!deepDrownedWaflavData) return;
        
        const { hero, position } = deepDrownedWaflavData;

        // Find enemy creatures to drown
        const enemyHeroes = heroSide === 'player' ? battleManager.opponentHeroes : battleManager.playerHeroes;
        const enemyCreatures = this.findAllEnemyCreatures(enemyHeroes);
        
        if (enemyCreatures.length === 0) {
            battleManager.addCombatLog(
                `🌊 ${heroName} finds no enemy creatures to drown!`,
                heroSide === 'player' ? 'info' : 'info'
            );
            return;
        }

        // Select random creatures up to evolution counter limit
        const targetCount = Math.min(evolutionCounters, enemyCreatures.length);
        const selectedTargets = battleManager.getRandomChoices(enemyCreatures, targetCount);

        battleManager.addCombatLog(
            `🌊 ${heroName} calls upon the depths to drown ${targetCount} enemy creatures!`,
            heroSide === 'player' ? 'success' : 'error'
        );

        // Drown each selected creature
        const drownedCreatures = [];
        for (const target of selectedTargets) {
            await this.drownCreature(battleManager, target, heroSide);
            drownedCreatures.push(target);
            
            // Small delay between drowning animations
            await battleManager.delay(200);
        }

        // Sync effect to opponent
        this.syncBattleStartEffect(battleManager, heroSide, evolutionCounters, drownedCreatures);
    }

    // Find all living enemy creatures
    static findAllEnemyCreatures(enemyHeroes) {
        const allCreatures = [];
        
        // More defensive validation
        if (!enemyHeroes || typeof enemyHeroes !== 'object') {
            console.warn('DeepDrownedWaflav: Invalid enemyHeroes object:', enemyHeroes);
            return allCreatures;
        }
        
        for (const position of ['left', 'center', 'right']) {
            const hero = enemyHeroes[position];
            if (hero && hero.alive && hero.creatures && Array.isArray(hero.creatures)) {
                hero.creatures.forEach((creature, index) => {
                    if (creature && creature.alive && typeof creature === 'object') {
                        allCreatures.push({
                            creature,
                            hero,
                            position,
                            creatureIndex: index
                        });
                    }
                });
            }
        }
        
        return allCreatures;
    }

    // Drown a specific creature
    static async drownCreature(battleManager, target, attackerSide) {
        const { creature, hero, position, creatureIndex } = target;
        
        // Validate target data before proceeding
        if (!creature || !hero || !creature.alive || !hero.alive) {
            console.warn('DeepDrownedWaflav: Invalid target for drowning:', target);
            return;
        }
        
        if (typeof creatureIndex !== 'number' || creatureIndex < 0) {
            console.warn('DeepDrownedWaflav: Invalid creature index:', creatureIndex);
            return;
        }
        
        // Validate that the creature still exists in the hero's creature array
        if (!hero.creatures || !Array.isArray(hero.creatures) || 
            creatureIndex >= hero.creatures.length || 
            hero.creatures[creatureIndex] !== creature) {
            console.warn('DeepDrownedWaflav: Creature no longer exists in hero array');
            return;
        }
        
        // Create drowning animation first
        this.createDrowningAnimation(battleManager, target, attackerSide);
        
        // Apply fatal damage to the creature
        const damageData = {
            heroOwner: hero,
            creature: creature,
            creatureIndex: creatureIndex,
            damage: creature.currentHp, // Deal exactly enough damage to kill
            attacker: null, // No specific attacker
            source: 'DeepDrownedWaflav',
            ignoreShields: true, // Drowning bypasses shields
            preventRevival: false // Allow normal death/revival mechanics
        };

        try {
            // Use the battle manager's creature damage system
            await battleManager.authoritative_applyDamageToCreature(damageData, {
                source: 'DeepDrownedWaflav',
                isInstantKill: true
            });

            // Log the drowning
            const attackerName = attackerSide === 'player' ? 'Your' : 'Enemy';
            battleManager.addCombatLog(
                `🌊💀 ${creature.name} is dragged beneath the waves by ${attackerName} DeepDrownedWaflav!`,
                attackerSide === 'player' ? 'success' : 'error'
            );
        } catch (error) {
            console.error('DeepDrownedWaflav: Error applying creature damage:', error);
            // Fallback: at least mark the creature as dead
            creature.alive = false;
            creature.currentHp = 0;
            
            const attackerName = attackerSide === 'player' ? 'Your' : 'Enemy';
            battleManager.addCombatLog(
                `🌊💀 ${creature.name} is dragged beneath the waves by ${attackerName} DeepDrownedWaflav!`,
                attackerSide === 'player' ? 'success' : 'error'
            );
        }
    }

    // Create drowning animation
    static createDrowningAnimation(battleManager, target, attackerSide) {
        const { hero, position, creatureIndex } = target;
        const targetSide = attackerSide === 'player' ? 'opponent' : 'player';
        
        const creatureElement = document.querySelector(
            `.${targetSide}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) {
            console.error('🌊 DeepDrownedWaflav: Creature element not found for drowning animation');
            return;
        }

        // Create water overlay
        const waterOverlay = document.createElement('div');
        waterOverlay.className = 'deep-drowned-water-overlay';
        
        waterOverlay.style.cssText = `
            position: absolute;
            top: -20px;
            left: -20px;
            right: -20px;
            bottom: -20px;
            pointer-events: none;
            z-index: 350;
            overflow: hidden;
            opacity: 0;
            animation: deepDrownedWaterRise 2500ms ease-in-out forwards;
        `;

        creatureElement.appendChild(waterOverlay);

        // Create multiple bubble elements for drowning effect
        const bubbleCount = 5 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < bubbleCount; i++) {
            setTimeout(() => {
                this.createBubbleElement(waterOverlay, i, bubbleCount);
            }, i * 100); // Stagger bubble appearance
        }

        // Create water waves effect
        setTimeout(() => {
            this.createWaterWaveEffect(waterOverlay);
        }, 500);

        // Remove water overlay after animation
        setTimeout(() => {
            if (waterOverlay && waterOverlay.parentNode) {
                waterOverlay.remove();
            }
        }, 2500);
    }

    // Create individual bubble element
    static createBubbleElement(waterOverlay, index, totalBubbles) {
        const bubble = document.createElement('div');
        bubble.className = 'deep-drowned-bubble';
        bubble.innerHTML = '🫧';
        
        // Random positioning around the creature
        const angle = (index / totalBubbles) * 360 + Math.random() * 45;
        const radius = 15 + Math.random() * 25;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        
        const size = 12 + Math.random() * 8;
        
        bubble.style.cssText = `
            position: absolute;
            top: calc(50% + ${y}px);
            left: calc(50% + ${x}px);
            transform: translate(-50%, -50%);
            font-size: ${size}px;
            z-index: 351;
            pointer-events: none;
            opacity: 0;
            animation: deepDrownedBubbleRise 2000ms ease-out forwards;
            filter: drop-shadow(0 0 3px rgba(100, 200, 255, 0.8));
        `;
        
        waterOverlay.appendChild(bubble);
        
        // Create additional smaller bubbles
        if (Math.random() < 0.4) {
            setTimeout(() => {
                this.createSmallBubble(waterOverlay, x, y);
            }, 300 + Math.random() * 800);
        }
        
        setTimeout(() => {
            if (bubble && bubble.parentNode) {
                bubble.remove();
            }
        }, 2000);
    }

    // Create small bubble particle effect
    static createSmallBubble(waterOverlay, baseX, baseY) {
        const particle = document.createElement('div');
        particle.className = 'deep-drowned-small-bubble';
        particle.innerHTML = '○';
        
        const offsetX = baseX + (Math.random() - 0.5) * 20;
        const offsetY = baseY + (Math.random() - 0.5) * 20;
        
        particle.style.cssText = `
            position: absolute;
            top: calc(50% + ${offsetY}px);
            left: calc(50% + ${offsetX}px);
            transform: translate(-50%, -50%);
            font-size: 8px;
            z-index: 352;
            pointer-events: none;
            opacity: 0;
            animation: deepDrownedSmallBubbleFloat 1200ms ease-out forwards;
            color: rgba(100, 200, 255, 0.9);
        `;
        
        waterOverlay.appendChild(particle);
        
        setTimeout(() => {
            if (particle && particle.parentNode) {
                particle.remove();
            }
        }, 1200);
    }

    // Create water wave effect
    static createWaterWaveEffect(waterOverlay) {
        const wave = document.createElement('div');
        wave.className = 'deep-drowned-wave';
        wave.innerHTML = '〰️';
        
        wave.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
            z-index: 353;
            pointer-events: none;
            opacity: 0;
            animation: deepDrownedWaveExpand 1500ms ease-out forwards;
            color: rgba(0, 150, 255, 0.8);
        `;
        
        waterOverlay.appendChild(wave);
        
        setTimeout(() => {
            if (wave && wave.parentNode) {
                wave.remove();
            }
        }, 1500);
    }

    // Sync battle start effect to guest
    static syncBattleStartEffect(battleManager, heroSide, evolutionCounters, drownedCreatures) {
        if (!battleManager.sendBattleUpdate) return;

        const absoluteSide = (heroSide === 'player') ? 
            (battleManager.isHost ? 'host' : 'guest') : 
            (battleManager.isHost ? 'guest' : 'host');

        // Convert drowned creatures to sync data
        const drownedCreatureData = drownedCreatures.map(target => ({
            heroPosition: target.position,
            creatureIndex: target.creatureIndex,
            creatureName: target.creature.name,
            heroAbsoluteSide: (heroSide !== 'player') ? 
                (battleManager.isHost ? 'host' : 'guest') : 
                (battleManager.isHost ? 'guest' : 'host')
        }));

        battleManager.sendBattleUpdate('deep_drowned_waflav_battle_start_effect', {
            attackerAbsoluteSide: absoluteSide,
            evolutionCounters: evolutionCounters,
            drownedCreatures: drownedCreatureData,
            timestamp: Date.now()
        });
    }

    // Handle guest receiving battle start effect
    static handleGuestBattleStartEffect(data, battleManager) {
        if (!data || !battleManager || battleManager.isAuthoritative) {
            return;
        }

        const { attackerAbsoluteSide, evolutionCounters, drownedCreatures } = data;
        
        // Determine local sides for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const attackerLocalSide = (attackerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';

        // Add to combat log
        const attackerName = attackerLocalSide === 'player' ? 'your DeepDrownedWaflav' : 'enemy DeepDrownedWaflav';
        
        battleManager.addCombatLog(
            `🌊 ${attackerName} calls upon the depths to drown ${drownedCreatures.length} enemy creatures!`,
            attackerLocalSide === 'player' ? 'success' : 'error'
        );

        // Apply creature deaths to guest's data and play animations
        drownedCreatures.forEach((creatureData, index) => {
            setTimeout(() => {
                // FIRST: Apply the creature death to guest's data
                this.applyGuestCreatureDeath(battleManager, creatureData);
                
                // THEN: Play the animation
                this.playGuestDrowningAnimation(battleManager, creatureData);
                
                // Log each drowning
                battleManager.addCombatLog(
                    `🌊💀 ${creatureData.creatureName} is dragged beneath the waves by ${attackerName}!`,
                    attackerLocalSide === 'player' ? 'success' : 'error'
                );
            }, index * 200);
        });

        // After all creature deaths are applied, force a complete re-render
        setTimeout(() => {
            // Force complete re-render like DarkDeal does
            if (battleManager.battleScreen && battleManager.battleScreen.renderCreaturesAfterInit) {
                battleManager.battleScreen.renderCreaturesAfterInit();
            } else {
                // Fallback: refresh all creature visuals
                battleManager.refreshAllCreatureVisuals();
            }
            
            // Update necromancy displays if available
            if (battleManager.necromancyManager) {
                battleManager.necromancyManager.initializeNecromancyStackDisplays();
            }
        }, (drownedCreatures.length * 200) + 500); // Wait for all animations to start + buffer

        console.log(`🌊 Guest received DeepDrownedWaflav battle start effect: ${evolutionCounters} counter limit, ${drownedCreatures.length} creatures drowned`);
    }

    // Apply creature death on guest side
    static applyGuestCreatureDeath(battleManager, creatureData) {
        const { heroPosition, creatureIndex, creatureName, heroAbsoluteSide } = creatureData;
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Get the hero
        const heroes = targetLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const hero = heroes[heroPosition];
        
        if (!hero || !hero.creatures || !Array.isArray(hero.creatures)) {
            console.warn('DeepDrownedWaflav: Invalid hero or creatures array for guest death application');
            return;
        }
        
        // Find and kill the creature
        let found = false;
        
        // Try exact index first
        if (creatureIndex >= 0 && creatureIndex < hero.creatures.length) {
            const creature = hero.creatures[creatureIndex];
            if (creature && creature.name === creatureName && creature.alive) {
                creature.alive = false;
                creature.currentHp = 0;
                found = true;
                console.log(`🌊 Guest: Killed ${creatureName} at exact index ${creatureIndex}`);
            }
        }
        
        // Fallback: search by name if exact index didn't work
        if (!found) {
            for (let i = 0; i < hero.creatures.length; i++) {
                const creature = hero.creatures[i];
                if (creature && creature.name === creatureName && creature.alive) {
                    creature.alive = false;
                    creature.currentHp = 0;
                    found = true;
                    console.log(`🌊 Guest: Killed ${creatureName} at fallback index ${i}`);
                    break;
                }
            }
        }
        
        if (!found) {
            console.warn(`🌊 Guest: Could not find creature ${creatureName} to kill`);
        }
    }

    // Play drowning animation on guest side
    static playGuestDrowningAnimation(battleManager, creatureData) {
        const { heroPosition, creatureIndex, heroAbsoluteSide } = creatureData;
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const creatureElement = document.querySelector(
            `.${targetLocalSide}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (creatureElement) {
            // Create the same drowning animation as on host side
            const waterOverlay = document.createElement('div');
            waterOverlay.className = 'deep-drowned-water-overlay';
            
            waterOverlay.style.cssText = `
                position: absolute;
                top: -20px;
                left: -20px;
                right: -20px;
                bottom: -20px;
                pointer-events: none;
                z-index: 350;
                overflow: hidden;
                opacity: 0;
                animation: deepDrownedWaterRise 2500ms ease-in-out forwards;
            `;

            creatureElement.appendChild(waterOverlay);

            // Create bubbles
            const bubbleCount = 5 + Math.floor(Math.random() * 5);
            for (let i = 0; i < bubbleCount; i++) {
                setTimeout(() => {
                    this.createBubbleElement(waterOverlay, i, bubbleCount);
                }, i * 100);
            }

            // Create water waves
            setTimeout(() => {
                this.createWaterWaveEffect(waterOverlay);
            }, 500);

            // Remove overlay
            setTimeout(() => {
                if (waterOverlay && waterOverlay.parentNode) {
                    waterOverlay.remove();
                }
            }, 2500);
        }
    }

    // Ensure animation styles are present
    static ensureWaterStyles() {
        if (document.getElementById('deepDrownedWaflavStyles')) return;
        
        console.log('🌊 DeepDrownedWaflav: Loading CSS styles...');
        
        const style = document.createElement('style');
        style.id = 'deepDrownedWaflavStyles';
        style.textContent = `
            @keyframes deepDrownedWaterRise {
                0% {
                    opacity: 0;
                    transform: scale(0.8) translateY(20px);
                }
                30% {
                    opacity: 0.8;
                    transform: scale(1.1) translateY(0px);
                }
                70% {
                    opacity: 0.9;
                    transform: scale(1) translateY(-5px);
                }
                100% {
                    opacity: 0;
                    transform: scale(1.2) translateY(-15px);
                }
            }

            @keyframes deepDrownedBubbleRise {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) translateY(20px);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1) translateY(0px);
                }
                80% {
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.2) translateY(-30px);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) translateY(-50px);
                }
            }

            @keyframes deepDrownedSmallBubbleFloat {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                30% {
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1) translateY(-10px);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) translateY(-25px);
                }
            }

            @keyframes deepDrownedWaveExpand {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(2) rotate(180deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(3) rotate(360deg);
                }
            }
            
            .deep-drowned-water-overlay {
                will-change: transform, opacity;
            }

            .deep-drowned-bubble,
            .deep-drowned-small-bubble,
            .deep-drowned-wave {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
        console.log('🌊 DeepDrownedWaflav: CSS styles loaded successfully');
    }
}

// Ensure styles are loaded when module is imported
if (typeof document !== 'undefined') {
    DeepDrownedWaflavHeroEffect.ensureWaterStyles();
}

// Export for global access
if (typeof window !== 'undefined') {
    window.DeepDrownedWaflavHeroEffect = DeepDrownedWaflavHeroEffect;
}

export default DeepDrownedWaflavHeroEffect;