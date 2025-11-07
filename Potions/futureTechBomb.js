// Potions/futureTechBomb.js - Future Tech Bomb Potion Implementation
// Deals damage to ALL enemy targets, scaling with copies in graveyard

export class FutureTechBombPotion {
    constructor() {
        this.name = 'FutureTechBomb';
        this.displayName = 'Future Tech Bomb';
        this.description = 'Deals damage to all enemy heroes and creatures. Damage and explosion size scale with copies in graveyard.';
        this.effectType = 'area_damage';
        this.targetType = 'all_enemies';
        this.baseDamage = 10; // Base damage per graveyard copy
        this.minDamage = 10; // Minimum (1 copy in graveyard)
        this.maxDamage = 150; // Maximum (15 copies in graveyard)
        this.maxGraveyardCount = 15; // Max graveyard count for scaling
        
        console.log('FutureTechBomb potion initialized with graveyard scaling');
    }

    // ===== DAMAGE CALCULATION =====

    // Calculate damage based on graveyard count
    calculateDamage(graveyardCount) {
        // Ensure at least 1 (minimum damage = 10)
        const effectiveCount = Math.max(1, graveyardCount);
        
        // Calculate damage: 10 per copy
        const calculatedDamage = this.baseDamage * effectiveCount;
        
        // Clamp between min and max
        return Math.min(this.maxDamage, Math.max(this.minDamage, calculatedDamage));
    }

    // Get graveyard count from effect metadata
    // The count should be stored when the potion is used, not read at battle time
    getGraveyardCountFromEffects(effects) {
        if (!effects || effects.length === 0) {
            return 1; // Default to 1 for minimum damage
        }

        // Get graveyard count from first effect (all should have same count from when they were used)
        const firstEffect = effects[0];
        if (firstEffect && typeof firstEffect.graveyardCount === 'number') {
            return firstEffect.graveyardCount;
        }

        console.warn('No graveyard count found in effect data, using minimum');
        return 1; // Default to 1 for minimum damage
    }

    // Calculate explosion scale factor (0.2 to 1.0)
    calculateExplosionScale(graveyardCount) {
        // Ensure at least 1
        const effectiveCount = Math.max(1, graveyardCount);
        
        // Scale from 0.2 (1 copy) to 1.0 (15 copies)
        const scale = 0.2 + (Math.min(effectiveCount, this.maxGraveyardCount) - 1) * (0.8 / (this.maxGraveyardCount - 1));
        
        return scale;
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply damage to a single target (hero or creature)
    async applyDamageToTarget(target, targetInfo, battleManager, damageAmount) {
        if (!target || !battleManager) {
            console.error('Invalid target or battle manager for FutureTechBomb effect');
            return false;
        }

        try {
            // Validate target is alive before applying damage
            if (!this.isTargetValid(target)) {
                console.log(`Skipping FutureTechBomb damage on invalid/dead target: ${target.name || 'Unknown'}`);
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
                        source: 'future_tech_bomb',
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
                        source: 'future_tech_bomb',
                        attacker: null // Potion effect, no specific attacker
                    });
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error applying FutureTechBomb damage:', error);
            return false;
        }
    }

