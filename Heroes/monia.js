// ./Heroes/monia.js - Monia Hero Effect Implementation (with MoniaBot support)

export class MoniaHeroEffect {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.heroName = 'Monia';
        this.activeShields = new Set();
        this.activeFlameTrails = new Set(); // Track MoniaBot flame trails
        
        // Monia protection stats - varies by hero type
        this.MONIA_DAMAGE_REDUCTION = 33; // 33% for regular Monia
        this.MONIABOT_DAMAGE_REDUCTION = 66; // 66% for MoniaBot
        this.SHIELD_DURATION = 800;
        
        this.injectMoniaShieldStyles();
        this.injectMoniaBotFlameStyles();
    }

    // ============================================
    // CORE EFFECT - FIXED: Now synchronous
    // ============================================

    static checkMoniaProtection(target, damage, battleManager) {        
        if (typeof damage !== 'number' || isNaN(damage) || damage < 0) {
            console.warn(`⚠️ Invalid damage value: ${damage}, returning original`);
            return damage;
        }
        
        if (!battleManager.moniaEffect) {
            battleManager.moniaEffect = new MoniaHeroEffect(battleManager);
        }
        
        const protectionResult = battleManager.moniaEffect.findProtectingMonia(target, damage);
        
        if (protectionResult) {
            const { protectingMonia, reducedDamage } = protectionResult;
            
            if (typeof reducedDamage !== 'number' || isNaN(reducedDamage) || reducedDamage < 0) {
                console.error(`❌ Invalid reduced damage: ${reducedDamage}, using original damage`);
                return damage;
            }
            
            battleManager.moniaEffect.executeProtectionEffectAsync(protectingMonia, target, damage, reducedDamage);
            
            return reducedDamage;
        }
        
        return damage;
    }

    // ============================================
    // PROTECTION LOGIC (SYNCHRONOUS)
    // ============================================

    findProtectingMonia(target, damage) {
        if (!this.battleManager.isAuthoritative) return null;

        if (typeof damage !== 'number' || isNaN(damage) || damage < 0) {
            console.warn(`⚠️ Invalid damage for protection check: ${damage}`);
            return null;
        }

        const targetPosition = this.getTargetPosition(target);
        const targetSide = this.getTargetSide(target);
        
        if (!targetPosition || !targetSide) {
            return null;
        }

        const neighboringPositions = this.getNeighboringPositions(targetPosition);

        for (const neighborPosition of neighboringPositions) {
            const protectingMonia = this.getMoniaAtPosition(targetSide, neighborPosition);
            
            if (protectingMonia && this.canMoniaProtect(protectingMonia)) {
                const reducedDamage = this.calculateReducedDamage(damage, protectingMonia);
                
                if (typeof reducedDamage !== 'number' || isNaN(reducedDamage)) {
                    console.error(`❌ Invalid reduced damage calculated: ${reducedDamage}`);
                    continue;
                }
                                
                return {
                    protectingMonia: protectingMonia,
                    reducedDamage: reducedDamage
                };
            }
        }
        return null;
    }

    // Calculate reduced damage - NEW: checks hero type for reduction %
    calculateReducedDamage(originalDamage, protectingHero) {
        if (typeof originalDamage !== 'number' || isNaN(originalDamage) || originalDamage < 0) {
            console.error(`❌ Invalid original damage for reduction: ${originalDamage}`);
            return originalDamage;
        }
        
        try {
            // Determine reduction based on hero type
            const isMoniaBot = protectingHero.name === 'MoniaBot';
            const reductionPercent = isMoniaBot ? 
                this.MONIABOT_DAMAGE_REDUCTION / 100 : 
                this.MONIA_DAMAGE_REDUCTION / 100;
            
            const reducedDamage = originalDamage * (1 - reductionPercent);
            const finalDamage = Math.ceil(reducedDamage);
            
            const result = Math.max(1, finalDamage);
            
            if (typeof result !== 'number' || isNaN(result) || result < 1) {
                console.error(`❌ Invalid damage calculation result: ${result}, returning minimum damage`);
                return 1;
            }
            return result;
            
        } catch (error) {
            console.error('❌ Error calculating reduced damage:', error);
            return Math.max(1, originalDamage);
        }
    }

    // ============================================
    // VISUAL EFFECTS (ASYNCHRONOUS, NON-BLOCKING)
    // ============================================

    async executeProtectionEffectAsync(protectingMonia, target, originalDamage, reducedDamage) {
        try {
            const damageReduced = originalDamage - reducedDamage;
            const isMoniaBot = protectingMonia.name === 'MoniaBot';

            if (!target.type) {
                if (target.alive !== undefined && target.maxHp !== undefined && !target.position) {
                    target.type = 'creature';
                } else if (target.position) {
                    target.type = 'hero';
                }
            }
            
            if (target.type === 'creature' && !target.side) {
                const creatureInfo = this.findCreatureInfo(target);
                if (creatureInfo) {
                    target.side = creatureInfo.side;
                    target.position = creatureInfo.position;
                    target.creatureIndex = creatureInfo.creatureIndex;
                }
            }
            
            // Log with appropriate hero name
            const heroDisplayName = isMoniaBot ? 'MoniaBot' : protectingMonia.name;
            this.battleManager.addCombatLog(
                `🛡️ ${heroDisplayName} protects ${target.name}! Damage reduced by ${damageReduced} (${originalDamage} → ${reducedDamage})`,
                protectingMonia.side === 'player' ? 'success' : 'info'
            );

            this.sendProtectionEffectUpdate(protectingMonia, target, originalDamage, reducedDamage);

            await this.battleManager.delay(50);

            // Start flame trail for MoniaBot BEFORE dash animation
            let flameTrail = null;
            if (isMoniaBot) {
                flameTrail = this.createMoniaBotFlameTrail(protectingMonia);
            }

            const dashPromise = this.animateMoniaProtectionDash(protectingMonia, target);
            const shieldPromise = this.createShieldAnimations(protectingMonia, target);
            
            await Promise.all([dashPromise, shieldPromise]);

            // Clean up flame trail after dash completes
            if (flameTrail) {
                this.removeFlameTrail(flameTrail);
            }
            
        } catch (error) {
            console.error('❌ Error in protection effect animation:', error);
        }
    }

    // NEW: Create flame trail for MoniaBot during dash
    createMoniaBotFlameTrail(moniaBot) {
        const moniaElement = this.getHeroElement(moniaBot);
        if (!moniaElement) return null;

        const flameTrail = document.createElement('div');
        flameTrail.className = 'moniabot-flame-trail';
        
        // Create multiple flame particles for the trail
        for (let i = 0; i < 8; i++) {
            const flame = document.createElement('div');
            flame.className = 'flame-particle';
            flame.style.animationDelay = `${i * 50}ms`;
            flame.innerHTML = '🔥';
            flameTrail.appendChild(flame);
        }
        
        moniaElement.appendChild(flameTrail);
        this.activeFlameTrails.add(flameTrail);
        
        return flameTrail;
    }

    // NEW: Remove flame trail with fade effect
    async removeFlameTrail(flameTrail) {
        if (!flameTrail || !flameTrail.parentNode) return;
        
        flameTrail.classList.add('flame-trail-fadeout');
        this.activeFlameTrails.delete(flameTrail);
        
        await this.battleManager.delay(300);
        
        if (flameTrail && flameTrail.parentNode) {
            flameTrail.remove();
        }
    }

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

    getTargetPosition(target) {
        if (target.position) {
            return target.position;
        }
        
        const creatureInfo = this.findCreatureInfo(target);
        if (creatureInfo) {
            return creatureInfo.position;
        }
        
        return null;
    }

    getTargetSide(target) {
        if (target.side) {
            return target.side;
        }
        
        const creatureInfo = this.findCreatureInfo(target);
        if (creatureInfo) {
            return creatureInfo.side;
        }
        
        return null;
    }

    findCreatureInfo(creature) {
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

    getNeighboringPositions(position) {
        switch (position) {
            case 'left':
                return ['center'];
            case 'center':
                return ['left', 'right'];
            case 'right':
                return ['center'];
            default:
                return [];
        }
    }

    // Updated to check for both Monia and MoniaBot
    getMoniaAtPosition(side, position) {
        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[position];
        
        if (hero && hero.alive && (hero.name === 'Monia' || hero.name === 'MoniaBot')) {
            return hero;
        }
        
        return null;
    }

    canMoniaProtect(monia) {
        if (!monia || !monia.alive) {
            return false;
        }
        
        if (this.battleManager.statusEffectsManager) {
            const canAct = this.battleManager.statusEffectsManager.canTakeAction(monia);
            return canAct;
        }
        
        return true;
    }

    async createShieldAnimations(protectingMonia, target) {
        const moniaElement = this.getHeroElement(protectingMonia);
        const targetElement = this.getTargetElement(target);
        
        const shieldPromises = [];
        
        if (moniaElement) {
            const moniaShield = this.createProtectionShield(moniaElement, 'protector');
            if (moniaShield) {
                this.activeShields.add(moniaShield);
                shieldPromises.push(this.removeShieldAfterDuration(moniaShield));
            }
        }
        
        if (targetElement) {
            const targetShield = this.createProtectionShield(targetElement, 'protected');
            if (targetShield) {
                this.activeShields.add(targetShield);
                shieldPromises.push(this.removeShieldAfterDuration(targetShield));
            }
        }
        
        await Promise.all(shieldPromises);
    }

    createProtectionShield(targetElement, shieldType) {
        if (!targetElement) {
            console.warn('Cannot create protection shield: target element not found');
            return null;
        }

        if (!document.body.contains(targetElement)) {
            console.warn('Cannot create protection shield: element not in DOM');
            return null;
        }

        try {
            const shield = document.createElement('div');
            shield.className = `monia-protection-shield ${shieldType}-shield`;
            
            const shieldColor = shieldType === 'protector' ? 
                'rgba(135, 206, 250, 0.9)' :
                'rgba(255, 215, 0, 0.9)';
            
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

    getHeroElement(hero) {
        return this.battleManager.getHeroElement(hero.side, hero.position);
    }

    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
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

    handleGuestProtectionEffect(data) {
        const { protectorData, target, originalDamage, reducedDamage, damageReduced, shieldDuration } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const protectorLocalSide = (protectorData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🛡️ ${protectorData.name} protects ${target.name}! Damage reduced by ${damageReduced} (${originalDamage} → ${reducedDamage})`,
            protectorLocalSide === 'player' ? 'success' : 'info'
        );

        this.createGuestShieldAnimations(protectorData, target, myAbsoluteSide);
    }

    async createGuestShieldAnimations(protectorData, targetData, myAbsoluteSide) {
        const protectorLocalSide = (protectorData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const protectorElement = this.battleManager.getHeroElement(protectorLocalSide, protectorData.position);

        if (!protectorElement) {
            console.warn('Protector element not found on guest side');
            return;
        }

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

        const protectorHero = protectorLocalSide === 'player' ? 
            this.battleManager.playerHeroes[protectorData.position] : 
            this.battleManager.opponentHeroes[protectorData.position];
            
        let targetForAnimation = null;
        if (targetData.type === 'hero') {
            targetForAnimation = targetLocalSide === 'player' ? 
                this.battleManager.playerHeroes[targetData.position] : 
                this.battleManager.opponentHeroes[targetData.position];
        } else {
            const heroes = targetLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[targetData.position];
            if (hero && hero.creatures && hero.creatures[targetData.creatureIndex]) {
                targetForAnimation = hero.creatures[targetData.creatureIndex];
                targetForAnimation.type = 'creature';
                targetForAnimation.side = targetLocalSide;
                targetForAnimation.position = targetData.position;
                targetForAnimation.creatureIndex = targetData.creatureIndex; 
            }
        }

        const animations = [];

        // NEW: Add flame trail for MoniaBot on guest side
        const isMoniaBot = protectorData.name === 'MoniaBot';
        let flameTrail = null;
        if (isMoniaBot) {
            flameTrail = this.createMoniaBotFlameTrail(protectorHero);
        }

        if (protectorHero && targetForAnimation && this.battleManager.animationManager) {
            animations.push(this.battleManager.animationManager.animateMoniaProtectionDash(protectorHero, targetForAnimation));
        }

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

        await Promise.all(animations);

        // Clean up flame trail
        if (flameTrail) {
            this.removeFlameTrail(flameTrail);
        }
        
        this.battleManager.addCombatLog(`🛡️ ${protectorData.name}'s protection fades`, 'info');
    }

    // ============================================
    // CSS STYLES
    // ============================================

    injectMoniaShieldStyles() {
        if (document.getElementById('moniaShieldStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'moniaShieldStyles';
        style.textContent = `
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

    // NEW: Inject flame trail styles for MoniaBot
    injectMoniaBotFlameStyles() {
        if (document.getElementById('moniaBotFlameStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'moniaBotFlameStyles';
        style.textContent = `
            .moniabot-flame-trail {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1400;
            }

            .flame-particle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 24px;
                opacity: 0;
                animation: flameTrail 0.6s ease-out infinite;
            }

            @keyframes flameTrail {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) translateX(-30px) scale(0.3);
                    filter: blur(2px);
                }
            }

            .flame-trail-fadeout {
                animation: flameTrailFadeOut 0.3s ease-out forwards !important;
            }

            @keyframes flameTrailFadeOut {
                0% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // CLEANUP
    // ============================================

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

        // NEW: Clean up flame trails
        this.activeFlameTrails.forEach(trail => {
            try {
                if (trail && trail.parentNode) {
                    trail.remove();
                }
            } catch (error) {
                console.warn('Error removing flame trail during cleanup:', error);
            }
        });
        
        this.activeFlameTrails.clear();

        try {
            const orphanedShields = document.querySelectorAll('.monia-protection-shield');
            orphanedShields.forEach(shield => {
                if (shield.parentNode) {
                    shield.remove();
                }
            });

            const orphanedTrails = document.querySelectorAll('.moniabot-flame-trail');
            orphanedTrails.forEach(trail => {
                if (trail.parentNode) {
                    trail.remove();
                }
            });
        } catch (error) {
            console.warn('Error cleaning up orphaned elements:', error);
        }
    }
}