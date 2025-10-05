// shieldOfDeath.js - Shield of Death Equipment Artifact

/**
 * Shield of Death
 * Type: Artifact - Equip
 * Effect: When the equipped hero takes damage from an attack,
 *         each Shield of Death has a 20% chance to trigger.
 *         If at least one triggers, the attack damage is nullified
 *         and 50 damage is dealt to the living enemy with lowest current HP.
 */

export const shieldOfDeathArtifact = {
    name: 'ShieldOfDeath',
    displayName: 'Shield of Death',
    type: 'Artifact',
    subtype: 'Equip',
    cost: 8, // Adjust cost as needed for game balance
    
    // This is an equip artifact, so it doesn't have a click handler
    handleClick: null,
    
    // Metadata for the effect
    effectData: {
        trigger: 'on_attack_damage_taken',
        blockChance: 0.2, // 20% chance per Shield
        curseDamage: 50,
        description: 'Each Shield has 20% chance to block attack damage and curse the weakest enemy for 50 damage'
    },
    
    // Get formatted description for tooltips
    getDescription() {
        return `When equipped hero takes damage from an attack, each Shield of Death has a 20% chance to trigger. If at least one triggers, the attack damage is nullified and the living enemy with lowest current HP takes 50 damage.`;
    },
    
    // Visual effect data
    visualEffect: {
        icon: '💀⚡',
        color: '#8b0000',
        animation: 'shield_of_death_block'
    }
};

/**
 * Check and trigger Shield of Death effects when a hero takes attack damage
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} target - The hero who took attack damage
 * @param {number} attackDamage - Amount of attack damage taken
 * @param {Object} context - Damage context (source, attacker, etc.)
 * @returns {Object} - { blocked: boolean, curseDamage: number }
 */
export function checkShieldOfDeathEffects(battleManager, target, attackDamage, context = {}) {
    // Only process if this is the authoritative instance
    if (!battleManager.isAuthoritative) return { blocked: false, curseDamage: 0 };
    
    // Only block attack damage from physical sources
    if (!battleManager.damageSourceManager || !battleManager.damageSourceManager.isPhysicalDamage(context)) {
        return { blocked: false, curseDamage: 0 };
    }
    
    // Check if the target has any Shield of Death equipped
    if (!target.equipment || target.equipment.length === 0) {
        return { blocked: false, curseDamage: 0 };
    }
    
    const shieldCount = target.equipment.filter(item => 
        (item.name === 'ShieldOfDeath' || item.cardName === 'ShieldOfDeath')
    ).length;
    
    if (shieldCount === 0) {
        return { blocked: false, curseDamage: 0 };
    }
    
    console.log(`💀 ${target.name} has ${shieldCount} Shield of Death equipped, rolling for block...`);
    
    // Roll 20% chance for each Shield of Death
    let anyTriggered = false;
    for (let i = 0; i < shieldCount; i++) {
        const roll = battleManager.getRandom();
        if (roll < 0.99) { // 20% chance
            anyTriggered = true;
            console.log(`💀 Shield of Death #${i + 1} triggered! (rolled ${(roll * 100).toFixed(1)}%)`);
        } else {
            console.log(`💀 Shield of Death #${i + 1} failed (rolled ${(roll * 100).toFixed(1)}%)`);
        }
    }
    
    if (!anyTriggered) {
        console.log(`💀 No Shield of Death triggered for ${target.name}`);
        return { blocked: false, curseDamage: 0 };
    }
    
    console.log(`💀 Shield of Death blocks attack for ${target.name}! Nullifying ${attackDamage} damage and cursing weakest enemy`);
    
    // Find the living enemy target with lowest current HP
    const curseTarget = findWeakestEnemy(battleManager, target);
    
    if (!curseTarget) {
        console.log(`💀 No living enemies found to curse!`);
        
        // Still block the attack even if no curse target
        battleManager.addCombatLog(
            `💀 ${target.name}'s Shield of Death blocks the hit, but finds no enemies to curse!`,
            target.side === 'player' ? 'success' : 'info'
        );
        
        // Create block animation only
        createShieldOfDeathBlockAnimation(battleManager, target, attackDamage, shieldCount);
        
        // Sync to guest
        battleManager.sendBattleUpdate('shield_of_death_block', {
            targetInfo: getTargetSyncInfo(target),
            attackDamage: attackDamage,
            curseDamage: 0,
            curseTargetInfo: null,
            shieldCount: shieldCount,
            timestamp: Date.now()
        });
        
        return { blocked: true, curseDamage: 0 };
    }
    
    // Deal 50 damage to the curse target
    const curseDamage = 50;
    applyCurseDamage(battleManager, curseTarget, curseDamage, target);
    
    // Create visual effects
    createShieldOfDeathBlockAnimation(battleManager, target, attackDamage, shieldCount);
    createShieldOfDeathCurseAnimation(battleManager, curseTarget, curseDamage);
    
    // Log the effect
    battleManager.addCombatLog(
        `💀 ${target.name}'s Shield of Death blocks the hit and curses ${curseTarget.name}!`,
        target.side === 'player' ? 'success' : 'info'
    );
    
    // Sync to guest
    battleManager.sendBattleUpdate('shield_of_death_block', {
        targetInfo: getTargetSyncInfo(target),
        attackDamage: attackDamage,
        curseDamage: curseDamage,
        curseTargetInfo: getTargetSyncInfo(curseTarget),
        shieldCount: shieldCount,
        timestamp: Date.now()
    });
    
    return { blocked: true, curseDamage: curseDamage };
}