    // Apply FutureTechBomb effects to all enemy targets
    async applyFutureTechBombToAllEnemies(battleManager, playerRole, effectCount, graveyardCount) {
        if (!battleManager) {
            console.error('No battle manager provided for FutureTechBomb effects');
            return 0;
        }

        // Calculate damage based on graveyard count
        const damagePerBomb = this.calculateDamage(graveyardCount);
        const totalDamage = damagePerBomb * effectCount;
        
        console.log(`💣 Applying FutureTechBomb: ${effectCount} bombs, ${graveyardCount} in graveyard, ${damagePerBomb} damage per bomb, ${totalDamage} total damage`);

        // Collect all enemy targets
        const targets = this.collectAllEnemyTargets(battleManager, playerRole);

        if (targets.length === 0) {
            console.log('No valid targets for FutureTechBomb');
            return 0;
        }

        // Calculate explosion scale
        const explosionScale = this.calculateExplosionScale(graveyardCount);

        // Show explosion visual effect FIRST (centered on enemy formation)
        // Only show on authoritative (host) side - guest will receive via network sync
        if (battleManager.isAuthoritative) {
            await this.showExplosionEffect(battleManager, playerRole, effectCount, explosionScale);
        }

        let targetsAffected = 0;
        const damagePromises = [];

        // Apply damage to all targets
        for (const targetInfo of targets) {
            const damagePromise = this.applyDamageToTarget(targetInfo.target, targetInfo, battleManager, totalDamage)
                .then(success => {
                    if (success) {
                        targetsAffected++;
                    }
                    return success;
                })
                .catch(error => {
                    console.error(`Error applying FutureTechBomb to ${targetInfo.target.name}:`, error);
                    return false;
                });
            
            damagePromises.push(damagePromise);
        }

        // Wait for all damage to complete
        await Promise.all(damagePromises);

        // Add battle log message
        this.addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected, totalDamage, graveyardCount);

        console.log(`✅ FutureTechBomb completed: ${targetsAffected} targets affected by ${effectCount} bombs with ${graveyardCount} copies in graveyard`);
        return targetsAffected;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a target is valid for FutureTechBomb effects
    isTargetValid(target) {
        if (!target) return false;
        
        // Check if target has alive property and is alive
        if (target.hasOwnProperty('alive')) {
            return target.alive === true;
        }
        
        // Fallback: assume target is valid if no alive property
        return true;
    }

    // Collect all valid enemy targets (heroes + creatures)
    collectAllEnemyTargets(battleManager, playerRole) {
        if (!battleManager) {
            console.error('No battle manager provided for target collection');
            return [];
        }

        // Determine which heroes are enemies based on player role
        const enemyHeroes = playerRole === 'host' ? 
            battleManager.opponentHeroes : 
            battleManager.playerHeroes;

        const targets = [];

        // Collect all enemy heroes and their creatures
        for (const position of ['left', 'center', 'right']) {
            const hero = enemyHeroes[position];
            
            if (hero && this.isTargetValid(hero)) {
                // Add hero as target
                targets.push({
                    target: hero,
                    isCreature: false,
                    hero: hero,
                    position: position,
                    side: hero.side
                });

                // Add all creatures as targets
                if (hero.creatures) {
                    hero.creatures.forEach((creature, index) => {
                        if (this.isTargetValid(creature)) {
                            targets.push({
                                target: creature,
                                isCreature: true,
                                hero: hero,
                                creatureIndex: index,
                                position: position,
                                side: hero.side
                            });
                        }
                    });
                }
            }
        }

        console.log(`Collected ${targets.length} valid enemy targets for FutureTechBomb`);
        return targets;
    }

    // ===== VISUAL EFFECTS =====

    // Show the explosion effect centered on enemy formation
    async showExplosionEffect(battleManager, playerRole, bombCount = 1, explosionScale = 0.2) {
        try {
            // Get the center of the enemy formation
            const enemyHeroes = playerRole === 'host' ? 
                battleManager.opponentHeroes : 
                battleManager.playerHeroes;

            // Get center hero element as reference point
            const centerHero = enemyHeroes['center'];
            if (!centerHero) {
                console.warn('Could not find center hero for FutureTechBomb visual effect');
                return;
            }

            const centerElement = this.getHeroElement(centerHero, battleManager);
            if (!centerElement) {
                console.warn('Could not find center element for FutureTechBomb visual effect');
                return;
            }

            // Create and show the scaled explosion animation
            await this.createExplosionAnimation(centerElement, bombCount, explosionScale);
            
        } catch (error) {
            console.error('Error showing FutureTechBomb explosion effect:', error);
        }
    }

