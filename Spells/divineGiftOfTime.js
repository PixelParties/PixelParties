// ./Spells/divineGiftOfTime.js - Divine Gift of Time Spell Implementation

export class DivineGiftOfTimeSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'DivineGiftOfTime';
        this.displayName = 'Divine Gift of Time';
        
        console.log('⏰ Divine Gift of Time spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Check if spell can be cast (needs valid targets)
    canCast(caster) {
        const validTargets = this.findValidTargets(caster);
        return validTargets.length > 0;
    }

    // Find valid targets (living ally heroes and creatures without timeGifted)
    findValidTargets(caster) {
        const casterSide = caster.side;
        const allyHeroes = casterSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const validTargets = [];
        
        // Check all ally heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = allyHeroes[position];
            if (hero && hero.alive && !this.hasTimeGifted(hero)) {
                validTargets.push({
                    type: 'hero',
                    target: hero,
                    position: position,
                    side: casterSide
                });
            }
            
            // Check all creatures of each hero
            if (hero && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive && !this.hasTimeGifted(creature)) {
                        validTargets.push({
                            type: 'creature',
                            target: creature,
                            hero: hero,
                            creatureIndex: index,
                            position: position,
                            side: casterSide
                        });
                    }
                });
            }
        });
        
        return validTargets;
    }

    // Check if target has timeGifted
    hasTimeGifted(target) {
        return this.battleManager.statusEffectsManager.hasStatusEffect(target, 'timeGifted');
    }

    // Execute Divine Gift of Time spell effect
    async executeSpell(caster, spell) {
        console.log(`⏰ ${caster.name} casting ${this.displayName}!`);
        
        // Find all valid targets
        const validTargets = this.findValidTargets(caster);
        
        if (validTargets.length === 0) {
            console.warn('No valid targets for Divine Gift of Time spell');
            return;
        }
        
        // Apply timeGifted buff to ALL valid targets
        validTargets.forEach(targetData => {
            this.applyTimeGiftedBuff(targetData.target, targetData);
        });
        
        // Log the spell effect
        this.logSpellEffect(caster, validTargets.length);
        
        // Play divine gift of time visual effect on all targets
        await this.playDivineGiftOfTimeAnimation(validTargets);
        
        console.log(`⏰ ${this.displayName} completed on ${validTargets.length} targets!`);
    }

    // ============================================
    // TIME GIFTED BUFF MANAGEMENT
    // ============================================

    // Apply timeGifted buff to the target
    applyTimeGiftedBuff(target, targetData) {
        // Apply the status effect using the status effects manager
        this.battleManager.statusEffectsManager.applyStatusEffect(target, 'timeGifted', 1);
        
        console.log(`⏰ ${target.name} now has Time Gifted blessing`);
        
        // Send timeGifted update to guest for synchronization
        this.battleManager.sendBattleUpdate('time_gifted_applied', {
            targetType: targetData.type,
            targetAbsoluteSide: targetData.target.absoluteSide || targetData.hero?.absoluteSide,
            targetPosition: targetData.position,
            targetName: target.name,
            creatureIndex: targetData.creatureIndex,
            castTurn: this.battleManager.currentTurn,
            timestamp: Date.now()
        });
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the divine gift of time casting animation on all targets
    async playDivineGiftOfTimeAnimation(validTargets) {
        console.log(`⏰ Playing Divine Gift of Time animation for ${validTargets.length} targets...`);
        
        // Ensure CSS exists
        this.ensureDivineGiftOfTimeCSS();
        
        // Create time particle effects across the battlefield
        this.createTimeParticleField();
        
        // Create pocketwatch effects for each target simultaneously
        const animationPromises = validTargets.map(targetData => {
            return this.createPocketwatchEffect(targetData);
        });
        
        // Wait for all animations to complete
        await Promise.all(animationPromises);
        
        // Clean up particle field
        setTimeout(() => {
            this.cleanupTimeParticleField();
        }, this.battleManager.getSpeedAdjustedDelay(2000));
    }

    // Create time particle field effect across the battlefield
    createTimeParticleField() {
        const battlefield = document.querySelector('.battle-container') || document.body;
        
        const particleField = document.createElement('div');
        particleField.className = 'time-particle-field';
        particleField.id = 'timeParticleField';
        
        // Create multiple floating time particles
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'time-particle';
            particle.innerHTML = '✨';
            
            // Random positioning and animation delay
            const randomX = Math.random() * 100;
            const randomY = Math.random() * 100;
            const randomDelay = Math.random() * 2;
            
            particle.style.cssText = `
                position: absolute;
                left: ${randomX}%;
                top: ${randomY}%;
                font-size: 16px;
                color: #4a90e2;
                animation: timeParticleFloat ${this.battleManager.getSpeedAdjustedDelay(3000)}ms ease-in-out infinite;
                animation-delay: ${randomDelay}s;
                z-index: 200;
                pointer-events: none;
                text-shadow: 0 0 10px rgba(74, 144, 226, 0.8);
            `;
            
            particleField.appendChild(particle);
        }
        
        particleField.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 200;
            pointer-events: none;
        `;
        
        battlefield.appendChild(particleField);
    }

    // Create pocketwatch effect for a specific target
    async createPocketwatchEffect(targetData) {
        const targetElement = this.getTargetElement(targetData);
        
        if (!targetElement) {
            console.error('Could not find target element for time gifted animation');
            return;
        }
        
        const pocketwatchEffect = document.createElement('div');
        pocketwatchEffect.className = 'pocketwatch-effect';
        pocketwatchEffect.innerHTML = '⏰';
        
        pocketwatchEffect.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 48px;
            z-index: 350;
            pointer-events: none;
            animation: pocketwatchSpin ${this.battleManager.getSpeedAdjustedDelay(1500)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(74, 144, 226, 0.9),
                0 0 40px rgba(100, 149, 237, 0.6),
                0 0 60px rgba(135, 206, 250, 0.4);
            filter: drop-shadow(0 0 8px rgba(74, 144, 226, 0.8));
        `;
        
        targetElement.appendChild(pocketwatchEffect);
        
        await this.battleManager.delay(1500);
        
        if (pocketwatchEffect && pocketwatchEffect.parentNode) {
            pocketwatchEffect.remove();
        }
    }

    // Get target element (hero or creature)
    getTargetElement(targetData) {
        if (targetData.type === 'hero') {
            return this.battleManager.getHeroElement(targetData.side, targetData.position);
        } else {
            // Creature element
            return document.querySelector(
                `.${targetData.side}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }
    }

    // Clean up time particle field
    cleanupTimeParticleField() {
        const particleField = document.getElementById('timeParticleField');
        if (particleField) {
            particleField.style.animation = `fadeOut ${this.battleManager.getSpeedAdjustedDelay(500)}ms ease-out forwards`;
            setTimeout(() => {
                if (particleField && particleField.parentNode) {
                    particleField.remove();
                }
            }, this.battleManager.getSpeedAdjustedDelay(500));
        }
    }

    // Ensure CSS animations exist for divine gift of time effects
    ensureDivineGiftOfTimeCSS() {
        if (document.getElementById('divineGiftOfTimeCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'divineGiftOfTimeCSS';
        style.textContent = `
            @keyframes pocketwatchSpin {
                0% { 
                    opacity: 0; 
                    transform: translateX(-50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translateX(-50%) scale(1.2) rotate(180deg); 
                }
                70% { 
                    opacity: 0.9; 
                    transform: translateX(-50%) scale(1.1) rotate(360deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translateX(-50%) scale(0.8) rotate(540deg); 
                }
            }
            
            @keyframes timeParticleFloat {
                0%, 100% {
                    transform: translateY(0px) rotate(0deg);
                    opacity: 0.6;
                }
                25% {
                    transform: translateY(-20px) rotate(90deg);
                    opacity: 1;
                }
                50% {
                    transform: translateY(-10px) rotate(180deg);
                    opacity: 0.8;
                }
                75% {
                    transform: translateY(-25px) rotate(270deg);
                    opacity: 1;
                }
            }
            
            @keyframes fadeOut {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
            
            .time-particle-field {
                will-change: opacity;
            }
            
            .pocketwatch-effect {
                will-change: transform, opacity;
            }
            
            .time-particle {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, targetCount) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `⏰ ${caster.name} casts ${this.displayName} on ${targetCount} targets!`,
            logType
        );
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            effectType: 'time_gifted_mass_buff',
            targetCount: targetCount,
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle time gifted applied on guest side
    handleGuestTimeGiftedApplied(data) {
        const { targetType, targetAbsoluteSide, targetPosition, targetName, creatureIndex } = data;
        
        // Determine log type based on target side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = targetLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `⏰ ${targetName} receives the gift of time!`,
            logType
        );
        
        // Get the target and apply the buff
        let target = null;
        
        if (targetType === 'hero') {
            const targetHeroes = targetLocalSide === 'player' 
                ? this.battleManager.playerHeroes 
                : this.battleManager.opponentHeroes;
            target = targetHeroes[targetPosition];
        } else if (targetType === 'creature') {
            const targetHeroes = targetLocalSide === 'player' 
                ? this.battleManager.playerHeroes 
                : this.battleManager.opponentHeroes;
            const hero = targetHeroes[targetPosition];
            if (hero && hero.creatures && hero.creatures[creatureIndex]) {
                target = hero.creatures[creatureIndex];
            }
        }
        
        if (target) {
            // Apply the timeGifted buff
            this.battleManager.statusEffectsManager.applyStatusEffect(target, 'timeGifted', 1);
        }
        
        console.log(`⏰ GUEST: ${targetName} received time gifted buff`);
    }

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, effectType, targetCount } = data;
        
        if (effectType === 'time_gifted_mass_buff') {
            // Determine log type based on caster side
            const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
            const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const logType = casterLocalSide === 'player' ? 'success' : 'error';
            
            // Add to battle log
            this.battleManager.addCombatLog(
                `⏰ ${casterName} casts ${displayName} on ${targetCount} targets!`,
                logType
            );
            
            // Apply visual effect to battlefield
            this.createTimeParticleField();
            setTimeout(() => {
                this.cleanupTimeParticleField();
            }, this.battleManager.getSpeedAdjustedDelay(2000));
        }
        
        console.log(`⏰ GUEST: ${casterName} used ${displayName} on ${targetCount} targets`);
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
            description: 'Grants the divine gift of time to all ally heroes and creatures. Blesses them with temporal manipulation abilities.',
            targetType: 'ally_mass_buff',
            spellSchool: 'TimeMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        // Remove CSS if needed
        const css = document.getElementById('divineGiftOfTimeCSS');
        if (css) css.remove();
        
        // Clean up any remaining effects
        this.cleanupTimeParticleField();
        
        console.log('⏰ Divine Gift of Time spell cleaned up');
    }
}

// Export for use in spell system
export default DivineGiftOfTimeSpell;