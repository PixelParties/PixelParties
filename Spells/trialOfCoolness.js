// trialOfCoolness.js - Trial of Coolness Fighting Spell Implementation

export class TrialOfCoolnessSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'TrialOfCoolness';
    }

    /**
     * Custom trigger chance calculation for Trial of Coolness
     */
    getTriggerChance(attacker, target, damage) {
        // Check if the trial should trigger based on conditions
        if (!this.shouldTrigger(attacker, target, damage)) {
            return 0;
        }

        // Get number of TrialOfCoolness spells on attacker
        const spellCount = attacker.getSpecificSpellCount('TrialOfCoolness');
        if (spellCount === 0) return 0;

        // 20% base chance per spell, multiplicative scaling
        let nonTriggerChance = 1.0;
        for (let i = 0; i < spellCount; i++) {
            nonTriggerChance *= 0.8; // 20% chance = 1 - 0.8
        }
        
        return 1.0 - nonTriggerChance; // Convert to trigger chance
    }

    /**
     * Check if Trial of Coolness should trigger
     */
    shouldTrigger(attacker, target, damage) {
        // Target must have survived the initial attack
        if (!target.alive) return false;
        
        // Target must have fewer remaining HP than the attacker
        return target.currentHp < attacker.currentHp;
    }

    /**
     * Execute Trial of Coolness effect after trigger
     */
    async executeEffect(attacker, target, attackDamage) {
        // Show spell card since this always triggers when called
        if (this.battleManager.spellSystem) {
            this.battleManager.spellSystem.showFightingSpellCard(attacker, 'TrialOfCoolness');
        }

        // Record target's HP before the trial for attacker damage
        const targetHpBeforeTrial = target.currentHp;
        
        this.battleManager.addCombatLog(
            `💥 ${attacker.name}'s Trial of Coolness judges ${target.name}!`,
            attacker.side === 'player' ? 'success' : 'error'
        );

        // Create visual effect immediately
        this.createTrialBubbleEffect(target);

        // Apply the trial effect - defeat target and damage attacker
        await this.applyTrialEffect(attacker, target, targetHpBeforeTrial);

        // Sync to guest if we're the host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('trial_of_coolness_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                targetInfo: this.getTargetSyncInfo(target),
                targetHpBeforeTrial: targetHpBeforeTrial,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Apply the trial effect - defeat target and damage attacker
     */
    async applyTrialEffect(attacker, target, targetHpBeforeTrial) {
        // Immediately defeat the target (prevent revival with special context)
        if (target.type === 'hero' || !target.type) {
            // Hero target
            await this.battleManager.authoritative_applyDamage({
                target: target,
                damage: target.currentHp,
                newHp: 0,
                died: true
            }, {
                source: 'trial_of_coolness',
                attacker: attacker,
                preventRevival: true // Key flag to prevent revival effects
            });
        } else {
            // Creature target
            const creatureInfo = this.findCreatureInfo(target);
            if (creatureInfo) {
                const { hero, creatureIndex, side, position } = creatureInfo;
                
                await this.battleManager.authoritative_applyDamageToCreature({
                    hero: hero,
                    creature: target,
                    creatureIndex: creatureIndex,
                    damage: target.currentHp,
                    position: position,
                    side: side
                }, {
                    source: 'trial_of_coolness',
                    attacker: attacker,
                    preventRevival: true // Key flag to prevent revival effects
                });
            }
        }

        // Damage the attacker for the target's HP before trial
        if (targetHpBeforeTrial > 0 && attacker.alive) {
            await this.battleManager.authoritative_applyDamage({
                target: attacker,
                damage: targetHpBeforeTrial,
                newHp: Math.max(0, attacker.currentHp - targetHpBeforeTrial),
                died: (attacker.currentHp - targetHpBeforeTrial) <= 0
            }, {
                source: 'trial_of_coolness_recoil',
                attacker: target // Original target is the "source" of recoil
            });

            this.battleManager.addCombatLog(
                `💥 ${attacker.name} takes ${targetHpBeforeTrial} recoil damage from the trial!`,
                attacker.side === 'player' ? 'error' : 'success'
            );
        }
    }

    /**
     * Create the trial bubble effect around the target
     */
    createTrialBubbleEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) {
            console.warn('Could not find target element for Trial of Coolness effect');
            return;
        }

        // Ensure CSS exists before creating effect
        this.ensureTrialEffectCSS();

        // Create large impact bubble
        const bubble = document.createElement('div');
        bubble.className = 'trial-of-coolness-bubble';
        bubble.innerHTML = '💥';
        
        bubble.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 80px;
            z-index: 1000;
            pointer-events: none;
            animation: trialBubbleBurst ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
            text-shadow: 
                0 0 20px #ff4444,
                0 0 40px #ff0000,
                0 0 60px #ffffff;
        `;
        
        targetElement.appendChild(bubble);
        
        // Clean up bubble after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(800);
        setTimeout(() => {
            if (bubble && bubble.parentNode) {
                bubble.remove();
            }
        }, animationDuration);
    }

    /**
     * Get the DOM element for the target (hero or creature)
     */
    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            // Hero element
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
            // Creature element
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) {
                console.warn('Could not find creature info for Trial of Coolness target');
                return null;
            }

            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
    }

    /**
     * Find creature information (hero, position, index)
     */
    findCreatureInfo(creature) {
        // Search through all heroes and their creatures
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            
            for (const position of ['left', 'center', 'right']) {
                const hero = heroes[position];
                if (!hero || !hero.creatures) continue;
                
                const creatureIndex = hero.creatures.indexOf(creature);
                if (creatureIndex !== -1) {
                    return { hero, side, position, creatureIndex };
                }
            }
        }
        
        return null;
    }

    /**
     * Get target sync information for network communication
     */
    getTargetSyncInfo(target) {
        if (target.type === 'hero' || !target.type) {
            return {
                type: 'hero',
                absoluteSide: target.absoluteSide,
                position: target.position,
                name: target.name
            };
        } else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                absoluteSide: creatureInfo.hero.absoluteSide,
                position: creatureInfo.position,
                creatureIndex: creatureInfo.creatureIndex,
                name: target.name
            };
        }
    }

    /**
     * Handle guest receiving Trial of Coolness effect
     */
    async handleGuestEffect(data) {
        const { attackerInfo, targetInfo, targetHpBeforeTrial } = data;
        
        // Find local targets
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        const localTarget = this.findTargetFromSyncInfo(targetInfo);
        
        if (!localAttacker || !localTarget) {
            console.warn('Could not find local targets for Trial of Coolness effect');
            return;
        }

        // Log the effect
        this.battleManager.addCombatLog(
            `💥 ${localAttacker.name}'s Trial of Coolness judges ${localTarget.name}!`,
            localAttacker.side === 'player' ? 'success' : 'error'
        );

        // Create visual effect
        this.createTrialBubbleEffect(localTarget);

        // Log recoil damage
        this.battleManager.addCombatLog(
            `💥 ${localAttacker.name} takes ${targetHpBeforeTrial} recoil damage from the trial!`,
            localAttacker.side === 'player' ? 'error' : 'success'
        );
    }

    /**
     * Find target from sync information
     */
    findTargetFromSyncInfo(targetInfo) {
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetInfo.type === 'hero') {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            return heroes[targetInfo.position];
        } else {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[targetInfo.position];
            return hero?.creatures?.[targetInfo.creatureIndex];
        }
    }

    /**
     * Ensure CSS for trial effect exists
     */
    ensureTrialEffectCSS() {
        if (document.getElementById('trialOfCoolnessCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'trialOfCoolnessCSS';
        style.textContent = `
            @keyframes trialBubbleBurst {
                0% {
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                    opacity: 0;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.5) rotate(15deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(2.0) rotate(-10deg);
                    opacity: 0.9;
                }
                80% {
                    transform: translate(-50%, -50%) scale(2.5) rotate(5deg);
                    opacity: 0.6;
                }
                100% {
                    transform: translate(-50%, -50%) scale(3.0) rotate(0deg);
                    opacity: 0;
                }
            }
            
            .trial-of-coolness-bubble {
                will-change: transform, opacity;
                filter: drop-shadow(0 0 10px rgba(255, 68, 68, 0.8));
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('trialOfCoolnessCSS');
        if (css) css.remove();
        
        // Remove any remaining bubbles
        const bubbles = document.querySelectorAll('.trial-of-coolness-bubble');
        bubbles.forEach(bubble => bubble.remove());
    }
}

export default TrialOfCoolnessSpell;