// Potions/elixirOfStrength.js - ElixirOfStrength Potion Implementation with Multi-Player Battle Integration

export class ElixirOfStrengthPotion {
    constructor() {
        this.name = 'ElixirOfStrength';
        this.displayName = 'Elixir of Strength';
        this.description = 'Increases Attack of all allied heroes by +50 at the start of battle';
        this.effectType = 'attack_buff';
        this.targetType = 'all_allies';
        this.attackBonus = 50; // Attack bonus per use
        
        console.log('ElixirOfStrength potion initialized with multi-player support');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply the strength effect to a single target
    async applyStrengthEffect(target, battleManager, attackBonus = 50) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for ElixirOfStrength effect');
            return false;
        }

        try {
            // Validate target is alive and is a hero before applying effect
            if (!this.isTargetValid(target)) {
                console.log(`Skipping ElixirOfStrength effect on invalid/dead target: ${target.name || 'Unknown'}`);
                return false;
            }

            // Only apply to heroes (not creatures)
            if (target.type === 'creature') {
                console.log(`Skipping ElixirOfStrength effect on creature: ${target.name}`);
                return false;
            }

            // Apply battle attack bonus using the new hero battle bonus system
            const oldAttack = target.getCurrentAttack();
            target.addBattleAttackBonus(attackBonus);
            const newAttack = target.getCurrentAttack();
            
            console.log(`Applied +${attackBonus} attack bonus to ${target.name} (${oldAttack} → ${newAttack})`);
            
            // Update the hero's attack display immediately
            if (battleManager.updateHeroAttackDisplay) {
                battleManager.updateHeroAttackDisplay(target.side, target.position, target);
            }

            // Send battle stat bonus update to guest
            battleManager.sendBattleUpdate('battle_stat_bonus', {
                heroAbsoluteSide: target.absoluteSide,
                heroPosition: target.position,
                heroName: target.name,
                bonusType: 'attack',
                bonusAmount: attackBonus,
                source: 'ElixirOfStrength',
                timestamp: Date.now()
            });

            // Show visual effect
            await this.showStrengthBoostEffect(target, battleManager, attackBonus);
            
            return true;
        } catch (error) {
            console.error('Error applying ElixirOfStrength effect:', error);
            return false;
        }
    }

    // Apply ElixirOfStrength effects to multiple targets (main entry point for potion handler)
    async applyStrengthEffectsToTargets(targets, battleManager, playerRole, effectCount = 1) {
        if (!targets || targets.length === 0) {
            console.log(`No targets provided for ElixirOfStrength effects from ${playerRole}`);
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for ElixirOfStrength effects');
            return 0;
        }

        const totalAttackBonus = this.attackBonus * effectCount; // 50 per potion
        console.log(`⚔️ Applying ElixirOfStrength effects: +${totalAttackBonus} attack to ${targets.length} targets from ${playerRole}`);

        let targetsAffected = 0;
        const effectPromises = [];

        // Apply strength effects to all targets simultaneously
        for (const target of targets) {
            if (this.isTargetValid(target) && target.type !== 'creature') {
                const effectPromise = this.applyStrengthEffect(target, battleManager, totalAttackBonus)
                    .then(success => {
                        if (success) {
                            targetsAffected++;
                        }
                        return success;
                    })
                    .catch(error => {
                        console.error(`Error applying ElixirOfStrength to ${target.name}:`, error);
                        return false;
                    });
                
                effectPromises.push(effectPromise);
            }
        }

        // Wait for all effects to complete
        await Promise.all(effectPromises);

        // Add appropriate combat log message
        this.addBattleLogMessage(battleManager, playerRole, totalAttackBonus, targetsAffected);

        console.log(`✅ ElixirOfStrength effects completed: ${targetsAffected}/${targets.length} heroes empowered with +${totalAttackBonus} attack from ${playerRole}`);
        return targetsAffected;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a target is valid for ElixirOfStrength effects
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

        // Collect ally heroes only (ElixirOfStrength doesn't affect creatures)
        allyHeroes.forEach(hero => {
            if (this.isTargetValid(hero)) {
                allTargets.push(hero);
            }
        });

        console.log(`Collected ${allTargets.length} valid ally hero targets for ${playerRole} ElixirOfStrength effects`);
        
        console.log('Target breakdown:', allTargets.map(t => `${t.name} (hero)`));
        return allTargets;
    }

    // ===== VISUAL EFFECTS =====

    // Show the signature strength boost effect
    async showStrengthBoostEffect(target, battleManager, attackBonus) {
        try {
            // Get the target element (hero only)
            const targetElement = this.getTargetElement(target, battleManager);
            if (!targetElement) {
                console.warn(`Could not find target element for ${target.name} - skipping visual effect`);
                return;
            }

            // Create and show the strength boost effect
            await this.createStrengthBoostAnimation(targetElement, attackBonus);
            
        } catch (error) {
            console.error('Error showing strength boost effect:', error);
        }
    }

    // Create the strength boost animation
    async createStrengthBoostAnimation(targetElement, attackBonus) {
        // Create the main sword icon effect
        const strengthIcon = this.createStrengthIconElement(attackBonus);
        
        // Position it on the target
        this.positionEffectOnTarget(strengthIcon, targetElement);
        
        // Add to DOM and animate
        document.body.appendChild(strengthIcon);
        
        // Create multiple strength particles for enhanced effect
        const particles = [];
        const particleCount = 6 + Math.floor(Math.random() * 3); // 6-8 particles
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.createStrengthParticle(i);
            this.positionEffectOnTarget(particle, targetElement);
            document.body.appendChild(particle);
            particles.push(particle);
        }
        
        // Create screen flash effect
        this.createStrengthScreenFlash();
        
        // Wait for animation to complete
        await this.waitForAnimation(1000);
        
        // Clean up elements
        strengthIcon.remove();
        particles.forEach(particle => particle.remove());
    }

    // Create the main strength icon element
    createStrengthIconElement(attackBonus) {
        const strengthIcon = document.createElement('div');
        strengthIcon.className = 'elixir-strength-icon';
        
        // Show sword and green up arrow with bonus text
        strengthIcon.innerHTML = `
            <div class="strength-main-icon">⚔️</div>
            <div class="strength-arrow">↗️</div>
            <div class="strength-bonus">+${attackBonus}</div>
        `;
        
        strengthIcon.style.cssText = `
            position: absolute;
            z-index: 1000;
            pointer-events: none;
            animation: elixirStrengthIcon 1s ease-out forwards;
            text-align: center;
            filter: drop-shadow(0 0 20px rgba(34, 139, 34, 0.9));
        `;
        
        return strengthIcon;
    }

    // Create a strength particle for the boost effect
    createStrengthParticle(index) {
        const particle = document.createElement('div');
        particle.className = `elixir-strength-particle elixir-strength-particle-${index}`;
        
        // Randomize particle appearance - strength-themed symbols
        const strengthSymbols = ['⚔️', '🗡️', '⬆️', '💪', '✨', '💚', '🔥'];
        const randomSymbol = strengthSymbols[Math.floor(Math.random() * strengthSymbols.length)];
        particle.innerHTML = randomSymbol;
        
        // Calculate random direction and distance
        const angle = (index * (360 / 8)) + (Math.random() * 30 - 15); // Spread around
        const distance = 40 + Math.random() * 40; // Medium distance for power effect
        const duration = 0.6 + Math.random() * 0.5; // Variable duration
        
        particle.style.cssText = `
            position: absolute;
            font-size: ${14 + Math.random() * 16}px;
            z-index: 999;
            pointer-events: none;
            animation: elixirStrengthParticle${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 15px #228b22,
                0 0 30px #32cd32;
            filter: drop-shadow(0 0 10px rgba(34, 139, 34, 0.7));
        `;
        
        // Create custom animation for this particle
        this.createStrengthParticleAnimation(index, angle, distance, duration);
        
        return particle;
    }

    // Create custom animation for strength particles
    createStrengthParticleAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `elixirStrengthParticle${index}`;
        
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
                    transform: translate(calc(-50% + ${endX * 0.4}px), calc(-50% + ${endY * 0.4}px)) scale(1.2) rotate(90deg);
                    opacity: 1;
                }
                60% {
                    transform: translate(calc(-50% + ${endX * 0.7}px), calc(-50% + ${endY * 0.7}px)) scale(1.0) rotate(180deg);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.4) rotate(270deg);
                    opacity: 0;
                }
            }
        `;
        
        this.addAnimationToDocument(animationName, keyframes);
    }

    // Create strength screen flash effect
    createStrengthScreenFlash() {
        const flash = document.createElement('div');
        flash.className = 'elixir-strength-screen-flash';
        
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, 
                rgba(34, 139, 34, 0.12) 0%, 
                rgba(50, 205, 50, 0.08) 40%, 
                transparent 80%);
            z-index: 998;
            pointer-events: none;
            animation: elixirStrengthScreenFlash 0.5s ease-out forwards;
        `;
        
        document.body.appendChild(flash);
        
        setTimeout(() => flash.remove(), 500);
    }

    // ===== GUEST-SIDE VISUAL HANDLER =====
    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, effectCount = 1 } = data;
        const isHostPotion = (playerSide === 'host');
        
        // Get ally hero targets from guest's perspective  
        const targetHeroes = isHostPotion ? 
            Object.values(battleManager.opponentHeroes) : // Host's heroes (guest's opponents when host used potion)
            Object.values(battleManager.playerHeroes); // Guest's own heroes
        
        const targets = targetHeroes.filter(hero => hero && hero.alive);
        
        if (targets.length === 0) return;
        
        // Show strength boost effects on all targets
        for (const target of targets) {
            await this.showStrengthBoostEffect(target, battleManager, this.attackBonus * effectCount);
        }
        
        // Show battle log message
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        battleManager.addCombatLog(
            `⚔️ ${playerName}'s Elixir of Strength empowers! ${targets.length} heroes gain +${this.attackBonus * effectCount} attack!`,
            logType
        );
    }

    // ===== UTILITY METHODS =====

    // Get the DOM element for a target (hero only)
    getTargetElement(target, battleManager) {
        if (!target || !battleManager) return null;
        
        // ElixirOfStrength only affects heroes
        if (target.type === 'creature') return null;
        
        // Use battle manager's method to get hero element
        if (target.position && target.side) {
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
    addBattleLogMessage(battleManager, playerRole, totalAttackBonus, targetsAffected) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for ElixirOfStrength message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'info';
        
        let message;
        if (targetsAffected === 1) {
            message = `⚔️ ${playerName}'s Elixir of Strength empowers! 1 hero gains +${totalAttackBonus} attack!`;
        } else {
            message = `⚔️ ${playerName}'s Elixir of Strength empowers! ${targetsAffected} heroes gain +${totalAttackBonus} attack!`;
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
        let styleSheet = document.getElementById('elixirStrengthAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'elixirStrengthAnimations';
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
            console.log('No ElixirOfStrength effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for ElixirOfStrength effects');
            return 0;
        }

        console.log(`⚔️ ElixirOfStrength handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Collect all ally targets (heroes only)
            const targets = this.collectAllyTargets(battleManager, playerRole);
            
            if (targets.length === 0) {
                console.log(`No valid targets found for ${playerRole} ElixirOfStrength effects`);
                battleManager.addCombatLog(
                    `⚔️ ${playerRole === 'host' ? 'Host' : 'Guest'}'s Elixir of Strength has no targets!`, 
                    playerRole === 'host' ? 'success' : 'info'
                );
                return 0;
            }

            // Apply effects to all targets
            const effectCount = effects.length;
            const targetsAffected = await this.applyStrengthEffectsToTargets(
                targets, 
                battleManager, 
                playerRole, 
                effectCount
            );

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling ElixirOfStrength effects for ${playerRole}:`, error);
            
            // Fallback: try basic attack boost application
            this.applyFallbackStrengthEffects(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback strength effect application (without visuals)
    applyFallbackStrengthEffects(battleManager, playerRole, effectCount) {
        try {
            const allyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.playerHeroes) : 
                Object.values(battleManager.opponentHeroes);
            
            let fallbackTargets = 0;
            const totalAttackBonus = this.attackBonus * effectCount;
            
            for (const hero of allyHeroes) {
                if (hero && hero.alive) {
                    hero.addBattleAttackBonus(totalAttackBonus);
                    
                    // Update display
                    if (battleManager.updateHeroAttackDisplay) {
                        battleManager.updateHeroAttackDisplay(hero.side, hero.position, hero);
                    }
                    
                    fallbackTargets++;
                }
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `⚔️ ${playerName}'s Elixir of Strength effects applied (+${totalAttackBonus} attack to ${fallbackTargets} heroes)`, 
                playerRole === 'host' ? 'success' : 'info'
            );
            
            console.log(`Fallback ElixirOfStrength: Applied +${totalAttackBonus} attack to ${fallbackTargets} heroes`);
            
        } catch (error) {
            console.error('Error in fallback ElixirOfStrength application:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is ElixirOfStrength
    static isElixirOfStrength(potionName) {
        return potionName === 'ElixirOfStrength';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'ElixirOfStrength',
            displayName: 'Elixir of Strength',
            description: 'Increases Attack of all allied heroes by +50 at the start of battle',
            cardType: 'Potion',
            cost: 0,
            effect: 'Applies +50 attack bonus to all ally heroes at battle start',
            attackBonus: 50,
            targetType: 'all_allies'
        };
    }

    // Static method to create a new instance
    static create() {
        return new ElixirOfStrengthPotion();
    }

    // Static method for quick effect application (utility)
    static async applyToAllAllies(battleManager, playerRole, attackBonus = 50) {
        const potion = new ElixirOfStrengthPotion();
        const targets = potion.collectAllyTargets(battleManager, playerRole);
        return await potion.applyStrengthEffectsToTargets(targets, battleManager, playerRole, 1);
    }
}

