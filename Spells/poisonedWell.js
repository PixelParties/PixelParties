// ./Spells/poisonedWell.js - Poisoned Well Spell Implementation

export class PoisonedWellSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'PoisonedWell';
        this.displayName = 'Poisoned Well';
        
        console.log('☔ Poisoned Well spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Poisoned Well spell effect
    async executeSpell(caster, spell) {
        console.log(`☔ ${caster.name} casting ${this.displayName}!`);
        
        // Calculate poison stacks based on DecayMagic level
        const poisonStacks = this.calculatePoisonStacks(caster);
        
        // Find all enemy targets
        const targets = this.findAllEnemyTargets(caster);
        
        if (targets.length === 0) {
            console.log(`☔ ${this.displayName}: No valid targets found!`);
            return;
        }
        
        // Log the spell effect
        this.logSpellEffect(caster, poisonStacks, targets);
        
        // Play poisoned rain animation and apply poison when rain hits
        await this.playPoisonedRainAnimation(caster, targets, poisonStacks);
        
        console.log(`☔ ${this.displayName} completed!`);
    }

    // ============================================
    // POISON STACK CALCULATION
    // ============================================

    // Calculate poison stacks: X (X = DecayMagic level, minimum 1)
    calculatePoisonStacks(caster) {
        // Get DecayMagic level (defaults to 0 if hero doesn't have the ability)
        const decayMagicLevel = caster.hasAbility('DecayMagic') 
            ? caster.getAbilityStackCount('DecayMagic') 
            : 0;
        
        // Minimum 1 stack even without DecayMagic
        const poisonStacks = Math.max(1, decayMagicLevel);
        
        console.log(`☔ ${caster.name} DecayMagic level ${decayMagicLevel}: ${poisonStacks} poison stacks to all enemies`);
        
        return poisonStacks;
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find all enemy targets (heroes and creatures)
    findAllEnemyTargets(caster) {
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const targets = [];
        
        // Check each position for heroes and creatures
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero) {
                // Add living hero
                if (hero.alive) {
                    targets.push({
                        type: 'hero',
                        hero: hero,
                        position: position,
                        side: enemySide,
                        name: hero.name
                    });
                }
                
                // Add living creatures
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            targets.push({
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
        
        console.log(`☔ ${this.displayName} found ${targets.length} enemy targets:`, 
                   targets.map(t => `${t.name} (${t.type})`).join(', '));
        
        return targets;
    }

    // ============================================
    // POISON APPLICATION
    // ============================================

    // Apply poison stacks to all targets
    async applyPoisonToAllTargets(targets, poisonStacks) {
        const poisonPromises = [];
        
        targets.forEach((target, index) => {
            // Stagger poison application for visual effect
            const delay = index * 50; // 50ms between each target
            
            const poisonPromise = new Promise((resolve) => {
                setTimeout(() => {
                    let actualTarget;
                    
                    if (target.type === 'creature') {
                        actualTarget = target.creature;
                    } else {
                        actualTarget = target.hero;
                    }
                    
                    // Apply poison status effect using the status effects manager
                    if (this.battleManager.statusEffectsManager) {
                        const success = this.battleManager.statusEffectsManager.applyStatusEffect(
                            actualTarget, 
                            'poisoned', 
                            poisonStacks
                        );
                        
                        if (success) {
                            console.log(`☔ Applied ${poisonStacks} poison stacks to ${actualTarget.name}`);
                        } else {
                            console.error(`☔ Failed to apply poison to ${actualTarget.name}`);
                        }
                    }
                    
                    resolve();
                }, this.battleManager.getSpeedAdjustedDelay(delay));
            });
            
            poisonPromises.push(poisonPromise);
        });
        
        // Wait for all poison applications to complete
        await Promise.all(poisonPromises);
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the poisoned rain animation across the enemy side
    async playPoisonedRainAnimation(caster, targets, poisonStacks) {
        console.log(`☔ Playing Poisoned Rain animation across enemy side...`);
        
        // Determine enemy side for rain positioning
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        
        // Create rain effect across the entire enemy side
        this.createPoisonedRainEffect(enemySide);
        
        // Animation timing
        const rainDuration = 1000; // 1 second of rain
        const poisonApplicationDelay = 600; // Apply poison 0.6 seconds into the rain
        
        // Start applying poison partway through the rain
        setTimeout(() => {
            this.applyPoisonToAllTargets(targets, poisonStacks);
            
            // Create impact effects on all targets
            this.createTargetImpactEffects(targets);
        }, this.battleManager.getSpeedAdjustedDelay(poisonApplicationDelay));
        
        // Wait for full rain duration
        await this.battleManager.delay(rainDuration);
        
        // Cleanup
        this.cleanupPoisonedRainEffects();
    }

    // Create the poisoned rain effect across the enemy side
    createPoisonedRainEffect(enemySide) {
        // Get the battlefield bounds for the enemy side
        const enemySideBounds = this.getEnemySideBounds(enemySide);
        
        if (!enemySideBounds) {
            console.error('Could not determine enemy side bounds for rain effect');
            return;
        }
        
        // Create rain container
        const rainContainer = document.createElement('div');
        rainContainer.className = 'poisoned-rain-container';
        rainContainer.style.cssText = `
            position: fixed;
            left: ${enemySideBounds.left}px;
            top: ${enemySideBounds.top - 100}px;
            width: ${enemySideBounds.width}px;
            height: ${enemySideBounds.height + 200}px;
            z-index: 500;
            pointer-events: none;
            overflow: hidden;
        `;
        
        document.body.appendChild(rainContainer);
        
        // Create multiple rain drops
        const dropCount = 30; // Number of rain drops
        
        for (let i = 0; i < dropCount; i++) {
            setTimeout(() => {
                this.createRainDrop(rainContainer, enemySideBounds);
            }, this.battleManager.getSpeedAdjustedDelay(i * 30)); // Stagger drop creation
        }
        
        // Ensure CSS exists
        this.ensurePoisonedRainCSS();
    }

    // Get the bounds of the enemy side of the battlefield
    getEnemySideBounds(enemySide) {
        const sideElement = document.querySelector(`.${enemySide}-side`);
        
        if (!sideElement) {
            // Fallback: try to find hero slots on that side
            const heroSlots = document.querySelectorAll(`.${enemySide}-slot`);
            if (heroSlots.length === 0) {
                return null;
            }
            
            // Calculate bounds from hero slots
            const rects = Array.from(heroSlots).map(slot => slot.getBoundingClientRect());
            const left = Math.min(...rects.map(r => r.left));
            const right = Math.max(...rects.map(r => r.right));
            const top = Math.min(...rects.map(r => r.top));
            const bottom = Math.max(...rects.map(r => r.bottom));
            
            return {
                left: left - 50,  // Extend slightly beyond slots
                top: top - 50,
                width: (right - left) + 100,
                height: (bottom - top) + 100
            };
        }
        
        const rect = sideElement.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    // Create a single rain drop
    createRainDrop(container, bounds) {
        const drop = document.createElement('div');
        drop.className = 'poisoned-rain-drop';
        drop.innerHTML = '💜';
        
        // Random horizontal position within the container
        const x = Math.random() * bounds.width;
        
        // Random drop characteristics
        const size = 0.8 + Math.random() * 0.6; // 0.8x to 1.4x size
        const duration = 800 + Math.random() * 400; // 800-1200ms fall time
        const rotation = Math.random() * 360;
        
        drop.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: -20px;
            font-size: ${16 * size}px;
            transform: rotate(${rotation}deg);
            animation: poisonedRainFall ${this.battleManager.getSpeedAdjustedDelay(duration)}ms linear forwards;
            text-shadow: 
                0 0 8px rgba(128, 0, 128, 0.9),
                0 0 16px rgba(75, 0, 130, 0.7),
                0 0 24px rgba(148, 0, 211, 0.5);
            filter: drop-shadow(0 0 4px rgba(128, 0, 128, 0.8));
        `;
        
        // Set fall distance
        drop.style.setProperty('--fall-distance', `${bounds.height + 120}px`);
        
        container.appendChild(drop);
        
        // Remove drop after animation
        setTimeout(() => {
            if (drop && drop.parentNode) {
                drop.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(duration + 100));
    }

    // Create impact effects on all targets when poison is applied
    createTargetImpactEffects(targets) {
        targets.forEach((target, index) => {
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
                    this.createPoisonImpactEffect(targetElement);
                }
            }, this.battleManager.getSpeedAdjustedDelay(index * 50)); // Staggered impacts
        });
    }

    // Create poison impact effect on a single target
    createPoisonImpactEffect(targetElement) {
        const impact = document.createElement('div');
        impact.className = 'poisoned-rain-impact';
        impact.innerHTML = '☠️💜';
        
        impact.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 32px;
            z-index: 450;
            pointer-events: none;
            animation: poisonedRainImpact ${this.battleManager.getSpeedAdjustedDelay(200)}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(128, 0, 128, 1),
                0 0 30px rgba(75, 0, 130, 0.8);
        `;
        
        targetElement.appendChild(impact);
        
        setTimeout(() => {
            if (impact && impact.parentNode) {
                impact.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(200));
    }

    // Clean up any remaining poisoned rain effects
    cleanupPoisonedRainEffects() {
        // Remove rain containers
        const containers = document.querySelectorAll('.poisoned-rain-container');
        containers.forEach(container => container.remove());
        
        // Remove any remaining drops and impacts
        const effects = document.querySelectorAll('.poisoned-rain-drop, .poisoned-rain-impact');
        effects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for poisoned rain effects
    ensurePoisonedRainCSS() {
        if (document.getElementById('poisonedWellCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'poisonedWellCSS';
        style.textContent = `
            @keyframes poisonedRainFall {
                0% { 
                    transform: translateY(0) rotate(0deg);
                    opacity: 0.8;
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% { 
                    transform: translateY(var(--fall-distance)) rotate(360deg);
                    opacity: 0.3;
                }
            }
            
            @keyframes poisonedRainImpact {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5); 
                }
                50% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.2); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.5); 
                }
            }
            
            /* Enhanced visual effects */
            .poisoned-rain-container {
                will-change: transform;
            }
            
            .poisoned-rain-drop {
                will-change: transform, opacity;
            }
            
            .poisoned-rain-impact {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, poisonStacks, targets) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        const heroTargets = targets.filter(t => t.type === 'hero').length;
        const creatureTargets = targets.filter(t => t.type === 'creature').length;
        
        let targetDescription = '';
        if (heroTargets > 0 && creatureTargets > 0) {
            targetDescription = `${heroTargets} hero${heroTargets > 1 ? 's' : ''} and ${creatureTargets} creature${creatureTargets > 1 ? 's' : ''}`;
        } else if (heroTargets > 0) {
            targetDescription = `${heroTargets} hero${heroTargets > 1 ? 's' : ''}`;
        } else if (creatureTargets > 0) {
            targetDescription = `${creatureTargets} creature${creatureTargets > 1 ? 's' : ''}`;
        } else {
            targetDescription = 'no targets';
        }
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `☔ ${this.displayName} rains poison down on ${targetDescription}, applying ${poisonStacks} poison stack${poisonStacks > 1 ? 's' : ''} each!`,
            logType
        );
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            poisonStacks: poisonStacks,
            targetCount: targets.length,
            heroTargets: heroTargets,
            creatureTargets: creatureTargets,
            targets: targets.map(t => ({
                type: t.type,
                name: t.name,
                position: t.position,
                creatureIndex: t.creatureIndex
            })),
            effectType: 'area_poison_rain',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, poisonStacks, heroTargets, creatureTargets } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Create target description
        let targetDescription = '';
        if (heroTargets > 0 && creatureTargets > 0) {
            targetDescription = `${heroTargets} hero${heroTargets > 1 ? 's' : ''} and ${creatureTargets} creature${creatureTargets > 1 ? 's' : ''}`;
        } else if (heroTargets > 0) {
            targetDescription = `${heroTargets} hero${heroTargets > 1 ? 's' : ''}`;
        } else if (creatureTargets > 0) {
            targetDescription = `${creatureTargets} creature${creatureTargets > 1 ? 's' : ''}`;
        } else {
            targetDescription = 'no targets';
        }
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `☔ ${displayName} rains poison down on ${targetDescription}, applying ${poisonStacks} poison stack${poisonStacks > 1 ? 's' : ''} each!`,
            logType
        );
        
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
        
        // Play visual effects on guest side (no poison application)
        this.playPoisonedRainAnimationGuestSide(mockCaster, mockTargets, poisonStacks);
        
        console.log(`☔ GUEST: ${casterName} used ${displayName} affecting ${data.targetCount} targets (${poisonStacks} poison stacks each)`);
    }

    // Guest-side animation (visual only, no poison application)
    async playPoisonedRainAnimationGuestSide(caster, targets, poisonStacks) {
        console.log(`☔ GUEST: Playing Poisoned Rain animation...`);
        
        // Determine enemy side for rain positioning
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        
        // Create rain effect across the entire enemy side
        this.createPoisonedRainEffect(enemySide);
        
        // Animation timing
        const rainDuration = 1000;
        const impactDelay = 600;
        
        // Create impact effects on targets (visual only)
        setTimeout(() => {
            this.createTargetImpactEffects(targets);
        }, this.battleManager.getSpeedAdjustedDelay(impactDelay));
        
        // Wait for full rain duration
        await this.battleManager.delay(rainDuration);
        
        // Cleanup
        this.cleanupPoisonedRainEffects();
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
            description: 'Creates a poisonous rain that falls across the entire enemy side, applying poison to all enemy targets',
            effectFormula: 'DecayMagic level poison stacks (minimum 1) to all enemies',
            targetType: 'all_enemies',
            spellSchool: 'DecayMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupPoisonedRainEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('poisonedWellCSS');
        if (css) css.remove();
        
        console.log('☔ Poisoned Well spell cleaned up');
    }
}

// Export for use in spell system
export default PoisonedWellSpell;