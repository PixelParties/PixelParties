// ./Spells/phoenixBombardment.js - Phoenix Bombardment Spell Implementation

export class PhoenixBombardmentSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'PhoenixBombardment';
        this.displayName = 'Phoenix Bombardment';
        
        console.log('🔥🦅 Phoenix Bombardment spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Phoenix Bombardment spell effect
    async executeSpell(caster, spell) {
        console.log(`🔥🦅 ${caster.name} casting ${this.displayName}!`);

        // Find sacrifice target (highest current HP creature on caster's side)
        const sacrificeTarget = this.findSacrificeTarget(caster);
        
        if (!sacrificeTarget) {
            console.log(`🔥🦅 ${this.displayName}: No valid sacrifice target found!`);
            return;
        }

        // Calculate damage based on sacrificed creature's current HP and DestructionMagic level
        const damage = this.calculateDamage(caster, sacrificeTarget.creature);
        
        // Find target hero (ignores creatures, targets nearest hero)
        const target = this.findTargetHero(caster);
        
        if (!target) {
            console.log(`🔥🦅 ${this.displayName}: No valid target hero found!`);
            return;
        }

        // Log the sacrifice and spell casting
        this.logSpellCasting(caster, sacrificeTarget, damage, target);
        
        // STEP 1: Sacrifice the creature immediately (always happens)
        await this.sacrificeCreature(sacrificeTarget, caster);
        
        // STEP 2: Play phoenix animation (always happens)
        await this.playPhoenixAnimation(caster, target, damage);
        
        // STEP 3: Check resistance AFTER sacrifice and animation (only affects damage)
        const isResisted = this.battleManager.resistanceManager && 
            this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
        
        if (isResisted) {
            console.log(`🛡️ ${target.hero.name} resisted ${this.displayName} damage!`);
            this.battleManager.addCombatLog(`🛡️ ${target.hero.name} resisted the phoenix's damage!`, 'info');
        } else {
            // Apply damage to target hero
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, { source: 'spell', attacker: caster });
        }
        
        console.log(`🔥🦅 ${this.displayName} completed!`);
    }

    // ============================================
    // SPELL PREREQUISITES
    // ============================================

    // Check if spell can be cast (used by spell system before rolling)
    canCast(caster) {
        return this.canCastSpell(caster);
    }

    // Check if spell can be cast (requires at least 1 allied creature)
    canCastSpell(caster) {
        const alliedHeroes = caster.side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Check all allied heroes for living creatures
        for (const position of ['left', 'center', 'right']) {
            const hero = alliedHeroes[position];
            if (hero && hero.alive && hero.creatures) {
                const livingCreatures = hero.creatures.filter(creature => creature.alive);
                if (livingCreatures.length > 0) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // ============================================
    // SACRIFICE TARGET SELECTION
    // ============================================

    // Find the allied creature with highest current HP for sacrifice
    findSacrificeTarget(caster) {
        const alliedHeroes = caster.side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        let candidates = [];
        let highestHp = 0;
        
        // Collect all living allied creatures with their current HP
        for (const position of ['left', 'center', 'right']) {
            const hero = alliedHeroes[position];
            if (hero && hero.alive && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive && creature.currentHp > 0) {
                        if (creature.currentHp > highestHp) {
                            // New highest current HP found, reset candidates
                            highestHp = creature.currentHp;
                            candidates = [{
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: caster.side
                            }];
                        } else if (creature.currentHp === highestHp) {
                            // Same current HP as current highest, add to candidates
                            candidates.push({
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: caster.side
                            });
                        }
                    }
                });
            }
        }
        
        if (candidates.length === 0) {
            return null;
        }
        
        // Select random candidate if multiple creatures have same current HP
        const selected = this.battleManager.getRandomChoice(candidates);
        console.log(`🔥🦅 Selected sacrifice: ${selected.creature.name} (${selected.creature.currentHp} current HP) from ${selected.hero.name} at ${selected.position}`);
        
        return selected;
    }

    // ============================================
    // CREATURE SACRIFICE
    // ============================================

    // Sacrifice the target creature immediately
    async sacrificeCreature(sacrificeTarget, caster) {
        const { hero, creature, creatureIndex, position, side } = sacrificeTarget;
        
        console.log(`🔥🦅 Sacrificing ${creature.name} (${creature.currentHp}/${creature.maxHp} HP)`);
        
        // Apply maximum damage to instantly defeat the creature
        this.battleManager.authoritative_applyDamageToCreature({
            hero: hero,
            creature: creature,
            creatureIndex: creatureIndex,
            damage: creature.currentHp, // Deal exactly enough damage to kill
            position: position,
            side: side
        }, {
            source: 'spell_sacrifice',
            attacker: caster,
            spellName: this.spellName
        });
        
        // Add sacrifice log
        this.battleManager.addCombatLog(
            `🔥💀 ${creature.name} is sacrificed for ${this.displayName}!`,
            side === 'player' ? 'warning' : 'info'
        );
        
        // No separate sacrifice message needed - it's included in spell_effect
        
        // Small delay for visual impact
        await this.battleManager.delay(300);
    }

    // ============================================
    // DAMAGE CALCULATION
    // ============================================

    // Calculate Phoenix Bombardment damage: 50% of sacrificed creature's current HP × max(1, DestructionMagic level)
    calculateDamage(caster, sacrificedCreature) {
        const basePercent = 0.5; // 50%
        const baseDamage = Math.floor(sacrificedCreature.currentHp * basePercent);
        
        // Get DestructionMagic level (minimum 1 for calculation)
        const destructionLevel = caster.hasAbility('DestructionMagic') 
            ? caster.getAbilityStackCount('DestructionMagic') 
            : 0;
        
        const effectiveLevel = Math.max(1, destructionLevel); // Minimum level 1
        const totalDamage = baseDamage * effectiveLevel;
        
        console.log(`🔥🦅 ${caster.name} DestructionMagic level ${destructionLevel} (effective: ${effectiveLevel}): ${baseDamage} base × ${effectiveLevel} = ${totalDamage} damage`);
        
        return totalDamage;
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find target hero (ignores creatures, like ranged attacks)
    findTargetHero(caster) {
        // Use existing targeting logic that ignores creatures
        const target = this.battleManager.combatManager.authoritative_findTargetIgnoringCreatures(
            caster.position, 
            caster.side
        );
        
        if (target) {
            console.log(`🎯 ${this.displayName} targeting hero: ${target.hero.name} at ${target.position}`);
        }
        
        return target;
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the phoenix flight and explosion animation
    async playPhoenixAnimation(caster, target, damage) {
        console.log(`🔥🦅 Playing Phoenix animation from ${caster.name} to ${target.hero.name}...`);
        
        // Get caster and target elements
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!casterElement || !targetElement) {
            console.error('Could not find caster or target elements for phoenix animation');
            return;
        }
        
        // Calculate positions
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = casterRect.left + casterRect.width / 2;
        const startY = casterRect.top + casterRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Create phoenix projectile
        const phoenix = this.createPhoenixProjectile(startX, startY, endX, endY);
        
        // Animation timing - faster than fireball for "very quickly"
        const projectileTime = 200; // 200ms for quick flight
        const explosionTime = 150;  // 150ms for explosion
        
        // Wait for phoenix to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove phoenix and create explosion
        if (phoenix && phoenix.parentNode) {
            phoenix.remove();
        }
        
        // Create explosion effect
        this.createPhoenixExplosion(targetElement, target);
        
        // Wait for explosion to complete
        await this.battleManager.delay(explosionTime);
        
        // Cleanup
        this.cleanupPhoenixEffects();
    }

    // Create the phoenix projectile element
    createPhoenixProjectile(startX, startY, endX, endY) {
        const phoenix = document.createElement('div');
        phoenix.className = 'phoenix-projectile';
        phoenix.innerHTML = '🦅🔥';
        
        // Calculate travel distance for scaling effect
        const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const maxDistance = 800;
        const sizeMultiplier = 1 + (distance / maxDistance) * 0.3;
        
        phoenix.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: ${Math.min(40 * sizeMultiplier, 60)}px;
            z-index: 400;
            pointer-events: none;
            transform: translate(-50%, -50%);
            animation: phoenixTravel ${this.battleManager.getSpeedAdjustedDelay(200)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(255, 140, 0, 0.9),
                0 0 40px rgba(255, 69, 0, 0.7),
                0 0 60px rgba(255, 215, 0, 0.5);
            filter: drop-shadow(0 0 8px rgba(255, 140, 0, 0.8));
        `;
        
        // Set CSS custom properties for target position
        phoenix.style.setProperty('--target-x', `${endX}px`);
        phoenix.style.setProperty('--target-y', `${endY}px`);
        
        document.body.appendChild(phoenix);
        
        // Ensure CSS exists
        this.ensurePhoenixCSS();
        
        return phoenix;
    }

    // Create explosion effect at target location
    createPhoenixExplosion(targetElement, target) {
        const explosion = document.createElement('div');
        explosion.className = 'phoenix-explosion';
        explosion.innerHTML = '💥🔥🦅🔥💥';
        
        explosion.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 72px;
            z-index: 450;
            pointer-events: none;
            animation: phoenixExplode ${this.battleManager.getSpeedAdjustedDelay(150)}ms ease-out forwards;
            text-shadow: 
                0 0 30px rgba(255, 140, 0, 1),
                0 0 60px rgba(255, 69, 0, 0.8),
                0 0 90px rgba(255, 215, 0, 0.6);
        `;
        
        targetElement.appendChild(explosion);
        
        // Create secondary phoenix feather effects
        this.createPhoenixFeatherEffects(targetElement);
        
        // Remove explosion after animation
        setTimeout(() => {
            if (explosion && explosion.parentNode) {
                explosion.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(150));
    }

    // Create phoenix feather effects around target
    createPhoenixFeatherEffects(targetElement) {
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.createPhoenixFeather(targetElement, i);
            }, this.battleManager.getSpeedAdjustedDelay(i * 15));
        }
    }

    // Create individual phoenix feather
    createPhoenixFeather(targetElement, index) {
        const feather = document.createElement('div');
        feather.className = 'phoenix-feather';
        feather.innerHTML = '🪶';
        
        // Random positioning around the target
        const angle = (index / 8) * Math.PI * 2;
        const distance = 30 + Math.random() * 25;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        feather.style.cssText = `
            position: absolute;
            top: calc(50% + ${y}px);
            left: calc(50% + ${x}px);
            transform: translate(-50%, -50%);
            font-size: ${16 + Math.random() * 12}px;
            z-index: 350;
            pointer-events: none;
            animation: phoenixFeatherFloat ${this.battleManager.getSpeedAdjustedDelay(120)}ms ease-out forwards;
            text-shadow: 
                0 0 10px rgba(255, 215, 0, 0.8),
                0 0 20px rgba(255, 140, 0, 0.6);
            filter: hue-rotate(${Math.random() * 60 - 30}deg);
        `;
        
        targetElement.appendChild(feather);
        
        setTimeout(() => {
            if (feather && feather.parentNode) {
                feather.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(120));
    }

    // Clean up any remaining phoenix effects
    cleanupPhoenixEffects() {
        // Remove any remaining projectiles
        const projectiles = document.querySelectorAll('.phoenix-projectile');
        projectiles.forEach(projectile => projectile.remove());
        
        // Remove any remaining explosions and feathers
        const effects = document.querySelectorAll('.phoenix-explosion, .phoenix-feather');
        effects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for phoenix effects
    ensurePhoenixCSS() {
        if (document.getElementById('phoenixCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'phoenixCSS';
        style.textContent = `
            @keyframes phoenixTravel {
                0% { 
                    transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
                    opacity: 1;
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.2) rotate(90deg);
                    opacity: 1;
                }
                75% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.3) rotate(270deg);
                }
                100% { 
                    left: var(--target-x);
                    top: var(--target-y);
                    transform: translate(-50%, -50%) scale(1.5) rotate(360deg);
                    opacity: 0.9;
                }
            }
            
            @keyframes phoenixExplode {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.4) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(120deg); 
                }
                70% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.8) rotate(240deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(2.4) rotate(360deg); 
                }
            }
            
            @keyframes phoenixFeatherFloat {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                40% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(360deg); 
                }
            }
            
            /* Enhanced visual effects */
            .phoenix-projectile {
                will-change: transform, opacity;
            }
            
            .phoenix-explosion, .phoenix-feather {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell casting details
    logSpellCasting(caster, sacrificeTarget, damage, target) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        const sacrificedCreature = sacrificeTarget.creature;
        
        // Main spell casting log
        this.battleManager.addCombatLog(
            `🔥🦅 ${caster.name} casts ${this.displayName}, sacrificing ${sacrificedCreature.name} (${sacrificedCreature.currentHp} current HP)!`,
            logType
        );
        
        // Send spell effect update to guest (includes sacrifice info)
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetName: target.hero.name,
            targetAbsoluteSide: target.hero.absoluteSide,
            targetPosition: target.position,
            damage: damage,
            effectType: 'phoenix_bombardment',
            isResisted: false, // Resistance check happens later
            // Sacrifice information for guest-side handling
            sacrificeInfo: {
                creatureName: sacrificeTarget.creature.name,
                creatureCurrentHp: sacrificeTarget.creature.currentHp,
                heroAbsoluteSide: sacrificeTarget.hero.absoluteSide,
                heroPosition: sacrificeTarget.position,
                creatureIndex: sacrificeTarget.creatureIndex
            },
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, damage, sacrificeInfo, isResisted } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Handle sacrifice first if provided
        if (sacrificeInfo) {
            this.handleGuestSacrifice(sacrificeInfo);
        }
        
        // Add spell casting log
        this.battleManager.addCombatLog(
            `🔥🦅 ${casterName} casts ${displayName}, sacrificing ${sacrificeInfo.creatureName}!`,
            logType
        );
        
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
        
        // Play visual effects on guest side
        if (mockTarget.hero) {
            this.playPhoenixAnimationGuestSide(mockCaster, mockTarget);
        }
        
        console.log(`🔥🦅 GUEST: ${casterName} used ${displayName} on ${targetName}`);
    }

    // Handle sacrifice effect on guest side
    handleGuestSacrifice(sacrificeInfo) {
        const { heroAbsoluteSide, heroPosition, creatureIndex, creatureName } = sacrificeInfo;
        // Determine local side for guest
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the hero and creature
        const heroes = heroLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[heroPosition];
        
        if (hero && hero.creatures && hero.creatures[creatureIndex]) {
            const creature = hero.creatures[creatureIndex];
            
            // Apply visual death state immediately
            if (creature.name === creatureName) {
                creature.alive = false;
                creature.currentHp = 0;
                
                // Update visual state
                this.battleManager.handleCreatureDeathWithoutRevival(hero, creature, creatureIndex, heroLocalSide, heroPosition);
                
                // Add to combat log
                this.battleManager.addCombatLog(
                    `🔥💀 ${creatureName} is sacrificed for ${this.displayName}!`,
                    heroLocalSide === 'player' ? 'warning' : 'info'
                );
                
                console.log(`🔥🦅 GUEST: Sacrificed ${creatureName} for Phoenix Bombardment`);
            }
        }
    }

    // Guest-side animation (visual only, no damage)
    async playPhoenixAnimationGuestSide(caster, target) {
        // Get caster and target elements
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!casterElement || !targetElement) {
            console.error('Could not find caster or target elements for guest phoenix animation');
            return;
        }
        
        // Calculate positions
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = casterRect.left + casterRect.width / 2;
        const startY = casterRect.top + casterRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Create phoenix projectile
        const phoenix = this.createPhoenixProjectile(startX, startY, endX, endY);
        
        // Animation timing
        const projectileTime = 200;
        const explosionTime = 150;
        
        // Wait for phoenix to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove phoenix and create explosion
        if (phoenix && phoenix.parentNode) {
            phoenix.remove();
        }
        
        // Create explosion effect
        this.createPhoenixExplosion(targetElement, target);
        
        // Wait for explosion to complete
        await this.battleManager.delay(explosionTime);
        
        // Cleanup
        this.cleanupPhoenixEffects();
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
            description: 'Sacrifices your highest current HP allied creature to summon a phoenix that bombards the nearest enemy hero',
            damageFormula: '50% of sacrificed creature current HP × max(1, DestructionMagic level)',
            targetType: 'enemy_hero_ignoring_creatures',
            spellSchool: 'DestructionMagic',
            requirements: 'At least 1 living allied creature'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupPhoenixEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('phoenixCSS');
        if (css) css.remove();
        
        console.log('🔥🦅 Phoenix Bombardment spell cleaned up');
    }
}

// Export for use in spell system
export default PhoenixBombardmentSpell;