// ./Heroes/monia.js - Monia Hero Effect Implementation (FIXED)

export class MoniaHeroEffect {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.heroName = 'Monia';
        this.activeShields = new Set(); // Track active shield effects for cleanup
        
        // Monia protection stats
        this.DAMAGE_REDUCTION_PERCENT = 33; // 33% damage reduction
        this.SHIELD_DURATION = 800; // 800ms shield duration
        
        // Inject CSS styles
        this.injectMoniaShieldStyles();
    }

    // ============================================
    // CORE MONIA EFFECT - FIXED: Now synchronous for damage calculation
    // ============================================

    // Check and apply Monia's protection when any target takes damage
    static checkMoniaProtection(target, damage, battleManager) {        
        // Validate input
        if (typeof damage !== 'number' || isNaN(damage) || damage < 0) {
            console.warn(`⚠️ Invalid damage value: ${damage}, returning original`);
            return damage;
        }
        
        // Initialize Monia effect instance if needed
        if (!battleManager.moniaEffect) {
            battleManager.moniaEffect = new MoniaHeroEffect(battleManager);
        }
        
        // Find protecting Monia and calculate reduced damage (SYNCHRONOUS)
        const protectionResult = battleManager.moniaEffect.findProtectingMonia(target, damage);
        
        if (protectionResult) {
            const { protectingMonia, reducedDamage } = protectionResult;
            
            // Validate reduced damage
            if (typeof reducedDamage !== 'number' || isNaN(reducedDamage) || reducedDamage < 0) {
                console.error(`❌ Invalid reduced damage: ${reducedDamage}, using original damage`);
                return damage;
            }
            
            // Trigger visual effects asynchronously (non-blocking)
            battleManager.moniaEffect.executeProtectionEffectAsync(protectingMonia, target, damage, reducedDamage);
            
            return reducedDamage; // Return the reduced damage immediately
        }
        
        return damage; // No protection, return original damage
    }

    // ============================================
    // PROTECTION LOGIC (SYNCHRONOUS)
    // ============================================

    // Find a protecting Monia in neighboring zones
    findProtectingMonia(target, damage) {
        if (!this.battleManager.isAuthoritative) return null;

        // Validate damage input
        if (typeof damage !== 'number' || isNaN(damage) || damage < 0) {
            console.warn(`⚠️ Invalid damage for protection check: ${damage}`);
            return null;
        }

        // Determine target's position and side
        const targetPosition = this.getTargetPosition(target);
        const targetSide = this.getTargetSide(target);
        
        if (!targetPosition || !targetSide) {
            return null;
        }

        // Get neighboring positions
        const neighboringPositions = this.getNeighboringPositions(targetPosition);

        // Check each neighboring position for a protecting Monia
        for (const neighborPosition of neighboringPositions) {
            const protectingMonia = this.getMoniaAtPosition(targetSide, neighborPosition);
            
            if (protectingMonia && this.canMoniaProtect(protectingMonia)) {
                const reducedDamage = this.calculateReducedDamage(damage);
                
                // Validate reduced damage before returning
                if (typeof reducedDamage !== 'number' || isNaN(reducedDamage)) {
                    console.error(`❌ Invalid reduced damage calculated: ${reducedDamage}`);
                    continue; // Try next Monia if this calculation failed
                }
                                
                return {
                    protectingMonia: protectingMonia,
                    reducedDamage: reducedDamage
                };
            }
        }
        return null;
    }

    // Calculate reduced damage (33% reduction, final damage rounded up)
    calculateReducedDamage(originalDamage) {
        // Validate input
        if (typeof originalDamage !== 'number' || isNaN(originalDamage) || originalDamage < 0) {
            console.error(`❌ Invalid original damage for reduction: ${originalDamage}`);
            return originalDamage;
        }
        
        try {
            const reductionPercent = this.DAMAGE_REDUCTION_PERCENT / 100; // 0.33
            const reducedDamage = originalDamage * (1 - reductionPercent); // damage * 0.67
            const finalDamage = Math.ceil(reducedDamage); // Round up
            
            const result = Math.max(1, finalDamage); // Ensure minimum 1 damage
            
            // Validate result
            if (typeof result !== 'number' || isNaN(result) || result < 1) {
                console.error(`❌ Invalid damage calculation result: ${result}, returning minimum damage`);
                return 1;
            }
            return result;
            
        } catch (error) {
            console.error('❌ Error calculating reduced damage:', error);
            return Math.max(1, originalDamage); // Fallback to original or minimum
        }
    }

    // ============================================
    // VISUAL EFFECTS (ASYNCHRONOUS, NON-BLOCKING)
    // ============================================

    // Execute protection effect with shield animations (async, non-blocking)
    async executeProtectionEffectAsync(protectingMonia, target, originalDamage, reducedDamage) {
        try {
            const damageReduced = originalDamage - reducedDamage;
            
            // Log the protection
            this.battleManager.addCombatLog(
                `🛡️ ${protectingMonia.name} protects ${target.name}! Damage reduced by ${damageReduced} (${originalDamage} → ${reducedDamage})`,
                protectingMonia.side === 'player' ? 'success' : 'info'
            );

            // Send synchronization data to guest
            this.sendProtectionEffectUpdate(protectingMonia, target, originalDamage, reducedDamage);

            // Short delay to ensure guest receives the message
            await this.battleManager.delay(50);

            // ⭐ NEW: Animate Monia dashing to protect the target
            const dashPromise = this.animateMoniaProtectionDash(protectingMonia, target);
            
            // Create shield animations on both Monia and the target (parallel with dash)
            const shieldPromise = this.createShieldAnimations(protectingMonia, target);
            
            // Wait for both animations to complete
            await Promise.all([dashPromise, shieldPromise]);
            
        } catch (error) {
            console.error('❌ Error in protection effect animation:', error);
        }
    }

    // Animate Monia dashing to protect target
    async animateMoniaProtectionDash(protectingMonia, target) {
        if (!this.battleManager.animationManager) {
            console.warn('Animation manager not available for Monia protection dash');
            return;
        }
        
        try {
            await this.battleManager.animationManager.animateMoniaProtectionDash(protectingMonia, target);
        } catch (error) {
            console.error('Error animating Monia protection dash:', error);
        }
    }

    // Get target's position (left, center, right)
    getTargetPosition(target) {
        // For heroes, position is directly available
        if (target.position) {
            return target.position;
        }
        
        // For creatures, find their hero's position
        const creatureInfo = this.findCreatureInfo(target);
        if (creatureInfo) {
            return creatureInfo.position;
        }
        
        return null;
    }

    // Get target's side (player or opponent)
    getTargetSide(target) {
        // For heroes, side is directly available
        if (target.side) {
            return target.side;
        }
        
        // For creatures, find their hero's side
        const creatureInfo = this.findCreatureInfo(target);
        if (creatureInfo) {
            return creatureInfo.side;
        }
        
        return null;
    }

    // Find creature information (hero, position, side)
    findCreatureInfo(creature) {
        // Search through all heroes and their creatures
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            
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

    // Get neighboring positions for a given position
    getNeighboringPositions(position) {
        switch (position) {
            case 'left':
                return ['center']; // Left neighbors center
            case 'center':
                return ['left', 'right']; // Center neighbors both left and right
            case 'right':
                return ['center']; // Right neighbors center
            default:
                return [];
        }
    }

    // Get Monia hero at specific position and side
    getMoniaAtPosition(side, position) {
        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[position];
        
        if (hero && hero.alive && hero.name === 'Monia') {
            return hero;
        }
        
        return null;
    }

    // Check if Monia can protect (alive, not stunned, not frozen)
    canMoniaProtect(monia) {
        if (!monia || !monia.alive) {
            return false;
        }
        
        // Use existing status effects system to check if Monia can take action
        if (this.battleManager.statusEffectsManager) {
            const canAct = this.battleManager.statusEffectsManager.canTakeAction(monia);
            return canAct;
        }
        
        // Fallback if status effects manager not available
        return true;
    }

    // Create shield animations on both protector and target
    async createShieldAnimations(protectingMonia, target) {
        const moniaElement = this.getHeroElement(protectingMonia);
        const targetElement = this.getTargetElement(target);
        
        const shieldPromises = [];
        
        // Create shield on Monia
        if (moniaElement) {
            const moniaShield = this.createProtectionShield(moniaElement, 'protector');
            if (moniaShield) {
                this.activeShields.add(moniaShield);
                shieldPromises.push(this.removeShieldAfterDuration(moniaShield));
            }
        }
        
        // Create shield on target
        if (targetElement) {
            const targetShield = this.createProtectionShield(targetElement, 'protected');
            if (targetShield) {
                this.activeShields.add(targetShield);
                shieldPromises.push(this.removeShieldAfterDuration(targetShield));
            }
        }
        
        // Wait for all shield animations to complete
        await Promise.all(shieldPromises);
    }

    // Create protection shield visual effect
    createProtectionShield(targetElement, shieldType) {
        if (!targetElement) {
            console.warn('Cannot create protection shield: target element not found');
            return null;
        }

        // Additional validation: ensure element is still in DOM
        if (!document.body.contains(targetElement)) {
            console.warn('Cannot create protection shield: element not in DOM');
            return null;
        }

        try {
            // Create the main shield element
            const shield = document.createElement('div');
            shield.className = `monia-protection-shield ${shieldType}-shield`;
            
            // Different colors for protector vs protected
            const shieldColor = shieldType === 'protector' ? 
                'rgba(135, 206, 250, 0.9)' : // Light blue for Monia
                'rgba(255, 215, 0, 0.9)';     // Gold for protected target
            
            shield.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 120px;
                height: 120px;
                transform: translate(-50%, -50%);
                border: 3px solid ${shieldColor};
                border-radius: 50%;
                background: radial-gradient(circle, ${shieldColor.replace('0.9', '0.3')} 0%, transparent 70%);
                z-index: 1500;
                pointer-events: none;
                animation: moniaShieldPulse ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-in-out;
                box-shadow: 
                    0 0 20px ${shieldColor},
                    0 0 40px ${shieldColor.replace('0.9', '0.6')},
                    inset 0 0 20px ${shieldColor.replace('0.9', '0.4')};
            `;

            // Add shield core effect
            const core = document.createElement('div');
            core.className = 'monia-shield-core';
            core.innerHTML = '🛡️';
            core.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 32px;
                color: white;
                text-shadow: 
                    0 0 10px ${shieldColor},
                    2px 2px 4px rgba(0, 0, 0, 0.8);
                animation: moniaShieldCore ${this.battleManager.getSpeedAdjustedDelay(200)}ms linear infinite;
            `;
            
            shield.appendChild(core);
            targetElement.appendChild(shield);
            
            return shield;
            
        } catch (error) {
            console.error('Error creating protection shield:', error);
            return null;
        }
    }

    // Remove shield with fade effect after duration
    async removeShieldAfterDuration(shield) {
        await this.battleManager.delay(this.SHIELD_DURATION);
        
        if (!shield || !shield.parentNode) {
            return;
        }

        try {
            shield.classList.add('monia-shield-fadeout');
            this.activeShields.delete(shield);
        } catch (error) {
            console.warn('Error adding fadeout class to shield:', error);
        }

        await this.battleManager.delay(200);
        
        try {
            if (shield && shield.parentNode) {
                shield.remove();
            }
        } catch (error) {
            console.warn('Error removing shield element:', error);
        }
    }

    // Get hero element by hero object
    getHeroElement(hero) {
        return this.battleManager.getHeroElement(hero.side, hero.position);
    }

    // Get target element (hero or creature)
    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            // Hero element
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
            // Creature element
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;

            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
    }

    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================

    // Send protection effect data to guest for synchronization
    sendProtectionEffectUpdate(protectingMonia, target, originalDamage, reducedDamage) {
        this.battleManager.sendBattleUpdate('monia_protection_effect', {
            protectorData: {
                side: protectingMonia.side,
                position: protectingMonia.position,
                name: protectingMonia.name,
                absoluteSide: protectingMonia.absoluteSide
            },
            target: this.getTargetSyncData(target),
            originalDamage: originalDamage,
            reducedDamage: reducedDamage,
            damageReduced: originalDamage - reducedDamage,
            shieldDuration: this.SHIELD_DURATION
        });
    }

    // Get target sync data for network synchronization
    getTargetSyncData(target) {
        if (target.type === 'hero' || !target.type) {
            return {
                type: 'hero',
                side: target.side,
                absoluteSide: target.absoluteSide,
                position: target.position,
                name: target.name
            };
        } else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                side: creatureInfo.side,
                absoluteSide: creatureInfo.hero.absoluteSide,
                position: creatureInfo.position,
                creatureIndex: creatureInfo.creatureIndex,
                name: target.name
            };
        }
    }

    // Handle protection effect on guest side
    handleGuestProtectionEffect(data) {
        const { protectorData, target, originalDamage, reducedDamage, damageReduced, shieldDuration } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const protectorLocalSide = (protectorData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Add to combat log
        this.battleManager.addCombatLog(
            `🛡️ ${protectorData.name} protects ${target.name}! Damage reduced by ${damageReduced} (${originalDamage} → ${reducedDamage})`,
            protectorLocalSide === 'player' ? 'success' : 'info'
        );

        // Start guest animation immediately
        this.createGuestShieldAnimations(protectorData, target, myAbsoluteSide);
    }

    // Create shield animations on guest side
    async createGuestShieldAnimations(protectorData, targetData, myAbsoluteSide) {
        const protectorLocalSide = (protectorData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const protectorElement = this.battleManager.getHeroElement(protectorLocalSide, protectorData.position);

        if (!protectorElement) {
            console.warn('Protector element not found on guest side');
            return;
        }

        // Find target element
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        let targetElement = null;
        
        if (targetData.type === 'hero') {
            targetElement = this.battleManager.getHeroElement(targetLocalSide, targetData.position);
        } else if (targetData.type === 'creature' && targetData.creatureIndex !== undefined) {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }

        if (!targetElement) {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
            return;
        }

        // ⭐ NEW: Recreate Monia and target objects for animation
        const protectorHero = protectorLocalSide === 'player' ? 
            this.battleManager.playerHeroes[protectorData.position] : 
            this.battleManager.opponentHeroes[protectorData.position];
            
        // Create target object for animation
        let targetForAnimation = null;
        if (targetData.type === 'hero') {
            targetForAnimation = targetLocalSide === 'player' ? 
                this.battleManager.playerHeroes[targetData.position] : 
                this.battleManager.opponentHeroes[targetData.position];
        } else {
            // For creatures, we need to reconstruct a target object
            const heroes = targetLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[targetData.position];
            if (hero && hero.creatures && hero.creatures[targetData.creatureIndex]) {
                targetForAnimation = hero.creatures[targetData.creatureIndex];
                // Add required properties for animation
                targetForAnimation.type = 'creature';
                targetForAnimation.side = targetLocalSide;
                targetForAnimation.position = targetData.position;
                targetForAnimation.creatureIndex = targetData.creatureIndex; // ← CRITICAL: Add this line
            }
        }

        // Run dash animation and shield animations in parallel
        const animations = [];

        // Add Monia dash animation on guest side
        if (protectorHero && targetForAnimation && this.battleManager.animationManager) {
            animations.push(this.battleManager.animationManager.animateMoniaProtectionDash(protectorHero, targetForAnimation));
        }

        // Create shields on both protector and target
        const protectorShield = this.createProtectionShield(protectorElement, 'protector');
        if (protectorShield) {
            this.activeShields.add(protectorShield);
            animations.push(this.removeShieldAfterDuration(protectorShield));
        }
        
        const targetShield = this.createProtectionShield(targetElement, 'protected');
        if (targetShield) {
            this.activeShields.add(targetShield);
            animations.push(this.removeShieldAfterDuration(targetShield));
        }

        // Wait for all animations to complete
        await Promise.all(animations);
        
        this.battleManager.addCombatLog(`🛡️ ${protectorData.name}'s protection fades`, 'info');
    }

    // ============================================
    // CSS STYLES
    // ============================================

    // Inject CSS styles for Monia's protection effects
    injectMoniaShieldStyles() {
        if (document.getElementById('moniaShieldStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'moniaShieldStyles';
        style.textContent = `
            /* Monia Protection Shield Styles */
            .monia-protection-shield {
                border-radius: 50%;
                position: relative;
                overflow: visible;
            }

            .monia-shield-core {
                pointer-events: none;
            }

            @keyframes moniaShieldPulse {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                    filter: brightness(0.5);
                }
                20% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2);
                    filter: brightness(1.5);
                }
                50% { 
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.0);
                    filter: brightness(1.2);
                }
                100% { 
                    opacity: 0.7;
                    transform: translate(-50%, -50%) scale(1.1);
                    filter: brightness(1.0);
                }
            }

            @keyframes moniaShieldCore {
                0% { 
                    transform: translate(-50%, -50%) rotate(0deg) scale(0.8);
                    opacity: 0.8;
                }
                50% { 
                    transform: translate(-50%, -50%) rotate(180deg) scale(1.2);
                    opacity: 1;
                }
                100% { 
                    transform: translate(-50%, -50%) rotate(360deg) scale(0.8);
                    opacity: 0.8;
                }
            }

            .monia-shield-fadeout {
                animation: moniaShieldFadeOut 0.2s ease-out forwards !important;
            }

            @keyframes moniaShieldFadeOut {
                0% { 
                    opacity: 0.7;
                    transform: translate(-50%, -50%) scale(1.1);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
            }

            /* Different shield styles for protector vs protected */
            .protector-shield {
                border-color: rgba(135, 206, 250, 0.9) !important;
                box-shadow: 
                    0 0 20px rgba(135, 206, 250, 0.9),
                    0 0 40px rgba(135, 206, 250, 0.6),
                    inset 0 0 20px rgba(135, 206, 250, 0.4) !important;
            }

            .protected-shield {
                border-color: rgba(255, 215, 0, 0.9) !important;
                box-shadow: 
                    0 0 20px rgba(255, 215, 0, 0.9),
                    0 0 40px rgba(255, 215, 0, 0.6),
                    inset 0 0 20px rgba(255, 215, 0, 0.4) !important;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // CLEANUP
    // ============================================

    // Clean up all active shields
    cleanup() {
        this.activeShields.forEach(shield => {
            try {
                if (shield && shield.parentNode) {
                    shield.remove();
                }
            } catch (error) {
                console.warn('Error removing shield during cleanup:', error);
            }
        });
        
        this.activeShields.clear();

        // Remove any orphaned shield elements
        try {
            const orphanedShields = document.querySelectorAll('.monia-protection-shield');
            orphanedShields.forEach(shield => {
                if (shield.parentNode) {
                    shield.remove();
                }
            });
        } catch (error) {
            console.warn('Error cleaning up orphaned shields:', error);
        }
    }
}