// cpuArtifactUpdates.js - CPU artifact processing and legendary sword bonuses

import { getCardInfo, getAllCardNames } from './cardDatabase.js';
import { countAbilityStacks } from './cpuHelpers.js';

/**
 * Process artifacts for all computer teams after battle
 * Each Artifact in deck has 20% chance to activate if team can afford it
 */
export async function processComputerArtifactsAfterBattle(roomRef) {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        for (const teamKey of ['team1', 'team2', 'team3']) {
            const team = teams[teamKey];
            if (!team || !team.formation) continue;

            const deck = team.deck || [];
            const allArtifacts = deck.filter(cardName => {
                const cardInfo = getCardInfo(cardName);
                return cardInfo && cardInfo.cardType === 'Artifact';
            });

            if (allArtifacts.length === 0) continue;

            const shuffledArtifacts = [...allArtifacts].sort(() => Math.random() - 0.5);

            let currentGold = team.gold || 0;
            let currentEquipment = JSON.parse(JSON.stringify(team.equipment || { left: [], center: [], right: [] }));
            let currentPermanentArtifacts = [...(team.permanentArtifacts || [])];
            let currentHand = [...(team.hand || [])];
            let currentGraveyard = [...(team.graveyard || [])];
            let currentDeck = [...(team.deck || [])];
            let currentFormation = JSON.parse(JSON.stringify(team.formation));
            let currentDelayedEffects = [];
            let currentMagicSapphiresUsed = team.magicSapphiresUsed || 0;
            let currentSpellbooks = JSON.parse(JSON.stringify(team.spellbooks || { left: [], center: [], right: [] }));
            let currentCreatures = JSON.parse(JSON.stringify(team.creatures || { left: [], center: [], right: [] }));

            for (const artifactName of shuffledArtifacts) {
                const artifactInfo = getCardInfo(artifactName);
                if (!artifactInfo) continue;

                // 20% chance to activate
                if (Math.random() >= 0.2) continue;

                const artifactCost = artifactInfo.cost || 0;
                if (currentGold < artifactCost) continue;

                currentGold -= artifactCost;

                // MAGIC GEM SPECIAL HANDLING
                const magicGems = ['MagicAmethyst', 'MagicCobalt', 'MagicEmerald', 'MagicRuby', 'MagicSapphire', 'MagicTopaz'];
                if (magicGems.includes(artifactName)) {
                    if (currentHand.length > 0) {
                        const randomIndex = Math.floor(Math.random() * currentHand.length);
                        const discardedCard = currentHand.splice(randomIndex, 1)[0];
                        currentGraveyard.push(discardedCard);
                    }
                    
                    switch (artifactName) {
                        case 'MagicAmethyst':
                            ['left', 'center', 'right'].forEach(position => {
                                if (currentFormation[position]) {
                                    const hero = currentFormation[position];
                                    if (hero.attackBonusses === undefined) {
                                        hero.attackBonusses = 0;
                                    }
                                    hero.attackBonusses += 10;
                                }
                            });
                            break;

                        case 'MagicCobalt':
                            ['left', 'center', 'right'].forEach(position => {
                                if (currentFormation[position]) {
                                    const hero = currentFormation[position];
                                    if (hero.hpBonusses === undefined) {
                                        hero.hpBonusses = 0;
                                    }
                                    hero.hpBonusses += 40;
                                }
                            });
                            break;
                            
                        case 'MagicSapphire':
                            currentMagicSapphiresUsed += 1;
                            break;
                            
                        case 'MagicEmerald':
                            if (currentDeck.length > 0) {
                                const randomIndex = Math.floor(Math.random() * currentDeck.length);
                                const duplicatedCard = currentDeck[randomIndex];
                                currentDeck.push(duplicatedCard);
                            }
                            break;
                            
                        case 'MagicRuby':
                        case 'MagicTopaz':
                            break;
                    }
                    
                    continue;
                }

                // TREASURE CHEST SPECIAL HANDLING
                if (artifactName === 'TreasureChest') {
                    currentGold += 10;
                    continue;
                }

                // BLOOD SOAKED COIN
                if (artifactName === 'BloodSoakedCoin') {
                    currentDelayedEffects.push({
                        type: 'damage_all_player_heroes',
                        source: 'BloodSoakedCoin',
                        damageAmount: 100,
                        stacks: 1,
                        triggerCondition: 'at_battle_start',
                        addedAt: Date.now()
                    });
                    currentGold += 20;
                    continue;
                }

                // POISONED MEAT
                if (artifactName === 'PoisonedMeat') {
                    currentDelayedEffects.push({
                        type: 'poison_all_player_targets',
                        source: 'PoisonedMeat',
                        poisonStacks: 2,
                        stacks: 1,
                        triggerCondition: 'at_battle_start',
                        addedAt: Date.now()
                    });
                    continue;
                }

                // SUMMONING CIRCLE SPECIAL HANDLING
                if (artifactName === 'SummoningCircle') {
                    // Get all creatures from the deck
                    const creaturesInDeck = currentDeck.filter(cardName => {
                        const cardInfo = getCardInfo(cardName);
                        return cardInfo && cardInfo.cardType === 'Spell' && cardInfo.subtype === 'Creature';
                    });
                    
                    if (creaturesInDeck.length > 0) {
                        // Select a random creature
                        const randomCreature = creaturesInDeck[Math.floor(Math.random() * creaturesInDeck.length)];
                        const creatureInfo = getCardInfo(randomCreature);
                        
                        if (creatureInfo) {
                            // Find target hero position
                            let targetPosition = null;
                            
                            // Check if Tharx is present - prioritize Tharx
                            for (const position of ['left', 'center', 'right']) {
                                const hero = currentFormation[position];
                                if (hero && hero.name === 'Tharx') {
                                    targetPosition = position;
                                    break;
                                }
                            }
                            
                            // If no Tharx, find hero with fewest creatures
                            if (!targetPosition) {
                                let minCreatures = Infinity;
                                for (const position of ['left', 'center', 'right']) {
                                    if (currentFormation[position]) {
                                        const creatureCount = (currentCreatures[position] || []).length;
                                        if (creatureCount < minCreatures) {
                                            minCreatures = creatureCount;
                                            targetPosition = position;
                                        }
                                    }
                                }
                            }
                            
                            // Add creature to target hero if found
                            if (targetPosition) {
                                if (!currentCreatures[targetPosition]) {
                                    currentCreatures[targetPosition] = [];
                                }
                                
                                currentCreatures[targetPosition].push({
                                    name: randomCreature,
                                    image: creatureInfo.image,
                                    cardType: creatureInfo.cardType,
                                    maxHp: creatureInfo.hp || 100,
                                    currentHp: creatureInfo.hp || 100,
                                    hp: creatureInfo.hp || 100,
                                    addedAt: Date.now(),
                                    statusEffects: [],
                                    type: 'creature',
                                    counters: 0,
                                    fromSummoningCircle: true
                                });
                            }
                        }
                    }
                    continue;
                }


                // BURNED CONTRACT SPECIAL HANDLING
                if (artifactName === 'BurnedContract') {
                    let lowestCreature = null;
                    let lowestPosition = null;
                    let lowestIndex = -1;
                    let lowestLevel = Infinity;
                    let foundValidTarget = false;

                    // First pass: look for tokens at level 1 or below
                    for (const pos of ['left', 'center', 'right']) {
                        const creatures = currentCreatures[pos] || [];
                        creatures.forEach((creature, index) => {
                            const creatureName = creature.name || creature.cardName || creature;
                            const creatureInfo = getCardInfo(creatureName);
                            
                            if (creatureInfo && creatureInfo.cardType === 'Token') {
                                const level = creatureInfo.level || 1;
                                if (level <= 1) {
                                    foundValidTarget = true;
                                    if (lowestLevel > 0 || !lowestCreature) {
                                        lowestCreature = creature;
                                        lowestPosition = pos;
                                        lowestIndex = index;
                                        lowestLevel = 0;
                                    }
                                }
                            }
                        });
                    }

                    // Second pass: if no tokens, find lowest level creature at level 1 or below
                    if (!lowestCreature) {
                        for (const pos of ['left', 'center', 'right']) {
                            const creatures = currentCreatures[pos] || [];
                            creatures.forEach((creature, index) => {
                                const creatureName = creature.name || creature.cardName || creature;
                                const creatureInfo = getCardInfo(creatureName);
                                
                                if (creatureName === 'GraveWorm') {
                                    return;
                                }
                                
                                if (creatureInfo && creatureInfo.cardType !== 'Token') {
                                    const level = creatureInfo.level || 1;
                                    
                                    if (level <= 1) {
                                        foundValidTarget = true;
                                        if (level < lowestLevel) {
                                            lowestCreature = creature;
                                            lowestPosition = pos;
                                            lowestIndex = index;
                                            lowestLevel = level;
                                        }
                                    }
                                }
                            });
                        }
                    }

                    if (foundValidTarget && lowestCreature && lowestPosition !== null && lowestIndex >= 0) {
                        const sacrificedCreature = currentCreatures[lowestPosition].splice(lowestIndex, 1)[0];
                        const sacrificedName = sacrificedCreature.name || sacrificedCreature.cardName || sacrificedCreature;
                        
                        console.log(`🔥 CPU BurnedContract: Sacrificed ${sacrificedName} from ${lowestPosition}`);
                        
                        const hpBonus = 50;
                        const attackBonus = 10;
                        
                        ['left', 'center', 'right'].forEach(pos => {
                            const hero = currentFormation[pos];
                            if (hero) {
                                hero.hpBonusses = (hero.hpBonusses || 0) + hpBonus;
                                hero.attackBonusses = (hero.attackBonusses || 0) + attackBonus;
                                console.log(`✅ CPU BurnedContract: Buffed ${hero.name} (+${attackBonus} ATK, +${hpBonus} HP)`);
                            }
                        });
                        
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
                            
                            console.log(`🪱 CPU BurnedContract: Created ${toDuplicate.length} GraveWorm duplicate(s)`);
                        }
                    } else {
                        console.log(`⚠️ CPU BurnedContract: No creatures at level 1 or below, skipping and refunding gold`);
                        currentGold += artifactCost;
                    }
                    
                    continue;
                }
                // CHEESE ARTIFACTS SPECIAL HANDLING
                const cheeseArtifacts = ['CuteCheese', 'NerdyCheese', 'HolyCheese', 'SicklyCheese', 'CoolCheese', 'AngryCheese'];
                if (cheeseArtifacts.includes(artifactName)) {
                    const allCardNames = getAllCardNames();
                    
                    if (artifactName === 'CuteCheese' || artifactName === 'NerdyCheese') {
                        const targetSchool = artifactName === 'CuteCheese' ? 'SummoningMagic' : 'MagicArts';
                        
                        const eligibleSpells = allCardNames.filter(cardName => {
                            const cardInfo = getCardInfo(cardName);
                            return cardInfo && cardInfo.cardType === 'Spell' && cardInfo.spellSchool === targetSchool;
                        });
                        
                        if (eligibleSpells.length > 0) {
                            for (let i = 0; i < 3; i++) {
                                const randomSpell = eligibleSpells[Math.floor(Math.random() * eligibleSpells.length)];
                                currentHand.push(randomSpell);
                            }
                        }
                    } else {
                        const schoolMapping = {
                            'HolyCheese': 'SupportMagic',
                            'SicklyCheese': 'DecayMagic',
                            'CoolCheese': 'Fighting',
                            'AngryCheese': 'DestructionMagic'
                        };
                        const targetSchool = schoolMapping[artifactName];
                        
                        const eligibleSpells = allCardNames.filter(cardName => {
                            const cardInfo = getCardInfo(cardName);
                            if (!cardInfo || cardInfo.cardType !== 'Spell') return false;
                            if (cardInfo.spellSchool !== targetSchool) return false;
                            if (cardInfo.subtype === 'Creature' || cardInfo.subtype === 'Area') return false;
                            if (cardInfo.subtype === 'Permanent') return false;
                            return true;
                        });
                        
                        if (eligibleSpells.length > 0) {
                            ['left', 'center', 'right'].forEach(position => {
                                if (currentFormation[position]) {
                                    const randomSpell = eligibleSpells[Math.floor(Math.random() * eligibleSpells.length)];
                                    const spellInfo = getCardInfo(randomSpell);
                                    
                                    if (spellInfo) {
                                        if (!currentSpellbooks[position]) {
                                            currentSpellbooks[position] = [];
                                        }
                                        currentSpellbooks[position].push({
                                            name: randomSpell,
                                            image: spellInfo.image,
                                            cardType: spellInfo.cardType,
                                            level: spellInfo.level,
                                            spellSchool: spellInfo.spellSchool,
                                            addedAt: Date.now(),
                                            enabled: true
                                        });
                                    }
                                }
                            });
                        }
                    }
                    
                    continue;
                }

                // TREASURE HUNTERS BACKPACK
                if (artifactName === 'TreasureHuntersBackpack') {
                    const allEquipCards = getAllCardNames().filter(cardName => {
                        const cardInfo = getCardInfo(cardName);
                        return cardInfo && 
                            cardInfo.cardType === 'Artifact' && 
                            cardInfo.subtype === 'Equip';
                    });
                    
                    if (allEquipCards.length > 0) {
                        ['left', 'center', 'right'].forEach(position => {
                            if (currentFormation[position] && currentFormation[position].name) {
                                const randomIndex = Math.floor(Math.random() * allEquipCards.length);
                                const selectedEquip = allEquipCards[randomIndex];
                                const equipInfo = getCardInfo(selectedEquip);
                                
                                if (equipInfo) {
                                    if (!currentEquipment[position]) {
                                        currentEquipment[position] = [];
                                    }
                                    
                                    currentEquipment[position].push({
                                        name: selectedEquip,
                                        image: equipInfo.image,
                                        cardType: equipInfo.cardType,
                                        equippedAt: Date.now(),
                                        equippedBy: 'TreasureHuntersBackpack',
                                        free: true
                                    });
                                }
                            }
                        });
                    }
                    
                    continue;
                }
                
                // NORMAL ARTIFACT HANDLING
                if (artifactInfo.subtype === 'Equip') {
                    const targetPosition = selectEquipTarget(artifactName, currentFormation, team.abilities, currentEquipment, currentGraveyard);
                    
                    if (targetPosition) {
                        if (!currentEquipment[targetPosition]) {
                            currentEquipment[targetPosition] = [];
                        }
                        currentEquipment[targetPosition].push({
                            name: artifactName,
                            image: artifactInfo.image,
                            cardType: artifactInfo.cardType
                        });
                    } else {
                        currentGold += artifactCost;
                    }
                } else if (artifactInfo.subtype === 'Permanent') {
                    const alreadyHas = currentPermanentArtifacts.some(artifact => 
                        artifact.name === artifactName || artifact === artifactName
                    );
                    
                    if (alreadyHas) {
                        currentGold += artifactCost;
                    } else {
                        currentPermanentArtifacts.push({
                            name: artifactName,
                            image: artifactInfo.image,
                            cardType: artifactInfo.cardType
                        });
                    }
                }
            }

            updates[`${teamKey}/gold`] = currentGold;
            updates[`${teamKey}/equipment`] = currentEquipment;
            updates[`${teamKey}/permanentArtifacts`] = currentPermanentArtifacts;
            updates[`${teamKey}/hand`] = currentHand;
            updates[`${teamKey}/graveyard`] = currentGraveyard;
            updates[`${teamKey}/deck`] = currentDeck;
            updates[`${teamKey}/formation`] = currentFormation;
            updates[`${teamKey}/magicSapphiresUsed`] = currentMagicSapphiresUsed;
            updates[`${teamKey}/delayedEffects`] = currentDelayedEffects;
            updates[`${teamKey}/spellbooks`] = currentSpellbooks;
            updates[`${teamKey}/creatures`] = currentCreatures;
        }

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
        }

        return true;

    } catch (error) {
        return false;
    }
}

