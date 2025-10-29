// cpuSpellUpdates.js - CPU spell learning and casting logic with priority-based distribution

import { getCardInfo, getAllCardNames, getAllHeroes, getHeroInfo } from './cardDatabase.js';
import { canHeroUseSpell as validateSpell, doesSpellNeedAction } from './spellValidation.js';
import { countAbilityStacks } from './cpuHelpers.js';
import { getHeroCards } from './heroStartingCards.js';

/**
 * Process spell usage for all computer teams after battle
 * Awards actions based on Divinity, then processes spells using priority brackets
 * 
 * LEARNING SYSTEM:
 * - Heroes grouped into priority brackets based on spellbook size (every 5 spells = -1 priority)
 * - Spells sorted by level (highest first) and processed in order
 * - Within each bracket, heroes sorted by spell school ability level
 * - Learning chance: 20% base + 10% per ability level in spell's school
 *   (e.g., Lv 3 DestructionMagic = 50% chance to learn DestructionMagic spells)
 * - Creatures use special priority (Tharx > low HP + high ATK + damage tags)
 * - Creatures also use dynamic learning based on SummoningMagic level
 */
export async function processComputerSpellsAfterBattle(roomRef, currentTurn = 1) {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        // Map SoulShard types to their delayed effect structures
        const soulShardEffectMap = {
            'SoulShardIb': {
                type: 'shield_all_allies',
                shieldPerStack: 30,
                description: 'Grant +30 shield to all allies and their creatures at battle start'
            },
            'SoulShardKa': {
                type: 'attack_boost_all_allies',
                attackPerStack: 20,
                description: 'Grant +20 attack to all allied heroes per unique SoulShard at battle start'
            },
            'SoulShardKhet': {
                type: 'summon_graveyard_soulshards',
                description: 'Summon temporary copies of unique SoulShard creatures from graveyard at battle start'
            },
            'SoulShardBa': {
                type: 'remove_enemy_creatures',
                description: 'Remove random enemy creatures based on unique SoulShard count'
            },
            'SoulShardRen': {
                type: 'discard_redraw_hand',
                description: 'Discard hand and draw cards equal to unique SoulShard creatures at battle start'
            },
            'SoulShardSekhem': {
                type: 'damage_all_enemies',
                damagePerStack: 30,
                description: 'Deal 30 non-lethal damage to all enemies at battle start'
            },
            'SoulShardShut': {
                type: 'add_deck_to_graveyard',
                cardsPerStack: 2,
                description: 'Add 2 random deck cards to graveyard per unique SoulShard creature'
            },
            'SoulShardSah': {
                type: 'multiply_soulshard_effects',
                priority: 0,
                description: 'Multiply all other SoulShard delayed effects'
            }
        };

        // Process each team
        for (const teamKey of ['team1', 'team2', 'team3']) {
            const team = teams[teamKey];
            if (!team || !team.formation) continue;

            // Calculate Actions
            let availableActions = 1;
            
            ['left', 'center', 'right'].forEach(position => {
                if (team.formation[position] && team.abilities && team.abilities[position]) {
                    const divinityLevel = countAbilityStacks(team.abilities, position, 'Divinity');
                    availableActions += divinityLevel;
                }
            });

            // Get all spell cards from deck (INCLUDING Areas and Global spells)
            const deck = team.deck || [];
            const allSpells = deck.filter(cardName => {
                const cardInfo = getCardInfo(cardName);
                if (!cardInfo || cardInfo.cardType !== 'Spell') return false;
                
                if (cardInfo.spellSchool === 'MagicArts' && 
                    cardInfo.subtype !== 'Area' && 
                    cardInfo.global !== true) {
                    return false;
                }
                
                return true;
            });

            // Sort spells by level (descending) - higher level spells get priority
            const sortedSpells = allSpells
                .map(spellName => {
                    const spellInfo = getCardInfo(spellName);
                    return {
                        name: spellName,
                        info: spellInfo,
                        level: spellInfo ? (spellInfo.level || 0) : 0
                    };
                })
                .sort((a, b) => b.level - a.level) // Highest level first
                .map(spell => spell.name);

            let currentAbilities = JSON.parse(JSON.stringify(team.abilities || { left: null, center: null, right: null }));
            let currentSpellbooks = JSON.parse(JSON.stringify(team.spellbooks || { left: [], center: [], right: [] }));
            let currentCreatures = JSON.parse(JSON.stringify(team.creatures || { left: [], center: [], right: [] }));
            let currentAreaCard = team.areaCard || null;
            let currentDelayedEffects = [...(team.delayedEffects || [])];
            let currentGraveyard = [...(team.graveyard || [])];
            let currentFormation = JSON.parse(JSON.stringify(team.formation || { left: null, center: null, right: null }));
            let currentHand = [...(team.hand || [])]; 
            let currentDeck = [...(team.deck || [])];
            let currentGold = team.gold || 0;

            // Calculate hero priorities based on spellbook size
            const heroPriorities = {};
            const heroPositions = ['left', 'center', 'right'];
            
            heroPositions.forEach(position => {
                if (!team.formation[position]) {
                    heroPriorities[position] = null;
                    return;
                }
                
                const spellbookSize = currentSpellbooks[position] ? currentSpellbooks[position].length : 0;
                const priority = 0 - Math.floor(spellbookSize / 5); // -1 per 5 spells
                heroPriorities[position] = priority;
            });

            // Group heroes by priority brackets
            const priorityBrackets = {};
            heroPositions.forEach(position => {
                if (heroPriorities[position] !== null) {
                    const priority = heroPriorities[position];
                    if (!priorityBrackets[priority]) {
                        priorityBrackets[priority] = [];
                    }
                    priorityBrackets[priority].push(position);
                }
            });

            // Sort bracket keys (highest priority first: 0, -1, -2, etc.)
            const sortedBrackets = Object.keys(priorityBrackets)
                .map(k => parseInt(k))
                .sort((a, b) => b - a);

            // Track which creatures have been processed
            const processedCreatures = new Set();

            // Process each priority bracket
            for (const bracketPriority of sortedBrackets) {
                const heroesInBracket = priorityBrackets[bracketPriority];
                const isFirstBracket = bracketPriority === sortedBrackets[0];

                // Process each spell in sorted order
                for (const spellName of sortedSpells) {
                    const spellInfo = getCardInfo(spellName);
                    if (!spellInfo) continue;

                    // Check if this is a creature
                    const isCreature = spellInfo.subtype === 'Creature';

                    // CREATURE HANDLING: Process with all heroes in first bracket only
                    if (isCreature) {
                        if (isFirstBracket && !processedCreatures.has(spellName)) {
                            processedCreatures.add(spellName);
                            
                            // Use creature priority system on ALL heroes
                            const creatureResult = await processCreatureSpell(
                                spellName, spellInfo, team, currentFormation, currentAbilities,
                                currentCreatures, currentSpellbooks, availableActions
                            );
                            
                            if (creatureResult.success) {
                                currentCreatures = creatureResult.creatures;
                                if (creatureResult.consumedAction) {
                                    availableActions--;
                                }
                            }
                        }
                        // Skip creatures in non-first brackets
                        continue;
                    }

                    // NON-CREATURE SPELL HANDLING: Use bracket system

                    // ===== PRIORITY: TELEPORT SPECIAL HANDLING =====
                    if (spellName === 'Teleport') {
                        const teleportResult = await processTeleportSpell(
                            teamKey, team, teams, currentFormation, currentAbilities,
                            currentDeck, updates
                        );
                        
                        if (teleportResult.applied) {
                            currentFormation = teleportResult.formation;
                            currentAbilities = teleportResult.abilities;
                            currentDeck = teleportResult.deck;
                        }
                        continue;
                    }

                    // EXPEDITION SPECIAL HANDLING
                    if (spellName === 'Expedition') {
                        const expeditionResult = processExpeditionSpell(
                            currentFormation, currentAbilities, currentCreatures,
                            currentDeck, currentHand, currentDelayedEffects, team.graveyard || [],
                            availableActions
                        );
                        
                        if (expeditionResult.success) {
                            currentHand = expeditionResult.hand;
                            currentDelayedEffects = expeditionResult.delayedEffects;
                            if (expeditionResult.consumedAction) availableActions--;
                        }
                        continue;
                    }

                    // SHIPWRECKED SPECIAL HANDLING
                    if (spellName === 'Shipwrecked') {
                        if (currentHand.length > 5) continue;
                        
                        const shipwreckedResult = processShipwreckedSpell(
                            currentFormation, currentAbilities, currentCreatures,
                            currentDeck, currentHand, currentDelayedEffects, team.graveyard || [],
                            availableActions
                        );
                        
                        if (shipwreckedResult.success) {
                            currentHand = shipwreckedResult.hand;
                            currentDelayedEffects = shipwreckedResult.delayedEffects;
                            if (shipwreckedResult.consumedAction) availableActions--;
                        }
                        continue;
                    }

                    // BUTTERFLY CLOUD SPECIAL HANDLING
                    if (spellName === 'ButterflyCloud') {
                        const butterflyResult = processButterflyCloudSpell(
                            team, currentSpellbooks, currentFormation, currentAbilities,
                            currentCreatures, team.graveyard || [], availableActions
                        );
                        
                        if (butterflyResult.success) {
                            currentSpellbooks = butterflyResult.spellbooks;
                            if (butterflyResult.consumedAction) availableActions--;
                        }
                        continue;
                    }

                    // CREATE ILLUSION SPECIAL HANDLING
                    if (spellName === 'CreateIllusion') {
                        const illusionResult = processCreateIllusionSpell(
                            team, currentFormation, currentCreatures, currentAbilities,
                            team.graveyard || [], availableActions
                        );
                        
                        if (illusionResult.success) {
                            currentCreatures = illusionResult.creatures;
                            if (illusionResult.consumedAction) availableActions--;
                        }
                        continue;
                    }

                    // ANTI-MAGIC SHIELD SPECIAL HANDLING
                    if (spellName === 'AntiMagicShield') {
                        const shieldResult = processAntiMagicShieldSpell(
                            currentFormation, currentAbilities, currentCreatures,
                            team.graveyard || [], availableActions
                        );
                        
                        if (shieldResult.success) {
                            currentFormation = shieldResult.formation;
                            if (shieldResult.consumedAction) availableActions--;
                        }
                        continue;
                    }

                    // DIVINE GIFT OF MAGIC SPECIAL HANDLING
                    if (spellName === 'DivineGiftOfMagic') {
                        const divineGiftResult = processDivineGiftOfMagicSpell(
                            currentFormation, currentSpellbooks, currentAbilities,
                            currentCreatures, team.graveyard || [], availableActions
                        );
                        
                        if (divineGiftResult.success) {
                            currentSpellbooks = divineGiftResult.spellbooks;
                            if (divineGiftResult.consumedAction) availableActions--;
                        }
                        continue;
                    }

                    // GUARD CHANGE SPECIAL HANDLING
                    if (spellName === 'GuardChange') {
                        const guardChangeResult = processGuardChangeSpell(
                            currentFormation, currentCreatures, currentAbilities,
                            team.graveyard || [], availableActions
                        );
                        
                        if (guardChangeResult.success) {
                            currentCreatures = guardChangeResult.creatures;
                            if (guardChangeResult.consumedAction) availableActions--;
                        }
                        continue;
                    }

                    // THARXIAN HORSE SPECIAL HANDLING
                    if (spellName === 'TharxianHorse') {
                        const tharxianHorseResult = processTharxianHorseSpell(
                            currentFormation, currentCreatures, currentAbilities,
                            currentDeck, team.graveyard || [], availableActions
                        );
                        
                        if (tharxianHorseResult.success) {
                            currentCreatures = tharxianHorseResult.creatures;
                            currentDeck = tharxianHorseResult.deck;
                            if (tharxianHorseResult.consumedAction) availableActions--;
                        }
                        continue;
                    }

                    // FILTER OUT GLOBAL SPELLS WITHOUT DEDICATED HANDLERS
                    if (spellInfo.global === true) continue;

                    // AREA SPELL FILTERING
                    if (spellInfo.subtype === 'Area') {
                        if (currentAreaCard && currentAreaCard.name === spellName) continue;
                        if (currentAreaCard && currentAreaCard.name !== spellName) {
                            if (Math.random() < 0.5) continue;
                        }
                    }

                    // Find eligible heroes IN CURRENT BRACKET ONLY
                    const eligibleHeroesInBracket = findEligibleHeroesForSpell(
                        spellName, spellInfo, heroesInBracket, team, currentAbilities,
                        currentCreatures, currentGold
                    );

                    if (eligibleHeroesInBracket.length === 0) continue;

                    // Sort heroes by spell school ability level
                    const sortedHeroes = sortHeroesBySpellSchool(
                        eligibleHeroesInBracket, spellInfo.spellSchool, currentAbilities
                    );

                    // GHUANJUN SPECIAL RULE: 80% priority for martial arts spells
                    const ghuanjunSpells = ['StrongOxHeadbutt', 'BlowOfTheVenomSnake', 'FerociousTigerKick'];
                    let selectedHero = null;
                    let fixedLearningChance = null; // For special cases like Ghuanjun
                    
                    if (ghuanjunSpells.includes(spellName)) {
                        const ghuanjunPosition = sortedHeroes.find(pos => {
                            const hero = team.formation[pos];
                            return hero && hero.name === 'Ghuanjun';
                        });
                        
                        if (ghuanjunPosition) {
                            selectedHero = ghuanjunPosition;
                            fixedLearningChance = 0.80; // 80% for Ghuanjun's spells
                        }
                    }

                    // Try each hero in order until one learns it or all fail
                    let spellLearned = false;
                    const heroesToTry = selectedHero ? [selectedHero] : sortedHeroes;
                    
                    for (const heroPosition of heroesToTry) {
                        if (spellLearned) break;
                        
                        // Calculate learning chance based on spell school ability level
                        let learningChance;
                        if (fixedLearningChance !== null) {
                            // Use fixed chance for special cases
                            learningChance = fixedLearningChance;
                        } else if (spellInfo.spellSchool) {
                            // Dynamic chance: 20% base + 5% per ability level
                            const abilityLevel = countAbilityStacks(currentAbilities, heroPosition, spellInfo.spellSchool);
                            learningChance = 0.20 + (abilityLevel * 0.05);
                        } else {
                            // No spell school - use base 20%
                            learningChance = 0.20;
                        }
                        
                        // Roll for learning
                        if (Math.random() >= learningChance) continue;

                        // Check if spell requires an action
                        const actionContext = {
                            formation: team.formation,
                            abilities: currentAbilities,
                            creatures: currentCreatures,
                            graveyard: team.graveyard || []
                        };
                        
                        const needsAction = doesSpellNeedAction(spellName, heroPosition, actionContext);
                        if (needsAction && availableActions <= 0) continue;

                        // APPLY SPELL EFFECT
                        const applyResult = applySpellEffect(
                            spellName, spellInfo, heroPosition, currentAreaCard,
                            currentSpellbooks, currentCreatures, team
                        );

                        if (applyResult.success) {
                            if (applyResult.areaCard) currentAreaCard = applyResult.areaCard;
                            if (applyResult.spellbooks) currentSpellbooks = applyResult.spellbooks;
                            if (applyResult.creatures) currentCreatures = applyResult.creatures;
                            
                            // Deduct gold if Semi used gold learning
                            const hero = team.formation[heroPosition];
                            if (hero && hero.name === 'Semi' && spellInfo.spellSchool) {
                                const spellLevel = spellInfo.level || 0;
                                const currentAbilityLevel = countAbilityStacks(currentAbilities, heroPosition, spellInfo.spellSchool);
                                const levelGap = spellLevel - currentAbilityLevel;
                                
                                if (levelGap > 0) {
                                    const goldCost = levelGap * 0;
                                    currentGold -= goldCost;
                                }
                            }

                            // Consume action if needed
                            if (needsAction) availableActions--;
                            
                            spellLearned = true;
                        }
                    }

                    // Break if out of actions
                    if (availableActions <= 0) break;
                }

                // Break outer bracket loop if out of actions
                if (availableActions <= 0) break;
            }

            // SOULSHARDS DELAYED SUMMONING SYSTEM
            const hasSoulShard = ['left', 'center', 'right'].some(pos => {
                const creatures = currentCreatures[pos] || [];
                return creatures.some(creature => {
                    const creatureName = creature.name || creature.cardName || creature;
                    return creatureName.includes('SoulShard');
                });
            });

            if (hasSoulShard) {
                const soulShardCreatures = deck.filter(cardName => {
                    if (!cardName.includes('SoulShard')) return false;
                    const cardInfo = getCardInfo(cardName);
                    return cardInfo && cardInfo.cardType === 'Spell' && cardInfo.subtype === 'Creature';
                });
                
                if (soulShardCreatures.length > 0) {
                    const soulShardPool = [];
                    soulShardCreatures.forEach(shardName => {
                        for (let i = 0; i < 5; i++) {
                            soulShardPool.push(shardName);
                        }
                    });
                    
                    for (let i = soulShardPool.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [soulShardPool[i], soulShardPool[j]] = [soulShardPool[j], soulShardPool[i]];
                    }
                    
                    const baseChance = 0.05;
                    const turnBonus = Math.floor(currentTurn / 2) * 0.05;
                    const successChance = baseChance + turnBonus;
                    
                    let soulshardsAddedThisTurn = 0;
                    const maxAdditions = currentTurn + 1;
                    let nonSahAddedThisTurn = false;
                    
                    for (const shardName of soulShardPool) {
                        if (soulshardsAddedThisTurn >= maxAdditions) break;
                        
                        if (shardName === 'SoulShardSah' && !nonSahAddedThisTurn) continue;
                        
                        const roll = Math.random();
                        if (roll < successChance) {
                            const eligibleHeroes = ['left', 'center', 'right'].filter(pos => {
                                if (!team.formation[pos]) return false;
                                const creatures = currentCreatures[pos] || [];
                                return creatures.some(creature => {
                                    const creatureName = creature.name || creature.cardName || creature;
                                    return creatureName.includes('SoulShard');
                                });
                            });
                            
                            if (eligibleHeroes.length > 0) {
                                const effectTemplate = soulShardEffectMap[shardName];
                                if (effectTemplate) {
                                    currentDelayedEffects.push({
                                        ...effectTemplate,
                                        stacks: 1,
                                        source: shardName,
                                        addedAt: Date.now()
                                    });
                                    
                                    currentGraveyard.push(shardName);
                                    soulshardsAddedThisTurn++;
                                    if (shardName !== 'SoulShardSah') {
                                        nonSahAddedThisTurn = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ADVENTUROUSNESS GOLD BONUS
            if (availableActions > 0) {
                let highestAdventurousness = 0;
                
                ['left', 'center', 'right'].forEach(position => {
                    if (team.formation[position]) {
                        const adventurousnessLevel = countAbilityStacks(currentAbilities, position, 'Adventurousness');
                        if (adventurousnessLevel > highestAdventurousness) {
                            highestAdventurousness = adventurousnessLevel;
                        }
                    }
                });
                
                if (highestAdventurousness > 0) {
                    const actionsToConsume = availableActions;
                    const goldBonus = 10 * actionsToConsume * highestAdventurousness;
                    
                    currentGold += goldBonus;
                    availableActions = 0;
                }
            }

            // Update Firebase with modified data
            updates[`${teamKey}/abilities`] = currentAbilities;
            updates[`${teamKey}/spellbooks`] = currentSpellbooks;
            updates[`${teamKey}/creatures`] = currentCreatures;
            updates[`${teamKey}/areaCard`] = currentAreaCard;
            updates[`${teamKey}/delayedEffects`] = currentDelayedEffects;
            updates[`${teamKey}/graveyard`] = currentGraveyard;
            updates[`${teamKey}/formation`] = currentFormation;
            updates[`${teamKey}/gold`] = currentGold;
            updates[`${teamKey}/hand`] = currentHand;
            updates[`${teamKey}/deck`] = currentDeck;
            updates[`${teamKey}/counters`] = team.counters;
        }

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
        }

        return true;

    } catch (error) {
        console.error('Error processing computer spells:', error);
        return false;
    }
}

// ============================================
// PRIORITY SYSTEM HELPER FUNCTIONS
// ============================================

/**
 * Find eligible heroes for a spell in given positions
 */
function findEligibleHeroesForSpell(spellName, spellInfo, heroPositions, team, currentAbilities, currentCreatures, currentGold) {
    const eligible = [];
    
    for (const position of heroPositions) {
        if (!team.formation[position]) continue;
        
        const hero = team.formation[position];
        const context = {
            formation: team.formation,
            abilities: currentAbilities,
            creatures: currentCreatures,
            graveyard: team.graveyard || []
        };
        
        const validationResult = validateSpell(position, spellName, context);
        
        if (validationResult.canUse) {
            eligible.push(position);
        }
        // CPU Semi gold learning check
        else if (hero.name === 'Semi' && spellInfo.spellSchool) {
            const spellLevel = spellInfo.level || 0;
            const currentAbilityLevel = countAbilityStacks(currentAbilities, position, spellInfo.spellSchool);
            const levelGap = spellLevel - currentAbilityLevel;
            
            if (levelGap > 0) {
                const goldCost = levelGap * 0;
                if (currentGold >= goldCost) {
                    eligible.push(position);
                }
            }
        }
    }
    
    return eligible;
}

/**
 * Sort heroes by their ability level in a specific spell school
 */
function sortHeroesBySpellSchool(heroPositions, spellSchool, currentAbilities) {
    if (!spellSchool) {
        // No spell school - shuffle randomly
        return [...heroPositions].sort(() => Math.random() - 0.5);
    }
    
    return [...heroPositions].sort((a, b) => {
        const aLevel = countAbilityStacks(currentAbilities, a, spellSchool);
        const bLevel = countAbilityStacks(currentAbilities, b, spellSchool);
        
        if (bLevel !== aLevel) {
            return bLevel - aLevel; // Higher level first
        }
        
        // Tie - random
        return Math.random() - 0.5;
    });
}

/**
 * Process creature spell with special priority system
 * Uses dynamic learning chance: 20% base + 10% per SummoningMagic level
 */
async function processCreatureSpell(spellName, spellInfo, team, currentFormation, currentAbilities, currentCreatures, currentSpellbooks, availableActions) {
    // Get all hero positions with heroes
    const allHeroPositions = ['left', 'center', 'right'].filter(pos => team.formation[pos]);
    
    if (allHeroPositions.length === 0) {
        return { success: false, creatures: currentCreatures };
    }
    
    // Find eligible heroes who can summon this creature
    const eligibleHeroes = [];
    for (const position of allHeroPositions) {
        const context = {
            formation: team.formation,
            abilities: currentAbilities,
            creatures: currentCreatures,
            graveyard: team.graveyard || []
        };
        
        const validationResult = validateSpell(position, spellName, context);
        if (validationResult.canUse) {
            eligibleHeroes.push(position);
        }
    }
    
    if (eligibleHeroes.length === 0) {
        return { success: false, creatures: currentCreatures };
    }
    
    // Sort by creature priority
    const sortedHeroes = sortHeroesByCreaturePriority(eligibleHeroes, team.formation, currentAbilities);
    
    // Try each hero with dynamic learning chance based on SummoningMagic level
    for (const heroPosition of sortedHeroes) {
        // Calculate learning chance: 20% base + 10% per SummoningMagic level
        const summoningLevel = countAbilityStacks(currentAbilities, heroPosition, 'SummoningMagic');
        const learningChance = 0.20 + (summoningLevel * 0.10);
        
        if (Math.random() >= learningChance) continue;
        
        // Check if needs action
        const actionContext = {
            formation: team.formation,
            abilities: currentAbilities,
            creatures: currentCreatures,
            graveyard: team.graveyard || []
        };
        
        const needsAction = doesSpellNeedAction(spellName, heroPosition, actionContext);
        if (needsAction && availableActions <= 0) continue;
        
        // CUTEBIRD SPECIAL TARGETING
        let targetHero = heroPosition;
        if (spellName === 'CuteBird') {
            const maryPosition = eligibleHeroes.find(pos => {
                const hero = team.formation[pos];
                return hero && hero.name === 'Mary';
            });
            
            if (maryPosition) {
                targetHero = maryPosition;
            }
        }
        
        // Add creature
        if (!currentCreatures[targetHero]) {
            currentCreatures[targetHero] = [];
        }
        
        const creatureData = {
            name: spellName,
            image: spellInfo.image,
            cardType: spellInfo.cardType,
            addedAt: Date.now()
        };
        
        if (spellName === 'CuteBird') {
            creatureData.maxHp = 10;
            creatureData.currentHp = 10;
            creatureData.hp = 10;
        }
        
        currentCreatures[targetHero].push(creatureData);
        
        return {
            success: true,
            creatures: currentCreatures,
            consumedAction: needsAction
        };
    }
    
    return { success: false, creatures: currentCreatures };
}

/**
 * Sort heroes by creature priority (Tharx > low HP + high ATK + damage tags)
 */
function sortHeroesByCreaturePriority(heroPositions, formation, currentAbilities) {
    const damageTags = ['Damage Dealer', 'Area Damage', 'Sniper', 'Attacker'];
    
    return [...heroPositions].sort((a, b) => {
        const heroA = formation[a];
        const heroB = formation[b];
        
        // Tharx always highest priority
        if (heroA.name === 'Tharx') return -1;
        if (heroB.name === 'Tharx') return 1;
        
        const heroAInfo = getCardInfo(heroA.name);
        const heroBInfo = getCardInfo(heroB.name);
        
        if (!heroAInfo || !heroBInfo) return 0;
        
        // Calculate priority scores
        let scoreA = 0;
        let scoreB = 0;
        
        // Low HP = higher priority (invert)
        const hpA = heroAInfo.hp || 400;
        const hpB = heroBInfo.hp || 400;
        scoreA += (500 - hpA) / 10; // Normalize
        scoreB += (500 - hpB) / 10;
        
        // High ATK = higher priority
        const atkA = heroAInfo.atk || 0;
        const atkB = heroBInfo.atk || 0;
        scoreA += atkA / 10; // Normalize
        scoreB += atkB / 10;
        
        // Damage tags = higher priority
        const tagsA = heroAInfo.tags || [];
        const tagsB = heroBInfo.tags || [];
        const damageTagCountA = tagsA.filter(tag => damageTags.includes(tag)).length;
        const damageTagCountB = tagsB.filter(tag => damageTags.includes(tag)).length;
        scoreA += damageTagCountA * 20;
        scoreB += damageTagCountB * 20;
        
        return scoreB - scoreA; // Higher score first
    });
}

/**
 * Apply spell effect (non-creature spells)
 */
function applySpellEffect(spellName, spellInfo, heroPosition, currentAreaCard, currentSpellbooks, currentCreatures, team) {
    if (spellInfo.subtype === 'Area') {
        const newAreaCard = {
            name: spellName,
            image: spellInfo.image || `./Cards/Areas/${spellName}.png`,
            cost: spellInfo.cost || 0,
            effects: spellInfo.effects || []
        };
        
        if (spellName === 'GatheringStorm') {
            newAreaCard.stormCounters = 1;
        } else if (spellName === 'DoomClock') {
            newAreaCard.doomCounters = 0;
        }
        
        return { success: true, areaCard: newAreaCard };
    } else {
        // Add to spellbook
        if (!currentSpellbooks[heroPosition]) {
            currentSpellbooks[heroPosition] = [];
        }
        
        currentSpellbooks[heroPosition].push({
            name: spellName,
            image: spellInfo.image,
            cardType: spellInfo.cardType,
            level: spellInfo.level,
            spellSchool: spellInfo.spellSchool,
            addedAt: Date.now(),
            enabled: true
        });
        
        return { success: true, spellbooks: currentSpellbooks };
    }
}

/**
 * Process Teleport spell
 */
async function processTeleportSpell(teamKey, team, teams, currentFormation, currentAbilities, currentDeck, updates) {
    // Check if team has Nomu
    const nomuPosition = ['left', 'center', 'right'].find(pos => {
        const hero = currentFormation[pos];
        return hero && hero.name === 'Nomu';
    });
    
    // Check if team has at least 2 heroes (Nomu + 1 other)
    const heroCount = ['left', 'center', 'right'].filter(pos => currentFormation[pos]).length;
    
    if (!nomuPosition || heroCount < 2) {
        return { applied: false, formation: currentFormation, abilities: currentAbilities, deck: currentDeck };
    }
    
    // 85% chance to trigger when Nomu is present
    if (Math.random() >= 0.85) {
        return { applied: false, formation: currentFormation, abilities: currentAbilities, deck: currentDeck };
    }
    
    // Get eligible target positions (non-Nomu heroes)
    const eligibleTargets = ['left', 'center', 'right'].filter(pos => {
        const hero = currentFormation[pos];
        return hero && hero.name !== 'Nomu';
    });
    
    if (eligibleTargets.length === 0) {
        return { applied: false, formation: currentFormation, abilities: currentAbilities, deck: currentDeck };
    }
    
    // Select random target position
    const targetPosition = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
    const oldHero = currentFormation[targetPosition];
    const oldHeroName = oldHero.name;
    
    // Get all heroes currently in use across ALL teams
    const usedHeroes = new Set();
    ['team1', 'team2', 'team3'].forEach(tk => {
        const t = teams[tk];
        if (t && t.formation) {
            ['left', 'center', 'right'].forEach(pos => {
                if (t.formation[pos]) {
                    usedHeroes.add(t.formation[pos].name);
                }
            });
        }
    });
    
    // Get all obtainable, non-Ascended heroes from database
    const allHeroObjects = getAllHeroes();
    const allHeroes = allHeroObjects
        .filter(hero => {
            if (hero.subtype === 'Ascended') return false;
            if (hero.unobtainable === true) return false;
            return true;
        })
        .map(hero => hero.name);
    
    const availableHeroes = allHeroes.filter(heroName => {
        if (usedHeroes.has(heroName)) return false;
        if (heroName === 'Carris') return false;
        return true;
    });
    
    if (availableHeroes.length === 0) {
        return { applied: false, formation: currentFormation, abilities: currentAbilities, deck: currentDeck };
    }
    
    // Select random new hero
    const newHeroName = availableHeroes[Math.floor(Math.random() * availableHeroes.length)];
    const newHeroInfo = getHeroInfo(newHeroName);
    
    if (!newHeroInfo) {
        return { applied: false, formation: currentFormation, abilities: currentAbilities, deck: currentDeck };
    }
    
    console.log(`🌀 ${teamKey} TELEPORT TRIGGERED! (85% chance with Nomu)`);
    
    // Remove old hero's cards from deck
    const oldHeroCards = getHeroCards(oldHeroName);
    if (oldHeroCards && Array.isArray(oldHeroCards)) {
        oldHeroCards.forEach(cardName => {
            const cardIndex = currentDeck.indexOf(cardName);
            if (cardIndex !== -1) {
                currentDeck.splice(cardIndex, 1);
            }
        });
    }
    
    // Add new hero's cards to deck
    const newHeroCards = getHeroCards(newHeroName);
    if (newHeroCards && Array.isArray(newHeroCards)) {
        currentDeck.push(...newHeroCards);
    }
    
    // Count total abilities from old hero
    let totalAbilityCount = 0;
    const oldAbilities = currentAbilities[targetPosition];
    if (oldAbilities) {
        ['zone1', 'zone2', 'zone3'].forEach(zone => {
            if (oldAbilities[zone] && Array.isArray(oldAbilities[zone])) {
                totalAbilityCount += oldAbilities[zone].length;
            }
        });
    }
    
    // Create new hero data
    const newHeroData = {
        id: Math.floor(Math.random() * 10000),
        name: newHeroName,
        image: `./Cards/All/${newHeroName}.png`,
        filename: `${newHeroName}.png`,
        permanentAttackBonusses: oldHero.permanentAttackBonusses || 0,
        permanentHpBonusses: oldHero.permanentHpBonusses || 0,
        attackBonusses: oldHero.attackBonusses || 0,
        hpBonusses: oldHero.hpBonusses || 0,
        burningFingerStack: oldHero.burningFingerStack || 0,
        deathCounters: oldHero.deathCounters || 0
    };
    
    // Replace hero in formation
    currentFormation[targetPosition] = newHeroData;
    
    // Rebuild abilities
    const newAbilities = { zone1: [], zone2: [], zone3: [] };
    
    const ability1Info = getCardInfo(newHeroInfo.ability1);
    const ability2Info = getCardInfo(newHeroInfo.ability2);
    
    if (ability1Info) {
        newAbilities.zone1.push({
            name: newHeroInfo.ability1,
            image: ability1Info.image,
            cardType: ability1Info.cardType
        });
    }
    
    if (ability2Info) {
        if (newHeroInfo.ability1 === newHeroInfo.ability2) {
            newAbilities.zone1.push({
                name: newHeroInfo.ability2,
                image: ability2Info.image,
                cardType: ability2Info.cardType
            });
        } else {
            newAbilities.zone2.push({
                name: newHeroInfo.ability2,
                image: ability2Info.image,
                cardType: ability2Info.cardType
            });
        }
    }
    
    // Distribute remaining abilities
    const startingAbilitiesCount = 2;
    const remainingAbilities = totalAbilityCount - startingAbilitiesCount;
    const startingAbilityNames = [newHeroInfo.ability1, newHeroInfo.ability2];
    
    for (let i = 0; i < remainingAbilities; i++) {
        const randomAbilityName = startingAbilityNames[Math.floor(Math.random() * startingAbilityNames.length)];
        const abilityInfo = getCardInfo(randomAbilityName);
        
        if (abilityInfo) {
            let targetZone = null;
            if (randomAbilityName === newHeroInfo.ability1) {
                targetZone = 'zone1';
            } else if (randomAbilityName === newHeroInfo.ability2) {
                targetZone = newHeroInfo.ability1 === newHeroInfo.ability2 ? 'zone1' : 'zone2';
            }
            
            if (targetZone && newAbilities[targetZone]) {
                newAbilities[targetZone].push({
                    name: randomAbilityName,
                    image: abilityInfo.image,
                    cardType: abilityInfo.cardType
                });
            }
        }
    }
    
    currentAbilities[targetPosition] = newAbilities;
    
    // Transfer equipment
    const oldEquipment = team.equipment && team.equipment[targetPosition] ? 
        [...team.equipment[targetPosition]] : [];
    
    if (!updates[`${teamKey}/equipment`]) {
        updates[`${teamKey}/equipment`] = JSON.parse(JSON.stringify(team.equipment || { left: [], center: [], right: [] }));
    }
    updates[`${teamKey}/equipment`][targetPosition] = oldEquipment;
    
    // Increment teleports counter
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
    team.counters.teleports = (team.counters.teleports || 0) + 1;
    
    console.log(`✨ TELEPORT SUCCESS: ${oldHeroName} → ${newHeroName} at ${targetPosition} for ${teamKey}`);
    console.log(`   📦 Deck: Removed ${oldHeroCards?.length || 0} old cards, added ${newHeroCards?.length || 0} new cards`);
    console.log(`   ⚡ Abilities: ${totalAbilityCount} total (${startingAbilitiesCount} base + ${remainingAbilities} distributed)`);
    console.log(`   🔮 Teleports counter: ${team.counters.teleports}`);
    
    return {
        applied: true,
        formation: currentFormation,
        abilities: currentAbilities,
        deck: currentDeck
    };
}

/**
 * Process Expedition spell
 */
function processExpeditionSpell(currentFormation, currentAbilities, currentCreatures, currentDeck, currentHand, currentDelayedEffects, graveyard, availableActions) {
    const needsAction = doesSpellNeedAction('Expedition', 'left', {
        formation: currentFormation,
        abilities: currentAbilities,
        creatures: currentCreatures,
        graveyard: graveyard
    });
    
    if (needsAction && availableActions <= 0) {
        return { success: false, hand: currentHand, delayedEffects: currentDelayedEffects };
    }
    
    if (currentDeck.length > 0) {
        const cardsDrawnCount = Math.min(3, currentDeck.length);
        for (let i = 0; i < cardsDrawnCount; i++) {
            const randomIndex = Math.floor(Math.random() * currentDeck.length);
            const drawnCard = currentDeck[randomIndex];
            currentHand.push(drawnCard);
        }
        
        currentDelayedEffects.push({
            type: 'expedition_randomize_positions', 
            source: 'Expedition',
            stacks: 1,
            triggerCondition: 'at_battle_start',
            addedAt: Date.now()
        });
    }
    
    return {
        success: true,
        hand: currentHand,
        delayedEffects: currentDelayedEffects,
        consumedAction: needsAction
    };
}

/**
 * Process Shipwrecked spell
 */
function processShipwreckedSpell(currentFormation, currentAbilities, currentCreatures, currentDeck, currentHand, currentDelayedEffects, graveyard, availableActions) {
    const needsAction = doesSpellNeedAction('Shipwrecked', 'left', {
        formation: currentFormation,
        abilities: currentAbilities,
        creatures: currentCreatures,
        graveyard: graveyard
    });
    
    if (needsAction && availableActions <= 0) {
        return { success: false, hand: currentHand, delayedEffects: currentDelayedEffects };
    }
    
    if (currentDeck.length > 0) {
        const targetHandSize = 10;
        
        while (currentHand.length < targetHandSize && currentDeck.length > 0) {
            const randomIndex = Math.floor(Math.random() * currentDeck.length);
            const drawnCard = currentDeck[randomIndex];
            currentHand.push(drawnCard);
        }
        
        currentDelayedEffects.push({
            type: 'shipwrecked_halve_hp',
            source: 'Shipwrecked',
            stacks: 1,
            triggerCondition: 'at_battle_start',
            addedAt: Date.now()
        });
    }
    
    return {
        success: true,
        hand: currentHand,
        delayedEffects: currentDelayedEffects,
        consumedAction: needsAction
    };
}

/**
 * Process ButterflyCloud spell
 */
function processButterflyCloudSpell(team, currentSpellbooks, currentFormation, currentAbilities, currentCreatures, graveyard, availableActions) {
    const needsAction = doesSpellNeedAction('ButterflyCloud', 'left', {
        formation: currentFormation,
        abilities: currentAbilities,
        creatures: currentCreatures,
        graveyard: graveyard
    });
    
    if (needsAction && availableActions <= 0) {
        return { success: false, spellbooks: currentSpellbooks };
    }
    
    const targetHero = selectButterflyCloudTarget(team, currentSpellbooks, currentFormation);
    
    if (targetHero) {
        const targetHeroData = currentFormation[targetHero];
        const isEternalBeato = targetHeroData?.name === 'EternalBeato';
        const eligibleSpells = getBeatoEligibleSpells(isEternalBeato);
        
        if (eligibleSpells.length > 0) {
            for (let i = 0; i < 3; i++) {
                const randomSpell = eligibleSpells[Math.floor(Math.random() * eligibleSpells.length)];
                
                if (!currentSpellbooks[targetHero]) {
                    currentSpellbooks[targetHero] = [];
                }
                
                currentSpellbooks[targetHero].push({
                    name: randomSpell.name,
                    image: randomSpell.info.image,
                    cardType: randomSpell.info.cardType,
                    level: randomSpell.info.level,
                    spellSchool: randomSpell.info.spellSchool,
                    addedAt: Date.now(),
                    enabled: true
                });
            }
        }
    }
    
    return {
        success: true,
        spellbooks: currentSpellbooks,
        consumedAction: needsAction
    };
}

/**
 * Process CreateIllusion spell
 */
function processCreateIllusionSpell(team, currentFormation, currentCreatures, currentAbilities, graveyard, availableActions) {
    const needsAction = doesSpellNeedAction('CreateIllusion', 'left', {
        formation: currentFormation,
        abilities: currentAbilities,
        creatures: currentCreatures,
        graveyard: graveyard
    });
    
    if (needsAction && availableActions <= 0) {
        return { success: false, creatures: currentCreatures };
    }
    
    const heroPositions = ['left', 'center', 'right'].filter(pos => 
        team.formation[pos] !== null && team.formation[pos] !== undefined
    );
    
    if (heroPositions.length > 0) {
        const allCards = getAllCardNames();
        const allCreatures = allCards.filter(cardName => {
            const cardInfo = getCardInfo(cardName);
            return cardInfo && cardInfo.cardType === 'Spell' && cardInfo.subtype === 'Creature';
        });
        
        if (allCreatures.length > 0) {
            const selectedCreatures = [];
            for (let i = 0; i < heroPositions.length; i++) {
                const randomCreature = allCreatures[Math.floor(Math.random() * allCreatures.length)];
                selectedCreatures.push(randomCreature);
            }
            
            heroPositions.forEach((position, index) => {
                const creatureName = selectedCreatures[index];
                const creatureInfo = getCardInfo(creatureName);
                
                if (creatureInfo) {
                    if (!currentCreatures[position]) {
                        currentCreatures[position] = [];
                    }
                    
                    currentCreatures[position].push({
                        name: creatureName,
                        image: creatureInfo.image,
                        cardType: creatureInfo.cardType,
                        maxHp: 1,
                        currentHp: 1,
                        hp: 1,
                        addedAt: Date.now(),
                        isPermanent: true,
                        sourceSpell: 'CreateIllusion'
                    });
                }
            });
        }
    }
    
    return {
        success: true,
        creatures: currentCreatures,
        consumedAction: needsAction
    };
}

/**
 * Process AntiMagicShield spell
 */
function processAntiMagicShieldSpell(currentFormation, currentAbilities, currentCreatures, graveyard, availableActions) {
    const needsAction = doesSpellNeedAction('AntiMagicShield', 'left', {
        formation: currentFormation,
        abilities: currentAbilities,
        creatures: currentCreatures,
        graveyard: graveyard
    });
    
    if (needsAction && availableActions <= 0) {
        return { success: false, formation: currentFormation };
    }
    
    ['left', 'center', 'right'].forEach(position => {
        const hero = currentFormation[position];
        if (hero && hero.name && typeof hero.name === 'string') {
            if (hero.spellShields === undefined) {
                hero.spellShields = 0;
            }
            hero.spellShields += 1;
        }
    });
    
    return {
        success: true,
        formation: currentFormation,
        consumedAction: needsAction
    };
}

/**
 * Process DivineGiftOfMagic spell
 */
function processDivineGiftOfMagicSpell(currentFormation, currentSpellbooks, currentAbilities, currentCreatures, graveyard, availableActions) {
    const needsAction = doesSpellNeedAction('DivineGiftOfMagic', 'left', {
        formation: currentFormation,
        abilities: currentAbilities,
        creatures: currentCreatures,
        graveyard: graveyard
    });
    
    if (needsAction && availableActions <= 0) {
        return { success: false, spellbooks: currentSpellbooks };
    }
    
    const eligibleSpells = getBeatoEligibleSpells(true);
    
    if (eligibleSpells.length > 0) {
        ['left', 'center', 'right'].forEach(position => {
            const hero = currentFormation[position];
            if (hero && hero.name && typeof hero.name === 'string') {
                const randomSpell = eligibleSpells[Math.floor(Math.random() * eligibleSpells.length)];
                
                if (!currentSpellbooks[position]) {
                    currentSpellbooks[position] = [];
                }
                
                currentSpellbooks[position].push({
                    name: randomSpell.name,
                    image: randomSpell.info.image,
                    cardType: randomSpell.info.cardType,
                    level: randomSpell.info.level,
                    spellSchool: randomSpell.info.spellSchool,
                    addedAt: Date.now(),
                    enabled: true
                });
            }
        });
    }
    
    return {
        success: true,
        spellbooks: currentSpellbooks,
        consumedAction: needsAction
    };
}

/**
 * Select target hero for ButterflyCloud effect with weighted priorities
 */
function selectButterflyCloudTarget(team, currentSpellbooks, currentFormation) {
    const positions = ['left', 'center', 'right'];
    const candidates = [];
    
    positions.forEach(position => {
        const hero = currentFormation[position];
        if (!hero) return;
        
        const heroInfo = getCardInfo(hero.name);
        if (!heroInfo) return;
        
        let score = 0;
        const isBeato = hero.name === 'Beato' || hero.name === 'EternalBeato';
        
        if (isBeato) {
            candidates.push({ position, score: 0, isBeato: true });
            return;
        }
        
        if (heroInfo.tags && heroInfo.tags.includes('Support')) {
            score += 100;
        }
        
        const spellbook = currentSpellbooks[position] || [];
        if (spellbook.length === 0) {
            score += 50;
        }
        
        const attack = heroInfo.atk || 0;
        const attackScore = Math.max(0, 50 - Math.floor(attack / 3));
        score += attackScore;
        
        candidates.push({ position, score, isBeato: false });
    });
    
    if (candidates.length === 0) return null;
    
    let selectableCandidates = candidates.filter(c => !c.isBeato);
    if (selectableCandidates.length === 0) {
        selectableCandidates = candidates;
    }
    
    const totalScore = selectableCandidates.reduce((sum, c) => sum + c.score, 0);
    
    if (totalScore === 0) {
        const randomIndex = Math.floor(Math.random() * selectableCandidates.length);
        return selectableCandidates[randomIndex].position;
    }
    
    let random = Math.random() * totalScore;
    for (const candidate of selectableCandidates) {
        random -= candidate.score;
        if (random <= 0) {
            return candidate.position;
        }
    }
    
    return selectableCandidates[0].position;
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
/**
 * Process GuardChange spell - redistribute creatures strategically
 * Requirements: 2+ Heroes AND 1+ Creatures, 75% chance to skip
 */
function processGuardChangeSpell(currentFormation, currentCreatures, currentAbilities, graveyard, availableActions) {
    const needsAction = doesSpellNeedAction('GuardChange', 'left', {
        formation: currentFormation,
        abilities: currentAbilities,
        creatures: currentCreatures,
        graveyard: graveyard
    });
    
    if (needsAction && availableActions <= 0) {
        return { success: false, creatures: currentCreatures };
    }
    
    // Count heroes and total creatures
    const heroPositions = ['left', 'center', 'right'];
    const activeHeroes = heroPositions.filter(pos => currentFormation[pos] && currentFormation[pos].name);
    
    let totalCreatures = 0;
    heroPositions.forEach(pos => {
        const creatures = currentCreatures[pos] || [];
        totalCreatures += creatures.length;
    });
    
    // Check requirements: 2+ Heroes AND 1+ Creatures
    if (activeHeroes.length < 2 || totalCreatures < 1) {
        return { success: false, creatures: currentCreatures };
    }
    
    // 75% chance to skip (only 25% chance to actually use)
    if (Math.random() < 0.75) {
        return { success: false, creatures: currentCreatures };
    }
    
    // Check if player owns Tharx
    const hasTharx = activeHeroes.some(pos => 
        currentFormation[pos].name === 'Tharx'
    );
    
    // Collect all creatures into a pool
    const creaturePool = [];
    heroPositions.forEach(pos => {
        const creatures = currentCreatures[pos] || [];
        creatures.forEach(creature => {
            creaturePool.push({
                creature: creature,
                originalPosition: pos
            });
        });
    });
    
    // If Tharx exists, 70% chance to give all creatures to Tharx
    if (hasTharx && Math.random() < 0.70) {
        const tharxPosition = activeHeroes.find(pos => currentFormation[pos].name === 'Tharx');
        
        // Clear all creature positions
        heroPositions.forEach(pos => {
            currentCreatures[pos] = [];
        });
        
        // Give all creatures to Tharx
        currentCreatures[tharxPosition] = creaturePool.map(item => item.creature);
        
        return {
            success: true,
            creatures: currentCreatures,
            consumedAction: needsAction
        };
    }
    
    // Normal redistribution logic
    // Clear all creature positions first
    heroPositions.forEach(pos => {
        currentCreatures[pos] = [];
    });
    
    // Calculate hero priorities based on maxHP and position
    const heroPriorities = activeHeroes.map(pos => {
        const hero = currentFormation[pos];
        const heroInfo = getHeroInfo(hero.name);
        const maxHp = heroInfo ? heroInfo.hp : 300;
        
        // Lower HP = higher priority (lower number = higher priority)
        let priority = maxHp;
        
        // Left position gets bonus for Cavalry
        if (pos === 'left') {
            priority -= 50; // Boost priority for left position
        }
        
        return {
            position: pos,
            priority: priority,
            maxHp: maxHp
        };
    });
    
    // Sort by priority (lower first)
    heroPriorities.sort((a, b) => a.priority - b.priority);
    
    // Separate Cavalry from other creatures
    const cavalryCreatures = [];
    const normalCreatures = [];
    
    creaturePool.forEach(item => {
        const creatureName = item.creature.name || item.creature.cardName || item.creature;
        if (creatureName === 'Cavalry') {
            cavalryCreatures.push(item);
        } else {
            normalCreatures.push(item);
        }
    });
    
    // Distribute Cavalry to left-most position first
    const leftPosition = heroPositions.includes('left') && currentFormation['left'] ? 'left' : heroPriorities[0].position;
    cavalryCreatures.forEach(item => {
        currentCreatures[leftPosition].push(item.creature);
    });
    
    // Distribute remaining creatures to heroes by priority (low HP heroes first)
    let heroIndex = 0;
    normalCreatures.forEach(item => {
        const targetPosition = heroPriorities[heroIndex].position;
        currentCreatures[targetPosition].push(item.creature);
        
        // Cycle through heroes for distribution
        heroIndex = (heroIndex + 1) % heroPriorities.length;
    });
    
    // Ensure at least 1 creature was moved (check against original positions)
    let creaturesMoved = false;
    for (const item of creaturePool) {
        // Find which position this creature ended up in
        for (const pos of heroPositions) {
            if (currentCreatures[pos].includes(item.creature)) {
                if (pos !== item.originalPosition) {
                    creaturesMoved = true;
                    break;
                }
            }
        }
        if (creaturesMoved) break;
    }
    
    // If no creatures moved, force move at least one
    if (!creaturesMoved && creaturePool.length > 0 && heroPriorities.length > 1) {
        const firstCreature = creaturePool[0];
        // Find an alternative position (not the original)
        const alternativePosition = heroPriorities.find(hp => hp.position !== firstCreature.originalPosition);
        
        if (alternativePosition) {
            // Remove from current position
            heroPositions.forEach(pos => {
                currentCreatures[pos] = currentCreatures[pos].filter(c => c !== firstCreature.creature);
            });
            // Add to alternative position
            currentCreatures[alternativePosition.position].push(firstCreature.creature);
        }
    }
    
    return {
        success: true,
        creatures: currentCreatures,
        consumedAction: needsAction
    };
}

/**
 * Sort all creatures for all computer teams using sortCreatureOrder
 * This should be called at the end of CPU updates each turn
 */
export async function sortAllComputerCreatures(roomRef) {
    if (!roomRef) return false;
    
    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;
        
        const { sortCreatureOrder } = await import('./cpuHelpers.js');
        const updates = {};
        
        for (const teamKey of ['team1', 'team2', 'team3']) {
            const team = teams[teamKey];
            if (!team || !team.formation || !team.creatures) continue;
            
            const sortedCreatures = {
                left: [],
                center: [],
                right: []
            };
            
            for (const position of ['left', 'center', 'right']) {
                const creatures = team.creatures[position] || [];
                if (creatures.length > 0) {
                    sortedCreatures[position] = sortCreatureOrder(creatures, team.formation);
                }
            }
            
            updates[`${teamKey}/creatures`] = sortedCreatures;
        }
        
        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
        }
        
        return true;
        
    } catch (error) {
        console.error('Error sorting computer creatures:', error);
        return false;
    }
}

/**
 * Process TharxianHorse spell - summon creatures based on MagicArts levels
 * Activation: 25% per Hero + 10% per MagicArts level across all heroes
 */
function processTharxianHorseSpell(currentFormation, currentCreatures, currentAbilities, currentDeck, graveyard, availableActions) {
    const needsAction = doesSpellNeedAction('TharxianHorse', 'left', {
        formation: currentFormation,
        abilities: currentAbilities,
        creatures: currentCreatures,
        graveyard: graveyard
    });
    
    if (needsAction && availableActions <= 0) {
        return { success: false, creatures: currentCreatures, deck: currentDeck };
    }
    
    const heroPositions = ['left', 'center', 'right'];
    const activeHeroes = heroPositions.filter(pos => currentFormation[pos] && currentFormation[pos].name);
    
    if (activeHeroes.length === 0) {
        return { success: false, creatures: currentCreatures, deck: currentDeck };
    }
    
    // Calculate activation chance
    // Base: 25% per Hero
    let activationChance = activeHeroes.length * 0.25;
    
    // Bonus: 10% per MagicArts level across all heroes
    let totalMagicArtsLevel = 0;
    heroPositions.forEach(pos => {
        const magicArtsLevel = countAbilityStacks(currentAbilities, pos, 'MagicArts');
        totalMagicArtsLevel += magicArtsLevel;
    });
    
    activationChance += totalMagicArtsLevel * 0.10;
    
    // Check if random chance succeeds
    if (Math.random() > activationChance) {
        return { success: false, creatures: currentCreatures, deck: currentDeck };
    }
    
    // Find highest MagicArts level among all heroes
    let highestMagicArtsLevel = 0;
    heroPositions.forEach(pos => {
        const magicArtsLevel = countAbilityStacks(currentAbilities, pos, 'MagicArts');
        if (magicArtsLevel > highestMagicArtsLevel) {
            highestMagicArtsLevel = magicArtsLevel;
        }
    });
    
    // Check if there are any creatures in deck with level <= highest MagicArts level
    const eligibleCreatures = currentDeck.filter(cardName => {
        const cardInfo = getCardInfo(cardName);
        if (!cardInfo || cardInfo.cardType !== 'Spell' || cardInfo.subtype !== 'Creature') {
            return false;
        }
        const creatureLevel = cardInfo.level || 0;
        return creatureLevel <= highestMagicArtsLevel;
    });
    
    if (eligibleCreatures.length === 0) {
        return { success: false, creatures: currentCreatures, deck: currentDeck };
    }
    
    // Process each hero
    let anyCreatureSummoned = false;
    
    for (const position of activeHeroes) {
        const heroMagicArtsLevel = countAbilityStacks(currentAbilities, position, 'MagicArts');
        
        // Find creatures in deck that this hero can summon
        const heroEligibleCreatures = currentDeck.filter(cardName => {
            const cardInfo = getCardInfo(cardName);
            if (!cardInfo || cardInfo.cardType !== 'Spell' || cardInfo.subtype !== 'Creature') {
                return false;
            }
            const creatureLevel = cardInfo.level || 0;
            return creatureLevel <= heroMagicArtsLevel;
        });
        
        if (heroEligibleCreatures.length === 0) {
            continue; // Skip this hero
        }
        
        // Pick a random creature from eligible creatures
        const randomIndex = Math.floor(Math.random() * heroEligibleCreatures.length);
        const selectedCreature = heroEligibleCreatures[randomIndex];
        const creatureInfo = getCardInfo(selectedCreature);
        
        // Add creature to hero's creatures array
        if (!currentCreatures[position]) {
            currentCreatures[position] = [];
        }
        
        currentCreatures[position].push({
            name: selectedCreature,
            image: creatureInfo.image,
            cardType: creatureInfo.cardType,
            maxHp: creatureInfo.hp || 1,
            currentHp: creatureInfo.hp || 1,
            hp: creatureInfo.hp || 1,
            addedAt: Date.now(),
            isPermanent: true,
            sourceSpell: 'TharxianHorse'
        });
        
        // Remove the creature from deck (only one copy)
        const deckIndex = currentDeck.indexOf(selectedCreature);
        if (deckIndex > -1) {
            currentDeck.splice(deckIndex, 1);
        }
        
        anyCreatureSummoned = true;
    }
    
    return {
        success: anyCreatureSummoned,
        creatures: currentCreatures,
        deck: currentDeck,
        consumedAction: needsAction
    };
}