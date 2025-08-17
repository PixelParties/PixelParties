// heartOfIce.js - Heart of Ice Equipment Artifact

/**
 * Heart of Ice
 * Type: Artifact - Equip
 * Effect: When the equipped hero takes any non-status effect damage,
 *         there is a 20% chance to freeze a random living enemy target.
 *         Each equipped heart has its own independent chance.
 */

export const heartOfIceArtifact = {
    name: 'HeartOfIce',
    displayName: 'Heart of Ice',
    type: 'Artifact',
    subtype: 'Equip',
    cost: 4, // Adjust cost as needed for game balance
    
    // This is an equip artifact, so it doesn't have a click handler
    // The effect is handled by the defensive effects system
    handleClick: null,
    
    // Metadata for the effect
    effectData: {
        trigger: 'on_damage_taken',
        chance: 0.99,
        statusEffect: 'frozen',
        stacks: 1,
        description: '20% chance to freeze random enemy when taking damage'
    },
    
    // Get formatted description for tooltips
    getDescription() {
        return `When equipped hero takes non-status damage, 20% chance to freeze a random living enemy target. Multiple hearts roll independently.`;
    },
    
    // Visual effect data
    visualEffect: {
        icon: '💙',
        color: '#64c8ff',
        animation: 'ice_heart_burst'
    }
};

/**
 * Check and trigger Heart of Ice effects when a hero takes damage
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} damagedHero - The hero who took damage
 * @param {number} damage - Amount of damage taken
 * @param {string} damageSource - Source of damage ('attack', 'poison', 'burn', etc.)
 */
export function checkHeartOfIceEffects(battleManager, damagedHero, damage, damageSource) {
    // Only trigger on non-status effect damage
    const statusEffectSources = ['poison', 'burn', 'destruction'];
    if (statusEffectSources.includes(damageSource)) {
        return; // Don't trigger on status effect damage
    }
    
    // Ensure randomness manager is available for deterministic results
    if (!battleManager.randomnessManager || !battleManager.randomnessManager.isInitialized) {
        console.warn('💙 Heart of Ice: Randomness manager not available, skipping effect');
        return;
    }
    
    // Check if the damaged hero has any Heart of Ice equipped
    if (!damagedHero.equipment || damagedHero.equipment.length === 0) {
        return;
    }
    
    const heartOfIceCount = damagedHero.equipment.filter(item => 
        (item.name === 'HeartOfIce' || item.cardName === 'HeartOfIce')
    ).length;
    
    if (heartOfIceCount === 0) {
        return;
    }
    
    console.log(`💙 ${damagedHero.name} has ${heartOfIceCount} Heart of Ice equipped, checking for triggers...`);
    
    // Each Heart of Ice rolls independently using seeded randomness
    let triggeredCount = 0;
    for (let i = 0; i < heartOfIceCount; i++) {
        if (battleManager.randomnessManager.checkChance(99)) { // 20% chance using seeded randomness
            triggeredCount++;
        }
    }
    
    if (triggeredCount === 0) {
        console.log(`💙 No Heart of Ice effects triggered for ${damagedHero.name}`);
        return;
    }
    
    console.log(`💙 ${triggeredCount} Heart of Ice effect(s) triggered for ${damagedHero.name}!`);
    
    // Find random living enemy targets for each trigger
    for (let i = 0; i < triggeredCount; i++) {
        const randomEnemy = findRandomLivingEnemy(battleManager, damagedHero);
        
        if (randomEnemy) {
            // Apply frozen status to the random enemy
            if (battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(randomEnemy, 'frozen', 1);
            }
            
            // Create icy animations
            createHeartOfIceAnimations(battleManager, damagedHero, randomEnemy);
            
            // Log the effect
            battleManager.addCombatLog(
                `💙 ${damagedHero.name}'s Heart of Ice freezes ${randomEnemy.name}!`,
                damagedHero.side === 'player' ? 'success' : 'error'
            );
            
            // Sync to guest if host
            if (battleManager.isAuthoritative) {
                battleManager.sendBattleUpdate('heart_of_ice_triggered', {
                    equipperInfo: getTargetSyncInfo(damagedHero),
                    targetInfo: getTargetSyncInfo(randomEnemy),
                    damage: damage,
                    damageSource: damageSource,
                    timestamp: Date.now()
                });
            }
        } else {
            console.log(`💙 No valid enemy targets found for Heart of Ice effect`);
            battleManager.addCombatLog(
                `💙 ${damagedHero.name}'s Heart of Ice finds no targets to freeze!`,
                'info'
            );
        }
    }
}

