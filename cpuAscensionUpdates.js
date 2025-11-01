// cpuAscensionUpdates.js - CPU Hero Ascension System

import { getCardInfo } from './cardDatabase.js';
import { calculateComputerHeroStats } from './cpuArtifactUpdates.js';
import { getDifficultyValue } from './cpuDifficultyConfig.js';

/**
 * Process ascensions for all computer teams after battle
 */
export async function processComputerAscensionsAfterBattle(roomRef, currentTurn = 1) {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        // Get player creature count for Waflav evolution logic
        let playerCreatureCount = 0;
        try {
            const gameStateSnapshot = await roomRef.child('gameState').once('value');
            const gameState = gameStateSnapshot.val();
            if (gameState && gameState.hostCreaturesState) {
                playerCreatureCount = countTotalCreatures(gameState.hostCreaturesState);
            }
        } catch (error) {
            console.error('Error loading player creature count for Waflav evolution:', error);
        }

        const updates = {};

        for (const teamKey of ['team1', 'team2', 'team3']) {
            const team = teams[teamKey];
            if (!team || !team.formation) continue;

            // Get team difficulty
            const difficulty = team.difficulty || 'Normal';
            const ascensionChance = getDifficultyValue(difficulty, 'ascension', 'moniaBeato');

            // Process each hero position
            for (const position of ['left', 'center', 'right']) {
                const hero = team.formation[position];
                if (!hero) continue;

                const heroName = hero.name;

                // Check for Monia -> MoniaBot ascension (difficulty-based chance if conditions met)
                if (heroName === 'Monia') {
                    const canAscend = checkMoniaAscension(team, position);
                    if (canAscend && Math.random() < ascensionChance) {
                        performAscension(updates, teamKey, position, hero, 'MoniaBot', team);
                        console.log(`🌟 CPU ${teamKey} [${difficulty}] ${position}: Monia ascended to MoniaBot (600+ HP)!`);
                    }
                }

                // Check for Beato -> EternalBeato ascension (difficulty-based chance if conditions met)
                if (heroName === 'Beato') {
                    const canAscend = checkBeatoAscension(team, position);
                    if (canAscend && Math.random() < ascensionChance) {
                        performAscension(updates, teamKey, position, hero, 'EternalBeato', team);
                        console.log(`🌟 CPU ${teamKey} [${difficulty}] ${position}: Beato ascended to EternalBeato (8+ unique spells)!`);
                    }
                }

                // Handle Waflav evolution system (has its own internal probability logic)
                if (isWaflavForm(heroName)) {
                    const evolutionResult = processWaflavEvolution(
                        team, 
                        position, 
                        hero, 
                        playerCreatureCount,
                        difficulty
                    );
                    
                    if (evolutionResult.shouldEvolve) {
                        performAscension(
                            updates, 
                            teamKey, 
                            position, 
                            hero, 
                            evolutionResult.targetForm,
                            team,
                            evolutionResult.newCounters
                        );
                        console.log(`🌟 CPU ${teamKey} ${position}: ${heroName} evolved to ${evolutionResult.targetForm} (${evolutionResult.newCounters} counters)!`);
                    } else if (evolutionResult.counterUpdate) {
                        // Just update counters without evolving
                        if (!updates[`${teamKey}/counters`]) {
                            updates[`${teamKey}/counters`] = { ...(team.counters || {}) };
                        }
                        updates[`${teamKey}/counters`].evolutionCounters = evolutionResult.newCounters;
                    }
                }
            }
        }

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
            return true;
        }

        return true;

    } catch (error) {
        console.error('Error processing CPU ascensions:', error);
        return false;
    }
}

/**
 * Check if Monia can ascend (needs 600+ max HP)
 */
function checkMoniaAscension(team, position) {
    const uniqueGraveyardCards = new Set(team.graveyard || []).size;
    const stats = calculateComputerHeroStats(
        team.formation,
        position,
        team.abilities || { left: null, center: null, right: null },
        team.equipment || { left: [], center: [], right: [] },
        uniqueGraveyardCards
    );
    
    return stats && stats.maxHp >= 600;
}

/**
 * Check if Beato can ascend (needs 8+ unique spells)
 */
function checkBeatoAscension(team, position) {
    const spellbook = team.spellbooks?.[position];
    if (!spellbook || !Array.isArray(spellbook)) return false;
    
    const uniqueSpells = new Set(spellbook.map(spell => spell.name || spell.cardName || spell));
    return uniqueSpells.size >= 8;
}

/**
 * Check if a hero is any form of Waflav
 */
function isWaflavForm(heroName) {
    return heroName === 'Waflav' || 
           heroName === 'ThunderstruckWaflav' || 
           heroName === 'SwampborneWaflav' || 
           heroName === 'FlamebathedWaflav' || 
           heroName === 'StormkissedWaflav' || 
           heroName === 'DeepDrownedWaflav';
}

/**
 * Process Waflav evolution logic with complex counter-based rules
 */
