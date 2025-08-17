// hero.js - Enhanced Hero Class with Pre-calculated Stats from heroSelection + Battle Bonus System

import { getCardInfo } from './cardDatabase.js';

export class Hero {
    constructor(heroData, position, side, absoluteSide) {
        // Basic hero information
        this.id = heroData.id;
        this.name = heroData.name;
        this.image = heroData.image;
        this.filename = heroData.filename;
        
        // Position and side information
        this.position = position;
        this.side = side;
        this.absoluteSide = absoluteSide;
        
        // Load base stats from card database
        const heroInfo = getCardInfo(this.name);
        if (heroInfo && heroInfo.cardType === 'hero') {
            this.baseMaxHp = heroInfo.hp;      // Store original base values
            this.baseAtk = heroInfo.atk;
            this.maxHp = heroInfo.hp;          // Will be overridden by pre-calculated values
            this.currentHp = heroInfo.hp;      // Will be adjusted proportionally when maxHp changes
            this.atk = heroInfo.atk;           // Will be overridden by pre-calculated values
        } else {
            console.error(`Hero info not found for ${this.name}`);
            this.baseMaxHp = 100;
            this.baseAtk = 10;
            this.maxHp = 100;
            this.currentHp = 100;
            this.atk = 10;
        }
        
        // Combat state
        this.alive = true;
        
        // Abilities - structured storage
        this.abilities = {
            zone1: [],
            zone2: [],
            zone3: []
        };
        this.abilityRegistry = new Set();
        
        // Spellbook, creatures, equipment
        this.spellbook = [];
        this.creatures = [];
        this.equipment = [];
        
        // Permanent stat bonuses from LegendarySwordOfABarbarianKing
        this.attackBonusses = 0;  // Permanent attack bonuses
        this.hpBonusses = 0;      // Permanent HP bonuses
        
        // NEW: Battle-duration temporary bonuses (persist until battle ends)
        this.battleAttackBonus = 0;  // Temporary attack bonus for this battle only
        this.battleHpBonus = 0;      // Temporary HP bonus for this battle only
        
        // Necromancy stacks tracking
        this.necromancyStacks = 0;
        this.maxNecromancyStacks = 0;
        
        // Extensible state for future features
        this.statusEffects = [];
        this.temporaryModifiers = {};
        this.combatHistory = [];
        this.customStats = {};
        this.equipmentEffects = [];
        
        // Battle-specific state
        this.lastAction = null;
        this.turnsTaken = 0;
    }

    addPermanentStatBonuses(attackBonus, hpBonus) {
        this.attackBonusses += attackBonus;
        this.hpBonusses += hpBonus;
        console.log(`${this.name}: Added permanent bonuses - ATK +${attackBonus} (total: +${this.attackBonusses}), HP +${hpBonus} (total: +${this.hpBonusses})`);
    }
    
    // NEW: Battle bonus system - these bonuses last for the entire battle
    addBattleAttackBonus(amount) {
        if (amount <= 0) return;
        
        this.battleAttackBonus += amount;
        console.log(`${this.name}: Added battle attack bonus +${amount} (total battle bonus: +${this.battleAttackBonus})`);
        
        // Log new total attack
        const newAttack = this.getCurrentAttack();
        console.log(`${this.name}: New total attack: ${newAttack} (base: ${this.atk}, battle bonus: +${this.battleAttackBonus})`);
    }
    
    addBattleHpBonus(amount) {
        if (amount <= 0) return;
        
        const oldMaxHp = this.maxHp;
        this.battleHpBonus += amount;
        this.maxHp += amount;
        
        // Increase current HP by the same amount (maintains HP ratio)
        this.currentHp += amount;
        
        console.log(`${this.name}: Added battle HP bonus +${amount} (total battle bonus: +${this.battleHpBonus})`);
        console.log(`${this.name}: HP increased from ${oldMaxHp} to ${this.maxHp} (current: ${this.currentHp})`);
    }
    
    // Clear battle bonuses (called when battle ends)
    clearBattleBonuses() {
        if (this.battleAttackBonus > 0 || this.battleHpBonus > 0) {
            console.log(`${this.name}: Clearing battle bonuses (ATK: -${this.battleAttackBonus}, HP: -${this.battleHpBonus})`);
            
            // Remove HP bonus from max and current HP
            if (this.battleHpBonus > 0) {
                this.maxHp -= this.battleHpBonus;
                this.currentHp -= this.battleHpBonus;
                
                // Ensure current HP doesn't go below 0 or above max
                this.currentHp = Math.max(0, Math.min(this.currentHp, this.maxHp));
            }
            
            this.battleAttackBonus = 0;
            this.battleHpBonus = 0;
        }
    }
    
