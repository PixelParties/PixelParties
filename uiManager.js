// uiManager.js - UI Management Module

export class UIManager {
    constructor() {
        this.elements = this.initializeElements();
    }

    initializeElements() {
        return {
            // Main menu elements
            startBtn: document.getElementById('startBtn'),
            confirmCreateBtn: document.getElementById('confirmCreateBtn'),
            cancelCreateBtn: document.getElementById('cancelCreateBtn'),
            joinBtn: document.getElementById('joinBtn'),
            howToPlayBtn: document.getElementById('howToPlayBtn'),
            leaveBtn: document.getElementById('leaveBtn'),
            usernameInput: document.getElementById('usernameInput'),
            passwordInput: document.getElementById('passwordInput'),
            passwordSection: document.getElementById('passwordSection'),
            menu: document.getElementById('menu'),
            status: document.getElementById('status'),
            roomInfo: document.getElementById('roomInfo'),
            playersList: document.getElementById('playersList'),
            connectionDetails: document.getElementById('connectionDetails'),
            
            // Room browser elements
            roomBrowser: document.getElementById('roomBrowser'),
            backToMenuBtn: document.getElementById('backToMenuBtn'),
            refreshRoomsBtn: document.getElementById('refreshRoomsBtn'),
            roomsList: document.getElementById('roomsList'),
            
            // How to Play elements
            howToPlayScreen: document.getElementById('howToPlayScreen'),
            backFromHowToPlayBtn: document.getElementById('backFromHowToPlayBtn'),
            
            // Password modal elements
            passwordModal: document.getElementById('passwordModal'),
            modalPasswordInput: document.getElementById('modalPasswordInput'),
            modalJoinBtn: document.getElementById('modalJoinBtn'),
            modalCancelBtn: document.getElementById('modalCancelBtn'),
            passwordError: document.getElementById('passwordError'),
            
            // Game screen elements
            gameScreen: document.getElementById('gameScreen'),
            surrenderBtn: document.getElementById('surrenderBtn'),
            
            // Surrender modal elements
            surrenderModal: document.getElementById('surrenderModal'),
            surrenderYesBtn: document.getElementById('surrenderYesBtn'),
            surrenderNoBtn: document.getElementById('surrenderNoBtn')
        };
    }

    // Status display
    showStatus(message, type, pulse = false) {
        this.elements.status.textContent = message;
        this.elements.status.className = `status ${type}`;
        if (pulse) this.elements.status.classList.add('pulse');
        this.elements.status.classList.remove('hidden');
    }

    hideStatus() {
        this.elements.status.classList.add('hidden');
    }

    // Room info display
    showRoomInfo(info) {
        this.elements.roomInfo.innerHTML = info;
        this.elements.roomInfo.classList.remove('hidden');
    }

    hideRoomInfo() {
        this.elements.roomInfo.classList.add('hidden');
    }

    // Connection details display
    showConnectionDetails(details) {
        this.elements.connectionDetails.innerHTML = details;
        this.elements.connectionDetails.classList.remove('hidden');
    }

    hideConnectionDetails() {
        this.elements.connectionDetails.classList.add('hidden');
    }

    // Password section management
    showPasswordSection() {
        this.elements.passwordSection.classList.remove('hidden');
        this.elements.startBtn.classList.add('hidden');
        this.elements.joinBtn.classList.add('hidden');
        this.elements.howToPlayBtn.classList.add('hidden');
        this.elements.confirmCreateBtn.classList.remove('hidden');
        this.elements.cancelCreateBtn.classList.remove('hidden');
        this.elements.passwordInput.focus();
    }

    hidePasswordSection() {
        this.elements.passwordSection.classList.add('hidden');
        this.elements.confirmCreateBtn.classList.add('hidden');
        this.elements.cancelCreateBtn.classList.add('hidden');
        this.elements.passwordInput.value = '';
    }

