// ./Creatures/burningSkeleton.js - Burning Skeleton Creature Fire Slash Attack Module

export class BurningSkeletonCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeSlashEffects = new Set(); // Track active slash effects for cleanup
        
        // Burning Skeleton stats
        this.SLASH_DAMAGE = 30;
        this.SLASH_ANIMATION_TIME = 800; // 0.8 second slash animation
        this.BURNED_STACKS = 1;
        
        // Inject CSS styles
        this.injectBurningSkeletonStyles();
    }

    // Check if a creature is Burning Skeleton
    static isBurningSkeleton(creatureName) {
        return creatureName === 'BurningSkeleton';
    }

    // Execute Burning Skeleton special attack with fire slash
    async executeSpecialAttack(burningSkeletonActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const burningSkeletonCreature = burningSkeletonActor.data;
        const burningSkeletonHero = burningSkeletonActor.hero;
        const attackerSide = burningSkeletonHero.side;
        
        // Safety check: ensure Burning Skeleton is still alive
        if (!burningSkeletonCreature.alive || burningSkeletonCreature.currentHp <= 0) {
            return;
        }
        
        // Use standard targeting system (same as normal hero attacks)
        const target = this.battleManager.combatManager.authoritative_findTargetWithCreatures(
            position, 
            attackerSide
        );
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${burningSkeletonCreature.name} finds no targets for its fire slash!`, 
                'info',
                null,
                { 
                    isCreatureMessage: true,
                    isCreatureDeathMessage: false
                }
            );
            return;
        }
        
        // Log target acquisition
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `🎯 ${burningSkeletonCreature.name} targets ${targetName} with a blazing slash!`, 
            attackerSide === 'player' ? 'success' : 'error',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );

        // Send synchronization data to guest BEFORE starting host animation
        this.sendFireSlashUpdate(burningSkeletonActor, target, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute fire slash attack with visual effects
        await this.executeFireSlashAttack(burningSkeletonActor, target, position);
    }

    // Execute the fire slash attack with visual effects (host side)
    async executeFireSlashAttack(burningSkeletonActor, target, position) {
        const attackerSide = burningSkeletonActor.hero.side;
        const burningSkeletonElement = this.getBurningSkeletonElement(attackerSide, position, burningSkeletonActor.index);
        const targetElement = this.getTargetElement(target);
        
        if (!burningSkeletonElement) {
            console.error('Burning Skeleton element not found, cannot create slash');
            return;
        }

        if (!targetElement) {
            console.error('Target element not found, cannot create slash');
            return;
        }
        
        // Create and execute fire slash animation
        const slashEffect = this.createFireSlashEffect(burningSkeletonElement, targetElement);
        if (!slashEffect) {
            console.error('Failed to create fire slash effect');
            return;
        }

        this.activeSlashEffects.add(slashEffect);

        // Calculate speed-adjusted animation time
        const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.SLASH_ANIMATION_TIME);
        
        // Wait for slash to appear (much shorter delay since slash appears at target instantly)
        await this.battleManager.delay(adjustedAnimationTime * 0.2); // 20% of animation time
        
        // Apply damage when slash hits (only host applies actual damage)
        this.applyFireSlashDamage(target, burningSkeletonActor.data); // ✅ Pass the creature
        
        // Apply burned status effect
        this.applyFireSlashBurn(target);
        
        // Add impact effect
        this.createFireImpactEffect(targetElement);
        
        // Wait for the rest of the slash animation to complete
        await this.battleManager.delay(adjustedAnimationTime * 0.8);
        
        // Clean up slash effect
        this.removeSlashEffect(slashEffect);

        this.battleManager.addCombatLog(
            `💥 The blazing slash appears and strikes true, dealing ${this.SLASH_DAMAGE} damage and setting the target ablaze!`, 
            'info',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );
    }

    // Get the DOM element for Burning Skeleton creature
    getBurningSkeletonElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for a target (reused from SkeletonDeathKnight)
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

    // Create fiery orange/red slash effect
    createFireSlashEffect(fromElement, toElement) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create slash effect: missing elements', { fromElement: !!fromElement, toElement: !!toElement });
            return null;
        }

        // Additional validation: ensure elements are still in DOM
        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            console.warn('Cannot create slash effect: elements not in DOM');
            return null;
        }

        try {
            const toRect = toElement.getBoundingClientRect();

            // Validate that target element has valid dimensions
            if (toRect.width === 0 || toRect.height === 0) {
                console.warn('Cannot create slash effect: target element has invalid dimensions');
                return null;
            }

            // Calculate target center position
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid slash coordinates detected:', { toX, toY });
                return null;
            }

            // Random diagonal angle for slash variety (between -30 to 30 degrees from diagonal)
            const baseAngle = 45; // Base diagonal slash
            const angleVariation = (Math.random() - 0.5) * 60; // ±30 degrees
            const slashAngle = baseAngle + angleVariation;

            // Create the fire slash effect element at target location
            const slashEffect = document.createElement('div');
            slashEffect.className = 'burning-skeleton-slash';
            
            // Calculate speed-adjusted animation time for CSS
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.SLASH_ANIMATION_TIME);
            
            slashEffect.style.cssText = `
                position: fixed;
                left: ${toX}px;
                top: ${toY}px;
                width: 80px;
                height: 8px;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255, 140, 0, 0.9) 20%, 
                    rgba(255, 69, 0, 1) 50%, 
                    rgba(255, 140, 0, 0.9) 80%, 
                    transparent 100%);
                transform-origin: 50% 50%;
                transform: translate(-50%, -50%) rotate(${slashAngle}deg);
                z-index: 1500;
                pointer-events: none;
                border-radius: 4px;
                box-shadow: 
                    0 0 15px rgba(255, 69, 0, 0.8),
                    0 0 30px rgba(255, 140, 0, 0.6),
                    inset 0 2px 0 rgba(255, 255, 255, 0.3);
                animation: fireSlashStrike ${adjustedAnimationTime}ms ease-out forwards;
                --slash-angle: ${slashAngle}deg;
            `;

            // Add fire energy effects
            const fireEnergyTrail = document.createElement('div');
            fireEnergyTrail.className = 'fire-energy-trail';
            fireEnergyTrail.style.cssText = `
                position: absolute;
                top: -4px;
                left: 0;
                right: 0;
                height: 16px;
                background: radial-gradient(ellipse, 
                    rgba(255, 69, 0, 0.6) 0%, 
                    rgba(255, 140, 0, 0.4) 50%, 
                    transparent 100%);
                border-radius: 8px;
                animation: fireEnergyPulse ${adjustedAnimationTime}ms ease-in-out infinite;
            `;
            
            slashEffect.appendChild(fireEnergyTrail);

            // Add slash blade highlight
            const bladeHighlight = document.createElement('div');
            bladeHighlight.className = 'slash-blade-highlight';
            bladeHighlight.style.cssText = `
                position: absolute;
                top: 2px;
                left: 10%;
                width: 80%;
                height: 4px;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255, 255, 255, 0.8) 30%, 
                    rgba(255, 255, 255, 1) 50%, 
                    rgba(255, 255, 255, 0.8) 70%, 
                    transparent 100%);
                border-radius: 2px;
                animation: bladeFlash ${adjustedAnimationTime * 0.3}ms ease-out;
            `;
            
            slashEffect.appendChild(bladeHighlight);
            
            document.body.appendChild(slashEffect);
            
            return slashEffect;
            
        } catch (error) {
            console.error('Error creating fire slash effect:', error);
            return null;
        }
    }

    // Create fire impact effect at target location
    createFireImpactEffect(targetElement) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Create prominent slash mark on target
        this.createTargetSlashMark(targetElement, centerX, centerY);

        const impact = document.createElement('div');
        impact.className = 'fire-slash-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, 
                rgba(255, 69, 0, 0.9) 0%, 
                rgba(255, 140, 0, 0.7) 40%, 
                rgba(255, 215, 0, 0.5) 70%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: fireSlashImpact 0.6s ease-out forwards;
            box-shadow: 
                0 0 20px rgba(255, 69, 0, 0.8),
                0 0 40px rgba(255, 140, 0, 0.6);
        `;

        // Add impact particles
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'fire-impact-particle';
            const angle = (i * 30) * (Math.PI / 180);
            const distance = 35 + Math.random() * 25;
            const particleX = Math.cos(angle) * distance;
            const particleY = Math.sin(angle) * distance;
            
            particle.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                width: 5px;
                height: 5px;
                background: rgba(255, 69, 0, 0.9);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: fireParticleExplosion 0.8s ease-out forwards;
                --particle-x: ${particleX}px;
                --particle-y: ${particleY}px;
                box-shadow: 0 0 8px rgba(255, 69, 0, 0.8);
            `;
            
            impact.appendChild(particle);
        }

        document.body.appendChild(impact);

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 800);
    }

    // Create prominent fiery slash mark on the target
    createTargetSlashMark(targetElement, centerX, centerY) {
        if (!targetElement) return;

        // Create main slash mark
        const slashMark = document.createElement('div');
        slashMark.className = 'target-slash-mark';
        
        // Random diagonal angle for variety (between -30 to 30 degrees from diagonal)
        const baseAngle = 45; // Base diagonal slash
        const angleVariation = (Math.random() - 0.5) * 60; // ±30 degrees
        const slashAngle = baseAngle + angleVariation;
        
        slashMark.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 80px;
            height: 6px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.9) 5%, 
                rgba(255, 69, 0, 1) 50%, 
                rgba(255, 255, 255, 0.9) 95%, 
                transparent 100%);
            transform: translate(-50%, -50%) rotate(${slashAngle}deg);
            z-index: 1650;
            pointer-events: none;
            border-radius: 3px;
            box-shadow: 
                0 0 15px rgba(255, 69, 0, 1),
                0 0 30px rgba(255, 140, 0, 0.8),
                inset 0 1px 0 rgba(255, 255, 255, 0.6),
                inset 0 -1px 0 rgba(0, 0, 0, 0.4);
            animation: targetSlashAppear 0.4s ease-out forwards;
            --slash-angle: ${slashAngle}deg;
        `;

        // Add slash glow effect
        const slashGlow = document.createElement('div');
        slashGlow.className = 'target-slash-glow';
        slashGlow.style.cssText = `
            position: absolute;
            left: -10px;
            top: -8px;
            width: 100px;
            height: 22px;
            background: radial-gradient(ellipse, 
                rgba(255, 69, 0, 0.6) 0%, 
                rgba(255, 140, 0, 0.4) 50%, 
                transparent 100%);
            border-radius: 50%;
            animation: targetSlashGlow 0.4s ease-out forwards;
        `;
        
        slashMark.appendChild(slashGlow);

        // Add secondary cross slash for more dramatic effect
        const crossSlash = document.createElement('div');
        crossSlash.className = 'target-cross-slash';
        crossSlash.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 80px;
            height: 4px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.7) 10%, 
                rgba(255, 69, 0, 0.8) 50%, 
                rgba(255, 255, 255, 0.7) 90%, 
                transparent 100%);
            transform: rotate(90deg);
            transform-origin: 50% 50%;
            border-radius: 2px;
            animation: targetCrossSlashAppear 0.5s ease-out 0.1s forwards;
            opacity: 0;
            box-shadow: 0 0 10px rgba(255, 69, 0, 0.8);
        `;
        
        slashMark.appendChild(crossSlash);

        document.body.appendChild(slashMark);

        // Remove slash mark after animation
        setTimeout(() => {
            if (slashMark.parentNode) {
                slashMark.remove();
            }
        }, 1000);
    }

    // Remove slash effect with cleanup
    removeSlashEffect(slashEffect) {
        if (slashEffect && slashEffect.parentNode) {
            this.activeSlashEffects.delete(slashEffect);
            slashEffect.remove();
        }
    }

    // Apply Burning Skeleton damage to target - ✅ FIXED: Now accepts attacking creature
    applyFireSlashDamage(target, attackingBurningSkeleton = null) {
        const damage = this.SLASH_DAMAGE;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'spell', // Burning Skeleton's fire slash is magical
                attacker: attackingBurningSkeleton // ✅ Pass the attacking creature
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
                source: 'spell', // Burning Skeleton's fire slash is magical
                attacker: attackingBurningSkeleton // ✅ Pass the attacking creature
            });
        }
    }

    // Apply burned status effect to target
    applyFireSlashBurn(target) {
        if (!this.battleManager.statusEffectsManager) return;

        const targetData = target.type === 'creature' ? target.creature : target.hero;
        
        // Apply 1 stack of Burned
        const success = this.battleManager.statusEffectsManager.applyStatusEffect(
            targetData, 
            'burned', 
            this.BURNED_STACKS
        );

        if (success) {
            const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
            this.battleManager.addCombatLog(
                `🔥 ${targetName} is set ablaze by the burning magic!`,
                target.side === 'player' ? 'error' : 'success'
            );
        }
    }

    // Send fire slash attack data to guest for synchronization
    sendFireSlashUpdate(burningSkeletonActor, target, position) {
        const attackerSide = burningSkeletonActor.hero.side;
        
        this.battleManager.sendBattleUpdate('burning_skeleton_fire_slash', {
            burningSkeletonData: {
                side: attackerSide,
                position: position,
                creatureIndex: burningSkeletonActor.index,
                name: burningSkeletonActor.data.name,
                absoluteSide: burningSkeletonActor.hero.absoluteSide
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
            damage: this.SLASH_DAMAGE,
            burnedStacks: this.BURNED_STACKS,
            animationTime: this.SLASH_ANIMATION_TIME
        });
    }

    // Handle Burning Skeleton fire slash on guest side
    handleGuestFireSlash(data) {
        const { burningSkeletonData, target, damage, burnedStacks, animationTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const burningSkeletonLocalSide = (burningSkeletonData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🔥 ${burningSkeletonData.name} unleashes a blazing slash!`, 
            burningSkeletonLocalSide === 'player' ? 'success' : 'error',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );

        // Start guest animation immediately
        this.createGuestFireSlash(burningSkeletonData, target, animationTime, myAbsoluteSide);
    }

    // Create fire slash on guest side
    async createGuestFireSlash(burningSkeletonData, targetData, animationTime, myAbsoluteSide) {
        const burningSkeletonLocalSide = (burningSkeletonData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const burningSkeletonElement = this.getBurningSkeletonElement(
            burningSkeletonLocalSide,
            burningSkeletonData.position,
            burningSkeletonData.creatureIndex
        );

        if (!burningSkeletonElement) {
            console.warn('Burning Skeleton element not found on guest side');
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
            const slashEffect = this.createFireSlashEffect(burningSkeletonElement, targetElement);
            if (slashEffect) {
                this.activeSlashEffects.add(slashEffect);
            }

            // Calculate speed-adjusted animation time
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(animationTime);
            
            // Wait for slash to appear, then show impact
            await this.battleManager.delay(adjustedAnimationTime * 0.2);
            
            this.createFireImpactEffect(targetElement);
            
            // Wait for the rest of the animation
            await this.battleManager.delay(adjustedAnimationTime * 0.8);
            
            this.removeSlashEffect(slashEffect);

            // Log damage for target (but don't apply actual damage - host handles that)
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            this.battleManager.addCombatLog(
                `🎯 ${targetName} is struck by the blazing slash for ${this.SLASH_DAMAGE} damage and set ablaze!`,
                targetLocalSide === 'player' ? 'error' : 'success'
            );
        } else {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        }
    }

    // ============================================
    // DEATH FLAME STORM EFFECT
    // ============================================

    // Execute death flame storm when Burning Skeleton dies (slash all enemies simultaneously)
    async executeDeathFlameStorm(dyingBurningSkeleton, heroOwner, position, side) {
        if (!this.battleManager.isAuthoritative) return;

        const burningSkeletonCreature = dyingBurningSkeleton;
        const burningSkeletonSide = side;
        
        this.battleManager.addCombatLog(
            `💀🔥 ${burningSkeletonCreature.name} erupts in a final blazing inferno as it dies!`, 
            burningSkeletonSide === 'player' ? 'info' : 'info',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );

        // Find all enemy targets
        const allEnemyTargets = this.findAllEnemyTargets(burningSkeletonSide);
        
        if (allEnemyTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${burningSkeletonCreature.name}'s death flame storm finds no enemies!`, 
                'info',
                null,
                { 
                    isCreatureMessage: true,
                    isCreatureDeathMessage: false
                }
            );
            return;
        }

        this.battleManager.addCombatLog(
            `🎯 Death flame storm targets ${allEnemyTargets.length} enemies simultaneously!`, 
            'warning',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );

        // Send death flame storm data to guest for synchronization
        this.sendDeathFlameStormUpdate(burningSkeletonCreature, heroOwner, position, burningSkeletonSide, allEnemyTargets);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(100);

        // Execute the death flame storm
        await this.executeDeathFlameStormAttack(burningSkeletonCreature, heroOwner, position, burningSkeletonSide, allEnemyTargets);
    }

    // Find all enemy targets (heroes and creatures)
    findAllEnemyTargets(attackerSide) {
        const targets = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        const allTargets = [];
        
        Object.keys(targets).forEach(position => {
            const hero = targets[position];
            if (hero && hero.alive) {
                // Add hero as target
                allTargets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: attackerSide === 'player' ? 'opponent' : 'player'
                });
                
                // Add living creatures as targets
                if (hero.creatures) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            allTargets.push({
                                type: 'creature',
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: attackerSide === 'player' ? 'opponent' : 'player'
                            });
                        }
                    });
                }
            }
        });
        
        return allTargets;
    }

    // Execute the death flame storm attack (simultaneous slashes to all enemies)
    async executeDeathFlameStormAttack(burningSkeletonCreature, heroOwner, position, burningSkeletonSide, allTargets) {
        // Get the burning skeleton element (even though it's dead, we need it for slash origins)
        const burningSkeletonElement = this.getBurningSkeletonElement(
            burningSkeletonSide, 
            position, 
            heroOwner.creatures.indexOf(burningSkeletonCreature)
        );
        
        if (!burningSkeletonElement) {
            console.error('Burning Skeleton element not found for death flame storm');
            return;
        }

        // Create simultaneous slash effects to all targets
        const slashPromises = [];
        
        allTargets.forEach((target, index) => {
            const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
            
            // Create slash effect and pass the attacking creature - FIXED
            slashPromises.push(this.executeDeathFlame(burningSkeletonElement, target, index, burningSkeletonCreature));
        });

        // Wait for all slashes to complete
        await Promise.all(slashPromises);

        // Count burned targets (in case resistance is added later)
        let burnedCount = 0;
        
        allTargets.forEach(target => {
            // For now, assume all targets are burned since there's no resistance check
            // This makes the code future-proof if resistance is added later
            if (target.type === 'hero' && target.hero.alive) {
                burnedCount++;
            } else if (target.type === 'creature' && target.creature.alive) {
                burnedCount++;
            }
        });

        // Add single consolidated log message
        if (burnedCount > 0) {
            this.battleManager.addCombatLog(
                `🔥💀 The Burning Skeleton's final flame Burns ${burnedCount} target${burnedCount > 1 ? 's' : ''}!`, 
                'warning',
                null,
                { 
                    isCreatureMessage: true,
                    isCreatureDeathMessage: false
                }
            );
        }

        // Send consolidated update to guest
        this.sendDeathFlameStormLogUpdate(burningSkeletonCreature, burnedCount);
    }

    // Execute a single death flame - ✅ FIXED: Now accepts attacking creature
    async executeDeathFlame(burningSkeletonElement, target, slashIndex, attackingBurningSkeleton) {
        const targetElement = this.getTargetElement(target);
        
        if (!targetElement) {
            console.error(`Target element not found for death flame ${slashIndex + 1}`);
            return;
        }
        
        // Create and execute fire slash animation
        const slashEffect = this.createFireSlashEffect(burningSkeletonElement, targetElement);
        if (!slashEffect) {
            console.error(`Failed to create death flame ${slashIndex + 1}`);
            return;
        }

        this.activeSlashEffects.add(slashEffect);

        // Calculate speed-adjusted animation time
        const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.SLASH_ANIMATION_TIME);
        
        // Wait for slash to appear
        await this.battleManager.delay(adjustedAnimationTime * 0.2);
        
        // Apply damage when slash hits and pass the attacking creature - FIXED: Use attackingBurningSkeleton
        this.applyFireSlashDamage(target, attackingBurningSkeleton);
        
        // Apply burned status effect
        this.applyFireSlashBurn(target);
        
        // Add impact effect
        this.createFireImpactEffect(targetElement);
        
        // Wait for the rest of the animation
        await this.battleManager.delay(adjustedAnimationTime * 0.8);
        
        // Clean up slash effect
        this.removeSlashEffect(slashEffect);

        // REMOVED: Individual log entry - now handled in executeDeathFlameStormAttack
    }

    // Send death flame storm data to guest for synchronization
    sendDeathFlameStormUpdate(burningSkeletonCreature, heroOwner, position, burningSkeletonSide, allTargets) {
        // Convert targets to sync-friendly format
        const targetsData = allTargets.map(target => ({
            type: target.type,
            absoluteSide: target.hero.absoluteSide,
            position: target.position,
            creatureIndex: target.creatureIndex || null,
            heroName: target.hero ? target.hero.name : null,
            creatureName: target.creature ? target.creature.name : null
        }));

        this.battleManager.sendBattleUpdate('burning_skeleton_flame_storm', {
            burningSkeletonData: {
                side: burningSkeletonSide,
                position: position,
                creatureIndex: heroOwner.creatures.indexOf(burningSkeletonCreature),
                name: burningSkeletonCreature.name,
                absoluteSide: heroOwner.absoluteSide
            },
            targets: targetsData,
            damage: this.SLASH_DAMAGE,
            burnedStacks: this.BURNED_STACKS,
            animationTime: this.SLASH_ANIMATION_TIME
        });
    }

    // Send consolidated log update to guest
    sendDeathFlameStormLogUpdate(burningSkeletonCreature, burnedCount) {
        this.battleManager.sendBattleUpdate('burning_skeleton_death_log', {
            creatureName: burningSkeletonCreature.name,
            burnedCount: burnedCount,
            timestamp: Date.now()
        });
    }

    // Handle death flame storm on guest side
    async handleGuestDeathFlameStorm(data) {
        const { burningSkeletonData, targets, damage, burnedStacks, animationTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const burningSkeletonLocalSide = (burningSkeletonData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀🔥 ${burningSkeletonData.name} erupts in a final blazing inferno as it dies!`, 
            'info',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );

        this.battleManager.addCombatLog(
            `🎯 Death flame storm targets ${targets.length} enemies simultaneously!`, 
            'warning',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );

        // Start guest flame storm animation
        await this.createGuestDeathFlameStorm(burningSkeletonData, targets, animationTime, myAbsoluteSide);
    }

    // Handle guest-side consolidated log
    handleGuestDeathFlameStormLog(data) {
        const { creatureName, burnedCount } = data;
        
        if (burnedCount > 0) {
            this.battleManager.addCombatLog(
                `🔥💀 The Burning Skeleton's final flame Burns ${burnedCount} target${burnedCount > 1 ? 's' : ''}!`, 
                'warning',
                null,
                { 
                    isCreatureMessage: true,
                    isCreatureDeathMessage: false
                }
            );
        }
    }

    // Create death flame storm on guest side
    async createGuestDeathFlameStorm(burningSkeletonData, targetsData, animationTime, myAbsoluteSide) {
        const burningSkeletonLocalSide = (burningSkeletonData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const burningSkeletonElement = this.getBurningSkeletonElement(
            burningSkeletonLocalSide,
            burningSkeletonData.position,
            burningSkeletonData.creatureIndex
        );

        if (!burningSkeletonElement) {
            console.warn('Burning Skeleton element not found on guest side for death flame storm');
            return;
        }

        // Create simultaneous slash effects to all targets
        const slashPromises = [];
        
        targetsData.forEach((targetData, index) => {
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            
            // Create slash effect (don't await - let them all execute simultaneously)
            slashPromises.push(this.executeGuestDeathFlame(burningSkeletonElement, targetData, index, animationTime, myAbsoluteSide));
        });

        // Wait for all slashes to complete
        await Promise.all(slashPromises);

        // Count burned targets and add consolidated log (matching host behavior)
        const burnedCount = targetsData.length;
        if (burnedCount > 0) {
            this.battleManager.addCombatLog(
                `🔥💀 The Burning Skeleton's final flame Burns ${burnedCount} target${burnedCount > 1 ? 's' : ''}!`, 
                'warning'
            );
        }
    }

    // Execute a single death flame on guest side
    async executeGuestDeathFlame(burningSkeletonElement, targetData, slashIndex, animationTime, myAbsoluteSide) {
        const targetElement = this.findTargetElementForGuest(targetData, myAbsoluteSide);
        
        if (!targetElement) {
            return;
        }

        const slashEffect = this.createFireSlashEffect(burningSkeletonElement, targetElement);
        if (slashEffect) {
            this.activeSlashEffects.add(slashEffect);
            
            // Calculate speed-adjusted animation time
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(animationTime);
            
            // Wait for slash to appear, then show impact
            await this.battleManager.delay(adjustedAnimationTime * 0.2);
            
            this.createFireImpactEffect(targetElement);
            
            // Wait for the rest of the animation
            await this.battleManager.delay(adjustedAnimationTime * 0.8);
            
            this.removeSlashEffect(slashEffect);

            // REMOVED: Individual log entry - now handled via sendBattleUpdate
        }
    }

    // Find target element for guest (helper method)
    findTargetElementForGuest(targetData, myAbsoluteSide) {
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetData.type === 'hero') {
            const heroElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .battle-hero-card`
            );
            return heroElement || document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot`
            );
        } else if (targetData.type === 'creature' && targetData.creatureIndex !== null) {
            return document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }
        return null;
    }

    // Clean up all active slash effects (called on battle end/reset)
    cleanup() {        
        this.activeSlashEffects.forEach(slashEffect => {
            try {
                if (slashEffect && slashEffect.parentNode) {
                    slashEffect.remove();
                }
            } catch (error) {
                console.warn('Error removing slash effect during cleanup:', error);
            }
        });
        
        this.activeSlashEffects.clear();

        // Also remove any orphaned slash elements
        try {
            const orphanedSlashes = document.querySelectorAll('.burning-skeleton-slash');
            orphanedSlashes.forEach(slashEffect => {
                if (slashEffect.parentNode) {
                    slashEffect.remove();
                }
            });
        } catch (error) {
            console.warn('Error cleaning up orphaned slash effects:', error);
        }
    }

    // Inject CSS styles for Burning Skeleton effects
    injectBurningSkeletonStyles() {
        if (document.getElementById('burningSkeletonCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'burningSkeletonCreatureStyles';
        style.textContent = `
            /* Burning Skeleton Fire Slash Effects */
            .burning-skeleton-slash {
                border-radius: 4px;
                position: relative;
                overflow: visible;
            }

            .fire-energy-trail {
                filter: blur(1px);
            }

            .slash-blade-highlight {
                mix-blend-mode: overlay;
            }

            @keyframes fireSlashStrike {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scale(0.8);
                }
                15% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scale(1.1);
                }
                85% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scale(1);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scale(0.9);
                }
            }

            @keyframes fireEnergyPulse {
                0%, 100% { 
                    opacity: 0.6;
                    transform: scaleY(0.8);
                }
                50% { 
                    opacity: 1;
                    transform: scaleY(1.2);
                }
            }

            @keyframes bladeFlash {
                0% { 
                    opacity: 0;
                    transform: scaleX(0);
                }
                50% { 
                    opacity: 1;
                    transform: scaleX(1);
                }
                100% { 
                    opacity: 0;
                    transform: scaleX(1);
                }
            }

            @keyframes fireSlashImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                }
                30% { 
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.2) rotate(90deg);
                }
                70% { 
                    opacity: 0.6;
                    transform: translate(-50%, -50%) scale(1.4) rotate(180deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(270deg);
                }
            }

            @keyframes fireParticleExplosion {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(calc(-50% + var(--particle-x)), calc(-50% + var(--particle-y))) scale(0.2);
                }
            }

            /* Target Slash Mark Animations */
            @keyframes targetSlashAppear {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scaleX(0) scaleY(2);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scaleX(1.2) scaleY(1.5);
                }
                60% {
                    opacity: 0.9;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scaleX(1) scaleY(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scaleX(0.8) scaleY(0.8);
                }
            }

            @keyframes targetSlashGlow {
                0% {
                    opacity: 0;
                    transform: scale(0.5);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.3);
                }
                100% {
                    opacity: 0;
                    transform: scale(2);
                }
            }

            @keyframes targetCrossSlashAppear {
                0% {
                    opacity: 0;
                    transform: rotate(90deg) scaleX(0);
                }
                40% {
                    opacity: 0.8;
                    transform: rotate(90deg) scaleX(1.1);
                }
                80% {
                    opacity: 0.6;
                    transform: rotate(90deg) scaleX(1);
                }
                100% {
                    opacity: 0;
                    transform: rotate(90deg) scaleX(0.9);
                }
            }

            /* Enhanced slash mark effects */
            .target-slash-mark {
                filter: drop-shadow(0 0 8px rgba(255, 69, 0, 0.8));
            }

            .target-slash-glow {
                filter: blur(2px);
            }

            /* Enhanced creature glow when Burning Skeleton is preparing to attack */
            .creature-icon.burning-skeleton-charging .creature-sprite {
                filter: brightness(1.8) drop-shadow(0 0 15px rgba(255, 69, 0, 0.9));
                animation: burningSkeletonChargeGlow 1s ease-in-out infinite alternate;
            }

            @keyframes burningSkeletonChargeGlow {
                0% { 
                    filter: brightness(1.8) drop-shadow(0 0 15px rgba(255, 69, 0, 0.9));
                }
                100% { 
                    filter: brightness(2.2) drop-shadow(0 0 25px rgba(255, 140, 0, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const BurningSkeletonHelpers = {
    // Check if any creature in a list is Burning Skeleton
    hasBurningSkeletonInList(creatures) {
        return creatures.some(creature => BurningSkeletonCreature.isBurningSkeleton(creature.name));
    },

    // Get all Burning Skeleton creatures from a list
    getBurningSkeletonFromList(creatures) {
        return creatures.filter(creature => BurningSkeletonCreature.isBurningSkeleton(creature.name));
    },

    // Add charging visual effect to Burning Skeleton
    addChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('burning-skeleton-charging');
        }
    },

    // Remove charging visual effect from Burning Skeleton
    removeChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('burning-skeleton-charging');
        }
    }
};

export default BurningSkeletonCreature;