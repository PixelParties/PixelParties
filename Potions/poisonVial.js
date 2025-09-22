// Potions/poisonVial.js - PoisonVial Potion Implementation with Multi-Player Battle Integration

export class PoisonVialPotion {
    constructor() {
        this.name = 'PoisonVial';
        this.displayName = 'Poison Vial';
        this.description = 'Poisons all enemies at the start of battle';
        this.effectType = 'poison';
        this.targetType = 'all_enemies';
        this.poisonStacks = 1; // Base poison stacks per use
        
        console.log('PoisonVial potion initialized with multi-player support');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply the poison effect to a single target
    async applyPoisonEffect(target, battleManager, stacks = 1) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for PoisonVial effect');
            return false;
        }

        try {
            // Validate target is alive before applying effect
            if (!this.isTargetValid(target)) {
                console.log(`Skipping PoisonVial effect on invalid/dead target: ${target.name || 'Unknown'}`);
                return false;
            }

            // Apply poison status effect using the status effects manager
            if (battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(target, 'poisoned', stacks);
                console.log(`Applied ${stacks} poison stack(s) to ${target.name}`);
            } else {
                console.warn('No status effects manager available - poison effect not applied');
                return false;
            }

            // Show visual effect
            await this.showPoisonCloudEffect(target, battleManager);
            
            return true;
        } catch (error) {
            console.error('Error applying PoisonVial poison effect:', error);
            return false;
        }
    }

    // Apply PoisonVial effects to multiple targets (main entry point for potion handler)
    async applyPoisonEffectsToTargets(targets, battleManager, playerRole, effectCount = 1) {
        if (!targets || targets.length === 0) {
            console.log(`No targets provided for PoisonVial effects from ${playerRole}`);
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for PoisonVial effects');
            return 0;
        }

        console.log(`☠️ Applying PoisonVial effects: ${effectCount} stacks to ${targets.length} targets from ${playerRole}`);

        let targetsAffected = 0;
        const effectPromises = [];

        // Apply poison effects to all targets simultaneously
        for (const target of targets) {
            if (this.isTargetValid(target)) {
                const effectPromise = this.applyPoisonEffect(target, battleManager, effectCount)
                    .then(success => {
                        if (success) {
                            targetsAffected++;
                        }
                        return success;
                    })
                    .catch(error => {
                        console.error(`Error applying PoisonVial to ${target.name}:`, error);
                        return false;
                    });
                
                effectPromises.push(effectPromise);
            }
        }

        // Wait for all effects to complete
        await Promise.all(effectPromises);

        // Add appropriate combat log message
        this.addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected);

        console.log(`✅ PoisonVial effects completed: ${targetsAffected}/${targets.length} targets affected by ${effectCount} stacks from ${playerRole}`);
        return targetsAffected;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a target is valid for PoisonVial effects
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

        console.log(`Collected ${allTargets.length} valid enemy targets for ${playerRole} PoisonVial effects`);
        
        console.log('Target breakdown:', allTargets.map(t => `${t.name} (${t.type || 'hero'})`));
        return allTargets;
    }

    // ===== VISUAL EFFECTS =====

    // Show the signature poison cloud effect
    async showPoisonCloudEffect(target, battleManager) {
        try {
            // Get the target element (hero or creature)
            const targetElement = this.getTargetElement(target, battleManager);
            if (!targetElement) {
                console.warn(`Could not find target element for ${target.name} - skipping visual effect`);
                return;
            }

            // Create and show the poison cloud effect
            await this.createPoisonCloudAnimation(targetElement);
            
        } catch (error) {
            console.error('Error showing poison cloud effect:', error);
        }
    }

    // Create the poison cloud animation
    async createPoisonCloudAnimation(targetElement) {
        // Create the main poison cloud effect
        const poisonCloud = this.createPoisonCloudElement();
        
        // Position it on the target
        this.positionEffectOnTarget(poisonCloud, targetElement);
        
        // Add to DOM and animate
        document.body.appendChild(poisonCloud);
        
        // Create multiple poison particles for enhanced effect
        const particles = [];
        const particleCount = 8 + Math.floor(Math.random() * 4); // 8-11 particles
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.createPoisonParticle(i);
            this.positionEffectOnTarget(particle, targetElement);
            document.body.appendChild(particle);
            particles.push(particle);
        }
        
        // Create subtle screen tint effect
        this.createPoisonScreenTint();
        
        // Wait for animation to complete
        await this.waitForAnimation(800);
        
        // Clean up elements
        poisonCloud.remove();
        particles.forEach(particle => particle.remove());
    }

    // Create the main poison cloud element
    createPoisonCloudElement() {
        const poisonCloud = document.createElement('div');
        poisonCloud.className = 'poison-vial-cloud';
        poisonCloud.innerHTML = '☁️';
        
        poisonCloud.style.cssText = `
            position: absolute;
            font-size: 70px;
            z-index: 1000;
            pointer-events: none;
            animation: poisonVialCloud 0.8s ease-out forwards;
            text-shadow: 
                0 0 25px #9b59b6,
                0 0 50px #8e44ad,
                0 0 75px #6a1b9a;
            filter: drop-shadow(0 0 20px rgba(155, 89, 182, 0.9));
        `;
        
        return poisonCloud;
    }

    // Create a poison particle for the cloud effect
    createPoisonParticle(index) {
        const particle = document.createElement('div');
        particle.className = `poison-vial-particle poison-vial-particle-${index}`;
        
        // Randomize particle appearance
        const poisonSymbols = ['☠️', '💜', '🟣', '🔮', '💀', '☁️'];
        const randomSymbol = poisonSymbols[Math.floor(Math.random() * poisonSymbols.length)];
        particle.innerHTML = randomSymbol;
        
        // Calculate random direction and distance (more clustered than flames)
        const angle = (index * (360 / 12)) + (Math.random() * 20 - 10); // Tighter spread
        const distance = 25 + Math.random() * 35; // Shorter distance for cloud effect
        const duration = 0.5 + Math.random() * 0.6; // Longer duration for lingering effect
        
        particle.style.cssText = `
            position: absolute;
            font-size: ${12 + Math.random() * 20}px;
            z-index: 999;
            pointer-events: none;
            animation: poisonVialParticle${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 15px #9b59b6,
                0 0 30px #8e44ad;
            filter: drop-shadow(0 0 10px rgba(155, 89, 182, 0.7));
        `;
        
        // Create custom animation for this particle
        this.createPoisonParticleAnimation(index, angle, distance, duration);
        
        return particle;
    }

    // Create custom animation for poison particles
    createPoisonParticleAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `poisonVialParticle${index}`;
        
        // Check if animation already exists
        if (this.animationExists(animationName)) {
            return;
        }
        
        const keyframes = `
            @keyframes ${animationName} {
                0% {
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                    opacity: 0.8;
                }
                30% {
                    transform: translate(calc(-50% + ${endX * 0.5}px), calc(-50% + ${endY * 0.5}px)) scale(1.1) rotate(90deg);
                    opacity: 1;
                }
                70% {
                    transform: translate(calc(-50% + ${endX * 0.8}px), calc(-50% + ${endY * 0.8}px)) scale(0.9) rotate(180deg);
                    opacity: 0.6;
                }
                100% {
                    transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.2) rotate(270deg);
                    opacity: 0;
                }
            }
        `;
        
        this.addAnimationToDocument(animationName, keyframes);
    }

    // Create subtle poison screen tint effect
    createPoisonScreenTint() {
        const tint = document.createElement('div');
        tint.className = 'poison-vial-screen-tint';
        
        tint.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, 
                rgba(155, 89, 182, 0.08) 0%, 
                rgba(142, 68, 173, 0.05) 40%, 
                transparent 80%);
            z-index: 998;
            pointer-events: none;
            animation: poisonVialScreenTint 0.4s ease-out forwards;
        `;
        
        document.body.appendChild(tint);
        
        setTimeout(() => tint.remove(), 400);
    }

    // ===== GUEST-SIDE VISUAL HANDLER =====
    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, effectCount = 1 } = data;
        const isHostPotion = (playerSide === 'host');
        
        // Get enemy targets from guest's perspective (heroes and creatures)
        const enemyHeroes = isHostPotion ? 
            Object.values(battleManager.playerHeroes) : // Guest's own heroes (host's enemies)
            Object.values(battleManager.opponentHeroes); // Host's heroes (guest's enemies)
        
        const targets = [];
        
        // Collect enemy heroes
        enemyHeroes.forEach(hero => {
            if (hero && hero.alive) {
                targets.push(hero);
            }
        });
        
        // Collect enemy creatures
        enemyHeroes.forEach(hero => {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                hero.creatures.forEach(creature => {
                    if (creature && creature.alive) {
                        targets.push(creature);
                    }
                });
            }
        });
        
        if (targets.length === 0) return;
        
        // Show poison cloud effects on all targets
        for (const target of targets) {
            await this.showPoisonCloudEffect(target, battleManager);
        }
        
        // Show battle log message
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        battleManager.addCombatLog(
            `☠️ ${playerName}'s Poison Vial spreads! ${targets.length} enemies poisoned!`,
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
        
        // Add some randomness for multiple effects (less than flames for cloud effect)
        const offsetX = (Math.random() - 0.5) * 15;
        const offsetY = (Math.random() - 0.5) * 15;
        
        effectElement.style.left = `${centerX + offsetX}px`;
        effectElement.style.top = `${centerY + offsetY}px`;
        effectElement.style.transform = 'translate(-50%, -50%)';
    }

    // Add battle log message with proper player context
    addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for PoisonVial message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'error';
        
        let message;
        if (effectCount === 1) {
            if (targetsAffected === 1) {
                message = `☠️ ${playerName}'s PoisonVial spreads! 1 enemy poisoned!`;
            } else {
                message = `☠️ ${playerName}'s PoisonVial spreads! ${targetsAffected} enemies poisoned!`;
            }
        } else {
            message = `☠️ ${playerName}'s ${effectCount} PoisonVials spread! ${targetsAffected} enemies suffer toxic poison!`;
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
        let styleSheet = document.getElementById('poisonVialAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'poisonVialAnimations';
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
            console.log('No PoisonVial effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for PoisonVial effects');
            return 0;
        }

        console.log(`☠️ PoisonVial handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Collect all enemy targets
            const targets = this.collectEnemyTargets(battleManager, playerRole);
            
            if (targets.length === 0) {
                console.log(`No valid targets found for ${playerRole} PoisonVial effects`);
                battleManager.addCombatLog(
                    `☠️ ${playerRole === 'host' ? 'Host' : 'Guest'}'s PoisonVial dissipates - no targets!`, 
                    playerRole === 'host' ? 'success' : 'error'
                );
                return 0;
            }

            // Apply effects to all targets
            const effectCount = effects.length;
            const targetsAffected = await this.applyPoisonEffectsToTargets(
                targets, 
                battleManager, 
                playerRole, 
                effectCount
            );

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling PoisonVial effects for ${playerRole}:`, error);
            
            // Fallback: try basic poison application
            this.applyFallbackPoisonEffects(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback poison effect application (without visuals)
    applyFallbackPoisonEffects(battleManager, playerRole, effectCount) {
        try {
            const enemyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.opponentHeroes) : 
                Object.values(battleManager.playerHeroes);
            
            let fallbackTargets = 0;
            
            for (const hero of enemyHeroes) {
                if (hero && hero.alive && battleManager.statusEffectsManager) {
                    battleManager.statusEffectsManager.applyStatusEffect(hero, 'poisoned', effectCount);
                    fallbackTargets++;
                }
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `☠️ ${playerName}'s PoisonVial effects applied (${effectCount} stacks to ${fallbackTargets} heroes)`, 
                playerRole === 'host' ? 'success' : 'error'
            );
            
            console.log(`Fallback PoisonVial: Applied ${effectCount} stacks to ${fallbackTargets} heroes`);
            
        } catch (error) {
            console.error('Error in fallback PoisonVial application:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is PoisonVial
    static isPoisonVial(potionName) {
        return potionName === 'PoisonVial';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'PoisonVial',
            displayName: 'Poison Vial',
            description: 'Poisons all enemies at the start of battle',
            cardType: 'Potion',
            cost: 0,
            effect: 'Applies poison status to all enemy heroes and creatures at battle start',
            poisonStacks: 1,
            targetType: 'all_enemies'
        };
    }

    // Static method to create a new instance
    static create() {
        return new PoisonVialPotion();
    }

    // Static method for quick effect application (utility)
    static async applyToAllEnemies(battleManager, playerRole, stackCount = 1) {
        const potion = new PoisonVialPotion();
        const targets = potion.collectEnemyTargets(battleManager, playerRole);
        return await potion.applyPoisonEffectsToTargets(targets, battleManager, playerRole, stackCount);
    }
}

