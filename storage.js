// storage.js - Storage Utilities Module

export class StorageManager {
    constructor() {
        this.localStorageAvailable = this.testLocalStorage();
        this.memoryStorage = {};
    }

    testLocalStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            console.log('localStorage not available - using memory storage');
            return false;
        }
    }

    // Save data to storage
    save(key, data) {
        if (this.localStorageAvailable) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (e) {
                console.log('localStorage save failed, using memory storage');
                this.memoryStorage[key] = data;
                return true;
            }
        } else {
            this.memoryStorage[key] = data;
            return true;
        }
    }

    // Load data from storage
    load(key) {
        if (this.localStorageAvailable) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                console.log('localStorage load failed, using memory storage');
                return this.memoryStorage[key] || null;
            }
        } else {
            return this.memoryStorage[key] || null;
        }
    }

    // Remove data from storage
    remove(key) {
        if (this.localStorageAvailable) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.log('localStorage remove failed');
            }
        }
        delete this.memoryStorage[key];
    }

    // Save username
    saveUsername(username) {
        this.save('p2p_game_username', username);
        console.log('Username saved:', username);
    }

    // Get saved username
    getSavedUsername() {
        return this.load('p2p_game_username');
    }

    // Save game data for auto-reconnect
    saveGameData(roomId, playerId, isHost, password = null) {
        const gameData = {
            roomId: roomId,
            playerId: playerId,
            isHost: isHost,
            password: password,
            timestamp: Date.now()
        };
        
        this.save('p2p_game_data', gameData);
        console.log('Game data saved');
        return gameData;
    }

    // Get saved game data
    getSavedGameData() {
        return this.load('p2p_game_data') || {};
    }

    // Clear saved game data (but preserve username)
    clearGameData() {
        const username = this.getSavedUsername();
        this.remove('p2p_game_data');
        console.log('Game data cleared, username preserved');
    }
}