    // Create the scaled explosion animation
    async createExplosionAnimation(centerElement, bombCount, explosionScale) {
        // Calculate explosion size based on scale (50px to 2000px)
        const baseSize = 50;
        const maxSize = 2000;
        const explosionSize = baseSize + (maxSize - baseSize) * explosionScale;

        // Create main explosion element
        const explosion = document.createElement('div');
        explosion.className = 'future-tech-bomb-explosion';
        explosion.textContent = '💥';
        
        explosion.style.cssText = `
            position: fixed;
            font-size: ${explosionSize}px;
            z-index: 9999;
            pointer-events: none;
            filter: drop-shadow(0 0 ${explosionSize * 0.1}px rgba(255, 100, 0, 0.8))
                    drop-shadow(0 0 ${explosionSize * 0.2}px rgba(255, 69, 0, 0.6));
            animation: futureTechBombExplosion 1.2s ease-out forwards;
        `;

        // Position at center of formation
        this.positionEffectOnTarget(explosion, centerElement);
        document.body.appendChild(explosion);

        // Create additional layers for intensity
        const layers = Math.min(3, Math.floor(bombCount / 2) + 1);
        for (let i = 0; i < layers; i++) {
            const layer = document.createElement('div');
            layer.className = `future-tech-bomb-explosion future-tech-bomb-layer-${i + 1}`;
            layer.textContent = '💥';
            
            layer.style.cssText = `
                position: fixed;
                font-size: ${explosionSize * (0.8 - i * 0.15)}px;
                z-index: ${9998 - i};
                pointer-events: none;
                opacity: ${0.6 - i * 0.15};
                filter: drop-shadow(0 0 ${explosionSize * 0.1}px rgba(255, 150, 50, 0.6));
                animation: futureTechBombExplosion 1.2s ease-out forwards;
                animation-delay: ${i * 0.1}s;
            `;
            
            this.positionEffectOnTarget(layer, centerElement);
            document.body.appendChild(layer);
            
            setTimeout(() => {
                if (layer && layer.parentNode) {
                    layer.remove();
                }
            }, 1400 + (i * 100));
        }

        // Create shockwave effect with scaled size
        this.createScaledShockwave(centerElement, explosionScale);

        // Create energy particles
        const particleCount = Math.min(20, 5 + Math.floor(explosionScale * 15));
        this.createEnergyParticles(centerElement, particleCount, explosionScale);

        // Remove main explosion after animation
        setTimeout(() => {
            if (explosion && explosion.parentNode) {
                explosion.remove();
            }
        }, 1200);

        // Wait for animation to complete
        await this.waitForAnimation(1200);
    }

    // Create scaled shockwave effect
    createScaledShockwave(centerElement, explosionScale) {
        const baseSize = 100;
        const maxSize = 2500;
        const shockwaveSize = baseSize + (maxSize - baseSize) * explosionScale;

        const shockwave = document.createElement('div');
        shockwave.className = 'future-tech-bomb-shockwave';
        
        shockwave.style.cssText = `
            position: fixed;
            width: ${shockwaveSize}px;
            height: ${shockwaveSize}px;
            border: ${4 + explosionScale * 6}px solid rgba(0, 200, 255, 0.8);
            border-radius: 50%;
            z-index: 9997;
            pointer-events: none;
            animation: futureTechBombShockwave 1.0s ease-out forwards;
        `;
        
        this.positionEffectOnTarget(shockwave, centerElement);
        document.body.appendChild(shockwave);
        
        setTimeout(() => {
            if (shockwave && shockwave.parentNode) {
                shockwave.remove();
            }
        }, 1000);
    }

