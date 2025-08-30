// ./Creatures/futureTechMech.js - Future Tech Mech Creature Special Attack Module

export class FutureTechMechCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeTethers = new Set(); // Track active tethers for cleanup
        
        // Future Tech Mech stats
        this.DAMAGE_PER_TARGET = 100;
        this.TETHER_DURATION = 1000; // 1 second
        
        // Inject CSS styles
        this.injectFutureTechMechStyles();
        
        console.log('🤖 Future Tech Mech Creature module initialized');
    }

    // Check if a creature is Future Tech Mech
    static isFutureTechMech(creatureName) {
        return creatureName === 'FutureTechMech';
    }

    // Execute Future Tech Mech special attack with synchronized animations
    async executeSpecialAttack(mechActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const mechCreature = mechActor.data;
        const mechHero = mechActor.hero;
        const attackerSide = mechHero.side;
        
        // Safety check: ensure Mech is still alive
        if (!mechCreature.alive || mechCreature.currentHp <= 0) {
            console.log(`Future Tech Mech is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `🤖 ${mechCreature.name} powers up its targeting systems!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Get the number of FutureTechMech in owner's graveyard
        const ownerGraveyard = this.battleManager.getGraveyardBySide(attackerSide);
        const mechCountInGraveyard = ownerGraveyard.filter(card => card === 'FutureTechMech').length;
        
        if (mechCountInGraveyard === 0) {
            this.battleManager.addCombatLog(
                `💨 ${mechCreature.name} has no targets - no FutureTechMech in graveyard!`, 
                'info'
            );
            return;
        }

        // Find all possible enemy targets
        const enemyTargets = this.findAllEnemyTargets(attackerSide);
        
        if (enemyTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${mechCreature.name} finds no valid enemies to target!`, 
                'info'
            );
            return;
        }

        // Select up to mechCountInGraveyard targets
        const maxTargets = Math.min(mechCountInGraveyard, enemyTargets.length);
        const selectedTargets = this.selectRandomTargets(enemyTargets, maxTargets);
        
        if (selectedTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${mechCreature.name} cannot find valid targets for its laser array!`, 
                'warning'
            );
            return;
        }
        
        this.battleManager.addCombatLog(
            `🔴 ${mechCreature.name} locks onto ${selectedTargets.length} target${selectedTargets.length > 1 ? 's' : ''} with laser targeting!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE starting host animation
        this.sendSpecialAttackUpdate(mechActor, selectedTargets, position, mechCountInGraveyard);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Create visual laser tethers and apply damage simultaneously
        await this.executeLaserBarrage(mechActor, selectedTargets, position);
    }

    // Execute the laser barrage with visual effects (host side)
    async executeLaserBarrage(mechActor, targets, position) {
        const attackerSide = mechActor.hero.side;
        const mechElement = this.getFutureTechMechElement(attackerSide, position, mechActor.index);
        
        if (!mechElement) {
            console.error('Future Tech Mech element not found, cannot create tethers');
            return;
        }
        
        // Validate targets and create tethers only to valid targets
        const tetherElements = [];
        const validTargets = [];
        
        for (const target of targets) {
            const targetElement = this.getTargetElement(target);
            if (targetElement) {
                // Validate element is still in DOM and has valid position
                if (!document.body.contains(targetElement)) {
                    console.warn('Target element no longer in DOM:', target);
                    continue;
                }
                
                const rect = targetElement.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    console.warn('Target element has invalid dimensions:', target, rect);
                    continue;
                }
                
                const tether = this.createLaserTether(mechElement, targetElement);
                if (tether) {
                    tetherElements.push(tether);
                    this.activeTethers.add(tether);
                    validTargets.push(target);
                } else {
                    console.warn(`Failed to create laser tether to target:`, target);
                }
            } else {
                console.warn(`Target element not found for:`, target);
            }
        }

        if (validTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${mechActor.data.name}'s laser array finds no valid targets!`, 
                'info'
            );
            return;
        }

        // Apply damage only to valid targets while tethers are visible
        // NOTE: Only the host (authoritative) applies actual damage
        for (const target of validTargets) {
            this.applyMechDamage(target, mechActor.data); 
        }

        // Keep tethers visible for the specified duration
        await this.battleManager.delay(this.TETHER_DURATION);
        
        // Remove tethers with fade effect
        await this.removeTethers(tetherElements);

        this.battleManager.addCombatLog(
            `💥 ${mechActor.data.name}'s laser array powers down!`, 
            'info'
        );
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
                            // Double-check that the creature element exists
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

        console.log(`Future Tech Mech found ${targets.length} valid targets:`, targets.map(t => `${t.type}:${t.hero?.name || t.creature?.name}`));
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

    // Apply Future Tech Mech damage to a target
    applyMechDamage(target, attackingMech = null) {
        const damage = this.DAMAGE_PER_TARGET;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'spell', // Future Tech Mech's laser attack is technological/magical
                attacker: attackingMech
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
                source: 'spell', // Future Tech Mech's laser attack is technological/magical
                attacker: attackingMech
            });
        }
    }

    // Get the DOM element for Future Tech Mech creature
    getFutureTechMechElement(side, heroPosition, creatureIndex) {
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

    // Create a red laser tether between Mech and a target
    createLaserTether(fromElement, toElement) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create laser tether: missing elements', { fromElement: !!fromElement, toElement: !!toElement });
            return null;
        }

        // Additional validation: ensure elements are still in DOM
        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            console.warn('Cannot create laser tether: elements not in DOM');
            return null;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            // Validate that elements have valid dimensions
            if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
                console.warn('Cannot create laser tether: elements have invalid dimensions');
                return null;
            }

            // Calculate center positions
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid laser tether coordinates detected:', { fromX, fromY, toX, toY });
                return null;
            }

            // Calculate line properties
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Prevent tethers that are too short or too long (likely errors)
            if (distance < 10 || distance > 2000) {
                console.warn(`Invalid laser tether distance: ${distance}px`);
                return null;
            }
            
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

            // Additional check for suspicious horizontal tethers
            if (Math.abs(deltaY) < 5 && Math.abs(deltaX) > 500) {
                console.warn('Suspicious horizontal laser tether detected, blocking:', { deltaX, deltaY, distance, angle });
                return null;
            }

            // Create the main laser tether element with RED coloring
            const tether = document.createElement('div');
            tether.className = 'future-tech-mech-laser-tether';
            tether.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: ${distance}px;
                height: 4px;
                background: linear-gradient(90deg, 
                    rgba(255, 0, 0, 0.9) 0%, 
                    rgba(255, 50, 50, 1) 25%,
                    rgba(255, 255, 255, 1) 50%,
                    rgba(255, 50, 50, 1) 75%,
                    rgba(255, 0, 0, 0.9) 100%);
                transform-origin: 0 50%;
                transform: rotate(${angle}deg);
                z-index: 1500;
                pointer-events: none;
                border-radius: 2px;
                box-shadow: 
                    0 0 12px rgba(255, 0, 0, 0.9),
                    0 0 24px rgba(255, 0, 0, 0.6),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                animation: futureTechMechLaserPulse 0.15s ease-in-out infinite alternate;
            `;

            // Add laser core effect
            const laserCore = document.createElement('div');
            laserCore.className = 'future-tech-mech-laser-core';
            laserCore.style.cssText = `
                position: absolute;
                top: -1px;
                left: 0;
                right: 0;
                bottom: -1px;
                background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.9) 50%, transparent 100%);
                animation: futureTechMechLaserCore 0.1s linear infinite;
            `;
            
            tether.appendChild(laserCore);
            document.body.appendChild(tether);
            
            console.log(`Created laser tether: ${distance.toFixed(1)}px at ${angle.toFixed(1)}°`);
            return tether;
            
        } catch (error) {
            console.error('Error creating laser tether:', error);
            return null;
        }
    }

    // Remove tethers with fade effect
    async removeTethers(tetherElements) {
        const validTethers = tetherElements.filter(tether => tether && tether.parentNode);
        
        if (validTethers.length === 0) {
            return;
        }

        // Add fadeout class to all valid tethers
        validTethers.forEach(tether => {
            try {
                tether.classList.add('future-tech-mech-tether-fadeout');
                this.activeTethers.delete(tether);
            } catch (error) {
                console.warn('Error adding fadeout class to laser tether:', error);
            }
        });

        await this.battleManager.delay(300);
        
        validTethers.forEach(tether => {
            try {
                if (tether && tether.parentNode) {
                    tether.remove();
                }
            } catch (error) {
                console.warn('Error removing laser tether element:', error);
            }
        });
    }

    // Send special attack data to guest for synchronization
    sendSpecialAttackUpdate(mechActor, targets, position, mechCountInGraveyard) {
        const attackerSide = mechActor.hero.side;
        
        this.battleManager.sendBattleUpdate('future_tech_mech_special_attack', {
            mechData: {
                side: attackerSide,
                position: position,
                creatureIndex: mechActor.index,
                name: mechActor.data.name,
                absoluteSide: mechActor.hero.absoluteSide
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
            tetherDuration: this.TETHER_DURATION,
            mechCountInGraveyard: mechCountInGraveyard
        });
    }

    // Handle Future Tech Mech special attack on guest side
    handleGuestSpecialAttack(data) {
        const { mechData, targets, damage, tetherDuration, mechCountInGraveyard } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const mechLocalSide = (mechData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🤖 ${mechData.name} unleashes devastating laser barrage!`, 
            mechLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestTethers(mechData, targets, tetherDuration, myAbsoluteSide);
    }

    // Create tethers on guest side
    async createGuestTethers(mechData, targets, duration, myAbsoluteSide) {
        const mechLocalSide = (mechData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const mechElement = this.getFutureTechMechElement(
            mechLocalSide,
            mechData.position,
            mechData.creatureIndex
        );

        if (!mechElement) {
            console.warn('Future Tech Mech element not found on guest side');
            return;
        }

        const tetherElements = [];

        for (const targetData of targets) {
            const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            let targetElement = null;
            
            if (targetData.type === 'hero') {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot .battle-hero-card`
                );
                if (!targetElement) {
                    // Fallback to slot
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
                const tether = this.createLaserTether(mechElement, targetElement);
                if (tether) {
                    tetherElements.push(tether);
                    this.activeTethers.add(tether);
                }

                // Log damage for each target (but don't apply actual damage - host handles that)
                const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
                this.battleManager.addCombatLog(
                    `🔴 ${targetName} is struck by laser fire for ${this.DAMAGE_PER_TARGET} damage!`, 
                    targetLocalSide === 'player' ? 'error' : 'success'
                );
            } else {
                console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
            }
        }

        console.log(`🤖 Guest created ${tetherElements.length} laser tethers`);

        // Remove tethers after duration (same timing as host)
        await this.battleManager.delay(duration);
        await this.removeTethers(tetherElements);
        
        this.battleManager.addCombatLog(`💥 The laser array powers down!`, 'info');
    }

    // Clean up all active tethers (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeTethers.size} active Future Tech Mech laser tethers`);
        
        this.activeTethers.forEach(tether => {
            try {
                if (tether && tether.parentNode) {
                    tether.remove();
                }
            } catch (error) {
                console.warn('Error removing laser tether during cleanup:', error);
            }
        });
        
        this.activeTethers.clear();

        // Also remove any orphaned tether elements
        try {
            const orphanedTethers = document.querySelectorAll('.future-tech-mech-laser-tether');
            orphanedTethers.forEach(tether => {
                if (tether.parentNode) {
                    tether.remove();
                }
            });
            
            if (orphanedTethers.length > 0) {
                console.log(`Cleaned up ${orphanedTethers.length} orphaned Future Tech Mech laser tethers`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned laser tethers:', error);
        }
    }

    // Inject CSS styles for Future Tech Mech effects
    injectFutureTechMechStyles() {
        if (document.getElementById('futureTechMechCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'futureTechMechCreatureStyles';
        style.textContent = `
            /* Future Tech Mech Laser Tether Styles */
            .future-tech-mech-laser-tether {
                border-radius: 2px;
                position: relative;
                overflow: hidden;
            }

            .future-tech-mech-laser-core {
                pointer-events: none;
                border-radius: 2px;
            }

            @keyframes futureTechMechLaserPulse {
                0% { 
                    opacity: 0.8;
                    height: 4px;
                    box-shadow: 
                        0 0 12px rgba(255, 0, 0, 0.9),
                        0 0 24px rgba(255, 0, 0, 0.6),
                        inset 0 1px 0 rgba(255, 255, 255, 0.8);
                }
                100% { 
                    opacity: 1;
                    height: 6px;
                    box-shadow: 
                        0 0 18px rgba(255, 0, 0, 1),
                        0 0 36px rgba(255, 0, 0, 0.8),
                        inset 0 1px 0 rgba(255, 255, 255, 1);
                }
            }

            @keyframes futureTechMechLaserCore {
                0% { 
                    transform: scaleX(0.7);
                    opacity: 0.7;
                }
                50% { 
                    transform: scaleX(1.3);
                    opacity: 1;
                }
                100% { 
                    transform: scaleX(0.7);
                    opacity: 0.7;
                }
            }

            .future-tech-mech-tether-fadeout {
                animation: futureTechMechTetherFadeOut 0.3s ease-out forwards !important;
            }

            @keyframes futureTechMechTetherFadeOut {
                0% { 
                    opacity: 1;
                }
                100% { 
                    opacity: 0;
                }
            }

            /* Enhanced creature glow when Future Tech Mech is preparing attack */
            .creature-icon.future-tech-mech-charging .creature-sprite {
                filter: brightness(1.5) drop-shadow(0 0 15px rgba(255, 0, 0, 0.9));
                animation: futureTechMechChargeGlow 0.5s ease-in-out infinite alternate;
            }

            @keyframes futureTechMechChargeGlow {
                0% { 
                    filter: brightness(1.5) drop-shadow(0 0 15px rgba(255, 0, 0, 0.9));
                }
                100% { 
                    filter: brightness(2.0) drop-shadow(0 0 25px rgba(255, 0, 0, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const FutureTechMechHelpers = {
    // Check if any creature in a list is Future Tech Mech
    hasFutureTechMechInList(creatures) {
        return creatures.some(creature => FutureTechMechCreature.isFutureTechMech(creature.name));
    },

    // Get all Future Tech Mechs from a list
    getFutureTechMechsFromList(creatures) {
        return creatures.filter(creature => FutureTechMechCreature.isFutureTechMech(creature.name));
    },

    // Add charging visual effect to Future Tech Mech
    addChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('future-tech-mech-charging');
        }
    },

    // Remove charging visual effect from Future Tech Mech
    removeChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('future-tech-mech-charging');
        }
    },

    // Get the level reduction for FutureTechMech based on graveyard count
    getLevelReduction(graveyardManager) {
        if (!graveyardManager) return 0;
        
        const graveyard = graveyardManager.getGraveyard();
        const mechCount = graveyard.filter(card => card === 'FutureTechMech').length;
        return mechCount;
    }
};

export default FutureTechMechCreature;