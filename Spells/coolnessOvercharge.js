// coolnessOvercharge.js - Coolness Overcharge Fighting Spell Implementation

export class CoolnessOverchargeSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'CoolnessOvercharge';
    }

    getTriggerChance(attacker, target, damage) {
        // 20% base chance to trigger
        return 0.2;
    }

    /**
     * Execute Coolness Overcharge effect after a successful attack
     * @param {Object} attacker - The hero who attacked
     * @param {Object} target - The target that was attacked (hero or creature)
     * @param {number} attackDamage - The damage that was dealt
     * @returns {Promise} - Animation completion promise
     */
    async executeEffect(attacker, target, attackDamage) {
        // Show spell card since this always triggers when called
        if (this.battleManager.spellSystem) {
            this.battleManager.spellSystem.showFightingSpellCard(attacker, 'CoolnessOvercharge');
        }

        // Check if target survived the attack
        const targetAlive = target.alive;
        
        if (!targetAlive) {
            // Target is dead - still show visual effect but no status effect
            this.battleManager.addCombatLog(
                `⭐ ${attacker.name}'s Coolness Overcharge creates a starry shimmer around the fallen ${target.name}!`,
                attacker.side === 'player' ? 'success' : 'error'
            );
        } else {
            // Target survived - apply full effect
            this.battleManager.addCombatLog(
                `⭐ ${attacker.name}'s Coolness Overcharge weakens ${target.name}!`,
                attacker.side === 'player' ? 'success' : 'error'
            );

            // Apply weakened status effect immediately (3 stacks)
            if (this.battleManager.statusEffectsManager) {
                this.battleManager.statusEffectsManager.applyStatusEffect(target, 'weakened', 3);
            }
        }

        // Create visual effect immediately (don't await - let it run in background)
        this.createStarDanceEffect(target);

        // Sync to guest if we're the host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('coolness_overcharge_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                targetInfo: this.getTargetSyncInfo(target),
                targetAlive: targetAlive,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Create the star dance effect around the target
     * @param {Object} target - The target to create effect around
     * @returns {Promise} - Animation completion promise (but we don't await this)
     */
    async createStarDanceEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) {
            console.warn('Could not find target element for Coolness Overcharge effect');
            return;
        }

        // Ensure CSS exists before creating particles
        this.ensureStarEffectCSS();

        // Create 3 dancing stars
        const stars = [];
        const starCount = 3;
        
        for (let i = 0; i < starCount; i++) {
            const star = this.createDancingStar(i);
            targetElement.appendChild(star);
            stars.push(star);
        }

        // Clean up stars after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(800);
        setTimeout(() => {
            stars.forEach(star => {
                if (star && star.parentNode) {
                    star.remove();
                }
            });
        }, animationDuration);
    }

    /**
     * Create a single dancing star element
     * @param {number} index - Star index (0, 1, or 2)
     * @returns {HTMLElement} - Dancing star element
     */
    createDancingStar(index) {
        const star = document.createElement('div');
        star.className = 'coolness-overcharge-star';
        star.innerHTML = '⭐';
        
        // Each star gets a different erratic dance pattern
        const baseDelay = index * 100; // Stagger the starts
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(800);
        
        // Random starting position around the target
        const startAngle = (index * 120) + (Math.random() * 60 - 30); // 120° apart with variance
        const startRadius = 25 + Math.random() * 15;
        const startX = Math.cos(startAngle * Math.PI / 180) * startRadius;
        const startY = Math.sin(startAngle * Math.PI / 180) * startRadius;
        
        star.style.cssText = `
            position: absolute;
            left: calc(50% + ${startX}px);
            top: calc(50% + ${startY}px);
            transform: translate(-50%, -50%);
            font-size: 20px;
            pointer-events: none;
            z-index: 350;
            animation: coolnessStarDance${index} ${animationDuration}ms ease-in-out ${baseDelay}ms forwards;
            text-shadow: 
                0 0 8px rgba(255, 255, 0, 0.8),
                0 0 16px rgba(255, 255, 0, 0.5);
            filter: drop-shadow(0 0 4px rgba(255, 255, 0, 0.6));
        `;
        
        return star;
    }

    /**
     * Get the DOM element for the target (hero or creature)
     * @param {Object} target - Target object
     * @returns {HTMLElement|null} - Target DOM element
     */
    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            // Hero element
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
            // Creature element
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) {
                console.warn('Could not find creature info for Coolness Overcharge target');
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
     * @param {Object} creature - Creature object
     * @returns {Object|null} - Creature info or null
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
     * @param {Object} target - Target object
     * @returns {Object} - Sync information
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
     * Handle guest receiving Coolness Overcharge effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, targetInfo, targetAlive } = data;
        
        // Find local targets
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        const localTarget = this.findTargetFromSyncInfo(targetInfo);
        
        if (!localAttacker || !localTarget) {
            console.warn('Could not find local targets for Coolness Overcharge effect');
            return;
        }

        // Log the effect
        if (targetAlive) {
            this.battleManager.addCombatLog(
                `⭐ ${localAttacker.name}'s Coolness Overcharge weakens ${localTarget.name}!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );

            // Apply status effect only if target was alive (3 stacks of weakened)
            if (this.battleManager.statusEffectsManager) {
                this.battleManager.statusEffectsManager.applyStatusEffect(localTarget, 'weakened', 3);
            }
        } else {
            this.battleManager.addCombatLog(
                `⭐ ${localAttacker.name}'s Coolness Overcharge creates a starry shimmer around the fallen ${localTarget.name}!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );
        }

        // Create visual effect (don't await)
        this.createStarDanceEffect(localTarget);
    }

    /**
     * Find target from sync information
     * @param {Object} targetInfo - Target sync info
     * @returns {Object|null} - Target object or null
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
     * Ensure CSS for star dance effect exists
     */
    ensureStarEffectCSS() {
        if (document.getElementById('coolnessOverchargeCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'coolnessOverchargeCSS';
        style.textContent = `
            @keyframes coolnessStarDance0 {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                }
                15% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(45deg);
                }
                30% {
                    transform: translate(-70%, -30%) scale(0.8) rotate(120deg);
                }
                50% {
                    transform: translate(-20%, -80%) scale(1.1) rotate(200deg);
                }
                70% {
                    transform: translate(-90%, -60%) scale(0.9) rotate(280deg);
                }
                85% {
                    transform: translate(-40%, -40%) scale(1.0) rotate(340deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(360deg);
                }
            }
            
            @keyframes coolnessStarDance1 {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                }
                15% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1) rotate(-30deg);
                }
                30% {
                    transform: translate(-10%, -70%) scale(1.0) rotate(-90deg);
                }
                50% {
                    transform: translate(-80%, -20%) scale(0.9) rotate(-150deg);
                }
                70% {
                    transform: translate(-30%, -90%) scale(1.2) rotate(-220deg);
                }
                85% {
                    transform: translate(-60%, -30%) scale(0.8) rotate(-300deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(-360deg);
                }
            }
            
            @keyframes coolnessStarDance2 {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                }
                15% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0) rotate(60deg);
                }
                30% {
                    transform: translate(-80%, -80%) scale(1.3) rotate(140deg);
                }
                50% {
                    transform: translate(-10%, -30%) scale(0.7) rotate(210deg);
                }
                70% {
                    transform: translate(-70%, -40%) scale(1.1) rotate(290deg);
                }
                85% {
                    transform: translate(-30%, -70%) scale(0.9) rotate(350deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(420deg);
                }
            }
            
            .coolness-overcharge-star {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('coolnessOverchargeCSS');
        if (css) css.remove();
        
        // Remove any remaining stars
        const stars = document.querySelectorAll('.coolness-overcharge-star');
        stars.forEach(star => star.remove());
    }
}

export default CoolnessOverchargeSpell;