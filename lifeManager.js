// lifeManager.js - Life/Health Management Module (Simplified with TurnTracker)

export class LifeManager {
    constructor() {
        this.maxLives = 10;
        this.playerLives = this.maxLives;
        this.opponentLives = this.maxLives;
        this.playerTrophies = 0;        
        this.opponentTrophies = 0;      
        this.maxTrophies = 10;          
        this.onLifeChangeCallback = null;
        this.turnTracker = null;
    }

    // Initialize with callback and turn tracker
    init(onLifeChangeCallback, turnTracker = null) {
        this.onLifeChangeCallback = onLifeChangeCallback;
        this.turnTracker = turnTracker;
    }

    // Get current turn from turn tracker
    getCurrentTurn() {
        return this.turnTracker ? this.turnTracker.getCurrentTurn() : 1;
    }

    // Get player's current lives
    getPlayerLives() {
        return this.playerLives;
    }

    // Get opponent's current lives
    getOpponentLives() {
        return this.opponentLives;
    }

    // Get player's lost lives (for trophy display)
    getPlayerLostLives() {
        return this.maxLives - this.playerLives;
    }

    // Get opponent's lost lives (for trophy display)
    getOpponentLostLives() {
        return this.maxLives - this.opponentLives;
    }

    // Deal damage to player
    damagePlayer(amount = 1) {
        const previousLives = this.playerLives;
        this.playerLives = Math.max(0, this.playerLives - amount);
        
        if (previousLives !== this.playerLives) {
            // Check if player just reached 0 lives (opponent wins this battle)
            if (this.playerLives === 0 && previousLives > 0) {
                this.opponentTrophies = Math.min(this.maxTrophies, this.opponentTrophies + 1);
            }
            
            this.notifyLifeChange('player', previousLives, this.playerLives);
            
            // Check for victory condition after any life change
            const victoryResult = this.checkVictoryCondition();
            if (victoryResult) {
                this.notifyVictoryCondition(victoryResult);
            }
            
            return true;
        }
        return false;
    }

    // Deal damage to opponent
    damageOpponent(amount = 1) {
        const previousLives = this.opponentLives;
        this.opponentLives = Math.max(0, this.opponentLives - amount);
        
        if (previousLives !== this.opponentLives) {
            // Check if opponent just reached 0 lives (player wins this battle)
            if (this.opponentLives === 0 && previousLives > 0) {
                this.playerTrophies = Math.min(this.maxTrophies, this.playerTrophies + 1);
            }
            
            this.notifyLifeChange('opponent', previousLives, this.opponentLives);
            
            // Check for victory condition after any life change
            const victoryResult = this.checkVictoryCondition();
            if (victoryResult) {
                this.notifyVictoryCondition(victoryResult);
            }
            
            return true;
        }
        return false;
    }

    // Heal player
    healPlayer(amount = 1) {
        const previousLives = this.playerLives;
        this.playerLives = Math.min(this.maxLives, this.playerLives + amount);
        
        if (previousLives !== this.playerLives) {
            this.notifyLifeChange('player', previousLives, this.playerLives);
            return true;
        }
        return false;
    }

    // Heal opponent
    healOpponent(amount = 1) {
        const previousLives = this.opponentLives;
        this.opponentLives = Math.min(this.maxLives, this.opponentLives + amount);
        
        if (previousLives !== this.opponentLives) {
            this.notifyLifeChange('opponent', previousLives, this.opponentLives);
            return true;
        }
        return false;
    }

    // Set player lives directly (for sync)
    setPlayerLives(lives) {
        const previousLives = this.playerLives;
        this.playerLives = Math.max(0, Math.min(this.maxLives, lives));
        
        if (previousLives !== this.playerLives) {
            this.notifyLifeChange('player', previousLives, this.playerLives);
        }
    }

    // Set opponent lives directly (for sync)
    setOpponentLives(lives) {
        const previousLives = this.opponentLives;
        this.opponentLives = Math.max(0, Math.min(this.maxLives, lives));
        
        if (previousLives !== this.opponentLives) {
            this.notifyLifeChange('opponent', previousLives, this.opponentLives);
        }
    }

    // Check if player is defeated
    isPlayerDefeated() {
        return this.playerLives <= 0;
    }

    // Check if opponent is defeated
    isOpponentDefeated() {
        return this.opponentLives <= 0;
    }

    // Check if game is over
    isGameOver() {
        return this.isPlayerDefeated() || this.isOpponentDefeated();
    }

    // Get winner (null if game not over)
    getWinner() {
        if (this.isPlayerDefeated() && !this.isOpponentDefeated()) {
            return 'opponent';
        } else if (this.isOpponentDefeated() && !this.isPlayerDefeated()) {
            return 'player';
        } else if (this.isPlayerDefeated() && this.isOpponentDefeated()) {
            return 'draw';
        }
        return null;
    }

