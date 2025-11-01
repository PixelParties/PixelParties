// cpuResourceUpdates.js - ENHANCED VERSION
// CPU hand/deck/graveyard/gold/area counter management

import { getCardInfo, getHeroInfo, getAllCardNames } from './cardDatabase.js';
import { countAbilityStacks } from './cpuHelpers.js';
import { attemptSmartDraft } from './cpuSmartDraft.js';
import { canHeroUseSpell } from './spellValidation.js';
import { getDifficultyValue } from './cpuDifficultyConfig.js';

/**
 * Update hands, decks, and graveyards for all computer teams after a battle
 */
export async function updateComputerHandsAfterBattle(roomRef) {
    if (!roomRef) return false;

    try {
        // Get human team data for smart draft system
        const humanSnapshot = await roomRef.child('singleplayer/humanTeam').once('value');
        const humanTeam = humanSnapshot.val();
        
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        ['team1', 'team2', 'team3'].forEach(teamKey => {
            const team = teams[teamKey];
            if (!team || !team.formation) return;

            const difficulty = team.difficulty || 'Normal';
            const currentDeck = [...(team.deck || [])];
            const currentHand = [...(team.hand || [])];
            const currentGraveyard = [...(team.graveyard || [])];
            let currentGold = team.gold || 0;
            
            const newHand = [...currentHand];
            
            // Card 1: Random card from existing deck
            if (currentDeck.length > 0) {
                const card1Name = currentDeck[Math.floor(Math.random() * currentDeck.length)];
                newHand.push(card1Name);
            }
            
            // Card 2: Smart draft with fallback to random
            let card2Name = null;
            
            // Try smart draft system
            if (humanTeam) {
                const smartResult = attemptSmartDraft(humanTeam, team, difficulty);
                
                if (smartResult.useSmartMode && smartResult.selectedCard) {
                    // Smart mode activated and found a counter card!
                    card2Name = smartResult.selectedCard;
                    console.log(`${teamKey}: Smart draft selected ${card2Name}`);
                }
            }
            
            // Fall back to random selection if smart draft didn't activate or failed
            if (!card2Name) {
                card2Name = selectRandomCardForComputer(team.formation, currentDeck, team.abilities, team.creatures, team.graveyard);
                console.log(`${teamKey}: Random draft selected ${card2Name || 'none'}`);
            }
            
            if (card2Name) {
                newHand.push(card2Name);
                currentDeck.push(card2Name);
            }
            
            // Handle special cards
            const finalHand = [...newHand];
            
            for (let i = finalHand.length - 1; i >= 0; i--) {
                const card = finalHand[i];
                
                if (card === 'Wheels') {
                    const wheelsInfo = getCardInfo('Wheels');
                    const wheelsCost = wheelsInfo ? wheelsInfo.cost : 0;
                    
                    if (currentGold >= wheelsCost) {
                        finalHand.splice(i, 1);
                        currentGraveyard.push('Wheels');
                        currentGold -= wheelsCost;
                        
                        for (let j = 0; j < 3 && currentDeck.length > 0; j++) {
                            const randomCard = currentDeck[Math.floor(Math.random() * currentDeck.length)];
                            finalHand.push(randomCard);
                        }
                    }
                }
                else if (card === 'BirthdayPresent') {
                    const presentInfo = getCardInfo('BirthdayPresent');
                    const presentCost = presentInfo ? presentInfo.cost : 0;
                    
                    if (currentGold >= presentCost) {
                        finalHand.splice(i, 1);
                        currentGraveyard.push('BirthdayPresent');
                        currentGold -= presentCost;
                        
                        for (let j = 0; j < 2 && currentDeck.length > 0; j++) {
                            const randomCard = currentDeck[Math.floor(Math.random() * currentDeck.length)];
                            finalHand.push(randomCard);
                        }
                    }
                }
                else if (card === 'CoolPresents') {
                    const coolPresentsInfo = getCardInfo('CoolPresents');
                    const coolPresentsCost = coolPresentsInfo ? coolPresentsInfo.cost : 0;
                    
                    if (currentGold >= coolPresentsCost) {
                        finalHand.splice(i, 1);
                        currentGraveyard.push('CoolPresents');
                        currentGold -= coolPresentsCost;
                        
                        for (let j = 0; j < 3; j++) {
                            const randomCard = selectRandomCardForComputer(team.formation, currentDeck, team.abilities, team.creatures, team.graveyard);
                            if (randomCard) {
                                finalHand.push(randomCard);
                                currentDeck.push(randomCard);
                            }
                        }
                    }
                }
            }
            
            // Move 0-3 cards from hand to graveyard
            const cardsToDiscard = Math.floor(Math.random() * 4);
            
            for (let i = 0; i < cardsToDiscard && finalHand.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * finalHand.length);
                const discardedCard = finalHand.splice(randomIndex, 1)[0];
                currentGraveyard.push(discardedCard);
            }
            
            updates[`${teamKey}/hand`] = finalHand;
            updates[`${teamKey}/graveyard`] = currentGraveyard;
            updates[`${teamKey}/deck`] = currentDeck;
            updates[`${teamKey}/gold`] = currentGold;
        });

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
        }

        return true;

    } catch (error) {
        return false;
    }
}

