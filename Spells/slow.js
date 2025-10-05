// ./Spells/slow.js - Slow Spell Implementation

export class SlowSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Slow';
        this.displayName = 'Slow';
        
        console.log('🕰️ Slow spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Check if spell can be cast (requires valid enemy targets)
    canCast(caster) {
        const validTargets = this.findUnmovedEnemyTargets(caster);
        return validTargets.length > 0;
    }

    // Execute Slow spell effect
    async executeSpell(caster, spell) {
        console.log(`🕰️ ${caster.name} casting ${this.displayName}!`);
        
        // Find enemy targets that haven't acted yet
        const validTargets = this.findUnmovedEnemyTargets(caster);
        
        if (validTargets.length === 0) {
            console.log(`🕰️ ${this.displayName}: No valid targets found!`);
            this.battleManager.addCombatLog(
                `🕰️ ${this.displayName} fizzles - no enemies left to slow!`,
                caster.side === 'player' ? 'success' : 'error'
            );
            return;
        }

        // Calculate number of targets based on DecayMagic level
        const targetCount = this.calculateTargetCount(caster);
        
        // Select random targets
        const selectedTargets = this.selectSlowTargets(caster, validTargets, targetCount);
        
        // Log the spell effect
        this.logSpellEffect(caster, selectedTargets, targetCount);
        
        // Play slow animation on all targets
        await this.playSlowAnimation(selectedTargets);
        
        // Remove targets from the actor processing queue
        this.removeTargetsFromActorQueue(selectedTargets);
        
        console.log(`🕰️ ${this.displayName} completed! Slowed ${selectedTargets.length} targets.`);
    }

    // ============================================
    // TARGET CALCULATION AND SELECTION
    // ============================================

    // Calculate number of targets based on DecayMagic level
    calculateTargetCount(caster) {
        // Get DecayMagic level (defaults to 0 if hero doesn't have the ability)
        const decayMagicLevel = caster.hasAbility('DecayMagic') 
            ? caster.getAbilityStackCount('DecayMagic') 
            : 0;
        
        // Ensure minimum level of 1 for calculations
        const effectiveLevel = Math.max(1, decayMagicLevel);
        
        console.log(`🕰️ ${caster.name} DecayMagic level ${decayMagicLevel} (effective: ${effectiveLevel}): targeting up to ${effectiveLevel} enemies`);
        
        return effectiveLevel;
    }

    // Find enemy targets that haven't moved yet in current position
    findUnmovedEnemyTargets(caster) {
        const flowManager = this.battleManager.flowManager;
        if (!flowManager || typeof flowManager.getUnactedActorsForSide !== 'function') {
            console.warn('🕰️ FlowManager not available for round initiative access');
            return [];
        }

        // Get enemy side
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        
        // Get currently acting enemy (to exclude from targeting)
        const currentlyActingEnemy = flowManager.getCurrentlyActingEnemy(caster.side);
        
        // Get all unacted enemy actors
        const unactedEnemies = flowManager.getUnactedActorsForSide(enemySide);
        
        // Convert to target format and exclude currently acting enemy
        const validTargets = unactedEnemies
            .filter(actor => {
                // Must be valid for slowing
                if (!this.isValidSlowTarget(actor)) return false;
                
                // Exclude currently acting enemy (they're taking simultaneous turn)
                if (currentlyActingEnemy && this.isSameActor(actor, currentlyActingEnemy)) {
                    console.log(`🕰️ Excluding currently acting ${actor.name} from Slow targeting`);
                    return false;
                }
                
                return true;
            })
            .map(actor => ({
                actor: actor,
                side: actor.side,
                globalId: actor.globalId,
                position: actor.position
            }));
        
        console.log(`🕰️ Found ${validTargets.length} unmoved enemy targets (excluding currently acting):`, 
            validTargets.map(t => `${t.actor.name} (${t.actor.type}, ${t.position})`).join(', '));
        
        return validTargets;
    }

    isSameActor(actor1, actor2) {
        if (!actor1 || !actor2) return false;
        
        return actor1.type === actor2.type &&
            actor1.name === actor2.name &&
            (actor1.position || actor1.hero?.position) === (actor2.position || actor2.hero?.position) &&
            (actor1.index || 0) === (actor2.index || 0);
    }


    // Check if actor is a valid target for Slow
    isValidSlowTarget(actor) {
        if (!actor || !actor.data) return false;
        
        // Only living targets can be slowed
        if (actor.type === 'hero') {
            return actor.data.alive && actor.data.currentHp > 0;
        } else if (actor.type === 'creature') {
            return actor.data.alive && actor.data.currentHp > 0;
        }
        
        return false;
    }

    // Select random targets for slowing
    selectSlowTargets(caster, validTargets, maxTargets) {
        if (validTargets.length === 0) return [];
        
        // Shuffle and take up to maxTargets
        const shuffledTargets = this.battleManager.shuffleArray([...validTargets]);
        const selectedTargets = shuffledTargets.slice(0, Math.min(maxTargets, validTargets.length));
        
        console.log(`🕰️ ${this.displayName} selected ${selectedTargets.length} targets:`, 
            selectedTargets.map(t => `${t.actor.name} (${t.actor.type})`).join(', '));
        
        return selectedTargets;
    }

    // ============================================
    // ACTOR QUEUE MODIFICATION
    // ============================================

    // Remove selected targets from the actor processing queue
    removeTargetsFromActorQueue(selectedTargets) {
        const flowManager = this.battleManager.flowManager;
        if (!flowManager || typeof flowManager.removeActorFromInitiative !== 'function') {
            console.warn('🕰️ FlowManager not available for initiative modification');
            return;
        }

        let removedCount = 0;
        for (const target of selectedTargets) {
            const success = flowManager.removeActorFromInitiative(target.globalId);
            if (success) {
                removedCount++;
                console.log(`🕰️ Removed ${target.actor.name} (${target.globalId}) from round initiative`);
            }
        }

        console.log(`🕰️ Successfully removed ${removedCount}/${selectedTargets.length} targets from round initiative`);
    }



    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play slow animation on all targets
    async playSlowAnimation(targets) {
        console.log(`🕰️ Playing Slow animation on ${targets.length} targets...`);
        
        // Ensure CSS exists
        this.ensureSlowCSS();
        
        // Apply slow effects to all targets simultaneously
        const animationPromises = targets.map(target => this.createSlowClockEffect(target));
        
        // Wait for all animations to complete
        await Promise.all(animationPromises);
        
        // Cleanup
        this.cleanupSlowEffects();
    }

    // Create spinning clock effect on a target
    async createSlowClockEffect(target) {
        let targetElement;
        
        // Find the target element
        if (target.actor.type === 'hero') {
            targetElement = this.battleManager.getHeroElement(target.side, target.actor.hero.position);
        } else if (target.actor.type === 'creature') {
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.actor.hero.position}-slot .creature-icon[data-creature-index="${target.actor.index}"]`
            );
        }
        
        if (!targetElement) {
            console.warn(`🕰️ Could not find target element for ${target.actor.name}`);
            return;
        }
        
        // Create the spinning clock container
        const clockContainer = document.createElement('div');
        clockContainer.className = 'slow-clock-container';
        
        // Create the clock face
        const clockFace = document.createElement('div');
        clockFace.className = 'slow-clock-face';
        clockFace.innerHTML = '🕐';
        
        clockContainer.appendChild(clockFace);
        
        // Position above the target
        clockContainer.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 500;
            pointer-events: none;
            font-size: 32px;
            animation: slowClockSpin ${this.battleManager.getSpeedAdjustedDelay(2000)}ms ease-out forwards;
        `;
        
        // Create slow effect aura around target
        const slowAura = document.createElement('div');
        slowAura.className = 'slow-target-aura';
        slowAura.style.cssText = `
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            border: 2px solid rgba(100, 149, 237, 0.6);
            border-radius: 50%;
            animation: slowAuraPulse ${this.battleManager.getSpeedAdjustedDelay(2000)}ms ease-out forwards;
            pointer-events: none;
            z-index: 350;
            box-shadow: 0 0 15px rgba(100, 149, 237, 0.4);
        `;
        
        // Add effects to target
        targetElement.appendChild(clockContainer);
        targetElement.appendChild(slowAura);
        
        // Remove effects after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(2000);
        setTimeout(() => {
            if (clockContainer && clockContainer.parentNode) {
                clockContainer.remove();
            }
            if (slowAura && slowAura.parentNode) {
                slowAura.remove();
            }
        }, animationDuration);
        
        // Return promise that resolves when animation completes
        return new Promise(resolve => {
            setTimeout(resolve, animationDuration);
        });
    }

    // Clean up any remaining slow effects
    cleanupSlowEffects() {
        const slowEffects = document.querySelectorAll('.slow-clock-container, .slow-target-aura');
        slowEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for slow effects
    ensureSlowCSS() {
        if (document.getElementById('slowSpellCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'slowSpellCSS';
        style.textContent = `
            @keyframes slowClockSpin {
                0% { 
                    opacity: 0;
                    transform: translateX(-50%) rotate(0deg) scale(0.5);
                    animation-timing-function: ease-out;
                }
                20% {
                    opacity: 1;
                    transform: translateX(-50%) rotate(720deg) scale(1.1);
                    animation-timing-function: ease-out;
                }
                50% {
                    opacity: 1;
                    transform: translateX(-50%) rotate(1080deg) scale(1);
                    animation-timing-function: ease-in;
                }
                80% {
                    opacity: 1;
                    transform: translateX(-50%) rotate(1260deg) scale(1);
                    animation-timing-function: ease-in-out;
                }
                100% { 
                    opacity: 0;
                    transform: translateX(-50%) rotate(1440deg) scale(0.8);
                    animation-timing-function: ease-in;
                }
            }
            
            @keyframes slowAuraPulse {
                0% { 
                    opacity: 0; 
                    transform: scale(0.9); 
                    border-color: rgba(100, 149, 237, 0);
                }
                30% { 
                    opacity: 0.8; 
                    transform: scale(1.1); 
                    border-color: rgba(100, 149, 237, 0.8);
                }
                70% { 
                    opacity: 0.6; 
                    transform: scale(1.05); 
                    border-color: rgba(100, 149, 237, 0.6);
                }
                100% { 
                    opacity: 0; 
                    transform: scale(1); 
                    border-color: rgba(100, 149, 237, 0);
                }
            }
            
            /* Enhanced visual effects */
            .slow-clock-container,
            .slow-target-aura {
                will-change: transform, opacity;
            }
            
            .slow-clock-face {
                filter: drop-shadow(0 0 8px rgba(100, 149, 237, 0.8));
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, targets, maxTargets) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `🕰️ ${this.displayName} slows time for ${targets.length} enemies!`,
            logType
        );
        
        // List the targets
        const targetNames = targets.map(t => t.actor.name).join(', ');
        this.battleManager.addCombatLog(
            `🕰️ Slowed: ${targetNames}`,
            logType
        );
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetCount: targets.length,
            maxTargets: maxTargets,
            targets: targets.map(t => ({
                name: t.actor.name,
                type: t.actor.type,
                position: t.actor.hero.position,
                absoluteSide: t.actor.hero.absoluteSide
            })),
            effectType: 'slow_application',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetCount, targets } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🕰️ ${displayName} slows time for ${targetCount} enemies!`,
            logType
        );
        
        const targetNames = targets.map(t => t.name).join(', ');
        this.battleManager.addCombatLog(
            `🕰️ Slowed: ${targetNames}`,
            logType
        );
        
        // Create mock targets for guest-side animation
        const mockTargets = targets.map(t => {
            const targetLocalSide = (t.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            return {
                actor: {
                    type: t.type,
                    name: t.name,
                    hero: { position: t.position },
                    index: t.type === 'creature' ? 0 : undefined // Approximate for visual effect
                },
                side: targetLocalSide
            };
        });
        
        // Play visual effects on guest side (no actual queue modification)
        this.playSlowAnimationGuestSide(mockTargets);
        
        console.log(`🕰️ GUEST: ${casterName} used ${displayName} on ${targetCount} targets`);
    }

    // Guest-side animation (visual only)
    async playSlowAnimationGuestSide(targets) {
        // Ensure CSS exists
        this.ensureSlowCSS();
        
        // Apply slow effects to all targets
        const animationPromises = targets.map(target => this.createSlowClockEffect(target));
        await Promise.all(animationPromises);
        
        // Cleanup
        this.cleanupSlowEffects();
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
            description: 'Slows time for random enemy targets that have not acted yet, skipping their turns.',
            effectFormula: 'Up to max(1, DecayMagic level) targets',
            targetType: 'random_unmoved_enemies',
            spellSchool: 'DecayMagic',
            usageLimit: 'Unlimited',
            castingRestriction: 'Requires valid enemy targets that have not acted yet'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupSlowEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('slowSpellCSS');
        if (css) css.remove();
        
        console.log('🕰️ Slow spell cleaned up');
    }
}

// Export for use in spell system
export default SlowSpell;