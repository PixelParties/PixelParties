// killTracker.js - Generic Kill Tracking System for Battle (UPDATED for Necromancy + Waflav + Duplicate Prevention)

export class KillTracker {
    constructor() {
        // Track kills for all heroes by side and position
        this.kills = {
            player: { left: [], center: [], right: [] },
            opponent: { left: [], center: [], right: [] }
        };
        
        // Reference to battle manager (set during init)
        this.battleManager = null;
        
        // Duplicate kill prevention
        this.recentKills = new Set();
        this.recentKillTimeout = 200; // 0.2 seconds to prevent duplicates
    }
    
    // Initialize with battle manager reference
    init(battleManager) {
        this.battleManager = battleManager;
    }
    
    // Generate a unique key for a kill event
    generateKillKey(attacker, target, targetType) {
        const timestamp = Date.now();
        return `${attacker.side}-${attacker.position}-${target.name}-${targetType}-${timestamp}`;
    }
    
    // Generate a base key for duplicate detection (without timestamp)
    generateBaseKillKey(attacker, target, targetType) {
        return `${attacker.side}-${attacker.position}-${target.name}-${targetType}`;
    }
    
    // Check if this kill was already recorded recently
    isDuplicateKill(attacker, target, targetType) {
        const baseKey = this.generateBaseKillKey(attacker, target, targetType);
        const now = Date.now();
        
        // Check if we've seen this exact kill combination recently
        for (const recentKey of this.recentKills) {
            if (recentKey.includes(baseKey)) {
                const keyParts = recentKey.split('-');
                const keyTimestamp = parseInt(keyParts[keyParts.length - 1]);
                if (now - keyTimestamp < this.recentKillTimeout) {
                    return true; // Duplicate detected
                }
            }
        }
        return false;
    }
    
    // Clean up old kill entries to prevent memory leaks
    cleanupOldKills() {
        const now = Date.now();
        const keysToRemove = [];
        
        for (const key of this.recentKills) {
            const keyParts = key.split('-');
            const keyTimestamp = parseInt(keyParts[keyParts.length - 1]);
            if (now - keyTimestamp > this.recentKillTimeout) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => this.recentKills.delete(key));
    }
    
    // Record a kill made by an attacker against a target
    // This is called whenever a target's HP drops to 0, regardless of whether
    // they are subsequently revived by Necromancy or other effects
    recordKill(attacker, target, targetType = 'unknown') {
        if (!attacker || !attacker.side || !attacker.position) {
            return;
        }
        
        // DEFENSIVE: Ensure the kills data structure exists for this attacker
        if (!this.kills[attacker.side]) {
            this.kills[attacker.side] = {};
        }
        
        if (!this.kills[attacker.side][attacker.position]) {
            this.kills[attacker.side][attacker.position] = [];
        }
        
        // Check for duplicate kills
        if (this.isDuplicateKill(attacker, target, targetType)) {
            return null;
        }
        
        // Generate unique key for this kill and add to recent kills
        const killKey = this.generateKillKey(attacker, target, targetType);
        this.recentKills.add(killKey);
        
        // Clean up old entries
        this.cleanupOldKills();
        
        // Create kill record
        const killRecord = {
            targetName: target.name || 'Unknown',
            targetType: targetType, // 'hero' or 'creature'
            targetSide: target.side || 'unknown',
            targetPosition: target.position || 'unknown',
            timestamp: Date.now(),
            turn: this.battleManager?.currentTurn || 0,
            // NEW: Track if target was revived (can be updated later)
            wasRevived: false
        };
        
        // Add to kill list for this attacker (now safe)
        this.kills[attacker.side][attacker.position].push(killRecord);
        
        // ============================================
        // Check for Waflav evolution counter reward
        // ============================================
        this.checkWaflavKillReward(attacker);
        
        // Sync with opponent if authoritative
        if (this.battleManager?.isAuthoritative) {
            this.syncKillToOpponent(attacker, killRecord);
        }
        
        return killRecord;
    }
    
