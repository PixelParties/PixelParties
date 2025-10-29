// cpuHelpers.js - Shared utility functions for CPU team updates

import { getCardInfo } from './cardDatabase.js';

/**
 * Count ability stacks for a specific ability
 * @param {Object} abilities - Abilities data structure
 * @param {string} position - Hero position
 * @param {string} abilityName - Name of ability to count
 * @returns {number} Stack count
 */
export function countAbilityStacks(abilities, position, abilityName) {
    const heroAbilities = abilities[position];
    if (!heroAbilities) return 0;
    
    let count = 0;
    ['zone1', 'zone2', 'zone3'].forEach(zone => {
        if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
            count += heroAbilities[zone].filter(a => a && a.name === abilityName).length;
        }
    });
    
    return count;
}

/**
 * Sort creatures for a given hero position following complex priority rules
 * @param {Array} creatures - Array of creature objects
 * @param {Object} formation - Team formation object
 * @returns {Array} Sorted array of creatures
 */
export function sortCreatureOrder(creatures, formation) {
    if (!creatures || creatures.length === 0) return creatures;
    
    // Check if Gon or Luna exist in the formation
    const hasGon = ['left', 'center', 'right'].some(pos => 
        formation[pos] && formation[pos].name === 'Gon'
    );
    const hasLuna = ['left', 'center', 'right'].some(pos => 
        formation[pos] && formation[pos].name === 'Luna'
    );
    
    // Categorize creatures with their sorting priorities
    const categorized = creatures.map(creature => {
        const creatureName = creature.name || creature.cardName || creature;
        const creatureInfo = getCardInfo(creatureName);
        const level = creatureInfo ? (creatureInfo.level || 0) : 0;
        
        // Determine priority tier (lower number = earlier in array)
        let tier = 3; // Default: normal level-based sorting
        let subtier = level; // Within tier, sort by level (lower first)
        
        // Tier 0: Cavalry (always first)
        if (creatureName === 'Cavalry') {
            tier = 0;
            subtier = 0;
        }
        // Tier 1: Skeleton creatures (except SkeletonNecromancer)
        else if (creatureName.includes('Skeleton') && creatureName !== 'SkeletonNecromancer') {
            tier = 1;
            subtier = level; // Sorted by level among skeletons
        }
        // Tier 2: CutePhoenix (in front despite high level)
        else if (creatureName === 'CutePhoenix') {
            tier = 2;
            subtier = 0;
        }
        // Tier 3: Normal creatures (sorted by level)
        else if (creatureName === 'Cold-HeartedYuki-Onna' && hasGon) {
            tier = 4; // Move to back if Gon exists
            subtier = level;
        }
        else if (creatureName === 'LunaKiai' && hasLuna) {
            tier = 4; // Move to back if Luna exists
            subtier = level;
        }
        // 50% chance to move certain creatures to back
        else if (['RoyalCorgi', 'GrinningCat', 'ExplodingSkull', 'CrumTheClassPet'].includes(creatureName)) {
            if (Math.random() < 0.5) {
                tier = 4; // Move to back
                subtier = level;
            }
        }
        // Tier 5: SkeletonNecromancer (near end)
        else if (creatureName === 'SkeletonNecromancer') {
            tier = 5;
            subtier = 0;
        }
        // Tier 6: TheRootOfAllEvil (absolute end)
        else if (creatureName === 'TheRootOfAllEvil') {
            tier = 6;
            subtier = 0;
        }
        
        return {
            creature,
            tier,
            subtier,
            level
        };
    });
    
    // Sort by tier first, then by subtier (level) within each tier
    categorized.sort((a, b) => {
        if (a.tier !== b.tier) {
            return a.tier - b.tier; // Lower tier first
        }
        return a.subtier - b.subtier; // Lower level/subtier first within same tier
    });
    
    // Return just the creature objects
    return categorized.map(item => item.creature);
}