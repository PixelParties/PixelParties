// smartHeroSelection.js - Intelligent hero selection for CPU teams
// Implements weighted hero selection based on order, tags, wants, and avoids

import { getHeroInfo } from './cardDatabase.js';
import { getDifficultyValue } from './cpuDifficultyConfig.js';

/**
 * Calculate the weight multiplier for a hero based on their order attribute
 * @param {Array|null} orderArray - The hero's preferred positions [1], [2,3], etc.
 * @param {number} position - Current position being filled (1, 2, or 3)
 * @param {string} difficulty - Difficulty level ('Easy', 'Normal', or 'Hard')
 * @returns {number} - Multiplier for this hero
 */
function getOrderMultiplier(orderArray, position, difficulty = 'Normal') {
    // If order is null, no modifier
    if (!orderArray || orderArray.length === 0) {
        return 1.0;
    }

    // Handle case where order might be a single number instead of array (Mary's case)
    const order = Array.isArray(orderArray) ? orderArray : [orderArray];

    // Check if this position is in the preferred order
    if (order.includes(position)) {
        // Hero wants this position - use difficulty-based multiplier
        const preferredMultiplier = getDifficultyValue(difficulty, 'positioning', 'preferredPositionMultiplier');
        return preferredMultiplier;
    }

    // Hero doesn't want this position - apply penalties based on position
    if (position === 1) {
        // For position 1: penalize if they only want 2, or only want 3
        if (order.includes(2) && !order.includes(3)) {
            return 0.5; // Only wants 2
        }
        if (order.includes(3) && !order.includes(2)) {
            return 0.5; // Only wants 3
        }
        if (order.includes(2) && order.includes(3)) {
            return 0.5; // Wants 2 and 3, not 1
        }
    } else if (position === 2) {
        // For position 2: penalize if they want 3 but not 2, or only want 1
        if (order.includes(3) && !order.includes(2)) {
            return 0.75; // Wants 3, not 2
        }
        if (order.length === 1 && order[0] === 1) {
            return 0.5; // Only wants 1
        }
    } else if (position === 3) {
        // For position 3: penalize if they want 2 but not 3, or only want 1
        if (order.includes(2) && !order.includes(3)) {
            return 0.75; // Wants 2, not 3
        }
        if (order.length === 1 && order[0] === 1) {
            return 0.5; // Only wants 1
        }
    }

    return 1.0; // Default (shouldn't normally reach here)
}

/**
 * Calculate tag-based multiplier for first hero selection
 * @param {Array<string>} tags - Hero's tags
 * @returns {number} - Multiplier based on tags
 */
function getFirstHeroTagMultiplier(tags) {
    if (!tags || tags.length === 0) {
        return 1.0;
    }

    const positiveTagsPresent = tags.some(tag => 
        ['Needs Action', 'Damage Dealer', 'Summoner', 'Attacker', 'High-Value', 'Multiple Actions'].includes(tag)
    );
    const isSupport = tags.includes('Support');

    if (isSupport && positiveTagsPresent) {
        return 0.85; // Both support and positive tags
    } else if (isSupport) {
        return 0.75; // Only support (25% reduction)
    } else if (positiveTagsPresent) {
        return 1.25; // Only positive tags (25% bonus, not stacking)
    }

    return 1.0; // No relevant tags
}

/**
 * Get all tags from current team members
 * @param {Object} currentFormation - Current team formation
 * @returns {Array<string>} - Combined list of all tags
 */
function getTeamTags(currentFormation) {
    const allTags = [];
    
    ['left', 'center', 'right'].forEach(pos => {
        if (currentFormation[pos]) {
            const heroInfo = getHeroInfo(currentFormation[pos].name);
            if (heroInfo && heroInfo.tags) {
                allTags.push(...heroInfo.tags);
            }
        }
    });

    return allTags;
}

/**
 * Get combined wants from current team members
 * @param {Object} currentFormation - Current team formation
 * @returns {Array<string>} - Combined list of all wants
 */
