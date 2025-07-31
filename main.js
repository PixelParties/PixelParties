// main.js - Main Application Entry Point

import { firebaseConfig, rtcConfig } from './config.js';
import { StorageManager } from './storage.js';
import { UIManager } from './uiManager.js';
import { RoomManager } from './roomManager.js';
import { WebRTCManager } from './webRTCManager.js';
import { GameManager } from './gameManager.js';

class ProjectPixelParties {
    constructor() {
        // Initialize Firebase
        this.initializeFirebase();
        
        // Generate unique player ID
        this.playerId = this.generatePlayerId();
        
        // Initialize managers
        this.storageManager = new StorageManager();
        this.uiManager = new UIManager();
        this.roomManager = null;
        this.webRTCManager = null;
        this.gameManager = null;
        
        // State
        this.isInRoomBrowser = false;
        this.pendingRoomJoin = null;
        
        // Initialize after Firebase is ready
        if (this.database) {
            this.initializeManagers();
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Restore username
        this.restoreUsername();
        
        // Auto-reconnect after a delay
        if (this.database) {
            setTimeout(() => {
                this.roomManager.cleanupAbandonedRooms();
                this.attemptAutoReconnect();
            }, 1000);
        }
    }

    // Initialize Firebase
    initializeFirebase() {
        try {
            this.app = firebase.initializeApp(firebaseConfig);
            this.database = firebase.database();
        } catch (error) {
            this.setupMockDemo();
        }
    }

    // Initialize managers that depend on Firebase
    initializeManagers() {
        this.roomManager = new RoomManager(this.database, this.playerId, this.storageManager);
        this.webRTCManager = new WebRTCManager(rtcConfig, this.roomManager, this.uiManager);
        this.gameManager = new GameManager(this.roomManager, this.webRTCManager, this.uiManager);
    }

    // Generate unique player ID
    generatePlayerId() {
        const savedData = this.storageManager ? this.storageManager.getSavedGameData() : {};
        return savedData.playerId || 'player_' + Math.random().toString(36).substr(2, 9);
    }

    // Setup event listeners
    setupEventListeners() {
        const { elements } = this.uiManager;
        
        // Main menu buttons
        elements.startBtn.addEventListener('click', () => this.showPasswordSection());
        elements.confirmCreateBtn.addEventListener('click', () => this.startGame());
        elements.cancelCreateBtn.addEventListener('click', () => this.cancelRoomCreation());
        elements.joinBtn.addEventListener('click', () => this.showRoomBrowser());
        elements.leaveBtn.addEventListener('click', () => this.leaveRoom());
        
        // Room browser
        elements.backToMenuBtn.addEventListener('click', () => this.hideRoomBrowser());
        elements.refreshRoomsBtn.addEventListener('click', () => this.refreshRoomsList());
        
        // Password modal
        elements.modalJoinBtn.addEventListener('click', () => this.handlePasswordSubmit());
        elements.modalCancelBtn.addEventListener('click', () => this.hidePasswordModal());
        elements.modalPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handlePasswordSubmit();
        });
        elements.modalPasswordInput.addEventListener('input', () => {
            elements.passwordError.classList.add('hidden');
        });
        
        // Username input
        elements.usernameInput.addEventListener('input', () => {
            this.storageManager.saveUsername(this.uiManager.getCurrentUsername());
        });
        elements.usernameInput.addEventListener('blur', () => {
            this.storageManager.saveUsername(this.uiManager.getCurrentUsername());
            this.uiManager.showUsernameSaved();
        });
        