    // Button visibility management
    showMainMenuButtons() {
        this.elements.startBtn.classList.remove('hidden');
        this.elements.joinBtn.classList.remove('hidden');
        this.elements.howToPlayBtn.classList.remove('hidden');
        this.elements.confirmCreateBtn.classList.add('hidden');
        this.elements.cancelCreateBtn.classList.add('hidden');
        this.elements.leaveBtn.classList.add('hidden');
        this.hidePasswordSection();
        this.elements.usernameInput.disabled = false;
        this.elements.passwordInput.disabled = false;
        this.elements.startBtn.disabled = false;
        this.elements.joinBtn.disabled = false;
        this.elements.howToPlayBtn.disabled = false;
    }

    showLeaveButton() {
        this.elements.startBtn.classList.add('hidden');
        this.elements.joinBtn.classList.add('hidden');
        this.elements.howToPlayBtn.classList.add('hidden');
        this.elements.confirmCreateBtn.classList.add('hidden');
        this.elements.cancelCreateBtn.classList.add('hidden');
        this.elements.leaveBtn.classList.remove('hidden');
        this.hidePasswordSection();
        this.elements.usernameInput.disabled = true;
        this.elements.passwordInput.disabled = true;
        this.elements.leaveBtn.disabled = false;
    }

    // Room browser management
    showRoomBrowser() {
        this.elements.menu.classList.add('hidden');
        this.hidePasswordSection();
        this.hideStatus();
        this.hideRoomInfo();
        this.elements.playersList.classList.add('hidden');
        this.hideConnectionDetails();
        this.elements.roomBrowser.classList.remove('hidden');
        this.elements.howToPlayScreen.classList.add('hidden');
    }

    hideRoomBrowser() {
        this.elements.roomBrowser.classList.add('hidden');
        this.elements.menu.classList.remove('hidden');
    }

    // How to Play screen management
    showHowToPlay() {
        this.elements.menu.classList.add('hidden');
        this.elements.roomBrowser.classList.add('hidden');
        this.hidePasswordSection();
        this.hideStatus();
        this.hideRoomInfo();
        this.elements.playersList.classList.add('hidden');
        this.hideConnectionDetails();
        this.elements.howToPlayScreen.classList.remove('hidden');
    }

    hideHowToPlay() {
        this.elements.howToPlayScreen.classList.add('hidden');
        this.elements.menu.classList.remove('hidden');
    }

    // Password modal management
    showPasswordModal() {
        this.elements.modalPasswordInput.value = '';
        this.elements.passwordError.classList.add('hidden');
        this.elements.modalPasswordInput.focus();
        this.elements.passwordModal.classList.remove('hidden');
    }

    hidePasswordModal() {
        this.elements.passwordModal.classList.add('hidden');
        this.elements.modalPasswordInput.value = '';
        this.elements.passwordError.classList.add('hidden');
    }

    showPasswordError() {
        this.elements.passwordError.classList.remove('hidden');
        this.elements.modalPasswordInput.value = '';
        this.elements.modalPasswordInput.focus();
        
        // Add shake animation to modal
        const modal = document.querySelector('.password-modal');
        modal.style.animation = 'none';
        setTimeout(() => {
            modal.style.animation = 'modalSlideIn 0.3s ease-out';
        }, 10);
    }

    // Game screen management
    showGameScreen() {
        // Hide the main lobby container completely
        const mainContainer = document.querySelector('.container:first-of-type');
        if (mainContainer) {
            mainContainer.classList.add('hidden');
        }
        
        // Hide other UI elements
        this.elements.roomBrowser.classList.add('hidden');
        this.elements.howToPlayScreen.classList.add('hidden');
        this.elements.passwordModal.classList.add('hidden');
        
        // Show the full-screen game screen
        this.elements.gameScreen.classList.remove('hidden');
        
        // Make sure body allows full-screen
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';
    }

    hideGameScreen() {
        // Hide game screen
        this.elements.gameScreen.classList.add('hidden');
        this.elements.surrenderModal.classList.add('hidden');
        this.elements.surrenderBtn.classList.add('hidden');
        
        // Show the main lobby container
        const mainContainer = document.querySelector('.container:first-of-type');
        if (mainContainer) {
            mainContainer.classList.remove('hidden');
        }
        
        // Restore body overflow
        document.body.style.overflow = '';
        document.body.style.height = '';
    }