/**
 * Find the living enemy target with lowest current HP
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} caster - The hero with Shield of Death
 * @returns {Object|null} - The weakest enemy target or null
 */
function findWeakestEnemy(battleManager, caster) {
    const enemies = caster.side === 'player' ? battleManager.opponentHeroes : battleManager.playerHeroes;
    
    let weakestTargets = [];
    let lowestHp = Infinity;
    
    // Check all enemy heroes
    ['left', 'center', 'right'].forEach(position => {
        const hero = enemies[position];
        if (hero && hero.alive) {
            if (hero.currentHp < lowestHp) {
                lowestHp = hero.currentHp;
                weakestTargets = [hero];
            } else if (hero.currentHp === lowestHp) {
                weakestTargets.push(hero);
            }
        }
        
        // Check enemy creatures
        if (hero && hero.creatures) {
            hero.creatures.forEach(creature => {
                if (creature.alive) {
                    if (creature.currentHp < lowestHp) {
                        lowestHp = creature.currentHp;
                        weakestTargets = [creature];
                    } else if (creature.currentHp === lowestHp) {
                        weakestTargets.push(creature);
                    }
                }
            });
        }
    });
    
    if (weakestTargets.length === 0) {
        return null;
    }
    
    // Random selection if tied
    const randomIndex = battleManager.getRandomInt(0, weakestTargets.length - 1);
    return weakestTargets[randomIndex];
}

/**
 * Apply curse damage to target
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} target - The target to curse
 * @param {number} damage - Damage amount
 * @param {Object} caster - The hero with Shield of Death
 */
function applyCurseDamage(battleManager, target, damage, caster) {
    if (target.type === 'creature') {
        // Find the creature's hero and index
        const heroOwner = findCreatureOwner(battleManager, target);
        if (heroOwner) {
            const creatureIndex = heroOwner.hero.creatures.indexOf(target);
            if (creatureIndex !== -1) {
                battleManager.combatManager.authoritative_applyDamageToCreature({
                    hero: heroOwner.hero,
                    creature: target,
                    creatureIndex: creatureIndex,
                    damage: damage,
                    position: heroOwner.position,
                    side: heroOwner.side
                }, {
                    source: 'curse',
                    attacker: caster
                });
            }
        }
    } else {
        // Hero target
        battleManager.combatManager.authoritative_applyDamage({
            target: target,
            damage: damage,
            newHp: Math.max(0, target.currentHp - damage),
            died: (target.currentHp - damage) <= 0
        }, {
            source: 'curse',
            attacker: caster
        });
    }
}

/**
 * Find the owner hero of a creature
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} creature - The creature to find owner for
 * @returns {Object|null} - { hero, side, position } or null
 */
function findCreatureOwner(battleManager, creature) {
    for (const side of ['player', 'opponent']) {
        const heroes = side === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        
        for (const position of ['left', 'center', 'right']) {
            const hero = heroes[position];
            if (hero && hero.creatures && hero.creatures.includes(creature)) {
                return { hero, side, position };
            }
        }
    }
    return null;
}

