// forcefulRevival.js - ForcefulRevival Fighting Spell Implementation

export class ForcefulRevivalSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'ForcefulRevival';
        this.displayName = 'Forceful Revival';
    }

    /**
     * Calculate trigger chance for ForcefulRevival
     * 20% chance per stack when attacker defeats an enemy hero
     */
    getTriggerChance(attacker, target, damage) {
        // Only trigger if target was a hero that died
        if (!target || target.type === 'creature' || target.alive) {
            return 0;
        }
        
        // Never trigger if target is already at 1 max HP (can't reduce further)
        if (target.maxHp <= 1) {
            return 0;
        }
        
        // Check if already triggered this turn (prevent multiple activations)
        if (attacker._forcefulRevivalTriggeredThisTurn) {
            return 0;
        }
        
        // 20% chance per stack to trigger
        return 0.2;
    }

    /**
     * Execute ForcefulRevival effect after defeating an enemy hero
     * - Permanently reduces defeated hero's max HP by 50
     * - Permanently increases attacker's attack by 20
     * - Revives defeated hero with 100 HP (or their max HP if less)
     */
    async executeEffect(attacker, target, attackDamage) {
        // Mark that ForcefulRevival has triggered this turn
        attacker._forcefulRevivalTriggeredThisTurn = true;
        
        // Log the activation
        this.battleManager.addCombatLog(
            `✨ ${attacker.name}'s ForcefulRevival activates on ${target.name}!`,
            attacker.side === 'player' ? 'success' : 'error'
        );
        
        // Apply TRULY PERMANENT stat changes (this modifies target.maxHp)
        this.applyTrulyPermanentStatChanges(attacker, target);
        
        // Calculate revival HP AFTER max HP reduction
        const revivalHp = Math.min(100, target.maxHp);
        
        // Play the revival animation and revive the target
        await this.playForcefulRevivalAnimation(attacker, target, revivalHp);
        
        // Clear the flag after animation completes
        setTimeout(() => {
            delete attacker._forcefulRevivalTriggeredThisTurn;
        }, 150);
    }

    /**
     * Apply TRULY PERMANENT stat changes to both heroes
     * These bonuses will persist across battles and game saves
     */
    applyTrulyPermanentStatChanges(attacker, target) {
        // Increase attacker's TRULY PERMANENT attack by 20
        attacker.permanentAttackBonusses = (attacker.permanentAttackBonusses || 0) + 20;
        
        // Update attacker's attack stat immediately
        attacker.atk += 20;
        
        // Update attacker's attack display
        this.battleManager.updateHeroAttackDisplay(attacker.side, attacker.position, attacker);
        
        // Log attacker buff
        this.battleManager.addCombatLog(
            `⚔️ ${attacker.name} permanently gains +20 Attack! (Total permanent: +${attacker.permanentAttackBonusses})`,
            attacker.side === 'player' ? 'success' : 'info'
        );
        
        // Calculate the actual HP reduction that can be applied
        const baseMaxHp = target.baseMaxHp || target.maxHp;
        const currentPermanentBonus = target.permanentHpBonusses || 0;
        const effectiveBaseHp = baseMaxHp + currentPermanentBonus;
        
        // Calculate how much we can actually reduce without going below 1
        const maxReduction = effectiveBaseHp - 1;
        const actualReduction = Math.min(50, maxReduction);
        
        // Decrease target's TRULY PERMANENT max HP by the allowed amount
        target.permanentHpBonusses = (target.permanentHpBonusses || 0) - actualReduction;
        
        // Reduce target's max HP immediately
        const oldMaxHp = target.maxHp;
        target.maxHp = Math.max(1, target.maxHp - actualReduction);
        
        // Adjust current HP if it exceeds new max
        if (target.currentHp > target.maxHp) {
            target.currentHp = target.maxHp;
        }
        
        // Update target's health display
        this.battleManager.updateHeroHealthBar(target.side, target.position, target.currentHp, target.maxHp);
        
        // Log target debuff with actual reduction amount
        this.battleManager.addCombatLog(
            `💔 ${target.name} permanently loses ${actualReduction} max HP! (${oldMaxHp} → ${target.maxHp}) (Total permanent: ${target.permanentHpBonusses})`,
            target.side === 'player' ? 'error' : 'info'
        );
    }

    /**
     * Play the forceful revival animation with stars
     */
    async playForcefulRevivalAnimation(caster, targetData, revivalHp) {
        console.log(`✨ Playing Forceful Revival animation for ${targetData.name}...`);
        
        const targetElement = this.battleManager.getHeroElement(targetData.side, targetData.position);
        
        if (!targetElement) {
            console.error('Could not find target element for forceful revival animation');
            // Still perform the revival even if animation fails
            this.reviveHero(targetData, revivalHp);
            this.sendRevivalUpdate(caster, targetData, revivalHp);
            return;
        }
        
        // Create star effects around the target
        this.createStarEffect(targetElement);
        
        // Animation timing
        const starCircleTime = 1000; // Stars circle around
        const revivalTime = 500;     // Revival flash
        
        // Wait for stars to circle
        await this.battleManager.delay(starCircleTime);
        
        // Perform the actual revival
        this.reviveHero(targetData, revivalHp);
        
        // Create revival flash effect
        this.createRevivalFlashEffect(targetElement);
        
        // Send network update to guest
        this.sendRevivalUpdate(caster, targetData, revivalHp);
        
        // Wait for revival effect to complete
        await this.battleManager.delay(revivalTime);
        
        // Cleanup
        this.cleanupForcefulRevivalEffects();
    }

    /**
     * Create star effects circling around the target
     */
    createStarEffect(targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        
        // Ensure CSS exists
        this.ensureForcefulRevivalCSS();
        
        // Create stun effect container
        const stunContainer = document.createElement('div');
        stunContainer.className = 'forceful-revival-stun-container';
        
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(2000);
        
        stunContainer.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 400;
        `;
        
        // Create multiple yellow stars circling around the hero
        const starCount = 8;
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'forceful-revival-star';
            star.innerHTML = '⭐';
            
            const delay = (i * 100) + 'ms';
            const duration = animationDuration + 'ms';
            
            star.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                font-size: 32px;
                pointer-events: none;
                z-index: 401;
                transform: translate(-50%, -50%);
                animation: forcefulRevivalStar ${duration} ease-in-out ${delay} forwards;
                text-shadow: 
                    0 0 10px rgba(255, 215, 0, 0.8),
                    0 0 20px rgba(255, 255, 0, 0.6);
            `;
            
            // Set custom animation delay as a CSS variable
            star.style.setProperty('--star-index', i);
            
            stunContainer.appendChild(star);
        }
        
        // Add dizzy effect text
        const dizzyText = document.createElement('div');
        dizzyText.className = 'forceful-revival-dizzy';
        dizzyText.innerHTML = '💫';
        dizzyText.style.cssText = `
            position: absolute;
            left: 50%;
            top: 20%;
            font-size: 48px;
            pointer-events: none;
            z-index: 402;
            transform: translate(-50%, -50%);
            animation: forcefulRevivalDizzy ${animationDuration}ms ease-in-out forwards;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
        `;
        
        stunContainer.appendChild(dizzyText);
        
        targetElement.appendChild(stunContainer);
        
        // Clean up after animation
        setTimeout(() => {
            if (stunContainer && stunContainer.parentNode) {
                stunContainer.remove();
            }
        }, animationDuration);
    }

    /**
     * Create revival flash effect at target location
     */
    createRevivalFlashEffect(targetElement) {
        const effect = document.createElement('div');
        effect.className = 'forceful-revival-flash';
        effect.innerHTML = '🌟✨🌟';
        
        effect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 56px;
            z-index: 500;
            pointer-events: none;
            animation: forcefulRevivalFlash ${this.battleManager.getSpeedAdjustedDelay(500)}ms ease-out forwards;
            text-shadow: 
                0 0 25px rgba(255, 255, 255, 1),
                0 0 50px rgba(255, 215, 0, 0.9),
                0 0 75px rgba(255, 255, 100, 0.7);
        `;
        
        targetElement.appendChild(effect);
        
        // Remove effect after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(500));
    }

    /**
     * Revive the defeated hero with specified HP
     */
    reviveHero(target, revivalHp) {
        const casterSide = target.side;
        
        // Revive the hero
        target.alive = true;
        target.currentHp = revivalHp;
        
        console.log(`✨ ${target.name} revived with ${revivalHp}/${target.maxHp} HP`);
        
        // Update hero visual state
        this.updateHeroVisualState(casterSide, target.position, target);
    }

    /**
     * Update hero visual state after revival
     */
    updateHeroVisualState(side, position, hero) {
        // Remove defeated visual state
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (heroElement) {
            const card = heroElement.querySelector('.battle-hero-card');
            if (card) {
                card.classList.remove('defeated');
                card.style.filter = '';
                card.style.opacity = '';
                card.style.transform = '';
            }
        }
        
        // Update health bar
        this.battleManager.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
        
        console.log(`✨ Updated visual state for revived ${hero.name}`);
    }

    /**
     * Send revival update to network
     */
    sendRevivalUpdate(caster, targetData, revivalHp) {
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetName: targetData.name,
            targetAbsoluteSide: targetData.absoluteSide,
            targetPosition: targetData.position,
            revivalHp: revivalHp,
            maxHp: targetData.maxHp,  // This is now the REDUCED max HP
            permanentAttackGain: 20,
            permanentHpReduction: this.getActualHpReduction(targetData),  // Add this for guest sync
            timestamp: Date.now()
        });
    }

    /**
     * Calculate the actual HP reduction that was applied
     */
    getActualHpReduction(target) {
        // This is called after applyTrulyPermanentStatChanges
        // We need to look at the permanentHpBonusses to determine what was reduced
        const baseMaxHp = target.baseMaxHp || (target.maxHp - (target.permanentHpBonusses || 0));
        const currentPermanentBonus = target.permanentHpBonusses || 0;
        const effectiveBaseHp = baseMaxHp + currentPermanentBonus;
        
        // The reduction is either 50 or whatever keeps maxHP at 1 minimum
        const maxReduction = effectiveBaseHp - 1;
        return Math.min(50, maxReduction);
    }

    /**
     * Handle spell effect on guest side
     */
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, revivalHp, maxHp, targetAbsoluteSide, targetPosition, permanentAttackGain, permanentHpReduction } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = targetLocalSide === 'player' ? 'success' : 'error';
        
        // Find caster hero on guest side
        const casterHeroes = casterLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const casterHero = casterHeroes[data.casterPosition];
        
        if (casterHero) {
            // Apply permanent attack gain to caster
            casterHero.permanentAttackBonusses = (casterHero.permanentAttackBonusses || 0) + permanentAttackGain;
            casterHero.atk += permanentAttackGain;
            this.battleManager.updateHeroAttackDisplay(casterLocalSide, data.casterPosition, casterHero);
            
            this.battleManager.addCombatLog(
                `⚔️ ${casterName} permanently gains +${permanentAttackGain} Attack!`,
                casterLocalSide === 'player' ? 'success' : 'info'
            );
        }
        
        // Update target hero on guest side
        const targetHeroes = targetLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const targetHero = targetHeroes[targetPosition];
        
        if (targetHero) {
            // Apply permanent HP reduction to target
            const oldMaxHp = targetHero.maxHp;
            targetHero.permanentHpBonusses = (targetHero.permanentHpBonusses || 0) - permanentHpReduction;
            targetHero.maxHp = maxHp;  // Use the reduced max HP from host
            
            this.battleManager.addCombatLog(
                `💔 ${targetName} permanently loses ${permanentHpReduction} max HP! (${oldMaxHp} → ${maxHp})`,
                targetLocalSide === 'player' ? 'error' : 'info'
            );
            
            // Revive the hero with the new reduced max HP
            targetHero.alive = true;
            targetHero.currentHp = revivalHp;
            
            // Update visual state
            this.updateHeroVisualState(targetLocalSide, targetPosition, targetHero);
            
            // Add revival log
            this.battleManager.addCombatLog(
                `🌟 ${targetName} is forcefully revived with ${revivalHp} HP!`,
                logType
            );
        }
        
        // Play visual effects on guest side
        this.playGuestSideAnimation(targetLocalSide, targetPosition);
        
        console.log(`✨ GUEST: ${casterName} used ${displayName} to revive ${targetName} (${revivalHp}/${maxHp} HP)`);
    }

    /**
     * Guest-side animation (visual only, revival already handled)
     */
    async playGuestSideAnimation(side, position) {
        const targetElement = this.battleManager.getHeroElement(side, position);
        
        if (!targetElement) {
            console.error('Could not find target element for guest forceful revival animation');
            return;
        }
        
        // Create star effects
        this.createStarEffect(targetElement);
        
        // Animation timing
        const starCircleTime = 1000;
        const revivalTime = 500;
        
        // Wait for stars to circle
        await this.battleManager.delay(starCircleTime);
        
        // Create revival flash effect
        this.createRevivalFlashEffect(targetElement);
        
        // Wait for revival effect to complete
        await this.battleManager.delay(revivalTime);
        
        // Cleanup
        this.cleanupForcefulRevivalEffects();
    }

    /**
     * Clean up any remaining forceful revival effects
     */
    cleanupForcefulRevivalEffects() {
        // Remove any remaining stun effects
        const effects = document.querySelectorAll('.forceful-revival-stun-container');
        effects.forEach(effect => effect.remove());
        
        // Remove any remaining flash effects
        const flashEffects = document.querySelectorAll('.forceful-revival-flash');
        flashEffects.forEach(effect => effect.remove());
    }

    /**
     * Ensure CSS animations exist for forceful revival effects
     */
    ensureForcefulRevivalCSS() {
        if (document.getElementById('forcefulRevivalCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'forcefulRevivalCSS';
        style.textContent = `
            @keyframes forcefulRevivalStar {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 0;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.5) rotate(72deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1) rotate(180deg);
                    opacity: 1;
                }
                80% {
                    transform: translate(-50%, -50%) scale(1.2) rotate(288deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0) rotate(360deg);
                    opacity: 0;
                }
            }
            
            @keyframes forcefulRevivalDizzy {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 0;
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.2) rotate(360deg);
                    opacity: 1;
                }
                75% {
                    transform: translate(-50%, -50%) scale(1.4) rotate(540deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.5) rotate(720deg);
                    opacity: 0;
                }
            }
            
            @keyframes forcefulRevivalFlash {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                25% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.6) rotate(90deg); 
                }
                50% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.8) rotate(180deg); 
                }
                75% { 
                    opacity: 0.7; 
                    transform: translate(-50%, -50%) scale(2.0) rotate(270deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(2.2) rotate(360deg); 
                }
            }
            
            .forceful-revival-stun-container {
                will-change: transform;
            }
            
            .forceful-revival-star {
                will-change: transform, opacity;
            }
            
            .forceful-revival-dizzy {
                will-change: transform, opacity;
            }
            
            .forceful-revival-flash {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Get spell information
     */
    getSpellInfo() {
        return {
            name: this.spellName,
            displayName: this.displayName,
            description: 'When defeating an enemy hero, 20% chance to revive them at 100 HP, permanently gain +20 Attack, and permanently reduce their max HP by 50.',
            effectFormula: 'Revive at min(100, maxHP) HP, +20 permanent ATK, -50 permanent max HP',
            targetType: 'defeated_enemy_hero',
            spellSchool: 'Fighting',
            triggerChance: '20% per stack'
        };
    }

    /**
     * Cleanup (called when battle ends)
     */
    cleanup() {
        this.cleanupForcefulRevivalEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('forcefulRevivalCSS');
        if (css) css.remove();
        
        console.log('✨ Forceful Revival spell cleaned up');
    }
}

// Export for use in spell system
export default ForcefulRevivalSpell;