/**
 * Find a random living enemy target
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} damagedHero - The hero who has Heart of Ice
 * @returns {Object|null} - Random living enemy or null if none found
 */
function findRandomLivingEnemy(battleManager, damagedHero) {
    const enemySide = damagedHero.side === 'player' ? 'opponent' : 'player';
    const enemyHeroes = enemySide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
    
    // Collect all living enemy targets (heroes and creatures)
    const livingEnemies = [];
    
    // Add living enemy heroes
    ['left', 'center', 'right'].forEach(position => {
        const hero = enemyHeroes[position];
        if (hero && hero.alive) {
            livingEnemies.push(hero);
            
            // Add living creatures from this hero
            if (hero.creatures && hero.creatures.length > 0) {
                hero.creatures.forEach(creature => {
                    if (creature.alive) {
                        livingEnemies.push(creature);
                    }
                });
            }
        }
    });
    
    if (livingEnemies.length === 0) {
        return null;
    }
    
    // Return a random living enemy using seeded randomness
    // Use getRandomChoice for cleaner array selection
    return battleManager.randomnessManager.getRandomChoice(livingEnemies);
}

/**
 * Create icy animations for both the equipper and the target
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} equipper - The hero with Heart of Ice
 * @param {Object} target - The target being frozen
 */
function createHeartOfIceAnimations(battleManager, equipper, target) {
    // Animation on the equipper (heart pulses with icy energy)
    createHeartOfIceEquipperAnimation(battleManager, equipper);
    
    // Small delay before target animation
    setTimeout(() => {
        // Animation on the target (gets frozen)
        createHeartOfIceTargetAnimation(battleManager, target);
    }, battleManager.getSpeedAdjustedDelay(200));
}

/**
 * Create animation on the hero with Heart of Ice equipped
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} equipper - The hero with Heart of Ice
 */
function createHeartOfIceEquipperAnimation(battleManager, equipper) {
    const equipperElement = battleManager.getHeroElement(equipper.side, equipper.position);
    if (!equipperElement) return;
    
    // Create the main ice heart effect
    const iceHeartEffect = document.createElement('div');
    iceHeartEffect.className = 'heart-of-ice-main-heart';
    iceHeartEffect.innerHTML = '💙';
    
    iceHeartEffect.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 40px;
        z-index: 300;
        pointer-events: none;
        animation: heartOfIceMainHeart ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        text-shadow: 
            0 0 20px rgba(100, 200, 255, 1),
            0 0 40px rgba(100, 200, 255, 0.8),
            0 0 60px rgba(100, 200, 255, 0.4);
        filter: drop-shadow(0 0 10px rgba(100, 200, 255, 0.9));
    `;
    
    // Create additional sparkle effects
    const sparkleEffect = document.createElement('div');
    sparkleEffect.className = 'heart-of-ice-sparkles';
    sparkleEffect.innerHTML = '❄️✨❄️';
    
    sparkleEffect.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 24px;
        z-index: 299;
        pointer-events: none;
        animation: heartOfIceSparkles ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        text-shadow: 
            0 0 12px rgba(100, 200, 255, 0.8),
            0 0 24px rgba(100, 200, 255, 0.6);
    `;
    
    equipperElement.appendChild(iceHeartEffect);
    equipperElement.appendChild(sparkleEffect);
    
    setTimeout(() => {
        if (iceHeartEffect && iceHeartEffect.parentNode) {
            iceHeartEffect.remove();
        }
        if (sparkleEffect && sparkleEffect.parentNode) {
            sparkleEffect.remove();
        }
    }, battleManager.getSpeedAdjustedDelay(1000));
}

/**
 * Create animation on the target being frozen
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} target - The target being frozen
 */