/**
 * Create shield block animation for Shield of Death
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} hero - The hero whose shield blocked
 * @param {number} attackDamage - The blocked damage
 * @param {number} shieldCount - Number of Shield of Death artifacts equipped
 */
function createShieldOfDeathBlockAnimation(battleManager, hero, attackDamage, shieldCount) {
    const heroElement = battleManager.getHeroElement(hero.side, hero.position);
    if (!heroElement) return;
    
    // Create the main shield block effect
    const shieldEffect = document.createElement('div');
    shieldEffect.className = 'shield-of-death-main';
    shieldEffect.innerHTML = '💀⚡';
    
    shieldEffect.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
        z-index: 300;
        pointer-events: none;
        animation: shieldOfDeathMain ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        text-shadow: 
            0 0 20px rgba(139, 0, 0, 1),
            0 0 40px rgba(139, 0, 0, 0.8),
            0 0 60px rgba(255, 0, 0, 0.4);
        filter: drop-shadow(0 0 15px rgba(139, 0, 0, 0.9));
    `;
    
    // Create orbiting dark particles for multiple shields
    for (let i = 0; i < Math.min(shieldCount, 6); i++) {
        const particle = document.createElement('div');
        particle.className = 'shield-of-death-particle';
        particle.innerHTML = '💀';
        
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
            animation: shieldOfDeathParticle ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
            --particle-angle: ${angle}deg;
            --particle-radius: ${radius}px;
            text-shadow: 
                0 0 10px rgba(139, 0, 0, 0.8),
                0 0 20px rgba(139, 0, 0, 0.6);
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
    blockedText.className = 'shield-of-death-text';
    blockedText.innerHTML = 'BLOCKED!';
    
    blockedText.style.cssText = `
        position: absolute;
        top: 25%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 16px;
        font-weight: bold;
        color: #8b0000;
        z-index: 301;
        pointer-events: none;
        animation: shieldOfDeathText ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        text-shadow: 
            1px 1px 2px rgba(0, 0, 0, 0.8),
            0 0 8px rgba(139, 0, 0, 0.9);
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
 * Create curse animation on the target
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} target - The target being cursed
 * @param {number} damage - Curse damage amount
 */
