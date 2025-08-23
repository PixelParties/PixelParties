// ./Spells/stoneskin.js - Stoneskin Spell Implementation with Damage Reduction Effects

export class StoneskinSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Stoneskin';
        this.displayName = 'Stoneskin';
        
        console.log('🗿 Stoneskin spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Check if spell can be cast (needs valid target)
    canCast(caster) {
        const validTargets = this.findValidTargets(caster);
        return validTargets.length > 0;
    }

    // Find valid targets (living ally heroes without stoneskin)
    findValidTargets(caster) {
        const casterSide = caster.side;
        const allyHeroes = casterSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const validTargets = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = allyHeroes[position];
            if (hero && hero.alive && !this.hasStoneskin(hero)) {
                validTargets.push(hero);
            }
        });
        
        return validTargets;
    }

    // Check if hero has stoneskin
    hasStoneskin(hero) {
        return this.battleManager.statusEffectsManager.hasStatusEffect(hero, 'stoneskin');
    }

    // Execute Stoneskin spell effect
    async executeSpell(caster, spell) {
        console.log(`🗿 ${caster.name} casting ${this.displayName}!`);
        
        // Find valid targets
        const validTargets = this.findValidTargets(caster);
        
        if (validTargets.length === 0) {
            console.warn('No valid targets for Stoneskin spell');
            return;
        }
        
        // Select random target
        const target = this.battleManager.getRandomChoice(validTargets);
        
        // Apply stoneskin buff to target
        this.applyStoneskinBuff(target);
        
        // Log the spell effect
        this.logSpellEffect(caster, target);
        
        // Play stoneskin visual effect
        await this.playStoneskinAnimation(target);
        
        console.log(`🗿 ${this.displayName} completed on ${target.name}!`);
    }

    // ============================================
    // STONESKIN BUFF MANAGEMENT
    // ============================================

    // Apply stoneskin buff to the target
    applyStoneskinBuff(target) {
        // Apply the status effect using the status effects manager
        this.battleManager.statusEffectsManager.applyStatusEffect(target, 'stoneskin', 1);
        
        console.log(`🗿 ${target.name} now has Stoneskin protection`);
        
        // Send stoneskin update to guest for synchronization
        this.battleManager.sendBattleUpdate('stoneskin_applied', {
            heroAbsoluteSide: target.absoluteSide,
            heroPosition: target.position,
            heroName: target.name,
            castTurn: this.battleManager.currentTurn,
            timestamp: Date.now()
        });
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the stoneskin casting animation
    async playStoneskinAnimation(target) {
        console.log(`🗿 Playing Stoneskin animation for ${target.name}...`);
        
        // Get target element
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!targetElement) {
            console.error('Could not find target element for stoneskin animation');
            return;
        }
        
        // Create stone texture effect
        await this.createStoneTextureEffect(targetElement);
        
        // Ensure CSS exists
        this.ensureStoneskinCSS();
    }

    // Create stone texture effect
    async createStoneTextureEffect(targetElement) {
        const stoneEffect = document.createElement('div');
        stoneEffect.className = 'stoneskin-texture-effect';
        stoneEffect.innerHTML = '🗿⛰️🗿';
        
        stoneEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 300;
            pointer-events: none;
            animation: stoneskinTextureEffect ${this.battleManager.getSpeedAdjustedDelay(1500)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(139, 69, 19, 0.8),
                0 0 40px rgba(160, 82, 45, 0.6),
                0 0 60px rgba(205, 133, 63, 0.4);
        `;
        
        targetElement.appendChild(stoneEffect);
        
        await this.battleManager.delay(1500);
        
        if (stoneEffect && stoneEffect.parentNode) {
            stoneEffect.remove();
        }
    }

    /**
     * Create visual effect for stoneskin damage reduction
     */
    createStoneskinReductionEffect(targetElement, reduction) {
        const reductionEffect = document.createElement('div');
        reductionEffect.className = 'stoneskin-reduction-effect';
        reductionEffect.innerHTML = `🗿-${reduction}`;
        
        reductionEffect.style.cssText = `
            position: absolute;
            top: 30%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 24px;
            font-weight: bold;
            color: #8B4513;
            z-index: 350;
            pointer-events: none;
            animation: stoneskinReductionFloat ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
            text-shadow: 
                0 0 10px rgba(139, 69, 19, 0.8),
                0 0 20px rgba(160, 82, 45, 0.6);
        `;
        
        targetElement.appendChild(reductionEffect);
        
        setTimeout(() => {
            if (reductionEffect && reductionEffect.parentNode) {
                reductionEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(800));
    }

    // Ensure CSS animations exist for stoneskin effects
    ensureStoneskinCSS() {
        if (document.getElementById('stoneskinCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'stoneskinCSS';
        style.textContent = `
            @keyframes stoneskinTextureEffect {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(90deg); 
                }
                70% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.8) rotate(270deg); 
                }
            }
            
            @keyframes stoneskinReductionFloat {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.8) translateY(0px);
                }
                50% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1.2) translateY(-10px);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) scale(1) translateY(-20px);
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, target) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `🗿 ${caster.name} casts ${this.displayName} on ${target.name}!`,
            logType
        );
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetName: target.name,
            targetAbsoluteSide: target.absoluteSide,
            targetPosition: target.position,
            effectType: 'stoneskin_buff',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle stoneskin applied on guest side
    handleGuestStoneskinApplied(data) {
        const { heroAbsoluteSide, heroPosition, heroName } = data;
        
        // Determine log type based on target side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = targetLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🗿 ${heroName} gains Stoneskin protection!`,
            logType
        );
        
        // Get the hero and apply the buff
        const targetHeroes = targetLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const hero = targetHeroes[heroPosition];
        if (hero) {
            // Apply the stoneskin buff
            this.battleManager.statusEffectsManager.applyStatusEffect(hero, 'stoneskin', 1);
        }
        
        console.log(`🗿 GUEST: ${heroName} received stoneskin buff`);
    }

    /**
     * Handle stoneskin damage reduction on guest side
     * @param {Object} data - Reduction data from host
     */
    handleGuestStoneskinDamageReduction(data) {
        const { targetAbsoluteSide, targetPosition, targetName, originalDamage, reducedDamage, reduction } = data;
        
        // Determine log type based on target side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Create visual effect for damage reduction
        const targetHeroes = targetLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const target = targetHeroes[targetPosition];
        if (target) {
            const targetElement = this.battleManager.getHeroElement(targetLocalSide, targetPosition);
            if (targetElement) {
                this.createStoneskinReductionEffect(targetElement, reduction);
            }
        }
        
        console.log(`🗿 GUEST: ${targetName} stoneskin reduced damage ${originalDamage} → ${reducedDamage}`);
    }

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, effectType } = data;
        
        if (effectType === 'stoneskin_buff') {
            // Determine log type based on caster side
            const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
            const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const logType = casterLocalSide === 'player' ? 'success' : 'error';
            
            // Add to battle log
            this.battleManager.addCombatLog(
                `🗿 ${casterName} casts ${displayName} on ${targetName}!`,
                logType
            );
            
            // Apply visual effect
            const targetLocalSide = (data.targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const targetHeroes = targetLocalSide === 'player' 
                ? this.battleManager.playerHeroes 
                : this.battleManager.opponentHeroes;
            
            const target = targetHeroes[data.targetPosition];
            if (target) {
                // Apply the buff
                this.battleManager.statusEffectsManager.applyStatusEffect(target, 'stoneskin', 1);
                
                // Create animation
                const targetElement = this.battleManager.getHeroElement(targetLocalSide, data.targetPosition);
                if (targetElement) {
                    this.createStoneTextureEffect(targetElement);
                }
            }
        }
        
        console.log(`🗿 GUEST: ${casterName} used ${displayName} on ${targetName}`);
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
            description: 'Grants stone-like protection to a random ally hero without stoneskin. Reduces physical damage by 50 (minimum 10).',
            targetType: 'ally_buff',
            spellSchool: 'EarthMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        // Remove CSS if needed
        const css = document.getElementById('stoneskinCSS');
        if (css) css.remove();
        
        console.log('🗿 Stoneskin spell cleaned up');
    }
}

// Export for use in spell system
export default StoneskinSpell;