// Potions/healingPotion.js - HealingPotion Implementation with Auto-Trigger System

export class HealingPotion {
    constructor() {
        this.name = 'HealingPotion';
        this.displayName = 'Healing Potion';
        this.description = 'Grants 1 stack of healing reserve to all ally heroes at battle start';
        this.effectType = 'healing_reserve';
        this.targetType = 'ally_heroes_only';
        this.stacksPerUse = 1;
    }

    // ===== MAIN EFFECT METHODS =====

    async applyHealingReserveEffect(target, battleManager, stacks = 1) {
        if (!target || !battleManager || !this.isTargetValid(target)) {
            return false;
        }

        try {
            // Apply healthPotionReady status effect
            if (battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(target, 'healthPotionReady', stacks);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    async applyHealingReserveEffectsToTargets(targets, battleManager, playerRole, effectCount = 1) {
        if (!targets || targets.length === 0 || !battleManager) {
            return 0;
        }

        let targetsAffected = 0;
        const totalStacks = this.stacksPerUse * effectCount;

        for (const target of targets) {
            if (this.isTargetValid(target)) {
                const success = await this.applyHealingReserveEffect(target, battleManager, totalStacks);
                if (success) targetsAffected++;
            }
        }

        this.addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected, totalStacks);
        return targetsAffected;
    }

    // ===== AUTO-TRIGGER HEALING SYSTEM =====

    /**
     * Check and trigger healing reserve when hero takes damage
     * Call this after damage is applied
     */
    static checkAndTriggerHealingReserve(hero, battleManager) {
        if (!hero || !battleManager || !battleManager.statusEffectsManager) {
            return false;
        }

        const stacks = battleManager.statusEffectsManager.getStatusEffectStacks(hero, 'healthPotionReady');
        if (stacks === 0) return false;

        if (!hero.alive || hero.currentHp >= 100) return false;

        const oldHp = hero.currentHp;
        hero.currentHp = hero.maxHp; // Full heal

        battleManager.statusEffectsManager.removeStatusEffect(hero, 'healthPotionReady', 1);
        battleManager.updateHeroHealthBar(hero.side, hero.position, hero.currentHp, hero.maxHp);
        this.createHealingVisual(hero, battleManager);

        battleManager.addCombatLog(
            `💚 ${hero.name}'s Healing Potion activates! (${oldHp} → ${hero.currentHp} HP)`,
            hero.side === 'player' ? 'success' : 'info'
        );

        return true;
    }

    /**
     * Create healing visual effect (reuses Heal spell visual)
     */
    static createHealingVisual(hero, battleManager) {
        const heroElement = battleManager.getHeroElement(hero.side, hero.position);
        if (!heroElement) return;

        const targetRect = heroElement.getBoundingClientRect();
        const centerX = targetRect.left + targetRect.width / 2;
        const centerY = targetRect.top + targetRect.height / 2;
        
        const adjustedDuration = battleManager.getSpeedAdjustedDelay(1200);
        
        // Create orbital laser container
        const laserContainer = document.createElement('div');
        laserContainer.className = 'healing-potion-orbital-laser';
        laserContainer.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 100px;
            height: 100px;
            transform: translate(-50%, -50%);
            z-index: 1500;
            pointer-events: none;
            animation: orbitalLaserHealing ${adjustedDuration}ms ease-out forwards;
        `;
        
        // Laser beam
        const laserBeam = document.createElement('div');
        laserBeam.className = 'orbital-laser-beam';
        laserBeam.style.cssText = `
            position: absolute;
            left: 50%;
            top: -200px;
            width: 8px;
            height: 200px;
            background: linear-gradient(180deg, 
                transparent 0%,
                rgba(76, 175, 80, 0.3) 20%,
                rgba(76, 175, 80, 0.8) 60%,
                rgba(76, 175, 80, 1) 100%);
            transform: translateX(-50%);
            box-shadow: 
                0 0 20px rgba(76, 175, 80, 0.8),
                inset 0 0 10px rgba(255, 255, 255, 0.3);
            animation: laserBeamGlow ${adjustedDuration}ms ease-out forwards;
        `;
        
        // Impact effect
        const impactEffect = document.createElement('div');
        impactEffect.className = 'orbital-laser-impact';
        impactEffect.innerHTML = '💚✨💚';
        impactEffect.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            opacity: 0;
            animation: laserImpactGlow ${adjustedDuration}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(76, 175, 80, 1),
                0 0 30px rgba(76, 175, 80, 0.8);
        `;
        
        laserContainer.appendChild(laserBeam);
        laserContainer.appendChild(impactEffect);
        document.body.appendChild(laserContainer);
        
        setTimeout(() => {
            if (laserContainer.parentNode) {
                laserContainer.remove();
            }
        }, adjustedDuration);
    }

    /**
     * Guest-side handler for healing trigger
     */
    static guest_handleHealingTrigger(data, battleManager) {
        if (battleManager.isAuthoritative) return;

        const { targetAbsoluteSide, targetPosition, targetName, oldHp, newHp, maxHp, remainingStacks } = data;
        
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const heroes = targetLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const hero = heroes[targetPosition];
        
        if (!hero) return;
        
        // Update hero HP
        hero.currentHp = newHp;
        
        // Update healthPotionReady stacks
        if (battleManager.statusEffectsManager) {
            battleManager.statusEffectsManager.setStatusEffectStacks(hero, 'healthPotionReady', remainingStacks);
        }
        
        // Update health bar
        battleManager.updateHeroHealthBar(targetLocalSide, targetPosition, newHp, maxHp);
        
        // Create healing visual
        this.createHealingVisual(hero, battleManager);
        
        // Add to combat log
        const logType = targetLocalSide === 'player' ? 'success' : 'info';
        battleManager.addCombatLog(
            `💚 ${targetName}'s Healing Potion activates! (${oldHp} → ${newHp} HP)`,
            logType
        );
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    isTargetValid(target) {
        if (!target) return false;
        if (target.hasOwnProperty('alive')) {
            return target.alive === true;
        }
        return true;
    }

    collectAllyHeroes(battleManager, playerRole) {
        if (!battleManager) return [];

        const allyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);

        return allyHeroes.filter(hero => this.isTargetValid(hero));
    }

    // ===== POTION HANDLER INTEGRATION =====

    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0 || !battleManager) {
            return 0;
        }

        try {
            const targets = this.collectAllyHeroes(battleManager, playerRole);
            
            if (targets.length === 0) {
                battleManager.addCombatLog(
                    `💚 ${playerRole === 'host' ? 'Host' : 'Guest'}'s Healing Potion fizzles - no hero targets!`, 
                    playerRole === 'host' ? 'success' : 'error'
                );
                return 0;
            }

            const effectCount = effects.length;
            const targetsAffected = await this.applyHealingReserveEffectsToTargets(
                targets, 
                battleManager, 
                playerRole, 
                effectCount
            );

            return effectCount;
            
        } catch (error) {
            this.applyFallbackHealingReserve(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    applyFallbackHealingReserve(battleManager, playerRole, effectCount) {
        try {
            const allyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.playerHeroes) : 
                Object.values(battleManager.opponentHeroes);
            
            let fallbackTargets = 0;
            const totalStacks = this.stacksPerUse * effectCount;
            
            for (const hero of allyHeroes) {
                if (hero && hero.alive && battleManager.statusEffectsManager) {
                    battleManager.statusEffectsManager.applyStatusEffect(hero, 'healthPotionReady', totalStacks);
                    fallbackTargets++;
                }
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `💚 ${playerName}'s Healing Potion effects applied (${totalStacks} reserves to ${fallbackTargets} heroes)`, 
                playerRole === 'host' ? 'success' : 'error'
            );
            
        } catch (error) {
            console.error('Error in fallback Healing Potion application:', error);
        }
    }

    addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected, totalStacks) {
        if (!battleManager || !battleManager.addCombatLog) return;

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'error';
        
        let message;
        if (effectCount === 1) {
            message = `💚 ${playerName}'s Healing Potion prepared! ${targetsAffected} ally heroes gain healing reserve!`;
        } else {
            message = `💚 ${playerName}'s ${effectCount} Healing Potions prepared! ${targetsAffected} ally heroes gain ${totalStacks} healing reserves!`;
        }
        
        battleManager.addCombatLog(message, logType);
    }

    // ===== STATIC UTILITY METHODS =====

    static isHealingPotion(potionName) {
        return potionName === 'HealingPotion';
    }

    static getPotionInfo() {
        return {
            name: 'HealingPotion',
            displayName: 'Healing Potion',
            description: 'Grants 1 stack of healing reserve to all ally heroes at battle start',
            cardType: 'Potion',
            cost: 0,
            effect: 'When a hero with healing reserve drops below 100 HP, fully heal them and consume 1 reserve stack.',
            stacksPerUse: 1,
            targetType: 'ally_heroes_only'
        };
    }

    static create() {
        return new HealingPotion();
    }
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.HealingPotion = HealingPotion;
}

console.log('HealingPotion module loaded with auto-trigger system');