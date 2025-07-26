// ./Abilities/necromancy.js - Necromancy Ability Module - FIXED POSITIONING

export class NecromancyManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.styleInjected = false;
    }

    // Initialize necromancy stacks for all heroes at battle start
    initializeNecromancyStacks() {
        let necromancyInitialized = false;
        
        // Initialize for player heroes
        ['left', 'center', 'right'].forEach(position => {
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero && playerHero.hasAbility('Necromancy')) {
                playerHero.initializeNecromancyStacks();
                const stacks = playerHero.getNecromancyStacks();
                if (stacks > 0) {
                    this.battleManager.addCombatLog(
                        `🧙 ${playerHero.name} gains ${stacks} Necromancy stacks!`, 
                        'success'
                    );
                    necromancyInitialized = true;
                }
            }
            
            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero && opponentHero.hasAbility('Necromancy')) {
                opponentHero.initializeNecromancyStacks();
                const stacks = opponentHero.getNecromancyStacks();
                if (stacks > 0) {
                    this.battleManager.addCombatLog(
                        `🧙 Opponent's ${opponentHero.name} gains ${stacks} Necromancy stacks!`, 
                        'error'
                    );
                    necromancyInitialized = true;
                }
            }
        });
        
        if (necromancyInitialized) {
            this.battleManager.addCombatLog('💀 Necromancy empowers the fallen to rise again!', 'info');
        }
    }

    // Get all heroes on a side that have necromancy stacks
    getHeroesWithNecromancyStacks(side) {
        const heroesWithStacks = [];
        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && hero.hasNecromancyStacks()) {
                heroesWithStacks.push(hero);
            }
        });
        
        return heroesWithStacks;
    }

    // Select a random hero from those with necromancy stacks
    selectRandomNecromancyHero(heroesWithStacks) {
        if (heroesWithStacks.length === 0) return null;
        if (heroesWithStacks.length === 1) return heroesWithStacks[0];
        
        const randomIndex = Math.floor(Math.random() * heroesWithStacks.length);
        return heroesWithStacks[randomIndex];
    }

    // Attempt to revive a creature using necromancy
    attemptNecromancyRevival(creature, heroOwner, creatureIndex, side, position) {
        if (!this.battleManager.isAuthoritative) return false;
        
        // Check if any heroes on this side have necromancy stacks
        const heroesWithStacks = this.getHeroesWithNecromancyStacks(side);
        
        if (heroesWithStacks.length === 0) {
            return false; // No necromancy available
        }
        
        // Select a random hero to use their necromancy
        const necromancyHero = this.selectRandomNecromancyHero(heroesWithStacks);
        
        if (!necromancyHero || !necromancyHero.consumeNecromancyStack()) {
            return false; // Failed to consume stack
        }
        
        // Revive the creature at full HP
        creature.currentHp = creature.maxHp;
        creature.alive = true;
        
        // Add combat log messages
        this.battleManager.addCombatLog(
            `💀✨ ${necromancyHero.name} uses Necromancy to revive ${creature.name}!`,
            side === 'player' ? 'success' : 'error'
        );
        
        this.battleManager.addCombatLog(
            `🧙 ${necromancyHero.name} has ${necromancyHero.getNecromancyStacks()} Necromancy stacks remaining`,
            'info'
        );
        
        // Update visuals
        this.battleManager.updateCreatureVisuals(side, position, heroOwner.creatures);
        this.updateNecromancyStackDisplay(side, necromancyHero.position, necromancyHero.getNecromancyStacks());
        
        // Send update to opponent
        this.battleManager.sendBattleUpdate('necromancy_revival', {
            revivingHeroAbsoluteSide: necromancyHero.absoluteSide,
            revivingHeroPosition: necromancyHero.position,
            remainingStacks: necromancyHero.getNecromancyStacks(),
            revivedCreature: {
                name: creature.name,
                heroPosition: position,
                creatureIndex: creatureIndex,
                heroAbsoluteSide: heroOwner.absoluteSide
            }
        });
        
        return true;
    }

    // FIXED: Update necromancy stack display for a hero - Target the new indicator next to attack stat
    updateNecromancyStackDisplay(side, position, stacks) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;
        
        const stackIndicator = heroElement.querySelector('.necromancy-stack-indicator');
        const stackCircle = heroElement.querySelector('.necromancy-stack-circle');
        const stackNumber = heroElement.querySelector('.necromancy-stack-number');
        
        if (!stackIndicator || !stackCircle || !stackNumber) {
            console.warn(`Necromancy stack indicator elements not found for ${side} ${position}`);
            return;
        }
        
        if (stacks > 0) {
            // Show and update the indicator
            stackIndicator.style.display = 'flex';
            stackNumber.textContent = stacks;
            
            // Add pulse animation when stacks are consumed
            stackCircle.classList.remove('stack-consumed');
            void stackCircle.offsetWidth; // Force reflow
            stackCircle.classList.add('stack-consumed');
            
            // Add title for tooltip
            const hero = side === 'player' 
                ? this.battleManager.playerHeroes[position]
                : this.battleManager.opponentHeroes[position];
            
            if (hero) {
                stackCircle.title = `${hero.name} has ${stacks} Necromancy stacks remaining`;
            }
            
        } else {
            // Hide the indicator when no stacks remain
            stackIndicator.style.display = 'none';
        }
    }

    // Initialize all necromancy stack displays
    initializeNecromancyStackDisplays() {
        // Ensure CSS is injected
        this.injectNecromancyCSS();
        
        ['left', 'center', 'right'].forEach(position => {
            // Player heroes
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero && playerHero.hasAbility('Necromancy')) {
                this.updateNecromancyStackDisplay('player', position, playerHero.getNecromancyStacks());
            }
            
            // Opponent heroes
            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero && opponentHero.hasAbility('Necromancy')) {
                this.updateNecromancyStackDisplay('opponent', position, opponentHero.getNecromancyStacks());
            }
        });
    }

    // Handle necromancy revival update for guest
    handleGuestNecromancyRevival(data) {
        const { revivingHeroAbsoluteSide, revivingHeroPosition, remainingStacks, revivedCreature } = data;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        
        // Update the necromancy hero's stacks
        const revivingHeroLocalSide = (revivingHeroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const revivingHero = revivingHeroLocalSide === 'player' 
            ? this.battleManager.playerHeroes[revivingHeroPosition]
            : this.battleManager.opponentHeroes[revivingHeroPosition];
        
        if (revivingHero) {
            revivingHero.setNecromancyStacks(remainingStacks);
            this.updateNecromancyStackDisplay(revivingHeroLocalSide, revivingHeroPosition, remainingStacks);
            
            this.battleManager.addCombatLog(
                `💀✨ ${revivingHero.name} uses Necromancy to revive ${revivedCreature.name}!`,
                revivingHeroLocalSide === 'player' ? 'success' : 'error'
            );
            
            this.battleManager.addCombatLog(
                `🧙 ${revivingHero.name} has ${remainingStacks} Necromancy stacks remaining`,
                'info'
            );
        }
        
        // Update the revived creature
        const revivedHeroLocalSide = (revivedCreature.heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const revivedHero = revivedHeroLocalSide === 'player' 
            ? this.battleManager.playerHeroes[revivedCreature.heroPosition]
            : this.battleManager.opponentHeroes[revivedCreature.heroPosition];
        
        if (revivedHero && revivedHero.creatures[revivedCreature.creatureIndex]) {
            const creature = revivedHero.creatures[revivedCreature.creatureIndex];
            creature.currentHp = creature.maxHp;
            creature.alive = true;
            
            this.battleManager.updateCreatureVisuals(revivedHeroLocalSide, revivedCreature.heroPosition, revivedHero.creatures);
            
            this.battleManager.addCombatLog(`⚡ ${creature.name} rises from the dead!`, 'success');
        }
    }

    // FIXED: Update necromancy display for battle screen - Target the new indicator
    updateNecromancyDisplayForHeroWithCreatures(side, position, hero) {
        if (!hero) return;
        
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;
        
        const stacks = hero.getNecromancyStacks();
        
        // Check if hero has necromancy ability and creatures
        const hasNecromancy = hero.hasAbility('Necromancy');
        const hasCreatures = hero.creatures && hero.creatures.length > 0;
        
        if (hasNecromancy && hasCreatures) {
            // Add/remove has-necromancy-stacks class for CSS targeting
            heroElement.classList.toggle('has-necromancy-stacks', stacks > 0);
            
            // Update the stack display
            this.updateNecromancyStackDisplay(side, position, stacks);
            
        } else {
            // Remove the class if no necromancy or no creatures
            heroElement.classList.remove('has-necromancy-stacks');
            
            // Hide the indicator
            const stackIndicator = heroElement.querySelector('.necromancy-stack-indicator');
            if (stackIndicator) {
                stackIndicator.style.display = 'none';
            }
        }
    }

    // FIXED: Inject necromancy CSS styles - Simplified for new indicator positioning
    injectNecromancyCSS() {
        if (this.styleInjected) return;
        
        const styleId = 'necromancyAbilityStyles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* ============================================
            NECROMANCY STACK INDICATOR STYLES - NEXT TO ATTACK STAT
            ============================================ */
            
            /* Additional styles for the necromancy indicator */
            .necromancy-stack-indicator {
                opacity: 0;
                transform: scale(0.8);
                transition: all 0.3s ease;
            }
            
            /* Show indicator when hero has necromancy stacks */
            .battle-hero-slot.has-necromancy-stacks .necromancy-stack-indicator {
                opacity: 1;
                transform: scale(1);
            }
            
            /* Enhanced glow effect on hover */
            .battle-hero-slot:hover .necromancy-stack-circle {
                box-shadow: 
                    0 3px 10px rgba(0, 0, 0, 0.7),
                    0 0 20px rgba(138, 43, 226, 0.7);
            }
            
            /* Pulse animation when stacks are consumed */
            @keyframes necromancyStackConsumedNew {
                0% {
                    transform: scale(1);
                    box-shadow: 
                        0 2px 6px rgba(0, 0, 0, 0.5),
                        0 0 10px rgba(138, 43, 226, 0.4);
                }
                50% {
                    transform: scale(1.3);
                    box-shadow: 
                        0 4px 16px rgba(0, 0, 0, 0.8),
                        0 0 24px rgba(138, 43, 226, 0.9);
                    background: rgba(138, 43, 226, 0.9);
                    border-color: rgba(138, 43, 226, 1);
                }
                100% {
                    transform: scale(1);
                    box-shadow: 
                        0 2px 6px rgba(0, 0, 0, 0.5),
                        0 0 10px rgba(138, 43, 226, 0.4);
                    background: rgba(0, 0, 0, 0.9);
                    border-color: rgba(255, 255, 255, 0.8);
                }
            }
            
            .necromancy-stack-circle.stack-consumed {
                animation: necromancyStackConsumedNew 0.8s ease-out;
            }
        `;
        
        document.head.appendChild(style);
        this.styleInjected = true;
    }

    // Cleanup method
    cleanup() {
        // Remove any remaining stack displays (old system)
        const stackDisplays = document.querySelectorAll('.necromancy-stack-display');
        stackDisplays.forEach(display => display.remove());
        
        // Hide necromancy stack indicators (new system)
        const stackIndicators = document.querySelectorAll('.necromancy-stack-indicator');
        stackIndicators.forEach(indicator => {
            indicator.style.display = 'none';
        });
        
        // Remove necromancy-related classes from hero slots
        const heroSlots = document.querySelectorAll('.battle-hero-slot.has-creatures, .battle-hero-slot.has-necromancy-stacks');
        heroSlots.forEach(slot => {
            slot.classList.remove('has-creatures', 'has-necromancy-stacks');
        });
    }
}

// Export static utility functions for use without manager instance
export const NecromancyUtils = {
    // Check if a hero should show necromancy display
    shouldShowNecromancyDisplay(hero) {
        return hero && hero.hasAbility && hero.hasAbility('Necromancy') && 
               hero.creatures && hero.creatures.length > 0;
    },

    // Get necromancy data for persistence
    extractNecromancyDataFromHero(hero) {
        if (!hero) return null;
        
        return {
            necromancyStacks: hero.necromancyStacks || 0,
            maxNecromancyStacks: hero.maxNecromancyStacks || 0,
            hasNecromancy: hero.hasAbility && hero.hasAbility('Necromancy')
        };
    },

    // Extract necromancy data for hash generation
    extractNecromancyData(state) {
        const necromancyData = {};
        
        // Extract necromancy stacks from both sides
        ['hostHeroes', 'guestHeroes'].forEach(side => {
            if (state[side]) {
                necromancyData[side] = {};
                ['left', 'center', 'right'].forEach(position => {
                    if (state[side][position]) {
                        necromancyData[side][position] = {
                            necromancyStacks: state[side][position].necromancyStacks || 0,
                            maxNecromancyStacks: state[side][position].maxNecromancyStacks || 0
                        };
                    }
                });
            }
        });
        
        return necromancyData;
    }
};

// Default export
export default NecromancyManager;