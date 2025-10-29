// generateComputerParty.js - Main module for CPU team initialization and orchestration
// REFACTORED: Only handles team creation, selection, and update orchestration

import { getHeroInfo, getCardInfo, getAllCardNames } from './cardDatabase.js';
import { getHeroCards } from './heroStartingCards.js';
import { Hero } from './hero.js';
import { updateComputerAbilitiesAfterBattle, processAbilityEffectsAfterUpdate } from './cpuAbilityUpdates.js';
import { processComputerArtifactsAfterBattle, processLegendarySwordBonuses, calculateComputerHeroStats } from './cpuArtifactUpdates.js';
import { processComputerSpellsAfterBattle, sortAllComputerCreatures } from './cpuSpellUpdates.js';
import { 
    updateComputerHandsAfterBattle, 
    awardComputerGoldAfterBattle, 
    processComputerAreaCountersAfterBattle,
    generateComputerResources 
} from './cpuResourceUpdates.js';
import { processHeroEffectsAfterUpdate } from './cpuHeroEffects.js';
import { processComputerCreaturesAfterBattle } from './cpuCreatureUpdates.js';
import { processComputerPotionsAfterBattle } from './cpuPotionUpdates.js';
import { processComputerAscensionsAfterBattle } from './cpuAscensionUpdates.js';
import { processAllCreatureTurnEffects } from './cpuCreatureTurnEffects.js';

import { selectSmartHero } from './smartHeroSelection.js';
import BurningFingerSpell from './Spells/burningFinger.js';

/**
 * PERSISTENT COMPUTER TEAMS SYSTEM
 * 
 * This module manages 3 permanent computer opponent teams that grow alongside the player.
 * Teams are stored in Firebase under 'singleplayer/computerTeams' and persist across reloads.
 * 
 * CRITICAL: CPU heroes now use the EXACT same Hero class as human players.
 */

// ============================================
// TEAM INITIALIZATION
// ============================================


/**
 * Get all heroes that are unavailable for drafting
 * This includes heroes already in any team AND heroes whose ascended versions are in play
 * @param {Array<string>} playerHeroNames - Player's hero names
 * @param {Object} computerTeams - All computer teams (optional, for when adding heroes)
 * @returns {Set<string>} - Set of unavailable hero names
 */
function getUnavailableHeroes(playerHeroNames, computerTeams = null) {
    const unavailable = new Set();
    
    // Add all player heroes
    playerHeroNames.forEach(name => {
        if (name) unavailable.add(name);
    });
    
    // Add all CPU team heroes
    if (computerTeams) {
        ['team1', 'team2', 'team3'].forEach(teamKey => {
            const team = computerTeams[teamKey];
            if (team && team.formation) {
                ['left', 'center', 'right'].forEach(pos => {
                    if (team.formation[pos]) {
                        unavailable.add(team.formation[pos].name);
                    }
                });
            }
        });
    }
    
    // Now check for ascended heroes and block their base forms
    const allHeroesInPlay = Array.from(unavailable);
    allHeroesInPlay.forEach(heroName => {
        const heroInfo = getHeroInfo(heroName);
        if (heroInfo && heroInfo.subtype === 'Ascended' && heroInfo.baseHero) {
            // This is an ascended hero - block its base form
            unavailable.add(heroInfo.baseHero);
        }
    });
    
    return unavailable;
}

/**
 * Filter available heroes, excluding those already in play or whose ascended versions are in play
 * @param {Array<string>} playerHeroNames - Player's hero names
 * @param {Object} computerTeams - All computer teams (optional)
 * @returns {Array<string>} - Array of available hero names
 */
function getAvailableHeroesForDraft(playerHeroNames, computerTeams = null) {
    const unavailable = getUnavailableHeroes(playerHeroNames, computerTeams);
    const allObtainable = getObtainableHeroes();
    
    return allObtainable.filter(heroName => !unavailable.has(heroName));
}

/**
 * Initialize 3 computer teams when player selects first hero
 * @param {Object} roomRef - Firebase room reference
 * @param {string} playerHeroName - Player's first hero name
 * @param {string} guaranteedOpponent - TEST ONLY: Force team1's first hero to be this hero
 * @returns {Promise<Object>} The 3 initialized teams
 */
