// Potions/cloudInABottle.js - CloudInABottle Potion Implementation with Multi-Player Battle Integration

export class CloudInABottlePotion {
    constructor() {
        this.name = 'CloudInABottle';
        this.displayName = 'Cloud in a Bottle';
        this.description = 'Grants 1 stack of clouded to all ally heroes and creatures at battle start';
        this.effectType = 'clouded_buff';
        this.targetType = 'ally_all';
        this.cloudedStacks = 1; // Clouded stacks per use
        
        console.log('CloudInABottle potion initialized with multi-player support');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply the clouded effect to a single target
    async applyCloudedEffect(target, battleManager, cloudedStacks = 1) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for CloudInABottle effect');
            return false;
        }

        try {
            // Validate target is alive before applying effect
            if (!this.isTargetValid(target)) {
                console.log(`Skipping CloudInABottle effect on invalid/dead target: ${target.name || 'Unknown'}`);
                return false;
            }

            // Show visual effect first
            await this.showCloudedApplicationEffect(target, battleManager);
            
            // Apply clouded status effect using the status effects manager
            if (battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(target, 'clouded', cloudedStacks);
                console.log(`Applied ${cloudedStacks} clouded stack(s) to ${target.name}`);
            } else {
                console.warn('No status effects manager available - clouded effect not applied');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error applying CloudInABottle effect:', error);
            return false;
        }
    }

    // Apply CloudInABottle effects to multiple targets (main entry point for potion handler)
    async applyCloudedEffectsToTargets(targets, battleManager, playerRole, effectCount = 1) {
        if (!targets || targets.length === 0) {
            console.log(`No targets provided for CloudInABottle effects from ${playerRole}`);
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for CloudInABottle effects');
            return 0;
        }

        console.log(`☁️ Applying CloudInABottle effects: ${effectCount} potions to ${targets.length} targets from ${playerRole}`);

        let targetsAffected = 0;
        const effectPromises = [];

        // Calculate total clouded stacks
        const totalCloudedStacks = this.cloudedStacks * effectCount;

        // Apply clouded effects to all targets simultaneously
        for (const target of targets) {
            if (this.isTargetValid(target)) {
                const effectPromise = this.applyCloudedEffect(target, battleManager, totalCloudedStacks)
                    .then(success => {
                        if (success) {
                            targetsAffected++;
                        }
                        return success;
                    })
                    .catch(error => {
                        console.error(`Error applying CloudInABottle to ${target.name}:`, error);
                        return false;
                    });
                
                effectPromises.push(effectPromise);
            }
        }

        // Wait for all effects to complete
        await Promise.all(effectPromises);

        // Add appropriate combat log message
        this.addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected, totalCloudedStacks);

        console.log(`✅ CloudInABottle effects completed: ${targetsAffected}/${targets.length} targets affected by ${effectCount} potions from ${playerRole}`);
        return targetsAffected;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a target is valid for CloudInABottle effects
    isTargetValid(target) {
        if (!target) return false;
        
        // Check if target has alive property and is alive
        if (target.hasOwnProperty('alive')) {
            return target.alive === true;
        }
        
        // Fallback: assume target is valid if no alive property
        return true;
    }

    // Collect all valid ally heroes AND creatures for a player role
    collectAllyTargets(battleManager, playerRole) {
        if (!battleManager) {
            console.error('No battle manager provided for target collection');
            return [];
        }

        // Determine which heroes are allies based on player role
        const allyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);

        const validTargets = [];

        // Collect both ally heroes AND their creatures
        allyHeroes.forEach(hero => {
            if (this.isTargetValid(hero)) {
                validTargets.push(hero);
                
                // Also collect living creatures
                if (hero.creatures) {
                    hero.creatures.forEach(creature => {
                        if (this.isTargetValid(creature)) {
                            validTargets.push(creature);
                        }
                    });
                }
            }
        });

