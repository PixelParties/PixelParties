// ./Creatures/frontSoldier.js - Front Soldier Creature Basic Sword Attack Module

export class FrontSoldierCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeSlashEffects = new Set(); // Track active slash effects for cleanup
        
        // Front Soldier stats
        this.SLASH_DAMAGE = 20;
        this.SLASH_ANIMATION_TIME = 600; // 0.6 second slash animation
        
        // Inject CSS styles
        this.injectFrontSoldierStyles();
    }

    // Check if a creature is Front Soldier
    static isFrontSoldier(creatureName) {
        return creatureName === 'FrontSoldier';
    }

    // Execute Front Soldier special attack with sword slash
    async executeSpecialAttack(frontSoldierActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const frontSoldierCreature = frontSoldierActor.data;
        const frontSoldierHero = frontSoldierActor.hero;
        const attackerSide = frontSoldierHero.side;
        
        // Safety check: ensure Front Soldier is still alive
        if (!frontSoldierCreature.alive || frontSoldierCreature.currentHp <= 0) {
            return;
        }
        
        this.battleManager.addCombatLog(
            `⚔️ ${frontSoldierCreature.name} raises its sword, preparing to strike!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Use standard targeting system (reusing existing code)
        const target = this.battleManager.combatManager.authoritative_findTargetWithCreatures(
            position, 
            attackerSide
        );
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${frontSoldierCreature.name} finds no targets for its sword attack!`, 
                'info'
            );
            return;
        }
        
        // Log target acquisition
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `🎯 ${frontSoldierCreature.name} targets ${targetName} with a sword slash!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest (reusing existing pattern)
        this.sendSwordSlashUpdate(frontSoldierActor, target, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute sword slash attack with visual effects
        await this.executeSwordSlashAttack(frontSoldierActor, target, position);
    }

    // Execute the sword slash attack with visual effects (host side)
    async executeSwordSlashAttack(frontSoldierActor, target, position) {
        const attackerSide = frontSoldierActor.hero.side;
        const targetElement = this.getTargetElement(target);
        
        if (!targetElement) {
            console.error('Target element not found, cannot create slash');
            return;
        }
        
        // Create and execute sword slash animation
        const slashEffect = this.createSwordSlashEffect(targetElement);
        if (!slashEffect) {
            console.error('Failed to create sword slash effect');
            return;
        }

        this.activeSlashEffects.add(slashEffect);

        // Calculate speed-adjusted animation time
        const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.SLASH_ANIMATION_TIME);
        
        // Wait for slash to appear
        await this.battleManager.delay(adjustedAnimationTime * 0.3);
        
        // Apply damage when slash hits (reusing existing damage system)
        this.applySwordSlashDamage(target, frontSoldierActor.data);
        
        // Add impact effect
        this.createSwordImpactEffect(targetElement);
        
        // Wait for the rest of the slash animation to complete
        await this.battleManager.delay(adjustedAnimationTime * 0.7);
        
        // Clean up slash effect
        this.removeSlashEffect(slashEffect);

        this.battleManager.addCombatLog(
            `💥 The sword slash strikes true, dealing ${this.SLASH_DAMAGE} damage!`, 
            'info'
        );
    }

    // Get the DOM element for a target (reused from BurningSkeleton)
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

    // Create simple sword slash effect
    createSwordSlashEffect(targetElement) {
        if (!targetElement) {
            console.warn('Cannot create slash effect: missing target element');
            return null;
        }

        // Additional validation: ensure element is still in DOM
        if (!document.body.contains(targetElement)) {
            console.warn('Cannot create slash effect: target element not in DOM');
            return null;
        }

        try {
            const targetRect = targetElement.getBoundingClientRect();

            // Validate that target element has valid dimensions
            if (targetRect.width === 0 || targetRect.height === 0) {
                console.warn('Cannot create slash effect: target element has invalid dimensions');
                return null;
            }

            // Calculate target center position
            const targetX = targetRect.left + targetRect.width / 2;
            const targetY = targetRect.top + targetRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(targetX) || !isFinite(targetY)) {
                console.warn('Invalid slash coordinates detected:', { targetX, targetY });
                return null;
            }

            // Random diagonal angle for slash variety (between -20 to 20 degrees from diagonal)
            const baseAngle = 45; // Base diagonal slash
            const angleVariation = (Math.random() - 0.5) * 40; // ±20 degrees
            const slashAngle = baseAngle + angleVariation;

            // Create the sword slash effect element at target location
            const slashEffect = document.createElement('div');
            slashEffect.className = 'front-soldier-slash';
            
            // Calculate speed-adjusted animation time for CSS
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.SLASH_ANIMATION_TIME);
            
            slashEffect.style.cssText = `
                position: fixed;
                left: ${targetX}px;
                top: ${targetY}px;
                width: 70px;
                height: 6px;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(192, 192, 192, 0.9) 20%, 
                    rgba(255, 255, 255, 1) 50%, 
                    rgba(192, 192, 192, 0.9) 80%, 
                    transparent 100%);
                transform-origin: 50% 50%;
                transform: translate(-50%, -50%) rotate(${slashAngle}deg);
                z-index: 1500;
                pointer-events: none;
                border-radius: 3px;
                box-shadow: 
                    0 0 8px rgba(255, 255, 255, 0.8),
                    0 0 16px rgba(192, 192, 192, 0.6),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9);
                animation: swordSlashStrike ${adjustedAnimationTime}ms ease-out forwards;
                --slash-angle: ${slashAngle}deg;
            `;

            // Add blade highlight
            const bladeHighlight = document.createElement('div');
            bladeHighlight.className = 'sword-blade-highlight';
            bladeHighlight.style.cssText = `
                position: absolute;
                top: 1px;
                left: 15%;
                width: 70%;
                height: 4px;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255, 255, 255, 1) 50%, 
                    transparent 100%);
                border-radius: 2px;
                animation: swordBladeFlash ${adjustedAnimationTime * 0.4}ms ease-out;
            `;
            
            slashEffect.appendChild(bladeHighlight);
            
            document.body.appendChild(slashEffect);
            
            return slashEffect;
        } catch (error) {
            console.error('Error creating sword slash effect:', error);
            return null;
        }
    }

    // Create simple sword impact effect at target location
    createSwordImpactEffect(targetElement) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const impact = document.createElement('div');
        impact.className = 'sword-slash-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 40px;
            height: 40px;
            background: radial-gradient(circle, 
                rgba(255, 255, 255, 0.9) 0%, 
                rgba(192, 192, 192, 0.7) 40%, 
                rgba(128, 128, 128, 0.5) 70%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: swordSlashImpact 0.4s ease-out forwards;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
        `;

        document.body.appendChild(impact);

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 400);
    }

    // Remove slash effect with cleanup
    removeSlashEffect(slashEffect) {
        if (slashEffect && slashEffect.parentNode) {
            this.activeSlashEffects.delete(slashEffect);
            slashEffect.remove();
        }
    }

    // Apply Front Soldier damage to target (reusing existing damage system)
    applySwordSlashDamage(target, attackingFrontSoldier = null) {
        const damage = this.SLASH_DAMAGE;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'attack', // Front Soldier's sword slash is a physical attack
                attacker: attackingFrontSoldier
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
                source: 'attack', // Front Soldier's sword slash is a physical attack
                attacker: attackingFrontSoldier
            });
        }
    }

    // Send sword slash attack data to guest for synchronization (reusing existing pattern)
    sendSwordSlashUpdate(frontSoldierActor, target, position) {
        const attackerSide = frontSoldierActor.hero.side;
        
        this.battleManager.sendBattleUpdate('front_soldier_sword_slash', {
            frontSoldierData: {
                side: attackerSide,
                position: position,
                creatureIndex: frontSoldierActor.index,
                name: frontSoldierActor.data.name,
                absoluteSide: frontSoldierActor.hero.absoluteSide
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
            damage: this.SLASH_DAMAGE,
            animationTime: this.SLASH_ANIMATION_TIME
        });
    }

    // Handle Front Soldier sword slash on guest side
    handleGuestSwordSlash(data) {
        const { frontSoldierData, target, damage, animationTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const frontSoldierLocalSide = (frontSoldierData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `⚔️ ${frontSoldierData.name} unleashes a sword slash!`, 
            frontSoldierLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestSwordSlash(frontSoldierData, target, animationTime, myAbsoluteSide);
    }

    // Create sword slash on guest side
    async createGuestSwordSlash(frontSoldierData, targetData, animationTime, myAbsoluteSide) {
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
        } else if (targetData.type === 'creature' && 
                targetData.creatureIndex !== null && 
                targetData.creatureIndex !== undefined && 
                targetData.creatureIndex >= 0) {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }

        if (targetElement) {
            const slashEffect = this.createSwordSlashEffect(targetElement);
            if (slashEffect) {
                this.activeSlashEffects.add(slashEffect);
            }

            // Calculate speed-adjusted animation time
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(animationTime);
            
            // Wait for slash to appear, then show impact
            await this.battleManager.delay(adjustedAnimationTime * 0.3);
            
            this.createSwordImpactEffect(targetElement);
            
            // Wait for the rest of the animation
            await this.battleManager.delay(adjustedAnimationTime * 0.7);
            
            this.removeSlashEffect(slashEffect);

            // Log damage for target (but don't apply actual damage - host handles that)
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            this.battleManager.addCombatLog(
                `🎯 ${targetName} is struck by the sword slash for ${this.SLASH_DAMAGE} damage!`,
                targetLocalSide === 'player' ? 'error' : 'success'
            );
        } else {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        }
    }

    // Clean up all active slash effects (called on battle end/reset)
    cleanup() {        
        this.activeSlashEffects.forEach(slashEffect => {
            try {
                if (slashEffect && slashEffect.parentNode) {
                    slashEffect.remove();
                }
            } catch (error) {
                console.warn('Error removing slash effect during cleanup:', error);
            }
        });
        
        this.activeSlashEffects.clear();

        // Also remove any orphaned slash elements
        try {
            const orphanedSlashes = document.querySelectorAll('.front-soldier-slash');
            orphanedSlashes.forEach(slashEffect => {
                if (slashEffect.parentNode) {
                    slashEffect.remove();
                }
            });
        } catch (error) {
            console.warn('Error cleaning up orphaned slash effects:', error);
        }
    }

    // Inject CSS styles for Front Soldier effects
    injectFrontSoldierStyles() {
        if (document.getElementById('frontSoldierCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'frontSoldierCreatureStyles';
        style.textContent = `
            /* Front Soldier Sword Slash Effects */
            .front-soldier-slash {
                border-radius: 3px;
                position: relative;
                overflow: visible;
            }

            .sword-blade-highlight {
                mix-blend-mode: overlay;
            }

            @keyframes swordSlashStrike {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scale(0.6);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scale(1.2);
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scale(1);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle, 45deg)) scale(0.8);
                }
            }

            @keyframes swordBladeFlash {
                0% { 
                    opacity: 0;
                    transform: scaleX(0);
                }
                60% { 
                    opacity: 1;
                    transform: scaleX(1);
                }
                100% { 
                    opacity: 0;
                    transform: scaleX(1);
                }
            }

            @keyframes swordSlashImpact {
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

// Static helper methods
export const FrontSoldierHelpers = {
    // Check if any creature in a list is Front Soldier
    hasFrontSoldierInList(creatures) {
        return creatures.some(creature => FrontSoldierCreature.isFrontSoldier(creature.name));
    },

    // Get all Front Soldier creatures from a list
    getFrontSoldierFromList(creatures) {
        return creatures.filter(creature => FrontSoldierCreature.isFrontSoldier(creature.name));
    }
};

export default FrontSoldierCreature;