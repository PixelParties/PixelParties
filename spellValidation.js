// spellValidation.js - Centralized Spell Validation Rules
// This module contains ALL special spell rules and validation logic
// Used by both handManager.js (players) and generateComputerParty.js (CPU)

import { getCardInfo } from './cardDatabase.js';

/**
 * CENTRALIZED SPELL VALIDATION
 * 
 * This function checks if a hero can use/learn a spell based on ALL game rules.
 * It works with both player heroes (via heroSelection context) and CPU heroes (via raw data).
 * 
 * @param {string} heroPosition - 'left', 'center', or 'right'
 * @param {string} spellCardName - Name of the spell card
 * @param {Object} context - Either heroSelection OR { formation, abilities, creatures, graveyard }
 * @returns {Object} { canUse: boolean, reason: string, ...additional data }
 */
export function canHeroUseSpell(heroPosition, spellCardName, context) {
    if (!spellCardName) {
        return { canUse: false, reason: "Invalid parameters" };
    }
    
    // Get card info
    const cardInfo = getCardInfo(spellCardName);
    if (!cardInfo || cardInfo.cardType !== 'Spell') {
        return { canUse: false, reason: "Not a valid spell card" };
    }
    
    // Extract data from context (works for both player and CPU)
    const formation = extractFormation(context);
    const abilities = extractAbilities(context, heroPosition);
    const creatures = extractCreatures(context, heroPosition);
    const graveyard = extractGraveyard(context);
    
    if (!formation) {
        return { canUse: false, reason: "Formation not available" };
    }
    
    const hero = formation[heroPosition];
    
    // Check 1: Is there a hero in the slot?
    if (!hero) {
        return { canUse: false, reason: "You can't add Spells to an empty slot!" };
    }
    
    // Check 2: Spellbook restrictions (skip for Area spells - they're cast from hand, not learned)
    if (cardInfo.subtype !== 'Area') {
        const spellbookCheck = checkSpellbookRestrictions(heroPosition, spellCardName, context);
        if (spellbookCheck && !spellbookCheck.canLearn) {
            return { canUse: false, reason: spellbookCheck.reason };
        }
    }
    
    // Check 3: Special free-cast conditions (bypass normal requirements)
    const freeCastCheck = checkFreeCastConditions(
        spellCardName, 
        heroPosition, 
        hero, 
        abilities, 
        creatures, 
        graveyard
    );
    
    if (freeCastCheck.isFree) {
        return { canUse: true, isFree: true, heroName: hero.name };
    }
    
    // Check 4: Special exception for Cavalry (3 total heroes)
    if (spellCardName === 'Cavalry') {
        const totalHeroes = Object.values(formation).filter(h => h !== null && h !== undefined).length;
        if (totalHeroes >= 3) {
            return { canUse: true, heroName: hero.name };
        }
    }
    
    // Check 5: Normal spell level requirements
    const levelCheck = checkSpellLevelRequirements(
        spellCardName,
        cardInfo,
        hero,
        abilities,
        creatures,
        graveyard,
        formation,
        context
    );
    
    return levelCheck;
}

/**
 * Check if a spell requires an action to use
 * Considers free-cast conditions that bypass action requirements
 * 
 * @param {string} spellCardName - Name of the spell
 * @param {string|null} heroPosition - Hero position (null for base check)
 * @param {Object} context - Either heroSelection OR { formation, abilities, creatures, graveyard }
 * @returns {boolean} True if spell needs an action
 */
