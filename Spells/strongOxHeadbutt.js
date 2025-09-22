// strongOxHeadbutt.js - Strong Ox Headbutt Fighting Spell Implementation

export class StrongOxHeadbuttSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'StrongOxHeadbutt';
    }

    /**
     * Calculate the trigger chance for this spell based on copies and graveyard cards
     * @param {Object} attacker - The hero who attacked
     * @returns {number} - Trigger chance (0-1)
     */
    getTriggerChance(attacker) {
        // Get all spells this hero has
        const allSpells = attacker.getAllSpells();
        if (!allSpells || allSpells.length === 0) {
            return 0;
        }

        // Count copies of StrongOxHeadbutt
        const oxHeadbuttCopies = allSpells.filter(spell => spell.name === 'StrongOxHeadbutt').length;
        if (oxHeadbuttCopies === 0) {
            return 0;
        }

        // Base chance is 10% per copy: 1 - 0.9^copies
        let baseChance = 1 - Math.pow(0.9, oxHeadbuttCopies);

        // Get graveyard for this hero's side
        const graveyard = this.battleManager.getGraveyardBySide(attacker.side);
        
        // Count BlowOfTheVenomSnake and FerociousTigerKick in graveyard
        let graveyardBonus = 0;
        if (graveyard && graveyard.length > 0) {
            const venomSnakes = graveyard.filter(card => card === 'BlowOfTheVenomSnake').length;
            const tigerKicks = graveyard.filter(card => card === 'FerociousTigerKick').length;
            graveyardBonus = venomSnakes + tigerKicks;
        }

        // Apply graveyard bonus using the same formula: 1-0.9^(X+1) where X is graveyard bonus
        // This gives multiplicative scaling: 10% base becomes 19%, 27%, etc.
        if (graveyardBonus > 0) {
            const bonusMultiplier = 1 - Math.pow(0.9, graveyardBonus + 1);
            // Apply bonus multiplicatively: final chance = base + (1-base) * bonusMultiplier
            baseChance = baseChance + (1 - baseChance) * bonusMultiplier;
        }

        return Math.min(baseChance, 1.0); // Cap at 100%
    }

    /**
     * Execute Strong Ox Headbutt effect after a successful attack
     * @param {Object} attacker - The hero who attacked
     * @param {Object} target - The target that was attacked (hero or creature)
     * @param {number} attackDamage - The damage that was dealt
     * @returns {Promise} - Animation completion promise
     */
    async executeEffect(attacker, target, attackDamage) {
        // Log the effect
        this.battleManager.addCombatLog(
            `🐂 ${attacker.name}'s Strong Ox Headbutt charges forth!`,
            attacker.side === 'player' ? 'success' : 'error'
        );

        // Apply 25 shield to the attacker
        if (this.battleManager.combatManager) {
            this.battleManager.combatManager.addShield(attacker, 25);
        }

        this.battleManager.addCombatLog(
            `🛡️ ${attacker.name} gains 25 Shield from the ox's protection!`,
            attacker.side === 'player' ? 'success' : 'error'
        );

        // Create visual effect immediately (don't await - let it run in background)
        this.createOxHeadbuttEffect(attacker);

        // Sync to guest if we're the host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('strong_ox_headbutt_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                targetInfo: this.getTargetSyncInfo(target),
                timestamp: Date.now()
            });
        }

        // Don't await the visual effect - return immediately so battle flow continues
    }

    /**
     * Create the ox headbutt effect (ox and shield on attacker)
     * @param {Object} attacker - The attacking hero
     * @returns {Promise} - Animation completion promise (but we don't await this)
     */
    async createOxHeadbuttEffect(attacker) {
        const attackerElement = this.getTargetElement(attacker);
        
        if (!attackerElement) {
            console.warn('Could not find element for Strong Ox Headbutt effect');
            return;
        }

        // Ensure CSS exists before creating effects
        this.ensureOxHeadbuttEffectCSS();

        // Create ox animation on attacker
        this.createOxOnAttacker(attackerElement);
        
        // Create shield effect on attacker (delayed slightly)
        setTimeout(() => {
            this.createShieldOnAttacker(attackerElement);
        }, this.battleManager.getSpeedAdjustedDelay(300));
    }

    /**
     * Create ox animation on the attacker
     * @param {HTMLElement} attackerElement - Attacker's DOM element
     */
    createOxOnAttacker(attackerElement) {
        const ox = document.createElement('div');
        ox.className = 'strong-ox-headbutt';
        ox.innerHTML = '🐂';
        
        ox.style.cssText = `
            position: absolute;
            left: 50%;
            top: 40%;
            transform: translate(-50%, -50%);
            font-size: 42px;
            pointer-events: none;
            z-index: 300;
            animation: strongOxCharge ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        `;
        
        attackerElement.appendChild(ox);
        
        // Clean up after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(1000);
        setTimeout(() => {
            if (ox && ox.parentNode) {
                ox.remove();
            }
        }, animationDuration);
    }

    /**
     * Create shield effect on the attacker
     * @param {HTMLElement} attackerElement - Attacker's DOM element
     */
    createShieldOnAttacker(attackerElement) {
        const shieldEffect = document.createElement('div');
        shieldEffect.className = 'ox-headbutt-shield';
        
        // Create shield visual
        shieldEffect.innerHTML = `
            <div class="shield-main">🛡️</div>
            <div class="shield-glow">✨</div>
        `;
        
        shieldEffect.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 310;
            text-align: center;
            animation: oxShieldEffect ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
        `;
        
        attackerElement.appendChild(shieldEffect);
        
        // Clean up after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(800);
        setTimeout(() => {
            if (shieldEffect && shieldEffect.parentNode) {
                shieldEffect.remove();
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
                console.warn('Could not find creature info for Strong Ox Headbutt target');
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
     * Handle guest receiving Strong Ox Headbutt effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, targetInfo } = data;
        
        // Find local attacker
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        
        if (!localAttacker) {
            console.warn('Could not find local attacker for Strong Ox Headbutt effect');
            return;
        }

        // Log the effect
        this.battleManager.addCombatLog(
            `🐂 ${localAttacker.name}'s Strong Ox Headbutt charges forth!`,
            localAttacker.side === 'player' ? 'success' : 'error'
        );

        // Apply shield effect on guest side
        if (this.battleManager.combatManager) {
            this.battleManager.combatManager.addShield(localAttacker, 25);
        }

        this.battleManager.addCombatLog(
            `🛡️ ${localAttacker.name} gains 25 Shield from the ox's protection!`,
            localAttacker.side === 'player' ? 'success' : 'error'
        );

        // Create visual effect (don't await)
        this.createOxHeadbuttEffect(localAttacker);
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
     * Ensure CSS for ox headbutt effect exists
     */
    ensureOxHeadbuttEffectCSS() {
        if (document.getElementById('strongOxHeadbuttCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'strongOxHeadbuttCSS';
        style.textContent = `
            @keyframes strongOxCharge {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 0;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.3) rotate(-5deg);
                    opacity: 1;
                }
                60% {
                    transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.9) rotate(0deg);
                    opacity: 0;
                }
            }
            
            @keyframes oxShieldEffect {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
                30% {
                    transform: translate(-50%, -50%) scale(1.4);
                    opacity: 1;
                }
                70% {
                    transform: translate(-50%, -50%) scale(1.0);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                }
            }
            
            .strong-ox-headbutt {
                will-change: transform, opacity;
                filter: drop-shadow(0 0 12px rgba(139, 69, 19, 0.8));
            }
            
            .ox-headbutt-shield {
                will-change: transform, opacity;
            }
            
            .shield-main {
                font-size: 28px;
                margin-bottom: 5px;
                filter: drop-shadow(0 0 6px rgba(70, 130, 180, 0.9));
            }
            
            .shield-glow {
                font-size: 20px;
                filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8));
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('strongOxHeadbuttCSS');
        if (css) css.remove();
        
        // Remove any remaining effects
        const oxEffects = document.querySelectorAll('.strong-ox-headbutt, .ox-headbutt-shield');
        oxEffects.forEach(effect => effect.remove());
    }
}

export default StrongOxHeadbuttSpell;