// killTracker.js - Generic Kill Tracking System for Battle (UPDATED for Necromancy)

export class KillTracker {
    constructor() {
        // Track kills for all heroes by side and position
        this.kills = {
            player: { left: [], center: [], right: [] },
            opponent: { left: [], center: [], right: [] }
        };
        
        // Reference to battle manager (set during init)
        this.battleManager = null;
        
        console.log('KillTracker initialized');
    }
    
    // Initialize with battle manager reference
    init(battleManager) {
        this.battleManager = battleManager;
    }
    
    // Record a kill made by an attacker against a target
    // NOTE: This is called whenever a target's HP drops to 0, regardless of whether
    // they are subsequently revived by Necromancy or other effects
    recordKill(attacker, target, targetType = 'unknown') {
        if (!attacker || !attacker.side || !attacker.position) {
            console.warn('Invalid attacker for kill tracking');
            return;
        }
        
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
        
        // Add to kill list for this attacker
        this.kills[attacker.side][attacker.position].push(killRecord);
        
        // Log the kill
        console.log(`⚔️ ${attacker.name} killed ${killRecord.targetName} (${targetType})`);
        
        // Sync with opponent if authoritative
        if (this.battleManager?.isAuthoritative) {
            this.syncKillToOpponent(attacker, killRecord);
        }
        
        return killRecord;
    }
    
    // NEW: Mark a kill as having been revived (for future tracking/display purposes)
    markKillAsRevived(attacker, targetName, targetType) {
        const kills = this.kills[attacker.side]?.[attacker.position] || [];
        
        // Find the most recent kill matching the target
        for (let i = kills.length - 1; i >= 0; i--) {
            const kill = kills[i];
            if (kill.targetName === targetName && kill.targetType === targetType && !kill.wasRevived) {
                kill.wasRevived = true;
                console.log(`💀✨ Marked kill of ${targetName} as revived`);
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
        
        // Wanted Poster caps at 5 kills
        if (killCount <= 5) {
            this.battleManager?.addCombatLog(
                `📜 ${attacker.name} scored a bounty kill! (${Math.min(killCount, 5)}/5)`,
                attacker.side === 'player' ? 'success' : 'info'
            );
        }
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
        };
    }
    
    // Import state from persistence
    importState(state) {
        if (state && state.kills) {
            this.kills = state.kills;
            console.log('KillTracker state restored');
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
        console.log('KillTracker reset');
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
}

// Create singleton instance
export const killTracker = new KillTracker();

// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.killTracker = killTracker;
}
