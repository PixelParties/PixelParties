// ./Spells/icyGrave.js - IcyGrave Spell Implementation

export class IcyGraveSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'IcyGrave';
        this.displayName = 'Icy Grave';
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute IcyGrave spell effect
    async executeSpell(caster, spell) {
        // Find random enemy hero target
        const target = this.findRandomEnemyHero(caster);
        
        if (!target) {
            return;
        }

        // Play the grand ice structure animation first
        await this.playIcyGraveAnimation(caster, target);

        // Check if target resists the spell (this automatically consumes resistance if present)
        const isResisted = this.battleManager.resistanceManager && 
            this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
        
        if (!isResisted) {
            // Calculate and apply frozen stacks
            const frozenStacks = this.calculateFrozenStacks(caster);
            this.applyFrozenToTarget(target, frozenStacks);
            this.logSpellEffect(caster, frozenStacks, target);
        }
    }

    // ============================================
    // TARGET SELECTION
    // ============================================

    // Find a random enemy hero target
    findRandomEnemyHero(caster) {
        // Determine enemy side
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        // Collect all alive enemy heroes
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
        
        // Randomly select one using battleManager's deterministic randomness
        const randomTarget = this.battleManager.getRandomChoice(aliveEnemyHeroes);
        
        return randomTarget;
    }

    // ============================================
    // FROZEN STACK CALCULATION
    // ============================================

    // Calculate frozen stacks: 2 + floor(DecayMagic level / 2) + 1 if caster is Gon
    calculateFrozenStacks(caster) {
        // Get DecayMagic level (defaults to 1 if hero doesn't have the ability or has level 0)
        const decayMagicLevel = caster.hasAbility('DecayMagic') 
            ? Math.max(1, caster.getAbilityStackCount('DecayMagic'))
            : 1;
        
        const additionalStacks = Math.floor(decayMagicLevel / 2);
        let frozenStacks = 2 + additionalStacks; // Base 2 stacks instead of 1
        
        // Special bonus for Gon
        const gonBonus = caster.name === 'Gon' ? 1 : 0;
        frozenStacks += gonBonus;
        
        return frozenStacks;
    }

    // ============================================
    // FROZEN APPLICATION
    // ============================================

    // Apply frozen stacks to the target hero
    applyFrozenToTarget(target, frozenStacks) {
        const targetHero = target.hero;
        
        // Apply frozen status effect using the status effects manager
        if (this.battleManager.statusEffectsManager) {
            const success = this.battleManager.statusEffectsManager.applyStatusEffect(
                targetHero, 
                'frozen', 
                frozenStacks
            );
            
            if (success) {
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

    // Play the grand ice structure enveloping animation
    async playIcyGraveAnimation(caster, target) {
        // Get caster and target elements
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!casterElement || !targetElement) {
            return;
        }
        
        // Phase 1: Caster casting gesture (200ms)
        this.createCasterEffect(casterElement);
        await this.battleManager.delay(200);
        
        // Phase 2: Ice structure formation around target (500ms)
        this.createIceStructureEffect(targetElement);
        await this.battleManager.delay(500);
        
        // Phase 3: Grand enveloping effect (400ms)
        this.createEnvelopingEffect(targetElement);
        await this.battleManager.delay(400);
        
        // Cleanup
        this.cleanupIcyGraveEffects();
    }

    // Create casting effect at caster location
    createCasterEffect(casterElement) {
        const effect = document.createElement('div');
        effect.className = 'icy-grave-caster-effect';
        effect.innerHTML = '⚰️❄️✋';
        
        effect.style.cssText = `
            position: absolute;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 42px;
            z-index: 380;
            pointer-events: none;
            animation: icyGraveCasting ${this.battleManager.getSpeedAdjustedDelay(200)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(100, 200, 255, 1),
                0 0 40px rgba(150, 220, 255, 0.8),
                0 0 60px rgba(200, 240, 255, 0.6);
        `;
        
        casterElement.appendChild(effect);
        
        // Remove after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(200));
    }

    // Create ice structure forming around target
    createIceStructureEffect(targetElement) {
        // Main ice structure
        const structure = document.createElement('div');
        structure.className = 'icy-grave-structure';
        structure.innerHTML = '🧊⚰️🧊';
        
        structure.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 58px;
            z-index: 400;
            pointer-events: none;
            animation: icyGraveStructure ${this.battleManager.getSpeedAdjustedDelay(500)}ms ease-out forwards;
            text-shadow: 
                0 0 25px rgba(100, 200, 255, 1),
                0 0 50px rgba(150, 220, 255, 0.9),
                0 0 75px rgba(200, 240, 255, 0.7);
        `;
        
        targetElement.appendChild(structure);
        
        // Create ice pillars around the target
        this.createIcePillars(targetElement);
        
        // Remove after animation
        setTimeout(() => {
            if (structure && structure.parentNode) {
                structure.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(500));
    }

    // Create ice pillars around the target for dramatic effect
    createIcePillars(targetElement) {
        const pillarPositions = [
            { x: -60, y: -40, delay: 0, symbol: '🧊' },
            { x: 60, y: -40, delay: 100, symbol: '❄️' },
            { x: -60, y: 40, delay: 200, symbol: '🧊' },
            { x: 60, y: 40, delay: 300, symbol: '❄️' },
            { x: 0, y: -70, delay: 150, symbol: '⚰️' },
            { x: 0, y: 70, delay: 250, symbol: '⚰️' }
        ];
        
        pillarPositions.forEach(pos => {
            setTimeout(() => {
                const pillar = document.createElement('div');
                pillar.className = 'icy-grave-pillar';
                pillar.innerHTML = pos.symbol;
                
                pillar.style.cssText = `
                    position: absolute;
                    top: calc(50% + ${pos.y}px);
                    left: calc(50% + ${pos.x}px);
                    transform: translate(-50%, -50%);
                    font-size: 32px;
                    z-index: 390;
                    pointer-events: none;
                    animation: icyGravePillar ${this.battleManager.getSpeedAdjustedDelay(300)}ms ease-out forwards;
                    text-shadow: 
                        0 0 15px rgba(100, 200, 255, 0.9),
                        0 0 30px rgba(150, 220, 255, 0.7);
                `;
                
                targetElement.appendChild(pillar);
                
                setTimeout(() => {
                    if (pillar && pillar.parentNode) {
                        pillar.remove();
                    }
                }, this.battleManager.getSpeedAdjustedDelay(300));
            }, this.battleManager.getSpeedAdjustedDelay(pos.delay));
        });
    }

    // Create the grand enveloping effect
    createEnvelopingEffect(targetElement) {
        const effect = document.createElement('div');
        effect.className = 'icy-grave-enveloping';
        effect.innerHTML = '❄️⚰️❄️🧊❄️⚰️❄️';
        
        effect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 72px;
            z-index: 450;
            pointer-events: none;
            animation: icyGraveEnveloping ${this.battleManager.getSpeedAdjustedDelay(400)}ms ease-out forwards;
            text-shadow: 
                0 0 30px rgba(100, 200, 255, 1),
                0 0 60px rgba(150, 220, 255, 0.9),
                0 0 90px rgba(200, 240, 255, 0.8);
            letter-spacing: -8px;
        `;
        
        targetElement.appendChild(effect);
        
        // Create swirling ice particles
        this.createIceParticles(targetElement);
        
        // Remove after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(400));
    }

    // Create swirling ice particles for the enveloping effect
    createIceParticles(targetElement) {
        const particleCount = 8;
        const particles = ['❄️', '🧊', '💎', '❄️'];
        
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'icy-grave-particle';
                particle.innerHTML = this.battleManager.getRandomChoice(particles);
                
                // Calculate spiral position
                const angle = (i / particleCount) * Math.PI * 2;
                const radius = 80 + Math.random() * 40;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                particle.style.cssText = `
                    position: absolute;
                    top: calc(50% + ${y}px);
                    left: calc(50% + ${x}px);
                    transform: translate(-50%, -50%);
                    font-size: ${18 + Math.random() * 16}px;
                    z-index: 420;
                    pointer-events: none;
                    animation: icyGraveParticle ${this.battleManager.getSpeedAdjustedDelay(350)}ms ease-out forwards;
                    text-shadow: 
                        0 0 12px rgba(100, 200, 255, 0.8),
                        0 0 24px rgba(150, 220, 255, 0.6);
                `;
                
                targetElement.appendChild(particle);
                
                setTimeout(() => {
                    if (particle && particle.parentNode) {
                        particle.remove();
                    }
                }, this.battleManager.getSpeedAdjustedDelay(350));
            }, this.battleManager.getSpeedAdjustedDelay(i * 40)); // Staggered particle creation
        }
    }

    // Clean up any remaining IcyGrave effects
    cleanupIcyGraveEffects() {
        const effectClasses = [
            '.icy-grave-caster-effect',
            '.icy-grave-structure', 
            '.icy-grave-pillar',
            '.icy-grave-enveloping',
            '.icy-grave-particle'
        ];
        
        effectClasses.forEach(className => {
            const effects = document.querySelectorAll(className);
            effects.forEach(effect => effect.remove());
        });
    }

    // Ensure CSS animations exist for IcyGrave effects
    ensureIcyGraveCSS() {
        if (document.getElementById('icyGraveCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'icyGraveCSS';
        style.textContent = `
            @keyframes icyGraveCasting {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                50% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(180deg); 
                }
                100% { 
                    opacity: 0.7; 
                    transform: translate(-50%, -50%) scale(1.0) rotate(360deg); 
                }
            }
            
            @keyframes icyGraveStructure {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.2) rotate(0deg); 
                }
                30% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(90deg); 
                }
                70% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(270deg); 
                }
                100% { 
                    opacity: 0.3; 
                    transform: translate(-50%, -50%) scale(1.6) rotate(360deg); 
                }
            }
            
            @keyframes icyGravePillar {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) translateY(30px); 
                }
                60% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.1) translateY(-5px); 
                }
                100% { 
                    opacity: 0.2; 
                    transform: translate(-50%, -50%) scale(1.0) translateY(0px); 
                }
            }
            
            @keyframes icyGraveEnveloping {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.4) rotate(0deg); 
                }
                25% { 
                    opacity: 0.7; 
                    transform: translate(-50%, -50%) scale(1.0) rotate(90deg); 
                }
                50% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(180deg); 
                }
                75% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(270deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.8) rotate(360deg); 
                }
            }
            
            @keyframes icyGraveParticle {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.2) rotate(0deg); 
                }
                30% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.0) rotate(120deg); 
                }
                70% { 
                    opacity: 0.7; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(240deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(360deg); 
                }
            }
            
            /* Enhanced visual effects */
            .icy-grave-caster-effect,
            .icy-grave-structure,
            .icy-grave-pillar,
            .icy-grave-enveloping,
            .icy-grave-particle {
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
        
        const targetName = target.hero.name;
        
        // Main spell effect log
        let logMessage = `⚰️ ${this.displayName} entombs ${targetName} in ice with ${frozenStacks} frozen stack${frozenStacks > 1 ? 's' : ''}!`;
        
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
            targetType: 'hero', // IcyGrave always targets heroes
            frozenStacks: frozenStacks,
            isResisted: false,
            effectType: 'frozen_application',
            hasGonBonus: caster.name === 'Gon',
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
        
        // Add to battle log only if not resisted (resistance manager handles resistance logging)
        if (!isResisted) {
            let logMessage = `⚰️ ${displayName} entombs ${targetName} in ice with ${frozenStacks} frozen stack${frozenStacks > 1 ? 's' : ''}!`;
            
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
        
        const mockTarget = {
            type: 'hero',
            side: targetLocalSide,
            position: data.targetPosition,
            hero: { name: targetName } // Mock hero object
        };
        
        // Play visual effects on guest side (no frozen application)
        this.playIcyGraveAnimationGuestSide(mockCaster, mockTarget, frozenStacks, isResisted);
    }

    // Guest-side animation (visual only, no frozen application or resistance consumption)
    async playIcyGraveAnimationGuestSide(caster, target, frozenStacks, isResisted = false) {
        // Ensure CSS exists
        this.ensureIcyGraveCSS();
        
        // Get caster and target elements
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!casterElement || !targetElement) {
            return;
        }
        
        // Play the same animation sequence as host side
        // Phase 1: Caster casting gesture (200ms)
        this.createCasterEffect(casterElement);
        await this.battleManager.delay(200);
        
        // Phase 2: Ice structure formation around target (500ms)
        this.createIceStructureEffect(targetElement);
        await this.battleManager.delay(500);
        
        // Phase 3: Grand enveloping effect (400ms)
        // Show different effect based on whether spell was resisted
        if (isResisted) {
            this.createResistanceDeflectionEffect(targetElement);
        } else {
            this.createEnvelopingEffect(targetElement);
        }
        await this.battleManager.delay(400);
        
        // Cleanup
        this.cleanupIcyGraveEffects();
    }

    // Create special effect when resistance deflects the spell
    createResistanceDeflectionEffect(targetElement) {
        const effect = document.createElement('div');
        effect.className = 'icy-grave-resistance-deflection';
        effect.innerHTML = '🛡️❄️✨🛡️';
        
        effect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 58px;
            z-index: 450;
            pointer-events: none;
            animation: icyGraveResistanceDeflection ${this.battleManager.getSpeedAdjustedDelay(400)}ms ease-out forwards;
            text-shadow: 
                0 0 25px rgba(255, 215, 0, 1),
                0 0 50px rgba(255, 215, 0, 0.8),
                0 0 75px rgba(100, 200, 255, 0.6);
        `;
        
        targetElement.appendChild(effect);
        
        // Remove after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(400));
        
        // Add resistance deflection animation to CSS if not already present
        this.ensureResistanceDeflectionCSS();
    }

    // Ensure resistance deflection CSS exists
    ensureResistanceDeflectionCSS() {
        const existingStyle = document.getElementById('icyGraveCSS');
        if (!existingStyle) {
            this.ensureIcyGraveCSS();
            return;
        }
        
        // Check if resistance deflection animation already exists
        if (existingStyle.textContent.includes('icyGraveResistanceDeflection')) {
            return;
        }
        
        // Add the resistance deflection animation
        existingStyle.textContent += `
            @keyframes icyGraveResistanceDeflection {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.4) rotate(0deg); 
                }
                25% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(90deg); 
                }
                50% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(180deg); 
                }
                75% { 
                    opacity: 0.7; 
                    transform: translate(-50%, -50%) scale(1.6) rotate(270deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.8) rotate(360deg); 
                }
            }
            
            .icy-grave-resistance-deflection {
                will-change: transform, opacity;
            }
        `;
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
            description: 'Creates a grand ice structure that entombs a random enemy hero, applying frozen stacks. Consumes resistance if present.',
            effectFormula: '2 frozen stacks + floor(DecayMagic level / 2) additional stacks + 1 if caster is Gon',
            targetType: 'random_enemy_hero',
            spellSchool: 'DecayMagic',
            resistanceInteraction: 'Consumes 1 resistance stack if present, negating the effect'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupIcyGraveEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('icyGraveCSS');
        if (css) css.remove();
    }
}

// Export for use in spell system
export default IcyGraveSpell;