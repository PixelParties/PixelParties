// dichotomyOfLunaAndTempeste.js - Dichotomy of Luna and Tempeste Equipment Artifact

/**
 * Dichotomy of Luna and Tempeste
 * Type: Artifact - Equip
 * Effect: When the equipped hero takes damage from Burn status effect,
 *         gain Shield equal to half the burn damage dealt.
 *         Multiple copies multiply the shield gain.
 */

export const dichotomyOfLunaAndTempesteArtifact = {
    name: 'DichotomyOfLunaAndTempeste',
    displayName: 'Dichotomy of Luna and Tempeste',
    type: 'Artifact',
    subtype: 'Equip',
    cost: 5, // Adjust cost as needed for game balance
    
    // This is an equip artifact, so it doesn't have a click handler
    handleClick: null,
    
    // Metadata for the effect
    effectData: {
        trigger: 'on_burn_damage_taken',
        shieldRatio: 0.5, // Half the burn damage as shield
        description: 'Gain shield equal to half burn damage taken'
    },
    
    // Get formatted description for tooltips
    getDescription() {
        return `When equipped hero takes burn damage, gain Shield equal to half the damage dealt. Multiple copies multiply the shield gained.`;
    },
    
    // Visual effect data
    visualEffect: {
        icon: '🌙⚡',
        color: '#4a90e2',
        animation: 'luna_tempeste_shield'
    }
};

/**
 * Check and trigger Dichotomy of Luna and Tempeste effects when a hero takes burn damage
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} damagedHero - The hero who took burn damage
 * @param {number} burnDamage - Amount of burn damage taken
 */
export function checkDichotomyOfLunaAndTempesteEffects(battleManager, damagedHero, burnDamage) {
    // Only process if this is the authoritative instance
    if (!battleManager.isAuthoritative) return;
    
    // Ensure combat manager is available for shield operations
    if (!battleManager.combatManager) return;
    
    // Check if the damaged hero has any Dichotomy of Luna and Tempeste equipped
    if (!damagedHero.equipment || damagedHero.equipment.length === 0) {
        return;
    }
    
    const dichotomyCount = damagedHero.equipment.filter(item => 
        (item.name === 'DichotomyOfLunaAndTempeste' || item.cardName === 'DichotomyOfLunaAndTempeste')
    ).length;
    
    if (dichotomyCount === 0) {
        return;
    }
    
    console.log(`🌙⚡ ${damagedHero.name} has ${dichotomyCount} Dichotomy of Luna and Tempeste equipped, calculating shield...`);
    
    // Calculate shield amount: half the burn damage, multiplied by number of copies
    const baseShieldAmount = Math.floor(burnDamage * 0.5);
    const totalShieldAmount = baseShieldAmount * dichotomyCount;
    
    if (totalShieldAmount <= 0) {
        console.log(`🌙⚡ No shield to grant (damage too low: ${burnDamage})`);
        return;
    }
    
    console.log(`🌙⚡ Granting ${totalShieldAmount} shield to ${damagedHero.name} (${baseShieldAmount} base × ${dichotomyCount} copies)`);
    
    // Add shield using the existing shield system
    // We need to temporarily mark this as coming from our artifact to handle network sync properly
    const originalAddShield = battleManager.combatManager.addShield;
    let shieldAdded = false;
    
    // Temporarily override to prevent automatic network sync
    battleManager.combatManager.addShield = function(hero, amount) {
        if (!hero || amount <= 0) return;

        // Initialize shield if not present
        if (typeof hero.currentShield !== 'number') {
            hero.currentShield = 0;
        }

        const oldShield = hero.currentShield;
        hero.currentShield += amount;

        // Update health bar to show shields
        battleManager.updateHeroHealthBar(hero.side, hero.position, hero.currentHp, hero.maxHp);
        
        shieldAdded = true;
        // Don't send automatic network update - we'll handle it ourselves
    };
    
    // Add the shield
    battleManager.combatManager.addShield(damagedHero, totalShieldAmount);
    
    // Restore original method
    battleManager.combatManager.addShield = originalAddShield;
    
    if (shieldAdded) {
        // Create visual effects
        createDichotomyShieldAnimation(battleManager, damagedHero, totalShieldAmount, dichotomyCount);
        
        // Log the effect
        if (dichotomyCount > 1) {
            battleManager.addCombatLog(
                `🌙⚡ ${damagedHero.name}'s ${dichotomyCount} Dichotomy artifacts grant ${totalShieldAmount} shield from burn!`,
                damagedHero.side === 'player' ? 'success' : 'info'
            );
        } else {
            battleManager.addCombatLog(
                `🌙⚡ ${damagedHero.name}'s Dichotomy of Luna and Tempeste grants ${totalShieldAmount} shield from burn!`,
                damagedHero.side === 'player' ? 'success' : 'info'
            );
        }
        
        // Sync to guest manually
        battleManager.sendBattleUpdate('dichotomy_luna_tempeste_shield', {
            targetInfo: getTargetSyncInfo(damagedHero),
            burnDamage: burnDamage,
            shieldAmount: totalShieldAmount,
            dichotomyCount: dichotomyCount,
            timestamp: Date.now()
        });
    }
}

