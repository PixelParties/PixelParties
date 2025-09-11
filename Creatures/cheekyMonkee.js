// ./Creatures/cheekyMonkee.js - CheekyMonkee Creature Rock Throwing Module

export class CheekyMonkeeCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeProjectiles = new Set(); // Track active projectiles for cleanup
        
        // Rock projectile settings
        this.ROCK_TRAVEL_TIME = 600; // 0.6 second rock travel time (slightly slower than arrow)
        
        // Inject CSS styles
        this.injectCheekyMonkeeStyles();
        
        console.log('🐒 CheekyMonkee Creature module initialized');
    }

    // Check if a creature is CheekyMonkee
    static isCheekyMonkee(creatureName) {
        return creatureName === 'CheekyMonkee';
    }

    // Execute CheekyMonkee special attack with rock throwing
    async executeSpecialAttack(monkeeActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const monkeeCreature = monkeeActor.data;
        const monkeeHero = monkeeActor.hero;
        const attackerSide = monkeeHero.side;
        
        // Safety check: ensure CheekyMonkee is still alive
        if (!monkeeCreature.alive || monkeeCreature.currentHp <= 0) {
            console.log(`CheekyMonkee is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `🐒 ${monkeeCreature.name} grabs a rock and prepares to throw it!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Use normal targeting system (includes creatures, unlike Archer)
        const target = this.battleManager.combatManager.authoritative_findTargetWithCreatures(
            position, 
            attackerSide
        );
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${monkeeCreature.name} finds no targets for its rock!`, 
                'info'
            );
            return;
        }
        
        // Calculate damage based on CheekyMonkee's max HP
        const rockDamage = monkeeCreature.maxHp;
        
        // Log target acquisition
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `🎯 ${monkeeCreature.name} aims at ${targetName} and hurls the rock! (${rockDamage} damage)`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest
        this.sendRockThrowUpdate(monkeeActor, target, position, rockDamage);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute rock throw with visual effects
        await this.executeRockThrow(monkeeActor, target, position, rockDamage);
    }

    // Execute the rock throw with visual effects (host side)
    async executeRockThrow(monkeeActor, target, position, damage) {
        const attackerSide = monkeeActor.hero.side;
        const monkeeElement = this.getCheekyMonkeeElement(attackerSide, position, monkeeActor.index);
        const targetElement = this.getTargetElement(target);
        
        if (!monkeeElement) {
            console.error('CheekyMonkee element not found, cannot create rock');
            return;
        }

        if (!targetElement) {
            console.error('Target element not found, cannot create rock');
            return;
        }
        
        // Create and launch rock projectile
        const projectile = this.createRockProjectile(monkeeElement, targetElement);
        if (!projectile) {
            console.error('Failed to create rock projectile');
            return;
        }

        this.activeProjectiles.add(projectile);

        // Calculate speed-adjusted travel time
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.ROCK_TRAVEL_TIME);
        
        // Wait for projectile to reach target
        await this.battleManager.delay(adjustedTravelTime);
        
        // Apply damage when projectile hits
        this.applyRockDamage(target, monkeeActor.data, damage);
        
        // Add impact effect
        this.createImpactEffect(targetElement);
        
        // Clean up projectile
        this.removeProjectile(projectile);

        this.battleManager.addCombatLog(
            `💥 The rock strikes with tremendous force, dealing ${damage} damage!`, 
            'info'
        );
    }

    // Get the DOM element for CheekyMonkee creature
    getCheekyMonkeeElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for a target (reused logic from Archer)
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
        } else if (target.type === 'creature') {
            if (target.creatureIndex === undefined || target.creatureIndex < 0) {
                console.warn('Invalid creature index for target:', target);
                return null;
            }
            element = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }

        if (!element) {
            console.warn(`Target element not found for ${target.type} at ${target.side}-${target.position}${target.type === 'creature' ? `-${target.creatureIndex}` : ''}`);
        }

        return element;
    }

    // Create a rock projectile that travels from CheekyMonkee to target
    createRockProjectile(fromElement, toElement) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create projectile: missing elements', { fromElement: !!fromElement, toElement: !!toElement });
            return null;
        }

        // Additional validation: ensure elements are still in DOM
        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            console.warn('Cannot create projectile: elements not in DOM');
            return null;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            // Validate that elements have valid dimensions
            if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
                console.warn('Cannot create projectile: elements have invalid dimensions');
                return null;
            }

            // Calculate center positions
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid projectile coordinates detected:', { fromX, fromY, toX, toY });
                return null;
            }

            // Calculate projectile properties
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Prevent projectiles that are too short or too long (likely errors)
            if (distance < 10 || distance > 2000) {
                console.warn(`Invalid projectile distance: ${distance}px`);
                return null;
            }

            // Create the rock projectile element
            const projectile = document.createElement('div');
            projectile.className = 'cheeky-monkee-rock';
            
            // Calculate speed-adjusted travel time for CSS animation
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.ROCK_TRAVEL_TIME);
            
            projectile.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: 20px;
                height: 20px;
                background: radial-gradient(circle at 30% 30%, 
                    #A0A0A0 0%, 
                    #808080 25%, 
                    #606060 50%, 
                    #404040 75%, 
                    #2F2F2F 100%);
                border-radius: 45%;
                z-index: 1500;
                pointer-events: none;
                box-shadow: 
                    0 2px 4px rgba(0, 0, 0, 0.8),
                    inset 2px 2px 4px rgba(255, 255, 255, 0.3),
                    inset -2px -2px 4px rgba(0, 0, 0, 0.4);
                animation: cheekyMonkeeRockFlight ${adjustedTravelTime}ms ease-out forwards;
                --target-x: ${deltaX}px;
                --target-y: ${deltaY}px;
                transform-origin: center center;
            `;

            // Add rock texture details
            const rockDetail1 = document.createElement('div');
            rockDetail1.style.cssText = `
                position: absolute;
                top: 3px;
                left: 5px;
                width: 4px;
                height: 4px;
                background: #505050;
                border-radius: 50%;
                opacity: 0.7;
            `;
            
            const rockDetail2 = document.createElement('div');
            rockDetail2.style.cssText = `
                position: absolute;
                top: 12px;
                left: 12px;
                width: 3px;
                height: 3px;
                background: #707070;
                border-radius: 50%;
                opacity: 0.8;
            `;
            
            projectile.appendChild(rockDetail1);
            projectile.appendChild(rockDetail2);
            
            document.body.appendChild(projectile);
            
            console.log(`Created CheekyMonkee rock: ${distance.toFixed(1)}px, travel time: ${adjustedTravelTime}ms`);
            return projectile;
            
        } catch (error) {
            console.error('Error creating CheekyMonkee rock:', error);
            return null;
        }
    }

    // Create impact effect at target location
    createImpactEffect(targetElement) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const impact = document.createElement('div');
        impact.className = 'cheeky-monkee-rock-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, 
                rgba(139, 69, 19, 0.9) 0%, 
                rgba(160, 82, 45, 0.7) 30%, 
                rgba(210, 180, 140, 0.5) 60%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: cheekyMonkeeRockImpact 0.8s ease-out forwards;
            box-shadow: 0 0 20px rgba(139, 69, 19, 0.8);
        `;

        // Add dust particles effect
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 6px;
                height: 6px;
                background: rgba(139, 69, 19, 0.8);
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                animation: cheekyMonkeeRockParticle ${0.6 + Math.random() * 0.4}s ease-out forwards;
                animation-delay: ${Math.random() * 0.2}s;
                --particle-angle: ${Math.random() * 360}deg;
                --particle-distance: ${30 + Math.random() * 20}px;
            `;
            impact.appendChild(particle);
        }

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

    // Apply CheekyMonkee rock damage to target
    applyRockDamage(target, attackingMonkee = null, damage) {
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'attack', // CheekyMonkee's rock is a physical attack
                attacker: attackingMonkee
            });
        } else if (target.type === 'creature') {
            this.battleManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: target.position,
                side: target.side
            }, {
                source: 'attack', // CheekyMonkee's rock is a physical attack
                attacker: attackingMonkee
            });
        }
    }

    // Send rock throw data to guest for synchronization
    sendRockThrowUpdate(monkeeActor, target, position, damage) {
        const attackerSide = monkeeActor.hero.side;
        
        this.battleManager.sendBattleUpdate('cheeky_monkee_rock_throw', {
            monkeeData: {
                side: attackerSide,
                position: position,
                creatureIndex: monkeeActor.index,
                name: monkeeActor.data.name,
                absoluteSide: monkeeActor.hero.absoluteSide
            },
            target: {
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null
            },
            damage: damage,
            travelTime: this.ROCK_TRAVEL_TIME
        });
    }

    // Handle CheekyMonkee rock throw on guest side
    handleGuestRockThrow(data) {
        const { monkeeData, target, damage, travelTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const monkeeLocalSide = (monkeeData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🐒 ${monkeeData.name} hurls a rock with great force!`, 
            monkeeLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestRock(monkeeData, target, travelTime, myAbsoluteSide);
    }

    // Create rock on guest side
    async createGuestRock(monkeeData, targetData, travelTime, myAbsoluteSide) {
        const monkeeLocalSide = (monkeeData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const monkeeElement = this.getCheekyMonkeeElement(
            monkeeLocalSide,
            monkeeData.position,
            monkeeData.creatureIndex
        );

        if (!monkeeElement) {
            console.warn('CheekyMonkee element not found on guest side');
            return;
        }

        // Find target element using absoluteSide mapping
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        let targetElement = null;
        
        if (targetData.type === 'hero') {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .battle-hero-card`
            );
            if (!targetElement) {
                // Fallback to slot
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot`
                );
            }
        } else if (targetData.type === 'creature' && targetData.creatureIndex !== null) {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }

        if (targetElement) {
            const projectile = this.createRockProjectile(monkeeElement, targetElement);
            if (projectile) {
                this.activeProjectiles.add(projectile);
            }

            // Calculate speed-adjusted travel time
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(travelTime);
            
            // Wait for projectile to reach target, then show impact
            await this.battleManager.delay(adjustedTravelTime);
            
            this.createImpactEffect(targetElement);
            this.removeProjectile(projectile);

            // Log damage for target (but don't apply actual damage - host handles that)
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            this.battleManager.addCombatLog(
                `🎯 ${targetName} is struck by the rock for ${targetData.damage || 'heavy'} damage!`, 
                targetLocalSide === 'player' ? 'error' : 'success'
            );
        } else {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        }
    }

    // Clean up all active projectiles (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeProjectiles.size} active CheekyMonkee rocks`);
        
        this.activeProjectiles.forEach(projectile => {
            try {
                if (projectile && projectile.parentNode) {
                    projectile.remove();
                }
            } catch (error) {
                console.warn('Error removing CheekyMonkee rock during cleanup:', error);
            }
        });
        
        this.activeProjectiles.clear();

        // Also remove any orphaned projectile elements
        try {
            const orphanedProjectiles = document.querySelectorAll('.cheeky-monkee-rock');
            orphanedProjectiles.forEach(projectile => {
                if (projectile.parentNode) {
                    projectile.remove();
                }
            });
            
            if (orphanedProjectiles.length > 0) {
                console.log(`Cleaned up ${orphanedProjectiles.length} orphaned CheekyMonkee rocks`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned CheekyMonkee rocks:', error);
        }
    }

    // Inject CSS styles for CheekyMonkee effects
    injectCheekyMonkeeStyles() {
        if (document.getElementById('cheekyMonkeeCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'cheekyMonkeeCreatureStyles';
        style.textContent = `
            /* CheekyMonkee Rock Projectile Styles */
            .cheeky-monkee-rock {
                border-radius: 45%;
                position: relative;
                overflow: visible;
            }

            @keyframes cheekyMonkeeRockFlight {
                0% { 
                    transform: translate(0, 0) rotate(0deg);
                    opacity: 1;
                }
                100% { 
                    transform: translate(var(--target-x), var(--target-y)) rotate(720deg);
                    opacity: 0.9;
                }
            }

            @keyframes cheekyMonkeeRockImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                30% { 
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.1);
                }
            }

            @keyframes cheekyMonkeeRockParticle {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(0);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(var(--particle-distance));
                }
            }

            /* Enhanced creature glow when CheekyMonkee is preparing to throw */
            .creature-icon.cheeky-monkee-preparing .creature-sprite {
                filter: brightness(1.5) drop-shadow(0 0 12px rgba(139, 69, 19, 0.8));
                animation: cheekyMonkeePreparGlow 1s ease-in-out infinite alternate;
            }

            @keyframes cheekyMonkeePreparGlow {
                0% { 
                    filter: brightness(1.5) drop-shadow(0 0 12px rgba(139, 69, 19, 0.8));
                }
                100% { 
                    filter: brightness(1.8) drop-shadow(0 0 20px rgba(160, 82, 45, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const CheekyMonkeeHelpers = {
    // Check if any creature in a list is CheekyMonkee
    hasCheekyMonkeeInList(creatures) {
        return creatures.some(creature => CheekyMonkeeCreature.isCheekyMonkee(creature.name));
    },

    // Get all CheekyMonkee creatures from a list
    getCheekyMonkeeFromList(creatures) {
        return creatures.filter(creature => CheekyMonkeeCreature.isCheekyMonkee(creature.name));
    }
};

export default CheekyMonkeeCreature;