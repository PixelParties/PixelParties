// Potions/elixirOfImmortality.js - ElixirOfImmortality Potion Implementation with Multi-Player Battle Integration

export class ElixirOfImmortality {
    constructor() {
        this.name = 'ElixirOfImmortality';
        this.displayName = 'Elixir of Immortality';
        this.description = 'Grants 1 stack of immortal to all ally heroes at battle start';
        this.effectType = 'immortal_buff';
        this.targetType = 'ally_heroes_only';
        this.immortalStacks = 1; // Immortal stacks per use
        
        console.log('ElixirOfImmortality potion initialized with multi-player support');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply the immortal effect to a single target
    async applyImmortalEffect(target, battleManager, immortalStacks = 1) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for ElixirOfImmortality effect');
            return false;
        }

        try {
            // Validate target is alive before applying effect
            if (!this.isTargetValid(target)) {
                console.log(`Skipping ElixirOfImmortality effect on invalid/dead target: ${target.name || 'Unknown'}`);
                return false;
            }

            // Show visual effect first
            await this.showImmortalApplicationEffect(target, battleManager);
            
            // Apply immortal status effect using the status effects manager
            if (battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(target, 'immortal', immortalStacks);
                console.log(`Applied ${immortalStacks} immortal stack(s) to ${target.name}`);
            } else {
                console.warn('No status effects manager available - immortal effect not applied');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error applying ElixirOfImmortality effect:', error);
            return false;
        }
    }

    // Apply ElixirOfImmortality effects to multiple targets (main entry point for potion handler)
    async applyImmortalEffectsToTargets(targets, battleManager, playerRole, effectCount = 1) {
        if (!targets || targets.length === 0) {
            console.log(`No targets provided for ElixirOfImmortality effects from ${playerRole}`);
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for ElixirOfImmortality effects');
            return 0;
        }

        console.log(`✨ Applying ElixirOfImmortality effects: ${effectCount} elixirs to ${targets.length} targets from ${playerRole}`);

        let targetsAffected = 0;
        const effectPromises = [];

        // Calculate total immortal stacks
        const totalImmortalStacks = this.immortalStacks * effectCount;

        // Apply immortal effects to all targets simultaneously
        for (const target of targets) {
            if (this.isTargetValid(target)) {
                const effectPromise = this.applyImmortalEffect(target, battleManager, totalImmortalStacks)
                    .then(success => {
                        if (success) {
                            targetsAffected++;
                        }
                        return success;
                    })
                    .catch(error => {
                        console.error(`Error applying ElixirOfImmortality to ${target.name}:`, error);
                        return false;
                    });
                
                effectPromises.push(effectPromise);
            }
        }

        // Wait for all effects to complete
        await Promise.all(effectPromises);

        // Add appropriate combat log message
        this.addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected, totalImmortalStacks);

        console.log(`✅ ElixirOfImmortality effects completed: ${targetsAffected}/${targets.length} targets affected by ${effectCount} elixirs from ${playerRole}`);
        return targetsAffected;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a target is valid for ElixirOfImmortality effects
    isTargetValid(target) {
        if (!target) return false;
        
        // Check if target has alive property and is alive
        if (target.hasOwnProperty('alive')) {
            return target.alive === true;
        }
        
        // Fallback: assume target is valid if no alive property
        return true;
    }

    // Collect all valid ally HEROES for a player role (ElixirOfImmortality only targets heroes, not creatures)
    collectAllyHeroes(battleManager, playerRole) {
        if (!battleManager) {
            console.error('No battle manager provided for target collection');
            return [];
        }

        // Determine which heroes are allies based on player role
        const allyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);

        const validTargets = [];

        // Collect only ally heroes (not creatures)
        allyHeroes.forEach(hero => {
            if (this.isTargetValid(hero)) {
                validTargets.push(hero);
            }
        });

