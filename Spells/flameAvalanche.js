// ./Spells/flameAvalanche.js - FlameAvalanche Spell Implementation

export class FlameAvalancheSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'FlameAvalanche';
        this.displayName = 'Flame Avalanche';
        
        console.log('🔥 FlameAvalanche spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute FlameAvalanche spell effect
    async executeSpell(caster, spell) {
        console.log(`🔥 ${caster.name} casting ${this.displayName}!`);
        
        // Calculate damage based on DestructionMagic level
        const damage = this.calculateDamage(caster);
        
        // Find all enemy targets
        const targets = this.findAllEnemyTargets(caster);
        
        if (targets.length === 0) {
            console.log(`🔥 ${this.displayName}: No valid targets found!`);
            return;
        }
        
        // Log the spell effect
        this.logSpellEffect(caster, damage, targets);
        
        // Start visual effects and damage application simultaneously
        const animationPromise = this.playFlameAvalancheAnimation(targets, caster);
        const damagePromise = this.applyDamageToAllTargets(targets, damage, caster);
        
        // Wait for both to complete
        await Promise.all([animationPromise, damagePromise]);
        
        console.log(`🔥 ${this.displayName} completed!`);
    }

    // ============================================
    // DAMAGE CALCULATION
    // ============================================

    // Calculate FlameAvalanche damage: 30 + 40X (X = DestructionMagic level)
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
    // DAMAGE APPLICATION
    // ============================================

    // Apply damage to all targets with staggered timing for visual effect
    async applyDamageToAllTargets(targets, damage, caster) {
        const damagePromises = [];
        
        // Apply damage to all targets with slight delays for visual effect
        targets.forEach((target, index) => {
            const delay = index * 50; // 50ms delay between each target
            
            const damagePromise = new Promise((resolve) => {
                setTimeout(() => {
                    this.applyDamageToTarget(target, damage, caster);
                    resolve();
                }, this.battleManager.getSpeedAdjustedDelay(delay));
            });
            
            damagePromises.push(damagePromise);
        });
        
        // Wait for all damage to be applied
        await Promise.all(damagePromises);
    }

    // Apply damage to a single target
    applyDamageToTarget(target, damage, caster) {
        if (target.type === 'hero') {
            // Apply damage to hero
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            });
            
        } else if (target.type === 'creature') {
            // Apply damage to creature
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

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the main FlameAvalanche animation with flying flames
    async playFlameAvalancheAnimation(targets, caster) {
        console.log(`🔥 Playing Flame Avalanche animation with ${targets.length} targets...`);
        
        // Total animation duration: ~400ms (same as melee attack)
        const totalDuration = 400;
        const waveDuration = totalDuration / 3; // ~133ms per wave
        const waveDelay = waveDuration; // Time between wave starts
        
        // Spawn 3 waves of flames
        const wavePromises = [];
        
        for (let wave = 0; wave < 3; wave++) {
            const wavePromise = new Promise((resolve) => {
                setTimeout(() => {
                    this.spawnFlameWave(targets, caster, wave + 1, waveDuration);
                    resolve();
                }, this.battleManager.getSpeedAdjustedDelay(wave * waveDelay));
            });
            wavePromises.push(wavePromise);
        }
        
        // Wait for all waves to start, then wait for total duration
        await Promise.all(wavePromises);
        await this.battleManager.delay(waveDuration); // Wait for last wave to complete
        
        // Cleanup any remaining flame elements
        this.cleanupAllFlameEffects();
    }

    // Spawn a single wave of 10X flames (10 flames per target)
    spawnFlameWave(targets, caster, waveNumber, waveDuration) {
        console.log(`🔥 Spawning wave ${waveNumber} with ${targets.length * 10} flames`);
        
        // Get caster position for flame spawn point
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        if (!casterElement) {
            console.error('Could not find caster element for flame spawn');
            return;
        }
        
        const casterRect = casterElement.getBoundingClientRect();
        const casterCenterX = casterRect.left + casterRect.width / 2;
        const casterCenterY = casterRect.top + casterRect.height / 2;
        
        // Spawn 10 flames for each target
        targets.forEach((target, targetIndex) => {
            for (let flameIndex = 0; flameIndex < 10; flameIndex++) {
                setTimeout(() => {
                    this.spawnFlyingFlame(
                        casterCenterX, 
                        casterCenterY, 
                        target, 
                        waveNumber, 
                        targetIndex, 
                        flameIndex,
                        waveDuration
                    );
                }, this.battleManager.getSpeedAdjustedDelay(flameIndex * 5)); // Slight stagger within each target
            }
        });
    }

    // Spawn a single flying flame that moves from caster to target
    spawnFlyingFlame(startX, startY, target, waveNumber, targetIndex, flameIndex, duration) {
        // Get target position
        let targetElement = null;
        
        if (target.type === 'hero') {
            targetElement = this.battleManager.getHeroElement(target.side, target.position);
        } else if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }
        
        if (!targetElement) {
            console.warn(`Could not find target element for flame`, target);
            return;
        }
        
        const targetRect = targetElement.getBoundingClientRect();
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;
        
        // Calculate cone spread for this flame
        const coneSpread = this.calculateConeSpread(flameIndex, 10);
        const flameSize = this.calculateFlameSize(flameIndex, 10);
        
        // Create flying flame element
        const flame = document.createElement('div');
        flame.className = `flying-flame wave-${waveNumber} target-${targetIndex} flame-${flameIndex}`;
        flame.innerHTML = '🔥';
        
        // Add slight randomness to start position for visual variety
        const startOffsetX = (Math.random() - 0.5) * 30; // ±15px
        const startOffsetY = (Math.random() - 0.5) * 30; // ±15px
        
        // Calculate final target position with cone spread
        const finalTargetX = targetCenterX + coneSpread.x;
        const finalTargetY = targetCenterY + coneSpread.y;
        
        flame.style.cssText = `
            position: fixed;
            left: ${startX + startOffsetX}px;
            top: ${startY + startOffsetY}px;
            font-size: ${flameSize}px;
            z-index: 300;
            pointer-events: none;
            transform: translate(-50%, -50%);
            animation: flyToTarget ${this.battleManager.getSpeedAdjustedDelay(duration)}ms linear forwards;
        `;
        
        // Set CSS custom properties for target position
        flame.style.setProperty('--target-x', `${finalTargetX}px`);
        flame.style.setProperty('--target-y', `${finalTargetY}px`);
        
        document.body.appendChild(flame);
        
        // Remove flame when it reaches target
        setTimeout(() => {
            if (flame && flame.parentNode) {
                // Create impact effect at target (only for some flames to avoid spam)
                if (flameIndex % 3 === 0) { // Every 3rd flame creates impact
                    this.createFlameImpactEffect(targetElement, target.type);
                }
                flame.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(duration));
        
        // Ensure CSS exists
        this.ensureFlameAvalancheCSS();
    }

    // Calculate cone spread for flame positioning
    calculateConeSpread(flameIndex, totalFlames) {
        // Create a cone pattern around the target
        const angle = (flameIndex / (totalFlames - 1)) * Math.PI * 0.6 - Math.PI * 0.3; // 60-degree cone
        const distance = 20 + Math.random() * 40; // 20-60px spread from target center
        
        return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance
        };
    }

    // Calculate flame size variation
    calculateFlameSize(flameIndex, totalFlames) {
        // Vary flame sizes between 18px and 32px
        const minSize = 18;
        const maxSize = 32;
        
        // Create some pattern + randomness
        const pattern = Math.sin((flameIndex / totalFlames) * Math.PI * 2);
        const randomness = (Math.random() - 0.5) * 0.4; // ±20% randomness
        const sizeMultiplier = 0.5 + (pattern + randomness) * 0.5; // 0-1 range
        
        return Math.round(minSize + (maxSize - minSize) * sizeMultiplier);
    }

    // Create impact effect when flame hits target
    createFlameImpactEffect(targetElement, targetType) {
        const impactEffect = document.createElement('div');
        impactEffect.className = 'flame-impact-effect';
        impactEffect.innerHTML = '💥🔥';
        
        const fontSize = targetType === 'hero' ? '32px' : '20px';
        
        impactEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: ${fontSize};
            z-index: 250;
            pointer-events: none;
            animation: flameImpact ${this.battleManager.getSpeedAdjustedDelay(200)}ms ease-out forwards;
        `;
        
        targetElement.appendChild(impactEffect);
        
        // Remove after animation
        setTimeout(() => {
            if (impactEffect && impactEffect.parentNode) {
                impactEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(200));
    }

    // Clean up any remaining flame effects
    cleanupAllFlameEffects() {
        // Remove any remaining flying flames
        const flyingFlames = document.querySelectorAll('.flying-flame');
        flyingFlames.forEach(flame => flame.remove());
        
        // Remove any remaining impact effects
        const impactEffects = document.querySelectorAll('.flame-impact-effect');
        impactEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for flame effects
    ensureFlameAvalancheCSS() {
        if (document.getElementById('flameAvalancheCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'flameAvalancheCSS';
        style.textContent = `
            @keyframes flyToTarget {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1) rotate(90deg);
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0) rotate(270deg);
                }
                100% { 
                    left: var(--target-x);
                    top: var(--target-y);
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.2) rotate(360deg);
                }
            }
            
            @keyframes flameImpact {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(180deg); 
                }
                70% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(270deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(360deg); 
                }
            }
            
            .flying-flame {
                text-shadow: 
                    0 0 8px rgba(255, 100, 0, 0.8),
                    0 0 12px rgba(255, 150, 0, 0.6),
                    0 0 16px rgba(255, 200, 0, 0.4);
                filter: drop-shadow(0 0 4px rgba(255, 100, 0, 0.7));
            }
            
            .flame-impact-effect {
                text-shadow: 
                    0 0 10px rgba(255, 50, 0, 0.9),
                    0 0 20px rgba(255, 100, 0, 0.7),
                    0 0 30px rgba(255, 200, 0, 0.5);
            }
            
            /* Cleanup styles for better performance */
            .flying-flame, .flame-impact-effect {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, damage, targets) {
        const heroTargets = targets.filter(t => t.type === 'hero').length;
        const creatureTargets = targets.filter(t => t.type === 'creature').length;
        
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Main spell effect log
        let targetDescription = '';
        if (heroTargets > 0 && creatureTargets > 0) {
            targetDescription = `${heroTargets} heroes and ${creatureTargets} creatures`;
        } else if (heroTargets > 0) {
            targetDescription = `${heroTargets} hero${heroTargets > 1 ? 's' : ''}`;
        } else if (creatureTargets > 0) {
            targetDescription = `${creatureTargets} creature${creatureTargets > 1 ? 's' : ''}`;
        }
        
        this.battleManager.addCombatLog(
            `🔥 ${this.displayName} engulfs the battlefield, hitting ${targetDescription} for ${damage} damage each!`,
            logType
        );
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            damage: damage,
            targetCount: targets.length,
            heroTargets: heroTargets,
            creatureTargets: creatureTargets,
            effectType: 'area_damage',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, damage, targetCount, heroTargets, creatureTargets } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Create target description
        let targetDescription = '';
        if (heroTargets > 0 && creatureTargets > 0) {
            targetDescription = `${heroTargets} heroes and ${creatureTargets} creatures`;
        } else if (heroTargets > 0) {
            targetDescription = `${heroTargets} hero${heroTargets > 1 ? 's' : ''}`;
        } else if (creatureTargets > 0) {
            targetDescription = `${creatureTargets} creature${creatureTargets > 1 ? 's' : ''}`;
        }
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🔥 ${displayName} engulfs the battlefield, hitting ${targetDescription} for ${damage} damage each!`,
            logType
        );
        
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
        
        // Play visual effects on guest side
        if (guestTargets.length > 0) {
            this.playFlameAvalancheAnimation(guestTargets, mockCaster);
        }
        
        console.log(`🔥 GUEST: ${casterName} used ${displayName} on ${targetCount} targets`);
    }

    // Find enemy targets for guest-side animation (simplified version)
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
            description: 'A powerful barrage of flames that hits all enemies on the battlefield',
            damageFormula: '30 + 40 × DestructionMagic level',
            targetType: 'all_enemies',
            spellSchool: 'DestructionMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupAllFlameEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('flameAvalancheCSS');
        if (css) css.remove();
        
        console.log('🔥 FlameAvalanche spell cleaned up');
    }
}

// Export for use in spell system
export default FlameAvalancheSpell;