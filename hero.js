// hero.js - Enhanced Hero Class with ascendedStack tracking

import { getCardInfo } from './cardDatabase.js';

export class Hero {
    constructor(heroData, position, side, absoluteSide) {
        // Basic hero information
        this.id = heroData.id;
        this.name = heroData.name;
        
        if (heroData.image && heroData.image.includes('./Cards/Characters/')) {
            this.image = heroData.image.replace('./Cards/Characters/', './Cards/All/');
        } else if (heroData.filename) {
            // Construct the correct path from filename
            this.image = `./Cards/All/${heroData.filename}`;
        } else {
            // Fallback - construct from name
            this.image = `./Cards/All/${heroData.name}.png`;
        }
        
        this.filename = heroData.filename;
        
        // Position and side information
        this.position = position;
        this.side = side;
        this.absoluteSide = absoluteSide;
        
        // ASCENSION TRACKING - Track evolution history
        this.ascendedStack = heroData.ascendedStack || [];
        
        // Load base stats from card database
        const heroInfo = getCardInfo(this.name);
        if (heroInfo && heroInfo.cardType === 'hero') {
            this.baseMaxHp = heroInfo.hp;      // Store original base values
            this.baseAtk = heroInfo.atk;
            this.maxHp = heroInfo.hp;          // Will be overridden by pre-calculated values
            this.currentHp = heroInfo.hp;      // Will be adjusted proportionally when maxHp changes
            this.atk = heroInfo.atk;           // Will be overridden by pre-calculated values
        } else {
            this.baseMaxHp = 100;
            this.baseAtk = 10;
            this.maxHp = 100;
            this.currentHp = 100;
            this.atk = 10;
        }
        
        // Combat state
        this.alive = true;
        
        // SHIELD SYSTEM - Add shield support to Hero class
        this.currentShield = 0;  // Current shield points
        
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
        
        // Stat bonuses from LegendarySwordOfABarbarianKing
        this.attackBonusses = 0;  // Permanent attack bonuses
        this.hpBonusses = 0;      // Permanent HP bonuses

        // Truly permanent bonuses (persist across all game states)
        this.permanentAttackBonusses = 0;
        this.permanentHpBonusses = 0;  
        
        // Battle-duration temporary bonuses (persist until battle ends)
        this.battleAttackBonus = 0;  // Temporary attack bonus for this battle only
        this.battleHpBonus = 0;      // Temporary HP bonus for this battle only
        
        // Necromancy stacks tracking
        this.necromancyStacks = 0;
        this.maxNecromancyStacks = 0;

        // Other stacks/counters
        this.burningFingerStack = 0;
        this.deathCounters = 0;
        this.spellShields = 0;
        this.turnsSinceDeath = 0;

        
        // Extensible state for future features
        this.statusEffects = [];
        this.temporaryModifiers = {};
        this.combatHistory = [];
        this.customStats = {};
        this.equipmentEffects = [];
        
        // Battle-specific state
        this.lastAction = null;
        this.turnsTaken = 0;

        // Add burning finger stack initialization
        if (heroData.burningFingerStack !== undefined) {
            this.burningFingerStack = heroData.burningFingerStack;
        } else {
            this.burningFingerStack = 0;
        }
        
        // Add SpellShield stack initialization
        if (heroData.spellShields !== undefined) {
            this.spellShields = heroData.spellShields;
        } else {
            this.spellShields = 0;
        }
        
        // Add spellbook locked flag initialization
        if (heroData.spellbookLocked !== undefined) {
            this.spellbookLocked = heroData.spellbookLocked;
        } else {
            this.spellbookLocked = false;
        }
    }

    // ============================================
    // ASCENSION STACK METHODS
    // ============================================

    /**
     * Add a hero form to the ascended stack (called during ascension)
     * @param {string} heroName - The name of the hero form being replaced
     */
    addToAscendedStack(heroName) {
        if (!heroName || typeof heroName !== 'string') return;
        
        // Ensure ascendedStack exists
        if (!Array.isArray(this.ascendedStack)) {
            this.ascendedStack = [];
        }
        
        // Add the hero form to the stack if it's not already there
        if (!this.ascendedStack.includes(heroName)) {
            this.ascendedStack.push(heroName);
        }
    }

    /**
     * Get the complete ascension history
     * @returns {string[]} Array of hero names in ascension order
     */
    getAscendedStack() {
        return [...(this.ascendedStack || [])];
    }

