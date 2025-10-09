// Potions/fireBomb.js - Fire Bomb Potion Implementation with Multi-Player Battle Integration

export class FireBombPotion {
    constructor() {
        this.name = 'FireBomb';
        this.displayName = 'Fire Bomb';
        this.description = 'Deals 100 damage to a random enemy hero slot (hero + all creatures)';
        this.effectType = 'slot_damage';
        this.targetType = 'random_enemy_slot';
        this.damage = 100; // Base damage per use
        
        console.log('FireBomb potion initialized with multi-player support');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply fire bomb damage to a single target (hero or creature)
    async applyFireBombDamage(target, targetInfo, battleManager, damageAmount = 100) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for FireBomb effect');
            return false;
        }

        try {
            // Validate target is alive before applying damage
            if (!this.isTargetValid(target)) {
                console.log(`Skipping FireBomb damage on invalid/dead target: ${target.name || 'Unknown'}`);
                return false;
            }

            // Apply damage using the appropriate system based on target type
            if (battleManager.isAuthoritative) {
                if (targetInfo.isCreature) {
                    // Use creature damage system
                    await battleManager.combatManager.authoritative_applyDamageToCreature({
                        hero: targetInfo.hero,
                        creature: target,
                        creatureIndex: targetInfo.creatureIndex,
                        damage: damageAmount,
                        position: targetInfo.position,
                        side: targetInfo.side
                    }, { 
                        source: 'fire_bomb',
                        attacker: null // Potion effect, no specific attacker
                    });
                } else {
                    // Use hero damage system
                    await battleManager.combatManager.authoritative_applyDamage({
                        target: target,
                        damage: damageAmount,
                        newHp: Math.max(0, target.currentHp - damageAmount),
                        died: (target.currentHp - damageAmount) <= 0
                    }, { 
                        source: 'fire_bomb',
                        attacker: null // Potion effect, no specific attacker
                    });
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error applying FireBomb damage:', error);
            return false;
        }
    }

    // Apply Fire Bomb effects to a hero slot (main entry point for potion handler)
    async applyFireBombToSlot(heroSlot, battleManager, playerRole, effectCount = 1) {
        if (!heroSlot || !heroSlot.hero) {
            console.log(`Invalid hero slot for FireBomb from ${playerRole}`);
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for FireBomb effects');
            return 0;
        }

        console.log(`💣 Applying FireBomb: ${effectCount} bombs to slot ${heroSlot.position} from ${playerRole}`);

        // Calculate total damage
        const totalDamage = this.damage * effectCount;
        
        // Collect all targets in this slot (hero + creatures) with metadata
        const targets = [];
        
        // Add hero with metadata
        targets.push({
            target: heroSlot.hero,
            isCreature: false,
            hero: heroSlot.hero,
            position: heroSlot.position,
            side: heroSlot.side
        });
        
        // Add creatures with metadata
        heroSlot.creatures.forEach((creature, index) => {
            if (this.isTargetValid(creature)) {
                targets.push({
                    target: creature,
                    isCreature: true,
                    hero: heroSlot.hero,
                    creatureIndex: index,
                    position: heroSlot.position,
                    side: heroSlot.side
                });
            }
        });

        if (targets.length === 0) {
            console.log('No valid targets in slot');
            return 0;
        }

        // Show explosion visual effect FIRST on the hero element (represents the entire slot)
        await this.showExplosionEffect(heroSlot.hero, battleManager, effectCount);

        let targetsAffected = 0;
        const damagePromises = [];

        // Apply damage to all targets in the slot
        for (const targetInfo of targets) {
            const damagePromise = this.applyFireBombDamage(targetInfo.target, targetInfo, battleManager, totalDamage)
                .then(success => {
                    if (success) {
                        targetsAffected++;
                    }
                    return success;
                })
                .catch(error => {
                    console.error(`Error applying FireBomb to ${targetInfo.target.name}:`, error);
                    return false;
                });
            
            damagePromises.push(damagePromise);
        }

        // Wait for all damage to complete
        await Promise.all(damagePromises);

        // Add battle log message
        this.addBattleLogMessage(battleManager, playerRole, effectCount, heroSlot.position, targetsAffected, totalDamage);

        console.log(`✅ FireBomb completed: ${targetsAffected} targets affected in ${heroSlot.position} slot by ${effectCount} bombs from ${playerRole}`);
        return targetsAffected;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a target is valid for FireBomb effects
    isTargetValid(target) {
        if (!target) return false;
        
        // Check if target has alive property and is alive
        if (target.hasOwnProperty('alive')) {
            return target.alive === true;
        }
        
        // Fallback: assume target is valid if no alive property
        return true;
    }

    // Collect all valid enemy hero slots for a player role
    collectEnemyHeroSlots(battleManager, playerRole) {
        if (!battleManager) {
            console.error('No battle manager provided for slot collection');
            return [];
        }

        // Determine which heroes are enemies based on player role
        const enemyHeroes = playerRole === 'host' ? 
            battleManager.opponentHeroes : 
            battleManager.playerHeroes;

        const validSlots = [];

        // Collect enemy hero slots that have a hero
        for (const position of ['left', 'center', 'right']) {
            const hero = enemyHeroes[position];
            
            if (hero && this.isTargetValid(hero)) {
                // Get creatures for this hero
                const creatures = (hero.creatures || []).filter(c => this.isTargetValid(c));
                
                validSlots.push({
                    position: position,
                    hero: hero,
                    creatures: creatures,
                    side: hero.side
                });
            }
        }

        console.log(`Collected ${validSlots.length} valid enemy hero slots for ${playerRole} FireBomb`);
        return validSlots;
    }

    // Select a random hero slot from available slots
    selectRandomHeroSlot(slots) {
        if (!slots || slots.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * slots.length);
        return slots[randomIndex];
    }

    // ===== VISUAL EFFECTS =====

    // Show the signature explosion effect on a hero slot
    async showExplosionEffect(hero, battleManager, bombCount = 1) {
        try {
            // Get the hero element (represents the entire slot)
            const heroElement = this.getHeroElement(hero, battleManager);
            if (!heroElement) {
                console.warn(`Could not find hero element for ${hero.name} - skipping visual effect`);
                return;
            }

            // Create and show the explosion animation
            await this.createExplosionAnimation(heroElement, bombCount);
            
        } catch (error) {
            console.error('Error showing explosion effect:', error);
        }
    }

    // Create the explosion animation
    async createExplosionAnimation(heroElement, bombCount) {
        const explosions = [];
        
        // Create multiple explosion layers for intensity
        const explosionLayers = Math.min(3, bombCount); // 1-3 layers based on bomb count
        
        for (let layer = 0; layer < explosionLayers; layer++) {
            const delay = layer * 150; // Stagger explosions slightly
            
            setTimeout(() => {
                const explosion = this.createExplosionElement(layer, bombCount);
                this.positionEffectOnTarget(explosion, heroElement);
                document.body.appendChild(explosion);
                explosions.push(explosion);
                
                // Create fire particles
                this.createFireParticles(heroElement, 8 + (bombCount * 2));
                
                // Create shockwave
                if (layer === 0) {
                    this.createShockwave(heroElement);
                }
            }, delay);
        }
        
        // Wait for animation to complete
        const totalDuration = 1200 + (explosionLayers * 150);
        await this.waitForAnimation(totalDuration);
        
        // Clean up elements
        explosions.forEach(explosion => {
            if (explosion && explosion.parentNode) {
                explosion.remove();
            }
        });
    }

    // Create the main explosion element
    createExplosionElement(layer, bombCount) {
        const explosion = document.createElement('div');
        explosion.className = `fire-bomb-explosion fire-bomb-layer-${layer}`;
        explosion.innerHTML = '💥';
        
        const size = 60 + (bombCount * 10) + (layer * 5);
        const duration = 0.8 + (layer * 0.1);
        
        explosion.style.cssText = `
            position: absolute;
            font-size: ${size}px;
            z-index: 1000 + ${layer};
            pointer-events: none;
            animation: fireBombExplosion ${duration}s ease-out forwards;
            text-shadow: 
                0 0 30px #ff4500,
                0 0 60px #ff6600,
                0 0 90px #ff8800,
                0 0 120px #ffaa00;
            filter: drop-shadow(0 0 25px rgba(255, 69, 0, 0.9));
        `;
        
        return explosion;
    }

    // Create fire particles for the explosion
    createFireParticles(heroElement, particleCount) {
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = this.createFireParticle(i, particleCount);
                this.positionEffectOnTarget(particle, heroElement);
                document.body.appendChild(particle);
                
                // Clean up particle after animation
                setTimeout(() => {
                    if (particle && particle.parentNode) {
                        particle.remove();
                    }
                }, 1000);
            }, i * 50); // Stagger particle creation
        }
    }

    // Create a single fire particle
    createFireParticle(index, total) {
        const particle = document.createElement('div');
        particle.className = `fire-bomb-particle fire-bomb-particle-${index}`;
        
        // Randomize particle appearance
        const particles = ['🔥', '💨', '🌟', '✨', '⭐'];
        const randomParticle = particles[Math.floor(Math.random() * particles.length)];
        particle.innerHTML = randomParticle;
        
        // Calculate random direction and distance
        const angle = (index * (360 / total)) + (Math.random() * 30 - 15);
        const distance = 50 + Math.random() * 80;
        const duration = 0.6 + Math.random() * 0.5;
        
        particle.style.cssText = `
            position: absolute;
            font-size: ${15 + Math.random() * 15}px;
            z-index: 999;
            pointer-events: none;
            animation: fireBombParticle${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 10px #ff4500,
                0 0 20px #ff6600;
            filter: drop-shadow(0 0 10px rgba(255, 69, 0, 0.7));
        `;
        
        // Create custom animation for this particle
        this.createParticleAnimation(index, angle, distance, duration);
        
        return particle;
    }

    // Create custom animation for fire particles
    createParticleAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `fireBombParticle${index}`;
        
        // Check if animation already exists
        if (this.animationExists(animationName)) {
            return;
        }
        
        const keyframes = `
            @keyframes ${animationName} {
                0% {
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                    opacity: 1;
                }
                30% {
                    transform: translate(calc(-50% + ${endX * 0.4}px), calc(-50% + ${endY * 0.4}px)) scale(1.2) rotate(180deg);
                    opacity: 0.9;
                }
                70% {
                    transform: translate(calc(-50% + ${endX * 0.8}px), calc(-50% + ${endY * 0.8}px)) scale(0.7) rotate(360deg);
                    opacity: 0.5;
                }
                100% {
                    transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.2) rotate(540deg);
                    opacity: 0;
                }
            }
        `;
        
        this.addAnimationToDocument(animationName, keyframes);
    }

    // Create shockwave effect
    createShockwave(heroElement) {
        const shockwave = document.createElement('div');
        shockwave.className = 'fire-bomb-shockwave';
        
        shockwave.style.cssText = `
            position: absolute;
            width: 100px;
            height: 100px;
            border: 4px solid rgba(255, 69, 0, 0.8);
            border-radius: 50%;
            z-index: 998;
            pointer-events: none;
            animation: fireBombShockwave 0.8s ease-out forwards;
        `;
        
        this.positionEffectOnTarget(shockwave, heroElement);
        document.body.appendChild(shockwave);
        
        setTimeout(() => {
            if (shockwave && shockwave.parentNode) {
                shockwave.remove();
            }
        }, 800);
    }

    // ===== GUEST-SIDE VISUAL HANDLER =====
    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, effectCount = 1, targetPosition } = data;
        const isHostPotion = (playerSide === 'host');
        
        // Get the target hero from guest's perspective
        const targetHeroes = isHostPotion ? 
            battleManager.playerHeroes : // Guest's own heroes (host's enemies)
            battleManager.opponentHeroes; // Host's heroes (guest's enemies)
        
        const targetHero = targetHeroes[targetPosition];
        
        if (!targetHero || !targetHero.alive) {
            console.warn('Target hero not found or not alive for FireBomb visual');
            return;
        }
        
        // Show explosion effect on the target slot
        await this.showExplosionEffect(targetHero, battleManager, effectCount);
        
        // Show battle log message
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        const targetCount = 1 + (targetHero.creatures || []).length;
        battleManager.addCombatLog(
            `💣 ${playerName}'s Fire Bomb explodes at ${targetPosition}! ${targetCount} targets hit!`,
            logType
        );
    }

    // ===== UTILITY METHODS =====

    // Get the DOM element for a hero
    getHeroElement(hero, battleManager) {
        if (!hero || !battleManager) return null;
        
        // Use battle manager's method to get hero element
        return battleManager.getHeroElement(hero.side, hero.position);
    }

    // Position effect on target element
    positionEffectOnTarget(effectElement, targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Add slight randomness for visual variety
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        
        effectElement.style.left = `${centerX + offsetX}px`;
        effectElement.style.top = `${centerY + offsetY}px`;
        effectElement.style.transform = 'translate(-50%, -50%)';
    }

    // Add battle log message with proper player context
    addBattleLogMessage(battleManager, playerRole, effectCount, position, targetsAffected, totalDamage) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for FireBomb message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'error';
        
        let message;
        if (effectCount === 1) {
            message = `💣 ${playerName}'s Fire Bomb explodes at ${position}! ${targetsAffected} targets take ${totalDamage} damage!`;
        } else {
            message = `💣 ${playerName}'s ${effectCount} Fire Bombs explode at ${position}! ${targetsAffected} targets take ${totalDamage} damage!`;
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
        let styleSheet = document.getElementById('fireBombAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'fireBombAnimations';
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
            console.log('No FireBomb effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for FireBomb effects');
            return 0;
        }

        console.log(`💣 FireBomb handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Collect all valid enemy hero slots
            const validSlots = this.collectEnemyHeroSlots(battleManager, playerRole);
            
            if (validSlots.length === 0) {
                console.log(`No valid hero slots found for ${playerRole} FireBomb effects`);
                battleManager.addCombatLog(
                    `💣 ${playerRole === 'host' ? 'Host' : 'Guest'}'s Fire Bomb fizzles - no targets!`, 
                    playerRole === 'host' ? 'success' : 'error'
                );
                return 0;
            }

            // Select ONE random hero slot (all bombs hit the same slot)
            const targetSlot = this.selectRandomHeroSlot(validSlots);
            
            if (!targetSlot) {
                console.log('Failed to select target slot');
                return 0;
            }

            console.log(`💣 FireBomb targeting slot: ${targetSlot.position} with hero ${targetSlot.hero.name} and ${targetSlot.creatures.length} creatures`);

            // Apply all bomb effects to the selected slot
            const effectCount = effects.length;
            await this.applyFireBombToSlot(
                targetSlot, 
                battleManager, 
                playerRole, 
                effectCount
            );

            // Send visual sync to guest with target position
            if (battleManager.isAuthoritative && battleManager.sendBattleUpdate) {
                battleManager.sendBattleUpdate('potion_specific_visual', {
                    potionName: 'FireBomb',
                    visualType: 'potion_effects',
                    effectCount: effectCount,
                    playerSide: playerRole,
                    targetPosition: targetSlot.position
                });
            }

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling FireBomb effects for ${playerRole}:`, error);
            
            // Fallback: try basic damage application
            this.applyFallbackFireBombEffects(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback fire bomb effect application (without visuals)
    applyFallbackFireBombEffects(battleManager, playerRole, effectCount) {
        try {
            const validSlots = this.collectEnemyHeroSlots(battleManager, playerRole);
            
            if (validSlots.length === 0) {
                console.log('No valid slots for fallback FireBomb');
                return;
            }
            
            const targetSlot = this.selectRandomHeroSlot(validSlots);
            if (!targetSlot) return;
            
            const totalDamage = this.damage * effectCount;
            let fallbackTargets = 0;
            
            // Apply to hero
            if (targetSlot.hero && targetSlot.hero.alive) {
                if (battleManager.isAuthoritative && battleManager.combatManager) {
                    battleManager.combatManager.authoritative_applyDamage({
                        target: targetSlot.hero,
                        damage: totalDamage,
                        newHp: Math.max(0, targetSlot.hero.currentHp - totalDamage),
                        died: (targetSlot.hero.currentHp - totalDamage) <= 0
                    }, { source: 'fire_bomb' });
                }
                fallbackTargets++;
            }
            
            // Apply to creatures
            targetSlot.creatures.forEach((creature, index) => {
                if (creature && creature.alive) {
                    if (battleManager.isAuthoritative && battleManager.combatManager) {
                        battleManager.combatManager.authoritative_applyDamageToCreature({
                            hero: targetSlot.hero,
                            creature: creature,
                            creatureIndex: index,
                            damage: totalDamage,
                            position: targetSlot.position,
                            side: targetSlot.side
                        }, { source: 'fire_bomb' });
                    }
                    fallbackTargets++;
                }
            });
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `💣 ${playerName}'s Fire Bomb effects applied (${totalDamage} damage to ${fallbackTargets} targets at ${targetSlot.position})`, 
                playerRole === 'host' ? 'success' : 'error'
            );
            
            console.log(`Fallback FireBomb: Applied ${totalDamage} damage to ${fallbackTargets} targets at ${targetSlot.position}`);
            
        } catch (error) {
            console.error('Error in fallback FireBomb application:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is FireBomb
    static isFireBomb(potionName) {
        return potionName === 'FireBomb';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'FireBomb',
            displayName: 'Fire Bomb',
            description: 'Deals 100 damage to a random enemy hero slot (hero + all creatures)',
            cardType: 'Potion',
            cost: 0,
            effect: 'Deals 100 damage to one random enemy hero and all their creatures at battle start',
            damage: 100,
            targetType: 'random_enemy_slot'
        };
    }

    // Static method to create a new instance
    static create() {
        return new FireBombPotion();
    }
}

