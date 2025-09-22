// Potions/elixirOfCold.js - Elixir of Cold Potion Implementation
// Grants ally heroes persistent "elixirOfCold" buff that gives 50% chance per stack to freeze targets on hit

export class ElixirOfColdPotion {
    constructor() {
        this.name = 'ElixirOfCold';
        this.displayName = 'Elixir of Cold';
        this.description = 'Grants all ally heroes a persistent cold blessing that freezes enemies on attack';
        this.effectType = 'ally_buff';
        this.targetType = 'all_allies';
        this.stacksPerUse = 1; // Each potion grants 1 stack of elixirOfCold
        
        console.log('ElixirOfCold potion initialized with persistent freeze-on-hit effects');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply elixirOfCold buff to a single ally hero
    async applyElixirOfColdBuff(target, battleManager, stacks = 1) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for ElixirOfCold effect');
            return false;
        }

        try {
            // Validate target is alive before applying effect
            if (!this.isTargetValid(target)) {
                console.log(`Skipping ElixirOfCold effect on invalid/dead target: ${target.name || 'Unknown'}`);
                return false;
            }

            // Apply elixirOfCold status effect using the status effects manager
            if (battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(target, 'elixirOfCold', stacks);
                console.log(`Applied ${stacks} elixirOfCold stack(s) to ${target.name}`);
            } else {
                console.warn('No status effects manager available - elixirOfCold effect not applied');
                return false;
            }

            // Show visual effect
            await this.showColdBlessing(target, battleManager);
            
            return true;
        } catch (error) {
            console.error('Error applying ElixirOfCold buff:', error);
            return false;
        }
    }

    // Apply ElixirOfCold effects to multiple targets (main entry point for potion handler)
    async applyElixirOfColdToTargets(targets, battleManager, playerRole, effectCount = 1) {
        if (!targets || targets.length === 0) {
            console.log(`No targets provided for ElixirOfCold effects from ${playerRole}`);
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for ElixirOfCold effects');
            return 0;
        }

        console.log(`❄️ Applying ElixirOfCold effects: ${effectCount} stacks to ${targets.length} targets from ${playerRole}`);

        let targetsAffected = 0;
        const effectPromises = [];

        // Apply cold blessing to all targets simultaneously
        for (const target of targets) {
            if (this.isTargetValid(target)) {
                const effectPromise = this.applyElixirOfColdBuff(target, battleManager, effectCount)
                    .then(success => {
                        if (success) {
                            targetsAffected++;
                        }
                        return success;
                    })
                    .catch(error => {
                        console.error(`Error applying ElixirOfCold to ${target.name}:`, error);
                        return false;
                    });
                
                effectPromises.push(effectPromise);
            }
        }

        // Wait for all effects to complete
        await Promise.all(effectPromises);

        // Add appropriate combat log message
        this.addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected);

        console.log(`✅ ElixirOfCold effects completed: ${targetsAffected}/${targets.length} targets affected by ${effectCount} stacks from ${playerRole}`);
        return targetsAffected;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a target is valid for ElixirOfCold effects
    isTargetValid(target) {
        if (!target) return false;
        
        // Check if target has alive property and is alive
        if (target.hasOwnProperty('alive')) {
            return target.alive === true;
        }
        
        // Fallback: assume target is valid if no alive property
        return true;
    }

    // Collect all valid ally targets for a player role
    collectAllyTargets(battleManager, playerRole) {
        if (!battleManager) {
            console.error('No battle manager provided for target collection');
            return [];
        }

        // Determine which heroes are allies based on player role
        const allyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);

        const allTargets = [];

        // Collect ally heroes
        allyHeroes.forEach(hero => {
            if (this.isTargetValid(hero)) {
                allTargets.push(hero);
            }
        });

        console.log(`Collected ${allTargets.length} valid ally targets for ${playerRole} ElixirOfCold effects`);
        
        console.log('Target breakdown:', allTargets.map(t => `${t.name} (hero)`));
        return allTargets;
    }

    // ===== VISUAL EFFECTS =====

    // Show the cold blessing effect
    async showColdBlessing(target, battleManager) {
        try {
            // Get the target element (hero only for this potion)
            const targetElement = this.getTargetElement(target, battleManager);
            if (!targetElement) {
                console.warn(`Could not find target element for ${target.name} - skipping visual effect`);
                return;
            }

            // Create and show the cold blessing effect
            await this.createColdBlessingAnimation(targetElement);
            
        } catch (error) {
            console.error('Error showing cold blessing effect:', error);
        }
    }

    // Create the cold blessing animation
    async createColdBlessingAnimation(targetElement) {
        // Create the main cold aura effect
        const coldAura = this.createColdAuraElement();
        
        // Position it on the target
        this.positionEffectOnTarget(coldAura, targetElement);
        
        // Add to DOM and animate
        document.body.appendChild(coldAura);
        
        // Create multiple ice particles for enhanced effect
        const particles = [];
        const particleCount = 8 + Math.floor(Math.random() * 4); // 8-11 particles
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.createIceParticle(i);
            this.positionEffectOnTarget(particle, targetElement);
            document.body.appendChild(particle);
            particles.push(particle);
        }
        
        // Create gentle screen tint effect
        this.createColdTint();
        
        // Wait for animation to complete
        await this.waitForAnimation(800);
        
        // Clean up elements
        coldAura.remove();
        particles.forEach(particle => particle.remove());
    }

    // ===== GUEST-SIDE VISUAL HANDLER =====
    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, effectCount = 1 } = data;
        const isHostPotion = (playerSide === 'host');
        
        // Get ally hero targets from guest's perspective
        const targetHeroes = isHostPotion ? 
            Object.values(battleManager.opponentHeroes) : // Host's allies (from guest's POV)
            Object.values(battleManager.playerHeroes);    // Guest's allies (from guest's POV)
        
        const targets = targetHeroes.filter(hero => hero && hero.alive);
        
        if (targets.length === 0) return;
        
        // Show cold blessing effects on all targets
        for (const target of targets) {
            await this.showColdBlessing(target, battleManager);
        }
        
        // Show battle log message
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        battleManager.addCombatLog(
            `❄️ ${playerName}'s Elixir of Cold blesses! ${targets.length} ally heroes gain freezing attacks!`,
            logType
        );
    }

    // Create the main cold aura element
    createColdAuraElement() {
        const coldAura = document.createElement('div');
        coldAura.className = 'elixir-cold-aura';
        coldAura.innerHTML = '❄️';
        
        coldAura.style.cssText = `
            position: absolute;
            font-size: 50px;
            z-index: 1000;
            pointer-events: none;
            animation: elixirColdAura 0.8s ease-out forwards;
            text-shadow: 
                0 0 15px #64c8ff,
                0 0 30px #00bfff,
                0 0 45px #87ceeb;
            filter: drop-shadow(0 0 12px rgba(100, 200, 255, 0.8));
        `;
        
        return coldAura;
    }

    // Create an ice particle for the blessing effect
    createIceParticle(index) {
        const particle = document.createElement('div');
        particle.className = `elixir-cold-particle elixir-cold-particle-${index}`;
        
        // Randomize particle appearance
        const iceSymbols = ['❄️', '🧊', '💎', '✨', '⭐'];
        const randomSymbol = iceSymbols[Math.floor(Math.random() * iceSymbols.length)];
        particle.innerHTML = randomSymbol;
        
        // Calculate random direction and distance
        const angle = (index * (360 / 12)) + (Math.random() * 30 - 15); // Spread particles around
        const distance = 30 + Math.random() * 40; // Random distance
        const duration = 0.4 + Math.random() * 0.4; // Random duration
        
        particle.style.cssText = `
            position: absolute;
            font-size: ${12 + Math.random() * 20}px;
            z-index: 999;
            pointer-events: none;
            animation: elixirColdParticle${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 8px #64c8ff,
                0 0 16px #00bfff;
            filter: drop-shadow(0 0 6px rgba(100, 200, 255, 0.6));
        `;
        
        // Create custom animation for this particle
        this.createParticleAnimation(index, angle, distance, duration);
        
        return particle;
    }

    // Create custom animation for ice particles
    createParticleAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `elixirColdParticle${index}`;
        
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
                    transform: translate(calc(-50% + ${endX * 0.5}px), calc(-50% + ${endY * 0.5}px)) scale(1) rotate(90deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.2) rotate(180deg);
                    opacity: 0;
                }
            }
        `;
        
        this.addAnimationToDocument(animationName, keyframes);
    }

    // Create cold tint effect
    createColdTint() {
        const tint = document.createElement('div');
        tint.className = 'elixir-cold-screen-tint';
        
        tint.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, 
                rgba(100, 200, 255, 0.1) 0%, 
                rgba(135, 206, 235, 0.05) 30%, 
                transparent 70%);
            z-index: 998;
            pointer-events: none;
            animation: elixirColdScreenTint 0.3s ease-out forwards;
        `;
        
        document.body.appendChild(tint);
        
        setTimeout(() => tint.remove(), 300);
    }

    // ===== UTILITY METHODS =====

    // Get the DOM element for a target (hero only)
    getTargetElement(target, battleManager) {
        if (!target || !battleManager) return null;
        
        // Check if it's a hero
        if (target.position && target.side) {
            // Use battle manager's method to get hero element
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
        const offsetX = (Math.random() - 0.5) * 15;
        const offsetY = (Math.random() - 0.5) * 15;
        
        effectElement.style.left = `${centerX + offsetX}px`;
        effectElement.style.top = `${centerY + offsetY}px`;
        effectElement.style.transform = 'translate(-50%, -50%)';
    }

    // Add battle log message with proper player context
    addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for ElixirOfCold message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'error';
        
        let message;
        if (effectCount === 1) {
            if (targetsAffected === 1) {
                message = `❄️ ${playerName}'s Elixir of Cold blesses! 1 ally gains freezing attacks!`;
            } else {
                message = `❄️ ${playerName}'s Elixir of Cold blesses! ${targetsAffected} allies gain freezing attacks!`;
            }
        } else {
            message = `❄️ ${playerName}'s ${effectCount} Elixirs of Cold bless! ${targetsAffected} allies gain enhanced freezing attacks!`;
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
        let styleSheet = document.getElementById('elixirColdAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'elixirColdAnimations';
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
            console.log('No ElixirOfCold effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for ElixirOfCold effects');
            return 0;
        }

        console.log(`❄️ ElixirOfCold handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Collect all ally targets (heroes only)
            const targets = this.collectAllyTargets(battleManager, playerRole);
            
            if (targets.length === 0) {
                console.log(`No valid targets found for ${playerRole} ElixirOfCold effects`);
                battleManager.addCombatLog(
                    `❄️ ${playerRole === 'host' ? 'Host' : 'Guest'}'s Elixir of Cold has no valid targets!`, 
                    playerRole === 'host' ? 'success' : 'error'
                );
                return 0;
            }

            // Apply effects to all targets
            const effectCount = effects.length;
            const targetsAffected = await this.applyElixirOfColdToTargets(
                targets, 
                battleManager, 
                playerRole, 
                effectCount
            );

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling ElixirOfCold effects for ${playerRole}:`, error);
            
            // Fallback: try basic cold blessing application
            this.applyFallbackColdBlessing(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback cold blessing application (without visuals)
    applyFallbackColdBlessing(battleManager, playerRole, effectCount) {
        try {
            const allyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.playerHeroes) : 
                Object.values(battleManager.opponentHeroes);
            
            let fallbackTargets = 0;
            
            for (const hero of allyHeroes) {
                if (hero && hero.alive && battleManager.statusEffectsManager) {
                    battleManager.statusEffectsManager.applyStatusEffect(hero, 'elixirOfCold', effectCount);
                    fallbackTargets++;
                }
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `❄️ ${playerName}'s Elixir of Cold effects applied (${effectCount} stacks to ${fallbackTargets} heroes)`, 
                playerRole === 'host' ? 'success' : 'error'
            );
            
            console.log(`Fallback ElixirOfCold: Applied ${effectCount} stacks to ${fallbackTargets} heroes`);
            
        } catch (error) {
            console.error('Error in fallback ElixirOfCold application:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is ElixirOfCold
    static isElixirOfCold(potionName) {
        return potionName === 'ElixirOfCold';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'ElixirOfCold',
            displayName: 'Elixir of Cold',
            description: 'Grants all ally heroes freezing attacks for the entire battle',
            cardType: 'Potion',
            cost: 0,
            effect: 'Applies elixirOfCold status to all ally heroes. Each stack gives 50% chance to freeze target on attack.',
            stacks: 1,
            targetType: 'all_allies'
        };
    }

    // Static method to create a new instance
    static create() {
        return new ElixirOfColdPotion();
    }

    // Static method for quick effect application (utility)
    static async applyToAllAllies(battleManager, playerRole, stackCount = 1) {
        const potion = new ElixirOfColdPotion();
        const targets = potion.collectAllyTargets(battleManager, playerRole);
        return await potion.applyElixirOfColdToTargets(targets, battleManager, playerRole, stackCount);
    }
}

