// Potions/acidVial.js - AcidVial Potion Implementation with Multi-Player Battle Integration

export class AcidVialPotion {
    constructor() {
        this.name = 'AcidVial';
        this.displayName = 'Acid Vial';
        this.description = 'Deals 100 damage to all enemy heroes and applies 3 stacks of heal-block';
        this.effectType = 'damage_and_healblock';
        this.targetType = 'enemy_heroes_only';
        this.damage = 100; // Base damage per use
        this.healBlockStacks = 3; // Heal-block stacks per use
        
        console.log('AcidVial potion initialized with multi-player support');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply the acid effect to a single target
    async applyAcidEffect(target, battleManager, damageAmount = 100, healBlockStacks = 3) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for AcidVial effect');
            return false;
        }

        try {
            // Validate target is alive before applying effect
            if (!this.isTargetValid(target)) {
                console.log(`Skipping AcidVial effect on invalid/dead target: ${target.name || 'Unknown'}`);
                return false;
            }

            // Show visual effect first
            await this.showAcidSplashEffect(target, battleManager);
            
            // Apply damage using the battle manager's damage system
            if (battleManager.isAuthoritative) {
                battleManager.authoritative_applyDamage({
                    target: target,
                    damage: damageAmount,
                    newHp: Math.max(0, target.currentHp - damageAmount),
                    died: (target.currentHp - damageAmount) <= 0
                }, { 
                    source: 'acid',
                    attacker: null // Potion effect, no specific attacker
                });
            }

            // Apply heal-block status effect using the status effects manager
            if (battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(target, 'healblock', healBlockStacks);
                console.log(`Applied ${healBlockStacks} heal-block stack(s) to ${target.name}`);
            } else {
                console.warn('No status effects manager available - heal-block effect not applied');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error applying AcidVial effect:', error);
            return false;
        }
    }

    // Apply AcidVial effects to multiple targets (main entry point for potion handler)
    async applyAcidEffectsToTargets(targets, battleManager, playerRole, effectCount = 1) {
        if (!targets || targets.length === 0) {
            console.log(`No targets provided for AcidVial effects from ${playerRole}`);
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for AcidVial effects');
            return 0;
        }

        console.log(`🧪 Applying AcidVial effects: ${effectCount} vials to ${targets.length} targets from ${playerRole}`);

        let targetsAffected = 0;
        const effectPromises = [];

        // Calculate total damage and heal-block stacks
        const totalDamage = this.damage * effectCount;
        const totalHealBlockStacks = this.healBlockStacks * effectCount;

        // Apply acid effects to all targets simultaneously
        for (const target of targets) {
            if (this.isTargetValid(target)) {
                const effectPromise = this.applyAcidEffect(target, battleManager, totalDamage, totalHealBlockStacks)
                    .then(success => {
                        if (success) {
                            targetsAffected++;
                        }
                        return success;
                    })
                    .catch(error => {
                        console.error(`Error applying AcidVial to ${target.name}:`, error);
                        return false;
                    });
                
                effectPromises.push(effectPromise);
            }
        }

        // Wait for all effects to complete
        await Promise.all(effectPromises);

        // Add appropriate combat log message
        this.addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected, totalDamage, totalHealBlockStacks);

        console.log(`✅ AcidVial effects completed: ${targetsAffected}/${targets.length} targets affected by ${effectCount} vials from ${playerRole}`);
        return targetsAffected;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a target is valid for AcidVial effects
    isTargetValid(target) {
        if (!target) return false;
        
        // Check if target has alive property and is alive
        if (target.hasOwnProperty('alive')) {
            return target.alive === true;
        }
        
        // Fallback: assume target is valid if no alive property
        return true;
    }

    // Collect all valid enemy HEROES for a player role (AcidVial only targets heroes, not creatures)
    collectEnemyHeroes(battleManager, playerRole) {
        if (!battleManager) {
            console.error('No battle manager provided for target collection');
            return [];
        }

        // Determine which heroes are enemies based on player role
        const enemyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.opponentHeroes) : 
            Object.values(battleManager.playerHeroes);

        const validTargets = [];

        // Collect only enemy heroes (not creatures)
        enemyHeroes.forEach(hero => {
            if (this.isTargetValid(hero)) {
                validTargets.push(hero);
            }
        });