    // Get current attack including battle bonuses
    getCurrentAttack() {
        return this.atk + this.battleAttackBonus;
    }
    
    // Get current max HP including battle bonuses (for display purposes)
    getCurrentMaxHp() {
        return this.maxHp; // maxHp already includes battle bonuses
    }
    
    // Check if hero has any battle bonuses active
    hasBattleBonuses() {
        return this.battleAttackBonus > 0 || this.battleHpBonus > 0;
    }
    
    // Get battle bonus summary for display
    getBattleBonusSummary() {
        const summary = [];
        if (this.battleAttackBonus > 0) {
            summary.push(`+${this.battleAttackBonus} ATK`);
        }
        if (this.battleHpBonus > 0) {
            summary.push(`+${this.battleHpBonus} HP`);
        }
        return summary.length > 0 ? summary.join(', ') : null;
    }
    
    // Set pre-calculated stats directly from heroSelection
    setPrecalculatedStats(effectiveStats) {
        if (!effectiveStats) return;
        
        const oldMaxHp = this.maxHp;
        
        // Set the pre-calculated values directly
        this.maxHp = effectiveStats.maxHp;
        this.atk = effectiveStats.attack;
        
        // Adjust current HP proportionally if max HP changed
        if (oldMaxHp !== this.maxHp && oldMaxHp > 0) {
            const hpRatio = this.currentHp / oldMaxHp;
            this.currentHp = Math.floor(this.maxHp * hpRatio);
            this.currentHp = Math.min(this.currentHp, this.maxHp);
            
            console.log(`${this.name}: Stats updated - HP: ${this.currentHp}/${this.maxHp}, ATK: ${this.atk}`);
        } else if (oldMaxHp === this.maxHp) {
            // If max HP didn't change, keep current HP as is
            this.currentHp = Math.min(this.currentHp, this.maxHp);
        } else {
            // First time setting stats
            this.currentHp = this.maxHp;
        }
    }
    
    // Get ability stack counts (no stat calculation)
    getToughnessStackCount() {
        return this.getAbilityStackCount('Toughness');
    }
    
    getFightingStackCount() {
        return this.getAbilityStackCount('Fighting');
    }
    
    // Set abilities from HeroAbilitiesManager data (no stat calculation)
    setAbilities(abilitiesData) {
        if (!abilitiesData) return;
        
        // Clear existing abilities
        this.abilities = {
            zone1: [],
            zone2: [],
            zone3: []
        };
        this.abilityRegistry.clear();
        
        // Copy abilities from manager data
        for (let zoneNum = 1; zoneNum <= 3; zoneNum++) {
            const zoneKey = `zone${zoneNum}`;
            if (abilitiesData[zoneKey] && Array.isArray(abilitiesData[zoneKey])) {
                this.abilities[zoneKey] = [...abilitiesData[zoneKey]];
                
                // Update registry
                abilitiesData[zoneKey].forEach(ability => {
                    if (ability && ability.name) {
                        this.abilityRegistry.add(ability.name);
                    }
                });
            }
        }
        
        console.log(`${this.name} abilities set (stats calculated in heroSelection)`);
    }
    
    // Initialize necromancy stacks based on ability level
    initializeNecromancyStacks() {
        if (this.hasAbility('Necromancy')) {
            const necromancyLevel = this.getAbilityStackCount('Necromancy');
            this.necromancyStacks = necromancyLevel;
            this.maxNecromancyStacks = necromancyLevel;
            console.log(`${this.name} initialized with ${this.necromancyStacks} Necromancy stacks`);
        } else {
            this.necromancyStacks = 0;
            this.maxNecromancyStacks = 0;
        }
    }
    
    // Get current necromancy stacks
    getNecromancyStacks() {
        return this.necromancyStacks;
    }
    
    // Get maximum necromancy stacks (for display)
    getMaxNecromancyStacks() {
        return this.maxNecromancyStacks;
    }
    
    // Consume a necromancy stack
    consumeNecromancyStack() {
        if (this.necromancyStacks > 0) {
            this.necromancyStacks--;
            console.log(`${this.name} consumed necromancy stack, ${this.necromancyStacks} remaining`);
            return true;
        }
        return false;
    }
    
    // Check if hero has necromancy stacks available
    hasNecromancyStacks() {
        return this.necromancyStacks > 0;
    }
    
