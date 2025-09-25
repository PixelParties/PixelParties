// magicLamp.js - Magic Lamp Potion Effect
// Makes all ally heroes simultaneously cast random spells at battle start

import { getAllCardNames, getCardInfo } from '../cardDatabase.js';

export class MagicLampPotion {
    constructor() {
        this.name = 'MagicLamp';
        this.validSpells = null; // Cache valid spells
    }

    /**
     * Handle Magic Lamp potion effects for a specific player
     * @param {Array} effects - Array of Magic Lamp effect objects
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - The battle manager instance
     * @returns {number} Number of effects processed
     */
    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0) {
            return 0;
        }
        
        console.log(`🪔 Processing ${effects.length} Magic Lamp effects for ${playerRole}`);
        
        let totalCasts = 0;
        const effectCount = effects.length;
        
        // Get the heroes that can cast spells (based on player role)
        const allyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);
        
        const aliveAllyHeroes = allyHeroes.filter(hero => hero && hero.alive);
        
        if (aliveAllyHeroes.length === 0) {
            console.log(`🪔 No alive heroes for ${playerRole} to be blessed by Magic Lamp`);
            const lampText = effectCount === 1 ? 'Magic Lamp' : 'Magic Lamps';
            battleManager.addCombatLog(`🪔 ${playerRole === 'host' ? 'Your' : 'Opponent\'s'} ${lampText} found no heroes to enchant!`, 'warning');
            return effectCount; // Still count as processed
        }
        
        // Add initial effect message
        const lampText = effectCount === 1 ? 'Magic Lamp' : `${effectCount} Magic Lamps`;
        battleManager.addCombatLog(
            `🪔 ${lampText} illuminate with ancient magic, granting mystical knowledge to all heroes!`, 
            'info'
        );
        
        // For each copy of Magic Lamp, all heroes get random spell knowledge
        for (let lampIndex = 0; lampIndex < effectCount; lampIndex++) {
            if (effectCount > 1) {
                battleManager.addCombatLog(
                    `🪔 Ancient Lamp ${lampIndex + 1} of ${effectCount} bestows its wisdom!`, 
                    'info'
                );
            }
            
            // Assign unique random spells to each hero and execute simultaneously
            const spellCasts = await this.executeSimultaneousSpellCasting(aliveAllyHeroes, playerRole, battleManager);
            totalCasts += spellCasts;
            
            // Small delay between different Magic Lamp copies for dramatic effect
            if (lampIndex < effectCount - 1) {
                await battleManager.delay(800);
            }
            
            // Check if battle ended early due to the spell effects
            if (battleManager.checkBattleEnd()) {
                console.log('🪔 Battle ended during Magic Lamp spell casting');
                battleManager.addCombatLog('🪔 The ancient magic ended the battle with overwhelming power!', 'info');
                return effectCount;
            }
        }
        
        console.log(`🪔 Magic Lamp completed: ${totalCasts} total spell casts from ${effectCount} lamps`);
        battleManager.addCombatLog(
            `🪔 Ancient wisdom unleashed! ${totalCasts} heroes channeled random magical energies!`, 
            'success'
        );
        
        return effectCount;
    }

    /**
     * Handle Magic Lamp effects from BOTH players simultaneously
     * @param {Array} hostEffects - Host's Magic Lamp effects
     * @param {Array} guestEffects - Guest's Magic Lamp effects
     * @param {Object} battleManager - The battle manager instance
     * @returns {number} Total number of effects processed
     */
    async handleSimultaneousEffects(hostEffects, guestEffects, battleManager) {
        const hostCount = hostEffects ? hostEffects.length : 0;
        const guestCount = guestEffects ? guestEffects.length : 0;
        const totalLamps = hostCount + guestCount;
        
        if (totalLamps === 0) {
            return 0;
        }
        
        console.log(`🪔 Processing ${hostCount} host + ${guestCount} guest Magic Lamp effects simultaneously`);
        
        // Calculate max iterations needed (some players might have more lamps)
        const maxLamps = Math.max(hostCount, guestCount);
        
        // Add initial effect message
        const lampText = totalLamps === 1 ? 'Magic Lamp' : `${totalLamps} Magic Lamps`;
        battleManager.addCombatLog(
            `🪔 ${lampText} illuminate across the battlefield, granting mystical knowledge to all heroes!`, 
            'info'
        );
        
        let totalCasts = 0;
        
        // Process each "wave" of lamps simultaneously
        for (let lampWave = 0; lampWave < maxLamps; lampWave++) {
            const hasHostLamp = lampWave < hostCount;
            const hasGuestLamp = lampWave < guestCount;
            
            if (!hasHostLamp && !hasGuestLamp) break;
            
            if (maxLamps > 1) {
                const waveLamps = (hasHostLamp ? 1 : 0) + (hasGuestLamp ? 1 : 0);
                battleManager.addCombatLog(
                    `🪔 Ancient Lamp wave ${lampWave + 1} activates (${waveLamps} lamp${waveLamps > 1 ? 's' : ''}!)`, 
                    'info'
                );
            }
            
            // Collect all spell casts for this wave
            let waveSpellCasts = 0;
            
            // Add host spell casts if they have a lamp this wave
            if (hasHostLamp) {
                const hostHeroes = Object.values(battleManager.playerHeroes).filter(hero => hero && hero.alive);
                if (hostHeroes.length > 0) {
                    const hostCasts = await this.executeSimultaneousSpellCasting(hostHeroes, 'host', battleManager);
                    waveSpellCasts += hostCasts;
                }
            }
            
            // Add guest spell casts if they have a lamp this wave  
            if (hasGuestLamp) {
                const guestHeroes = Object.values(battleManager.opponentHeroes).filter(hero => hero && hero.alive);
                if (guestHeroes.length > 0) {
                    const guestCasts = await this.executeSimultaneousSpellCasting(guestHeroes, 'guest', battleManager);
                    waveSpellCasts += guestCasts;
                }
            }
            
            if (waveSpellCasts === 0) {
                battleManager.addCombatLog('🪔 No heroes available to receive the ancient wisdom!', 'warning');
                continue;
            }
            
            totalCasts += waveSpellCasts;
            
            // Delay between waves if there are multiple
            if (lampWave < maxLamps - 1) {
                await battleManager.delay(800);
            }
            
            // Check if battle ended early due to the spell effects
            if (battleManager.checkBattleEnd()) {
                console.log('🪔 Battle ended during Magic Lamp spell casting');
                battleManager.addCombatLog('🪔 The ancient magic ended the battle with overwhelming power!', 'info');
                return totalLamps;
            }
        }
        
        console.log(`🪔 Magic Lamp completed: ${totalCasts} total simultaneous spell casts from ${totalLamps} lamps`);
        battleManager.addCombatLog(
            `🪔 Ancient wisdom storm complete! ${totalCasts} heroes channeled random magical energies simultaneously!`, 
            'success'
        );
        
        return totalLamps;
    }

    /**
     * Execute simultaneous spell casting for all heroes with random unique spells
     * @param {Array} heroes - Array of heroes to cast spells
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - The battle manager instance
     * @returns {number} Number of spells cast
     */
    async executeSimultaneousSpellCasting(heroes, playerRole, battleManager) {
        if (!heroes || heroes.length === 0) return 0;
        
        // Get all valid spells for Magic Lamp
        const validSpells = this.getValidSpellsFromDatabase();
        if (validSpells.length === 0) {
            console.warn('🪔 No valid spells found for Magic Lamp');
            return 0;
        }
        
        // Assign unique random spells to each hero
        const spellAssignments = this.assignUniqueSpellsToHeroes(heroes, validSpells, battleManager);
        
        if (spellAssignments.length === 0) {
            return 0;
        }
        
        console.log(`🪔 Executing ${spellAssignments.length} simultaneous Magic Lamp spell casts for ${playerRole}`);
        
        // Log all spell assignments first
        spellAssignments.forEach(assignment => {
            const spellName = this.formatSpellName(assignment.spell.name);
            battleManager.addCombatLog(
                `🪔 ${assignment.hero.name} learns the secrets of ${spellName}!`,
                playerRole === 'host' ? 'success' : 'info'
            );
        });
        
        // Execute all spell castings simultaneously
        const spellPromises = spellAssignments.map(assignment => 
            this.executeMagicLampSpellCast(assignment.hero, assignment.spell, battleManager)
        );
        
        // Wait for all spells to complete
        await Promise.all(spellPromises);
        
        // Small pause for visual effect
        await battleManager.delay(300);
        
        return spellAssignments.length;
    }

    /**
     * Get all valid spells from the card database for Magic Lamp
     * @returns {Array} Array of valid spell objects
     */
    getValidSpellsFromDatabase() {
        // Use cached result if available
        if (this.validSpells !== null) {
            return this.validSpells;
        }
        
        // SPECIAL EXCLUSIONS: Spells that cannot be used by Magic Lamp
        const excludedSpells = ['PhoenixTackle', 'VictoryPhoenixCannon'];
        
        const allCardNames = getAllCardNames();
        const validSpells = [];
        
        for (const cardName of allCardNames) {
            const cardInfo = getCardInfo(cardName);
            
            if (!cardInfo) continue;
            
            // Must be a Spell card
            if (cardInfo.cardType !== 'Spell') continue;
            
            // Must have the right spell school
            if (!['DestructionMagic', 'DecayMagic', 'SupportMagic'].includes(cardInfo.spellSchool)) continue;
            
            // Must NOT be Area or Creature subtype
            if (cardInfo.subtype === 'Area' || cardInfo.subtype === 'Creature') continue;
            
            // Must NOT be global
            if (cardInfo.global === true) continue;
            
            // SPECIAL EXCLUSION: Exclude Phoenix spells that cannot be used by Magic Lamp
            if (excludedSpells.includes(cardName)) {
                console.log(`🔥 Magic Lamp cannot grant spell: ${cardName} - excluding from random selection`);
                continue;
            }
            
            // Add to valid spells list
            validSpells.push(cardInfo);
        }
        
        // Cache the result
        this.validSpells = validSpells;
        
        console.log(`🪔 Found ${validSpells.length} valid spells for Magic Lamp (Phoenix spells excluded):`, 
                   validSpells.map(spell => spell.name));
        
        return validSpells;
    }

    /**
     * Assign unique random spells to heroes
     * @param {Array} heroes - Heroes to assign spells to
     * @param {Array} validSpells - Array of valid spells
     * @param {Object} battleManager - Battle manager for randomness
     * @returns {Array} Array of {hero, spell} assignments
     */
    assignUniqueSpellsToHeroes(heroes, validSpells, battleManager) {
        if (!heroes || heroes.length === 0 || !validSpells || validSpells.length === 0) {
            return [];
        }
        
        // Shuffle the valid spells using battle manager's deterministic randomness
        const shuffledSpells = battleManager.shuffleArray([...validSpells]);
        const assignments = [];
        
        // Assign one unique spell to each hero
        for (let i = 0; i < heroes.length && i < shuffledSpells.length; i++) {
            const hero = heroes[i];
            const spell = shuffledSpells[i];
            
            // Verify the hero can potentially cast spells
            if (!hero.alive) continue;
            
            // Check if hero is silenced (can't cast spells)
            if (battleManager.statusEffectsManager && 
                !battleManager.statusEffectsManager.canCastSpells(hero)) {
                continue;
            }
            
            assignments.push({
                hero: hero,
                spell: spell
            });
        }
        
        // If we have more heroes than unique spells, log a warning but continue with what we have
        if (heroes.length > validSpells.length) {
            console.warn(`🪔 Magic Lamp: More heroes (${heroes.length}) than unique valid spells (${validSpells.length}). Some heroes won't receive spells.`);
        }
        
        return assignments;
    }

    /**
     * Execute a Magic Lamp spell cast for a specific hero
     * @param {Object} hero - The hero casting the spell
     * @param {Object} spell - The spell to cast
     * @param {Object} battleManager - The battle manager instance
     */
    async executeMagicLampSpellCast(hero, spell, battleManager) {
        // Use the existing spell system to execute the spell
        await battleManager.spellSystem.executeSpellCasting(hero, spell);
    }

    /**
     * Format spell name for display (convert camelCase to spaced words)
     * @param {string} spellName - The spell name to format
     * @returns {string} Formatted spell name
     */
    formatSpellName(spellName) {
        if (!spellName || typeof spellName !== 'string') {
            return spellName;
        }
        
        // Convert camelCase to spaced words
        return spellName.replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    /**
     * Static method to check if a card is Magic Lamp
     * @param {string} cardName - Name of the card to check
     * @returns {boolean} True if the card is Magic Lamp
     */
    static isMagicLamp(cardName) {
        return cardName === 'MagicLamp';
    }

    /**
     * Get display name for the potion
     * @returns {string} Formatted display name
     */
    getDisplayName() {
        return 'Magic Lamp';
    }

    /**
     * Get potion description
     * @returns {string} Description of the potion's effect
     */
    getDescription() {
        return 'At the start of battle, all your heroes simultaneously cast random spells from DestructionMagic, DecayMagic, or SupportMagic schools.';
    }
}