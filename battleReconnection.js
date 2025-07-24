// battleReconnection.js - Enhanced Battle Reconnection Manager with Pause Support

export class BattleReconnectionManager {
    constructor(heroSelection) {
        this.heroSelection = heroSelection;
        this.roomManager = heroSelection.roomManager;
        this.gameDataSender = heroSelection.gameDataSender;
        this.isHost = heroSelection.isHost;
        
        // Reconnection state tracking
        this.reconnectionInProgress = false;
        this.reconnectionAttempts = 0;
        this.maxReconnectionAttempts = 3;
        
        console.log('BattleReconnectionManager initialized with pause support and Firebase persistence');
    }

    // Main entry point - detect and handle battle reconnection using Firebase
    async detectAndHandleBattleReconnection(gameState) {
        const battleStarted = gameState.battleStarted || false;
        const battleActive = gameState.battleActive || false;
        const battlePaused = gameState.battlePaused || false;
        const battleInProgress = battleStarted && battleActive;

        if (!battleInProgress) {
            console.log('No active battle detected during reconnection');
            return false;
        }

        // Additional validation: Check if battle state actually exists in Firebase
        const battleStateExists = await this.checkBattleStateExists();
        if (!battleStateExists) {
            console.log('⚠️ Battle flags set but no battle state found - clearing stale flags');
            
            // Clear stale battle flags
            try {
                await this.roomManager.getRoomRef().child('gameState').update({
                    battleStarted: false,
                    battleActive: false,
                    battlePaused: false,
                    lastBattleStateUpdate: null
                });
                console.log('✅ Cleared stale battle flags');
            } catch (error) {
                console.error('Error clearing stale battle flags:', error);
            }
            
            return false;
        }

        // Additional check: Verify the battle state is valid and not corrupted
        const battleStateMetadata = await this.getBattleStateMetadata();
        if (battleStateMetadata.exists && battleStateMetadata.currentTurn === undefined) {
            console.log('⚠️ Battle state exists but appears corrupted - clearing');
            
            try {
                await this.roomManager.getRoomRef().child('battleState').remove();
                await this.roomManager.getRoomRef().child('gameState').update({
                    battleStarted: false,
                    battleActive: false,
                    battlePaused: false,
                    lastBattleStateUpdate: null
                });
                console.log('✅ Cleared corrupted battle state');
            } catch (error) {
                console.error('Error clearing corrupted battle state:', error);
            }
            
            return false;
        }

        console.log('🔥 BATTLE RECONNECTION DETECTED - Using Firebase persistence...');
        if (battlePaused) {
            console.log('⏸️ Battle is currently paused - will handle pause state');
        }
        
        // Set phase to battle_active to prevent normal flow
        this.heroSelection.currentPhase = 'battle_active';
        this.reconnectionInProgress = true;
        
        // Initialize battle screen immediately
        const battleInitialized = this.heroSelection.initBattleScreen();
        if (!battleInitialized) {
            console.error('Failed to initialize battle screen for reconnection');
            return false;
        }
        
        // Show battle arena immediately  
        this.showBattleArena();
        
        // Handle reconnection using Firebase persistence
        const reconnectionSuccess = await this.handleFirebaseBattleReconnection(battlePaused);
        
        if (reconnectionSuccess) {
            this.completeReconnection();
            return true;
        } else {
            console.error('❌ Firebase battle reconnection failed');
            return false;
        }
    }