/**
 * Select target hero for equip artifact with smart rules
 */
function selectEquipTarget(artifactName, formation, abilities, currentEquipment, graveyard = []) {
    const availablePositions = [];
    ['left', 'center', 'right'].forEach(pos => {
        if (formation[pos]) {
            availablePositions.push(pos);
        }
    });

    if (availablePositions.length === 0) return null;

    // Calculate unique graveyard cards count
    const uniqueGraveyardCards = new Set(graveyard).size;

    // CUTE CROWN - Always target Mary
    if (artifactName === 'CuteCrown') {
        const maryPosition = availablePositions.find(pos => 
            formation[pos].name === 'Mary'
        );

        if (maryPosition) return maryPosition;
        return availablePositions[Math.floor(Math.random() * availablePositions.length)];
    }

    // ARROW ARTIFACTS - Prioritize heroes with fewest copies of this arrow, then Darge, then highest attack
    if (artifactName.includes('Arrow')) {
        return selectArrowTarget(availablePositions, formation, abilities, currentEquipment, uniqueGraveyardCards, artifactName, graveyard);
    }

    // CRUSADERS ARTIFACTS - Always target Cecilia
    if (artifactName.includes('Crusaders')) {
        const ceciliaPosition = availablePositions.find(pos => 
            formation[pos].name === 'Cecilia'
        );

        if (ceciliaPosition) return ceciliaPosition;
        return availablePositions[Math.floor(Math.random() * availablePositions.length)];
    }

    // ALL OTHER EQUIPS - 75% highest attack
    if (Math.random() < 0.75) {
        return selectHighestAttackHero(availablePositions, formation, abilities, currentEquipment, uniqueGraveyardCards, graveyard);
    } else {
        return availablePositions[Math.floor(Math.random() * availablePositions.length)];
    }
}

