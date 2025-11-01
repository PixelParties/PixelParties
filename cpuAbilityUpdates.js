// cpuAbilityUpdates.js - ENHANCED VERSION
// CPU ability gain and ability effect processing with deck-based filtering

import { getCardInfo, getAllCardNames } from './cardDatabase.js';
import { countAbilityStacks } from './cpuHelpers.js';

/**
 * Update abilities for all computer heroes after a battle
 * Each hero has a 50% chance to gain/improve an ability
 */
export async function updateComputerAbilitiesAfterBattle(roomRef) {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        ['team1', 'team2', 'team3'].forEach(teamKey => {
            const team = teams[teamKey];
            if (!team || !team.formation) return;

            ['left', 'center', 'right'].forEach(position => {
                const hero = team.formation[position];
                if (!hero) return;

                if (Math.random() < 0.5) {
                    const newAbilities = processHeroAbilityGain(
                        hero.name,
                        team.abilities[position],
                        team.deck || []  // ENHANCED: Pass deck for filtering
                    );
                    
                    if (newAbilities) {
                        updates[`${teamKey}/abilities/${position}`] = newAbilities;
                    }
                }
            });
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
 * Process ability gain for a single hero (handles Training recursion)
 * ENHANCED: Now receives deck for filtering
 */
function processHeroAbilityGain(heroName, currentAbilities, deck) {
    if (!currentAbilities) {
        currentAbilities = { zone1: [], zone2: [], zone3: [] };
    }

    let abilities = JSON.parse(JSON.stringify(currentAbilities));
    const filledZones = countFilledZones(abilities);
    const trainingLevel = getAbilityLevel(abilities, 'Training');
    let trainingBonusRoundsRemaining = trainingLevel;
    let successfullyGainedAbility = false;

    successfullyGainedAbility = performAbilityGainRoll(heroName, abilities, filledZones, deck);

    while (successfullyGainedAbility && trainingBonusRoundsRemaining > 0) {
        if (Math.random() < 0.2) {
            const currentFilledZones = countFilledZones(abilities);
            successfullyGainedAbility = performAbilityGainRoll(heroName, abilities, currentFilledZones, deck);
            trainingBonusRoundsRemaining--;
        } else {
            break;
        }
    }

    return abilities;
}

/**
 * Perform a single ability gain roll for a hero
 * ENHANCED: Now receives deck for filtering
 */
function performAbilityGainRoll(heroName, abilities, filledZones, deck) {
    if (filledZones === 3) {
        increaseRandomAbility(heroName, abilities, deck);
        return true;
    } else {
        if (Math.random() < 0.75) {
            increaseRandomAbility(heroName, abilities, deck);
            return true;
        } else {
            const success = addRandomNewAbility(heroName, abilities, deck);
            return success;
        }
    }
}

/**
 * Count how many ability zones are filled
 */
function countFilledZones(abilities) {
    let count = 0;
    ['zone1', 'zone2', 'zone3'].forEach(zone => {
        if (abilities[zone] && abilities[zone].length > 0) {
            count++;
        }
    });
    return count;
}

/**
 * Get the level (stack count) of a specific ability
 */
function getAbilityLevel(abilities, abilityName) {
    for (const zone of ['zone1', 'zone2', 'zone3']) {
        if (abilities[zone] && abilities[zone].length > 0) {
            if (abilities[zone][0].name === abilityName) {
                return abilities[zone].length;
            }
        }
    }
    return 0;
}

/**
 * ENHANCED: Increase a random ability for a hero (with hero-specific probabilities)
 * Now only increases abilities that exist in the deck
 * 
 * @param {string} heroName - Name of the hero
 * @param {Object} abilities - Hero's current abilities
 * @param {Array} deck - Team's deck (for filtering)
 */
function increaseRandomAbility(heroName, abilities, deck) {
    // ENHANCED: Filter filled zones to only those with abilities in the deck
    const filledZones = [];
    ['zone1', 'zone2', 'zone3'].forEach(zone => {
        if (abilities[zone] && abilities[zone].length > 0) {
            const abilityName = abilities[zone][0].name;
            // Check if this ability exists in the deck
            if (deck && deck.includes(abilityName)) {
                filledZones.push(zone);
            }
        }
    });

    if (filledZones.length === 0) return;

    let selectedZone = null;

    // Hero-specific preferences (same as before, but only from filtered zones)
    if (heroName === 'Ida') {
        if (Math.random() < 0.85) {
            selectedZone = filledZones.find(zone => 
                abilities[zone][0].name === 'DestructionMagic'
            );
        }
        if (!selectedZone) {
            selectedZone = filledZones[Math.floor(Math.random() * filledZones.length)];
        }
    } else if (heroName === 'Toras') {
        if (Math.random() < 0.70) {
            selectedZone = filledZones.find(zone => 
                abilities[zone][0].name === 'Fighting'
            );
        }
        if (!selectedZone) {
            selectedZone = filledZones[Math.floor(Math.random() * filledZones.length)];
        }
    } else if (heroName === 'Monia') {
        // MONIA SPECIAL: 80% chance to increase Fighting if she has it
        if (Math.random() < 0.80) {
            selectedZone = filledZones.find(zone => 
                abilities[zone][0].name === 'Fighting'
            );
        }
        if (!selectedZone) {
            selectedZone = filledZones[Math.floor(Math.random() * filledZones.length)];
        }
    } else {
        selectedZone = filledZones[Math.floor(Math.random() * filledZones.length)];
    }

    const abilityToIncrease = abilities[selectedZone][0];
    abilities[selectedZone].push({ ...abilityToIncrease });
}

/**
 * ENHANCED: Add a random new ability to a hero's free zone
 * Now only selects from abilities present in the deck, but maintains existing weights and special rules
 * 
 * @param {string} heroName - Name of the hero
 * @param {Object} abilities - Hero's current abilities
 * @param {Array} deck - Team's deck (for filtering)
 * @returns {boolean} True if ability was successfully added
 */
function addRandomNewAbility(heroName, abilities, deck) {
    let freeZone = null;
    for (const zone of ['zone1', 'zone2', 'zone3']) {
        if (!abilities[zone] || abilities[zone].length === 0) {
            freeZone = zone;
            break;
        }
    }

    if (!freeZone) return false;

    const existingAbilities = new Set();
    ['zone1', 'zone2', 'zone3'].forEach(zone => {
        if (abilities[zone] && abilities[zone].length > 0) {
            existingAbilities.add(abilities[zone][0].name);
        }
    });

    // ENHANCED: First, identify which abilities are in the deck
    const abilitiesInDeck = new Set();
    if (deck && Array.isArray(deck)) {
        deck.forEach(cardName => {
            const cardInfo = getCardInfo(cardName);
            if (cardInfo && cardInfo.cardType === 'Ability') {
                abilitiesInDeck.add(cardName);
            }
        });
    }
    
    // If no abilities in deck, cannot learn any new abilities
    if (abilitiesInDeck.size === 0) return false;

    // VACARN SPECIAL RULE: 90% chance to get SummoningMagic if not owned and in deck
    if (heroName === 'Vacarn' && !existingAbilities.has('SummoningMagic')) {
        if (abilitiesInDeck.has('SummoningMagic') && Math.random() < 0.9) {
            const summoningMagicInfo = getCardInfo('SummoningMagic');
            if (summoningMagicInfo) {
                abilities[freeZone] = [{
                    name: 'SummoningMagic',
                    image: summoningMagicInfo.image,
                    cardType: summoningMagicInfo.cardType
                }];
                return true;
            }
        }
    }

    // MONIA SPECIAL RULE: 75% chance to get Toughness if not owned and in deck
    if (heroName === 'Monia' && !existingAbilities.has('Toughness')) {
        if (abilitiesInDeck.has('Toughness') && Math.random() < 0.75) {
            const toughnessInfo = getCardInfo('Toughness');
            if (toughnessInfo) {
                abilities[freeZone] = [{
                    name: 'Toughness',
                    image: toughnessInfo.image,
                    cardType: toughnessInfo.cardType
                }];
                return true;
            }
        }
    }

    // Define base weights for learnable abilities (same as before)
    const learnableAbilities = {
        'Alchemy': 1,
        'Adventurousness': 1,
        'Biomancy': 1,
        'Cannibalism': 1,
        'Charme': 1,
        'Diplomacy': 1,
        'Fighting': 1,
        'Friendship': 1,
        'Inventing': 1,
        'Leadership': 1,
        'Learning': 1,
        'Necromancy': 1,
        'Navigation': 1,
        'Occultism': 1,
        'Premonition': 1,
        'Thieving': 1,
        'Training': 1,
        'Wealth': 1,
        'Resistance': 2,
        'Toughness': 2
    };

    // Add Divinity if hero already has it
    if (existingAbilities.has('Divinity')) {
        learnableAbilities['Divinity'] = 1;
    }

    // MARY SPECIAL: Can learn DestructionMagic
    if (heroName === 'Mary') {
        learnableAbilities['DestructionMagic'] = 9;
    }
    
    // SEMI SPECIAL: Can learn SupportMagic
    if (heroName === 'Semi') {
        learnableAbilities['SupportMagic'] = 1;
    }

    // ENHANCED: Filter to only abilities that exist in both the deck AND the learnable list
    const availableAbilities = [];
    for (const [abilityName, weight] of Object.entries(learnableAbilities)) {
        // Must be in deck, not already owned, and be in the learnable list
        if (abilitiesInDeck.has(abilityName) && !existingAbilities.has(abilityName)) {
            // Apply the weight
            for (let i = 0; i < weight; i++) {
                availableAbilities.push(abilityName);
            }
        }
    }

    // ENHANCED: Handle SpellSchool abilities specially
    // These are in the deck but NOT in learnableAbilities (unless Mary/Semi exceptions apply)
    const spellSchoolAbilities = ['DestructionMagic', 'SummoningMagic', 'DecayMagic', 'SupportMagic', 'MagicArts', 'Fighting'];
    
    for (const spellSchool of spellSchoolAbilities) {
        // Skip if already owned or already added to availableAbilities
        if (existingAbilities.has(spellSchool)) continue;
        if (learnableAbilities[spellSchool]) continue; // Already handled above (Mary/Semi/Fighting cases)
        
        // If this SpellSchool is in the deck
        if (abilitiesInDeck.has(spellSchool)) {
            // Check if hero already has this SpellSchool in any zone
            const heroHasThisSpellSchool = existingAbilities.has(spellSchool);
            
            if (heroHasThisSpellSchool) {
                // Normal priority if already owned
                availableAbilities.push(spellSchool);
            } else {
                // Vastly reduced priority (10% chance = add to pool 10% of the time)
                if (Math.random() < 0.1) {
                    availableAbilities.push(spellSchool);
                }
            }
        }
    }

    if (availableAbilities.length === 0) return false;

    const selectedAbility = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
    const abilityInfo = getCardInfo(selectedAbility);
    if (!abilityInfo) return false;

    abilities[freeZone] = [{
        name: selectedAbility,
        image: abilityInfo.image,
        cardType: abilityInfo.cardType
    }];

    return true;
}

/**
 * Process special ability effects after abilities have been updated
 * Handles Navigation, Premonition, Leadership, Inventing, and Occultism effects
 */
export async function processAbilityEffectsAfterUpdate(roomRef) {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        for (const teamKey of ['team1', 'team2', 'team3']) {
            const team = teams[teamKey];
            if (!team || !team.formation) continue;

            let currentHand = [...(team.hand || [])];
            let currentDeck = [...(team.deck || [])];
            let currentGraveyard = [...(team.graveyard || [])];
            let currentFormation = JSON.parse(JSON.stringify(team.formation));
            let currentCreatures = JSON.parse(JSON.stringify(team.creatures || { left: [], center: [], right: [] }));

            for (const position of ['left', 'center', 'right']) {
                const hero = team.formation[position];
                if (!hero) continue;

                const heroAbilities = team.abilities?.[position];
                if (!heroAbilities) continue;

                const navigationLevel = countAbilityStacks(team.abilities, position, 'Navigation');
                const premonitionLevel = countAbilityStacks(team.abilities, position, 'Premonition');
                const leadershipLevel = countAbilityStacks(team.abilities, position, 'Leadership');
                const inventingLevel = countAbilityStacks(team.abilities, position, 'Inventing');
                const occultismLevel = countAbilityStacks(team.abilities, position, 'Occultism');

                // NAVIGATION EFFECT
                if (navigationLevel > 0) {
                    const chance = 0.20 * navigationLevel;
                    if (Math.random() < chance && currentDeck.length > 0) {
                        const randomIndex = Math.floor(Math.random() * currentDeck.length);
                        const drawnCard = currentDeck[randomIndex];
                        currentHand.push(drawnCard);
                    }
                }

                // PREMONITION EFFECT
                if (premonitionLevel > 0) {
                    const allCards = getAllCardNames().filter(cardName => {
                        const cardInfo = getCardInfo(cardName);
                        return cardInfo && cardInfo.cardType !== 'hero' && cardInfo.cardType !== 'Token';
                    });
                    
                    if (allCards.length > 0) {
                        const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
                        currentHand.push(randomCard);
                    }
                }

                // LEADERSHIP EFFECT
                if (leadershipLevel >= 3) {
                    const cardsToAdd = Math.floor(leadershipLevel / 3);
                    for (let i = 0; i < cardsToAdd; i++) {
                        if (currentDeck.length > 0) {
                            const randomIndex = Math.floor(Math.random() * currentDeck.length);
                            const drawnCard = currentDeck[randomIndex];
                            currentHand.push(drawnCard);
                        }
                    }
                }

                // INVENTING EFFECT
                if (inventingLevel > 0) {
                    for (let i = 0; i < 2 && currentHand.length > 0; i++) {
                        const randomIndex = Math.floor(Math.random() * currentHand.length);
                        const discardedCard = currentHand.splice(randomIndex, 1)[0];
                        currentGraveyard.push(discardedCard);
                    }
                    
                    for (let i = 0; i < 2 && currentDeck.length > 0; i++) {
                        const randomIndex = Math.floor(Math.random() * currentDeck.length);
                        const drawnCard = currentDeck[randomIndex];
                        currentHand.push(drawnCard);
                    }
                }

                // OCCULTISM EFFECT
                if (occultismLevel > 0) {
                    let lowestCreature = null;
                    let lowestPosition = null;
                    let lowestIndex = -1;
                    let lowestLevel = Infinity;

                    // First pass: look for tokens
                    for (const pos of ['left', 'center', 'right']) {
                        const creatures = currentCreatures[pos] || [];
                        creatures.forEach((creature, index) => {
                            const creatureName = creature.name || creature.cardName || creature;
                            const creatureInfo = getCardInfo(creatureName);
                            
                            if (creatureInfo && creatureInfo.cardType === 'Token') {
                                if (!lowestCreature) {
                                    lowestCreature = creature;
                                    lowestPosition = pos;
                                    lowestIndex = index;
                                    lowestLevel = 0;
                                }
                            }
                        });
                    }

                    // Second pass: if no tokens, find lowest level non-token creature
                    if (!lowestCreature) {
                        for (const pos of ['left', 'center', 'right']) {
                            const creatures = currentCreatures[pos] || [];
                            creatures.forEach((creature, index) => {
                                const creatureName = creature.name || creature.cardName || creature;
                                const creatureInfo = getCardInfo(creatureName);
                                
                                if (creatureInfo && creatureInfo.cardType !== 'Token') {
                                    const level = creatureInfo.level || 0;
                                    
                                    if (level < lowestLevel) {
                                        lowestCreature = creature;
                                        lowestPosition = pos;
                                        lowestIndex = index;
                                        lowestLevel = level;
                                    }
                                }
                            });
                        }
                    }

                    // Sacrifice the creature if found
                    if (lowestCreature && lowestPosition !== null && lowestIndex >= 0) {
                        currentCreatures[lowestPosition].splice(lowestIndex, 1);
                        
                        const hpBonus = 20 * occultismLevel;
                        const attackBonus = 5 * occultismLevel;
                        
                        const occultismHero = currentFormation[position];
                        if (occultismHero) {
                            occultismHero.hpBonusses = (occultismHero.hpBonusses || 0) + hpBonus;
                            occultismHero.attackBonusses = (occultismHero.attackBonusses || 0) + attackBonus;
                        }
                        
                        // GRAVEWORM DUPLICATION
                        const graveWormLocations = [];
                        for (const pos of ['left', 'center', 'right']) {
                            const creatures = currentCreatures[pos] || [];
                            creatures.forEach((creature, index) => {
                                const creatureName = creature.name || creature.cardName || creature;
                                if (creatureName === 'GraveWorm') {
                                    graveWormLocations.push({
                                        position: pos,
                                        index: index,
                                        creature: creature
                                    });
                                }
                            });
                        }
                        
                        if (graveWormLocations.length > 0) {
                            const shuffled = [...graveWormLocations].sort(() => Math.random() - 0.5);
                            const toDuplicate = shuffled.slice(0, Math.min(3, shuffled.length));
                            
                            toDuplicate.sort((a, b) => {
                                if (a.position !== b.position) {
                                    const posOrder = { right: 2, center: 1, left: 0 };
                                    return posOrder[b.position] - posOrder[a.position];
                                }
                                return b.index - a.index;
                            });
                            
                            toDuplicate.forEach(({ position: pos, index: idx, creature }) => {
                                const duplicate = JSON.parse(JSON.stringify(creature));
                                duplicate.addedAt = Date.now();
                                currentCreatures[pos].splice(idx + 1, 0, duplicate);
                            });
                        }
                    }
                }
            }

            updates[`${teamKey}/hand`] = currentHand;
            updates[`${teamKey}/deck`] = currentDeck;
            updates[`${teamKey}/graveyard`] = currentGraveyard;
            updates[`${teamKey}/formation`] = currentFormation;
            updates[`${teamKey}/creatures`] = currentCreatures;
        }

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
        }

        return true;

    } catch (error) {
        console.error('Error processing ability effects:', error);
        return false;
    }
}