    // Create energy particles
    createEnergyParticles(centerElement, count, explosionScale) {
        const baseDistance = 100;
        const maxDistance = 800;
        const particleDistance = baseDistance + (maxDistance - baseDistance) * explosionScale;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'future-tech-bomb-particle';
            particle.textContent = ['⚡', '✨', '💫', '🔥'][Math.floor(Math.random() * 4)];
            
            // Random direction
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const distance = particleDistance * (0.5 + Math.random() * 0.5);
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;
            
            particle.style.cssText = `
                position: fixed;
                font-size: ${14 + explosionScale * 10}px;
                z-index: 9996;
                pointer-events: none;
                opacity: 0;
            `;
            
            this.positionEffectOnTarget(particle, centerElement);
            document.body.appendChild(particle);
            
            // Create unique animation for this particle
            this.createParticleAnimation(particle, endX, endY, i);
            
            setTimeout(() => {
                if (particle && particle.parentNode) {
                    particle.remove();
                }
            }, 1500);
        }
    }

    // Create particle animation
    createParticleAnimation(particle, endX, endY, index) {
        const animationName = `futureTechBombParticle_${Date.now()}_${index}`;
        
        // Check if animation already exists
        if (this.animationExists(animationName)) {
            particle.style.animation = `${animationName} 1.2s ease-out forwards`;
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
        particle.style.animation = `${animationName} 1.2s ease-out forwards`;
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
        
        effectElement.style.left = `${centerX}px`;
        effectElement.style.top = `${centerY}px`;
        effectElement.style.transform = 'translate(-50%, -50%)';
    }

    // Add battle log message
    addBattleLogMessage(battleManager, playerRole, effectCount, targetsAffected, totalDamage, graveyardCount) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for FutureTechBomb message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'error';
        
        let message;
        if (effectCount === 1) {
            message = `💣 ${playerName}'s Future Tech Bomb detonates! [${graveyardCount} in graveyard] ${targetsAffected} targets take ${totalDamage} damage!`;
        } else {
            message = `💣 ${playerName}'s ${effectCount} Future Tech Bombs detonate! [${graveyardCount} in graveyard] ${targetsAffected} targets take ${totalDamage} damage!`;
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
        let styleSheet = document.getElementById('futureTechBombAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'futureTechBombAnimations';
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
            console.log('No FutureTechBomb effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for FutureTechBomb effects');
            return 0;
        }

        console.log(`💣 FutureTechBomb handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Get graveyard count from effect metadata (stored when potion was used)
            const graveyardCount = this.getGraveyardCountFromEffects(effects);
            
            console.log(`💣 FutureTechBomb using graveyard count: ${graveyardCount} (from effect metadata)`);
            
            // Apply all bomb effects to all enemies
            const effectCount = effects.length;
            await this.applyFutureTechBombToAllEnemies(
                battleManager, 
                playerRole, 
                effectCount,
                graveyardCount
            );

            // Send visual sync to guest
            if (battleManager.isAuthoritative && battleManager.sendBattleUpdate) {
                battleManager.sendBattleUpdate('potion_specific_visual', {
                    potionName: 'FutureTechBomb',
                    visualType: 'potion_effects',
                    effectCount: effectCount,
                    playerSide: playerRole,
                    graveyardCount: graveyardCount
                });
            }

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling FutureTechBomb effects for ${playerRole}:`, error);
            
            // Fallback: try basic damage application
            const graveyardCount = this.getGraveyardCountFromEffects(effects);
            await this.applyFallbackFutureTechBombEffects(battleManager, playerRole, effects.length, graveyardCount);
            return effects.length;
        }
    }

    // Fallback effect application (without visuals)
    async applyFallbackFutureTechBombEffects(battleManager, playerRole, effectCount, graveyardCount = 1) {
        try {
            const damagePerBomb = this.calculateDamage(graveyardCount);
            const totalDamage = damagePerBomb * effectCount;
            
            const targets = this.collectAllEnemyTargets(battleManager, playerRole);
            
            if (targets.length === 0) {
                console.log('No valid targets for fallback FutureTechBomb');
                return;
            }
            
            let fallbackTargets = 0;
            
            // Apply damage to all targets
            for (const targetInfo of targets) {
                if (targetInfo.isCreature) {
                    if (battleManager.isAuthoritative && battleManager.combatManager) {
                        await battleManager.combatManager.authoritative_applyDamageToCreature({
                            hero: targetInfo.hero,
                            creature: targetInfo.target,
                            creatureIndex: targetInfo.creatureIndex,
                            damage: totalDamage,
                            position: targetInfo.position,
                            side: targetInfo.side
                        }, { source: 'future_tech_bomb' });
                    }
                } else {
                    if (battleManager.isAuthoritative && battleManager.combatManager) {
                        await battleManager.combatManager.authoritative_applyDamage({
                            target: targetInfo.target,
                            damage: totalDamage,
                            newHp: Math.max(0, targetInfo.target.currentHp - totalDamage),
                            died: (targetInfo.target.currentHp - totalDamage) <= 0
                        }, { source: 'future_tech_bomb' });
                    }
                }
                fallbackTargets++;
            }
            
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `💣 ${playerName}'s Future Tech Bomb effects applied [${graveyardCount} in graveyard] (${totalDamage} damage to ${fallbackTargets} targets)`, 
                playerRole === 'host' ? 'success' : 'error'
            );
            
            console.log(`Fallback FutureTechBomb: Applied ${totalDamage} damage to ${fallbackTargets} targets`);
            
        } catch (error) {
            console.error('Error in fallback FutureTechBomb application:', error);
        }
    }

    // ===== GUEST-SIDE VISUAL HANDLER =====
    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, effectCount = 1, graveyardCount = 1 } = data;
        const isHostPotion = (playerSide === 'host');
        
        // Calculate explosion scale
        const explosionScale = this.calculateExplosionScale(graveyardCount);
        

        // CRITICAL: Flip perspective for guest - if host used the potion, guest sees explosion on their own heroes
        // From guest's perspective: guest is 'guest', opponent is 'host'
        // If host used potion (isHostPotion = true), explosion should be on guest's heroes, so pass 'guest'
        // If guest used potion (isHostPotion = false), explosion should be on host's heroes, so pass 'host'
        const targetRole = isHostPotion ? 'guest' : 'host';

        // Show explosion effect centered on enemy formation (from guest's perspective)
        await this.showExplosionEffect(battleManager, targetRole, effectCount, explosionScale);
        
        // Show battle log message
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        const damagePerBomb = this.calculateDamage(graveyardCount);
        const totalDamage = damagePerBomb * effectCount;
        
        const targets = this.collectAllEnemyTargets(battleManager, playerSide);
        
        battleManager.addCombatLog(
            `💣 ${playerName}'s ${effectCount > 1 ? effectCount + ' ' : ''}Future Tech Bomb${effectCount > 1 ? 's' : ''} detonate${effectCount > 1 ? '' : 's'}! [${graveyardCount} in graveyard] ${targets.length} targets take ${totalDamage} damage!`,
            logType
        );
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is FutureTechBomb
    static isFutureTechBomb(potionName) {
        return potionName === 'FutureTechBomb';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'FutureTechBomb',
            displayName: 'Future Tech Bomb',
            description: 'Deals damage to all enemy heroes and creatures. Damage and explosion size scale with copies in graveyard (10 damage per copy, max 150).',
            cardType: 'Potion',
            cost: 0,
            effect: 'Deals 10-150 damage (scaling with graveyard) to all enemy targets at battle start',
            baseDamage: 10,
            maxDamage: 150,
            targetType: 'all_enemies'
        };
    }

    // Static method to create a new instance
    static create() {
        return new FutureTechBombPotion();
    }
}