        console.log(`Collected ${validTargets.length} valid ally targets for ${playerRole} CloudInABottle effects`);
        const heroes = validTargets.filter(t => t.type === 'hero' || !t.type).length;
        const creatures = validTargets.filter(t => t.type === 'creature').length;
        console.log(`Target breakdown: ${heroes} heroes, ${creatures} creatures`);
        return validTargets;
    }

    // ===== VISUAL EFFECTS =====

    // Show the signature clouded application effect
    async showCloudedApplicationEffect(target, battleManager) {
        try {
            // Get the target element
            const targetElement = this.getTargetElement(target, battleManager);
            if (!targetElement) {
                console.warn(`Could not find target element for ${target.name} - skipping visual effect`);
                return;
            }

            // Create and show the clouded mist effect
            await this.createCloudedMistAnimation(targetElement);
            
        } catch (error) {
            console.error('Error showing clouded mist effect:', error);
        }
    }

    // Create the clouded mist animation
    async createCloudedMistAnimation(targetElement) {
        // Create the main clouded mist effect
        const cloudedMist = this.createCloudedMistElement();
        
        // Position it on the target
        this.positionEffectOnTarget(cloudedMist, targetElement);
        
        // Add to DOM and animate
        document.body.appendChild(cloudedMist);
        
        // Create multiple cloud puffs for enhanced effect
        const cloudPuffs = [];
        const puffCount = 4 + Math.floor(Math.random() * 3); // 4-6 puffs
        
        for (let i = 0; i < puffCount; i++) {
            const cloudPuff = this.createCloudPuff(i);
            this.positionEffectOnTarget(cloudPuff, targetElement);
            document.body.appendChild(cloudPuff);
            cloudPuffs.push(cloudPuff);
        }
        
        // Create protective aura effect on target
        this.createProtectiveAuraEffect(targetElement);
        
        // Wait for animation to complete
        await this.waitForAnimation(1200);
        
        // Clean up elements
        cloudedMist.remove();
        cloudPuffs.forEach(puff => puff.remove());
    }

    // ===== GUEST-SIDE VISUAL HANDLER =====
    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, effectCount = 1 } = data;
        const isHostPotion = (playerSide === 'host');
        
        // Get ally targets (heroes and creatures) from guest's perspective
        const targetHeroes = isHostPotion ? 
            Object.values(battleManager.opponentHeroes) : // Host's allies (from guest's POV)
            Object.values(battleManager.playerHeroes);    // Guest's allies (from guest's POV)
        
        const targets = [];
        
        targetHeroes.forEach(hero => {
            if (hero && hero.alive) {
                targets.push(hero);
                
                // Add living creatures
                if (hero.creatures) {
                    hero.creatures.forEach(creature => {
                        if (creature && creature.alive) {
                            targets.push(creature);
                        }
                    });
                }
            }
        });
        
        if (targets.length === 0) return;
        
        // Show clouded mist effects on all targets
        for (const target of targets) {
            await this.showCloudedApplicationEffect(target, battleManager);
        }
        
        // Show battle log message
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        battleManager.addCombatLog(
            `☁️ ${playerName}'s Cloud in a Bottle shrouds! ${targets.length} allies gain protective mist!`,
            logType
        );
    }

    // Create the main clouded mist element
    createCloudedMistElement() {
        const cloudedMist = document.createElement('div');
        cloudedMist.className = 'clouded-mist';
        cloudedMist.innerHTML = '☁️';
        
        cloudedMist.style.cssText = `
            position: absolute;
            font-size: 48px;
            z-index: 1000;
            pointer-events: none;
            animation: cloudedMistSwirl 1.2s ease-out forwards;
            text-shadow: 
                0 0 20px rgba(135, 206, 250, 0.9),
                0 0 40px rgba(173, 216, 230, 0.6),
                0 0 60px rgba(255, 255, 255, 0.4);
            filter: drop-shadow(0 0 15px rgba(135, 206, 250, 0.8));
        `;
        
        return cloudedMist;
    }

    // Create a cloud puff for the mist effect
    createCloudPuff(index) {
        const cloudPuff = document.createElement('div');
        cloudPuff.className = `clouded-puff clouded-puff-${index}`;
        
        // Randomize cloud puff appearance
        const puffs = ['☁️', '🌫️', '💨'];
        const randomPuff = puffs[Math.floor(Math.random() * puffs.length)];
        cloudPuff.innerHTML = randomPuff;
        
        // Calculate puff direction and distance
        const angle = (index * (360 / 6)) + (Math.random() * 30 - 15); // Spread puffs around
        const distance = 40 + Math.random() * 60; // Random distance
        const duration = 0.8 + Math.random() * 0.6; // Random duration
        
        cloudPuff.style.cssText = `
            position: absolute;
            font-size: ${12 + Math.random() * 20}px;
            z-index: 999;
            pointer-events: none;
            animation: cloudedPuff${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 8px rgba(135, 206, 250, 0.7),
                0 0 16px rgba(173, 216, 230, 0.5);
            filter: drop-shadow(0 0 8px rgba(135, 206, 250, 0.6));
        `;
        
        // Create custom animation for this cloud puff
        this.createCloudPuffAnimation(index, angle, distance, duration);
        
        return cloudPuff;
    }

    // Create custom animation for cloud puffs
    createCloudPuffAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `cloudedPuff${index}`;
        
        // Check if animation already exists
        if (this.animationExists(animationName)) {
            return;
        }
        
        const keyframes = `
            @keyframes ${animationName} {
                0% {
                    transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
                    opacity: 0;
                }
                30% {
                    transform: translate(calc(-50% + ${endX * 0.3}px), calc(-50% + ${endY * 0.3}px)) scale(1) rotate(90deg);
                    opacity: 0.8;
                }
                70% {
                    transform: translate(calc(-50% + ${endX * 0.7}px), calc(-50% + ${endY * 0.7}px)) scale(1.1) rotate(180deg);
                    opacity: 0.6;
                }
                100% {
                    transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.3) rotate(270deg);
                    opacity: 0;
                }
            }
        `;
        
        this.addAnimationToDocument(animationName, keyframes);
    }

    // Create protective aura effect on the target
    createProtectiveAuraEffect(targetElement) {
        const protectiveAura = document.createElement('div');
        protectiveAura.className = 'clouded-protective-aura';
        
        protectiveAura.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, 
                rgba(135, 206, 250, 0.3) 0%, 
                rgba(173, 216, 230, 0.2) 40%, 
                transparent 70%);
            z-index: 998;
            pointer-events: none;
            animation: cloudedProtectiveAura 1.5s ease-out forwards;
            border-radius: inherit;
        `;
        
        targetElement.appendChild(protectiveAura);
        
        setTimeout(() => {
            if (protectiveAura && protectiveAura.parentNode) {
                protectiveAura.remove();
            }
        }, 1500);
    }

    // ===== UTILITY METHODS =====

    // Get the DOM element for a target (hero or creature)
    getTargetElement(target, battleManager) {
        if (!target || !battleManager) return null;
        
        if (target.type === 'hero' || (!target.type && target.position && target.side)) {
            // Use battle manager's method to get hero element
            return battleManager.getHeroElement(target.side, target.position);
        } else if (target.type === 'creature') {
            // For creatures, find their element
            const creatureInfo = this.findCreatureInfo(target, battleManager);
            if (!creatureInfo) return null;

            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
        
        return null;
    }

    // Find creature information (hero, position, index)
    findCreatureInfo(creature, battleManager) {
        // Search through all heroes and their creatures
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
            
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

    // Position effect on target element
    positionEffectOnTarget(effectElement, targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Add some randomness for multiple effects
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        
        effectElement.style.left = `${centerX + offsetX}px`;
        effectElement.style.top = `${centerY + offsetY}px`;
        effectElement.style.transform = 'translate(-50%, -50%)';
    }

    // Add battle log message with proper player context
    addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected, totalCloudedStacks) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for CloudInABottle message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'error';
        
        let message;
        if (effectCount === 1) {
            if (targetsAffected === 1) {
                message = `☁️ ${playerName}'s Cloud in a Bottle shrouds! 1 ally gains protective mist!`;
            } else {
                message = `☁️ ${playerName}'s Cloud in a Bottle shrouds! ${targetsAffected} allies gain protective mist!`;
            }
        } else {
            message = `☁️ ${playerName}'s ${effectCount} Clouds in a Bottle shroud! ${targetsAffected} allies gain ${totalCloudedStacks} clouded stacks!`;
        }
        
        battleManager.addCombatLog(message, logType);
    }

    // Check if animation already exists
    animationExists(animationName) {
        const styleSheets = document.styleSheets;
        for (let i = 0; i < styleSheets.length; i++) {
            try {
                const rules = styleSheets[i].cssRules || styleSheets[i].rules;
                for (let j = 0; j < rules.length; j++) {
                    if (rules[j].type === CSSRule.KEYFRAMES_RULE && rules[j].name === animationName) {
                        return true;
                    }
                }
            } catch (e) {
                // Cross-origin stylesheets might throw errors, ignore them
                continue;
            }
        }
        return false;
    }

    // Add animation to document
    addAnimationToDocument(animationName, keyframes) {
        let styleSheet = document.getElementById('cloudInBottleAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'cloudInBottleAnimations';
            document.head.appendChild(styleSheet);
        }
        
        try {
            styleSheet.appendChild(document.createTextNode(keyframes));
        } catch (e) {
            // Fallback for older browsers
            styleSheet.styleSheet.cssText += keyframes;
        }
    }

    // Wait for animation to complete
    async waitForAnimation(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    // ===== INTEGRATION METHODS FOR POTION HANDLER =====

    // Main integration method called by potion handler
    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0) {
            console.log('No CloudInABottle effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for CloudInABottle effects');
            return 0;
        }

        console.log(`☁️ CloudInABottle handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Collect all ally targets (both heroes and creatures)
            const targets = this.collectAllyTargets(battleManager, playerRole);
            
            if (targets.length === 0) {
                console.log(`No valid targets found for ${playerRole} CloudInABottle effects`);
                battleManager.addCombatLog(
                    `☁️ ${playerRole === 'host' ? 'Host' : 'Guest'}'s Cloud in a Bottle fizzles - no targets!`, 
                    playerRole === 'host' ? 'success' : 'error'
                );
                return 0;
            }

            // Apply effects to all targets
            const effectCount = effects.length;
            const targetsAffected = await this.applyCloudedEffectsToTargets(
                targets, 
                battleManager, 
                playerRole, 
                effectCount
            );

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling CloudInABottle effects for ${playerRole}:`, error);
            
            // Fallback: try basic clouded application
            this.applyFallbackCloudedEffects(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback clouded effect application (without visuals)
    applyFallbackCloudedEffects(battleManager, playerRole, effectCount) {
        try {
            const allyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.playerHeroes) : 
                Object.values(battleManager.opponentHeroes);
            
            let fallbackTargets = 0;
            const totalCloudedStacks = this.cloudedStacks * effectCount;
            
            // Apply to heroes
            for (const hero of allyHeroes) {
                if (hero && hero.alive && battleManager.statusEffectsManager) {
                    battleManager.statusEffectsManager.applyStatusEffect(hero, 'clouded', totalCloudedStacks);
                    fallbackTargets++;
                    
                    // Apply to their creatures too
                    if (hero.creatures) {
                        hero.creatures.forEach(creature => {
                            if (creature.alive) {
                                battleManager.statusEffectsManager.applyStatusEffect(creature, 'clouded', totalCloudedStacks);
                                fallbackTargets++;
                            }
                        });
                    }
                }
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `☁️ ${playerName}'s Cloud in a Bottle effects applied (${totalCloudedStacks} clouded stacks to ${fallbackTargets} targets)`, 
                playerRole === 'host' ? 'success' : 'error'
            );
            
            console.log(`Fallback CloudInABottle: Applied ${totalCloudedStacks} clouded stacks to ${fallbackTargets} targets`);
            
        } catch (error) {
            console.error('Error in fallback CloudInABottle application:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is CloudInABottle
    static isCloudInABottle(potionName) {
        return potionName === 'CloudInABottle';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'CloudInABottle',
            displayName: 'Cloud in a Bottle',
            description: 'Grants 1 stack of clouded to all ally heroes and creatures at battle start',
            cardType: 'Potion',
            cost: 0,
            effect: 'Grants 1 clouded stack to all ally targets. When taking damage, reduce it by half and consume 1 clouded stack.',
            cloudedStacks: 1,
            targetType: 'ally_all'
        };
    }

    // Static method to create a new instance
    static create() {
        return new CloudInABottlePotion();
    }

    // Static method for quick effect application (utility)
    static async applyToAllAllyTargets(battleManager, playerRole, stackCount = 1) {
        const potion = new CloudInABottlePotion();
        const targets = potion.collectAllyTargets(battleManager, playerRole);
        return await potion.applyCloudedEffectsToTargets(targets, battleManager, playerRole, stackCount);
    }
}

