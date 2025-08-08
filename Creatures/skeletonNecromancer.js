// ./Creatures/skeletonNecromancer.js - Skeleton Necromancer Creature Revival Module

export class SkeletonNecromancerCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        // Skeleton Necromancer stats
        this.REVIVAL_HP = 1; // Revive creatures with 1 HP
        this.HERO_REVIVAL_HP = 1; // Revive heroes with 1 HP (death effect)
        
        // Inject CSS styles
        this.injectSkeletonNecromancerStyles();
        
        console.log('💀 Skeleton Necromancer Creature module initialized');
    }

    // Check if a creature is Skeleton Necromancer
    static isSkeletonNecromancer(creatureName) {
        return creatureName === 'SkeletonNecromancer';
    }

    // Execute Skeleton Necromancer special attack (revival)
    async executeSpecialAttack(necromancerActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const necromancerCreature = necromancerActor.data;
        const necromancerHero = necromancerActor.hero;
        const attackerSide = necromancerHero.side;
        
        // Safety check: ensure Skeleton Necromancer is still alive
        if (!necromancerCreature.alive || necromancerCreature.currentHp <= 0) {
            console.log(`Skeleton Necromancer is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `💀 ${necromancerCreature.name} channels dark necromantic energy!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find defeated allied creatures
        const defeatedAllies = this.findDefeatedAlliedCreatures(attackerSide);
        
        if (!defeatedAllies || defeatedAllies.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${necromancerCreature.name} finds no fallen allies to revive! The spell fizzles.`, 
                'info'
            );
            // Add brief channeling effect even when it fizzles
            this.addChannelingEffect(attackerSide, position, necromancerActor.index);
            await this.battleManager.delay(800);
            this.removeChannelingEffect(attackerSide, position, necromancerActor.index);
            return;
        }
        
        // Select random defeated ally
        const randomIndex = this.battleManager.getRandomInt(0, defeatedAllies.length - 1);
        const targetData = defeatedAllies[randomIndex];
        
        // Log target selection
        this.battleManager.addCombatLog(
            `🎯 ${necromancerCreature.name} targets the fallen ${targetData.creature.name}!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE starting host effect
        this.sendRevivalUpdate(necromancerActor, targetData, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute revival with visual effects
        await this.executeRevival(necromancerActor, targetData, position);
    }

    // ============================================
    // DEATH EFFECT: HERO REVIVAL
    // ============================================

    // Execute death effect when Skeleton Necromancer dies (revive a random dead allied hero)
    async executeHeroRevivalDeath(dyingNecromancer, heroOwner, position, side) {
        if (!this.battleManager.isAuthoritative) return;

        const necromancerCreature = dyingNecromancer;
        const necromancerSide = side;
        
        this.battleManager.addCombatLog(
            `💀✨ ${necromancerCreature.name} channels its final breath into a powerful revival spell!`, 
            necromancerSide === 'player' ? 'info' : 'info'
        );

        // Find dead allied heroes
        const deadAlliedHeroes = this.findDeadAlliedHeroes(necromancerSide);
        
        if (!deadAlliedHeroes || deadAlliedHeroes.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${necromancerCreature.name}'s death magic finds no fallen heroes to revive!`, 
                'info'
            );
            return;
        }

        // Select random dead hero
        const randomIndex = this.battleManager.getRandomInt(0, deadAlliedHeroes.length - 1);
        const targetHeroData = deadAlliedHeroes[randomIndex];

        this.battleManager.addCombatLog(
            `🎯 ${necromancerCreature.name}'s death magic targets the fallen ${targetHeroData.hero.name}!`, 
            necromancerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE starting host effect
        this.sendHeroRevivalDeathUpdate(necromancerCreature, heroOwner, targetHeroData, position, necromancerSide);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(100);

        // Execute hero revival with dramatic visual effects
        await this.executeHeroRevivalWithDramaticEffects(necromancerCreature, targetHeroData, position, necromancerSide);
    }

    // Find all dead allied heroes
    findDeadAlliedHeroes(attackerSide) {
        const deadHeroes = [];
        const allies = attackerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        ['left', 'center', 'right'].forEach(heroPosition => {
            const hero = allies[heroPosition];
            if (hero && !hero.alive) {
                deadHeroes.push({
                    hero: hero,
                    position: heroPosition,
                    side: attackerSide
                });
            }
        });
        
        return deadHeroes;
    }

    // Execute hero revival with dramatic effects
    async executeHeroRevivalWithDramaticEffects(necromancerCreature, targetHeroData, necromancerPosition, necromancerSide) {
        const { hero: targetHero, position: targetPosition, side: targetSide } = targetHeroData;
        
        // Add dramatic channeling effect 
        this.addDramaticNecromancyEffect(targetSide, targetPosition);
        
        // Longer channeling delay for dramatic effect
        await this.battleManager.delay(1200);
        
        // Revive the hero with 1 HP
        targetHero.currentHp = this.HERO_REVIVAL_HP;
        targetHero.alive = true;
        
        this.battleManager.addCombatLog(
            `🌟💀 ${targetHero.name} rises from death, empowered by ${necromancerCreature.name}'s sacrifice!`, 
            targetSide === 'player' ? 'success' : 'error'
        );

        // Apply dramatic visual hero revival effects
        await this.animateDramaticHeroRevival(targetSide, targetPosition, targetHero);

        // Update hero visuals to show it's alive again
        this.updateRevivedHeroVisuals(targetSide, targetPosition);

        // Update hero health bar
        this.battleManager.updateHeroHealthBar(targetSide, targetPosition, targetHero.currentHp, targetHero.maxHp);

        // Remove dramatic effect
        this.removeDramaticNecromancyEffect(targetSide, targetPosition);

        this.battleManager.addCombatLog(
            `💫 The hero revival is complete! Death could not claim ${targetHero.name}!`, 
            'info'
        );
    }

    // Add dramatic necromancy visual effect for hero revival
    addDramaticNecromancyEffect(side, position) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;

        // Add dramatic necromancy overlay
        const overlay = document.createElement('div');
        overlay.className = 'dramatic-necromancy-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: -20px;
            left: -20px;
            right: -20px;
            bottom: -20px;
            background: radial-gradient(circle, 
                rgba(138, 43, 226, 0.3) 0%, 
                rgba(75, 0, 130, 0.5) 50%, 
                rgba(25, 25, 112, 0.3) 100%);
            border-radius: 15px;
            z-index: 1000;
            pointer-events: none;
            animation: dramaticNecromancyPulse 1.0s ease-in-out infinite;
        `;
        
        heroElement.style.position = 'relative';
        heroElement.appendChild(overlay);

        // Add floating necromancy symbols
        this.addFloatingNecromancySymbols(heroElement);
    }

    // Add floating necromancy symbols around the hero
    addFloatingNecromancySymbols(heroElement) {
        const symbols = ['💀', '✨', '🌟', '💜', '🔮'];
        
        for (let i = 0; i < 5; i++) {
            const symbol = document.createElement('div');
            symbol.className = 'floating-necromancy-symbol';
            symbol.textContent = symbols[i];
            symbol.style.cssText = `
                position: absolute;
                font-size: 24px;
                color: rgba(138, 43, 226, 0.9);
                text-shadow: 0 0 10px rgba(138, 43, 226, 0.8);
                z-index: 1001;
                pointer-events: none;
                animation: floatNecromancySymbol 2.0s ease-in-out infinite;
                animation-delay: ${i * 0.2}s;
                top: ${20 + i * 15}%;
                left: ${10 + i * 20}%;
            `;
            
            heroElement.appendChild(symbol);
        }
    }

    // Remove dramatic necromancy effect
    removeDramaticNecromancyEffect(side, position) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;

        const overlay = heroElement.querySelector('.dramatic-necromancy-overlay');
        if (overlay) {
            overlay.remove();
        }

        const symbols = heroElement.querySelectorAll('.floating-necromancy-symbol');
        symbols.forEach(symbol => symbol.remove());
    }

    // Animate dramatic hero revival
    async animateDramaticHeroRevival(side, position, hero) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;

        const card = heroElement.querySelector('.battle-hero-card');
        if (!card) return;

        // Create revival burst effect
        const burstEffect = document.createElement('div');
        burstEffect.className = 'hero-revival-burst';
        burstEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, 
                rgba(255, 215, 0, 0.8) 0%, 
                rgba(138, 43, 226, 0.6) 50%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%) scale(0);
            z-index: 1002;
            pointer-events: none;
            animation: heroRevivalBurst 1.0s ease-out forwards;
        `;

        heroElement.appendChild(burstEffect);

        // Animate the hero card
        card.style.animation = 'heroRevivalGlow 1.0s ease-out forwards';

        // Wait for animation to complete
        await this.battleManager.delay(1000);

        // Clean up burst effect
        if (burstEffect.parentNode) {
            burstEffect.remove();
        }

        // Reset card animation
        card.style.animation = '';
    }

    // Update visuals for revived hero
    updateRevivedHeroVisuals(side, position) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;

        const card = heroElement.querySelector('.battle-hero-card');
        if (card) {
            // Remove defeated state
            card.classList.remove('defeated');
            
            // Reset visual state
            card.style.filter = '';
            card.style.opacity = '';
        }
    }

    // Send hero revival death data to guest for synchronization
    sendHeroRevivalDeathUpdate(necromancerCreature, heroOwner, targetHeroData, position, necromancerSide) {
        this.battleManager.sendBattleUpdate('skeleton_necromancer_hero_revival_death', {
            necromancerData: {
                side: necromancerSide,
                position: position,
                creatureIndex: heroOwner.creatures.indexOf(necromancerCreature),
                name: necromancerCreature.name,
                absoluteSide: heroOwner.absoluteSide
            },
            targetHeroData: {
                heroPosition: targetHeroData.position,
                heroName: targetHeroData.hero.name,
                heroAbsoluteSide: targetHeroData.hero.absoluteSide
            },
            revivalHp: this.HERO_REVIVAL_HP
        });
    }

    // Handle hero revival death on guest side
    async handleGuestHeroRevivalDeath(data) {
        const { necromancerData, targetHeroData, revivalHp } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const necromancerLocalSide = (necromancerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀✨ ${necromancerData.name} channels its final breath into a powerful revival spell!`, 
            'info'
        );

        this.battleManager.addCombatLog(
            `🎯 ${necromancerData.name}'s death magic targets the fallen ${targetHeroData.heroName}!`, 
            necromancerLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest hero revival animation
        await this.createGuestHeroRevival(necromancerData, targetHeroData, revivalHp, myAbsoluteSide);
    }

    // Create hero revival on guest side
    async createGuestHeroRevival(necromancerData, targetHeroData, revivalHp, myAbsoluteSide) {
        const targetLocalSide = (targetHeroData.heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find target hero
        const targetHeroes = targetLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const targetHero = targetHeroes[targetHeroData.heroPosition];
        
        if (!targetHero) {
            console.warn('Target hero not found on guest side for revival');
            return;
        }
        
        // Add dramatic effect
        this.addDramaticNecromancyEffect(targetLocalSide, targetHeroData.heroPosition);
        
        // Longer channeling delay
        await this.battleManager.delay(1200);
        
        // Revive the hero
        targetHero.currentHp = revivalHp;
        targetHero.alive = true;
        
        this.battleManager.addCombatLog(
            `🌟💀 ${targetHero.name} rises from death, empowered by ${necromancerData.name}'s sacrifice!`, 
            targetLocalSide === 'player' ? 'success' : 'error'
        );

        // Apply dramatic visual revival effects
        await this.animateDramaticHeroRevival(targetLocalSide, targetHeroData.heroPosition, targetHero);

        // Update hero visuals
        this.updateRevivedHeroVisuals(targetLocalSide, targetHeroData.heroPosition);
        this.battleManager.updateHeroHealthBar(targetLocalSide, targetHeroData.heroPosition, targetHero.currentHp, targetHero.maxHp);

        // Remove dramatic effect
        this.removeDramaticNecromancyEffect(targetLocalSide, targetHeroData.heroPosition);

        this.battleManager.addCombatLog(
            `💫 The hero revival is complete! Death could not claim ${targetHero.name}!`, 
            'info'
        );
    }

    // ============================================
    // EXISTING CREATURE REVIVAL METHODS
    // ============================================

    // Find all defeated allied creatures
    findDefeatedAlliedCreatures(attackerSide) {
        const defeatedAllies = [];
        const allies = attackerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        ['left', 'center', 'right'].forEach(heroPosition => {
            const hero = allies[heroPosition];
            if (hero && hero.alive && hero.creatures) {
                hero.creatures.forEach((creature, creatureIndex) => {
                    if (!creature.alive) {
                        defeatedAllies.push({
                            hero: hero,
                            creature: creature,
                            creatureIndex: creatureIndex,
                            heroPosition: heroPosition,
                            side: attackerSide
                        });
                    }
                });
            }
        });
        
        return defeatedAllies;
    }

    // Execute the revival with visual effects
    async executeRevival(necromancerActor, targetData, position) {
        const { hero: targetHero, creature: targetCreature, creatureIndex: targetIndex, heroPosition: targetPosition, side: targetSide } = targetData;
        
        // Add channeling effect to necromancer
        this.addChannelingEffect(necromancerActor.hero.side, position, necromancerActor.index);
        
        // Brief channeling delay
        await this.battleManager.delay(600);
        
        // Revive the creature with 1 HP
        targetCreature.currentHp = this.REVIVAL_HP;
        targetCreature.alive = true;
        
        this.battleManager.addCombatLog(
            `✨ ${targetCreature.name} rises from the dead with dark energy!`, 
            targetSide === 'player' ? 'success' : 'error'
        );

        // Apply visual necromancy effects (reuse existing necromancy system)
        if (this.battleManager.necromancyManager) {
            await this.battleManager.necromancyManager.animateNecromancyRevival(
                targetSide, targetPosition, targetIndex, targetCreature
            );
            
            // Update health bar with revival animation
            this.battleManager.necromancyManager.updateCreatureHealthBarWithRevival(
                targetSide, targetPosition, targetIndex, 
                targetCreature.currentHp, targetCreature.maxHp, true
            );
        }

        // Update creature visuals to show it's alive again
        this.updateRevivedCreatureVisuals(targetSide, targetPosition, targetIndex);

        // Update creature visuals through battle manager
        this.battleManager.updateCreatureVisuals(targetSide, targetPosition, targetHero.creatures);

        // Remove channeling effect
        this.removeChannelingEffect(necromancerActor.hero.side, position, necromancerActor.index);

        this.battleManager.addCombatLog(
            `💀 Necromantic revival complete!`, 
            'info'
        );
    }

    // Add channeling visual effect
    addChannelingEffect(side, position, creatureIndex) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (creatureElement) {
            creatureElement.classList.add('necromancer-channeling');
        }
    }

    // Remove channeling visual effect
    removeChannelingEffect(side, position, creatureIndex) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (creatureElement) {
            creatureElement.classList.remove('necromancer-channeling');
        }
    }

    // Update visuals for revived creature
    updateRevivedCreatureVisuals(side, position, creatureIndex) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (creatureElement) {
            // Remove defeated state
            creatureElement.classList.remove('defeated');
            
            // Reset sprite visuals
            const sprite = creatureElement.querySelector('.creature-sprite');
            if (sprite) {
                sprite.style.filter = '';
                sprite.style.opacity = '';
            }
        }
    }

    // Send revival data to guest for synchronization
    sendRevivalUpdate(necromancerActor, targetData, position) {
        this.battleManager.sendBattleUpdate('skeleton_necromancer_revival', {
            necromancerData: {
                side: necromancerActor.hero.side,
                position: position,
                creatureIndex: necromancerActor.index,
                name: necromancerActor.data.name,
                absoluteSide: necromancerActor.hero.absoluteSide
            },
            targetData: {
                heroPosition: targetData.heroPosition,
                creatureIndex: targetData.creatureIndex,
                creatureName: targetData.creature.name,
                heroAbsoluteSide: targetData.hero.absoluteSide
            },
            revivalHp: this.REVIVAL_HP
        });
    }

    // Handle revival on guest side
    async handleGuestRevival(data) {
        const { necromancerData, targetData, revivalHp } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const necromancerLocalSide = (necromancerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀 ${necromancerData.name} channels dark necromantic energy!`, 
            necromancerLocalSide === 'player' ? 'success' : 'error'
        );

        this.battleManager.addCombatLog(
            `🎯 ${necromancerData.name} targets the fallen ${targetData.creatureName}!`, 
            necromancerLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest revival animation
        await this.createGuestRevival(necromancerData, targetData, revivalHp, myAbsoluteSide);
    }

    // Create revival on guest side
    async createGuestRevival(necromancerData, targetData, revivalHp, myAbsoluteSide) {
        const necromancerLocalSide = (necromancerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetLocalSide = (targetData.heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Add channeling effect to necromancer
        this.addChannelingEffect(necromancerLocalSide, necromancerData.position, necromancerData.creatureIndex);
        
        // Brief channeling delay
        await this.battleManager.delay(600);
        
        // Find target hero and creature
        const targetHeroes = targetLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const targetHero = targetHeroes[targetData.heroPosition];
        
        if (!targetHero || !targetHero.creatures[targetData.creatureIndex]) {
            console.warn('Target creature not found on guest side');
            this.removeChannelingEffect(necromancerLocalSide, necromancerData.position, necromancerData.creatureIndex);
            return;
        }
        
        const targetCreature = targetHero.creatures[targetData.creatureIndex];
        
        // Revive the creature
        targetCreature.currentHp = revivalHp;
        targetCreature.alive = true;
        
        this.battleManager.addCombatLog(
            `✨ ${targetCreature.name} rises from the dead with dark energy!`, 
            targetLocalSide === 'player' ? 'success' : 'error'
        );

        // Apply visual necromancy effects
        if (this.battleManager.necromancyManager) {
            await this.battleManager.necromancyManager.animateNecromancyRevival(
                targetLocalSide, targetData.heroPosition, targetData.creatureIndex, targetCreature
            );
            
            // Update health bar with revival animation
            this.battleManager.necromancyManager.updateCreatureHealthBarWithRevival(
                targetLocalSide, targetData.heroPosition, targetData.creatureIndex, 
                targetCreature.currentHp, targetCreature.maxHp, true
            );
        }

        // Update creature visuals
        this.updateRevivedCreatureVisuals(targetLocalSide, targetData.heroPosition, targetData.creatureIndex);
        this.battleManager.updateCreatureVisuals(targetLocalSide, targetData.heroPosition, targetHero.creatures);

        // Remove channeling effect
        this.removeChannelingEffect(necromancerLocalSide, necromancerData.position, necromancerData.creatureIndex);

        this.battleManager.addCombatLog(
            `💀 Necromantic revival complete!`, 
            'info'
        );
    }

    // Cleanup method
    cleanup() {
        console.log('🧹 Cleaning up Skeleton Necromancer effects');
        
        // Remove any channeling effects
        const channelingElements = document.querySelectorAll('.necromancer-channeling');
        channelingElements.forEach(element => {
            element.classList.remove('necromancer-channeling');
        });
        
        // Remove any dramatic necromancy effects
        const dramaticOverlays = document.querySelectorAll('.dramatic-necromancy-overlay');
        dramaticOverlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        });

        // Remove floating symbols
        const floatingSymbols = document.querySelectorAll('.floating-necromancy-symbol');
        floatingSymbols.forEach(symbol => {
            if (symbol.parentNode) {
                symbol.remove();
            }
        });

        // Remove burst effects
        const burstEffects = document.querySelectorAll('.hero-revival-burst');
        burstEffects.forEach(effect => {
            if (effect.parentNode) {
                effect.remove();
            }
        });
        
        // Remove any lingering visual effects
        const necromancerEffects = document.querySelectorAll('.skeleton-necromancer-effect');
        necromancerEffects.forEach(effect => {
            if (effect.parentNode) {
                effect.remove();
            }
        });
    }

    // Inject CSS styles for Skeleton Necromancer effects
    injectSkeletonNecromancerStyles() {
        if (document.getElementById('skeletonNecromancerCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'skeletonNecromancerCreatureStyles';
        style.textContent = `
            /* Skeleton Necromancer Visual Effects */
            .skeleton-necromancer-effect {
                pointer-events: none;
                z-index: 1500;
            }

            /* Enhanced creature glow when Skeleton Necromancer is channeling */
            .creature-icon.necromancer-channeling .creature-sprite {
                filter: brightness(1.4) drop-shadow(0 0 12px rgba(75, 0, 130, 0.8));
                animation: necromancerChannelGlow 1.0s ease-in-out infinite alternate;
            }

            @keyframes necromancerChannelGlow {
                0% { 
                    filter: brightness(1.4) drop-shadow(0 0 12px rgba(75, 0, 130, 0.8));
                }
                100% { 
                    filter: brightness(1.8) drop-shadow(0 0 20px rgba(138, 43, 226, 1));
                }
            }

            /* Pulsing border effect during channeling */
            .creature-icon.necromancer-channeling {
                position: relative;
            }

            .creature-icon.necromancer-channeling::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, 
                    rgba(75, 0, 130, 0.6) 0%, 
                    rgba(138, 43, 226, 0.8) 50%, 
                    rgba(75, 0, 130, 0.6) 100%);
                border-radius: 8px;
                z-index: -1;
                animation: necromancerChannelBorder 1.0s ease-in-out infinite;
            }

            @keyframes necromancerChannelBorder {
                0%, 100% { 
                    opacity: 0.4;
                    transform: scale(1);
                }
                50% { 
                    opacity: 0.8;
                    transform: scale(1.05);
                }
            }

            /* Dramatic necromancy effects for hero revival */
            @keyframes dramaticNecromancyPulse {
                0%, 100% { 
                    opacity: 0.3;
                    transform: scale(1);
                }
                50% { 
                    opacity: 0.7;
                    transform: scale(1.1);
                }
            }

            @keyframes floatNecromancySymbol {
                0%, 100% { 
                    opacity: 0.6;
                    transform: translateY(0px) scale(1);
                }
                50% { 
                    opacity: 1;
                    transform: translateY(-15px) scale(1.2);
                }
            }

            @keyframes heroRevivalBurst {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.5);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(2.5);
                }
            }

            @keyframes heroRevivalGlow {
                0% { 
                    filter: brightness(1) drop-shadow(0 0 0 transparent);
                    transform: scale(1);
                }
                50% { 
                    filter: brightness(1.8) drop-shadow(0 0 25px rgba(255, 215, 0, 0.8));
                    transform: scale(1.05);
                }
                100% { 
                    filter: brightness(1.2) drop-shadow(0 0 10px rgba(138, 43, 226, 0.6));
                    transform: scale(1);
                }
            }

            /* Floating necromancy symbols */
            .floating-necromancy-symbol {
                user-select: none;
                font-weight: bold;
            }

            /* Dramatic necromancy overlay */
            .dramatic-necromancy-overlay {
                border: 2px solid rgba(138, 43, 226, 0.6);
                box-shadow: 
                    inset 0 0 20px rgba(138, 43, 226, 0.3),
                    0 0 30px rgba(138, 43, 226, 0.5);
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const SkeletonNecromancerHelpers = {
    // Check if any creature in a list is Skeleton Necromancer
    hasSkeletonNecromancerInList(creatures) {
        return creatures.some(creature => SkeletonNecromancerCreature.isSkeletonNecromancer(creature.name));
    },

    // Get all Skeleton Necromancer creatures from a list
    getSkeletonNecromancerFromList(creatures) {
        return creatures.filter(creature => SkeletonNecromancerCreature.isSkeletonNecromancer(creature.name));
    },

    // Add channeling visual effect to Skeleton Necromancer
    addChannelingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('necromancer-channeling');
        }
    },

    // Remove channeling visual effect from Skeleton Necromancer
    removeChannelingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('necromancer-channeling');
        }
    }
};

export default SkeletonNecromancerCreature;