/**
 * Award post-battle gold to all computer teams
 */
export async function awardComputerGoldAfterBattle(roomRef, battleResult = 'defeat') {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        ['team1', 'team2', 'team3'].forEach(teamKey => {
            const team = teams[teamKey];
            if (!team || !team.formation) return;

            const difficulty = team.difficulty || 'Normal';
            const goldBreakdown = calculateComputerGoldBreakdown(team, battleResult, difficulty);
            const currentGold = team.gold || 0;
            const newGold = currentGold + goldBreakdown.total;
            
            console.log(`[${difficulty}] ${teamKey} gold: +${goldBreakdown.total} (multiplier: ${goldBreakdown.multiplier}x)`);
            
            updates[`${teamKey}/gold`] = newGold;
        });

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
        }

        return true;

    } catch (error) {
        return false;
    }
}

/**
 * Calculate gold breakdown for a computer team
 * @param {Object} team - Team data
 * @param {string} battleResult - 'victory', 'defeat', or 'draw'
 * @param {string} difficulty - Difficulty level ('Easy', 'Normal', or 'Hard')
 * @returns {Object} Gold breakdown with total
 */
function calculateComputerGoldBreakdown(team, battleResult, difficulty = 'Normal') {
    const breakdown = {
        baseGold: 4,
        battleBonus: 0,
        wealthBonus: 0,
        semiBonus: 0,
        sapphireBonus: 0,
        rainbowsArrowBonus: 0,
        multiplier: 1.0,
        total: 0
    };

    switch (battleResult) {
        case 'victory':
            breakdown.battleBonus = 0;
            break;
        case 'defeat':
            breakdown.battleBonus = 2;
            break;
        case 'draw':
            breakdown.battleBonus = 1;
            break;
        default:
            breakdown.battleBonus = 1;
            break;
    }

    if (team.abilities) {
        ['left', 'center', 'right'].forEach(position => {
            const abilities = team.abilities[position];
            if (abilities) {
                let wealthLevel = 0;
                
                ['zone1', 'zone2', 'zone3'].forEach(zone => {
                    if (abilities[zone] && Array.isArray(abilities[zone])) {
                        const wealthCount = abilities[zone].filter(a => a && a.name === 'Wealth').length;
                        wealthLevel += wealthCount;
                    }
                });
                
                if (wealthLevel > 0) {
                    breakdown.wealthBonus += wealthLevel;
                }
            }
        });
    }

    if (team.formation) {
        ['left', 'center', 'right'].forEach(position => {
            const hero = team.formation[position];
            if (hero && hero.name === 'Semi') {
                breakdown.semiBonus = 2;
            }
        });
    }

    if (team.magicSapphiresUsed) {
        breakdown.sapphireBonus = team.magicSapphiresUsed;
    }

    if (team.equipment) {
        let rainbowsArrowCount = 0;
        
        ['left', 'center', 'right'].forEach(position => {
            const heroEquipment = team.equipment[position];
            if (heroEquipment && Array.isArray(heroEquipment)) {
                heroEquipment.forEach(item => {
                    const itemName = item.name || item.cardName || item;
                    if (itemName === 'RainbowsArrow') {
                        rainbowsArrowCount++;
                    }
                });
            }
        });
        
        if (rainbowsArrowCount > 0) {
            breakdown.rainbowsArrowBonus = rainbowsArrowCount * 4;
        }
    }

    breakdown.total = breakdown.baseGold + breakdown.battleBonus + breakdown.wealthBonus + 
                     breakdown.semiBonus + breakdown.sapphireBonus + breakdown.rainbowsArrowBonus;

    // Apply difficulty-based gold multiplier
    breakdown.multiplier = getDifficultyValue(difficulty, 'resources', 'goldGainMultiplier');
    breakdown.total = Math.floor(breakdown.total * breakdown.multiplier);

    return breakdown;
}