export async function initializeComputerTeams(roomRef, playerHeroName, guaranteedOpponent = '') {
    if (!roomRef || !playerHeroName) {
        return null;
    }

    const availableHeroes = getAvailableHeroesForDraft([playerHeroName], null);
    
    let selectedHeroes = [];
    
    if (guaranteedOpponent && guaranteedOpponent !== '') {
        // If there's a guaranteed opponent for team1, use it
        selectedHeroes.push(guaranteedOpponent);
        
        // Smart select for teams 2 and 3
        const remainingHeroes = availableHeroes.filter(name => name !== guaranteedOpponent);
        const hero2 = selectSmartHero(remainingHeroes, 1, null);
        selectedHeroes.push(hero2);
        
        const remainingAfterHero2 = remainingHeroes.filter(name => name !== hero2);
        const hero3 = selectSmartHero(remainingAfterHero2, 1, null);
        selectedHeroes.push(hero3);
    } else {
        // Smart select all 3 first heroes
        const hero1 = selectSmartHero(availableHeroes, 1, null);
        selectedHeroes.push(hero1);
        
        const remainingAfterHero1 = availableHeroes.filter(name => name !== hero1);
        const hero2 = selectSmartHero(remainingAfterHero1, 1, null);
        selectedHeroes.push(hero2);
        
        const remainingAfterHero2 = remainingAfterHero1.filter(name => name !== hero2);
        const hero3 = selectSmartHero(remainingAfterHero2, 1, null);
        selectedHeroes.push(hero3);
    }

    const teams = {
        team1: await createTeamWithHero(selectedHeroes[0]),
        team2: await createTeamWithHero(selectedHeroes[1]),
        team3: await createTeamWithHero(selectedHeroes[2])
    };

    try {
        await roomRef.child('singleplayer/computerTeams').set(teams);
        return teams;
    } catch (error) {
        return null;
    }
}

/**
 * Create a team with a single hero (fully initialized)
 */
async function createTeamWithHero(heroName) {
    const heroInfo = getHeroInfo(heroName);
    if (!heroInfo) return null;

    const heroData = {
        id: Math.floor(Math.random() * 10000),
        name: heroName,
        image: `./Cards/All/${heroName}.png`,
        filename: `${heroName}.png`,
        permanentAttackBonusses: 0,
        permanentHpBonusses: 0,
        attackBonusses: 0,
        hpBonusses: 0
    };

    const formation = { left: heroData, center: null, right: null };
    const abilities = { left: initializeHeroAbilities(heroName), center: null, right: null };
    const spellbooks = { left: [], center: null, right: null };
    const creatures = { left: [], center: null, right: null };
    const equipment = { left: [], center: null, right: null };
    const graveyard = [];
    const deck = getHeroCards(heroName);
    const hand = [];
    
    for (let i = 0; i < 5 && deck.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * deck.length);
        hand.push(deck[randomIndex]);
    }

    const startingGold = calculateStartingGoldForHero(heroName);
    const counters = {
        birthdayPresent: 0,
        teleports: 0,
        goldenBananas: 0,
        evolutionCounters: 1,
        lunaBuffs: 0,
        supplyChain: 0
    };

    return {
        formation, abilities, spellbooks, creatures, equipment,
        graveyard, deck, hand,
        gold: startingGold,
        counters,
        magicSapphiresUsed: 0,
        magicRubiesUsed: 0,
        permanentArtifacts: [],
        areaCard: null,
        delayedEffects: [],
        heroCount: 1
    };
}

/**
 * Initialize hero abilities (zone1 abilities from hero info)
 */