        // Password input enter key
        elements.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !elements.confirmCreateBtn.classList.contains('hidden')) {
                this.startGame();
            }
        });
        
        // Surrender functionality
        elements.surrenderBtn.addEventListener('click', () => this.uiManager.showSurrenderModal());
        elements.surrenderYesBtn.addEventListener('click', () => this.confirmSurrender());
        elements.surrenderNoBtn.addEventListener('click', () => this.uiManager.hideSurrenderModal());
        
        // Click outside modals to close
        elements.passwordModal.addEventListener('click', (e) => {
            if (e.target === elements.passwordModal) this.hidePasswordModal();
        });
        elements.surrenderModal.addEventListener('click', (e) => {
            if (e.target === elements.surrenderModal) this.uiManager.hideSurrenderModal();
        });
        
        // Page unload
        window.addEventListener('beforeunload', () => this.handleUnload());
        
        // Visibility change
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    // Restore username
    restoreUsername() {
        const savedUsername = this.storageManager.getSavedUsername();
        if (savedUsername) {
            this.uiManager.elements.usernameInput.value = savedUsername;
        }
    }

    // Show password section
    showPasswordSection() {
        this.uiManager.showPasswordSection();
    }

    // Cancel room creation
    cancelRoomCreation() {
        this.uiManager.hidePasswordSection();
        this.uiManager.showMainMenuButtons();
    }

    // Start game (create room) - This is always a NEW game
    async startGame() {
        if (!this.database) return;
        
        try {
            this.uiManager.showStatus('Creating party...', 'waiting', true);
            this.uiManager.showLeaveButton();
            
            await this.roomManager.cleanupAbandonedRooms();
            
            const username = this.uiManager.getCurrentUsername();
            const password = this.uiManager.getCurrentPassword();
            
            const { roomId, roomData } = await this.roomManager.createRoom(username, password);
            
            this.uiManager.showStatus('Waiting for challenger...', 'waiting', true);
            this.uiManager.showRoomInfo(`Party ID: ${roomId}${password ? ' 🔒' : ''}`);
            
            // Show initial players list
            this.uiManager.updatePlayersList(roomData, true, this.playerId, () => this.toggleReadyState());
            
            // Setup WebRTC as host
            await this.webRTCManager.setupConnection(true);
            
            // Listen for room updates
            this.roomManager.getRoomRef().on('value', (snapshot) => this.handleRoomUpdate(snapshot));
            
            // Hide password section and clear password
            this.uiManager.hidePasswordSection();
            this.uiManager.elements.passwordInput.value = '';
            
        } catch (error) {
            this.uiManager.showStatus('Error creating room: ' + error.message, 'error');
            this.uiManager.showMainMenuButtons();
            this.uiManager.hidePasswordSection();
            this.uiManager.elements.passwordInput.value = '';
        }
    }

    // Show room browser
    showRoomBrowser() {
        if (!this.database) {
            this.uiManager.showStatus('Demo: Room browser feature requires Firebase connection', 'error');
            return;
        }
        
        this.isInRoomBrowser = true;
        this.uiManager.showRoomBrowser();
        
        // Setup rooms listener and load rooms
        this.roomManager.setupRoomsListener((rooms) => {
            if (this.isInRoomBrowser) {
                this.uiManager.displayRoomsList(rooms, (roomId) => this.attemptJoinRoom(roomId));
            }
        });
        this.loadRoomsList();
    }

    // Hide room browser
    hideRoomBrowser() {
        this.isInRoomBrowser = false;
        this.roomManager.stopRoomsListener();
        this.uiManager.hideRoomBrowser();
    }

    // Load rooms list
    async loadRoomsList() {
        this.uiManager.showLoadingRooms();
        
        try {
            const rooms = await this.roomManager.loadRoomsList();
            this.uiManager.displayRoomsList(rooms, (roomId) => this.attemptJoinRoom(roomId));
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.uiManager.showRoomsError();
        }
    }

    // Refresh rooms list
    refreshRoomsList() {
        if (!this.isInRoomBrowser) return;
        this.loadRoomsList();
    }

    // Attempt to join a room
    async attemptJoinRoom(roomId) {
        if (!this.database) return;
        
        try {
            const roomRef = this.database.ref('rooms/' + roomId);
            const snapshot = await roomRef.once('value');
            const room = snapshot.val();
            
            if (!room) {
                this.uiManager.showStatus('❌ Room no longer exists', 'error');
                return;
            }
            
            if (room.guest && room.guestReady) {
                this.uiManager.showStatus('❌ Room is now full', 'error');
                return;
            }
            
            if (room.password && room.password.trim() !== '') {
                this.showPasswordModal(roomId, room);
            } else {
                await this.joinSpecificRoom(roomId);
            }
            
        } catch (error) {
            console.error('Error checking room:', error);
            this.uiManager.showStatus('❌ Error accessing room: ' + error.message, 'error');
        }
    }

    // Show password modal
    showPasswordModal(roomId, roomData) {
        this.pendingRoomJoin = { roomId, roomData };
        this.uiManager.showPasswordModal();
    }

    // Hide password modal
    hidePasswordModal() {
        this.uiManager.hidePasswordModal();
        this.pendingRoomJoin = null;
    }

    // Handle password submit
    async handlePasswordSubmit() {
        if (!this.pendingRoomJoin) return;
        
        const enteredPassword = this.uiManager.getModalPassword();
        const { roomId, roomData } = this.pendingRoomJoin;
        
        if (enteredPassword !== roomData.password) {
            this.uiManager.showPasswordError();
            return;
        }
        
        this.hidePasswordModal();
        await this.joinSpecificRoom(roomId, enteredPassword);
    }

    // Join specific room - This is always a NEW game join
    async joinSpecificRoom(roomId, password = null) {
        if (!this.database) return;
        
        try {
            this.hideRoomBrowser();
            this.uiManager.showStatus('Joining battle room...', 'waiting', true);
            this.uiManager.showLeaveButton();
            
            const username = this.uiManager.getCurrentUsername();
            const room = await this.roomManager.joinRoom(roomId, username, password);
            
            this.uiManager.showStatus('Joining battle...', 'waiting', true);
            this.uiManager.showRoomInfo(`Joined Room: ${roomId}${room.password ? ' 🔒' : ''}`);
            
            // Show initial players list
            const updatedRoom = { ...room };
            updatedRoom.guest = this.playerId;
            updatedRoom.guestName = username;
            updatedRoom.guestOnline = true;
            updatedRoom.guestGameReady = false;
            this.uiManager.updatePlayersList(updatedRoom, false, this.playerId, () => this.toggleReadyState());
            
            // Setup WebRTC as guest
            await this.webRTCManager.setupConnection(false);
            
            // Listen for room updates
            this.roomManager.getRoomRef().on('value', (snapshot) => this.handleRoomUpdate(snapshot));
            
            this.uiManager.showStatus('🎉 Successfully joined the battle!', 'connected');
            
        } catch (error) {
            console.error('Error joining room:', error);
            this.uiManager.showStatus('❌ Error joining room: ' + error.message, 'error');
            this.uiManager.showMainMenuButtons();
        }
    }

    // Leave room
    async leaveRoom() {
        if (!this.database || !this.roomManager) return;
        
        try {
            this.uiManager.showStatus('🚪 Leaving room...', 'waiting', true);
            
            await this.roomManager.leaveRoom();
            
            this.webRTCManager.cleanup();
            this.gameManager.reset();
            
            setTimeout(() => {
                this.uiManager.returnToMainMenu();
            }, 1500);
            
        } catch (error) {
            console.error('Error leaving room:', error);
            this.uiManager.showStatus('❌ Error leaving room: ' + error.message, 'error');
            setTimeout(() => this.uiManager.returnToMainMenu(), 2000);
        }
    }

    // Toggle ready state
    async toggleReadyState() {
        if (!this.roomManager) return;
        
        const success = await this.roomManager.toggleReadyState();
        if (!success) {
            this.uiManager.showStatus('❌ Error updating ready state', 'error');
        }
    }

    // Handle room updates
    async handleRoomUpdate(snapshot) {
        const room = snapshot.val();
        if (!room) {
            this.uiManager.showStatus('❌ Room was closed by other player', 'error');
            this.roomManager.cleanup();
            this.webRTCManager.cleanup();
            this.gameManager.reset();
            this.storageManager.clearGameData();
            setTimeout(() => this.uiManager.returnToMainMenu(), 2000);
            return;
        }
        
        // Check for role promotion
        if (!this.roomManager.getIsHost() && room.host === this.playerId) {
            this.roomManager.setIsHost(true);
            
            const roomId = this.roomManager.getRoomRef().key;
            const existingPassword = this.storageManager.getSavedGameData().password || room.password;
            this.storageManager.saveGameData(roomId, this.playerId, true, existingPassword);
            
            // Reset WebRTC for new role
            this.webRTCManager.cleanup();
            await this.webRTCManager.setupConnection(true);
            
            this.uiManager.showStatus('🎉 You are now the host! Waiting for new challenger...', 'connected');
            this.uiManager.showConnectionDetails('✅ You have been promoted to host<br>🎮 Room is now open for new players!');
        }
        
        // Handle game state transitions
        this.gameManager.handleGameStateUpdate(room);
        
        // Update players list (only if in lobby)
        if (this.gameManager.gameState === 'lobby') {
            this.uiManager.updatePlayersList(room, this.roomManager.getIsHost(), this.playerId, () => this.toggleReadyState());
            
            // Check if all players are ready
            if (!room.gameInProgress) {
                this.gameManager.checkAllPlayersReady(room);
            }
        }
        
        // Handle guest joining/leaving
        if (this.roomManager.getIsHost()) {
            if (room.guest && room.guestReady && room.guestOnline && !room.gameInProgress) {
                const guestName = room.guestName || 'Challenger';
                this.uiManager.showStatus(`🎉 ${guestName} joined the party! Establishing connection...`, 'connected');
                this.uiManager.showConnectionDetails(`${guestName} connected! Setting up battle arena...`);
            } else if (!room.guest) {                
                if (room.gameInProgress) {
                    await this.roomManager.getRoomRef().update({
                        gameStarted: false,
                        gameInProgress: false,
                        hostGameReady: false,
                        guestGameReady: false
                    });
                    this.gameManager.returnToLobby();
                }
                
                this.uiManager.showStatus('🔄 Other player left. Waiting for new challenger...', 'waiting', true);
                this.uiManager.showConnectionDetails('⚡ Player disconnected<br>🎮 Room is open for new players!');
                
                // Reset WebRTC for new connections
                this.webRTCManager.cleanup();
                await this.webRTCManager.setupConnection(true);
            }
        }
        
        // Handle WebRTC connection setup with state checking
        await this.handleWebRTCSetup(room);
    }

    async handleWebRTCSetup(room) {
        if (!room.hostReady || !room.guestReady || !room.host || !room.guest) {
            return; // Not ready for WebRTC setup
        }
        
        const peerConnection = this.webRTCManager.peerConnection;
        if (!peerConnection) {
            return;
        }
        
        try {
            const isHost = this.roomManager.getIsHost();
            const connectionState = peerConnection.connectionState;
            const signalingState = peerConnection.signalingState;
                        
            if (isHost && room.offer && signalingState === 'stable') {
                // Host has already created offer, skip
            } else if (isHost && !room.offer && signalingState === 'stable') {
                // Host needs to create offer
                await this.webRTCManager.createOffer();
            } else if (!isHost && room.offer && !peerConnection.remoteDescription) {
                // Guest needs to create answer
                await this.webRTCManager.createAnswer(room.offer);
            } else if (isHost && room.answer && signalingState === 'have-local-offer') {
                // Host needs to set remote answer
                await this.webRTCManager.setRemoteAnswer(room.answer);
            }
            
            // Show feedback for guest when joining (only once)
            if (!isHost && room.host && room.guest && !room.gameInProgress && connectionState !== 'connected') {
                const hostName = room.hostName || 'Host';
                this.uiManager.showStatus(`🎉 Connected to ${hostName}! Establishing P2P connection...`, 'connected');
            }
            
        } catch (error) {
            console.error('WebRTC setup error:', error);
            // Don't throw - let the connection continue with Firebase fallback
        }
    }

    // Confirm surrender
    async confirmSurrender() {
        this.uiManager.hideSurrenderModal();
        await this.gameManager.handleSurrender();
    }

    // Auto-reconnect - This is always a reconnection
    async attemptAutoReconnect() {
        const savedData = this.storageManager.getSavedGameData();
        
        if (!savedData || !savedData.roomId) {
            return;
        }
                
        try {
            this.uiManager.showStatus('🔍 Checking for previous room...', 'waiting', true);
            this.uiManager.showLeaveButton();
            
            const roomRef = this.database.ref('rooms/' + savedData.roomId);
            const snapshot = await roomRef.once('value');
            const room = snapshot.val();
            
            if (!room) {
                this.storageManager.clearGameData();
                this.uiManager.showStatus('❌ Previous room no longer exists', 'error');
                setTimeout(() => {
                    this.uiManager.showStatus('Create or join a new room', 'error');
                    this.uiManager.showMainMenuButtons();
                }, 2000);
                return;
            }
            
            const wasHost = savedData.isHost;
            const savedPassword = savedData.password;
                        
            // Validate password if needed
            if (!wasHost && room.password && room.password.trim() !== '') {
                if (!savedPassword || savedPassword !== room.password) {
                    this.storageManager.clearGameData();
                    this.uiManager.showStatus('❌ Cannot auto-reconnect: room password changed', 'error');
                    setTimeout(() => {
                        this.uiManager.showStatus('Please rejoin manually', 'error');
                        this.uiManager.showMainMenuButtons();
                    }, 3000);
                    return;
                }
            }
            
            // Reconnect to room
            this.roomManager.roomRef = roomRef;
            this.roomManager.setIsHost(wasHost);
            this.roomManager.setupPresenceDetection(savedData.roomId);
            
            const username = this.uiManager.getCurrentUsername();
            const updateData = {
                lastActivity: firebase.database.ServerValue.TIMESTAMP
            };
            
            if (wasHost) {
                updateData.host = this.playerId;
                updateData.hostName = username;
                updateData.hostReady = true;
                updateData.hostOnline = true;
                updateData.hostGameReady = false;
            } else {
                updateData.guest = this.playerId;
                updateData.guestName = username;
                updateData.guestReady = true;
                updateData.guestOnline = true;
                updateData.guestGameReady = false;
            }
            
            await roomRef.update(updateData);
            
            this.uiManager.showRoomInfo(`Reconnected to Room: ${savedData.roomId}${room.password ? ' 🔒' : ''}`);
            this.uiManager.showLeaveButton();
            
            // Setup WebRTC connection
            await this.webRTCManager.setupConnection(wasHost);
            
            // Listen for room updates
            roomRef.on('value', (snapshot) => this.handleRoomUpdate(snapshot));
            
            // Check if game is in progress and restore game state
            if (room.gameInProgress || room.gameStarted) {
                this.uiManager.showStatus('🎮 Rejoining battle in progress...', 'waiting', true);
                
                // Transition to game screen and restore state - THIS IS A RECONNECTION
                await this.gameManager.showGameScreen(true); // Pass true for reconnection
                
                // The game manager will automatically restore the hero selection state
                this.uiManager.showStatus('🎉 Reconnected to ongoing battle!', 'connected');
                this.uiManager.showConnectionDetails('✅ Game state restored!<br>🔄 Synchronizing with opponent...<br>⚔️ Battle continues!');
            } else {
                // Normal lobby reconnection
                if (room.host && room.guest && room.hostOnline && room.guestOnline) {
                    this.uiManager.showStatus('🎉 Reconnected! Both players online. Establishing connection...', 'connected');
                } else {
                    this.uiManager.showStatus('🔄 Reconnected. Waiting for other player...', 'waiting', true);
                }
            }
                        
        } catch (error) {
            console.error('Auto-reconnect error:', error);
            this.storageManager.clearGameData();
            this.uiManager.showStatus('❌ Reconnection failed: ' + error.message, 'error');
            setTimeout(() => {
                this.uiManager.showStatus('Create or join a new room', 'error');
                this.uiManager.showMainMenuButtons();
            }, 3000);
        }
    }

    // Handle page unload
    async handleUnload() {
        if (this.roomManager) {
            await this.roomManager.updateOfflineStatus();
        }
        
        if (this.webRTCManager) {
            this.webRTCManager.cleanup();
        }
    }

    // Handle visibility change
    handleVisibilityChange() {
        if (document.hidden && this.roomManager) {
            const roomRef = this.roomManager.getRoomRef();
            if (roomRef) {
                roomRef.update({
                    lastActivity: firebase.database.ServerValue.TIMESTAMP
                }).catch(() => {
                    // Ignore errors if room is already deleted
                });
            }
        }
    }

    // Setup mock demo (when Firebase is not available)
    setupMockDemo() {
        this.database = null;
        
        this.uiManager.elements.confirmCreateBtn.addEventListener('click', () => {
            const password = this.uiManager.getCurrentPassword();
            this.uiManager.showStatus(`Demo: Created room! Waiting for opponent...${password ? ' (Password protected)' : ''}`, 'waiting', true);
            this.uiManager.showRoomInfo(`Room ID: DEMO_ROOM_123${password ? ' 🔒' : ''}`);
            this.uiManager.showLeaveButton();
            
            setTimeout(() => {
                this.uiManager.showStatus('🎉 A player joined! Connection established!', 'connected');
                this.uiManager.showConnectionDetails('Mock P2P connection established<br>Both players are now connected!');
            }, 3000);
        });
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ProjectPixelParties();
});