/**
 * Process Area card counters after battle
 */
export async function processComputerAreaCountersAfterBattle(roomRef) {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        for (const teamKey of ['team1', 'team2', 'team3']) {
            const team = teams[teamKey];
            if (!team) continue;

            const areaCard = team.areaCard;
            if (!areaCard) continue;

            if (areaCard.name === 'GatheringStorm') {
                const currentCounters = areaCard.stormCounters || 0;
                const newCounters = currentCounters + 1;
                
                updates[`${teamKey}/areaCard/stormCounters`] = newCounters;
            }

            if (areaCard.name === 'DoomClock') {
                const currentCounters = areaCard.doomCounters || 0;
                const increment = Math.floor(Math.random() * 5) + 3;
                let newCounters = currentCounters + increment;
                
                if (newCounters >= 12) {
                    newCounters = 0;
                }
                
                updates[`${teamKey}/areaCard/doomCounters`] = newCounters;
            }
        }

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
        }

        return true;

    } catch (error) {
        console.error('Error processing area counters:', error);
        return false;
    }
}

/**
 * ENHANCED: Select a random card for computer with weighted probabilities and 1d3 roll
 * @param {Object} formation - Current formation with heroes
 * @param {Array} currentDeck - Current deck contents
 * @param {Object} abilities - Team abilities structure (for spell validation and ability checks)
 * @param {Object} creatures - Team creatures structure (for spell validation)
 * @param {Array} graveyard - Team graveyard (for spell validation)
 * @returns {string} Selected card name
 */
export function selectRandomCardForComputer(formation, currentDeck, abilities = null, creatures = null, graveyard = null) {
    // Roll 1d3 to determine card type
    const typeRoll = Math.floor(Math.random() * 3) + 1;
    
    if (typeRoll === 1) {
        // Roll 1: Add random Ability
        return selectRandomAbility(formation, currentDeck, abilities);
    } else if (typeRoll === 2) {
        // Roll 2: Add random Spell (with validation)
        const spell = selectRandomValidSpell(formation, currentDeck, abilities, creatures, graveyard);
        
        // If spell selection failed after 100 attempts, fallback to Ability
        if (!spell) {
            return selectRandomAbility(formation, currentDeck, abilities);
        }
        
        return spell;
    } else {
        // Roll 3: Add anything else (using original logic)
        return selectFromAllCards(formation, currentDeck);
    }
}

/**
 * Select a random Ability with special weighting rules
 * @param {Object} formation - Current formation
 * @param {Array} currentDeck - Current deck
 * @param {Object} abilities - Team abilities (to check if SpellSchool abilities already exist)
 * @returns {string} Selected ability name
 */
function selectRandomAbility(formation, currentDeck, abilities) {
    const allCards = getAllCardNames();
    const abilityCards = allCards.filter(cardName => {
        const cardInfo = getCardInfo(cardName);
        return cardInfo && cardInfo.cardType === 'Ability';
    });
    
    if (abilityCards.length === 0) {
        return selectFromAllCards(formation, currentDeck);
    }
    
    // Check if Mary is in the formation
    const hasMary = ['left', 'center', 'right'].some(pos => 
        formation[pos] && formation[pos].name === 'Mary'
    );
    
    // Check which SpellSchool abilities the heroes already have
    const heroHasSpellSchool = {};
    const spellSchoolAbilities = ['DestructionMagic', 'SummoningMagic', 'DecayMagic', 'SupportMagic', 'MagicArts', 'Fighting'];
    
    if (abilities) {
        spellSchoolAbilities.forEach(spellSchool => {
            heroHasSpellSchool[spellSchool] = false;
            
            ['left', 'center', 'right'].forEach(position => {
                if (abilities[position]) {
                    ['zone1', 'zone2', 'zone3'].forEach(zone => {
                        if (abilities[position][zone] && Array.isArray(abilities[position][zone])) {
                            if (abilities[position][zone].some(a => a && a.name === spellSchool)) {
                                heroHasSpellSchool[spellSchool] = true;
                            }
                        }
                    });
                }
            });
        });
    }
    
    // Build weighted ability pool
    const weightedAbilities = [];
    
    // First, check if we should prioritize cards already in deck (50% chance)
    const shouldPrioritizeDeck = Math.random() < 0.5;
    if (shouldPrioritizeDeck && currentDeck.length > 0) {
        const abilityInDeck = currentDeck.filter(cardName => {
            const cardInfo = getCardInfo(cardName);
            return cardInfo && cardInfo.cardType === 'Ability';
        });
        
        if (abilityInDeck.length > 0) {
            // Apply same weighting rules to deck cards
            abilityInDeck.forEach(abilityName => {
                const weight = getAbilityWeight(abilityName, hasMary, heroHasSpellSchool);
                for (let i = 0; i < weight; i++) {
                    weightedAbilities.push(abilityName);
                }
            });
            
            // Return from this weighted pool
            if (weightedAbilities.length > 0) {
                return weightedAbilities[Math.floor(Math.random() * weightedAbilities.length)];
            }
        }
    }
    
    // Otherwise, select from all abilities with weighting
    abilityCards.forEach(abilityName => {
        const weight = getAbilityWeight(abilityName, hasMary, heroHasSpellSchool);
        for (let i = 0; i < weight; i++) {
            weightedAbilities.push(abilityName);
        }
    });
    
    if (weightedAbilities.length === 0) {
        // Fallback to any ability if somehow we have none
        return abilityCards[Math.floor(Math.random() * abilityCards.length)];
    }
    
    return weightedAbilities[Math.floor(Math.random() * weightedAbilities.length)];
}