    // Enhanced: Handle battle reconnection with pause state awareness
    async handleFirebaseBattleReconnection(battleWasPaused = false) {
        try {
            // Signal that we're reconnecting
            await this.signalReconnecting();
            
            console.log('🔥 RECONNECTION: Loading battle state from Firebase persistence...');
            
            // Add initial messages to combat log
            this.addCombatLog('🔄 Reconnecting to ongoing battle...', 'info');
            
            if (battleWasPaused) {
                this.addCombatLog('⏸️ Battle was paused when you disconnected', 'warning');
            }
            
            this.addCombatLog('📡 Loading battle state from Firebase...', 'info');
            
            // Get the battle manager from the battle screen
            const battleManager = this.heroSelection.battleScreen?.battleManager;
            if (!battleManager) {
                console.error('❌ No battle manager available for reconnection');
                return false;
            }

            // Check if battle manager has persistence support
            if (!battleManager.persistenceManager) {
                console.error('❌ Battle manager does not have persistence support');
                return false;
            }

            // Attempt to restore battle state from Firebase
            const restoredFromPersistence = await battleManager.restoreFromPersistence();
            
            if (restoredFromPersistence) {
                console.log('✅ Battle state successfully restored from Firebase');
                this.addCombatLog('✅ Battle state restored from Firebase!', 'success');
                
                // Verify the restored state is valid
                if (!battleManager.battleActive || battleManager.currentTurn === 0) {
                    console.warn('⚠️ Restored battle state appears invalid');
                    this.addCombatLog('⚠️ Battle state appears invalid, restarting...', 'warning');
                    return await this.fallbackRestartBattle();
                }
                
                // Handle different reconnection scenarios
                if (battleManager.battlePaused) {
                    this.addCombatLog('⏸️ Battle is paused - waiting for opponent', 'warning');
                    this.addCombatLog('⏳ Battle will resume when connection is stable', 'info');
                } else {
                    this.addCombatLog('⚔️ Battle continues from saved state...', 'info');
                }
                
                // Mark player as reconnected in Firebase
                await this.markPlayerReconnected();
                
                // NEW: Handle host reconnection - resume battle if it was paused for connection
                if (this.isHost && battleManager.isAuthoritative) {
                    await this.handleHostReconnection(battleManager);
                } else {
                    // Guest reconnection - let the host's connection monitoring handle resume
                    console.log('📺 GUEST: Reconnected, host will handle resume if needed');
                }
                
                // Signal that we're ready to resume
                await this.signalReconnectionReady();
                
                return true;                
            } else {
                console.warn('⚠️ No battle state found in Firebase, attempting fallback...');
                this.addCombatLog('⚠️ No saved battle state found', 'warning');
                
                // Fallback: restart battle from beginning
                return await this.fallbackRestartBattle();
            }

        } catch (error) {
            // Clear reconnecting flag on error
            await this.clearReconnectingFlag();
            throw error;
        }
    }

    async signalReconnecting() {
        if (this.isHost) return; // Only guest needs to signal
        
        try {
            console.log('📡 GUEST: Signaling reconnection in progress...');
            await this.roomManager.getRoomRef().update({
                guestReconnecting: true,
                guestReconnectingAt: Date.now()
            });
        } catch (error) {
            console.error('Error signaling reconnection:', error);
        }
    }

    async signalReconnectionReady() {
        if (this.isHost) return; // Only guest needs to signal
        
        try {
            console.log('📡 GUEST: Signaling ready after reconnection...');
            
            // Clear reconnecting flag
            await this.roomManager.getRoomRef().update({
                guestReconnecting: false,
                guestReconnectionReady: Date.now()
            });
            
            // Send ready signal via P2P
            if (this.gameDataSender) {
                this.gameDataSender('battle_data', {
                    type: 'guest_reconnection_ready',
                    timestamp: Date.now()
                });
            }
            
            this.addCombatLog('✅ Ready to resume battle!', 'success');
        } catch (error) {
            console.error('Error signaling reconnection ready:', error);
        }
    }

    async clearReconnectingFlag() {
        if (this.isHost) return;
        
        try {
            await this.roomManager.getRoomRef().update({
                guestReconnecting: false
            });
        } catch (error) {
            console.error('Error clearing reconnecting flag:', error);
        }
    }

    // NEW: Handle host reconnection with pause management
    async handleHostReconnection(battleManager) {
        console.log('🏛️ HOST: Handling reconnection with pause management');
        
        // Check if battle was paused due to host disconnection
        if (battleManager.battlePaused) {
            console.log('🏛️ HOST: Battle was paused, checking if should resume...');
            
            // Re-check opponent connection status
            const roomRef = this.roomManager.getRoomRef();
            if (roomRef) {
                try {
                    const snapshot = await roomRef.once('value');
                    const room = snapshot.val();
                    
                    if (room && room.guestOnline) {
                        console.log('🏛️ HOST: Guest is online, resuming battle');
                        await battleManager.resumeBattle('Host reconnected, guest is online');
                        
                        // Resume battle loop if needed
                        if (battleManager.battleActive && !battleManager.checkBattleEnd()) {
                            setTimeout(() => {
                                battleManager.authoritative_battleLoop();
                            }, 1000);
                        }
                    } else {
                        console.log('🏛️ HOST: Guest is offline, keeping battle paused');
                        this.addCombatLog('⏸️ Guest is offline - battle remains paused', 'warning');
                    }
                } catch (error) {
                    console.error('Error checking guest status:', error);
                }
            }
        } else {
            // Battle wasn't paused - resume normal simulation
            console.log('🏛️ HOST: Battle was not paused, resuming normal simulation');
            
            if (battleManager.battleActive && !battleManager.checkBattleEnd()) {
                setTimeout(() => {
                    battleManager.authoritative_battleLoop();
                }, 1000);
            }
        }
    }

