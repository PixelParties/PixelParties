// ./Creatures/futureTechDrone.js - Future Tech Drone Creature Module
// Passive creature that gains HP bonuses from graveyard count and can be summoned for free

export class FutureTechDroneCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        console.log('🤖 Future Tech Drone Creature module initialized');
    }

    // Check if a creature is Future Tech Drone
    static isFutureTechDrone(creatureName) {
        return creatureName === 'FutureTechDrone';
    }

    // Apply start-of-battle HP bonuses to all Future Tech Drones
    static applyStartOfBattleHPBonuses(battleManager) {
        if (!battleManager.isAuthoritative) return;

        // Get both players' graveyards
        const playerGraveyard = battleManager.getPlayerGraveyard();
        const opponentGraveyard = battleManager.getOpponentGraveyard();

        // Count Future Tech Drones in each graveyard
        const playerDroneCount = playerGraveyard.filter(card => card === 'FutureTechDrone').length;
        const opponentDroneCount = opponentGraveyard.filter(card => card === 'FutureTechDrone').length;

        let totalEnhanced = 0;

        // Apply bonuses to player's drones
        if (playerDroneCount > 0) {
            totalEnhanced += FutureTechDroneCreature.applyHPBonusesToSide(
                battleManager, 'player', playerDroneCount
            );
        }

        // Apply bonuses to opponent's drones
        if (opponentDroneCount > 0) {
            totalEnhanced += FutureTechDroneCreature.applyHPBonusesToSide(
                battleManager, 'opponent', opponentDroneCount
            );
        }

        if (totalEnhanced > 0) {
            battleManager.addCombatLog(
                `🤖 ${totalEnhanced} Future Tech Drones enhanced with discard pile bonuses`,
                'info'
            );
        }
    }

    // Apply HP bonuses to all drones on one side
    static applyHPBonusesToSide(battleManager, side, droneCount) {
        const heroes = side === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        let dronesEnhanced = 0;

        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.creatures) {
                hero.creatures.forEach(creature => {
                    if (creature.name === 'FutureTechDrone' && creature.alive) {
                        const hpBonus = droneCount * 50;
                        creature.maxHp += hpBonus;
                        creature.currentHp += hpBonus;
                        dronesEnhanced++;
                        
                        battleManager.addCombatLog(
                            `🤖 ${creature.name} gains +${hpBonus} HP from ${droneCount} drones in discard pile!`,
                            side === 'player' ? 'success' : 'info'
                        );
                    }
                });
            }
        });

        return dronesEnhanced;
    }

    // Cleanup method
    cleanup() {
        console.log('🤖 Future Tech Drone cleanup complete');
    }
}

// Static helper methods
export const FutureTechDroneHelpers = {
    // Check if any creature in a list is Future Tech Drone
    hasFutureTechDroneInList(creatures) {
        return creatures.some(creature => FutureTechDroneCreature.isFutureTechDrone(creature.name));
    },

    // Get all Future Tech Drone creatures from a list
    getFutureTechDroneFromList(creatures) {
        return creatures.filter(creature => FutureTechDroneCreature.isFutureTechDrone(creature.name));
    },

    // Check if player can summon Future Tech Drone for free (3+ in graveyard)
    canSummonFutureTechDroneForFree(graveyardManager) {
        if (!graveyardManager) return false;
        
        const graveyard = graveyardManager.getGraveyard();
        const droneCount = graveyard.filter(card => card === 'FutureTechDrone').length;
        return droneCount >= 3;
    }
};

export default FutureTechDroneCreature;