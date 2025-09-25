// roomManager.js - Room Management Module

export class RoomManager {
    constructor(database, playerId, storageManager, gameConfig) {
        this.database = database;
        this.playerId = playerId;
        this.storageManager = storageManager;
        this.gameConfig = gameConfig;
        this.roomRef = null;
        this.roomsListRef = null;
        this.activityInterval = null;
        this.isHost = false;
        this.roomListeners = [];
    }

    // Create a new room
    async createRoom(username, password = null) {
        const roomId = 'room_' + Math.random().toString(36).substr(2, 9);
        this.roomRef = this.database.ref('rooms/' + roomId);
        this.isHost = true;
        
        const roomData = {
            host: this.playerId,
            hostName: username,
            hostReady: true,
            hostOnline: true,
            hostGameReady: false,
            guest: null,
            guestName: null,
            guestReady: false,
            guestOnline: false,
            guestGameReady: false,
            gameStarted: false,
            gameInProgress: false,
            created: firebase.database.ServerValue.TIMESTAMP,
            lastActivity: firebase.database.ServerValue.TIMESTAMP
        };
        
        if (password) {
            roomData.password = password;
        }
        
        await this.roomRef.set(roomData);
        
        // Save for auto-reconnect
        this.storageManager.saveGameData(roomId, this.playerId, true, password);
        
        // Setup presence detection
        this.setupPresenceDetection(roomId);
        
        return { roomId, roomData };
    }

