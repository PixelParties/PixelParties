// ./Creatures/moonlightButterfly.js - Moonlight Butterfly Creature with Counter System

export class MoonlightButterflyCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeProjectiles = new Set(); // Track active projectiles for cleanup
        
        // Moonlight Butterfly stats
        this.ATTACK_DAMAGE = 300;
        this.ATTACK_TRAVEL_TIME = 800; // 0.8 second shockwave travel time
        this.MAX_COUNTERS = 3;
        
        // Inject CSS styles
        this.injectMoonlightButterflyStyles();
        
        console.log('🦋 Moonlight Butterfly Creature module initialized');
    }

    // Check if a creature is Moonlight Butterfly
    static isMoonlightButterfly(creatureName) {
        return creatureName === 'MoonlightButterfly';
    }

    // Execute Moonlight Butterfly special attack - gain counter or attack
    async executeMoonlightButterflyAction(butterflyActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const butterfly = butterflyActor.data;
        const butterflyHero = butterflyActor.hero;
        const attackerSide = butterflyHero.side;
        
        // Safety check: ensure Butterfly is still alive
        if (!butterfly.alive || butterfly.currentHp <= 0) {
            console.log(`Moonlight Butterfly is dead, cannot execute action`);
            return;
        }
        
        // Initialize counters if not present
        if (butterfly.counters === undefined) {
            butterfly.counters = 0;
        }
        
        // Gain a counter
        butterfly.counters++;
        
        this.battleManager.addCombatLog(
            `🦋 ${butterfly.name} gains a counter (${butterfly.counters}/${this.MAX_COUNTERS})!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Update counter display for all players
        this.sendCounterUpdate(butterflyActor, position);
        
        // Show clock animation for gaining counter
        await this.showCounterGainAnimation(butterflyActor, position);
        
        // Check if ready to attack
        if (butterfly.counters >= this.MAX_COUNTERS) {
            // Reset counters
            butterfly.counters = 0;
            
            this.battleManager.addCombatLog(
                `🌙 ${butterfly.name} has charged up! Preparing moonlight assault!`, 
                attackerSide === 'player' ? 'success' : 'error'
            );

            // Update counter display after reset
            this.sendCounterUpdate(butterflyActor, position);
            
            // Short delay for dramatic effect
            await this.battleManager.delay(500);
            
            // Execute ranged attack
            await this.executeMoonlightAttack(butterflyActor, position);
        }
    }

    // Execute the moonlight attack with visual effects
    async executeMoonlightAttack(butterflyActor, position) {
        const attackerSide = butterflyActor.hero.side;
        
        // Use ranged targeting system (ignoring creatures, nearest hero)
        const target = this.battleManager.combatManager.authoritative_findTargetIgnoringCreatures(
            position, 
            attackerSide
        );
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${butterflyActor.data.name} finds no targets for its moonlight assault!`, 
                'info'
            );
            return;
        }
        
        // Log target acquisition
        const targetName = target.hero.name;
        this.battleManager.addCombatLog(
            `🎯 ${butterflyActor.data.name} unleashes moonlight energy at ${targetName}!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest
        this.sendMoonlightAttackUpdate(butterflyActor, target, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute attack with visual effects
        await this.executeMoonlightShockwave(butterflyActor, target, position);
    }

    // Execute the shockwave attack with visual effects (host side)
    async executeMoonlightShockwave(butterflyActor, target, position) {
        const attackerSide = butterflyActor.hero.side;
        const butterflyElement = this.getButterflyElement(attackerSide, position, butterflyActor.index);
        const targetElement = this.getTargetElement(target);
        
        if (!butterflyElement) {
            console.error('Butterfly element not found, cannot create shockwave');
            return;
        }

        if (!targetElement) {
            console.error('Target element not found, cannot create shockwave');
            return;
        }
        
        // Create and launch shockwave projectile
        const projectile = this.createShockwaveProjectile(butterflyElement, targetElement);
        if (!projectile) {
            console.error('Failed to create shockwave projectile');
            return;
        }

        this.activeProjectiles.add(projectile);

        // Calculate speed-adjusted travel time
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.ATTACK_TRAVEL_TIME);
        
        // Wait for projectile to reach target
        await this.battleManager.delay(adjustedTravelTime);
        
        // Apply damage when projectile hits
        this.applyMoonlightDamage(target, butterflyActor.data);
        
        // Add impact effect
        this.createShockwaveImpact(targetElement);
        
        // Clean up projectile
        this.removeProjectile(projectile);

        this.battleManager.addCombatLog(
            `💥 The moonlight energy strikes with devastating force, dealing ${this.ATTACK_DAMAGE} damage!`, 
            'info'
        );
    }

    // Show clock animation for counter gain
    async showCounterGainAnimation(butterflyActor, position) {
        const attackerSide = butterflyActor.hero.side;
        const butterflyElement = this.getButterflyElement(attackerSide, position, butterflyActor.index);
        
        if (!butterflyElement) return;

        const rect = butterflyElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clockAnimation = document.createElement('div');
        clockAnimation.className = 'butterfly-counter-gain';
        clockAnimation.innerHTML = '🕐';
        clockAnimation.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            font-size: 24px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: butterflyCounterGain 1s ease-out forwards;
        `;

        document.body.appendChild(clockAnimation);

        // Remove animation after completion
        setTimeout(() => {
            if (clockAnimation.parentNode) {
                clockAnimation.remove();
            }
        }, 1000);

        await this.battleManager.delay(300);
    }

    // Get the DOM element for Butterfly creature
    getButterflyElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for a target (reused from Archer)
    getTargetElement(target) {
        if (!target || !target.side || !target.position) {
            console.warn('Invalid target data:', target);
            return null;
        }

        let element = null;
        
        if (target.type === 'hero') {
            element = document.querySelector(`.${target.side}-slot.${target.position}-slot .battle-hero-card`);
            if (!element) {
                // Fallback to the slot itself
                element = document.querySelector(`.${target.side}-slot.${target.position}-slot`);
            }
        }

        if (!element) {
            console.warn(`Target element not found for ${target.type} at ${target.side}-${target.position}`);
        }

        return element;
    }

    // Create a shockwave projectile that travels from butterfly to target
    createShockwaveProjectile(fromElement, toElement) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create shockwave: missing elements');
            return null;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            // Calculate center positions
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            // Calculate projectile properties
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance < 10 || distance > 2000) {
                console.warn(`Invalid shockwave distance: ${distance}px`);
                return null;
            }

            // Create the shockwave projectile element
            const projectile = document.createElement('div');
            projectile.className = 'moonlight-shockwave';
            
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.ATTACK_TRAVEL_TIME);
            
            projectile.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: 60px;
                height: 60px;
                background: radial-gradient(circle, 
                    rgba(100, 149, 237, 0.9) 0%, 
                    rgba(72, 118, 255, 0.7) 40%, 
                    rgba(30, 50, 120, 0.5) 70%, 
                    transparent 100%);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                z-index: 1500;
                pointer-events: none;
                animation: moonlightShockwaveFlight ${adjustedTravelTime}ms ease-out forwards;
                --target-x: ${deltaX}px;
                --target-y: ${deltaY}px;
                box-shadow: 
                    0 0 20px rgba(100, 149, 237, 0.8),
                    0 0 40px rgba(72, 118, 255, 0.6),
                    inset 0 0 20px rgba(255, 255, 255, 0.3);
            `;

            document.body.appendChild(projectile);
            
            console.log(`Created moonlight shockwave: ${distance.toFixed(1)}px, travel time: ${adjustedTravelTime}ms`);
            return projectile;
            
        } catch (error) {
            console.error('Error creating moonlight shockwave:', error);
            return null;
        }
    }

    // Create impact effect at target location
    createShockwaveImpact(targetElement) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const impact = document.createElement('div');
        impact.className = 'moonlight-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, 
                rgba(100, 149, 237, 0.9) 0%, 
                rgba(72, 118, 255, 0.7) 30%, 
                rgba(30, 50, 120, 0.5) 60%, 
                rgba(15, 25, 60, 0.3) 80%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: moonlightImpact 1s ease-out forwards;
            box-shadow: 
                0 0 30px rgba(100, 149, 237, 1),
                0 0 60px rgba(72, 118, 255, 0.8);
        `;

        document.body.appendChild(impact);

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 1000);
    }

    // Remove projectile with cleanup
    removeProjectile(projectile) {
        if (projectile && projectile.parentNode) {
            this.activeProjectiles.delete(projectile);
            projectile.remove();
        }
    }

    // Apply Moonlight Butterfly damage to target
    applyMoonlightDamage(target, attackingButterfly = null) {
        const damage = this.ATTACK_DAMAGE;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'attack', // Moonlight attack is a magical attack
                attacker: attackingButterfly
            });
        }
    }

    // Send counter update to guest for synchronization
    sendCounterUpdate(butterflyActor, position) {
        const attackerSide = butterflyActor.hero.side;
        
        this.battleManager.sendBattleUpdate('creature_counter_update', {
            creatureData: {
                side: attackerSide,
                position: position,
                creatureIndex: butterflyActor.index,
                name: butterflyActor.data.name,
                absoluteSide: butterflyActor.hero.absoluteSide,
                counters: butterflyActor.data.counters || 0
            }
        });
    }

    // Send moonlight attack data to guest for synchronization
    sendMoonlightAttackUpdate(butterflyActor, target, position) {
        const attackerSide = butterflyActor.hero.side;
        
        this.battleManager.sendBattleUpdate('moonlight_butterfly_attack', {
            butterflyData: {
                side: attackerSide,
                position: position,
                creatureIndex: butterflyActor.index,
                name: butterflyActor.data.name,
                absoluteSide: butterflyActor.hero.absoluteSide
            },
            target: {
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                heroName: target.hero ? target.hero.name : null
            },
            damage: this.ATTACK_DAMAGE,
            travelTime: this.ATTACK_TRAVEL_TIME
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
    }

    // Handle Moonlight Butterfly attack on guest side
    handleGuestMoonlightAttack(data) {
        const { butterflyData, target, damage, travelTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const butterflyLocalSide = (butterflyData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🌙 ${butterflyData.name} unleashes a devastating moonlight assault!`, 
            butterflyLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestShockwave(butterflyData, target, travelTime, myAbsoluteSide);
    }

    // Create shockwave on guest side
    async createGuestShockwave(butterflyData, targetData, travelTime, myAbsoluteSide) {
        const butterflyLocalSide = (butterflyData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const butterflyElement = this.getButterflyElement(
            butterflyLocalSide,
            butterflyData.position,
            butterflyData.creatureIndex
        );

        if (!butterflyElement) {
            console.warn('Butterfly element not found on guest side');
            return;
        }

        // Find target element using absoluteSide mapping
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetElement = document.querySelector(
            `.${targetLocalSide}-slot.${targetData.position}-slot .battle-hero-card`
        ) || document.querySelector(
            `.${targetLocalSide}-slot.${targetData.position}-slot`
        );

        if (targetElement) {
            const projectile = this.createShockwaveProjectile(butterflyElement, targetElement);
            if (projectile) {
                this.activeProjectiles.add(projectile);
            }

            // Calculate speed-adjusted travel time
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(travelTime);
            
            // Wait for projectile to reach target, then show impact
            await this.battleManager.delay(adjustedTravelTime);
            
            this.createShockwaveImpact(targetElement);
            this.removeProjectile(projectile);

            // Log damage for target (but don't apply actual damage - host handles that)
            this.battleManager.addCombatLog(
                `💥 ${targetData.heroName} is struck by moonlight energy for ${this.ATTACK_DAMAGE} damage!`, 
                targetLocalSide === 'player' ? 'error' : 'success'
            );
        } else {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        }
    }

    // Update creature counter display
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
            counterDisplay.className = 'creature-counter-display';
            counterDisplay.textContent = counters;
            counterDisplay.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background: white;
                color: #333;
                border: 2px solid #666;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 10;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            `;
            
            creatureElement.appendChild(counterDisplay);
        }
    }

    // Clean up all active projectiles (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeProjectiles.size} active Moonlight Butterfly effects`);
        
        this.activeProjectiles.forEach(projectile => {
            try {
                if (projectile && projectile.parentNode) {
                    projectile.remove();
                }
            } catch (error) {
                console.warn('Error removing moonlight effect during cleanup:', error);
            }
        });
        
        this.activeProjectiles.clear();

        // Also remove any orphaned projectile elements
        try {
            const orphanedProjectiles = document.querySelectorAll('.moonlight-shockwave');
            orphanedProjectiles.forEach(projectile => {
                if (projectile.parentNode) {
                    projectile.remove();
                }
            });
            
            if (orphanedProjectiles.length > 0) {
                console.log(`Cleaned up ${orphanedProjectiles.length} orphaned Moonlight Butterfly effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned moonlight effects:', error);
        }
    }

    // Inject CSS styles for Moonlight Butterfly effects
    injectMoonlightButterflyStyles() {
        if (document.getElementById('moonlightButterflyStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'moonlightButterflyStyles';
        style.textContent = `
            /* Moonlight Butterfly Counter Gain Animation */
            @keyframes butterflyCounterGain {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -70%) scale(1.2) rotate(180deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -90%) scale(0.8) rotate(360deg);
                }
            }

            /* Moonlight Shockwave Projectile */
            @keyframes moonlightShockwaveFlight {
                0% { 
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                50% {
                    transform: translate(calc(-50% + var(--target-x) * 0.5), calc(-50% + var(--target-y) * 0.5)) scale(1.3);
                    opacity: 0.9;
                }
                100% { 
                    transform: translate(calc(-50% + var(--target-x)), calc(-50% + var(--target-y))) scale(0.8);
                    opacity: 0.7;
                }
            }

            /* Moonlight Impact Effect */
            @keyframes moonlightImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                30% { 
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.5);
                }
                70% { 
                    opacity: 0.6;
                    transform: translate(-50%, -50%) scale(2);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
            }

            /* Creature Counter Display */
            .creature-counter-display {
                animation: counterPulse 2s ease-in-out infinite;
            }

            @keyframes counterPulse {
                0%, 100% { 
                    transform: scale(1);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }
                50% { 
                    transform: scale(1.1);
                    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
                }
            }

            /* Enhanced creature glow when Butterfly is charging */
            .creature-icon.butterfly-charging .creature-sprite {
                filter: brightness(1.5) drop-shadow(0 0 15px rgba(100, 149, 237, 0.9));
                animation: butterflyChargeGlow 1.5s ease-in-out infinite alternate;
            }

            @keyframes butterflyChargeGlow {
                0% { 
                    filter: brightness(1.5) drop-shadow(0 0 15px rgba(100, 149, 237, 0.9));
                }
                100% { 
                    filter: brightness(2) drop-shadow(0 0 25px rgba(72, 118, 255, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const MoonlightButterflyHelpers = {
    // Check if any creature in a list is Moonlight Butterfly
    hasMoonlightButterflyInList(creatures) {
        return creatures.some(creature => MoonlightButterflyCreature.isMoonlightButterfly(creature.name));
    },

    // Get all Moonlight Butterfly creatures from a list
    getMoonlightButterflyFromList(creatures) {
        return creatures.filter(creature => MoonlightButterflyCreature.isMoonlightButterfly(creature.name));
    }
};

export default MoonlightButterflyCreature;