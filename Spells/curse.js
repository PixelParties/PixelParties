// ./Spells/curse.js - Curse Spell Implementation

export class CurseSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Curse';
        this.displayName = 'Curse';
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Curse spell effect
    async executeSpell(caster, spell) {
        // Calculate status effect stacks based on DecayMagic level
        const stacks = this.calculateCurseStacks(caster);
        
        // Find random enemy hero target
        const target = this.findRandomEnemyHero(caster);
        
        if (!target) {
            return;
        }

        // Check if target resists the spell
        const isResisted = this.battleManager.resistanceManager && 
            this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
        
        if (isResisted) {
            // Resistance manager will handle the log message
        } else {
            // Log the spell effect only if not resisted
            this.logSpellEffect(caster, stacks, target);
        }
        
        // Play curse animation (effects will only be applied if not resisted)
        await this.playCurseAnimation(caster, target, stacks, isResisted);
    }

    // ============================================
    // STACK CALCULATION
    // ============================================

    // Calculate curse stacks: 2 + floor(0.5 * DecayMagic level)
    calculateCurseStacks(caster) {
        // Get DecayMagic level (defaults to 1 if hero doesn't have the ability or has level 0)
        const decayMagicLevel = caster.hasAbility('DecayMagic') 
            ? Math.max(1, caster.getAbilityStackCount('DecayMagic'))
            : 1;
        
        const stacks = 2 + Math.floor(0.5 * decayMagicLevel);
        
        return stacks;
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find random enemy hero
    findRandomEnemyHero(caster) {
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Get all alive enemy heroes
        const aliveEnemyHeroes = [];
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                aliveEnemyHeroes.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: enemySide
                });
            }
        });
        
        if (aliveEnemyHeroes.length === 0) {
            return null;
        }
        
        // Pick a random enemy hero
        const randomIndex = this.battleManager.getRandomInt(0, aliveEnemyHeroes.length - 1);
        const target = aliveEnemyHeroes[randomIndex];
        
        return target;
    }

    // ============================================
    // STATUS EFFECT APPLICATION
    // ============================================

    // Apply curse effects (weakened and silenced) to the target
    applyCurseToTarget(target, stacks) {
        const actualTarget = target.hero;
        
        // Apply both status effects using the status effects manager
        if (this.battleManager.statusEffectsManager) {
            const weakenedSuccess = this.battleManager.statusEffectsManager.applyStatusEffect(
                actualTarget, 
                'weakened', 
                stacks
            );
            
            const silencedSuccess = this.battleManager.statusEffectsManager.applyStatusEffect(
                actualTarget, 
                'silenced', 
                stacks
            );
            
            if (weakenedSuccess && silencedSuccess) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the curse animation with dark clouds and skulls
    async playCurseAnimation(caster, target, stacks, isResisted = false) {
        // Get target element
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!targetElement) {
            // Still apply the curse effect even if animation fails (unless resisted)
            if (!isResisted) {
                this.applyCurseToTarget(target, stacks);
            }
            return;
        }
        
        // Ensure CSS exists
        this.ensureCurseCSS();
        
        // Create dark clouds rising from below
        this.createDarkClouds(targetElement);
        
        // Animation timing
        const cloudTime = 600; // Time for clouds to rise
        const skullTime = 800;  // Time for skulls to appear and fade
        
        // Wait for clouds to start rising
        await this.battleManager.delay(200);
        
        // Create floating skulls
        this.createFloatingSkulls(targetElement, stacks);
        
        // Wait for cloud animation to complete
        await this.battleManager.delay(cloudTime - 200);
        
        // Apply curse effects ONLY if not resisted
        if (!isResisted) {
            this.applyCurseToTarget(target, stacks);
        }
        
        // Create resistance or curse completion effect
        this.createCurseCompletionEffect(targetElement, stacks, isResisted);
        
        // Wait for skull animation to complete
        await this.battleManager.delay(skullTime);
        
        // Cleanup
        this.cleanupCurseEffects();
    }

    // Create dark clouds rising from the target
    createDarkClouds(targetElement) {
        for (let i = 0; i < 5; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'curse-dark-cloud';
            cloud.innerHTML = '☁️';
            
            const offsetX = (Math.random() - 0.5) * 80; // Spread clouds around
            const delay = i * 100; // Stagger cloud appearances
            
            cloud.style.cssText = `
                position: absolute;
                bottom: -20px;
                left: calc(50% + ${offsetX}px);
                transform: translateX(-50%);
                font-size: 24px;
                z-index: 350;
                pointer-events: none;
                opacity: 0;
                filter: brightness(0.3) contrast(1.5);
                animation: curseCloudRise ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
                animation-delay: ${this.battleManager.getSpeedAdjustedDelay(delay)}ms;
            `;
            
            targetElement.appendChild(cloud);
            
            setTimeout(() => {
                if (cloud && cloud.parentNode) {
                    cloud.remove();
                }
            }, this.battleManager.getSpeedAdjustedDelay(800 + delay));
        }
    }

    // Create floating semi-transparent skulls
    createFloatingSkulls(targetElement, stackCount) {
        const maxSkulls = Math.min(stackCount + 2, 6); // Show 2 extra skulls for visual effect, cap at 6
        
        for (let i = 0; i < maxSkulls; i++) {
            setTimeout(() => {
                const skull = document.createElement('div');
                skull.className = 'curse-floating-skull';
                skull.innerHTML = '💀';
                
                // Random positioning around the target
                const angle = (i / maxSkulls) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
                const distance = 30 + Math.random() * 40;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                
                skull.style.cssText = `
                    position: absolute;
                    top: calc(50% + ${y}px);
                    left: calc(50% + ${x}px);
                    transform: translate(-50%, -50%);
                    font-size: ${20 + Math.random() * 10}px;
                    z-index: 400;
                    pointer-events: none;
                    opacity: 0.6;
                    animation: curseSkullFloat ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-in-out forwards;
                    filter: drop-shadow(0 0 8px rgba(128, 0, 128, 0.8));
                `;
                
                targetElement.appendChild(skull);
                
                setTimeout(() => {
                    if (skull && skull.parentNode) {
                        skull.remove();
                    }
                }, this.battleManager.getSpeedAdjustedDelay(800));
            }, this.battleManager.getSpeedAdjustedDelay(i * 80)); // Stagger skull creation
        }
    }

    // Create curse completion or resistance effect
    createCurseCompletionEffect(targetElement, stacks, isResisted = false) {
        const effect = document.createElement('div');
        effect.className = isResisted ? 'curse-resistance-effect' : 'curse-completion-effect';
        
        if (isResisted) {
            // Show shield effect for resisted
            effect.innerHTML = '🛡️✨';
            effect.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                z-index: 450;
                pointer-events: none;
                animation: curseResisted ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
                text-shadow: 
                    0 0 20px rgba(100, 200, 255, 1),
                    0 0 40px rgba(150, 150, 255, 0.8);
            `;
        } else {
            // Normal curse completion effect
            effect.innerHTML = '🌑💀';
            effect.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                z-index: 450;
                pointer-events: none;
                animation: curseCompletion ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
                text-shadow: 
                    0 0 20px rgba(75, 0, 130, 1),
                    0 0 40px rgba(128, 0, 128, 0.8);
            `;
        }
        
        targetElement.appendChild(effect);
        
        // Remove effect after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(600));
    }

    // Clean up any remaining curse effects
    cleanupCurseEffects() {
        // Remove any remaining curse effects
        const curseEffects = document.querySelectorAll('.curse-dark-cloud, .curse-floating-skull, .curse-completion-effect, .curse-resistance-effect');
        curseEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for curse effects
    ensureCurseCSS() {
        if (document.getElementById('curseSpellCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'curseSpellCSS';
        style.textContent = `
            @keyframes curseCloudRise {
                0% { 
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px) scale(0.5);
                }
                30% {
                    opacity: 0.8;
                    transform: translateX(-50%) translateY(-10px) scale(1);
                }
                100% { 
                    opacity: 0.3;
                    transform: translateX(-50%) translateY(-60px) scale(1.2);
                }
            }
            
            @keyframes curseSkullFloat {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(15deg); 
                }
                70% { 
                    opacity: 0.6; 
                    transform: translate(-50%, -50%) scale(1) rotate(-10deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.8) rotate(0deg); 
                }
            }
            
            @keyframes curseCompletion {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                50% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(360deg); 
                }
            }
            
            @keyframes curseResisted {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.4) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(45deg); 
                }
                70% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(90deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.6) rotate(135deg); 
                }
            }
            
            /* Enhanced visual effects */
            .curse-dark-cloud,
            .curse-floating-skull,
            .curse-completion-effect,
            .curse-resistance-effect {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, stacks, target) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        const targetName = target.hero.name;
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `🌑 ${this.displayName} afflicts ${targetName} with ${stacks} stack${stacks > 1 ? 's' : ''} of Weakened and Silenced!`,
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
            curseStacks: stacks,
            isResisted: false,
            effectType: 'curse_application',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, curseStacks, isResisted } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log only if not resisted
        if (!isResisted) {
            this.battleManager.addCombatLog(
                `🌑 ${displayName} afflicts ${targetName} with ${curseStacks} stack${curseStacks > 1 ? 's' : ''} of Weakened and Silenced!`,
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
        
        const mockTarget = {
            type: 'hero',
            side: targetLocalSide,
            position: data.targetPosition,
            hero: { name: targetName } // Mock hero object
        };
        
        // Play visual effects on guest side (no status effect application)
        this.playCurseAnimationGuestSide(mockCaster, mockTarget, curseStacks, isResisted);
    }

    // Guest-side animation (visual only, no status effect application)
    async playCurseAnimationGuestSide(caster, target, stacks, isResisted = false) {
        // Get target element
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!targetElement) {
            return;
        }
        
        // Ensure CSS exists
        this.ensureCurseCSS();
        
        // Create dark clouds rising from below
        this.createDarkClouds(targetElement);
        
        // Animation timing
        const cloudTime = 600;
        const skullTime = 800;
        
        // Wait for clouds to start rising
        await this.battleManager.delay(200);
        
        // Create floating skulls
        this.createFloatingSkulls(targetElement, stacks);
        
        // Wait for cloud animation to complete
        await this.battleManager.delay(cloudTime - 200);
        
        // Create completion effect (visual only)
        this.createCurseCompletionEffect(targetElement, stacks, isResisted);
        
        // Wait for skull animation to complete
        await this.battleManager.delay(skullTime);
        
        // Cleanup
        this.cleanupCurseEffects();
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
            description: 'Curses a random enemy hero with weakened and silenced effects based on DecayMagic level',
            effectFormula: '(1 + floor(DecayMagic level × 0.5)) stacks of Weakened and Silenced',
            targetType: 'random_enemy_hero',
            spellSchool: 'DecayMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupCurseEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('curseSpellCSS');
        if (css) css.remove();
    }
}

// Export for use in spell system
export default CurseSpell;