// ./Abilities/resistance.js - Resistance Ability Implementation with Ida Hook

import { IdaHeroEffect } from '../Heroes/ida.js';

export class ResistanceManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.resistanceStacks = {}; // Track resistance stacks for each hero
        
        console.log('🛡️ Resistance ability manager initialized');
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    // Initialize resistance stacks for all heroes at battle start
    initializeResistanceStacks() {
        console.log('🛡️ Initializing resistance stacks for all heroes...');
        
        // Initialize for player heroes
        this.initializeResistanceForSide('player', this.battleManager.playerHeroes);
        
        // Initialize for opponent heroes
        this.initializeResistanceForSide('opponent', this.battleManager.opponentHeroes);
    }

    // Initialize resistance for one side's heroes
    initializeResistanceForSide(side, heroes) {
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.hasAbility('Resistance')) {
                const resistanceLevel = hero.getAbilityStackCount('Resistance');
                const key = this.getHeroKey(side, position);
                
                this.resistanceStacks[key] = resistanceLevel;
                
                console.log(`🛡️ ${hero.name} (${side} ${position}) initialized with ${resistanceLevel} resistance stacks`);
                
                // Add to battle log
                if (resistanceLevel > 0) {
                    this.battleManager.addCombatLog(
                        `🛡️ ${hero.name} gains ${resistanceLevel} resistance stack${resistanceLevel > 1 ? 's' : ''}!`,
                        side === 'player' ? 'success' : 'info'
                    );
                }
                
                // Store in hero's custom stats for persistence
                hero.customStats.resistanceStacks = resistanceLevel;
            }
        });
    }

    // ============================================
    // RESISTANCE CHECK AND CONSUMPTION
    // ============================================

    // Check if a target can resist a spell
    canResistSpell(target, spellName) {
        // Only heroes can use resistance (not creatures)
        if (!target || !target.hasAbility) return false;
        
        const key = this.getHeroKey(target.side, target.position);
        const stacks = this.resistanceStacks[key] || 0;
        
        return stacks > 0;
    }

    // Consume a resistance stack and log the resistance
    consumeResistanceStack(target, spellName) {
        const key = this.getHeroKey(target.side, target.position);
        const currentStacks = this.resistanceStacks[key] || 0;
        
        if (currentStacks > 0) {
            this.resistanceStacks[key] = currentStacks - 1;
            target.customStats.resistanceStacks = this.resistanceStacks[key];
            
            // Log the resistance
            this.battleManager.addCombatLog(
                `🛡️ ${target.name} resists ${this.formatSpellName(spellName)}!`,
                target.side === 'player' ? 'success' : 'warning'
            );
            
            console.log(`🛡️ ${target.name} resisted ${spellName}! ${this.resistanceStacks[key]} stacks remaining`);
            
            // Send update to guest if host
            if (this.battleManager.isAuthoritative) {
                this.battleManager.sendBattleUpdate('resistance_used', {
                    heroAbsoluteSide: target.absoluteSide,
                    heroPosition: target.position,
                    heroName: target.name,
                    spellName: spellName,
                    remainingStacks: this.resistanceStacks[key],
                    timestamp: Date.now()
                });
            }
            
            return true;
        }
        
        return false;
    }

    // ============================================
    // SPELL INTERCEPTION WITH IDA HOOK
    // ============================================

    // Check if a spell should be resisted
    shouldResistSpell(target, spellName, caster = null) {
        // Check for resistance first
        if (target && target.hasAbility && this.canResistSpell(target, spellName)) {
            this.consumeResistanceStack(target, spellName);
            return true;
        }
        
        // If spell was not resisted and we have a caster, check for Ida effect
        if (caster && this.battleManager.isAuthoritative) {
            // Create target object for Ida effect
            const idaTarget = target.hasAbility ? target : { hero: target, type: 'hero' };
            IdaHeroEffect.checkIdaSpellEffect(caster, idaTarget, spellName, this.battleManager);
        }
        
        return false;
    }

    // Check if an area spell should be resisted for a specific target (MODIFIED to include Ida hook)
    shouldResistAreaSpell(target, spellName, caster = null) {
        // For area spells, check each individual target
        if (target.type === 'hero') {
            // Check resistance for hero
            const resisted = this.shouldResistSpell(target.hero, spellName, caster);
            
            // Note: Ida effect is already handled in shouldResistSpell for heroes
            return resisted;
        } else if (target.type === 'creature') {
            // Creatures cannot use resistance themselves
            // But they can still be affected by Ida's spell effect
            
            // 🔥 NEW: Check for Ida effect on creatures when spell is not resisted
            if (caster && this.battleManager.isAuthoritative) {
                IdaHeroEffect.checkIdaSpellEffect(caster, target, spellName, this.battleManager);
            }
            
            return false; // Creatures never resist
        }
        
        return false;
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle resistance usage on guest side
    handleGuestResistanceUsed(data) {
        const { heroAbsoluteSide, heroPosition, heroName, spellName, remainingStacks } = data;
        
        // Determine local side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Update local resistance stack tracking
        const key = this.getHeroKey(heroLocalSide, heroPosition);
        this.resistanceStacks[key] = remainingStacks;
        
        // Update hero's custom stats
        const heroes = heroLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[heroPosition];
        if (hero) {
            hero.customStats.resistanceStacks = remainingStacks;
        }
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🛡️ ${heroName} resists ${this.formatSpellName(spellName)}!`,
            heroLocalSide === 'player' ? 'success' : 'warning'
        );
        
        console.log(`🛡️ GUEST: ${heroName} resisted ${spellName}! ${remainingStacks} stacks remaining`);
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Get a unique key for a hero
    getHeroKey(side, position) {
        return `${side}_${position}`;
    }

    // Format spell name for display
    formatSpellName(spellName) {
        // Convert camelCase to readable format
        return spellName
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Get current resistance stacks for a hero
    getResistanceStacks(hero) {
        if (!hero) return 0;
        
        const key = this.getHeroKey(hero.side, hero.position);
        return this.resistanceStacks[key] || 0;
    }

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    // Export resistance state for persistence
    exportState() {
        return {
            resistanceStacks: { ...this.resistanceStacks }
        };
    }

    // Import resistance state from persistence
    importState(state) {
        if (state && state.resistanceStacks) {
            this.resistanceStacks = { ...state.resistanceStacks };
            
            // Also update heroes' custom stats
            this.syncResistanceStacksToHeroes();
        }
    }

    // Sync resistance stacks to heroes' custom stats
    syncResistanceStacksToHeroes() {
        // Sync player heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.battleManager.playerHeroes[position];
            if (hero) {
                const key = this.getHeroKey('player', position);
                hero.customStats.resistanceStacks = this.resistanceStacks[key] || 0;
            }
        });
        
        // Sync opponent heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.battleManager.opponentHeroes[position];
            if (hero) {
                const key = this.getHeroKey('opponent', position);
                hero.customStats.resistanceStacks = this.resistanceStacks[key] || 0;
            }
        });
    }

    // Swap resistance stacks when heroes change positions
    swapResistanceStacks(side, position1, position2) {
        const key1 = this.getHeroKey(side, position1);
        const key2 = this.getHeroKey(side, position2);
        
        const stacks1 = this.resistanceStacks[key1] || 0;
        const stacks2 = this.resistanceStacks[key2] || 0;
        
        // Swap the stacks
        this.resistanceStacks[key1] = stacks2;
        this.resistanceStacks[key2] = stacks1;
        
        // Update heroes' custom stats to match
        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        if (heroes[position1]) {
            heroes[position1].customStats.resistanceStacks = stacks2;
        }
        if (heroes[position2]) {
            heroes[position2].customStats.resistanceStacks = stacks1;
        }
        
        console.log(`🛡️ Swapped resistance stacks: ${position1}(${stacks1}→${stacks2}) ↔ ${position2}(${stacks2}→${stacks1})`);
        
        // Send network update if authoritative
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('resistance_stacks_swapped', {
                side: side,
                position1: position1,
                position2: position2,
                stacks1: stacks2, // New stacks for position1
                stacks2: stacks1, // New stacks for position2
                timestamp: Date.now()
            });
        }
    }

    // Swap resistance stacks locally without network sync (for guest-side operations)
    swapResistanceStacksLocal(side, position1, position2) {
        const key1 = this.getHeroKey(side, position1);
        const key2 = this.getHeroKey(side, position2);
        
        const stacks1 = this.resistanceStacks[key1] || 0;
        const stacks2 = this.resistanceStacks[key2] || 0;
        
        // Swap the stacks
        this.resistanceStacks[key1] = stacks2;
        this.resistanceStacks[key2] = stacks1;
        
        // Update heroes' custom stats to match
        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        if (heroes[position1]) {
            heroes[position1].customStats.resistanceStacks = stacks2;
        }
        if (heroes[position2]) {
            heroes[position2].customStats.resistanceStacks = stacks1;
        }
        
        console.log(`🛡️ Local swap resistance stacks: ${position1}(${stacks1}→${stacks2}) ↔ ${position2}(${stacks2}→${stacks1})`);
    }

    // Handle guest-side resistance stack swapping
    handleGuestResistanceSwapped(data) {
        const { side, position1, position2, stacks1, stacks2 } = data;
        
        // Convert to local side if needed
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        let localSide = side;
        
        // If this is about the opponent's side, convert to local perspective
        if ((side === 'player' && !this.battleManager.isHost) || 
            (side === 'opponent' && this.battleManager.isHost)) {
            localSide = 'opponent';
        } else if ((side === 'player' && this.battleManager.isHost) || 
                (side === 'opponent' && !this.battleManager.isHost)) {
            localSide = 'player';
        }
        
        const key1 = this.getHeroKey(localSide, position1);
        const key2 = this.getHeroKey(localSide, position2);
        
        // Update resistance stacks
        this.resistanceStacks[key1] = stacks1;
        this.resistanceStacks[key2] = stacks2;
        
        // Update heroes' custom stats
        const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        if (heroes[position1]) {
            heroes[position1].customStats.resistanceStacks = stacks1;
        }
        if (heroes[position2]) {
            heroes[position2].customStats.resistanceStacks = stacks2;
        }
        
        console.log(`🛡️ GUEST: Resistance stacks swapped for ${localSide} side: ${position1}(${stacks1}) ↔ ${position2}(${stacks2})`);
    }

    // ============================================
    // CLEANUP
    // ============================================

    // Cleanup when battle ends
    cleanup() {
        this.resistanceStacks = {};
        
        // Also cleanup Ida effects
        IdaHeroEffect.cleanup();
        
        console.log('🛡️ Resistance manager cleaned up');
    }
}

// ============================================
// BATTLE MANAGER INTEGRATION PATCHES
// ============================================

// Export patches to be applied to BattleManager
export function applyResistancePatches(BattleManager) {
    // Store original methods
    const originalInit = BattleManager.prototype.init;
    const originalStartBattle = BattleManager.prototype.startBattle;
    const originalExportBattleState = BattleManager.prototype.exportBattleState;
    const originalRestoreBattleState = BattleManager.prototype.restoreBattleState;
    const originalReceiveBattleData = BattleManager.prototype.receiveBattleData;
    const originalReset = BattleManager.prototype.reset;
    
    // Patch init to create ResistanceManager
    BattleManager.prototype.init = function(...args) {
        originalInit.apply(this, args);
        
        // Initialize resistance manager
        this.resistanceManager = new ResistanceManager(this);
    };
    
    // Patch startBattle to initialize resistance stacks
    BattleManager.prototype.startBattle = async function() {
        await originalStartBattle.apply(this);
        
        // Initialize resistance stacks for all heroes
        if (this.resistanceManager && this.isAuthoritative) {
            this.resistanceManager.initializeResistanceStacks();
        }
    };
    
    // Patch exportBattleState to include resistance state
    BattleManager.prototype.exportBattleState = function() {
        const state = originalExportBattleState.apply(this);
        
        // Add resistance state
        if (this.resistanceManager) {
            state.resistanceState = this.resistanceManager.exportState();
        }
        
        return state;
    };
    
    // Patch restoreBattleState to restore resistance state
    BattleManager.prototype.restoreBattleState = function(stateData) {
        const result = originalRestoreBattleState.apply(this, arguments);
        
        // Restore resistance state
        if (stateData.resistanceState && this.resistanceManager) {
            this.resistanceManager.importState(stateData.resistanceState);
        }
        
        return result;
    };
    
    // Patch receiveBattleData to handle resistance messages
    BattleManager.prototype.receiveBattleData = function(message) {
        originalReceiveBattleData.apply(this, arguments);
        
        // Handle resistance-specific messages
        const { type, data } = message;
        
        if (type === 'resistance_used' && this.resistanceManager) {
            this.resistanceManager.handleGuestResistanceUsed(data);
        }
    };
    
    // Patch reset to cleanup resistance manager
    BattleManager.prototype.reset = function() {
        originalReset.apply(this);
        
        // Cleanup resistance manager
        if (this.resistanceManager) {
            this.resistanceManager.cleanup();
            this.resistanceManager = null;
        }
    };
}

// Export for use in ability system
export default ResistanceManager;