/**
 * Get the weight for an ability based on special rules
 * @param {string} abilityName - Name of the ability
 * @param {boolean} hasMary - Whether Mary is in the party
 * @param {Object} heroHasSpellSchool - Map of which SpellSchool abilities heroes have
 * @returns {number} Weight (higher = more likely)
 */
function getAbilityWeight(abilityName, hasMary, heroHasSpellSchool) {
    // Toughness and Resistance: Even MORE increased priority (5x base weight)
    if (abilityName === 'Toughness' || abilityName === 'Resistance') {
        return 5;
    }
    
    // SpellSchool abilities: Check special cases
    const spellSchoolAbilities = ['DestructionMagic', 'SummoningMagic', 'DecayMagic', 'SupportMagic', 'MagicArts', 'Fighting'];
    
    if (spellSchoolAbilities.includes(abilityName)) {
        // Exception: DestructionMagic with Mary gets increased priority
        if (abilityName === 'DestructionMagic' && hasMary) {
            return 3; // Increased priority for Mary
        }
        
        // Exception: If hero already has this SpellSchool, normal priority
        if (heroHasSpellSchool[abilityName]) {
            return 1; // Normal priority
        }
        
        // Otherwise, vastly reduced priority (0.1x = 10% of normal)
        // Using fractional approach: only add it 10% of the time
        if (Math.random() < 0.1) {
            return 1;
        } else {
            return 0; // Don't add to pool this time
        }
    }
    
    // All other abilities: Normal weight
    return 1;
}

/**
 * Select a random valid Spell with validation
 * @param {Object} formation - Current formation
 * @param {Array} currentDeck - Current deck
 * @param {Object} abilities - Team abilities
 * @param {Object} creatures - Team creatures
 * @param {Array} graveyard - Team graveyard
 * @returns {string|null} Selected spell name or null if failed after 100 attempts
 */
function selectRandomValidSpell(formation, currentDeck, abilities, creatures, graveyard) {
    const allCards = getAllCardNames();
    const spellCards = allCards.filter(cardName => {
        const cardInfo = getCardInfo(cardName);
        return cardInfo && cardInfo.cardType === 'Spell';
    });
    
    if (spellCards.length === 0) {
        return null;
    }
    
    // Try up to 100 times to find a valid spell
    for (let attempt = 0; attempt < 100; attempt++) {
        let selectedSpell = null;
        
        // 50% chance to select from deck, 50% from all spells
        if (Math.random() < 0.5 && currentDeck.length > 0) {
            const spellsInDeck = currentDeck.filter(cardName => {
                const cardInfo = getCardInfo(cardName);
                return cardInfo && cardInfo.cardType === 'Spell';
            });
            
            if (spellsInDeck.length > 0) {
                selectedSpell = spellsInDeck[Math.floor(Math.random() * spellsInDeck.length)];
            }
        }
        
        // If we didn't get a spell from deck, pick from all spells
        if (!selectedSpell) {
            selectedSpell = spellCards[Math.floor(Math.random() * spellCards.length)];
        }
        
        // Check if any hero in the formation can use this spell
        const canAnyHeroUse = ['left', 'center', 'right'].some(position => {
            const hero = formation[position];
            if (!hero) return false;
            
            // Build context for spell validation
            const context = {
                formation: formation,
                abilities: abilities || { left: null, center: null, right: null },
                creatures: creatures || { left: [], center: [], right: [] },
                graveyard: graveyard || []
            };
            
            const validationResult = canHeroUseSpell(position, selectedSpell, context);
            return validationResult.canUse || validationResult.isFree;
        });
        
        if (canAnyHeroUse) {
            return selectedSpell;
        }
    }
    
    // Failed after 100 attempts
    return null;
}

