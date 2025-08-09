// ./Creatures/skeletonReaper.js - Skeleton Reaper Creature Scythe Attack Module

export class SkeletonReaperCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeScytheEffects = new Set(); // Track active scythe effects for cleanup
        this.activeDeathSlashes = new Set(); // Track active death slash effects for cleanup
        
        // Skeleton Reaper stats
        this.SCYTHE_DAMAGE = 99999; // Massive damage to essentially kill anything
        this.SCYTHE_ANIMATION_TIME = 1000; // 1 second scythe animation
        this.HERO_CHANCE = 0.10; // 10% chance to target enemy hero when no creatures
        this.SELF_HARM_CHANCE = 0.25; // 25% chance to target own creatures when no enemy creatures
        
        // Death Slash Storm stats
        this.DEATH_SLASH_DAMAGE = 30; // 30 damage to all targets
        this.DEATH_SLASH_ANIMATION_TIME = 1200; // 1.2 second death slash animation
        this.SLASH_STAGGER_DELAY = 150; // 150ms between each slash appearing
        
        // Inject CSS styles
        this.injectSkeletonReaperStyles();
        
        console.log('💀🔪 Skeleton Reaper Creature module initialized');
    }

    // Check if a creature is Skeleton Reaper
    static isSkeletonReaper(creatureName) {
        return creatureName === 'SkeletonReaper';
    }

    // Execute Skeleton Reaper special attack with scythe sweep
    async executeSpecialAttack(reaperActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const reaperCreature = reaperActor.data;
        const reaperHero = reaperActor.hero;
        const attackerSide = reaperHero.side;
        
        // Safety check: ensure Skeleton Reaper is still alive
        if (!reaperCreature.alive || reaperCreature.currentHp <= 0) {
            console.log(`Skeleton Reaper is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `💀🔪 ${reaperCreature.name} raises its spectral scythe, seeking souls to harvest!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find target using the priority system
        const target = this.findReaperTarget(attackerSide, reaperActor);
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${reaperCreature.name}'s scythe finds no souls to reap!`, 
                'info'
            );
            return;
        }
        
        // Log target acquisition
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        const targetSideText = target.side === attackerSide ? 'ally' : 'enemy';
        this.battleManager.addCombatLog(
            `🎯 The spectral scythe seeks ${targetSideText} ${targetName}!`, 
            'warning'
        );

        // Send synchronization data to guest BEFORE starting host animation
        this.sendScytheReapUpdate(reaperActor, target, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute scythe reap attack with visual effects
        await this.executeScytheReapAttack(reaperActor, target, position);
    }

    // ============================================
    // DEATH SLASH STORM EFFECT
    // ============================================

    // Execute death slash storm when Skeleton Reaper dies (wide slash across all enemies)
    async executeDeathSlashStorm(dyingReaper, heroOwner, position, side) {
        if (!this.battleManager.isAuthoritative) return;

        const reaperCreature = dyingReaper;
        const reaperSide = side;
        
        this.battleManager.addCombatLog(
            `💀⚔️ ${reaperCreature.name} unleashes a final spectral slash storm as its soul departs!`, 
            reaperSide === 'player' ? 'info' : 'info'
        );

        // Find all targets for the death slash storm
        const targets = this.findAllDeathSlashTargets(reaperSide);
        
        if (targets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 The death slash storm finds no targets to strike!`, 
                'info'
            );
            return;
        }

        // Log what we're targeting
        const targetTypeText = targets[0].type === 'creature' ? 'creatures' : 'heroes';
        this.battleManager.addCombatLog(
            `🌪️ The spectral storm targets all enemy ${targetTypeText} (${targets.length} targets)!`, 
            'warning'
        );

        // Send death slash storm data to guest for synchronization
        this.sendDeathSlashStormUpdate(reaperCreature, heroOwner, position, reaperSide, targets);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(100);

        // Execute the death slash storm with wide arching slashes
        await this.executeDeathSlashStormAttack(reaperCreature, heroOwner, position, reaperSide, targets);
    }

    // Find all targets for death slash storm (all creatures, or all heroes if no creatures)
    findAllDeathSlashTargets(attackerSide) {
        const targets = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        const allTargets = [];
        
        // First, try to find all living enemy creatures
        Object.keys(targets).forEach(position => {
            const hero = targets[position];
            if (hero && hero.alive && hero.creatures) {
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
        });
        
        // If we found creatures, return them
        if (allTargets.length > 0) {
            return allTargets;
        }
        
        // No creatures found, target all living heroes instead
        Object.keys(targets).forEach(position => {
            const hero = targets[position];
            if (hero && hero.alive) {
                allTargets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: attackerSide === 'player' ? 'opponent' : 'player'
                });
            }
        });
        
        return allTargets;
    }

    // Execute the death slash storm attack (wide arching slashes across all targets)
    async executeDeathSlashStormAttack(reaperCreature, heroOwner, position, reaperSide, targets) {
        if (targets.length === 0) return;

        // Get the reaper element (even though it's dead, we need it for slash origin)
        const reaperElement = this.getReaperElement(reaperSide, position, heroOwner.creatures.indexOf(reaperCreature));
        
        if (!reaperElement) {
            console.error('Skeleton Reaper element not found for death slash storm');
            return;
        }

        // Create wide arching slashes across all targets simultaneously
        const slashPromises = [];
        
        targets.forEach((target, index) => {
            // Stagger the slash appearances slightly for visual effect
            const delay = index * this.SLASH_STAGGER_DELAY;
            
            slashPromises.push(
                this.createDelayedDeathSlash(reaperElement, target, delay, index + 1, targets.length)
            );
        });

        // Wait for all slashes to complete
        await Promise.all(slashPromises);

        // Apply damage to all targets simultaneously
        targets.forEach(target => {
            this.applyDeathSlashDamage(target);
        });

        // Add final message
        const targetTypeText = targets[0].type === 'creature' ? 'creatures' : 'heroes';
        this.battleManager.addCombatLog(
            `💥 The spectral slash storm ravages all enemy ${targetTypeText} for ${this.DEATH_SLASH_DAMAGE} damage each!`, 
            'warning'
        );
    }

    // Create a delayed death slash for visual staggering
    async createDelayedDeathSlash(reaperElement, target, delay, slashNumber, totalSlashes) {
        // Wait for the stagger delay
        if (delay > 0) {
            await this.battleManager.delay(delay);
        }

        const targetElement = this.getTargetElement(target);
        if (!targetElement) {
            console.error(`Target element not found for death slash ${slashNumber}`);
            return;
        }

        // Log the individual slash
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `⚔️ Spectral slash ${slashNumber}/${totalSlashes} seeks ${targetName}!`, 
            'warning'
        );

        // Create the wide arching slash effect
        const slashEffect = this.createWideArchingSlash(reaperElement, targetElement, slashNumber);
        if (slashEffect) {
            this.activeDeathSlashes.add(slashEffect);
        }

        // Calculate speed-adjusted animation time
        const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.DEATH_SLASH_ANIMATION_TIME);
        
        // Wait for slash to complete
        await this.battleManager.delay(adjustedAnimationTime);
        
        // Clean up slash effect
        this.removeDeathSlashEffect(slashEffect);
    }

    // Create a wide arching slash effect from reaper to target
    createWideArchingSlash(fromElement, toElement, slashNumber) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create death slash: missing elements');
            return null;
        }

        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            console.warn('Cannot create death slash: elements not in DOM');
            return null;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
                console.warn('Cannot create death slash: elements have invalid dimensions');
                return null;
            }

            // Calculate positions with slight randomization for visual variety
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2 + (Math.random() - 0.5) * 20;
            const toY = toRect.top + toRect.height / 2 + (Math.random() - 0.5) * 20;

            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid death slash coordinates detected');
                return null;
            }

            // Calculate arc properties for wide slash
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            
            // Add curvature to the slash for dramatic effect
            const curvature = 15 + Math.random() * 10; // Random curvature between 15-25 degrees

            // Create the death slash effect element
            const slashEffect = document.createElement('div');
            slashEffect.className = 'skeleton-reaper-death-slash';
            
            // Calculate speed-adjusted animation time for CSS
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.DEATH_SLASH_ANIMATION_TIME);
            
            slashEffect.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: ${distance + 50}px;
                height: 20px;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(75, 0, 130, 0.9) 5%, 
                    rgba(138, 43, 226, 1) 25%, 
                    rgba(255, 0, 255, 1) 50%, 
                    rgba(138, 43, 226, 1) 75%, 
                    rgba(75, 0, 130, 0.9) 95%, 
                    transparent 100%);
                transform-origin: 0% 50%;
                transform: rotate(${angle}deg);
                z-index: 1550;
                pointer-events: none;
                border-radius: 10px;
                box-shadow: 
                    0 0 30px rgba(255, 0, 255, 1),
                    0 0 60px rgba(138, 43, 226, 0.8),
                    0 0 90px rgba(75, 0, 130, 0.6),
                    inset 0 5px 0 rgba(255, 255, 255, 0.5),
                    inset 0 -5px 0 rgba(0, 0, 0, 0.5);
                animation: deathSlashArc ${adjustedAnimationTime}ms ease-out forwards;
                --slash-angle: ${angle}deg;
                --slash-distance: ${distance}px;
                --slash-curvature: ${curvature}deg;
                --slash-number: ${slashNumber};
            `;

            // Add spectral energy trail
            const spectralTrail = document.createElement('div');
            spectralTrail.className = 'death-slash-trail';
            spectralTrail.style.cssText = `
                position: absolute;
                top: -15px;
                left: 0;
                right: 0;
                height: 50px;
                background: radial-gradient(ellipse, 
                    rgba(255, 0, 255, 0.6) 0%, 
                    rgba(138, 43, 226, 0.4) 50%, 
                    transparent 100%);
                border-radius: 25px;
                animation: spectralDeathTrail ${adjustedAnimationTime}ms ease-in-out;
                filter: blur(3px);
            `;
            
            slashEffect.appendChild(spectralTrail);

            // Add death runes along the slash
            for (let i = 0; i < 5; i++) {
                const rune = document.createElement('div');
                rune.className = 'death-rune';
                const runeDelay = i * 50;
                rune.style.cssText = `
                    position: absolute;
                    top: ${5 + (i % 2) * 10}px;
                    left: ${20 + i * 20}%;
                    width: 8px;
                    height: 8px;
                    background: rgba(255, 0, 255, 0.9);
                    border-radius: 50%;
                    animation: deathRuneFlicker ${adjustedAnimationTime * 0.8}ms ease-out ${runeDelay}ms forwards;
                    opacity: 0;
                    box-shadow: 0 0 10px rgba(255, 0, 255, 0.8);
                `;
                
                slashEffect.appendChild(rune);
            }
            
            document.body.appendChild(slashEffect);
            
            console.log(`Created death slash ${slashNumber}: ${angle.toFixed(1)}°, distance: ${distance.toFixed(1)}px`);
            return slashEffect;
            
        } catch (error) {
            console.error('Error creating death slash effect:', error);
            return null;
        }
    }

    // Apply death slash damage to target
    applyDeathSlashDamage(target) {
        const damage = this.DEATH_SLASH_DAMAGE;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            });
        } else if (target.type === 'creature') {
            this.battleManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: target.position,
                side: target.side
            });
        }
    }

    // Send death slash storm data to guest for synchronization
    sendDeathSlashStormUpdate(reaperCreature, heroOwner, position, reaperSide, targets) {
        this.battleManager.sendBattleUpdate('skeleton_reaper_death_slash_storm', {
            reaperData: {
                side: reaperSide,
                position: position,
                creatureIndex: heroOwner.creatures.indexOf(reaperCreature),
                name: reaperCreature.name,
                absoluteSide: heroOwner.absoluteSide
            },
            targets: targets.map(target => ({
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null
            })),
            damage: this.DEATH_SLASH_DAMAGE,
            animationTime: this.DEATH_SLASH_ANIMATION_TIME,
            staggerDelay: this.SLASH_STAGGER_DELAY
        });
    }

    // Handle death slash storm on guest side
    async handleGuestDeathSlashStorm(data) {
        const { reaperData, targets, damage, animationTime, staggerDelay } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const reaperLocalSide = (reaperData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀⚔️ ${reaperData.name} unleashes a final spectral slash storm as its soul departs!`, 
            'info'
        );

        if (targets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 The death slash storm finds no targets to strike!`, 
                'info'
            );
            return;
        }

        // Log what we're targeting
        const targetTypeText = targets[0].type === 'creature' ? 'creatures' : 'heroes';
        this.battleManager.addCombatLog(
            `🌪️ The spectral storm targets all enemy ${targetTypeText} (${targets.length} targets)!`, 
            'warning'
        );

        // Start guest death slash storm animation
        await this.createGuestDeathSlashStorm(reaperData, targets, animationTime, staggerDelay, myAbsoluteSide);
    }

    // Create death slash storm on guest side
    async createGuestDeathSlashStorm(reaperData, targetsData, animationTime, staggerDelay, myAbsoluteSide) {
        const reaperLocalSide = (reaperData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const reaperElement = this.getReaperElement(
            reaperLocalSide,
            reaperData.position,
            reaperData.creatureIndex
        );

        if (!reaperElement) {
            console.warn('Skeleton Reaper element not found on guest side for death slash storm');
            return;
        }

        // Create slashes for all targets with staggering
        const slashPromises = [];
        
        targetsData.forEach((targetData, index) => {
            slashPromises.push(
                this.createGuestDelayedDeathSlash(reaperElement, targetData, index * staggerDelay, index + 1, targetsData.length, animationTime, myAbsoluteSide)
            );
        });

        // Wait for all slashes to complete
        await Promise.all(slashPromises);

        // Add final completion message
        const targetTypeText = targetsData[0].type === 'creature' ? 'creatures' : 'heroes';
        this.battleManager.addCombatLog(
            `💥 The spectral slash storm ravages all enemy ${targetTypeText} for ${this.DEATH_SLASH_DAMAGE} damage each!`, 
            'warning'
        );
    }

    // Create delayed death slash on guest side
    async createGuestDelayedDeathSlash(reaperElement, targetData, delay, slashNumber, totalSlashes, animationTime, myAbsoluteSide) {
        // Wait for stagger delay
        if (delay > 0) {
            await this.battleManager.delay(delay);
        }

        // Find target element using absoluteSide mapping
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        let targetElement = null;
        
        if (targetData.type === 'hero') {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .battle-hero-card`
            );
            if (!targetElement) {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot`
                );
            }
        } else if (targetData.type === 'creature' && targetData.creatureIndex !== null) {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }

        if (!targetElement) {
            console.warn(`Guest: Target element not found for death slash ${slashNumber}`);
            return;
        }

        // Log the individual slash
        const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
        this.battleManager.addCombatLog(
            `⚔️ Spectral slash ${slashNumber}/${totalSlashes} seeks ${targetName}!`, 
            'warning'
        );

        // Create the slash effect
        const slashEffect = this.createWideArchingSlash(reaperElement, targetElement, slashNumber);
        if (slashEffect) {
            this.activeDeathSlashes.add(slashEffect);
        }

        // Wait for animation to complete
        const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(animationTime);
        await this.battleManager.delay(adjustedAnimationTime);
        
        // Clean up
        this.removeDeathSlashEffect(slashEffect);

        // Log damage (but don't apply - host handles that)
        this.battleManager.addCombatLog(
            `💥 ${targetName} is struck by the spectral slash for ${this.DEATH_SLASH_DAMAGE} damage!`, 
            targetLocalSide === 'player' ? 'error' : 'success'
        );
    }

    // Remove death slash effect with cleanup
    removeDeathSlashEffect(slashEffect) {
        if (slashEffect && slashEffect.parentNode) {
            this.activeDeathSlashes.delete(slashEffect);
            slashEffect.remove();
        }
    }

    // ============================================
    // EXISTING SCYTHE REAP METHODS (UNCHANGED)
    // ============================================

    // Find target for Skeleton Reaper using priority system
    findReaperTarget(attackerSide, reaperActor) {
        // First priority: Random enemy creature
        const enemyCreatures = this.findAllEnemyCreatures(attackerSide);
        if (enemyCreatures.length > 0) {
            const randomIndex = this.battleManager.getRandomInt(0, enemyCreatures.length - 1);
            return enemyCreatures[randomIndex];
        }

        // No enemy creatures - use fallback system
        const chance = this.battleManager.getRandom();
        
        if (chance < this.HERO_CHANCE) {
            // 10% chance: Target random enemy hero
            const enemyHeroes = this.findAllEnemyHeroes(attackerSide);
            if (enemyHeroes.length > 0) {
                const randomIndex = this.battleManager.getRandomInt(0, enemyHeroes.length - 1);
                return enemyHeroes[randomIndex];
            }
        } else if (chance < this.HERO_CHANCE + this.SELF_HARM_CHANCE) {
            // 25% chance: Target random own creature (excluding self)
            const ownCreatures = this.findAllOwnCreatures(attackerSide, reaperActor);
            if (ownCreatures.length > 0) {
                const randomIndex = this.battleManager.getRandomInt(0, ownCreatures.length - 1);
                return ownCreatures[randomIndex];
            }
        }
        
        // Otherwise, effect fails (65% chance when no enemy creatures)
        return null;
    }

    // Find all enemy creatures
    findAllEnemyCreatures(attackerSide) {
        const targets = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        const creatures = [];
        
        Object.keys(targets).forEach(position => {
            const hero = targets[position];
            if (hero && hero.alive && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        creatures.push({
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
        });
        
        return creatures;
    }

    // Find all enemy heroes
    findAllEnemyHeroes(attackerSide) {
        const targets = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        const heroes = [];
        
        Object.keys(targets).forEach(position => {
            const hero = targets[position];
            if (hero && hero.alive) {
                heroes.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: attackerSide === 'player' ? 'opponent' : 'player'
                });
            }
        });
        
        return heroes;
    }

    // Find all own creatures (excluding the reaper itself)
    findAllOwnCreatures(attackerSide, reaperActor) {
        const targets = attackerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const creatures = [];
        
        Object.keys(targets).forEach(position => {
            const hero = targets[position];
            if (hero && hero.alive && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    // Exclude the reaper itself
                    if (creature.alive && creature !== reaperActor.data) {
                        creatures.push({
                            type: 'creature',
                            hero: hero,
                            creature: creature,
                            creatureIndex: index,
                            position: position,
                            side: attackerSide
                        });
                    }
                });
            }
        });
        
        return creatures;
    }

    // Execute the scythe reap attack with visual effects (host side)
    async executeScytheReapAttack(reaperActor, target, position) {
        const attackerSide = reaperActor.hero.side;
        const reaperElement = this.getReaperElement(attackerSide, position, reaperActor.index);
        const targetElement = this.getTargetElement(target);
        
        if (!reaperElement) {
            console.error('Skeleton Reaper element not found, cannot create scythe');
            return;
        }

        if (!targetElement) {
            console.error('Target element not found, cannot create scythe');
            return;
        }
        
        // Create and execute scythe reap animation
        const scytheEffect = this.createScytheReapEffect(reaperElement, targetElement);
        if (!scytheEffect) {
            console.error('Failed to create scythe reap effect');
            return;
        }

        this.activeScytheEffects.add(scytheEffect);

        // Calculate speed-adjusted animation time
        const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.SCYTHE_ANIMATION_TIME);
        
        // Wait for scythe to appear and reach target
        await this.battleManager.delay(adjustedAnimationTime * 0.3); // 30% of animation time
        
        // Apply massive damage when scythe hits (only host applies actual damage)
        this.applyScytheDamage(target, reaperActor.data);
        
        // Add dramatic impact effect
        this.createDeathReapImpactEffect(targetElement);
        
        // Wait for the rest of the scythe animation to complete
        await this.battleManager.delay(adjustedAnimationTime * 0.7);
        
        // Clean up scythe effect
        this.removeScytheEffect(scytheEffect);

        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `💀⚡ The spectral scythe reaps ${targetName}'s soul, dealing ${this.SCYTHE_DAMAGE} damage!`, 
            'warning'
        );
    }

    // Get the DOM element for Skeleton Reaper creature
    getReaperElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for a target (reused from other creatures)
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

    // Create dramatic scythe reap effect
    createScytheReapEffect(fromElement, toElement) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create scythe effect: missing elements', { fromElement: !!fromElement, toElement: !!toElement });
            return null;
        }

        // Additional validation: ensure elements are still in DOM
        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            console.warn('Cannot create scythe effect: elements not in DOM');
            return null;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            // Validate that elements have valid dimensions
            if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
                console.warn('Cannot create scythe effect: elements have invalid dimensions');
                return null;
            }

            // Calculate positions
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid scythe coordinates detected:', { fromX, fromY, toX, toY });
                return null;
            }

            // Calculate distance and angle
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

            // Create the scythe trail effect element
            const scytheEffect = document.createElement('div');
            scytheEffect.className = 'skeleton-reaper-scythe';
            
            // Calculate speed-adjusted animation time for CSS
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.SCYTHE_ANIMATION_TIME);
            
            scytheEffect.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: ${distance}px;
                height: 12px;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(192, 192, 192, 0.9) 10%, 
                    rgba(211, 211, 211, 1) 50%, 
                    rgba(169, 169, 169, 1) 80%, 
                    rgba(255, 255, 255, 0.9) 95%, 
                    transparent 100%);
                transform-origin: 0% 50%;
                transform: rotate(${angle}deg);
                z-index: 1500;
                pointer-events: none;
                border-radius: 6px;
                box-shadow: 
                    0 0 20px rgba(211, 211, 211, 1),
                    0 0 40px rgba(192, 192, 192, 0.8),
                    0 0 60px rgba(169, 169, 169, 0.6),
                    inset 0 3px 0 rgba(255, 255, 255, 0.4);
                animation: scytheReap ${adjustedAnimationTime}ms ease-out forwards;
                --scythe-angle: ${angle}deg;
                --scythe-distance: ${distance}px;
            `;

            // Add spectral energy effects
            const spectralAura = document.createElement('div');
            spectralAura.className = 'spectral-aura';
            spectralAura.style.cssText = `
                position: absolute;
                top: -8px;
                left: 0;
                right: 0;
                height: 28px;
                background: radial-gradient(ellipse, 
                    rgba(211, 211, 211, 0.7) 0%, 
                    rgba(192, 192, 192, 0.5) 50%, 
                    transparent 100%);
                border-radius: 14px;
                animation: spectralPulse ${adjustedAnimationTime}ms ease-in-out infinite;
                filter: blur(2px);
            `;
            
            scytheEffect.appendChild(spectralAura);

            // Add scythe blade edge
            const scytheBlade = document.createElement('div');
            scytheBlade.className = 'scythe-blade';
            scytheBlade.style.cssText = `
                position: absolute;
                top: 3px;
                left: 20%;
                width: 60%;
                height: 6px;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255, 255, 255, 0.9) 20%, 
                    rgba(220, 220, 220, 1) 50%, 
                    rgba(255, 255, 255, 0.9) 80%, 
                    transparent 100%);
                border-radius: 3px;
                animation: bladeFlash ${adjustedAnimationTime * 0.4}ms ease-out;
                filter: brightness(1.5);
            `;
            
            scytheEffect.appendChild(scytheBlade);

            // Add reaper souls effect
            for (let i = 0; i < 8; i++) {
                const soul = document.createElement('div');
                soul.className = 'reaper-soul';
                const soulDelay = i * 50;
                soul.style.cssText = `
                    position: absolute;
                    top: ${4 + (i % 2) * 4}px;
                    left: ${10 + i * 10}%;
                    width: 4px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 50%;
                    animation: soulEscape ${adjustedAnimationTime * 0.6}ms ease-out ${soulDelay}ms forwards;
                    opacity: 0;
                    box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
                `;
                
                scytheEffect.appendChild(soul);
            }
            
            document.body.appendChild(scytheEffect);
            
            console.log(`Created spectral scythe reap: ${angle.toFixed(1)}°, distance: ${distance.toFixed(1)}px, animation time: ${adjustedAnimationTime}ms`);
            return scytheEffect;
            
        } catch (error) {
            console.error('Error creating scythe reap effect:', error);
            return null;
        }
    }

    // Create dramatic death reap impact effect at target location
    createDeathReapImpactEffect(targetElement) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Create soul reap mark on target
        this.createSoulReapMark(targetElement, centerX, centerY);

        const impact = document.createElement('div');
        impact.className = 'death-reap-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, 
                rgba(255, 255, 255, 0.9) 0%, 
                rgba(211, 211, 211, 0.8) 30%, 
                rgba(192, 192, 192, 0.6) 60%, 
                rgba(169, 169, 169, 0.4) 80%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: deathReapImpact 0.8s ease-out forwards;
            box-shadow: 
                0 0 30px rgba(255, 255, 255, 1),
                0 0 60px rgba(211, 211, 211, 0.8),
                0 0 90px rgba(192, 192, 192, 0.6);
        `;

        // Add spectral explosion particles
        for (let i = 0; i < 16; i++) {
            const particle = document.createElement('div');
            particle.className = 'death-reap-particle';
            const angle = (i * 22.5) * (Math.PI / 180);
            const distance = 40 + Math.random() * 30;
            const particleX = Math.cos(angle) * distance;
            const particleY = Math.sin(angle) * distance;
            
            particle.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                width: 6px;
                height: 6px;
                background: rgba(255, 0, 255, 0.9);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: deathParticleExplosion 1s ease-out forwards;
                --particle-x: ${particleX}px;
                --particle-y: ${particleY}px;
                box-shadow: 0 0 10px rgba(255, 0, 255, 0.8);
                filter: brightness(1.5);
            `;
            
            impact.appendChild(particle);
        }

        // Add soul escape effect
        const soulEscape = document.createElement('div');
        soulEscape.className = 'soul-escape-effect';
        soulEscape.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, 
                rgba(255, 255, 255, 0.9) 0%, 
                rgba(255, 0, 255, 0.7) 50%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: soulEscapeUp 1.2s ease-out forwards;
            opacity: 0.8;
        `;
        
        impact.appendChild(soulEscape);

        document.body.appendChild(impact);

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 1200);
    }

    // Create soul reap mark on the target
    createSoulReapMark(targetElement, centerX, centerY) {
        if (!targetElement) return;

        // Create main soul reap mark
        const reapMark = document.createElement('div');
        reapMark.className = 'target-soul-reap-mark';
        
        // Curved scythe slash angle
        const scytheAngle = 135 + (Math.random() - 0.5) * 30; // Curved scythe angle with variance
        
        reapMark.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 100px;
            height: 8px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.9) 5%, 
                rgba(255, 0, 255, 1) 50%, 
                rgba(255, 255, 255, 0.9) 95%, 
                transparent 100%);
            transform: translate(-50%, -50%) rotate(${scytheAngle}deg);
            z-index: 1650;
            pointer-events: none;
            border-radius: 4px;
            box-shadow: 
                0 0 20px rgba(255, 0, 255, 1),
                0 0 40px rgba(138, 43, 226, 0.8),
                inset 0 2px 0 rgba(255, 255, 255, 0.7),
                inset 0 -2px 0 rgba(0, 0, 0, 0.5);
            animation: targetSoulReapAppear 0.6s ease-out forwards;
            --scythe-angle: ${scytheAngle}deg;
        `;

        // Add reap glow effect
        const reapGlow = document.createElement('div');
        reapGlow.className = 'target-reap-glow';
        reapGlow.style.cssText = `
            position: absolute;
            left: -15px;
            top: -12px;
            width: 130px;
            height: 32px;
            background: radial-gradient(ellipse, 
                rgba(255, 0, 255, 0.7) 0%, 
                rgba(138, 43, 226, 0.5) 50%, 
                transparent 100%);
            border-radius: 50%;
            animation: targetReapGlow 0.6s ease-out forwards;
            filter: blur(3px);
        `;
        
        reapMark.appendChild(reapGlow);

        document.body.appendChild(reapMark);

        // Remove reap mark after animation
        setTimeout(() => {
            if (reapMark.parentNode) {
                reapMark.remove();
            }
        }, 1200);
    }

    // Remove scythe effect with cleanup
    removeScytheEffect(scytheEffect) {
        if (scytheEffect && scytheEffect.parentNode) {
            this.activeScytheEffects.delete(scytheEffect);
            scytheEffect.remove();
        }
    }

    // Apply Skeleton Reaper massive damage to target
    applyScytheDamage(target, attackingReaper = null) {
        const damage = this.SCYTHE_DAMAGE;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'attack', 
                attacker: attackingReaper // Pass the attacking reaper
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
                source: 'attack', 
                attacker: attackingReaper 
            });
        }
    }


    // Send scythe reap data to guest for synchronization
    sendScytheReapUpdate(reaperActor, target, position) {
        const attackerSide = reaperActor.hero.side;
        
        this.battleManager.sendBattleUpdate('skeleton_reaper_scythe_reap', {
            reaperData: {
                side: attackerSide,
                position: position,
                creatureIndex: reaperActor.index,
                name: reaperActor.data.name,
                absoluteSide: reaperActor.hero.absoluteSide
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
            damage: this.SCYTHE_DAMAGE,
            animationTime: this.SCYTHE_ANIMATION_TIME
        });
    }

    // Handle Skeleton Reaper scythe reap on guest side
    handleGuestScytheReap(data) {
        const { reaperData, target, damage, animationTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const reaperLocalSide = (reaperData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀🔪 ${reaperData.name} unleashes its spectral scythe!`, 
            reaperLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestScytheReap(reaperData, target, animationTime, myAbsoluteSide);
    }

    // Create scythe reap on guest side
    async createGuestScytheReap(reaperData, targetData, animationTime, myAbsoluteSide) {
        const reaperLocalSide = (reaperData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const reaperElement = this.getReaperElement(
            reaperLocalSide,
            reaperData.position,
            reaperData.creatureIndex
        );

        if (!reaperElement) {
            console.warn('Skeleton Reaper element not found on guest side');
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
            const scytheEffect = this.createScytheReapEffect(reaperElement, targetElement);
            if (scytheEffect) {
                this.activeScytheEffects.add(scytheEffect);
            }

            // Calculate speed-adjusted animation time
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(animationTime);
            
            // Wait for scythe to appear, then show impact
            await this.battleManager.delay(adjustedAnimationTime * 0.3);
            
            this.createDeathReapImpactEffect(targetElement);
            
            // Wait for the rest of the animation
            await this.battleManager.delay(adjustedAnimationTime * 0.7);
            
            this.removeScytheEffect(scytheEffect);

            // Log damage for target (but don't apply actual damage - host handles that)
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            this.battleManager.addCombatLog(
                `💀⚡ The spectral scythe reaps ${targetName}'s soul for ${this.SCYTHE_DAMAGE} damage!`,
                'warning'
            );
        } else {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        }
    }

    // Clean up all active scythe effects (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeScytheEffects.size} active Skeleton Reaper scythe effects and ${this.activeDeathSlashes.size} death slash effects`);
        
        // Clean up scythe effects
        this.activeScytheEffects.forEach(scytheEffect => {
            try {
                if (scytheEffect && scytheEffect.parentNode) {
                    scytheEffect.remove();
                }
            } catch (error) {
                console.warn('Error removing scythe effect during cleanup:', error);
            }
        });
        
        // Clean up death slash effects
        this.activeDeathSlashes.forEach(slashEffect => {
            try {
                if (slashEffect && slashEffect.parentNode) {
                    slashEffect.remove();
                }
            } catch (error) {
                console.warn('Error removing death slash effect during cleanup:', error);
            }
        });
        
        this.activeScytheEffects.clear();
        this.activeDeathSlashes.clear();

        // Also remove any orphaned effects
        try {
            const orphanedScythes = document.querySelectorAll('.skeleton-reaper-scythe');
            const orphanedSlashes = document.querySelectorAll('.skeleton-reaper-death-slash');
            
            orphanedScythes.forEach(scytheEffect => {
                if (scytheEffect.parentNode) {
                    scytheEffect.remove();
                }
            });
            
            orphanedSlashes.forEach(slashEffect => {
                if (slashEffect.parentNode) {
                    slashEffect.remove();
                }
            });
            
            if (orphanedScythes.length > 0 || orphanedSlashes.length > 0) {
                console.log(`Cleaned up ${orphanedScythes.length} orphaned scythe effects and ${orphanedSlashes.length} orphaned death slash effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned effects:', error);
        }
    }

    // Inject CSS styles for Skeleton Reaper effects
    injectSkeletonReaperStyles() {
        if (document.getElementById('skeletonReaperCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'skeletonReaperCreatureStyles';
        style.textContent = `
            /* Skeleton Reaper Scythe Effects */
            .skeleton-reaper-scythe {
                border-radius: 6px;
                position: relative;
                overflow: visible;
                filter: drop-shadow(0 0 8px rgba(255, 0, 255, 0.8));
            }

            .spectral-aura {
                mix-blend-mode: screen;
            }

            .scythe-blade {
                mix-blend-mode: overlay;
            }

            @keyframes scytheReap {
                0% { 
                    opacity: 0;
                    transform: rotate(var(--scythe-angle, 0deg)) scale(0.3) scaleX(0.1);
                    filter: brightness(2) blur(4px);
                }
                20% {
                    opacity: 1;
                    transform: rotate(var(--scythe-angle, 0deg)) scale(1.1) scaleX(0.8);
                    filter: brightness(1.8) blur(2px);
                }
                50% {
                    opacity: 1;
                    transform: rotate(var(--scythe-angle, 0deg)) scale(1) scaleX(1);
                    filter: brightness(1.5) blur(1px);
                }
                80% {
                    opacity: 0.9;
                    transform: rotate(var(--scythe-angle, 0deg)) scale(1) scaleX(1);
                    filter: brightness(1.2) blur(0px);
                }
                100% { 
                    opacity: 0;
                    transform: rotate(var(--scythe-angle, 0deg)) scale(0.8) scaleX(0.9);
                    filter: brightness(1) blur(2px);
                }
            }

            @keyframes spectralPulse {
                0%, 100% { 
                    opacity: 0.7;
                    transform: scaleY(0.8);
                    filter: blur(2px);
                }
                50% { 
                    opacity: 1;
                    transform: scaleY(1.3);
                    filter: blur(1px);
                }
            }

            @keyframes bladeFlash {
                0% { 
                    opacity: 0;
                    transform: scaleX(0);
                    filter: brightness(2);
                }
                30% { 
                    opacity: 1;
                    transform: scaleX(1);
                    filter: brightness(3);
                }
                70% { 
                    opacity: 0.8;
                    transform: scaleX(1);
                    filter: brightness(2);
                }
                100% { 
                    opacity: 0;
                    transform: scaleX(1);
                    filter: brightness(1);
                }
            }

            @keyframes soulEscape {
                0% {
                    opacity: 0;
                    transform: scale(0.5) translateY(0px);
                }
                50% {
                    opacity: 1;
                    transform: scale(1) translateY(-10px);
                }
                100% {
                    opacity: 0;
                    transform: scale(0.2) translateY(-25px);
                }
            }

            @keyframes deathReapImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                    filter: brightness(2);
                }
                25% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.3) rotate(90deg);
                    filter: brightness(1.8);
                }
                60% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.6) rotate(180deg);
                    filter: brightness(1.5);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(270deg);
                    filter: brightness(1);
                }
            }

            @keyframes deathParticleExplosion {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                    filter: brightness(2);
                }
                100% {
                    opacity: 0;
                    transform: translate(calc(-50% + var(--particle-x)), calc(-50% + var(--particle-y))) scale(0.2);
                    filter: brightness(1);
                }
            }

            @keyframes soulEscapeUp {
                0% {
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1);
                }
                50% {
                    opacity: 0.6;
                    transform: translate(-50%, -70px) scale(1.5);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -120px) scale(0.3);
                }
            }

            /* Target Soul Reap Mark Animations */
            @keyframes targetSoulReapAppear {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--scythe-angle, 135deg)) scaleX(0) scaleY(2);
                    filter: brightness(3) blur(4px);
                }
                25% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--scythe-angle, 135deg)) scaleX(1.3) scaleY(1.8);
                    filter: brightness(2.5) blur(2px);
                }
                60% {
                    opacity: 0.9;
                    transform: translate(-50%, -50%) rotate(var(--scythe-angle, 135deg)) scaleX(1) scaleY(1);
                    filter: brightness(2) blur(1px);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--scythe-angle, 135deg)) scaleX(0.8) scaleY(0.8);
                    filter: brightness(1) blur(2px);
                }
            }

            @keyframes targetReapGlow {
                0% {
                    opacity: 0;
                    transform: scale(0.5);
                    filter: blur(3px);
                }
                40% {
                    opacity: 1;
                    transform: scale(1.4);
                    filter: blur(2px);
                }
                100% {
                    opacity: 0;
                    transform: scale(2.5);
                    filter: blur(5px);
                }
            }

            /* Death Slash Storm Effects */
            .skeleton-reaper-death-slash {
                border-radius: 10px;
                position: relative;
                overflow: visible;
                filter: drop-shadow(0 0 15px rgba(255, 0, 255, 1));
            }

            .death-slash-trail {
                mix-blend-mode: screen;
            }

            @keyframes deathSlashArc {
                0% { 
                    opacity: 0;
                    transform: rotate(var(--slash-angle, 0deg)) scale(0.2) scaleX(0.1);
                    filter: brightness(3) blur(6px);
                }
                15% {
                    opacity: 1;
                    transform: rotate(calc(var(--slash-angle, 0deg) + var(--slash-curvature, 15deg))) scale(0.8) scaleX(0.6);
                    filter: brightness(2.5) blur(3px);
                }
                35% {
                    opacity: 1;
                    transform: rotate(calc(var(--slash-angle, 0deg) + var(--slash-curvature, 15deg) * 0.5)) scale(1.2) scaleX(1);
                    filter: brightness(2) blur(2px);
                }
                70% {
                    opacity: 0.9;
                    transform: rotate(var(--slash-angle, 0deg)) scale(1) scaleX(1);
                    filter: brightness(1.5) blur(1px);
                }
                100% { 
                    opacity: 0;
                    transform: rotate(calc(var(--slash-angle, 0deg) - var(--slash-curvature, 15deg) * 0.3)) scale(0.6) scaleX(0.8);
                    filter: brightness(1) blur(3px);
                }
            }

            @keyframes spectralDeathTrail {
                0%, 100% { 
                    opacity: 0.6;
                    transform: scaleY(0.6);
                    filter: blur(3px);
                }
                50% { 
                    opacity: 1;
                    transform: scaleY(1.5);
                    filter: blur(2px);
                }
            }

            @keyframes deathRuneFlicker {
                0% {
                    opacity: 0;
                    transform: scale(0.3) rotate(0deg);
                }
                30% {
                    opacity: 1;
                    transform: scale(1.2) rotate(180deg);
                }
                70% {
                    opacity: 0.8;
                    transform: scale(1) rotate(360deg);
                }
                100% {
                    opacity: 0;
                    transform: scale(0.2) rotate(540deg);
                }
            }

            /* Enhanced creature glow when Skeleton Reaper is preparing to attack */
            .creature-icon.reaper-charging .creature-sprite {
                filter: brightness(1.8) drop-shadow(0 0 15px rgba(255, 0, 255, 0.9));
                animation: reaperChargeGlow 1s ease-in-out infinite alternate;
            }

            @keyframes reaperChargeGlow {
                0% { 
                    filter: brightness(1.8) drop-shadow(0 0 15px rgba(255, 0, 255, 0.9));
                }
                100% { 
                    filter: brightness(2.3) drop-shadow(0 0 30px rgba(138, 43, 226, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const SkeletonReaperHelpers = {
    // Check if any creature in a list is Skeleton Reaper
    hasSkeletonReaperInList(creatures) {
        return creatures.some(creature => SkeletonReaperCreature.isSkeletonReaper(creature.name));
    },

    // Get all Skeleton Reaper creatures from a list
    getSkeletonReaperFromList(creatures) {
        return creatures.filter(creature => SkeletonReaperCreature.isSkeletonReaper(creature.name));
    },

    // Add charging visual effect to Skeleton Reaper
    addChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('reaper-charging');
        }
    },

    // Remove charging visual effect from Skeleton Reaper
    removeChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('reaper-charging');
        }
    }
};

export default SkeletonReaperCreature;