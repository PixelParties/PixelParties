// ./Creatures/3HeadedGiant.js - 3HeadedGiant Creature Special Attack Module

export class ThreeHeadedGiantCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        // 3HeadedGiant stats
        this.DAMAGE_PER_TARGET = 100;
        this.MAX_TARGETS = 3;
        this.IMPACT_DELAY = 200; // Delay between consecutive impacts
        
        // Inject CSS styles
        this.injectThreeHeadedGiantStyles();
        
        console.log('💥 3HeadedGiant Creature module initialized');
    }

    // Check if a creature is 3HeadedGiant
    static isThreeHeadedGiant(creatureName) {
        return creatureName === '3HeadedGiant';
    }

    // Execute 3HeadedGiant special attack with consecutive impact animations
    async executeSpecialAttack(giantActor, position) {
        // Guest side: Show charging animation and return early
        if (!this.battleManager.isAuthoritative) {
            const giantElement = this.getGiantElement(giantActor.hero.side, position, giantActor.index);
            if (giantElement) {
                // Add charging effect for guest visual feedback
                giantElement.classList.add('giant-charging');
                
                // Brief charging animation
                await this.battleManager.delay(300);
                
                // Remove charging effect
                giantElement.classList.remove('giant-charging');
            }
            return;
        }

        const giantCreature = giantActor.data;
        const giantHero = giantActor.hero;
        const attackerSide = giantHero.side;
        
        // Safety check: ensure 3HeadedGiant is still alive
        if (!giantCreature.alive || giantCreature.currentHp <= 0) {
            console.log(`3HeadedGiant is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `💥 ${giantCreature.name} prepares to unleash devastating blows with all three heads!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find all possible enemy targets
        const enemyTargets = this.findAllEnemyTargets(attackerSide);
        
        if (enemyTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${giantCreature.name} finds no targets for its triple assault!`, 
                'info'
            );
            return;
        }

        // Select random targets (up to MAX_TARGETS)
        const maxTargets = Math.min(this.MAX_TARGETS, enemyTargets.length);
        const selectedTargets = this.selectRandomTargets(enemyTargets, maxTargets);
        
        if (selectedTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${giantCreature.name} cannot find valid targets for its assault!`, 
                'warning'
            );
            return;
        }
        
        this.battleManager.addCombatLog(
            `⚡ ${giantCreature.name} locks onto ${selectedTargets.length} target${selectedTargets.length > 1 ? 's' : ''} with crushing force!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE starting host animation
        this.sendSpecialAttackUpdate(giantActor, selectedTargets, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute consecutive impact attacks
        await this.executeConsecutiveImpacts(giantActor, selectedTargets, position);
    }

    // Execute consecutive impact attacks (host side)
    async executeConsecutiveImpacts(giantActor, targets, position) {
        const attackerSide = giantActor.hero.side;
        const giantElement = this.getGiantElement(attackerSide, position, giantActor.index);
        
        if (!giantElement) {
            console.error('3HeadedGiant element not found, cannot create impacts');
            return;
        }
        
        // Validate targets
        const validTargets = [];
        
        for (const target of targets) {
            const targetElement = this.getTargetElement(target);
            if (targetElement && this.isValidTarget(targetElement, target)) {
                validTargets.push(target);
            } else {
                console.warn(`Target element not found or invalid for:`, target);
            }
        }

        if (validTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${giantActor.data.name}'s assault finds no valid targets!`, 
                'info'
            );
            return;
        }

        // Execute consecutive impacts with damage application
        for (let i = 0; i < validTargets.length; i++) {
            const target = validTargets[i];
            const targetElement = this.getTargetElement(target);
            
            if (targetElement) {
                // Create impact animation
                await this.createImpactAnimation(giantElement, targetElement, i + 1);
                
                // Apply damage immediately after impact animation starts
                this.applyGiantDamage(target, giantActor.data);
                
                // Wait before next impact (except for the last one)
                if (i < validTargets.length - 1) {
                    await this.battleManager.delay(this.IMPACT_DELAY);
                }
            }
        }

        this.battleManager.addCombatLog(
            `💥 ${giantActor.data.name}'s devastating assault is complete!`, 
            'info'
        );
    }

    // Create impact animation for a single target
    async createImpactAnimation(giantElement, targetElement, impactNumber) {
        // Add charging effect to giant
        giantElement.classList.add('giant-charging');
        
        // Create impact effect on target
        const impact = this.createImpactEffect(targetElement, impactNumber);
        
        // Brief charging animation
        await this.battleManager.delay(100);
        
        // Remove charging effect
        giantElement.classList.remove('giant-charging');
        
        // Impact animation duration
        await this.battleManager.delay(300);
        
        // Clean up impact effect
        if (impact && impact.parentNode) {
            impact.remove();
        }
    }

    // Create visual impact effect
    createImpactEffect(targetElement, impactNumber) {
        const targetRect = targetElement.getBoundingClientRect();
        
        // Create impact element
        const impact = document.createElement('div');
        impact.className = `giant-impact giant-impact-${impactNumber}`;
        impact.innerHTML = '💥';
        
        impact.style.cssText = `
            position: fixed;
            left: ${targetRect.left + targetRect.width / 2 - 25}px;
            top: ${targetRect.top + targetRect.height / 2 - 25}px;
            width: 50px;
            height: 50px;
            font-size: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1500;
            pointer-events: none;
            animation: giantImpactEffect 0.4s ease-out forwards;
        `;
        
        document.body.appendChild(impact);
        
        // Add screen shake effect
        this.createScreenShake();
        
        return impact;
    }

    // Create subtle screen shake effect
    createScreenShake() {
        const battleScreen = document.querySelector('.battle-screen');
        if (battleScreen) {
            battleScreen.classList.add('screen-shake');
            setTimeout(() => {
                battleScreen.classList.remove('screen-shake');
            }, 200);
        }
    }

    // Find all valid enemy targets (heroes and creatures)
    findAllEnemyTargets(attackerSide) {
        const enemySide = attackerSide === 'player' ? 'opponent' : 'player';
        const enemyHeroes = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        const targets = [];

        // Scan all enemy positions for targets
        for (const position of ['left', 'center', 'right']) {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                // Add living creatures first (they are priority targets)
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive && creature.currentHp > 0) {
                            const creatureElement = document.querySelector(
                                `.${enemySide}-slot.${position}-slot .creature-icon[data-creature-index="${index}"]`
                            );
                            if (creatureElement) {
                                targets.push({
                                    type: 'creature',
                                    hero: hero,
                                    creature: creature,
                                    creatureIndex: index,
                                    position: position,
                                    side: enemySide,
                                    priority: 'high' // Creatures have higher priority
                                });
                            }
                        }
                    });
                }
                
                // Add the hero itself if alive and element exists
                const heroElement = document.querySelector(`.${enemySide}-slot.${position}-slot .battle-hero-card`);
                if (heroElement && hero.currentHp > 0) {
                    targets.push({
                        type: 'hero',
                        hero: hero,
                        position: position,
                        side: enemySide,
                        priority: 'normal'
                    });
                }
            }
        }

        console.log(`3HeadedGiant found ${targets.length} valid targets:`, targets.map(t => `${t.type}:${t.hero?.name || t.creature?.name}`));
        return targets;
    }

    // Select random targets with weighted selection
    selectRandomTargets(availableTargets, maxTargets) {
        // Separate high priority (creatures) and normal priority (heroes)
        const highPriority = availableTargets.filter(t => t.priority === 'high');
        const normalPriority = availableTargets.filter(t => t.priority === 'normal');
        
        const selected = [];
        
        // First, try to select from high priority targets
        if (highPriority.length > 0) {
            const shuffledHigh = this.battleManager.shuffleArray(highPriority);
            selected.push(...shuffledHigh.slice(0, maxTargets));
        }
        
        // Fill remaining slots with normal priority targets
        if (selected.length < maxTargets && normalPriority.length > 0) {
            const shuffledNormal = this.battleManager.shuffleArray(normalPriority);
            const remaining = maxTargets - selected.length;
            selected.push(...shuffledNormal.slice(0, remaining));
        }
        
        // If we still don't have enough, just take any remaining targets
        if (selected.length < maxTargets) {
            const remaining = availableTargets.filter(t => !selected.includes(t));
            const shuffledRemaining = this.battleManager.shuffleArray(remaining);
            selected.push(...shuffledRemaining.slice(0, maxTargets - selected.length));
        }

        return selected.slice(0, maxTargets);
    }

    // Apply Giant damage to a target
    applyGiantDamage(target, attackingGiant = null) {
        const damage = this.DAMAGE_PER_TARGET;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'attack', // Giant's attack is physical
                attacker: attackingGiant
            });
        } else if (target.type === 'creature') {
            this.battleManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: target.position,
                side: target.side
            }, {
                source: 'attack', // Giant's attack is physical
                attacker: attackingGiant
            });
        }
    }

    // Get the DOM element for Giant creature
    getGiantElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for a target
    getTargetElement(target) {
        if (!target || !target.side || !target.position) {
            console.warn('Invalid target data:', target);
            return null;
        }

        let element = null;
        
        if (target.type === 'hero') {
            element = document.querySelector(`.${target.side}-slot.${target.position}-slot .battle-hero-card`);
            if (!element) {
                // Fallback to the slot itself
                element = document.querySelector(`.${target.side}-slot.${target.position}-slot`);
            }
        } else if (target.type === 'creature') {
            if (target.creatureIndex === undefined || target.creatureIndex < 0) {
                console.warn('Invalid creature index for target:', target);
                return null;
            }
            element = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }

        if (!element) {
            console.warn(`Target element not found for ${target.type} at ${target.side}-${target.position}${target.type === 'creature' ? `-${target.creatureIndex}` : ''}`);
        }

        return element;
    }

    // Validate target element
    isValidTarget(targetElement, target) {
        if (!document.body.contains(targetElement)) {
            console.warn('Target element no longer in DOM:', target);
            return false;
        }
        
        const rect = targetElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            console.warn('Target element has invalid dimensions:', target, rect);
            return false;
        }
        
        return true;
    }

    // Send special attack data to guest for synchronization
    sendSpecialAttackUpdate(giantActor, targets, position) {
        const attackerSide = giantActor.hero.side;
        
        this.battleManager.sendBattleUpdate('three_headed_giant_special_attack', {
            giantData: {
                side: attackerSide,
                position: position,
                creatureIndex: giantActor.index,
                name: giantActor.data.name,
                absoluteSide: giantActor.hero.absoluteSide
            },
            targets: targets.map(target => ({
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null
            })),
            damage: this.DAMAGE_PER_TARGET,
            impactDelay: this.IMPACT_DELAY
        });
    }

    // Handle Giant special attack on guest side
    handleGuestSpecialAttack(data) {
        const { giantData, targets, damage, impactDelay } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const giantLocalSide = (giantData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💥 ${giantData.name} unleashes devastating triple assault!`, 
            giantLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestImpacts(giantData, targets, impactDelay, myAbsoluteSide);
    }

    // Create impact animations on guest side
    async createGuestImpacts(giantData, targets, impactDelay, myAbsoluteSide) {
        const giantLocalSide = (giantData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const giantElement = this.getGiantElement(
            giantLocalSide,
            giantData.position,
            giantData.creatureIndex
        );

        if (!giantElement) {
            console.warn('Giant element not found on guest side');
            return;
        }

        // Execute consecutive impacts on guest side
        for (let i = 0; i < targets.length; i++) {
            const targetData = targets[i];
            const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            let targetElement = null;
            
            if (targetData.type === 'hero') {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot .battle-hero-card`
                );
                if (!targetElement) {
                    targetElement = document.querySelector(
                        `.${targetLocalSide}-slot.${targetData.position}-slot`
                    );
                }
            } else if (targetData.type === 'creature' && targetData.creatureIndex !== null) {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
                );
            }

            if (targetElement) {
                // Create impact animation
                await this.createImpactAnimation(giantElement, targetElement, i + 1);
                
                // Log damage for each target (but don't apply actual damage - host handles that)
                const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
                this.battleManager.addCombatLog(
                    `💥 ${targetName} is struck by crushing force for ${this.DAMAGE_PER_TARGET} damage!`, 
                    targetLocalSide === 'player' ? 'error' : 'success'
                );
                
                // Wait before next impact (except for the last one)
                if (i < targets.length - 1) {
                    await this.battleManager.delay(impactDelay);
                }
            } else {
                console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
            }
        }

        console.log(`💥 Guest completed ${targets.length} consecutive impacts`);
        
        this.battleManager.addCombatLog(`💥 The giant's assault is complete!`, 'info');
    }

    // Clean up method
    cleanup() {
        // Remove any remaining impact effects
        const impacts = document.querySelectorAll('.giant-impact');
        impacts.forEach(impact => {
            if (impact.parentNode) {
                impact.remove();
            }
        });
        
        // Remove charging effects
        const chargingElements = document.querySelectorAll('.giant-charging');
        chargingElements.forEach(element => {
            element.classList.remove('giant-charging');
        });
        
        console.log('3HeadedGiant cleaned up');
    }

    // Inject CSS styles for Giant effects
    injectThreeHeadedGiantStyles() {
        if (document.getElementById('threeHeadedGiantCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'threeHeadedGiantCreatureStyles';
        style.textContent = `
            /* 3HeadedGiant Impact Animation */
            @keyframes giantImpactEffect {
                0% { 
                    transform: scale(0.5);
                    opacity: 1;
                }
                50% { 
                    transform: scale(1.5);
                    opacity: 0.9;
                }
                100% { 
                    transform: scale(0.8);
                    opacity: 0;
                }
            }

            .giant-impact {
                filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5));
                z-index: 1500 !important;
            }

            /* Screen shake effect */
            @keyframes screenShake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
                20%, 40%, 60%, 80% { transform: translateX(2px); }
            }

            .screen-shake {
                animation: screenShake 0.2s ease-in-out;
            }

            /* Giant charging effect */
            .giant-charging .creature-sprite {
                filter: brightness(1.5) drop-shadow(0 0 10px rgba(255, 0, 0, 0.8));
                animation: giantChargeGlow 0.3s ease-in-out infinite alternate;
            }

            @keyframes giantChargeGlow {
                0% { 
                    filter: brightness(1.5) drop-shadow(0 0 10px rgba(255, 0, 0, 0.8));
                }
                100% { 
                    filter: brightness(2) drop-shadow(0 0 20px rgba(255, 50, 0, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const ThreeHeadedGiantHelpers = {
    // Check if any creature in a list is 3HeadedGiant
    hasThreeHeadedGiantInList(creatures) {
        return creatures.some(creature => ThreeHeadedGiantCreature.isThreeHeadedGiant(creature.name));
    },

    // Get all 3HeadedGiant creatures from a list
    getThreeHeadedGiantFromList(creatures) {
        return creatures.filter(creature => ThreeHeadedGiantCreature.isThreeHeadedGiant(creature.name));
    },

    // Add charging visual effect to Giant
    addChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('giant-charging');
        }
    },

    // Remove charging visual effect from Giant
    removeChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('giant-charging');
        }
    }
};

export default ThreeHeadedGiantCreature;