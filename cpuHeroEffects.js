// cpuHeroEffects.js - Hero-specific effects (Heinz, Kyli, Vacarn, Luna, Beato, Mary)

import { getCardInfo, getAllCardNames } from './cardDatabase.js';
import { countAbilityStacks } from './cpuHelpers.js';

/**
 * Process hero-specific effects after battle for all computer teams
 */
export async function processHeroEffectsAfterUpdate(roomRef, currentTurn = 1) {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        for (const teamKey of ['team1', 'team2', 'team3']) {
            const team = teams[teamKey];
            if (!team || !team.formation) continue;

            let currentCreatures = JSON.parse(JSON.stringify(team.creatures || { left: [], center: [], right: [] }));
            let currentDeck = [...(team.deck || [])];
            let currentGraveyard = [...(team.graveyard || [])];
            let currentSpellbooks = JSON.parse(JSON.stringify(team.spellbooks || { left: [], center: [], right: [] }));

            // HEINZ GRAVEYARD MILLING
            const hasHeinz = ['left', 'center', 'right'].some(pos => {
                const hero = team.formation[pos];
                return hero && hero.name === 'Heinz';
            });

            if (hasHeinz && currentDeck.length > 0) {
                const X = Math.ceil(currentTurn / 2);
                const Y = currentGraveyard.filter(cardName => cardName === 'FutureTechLamp').length;
                const randomBonus = Math.floor(Math.random() * (X + 1));
                let cardsToMill = currentTurn + (randomBonus * Y);
                cardsToMill = Math.max(1, Math.min(8, cardsToMill));
                
                for (let i = 0; i < cardsToMill; i++) {
                    const randomIndex = Math.floor(Math.random() * currentDeck.length);
                    const copiedCard = currentDeck[randomIndex];
                    currentGraveyard.push(copiedCard);
                }
            }

            // KYLI BIOMANCY TOKEN BOOST
            const hasKyli = ['left', 'center', 'right'].some(pos => {
                const hero = team.formation[pos];
                return hero && hero.name === 'Kyli';
            });

            if (hasKyli) {
                ['left', 'center', 'right'].forEach(position => {
                    const creatures = currentCreatures[position] || [];
                    creatures.forEach((creature, index) => {
                        const creatureName = creature.name || creature.cardName || creature;
                        if (creatureName === 'BiomancyToken') {
                            creature.maxHp = (creature.maxHp || 10) + 20;
                            creature.currentHp = (creature.currentHp || 10) + 20;
                            creature.hp = (creature.hp || 10) + 20;
                        }
                    });
                });
            }

            // VACARN SKELETON SUMMONING
            const vacarnPosition = ['left', 'center', 'right'].find(pos => {
                const hero = team.formation[pos];
                return hero && hero.name === 'Vacarn';
            });

            if (vacarnPosition) {
                if (Math.random() < 0.9) {
                    const necromancyLevel = countAbilityStacks(team.abilities, vacarnPosition, 'Necromancy');
                    
                    if (necromancyLevel > 0) {
                        const allCards = getAllCardNames();
                        const eligibleSkeletons = allCards.filter(cardName => {
                            if (!cardName.includes('Skeleton')) return false;
                            
                            const cardInfo = getCardInfo(cardName);
                            if (!cardInfo || cardInfo.cardType !== 'Spell' || cardInfo.subtype !== 'Creature') {
                                return false;
                            }
                            
                            const creatureLevel = cardInfo.level || 0;
                            return creatureLevel <= necromancyLevel;
                        });
                        
                        if (eligibleSkeletons.length > 0) {
                            const selectedSkeleton = eligibleSkeletons[Math.floor(Math.random() * eligibleSkeletons.length)];
                            const skeletonInfo = getCardInfo(selectedSkeleton);
                            
                            if (skeletonInfo) {
                                if (!currentCreatures[vacarnPosition]) {
                                    currentCreatures[vacarnPosition] = [];
                                }
                                
                                currentCreatures[vacarnPosition].push({
                                    name: selectedSkeleton,
                                    image: skeletonInfo.image,
                                    cardType: skeletonInfo.cardType,
                                    addedAt: Date.now(),
                                    isPermanent: true,
                                    sourceHero: 'Vacarn'
                                });
                            }
                        }
                    }
                }
            }

            // LUNA LUNA BUFFS CALCULATION
            const turnCycle = ((currentTurn - 1) % 3) + 1;
            const matchups = {
                1: { team1: 'player', team2: 'team3', team3: 'team2' },
                2: { team1: 'team3', team2: 'player', team3: 'team1' },
                3: { team1: 'team2', team2: 'team3', team3: 'player' }
            };

            let playerData = null;
            const needsPlayerData = Object.values(matchups[turnCycle]).includes('player');
            if (needsPlayerData) {
                try {
                    const gameStateSnapshot = await roomRef.child('gameState').once('value');
                    const gameState = gameStateSnapshot.val();
                    if (gameState) {
                        playerData = {
                            formation: gameState.hostBattleFormation || {},
                            creatures: gameState.hostCreaturesState || {}
                        };
                    }
                } catch (error) {
                    console.error('Error loading player data for Luna effect:', error);
                }
            }

            for (const loopTeamKey of ['team1', 'team2', 'team3']) {
                const loopTeam = teams[loopTeamKey];
                if (!loopTeam || !loopTeam.formation) continue;

                const lunaPosition = ['left', 'center', 'right'].find(pos => {
                    const hero = loopTeam.formation[pos];
                    return hero && hero.name === 'Luna';
                });

                if (lunaPosition) {
                    const opponentKey = matchups[turnCycle][loopTeamKey];
                    
                    let targetCount = 0;
                    if (opponentKey === 'player') {
                        if (playerData) {
                            targetCount = countLunaTargets(playerData.formation, playerData.creatures);
                        }
                    } else {
                        const opponentTeam = teams[opponentKey];
                        if (opponentTeam) {
                            targetCount = countLunaTargets(opponentTeam.formation, opponentTeam.creatures);
                        }
                    }
                    
                    const lunaItemCount = countLunaItems(loopTeam);
                    const multiplier = Math.random() * 1.5 + 0.5;
                    const lunaBuffsToAdd = Math.floor(targetCount * lunaItemCount * multiplier);
                    
                    if (lunaBuffsToAdd > 0) {
                        if (!loopTeam.counters) {
                            loopTeam.counters = {
                                birthdayPresent: 0,
                                teleports: 0,
                                goldenBananas: 0,
                                evolutionCounters: 1,
                                lunaBuffs: 0,
                                supplyChain: 0
                            };
                        }
                        if (!loopTeam.counters.lunaBuffs) {
                            loopTeam.counters.lunaBuffs = 0;
                        }
                        
                        loopTeam.counters.lunaBuffs += lunaBuffsToAdd;
                        updates[`${loopTeamKey}/counters`] = loopTeam.counters;
                    }
                }
            }

            // BEATO SPELL LEARNING (AFTER TURN 1)
            if (currentTurn > 1) {
                const beatoPosition = ['left', 'center', 'right'].find(pos => {
                    const hero = team.formation[pos];
                    return hero && (hero.name === 'Beato' || hero.name === 'EternalBeato');
                });

                if (beatoPosition) {
                    const updatedSpellbook = processBeatoSpellLearning(team.formation, beatoPosition, currentSpellbooks);
                    
                    if (updatedSpellbook) {
                        currentSpellbooks[beatoPosition] = updatedSpellbook;
                    }
                }
            }

            // MARY CUTEBIRD SUMMONING
            const maryPosition = ['left', 'center', 'right'].find(pos => {
                const hero = team.formation[pos];
                return hero && hero.name === 'Mary';
            });

            if (maryPosition) {
                if (Math.random() < 0.9) {
                    const cuteBirdInfo = getCardInfo('CuteBird');
                    
                    if (cuteBirdInfo) {
                        if (!currentCreatures[maryPosition]) {
                            currentCreatures[maryPosition] = [];
                        }
                        
                        currentCreatures[maryPosition].push({
                            name: 'CuteBird',
                            image: cuteBirdInfo.image,
                            cardType: cuteBirdInfo.cardType,
                            maxHp: 10,
                            currentHp: 10,
                            hp: 10,
                            addedAt: Date.now(),
                            isPermanent: true,
                            sourceHero: 'Mary'
                        });
                    }
                }
            }

            updates[`${teamKey}/graveyard`] = currentGraveyard;
            updates[`${teamKey}/creatures`] = currentCreatures;
            updates[`${teamKey}/spellbooks`] = currentSpellbooks;
        }

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
        }

        return true;

    } catch (error) {
        console.error('Error processing hero effects:', error);
        return false;
    }
}

