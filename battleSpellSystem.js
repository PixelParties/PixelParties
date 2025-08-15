// battleSpellSystem.js - Battle Spell Casting System Module

import FlameAvalancheSpell from './Spells/flameAvalanche.js';
import FireballSpell from './Spells/fireball.js';
import FireshieldSpell from './Spells/fireshield.js';
import VenomInfusionSpell from './Spells/venomInfusion.js';
import PoisonedWellSpell from './Spells/poisonedWell.js';
import ToxicFumesSpell from './Spells/toxicFumes.js';
import PoisonPollenSpell from './Spells/poisonPollen.js';
import ToxicTrapSpell from './Spells/toxicTrap.js';
import IceboltSpell from './Spells/icebolt.js'; 
import FrostRuneSpell from './Spells/frostRune.js';
import IcyGraveSpell from './Spells/icyGrave.js';
import HeavyHitSpell from './Spells/heavyHit.js';
import OverheatSpell from './Spells/overheat.js';  
import RainOfArrowsSpell from './Spells/rainOfArrows.js';
import IceAgeSpell from './Spells/iceage.js';
import ChallengeSpell from './Spells/challenge.js';
import MountainTearRiverSpell from './Spells/mountainTearRiver.js';
import VampireOnFireSpell from './Spells/vampireOnFire.js';



export class BattleSpellSystem {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        // Statistics for debugging
        this.spellsCastThisBattle = 0;
        this.spellCastHistory = [];
        
        // Spell implementations registry
        this.spellImplementations = new Map();
        this.initializeSpellImplementations();
        
