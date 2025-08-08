// ./Creatures/jiggles.js - Jiggles Creature Special Attack Module

export class JigglesCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeTethers = new Set(); // Track active tethers for cleanup
        
        // Jiggles stats
        this.DAMAGE_PER_TARGET = 80;
        this.MAX_TARGETS = 2;
        this.TETHER_DURATION = 1000; // 1 second
        
        // Inject CSS styles
        this.injectJigglesStyles();
        
        console.log('🎯 Jiggles Creature module initialized');
    }

    // Check if a creature is Jiggles
    static isJiggles(creatureName) {
        return creatureName === 'Jiggles';
    }

    // Execute Jiggles special attack with synchronized animations
    async executeSpecialAttack(jigglesActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const jigglesCreature = jigglesActor.data;
        const jigglesHero = jigglesActor.hero;
        const attackerSide = jigglesHero.side;
        
        // Safety check: ensure Jiggles is still alive
        if (!jigglesCreature.alive || jigglesCreature.currentHp <= 0) {
            console.log(`Jiggles is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `🎯 ${jigglesCreature.name} charges up its devastating energy attack!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find all possible enemy targets
        const enemyTargets = this.findAllEnemyTargets(attackerSide);
        
        if (enemyTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${jigglesCreature.name} finds no targets for its energy blast!`, 
                'info'
            );
            return;
        }

        // Select random targets (up to MAX_TARGETS)
        const maxTargets = Math.min(this.MAX_TARGETS, enemyTargets.length);
        const selectedTargets = this.selectRandomTargets(enemyTargets, maxTargets);
        
        if (selectedTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${jigglesCreature.name} cannot find valid targets for its energy blast!`, 
                'warning'
            );
            return;
        }
        
        this.battleManager.addCombatLog(
            `⚡ ${jigglesCreature.name} locks onto ${selectedTargets.length} target${selectedTargets.length > 1 ? 's' : ''} with crackling energy!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // FIXED: Send synchronization data to guest BEFORE starting host animation
        // This allows both sides to start animations simultaneously
        this.sendSpecialAttackUpdate(jigglesActor, selectedTargets, position);

        // Short delay to ensure guest receives the message and can start their animation
        await this.battleManager.delay(50);

        // Create visual tethers and apply damage simultaneously with guest
        await this.executeEnergyBlastFast(jigglesActor, selectedTargets, position);
    }

    // Execute the energy blast with visual effects (host side)
    async executeEnergyBlastFast(jigglesActor, targets, position) {
        const attackerSide = jigglesActor.hero.side;
        const jigglesElement = this.getJigglesElement(attackerSide, position, jigglesActor.index);
        
        if (!jigglesElement) {
            console.error('Jiggles element not found, cannot create tethers');
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
                
                const tether = this.createEnergyTether(jigglesElement, targetElement);
                if (tether) {
                    tetherElements.push(tether);
                    this.activeTethers.add(tether);
                    validTargets.push(target);
                } else {
                    console.warn(`Failed to create tether to target:`, target);
                }
            } else {
                console.warn(`Target element not found for:`, target);
            }
        }

        if (validTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${jigglesActor.data.name}'s energy attack finds no valid targets!`, 
                'info'
            );
            return;
        }

        // Apply damage only to valid targets while tethers are visible
        // NOTE: Only the host (authoritative) applies actual damage
        for (const target of validTargets) {
            this.applyJigglesDamage(target);
        }

        // Keep tethers visible for the specified duration
        await this.battleManager.delay(this.TETHER_DURATION);
        
        // Remove tethers with fade effect
        await this.removeTethers(tetherElements);

        this.battleManager.addCombatLog(
            `💥 ${jigglesActor.data.name}'s energy blast dissipates into the air!`, 
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

        console.log(`Jiggles found ${targets.length} valid targets:`, targets.map(t => `${t.type}:${t.hero?.name || t.creature?.name}`));
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

    // Apply Jiggles damage to a target
    applyJigglesDamage(target) {
        const damage = this.DAMAGE_PER_TARGET;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            });
        } else if (target.type === 'creature') {
            this.battleManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: target.position,
                side: target.side
            });
        }
    }

    // Get the DOM element for Jiggles creature
    getJigglesElement(side, heroPosition, creatureIndex) {
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

    // Create an energy tether between Jiggles and a target
    createEnergyTether(fromElement, toElement) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create tether: missing elements', { fromElement: !!fromElement, toElement: !!toElement });
            return null;
        }

        // Additional validation: ensure elements are still in DOM
        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            console.warn('Cannot create tether: elements not in DOM');
            return null;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            // Validate that elements have valid dimensions
            if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
                console.warn('Cannot create tether: elements have invalid dimensions');
                return null;
            }

            // Calculate center positions
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid tether coordinates detected:', { fromX, fromY, toX, toY });
                return null;
            }

            // Calculate line properties
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Prevent tethers that are too short or too long (likely errors)
            if (distance < 10 || distance > 2000) {
                console.warn(`Invalid tether distance: ${distance}px`);
                return null;
            }
            
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

            // Additional check for suspicious horizontal tethers
            // If the tether is nearly horizontal and very long, it's probably an error
            if (Math.abs(deltaY) < 5 && Math.abs(deltaX) > 500) {
                console.warn('Suspicious horizontal tether detected, blocking:', { deltaX, deltaY, distance, angle });
                return null;
            }

            // Create the main tether element
            const tether = document.createElement('div');
            tether.className = 'jiggles-energy-tether';
            tether.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: ${distance}px;
                height: 6px;
                background: linear-gradient(90deg, 
                    rgba(255, 50, 50, 0.9) 0%, 
                    rgba(255, 150, 150, 1) 25%,
                    rgba(255, 255, 255, 1) 50%,
                    rgba(255, 150, 150, 1) 75%,
                    rgba(255, 50, 50, 0.9) 100%);
                transform-origin: 0 50%;
                transform: rotate(${angle}deg);
                z-index: 1500;
                pointer-events: none;
                border-radius: 3px;
                box-shadow: 
                    0 0 15px rgba(255, 0, 0, 0.9),
                    0 0 30px rgba(255, 0, 0, 0.6),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                animation: jigglesEnergyPulse 0.2s ease-in-out infinite alternate;
            `;

            // Add crackling energy effect
            const crackle = document.createElement('div');
            crackle.className = 'jiggles-energy-crackle';
            crackle.style.cssText = `
                position: absolute;
                top: -2px;
                left: 0;
                right: 0;
                bottom: -2px;
                background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%);
                animation: jigglesEnergyCrackle 0.1s linear infinite;
            `;
            
            tether.appendChild(crackle);
            document.body.appendChild(tether);
            
            console.log(`Created energy tether: ${distance.toFixed(1)}px at ${angle.toFixed(1)}°`);
            return tether;
            
        } catch (error) {
            console.error('Error creating energy tether:', error);
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
                tether.classList.add('jiggles-tether-fadeout');
                this.activeTethers.delete(tether);
            } catch (error) {
                console.warn('Error adding fadeout class to tether:', error);
            }
        });

        await this.battleManager.delay(300);
        
        validTethers.forEach(tether => {
            try {
                if (tether && tether.parentNode) {
                    tether.remove();
                }
            } catch (error) {
                console.warn('Error removing tether element:', error);
            }
        });
    }

    // Send special attack data to guest for synchronization (FIXED with absoluteSide)
    sendSpecialAttackUpdate(jigglesActor, targets, position) {
        const attackerSide = jigglesActor.hero.side;
        
        this.battleManager.sendBattleUpdate('jiggles_special_attack', {
            jigglesData: {
                side: attackerSide,
                position: position,
                creatureIndex: jigglesActor.index,
                name: jigglesActor.data.name,
                absoluteSide: jigglesActor.hero.absoluteSide  // FIXED: Send absolute side
            },
            targets: targets.map(target => ({
                type: target.type,
                side: target.side,  // Keep relative side for backwards compatibility
                absoluteSide: target.hero.absoluteSide,  // FIXED: Send absolute side of target
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null
            })),
            damage: this.DAMAGE_PER_TARGET,
            tetherDuration: this.TETHER_DURATION
        });
    }

    // Handle Jiggles special attack on guest side (FIXED: starts immediately)
    handleGuestSpecialAttack(data) {
        const { jigglesData, targets, damage, tetherDuration } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const jigglesLocalSide = (jigglesData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🎯 ${jigglesData.name} unleashes devastating energy bolts!`, 
            jigglesLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately (no await - fire and forget)
        this.createGuestTethers(jigglesData, targets, tetherDuration, myAbsoluteSide);
    }

    // Create tethers on guest side (FIXED with absoluteSide mapping)
    async createGuestTethers(jigglesData, targets, duration, myAbsoluteSide) {
        const jigglesLocalSide = (jigglesData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const jigglesElement = this.getJigglesElement(
            jigglesLocalSide,
            jigglesData.position,
            jigglesData.creatureIndex
        );

        if (!jigglesElement) {
            console.warn('Jiggles element not found on guest side');
            return;
        }

        const tetherElements = [];

        for (const targetData of targets) {
            // FIXED: Use absoluteSide instead of relative side
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
                const tether = this.createEnergyTether(jigglesElement, targetElement);
                if (tether) {
                    tetherElements.push(tether);
                    this.activeTethers.add(tether);
                }

                // Log damage for each target (but don't apply actual damage - host handles that)
                const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
                this.battleManager.addCombatLog(
                    `⚡ ${targetName} is struck by crackling energy for ${this.DAMAGE_PER_TARGET} damage!`, 
                    targetLocalSide === 'player' ? 'error' : 'success'
                );
            } else {
                console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
            }
        }

        console.log(`🎯 Guest created ${tetherElements.length} tethers`);

        // Remove tethers after duration (same timing as host)
        await this.battleManager.delay(duration);
        await this.removeTethers(tetherElements);
        
        this.battleManager.addCombatLog(`💥 The energy field dissipates!`, 'info');
    }

    // Clean up all active tethers (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeTethers.size} active Jiggles tethers`);
        
        this.activeTethers.forEach(tether => {
            try {
                if (tether && tether.parentNode) {
                    tether.remove();
                }
            } catch (error) {
                console.warn('Error removing tether during cleanup:', error);
            }
        });
        
        this.activeTethers.clear();

        // Also remove any orphaned tether elements
        try {
            const orphanedTethers = document.querySelectorAll('.jiggles-energy-tether');
            orphanedTethers.forEach(tether => {
                if (tether.parentNode) {
                    tether.remove();
                }
            });
            
            if (orphanedTethers.length > 0) {
                console.log(`Cleaned up ${orphanedTethers.length} orphaned Jiggles tethers`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned tethers:', error);
        }
    }

    // Inject CSS styles for Jiggles effects
    injectJigglesStyles() {
        if (document.getElementById('jigglesCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'jigglesCreatureStyles';
        style.textContent = `
            /* Jiggles Energy Tether Styles */
            .jiggles-energy-tether {
                border-radius: 3px;
                position: relative;
                overflow: hidden;
            }

            .jiggles-energy-crackle {
                pointer-events: none;
                border-radius: 3px;
            }

            @keyframes jigglesEnergyPulse {
                0% { 
                    opacity: 0.8;
                    height: 6px;
                    box-shadow: 
                        0 0 15px rgba(255, 0, 0, 0.9),
                        0 0 30px rgba(255, 0, 0, 0.6),
                        inset 0 1px 0 rgba(255, 255, 255, 0.8);
                }
                100% { 
                    opacity: 1;
                    height: 8px;
                    box-shadow: 
                        0 0 25px rgba(255, 0, 0, 1),
                        0 0 50px rgba(255, 0, 0, 0.8),
                        inset 0 1px 0 rgba(255, 255, 255, 1);
                }
            }

            @keyframes jigglesEnergyCrackle {
                0% { 
                    transform: scaleX(0.8);
                    opacity: 0.6;
                }
                50% { 
                    transform: scaleX(1.2);
                    opacity: 1;
                }
                100% { 
                    transform: scaleX(0.8);
                    opacity: 0.6;
                }
            }

            /* FIXED: Remove rotation from fadeout to preserve existing rotation */
            .jiggles-tether-fadeout {
                animation: jigglesTetherFadeOut 0.3s ease-out forwards !important;
            }

            @keyframes jigglesTetherFadeOut {
                0% { 
                    opacity: 1;
                }
                100% { 
                    opacity: 0;
                }
            }

            /* Enhanced creature glow when Jiggles is preparing attack */
            .creature-icon.jiggles-charging .creature-sprite {
                filter: brightness(1.8) drop-shadow(0 0 15px rgba(255, 100, 100, 0.9));
                animation: jigglesChargeGlow 0.5s ease-in-out infinite alternate;
            }

            @keyframes jigglesChargeGlow {
                0% { 
                    filter: brightness(1.8) drop-shadow(0 0 15px rgba(255, 100, 100, 0.9));
                }
                100% { 
                    filter: brightness(2.2) drop-shadow(0 0 25px rgba(255, 50, 50, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const JigglesHelpers = {
    // Check if any creature in a list is Jiggles
    hasJigglesInList(creatures) {
        return creatures.some(creature => JigglesCreature.isJiggles(creature.name));
    },

    // Get all Jiggles creatures from a list
    getJigglesFromList(creatures) {
        return creatures.filter(creature => JigglesCreature.isJiggles(creature.name));
    },

    // Add charging visual effect to Jiggles
    addChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('jiggles-charging');
        }
    },

    // Remove charging visual effect from Jiggles
    removeChargingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('jiggles-charging');
        }
    }
};

export default JigglesCreature;