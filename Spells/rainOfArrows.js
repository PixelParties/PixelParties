// rainOfArrows.js - Rain of Arrows Fighting Spell Implementation

export class RainOfArrowsSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'RainOfArrows';
        this.damage = 40; // Fixed damage amount
    }

    /**
     * Execute Rain of Arrows effect after a successful attack
     * @param {Object} attacker - The hero who attacked
     * @param {Object} target - The target that was attacked (not used for area effect)
     * @param {number} attackDamage - The damage that was dealt (not used)
     * @returns {Promise} - Effect completion promise
     */
    async executeEffect(attacker, target, attackDamage) {
        // ============================================
        // STORM RING NEGATION CHECK
        // ============================================
        try {
            // Create a mock spell object for the Storm Ring check
            const mockSpell = {
                name: this.spellName,
                spellSchool: 'Fighting'
            };
            
            const { checkStormRingNegation } = await import('../Artifacts/stormRing.js');
            const negationResult = await checkStormRingNegation(attacker, mockSpell, this.battleManager);
            
            if (negationResult.negated) {
                console.log(`⛈️ ${this.spellName} was negated by Storm Ring!`);
                return; // Effect negated - exit without executing
            }
        } catch (error) {
            console.log('Storm Ring check failed, continuing with spell execution:', error);
        }
        // ============================================

        this.battleManager.addCombatLog(
            `� ${attacker.name}'s Rain of Arrows darkens the sky!`,
            attacker.side === 'player' ? 'success' : 'error'
        );

        // Find all enemy targets
        const enemyTargets = this.findAllEnemyTargets(attacker);
        
        if (enemyTargets.length === 0) {
            this.battleManager.addCombatLog(
                `🏹 But there are no enemies to target!`,
                'info'
            );
            return;
        }

        // Start arrow rain animation immediately (don't await)
        this.createArrowRainAnimation();

        // Wait a moment for arrows to start falling, then apply damage
        await this.battleManager.delay(270);

        // Apply damage to all enemies
        const damagedTargets = [];
        for (const enemyTarget of enemyTargets) {
            const success = this.applyDamageToTarget(enemyTarget);
            if (success) {
                damagedTargets.push({
                    type: enemyTarget.type,
                    name: enemyTarget.name,
                    position: enemyTarget.position,
                    absoluteSide: enemyTarget.absoluteSide
                });
            }
        }

        // Log the carnage
        if (damagedTargets.length > 0) {
            this.battleManager.addCombatLog(
                `🎯 Rain of Arrows strikes ${damagedTargets.length} enemies for ${this.damage} damage each!`,
                attacker.side === 'player' ? 'success' : 'error'
            );
        }

        // Sync to guest if we're the host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('rain_of_arrows_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                damagedTargets: damagedTargets,
                damage: this.damage,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Find all living enemy targets (heroes and creatures)
     * @param {Object} attacker - The attacking hero
     * @returns {Array} - Array of enemy target objects
     */
    findAllEnemyTargets(attacker) {
        const targets = [];
        const enemySide = attacker.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;

        // Find all enemy heroes and their creatures
        for (const position of ['left', 'center', 'right']) {
            const hero = enemyHeroes[position];
            if (!hero) continue;

            // Add living hero
            if (hero.alive) {
                targets.push({
                    type: 'hero',
                    target: hero,
                    name: hero.name,
                    position: position,
                    side: enemySide,
                    absoluteSide: hero.absoluteSide
                });
            }

            // Add living creatures
            if (hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        targets.push({
                            type: 'creature',
                            target: creature,
                            hero: hero,
                            creatureIndex: index,
                            name: creature.name,
                            position: position,
                            side: enemySide,
                            absoluteSide: hero.absoluteSide
                        });
                    }
                });
            }
        }

        return targets;
    }

    /**
     * Apply damage to a specific target (hero or creature)
     * @param {Object} targetData - Target data object
     * @returns {boolean} - Success status
     */
    applyDamageToTarget(targetData) {
        try {
            if (targetData.type === 'hero') {
                // Apply damage to hero
                this.battleManager.authoritative_applyDamage({
                    target: targetData.target,
                    damage: this.damage,
                    newHp: Math.max(0, targetData.target.currentHp - this.damage),
                    died: (targetData.target.currentHp - this.damage) <= 0
                }, {
                    source: 'rain_of_arrows_spell',
                    spellName: this.spellName
                });
                return true;
            } else if (targetData.type === 'creature') {
                // Apply damage to creature
                this.battleManager.authoritative_applyDamageToCreature({
                    hero: targetData.hero,
                    creature: targetData.target,
                    creatureIndex: targetData.creatureIndex,
                    damage: this.damage,
                    position: targetData.position,
                    side: targetData.side
                }, {
                    source: 'rain_of_arrows_spell',
                    spellName: this.spellName
                });
                return true;
            }
        } catch (error) {
            console.error('Error applying Rain of Arrows damage:', error);
        }
        return false;
    }

    /**
     * Create the chaotic arrow rain animation
     */
    async createArrowRainAnimation() {
        // Ensure CSS exists
        this.ensureArrowRainCSS();

        // Create container for arrows
        const arrowContainer = document.createElement('div');
        arrowContainer.className = 'rain-of-arrows-container';
        arrowContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 1000;
            overflow: hidden;
        `;
        document.body.appendChild(arrowContainer);

        // Create many arrows with random timing and positions
        const arrowCount = 45; // Dozens of arrows
        const arrows = [];

        for (let i = 0; i < arrowCount; i++) {
            // Stagger arrow creation over time for chaotic effect
            setTimeout(() => {
                const arrow = this.createSingleArrow();
                arrowContainer.appendChild(arrow);
                arrows.push(arrow);
            }, Math.random() * 200); // Random delay up to 200ms (3x faster)
        }

        // Clean up after animation completes
        const totalAnimationTime = this.battleManager.getSpeedAdjustedDelay(670);
        setTimeout(() => {
            if (arrowContainer && arrowContainer.parentNode) {
                arrowContainer.remove();
            }
        }, totalAnimationTime);
    }

    /**
     * Create a single arrow element with random properties
     * @returns {HTMLElement} - Arrow element
     */
    createSingleArrow() {
        const arrow = document.createElement('div');
        arrow.className = 'rain-arrow';

        // Random horizontal position across entire screen
        const startX = Math.random() * window.innerWidth;
        
        // Random angle for more chaos (-15 to +15 degrees from vertical)
        const angle = (Math.random() - 0.5) * 30;
        
        // Random size variation
        const scale = 0.7 + Math.random() * 0.6; // 0.7x to 1.3x size
        
        // Random fall duration for more chaos
        const duration = 270 + Math.random() * 200; // 270ms to 470ms (3x faster)
        const adjustedDuration = this.battleManager.getSpeedAdjustedDelay(duration);

        arrow.style.cssText = `
            position: absolute;
            left: ${startX}px;
            top: -50px;
            width: 4px;
            height: 25px;
            background: linear-gradient(to bottom, #8B4513, #D2691E, #8B4513);
            transform: rotate(${angle}deg) scale(${scale});
            transform-origin: center bottom;
            border-radius: 0 0 2px 2px;
            box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
            animation: arrowFall ${adjustedDuration}ms linear forwards;
            z-index: ${900 + Math.floor(Math.random() * 100)};
        `;

        // Add arrowhead
        const arrowhead = document.createElement('div');
        arrowhead.style.cssText = `
            position: absolute;
            top: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 3px solid transparent;
            border-right: 3px solid transparent;
            border-bottom: 8px solid #654321;
        `;
        arrow.appendChild(arrowhead);

        // Add fletching (feathers)
        const fletching = document.createElement('div');
        fletching.style.cssText = `
            position: absolute;
            bottom: 2px;
            left: 50%;
            transform: translateX(-50%);
            width: 8px;
            height: 4px;
            background: #8B0000;
            border-radius: 2px;
            opacity: 0.8;
        `;
        arrow.appendChild(fletching);

        return arrow;
    }

    /**
     * Get target sync information for network communication
     * @param {Object} target - Target object
     * @returns {Object} - Sync information
     */
    getTargetSyncInfo(target) {
        return {
            type: 'hero',
            absoluteSide: target.absoluteSide,
            position: target.position,
            name: target.name
        };
    }

    /**
     * Handle guest receiving Rain of Arrows effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, damagedTargets, damage } = data;
        
        // Find local attacker
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        
        if (localAttacker) {
            this.battleManager.addCombatLog(
                `🏹 ${localAttacker.name}'s Rain of Arrows darkens the sky!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );
        }

        // Start arrow rain animation (don't await)
        this.createArrowRainAnimation();

        // Wait for arrows to fall, then log damage
        await this.battleManager.delay(270);

        if (damagedTargets.length > 0) {
            const attackerSide = localAttacker ? localAttacker.side : 'opponent';
            this.battleManager.addCombatLog(
                `🎯 Rain of Arrows strikes ${damagedTargets.length} enemies for ${damage} damage each!`,
                attackerSide === 'player' ? 'success' : 'error'
            );
        }
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
        }
        
        return null;
    }

    /**
     * Ensure CSS for arrow rain animation exists
     */
    ensureArrowRainCSS() {
        if (document.getElementById('rainOfArrowsCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'rainOfArrowsCSS';
        style.textContent = `
            @keyframes arrowFall {
                0% {
                    transform: translateY(0) rotate(var(--arrow-angle, 0deg)) scale(var(--arrow-scale, 1));
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% {
                    transform: translateY(calc(100vh + 50px)) rotate(var(--arrow-angle, 0deg)) scale(var(--arrow-scale, 1));
                    opacity: 0;
                }
            }
            
            .rain-arrow {
                will-change: transform, opacity;
            }
            
            .rain-of-arrows-container {
                user-select: none;
                pointer-events: none;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('rainOfArrowsCSS');
        if (css) css.remove();
        
        // Remove any remaining arrow containers
        const containers = document.querySelectorAll('.rain-of-arrows-container');
        containers.forEach(container => container.remove());
        
        // Remove any stray arrows
        const arrows = document.querySelectorAll('.rain-arrow');
        arrows.forEach(arrow => arrow.remove());
    }
}

export default RainOfArrowsSpell;