function processWaflavEvolution(team, position, hero, playerCreatureCount, difficulty = 'Normal') {
    const heroName = hero.name;
    
    // Initialize counters if not present
    if (!team.counters) {
        team.counters = {
            birthdayPresent: 0,
            teleports: 0,
            goldenBananas: 0,
            evolutionCounters: 1,
            lunaBuffs: 0,
            supplyChain: 0
        };
    }
    
    let currentCounters = team.counters.evolutionCounters || 1;
    
    // Get difficulty-based counter gain range
    const counterRange = getDifficultyValue(difficulty, 'ascension', 'evolutionCounterGain');
    const counterGain = Math.floor(Math.random() * (counterRange.max - counterRange.min + 1)) + counterRange.min;
    currentCounters += counterGain;
    
    console.log(`🔄 CPU Waflav evolution check [${difficulty}]: ${heroName}, ${currentCounters} counters (gained ${counterGain}), player creatures: ${playerCreatureCount}`);
    
    // PRIORITY 1 (GUARANTEED): Devolve from FlamebathedWaflav if > 6 counters
    if (heroName === 'FlamebathedWaflav' && currentCounters > 6) {
        return {
            shouldEvolve: true,
            targetForm: 'Waflav',
            newCounters: currentCounters
        };
    }
    
    // PRIORITY 2 (GUARANTEED): Evolve to StormkissedWaflav if < 5 counters (any form except already StormkissedWaflav)
    if (currentCounters < 5 && heroName !== 'StormkissedWaflav') {
        return {
            shouldEvolve: true,
            targetForm: 'StormkissedWaflav',
            newCounters: currentCounters + 3
        };
    }
    
    // PRIORITY 3 (33% chance): DeepDrownedWaflav if >= 6 counters and player has > 3 creatures
    if (currentCounters >= 6 && playerCreatureCount > 3 && heroName !== 'DeepDrownedWaflav') {
        if (Math.random() < 0.33) {
            return {
                shouldEvolve: true,
                targetForm: 'DeepDrownedWaflav',
                newCounters: Math.max(1, currentCounters - 3) // Ensure minimum 1 counter
            };
        }
    }
    
    // PRIORITY 4 (33% chance): Random evolution to ThunderstruckWaflav or SwampborneWaflav if > 10 counters
    if (currentCounters > 10 && heroName !== 'ThunderstruckWaflav' && heroName !== 'SwampborneWaflav') {
        if (Math.random() < 0.33) {
            const targetForm = Math.random() < 0.5 ? 'ThunderstruckWaflav' : 'SwampborneWaflav';
            // ThunderstruckWaflav reduces counters to 6, SwampborneWaflav keeps current
            const newCounters = targetForm === 'ThunderstruckWaflav' ? 6 : currentCounters;
            return {
                shouldEvolve: true,
                targetForm: targetForm,
                newCounters: newCounters
            };
        }
    }
    
    // PRIORITY 5 (33% chance): FlamebathedWaflav if 5-10 counters and no other condition met
    if (currentCounters >= 5 && currentCounters <= 10 && heroName !== 'FlamebathedWaflav') {
        if (Math.random() < 0.33) {
            return {
                shouldEvolve: true,
                targetForm: 'FlamebathedWaflav',
                newCounters: 3 // Set to 3 when evolving to FlamebathedWaflav
            };
        }
    }
    
    // No evolution, just update counters
    return {
        shouldEvolve: false,
        counterUpdate: true,
        newCounters: currentCounters
    };
}

/**
 * Perform the actual ascension/evolution
 */
function performAscension(updates, teamKey, position, hero, targetForm, team, newCounters = null) {
    const ascendedInfo = getCardInfo(targetForm);
    if (!ascendedInfo) {
        console.error(`Failed to get info for ascended form: ${targetForm}`);
        return;
    }
    
    // Build ascension stack (evolution history)
    let ascendedStack = hero.ascendedStack ? [...hero.ascendedStack] : [];
    if (!ascendedStack.includes(hero.name)) {
        ascendedStack.push(hero.name);
    }
    
    // Create ascended hero with preserved data
    const ascendedHero = {
        ...hero,
        name: targetForm,
        image: ascendedInfo.image,
        ascendedStack: ascendedStack
        // Preserve all existing bonuses
    };
    
    updates[`${teamKey}/formation/${position}`] = ascendedHero;
    
    // Update evolution counters if provided (for Waflav)
    if (newCounters !== null) {
        if (!updates[`${teamKey}/counters`]) {
            updates[`${teamKey}/counters`] = { ...(team.counters || {}) };
        }
        updates[`${teamKey}/counters`].evolutionCounters = newCounters;
    }
}

/**
 * Count total creatures across all hero positions
 */
function countTotalCreatures(creaturesState) {
    let count = 0;
    ['left', 'center', 'right'].forEach(position => {
        if (creaturesState[position] && Array.isArray(creaturesState[position])) {
            count += creaturesState[position].length;
        }
    });
    return count;
}