window.emergencyTooltipCleanup = function() {
    console.warn('Emergency tooltip cleanup triggered!');
    
    // Remove ALL possible tooltip elements
    const allPossibleTooltips = document.querySelectorAll(`
        #cardTooltipContainer,
        .large-card-tooltip,
        .card-tooltip-container,
        .preview-card-display,
        .battle-card-tooltip,
        .reward-card-tooltip,
        [id*="tooltip"],
        [class*="tooltip"],
        [id*="preview"],
        [class*="preview"],
        [style*="z-index: 9999"],
        [style*="z-index: 3000"],
        [style*="position: fixed"][style*="pointer-events: none"]
    `);
    
    let removedCount = 0;
    allPossibleTooltips.forEach(element => {
        // Additional check to avoid removing important UI elements
        if (!element.closest('.game-screen') || 
            element.id === 'cardTooltipContainer' ||
            element.classList.contains('large-card-tooltip') ||
            element.style.pointerEvents === 'none') {
            element.remove();
            removedCount++;
        }
    });
    
    console.warn(`Emergency cleanup removed ${removedCount} potential tooltip elements`);
    
    // Reset any stuck global tooltip functions
    if (typeof window.hideCardTooltip === 'function') {
        try { window.hideCardTooltip(); } catch(e) {}
    }
    if (typeof window.hideBattleCardPreview === 'function') {
        try { window.hideBattleCardPreview(); } catch(e) {}
    }
    
    return removedCount;
};

// Call emergency cleanup on page visibility change (when user switches tabs)
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // Small delay to let any transitions complete
        setTimeout(() => {
            if (window.emergencyTooltipCleanup) {
                window.emergencyTooltipCleanup();
            }
        }, 100);
    }
});