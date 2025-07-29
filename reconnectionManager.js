// reconnectionManager.js - Centralized Reconnection Management System with Guard Change Support

export class ReconnectionManager {
    constructor() {
        this.heroSelection = null;
        this.roomManager = null;
        this.gameDataSender = null;
        this.isHost = false;
        
        // Reconnection state tracking
        this.reconnectionInProgress = false;
        this.reconnectionAttempts = 0;
        this.maxReconnectionAttempts = 3;
        
        // Battle reconnection specific state
        this.guestReconnecting = false;
        this.guestReconnectionReady = false;
        this.reconnectionHandshakeTimeout = null;
        
        console.log('ReconnectionManager initialized');
    }

    // Initialize with required dependencies
    init(heroSelection, roomManager, gameDataSender, isHost) {
        this.heroSelection = heroSelection;
        this.roomManager = roomManager;
        this.gameDataSender = gameDataSender;
        this.isHost = isHost;
        
        console.log(`ReconnectionManager initialized for ${isHost ? 'HOST' : 'GUEST'}`);
    }

    // ===== MAIN RECONNECTION ENTRY POINT =====

    // Main reconnection handler - replaces heroSelection.restoreGameState()
    async handleReconnection(gameState) {
        if (!gameState) {
            console.log('No game state found to restore');
            return false;
        }

        console.log('🔄 ReconnectionManager: Handling reconnection...');

        try {
            // IMPORTANT: Fetch the LATEST game state from Firebase before routing
            // The gameState parameter might be stale if host updated it during our reconnection
            console.log('📡 Fetching latest game state to avoid race conditions...');
            const latestGameState = await this.fetchLatestGameState();
            const gameStateToUse = latestGameState || gameState;
            
            // Log if we're using newer state
            if (latestGameState && latestGameState.gamePhaseUpdated > (gameState.gamePhaseUpdated || 0)) {
                console.log('🔄 Using newer game state from Firebase (host updated during reconnection)');
                console.log(`Phase changed: ${gameState.gamePhase || 'Formation'} -> ${latestGameState.gamePhase || 'Formation'}`);
            }

            // First, restore basic game data (characters, formations, etc.)
            const basicDataRestored = await this.restoreBasicGameData(gameStateToUse);
            if (!basicDataRestored) {
                console.error('Failed to restore basic game data');
                return false;
            }

            // Get the current game phase from the latest state
            const gamePhase = gameStateToUse.gamePhase || 'Formation';
            console.log(`🎯 Detected game phase: ${gamePhase}`);

            // Route to appropriate reconnection handler based on phase
            switch (gamePhase) {
                case 'Battle':
                    console.log('🔥 Battle reconnection detected');
                    return await this.handleBattleReconnection(gameStateToUse);

                case 'Reward':
                    console.log('🎁 Reward screen reconnection detected');
                    return await this.handleRewardReconnection(gameStateToUse);

                case 'Formation':
                default:
                    console.log('🛡️ Formation screen reconnection detected');
                    return await this.handleFormationReconnection(gameStateToUse);
            }

        } catch (error) {
            console.error('Error in ReconnectionManager.handleReconnection:', error);
            // Transition to error state on failure
            if (this.heroSelection && this.heroSelection.stateMachine) {
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.ERROR,
                    { error: error.message, source: 'reconnection' }
                );
            }
            return false;
        }
    }

    // Fetch the latest game state from Firebase to avoid race conditions
    async fetchLatestGameState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return null;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('gameState').once('value');
            const latestState = snapshot.val();
            
            if (latestState) {
                console.log('📡 Latest game state fetched:', {
                    gamePhase: latestState.gamePhase,
                    gamePhaseUpdated: latestState.gamePhaseUpdated,
                    battleActive: latestState.battleActive,
                    battleStarted: latestState.battleStarted
                });
            }
            
            return latestState;
        } catch (error) {
            console.error('Error fetching latest game state:', error);
            return null;
        }
    }

    // ===== GAME PHASE MANAGEMENT =====

    // Set game phase in Firebase
    async setGamePhase(phase) {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            await this.roomManager.getRoomRef().child('gameState').update({
                gamePhase: phase,
                gamePhaseUpdated: Date.now()
            });
            console.log(`🎯 ReconnectionManager: Game phase set to: ${phase}`);
            return true;
        } catch (error) {
            console.error('ReconnectionManager: Error setting game phase:', error);
            return false;
        }
    }

    // Set game phase to Battle (called when battle starts)
    async setGamePhaseToBattle() {
        return await this.setGamePhase('Battle');
    }

    // Set game phase to Reward (called when battle ends)
    async setGamePhaseToReward() {
        try {
            await this.roomManager.getRoomRef().child('gameState').update({
                gamePhase: 'Reward',
                gamePhaseUpdated: Date.now(),
                battleEndedAt: Date.now()
            });
            console.log('🎁 ReconnectionManager: Game phase set to Reward');
            return true;
        } catch (error) {
            console.error('ReconnectionManager: Error setting game phase to Reward:', error);
            return false;
        }
    }

    // Set game phase to Formation (called when rewards are selected)
    async setGamePhaseToFormation() {
        return await this.setGamePhase('Formation');
    }

    // ===== BASIC DATA RESTORATION =====

    // Restore basic game data (characters, formations, etc.)
    async restoreBasicGameData(gameState) {
        try {
            // Keep the state machine in RECONNECTING while restoring data
            this.heroSelection.stateMachine.updateContext({
                restoringData: true,
                progress: 'basic_data'
            });
            
            // Restore turn using TurnTracker
            await this.heroSelection.turnTracker.importTurnData(gameState);

            // Restore character assignments
            if (gameState.hostCharacters && gameState.guestCharacters) {
                if (this.isHost) {
                    this.heroSelection.playerCharacters = gameState.hostCharacters || [];
                    this.heroSelection.opponentCharacters = gameState.guestCharacters || [];
                } else {
                    this.heroSelection.playerCharacters = gameState.guestCharacters || [];
                    this.heroSelection.opponentCharacters = gameState.hostCharacters || [];
                }
                console.log('Characters restored:', {
                    playerCount: this.heroSelection.playerCharacters.length,
                    opponentCount: this.heroSelection.opponentCharacters.length
                });
            }

            // Update restoration progress
            this.heroSelection.stateMachine.updateContext({
                progress: 'formations'
            });

            // Restore player selections and formations
            if (this.isHost && gameState.hostSelected) {
                this.heroSelection.selectedCharacter = gameState.hostSelected;
                
                if (gameState.hostBattleFormation) {
                    this.heroSelection.formationManager.importFormationState({
                        battleFormation: gameState.hostBattleFormation,
                        opponentBattleFormation: gameState.guestBattleFormation ? 
                            this.heroSelection.formationManager.alignOpponentFormation(gameState.guestBattleFormation) : null
                    }, true);
                } else {
                    this.heroSelection.formationManager.initWithCharacter(this.heroSelection.selectedCharacter);
                }

                this.heroSelection.restorePlayerData(
                    gameState.hostDeck, 
                    gameState.hostHand, 
                    gameState.hostLifeData, 
                    gameState.hostGoldData,
                    gameState.hostGlobalSpellState  // NEW: Player-specific global spell state
                );
                
            } else if (!this.isHost && gameState.guestSelected) {
                this.heroSelection.selectedCharacter = gameState.guestSelected;
                
                if (gameState.guestBattleFormation) {
                    this.heroSelection.formationManager.importFormationState({
                        battleFormation: gameState.guestBattleFormation,
                        opponentBattleFormation: gameState.hostBattleFormation ? 
                            this.heroSelection.formationManager.alignOpponentFormation(gameState.hostBattleFormation) : null
                    }, false);
                } else {
                    this.heroSelection.formationManager.initWithCharacter(this.heroSelection.selectedCharacter);
                }

                this.heroSelection.restorePlayerData(
                    gameState.guestDeck, 
                    gameState.guestHand, 
                    gameState.guestLifeData, 
                    gameState.guestGoldData,
                    gameState.guestGlobalSpellState  // NEW: Player-specific global spell state
                );
            }

            // REMOVED: Global spell state restoration moved to restorePlayerData
            // The old line was: this.heroSelection.globalSpellManager.importGlobalSpellState(gameState);

            // Update restoration progress
            this.heroSelection.stateMachine.updateContext({
                progress: 'advanced_data'
            });

            // Restore advanced data (abilities, spellbooks, creatures, actions)
            await this.restoreAdvancedData(gameState);

            // Restore opponent data
            this.restoreOpponentData(gameState);

            // Initialize life manager with turn tracker
            this.heroSelection.initializeLifeManagerWithTurnTracker();

            // Clear restoration progress
            this.heroSelection.stateMachine.updateContext({
                restoringData: false,
                progress: 'complete'
            });

            return true;

        } catch (error) {
            console.error('Error restoring basic game data:', error);
            
            // Update state machine context with error
            this.heroSelection.stateMachine.updateContext({
                restoringData: false,
                progress: 'failed',
                error: error.message
            });
            
            return false;
        }
    }

    // Restore advanced data (abilities, spellbooks, creatures, actions)
    async restoreAdvancedData(gameState) {
        // Restore abilities
        if (this.isHost && gameState.hostAbilitiesState) {
            this.heroSelection.heroAbilitiesManager.importAbilitiesState(gameState.hostAbilitiesState);
        } else if (!this.isHost && gameState.guestAbilitiesState) {
            this.heroSelection.heroAbilitiesManager.importAbilitiesState(gameState.guestAbilitiesState);
        } else {
            // Initialize from current formation if no saved state
            const formation = this.heroSelection.formationManager.getBattleFormation();
            for (const position of ['left', 'center', 'right']) {
                if (formation[position]) {
                    const heroInfo = this.heroSelection.getCardInfo(formation[position].name);
                    if (heroInfo) {
                        this.heroSelection.heroAbilitiesManager.updateHeroPlacement(position, heroInfo);
                    }
                }
            }
        }

        // Restore Spellbooks
        if (this.isHost && gameState.hostSpellbooksState) {
            this.heroSelection.heroSpellbookManager.importSpellbooksState(gameState.hostSpellbooksState);
        } else if (!this.isHost && gameState.guestSpellbooksState) {
            this.heroSelection.heroSpellbookManager.importSpellbooksState(gameState.guestSpellbooksState);
        }

        // Restore creatures
        if (this.isHost && gameState.hostCreaturesState) {
            this.heroSelection.heroCreatureManager.importCreaturesState(gameState.hostCreaturesState);
        } else if (!this.isHost && gameState.guestCreaturesState) {
            this.heroSelection.heroCreatureManager.importCreaturesState(gameState.guestCreaturesState);
        }

        // CRITICAL: Re-sync Guard Change mode with HeroCreatureManager after creature restoration
        // This ensures that creatures can be moved between heroes if Guard Change was active
        if (this.heroSelection.globalSpellManager && this.heroSelection.heroCreatureManager) {
            const isGuardChangeActive = this.heroSelection.globalSpellManager.isGuardChangeModeActive();
            if (isGuardChangeActive) {
                console.log('🔄 Re-syncing Guard Change mode with HeroCreatureManager after creature restoration');
                this.heroSelection.heroCreatureManager.setGuardChangeMode(true);
            }
        }

        // Restore action data
        if (this.isHost && gameState.hostActionData) {
            this.heroSelection.actionManager.importActionData(gameState.hostActionData);
        } else if (!this.isHost && gameState.guestActionData) {
            this.heroSelection.actionManager.importActionData(gameState.guestActionData);
        } else {
            this.heroSelection.actionManager.resetActions();
        }

        // Restore magnetic glove state
        if (this.isHost && gameState.hostMagneticGloveState) {
            if (window.magneticGloveArtifact) {
                await window.magneticGloveArtifact.restoreMagneticGloveState(this.heroSelection, gameState.hostMagneticGloveState);
            }
        } else if (!this.isHost && gameState.guestMagneticGloveState) {
            if (window.magneticGloveArtifact) {
                await window.magneticGloveArtifact.restoreMagneticGloveState(this.heroSelection, gameState.guestMagneticGloveState);
            }
        }
    }

    // Restore opponent data
    restoreOpponentData(gameState) {
        // Restore opponent selection
        if (this.isHost && gameState.guestSelected) {
            this.heroSelection.opponentSelectedCharacter = gameState.guestSelected;
        } else if (!this.isHost && gameState.hostSelected) {
            this.heroSelection.opponentSelectedCharacter = gameState.hostSelected;
        }

        // Restore opponent abilities data
        if (this.isHost && gameState.guestAbilitiesData) {
            this.heroSelection.opponentAbilitiesData = gameState.guestAbilitiesData;
        } else if (!this.isHost && gameState.hostAbilitiesData) {
            this.heroSelection.opponentAbilitiesData = gameState.hostAbilitiesData;
        }

        // Store opponent spellbooks data
        if (this.isHost && gameState.guestSpellbooksData) {
            this.heroSelection.opponentSpellbooksData = gameState.guestSpellbooksData;
        } else if (!this.isHost && gameState.hostSpellbooksData) {
            this.heroSelection.opponentSpellbooksData = gameState.hostSpellbooksData;
        }

        // Store opponent creatures data
        if (this.isHost && gameState.guestCreaturesData) {
            this.heroSelection.opponentCreaturesData = gameState.guestCreaturesData;
        } else if (!this.isHost && gameState.hostCreaturesData) {
            this.heroSelection.opponentCreaturesData = gameState.hostCreaturesData;
        }
    }

    // ===== SPECIFIC RECONNECTION HANDLERS =====

    // Handle battle reconnection
    async handleBattleReconnection(gameState) {
        // Verify we have both characters selected before attempting battle reconnection
        if (!this.heroSelection.selectedCharacter || !this.heroSelection.opponentSelectedCharacter) {
            console.log('Cannot handle battle reconnection - missing character selections');
            return await this.handleFormationReconnection(gameState);
        }

        // CRITICAL: Double-check if battle has ended while we were reconnecting
        console.log('🔍 Double-checking battle state before reconnection...');
        const currentBattleState = await this.checkCurrentBattleState();
        
        if (currentBattleState.battleEnded) {
            console.log('🎁 Battle ended during reconnection - redirecting to rewards!');
            
            // Update the game state to reflect the current reality
            const updatedGameState = { ...gameState, gamePhase: 'Reward' };
            return await this.handleRewardReconnection(updatedGameState);
        }
        
        if (!currentBattleState.battleActive) {
            console.log('⚠️ Battle is no longer active - checking for rewards or returning to formation');
            
            // Check if there are pending rewards
            const hasPendingRewards = await this.checkForPendingRewards();
            if (hasPendingRewards) {
                console.log('🎁 Found pending rewards - redirecting to reward screen');
                const updatedGameState = { ...gameState, gamePhase: 'Reward' };
                return await this.handleRewardReconnection(updatedGameState);
            } else {
                console.log('🛡️ No pending rewards - returning to formation');
                await this.setGamePhase('Formation');
                return await this.handleFormationReconnection(gameState);
            }
        }

        // Validate battle state exists
        const battleStateExists = await this.checkBattleStateExists();
        if (!battleStateExists) {
            console.log('⚠️ Battle gamePhase set but no battle state found - checking for rewards');
            
            // Battle might have ended - check for rewards
            const hasPendingRewards = await this.checkForPendingRewards();
            if (hasPendingRewards) {
                console.log('🎁 Battle ended, found pending rewards');
                const updatedGameState = { ...gameState, gamePhase: 'Reward' };
                return await this.handleRewardReconnection(updatedGameState);
            } else {
                console.log('🛡️ No battle state and no rewards - clearing stale phase');
                await this.setGamePhase('Formation');
                return await this.handleFormationReconnection(gameState);
            }
        }

        console.log('🔥 BATTLE RECONNECTION CONFIRMED - Using Firebase persistence...');
        
        // Set reconnection in progress
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
        const reconnectionSuccess = await this.handleFirebaseBattleReconnection(gameState);
        
        if (reconnectionSuccess) {
            // Transition to IN_BATTLE state on successful reconnection
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.IN_BATTLE,
                { source: 'battle_reconnection', restored: true }
            );
            
            this.completeReconnection();
            return true;
        } else {
            console.error('❌ Firebase battle reconnection failed');
            await this.setGamePhase('Formation');
            
            // Transition back to team building on failure
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.TEAM_BUILDING,
                { source: 'battle_reconnection_failed' }
            );
            
            return false;
        }
    }

    // Check the current battle state to see if battle has ended
    async checkCurrentBattleState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return { battleActive: false, battleEnded: true };
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const gameStateSnapshot = await roomRef.child('gameState').once('value');
            const gameState = gameStateSnapshot.val();
            
            if (!gameState) {
                return { battleActive: false, battleEnded: true };
            }
            
            const battleActive = gameState.battleActive || false;
            const battleStarted = gameState.battleStarted || false;
            const gamePhase = gameState.gamePhase || 'Formation';
            
            // Battle has ended if:
            // 1. Game phase is 'Reward' 
            // 2. Battle was started but is no longer active
            // 3. Battle end timestamp exists
            const battleEnded = gamePhase === 'Reward' || 
                            (battleStarted && !battleActive) ||
                            gameState.battleEndedAt;
            
            console.log('🔍 Current battle state check:', {
                battleActive,
                battleStarted,
                battleEnded,
                gamePhase,
                battleEndedAt: gameState.battleEndedAt
            });
            
            return {
                battleActive,
                battleStarted,
                battleEnded,
                gamePhase
            };
            
        } catch (error) {
            console.error('Error checking current battle state:', error);
            return { battleActive: false, battleEnded: true };
        }
    }

    // Check if there are pending rewards for the player
    async checkForPendingRewards() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const isHost = this.isHost;
            const rewardKey = isHost ? 'hostPendingRewards' : 'guestPendingRewards';
            
            const snapshot = await roomRef.child('gameState').child(rewardKey).once('value');
            const pendingRewards = snapshot.val();
            
            const hasRewards = pendingRewards && 
                            pendingRewards.rewards && 
                            pendingRewards.rewards.length > 0;
            
            console.log('🎁 Pending rewards check:', {
                rewardKey,
                hasRewards,
                rewardCount: hasRewards ? pendingRewards.rewards.length : 0
            });
            
            return hasRewards;
            
        } catch (error) {
            console.error('Error checking for pending rewards:', error);
            return false;
        }
    }

    // Handle reward screen reconnection
    async handleRewardReconnection(gameState) {
        console.log('🎁 Restoring reward screen state');
        
        // Transition to viewing rewards state
        this.heroSelection.stateMachine.transitionTo(
            this.heroSelection.stateMachine.states.VIEWING_REWARDS,
            { source: 'reward_reconnection' }
        );
        
        // Check selection complete
        if (this.heroSelection.selectedCharacter && this.heroSelection.opponentSelectedCharacter) {
            setTimeout(() => {
                if (this.heroSelection.onSelectionComplete) {
                    this.heroSelection.onSelectionComplete({
                        playerCharacter: this.heroSelection.selectedCharacter,
                        opponentCharacter: this.heroSelection.opponentSelectedCharacter
                    });
                }
            }, this.getSpeedAdjustedDelay(100));
        }

        this.heroSelection.stateInitialized = true;

        // Show reward screen immediately after UI settles
        setTimeout(async () => {
            console.log('🎁 Attempting to restore reward screen...');
            
            const hasRewards = await this.heroSelection.cardRewardManager.checkAndRestorePendingRewards(this.heroSelection);
            if (hasRewards) {
                console.log('✅ Reward screen restored successfully');
            } else {
                console.log('⚠️ No pending rewards found, falling back to formation');
                // If no rewards found, switch back to formation mode
                await this.setGamePhase('Formation');
                
                // Transition back to team building
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.TEAM_BUILDING,
                    { source: 'no_rewards_found' }
                );
            }
        }, this.getSpeedAdjustedDelay(200));
        
        return true;
    }

    // Handle formation screen reconnection
    async handleFormationReconnection(gameState) {
        console.log('🛡️ Restoring formation screen state');
        
        // Check if this is actually a fresh game (no characters assigned)
        const hasHostCharacters = gameState.hostCharacters && gameState.hostCharacters.length > 0;
        const hasGuestCharacters = gameState.guestCharacters && gameState.guestCharacters.length > 0;
        
        if (!hasHostCharacters || !hasGuestCharacters) {
            console.log('📝 No character assignments found - this is a fresh game!');
            
            // Transition back to initializing for fresh game
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.INITIALIZING
            );
            
            // Trigger character selection generation
            const selectionStarted = await this.heroSelection.startSelection();
            if (!selectionStarted) {
                console.error('Failed to start character selection');
                // Transition to error state on failure
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.ERROR,
                    { error: 'Failed to start character selection' }
                );
                return false;
            }
            
            console.log('✅ Fresh game character selection started successfully');
            
            // Update UI
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                window.updateHeroSelectionUI();
            }
            
            return true;
        }
        
        // We have character assignments - continue with reconnection
        console.log('📊 Found character assignments - proceeding with formation reconnection');
        
        // Determine if player has already selected a hero
        const hasPlayerSelected = this.isHost ? gameState.hostSelected : gameState.guestSelected;
        
        // Transition to appropriate state based on selection status
        if (hasPlayerSelected) {
            // Player has selected a hero - go to team building
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.TEAM_BUILDING,
                { source: 'reconnection', hasSelection: true }
            );
        } else {
            // Player hasn't selected yet - go to hero selection
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.SELECTING_HERO,
                { source: 'reconnection', hasSelection: false }
            );
        }
        
        // Check selection complete with speed-aware delay
        if (this.heroSelection.selectedCharacter && this.heroSelection.opponentSelectedCharacter) {
            setTimeout(() => {
                if (this.heroSelection.onSelectionComplete) {
                    this.heroSelection.onSelectionComplete({
                        playerCharacter: this.heroSelection.selectedCharacter,
                        opponentCharacter: this.heroSelection.opponentSelectedCharacter
                    });
                }
            }, this.getSpeedAdjustedDelay(100));
        }

        this.heroSelection.stateInitialized = true;
        
        console.log('Formation screen restoration complete');
        return true;
    }

    // ===== BATTLE RECONNECTION SPECIFIC METHODS =====

    // Handle Firebase battle reconnection
    async handleFirebaseBattleReconnection(gameState) {
        try {
            // Signal that we're reconnecting
            await this.signalReconnecting();
            
            console.log('🔥 RECONNECTION: Loading battle state from Firebase persistence...');
            
            // Add initial messages to combat log
            this.addCombatLog('🔄 Reconnecting to ongoing battle...', 'info');
            
            const battlePaused = gameState.battlePaused || false;
            if (battlePaused) {
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
                
                // Handle host vs guest reconnection
                if (this.isHost && battleManager.isAuthoritative) {
                    await this.handleHostReconnection(battleManager);
                } else {
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

    // Signal reconnecting (guest only)
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

    // Signal reconnection ready (guest only)
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

    // Clear reconnecting flag
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

    // Handle host reconnection
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

    // Mark player as reconnected
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

    // Fallback restart battle
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
            
            // Mark battle as restarted in Firebase and set proper game phase
            await this.roomManager.getRoomRef().update({
                battleRestarted: true,
                battleRestartedAt: Date.now(),
                gamePhase: 'Battle',
                gamePhaseUpdated: Date.now(),
                battleActive: true,
                battleStarted: true,
                battlePaused: false
            });
            
            this.addCombatLog('🔄 Battle restarting with fresh state...', 'info');
            
            // Transition to IN_BATTLE state for fresh battle
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.IN_BATTLE,
                { source: 'battle_restart', fresh: true }
            );
            
            // Start battle after short delay (speed-adjusted)
            setTimeout(() => {
                this.heroSelection.battleScreen.startBattle();
            }, this.getSpeedAdjustedDelay(1000));
            
            return true;
            
        } catch (error) {
            console.error('❌ Error during fallback battle restart:', error);
            
            // Set game phase to Formation on complete failure
            try {
                await this.setGamePhase('Formation');
                
                // Transition to team building on failure
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.TEAM_BUILDING,
                    { source: 'battle_restart_failed', error: error.message }
                );
            } catch (updateError) {
                console.error('Error updating game phase after fallback failure:', updateError);
                
                // Last resort - transition to error state
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.ERROR,
                    { source: 'battle_restart_critical_failure', error: updateError.message }
                );
            }
            
            return false;
        }
    }

    // ===== UTILITY METHODS =====

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

    // Get battle state metadata from Firebase
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

    // Show battle arena
    showBattleArena() {
        // Only show battle arena if we're in appropriate state
        const validStates = [
            this.heroSelection.stateMachine.states.TRANSITIONING_TO_BATTLE,
            this.heroSelection.stateMachine.states.IN_BATTLE,
            this.heroSelection.stateMachine.states.RECONNECTING
        ];
        
        if (!this.heroSelection.stateMachine.isInAnyState(validStates)) {
            console.warn('Cannot show battle arena - not in valid state');
            return;
        }
        
        const heroSelectionScreen = document.querySelector('.hero-selection-screen');
        if (heroSelectionScreen) {
            heroSelectionScreen.style.display = 'none';
        }
        
        this.heroSelection.battleScreen.showBattleArena();
        console.log('Battle arena displayed for reconnection');
    }

    // Add message to combat log
    addCombatLog(message, type = 'info') {
        if (this.heroSelection.battleScreen) {
            this.heroSelection.battleScreen.addCombatLogMessage(message, type);
        }
    }

    // Complete reconnection
    completeReconnection() {
        this.reconnectionInProgress = false;
        this.reconnectionAttempts = 0;
        
        console.log('🔥 Reconnection completed successfully');
        
        // Update state machine context to indicate reconnection is complete
        if (this.heroSelection && this.heroSelection.stateMachine) {
            this.heroSelection.stateMachine.updateContext({
                reconnectionComplete: true,
                reconnectionTime: Date.now()
            });
        }
    }

    // ===== CLEANUP AND RESET =====

    // Cleanup method
    cleanup() {
        this.reconnectionInProgress = false;
        this.reconnectionAttempts = 0;
        
        // Clear reconnecting flag if we're guest
        if (!this.isHost) {
            this.clearReconnectingFlag();
        }
        
        // Clear handshake timeout
        if (this.reconnectionHandshakeTimeout) {
            clearTimeout(this.reconnectionHandshakeTimeout);
            this.reconnectionHandshakeTimeout = null;
        }
        
        // Clear any state machine context related to reconnection
        if (this.heroSelection && this.heroSelection.stateMachine) {
            this.heroSelection.stateMachine.updateContext({
                reconnecting: false,
                reconnectionComplete: false
            });
        }
        
        console.log('ReconnectionManager cleanup completed');
    }

    // Reset for new game
    reset() {
        this.cleanup();
        console.log('ReconnectionManager reset for new game');
    }

    getSpeedAdjustedDelay(ms) {
        // Try to get speed from battle manager if available
        if (this.heroSelection && this.heroSelection.battleScreen && this.heroSelection.battleScreen.battleManager) {
            const battleManager = this.heroSelection.battleScreen.battleManager;
            if (battleManager.speedManager) {
                return battleManager.speedManager.calculateAdjustedDelay(ms);
            } else if (battleManager.battleSpeed) {
                return Math.max(1, Math.floor(ms / battleManager.battleSpeed));
            }
        }
        // Fallback to normal delay if no speed manager available
        return ms;
    }
}