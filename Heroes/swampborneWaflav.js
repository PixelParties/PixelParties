// swampborneWaflav.js - SwampborneWaflav Hero Battle Effects System
// Applies poison retaliation when hit by physical attacks
// Awards evolution counters when new targets are first poisoned

export class SwampborneWaflavHeroEffect {
    constructor(battleManager) {
        this.battleManager = battleManager;
    }

    // Initialize SwampborneWaflav effect system
    static init(battleManager) {
        if (!battleManager.swampborneWaflavEffect) {
            battleManager.swampborneWaflavEffect = new SwampborneWaflavHeroEffect(battleManager);
        }
        return battleManager.swampborneWaflavEffect;
    }

    // Check for SwampborneWaflav poison retaliation when taking damage
    static checkSwampborneRetaliation(target, attacker, damage, context, battleManager) {
        if (!battleManager.swampborneWaflavEffect) return;
        battleManager.swampborneWaflavEffect.processRetaliation(target, attacker, damage, context);
    }

    // Check for evolution counter award when poison is applied
    static checkPoisonEvolutionCounter(target, effectName, stacks, battleManager) {
        if (!battleManager.swampborneWaflavEffect) return;
        return battleManager.swampborneWaflavEffect.processPoisonCounter(target, effectName, stacks);
    }

    // Process retaliation when SwampborneWaflav takes physical attack damage
    processRetaliation(target, attacker, damage, context) {
        // Only process if target is SwampborneWaflav and alive
        if (!target || target.name !== 'SwampborneWaflav' || !target.alive) {
            return;
        }

        // Only retaliate against physical attack damage
        if (!this.isPhysicalAttackDamage(context)) {
            return;
        }

        // Only retaliate if attacker exists and is alive
        if (!attacker || !attacker.alive) {
            return;
        }

        // Apply poison retaliation
        if (this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.applyStatusEffect(attacker, 'poisoned', 1);
            
            // Create poison animation on the attacker
            this.createPoisonRetaliationAnimation(attacker);
            
            // Log the retaliation
            const attackerName = attacker.name || 'Unknown';
            this.battleManager.addCombatLog(
                `🐍 ${target.name}'s toxic nature poisons ${attackerName} in retaliation!`,
                target.side === 'player' ? 'success' : 'info'
            );

            // Sync to guest
            if (this.battleManager.isAuthoritative) {
                this.syncPoisonRetaliation(target, attacker);
            }
        }
    }

    // Process evolution counter award when poison is first applied to a target
    processPoisonCounter(target, effectName, stacks) {
        // Only process poison effects
        if (effectName !== 'poisoned') {
            return false; // Don't block the poison application
        }

        // Check if target already has poison (this is called BEFORE applying)
        const alreadyPoisoned = this.battleManager.statusEffectsManager.hasStatusEffect(target, 'poisoned');
        
        // If target is already poisoned, don't award counter
        if (alreadyPoisoned) {
            return false; // Don't block the poison application
        }

        // This is a new poison application - check for SwampborneWaflav evolution counter award
        this.awardEvolutionCounterForNewPoison(target);

        return false; // Don't block the poison application
    }

    // Award evolution counter when a new target gets poisoned
    awardEvolutionCounterForNewPoison(target) {
        // Find all SwampborneWaflav heroes on both sides
        const swampborneHeroes = this.findAllSwampborneWaflavHeroes();

        for (const swampborneData of swampborneHeroes) {
            const { hero, side } = swampborneData;
            
            // Award evolution counter to the controlling player
            const counters = side === 'player' ? this.battleManager.playerCounters : this.battleManager.opponentCounters;
            if (counters) {
                const oldCount = counters.evolutionCounters || 1;
                counters.evolutionCounters = oldCount + 1;

                // Create reward animation
                this.createEvolutionCounterAnimation(hero, side);

                // Log the counter gain
                const heroName = side === 'player' ? 'your SwampborneWaflav' : 'enemy SwampborneWaflav';
                this.battleManager.addCombatLog(
                    `🧪 ${heroName} gains +1 Evolution Counter from spreading poison! (${oldCount} → ${counters.evolutionCounters})`,
                    side === 'player' ? 'success' : 'error'
                );

                // Sync to guest
                if (this.battleManager.isAuthoritative) {
                    this.syncEvolutionCounterGain(side, counters.evolutionCounters);
                }
            }
        }
    }