/**
 * Count targets (heroes + creatures) in a formation
 */
export function countLunaTargets(formation, creatures) {
    let count = 0;
    
    ['left', 'center', 'right'].forEach(pos => {
        if (formation && formation[pos]) {
            count++;
            
            if (creatures && creatures[pos] && Array.isArray(creatures[pos])) {
                count += creatures[pos].length;
            }
        }
    });
    
    return count;
}

/**
 * Count Luna-related items in a team
 */
export function countLunaItems(team) {
    let count = 0;
    
    if (team.spellbooks) {
        ['left', 'center', 'right'].forEach(pos => {
            if (team.spellbooks[pos] && Array.isArray(team.spellbooks[pos])) {
                count += team.spellbooks[pos].filter(spell => {
                    const spellName = spell.name || spell.cardName || spell;
                    return spellName === 'MountainTearRiver';
                }).length;
            }
        });
    }
    
    if (team.creatures) {
        ['left', 'center', 'right'].forEach(pos => {
            if (team.creatures[pos] && Array.isArray(team.creatures[pos])) {
                count += team.creatures[pos].filter(creature => {
                    const creatureName = creature.name || creature.cardName || creature;
                    return creatureName === 'LunaKiai';
                }).length;
            }
        });
    }
    
    if (team.permanentArtifacts && Array.isArray(team.permanentArtifacts)) {
        count += team.permanentArtifacts.filter(artifact => {
            const artifactName = artifact.name || artifact.cardName || artifact;
            return artifactName === 'HeartOfTheMountain';
        }).length;
    }
    
    return count;
}

