// overflowingChalice.js - Overflowing Chalice Potion Effect
// Makes random ally heroes take additional actions with guaranteed spell casting

export class OverflowingChalicePotion {
    constructor() {
        this.name = 'OverflowingChalice';
    }

    /**
     * Handle Overflowing Chalice potion effects for a specific player
     * @param {Array} effects - Array of Overflowing Chalice effect objects
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - The battle manager instance
     * @returns {number} Number of effects processed
     */
    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0) {
            return 0;
        }
        
        console.log(`🏆 Processing ${effects.length} Overflowing Chalice effects for ${playerRole}`);
        
        let totalActions = 0;
        const effectCount = effects.length;
        
        // Get the heroes that can be empowered (based on player role)
        const allyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);
        
        const aliveAllyHeroes = allyHeroes.filter(hero => hero && hero.alive);
        
        if (aliveAllyHeroes.length === 0) {
            console.log(`🏆 No alive heroes for ${playerRole} to be empowered by OverflowingChalice`);
            const chaliceText = effectCount === 1 ? 'Overflowing Chalice' : 'Overflowing Chalices';
            battleManager.addCombatLog(`🏆 ${playerRole === 'host' ? 'Your' : 'Opponent\'s'} ${chaliceText} found no heroes to empower!`, 'warning');
            return effectCount; // Still count as processed
        }
        
        // Add initial effect message
        const chaliceText = effectCount === 1 ? 'Overflowing Chalice' : `${effectCount} Overflowing Chalices`;
        battleManager.addCombatLog(
            `🏆 ${chaliceText} overflow with mystical energy, empowering heroes with arcane power!`, 
            'info'
        );
        
        // For each copy of OverflowingChalice, select a random hero and give them an empowered action
        for (let chaliceIndex = 0; chaliceIndex < effectCount; chaliceIndex++) {
            // Select a random alive hero (can be the same hero multiple times)
            const randomHero = battleManager.getRandomChoice(aliveAllyHeroes);
            
            if (effectCount > 1) {
                battleManager.addCombatLog(
                    `🏆 Overflowing Chalice ${chaliceIndex + 1} of ${effectCount} empowers ${randomHero.name}!`, 
                    'info'
                );
            }
            
            // Check if hero is still alive (might have died from previous actions or effects)
            if (!randomHero.alive) {
                battleManager.addCombatLog(`🏆 ${randomHero.name} has fallen and cannot be empowered!`, 'warning');
                continue;
            }
            
            await this.performOverflowingChaliceAction(randomHero, playerRole, battleManager);
            totalActions++;
            
            // Small delay between individual actions for visual clarity
            await battleManager.delay(400);
            
            // Check if battle ended early due to the actions
            if (battleManager.checkBattleEnd()) {
                console.log('🏆 Battle ended during OverflowingChalice actions');
                battleManager.addCombatLog('🏆 The mystical chalices ended the battle with their overwhelming power!', 'info');
                return effectCount;
            }
        }
        
        console.log(`🏆 Overflowing Chalice completed: ${totalActions} total empowered actions from ${effectCount} chalices`);
        battleManager.addCombatLog(
            `🏆 Arcane empowerment complete! ${totalActions} heroes channeled mystical energy!`, 
            'success'
        );
        
        return effectCount;
    }

    /**
     * Handle Overflowing Chalice effects from BOTH players simultaneously
     * @param {Array} hostEffects - Host's Overflowing Chalice effects
     * @param {Array} guestEffects - Guest's Overflowing Chalice effects
     * @param {Object} battleManager - The battle manager instance
     * @returns {number} Total number of effects processed
     */
    async handleSimultaneousEffects(hostEffects, guestEffects, battleManager) {
        const hostCount = hostEffects ? hostEffects.length : 0;
        const guestCount = guestEffects ? guestEffects.length : 0;
        const totalChalices = hostCount + guestCount;
        
        if (totalChalices === 0) {
            return 0;
        }
        
        console.log(`🏆 Processing ${hostCount} host + ${guestCount} guest Overflowing Chalice effects simultaneously`);
        
        // Calculate max iterations needed (some players might have more chalices)
        const maxChalices = Math.max(hostCount, guestCount);
        
        // Add initial effect message
        const chaliceText = totalChalices === 1 ? 'Overflowing Chalice' : `${totalChalices} Overflowing Chalices`;
        battleManager.addCombatLog(
            `🏆 ${chaliceText} overflow across the battlefield, empowering heroes with mystical energy!`, 
            'info'
        );
        
        let totalActions = 0;
        
        // Process each "wave" of chalices simultaneously
        for (let chaliceWave = 0; chaliceWave < maxChalices; chaliceWave++) {
            const hasHostChalice = chaliceWave < hostCount;
            const hasGuestChalice = chaliceWave < guestCount;
            
            if (!hasHostChalice && !hasGuestChalice) break;
            
            if (maxChalices > 1) {
                const waveChalices = (hasHostChalice ? 1 : 0) + (hasGuestChalice ? 1 : 0);
                battleManager.addCombatLog(
                    `🏆 Mystical Chalice wave ${chaliceWave + 1} activates (${waveChalices} chalice${waveChalices > 1 ? 's' : ''}!)`, 
                    'info'
                );
            }
            
            // Collect all actions for this wave
            const allActions = [];
            
            // Add host actions if they have a chalice this wave
            if (hasHostChalice) {
                const hostAction = await this.prepareActionForPlayer('host', battleManager);
                if (hostAction) allActions.push(hostAction);
            }
            
            // Add guest actions if they have a chalice this wave
            if (hasGuestChalice) {
                const guestAction = await this.prepareActionForPlayer('guest', battleManager);
                if (guestAction) allActions.push(guestAction);
            }
            
            if (allActions.length === 0) {
                battleManager.addCombatLog('🏆 No heroes available to be empowered by the mystical chalices!', 'warning');
                continue;
            }
            
            // Execute all actions simultaneously
            const waveActions = await this.executeSimultaneousActions(allActions, battleManager);
            totalActions += waveActions;
            
            // Delay between waves if there are multiple
            if (chaliceWave < maxChalices - 1) {
                await battleManager.delay(800);
            }
            
            // Check if battle ended early due to the actions
            if (battleManager.checkBattleEnd()) {
                console.log('🏆 Battle ended during Overflowing Chalice actions');
                battleManager.addCombatLog('🏆 The mystical chalices ended the battle with their overwhelming power!', 'info');
                return totalChalices;
            }
        }
        
        console.log(`🏆 Overflowing Chalice completed: ${totalActions} total simultaneous actions from ${totalChalices} chalices`);
        battleManager.addCombatLog(
            `🏆 Arcane storm complete! ${totalActions} heroes channeled mystical energy simultaneously!`, 
            'success'
        );
        
        return totalChalices;
    }

    /**
     * Prepare action for a random hero from a player without executing it
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - The battle manager instance
     * @returns {Object|null} Action data or null if no valid hero
     */
    async prepareActionForPlayer(playerRole, battleManager) {
        // Get the heroes that can be empowered
        const allyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);
        
        const aliveAllyHeroes = allyHeroes.filter(hero => hero && hero.alive);
        
        if (aliveAllyHeroes.length === 0) {
            return null;
        }
        
        // Select a random alive hero
        const randomHero = battleManager.getRandomChoice(aliveAllyHeroes);
        
        return {
            hero: randomHero,
            playerRole: playerRole
        };
    }

    /**
     * Execute all actions simultaneously
     * @param {Array} allActions - Array of action data objects
     * @param {Object} battleManager - The battle manager instance
     * @returns {number} Number of actions executed
     */
    async executeSimultaneousActions(allActions, battleManager) {
        if (allActions.length === 0) return 0;
        
        console.log(`🏆 Executing ${allActions.length} simultaneous Overflowing Chalice actions`);
        
        // Log all empowerments first
        allActions.forEach(action => {
            battleManager.addCombatLog(
                `🏆 ${action.hero.name} is empowered by mystical chalice energy!`,
                action.playerRole === 'host' ? 'success' : 'info'
            );
        });
        
        // Execute all actions simultaneously using the existing additional action system
        const actionPromises = allActions.map(action => 
            this.executeEmpoweredAction(action.hero, action.playerRole, battleManager)
        );
        
        // Wait for all actions to complete
        await Promise.all(actionPromises);
        
        // Small pause for visual effect
        await battleManager.delay(300);
        
        return allActions.length;
    }

    /**
     * Perform a single Overflowing Chalice empowered action for a hero
     * @param {Object} hero - The empowered hero
     * @param {string} playerRole - 'host' or 'guest' 
     * @param {Object} battleManager - The battle manager instance
     */
    async performOverflowingChaliceAction(hero, playerRole, battleManager) {
        battleManager.addCombatLog(
            `🏆 ${hero.name} is empowered by mystical chalice energy!`,
            playerRole === 'host' ? 'success' : 'info'
        );
        
        await this.executeEmpoweredAction(hero, playerRole, battleManager);
    }

    /**
     * Execute an empowered action for a hero with guaranteed spell casting
     * @param {Object} hero - The hero to empower
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - The battle manager instance
     */
    async executeEmpoweredAction(hero, playerRole, battleManager) {
        // Check for spell casting with guaranteed success
        let spellToCast = null;
        
        if (battleManager.spellSystem) {
            // Get the highest-level spell directly (bypass random chance)
            spellToCast = this.getHighestLevelSpell(hero);
            
            if (spellToCast) {
                // Execute spell casting
                await battleManager.spellSystem.executeSpellCasting(hero, spellToCast);
                return; // Hero spent turn casting spell
            }
        }
        
        // If no spells available, perform a normal attack using existing additional action logic
        // Use the combat manager's executeAdditionalAction method which handles all the complexity
        if (battleManager.combatManager) {
            await battleManager.combatManager.executeAdditionalAction(hero, hero.position);
        } else {
            // Fallback: just log that hero tried to act
            battleManager.addCombatLog(
                `🏆 ${hero.name} channels mystical energy but finds no way to use it!`,
                'warning'
            );
        }
    }

    /**
     * Get the highest-level spell for a hero (guaranteed spell selection)
     * @param {Object} hero - The hero to check spells for
     * @returns {Object|null} The highest-level spell or null if no spells
     */
    getHighestLevelSpell(hero) {
        if (!hero || !hero.alive) return null;
        
        // Get all enabled spells this hero has
        const allSpells = hero.getAllSpells(true); // enabledOnly = true
        if (!allSpells || allSpells.length === 0) {
            return null;
        }

        // Filter out Trap spells and Fighting spells (same as normal spell casting)
        const castableSpells = allSpells.filter(spell => {
            const subtype = spell.subtype;
            return subtype !== 'Trap' && spell.spellSchool != "Fighting";
        });

        if (castableSpells.length === 0) {
            return null;
        }

        // Check if spells can be cast (use existing spell system logic)
        const availableSpells = castableSpells.filter(spell => {
            if (battleManager.spellSystem && battleManager.spellSystem.spellImplementations.has(spell.name)) {
                const spellImpl = battleManager.spellSystem.spellImplementations.get(spell.name);
                
                if (spellImpl.canCast && typeof spellImpl.canCast === 'function') {
                    const canCast = spellImpl.canCast(hero);
                    if (!canCast) {
                        return false;
                    }
                }
            }
            
            return true;
        });

        if (availableSpells.length === 0) {
            return null;
        }

        // Find the highest level spell
        let highestLevel = -1;
        let highestLevelSpells = [];
        
        availableSpells.forEach(spell => {
            const level = spell.level || 0;
            if (level > highestLevel) {
                highestLevel = level;
                highestLevelSpells = [spell];
            } else if (level === highestLevel) {
                highestLevelSpells.push(spell);
            }
        });
        
        // If multiple spells at the highest level, pick randomly (using battle manager's deterministic randomness)
        if (highestLevelSpells.length > 1) {
            return battleManager.getRandomChoice(highestLevelSpells);
        }
        
        return highestLevelSpells[0];
    }

    /**
     * Static method to check if a card is Overflowing Chalice
     * @param {string} cardName - Name of the card to check
     * @returns {boolean} True if the card is Overflowing Chalice
     */
    static isOverflowingChalice(cardName) {
        return cardName === 'OverflowingChalice';
    }

    /**
     * Get display name for the potion
     * @returns {string} Formatted display name
     */
    getDisplayName() {
        return 'Overflowing Chalice';
    }

    /**
     * Get potion description
     * @returns {string} Description of the potion's effect
     */
    getDescription() {
        return 'At the start of battle, for each copy of this potion, a random ally hero is empowered and guaranteed to cast their highest-level spell.';
    }
}