    /**
     * Get the original base hero (first in the ascension chain)
     * @returns {string|null} Original hero name or null if no ascensions
     */
    getOriginalHero() {
        if (!this.ascendedStack || this.ascendedStack.length === 0) {
            return null;
        }
        return this.ascendedStack[0];
    }

    /**
     * Get the previous form (most recent in the ascension chain)
     * @returns {string|null} Previous hero form or null if no ascensions
     */
    getPreviousForm() {
        if (!this.ascendedStack || this.ascendedStack.length === 0) {
            return null;
        }
        return this.ascendedStack[this.ascendedStack.length - 1];
    }

    /**
     * Check if this hero has been ascended from another form
     * @returns {boolean} True if hero has ascension history
     */
    hasAscensionHistory() {
        return this.ascendedStack && this.ascendedStack.length > 0;
    }

    /**
     * Get the total number of ascensions this hero has undergone
     * @returns {number} Number of ascensions
     */
    getAscensionCount() {
        return this.ascendedStack ? this.ascendedStack.length : 0;
    }

    /**
     * Set the ascended stack directly (for restoration)
     * @param {string[]} stack - Array of hero names
     */
    setAscendedStack(stack) {
        if (Array.isArray(stack)) {
            this.ascendedStack = [...stack];
        } else {
            this.ascendedStack = [];
        }
    }

    /**
     * Clear the ascended stack
     */
    clearAscendedStack() {
        this.ascendedStack = [];
    }

    // ============================================
    // SHIELD SYSTEM METHODS (unchanged)
    // ============================================

    /**
     * Add shield points to this hero
     * @param {number} amount - Amount of shield to add
     */
    addShield(amount) {
        if (amount <= 0) return;

        const oldShield = this.currentShield;
        this.currentShield += amount;

        // Add to combat history
        this.combatHistory.push({
            action: 'shield_gained',
            amount: amount,
            oldShield: oldShield,
            newShield: this.currentShield,
            timestamp: Date.now()
        });

        return {
            oldShield: oldShield,
            newShield: this.currentShield,
            gained: amount
        };
    }

    /**
     * Remove shield points from this hero
     * @param {number} amount - Amount of shield to remove
     * @returns {number} Actual amount of shield removed
     */
    removeShield(amount) {
        if (amount <= 0) return 0;

        const oldShield = this.currentShield;
        const actualRemoved = Math.min(amount, this.currentShield);
        this.currentShield = Math.max(0, this.currentShield - amount);

        // Add to combat history
        if (actualRemoved > 0) {
            this.combatHistory.push({
                action: 'shield_lost',
                amount: actualRemoved,
                oldShield: oldShield,
                newShield: this.currentShield,
                timestamp: Date.now()
            });
        }

        return actualRemoved;
    }

    /**
     * Get current shield amount
     * @returns {number} Current shield points
     */
    getShield() {
        return this.currentShield || 0;
    }

    /**
     * Check if hero has any shield
     * @returns {boolean} True if hero has shield
     */
    hasShield() {
        return this.currentShield > 0;
    }

    /**
     * Set shield amount directly (for restoration)
     * @param {number} amount - Shield amount to set
     */
    setShield(amount) {
        this.currentShield = Math.max(0, amount);
    }

    /**
     * Clear all shield points
     */
    clearShield() {
        const oldShield = this.currentShield;
        this.currentShield = 0;
        
        if (oldShield > 0) {
            this.combatHistory.push({
                action: 'shield_cleared',
                amount: oldShield,
                oldShield: oldShield,
                newShield: 0,
                timestamp: Date.now()
            });
        }
        
        return oldShield;
    }

    /**
     * Apply damage to shields first, then HP
     * @param {number} damage - Damage amount
     * @returns {Object} Damage application result
     */
    takeDamageWithShields(damage) {
        if (damage <= 0) {
            return { shieldDamage: 0, hpDamage: 0, died: false };
        }

        let remainingDamage = damage;
        let shieldDamage = 0;
        let hpDamage = 0;

        // Apply damage to shields first
        if (this.hasShield()) {
            shieldDamage = Math.min(remainingDamage, this.currentShield);
            remainingDamage -= shieldDamage;
            this.removeShield(shieldDamage);
        }

        // Apply remaining damage to HP
        if (remainingDamage > 0) {
            const damageResult = this.takeDamage(remainingDamage);
            hpDamage = remainingDamage;
            return {
                shieldDamage: shieldDamage,
                hpDamage: hpDamage,
                died: damageResult.died,
                oldHp: damageResult.oldHp,
                newHp: damageResult.newHp
            };
        }

        return { 
            shieldDamage: shieldDamage, 
            hpDamage: 0, 
            died: false,
            oldHp: this.currentHp,
            newHp: this.currentHp
        };
    }

