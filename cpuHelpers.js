// cpuHelpers.js - Shared utility functions for CPU team updates

import { getCardInfo } from './cardDatabase.js';
import { getDifficultyValue } from './cpuDifficultyConfig.js';

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
 * Intelligently position heroes based on their position preferences and priorities
 * @param {Object} formation - Current formation with heroes
 * @param {string} difficulty - Difficulty level ('Easy', 'Normal', or 'Hard')
 * @returns {Object} New formation with intelligently positioned heroes
 */
export function positionHeroesIntelligently(formation, difficulty = 'Normal') {
    // Collect all heroes from formation
    const heroes = [];
    ['left', 'center', 'right'].forEach(pos => {
        if (formation[pos]) {
            heroes.push({
                hero: formation[pos],
                originalPos: pos
            });
        }
    });

    if (heroes.length === 0) {
        return { left: null, center: null, right: null };
    }

    // Get difficulty-based random positioning chance
    const randomChance = getDifficultyValue(difficulty, 'positioning', 'randomChance');
    const roll = Math.random();

    if (roll < randomChance) {
        // Complete randomization
        console.log(`[${difficulty}] CPU positioning: Random (${(roll * 100).toFixed(1)}% < ${(randomChance * 100).toFixed(0)}%)`);
        return completelyRandomizeHeroes(heroes);
    } else {
        // Intelligent positioning
        console.log(`[${difficulty}] CPU positioning: Intelligent (${(roll * 100).toFixed(1)}% >= ${(randomChance * 100).toFixed(0)}%)`);
        return intelligentPositioning(heroes);
    }
}

/**
 * Completely randomize hero positions (used on 1-15 roll)
 * @param {Array} heroes - Array of hero objects with their data
 * @returns {Object} Formation with randomly positioned heroes
 */
function completelyRandomizeHeroes(heroes) {
    // Shuffle heroes
    const shuffled = [...heroes];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Place in formation
    const formation = { left: null, center: null, right: null };
    const slots = ['left', 'center', 'right'];
    
    shuffled.forEach((heroObj, index) => {
        if (index < slots.length) {
            formation[slots[index]] = heroObj.hero;
        }
    });

    return formation;
}

/**
 * Position heroes intelligently based on their position attributes
 * @param {Array} heroes - Array of hero objects with their data
 * @returns {Object} Formation with intelligently positioned heroes
 */
function intelligentPositioning(heroes) {
    const formation = { left: null, center: null, right: null };
    
    // Get hero info with position preferences
    const heroesWithPreferences = heroes.map(heroObj => {
        const heroInfo = getCardInfo(heroObj.hero.name);
        let preferredPositions = [];
        let priority = 0;
        
        if (heroInfo && heroInfo.position) {
            preferredPositions = heroInfo.position[0] || [];
            priority = heroInfo.position[1] || 0;
        }
        
        return {
            hero: heroObj.hero,
            preferredPositions,
            priority,
            randomTieBreaker: Math.random() // For randomizing equal priorities
        };
    });

    // Sort by priority (highest first), randomize ties
    heroesWithPreferences.sort((a, b) => {
        if (b.priority !== a.priority) {
            return b.priority - a.priority; // Higher priority first
        }
        return a.randomTieBreaker - b.randomTieBreaker; // Random tiebreaker
    });

    // Track which positions are filled
    const filledPositions = new Set();
    const unplacedHeroes = [];

    // First pass: Place heroes with preferences
    for (const heroData of heroesWithPreferences) {
        if (heroData.preferredPositions.length === 0) {
            // No preferences, save for later
            unplacedHeroes.push(heroData.hero);
            continue;
        }

        // Convert 1-3 positions to position names and filter available ones
        const availablePreferences = heroData.preferredPositions
            .map(pos => {
                if (pos === 1) return 'left';
                if (pos === 2) return 'center';
                if (pos === 3) return 'right';
                return null;
            })
            .filter(posName => posName && !filledPositions.has(posName));

        if (availablePreferences.length > 0) {
            // Pick random available preferred position
            const chosenPosition = availablePreferences[
                Math.floor(Math.random() * availablePreferences.length)
            ];
            formation[chosenPosition] = heroData.hero;
            filledPositions.add(chosenPosition);
        } else {
            // All preferred positions taken, save for later
            unplacedHeroes.push(heroData.hero);
        }
    }

    // Second pass: Place remaining heroes in any free positions
    const allPositions = ['left', 'center', 'right'];
    const freePositions = allPositions.filter(pos => !filledPositions.has(pos));
    
    // Shuffle free positions for randomness
    for (let i = freePositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [freePositions[i], freePositions[j]] = [freePositions[j], freePositions[i]];
    }

    unplacedHeroes.forEach((hero, index) => {
        if (index < freePositions.length) {
            formation[freePositions[index]] = hero;
        }
    });

    // Final step: Shift all heroes left to remove gaps (for teams with < 3 heroes)
    return shiftHeroesLeft(formation);
}

/**
 * Shift heroes left to remove gaps in formation
 * @param {Object} formation - Formation to shift
 * @returns {Object} Shifted formation
 */
function shiftHeroesLeft(formation) {
    const heroes = [];
    ['left', 'center', 'right'].forEach(pos => {
        if (formation[pos]) {
            heroes.push(formation[pos]);
        }
    });

    const shifted = { left: null, center: null, right: null };
    const slots = ['left', 'center', 'right'];
    
    heroes.forEach((hero, index) => {
        if (index < slots.length) {
            shifted[slots[index]] = hero;
        }
    });

    return shifted;
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