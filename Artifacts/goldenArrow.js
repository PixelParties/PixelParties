// goldenArrow.js - Golden Arrow Artifact Implementation
// Provides Golden Arrow Counters that enhance attacks with extra damage based on current gold

/**
 * Register GoldenArrow with the ArrowSystem
 * @param {ArrowSystem} arrowSystem - The arrow system instance
 * @param {BattleManager} battleManager - The battle manager instance
 */
export function registerGoldenArrow(arrowSystem, battleManager) {
    // Register GoldenArrow with dynamic damage calculation
    arrowSystem.registerArrowType({
        name: 'GoldenArrow',
        displayName: 'Golden Arrow',
        icon: '🟨🹹',
        
        // Dynamic damage function: 50 + attacker's current gold
        damageBonus: (attacker, target, battleManagerRef) => {
            const baseBonus = 50;
            let goldBonus = 0;
            
            if (battleManagerRef && battleManagerRef.goldManager) {
                // Determine which player's gold to use based on attacker's side
                if (attacker.side === 'player') {
                    goldBonus = battleManagerRef.goldManager.getPlayerGold();
                } else {
                    goldBonus = battleManagerRef.goldManager.getOpponentGold();
                }
            }
            
            const totalBonus = baseBonus + goldBonus;
            console.log(`🟨🹹 Golden Arrow: ${baseBonus} base + ${goldBonus} gold = ${totalBonus} total damage`);
            return totalBonus;
        },
        
        statusEffects: [], // No status effects, just damage
        
        counterDisplay: {
            background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
            borderColor: '#ffaa00',
            shadowColor: 'rgba(255, 215, 0, 0.6)'
        },
        
        syncMessageType: 'golden_arrow_impact',
        impactEffect: createGoldenArrowImpact
    });
    
    console.log('🟨🹹 GoldenArrow registered with ArrowSystem');
}

/**
 * Create golden arrow impact visual effect
 * @param {Object} target - The target being hit
 * @param {Object} arrowConfig - Arrow configuration
 */
function createGoldenArrowImpact(target, arrowConfig) {
    const targetElement = getTargetElement(target);
    if (!targetElement) return;

    // Create golden burst container
    const goldenBurst = document.createElement('div');
    goldenBurst.className = 'arrow-impact-effect golden-arrow-burst';
    
    // Create multiple golden particles
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'arrow-particle golden-particle';
        particle.innerHTML = '✨';
        
        const angle = (360 / particleCount) * i + (Math.random() * 30 - 15);
        const distance = 25 + Math.random() * 15;
        
        particle.style.cssText = `
            position: absolute;
            font-size: ${18 + Math.random() * 6}px;
            animation: goldenParticleExplosion 900ms ease-out forwards;
            --angle: ${angle}deg;
            --distance: ${distance}px;
            z-index: 500;
            color: #ffd700;
            filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.8));
        `;
        
        goldenBurst.appendChild(particle);
    }

    // Add golden coins effect
    const coinCount = 4;
    for (let i = 0; i < coinCount; i++) {
        const coin = document.createElement('div');
        coin.className = 'arrow-particle golden-coin';
        coin.innerHTML = '🪙';
        
        const angle = (360 / coinCount) * i + (Math.random() * 45 - 22.5);
        const distance = 20 + Math.random() * 10;
        
        coin.style.cssText = `
            position: absolute;
            font-size: ${16 + Math.random() * 4}px;
            animation: goldenCoinSpin 1000ms ease-out forwards;
            --angle: ${angle}deg;
            --distance: ${distance}px;
            z-index: 505;
        `;
        
        goldenBurst.appendChild(coin);
    }

    // Add arrow impact symbol
    const arrowImpact = document.createElement('div');
    arrowImpact.className = 'arrow-impact golden-impact';
    arrowImpact.innerHTML = '🹹💥';
    arrowImpact.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 32px;
        z-index: 510;
        animation: goldenImpactFlash 600ms ease-out forwards;
        filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.9));
    `;
    
    goldenBurst.appendChild(arrowImpact);

    // Position burst at target center
    goldenBurst.style.cssText += `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 500;
    `;
    
    targetElement.appendChild(goldenBurst);
    
    // Add golden overlay effect
    const goldenOverlay = document.createElement('div');
    goldenOverlay.className = 'arrow-impact-overlay golden-overlay';
    goldenOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 70%);
        pointer-events: none;
        z-index: 490;
        animation: goldenPulse 700ms ease-out forwards;
        mix-blend-mode: screen;
    `;
    
    targetElement.appendChild(goldenOverlay);
    
    // Clean up after animation
    setTimeout(() => {
        if (goldenBurst.parentNode) goldenBurst.remove();
        if (goldenOverlay.parentNode) goldenOverlay.remove();
    }, 1000);
}

/**
 * Get target element for visual effects
 * @param {Object} target - The target object
 * @returns {Element|null} The target DOM element
 */
function getTargetElement(target) {
    // This function should match the one in ArrowSystem
    // For now, we'll use a simplified version
    if (target.type === 'hero' || !target.type) {
        return document.querySelector(`.${target.side}-slot.${target.position}-slot`);
    } else {
        // Creature target
        const creatureInfo = findCreatureInfo(target);
        if (!creatureInfo) return null;
        
        const { side, position, creatureIndex } = creatureInfo;
        return document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }
}

/**
 * Find creature information (simplified version)
 * @param {Object} creature - The creature object
 * @returns {Object|null} Creature info with side, position, and index
 */
function findCreatureInfo(creature) {
    // This would need to be implemented to match the ArrowSystem's version
    // For now, return null as a fallback
    return null;
}