/**
 * Select a spell card with SpellSchool matching at least one hero's ability
 * (DEPRECATED - kept for compatibility but no longer used in main flow)
 */
function selectMatchingSpellSchoolCard(formation) {
    const heroSpellSchools = new Set();
    
    ['left', 'center', 'right'].forEach(position => {
        const hero = formation[position];
        if (hero) {
            const heroInfo = getHeroInfo(hero.name);
            if (heroInfo) {
                if (heroInfo.ability1) {
                    const ability1Info = getCardInfo(heroInfo.ability1);
                    if (ability1Info && isSpellSchoolAbility(heroInfo.ability1)) {
                        heroSpellSchools.add(heroInfo.ability1);
                    }
                }
                if (heroInfo.ability2) {
                    const ability2Info = getCardInfo(heroInfo.ability2);
                    if (ability2Info && isSpellSchoolAbility(heroInfo.ability2)) {
                        heroSpellSchools.add(heroInfo.ability2);
                    }
                }
            }
        }
    });
    
    if (heroSpellSchools.size === 0) return null;
    
    const allCards = getAllCardNames();
    const matchingSpells = allCards.filter(cardName => {
        const cardInfo = getCardInfo(cardName);
        if (!cardInfo || cardInfo.cardType !== 'Spell') return false;
        return cardInfo.spellSchool && heroSpellSchools.has(cardInfo.spellSchool);
    });
    
    if (matchingSpells.length === 0) return null;
    
    return matchingSpells[Math.floor(Math.random() * matchingSpells.length)];
}

/**
 * Check if an ability name is a SpellSchool ability
 */
export function isSpellSchoolAbility(abilityName) {
    const spellSchoolAbilities = [
        'DestructionMagic',
        'DecayMagic',
        'SummoningMagic',
        'SupportMagic',
        'MagicArts',
        'Fighting',
    ];
    return spellSchoolAbilities.includes(abilityName);
}

/**
 * Select any valid card (excluding Spells with non-matching SpellSchools)
 * This is used for the "anything else" case (roll 3)
 */
function selectFromAllCards(formation, currentDeck) {
    // 50% chance: Copy of card already in deck
    const shouldPrioritizeDeck = Math.random() < 0.5;
    if (shouldPrioritizeDeck && currentDeck.length > 0) {
        return currentDeck[Math.floor(Math.random() * currentDeck.length)];
    }
    
    // Otherwise select from all valid cards
    const heroSpellSchools = new Set();
    
    ['left', 'center', 'right'].forEach(position => {
        const hero = formation[position];
        if (hero) {
            const heroInfo = getHeroInfo(hero.name);
            if (heroInfo) {
                if (heroInfo.ability1 && isSpellSchoolAbility(heroInfo.ability1)) {
                    heroSpellSchools.add(heroInfo.ability1);
                }
                if (heroInfo.ability2 && isSpellSchoolAbility(heroInfo.ability2)) {
                    heroSpellSchools.add(heroInfo.ability2);
                }
            }
        }
    });
    
    const allCards = getAllCardNames();
    const validCards = allCards.filter(cardName => {
        const cardInfo = getCardInfo(cardName);
        if (!cardInfo) return false;
        
        if (cardInfo.cardType === 'hero' || cardInfo.cardType === 'Token') {
            return false;
        }
        
        if (cardInfo.cardType === 'Spell' && cardInfo.spellSchool) {
            if (!heroSpellSchools.has(cardInfo.spellSchool)) {
                return false;
            }
        }
        
        return true;
    });
    
    if (validCards.length === 0) {
        return 'Fighting';
    }
    
    return validCards[Math.floor(Math.random() * validCards.length)];
}

/**
 * Generate resources (Gold, Deck, Hand, Graveyard) for computer opponent
 */
export function generateComputerResources(selectedTeam, randomizedFormation, currentTurn) {
    const gold = selectedTeam.gold || 0;
    const deck = selectedTeam.deck || [];
    const hand = selectedTeam.hand || [];
    const graveyard = selectedTeam.graveyard || [];

    return { gold, deck, hand, graveyard };
}