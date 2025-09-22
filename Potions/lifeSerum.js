// Potions/lifeSerum.js - LifeSerum Potion Implementation with Multi-Player Battle Integration

export class LifeSerumPotion {
    constructor() {
        this.name = 'LifeSerum';
        this.displayName = 'Life Serum';
        this.description = 'Increases HP of all allied heroes by +200 at the start of battle';
        this.effectType = 'hp_buff';
        this.targetType = 'all_allies';
        this.hpBonus = 200; // HP bonus per use
        
        console.log('LifeSerum potion initialized with multi-player support');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply the life effect to a single target
    async applyLifeEffect(target, battleManager, hpBonus = 200) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for LifeSerum effect');
            return false;
        }

        try {
            // Validate target is alive and is a hero before applying effect
            if (!this.isTargetValid(target)) {
                console.log(`Skipping LifeSerum effect on invalid/dead target: ${target.name || 'Unknown'}`);
                return false;
            }

            // Only apply to heroes (not creatures)
            if (target.type === 'creature') {
                console.log(`Skipping LifeSerum effect on creature: ${target.name}`);
                return false;
            }

            // Apply battle HP bonus using the hero battle bonus system
            const oldMaxHp = target.maxHp;
            const oldCurrentHp = target.currentHp;
            target.addBattleHpBonus(hpBonus);
            const newMaxHp = target.maxHp;
            const newCurrentHp = target.currentHp;
            
            console.log(`Applied +${hpBonus} HP bonus to ${target.name} (${oldMaxHp} → ${newMaxHp} max HP, ${oldCurrentHp} → ${newCurrentHp} current HP)`);
            
            // Update the hero's health display immediately
            if (battleManager.updateHeroHealthBar) {
                battleManager.updateHeroHealthBar(target.side, target.position, target.currentHp, target.maxHp);
            }

            // Send battle stat bonus update to guest
            battleManager.sendBattleUpdate('battle_stat_bonus', {
                heroAbsoluteSide: target.absoluteSide,
                heroPosition: target.position,
                heroName: target.name,
                bonusType: 'hp',
                bonusAmount: hpBonus,
                source: 'LifeSerum',
                timestamp: Date.now()
            });

            // Show visual effect
            await this.showLifeBoostEffect(target, battleManager, hpBonus);
            
            return true;
        } catch (error) {
            console.error('Error applying LifeSerum effect:', error);
            return false;
        }
    }

    // Apply LifeSerum effects to multiple targets (main entry point for potion handler)
    async applyLifeEffectsToTargets(targets, battleManager, playerRole, effectCount = 1) {
        if (!targets || targets.length === 0) {
            console.log(`No targets provided for LifeSerum effects from ${playerRole}`);
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for LifeSerum effects');
            return 0;
        }

        const totalHpBonus = this.hpBonus * effectCount; // 200 per potion
        console.log(`❤️ Applying LifeSerum effects: +${totalHpBonus} HP to ${targets.length} targets from ${playerRole}`);

        let targetsAffected = 0;
        const effectPromises = [];

        // Apply life effects to all targets simultaneously
        for (const target of targets) {
            if (this.isTargetValid(target) && target.type !== 'creature') {
                const effectPromise = this.applyLifeEffect(target, battleManager, totalHpBonus)
                    .then(success => {
                        if (success) {
                            targetsAffected++;
                        }
                        return success;
                    })
                    .catch(error => {
                        console.error(`Error applying LifeSerum to ${target.name}:`, error);
                        return false;
                    });
                
                effectPromises.push(effectPromise);
            }
        }

        // Wait for all effects to complete
        await Promise.all(effectPromises);

        // Add appropriate combat log message
        this.addBattleLogMessage(battleManager, playerRole, totalHpBonus, targetsAffected);

        console.log(`✅ LifeSerum effects completed: ${targetsAffected}/${targets.length} heroes empowered with +${totalHpBonus} HP from ${playerRole}`);
        return targetsAffected;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a target is valid for LifeSerum effects
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

        // Collect ally heroes only (LifeSerum doesn't affect creatures)
        allyHeroes.forEach(hero => {
            if (this.isTargetValid(hero)) {
                allTargets.push(hero);
            }
        });

        console.log(`Collected ${allTargets.length} valid ally hero targets for ${playerRole} LifeSerum effects`);
        
        console.log('Target breakdown:', allTargets.map(t => `${t.name} (hero)`));
        return allTargets;
    }

    // ===== VISUAL EFFECTS =====

    // Show the signature life boost effect
    async showLifeBoostEffect(target, battleManager, hpBonus) {
        try {
            // Get the target element (hero only)
            const targetElement = this.getTargetElement(target, battleManager);
            if (!targetElement) {
                console.warn(`Could not find target element for ${target.name} - skipping visual effect`);
                return;
            }

            // Create and show the life boost effect
            await this.createLifeBoostAnimation(targetElement, hpBonus);
            
        } catch (error) {
            console.error('Error showing life boost effect:', error);
        }
    }

    // Create the life boost animation
    async createLifeBoostAnimation(targetElement, hpBonus) {
        // Create the main heart icon effect
        const lifeIcon = this.createLifeIconElement(hpBonus);
        
        // Position it on the target
        this.positionEffectOnTarget(lifeIcon, targetElement);
        
        // Add to DOM and animate
        document.body.appendChild(lifeIcon);
        
        // Create multiple life particles for enhanced effect
        const particles = [];
        const particleCount = 6 + Math.floor(Math.random() * 3); // 6-8 particles
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.createLifeParticle(i);
            this.positionEffectOnTarget(particle, targetElement);
            document.body.appendChild(particle);
            particles.push(particle);
        }
        
        // Create screen flash effect
        this.createLifeScreenFlash();
        
        // Wait for animation to complete
        await this.waitForAnimation(1000);
        
        // Clean up elements
        lifeIcon.remove();
        particles.forEach(particle => particle.remove());
    }

    // Create the main life icon element
    createLifeIconElement(hpBonus) {
        const lifeIcon = document.createElement('div');
        lifeIcon.className = 'life-serum-icon';
        
        // Show heart and red up arrow with bonus text
        lifeIcon.innerHTML = `
            <div class="life-main-icon">❤️</div>
            <div class="life-arrow">↗️</div>
            <div class="life-bonus">+${hpBonus}</div>
        `;
        
        lifeIcon.style.cssText = `
            position: absolute;
            z-index: 1000;
            pointer-events: none;
            animation: lifeSerumIcon 1s ease-out forwards;
            text-align: center;
            filter: drop-shadow(0 0 20px rgba(220, 20, 60, 0.9));
        `;
        
        return lifeIcon;
    }

    // Create a life particle for the boost effect
    createLifeParticle(index) {
        const particle = document.createElement('div');
        particle.className = `life-serum-particle life-serum-particle-${index}`;
        
        // Randomize particle appearance - life-themed symbols
        const lifeSymbols = ['❤️', '💖', '⬆️', '💪', '✨', '❤️‍🔥', '🔥'];
        const randomSymbol = lifeSymbols[Math.floor(Math.random() * lifeSymbols.length)];
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
            animation: lifeSerumParticle${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 15px #dc143c,
                0 0 30px #ff1493;
            filter: drop-shadow(0 0 10px rgba(220, 20, 60, 0.7));
        `;
        
        // Create custom animation for this particle
        this.createLifeParticleAnimation(index, angle, distance, duration);
        
        return particle;
    }

    // Create custom animation for life particles
    createLifeParticleAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `lifeSerumParticle${index}`;
        
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

    // Create life screen flash effect
    createLifeScreenFlash() {
        const flash = document.createElement('div');
        flash.className = 'life-serum-screen-flash';
        
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, 
                rgba(220, 20, 60, 0.12) 0%, 
                rgba(255, 20, 147, 0.08) 40%, 
                transparent 80%);
            z-index: 998;
            pointer-events: none;
            animation: lifeSerumScreenFlash 0.5s ease-out forwards;
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
        
        // Show life boost effects on all targets
        for (const target of targets) {
            await this.showLifeBoostEffect(target, battleManager, this.hpBonus * effectCount);
        }
        
        // Show battle log message
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        battleManager.addCombatLog(
            `❤️ ${playerName}'s Life Serum empowers! ${targets.length} heroes gain +${this.hpBonus * effectCount} HP!`,
            logType
        );
    }

    // ===== UTILITY METHODS =====

    // Get the DOM element for a target (hero only)
    getTargetElement(target, battleManager) {
        if (!target || !battleManager) return null;
        
        // LifeSerum only affects heroes
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
    addBattleLogMessage(battleManager, playerRole, totalHpBonus, targetsAffected) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for LifeSerum message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'info';
        
        let message;
        if (targetsAffected === 1) {
            message = `❤️ ${playerName}'s Life Serum empowers! 1 hero gains +${totalHpBonus} HP!`;
        } else {
            message = `❤️ ${playerName}'s Life Serum empowers! ${targetsAffected} heroes gain +${totalHpBonus} HP!`;
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
        let styleSheet = document.getElementById('lifeSerumAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'lifeSerumAnimations';
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
            console.log('No LifeSerum effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for LifeSerum effects');
            return 0;
        }

        console.log(`❤️ LifeSerum handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Collect all ally targets (heroes only)
            const targets = this.collectAllyTargets(battleManager, playerRole);
            
            if (targets.length === 0) {
                console.log(`No valid targets found for ${playerRole} LifeSerum effects`);
                battleManager.addCombatLog(
                    `❤️ ${playerRole === 'host' ? 'Host' : 'Guest'}'s Life Serum has no targets!`, 
                    playerRole === 'host' ? 'success' : 'info'
                );
                return 0;
            }

            // Apply effects to all targets
            const effectCount = effects.length;
            const targetsAffected = await this.applyLifeEffectsToTargets(
                targets, 
                battleManager, 
                playerRole, 
                effectCount
            );

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling LifeSerum effects for ${playerRole}:`, error);
            
            // Fallback: try basic HP boost application
            this.applyFallbackLifeEffects(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback life effect application (without visuals)
    applyFallbackLifeEffects(battleManager, playerRole, effectCount) {
        try {
            const allyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.playerHeroes) : 
                Object.values(battleManager.opponentHeroes);
            
            let fallbackTargets = 0;
            const totalHpBonus = this.hpBonus * effectCount;
            
            for (const hero of allyHeroes) {
                if (hero && hero.alive) {
                    hero.addBattleHpBonus(totalHpBonus);
                    
                    // Update display
                    if (battleManager.updateHeroHealthBar) {
                        battleManager.updateHeroHealthBar(hero.side, hero.position, hero.currentHp, hero.maxHp);
                    }
                    
                    fallbackTargets++;
                }
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `❤️ ${playerName}'s Life Serum effects applied (+${totalHpBonus} HP to ${fallbackTargets} heroes)`, 
                playerRole === 'host' ? 'success' : 'info'
            );
            
            console.log(`Fallback LifeSerum: Applied +${totalHpBonus} HP to ${fallbackTargets} heroes`);
            
        } catch (error) {
            console.error('Error in fallback LifeSerum application:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is LifeSerum
    static isLifeSerum(potionName) {
        return potionName === 'LifeSerum';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'LifeSerum',
            displayName: 'Life Serum',
            description: 'Increases HP of all allied heroes by +200 at the start of battle',
            cardType: 'Potion',
            cost: 0,
            effect: 'Applies +200 HP bonus to all ally heroes at battle start',
            hpBonus: 200,
            targetType: 'all_allies'
        };
    }

    // Static method to create a new instance
    static create() {
        return new LifeSerumPotion();
    }

    // Static method for quick effect application (utility)
    static async applyToAllAllies(battleManager, playerRole, hpBonus = 200) {
        const potion = new LifeSerumPotion();
        const targets = potion.collectAllyTargets(battleManager, playerRole);
        return await potion.applyLifeEffectsToTargets(targets, battleManager, playerRole, 1);
    }
}

