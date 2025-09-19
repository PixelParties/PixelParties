// ./Creatures/blueIceDragon.js - Blue Ice Dragon Creature Frost Breath Module

export class BlueIceDragonCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeProjectiles = new Set(); // Track active projectiles for cleanup
        
        // Blue Ice Dragon stats
        this.FROZEN_DAMAGE = 300;
        this.FROZEN_STACKS_TO_APPLY = 1;
        this.MAX_TARGETS = 3;
        this.PROJECTILE_TRAVEL_TIME = 600; // 0.6 second flame travel time
        
        // Inject CSS styles
        this.injectBlueIceDragonStyles();
        
        console.log('❄️🐉 Blue Ice Dragon Creature module initialized');
    }

    // Check if a creature is Blue Ice Dragon
    static isBlueIceDragon(creatureName) {
        return creatureName === 'BlueIceDragon';
    }

    // Execute Blue Ice Dragon special attack with frost breath
    async executeSpecialAttack(dragonActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const dragonCreature = dragonActor.data;
        const dragonHero = dragonActor.hero;
        const attackerSide = dragonHero.side;
        
        // Safety check: ensure Blue Ice Dragon is still alive
        if (!dragonCreature.alive || dragonCreature.currentHp <= 0) {
            console.log(`Blue Ice Dragon is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `❄️🐉 ${dragonCreature.name} rears back and prepares to breathe frost!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find all possible enemy targets
        const enemyTargets = this.findAllEnemyTargets(attackerSide);
        
        if (enemyTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${dragonCreature.name} finds no targets for its frost breath!`, 
                'info'
            );
            return;
        }

        // Select random targets (up to MAX_TARGETS)
        const maxTargets = Math.min(this.MAX_TARGETS, enemyTargets.length);
        const selectedTargets = this.selectRandomTargets(enemyTargets, maxTargets);
        
        if (selectedTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${dragonCreature.name} cannot find valid targets for its frost breath!`, 
                'warning'
            );
            return;
        }
        
        this.battleManager.addCombatLog(
            `🌨️ ${dragonCreature.name} targets ${selectedTargets.length} enem${selectedTargets.length > 1 ? 'ies' : 'y'} with freezing breath!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE starting host animation
        this.sendFrostBreathAttackUpdate(dragonActor, selectedTargets, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute frost breath attack with visual effects
        await this.executeFrostBreathAttack(dragonActor, selectedTargets, position);
    }

    // Execute the frost breath attack with visual effects (host side)
    async executeFrostBreathAttack(dragonActor, targets, position) {
        const attackerSide = dragonActor.hero.side;
        const dragonElement = this.getDragonElement(attackerSide, position, dragonActor.index);
        
        if (!dragonElement) {
            console.error('Blue Ice Dragon element not found, cannot create frost projectiles');
            return;
        }
        
        // Create projectiles and determine effects for each target
        const projectileData = [];
        
        for (const target of targets) {
            const targetElement = this.getTargetElement(target);
            if (targetElement) {
                // Validate element is still in DOM and has valid position
                if (!document.body.contains(targetElement)) {
                    console.warn('Target element no longer in DOM:', target);
                    continue;
                }
                
                const rect = targetElement.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    console.warn('Target element has invalid dimensions:', target, rect);
                    continue;
                }

                // Check if target has frozen stacks
                const hasFrozenStacks = this.battleManager.statusEffectsManager && 
                    this.battleManager.statusEffectsManager.hasStatusEffect(target.data, 'frozen');
                
                // Create frost projectile
                const projectile = this.createFrostProjectile(dragonElement, targetElement);
                if (projectile) {
                    this.activeProjectiles.add(projectile);
                    projectileData.push({
                        target: target,
                        projectile: projectile,
                        hasFrozenStacks: hasFrozenStacks,
                        targetElement: targetElement
                    });
                } else {
                    console.warn(`Failed to create frost projectile to target:`, target);
                }
            } else {
                console.warn(`Target element not found for:`, target);
            }
        }

        if (projectileData.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${dragonActor.data.name}'s frost breath finds no valid targets!`, 
                'info'
            );
            return;
        }

        // Calculate speed-adjusted travel time
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.PROJECTILE_TRAVEL_TIME);
        
        // Wait for projectiles to reach targets
        await this.battleManager.delay(adjustedTravelTime);
        
        // Apply effects when projectiles hit
        for (const { target, projectile, hasFrozenStacks, targetElement } of projectileData) {
            // Create impact effect
            this.createImpactEffect(targetElement, hasFrozenStacks);
            
            // Apply appropriate effect based on frozen status
            if (hasFrozenStacks) {
                // Deal damage to already frozen targets
                this.applyFrostDamage(target, dragonActor.data);
                this.battleManager.addCombatLog(
                    `❄️💥 ${target.data.name} is already frozen and takes ${this.FROZEN_DAMAGE} frost damage!`,
                    target.side === 'player' ? 'error' : 'success'
                );
            } else {
                // Apply frozen status to unfrozen targets
                if (this.battleManager.statusEffectsManager) {
                    this.battleManager.statusEffectsManager.applyStatusEffect(
                        target.data, 
                        'frozen', 
                        this.FROZEN_STACKS_TO_APPLY
                    );
                }
                this.battleManager.addCombatLog(
                    `🧊 ${target.data.name} is frozen by the dragon's icy breath!`,
                    target.side === 'player' ? 'error' : 'success'
                );
            }
            
            // Clean up projectile
            this.removeProjectile(projectile);
        }

        this.battleManager.addCombatLog(
            `🌨️ ${dragonActor.data.name}'s frost breath dissipates into the air!`, 
            'info'
        );
    }

    // Find all valid enemy targets (heroes and creatures)
    findAllEnemyTargets(attackerSide) {
        const enemySide = attackerSide === 'player' ? 'opponent' : 'player';
        const enemyHeroes = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        const targets = [];

        // Scan all enemy positions for targets
        for (const position of ['left', 'center', 'right']) {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                // Add living creatures first (they are priority targets)
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive && creature.currentHp > 0) {
                            // Double-check that the creature element exists
                            const creatureElement = document.querySelector(
                                `.${enemySide}-slot.${position}-slot .creature-icon[data-creature-index="${index}"]`
                            );
                            if (creatureElement) {
                                targets.push({
                                    type: 'creature',
                                    hero: hero,
                                    creature: creature,
                                    data: creature, // Reference for status effects
                                    creatureIndex: index,
                                    position: position,
                                    side: enemySide,
                                    priority: 'high' // Creatures have higher priority
                                });
                            }
                        }
                    });
                }
                
                // Add the hero itself if alive and element exists
                const heroElement = document.querySelector(`.${enemySide}-slot.${position}-slot .battle-hero-card`);
                if (heroElement && hero.currentHp > 0) {
                    targets.push({
                        type: 'hero',
                        hero: hero,
                        data: hero, // Reference for status effects
                        position: position,
                        side: enemySide,
                        priority: 'normal'
                    });
                }
            }
        }

        console.log(`Blue Ice Dragon found ${targets.length} valid targets:`, targets.map(t => `${t.type}:${t.hero?.name || t.creature?.name}`));
        return targets;
    }

    // Select random targets with weighted selection
    selectRandomTargets(availableTargets, maxTargets) {
        // Separate high priority (creatures) and normal priority (heroes)
        const highPriority = availableTargets.filter(t => t.priority === 'high');
        const normalPriority = availableTargets.filter(t => t.priority === 'normal');
        
        const selected = [];
        
        // First, try to select from high priority targets
        if (highPriority.length > 0) {
            const shuffledHigh = this.battleManager.shuffleArray(highPriority);
            selected.push(...shuffledHigh.slice(0, maxTargets));
        }
        
        // Fill remaining slots with normal priority targets
        if (selected.length < maxTargets && normalPriority.length > 0) {
            const shuffledNormal = this.battleManager.shuffleArray(normalPriority);
            const remaining = maxTargets - selected.length;
            selected.push(...shuffledNormal.slice(0, remaining));
        }
        
        // If we still don't have enough, just take any remaining targets
        if (selected.length < maxTargets) {
            const remaining = availableTargets.filter(t => !selected.includes(t));
            const shuffledRemaining = this.battleManager.shuffleArray(remaining);
            selected.push(...shuffledRemaining.slice(0, maxTargets - selected.length));
        }

        return selected.slice(0, maxTargets);
    }

    // Apply frost damage to already frozen targets
    applyFrostDamage(target, attackingDragon = null) {
        const damage = this.FROZEN_DAMAGE;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'spell', // Dragon's frost breath is magical
                attacker: attackingDragon
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
                source: 'spell', // Dragon's frost breath is magical
                attacker: attackingDragon
            });
        }
    }

    // Get the DOM element for Blue Ice Dragon creature
    getDragonElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for a target
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

    // Create a frost projectile that travels from dragon to target
    createFrostProjectile(fromElement, toElement) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create frost projectile: missing elements', { fromElement: !!fromElement, toElement: !!toElement });
            return null;
        }

        // Additional validation: ensure elements are still in DOM
        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            console.warn('Cannot create frost projectile: elements not in DOM');
            return null;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            // Validate that elements have valid dimensions
            if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
                console.warn('Cannot create frost projectile: elements have invalid dimensions');
                return null;
            }

            // Calculate center positions
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid frost projectile coordinates detected:', { fromX, fromY, toX, toY });
                return null;
            }

            // Calculate projectile properties
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Prevent projectiles that are too short or too long (likely errors)
            if (distance < 10 || distance > 2000) {
                console.warn(`Invalid frost projectile distance: ${distance}px`);
                return null;
            }
            
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

            // Create the frost flame projectile element
            const projectile = document.createElement('div');
            projectile.className = 'blue-ice-dragon-frost-flame';
            
            // Calculate speed-adjusted travel time for CSS animation
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.PROJECTILE_TRAVEL_TIME);
            
            projectile.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: 40px;
                height: 25px;
                background: radial-gradient(ellipse at center, 
                    rgba(135, 206, 250, 1) 0%, 
                    rgba(70, 130, 180, 0.9) 30%, 
                    rgba(25, 25, 112, 0.8) 60%, 
                    rgba(0, 0, 139, 0.6) 100%);
                transform-origin: 0 50%;
                transform: rotate(${angle}deg);
                z-index: 1500;
                pointer-events: none;
                border-radius: 50%;
                box-shadow: 
                    0 0 15px rgba(135, 206, 250, 0.8),
                    0 0 30px rgba(70, 130, 180, 0.6),
                    inset 0 2px 5px rgba(255, 255, 255, 0.4);
                animation: frostFlameTravel ${adjustedTravelTime}ms linear forwards;
                --target-x: ${deltaX}px;
                --target-y: ${deltaY}px;
                --angle: ${angle}deg;
            `;

            // Add frost trail effect
            const frostTrail = document.createElement('div');
            frostTrail.className = 'frost-flame-trail';
            frostTrail.style.cssText = `
                position: absolute;
                left: -10px;
                top: -5px;
                width: 20px;
                height: 35px;
                background: linear-gradient(90deg, 
                    rgba(173, 216, 230, 0.6) 0%,
                    rgba(135, 206, 250, 0.4) 50%,
                    transparent 100%);
                border-radius: 50%;
                animation: frostTrailFlicker 0.2s ease-in-out infinite alternate;
            `;
            
            projectile.appendChild(frostTrail);

            // Add frost core
            const frostCore = document.createElement('div');
            frostCore.className = 'frost-flame-core';
            frostCore.style.cssText = `
                position: absolute;
                left: 10px;
                top: 7px;
                width: 20px;
                height: 11px;
                background: radial-gradient(circle, 
                    rgba(255, 255, 255, 1) 0%,
                    rgba(173, 216, 230, 0.9) 40%,
                    rgba(135, 206, 250, 0.7) 100%);
                border-radius: 50%;
                animation: frostCoreGlow 0.3s ease-in-out infinite alternate;
            `;
            
            projectile.appendChild(frostCore);
            
            document.body.appendChild(projectile);
            
            console.log(`Created frost flame projectile: ${distance.toFixed(1)}px at ${angle.toFixed(1)}°, travel time: ${adjustedTravelTime}ms`);
            return projectile;
            
        } catch (error) {
            console.error('Error creating frost flame projectile:', error);
            return null;
        }
    }

    // Create impact effect at target location
    createImpactEffect(targetElement, wasFrozen) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const impact = document.createElement('div');
        impact.className = 'blue-ice-dragon-impact-effect';
        
        // Different effects based on whether target was already frozen
        if (wasFrozen) {
            // Damage effect for already frozen targets
            impact.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: 60px;
                height: 60px;
                background: radial-gradient(circle, 
                    rgba(255, 0, 0, 0.9) 0%, 
                    rgba(255, 100, 100, 0.7) 30%, 
                    rgba(135, 206, 250, 0.5) 70%, 
                    transparent 100%);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                z-index: 1600;
                pointer-events: none;
                animation: frostDamageImpact 0.8s ease-out forwards;
                box-shadow: 0 0 20px rgba(255, 100, 100, 0.8), 0 0 40px rgba(135, 206, 250, 0.6);
            `;
        } else {
            // Freezing effect for unfrozen targets
            impact.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: 50px;
                height: 50px;
                background: radial-gradient(circle, 
                    rgba(173, 216, 230, 0.9) 0%, 
                    rgba(135, 206, 250, 0.7) 40%, 
                    rgba(70, 130, 180, 0.5) 70%, 
                    transparent 100%);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                z-index: 1600;
                pointer-events: none;
                animation: frostFreezeImpact 0.7s ease-out forwards;
                box-shadow: 0 0 15px rgba(135, 206, 250, 0.8);
            `;
        }

        document.body.appendChild(impact);

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, wasFrozen ? 800 : 700);
    }

    // Remove projectile with cleanup
    removeProjectile(projectile) {
        if (projectile && projectile.parentNode) {
            this.activeProjectiles.delete(projectile);
            projectile.remove();
        }
    }

    // Send frost breath attack data to guest for synchronization
    sendFrostBreathAttackUpdate(dragonActor, targets, position) {
        const attackerSide = dragonActor.hero.side;
        
        this.battleManager.sendBattleUpdate('blue_ice_dragon_frost_breath', {
            dragonData: {
                side: attackerSide,
                position: position,
                creatureIndex: dragonActor.index,
                name: dragonActor.data.name,
                absoluteSide: dragonActor.hero.absoluteSide
            },
            targets: targets.map(target => ({
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null,
                hasFrozenStacks: this.battleManager.statusEffectsManager && 
                    this.battleManager.statusEffectsManager.hasStatusEffect(target.data, 'frozen')
            })),
            frozenDamage: this.FROZEN_DAMAGE,
            frozenStacks: this.FROZEN_STACKS_TO_APPLY,
            travelTime: this.PROJECTILE_TRAVEL_TIME
        });
    }

    // Handle frost breath attack on guest side
    handleGuestFrostBreathAttack(data) {
        const { dragonData, targets, frozenDamage, frozenStacks, travelTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const dragonLocalSide = (dragonData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `❄️🐉 ${dragonData.name} unleashes freezing breath!`, 
            dragonLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestFrostBreath(dragonData, targets, travelTime, myAbsoluteSide);
    }

    // Create frost breath on guest side
    async createGuestFrostBreath(dragonData, targets, travelTime, myAbsoluteSide) {
        const dragonLocalSide = (dragonData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const dragonElement = this.getDragonElement(
            dragonLocalSide,
            dragonData.position,
            dragonData.creatureIndex
        );

        if (!dragonElement) {
            console.warn('Blue Ice Dragon element not found on guest side');
            return;
        }

        const projectiles = [];

        for (const targetData of targets) {
            // Use absoluteSide instead of relative side
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
                const projectile = this.createFrostProjectile(dragonElement, targetElement);
                if (projectile) {
                    this.activeProjectiles.add(projectile);
                    projectiles.push({
                        projectile: projectile,
                        targetElement: targetElement,
                        targetData: targetData
                    });
                }
            } else {
                console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
            }
        }

        console.log(`❄️🐉 Guest created ${projectiles.length} frost projectiles`);

        // Calculate speed-adjusted travel time
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(travelTime);
        
        // Wait for projectiles to reach targets, then show impacts
        await this.battleManager.delay(adjustedTravelTime);
        
        // Create impact effects and log results
        for (const { projectile, targetElement, targetData } of projectiles) {
            this.createImpactEffect(targetElement, targetData.hasFrozenStacks);
            this.removeProjectile(projectile);

            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            
            if (targetData.hasFrozenStacks) {
                this.battleManager.addCombatLog(
                    `❄️💥 ${targetName} takes ${this.FROZEN_DAMAGE} frost damage from being frozen!`, 
                    targetLocalSide === 'player' ? 'error' : 'success'
                );
            } else {
                this.battleManager.addCombatLog(
                    `🧊 ${targetName} is frozen by the dragon's breath!`, 
                    targetLocalSide === 'player' ? 'error' : 'success'
                );
            }
        }
        
        this.battleManager.addCombatLog(`🌨️ The frost breath dissipates!`, 'info');
    }

    // Clean up all active projectiles (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeProjectiles.size} active Blue Ice Dragon projectiles`);
        
        this.activeProjectiles.forEach(projectile => {
            try {
                if (projectile && projectile.parentNode) {
                    projectile.remove();
                }
            } catch (error) {
                console.warn('Error removing frost projectile during cleanup:', error);
            }
        });
        
        this.activeProjectiles.clear();

        // Also remove any orphaned projectile elements
        try {
            const orphanedProjectiles = document.querySelectorAll('.blue-ice-dragon-frost-flame');
            orphanedProjectiles.forEach(projectile => {
                if (projectile.parentNode) {
                    projectile.remove();
                }
            });
            
            if (orphanedProjectiles.length > 0) {
                console.log(`Cleaned up ${orphanedProjectiles.length} orphaned Blue Ice Dragon projectiles`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned frost projectiles:', error);
        }
    }

    // Inject CSS styles for Blue Ice Dragon effects
    injectBlueIceDragonStyles() {
        if (document.getElementById('blueIceDragonCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'blueIceDragonCreatureStyles';
        style.textContent = `
            /* Blue Ice Dragon Frost Projectile Styles */
            .blue-ice-dragon-frost-flame {
                border-radius: 50%;
                position: relative;
                overflow: visible;
            }

            .frost-flame-trail {
                opacity: 0.6;
            }

            .frost-flame-core {
                opacity: 0.9;
            }

            @keyframes frostFlameTravel {
                0% { 
                    transform: translate(0, 0) rotate(var(--angle, 0deg));
                    opacity: 1;
                }
                100% { 
                    transform: translate(var(--target-x), var(--target-y)) rotate(var(--angle, 0deg));
                    opacity: 0.9;
                }
            }

            @keyframes frostTrailFlicker {
                0% { 
                    opacity: 0.4;
                    transform: scaleY(0.8);
                }
                100% { 
                    opacity: 0.7;
                    transform: scaleY(1.2);
                }
            }

            @keyframes frostCoreGlow {
                0% { 
                    opacity: 0.8;
                    transform: scale(0.9);
                }
                100% { 
                    opacity: 1;
                    transform: scale(1.1);
                }
            }

            @keyframes frostDamageImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.3);
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
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }

            @keyframes frostFreezeImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.4);
                }
                40% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.3);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.6);
                }
            }

            /* Enhanced creature glow when Blue Ice Dragon is preparing attack */
            .creature-icon.blue-ice-dragon-breathing .creature-sprite {
                filter: brightness(1.6) drop-shadow(0 0 15px rgba(135, 206, 250, 0.9));
                animation: dragonBreathGlow 0.7s ease-in-out infinite alternate;
            }

            @keyframes dragonBreathGlow {
                0% { 
                    filter: brightness(1.6) drop-shadow(0 0 15px rgba(135, 206, 250, 0.9));
                }
                100% { 
                    filter: brightness(2.0) drop-shadow(0 0 25px rgba(173, 216, 230, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const BlueIceDragonHelpers = {
    // Check if any creature in a list is Blue Ice Dragon
    hasBlueIceDragonInList(creatures) {
        return creatures.some(creature => BlueIceDragonCreature.isBlueIceDragon(creature.name));
    },

    // Get all Blue Ice Dragon creatures from a list
    getBlueIceDragonFromList(creatures) {
        return creatures.filter(creature => BlueIceDragonCreature.isBlueIceDragon(creature.name));
    },

    // Add breathing effect to Blue Ice Dragon
    addBreathingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('blue-ice-dragon-breathing');
        }
    },

    // Remove breathing effect from Blue Ice Dragon
    removeBreathingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('blue-ice-dragon-breathing');
        }
    }
};

export default BlueIceDragonCreature;