function initializeHeroAbilities(heroName) {
    const heroInfo = getHeroInfo(heroName);
    if (!heroInfo) return { zone1: [], zone2: [], zone3: [] };

    const abilities = { zone1: [], zone2: [], zone3: [] };

    if (heroInfo.ability1 && heroInfo.ability2 && heroInfo.ability1 === heroInfo.ability2) {
        const abilityInfo = getCardInfo(heroInfo.ability1);
        if (abilityInfo) {
            abilities.zone1.push({
                name: heroInfo.ability1,
                image: abilityInfo.image,
                cardType: abilityInfo.cardType
            });
            abilities.zone1.push({
                name: heroInfo.ability1,
                image: abilityInfo.image,
                cardType: abilityInfo.cardType
            });
        }
    } else {
        if (heroInfo.ability1) {
            const abilityInfo = getCardInfo(heroInfo.ability1);
            if (abilityInfo) {
                abilities.zone1.push({
                    name: heroInfo.ability1,
                    image: abilityInfo.image,
                    cardType: abilityInfo.cardType
                });
            }
        }

        if (heroInfo.ability2) {
            const abilityInfo = getCardInfo(heroInfo.ability2);
            if (abilityInfo) {
                abilities.zone2.push({
                    name: heroInfo.ability2,
                    image: abilityInfo.image,
                    cardType: abilityInfo.cardType
                });
            }
        }
    }

    return abilities;
}

/**
 * Calculate starting gold for a hero
 */
function calculateStartingGoldForHero(heroName) {
    let startingGold = 4;
    
    const heroInfo = getHeroInfo(heroName);
    if (heroInfo) {
        let wealthCount = 0;
        if (heroInfo.ability1 === 'Wealth') wealthCount++;
        if (heroInfo.ability2 === 'Wealth') wealthCount++;
        
        if (wealthCount > 0) {
            startingGold += wealthCount * 4;
        }
    }
    
    if (heroName === 'Semi') {
        startingGold += 6;
    }
    
    return startingGold;
}

/**
 * Add a hero to all 3 computer teams (when player gets hero 2 or 3)
 */
export async function addHeroToComputerTeams(roomRef, playerHeroNames) {
    if (!roomRef || !Array.isArray(playerHeroNames)) {
        return false;
    }

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        // Use new filtering function that handles ascended heroes
        const availableHeroes = getAvailableHeroesForDraft(playerHeroNames, teams);
        if (availableHeroes.length < 3) return false;

        // Select heroes smartly for each team based on their current formation
        const newHeroes = [];
        ['team1', 'team2', 'team3'].forEach((teamKey) => {
            const team = teams[teamKey];
            const position = team.heroCount + 1; // 2 or 3 depending on current count
            
            // Get available heroes for this team (excluding already selected for other teams)
            const availableForTeam = availableHeroes.filter(name => !newHeroes.includes(name));
            
            // Use smart selection based on current team formation
            const selectedHero = selectSmartHero(availableForTeam, position, team.formation);
            newHeroes.push(selectedHero);
        });

        const updates = {};
        ['team1', 'team2', 'team3'].forEach((teamKey, index) => {
            const team = teams[teamKey];
            const newHeroName = newHeroes[index];
            const targetSlot = team.heroCount === 1 ? 'center' : 'right';

            const heroData = {
                id: Math.floor(Math.random() * 10000),
                name: newHeroName,
                image: `./Cards/All/${newHeroName}.png`,
                filename: `${newHeroName}.png`,
                permanentAttackBonusses: 0,
                permanentHpBonusses: 0,
                attackBonusses: 0,
                hpBonusses: 0
            };

            const newHeroCards = getHeroCards(newHeroName);
            const currentDeck = team.deck || [];
            const updatedDeck = [...currentDeck, ...newHeroCards];

            const newHeroGold = calculateStartingGoldForHero(newHeroName);
            const currentGold = team.gold || 0;
            const updatedGold = currentGold + newHeroGold;

            updates[`${teamKey}/formation/${targetSlot}`] = heroData;
            updates[`${teamKey}/abilities/${targetSlot}`] = initializeHeroAbilities(newHeroName);
            updates[`${teamKey}/spellbooks/${targetSlot}`] = [];
            updates[`${teamKey}/creatures/${targetSlot}`] = [];
            updates[`${teamKey}/equipment/${targetSlot}`] = [];
            updates[`${teamKey}/heroCount`] = team.heroCount + 1;
            updates[`${teamKey}/deck`] = updatedDeck;
            updates[`${teamKey}/gold`] = updatedGold;
        });

        await roomRef.child('singleplayer/computerTeams').update(updates);
        return true;

    } catch (error) {
        return false;
    }
}

// ============================================
// UPDATE ORCHESTRATION
// ============================================

