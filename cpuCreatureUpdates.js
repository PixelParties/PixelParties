// cpuCreatureUpdates.js - CPU creature evolution processing

import { getCardInfo } from './cardDatabase.js';
import { getDifficultyValue } from './cpuDifficultyConfig.js';

/**
 * Process creature effects for all computer teams after battle
 * Handles creature evolutions like CuteBird -> CutePhoenix
 */
export async function processComputerCreaturesAfterBattle(roomRef) {
    if (!roomRef) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        for (const teamKey of ['team1', 'team2', 'team3']) {
            const team = teams[teamKey];
            if (!team || !team.formation) continue;

            // Get team difficulty
            const difficulty = team.difficulty || 'Normal';

            let currentCreatures = JSON.parse(JSON.stringify(team.creatures || { left: [], center: [], right: [] }));
            let evolutionOccurred = false;

            for (const position of ['left', 'center', 'right']) {
                const hero = team.formation[position];
                if (!hero) continue;

                const creatures = currentCreatures[position] || [];
                if (creatures.length === 0) continue;

                // Count CuteCrown equipment for this hero
                const heroEquipment = team.equipment?.[position] || [];
                const cuteCrownCount = heroEquipment.filter(item => {
                    const itemName = item.name || item.cardName || item;
                    return itemName === 'CuteCrown';
                }).length;

                // Calculate evolution chance (difficulty-based base + 10% per CuteCrown)
                const baseChance = getDifficultyValue(difficulty, 'creatures', 'cuteBirdEvolution', 'baseChance');
                const evolutionChance = baseChance + (cuteCrownCount * 0.10);

                // Process each creature in reverse order
                for (let i = creatures.length - 1; i >= 0; i--) {
                    const creature = creatures[i];
                    const creatureName = creature.name || creature.cardName || creature;

                    if (creatureName === 'CuteBird') {
                        const roll = Math.random();
                        
                        if (roll < evolutionChance) {
                            const cutePhoenixInfo = getCardInfo('CutePhoenix');
                            
                            if (cutePhoenixInfo) {
                                // Remove CuteBird
                                creatures.splice(i, 1);
                                
                                // Add CutePhoenix at the same position
                                creatures.splice(i, 0, {
                                    name: 'CutePhoenix',
                                    image: cutePhoenixInfo.image,
                                    cardType: cutePhoenixInfo.cardType,
                                    maxHp: 10,
                                    currentHp: 10,
                                    hp: 10,
                                    addedAt: Date.now(),
                                    isPermanent: true,
                                    evolvedFrom: 'CuteBird'
                                });
                                
                                evolutionOccurred = true;
                            }
                        }
                    }
                }

                // Update creatures for this position
                currentCreatures[position] = creatures;
            }

            // Only update if evolution occurred
            if (evolutionOccurred) {
                updates[`${teamKey}/creatures`] = currentCreatures;
            }
        }

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
        }

        return true;

    } catch (error) {
        console.error('Error processing computer creatures:', error);
        return false;
    }
}