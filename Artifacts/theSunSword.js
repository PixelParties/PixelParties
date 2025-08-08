// theSunSword.js - The Sun Sword Artifact
// Resists Frozen status and inflicts Burn on attacks

export class TheSunSwordEffect {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.name = 'TheSunSword';
        
        console.log('☀️ TheSunSword effect initialized');
    }
    
    // Count how many Sun Swords the hero has equipped
    countSunSwords(hero) {
        if (!hero || !hero.equipment || hero.equipment.length === 0) {
            return 0;
        }
        
        return hero.equipment.filter(equip => {
            const equipName = equip.name || equip.cardName;
            return equipName === 'TheSunSword';
        }).length;
    }
    
    // Check if frozen should be resisted (25% chance per sword)
    checkFrozenResistance(target) {
        // Only heroes can have equipment
        if (!target || target.type === 'creature' || !target.equipment) {
            return false;
        }
        
        const swordCount = this.countSunSwords(target);
        if (swordCount === 0) return false;
        
        // Each sword gets an independent 25% chance to resist
        for (let i = 0; i < swordCount; i++) {
            const roll = this.battleManager.getRandom();
            if (roll < 0.25) {
                console.log(`☀️ TheSunSword resists frozen! (Sword ${i + 1} rolled ${roll.toFixed(3)})`);
                return true; // Any successful resistance prevents the frozen
            }
        }
        
        return false;
    }
    
    // Process burn application on attack hit
    processBurnOnHit(attacker, defender) {
        if (!attacker || !attacker.alive || !defender) return;
        
        const swordCount = this.countSunSwords(attacker);
        if (swordCount === 0) return;
        
        let burnsApplied = 0;
        
        // Each sword gets an independent 50% chance to apply burn
        for (let i = 0; i < swordCount; i++) {
            const roll = this.battleManager.getRandom();
            if (roll < 0.50) {
                burnsApplied++;
                console.log(`☀️ TheSunSword ${i + 1} triggers burn! (rolled ${roll.toFixed(3)})`);
            }
        }
        
        // Apply all burn stacks at once if any triggered
        if (burnsApplied > 0) {
            if (this.battleManager.statusEffectsManager) {
                this.battleManager.statusEffectsManager.applyStatusEffect(defender, 'burned', burnsApplied);
            }
            
            // Create visual effect
            this.createSunBurstEffect(defender, burnsApplied);
            
            // Add combat log
            const stackText = burnsApplied > 1 ? `${burnsApplied} stacks of burn` : '1 stack of burn';
            this.battleManager.addCombatLog(
                `☀️ ${attacker.name}'s Sun Sword inflicts ${stackText} on ${defender.name}!`,
                'info'
            );
            
            // Sync to guest if host
            if (this.battleManager.isAuthoritative) {
                this.battleManager.sendBattleUpdate('sun_sword_burn', {
                    attackerAbsoluteSide: attacker.absoluteSide,
                    attackerPosition: attacker.position,
                    defenderInfo: this.getDefenderSyncInfo(defender),
                    burnsApplied: burnsApplied,
                    timestamp: Date.now()
                });
            }
        }
    }
    
    // Create sun burst visual effect
    createSunBurstEffect(target, stackCount) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;
        
        // Create sun burst container
        const sunBurst = document.createElement('div');
        sunBurst.className = 'sun-sword-burst';
        
        // Create sun rays
        const rayCount = 6 + stackCount * 2; // More rays for more stacks
        for (let i = 0; i < rayCount; i++) {
            const ray = document.createElement('div');
            ray.className = 'sun-ray';
            ray.innerHTML = '☀️';
            
            const angle = (360 / rayCount) * i;
            const distance = 40 + this.battleManager.getRandomFloat(0, 20); // Use deterministic randomness
            
            ray.style.cssText = `
                position: absolute;
                font-size: ${20 + stackCount * 4}px;
                animation: sunRayBurst ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 500;
                filter: drop-shadow(0 0 8px rgba(255, 200, 0, 0.9));
            `;
            
            sunBurst.appendChild(ray);
        }
        
        // Position burst at target center
        sunBurst.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 500;
        `;
        
        targetElement.appendChild(sunBurst);
        
        // Add burning overlay effect
        const burnOverlay = document.createElement('div');
        burnOverlay.className = 'sun-sword-overlay';
        burnOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(255, 150, 0, 0.5) 0%, transparent 70%);
            pointer-events: none;
            z-index: 490;
            animation: sunSwordPulse ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
        `;
        
        targetElement.appendChild(burnOverlay);
        
        // Clean up after animation
        setTimeout(() => {
            if (sunBurst.parentNode) sunBurst.remove();
            if (burnOverlay.parentNode) burnOverlay.remove();
        }, this.battleManager.getSpeedAdjustedDelay(800));
    }
    
    // Create frozen resistance visual effect
    createFrozenResistanceEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;
        
        // Create sun shield effect
        const sunShield = document.createElement('div');
        sunShield.className = 'sun-shield-effect';
        sunShield.innerHTML = '☀️🛡️';
        
        sunShield.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 600;
            pointer-events: none;
            animation: sunShieldPulse ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
            filter: drop-shadow(0 0 15px rgba(255, 200, 0, 1));
        `;
        
        targetElement.appendChild(sunShield);
        
        // Clean up after animation
        setTimeout(() => {
            if (sunShield.parentNode) sunShield.remove();
        }, this.battleManager.getSpeedAdjustedDelay(1000));
    }
    
    // Get target element
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
    
    // Find creature information
    findCreatureInfo(creature) {
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            
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
    
    // Get defender sync info
    getDefenderSyncInfo(defender) {
        if (defender.type === 'hero' || !defender.type) {
            return {
                type: 'hero',
                absoluteSide: defender.absoluteSide,
                position: defender.position,
                name: defender.name
            };
        } else {
            const creatureInfo = this.findCreatureInfo(defender);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                absoluteSide: creatureInfo.hero.absoluteSide,
                position: creatureInfo.position,
                creatureIndex: creatureInfo.creatureIndex,
                name: defender.name
            };
        }
    }
    
    // Handle guest update for sun sword burn
    handleGuestSunSwordBurn(data) {
        const { defenderInfo, burnsApplied } = data;
        
        // Find the defender
        const defender = this.findDefenderFromSyncInfo(defenderInfo);
        if (!defender) return;
        
        // Create the visual effect
        this.createSunBurstEffect(defender, burnsApplied);
    }
    
    // Handle guest update for frozen resistance
    handleGuestFrozenResistance(data) {
        const { targetInfo } = data;
        
        // Find the target
        const target = this.findDefenderFromSyncInfo(targetInfo);
        if (!target) return;
        
        // Create the visual effect
        this.createFrozenResistanceEffect(target);
    }
    
    // Find defender from sync info
    findDefenderFromSyncInfo(defenderInfo) {
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (defenderInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (defenderInfo.type === 'hero') {
            const heroes = localSide === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            return heroes[defenderInfo.position];
        } else {
            const heroes = localSide === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            const hero = heroes[defenderInfo.position];
            return hero?.creatures?.[defenderInfo.creatureIndex];
        }
    }
    
    // Ensure CSS for sun sword effects
    ensureSunSwordCSS() {
        if (document.getElementById('sunSwordCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'sunSwordCSS';
        style.textContent = `
            @keyframes sunRayBurst {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(0deg) scale(0);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(60deg) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: 
                        translate(
                            calc(-50% + var(--distance) * cos(var(--angle))), 
                            calc(-50% + var(--distance) * sin(var(--angle)))
                        ) 
                        rotate(120deg) 
                        scale(0.5);
                }
            }
            
            @keyframes sunSwordPulse {
                0% {
                    opacity: 0;
                    transform: scale(0.8);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.1);
                }
                100% {
                    opacity: 0;
                    transform: scale(1);
                }
            }
            
            @keyframes sunShieldPulse {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
                }
                70% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1) rotate(360deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8) rotate(360deg);
                }
            }
            
            .sun-sword-burst {
                will-change: transform, opacity;
            }
            
            .sun-ray {
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: center;
                will-change: transform, opacity;
            }
            
            .sun-sword-overlay {
                will-change: transform, opacity;
                mix-blend-mode: screen;
            }
            
            .sun-shield-effect {
                will-change: transform, opacity;
                text-shadow: 
                    0 0 20px rgba(255, 200, 0, 1),
                    0 0 40px rgba(255, 150, 0, 0.8);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Cleanup
    cleanup() {
        const css = document.getElementById('sunSwordCSS');
        if (css) css.remove();
        
        console.log('☀️ TheSunSword effect cleaned up');
    }
}

// Integration function for the attack effects manager

// Register TheSunSword with AttackEffectsManager
export function registerTheSunSword(attackEffectsManager, battleManager) {
    const sunSwordEffect = new TheSunSwordEffect(battleManager);
    
    // Ensure CSS is loaded
    sunSwordEffect.ensureSunSwordCSS();
    
    // Register the burn-on-hit handler
    attackEffectsManager.registerEffectHandler('TheSunSword', {
        trigger: 'on_attack_hit',
        handler: async (attacker, defender, damage, equipmentItem) => {
            sunSwordEffect.processBurnOnHit(attacker, defender);
        }
    });
    
    // Store reference for frozen resistance checks
    attackEffectsManager.sunSwordEffect = sunSwordEffect;
    
    console.log('☀️ TheSunSword registered with AttackEffectsManager');
    
    return sunSwordEffect;
}

// Export for use in the game
export default TheSunSwordEffect;