/**
 * Create shield animation for Dichotomy of Luna and Tempeste
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} hero - The hero gaining shield
 * @param {number} shieldAmount - Amount of shield gained
 * @param {number} dichotomyCount - Number of Dichotomy artifacts equipped
 */
function createDichotomyShieldAnimation(battleManager, hero, shieldAmount, dichotomyCount) {
    const heroElement = battleManager.getHeroElement(hero.side, hero.position);
    if (!heroElement) return;
    
    // Create the main shield effect
    const shieldEffect = document.createElement('div');
    shieldEffect.className = 'dichotomy-shield-main';
    shieldEffect.innerHTML = '🌙⚡🛡️';
    
    shieldEffect.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 36px;
        z-index: 300;
        pointer-events: none;
        animation: dichotomyShieldMain ${battleManager.getSpeedAdjustedDelay(1200)}ms ease-out forwards;
        text-shadow: 
            0 0 20px rgba(74, 144, 226, 1),
            0 0 40px rgba(74, 144, 226, 0.8),
            0 0 60px rgba(100, 200, 255, 0.4);
        filter: drop-shadow(0 0 15px rgba(74, 144, 226, 0.9));
    `;
    
    // Create orbiting effects for multiple copies
    for (let i = 0; i < Math.min(dichotomyCount, 4); i++) {
        const orbitEffect = document.createElement('div');
        orbitEffect.className = 'dichotomy-orbit-effect';
        orbitEffect.innerHTML = i % 2 === 0 ? '🌙' : '⚡';
        
        const angle = (i * 90) + (Math.random() * 30 - 15);
        const radius = 40 + (i * 10);
        
        orbitEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
            z-index: 299;
            pointer-events: none;
            animation: dichotomyOrbit ${battleManager.getSpeedAdjustedDelay(1200)}ms ease-out forwards;
            --orbit-angle: ${angle}deg;
            --orbit-radius: ${radius}px;
            text-shadow: 
                0 0 12px rgba(74, 144, 226, 0.8),
                0 0 24px rgba(74, 144, 226, 0.6);
        `;
        
        heroElement.appendChild(orbitEffect);
        
        setTimeout(() => {
            if (orbitEffect && orbitEffect.parentNode) {
                orbitEffect.remove();
            }
        }, battleManager.getSpeedAdjustedDelay(1200));
    }
    
    // Add shield amount text
    const shieldText = document.createElement('div');
    shieldText.className = 'dichotomy-shield-text';
    shieldText.innerHTML = `+${shieldAmount} 🛡️`;
    
    shieldText.style.cssText = `
        position: absolute;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 14px;
        font-weight: bold;
        color: #4a90e2;
        z-index: 301;
        pointer-events: none;
        animation: dichotomyShieldText ${battleManager.getSpeedAdjustedDelay(1200)}ms ease-out forwards;
        text-shadow: 
            1px 1px 2px rgba(0, 0, 0, 0.8),
            0 0 8px rgba(74, 144, 226, 0.9);
    `;
    
    heroElement.appendChild(shieldEffect);
    heroElement.appendChild(shieldText);
    
    setTimeout(() => {
        if (shieldEffect && shieldEffect.parentNode) {
            shieldEffect.remove();
        }
        if (shieldText && shieldText.parentNode) {
            shieldText.remove();
        }
    }, battleManager.getSpeedAdjustedDelay(1200));
}

