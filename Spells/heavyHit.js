// heavyHit.js - Fixed Heavy Hit Fighting Spell Implementation

export class HeavyHitSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'HeavyHit';
    }

    /**
     * Execute Heavy Hit effect after a successful attack
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
                `💥 ${attacker.name}'s Heavy Hit creates a dust cloud around the fallen ${target.name}!`,
                attacker.side === 'player' ? 'success' : 'error'
            );
        } else {
            // Target survived - apply full effect
            this.battleManager.addCombatLog(
                `💥 ${attacker.name}'s Heavy Hit staggers ${target.name}!`,
                attacker.side === 'player' ? 'success' : 'error'
            );

            // Apply stunned status effect immediately
            if (this.battleManager.statusEffectsManager) {
                this.battleManager.statusEffectsManager.applyStatusEffect(target, 'stunned', 1);
            }
        }

        // Create visual effect immediately (don't await - let it run in background)
        this.createDustCloudEffect(target);

        // Sync to guest if we're the host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('heavy_hit_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                targetInfo: this.getTargetSyncInfo(target),
                targetAlive: targetAlive,
                timestamp: Date.now()
            });
        }

        // Don't await the visual effect - return immediately so battle flow continues
    }

    /**
     * Create the dust cloud whirl effect around the target
     * @param {Object} target - The target to create effect around
     * @returns {Promise} - Animation completion promise (but we don't await this)
     */
    async createDustCloudEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) {
            console.warn('Could not find target element for Heavy Hit effect');
            return;
        }

        // Ensure CSS exists before creating particles
        this.ensureDustEffectCSS();

        // Create multiple dust particles immediately
        const dustParticles = [];
        const particleCount = 6; // Reduced for better performance
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.createDustParticle(i, particleCount);
            targetElement.appendChild(particle);
            dustParticles.push(particle);
        }

        // Clean up particles after animation (shorter duration)
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(600); // Reduced from 1000ms
        setTimeout(() => {
            dustParticles.forEach(particle => {
                if (particle && particle.parentNode) {
                    particle.remove();
                }
            });
        }, animationDuration);
    }

    /**
     * Create a single dust particle element
     * @param {number} index - Particle index
     * @param {number} total - Total number of particles
     * @returns {HTMLElement} - Dust particle element
     */
    createDustParticle(index, total) {
        const particle = document.createElement('div');
        particle.className = 'heavy-hit-dust-particle';
        
        // Calculate position around target in a circle
        const angle = (index / total) * 360;
        const radius = 35; // Slightly smaller radius
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        
        // Random size and proper dust color
        const size = 6 + Math.random() * 8; // Larger, more visible particles
        const opacity = 0.7 + Math.random() * 0.3;
        
        // More visible brown/tan dust colors
        const dustColors = [
            `rgba(160, 82, 45, ${opacity})`,   // Saddle brown
            `rgba(139, 69, 19, ${opacity})`,   // Saddle brown (darker)
            `rgba(205, 133, 63, ${opacity})`,  // Peru
            `rgba(222, 184, 135, ${opacity})`  // Burlywood
        ];
        const dustColor = dustColors[Math.floor(Math.random() * dustColors.length)];
        
        const animationDelay = (index * 30) + 'ms'; // Slightly faster stagger
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(500) + 'ms'; // Shorter animation
        
        particle.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            width: ${size}px;
            height: ${size}px;
            background: ${dustColor};
            border-radius: 50%;
            pointer-events: none;
            z-index: 300;
            transform: translate(-50%, -50%);
            animation: heavyHitDustWhirl ${animationDuration} ease-out ${animationDelay} forwards;
            box-shadow: 0 0 6px rgba(139, 69, 19, 0.6);
            border: 1px solid rgba(139, 69, 19, 0.3);
        `;
        
        return particle;
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
                console.warn('Could not find creature info for Heavy Hit target');
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
     * Handle guest receiving Heavy Hit effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, targetInfo, targetAlive } = data;
        
        // Find local targets
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        const localTarget = this.findTargetFromSyncInfo(targetInfo);
        
        if (!localAttacker || !localTarget) {
            console.warn('Could not find local targets for Heavy Hit effect');
            return;
        }

        // Log the effect
        if (targetAlive) {
            this.battleManager.addCombatLog(
                `💥 ${localAttacker.name}'s Heavy Hit staggers ${localTarget.name}!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );

            // Apply status effect only if target was alive
            if (this.battleManager.statusEffectsManager) {
                this.battleManager.statusEffectsManager.applyStatusEffect(localTarget, 'stunned', 1);
            }
        } else {
            this.battleManager.addCombatLog(
                `💥 ${localAttacker.name}'s Heavy Hit creates a dust cloud around the fallen ${localTarget.name}!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );
        }

        // Create visual effect (don't await)
        this.createDustCloudEffect(localTarget);
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
     * Ensure CSS for dust effect exists
     */
    ensureDustEffectCSS() {
        if (document.getElementById('heavyHitDustCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'heavyHitDustCSS';
        style.textContent = `
            @keyframes heavyHitDustWhirl {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 0;
                }
                15% {
                    transform: translate(-50%, -50%) scale(1.2) rotate(60deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.0) rotate(180deg);
                    opacity: 0.9;
                }
                85% {
                    transform: translate(-50%, -50%) scale(0.8) rotate(300deg);
                    opacity: 0.6;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.3) rotate(360deg);
                    opacity: 0;
                }
            }
            
            .heavy-hit-dust-particle {
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
        const css = document.getElementById('heavyHitDustCSS');
        if (css) css.remove();
        
        // Remove any remaining particles
        const particles = document.querySelectorAll('.heavy-hit-dust-particle');
        particles.forEach(particle => particle.remove());
    }
}

export default HeavyHitSpell;