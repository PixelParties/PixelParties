// cpuPotionUpdates.js - CPU potion processing

import { getCardInfo, getAllCardNames } from './cardDatabase.js';
import { countAbilityStacks } from './cpuHelpers.js';

/**
 * Process potions for all computer teams after battle
 * Each team gets potion usages (1 + Alchemy stacks), then processes potions from deck
 */
export async function processComputerPotionsAfterBattle(roomRef) {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        for (const teamKey of ['team1', 'team2', 'team3']) {
            const team = teams[teamKey];
            if (!team || !team.formation) continue;

            // BUILD POTION LIST
            const deck = team.deck || [];
            const allPotions = [];
            deck.forEach(cardName => {
                const cardInfo = getCardInfo(cardName);
                if (cardInfo && cardInfo.cardType === 'Potion') {
                    allPotions.push(cardName);
                    allPotions.push(cardName);
                    allPotions.push(cardName);
                }
            });

            if (allPotions.length === 0) continue;

            const shuffledPotions = [...allPotions].sort(() => Math.random() - 0.5);

            // CALCULATE POTION USAGES
            let availablePotionUsages = 1;
            ['left', 'center', 'right'].forEach(position => {
                if (team.formation[position] && team.abilities && team.abilities[position]) {
                    const alchemyStacks = countAbilityStacks(team.abilities, position, 'Alchemy');
                    availablePotionUsages += alchemyStacks;
                }
            });

            // PROCESS POTIONS
            const activePotionEffects = [];
            let currentHand = [...(team.hand || [])];
            let currentDeck = [...(team.deck || [])];
            let currentAreaCard = team.areaCard || null;
            let currentCreatures = JSON.parse(JSON.stringify(team.creatures || { left: [], center: [], right: [] }));

            for (const potionName of shuffledPotions) {
                if (availablePotionUsages <= 0) break;

                // 10% chance to activate
                if (Math.random() >= 0.10) continue;

                // Potion activates! Consume one usage
                availablePotionUsages--;

                // BIOMANCY HANDLING
                const biomancyHeroes = [];
                ['left', 'center', 'right'].forEach(position => {
                    if (team.formation[position] && team.abilities && team.abilities[position]) {
                        const biomancyStacks = countAbilityStacks(team.abilities, position, 'Biomancy');
                        if (biomancyStacks > 0) {
                            biomancyHeroes.push({
                                position: position,
                                level: biomancyStacks
                            });
                        }
                    }
                });

                // Create BiomancyTokens for each Biomancy hero
                biomancyHeroes.forEach(({ position, level }) => {
                    const tokenInfo = getCardInfo('BiomancyToken');
                    if (tokenInfo) {
                        const multipliedHp = 10 * level;
                        const biomancyToken = {
                            name: 'BiomancyToken',
                            image: tokenInfo.image,
                            cardType: tokenInfo.cardType,
                            maxHp: multipliedHp,
                            currentHp: multipliedHp,
                            hp: multipliedHp,
                            addedAt: Date.now(),
                            isPermanent: true,
                            biomancyLevel: level,
                            sourcePotion: potionName
                        };
                        
                        if (!currentCreatures[position]) {
                            currentCreatures[position] = [];
                        }
                        currentCreatures[position].push(biomancyToken);
                    }
                });

                // SPECIAL CASE: ElixirOfQuickness
                if (potionName === 'ElixirOfQuickness') {
                    for (let i = 0; i < 3 && currentDeck.length > 0; i++) {
                        const randomIndex = Math.floor(Math.random() * currentDeck.length);
                        const drawnCard = currentDeck[randomIndex];
                        currentHand.push(drawnCard);
                    }
                    continue; // Don't add to activePotionEffects
                }

                // SPECIAL CASE: PlanetInABottle
                if (potionName === 'PlanetInABottle') {
                    currentAreaCard = selectRandomAreaForCPU();
                    continue; // Don't add to activePotionEffects
                }

                // NORMAL POTION HANDLING
                activePotionEffects.push({
                    name: potionName,
                    addedAt: Date.now(),
                    id: generatePotionEffectId()
                });
            }

            // UPDATE TEAM DATA
            updates[`${teamKey}/activePotionEffects`] = activePotionEffects;
            updates[`${teamKey}/hand`] = currentHand;
            updates[`${teamKey}/deck`] = currentDeck;
            updates[`${teamKey}/areaCard`] = currentAreaCard;
            updates[`${teamKey}/creatures`] = currentCreatures;
        }

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
        }

        return true;

    } catch (error) {
        console.error('Error processing computer potions:', error);
        return false;
    }
}

/**
 * Generate unique ID for potion effects
 */
function generatePotionEffectId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Select a random Area Spell for CPU players
 */
function selectRandomAreaForCPU() {
    const areaSpells = getAllCardNames().filter(cardName => {
        const cardInfo = getCardInfo(cardName);
        return cardInfo && cardInfo.cardType === 'Spell' && cardInfo.subtype === 'Area';
    });
    
    if (areaSpells.length === 0) {
        console.error('selectRandomAreaForCPU: No Area spells found in database!');
        return null;
    }
    
    const randomIndex = Math.floor(Math.random() * areaSpells.length);
    const selectedAreaSpell = areaSpells[randomIndex];
    
    const cardInfo = getCardInfo(selectedAreaSpell);
    if (!cardInfo) {
        console.error(`Could not find card info for ${selectedAreaSpell}`);
        return null;
    }

    const newAreaCard = {
        name: selectedAreaSpell,
        image: cardInfo.image || `./Cards/Areas/${selectedAreaSpell}.png`,
        cost: cardInfo.cost || 0,
        effects: cardInfo.effects || []
    };

    // Initialize area-specific properties
    switch (selectedAreaSpell) {
        case 'GatheringStorm':
            newAreaCard.stormCounters = 1;
            break;
        case 'DoomClock':
            newAreaCard.doomCounters = 0;
            break;
        case 'CrystalWell':
            // No special initialization needed
            break;
    }

    return newAreaCard;
}