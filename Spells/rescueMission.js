// rescueMission.js - Rescue Mission Fighting Spell Implementation
// Triggers when an ally Hero would take damage - another Hero intercepts and takes the damage instead

/**
 * Check for Rescue Mission reactions when a hero is about to take damage
 * @param {Object} target - The hero about to take damage
 * @param {number} damage - The damage amount
 * @param {Object} context - Damage context (source, attacker, etc.)
 * @param {Object} battleManager - The battle manager instance
 * @returns {Object|null} - Rescue data if intercepted, null otherwise
 */
export async function checkRescueMissionInterception(target, damage, context, battleManager) {
    if (!battleManager.isAuthoritative) return null;
    
    // Only trigger for heroes, not creatures
    if (target.type === 'creature') return null;
    
    // Target must be alive
    if (!target.alive) return null;
    
    // Need positive damage
    if (damage <= 0) return null;
        
    // Find all OTHER living ally heroes on the same side
    const alliedHeroes = target.side === 'player' 
        ? battleManager.playerHeroes 
        : battleManager.opponentHeroes;
    
    const potentialRescuers = [];
    
    // Check each allied hero for RescueMission spells (excluding the target itself)
    ['left', 'center', 'right'].forEach(position => {
        const hero = alliedHeroes[position];
        if (hero && hero.alive && hero !== target) {
            const rescueMissionCount = countRescueMissionSpells(hero);
            if (rescueMissionCount > 0) {                
                // Roll for each RescueMission spell independently
                for (let i = 0; i < rescueMissionCount; i++) {
                    const roll = battleManager.getRandom();

                    if (roll < 0.20) { // 20% chance
                        // This one triggers! Add to potential rescuers
                        potentialRescuers.push({
                            hero: hero,
                            position: position,
                            spellIndex: i
                        });
                        break;
                    }
                }
            }
        }
    });
    
    // If no rescuers triggered, return null
    if (potentialRescuers.length === 0) {
        return null;
    }
    
    // Use the FIRST rescuer that triggered (deterministic order: left -> center -> right)
    const rescuer = potentialRescuers[0];
        
    // Execute the rescue mission
    await executeRescueMission(rescuer.hero, target, damage, context, battleManager);
    
    // Return rescue data to indicate damage was intercepted
    return {
        intercepted: true,
        rescuer: rescuer.hero,
        originalTarget: target,
        damage: damage
    };
}

/**
 * Count RescueMission spells in hero's spellbook
 * @param {Object} hero - The hero to check
 * @returns {number} - Number of RescueMission spells
 */
function countRescueMissionSpells(hero) {
    if (!hero.spellbook || !Array.isArray(hero.spellbook)) {
        return 0;
    }
    
    return hero.spellbook.filter(spell => 
        spell && (spell.name === 'RescueMission' || spell.cardName === 'RescueMission')
    ).length;
}

/**
 * Execute a Rescue Mission
 * @param {Object} rescuer - The hero performing the rescue
 * @param {Object} originalTarget - The hero being rescued
 * @param {number} damage - The damage amount being intercepted
 * @param {Object} context - Damage context
 * @param {Object} battleManager - The battle manager instance
 */
async function executeRescueMission(rescuer, originalTarget, damage, context, battleManager) {    
    // Add combat log for the rescue
    battleManager.addCombatLog(
        `🦸 ${rescuer.name}'s Rescue Mission activates! Intercepting damage for ${originalTarget.name}!`,
        rescuer.side === 'player' ? 'success' : 'error'
    );
    
    // Animate the rescuer dashing to the original target (like Monia's protection)
    if (battleManager.animationManager) {
        await battleManager.animationManager.animateMoniaProtectionDash(rescuer, originalTarget);
    }
    
    // Grant the original target +20 battle attack (temporary, not permanent)
    const attackBonus = 20;
    originalTarget.addBattleAttackBonus(attackBonus);
    
    // Update the attack display for the rescued hero
    battleManager.updateHeroAttackDisplay(originalTarget.side, originalTarget.position, originalTarget);
    
    // Add combat log for attack bonus
    battleManager.addCombatLog(
        `💪 ${originalTarget.name} gains +${attackBonus} attack from being rescued!`,
        originalTarget.side === 'player' ? 'success' : 'info'
    );
    
    // Sync to guest
    if (battleManager.isAuthoritative) {
        battleManager.sendBattleUpdate('rescue_mission_activated', {
            rescuerAbsoluteSide: rescuer.absoluteSide,
            rescuerPosition: rescuer.position,
            rescuerName: rescuer.name,
            targetAbsoluteSide: originalTarget.absoluteSide,
            targetPosition: originalTarget.position,
            targetName: originalTarget.name,
            damage: damage,
            attackBonus: attackBonus,
            timestamp: Date.now()
        });
    }
    
    // Now apply the damage to the rescuer instead    
    battleManager.addCombatLog(
        `💥 ${rescuer.name} takes ${damage} damage to protect ${originalTarget.name}!`,
        rescuer.side === 'player' ? 'error' : 'success'
    );
    
    // Apply damage to the rescuer (mark context to prevent infinite loops)
    const rescuerContext = {
        ...context,
        isRescueMissionDamage: true, // Prevent triggering another Rescue Mission
        preventRevival: false // Allow normal revival mechanics
    };
    
    await battleManager.combatManager.authoritative_applyDamage({
        target: rescuer,
        damage: damage,
        newHp: Math.max(0, rescuer.currentHp - damage),
        died: (rescuer.currentHp - damage) <= 0
    }, rescuerContext);
    
    // Small delay after rescue completes
    await battleManager.delay(300);
}

/**
 * GUEST: Handle Rescue Mission activation from host
 * @param {Object} data - Rescue data from host
 * @param {Object} battleManager - The battle manager instance
 */
export async function handleGuestRescueMission(data, battleManager) {
    if (battleManager.isAuthoritative) {
        console.warn('Host should not receive rescue mission guest messages');
        return;
    }
    
    const { 
        rescuerAbsoluteSide, rescuerPosition, rescuerName,
        targetAbsoluteSide, targetPosition, targetName,
        damage, attackBonus
    } = data;
    
    // Determine local sides for guest
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const rescuerLocalSide = (rescuerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    
    // Find the heroes
    const rescuerHeroes = rescuerLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
    const targetHeroes = targetLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
    
    const rescuer = rescuerHeroes[rescuerPosition];
    const originalTarget = targetHeroes[targetPosition];
    
    if (!rescuer || !originalTarget) {
        console.error('Guest: Heroes not found for Rescue Mission');
        return;
    }
    
    // Add combat log
    battleManager.addCombatLog(
        `🦸 ${rescuerName}'s Rescue Mission activates! Intercepting damage for ${targetName}!`,
        rescuerLocalSide === 'player' ? 'success' : 'error'
    );
    
    // Animate the dash
    if (battleManager.animationManager) {
        await battleManager.animationManager.animateMoniaProtectionDash(rescuer, originalTarget);
    }
    
    // Apply attack bonus to the rescued hero
    originalTarget.addBattleAttackBonus(attackBonus);
    battleManager.updateHeroAttackDisplay(targetLocalSide, targetPosition, originalTarget);
    
    battleManager.addCombatLog(
        `💪 ${targetName} gains +${attackBonus} attack from being rescued!`,
        targetLocalSide === 'player' ? 'success' : 'info'
    );
    
    battleManager.addCombatLog(
        `💥 ${rescuerName} takes ${damage} damage to protect ${targetName}!`,
        rescuerLocalSide === 'player' ? 'error' : 'success'
    );
}

export default {
    checkRescueMissionInterception,
    handleGuestRescueMission
};