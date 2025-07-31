// turnTracker.js - Centralized Turn Management Module

export class TurnTracker {
    constructor() {
        this.currentTurn = 1;
        this.onTurnChangeCallback = null;
        this.roomManager = null;
        this.gameDataSender = null;
    }

    // Initialize with dependencies
    init(roomManager, gameDataSender, onTurnChangeCallback = null) {
        this.roomManager = roomManager;
        this.gameDataSender = gameDataSender;
        this.onTurnChangeCallback = onTurnChangeCallback;
    }

    // Get current turn
    getCurrentTurn() {
        return this.currentTurn;
    }

    // Set current turn (for sync/restore)
    setCurrentTurn(turn) {
        const previousTurn = this.currentTurn;
        this.currentTurn = Math.max(1, turn);
        
        if (previousTurn !== this.currentTurn) {
            this.notifyTurnChange(previousTurn, this.currentTurn);
        }
    }

    // Increment turn (after battles)
    async incrementTurn() {
        const previousTurn = this.currentTurn;
        this.currentTurn++;
                
        // Save to Firebase
        await this.saveTurnState();
        
        // Sync with opponent
        this.syncTurnWithOpponent();
        
        // Notify listeners
        this.notifyTurnChange(previousTurn, this.currentTurn);
        
        return this.currentTurn;
    }

    // Sync turn with opponent via P2P/Firebase
    syncTurnWithOpponent() {
        if (this.gameDataSender) {
            this.gameDataSender('turn_sync', {
                currentTurn: this.currentTurn,
                timestamp: Date.now()
            });
        }
    }

    // Receive turn sync from opponent
    receiveTurnSync(data) {
        if (data.currentTurn && data.currentTurn !== this.currentTurn) {
            this.setCurrentTurn(data.currentTurn);
        }
    }

    // Save turn state to Firebase
    async saveTurnState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            const roomRef = this.roomManager.getRoomRef();
            await roomRef.child('gameState').update({
                currentTurn: this.currentTurn,
                turnLastUpdated: Date.now()
            });
            return true;
        } catch (error) {
            console.error('Error saving turn state:', error);
            return false;
        }
    }

    // Restore turn state from Firebase
    async restoreTurnState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('gameState/currentTurn').once('value');
            const savedTurn = snapshot.val();
            
            if (savedTurn !== null && savedTurn !== undefined) {
                this.setCurrentTurn(savedTurn);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error restoring turn state:', error);
            return false;
        }
    }

    // Reset turn to 1 (for new games)
    reset() {
        const previousTurn = this.currentTurn;
        this.currentTurn = 1;
        
        this.notifyTurnChange(previousTurn, this.currentTurn);
    }

    // Notify turn change to listeners
    notifyTurnChange(previousTurn, newTurn) {
        if (this.onTurnChangeCallback) {
            this.onTurnChangeCallback({
                previousTurn,
                newTurn,
                increment: newTurn - previousTurn,
                timestamp: Date.now()
            });
        }
    }

    // Export turn data
    exportTurnData() {
        return {
            currentTurn: this.currentTurn,
            timestamp: Date.now()
        };
    }

    // Import turn data
    importTurnData(turnData) {
        if (!turnData || turnData.currentTurn === undefined) {
            return false;
        }

        this.setCurrentTurn(turnData.currentTurn);
        return true;
    }

    // Get turn statistics
    getTurnStats() {
        return {
            currentTurn: this.currentTurn,
            isEarlyGame: this.currentTurn <= 3,
            isMidGame: this.currentTurn > 3 && this.currentTurn <= 7,
            isLateGame: this.currentTurn > 7
        };
    }

    // Create turn display HTML
    createTurnDisplay() {
        return `
            <div class="turn-display">
                <div class="turn-container">
                    <span class="turn-icon">🎯</span>
                    <span class="turn-text">Turn ${this.currentTurn}</span>
                </div>
            </div>
        `;
    }
}

// Export for ES6 module compatibility
export default TurnTracker;