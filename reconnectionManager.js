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
            return false;
        }

        try {
            // Fetch the LATEST game state from Firebase before routing
            const latestGameState = await this.fetchLatestGameState();
            const gameStateToUse = latestGameState || gameState;

            // First, restore basic game data (characters, formations, etc.)
            const basicDataRestored = await this.restoreBasicGameData(gameStateToUse);
            if (!basicDataRestored) {
                return false;
            }

            // Get the current game phase from the latest state
            const gamePhase = gameStateToUse.gamePhase || 'Formation';

            // Route to appropriate reconnection handler based on phase
            switch (gamePhase) {
                case 'Battle':
                    return await this.handleBattleReconnection(gameStateToUse);

                case 'Reward':
                    return await this.handleRewardReconnection(gameStateToUse);

                case 'Formation':
                default:
                    return await this.handleFormationReconnection(gameStateToUse);
            }

        } catch (error) {
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
            
            return latestState;
        } catch (error) {
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
            return true;
        } catch (error) {
            console.error('ReconnectionManager: Error setting game phase:', error);
            return false;
        }
    }

    // Set game phase to Battle (called when battle starts)
    async setGamePhaseToBattle() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            await this.roomManager.getRoomRef().child('gameState').update({
                gamePhase: 'Battle',
                gamePhaseUpdated: Date.now(),
                battleActive: true,        // Ensure battle is marked as active
                battleStarted: true,       // Ensure battle is marked as started  
                battlePaused: false,       // Clear any pause state
                battleEndedAt: null        // ❗ CRITICAL: Clear previous battle end timestamp
            });
            console.log('🎁 ReconnectionManager: Game phase set to Battle with battle flags');
            return true;
        } catch (error) {
            console.error('ReconnectionManager: Error setting game phase to Battle:', error);
            return false;
        }
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
                    gameState.hostGlobalSpellState,
                    gameState.hostPotionState
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
                    gameState.guestGlobalSpellState,
                    gameState.guestPotionState
                );
            }

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

        // Restore potion state
        if (this.isHost && gameState.hostPotionState) {
            if (this.heroSelection.potionHandler) {
                const potionRestored = this.heroSelection.potionHandler.importPotionState(gameState.hostPotionState);
                if (potionRestored) {
                    console.log('✅ Host potion state restored during reconnection');
                    
                    // ✅ FIX: Recalculate alchemy bonuses based on current abilities
                    this.heroSelection.potionHandler.updateAlchemyBonuses(this.heroSelection);
                    console.log('🧪 Alchemy bonuses recalculated after potion state restoration');
                }
            }
        } else if (!this.isHost && gameState.guestPotionState) {
            if (this.heroSelection.potionHandler) {
                const potionRestored = this.heroSelection.potionHandler.importPotionState(gameState.guestPotionState);
                if (potionRestored) {
                    console.log('✅ Guest potion state restored during reconnection');
                    
                    // ✅ FIX: Recalculate alchemy bonuses based on current abilities  
                    this.heroSelection.potionHandler.updateAlchemyBonuses(this.heroSelection);
                    console.log('🧪 Alchemy bonuses recalculated after potion state restoration');
                }
            }
        } else {
            // Initialize potion state if no saved data
            if (this.heroSelection.potionHandler) {
                this.heroSelection.potionHandler.reset();
                this.heroSelection.potionHandler.updateAlchemyBonuses(this.heroSelection);
                console.log('📝 No potion data found during reconnection - initialized with current Alchemy bonuses');
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
            return await this.handleFormationReconnection(gameState);
        }

        // Double-check if battle has ended while we were reconnecting
        const currentBattleState = await this.checkCurrentBattleState();
        
        if (currentBattleState.battleEnded) {
            // Update the game state to reflect the current reality
            const updatedGameState = { ...gameState, gamePhase: 'Reward' };
            return await this.handleRewardReconnection(updatedGameState);
        }
        
        if (!currentBattleState.battleActive) {
            // Check if there are pending rewards
            const hasPendingRewards = await this.checkForPendingRewards();
            if (hasPendingRewards) {
                const updatedGameState = { ...gameState, gamePhase: 'Reward' };
                return await this.handleRewardReconnection(updatedGameState);
            } else {
                await this.setGamePhase('Formation');
                return await this.handleFormationReconnection(gameState);
            }
        }

        // Validate battle state exists
        const battleStateExists = await this.checkBattleStateExists();
        if (!battleStateExists) {
            // Battle might have ended - check for rewards
            const hasPendingRewards = await this.checkForPendingRewards();
            if (hasPendingRewards) {
                const updatedGameState = { ...gameState, gamePhase: 'Reward' };
                return await this.handleRewardReconnection(updatedGameState);
            } else {
                await this.setGamePhase('Formation');
                return await this.handleFormationReconnection(gameState);
            }
        }
        
        // Set reconnection in progress
        this.reconnectionInProgress = true;
        
        // Initialize battle screen immediately
        const battleInitialized = this.heroSelection.initBattleScreen();
        if (!battleInitialized) {
            return false;
        }
        
        // Show battle arena immediately  
        this.showBattleArena();

        // Initialize speed control UI after showing battle arena
        if (this.heroSelection.battleScreen) {
            const speedUISuccess = this.heroSelection.battleScreen.initializeSpeedControlUI();
            if (!speedUISuccess) {
                console.warn('⚠️ Could not initialize speed controls during reconnection');
                // Add fallback message to battle center
                const battleCenter = document.getElementById('battleCenter');
                if (battleCenter) {
                    battleCenter.innerHTML = `
                        <div class="speed-control-error">
                            <p>⚠️ Speed controls unavailable (reconnection)</p>
                            <p style="font-size: 12px; color: #aaa;">Host: ${this.isHost}, BM: ${!!(this.heroSelection.battleScreen?.battleManager)}, SM: ${!!(this.heroSelection.battleScreen?.battleManager?.speedManager)}</p>
                        </div>
                    `;
                }
            }
        }
        
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
            console.log("RECONNECT STUFF DEBUG");
            console.log("BattleStarted: " + battleStarted);
            console.log("BattleActive: " + battleActive);
            console.log("GameState.battleEndedAt: " + gameState.battleEndedAt);
            console.log("GamePhase: " + gamePhase);

            const battleEnded = gamePhase === 'Reward' || 
                (battleStarted && !battleActive) ||
                (gameState.battleEndedAt && gamePhase !== 'Battle');  
            
            return {
                battleActive,
                battleStarted,
                battleEnded,
                gamePhase
            };
            
        } catch (error) {
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
            
            return hasRewards;
            
        } catch (error) {
            return false;
        }
    }

    // Handle reward screen reconnection
    async handleRewardReconnection(gameState) {
        // Ensure we have the battle data needed for battle screen initialization
        if (!this.heroSelection.selectedCharacter || !this.heroSelection.opponentSelectedCharacter) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }

        // Get current formations for battle screen initialization
        const playerFormation = this.heroSelection.formationManager.getBattleFormation();
        const opponentFormation = this.heroSelection.formationManager.getOpponentBattleFormation();
        
        if (!playerFormation || !opponentFormation) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }

        // Initialize battle screen before showing rewards
        let battleSetupSuccess = false;
        
        try {
            // Try normal initialization
            battleSetupSuccess = this.heroSelection.initBattleScreen();
            
            if (battleSetupSuccess && this.heroSelection.battleScreen) {
                this.heroSelection.battleScreen.createBattleScreen();
                
                const battleArena = document.getElementById('battleArena');
                if (battleArena) {
                    battleArena.style.display = 'none';
                } else {
                    battleSetupSuccess = false;
                }
            }
        } catch (error) {
            battleSetupSuccess = false;
        }

        // Alternative manual setup if normal failed
        if (!battleSetupSuccess) {
            battleSetupSuccess = await this.setupBattleScreenForRewardReconnection();
        }

        // Last resort - direct battle arena creation
        if (!battleSetupSuccess) {
            try {
                const gameScreen = document.getElementById('gameScreen');
                if (gameScreen) {
                    let battleArena = document.getElementById('battleArena');
                    if (!battleArena) {
                        battleArena = document.createElement('div');
                        battleArena.id = 'battleArena';
                        battleArena.className = 'battle-arena';
                        battleArena.style.display = 'none';
                        battleArena.innerHTML = '<div class="battle-reconnection-placeholder"><h2>Battle Arena Ready</h2><p>Reconnected to post-battle state</p></div>';
                        gameScreen.appendChild(battleArena);
                        battleSetupSuccess = true;
                    }
                }
            } catch (error) {
                // Fallback failed
            }
        }

        if (!battleSetupSuccess) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }
        
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
            const hasRewards = await this.heroSelection.cardRewardManager.checkAndRestorePendingRewards(this.heroSelection);
            if (!hasRewards) {
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

    async setupBattleScreenForRewardReconnection() {
        console.log('🔧 Setting up battle screen for reward reconnection (alternative method)');
        
        try {
            // Ensure both characters are selected
            if (!this.heroSelection.selectedCharacter || !this.heroSelection.opponentSelectedCharacter) {
                console.error('❌ Cannot setup battle screen - missing character selections');
                return false;
            }
            
            // Get formations
            const playerFormation = this.heroSelection.formationManager.getBattleFormation();
            const opponentFormation = this.heroSelection.formationManager.getOpponentBattleFormation();
            
            if (!playerFormation || !opponentFormation) {
                console.error('❌ Cannot setup battle screen - missing formations');
                return false;
            }
            
            // Import BattleScreen if needed
            if (!this.heroSelection.battleScreen) {
                console.log('🔧 Creating new battle screen instance');
                const { BattleScreen } = await import('./battleScreen.js');
                this.heroSelection.battleScreen = new BattleScreen();
            }
            
            // Get all the battle data
            const playerAbilities = {
                left: this.heroSelection.heroAbilitiesManager.getHeroAbilities('left'),
                center: this.heroSelection.heroAbilitiesManager.getHeroAbilities('center'),
                right: this.heroSelection.heroAbilitiesManager.getHeroAbilities('right')
            };
            
            const playerSpellbooks = {
                left: this.heroSelection.heroSpellbookManager.getHeroSpellbook('left'),
                center: this.heroSelection.heroSpellbookManager.getHeroSpellbook('center'),
                right: this.heroSelection.heroSpellbookManager.getHeroSpellbook('right')
            };
            
            const playerCreatures = {
                left: this.heroSelection.heroCreatureManager.getHeroCreatures('left'),
                center: this.heroSelection.heroCreatureManager.getHeroCreatures('center'),
                right: this.heroSelection.heroCreatureManager.getHeroCreatures('right')
            };
            
            // Initialize with current data
            this.heroSelection.battleScreen.init(
                this.heroSelection.isHost,
                playerFormation,
                opponentFormation,
                this.heroSelection.gameDataSender,
                this.heroSelection.roomManager,
                this.heroSelection.lifeManager,
                this.heroSelection.goldManager,
                this.heroSelection.turnTracker,
                this.heroSelection.roomManager,
                playerAbilities,
                this.heroSelection.opponentAbilitiesData,
                playerSpellbooks,
                this.heroSelection.opponentSpellbooksData,
                this.heroSelection.actionManager,
                playerCreatures,
                this.heroSelection.opponentCreaturesData
            );
            
            // Create battle screen HTML
            console.log('🔧 Creating battle screen HTML manually...');
            this.heroSelection.battleScreen.createBattleScreen();
            
            // After initializing battle screen, restore final battle state if available
            const finalBattleState = await this.loadFinalBattleState();
            if (finalBattleState) {
                console.log('📥 Restoring final battle state for reward viewing');
                
                // Restore the battle state to show the end-of-battle situation
                if (this.heroSelection.battleScreen.battleManager) {
                    await this.heroSelection.battleScreen.battleManager.restoreFinalBattleState(finalBattleState);
                }
            }
            
            // Hide it initially
            const battleArena = document.getElementById('battleArena');
            if (battleArena) {
                battleArena.style.display = 'none';
                console.log('✅ Alternative battle screen setup complete and hidden');
                return true;
            } else {
                console.error('❌ Battle arena not found after alternative setup');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error in alternative battle screen setup:', error);
            return false;
        }
    }

    // Load final battle state from Firebase
    async loadFinalBattleState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return null;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('gameState').child('finalBattleState').once('value');
            const finalState = snapshot.val();
            
            if (finalState && finalState.isFinalState) {
                console.log('✅ Found final battle state from turn', finalState.currentTurn);
                return finalState;
            }
            
            return null;
        } catch (error) {
            console.error('Error loading final battle state:', error);
            return null;
        }
    }

    // Alternative battle screen setup for reward reconnection
    async setupBattleScreenForRewardReconnection() {
        console.log('🔧 Setting up battle screen for reward reconnection (alternative method)');
        
        try {
            // Ensure both characters are selected
            if (!this.heroSelection.selectedCharacter || !this.heroSelection.opponentSelectedCharacter) {
                console.error('❌ Cannot setup battle screen - missing character selections');
                return false;
            }
            
            // Get formations
            const playerFormation = this.heroSelection.formationManager.getBattleFormation();
            const opponentFormation = this.heroSelection.formationManager.getOpponentBattleFormation();
            
            if (!playerFormation || !opponentFormation) {
                console.error('❌ Cannot setup battle screen - missing formations');
                return false;
            }
            
            // Import BattleScreen if needed
            if (!this.heroSelection.battleScreen) {
                console.log('🔧 Creating new battle screen instance');
                const { BattleScreen } = await import('./battleScreen.js');
                this.heroSelection.battleScreen = new BattleScreen();
            }
            
            // Get all the battle data
            const playerAbilities = {
                left: this.heroSelection.heroAbilitiesManager.getHeroAbilities('left'),
                center: this.heroSelection.heroAbilitiesManager.getHeroAbilities('center'),
                right: this.heroSelection.heroAbilitiesManager.getHeroAbilities('right')
            };
            
            const playerSpellbooks = {
                left: this.heroSelection.heroSpellbookManager.getHeroSpellbook('left'),
                center: this.heroSelection.heroSpellbookManager.getHeroSpellbook('center'),
                right: this.heroSelection.heroSpellbookManager.getHeroSpellbook('right')
            };
            
            const playerCreatures = {
                left: this.heroSelection.heroCreatureManager.getHeroCreatures('left'),
                center: this.heroSelection.heroCreatureManager.getHeroCreatures('center'),
                right: this.heroSelection.heroCreatureManager.getHeroCreatures('right')
            };
            
            // Initialize with current data
            this.heroSelection.battleScreen.init(
                this.heroSelection.isHost,
                playerFormation,
                opponentFormation,
                this.heroSelection.gameDataSender,
                this.heroSelection.roomManager,
                this.heroSelection.lifeManager,
                this.heroSelection.goldManager,
                this.heroSelection.turnTracker,
                this.heroSelection.roomManager,
                playerAbilities,
                this.heroSelection.opponentAbilitiesData,
                playerSpellbooks,
                this.heroSelection.opponentSpellbooksData,
                this.heroSelection.actionManager,
                playerCreatures,
                this.heroSelection.opponentCreaturesData
            );
            
            // Create battle screen HTML
            console.log('🔧 Creating battle screen HTML manually...');
            this.heroSelection.battleScreen.createBattleScreen();
            
            // Hide it initially
            const battleArena = document.getElementById('battleArena');
            if (battleArena) {
                battleArena.style.display = 'none';
                console.log('✅ Alternative battle screen setup complete and hidden');
                return true;
            } else {
                console.error('❌ Battle arena not found after alternative setup');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error in alternative battle screen setup:', error);
            return false;
        }
    }

    // Handle formation screen reconnection
    async handleFormationReconnection(gameState) {
        // Check if this is actually a fresh game (no characters assigned)
        const hasHostCharacters = gameState.hostCharacters && gameState.hostCharacters.length > 0;
        const hasGuestCharacters = gameState.guestCharacters && gameState.guestCharacters.length > 0;
        
        if (!hasHostCharacters || !hasGuestCharacters) {
            // Transition back to initializing for fresh game
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.INITIALIZING
            );
            
            // Trigger character selection generation
            const selectionStarted = await this.heroSelection.startSelection();
            if (!selectionStarted) {
                // Transition to error state on failure
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.ERROR,
                    { error: 'Failed to start character selection' }
                );
                return false;
            }
            
            // Update UI
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                window.updateHeroSelectionUI();
            }
            
            return true;
        }
        
        // We have character assignments - continue with reconnection
        
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
        
        return true;
    }

    // ===== BATTLE RECONNECTION SPECIFIC METHODS =====

    // Handle Firebase battle reconnection
    async handleFirebaseBattleReconnection(gameState) {
        try {
            // Signal that we're reconnecting
            await this.signalReconnecting();
            
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
                return false;
            }

            // Check if battle manager has persistence support
            if (!battleManager.persistenceManager) {
                return false;
            }

            // Attempt to restore battle state from Firebase
            const restoredFromPersistence = await battleManager.restoreFromPersistence();
            
            if (restoredFromPersistence) {
                this.addCombatLog('✅ Battle state restored from Firebase!', 'success');
                
                // Verify the restored state is valid
                if (!battleManager.battleActive || battleManager.currentTurn === 0) {
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
                }
                
                // Signal that we're ready to resume
                await this.signalReconnectionReady();
                
                return true;                
            } else {
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
    // Check if battle was paused due to host disconnection
    if (battleManager.battlePaused) {
        // Re-check opponent connection status
        const roomRef = this.roomManager.getRoomRef();
        if (roomRef) {
            try {
                const snapshot = await roomRef.once('value');
                const room = snapshot.val();
                
                if (room && room.guestOnline) {
                    await battleManager.resumeBattle('Host reconnected, guest is online');
                    
                    // Resume battle loop if needed
                    if (battleManager.battleActive && !battleManager.checkBattleEnd()) {
                        setTimeout(() => {
                            battleManager.authoritative_battleLoop();
                        }, 1000);
                    }
                } else {
                    this.addCombatLog('⏸️ Guest is offline - battle remains paused', 'warning');
                }
            } catch (error) {
                    console.error('Error checking guest status:', error);
                }
            }
        } else {
            // Battle wasn't paused - resume normal simulation            
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
        } catch (error) {
            console.error('Error marking player as reconnected:', error);
        }
    }

    // Fallback restart battle
    async fallbackRestartBattle() {
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
                    return false;
                }
            }
            
            return exists;
        } catch (error) {
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
            this.heroSelection.stateMachine.states.RECONNECTING,
            this.heroSelection.stateMachine.states.VIEWING_REWARDS
        ];
        
        const currentState = this.heroSelection.stateMachine.getState();
        
        if (!this.heroSelection.stateMachine.isInAnyState(validStates)) {
            return;
        }
        
        const heroSelectionScreen = document.querySelector('.hero-selection-screen');
        if (heroSelectionScreen) {
            heroSelectionScreen.style.display = 'none';
        }
        
        if (!this.heroSelection.battleScreen) {
            return;
        }
        
        this.heroSelection.battleScreen.showBattleArena();
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