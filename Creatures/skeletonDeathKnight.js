// ./Creatures/skeletonDeathKnight.js - Skeleton Death Knight Creature Dark Slash Attack Module

export class SkeletonDeathKnightCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeSlashEffects = new Set(); // Track active slash effects for cleanup
        
        // Skeleton Death Knight stats
        this.SLASH_DAMAGE = 10;
        this.SLASH_ANIMATION_TIME = 800; // 0.8 second slash animation
        this.SILENCED_STACKS = 2;
        
        // Inject CSS styles
        this.injectSkeletonDeathKnightStyles();
        
        console.log('⚔️ Skeleton Death Knight Creature module initialized');
    }

    // Check if a creature is Skeleton Death Knight
    static isSkeletonDeathKnight(creatureName) {
        return creatureName === 'SkeletonDeathKnight';
    }

    // Execute Skeleton Death Knight special attack with dark slash
    async executeSpecialAttack(deathKnightActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const deathKnightCreature = deathKnightActor.data;
        const deathKnightHero = deathKnightActor.hero;
        const attackerSide = deathKnightHero.side;
        
        // Safety check: ensure Skeleton Death Knight is still alive
        if (!deathKnightCreature.alive || deathKnightCreature.currentHp <= 0) {
            console.log(`Skeleton Death Knight is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `⚔️ ${deathKnightCreature.name} raises its dark blade, preparing a deadly strike!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Use standard targeting system (same as normal hero attacks)
        const target = this.battleManager.combatManager.authoritative_findTargetWithCreatures(
            position, 
            attackerSide
        );
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${deathKnightCreature.name} finds no targets for its dark slash!`, 
                'info'
            );
            return;
        }
        
        // Log target acquisition
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `🎯 ${deathKnightCreature.name} targets ${targetName} with a dark slash!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE starting host animation
        this.sendDarkSlashUpdate(deathKnightActor, target, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute dark slash attack with visual effects
        await this.executeDarkSlashAttack(deathKnightActor, target, position);
    }

    // Execute the dark slash attack with visual effects (host side)
    async executeDarkSlashAttack(deathKnightActor, target, position) {
        const attackerSide = deathKnightActor.hero.side;
        const deathKnightElement = this.getDeathKnightElement(attackerSide, position, deathKnightActor.index);
        const targetElement = this.getTargetElement(target);
        
        if (!deathKnightElement) {
            console.error('Skeleton Death Knight element not found, cannot create slash');
            return;
        }

        if (!targetElement) {
            console.error('Target element not found, cannot create slash');
            return;
        }
        
        // Create and execute dark slash animation
        const slashEffect = this.createDarkSlashEffect(deathKnightElement, targetElement);
        if (!slashEffect) {
            console.error('Failed to create dark slash effect');
            return;
        }

        this.activeSlashEffects.add(slashEffect);

        // Calculate speed-adjusted animation time
        const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.SLASH_ANIMATION_TIME);
        
        // Wait for slash to appear (much shorter delay since slash appears at target instantly)
        await this.battleManager.delay(adjustedAnimationTime * 0.2); // 20% of animation time
        
        // Apply damage when slash hits (only host applies actual damage)
        this.applyDarkSlashDamage(target, deathKnightActor.data);
        
        // Apply silenced status effect
        this.applyDarkSlashSilence(target);
        
        // Add impact effect
        this.createDarkImpactEffect(targetElement);
        
        // Wait for the rest of the slash animation to complete
        await this.battleManager.delay(adjustedAnimationTime * 0.8);
        
        // Clean up slash effect
        this.removeSlashEffect(slashEffect);

        this.battleManager.addCombatLog(
            `💥 The dark slash appears and strikes true, dealing ${this.SLASH_DAMAGE} damage and silencing the target!`, 
            'info'
        );
    }

    // Get the DOM element for Skeleton Death Knight creature
    getDeathKnightElement(side, heroPosition, creatureIndex) {
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

    // Create dark purple slash effect
    createDarkSlashEffect(fromElement, toElement) {
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

            // Create the dark slash effect element at target location
            const slashEffect = document.createElement('div');
            slashEffect.className = 'skeleton-death-knight-slash';
            
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
                    rgba(75, 0, 130, 0.9) 20%, 
                    rgba(138, 43, 226, 1) 50%, 
                    rgba(75, 0, 130, 0.9) 80%, 
                    transparent 100%);
                transform-origin: 50% 50%;
                transform: translate(-50%, -50%) rotate(${slashAngle}deg);
                z-index: 1500;
                pointer-events: none;
                border-radius: 4px;
                box-shadow: 
                    0 0 15px rgba(138, 43, 226, 0.8),
                    0 0 30px rgba(75, 0, 130, 0.6),
                    inset 0 2px 0 rgba(255, 255, 255, 0.3);
                animation: darkSlashStrike ${adjustedAnimationTime}ms ease-out forwards;
                --slash-angle: ${slashAngle}deg;
            `;

            // Add dark energy effects
            const darkEnergyTrail = document.createElement('div');
            darkEnergyTrail.className = 'dark-energy-trail';
            darkEnergyTrail.style.cssText = `
                position: absolute;
                top: -4px;
                left: 0;
                right: 0;
                height: 16px;
                background: radial-gradient(ellipse, 
                    rgba(75, 0, 130, 0.6) 0%, 
                    rgba(138, 43, 226, 0.4) 50%, 
                    transparent 100%);
                border-radius: 8px;
                animation: darkEnergyPulse ${adjustedAnimationTime}ms ease-in-out infinite;
            `;
            
            slashEffect.appendChild(darkEnergyTrail);

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
            
            console.log(`Created dark slash at target: ${slashAngle.toFixed(1)}°, animation time: ${adjustedAnimationTime}ms`);
            return slashEffect;
            
        } catch (error) {
            console.error('Error creating dark slash effect:', error);
            return null;
        }
    }

    // Create dark impact effect at target location
    createDarkImpactEffect(targetElement) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Create prominent slash mark on target
        this.createTargetSlashMark(targetElement, centerX, centerY);

        const impact = document.createElement('div');
        impact.className = 'dark-slash-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, 
                rgba(138, 43, 226, 0.9) 0%, 
                rgba(75, 0, 130, 0.7) 40%, 
                rgba(25, 25, 112, 0.5) 70%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: darkSlashImpact 0.6s ease-out forwards;
            box-shadow: 
                0 0 20px rgba(138, 43, 226, 0.8),
                0 0 40px rgba(75, 0, 130, 0.6);
        `;

        // Add impact particles
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'dark-impact-particle';
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
                background: rgba(138, 43, 226, 0.9);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: darkParticleExplosion 0.8s ease-out forwards;
                --particle-x: ${particleX}px;
                --particle-y: ${particleY}px;
                box-shadow: 0 0 8px rgba(138, 43, 226, 0.8);
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

    // Create prominent slash mark on the target
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
                rgba(138, 43, 226, 1) 50%, 
                rgba(255, 255, 255, 0.9) 95%, 
                transparent 100%);
            transform: translate(-50%, -50%) rotate(${slashAngle}deg);
            z-index: 1650;
            pointer-events: none;
            border-radius: 3px;
            box-shadow: 
                0 0 15px rgba(138, 43, 226, 1),
                0 0 30px rgba(75, 0, 130, 0.8),
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
                rgba(138, 43, 226, 0.6) 0%, 
                rgba(75, 0, 130, 0.4) 50%, 
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
                rgba(138, 43, 226, 0.8) 50%, 
                rgba(255, 255, 255, 0.7) 90%, 
                transparent 100%);
            transform: rotate(90deg);
            transform-origin: 50% 50%;
            border-radius: 2px;
            animation: targetCrossSlashAppear 0.5s ease-out 0.1s forwards;
            opacity: 0;
            box-shadow: 0 0 10px rgba(138, 43, 226, 0.8);
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

    // Apply Skeleton Death Knight damage to target
    applyDarkSlashDamage(target, attackingDeathKnight = null) {
        const damage = this.SLASH_DAMAGE;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'spell', // Death Knight's dark slash is magical
                attacker: attackingDeathKnight // ✅ Pass the attacking creature
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
                source: 'spell', // Death Knight's dark slash is magical
                attacker: attackingDeathKnight // ✅ Pass the attacking creature
            });
        }
    }

    // Apply silenced status effect to target
    applyDarkSlashSilence(target) {
        if (!this.battleManager.statusEffectsManager) return;

        const targetData = target.type === 'creature' ? target.creature : target.hero;
        
        // Apply 1 stack of Silenced
        const success = this.battleManager.statusEffectsManager.applyStatusEffect(
            targetData, 
            'silenced', 
            this.SILENCED_STACKS
        );

        if (success) {
            const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
            this.battleManager.addCombatLog(
                `🔇 ${targetName} is silenced by the dark magic!`,
                target.side === 'player' ? 'error' : 'success'
            );
        }
    }

    // Send dark slash attack data to guest for synchronization
    sendDarkSlashUpdate(deathKnightActor, target, position) {
        const attackerSide = deathKnightActor.hero.side;
        
        this.battleManager.sendBattleUpdate('skeleton_death_knight_dark_slash', {
            deathKnightData: {
                side: attackerSide,
                position: position,
                creatureIndex: deathKnightActor.index,
                name: deathKnightActor.data.name,
                absoluteSide: deathKnightActor.hero.absoluteSide
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
            silencedStacks: this.SILENCED_STACKS,
            animationTime: this.SLASH_ANIMATION_TIME
        });
    }

    // Handle Skeleton Death Knight dark slash on guest side
    handleGuestDarkSlash(data) {
        const { deathKnightData, target, damage, silencedStacks, animationTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const deathKnightLocalSide = (deathKnightData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `⚔️ ${deathKnightData.name} unleashes a dark slash!`, 
            deathKnightLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestDarkSlash(deathKnightData, target, animationTime, myAbsoluteSide);
    }

    // Create dark slash on guest side
    async createGuestDarkSlash(deathKnightData, targetData, animationTime, myAbsoluteSide) {
        const deathKnightLocalSide = (deathKnightData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const deathKnightElement = this.getDeathKnightElement(
            deathKnightLocalSide,
            deathKnightData.position,
            deathKnightData.creatureIndex
        );

        if (!deathKnightElement) {
            console.warn('Skeleton Death Knight element not found on guest side');
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
            const slashEffect = this.createDarkSlashEffect(deathKnightElement, targetElement);
            if (slashEffect) {
                this.activeSlashEffects.add(slashEffect);
            }

            // Calculate speed-adjusted animation time
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(animationTime);
            
            // Wait for slash to appear, then show impact
            await this.battleManager.delay(adjustedAnimationTime * 0.2);
            
            this.createDarkImpactEffect(targetElement);
            
            // Wait for the rest of the animation
            await this.battleManager.delay(adjustedAnimationTime * 0.8);
            
            this.removeSlashEffect(slashEffect);

            // Log damage for target (but don't apply actual damage - host handles that)
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            this.battleManager.addCombatLog(
                `🎯 ${targetName} is struck by the dark slash for ${this.SLASH_DAMAGE} damage and silenced!`,
                targetLocalSide === 'player' ? 'error' : 'success'
            );
        } else {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        }
    }

    // ============================================
    // DEATH SLASH STORM EFFECT
    // ============================================

    // Execute death slash storm when Skeleton Death Knight dies (slash all enemies simultaneously)
    async executeDeathSlashStorm(dyingDeathKnight, heroOwner, position, side) {
        if (!this.battleManager.isAuthoritative) return;

        const deathKnightCreature = dyingDeathKnight;
        const deathKnightSide = side;
        
        this.battleManager.addCombatLog(
            `💀⚔️ ${deathKnightCreature.name} unleashes a final devastating slash storm as it dies!`, 
            deathKnightSide === 'player' ? 'info' : 'info'
        );

        // Find all enemy targets
        const allEnemyTargets = this.findAllEnemyTargets(deathKnightSide);
        
        if (allEnemyTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${deathKnightCreature.name}'s death slash storm finds no enemies!`, 
                'info'
            );
            return;
        }

        this.battleManager.addCombatLog(
            `🎯 Death slash storm targets ${allEnemyTargets.length} enemies simultaneously!`, 
            'warning'
        );

        // Send death slash storm data to guest for synchronization
        this.sendDeathSlashStormUpdate(deathKnightCreature, heroOwner, position, deathKnightSide, allEnemyTargets);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(100);

        // Execute the death slash storm
        await this.executeDeathSlashStormAttack(deathKnightCreature, heroOwner, position, deathKnightSide, allEnemyTargets);
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

    // Execute the death slash storm attack (simultaneous slashes to all enemies)
    async executeDeathSlashStormAttack(deathKnightCreature, heroOwner, position, deathKnightSide, allTargets) {
        // Get the death knight element (even though it's dead, we need it for slash origins)
        const deathKnightElement = this.getDeathKnightElement(
            deathKnightSide, 
            position, 
            heroOwner.creatures.indexOf(deathKnightCreature)
        );
        
        if (!deathKnightElement) {
            console.error('Skeleton Death Knight element not found for death slash storm');
            return;
        }

        // Create simultaneous slash effects to all targets
        const slashPromises = [];
        
        allTargets.forEach((target, index) => {
            const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
            
            this.battleManager.addCombatLog(
                `⚔️ Death slash seeks ${targetName}!`, 
                'warning'
            );

            // Create slash effect (don't await - let them all execute simultaneously)
            slashPromises.push(this.executeDeathSlash(deathKnightElement, target, index, deathKnightCreature));
        });

        // Wait for all slashes to complete
        await Promise.all(slashPromises);

        // Add final message after all slashes complete
        this.battleManager.addCombatLog(
            `💥 ${deathKnightCreature.name}'s death slash storm complete! ${allTargets.length} enemies struck!`, 
            'info'
        );
    }

    // Execute a single death slash
    async executeDeathSlash(deathKnightElement, target, slashIndex, attackingDeathKnight) {
        const targetElement = this.getTargetElement(target);
        
        if (!targetElement) {
            console.error(`Target element not found for death slash ${slashIndex + 1}`);
            return;
        }
        
        // Create and execute dark slash animation
        const slashEffect = this.createDarkSlashEffect(deathKnightElement, targetElement);
        if (!slashEffect) {
            console.error(`Failed to create death slash ${slashIndex + 1}`);
            return;
        }

        this.activeSlashEffects.add(slashEffect);

        // Calculate speed-adjusted animation time
        const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.SLASH_ANIMATION_TIME);
        
        // Wait for slash to appear
        await this.battleManager.delay(adjustedAnimationTime * 0.2);
        
        // Apply damage when slash hits (only host applies actual damage) - FIXED: Use attackingDeathKnight
        this.applyDarkSlashDamage(target, attackingDeathKnight);
        
        // Apply silenced status effect
        this.applyDarkSlashSilence(target);
        
        // Add impact effect
        this.createDarkImpactEffect(targetElement);
        
        // Wait for the rest of the animation
        await this.battleManager.delay(adjustedAnimationTime * 0.8);
        
        // Clean up slash effect
        this.removeSlashEffect(slashEffect);

        // Log the hit
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `💥 Death slash strikes ${targetName} for ${this.SLASH_DAMAGE} damage and applies Silenced!`, 
            'warning'
        );
    }

    // Send death slash storm data to guest for synchronization
    sendDeathSlashStormUpdate(deathKnightCreature, heroOwner, position, deathKnightSide, allTargets) {
        // Convert targets to sync-friendly format
        const targetsData = allTargets.map(target => ({
            type: target.type,
            absoluteSide: target.hero.absoluteSide,
            position: target.position,
            creatureIndex: target.creatureIndex || null,
            heroName: target.hero ? target.hero.name : null,
            creatureName: target.creature ? target.creature.name : null
        }));

        this.battleManager.sendBattleUpdate('skeleton_death_knight_slash_storm', {
            deathKnightData: {
                side: deathKnightSide,
                position: position,
                creatureIndex: heroOwner.creatures.indexOf(deathKnightCreature),
                name: deathKnightCreature.name,
                absoluteSide: heroOwner.absoluteSide
            },
            targets: targetsData,
            damage: this.SLASH_DAMAGE,
            silencedStacks: this.SILENCED_STACKS,
            animationTime: this.SLASH_ANIMATION_TIME
        });
    }

    // Handle death slash storm on guest side
    async handleGuestDeathSlashStorm(data) {
        const { deathKnightData, targets, damage, silencedStacks, animationTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const deathKnightLocalSide = (deathKnightData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀⚔️ ${deathKnightData.name} unleashes a final devastating slash storm as it dies!`, 
            'info'
        );

        this.battleManager.addCombatLog(
            `🎯 Death slash storm targets ${targets.length} enemies simultaneously!`, 
            'warning'
        );

        // Start guest slash storm animation
        await this.createGuestDeathSlashStorm(deathKnightData, targets, animationTime, myAbsoluteSide);
    }

    // Create death slash storm on guest side
    async createGuestDeathSlashStorm(deathKnightData, targetsData, animationTime, myAbsoluteSide) {
        const deathKnightLocalSide = (deathKnightData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const deathKnightElement = this.getDeathKnightElement(
            deathKnightLocalSide,
            deathKnightData.position,
            deathKnightData.creatureIndex
        );

        if (!deathKnightElement) {
            console.warn('Skeleton Death Knight element not found on guest side for death slash storm');
            return;
        }

        // Create simultaneous slash effects to all targets
        const slashPromises = [];
        
        targetsData.forEach((targetData, index) => {
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            
            this.battleManager.addCombatLog(
                `⚔️ Death slash seeks ${targetName}!`, 
                'warning'
            );

            // Create slash effect (don't await - let them all execute simultaneously)
            slashPromises.push(this.executeGuestDeathSlash(deathKnightElement, targetData, index, animationTime, myAbsoluteSide));
        });

        // Wait for all slashes to complete
        await Promise.all(slashPromises);

        this.battleManager.addCombatLog(
            `💥 ${deathKnightData.name}'s death slash storm complete! ${targetsData.length} enemies struck!`, 
            'info'
        );
    }

    // Execute a single death slash on guest side
    async executeGuestDeathSlash(deathKnightElement, targetData, slashIndex, animationTime, myAbsoluteSide) {
        const targetElement = this.findTargetElementForGuest(targetData, myAbsoluteSide);
        
        if (!targetElement) {
            return;
        }

        const slashEffect = this.createDarkSlashEffect(deathKnightElement, targetElement);
        if (slashEffect) {
            this.activeSlashEffects.add(slashEffect);
            
            // Calculate speed-adjusted animation time
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(animationTime);
            
            // Wait for slash to appear, then show impact
            await this.battleManager.delay(adjustedAnimationTime * 0.2);
            
            this.createDarkImpactEffect(targetElement);
            
            // Wait for the rest of the animation
            await this.battleManager.delay(adjustedAnimationTime * 0.8);
            
            this.removeSlashEffect(slashEffect);

            // Log damage (but don't apply - host handles that)
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            this.battleManager.addCombatLog(
                `💥 Death slash strikes ${targetName} for ${this.SLASH_DAMAGE} damage and applies Silenced!`, 
                'warning'
            );
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
        console.log(`Cleaning up ${this.activeSlashEffects.size} active Skeleton Death Knight slash effects`);
        
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
            const orphanedSlashes = document.querySelectorAll('.skeleton-death-knight-slash');
            orphanedSlashes.forEach(slashEffect => {
                if (slashEffect.parentNode) {
                    slashEffect.remove();
                }
            });
            
            if (orphanedSlashes.length > 0) {
                console.log(`Cleaned up ${orphanedSlashes.length} orphaned Skeleton Death Knight slash effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned slash effects:', error);
        }
    }

    // Inject CSS styles for Skeleton Death Knight effects
    injectSkeletonDeathKnightStyles() {
        if (document.getElementById('skeletonDeathKnightCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'skeletonDeathKnightCreatureStyles';
        style.textContent = `
            /* Skeleton Death Knight Dark Slash Effects */
            .skeleton-death-knight-slash {
                border-radius: 4px;
                position: relative;
                overflow: visible;
            }

            .dark-energy-trail {
                filter: blur(1px);
            }

            .slash-blade-highlight {
                mix-blend-mode: overlay;
            }

            @keyframes darkSlashStrike {
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

            @keyframes darkEnergyPulse {
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

            @keyframes darkSlashImpact {
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

            @keyframes darkParticleExplosion {
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
                filter: drop-shadow(0 0 8px rgba(138, 43, 226, 0.8));
            }

            .target-slash-glow {
                filter: blur(2px);
            }

            /* Enhanced creature glow when Skeleton Death Knight is preparing to attack */
            .creature-icon.death-knight-charging .creature-sprite {
                filter: brightness(1.8) drop-shadow(0 0 15px rgba(138, 43, 226, 0.9));
                animation: deathKnightChargeGlow 1s ease-in-out infinite alternate;
            }

            @keyframes deathKnightChargeGlow {
                0% { 
                    filter: brightness(1.8) drop-shadow(0 0 15px rgba(138, 43, 226, 0.9));
                }
                100% { 
                    filter: brightness(2.2) drop-shadow(0 0 25px rgba(75, 0, 130, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const SkeletonDeathKnightHelpers = {
    // Check if any creature in a list is Skeleton Death Knight
    hasSkeletonDeathKnightInList(creatures) {
        return creatures.some(creature => SkeletonDeathKnightCreature.isSkeletonDeathKnight(creature.name));
    },

    // Get all Skeleton Death Knight creatures from a list
    getSkeletonDeathKnightFromList(creatures) {
        return creatures.filter(creature => SkeletonDeathKnightCreature.isSkeletonDeathKnight(creature.name));
    },

    // Add charging visual effect to Skeleton Death Knight
    addChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('death-knight-charging');
        }
    },

    // Remove charging visual effect from Skeleton Death Knight
    removeChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('death-knight-charging');
        }
    }
};

export default SkeletonDeathKnightCreature;