    // Mark player as reconnected in Firebase (enhanced)
    async markPlayerReconnected() {
        try {
            const roomRef = this.roomManager.getRoomRef();
            const updateData = {
                [`${this.isHost ? 'host' : 'guest'}ReconnectedAt`]: Date.now(),
                [`${this.isHost ? 'host' : 'guest'}Online`]: true,
                lastBattleReconnection: Date.now()
            };
            
            await roomRef.update(updateData);
            console.log(`📡 Marked ${this.isHost ? 'HOST' : 'GUEST'} as reconnected and online in Firebase`);
            
        } catch (error) {
            console.error('Error marking player as reconnected:', error);
        }
    }

    // Show battle arena and hide team building UI
    showBattleArena() {
        const heroSelectionScreen = document.querySelector('.hero-selection-screen');
        if (heroSelectionScreen) {
            heroSelectionScreen.style.display = 'none';
        }
        
        this.heroSelection.battleScreen.showBattleArena();
        console.log('Battle arena displayed for Firebase reconnection');
    }

    // Enhanced: Fallback restart with pause state cleanup
    async fallbackRestartBattle() {
        console.log('🔄 FALLBACK: Restarting battle from beginning...');
        this.addCombatLog('🔄 Restarting battle from beginning...', 'warning');
        
        try {
            // Get the battle manager
            const battleManager = this.heroSelection.battleScreen?.battleManager;
            if (!battleManager) {
                console.error('❌ No battle manager for fallback restart');
                return false;
            }

            // Force refresh battle state to clean slate
            battleManager.forceRefreshBattleState();
            
            // Clear any existing battle state in Firebase
            if (battleManager.persistenceManager) {
                await battleManager.persistenceManager.clearBattleState();
            }
            
            // Mark battle as restarted in Firebase (clear pause state)
            await this.roomManager.getRoomRef().update({
                battleRestarted: true,
                battleRestartedAt: Date.now(),
                battleActive: true,
                battleStarted: true,
                battlePaused: false // Clear any pause state
            });
            
            this.addCombatLog('🔄 Battle restarting with fresh state...', 'info');
            
            // Start battle after short delay
            setTimeout(() => {
                this.heroSelection.battleScreen.startBattle();
            }, 1000);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error during fallback battle restart:', error);
            return false;
        }
    }

    // Complete the reconnection process
    completeReconnection() {
        this.reconnectionInProgress = false;
        this.reconnectionAttempts = 0;
        
        console.log('🔥 Firebase battle reconnection completed with pause support');
    }

    // Add message to combat log
    addCombatLog(message, type = 'info') {
        if (this.heroSelection.battleScreen) {
            this.heroSelection.battleScreen.addCombatLogMessage(message, type);
        }
    }

    // ===== ENHANCED STATIC METHOD =====

    // Check if this is a battle reconnection scenario (enhanced with pause detection)
    static shouldHandleBattleReconnection(gameState) {
        const battleStarted = gameState?.battleStarted || false;
        const battleActive = gameState?.battleActive || false;
        const battlePaused = gameState?.battlePaused || false;
        
        // Also check for battle state existence in Firebase
        const hasBattleStateUpdate = gameState?.lastBattleStateUpdate || false;
        
        const shouldReconnect = battleStarted && battleActive && hasBattleStateUpdate;
        
        if (shouldReconnect && battlePaused) {
            console.log('🔥 Battle reconnection detected - battle is currently paused');
        }
        
        return shouldReconnect;
    }

    // ===== LEGACY P2P MESSAGE HANDLERS (kept for compatibility) =====

    // Handle message when host requests battle state (legacy P2P method)
    handleHostRequestsBattleState(data) {
        console.log('📺 LEGACY: Host requesting battle state via P2P (using Firebase instead)');
    }

    // Handle message when guest sends battle state (legacy P2P method)
    async handleGuestSendsBattleState(data) {
        console.log('🏛️ LEGACY: Guest sending battle state via P2P (using Firebase instead)');
    }

    // Handle guest reconnection notification (legacy P2P method)
    handleGuestReconnected(data) {
        console.log('🏛️ LEGACY: Guest reconnected notification via P2P');
        this.addCombatLog('🔄 Opponent reconnected to battle', 'info');
    }

