// cpuSmartDraft.js - Intelligent CPU Card Drafting System

import { getCardInfo, getAllCardNames } from './cardDatabase.js';
import { canHeroUseSpell } from './spellValidation.js';
import { countAbilityStacks } from './cpuHelpers.js';
import { getDifficultyValue } from './cpuDifficultyConfig.js';

/**
 * Calculate smart mode activation probability based on human player's win/loss ratio
 * @param {number} wins - Number of wins (trophies)
 * @param {number} losses - Number of losses (10 - hearts)
 * @returns {number} Probability between 0 and 1
 */
function calculateSmartModeChance(wins, losses) {
    // Handle edge cases
    if (losses === 0) {
        // Player has no losses - if they have wins, give high chance
        return wins > 0 ? 1.0 : 0.0;
    }
    
    const ratio = wins / losses;
    
    // At ratio 0 (no wins): 0% chance
    if (ratio === 0) {
        return 0.0;
    }
    
    // At ratio >= 1.5: 100% chance
    if (ratio >= 1.5) {
        return 1.0;
    }
    
    // Below ratio 1.0: slow linear scaling (0% at 0, 30% at 1.0)
    if (ratio < 1.0) {
        return ratio * 0.3;
    }
    
    // Between ratio 1.0 and 1.5: exponential growth (30% to 100%)
    // Formula: 30% * e^(k * (ratio - 1.0))
    // Where k ≈ 2.4 to reach 100% at ratio 1.5
    const k = 2.4;
    const chance = 0.3 * Math.exp(k * (ratio - 1.0));
    
    // Ensure we don't exceed 100%
    return Math.min(1.0, chance);
}

/**
 * Check if a CPU team can use a Spell card
 * @param {string} spellCardName - Name of the spell
 * @param {Object} cpuTeam - CPU team data with formation, abilities, creatures, graveyard
 * @returns {boolean} True if at least one hero can learn this spell
 */
function canCPUTeamUseSpell(spellCardName, cpuTeam) {
    const positions = ['left', 'center', 'right'];
    
    for (const position of positions) {
        if (!cpuTeam.formation[position]) continue;
        
        // Build context for spell validation
        const context = {
            formation: cpuTeam.formation,
            abilities: cpuTeam.abilities || {},
            creatures: cpuTeam.creatures || { left: [], center: [], right: [] },
            graveyard: cpuTeam.graveyard || []
        };
        
        // Check if this hero can use the spell
        const result = canHeroUseSpell(position, spellCardName, context);
        
        // If the spell can be used (or is available via gold learning), it's valid
        if (result.canUse || result.isSemiGoldLearning || result.isDarkDealGoldLearning) {
            return true;
        }
    }
    
    return false;
}

/**
 * Check if CPU team has too many Potions already
 * @param {Object} cpuTeam - CPU team data with deck, formation, abilities
 * @returns {boolean} True if team has reached potion limit
 */
function hasTooManyPotions(cpuTeam) {
    // Count current potions in deck
    const deck = cpuTeam.deck || [];
    let potionCount = 0;
    
    for (const cardName of deck) {
        const cardInfo = getCardInfo(cardName);
        if (cardInfo && cardInfo.cardType === 'Potion') {
            potionCount++;
        }
    }
    
    // Calculate Alchemy limit
    let totalAlchemyLevel = 0;
    const positions = ['left', 'center', 'right'];
    
    for (const position of positions) {
        if (cpuTeam.formation[position] && cpuTeam.abilities && cpuTeam.abilities[position]) {
            totalAlchemyLevel += countAbilityStacks(cpuTeam.abilities, position, 'Alchemy');
        }
    }
    
    const potionLimit = totalAlchemyLevel + 3;
    
    // Return true if at or above limit
    return potionCount >= potionLimit;
}

/**
 * Check if a card is valid for CPU drafting (handles Spell and Potion restrictions)
 * @param {string} cardName - Card to validate
 * @param {Object} cpuTeam - CPU team data
 * @returns {boolean} True if card can be drafted
 */
