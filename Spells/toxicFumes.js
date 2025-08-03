// ./Spells/toxicFumes.js - Toxic Fumes Spell Implementation

export class ToxicFumesSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'ToxicFumes';
        this.displayName = 'Toxic Fumes';
        
        console.log('💨 Toxic Fumes spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Toxic Fumes spell effect
    async executeSpell(caster, spell) {
        console.log(`💨 ${caster.name} casting ${this.displayName}!`);
        
        // Check if opponent has living creatures (prerequisite)
        if (!this.canCastSpell(caster)) {
            console.log(`💨 ${this.displayName}: Cannot cast - opponent has no living creatures!`);
            return;
        }
        
        // Calculate poison stacks based on DecayMagic level
        const poisonStacks = this.calculatePoisonStacks(caster);
        
        // Find all enemy creatures
        const creatureTargets = this.findAllEnemyCreatures(caster);
        
        if (creatureTargets.length === 0) {
            console.log(`💨 ${this.displayName}: No creature targets found!`);
            return;
        }
        
        // Log the spell effect
        this.logSpellEffect(caster, poisonStacks, creatureTargets);
        
        // Play toxic fumes animation and apply poison when fumes reach targets
        await this.playToxicFumesAnimation(caster, creatureTargets, poisonStacks);
        
        console.log(`💨 ${this.displayName} completed!`);
    }

    // ============================================
    // SPELL CASTING PREREQUISITES
    // ============================================

    // Check if the spell can be cast (opponent must have living creatures)
    canCastSpell(caster) {
        const enemyCreatures = this.findAllEnemyCreatures(caster);
        return enemyCreatures.length > 0;
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
        
        console.log(`💨 ${caster.name} DecayMagic level ${decayMagicLevel}: ${poisonStacks} poison stacks to all enemy creatures`);
        
        return poisonStacks;
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find all enemy creatures (only creatures, not heroes)
    findAllEnemyCreatures(caster) {
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const creatureTargets = [];
        
        // Check each position for living creatures only
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.creatures && hero.creatures.length > 0) {
                // Add living creatures
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        creatureTargets.push({
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
        });
        
        console.log(`💨 ${this.displayName} found ${creatureTargets.length} living enemy creatures:`, 
                   creatureTargets.map(t => `${t.name} (${t.position})`).join(', '));
        
        return creatureTargets;
    }

    // ============================================
    // POISON APPLICATION
    // ============================================

    // Apply poison stacks to all creature targets
    async applyPoisonToAllCreatures(creatureTargets, poisonStacks) {
        const poisonPromises = [];
        
        creatureTargets.forEach((target, index) => {
            // Stagger poison application for visual effect
            const delay = index * 100; // 100ms between each creature
            
            const poisonPromise = new Promise((resolve) => {
                setTimeout(() => {
                    const creature = target.creature;
                    
                    // Apply poison status effect using the status effects manager
                    if (this.battleManager.statusEffectsManager) {
                        const success = this.battleManager.statusEffectsManager.applyStatusEffect(
                            creature, 
                            'poisoned', 
                            poisonStacks
                        );
                        
                        if (success) {
                            console.log(`💨 Applied ${poisonStacks} poison stacks to creature ${creature.name}`);
                        } else {
                            console.error(`💨 Failed to apply poison to creature ${creature.name}`);
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

    // Play the toxic fumes animation covering creature areas
    async playToxicFumesAnimation(caster, creatureTargets, poisonStacks) {
        console.log(`💨 Playing Toxic Fumes animation covering ${creatureTargets.length} creatures...`);
        
        // Determine enemy side for fumes positioning
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        
        // Create slow-covering fumes effect across creature areas
        this.createToxicFumesEffect(caster, enemySide, creatureTargets);
        
        // Animation timing - total 1 second as requested
        const totalDuration = 1000; // 1 second total
        const poisonApplicationDelay = 400; // Apply poison 0.4 seconds into the animation
        
        // Start applying poison partway through the fumes coverage
        setTimeout(() => {
            this.applyPoisonToAllCreatures(creatureTargets, poisonStacks);
            
            // Create impact effects on all creature targets
            this.createCreatureImpactEffects(creatureTargets);
        }, this.battleManager.getSpeedAdjustedDelay(poisonApplicationDelay));
        
        // Wait for full animation duration
        await this.battleManager.delay(totalDuration);
        
        // Cleanup
        this.cleanupToxicFumesEffects();
    }

    // Create the toxic fumes effect covering all enemy creatures
    createToxicFumesEffect(caster, enemySide, creatureTargets) {
        // Group creatures by position for more efficient fumes coverage
        const creaturesByPosition = this.groupCreaturesByPosition(creatureTargets);
        
        // Create slow-moving clouds covering each position that has creatures
        Object.keys(creaturesByPosition).forEach((position, index) => {
            setTimeout(() => {
                this.createPositionFumesCloud(position, enemySide, creaturesByPosition[position]);
            }, this.battleManager.getSpeedAdjustedDelay(index * 100)); // Slight stagger for visual appeal
        });
        
        // Ensure CSS exists
        this.ensureToxicFumesCSS();
    }

    // Group creatures by their hero position
    groupCreaturesByPosition(creatureTargets) {
        const grouped = {};
        
        creatureTargets.forEach(target => {
            const position = target.position;
            if (!grouped[position]) {
                grouped[position] = [];
            }
            grouped[position].push(target);
        });
        
        return grouped;
    }

    // Create slow-moving fumes clouds covering a specific position
    createPositionFumesCloud(position, enemySide, creatures) {
        // Get target position bounds
        const targetSlot = document.querySelector(`.${enemySide}-slot.${position}-slot`);
        if (!targetSlot) {
            console.error(`Could not find target slot: ${enemySide}-slot.${position}-slot`);
            return;
        }
        
        const targetRect = targetSlot.getBoundingClientRect();
        const centerX = targetRect.left + targetRect.width / 2;
        const centerY = targetRect.top + targetRect.height / 2;
        
        // Create multiple overlapping clouds for better coverage
        const cloudCount = Math.min(creatures.length + 2, 5); // 2-5 clouds depending on creature count
        
        for (let i = 0; i < cloudCount; i++) {
            setTimeout(() => {
                this.createSlowFumesCloud(centerX, centerY, targetRect, i);
            }, this.battleManager.getSpeedAdjustedDelay(i * 50)); // Stagger cloud appearance
        }
    }

    // Create a single slow-moving fumes cloud
    createSlowFumesCloud(centerX, centerY, targetRect, cloudIndex) {
        const cloud = document.createElement('div');
        cloud.className = 'toxic-fumes-slow-cloud';
        cloud.innerHTML = '☁️💨☁️';
        
        // Position cloud slightly offset from center for natural coverage
        const offsetX = (Math.random() - 0.5) * targetRect.width * 0.6;
        const offsetY = (Math.random() - 0.5) * targetRect.height * 0.6;
        const startX = centerX + offsetX;
        const startY = centerY + offsetY;
        
        // Calculate slow drift distance (small movement)
        const driftX = (Math.random() - 0.5) * 40; // Small horizontal drift
        const driftY = (Math.random() - 0.5) * 30; // Small vertical drift
        const endX = startX + driftX;
        const endY = startY + driftY;
        
        cloud.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: ${40 + cloudIndex * 8}px;
            z-index: ${400 + cloudIndex};
            pointer-events: none;
            transform: translate(-50%, -50%) scale(0.3);
            animation: toxicFumesSlowCover ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
            text-shadow: 
                0 0 25px rgba(0, 128, 0, 0.9),
                0 0 50px rgba(34, 139, 34, 0.7),
                0 0 75px rgba(0, 255, 0, 0.5);
            filter: drop-shadow(0 0 10px rgba(0, 128, 0, 0.8));
            opacity: 0;
        `;
        
        // Set drift target for animation
        cloud.style.setProperty('--drift-x', `${endX}px`);
        cloud.style.setProperty('--drift-y', `${endY}px`);
        
        document.body.appendChild(cloud);
        
        // Remove cloud after animation
        setTimeout(() => {
            if (cloud && cloud.parentNode) {
                cloud.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(1000));
    }

    // Create impact effects on all creature targets when poison is applied
    createCreatureImpactEffects(creatureTargets) {
        creatureTargets.forEach((target, index) => {
            setTimeout(() => {
                const creatureElement = document.querySelector(
                    `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
                );
                
                if (creatureElement) {
                    this.createPoisonImpactEffect(creatureElement);
                }
            }, this.battleManager.getSpeedAdjustedDelay(index * 100)); // Staggered impacts
        });
    }

    // Create poison impact effect on a single creature
    createPoisonImpactEffect(creatureElement) {
        const impact = document.createElement('div');
        impact.className = 'toxic-fumes-impact';
        impact.innerHTML = '☠️💚';
        
        impact.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 28px;
            z-index: 450;
            pointer-events: none;
            animation: toxicFumesImpact ${this.battleManager.getSpeedAdjustedDelay(250)}ms ease-out forwards;
            text-shadow: 
                0 0 12px rgba(0, 128, 0, 1),
                0 0 24px rgba(34, 139, 34, 0.8);
        `;
        
        creatureElement.appendChild(impact);
        
        setTimeout(() => {
            if (impact && impact.parentNode) {
                impact.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(250));
    }

    // Clean up any remaining toxic fumes effects
    cleanupToxicFumesEffects() {
        // Remove all fumes effects
        const effects = document.querySelectorAll('.toxic-fumes-slow-cloud, .toxic-fumes-impact');
        effects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for toxic fumes effects
    ensureToxicFumesCSS() {
        if (document.getElementById('toxicFumesCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'toxicFumesCSS';
        style.textContent = `
            @keyframes toxicFumesSlowCover {
                0% { 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                    opacity: 0;
                }
                15% {
                    opacity: 0.6;
                    transform: translate(-50%, -50%) scale(0.8) rotate(45deg);
                }
                50% {
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.4) rotate(180deg);
                }
                85% {
                    opacity: 0.7;
                    left: var(--drift-x);
                    top: var(--drift-y);
                    transform: translate(-50%, -50%) scale(1.6) rotate(315deg);
                }
                100% { 
                    left: var(--drift-x);
                    top: var(--drift-y);
                    transform: translate(-50%, -50%) scale(1.8) rotate(360deg);
                    opacity: 0;
                }
            }
            
            @keyframes toxicFumesImpact {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.4); 
                }
                60% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.1); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.3); 
                }
            }
            
            /* Enhanced visual effects */
            .toxic-fumes-slow-cloud {
                will-change: transform, opacity;
            }
            
            .toxic-fumes-impact {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, poisonStacks, creatureTargets) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        const creatureCount = creatureTargets.length;
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `💨 ${this.displayName} engulfs ${creatureCount} enemy creature${creatureCount > 1 ? 's' : ''}, applying ${poisonStacks} poison stack${poisonStacks > 1 ? 's' : ''} each!`,
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
            creatureTargets: creatureTargets.map(t => ({
                name: t.name,
                position: t.position,
                creatureIndex: t.creatureIndex
            })),
            creatureCount: creatureCount,
            effectType: 'creature_toxic_fumes',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, poisonStacks, creatureCount } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `💨 ${displayName} engulfs ${creatureCount} enemy creature${creatureCount > 1 ? 's' : ''}, applying ${poisonStacks} poison stack${poisonStacks > 1 ? 's' : ''} each!`,
            logType
        );
        
        // Create mock caster for animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        // Create mock creature targets for animation
        const enemySide = casterLocalSide === 'player' ? 'opponent' : 'player';
        const mockCreatureTargets = data.creatureTargets.map(targetData => ({
            name: targetData.name,
            position: targetData.position,
            side: enemySide,
            creatureIndex: targetData.creatureIndex
        }));
        
        // Play visual effects on guest side (no poison application)
        this.playToxicFumesAnimationGuestSide(mockCaster, mockCreatureTargets, poisonStacks);
        
        console.log(`💨 GUEST: ${casterName} used ${displayName} affecting ${creatureCount} creatures (${poisonStacks} poison stacks each)`);
    }

    // Guest-side animation (visual only, no poison application)
    async playToxicFumesAnimationGuestSide(caster, creatureTargets, poisonStacks) {
        console.log(`💨 GUEST: Playing Toxic Fumes animation...`);
        
        // Determine enemy side for fumes positioning
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        
        // Create slow-covering fumes effect
        this.createToxicFumesEffect(caster, enemySide, creatureTargets);
        
        // Animation timing - match host timing
        const totalDuration = 1000; // 1 second total
        const impactDelay = 400; // Match host timing
        
        // Create impact effects on targets (visual only)
        setTimeout(() => {
            this.createCreatureImpactEffects(creatureTargets);
        }, this.battleManager.getSpeedAdjustedDelay(impactDelay));
        
        // Wait for full animation duration
        await this.battleManager.delay(totalDuration);
        
        // Cleanup
        this.cleanupToxicFumesEffects();
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
            description: 'Spreads toxic fumes that poison all enemy creatures. Can only be cast when opponents control living creatures.',
            effectFormula: 'DecayMagic level poison stacks (minimum 1) to all enemy creatures',
            targetType: 'all_enemy_creatures_only',
            spellSchool: 'DecayMagic',
            castingRequirement: 'Opponent must control 1+ living creatures'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupToxicFumesEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('toxicFumesCSS');
        if (css) css.remove();
        
        console.log('💨 Toxic Fumes spell cleaned up');
    }
}

// Export for use in spell system
export default ToxicFumesSpell;