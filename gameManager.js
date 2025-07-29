// gameManager.js - Simplified Game Logic Management Module with Formation Sync, Battle Flow and Battle Acknowledgments

import { HeroSelection } from './heroSelection.js';

export class GameManager {
    constructor(roomManager, webRTCManager, uiManager) {
        this.roomManager = roomManager;
        this.webRTCManager = webRTCManager;
        this.uiManager = uiManager;
        this.heroSelection = null;
        this.gameState = 'lobby'; // 'lobby', 'selection', 'battle', 'ended'
        this.firebaseGameDataListener = null;
        this.isReconnecting = false; // Track if this is a reconnection
        this.turnTracker = null;
        
        // Register WebRTC message handlers
        this.registerMessageHandlers();
    }

    // Register message handlers for game events
    registerMessageHandlers() {
        this.webRTCManager.registerMessageHandler('game_started', (data) => {
            console.log('Game started confirmation received via P2P:', data.message);
            this.uiManager.showConnectionDetails(`🎮 ${data.message}<br>✅ Battle begins now!<br>⚔️ Fight for victory!`);
        });

        this.webRTCManager.registerMessageHandler('game_surrender', (data) => {
            console.log('Surrender notification received via P2P:', data.message);
            this.uiManager.showConnectionDetails(`🏳️ ${data.message}<br>✅ Returned to lobby<br>🎮 Ready for next battle!`);
        });

        this.webRTCManager.registerMessageHandler('character_selection', (data) => {
            if (this.heroSelection) {
                this.heroSelection.receiveCharacterSelection(data.data);
                window.updateHeroSelectionUI();
            }
        });

        this.webRTCManager.registerMessageHandler('character_selected', (data) => {
            console.log('Received character selection via P2P:', data.data);
            if (this.heroSelection) {
                this.heroSelection.receiveOpponentSelection(data.data);
                window.updateHeroSelectionUI();
            }
        });
        
        // Turn synchronization handler
        this.webRTCManager.registerMessageHandler('turn_sync', (data) => {
            console.log('Received turn sync via P2P:', data.data);
            if (this.turnTracker) {
                this.turnTracker.receiveTurnSync(data.data);
            }
        });

        // Handler for formation updates
        this.webRTCManager.registerMessageHandler('formation_update', (data) => {
            console.log('Received formation update via P2P:', data.data);
            if (this.heroSelection) {
                this.heroSelection.receiveFormationUpdate(data.data);
                // Update UI if in team building phase
                if (this.heroSelection.getCurrentPhase() === 'team_building') {
                    window.updateHeroSelectionUI();
                }
            }
        });

        this.webRTCManager.registerMessageHandler('life_update', (data) => {
            console.log('Received life update via P2P:', data);
            if (this.heroSelection && this.heroSelection.getLifeManager()) {
                const lifeManager = this.heroSelection.getLifeManager();
                // Update opponent's view of the lives (reversed perspective)
                lifeManager.setOpponentLives(data.playerLives);
                lifeManager.setPlayerLives(data.opponentLives);
                
                // Update the UI
                if (this.heroSelection.updateLifeDisplay) {
                    this.heroSelection.updateLifeDisplay();
                }
            }
        });
        
        this.webRTCManager.registerMessageHandler('battle_ready', (data) => {
            console.log('Received battle ready via P2P:', data);
            if (this.heroSelection) {
                this.heroSelection.receiveBattleReady(data);
            }
        });

        // Battle flow handlers
        this.webRTCManager.registerMessageHandler('battle_start', (data) => {
            console.log('Received battle start via P2P:', data);
            if (this.heroSelection && this.heroSelection.getBattleScreen()) {
                this.heroSelection.getBattleScreen().receiveBattleStart(data);
            }
        });

        this.webRTCManager.registerMessageHandler('battle_data', (data) => {
            console.log('Received battle data via P2P:', data);
            if (this.heroSelection && this.heroSelection.getBattleScreen()) {
                this.heroSelection.getBattleScreen().receiveBattleData(data);
            }
        });

        // Handler for battle transition start
        this.webRTCManager.registerMessageHandler('battle_transition_start', (data) => {
            console.log('Received battle transition start via P2P:', data);
            if (this.heroSelection) {
                // Only transition if we're in a valid state
                const validStates = [
                    this.heroSelection.stateMachine.states.WAITING_FOR_BATTLE,
                    this.heroSelection.stateMachine.states.TRANSITIONING_TO_BATTLE
                ];
                
                if (this.heroSelection.stateMachine.isInAnyState(validStates)) {
                    // Ensure we're in transitioning state before calling transition
                    if (!this.heroSelection.stateMachine.isInState(
                        this.heroSelection.stateMachine.states.TRANSITIONING_TO_BATTLE)) {
                        
                        this.heroSelection.stateMachine.transitionTo(
                            this.heroSelection.stateMachine.states.TRANSITIONING_TO_BATTLE,
                            { reason: 'p2p_battle_start' }
                        );
                    }
                    
                    this.heroSelection.transitionToBattleScreen();
                } else {
                    console.warn('Received battle_transition_start but not in valid state:', 
                                this.heroSelection.stateMachine.getState());
                }
            }
        });

        // Battle acknowledgment handler for synchronized battles
        this.webRTCManager.registerMessageHandler('battle_ack', (data) => {
            console.log('Received battle acknowledgment via P2P:', data);
            if (this.heroSelection && this.heroSelection.getBattleScreen() && this.heroSelection.getBattleScreen().battleManager) {
                this.heroSelection.getBattleScreen().battleManager.receiveBattleAcknowledgment(data);
            }
        });
    }