// Add CSS animations for FireBomb effects
if (typeof document !== 'undefined' && !document.getElementById('fireBombStyles')) {
    const style = document.createElement('style');
    style.id = 'fireBombStyles';
    style.textContent = `
        /* Main explosion animation */
        @keyframes fireBombExplosion {
            0% {
                transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                opacity: 0;
            }
            20% {
                transform: translate(-50%, -50%) scale(1.3) rotate(45deg);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.8) rotate(90deg);
                opacity: 0.9;
            }
            80% {
                transform: translate(-50%, -50%) scale(1.5) rotate(135deg);
                opacity: 0.6;
            }
            100% {
                transform: translate(-50%, -50%) scale(0.5) rotate(180deg);
                opacity: 0;
            }
        }
        
        /* Shockwave animation */
        @keyframes fireBombShockwave {
            0% {
                transform: translate(-50%, -50%) scale(0.5);
                opacity: 1;
                border-width: 4px;
            }
            50% {
                transform: translate(-50%, -50%) scale(2.5);
                opacity: 0.5;
                border-width: 2px;
            }
            100% {
                transform: translate(-50%, -50%) scale(4);
                opacity: 0;
                border-width: 0px;
            }
        }
        
        /* Base styles for fire bomb effects */
        .fire-bomb-explosion {
            will-change: transform, opacity;
        }
        
        .fire-bomb-particle {
            will-change: transform, opacity;
        }
        
        .fire-bomb-shockwave {
            will-change: transform, opacity, border-width;
        }
        
        /* Enhanced explosion glow */
        .fire-bomb-explosion:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, 
                rgba(255, 69, 0, 0.6) 0%, 
                rgba(255, 102, 0, 0.4) 40%, 
                transparent 70%);
            border-radius: 50%;
            animation: fireBombGlow 0.8s ease-out;
        }
        
        @keyframes fireBombGlow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            30% {
                transform: translate(-50%, -50%) scale(1.5);
                opacity: 0.8;
            }
            70% {
                transform: translate(-50%, -50%) scale(2.5);
                opacity: 0.4;
            }
            100% {
                transform: translate(-50%, -50%) scale(3.5);
                opacity: 0;
            }
        }
        
        /* Layered explosions for intensity */
        .fire-bomb-layer-1 {
            animation-delay: 0.1s;
            opacity: 0.8;
        }
        
        .fire-bomb-layer-2 {
            animation-delay: 0.2s;
            opacity: 0.6;
        }
        
        /* Responsive fire bomb effects */
        @media (max-width: 768px) {
            .fire-bomb-explosion {
                font-size: 45px !important;
            }
            
            .fire-bomb-particle {
                font-size: 16px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .fire-bomb-explosion {
                text-shadow: 
                    0 0 10px #ffffff,
                    0 0 20px #000000;
            }
            
            .fire-bomb-particle {
                text-shadow: 
                    0 0 5px #ffffff,
                    0 0 10px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .fire-bomb-explosion {
                animation: fireBombReducedMotion 0.5s ease-out forwards;
            }
            
            .fire-bomb-particle {
                animation: none;
                opacity: 0;
            }
            
            .fire-bomb-shockwave {
                animation: fireBombShockwaveReducedMotion 0.4s ease-out forwards;
            }
        }
        
        @keyframes fireBombReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        @keyframes fireBombShockwaveReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            50% {
                opacity: 0.4;
                transform: translate(-50%, -50%) scale(1.5);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(2);
            }
        }
        
        /* Performance optimizations */
        .fire-bomb-explosion,
        .fire-bomb-particle,
        .fire-bomb-shockwave {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
        
        /* Additional heat distortion effect */
        @keyframes heatDistortion {
            0%, 100% {
                filter: blur(0px) hue-rotate(0deg);
            }
            50% {
                filter: blur(2px) hue-rotate(10deg);
            }
        }
        
        .fire-bomb-explosion {
            animation: fireBombExplosion 0.8s ease-out forwards, 
                       heatDistortion 0.3s ease-in-out 2;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.FireBombPotion = FireBombPotion;
}

console.log('FireBomb potion module loaded with multi-player integration');