    // NEW: Check if the attacker is a Waflav hero and award evolution counter
    checkWaflavKillReward(attacker) {
        if (!this.battleManager || !this.battleManager.isAuthoritative) {
            // Only the host should award Waflav kill rewards to prevent double-awarding
            return;
        }

        try {
            // Import Waflav handler dynamically to avoid circular dependencies
            import('./Heroes/waflav.js').then(({ WaflavEffectManager }) => {
                WaflavEffectManager.handleWaflavKill(attacker, this.battleManager);
            }).catch(error => {
                // Silently handle import errors - Waflav system is optional
            });
        } catch (error) {
            // Silently handle any errors - kill tracking should not break
        }
    }
    
    // NEW: Mark a kill as having been revived (for future tracking/display purposes)
    markKillAsRevived(attacker, targetName, targetType) {
        const kills = this.kills[attacker.side]?.[attacker.position] || [];
        
        // Find the most recent kill matching the target
        for (let i = kills.length - 1; i >= 0; i--) {
            const kill = kills[i];
            if (kill.targetName === targetName && kill.targetType === targetType && !kill.wasRevived) {
                kill.wasRevived = true;
                return true;
            }
        }
        
        return false;
    }
    
    // Get kill count for a specific hero
    getKillCount(side, position, filter = null) {
        const kills = this.kills[side]?.[position] || [];
        
        if (filter) {
            // Apply filter function if provided
            return kills.filter(filter).length;
        }
        
        return kills.length;
    }
    
    // NEW: Get kill count excluding revived targets (if you want to track "permanent" kills)
    getPermanentKillCount(side, position) {
        return this.getKillCount(side, position, kill => !kill.wasRevived);
    }
    
    // NEW: Get kill count of only revived targets
    getRevivedKillCount(side, position) {
        return this.getKillCount(side, position, kill => kill.wasRevived);
    }
    
    // Get all kills for a specific hero
    getKills(side, position) {
        return [...(this.kills[side]?.[position] || [])];
    }
    
    // Get total kills for a side
    getSideKillCount(side) {
        let total = 0;
        ['left', 'center', 'right'].forEach(position => {
            total += this.getKillCount(side, position);
        });
        return total;
    }
    
    // Check if hero has Wanted Poster equipped
    hasWantedPoster(hero) {
        const equipment = hero.equipment || hero.getEquipment?.() || [];
        return equipment.some(item => 
            item.name === 'WantedPoster' || item.cardName === 'WantedPoster'
        );
    }
    
    // Handle Wanted Poster specific logic
    // NOTE: Wanted Poster counts ALL kills, including revived creatures
    handleWantedPosterKill(attacker, killRecord) {
        const killCount = this.getKillCount(attacker.side, attacker.position);
        const posterCount = this.getWantedPosterCount(attacker);
        
        if (killCount <= 5) {
            const currentBonus = Math.min(killCount, 5) * 2 * posterCount;
            const maxBonus = 10 * posterCount;
            
            this.battleManager?.addCombatLog(
                `📜 ${attacker.name} scored a bounty kill! (${Math.min(killCount, 5)}/5 kills, +${currentBonus}/${maxBonus} gold)`,
                attacker.side === 'player' ? 'success' : 'info'
            );
        } else {
            // Already at max kills
            this.battleManager?.addCombatLog(
                `📜 ${attacker.name} scored another kill, but bounty is already maxed (5/5 kills)`,
                attacker.side === 'player' ? 'info' : 'info'
            );
        }
    }

    getWantedPosterCount(hero) {
        const equipment = hero.equipment || hero.getEquipment?.() || [];
        return equipment.filter(item => 
            item && (item.name === 'WantedPoster' || item.cardName === 'WantedPoster')
        ).length;
    }
    
    // Sync kill to opponent
    syncKillToOpponent(attacker, killRecord) {
        this.battleManager?.sendBattleUpdate('kill_tracked', {
            attackerSide: attacker.side,
            attackerPosition: attacker.position,
            attackerName: attacker.name,
            killRecord: killRecord
        });
    }
    
