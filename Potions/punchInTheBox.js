// Potions/punchInTheBox.js - Punch in the Box Potion Implementation

export class PunchInTheBoxPotion {
    constructor() {
        this.name = 'PunchInTheBox';
        this.displayName = 'Punch in the Box';
        this.description = 'Stuns all enemies in a random zone at the start of battle';
        this.effectType = 'stun';
        this.targetType = 'random_zone_enemies';
        this.stunStacks = 1; // Base stun stacks per use
        
        console.log('PunchInTheBox potion initialized');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply stunning effect to a single target
    async applyStunEffect(target, battleManager, stacks = 1) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for PunchInTheBox effect');
            return false;
        }

        try {
            // Validate target is alive before applying effect
            if (!this.isTargetValid(target)) {
                console.log(`Skipping PunchInTheBox effect on invalid/dead target: ${target.name || 'Unknown'}`);
                return false;
            }

            // Apply stun status effect using the status effects manager
            if (battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(target, 'stunned', stacks);
                console.log(`Applied ${stacks} stun stack(s) to ${target.name}`);
            } else {
                console.warn('No status effects manager available - stun effect not applied');
                return false;
            }

            // Show visual effect
            await this.showPunchEffect(target, battleManager);
            
            return true;
        } catch (error) {
            console.error('Error applying PunchInTheBox stun effect:', error);
            return false;
        }
    }

    // Apply PunchInTheBox effects to targets in a random zone (main entry point)
    async applyStunEffectsToRandomZone(battleManager, playerRole, effectCount = 1) {
        if (!battleManager) {
            console.error('No battle manager provided for PunchInTheBox effects');
            return 0;
        }

        console.log(`👊 Applying PunchInTheBox effects: ${effectCount} stack(s) from ${playerRole}`);

        // Find enemy zones with heroes
        const availableZones = this.findEnemyZonesWithHeroes(battleManager, playerRole);
        
        if (availableZones.length === 0) {
            console.log('No enemy zones with heroes found for PunchInTheBox');
            return 0;
        }

        // Select random zone
        const randomZone = availableZones[Math.floor(Math.random() * availableZones.length)];
        console.log(`👊 PunchInTheBox targeting random zone: ${randomZone}`);

        // Collect all targets in the selected zone
        const targets = this.collectTargetsInZone(battleManager, playerRole, randomZone);
        
        if (targets.length === 0) {
            console.log(`No valid targets found in zone ${randomZone}`);
            return 0;
        }

        let targetsAffected = 0;
        const effectPromises = [];

        // Apply stun effects to all targets in the zone simultaneously
        for (const target of targets) {
            if (this.isTargetValid(target)) {
                const effectPromise = this.applyStunEffect(target, battleManager, effectCount)
                    .then(success => {
                        if (success) {
                            targetsAffected++;
                        }
                        return success;
                    })
                    .catch(error => {
                        console.error(`Error applying PunchInTheBox to ${target.name}:`, error);
                        return false;
                    });
                
                effectPromises.push(effectPromise);
            }
        }

        // Wait for all effects to complete
        await Promise.all(effectPromises);

        // Add appropriate combat log message
        this.addBattleLogMessage(battleManager, playerRole, randomZone, effectCount, targetsAffected);

        console.log(`✅ PunchInTheBox effects completed: ${targetsAffected} targets stunned in ${randomZone} zone by ${effectCount} stack(s) from ${playerRole}`);
        return effectCount; // Return number of potion effects processed
    }

    // ===== ZONE AND TARGET MANAGEMENT =====

    // Find enemy zones that have heroes in them
    findEnemyZonesWithHeroes(battleManager, playerRole) {
        const enemyHeroes = playerRole === 'host' ? 
            battleManager.opponentHeroes : 
            battleManager.playerHeroes;

        const availableZones = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && this.isTargetValid(hero)) {
                availableZones.push(position);
            }
        });

        console.log(`Found ${availableZones.length} enemy zones with heroes: ${availableZones.join(', ')}`);
        return availableZones;
    }

    // Collect all targets (hero + creatures) in a specific zone
    collectTargetsInZone(battleManager, playerRole, zone) {
        const enemyHeroes = playerRole === 'host' ? 
            battleManager.opponentHeroes : 
            battleManager.playerHeroes;

        const targets = [];
        const hero = enemyHeroes[zone];
        
        if (!hero) {
            return targets;
        }

        // Add the hero if valid
        if (this.isTargetValid(hero)) {
            targets.push(hero);
        }

        // Add all creatures in this hero's zone
        if (hero.creatures && Array.isArray(hero.creatures)) {
            hero.creatures.forEach(creature => {
                if (this.isTargetValid(creature)) {
                    targets.push(creature);
                }
            });
        }

        console.log(`Collected ${targets.length} targets in ${zone} zone: ${targets.map(t => t.name).join(', ')}`);
        return targets;
    }

    // Check if a target is valid for PunchInTheBox effects
    isTargetValid(target) {
        if (!target) return false;
        
        // Check if target has alive property and is alive
        if (target.hasOwnProperty('alive')) {
            return target.alive === true;
        }
        
        // Fallback: assume target is valid if no alive property
        return true;
    }

    // ===== VISUAL EFFECTS =====

    // Show the signature punch effect
    async showPunchEffect(target, battleManager) {
        try {
            // Get the target element (hero or creature)
            const targetElement = this.getTargetElement(target, battleManager);
            if (!targetElement) {
                console.warn(`Could not find target element for ${target.name} - skipping visual effect`);
                return;
            }

            // Create and show the punch animation
            await this.createPunchAnimation(targetElement);
            
        } catch (error) {
            console.error('Error showing punch effect:', error);
        }
    }

    // Create the punch animation
    async createPunchAnimation(targetElement) {
        // Create the main punch effect
        const punchEffect = this.createPunchElement();
        
        // Position it on the target
        this.positionEffectOnTarget(punchEffect, targetElement);
        
        // Add to DOM and animate
        document.body.appendChild(punchEffect);
        
        // Create impact particles
        const particles = [];
        const particleCount = 4 + Math.floor(Math.random() * 3); // 4-6 particles
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.createImpactParticle(i);
            this.positionEffectOnTarget(particle, targetElement);
            document.body.appendChild(particle);
            particles.push(particle);
        }
        
        // Wait for animation to complete
        await this.waitForAnimation(600);
        
        // Clean up elements
        punchEffect.remove();
        particles.forEach(particle => particle.remove());
    }

    // Create the main punch element
    createPunchElement() {
        const punchEffect = document.createElement('div');
        punchEffect.className = 'punch-in-box-effect';
        punchEffect.innerHTML = '👊';
        
        punchEffect.style.cssText = `
            position: absolute;
            font-size: 48px;
            z-index: 1000;
            pointer-events: none;
            animation: punchInBoxImpact 0.6s ease-out forwards;
            text-shadow: 
                0 0 20px rgba(255, 215, 0, 0.8),
                0 0 40px rgba(255, 165, 0, 0.6);
            filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.7));
        `;
        
        return punchEffect;
    }

    // Create an impact particle
    createImpactParticle(index) {
        const particle = document.createElement('div');
        particle.className = `punch-impact-particle punch-particle-${index}`;
        
        // Randomize particle appearance
        const impacts = ['💥', '⭐', '✨', '💫', '⚡'];
        const randomImpact = impacts[Math.floor(Math.random() * impacts.length)];
        particle.innerHTML = randomImpact;
        
        // Calculate random direction and distance
        const angle = (index * (360 / 6)) + (Math.random() * 30 - 15); // Spread particles around
        const distance = 30 + Math.random() * 40; // Random distance
        const duration = 0.3 + Math.random() * 0.3; // Random duration
        
        particle.style.cssText = `
            position: absolute;
            font-size: ${12 + Math.random() * 20}px;
            z-index: 999;
            pointer-events: none;
            animation: punchImpactParticle${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 10px rgba(255, 215, 0, 0.8),
                0 0 20px rgba(255, 165, 0, 0.6);
        `;
        
        // Create custom animation for this particle
        this.createParticleAnimation(index, angle, distance, duration);
        
        return particle;
    }

    // Create custom animation for impact particles
    createParticleAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `punchImpactParticle${index}`;
        
        // Check if animation already exists
        if (this.animationExists(animationName)) {
            return;
        }
        
        const keyframes = `
            @keyframes ${animationName} {
                0% {
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(calc(-50% + ${endX * 0.6}px), calc(-50% + ${endY * 0.6}px)) scale(1.1) rotate(180deg);
                    opacity: 0.9;
                }
                100% {
                    transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.2) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        
        this.addAnimationToDocument(animationName, keyframes);
    }

    // ===== GUEST-SIDE VISUAL HANDLER =====
    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, effectCount = 1 } = data;
        const isHostPotion = (playerSide === 'host');
        
        // Get enemy heroes from guest's perspective
        const enemyHeroes = isHostPotion ? 
            Object.values(battleManager.playerHeroes) : // Guest's own heroes (host's enemies)
            Object.values(battleManager.opponentHeroes); // Host's heroes (guest's enemies)
        
        const targets = [];
        
        // Collect all enemy heroes and creatures
        enemyHeroes.forEach(hero => {
            if (hero && hero.alive) {
                targets.push(hero);
            }
            
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                hero.creatures.forEach(creature => {
                    if (creature && creature.alive) {
                        targets.push(creature);
                    }
                });
            }
        });
        
        if (targets.length === 0) return;
        
        // Show punch effects on random targets (simulate random zone targeting)
        const effectsToShow = Math.min(targets.length, effectCount * 3); // Show some punch effects
        const selectedTargets = targets.slice(0, effectsToShow);
        
        for (const target of selectedTargets) {
            await this.showPunchEffect(target, battleManager);
        }
        
        // Show battle log message
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        const punchText = effectCount === 1 ? 'Punch in the Box' : `${effectCount} Punch in the Boxes`;
        battleManager.addCombatLog(
            `👊 ${playerName}'s ${punchText} strikes! Random zones targeted!`,
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
        const offsetX = (Math.random() - 0.5) * 15;
        const offsetY = (Math.random() - 0.5) * 15;
        
        effectElement.style.left = `${centerX + offsetX}px`;
        effectElement.style.top = `${centerY + offsetY}px`;
        effectElement.style.transform = 'translate(-50%, -50%)';
    }

    // Add battle log message
    addBattleLogMessage(battleManager, playerRole, targetZone, effectCount, targetsAffected) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for PunchInTheBox message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'error';
        const zoneDisplay = targetZone.charAt(0).toUpperCase() + targetZone.slice(1);
        
        let message;
        if (effectCount === 1) {
            message = `👊 ${playerName}'s Punch in the Box strikes the ${zoneDisplay} zone! ${targetsAffected} enemies stunned!`;
        } else {
            message = `👊 ${playerName}'s ${effectCount} Punch in the Boxes target the ${zoneDisplay} zone! ${targetsAffected} enemies stunned!`;
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
        let styleSheet = document.getElementById('punchInBoxAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'punchInBoxAnimations';
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
            console.log('No PunchInTheBox effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for PunchInTheBox effects');
            return 0;
        }

        console.log(`👊 PunchInTheBox handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Process each PunchInTheBox effect separately (each targets a random zone)
            let totalEffectsProcessed = 0;
            
            for (const effect of effects) {
                const effectsProcessed = await this.applyStunEffectsToRandomZone(
                    battleManager, 
                    playerRole, 
                    1 // Each effect applies 1 stack
                );
                totalEffectsProcessed += effectsProcessed;
                
                // Small delay between multiple punches for better visual separation
                if (effects.length > 1 && effectsProcessed > 0) {
                    await battleManager.delay(200);
                }
            }

            return totalEffectsProcessed;
            
        } catch (error) {
            console.error(`Error handling PunchInTheBox effects for ${playerRole}:`, error);
            
            // Fallback: try basic stun application
            this.applyFallbackStunEffects(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback stun effect application (without visuals)
    applyFallbackStunEffects(battleManager, playerRole, effectCount) {
        try {
            const enemyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.opponentHeroes) : 
                Object.values(battleManager.playerHeroes);
            
            let fallbackTargets = 0;
            
            // Just stun one random hero as fallback
            const aliveEnemies = enemyHeroes.filter(hero => hero && hero.alive);
            if (aliveEnemies.length > 0) {
                const randomEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                
                if (battleManager.statusEffectsManager) {
                    battleManager.statusEffectsManager.applyStatusEffect(randomEnemy, 'stunned', effectCount);
                    fallbackTargets++;
                }
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `👊 ${playerName}'s Punch in the Box effects applied (${effectCount} stacks to ${fallbackTargets} targets)`, 
                playerRole === 'host' ? 'success' : 'error'
            );
            
            console.log(`Fallback PunchInTheBox: Applied ${effectCount} stacks to ${fallbackTargets} targets`);
            
        } catch (error) {
            console.error('Error in fallback PunchInTheBox application:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is PunchInTheBox
    static isPunchInTheBox(potionName) {
        return potionName === 'PunchInTheBox';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'PunchInTheBox',
            displayName: 'Punch in the Box',
            description: 'Stuns all enemies in a random zone at the start of battle',
            cardType: 'Potion',
            cost: 0,
            effect: 'Applies stun status to all targets in a random enemy zone at battle start',
            stunStacks: 1,
            targetType: 'random_zone_enemies'
        };
    }

    // Static method to create a new instance
    static create() {
        return new PunchInTheBoxPotion();
    }
}

