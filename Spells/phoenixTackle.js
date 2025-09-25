// ./Spells/phoenixTackle.js - Phoenix Tackle Spell Implementation

export class PhoenixTackleSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'PhoenixTackle';
        this.displayName = 'Phoenix Tackle';
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Phoenix Tackle spell effect
    async executeSpell(caster, spell) {
        // Find target hero (nearest enemy hero, ignoring creatures)
        const target = this.findTargetHero(caster);
        
        if (!target) {
            return;
        }

        // Log the spell casting
        this.logSpellCasting(caster, target);
        
        // STEP 1: Play flame aura animation around caster
        await this.playFlameAuraAnimation(caster);
        
        // STEP 2: Check resistance BEFORE tackle (only affects tackle damage)
        const isResisted = this.battleManager.resistanceManager && 
            this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
        
        // STEP 3: Execute ramming tackle animation and damage
        await this.executeRammingTackle(caster, target, isResisted);
        
        // STEP 4: Apply recoil damage to caster (not affected by resistance)
        await this.applyRecoilDamage(caster);
    }

    // ============================================
    // SPELL PREREQUISITES
    // ============================================

    // Check if spell can be cast (used by spell system before rolling)
    canCast(caster) {
        return this.canCastSpell(caster);
    }

    // Check if spell can be cast (requires at least 1 living CutePhoenix)
    canCastSpell(caster) {
        const alliedHeroes = caster.side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Check all allied heroes for living CutePhoenix creatures
        for (const position of ['left', 'center', 'right']) {
            const hero = alliedHeroes[position];
            if (hero && hero.alive && hero.creatures) {
                const livingCutePhoenixes = hero.creatures.filter(creature => 
                    creature.alive && creature.name === 'CutePhoenix'
                );
                if (livingCutePhoenixes.length > 0) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find target hero (ignores creatures, like ranged attacks)
    findTargetHero(caster) {
        // Use existing targeting logic that ignores creatures
        const target = this.battleManager.combatManager.authoritative_findTargetIgnoringCreatures(
            caster.position, 
            caster.side
        );
        
        return target;
    }

    // ============================================
    // VISUAL EFFECTS AND ANIMATIONS
    // ============================================

    // Play flame aura animation around the caster
    async playFlameAuraAnimation(caster) {      
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        if (!casterElement) {
            console.error('Could not find caster element for flame aura');
            return;
        }
        
        // Create flame aura effect
        this.createFlameAura(casterElement);
        
        // Wait for flame aura buildup
        await this.battleManager.delay(500);
        
        // Clean up flame aura
        this.cleanupFlameAura(casterElement);
    }

    // Create flame aura effect around caster
    createFlameAura(casterElement) {
        const aura = document.createElement('div');
        aura.className = 'phoenix-tackle-aura';
        aura.innerHTML = '🔥🔥🔥';
        
        aura.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 80px;
            z-index: 400;
            pointer-events: none;
            animation: phoenixAuraPulse ${this.battleManager.getSpeedAdjustedDelay(500)}ms ease-in-out;
            text-shadow: 
                0 0 30px rgba(255, 140, 0, 1),
                0 0 60px rgba(255, 69, 0, 0.8),
                0 0 90px rgba(255, 215, 0, 0.6);
            filter: drop-shadow(0 0 12px rgba(255, 140, 0, 1));
        `;
        
        casterElement.appendChild(aura);
        
        // Ensure CSS exists
        this.ensurePhoenixTackleCSS();
    }

    // Clean up flame aura
    cleanupFlameAura(casterElement) {
        const aura = casterElement.querySelector('.phoenix-tackle-aura');
        if (aura) {
            aura.remove();
        }
    }

    // Execute ramming tackle with animation and damage
    async executeRammingTackle(caster, target, isResisted) {        
        // STEP 1: Animate ram attack (like ranged attack but with caster movement)
        await this.animateRamAttack(caster, target);
        
        // STEP 2: Apply tackle damage
        if (isResisted) {
            this.battleManager.addCombatLog(`🛡️ ${target.hero.name} resisted the phoenix tackle!`, 'info');
        } else {
            const tackleDamage = 300; // Fixed damage amount
            
            // Apply damage to target hero
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: tackleDamage,
                newHp: Math.max(0, target.hero.currentHp - tackleDamage),
                died: (target.hero.currentHp - tackleDamage) <= 0
            }, { source: 'spell', attacker: caster, spellName: this.spellName });
        }
        
        // STEP 3: Return caster to original position
        await this.animateReturn(caster);
    }

    // Animate ram attack (caster charges at target)
    async animateRamAttack(caster, target) {
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!casterElement || !targetElement) {
            console.error('Could not find elements for ram attack animation');
            return;
        }
        
        const casterCard = casterElement.querySelector('.battle-hero-card');
        if (!casterCard) return;
        
        // Calculate positions for full charge
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const deltaX = targetRect.left - casterRect.left;
        const deltaY = targetRect.top - casterRect.top;
        
        // Add flame trail during charge
        casterCard.style.filter = 'brightness(1.4) drop-shadow(0 0 20px rgba(255, 140, 0, 0.9))';
        
        // Charge animation - faster and more aggressive than normal attack
        casterCard.classList.add('attacking');
        casterCard.style.transition = `transform ${this.battleManager.getSpeedAdjustedDelay(200)}ms ease-out`;
        casterCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.3)`;
        
        await this.battleManager.delay(200);
        
        // Create impact effect
        this.createTackleImpact(targetElement);
        
        // Remove flame trail
        casterCard.style.filter = '';
    }

    // Animate return to original position
    async animateReturn(caster) {
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        if (!casterElement) return;

        const casterCard = casterElement.querySelector('.battle-hero-card');
        if (!casterCard) return;

        casterCard.style.transition = `transform ${this.battleManager.getSpeedAdjustedDelay(150)}ms ease-in-out`;
        casterCard.style.transform = 'translate(0, 0) scale(1)';
        casterCard.classList.remove('attacking');
        
        await this.battleManager.delay(150);
    }

    // Create tackle impact effect
    createTackleImpact(targetElement) {
        const impact = document.createElement('div');
        impact.className = 'phoenix-tackle-impact';
        impact.innerHTML = '🔥💥🔥';
        
        impact.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 60px;
            z-index: 450;
            pointer-events: none;
            animation: phoenixTackleImpact ${this.battleManager.getSpeedAdjustedDelay(300)}ms ease-out forwards;
            text-shadow: 
                0 0 25px rgba(255, 140, 0, 1),
                0 0 50px rgba(255, 69, 0, 0.8);
        `;
        
        targetElement.appendChild(impact);
        
        // Remove impact after animation
        setTimeout(() => {
            if (impact && impact.parentNode) {
                impact.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(300));
    }

    // Apply recoil damage to caster
    async applyRecoilDamage(caster) {
        const recoilDamage = 100;
                
        // Add recoil combat log
        this.battleManager.addCombatLog(
            `💥 ${caster.name} takes ${recoilDamage} recoil damage from the phoenix tackle!`,
            caster.side === 'player' ? 'warning' : 'info'
        );
        
        // Apply recoil damage with special source
        this.battleManager.authoritative_applyDamage({
            target: caster,
            damage: recoilDamage,
            newHp: Math.max(0, caster.currentHp - recoilDamage),
            died: (caster.currentHp - recoilDamage) <= 0
        }, { source: 'recoil', attacker: null, spellName: this.spellName });
        
        // Small delay for visual clarity
        await this.battleManager.delay(200);
    }

    // Ensure CSS animations exist for phoenix tackle effects
    ensurePhoenixTackleCSS() {
        if (document.getElementById('phoenixTackleCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'phoenixTackleCSS';
        style.textContent = `
            @keyframes phoenixAuraPulse {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
                }
                100% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.4) rotate(360deg);
                }
            }
            
            @keyframes phoenixTackleImpact {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.6) rotate(0deg); 
                }
                40% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(120deg); 
                }
                80% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.6) rotate(240deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(2.0) rotate(360deg); 
                }
            }
            
            /* Enhanced visual effects */
            .phoenix-tackle-aura {
                will-change: transform, opacity;
            }
            
            .phoenix-tackle-impact {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Clean up any remaining phoenix tackle effects
    cleanupPhoenixTackleEffects() {
        // Remove any remaining auras and impacts
        const effects = document.querySelectorAll('.phoenix-tackle-aura, .phoenix-tackle-impact');
        effects.forEach(effect => effect.remove());
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell casting details
    logSpellCasting(caster, target) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Main spell casting log
        this.battleManager.addCombatLog(
            `🔥🏃 ${caster.name} casts ${this.displayName} and charges at ${target.hero.name}!`,
            logType
        );
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetName: target.hero.name,
            targetAbsoluteSide: target.hero.absoluteSide,
            targetPosition: target.position,
            damage: 300, // Fixed damage
            recoilDamage: 100, // Fixed recoil
            effectType: 'phoenix_tackle',
            isResisted: false, // Resistance check happens later
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, damage, recoilDamage, isResisted } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add spell casting log
        this.battleManager.addCombatLog(
            `🔥🏃 ${casterName} casts ${displayName} and charges at ${targetName}!`,
            logType
        );
        
        // Create mock objects for guest-side animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        const targetLocalSide = (data.targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetHeroes = targetLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const mockTarget = {
            hero: targetHeroes[data.targetPosition],
            position: data.targetPosition,
            side: targetLocalSide
        };
        
        // Play visual effects on guest side
        if (mockTarget.hero) {
            this.playPhoenixTackleAnimationGuestSide(mockCaster, mockTarget);
        }
    }

    // Guest-side animation (visual only)
    async playPhoenixTackleAnimationGuestSide(caster, target) {
        // STEP 1: Play flame aura
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        if (casterElement) {
            this.createFlameAura(casterElement);
            await this.battleManager.delay(500);
            this.cleanupFlameAura(casterElement);
        }
        
        // STEP 2: Ram attack animation
        if (casterElement) {
            const targetElement = this.battleManager.getHeroElement(target.side, target.position);
            if (targetElement) {
                await this.animateRamAttack(caster, target);
                await this.animateReturn(caster);
            }
        }
        
        // Cleanup any remaining effects
        this.cleanupPhoenixTackleEffects();
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
            description: 'Charges into the nearest enemy hero with fiery power, dealing 300 damage but taking 100 recoil damage',
            damageFormula: '300 damage (fixed) + 100 recoil damage to caster',
            targetType: 'enemy_hero_ignoring_creatures',
            spellSchool: 'DestructionMagic',
            requirements: 'At least 1 living CutePhoenix creature'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupPhoenixTackleEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('phoenixTackleCSS');
        if (css) css.remove();
    }
}

// Export for use in spell system
export default PhoenixTackleSpell;