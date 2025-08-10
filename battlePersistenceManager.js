// battlePersistenceManager.js - Bridge to Checkpoint System
// This module now serves as a compatibility layer, routing all battle persistence
// through the new checkpoint system while maintaining the existing API

import { getCheckpointSystem } from './checkpointSystem.js';

export class BattlePersistenceManager {
    constructor(roomManager, isHost) {
        this.roomManager = roomManager;
        this.isHost = isHost;
        
        // Get reference to checkpoint system
        this.checkpointSystem = getCheckpointSystem();
        
        // Maintain these for compatibility
        this.saveQueue = [];
        this.isSaving = false;
        this.lastSavedStateHash = null;
        this.lastSaveTime = 0;
        
        // Version for compatibility
        this.BATTLE_STATE_VERSION = '2.0.0'; // Updated to reflect checkpoint system
        
        console.log('📌 BattlePersistenceManager initialized as checkpoint bridge');
    }

    // ============================================
    // MAIN INTERFACE - Routes to Checkpoint System
    // ============================================

    /**
     * Save battle state - now creates a checkpoint
     * @param {Object} battleManager - The battle manager instance
     * @returns {boolean} Success status
     */
    async saveBattleState(battleManager) {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            console.warn('No room reference available for battle state save');
            return false;
        }

        // Initialize checkpoint system if needed
        if (!this.checkpointSystem.battleManager) {
            this.checkpointSystem.init(battleManager, this.roomManager, this.isHost);
        }