// Add enhanced CSS animations for ElixirOfStrength effects
if (typeof document !== 'undefined' && !document.getElementById('elixirStrengthStyles')) {
    const style = document.createElement('style');
    style.id = 'elixirStrengthStyles';
    style.textContent = `
        /* Main strength icon animation */
        @keyframes elixirStrengthIcon {
            0% {
                transform: translate(-50%, -50%) scale(0.3) rotate(-10deg);
                opacity: 0;
            }
            20% {
                transform: translate(-50%, -50%) scale(1.3) rotate(5deg);
                opacity: 0.9;
            }
            40% {
                transform: translate(-50%, -50%) scale(1.1) rotate(-2deg);
                opacity: 1;
            }
            60% {
                transform: translate(-50%, -50%) scale(1.2) rotate(2deg);
                opacity: 1;
            }
            80% {
                transform: translate(-50%, -50%) scale(1.0) rotate(-1deg);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -50%) scale(0.6) rotate(0deg);
                opacity: 0;
            }
        }
        
        /* Screen flash animation - green power effect */
        @keyframes elixirStrengthScreenFlash {
            0% {
                opacity: 0;
            }
            30% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }
        
        /* Base styles for strength effects */
        .elixir-strength-icon {
            will-change: transform, opacity;
        }
        
        .elixir-strength-particle {
            will-change: transform, opacity;
        }
        
        .elixir-strength-screen-flash {
            will-change: opacity;
        }
        
        /* Enhanced strength icon layout */
        .strength-main-icon {
            font-size: 60px;
            text-shadow: 
                0 0 20px #228b22,
                0 0 40px #32cd32,
                0 0 60px #00ff00;
            animation: strengthIconPulse 1s ease-in-out;
        }
        
        .strength-arrow {
            font-size: 40px;
            position: absolute;
            top: -20px;
            right: -15px;
            text-shadow: 
                0 0 15px #228b22,
                0 0 30px #32cd32;
            animation: strengthArrowRise 1s ease-out;
        }
        
        .strength-bonus {
            font-size: 24px;
            font-weight: bold;
            color: #00ff00;
            text-shadow: 
                0 0 10px #228b22,
                2px 2px 4px rgba(0, 0, 0, 0.8);
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            animation: strengthBonusAppear 1s ease-out 0.3s both;
        }
        
        @keyframes strengthIconPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.15);
            }
        }
        
        @keyframes strengthArrowRise {
            0% {
                transform: translateY(20px) scale(0.5);
                opacity: 0;
            }
            60% {
                transform: translateY(-5px) scale(1.2);
                opacity: 1;
            }
            100% {
                transform: translateY(-10px) scale(1);
                opacity: 1;
            }
        }
        
        @keyframes strengthBonusAppear {
            0% {
                transform: translateX(-50%) translateY(10px) scale(0.5);
                opacity: 0;
            }
            60% {
                transform: translateX(-50%) translateY(-2px) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translateX(-50%) translateY(0px) scale(1);
                opacity: 1;
            }
        }
        
        /* Enhanced particle effects */
        .elixir-strength-particle {
            text-shadow: 
                0 0 12px #228b22,
                0 0 24px #32cd32,
                0 0 36px #00ff00;
        }
        
        /* Responsive strength effects */
        @media (max-width: 768px) {
            .strength-main-icon {
                font-size: 45px !important;
            }
            
            .strength-arrow {
                font-size: 30px !important;
                top: -15px !important;
                right: -10px !important;
            }
            
            .strength-bonus {
                font-size: 18px !important;
            }
            
            .elixir-strength-particle {
                font-size: 12px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .strength-main-icon {
                text-shadow: 
                    0 0 15px #ffffff,
                    0 0 30px #000000;
            }
            
            .strength-arrow {
                text-shadow: 
                    0 0 10px #ffffff,
                    0 0 20px #000000;
            }
            
            .strength-bonus {
                color: #ffffff;
                text-shadow: 
                    2px 2px 4px #000000,
                    0 0 8px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .elixir-strength-icon {
                animation: elixirStrengthReducedMotion 0.6s ease-out forwards;
            }
            
            .elixir-strength-particle {
                animation: none;
                opacity: 0;
            }
            
            .elixir-strength-screen-flash {
                animation: none;
                opacity: 0;
            }
            
            .strength-main-icon {
                animation: none;
            }
            
            .strength-arrow {
                animation: none;
            }
            
            .strength-bonus {
                animation: none;
                opacity: 1;
            }
        }
        
        @keyframes elixirStrengthReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.05);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        /* Performance optimizations */
        .elixir-strength-icon,
        .elixir-strength-particle {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
        
        /* Additional strength-specific effects */
        .elixir-strength-icon {
            background: radial-gradient(circle, 
                rgba(34, 139, 34, 0.1) 0%, 
                transparent 70%);
            border-radius: 50%;
            width: 120px;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        
        /* Power aura effect */
        .elixir-strength-icon:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 140px;
            height: 140px;
            background: radial-gradient(circle, 
                rgba(34, 139, 34, 0.3) 0%, 
                rgba(50, 205, 50, 0.2) 40%, 
                transparent 80%);
            border-radius: 50%;
            animation: strengthAura 1s ease-out;
        }
        
        @keyframes strengthAura {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            40% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.8;
            }
            70% {
                transform: translate(-50%, -50%) scale(1.5);
                opacity: 0.4;
            }
            100% {
                transform: translate(-50%, -50%) scale(2);
                opacity: 0;
            }
        }
        
        /* Energy wave effect */
        .elixir-strength-particle:after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 25px;
            height: 25px;
            background: rgba(34, 139, 34, 0.3);
            border-radius: 50%;
            animation: strengthWave 1.2s ease-out;
        }
        
        @keyframes strengthWave {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0.8;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.5);
                opacity: 0.4;
            }
            100% {
                transform: translate(-50%, -50%) scale(3);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.ElixirOfStrengthPotion = ElixirOfStrengthPotion;
}

console.log('Enhanced ElixirOfStrength potion module loaded with multi-player integration');