// battlePersistenceManager.js - Enhanced Battle State Persistence Manager with Necromancy Module Support

import { NecromancyUtils } from './Abilities/necromancy.js'; // NEW IMPORT

export class BattlePersistenceManager {
    constructor(roomManager, isHost) {
        this.roomManager = roomManager;
        this.isHost = isHost;
        this.saveQueue = [];
        this.isSaving = false;
        this.lastSavedStateHash = null;
        this.baseSaveThrottleDelay = 100; // Base minimum time between saves (ms)
        this.lastSaveTime = 0;
        
        // Battle state version for future expansion - UPDATED for necromancy support
        this.BATTLE_STATE_VERSION = '1.1.0'; 
        
        console.log('BattlePersistenceManager initialized for', isHost ? 'HOST' : 'GUEST', 'with necromancy persistence support');
    }

    // Save complete battle state to Firebase (enhanced with connection state)
    async saveBattleState(battleManager) {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            console.warn('No room reference available for battle state save');
            return false;
        }

        // Calculate speed-adjusted throttle delay
        const currentThrottleDelay = this.getSpeedAdjustedDelay(this.baseSaveThrottleDelay, battleManager);
        
        // Only save if enough time has passed (throttling)
        const now = Date.now();
        if (now - this.lastSaveTime < currentThrottleDelay) {
            // Queue the save for later
            this.queueSave(battleManager);
            return false;
        }

