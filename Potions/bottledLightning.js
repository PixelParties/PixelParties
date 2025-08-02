// bottledLightning.js - BottledLightning Potion Implementation
// Handles chain lightning effects at battle start

export class BottledLightningPotion {
    constructor() {
        console.log('⚡ BottledLightning potion module initialized');
    }

    // Handle potion effects for a specific player role
    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0) {
            return 0;
        }

        console.log(`⚡ Processing ${effects.length} BottledLightning effect(s) for ${playerRole}`);

        let totalEffectsProcessed = 0;

        // Process each BottledLightning stack individually
        for (const effect of effects) {
            try {
                await this.processIndividualBottledLightning(effect, playerRole, battleManager);
                totalEffectsProcessed++;
                
                // Small delay between multiple BottledLightning effects
                if (totalEffectsProcessed < effects.length) {
                    await battleManager.delay(800);
                }
            } catch (error) {
                console.error(`Error processing BottledLightning effect for ${playerRole}:`, error);
            }
        }

        return totalEffectsProcessed;
    }

    // Process a single BottledLightning effect
    async processIndividualBottledLightning(effect, playerRole, battleManager) {
        // Get enemy heroes (targets)
        const enemyTargets = this.getEnemyTargets(playerRole, battleManager);
        
        if (enemyTargets.length === 0) {
            battleManager.addCombatLog(`⚡ BottledLightning fizzles - no targets available!`, 'warning');
            return;
        }

        // Select 3 different random targets for this specific BottledLightning
        const selectedTargets = this.selectThreeDifferentTargets(enemyTargets, battleManager);
        
        if (selectedTargets.length === 0) {
            battleManager.addCombatLog(`⚡ BottledLightning fizzles - no valid targets!`, 'warning');
            return;
        }

        // Damage values: 150, 100, 50
        const damageValues = [150, 100, 50];

        battleManager.addCombatLog(
            `⚡ BottledLightning strikes ${selectedTargets.length} target(s) with chain lightning!`, 
            playerRole === 'host' ? 'success' : 'error'
        );

        // Execute chain lightning with visual effects
        await this.executeChainLightning(selectedTargets, damageValues, battleManager);
    }

    // Get enemy targets based on player role
    getEnemyTargets(playerRole, battleManager) {
        const enemyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.opponentHeroes) : 
            Object.values(battleManager.playerHeroes);

        // Get all valid targets (heroes and their creatures)
        const allTargets = [];

        enemyHeroes.forEach(hero => {
            if (hero && hero.alive) {
                // Add the hero as a target
                allTargets.push({
                    type: 'hero',
                    entity: hero,
                    side: playerRole === 'host' ? 'opponent' : 'player',
                    position: hero.position,
                    name: hero.name
                });

                // Add living creatures as targets
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature && creature.alive) {
                            allTargets.push({
                                type: 'creature',
                                entity: creature,
                                hero: hero,
                                creatureIndex: index,
                                side: playerRole === 'host' ? 'opponent' : 'player',
                                position: hero.position,
                                name: creature.name
                            });
                        }
                    });
                }
            }
        });

        return allTargets;
    }

    // Select 3 different random targets
    selectThreeDifferentTargets(availableTargets, battleManager) {
        if (availableTargets.length === 0) return [];

        const selectedTargets = [];
        const remainingTargets = [...availableTargets];

        // Select up to 3 different targets
        for (let i = 0; i < 3 && remainingTargets.length > 0; i++) {
            const randomIndex = battleManager.getRandomInt(0, remainingTargets.length - 1);
            const selectedTarget = remainingTargets[randomIndex];
            
            selectedTargets.push(selectedTarget);
            
            // Remove the selected target so it can't be selected again for this BottledLightning
            remainingTargets.splice(randomIndex, 1);
        }

        return selectedTargets;
    }

    // Execute chain lightning with visual effects
    async executeChainLightning(targets, damageValues, battleManager) {
        // Apply damage and create visual chain
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            const damage = damageValues[i] || 0;

            if (damage > 0) {
                // Show lightning strike to this target
                await this.showLightningStrike(target, damage, battleManager, i === 0);

                // Apply damage
                this.applyLightningDamage(target, damage, battleManager);

                // Show chain to next target (if there is one)
                if (i < targets.length - 1) {
                    await this.showLightningChain(targets[i], targets[i + 1], battleManager);
                }

                // Small delay between strikes
                await battleManager.delay(400);
            }
        }

        // Final cleanup delay
        await battleManager.delay(600);
        this.cleanupLightningEffects();
    }

    // Show lightning strike on a target
    async showLightningStrike(target, damage, battleManager, isFirst = false) {
        const targetElement = this.getTargetElement(target);
        
        if (!targetElement) return;

        // Create lightning strike effect
        const lightningStrike = document.createElement('div');
        lightningStrike.className = `lightning-strike ${isFirst ? 'lightning-initial' : 'lightning-chain'}`;
        lightningStrike.innerHTML = `
            <div class="lightning-bolt">⚡</div>
            <div class="lightning-flash"></div>
        `;

        // Position over the target
        const rect = targetElement.getBoundingClientRect();
        lightningStrike.style.cssText = `
            position: fixed;
            left: ${rect.left + rect.width / 2 - 25}px;
            top: ${rect.top - 30}px;
            width: 50px;
            height: 50px;
            z-index: 10000;
            pointer-events: none;
            animation: lightningStrike 0.8s ease-out;
        `;

        document.body.appendChild(lightningStrike);

        // Flash the target
        targetElement.style.filter = 'brightness(2) saturate(0) hue-rotate(200deg)';
        
        // Log the strike
        battleManager.addCombatLog(
            `⚡ Lightning strikes ${target.name} for ${damage} damage!`,
            'warning'
        );

        // Wait for animation
        await battleManager.delay(800);

        // Reset target appearance
        targetElement.style.filter = '';
        
        // Remove lightning effect
        if (lightningStrike.parentNode) {
            lightningStrike.remove();
        }
    }

    // Show lightning chain between two targets
    async showLightningChain(fromTarget, toTarget, battleManager) {
        const fromElement = this.getTargetElement(fromTarget);
        const toElement = this.getTargetElement(toTarget);

        if (!fromElement || !toElement) return;

        // Get positions
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();

        const fromX = fromRect.left + fromRect.width / 2;
        const fromY = fromRect.top + fromRect.height / 2;
        const toX = toRect.left + toRect.width / 2;
        const toY = toRect.top + toRect.height / 2;

        // Calculate distance and angle
        const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;

        // Create lightning chain element
        const lightningChain = document.createElement('div');
        lightningChain.className = 'lightning-chain-beam';
        lightningChain.innerHTML = `
            <div class="lightning-beam"></div>
        `;

        lightningChain.style.cssText = `
            position: fixed;
            left: ${fromX}px;
            top: ${fromY}px;
            width: ${distance}px;
            height: 4px;
            transform: rotate(${angle}deg);
            transform-origin: 0 50%;
            z-index: 9999;
            pointer-events: none;
            animation: lightningChain 0.6s ease-out;
        `;

        document.body.appendChild(lightningChain);

        battleManager.addCombatLog(
            `⚡ Lightning chains from ${fromTarget.name} to ${toTarget.name}!`,
            'info'
        );

        // Wait for chain animation
        await battleManager.delay(600);

        // Remove chain
        if (lightningChain.parentNode) {
            lightningChain.remove();
        }
    }

    // Apply lightning damage to target
    applyLightningDamage(target, damage, battleManager) {
        if (target.type === 'hero') {
            // Apply damage to hero
            battleManager.authoritative_applyDamage({
                target: target.entity,
                damage: damage,
                newHp: Math.max(0, target.entity.currentHp - damage),
                died: (target.entity.currentHp - damage) <= 0
            }, { source: 'lightning' });
        } else if (target.type === 'creature') {
            // Apply damage to creature
            battleManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.entity,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: target.position,
                side: target.side
            }, { source: 'lightning' });
        }
    }

    // Get DOM element for target
    getTargetElement(target) {
        if (target.type === 'hero') {
            return document.querySelector(`.${target.side}-slot.${target.position}-slot`);
        } else if (target.type === 'creature') {
            return document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }
        return null;
    }

    // Cleanup any remaining lightning effects
    cleanupLightningEffects() {
        const lightningElements = document.querySelectorAll('.lightning-strike, .lightning-chain-beam');
        lightningElements.forEach(element => {
            if (element.parentNode) {
                element.remove();
            }
        });
    }

    // Cleanup method for module cleanup
    cleanup() {
        this.cleanupLightningEffects();
    }
}