/**
 * Master function to update all 3 computer teams after battle
 * WRAPPER: Orchestrates all update modules
/**
 * Process BurningFinger counter increases for all CPU teams
 * @param {Object} roomRef - Firebase room reference
 * @returns {Promise<boolean>} Success status
 */
async function processBurningFingerCounters(roomRef) {
    if (!roomRef) return false;
    
    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;
        
        const burningFingerSpell = new BurningFingerSpell(null);
        const updates = {};
        let totalUpdates = 0;
        
        ['team1', 'team2', 'team3'].forEach(teamKey => {
            const team = teams[teamKey];
            if (!team) return;
            
            const result = burningFingerSpell.increaseCPUCountersAfterBattle(team);
            
            if (result.updated) {
                result.changes.forEach(change => {
                    updates[`${teamKey}/formation/${change.position}/burningFingerStack`] = change.newStacks;
                    totalUpdates++;
                });
            }
        });
        
        if (totalUpdates > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
            console.log(`[BurningFinger CPU] Updated ${totalUpdates} hero counters across all teams`);
        }
        
        return true;
    } catch (error) {
        console.error('Error processing BurningFinger counters:', error);
        return false;
    }
}

 
export async function updateCPUTeams(roomRef, currentTurn, battleResult = 'defeat') {
    if (!roomRef) {
        console.error('updateCPUTeams: No room reference provided');
        return { success: false, error: 'No room reference' };
    }
    
    const results = {
        abilities: false,
        artifacts: false,
        legendarySwords: false,
        hands: false,
        gold: false,
        spells: false,
        potions: false,
        areaCounters: false,
        heroEffects: false,
        creatureTurnEffects: false,
        timestamp: Date.now()
    };

    try {
        // Step 0: Clear potion effects, delayed effects, and spell shields
        const clearUpdates = {};
        const teamsSnapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const currentTeams = teamsSnapshot.val();

        ['team1', 'team2', 'team3'].forEach(teamKey => {
            clearUpdates[`${teamKey}/activePotionEffects`] = [];
            clearUpdates[`${teamKey}/delayedEffects`] = [];
            
            if (currentTeams && currentTeams[teamKey] && currentTeams[teamKey].formation) {
                ['left', 'center', 'right'].forEach(position => {
                    const hero = currentTeams[teamKey].formation[position];
                    if (hero && hero.name) {
                        clearUpdates[`${teamKey}/formation/${position}/spellShields`] = 0;
                    }
                });
            }
        });

        await roomRef.child('singleplayer/computerTeams').update(clearUpdates);
        
        // Step 1: Update Area card counters
        results.areaCounters = await processComputerAreaCountersAfterBattle(roomRef);
        
        // Step 2: Update hands, decks, graveyards
        results.hands = await updateComputerHandsAfterBattle(roomRef);
        
        // Step 3: Award post-battle gold
        results.gold = await awardComputerGoldAfterBattle(roomRef, battleResult);

        // Step 4: Process hero-specific effects
        results.heroEffects = await processHeroEffectsAfterUpdate(roomRef, currentTurn);

        // Step 4.5: Process creature turn-start effects (ResilientMonkee, etc.)
        results.creatureTurnEffects = await processAllCreatureTurnEffects(roomRef, currentTurn);

        // Step 5: Update abilities
        results.abilities = await updateComputerAbilitiesAfterBattle(roomRef);
        
        // Step 6: Process artifacts
        results.artifacts = await processComputerArtifactsAfterBattle(roomRef);
        
        // Step 7: Process Legendary Sword bonuses
        results.legendarySwords = await processLegendarySwordBonuses(roomRef, currentTurn);
        
        // Step 8: Process spells
        results.spells = await processComputerSpellsAfterBattle(roomRef, currentTurn);


        // Step 8.5: Process BurningFinger counter increases
        results.burningFinger = await processBurningFingerCounters(roomRef);
        // Step 9: Process creature evolutions
        results.creatureEvolutions = await processComputerCreaturesAfterBattle(roomRef);
        
        // Step 10: Process potions
        results.potions = await processComputerPotionsAfterBattle(roomRef);

        // Step 11: Activate Ability active effects
        results.abilityEffects = await processAbilityEffectsAfterUpdate(roomRef);

        // Step 12: Process hero ascensions (Monia, Beato, Waflav evolutions)
        results.ascensions = await processComputerAscensionsAfterBattle(roomRef, currentTurn);
        

        // Step 13: Sort all creatures following strategic priority rules
        results.creatureSorting = await sortAllComputerCreatures(roomRef);
        
        const allSucceeded = Object.values(results).every(v => v === true || typeof v !== 'boolean');
        
        return {
            success: allSucceeded,
            results,
            timestamp: Date.now()
        };
        
    } catch (error) {
        console.error('❌ Error during CPU team updates:', error);
        return {
            success: false,
            error: error.message,
            results,
            timestamp: Date.now()
        };
    }
}