// Add CSS animations for CloudInABottle effects
if (typeof document !== 'undefined' && !document.getElementById('cloudInBottleStyles')) {
    const style = document.createElement('style');
    style.id = 'cloudInBottleStyles';
    style.textContent = `
        /* Main clouded mist animation */
        @keyframes cloudedMistSwirl {
            0% {
                transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                opacity: 0;
            }
            30% {
                transform: translate(-50%, -50%) scale(1.2) rotate(120deg);
                opacity: 1;
            }
            60% {
                transform: translate(-50%, -50%) scale(1.4) rotate(240deg);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -50%) scale(1.1) rotate(360deg);
                opacity: 0;
            }
        }
        
        /* Protective aura effect animation */
        @keyframes cloudedProtectiveAura {
            0% {
                opacity: 0;
                transform: scale(0.5);
            }
            40% {
                opacity: 0.6;
                transform: scale(1.2);
            }
            80% {
                opacity: 0.4;
                transform: scale(1.4);
            }
            100% {
                opacity: 0;
                transform: scale(1.6);
            }
        }
        
        /* Base styles for clouded effects */
        .clouded-mist {
            will-change: transform, opacity;
        }
        
        .clouded-puff {
            will-change: transform, opacity;
        }
        
        .clouded-protective-aura {
            will-change: transform, opacity;
        }
        
        /* Enhanced clouded effects */
        .clouded-mist:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, 
                rgba(135, 206, 250, 0.4) 0%, 
                rgba(173, 216, 230, 0.3) 40%, 
                transparent 70%);
            border-radius: 50%;
            animation: cloudedGlow 1.2s ease-out;
        }
        
        @keyframes cloudedGlow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.3);
                opacity: 0.7;
            }
            100% {
                transform: translate(-50%, -50%) scale(2.2);
                opacity: 0;
            }
        }
        
        /* Improved cloud puff effects */
        .clouded-puff {
            text-shadow: 
                0 0 6px rgba(135, 206, 250, 0.8),
                0 0 12px rgba(173, 216, 230, 0.6),
                0 0 18px rgba(255, 255, 255, 0.4);
        }
        
        /* Responsive clouded effects */
        @media (max-width: 768px) {
            .clouded-mist {
                font-size: 36px !important;
            }
            
            .clouded-puff {
                font-size: 14px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .clouded-mist {
                text-shadow: 
                    0 0 8px #ffffff,
                    0 0 16px #000000;
            }
            
            .clouded-puff {
                text-shadow: 
                    0 0 4px #ffffff,
                    0 0 8px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .clouded-mist {
                animation: cloudedReducedMotion 0.6s ease-out forwards;
            }
            
            .clouded-puff {
                animation: none;
                opacity: 0;
            }
            
            .clouded-protective-aura {
                animation: cloudedAuraReducedMotion 0.8s ease-out forwards;
            }
        }
        
        @keyframes cloudedReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.0);
            }
        }
        
        @keyframes cloudedAuraReducedMotion {
            0% {
                opacity: 0;
            }
            50% {
                opacity: 0.3;
            }
            100% {
                opacity: 0;
            }
        }
        
        /* Performance optimizations */
        .clouded-mist,
        .clouded-puff,
        .clouded-protective-aura {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
        
        /* Additional protective styling */
        .clouded-protective-aura {
            mix-blend-mode: soft-light;
            border: 1px solid rgba(135, 206, 250, 0.2);
        }
        
        /* Enhanced cloud puff variety */
        .clouded-puff:nth-child(even) {
            animation-delay: 0.1s;
        }
        
        .clouded-puff:nth-child(3n) {
            animation-delay: 0.05s;
            animation-duration: 0.9s;
        }
        
        .clouded-puff:nth-child(4n) {
            animation-delay: 0.15s;
            animation-duration: 1.1s;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.CloudInABottlePotion = CloudInABottlePotion;
}

console.log('CloudInABottle potion module loaded with multi-player integration');