        console.log(`Collected ${validTargets.length} valid enemy heroes for ${playerRole} AcidVial effects`);
        console.log('Target breakdown:', validTargets.map(t => `${t.name} (hero)`));
        return validTargets;
    }

    // ===== VISUAL EFFECTS =====

    // Show the signature acid splash effect
    async showAcidSplashEffect(target, battleManager) {
        try {
            // Get the target element (hero only)
            const targetElement = this.getTargetElement(target, battleManager);
            if (!targetElement) {
                console.warn(`Could not find target element for ${target.name} - skipping visual effect`);
                return;
            }

            // Create and show the acid splash effect
            await this.createAcidSplashAnimation(targetElement);
            
        } catch (error) {
            console.error('Error showing acid splash effect:', error);
        }
    }

    // Create the acid splash animation
    async createAcidSplashAnimation(targetElement) {
        // Create the main acid splash effect
        const acidSplash = this.createAcidSplashElement();
        
        // Position it on the target
        this.positionEffectOnTarget(acidSplash, targetElement);
        
        // Add to DOM and animate
        document.body.appendChild(acidSplash);
        
        // Create multiple acid droplets for enhanced effect
        const droplets = [];
        const dropletCount = 8 + Math.floor(Math.random() * 4); // 8-11 droplets
        
        for (let i = 0; i < dropletCount; i++) {
            const droplet = this.createAcidDroplet(i);
            this.positionEffectOnTarget(droplet, targetElement);
            document.body.appendChild(droplet);
            droplets.push(droplet);
        }
        
        // Create corrosion effect on target
        this.createCorrosionEffect(targetElement);
        
        // Wait for animation to complete
        await this.waitForAnimation(800);
        
        // Clean up elements
        acidSplash.remove();
        droplets.forEach(droplet => droplet.remove());
    }

    // Create the main acid splash element
    createAcidSplashElement() {
        const acidSplash = document.createElement('div');
        acidSplash.className = 'acid-vial-splash';
        acidSplash.innerHTML = '💀';
        
        acidSplash.style.cssText = `
            position: absolute;
            font-size: 50px;
            z-index: 1000;
            pointer-events: none;
            animation: acidVialSplash 0.8s ease-out forwards;
            text-shadow: 
                0 0 20px #cc0000,
                0 0 40px #990000,
                0 0 60px #660000;
            filter: drop-shadow(0 0 15px rgba(204, 0, 0, 0.8));
        `;
        
        return acidSplash;
    }

    // Create an acid droplet for the splash effect
    createAcidDroplet(index) {
        const droplet = document.createElement('div');
        droplet.className = `acid-vial-droplet acid-vial-droplet-${index}`;
        
        // Randomize droplet appearance
        const droplets = ['🩸', '💧', '🔴', '⚫', '🟥'];
        const randomDroplet = droplets[Math.floor(Math.random() * droplets.length)];
        droplet.innerHTML = randomDroplet;
        
        // Calculate random direction and distance
        const angle = (index * (360 / 12)) + (Math.random() * 40 - 20); // Spread droplets around
        const distance = 30 + Math.random() * 60; // Random distance
        const duration = 0.4 + Math.random() * 0.6; // Random duration
        
        droplet.style.cssText = `
            position: absolute;
            font-size: ${12 + Math.random() * 20}px;
            z-index: 999;
            pointer-events: none;
            animation: acidVialDroplet${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 8px #cc0000,
                0 0 16px #990000;
            filter: drop-shadow(0 0 8px rgba(204, 0, 0, 0.6));
        `;
        
        // Create custom animation for this droplet
        this.createDropletAnimation(index, angle, distance, duration);
        
        return droplet;
    }

    // Create custom animation for acid droplets
    createDropletAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `acidVialDroplet${index}`;
        
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
                30% {
                    transform: translate(calc(-50% + ${endX * 0.5}px), calc(-50% + ${endY * 0.5}px)) scale(1.1) rotate(120deg);
                    opacity: 0.9;
                }
                70% {
                    transform: translate(calc(-50% + ${endX * 0.8}px), calc(-50% + ${endY * 0.8}px)) scale(0.8) rotate(240deg);
                    opacity: 0.6;
                }
                100% {
                    transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.2) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        
        this.addAnimationToDocument(animationName, keyframes);
    }

    // Create corrosion effect on the target
    createCorrosionEffect(targetElement) {
        const corrosion = document.createElement('div');
        corrosion.className = 'acid-vial-corrosion';
        
        corrosion.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, 
                rgba(204, 0, 0, 0.3) 0%, 
                rgba(153, 0, 0, 0.2) 40%, 
                transparent 70%);
            z-index: 998;
            pointer-events: none;
            animation: acidVialCorrosion 1.2s ease-out forwards;
            border-radius: inherit;
        `;
        
        targetElement.appendChild(corrosion);
        
        setTimeout(() => {
            if (corrosion && corrosion.parentNode) {
                corrosion.remove();
            }
        }, 1200);
    }

    // ===== GUEST-SIDE VISUAL HANDLER =====
    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, effectCount = 1 } = data;
        const isHostPotion = (playerSide === 'host');
        
        // Get enemy hero targets from guest's perspective
        const targetHeroes = isHostPotion ? 
            Object.values(battleManager.playerHeroes) : // Guest's own heroes (host's enemies)
            Object.values(battleManager.opponentHeroes); // Host's heroes (guest's enemies)
        
        const targets = targetHeroes.filter(hero => hero && hero.alive);
        
        if (targets.length === 0) return;
        
        // Show acid splash effects on all targets
        for (const target of targets) {
            await this.showAcidSplashEffect(target, battleManager);
        }
        
        // Show battle log message
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        battleManager.addCombatLog(
            `🧪 ${playerName}'s Acid Vial corrodes! ${targets.length} enemy heroes affected!`,
            logType
        );
    }

    // ===== UTILITY METHODS =====

    // Get the DOM element for a target (hero only)
    getTargetElement(target, battleManager) {
        if (!target || !battleManager) return null;
        
        // AcidVial only targets heroes
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
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 30;
        
        effectElement.style.left = `${centerX + offsetX}px`;
        effectElement.style.top = `${centerY + offsetY}px`;
        effectElement.style.transform = 'translate(-50%, -50%)';
    }

    // Add battle log message with proper player context
    addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected, totalDamage, totalHealBlockStacks) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for AcidVial message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'error';
        
        let message;
        if (effectCount === 1) {
            if (targetsAffected === 1) {
                message = `🧪 ${playerName}'s Acid Vial corrodes! 1 enemy hero takes ${totalDamage} damage and gains heal-block!`;
            } else {
                message = `🧪 ${playerName}'s Acid Vial corrodes! ${targetsAffected} enemy heroes take ${totalDamage} damage and gain heal-block!`;
            }
        } else {
            message = `🧪 ${playerName}'s ${effectCount} Acid Vials corrode! ${targetsAffected} enemy heroes take ${totalDamage} damage and ${totalHealBlockStacks} heal-block stacks!`;
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
        let styleSheet = document.getElementById('acidVialAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'acidVialAnimations';
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
            console.log('No AcidVial effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for AcidVial effects');
            return 0;
        }

        console.log(`🧪 AcidVial handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Collect all enemy heroes (not creatures)
            const targets = this.collectEnemyHeroes(battleManager, playerRole);
            
            if (targets.length === 0) {
                console.log(`No valid hero targets found for ${playerRole} AcidVial effects`);
                battleManager.addCombatLog(
                    `🧪 ${playerRole === 'host' ? 'Host' : 'Guest'}'s Acid Vial fizzles - no hero targets!`, 
                    playerRole === 'host' ? 'success' : 'error'
                );
                return 0;
            }

            // Apply effects to all hero targets
            const effectCount = effects.length;
            const targetsAffected = await this.applyAcidEffectsToTargets(
                targets, 
                battleManager, 
                playerRole, 
                effectCount
            );

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling AcidVial effects for ${playerRole}:`, error);
            
            // Fallback: try basic damage and heal-block application
            this.applyFallbackAcidEffects(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback acid effect application (without visuals)
    applyFallbackAcidEffects(battleManager, playerRole, effectCount) {
        try {
            const enemyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.opponentHeroes) : 
                Object.values(battleManager.playerHeroes);
            
            let fallbackTargets = 0;
            const totalDamage = this.damage * effectCount;
            const totalHealBlockStacks = this.healBlockStacks * effectCount;
            
            for (const hero of enemyHeroes) {
                if (hero && hero.alive) {
                    // Apply damage
                    if (battleManager.isAuthoritative) {
                        battleManager.authoritative_applyDamage({
                            target: hero,
                            damage: totalDamage,
                            newHp: Math.max(0, hero.currentHp - totalDamage),
                            died: (hero.currentHp - totalDamage) <= 0
                        }, { source: 'acid' });
                    }
                    
                    // Apply heal-block
                    if (battleManager.statusEffectsManager) {
                        battleManager.statusEffectsManager.applyStatusEffect(hero, 'healblock', totalHealBlockStacks);
                    }
                    
                    fallbackTargets++;
                }
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `🧪 ${playerName}'s Acid Vial effects applied (${totalDamage} damage, ${totalHealBlockStacks} heal-block to ${fallbackTargets} heroes)`, 
                playerRole === 'host' ? 'success' : 'error'
            );
            
            console.log(`Fallback AcidVial: Applied ${totalDamage} damage and ${totalHealBlockStacks} heal-block stacks to ${fallbackTargets} heroes`);
            
        } catch (error) {
            console.error('Error in fallback AcidVial application:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is AcidVial
    static isAcidVial(potionName) {
        return potionName === 'AcidVial';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'AcidVial',
            displayName: 'Acid Vial',
            description: 'Deals 100 damage to all enemy heroes and applies 3 stacks of heal-block',
            cardType: 'Potion',
            cost: 0,
            effect: 'Deals 100 damage and applies 3 heal-block stacks to all enemy heroes at battle start',
            damage: 100,
            healBlockStacks: 3,
            targetType: 'enemy_heroes_only'
        };
    }

    // Static method to create a new instance
    static create() {
        return new AcidVialPotion();
    }

    // Static method for quick effect application (utility)
    static async applyToAllEnemyHeroes(battleManager, playerRole, stackCount = 1) {
        const potion = new AcidVialPotion();
        const targets = potion.collectEnemyHeroes(battleManager, playerRole);
        return await potion.applyAcidEffectsToTargets(targets, battleManager, playerRole, stackCount);
    }
}

