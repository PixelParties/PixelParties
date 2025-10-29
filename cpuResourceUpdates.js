// cpuResourceUpdates.js - CPU hand/deck/graveyard/gold/area counter management

import { getCardInfo, getHeroInfo, getAllCardNames } from './cardDatabase.js';
import { countAbilityStacks } from './cpuHelpers.js';

/**
 * Update hands, decks, and graveyards for all computer teams after a battle
 */
export async function updateComputerHandsAfterBattle(roomRef) {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        ['team1', 'team2', 'team3'].forEach(teamKey => {
            const team = teams[teamKey];
            if (!team || !team.formation) return;

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
            
            // Card 2: Random card with weighted selection
            const card2Name = selectRandomCardForComputer(team.formation, currentDeck);
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
                            const randomCard = selectRandomCardForComputer(team.formation, currentDeck);
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

            const goldBreakdown = calculateComputerGoldBreakdown(team, battleResult);
            const currentGold = team.gold || 0;
            const newGold = currentGold + goldBreakdown.total;
            
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
 */
function calculateComputerGoldBreakdown(team, battleResult) {
    const breakdown = {
        baseGold: 4,
        battleBonus: 0,
        wealthBonus: 0,
        semiBonus: 0,
        sapphireBonus: 0,
        rainbowsArrowBonus: 0,
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
                    const goldFromWealth = wealthLevel * 4;
                    breakdown.wealthBonus += goldFromWealth;
                }
            }
        });
    }

    if (team.formation) {
        const hasSemi = ['left', 'center', 'right'].some(position => {
            const hero = team.formation[position];
            return hero && hero.name === 'Semi';
        });
        
        if (hasSemi) {
            breakdown.semiBonus = 6;
        }
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
 * Select a random card for computer with weighted probabilities
 */
export function selectRandomCardForComputer(formation, currentDeck) {
    const roll = Math.random();
    
    // 50% chance: Copy of card already in deck
    if (roll < 0.5) {
        if (currentDeck.length > 0) {
            return currentDeck[Math.floor(Math.random() * currentDeck.length)];
        }
        return selectFromAllCards(formation);
    }
    
    // 25% chance: Spell with matching SpellSchool
    if (roll < 0.75) {
        const matchingSpell = selectMatchingSpellSchoolCard(formation);
        if (matchingSpell) {
            return matchingSpell;
        }
        return selectFromAllCards(formation);
    }
    
    // 25% chance: Any card except non-matching SpellSchool spells
    return selectFromAllCards(formation);
}

/**
 * Select a spell card with SpellSchool matching at least one hero's ability
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
 */
function selectFromAllCards(formation) {
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