function getTeamWants(currentFormation) {
    const allWants = [];
    
    ['left', 'center', 'right'].forEach(pos => {
        if (currentFormation[pos]) {
            const heroInfo = getHeroInfo(currentFormation[pos].name);
            if (heroInfo && heroInfo.wants) {
                allWants.push(...heroInfo.wants);
            }
        }
    });

    return allWants;
}

/**
 * Get combined avoids from current team members
 * @param {Object} currentFormation - Current team formation
 * @returns {Array<string>} - Combined list of all avoids
 */
function getTeamAvoids(currentFormation) {
    const allAvoids = [];
    
    ['left', 'center', 'right'].forEach(pos => {
        if (currentFormation[pos]) {
            const heroInfo = getHeroInfo(currentFormation[pos].name);
            if (heroInfo && heroInfo.avoids) {
                allAvoids.push(...heroInfo.avoids);
            }
        }
    });

    return allAvoids;
}

/**
 * Resolve wants and avoids, canceling out conflicts
 * @param {Array<string>} wants - List of wanted tags
 * @param {Array<string>} avoids - List of avoided tags
 * @returns {Object} - {resolvedWants: Array, resolvedAvoids: Array}
 */
function resolveWantsAndAvoids(wants, avoids) {
    const wantsCopy = [...wants];
    const avoidsCopy = [...avoids];

    // Count occurrences of each tag
    const wantCounts = {};
    const avoidCounts = {};

    wantsCopy.forEach(tag => {
        wantCounts[tag] = (wantCounts[tag] || 0) + 1;
    });

    avoidsCopy.forEach(tag => {
        avoidCounts[tag] = (avoidCounts[tag] || 0) + 1;
    });

    // Cancel out conflicts
    const resolvedWants = [];
    const resolvedAvoids = [];

    // Process wants
    for (const tag in wantCounts) {
        const wantCount = wantCounts[tag];
        const avoidCount = avoidCounts[tag] || 0;
        const remaining = wantCount - avoidCount;

        for (let i = 0; i < remaining; i++) {
            resolvedWants.push(tag);
        }
    }

    // Process avoids
    for (const tag in avoidCounts) {
        const avoidCount = avoidCounts[tag];
        const wantCount = wantCounts[tag] || 0;
        const remaining = avoidCount - wantCount;

        for (let i = 0; i < remaining; i++) {
            resolvedAvoids.push(tag);
        }
    }

    return { resolvedWants, resolvedAvoids };
}

/**
 * Calculate compatibility multiplier for a candidate hero based on team wants/avoids
 * @param {Object} heroInfo - Hero information from database
 * @param {Array<string>} resolvedWants - Team's resolved wanted tags
 * @param {Array<string>} resolvedAvoids - Team's resolved avoided tags
 * @param {string} difficulty - Difficulty level ('Easy', 'Normal', or 'Hard')
 * @returns {number} - Compatibility multiplier
 */
function getCompatibilityMultiplier(heroInfo, resolvedWants, resolvedAvoids, difficulty = 'Normal') {
    if (!heroInfo || !heroInfo.tags) {
        return 1.0;
    }

    let multiplier = 1.0;

    // Get difficulty-based multipliers
    const wantsMultiplier = getDifficultyValue(difficulty, 'heroSelection', 'compatibilityWantsMultiplier');
    const avoidsMultiplier = getDifficultyValue(difficulty, 'heroSelection', 'compatibilityAvoidsMultiplier');

    // Check each hero tag against wants and avoids
    heroInfo.tags.forEach(tag => {
        // Count how many times this tag appears in wants
        const wantMatches = resolvedWants.filter(t => t === tag).length;
        // Count how many times this tag appears in avoids
        const avoidMatches = resolvedAvoids.filter(t => t === tag).length;

        // Apply bonuses for wants (multiplicative)
        for (let i = 0; i < wantMatches; i++) {
            multiplier *= wantsMultiplier;
        }

        // Apply penalties for avoids (multiplicative)
        for (let i = 0; i < avoidMatches; i++) {
            multiplier *= avoidsMultiplier;
        }
    });

    return multiplier;
}

