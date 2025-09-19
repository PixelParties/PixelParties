// ./Creatures/explodingSkull.js - Exploding Skull Creature with Counter-based Death Explosion

export class ExplodingSkullCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeAnimations = new Set(); // Track active animations for cleanup
        
        // Exploding Skull stats
        this.EXPLOSION_DAMAGE_PER_COUNTER = 50;
        this.EXPLOSION_ANIMATION_TIME = 2000; // 2 second explosion animation
        this.COUNTER_GAIN_ANIMATION_TIME = 800; // 0.8 second counter gain animation
        
        // Inject CSS styles
        this.injectExplodingSkullStyles();
        
        console.log('💀💥 Exploding Skull Creature module initialized');
    }

    // Check if a creature is Exploding Skull
    static isExplodingSkull(creatureName) {
        return creatureName === 'ExplodingSkull';
    }

    // Execute Exploding Skull special action - gain a counter
    async executeSpecialAttack(skullActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const skull = skullActor.data;
        const skullHero = skullActor.hero;
        const attackerSide = skullHero.side;
        
        // Safety check: ensure Skull is still alive
        if (!skull.alive || skull.currentHp <= 0) {
            console.log(`Exploding Skull is dead, cannot execute action`);
            return;
        }
        
        // Initialize counters if not present
        if (skull.counters === undefined) {
            skull.counters = 0;
        }
        
        // Gain a counter
        skull.counters++;
        
        this.battleManager.addCombatLog(
            `💀💥 ${skull.name} gains a counter (${skull.counters} total) and glows ominously!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Update counter display for all players
        this.sendCounterUpdate(skullActor, position);
        
        // Send counter gain animation to guest
        this.sendCounterGainAnimation(skullActor, position);
        
        // Show counter gain animation
        await this.showCounterGainAnimation(skullActor, position);
        
        // Add visual glow effect based on counter count
        this.updateSkullGlowEffect(attackerSide, position, skullActor.index, skull.counters);
    }

    // Show counter gain animation above the skull
    async showCounterGainAnimation(skullActor, position) {
        const attackerSide = skullActor.hero.side;
        const skullElement = this.getSkullElement(attackerSide, position, skullActor.index);
        
        if (!skullElement) return;

        const rect = skullElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const counterAnimation = document.createElement('div');
        counterAnimation.className = 'skull-counter-gain-animation';
        counterAnimation.innerHTML = `
            <div class="counter-icon">⏱️</div>
            <div class="counter-text">+1</div>
        `;
        
        counterAnimation.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            display: flex;
            align-items: center;
            gap: 4px;
            font-weight: bold;
            color: #ff4444;
            font-size: 16px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            animation: skullCounterGain ${this.battleManager.getSpeedAdjustedDelay(this.COUNTER_GAIN_ANIMATION_TIME)}ms ease-out forwards;
        `;

        document.body.appendChild(counterAnimation);
        this.activeAnimations.add(counterAnimation);

        // Remove animation after completion
        setTimeout(() => {
            if (counterAnimation.parentNode) {
                counterAnimation.remove();
                this.activeAnimations.delete(counterAnimation);
            }
        }, this.battleManager.getSpeedAdjustedDelay(this.COUNTER_GAIN_ANIMATION_TIME));

        await this.battleManager.delay(200); // Brief pause for visual clarity
    }

    // Execute death explosion when Exploding Skull is killed
    async executeDeathExplosion(dyingSkull, heroOwner, position, side) {
        if (!this.battleManager.isAuthoritative) return;

        const skullCreature = dyingSkull;
        const skullSide = side;
        const counterCount = skullCreature.counters || 0;
        
        // No explosion if no counters
        if (counterCount === 0) {
            this.battleManager.addCombatLog(
                `💀 ${skullCreature.name} dies quietly with no stored energy to explode.`, 
                'info'
            );
            return;
        }
        
        const explosionDamage = counterCount * this.EXPLOSION_DAMAGE_PER_COUNTER;
        
        this.battleManager.addCombatLog(
            `💀💥 ${skullCreature.name} EXPLODES with ${counterCount} stored energy, dealing ${explosionDamage} damage to all enemies in the ${position} position!`, 
            'warning'
        );

        // Find all enemy targets in the same slot position
        const enemySide = skullSide === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const enemyHeroAtPosition = enemyHeroes[position];
        
        const explosionTargets = [];
        
        // Add enemy hero at same position if alive
        if (enemyHeroAtPosition && enemyHeroAtPosition.alive) {
            explosionTargets.push({
                type: 'hero',
                hero: enemyHeroAtPosition,
                position: position,
                side: enemySide
            });
        }
        
        // Add all living enemy creatures at same position
        if (enemyHeroAtPosition && enemyHeroAtPosition.creatures) {
            enemyHeroAtPosition.creatures.forEach((creature, index) => {
                if (creature.alive) {
                    explosionTargets.push({
                        type: 'creature',
                        hero: enemyHeroAtPosition,
                        creature: creature,
                        creatureIndex: index,
                        position: position,
                        side: enemySide
                    });
                }
            });
        }

        if (explosionTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 The explosion finds no targets in the enemy ${position} position!`, 
                'info'
            );
            return;
        }

        // Send explosion data to guest for synchronization
        this.sendDeathExplosion(skullCreature, heroOwner, position, skullSide, counterCount, explosionDamage, explosionTargets);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(100);

        // Show explosion animation
        await this.showExplosionAnimation(position, counterCount);

        // Apply damage to all targets after explosion animation starts
        await this.battleManager.delay(500); // Let explosion build up
        
        this.battleManager.addCombatLog(
            `💥 The explosion engulfs ${explosionTargets.length} target(s)!`, 
            'warning'
        );

        // Apply damage to all targets
        for (const target of explosionTargets) {
            if (target.type === 'hero') {
                this.battleManager.authoritative_applyDamage({
                    target: target.hero,
                    damage: explosionDamage,
                    newHp: Math.max(0, target.hero.currentHp - explosionDamage),
                    died: (target.hero.currentHp - explosionDamage) <= 0
                }, {
                    source: 'explosion',
                    attacker: skullCreature
                });
            } else if (target.type === 'creature') {
                this.battleManager.authoritative_applyDamageToCreature({
                    hero: target.hero,
                    creature: target.creature,
                    creatureIndex: target.creatureIndex,
                    damage: explosionDamage,
                    position: target.position,
                    side: target.side
                }, {
                    source: 'explosion',
                    attacker: skullCreature
                });
            }
            
            // Small delay between targets for visual impact
            await this.battleManager.delay(100);
        }

        this.battleManager.addCombatLog(
            `💥 ${skullCreature.name}'s explosive death is complete!`, 
            'info'
        );
    }

    // Show explosion animation in the center of the position
    async showExplosionAnimation(position, counterCount) {
        // Get both player and opponent slot elements for this position
        const playerSlot = document.querySelector(`.player-slot.${position}-slot`);
        const opponentSlot = document.querySelector(`.opponent-slot.${position}-slot`);
        
        if (!playerSlot || !opponentSlot) {
            console.warn(`Could not find slots for explosion at position: ${position}`);
            return;
        }

        const playerRect = playerSlot.getBoundingClientRect();
        const opponentRect = opponentSlot.getBoundingClientRect();
        
        // Calculate center point between the two slots
        const centerX = (playerRect.left + playerRect.right + opponentRect.left + opponentRect.right) / 4;
        const centerY = (playerRect.top + playerRect.bottom + opponentRect.top + opponentRect.bottom) / 4;

        // Create explosion animation
        const explosion = document.createElement('div');
        explosion.className = 'exploding-skull-explosion';
        
        // Scale explosion based on counter count (more counters = bigger explosion)
        const explosionScale = Math.min(1 + (counterCount * 0.2), 3); // Cap at 3x scale
        
        explosion.innerHTML = `
            <div class="explosion-core"></div>
            <div class="explosion-ring explosion-ring-1"></div>
            <div class="explosion-ring explosion-ring-2"></div>
            <div class="explosion-ring explosion-ring-3"></div>
            <div class="explosion-sparks">
                <span class="spark">💀</span>
                <span class="spark">💥</span>
                <span class="spark">🔥</span>
                <span class="spark">💀</span>
                <span class="spark">💥</span>
                <span class="spark">🔥</span>
            </div>
        `;
        
        explosion.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            transform: translate(-50%, -50%) scale(${explosionScale});
            z-index: 2000;
            pointer-events: none;
            animation: explodingSkullExplosion ${this.battleManager.getSpeedAdjustedDelay(this.EXPLOSION_ANIMATION_TIME)}ms ease-out forwards;
        `;

        document.body.appendChild(explosion);
        this.activeAnimations.add(explosion);

        // Remove explosion after animation
        setTimeout(() => {
            if (explosion.parentNode) {
                explosion.remove();
                this.activeAnimations.delete(explosion);
            }
        }, this.battleManager.getSpeedAdjustedDelay(this.EXPLOSION_ANIMATION_TIME));

        await this.battleManager.delay(this.EXPLOSION_ANIMATION_TIME / 4); // Quarter of animation time
    }

    // Update skull glow effect based on counter count
    updateSkullGlowEffect(side, heroPosition, creatureIndex, counterCount) {
        const skullElement = this.getSkullElement(side, heroPosition, creatureIndex);
        
        if (!skullElement) return;
        
        // Remove existing glow classes
        skullElement.classList.remove('skull-glow-1', 'skull-glow-2', 'skull-glow-3', 'skull-glow-max');
        
        // Add appropriate glow based on counter count
        if (counterCount >= 5) {
            skullElement.classList.add('skull-glow-max');
        } else if (counterCount >= 3) {
            skullElement.classList.add('skull-glow-3');
        } else if (counterCount >= 2) {
            skullElement.classList.add('skull-glow-2');
        } else if (counterCount >= 1) {
            skullElement.classList.add('skull-glow-1');
        }
    }

    // Get the DOM element for Exploding Skull creature
    getSkullElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Send counter update to guest for synchronization
    sendCounterUpdate(skullActor, position) {
        const attackerSide = skullActor.hero.side;
        
        this.battleManager.sendBattleUpdate('creature_counter_update', {
            creatureData: {
                side: attackerSide,
                position: position,
                creatureIndex: skullActor.index,
                name: skullActor.data.name,
                absoluteSide: skullActor.hero.absoluteSide,
                counters: skullActor.data.counters || 0
            }
        });
    }

    // Send counter gain animation to guest for synchronization  
    sendCounterGainAnimation(skullActor, position) {
        const attackerSide = skullActor.hero.side;
        
        this.battleManager.sendBattleUpdate('exploding_skull_counter_gain', {
            skullData: {
                side: attackerSide,
                position: position,
                creatureIndex: skullActor.index,
                name: skullActor.data.name,
                absoluteSide: skullActor.hero.absoluteSide,
                counters: skullActor.data.counters || 0
            }
        });
    }

    // Send death explosion data to guest for synchronization
    sendDeathExplosion(skullCreature, heroOwner, position, skullSide, counterCount, explosionDamage, targets) {
        this.battleManager.sendBattleUpdate('exploding_skull_death_explosion', {
            skullData: {
                side: skullSide,
                position: position,
                creatureIndex: heroOwner.creatures.indexOf(skullCreature),
                name: skullCreature.name,
                absoluteSide: heroOwner.absoluteSide,
                counterCount: counterCount
            },
            explosionDamage: explosionDamage,
            targetCount: targets.length,
            animationTime: this.EXPLOSION_ANIMATION_TIME
        });
    }

    // Handle counter update on guest side
    handleGuestCounterUpdate(data) {
        const { creatureData } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const creatureLocalSide = (creatureData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Update counter display
        this.updateCreatureCounterDisplay(
            creatureLocalSide,
            creatureData.position,
            creatureData.creatureIndex,
            creatureData.counters
        );
        
        // Update glow effect
        this.updateSkullGlowEffect(
            creatureLocalSide,
            creatureData.position,
            creatureData.creatureIndex,
            creatureData.counters
        );
    }

    // Handle counter gain animation on guest side
    handleGuestCounterGainAnimation(data) {
        const { skullData } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const skullLocalSide = (skullData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Create the animation on guest side
        this.createGuestCounterGainAnimation(skullData, myAbsoluteSide);
    }

    // Create counter gain animation on guest side
    async createGuestCounterGainAnimation(skullData, myAbsoluteSide) {
        const skullLocalSide = (skullData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const skullElement = this.getSkullElement(
            skullLocalSide,
            skullData.position,
            skullData.creatureIndex
        );

        if (!skullElement) {
            console.warn('Exploding Skull element not found on guest side for counter animation');
            return;
        }

        const rect = skullElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const counterAnimation = document.createElement('div');
        counterAnimation.className = 'skull-counter-gain-animation';
        counterAnimation.innerHTML = `
            <div class="counter-icon">⏱️</div>
            <div class="counter-text">+1</div>
        `;
        
        counterAnimation.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            display: flex;
            align-items: center;
            gap: 4px;
            font-weight: bold;
            color: #ff4444;
            font-size: 16px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            animation: skullCounterGain ${this.battleManager.getSpeedAdjustedDelay(this.COUNTER_GAIN_ANIMATION_TIME)}ms ease-out forwards;
        `;

        document.body.appendChild(counterAnimation);
        this.activeAnimations.add(counterAnimation);

        setTimeout(() => {
            if (counterAnimation.parentNode) {
                counterAnimation.remove();
                this.activeAnimations.delete(counterAnimation);
            }
        }, this.battleManager.getSpeedAdjustedDelay(this.COUNTER_GAIN_ANIMATION_TIME));
    }

    // Handle death explosion on guest side
    async handleGuestDeathExplosion(data) {
        const { skullData, explosionDamage, targetCount, animationTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const skullLocalSide = (skullData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (skullData.counterCount === 0) {
            this.battleManager.addCombatLog(
                `💀 ${skullData.name} dies quietly with no stored energy to explode.`, 
                'info'
            );
            return;
        }
        
        this.battleManager.addCombatLog(
            `💀💥 ${skullData.name} EXPLODES with ${skullData.counterCount} stored energy, dealing ${explosionDamage} damage to ${targetCount} target(s)!`, 
            'warning'
        );

        // Show explosion animation on guest side
        await this.showGuestExplosionAnimation(skullData.position, skullData.counterCount, animationTime);
        
        this.battleManager.addCombatLog(
            `💥 ${skullData.name}'s explosive death is complete!`, 
            'info'
        );
    }

    // Show explosion animation on guest side
    async showGuestExplosionAnimation(position, counterCount, animationTime) {
        // Reuse the same animation logic as host
        const playerSlot = document.querySelector(`.player-slot.${position}-slot`);
        const opponentSlot = document.querySelector(`.opponent-slot.${position}-slot`);
        
        if (!playerSlot || !opponentSlot) {
            console.warn(`Guest: Could not find slots for explosion at position: ${position}`);
            return;
        }

        const playerRect = playerSlot.getBoundingClientRect();
        const opponentRect = opponentSlot.getBoundingClientRect();
        
        const centerX = (playerRect.left + playerRect.right + opponentRect.left + opponentRect.right) / 4;
        const centerY = (playerRect.top + playerRect.bottom + opponentRect.top + opponentRect.bottom) / 4;

        const explosion = document.createElement('div');
        explosion.className = 'exploding-skull-explosion';
        
        const explosionScale = Math.min(1 + (counterCount * 0.2), 3);
        
        explosion.innerHTML = `
            <div class="explosion-core"></div>
            <div class="explosion-ring explosion-ring-1"></div>
            <div class="explosion-ring explosion-ring-2"></div>
            <div class="explosion-ring explosion-ring-3"></div>
            <div class="explosion-sparks">
                <span class="spark">💀</span>
                <span class="spark">💥</span>
                <span class="spark">🔥</span>
                <span class="spark">💀</span>
                <span class="spark">💥</span>
                <span class="spark">🔥</span>
            </div>
        `;
        
        explosion.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            transform: translate(-50%, -50%) scale(${explosionScale});
            z-index: 2000;
            pointer-events: none;
            animation: explodingSkullExplosion ${this.battleManager.getSpeedAdjustedDelay(animationTime)}ms ease-out forwards;
        `;

        document.body.appendChild(explosion);
        this.activeAnimations.add(explosion);

        setTimeout(() => {
            if (explosion.parentNode) {
                explosion.remove();
                this.activeAnimations.delete(explosion);
            }
        }, this.battleManager.getSpeedAdjustedDelay(animationTime));
    }

    // Update creature counter display with special styling for Exploding Skull
    updateCreatureCounterDisplay(side, position, creatureIndex, counters) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;

        // Remove existing counter display
        const existingCounter = creatureElement.querySelector('.creature-counter-display');
        if (existingCounter) {
            existingCounter.remove();
        }

        // Add new counter display if counters > 0
        if (counters > 0) {
            const counterDisplay = document.createElement('div');
            counterDisplay.className = 'creature-counter-display exploding-skull-counter';
            counterDisplay.textContent = counters;
            
            // Increasingly dangerous styling based on counter count
            let backgroundColor = '#ff4444';
            let borderColor = '#cc0000';
            let animation = '';
            
            if (counters >= 5) {
                backgroundColor = '#ff0000';
                borderColor = '#990000';
                animation = 'animation: explodingSkullCounterCritical 1s ease-in-out infinite;';
            } else if (counters >= 3) {
                backgroundColor = '#ff3333';
                borderColor = '#bb0000';
                animation = 'animation: explodingSkullCounterDanger 1.5s ease-in-out infinite;';
            }
            
            counterDisplay.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background: ${backgroundColor};
                color: white;
                border: 2px solid ${borderColor};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 10;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 10px rgba(255, 0, 0, 0.5);
                ${animation}
            `;
            
            creatureElement.appendChild(counterDisplay);
        }
    }

    // Clean up all active animations
    cleanup() {
        console.log(`Cleaning up ${this.activeAnimations.size} active Exploding Skull animations`);
        
        this.activeAnimations.forEach(animation => {
            try {
                if (animation && animation.parentNode) {
                    animation.remove();
                }
            } catch (error) {
                console.warn('Error removing Exploding Skull animation during cleanup:', error);
            }
        });
        
        this.activeAnimations.clear();

        // Remove orphaned animations
        try {
            const orphanedAnimations = document.querySelectorAll('.exploding-skull-explosion, .skull-counter-gain-animation');
            orphanedAnimations.forEach(animation => {
                if (animation.parentNode) {
                    animation.remove();
                }
            });
            
            if (orphanedAnimations.length > 0) {
                console.log(`Cleaned up ${orphanedAnimations.length} orphaned Exploding Skull animations`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned Exploding Skull animations:', error);
        }
    }

    // Inject CSS styles for Exploding Skull effects
    injectExplodingSkullStyles() {
        if (document.getElementById('explodingSkullStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'explodingSkullStyles';
        style.textContent = `
            /* Counter Gain Animation */
            @keyframes skullCounterGain {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                25% { 
                    opacity: 1;
                    transform: translate(-50%, -70%) scale(1.2);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -90%) scale(1.0);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -120%) scale(0.8);
                }
            }

            .skull-counter-gain-animation .counter-icon {
                font-size: 18px;
                animation: pulse 0.4s ease-in-out;
            }

            .skull-counter-gain-animation .counter-text {
                font-size: 14px;
                font-weight: bold;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.3); }
            }

            /* Exploding Skull Glow Effects (based on counter count) */
            .creature-icon.skull-glow-1 .creature-sprite {
                filter: brightness(1.2) drop-shadow(0 0 8px rgba(255, 100, 100, 0.6));
            }
            
            .creature-icon.skull-glow-2 .creature-sprite {
                filter: brightness(1.4) drop-shadow(0 0 12px rgba(255, 80, 80, 0.8));
                animation: skullGlow2 2s ease-in-out infinite alternate;
            }
            
            .creature-icon.skull-glow-3 .creature-sprite {
                filter: brightness(1.6) drop-shadow(0 0 16px rgba(255, 60, 60, 1));
                animation: skullGlow3 1.5s ease-in-out infinite alternate;
            }
            
            .creature-icon.skull-glow-max .creature-sprite {
                filter: brightness(2.0) drop-shadow(0 0 24px rgba(255, 0, 0, 1));
                animation: skullGlowMax 1s ease-in-out infinite alternate;
            }

            @keyframes skullGlow2 {
                0% { filter: brightness(1.4) drop-shadow(0 0 12px rgba(255, 80, 80, 0.8)); }
                100% { filter: brightness(1.6) drop-shadow(0 0 16px rgba(255, 60, 60, 1)); }
            }
            
            @keyframes skullGlow3 {
                0% { filter: brightness(1.6) drop-shadow(0 0 16px rgba(255, 60, 60, 1)); }
                100% { filter: brightness(1.8) drop-shadow(0 0 20px rgba(255, 40, 40, 1)); }
            }
            
            @keyframes skullGlowMax {
                0% { filter: brightness(2.0) drop-shadow(0 0 24px rgba(255, 0, 0, 1)); }
                100% { filter: brightness(2.5) drop-shadow(0 0 32px rgba(255, 0, 0, 1)); }
            }

            /* Exploding Skull Counter Animations */
            @keyframes explodingSkullCounterDanger {
                0%, 100% { 
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 10px rgba(255, 0, 0, 0.5);
                    transform: scale(1);
                }
                50% { 
                    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 0, 0, 0.8);
                    transform: scale(1.1);
                }
            }
            
            @keyframes explodingSkullCounterCritical {
                0%, 100% { 
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 15px rgba(255, 0, 0, 0.8);
                    transform: scale(1);
                }
                25% { 
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 0, 0, 1);
                    transform: scale(1.2);
                }
                50% { 
                    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4), 0 0 25px rgba(255, 50, 50, 1);
                    transform: scale(0.9);
                }
                75% { 
                    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 0, 0, 1);
                    transform: scale(1.3);
                }
            }

            /* Main Explosion Animation */
            .exploding-skull-explosion {
                width: 200px;
                height: 200px;
                position: relative;
            }
            
            .explosion-core {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 60px;
                height: 60px;
                background: radial-gradient(circle, 
                    #ffffff 0%, 
                    #ffff00 20%, 
                    #ff6600 40%, 
                    #ff0000 70%, 
                    #990000 100%);
                border-radius: 50%;
                box-shadow: 0 0 40px rgba(255, 255, 255, 0.8);
            }
            
            .explosion-ring {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                border: 4px solid;
            }
            
            .explosion-ring-1 {
                width: 80px;
                height: 80px;
                border-color: rgba(255, 200, 0, 0.8);
                animation-delay: 0s;
            }
            
            .explosion-ring-2 {
                width: 120px;
                height: 120px;
                border-color: rgba(255, 100, 0, 0.6);
                animation-delay: 0.2s;
            }
            
            .explosion-ring-3 {
                width: 160px;
                height: 160px;
                border-color: rgba(255, 0, 0, 0.4);
                animation-delay: 0.4s;
            }
            
            .explosion-sparks {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 100%;
                height: 100%;
            }
            
            .spark {
                position: absolute;
                font-size: 20px;
                animation: sparkFly 2s ease-out forwards;
            }
            
            .spark:nth-child(1) { top: 10%; left: 50%; animation-delay: 0.1s; }
            .spark:nth-child(2) { top: 50%; right: 10%; animation-delay: 0.2s; }
            .spark:nth-child(3) { bottom: 10%; left: 50%; animation-delay: 0.3s; }
            .spark:nth-child(4) { top: 50%; left: 10%; animation-delay: 0.4s; }
            .spark:nth-child(5) { top: 20%; right: 20%; animation-delay: 0.5s; }
            .spark:nth-child(6) { bottom: 20%; left: 20%; animation-delay: 0.6s; }

            @keyframes explodingSkullExplosion {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.2);
                }
                15% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                30% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                60% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.5);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(2);
                }
            }
            
            .explosion-ring {
                animation: explosionRing 2s ease-out forwards;
            }
            
            @keyframes explosionRing {
                0% { 
                    transform: translate(-50%, -50%) scale(0.5);
                    opacity: 1;
                }
                100% { 
                    transform: translate(-50%, -50%) scale(3);
                    opacity: 0;
                }
            }
            
            @keyframes sparkFly {
                0% { 
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% { 
                    transform: translate(-50%, -50%) scale(2) translate(var(--random-x, 50px), var(--random-y, 50px));
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const ExplodingSkullHelpers = {
    // Check if any creature in a list is Exploding Skull
    hasExplodingSkullInList(creatures) {
        return creatures.some(creature => ExplodingSkullCreature.isExplodingSkull(creature.name));
    },

    // Get all Exploding Skull creatures from a list
    getExplodingSkullFromList(creatures) {
        return creatures.filter(creature => ExplodingSkullCreature.isExplodingSkull(creature.name));
    }
};

export default ExplodingSkullCreature;