/**
 * Select hero with highest attack stat
 */
function selectHighestAttackHero(positions, formation, abilities, equipment, uniqueGraveyardCards, graveyard = []) {
    let highestAttack = -1;
    let highestPositions = [];

    positions.forEach(pos => {
        const stats = calculateComputerHeroStats(formation, pos, abilities, equipment, uniqueGraveyardCards, graveyard);
        if (stats && stats.attack > highestAttack) {
            highestAttack = stats.attack;
            highestPositions = [pos];
        } else if (stats && stats.attack === highestAttack) {
            highestPositions.push(pos);
        }
    });

    if (highestPositions.length > 0) {
        return highestPositions[Math.floor(Math.random() * highestPositions.length)];
    }

    return positions[0];
}

/**
 * Select hero with best priority for arrow artifacts
 * Priority: 
 * 1. Heroes with fewest copies of this specific arrow
 * 2. Within same count: Darge first, then by attack stat descending
 */
function selectArrowTarget(positions, formation, abilities, equipment, uniqueGraveyardCards, artifactName, graveyard = []) {
    // Count how many of this specific arrow each hero already has
    const heroArrowCounts = positions.map(pos => {
        const heroEquipment = equipment[pos] || [];
        const arrowCount = heroEquipment.filter(item => {
            const name = item.name || item.cardName || item;
            return name === artifactName;
        }).length;
        
        return { position: pos, arrowCount };
    });
    
    // Sort by arrow count (ascending - fewer is better)
    heroArrowCounts.sort((a, b) => a.arrowCount - b.arrowCount);
    
    // Get minimum arrow count
    const minArrowCount = heroArrowCounts[0].arrowCount;
    
    // Get all heroes with the minimum arrow count (tied for fewest)
    const heroesWithFewestArrows = heroArrowCounts.filter(h => h.arrowCount === minArrowCount);
    const tiedPositions = heroesWithFewestArrows.map(h => h.position);
    
    // If only one hero has the fewest arrows, return it
    if (tiedPositions.length === 1) {
        return tiedPositions[0];
    }
    
    // Multiple heroes tied - apply tiebreaker: Darge first, then highest attack
    const dargePosition = tiedPositions.find(pos => formation[pos].name === 'Darge');
    if (dargePosition) {
        return dargePosition;
    }
    
    // No Darge in the tie - select highest attack among tied heroes
    return selectHighestAttackHero(tiedPositions, formation, abilities, equipment, uniqueGraveyardCards, graveyard);
}