        try {
            // Delegate to checkpoint system
            const success = await this.checkpointSystem.saveCheckpoint('incremental');
            
            if (success) {
                this.lastSaveTime = Date.now();
                console.log('💾 Battle state saved via checkpoint system');
            }
            
            return success;

        } catch (error) {
            console.error('❌ Error saving battle state:', error);
            return false;
        }
    }

    /**
     * Load battle state - now loads from checkpoint
     * @returns {Object|null} Saved state or null
     */
    async loadBattleState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            console.warn('No room reference available for battle state load');
            return null;
        }

        try {
            // Load checkpoint from checkpoint system
            const checkpoint = await this.checkpointSystem.loadCheckpoint();
            
            if (!checkpoint) {
                console.log('📍 No checkpoint found');
                return null;
            }
            
            // Convert checkpoint format to legacy format for compatibility
            // This allows modules expecting the old format to still work
            const legacyFormat = this.convertCheckpointToLegacyFormat(checkpoint);
            
            console.log(`📥 Battle state loaded from checkpoint (turn ${checkpoint.turnNumber})`);
            return legacyFormat;

        } catch (error) {
            console.error('❌ Error loading battle state:', error);
            return null;
        }
    }

    /**
     * Restore battle state - now restores from checkpoint
     * @param {Object} battleManager - The battle manager instance
     * @param {Object} savedState - The saved state to restore
     * @returns {boolean} Success status
     */
    async restoreBattleState(battleManager, savedState) {
        if (!savedState) {
            console.error('No saved state provided for restoration');
            return false;
        }

        // Initialize checkpoint system if needed
        if (!this.checkpointSystem.battleManager) {
            this.checkpointSystem.init(battleManager, this.roomManager, this.isHost);
        }

        try {
            // If savedState is already in checkpoint format, use it directly
            if (savedState.version && savedState.checkpointType) {
                return await this.checkpointSystem.restoreFromCheckpoint(savedState);
            }
            
            // Otherwise, try to load the latest checkpoint
            const checkpoint = await this.checkpointSystem.loadCheckpoint();
            if (checkpoint) {
                return await this.checkpointSystem.restoreFromCheckpoint(checkpoint);
            }
            
            console.warn('⚠️ No checkpoint available for restoration');
            return false;

        } catch (error) {
            console.error('❌ Error restoring battle state:', error);
            return false;
        }
    }

    /**
     * Clear battle state - now clears checkpoint
     * @returns {boolean} Success status
     */
    async clearBattleState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            // Clear checkpoint
            const success = await this.checkpointSystem.clearCheckpoint();
            
            if (success) {
                console.log('🧹 Battle state cleared via checkpoint system');
            }
            
            return success;

        } catch (error) {
            console.error('❌ Error clearing battle state:', error);
            return false;
        }
    }

    /**
     * Check if battle state exists - now checks for checkpoint
     * @returns {boolean} Whether state exists
     */
    async hasBattleState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            const roomRef = this.roomManager.getRoomRef();
            const checkpointSnapshot = await roomRef.child('battleCheckpoint').once('value');
            const exists = checkpointSnapshot.exists();
            
            if (exists) {
                console.log('📍 Battle checkpoint exists');
            }
            
            return exists;
            
        } catch (error) {
            console.error('Error checking battle state existence:', error);
            return false;
        }
    }

    // ============================================
    // LEGACY COMPATIBILITY METHODS
    // ============================================

    /**
     * Export battle state - delegates to checkpoint system
     * @param {Object} battleManager - The battle manager instance
     * @returns {Object} Exported state
     */
    exportBattleState(battleManager) {
        // Initialize checkpoint system if needed
        if (!this.checkpointSystem.battleManager) {
            this.checkpointSystem.init(battleManager, this.roomManager, this.isHost);
        }
        
        // Create a checkpoint and return its data
        const checkpoint = this.checkpointSystem.createCheckpoint('export');
        
        if (checkpoint) {
            // Convert to legacy format if needed
            return this.convertCheckpointToLegacyFormat(checkpoint);
        }
        
        // Fallback to empty state
        return {
            version: this.BATTLE_STATE_VERSION,
            battleActive: false,
            currentTurn: 0
        };
    }

    /**
     * Convert checkpoint format to legacy format for compatibility
     * @param {Object} checkpoint - Checkpoint data
     * @returns {Object} Legacy formatted data
     */
    convertCheckpointToLegacyFormat(checkpoint) {
        if (!checkpoint) return null;
        
        return {
            // Metadata
            version: this.BATTLE_STATE_VERSION,
            lastUpdatedBy: this.isHost ? 'host' : 'guest',
            lastUpdatedAt: checkpoint.timestamp,
            saveHash: checkpoint.stateHash,
            
            // Battle state
            battleActive: checkpoint.battleState?.battleActive,
            currentTurn: checkpoint.battleState?.currentTurn,
            turnInProgress: checkpoint.battleState?.turnInProgress,
            
            // Heroes in legacy format
            hostHeroes: checkpoint.heroes?.player || {},
            guestHeroes: checkpoint.heroes?.opponent || {},
            
            // Formations
            hostFormation: checkpoint.formations?.player,
            guestFormation: checkpoint.formations?.opponent,
            
            // Other data
            battleLog: checkpoint.battleLog || [],
            
            // Extended state
            battleEffects: checkpoint.extendedState || {},
            battleMetrics: {
                totalDamageDealt: checkpoint.battleState?.totalDamageDealt || {},
                turnsElapsed: checkpoint.battleState?.currentTurn || 0
            },
            
            // Manager states
            statusEffectsState: checkpoint.managerStates?.statusEffects,
            randomnessState: checkpoint.randomState,
            
            // Connection state
            connectionState: checkpoint.networkState,
            
            // Mark as checkpoint-based
            isCheckpointBased: true,
            checkpointTurn: checkpoint.turnNumber,
            checkpointType: checkpoint.checkpointType
        };
    }

    /**
     * Queue a save for later - now just saves immediately via checkpoint
     * @param {Object} battleManager - The battle manager instance
     */
    queueSave(battleManager) {
        // In checkpoint system, we don't queue - we save at specific points
        console.log('📌 Save request received - will save at next checkpoint');
        this.saveQueue = []; // Clear queue
    }

    /**
     * Process queued saves - no longer needed with checkpoint system
     */
    async processQueuedSaves() {
        // No-op - checkpoint system handles timing
        this.saveQueue = [];
    }

    /**
     * Export hero states - compatibility wrapper
     */
    exportHeroStates(battleManager, absoluteSide) {
        if (!this.checkpointSystem.battleManager) {
            this.checkpointSystem.init(battleManager, this.roomManager, this.isHost);
        }
        
        const allHeroes = this.checkpointSystem.captureAllHeroStates();
        
        if (this.isHost) {
            return absoluteSide === 'host' ? allHeroes.player : allHeroes.opponent;
        } else {
            return absoluteSide === 'guest' ? allHeroes.player : allHeroes.opponent;
        }
    }

    /**
     * Export formation data - compatibility wrapper
     */
    exportFormation(battleManager, absoluteSide) {
        if (!this.checkpointSystem.battleManager) {
            this.checkpointSystem.init(battleManager, this.roomManager, this.isHost);
        }
        
        const formations = this.checkpointSystem.captureFormations();
        
        if (this.isHost) {
            return absoluteSide === 'host' ? formations.player : formations.opponent;
        } else {
            return absoluteSide === 'guest' ? formations.player : formations.opponent;
        }
    }

    /**
     * Restore hero states - compatibility wrapper
     */
    restoreHeroStates(battleManager, savedState) {
        // This is handled by checkpoint restoration
        console.log('📌 Hero states restoration handled by checkpoint system');
    }

    /**
     * Update battle visuals - compatibility wrapper
     */
    updateBattleVisuals(battleManager, savedState) {
        // This is handled by checkpoint restoration
        if (this.checkpointSystem.battleManager) {
            this.checkpointSystem.updateAllVisuals();
        }
    }

    /**
     * Validate state version - compatibility wrapper
     */
    validateStateVersion(version) {
        if (!version) return false;
        
        const [major] = version.split('.');
        const [currentMajor] = this.BATTLE_STATE_VERSION.split('.');
        
        return major === currentMajor;
    }

    /**
     * Sanitize for Firebase - still needed
     */
    sanitizeForFirebase(obj) {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeForFirebase(item)).filter(item => item !== undefined);
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const sanitizedValue = this.sanitizeForFirebase(value);
            if (sanitizedValue !== undefined) {
                sanitized[key] = sanitizedValue;
            }
        }
        return sanitized;
    }

    /**
     * Generate state hash - delegates to checkpoint system
     */
    generateStateHash(state) {
        return this.checkpointSystem.calculateStateHash(state);
    }

    /**
     * Get speed adjusted delay - compatibility
     */
    getSpeedAdjustedDelay(ms, battleManager = null) {
        if (battleManager && battleManager.speedManager) {
            return battleManager.speedManager.calculateAdjustedDelay(ms);
        } else if (battleManager && battleManager.battleSpeed) {
            return Math.max(1, Math.floor(ms / battleManager.battleSpeed));
        }
        return ms;
    }

    /**
     * Cleanup method
     */
    cleanup() {
        this.saveQueue = [];
        this.isSaving = false;
        this.lastSavedStateHash = null;
        console.log('📌 BattlePersistenceManager cleanup completed');
    }

    // ============================================
    // DEPRECATED METHODS - Log warnings
    // ============================================

    exportCreatureStates(creatures) {
        console.warn('⚠️ exportCreatureStates is deprecated - use checkpoint system');
        return creatures || [];
    }

    restoreCreatureStates(hero, savedCreatures) {
        console.warn('⚠️ restoreCreatureStates is deprecated - use checkpoint system');
    }

    restoreFormations(battleManager, savedState) {
        console.warn('⚠️ restoreFormations is deprecated - use checkpoint system');
    }

    restoreExtensibleState(battleManager, savedState) {
        console.warn('⚠️ restoreExtensibleState is deprecated - use checkpoint system');
    }

    restoreConnectionState(battleManager, connectionState) {
        console.warn('⚠️ restoreConnectionState is deprecated - use checkpoint system');
    }

    validateBattleState(savedState) {
        console.warn('⚠️ validateBattleState is deprecated - use checkpoint system');
        return true;
    }

    // ============================================
    // STATIC METHODS FOR MODULE COMPATIBILITY
    // ============================================

    static async quickSave(battleManager, roomManager, isHost) {
        const instance = new BattlePersistenceManager(roomManager, isHost);
        return await instance.saveBattleState(battleManager);
    }

    static async quickLoad(roomManager, isHost) {
        const instance = new BattlePersistenceManager(roomManager, isHost);
        return await instance.loadBattleState();
    }

    static async quickRestore(battleManager, roomManager, isHost) {
        const instance = new BattlePersistenceManager(roomManager, isHost);
        const state = await instance.loadBattleState();
        if (state) {
            return await instance.restoreBattleState(battleManager, state);
        }
        return false;
    }
}

// Export for compatibility
export default BattlePersistenceManager;