export function doesSpellNeedAction(spellCardName, heroPosition, context) {
    if (!spellCardName) return false;
    
    const cardInfo = getCardInfo(spellCardName);
    if (!cardInfo || cardInfo.cardType !== 'Spell') {
        return false;
    }
    
    // If the card doesn't normally require an action, return false
    if (!cardInfo.action) {
        return false;
    }
    
    // If no hero position provided, return the base action requirement
    if (heroPosition === null) {
        return true;
    }
    
    // Extract data from context
    const abilities = extractAbilities(context, heroPosition);
    const creatures = extractCreatures(context, heroPosition);
    const graveyard = extractGraveyard(context);
    
    // Check for free-cast conditions that bypass action requirements
    
    // FrontSoldier: free if hero has no creatures
    if (spellCardName === 'FrontSoldier') {
        if (creatures.length === 0) {
            return false; // No action needed when free
        }
    }
    
    // FutureTechDrone: free if 3+ in graveyard
    if (spellCardName === 'FutureTechDrone') {
        const droneCount = graveyard.filter(card => card === 'FutureTechDrone').length;
        if (droneCount >= 3) {
            return false; // No action needed when free
        }
    }
    
    // Archer: free with Leadership 3+
    if (spellCardName === 'Archer') {
        const leadershipLevel = countAbilityStacks(abilities, 'Leadership');
        if (leadershipLevel >= 3) {
            return false; // No action needed when free
        }
    }
    
    // Default: spell requires action
    return true;
}

// ============================================
// HELPER FUNCTIONS - CONTEXT EXTRACTION
// ============================================

/**
 * Extract formation from context (works for both player and CPU)
 */
function extractFormation(context) {
    // Player context (heroSelection)
    if (context.formationManager) {
        return context.formationManager.getBattleFormation();
    }
    
    // CPU context (raw data)
    if (context.formation) {
        return context.formation;
    }
    
    return null;
}

/**
 * Extract abilities for a hero (works for both player and CPU)
 */
function extractAbilities(context, heroPosition) {
    // Player context
    if (context.heroAbilitiesManager) {
        return context.heroAbilitiesManager.getHeroAbilities(heroPosition) || { zone1: [], zone2: [], zone3: [] };
    }
    
    // CPU context
    if (context.abilities && context.abilities[heroPosition]) {
        return context.abilities[heroPosition];
    }
    
    return { zone1: [], zone2: [], zone3: [] };
}

/**
 * Extract creatures for a hero (works for both player and CPU)
 */
function extractCreatures(context, heroPosition) {
    // Player context
    if (context.heroCreatureManager) {
        return context.heroCreatureManager.getHeroCreatures(heroPosition) || [];
    }
    
    // CPU context
    if (context.creatures && context.creatures[heroPosition]) {
        return context.creatures[heroPosition] || [];
    }
    
    return [];
}

/**
 * Extract graveyard (works for both player and CPU)
 */
function extractGraveyard(context) {
    // Player context
    if (context.graveyardManager) {
        return context.graveyardManager.getGraveyard() || [];
    }
    
    // CPU context
    if (context.graveyard) {
        return context.graveyard;
    }
    
    return [];
}

// ============================================
// HELPER FUNCTIONS - VALIDATION CHECKS
// ============================================

/**
 * Check spellbook restrictions (Area spells, etc.)
 */
function checkSpellbookRestrictions(heroPosition, spellCardName, context) {
    // Player context
    if (context.heroSpellbookManager) {
        return context.heroSpellbookManager.canHeroLearnSpell(heroPosition, spellCardName);
    }
    
    // CPU context - check Area restriction manually
    const cardInfo = getCardInfo(spellCardName);
    if (cardInfo && cardInfo.subtype === 'Area') {
        return { canLearn: false, reason: 'Heroes cannot learn Area spells' };
    }
    
    return { canLearn: true };
}

/**
 * Check free-cast conditions (FrontSoldier, FutureTechDrone, Archer)
 */
function checkFreeCastConditions(spellCardName, heroPosition, hero, abilities, creatures, graveyard) {
    // FrontSoldier: Can summon for free if hero has no creatures
    if (spellCardName === 'FrontSoldier') {
        if (creatures.length === 0) {
            return { isFree: true };
        }
    }
    
    // FutureTechDrone: Can summon for free if 3+ in graveyard
    if (spellCardName === 'FutureTechDrone') {
        const droneCount = graveyard.filter(card => card === 'FutureTechDrone').length;
        if (droneCount >= 3) {
            return { isFree: true };
        }
    }
    
    // Archer: Can summon for free with Leadership 3+
    if (spellCardName === 'Archer') {
        const leadershipLevel = countAbilityStacks(abilities, 'Leadership');
        if (leadershipLevel >= 3) {
            return { isFree: true };
        }
    }
    
    return { isFree: false };
}