    // ===== PUBLIC INTERFACE FOR HERO SELECTION =====

    // Handle reconnection messages from P2P/Firebase (legacy compatibility)
    handleReconnectionMessage(type, data) {
        switch (type) {
            case 'host_requests_battle_state':
                this.handleHostRequestsBattleState(data);
                break;
                
            case 'guest_sends_battle_state':
                this.handleGuestSendsBattleState(data);
                break;
                
            case 'guest_reconnected':
                this.handleGuestReconnected(data);
                break;
                
            default:
                console.log('Unknown reconnection message type:', type);
        }
    }

    cleanup() {
        this.reconnectionInProgress = false;
        this.reconnectionAttempts = 0;
        
        // Clear reconnecting flag if we're guest
        if (!this.isHost) {
            this.clearReconnectingFlag();
        }
        
        console.log('BattleReconnectionManager cleanup completed (with pause support)');
    }

    // Reset for new game
    reset() {
        this.cleanup();
        console.log('BattleReconnectionManager reset for new game (with pause support)');
    }

    // ===== FIREBASE PERSISTENCE UTILITIES =====

    // Check if battle state exists in Firebase
    async checkBattleStateExists() {
        try {
            const roomRef = this.roomManager.getRoomRef();
            const battleStateSnapshot = await roomRef.child('battleState').once('value');
            const exists = battleStateSnapshot.exists();
            
            if (exists) {
                // Additional validation - check if it has basic required fields
                const battleState = battleStateSnapshot.val();
                const hasRequiredFields = battleState.battleActive !== undefined && 
                                         battleState.currentTurn !== undefined &&
                                         battleState.hostHeroes !== undefined &&
                                         battleState.guestHeroes !== undefined;
                                         
                if (!hasRequiredFields) {
                    console.warn('Battle state exists but missing required fields');
                    return false;
                }
            }
            
            return exists;
        } catch (error) {
            console.error('Error checking battle state existence:', error);
            return false;
        }
    }

    // Get battle state metadata from Firebase (enhanced with pause info)
    async getBattleStateMetadata() {
        try {
            const roomRef = this.roomManager.getRoomRef();
            const battleStateSnapshot = await roomRef.child('battleState').once('value');
            const battleState = battleStateSnapshot.val();
            
            if (battleState) {
                return {
                    exists: true,
                    lastUpdatedBy: battleState.lastUpdatedBy,
                    lastUpdatedAt: battleState.lastUpdatedAt,
                    currentTurn: battleState.currentTurn,
                    version: battleState.version,
                    // NEW: Include pause state
                    battlePaused: battleState.connectionState?.battlePaused || false,
                    pauseReason: battleState.connectionState?.battlePaused ? 'Connection issue' : null
                };
            } else {
                return { exists: false };
            }
        } catch (error) {
            console.error('Error getting battle state metadata:', error);
            return { exists: false, error: error.message };
        }
    }

    // Monitor Firebase for battle state changes (enhanced for real-time sync)
    setupBattleStateMonitor() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return;
        }

        const battleStateRef = this.roomManager.getRoomRef().child('battleState');
        
        battleStateRef.on('value', (snapshot) => {
            const battleState = snapshot.val();
            
            if (battleState && this.reconnectionInProgress) {
                console.log('📡 Firebase battle state updated during reconnection');
                
                // Check for pause state changes
                const isPaused = battleState.connectionState?.battlePaused || false;
                if (isPaused) {
                    console.log('📡 Battle pause detected during reconnection');
                }
                
                // Optionally auto-refresh battle state if it changes during reconnection
                const battleManager = this.heroSelection.battleScreen?.battleManager;
                if (battleManager && battleManager.persistenceManager) {
                    // Debounce rapid updates
                    clearTimeout(this.stateUpdateTimeout);
                    this.stateUpdateTimeout = setTimeout(async () => {
                        console.log('🔄 Auto-refreshing battle state from Firebase update');
                        await battleManager.restoreFromPersistence();
                    }, 500);
                }
            }
        });
        
        console.log('📡 Firebase battle state monitor setup for real-time sync with pause awareness');
    }

    // Remove Firebase battle state monitor
    removeBattleStateMonitor() {
        if (this.roomManager && this.roomManager.getRoomRef()) {
            this.roomManager.getRoomRef().child('battleState').off();
            console.log('📡 Firebase battle state monitor removed');
        }
        
        if (this.stateUpdateTimeout) {
            clearTimeout(this.stateUpdateTimeout);
            this.stateUpdateTimeout = null;
        }
    }
}