/**
 * Calculate effective stats for a computer hero
 */
export function calculateComputerHeroStats(formation, position, abilities, equipment, uniqueGraveyardCards = 0, graveyard = []) {
    const hero = formation[position];
    if (!hero) return null;
        
    const heroInfo = getCardInfo(hero.name);
    if (!heroInfo || heroInfo.cardType !== 'hero') return null;
    
    const toughnessStacks = countAbilityStacks(abilities, position, 'Toughness');
    const fightingStacks = countAbilityStacks(abilities, position, 'Fighting');
    
    let equipmentAttackBonus = 0;
    if (hero.name === 'Toras') {
        const heroEquipment = equipment[position] || [];
        equipmentAttackBonus = heroEquipment.length * 20;
    }
    
    let energyCoreAttackBonus = 0;
    let energyCoreCount = 0;
    const heroEquipment = equipment[position] || [];
    energyCoreCount = heroEquipment.filter(item => {
        const name = item.name || item.cardName || item;
        return name === 'AncientTechInfiniteEnergyCore';
    }).length;
    
    if (energyCoreCount > 0) {
        energyCoreAttackBonus = uniqueGraveyardCards * 5 * energyCoreCount;
    }
    
    let skullNecklaceAttackBonus = 0;
    const hasSkullNecklace = heroEquipment.some(item => {
        const name = item.name || item.cardName || item;
        return name === 'SkullNecklace';
    });
    if (hasSkullNecklace) {
        skullNecklaceAttackBonus = 0;
    }
    
    // FutureTechLaserCannon: +100 Attack per copy equipped
    let laserCannonAttackBonus = 0;
    const laserCannonCount = heroEquipment.filter(item => {
        const name = item.name || item.cardName || item;
        return name === 'FutureTechLaserCannon';
    }).length;
    if (laserCannonCount > 0) {
        laserCannonAttackBonus = laserCannonCount * 100; // +100 per laser cannon
    }
    
    // FutureTechGun: +10 Attack per copy in graveyard (per equipped gun), capped at 15 guns (+150)
    let futureTechGunAttackBonus = 0;
    const futureTechGunEquippedCount = heroEquipment.filter(item => {
        const name = item.name || item.cardName || item;
        return name === 'FutureTechGun';
    }).length;
    if (futureTechGunEquippedCount > 0 && Array.isArray(graveyard)) {
        const futureTechGunsInGraveyard = graveyard.filter(cardName => cardName === 'FutureTechGun').length;
        const cappedGunsInGraveyard = Math.min(futureTechGunsInGraveyard, 15); // Cap at 15 guns
        futureTechGunAttackBonus = futureTechGunEquippedCount * cappedGunsInGraveyard * 10; // +10 per gun in graveyard per equipped gun
    }
    
    let permanentAttackBonus = hero.attackBonusses || 0;
    let permanentHpBonus = hero.hpBonusses || 0;
    let trulyPermanentAttackBonus = hero.permanentAttackBonusses || 0;
    let trulyPermanentHpBonus = hero.permanentHpBonusses || 0;
    
    const hpBonus = toughnessStacks * 200;
    const fightingAttackBonus = fightingStacks * 20;
    const totalAttackBonus = fightingAttackBonus + equipmentAttackBonus + energyCoreAttackBonus 
        + skullNecklaceAttackBonus + laserCannonAttackBonus + futureTechGunAttackBonus 
        + permanentAttackBonus + trulyPermanentAttackBonus;
    const totalHpBonus = hpBonus + permanentHpBonus + trulyPermanentHpBonus;

    const calculatedMaxHp = heroInfo.hp + totalHpBonus;
    const finalMaxHp = Math.max(1, calculatedMaxHp);
    const finalAttack = heroInfo.atk + totalAttackBonus;
    
    return {
        maxHp: finalMaxHp,
        currentHp: finalMaxHp,
        attack: finalAttack,
        bonuses: {
            toughnessStacks,
            fightingStacks,
            hpBonus,
            attackBonus: fightingAttackBonus,
            equipmentCount: hero.name === 'Toras' ? heroEquipment.length : 0,
            equipmentAttackBonus,
            energyCoreCount,
            energyCoreAttackBonus,
            skullNecklaceAttackBonus,
            laserCannonCount,
            laserCannonAttackBonus,
            futureTechGunEquippedCount,
            futureTechGunAttackBonus,
            permanentAttackBonus,
            permanentHpBonus,
            trulyPermanentAttackBonus,
            trulyPermanentHpBonus,
            totalAttackBonus,
            totalHpBonus
        }
    };
}

