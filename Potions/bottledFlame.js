// Potions/bottledFlame.js - Enhanced BottledFlame Potion Implementation with Multi-Player Battle Integration

export class BottledFlamePotion {
    constructor() {
        this.name = 'BottledFlame';
        this.displayName = 'Bottled Flame';
        this.description = 'Burns all enemies at the start of battle';
        this.effectType = 'burn';
        this.targetType = 'all_enemies';
        this.burnStacks = 1; // Base burn stacks per use
        
        console.log('BottledFlame potion initialized with multi-player support');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply the burning effect to a single target
    async applyBurnEffect(target, battleManager, stacks = 1) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for BottledFlame effect');
            return false;
        }

        try {
            // Validate target is alive before applying effect
            if (!this.isTargetValid(target)) {
                console.log(`Skipping BottledFlame effect on invalid/dead target: ${target.name || 'Unknown'}`);
                return false;
            }

            // Apply burn status effect using the status effects manager
            if (battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(target, 'burned', stacks);
                console.log(`Applied ${stacks} burn stack(s) to ${target.name}`);
            } else {
                console.warn('No status effects manager available - burn effect not applied');
                return false;
            }

            // Show visual effect
            await this.showBurstingFlameEffect(target, battleManager);
            
            return true;
        } catch (error) {
            console.error('Error applying BottledFlame burn effect:', error);
            return false;
        }
    }

    // Apply BottledFlame effects to multiple targets (main entry point for potion handler)
    async applyBurnEffectsToTargets(targets, battleManager, playerRole, effectCount = 1) {
        if (!targets || targets.length === 0) {
            console.log(`No targets provided for BottledFlame effects from ${playerRole}`);
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for BottledFlame effects');
            return 0;
        }

        console.log(`🔥 Applying BottledFlame effects: ${effectCount} stacks to ${targets.length} targets from ${playerRole}`);

        let targetsAffected = 0;
        const effectPromises = [];

        // Apply burn effects to all targets simultaneously
        for (const target of targets) {
            if (this.isTargetValid(target)) {
                const effectPromise = this.applyBurnEffect(target, battleManager, effectCount)
                    .then(success => {
                        if (success) {
                            targetsAffected++;
                        }
                        return success;
                    })
                    .catch(error => {
                        console.error(`Error applying BottledFlame to ${target.name}:`, error);
                        return false;
                    });
                
                effectPromises.push(effectPromise);
            }
        }

        // Wait for all effects to complete
        await Promise.all(effectPromises);

        // Add appropriate combat log message
        this.addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected);

        console.log(`✅ BottledFlame effects completed: ${targetsAffected}/${targets.length} targets affected by ${effectCount} stacks from ${playerRole}`);
        return targetsAffected;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a target is valid for BottledFlame effects
    isTargetValid(target) {
        if (!target) return false;
        
        // Check if target has alive property and is alive
        if (target.hasOwnProperty('alive')) {
            return target.alive === true;
        }
        
        // Fallback: assume target is valid if no alive property
        return true;
    }

    // Collect all valid enemy targets for a player role
    collectEnemyTargets(battleManager, playerRole) {
        if (!battleManager) {
            console.error('No battle manager provided for target collection');
            return [];
        }

        // Determine which heroes are enemies based on player role
        const enemyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.opponentHeroes) : 
            Object.values(battleManager.playerHeroes);

        const allTargets = [];

        // Collect enemy heroes
        enemyHeroes.forEach(hero => {
            if (this.isTargetValid(hero)) {
                allTargets.push(hero);
            }
        });

        // Collect enemy creatures
        enemyHeroes.forEach(hero => {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                hero.creatures.forEach(creature => {
                    if (this.isTargetValid(creature)) {
                        allTargets.push(creature);
                    }
                });
            }
        });

        console.log(`Collected ${allTargets.length} valid enemy targets for ${playerRole} BottledFlame effects`);
        
        console.log('Target breakdown:', allTargets.map(t => `${t.name} (${t.type || 'hero'})`));
        return allTargets;
    }

    // ===== VISUAL EFFECTS =====

    // Show the signature bursting flame effect
    async showBurstingFlameEffect(target, battleManager) {
        try {
            // Get the target element (hero or creature)
            const targetElement = this.getTargetElement(target, battleManager);
            if (!targetElement) {
                console.warn(`Could not find target element for ${target.name} - skipping visual effect`);
                return;
            }

            // Create and show the bursting flame effect
            await this.createBurstingFlameAnimation(targetElement);
            
        } catch (error) {
            console.error('Error showing bursting flame effect:', error);
        }
    }

    // Create the bursting flame animation
    async createBurstingFlameAnimation(targetElement) {
        // Create the main flame burst effect
        const flameBurst = this.createFlameBurstElement();
        
        // Position it on the target
        this.positionEffectOnTarget(flameBurst, targetElement);
        
        // Add to DOM and animate
        document.body.appendChild(flameBurst);
        
        // Create multiple flame particles for enhanced effect
        const particles = [];
        const particleCount = 6 + Math.floor(Math.random() * 4); // 6-9 particles
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.createFlameParticle(i);
            this.positionEffectOnTarget(particle, targetElement);
            document.body.appendChild(particle);
            particles.push(particle);
        }
        
        // Create screen flash effect (reduced intensity for multiple targets)
        this.createScreenFlash();
        
        // Wait for animation to complete
        await this.waitForAnimation(600);
        
        // Clean up elements
        flameBurst.remove();
        particles.forEach(particle => particle.remove());
    }

    // Create the main flame burst element
    createFlameBurstElement() {
        const flameBurst = document.createElement('div');
        flameBurst.className = 'bottled-flame-burst';
        flameBurst.innerHTML = '🔥';
        
        flameBurst.style.cssText = `
            position: absolute;
            font-size: 60px;
            z-index: 1000;
            pointer-events: none;
            animation: bottledFlameBurst 0.6s ease-out forwards;
            text-shadow: 
                0 0 20px #ff4444,
                0 0 40px #ff6600,
                0 0 60px #ffaa00;
            filter: drop-shadow(0 0 15px rgba(255, 68, 68, 0.8));
        `;
        
        return flameBurst;
    }

    // Create a flame particle for the burst effect
    createFlameParticle(index) {
        const particle = document.createElement('div');
        particle.className = `bottled-flame-particle bottled-flame-particle-${index}`;
        
        // Randomize particle appearance
        const flames = ['🔥', '💥', '✨', '🌟', '⭐'];
        const randomFlame = flames[Math.floor(Math.random() * flames.length)];
        particle.innerHTML = randomFlame;
        
        // Calculate random direction and distance
        const angle = (index * (360 / 8)) + (Math.random() * 30 - 15); // Spread particles around
        const distance = 40 + Math.random() * 50; // Random distance
        const duration = 0.3 + Math.random() * 0.4; // Random duration
        
        particle.style.cssText = `
            position: absolute;
            font-size: ${15 + Math.random() * 25}px;
            z-index: 999;
            pointer-events: none;
            animation: bottledFlameParticle${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 10px #ff4444,
                0 0 20px #ff6600;
            filter: drop-shadow(0 0 8px rgba(255, 68, 68, 0.6));
        `;
        
        // Create custom animation for this particle
        this.createParticleAnimation(index, angle, distance, duration);
        
        return particle;
    }

    // Create custom animation for flame particles
    createParticleAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `bottledFlameParticle${index}`;
        
        // Check if animation already exists
        if (this.animationExists(animationName)) {
            return;
        }
        
        const keyframes = `
            @keyframes ${animationName} {
                0% {
                    transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(calc(-50% + ${endX * 0.7}px), calc(-50% + ${endY * 0.7}px)) scale(1.2) rotate(180deg);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.3) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        
        this.addAnimationToDocument(animationName, keyframes);
    }

    // Create screen flash effect (reduced intensity for multi-target scenarios)
    createScreenFlash() {
        const flash = document.createElement('div');
        flash.className = 'bottled-flame-screen-flash';
        
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, 
                rgba(255, 100, 0, 0.15) 0%, 
                rgba(255, 68, 68, 0.1) 30%, 
                transparent 70%);
            z-index: 998;
            pointer-events: none;
            animation: bottledFlameScreenFlash 0.25s ease-out forwards;
        `;
        
        document.body.appendChild(flash);
        
        setTimeout(() => flash.remove(), 250);
    }

    // ===== GUEST-SIDE VISUAL HANDLER =====
    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, effectCount = 1 } = data;
        const isHostPotion = (playerSide === 'host');
        
        // Get all enemy targets (heroes and creatures) from guest's perspective
        const targetHeroes = isHostPotion ? 
            Object.values(battleManager.playerHeroes) : // Guest's targets (host's enemies)
            Object.values(battleManager.opponentHeroes); // Host's targets (guest's enemies)
        
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
        
        // Show flame burst effects on all targets
        for (const target of targets) {
            await this.showBurstingFlameEffect(target, battleManager);
        }
        
        // Show battle log message
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        battleManager.addCombatLog(
            `🔥 ${playerName}'s Bottled Flame ignites! ${targets.length} targets burned!`,
            logType
        );
    }

    // ===== UTILITY METHODS =====

    // Get the DOM element for a target (hero or creature)
    getTargetElement(target, battleManager) {
        if (!target || !battleManager) return null;
        
        // Check if it's a hero
        if (target.type === 'hero' || (!target.type && target.position && target.side)) {
            // Use battle manager's method to get hero element
            return battleManager.getHeroElement(target.side, target.position);
        }
        
        // Check if it's a creature - need to find its position
        if (target.type === 'creature' || (!target.type && !target.position)) {
            const creatureInfo = this.findCreatureInfo(target, battleManager);
            if (!creatureInfo) return null;
            
            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
        
        // Fallback: try to find by name if it's a hero
        if (target.name && target.side && target.position) {
            return battleManager.getHeroElement(target.side, target.position);
        }
        
        return null;
    }

    // Find creature information by searching through all heroes
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
                
                // Also try to find by name if direct reference fails
                const nameIndex = hero.creatures.findIndex(c => c && c.name === creature.name);
                if (nameIndex !== -1 && hero.creatures[nameIndex] === creature) {
                    return { hero, side, position, creatureIndex: nameIndex };
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
    addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for BottledFlame message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'error';
        
        let message;
        if (effectCount === 1) {
            if (targetsAffected === 1) {
                message = `🔥 ${playerName}'s BottledFlame ignites! 1 enemy burned!`;
            } else {
                message = `🔥 ${playerName}'s BottledFlame ignites! ${targetsAffected} enemies burned!`;
            }
        } else {
            message = `🔥 ${playerName}'s ${effectCount} BottledFlames ignite! ${targetsAffected} enemies suffer intense burns!`;
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
        let styleSheet = document.getElementById('bottledFlameAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'bottledFlameAnimations';
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
            console.log('No BottledFlame effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for BottledFlame effects');
            return 0;
        }

        console.log(`🔥 BottledFlame handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Collect all enemy targets
            const targets = this.collectEnemyTargets(battleManager, playerRole);
            
            if (targets.length === 0) {
                console.log(`No valid targets found for ${playerRole} BottledFlame effects`);
                battleManager.addCombatLog(
                    `🔥 ${playerRole === 'host' ? 'Host' : 'Guest'}'s BottledFlame fizzles - no targets!`, 
                    playerRole === 'host' ? 'success' : 'error'
                );
                return 0;
            }

            // Apply effects to all targets
            const effectCount = effects.length;
            const targetsAffected = await this.applyBurnEffectsToTargets(
                targets, 
                battleManager, 
                playerRole, 
                effectCount
            );

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling BottledFlame effects for ${playerRole}:`, error);
            
            // Fallback: try basic burn application
            this.applyFallbackBurnEffects(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback burn effect application (without visuals)
    applyFallbackBurnEffects(battleManager, playerRole, effectCount) {
        try {
            const enemyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.opponentHeroes) : 
                Object.values(battleManager.playerHeroes);
            
            let fallbackTargets = 0;
            
            for (const hero of enemyHeroes) {
                if (hero && hero.alive && battleManager.statusEffectsManager) {
                    battleManager.statusEffectsManager.applyStatusEffect(hero, 'burned', effectCount);
                    fallbackTargets++;
                }
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `🔥 ${playerName}'s BottledFlame effects applied (${effectCount} stacks to ${fallbackTargets} heroes)`, 
                playerRole === 'host' ? 'success' : 'error'
            );
            
            console.log(`Fallback BottledFlame: Applied ${effectCount} stacks to ${fallbackTargets} heroes`);
            
        } catch (error) {
            console.error('Error in fallback BottledFlame application:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is BottledFlame
    static isBottledFlame(potionName) {
        return potionName === 'BottledFlame';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'BottledFlame',
            displayName: 'Bottled Flame',
            description: 'Burns all enemies at the start of battle',
            cardType: 'Potion',
            cost: 0,
            effect: 'Applies burn status to all enemy heroes and creatures at battle start',
            burnStacks: 1,
            targetType: 'all_enemies'
        };
    }

    // Static method to create a new instance
    static create() {
        return new BottledFlamePotion();
    }

    // Static method for quick effect application (utility)
    static async applyToAllEnemies(battleManager, playerRole, stackCount = 1) {
        const potion = new BottledFlamePotion();
        const targets = potion.collectEnemyTargets(battleManager, playerRole);
        return await potion.applyBurnEffectsToTargets(targets, battleManager, playerRole, stackCount);
    }
}

