// challenge.js - Challenge Fighting Spell Implementation

export class ChallengeSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Challenge';
    }

    /**
     * Execute Challenge effect after a successful attack
     * @param {Object} attacker - The hero who attacked
     * @param {Object} target - The target that was attacked (hero or creature)
     * @param {number} attackDamage - The damage that was dealt
     * @returns {Promise} - Animation completion promise
     */
    async executeEffect(attacker, target, attackDamage) {
        // Count how many Challenge spells the attacker has
        const challengeCount = this.countChallengeSpells(attacker);
        
        if (challengeCount === 0) {
            return; // No Challenge spells, nothing to do
        }

        let totalSuccesses = 0;
        let totalStacksToAdd = 0;

        // Roll for each Challenge spell independently
        for (let i = 0; i < challengeCount; i++) {
            const roll = this.battleManager.getRandom();
            const triggerChance = 0.20; // 20% chance
            
            if (roll < triggerChance) {
                totalSuccesses++;
                totalStacksToAdd += 2; // Each success adds 2 stacks
            }
        }

        if (totalSuccesses === 0) {
            return; // No successes, no effect
        }

        // Apply taunting stacks to the attacker
        if (this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.applyStatusEffect(attacker, 'taunting', totalStacksToAdd);
        }

        // Log the effect
        const stackText = totalStacksToAdd === 2 ? '2 stacks' : `${totalStacksToAdd} stacks`;
        const spellText = challengeCount === 1 ? 'Challenge' : `${challengeCount} Challenge spells`;
        const successText = totalSuccesses === 1 ? '1 success' : `${totalSuccesses} successes`;
        
        this.battleManager.addCombatLog(
            `📢 ${attacker.name}'s ${spellText} triggers (${successText})! Gains ${stackText} of taunting!`,
            attacker.side === 'player' ? 'success' : 'error'
        );

        // Create visual effect (don't await - let it run in background)
        this.createChallengeEffect(attacker, totalSuccesses);

        // Sync to guest if we're the host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('challenge_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                targetInfo: this.getTargetSyncInfo(target),
                challengeCount: challengeCount,
                successCount: totalSuccesses,
                stacksAdded: totalStacksToAdd,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Count how many Challenge spells the attacker has
     * @param {Object} attacker - The attacking hero
     * @returns {number} - Number of Challenge spells
     */
    countChallengeSpells(attacker) {
        if (!attacker.spellbook || !Array.isArray(attacker.spellbook)) {
            return 0;
        }

        return attacker.spellbook.filter(spell => 
            spell && (spell.name === 'Challenge' || spell.cardName === 'Challenge')
        ).length;
    }

    /**
     * Create the challenge/taunting effect around the attacker
     * @param {Object} attacker - The hero who is challenging
     * @param {number} successCount - Number of successful Challenge triggers
     * @returns {Promise} - Animation completion promise
     */
    async createChallengeEffect(attacker, successCount) {
        const attackerElement = this.getTargetElement(attacker);
        if (!attackerElement) {
            console.warn('Could not find attacker element for Challenge effect');
            return;
        }

        // Ensure CSS exists before creating effect
        this.ensureChallengeEffectCSS();

        // Create challenge shout effect
        const challengeContainer = document.createElement('div');
        challengeContainer.className = 'challenge-effect-container';
        
        // Create multiple shout waves based on success count
        for (let i = 0; i < successCount; i++) {
            const shoutWave = this.createShoutWave(i, successCount);
            challengeContainer.appendChild(shoutWave);
        }

        // Create taunt symbols
        const tauntSymbols = this.createTauntSymbols(successCount);
        challengeContainer.appendChild(tauntSymbols);

        // Position the container at attacker center
        challengeContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 350;
        `;

        attackerElement.appendChild(challengeContainer);

        // Clean up after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(800);
        setTimeout(() => {
            if (challengeContainer && challengeContainer.parentNode) {
                challengeContainer.remove();
            }
        }, animationDuration);
    }

    /**
     * Create a shout wave element
     * @param {number} index - Wave index
     * @param {number} total - Total number of waves
     * @returns {HTMLElement} - Shout wave element
     */
    createShoutWave(index, total) {
        const wave = document.createElement('div');
        wave.className = 'challenge-shout-wave';
        
        const delay = index * 150; // Stagger the waves
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(600) + 'ms';
        
        wave.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 60px;
            height: 60px;
            border: 3px solid rgba(255, 107, 107, 0.8);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: challengeShoutExpand ${animationDuration} ease-out ${delay}ms forwards;
            pointer-events: none;
        `;
        
        return wave;
    }

    /**
     * Create taunt symbols floating around the attacker
     * @param {number} successCount - Number of successful triggers
     * @returns {HTMLElement} - Taunt symbols container
     */
    createTauntSymbols(successCount) {
        const symbolsContainer = document.createElement('div');
        symbolsContainer.className = 'challenge-taunt-symbols';
        
        // Create floating taunt symbols
        const symbols = ['📢', '💪', '⚔️'];
        const symbolCount = Math.min(successCount * 2, 6); // Max 6 symbols
        
        for (let i = 0; i < symbolCount; i++) {
            const symbol = document.createElement('div');
            symbol.className = 'challenge-taunt-symbol';
            symbol.innerHTML = symbols[i % symbols.length];
            
            // Random position around the attacker
            const angle = (i / symbolCount) * 360 + Math.random() * 30;
            const radius = 40 + Math.random() * 20;
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;
            
            const animationDelay = (i * 100) + 'ms';
            const animationDuration = this.battleManager.getSpeedAdjustedDelay(700) + 'ms';
            
            symbol.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                font-size: ${14 + Math.random() * 6}px;
                transform: translate(-50%, -50%) translate(${x}px, ${y}px);
                animation: challengeTauntFloat ${animationDuration} ease-out ${animationDelay} forwards;
                pointer-events: none;
                text-shadow: 0 0 8px rgba(255, 107, 107, 0.8);
            `;
            
            symbolsContainer.appendChild(symbol);
        }
        
        symbolsContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        
        return symbolsContainer;
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
                console.warn('Could not find creature info for Challenge target');
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
     * Handle guest receiving Challenge effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, targetInfo, challengeCount, successCount, stacksAdded } = data;
        
        // Find local targets
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        const localTarget = this.findTargetFromSyncInfo(targetInfo);
        
        if (!localAttacker) {
            console.warn('Could not find local attacker for Challenge effect');
            return;
        }

        // Apply status effect
        if (this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.applyStatusEffect(localAttacker, 'taunting', stacksAdded);
        }

        // Log the effect
        const stackText = stacksAdded === 2 ? '2 stacks' : `${stacksAdded} stacks`;
        const spellText = challengeCount === 1 ? 'Challenge' : `${challengeCount} Challenge spells`;
        const successText = successCount === 1 ? '1 success' : `${successCount} successes`;
        
        this.battleManager.addCombatLog(
            `📢 ${localAttacker.name}'s ${spellText} triggers (${successText})! Gains ${stackText} of taunting!`,
            localAttacker.side === 'player' ? 'success' : 'error'
        );

        // Create visual effect (don't await)
        this.createChallengeEffect(localAttacker, successCount);
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
     * Ensure CSS for challenge effect exists
     */
    ensureChallengeEffectCSS() {
        if (document.getElementById('challengeEffectCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'challengeEffectCSS';
        style.textContent = `
            @keyframes challengeShoutExpand {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 1;
                    border-width: 3px;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.5);
                    opacity: 0.8;
                    border-width: 2px;
                }
                100% {
                    transform: translate(-50%, -50%) scale(2.5);
                    opacity: 0;
                    border-width: 1px;
                }
            }
            
            @keyframes challengeTauntFloat {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) translate(var(--x, 0), var(--y, 0)) scale(0) rotate(0deg);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) translate(var(--x, 0), var(--y, 0)) scale(1.2) rotate(72deg);
                }
                80% {
                    opacity: 0.9;
                    transform: translate(-50%, -50%) translate(var(--x, 0), var(--y, 0)) scale(1.0) rotate(288deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) translate(var(--x, 0), var(--y, 0)) scale(0.5) rotate(360deg);
                }
            }
            
            .challenge-effect-container {
                will-change: transform, opacity;
            }
            
            .challenge-shout-wave {
                will-change: transform, opacity;
            }
            
            .challenge-taunt-symbol {
                will-change: transform, opacity;
                filter: drop-shadow(0 0 4px rgba(255, 107, 107, 0.6));
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('challengeEffectCSS');
        if (css) css.remove();
        
        // Remove any remaining effects
        const effects = document.querySelectorAll('.challenge-effect-container');
        effects.forEach(effect => effect.remove());
    }
}

export default ChallengeSpell;