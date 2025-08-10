// ./Creatures/skeletonArcher.js - Skeleton Archer Creature Projectile Attack Module

export class SkeletonArcherCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeProjectiles = new Set(); // Track active projectiles for cleanup
        
        // Skeleton Archer stats
        this.PROJECTILE_DAMAGE = 10;
        this.PROJECTILE_TRAVEL_TIME = 500; // 0.5 second base travel time
        
        // Inject CSS styles
        this.injectSkeletonArcherStyles();
        
        console.log('🏹 Skeleton Archer Creature module initialized');
    }

    // Check if a creature is Skeleton Archer
    static isSkeletonArcher(creatureName) {
        return creatureName === 'SkeletonArcher';
    }

    // Execute Skeleton Archer special attack with projectile
    async executeSpecialAttack(archerActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const archerCreature = archerActor.data;
        const archerHero = archerActor.hero;
        const attackerSide = archerHero.side;
        
        // Safety check: ensure Skeleton Archer is still alive
        if (!archerCreature.alive || archerCreature.currentHp <= 0) {
            console.log(`Skeleton Archer is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `🏹 ${archerCreature.name} draws back its bowstring and takes aim!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Use standard targeting system
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

        // Send synchronization data to guest BEFORE starting host animation
        this.sendProjectileAttackUpdate(archerActor, target, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute projectile attack with visual effects
        await this.executeProjectileAttack(archerActor, target, position);
    }

    // Execute the projectile attack with visual effects (host side)
    async executeProjectileAttack(archerActor, target, position) {
        const attackerSide = archerActor.hero.side;
        const archerElement = this.getArcherElement(attackerSide, position, archerActor.index);
        const targetElement = this.getTargetElement(target);
        
        if (!archerElement) {
            console.error('Skeleton Archer element not found, cannot create projectile');
            return;
        }

        if (!targetElement) {
            console.error('Target element not found, cannot create projectile');
            return;
        }
        
        // Create and launch projectile
        const projectile = this.createArrowProjectile(archerElement, targetElement);
        if (!projectile) {
            console.error('Failed to create arrow projectile');
            return;
        }

        this.activeProjectiles.add(projectile);

        // Calculate speed-adjusted travel time
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.PROJECTILE_TRAVEL_TIME);
        
        // Wait for projectile to reach target
        await this.battleManager.delay(adjustedTravelTime);
        
        // Apply damage when projectile hits (only host applies actual damage)
        this.applyArcherDamage(target, archerActor.data); 
        
        // Add impact effect
        this.createImpactEffect(targetElement);
        
        // Clean up projectile
        this.removeProjectile(projectile);

        this.battleManager.addCombatLog(
            `💥 The arrow strikes true, dealing ${this.PROJECTILE_DAMAGE} damage!`, 
            'info'
        );
    }



    // ============================================
    // DEATH SALVO EFFECT
    // ============================================

    // Execute death salvo when Skeleton Archer dies (5 arrows at random targets)
    async executeDeathSalvo(dyingArcher, heroOwner, position, side) {
        if (!this.battleManager.isAuthoritative) return;

        const archerCreature = dyingArcher;
        const archerSide = side;
        
        this.battleManager.addCombatLog(
            `💀🏹 ${archerCreature.name} unleashes a final desperate volley as it dies!`, 
            archerSide === 'player' ? 'info' : 'info'
        );

        // Send death salvo data to guest for synchronization
        this.sendDeathSalvoUpdate(archerCreature, heroOwner, position, archerSide);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(100);

        // Execute the death salvo with 5 arrows
        await this.executeDeathSalvoAttack(archerCreature, heroOwner, position, archerSide);
    }

    // Execute the death salvo attack (5 arrows with delays)
    async executeDeathSalvoAttack(archerCreature, heroOwner, position, archerSide) {
        const SALVO_ARROW_COUNT = 5;
        const ARROW_DELAY = 150; // 150ms between each arrow
        
        // Get the archer element (even though it's dead, we need it for projectile origin)
        const archerElement = this.getArcherElement(archerSide, position, heroOwner.creatures.indexOf(archerCreature));
        
        if (!archerElement) {
            console.error('Skeleton Archer element not found for death salvo');
            return;
        }

        // Fire 5 arrows in rapid succession
        for (let i = 0; i < SALVO_ARROW_COUNT; i++) {
            // Find a random target for this arrow
            const target = this.battleManager.combatManager.authoritative_findRandomTarget(archerSide);
            
            if (!target) {
                console.log(`💨 Death salvo arrow ${i + 1} finds no targets!`);
                continue;
            }

            const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
            this.battleManager.addCombatLog(
                `🎯 Death arrow ${i + 1}/${SALVO_ARROW_COUNT} seeks ${targetName}!`, 
                'warning'
            );

            // Fire this arrow (don't await - let them fly simultaneously with staggered starts)
            // FIXED: Pass the attacking archer creature
            this.fireSalvoArrow(archerElement, target, i + 1, archerCreature);
            
            // Small delay before firing the next arrow
            if (i < SALVO_ARROW_COUNT - 1) {
                await this.battleManager.delay(ARROW_DELAY);
            }
        }

        // Add final message after all arrows have been fired
        this.battleManager.addCombatLog(
            `💥 ${archerCreature.name}'s final salvo complete!`, 
            'info'
        );
    }

    // Fire a single salvo arrow
    async fireSalvoArrow(archerElement, target, arrowNumber, attackingArcher) {
        const targetElement = this.getTargetElement(target);
        
        if (!targetElement) {
            console.error(`Target element not found for salvo arrow ${arrowNumber}`);
            return;
        }
        
        // Create and launch projectile
        const projectile = this.createArrowProjectile(archerElement, targetElement);
        if (!projectile) {
            console.error(`Failed to create salvo arrow ${arrowNumber}`);
            return;
        }

        this.activeProjectiles.add(projectile);

        // Calculate speed-adjusted travel time
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.PROJECTILE_TRAVEL_TIME);
        
        // Wait for projectile to reach target
        await this.battleManager.delay(adjustedTravelTime);
        
        // Apply damage when projectile hits (only host applies actual damage) - FIXED: Use attackingArcher
        this.applyArcherDamage(target, attackingArcher);
        
        // Add impact effect
        this.createImpactEffect(targetElement);
        
        // Clean up projectile
        this.removeProjectile(projectile);

        // Log the hit
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `💥 Death arrow ${arrowNumber} strikes ${targetName} for ${this.PROJECTILE_DAMAGE} damage!`, 
            'warning'
        );
    }

    // Send death salvo data to guest for synchronization
    sendDeathSalvoUpdate(archerCreature, heroOwner, position, archerSide) {
        this.battleManager.sendBattleUpdate('skeleton_archer_death_salvo', {
            archerData: {
                side: archerSide,
                position: position,
                creatureIndex: heroOwner.creatures.indexOf(archerCreature),
                name: archerCreature.name,
                absoluteSide: heroOwner.absoluteSide
            },
            arrowCount: 10,
            arrowDelay: 150,
            damage: this.PROJECTILE_DAMAGE,
            travelTime: this.PROJECTILE_TRAVEL_TIME
        });
    }

    // Handle death salvo on guest side
    async handleGuestDeathSalvo(data) {
        const { archerData, arrowCount, arrowDelay, damage, travelTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const archerLocalSide = (archerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀🏹 ${archerData.name} unleashes a final desperate volley as it dies!`, 
            'info'
        );

        // Start guest death salvo animation
        await this.createGuestDeathSalvo(archerData, arrowCount, arrowDelay, travelTime, myAbsoluteSide);
    }

    // Create death salvo on guest side
    async createGuestDeathSalvo(archerData, arrowCount, arrowDelay, travelTime, myAbsoluteSide) {
        const archerLocalSide = (archerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const archerElement = this.getArcherElement(
            archerLocalSide,
            archerData.position,
            archerData.creatureIndex
        );

        if (!archerElement) {
            console.warn('Skeleton Archer element not found on guest side for death salvo');
            return;
        }

        // Fire arrows in sequence like the host
        for (let i = 0; i < arrowCount; i++) {
            // Find a random target for this arrow (guest needs to replicate host's targeting)
            const target = this.findRandomTargetForGuest(archerLocalSide, myAbsoluteSide);
            
            if (!target) {
                continue;
            }

            const targetName = target.type === 'hero' ? target.heroName : target.creatureName;
            this.battleManager.addCombatLog(
                `🎯 Death arrow ${i + 1}/${arrowCount} seeks ${targetName}!`, 
                'warning'
            );

            // Fire this arrow (don't await - let them fly with staggered starts)
            this.fireGuestSalvoArrow(archerElement, target, i + 1, travelTime);
            
            // Delay before next arrow
            if (i < arrowCount - 1) {
                await this.battleManager.delay(arrowDelay);
            }
        }

        this.battleManager.addCombatLog(
            `💥 ${archerData.name}'s final salvo complete!`, 
            'info'
        );
    }

    // Fire a single salvo arrow on guest side
    async fireGuestSalvoArrow(archerElement, target, arrowNumber, travelTime) {
        const targetElement = this.findTargetElementForGuest(target);
        
        if (!targetElement) {
            return;
        }

        const projectile = this.createArrowProjectile(archerElement, targetElement);
        if (projectile) {
            this.activeProjectiles.add(projectile);
            
            // Calculate speed-adjusted travel time
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(travelTime);
            
            // Wait for projectile to reach target, then show impact
            await this.battleManager.delay(adjustedTravelTime);
            
            this.createImpactEffect(targetElement);
            this.removeProjectile(projectile);

            // Log damage (but don't apply - host handles that)
            this.battleManager.addCombatLog(
                `💥 Death arrow ${arrowNumber} strikes ${target.targetName} for ${this.PROJECTILE_DAMAGE} damage!`, 
                'warning'
            );
        }
    }

    // Find random target for guest (simplified targeting)
    findRandomTargetForGuest(archerLocalSide, myAbsoluteSide) {
        const targetSide = archerLocalSide === 'player' ? 'opponent' : 'player';
        const targetHeroes = targetSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Get all possible targets (heroes and their creatures)
        const allTargets = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = targetHeroes[position];
            if (hero && hero.alive) {
                // Add hero as target
                allTargets.push({
                    type: 'hero',
                    heroName: hero.name,
                    position: position,
                    targetName: hero.name
                });
                
                // Add living creatures as targets
                if (hero.creatures) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            allTargets.push({
                                type: 'creature',
                                creatureName: creature.name,
                                position: position,
                                creatureIndex: index,
                                targetName: creature.name
                            });
                        }
                    });
                }
            }
        });
        
        if (allTargets.length === 0) return null;
        
        // Return random target using deterministic randomness
        const randomIndex = this.battleManager.getRandomInt(0, allTargets.length - 1);
        return allTargets[randomIndex];
    }

    // Find target element for guest
    findTargetElementForGuest(target) {
        if (target.type === 'hero') {
            const heroElement = document.querySelector(
                `.${target.position === 'player' ? 'player' : 'opponent'}-slot.${target.position}-slot .battle-hero-card`
            );
            return heroElement || document.querySelector(
                `.${target.position === 'player' ? 'player' : 'opponent'}-slot.${target.position}-slot`
            );
        } else if (target.type === 'creature') {
            return document.querySelector(
                `.${target.position === 'player' ? 'player' : 'opponent'}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }
        return null;
    }

    // Get the DOM element for Skeleton Archer creature
    getArcherElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for a target (reused from Jiggles)
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

    // Create an arrow projectile that travels from archer to target
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
            projectile.className = 'skeleton-archer-arrow';
            
            // Calculate speed-adjusted travel time for CSS animation
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.PROJECTILE_TRAVEL_TIME);
            
            projectile.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: 30px;
                height: 4px;
                background: linear-gradient(90deg, 
                    #8B4513 0%, 
                    #CD853F 20%, 
                    #A0522D 80%, 
                    #654321 100%);
                transform-origin: 0 50%;
                transform: rotate(${angle}deg);
                z-index: 1500;
                pointer-events: none;
                border-radius: 2px;
                box-shadow: 
                    0 1px 3px rgba(0, 0, 0, 0.5),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
                animation: arrowFlight ${adjustedTravelTime}ms linear forwards;
                --target-x: ${deltaX}px;
                --target-y: ${deltaY}px;
                --angle: ${angle}deg;
            `;

            // Add arrowhead
            const arrowhead = document.createElement('div');
            arrowhead.className = 'arrow-head';
            arrowhead.style.cssText = `
                position: absolute;
                right: -8px;
                top: -4px;
                width: 0;
                height: 0;
                border-left: 12px solid #654321;
                border-top: 6px solid transparent;
                border-bottom: 6px solid transparent;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
            `;
            
            projectile.appendChild(arrowhead);

            // Add fletching
            const fletching = document.createElement('div');
            fletching.className = 'arrow-fletching';
            fletching.style.cssText = `
                position: absolute;
                left: -6px;
                top: -2px;
                width: 8px;
                height: 8px;
                background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
                clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
                opacity: 0.8;
            `;
            
            projectile.appendChild(fletching);
            
            document.body.appendChild(projectile);
            
            console.log(`Created arrow projectile: ${distance.toFixed(1)}px at ${angle.toFixed(1)}°, travel time: ${adjustedTravelTime}ms`);
            return projectile;
            
        } catch (error) {
            console.error('Error creating arrow projectile:', error);
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
        impact.className = 'arrow-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 40px;
            height: 40px;
            background: radial-gradient(circle, 
                rgba(255, 200, 0, 0.8) 0%, 
                rgba(255, 100, 0, 0.6) 50%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: arrowImpact 0.5s ease-out forwards;
        `;

        document.body.appendChild(impact);

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 500);
    }

    // Remove projectile with cleanup
    removeProjectile(projectile) {
        if (projectile && projectile.parentNode) {
            this.activeProjectiles.delete(projectile);
            projectile.remove();
        }
    }

    // Apply Skeleton Archer damage to target
    applyArcherDamage(target, attackingArcher = null) {
        const damage = this.PROJECTILE_DAMAGE;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'attack', // Skeleton Archer's arrow is a physical attack
                attacker: attackingArcher // ✅ Pass the attacking creature
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
                source: 'attack', // Skeleton Archer's arrow is a physical attack
                attacker: attackingArcher // ✅ Pass the attacking creature
            });
        }
    }

    // Send projectile attack data to guest for synchronization
    sendProjectileAttackUpdate(archerActor, target, position) {
        const attackerSide = archerActor.hero.side;
        
        this.battleManager.sendBattleUpdate('skeleton_archer_projectile_attack', {
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
            damage: this.PROJECTILE_DAMAGE,
            travelTime: this.PROJECTILE_TRAVEL_TIME
        });
    }

    // Handle Skeleton Archer projectile attack on guest side
    handleGuestProjectileAttack(data) {
        const { archerData, target, damage, travelTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const archerLocalSide = (archerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🏹 ${archerData.name} fires a deadly arrow!`, 
            archerLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestProjectile(archerData, target, travelTime, myAbsoluteSide);
    }

    // Create projectile on guest side
    async createGuestProjectile(archerData, targetData, travelTime, myAbsoluteSide) {
        const archerLocalSide = (archerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const archerElement = this.getArcherElement(
            archerLocalSide,
            archerData.position,
            archerData.creatureIndex
        );

        if (!archerElement) {
            console.warn('Skeleton Archer element not found on guest side');
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
                `🎯 ${targetName} is struck by the arrow for ${this.PROJECTILE_DAMAGE} damage!`, 
                targetLocalSide === 'player' ? 'error' : 'success'
            );
        } else {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        }
    }

    // Clean up all active projectiles (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeProjectiles.size} active Skeleton Archer projectiles`);
        
        this.activeProjectiles.forEach(projectile => {
            try {
                if (projectile && projectile.parentNode) {
                    projectile.remove();
                }
            } catch (error) {
                console.warn('Error removing projectile during cleanup:', error);
            }
        });
        
        this.activeProjectiles.clear();

        // Also remove any orphaned projectile elements
        try {
            const orphanedProjectiles = document.querySelectorAll('.skeleton-archer-arrow');
            orphanedProjectiles.forEach(projectile => {
                if (projectile.parentNode) {
                    projectile.remove();
                }
            });
            
            if (orphanedProjectiles.length > 0) {
                console.log(`Cleaned up ${orphanedProjectiles.length} orphaned Skeleton Archer projectiles`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned projectiles:', error);
        }
    }

    // Inject CSS styles for Skeleton Archer effects
    injectSkeletonArcherStyles() {
        if (document.getElementById('skeletonArcherCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'skeletonArcherCreatureStyles';
        style.textContent = `
            /* Skeleton Archer Arrow Projectile Styles */
            .skeleton-archer-arrow {
                border-radius: 2px;
                position: relative;
                overflow: visible;
            }

            .arrow-head {
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
            }

            .arrow-fletching {
                opacity: 0.8;
            }

            @keyframes arrowFlight {
                0% { 
                    transform: translate(0, 0) rotate(var(--angle, 0deg));
                    opacity: 1;
                }
                100% { 
                    transform: translate(var(--target-x), var(--target-y)) rotate(var(--angle, 0deg));
                    opacity: 0.8;
                }
            }

            @keyframes arrowImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
            }

            /* Enhanced creature glow when Skeleton Archer is preparing to shoot */
            .creature-icon.archer-aiming .creature-sprite {
                filter: brightness(1.6) drop-shadow(0 0 12px rgba(139, 69, 19, 0.8));
                animation: archerAimGlow 0.8s ease-in-out infinite alternate;
            }

            @keyframes archerAimGlow {
                0% { 
                    filter: brightness(1.6) drop-shadow(0 0 12px rgba(139, 69, 19, 0.8));
                }
                100% { 
                    filter: brightness(2.0) drop-shadow(0 0 20px rgba(205, 133, 63, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const SkeletonArcherHelpers = {
    // Check if any creature in a list is Skeleton Archer
    hasSkeletonArcherInList(creatures) {
        return creatures.some(creature => SkeletonArcherCreature.isSkeletonArcher(creature.name));
    },

    // Get all Skeleton Archer creatures from a list
    getSkeletonArcherFromList(creatures) {
        return creatures.filter(creature => SkeletonArcherCreature.isSkeletonArcher(creature.name));
    },

    // Add aiming visual effect to Skeleton Archer
    addAimingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('archer-aiming');
        }
    },

    // Remove aiming visual effect from Skeleton Archer
    removeAimingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('archer-aiming');
        }
    }
};

export default SkeletonArcherCreature;