    // Set necromancy stacks (for restoration)
    setNecromancyStacks(stacks) {
        this.necromancyStacks = Math.max(0, stacks);
        console.log(`${this.name} necromancy stacks set to ${this.necromancyStacks}`);
    }
    
    setEquipment(equipment) {
        try {
            if (Array.isArray(equipment)) {
                this.equipment = equipment.filter(item => {
                    if (!item || typeof item !== 'object') {
                        console.warn(`âš ï¸ Invalid equipment item for ${this.name}:`, item);
                        return false;
                    }
                    
                    const itemName = item.name || item.cardName;
                    if (!itemName || typeof itemName !== 'string') {
                        console.warn(`âš ï¸ Equipment item missing name for ${this.name}:`, item);
                        return false;
                    }
                    
                    return true;
                }).map(item => ({ ...item }));
                
                console.log(`âœ… Set ${this.equipment.length} valid equipment items for ${this.name}`);
            } else {
                if (equipment !== undefined && equipment !== null) {
                    console.warn(`âš ï¸ Invalid equipment data for ${this.name}, expected array but got:`, typeof equipment);
                }
                this.equipment = [];
            }
        } catch (error) {
            console.error(`âŒ Error setting equipment for ${this.name}:`, error);
            this.equipment = [];
        }
    }

    // Get equipment for this hero (sorted alphabetically)
    getEquipment() {
        if (!Array.isArray(this.equipment)) {
            console.warn(`âš ï¸ Equipment is not an array for ${this.name}, resetting to empty array`);
            this.equipment = [];
        }
        return [...this.equipment].sort((a, b) => {
            const nameA = a.name || a.cardName || '';
            const nameB = b.name || b.cardName || '';
            return nameA.localeCompare(nameB);
        });
    }

    // Check if hero has specific equipment
    hasEquipment(equipmentName) {
        return this.equipment.some(item => 
            item.name === equipmentName || item.cardName === equipmentName
        );
    }

    // Add equipment to hero
    addEquipment(equipmentData) {
        this.equipment.push({...equipmentData, equippedAt: Date.now()});
    }

    // Remove equipment by name
    removeEquipment(equipmentName) {
        const index = this.equipment.findIndex(item => 
            item.name === equipmentName || item.cardName === equipmentName
        );
        if (index > -1) {
            return this.equipment.splice(index, 1)[0];
        }
        return null;
    }

    // Get equipment count
    getEquipmentCount() {
        return this.equipment.length;
    }

    // Counts number of a SPECIFIC Equipment
    countEquipment(equipmentName) {
        if (!this.equipment) return 0;
        return this.equipment.filter(item => 
            item.name === equipmentName || item.cardName === equipmentName
        ).length;
    }

    // Set creatures from HeroCreatureManager data
    setCreatures(creaturesData) {
        if (!creaturesData || !Array.isArray(creaturesData)) return;
        
        this.creatures = [];
        this.creatures = creaturesData.map(creature => ({ ...creature }));
        
        console.log(`${this.name} creatures set with ${this.creatures.length} creatures`);
    }

    // Add a creature
    addCreature(creatureCard) {
        if (!creatureCard || creatureCard.subtype !== 'Creature') {
            console.error('Invalid creature card provided');
            return false;
        }
        
        this.creatures.push({ ...creatureCard });
        console.log(`Added creature ${creatureCard.name} to ${this.name}`);
        return true;
    }

    // Remove a creature by index
    removeCreature(index) {
        if (index < 0 || index >= this.creatures.length) {
            console.error(`Invalid creature index: ${index}`);
            return null;
        }
        
        const removedCreature = this.creatures.splice(index, 1)[0];
        console.log(`Removed creature ${removedCreature.name} from ${this.name}`);
        return removedCreature;
    }

    // Get all creatures
    getAllCreatures() {
        return [...this.creatures];
    }

    // Get creature count
    getCreatureCount() {
        return this.creatures.length;
    }
    
    // Set spellbook from HeroSpellbookManager data
    setSpellbook(spellbookData) {
        if (!spellbookData || !Array.isArray(spellbookData)) return;
        
        this.spellbook = [];
        this.spellbook = spellbookData.map(spell => ({ ...spell }));
        
        console.log(`${this.name} spellbook set with ${this.spellbook.length} spells`);
    }
    
    // Add a spell to the spellbook
    addSpell(spellCard) {
        if (!spellCard || spellCard.cardType !== 'Spell') {
            console.error('Invalid spell card provided');
            return false;
        }
        
        this.spellbook.push({ ...spellCard });
        console.log(`Added spell ${spellCard.name} to ${this.name}'s spellbook`);
        return true;
    }
    
