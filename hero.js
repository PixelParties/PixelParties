// hero.js - Centralized Hero Class for Battle System with Spellbook Support

import { getCardInfo } from './cardDatabase.js';

export class Hero {
    constructor(heroData, position, side, absoluteSide) {
        // Basic hero information
        this.id = heroData.id;
        this.name = heroData.name;
        this.image = heroData.image;
        this.filename = heroData.filename;
        
        // Position and side information
        this.position = position; // 'left', 'center', 'right'
        this.side = side; // 'player' or 'opponent' (relative to current player)
        this.absoluteSide = absoluteSide; // 'host' or 'guest' (absolute role)
        
        // Load stats from card database
        const heroInfo = getCardInfo(this.name);
        if (heroInfo && heroInfo.cardType === 'hero') {
            this.maxHp = heroInfo.hp;
            this.currentHp = heroInfo.hp;
            this.atk = heroInfo.atk;
            this.baseAtk = heroInfo.atk; // Store base attack for modifications
        } else {
            console.error(`Hero info not found for ${this.name}`);
            this.maxHp = 100;
            this.currentHp = 100;
            this.atk = 10;
            this.baseAtk = 10;
        }
        
        // Combat state
        this.alive = true;
        
        // Abilities - structured storage
        this.abilities = {
            zone1: [],  // Array of ability objects with stacks
            zone2: [],
            zone3: []
        };
        this.abilityRegistry = new Set(); // Track unique abilities this hero has
        
        // Spellbook - array of spell cards
        this.spellbook = [];
        
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
    
    // Set abilities from HeroAbilitiesManager data
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
        
        console.log(`${this.name} abilities set:`, this.abilities);
    }
    
    // Set spellbook from HeroSpellbookManager data
    setSpellbook(spellbookData) {
        if (!spellbookData || !Array.isArray(spellbookData)) return;
        
        // Clear existing spellbook
        this.spellbook = [];
        
        // Copy spells from manager data
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
    getSpell(spellName) {
        return this.spellbook.find(spell => spell.name === spellName);
    }
    
    // Check if hero has a specific spell
    hasSpell(spellName) {
        return this.spellbook.some(spell => spell.name === spellName);
    }
    
    // Get all spells
    getAllSpells() {
        return [...this.spellbook];
    }
    
    // Get spell count
    getSpellCount() {
        return this.spellbook.length;
    }
    
    // Get spell count for a specific spell
    getSpecificSpellCount(spellName) {
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
    
    // Modify attack
    modifyAttack(modifier, temporary = false) {
        if (temporary) {
            // Temporary modification (for this turn only)
            if (!this.temporaryModifiers.atk) {
                this.temporaryModifiers.atk = [];
            }
            this.temporaryModifiers.atk.push(modifier);
        } else {
            // Permanent modification
            this.atk += modifier;
        }
    }
    
    // Get current attack (including temporary modifiers)
    getCurrentAttack() {
        let totalAtk = this.atk;
        
        // Apply temporary modifiers
        if (this.temporaryModifiers.atk) {
            this.temporaryModifiers.atk.forEach(mod => {
                totalAtk += mod;
            });
        }
        
        return Math.max(0, totalAtk); // Ensure non-negative
    }

    // Get attack bonus (difference between current and base)
    getAttackBonus() {
        return this.getCurrentAttack() - this.baseAtk;
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
            
            // Stats
            currentHp: this.currentHp,
            maxHp: this.maxHp,
            atk: this.atk,
            baseAtk: this.baseAtk,
            alive: this.alive,
            
            // Abilities
            abilities: this.abilities,
            abilityRegistry: Array.from(this.abilityRegistry),
            
            // Spellbook
            spellbook: this.spellbook.map(spell => ({ ...spell })),
            
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
        
        // Restore stats
        hero.currentHp = savedState.currentHp;
        hero.maxHp = savedState.maxHp;
        hero.atk = savedState.atk;
        hero.baseAtk = savedState.baseAtk;
        hero.alive = savedState.alive;
        
        // Restore abilities
        hero.abilities = savedState.abilities || { zone1: [], zone2: [], zone3: [] };
        hero.abilityRegistry = new Set(savedState.abilityRegistry || []);
        
        // Restore spellbook
        hero.spellbook = savedState.spellbook || [];
        
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