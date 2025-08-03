// ./Spells/venomInfusion.js - Venom Infusion Spell Implementation

export class VenomInfusionSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'VenomInfusion';
        this.displayName = 'Venom Infusion';
        
        console.log('🐍 Venom Infusion spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Venom Infusion spell effect
    async executeSpell(caster, spell) {
        console.log(`🐍 ${caster.name} casting ${this.displayName}!`);
        
        // Calculate poison stacks based on DecayMagic level
        const poisonStacks = this.calculatePoisonStacks(caster);
        
        // Find target using normal attack targeting logic
        const target = this.findTarget(caster);
        
        if (!target) {
            console.log(`🐍 ${this.displayName}: No valid target found!`);
            return;
        }
        
        // Log the spell effect
        this.logSpellEffect(caster, poisonStacks, target);
        
        // Play venom infusion animation and apply poison when it hits
        await this.playVenomInfusionAnimation(caster, target, poisonStacks);
        
        console.log(`🐍 ${this.displayName} completed!`);
    }

    // ============================================
    // POISON STACK CALCULATION
    // ============================================

    // Calculate poison stacks: X+1 (X = DecayMagic level)
    calculatePoisonStacks(caster) {
        // Get DecayMagic level (defaults to 0 if hero doesn't have the ability)
        const decayMagicLevel = caster.hasAbility('DecayMagic') 
            ? caster.getAbilityStackCount('DecayMagic') 
            : 0;
        
        const poisonStacks = decayMagicLevel + 1;
        
        console.log(`🐍 ${caster.name} DecayMagic level ${decayMagicLevel}: ${poisonStacks} poison stacks`);
        
        return poisonStacks;
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find target using the same logic as normal attacks
    findTarget(caster) {
        const target = this.battleManager.authoritative_findTargetWithCreatures(
            caster.position, 
            caster.side
        );
        
        if (target) {
            if (target.type === 'creature') {
                console.log(`🎯 ${this.displayName} targeting creature: ${target.creature.name} (${target.position} slot)`);
            } else {
                console.log(`🎯 ${this.displayName} targeting hero: ${target.hero.name} (${target.position} slot)`);
            }
        } else {
            console.log(`🎯 ${this.displayName} found no valid targets!`);
        }
        
        return target;
    }

    // ============================================
    // POISON APPLICATION
    // ============================================

    // Apply poison stacks to the target
    applyPoisonToTarget(target, poisonStacks) {
        let actualTarget;
        
        if (target.type === 'creature') {
            // Apply poison to the creature
            actualTarget = target.creature;
        } else {
            // Apply poison to the hero
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
                console.log(`🐍 Successfully applied ${poisonStacks} poison stacks to ${actualTarget.name}`);
                return true;
            } else {
                console.error(`🐍 Failed to apply poison to ${actualTarget.name}`);
                return false;
            }
        } else {
            console.error('🐍 Status effects manager not available!');
            return false;
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the venom infusion projectile and poison application animation
    async playVenomInfusionAnimation(caster, target, poisonStacks) {
        console.log(`🐍 Playing Venom Infusion animation from ${caster.name} to target...`);
        
        // Get caster and target elements
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        let targetElement;
        
        if (target.type === 'creature') {
            // Target is a creature
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        } else {
            // Target is a hero
            targetElement = this.battleManager.getHeroElement(target.side, target.position);
        }
        
        if (!casterElement || !targetElement) {
            console.error('Could not find caster or target elements for venom infusion animation');
            // Still apply the poison effect even if animation fails
            this.applyPoisonToTarget(target, poisonStacks);
            return;
        }
        
        // Calculate positions
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = casterRect.left + casterRect.width / 2;
        const startY = casterRect.top + casterRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Create venom projectile
        const venomProjectile = this.createVenomProjectile(startX, startY, endX, endY);
        
        // Animation timing (similar to fireball but slightly faster)
        const projectileTime = 240; // 240ms for projectile travel
        const poisonTime = 180;     // 180ms for poison application effect
        
        // Wait for projectile to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove projectile and apply poison
        if (venomProjectile && venomProjectile.parentNode) {
            venomProjectile.remove();
        }
        
        // Apply poison right when projectile hits
        this.applyPoisonToTarget(target, poisonStacks);
        
        // Create poison application effect
        this.createPoisonApplicationEffect(targetElement, poisonStacks);
        
        // Wait for poison effect to complete
        await this.battleManager.delay(poisonTime);
        
        // Cleanup
        this.cleanupVenomEffects();
    }

    // Create the venom projectile element
    createVenomProjectile(startX, startY, endX, endY) {
        const venom = document.createElement('div');
        venom.className = 'venom-projectile';
        venom.innerHTML = '🐍💨';
        
        // Calculate travel distance for scaling effect
        const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const maxDistance = 800; // Approximate max battlefield width
        const sizeMultiplier = 1 + (distance / maxDistance) * 0.3; // Smaller scaling than fireball
        
        venom.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: ${Math.min(36 * sizeMultiplier, 54)}px;
            z-index: 400;
            pointer-events: none;
            transform: translate(-50%, -50%);
            animation: venomTravel ${this.battleManager.getSpeedAdjustedDelay(240)}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(128, 0, 128, 0.9),
                0 0 30px rgba(75, 0, 130, 0.7),
                0 0 45px rgba(148, 0, 211, 0.5);
            filter: drop-shadow(0 0 6px rgba(128, 0, 128, 0.8));
        `;
        
        // Set CSS custom properties for target position
        venom.style.setProperty('--target-x', `${endX}px`);
        venom.style.setProperty('--target-y', `${endY}px`);
        
        document.body.appendChild(venom);
        
        // Ensure CSS exists
        this.ensureVenomCSS();
        
        return venom;
    }

    // Create poison application effect at target location
    createPoisonApplicationEffect(targetElement, poisonStacks) {
        // Create main poison cloud
        const poisonCloud = document.createElement('div');
        poisonCloud.className = 'venom-poison-cloud';
        poisonCloud.innerHTML = '☠️💚☠️';
        
        poisonCloud.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 450;
            pointer-events: none;
            animation: venomPoisonCloud ${this.battleManager.getSpeedAdjustedDelay(180)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(128, 0, 128, 1),
                0 0 40px rgba(75, 0, 130, 0.8),
                0 0 60px rgba(148, 0, 211, 0.6);
        `;
        
        targetElement.appendChild(poisonCloud);
        
        // Create additional poison bubbles for multiple stacks
        this.createPoisonBubbles(targetElement, poisonStacks);
        
        // Remove poison cloud after animation
        setTimeout(() => {
            if (poisonCloud && poisonCloud.parentNode) {
                poisonCloud.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(180));
    }

    // Create additional poison bubbles to represent multiple stacks
    createPoisonBubbles(targetElement, stackCount) {
        const maxBubbles = Math.min(stackCount, 6); // Cap visual bubbles at 6
        
        for (let i = 0; i < maxBubbles; i++) {
            setTimeout(() => {
                const bubble = document.createElement('div');
                bubble.className = 'venom-poison-bubble';
                bubble.innerHTML = '💚';
                
                // Random positioning around the target
                const angle = (i / maxBubbles) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                const distance = 30 + Math.random() * 25;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                
                bubble.style.cssText = `
                    position: absolute;
                    top: calc(50% + ${y}px);
                    left: calc(50% + ${x}px);
                    transform: translate(-50%, -50%);
                    font-size: ${16 + Math.random() * 12}px;
                    z-index: 350;
                    pointer-events: none;
                    animation: venomPoisonBubble ${this.battleManager.getSpeedAdjustedDelay(120)}ms ease-out forwards;
                    text-shadow: 
                        0 0 8px rgba(128, 0, 128, 0.8),
                        0 0 16px rgba(75, 0, 130, 0.6);
                `;
                
                targetElement.appendChild(bubble);
                
                setTimeout(() => {
                    if (bubble && bubble.parentNode) {
                        bubble.remove();
                    }
                }, this.battleManager.getSpeedAdjustedDelay(120));
            }, this.battleManager.getSpeedAdjustedDelay(i * 20)); // Staggered bubble creation
        }
    }

    // Clean up any remaining venom effects
    cleanupVenomEffects() {
        // Remove any remaining projectiles
        const projectiles = document.querySelectorAll('.venom-projectile');
        projectiles.forEach(projectile => projectile.remove());
        
        // Remove any remaining poison effects
        const poisonEffects = document.querySelectorAll('.venom-poison-cloud, .venom-poison-bubble');
        poisonEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for venom effects
    ensureVenomCSS() {
        if (document.getElementById('venomInfusionCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'venomInfusionCSS';
        style.textContent = `
            @keyframes venomTravel {
                0% { 
                    transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
                    opacity: 1;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.1) rotate(72deg);
                    opacity: 1;
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(288deg);
                }
                100% { 
                    left: var(--target-x);
                    top: var(--target-y);
                    transform: translate(-50%, -50%) scale(1.3) rotate(360deg);
                    opacity: 0.8;
                }
            }
            
            @keyframes venomPoisonCloud {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.4) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(120deg); 
                }
                70% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(240deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.8) rotate(360deg); 
                }
            }
            
            @keyframes venomPoisonBubble {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.2) rotate(0deg); 
                }
                40% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.0) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(360deg); 
                }
            }
            
            /* Enhanced visual effects */
            .venom-projectile {
                will-change: transform, opacity;
            }
            
            .venom-poison-cloud, .venom-poison-bubble {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, poisonStacks, target) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        let targetName;
        if (target.type === 'creature') {
            targetName = target.creature.name;
        } else {
            targetName = target.hero.name;
        }
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `🐍 ${this.displayName} infects ${targetName} with ${poisonStacks} poison stack${poisonStacks > 1 ? 's' : ''}!`,
            logType
        );
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetName: targetName,
            targetAbsoluteSide: target.hero.absoluteSide,
            targetPosition: target.position,
            targetType: target.type,
            poisonStacks: poisonStacks,
            effectType: 'poison_application',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, poisonStacks } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🐍 ${displayName} infects ${targetName} with ${poisonStacks} poison stack${poisonStacks > 1 ? 's' : ''}!`,
            logType
        );
        
        // Create mock objects for guest-side animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        const targetLocalSide = (data.targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        let mockTarget;
        if (data.targetType === 'creature') {
            // For creature targets, we need to find the specific creature element
            mockTarget = {
                type: 'creature',
                side: targetLocalSide,
                position: data.targetPosition,
                creatureIndex: data.creatureIndex || 0 // This would need to be included in the data
            };
        } else {
            // For hero targets
            mockTarget = {
                type: 'hero',
                side: targetLocalSide,
                position: data.targetPosition
            };
        }
        
        // Play visual effects on guest side (no poison application)
        this.playVenomInfusionAnimationGuestSide(mockCaster, mockTarget, poisonStacks);
        
        console.log(`🐍 GUEST: ${casterName} used ${displayName} on ${targetName} (${poisonStacks} poison stacks)`);
    }

    // Guest-side animation (visual only, no poison application)
    async playVenomInfusionAnimationGuestSide(caster, target, poisonStacks) {
        // Get caster element
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        
        // Get target element
        let targetElement;
        if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        } else {
            targetElement = this.battleManager.getHeroElement(target.side, target.position);
        }
        
        if (!casterElement || !targetElement) {
            console.error('Could not find caster or target elements for guest venom infusion animation');
            return;
        }
        
        // Calculate positions
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = casterRect.left + casterRect.width / 2;
        const startY = casterRect.top + casterRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Create venom projectile
        const venomProjectile = this.createVenomProjectile(startX, startY, endX, endY);
        
        // Animation timing
        const projectileTime = 240;
        const poisonTime = 180;
        
        // Wait for projectile to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove projectile and create poison effect
        if (venomProjectile && venomProjectile.parentNode) {
            venomProjectile.remove();
        }
        
        // Create poison application effect (visual only)
        this.createPoisonApplicationEffect(targetElement, poisonStacks);
        
        // Wait for poison effect to complete
        await this.battleManager.delay(poisonTime);
        
        // Cleanup
        this.cleanupVenomEffects();
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
            description: 'Infuses the target with venomous poison, applying poison stacks based on DecayMagic level',
            effectFormula: '(DecayMagic level + 1) poison stacks',
            targetType: 'single_target_next_opposite',
            spellSchool: 'DecayMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupVenomEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('venomInfusionCSS');
        if (css) css.remove();
        
        console.log('🐍 Venom Infusion spell cleaned up');
    }
}

// Export for use in spell system
export default VenomInfusionSpell;