// ============================================
// TEAM SELECTION FOR BATTLE
// ============================================

/**
 * Select and randomize one computer team for battle
 * Returns Hero INSTANCES created using the Hero class
 */
export async function selectComputerTeamForBattle(roomRef, currentTurn = 1, guaranteedOpponent = 'Vacarn') {
    if (!roomRef) return null;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return null;

        let randomTeamKey;
        if (guaranteedOpponent && guaranteedOpponent !== '') {
            randomTeamKey = 'team1';
        } else {
            const teamIndex = ((currentTurn - 1) % 3) + 1;
            randomTeamKey = `team${teamIndex}`;
        }
        
        const selectedTeam = teams[randomTeamKey];
        if (!selectedTeam) return null;

        const randomizedFormation = randomizeFormation(selectedTeam.formation, selectedTeam.heroCount);
        const resources = generateComputerResources(selectedTeam, randomizedFormation, currentTurn);

        const reorderedAbilities = reorderTeamData(
            selectedTeam.abilities || { left: null, center: null, right: null }, 
            selectedTeam.formation, 
            randomizedFormation
        );
        
        const reorderedEquipment = reorderTeamData(
            selectedTeam.equipment || { left: [], center: [], right: [] },
            selectedTeam.formation,
            randomizedFormation
        );

        const reorderedSpellbooks = reorderTeamData(
            selectedTeam.spellbooks || { left: [], center: [], right: [] },
            selectedTeam.formation,
            randomizedFormation
        );
        
        const reorderedCreatures = reorderTeamData(
            selectedTeam.creatures || { left: [], center: [], right: [] },
            selectedTeam.formation,
            randomizedFormation
        );

        // Save equipment to Firebase
        try {
            const equipmentUpdates = {};
            ['left', 'center', 'right'].forEach(position => {
                const hero = selectedTeam.formation[position];
                if (hero) {
                    const originalPos = ['left', 'center', 'right'].find(pos => 
                        selectedTeam.formation[pos] && selectedTeam.formation[pos].name === hero.name
                    );
                    if (originalPos && reorderedEquipment[position]) {
                        equipmentUpdates[`${randomTeamKey}/equipment/${originalPos}`] = reorderedEquipment[position];
                    }
                }
            });
            
            if (Object.keys(equipmentUpdates).length > 0) {
                await roomRef.child('singleplayer/computerTeams').update(equipmentUpdates);
            }
        } catch (error) {
            console.error('Failed to save debug swords:', error);
        }

        // Create Hero instances
        const heroInstances = {};
        const opponentEffectiveStats = {};
        
        ['left', 'center', 'right'].forEach(position => {
            const heroData = randomizedFormation[position];
            if (heroData) {                
                const uniqueGraveyardCards = new Set(selectedTeam.graveyard || []).size;
                const calculatedStats = calculateComputerHeroStats(
                    randomizedFormation, 
                    position, 
                    reorderedAbilities,
                    reorderedEquipment,
                    uniqueGraveyardCards
                );
                                
                const heroInstance = new Hero(heroData, position, 'opponent', 'cpu');
                
                if (reorderedAbilities[position]) {
                    heroInstance.setAbilities(reorderedAbilities[position]);
                }
                
                if (reorderedSpellbooks[position]) {
                    heroInstance.setSpellbook(reorderedSpellbooks[position]);
                }
                
                if (reorderedCreatures[position]) {
                    heroInstance.setCreatures(reorderedCreatures[position]);
                }
                
                if (reorderedEquipment[position]) {
                    heroInstance.setEquipment(reorderedEquipment[position]);
                }
                
                if (heroData.attackBonusses) {
                    heroInstance.attackBonusses = heroData.attackBonusses;
                }
                if (heroData.hpBonusses) {
                    heroInstance.hpBonusses = heroData.hpBonusses;
                }
                if (heroData.permanentAttackBonusses) {
                    heroInstance.permanentAttackBonusses = heroData.permanentAttackBonusses;
                }
                if (heroData.permanentHpBonusses) {
                    heroInstance.permanentHpBonusses = heroData.permanentHpBonusses;
                }
                
                if (calculatedStats) {
                    heroInstance.setPrecalculatedStats(calculatedStats);
                }
                
                heroInstances[position] = heroInstance;
                opponentEffectiveStats[position] = calculatedStats;
            } else {
                heroInstances[position] = null;
                opponentEffectiveStats[position] = null;
            }
        });

        // Calculate alchemy bonuses
        let cpuAlchemyCount = 0;
        ['left', 'center', 'right'].forEach(position => {
            if (reorderedAbilities[position]) {
                ['zone1', 'zone2', 'zone3'].forEach(zone => {
                    if (reorderedAbilities[position][zone]) {
                        const alchemyInZone = reorderedAbilities[position][zone].filter(
                            ability => ability && ability.name === 'Alchemy'
                        ).length;
                        cpuAlchemyCount += alchemyInZone;
                    }
                });
            }
        });

        const opponentPotionState = {
            basePotions: 1,
            alchemyBonuses: cpuAlchemyCount,
            availablePotions: 1 + cpuAlchemyCount,
            maxPotions: 1 + cpuAlchemyCount,
            activePotionEffects: selectedTeam.activePotionEffects || [],
            exportedAt: Date.now()
        };

        const areaCard = selectedTeam.areaCard || null;
        const delayedEffects = selectedTeam.delayedEffects || [];

        const teamData = {
            formation: heroInstances,
            abilities: reorderedAbilities,
            spellbooks: reorderedSpellbooks,
            creatures: reorderedCreatures,
            equipment: reorderedEquipment,
            graveyard: resources.graveyard,
            deck: resources.deck,
            hand: resources.hand,
            gold: resources.gold,
            counters: selectedTeam.counters || { 
                birthdayPresent: 0, 
                teleports: 0, 
                goldenBananas: 0, 
                evolutionCounters: 1, 
                lunaBuffs: 0, 
                supplyChain: 0 
            },
            magicSapphiresUsed: selectedTeam.magicSapphiresUsed || 0,
            magicRubiesUsed: selectedTeam.magicRubiesUsed || 0,
            permanentArtifacts: selectedTeam.permanentArtifacts || [],
            activePotionEffects: selectedTeam.activePotionEffects || [],
            potionState: opponentPotionState,
            heroCount: selectedTeam.heroCount,
            selectedTeamKey: randomTeamKey,
            effectiveStats: opponentEffectiveStats,
            areaCard: areaCard,
            delayedEffects: delayedEffects
        };

        return teamData;

    } catch (error) {
        return null;
    }
}

