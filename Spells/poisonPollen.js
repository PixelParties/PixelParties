// ./Spells/poisonPollen.js - Poison Pollen Spell Implementation

export class PoisonPollenSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'PoisonPollen';
        this.displayName = 'Poison Pollen';
        
        console.log('🌸 Poison Pollen spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Poison Pollen spell effect
    async executeSpell(caster, spell) {
        console.log(`🌸 ${caster.name} casting ${this.displayName}!`);

        // ============================================
        // STORM RING NEGATION CHECK
        // ============================================
        try {
            const { checkStormRingNegation } = await import('../Artifacts/stormRing.js');
            const negationResult = await checkStormRingNegation(caster, spell, this.battleManager);
            
            if (negationResult.negated) {
                console.log(`⛈️ ${spell.name} was negated by Storm Ring!`);
                return; // Spell negated - exit without executing
            }
        } catch (error) {
            console.log('Storm Ring check failed, continuing with spell execution:', error);
        }
        
        
        // Find poisoned enemies (we know there are some because canCast was checked)
        const poisonedTargets = this.findPoisonedEnemies(caster);
        
        console.log(`🌸 ${caster.name} casting ${this.displayName} on ${poisonedTargets.length} poisoned enemies!`);
        
        // Check resistance for each target BEFORE animations (UPDATED to pass caster)
        const resistanceResults = this.checkResistanceForAllTargets(poisonedTargets, caster);
        
        // Log the spell effect with resistance info
        this.logSpellEffect(caster, poisonedTargets, resistanceResults);
        
        // Play purple particle rain animation and apply stun afterwards
        await this.playPoisonPollenAnimation(caster, poisonedTargets, resistanceResults);
        
        console.log(`🌸 ${this.displayName} completed!`);
    }

    // Check if this spell can be cast (requires poisoned enemies)
    canCast(caster) {
        // Check if there are any poisoned enemies
        const poisonedTargets = this.findPoisonedEnemies(caster);
        return poisonedTargets.length > 0;
    }

    // ============================================
    // RESISTANCE CHECKING
    // ============================================

    // Check resistance for all targets upfront (UPDATED to pass caster)
    checkResistanceForAllTargets(targets, caster) {
        const resistanceMap = new Map();
        
        targets.forEach(target => {
            let resisted = false;
            
            // Check resistance based on target type (UPDATED to pass caster)
            if (this.battleManager.resistanceManager) {
                if (target.type === 'hero') {
                    resisted = this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
                } else if (target.type === 'creature') {
                    // For area spells, shouldResistAreaSpell handles creatures differently
                    resisted = this.battleManager.resistanceManager.shouldResistAreaSpell(target, this.spellName, caster);
                }
            }
            
            // Create a unique key for each target
            const key = this.getTargetKey(target);
            resistanceMap.set(key, resisted);
            
            if (resisted) {
                console.log(`🛡️ Target resisted: ${target.type} ${target.name} at ${target.position}${target.type === 'creature' ? ` (index ${target.creatureIndex})` : ''}`);
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
    // TARGET FINDING
    // ============================================

    // Find all poisoned enemy targets
    findPoisonedEnemies(caster) {
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const poisonedTargets = [];
        
        // Check each position for heroes and creatures
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero) {
                // Check living hero for poison
                if (hero.alive && this.battleManager.statusEffectsManager && 
                    this.battleManager.statusEffectsManager.hasStatusEffect(hero, 'poisoned')) {
                    poisonedTargets.push({
                        type: 'hero',
                        hero: hero,
                        position: position,
                        side: enemySide,
                        name: hero.name
                    });
                }
                
                // Check living creatures for poison
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive && this.battleManager.statusEffectsManager &&
                            this.battleManager.statusEffectsManager.hasStatusEffect(creature, 'poisoned')) {
                            poisonedTargets.push({
                                type: 'creature',
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: enemySide,
                                name: creature.name
                            });
                        }
                    });
                }
            }
        });
        
        console.log(`🌸 ${this.displayName} found ${poisonedTargets.length} poisoned enemies:`, 
                   poisonedTargets.map(t => `${t.name} (${t.type})`).join(', '));
        
        return poisonedTargets;
    }

    // ============================================
    // STUN APPLICATION
    // ============================================

    // Apply stun to all poisoned targets
    async applyStunToTargets(targets, resistanceResults) {
        const stunPromises = [];
        
        targets.forEach((target, index) => {
            // Stagger stun application for visual effect
            const delay = index * 50; // 50ms between each target
            const targetKey = this.getTargetKey(target);
            const isResisted = resistanceResults.get(targetKey);
            
            const stunPromise = new Promise((resolve) => {
                setTimeout(() => {
                    // Only apply stun if not resisted
                    if (!isResisted) {
                        let actualTarget;
                        
                        if (target.type === 'creature') {
                            actualTarget = target.creature;
                        } else {
                            actualTarget = target.hero;
                        }
                        
                        // Apply stun status effect using the status effects manager
                        if (this.battleManager.statusEffectsManager) {
                            const success = this.battleManager.statusEffectsManager.applyStatusEffect(
                                actualTarget, 
                                'stunned', 
                                1 // Always 1 stack of stun
                            );
                            
                            if (success) {
                                console.log(`🌸 Applied 1 stun stack to ${actualTarget.name}`);
                            } else {
                                console.error(`🌸 Failed to apply stun to ${actualTarget.name}`);
                            }
                        }
                    }
                    
                    resolve();
                }, this.battleManager.getSpeedAdjustedDelay(delay));
            });
            
            stunPromises.push(stunPromise);
        });
        
        // Wait for all stun applications to complete
        await Promise.all(stunPromises);
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the poison pollen animation on poisoned targets
    async playPoisonPollenAnimation(caster, targets, resistanceResults) {
        console.log(`🌸 Playing Poison Pollen animation on ${targets.length} targets...`);
        
        // Create pollen particle effects on each target
        this.createPollenEffectsOnTargets(targets, resistanceResults);
        
        // Animation timing
        const pollenDuration = 1000; // 1 second of pollen particles
        const stunApplicationDelay = 900; // Apply stun 0.9 seconds into the effect
        
        // Start applying stun near the end of the pollen effect
        setTimeout(() => {
            this.applyStunToTargets(targets, resistanceResults);
        }, this.battleManager.getSpeedAdjustedDelay(stunApplicationDelay));
        
        // Wait for full pollen duration
        await this.battleManager.delay(pollenDuration);
        
        // Cleanup
        this.cleanupPollenEffects();
    }

    // Create pollen particle effects on specific targets
    createPollenEffectsOnTargets(targets, resistanceResults) {
        targets.forEach((target, index) => {
            const targetKey = this.getTargetKey(target);
            const isResisted = resistanceResults.get(targetKey);
            
            setTimeout(() => {
                let targetElement;
                
                if (target.type === 'creature') {
                    targetElement = document.querySelector(
                        `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
                    );
                } else {
                    targetElement = this.battleManager.getHeroElement(target.side, target.position);
                }
                
                if (targetElement) {
                    this.createPollenParticleEffect(targetElement, isResisted);
                }
            }, this.battleManager.getSpeedAdjustedDelay(index * 100)); // Staggered start
        });
        
        // Ensure CSS exists
        this.ensurePollenEffectsCSS();
    }

    // Create pollen particle effect on a single target
    createPollenParticleEffect(targetElement, isResisted) {
        const pollenContainer = document.createElement('div');
        pollenContainer.className = 'poison-pollen-container';
        
        // Get target bounds for particle positioning
        const rect = targetElement.getBoundingClientRect();
        
        pollenContainer.style.cssText = `
            position: fixed;
            left: ${rect.left - 30}px;
            top: ${rect.top - 30}px;
            width: ${rect.width + 60}px;
            height: ${rect.height + 60}px;
            z-index: 500;
            pointer-events: none;
            overflow: hidden;
        `;
        
        document.body.appendChild(pollenContainer);
        
        // Create multiple pollen particles
        const particleCount = 20; // Number of pollen particles per target
        
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                this.createPollenParticle(pollenContainer, rect, isResisted);
            }, this.battleManager.getSpeedAdjustedDelay(i * 40)); // Stagger particle creation
        }
        
        // Create final impact effect
        if (isResisted) {
            setTimeout(() => {
                this.createResistanceShieldEffect(targetElement);
            }, this.battleManager.getSpeedAdjustedDelay(900));
        }
    }

    // Create a single pollen particle
    createPollenParticle(container, targetRect, isResisted) {
        const particle = document.createElement('div');
        particle.className = 'poison-pollen-particle';
        
        // Use different icon for resisted particles
        particle.innerHTML = isResisted ? '🛡️' : '🌸';
        
        // Random particle characteristics
        const x = Math.random() * (targetRect.width + 60);
        const y = Math.random() * (targetRect.height + 60);
        const size = 0.6 + Math.random() * 0.8; // 0.6x to 1.4x size
        const duration = 800 + Math.random() * 400; // 800-1200ms lifetime
        const rotation = Math.random() * 360;
        const drift = (Math.random() - 0.5) * 40; // Horizontal drift
        
        particle.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            font-size: ${14 * size}px;
            transform: rotate(${rotation}deg);
            animation: pollenParticleFloat ${this.battleManager.getSpeedAdjustedDelay(duration)}ms ease-out forwards;
            filter: drop-shadow(0 0 4px ${isResisted ? 'rgba(100, 200, 255, 0.8)' : 'rgba(138, 43, 226, 0.8)'});
        `;
        
        if (isResisted) {
            particle.style.textShadow = `
                0 0 8px rgba(100, 200, 255, 0.9),
                0 0 16px rgba(150, 150, 255, 0.7),
                0 0 24px rgba(200, 200, 255, 0.5)
            `;
        } else {
            particle.style.textShadow = `
                0 0 8px rgba(138, 43, 226, 0.9),
                0 0 16px rgba(128, 0, 128, 0.7),
                0 0 24px rgba(75, 0, 130, 0.5)
            `;
        }
        
        // Set drift amount
        particle.style.setProperty('--drift-amount', `${drift}px`);
        
        container.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle && particle.parentNode) {
                particle.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(duration + 100));
    }

    // Create resistance shield effect
    createResistanceShieldEffect(targetElement) {
        const shield = document.createElement('div');
        shield.className = 'pollen-resistance-shield';
        shield.innerHTML = '🛡️✨';
        
        shield.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 36px;
            z-index: 450;
            pointer-events: none;
            animation: pollenResistanceShield ${this.battleManager.getSpeedAdjustedDelay(300)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(100, 200, 255, 1),
                0 0 40px rgba(150, 150, 255, 0.8),
                0 0 60px rgba(200, 200, 255, 0.6);
        `;
        
        targetElement.appendChild(shield);
        
        setTimeout(() => {
            if (shield && shield.parentNode) {
                shield.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(300));
    }

    // Clean up any remaining pollen effects
    cleanupPollenEffects() {
        // Remove pollen containers
        const containers = document.querySelectorAll('.poison-pollen-container');
        containers.forEach(container => container.remove());
        
        // Remove any remaining particles and shields
        const effects = document.querySelectorAll('.poison-pollen-particle, .pollen-resistance-shield');
        effects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for pollen effects
    ensurePollenEffectsCSS() {
        if (document.getElementById('poisonPollenCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'poisonPollenCSS';
        style.textContent = `
            @keyframes pollenParticleFloat {
                0% { 
                    opacity: 0;
                    transform: translateY(0) translateX(0) rotate(0deg) scale(0.5);
                }
                20% {
                    opacity: 1;
                    transform: translateY(-10px) translateX(var(--drift-amount)) rotate(90deg) scale(1);
                }
                80% {
                    opacity: 0.8;
                    transform: translateY(-20px) translateX(calc(var(--drift-amount) * 1.5)) rotate(270deg) scale(1.1);
                }
                100% { 
                    opacity: 0;
                    transform: translateY(-30px) translateX(calc(var(--drift-amount) * 2)) rotate(360deg) scale(0.8);
                }
            }
            
            @keyframes pollenResistanceShield {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(45deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.4) rotate(90deg);
                }
            }
            
            /* Enhanced visual effects */
            .poison-pollen-container {
                will-change: transform;
            }
            
            .poison-pollen-particle {
                will-change: transform, opacity;
            }
            
            .pollen-resistance-shield {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, targets, resistanceResults) {
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
            parts.push(`${heroHits} poisoned hero${heroHits > 1 ? 'es' : ''}`);
        }
        if (creatureHits > 0) {
            parts.push(`${creatureHits} poisoned creature${creatureHits > 1 ? 's' : ''}`);
        }
        
        let message = `🌸 ${this.displayName} covers `;
        
        if (parts.length > 0) {
            message += `${parts.join(' and ')} in stunning pollen, applying 1 stun stack each!`;
        } else {
            // All targets resisted
            message += `${targets.length} poisoned target${targets.length > 1 ? 's' : ''} in pollen, but all resisted!`;
        }
        
        // Main spell effect log
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
            
            // Only add this line if some targets were hit
            if (parts.length > 0) {
                this.battleManager.addCombatLog(
                    `🛡️ ${resistParts.join(' and ')} resisted the spell!`,
                    'info'
                );
            }
        }
        
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
            targetCount: targets.length,
            heroHits: heroHits,
            heroResists: heroResists,
            creatureHits: creatureHits,
            creatureResists: creatureResists,
            resistanceData: resistanceData,
            targets: targets.map(t => ({
                type: t.type,
                name: t.name,
                position: t.position,
                creatureIndex: t.creatureIndex
            })),
            effectType: 'targeted_stun_pollen',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, heroHits, heroResists, creatureHits, creatureResists, resistanceData, targetCount } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Build description matching host
        const parts = [];
        if (heroHits > 0) {
            parts.push(`${heroHits} poisoned hero${heroHits > 1 ? 'es' : ''}`);
        }
        if (creatureHits > 0) {
            parts.push(`${creatureHits} poisoned creature${creatureHits > 1 ? 's' : ''}`);
        }
        
        let message = `🌸 ${displayName} covers `;
        
        if (parts.length > 0) {
            message += `${parts.join(' and ')} in stunning pollen, applying 1 stun stack each!`;
        } else {
            message += `${targetCount} poisoned target${targetCount > 1 ? 's' : ''} in pollen, but all resisted!`;
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
        
        // Create mock caster for animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        // Create mock targets for animation
        const mockTargets = data.targets.map(targetData => {
            const targetLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'opponent' : 'player';
            return {
                type: targetData.type,
                name: targetData.name,
                position: targetData.position,
                side: targetLocalSide,
                creatureIndex: targetData.creatureIndex
            };
        });
        
        // Convert resistance data to Map format for guest
        const guestResistanceMap = new Map();
        if (resistanceData) {
            Object.entries(resistanceData).forEach(([key, resisted]) => {
                guestResistanceMap.set(key, resisted);
            });
        }
        
        // Play visual effects on guest side (no stun application)
        this.playPollenAnimationGuestSide(mockCaster, mockTargets, guestResistanceMap);
        
        console.log(`🌸 GUEST: ${casterName} used ${displayName} affecting ${data.targetCount} poisoned targets`);
    }

    // Guest-side animation (visual only, no stun application)
    async playPollenAnimationGuestSide(caster, targets, resistanceResults) {
        console.log(`🌸 GUEST: Playing Poison Pollen animation...`);
        
        // Create pollen particle effects on each target
        this.createPollenEffectsOnTargets(targets, resistanceResults);
        
        // Wait for full pollen duration
        await this.battleManager.delay(1000);
        
        // Cleanup
        this.cleanupPollenEffects();
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
            description: 'Covers all poisoned enemies in stunning pollen particles, applying 1 stun stack to each. Can only be cast if there are poisoned enemies. When cast by Ida, applies additional flame damage to non-resisted targets.',
            effectFormula: '1 stun stack to all poisoned enemies',
            targetType: 'poisoned_enemies_only',
            spellSchool: 'DecayMagic',
            condition: 'Requires at least 1 poisoned enemy',
            specialEffects: ['Ida: +50 flame damage to non-resisted targets']
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupPollenEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('poisonPollenCSS');
        if (css) css.remove();
        
        console.log('🌸 Poison Pollen spell cleaned up');
    }
}

// Export for use in spell system
export default PoisonPollenSpell;