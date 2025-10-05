// shieldOfLife.js - Shield of Life Equipment Artifact

/**
 * Shield of Life
 * Type: Artifact - Equip
 * Effect: When the equipped hero takes damage from an attack,
 *         each Shield of Life has a 20% chance to trigger.
 *         If at least one triggers, the attack damage is nullified
 *         and the hero gains 50 Shield.
 */

export const shieldOfLifeArtifact = {
    name: 'ShieldOfLife',
    displayName: 'Shield of Life',
    type: 'Artifact',
    subtype: 'Equip',
    cost: 8, // Adjust cost as needed for game balance
    
    // This is an equip artifact, so it doesn't have a click handler
    handleClick: null,
    
    // Metadata for the effect
    effectData: {
        trigger: 'on_attack_damage_taken',
        blockChance: 0.2, // 20% chance per Shield
        shieldGain: 50,
        description: 'Each Shield has 20% chance to block attack damage and gain 50 Shield'
    },
    
    // Get formatted description for tooltips
    getDescription() {
        return `When equipped hero takes damage from an attack, each Shield of Life has a 20% chance to trigger. If at least one triggers, the attack damage is nullified and the hero gains 50 Shield.`;
    },
    
    // Visual effect data
    visualEffect: {
        icon: '🛡️✨',
        color: '#ffd700',
        animation: 'shield_of_life_block'
    }
};

/**
 * Check and trigger Shield of Life effects when a hero takes attack damage
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} target - The hero who took attack damage
 * @param {number} attackDamage - Amount of attack damage taken
 * @param {Object} context - Damage context (source, attacker, etc.)
 * @returns {Object} - { blocked: boolean, shieldGained: number }
 */
export function checkShieldOfLifeEffects(battleManager, target, attackDamage, context = {}) {
    // Only process if this is the authoritative instance
    if (!battleManager.isAuthoritative) return { blocked: false, shieldGained: 0 };
    
    // Only block attack damage from physical sources
    if (!battleManager.damageSourceManager || !battleManager.damageSourceManager.isPhysicalDamage(context)) {
        return { blocked: false, shieldGained: 0 };
    }
    
    // Check if the target has any Shield of Life equipped
    if (!target.equipment || target.equipment.length === 0) {
        return { blocked: false, shieldGained: 0 };
    }
    
    const shieldCount = target.equipment.filter(item => 
        (item.name === 'ShieldOfLife' || item.cardName === 'ShieldOfLife')
    ).length;
    
    if (shieldCount === 0) {
        return { blocked: false, shieldGained: 0 };
    }
    
    console.log(`🛡️ ${target.name} has ${shieldCount} Shield of Life equipped, rolling for block...`);
    
    // Roll 20% chance for each Shield of Life
    let anyTriggered = false;
    for (let i = 0; i < shieldCount; i++) {
        const roll = battleManager.getRandom();
        if (roll < 0.2) { // 20% chance
            anyTriggered = true;
            console.log(`🛡️ Shield of Life #${i + 1} triggered! (rolled ${(roll * 100).toFixed(1)}%)`);
        } else {
            console.log(`🛡️ Shield of Life #${i + 1} failed (rolled ${(roll * 100).toFixed(1)}%)`);
        }
    }
    
    if (!anyTriggered) {
        console.log(`🛡️ No Shield of Life triggered for ${target.name}`);
        return { blocked: false, shieldGained: 0 };
    }
    
    console.log(`🛡️ Shield of Life blocks attack for ${target.name}! Nullifying ${attackDamage} damage and granting 50 Shield`);
    
    // Add 50 Shield to the hero
    const shieldGained = 50;
    if (battleManager.combatManager) {
        battleManager.combatManager.addShield(target, shieldGained);
    }
    
    // Create visual effects
    createShieldOfLifeBlockAnimation(battleManager, target, attackDamage, shieldCount);
    
    // Log the effect
    battleManager.addCombatLog(
        `🛡️ ${target.name}'s Shield of Life blocks the hit!`,
        target.side === 'player' ? 'success' : 'info'
    );
    
    // Sync to guest
    battleManager.sendBattleUpdate('shield_of_life_block', {
        targetInfo: getTargetSyncInfo(target),
        attackDamage: attackDamage,
        shieldGained: shieldGained,
        shieldCount: shieldCount,
        timestamp: Date.now()
    });
    
    return { blocked: true, shieldGained: shieldGained };
}

/**
 * Create shield block animation for Shield of Life
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} hero - The hero whose shield blocked
 * @param {number} attackDamage - The blocked damage
 * @param {number} shieldCount - Number of Shield of Life artifacts equipped
 */
