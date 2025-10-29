// Artifacts/theStormblade.js - The Stormblade Artifact
// 50% chance on hit to remove a random enemy creature with a storm animation

export class TheStormbladeEffect {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.name = 'TheStormblade';
        
        console.log('⚡ TheStormblade effect initialized');
    }
    
    // Count how many Stormblades the hero has equipped
    countStormblades(hero) {
        if (!hero || !hero.equipment || hero.equipment.length === 0) {
            return 0;
        }
        
        return hero.equipment.filter(equip => {
            const equipName = equip.name || equip.cardName;
            return equipName === 'TheStormblade';
        }).length;
    }
    
    // Process storm banishment on attack hit
    async processStormBanishmentOnHit(attacker, defender) {
        if (!attacker || !attacker.alive || !defender) return;
        
        const bladeCount = this.countStormblades(attacker);
        if (bladeCount === 0) return;
        
        // Collect all enemy creatures
        const enemyCreatures = this.collectEnemyCreatures(attacker);
        if (enemyCreatures.length === 0) {
            console.log('⚡ TheStormblade: No enemy creatures to banish');
            return;
        }
        
        let banishmentsTriggered = 0;
        const banishedCreatures = [];
        
        // Each blade gets an independent 50% chance to banish a creature
        for (let i = 0; i < bladeCount; i++) {
            // Only proceed if there are still creatures to banish
            if (enemyCreatures.length === 0) break;
            
            const roll = this.battleManager.getRandom();
            if (roll < 0.50) {
                banishmentsTriggered++;
                
                // Randomly select a creature to banish
                const randomIndex = Math.floor(this.battleManager.getRandom() * enemyCreatures.length);
                const targetCreatureInfo = enemyCreatures.splice(randomIndex, 1)[0];
                banishedCreatures.push(targetCreatureInfo);
                
                console.log(`⚡ TheStormblade ${i + 1} triggers banishment! (rolled ${roll.toFixed(3)})`);
            }
        }
        
        // Apply all banishments
        if (banishmentsTriggered > 0) {
            for (const creatureInfo of banishedCreatures) {
                await this.banishCreature(creatureInfo, attacker);
            }
            
            // Add combat log
            const creatureNames = banishedCreatures.map(c => c.creature.name).join(', ');
            const banishText = banishmentsTriggered > 1 ? 
                `${banishmentsTriggered} creatures (${creatureNames})` : 
                creatureNames;
            
            this.battleManager.addCombatLog(
                `⚡ ${attacker.name}'s Stormblade banishes ${banishText} in a violent storm!`,
                'info'
            );
        }
    }
    
    // Banish a single creature with storm animation
    async banishCreature(creatureInfo, attacker) {
        const { creature, hero, creatureIndex } = creatureInfo;
        
        console.log(`⚡ Banishing ${creature.name} from ${hero.name} (index ${creatureIndex})`);
        
        // Create storm animation FIRST (before removal)
        await this.createStormBanishmentEffect(creature, hero, creatureIndex);
        
        // Remove creature from hero's creatures array
        if (hero && hero.creatures && creatureIndex >= 0 && creatureIndex < hero.creatures.length) {
            const removedCreature = hero.creatures.splice(creatureIndex, 1)[0];
            
            // Force complete rebuild of creature container
            setTimeout(() => {
                const side = hero.side;
                const position = hero.position;
                const heroSlot = document.querySelector(`.${side}-slot.${position}-slot`);
                
                if (heroSlot) {
                    const existingCreatures = heroSlot.querySelector('.battle-hero-creatures');
                    if (existingCreatures) {
                        existingCreatures.remove();
                    }
                    
                    if (hero.creatures.length > 0) {
                        const creaturesHTML = this.battleManager.battleScreen.createCreaturesHTML(
                            hero.creatures, 
                            side, 
                            position
                        );
                        heroSlot.insertAdjacentHTML('beforeend', creaturesHTML);
                    }
                }
            }, 1200); // Wait for storm animation to complete
            
            // Sync to guest if host
            if (this.battleManager.isAuthoritative) {
                this.battleManager.sendBattleUpdate('stormblade_banishment', {
                    attackerAbsoluteSide: attacker.absoluteSide,
                    attackerPosition: attacker.position,
                    attackerName: attacker.name,
                    targetInfo: {
                        type: 'creature',
                        absoluteSide: hero.absoluteSide,
                        position: hero.position,
                        creatureIndex: creatureIndex,
                        name: removedCreature.name
                    },
                    timestamp: Date.now()
                });
            }
        }
    }
    
    // Collect all enemy creatures
    collectEnemyCreatures(attacker) {
        const enemyCreatures = [];
        
        // Determine which side is the enemy
        const enemyHeroes = attacker.side === 'player' ? 
            this.battleManager.opponentHeroes : 
            this.battleManager.playerHeroes;
        
        // Collect all living enemy creatures with their context
        Object.values(enemyHeroes).forEach(hero => {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                hero.creatures.forEach((creature, index) => {
                    if (this.isCreatureValid(creature)) {
                        enemyCreatures.push({
                            creature: creature,
                            hero: hero,
                            creatureIndex: index,
                            heroPosition: hero.position
                        });
                    }
                });
            }
        });
        
        return enemyCreatures;
    }
    
    // Check if a creature is valid for banishment
    isCreatureValid(creature) {
        if (!creature) return false;
        
        // Check if creature has alive property and is alive
        if (creature.hasOwnProperty('alive')) {
            return creature.alive === true;
        }
        
        // Fallback: assume creature is valid if no alive property
        return true;
    }
    
    // Create storm banishment visual effect
    async createStormBanishmentEffect(creature, hero, creatureIndex) {
        const side = hero.side;
        const position = hero.position;
        
        // Find the creature element
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) {
            console.warn('⚡ Could not find creature element for storm animation');
            return;
        }
        
        // Create storm container
        const stormContainer = document.createElement('div');
        stormContainer.className = 'stormblade-effect-container';
        stormContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 600;
            overflow: visible;
        `;
        
        // Add storm wind spirals (lightning bolts)
        for (let i = 0; i < 8; i++) {
            const lightning = document.createElement('div');
            lightning.className = 'stormblade-lightning';
            lightning.innerHTML = '⚡';
            
            const angle = (360 / 8) * i;
            const distance = 60;
            
            lightning.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                font-size: 24px;
                animation: stormLightningBurst ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
                animation-delay: ${i * 30}ms;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 610;
                filter: drop-shadow(0 0 8px rgba(100, 150, 255, 0.9));
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
            `;
            
            stormContainer.appendChild(lightning);
        }
        
        // Add storm clouds
        const stormCloud = document.createElement('div');
        stormCloud.className = 'stormblade-cloud';
        stormCloud.innerHTML = '🌪️';
        stormCloud.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 605;
            pointer-events: none;
            animation: stormCloudSpin ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-in-out forwards;
            filter: drop-shadow(0 0 15px rgba(150, 150, 200, 0.8));
        `;
        stormContainer.appendChild(stormCloud);
        
        creatureElement.appendChild(stormContainer);
        
        // Animate the creature itself being pulled into the storm
        creatureElement.style.transition = `
            transform ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-in,
            opacity ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-in
        `;
        creatureElement.style.animation = `stormBanishCreature ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-in forwards`;
        
        // Wait for animation to complete
        await this.battleManager.delay(this.battleManager.getSpeedAdjustedDelay(1000));
        
        // Clean up
        if (stormContainer.parentNode) stormContainer.remove();
        if (creatureElement.parentNode) creatureElement.remove();
    }
    
    // Get target sync info for network communication
    getTargetSyncInfo(target) {
        if (target.type === 'hero' || !target.type) {
            return {
                type: 'hero',
                absoluteSide: target.absoluteSide,
                position: target.position,
                name: target.name
            };
        } else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                absoluteSide: creatureInfo.hero.absoluteSide,
                position: creatureInfo.position,
                creatureIndex: creatureInfo.creatureIndex,
                name: target.name
            };
        }
    }
    
    // Find creature information
    findCreatureInfo(creature) {
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            
            for (const position of ['left', 'center', 'right']) {
                const hero = heroes[position];
                if (!hero || !hero.creatures) continue;
                
                const creatureIndex = hero.creatures.indexOf(creature);
                if (creatureIndex !== -1) {
                    return { hero, side, position, creatureIndex };
                }
            }
        }
        
        return null;
    }
    
    // Handle guest update for stormblade banishment
    async handleGuestStormbladeBanishment(data) {
        const { targetInfo, attackerName } = data;
        
        if (targetInfo.type !== 'creature') {
            console.warn('⚡ TheStormblade: Target is not a creature');
            return;
        }
        
        // Find the creature
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const heroes = localSide === 'player' ? 
            this.battleManager.playerHeroes : 
            this.battleManager.opponentHeroes;
        
        const hero = heroes[targetInfo.position];
        const creature = hero?.creatures?.[targetInfo.creatureIndex];
        
        if (!creature || !hero) {
            console.warn('⚡ Could not find creature for storm banishment animation');
            return;
        }
        
        console.log(`⚡ Guest: Animating storm banishment of ${creature.name}`);
        
        // Play the storm animation
        await this.createStormBanishmentEffect(creature, hero, targetInfo.creatureIndex);
        
        // Remove the creature
        if (hero.creatures && targetInfo.creatureIndex >= 0 && targetInfo.creatureIndex < hero.creatures.length) {
            hero.creatures.splice(targetInfo.creatureIndex, 1);
            
            // Rebuild creature container
            setTimeout(() => {
                const side = hero.side;
                const position = hero.position;
                const heroSlot = document.querySelector(`.${side}-slot.${position}-slot`);
                
                if (heroSlot) {
                    const existingCreatures = heroSlot.querySelector('.battle-hero-creatures');
                    if (existingCreatures) {
                        existingCreatures.remove();
                    }
                    
                    if (hero.creatures.length > 0) {
                        const creaturesHTML = this.battleManager.battleScreen.createCreaturesHTML(
                            hero.creatures,
                            side,
                            position
                        );
                        heroSlot.insertAdjacentHTML('beforeend', creaturesHTML);
                    }
                }
            }, 100);
        }
    }
    
    // Ensure CSS for stormblade effects
    ensureStormbladeCSS() {
        if (document.getElementById('stormbladeCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'stormbladeCSS';
        style.textContent = `
            @keyframes stormLightningBurst {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(45deg);
                }
                100% {
                    opacity: 0;
                    transform: 
                        translate(
                            calc(-50% + var(--distance) * cos(var(--angle))), 
                            calc(-50% + var(--distance) * sin(var(--angle)))
                        ) 
                        scale(0.3) 
                        rotate(180deg);
                }
            }
            
            @keyframes stormCloudSpin {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(720deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(2) rotate(1440deg);
                }
            }
            
            @keyframes stormBanishCreature {
                0% {
                    transform: scale(1) rotate(0deg);
                    opacity: 1;
                }
                30% {
                    transform: scale(1.1) rotate(180deg);
                    opacity: 0.9;
                }
                60% {
                    transform: scale(0.7) rotate(540deg);
                    opacity: 0.5;
                }
                100% {
                    transform: scale(0.1) rotate(1080deg);
                    opacity: 0;
                }
            }
            
            .stormblade-effect-container {
                will-change: transform, opacity;
            }
            
            .stormblade-lightning {
                will-change: transform, opacity;
                transform-origin: center;
            }
            
            .stormblade-cloud {
                will-change: transform, opacity;
                transform-origin: center;
            }
            
            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                @keyframes stormLightningBurst {
                    0% {
                        opacity: 0;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0;
                    }
                }
                
                @keyframes stormCloudSpin {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                    50% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(1.5);
                    }
                }
                
                @keyframes stormBanishCreature {
                    0% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0;
                    }
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Cleanup
    cleanup() {
        const css = document.getElementById('stormbladeCSS');
        if (css) css.remove();
        
        console.log('⚡ TheStormblade effect cleaned up');
    }
}

// Register TheStormblade with AttackEffectsManager
export function registerTheStormblade(attackEffectsManager, battleManager) {
    const stormbladeEffect = new TheStormbladeEffect(battleManager);
    
    // Ensure CSS is loaded
    stormbladeEffect.ensureStormbladeCSS();
    
    // Register the storm banishment handler
    attackEffectsManager.registerEffectHandler('TheStormblade', {
        trigger: 'on_attack_hit',
        handler: async (attacker, defender, damage, equipmentItem) => {
            await stormbladeEffect.processStormBanishmentOnHit(attacker, defender);
        }
    });
    
    // Store reference for network sync
    attackEffectsManager.stormbladeEffect = stormbladeEffect;
    
    console.log('⚡ TheStormblade registered with AttackEffectsManager');
    
    return stormbladeEffect;
}

// Export for use in the game
export default TheStormbladeEffect;