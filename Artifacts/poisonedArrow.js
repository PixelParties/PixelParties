// poisonedArrow.js - Poisoned Arrow Integration for Arrow System
// Provides 50 damage bonus and 1 stack of poisoned on hit with sickly green animation

/**
 * Apply PoisonedArrow integration to the Arrow System
 * @param {ArrowSystem} arrowSystem - The arrow system instance
 * @param {BattleManager} battleManager - The battle manager instance
 */
export function applyPoisonedArrowIntegration(arrowSystem, battleManager) {
    // Register PoisonedArrow with the arrow system
    arrowSystem.registerArrowType({
        name: 'PoisonedArrow',
        displayName: 'Poisoned Arrow',
        icon: '☠️🏹',
        damageBonus: 50,  // Same as FlameArrow
        statusEffects: [{ type: 'poisoned', stacks: 1 }],  // 1 stack of poisoned
        counterDisplay: {
            background: 'linear-gradient(45deg, #228B22, #32CD32)',  // Sickly green gradient
            borderColor: '#90EE90',  // Light green border
            shadowColor: 'rgba(34, 139, 34, 0.6)'  // Green shadow
        },
        syncMessageType: 'poisoned_arrow_impact',
        impactEffect: createPoisonedArrowImpact
    });

    /**
     * Create sickly green poison impact effect for PoisonedArrow
     * @param {Object} target - The target being hit
     * @param {Object} arrowConfig - Arrow configuration
     */
    function createPoisonedArrowImpact(target, arrowConfig) {
        const targetElement = arrowSystem.getTargetElement(target);
        if (!targetElement) return;

        // Create poison burst container
        const poisonBurst = document.createElement('div');
        poisonBurst.className = 'poisoned-arrow-burst';
        
        // Create multiple poison cloud particles with sickly green color
        const cloudCount = 6;
        for (let i = 0; i < cloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'poison-cloud-particle';
            cloud.innerHTML = '☠️';
            
            const angle = (360 / cloudCount) * i + (Math.random() * 40 - 20);
            const distance = 20 + Math.random() * 15;
            
            cloud.style.cssText = `
                position: absolute;
                font-size: ${16 + Math.random() * 8}px;
                animation: poisonCloudExplosion ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 500;
                filter: hue-rotate(120deg) brightness(0.8) saturate(1.5);
            `;
            
            poisonBurst.appendChild(cloud);
        }

        // Add arrow impact symbol
        const arrowImpact = document.createElement('div');
        arrowImpact.className = 'poisoned-arrow-impact';
        arrowImpact.innerHTML = '🏹💀';
        arrowImpact.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 28px;
            z-index: 510;
            animation: poisonedArrowImpactFlash ${battleManager.getSpeedAdjustedDelay(700)}ms ease-out forwards;
        `;
        
        poisonBurst.appendChild(arrowImpact);
        
        // Position burst at target center
        poisonBurst.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 500;
        `;
        
        targetElement.appendChild(poisonBurst);
        
        // Add sickly green poison overlay effect
        const poisonOverlay = document.createElement('div');
        poisonOverlay.className = 'poisoned-arrow-overlay';
        poisonOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(34, 139, 34, 0.4) 0%, rgba(50, 205, 50, 0.2) 50%, transparent 70%);
            pointer-events: none;
            z-index: 490;
            animation: poisonedArrowPulse ${battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
        `;
        
        targetElement.appendChild(poisonOverlay);
        
        // Clean up after animation
        setTimeout(() => {
            if (poisonBurst.parentNode) poisonBurst.remove();
            if (poisonOverlay.parentNode) poisonOverlay.remove();
        }, battleManager.getSpeedAdjustedDelay(1000));
    }

    // Ensure CSS for poisoned arrow effects
    ensurePoisonedArrowCSS(battleManager);
    
    console.log('☠️🏹 PoisonedArrow integrated with ArrowSystem');
}

/**
 * Ensure CSS for poisoned arrow effects exists
 * @param {BattleManager} battleManager - Battle manager instance
 */
function ensurePoisonedArrowCSS(battleManager) {
    if (document.getElementById('poisonedArrowCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'poisonedArrowCSS';
    style.textContent = `
        @keyframes poisonCloudExplosion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) rotate(0deg) scale(0);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(180deg) scale(1.3);
            }
            100% {
                opacity: 0;
                transform: 
                    translate(
                        calc(-50% + var(--distance) * cos(var(--angle))), 
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) 
                    rotate(360deg) 
                    scale(0.4);
            }
        }
        
        @keyframes poisonedArrowImpactFlash {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5) rotate(-15deg);
            }
            40% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2) rotate(5deg);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1) rotate(0deg);
            }
        }
        
        @keyframes poisonedArrowPulse {
            0% {
                opacity: 0;
                transform: scale(0.7);
            }
            50% {
                opacity: 0.8;
                transform: scale(1.3);
            }
            100% {
                opacity: 0;
                transform: scale(1);
            }
        }
        
        .poisoned-arrow-burst {
            will-change: transform, opacity;
        }
        
        .poison-cloud-particle {
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center;
            will-change: transform, opacity;
            filter: drop-shadow(0 0 8px rgba(34, 139, 34, 0.8));
        }
        
        .poisoned-arrow-impact {
            will-change: transform, opacity;
            filter: drop-shadow(0 0 10px rgba(50, 205, 50, 0.9));
        }
        
        .poisoned-arrow-overlay {
            will-change: transform, opacity;
            mix-blend-mode: multiply;
        }
    `;
    
    document.head.appendChild(style);
}

// Export for use in the game
export default { applyPoisonedArrowIntegration };