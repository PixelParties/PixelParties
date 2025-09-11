// ./Creatures/graveWorm.js - GraveWorm Creature with Self-Cloning on Ally Sacrifice + Bite Attack
// Now with maximum 3 clones per sacrifice trigger

import { getCardInfo } from '../cardDatabase.js';

export class GraveWormCreature {
    constructor(heroSelection) {
        this.heroSelection = heroSelection;
        this.activeWormEffects = new Set(); // Track active visual effects for cleanup
        this.activeBiteEffects = new Set(); // Track active bite effects for cleanup
        
        // Track which GraveWorms have already triggered this turn
        // Key: "heroPosition-creatureIndex", Value: turn number when triggered
        this.wormTriggeredThisTurn = new Map();
        
        // NEW: Track clones created per sacrifice event to cap at 3
        this.currentSacrificeId = null; // Track current sacrifice event
        this.clonesCreatedThisSacrifice = 0; // Track clones created for current sacrifice
        this.MAX_CLONES_PER_SACRIFICE = 3; // Maximum clones per sacrifice trigger
        
        // GraveWorm animation timing - UPDATED: 3x faster animations
        this.CLONE_ANIMATION_TIME = 267; // 0.267 second clone animation (was 800ms)
        this.BITE_DAMAGE = 10; // Bite damage amount
        this.BITE_ANIMATION_TIME = 200; // 0.2 second bite animation (was 600ms)
        
        // Inject CSS styles
        this.injectGraveWormStyles();
        
        // Set up sacrifice event listener
        this.setupSacrificeListener();
        
        console.log('🪱 GraveWorm Creature module initialized with clone cap of', this.MAX_CLONES_PER_SACRIFICE);
    }

    // Check if a creature is GraveWorm
    static isGraveWorm(creatureName) {
        return creatureName === 'GraveWorm';
    }

    // ============================================
    // BITE ATTACK FUNCTIONALITY (unchanged)
    // ============================================

    // Execute GraveWorm bite attack
    async executeSpecialAttack(graveWormActor, position) {
        if (!this.heroSelection.isAuthoritative) return;

        const graveWormCreature = graveWormActor.data;
        const graveWormHero = graveWormActor.hero;
        const attackerSide = graveWormHero.side;
        
        // Safety check: ensure GraveWorm is still alive
        if (!graveWormCreature.alive || graveWormCreature.currentHp <= 0) {
            console.log(`GraveWorm is dead, cannot execute bite attack`);
            return;
        }
        
        this.heroSelection.addCombatLog(
            `🪱 ${graveWormCreature.name} prepares to bite!`, 
            attackerSide === 'player' ? 'success' : 'error',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );

        // Use standard targeting system (reusing existing code)
        const target = this.heroSelection.combatManager.authoritative_findTargetWithCreatures(
            position, 
            attackerSide
        );
        
        if (!target) {
            this.heroSelection.addCombatLog(
                `💨 ${graveWormCreature.name} finds no targets for its bite!`, 
                'info',
                null,
                { 
                    isCreatureMessage: true,
                    isCreatureDeathMessage: false
                }
            );
            return;
        }
        
        // Log target acquisition
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.heroSelection.addCombatLog(
            `🎯 ${graveWormCreature.name} targets ${targetName} with a gruesome bite!`, 
            attackerSide === 'player' ? 'success' : 'error',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );

        // Send synchronization data to guest (reusing existing pattern)
        this.sendBiteAttackUpdate(graveWormActor, target, position);

        // Short delay to ensure guest receives the message
        await this.heroSelection.delay(50);

        // Execute bite attack with visual effects
        await this.executeBiteAttack(graveWormActor, target, position);
    }