/**
 * Check spell level requirements with all special reductions
 */
function checkSpellLevelRequirements(spellCardName, cardInfo, hero, abilities, creatures, graveyard, formation, context) {
    const spellSchool = cardInfo.spellSchool;
    const baseSpellLevel = cardInfo.level || 0;
    
    // Count spell school abilities
    const totalSpellSchoolLevel = countAbilityStacks(abilities, spellSchool);
    const totalThievingLevel = countAbilityStacks(abilities, 'Thieving');
    const learningLevel = countAbilityStacks(abilities, 'Learning');
    
    // Calculate effective spell school level with Learning bonus
    const effectiveSpellSchoolLevel = totalSpellSchoolLevel + learningLevel;
    let effectiveSpellLevel = baseSpellLevel;
    let thievingReduction = 0;
    
    // ThievingStrike: Reduce level by Thieving stacks
    if (spellCardName === 'ThievingStrike' && totalThievingLevel > 0) {
        thievingReduction = totalThievingLevel;
        effectiveSpellLevel = Math.max(0, baseSpellLevel - thievingReduction);
    }
    
    // FutureTechMech: Reduce level by graveyard count
    if (spellCardName === 'FutureTechMech') {
        const levelReduction = graveyard.filter(card => card === 'FutureTechMech').length;
        effectiveSpellLevel = Math.max(0, baseSpellLevel - levelReduction);
    }
    
    // TheRootOfAllEvil: Reduce level by total creatures across all heroes
    if (spellCardName === 'TheRootOfAllEvil') {
        let totalCreatures = 0;
        ['left', 'center', 'right'].forEach(pos => {
            if (formation[pos]) {
                const heroCreatures = extractCreatures(context, pos);
                totalCreatures += heroCreatures.length;
            }
        });
        effectiveSpellLevel = Math.max(0, baseSpellLevel - totalCreatures);
    }
    
    // Shipwrecked: Reduce level by Navigation stacks
    if (spellCardName === 'Shipwrecked') {
        const navigationLevel = countAbilityStacks(abilities, 'Navigation');
        if (navigationLevel > 0) {
            effectiveSpellLevel = Math.max(0, baseSpellLevel - navigationLevel);
        }
    }
    
    // Check if hero meets level requirement
    if (effectiveSpellSchoolLevel < effectiveSpellLevel) {
        // Check for gold-based learning (Semi, DarkDeal)
        const goldLearningCheck = checkGoldLearning(hero, spellCardName, context);
        if (goldLearningCheck) {
            return goldLearningCheck;
        }
        
        // Failed level check - build error message
        const formattedSpellSchool = formatCardName(spellSchool);
        const formattedSpellName = formatCardName(spellCardName);
        
        // Enhanced error message for ThievingStrike
        if (spellCardName === 'ThievingStrike' && totalThievingLevel > 0) {
            const originalRequirement = baseSpellLevel;
            const currentCombined = totalSpellSchoolLevel + totalThievingLevel;
            
            return { 
                canUse: false, 
                reason: `${hero.name} needs ${formattedSpellSchool} ${effectiveSpellLevel}+ to learn ${formattedSpellName}! (Has ${formattedSpellSchool} ${totalSpellSchoolLevel} + Thieving ${totalThievingLevel} = ${currentCombined}/${originalRequirement})`
            };
        }
        
        // Enhanced error message with Learning level shown if present
        let errorMessage = `${hero.name} needs ${formattedSpellSchool} at level ${effectiveSpellLevel} or higher to learn ${formattedSpellName}!`;
        
        if (learningLevel > 0) {
            errorMessage += ` (Has ${formattedSpellSchool} ${totalSpellSchoolLevel} + Learning ${learningLevel} = ${effectiveSpellSchoolLevel}/${effectiveSpellLevel})`;
        }
        
        if (spellCardName === 'FutureTechMech' && effectiveSpellLevel < baseSpellLevel) {
            const levelReduction = baseSpellLevel - effectiveSpellLevel;
            errorMessage += ` (Level reduced from ${baseSpellLevel} to ${effectiveSpellLevel} due to ${levelReduction} in graveyard)`;
        }
        
        return { 
            canUse: false, 
            reason: errorMessage
        };
    }
    
    // Success case - include information about reductions if applicable
    const result = { canUse: true, heroName: hero.name };
    
    if (learningLevel > 0) {
        result.hasLearning = true;
        result.learningLevel = learningLevel;
    }
    
    if (spellCardName === 'ThievingStrike' && thievingReduction > 0) {
        result.isThievingReduced = true;
        result.thievingReduction = thievingReduction;
        result.originalLevel = baseSpellLevel;
        result.effectiveLevel = effectiveSpellLevel;
    }
    
    if (spellCardName === 'FutureTechMech' && effectiveSpellLevel < baseSpellLevel) {
        const levelReduction = baseSpellLevel - effectiveSpellLevel;
        result.isFutureTechMechReduced = true;
        result.levelReduction = levelReduction;
        result.originalLevel = baseSpellLevel;
        result.effectiveLevel = effectiveSpellLevel;
    }
    
    // Special case for Archer with reduced level
    if (spellCardName === 'Archer') {
        if (creatures.length >= 1) {
            result.isArcherReducedLevel = true;
        }
    }
    
    return result;
}