    // Remove a spell from the spellbook by index
    removeSpell(index) {
        if (index < 0 || index >= this.spellbook.length) {
            console.error(`Invalid spell index: ${index}`);
            return null;
        }
        
        const removedSpell = this.spellbook.splice(index, 1)[0];
        console.log(`Removed spell ${removedSpell.name} from ${this.name}'s spellbook`);
        return removedSpell;
    }
    
    // Get spell by name
    getSpell(spellName, enabledOnly = false) {
        if (enabledOnly) {
            return this.spellbook.find(spell => spell.name === spellName && spell.enabled !== false);
        }
        return this.spellbook.find(spell => spell.name === spellName);
    }
    
    // Check if hero has a specific spell
    hasSpell(spellName, enabledOnly = false) {
        if (enabledOnly) {
            return this.spellbook.some(spell => spell.name === spellName && spell.enabled !== false);
        }
        return this.spellbook.some(spell => spell.name === spellName);
    }
    
    // Get all spells
    getAllSpells(enabledOnly = false) {
        if (enabledOnly) {
            return this.spellbook.filter(spell => spell.enabled !== false);
        }
        return [...this.spellbook];
    }
    
    // Get spell count
    getSpellCount(enabledOnly = false) {
        if (enabledOnly) {
            return this.spellbook.filter(spell => spell.enabled !== false).length;
        }
        return this.spellbook.length;
    }
    
    // Get spell count for a specific spell
    getSpecificSpellCount(spellName, enabledOnly = false) {
        if (enabledOnly) {
            return this.spellbook.filter(spell => spell.name === spellName && spell.enabled !== false).length;
        }
        return this.spellbook.filter(spell => spell.name === spellName).length;
    }
    
    // Get ability by name
    getAbility(abilityName) {
        for (const zone in this.abilities) {
            const abilities = this.abilities[zone];
            if (abilities.length > 0 && abilities[0].name === abilityName) {
                return {
                    zone: zone,
                    abilities: abilities,
                    stackCount: abilities.length
                };
            }
        }
        return null;
    }
    
    // Get all abilities as flat array
    getAllAbilities() {
        const allAbilities = [];
        for (const zone in this.abilities) {
            this.abilities[zone].forEach(ability => {
                allAbilities.push({
                    ...ability,
                    zone: zone,
                    stackCount: this.abilities[zone].length
                });
            });
        }
        return allAbilities;
    }
    
    // Check if hero has a specific ability
    hasAbility(abilityName) {
        return this.abilityRegistry.has(abilityName);
    }
    
    // Get ability stack count
    getAbilityStackCount(abilityName) {
        const abilityData = this.getAbility(abilityName);
        return abilityData ? abilityData.stackCount : 0;
    }
    
    // Take damage
    takeDamage(damage) {
        const oldHp = this.currentHp;
        this.currentHp = Math.max(0, this.currentHp - damage);
        this.alive = this.currentHp > 0;
        
        // Add to combat history
        this.combatHistory.push({
            action: 'damage_received',
            amount: damage,
            oldHp: oldHp,
            newHp: this.currentHp,
            timestamp: Date.now()
        });
        
        return {
            oldHp: oldHp,
            newHp: this.currentHp,
            died: !this.alive
        };
    }
    
    // Heal
    heal(amount) {
        const oldHp = this.currentHp;
        this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
        
        // Add to combat history
        this.combatHistory.push({
            action: 'healed',
            amount: amount,
            oldHp: oldHp,
            newHp: this.currentHp,
            timestamp: Date.now()
        });
        
        return {
            oldHp: oldHp,
            newHp: this.currentHp
        };
    }
    
    // Modify attack (temporary only - permanent changes come from heroSelection)
    modifyAttack(modifier, temporary = true) {
        if (temporary) {
            if (!this.temporaryModifiers.atk) {
                this.temporaryModifiers.atk = [];
            }
            this.temporaryModifiers.atk.push(modifier);
        } else {
            console.warn('Permanent attack modifications must be done in heroSelection, not during battle');
        }
    }

    // Get attack bonus (difference between current and original base)
    getAttackBonus() {
        const current = this.getCurrentAttack();
        const bonus = current - this.baseAtk;
        return bonus;
    }
    
    // Clear temporary modifiers (call at end of turn)
    clearTemporaryModifiers() {
        this.temporaryModifiers = {};
    }
    
    // Add status effect
    addStatusEffect(effect) {
        this.statusEffects.push({
            ...effect,
            appliedAt: Date.now()
        });
    }
    