// Add CSS animations for PunchInTheBox effects
if (typeof document !== 'undefined' && !document.getElementById('punchInBoxStyles')) {
    const style = document.createElement('style');
    style.id = 'punchInBoxStyles';
    style.textContent = `
        /* Main punch impact animation */
        @keyframes punchInBoxImpact {
            0% {
                transform: translate(-50%, -50%) scale(0.2) rotate(-45deg);
                opacity: 0;
            }
            30% {
                transform: translate(-50%, -50%) scale(1.3) rotate(0deg);
                opacity: 1;
            }
            70% {
                transform: translate(-50%, -50%) scale(1.1) rotate(15deg);
                opacity: 0.9;
            }
            100% {
                transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
                opacity: 0;
            }
        }
        
        /* Base styles for punch effects */
        .punch-in-box-effect {
            will-change: transform, opacity;
        }
        
        .punch-impact-particle {
            will-change: transform, opacity;
        }
        
        /* Enhanced punch effects */
        .punch-in-box-effect:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, 
                rgba(255, 215, 0, 0.4) 0%, 
                rgba(255, 165, 0, 0.3) 30%, 
                transparent 70%);
            border-radius: 50%;
            animation: punchGlow 0.6s ease-out;
        }
        
        @keyframes punchGlow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.2);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -50%) scale(2);
                opacity: 0;
            }
        }
        
        /* Responsive punch effects */
        @media (max-width: 768px) {
            .punch-in-box-effect {
                font-size: 32px !important;
            }
            
            .punch-impact-particle {
                font-size: 12px !important;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .punch-in-box-effect {
                animation: punchInBoxReducedMotion 0.3s ease-out forwards;
            }
            
            .punch-impact-particle {
                animation: none;
                opacity: 0;
            }
        }
        
        @keyframes punchInBoxReducedMotion {
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
        .punch-in-box-effect,
        .punch-impact-particle {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.PunchInTheBoxPotion = PunchInTheBoxPotion;
}

console.log('PunchInTheBox potion module loaded');