        try {
            const battleState = this.exportBattleState(battleManager);
            const stateHash = this.generateStateHash(battleState);
            
            // Skip save if state hasn't changed
            if (stateHash === this.lastSavedStateHash) {
                return false;
            }

            this.isSaving = true;
            this.lastSaveTime = now;

            const roomRef = this.roomManager.getRoomRef();
            const battleStateRef = roomRef.child('battleState');
            
            // Save with timestamp and version info
            const persistentState = {
                ...battleState,
                version: this.BATTLE_STATE_VERSION,
                lastUpdatedBy: this.isHost ? 'host' : 'guest',
                lastUpdatedAt: Date.now(),
                saveHash: stateHash
            };

            await battleStateRef.set(this.sanitizeForFirebase(persistentState));
            
            this.lastSavedStateHash = stateHash;
            
            const pauseInfo = battleState.connectionState?.battlePaused ? ' (PAUSED)' : '';
            console.log(`✅ Battle state with creatures saved by ${this.isHost ? 'HOST' : 'GUEST'} (Turn ${battleState.currentTurn})${pauseInfo}`);
            
            // Mark battle as active in gameState for reconnection detection
            await roomRef.child('gameState').update({
                battleActive: true,
                battleStarted: true,
                lastBattleStateUpdate: Date.now(),
                battlePaused: battleState.connectionState?.battlePaused || false
            });

            return true;

        } catch (error) {
            console.error('❌ Error saving battle state:', error);
            return false;
        } finally {
            this.isSaving = false;
            this.processQueuedSaves();
        }
    }

    // Export complete battle state (enhanced with connection awareness)
    exportBattleState(battleManager) {
        const baseState = {
            // Core battle parameters
            battleActive: battleManager.battleActive,
            currentTurn: battleManager.currentTurn,
            turnInProgress: battleManager.turnInProgress,
            
            // Hero states with complete information INCLUDING CREATURES
            hostHeroes: this.exportHeroStates(battleManager, 'host'),
            guestHeroes: this.exportHeroStates(battleManager, 'guest'),
            
            // Battle log for synchronization
            battleLog: battleManager.battleLog.slice(-50), // Keep last 50 entries
            
            // Formation data
            hostFormation: this.exportFormation(battleManager, 'host'),
            guestFormation: this.exportFormation(battleManager, 'guest'),
            
            // Authority and sync info
            authoritativeHost: this.isHost && battleManager.isAuthoritative,
            
            // Extensible sections for future features
            battleEffects: {
                globalEffects: battleManager.globalEffects || [],
                heroEffects: battleManager.heroEffects || {},
                fieldEffects: battleManager.fieldEffects || []
            },
            
            battleMetrics: {
                totalDamageDealt: battleManager.totalDamageDealt || {},
                abilitiesUsed: battleManager.abilitiesUsed || {},
                turnsElapsed: battleManager.currentTurn
            },
            
            advancedState: {
                weatherEffects: battleManager.weatherEffects || null,
                terrainModifiers: battleManager.terrainModifiers || [],
                specialRules: battleManager.specialRules || []
            }
        };

        // NEW: Add connection-aware state (only for host)
        if (this.isHost && battleManager.isAuthoritative) {
            baseState.connectionState = {
                opponentConnected: battleManager.opponentConnected,
                battlePaused: battleManager.battlePaused,
                pauseStartTime: battleManager.pauseStartTime,
                totalPauseTime: battleManager.totalPauseTime,
                lastConnectionCheck: Date.now()
            };
        }

        return baseState;
    }

    // Restore battle manager from saved state (enhanced with creatures)
    async restoreBattleState(battleManager, savedState) {
        if (!savedState) {
            console.error('No saved state provided for restoration');
            return false;
        }

        try {
            console.log('🔄 Restoring battle state with creatures from Firebase...');

            // Restore core battle parameters
            battleManager.battleActive = savedState.battleActive;
            battleManager.currentTurn = savedState.currentTurn;
            battleManager.turnInProgress = savedState.turnInProgress || false;
            
            // Restore battle log
            battleManager.battleLog = savedState.battleLog || [];

            // Restore hero states INCLUDING CREATURES
            this.restoreHeroStates(battleManager, savedState);

            // Restore formations
            this.restoreFormations(battleManager, savedState);

            // Update visual elements INCLUDING CREATURE VISUALS
            this.updateBattleVisuals(battleManager, savedState);

            // Restore extensible state (for future features)
            this.restoreExtensibleState(battleManager, savedState);

            // NEW: Restore connection-aware state (only for host)
            if (this.isHost && savedState.connectionState) {
                this.restoreConnectionState(battleManager, savedState.connectionState);
            }

            console.log('✅ Battle state restoration with creatures completed');
            return true;

        } catch (error) {
            console.error('❌ Error restoring battle state:', error);
            return false;
        }
    }

    // NEW: Restore connection-aware state
    restoreConnectionState(battleManager, connectionState) {
        if (!battleManager.isAuthoritative) return;

        battleManager.opponentConnected = connectionState.opponentConnected !== false; // Default to true
        battleManager.battlePaused = connectionState.battlePaused || false;
        battleManager.totalPauseTime = connectionState.totalPauseTime || 0;
        
        // Don't restore pauseStartTime - let it be set fresh if needed
        battleManager.pauseStartTime = null;

        console.log('🔄 Connection state restored:', {
            opponentConnected: battleManager.opponentConnected,
            battlePaused: battleManager.battlePaused,
            totalPauseTime: battleManager.totalPauseTime
        });

        // If battle was paused when saved, show pause UI
        if (battleManager.battlePaused) {
            console.log('⏸️ Battle was paused when saved - showing pause UI');
            battleManager.showBattlePauseUI('Battle was paused (restored from save)');
        }
    }

    // Enhanced state hash generation to include creatures and connection state
    generateStateHash(state) {
        const stateForHash = {
            turn: state.currentTurn,
            hostHeroes: state.hostHeroes,
            guestHeroes: state.guestHeroes,
            battleActive: state.battleActive,
            // Include pause state in hash so pauses trigger saves
            battlePaused: state.connectionState?.battlePaused || false,
            // NEW: Include necromancy stacks in hash using module utility
            necromancyData: NecromancyUtils.extractNecromancyData(state)
        };
        
        const stateString = JSON.stringify(stateForHash);
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < stateString.length; i++) {
            const char = stateString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    // Enhanced validation to check creatures and connection state
    validateBattleState(savedState) {
        if (!savedState || typeof savedState !== 'object') return false;
        
        // Basic validation
        if (typeof savedState.battleActive !== 'boolean') return false;
        if (typeof savedState.currentTurn !== 'number') return false;
        
        // Validate connection state if present
        if (savedState.connectionState) {
            const connState = savedState.connectionState;
            if (typeof connState.battlePaused !== 'boolean') return false;
            if (connState.totalPauseTime && typeof connState.totalPauseTime !== 'number') return false;
        }
        
        return true;
    }

    // Clear battle state from Firebase (enhanced)
    async clearBattleState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            const roomRef = this.roomManager.getRoomRef();
            
            // Clear battle state and mark battle as inactive
            await Promise.all([
                roomRef.child('battleState').remove(),
                roomRef.child('gameState').update({
                    battleActive: false,
                    battleStarted: false,
                    battlePaused: false,
                    lastBattleStateUpdate: null
                })
            ]);

            console.log('🧹 Battle state with creatures cleared from Firebase');
            return true;

        } catch (error) {
            console.error('❌ Error clearing battle state:', error);
            return false;
        }
    }

    // Queue a save for later (throttling)
    queueSave(battleManager) {
        // Replace any existing queued save
        this.saveQueue = [battleManager];
        
        // Calculate speed-adjusted throttle delay
        const currentThrottleDelay = this.getSpeedAdjustedDelay(this.baseSaveThrottleDelay, battleManager);
        
        // Process queue after throttle delay
        setTimeout(() => {
            this.processQueuedSaves();
        }, currentThrottleDelay);
    }

    // Process any queued saves
    async processQueuedSaves() {
        if (this.isSaving || this.saveQueue.length === 0) {
            return;
        }

        const battleManager = this.saveQueue.pop();
        this.saveQueue = []; // Clear queue
        
        await this.saveBattleState(battleManager);
    }

    // Export hero states with absolute side perspective INCLUDING CREATURES AND NECROMANCY
    exportHeroStates(battleManager, absoluteSide) {
        // Determine which heroes belong to which absolute side
        let heroes;
        if (this.isHost) {
            // For host: playerHeroes = host, opponentHeroes = guest
            heroes = absoluteSide === 'host' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        } else {
            // For guest: playerHeroes = guest, opponentHeroes = host  
            heroes = absoluteSide === 'guest' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        }

        const heroStates = {};
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero) {
                heroStates[position] = {
                    // Basic hero data
                    id: hero.id,
                    name: hero.name,
                    image: hero.image,
                    
                    // Combat stats
                    currentHp: hero.currentHp,
                    maxHp: hero.maxHp,
                    atk: hero.atk,
                    alive: hero.alive,
                    
                    // Position and side info
                    position: hero.position,
                    absoluteSide: absoluteSide,
                    
                    // CREATURES STATE
                    creatures: this.exportCreatureStates(hero.creatures),
                    
                    // NEW: Necromancy stacks persistence using module utility
                    ...NecromancyUtils.extractNecromancyDataFromHero(hero),
                    
                    // Extensible hero state
                    statusEffects: hero.statusEffects || [],
                    temporaryModifiers: hero.temporaryModifiers || {},
                    combatHistory: hero.combatHistory || [],
                    
                    // Future expansion slots
                    customStats: hero.customStats || {},
                    heroAbilities: hero.heroAbilities || [],
                    equipmentEffects: hero.equipmentEffects || []
                };
            }
        });

        return heroStates;
    }

    // NEW: Export creature states with full combat information
    exportCreatureStates(creatures) {
        if (!creatures || !Array.isArray(creatures)) {
            return [];
        }

        return creatures.map(creature => {
            return {
                // Basic creature identification
                name: creature.name,
                image: creature.image,
                
                // Combat stats - PERSISTENT
                currentHp: creature.currentHp,
                maxHp: creature.maxHp,
                atk: creature.atk,
                alive: creature.alive,
                
                // Additional creature data that might be needed
                originalStats: {
                    baseHp: creature.maxHp,
                    baseAtk: creature.atk
                },
                
                // Creature-specific status effects
                statusEffects: creature.statusEffects || [],
                temporaryModifiers: creature.temporaryModifiers || {},
                
                // Combat history for this creature
                damageHistory: creature.damageHistory || [],
                
                // Future expansion for creature-specific features
                creatureAbilities: creature.creatureAbilities || [],
                equipment: creature.equipment || [],
                
                // Metadata
                createdAt: creature.createdAt || Date.now(),
                lastDamaged: creature.lastDamaged || null
            };
        });
    }

    // Export formation data with absolute sides
    exportFormation(battleManager, absoluteSide) {
        let formation;
        if (this.isHost) {
            formation = absoluteSide === 'host' ? battleManager.playerFormation : battleManager.opponentFormation;
        } else {
            formation = absoluteSide === 'guest' ? battleManager.playerFormation : battleManager.opponentFormation;
        }

        return {
            left: formation?.left || null,
            center: formation?.center || null,
            right: formation?.right || null,
            formationBonus: formation?.formationBonus || null, // For future formation effects
            customArrangement: formation?.customArrangement || null
        };
    }

    // Load battle state from Firebase
    async loadBattleState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            console.warn('No room reference available for battle state load');
            return null;
        }

        try {
            const battleStateRef = this.roomManager.getRoomRef().child('battleState');
            const snapshot = await battleStateRef.once('value');
            const battleState = snapshot.val();

            if (!battleState) {
                console.log('No battle state found in Firebase');
                return null;
            }

            // Validate state version
            if (!this.validateStateVersion(battleState.version)) {
                console.warn('Battle state version mismatch, attempting migration...');
                // In the future, implement state migration here
            }

            const pauseInfo = battleState.connectionState?.battlePaused ? ' (PAUSED)' : '';
            console.log(`📥 Battle state with creatures loaded from Firebase (Turn ${battleState.currentTurn})${pauseInfo}`);
            console.log(`Last updated by: ${battleState.lastUpdatedBy} at ${new Date(battleState.lastUpdatedAt)}`);

            return battleState;

        } catch (error) {
            console.error('❌ Error loading battle state:', error);
            return null;
        }
    }

    // Restore hero states from saved data INCLUDING CREATURES AND NECROMANCY
    restoreHeroStates(battleManager, savedState) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';

        // Restore player heroes (my side)
        const myHeroStates = savedState[`${myAbsoluteSide}Heroes`] || {};
        ['left', 'center', 'right'].forEach(position => {
            const savedHero = myHeroStates[position];
            if (savedHero && battleManager.playerHeroes[position]) {
                const hero = battleManager.playerHeroes[position];
                
                // Restore basic hero stats
                hero.currentHp = savedHero.currentHp;
                hero.maxHp = savedHero.maxHp;
                hero.atk = savedHero.atk;
                hero.alive = savedHero.alive;
                hero.absoluteSide = savedHero.absoluteSide;
                
                // NEW: Restore necromancy stacks using the saved data
                hero.necromancyStacks = savedHero.necromancyStacks || 0;
                hero.maxNecromancyStacks = savedHero.maxNecromancyStacks || 0;
                
                // Restore extensible hero properties
                hero.statusEffects = savedHero.statusEffects || [];
                hero.temporaryModifiers = savedHero.temporaryModifiers || {};
                hero.combatHistory = savedHero.combatHistory || [];
                hero.customStats = savedHero.customStats || {};
                hero.heroAbilities = savedHero.heroAbilities || [];
                hero.equipmentEffects = savedHero.equipmentEffects || [];
                
                // RESTORE CREATURES
                if (savedHero.creatures) {
                    this.restoreCreatureStates(hero, savedHero.creatures);
                }
                
                console.log(`Restored ${hero.name} with ${hero.necromancyStacks}/${hero.maxNecromancyStacks} necromancy stacks`);
            }
        });

        // Restore opponent heroes
        const opponentHeroStates = savedState[`${opponentAbsoluteSide}Heroes`] || {};
        ['left', 'center', 'right'].forEach(position => {
            const savedHero = opponentHeroStates[position];
            if (savedHero && battleManager.opponentHeroes[position]) {
                const hero = battleManager.opponentHeroes[position];
                
                // Restore basic hero stats
                hero.currentHp = savedHero.currentHp;
                hero.maxHp = savedHero.maxHp;
                hero.atk = savedHero.atk;
                hero.alive = savedHero.alive;
                hero.absoluteSide = savedHero.absoluteSide;
                
                // NEW: Restore necromancy stacks using the saved data
                hero.necromancyStacks = savedHero.necromancyStacks || 0;
                hero.maxNecromancyStacks = savedHero.maxNecromancyStacks || 0;
                
                // Restore extensible hero properties
                hero.statusEffects = savedHero.statusEffects || [];
                hero.temporaryModifiers = savedHero.temporaryModifiers || {};
                hero.combatHistory = savedHero.combatHistory || [];
                hero.customStats = savedHero.customStats || {};
                hero.heroAbilities = savedHero.heroAbilities || [];
                hero.equipmentEffects = savedHero.equipmentEffects || [];
                
                // RESTORE CREATURES
                if (savedHero.creatures) {
                    this.restoreCreatureStates(hero, savedHero.creatures);
                }
                
                console.log(`Restored opponent ${hero.name} with ${hero.necromancyStacks}/${hero.maxNecromancyStacks} necromancy stacks`);
            }
        });

        console.log('🦸 Hero states with creatures and necromancy stacks restored from Firebase');
    }

    // NEW: Restore creature states with full combat information
    restoreCreatureStates(hero, savedCreatures) {
        if (!savedCreatures || !Array.isArray(savedCreatures)) {
            hero.creatures = [];
            return;
        }

        hero.creatures = savedCreatures.map(savedCreature => {
            return {
                // Basic creature identification
                name: savedCreature.name,
                image: savedCreature.image,
                
                // Combat stats - RESTORED
                currentHp: savedCreature.currentHp,
                maxHp: savedCreature.maxHp,
                atk: savedCreature.atk,
                alive: savedCreature.alive,
                
                // Restore additional creature data
                statusEffects: savedCreature.statusEffects || [],
                temporaryModifiers: savedCreature.temporaryModifiers || {},
                damageHistory: savedCreature.damageHistory || [],
                
                // Future expansion data
                creatureAbilities: savedCreature.creatureAbilities || [],
                equipment: savedCreature.equipment || [],
                
                // Metadata
                createdAt: savedCreature.createdAt || Date.now(),
                lastDamaged: savedCreature.lastDamaged || null
            };
        });

        console.log(`🐾 Restored ${hero.creatures.length} creatures for ${hero.name}, alive: ${hero.creatures.filter(c => c.alive).length}`);
    }

    // Restore formation data
    restoreFormations(battleManager, savedState) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';

        // Restore my formation
        const myFormation = savedState[`${myAbsoluteSide}Formation`];
        if (myFormation) {
            battleManager.playerFormation = {
                left: myFormation.left,
                center: myFormation.center,
                right: myFormation.right,
                formationBonus: myFormation.formationBonus,
                customArrangement: myFormation.customArrangement
            };
        }

        // Restore opponent formation
        const opponentFormation = savedState[`${opponentAbsoluteSide}Formation`];
        if (opponentFormation) {
            battleManager.opponentFormation = {
                left: opponentFormation.left,
                center: opponentFormation.center,
                right: opponentFormation.right,
                formationBonus: opponentFormation.formationBonus,
                customArrangement: opponentFormation.customArrangement
            };
        }

        console.log('🏺 Formations restored from Firebase');
    }

    // Update battle visuals after restoration INCLUDING NECROMANCY DISPLAYS
    updateBattleVisuals(battleManager, savedState) {
        // Update health bars and visual states
        ['left', 'center', 'right'].forEach(position => {
            // Update player heroes visuals
            if (battleManager.playerHeroes[position]) {
                const hero = battleManager.playerHeroes[position];
                battleManager.updateHeroHealthBar('player', position, hero.currentHp, hero.maxHp);
                
                if (!hero.alive) {
                    battleManager.handleHeroDeath(hero);
                } else {
                    battleManager.resetHeroVisualState('player', position);
                }
                
                // UPDATE CREATURE VISUALS
                battleManager.updateCreatureVisuals('player', position, hero.creatures);
                
                // NEW: Update necromancy stack display using the battle manager's module
                if (battleManager.necromancyManager) {
                    battleManager.necromancyManager.updateNecromancyStackDisplay('player', position, hero.necromancyStacks);
                }
            }

            // Update opponent heroes visuals
            if (battleManager.opponentHeroes[position]) {
                const hero = battleManager.opponentHeroes[position];
                battleManager.updateHeroHealthBar('opponent', position, hero.currentHp, hero.maxHp);
                
                if (!hero.alive) {
                    battleManager.handleHeroDeath(hero);
                } else {
                    battleManager.resetHeroVisualState('opponent', position);
                }
                
                // UPDATE CREATURE VISUALS
                battleManager.updateCreatureVisuals('opponent', position, hero.creatures);
                
                // NEW: Update necromancy stack display using the battle manager's module
                if (battleManager.necromancyManager) {
                    battleManager.necromancyManager.updateNecromancyStackDisplay('opponent', position, hero.necromancyStacks);
                }
            }
        });

        // Restore battle log messages
        if (savedState.battleLog && battleManager.battleScreen) {
            savedState.battleLog.forEach(logEntry => {
                if (logEntry.message) {
                    battleManager.battleScreen.addCombatLogMessage(logEntry.message, logEntry.type || 'info');
                }
            });
        }

        console.log('🎨 Battle visuals with creature states and necromancy displays updated after restoration');
    }

    // Restore extensible state for future features
    restoreExtensibleState(battleManager, savedState) {
        // Battle effects restoration
        if (savedState.battleEffects) {
            battleManager.globalEffects = savedState.battleEffects.globalEffects || [];
            battleManager.heroEffects = savedState.battleEffects.heroEffects || {};
            battleManager.fieldEffects = savedState.battleEffects.fieldEffects || [];
        }

        // Battle metrics restoration
        if (savedState.battleMetrics) {
            battleManager.totalDamageDealt = savedState.battleMetrics.totalDamageDealt || {};
            battleManager.abilitiesUsed = savedState.battleMetrics.abilitiesUsed || {};
        }

        // Advanced state restoration
        if (savedState.advancedState) {
            battleManager.weatherEffects = savedState.advancedState.weatherEffects;
            battleManager.terrainModifiers = savedState.advancedState.terrainModifiers || [];
            battleManager.specialRules = savedState.advancedState.specialRules || [];
        }

        console.log('🔮 Extensible state restored for future features');
    }

    // Utility: Check if battle state exists in Firebase
    async hasBattleState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            const battleStateRef = this.roomManager.getRoomRef().child('battleState');
            const snapshot = await battleStateRef.once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Error checking battle state existence:', error);
            return false;
        }
    }

    // Utility: Validate state version for future compatibility
    validateStateVersion(version) {
        if (!version) return false;
        
        const [major] = version.split('.');
        const [currentMajor] = this.BATTLE_STATE_VERSION.split('.');
        
        return major === currentMajor;
    }

    // Utility: Sanitize data for Firebase (remove undefined values)
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

    // Cleanup method
    cleanup() {
        this.saveQueue = [];
        this.isSaving = false;
        this.lastSavedStateHash = null;
        console.log('BattlePersistenceManager cleanup completed');
    }

    getSpeedAdjustedDelay(ms, battleManager = null) {
        // Try to get speed from battle manager if provided
        if (battleManager && battleManager.speedManager) {
            return battleManager.speedManager.calculateAdjustedDelay(ms);
        } else if (battleManager && battleManager.battleSpeed) {
            return Math.max(1, Math.floor(ms / battleManager.battleSpeed));
        }
        // For persistence operations, we might want to keep them at normal speed
        // since they're background operations that don't affect visual timing
        return ms;
    }
}