// Add enhanced CSS animations for BottledFlame effects
if (typeof document !== 'undefined' && !document.getElementById('bottledFlameStyles')) {
    const style = document.createElement('style');
    style.id = 'bottledFlameStyles';
    style.textContent = `
        /* Main flame burst animation */
        @keyframes bottledFlameBurst {
            0% {
                transform: translate(-50%, -50%) scale(0.1) rotate(0deg);
                opacity: 0;
            }
            20% {
                transform: translate(-50%, -50%) scale(1.5) rotate(90deg);
                opacity: 1;
            }
            60% {
                transform: translate(-50%, -50%) scale(2.2) rotate(270deg);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -50%) scale(0.8) rotate(360deg);
                opacity: 0;
            }
        }
        
        /* Screen flash animation - reduced intensity */
        @keyframes bottledFlameScreenFlash {
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
        
        /* Base styles for flame effects */
        .bottled-flame-burst {
            will-change: transform, opacity;
        }
        
        .bottled-flame-particle {
            will-change: transform, opacity;
        }
        
        .bottled-flame-screen-flash {
            will-change: opacity;
        }
        
        /* Enhanced flame effects for different elements */
        .bottled-flame-burst:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, 
                rgba(255, 100, 0, 0.5) 0%, 
                rgba(255, 68, 68, 0.3) 30%, 
                transparent 70%);
            border-radius: 50%;
            animation: flameGlow 0.6s ease-out;
        }
        
        @keyframes flameGlow {
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
        
        /* Improved particle effects */
        .bottled-flame-particle {
            text-shadow: 
                0 0 8px #ff4444,
                0 0 16px #ff6600,
                0 0 24px #ffaa00;
        }
        
        /* Responsive flame effects */
        @media (max-width: 768px) {
            .bottled-flame-burst {
                font-size: 40px !important;
            }
            
            .bottled-flame-particle {
                font-size: 16px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .bottled-flame-burst {
                text-shadow: 
                    0 0 10px #ffffff,
                    0 0 20px #000000;
            }
            
            .bottled-flame-particle {
                text-shadow: 
                    0 0 5px #ffffff,
                    0 0 10px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .bottled-flame-burst {
                animation: bottledFlameReducedMotion 0.3s ease-out forwards;
            }
            
            .bottled-flame-particle {
                animation: none;
                opacity: 0;
            }
            
            .bottled-flame-screen-flash {
                animation: none;
                opacity: 0;
            }
        }
        
        @keyframes bottledFlameReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
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
        .bottled-flame-burst,
        .bottled-flame-particle {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.BottledFlamePotion = BottledFlamePotion;
}

console.log('Enhanced BottledFlame potion module loaded with multi-player integration');