    // Check if damage is from a physical attack
    isPhysicalAttackDamage(context) {
        if (!context || !this.battleManager.damageSourceManager) {
            return false;
        }

        // Use damage source manager to check if this is physical damage
        const isPhysical = this.battleManager.damageSourceManager.isPhysicalDamage(context);
        
        // Must be physical AND from an attack source
        return isPhysical && context.source === 'attack';
    }

    // Find all living SwampborneWaflav heroes
    findAllSwampborneWaflavHeroes() {
        const swampborneHeroes = [];

        // Check player heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.battleManager.playerHeroes[position];
            if (hero && hero.alive && hero.name === 'SwampborneWaflav') {
                swampborneHeroes.push({ hero, side: 'player', position });
            }
        });

        // Check opponent heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.battleManager.opponentHeroes[position];
            if (hero && hero.alive && hero.name === 'SwampborneWaflav') {
                swampborneHeroes.push({ hero, side: 'opponent', position });
            }
        });

        return swampborneHeroes;
    }

    // Create poison retaliation animation
    createPoisonRetaliationAnimation(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        // Create swamp bubbles effect
        const swampEffect = document.createElement('div');
        swampEffect.className = 'swampborne-poison-retaliation';
        swampEffect.innerHTML = '🐍💨';
        
        swampEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 32px;
            z-index: 350;
            pointer-events: none;
            animation: swampPoisonBurst 1500ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(0, 128, 0, 0.9),
                0 0 30px rgba(0, 128, 0, 0.6);
        `;
        
        targetElement.appendChild(swampEffect);

        // Create poison bubbles
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createPoisonBubble(targetElement, i);
            }, i * 200);
        }
        
        setTimeout(() => {
            if (swampEffect && swampEffect.parentNode) {
                swampEffect.remove();
            }
        }, 1500);
    }

    // Create individual poison bubble
    createPoisonBubble(targetElement, index) {
        const bubble = document.createElement('div');
        bubble.className = 'poison-bubble';
        bubble.innerHTML = '💨';
        
        const angle = (index * 120) + (Math.random() * 60 - 30);
        const distance = 25 + Math.random() * 15;
        
        bubble.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 16px;
            z-index: 351;
            pointer-events: none;
            opacity: 0;
            animation: poisonBubbleFloat 1000ms ease-out forwards;
            --bubble-angle: ${angle}deg;
            --bubble-distance: ${distance}px;
        `;
        
        targetElement.appendChild(bubble);
        
        setTimeout(() => {
            if (bubble && bubble.parentNode) {
                bubble.remove();
            }
        }, 1000);
    }

    // Create evolution counter gain animation
    createEvolutionCounterAnimation(hero, side) {
        const heroElement = this.battleManager.getHeroElement(side, hero.position);
        if (!heroElement) return;

        const counterEffect = document.createElement('div');
        counterEffect.className = 'swampborne-evolution-counter';
        counterEffect.innerHTML = '🧪+1';
        
        counterEffect.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 20px;
            z-index: 400;
            pointer-events: none;
            animation: evolutionCounterFloat 2000ms ease-out forwards;
            text-shadow: 
                0 0 10px rgba(0, 255, 100, 0.9),
                0 0 20px rgba(0, 255, 100, 0.6);
        `;
        
        heroElement.appendChild(counterEffect);
        
        setTimeout(() => {
            if (counterEffect && counterEffect.parentNode) {
                counterEffect.remove();
            }
        }, 2000);
    }

    // Get target element (hero or creature)
    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            return this.battleManager.getHeroElement(target.side, target.position);
        } else if (target.type === 'creature') {
            // Find creature element
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;

            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
        return null;
    }

    // Find creature information
    findCreatureInfo(creature) {
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

    // Sync poison retaliation to guest
    syncPoisonRetaliation(target, attacker) {
        if (!this.battleManager.sendBattleUpdate) return;

        this.battleManager.sendBattleUpdate('swampborne_poison_retaliation', {
            targetAbsoluteSide: target.absoluteSide,
            targetPosition: target.position,
            targetName: target.name,
            attackerInfo: this.getTargetSyncInfo(attacker),
            timestamp: Date.now()
        });
    }

    // Sync evolution counter gain to guest
    syncEvolutionCounterGain(side, newCounterTotal) {
        if (!this.battleManager.sendBattleUpdate) return;

        const absoluteSide = (side === 'player') ? 
            (this.battleManager.isHost ? 'host' : 'guest') : 
            (this.battleManager.isHost ? 'guest' : 'host');

        this.battleManager.sendBattleUpdate('swampborne_evolution_counter_gained', {
            targetAbsoluteSide: absoluteSide,
            newCounterTotal: newCounterTotal,
            timestamp: Date.now()
        });
    }

    // Get target sync info
    getTargetSyncInfo(target) {
        if (target.type === 'hero' || !target.type) {
            return {
                type: 'hero',
                absoluteSide: target.absoluteSide,
                position: target.position,
                name: target.name
            };
        } else if (target.type === 'creature') {
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
        return null;
    }

    // Handle guest receiving poison retaliation
    static handleGuestPoisonRetaliation(data, battleManager) {
        if (!data || !battleManager || battleManager.isAuthoritative) {
            return;
        }

        const { targetAbsoluteSide, targetPosition, targetName, attackerInfo } = data;
        
        // Determine local sides for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';

        // Find the attacker for visual effect
        const attacker = battleManager.swampborneWaflavEffect.findTargetFromSyncInfo(attackerInfo);
        if (attacker && battleManager.swampborneWaflavEffect) {
            battleManager.swampborneWaflavEffect.createPoisonRetaliationAnimation(attacker);
        }

        // Add to combat log
        const logType = targetLocalSide === 'player' ? 'success' : 'info';
        battleManager.addCombatLog(
            `🐍 ${targetName}'s toxic nature poisons ${attackerInfo?.name || 'Unknown'} in retaliation!`,
            logType
        );
    }

    // Handle guest receiving evolution counter gain
    static handleGuestEvolutionCounterGained(data, battleManager) {
        if (!data || !battleManager || battleManager.isAuthoritative) {
            return;
        }

        const { targetAbsoluteSide, newCounterTotal } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const heroLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const isMyCounter = (targetAbsoluteSide === myAbsoluteSide);

        // Update the appropriate counter on guest side
        if (isMyCounter) {
            battleManager.playerCounters.evolutionCounters = newCounterTotal;
        } else {
            battleManager.opponentCounters.evolutionCounters = newCounterTotal;
        }

        // Find SwampborneWaflav hero for animation
        const heroes = heroLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        let swampborneHero = null;
        let swampbornePosition = null;

        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && hero.name === 'SwampborneWaflav') {
                swampborneHero = hero;
                swampbornePosition = position;
            }
        });

        if (swampborneHero && battleManager.swampborneWaflavEffect) {
            battleManager.swampborneWaflavEffect.createEvolutionCounterAnimation(swampborneHero, heroLocalSide);
        }

        // Add to combat log
        const heroName = heroLocalSide === 'player' ? 'your SwampborneWaflav' : 'enemy SwampborneWaflav';
        const logType = heroLocalSide === 'player' ? 'success' : 'error';
        
        battleManager.addCombatLog(
            `🧪 ${heroName} gains +1 Evolution Counter from spreading poison! (Total: ${newCounterTotal})`,
            logType
        );
    }

    // Find target from sync info
    findTargetFromSyncInfo(targetInfo) {
        if (!targetInfo) return null;

        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetInfo.type === 'hero') {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            return heroes[targetInfo.position];
        } else if (targetInfo.type === 'creature') {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[targetInfo.position];
            return hero?.creatures?.[targetInfo.creatureIndex];
        }
        
        return null;
    }

    // Ensure animation styles are present
    static ensureSwampborneStyles() {
        if (document.getElementById('swampborneWaflavStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'swampborneWaflavStyles';
        style.textContent = `
            @keyframes swampPoisonBurst {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.3) rotate(120deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.8) rotate(360deg);
                }
            }

            @keyframes poisonBubbleFloat {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1) 
                              translateX(calc(cos(var(--bubble-angle)) * var(--bubble-distance)))
                              translateY(calc(sin(var(--bubble-angle)) * var(--bubble-distance)));
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.7)
                              translateX(calc(cos(var(--bubble-angle)) * var(--bubble-distance) * 1.5))
                              translateY(calc(sin(var(--bubble-angle)) * var(--bubble-distance) * 1.5));
                }
            }

            @keyframes evolutionCounterFloat {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.5) translateY(0);
                }
                30% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1.2) translateY(-10px);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) scale(1) translateY(-40px);
                }
            }
            
            .swampborne-poison-retaliation,
            .poison-bubble,
            .swampborne-evolution-counter {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Cleanup method
    cleanup() {
        // Clean up any ongoing effects
    }
}

// Ensure styles are loaded when module is imported
if (typeof document !== 'undefined') {
    SwampborneWaflavHeroEffect.ensureSwampborneStyles();
}

// Export for global access
if (typeof window !== 'undefined') {
    window.SwampborneWaflavHeroEffect = SwampborneWaflavHeroEffect;
}

export default SwampborneWaflavHeroEffect;