// Add CSS animations for AcidVial effects
if (typeof document !== 'undefined' && !document.getElementById('acidVialStyles')) {
    const style = document.createElement('style');
    style.id = 'acidVialStyles';
    style.textContent = `
        /* Main acid splash animation */
        @keyframes acidVialSplash {
            0% {
                transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
                opacity: 0;
            }
            25% {
                transform: translate(-50%, -50%) scale(1.2) rotate(90deg);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                opacity: 0.9;
            }
            75% {
                transform: translate(-50%, -50%) scale(1.3) rotate(270deg);
                opacity: 0.7;
            }
            100% {
                transform: translate(-50%, -50%) scale(0.8) rotate(360deg);
                opacity: 0;
            }
        }
        
        /* Corrosion effect animation */
        @keyframes acidVialCorrosion {
            0% {
                opacity: 0;
                transform: scale(0.5);
            }
            30% {
                opacity: 0.6;
                transform: scale(1.1);
            }
            60% {
                opacity: 0.4;
                transform: scale(1.2);
            }
            100% {
                opacity: 0;
                transform: scale(1.3);
            }
        }
        
        /* Base styles for acid effects */
        .acid-vial-splash {
            will-change: transform, opacity;
        }
        
        .acid-vial-droplet {
            will-change: transform, opacity;
        }
        
        .acid-vial-corrosion {
            will-change: transform, opacity;
        }
        
        /* Enhanced acid effects */
        .acid-vial-splash:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70px;
            height: 70px;
            background: radial-gradient(circle, 
                rgba(204, 0, 0, 0.4) 0%, 
                rgba(153, 0, 0, 0.3) 40%, 
                transparent 70%);
            border-radius: 50%;
            animation: acidGlow 0.8s ease-out;
        }
        
        @keyframes acidGlow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            40% {
                transform: translate(-50%, -50%) scale(1.3);
                opacity: 0.7;
            }
            100% {
                transform: translate(-50%, -50%) scale(2);
                opacity: 0;
            }
        }
        
        /* Improved droplet effects */
        .acid-vial-droplet {
            text-shadow: 
                0 0 6px #cc0000,
                0 0 12px #990000,
                0 0 18px #660000;
        }
        
        /* Responsive acid effects */
        @media (max-width: 768px) {
            .acid-vial-splash {
                font-size: 35px !important;
            }
            
            .acid-vial-droplet {
                font-size: 14px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .acid-vial-splash {
                text-shadow: 
                    0 0 8px #ffffff,
                    0 0 16px #000000;
            }
            
            .acid-vial-droplet {
                text-shadow: 
                    0 0 4px #ffffff,
                    0 0 8px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .acid-vial-splash {
                animation: acidVialReducedMotion 0.4s ease-out forwards;
            }
            
            .acid-vial-droplet {
                animation: none;
                opacity: 0;
            }
            
            .acid-vial-corrosion {
                animation: acidCorrosionReducedMotion 0.6s ease-out forwards;
            }
        }
        
        @keyframes acidVialReducedMotion {
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
        
        @keyframes acidCorrosionReducedMotion {
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
        .acid-vial-splash,
        .acid-vial-droplet,
        .acid-vial-corrosion {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
        
        /* Additional corrosion styling */
        .acid-vial-corrosion {
            mix-blend-mode: multiply;
            border: 1px solid rgba(204, 0, 0, 0.2);
        }
        
        /* Enhanced droplet variety */
        .acid-vial-droplet:nth-child(even) {
            animation-delay: 0.1s;
        }
        
        .acid-vial-droplet:nth-child(3n) {
            animation-delay: 0.05s;
            animation-duration: 0.7s;
        }
        
        .acid-vial-droplet:nth-child(4n) {
            animation-delay: 0.15s;
            animation-duration: 0.9s;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.AcidVialPotion = AcidVialPotion;
}

console.log('AcidVial potion module loaded with multi-player integration');