    // Execute the bite attack with visual effects (host side)
    async executeBiteAttack(graveWormActor, target, position) {
        const attackerSide = graveWormActor.hero.side;
        const targetElement = this.getTargetElement(target);
        
        if (!targetElement) {
            console.error('Target element not found, cannot create bite');
            return;
        }
        
        // Create and execute bite animation
        const biteEffect = this.createBiteEffect(targetElement);
        if (!biteEffect) {
            console.error('Failed to create bite effect');
            return;
        }

        this.activeBiteEffects.add(biteEffect);

        // Calculate speed-adjusted animation time
        const adjustedAnimationTime = this.heroSelection.getSpeedAdjustedDelay(this.BITE_ANIMATION_TIME);
        
        // Wait for bite to appear
        await this.heroSelection.delay(adjustedAnimationTime * 0.3);
        
        // Apply damage when bite hits (reusing existing damage system)
        this.applyBiteDamage(target, graveWormActor.data);
        
        // Add impact effect
        this.createBiteImpactEffect(targetElement);
        
        // Wait for the rest of the bite animation to complete
        await this.heroSelection.delay(adjustedAnimationTime * 0.7);
        
        // Clean up bite effect
        this.removeBiteEffect(biteEffect);

        this.heroSelection.addCombatLog(
            `💥 The gruesome bite strikes true, dealing ${this.BITE_DAMAGE} damage!`, 
            'info',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );
    }

    // Get the DOM element for a target (reused from FrontSoldier)
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

