// ./Spells/fireball.js - Fireball Spell Implementation

export class FireballSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Fireball';
        this.displayName = 'Fireball';
        
        console.log('🔥 Fireball spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Fireball spell effect
    async executeSpell(caster, spell) {
        console.log(`🔥 ${caster.name} casting ${this.displayName}!`);
        
        // ============================================
        // STORM RING NEGATION CHECK
        // ============================================
        try {
            const { checkStormRingNegation } = await import('../Artifacts/stormRing.js');
            const negationResult = await checkStormRingNegation(caster, spell, this.battleManager);
            
            if (negationResult.negated) {
                console.log(`⛈️ ${this.displayName} was negated by Storm Ring!`);
                return; // Spell negated - exit without executing
            }
        } catch (error) {
            console.log('Storm Ring check failed, continuing with spell execution:', error);
        }
        
        // Calculate damage based on DestructionMagic level
        const damage = this.calculateDamage(caster);
        
        // Find target hero
        const target = this.findTargetHero(caster);
        
        if (!target) {
            console.log(`🔥 ${this.displayName}: No valid target found!`);
            return;
        }

        // Pass caster to resistance check for Ida effect
        const isResisted = this.battleManager.resistanceManager && 
            this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
        
        if (isResisted) {
            console.log(`🛡️ ${target.hero.name} resisted ${this.displayName}!`);
        } else {
            // Log the spell effect only if not resisted
            this.logSpellEffect(caster, damage, target);
        }
        
        // Play fireball animation (damage will only be applied if not resisted)
        await this.playFireballAnimation(caster, target, damage, isResisted);
        
        console.log(`🔥 ${this.displayName} completed!`);
    }

    // ============================================
    // DAMAGE CALCULATION
    // ============================================

    // Calculate Fireball damage: 30 + 40X (X = DestructionMagic level)
    calculateDamage(caster) {
        const baseDamage = 30;
        const perLevelDamage = 40;
        
        // Get DestructionMagic level
        const destructionLevel = caster.hasAbility('DestructionMagic') 
            ? caster.getAbilityStackCount('DestructionMagic') 
            : 0;
        
        const totalDamage = baseDamage + (perLevelDamage * destructionLevel);
        
        console.log(`🔥 ${caster.name} DestructionMagic level ${destructionLevel}: ${totalDamage} damage`);
        
        return totalDamage;
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find target hero (random living hero, or slot with most creatures if no heroes alive)
    findTargetHero(caster) {
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        // Get all alive enemy heroes
        const aliveEnemyHeroes = [];
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                aliveEnemyHeroes.push({
                    hero: hero,
                    position: position,
                    side: enemySide
                });
            }
        });
        
        // If there are living heroes, pick one randomly
        if (aliveEnemyHeroes.length > 0) {
            const target = this.battleManager.getRandomChoice(aliveEnemyHeroes);
            console.log(`🎯 ${this.displayName} targeting random living hero: ${target.hero.name} at ${target.position}`);
            return target;
        }
        
        // No living heroes - find the slot with the most living creatures
        const slotWithMostCreatures = this.findSlotWithMostCreatures(enemyHeroes, enemySide);
        
        if (slotWithMostCreatures) {
            console.log(`🎯 ${this.displayName} targeting slot ${slotWithMostCreatures.position} with ${slotWithMostCreatures.creatureCount} creatures (no living heroes)`);
            return slotWithMostCreatures;
        }
        
        // No valid targets at all
        console.log(`🎯 ${this.displayName} found no valid targets!`);
        return null;
    }

    // Find the slot with the most living creatures
    findSlotWithMostCreatures(enemyHeroes, enemySide) {
        let bestSlot = null;
        let maxCreatures = 0;
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.creatures) {
                const livingCreatureCount = hero.creatures.filter(creature => creature.alive).length;
                
                if (livingCreatureCount > maxCreatures) {
                    maxCreatures = livingCreatureCount;
                    bestSlot = {
                        hero: hero,
                        position: position,
                        side: enemySide,
                        creatureCount: livingCreatureCount
                    };
                }
            }
        });
        
        return bestSlot;
    }

    // ============================================
    // DAMAGE APPLICATION
    // ============================================

    // Apply damage to target hero and all its creatures
    async applyDamageToTarget(target, damage, caster) {
        const damagePromises = [];
        
        // Apply damage to the target hero if it's alive
        if (target.hero.alive) {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, { 
                source: 'spell', 
                attacker: caster,
                aoe: true 
            });
        }
        
        // Apply damage to all living creatures of the target hero with small delays
        if (target.hero.creatures && target.hero.creatures.length > 0) {
            target.hero.creatures.forEach((creature, index) => {
                if (creature.alive) {
                    const damagePromise = new Promise((resolve) => {
                        setTimeout(() => {
                            this.battleManager.authoritative_applyDamageToCreature({
                                hero: target.hero,
                                creature: creature,
                                creatureIndex: index,
                                damage: damage,
                                position: target.position,
                                side: target.side
                            }, { 
                                source: 'spell', 
                                attacker: caster,
                                aoe: true
                            });
                            resolve();
                        }, this.battleManager.getSpeedAdjustedDelay(30 + index * 20));
                    });
                    damagePromises.push(damagePromise);
                }
            });
        }
        
        // Wait for all creature damage to be applied
        await Promise.all(damagePromises);
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the fireball projectile and explosion animation
    async playFireballAnimation(caster, target, damage, isResisted = false) {
        console.log(`🔥 Playing Fireball animation from ${caster.name} to ${target.hero.name}... (resisted: ${isResisted})`);
        
        // Get caster and target elements
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!casterElement || !targetElement) {
            console.error('Could not find caster or target elements for fireball animation');
            return;
        }
        
        // Calculate positions
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = casterRect.left + casterRect.width / 2;
        const startY = casterRect.top + casterRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Create fireball projectile
        const fireball = this.createFireballProjectile(startX, startY, endX, endY);
        
        // Animation timing (similar to melee attack ~400ms total)
        const projectileTime = 280; // 280ms for projectile travel
        const explosionTime = 150;  // 150ms for explosion
        
        // Wait for projectile to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove projectile and create explosion
        if (fireball && fireball.parentNode) {
            fireball.remove();
        }
        
        // Apply damage ONLY if not resisted
        if (!isResisted) {
            await this.applyDamageToTarget(target, damage, caster);
        }
        
        // Create explosion effect (visual happens regardless of resistance)
        this.createExplosionEffect(targetElement, target, isResisted);
        
        // Wait for explosion to complete
        await this.battleManager.delay(explosionTime);
        
        // Cleanup
        this.cleanupFireballEffects();
    }

    // Create the fireball projectile element
    createFireballProjectile(startX, startY, endX, endY) {
        const fireball = document.createElement('div');
        fireball.className = 'fireball-projectile';
        fireball.innerHTML = '🔥';
        
        // Calculate travel distance for scaling effect
        const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const maxDistance = 800; // Approximate max battlefield width
        const sizeMultiplier = 1 + (distance / maxDistance) * 0.5; // Scale based on distance
        
        fireball.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: ${Math.min(48 * sizeMultiplier, 72)}px;
            z-index: 400;
            pointer-events: none;
            transform: translate(-50%, -50%);
            animation: fireballTravel ${this.battleManager.getSpeedAdjustedDelay(280)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(255, 100, 0, 0.9),
                0 0 40px rgba(255, 150, 0, 0.7),
                0 0 60px rgba(255, 200, 0, 0.5);
            filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.8));
        `;
        
        // Set CSS custom properties for target position
        fireball.style.setProperty('--target-x', `${endX}px`);
        fireball.style.setProperty('--target-y', `${endY}px`);
        
        document.body.appendChild(fireball);
        
        // Ensure CSS exists
        this.ensureFireballCSS();
        
        return fireball;
    }

    // Create explosion effect at target location
    createExplosionEffect(targetElement, target, isResisted = false) {
        // Create main explosion
        const explosion = document.createElement('div');
        explosion.className = 'fireball-explosion';
        
        // Change visual if resisted
        if (isResisted) {
            explosion.innerHTML = '🛡️✨🔥';
            explosion.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 64px;
                z-index: 450;
                pointer-events: none;
                animation: fireballResisted ${this.battleManager.getSpeedAdjustedDelay(150)}ms ease-out forwards;
                text-shadow: 
                    0 0 30px rgba(100, 200, 255, 1),
                    0 0 60px rgba(150, 150, 255, 0.8),
                    0 0 90px rgba(200, 200, 255, 0.6);
            `;
        } else {
            explosion.innerHTML = '💥🔥💥';
            explosion.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 64px;
                z-index: 450;
                pointer-events: none;
                animation: fireballExplode ${this.battleManager.getSpeedAdjustedDelay(150)}ms ease-out forwards;
                text-shadow: 
                    0 0 30px rgba(255, 50, 0, 1),
                    0 0 60px rgba(255, 100, 0, 0.8),
                    0 0 90px rgba(255, 200, 0, 0.6);
            `;
        }
        
        targetElement.appendChild(explosion);
        
        // Create secondary explosion effects around target (only if not resisted)
        if (!isResisted) {
            this.createSecondaryExplosionEffects(targetElement, target);
        }
        
        // Remove explosion after animation
        setTimeout(() => {
            if (explosion && explosion.parentNode) {
                explosion.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(150));
    }

    // Create secondary explosion effects for creatures and area
    createSecondaryExplosionEffects(targetElement, target) {
        // Create creature explosion effects if target has creatures
        if (target.hero.creatures && target.hero.creatures.length > 0) {
            target.hero.creatures.forEach((creature, index) => {
                if (creature.alive) {
                    const creatureElement = document.querySelector(
                        `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${index}"]`
                    );
                    
                    if (creatureElement) {
                        setTimeout(() => {
                            this.createSmallExplosion(creatureElement);
                        }, this.battleManager.getSpeedAdjustedDelay(20 + index * 15)); // Staggered explosions
                    }
                }
            });
        }
        
        // Create splash explosion effects around the main target
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                this.createSplashExplosion(targetElement, i);
            }, this.battleManager.getSpeedAdjustedDelay(i * 20));
        }
    }

    // Create small explosion for creatures
    createSmallExplosion(creatureElement) {
        const smallExplosion = document.createElement('div');
        smallExplosion.className = 'fireball-small-explosion';
        smallExplosion.innerHTML = '💥';
        
        smallExplosion.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 28px;
            z-index: 400;
            pointer-events: none;
            animation: fireballSmallExplode ${this.battleManager.getSpeedAdjustedDelay(120)}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(255, 100, 0, 0.9),
                0 0 30px rgba(255, 150, 0, 0.7);
        `;
        
        creatureElement.appendChild(smallExplosion);
        
        setTimeout(() => {
            if (smallExplosion && smallExplosion.parentNode) {
                smallExplosion.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(120));
    }

    // Create splash explosion effects around main target
    createSplashExplosion(targetElement, index) {
        const splash = document.createElement('div');
        splash.className = 'fireball-splash-explosion';
        splash.innerHTML = '🔥';
        
        // Random positioning around the target
        const angle = (index / 6) * Math.PI * 2;
        const distance = 40 + Math.random() * 30;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        splash.style.cssText = `
            position: absolute;
            top: calc(50% + ${y}px);
            left: calc(50% + ${x}px);
            transform: translate(-50%, -50%);
            font-size: ${20 + Math.random() * 16}px;
            z-index: 350;
            pointer-events: none;
            animation: fireballSplashExplode ${this.battleManager.getSpeedAdjustedDelay(100)}ms ease-out forwards;
            text-shadow: 
                0 0 10px rgba(255, 150, 0, 0.8),
                0 0 20px rgba(255, 200, 0, 0.6);
        `;
        
        targetElement.appendChild(splash);
        
        setTimeout(() => {
            if (splash && splash.parentNode) {
                splash.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(100));
    }

    // Clean up any remaining fireball effects
    cleanupFireballEffects() {
        // Remove any remaining projectiles
        const projectiles = document.querySelectorAll('.fireball-projectile');
        projectiles.forEach(projectile => projectile.remove());
        
        // Remove any remaining explosions
        const explosions = document.querySelectorAll('.fireball-explosion, .fireball-small-explosion, .fireball-splash-explosion');
        explosions.forEach(explosion => explosion.remove());
    }

    // Ensure CSS animations exist for fireball effects
    ensureFireballCSS() {
        if (document.getElementById('fireballCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'fireballCSS';
        style.textContent = `
            @keyframes fireballTravel {
                0% { 
                    transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
                    opacity: 1;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.1) rotate(90deg);
                    opacity: 1;
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(270deg);
                }
                100% { 
                    left: var(--target-x);
                    top: var(--target-y);
                    transform: translate(-50%, -50%) scale(1.4) rotate(360deg);
                    opacity: 0.9;
                }
            }
            
            @keyframes fireballExplode {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                20% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(120deg); 
                }
                70% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.8) rotate(240deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(2.2) rotate(360deg); 
                }
            }
            
            @keyframes fireballResisted {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                20% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(45deg); 
                }
                70% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(90deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.7) rotate(135deg); 
                }
            }
            
            @keyframes fireballSmallExplode {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(360deg); 
                }
            }
            
            @keyframes fireballSplashExplode {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.2) rotate(0deg); 
                }
                40% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(144deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(288deg); 
                }
            }
            
            /* Enhanced visual effects */
            .fireball-projectile {
                will-change: transform, opacity;
            }
            
            .fireball-explosion, .fireball-small-explosion, .fireball-splash-explosion {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, damage, target) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Count creatures that will be affected
        const livingCreatures = target.hero.creatures ? target.hero.creatures.filter(c => c.alive).length : 0;
        
        let targetDescription = '';
        
        // If hero is alive, include it in the description
        if (target.hero.alive) {
            targetDescription = target.hero.name;
            if (livingCreatures > 0) {
                targetDescription += ` and ${livingCreatures} creature${livingCreatures > 1 ? 's' : ''}`;
            }
        } else {
            // Hero is dead, only targeting creatures
            targetDescription = `${livingCreatures} creature${livingCreatures > 1 ? 's' : ''} in ${target.position} slot`;
        }
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `🔥 ${this.displayName} explodes on ${targetDescription}, dealing ${damage} damage!`,
            logType
        );
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetName: target.hero.name,
            targetAbsoluteSide: target.hero.absoluteSide,
            targetPosition: target.position,
            targetHeroAlive: target.hero.alive,
            damage: damage,
            creatureCount: livingCreatures,
            effectType: 'single_target_explosion',
            isResisted: false,
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, damage, creatureCount, targetHeroAlive, isResisted } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // If spell was resisted, guest should already have the resistance log from the resistance manager
        // Only add the spell effect log if it wasn't resisted
        if (!isResisted) {
            // Create target description
            let targetDescription = '';
            
            if (targetHeroAlive) {
                targetDescription = targetName;
                if (creatureCount > 0) {
                    targetDescription += ` and ${creatureCount} creature${creatureCount > 1 ? 's' : ''}`;
                }
            } else {
                // Hero is dead, only targeting creatures
                targetDescription = `${creatureCount} creature${creatureCount > 1 ? 's' : ''} in ${data.targetPosition} slot`;
            }
            
            // Add to battle log
            this.battleManager.addCombatLog(
                `🔥 ${displayName} explodes on ${targetDescription}, dealing ${damage} damage!`,
                logType
            );
        }
        
        // Create mock objects for guest-side animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        const targetLocalSide = (data.targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetHeroes = targetLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const mockTarget = {
            hero: targetHeroes[data.targetPosition],
            position: data.targetPosition,
            side: targetLocalSide
        };
        
        // Play visual effects on guest side (even if hero is dead, we still want the explosion visual)
        if (mockTarget.hero) {
            this.playFireballAnimationGuestSide(mockCaster, mockTarget, isResisted);
        }
        
        console.log(`🔥 GUEST: ${casterName} used ${displayName} on ${targetName}${isResisted ? ' (RESISTED)' : ''}`);
    }

    // Guest-side animation (visual only, no damage)
    async playFireballAnimationGuestSide(caster, target, isResisted = false) {
        // Get caster and target elements
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!casterElement || !targetElement) {
            console.error('Could not find caster or target elements for guest fireball animation');
            return;
        }
        
        // Calculate positions
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = casterRect.left + casterRect.width / 2;
        const startY = casterRect.top + casterRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Create fireball projectile
        const fireball = this.createFireballProjectile(startX, startY, endX, endY);
        
        // Animation timing
        const projectileTime = 280;
        const explosionTime = 150;
        
        // Wait for projectile to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove projectile and create explosion
        if (fireball && fireball.parentNode) {
            fireball.remove();
        }
        
        // Create explosion effect (visual only, with resistance effect if applicable)
        this.createExplosionEffect(targetElement, target, isResisted);
        
        // Wait for explosion to complete
        await this.battleManager.delay(explosionTime);
        
        // Cleanup
        this.cleanupFireballEffects();
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Check if this spell module handles the given spell
    canHandle(spellName) {
        return spellName === this.spellName;
    }

    // Get spell information
    getSpellInfo() {
        return {
            name: this.spellName,
            displayName: this.displayName,
            description: 'Launches a fireball that explodes on impact, damaging the target hero and all their creatures',
            damageFormula: '30 + 40 × DestructionMagic level',
            targetType: 'single_hero_and_creatures',
            spellSchool: 'DestructionMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupFireballEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('fireballCSS');
        if (css) css.remove();
        
        console.log('🔥 Fireball spell cleaned up');
    }
}

// Export for use in spell system
export default FireballSpell;