    // ============================================
    // EXISTING METHODS (unchanged from here down)
    // ============================================

    addPermanentStatBonuses(attackBonus, hpBonus) {
        this.attackBonusses += attackBonus;
        this.hpBonusses += hpBonus;
    }
    
    // NEW: Battle bonus system - these bonuses last for the entire battle
    addBattleAttackBonus(amount) {
        if (amount <= 0) return;
        
        this.battleAttackBonus += amount;
        
        // Get new total attack
        const newAttack = this.getCurrentAttack();
    }
    
    addBattleHpBonus(amount) {
        if (amount <= 0) return;
        
        const oldMaxHp = this.maxHp;
        this.battleHpBonus += amount;
        this.maxHp += amount;
        
        // Increase current HP by the same amount (maintains HP ratio)
        this.currentHp += amount;
    }
    
    // Clear battle bonuses (called when battle ends)
    clearBattleBonuses() {
        if (this.battleAttackBonus > 0 || this.battleHpBonus > 0) {
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
        
        // Clear shields when battle ends
        this.clearShield();
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
        
        // Set the pre-calculated values directly with minimum enforcement
        this.maxHp = Math.max(1, effectiveStats.maxHp);
        this.atk = effectiveStats.attack;
        
        // **Restore the permanent bonuses from the bonuses object**
        if (effectiveStats.bonuses) {
            if (effectiveStats.bonuses.trulyPermanentAttackBonus !== undefined) {
                this.permanentAttackBonusses = effectiveStats.bonuses.trulyPermanentAttackBonus;
            }
            if (effectiveStats.bonuses.trulyPermanentHpBonus !== undefined) {
                this.permanentHpBonusses = effectiveStats.bonuses.trulyPermanentHpBonus;
            }
        }
        
        // Adjust current HP proportionally if max HP changed
        if (oldMaxHp !== this.maxHp && oldMaxHp > 0) {
            const hpRatio = this.currentHp / oldMaxHp;
            this.currentHp = Math.floor(this.maxHp * hpRatio);
            this.currentHp = Math.min(this.currentHp, this.maxHp);
            this.currentHp = Math.max(1, this.currentHp);
        } else if (oldMaxHp === this.maxHp) {
            this.currentHp = Math.min(this.currentHp, this.maxHp);
            this.currentHp = Math.max(1, this.currentHp);
        } else {
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
    }
    
    // Initialize necromancy stacks based on ability level
    initializeNecromancyStacks() {
        if (this.hasAbility('Necromancy')) {
            const necromancyLevel = this.getAbilityStackCount('Necromancy');
            this.necromancyStacks = necromancyLevel;
            this.maxNecromancyStacks = necromancyLevel;
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
    }
    
    setEquipment(equipment) {
        try {
            if (Array.isArray(equipment)) {
                this.equipment = equipment.filter(item => {
                    if (!item || typeof item !== 'object') {
                        return false;
                    }
                    
                    const itemName = item.name || item.cardName;
                    if (!itemName || typeof itemName !== 'string') {
                        return false;
                    }
                    
                    return true;
                }).map(item => ({ ...item }));
            } else {
                this.equipment = [];
            }
        } catch (error) {
            this.equipment = [];
        }
    }

    // Get equipment for this hero (sorted alphabetically)
    getEquipment() {
        if (!Array.isArray(this.equipment)) {
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
    }

    // Add a creature
    addCreature(creatureCard) {
        if (!creatureCard || creatureCard.subtype !== 'Creature') {
            return false;
        }
        
        this.creatures.push({ ...creatureCard });
        return true;
    }

    // Remove a creature by index
    removeCreature(index) {
        if (index < 0 || index >= this.creatures.length) {
            return null;
        }
        
        const removedCreature = this.creatures.splice(index, 1)[0];
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
    }
    
    // Add a spell to the spellbook
    addSpell(spellCard) {
        if (!spellCard || spellCard.cardType !== 'Spell') {
            return false;
        }
        
        this.spellbook.push({ ...spellCard });
        return true;
    }
    
    // Remove a spell from the spellbook by index
    removeSpell(index) {
        if (index < 0 || index >= this.spellbook.length) {
            return null;
        }
        
        const removedSpell = this.spellbook.splice(index, 1)[0];
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
    
    // Take damage (without shields - legacy method)
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
    
    // Export hero state for persistence - UPDATED WITH ASCENDED STACK
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
            
            // ASCENSION TRACKING - Include ascended stack in export
            ascendedStack: [...(this.ascendedStack || [])],
            
            // Stats (pre-calculated from heroSelection)
            currentHp: this.currentHp,
            maxHp: this.maxHp,
            atk: this.atk,
            baseMaxHp: this.baseMaxHp,
            baseAtk: this.baseAtk,
            alive: this.alive,
            
            // SHIELD SYSTEM - Include shield in export
            currentShield: this.currentShield || 0,
            
            // LegendarySword stat bonuses
            attackBonusses: this.attackBonusses,
            hpBonusses: this.hpBonusses,

            // Truly permanent bonuses (ForcefulRevival, etc.)
            permanentAttackBonusses: this.permanentAttackBonusses || 0,
            permanentHpBonusses: this.permanentHpBonusses || 0,
            
            // Battle-duration bonuses
            battleAttackBonus: this.battleAttackBonus,
            battleHpBonus: this.battleHpBonus,
            
            // Abilities
            abilities: this.abilities,
            abilityRegistry: Array.from(this.abilityRegistry),
            
            // Spellbook, creatures, equipment
            spellbook: this.spellbook.map(spell => ({ ...spell })),
            spellbookLocked: this.spellbookLocked || false,
            creatures: this.creatures.map(creature => ({ ...creature })),
            equipment: this.equipment.map(item => ({...item})),
            
            // Stacks
            necromancyStacks: this.necromancyStacks,
            maxNecromancyStacks: this.maxNecromancyStacks,
            burningFingerStack: this.burningFingerStack || 0,
            deathCounters: this.deathCounters || 0,
            spellShields: this.spellShields || 0,
            turnsSinceDeath: this.turnsSinceDeath || 0, 

            
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
    
    // Import hero state from persistence - UPDATED WITH ASCENDED STACK
    static fromSavedState(savedState) {
        const hero = new Hero(
            {
                id: savedState.id,
                name: savedState.name,
                image: savedState.image,
                filename: savedState.filename,
                burningFingerStack: savedState.burningFingerStack,
                spellShields: savedState.spellShields,
                ascendedStack: savedState.ascendedStack  // RESTORE ASCENDED STACK
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
        
        // SHIELD SYSTEM - Restore shield data
        hero.currentShield = savedState.currentShield || 0;
        
        // ASCENSION TRACKING - Restore ascended stack
        hero.setAscendedStack(savedState.ascendedStack || []);
        
        // Restore LegendarySword stat bonuses
        hero.attackBonusses = savedState.attackBonusses || 0;
        hero.hpBonusses = savedState.hpBonusses || 0;

        // Restore truly permanent bonuses
        hero.permanentAttackBonusses = savedState.permanentAttackBonusses || 0;
        hero.permanentHpBonusses = savedState.permanentHpBonusses || 0;
        
        // Restore battle bonuses
        hero.battleAttackBonus = savedState.battleAttackBonus || 0;
        hero.battleHpBonus = savedState.battleHpBonus || 0;
        
        // Restore abilities
        hero.abilities = savedState.abilities || { zone1: [], zone2: [], zone3: [] };
        hero.abilityRegistry = new Set(savedState.abilityRegistry || []);
        
        // Restore spellbook, creatures, equipment
        hero.spellbook = savedState.spellbook || [];
        hero.spellbookLocked = savedState.spellbookLocked || false;
        hero.creatures = savedState.creatures || [];
        if (savedState.equipment) {
            hero.setEquipment(savedState.equipment);
        }
        
        // Restore Stacks
        hero.necromancyStacks = savedState.necromancyStacks || 0;
        hero.maxNecromancyStacks = savedState.maxNecromancyStacks || 0;
        hero.burningFingerStack = savedState.burningFingerStack || 0;
        hero.deathCounters = savedState.deathCounters || 0;
        hero.spellShields = savedState.spellShields || 0;
        hero.turnsSinceDeath = savedState.turnsSinceDeath || 0; 

        
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