// Add enhanced CSS animations for PoisonVial effects
if (typeof document !== 'undefined' && !document.getElementById('poisonVialStyles')) {
    const style = document.createElement('style');
    style.id = 'poisonVialStyles';
    style.textContent = `
        /* Main poison cloud animation */
        @keyframes poisonVialCloud {
            0% {
                transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
                opacity: 0;
            }
            25% {
                transform: translate(-50%, -50%) scale(1.2) rotate(45deg);
                opacity: 0.9;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.5) rotate(90deg);
                opacity: 1;
            }
            75% {
                transform: translate(-50%, -50%) scale(1.3) rotate(135deg);
                opacity: 0.7;
            }
            100% {
                transform: translate(-50%, -50%) scale(0.6) rotate(180deg);
                opacity: 0;
            }
        }
        
        /* Screen tint animation - subtle purple effect */
        @keyframes poisonVialScreenTint {
            0% {
                opacity: 0;
            }
            40% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }
        
        /* Base styles for poison effects */
        .poison-vial-cloud {
            will-change: transform, opacity;
        }
        
        .poison-vial-particle {
            will-change: transform, opacity;
        }
        
        .poison-vial-screen-tint {
            will-change: opacity;
        }
        
        /* Enhanced poison cloud effects */
        .poison-vial-cloud:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, 
                rgba(155, 89, 182, 0.4) 0%, 
                rgba(142, 68, 173, 0.2) 40%, 
                transparent 80%);
            border-radius: 50%;
            animation: poisonCloudGlow 0.8s ease-out;
        }
        
        @keyframes poisonCloudGlow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            40% {
                transform: translate(-50%, -50%) scale(1.2);
                opacity: 0.8;
            }
            70% {
                transform: translate(-50%, -50%) scale(2);
                opacity: 0.4;
            }
            100% {
                transform: translate(-50%, -50%) scale(3);
                opacity: 0;
            }
        }
        
        /* Enhanced particle effects */
        .poison-vial-particle {
            text-shadow: 
                0 0 12px #9b59b6,
                0 0 24px #8e44ad,
                0 0 36px #6a1b9a;
        }
        
        /* Responsive poison effects */
        @media (max-width: 768px) {
            .poison-vial-cloud {
                font-size: 50px !important;
            }
            
            .poison-vial-particle {
                font-size: 14px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .poison-vial-cloud {
                text-shadow: 
                    0 0 15px #ffffff,
                    0 0 30px #000000;
            }
            
            .poison-vial-particle {
                text-shadow: 
                    0 0 8px #ffffff,
                    0 0 16px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .poison-vial-cloud {
                animation: poisonVialReducedMotion 0.4s ease-out forwards;
            }
            
            .poison-vial-particle {
                animation: none;
                opacity: 0;
            }
            
            .poison-vial-screen-tint {
                animation: none;
                opacity: 0;
            }
        }
        
        @keyframes poisonVialReducedMotion {
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
        .poison-vial-cloud,
        .poison-vial-particle {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
        
        /* Additional poison-specific effects */
        .poison-vial-cloud {
            background: radial-gradient(circle, 
                rgba(155, 89, 182, 0.1) 0%, 
                transparent 70%);
            border-radius: 50%;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Lingering poison mist effect */
        .poison-vial-particle:after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            background: rgba(155, 89, 182, 0.2);
            border-radius: 50%;
            animation: poisonMist 1s ease-out;
        }
        
        @keyframes poisonMist {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0.6;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.5);
                opacity: 0.3;
            }
            100% {
                transform: translate(-50%, -50%) scale(2.5);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.PoisonVialPotion = PoisonVialPotion;
}

console.log('Enhanced PoisonVial potion module loaded with multi-player integration');