    // Setup Firebase listener for game data (fallback when P2P fails)
    setupFirebaseGameDataListener() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) return;

        const roomRef = this.roomManager.getRoomRef();
        
        // Keep track of processed messages to prevent duplicates
        this.processedMessages = new Set();
        
        this.firebaseGameDataListener = roomRef.child('game_data').on('child_added', (snapshot) => {
            const message = snapshot.val();
            
            // Skip our own messages
            const ourPlayerId = this.roomManager.playerId;
            const isHost = this.roomManager.getIsHost();
            const ourRole = isHost ? 'host' : 'guest';
            
            if (!message || message.from === ourRole) {
                return;
            }

            // Create a unique message ID to prevent duplicate processing
            const messageId = `${message.type}_${message.timestamp}_${message.from}`;
            
            if (this.processedMessages.has(messageId)) {
                console.log('Skipping duplicate message:', messageId);
                return;
            }
            
            this.processedMessages.add(messageId);
            
            // Clean up old processed message IDs (keep only last 50)
            if (this.processedMessages.size > 50) {
                const entries = Array.from(this.processedMessages);
                this.processedMessages.clear();
                // Keep the last 25
                entries.slice(-25).forEach(id => this.processedMessages.add(id));
            }

            console.log('Processing game data via Firebase:', message.type, message.data);

            // Handle the message based on type
            if (message.type === 'character_selection' && this.heroSelection) {
                this.heroSelection.receiveCharacterSelection(message.data);
                window.updateHeroSelectionUI();
            } else if (message.type === 'character_selected' && this.heroSelection) {
                this.heroSelection.receiveOpponentSelection(message.data);
                window.updateHeroSelectionUI();
            } else if (message.type === 'formation_update' && this.heroSelection) {
                // Handle formation updates via Firebase fallback
                this.heroSelection.receiveFormationUpdate(message.data);
                if (this.heroSelection.getCurrentPhase() === 'team_building') {
                    window.updateHeroSelectionUI();
                }
            } else if (message.type === 'life_update' && this.heroSelection && this.heroSelection.getLifeManager()) {
                const lifeManager = this.heroSelection.getLifeManager();
                // Update opponent's view of the lives (reversed perspective)
                lifeManager.setOpponentLives(message.data.playerLives);
                lifeManager.setPlayerLives(message.data.opponentLives);
                
                // Update the UI
                if (this.heroSelection.updateLifeDisplay) {
                    this.heroSelection.updateLifeDisplay();
                }
            } else if (message.type === 'battle_ready' && this.heroSelection) {
                this.heroSelection.receiveBattleReady(message.data);
            } else if (message.type === 'battle_start' && this.heroSelection && this.heroSelection.getBattleScreen()) {
                // Handle battle start via Firebase fallback
                this.heroSelection.getBattleScreen().receiveBattleStart(message.data);
            } else if (message.type === 'battle_data' && this.heroSelection && this.heroSelection.getBattleScreen()) {
                // Handle battle data via Firebase fallback
                this.heroSelection.getBattleScreen().receiveBattleData(message.data);
            } else if (message.type === 'battle_ack' && this.heroSelection && this.heroSelection.getBattleScreen() && this.heroSelection.getBattleScreen().battleManager) {
                // Handle battle acknowledgments via Firebase fallback
                this.heroSelection.getBattleScreen().battleManager.receiveBattleAcknowledgment(message.data);
            } else if (message.type === 'turn_sync' && this.turnTracker) {
                this.turnTracker.receiveTurnSync(message.data);
            } else if (message.type === 'battle_transition_start' && this.heroSelection) {
                // Handle battle transition start via Firebase fallback
                console.log('Received battle transition start via Firebase');
                this.heroSelection.transitionToBattleScreen();
            }
            // Clean up old game data messages (keep only last 10)
            setTimeout(() => {
                roomRef.child('game_data').limitToFirst(1).once('value', (oldSnapshot) => {
                    oldSnapshot.forEach((childSnapshot) => {
                        const messageTime = childSnapshot.val().timestamp;
                        if (messageTime && (Date.now() - messageTime) > 60000) { // 1 minute old
                            childSnapshot.ref.remove();
                        }
                    });
                });
            }, 1000);
        });

        console.log('Firebase game data listener set up with duplicate prevention, formation sync, battle flow, and battle acknowledgment support');
    }

    // Remove Firebase game data listener
    removeFirebaseGameDataListener() {
        if (this.firebaseGameDataListener && this.roomManager && this.roomManager.getRoomRef()) {
            this.roomManager.getRoomRef().child('game_data').off('child_added', this.firebaseGameDataListener);
            this.firebaseGameDataListener = null;
            this.processedMessages = new Set(); // Clear processed messages
            console.log('Firebase game data listener removed');
        }
    }

    // Check if all players are ready and start game
    checkAllPlayersReady(room) {
        if (!room || !room.host || !room.guest) {
            return false;
        }
        
        const hostReady = room.hostGameReady || false;
        const guestReady = room.guestGameReady || false;
        const hostOnline = room.hostOnline;
        const guestOnline = room.guestOnline;
        
        if (hostReady && guestReady && hostOnline && guestOnline && !room.gameStarted && !room.gameInProgress) {
            console.log('All players are ready! Starting game...');
            
            // Prevent multiple game starts
            if (this.gameState !== 'lobby') {
                console.log('Game already starting/in progress, ignoring ready check');
                return false;
            }
            
            // Mark game as started in database
            const roomRef = this.roomManager.getRoomRef();
            if (roomRef && this.roomManager.database) {
                roomRef.update({
                    gameStarted: true,
                    gameInProgress: true,
                    gameStartTime: firebase.database.ServerValue.TIMESTAMP
                }).then(() => {
                    // Send ready confirmation through P2P
                    this.webRTCManager.sendMessage({
                        type: 'game_started',
                        message: 'Game started! Battle begins now!',
                        from: this.roomManager.getIsHost() ? 'host' : 'guest',
                        timestamp: Date.now()
                    });
                    
                    // Transition to game screen - this is a NEW game, not a reconnection
                    this.showGameScreen(false); // false = new game
                }).catch(error => {
                    console.error('Error marking game as started:', error);
                    // Still try to start the game
                    this.showGameScreen(false); // false = new game
                });
            }
            
            return true;
        }
        
        return false;
    }

    // Show game screen and initialize hero selection - FIXED for immediate hero selection
    async showGameScreen() {
        // Prevent multiple calls during transition
        const currentState = this.gameState;
        if (currentState === 'starting' || currentState === 'selection') {
            console.log('Game screen already being shown or shown, skipping...');
            return;
        }
        
        // Check if this is a reconnection by examining hero selection state
        const isReconnection = this.heroSelection && 
                            this.heroSelection.stateMachine.isInState(
                                this.heroSelection.stateMachine.states.RECONNECTING
                            );
        
        console.log(`GameManager: Showing game screen... (${isReconnection ? 'reconnection' : 'new game'})`);
        this.gameState = 'selection';
        
        // Clear all tooltips before transition
        this.clearAllTooltipsGlobally();
        
        // Show loading overlay
        this.showGameLoadingOverlay();
        
        // Show the game screen UI
        this.uiManager.showGameScreen();
        
        // Wait for UI to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize hero selection
        await this.initializeHeroSelection();
        
        // Hide loading overlay
        this.hideGameLoadingOverlay();
        
        // For reconnections, let the reconnection manager handle the flow
        if (isReconnection) {
            console.log('🔄 Reconnection detected - reconnection manager will handle state restoration');
            // The reconnectionManager.handleReconnection() will be called during heroSelection.restoreGameState()
        } else {
            // Force UI update for new games
            setTimeout(() => {
                if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                    window.updateHeroSelectionUI();
                }
            }, 50);
        }
        
        console.log('Game screen displayed');
    }

    // NEW: Show loading overlay to prevent flashing during transition
    showGameLoadingOverlay() {
        // Remove any existing overlay
        const existingOverlay = document.getElementById('gameLoadingOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Create new loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'gameLoadingOverlay';
        overlay.innerHTML = `
            <div class="game-loading-overlay">
                <div class="game-loading-content">
                    <div class="game-loading-spinner"></div>
                    <h2>🎮 Preparing Battle...</h2>
                    <p>Loading heroes and preparing for combat...</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #gameLoadingOverlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 1;
                transition: opacity 0.3s ease;
            }
            
            .game-loading-content {
                text-align: center;
                color: white;
                padding: 40px;
                border-radius: 20px;
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid rgba(102, 126, 234, 0.3);
                backdrop-filter: blur(10px);
            }
            
            .game-loading-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(102, 126, 234, 0.3);
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px auto;
            }
            
            .game-loading-content h2 {
                font-size: 2rem;
                margin: 0 0 10px 0;
                background: linear-gradient(45deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .game-loading-content p {
                font-size: 1.2rem;
                margin: 0;
                color: rgba(255, 255, 255, 0.8);
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
        
        console.log('Game loading overlay shown');
    }

    // NEW: Hide loading overlay
    hideGameLoadingOverlay() {
        const overlay = document.getElementById('gameLoadingOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                // Also remove the style
                const style = document.querySelector('style[data-overlay="gameLoading"]');
                if (style) {
                    style.remove();
                }
            }, 300);
            console.log('Game loading overlay hidden');
        }
    }

    // Enhanced initialize hero selection with proper new game vs reconnection logic
    async initializeHeroSelection() {
        console.log('Initializing hero selection...');
        
        // Determine if this is a reconnection based on existing hero selection state
        const isReconnection = this.heroSelection && 
                            (this.heroSelection.stateMachine.isInState(
                                this.heroSelection.stateMachine.states.RECONNECTING
                            ) || 
                            this.heroSelection.stateMachine.previousState === 
                                this.heroSelection.stateMachine.states.RECONNECTING);
        
        // Clean up any existing instance if this is a new game
        if (!isReconnection && this.heroSelection) {
            console.log('Cleaning up existing hero selection for new game...');
            this.heroSelection.reset();
            this.heroSelection = null;
            window.heroSelection = null;
        }
        
        // Remove any existing Firebase listeners
        this.removeFirebaseGameDataListener();
        
        // Create hero selection instance (or reuse existing one for reconnection)
        if (!this.heroSelection) {
            console.log('Creating hero selection instance...');
            this.heroSelection = new HeroSelection();
            window.heroSelection = this.heroSelection; // For global access
        
            // Get reference to turn tracker
            this.turnTracker = this.heroSelection.turnTracker;
        }
        
        // Set up Firebase game data listener for P2P fallback
        this.setupFirebaseGameDataListener();
        
        // Initialize with game context including roomManager for persistence
        const loadSuccess = await this.heroSelection.init(
            this.roomManager.getIsHost(),
            (type, data) => this.webRTCManager.sendGameData(type, data),
            (selectionData) => this.onHeroSelectionComplete(selectionData),
            this.roomManager // Pass roomManager for Firebase access
        );
        
        // Set up life change callback to sync with opponent
        this.heroSelection.initLifeChangeCallback((lifeChangeData) => {
            console.log('Life changed:', lifeChangeData);
            
            // Get current life state
            const lifeManager = this.heroSelection.getLifeManager();
            const lifeUpdate = {
                playerLives: lifeManager.getPlayerLives(),
                opponentLives: lifeManager.getOpponentLives(),
                changeData: lifeChangeData
            };
            
            // Send life update to opponent
            this.webRTCManager.sendGameData('life_update', lifeUpdate);
            
            // Check for game over
            if (lifeManager.isGameOver()) {
                const winner = lifeManager.getWinner();
                console.log('Game Over! Winner:', winner);
                this.handleGameOver(winner);
            }
        });
        
        if (loadSuccess) {
            // Check if we have existing character data (restored from state)
            const playerCharacters = this.heroSelection.getPlayerCharacters();
            
            if (playerCharacters.length > 0) {
                console.log('Characters already loaded from restored state');
                
                // For reconnections, the restore process now handles showing the correct screen
                // (Formation, Battle, or Reward) based on the gamePhase
                if (isReconnection) {
                    console.log('🔄 Reconnection: State restoration will handle screen determination');
                    // The heroSelection.restoreGameState() method will determine the correct screen
                } else {
                    // For non-reconnections with existing data, check for pending rewards
                    if (this.heroSelection.getCurrentPhase() === 'team_building') {
                        setTimeout(async () => {
                            const hasRewards = await this.heroSelection.checkAndRestorePendingCardRewards();
                            if (hasRewards) {
                                console.log('Restored pending card rewards');
                            }
                        }, 50);
                    }
                }
            } else {
                // No existing characters - start fresh selection (only for new games)
                if (!isReconnection) {
                    console.log('Starting fresh character selection for new game');
                    await this.heroSelection.startSelection();
                    // UI update is handled inside startSelection() method
                } else {
                    console.log('Reconnection but no characters found - this should not happen');
                    // This case shouldn't occur, but handle gracefully
                    await this.heroSelection.startSelection();
                }
            }
        } else {
            console.error('Failed to load hero selection');
            // Fallback to basic game screen
            const heroContainer = document.querySelector('.hero-selection-screen');
            if (heroContainer) {
                heroContainer.innerHTML = `
                    <div class="loading-heroes">
                        <h2>❌ Failed to Load Heroes</h2>
                        <p>Using fallback battle mode...</p>
                    </div>
                `;
            }
        }
    }

    // Handle hero selection completion - FIXED to preserve existing hand
    onHeroSelectionComplete(selectionData) {
        console.log('Hero selection complete!', selectionData);
        this.gameState = 'battle';
        
        // Check if player already has a hand (from restored state)
        const currentHandSize = this.heroSelection ? this.heroSelection.getHandSize() : 0;
        
        if (currentHandSize === 0) {
            // Only draw initial hand if player doesn't already have cards
            console.log('No existing hand found, drawing initial hand of 5 cards...');
            if (this.heroSelection) {
                const drawnCards = this.heroSelection.drawInitialHand();
                console.log('Drew initial hand of 5 cards:', drawnCards);
            }
        } else {
            // Player already has a hand (restored from save state)
            console.log(`Player already has ${currentHandSize} cards in hand, skipping initial draw`);
            console.log('Existing hand:', this.heroSelection.getHand());
        }
        
        // Update the battle formation UI to show the hand
        window.updateHeroSelectionUI();
        
        // Show surrender button when both players have selected
        this.uiManager.showSurrenderButton();
        
        // Here you can add logic to start the actual battle phase
        this.uiManager.showConnectionDetails(`
            🎮 Hero Selection Complete!<br>
            ⚔️ Your Hero: ${selectionData.playerCharacter.name}<br>
            🛡️ Opponent Hero: ${selectionData.opponentCharacter.name}<br>
            🃏 Hand: ${currentHandSize || 5} cards!<br>
            🏟️ Battle ready to begin!
        `);
    }

    // Handle surrender
    async handleSurrender() {
        try {
            console.log('Player surrendered - returning both players to lobby');
            
            // Reset game state
            await this.roomManager.handleSurrender();
            
            // Send surrender message through P2P
            this.webRTCManager.sendMessage({
                type: 'game_surrender',
                message: `${this.uiManager.getCurrentUsername()} has surrendered! Returning to lobby...`,
                from: this.roomManager.getIsHost() ? 'host' : 'guest',
                timestamp: Date.now()
            });
            
            // Return to lobby
            this.returnToLobby();
            
            // Update status
            this.uiManager.showStatus('🏳️ Game ended - returned to lobby', 'connected');
            
        } catch (error) {
            console.error('Error handling surrender:', error);
            this.uiManager.showStatus('❌ Error ending game', 'error');
        }
    }

    // Handle game over (when someone reaches 0 lives)
    handleGameOver(winner) {
        console.log('Game Over! Winner:', winner);
        
        let message = '';
        if (winner === 'player') {
            message = '🎉 Victory! You have defeated your opponent!';
        } else if (winner === 'opponent') {
            message = '💀 Defeat! Your opponent has claimed victory!';
        } else if (winner === 'draw') {
            message = '🤝 Draw! Both warriors have fallen!';
        }
        
        // Show game over message
        this.uiManager.showConnectionDetails(`
            <div style="text-align: center; font-size: 24px; padding: 20px;">
                ${message}<br>
                <button onclick="window.returnToLobbyAfterGameOver()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">
                    Return to Lobby
                </button>
            </div>
        `);
        
        // Hide surrender button
        this.uiManager.hideSurrenderButton();
        
        // Set up global function
        window.returnToLobbyAfterGameOver = async () => {
            await this.handleSurrender();
        };
    }

    // Return to lobby
    returnToLobby() {
        console.log('GameManager: Returning to lobby...');
        this.gameState = 'lobby';
        this.isReconnecting = false;
        
        // ENHANCED: Clear all tooltips before transition
        this.clearAllTooltipsGlobally();
        
        // Clear any loading overlay
        this.hideGameLoadingOverlay();
        
        // Clear any active card rewards FIRST
        if (this.heroSelection) {
            this.heroSelection.clearAnyActiveCardRewards();
        }
        
        // Reset battle screen
        if (this.heroSelection) {
            const battleScreen = this.heroSelection.getBattleScreen();
            if (battleScreen) {
                console.log('Resetting battle screen...');
                battleScreen.reset();
            }
        }
        
        // Hide game screen and show lobby
        this.uiManager.hideGameScreen();
        
        // Remove Firebase game data listener
        this.removeFirebaseGameDataListener();
        
        // Reset hero selection completely
        if (this.heroSelection) {
            console.log('Resetting hero selection...');
            this.heroSelection.reset();
            this.heroSelection = null;
            window.heroSelection = null;
        }
        
        console.log('Returned to lobby - all game components cleaned up');
    }

    clearAllTooltipsGlobally() {
        console.log('GameManager: Performing global tooltip cleanup...');
        
        // Use hero selection's comprehensive cleanup if available
        if (this.heroSelection && typeof this.heroSelection.clearAllTooltips === 'function') {
            this.heroSelection.clearAllTooltips();
        }
        
        // Additional global cleanup for any missed elements
        const allTooltips = document.querySelectorAll(`
            #cardTooltipContainer,
            .large-card-tooltip,
            .card-tooltip-container,
            .preview-card-display,
            .battle-card-tooltip,
            [id*="tooltip"],
            [class*="tooltip"],
            [id*="preview"][style*="position: fixed"],
            [id*="preview"][style*="position: absolute"]
        `);
        
        allTooltips.forEach(tooltip => {
            tooltip.remove();
        });
        
        // Clear global tooltip functions that might be stuck
        if (typeof window !== 'undefined') {
            if (window.showCardTooltip) {
                try { window.hideCardTooltip(); } catch(e) {}
            }
            if (window.showBattleCardPreview) {
                try { window.hideBattleCardPreview(); } catch(e) {}
            }
        }
        
        console.log('Global tooltip cleanup completed');
    }

    // Handle room update for game state
    handleGameStateUpdate(room) {
        // Check for game phase changes
        const gamePhase = room.gameState?.gamePhase || 'Formation';
        
        // Determine if this is a reconnection by checking if we have hero selection with reconnecting state
        const isReconnection = this.heroSelection && 
                            this.heroSelection.stateMachine.isInState(
                                this.heroSelection.stateMachine.states.RECONNECTING
                            );
        
        // NEW: Check if we're in the middle of a normal game flow transition
        const isInGameFlow = this.heroSelection && 
                        this.heroSelection.stateMachine.isInAnyState([
                            this.heroSelection.stateMachine.states.TEAM_BUILDING,
                            this.heroSelection.stateMachine.states.VIEWING_REWARDS,
                            this.heroSelection.stateMachine.states.CLEANING_UP
                        ]);
        
        if (room.gameInProgress && this.gameState === 'lobby' && !isInGameFlow) {
            // Game started, transition to game screen (reconnection)
            console.log(`🔄 Reconnection detected with gamePhase: ${gamePhase}`);
            
            // Set hero selection to reconnecting state if not already
            if (this.heroSelection && !isReconnection) {
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.RECONNECTING,
                    { reason: 'game_state_update' }
                );
            }
            
            this.showGameScreen(); // ReconnectionManager will handle the rest
        } else if (!room.gameInProgress && this.gameState !== 'lobby') {
            // Game ended (surrender), return to lobby
            console.log('Game ended, returning to lobby');
            this.returnToLobby();
            
            if (room.lastSurrender) {
                const surrendererRole = room.lastSurrender === 'host' ? 'Host' : 'Guest';
                const surrendererName = room.lastSurrender === 'host' ? room.hostName : room.guestName;
                this.uiManager.showStatus(`🏳️ ${surrendererName} (${surrendererRole}) surrendered - back to lobby`, 'connected');
            }
        } else if (isInGameFlow) {
            // We're in normal game flow - don't trigger reconnection logic
            console.log(`🎮 Normal game flow detected - gamePhase: ${gamePhase}, state: ${this.heroSelection?.stateMachine.getState()}`);
        }
    }

    // Reset game state
    reset() {
        this.gameState = 'lobby';
        
        // Clear any loading overlay
        this.hideGameLoadingOverlay();
        
        // Remove Firebase game data listener
        this.removeFirebaseGameDataListener();
        
        if (this.heroSelection) {
            this.heroSelection.reset();
            this.heroSelection = null;
            window.heroSelection = null;
        }
        
        // Reset game phase to Formation if we have room access
        if (this.roomManager && this.roomManager.getRoomRef()) {
            this.roomManager.getRoomRef().child('gameState').update({
                gamePhase: 'Formation',
                gamePhaseUpdated: Date.now(),
                gameManagerReset: Date.now()
            }).catch(error => {
                console.log('Could not reset game phase during game manager reset:', error.message);
            });
        }
        
        console.log('Game manager reset completed with game phase cleanup');
    }
}