    // Surrender modal management
    showSurrenderModal() {
        this.elements.surrenderModal.classList.remove('hidden');
    }

    hideSurrenderModal() {
        this.elements.surrenderModal.classList.add('hidden');
    }

    showSurrenderButton() {
        this.elements.surrenderBtn.classList.remove('hidden');
    }

    hideSurrenderButton() {
        this.elements.surrenderBtn.classList.add('hidden');
    }

    // Players list update
    updatePlayersList(room, isHost, playerId, onReadyToggle) {
        if (!room) {
            this.elements.playersList.classList.add('hidden');
            return;
        }

        let playersHTML = '<h3>⚔️ Battle Participants</h3>';
        
        // Host player
        if (room.host) {
            const hostName = room.hostName || 'Host';
            const hostOnline = room.hostOnline;
            const hostReady = room.hostGameReady || false;
            const isCurrentPlayerHost = (isHost && room.host === playerId);
            
            playersHTML += `
                <div class="player-item">
                    <div class="player-status ${hostOnline ? 'online' : 'offline'}"></div>
                    <span>${hostName}</span>
                    <span class="player-role">HOST</span>
                    ${hostOnline ? `
                        ${isCurrentPlayerHost ? 
                            `<button class="ready-button ${hostReady ? 'ready' : 'not-ready'}" 
                                    onclick="window.toggleReadyState()" 
                                    ${!room ? 'disabled' : ''}>
                                ${hostReady ? 'Ready' : 'Not Ready'}
                            </button>` :
                            `<span class="ready-status ${hostReady ? 'ready' : 'not-ready'}">
                                ${hostReady ? 'Ready' : 'Not Ready'}
                            </span>`
                        }
                    ` : ''}
                </div>
            `;
        }
        
        // Guest player
        if (room.guest) {
            const guestName = room.guestName || 'Guest';
            const guestOnline = room.guestOnline;
            const guestReady = room.guestGameReady || false;
            const isCurrentPlayerGuest = (!isHost && room.guest === playerId);
            
            playersHTML += `
                <div class="player-item">
                    <div class="player-status ${guestOnline ? 'online' : 'offline'}"></div>
                    <span>${guestName}</span>
                    <span class="player-role">GUEST</span>
                    ${guestOnline ? `
                        ${isCurrentPlayerGuest ? 
                            `<button class="ready-button ${guestReady ? 'ready' : 'not-ready'}" 
                                    onclick="window.toggleReadyState()" 
                                    ${!room ? 'disabled' : ''}>
                                ${guestReady ? 'Ready' : 'Not Ready'}
                            </button>` :
                            `<span class="ready-status ${guestReady ? 'ready' : 'not-ready'}">
                                ${guestReady ? 'Ready' : 'Not Ready'}
                            </span>`
                        }
                    ` : ''}
                </div>
            `;
        } else {
            // Waiting for guest
            playersHTML += `
                <div class="player-item">
                    <div class="player-status offline"></div>
                    <span style="font-style: italic; color: #666;">Waiting for player...</span>
                </div>
            `;
        }
        
        this.elements.playersList.innerHTML = playersHTML;
        this.elements.playersList.classList.remove('hidden');
        
        // Set up the global toggle function
        window.toggleReadyState = onReadyToggle;
    }

