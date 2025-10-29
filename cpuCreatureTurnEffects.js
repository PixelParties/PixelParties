// cpuCreatureTurnEffects.js - CPU creature turn-start effect processing
// CENTRAL MODULE: All creature turn-start effects are processed here
// New creature effects should be added as internal functions and called from processAllCreatureTurnEffects

/**
 * Generate a weighted random number (1-5) based on current turn
 * - Early turns (1-5): Higher probability for low numbers (1-2)
 * - Middle turns (6-14): Equal probability for all numbers
 * - Late turns (15+): Higher probability for high numbers (4-5)
 * 
 * @param {number} currentTurn - The current turn number
 * @returns {number} Random number from 1 to 5
 */
function generateWeightedRandom(currentTurn) {
    const random = Math.random();
    
    if (currentTurn <= 5) {
        // Early turns: Higher chance for low numbers
        // Distribution: 1(30%), 2(30%), 3(20%), 4(15%), 5(5%)
        if (random < 0.30) return 1;
        if (random < 0.60) return 2;
        if (random < 0.80) return 3;
        if (random < 0.95) return 4;
        return 5;
    } else if (currentTurn <= 14) {
        // Middle turns: Equal chance for all
        // Distribution: 1(20%), 2(20%), 3(20%), 4(20%), 5(20%)
        if (random < 0.20) return 1;
        if (random < 0.40) return 2;
        if (random < 0.60) return 3;
        if (random < 0.80) return 4;
        return 5;
    } else {
        // Late turns: Higher chance for high numbers
        // Distribution: 1(5%), 2(15%), 3(20%), 4(30%), 5(30%)
        if (random < 0.05) return 1;
        if (random < 0.20) return 2;
        if (random < 0.40) return 3;
        if (random < 0.70) return 4;
        return 5;
    }
}

/**
 * Process ResilientMonkee effects for all computer teams at turn start
 * ResilientMonkee Effect:
 * - Count ResilientMonkee creatures owned by the team
 * - If at least 1 exists, roll weighted random 1-5 based on turn number
 * - Calculate: randomNumber × resilientMonkeeCount × 20
 * - Apply as permanent max HP increase to ALL creatures whose names contain "Monkee"
 * 
 * @param {Object} roomRef - Firebase room reference
 * @param {number} currentTurn - Current turn number
 * @returns {Promise<boolean>} Success status
 */
async function processResilientMonkeeEffects(roomRef, currentTurn) {
    if (!roomRef || !currentTurn) return false;

    try {
        const snapshot = await roomRef.child('singleplayer/computerTeams').once('value');
        const teams = snapshot.val();
        if (!teams) return false;

        const updates = {};

        for (const teamKey of ['team1', 'team2', 'team3']) {
            const team = teams[teamKey];
            if (!team || !team.formation) continue;

            const currentCreatures = JSON.parse(JSON.stringify(team.creatures || { left: [], center: [], right: [] }));
            
            // Count total ResilientMonkee creatures for this team
            let resilientMonkeeCount = 0;
            for (const position of ['left', 'center', 'right']) {
                const creatures = currentCreatures[position] || [];
                resilientMonkeeCount += creatures.filter(creature => {
                    const creatureName = creature.name || creature.cardName || creature;
                    return creatureName === 'ResilientMonkee';
                }).length;
            }

            // Only process if at least one ResilientMonkee exists
            if (resilientMonkeeCount === 0) continue;

            // Generate weighted random number based on turn
            const randomNumber = generateWeightedRandom(currentTurn);

            // Calculate HP bonus
            const hpBonus = randomNumber * resilientMonkeeCount * 20;

            // If no bonus, skip this team
            if (hpBonus === 0) continue;

            let updateOccurred = false;

            // Find all creatures containing "Monkee" and increase their max HP
            for (const position of ['left', 'center', 'right']) {
                const creatures = currentCreatures[position] || [];

                for (let i = 0; i < creatures.length; i++) {
                    const creature = creatures[i];
                    const creatureName = creature.name || creature.cardName || creature;

                    // Check if creature name contains "Monkee" (case-sensitive)
                    if (creatureName.includes('Monkee')) {
                        // Increase permanent max HP
                        const currentMaxHp = creature.maxHp || creature.hp || 0;
                        const newMaxHp = currentMaxHp + hpBonus;

                        // Update the creature (handle both string and object formats)
                        if (typeof creature === 'string') {
                            // If creature is just a string, create proper object
                            creatures[i] = {
                                name: creature,
                                maxHp: newMaxHp,
                                hp: newMaxHp,
                                currentHp: newMaxHp
                            };
                        } else {
                            // If creature is an object, preserve all properties
                            creatures[i] = {
                                ...creature,
                                maxHp: newMaxHp,
                                hp: newMaxHp, // Also update current HP to new max
                                currentHp: newMaxHp
                            };
                        }

                        updateOccurred = true;

                        console.log(`ResilientMonkee effect: ${creatureName} gained +${hpBonus} HP (Turn ${currentTurn}, Roll: ${randomNumber})`);
                    }
                }

                // Update creatures for this position
                currentCreatures[position] = creatures;
            }

            // Only update if changes occurred
            if (updateOccurred) {
                updates[`${teamKey}/creatures`] = currentCreatures;
            }
        }

        if (Object.keys(updates).length > 0) {
            await roomRef.child('singleplayer/computerTeams').update(updates);
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error processing ResilientMonkee effects:', error);
        return false;
    }
}

/**
 * MAIN ORCHESTRATION FUNCTION
 * Process all creature turn-start effects for all computer teams
 * 
 * This is the ONLY function that should be called from generateComputerParty.js
 * All individual creature effects are processed internally by this function
 * 
 * To add new creature effects:
 * 1. Create a new internal function (like processResilientMonkeeEffects)
 * 2. Add a call to it in this function
 * 3. No changes needed in generateComputerParty.js
 * 
 * @param {Object} roomRef - Firebase room reference
 * @param {number} currentTurn - Current turn number
 * @returns {Promise<boolean>} Success status
 */
export async function processAllCreatureTurnEffects(roomRef, currentTurn) {
    if (!roomRef || !currentTurn) return false;

    try {
        // Process all creature turn effects
        // Each effect function returns true if updates were made
        
        // 1. ResilientMonkee Effect
        await processResilientMonkeeEffects(roomRef, currentTurn);
        
        // 2. Future creature effects go here
        // await processOtherCreatureEffects(roomRef, currentTurn);
        // await processAnotherCreatureEffects(roomRef, currentTurn);
        
        return true;

    } catch (error) {
        console.error('Error processing creature turn effects:', error);
        return false;
    }
}