    // Join an existing room
    async joinRoom(roomId, username, password = null) {
        this.roomRef = this.database.ref('rooms/' + roomId);
        const snapshot = await this.roomRef.once('value');
        const room = snapshot.val();
        
        if (!room) {
            throw new Error('Room no longer exists');
        }
        
        if (room.guest && room.guestReady) {
            throw new Error('Room is full');
        }
        
        // Verify password if required
        if (room.password && room.password.trim() !== '' && room.password !== password) {
            throw new Error('Invalid password');
        }
        
        this.isHost = false;
        
        await this.roomRef.update({
            guest: this.playerId,
            guestName: username,
            guestReady: true,
            guestOnline: true,
            guestGameReady: false,
            lastActivity: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Save for auto-reconnect
        this.storageManager.saveGameData(roomId, this.playerId, false, password);
        
        // Setup presence detection
        this.setupPresenceDetection(roomId);
        
        return room;
    }

    
    // Clear game state when starting a new game
    async clearGameState() {
        if (!this.roomRef) return;
        
        try {           
            // Only clear the old game data, don't reset the current game flags
            await Promise.all([
                this.roomRef.child('gameState').remove(),
                this.roomRef.child('game_data').remove(),
                this.roomRef.child('ice_candidates').remove(),
                this.roomRef.update({
                    offer: null,
                    answer: null,
                    gameEndTime: null,
                    lastSurrender: null
                })
            ]);
            return true;
        } catch (error) {
            console.error('Error clearing game state:', error);
            return false;
        }
    }

    // Setup presence detection
    setupPresenceDetection(roomId) {
        const presenceRef = this.database.ref('.info/connected');
        presenceRef.on('value', (snapshot) => {
            if (snapshot.val() === false) {
                return;
            }
            
            const roomRef = this.database.ref('rooms/' + roomId);
            
            if (this.isHost) {
                roomRef.onDisconnect().update({
                    hostOnline: false,
                    lastActivity: firebase.database.ServerValue.TIMESTAMP
                });
            } else {
                roomRef.onDisconnect().update({
                    guestOnline: false,
                    lastActivity: firebase.database.ServerValue.TIMESTAMP
                });
            }
            
            // Update activity timestamp periodically - USE CONFIG VALUE
            this.activityInterval = setInterval(() => {
                if (this.roomRef) {
                    const updateData = {
                        lastActivity: firebase.database.ServerValue.TIMESTAMP
                    };
                    
                    if (this.isHost) {
                        updateData.hostOnline = true;
                    } else {
                        updateData.guestOnline = true;
                    }
                    
                    this.roomRef.update(updateData).catch(() => {
                        clearInterval(this.activityInterval);
                    });
                } else {
                    clearInterval(this.activityInterval);
                }
            }, this.gameConfig.activityInterval); // USE CONFIG VALUE INSTEAD OF 30000
        });
    }

    // Leave current room
    async leaveRoom() {
        if (!this.roomRef) return;
        
        try {
            const snapshot = await this.roomRef.once('value');
            const room = snapshot.val();
            
            if (!room) {
                this.cleanup();
                return;
            }
            
            const hasHost = room.host && room.hostReady;
            const hasGuest = room.guest && room.guestReady;
            const guestOnline = room.guestOnline;
            const hostOnline = room.hostOnline;
            
            if (this.isHost) {
                // Host is leaving
                if (hasGuest && guestOnline) {
                    // Transfer host role to guest
                    await this.roomRef.update({
                        host: room.guest,
                        hostName: room.guestName,
                        hostReady: true,
                        hostOnline: true,
                        hostGameReady: false,
                        guest: null,
                        guestName: null,
                        guestReady: false,
                        guestOnline: false,
                        guestGameReady: false,
                        gameStarted: false,
                        offer: null,
                        answer: null,
                        lastActivity: firebase.database.ServerValue.TIMESTAMP
                    });
                    
                    await this.roomRef.child('ice_candidates').remove();
                } else {
                    // No guest or guest offline, delete room
                    await this.roomRef.remove();
                }
            } else {
                // Guest is leaving
                if (hasHost && hostOnline) {
                    // Remove guest, host remains
                    await this.roomRef.update({
                        guest: null,
                        guestName: null,
                        guestReady: false,
                        guestOnline: false,
                        guestGameReady: false,
                        gameStarted: false,
                        offer: null,
                        answer: null,
                        lastActivity: firebase.database.ServerValue.TIMESTAMP
                    });
                    
                    await this.roomRef.child('ice_candidates').remove();
                } else {
                    // No host or host offline, delete room
                    await this.roomRef.remove();
                }
            }
            
            this.cleanup();
            this.storageManager.clearGameData();
            
        } catch (error) {
            console.error('Error leaving room:', error);
            throw error;
        }
    }

    // Toggle ready state
    async toggleReadyState() {
        if (!this.roomRef) {
            return false;
        }
        
        try {
            const snapshot = await this.roomRef.once('value');
            const room = snapshot.val();
            
            if (!room) {
                return false;
            }
            
            let currentReady = false;
            const updateData = {};
            
            if (this.isHost) {
                currentReady = room.hostGameReady || false;
                updateData.hostGameReady = !currentReady;
            } else {
                currentReady = room.guestGameReady || false;
                updateData.guestGameReady = !currentReady;
            }
            
            await this.roomRef.update(updateData);
            return true;
            
        } catch (error) {
            console.error('Error toggling ready state:', error);
            return false;
        }
    }

    // Load rooms list
    async loadRoomsList() {
        try {
            await this.cleanupAbandonedRooms();
            const snapshot = await this.database.ref('rooms').once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error loading rooms:', error);
            throw error;
        }
    }

    // Setup rooms list listener
    setupRoomsListener(callback) {
        if (this.roomsListRef) {
            this.roomsListRef.off();
        }
        
        this.roomsListRef = this.database.ref('rooms');
        this.roomsListRef.on('value', (snapshot) => {
            callback(snapshot.val());
        });
    }

    // Stop rooms list listener
    stopRoomsListener() {
        if (this.roomsListRef) {
            this.roomsListRef.off();
            this.roomsListRef = null;
        }
    }

    // Handle surrender
    async handleSurrender() {
        if (!this.roomRef) return;
        
        try {           
            // Mark the surrender and end the current game
            await this.roomRef.update({
                lastSurrender: this.isHost ? 'host' : 'guest',
                gameEndTime: firebase.database.ServerValue.TIMESTAMP,
                gameStarted: false,
                gameInProgress: false,
                hostGameReady: false,
                guestGameReady: false
            });
            
            // Clear the old game data
            await Promise.all([
                this.roomRef.child('gameState').remove(),
                this.roomRef.child('game_data').remove(),
                this.roomRef.child('ice_candidates').remove()
            ]);
        } catch (error) {
            console.error('Error handling surrender:', error);
            throw error;
        }
    }

    // Clean up abandoned rooms
    async cleanupAbandonedRooms() {
        try {
            const roomsRef = this.database.ref('rooms');
            const snapshot = await roomsRef.once('value');
            const rooms = snapshot.val();
            
            if (!rooms) return;
            
            const now = Date.now();
            const roomsToDelete = [];
            
            for (const roomId in rooms) {
                const room = rooms[roomId];
                const roomAge = room.created ? (now - room.created) : now;
                const lastActivity = room.lastActivity ? (now - room.lastActivity) : now;
                
                // USE CONFIG VALUES INSTEAD OF HARDCODED ONES
                const veryOld = roomAge > this.gameConfig.roomTimeout; // 100 minutes from config
                const bothOffline = !room.hostOnline && !room.guestOnline;
                const noRecentActivity = lastActivity > this.gameConfig.activityTimeout; // 50 minutes from config
                
                if (veryOld || (bothOffline && noRecentActivity)) {
                    roomsToDelete.push(roomId);
                }
            }
            
            for (const roomId of roomsToDelete) {
                await this.database.ref('rooms/' + roomId).remove();
            }
            
        } catch (error) {
            console.error('Error cleaning up rooms:', error);
        }
    }

    // Cleanup all connections and listeners
    cleanup() {
        if (this.activityInterval) {
            clearInterval(this.activityInterval);
            this.activityInterval = null;
        }
        
        if (this.roomRef) {
            this.roomRef.off();
            this.roomRef = null;
        }
        
        if (this.roomsListRef) {
            this.roomsListRef.off();
            this.roomsListRef = null;
        }
    }

    // Get current room reference
    getRoomRef() {
        return this.roomRef;
    }

    // Get current host status
    getIsHost() {
        return this.isHost;
    }

    // Set host status (for role changes)
    setIsHost(isHost) {
        this.isHost = isHost;
    }

    // Update presence on unload
    async updateOfflineStatus() {
        if (this.roomRef) {
            try {
                if (this.isHost) {
                    await this.roomRef.update({
                        hostOnline: false,
                        lastActivity: firebase.database.ServerValue.TIMESTAMP
                    });
                } else {
                    await this.roomRef.update({
                        guestOnline: false,
                        lastActivity: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            } catch (error) {
            }
        }
    }
}