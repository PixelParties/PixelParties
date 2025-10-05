// ./Creatures/skeletonHealer.js - Skeleton Healer Creature Module

export class SkeletonHealerCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeHealingEffects = new Set(); // Track active healing effects for cleanup
        
        // Skeleton Healer stats
        this.TURN_HEAL_AMOUNT = 30;
        this.DEATH_HEAL_AMOUNT = 50;
        this.DEATH_HEAL_TARGET_COUNT = 3;
        this.HEALING_EFFECT_DURATION = 1200; // 1.2 second healing effect
        
        // Inject CSS styles
        this.injectSkeletonHealerStyles();
        
        console.log('💚 Skeleton Healer Creature module initialized');
    }

    // Check if a creature is Skeleton Healer
    static isSkeletonHealer(creatureName) {
        return creatureName === 'SkeletonHealer';
    }

    // ============================================
    // TARGETING SYSTEM
    // ============================================

    // Find ally targets prioritizing by HP deficit
    findAllyTargets(healerActor, minHpDeficit = 0, maxTargets = 1) {
        const healerCreature = healerActor.data;
        const healerHero = healerActor.hero;
        const healerSide = healerHero.side;
        
        // Get all allied heroes and creatures
        const allies = healerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const potentialTargets = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = allies[position];
            if (hero && hero.alive) {
                // Add hero as potential target
                const heroHpDeficit = hero.maxHp - hero.currentHp;
                if (heroHpDeficit > 0) {
                    potentialTargets.push({
                        type: 'hero',
                        hero: hero,
                        position: position,
                        side: healerSide,
                        hpDeficit: heroHpDeficit,
                        priority: this.calculateHealingPriority(heroHpDeficit, minHpDeficit)
                    });
                }
                
                // Add living creatures as potential targets
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, creatureIndex) => {
                        if (creature.alive) {
                            // Skip self-targeting
                            if (creature === healerCreature) {
                                return;
                            }
                            
                            const creatureHpDeficit = creature.maxHp - creature.currentHp;
                            if (creatureHpDeficit > 0) {
                                potentialTargets.push({
                                    type: 'creature',
                                    hero: hero,
                                    creature: creature,
                                    creatureIndex: creatureIndex,
                                    position: position,
                                    side: healerSide,
                                    hpDeficit: creatureHpDeficit,
                                    priority: this.calculateHealingPriority(creatureHpDeficit, minHpDeficit)
                                });
                            }
                        }
                    });
                }
            }
        });
        
        if (potentialTargets.length === 0) {
            return [];
        }
        
        // Sort by priority (higher priority first), then by HP deficit (higher deficit first)
        potentialTargets.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return b.hpDeficit - a.hpDeficit;
        });
        
        // Select up to maxTargets from the sorted list
        const selectedTargets = [];
        for (let i = 0; i < Math.min(maxTargets, potentialTargets.length); i++) {
            selectedTargets.push(potentialTargets[i]);
        }
        
        return selectedTargets;
    }

    // Calculate healing priority based on HP deficit
    calculateHealingPriority(hpDeficit, minHpDeficit) {
        if (hpDeficit >= minHpDeficit) {
            return 2; // High priority - meets minimum deficit
        } else if (hpDeficit > 0) {
            return 1; // Low priority - has some deficit but below minimum
        } else {
            return 0; // No priority - full HP
        }
    }

    // ============================================
    // TURN ACTION (REGULAR HEALING)
    // ============================================

    // Execute Skeleton Healer special attack (healing)
    async executeSpecialAttack(healerActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const healerCreature = healerActor.data;
        const healerHero = healerActor.hero;
        const healerSide = healerHero.side;
        
        // Safety check: ensure Skeleton Healer is still alive
        if (!healerCreature.alive || healerCreature.currentHp <= 0) {
            console.log(`Skeleton Healer is dead, cannot execute healing`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `💚 ${healerCreature.name} channels healing energy!`, 
            healerSide === 'player' ? 'success' : 'error'
        );

        // Find target with priority for 30+ HP deficit
        const targets = this.findAllyTargets(healerActor, 30, 1);
        
        if (targets.length === 0) {
            this.battleManager.addCombatLog(
                `🩹 ${healerCreature.name} finds no wounded allies to heal!`, 
                'info'
            );
            return;
        }
        
        const target = targets[0];
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        
        // Log target selection
        this.battleManager.addCombatLog(
            `🎯 ${healerCreature.name} focuses healing energy on ${targetName}!`, 
            healerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE starting host healing
        this.sendTurnHealingUpdate(healerActor, target, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute healing with visual effects
        await this.executeHealing(healerActor, [target], this.TURN_HEAL_AMOUNT, 'turn');
    }

    // ============================================
    // DEATH EFFECT (MASS HEALING)
    // ============================================

    // Execute death healing when Skeleton Healer dies (heal up to 3 allies)
    async executeDeathHealing(dyingHealer, heroOwner, position, side) {
        if (!this.battleManager.isAuthoritative) return;

        const healerCreature = dyingHealer;
        const healerSide = side;
        
        this.battleManager.addCombatLog(
            `💀💚 ${healerCreature.name} releases its life force to heal its allies!`, 
            'info'
        );

        // Create a temporary actor object for targeting
        const healerActor = {
            data: healerCreature,
            hero: heroOwner,
            index: heroOwner.creatures.indexOf(healerCreature)
        };

        // Find up to 3 targets with priority for 50+ HP deficit
        const targets = this.findAllyTargets(healerActor, 50, this.DEATH_HEAL_TARGET_COUNT);
        
        if (targets.length === 0) {
            this.battleManager.addCombatLog(
                `🩹 ${healerCreature.name}'s final blessing finds no wounded allies!`, 
                'info'
            );
            return;
        }

        // Send death healing data to guest for synchronization
        this.sendDeathHealingUpdate(healerCreature, heroOwner, position, healerSide, targets);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(100);

        // Execute the death healing
        await this.executeHealing(healerActor, targets, this.DEATH_HEAL_AMOUNT, 'death');
    }

    // ============================================
    // CORE HEALING EXECUTION
    // ============================================

    // Execute healing with visual effects
    async executeHealing(healerActor, targets, healAmount, healingType) {
        const healerCreature = healerActor.data;
        const healingResults = [];
        
        // Apply healing to all targets simultaneously
        targets.forEach(target => {
            let actualHeal = 0;
            
            if (target.type === 'hero') {
                const oldHp = target.hero.currentHp;
                const healResult = target.hero.heal(healAmount);
                actualHeal = healResult.newHp - oldHp;
                
                // Update hero health bar
                this.battleManager.updateHeroHealthBar(target.side, target.position, target.hero.currentHp, target.hero.maxHp);
                
                // Send individual hero healing update
                this.battleManager.sendBattleUpdate('hero_healed', {
                    targetAbsoluteSide: target.hero.absoluteSide,
                    targetPosition: target.position,
                    targetName: target.hero.name,
                    healing: actualHeal,
                    oldHp: oldHp,
                    newHp: target.hero.currentHp,
                    maxHp: target.hero.maxHp,
                    timestamp: Date.now()
                });
                
            } else if (target.type === 'creature') {
                const oldHp = target.creature.currentHp;
                target.creature.currentHp = Math.min(target.creature.maxHp, target.creature.currentHp + healAmount);
                actualHeal = target.creature.currentHp - oldHp;
                
                // Update creature health bar
                this.battleManager.updateCreatureHealthBar(target.side, target.position, target.creatureIndex, target.creature.currentHp, target.creature.maxHp);
                
                // Send individual creature healing update
                this.battleManager.sendBattleUpdate('creature_healed', {
                    heroAbsoluteSide: target.hero.absoluteSide,
                    heroPosition: target.position,
                    creatureIndex: target.creatureIndex,
                    creatureName: target.creature.name,
                    healing: actualHeal,
                    oldHp: oldHp,
                    newHp: target.creature.currentHp,
                    maxHp: target.creature.maxHp,
                    timestamp: Date.now()
                });
            }
            
            healingResults.push({
                target: target,
                actualHeal: actualHeal
            });
        });
        
        // Create orbital laser healing effects for all targets
        await this.createOrbitalLaserEffects(targets, healingType);
        
        // Log healing results
        healingResults.forEach(result => {
            const targetName = result.target.type === 'creature' ? result.target.creature.name : result.target.hero.name;
            this.battleManager.addCombatLog(
                `💚 ${targetName} is healed for ${result.actualHeal} HP!`, 
                'success'
            );
        });
        
        const totalTargets = targets.length;
        const effectDescription = healingType === 'death' ? 'final blessing' : 'healing magic';
        this.battleManager.addCombatLog(
            `✨ ${healerCreature.name}'s ${effectDescription} affects ${totalTargets} ${totalTargets === 1 ? 'ally' : 'allies'}!`, 
            'info'
        );
    }

    // ============================================
    // VISUAL EFFECTS (ORBITAL LASER)
    // ============================================

    // Create orbital laser healing effects for all targets
    async createOrbitalLaserEffects(targets, healingType) {
        const laserPromises = [];
        
        // Create orbital laser for each target
        targets.forEach((target, index) => {
            // Stagger the laser effects slightly for visual appeal
            const delay = index * this.battleManager.getSpeedAdjustedDelay(150);
            
            const laserPromise = new Promise(async (resolve) => {
                await this.battleManager.delay(delay);
                await this.createOrbitalLaserEffect(target, healingType);
                resolve();
            });
            
            laserPromises.push(laserPromise);
        });
        
        // Wait for all laser effects to complete
        await Promise.all(laserPromises);
    }

    // Create single orbital laser healing effect
    async createOrbitalLaserEffect(target, healingType) {
        const targetElement = this.getTargetElement(target);
        
        if (!targetElement) {
            console.warn('Target element not found for orbital laser effect');
            return;
        }
        
        const targetRect = targetElement.getBoundingClientRect();
        const centerX = targetRect.left + targetRect.width / 2;
        const centerY = targetRect.top + targetRect.height / 2;
        
        // Create orbital laser container
        const laserContainer = document.createElement('div');
        laserContainer.className = 'skeleton-healer-orbital-laser';
        
        // Calculate speed-adjusted duration
        const adjustedDuration = this.battleManager.getSpeedAdjustedDelay(this.HEALING_EFFECT_DURATION);
        
        laserContainer.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 100px;
            height: 100px;
            transform: translate(-50%, -50%);
            z-index: 1500;
            pointer-events: none;
            animation: orbitalLaserHealing ${adjustedDuration}ms ease-out forwards;
        `;
        
        // Create the laser beam
        const laserBeam = document.createElement('div');
        laserBeam.className = 'orbital-laser-beam';
        laserBeam.style.cssText = `
            position: absolute;
            left: 50%;
            top: -200px;
            width: 8px;
            height: 200px;
            background: linear-gradient(180deg, 
                transparent 0%,
                rgba(76, 175, 80, 0.3) 20%,
                rgba(76, 175, 80, 0.8) 60%,
                rgba(76, 175, 80, 1) 100%);
            transform: translateX(-50%);
            box-shadow: 
                0 0 20px rgba(76, 175, 80, 0.8),
                inset 0 0 10px rgba(255, 255, 255, 0.3);
            animation: laserBeamGlow ${adjustedDuration}ms ease-out forwards;
        `;
        
        // Create the impact effect
        const impactEffect = document.createElement('div');
        impactEffect.className = 'orbital-laser-impact';
        impactEffect.innerHTML = '💚✨💚';
        impactEffect.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            opacity: 0;
            animation: laserImpactGlow ${adjustedDuration}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(76, 175, 80, 1),
                0 0 30px rgba(76, 175, 80, 0.8);
        `;
        
        // Create healing particles
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'healing-particle';
            particle.innerHTML = '✨';
            
            const angle = (i / 6) * 360;
            const radius = 40;
            const particleX = Math.cos(angle * Math.PI / 180) * radius;
            const particleY = Math.sin(angle * Math.PI / 180) * radius;
            
            particle.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                font-size: 16px;
                color: #4CAF50;
                opacity: 0;
                animation: healingParticle${i} ${adjustedDuration}ms ease-out forwards;
                text-shadow: 0 0 10px rgba(76, 175, 80, 0.8);
            `;
            
            // Create unique animation for each particle
            const particleStyleId = `healingParticle${i}-${Date.now()}`;
            if (!document.getElementById(particleStyleId)) {
                const particleStyle = document.createElement('style');
                particleStyle.id = particleStyleId;
                particleStyle.textContent = `
                    @keyframes healingParticle${i} {
                        0% { 
                            opacity: 0;
                            transform: translate(-50%, -50%) scale(0.5);
                        }
                        30% { 
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1.2);
                        }
                        70% { 
                            opacity: 0.8;
                            transform: translate(calc(-50% + ${particleX}px), calc(-50% + ${particleY}px)) scale(1.0);
                        }
                        100% { 
                            opacity: 0;
                            transform: translate(calc(-50% + ${particleX * 1.5}px), calc(-50% + ${particleY * 1.5}px)) scale(0.3);
                        }
                    }
                `;
                document.head.appendChild(particleStyle);
            }
            
            laserContainer.appendChild(particle);
        }
        
        laserContainer.appendChild(laserBeam);
        laserContainer.appendChild(impactEffect);
        
        document.body.appendChild(laserContainer);
        this.activeHealingEffects.add(laserContainer);
        
        // Wait for effect to complete
        await this.battleManager.delay(adjustedDuration);
        
        // Remove the effect
        this.removeHealingEffect(laserContainer);
    }

    // Get the DOM element for a target (reused from SkeletonArcher pattern)
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

    // Remove healing effect with cleanup
    removeHealingEffect(effect) {
        if (effect && effect.parentNode) {
            this.activeHealingEffects.delete(effect);
            effect.remove();
        }
    }

    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================

    // Send turn healing data to guest for synchronization
    sendTurnHealingUpdate(healerActor, target, position) {
        const healerSide = healerActor.hero.side;
        
        this.battleManager.sendBattleUpdate('skeleton_healer_turn_healing', {
            healerData: {
                side: healerSide,
                position: position,
                creatureIndex: healerActor.index,
                name: healerActor.data.name,
                absoluteSide: healerActor.hero.absoluteSide
            },
            target: {
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex !== undefined ? target.creatureIndex : null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null
            },
            healAmount: this.TURN_HEAL_AMOUNT,
            healingType: 'turn'
        });
    }

    // Send death healing data to guest for synchronization
    sendDeathHealingUpdate(healerCreature, heroOwner, position, healerSide, targets) {
        this.battleManager.sendBattleUpdate('skeleton_healer_death_healing', {
            healerData: {
                side: healerSide,
                position: position,
                creatureIndex: heroOwner.creatures.indexOf(healerCreature),
                name: healerCreature.name,
                absoluteSide: heroOwner.absoluteSide
            },
            targets: targets.map(target => ({
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex !== undefined ? target.creatureIndex : null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null,
                hpDeficit: target.hpDeficit
            })),
            healAmount: this.DEATH_HEAL_AMOUNT,
            healingType: 'death',
            targetCount: targets.length
        });
    }

    // Handle turn healing on guest side
    async handleGuestTurnHealing(data) {
        const { healerData, target, healAmount, healingType } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const healerLocalSide = (healerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💚 ${healerData.name} channels healing energy!`, 
            healerLocalSide === 'player' ? 'success' : 'error'
        );

        // Create guest healing effect
        await this.createGuestHealingEffect(healerData, [target], healAmount, healingType, myAbsoluteSide);
    }

    // Handle death healing on guest side
    async handleGuestDeathHealing(data) {
        const { healerData, targets, healAmount, healingType } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        
        this.battleManager.addCombatLog(
            `💀💚 ${healerData.name} releases its life force to heal its allies!`, 
            'info'
        );

        // Create guest healing effects for all targets
        await this.createGuestHealingEffect(healerData, targets, healAmount, healingType, myAbsoluteSide);
    }

    // Create healing effect on guest side
    async createGuestHealingEffect(healerData, targetsData, healAmount, healingType, myAbsoluteSide) {
        // Convert target data to local targets for visual effects
        const localTargets = targetsData.map(targetData => {
            const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            
            return {
                type: targetData.type,
                side: targetLocalSide,
                position: targetData.position,
                creatureIndex: targetData.creatureIndex,
                hero: { name: targetData.heroName },
                creature: { name: targetData.creatureName }
            };
        }).filter(target => {
            // Validate target data to prevent DOM query failures
            if (target.type === 'creature') {
                // Ensure creatureIndex is a valid number for creatures
                if (target.creatureIndex === null || target.creatureIndex === undefined) {
                    console.warn('Guest: Invalid creatureIndex for creature target:', target);
                    return false;
                }
            }
            return true;
        });

        // Create orbital laser effects (visual only on guest)
        await this.createOrbitalLaserEffects(localTargets, healingType);

        // Log healing messages (damage is applied by host via separate messages)
        localTargets.forEach(target => {
            const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
            this.battleManager.addCombatLog(
                `💚 ${targetName} is healed for ${healAmount} HP!`, 
                'success'
            );
        });

        const totalTargets = localTargets.length;
        const effectDescription = healingType === 'death' ? 'final blessing' : 'healing magic';
        this.battleManager.addCombatLog(
            `✨ ${healerData.name}'s ${effectDescription} affects ${totalTargets} ${totalTargets === 1 ? 'ally' : 'allies'}!`, 
            'info'
        );
    }

    // ============================================
    // CSS STYLES
    // ============================================

    // Inject CSS styles for Skeleton Healer effects
    injectSkeletonHealerStyles() {
        if (document.getElementById('skeletonHealerCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'skeletonHealerCreatureStyles';
        style.textContent = `
            /* Skeleton Healer Orbital Laser Styles */
            @keyframes orbitalLaserHealing {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                20% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0);
                }
                80% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }

            @keyframes laserBeamGlow {
                0% { 
                    opacity: 0;
                    height: 0px;
                    top: 50px;
                }
                30% { 
                    opacity: 0.8;
                    height: 150px;
                    top: -100px;
                }
                70% { 
                    opacity: 1;
                    height: 200px;
                    top: -200px;
                    box-shadow: 
                        0 0 30px rgba(76, 175, 80, 1),
                        0 0 60px rgba(76, 175, 80, 0.6),
                        inset 0 0 15px rgba(255, 255, 255, 0.4);
                }
                100% { 
                    opacity: 0;
                    height: 200px;
                    top: -200px;
                }
            }

            @keyframes laserImpactGlow {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                40% { 
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.5);
                }
                60% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.8);
                    text-shadow: 
                        0 0 25px rgba(76, 175, 80, 1),
                        0 0 50px rgba(76, 175, 80, 0.8),
                        0 0 75px rgba(76, 175, 80, 0.6);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(2.2);
                }
            }

            /* Enhanced creature glow when Skeleton Healer is channeling */
            .creature-icon.healer-channeling .creature-sprite {
                filter: brightness(1.4) drop-shadow(0 0 15px rgba(76, 175, 80, 0.8));
                animation: healerChannelGlow 1s ease-in-out infinite alternate;
            }

            @keyframes healerChannelGlow {
                0% { 
                    filter: brightness(1.4) drop-shadow(0 0 15px rgba(76, 175, 80, 0.8));
                }
                100% { 
                    filter: brightness(1.8) drop-shadow(0 0 25px rgba(139, 195, 74, 1));
                }
            }

            /* Orbital laser beam effects */
            .orbital-laser-beam {
                border-radius: 4px;
                position: relative;
                overflow: visible;
            }

            .orbital-laser-beam::before {
                content: '';
                position: absolute;
                left: 50%;
                top: 0;
                width: 2px;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                transform: translateX(-50%);
                animation: laserCore 0.2s ease-in-out infinite alternate;
            }

            @keyframes laserCore {
                0% { opacity: 0.7; }
                100% { opacity: 1; }
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Clean up all active healing effects (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeHealingEffects.size} active Skeleton Healer healing effects`);
        
        this.activeHealingEffects.forEach(effect => {
            try {
                if (effect && effect.parentNode) {
                    effect.remove();
                }
            } catch (error) {
                console.warn('Error removing healing effect during cleanup:', error);
            }
        });
        
        this.activeHealingEffects.clear();

        // Also remove any orphaned healing effect elements
        try {
            const orphanedEffects = document.querySelectorAll('.skeleton-healer-orbital-laser');
            orphanedEffects.forEach(effect => {
                if (effect.parentNode) {
                    effect.remove();
                }
            });
            
            if (orphanedEffects.length > 0) {
                console.log(`Cleaned up ${orphanedEffects.length} orphaned Skeleton Healer effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned healing effects:', error);
        }
    }
}

// Static helper methods
export const SkeletonHealerHelpers = {
    // Check if any creature in a list is Skeleton Healer
    hasSkeletonHealerInList(creatures) {
        return creatures.some(creature => SkeletonHealerCreature.isSkeletonHealer(creature.name));
    },

    // Get all Skeleton Healer creatures from a list
    getSkeletonHealerFromList(creatures) {
        return creatures.filter(creature => SkeletonHealerCreature.isSkeletonHealer(creature.name));
    },

    // Add channeling visual effect to Skeleton Healer
    addChannelingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('healer-channeling');
        }
    },

    // Remove channeling visual effect from Skeleton Healer
    removeChannelingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('healer-channeling');
        }
    }
};

export default SkeletonHealerCreature;