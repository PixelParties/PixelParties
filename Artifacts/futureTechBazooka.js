// ./Artifacts/futureTechBazooka.js - Future Tech Bazooka Artifact Implementation
// Deals splash damage to other targets in the same position(s) as the initially hit target(s)
// Damage scales with FutureTechBazooka cards in graveyard (10 damage per card, capped at 100 per equipped Bazooka)

export class FutureTechBazookaEffect {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.name = 'FutureTechBazooka';
    }

    /**
     * Handle FutureTechBazooka effect when attack hits
     * @param {Object} attacker - The attacking hero
     * @param {Object} initialTarget - The initial target that was hit (hero or creature)
     * @param {number} damage - Damage dealt to initial target
     * @param {Object} equipmentItem - The FutureTechBazooka equipment item
     */
    async handleFutureTechBazookaEffect(attacker, initialTarget, damage, equipmentItem) {
        if (!this.battleManager.isAuthoritative) return;
        
        // Count FutureTechBazooka cards in the attacker's graveyard
        const bazookaCount = this.countBazookaInGraveyard(attacker);
        
        if (bazookaCount === 0) {
            return; // No bazookas in graveyard, no effect
        }

        // Count how many Bazookas the attacker has equipped
        const equippedBazookaCount = this.countEquippedBazookas(attacker);
        
        // Calculate splash damage: 10 per card in graveyard, capped at 100 per equipped Bazooka
        const damagePerCard = 10;
        const maxDamagePerBazooka = 100;
        const uncappedDamage = bazookaCount * damagePerCard;
        const splashDamage = Math.min(uncappedDamage, equippedBazookaCount * maxDamagePerBazooka);
        
        // Reconstruct target information from defender
        // The initialTarget here is just the defender (hero or creature), not a full target structure
        let targetSide, targetPosition, targetIsHero, targetHero, targetCreatureIndex;
        
        if (initialTarget.type === 'hero' || !initialTarget.type) {
            // It's a hero - should have side and position
            targetSide = initialTarget.side;
            targetPosition = initialTarget.position;
            targetIsHero = true;
            targetHero = initialTarget;
            targetCreatureIndex = null;
        } else {
            // It's a creature - need to find its owner hero
            targetSide = attacker.side === 'player' ? 'opponent' : 'player';
            const targetResult = this.findCreatureOwner(initialTarget, targetSide);
            
            if (!targetResult) {
                console.error('Could not find owner hero for creature in FutureTechBazooka');
                return;
            }
            
            targetPosition = targetResult.position;
            targetIsHero = false;
            targetHero = targetResult.hero;
            targetCreatureIndex = targetResult.creatureIndex;
        }
        
        if (!targetSide || !targetPosition) {
            console.error('Could not determine target side/position for FutureTechBazooka');
            return;
        }
        
        // Find all OTHER targets at the same position
        const splashTargets = this.findSplashTargets(attacker, initialTarget, targetSide, targetPosition, targetIsHero, targetCreatureIndex);
        
        if (splashTargets.length === 0) {
            // No additional targets to hit
            return;
        }

        // Reconstruct target structure for effects and serialization
        const targetStruct = {
            type: targetIsHero ? 'hero' : 'creature',
            hero: targetHero,
            position: targetPosition,
            side: targetSide
        };
        if (!targetIsHero) {
            targetStruct.creature = initialTarget;
            targetStruct.creatureIndex = targetCreatureIndex;
        }
        // Add combat log
        this.battleManager.addCombatLog(
            `💥 ${attacker.name}'s Future Tech Bazooka explodes! (${bazookaCount} cards → ${splashDamage} splash damage to ${splashTargets.length} target${splashTargets.length > 1 ? 's' : ''})`,
            attacker.side === 'player' ? 'success' : 'info'
        );

        // Create explosion effect at the initial target's position
        this.createExplosionEffect(targetStruct);

        // Apply damage to all splash targets simultaneously
        const damagePromises = splashTargets.map(target => 
            this.applySplashDamage(attacker, target, splashDamage)
        );
        
        // Wait for all damage to be applied
        await Promise.all(damagePromises);

        // Send network update to guest
        this.battleManager.sendBattleUpdate('future_tech_bazooka_splash', {
            attackerAbsoluteSide: attacker.absoluteSide,
            attackerPosition: attacker.position,
            attackerName: attacker.name,
            splashDamage: splashDamage,
            bazookaCount: bazookaCount,
            equippedBazookaCount: equippedBazookaCount,
            targetCount: splashTargets.length,
            initialTargetData: this.serializeTarget(targetStruct),
            splashTargetsData: splashTargets.map(t => this.serializeTarget(t)),
            timestamp: Date.now()
        });
    }

    /**
     * Find all OTHER targets at the same position as the initial target
     * @param {Object} attacker - The attacking hero
     * @param {Object} initialTarget - The initial target that was hit
     * @param {String} targetSide - Side to search for targets ('player' or 'opponent')
     * @param {String} targetPosition - Position to search ('left', 'center', 'right')
     * @returns {Array} Array of splash targets
     */
    findSplashTargets(attacker, initialTarget, targetSide, targetPosition, targetIsHero, targetCreatureIndex) {
        const splashTargets = [];
        
        // Get the hero array for the target side
        const heroes = targetSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const hero = heroes[targetPosition];
        if (!hero || !hero.alive) {
            return splashTargets;
        }


        // If initial target was the hero, add all living creatures as splash targets
        if (targetIsHero) {
            hero.creatures.forEach((creature, index) => {
                if (creature.alive) {
                    splashTargets.push({
                        type: 'creature',
                        hero: hero,
                        creature: creature,
                        creatureIndex: index,
                        position: targetPosition,
                        side: targetSide
                    });
                }
            });
        } else {
            // Initial target was a creature, so we need to hit:
            // 1. The hero (if alive)
            // 2. All OTHER creatures (if alive)
            
            // Add hero as splash target
            if (hero.alive) {
                splashTargets.push({
                    type: 'hero',
                    hero: hero,
                    position: targetPosition,
                    side: targetSide
                });
            }
            
            // Add all OTHER creatures
            hero.creatures.forEach((creature, index) => {
                if (creature.alive && index !== targetCreatureIndex) {
                    splashTargets.push({
                        type: 'creature',
                        hero: hero,
                        creature: creature,
                        creatureIndex: index,
                        position: targetPosition,
                        side: targetSide
                    });
                }
            });
        }

        return splashTargets;
    }

    /**
     * Apply splash damage to a target
     * @param {Object} attacker - The attacking hero
     * @param {Object} target - The splash target
     * @param {number} damage - Splash damage amount
     */
    async applySplashDamage(attacker, target, damage) {
        if (target.type === 'creature') {
            // Apply damage to creature
            await this.battleManager.combatManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: target.position,
                side: target.side
            }, {
                source: 'artifact_splash',
                attacker: attacker,
                aoe: true,
                preventRevival: false
            });
        } else {
            // Apply damage to hero
            await this.battleManager.combatManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'artifact_splash',
                attacker: attacker
            });

            // Handle hero death if needed
            if (target.hero.currentHp <= 0 && target.hero.alive) {
                this.battleManager.handleHeroDeath(target.hero);
                
                if (this.battleManager.isAuthoritative) {
                    this.battleManager.killTracker.recordKill(attacker, target.hero, 'hero');
                }
            }
        }
    }

    /**
     * Count FutureTechBazooka cards in the attacker's graveyard
     * @param {Object} attacker - The attacking hero
     * @returns {number} Number of FutureTechBazooka cards in graveyard
     */
    countBazookaInGraveyard(attacker) {
        // Determine which graveyard to check based on attacker's side
        let graveyard;
        
        if (attacker.side === 'player') {
            graveyard = this.battleManager.getPlayerGraveyard();
        } else {
            graveyard = this.battleManager.getOpponentGraveyard();
        }

        if (!graveyard || !Array.isArray(graveyard)) {
            return 0;
        }

        // Count occurrences of "FutureTechBazooka" in the graveyard
        return graveyard.filter(cardName => cardName === 'FutureTechBazooka').length;
    }

    /**
     * Count how many FutureTechBazooka items are equipped on the attacker
     * @param {Object} attacker - The attacking hero
     * @returns {number} Number of FutureTechBazooka items equipped
     */
    countEquippedBazookas(attacker) {
        if (!attacker.equipment || !Array.isArray(attacker.equipment)) {
            return 0;
        }

        return attacker.equipment.filter(item => {
            const itemName = item.name || item.cardName;
            return itemName === 'FutureTechBazooka';
        }).length;
    }

    /**
     * Find which hero owns a creature
     * @param {Object} creature - The creature to find owner for
     * @param {String} side - Side to search ('player' or 'opponent')
     * @returns {Object|null} Object with hero, position, and creatureIndex, or null if not found
     */
    findCreatureOwner(creature, side) {
        const heroes = side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        for (const position of ['left', 'center', 'right']) {
            const hero = heroes[position];
            if (!hero || !hero.creatures) continue;
            
            const creatureIndex = hero.creatures.indexOf(creature);
            if (creatureIndex !== -1) {
                return {
                    hero: hero,
                    position: position,
                    creatureIndex: creatureIndex
                };
            }
        }
        
        return null;
    }

    /**
     * Create explosion visual effect
     * @param {Object} target - Target where explosion occurs
     */
    createExplosionEffect(target) {
        let targetElement;
        
        if (target.type === 'creature') {
            // Find creature element using querySelector
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        } else {
            // Find hero element using querySelector
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .battle-hero-card`
            );
        }
        
        if (!targetElement) {
            console.warn('💥 Could not find target element for bazooka explosion');
            return;
        }

        // Create explosion burst
        const explosionBurst = document.createElement('div');
        explosionBurst.className = 'bazooka-explosion-burst';

        // Create explosion particles
        const particleCount = 16;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'bazooka-explosion-particle';
            particle.innerHTML = '💥';

            const angle = (360 / particleCount) * i;
            const distance = 60 + Math.random() * 30;

            particle.style.cssText = `
                position: absolute;
                font-size: ${16 + Math.random() * 8}px;
                animation: bazookaExplosion ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 700;
                text-shadow: 0 0 10px #ff6600, 0 0 20px #ff3300;
            `;

            explosionBurst.appendChild(particle);
        }

        // Position at target center
        explosionBurst.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 700;
        `;

        targetElement.appendChild(explosionBurst);

        // Create shockwave
        const shockwave = document.createElement('div');
        shockwave.className = 'bazooka-shockwave';
        shockwave.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255, 102, 0, 0.5) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 690;
            animation: bazookaShockwave ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
        `;

        targetElement.appendChild(shockwave);

        // Clean up after animation
        setTimeout(() => {
            if (explosionBurst.parentNode) explosionBurst.remove();
            if (shockwave.parentNode) shockwave.remove();
        }, this.battleManager.getSpeedAdjustedDelay(1000));
    }

    /**
     * Serialize target data for network transmission
     * @param {Object} target - Target to serialize
     * @returns {Object} Serialized target data
     */
    serializeTarget(target) {
        // Convert local side to absolute side for network transmission
        const absoluteSide = target.side === 'player' ? 
            (this.battleManager.isHost ? 'host' : 'guest') :
            (this.battleManager.isHost ? 'guest' : 'host');
        
        if (target.type === 'creature') {
            return {
                type: 'creature',
                heroPosition: target.position,
                creatureIndex: target.creatureIndex,
                creatureName: target.creature.name,
                absoluteSide: absoluteSide
            };
        } else {
            return {
                type: 'hero',
                heroPosition: target.position,
                heroName: target.hero.name,
                absoluteSide: absoluteSide
            };
        }
    }

    /**
     * Handle guest receiving bazooka splash effect
     * @param {Object} data - Splash data from host
     */
    handleGuestBazookaSplash(data) {
        if (this.battleManager.isAuthoritative) return;

        const {
            attackerAbsoluteSide, attackerPosition, attackerName,
            splashDamage, bazookaCount, equippedBazookaCount,
            targetCount, initialTargetData, splashTargetsData
        } = data;

        // Determine local side for guest
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const attackerLocalSide = (attackerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';

        // Add to combat log
        const logType = attackerLocalSide === 'player' ? 'success' : 'info';
        this.battleManager.addCombatLog(
            `💥 ${attackerName}'s Future Tech Bazooka explodes! (${bazookaCount} cards → ${splashDamage} splash damage to ${targetCount} target${targetCount > 1 ? 's' : ''})`,
            logType
        );

        // Recreate the initial target for visual effect
        const initialTarget = this.deserializeTarget(initialTargetData, myAbsoluteSide);
        if (initialTarget) {
            this.createExplosionEffect(initialTarget);
        }

        // Damage is already applied by host and synced via state updates
        // We just need to show the visual effects on the guest side
        console.log(`💥 Guest received bazooka splash: ${attackerName} dealt ${splashDamage} to ${targetCount} targets`);
    }

    /**
     * Deserialize target data from network
     * @param {Object} targetData - Serialized target data
     * @param {String} myAbsoluteSide - Guest's absolute side ('host' or 'guest')
     * @returns {Object|null} Deserialized target
     */
    deserializeTarget(targetData, myAbsoluteSide) {
        // Convert absolute side to local side
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const heroes = targetLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const hero = heroes[targetData.heroPosition];
        if (!hero) {
            console.warn('💥 Could not find hero for explosion effect:', targetData);
            return null;
        }

        if (targetData.type === 'creature') {
            const creature = hero.creatures[targetData.creatureIndex];
            if (!creature) {
                console.warn('💥 Could not find creature for explosion effect:', targetData);
                return null;
            }
            
            return {
                type: 'creature',
                hero: hero,
                creature: creature,
                creatureIndex: targetData.creatureIndex,
                position: targetData.heroPosition,
                side: targetLocalSide
            };
        } else {
            return {
                type: 'hero',
                hero: hero,
                position: targetData.heroPosition,
                side: targetLocalSide
            };
        }
    }

    /**
     * Inject CSS for bazooka explosion animations
     */
    static injectBazookaCSS() {
        if (document.getElementById('futureTechBazookaStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'futureTechBazookaStyles';
        style.textContent = `
            /* Future Tech Bazooka Explosion Effects */
            .bazooka-explosion-burst {
                will-change: transform, opacity;
            }

            .bazooka-explosion-particle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: center;
                will-change: transform, opacity;
                filter: drop-shadow(0 0 8px rgba(255, 102, 0, 0.9));
            }

            .bazooka-shockwave {
                will-change: transform, opacity;
                mix-blend-mode: screen;
            }

            /* Animation Keyframes */
            @keyframes bazookaExplosion {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.5) rotate(90deg);
                }
                60% {
                    opacity: 0.8;
                    transform: translate(
                        calc(-50% + var(--distance) * cos(var(--angle))),
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) scale(0.8) rotate(180deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(
                        calc(-50% + var(--distance) * cos(var(--angle))),
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) scale(0.2) rotate(270deg);
                }
            }

            @keyframes bazookaShockwave {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                40% {
                    opacity: 0.7;
                    transform: translate(-50%, -50%) scale(2);
                    background: radial-gradient(circle, rgba(255, 102, 0, 0.7) 0%, transparent 70%);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(3.5);
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Initialize the artifact (inject CSS)
     */
    init() {
        FutureTechBazookaEffect.injectBazookaCSS();
    }

    /**
     * Cleanup
     */
    cleanup() {
        const css = document.getElementById('futureTechBazookaStyles');
        if (css) css.remove();
    }
}

// Export as default for flexibility
export default FutureTechBazookaEffect;