    // Notify life change
    notifyLifeChange(target, previousLives, newLives) {
        if (this.onLifeChangeCallback) {
            this.onLifeChangeCallback({
                target,
                previousLives,
                newLives,
                damage: previousLives - newLives,
                isDefeated: newLives <= 0,
                currentTurn: this.getCurrentTurn() // Get turn from tracker
            });
        }
    }

    // Create life display HTML with turn from tracker
    createLifeDisplay() {
        const playerHearts = this.createHeartsDisplay(this.playerLives);
        const opponentTrophies = this.createTrophiesDisplay(this.getOpponentLostLives());
        const turnDisplay = this.turnTracker ? this.turnTracker.createTurnDisplay() : '';
        
        return `
            <div class="life-display-container">
                <div class="player-hearts">
                    ${playerHearts}
                </div>
                
                <!-- Turn Display from TurnTracker -->
                ${turnDisplay}
                
                <div class="battle-button-container">
                    <button id="toBattleBtn" class="to-battle-button" onclick="window.handleToBattleClick()">
                        ⚔️ To Battle!
                    </button>
                </div>
                <div class="opponent-trophies">
                    ${opponentTrophies}
                </div>
            </div>
        `;
    }

    // Create hearts display
    createHeartsDisplay(lives) {
        let heartsHTML = '<div class="hearts-container">';
        
        for (let i = 0; i < this.maxLives; i++) {
            if (i < lives) {
                heartsHTML += '<span class="heart full">❤️</span>';
            } else {
                heartsHTML += '<span class="heart empty">🤍</span>';
            }
        }
        
        heartsHTML += `<div class="life-label">Your Lives: ${lives}/${this.maxLives}</div>`;
        heartsHTML += '</div>';
        
        return heartsHTML;
    }

    // Create trophies display
    createTrophiesDisplay(trophies) {
        let trophiesHTML = '<div class="trophies-container">';
        
        for (let i = 0; i < trophies; i++) {
            trophiesHTML += '<span class="trophy">🏆</span>';
        }
        
        if (trophies === 0) {
            trophiesHTML += '<span class="no-trophies">No trophies yet</span>';
        }
        
        trophiesHTML += `<div class="trophy-label">Trophies: ${trophies}/${this.maxLives}</div>`;
        trophiesHTML += '</div>';
        
        return trophiesHTML;
    }

    // Export life data (turn data handled by TurnTracker)
    exportLifeData() {
        return {
            playerLives: this.playerLives,
            opponentLives: this.opponentLives,
            maxLives: this.maxLives,
            timestamp: Date.now()
        };
    }

    // Import life data (turn data handled by TurnTracker)
    importLifeData(lifeData) {
        if (!lifeData) {
            console.error('No life data to import');
            return false;
        }

        if (lifeData.playerLives !== undefined) {
            this.playerLives = Math.max(0, Math.min(this.maxLives, lifeData.playerLives));
        }
        
        if (lifeData.opponentLives !== undefined) {
            this.opponentLives = Math.max(0, Math.min(this.maxLives, lifeData.opponentLives));
        }
        
        if (lifeData.maxLives !== undefined) {
            this.maxLives = lifeData.maxLives;
        }
        
        return true;
    }

    checkVictoryCondition() {
        if (this.opponentLives <= 0) {
            return { winner: 'player', trophies: this.playerTrophies };
        } else if (this.playerLives <= 0) {
            return { winner: 'opponent', trophies: this.opponentTrophies };
        }
        return null;
    }

    notifyVictoryCondition(victoryResult) {
        if (this.onLifeChangeCallback) {
            this.onLifeChangeCallback({
                type: 'victory',
                winner: victoryResult.winner,
                trophies: victoryResult.trophies,
                currentTurn: this.getCurrentTurn()
            });
        }
    }

    getPlayerTrophies() {
        return this.playerTrophies;
    }

    getOpponentTrophies() {
        return this.opponentTrophies;
    }

    // Reset lives to initial state (TurnTracker handles turn reset)
    reset() {
        this.playerLives = this.maxLives;
        this.opponentLives = this.maxLives;
    }

    // Get life statistics (includes turn from tracker)
    getLifeStats() {
        return {
            playerLives: this.playerLives,
            opponentLives: this.opponentLives,
            playerLostLives: this.getPlayerLostLives(),
            opponentLostLives: this.getOpponentLostLives(),
            totalDamageDealt: this.getOpponentLostLives(),
            totalDamageTaken: this.getPlayerLostLives(),
            currentTurn: this.getCurrentTurn(), // Get from tracker
            gameOver: this.isGameOver(),
            winner: this.getWinner()
        };
    }
}

// Export for ES6 module compatibility
export default LifeManager;