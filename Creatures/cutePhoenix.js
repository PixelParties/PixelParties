// ./Creatures/cutePhoenix.js - CutePhoenix Creature Fireball Attack Module

export class CutePhoenixCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeProjectiles = new Set(); // Track active projectiles for cleanup
        
        // CutePhoenix stats
        this.BASE_DAMAGE = 10;
        this.DAMAGE_PER_DEFEATED = 10;
        this.FIREBALL_TRAVEL_TIME = 600; // 0.6 second fireball travel time
        
        // Inject CSS styles
        this.injectPhoenixStyles();
        
        console.log('🔥🐦 CutePhoenix Creature module initialized');
    }

    // Check if a creature is CutePhoenix
    static isCutePhoenix(creatureName) {
        return creatureName === 'CutePhoenix';
    }

    // Execute CutePhoenix special attack with fireball projectile
    async executeSpecialAttack(phoenixActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const phoenixCreature = phoenixActor.data;
        const phoenixHero = phoenixActor.hero;
        const attackerSide = phoenixHero.side;
        
        // Check if this is a dead phoenix trying to revive
        if (phoenixActor.isDead || !phoenixCreature.alive) {
            // Check for PinkSky revival chance enhancement
            let baseRevivalChance = 25;
            if (this.battleManager.pinkSkyEffect) {
                baseRevivalChance = this.battleManager.pinkSkyEffect.getCutePhoenixRevivalChance();
            }
            const revivalChance = this.battleManager.getRandomPercent();

            if (revivalChance <= baseRevivalChance) {
                // Execute self-revival
                await this.executeSelfRevival(phoenixCreature, phoenixHero, phoenixActor.index, position, attackerSide);
                return; // Revival takes the entire turn
            } else {
                // Phoenix remains dead this turn
                this.battleManager.addCombatLog(
                    `💀🔥 ${phoenixCreature.name} stirs in its ashes but remains dormant...`, 
                    'info'
                );
                return;
            }
        }
        
        // Fireball attack logic (only for living phoenix)
        this.battleManager.addCombatLog(
            `🔥🦅 ${phoenixCreature.name} spreads its wings and ignites with mystical flames!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find nearest enemy target (NOT ignoring creatures)
        const target = this.findNearestEnemyTarget(position, attackerSide);
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${phoenixCreature.name} finds no targets for its fireball!`, 
                'info'
            );
            return;
        }
        
        // Calculate damage based on defeated allies
        const defeatedAllies = this.countDefeatedAllies(attackerSide);
        const damage = this.BASE_DAMAGE + (defeatedAllies * this.DAMAGE_PER_DEFEATED);
        
        // Log target acquisition and damage calculation
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `🎯 ${phoenixCreature.name} targets ${targetName} with a fireball! (${defeatedAllies} fallen allies = ${damage} damage)`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest
        this.sendFireballAttackUpdate(phoenixActor, target, position, damage, defeatedAllies);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute fireball attack with visual effects
        await this.executeFireballAttack(phoenixActor, target, position, damage);
    }

    async executeSelfRevival(phoenixCreature, phoenixHero, creatureIndex, position, side) {
        this.battleManager.addCombatLog(
            `🔥🦅 ${phoenixCreature.name} begins to stir in its ashes...`, 
            side === 'player' ? 'success' : 'error'
        );
        
        // Create revival animation
        await this.createRevivalAnimation(side, position, creatureIndex);
        
        // Revive the phoenix with full HP
        phoenixCreature.alive = true;
        phoenixCreature.currentHp = phoenixCreature.maxHp;
        
        // Update visuals - this will recreate the health bar if needed
        // CHANGED: Use updateCreatureVisuals to recreate health bar instead of just updating it
        const creatures = phoenixHero.creatures;
        this.battleManager.updateCreatureVisuals(side, position, creatures);
        
        // Remove defeated visual state
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (creatureElement) {
            creatureElement.classList.remove('defeated');
            const sprite = creatureElement.querySelector('.creature-sprite');
            if (sprite) {
                sprite.style.filter = '';
                sprite.style.opacity = '';
            }
        }
        
        this.battleManager.addCombatLog(
            `✨🔥 ${phoenixCreature.name} rises from the flames with renewed life! (${phoenixCreature.currentHp}/${phoenixCreature.maxHp} HP)`, 
            side === 'player' ? 'success' : 'error'
        );
        
        // Send update to guest
        this.sendRevivalUpdate(phoenixCreature, phoenixHero, creatureIndex, position, side);
        
        // Force creature state sync
        if (this.battleManager.isAuthoritative) {
            setTimeout(() => {
                this.battleManager.sendCreatureStateSync();
            }, 100);
        }
    }

    async createRevivalAnimation(side, heroPosition, creatureIndex) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) {
            console.warn(`Could not find creature element for revival animation: ${side} ${heroPosition} ${creatureIndex}`);
            return;
        }
        
        // Get the parent slot element which is more reliably positioned
        const slotElement = document.querySelector(`.${side}-slot.${heroPosition}-slot`);
        if (!slotElement) {
            console.warn('Could not find slot element for revival animation');
            return;
        }
        
        // Create flame burst container with explicit positioning
        const flameBurst = document.createElement('div');
        flameBurst.className = 'phoenix-revival-burst';
        
        // Get reliable positioning from the creature element
        const rect = creatureElement.getBoundingClientRect();
        const slotRect = slotElement.getBoundingClientRect();
        
        // Calculate position relative to the slot (more reliable than relative to creature)
        const relativeLeft = rect.left - slotRect.left + (rect.width / 2);
        const relativeTop = rect.top - slotRect.top + (rect.height / 2);
        
        flameBurst.style.cssText = `
            position: absolute;
            left: ${relativeLeft}px;
            top: ${relativeTop}px;
            width: 150px;
            height: 150px;
            transform: translate(-50%, -50%);
            z-index: 1000;
            pointer-events: none;
        `;
        
        // Create multiple flame layers
        for (let i = 0; i < 3; i++) {
            const flameLayer = document.createElement('div');
            flameLayer.className = `phoenix-flame-layer-${i}`;
            
            const delay = i * 0.1;
            const scale = 1 + (i * 0.3);
            
            flameLayer.style.cssText = `
                position: absolute;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle, 
                    rgba(255, 255, 255, ${0.9 - i * 0.2}) 0%, 
                    rgba(255, 215, 0, ${0.8 - i * 0.15}) 20%, 
                    rgba(255, 140, 0, ${0.7 - i * 0.15}) 40%, 
                    rgba(255, 69, 0, ${0.6 - i * 0.1}) 60%, 
                    transparent 100%);
                border-radius: 50%;
                transform: scale(0);
                animation: phoenixRevivalFlame ${1.5 + i * 0.3}s ${delay}s ease-out forwards;
            `;
            
            flameBurst.appendChild(flameLayer);
        }
        
        // Add fire particles
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'phoenix-fire-particle';
            
            const angle = (i * 45) + Math.random() * 20;
            const distance = 60 + Math.random() * 40;
            
            particle.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                top: 50%;
                left: 50%;
                background: radial-gradient(circle, 
                    #fff 0%, 
                    #ff9500 40%, 
                    #ff5722 100%);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: phoenixFireParticle 2s ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
            `;
            
            flameBurst.appendChild(particle);
        }
        
        // Append to the slot element instead of creature element for better reliability
        slotElement.appendChild(flameBurst);
        
        // Add glow effect to creature
        const sprite = creatureElement.querySelector('.creature-sprite');
        if (sprite) {
            sprite.style.filter = 'brightness(2) drop-shadow(0 0 20px #ff9500)';
            sprite.style.transition = 'filter 2s ease-out';
        }
        
        // Wait for animation
        await this.battleManager.delay(2000);
        
        // Clean up
        if (flameBurst && flameBurst.parentNode) {
            flameBurst.remove();
        }
        
        if (sprite) {
            sprite.style.filter = '';
        }
    }

    // Count defeated allies on the same side
    countDefeatedAllies(side) {
        let defeatedCount = 0;
        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Count defeated heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && !hero.alive) {
                defeatedCount++;
            }
            
            // Count defeated creatures
            if (hero && hero.creatures) {
                hero.creatures.forEach(creature => {
                    if (!creature.alive) {
                        defeatedCount++;
                    }
                });
            }
        });
        
        return defeatedCount;
    }

    sendRevivalUpdate(phoenixCreature, phoenixHero, creatureIndex, position, side) {
        this.battleManager.sendBattleUpdate('cutephoenix_revival', {
            phoenixData: {
                side: side,
                position: position,
                creatureIndex: creatureIndex,
                name: phoenixCreature.name,
                absoluteSide: phoenixHero.absoluteSide
            },
            newHp: phoenixCreature.maxHp,
            maxHp: phoenixCreature.maxHp
        });
    }

    async handleGuestRevival(data) {
        const bm = this.battleManager;
        const { phoenixData, newHp, maxHp } = data;
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const phoenixLocalSide = (phoenixData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the phoenix
        const heroes = phoenixLocalSide === 'player' ? bm.playerHeroes : bm.opponentHeroes;
        const hero = heroes[phoenixData.position];
        
        if (hero && hero.creatures && hero.creatures[phoenixData.creatureIndex]) {
            const phoenix = hero.creatures[phoenixData.creatureIndex];
            
            // Add to combat log FIRST
            bm.addCombatLog(
                `🔥🦅 ${phoenixData.name} begins to stir in its ashes...`,
                phoenixLocalSide === 'player' ? 'success' : 'error'
            );
            
            // Ensure the creature element exists before animation
            const creatureElement = document.querySelector(
                `.${phoenixLocalSide}-slot.${phoenixData.position}-slot .creature-icon[data-creature-index="${phoenixData.creatureIndex}"]`
            );
            
            // Make sure the creature element is visible for the animation
            if (creatureElement) {
                // Remove defeated class temporarily to ensure visibility
                creatureElement.classList.remove('defeated');
                const sprite = creatureElement.querySelector('.creature-sprite');
                if (sprite) {
                    sprite.style.filter = '';
                    sprite.style.opacity = '';
                }
            }
            
            // Play animation
            await this.createRevivalAnimation(phoenixLocalSide, phoenixData.position, phoenixData.creatureIndex);
            
            // NOW revive the phoenix after animation completes
            phoenix.alive = true;
            phoenix.currentHp = newHp;
            
            // Update visuals - this will recreate health bar if needed
            bm.updateCreatureHealthBar(phoenixLocalSide, phoenixData.position, phoenixData.creatureIndex, newHp, maxHp);
            
            // Force update creature visuals to ensure proper state
            const creatures = hero.creatures;
            bm.updateCreatureVisuals(phoenixLocalSide, phoenixData.position, creatures);
            
            // Add final combat log
            bm.addCombatLog(
                `✨🔥 ${phoenixData.name} rises from the flames with renewed life! (${phoenix.currentHp}/${phoenix.maxHp} HP)`,
                phoenixLocalSide === 'player' ? 'success' : 'error'
            );
            
            // Send update confirmation if needed
            if (!bm.isAuthoritative) {
                // Guest can send acknowledgment
                bm.sendAcknowledgment('cutephoenix_revival_complete');
            }
        }
    }

    // Find nearest enemy target including creatures
    findNearestEnemyTarget(phoenixPosition, attackerSide) {
        // Simply use the existing targeting system that already handles creatures correctly
        return this.battleManager.combatManager.authoritative_findTargetWithCreatures(
            phoenixPosition, 
            attackerSide
        );
    }

    // Calculate distance between positions (simple heuristic)
    calculateDistance(fromPosition, toPosition, isCreature) {
        const positionValues = { 'left': 0, 'center': 1, 'right': 2 };
        const distance = Math.abs(positionValues[fromPosition] - positionValues[toPosition]);
        
        // Creatures are slightly closer than heroes
        return isCreature ? distance - 0.5 : distance;
    }

    // Execute the fireball attack with visual effects (host side)
    async executeFireballAttack(phoenixActor, target, position, damage) {
        const attackerSide = phoenixActor.hero.side;
        const phoenixElement = this.getPhoenixElement(attackerSide, position, phoenixActor.index);
        const targetElement = this.getTargetElement(target);
        
        if (!phoenixElement || !targetElement) {
            console.error('Phoenix or target element not found, cannot create fireball');
            return;
        }
        
        // Create and launch fireball projectile
        const projectile = this.createFireballProjectile(phoenixElement, targetElement);
        if (!projectile) {
            console.error('Failed to create fireball projectile');
            return;
        }

        this.activeProjectiles.add(projectile);

        // Calculate speed-adjusted travel time
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.FIREBALL_TRAVEL_TIME);
        
        // Wait for projectile to reach target
        await this.battleManager.delay(adjustedTravelTime);
        
        // Apply damage when projectile hits
        this.applyFireballDamage(target, damage, phoenixActor.data);
        
        // Add impact effect
        this.createImpactEffect(targetElement);
        
        // Clean up projectile
        this.removeProjectile(projectile);

        this.battleManager.addCombatLog(
            `💥 The mystical fireball strikes, dealing ${damage} damage!`, 
            'info'
        );
    }

    // Get the DOM element for CutePhoenix creature
    getPhoenixElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for a target (reused pattern from Archer)
    getTargetElement(target) {
        if (!target || !target.side || !target.position) {
            console.warn('Invalid target data:', target);
            return null;
        }

        let element = null;
        
        if (target.type === 'hero') {
            element = document.querySelector(`.${target.side}-slot.${target.position}-slot .battle-hero-card`);
            if (!element) {
                element = document.querySelector(`.${target.side}-slot.${target.position}-slot`);
            }
        } else if (target.type === 'creature') {
            element = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }

        return element;
    }

    // Create a fireball projectile that travels from phoenix to target
    createFireballProjectile(fromElement, toElement) {
        if (!fromElement || !toElement) return null;

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

            // Create the fireball projectile element
            const projectile = document.createElement('div');
            projectile.className = 'phoenix-fireball';
            
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.FIREBALL_TRAVEL_TIME);
            
            projectile.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: 30px;
                height: 30px;
                transform: translate(-50%, -50%);
                z-index: 1500;
                pointer-events: none;
                animation: phoenixFireballFlight ${adjustedTravelTime}ms ease-out forwards;
                --target-x: ${deltaX}px;
                --target-y: ${deltaY}px;
            `;

            // Add inner fireball core
            const core = document.createElement('div');
            core.className = 'phoenix-fireball-core';
            projectile.appendChild(core);
            
            // Add outer flame
            const flame = document.createElement('div');
            flame.className = 'phoenix-fireball-flame';
            projectile.appendChild(flame);
            
            document.body.appendChild(projectile);
            
            return projectile;
            
        } catch (error) {
            console.error('Error creating phoenix fireball:', error);
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
        impact.className = 'phoenix-fireball-impact';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 80px;
            height: 80px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: phoenixFireballImpact 0.8s ease-out forwards;
        `;

        document.body.appendChild(impact);

        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 800);
    }

    // Remove projectile with cleanup
    removeProjectile(projectile) {
        if (projectile && projectile.parentNode) {
            this.activeProjectiles.delete(projectile);
            projectile.remove();
        }
    }

    // Apply fireball damage to target
    applyFireballDamage(target, damage, attackingPhoenix = null) {
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'spell', // Phoenix fireball is magical
                attacker: attackingPhoenix
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
                source: 'spell', // Phoenix fireball is magical
                attacker: attackingPhoenix
            });
        }
    }

    // Send fireball attack data to guest for synchronization
    sendFireballAttackUpdate(phoenixActor, target, position, damage, defeatedCount) {
        const attackerSide = phoenixActor.hero.side;
        
        this.battleManager.sendBattleUpdate('cutephoenix_fireball_attack', {
            phoenixData: {
                side: attackerSide,
                position: position,
                creatureIndex: phoenixActor.index,
                name: phoenixActor.data.name,
                absoluteSide: phoenixActor.hero.absoluteSide
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
            defeatedCount: defeatedCount,
            travelTime: this.FIREBALL_TRAVEL_TIME
        });
    }

    // Handle CutePhoenix fireball attack on guest side
    handleGuestFireballAttack(data) {
        const { phoenixData, target, damage, defeatedCount, travelTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const phoenixLocalSide = (phoenixData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🔥🐦 ${phoenixData.name} launches a mystical fireball! (${defeatedCount} fallen allies = ${damage} damage)`, 
            phoenixLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestFireball(phoenixData, target, travelTime, damage, myAbsoluteSide);
    }

    // Create fireball on guest side
    async createGuestFireball(phoenixData, targetData, travelTime, damage, myAbsoluteSide) {
        const phoenixLocalSide = (phoenixData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const phoenixElement = this.getPhoenixElement(
            phoenixLocalSide,
            phoenixData.position,
            phoenixData.creatureIndex
        );

        if (!phoenixElement) {
            console.warn('Phoenix element not found on guest side');
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
            const projectile = this.createFireballProjectile(phoenixElement, targetElement);
            if (projectile) {
                this.activeProjectiles.add(projectile);
            }

            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(travelTime);
            
            await this.battleManager.delay(adjustedTravelTime);
            
            this.createImpactEffect(targetElement);
            this.removeProjectile(projectile);

            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            this.battleManager.addCombatLog(
                `💥 ${targetName} is struck by the mystical fireball for ${damage} damage!`, 
                targetLocalSide === 'player' ? 'error' : 'success'
            );
        } else {
            console.warn(`Guest: Target element not found`);
        }
    }

    // Clean up all active projectiles
    cleanup() {
        console.log(`Cleaning up ${this.activeProjectiles.size} active Phoenix fireballs`);
        
        this.activeProjectiles.forEach(projectile => {
            try {
                if (projectile && projectile.parentNode) {
                    projectile.remove();
                }
            } catch (error) {
                console.warn('Error removing phoenix fireball during cleanup:', error);
            }
        });
        
        this.activeProjectiles.clear();

        // Remove orphaned projectile elements
        const orphanedProjectiles = document.querySelectorAll('.phoenix-fireball');
        orphanedProjectiles.forEach(projectile => {
            if (projectile.parentNode) {
                projectile.remove();
            }
        });
    }

    // Inject CSS styles for CutePhoenix effects
    injectPhoenixStyles() {
        if (document.getElementById('cutePhoenixCreatureStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'cutePhoenixCreatureStyles';
        style.textContent = `
            .phoenix-fireball {
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .phoenix-fireball-core {
                position: absolute;
                width: 20px;
                height: 20px;
                background: radial-gradient(circle, 
                    #fff 0%, 
                    #ffeb3b 30%, 
                    #ff9800 60%, 
                    #ff5722 100%);
                border-radius: 50%;
                box-shadow: 
                    0 0 20px #ff9800,
                    0 0 40px #ff5722,
                    0 0 60px rgba(255, 87, 34, 0.5);
                animation: phoenixFireballPulse 0.3s ease-in-out infinite alternate;
            }

            .phoenix-fireball-flame {
                position: absolute;
                width: 35px;
                height: 35px;
                background: radial-gradient(circle, 
                    rgba(255, 152, 0, 0.8) 0%, 
                    rgba(255, 87, 34, 0.6) 40%, 
                    transparent 70%);
                border-radius: 50%;
                animation: phoenixFireballFlame 0.2s ease-in-out infinite alternate;
            }

            @keyframes phoenixFireballPulse {
                0% { transform: scale(1); }
                100% { transform: scale(1.2); }
            }

            @keyframes phoenixFireballFlame {
                0% { 
                    transform: scale(1) rotate(0deg);
                    opacity: 0.8;
                }
                100% { 
                    transform: scale(1.3) rotate(180deg);
                    opacity: 1;
                }
            }

            @keyframes phoenixFireballFlight {
                0% { 
                    transform: translate(-50%, -50%) translate(0, 0) scale(0.8);
                    opacity: 0.8;
                }
                100% { 
                    transform: translate(-50%, -50%) translate(var(--target-x), var(--target-y)) scale(1.1);
                    opacity: 1;
                }
            }

            .phoenix-fireball-impact {
                background: radial-gradient(circle, 
                    rgba(255, 255, 255, 0.9) 0%, 
                    rgba(255, 235, 59, 0.8) 20%, 
                    rgba(255, 152, 0, 0.6) 50%, 
                    rgba(255, 87, 34, 0.4) 80%, 
                    transparent 100%);
                border-radius: 50%;
                box-shadow: 
                    0 0 30px rgba(255, 152, 0, 0.9),
                    0 0 60px rgba(255, 87, 34, 0.7);
            }

            @keyframes phoenixFireballImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% { 
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.5);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
            }

            @keyframes phoenixRevivalFlame {
                0% { 
                    transform: scale(0) rotate(0deg);
                    opacity: 0;
                }
                50% { 
                    transform: scale(1.5) rotate(180deg);
                    opacity: 1;
                }
                100% { 
                    transform: scale(0.3) rotate(360deg);
                    opacity: 0;
                }
            }

            @keyframes phoenixFireParticle {
                0% { 
                    transform: translate(-50%, -50%) rotate(0deg) translateX(0);
                    opacity: 1;
                }
                100% { 
                    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance));
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

export default CutePhoenixCreature;