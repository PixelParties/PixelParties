// ./Creatures/cavalry.js - Fixed Cavalry Creature Repositioning Module

export class CavalryCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        console.log('🐇 Cavalry Creature module initialized');
    }

    // Check if a creature is Cavalry
    static isCavalry(creatureName) {
        return creatureName === 'Cavalry';
    }

    // Process end-of-position cavalry movements for all cavalry in that position
    async processEndOfPositionMovements(position) {
        if (!this.battleManager.isAuthoritative) return;

        // Find all living cavalry in both sides for this position
        const cavalryMovements = [];

        // Check player side
        const playerHero = this.battleManager.playerHeroes[position];
        if (playerHero && playerHero.creatures) {
            const playerCavalry = this.findLivingCavalryInHero(playerHero, position, 'player');
            cavalryMovements.push(...playerCavalry);
        }

        // Check opponent side  
        const opponentHero = this.battleManager.opponentHeroes[position];
        if (opponentHero && opponentHero.creatures) {
            const opponentCavalry = this.findLivingCavalryInHero(opponentHero, position, 'opponent');
            cavalryMovements.push(...opponentCavalry);
        }

        // Execute all cavalry movements
        if (cavalryMovements.length > 0) {
            this.battleManager.addCombatLog(
                `🐇 Cavalry units reposition after ${position} position completes!`, 
                'info'
            );

            // Send movement data to guest before executing
            this.sendCavalryMovementsUpdate(cavalryMovements);
            await this.battleManager.delay(50); // Brief delay for sync

            // Execute movements with real-time index lookup
            for (const movement of cavalryMovements) {
                await this.executeCavalryMovement(movement);
            }

            console.log('🐇 All cavalry movements completed with individual visual updates');
        }
    }

    // Find all living cavalry in a hero's creatures
    findLivingCavalryInHero(hero, currentPosition, side) {
        const cavalryUnits = [];
        
        if (!hero.creatures || hero.creatures.length === 0) return cavalryUnits;

        hero.creatures.forEach((creature) => {
            if (creature.alive && CavalryCreature.isCavalry(creature.name)) {
                const nextPosition = this.getNextPosition(currentPosition, side);
                
                if (nextPosition) {
                    cavalryUnits.push({
                        creature: creature, // Store creature reference, not index
                        creatureId: creature.addedAt || `${creature.name}_${Date.now()}`, // Unique identifier
                        fromHero: hero,
                        fromPosition: currentPosition,
                        toPosition: nextPosition,
                        side: side,
                        absoluteSide: hero.absoluteSide
                    });
                }
            }
        });

        return cavalryUnits;
    }

    // Get the next position for cavalry movement (clockwise rotation)
    getNextPosition(currentPosition, side) {
        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Define clockwise movement order
        const positionOrder = ['left', 'center', 'right'];
        const currentIndex = positionOrder.indexOf(currentPosition);
        
        // Try next positions in clockwise order
        for (let i = 1; i <= 3; i++) {
            const nextIndex = (currentIndex + i) % positionOrder.length;
            const nextPosition = positionOrder[nextIndex];
            
            // Check if next position has a hero (alive or dead doesn't matter)
            if (heroes[nextPosition]) {
                return nextPosition;
            }
        }
        
        // No valid target found
        return null;
    }

    // Execute a single cavalry movement
    async executeCavalryMovement(movement) {
        const { creature, creatureId, fromHero, fromPosition, toPosition, side } = movement;
        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const toHero = heroes[toPosition];

        if (!toHero) {
            console.error(`Cavalry movement failed: target hero not found at ${toPosition}`);
            return;
        }

        // CRITICAL FIX: Find current index of creature at movement time
        const currentIndex = fromHero.creatures.findIndex(c => 
            c === creature || // Direct reference match
            (c.addedAt && c.addedAt === creature.addedAt) || // ID match
            (c.name === creature.name && c.alive && CavalryCreature.isCavalry(c.name)) // Fallback name match
        );

        if (currentIndex === -1) {
            console.warn(`Cavalry movement skipped: ${creature.name} no longer found in ${fromPosition}`);
            return;
        }

        // Verify it's still the right creature
        const currentCreature = fromHero.creatures[currentIndex];
        if (!currentCreature.alive || !CavalryCreature.isCavalry(currentCreature.name)) {
            console.warn(`Cavalry movement skipped: creature at index ${currentIndex} is no longer valid cavalry`);
            return;
        }

        // Log the movement
        this.battleManager.addCombatLog(
            `🐇 ${creature.name} gallops from ${fromPosition} to ${toPosition} position!`, 
            side === 'player' ? 'success' : 'error'
        );

        // Remove from current position using CURRENT index
        const removedCreature = fromHero.creatures.splice(currentIndex, 1)[0];
        
        // Add to front of target position (pushes existing creatures back)
        toHero.creatures.unshift(removedCreature);

        // Force complete visual re-render for both positions
        this.forceCompleteCreatureRerender(side, fromPosition, fromHero);
        this.forceCompleteCreatureRerender(side, toPosition, toHero);

        console.log(`🐇 Cavalry moved from ${side} ${fromPosition} to ${side} ${toPosition} (real-time index: ${currentIndex})`);
    }

    // Force complete creature re-rendering for a position
    forceCompleteCreatureRerender(side, position, hero) {
        const heroSlot = document.querySelector(`.${side}-slot.${position}-slot`);
        if (!heroSlot) return;

        // Remove ALL existing creature elements
        const existingCreatures = heroSlot.querySelector('.battle-hero-creatures');
        if (existingCreatures) {
            existingCreatures.remove();
            console.log(`🧹 Cleared old creature visuals for ${side} ${position}`);
        }

        // Re-create creatures from scratch if hero has creatures
        if (hero && hero.creatures && hero.creatures.length > 0) {
            const creaturesHTML = this.battleManager.battleScreen.createCreaturesHTML(hero.creatures, side, position);
            heroSlot.insertAdjacentHTML('beforeend', creaturesHTML);
            console.log(`🎨 Re-rendered ${hero.creatures.length} creatures for ${side} ${position}`);

            // Update necromancy displays if available
            if (this.battleManager.necromancyManager) {
                this.battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                    side, position, hero
                );
            }

            // Update creature health states
            this.battleManager.updateCreatureVisuals(side, position, hero.creatures);
        }
    }

    // Send cavalry movements to guest for synchronization
    sendCavalryMovementsUpdate(movements) {
        const movementsData = movements.map(movement => ({
            creatureName: movement.creature.name,
            creatureId: movement.creatureId,
            fromPosition: movement.fromPosition,
            toPosition: movement.toPosition,
            side: movement.side,
            absoluteSide: movement.absoluteSide
        }));

        this.battleManager.sendBattleUpdate('cavalry_movements', {
            movements: movementsData,
            timestamp: Date.now()
        });
    }

    // Handle cavalry movements on guest side
    handleGuestCavalryMovements(data) {
        const { movements } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';

        this.battleManager.addCombatLog(
            `🐇 Cavalry units reposition across the battlefield!`, 
            'info'
        );

        // Process movements without index sorting since we look up indices in real-time
        movements.forEach(movementData => {
            const localSide = (movementData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            this.executeGuestCavalryMovement(movementData, localSide);
        });

        console.log('🐇 Guest: All cavalry movements completed with real-time index lookups');
    }

    // Execute cavalry movement on guest side
    executeGuestCavalryMovement(movementData, localSide) {
        const { creatureName, creatureId, fromPosition, toPosition } = movementData;
        const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const fromHero = heroes[fromPosition];
        const toHero = heroes[toPosition];

        if (!fromHero || !toHero) {
            console.error(`Guest cavalry movement failed: heroes not found`, movementData);
            return;
        }

        // CRITICAL FIX: Find cavalry creature by identifier, not pre-calculated index
        const cavalryIndex = fromHero.creatures.findIndex(creature => {
            if (!creature.alive || !CavalryCreature.isCavalry(creature.name)) return false;
            
            // Try multiple identification methods
            if (creatureId && creature.addedAt && creature.addedAt.toString() === creatureId) {
                return true; // ID match (most reliable)
            }
            if (creature.name === creatureName) {
                return true; // Name match (fallback)
            }
            return false;
        });

        if (cavalryIndex === -1) {
            console.warn(`Guest cavalry movement skipped: ${creatureName} not found in ${fromPosition}`);
            return;
        }

        const cavalryCreature = fromHero.creatures[cavalryIndex];

        // Log the movement
        this.battleManager.addCombatLog(
            `🐇 ${creatureName} gallops from ${fromPosition} to ${toPosition} position!`, 
            localSide === 'player' ? 'success' : 'error'
        );

        // Remove from current position using FOUND index
        const removedCreature = fromHero.creatures.splice(cavalryIndex, 1)[0];
        
        // Add to front of target position (pushes existing creatures back)
        toHero.creatures.unshift(removedCreature);

        // Force complete visual re-render for both positions
        this.forceCompleteCreatureRerender(localSide, fromPosition, fromHero);
        this.forceCompleteCreatureRerender(localSide, toPosition, toHero);

        console.log(`🐇 Guest: Cavalry moved from ${localSide} ${fromPosition} to ${localSide} ${toPosition} (found at index: ${cavalryIndex})`);
    }

    // Clean up (called on battle end/reset)
    cleanup() {
        console.log('🐇 Cavalry module cleanup complete');
    }
}

// Static helper methods
export const CavalryHelpers = {
    // Check if any creature in a list is Cavalry
    hasCavalryInList(creatures) {
        return creatures.some(creature => CavalryCreature.isCavalry(creature.name));
    },

    // Get all Cavalry creatures from a list
    getCavalryFromList(creatures) {
        return creatures.filter(creature => CavalryCreature.isCavalry(creature.name));
    },

    // Count total cavalry units for a side
    countCavalryForSide(heroes) {
        let count = 0;
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.creatures) {
                count += hero.creatures.filter(creature => 
                    creature.alive && CavalryCreature.isCavalry(creature.name)
                ).length;
            }
        });
        return count;
    }
};

export default CavalryCreature;