/**
 * Process Beato spell learning (after turn 1)
 */
function processBeatoSpellLearning(formation, beatoPosition, currentSpellbooks) {
    const hero = formation[beatoPosition];
    if (!hero) return null;
    
    const isEternalBeato = hero.name === 'EternalBeato';
    const eligibleSpells = getBeatoEligibleSpells(isEternalBeato);
    
    if (eligibleSpells.length === 0) return null;
    
    const selectedSpell = eligibleSpells[Math.floor(Math.random() * eligibleSpells.length)];
    const currentSpellbook = currentSpellbooks[beatoPosition] || [];
    const updatedSpellbook = [...currentSpellbook, {
        name: selectedSpell.name,
        image: selectedSpell.info.image,
        cardType: selectedSpell.info.cardType,
        level: selectedSpell.info.level,
        spellSchool: selectedSpell.info.spellSchool,
        addedAt: Date.now(),
        enabled: true
    }];
    
    return updatedSpellbook;
}

/**
 * Get eligible spells following Beato's learning rules
 */
function getBeatoEligibleSpells(isEternalBeato = false) {
    const validSchools = ['DestructionMagic', 'DecayMagic', 'SupportMagic'];
    const excludedSubtypes = ['Creature', 'Permanent', 'Area'];
    const excludedSpells = ['PhoenixTackle', 'VictoryPhoenixCannon'];
    
    const allCardNames = getAllCardNames();
    const eligibleSpells = [];
    
    allCardNames.forEach(cardName => {
        const cardInfo = getCardInfo(cardName);
        
        if (!cardInfo || cardInfo.cardType !== 'Spell') return;
        if (!validSchools.includes(cardInfo.spellSchool)) return;
        if (cardInfo.global === true) return;
        if (cardInfo.subtype && excludedSubtypes.includes(cardInfo.subtype)) return;
        if (excludedSpells.includes(cardName)) return;
        
        if (isEternalBeato) {
            const spellLevel = cardInfo.level !== undefined ? cardInfo.level : 0;
            if (spellLevel < 3) return;
        }
        
        eligibleSpells.push({
            name: cardName,
            info: cardInfo
        });
    });
    
    return eligibleSpells;
}