// Add enhanced CSS animations for LifeSerum effects
if (typeof document !== 'undefined' && !document.getElementById('lifeSerumStyles')) {
    const style = document.createElement('style');
    style.id = 'lifeSerumStyles';
    style.textContent = `
        /* Main life icon animation */
        @keyframes lifeSerumIcon {
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
        
        /* Screen flash animation - red life effect */
        @keyframes lifeSerumScreenFlash {
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
        
        /* Base styles for life effects */
        .life-serum-icon {
            will-change: transform, opacity;
        }
        
        .life-serum-particle {
            will-change: transform, opacity;
        }
        
        .life-serum-screen-flash {
            will-change: opacity;
        }
        
        /* Enhanced life icon layout */
        .life-main-icon {
            font-size: 60px;
            text-shadow: 
                0 0 20px #dc143c,
                0 0 40px #ff1493,
                0 0 60px #ff0080;
            animation: lifeIconPulse 1s ease-in-out;
        }
        
        .life-arrow {
            font-size: 40px;
            position: absolute;
            top: -20px;
            right: -15px;
            text-shadow: 
                0 0 15px #dc143c,
                0 0 30px #ff1493;
            animation: lifeArrowRise 1s ease-out;
        }
        
        .life-bonus {
            font-size: 24px;
            font-weight: bold;
            color: #ff0080;
            text-shadow: 
                0 0 10px #dc143c,
                2px 2px 4px rgba(0, 0, 0, 0.8);
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            animation: lifeBonusAppear 1s ease-out 0.3s both;
        }
        
        @keyframes lifeIconPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.15);
            }
        }
        
        @keyframes lifeArrowRise {
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
        
        @keyframes lifeBonusAppear {
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
        .life-serum-particle {
            text-shadow: 
                0 0 12px #dc143c,
                0 0 24px #ff1493,
                0 0 36px #ff0080;
        }
        
        /* Responsive life effects */
        @media (max-width: 768px) {
            .life-main-icon {
                font-size: 45px !important;
            }
            
            .life-arrow {
                font-size: 30px !important;
                top: -15px !important;
                right: -10px !important;
            }
            
            .life-bonus {
                font-size: 18px !important;
            }
            
            .life-serum-particle {
                font-size: 12px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .life-main-icon {
                text-shadow: 
                    0 0 15px #ffffff,
                    0 0 30px #000000;
            }
            
            .life-arrow {
                text-shadow: 
                    0 0 10px #ffffff,
                    0 0 20px #000000;
            }
            
            .life-bonus {
                color: #ffffff;
                text-shadow: 
                    2px 2px 4px #000000,
                    0 0 8px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .life-serum-icon {
                animation: lifeSerumReducedMotion 0.6s ease-out forwards;
            }
            
            .life-serum-particle {
                animation: none;
                opacity: 0;
            }
            
            .life-serum-screen-flash {
                animation: none;
                opacity: 0;
            }
            
            .life-main-icon {
                animation: none;
            }
            
            .life-arrow {
                animation: none;
            }
            
            .life-bonus {
                animation: none;
                opacity: 1;
            }
        }
        
        @keyframes lifeSerumReducedMotion {
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
        .life-serum-icon,
        .life-serum-particle {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
        
        /* Additional life-specific effects */
        .life-serum-icon {
            background: radial-gradient(circle, 
                rgba(220, 20, 60, 0.1) 0%, 
                transparent 70%);
            border-radius: 50%;
            width: 120px;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        
        /* Life aura effect */
        .life-serum-icon:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 140px;
            height: 140px;
            background: radial-gradient(circle, 
                rgba(220, 20, 60, 0.3) 0%, 
                rgba(255, 20, 147, 0.2) 40%, 
                transparent 80%);
            border-radius: 50%;
            animation: lifeAura 1s ease-out;
        }
        
        @keyframes lifeAura {
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
        .life-serum-particle:after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 25px;
            height: 25px;
            background: rgba(220, 20, 60, 0.3);
            border-radius: 50%;
            animation: lifeWave 1.2s ease-out;
        }
        
        @keyframes lifeWave {
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
    window.LifeSerumPotion = LifeSerumPotion;
}

console.log('Enhanced LifeSerum potion module loaded with multi-player integration');