/**
 * Process LegendarySwordOfABarbarianKing bonuses
 */
export async function processLegendarySwordBonuses(roomRef, currentTurn) {
    if (!roomRef || currentTurn < 1) return false;

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

                const heroEquipment = team.equipment?.[position] || [];
                
                const swordCount = heroEquipment.filter(item => {
                    const itemName = item.name || item.cardName || item;
                    return itemName === 'LegendarySwordOfABarbarianKing';
                }).length;

                if (swordCount === 0) return;

                let totalAttackBonus = 0;
                let totalHpBonus = 0;

                for (let i = 0; i < swordCount; i++) {
                    const maxRoll = Math.ceil(currentTurn / 2);
                    const roll = Math.ceil(Math.random() * (maxRoll + 1));
                    
                    totalAttackBonus += roll;
                    totalHpBonus += roll * 3;
                }

                if (totalAttackBonus > 0 || totalHpBonus > 0) {
                    const currentAttackBonus = hero.attackBonusses || 0;
                    const currentHpBonus = hero.hpBonusses || 0;

                    updates[`${teamKey}/formation/${position}/attackBonusses`] = currentAttackBonus + totalAttackBonus;
                    updates[`${teamKey}/formation/${position}/hpBonusses`] = currentHpBonus + totalHpBonus;
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