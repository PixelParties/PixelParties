// theHandsOfBigGwen.js - The Hands of Big Gwen Equipment Artifact

/**
 * The Hands of Big Gwen
 * Type: Artifact - Equip
 * Effect: When the equipped hero kills a target,
 *         there is a 20% chance to immediately take an additional action.
 *         Multiple copies roll independently, but only 1 additional action max per kill.
 */

export const theHandsOfBigGwenArtifact = {
    name: 'TheHandsOfBigGwen',
    displayName: 'The Hands of Big Gwen',
    type: 'Artifact',
    subtype: 'Equip',
    cost: 6, // High cost for powerful effect
    
    // This is an equip artifact, so it doesn't have a click handler
    // The effect is handled by the kill tracking system
    handleClick: null,
    
    // Metadata for the effect
    effectData: {
        trigger: 'on_kill',
        chance: 0.20,
        effect: 'additional_action',
        description: '20% chance to take additional action on kill'
    },
    
    // Get formatted description for tooltips
    getDescription() {
        return `When equipped hero kills a target, 20% chance to immediately take an additional action. Multiple hands roll independently, but only 1 additional action max per kill.`;
    },
    
    // Visual effect data
    visualEffect: {
        icon: '👐',
        color: '#ff6b6b',
        animation: 'hands_glow'
    }
};

/**
 * Check and apply The Hands of Big Gwen effect on kill
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} attacker - The hero who made the kill
 * @param {Object} victim - The target that was killed
 * @param {string} victimType - 'hero' or 'creature'
 */
export async function checkTheHandsOfBigGwenOnKill(battleManager, attacker, victim, victimType) {
    if (!battleManager.isAuthoritative) return;
    if (!attacker || attacker.type === 'creature') return; // Only heroes can have equipment
    
    // Get attacker's equipment
    const attackerEquipment = attacker.equipment || [];
    
    // Count TheHandsOfBigGwen artifacts
    const handsOfBigGwenCount = attackerEquipment.filter(item => 
        item.name === 'TheHandsOfBigGwen' || item.cardName === 'TheHandsOfBigGwen'
    ).length;
    
    if (handsOfBigGwenCount === 0) return;
    
    // Roll for each copy independently
    let anyTriggered = false;
    let triggeredCount = 0;
    
    for (let i = 0; i < handsOfBigGwenCount; i++) {
        const roll = battleManager.getRandom();
        if (roll < 0.20) {
            anyTriggered = true;
            triggeredCount++;
        }
    }
    
    if (anyTriggered) {
        // Add combat log showing how many triggered
        const triggerMessage = handsOfBigGwenCount === 1 
            ? `👐 The Hands of Big Gwen activate!`
            : `👐 The Hands of Big Gwen activate! (${triggeredCount}/${handsOfBigGwenCount} triggered)`;
            
        battleManager.addCombatLog(
            `${triggerMessage} ${attacker.name} takes an additional action!`,
            attacker.side === 'player' ? 'success' : 'error'
        );
        
        // Create visual effect
        createBigGwenVisualEffect(attacker, battleManager);
        
        // Grant additional action using existing system (max 1 per kill)
        await grantBigGwenAdditionalAction(battleManager, attacker);
    }
}

/**
 * Grant additional action to hero
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} hero - The hero to grant additional action to
 */
async function grantBigGwenAdditionalAction(battleManager, hero) {
    // Use existing additional action system
    if (battleManager.combatManager) {
        await battleManager.combatManager.executeAdditionalAction(hero, hero.position);
    }
}

/**
 * Create visual effect for The Hands of Big Gwen activation
 * @param {Object} hero - The hero to show effect on
 * @param {Object} battleManager - The battle manager instance
 */
function createBigGwenVisualEffect(hero, battleManager) {
    const heroElement = battleManager.getHeroElement(hero.side, hero.position);
    if (!heroElement) return;
    
    // Create hands glow effect
    const handsEffect = document.createElement('div');
    handsEffect.className = 'big-gwen-hands-effect';
    handsEffect.innerHTML = '👐✨';
    
    handsEffect.style.cssText = `
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 32px;
        z-index: 1000;
        pointer-events: none;
        animation: bigGwenHandsGlow 2s ease-out forwards;
        text-shadow: 
            0 0 20px #ff6b6b,
            0 0 40px #ff3333,
            0 0 60px #ffffff;
    `;
    
    heroElement.appendChild(handsEffect);
    
    // Create additional hand particles for extra flair
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.innerHTML = '👐';
            particle.style.cssText = `
                position: absolute;
                top: ${-10 + (Math.random() * 20)}px;
                left: ${40 + (Math.random() * 20)}%;
                font-size: ${16 + (Math.random() * 8)}px;
                z-index: 999;
                pointer-events: none;
                opacity: 0.7;
                animation: bigGwenParticleFloat 1.5s ease-out forwards;
            `;
            
            heroElement.appendChild(particle);
            
            setTimeout(() => {
                if (particle && particle.parentNode) {
                    particle.remove();
                }
            }, 1500);
        }, i * 200);
    }
    
    // Clean up main effect
    setTimeout(() => {
        if (handsEffect && handsEffect.parentNode) {
            handsEffect.remove();
        }
    }, 2000);
}

// Inject CSS animations for the visual effects
function injectBigGwenStyles() {
    if (document.getElementById('bigGwenHandsStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'bigGwenHandsStyles';
    style.textContent = `
        @keyframes bigGwenHandsGlow {
            0% {
                opacity: 0;
                transform: translateX(-50%) scale(0.5);
            }
            50% {
                opacity: 1;
                transform: translateX(-50%) scale(1.2);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) scale(0.8) translateY(-30px);
            }
        }
        
        @keyframes bigGwenParticleFloat {
            0% {
                opacity: 0.7;
                transform: scale(1) translateY(0px);
            }
            100% {
                opacity: 0;
                transform: scale(0.5) translateY(-40px);
            }
        }
        
        .big-gwen-hands-effect {
            filter: drop-shadow(0 0 10px #ff6b6b);
        }
    `;
    
    document.head.appendChild(style);
}

// Auto-inject styles when module loads
if (typeof document !== 'undefined') {
    injectBigGwenStyles();
}

// Export for artifact handler registration
export default theHandsOfBigGwenArtifact;