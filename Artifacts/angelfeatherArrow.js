// angelfeatherArrow.js - Angelfeather Arrow Artifact
// Provides powerful arrow counters with +100 damage and a divine slash effect

/**
 * Apply Angelfeather Arrow integration to the Arrow System
 * @param {ArrowSystem} arrowSystem - The arrow system to integrate with
 * @param {BattleManager} battleManager - The battle manager instance
 */
export function applyAngelfeatherArrowIntegration(arrowSystem, battleManager) {
    // Register Angelfeather Arrow with the arrow system
    arrowSystem.registerArrowType({
        name: 'AngelfeatherArrow',
        displayName: 'Angelfeather Arrow',
        icon: '👼🏹',
        damageBonus: 100,
        statusEffects: [], // Pure damage, no status effects
        counterDisplay: {
            background: 'linear-gradient(45deg, #ffffff, #fffacd)',
            borderColor: '#ffd700',
            shadowColor: 'rgba(255, 215, 0, 0.8)'
        },
        syncMessageType: 'angelfeather_arrow_impact',
        impactEffect: createAngelfeatherArrowImpact.bind(null, battleManager)
    });

    console.log('👼🏹 Angelfeather Arrow integrated with Arrow System');
}

/**
 * Create divine slash impact effect for Angelfeather Arrow
 * @param {BattleManager} battleManager - Battle manager for timing and utilities
 * @param {Object} target - The target that was hit
 * @param {Object} arrowConfig - Arrow configuration
 */
function createAngelfeatherArrowImpact(battleManager, target, arrowConfig) {
    const targetElement = getTargetElement(target, battleManager);
    if (!targetElement) return;

    // Create divine slash container
    const divineSlash = document.createElement('div');
    divineSlash.className = 'angelfeather-arrow-slash';
    
    // Create the slash line effect
    const slashLine = document.createElement('div');
    slashLine.className = 'divine-slash-line';
    slashLine.style.cssText = `
        position: absolute;
        top: 50%;
        left: -20%;
        right: -20%;
        height: 3px;
        background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(255, 255, 255, 0.9) 20%, 
            rgba(255, 215, 0, 1) 50%, 
            rgba(255, 255, 255, 0.9) 80%, 
            transparent 100%);
        transform: translateY(-50%) rotate(-15deg);
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
        animation: divineSlashMove ${battleManager.getSpeedAdjustedDelay(200)}ms ease-out forwards;
        z-index: 510;
    `;
    
    // Create sparkle effects
    const sparkleCount = 6;
    for (let i = 0; i < sparkleCount; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'divine-sparkle';
        sparkle.innerHTML = '✨';
        
        const angle = (360 / sparkleCount) * i + (Math.random() * 45 - 22.5);
        const distance = 15 + Math.random() * 10;
        
        sparkle.style.cssText = `
            position: absolute;
            font-size: ${12 + Math.random() * 6}px;
            animation: divineSparkleFloat ${battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
            --angle: ${angle}deg;
            --distance: ${distance}px;
            z-index: 515;
        `;
        
        divineSlash.appendChild(sparkle);
    }
    
    divineSlash.appendChild(slashLine);
    
    // Position effect at target center
    divineSlash.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 510;
    `;
    
    targetElement.appendChild(divineSlash);
    
    // Add divine glow overlay
    const divineGlow = document.createElement('div');
    divineGlow.className = 'angelfeather-arrow-glow';
    divineGlow.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 60%);
        pointer-events: none;
        z-index: 500;
        animation: divineGlowPulse ${battleManager.getSpeedAdjustedDelay(400)}ms ease-out forwards;
    `;
    
    targetElement.appendChild(divineGlow);
    
    // Clean up after animation
    setTimeout(() => {
        if (divineSlash.parentNode) divineSlash.remove();
        if (divineGlow.parentNode) divineGlow.remove();
    }, battleManager.getSpeedAdjustedDelay(600));
}

/**
 * Get target element for visual effects
 * @param {Object} target - The target object
 * @param {BattleManager} battleManager - Battle manager instance
 * @returns {Element|null} Target DOM element
 */
function getTargetElement(target, battleManager) {
    if (target.type === 'hero' || !target.type) {
        return battleManager.getHeroElement(target.side, target.position);
    } else {
        const creatureInfo = findCreatureInfo(target, battleManager);
        if (!creatureInfo) return null;
        
        const { side, position, creatureIndex } = creatureInfo;
        return document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }
}

/**
 * Find creature information for targeting
 * @param {Object} creature - The creature object
 * @param {BattleManager} battleManager - Battle manager instance
 * @returns {Object|null} Creature info object
 */
function findCreatureInfo(creature, battleManager) {
    for (const side of ['player', 'opponent']) {
        const heroes = side === 'player' ? 
            battleManager.playerHeroes : 
            battleManager.opponentHeroes;
        
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

// Ensure CSS for angelfeather arrow effects
export function ensureAngelfeatherArrowCSS() {
    if (document.getElementById('angelfeatherArrowCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'angelfeatherArrowCSS';
    style.textContent = `
        @keyframes divineSlashMove {
            0% {
                transform: translateY(-50%) rotate(-15deg) scaleX(0);
                opacity: 0;
            }
            30% {
                transform: translateY(-50%) rotate(-15deg) scaleX(1.2);
                opacity: 1;
            }
            100% {
                transform: translateY(-50%) rotate(-15deg) scaleX(1);
                opacity: 0;
            }
        }
        
        @keyframes divineSparkleFloat {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) rotate(0deg) scale(0);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(180deg) scale(1.2);
            }
            100% {
                opacity: 0;
                transform: 
                    translate(
                        calc(-50% + var(--distance) * cos(var(--angle))), 
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) 
                    rotate(360deg) 
                    scale(0.5);
            }
        }
        
        @keyframes divineGlowPulse {
            0% {
                opacity: 0;
                transform: scale(0.8);
            }
            50% {
                opacity: 0.8;
                transform: scale(1.1);
            }
            100% {
                opacity: 0;
                transform: scale(1);
            }
        }
        
        .angelfeather-arrow-slash {
            will-change: transform, opacity;
        }
        
        .divine-slash-line {
            will-change: transform, opacity;
        }
        
        .divine-sparkle {
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center;
            will-change: transform, opacity;
            filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.8));
        }
        
        .angelfeather-arrow-glow {
            will-change: transform, opacity;
            mix-blend-mode: screen;
        }
    `;
    
    document.head.appendChild(style);
}

// Auto-inject CSS when module loads
if (typeof document !== 'undefined') {
    ensureAngelfeatherArrowCSS();
}