/**
 * Get target sync information for network synchronization
 * @param {Object} target - The target hero
 * @returns {Object} - Sync info object
 */
function getTargetSyncInfo(target) {
    return {
        type: 'hero',
        absoluteSide: target.absoluteSide,
        position: target.position,
        name: target.name
    };
}

/**
 * Handle Dichotomy of Luna and Tempeste effect on guest side
 * @param {Object} data - The effect data from host
 * @param {Object} battleManager - The battle manager instance
 */
export function handleGuestDichotomyShieldEffect(data, battleManager) {
    const { targetInfo, burnDamage, shieldAmount, dichotomyCount } = data;
    
    // Find the target hero
    const target = findTargetFromSyncInfo(battleManager, targetInfo);
    
    if (!target) {
        console.error('🌙⚡ GUEST: Could not find target for Dichotomy shield effect');
        return;
    }
    
    // Apply shield using existing shield system
    if (battleManager.combatManager) {
        // Add shield directly (guest doesn't need to send network updates)
        if (typeof target.currentShield !== 'number') {
            target.currentShield = 0;
        }
        target.currentShield += shieldAmount;
        
        // Update health bar
        battleManager.updateHeroHealthBar(target.side, target.position, target.currentHp, target.maxHp);
    }
    
    // Create animations
    createDichotomyShieldAnimation(battleManager, target, shieldAmount, dichotomyCount);
    
    // Add to combat log
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const targetLocalSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    const logType = targetLocalSide === 'player' ? 'success' : 'info';
    
    if (dichotomyCount > 1) {
        battleManager.addCombatLog(
            `🌙⚡ ${target.name}'s ${dichotomyCount} Dichotomy artifacts grant ${shieldAmount} shield from burn!`,
            logType
        );
    } else {
        battleManager.addCombatLog(
            `🌙⚡ ${target.name}'s Dichotomy of Luna and Tempeste grants ${shieldAmount} shield from burn!`,
            logType
        );
    }
    
    console.log(`🌙⚡ GUEST: Dichotomy shield effect synchronized - ${shieldAmount} shield added`);
}

/**
 * Find target from sync info
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} targetInfo - The target sync info
 * @returns {Object|null} - The target or null
 */
function findTargetFromSyncInfo(battleManager, targetInfo) {
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    
    if (targetInfo.type === 'hero') {
        const heroes = localSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        return heroes[targetInfo.position];
    }
    
    return null;
}

// Add CSS animations
if (typeof document !== 'undefined' && !document.getElementById('dichotomyLunaTempesteStyles')) {
    const style = document.createElement('style');
    style.id = 'dichotomyLunaTempesteStyles';
    style.textContent = `
        @keyframes dichotomyShieldMain {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2) rotate(120deg);
            }
            60% {
                opacity: 0.9;
                transform: translate(-50%, -50%) scale(1.1) rotate(240deg);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1) rotate(360deg);
            }
        }
        
        @keyframes dichotomyOrbit {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) 
                          rotate(var(--orbit-angle)) 
                          translateX(10px) 
                          rotate(calc(-1 * var(--orbit-angle)));
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) 
                          rotate(calc(var(--orbit-angle) + 120deg)) 
                          translateX(var(--orbit-radius)) 
                          rotate(calc(-1 * (var(--orbit-angle) + 120deg)));
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) 
                          rotate(calc(var(--orbit-angle) + 360deg)) 
                          translateX(var(--orbit-radius)) 
                          rotate(calc(-1 * (var(--orbit-angle) + 360deg)));
            }
        }
        
        @keyframes dichotomyShieldText {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5) translateY(20px);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1) translateY(0px);
            }
            70% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1) translateY(0px);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8) translateY(-10px);
            }
        }
        
        .dichotomy-shield-main,
        .dichotomy-orbit-effect,
        .dichotomy-shield-text {
            will-change: transform, opacity;
        }
    `;
    
    document.head.appendChild(style);
}

// Export for artifact handler registration
export default dichotomyOfLunaAndTempesteArtifact;