// Add CSS animations for FutureTechBomb effects
if (typeof document !== 'undefined' && !document.getElementById('futureTechBombStyles')) {
    const style = document.createElement('style');
    style.id = 'futureTechBombStyles';
    style.textContent = `
        /* Main explosion animation */
        @keyframes futureTechBombExplosion {
            0% {
                transform: translate(-50%, -50%) scale(0.1) rotate(0deg);
                opacity: 0;
            }
            10% {
                transform: translate(-50%, -50%) scale(0.5) rotate(45deg);
                opacity: 1;
            }
            30% {
                transform: translate(-50%, -50%) scale(1.2) rotate(90deg);
                opacity: 1;
            }
            60% {
                transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                opacity: 0.9;
            }
            100% {
                transform: translate(-50%, -50%) scale(0.3) rotate(360deg);
                opacity: 0;
            }
        }
        
        /* Shockwave animation */
        @keyframes futureTechBombShockwave {
            0% {
                transform: translate(-50%, -50%) scale(0.3);
                opacity: 1;
                border-width: 6px;
            }
            50% {
                transform: translate(-50%, -50%) scale(2.0);
                opacity: 0.6;
                border-width: 3px;
            }
            100% {
                transform: translate(-50%, -50%) scale(4.0);
                opacity: 0;
                border-width: 0px;
            }
        }
        
        /* Base styles for future tech bomb effects */
        .future-tech-bomb-explosion {
            will-change: transform, opacity;
        }
        
        .future-tech-bomb-particle {
            will-change: transform, opacity;
        }
        
        .future-tech-bomb-shockwave {
            will-change: transform, opacity, border-width;
        }
        
        /* Enhanced explosion glow */
        .future-tech-bomb-explosion:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 150px;
            height: 150px;
            background: radial-gradient(circle, 
                rgba(0, 200, 255, 0.6) 0%, 
                rgba(100, 150, 255, 0.4) 40%, 
                transparent 70%);
            border-radius: 50%;
            animation: futureTechBombGlow 1.0s ease-out;
        }
        
        @keyframes futureTechBombGlow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            20% {
                transform: translate(-50%, -50%) scale(1.0);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -50%) scale(2.5);
                opacity: 0.6;
            }
            100% {
                transform: translate(-50%, -50%) scale(4.5);
                opacity: 0;
            }
        }
        
        /* Layered explosions for intensity */
        .future-tech-bomb-layer-1 {
            animation-delay: 0.1s;
            opacity: 0.7;
        }
        
        .future-tech-bomb-layer-2 {
            animation-delay: 0.2s;
            opacity: 0.5;
        }
        
        .future-tech-bomb-layer-3 {
            animation-delay: 0.3s;
            opacity: 0.3;
        }
        
        /* Responsive effects */
        @media (max-width: 768px) {
            .future-tech-bomb-explosion {
                font-size: 40px !important;
            }
            
            .future-tech-bomb-particle {
                font-size: 14px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .future-tech-bomb-explosion {
                text-shadow: 
                    0 0 15px #ffffff,
                    0 0 30px #000000;
            }
            
            .future-tech-bomb-particle {
                text-shadow: 
                    0 0 8px #ffffff,
                    0 0 15px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .future-tech-bomb-explosion {
                animation: futureTechBombReducedMotion 0.6s ease-out forwards;
            }
            
            .future-tech-bomb-particle {
                animation: none;
                opacity: 0;
            }
            
            .future-tech-bomb-shockwave {
                animation: futureTechBombShockwaveReducedMotion 0.5s ease-out forwards;
            }
        }
        
        @keyframes futureTechBombReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.7);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.3);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        @keyframes futureTechBombShockwaveReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.7);
            }
            50% {
                opacity: 0.5;
                transform: translate(-50%, -50%) scale(1.8);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(2.5);
            }
        }
        
        /* Performance optimizations */
        .future-tech-bomb-explosion,
        .future-tech-bomb-particle,
        .future-tech-bomb-shockwave {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
        
        /* Additional energy distortion effect */
        @keyframes energyDistortion {
            0%, 100% {
                filter: blur(0px) hue-rotate(0deg) brightness(1);
            }
            50% {
                filter: blur(3px) hue-rotate(30deg) brightness(1.3);
            }
        }
        
        .future-tech-bomb-explosion {
            animation: futureTechBombExplosion 1.2s ease-out forwards, 
                       energyDistortion 0.4s ease-in-out 2;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.FutureTechBombPotion = FutureTechBombPotion;
}

console.log('FutureTechBomb potion module loaded with graveyard scaling and full-screen effects');