function isCardValidForDrafting(cardName, cpuTeam) {
    const cardInfo = getCardInfo(cardName);
    if (!cardInfo) return false;
    
    // Check Spell restrictions
    if (cardInfo.cardType === 'Spell') {
        if (!canCPUTeamUseSpell(cardName, cpuTeam)) {
            return false;
        }
    }
    
    // Check Potion restrictions
    if (cardInfo.cardType === 'Potion') {
        if (hasTooManyPotions(cpuTeam)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Collect all counteredBy tags from human player's heroes
 * @param {Object} humanTeam - Human player's team data with formation
 * @returns {Array<string>} Array of counteredBy tags (with duplicates)
 */
function collectHumanCounteredByTags(humanTeam) {
    const tags = [];
    const positions = ['left', 'center', 'right'];
    
    for (const position of positions) {
        const hero = humanTeam.formation[position];
        if (!hero) continue;
        
        const heroInfo = getCardInfo(hero.name);
        if (heroInfo && heroInfo.counteredBy && Array.isArray(heroInfo.counteredBy)) {
            tags.push(...heroInfo.counteredBy);
        }
    }
    
    return tags;
}

/**
 * Find all cards that match a specific counter type
 * @param {string} counterTag - Counter tag to match
 * @param {Object} cpuTeam - CPU team data for validation
 * @returns {Array<string>} Array of matching card names
 */
function findCardsWithCounterType(counterTag, cpuTeam) {
    const allCardNames = getAllCardNames();
    const matchingCards = [];
    
    for (const cardName of allCardNames) {
        const cardInfo = getCardInfo(cardName);
        if (!cardInfo) continue;
        
        // Check if card has the counterType we're looking for
        if (cardInfo.counterType && Array.isArray(cardInfo.counterType)) {
            if (cardInfo.counterType.includes(counterTag)) {
                // Validate the card before adding
                if (isCardValidForDrafting(cardName, cpuTeam)) {
                    matchingCards.push(cardName);
                }
            }
        }
    }
    
    return matchingCards;
}

/**
 * Attempt to draft a smart counter card
 * @param {Object} humanTeam - Human player's team data
 * @param {Object} cpuTeam - CPU team data
 * @returns {string|null} Selected card name or null if no valid counter found
 */
function draftSmartCounterCard(humanTeam, cpuTeam) {
    // Collect all counteredBy tags from human heroes
    const counteredByTags = collectHumanCounteredByTags(humanTeam);
    
    if (counteredByTags.length === 0) {
        console.log('Smart draft: No counteredBy tags found on human heroes');
        return null;
    }
    
    // Shuffle the tags (with duplicates included for weighted selection)
    const shuffledTags = [...counteredByTags].sort(() => Math.random() - 0.5);
    
    // Try each tag until we find a valid card
    for (const tag of shuffledTags) {
        const matchingCards = findCardsWithCounterType(tag, cpuTeam);
        
        if (matchingCards.length > 0) {
            // Pick a random card from matching ones
            const selectedCard = matchingCards[Math.floor(Math.random() * matchingCards.length)];
            console.log(`Smart draft: Selected ${selectedCard} to counter tag "${tag}"`);
            return selectedCard;
        }
    }
    
    // No valid counter cards found
    console.error('Smart draft: No valid counter cards found for any of the following tags:', 
                  [...new Set(counteredByTags)].join(', '));
    return null;
}

/**
 * Main function: Determine if smart mode activates and draft accordingly
 * @param {Object} humanTeam - Human player's team data with formation, trophies, hearts
 * @param {Object} cpuTeam - CPU team data
 * @param {string} difficulty - Difficulty level ('Easy', 'Normal', or 'Hard')
 * @returns {Object} { useSmartMode: boolean, selectedCard: string|null }
 */
export function attemptSmartDraft(humanTeam, cpuTeam, difficulty = 'Normal') {
    // Extract win/loss data
    const wins = humanTeam.trophies || 0;
    const hearts = humanTeam.hearts || 10;
    const losses = 10 - hearts;
    
    // Calculate smart mode activation chance
    const baseChance = calculateSmartModeChance(wins, losses);
    
    // Apply difficulty multiplier
    const difficultyMultiplier = getDifficultyValue(difficulty, 'smartDraft', 'activationMultiplier');
    const smartChance = Math.min(1.0, baseChance * difficultyMultiplier);
    
    // Roll for activation
    const roll = Math.random();
    const activated = roll < smartChance;
    
    console.log(`Smart Draft Check: W/L ratio ${wins}/${losses} = ${losses > 0 ? (wins/losses).toFixed(2) : 'N/A'}, ` +
                `chance: ${(smartChance * 100).toFixed(1)}%, roll: ${(roll * 100).toFixed(1)}%, ` +
                `activated: ${activated}`);
    
    if (!activated) {
        return { useSmartMode: false, selectedCard: null };
    }
    
    // Smart mode activated! Try to draft a counter card
    const selectedCard = draftSmartCounterCard(humanTeam, cpuTeam);
    
    return {
        useSmartMode: true,
        selectedCard: selectedCard // null means fallback to random mode
    };
}

/**
 * Utility function to test smart mode probabilities (for debugging)
 */
export function testSmartModeChances() {
    console.log('\n=== Smart Mode Activation Probabilities ===');
    
    const testCases = [
        { wins: 0, losses: 4, desc: '0 wins, 4 losses' },
        { wins: 2, losses: 4, desc: '2 wins, 4 losses (0.5 ratio)' },
        { wins: 3, losses: 4, desc: '3 wins, 4 losses (0.75 ratio)' },
        { wins: 4, losses: 4, desc: '4 wins, 4 losses (1.0 ratio)' },
        { wins: 5, losses: 4, desc: '5 wins, 4 losses (1.25 ratio)' },
        { wins: 6, losses: 4, desc: '6 wins, 4 losses (1.5 ratio)' },
        { wins: 8, losses: 4, desc: '8 wins, 4 losses (2.0 ratio)' },
        { wins: 10, losses: 0, desc: '10 wins, 0 losses (perfect)' }
    ];
    
    testCases.forEach(({ wins, losses, desc }) => {
        const chance = calculateSmartModeChance(wins, losses);
        const ratio = losses > 0 ? (wins / losses).toFixed(2) : 'INF';
        console.log(`${desc} (ratio: ${ratio}): ${(chance * 100).toFixed(1)}%`);
    });
    
    console.log('=========================================\n');
}