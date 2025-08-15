// ./Creatures/archer.js - Archer Creature Ranged Attack Module

export class ArcherCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeProjectiles = new Set(); // Track active projectiles for cleanup
        
        // Archer stats
        this.ARROW_DAMAGE = 50;
        this.ARROW_TRAVEL_TIME = 500; // 0.5 second arrow travel time
        
        // Inject CSS styles
        this.injectArcherStyles();
        
        console.log('🏹 Archer Creature module initialized');
    }

    // Check if a creature is Archer
    static isArcher(creatureName) {
        return creatureName === 'Archer';
    }

    // Execute Archer special attack with arrow projectile
    async executeSpecialAttack(archerActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const archerCreature = archerActor.data;
        const archerHero = archerActor.hero;
        const attackerSide = archerHero.side;
        
        // Safety check: ensure Archer is still alive
        if (!archerCreature.alive || archerCreature.currentHp <= 0) {
            console.log(`Archer is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `🏹 ${archerCreature.name} draws back its bow and takes aim!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Use ranged targeting system (ignoring creatures)
        const target = this.battleManager.combatManager.authoritative_findTargetIgnoringCreatures(
            position, 
            attackerSide
        );
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${archerCreature.name} finds no targets for its arrow!`, 
                'info'
            );
            return;
        }
        
        // Log target acquisition
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `🎯 ${archerCreature.name} locks onto ${targetName} and releases its arrow!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest
        this.sendArrowAttackUpdate(archerActor, target, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute arrow attack with visual effects
        await this.executeArrowAttack(archerActor, target, position);
    }

    // Execute the arrow attack with visual effects (host side)
    async executeArrowAttack(archerActor, target, position) {
        const attackerSide = archerActor.hero.side;
        const archerElement = this.getArcherElement(attackerSide, position, archerActor.index);
        const targetElement = this.getTargetElement(target);
        
        if (!archerElement) {
            console.error('Archer element not found, cannot create arrow');
            return;
        }

        if (!targetElement) {
            console.error('Target element not found, cannot create arrow');
            return;
        }
        
        // Create and launch arrow projectile
        const projectile = this.createArrowProjectile(archerElement, targetElement);
        if (!projectile) {
            console.error('Failed to create arrow projectile');
            return;
        }

        this.activeProjectiles.add(projectile);

        // Calculate speed-adjusted travel time
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.ARROW_TRAVEL_TIME);
        
        // Wait for projectile to reach target
        await this.battleManager.delay(adjustedTravelTime);
        
        // Apply damage when projectile hits
        this.applyArrowDamage(target, archerActor.data);
        
        // Add impact effect
        this.createImpactEffect(targetElement);
        
        // Clean up projectile
        this.removeProjectile(projectile);

        this.battleManager.addCombatLog(
            `💥 The arrow strikes true, dealing ${this.ARROW_DAMAGE} damage!`, 
            'info'
        );
    }

    // Get the DOM element for Archer creature
    getArcherElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for a target (reused from SkeletonArcher)
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

    // Create an arrow projectile that travels from archer to target (adapted from SkeletonArcher)
    createArrowProjectile(fromElement, toElement) {
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
            
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

            // Create the arrow projectile element
            const projectile = document.createElement('div');
            projectile.className = 'archer-arrow';
            
            // Calculate speed-adjusted travel time for CSS animation
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.ARROW_TRAVEL_TIME);
            
            projectile.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: 35px;
                height: 5px;
                background: linear-gradient(90deg, 
                    #8B4513 0%, 
                    #D2691E 20%, 
                    #CD853F 50%, 
                    #A0522D 80%, 
                    #654321 100%);
                transform-origin: 0 50%;
                transform: rotate(${angle}deg);
                z-index: 1500;
                pointer-events: none;
                border-radius: 2px;
                box-shadow: 
                    0 1px 3px rgba(0, 0, 0, 0.6),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4);
                animation: archerArrowFlight ${adjustedTravelTime}ms linear forwards;
                --target-x: ${deltaX}px;
                --target-y: ${deltaY}px;
                --angle: ${angle}deg;
            `;

            // Add arrowhead (slightly larger than SkeletonArcher)
            const arrowhead = document.createElement('div');
            arrowhead.className = 'archer-arrow-head';
            arrowhead.style.cssText = `
                position: absolute;
                right: -10px;
                top: -5px;
                width: 0;
                height: 0;
                border-left: 15px solid #654321;
                border-top: 7px solid transparent;
                border-bottom: 7px solid transparent;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
            `;
            
            projectile.appendChild(arrowhead);

            // Add fletching (distinctive color for Archer)
            const fletching = document.createElement('div');
            fletching.className = 'archer-arrow-fletching';
            fletching.style.cssText = `
                position: absolute;
                left: -8px;
                top: -3px;
                width: 10px;
                height: 10px;
                background: linear-gradient(45deg, #228B22, #32CD32);
                clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
                opacity: 0.9;
            `;
            
            projectile.appendChild(fletching);
            
            document.body.appendChild(projectile);
            
            console.log(`Created archer arrow: ${distance.toFixed(1)}px at ${angle.toFixed(1)}°, travel time: ${adjustedTravelTime}ms`);
            return projectile;
            
        } catch (error) {
            console.error('Error creating archer arrow:', error);
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
        impact.className = 'archer-arrow-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 50px;
            height: 50px;
            background: radial-gradient(circle, 
                rgba(34, 139, 34, 0.9) 0%, 
                rgba(50, 205, 50, 0.7) 40%, 
                rgba(255, 215, 0, 0.5) 70%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: archerArrowImpact 0.6s ease-out forwards;
            box-shadow: 0 0 15px rgba(34, 139, 34, 0.8);
        `;

        document.body.appendChild(impact);

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 600);
    }

    // Remove projectile with cleanup
    removeProjectile(projectile) {
        if (projectile && projectile.parentNode) {
            this.activeProjectiles.delete(projectile);
            projectile.remove();
        }
    }

    // Apply Archer damage to target
    applyArrowDamage(target, attackingArcher = null) {
        const damage = this.ARROW_DAMAGE;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'attack', // Archer's arrow is a physical attack
                attacker: attackingArcher
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
                source: 'attack', // Archer's arrow is a physical attack
                attacker: attackingArcher
            });
        }
    }

    // Send arrow attack data to guest for synchronization
    sendArrowAttackUpdate(archerActor, target, position) {
        const attackerSide = archerActor.hero.side;
        
        this.battleManager.sendBattleUpdate('archer_arrow_attack', {
            archerData: {
                side: attackerSide,
                position: position,
                creatureIndex: archerActor.index,
                name: archerActor.data.name,
                absoluteSide: archerActor.hero.absoluteSide
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
            damage: this.ARROW_DAMAGE,
            travelTime: this.ARROW_TRAVEL_TIME
        });
    }

    // Handle Archer arrow attack on guest side
    handleGuestArrowAttack(data) {
        const { archerData, target, damage, travelTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const archerLocalSide = (archerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🏹 ${archerData.name} fires a powerful arrow!`, 
            archerLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestArrow(archerData, target, travelTime, myAbsoluteSide);
    }

    // Create arrow on guest side
    async createGuestArrow(archerData, targetData, travelTime, myAbsoluteSide) {
        const archerLocalSide = (archerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const archerElement = this.getArcherElement(
            archerLocalSide,
            archerData.position,
            archerData.creatureIndex
        );

        if (!archerElement) {
            console.warn('Archer element not found on guest side');
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
            const projectile = this.createArrowProjectile(archerElement, targetElement);
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
                `🎯 ${targetName} is struck by the arrow for ${this.ARROW_DAMAGE} damage!`, 
                targetLocalSide === 'player' ? 'error' : 'success'
            );
        } else {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        }
    }

    // Clean up all active projectiles (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeProjectiles.size} active Archer arrows`);
        
        this.activeProjectiles.forEach(projectile => {
            try {
                if (projectile && projectile.parentNode) {
                    projectile.remove();
                }
            } catch (error) {
                console.warn('Error removing archer arrow during cleanup:', error);
            }
        });
        
        this.activeProjectiles.clear();

        // Also remove any orphaned projectile elements
        try {
            const orphanedProjectiles = document.querySelectorAll('.archer-arrow');
            orphanedProjectiles.forEach(projectile => {
                if (projectile.parentNode) {
                    projectile.remove();
                }
            });
            
            if (orphanedProjectiles.length > 0) {
                console.log(`Cleaned up ${orphanedProjectiles.length} orphaned Archer arrows`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned archer arrows:', error);
        }
    }

    // Inject CSS styles for Archer effects
    injectArcherStyles() {
        if (document.getElementById('archerCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'archerCreatureStyles';
        style.textContent = `
            /* Archer Arrow Projectile Styles */
            .archer-arrow {
                border-radius: 2px;
                position: relative;
                overflow: visible;
            }

            .archer-arrow-head {
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
            }

            .archer-arrow-fletching {
                opacity: 0.9;
            }

            @keyframes archerArrowFlight {
                0% { 
                    transform: translate(0, 0) rotate(var(--angle, 0deg));
                    opacity: 1;
                }
                100% { 
                    transform: translate(var(--target-x), var(--target-y)) rotate(var(--angle, 0deg));
                    opacity: 0.8;
                }
            }

            @keyframes archerArrowImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.4);
                }
                40% { 
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.3);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.2);
                }
            }

            /* Enhanced creature glow when Archer is preparing to shoot */
            .creature-icon.archer-aiming .creature-sprite {
                filter: brightness(1.7) drop-shadow(0 0 15px rgba(34, 139, 34, 0.9));
                animation: archerAimGlow 0.9s ease-in-out infinite alternate;
            }

            @keyframes archerAimGlow {
                0% { 
                    filter: brightness(1.7) drop-shadow(0 0 15px rgba(34, 139, 34, 0.9));
                }
                100% { 
                    filter: brightness(2.2) drop-shadow(0 0 25px rgba(50, 205, 50, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const ArcherHelpers = {
    // Check if any creature in a list is Archer
    hasArcherInList(creatures) {
        return creatures.some(creature => ArcherCreature.isArcher(creature.name));
    },

    // Get all Archer creatures from a list
    getArcherFromList(creatures) {
        return creatures.filter(creature => ArcherCreature.isArcher(creature.name));
    }
};

export default ArcherCreature;