    // Handle synced kill from host (for guest)
    handleSyncedKill(data) {
        const { attackerSide, attackerPosition, killRecord } = data;
        
        const localAttackerSide = attackerSide === 'player' ? 'opponent' : 'player';
        
        // Add the kill to our local tracking with the translated side
        this.kills[localAttackerSide][attackerPosition].push(killRecord);
        
        // Get the hero to check for artifacts using the translated side
        const heroes = localAttackerSide === 'player' 
            ? this.battleManager?.playerHeroes 
            : this.battleManager?.opponentHeroes;
        
        const attacker = heroes?.[attackerPosition];
        if (attacker && this.hasWantedPoster(attacker)) {
            const killCount = this.getKillCount(localAttackerSide, attackerPosition);
            if (killCount <= 5) {
                this.battleManager?.addCombatLog(
                    `📜 ${data.attackerName} scored a bounty kill! (${Math.min(killCount, 5)}/5)`,
                    localAttackerSide === 'player' ? 'success' : 'info'
                );
            }
        }
    }
    
    // Export state for persistence
    exportState() {
        return {
            kills: this.kills,
            timestamp: Date.now()
            // Note: We don't export recentKills as it's just for duplicate prevention
        };
    }
    
    // Import state from persistence
    importState(state) {
        if (state && state.kills) {
            this.kills = state.kills;
            // Reset recent kills set on state import
            this.recentKills.clear();
            return true;
        }
        return false;
    }
    
    // Reset all kill tracking
    reset() {
        this.kills = {
            player: { left: [], center: [], right: [] },
            opponent: { left: [], center: [], right: [] }
        };
        
        // DEFENSIVE: Ensure the structure is completely initialized
        ['player', 'opponent'].forEach(side => {
            if (!this.kills[side]) {
                this.kills[side] = {};
            }
            ['left', 'center', 'right'].forEach(position => {
                if (!this.kills[side][position]) {
                    this.kills[side][position] = [];
                }
            });
        });
        
        // Clear duplicate prevention tracking
        this.recentKills.clear();
    }
    
    // Get statistics (UPDATED with revival tracking)
    getStatistics() {
        const stats = {
            playerKills: this.getSideKillCount('player'),
            opponentKills: this.getSideKillCount('opponent'),
            byPosition: {}
        };
        
        ['player', 'opponent'].forEach(side => {
            stats.byPosition[side] = {};
            ['left', 'center', 'right'].forEach(position => {
                const kills = this.kills[side][position];
                const revivedKills = kills.filter(k => k.wasRevived);
                const permanentKills = kills.filter(k => !k.wasRevived);
                
                stats.byPosition[side][position] = {
                    total: kills.length,
                    permanent: permanentKills.length,
                    revived: revivedKills.length,
                    heroes: kills.filter(k => k.targetType === 'hero').length,
                    creatures: kills.filter(k => k.targetType === 'creature').length,
                    heroesRevived: revivedKills.filter(k => k.targetType === 'hero').length,
                    creaturesRevived: revivedKills.filter(k => k.targetType === 'creature').length
                };
            });
        });
        
        return stats;
    }

    // Calculate Wanted Poster bonus (counts ALL kills, including revived)
    getWantedPosterBonus(side, position) {
        const kills = this.getKillCount(side, position);
        const effectiveKills = Math.min(kills, 5); // Cap at 5 kills
        
        // Get the hero to check poster count
        const heroes = side === 'player' 
            ? this.battleManager?.playerHeroes 
            : this.battleManager?.opponentHeroes;
        
        const hero = heroes?.[position];
        if (!hero) return 0;
        
        // Count Wanted Posters
        const equipment = hero.equipment || hero.getEquipment?.() || [];
        const posterCount = equipment.filter(item => 
            item && (item.name === 'WantedPoster' || item.cardName === 'WantedPoster')
        ).length;
        
        // 2 gold per kill per poster
        return effectiveKills * 2 * posterCount;
    }
}

// Create singleton instance
export const killTracker = new KillTracker();