// Add CSS for lightning effects
if (typeof document !== 'undefined' && !document.getElementById('bottledLightningStyles')) {
    const style = document.createElement('style');
    style.id = 'bottledLightningStyles';
    style.textContent = `
        .lightning-strike {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .lightning-bolt {
            font-size: 40px;
            text-shadow: 0 0 15px currentColor, 0 0 30px currentColor, 0 0 45px currentColor;
            animation: lightningBolt 0.8s ease-out;
        }

        .lightning-flash {
            position: absolute;
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(0, 255, 255, 0.4) 50%, transparent 100%);
            border-radius: 50%;
            animation: lightningFlash 0.8s ease-out;
        }

        .lightning-chain-beam {
            background: linear-gradient(90deg, 
                transparent 0%, 
                #00ffff 20%, 
                #ffffff 50%, 
                #00ffff 80%, 
                transparent 100%);
            box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff;
            opacity: 0;
        }

        .lightning-initial .lightning-bolt {
            color: #ffff00;
            text-shadow: 0 0 15px #ffff00, 0 0 30px #ffff00, 0 0 45px #ffff00;
        }

        .lightning-chain .lightning-bolt {
            color: #00ffff;
            text-shadow: 0 0 15px #00ffff, 0 0 30px #00ffff, 0 0 45px #00ffff;
        }

        @keyframes lightningStrike {
            0% {
                transform: translateY(-50px) scale(0.5);
                opacity: 0;
            }
            30% {
                transform: translateY(-10px) scale(1.3);
                opacity: 1;
            }
            60% {
                transform: translateY(0) scale(1.1);
                opacity: 0.9;
            }
            100% {
                transform: translateY(5px) scale(1);
                opacity: 0;
            }
        }

        @keyframes lightningBolt {
            0%, 100% {
                opacity: 1;
                transform: scale(1);
            }
            10%, 30%, 50%, 70%, 90% {
                opacity: 0.3;
                transform: scale(1.1);
            }
            20%, 40%, 60%, 80% {
                opacity: 1;
                transform: scale(0.95);
            }
        }

        @keyframes lightningFlash {
            0% {
                opacity: 0;
                transform: scale(0.3);
            }
            30% {
                opacity: 0.8;
                transform: scale(1.2);
            }
            60% {
                opacity: 0.6;
                transform: scale(1.8);
            }
            100% {
                opacity: 0;
                transform: scale(2.5);
            }
        }

        @keyframes lightningChain {
            0% {
                opacity: 0;
                transform: scaleX(0);
                transform-origin: 0 50%;
            }
            20% {
                opacity: 0.8;
                transform: scaleX(0.3);
            }
            50% {
                opacity: 1;
                transform: scaleX(0.8);
            }
            80% {
                opacity: 0.9;
                transform: scaleX(1);
            }
            100% {
                opacity: 0;
                transform: scaleX(1);
            }
        }

        /* Enhance the chain beam appearance */
        .lightning-chain-beam .lightning-beam {
            width: 100%;
            height: 100%;
            background: inherit;
            position: relative;
        }

        .lightning-chain-beam .lightning-beam::before {
            content: '';
            position: absolute;
            top: -1px;
            left: 0;
            right: 0;
            bottom: -1px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.8) 20%, 
                rgba(255, 255, 255, 1) 50%, 
                rgba(255, 255, 255, 0.8) 80%, 
                transparent 100%);
            animation: lightningBeamCore 0.6s ease-out;
        }

        @keyframes lightningBeamCore {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}