// ============================================
// BATTLE PERSISTENCE
// ============================================

/**
 * Save modified deck, hand, and graveyard after battle
 */
export async function saveComputerTeamAfterBattle(roomRef, teamKey, deck, hand, graveyard, creatures = null) {
    if (!roomRef || !teamKey) return false;

    try {
        const updates = {
            [`${teamKey}/deck`]: deck,
            [`${teamKey}/hand`]: hand,
            [`${teamKey}/graveyard`]: graveyard
        };
        
        if (creatures) {
            updates[`${teamKey}/creatures`] = creatures;
            console.log(`💾 Saving CPU team ${teamKey} creatures:`, {
                left: creatures.left?.length || 0,
                center: creatures.center?.length || 0,
                right: creatures.right?.length || 0
            });
        }

        await roomRef.child('singleplayer/computerTeams').update(updates);
        return true;

    } catch (error) {
        console.error('Error saving computer team after battle:', error);
        return false;
    }
}

/**
 * Merge permanent creatures from battle into CPU team's existing creatures
 */
export function mergePermanentCreaturesForCPU(existingCreatures, permanentGuardians, permanentCaptures, cpuAbsoluteSide) {
    const mergedCreatures = {
        left: [...(existingCreatures?.left || [])],
        center: [...(existingCreatures?.center || [])],
        right: [...(existingCreatures?.right || [])]
    };
    
    const cpuGuardians = permanentGuardians.filter(g => g.heroAbsoluteSide === cpuAbsoluteSide);
    const cpuCaptures = permanentCaptures.filter(c => c.heroAbsoluteSide === cpuAbsoluteSide);
    
    cpuGuardians.forEach(guardianData => {
        const position = guardianData.heroPosition;
        if (!mergedCreatures[position]) {
            mergedCreatures[position] = [];
        }
        
        guardianData.guardians.forEach(guardian => {
            const isDuplicate = mergedCreatures[position].some(c => 
                c.name === guardian.name && 
                c.permanentSkeletonGuardian === true &&
                c.addedAt === guardian.addedAt
            );
            
            if (!isDuplicate) {
                mergedCreatures[position].push({
                    name: guardian.name,
                    currentHp: guardian.currentHp,
                    maxHp: guardian.maxHp,
                    atk: guardian.atk,
                    alive: guardian.alive,
                    type: 'creature',
                    addedAt: guardian.addedAt,
                    permanentSkeletonGuardian: true,
                    creationTurn: guardian.creationTurn,
                    physicalAttack: guardian.physicalAttack,
                    isPermanent: true,
                    sourceHero: guardianData.heroName
                });
            }
        });
    });
    
    cpuCaptures.forEach(captureData => {
        const position = captureData.heroPosition;
        if (!mergedCreatures[position]) {
            mergedCreatures[position] = [];
        }
        
        captureData.captures.forEach(capture => {
            const isDuplicate = mergedCreatures[position].some(c => 
                c.name === capture.name && 
                c.permanentCapture === true &&
                c.capturedAt === capture.capturedAt
            );
            
            if (!isDuplicate) {
                mergedCreatures[position].push({
                    name: capture.name,
                    currentHp: capture.currentHp,
                    maxHp: capture.maxHp,
                    atk: capture.atk,
                    alive: false,
                    type: 'creature',
                    capturedBy: 'CaptureNet',
                    capturedFrom: capture.capturedFrom,
                    capturedAt: capture.capturedAt,
                    originalOwner: capture.originalOwner,
                    newOwner: capture.newOwner,
                    permanentCapture: true,
                    isPermanent: true
                });
            }
        });
    });
    
    return mergedCreatures;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get a representative hero for opponent selection display
 */
export function getRepresentativeHero(formation) {
    const leftHero = formation.left;
    const centerHero = formation.center;
    const rightHero = formation.right;
    
    const firstHero = leftHero || centerHero || rightHero;
    
    if (firstHero) {
        if (firstHero instanceof Hero) {
            return {
                id: firstHero.id,
                name: firstHero.name,
                image: firstHero.image,
                filename: firstHero.filename
            };
        }
        return firstHero;
    }
    
    return {
        id: 999,
        name: 'AI Opponent',
        image: './Cards/All/Alice.png',
        filename: 'Alice.png'
    };
}

/**
 * Check if computer teams exist
 */
export async function computerTeamsExist(roomRef) {
    if (!roomRef) return false;
    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        return snapshot.exists();
    } catch (error) {
        return false;
    }
}

