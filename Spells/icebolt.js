// ./Spells/icebolt.js - Icebolt Spell Implementation

export class IceboltSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Icebolt';
        this.displayName = 'Icebolt';
        
        console.log('🧊 Icebolt spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Icebolt spell effect
    async executeSpell(caster, spell) {
        console.log(`🧊 ${caster.name} casting ${this.displayName}!`);
        
        // Calculate frozen stacks based on DecayMagic level
        const frozenStacks = this.calculateFrozenStacks(caster);
        
        // Find target using normal attack targeting logic
        const target = this.findTarget(caster);
        
        if (!target) {
            console.log(`🧊 ${this.displayName}: No valid target found!`);
            return;
        }

        // Check if target resists the spell
        const isResisted = this.battleManager.resistanceManager && 
            this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
        
        if (isResisted) {
            console.log(`🛡️ ${target.hero.name} resisted ${this.displayName}!`);
        } else {
            // Log the spell effect only if not resisted
            this.logSpellEffect(caster, frozenStacks, target);
        }
        
        // Play icebolt animation (frozen will only be applied if not resisted, but ice animation always shows)
        await this.playIceboltAnimation(caster, target, frozenStacks, isResisted);
        
        console.log(`🧊 ${this.displayName} completed!`);
    }

    // ============================================
    // FROZEN STACK CALCULATION
    // ============================================

    // Calculate frozen stacks: 1 + floor(DecayMagic level / 2) + 1 if caster is Gon
    calculateFrozenStacks(caster) {
        // Get DecayMagic level (defaults to 0 if hero doesn't have the ability)
        const decayMagicLevel = caster.hasAbility('DecayMagic') 
            ? caster.getAbilityStackCount('DecayMagic') 
            : 0;
        
        const additionalStacks = Math.floor(decayMagicLevel / 2);
        let frozenStacks = 1 + additionalStacks;
        
        // Special bonus for Gon
        const gonBonus = caster.name === 'Gon' ? 1 : 0;
        frozenStacks += gonBonus;
        
        let logDetails = `1 base + ${additionalStacks} from DecayMagic`;
        if (gonBonus > 0) {
            logDetails += ` + ${gonBonus} from Gon's mastery`;
        }
        
        console.log(`🧊 ${caster.name} DecayMagic level ${decayMagicLevel}: ${frozenStacks} frozen stacks (${logDetails})`);
        
        return frozenStacks;
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
    // FROZEN APPLICATION
    // ============================================

    // Apply frozen stacks to the target
    applyFrozenToTarget(target, frozenStacks) {
        let actualTarget;
        
        if (target.type === 'creature') {
            // Apply frozen to the creature
            actualTarget = target.creature;
        } else {
            // Apply frozen to the hero
            actualTarget = target.hero;
        }
        
        // Apply frozen status effect using the status effects manager
        if (this.battleManager.statusEffectsManager) {
            const success = this.battleManager.statusEffectsManager.applyStatusEffect(
                actualTarget, 
                'frozen', 
                frozenStacks
            );
            
            if (success) {
                console.log(`🧊 Successfully applied ${frozenStacks} frozen stacks to ${actualTarget.name}`);
                return true;
            } else {
                console.error(`🧊 Failed to apply frozen to ${actualTarget.name}`);
                return false;
            }
        } else {
            console.error('🧊 Status effects manager not available!');
            return false;
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the icebolt projectile and ice formation animation
    async playIceboltAnimation(caster, target, frozenStacks, isResisted = false) {
        console.log(`🧊 Playing Icebolt animation from ${caster.name} to target... (resisted: ${isResisted})`);
        
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
            console.error('Could not find caster or target elements for icebolt animation');
            // Still apply the frozen effect even if animation fails (unless resisted)
            if (!isResisted) {
                this.applyFrozenToTarget(target, frozenStacks);
            }
            return;
        }
        
        // Calculate positions
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = casterRect.left + casterRect.width / 2;
        const startY = casterRect.top + casterRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Create icebolt projectile
        const iceboltProjectile = this.createIceboltProjectile(startX, startY, endX, endY);
        
        // Animation timing
        const projectileTime = 260; // 260ms for projectile travel (slightly slower than venom)
        const iceTime = 200;        // 200ms for ice formation effect
        
        // Wait for projectile to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove projectile and apply frozen/show ice effect
        if (iceboltProjectile && iceboltProjectile.parentNode) {
            iceboltProjectile.remove();
        }
        
        // Apply frozen ONLY if not resisted
        if (!isResisted) {
            this.applyFrozenToTarget(target, frozenStacks);
        }
        
        // ALWAYS create ice formation effect (regardless of resistance)
        this.createIceFormationEffect(targetElement, frozenStacks, isResisted);
        
        // Wait for ice effect to complete
        await this.battleManager.delay(iceTime);
        
        // Cleanup
        this.cleanupIceboltEffects();
    }

    // Create the icebolt projectile element
    createIceboltProjectile(startX, startY, endX, endY) {
        const icebolt = document.createElement('div');
        icebolt.className = 'icebolt-projectile';
        icebolt.innerHTML = '🧊💨';
        
        // Calculate travel distance for scaling effect
        const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const maxDistance = 800; // Approximate max battlefield width
        const sizeMultiplier = 1 + (distance / maxDistance) * 0.25; // Smaller scaling than fireball
        
        icebolt.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: ${Math.min(34 * sizeMultiplier, 50)}px;
            z-index: 400;
            pointer-events: none;
            transform: translate(-50%, -50%);
            animation: iceboltTravel ${this.battleManager.getSpeedAdjustedDelay(260)}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(100, 200, 255, 0.9),
                0 0 30px rgba(150, 220, 255, 0.7),
                0 0 45px rgba(200, 240, 255, 0.5);
            filter: drop-shadow(0 0 6px rgba(100, 200, 255, 0.8));
        `;
        
        // Set CSS custom properties for target position
        icebolt.style.setProperty('--target-x', `${endX}px`);
        icebolt.style.setProperty('--target-y', `${endY}px`);
        
        document.body.appendChild(icebolt);
        
        // Ensure CSS exists
        this.ensureIceboltCSS();
        
        return icebolt;
    }

    // Create ice formation effect at target location (always shown)
    createIceFormationEffect(targetElement, frozenStacks, isResisted = false) {
        // Create main ice effect
        const effect = document.createElement('div');
        effect.className = isResisted ? 'icebolt-resistance-shield' : 'icebolt-ice-formation';
        
        if (isResisted) {
            // Show shield effect for resisted, but still with ice theme
            effect.innerHTML = '🛡️❄️';
            effect.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                z-index: 450;
                pointer-events: none;
                animation: iceboltResisted ${this.battleManager.getSpeedAdjustedDelay(200)}ms ease-out forwards;
                text-shadow: 
                    0 0 20px rgba(100, 200, 255, 1),
                    0 0 40px rgba(150, 150, 255, 0.8),
                    0 0 60px rgba(200, 200, 255, 0.6);
            `;
        } else {
            // Normal ice formation
            effect.innerHTML = '❄️🧊❄️';
            effect.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                z-index: 450;
                pointer-events: none;
                animation: iceboltIceFormation ${this.battleManager.getSpeedAdjustedDelay(200)}ms ease-out forwards;
                text-shadow: 
                    0 0 20px rgba(100, 200, 255, 1),
                    0 0 40px rgba(150, 220, 255, 0.8),
                    0 0 60px rgba(200, 240, 255, 0.6);
            `;
        }
        
        targetElement.appendChild(effect);
        
        // Create additional ice crystals for multiple stacks (only if not resisted)
        if (!isResisted) {
            this.createIceCrystals(targetElement, frozenStacks);
        }
        
        // Remove effect after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(200));
    }

    // Create additional ice crystals to represent multiple stacks
    createIceCrystals(targetElement, stackCount) {
        const maxCrystals = Math.min(stackCount, 6); // Cap visual crystals at 6
        
        for (let i = 0; i < maxCrystals; i++) {
            setTimeout(() => {
                const crystal = document.createElement('div');
                crystal.className = 'icebolt-ice-crystal';
                crystal.innerHTML = '❄️';
                
                // Random positioning around the target
                const angle = (i / maxCrystals) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                const distance = 30 + Math.random() * 25;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                
                crystal.style.cssText = `
                    position: absolute;
                    top: calc(50% + ${y}px);
                    left: calc(50% + ${x}px);
                    transform: translate(-50%, -50%);
                    font-size: ${16 + Math.random() * 12}px;
                    z-index: 350;
                    pointer-events: none;
                    animation: iceboltIceCrystal ${this.battleManager.getSpeedAdjustedDelay(140)}ms ease-out forwards;
                    text-shadow: 
                        0 0 8px rgba(100, 200, 255, 0.8),
                        0 0 16px rgba(150, 220, 255, 0.6);
                `;
                
                targetElement.appendChild(crystal);
                
                setTimeout(() => {
                    if (crystal && crystal.parentNode) {
                        crystal.remove();
                    }
                }, this.battleManager.getSpeedAdjustedDelay(140));
            }, this.battleManager.getSpeedAdjustedDelay(i * 25)); // Staggered crystal creation
        }
    }

    // Clean up any remaining icebolt effects
    cleanupIceboltEffects() {
        // Remove any remaining projectiles
        const projectiles = document.querySelectorAll('.icebolt-projectile');
        projectiles.forEach(projectile => projectile.remove());
        
        // Remove any remaining ice effects
        const iceEffects = document.querySelectorAll('.icebolt-ice-formation, .icebolt-ice-crystal, .icebolt-resistance-shield');
        iceEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for icebolt effects
    ensureIceboltCSS() {
        if (document.getElementById('iceboltCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'iceboltCSS';
        style.textContent = `
            @keyframes iceboltTravel {
                0% { 
                    transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
                    opacity: 1;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.1) rotate(60deg);
                    opacity: 1;
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(300deg);
                }
                100% { 
                    left: var(--target-x);
                    top: var(--target-y);
                    transform: translate(-50%, -50%) scale(1.3) rotate(360deg);
                    opacity: 0.8;
                }
            }
            
            @keyframes iceboltIceFormation {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(90deg); 
                }
                70% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.6) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.8) rotate(270deg); 
                }
            }
            
            @keyframes iceboltResisted {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(45deg); 
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
            
            @keyframes iceboltIceCrystal {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.2) rotate(0deg); 
                }
                40% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.0) rotate(120deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(240deg); 
                }
            }
            
            /* Enhanced visual effects */
            .icebolt-projectile {
                will-change: transform, opacity;
            }
            
            .icebolt-ice-formation, .icebolt-ice-crystal, .icebolt-resistance-shield {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, frozenStacks, target) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        let targetName;
        if (target.type === 'creature') {
            targetName = target.creature.name;
        } else {
            targetName = target.hero.name;
        }
        
        // Main spell effect log
        let logMessage = `🧊 ${this.displayName} freezes ${targetName} with ${frozenStacks} frozen stack${frozenStacks > 1 ? 's' : ''}!`;
        
        // Add special message for Gon's bonus
        if (caster.name === 'Gon') {
            logMessage += ` (Gon's mastery adds extra ice!)`;
        }
        
        this.battleManager.addCombatLog(logMessage, logType);
        
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
            targetCreatureIndex: target.type === 'creature' ? target.creatureIndex : undefined,
            frozenStacks: frozenStacks,
            isResisted: false,
            effectType: 'frozen_application',
            hasGonBonus: caster.name === 'Gon', // NEW: Include Gon bonus info for guest
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, frozenStacks, isResisted, hasGonBonus } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log only if not resisted
        if (!isResisted) {
            let logMessage = `🧊 ${displayName} freezes ${targetName} with ${frozenStacks} frozen stack${frozenStacks > 1 ? 's' : ''}!`;
            
            // Add special message for Gon's bonus
            if (hasGonBonus) {
                logMessage += ` (Gon's mastery adds extra ice!)`;
            }
            
            this.battleManager.addCombatLog(logMessage, logType);
        }
        
        // Create mock objects for guest-side animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        const targetLocalSide = (data.targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        let mockTarget;
        if (data.targetType === 'creature') {
            // For creature targets
            mockTarget = {
                type: 'creature',
                side: targetLocalSide,
                position: data.targetPosition,
                creatureIndex: data.targetCreatureIndex || 0,
                hero: {} // Mock hero object
            };
        } else {
            // For hero targets
            mockTarget = {
                type: 'hero',
                side: targetLocalSide,
                position: data.targetPosition,
                hero: {} // Mock hero object
            };
        }
        
        // Play visual effects on guest side (no frozen application)
        this.playIceboltAnimationGuestSide(mockCaster, mockTarget, frozenStacks, isResisted);
        
        console.log(`🧊 GUEST: ${casterName} used ${displayName} on ${targetName}${isResisted ? ' (RESISTED)' : ''}${hasGonBonus ? ' (Gon bonus)' : ''} (${frozenStacks} frozen stacks)`);
    }

    // Guest-side animation (visual only, no frozen application)
    async playIceboltAnimationGuestSide(caster, target, frozenStacks, isResisted = false) {
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
            console.error('Could not find caster or target elements for guest icebolt animation');
            return;
        }
        
        // Calculate positions
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = casterRect.left + casterRect.width / 2;
        const startY = casterRect.top + casterRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Create icebolt projectile
        const iceboltProjectile = this.createIceboltProjectile(startX, startY, endX, endY);
        
        // Animation timing
        const projectileTime = 260;
        const iceTime = 200;
        
        // Wait for projectile to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove projectile and create ice effect
        if (iceboltProjectile && iceboltProjectile.parentNode) {
            iceboltProjectile.remove();
        }
        
        // Create ice formation effect (visual only)
        this.createIceFormationEffect(targetElement, frozenStacks, isResisted);
        
        // Wait for ice effect to complete
        await this.battleManager.delay(iceTime);
        
        // Cleanup
        this.cleanupIceboltEffects();
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
            description: 'Launches an icy projectile that freezes the target, applying frozen stacks based on DecayMagic level. Gon gains +1 bonus frozen stack.',
            effectFormula: '1 frozen stack + floor(DecayMagic level / 2) additional stacks + 1 if caster is Gon',
            targetType: 'single_target_next_opposite',
            spellSchool: 'DecayMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupIceboltEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('iceboltCSS');
        if (css) css.remove();
        
        console.log('🧊 Icebolt spell cleaned up');
    }
}

// Export for use in spell system
export default IceboltSpell;