/**
 * Check gold-based learning options (Semi, DarkDeal)
 */
function checkGoldLearning(hero, spellCardName, context) {
    // Semi gold learning
    if (hero.name === 'Semi' && context.semiEffectManager) {
        const semiCheck = context.semiEffectManager.canUseSemiGoldLearning(context, hero.position || 'left', spellCardName);
        if (semiCheck.canUse) {
            return { 
                canUse: false, 
                reason: `Semi can learn this for ${semiCheck.goldCost} Gold`,
                isSemiGoldLearning: true,
                semiData: semiCheck,
                heroName: hero.name
            };
        } else if (semiCheck.goldCost && semiCheck.playerGold !== undefined) {
            return { 
                canUse: false, 
                reason: `Semi needs ${semiCheck.goldCost} Gold to learn this (have ${semiCheck.playerGold})`
            };
        }
    }
    
    // DarkDeal gold learning
    if (spellCardName === 'DarkDeal') {
        const playerGold = context.goldManager ? context.goldManager.getPlayerGold() : 0;
        const darkDealCost = 10;
        
        if (playerGold >= darkDealCost) {
            return { 
                canUse: false, 
                reason: `Spend ${darkDealCost} Gold on a Dark Deal?`,
                isDarkDealGoldLearning: true,
                darkDealData: {
                    goldCost: darkDealCost,
                    playerGold: playerGold,
                    heroName: hero.name
                },
                heroName: hero.name
            };
        } else {
            return { 
                canUse: false, 
                reason: `You need ${darkDealCost} Gold for a Dark Deal (have ${playerGold})`
            };
        }
    }
    
    return null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Count ability stacks in a hero's ability zones
 */
function countAbilityStacks(abilities, abilityName) {
    if (!abilities) return 0;
    
    let count = 0;
    ['zone1', 'zone2', 'zone3'].forEach(zone => {
        if (abilities[zone]) {
            abilities[zone].forEach(ability => {
                if (ability && ability.name === abilityName) {
                    count++;
                }
            });
        }
    });
    
    return count;
}

/**
 * Format card name from camelCase to readable format
 */
function formatCardName(cardName) {
    return cardName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}