/**
 * Get current computer teams data
 */
export async function getComputerTeams(roomRef) {
    if (!roomRef) return null;
    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        return snapshot.val();
    } catch (error) {
        return null;
    }
}

/**
 * Get all obtainable heroes (excluding unobtainable ones)
 */
function getObtainableHeroes() {
    const allHeroNames = [
        'Alice', 'Cecilia', 'Gon', 'Ida', 'Medea',
        'Monia', 'Nicolas', 'Toras', 'Sid', 'Darge', 
        'Vacarn', 'Tharx', 'Semi', 'Kazena', 'Heinz',
        'Kyli', 'Nomu', 'Beato', 'Waflav', 'Luna', 'Ghuanjun',
        'Mary', 'Carris', 'Nao', 'Thep', 'Gabby'
    ];
    
    return allHeroNames.filter(heroName => {
        const heroInfo = getHeroInfo(heroName);
        return !heroInfo || !heroInfo.unobtainable;
    });
}

/**
 * Randomize hero formation with special positioning rules
 */
function randomizeFormation(formation, heroCount) {
    const heroes = [];
    ['left', 'center', 'right'].forEach(pos => {
        if (formation[pos]) {
            const hero = { 
                ...formation[pos],
                originalPos: pos 
            };
            heroes.push(hero);
        }
    });

    if (heroes.length === 0) {
        return { left: null, center: null, right: null };
    }

    const newFormation = { left: null, center: null, right: null };

    const monicaHero = heroes.find(h => h.name === 'Monia');
    const tharxHero = heroes.find(h => h.name === 'Tharx');

    if (monicaHero && heroCount === 3 && Math.random() < 0.8) {
        newFormation.center = monicaHero;
        heroes.splice(heroes.indexOf(monicaHero), 1);
    }

    if (tharxHero && heroCount >= 2 && Math.random() < 0.66 && !newFormation.left) {
        newFormation.left = tharxHero;
        heroes.splice(heroes.indexOf(tharxHero), 1);
    }

    for (let i = heroes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [heroes[i], heroes[j]] = [heroes[j], heroes[i]];
    }

    const slots = ['left', 'center', 'right'];
    let heroIndex = 0;

    for (const slot of slots) {
        if (!newFormation[slot] && heroIndex < heroes.length) {
            newFormation[slot] = heroes[heroIndex];
            heroIndex++;
        }
    }

    return newFormation;
}