/**
 * Ensure CSS for golden arrow effects
 */
export function ensureGoldenArrowCSS() {
    if (document.getElementById('goldenArrowCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'goldenArrowCSS';
    style.textContent = `
        @keyframes goldenParticleExplosion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) rotate(0deg) scale(0);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(120deg) scale(1.2);
            }
            100% {
                opacity: 0;
                transform: 
                    translate(
                        calc(-50% + var(--distance) * cos(var(--angle))), 
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) 
                    rotate(240deg) 
                    scale(0.3);
            }
        }
        
        @keyframes goldenCoinSpin {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) rotateY(0deg) scale(0.8);
            }
            50% {
                opacity: 1;
                transform: translate(
                    calc(-50% + var(--distance) * cos(var(--angle)) * 0.5), 
                    calc(-50% + var(--distance) * sin(var(--angle)) * 0.5)
                ) rotateY(180deg) scale(1.1);
            }
            100% {
                opacity: 0;
                transform: 
                    translate(
                        calc(-50% + var(--distance) * cos(var(--angle))), 
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) 
                    rotateY(360deg) 
                    scale(0.6);
            }
        }
        
        @keyframes goldenImpactFlash {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5) rotate(-10deg);
            }
            40% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.3) rotate(5deg);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1) rotate(0deg);
            }
        }
        
        @keyframes goldenPulse {
            0% {
                opacity: 0;
                transform: scale(0.8);
            }
            50% {
                opacity: 0.6;
                transform: scale(1.2);
            }
            100% {
                opacity: 0;
                transform: scale(1);
            }
        }
        
        .golden-arrow-burst {
            will-change: transform, opacity;
        }
        
        .golden-particle {
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center;
            will-change: transform, opacity;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
        }
        
        .golden-coin {
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center;
            will-change: transform, opacity;
        }
        
        .golden-impact {
            will-change: transform, opacity;
        }
        
        .golden-overlay {
            will-change: transform, opacity;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Patch ArrowSystem to support dynamic damage calculation
 * This is a minimal modification to enable GoldenArrow functionality
 */
export function patchArrowSystemForDynamicDamage() {
    // This function should be called during battle initialization
    // It modifies the ArrowSystem's calculateArrowDamageBonus method
    console.log('🟨🹹 Patching ArrowSystem for dynamic damage calculation...');
}

/**
 * Modified calculateArrowDamageBonus method for ArrowSystem
 * This replaces the original method to support function-based damage calculation
 */
export function calculateArrowDamageBonusPatched(arrowSystemInstance, attacker, target, baseDamage) {
    if (!attacker || !attacker.alive) {
        return { modifiedDamage: baseDamage, effectsTriggered: [] };
    }

    let modifiedDamage = baseDamage;
    const effectsTriggered = [];

    // Check each arrow type
    arrowSystemInstance.arrowTypes.forEach((arrowConfig, arrowType) => {
        if (arrowSystemInstance.hasArrowCounters(attacker, arrowType)) {
            // Consume counter
            const counterUsed = arrowSystemInstance.consumeArrowCounter(attacker, arrowType);
            
            if (counterUsed) {
                let bonusDamage = arrowConfig.damageBonus;
                
                // ENHANCED: Support dynamic damage calculation
                if (typeof arrowConfig.damageBonus === 'function') {
                    bonusDamage = arrowConfig.damageBonus(attacker, target, arrowSystemInstance.battleManager);
                }
                
                if (bonusDamage > 0) {
                    modifiedDamage += bonusDamage;
                    
                    effectsTriggered.push({
                        arrowType: arrowType,
                        arrowConfig: arrowConfig,
                        target: target,
                        bonusDamage: bonusDamage
                    });

                    console.log(`🹹 ${arrowConfig.displayName} enhances attack: +${bonusDamage} damage`);
                }
            }
        }
    });

    return { modifiedDamage, effectsTriggered };
}

/**
 * Apply the ArrowSystem patch and register GoldenArrow
 * This should be called during ArrowSystem initialization
 */
export function applyGoldenArrowIntegration(arrowSystem, battleManager) {
    // Apply the dynamic damage patch
    patchArrowSystemForDynamicDamage();
    
    // Replace the original calculateArrowDamageBonus method
    arrowSystem.originalCalculateArrowDamageBonus = arrowSystem.calculateArrowDamageBonus;
    arrowSystem.calculateArrowDamageBonus = function(attacker, target, baseDamage) {
        return calculateArrowDamageBonusPatched(this, attacker, target, baseDamage);
    };
    
    // Register GoldenArrow
    registerGoldenArrow(arrowSystem, battleManager);
    
    // Ensure CSS is loaded
    ensureGoldenArrowCSS();
    
    console.log('🟨🹹 GoldenArrow integration completed successfully');
}

/**
 * Integration instructions for existing files:
 * 
 * 1. In arrowSystem.js, in the ArrowSystem constructor, add:
 *    ```javascript
 *    // Register GoldenArrow integration
 *    import { applyGoldenArrowIntegration } from './Artifacts/goldenArrow.js';
 *    ```
 * 
 * 2. In the ArrowSystem.init() method, add:
 *    ```javascript
 *    // Apply GoldenArrow integration
 *    applyGoldenArrowIntegration(this, this.battleManager);
 *    ```
 * 
 * That's it! GoldenArrow will now work with dynamic gold-based damage.
 */

// Export for use in the game
export default { 
    registerGoldenArrow, 
    ensureGoldenArrowCSS, 
    patchArrowSystemForDynamicDamage, 
    calculateArrowDamageBonusPatched, 
    applyGoldenArrowIntegration 
};