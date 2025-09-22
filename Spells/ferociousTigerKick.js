// ferociousTigerKick.js - Ferocious Tiger Kick Fighting Spell Implementation

export class FerociousTigerKickSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'FerociousTigerKick';
    }

    /**
     * Calculate the trigger chance for this spell based on graveyard cards
     * @param {Object} attacker - The hero who attacked
     * @returns {number} - Trigger chance (0-1)
     */
    getTriggerChance(attacker) {
        // Get graveyard for this hero's side
        const graveyard = this.battleManager.getGraveyardBySide(attacker.side);
        
        // Count BlowOfTheVenomSnake and StrongOxHeadbutt in graveyard
        let graveyardBonus = 0;
        if (graveyard && graveyard.length > 0) {
            const venomSnakes = graveyard.filter(card => card === 'BlowOfTheVenomSnake').length;
            const oxHeadbutts = graveyard.filter(card => card === 'StrongOxHeadbutt').length;
            graveyardBonus = venomSnakes + oxHeadbutts;
        }
        
        // Calculate chance: 1-0.9^(X+1) where X is graveyard bonus
        // This gives base 10% (X=0) scaling up to 19%, 27%, etc.
        const chance = 1 - Math.pow(0.9, graveyardBonus + 1);
        
        return Math.min(chance, 1.0); // Cap at 100%
    }

    /**
     * Execute Ferocious Tiger Kick effect after a successful attack
     * @param {Object} attacker - The hero who attacked
     * @param {Object} target - The target that was attacked (hero or creature)
     * @param {number} attackDamage - The damage that was dealt
     * @returns {Promise} - Animation completion promise
     */
    async executeEffect(attacker, target, attackDamage) {
        // Calculate healing: half of actual damage dealt, rounded up
        const healingAmount = Math.ceil(attackDamage / 2);
        
        if (healingAmount <= 0) {
            // No healing to apply, just show visual effect
            this.battleManager.addCombatLog(
                `🐅 ${attacker.name}'s Ferocious Tiger Kick strikes but provides no healing!`,
                attacker.side === 'player' ? 'success' : 'error'
            );
        } else {
            // Apply healing to attacker
            const oldHp = attacker.currentHp;
            const healResult = attacker.heal(healingAmount);
            const actualHealing = healResult.newHp - oldHp;
            
            if (actualHealing > 0) {
                // Update health bar
                this.battleManager.updateHeroHealthBar(attacker.side, attacker.position, attacker.currentHp, attacker.maxHp);
                
                // Add combat log
                this.battleManager.addCombatLog(
                    `🐅 ${attacker.name}'s Ferocious Tiger Kick heals for ${actualHealing} HP! (${attackDamage} dmg ÷ 2 = ${healingAmount})`,
                    attacker.side === 'player' ? 'success' : 'error'
                );
                
                // Add HP bar message for battle log
                if (this.battleManager.battleScreen && this.battleManager.battleScreen.battleLog) {
                    this.battleManager.battleScreen.battleLog.addHpBarMessage(attacker, attacker.currentHp, attacker.maxHp);
                }
            } else {
                this.battleManager.addCombatLog(
                    `🐅 ${attacker.name}'s Ferocious Tiger Kick strikes but ${attacker.name} is already at full health!`,
                    attacker.side === 'player' ? 'success' : 'error'
                );
            }
        }

        // Create visual effect immediately (don't await - let it run in background)
        this.createTigerKickEffect(attacker);

        // Sync to guest if we're the host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('ferocious_tiger_kick_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                targetInfo: this.getTargetSyncInfo(target),
                attackDamage: attackDamage,
                healingAmount: healingAmount,
                actualHealing: attacker.currentHp - (attacker.currentHp - healingAmount > attacker.maxHp ? attacker.maxHp : attacker.currentHp - healingAmount),
                newHp: attacker.currentHp,
                maxHp: attacker.maxHp,
                timestamp: Date.now()
            });
        }

        // Don't await the visual effect - return immediately so battle flow continues
    }

    /**
     * Create the tiger kick effect (tiger on attacker with blood particles)
     * @param {Object} attacker - The attacking hero
     * @returns {Promise} - Animation completion promise (but we don't await this)
     */
    async createTigerKickEffect(attacker) {
        const attackerElement = this.battleManager.getHeroElement(attacker.side, attacker.position);
        
        if (!attackerElement) {
            console.warn('Could not find element for Ferocious Tiger Kick effect');
            return;
        }

        // Ensure CSS exists before creating effects
        this.ensureTigerKickEffectCSS();

        // Create main tiger effect on attacker
        this.createTigerOnAttacker(attackerElement);
        
        // Create blood particles (delayed slightly)
        setTimeout(() => {
            this.createBloodParticles(attackerElement);
        }, this.battleManager.getSpeedAdjustedDelay(300));
    }

    /**
     * Create tiger animation on the attacker
     * @param {HTMLElement} attackerElement - Attacker's DOM element
     */
    createTigerOnAttacker(attackerElement) {
        const tiger = document.createElement('div');
        tiger.className = 'ferocious-tiger-kick';
        tiger.innerHTML = '🐅';
        
        tiger.style.cssText = `
            position: absolute;
            left: 50%;
            top: 30%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            pointer-events: none;
            z-index: 300;
            animation: tigerKickStrike ${this.battleManager.getSpeedAdjustedDelay(1200)}ms ease-out forwards;
        `;
        
        attackerElement.appendChild(tiger);
        
        // Clean up after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(1200);
        setTimeout(() => {
            if (tiger && tiger.parentNode) {
                tiger.remove();
            }
        }, animationDuration);
    }

    /**
     * Create blood particle effects on the attacker
     * @param {HTMLElement} attackerElement - Attacker's DOM element
     */
    createBloodParticles(attackerElement) {
        // Create multiple blood particles
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.createBloodParticle(attackerElement, i);
            }, this.battleManager.getSpeedAdjustedDelay(i * 50));
        }
    }

    /**
     * Create individual blood particle
     * @param {HTMLElement} attackerElement - Attacker's DOM element
     * @param {number} index - Particle index for positioning variation
     */
    createBloodParticle(attackerElement, index) {
        const particle = document.createElement('div');
        particle.className = 'tiger-kick-blood-particle';
        particle.innerHTML = '🩸';
        
        const angle = (index * 45) + (Math.random() * 30 - 15); // 45° apart with variation
        const distance = 25 + Math.random() * 20;
        
        particle.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: ${12 + Math.random() * 8}px;
            z-index: 299;
            pointer-events: none;
            animation: bloodParticleFly ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
            --angle: ${angle}deg;
            --distance: ${distance}px;
        `;
        
        attackerElement.appendChild(particle);
        
        // Remove after animation
        setTimeout(() => {
            if (particle && particle.parentNode) {
                particle.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(1000));
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
     * Handle guest receiving Ferocious Tiger Kick effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, targetInfo, attackDamage, healingAmount, actualHealing, newHp, maxHp } = data;
        
        // Find local attacker
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        
        if (!localAttacker) {
            console.warn('Could not find local attacker for Ferocious Tiger Kick effect');
            return;
        }

        // Update attacker's HP
        localAttacker.currentHp = newHp;
        
        // Update health bar
        this.battleManager.updateHeroHealthBar(localAttacker.side, localAttacker.position, newHp, maxHp);
        
        // Log the effect
        if (actualHealing > 0) {
            this.battleManager.addCombatLog(
                `🐅 ${localAttacker.name}'s Ferocious Tiger Kick heals for ${actualHealing} HP! (${attackDamage} dmg ÷ 2 = ${healingAmount})`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );
            
            // Add HP bar message for battle log
            if (this.battleManager.battleScreen && this.battleManager.battleScreen.battleLog) {
                this.battleManager.battleScreen.battleLog.addHpBarMessage(localAttacker, localAttacker.currentHp, localAttacker.maxHp);
            }
        } else if (healingAmount > 0) {
            this.battleManager.addCombatLog(
                `🐅 ${localAttacker.name}'s Ferocious Tiger Kick strikes but ${localAttacker.name} is already at full health!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );
        } else {
            this.battleManager.addCombatLog(
                `🐅 ${localAttacker.name}'s Ferocious Tiger Kick strikes but provides no healing!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );
        }

        // Create visual effect (don't await)
        this.createTigerKickEffect(localAttacker);
    }

    /**
     * Find target from sync information
     * @param {Object} targetInfo - Target sync info
     * @returns {Object|null} - Target object or null
     */
    findTargetFromSyncInfo(targetInfo) {
        if (!targetInfo) return null;
        
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
     * Ensure CSS for tiger kick effect exists
     */
    ensureTigerKickEffectCSS() {
        if (document.getElementById('tigerKickCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'tigerKickCSS';
        style.textContent = `
            @keyframes tigerKickStrike {
                0% {
                    transform: translate(-50%, -50%) scale(0.3) rotate(-15deg);
                    opacity: 0;
                    filter: drop-shadow(0 0 20px rgba(255, 140, 0, 0));
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.4) rotate(8deg);
                    opacity: 1;
                    filter: drop-shadow(0 0 30px rgba(255, 140, 0, 0.9));
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.1) rotate(-5deg);
                    opacity: 1;
                    filter: drop-shadow(0 0 25px rgba(255, 69, 0, 0.8));
                }
                75% {
                    transform: translate(-50%, -50%) scale(1.2) rotate(3deg);
                    opacity: 1;
                    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.7));
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
                    opacity: 0;
                    filter: drop-shadow(0 0 10px rgba(255, 140, 0, 0));
                }
            }
            
            @keyframes bloodParticleFly {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0);
                }
                100% {
                    opacity: 0;
                    transform: 
                        translate(
                            calc(-50% + var(--distance) * cos(var(--angle))),
                            calc(-50% + var(--distance) * sin(var(--angle)))
                        )
                        scale(0.3);
                }
            }
            
            .ferocious-tiger-kick {
                will-change: transform, opacity;
                text-shadow: 
                    0 0 20px rgba(255, 140, 0, 0.8),
                    0 0 40px rgba(255, 69, 0, 0.6),
                    0 0 60px rgba(255, 215, 0, 0.4);
            }
            
            .tiger-kick-blood-particle {
                will-change: transform, opacity;
                font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('tigerKickCSS');
        if (css) css.remove();
        
        // Remove any remaining effects
        const tigerEffects = document.querySelectorAll('.ferocious-tiger-kick, .tiger-kick-blood-particle');
        tigerEffects.forEach(effect => effect.remove());
    }
}

export default FerociousTigerKickSpell;