        console.log(`Collected ${validTargets.length} valid ally heroes for ${playerRole} ElixirOfImmortality effects`);
        console.log('Target breakdown:', validTargets.map(t => `${t.name} (hero)`));
        return validTargets;
    }

    // ===== VISUAL EFFECTS =====

    // Show the signature immortal application effect
    async showImmortalApplicationEffect(target, battleManager) {
        try {
            // Get the target element (hero only)
            const targetElement = this.getTargetElement(target, battleManager);
            if (!targetElement) {
                console.warn(`Could not find target element for ${target.name} - skipping visual effect`);
                return;
            }

            // Create and show the immortal blessing effect
            await this.createImmortalBlessingAnimation(targetElement);
            
        } catch (error) {
            console.error('Error showing immortal blessing effect:', error);
        }
    }

    // Create the immortal blessing animation
    async createImmortalBlessingAnimation(targetElement) {
        // Create the main immortal blessing effect
        const immortalBlessing = this.createImmortalBlessingElement();
        
        // Position it on the target
        this.positionEffectOnTarget(immortalBlessing, targetElement);
        
        // Add to DOM and animate
        document.body.appendChild(immortalBlessing);
        
        // Create multiple light rays for enhanced effect
        const lightRays = [];
        const rayCount = 6 + Math.floor(Math.random() * 3); // 6-8 rays
        
        for (let i = 0; i < rayCount; i++) {
            const lightRay = this.createLightRay(i);
            this.positionEffectOnTarget(lightRay, targetElement);
            document.body.appendChild(lightRay);
            lightRays.push(lightRay);
        }
        
        // Create divine aura effect on target
        this.createDivineAuraEffect(targetElement);
        
        // Wait for animation to complete
        await this.waitForAnimation(1200);
        
        // Clean up elements
        immortalBlessing.remove();
        lightRays.forEach(ray => ray.remove());
    }

    // Create the main immortal blessing element
    createImmortalBlessingElement() {
        const immortalBlessing = document.createElement('div');
        immortalBlessing.className = 'immortal-blessing';
        immortalBlessing.innerHTML = '✨';
        
        immortalBlessing.style.cssText = `
            position: absolute;
            font-size: 60px;
            z-index: 1000;
            pointer-events: none;
            animation: immortalBlessingPulse 1.2s ease-out forwards;
            text-shadow: 
                0 0 30px #ffd700,
                0 0 60px #ffff00,
                0 0 90px #ffffff;
            filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.9));
        `;
        
        return immortalBlessing;
    }

    // Create a light ray for the blessing effect
    createLightRay(index) {
        const lightRay = document.createElement('div');
        lightRay.className = `immortal-light-ray immortal-light-ray-${index}`;
        
        // Randomize light ray appearance
        const rays = ['✨', '💫', '🌟', '⭐', '💛'];
        const randomRay = rays[Math.floor(Math.random() * rays.length)];
        lightRay.innerHTML = randomRay;
        
        // Calculate ray direction and distance
        const angle = (index * (360 / 8)) + (Math.random() * 20 - 10); // Spread rays around
        const distance = 60 + Math.random() * 80; // Random distance
        const duration = 0.8 + Math.random() * 0.8; // Random duration
        
        lightRay.style.cssText = `
            position: absolute;
            font-size: ${16 + Math.random() * 24}px;
            z-index: 999;
            pointer-events: none;
            animation: immortalLightRay${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 12px #ffd700,
                0 0 24px #ffff00;
            filter: drop-shadow(0 0 12px rgba(255, 215, 0, 0.8));
        `;
        
        // Create custom animation for this light ray
        this.createLightRayAnimation(index, angle, distance, duration);
        
        return lightRay;
    }

    // Create custom animation for light rays
    createLightRayAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `immortalLightRay${index}`;
        
        // Check if animation already exists
        if (this.animationExists(animationName)) {
            return;
        }
        
        const keyframes = `
            @keyframes ${animationName} {
                0% {
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                    opacity: 0;
                }
                30% {
                    transform: translate(calc(-50% + ${endX * 0.4}px), calc(-50% + ${endY * 0.4}px)) scale(1.2) rotate(120deg);
                    opacity: 1;
                }
                70% {
                    transform: translate(calc(-50% + ${endX * 0.8}px), calc(-50% + ${endY * 0.8}px)) scale(1) rotate(240deg);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.4) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        
        this.addAnimationToDocument(animationName, keyframes);
    }

    // Create divine aura effect on the target
    createDivineAuraEffect(targetElement) {
        const divineAura = document.createElement('div');
        divineAura.className = 'immortal-divine-aura';
        
        divineAura.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, 
                rgba(255, 215, 0, 0.4) 0%, 
                rgba(255, 255, 0, 0.3) 40%, 
                transparent 70%);
            z-index: 998;
            pointer-events: none;
            animation: immortalDivineAura 1.5s ease-out forwards;
            border-radius: inherit;
        `;
        
        targetElement.appendChild(divineAura);
        
        setTimeout(() => {
            if (divineAura && divineAura.parentNode) {
                divineAura.remove();
            }
        }, 1500);
    }

    // ===== UTILITY METHODS =====

    // Get the DOM element for a target (hero only)
    getTargetElement(target, battleManager) {
        if (!target || !battleManager) return null;
        
        // ElixirOfImmortality only targets heroes
        if (target.type === 'hero' || (!target.type && target.position && target.side)) {
            // Use battle manager's method to get hero element
            return battleManager.getHeroElement(target.side, target.position);
        }
        
        // Fallback: try to find by name if it's a hero
        if (target.name && target.side && target.position) {
            return battleManager.getHeroElement(target.side, target.position);
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
    addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected, totalImmortalStacks) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for ElixirOfImmortality message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'error';
        
        let message;
        if (effectCount === 1) {
            if (targetsAffected === 1) {
                message = `✨ ${playerName}'s Elixir of Immortality blesses! 1 ally hero gains immortal protection!`;
            } else {
                message = `✨ ${playerName}'s Elixir of Immortality blesses! ${targetsAffected} ally heroes gain immortal protection!`;
            }
        } else {
            message = `✨ ${playerName}'s ${effectCount} Elixirs of Immortality bless! ${targetsAffected} ally heroes gain ${totalImmortalStacks} immortal stacks!`;
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
        let styleSheet = document.getElementById('immortalElixirAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'immortalElixirAnimations';
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
            console.log('No ElixirOfImmortality effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for ElixirOfImmortality effects');
            return 0;
        }

        console.log(`✨ ElixirOfImmortality handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Collect all ally heroes (not creatures)
            const targets = this.collectAllyHeroes(battleManager, playerRole);
            
            if (targets.length === 0) {
                console.log(`No valid hero targets found for ${playerRole} ElixirOfImmortality effects`);
                battleManager.addCombatLog(
                    `✨ ${playerRole === 'host' ? 'Host' : 'Guest'}'s Elixir of Immortality fizzles - no hero targets!`, 
                    playerRole === 'host' ? 'success' : 'error'
                );
                return 0;
            }

            // Apply effects to all hero targets
            const effectCount = effects.length;
            const targetsAffected = await this.applyImmortalEffectsToTargets(
                targets, 
                battleManager, 
                playerRole, 
                effectCount
            );

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling ElixirOfImmortality effects for ${playerRole}:`, error);
            
            // Fallback: try basic immortal application
            this.applyFallbackImmortalEffects(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback immortal effect application (without visuals)
    applyFallbackImmortalEffects(battleManager, playerRole, effectCount) {
        try {
            const allyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.playerHeroes) : 
                Object.values(battleManager.opponentHeroes);
            
            let fallbackTargets = 0;
            const totalImmortalStacks = this.immortalStacks * effectCount;
            
            for (const hero of allyHeroes) {
                if (hero && hero.alive && battleManager.statusEffectsManager) {
                    // Apply immortal status effect
                    battleManager.statusEffectsManager.applyStatusEffect(hero, 'immortal', totalImmortalStacks);
                    fallbackTargets++;
                }
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `✨ ${playerName}'s Elixir of Immortality effects applied (${totalImmortalStacks} immortal stacks to ${fallbackTargets} heroes)`, 
                playerRole === 'host' ? 'success' : 'error'
            );
            
            console.log(`Fallback ElixirOfImmortality: Applied ${totalImmortalStacks} immortal stacks to ${fallbackTargets} heroes`);
            
        } catch (error) {
            console.error('Error in fallback ElixirOfImmortality application:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is ElixirOfImmortality
    static isElixirOfImmortality(potionName) {
        return potionName === 'ElixirOfImmortality';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'ElixirOfImmortality',
            displayName: 'Elixir of Immortality',
            description: 'Grants 1 stack of immortal to all ally heroes at battle start',
            cardType: 'Potion',
            cost: 0,
            effect: 'Grants 1 immortal stack to all ally heroes. When a hero with immortal would die without heal-block, revive with 100 HP and consume 1 immortal stack.',
            immortalStacks: 1,
            targetType: 'ally_heroes_only'
        };
    }

    // Static method to create a new instance
    static create() {
        return new ElixirOfImmortality();
    }

    // Static method for quick effect application (utility)
    static async applyToAllAllyHeroes(battleManager, playerRole, stackCount = 1) {
        const potion = new ElixirOfImmortality();
        const targets = potion.collectAllyHeroes(battleManager, playerRole);
        return await potion.applyImmortalEffectsToTargets(targets, battleManager, playerRole, stackCount);
    }
}