/**
 * Calculate weight for a hero based on position and current team
 * @param {string} heroName - Name of the hero
 * @param {number} position - Position being filled (1, 2, or 3)
 * @param {Object} currentFormation - Current team formation (for positions 2+)
 * @param {string} difficulty - Difficulty level ('Easy', 'Normal', or 'Hard')
 * @returns {number} - Weight for this hero
 */
function calculateHeroWeight(heroName, position, currentFormation = null, difficulty = 'Normal') {
    const heroInfo = getHeroInfo(heroName);
    if (!heroInfo) {
        return 0; // Invalid hero
    }

    let weight = 1.0;

    // Apply order multiplier
    const orderMultiplier = getOrderMultiplier(heroInfo.order, position, difficulty);
    weight *= orderMultiplier;

    if (position === 1) {
        // First hero: apply tag-based multipliers
        const tagMultiplier = getFirstHeroTagMultiplier(heroInfo.tags);
        weight *= tagMultiplier;
    } else {
        // Second or third hero: apply team compatibility
        if (currentFormation) {
            const teamWants = getTeamWants(currentFormation);
            const teamAvoids = getTeamAvoids(currentFormation);
            const { resolvedWants, resolvedAvoids } = resolveWantsAndAvoids(teamWants, teamAvoids);
            
            const compatMultiplier = getCompatibilityMultiplier(heroInfo, resolvedWants, resolvedAvoids, difficulty);
            weight *= compatMultiplier;
        }
    }

    // Ensure weight never goes below a minimum threshold
    const MINIMUM_WEIGHT = 0.01;
    return Math.max(weight, MINIMUM_WEIGHT);
}

/**
 * Select a hero using weighted random selection
 * @param {Array<string>} availableHeroes - List of hero names to choose from
 * @param {number} position - Position being filled (1, 2, or 3)
 * @param {Object} currentFormation - Current team formation (for positions 2+)
 * @param {string} difficulty - Difficulty level ('Easy', 'Normal', or 'Hard')
 * @returns {string} - Selected hero name
 */
export function selectSmartHero(availableHeroes, position, currentFormation = null, difficulty = 'Normal') {
    if (!availableHeroes || availableHeroes.length === 0) {
        return null;
    }

    // If only one hero available, return it
    if (availableHeroes.length === 1) {
        return availableHeroes[0];
    }

    // Calculate weights for all available heroes
    const weights = availableHeroes.map(heroName => 
        calculateHeroWeight(heroName, position, currentFormation, difficulty)
    );

    // Calculate total weight
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Select a random hero based on weights
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < availableHeroes.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return availableHeroes[i];
        }
    }

    // Fallback (should never reach here)
    return availableHeroes[availableHeroes.length - 1];
}

/**
 * Select 3 heroes for a complete team using smart selection
 * @param {Array<string>} availableHeroes - List of all available hero names
 * @param {string} difficulty - Difficulty level ('Easy', 'Normal', or 'Hard')
 * @returns {Array<string>} - Array of 3 selected hero names
 */
export function selectSmartTeam(availableHeroes, difficulty = 'Normal') {
    if (!availableHeroes || availableHeroes.length < 3) {
        // Fallback to random if not enough heroes
        return availableHeroes.slice(0, 3);
    }

    const selectedHeroes = [];
    const remaining = [...availableHeroes];

    // Select first hero
    const firstHero = selectSmartHero(remaining, 1, null, difficulty);
    selectedHeroes.push(firstHero);
    remaining.splice(remaining.indexOf(firstHero), 1);

    // Build formation with first hero for context
    const formationAfterFirst = {
        left: { name: firstHero },
        center: null,
        right: null
    };

    // Select second hero
    const secondHero = selectSmartHero(remaining, 2, formationAfterFirst, difficulty);
    selectedHeroes.push(secondHero);
    remaining.splice(remaining.indexOf(secondHero), 1);

    // Build formation with first two heroes for context
    const formationAfterSecond = {
        left: { name: firstHero },
        center: { name: secondHero },
        right: null
    };

    // Select third hero
    const thirdHero = selectSmartHero(remaining, 3, formationAfterSecond, difficulty);
    selectedHeroes.push(thirdHero);

    return selectedHeroes;
}