function createShieldOfDeathCurseAnimation(battleManager, target, damage) {
    let targetElement;
    
    if (target.type === 'creature') {
        const owner = findCreatureOwner(battleManager, target);
        if (!owner) return;
        
        const creatureIndex = owner.hero.creatures.indexOf(target);
        targetElement = document.querySelector(
            `.${owner.side}-slot.${owner.position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    } else {
        targetElement = battleManager.getHeroElement(target.side, target.position);
    }
    
    if (!targetElement) return;
    
    // Create the main curse effect
    const curseEffect = document.createElement('div');
    curseEffect.className = 'shield-of-death-curse';
    curseEffect.innerHTML = '💀👻';
    
    curseEffect.style.cssText = `
        position: absolute;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 36px;
        z-index: 400;
        pointer-events: none;
        animation: shieldOfDeathCurse ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        text-shadow: 
            0 0 20px rgba(139, 0, 0, 1),
            0 0 40px rgba(0, 0, 0, 0.8),
            0 0 60px rgba(139, 0, 0, 0.6);
        filter: drop-shadow(0 0 15px rgba(139, 0, 0, 0.9));
    `;
    
    // Create floating skull particles
    for (let i = 0; i < 3; i++) {
        const skull = document.createElement('div');
        skull.className = 'curse-skull-particle';
        skull.innerHTML = '💀';
        
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 40;
        
        skull.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
            z-index: 399;
            pointer-events: none;
            animation: curseSkullFloat ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
            --skull-offset-x: ${offsetX}px;
            --skull-offset-y: ${offsetY}px;
            text-shadow: 0 0 8px rgba(139, 0, 0, 0.8);
        `;
        
        targetElement.appendChild(skull);
        
        setTimeout(() => {
            if (skull && skull.parentNode) {
                skull.remove();
            }
        }, battleManager.getSpeedAdjustedDelay(1000));
    }
    
    targetElement.appendChild(curseEffect);
    
    setTimeout(() => {
        if (curseEffect && curseEffect.parentNode) {
            curseEffect.remove();
        }
    }, battleManager.getSpeedAdjustedDelay(1000));
}

/**
 * Get target sync information for network synchronization
 * @param {Object} target - The target hero or creature
 * @returns {Object} - Sync info object
 */
function getTargetSyncInfo(target) {
    if (target.type === 'creature') {
        const owner = findCreatureOwner(window.battleManager, target);
        if (!owner) return null;
        
        return {
            type: 'creature',
            absoluteSide: owner.hero.absoluteSide,
            position: owner.position,
            creatureIndex: owner.hero.creatures.indexOf(target),
            name: target.name
        };
    } else {
        return {
            type: 'hero',
            absoluteSide: target.absoluteSide,
            position: target.position,
            name: target.name
        };
    }
}

/**
 * Handle Shield of Death effect on guest side
 * @param {Object} data - The effect data from host
 * @param {Object} battleManager - The battle manager instance
 */
export function handleGuestShieldOfDeathBlock(data, battleManager) {
    const { targetInfo, attackDamage, curseDamage, curseTargetInfo, shieldCount } = data;
    
    // Find the blocking target
    const blockingTarget = findTargetFromSyncInfo(battleManager, targetInfo);
    
    if (!blockingTarget) {
        console.error('💀 GUEST: Could not find blocking target for Shield of Death effect');
        return;
    }
    
    // Create block animation
    createShieldOfDeathBlockAnimation(battleManager, blockingTarget, attackDamage, shieldCount);
    
    // Find and animate curse target if it exists
    if (curseTargetInfo && curseDamage > 0) {
        const curseTarget = findTargetFromSyncInfo(battleManager, curseTargetInfo);
        if (curseTarget) {
            createShieldOfDeathCurseAnimation(battleManager, curseTarget, curseDamage);
        }
    }
    
    // Add to combat log
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const targetLocalSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    const logType = targetLocalSide === 'player' ? 'success' : 'info';
    
    if (curseDamage > 0 && curseTargetInfo) {
        battleManager.addCombatLog(
            `💀 ${blockingTarget.name}'s Shield of Death blocks the hit and curses ${curseTargetInfo.name}!`,
            logType
        );
    } else {
        battleManager.addCombatLog(
            `💀 ${blockingTarget.name}'s Shield of Death blocks the hit, but finds no enemies to curse!`,
            logType
        );
    }
    
    console.log(`💀 GUEST: Shield of Death block effect synchronized`);
}

/**
 * Find target from sync info
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} targetInfo - The target sync info
 * @returns {Object|null} - The target or null
 */
function findTargetFromSyncInfo(battleManager, targetInfo) {
    if (!targetInfo) return null;
    
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    
    if (targetInfo.type === 'hero') {
        const heroes = localSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        return heroes[targetInfo.position];
    } else if (targetInfo.type === 'creature') {
        const heroes = localSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const hero = heroes[targetInfo.position];
        return hero?.creatures?.[targetInfo.creatureIndex];
    }
    
    return null;
}

// Add CSS animations
if (typeof document !== 'undefined' && !document.getElementById('shieldOfDeathStyles')) {
    const style = document.createElement('style');
    style.id = 'shieldOfDeathStyles';
    style.textContent = `
        @keyframes shieldOfDeathMain {
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
        
        @keyframes shieldOfDeathParticle {
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
        
        @keyframes shieldOfDeathText {
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
        
        @keyframes shieldOfDeathCurse {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.3) rotate(180deg);
            }
            80% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1) rotate(360deg);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8) rotate(540deg);
            }
        }
        
        @keyframes curseSkullFloat {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) translateX(0px) translateY(0px);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) 
                          translateX(calc(var(--skull-offset-x) * 0.5)) 
                          translateY(calc(var(--skull-offset-y) * 0.5));
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) 
                          translateX(var(--skull-offset-x)) 
                          translateY(var(--skull-offset-y));
            }
        }
        
        .shield-of-death-main,
        .shield-of-death-particle,
        .shield-of-death-text,
        .shield-of-death-curse,
        .curse-skull-particle {
            will-change: transform, opacity;
        }
    `;
    
    document.head.appendChild(style);
}

// Export for artifact handler registration
export default shieldOfDeathArtifact;