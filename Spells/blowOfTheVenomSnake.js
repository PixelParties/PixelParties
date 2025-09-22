// blowOfTheVenomSnake.js - Blow Of The Venom Snake Fighting Spell Implementation

export class BlowOfTheVenomSnakeSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'BlowOfTheVenomSnake';
    }

    /**
     * Calculate the trigger chance for this spell based on graveyard cards
     * @param {Object} attacker - The hero who attacked
     * @returns {number} - Trigger chance (0-1)
     */
    getTriggerChance(attacker) {
        // Get graveyard for this hero's side
        const graveyard = this.battleManager.getGraveyardBySide(attacker.side);
        
        // Count StrongOxHeadbutt and FerociousTigerKick in graveyard
        let graveyardBonus = 0;
        if (graveyard && graveyard.length > 0) {
            const oxHeadbutts = graveyard.filter(card => card === 'StrongOxHeadbutt').length;
            const tigerKicks = graveyard.filter(card => card === 'FerociousTigerKick').length;
            graveyardBonus = oxHeadbutts + tigerKicks;
        }
        
        // Calculate chance: 1-0.9^(X+1) where X is graveyard bonus
        // This gives base 10% (X=0) scaling up to 19%, 27%, etc.
        const chance = 1 - Math.pow(0.9, graveyardBonus + 1);
        
        return Math.min(chance, 1.0); // Cap at 100%
    }

    /**
     * Execute Blow Of The Venom Snake effect after a successful attack
     * @param {Object} attacker - The hero who attacked
     * @param {Object} target - The target that was attacked (hero or creature)
     * @param {number} attackDamage - The damage that was dealt
     * @returns {Promise} - Animation completion promise
     */
    async executeEffect(attacker, target, attackDamage) {
        // Check if target survived the attack
        const targetAlive = target.alive;
        
        if (!targetAlive) {
            // Target is dead - still show visual effect but no status effect
            this.battleManager.addCombatLog(
                `🐍 ${attacker.name}'s Venom Snake strikes at the fallen ${target.name}!`,
                attacker.side === 'player' ? 'success' : 'error'
            );
        } else {
            // Target survived - apply full effect
            this.battleManager.addCombatLog(
                `🐍 ${attacker.name}'s Venom Snake bites ${target.name}!`,
                attacker.side === 'player' ? 'success' : 'error'
            );

            // Apply poisoned status effect immediately
            if (this.battleManager.statusEffectsManager) {
                this.battleManager.statusEffectsManager.applyStatusEffect(target, 'poisoned', 1);
            }
        }

        // Create visual effect immediately (don't await - let it run in background)
        this.createSnakeAttackEffect(attacker, target);

        // Sync to guest if we're the host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('blow_of_the_venom_snake_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                targetInfo: this.getTargetSyncInfo(target),
                targetAlive: targetAlive,
                timestamp: Date.now()
            });
        }

        // Don't await the visual effect - return immediately so battle flow continues
    }

    /**
     * Create the snake attack effect (snake on attacker, bite on target)
     * @param {Object} attacker - The attacking hero
     * @param {Object} target - The target to bite
     * @returns {Promise} - Animation completion promise (but we don't await this)
     */
    async createSnakeAttackEffect(attacker, target) {
        const attackerElement = this.getTargetElement(attacker);
        const targetElement = this.getTargetElement(target);
        
        if (!attackerElement || !targetElement) {
            console.warn('Could not find elements for Blow Of The Venom Snake effect');
            return;
        }

        // Ensure CSS exists before creating effects
        this.ensureSnakeEffectCSS();

        // Create snake animation on attacker
        this.createSnakeOnAttacker(attackerElement);
        
        // Create bite effect on target (delayed slightly)
        setTimeout(() => {
            this.createBiteOnTarget(targetElement);
        }, this.battleManager.getSpeedAdjustedDelay(200));
    }

    /**
     * Create snake animation on the attacker
     * @param {HTMLElement} attackerElement - Attacker's DOM element
     */
    createSnakeOnAttacker(attackerElement) {
        const snake = document.createElement('div');
        snake.className = 'venom-snake-attacker';
        snake.innerHTML = '🐍';
        
        snake.style.cssText = `
            position: absolute;
            left: 50%;
            top: 30%;
            transform: translate(-50%, -50%);
            font-size: 36px;
            pointer-events: none;
            z-index: 300;
            animation: venomSnakeSlither ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
        `;
        
        attackerElement.appendChild(snake);
        
        // Clean up after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(800);
        setTimeout(() => {
            if (snake && snake.parentNode) {
                snake.remove();
            }
        }, animationDuration);
    }

    /**
     * Create bite effect on the target
     * @param {HTMLElement} targetElement - Target's DOM element
     */
    createBiteOnTarget(targetElement) {
        const biteEffect = document.createElement('div');
        biteEffect.className = 'venom-snake-bite';
        
        // Create bite visual with fangs and poison
        biteEffect.innerHTML = `
            <div class="bite-fangs">🦷🦷</div>
            <div class="poison-splash">💚</div>
        `;
        
        biteEffect.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 310;
            text-align: center;
            animation: venomBiteEffect ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
        `;
        
        targetElement.appendChild(biteEffect);
        
        // Clean up after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(600);
        setTimeout(() => {
            if (biteEffect && biteEffect.parentNode) {
                biteEffect.remove();
            }
        }, animationDuration);
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
                console.warn('Could not find creature info for Blow Of The Venom Snake target');
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
     * Handle guest receiving Blow Of The Venom Snake effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, targetInfo, targetAlive } = data;
        
        // Find local targets
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        const localTarget = this.findTargetFromSyncInfo(targetInfo);
        
        if (!localAttacker || !localTarget) {
            console.warn('Could not find local targets for Blow Of The Venom Snake effect');
            return;
        }

        // Log the effect
        if (targetAlive) {
            this.battleManager.addCombatLog(
                `🐍 ${localAttacker.name}'s Venom Snake bites ${localTarget.name}!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );

            // Apply status effect only if target was alive
            if (this.battleManager.statusEffectsManager) {
                this.battleManager.statusEffectsManager.applyStatusEffect(localTarget, 'poisoned', 1);
            }
        } else {
            this.battleManager.addCombatLog(
                `🐍 ${localAttacker.name}'s Venom Snake strikes at the fallen ${localTarget.name}!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );
        }

        // Create visual effect (don't await)
        this.createSnakeAttackEffect(localAttacker, localTarget);
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
     * Ensure CSS for snake effect exists
     */
    ensureSnakeEffectCSS() {
        if (document.getElementById('venomSnakeCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'venomSnakeCSS';
        style.textContent = `
            @keyframes venomSnakeSlither {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 0;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.2) rotate(10deg);
                    opacity: 1;
                }
                60% {
                    transform: translate(-50%, -50%) scale(1.0) rotate(-5deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
                    opacity: 0;
                }
            }
            
            @keyframes venomBiteEffect {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
                30% {
                    transform: translate(-50%, -50%) scale(1.3);
                    opacity: 1;
                }
                70% {
                    transform: translate(-50%, -50%) scale(1.0);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.7);
                    opacity: 0;
                }
            }
            
            .venom-snake-attacker {
                will-change: transform, opacity;
                filter: drop-shadow(0 0 8px rgba(34, 139, 34, 0.8));
            }
            
            .venom-snake-bite {
                will-change: transform, opacity;
            }
            
            .bite-fangs {
                font-size: 20px;
                margin-bottom: 5px;
                filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.8));
            }
            
            .poison-splash {
                font-size: 24px;
                filter: drop-shadow(0 0 6px rgba(34, 139, 34, 0.9));
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('venomSnakeCSS');
        if (css) css.remove();
        
        // Remove any remaining effects
        const snakeEffects = document.querySelectorAll('.venom-snake-attacker, .venom-snake-bite');
        snakeEffects.forEach(effect => effect.remove());
    }
}

export default BlowOfTheVenomSnakeSpell;