    // Rooms list display
    displayRoomsList(rooms, onRoomClick) {
        if (!rooms || Object.keys(rooms).length === 0) {
            this.elements.roomsList.innerHTML = `
                <div class="no-rooms">
                    <div class="no-rooms-icon">🏟️</div>
                    <div>No active battle rooms found</div>
                    <div style="font-size: 0.9rem; margin-top: 10px; color: #888;">
                        Create a party to start your first battle!
                    </div>
                </div>
            `;
            return;
        }

        let roomsHTML = '';
        const now = Date.now();
        
        // Sort rooms by creation time (newest first)
        const sortedRooms = Object.entries(rooms).sort((a, b) => {
            const timeA = a[1].created || 0;
            const timeB = b[1].created || 0;
            return timeB - timeA;
        });

        for (const [roomId, room] of sortedRooms) {
            // Skip very old rooms (older than 10 minutes)
            if (room.created && (now - room.created) > 600000) continue;
            
            const hasHost = room.host && room.hostReady;
            const hasGuest = room.guest && room.guestReady;
            const playerCount = (hasHost ? 1 : 0) + (hasGuest ? 1 : 0);
            const isFull = playerCount >= 2;
            const isAvailable = !isFull && (room.hostOnline || room.guestOnline);
            const hasPassword = room.password && room.password.trim() !== '';
            
            const roomAge = room.created ? Math.floor((now - room.created) / 1000) : 0;
            const timeAgo = roomAge < 60 ? `${roomAge}s ago` : `${Math.floor(roomAge / 60)}m ago`;
            
            roomsHTML += `
                <div class="room-item ${isFull ? 'full' : ''}" 
                     data-room-id="${roomId}"
                     onclick="${isAvailable ? `window.attemptJoinRoom('${roomId}')` : 'void(0)'}">
                    <div class="room-header">
                        <div class="room-id">
                            ${roomId}
                            ${hasPassword ? '<span class="lock-icon">🔒</span>' : ''}
                        </div>
                        <div class="room-status ${isAvailable ? 'available' : 'full'}">
                            ${isAvailable ? 'Available' : 'Full'}
                        </div>
                    </div>
                    <div class="room-players">
                        ${hasHost ? `
                            <div class="room-player">
                                <div class="room-player-status ${room.hostOnline ? 'online' : 'offline'}"></div>
                                👑 ${room.hostName || 'Host'}
                            </div>
                        ` : `
                            <div class="room-player empty">
                                <div class="room-player-status offline"></div>
                                👑 No Host
                            </div>
                        `}
                        ${hasGuest ? `
                            <div class="room-player">
                                <div class="room-player-status ${room.guestOnline ? 'online' : 'offline'}"></div>
                                ⚔️ ${room.guestName || 'Guest'}
                            </div>
                        ` : `
                            <div class="room-player empty">
                                <div class="room-player-status offline"></div>
                                ⚔️ Waiting...
                            </div>
                        `}
                    </div>
                    <div style="font-size: 0.8rem; color: #666; margin-top: 10px;">
                        Created ${timeAgo} • ${playerCount}/2 players${hasPassword ? ' • Password Protected' : ''}
                    </div>
                </div>
            `;
        }

        this.elements.roomsList.innerHTML = roomsHTML;
        
        // Set up the global room click handler
        window.attemptJoinRoom = onRoomClick;
    }

    showLoadingRooms() {
        this.elements.roomsList.innerHTML = '<div class="loading-rooms">🔍 Searching for battles...</div>';
    }

    showRoomsError() {
        this.elements.roomsList.innerHTML = '<div class="loading-rooms">❌ Error loading rooms</div>';
    }

    // Get input values
    getCurrentUsername() {
        const username = this.elements.usernameInput.value.trim();
        return username || 'Player';
    }

    getCurrentPassword() {
        return this.elements.passwordInput.value.trim();
    }

    getModalPassword() {
        return this.elements.modalPasswordInput.value;
    }

    // Show username saved feedback
    showUsernameSaved() {
        this.elements.usernameInput.classList.add('saved');
        setTimeout(() => {
            this.elements.usernameInput.classList.remove('saved');
        }, 1000);
    }

    // Return to main menu
    returnToMainMenu() {
        // Reset all UI elements
        this.hideStatus();
        this.hideRoomInfo();
        this.elements.playersList.classList.add('hidden');
        this.hideConnectionDetails();
        this.hideRoomBrowser();
        this.hideHowToPlay();
        this.hidePasswordSection();
        this.hidePasswordModal();
        this.hideGameScreen();
        this.hideSurrenderModal();
        this.hideSurrenderButton();
        
        // Clear password field
        this.elements.passwordInput.value = '';
        
        // Show main menu buttons
        this.showMainMenuButtons();
    }
}