    // Create gruesome bite effect
    createBiteEffect(targetElement) {
        if (!targetElement) {
            console.warn('Cannot create bite effect: missing target element');
            return null;
        }

        // Additional validation: ensure element is still in DOM
        if (!document.body.contains(targetElement)) {
            console.warn('Cannot create bite effect: target element not in DOM');
            return null;
        }

        try {
            const targetRect = targetElement.getBoundingClientRect();

            // Validate that target element has valid dimensions
            if (targetRect.width === 0 || targetRect.height === 0) {
                console.warn('Cannot create bite effect: target element has invalid dimensions');
                return null;
            }

            // Calculate target center position
            const targetX = targetRect.left + targetRect.width / 2;
            const targetY = targetRect.top + targetRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(targetX) || !isFinite(targetY)) {
                console.warn('Invalid bite coordinates detected:', { targetX, targetY });
                return null;
            }

            // Create the bite effect element at target location
            const biteEffect = document.createElement('div');
            biteEffect.className = 'graveworm-bite';
            
            // Calculate speed-adjusted animation time for CSS
            const adjustedAnimationTime = this.heroSelection.getSpeedAdjustedDelay(this.BITE_ANIMATION_TIME);
            
            biteEffect.style.cssText = `
                position: fixed;
                left: ${targetX}px;
                top: ${targetY}px;
                width: 60px;
                height: 40px;
                transform: translate(-50%, -50%);
                z-index: 1500;
                pointer-events: none;
                animation: graveWormBite ${adjustedAnimationTime}ms ease-out forwards;
            `;

            // Create bite mouth parts
            const upperJaw = document.createElement('div');
            upperJaw.className = 'bite-upper-jaw';
            upperJaw.style.cssText = `
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 50px;
                height: 15px;
                background: linear-gradient(45deg, #8b4513 0%, #654321 50%, #2d1810 100%);
                border-radius: 25px 25px 5px 5px;
                border: 2px solid #4a2c17;
                animation: biteUpperJaw ${adjustedAnimationTime}ms ease-out forwards;
            `;

            const lowerJaw = document.createElement('div');
            lowerJaw.className = 'bite-lower-jaw';
            lowerJaw.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 50px;
                height: 15px;
                background: linear-gradient(45deg, #654321 0%, #4a2c17 50%, #2d1810 100%);
                border-radius: 5px 5px 25px 25px;
                border: 2px solid #4a2c17;
                animation: biteLowerJaw ${adjustedAnimationTime}ms ease-out forwards;
            `;

            // Add teeth to jaws
            for (let i = 0; i < 5; i++) {
                const upperTooth = document.createElement('div');
                upperTooth.style.cssText = `
                    position: absolute;
                    bottom: -3px;
                    left: ${10 + i * 8}px;
                    width: 3px;
                    height: 6px;
                    background: #fff;
                    border-radius: 0 0 50% 50%;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.5);
                `;
                upperJaw.appendChild(upperTooth);

                const lowerTooth = document.createElement('div');
                lowerTooth.style.cssText = `
                    position: absolute;
                    top: -3px;
                    left: ${10 + i * 8}px;
                    width: 3px;
                    height: 6px;
                    background: #fff;
                    border-radius: 50% 50% 0 0;
                    box-shadow: 0 -1px 2px rgba(0,0,0,0.5);
                `;
                lowerJaw.appendChild(lowerTooth);
            }

            biteEffect.appendChild(upperJaw);
            biteEffect.appendChild(lowerJaw);
            
            document.body.appendChild(biteEffect);
            
            console.log(`Created bite effect at target, animation time: ${adjustedAnimationTime}ms`);
            return biteEffect;
            
        } catch (error) {
            console.error('Error creating bite effect:', error);
            return null;
        }
    }

    // Create bite impact effect at target location
    createBiteImpactEffect(targetElement) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const impact = document.createElement('div');
        impact.className = 'graveworm-bite-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 50px;
            height: 50px;
            background: radial-gradient(circle, 
                rgba(139, 69, 19, 0.9) 0%, 
                rgba(101, 67, 33, 0.7) 40%, 
                rgba(45, 24, 16, 0.5) 70%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: graveWormBiteImpact 0.4s ease-out forwards;
            box-shadow: 0 0 15px rgba(139, 69, 19, 0.8);
        `;

        document.body.appendChild(impact);

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 400);
    }

    // Remove bite effect with cleanup
    removeBiteEffect(biteEffect) {
        if (biteEffect && biteEffect.parentNode) {
            this.activeBiteEffects.delete(biteEffect);
            biteEffect.remove();
        }
    }

    // Apply GraveWorm bite damage to target (reusing existing damage system)
    applyBiteDamage(target, attackingGraveWorm = null) {
        const damage = this.BITE_DAMAGE;
        
        if (target.type === 'hero') {
            this.heroSelection.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'attack', // GraveWorm's bite is a physical attack
                attacker: attackingGraveWorm
            });
        } else if (target.type === 'creature') {
            this.heroSelection.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: target.position,
                side: target.side
            }, {
                source: 'attack', // GraveWorm's bite is a physical attack
                attacker: attackingGraveWorm
            });
        }
    }

    // Send bite attack data to guest for synchronization (reusing existing pattern)
    sendBiteAttackUpdate(graveWormActor, target, position) {
        const attackerSide = graveWormActor.hero.side;
        
        this.heroSelection.sendBattleUpdate('graveworm_bite_attack', {
            graveWormData: {
                side: attackerSide,
                position: position,
                creatureIndex: graveWormActor.index,
                name: graveWormActor.data.name,
                absoluteSide: graveWormActor.hero.absoluteSide
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
            damage: this.BITE_DAMAGE,
            animationTime: this.BITE_ANIMATION_TIME
        });
    }

    // Handle GraveWorm bite attack on guest side
    handleGuestBiteAttack(data) {
        const { graveWormData, target, damage, animationTime } = data;
        const myAbsoluteSide = this.heroSelection.isHost ? 'host' : 'guest';
        const graveWormLocalSide = (graveWormData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.heroSelection.addCombatLog(
            `🪱 ${graveWormData.name} unleashes a gruesome bite!`, 
            graveWormLocalSide === 'player' ? 'success' : 'error',
            null,
            { 
                isCreatureMessage: true,
                isCreatureDeathMessage: false
            }
        );

        // Start guest animation immediately
        this.createGuestBiteAttack(graveWormData, target, animationTime, myAbsoluteSide);
    }

    // Create bite attack on guest side
    async createGuestBiteAttack(graveWormData, targetData, animationTime, myAbsoluteSide) {
        // Find target element using absoluteSide mapping
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
            const biteEffect = this.createBiteEffect(targetElement);
            if (biteEffect) {
                this.activeBiteEffects.add(biteEffect);
            }

            // Calculate speed-adjusted animation time
            const adjustedAnimationTime = this.heroSelection.getSpeedAdjustedDelay(animationTime);
            
            // Wait for bite to appear, then show impact
            await this.heroSelection.delay(adjustedAnimationTime * 0.3);
            
            this.createBiteImpactEffect(targetElement);
            
            // Wait for the rest of the animation
            await this.heroSelection.delay(adjustedAnimationTime * 0.7);
            
            this.removeBiteEffect(biteEffect);

            // Log damage for target (but don't apply actual damage - host handles that)
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            this.heroSelection.addCombatLog(
                `🎯 ${targetName} is struck by the gruesome bite for ${this.BITE_DAMAGE} damage!`,
                targetLocalSide === 'player' ? 'error' : 'success',
                null,
                { 
                    isCreatureMessage: true,
                    isCreatureDeathMessage: false
                }
            );
        } else {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        }
    }

    // ============================================
    // CLONING FUNCTIONALITY (MODIFIED WITH CAP)
    // ============================================

    // Set up sacrifice event listener
    setupSacrificeListener() {
        // Hook into the HeroCreatureManager to listen for sacrifice events
        if (this.heroSelection.heroCreatureManager) {
            this.heroSelection.heroCreatureManager.onCreatureSacrificed = (sacrificeData) => {
                this.handleCreatureSacrifice(sacrificeData);
            };
        }
    }

    // Handle when a creature is sacrificed (MODIFIED)
    handleCreatureSacrifice(sacrificeData) {
        const { heroPosition, creatureIndex, creature, source } = sacrificeData;
        
        // Don't trigger on our own sacrifice
        if (GraveWormCreature.isGraveWorm(creature.name)) {
            console.log(`🪱 GraveWorm ignoring own sacrifice`);
            return;
        }
        
        console.log(`🪱 GraveWorm witnessing sacrifice of ${creature.name} from ${heroPosition}[${creatureIndex}]`);
        
        // NEW: Reset clone counter for new sacrifice event
        const sacrificeId = `${Date.now()}-${heroPosition}-${creatureIndex}-${creature.name}`;
        this.currentSacrificeId = sacrificeId;
        this.clonesCreatedThisSacrifice = 0;
        
        console.log(`🪱 Starting new sacrifice event (ID: ${sacrificeId}), clone cap: ${this.MAX_CLONES_PER_SACRIFICE}`);
        
        // Find all GraveWorms that can witness this sacrifice
        const currentTurn = this.heroSelection.getCurrentTurn();
        const formation = this.heroSelection.formationManager.getBattleFormation();
        
        // Check all hero positions for GraveWorms
        ['left', 'center', 'right'].forEach(position => {
            if (!formation[position]) return; // No hero at this position
            
            const heroCreatures = this.heroSelection.heroCreatureManager.getHeroCreatures(position);
            
            heroCreatures.forEach((heroCreature, index) => {
                if (GraveWormCreature.isGraveWorm(heroCreature.name)) {
                    this.tryTriggerGraveWormClone(position, index, heroCreature, currentTurn, sacrificeData);
                }
            });
        });
        
        // Log final clone count for this sacrifice
        console.log(`🪱 Sacrifice event complete: ${this.clonesCreatedThisSacrifice}/${this.MAX_CLONES_PER_SACRIFICE} clones created`);
    }

    // Try to trigger a GraveWorm clone (MODIFIED WITH CAP)
    tryTriggerGraveWormClone(heroPosition, creatureIndex, graveWorm, currentTurn, sacrificeData) {
        const wormKey = `${heroPosition}-${creatureIndex}`;
        
        // Check if this GraveWorm already triggered this turn
        const lastTriggeredTurn = this.wormTriggeredThisTurn.get(wormKey);
        if (lastTriggeredTurn === currentTurn) {
            console.log(`🪱 GraveWorm at ${wormKey} already triggered this turn (${currentTurn})`);
            return; // Already triggered this turn
        }
        
        // NEW: Check if we've already hit the clone cap for this sacrifice
        if (this.clonesCreatedThisSacrifice >= this.MAX_CLONES_PER_SACRIFICE) {
            console.log(`🪱 GraveWorm at ${wormKey} cannot create clone - cap reached (${this.clonesCreatedThisSacrifice}/${this.MAX_CLONES_PER_SACRIFICE})`);
            return; // Cap reached, no more clones
        }
        
        // Mark this GraveWorm as triggered this turn
        this.wormTriggeredThisTurn.set(wormKey, currentTurn);
        
        // Increment clone counter for this sacrifice
        this.clonesCreatedThisSacrifice++;
        
        console.log(`🪱 GraveWorm at ${wormKey} creating clone ${this.clonesCreatedThisSacrifice}/${this.MAX_CLONES_PER_SACRIFICE} (turn ${currentTurn})`);
        
        // Create clone of the GraveWorm
        this.createGraveWormClone(heroPosition, graveWorm, sacrificeData);
    }

    // Create an exact clone of the GraveWorm (unchanged)
    async createGraveWormClone(heroPosition, originalWorm, sacrificeData) {
        // Get the full card info for GraveWorm to ensure we have all properties
        const cardInfo = getCardInfo('GraveWorm');
        if (!cardInfo) {
            console.error('GraveWorm card not found in database');
            return;
        }
        
        // Create the clone with same stats as original, but use fresh card data as base
        const clone = {
            ...cardInfo,  // Start with fresh card data
            // Copy over any modified stats from the original
            maxHp: originalWorm.maxHp || cardInfo.hp,
            currentHp: originalWorm.currentHp || cardInfo.hp,
            hp: originalWorm.hp || cardInfo.hp,
            // Copy other potentially modified properties
            statusEffects: [...(originalWorm.statusEffects || [])], // Deep copy status effects
            counters: originalWorm.counters || 0,
            // Set metadata
            addedAt: Date.now(),
            type: 'creature',
            isPermanent: true, // Mark as permanent for persistence
            clonedFrom: originalWorm.name,
            triggeredBy: sacrificeData.creature.name
        };
        
        // Add to the hero's creatures array using the existing method
        const success = this.heroSelection.heroCreatureManager.addCreatureToHero(heroPosition, 'GraveWorm');
        
        if (success) {
            // Get the index of the newly added creature (should be last)
            const heroCreatures = this.heroSelection.heroCreatureManager.getHeroCreatures(heroPosition);
            const newCreatureIndex = heroCreatures.length - 1;
            
            // Replace the auto-generated creature with our custom clone
            if (this.heroSelection.heroCreatureManager.heroCreatures[heroPosition]) {
                this.heroSelection.heroCreatureManager.heroCreatures[heroPosition][newCreatureIndex] = clone;
            }
            
            // Show clone creation effect with delay to let UI update
            setTimeout(() => {
                this.playGraveWormCloneEffect(heroPosition, newCreatureIndex, sacrificeData);
            }, 100);
            
            // Notify state change
            if (this.heroSelection.heroCreatureManager.onStateChange) {
                this.heroSelection.heroCreatureManager.onStateChange();
            }
            
            // Save state
            await this.heroSelection.saveGameState();
            
            // Send formation update
            await this.heroSelection.sendFormationUpdate();
            
            console.log(`🪱 GraveWorm at ${heroPosition} created a clone in response to ${sacrificeData.creature.name} sacrifice`);
        } else {
            console.error(`🪱 Failed to add GraveWorm clone at ${heroPosition}`);
        }
    }

    // Play GraveWorm cloning visual effect (unchanged except animation time uses updated constant)
    playGraveWormCloneEffect(heroPosition, creatureIndex, sacrificeData) {
        // Find the new clone element
        const cloneElement = document.querySelector(
            `.hero-creatures[data-hero-position="${heroPosition}"] .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!cloneElement) {
            console.warn(`🪱 Could not find GraveWorm clone element at ${heroPosition}[${creatureIndex}] for clone effect`);
            return;
        }

        // Add cloning class for glow effect
        cloneElement.classList.add('cloning-graveworm');

        // Create cloning circle overlay with dark/earthy theme
        const cloningEffect = document.createElement('div');
        cloningEffect.className = 'graveworm-cloning-effect';
        cloningEffect.innerHTML = `
            <div class="cloning-circle-graveworm"></div>
            <div class="cloning-particles-graveworm">
                ${Array.from({length: 6}, (_, i) => 
                    `<div class="clone-particle-graveworm particle-${i + 1}"></div>`
                ).join('')}
            </div>
            <div class="sacrifice-tribute">
                <span class="tribute-text">Feeds on ${this.formatCreatureName(sacrificeData.creature.name)}</span>
            </div>
        `;
        
        // Position it over the clone
        cloneElement.style.position = 'relative';
        cloneElement.appendChild(cloningEffect);
        
        this.activeWormEffects.add(cloningEffect);
        
        // Remove effect and class after animation completes
        setTimeout(() => {
            if (cloningEffect.parentNode) {
                cloningEffect.parentNode.removeChild(cloningEffect);
            }
            cloneElement.classList.remove('cloning-graveworm');
            this.activeWormEffects.delete(cloningEffect);
        }, this.CLONE_ANIMATION_TIME);
    }

    // Format creature name for display (unchanged)
    formatCreatureName(creatureName) {
        return creatureName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Reset turn-based tracking (MODIFIED)
    resetTurnBasedTracking() {
        console.log(`🪱 Resetting GraveWorm turn-based tracking (${this.wormTriggeredThisTurn.size} entries cleared)`);
        this.wormTriggeredThisTurn.clear();
        
        // NEW: Also reset sacrifice tracking on turn change
        this.currentSacrificeId = null;
        this.clonesCreatedThisSacrifice = 0;
    }

    // Export state for saving (MODIFIED)
    exportState() {
        return {
            wormTriggeredThisTurn: Array.from(this.wormTriggeredThisTurn.entries()),
            currentSacrificeId: this.currentSacrificeId,
            clonesCreatedThisSacrifice: this.clonesCreatedThisSacrifice
        };
    }

    // Import state for loading (MODIFIED)
    importState(state) {
        if (!state) return false;

        if (state.wormTriggeredThisTurn) {
            this.wormTriggeredThisTurn = new Map(state.wormTriggeredThisTurn);
            console.log(`🪱 Restored ${this.wormTriggeredThisTurn.size} GraveWorm turn triggers from saved state`);
        }
        
        // NEW: Restore sacrifice tracking
        if (state.currentSacrificeId !== undefined) {
            this.currentSacrificeId = state.currentSacrificeId;
        }
        
        if (state.clonesCreatedThisSacrifice !== undefined) {
            this.clonesCreatedThisSacrifice = state.clonesCreatedThisSacrifice;
        }

        return true;
    }

    // Reset for new game (MODIFIED)
    reset() {
        this.wormTriggeredThisTurn.clear();
        // NEW: Reset sacrifice tracking
        this.currentSacrificeId = null;
        this.clonesCreatedThisSacrifice = 0;
        this.cleanup();
    }

    // Clean up all active effects (unchanged)
    cleanup() {
        console.log(`🪱 Cleaning up ${this.activeWormEffects.size} active GraveWorm clone effects and ${this.activeBiteEffects.size} bite effects`);
        
        // Clean up cloning effects
        this.activeWormEffects.forEach(wormEffect => {
            try {
                if (wormEffect && wormEffect.parentNode) {
                    wormEffect.remove();
                }
            } catch (error) {
                console.warn('Error removing worm effect during cleanup:', error);
            }
        });
        
        this.activeWormEffects.clear();

        // Clean up bite effects
        this.activeBiteEffects.forEach(biteEffect => {
            try {
                if (biteEffect && biteEffect.parentNode) {
                    biteEffect.remove();
                }
            } catch (error) {
                console.warn('Error removing bite effect during cleanup:', error);
            }
        });
        
        this.activeBiteEffects.clear();

        // Also remove any orphaned elements
        try {
            const orphanedWorms = document.querySelectorAll('.graveworm-cloning-effect');
            const orphanedBites = document.querySelectorAll('.graveworm-bite');
            
            orphanedWorms.forEach(wormEffect => {
                if (wormEffect.parentNode) {
                    wormEffect.remove();
                }
            });

            orphanedBites.forEach(biteEffect => {
                if (biteEffect.parentNode) {
                    biteEffect.remove();
                }
            });
            
            if (orphanedWorms.length > 0 || orphanedBites.length > 0) {
                console.log(`🪱 Cleaned up ${orphanedWorms.length} orphaned clone effects and ${orphanedBites.length} orphaned bite effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned effects:', error);
        }
    }

    // Inject CSS styles for GraveWorm effects - UPDATED: Uses faster animation durations in CSS
    injectGraveWormStyles() {
        if (document.getElementById('graveWormCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'graveWormCreatureStyles';
        style.textContent = `
            /* GraveWorm Cloning Effect - Dark/Earthy Theme */
            .graveworm-cloning-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }

            /* Cloning Circle - Dark purple/brown */
            .cloning-circle-graveworm {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 45px;
                height: 45px;
                border: 3px solid rgba(139, 69, 19, 0.9);
                border-radius: 50%;
                box-shadow: 
                    0 0 20px rgba(139, 69, 19, 0.8),
                    0 0 40px rgba(101, 67, 33, 0.6),
                    inset 0 0 15px rgba(160, 82, 45, 0.4);
                animation: cloneCircleAppearGraveWorm 0.267s ease-out;
            }

            /* Cloning Particles - Dark earth tones */
            .cloning-particles-graveworm {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .clone-particle-graveworm {
                position: absolute;
                width: 4px;
                height: 4px;
                background: #8b4513;
                border-radius: 50%;
                box-shadow: 
                    0 0 6px rgba(139, 69, 19, 1),
                    0 0 12px rgba(139, 69, 19, 0.8);
                animation: cloneParticleGraveWorm 0.267s ease-out;
            }

            /* Worm-like particles */
            .clone-particle-graveworm:nth-child(even) {
                width: 6px;
                height: 2px;
                border-radius: 3px;
                background: linear-gradient(45deg, #8b4513 0%, #654321 100%);
            }

            /* Particle Positions */
            .clone-particle-graveworm.particle-1 {
                top: 20%;
                left: 50%;
                animation-delay: 0s;
            }
            .clone-particle-graveworm.particle-2 {
                top: 35%;
                left: 70%;
                animation-delay: 0.033s;
            }
            .clone-particle-graveworm.particle-3 {
                top: 50%;
                left: 75%;
                animation-delay: 0.067s;
            }
            .clone-particle-graveworm.particle-4 {
                top: 65%;
                left: 60%;
                animation-delay: 0.1s;
            }
            .clone-particle-graveworm.particle-5 {
                top: 65%;
                left: 40%;
                animation-delay: 0.133s;
            }
            .clone-particle-graveworm.particle-6 {
                top: 35%;
                left: 30%;
                animation-delay: 0.167s;
            }

            /* Sacrifice tribute text */
            .sacrifice-tribute {
                position: absolute;
                bottom: -25px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(139, 69, 19, 0.9);
                color: #fff;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                white-space: nowrap;
                animation: tributeFadeInOut 0.667s ease-out;
            }

            /* GraveWorm Bite Attack Effects */
            .graveworm-bite {
                border-radius: 10px;
                position: relative;
                overflow: visible;
                filter: drop-shadow(0 0 8px rgba(139, 69, 19, 0.8));
            }

            .bite-upper-jaw, .bite-lower-jaw {
                box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.3);
            }

            /* Keyframe Animations - UPDATED: 3x faster durations */
            @keyframes cloneCircleAppearGraveWorm {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 0;
                    border-color: rgba(139, 69, 19, 0);
                    filter: blur(3px);
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.3) rotate(90deg);
                    opacity: 1;
                    border-color: rgba(139, 69, 19, 1);
                    box-shadow: 
                        0 0 30px rgba(139, 69, 19, 1),
                        0 0 60px rgba(101, 67, 33, 0.8),
                        inset 0 0 20px rgba(160, 82, 45, 0.6);
                    filter: blur(0px);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1) rotate(180deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.7) rotate(360deg);
                    opacity: 0;
                    border-color: rgba(139, 69, 19, 0);
                    filter: blur(2px);
                }
            }

            @keyframes cloneParticleGraveWorm {
                0% {
                    transform: scale(0) translateY(15px);
                    opacity: 0;
                    filter: brightness(2);
                }
                30% {
                    transform: scale(1.8) translateY(0);
                    opacity: 1;
                    box-shadow: 
                        0 0 10px rgba(139, 69, 19, 1),
                        0 0 20px rgba(139, 69, 19, 0.8);
                    filter: brightness(1.5);
                }
                70% {
                    transform: scale(1) translateY(-8px);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(0) translateY(-20px);
                    opacity: 0;
                    filter: brightness(0.5);
                }
            }

            @keyframes tributeFadeInOut {
                0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            }

            /* Add dark glow to GraveWorm during cloning */
            .creature-icon.cloning-graveworm {
                animation: graveWormCloneGlow 0.267s ease-out;
            }

            .creature-icon.cloning-graveworm .creature-sprite {
                filter: brightness(1.3) drop-shadow(0 0 15px rgba(139, 69, 19, 0.8));
            }

            @keyframes graveWormCloneGlow {
                0% {
                    filter: brightness(1.8) drop-shadow(0 0 20px rgba(139, 69, 19, 1));
                    transform: scale(0.9);
                }
                50% {
                    filter: brightness(1.5) drop-shadow(0 0 25px rgba(139, 69, 19, 0.9));
                    transform: scale(1.05);
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(139, 69, 19, 0));
                    transform: scale(1);
                }
            }

            /* GraveWorm Bite Attack Animations - UPDATED: 3x faster durations */
            @keyframes graveWormBite {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }

            @keyframes biteUpperJaw {
                0% { 
                    transform: translateX(-50%) rotateZ(0deg);
                }
                30% {
                    transform: translateX(-50%) rotateZ(-15deg);
                }
                60% {
                    transform: translateX(-50%) rotateZ(5deg);
                }
                100% { 
                    transform: translateX(-50%) rotateZ(0deg);
                }
            }

            @keyframes biteLowerJaw {
                0% { 
                    transform: translateX(-50%) rotateZ(0deg);
                }
                30% {
                    transform: translateX(-50%) rotateZ(15deg);
                }
                60% {
                    transform: translateX(-50%) rotateZ(-5deg);
                }
                100% { 
                    transform: translateX(-50%) rotateZ(0deg);
                }
            }

            @keyframes graveWormBiteImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.2);
                }
                40% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.3);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.4);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods (unchanged)
export const GraveWormHelpers = {
    // Check if any creature in a list is GraveWorm
    hasGraveWormInList(creatures) {
        return creatures.some(creature => GraveWormCreature.isGraveWorm(creature.name));
    },

    // Get all GraveWorm creatures from a list
    getGraveWormsFromList(creatures) {
        return creatures.filter(creature => GraveWormCreature.isGraveWorm(creature.name));
    }
};

export default GraveWormCreature;