function createShieldOfLifeBlockAnimation(battleManager, hero, attackDamage, shieldCount) {
    const heroElement = battleManager.getHeroElement(hero.side, hero.position);
    if (!heroElement) return;
    
    // Create the main shield block effect
    const shieldEffect = document.createElement('div');
    shieldEffect.className = 'shield-of-life-main';
    shieldEffect.innerHTML = '🛡️✨';
    
    shieldEffect.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
        z-index: 300;
        pointer-events: none;
        animation: shieldOfLifeMain ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        text-shadow: 
            0 0 20px rgba(255, 215, 0, 1),
            0 0 40px rgba(255, 215, 0, 0.8),
            0 0 60px rgba(255, 255, 255, 0.4);
        filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.9));
    `;
    
    // Create orbiting golden particles for multiple shields
    for (let i = 0; i < Math.min(shieldCount, 6); i++) {
        const particle = document.createElement('div');
        particle.className = 'shield-of-life-particle';
        particle.innerHTML = '✨';
        
        const angle = (i * 60) + (Math.random() * 20 - 10);
        const radius = 30 + (i * 8);
        
        particle.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 16px;
            z-index: 299;
            pointer-events: none;
            animation: shieldOfLifeParticle ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
            --particle-angle: ${angle}deg;
            --particle-radius: ${radius}px;
            text-shadow: 
                0 0 10px rgba(255, 215, 0, 0.8),
                0 0 20px rgba(255, 215, 0, 0.6);
        `;
        
        heroElement.appendChild(particle);
        
        setTimeout(() => {
            if (particle && particle.parentNode) {
                particle.remove();
            }
        }, battleManager.getSpeedAdjustedDelay(1000));
    }
    
    // Add "BLOCKED" text
    const blockedText = document.createElement('div');
    blockedText.className = 'shield-of-life-text';
    blockedText.innerHTML = 'BLOCKED!';
    
    blockedText.style.cssText = `
        position: absolute;
        top: 25%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 16px;
        font-weight: bold;
        color: #ffd700;
        z-index: 301;
        pointer-events: none;
        animation: shieldOfLifeText ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        text-shadow: 
            1px 1px 2px rgba(0, 0, 0, 0.8),
            0 0 8px rgba(255, 215, 0, 0.9);
    `;
    
    heroElement.appendChild(shieldEffect);
    heroElement.appendChild(blockedText);
    
    setTimeout(() => {
        if (shieldEffect && shieldEffect.parentNode) {
            shieldEffect.remove();
        }
        if (blockedText && blockedText.parentNode) {
            blockedText.remove();
        }
    }, battleManager.getSpeedAdjustedDelay(1000));
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
 * Handle Shield of Life effect on guest side
 * @param {Object} data - The effect data from host
 * @param {Object} battleManager - The battle manager instance
 */
export function handleGuestShieldOfLifeBlock(data, battleManager) {
    const { targetInfo, attackDamage, shieldGained, shieldCount } = data;
    
    // Find the target hero
    const target = findTargetFromSyncInfo(battleManager, targetInfo);
    
    if (!target) {
        console.error('🛡️ GUEST: Could not find target for Shield of Life block effect');
        return;
    }
    
    // Apply shield using existing shield system
    if (battleManager.combatManager) {
        battleManager.combatManager.addShield(target, shieldGained);
    }
    
    // Create animations
    createShieldOfLifeBlockAnimation(battleManager, target, attackDamage, shieldCount);
    
    // Add to combat log
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const targetLocalSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    const logType = targetLocalSide === 'player' ? 'success' : 'info';
    
    battleManager.addCombatLog(
        `🛡️ ${target.name}'s Shield of Life blocks the hit!`,
        logType
    );
    
    console.log(`🛡️ GUEST: Shield of Life block effect synchronized - ${shieldGained} shield added`);
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
if (typeof document !== 'undefined' && !document.getElementById('shieldOfLifeStyles')) {
    const style = document.createElement('style');
    style.id = 'shieldOfLifeStyles';
    style.textContent = `
        @keyframes shieldOfLifeMain {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            80% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        @keyframes shieldOfLifeParticle {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) 
                          rotate(var(--particle-angle)) 
                          translateX(10px) 
                          rotate(calc(-1 * var(--particle-angle)));
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) 
                          rotate(calc(var(--particle-angle) + 60deg)) 
                          translateX(var(--particle-radius)) 
                          rotate(calc(-1 * (var(--particle-angle) + 60deg)));
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) 
                          rotate(calc(var(--particle-angle) + 180deg)) 
                          translateX(var(--particle-radius)) 
                          rotate(calc(-1 * (var(--particle-angle) + 180deg)));
            }
        }
        
        @keyframes shieldOfLifeText {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8) translateY(10px);
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
                transform: translate(-50%, -50%) scale(0.9) translateY(-5px);
            }
        }
        
        .shield-of-life-main,
        .shield-of-life-particle,
        .shield-of-life-text {
            will-change: transform, opacity;
        }
    `;
    
    document.head.appendChild(style);
}

// Export for artifact handler registration
export default shieldOfLifeArtifact;