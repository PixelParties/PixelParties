// ./Creatures/biomancyToken.js - Biomancy Token Creature Vine Attack Module

export class BiomancyTokenCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeVineEffects = new Set(); // Track active vine effects for cleanup
        
        // Biomancy Token stats
        this.VINE_ANIMATION_TIME = 800; // 0.8 second vine animation
        
        // Inject CSS styles
        this.injectBiomancyTokenStyles();
        
        console.log('🌿 Biomancy Token Creature module initialized');
    }

    // Check if a creature is Biomancy Token
    static isBiomancyToken(creatureName) {
        return creatureName === 'BiomancyToken';
    }

    // Execute Biomancy Token special attack with vine strike
    async executeSpecialAttack(biomancyTokenActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const biomancyTokenCreature = biomancyTokenActor.data;
        const biomancyTokenHero = biomancyTokenActor.hero;
        const attackerSide = biomancyTokenHero.side;
        
        // Safety check: ensure Biomancy Token is still alive
        if (!biomancyTokenCreature.alive || biomancyTokenCreature.currentHp <= 0) {
            console.log(`Biomancy Token is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `🌿 ${biomancyTokenCreature.name} channels its life force through writhing vines!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Use standard targeting system (reusing existing code)
        const target = this.battleManager.combatManager.authoritative_findTargetWithCreatures(
            position, 
            attackerSide
        );
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${biomancyTokenCreature.name} finds no targets for its vine attack!`, 
                'info'
            );
            return;
        }
        
        // Calculate damage as 20% of max HP (rounded up)
        const damage = Math.ceil(biomancyTokenCreature.maxHp * 0.2);
        
        // Log target acquisition
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `🎯 ${biomancyTokenCreature.name} targets ${targetName} with thorned vines! (${damage} damage)`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest (reusing existing pattern)
        this.sendVineAttackUpdate(biomancyTokenActor, target, position, damage);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute vine attack with visual effects
        await this.executeVineAttack(biomancyTokenActor, target, position, damage);
    }

    // Execute the vine attack with visual effects (host side)
    async executeVineAttack(biomancyTokenActor, target, position, damage) {
        const attackerSide = biomancyTokenActor.hero.side;
        const targetElement = this.getTargetElement(target);
        
        if (!targetElement) {
            console.error('Target element not found, cannot create vine attack');
            return;
        }
        
        // Create and execute vine animation
        const vineEffect = this.createVineAttackEffect(targetElement);
        if (!vineEffect) {
            console.error('Failed to create vine attack effect');
            return;
        }

        this.activeVineEffects.add(vineEffect);

        // Calculate speed-adjusted animation time
        const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.VINE_ANIMATION_TIME);
        
        // Wait for vines to grow
        await this.battleManager.delay(adjustedAnimationTime * 0.4);
        
        // Apply damage when vines hit (reusing existing damage system)
        this.applyVineAttackDamage(target, biomancyTokenActor.data, damage);
        
        // Add impact effect
        this.createVineImpactEffect(targetElement);
        
        // Wait for the rest of the vine animation to complete
        await this.battleManager.delay(adjustedAnimationTime * 0.6);
        
        // Clean up vine effect
        this.removeVineEffect(vineEffect);

        this.battleManager.addCombatLog(
            `💥 The thorned vines strike true, dealing ${damage} damage!`, 
            'info'
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

    // Create vine attack effect
    createVineAttackEffect(targetElement) {
        if (!targetElement) {
            console.warn('Cannot create vine effect: missing target element');
            return null;
        }

        // Additional validation: ensure element is still in DOM
        if (!document.body.contains(targetElement)) {
            console.warn('Cannot create vine effect: target element not in DOM');
            return null;
        }

        try {
            const targetRect = targetElement.getBoundingClientRect();

            // Validate that target element has valid dimensions
            if (targetRect.width === 0 || targetRect.height === 0) {
                console.warn('Cannot create vine effect: target element has invalid dimensions');
                return null;
            }

            // Calculate target center position
            const targetX = targetRect.left + targetRect.width / 2;
            const targetY = targetRect.top + targetRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(targetX) || !isFinite(targetY)) {
                console.warn('Invalid vine coordinates detected:', { targetX, targetY });
                return null;
            }

            // Create the vine container
            const vineContainer = document.createElement('div');
            vineContainer.className = 'biomancy-token-vines';
            
            // Calculate speed-adjusted animation time for CSS
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(this.VINE_ANIMATION_TIME);
            
            vineContainer.style.cssText = `
                position: fixed;
                left: ${targetX}px;
                top: ${targetY}px;
                width: 100px;
                height: 100px;
                transform: translate(-50%, -50%);
                z-index: 1500;
                pointer-events: none;
            `;

            // Create multiple vine tendrils with enhanced styling
            for (let i = 0; i < 4; i++) {
                const vine = document.createElement('div');
                vine.className = 'vine-tendril';
                
                const angle = (i * 90) + (Math.random() * 30 - 15); // Spread around target
                const length = 60 + Math.random() * 20; // Variable length
                
                vine.style.cssText = `
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 4px;
                    height: ${length}px;
                    background: linear-gradient(to bottom,
                        #2d5016 0%,
                        #4a7c23 30%,
                        #6b9930 60%,
                        #8bc34a 100%);
                    transform-origin: 50% 0%;
                    transform: translate(-50%, -50%) rotate(${angle}deg) scaleY(0);
                    border-radius: 2px;
                    animation: vineGrowth ${adjustedAnimationTime}ms ease-out forwards;
                    animation-delay: ${i * 50}ms;
                    box-shadow: inset 1px 0 0 rgba(139, 195, 74, 0.6);
                `;
                
                // Add thorns with enhanced detail
                const thorns = document.createElement('div');
                thorns.className = 'vine-thorns';
                thorns.style.cssText = `
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background-image: repeating-linear-gradient(
                        0deg,
                        transparent 0px,
                        transparent 8px,
                        rgba(139, 69, 19, 0.8) 8px,
                        rgba(139, 69, 19, 0.8) 10px
                    );
                `;
                
                vine.appendChild(thorns);
                vineContainer.appendChild(vine);
            }
            
            document.body.appendChild(vineContainer);
            
            console.log(`Created vine attack at target: animation time: ${adjustedAnimationTime}ms`);
            return vineContainer;
            
        } catch (error) {
            console.error('Error creating vine attack effect:', error);
            return null;
        }
    }

    // Create vine impact effect at target location
    createVineImpactEffect(targetElement) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const impact = document.createElement('div');
        impact.className = 'vine-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 50px;
            height: 50px;
            background: radial-gradient(circle, 
                rgba(139, 195, 74, 0.9) 0%, 
                rgba(107, 153, 48, 0.7) 40%, 
                rgba(77, 109, 34, 0.5) 70%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: vineImpact 0.5s ease-out forwards;
            box-shadow: 0 0 15px rgba(139, 195, 74, 0.8);
        `;

        // Add leaf particles
        for (let i = 0; i < 3; i++) {
            const leaf = document.createElement('div');
            leaf.style.cssText = `
                position: absolute;
                width: 8px;
                height: 12px;
                background: #8bc34a;
                border-radius: 0 100% 0 100%;
                animation: leafFloat 0.8s ease-out forwards;
                animation-delay: ${i * 100}ms;
                left: ${20 + i * 10}px;
                top: ${20 + i * 5}px;
            `;
            impact.appendChild(leaf);
        }

        document.body.appendChild(impact);

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 800);
    }

    // Remove vine effect with cleanup
    removeVineEffect(vineEffect) {
        if (vineEffect && vineEffect.parentNode) {
            this.activeVineEffects.delete(vineEffect);
            vineEffect.remove();
        }
    }

    // Apply Biomancy Token damage to target (reusing existing damage system)
    applyVineAttackDamage(target, attackingBiomancyToken, damage) {
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'attack', // Biomancy Token's vine attack is a physical attack
                attacker: attackingBiomancyToken
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
                source: 'attack', // Biomancy Token's vine attack is a physical attack
                attacker: attackingBiomancyToken
            });
        }
    }

    // FIXED: Send vine attack data to guest for synchronization
    sendVineAttackUpdate(biomancyTokenActor, target, position, damage) {
        const attackerSide = biomancyTokenActor.hero.side;
        
        this.battleManager.sendBattleUpdate('biomancy_token_vine_attack', {
            biomancyTokenData: {
                side: attackerSide,
                position: position,
                creatureIndex: biomancyTokenActor.index,
                name: biomancyTokenActor.data.name,
                absoluteSide: biomancyTokenActor.hero.absoluteSide
            },
            target: {
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null,
                maxHp: target.type === 'hero' ? target.hero.maxHp : (target.creature ? target.creature.maxHp : 100)
            },
            damage: damage, // CRITICAL: This is at the top level
            animationTime: this.VINE_ANIMATION_TIME
        });
    }

    // FIXED: Handle Biomancy Token vine attack on guest side
    handleGuestVineAttack(data) {
        const { biomancyTokenData, target, damage, animationTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const biomancyTokenLocalSide = (biomancyTokenData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        console.log('Guest received vine attack data:', { biomancyTokenData, target, damage, animationTime });
        
        this.battleManager.addCombatLog(
            `🌿 ${biomancyTokenData.name} unleashes thorned vines!`, 
            biomancyTokenLocalSide === 'player' ? 'success' : 'error'
        );

        // CRITICAL FIX: Add small delay to ensure proper timing and element availability
        setTimeout(() => {
            this.createGuestVineAttack(biomancyTokenData, target, damage, animationTime || this.VINE_ANIMATION_TIME, myAbsoluteSide);
        }, 50);
    }

    // FIXED: Create vine attack on guest side with damage parameter
    async createGuestVineAttack(biomancyTokenData, targetData, damage, animationTime, myAbsoluteSide) {
        // Find target element using absoluteSide mapping
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        let targetElement = null;
        
        // More robust target element finding with multiple fallbacks
        targetElement = this.findGuestTargetElement(targetData, targetLocalSide);
        
        if (!targetElement) {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
            // Try alternative approach - wait and retry
            setTimeout(() => {
                targetElement = this.findGuestTargetElement(targetData, targetLocalSide);
                if (targetElement) {
                    this.executeGuestVineAnimation(targetElement, targetData, damage, animationTime, targetLocalSide);
                }
            }, 100);
            return;
        }

        console.log(`Guest: Found target element for vine attack: ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        this.executeGuestVineAnimation(targetElement, targetData, damage, animationTime, targetLocalSide);
    }

    // Enhanced target element finder with multiple strategies
    findGuestTargetElement(targetData, targetLocalSide) {
        let targetElement = null;
        
        if (targetData.type === 'hero') {
            // Strategy 1: Look for battle hero card
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .battle-hero-card`
            );
            
            // Strategy 2: Look for character card (alternative class name)
            if (!targetElement) {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot .character-card`
                );
            }
            
            // Strategy 3: Look for hero card
            if (!targetElement) {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot .hero-card`
                );
            }
            
            // Strategy 4: Fallback to the slot itself
            if (!targetElement) {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot`
                );
            }
            
        } else if (targetData.type === 'creature' && targetData.creatureIndex !== null && targetData.creatureIndex >= 0) {
            // Strategy 1: Standard creature icon selector
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
            
            // Strategy 2: Look for creature by index position
            if (!targetElement) {
                const creatureContainer = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot .creatures-container`
                );
                if (creatureContainer) {
                    const creatureIcons = creatureContainer.querySelectorAll('.creature-icon');
                    if (creatureIcons[targetData.creatureIndex]) {
                        targetElement = creatureIcons[targetData.creatureIndex];
                    }
                }
            }
            
            // Strategy 3: Alternative container class
            if (!targetElement) {
                const altContainer = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot .hero-creatures-container`
                );
                if (altContainer) {
                    const creatureIcons = altContainer.querySelectorAll('.creature-icon');
                    if (creatureIcons[targetData.creatureIndex]) {
                        targetElement = creatureIcons[targetData.creatureIndex];
                    }
                }
            }
        }
        
        return targetElement;
    }

    // FIXED: Execute guest vine animation with damage parameter
    async executeGuestVineAnimation(targetElement, targetData, damage, animationTime, targetLocalSide) {
        try {
            // Ensure target element is still valid and in DOM
            if (!targetElement || !document.body.contains(targetElement)) {
                console.warn('Guest: Target element no longer valid for vine animation');
                return;
            }
            
            // Create vine effect
            const vineEffect = this.createVineAttackEffect(targetElement);
            if (!vineEffect) {
                console.warn('Guest: Failed to create vine attack effect');
                return;
            }

            this.activeVineEffects.add(vineEffect);
            console.log('Guest: Created vine attack animation');

            // Calculate speed-adjusted animation time
            const adjustedAnimationTime = this.battleManager.getSpeedAdjustedDelay(animationTime);
            
            // Wait for vines to grow, then show impact
            await this.battleManager.delay(adjustedAnimationTime * 0.4);
            
            // Verify target element is still valid before creating impact
            if (document.body.contains(targetElement)) {
                this.createVineImpactEffect(targetElement);
                console.log('Guest: Created vine impact effect');
            }
            
            // Wait for the rest of the animation
            await this.battleManager.delay(adjustedAnimationTime * 0.6);
            
            // Clean up vine effect
            this.removeVineEffect(vineEffect);

            // FIXED: Use damage parameter passed from the top-level data
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            
            this.battleManager.addCombatLog(
                `🎯 ${targetName} is entangled by thorned vines for ${damage} damage!`,
                targetLocalSide === 'player' ? 'error' : 'success'
            );
            
        } catch (error) {
            console.error('Guest: Error during vine animation execution:', error);
        }
    }

    // Clean up all active vine effects (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeVineEffects.size} active Biomancy Token vine effects`);
        
        this.activeVineEffects.forEach(vineEffect => {
            try {
                if (vineEffect && vineEffect.parentNode) {
                    vineEffect.remove();
                }
            } catch (error) {
                console.warn('Error removing vine effect during cleanup:', error);
            }
        });
        
        this.activeVineEffects.clear();

        // Also remove any orphaned vine elements
        try {
            const orphanedVines = document.querySelectorAll('.biomancy-token-vines');
            orphanedVines.forEach(vineEffect => {
                if (vineEffect.parentNode) {
                    vineEffect.remove();
                }
            });
            
            if (orphanedVines.length > 0) {
                console.log(`Cleaned up ${orphanedVines.length} orphaned Biomancy Token vine effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned vine effects:', error);
        }
    }

    // Inject CSS styles for Biomancy Token effects
    injectBiomancyTokenStyles() {
        if (document.getElementById('biomancyTokenCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'biomancyTokenCreatureStyles';
        style.textContent = `
            /* Biomancy Token Vine Attack Effects */
            .biomancy-token-vines {
                position: relative;
                overflow: visible;
            }

            .vine-tendril {
                position: relative;
                overflow: visible;
            }

            .vine-thorns {
                opacity: 0.7;
            }

            @keyframes vineGrowth {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--vine-angle, 0deg)) scaleY(0);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--vine-angle, 0deg)) scaleY(0.7);
                }
                70% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--vine-angle, 0deg)) scaleY(1.1);
                }
                100% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) rotate(var(--vine-angle, 0deg)) scaleY(1);
                }
            }

            @keyframes vineImpact {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                50% { 
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.4);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.6);
                }
            }

            @keyframes leafFloat {
                0% { 
                    opacity: 1;
                    transform: translate(0, 0) rotate(0deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(${Math.random() * 40 - 20}px, -30px) rotate(${Math.random() * 360}deg);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const BiomancyTokenHelpers = {
    // Check if any creature in a list is Biomancy Token
    hasBiomancyTokenInList(creatures) {
        return creatures.some(creature => BiomancyTokenCreature.isBiomancyToken(creature.name));
    },

    // Get all Biomancy Token creatures from a list
    getBiomancyTokenFromList(creatures) {
        return creatures.filter(creature => BiomancyTokenCreature.isBiomancyToken(creature.name));
    }
};

export default BiomancyTokenCreature;