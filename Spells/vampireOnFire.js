// ./Spells/vampireOnFire.js - Vampire On Fire Spell Implementation

export class VampireOnFireSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'VampireOnFire';
        this.displayName = 'Vampire On Fire';
        
        console.log('🧛‍♂️🔥 VampireOnFire spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute VampireOnFire spell effect
    async executeSpell(caster, spell) {
        console.log(`🧛‍♂️🔥 ${caster.name} casting ${this.displayName}!`);
        
        // Calculate heal-block stacks and damage based on DestructionMagic level
        const destructionLevel = caster.hasAbility('DestructionMagic') 
            ? caster.getAbilityStackCount('DestructionMagic') 
            : 0;
        
        const healBlockStacks = destructionLevel + 1; // X + 1
        const damage = 10 + (10 * destructionLevel); // 10 + 10*X
        
        // Find all enemy targets
        const allTargets = this.findAllEnemyTargets(caster);
        
        if (allTargets.length === 0) {
            console.log(`🧛‍♂️🔥 ${this.displayName}: No valid targets found!`);
            return;
        }
        
        // Pass caster to resistance check for potential resistance effects
        const resistanceResults = this.checkResistanceForAllTargets(allTargets, caster);
        
        // Log the spell effect with resistance info
        this.logSpellEffect(caster, healBlockStacks, damage, allTargets, resistanceResults);
        
        // Start visual effects
        const animationPromise = this.playSicklyFlamesAnimation(allTargets, caster, resistanceResults);
        
        // Apply heal-block FIRST, then damage
        const effectsPromise = this.applyHealBlockAndDamageToAllTargets(allTargets, healBlockStacks, damage, caster, resistanceResults);
        
        // Wait for both to complete
        await Promise.all([animationPromise, effectsPromise]);
        
        console.log(`🧛‍♂️🔥 ${this.displayName} completed!`);
    }

    // ============================================
    // RESISTANCE CHECKING (same pattern as mountainTearRiver)
    // ============================================

    // Check resistance for all targets upfront
    checkResistanceForAllTargets(targets, caster) {
        const resistanceMap = new Map();
        
        targets.forEach(target => {
            let resisted = false;
            
            // Pass caster to resistance manager for potential effects
            if (this.battleManager.resistanceManager) {
                if (target.type === 'hero') {
                    resisted = this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
                } else if (target.type === 'creature') {
                    resisted = this.battleManager.resistanceManager.shouldResistAreaSpell(target, this.spellName, caster);
                }
            }
            
            // Create a unique key for each target
            const key = this.getTargetKey(target);
            resistanceMap.set(key, resisted);
            
            if (resisted) {
                console.log(`🛡️ Target resisted: ${target.type} at ${target.position}${target.type === 'creature' ? ` (index ${target.creatureIndex})` : ''}`);
            }
        });
        
        return resistanceMap;
    }

    // Get unique key for a target
    getTargetKey(target) {
        if (target.type === 'hero') {
            return `hero_${target.side}_${target.position}`;
        } else {
            return `creature_${target.side}_${target.position}_${target.creatureIndex}`;
        }
    }

    // ============================================
    // TARGET FINDING (same as mountainTearRiver)
    // ============================================

    // Find all enemy targets (heroes and creatures)
    findAllEnemyTargets(caster) {
        const targets = [];
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        // Add all living enemy heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                targets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: enemySide
                });
                
                // Add all living creatures of this hero
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            targets.push({
                                type: 'creature',
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: enemySide
                            });
                        }
                    });
                }
            }
        });
        
        console.log(`🎯 ${this.displayName} found ${targets.length} targets`);
        return targets;
    }

    // ============================================
    // HEAL-BLOCK AND DAMAGE APPLICATION
    // ============================================

    // Apply heal-block first, then damage to all targets
    async applyHealBlockAndDamageToAllTargets(targets, healBlockStacks, damage, caster, resistanceResults) {
        // Apply heal-block to all targets first
        targets.forEach((target) => {
            const targetKey = this.getTargetKey(target);
            const isResisted = resistanceResults.get(targetKey);
            
            // Only apply effects if not resisted
            if (!isResisted) {
                this.applyHealBlockToTarget(target, healBlockStacks, caster);
            }
        });
        
        // Small delay to ensure heal-block is applied before damage
        await this.battleManager.delay(100);
        
        // Then apply damage to all targets
        const damagePromises = [];
        
        targets.forEach((target, index) => {
            const delay = index * 50; // Stagger damage slightly for visual effect
            const targetKey = this.getTargetKey(target);
            const isResisted = resistanceResults.get(targetKey);
            
            const damagePromise = new Promise((resolve) => {
                setTimeout(() => {
                    // Only apply damage if not resisted
                    if (!isResisted) {
                        this.applyDamageToTarget(target, damage, caster);
                    }
                    resolve();
                }, this.battleManager.getSpeedAdjustedDelay(delay));
            });
            
            damagePromises.push(damagePromise);
        });
        
        // Wait for all damage to be applied
        await Promise.all(damagePromises);
    }

    // Apply heal-block status effect to a single target
    applyHealBlockToTarget(target, healBlockStacks, caster) {
        let actualTarget = null;
        
        if (target.type === 'hero') {
            actualTarget = target.hero;
        } else if (target.type === 'creature') {
            actualTarget = target.creature;
        }
        
        if (actualTarget && this.battleManager.statusEffectsManager) {
            // Apply heal-block status effect using the status effects manager
            this.battleManager.statusEffectsManager.applyStatusEffect(actualTarget, 'healblock', healBlockStacks);
            
            console.log(`🚫 Applied ${healBlockStacks} heal-block stacks to ${actualTarget.name}`);
        }
    }

    // Apply damage to a single target
    applyDamageToTarget(target, damage, caster) {
        if (target.type === 'hero') {
            // Hero damage
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, { 
                source: 'vampireOnFire',
                attacker: caster
            });
        } else if (target.type === 'creature') {
            // Creature damage
            this.battleManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: target.position,
                side: target.side
            }, {
                source: 'vampireOnFire',
                attacker: caster
            });
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the main sickly flames animation
    async playSicklyFlamesAnimation(targets, caster, resistanceResults) {
        console.log(`🧛‍♂️🔥 Playing Vampire On Fire animation with ${targets.length} targets...`);
        
        // Total animation duration
        const totalDuration = 1000;
        
        // Create sickly flames effect that engulfs all targets
        await this.createSicklyFlames(targets, caster, totalDuration, resistanceResults);
        
        // Cleanup any remaining flame effects
        this.cleanupAllFlameEffects();
    }

    // Create sickly green flames that engulf all enemies
    async createSicklyFlames(targets, caster, duration, resistanceResults) {
        const container = document.body;
        
        // Create individual flame effects on each target
        const flamePromises = [];
        
        targets.forEach((target, index) => {
            const targetKey = this.getTargetKey(target);
            const isResisted = resistanceResults.get(targetKey);
            
            // Create flame effect with slight delay for visual spread
            flamePromises.push(this.createTargetFlameEffect(target, isResisted, index * 100));
        });
        
        // Create ambient sickly flame overlay
        const ambientFlame = document.createElement('div');
        ambientFlame.className = 'vampire-fire-ambient';
        ambientFlame.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 180;
            pointer-events: none;
            background: radial-gradient(circle, 
                rgba(50, 205, 50, 0.1) 0%, 
                rgba(34, 139, 34, 0.2) 30%, 
                rgba(0, 128, 0, 0.1) 60%, 
                transparent 100%);
            animation: vampireFireAmbient ${this.battleManager.getSpeedAdjustedDelay(duration)}ms ease-in-out forwards;
            opacity: 0;
        `;
        
        container.appendChild(ambientFlame);
        
        // Wait for all flame effects to complete
        await Promise.all([
            ...flamePromises,
            new Promise(resolve => setTimeout(resolve, this.battleManager.getSpeedAdjustedDelay(duration)))
        ]);
        
        // Remove ambient flame
        if (ambientFlame && ambientFlame.parentNode) {
            ambientFlame.remove();
        }
        
        this.ensureVampireFireCSS();
    }

    // Create flame effect on individual target
    createTargetFlameEffect(target, isResisted, delay) {
        return new Promise(resolve => {
            setTimeout(() => {
                let targetElement = null;
                
                if (target.type === 'hero') {
                    targetElement = this.battleManager.getHeroElement(target.side, target.position);
                } else if (target.type === 'creature') {
                    targetElement = document.querySelector(
                        `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
                    );
                }
                
                if (!targetElement) {
                    resolve();
                    return;
                }
                
                const flameEffect = document.createElement('div');
                flameEffect.className = 'vampire-fire-target-effect';
                
                if (isResisted) {
                    // Show resistance effect
                    flameEffect.innerHTML = '🛡️✨';
                    flameEffect.classList.add('resisted');
                } else {
                    flameEffect.innerHTML = '🧛‍♂️🔥';
                }
                
                const fontSize = target.type === 'hero' ? '48px' : '32px';
                
                flameEffect.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: ${fontSize};
                    z-index: 200;
                    pointer-events: none;
                    animation: ${isResisted ? 'vampireFireResisted' : 'vampireFireTarget'} ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
                `;
                
                if (isResisted) {
                    flameEffect.style.textShadow = `
                        0 0 15px rgba(100, 200, 255, 0.9),
                        0 0 25px rgba(150, 150, 255, 0.7),
                        0 0 35px rgba(200, 200, 255, 0.5)
                    `;
                } else {
                    flameEffect.style.textShadow = `
                        0 0 20px rgba(50, 205, 50, 0.9),
                        0 0 30px rgba(34, 139, 34, 0.8),
                        0 0 40px rgba(0, 128, 0, 0.6)
                    `;
                }
                
                targetElement.appendChild(flameEffect);
                
                // Remove after animation
                setTimeout(() => {
                    if (flameEffect && flameEffect.parentNode) {
                        flameEffect.remove();
                    }
                    resolve();
                }, this.battleManager.getSpeedAdjustedDelay(800));
            }, this.battleManager.getSpeedAdjustedDelay(delay));
        });
    }

    // Clean up any remaining flame effects
    cleanupAllFlameEffects() {
        // Remove any remaining ambient flames
        const ambientFlames = document.querySelectorAll('.vampire-fire-ambient');
        ambientFlames.forEach(flame => flame.remove());
        
        // Remove any remaining target effects
        const targetEffects = document.querySelectorAll('.vampire-fire-target-effect');
        targetEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for vampire fire effects
    ensureVampireFireCSS() {
        if (document.getElementById('vampireFireCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'vampireFireCSS';
        style.textContent = `
            @keyframes vampireFireAmbient {
                0% { 
                    opacity: 0;
                }
                20% {
                    opacity: 0.8;
                }
                80% {
                    opacity: 0.6;
                }
                100% { 
                    opacity: 0;
                }
            }
            
            @keyframes vampireFireTarget {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(180deg); 
                }
                70% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(270deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(360deg); 
                }
            }
            
            @keyframes vampireFireResisted {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(90deg); 
                }
                70% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(270deg); 
                }
            }
            
            .vampire-fire-ambient {
                will-change: opacity;
            }
            
            .vampire-fire-target-effect {
                will-change: transform, opacity;
            }
            
            .vampire-fire-target-effect.resisted {
                text-shadow: 
                    0 0 15px rgba(100, 200, 255, 0.9),
                    0 0 25px rgba(150, 150, 255, 0.7),
                    0 0 35px rgba(200, 200, 255, 0.5) !important;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, healBlockStacks, damage, targets, resistanceResults) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Count actual hits vs resisted
        let heroHits = 0, heroResists = 0;
        let creatureHits = 0, creatureResists = 0;
        
        targets.forEach(target => {
            const key = this.getTargetKey(target);
            const resisted = resistanceResults.get(key);
            
            if (target.type === 'hero') {
                if (resisted) heroResists++;
                else heroHits++;
            } else {
                if (resisted) creatureResists++;
                else creatureHits++;
            }
        });
        
        // Build description of what was hit
        const parts = [];
        if (heroHits > 0) {
            parts.push(`${heroHits} hero${heroHits > 1 ? 'es' : ''}`);
        }
        if (creatureHits > 0) {
            parts.push(`${creatureHits} creature${creatureHits > 1 ? 's' : ''}`);
        }
        
        let message = `🧛‍♂️🔥 ${this.displayName} engulfs all enemies in sickly flames`;
        
        if (parts.length > 0) {
            message += `, cursing ${parts.join(' and ')} with ${healBlockStacks} heal-block stack${healBlockStacks > 1 ? 's' : ''} and ${damage} damage each!`;
        } else {
            // All targets resisted
            message += `, but all targets resisted the cursed flames!`;
        }
        
        // Add resistance info if any
        if (heroResists > 0 || creatureResists > 0) {
            const resistParts = [];
            if (heroResists > 0) {
                resistParts.push(`${heroResists} hero${heroResists > 1 ? 'es' : ''}`);
            }
            if (creatureResists > 0) {
                resistParts.push(`${creatureResists} creature${creatureResists > 1 ? 's' : ''}`);
            }
            
            // Only add this line if some targets were hit
            if (parts.length > 0) {
                this.battleManager.addCombatLog(
                    `🛡️ ${resistParts.join(' and ')} resisted the spell!`,
                    'info'
                );
            }
        }
        
        // Main spell effect log
        this.battleManager.addCombatLog(message, logType);
        
        // Convert resistance map to serializable format for guest
        const resistanceData = {};
        resistanceResults.forEach((resisted, key) => {
            resistanceData[key] = resisted;
        });
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            healBlockStacks: healBlockStacks,
            damage: damage,
            targetCount: targets.length,
            heroHits: heroHits,
            heroResists: heroResists,
            creatureHits: creatureHits,
            creatureResists: creatureResists,
            resistanceData: resistanceData,
            effectType: 'area_healblock_damage',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, healBlockStacks, damage, heroHits, heroResists, creatureHits, creatureResists, resistanceData } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Build description matching host
        const parts = [];
        if (heroHits > 0) {
            parts.push(`${heroHits} hero${heroHits > 1 ? 'es' : ''}`);
        }
        if (creatureHits > 0) {
            parts.push(`${creatureHits} creature${creatureHits > 1 ? 's' : ''}`);
        }
        
        let message = `🧛‍♂️🔥 ${displayName} engulfs all enemies in sickly flames`;
        
        if (parts.length > 0) {
            message += `, cursing ${parts.join(' and ')} with ${healBlockStacks} heal-block stack${healBlockStacks > 1 ? 's' : ''} and ${damage} damage each!`;
        } else {
            message += `, but all targets resisted the cursed flames!`;
        }
        
        // Add main log
        this.battleManager.addCombatLog(message, logType);
        
        // Add resistance info if any
        if (heroResists > 0 || creatureResists > 0) {
            const resistParts = [];
            if (heroResists > 0) {
                resistParts.push(`${heroResists} hero${heroResists > 1 ? 'es' : ''}`);
            }
            if (creatureResists > 0) {
                resistParts.push(`${creatureResists} creature${creatureResists > 1 ? 's' : ''}`);
            }
            
            if (parts.length > 0) {
                this.battleManager.addCombatLog(
                    `🛡️ ${resistParts.join(' and ')} resisted the spell!`,
                    'info'
                );
            }
        }
        
        // Find the caster and targets for guest-side animation
        const casterSide = casterLocalSide;
        const casterPosition = data.casterPosition;
        
        // Create mock caster object for animation
        const mockCaster = {
            side: casterSide,
            position: casterPosition,
            name: casterName
        };
        
        // Find targets on guest side
        const guestTargets = this.findAllEnemyTargetsForGuest(mockCaster);
        
        // Convert resistance data to Map format for guest
        const guestResistanceMap = new Map();
        if (resistanceData) {
            Object.entries(resistanceData).forEach(([key, resisted]) => {
                guestResistanceMap.set(key, resisted);
            });
        }
        
        // Play visual effects on guest side
        if (guestTargets.length > 0) {
            this.playSicklyFlamesAnimation(guestTargets, mockCaster, guestResistanceMap);
        }
        
        console.log(`🧛‍♂️🔥 GUEST: ${casterName} used ${displayName} on ${data.targetCount} targets`);
    }

    // Find enemy targets for guest-side animation (same pattern as mountainTearRiver)
    findAllEnemyTargetsForGuest(caster) {
        const targets = [];
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        // Add all living enemy heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                targets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: enemySide
                });
                
                // Add all living creatures of this hero
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            targets.push({
                                type: 'creature',
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: enemySide
                            });
                        }
                    });
                }
            }
        });
        
        return targets;
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
            description: 'Sickly green flames engulf all enemies, applying heal-block first then damage. Heal-block prevents revival.',
            damageFormula: '10 + 10*DestructionMagic level damage',
            healBlockFormula: 'DestructionMagic level + 1 heal-block stacks',
            targetType: 'all_enemies',
            spellSchool: 'DestructionMagic',
            specialEffects: ['Applies heal-block before damage to prevent revival']
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupAllFlameEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('vampireFireCSS');
        if (css) css.remove();
        
        console.log('🧛‍♂️🔥 VampireOnFire spell cleaned up');
    }
}

// Export for use in spell system
export default VampireOnFireSpell;