// Add CSS animations for ElixirOfImmortality effects
if (typeof document !== 'undefined' && !document.getElementById('immortalElixirStyles')) {
    const style = document.createElement('style');
    style.id = 'immortalElixirStyles';
    style.textContent = `
        /* Main immortal blessing animation */
        @keyframes immortalBlessingPulse {
            0% {
                transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                opacity: 0;
            }
            25% {
                transform: translate(-50%, -50%) scale(1.4) rotate(90deg);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.6) rotate(180deg);
                opacity: 0.9;
            }
            75% {
                transform: translate(-50%, -50%) scale(1.4) rotate(270deg);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -50%) scale(1) rotate(360deg);
                opacity: 0;
            }
        }
        
        /* Divine aura effect animation */
        @keyframes immortalDivineAura {
            0% {
                opacity: 0;
                transform: scale(0.5);
            }
            30% {
                opacity: 0.8;
                transform: scale(1.2);
            }
            60% {
                opacity: 0.6;
                transform: scale(1.4);
            }
            100% {
                opacity: 0;
                transform: scale(1.6);
            }
        }
        
        /* Base styles for immortal effects */
        .immortal-blessing {
            will-change: transform, opacity;
        }
        
        .immortal-light-ray {
            will-change: transform, opacity;
        }
        
        .immortal-divine-aura {
            will-change: transform, opacity;
        }
        
        /* Enhanced immortal effects */
        .immortal-blessing:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90px;
            height: 90px;
            background: radial-gradient(circle, 
                rgba(255, 215, 0, 0.5) 0%, 
                rgba(255, 255, 0, 0.4) 40%, 
                transparent 70%);
            border-radius: 50%;
            animation: immortalGlow 1.2s ease-out;
        }
        
        @keyframes immortalGlow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.5);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -50%) scale(2.5);
                opacity: 0;
            }
        }
        
        /* Improved light ray effects */
        .immortal-light-ray {
            text-shadow: 
                0 0 8px #ffd700,
                0 0 16px #ffff00,
                0 0 24px #ffffff;
        }
        
        /* Responsive immortal effects */
        @media (max-width: 768px) {
            .immortal-blessing {
                font-size: 45px !important;
            }
            
            .immortal-light-ray {
                font-size: 18px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .immortal-blessing {
                text-shadow: 
                    0 0 12px #ffffff,
                    0 0 24px #000000;
            }
            
            .immortal-light-ray {
                text-shadow: 
                    0 0 6px #ffffff,
                    0 0 12px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .immortal-blessing {
                animation: immortalReducedMotion 0.6s ease-out forwards;
            }
            
            .immortal-light-ray {
                animation: none;
                opacity: 0;
            }
            
            .immortal-divine-aura {
                animation: immortalAuraReducedMotion 0.8s ease-out forwards;
            }
        }
        
        @keyframes immortalReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.1);
            }
        }
        
        @keyframes immortalAuraReducedMotion {
            0% {
                opacity: 0;
            }
            50% {
                opacity: 0.4;
            }
            100% {
                opacity: 0;
            }
        }
        
        /* Performance optimizations */
        .immortal-blessing,
        .immortal-light-ray,
        .immortal-divine-aura {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
        
        /* Additional divine styling */
        .immortal-divine-aura {
            mix-blend-mode: soft-light;
            border: 1px solid rgba(255, 215, 0, 0.3);
        }
        
        /* Enhanced light ray variety */
        .immortal-light-ray:nth-child(even) {
            animation-delay: 0.1s;
        }
        
        .immortal-light-ray:nth-child(3n) {
            animation-delay: 0.05s;
            animation-duration: 0.9s;
        }
        
        .immortal-light-ray:nth-child(4n) {
            animation-delay: 0.15s;
            animation-duration: 1.1s;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.ElixirOfImmortality = ElixirOfImmortality;
}

console.log('ElixirOfImmortality potion module loaded with multi-player integration');