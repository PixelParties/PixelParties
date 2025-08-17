// ./Heroes/alice.js - Alice Hero Effect Implementation

export class AliceHeroEffect {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.heroName = 'Alice';
        this.activeLasers = new Set(); // Track active lasers for cleanup
        
        // Alice laser stats
        this.DAMAGE_PER_CREATURE = 20;
        this.LASER_DURATION = 800; // 800ms laser duration
        this.SPELL_NAME = 'AliceLaser';
        
        // Inject CSS styles
        this.injectAliceLaserStyles();
        
        console.log('🔴 Alice Hero effect initialized');
    }

    // ============================================
    // CORE ALICE EFFECT
    // ============================================

    // Check and apply Alice's laser effect when she takes any action
    static async checkAliceActionEffect(alice, battleManager) {
        // Only trigger for Alice
        if (!alice || alice.name !== 'Alice') return;
        
        console.log(`🔴 Alice's laser effect triggered!`);
        
        // Initialize Alice effect instance if needed
        if (!battleManager.aliceEffect) {
            battleManager.aliceEffect = new AliceHeroEffect(battleManager);
        }
        
        // Execute the laser effect
        await battleManager.aliceEffect.executeLaserEffect(alice);
    }

    // ============================================
    // LASER EFFECT EXECUTION
    // ============================================

    // Execute Alice's laser effect
    async executeLaserEffect(alice) {
        if (!this.battleManager.isAuthoritative) return;

        this.battleManager.addCombatLog(
            `🔴 Alice's targeting system activates at the start of her turn!`,
            alice.side === 'player' ? 'success' : 'error'
        );

        // Find random enemy target
        const target = this.findRandomEnemyTarget(alice);
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 Alice's laser finds no targets!`,
                'info'
            );
            return;
        }

        // Count living creatures in Alice's team
        const creatureCount = this.countTeamCreatures(alice);
        const damage = this.DAMAGE_PER_CREATURE * creatureCount;

        console.log(`🔴 Alice laser: ${creatureCount} creatures × ${this.DAMAGE_PER_CREATURE} = ${damage} damage`);

        // Check resistance (spell damage)
        const isResisted = this.battleManager.resistanceManager && 
            this.battleManager.resistanceManager.shouldResistSpell(
                target.type === 'creature' ? target.creature : target.hero, 
                this.SPELL_NAME, 
                alice
            );

        if (isResisted) {
            console.log(`🛡️ ${target.hero?.name || target.creature?.name} resisted Alice's laser!`);
        } else {
            // Log the laser effect
            this.logLaserEffect(alice, target, damage, creatureCount);
        }

        // Send synchronization data to guest
        this.sendLaserEffectUpdate(alice, target, damage, creatureCount, isResisted);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute laser animation and damage
        await this.executeLaserAnimation(alice, target, damage, isResisted);
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find a completely random enemy target (hero or creature)
    findRandomEnemyTarget(alice) {
        const enemySide = alice.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const allTargets = [];

        // Collect all possible enemy targets
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                // Add the hero as a target
                allTargets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: enemySide
                });

                // Add all living creatures as targets
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive && creature.currentHp > 0) {
                            allTargets.push({
                                type: 'creature',
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: enemySide
                            });
                        }
                    });
                }
            }
        });

        if (allTargets.length === 0) {
            console.log(`🔴 Alice found no valid enemy targets`);
            return null;
        }

        // Select completely random target
        const randomTarget = this.battleManager.getRandomChoice(allTargets);
        
        const targetName = randomTarget.type === 'hero' 
            ? randomTarget.hero.name 
            : randomTarget.creature.name;
            
        console.log(`🎯 Alice targeting random ${randomTarget.type}: ${targetName} at ${randomTarget.position}`);
        
        return randomTarget;
    }

    // ============================================
    // CREATURE COUNTING
    // ============================================

    // Count all living creatures in Alice's team
    countTeamCreatures(alice) {
        const alliedSide = alice.side;
        const alliedHeroes = alliedSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;

        let totalCreatures = 0;

        ['left', 'center', 'right'].forEach(position => {
            const hero = alliedHeroes[position];
            if (hero && hero.creatures) {
                const livingCreatures = hero.creatures.filter(creature => creature.alive && creature.currentHp > 0);
                totalCreatures += livingCreatures.length;
                
                if (livingCreatures.length > 0) {
                    console.log(`🔴 ${hero.name} has ${livingCreatures.length} living creatures`);
                }
            }
        });

        console.log(`🔴 Alice's team has ${totalCreatures} total living creatures`);
        return totalCreatures;
    }

    // ============================================
    // DAMAGE APPLICATION
    // ============================================

    // Apply Alice's laser damage to target
    applyLaserDamage(target, damage, alice) {
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'spell', // Alice's laser is magical
                attacker: alice
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
                source: 'spell', // Alice's laser is magical
                attacker: alice
            });
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Execute laser animation and damage application
    async executeLaserAnimation(alice, target, damage, isResisted = false) {
        // Get Alice's element
        const aliceElement = this.battleManager.getHeroElement(alice.side, alice.position);
        
        // Get target element
        const targetElement = this.getTargetElement(target);
        
        if (!aliceElement || !targetElement) {
            console.error('Could not find Alice or target elements for laser animation');
            return;
        }

        // Create red laser beam
        const laser = this.createRedLaser(aliceElement, targetElement);
        
        if (laser) {
            this.activeLasers.add(laser);
        }

        // Apply damage after brief delay if not resisted
        if (!isResisted) {
            setTimeout(() => {
                this.applyLaserDamage(target, damage, alice);
            }, this.battleManager.getSpeedAdjustedDelay(100));
        }

        // Keep laser visible for duration
        await this.battleManager.delay(this.LASER_DURATION);
        
        // Remove laser with fade effect
        await this.removeLaser(laser);

        this.battleManager.addCombatLog(
            `🔴 Alice's opening laser dissipates!`,
            'info'
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

    // Create red laser beam between Alice and target
    createRedLaser(fromElement, toElement) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create laser: missing elements');
            return null;
        }

        // Additional validation: ensure elements are still in DOM
        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            console.warn('Cannot create laser: elements not in DOM');
            return null;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            // Validate that elements have valid dimensions
            if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
                console.warn('Cannot create laser: elements have invalid dimensions');
                return null;
            }

            // Calculate center positions
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid laser coordinates detected:', { fromX, fromY, toX, toY });
                return null;
            }

            // Calculate line properties
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Prevent lasers that are too short or too long (likely errors)
            if (distance < 10 || distance > 2000) {
                console.warn(`Invalid laser distance: ${distance}px`);
                return null;
            }
            
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

            // Create the main laser element
            const laser = document.createElement('div');
            laser.className = 'alice-red-laser';
            laser.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: ${distance}px;
                height: 4px;
                background: linear-gradient(90deg, 
                    rgba(255, 0, 0, 0.9) 0%, 
                    rgba(255, 100, 100, 1) 25%,
                    rgba(255, 255, 255, 1) 50%,
                    rgba(255, 100, 100, 1) 75%,
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
                animation: aliceRedLaserPulse 0.15s ease-in-out infinite alternate;
            `;

            // Add laser core effect
            const core = document.createElement('div');
            core.className = 'alice-laser-core';
            core.style.cssText = `
                position: absolute;
                top: -1px;
                left: 0;
                right: 0;
                bottom: -1px;
                background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.9) 50%, transparent 100%);
                animation: aliceLaserCore 0.1s linear infinite;
            `;
            
            laser.appendChild(core);
            document.body.appendChild(laser);
            
            console.log(`🔴 Created red laser: ${distance.toFixed(1)}px at ${angle.toFixed(1)}°`);
            return laser;
            
        } catch (error) {
            console.error('Error creating red laser:', error);
            return null;
        }
    }

    // Remove laser with fade effect
    async removeLaser(laser) {
        if (!laser || !laser.parentNode) {
            return;
        }

        try {
            laser.classList.add('alice-laser-fadeout');
            this.activeLasers.delete(laser);
        } catch (error) {
            console.warn('Error adding fadeout class to laser:', error);
        }

        await this.battleManager.delay(200);
        
        try {
            if (laser && laser.parentNode) {
                laser.remove();
            }
        } catch (error) {
            console.warn('Error removing laser element:', error);
        }
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the laser effect to battle log
    logLaserEffect(alice, target, damage, creatureCount) {
        const aliceSide = alice.side;
        const logType = aliceSide === 'player' ? 'success' : 'error';
        
        const targetName = target.type === 'hero' 
            ? target.hero.name 
            : target.creature.name;
        
        // Main laser effect log
        this.battleManager.addCombatLog(
            `🔴 Alice's red laser strikes ${targetName} for ${damage} damage! (${creatureCount} creatures × ${this.DAMAGE_PER_CREATURE})`,
            logType
        );
    }

    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================

    // Send laser effect data to guest for synchronization
    sendLaserEffectUpdate(alice, target, damage, creatureCount, isResisted) {
        this.battleManager.sendBattleUpdate('alice_laser_effect', {
            aliceData: {
                side: alice.side,
                position: alice.position,
                name: alice.name,
                absoluteSide: alice.absoluteSide
            },
            target: {
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null
            },
            damage: damage,
            creatureCount: creatureCount,
            isResisted: isResisted,
            laserDuration: this.LASER_DURATION
        });
    }

    // Handle Alice laser effect on guest side
    handleGuestLaserEffect(data) {
        const { aliceData, target, damage, creatureCount, isResisted, laserDuration } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const aliceLocalSide = (aliceData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (!isResisted) {
            const targetName = target.type === 'hero' ? target.heroName : target.creatureName;
            
            this.battleManager.addCombatLog(
                `🔴 Alice's red laser strikes ${targetName} for ${damage} damage! (${creatureCount} creatures × ${this.DAMAGE_PER_CREATURE})`,
                aliceLocalSide === 'player' ? 'success' : 'error'
            );
        }

        // Start guest animation immediately
        this.createGuestLaser(aliceData, target, laserDuration, myAbsoluteSide);
    }

    // Create laser on guest side
    async createGuestLaser(aliceData, targetData, duration, myAbsoluteSide) {
        const aliceLocalSide = (aliceData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const aliceElement = this.battleManager.getHeroElement(aliceLocalSide, aliceData.position);

        if (!aliceElement) {
            console.warn('Alice element not found on guest side');
            return;
        }

        // Find target element
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

        if (!targetElement) {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
            return;
        }

        // Create laser
        const laser = this.createRedLaser(aliceElement, targetElement);
        if (laser) {
            this.activeLasers.add(laser);
        }

        console.log(`🔴 Guest created red laser`);

        // Remove laser after duration
        await this.battleManager.delay(duration);
        await this.removeLaser(laser);
        
        this.battleManager.addCombatLog(`🔴 Alice's opening laser dissipates!`, 'info');
    }

    // ============================================
    // CSS STYLES
    // ============================================

    // Inject CSS styles for Alice's laser effects
    injectAliceLaserStyles() {
        if (document.getElementById('aliceLaserStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'aliceLaserStyles';
        style.textContent = `
            /* Alice Red Laser Styles */
            .alice-red-laser {
                border-radius: 2px;
                position: relative;
                overflow: hidden;
            }

            .alice-laser-core {
                pointer-events: none;
                border-radius: 2px;
            }

            @keyframes aliceRedLaserPulse {
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
                        0 0 20px rgba(255, 0, 0, 1),
                        0 0 40px rgba(255, 0, 0, 0.8),
                        inset 0 1px 0 rgba(255, 255, 255, 1);
                }
            }

            @keyframes aliceLaserCore {
                0% { 
                    transform: scaleX(0.9);
                    opacity: 0.7;
                }
                50% { 
                    transform: scaleX(1.1);
                    opacity: 1;
                }
                100% { 
                    transform: scaleX(0.9);
                    opacity: 0.7;
                }
            }

            .alice-laser-fadeout {
                animation: aliceLaserFadeOut 0.2s ease-out forwards !important;
            }

            @keyframes aliceLaserFadeOut {
                0% { 
                    opacity: 1;
                }
                100% { 
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // CLEANUP
    // ============================================

    // Clean up all active lasers
    cleanup() {
        console.log(`Cleaning up ${this.activeLasers.size} active Alice lasers`);
        
        this.activeLasers.forEach(laser => {
            try {
                if (laser && laser.parentNode) {
                    laser.remove();
                }
            } catch (error) {
                console.warn('Error removing laser during cleanup:', error);
            }
        });
        
        this.activeLasers.clear();

        // Remove any orphaned laser elements
        try {
            const orphanedLasers = document.querySelectorAll('.alice-red-laser');
            orphanedLasers.forEach(laser => {
                if (laser.parentNode) {
                    laser.remove();
                }
            });
            
            if (orphanedLasers.length > 0) {
                console.log(`Cleaned up ${orphanedLasers.length} orphaned Alice lasers`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned lasers:', error);
        }
    }
}