function createHeartOfIceTargetAnimation(battleManager, target) {
    const targetElement = getTargetElement(battleManager, target);
    if (!targetElement) return;
    
    const freezeEffect = document.createElement('div');
    freezeEffect.className = 'heart-of-ice-target-effect';
    freezeEffect.innerHTML = '🧊❄️';
    
    freezeEffect.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 28px;
        z-index: 350;
        pointer-events: none;
        animation: heartOfIceTargetFreeze ${battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
        text-shadow: 
            0 0 12px rgba(100, 200, 255, 0.9),
            0 0 24px rgba(100, 200, 255, 0.6);
    `;
    
    targetElement.appendChild(freezeEffect);
    
    setTimeout(() => {
        if (freezeEffect && freezeEffect.parentNode) {
            freezeEffect.remove();
        }
    }, battleManager.getSpeedAdjustedDelay(600));
}

/**
 * Get target element (hero or creature)
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} target - The target (hero or creature)
 * @returns {Element|null} - The DOM element or null
 */
function getTargetElement(battleManager, target) {
    if (target.type === 'hero' || !target.type) {
        // Hero element
        return battleManager.getHeroElement(target.side, target.position);
    } else {
        // Creature element - need to find its position and index
        return findCreatureElement(battleManager, target);
    }
}

/**
 * Find creature element in the DOM
 * @param {Object} battleManager - The battle manager instance
 * @param {Object} creature - The creature to find
 * @returns {Element|null} - The creature element or null
 */
function findCreatureElement(battleManager, creature) {
    // Search through all heroes to find this creature
    for (const side of ['player', 'opponent']) {
        const heroes = side === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        
        for (const position of ['left', 'center', 'right']) {
            const hero = heroes[position];
            if (!hero || !hero.creatures) continue;
            
            const creatureIndex = hero.creatures.indexOf(creature);
            if (creatureIndex !== -1) {
                return document.querySelector(
                    `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
                );
            }
        }
    }
    
    return null;
}

/**
 * Get target sync information for network synchronization
 * @param {Object} target - The target (hero or creature)
 * @returns {Object} - Sync info object
 */
function getTargetSyncInfo(target) {
    if (target.type === 'hero' || !target.type) {
        return {
            type: 'hero',
            absoluteSide: target.absoluteSide,
            position: target.position,
            name: target.name
        };
    } else {
        // For creatures, we need to find their hero and position
        // This is more complex but follows the same pattern as statusEffects.js
        return {
            type: 'creature',
            name: target.name,
            // Note: Full creature sync info would need to be implemented
            // following the pattern in statusEffects.js
        };
    }
}

/**
 * Handle Heart of Ice effect on guest side
 * @param {Object} data - The effect data from host
 * @param {Object} battleManager - The battle manager instance
 */
export function handleGuestHeartOfIceEffect(data, battleManager) {
    const { equipperInfo, targetInfo, damage, damageSource } = data;
    
    // Find the equipper and target
    const equipper = findTargetFromSyncInfo(battleManager, equipperInfo);
    const target = findTargetFromSyncInfo(battleManager, targetInfo);
    
    if (!equipper || !target) {
        console.error('💙 GUEST: Could not find equipper or target for Heart of Ice effect');
        return;
    }
    
    // Apply frozen status to target
    if (battleManager.statusEffectsManager) {
        battleManager.statusEffectsManager.applyStatusEffect(target, 'frozen', 1);
    }
    
    // Create animations
    createHeartOfIceAnimations(battleManager, equipper, target);
    
    // Add to combat log
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const equipperLocalSide = (equipperInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    const logType = equipperLocalSide === 'player' ? 'success' : 'error';
    
    battleManager.addCombatLog(
        `💙 ${equipper.name}'s Heart of Ice freezes ${target.name}!`,
        logType
    );
    
    console.log(`💙 GUEST: Heart of Ice effect synchronized`);
}

/**
 * Find target from sync info (simplified version)
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
    } else {
        // Creature lookup would need more complex implementation
        // For now, return null and log warning
        console.warn('💙 Creature target sync not fully implemented');
        return null;
    }
}

// Add CSS animations
if (typeof document !== 'undefined' && !document.getElementById('heartOfIceStyles')) {
    const style = document.createElement('style');
    style.id = 'heartOfIceStyles';
    style.textContent = `
        @keyframes heartOfIceEquipperPulse {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            60% {
                opacity: 0.8;
                transform: translate(-50%, -50%) scale(1.1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        @keyframes heartOfIceTargetFreeze {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.3) rotate(180deg);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1) rotate(360deg);
            }
        }
        
        .heart-of-ice-equipper-effect {
            will-change: transform, opacity;
        }
        
        .heart-of-ice-target-effect {
            will-change: transform, opacity;
        }
    `;
    
    document.head.appendChild(style);
}

// Export for artifact handler registration
export default heartOfIceArtifact;