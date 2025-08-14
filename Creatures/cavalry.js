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

            // CRITICAL FIX: Sort movements by fromIndex in DESCENDING order
            // This prevents index invalidation when removing multiple cavalry from same hero
            cavalryMovements.sort((a, b) => b.fromIndex - a.fromIndex);

            // Send movement data to guest before executing
            this.sendCavalryMovementsUpdate(cavalryMovements);
            await this.battleManager.delay(50); // Brief delay for sync

            // Execute movements in reverse index order
            for (const movement of cavalryMovements) {
                await this.executeCavalryMovement(movement);
            }

            // NOTE: No longer calling renderCreaturesAfterInit here since 
            // executeCavalryMovement now handles individual position re-renders
            console.log('🐇 All cavalry movements completed with individual visual updates');
        }
    }

    // Find all living cavalry in a hero's creatures
    findLivingCavalryInHero(hero, currentPosition, side) {
        const cavalryUnits = [];
        
        if (!hero.creatures || hero.creatures.length === 0) return cavalryUnits;

        hero.creatures.forEach((creature, index) => {
            if (creature.alive && CavalryCreature.isCavalry(creature.name)) {
                const nextPosition = this.getNextPosition(currentPosition, side);
                
                if (nextPosition) {
                    cavalryUnits.push({
                        creature: creature,
                        fromHero: hero,
                        fromPosition: currentPosition,
                        fromIndex: index,
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
        const { creature, fromHero, fromPosition, fromIndex, toPosition, side } = movement;
        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const toHero = heroes[toPosition];

        if (!toHero) {
            console.error(`Cavalry movement failed: target hero not found at ${toPosition}`);
            return;
        }

        // SAFETY CHECK: Verify the creature is still at the expected index
        if (fromIndex >= fromHero.creatures.length || 
            fromHero.creatures[fromIndex] !== creature ||
            !CavalryCreature.isCavalry(fromHero.creatures[fromIndex].name)) {
            console.error(`Cavalry movement failed: creature mismatch at index ${fromIndex}`, {
                expectedCreature: creature.name,
                actualCreature: fromHero.creatures[fromIndex]?.name,
                arrayLength: fromHero.creatures.length
            });
            return;
        }

        // Log the movement
        this.battleManager.addCombatLog(
            `🐇 ${creature.name} gallops from ${fromPosition} to ${toPosition} position!`, 
            side === 'player' ? 'success' : 'error'
        );

        // Remove from current position (VERIFIED correct index)
        const removedCreature = fromHero.creatures.splice(fromIndex, 1)[0];
        
        // Add to front of target position (pushes existing creatures back)
        toHero.creatures.unshift(removedCreature);

        // CRITICAL FIX: Force complete visual re-render for both positions
        // This ensures old cavalry visuals are completely removed
        this.forceCompleteCreatureRerender(side, fromPosition, fromHero);
        this.forceCompleteCreatureRerender(side, toPosition, toHero);

        console.log(`🐇 Cavalry moved from ${side} ${fromPosition} to ${side} ${toPosition}`);
        console.log(`  From hero now has ${fromHero.creatures.length} creatures`);
        console.log(`  To hero now has ${toHero.creatures.length} creatures`);
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
            fromPosition: movement.fromPosition,
            fromIndex: movement.fromIndex,
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

        // CRITICAL FIX: Sort guest movements by fromIndex in DESCENDING order too
        const sortedMovements = [...movements].sort((a, b) => b.fromIndex - a.fromIndex);

        sortedMovements.forEach(movementData => {
            const localSide = (movementData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            this.executeGuestCavalryMovement(movementData, localSide);
        });

        // NOTE: No longer calling renderCreaturesAfterInit here since 
        // executeGuestCavalryMovement now handles individual position re-renders
        console.log('🐇 Guest: All cavalry movements completed with individual visual updates');
    }

    // Execute cavalry movement on guest side
    executeGuestCavalryMovement(movementData, localSide) {
        const { creatureName, fromPosition, fromIndex, toPosition } = movementData;
        const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const fromHero = heroes[fromPosition];
        const toHero = heroes[toPosition];

        if (!fromHero || !toHero) {
            console.error(`Guest cavalry movement failed: heroes not found`, movementData);
            return;
        }

        // ENHANCED SAFETY CHECK: Verify the creature at the expected position
        if (fromIndex >= fromHero.creatures.length || 
            !CavalryCreature.isCavalry(fromHero.creatures[fromIndex].name)) {
            console.error(`Guest cavalry movement failed: creature mismatch at index ${fromIndex}`, {
                expectedName: creatureName,
                actualName: fromHero.creatures[fromIndex]?.name,
                arrayLength: fromHero.creatures.length,
                fullArray: fromHero.creatures.map(c => c.name)
            });
            return;
        }

        // Additional verification that it's the right creature
        if (fromHero.creatures[fromIndex].name !== creatureName) {
            console.error(`Guest cavalry movement failed: wrong creature name`, {
                expected: creatureName,
                actual: fromHero.creatures[fromIndex].name
            });
            return;
        }

        // Log the movement
        this.battleManager.addCombatLog(
            `🐇 ${creatureName} gallops from ${fromPosition} to ${toPosition} position!`, 
            localSide === 'player' ? 'success' : 'error'
        );

        // Remove from current position
        const removedCreature = fromHero.creatures.splice(fromIndex, 1)[0];
        
        // Add to front of target position (pushes existing creatures back)
        toHero.creatures.unshift(removedCreature);

        // CRITICAL FIX: Force complete visual re-render for both positions (guest side)
        this.forceCompleteCreatureRerender(localSide, fromPosition, fromHero);
        this.forceCompleteCreatureRerender(localSide, toPosition, toHero);

        console.log(`🐇 Guest: Cavalry moved from ${localSide} ${fromPosition} to ${localSide} ${toPosition}`);
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