// ./Creatures/coldHeartedYukiOnna.js - Cold-Hearted Yuki-Onna Creature Frozen Blizzard Module

export class ColdHeartedYukiOnnaCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeSnowstorms = new Set(); // Track active snowstorm effects for cleanup
        
        // Yuki-Onna stats
        this.FROZEN_DAMAGE_BASE = 40; // Base damage per frozen stack
        this.SNOWSTORM_DURATION = 2000; // 2 second snowstorm duration
        
        // Inject CSS styles
        this.injectYukiOnnaStyles();
        
        console.log('❄️ Cold-Hearted Yuki-Onna Creature module initialized');
    }

    // Check if a creature is Cold-Hearted Yuki-Onna
    static isColdHeartedYukiOnna(creatureName) {
        return creatureName === 'Cold-HeartedYuki-Onna';
    }

    // Execute Yuki-Onna special attack with frozen blizzard
    async executeSpecialAttack(yukiOnnaActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const yukiOnnaCreature = yukiOnnaActor.data;
        const yukiOnnaHero = yukiOnnaActor.hero;
        const attackerSide = yukiOnnaHero.side;
        
        // Safety check: ensure Yuki-Onna is still alive
        if (!yukiOnnaCreature.alive || yukiOnnaCreature.currentHp <= 0) {
            console.log(`Cold-Hearted Yuki-Onna is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `❄️ ${yukiOnnaCreature.name} summons the power of winter!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find ALL enemy targets (heroes and creatures)
        const allTargets = this.findAllEnemyTargets(attackerSide);
        
        if (allTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${yukiOnnaCreature.name} finds no enemies to target!`, 
                'info'
            );
            
            // 🔧 NEW: Do generic shake animation when no targets
            await this.battleManager.animationManager.shakeCreature(attackerSide, position, yukiOnnaActor.index);
            return;
        }
        
        // Check which targets have frozen stacks and calculate total damage
        const targetsWithFrozen = [];
        let totalAffectedTargets = 0;
        
        for (const target of allTargets) {
            const frozenStacks = this.battleManager.statusEffectsManager.getStatusEffectStacks(target.target, 'frozen');
            if (frozenStacks > 0) {
                const damage = this.FROZEN_DAMAGE_BASE * frozenStacks;
                targetsWithFrozen.push({
                    ...target,
                    frozenStacks: frozenStacks,
                    damage: damage
                });
                totalAffectedTargets++;
            }
        }
        
        // If no targets have frozen stacks, the effect fizzles BUT still shows animation
        if (targetsWithFrozen.length === 0) {
            this.battleManager.addCombatLog(
                `🌨️ ${yukiOnnaCreature.name}'s blizzard fizzles - no frozen enemies found!`, 
                'info'
            );
            
            // 🔧 NEW: Do generic shake animation when attack fizzles
            await this.battleManager.animationManager.shakeCreature(attackerSide, position, yukiOnnaActor.index);
            return;
        }
        
        // Log the blizzard activation
        this.battleManager.addCombatLog(
            `🌨️ ${yukiOnnaCreature.name} unleashes a devastating blizzard on ${totalAffectedTargets} frozen enemies!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest
        this.sendBlizzardAttackUpdate(yukiOnnaActor, targetsWithFrozen, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute blizzard attack with visual effects
        await this.executeBlizzardAttack(yukiOnnaActor, targetsWithFrozen, position);
    }

    // Find all enemy targets (heroes and creatures)
    findAllEnemyTargets(attackerSide) {
        const enemySide = attackerSide === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const targets = [];
        
        // Check all hero positions
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                // Add hero as target
                targets.push({
                    type: 'hero',
                    target: hero,
                    side: enemySide,
                    position: position,
                    targetInfo: {
                        type: 'hero',
                        absoluteSide: hero.absoluteSide,
                        position: position,
                        name: hero.name
                    }
                });
                
                // Add living creatures as targets
                if (hero.creatures) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            targets.push({
                                type: 'creature',
                                target: creature,
                                side: enemySide,
                                position: position,
                                creatureIndex: index,
                                hero: hero,
                                targetInfo: {
                                    type: 'creature',
                                    absoluteSide: hero.absoluteSide,
                                    position: position,
                                    creatureIndex: index,
                                    name: creature.name
                                }
                            });
                        }
                    });
                }
            }
        });
        
        return targets;
    }

    // Execute the blizzard attack with visual effects (host side)
    async executeBlizzardAttack(yukiOnnaActor, targetsWithFrozen, position) {
        const attackerSide = yukiOnnaActor.hero.side;
        
        // Create snowstorm effect for all affected targets
        const snowstormPromises = [];
        
        for (const targetData of targetsWithFrozen) {
            const targetElement = this.getTargetElement(targetData);
            if (targetElement) {
                const snowstormEffect = this.createSnowstormEffect(targetElement);
                this.activeSnowstorms.add(snowstormEffect);
                snowstormPromises.push(snowstormEffect.promise);
            }
        }
        
        // 🔧 FIX 8: Apply speed adjustment to the wait delay
        await this.battleManager.delay(500);
        
        // Apply damage to all affected targets
        for (const targetData of targetsWithFrozen) {
            this.applyBlizzardDamage(targetData, yukiOnnaActor.data);
        }
        
        // Create impact effects on all targets
        for (const targetData of targetsWithFrozen) {
            const targetElement = this.getTargetElement(targetData);
            if (targetElement) {
                this.createFrozenImpactEffect(targetElement);
            }
        }
        
        this.battleManager.addCombatLog(
            `🌨️ The blizzard strikes with devastating force!`, 
            'info'
        );
        
        // Wait for snowstorm effects to complete
        await Promise.all(snowstormPromises);
    }

    // Get the DOM element for a target
    getTargetElement(targetData) {
        if (targetData.type === 'hero') {
            const heroElement = document.querySelector(
                `.${targetData.side}-slot.${targetData.position}-slot .battle-hero-card`
            );
            if (!heroElement) {
                // Fallback to the slot itself
                return document.querySelector(`.${targetData.side}-slot.${targetData.position}-slot`);
            }
            return heroElement;
        } else if (targetData.type === 'creature') {
            return document.querySelector(
                `.${targetData.side}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }
        return null;
    }

    // Create snowstorm effect with hundreds of snowflake particles
    createSnowstormEffect(targetElement) {
        if (!targetElement) return { promise: Promise.resolve() };

        const snowstormContainer = document.createElement('div');
        snowstormContainer.className = 'yuki-onna-snowstorm';
        
        const adjustedDuration = this.battleManager.getSpeedAdjustedDelay(this.SNOWSTORM_DURATION);
        
        // 🔧 NEW APPROACH: Position relative to the target's parent container
        const targetParent = targetElement.parentElement;
        const targetRect = targetElement.getBoundingClientRect();
        const parentRect = targetParent.getBoundingClientRect();
        
        // Calculate position relative to parent
        const relativeLeft = targetRect.left - parentRect.left;
        const relativeTop = targetRect.top - parentRect.top;
        
        // Position the container to cover the target area
        snowstormContainer.style.cssText = `
            position: absolute;
            left: ${relativeLeft - 30}px;
            top: ${relativeTop - 30}px;
            width: ${targetRect.width + 60}px;
            height: ${targetRect.height + 60}px;
            pointer-events: none;
            z-index: 1600;
            overflow: hidden;
        `;
        
        // Create snowflakes that fall within this container
        const snowflakeCount = 100;
        
        for (let i = 0; i < snowflakeCount; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'yuki-onna-snowflake';
            snowflake.innerHTML = '❄';
            
            const size = Math.random() * 6 + 3;
            const startX = Math.random() * 100; // % position within container
            const animationDelay = Math.random() * adjustedDuration * 0.3;
            
            const baseAnimationDuration = Math.random() * 1000 + 1500;
            const animationDuration = this.battleManager.getSpeedAdjustedDelay(baseAnimationDuration);
            
            snowflake.style.cssText = `
                position: absolute;
                left: ${startX}%;
                top: 0px;
                font-size: ${size}px;
                color: rgba(200, 230, 255, ${Math.random() * 0.6 + 0.4});
                animation: yukiOnnaSnowfall ${animationDuration}ms linear infinite;
                animation-delay: ${animationDelay}ms;
                text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
                filter: blur(${Math.random() * 0.3}px);
            `;
            
            snowstormContainer.appendChild(snowflake);
        }
        
        // Append to the target's parent for proper relative positioning
        targetParent.appendChild(snowstormContainer);
        
        const promise = new Promise(resolve => {
            setTimeout(() => {
                if (snowstormContainer && snowstormContainer.parentNode) {
                    snowstormContainer.remove();
                }
                this.activeSnowstorms.delete({ container: snowstormContainer, promise });
                resolve();
            }, adjustedDuration);
        });
        
        return { container: snowstormContainer, promise };
    }

    // Create frozen impact effect at target location
    createFrozenImpactEffect(targetElement) {
        if (!targetElement) return;

        const impact = document.createElement('div');
        impact.className = 'yuki-onna-frozen-impact';
        impact.innerHTML = '❄️💨';
        
        const adjustedImpactDuration = this.battleManager.getSpeedAdjustedDelay(600);
        
        // Position relative to target's center
        const targetRect = targetElement.getBoundingClientRect();
        const parentRect = targetElement.parentElement.getBoundingClientRect();
        
        const centerX = (targetRect.left - parentRect.left) + (targetRect.width / 2);
        const centerY = (targetRect.top - parentRect.top) + (targetRect.height / 2);
        
        impact.style.cssText = `
            position: absolute;
            left: ${centerX}px;
            top: ${centerY}px;
            transform: translate(-50%, -50%);
            font-size: 28px;
            z-index: 1650;
            pointer-events: none;
            animation: yukiOnnaFrozenImpact ${adjustedImpactDuration}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(200, 230, 255, 0.9),
                0 0 40px rgba(150, 200, 255, 0.6);
        `;

        targetElement.parentElement.appendChild(impact);

        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, adjustedImpactDuration);
    }

    // Apply blizzard damage to target
    applyBlizzardDamage(targetData, attackingYukiOnna = null) {
        const damage = targetData.damage;
        
        if (targetData.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: targetData.target,
                damage: damage,
                newHp: Math.max(0, targetData.target.currentHp - damage),
                died: (targetData.target.currentHp - damage) <= 0
            }, {
                source: 'blizzard', // Special source for blizzard damage
                attacker: attackingYukiOnna
            });
        } else if (targetData.type === 'creature') {
            this.battleManager.authoritative_applyDamageToCreature({
                hero: targetData.hero,
                creature: targetData.target,
                creatureIndex: targetData.creatureIndex,
                damage: damage,
                position: targetData.position,
                side: targetData.side
            }, {
                source: 'blizzard', // Special source for blizzard damage
                attacker: attackingYukiOnna
            });
        }
        
        // Log individual damage
        this.battleManager.addCombatLog(
            `❄️ ${targetData.target.name} takes ${damage} blizzard damage! (${targetData.frozenStacks} frozen stacks)`,
            targetData.side === 'player' ? 'error' : 'success'
        );
    }

    // Send blizzard attack data to guest for synchronization
    sendBlizzardAttackUpdate(yukiOnnaActor, targetsWithFrozen, position) {
        const attackerSide = yukiOnnaActor.hero.side;
        
        this.battleManager.sendBattleUpdate('yuki_onna_blizzard_attack', {
            yukiOnnaData: {
                side: attackerSide,
                position: position,
                creatureIndex: yukiOnnaActor.index,
                name: yukiOnnaActor.data.name,
                absoluteSide: yukiOnnaActor.hero.absoluteSide
            },
            targets: targetsWithFrozen.map(target => ({
                targetInfo: target.targetInfo,
                frozenStacks: target.frozenStacks,
                damage: target.damage
            })),
            snowstormDuration: this.SNOWSTORM_DURATION
        });
    }

    // Handle blizzard attack on guest side
    handleGuestBlizzardAttack(data) {
        const { yukiOnnaData, targets, snowstormDuration } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const yukiOnnaLocalSide = (yukiOnnaData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `❄️ ${yukiOnnaData.name} unleashes a devastating blizzard!`, 
            yukiOnnaLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestBlizzard(yukiOnnaData, targets, snowstormDuration, myAbsoluteSide);
    }

    // Create blizzard on guest side
    async createGuestBlizzard(yukiOnnaData, targetData, snowstormDuration, myAbsoluteSide) {
        const snowstormPromises = [];
        
        // Create snowstorm effects for all targets
        for (const target of targetData) {
            const targetLocalSide = (target.targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            let targetElement = null;
            
            if (target.targetInfo.type === 'hero') {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${target.targetInfo.position}-slot .battle-hero-card`
                );
                if (!targetElement) {
                    targetElement = document.querySelector(
                        `.${targetLocalSide}-slot.${target.targetInfo.position}-slot`
                    );
                }
            } else if (target.targetInfo.type === 'creature') {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${target.targetInfo.position}-slot .creature-icon[data-creature-index="${target.targetInfo.creatureIndex}"]`
                );
            }

            if (targetElement) {
                const snowstormEffect = this.createSnowstormEffect(targetElement);
                this.activeSnowstorms.add(snowstormEffect);
                snowstormPromises.push(snowstormEffect.promise);
                
                // Create impact effect after delay
                setTimeout(() => {
                    this.createFrozenImpactEffect(targetElement);
                }, this.battleManager.getSpeedAdjustedDelay(500));
            }
        }
        
        // Log damage for each target
        for (const target of targetData) {
            this.battleManager.addCombatLog(
                `❄️ ${target.targetInfo.name} is struck by blizzard for ${target.damage} damage! (${target.frozenStacks} frozen stacks)`,
                (target.targetInfo.absoluteSide === myAbsoluteSide) ? 'error' : 'success'
            );
        }
        
        // Wait for all snowstorm effects to complete
        await Promise.all(snowstormPromises);
    }

    // Clean up all active snowstorms (called on battle end/reset)
    cleanup() {
        console.log(`❄️ Cleaning up ${this.activeSnowstorms.size} active Yuki-Onna snowstorms`);
        
        this.activeSnowstorms.forEach(snowstorm => {
            try {
                if (snowstorm.container && snowstorm.container.parentNode) {
                    snowstorm.container.remove();
                }
            } catch (error) {
                console.warn('Error removing snowstorm during cleanup:', error);
            }
        });
        
        this.activeSnowstorms.clear();

        // Also remove any orphaned snowstorm elements
        try {
            const orphanedSnowstorms = document.querySelectorAll('.yuki-onna-snowstorm');
            orphanedSnowstorms.forEach(snowstorm => {
                if (snowstorm.parentNode) {
                    snowstorm.remove();
                }
            });
            
            if (orphanedSnowstorms.length > 0) {
                console.log(`❄️ Cleaned up ${orphanedSnowstorms.length} orphaned Yuki-Onna snowstorms`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned snowstorms:', error);
        }
    }

    // Inject CSS styles for Yuki-Onna effects
    injectYukiOnnaStyles() {
        if (document.getElementById('yukiOnnaCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'yukiOnnaCreatureStyles';
        style.textContent = `
            /* Yuki-Onna Snowstorm Styles */
            .yuki-onna-snowstorm {
                border-radius: 8px;
                position: relative;
                overflow: visible; /* Allow snowflakes to fall outside if needed */
            }

            .yuki-onna-snowflake {
                will-change: transform, opacity;
                user-select: none;
                pointer-events: none;
            }

            @keyframes yukiOnnaSnowfall {
                0% { 
                    transform: translateY(0px) translateX(0px) rotate(0deg);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% { 
                    transform: translateY(80px) translateX(10px) rotate(180deg);
                    opacity: 0;
                }
            }

            @keyframes yukiOnnaFrozenImpact {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8) rotate(360deg);
                }
            }

            /* Enhanced creature glow when Yuki-Onna is preparing to attack */
            .creature-icon.yuki-onna-charging .creature-sprite {
                filter: brightness(1.8) drop-shadow(0 0 20px rgba(200, 230, 255, 0.9));
                animation: yukiOnnaChargeGlow 1.2s ease-in-out infinite alternate;
            }

            @keyframes yukiOnnaChargeGlow {
                0% { 
                    filter: brightness(1.8) drop-shadow(0 0 20px rgba(200, 230, 255, 0.9));
                }
                100% { 
                    filter: brightness(2.3) drop-shadow(0 0 35px rgba(150, 200, 255, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const ColdHeartedYukiOnnaHelpers = {
    // Check if any creature in a list is Cold-Hearted Yuki-Onna
    hasYukiOnnaInList(creatures) {
        return creatures.some(creature => ColdHeartedYukiOnnaCreature.isColdHeartedYukiOnna(creature.name));
    },

    // Get all Yuki-Onna creatures from a list
    getYukiOnnaFromList(creatures) {
        return creatures.filter(creature => ColdHeartedYukiOnnaCreature.isColdHeartedYukiOnna(creature.name));
    }
};

export default ColdHeartedYukiOnnaCreature;