    // Remove status effect
    removeStatusEffect(effectName) {
        this.statusEffects = this.statusEffects.filter(effect => effect.name !== effectName);
    }
    
    // Check if has status effect
    hasStatusEffect(effectName) {
        return this.statusEffects.some(effect => effect.name === effectName);
    }
    
    // Export hero state for persistence
    exportState() {
        return {
            // Basic info
            id: this.id,
            name: this.name,
            image: this.image,
            filename: this.filename,
            
            // Position info
            position: this.position,
            side: this.side,
            absoluteSide: this.absoluteSide,
            
            // Stats (pre-calculated from heroSelection)
            currentHp: this.currentHp,
            maxHp: this.maxHp,
            atk: this.atk,
            baseMaxHp: this.baseMaxHp,
            baseAtk: this.baseAtk,
            alive: this.alive,
            
            // Permanent stat bonuses
            attackBonusses: this.attackBonusses,
            hpBonusses: this.hpBonusses,
            
            // NEW: Battle-duration bonuses
            battleAttackBonus: this.battleAttackBonus,
            battleHpBonus: this.battleHpBonus,
            
            // Abilities
            abilities: this.abilities,
            abilityRegistry: Array.from(this.abilityRegistry),
            
            // Spellbook, creatures, equipment
            spellbook: this.spellbook.map(spell => ({ ...spell })),
            creatures: this.creatures.map(creature => ({ ...creature })),
            equipment: this.equipment.map(item => ({...item})),
            
            // Necromancy stacks
            necromancyStacks: this.necromancyStacks,
            maxNecromancyStacks: this.maxNecromancyStacks,
            
            // Battle state
            statusEffects: this.statusEffects,
            temporaryModifiers: this.temporaryModifiers,
            combatHistory: this.combatHistory,
            customStats: this.customStats,
            equipmentEffects: this.equipmentEffects,
            lastAction: this.lastAction,
            turnsTaken: this.turnsTaken
        };
    }

    // Get all enabled spells
    getAllEnabledSpells() {
        return this.spellbook.filter(spell => spell.enabled !== false);
    }

    // Check if hero has a specific enabled spell
    hasEnabledSpell(spellName) {
        return this.spellbook.some(spell => spell.name === spellName && spell.enabled !== false);
    }
    
    // Import hero state from persistence
    static fromSavedState(savedState) {
        const hero = new Hero(
            {
                id: savedState.id,
                name: savedState.name,
                image: savedState.image,
                filename: savedState.filename
            },
            savedState.position,
            savedState.side,
            savedState.absoluteSide
        );
        
        // Restore base stats
        if (savedState.baseMaxHp !== undefined && savedState.baseAtk !== undefined) {
            hero.baseMaxHp = savedState.baseMaxHp;
            hero.baseAtk = savedState.baseAtk;
        }
        
        // Restore current stats (these are the pre-calculated values)
        hero.currentHp = savedState.currentHp;
        hero.maxHp = savedState.maxHp;
        hero.atk = savedState.atk;
        hero.alive = savedState.alive;
        
        // Restore permanent stat bonuses
        hero.attackBonusses = savedState.attackBonusses || 0;
        hero.hpBonusses = savedState.hpBonusses || 0;
        
        // NEW: Restore battle bonuses
        hero.battleAttackBonus = savedState.battleAttackBonus || 0;
        hero.battleHpBonus = savedState.battleHpBonus || 0;
        
        // Restore abilities
        hero.abilities = savedState.abilities || { zone1: [], zone2: [], zone3: [] };
        hero.abilityRegistry = new Set(savedState.abilityRegistry || []);
        
        // Restore spellbook, creatures, equipment
        hero.spellbook = savedState.spellbook || [];
        hero.creatures = savedState.creatures || [];
        if (savedState.equipment) {
            hero.setEquipment(savedState.equipment);
        }
        
        // Restore necromancy stacks
        hero.necromancyStacks = savedState.necromancyStacks || 0;
        hero.maxNecromancyStacks = savedState.maxNecromancyStacks || 0;
        
        // Restore battle state
        hero.statusEffects = savedState.statusEffects || [];
        hero.temporaryModifiers = savedState.temporaryModifiers || {};
        hero.combatHistory = savedState.combatHistory || [];
        hero.customStats = savedState.customStats || {};
        hero.equipmentEffects = savedState.equipmentEffects || [];
        hero.lastAction = savedState.lastAction;
        hero.turnsTaken = savedState.turnsTaken || 0;
        
        return hero;
    }
}

// Attach to window for global access AFTER class definition
if (typeof window !== 'undefined') {
    window.Hero = Hero;
}