        console.log('🔮 BattleSpellSystem initialized with spell implementations');
    }

    initializeSpellImplementations() {
        // Register FlameAvalanche
        const flameAvalanche = new FlameAvalancheSpell(this.battleManager);
        this.spellImplementations.set('FlameAvalanche', flameAvalanche);

        // Register Fireball
        const fireball = new FireballSpell(this.battleManager);
        this.spellImplementations.set('Fireball', fireball);
        
        // Register Fireshield
        const fireshield = new FireshieldSpell(this.battleManager);
        this.spellImplementations.set('Fireshield', fireshield);

        // Register VenomInfusion
        const venomInfusion = new VenomInfusionSpell(this.battleManager);
        this.spellImplementations.set('VenomInfusion', venomInfusion);

        // Register PoisonedWell
        const poisonedWell = new PoisonedWellSpell(this.battleManager);
        this.spellImplementations.set('PoisonedWell', poisonedWell);

        // Register ToxicFumes
        const toxicFumes = new ToxicFumesSpell(this.battleManager);
        this.spellImplementations.set('ToxicFumes', toxicFumes);

        // Register PoisonPollen
        const poisonPollen = new PoisonPollenSpell(this.battleManager);
        this.spellImplementations.set('PoisonPollen', poisonPollen);
        
        // Register ToxicTrap
        const toxicTrap = new ToxicTrapSpell(this.battleManager);
        this.spellImplementations.set('ToxicTrap', toxicTrap);
        
        // Register Icebolt
        const icebolt = new IceboltSpell(this.battleManager);
        this.spellImplementations.set('Icebolt', icebolt);

        // Register FrostRune
        const frostRune = new FrostRuneSpell(this.battleManager);
        this.spellImplementations.set('FrostRune', frostRune);

        // Register Icy Grave
        const icyGrave = new IcyGraveSpell(this.battleManager);
        this.spellImplementations.set('IcyGrave', icyGrave);

        
        // Register HeavyHit (Fighting spell)
        const heavyHit = new HeavyHitSpell(this.battleManager);
        this.spellImplementations.set('HeavyHit', heavyHit);

        // Register Challenge (Fighting spell)
        const challenge = new ChallengeSpell(this.battleManager);
        this.spellImplementations.set('Challenge', challenge);

        // Register Overheat
        const overheat = new OverheatSpell(this.battleManager);
        this.spellImplementations.set('Overheat', overheat);
                
        // Register RainOfArrows (Fighting spell)
        const rainOfArrows = new RainOfArrowsSpell(this.battleManager);
        this.spellImplementations.set('RainOfArrows', rainOfArrows);

        // Register Ice Age
        const iceAge = new IceAgeSpell(this.battleManager);
        this.spellImplementations.set('Iceage', iceAge);

        // Register MountainTearRiver
        const mountainTearRiver = new MountainTearRiverSpell(this.battleManager);
        this.spellImplementations.set('MountainTearRiver', mountainTearRiver);

        // Register VampireOnFire
        const vampireOnFire = new VampireOnFireSpell(this.battleManager);
        this.spellImplementations.set('VampireOnFire', vampireOnFire);
        
        console.log(`🔮 Registered ${this.spellImplementations.size} spell implementations`);
    }

    // ============================================
    // CORE SPELL CASTING LOGIC
    // ============================================

    // Check if hero should cast a spell instead of attacking
    checkSpellCasting(hero) {
        if (!this.battleManager.isAuthoritative || !hero || !hero.alive) {
            return null;
        }
        
        if (this.battleManager.statusEffectsManager && 
            !this.battleManager.statusEffectsManager.canCastSpells(hero)) {
            console.log(`🔇 ${hero.name} is silenced and cannot cast spells!`);
            return null;
        }
        
        // Get all spells this hero has (including duplicates)
        const allSpells = hero.getAllSpells();
        if (!allSpells || allSpells.length === 0) {
            return null; // No spells to cast
        }

        // Filter out Trap spells (not usable during combat)
        const castableSpells = allSpells.filter(spell => {
            const subtype = spell.subtype;
            return subtype !== 'Trap' && spell.spellSchool != "Fighting";
        });

        if (castableSpells.length === 0) {
            console.log(`🔮 ${hero.name} has ${allSpells.length} spells, but none are castable in combat (all Equip/Trap)`);
            return null; // No castable spells
        }

        // Filter out spells that can't be cast due to conditions
        const availableSpells = castableSpells.filter(spell => {
            // Check if we have a specific implementation for this spell
            if (this.spellImplementations.has(spell.name)) {
                const spellImpl = this.spellImplementations.get(spell.name);
                
                // If the spell implementation has a canCast method, use it
                if (spellImpl.canCast && typeof spellImpl.canCast === 'function') {
                    const canCast = spellImpl.canCast(hero);
                    if (!canCast) {
                        console.log(`🚫 ${hero.name} cannot cast ${spell.name} - conditions not met`);
                        return false;
                    }
                }
            }
            
            return true; // Spell is available to cast
        });

        if (availableSpells.length === 0) {
            console.log(`🔮 ${hero.name} has ${castableSpells.length} castable spells, but none can be used right now (conditions not met)`);
            return null; // No spells can be cast right now
        }

        console.log(`🔮 ${hero.name} has ${availableSpells.length}/${castableSpells.length} available spells, checking for casting...`);

        // Sort spells by level (higher level first)
        const sortedSpells = this.sortSpellsByLevel(availableSpells);
        
        // Process each spell in order
        for (let i = 0; i < sortedSpells.length; i++) {
            const spell = sortedSpells[i];
            
            // Calculate casting chance for this spell
            const castingChance = this.calculateSpellCastingChance(hero, spell);
            
            // Roll for spell casting using battleManager's deterministic randomness
            const roll = this.battleManager.getRandom();
            
            console.log(`🎲 ${hero.name} rolling for ${spell.name}: ${roll.toFixed(3)} vs ${castingChance.toFixed(3)}`);
            
            if (roll <= castingChance) {
                // Hero casts this spell!
                console.log(`✨ ${hero.name} will cast ${spell.name}!`);
                return spell;
            }
        }
        
        // No spell was cast
        console.log(`⚔️ ${hero.name} will attack normally (no spells cast)`);
        return null;
    }

    // Sort spells by level (higher first), shuffle same-level spells
    sortSpellsByLevel(spells) {
        // Group spells by level
        const spellsByLevel = {};
        
        spells.forEach(spell => {
            const level = spell.level || 0; // Default to level 0 if not specified
            if (!spellsByLevel[level]) {
                spellsByLevel[level] = [];
            }
            spellsByLevel[level].push(spell);
        });
        
        // Get levels in descending order
        const levels = Object.keys(spellsByLevel)
            .map(level => parseInt(level))
            .sort((a, b) => b - a); // Descending order
        
        // Build final sorted list
        const sortedSpells = [];
        
        levels.forEach(level => {
            const spellsAtLevel = spellsByLevel[level];
            
            // Shuffle spells of the same level using battleManager's deterministic randomness
            const shuffledSpells = this.battleManager.shuffleArray([...spellsAtLevel]);
            
            // Add to final list
            sortedSpells.push(...shuffledSpells);
            
            console.log(`📊 Level ${level}: ${shuffledSpells.map(s => s.name).join(', ')}`);
        });
        
        return sortedSpells;
    }

    // Calculate spell casting chance for a hero and spell
    calculateSpellCastingChance(hero, spell) {
        // Start with base chance of 0.9
        let chance = 0.9;
        
        // Check if hero has ability matching spell's spellSchool
        const spellSchool = spell.spellSchool;
        if (spellSchool && hero.hasAbility(spellSchool)) {
            const abilityLevel = hero.getAbilityStackCount(spellSchool);
            
            // Multiply chance by 0.9 for each ability level
            // Level 1: 0.9 * 0.9 = 0.81
            // Level 2: 0.9 * 0.9 * 0.9 = 0.729
            // Level 3: 0.9 * 0.9 * 0.9 * 0.9 = 0.6561
            for (let i = 0; i < abilityLevel; i++) {
                chance *= 0.9;
            }
            
            console.log(`🎯 ${hero.name} has ${spellSchool} level ${abilityLevel}, reduced chance to ${chance.toFixed(4)}`);
        }
        
        // Invert the chance (0.9 becomes 0.1, 0.81 becomes 0.19, etc.)
        const finalChance = 1 - chance;
        
        console.log(`🔄 Final casting chance for ${spell.name}: ${finalChance.toFixed(4)} (${(finalChance * 100).toFixed(2)}%)`);
        
        return finalChance;
    }

    // ============================================
    // SPELL EXECUTION
    // ============================================

    // Execute spell casting (for now just adds to battle log)
    executeSpellCasting(hero, spell) {
        const heroSide = hero.side;
        const logType = heroSide === 'player' ? 'success' : 'error';
        
        // Format spell name with spaces (camelCase -> Spaced Words)
        const formattedSpellName = this.formatSpellName(spell.name);

        // Add to battle log
        this.battleManager.addCombatLog(
            `✨ ${hero.name} casts ${formattedSpellName}!`,
            logType
        );
        
        // Track statistics
        this.spellsCastThisBattle++;
        this.spellCastHistory.push({
            hero: hero.name,
            heroPosition: hero.position,
            heroSide: hero.absoluteSide,
            spell: spell.name,
            spellLevel: spell.level || 0,
            spellSchool: spell.spellSchool || 'None',
            turn: this.battleManager.currentTurn,
            timestamp: Date.now()
        });
        
        // Send spell casting update to guest
        this.battleManager.sendBattleUpdate('spell_cast', {
            heroAbsoluteSide: hero.absoluteSide,
            heroPosition: hero.position,
            heroName: hero.name,
            spellName: spell.name,
            spellLevel: spell.level || 0,
            spellSchool: spell.spellSchool || 'None',
            timestamp: Date.now()
        });
        
        // Add actual spell effects here in the future
        this.executeSpellEffects(hero, spell);
    }

    // Placeholder for future spell effects implementation
    async executeSpellEffects(hero, spell) {
        const spellName = spell.name;
        
        // Check if we have a specific implementation for this spell
        if (this.spellImplementations.has(spellName)) {
            const spellImpl = this.spellImplementations.get(spellName);
            
            console.log(`🪄 Executing ${spellName} with dedicated implementation`);
            
            try {
                // Execute the spell with its specific implementation
                await spellImpl.executeSpell(hero, spell);
            } catch (error) {
                console.error(`Error executing ${spellName}:`, error);
                // Fallback to generic spell behavior
                this.executeGenericSpellEffect(hero, spell);
            }
        } else {
            // No specific implementation - use generic behavior
            console.log(`🪄 ${spellName} using generic spell behavior (no implementation yet)`);
            this.executeGenericSpellEffect(hero, spell);
        }
    }

    executeGenericSpellEffect(hero, spell) {
        // Generic spell behavior - just consume the turn for now
        console.log(`⭐ ${hero.name} casts ${spell.name} (generic effect)`);
        
        // Could add basic visual effect here
        const heroElement = this.battleManager.getHeroElement(hero.side, hero.position);
        if (heroElement) {
            const genericEffect = document.createElement('div');
            genericEffect.innerHTML = '✨';
            genericEffect.style.cssText = `
                position: absolute;
                top: 30%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 36px;
                z-index: 100;
                pointer-events: none;
                animation: genericSpellEffect 500ms ease-out forwards;
            `;
            
            heroElement.appendChild(genericEffect);
            setTimeout(() => genericEffect.remove(), 500);
        }
        
        // Ensure generic spell CSS exists
        this.ensureGenericSpellCSS();
    }

    ensureGenericSpellCSS() {
        if (document.getElementById('genericSpellCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'genericSpellCSS';
        style.textContent = `
            @keyframes genericSpellEffect {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Check for Fighting spell triggers after an attack and apply their effects
     * @param {Object} attacker - The attacking hero
     * @param {Object} target - The target of the attack (hero or creature)
     * @param {number} damage - The damage dealt by the attack
     */
    async checkAndApplyFightingSpellTriggers(attacker, target, damage) {
        if (!this.battleManager.isAuthoritative || !attacker || !attacker.alive) {
            return;
        }
        
        // Check if attacker is silenced
        if (this.battleManager.statusEffectsManager && 
            !this.battleManager.statusEffectsManager.canCastSpells(attacker)) {
            return;
        }
        
        // Get all Fighting spells this hero has
        const allSpells = attacker.getAllSpells();
        if (!allSpells || allSpells.length === 0) {
            return;
        }
        
        // Filter for Fighting spells only
        const fightingSpells = allSpells.filter(spell => spell.spellSchool === 'Fighting');
        if (fightingSpells.length === 0) {
            return;
        }
        
        console.log(`⚔️ ${attacker.name} checking ${fightingSpells.length} Fighting spells for triggers...`);
        
        // Check each Fighting spell for triggers and execute immediately
        for (const spell of fightingSpells) {
            // Calculate trigger chance using existing logic
            const triggerChance = this.calculateSpellCastingChance(attacker, spell);
            
            // Roll for trigger
            const roll = this.battleManager.getRandom();
            
            if (roll <= triggerChance) {
                console.log(`✨ ${attacker.name}'s ${spell.name} triggered!`);
                
                // Find the spell implementation and execute its effect
                const spellImpl = this.spellImplementations.get(spell.name);
                if (spellImpl && spellImpl.executeEffect) {
                    try {
                        await spellImpl.executeEffect(attacker, target, damage);
                    } catch (error) {
                        console.error(`Error executing Fighting spell ${spell.name}:`, error);
                    }
                } else {
                    console.warn(`⚠️ No implementation found for Fighting spell: ${spell.name}`);
                }
                
                // Track statistics
                this.spellsCastThisBattle++;
                this.spellCastHistory.push({
                    hero: attacker.name,
                    heroPosition: attacker.position,
                    heroSide: attacker.absoluteSide,
                    spell: spell.name,
                    spellLevel: spell.level || 0,
                    spellSchool: 'Fighting',
                    turn: this.battleManager.currentTurn,
                    timestamp: Date.now(),
                    isFightingSpell: true
                });
            }
        }
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell casting on guest side
    handleGuestSpellCast(data) {
        const { heroAbsoluteSide, heroPosition, heroName, spellName, spellLevel, spellSchool } = data;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = heroLocalSide === 'player' ? 'success' : 'error';
        
        // Format spell name with spaces (camelCase -> Spaced Words)
        const formattedSpellName = this.formatSpellName(spellName);
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `✨ ${heroName} casts ${formattedSpellName}!`,
            logType
        );
        
        // Track statistics on guest side too
        this.spellsCastThisBattle++;
        this.spellCastHistory.push({
            hero: heroName,
            heroPosition: heroPosition,
            heroSide: heroAbsoluteSide,
            spell: spellName,
            spellLevel: spellLevel,
            spellSchool: spellSchool,
            turn: this.battleManager.currentTurn,
            timestamp: Date.now(),
            isGuestSide: true
        });
        
        console.log(`🪄 GUEST: ${heroName} cast ${spellName} (Level ${spellLevel}, ${spellSchool})`);
    }

    handleGuestSpellEffect(data) {
        const { spellName } = data;
        
        // Check if we have a specific implementation for this spell effect
        if (this.spellImplementations.has(spellName)) {
            const spellImpl = this.spellImplementations.get(spellName);
            
            console.log(`🪄 GUEST: Handling ${spellName} effect with dedicated implementation`);
            
            try {
                // Let the spell implementation handle the guest-side effect
                if (spellImpl.handleGuestSpellEffect) {
                    spellImpl.handleGuestSpellEffect(data);
                } else {
                    console.log(`🪄 GUEST: ${spellName} has no guest-side effect handler`);
                }
            } catch (error) {
                console.error(`GUEST: Error handling ${spellName} effect:`, error);
            }
        } else {
            console.log(`🪄 GUEST: ${spellName} has no specific implementation`);
            // Could add generic guest-side effect here
        }
    }

    // ============================================
    // STATISTICS AND DEBUGGING
    // ============================================

    // Get battle spell statistics
    getSpellStatistics() {
        const stats = {
            totalSpellsCast: this.spellsCastThisBattle,
            spellHistory: [...this.spellCastHistory],
            spellsByHero: {},
            spellsBySchool: {},
            spellsByLevel: {},
            spellsByName: {}
        };
        
        // Analyze spell history
        this.spellCastHistory.forEach(entry => {
            // By hero
            if (!stats.spellsByHero[entry.hero]) {
                stats.spellsByHero[entry.hero] = 0;
            }
            stats.spellsByHero[entry.hero]++;
            
            // By school
            if (!stats.spellsBySchool[entry.spellSchool]) {
                stats.spellsBySchool[entry.spellSchool] = 0;
            }
            stats.spellsBySchool[entry.spellSchool]++;
            
            // By level
            if (!stats.spellsByLevel[entry.spellLevel]) {
                stats.spellsByLevel[entry.spellLevel] = 0;
            }
            stats.spellsByLevel[entry.spellLevel]++;
            
            // By name
            if (!stats.spellsByName[entry.spell]) {
                stats.spellsByName[entry.spell] = 0;
            }
            stats.spellsByName[entry.spell]++;
        });
        
        return stats;
    }

    // Test spell casting probabilities (development only)
    testSpellCastingProbabilities(hero, iterations = 1000) {
        if (!this.battleManager.randomnessInitialized) {
            console.warn('Randomness not initialized for testing');
            return null;
        }
        
        const allSpells = hero.getAllSpells();
        if (!allSpells || allSpells.length === 0) {
            console.log(`${hero.name} has no spells to test`);
            return null;
        }
        
        const results = {
            hero: hero.name,
            totalSpells: allSpells.length,
            totalIterations: iterations,
            spellsCast: 0,
            attacksPerformed: 0,
            spellBreakdown: {},
            spellChances: {}
        };
        
        // Calculate theoretical chances for each spell
        const sortedSpells = this.sortSpellsByLevel(allSpells);
        sortedSpells.forEach(spell => {
            const chance = this.calculateSpellCastingChance(hero, spell);
            results.spellChances[spell.name] = {
                chance: chance,
                percentage: (chance * 100).toFixed(2)
            };
        });
        
        // Save current randomness state
        const originalState = this.battleManager.randomness.exportState();
        
        // Run test iterations
        for (let i = 0; i < iterations; i++) {
            const spellToCast = this.checkSpellCasting(hero);
            
            if (spellToCast) {
                results.spellsCast++;
                if (!results.spellBreakdown[spellToCast.name]) {
                    results.spellBreakdown[spellToCast.name] = 0;
                }
                results.spellBreakdown[spellToCast.name]++;
            } else {
                results.attacksPerformed++;
            }
        }
        
        // Restore original randomness state
        this.battleManager.randomness.importState(originalState);
        
        // Calculate percentages
        results.spellCastPercentage = (results.spellsCast / iterations * 100).toFixed(2);
        results.attackPercentage = (results.attacksPerformed / iterations * 100).toFixed(2);
        
        return results;
    }

    // Log current spell system status
    logSystemStatus() {
        console.log('🔮 Battle Spell System Status:');
        console.log(`- Spells cast this battle: ${this.spellsCastThisBattle}`);
        console.log(`- Battle manager connected: ${!!this.battleManager}`);
        console.log(`- Randomness initialized: ${this.battleManager?.randomnessInitialized || false}`);
        
        if (this.spellCastHistory.length > 0) {
            console.log('- Recent spell casts:');
            this.spellCastHistory.slice(-5).forEach(entry => {
                console.log(`  ${entry.hero} cast ${entry.spell} (Turn ${entry.turn})`);
            });
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Reset spell system (called when battle ends or resets)
    reset() {
        this.spellsCastThisBattle = 0;
        this.spellCastHistory = [];
        console.log('🔮 BattleSpellSystem reset');
    }

    // Cleanup (called when battle manager is destroyed)
    cleanup() {
        // Cleanup all spell implementations
        this.spellImplementations.forEach((spellImpl, spellName) => {
            if (spellImpl.cleanup) {
                spellImpl.cleanup();
            }
        });
        this.spellImplementations.clear();
        
        // Remove generic spell CSS
        const genericCSS = document.getElementById('genericSpellCSS');
        if (genericCSS) genericCSS.remove();
        
        this.battleManager = null;
        this.reset();
        console.log('🔮 BattleSpellSystem cleaned up');
    }

    getRegisteredSpells() {
        const spells = [];
        this.spellImplementations.forEach((spellImpl, spellName) => {
            if (spellImpl.getSpellInfo) {
                spells.push(spellImpl.getSpellInfo());
            } else {
                spells.push({
                    name: spellName,
                    displayName: spellName,
                    description: 'No description available',
                    hasImplementation: true
                });
            }
        });
        return spells;
    }

    // Export state for persistence
    exportState() {
        return {
            spellsCastThisBattle: this.spellsCastThisBattle,
            spellCastHistory: [...this.spellCastHistory]
        };
    }

    // Import state from persistence
    importState(state) {
        if (!state) return false;
        
        this.spellsCastThisBattle = state.spellsCastThisBattle || 0;
        this.spellCastHistory = state.spellCastHistory || [];
        
        console.log(`🔮 BattleSpellSystem state restored: ${this.spellsCastThisBattle} spells cast`);
        return true;
    }

    // Convert camelCase spell names to spaced words (ToxicFumes -> Toxic Fumes)
    formatSpellName(spellName) {
        if (!spellName || typeof spellName !== 'string') {
            return spellName;
        }
        
        // Convert camelCase to spaced words
        // This regex finds lowercase letters followed by uppercase letters
        // and inserts a space between them
        return spellName.replace(/([a-z])([A-Z])/g, '$1 $2');
    }
}

// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.BattleSpellSystem = BattleSpellSystem;
}