// Add enhanced CSS animations for ElixirOfCold effects
if (typeof document !== 'undefined' && !document.getElementById('elixirColdStyles')) {
    const style = document.createElement('style');
    style.id = 'elixirColdStyles';
    style.textContent = `
        /* Main cold aura animation */
        @keyframes elixirColdAura {
            0% {
                transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
                opacity: 0;
            }
            30% {
                transform: translate(-50%, -50%) scale(1.3) rotate(120deg);
                opacity: 1;
            }
            70% {
                transform: translate(-50%, -50%) scale(1.8) rotate(240deg);
                opacity: 0.9;
            }
            100% {
                transform: translate(-50%, -50%) scale(1.2) rotate(360deg);
                opacity: 0;
            }
        }
        
        /* Screen tint animation */
        @keyframes elixirColdScreenTint {
            0% {
                opacity: 0;
            }
            50% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }
        
        /* Base styles for cold effects */
        .elixir-cold-aura {
            will-change: transform, opacity;
        }
        
        .elixir-cold-particle {
            will-change: transform, opacity;
        }
        
        .elixir-cold-screen-tint {
            will-change: opacity;
        }
        
        /* Enhanced cold effects for different elements */
        .elixir-cold-aura:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, 
                rgba(100, 200, 255, 0.4) 0%, 
                rgba(135, 206, 235, 0.2) 30%, 
                transparent 70%);
            border-radius: 50%;
            animation: coldGlow 0.8s ease-out;
        }
        
        @keyframes coldGlow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.2);
                opacity: 0.7;
            }
            100% {
                transform: translate(-50%, -50%) scale(2);
                opacity: 0;
            }
        }
        
        /* Improved particle effects */
        .elixir-cold-particle {
            text-shadow: 
                0 0 6px #64c8ff,
                0 0 12px #00bfff,
                0 0 18px #87ceeb;
        }
        
        /* Responsive cold effects */
        @media (max-width: 768px) {
            .elixir-cold-aura {
                font-size: 35px !important;
            }
            
            .elixir-cold-particle {
                font-size: 14px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .elixir-cold-aura {
                text-shadow: 
                    0 0 8px #ffffff,
                    0 0 16px #000000;
            }
            
            .elixir-cold-particle {
                text-shadow: 
                    0 0 4px #ffffff,
                    0 0 8px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .elixir-cold-aura {
                animation: elixirColdReducedMotion 0.4s ease-out forwards;
            }
            
            .elixir-cold-particle {
                animation: none;
                opacity: 0;
            }
            
            .elixir-cold-screen-tint {
                animation: none;
                opacity: 0;
            }
        }
        
        @keyframes elixirColdReducedMotion {
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
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        /* Performance optimizations */
        .elixir-cold-aura,
        .elixir-cold-particle {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.ElixirOfColdPotion = ElixirOfColdPotion;
}

console.log('Enhanced ElixirOfCold potion module loaded with freezing attack blessings');