/**
 * Reorder team data to match randomized formation
 */
function reorderTeamData(originalData, originalFormation, newFormation) {
    if (!originalData) return { left: null, center: null, right: null };

    const reordered = { left: null, center: null, right: null };

    ['left', 'center', 'right'].forEach(newPos => {
        const hero = newFormation[newPos];
        if (hero) {
            const originalPos = ['left', 'center', 'right'].find(pos => 
                originalFormation[pos] && originalFormation[pos].name === hero.name
            );

            if (originalPos && originalData[originalPos]) {
                reordered[newPos] = originalData[originalPos];
            }
        }
    });

    return reordered;
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

export async function generateComputerParty(turn, playerHeroes = []) {
    const availableHeroes = getObtainableHeroes();
    const excludedNames = playerHeroes.map(h => h?.name).filter(Boolean);
    const filteredHeroes = availableHeroes.filter(name => !excludedNames.includes(name));
    
    const heroCount = Math.min(3, Math.max(1, Math.floor(turn / 2) + 1));
    const shuffled = [...filteredHeroes].sort(() => Math.random() - 0.5);
    const selectedHeroes = shuffled.slice(0, heroCount);
    
    const formation = { left: null, center: null, right: null };
    const slots = ['left', 'center', 'right'];
    selectedHeroes.forEach((heroName, index) => {
        formation[slots[index]] = {
            id: Math.floor(Math.random() * 10000),
            name: heroName,
            image: `./Cards/All/${heroName}.png`,
            filename: `${heroName}.png`,
            permanentAttackBonusses: 0,
            permanentHpBonusses: 0
        };
    });
    
    const abilities = { left: null, center: null, right: null };
    const spellbooks = { left: null, center: null, right: null };
    const creatures = { left: null, center: null, right: null };
    const equipment = { left: null, center: null, right: null };
    const effectiveStats = { left: null, center: null, right: null };
    
    slots.forEach(slot => {
        if (formation[slot]) {
            abilities[slot] = initializeHeroAbilities(formation[slot].name);
            spellbooks[slot] = [];
            creatures[slot] = [];
            equipment[slot] = [];
            effectiveStats[slot] = null;
        }
    });
    
    return {
        formation,
        deck: [],
        hand: [],
        graveyard: [],
        heroCount,
        abilities,
        spellbooks,
        creatures,
        equipment,
        permanentArtifacts: [],
        counters: {
            birthdayPresent: 0,
            teleports: 0,
            goldenBananas: 0,
            evolutionCounters: 1,
            lunaBuffs: 0,
            supplyChain: 0
        },
        areaCard: null,
        effectiveStats,
        delayedEffects: [],  
        representativeHero: getRepresentativeHero(formation)
    };
}

export function generateComputerDeck(formation, turn) { return []; }
export function generateComputerHand(deck) { return []; }
export function generateComputerGraveyard(deck, turn) { return []; }