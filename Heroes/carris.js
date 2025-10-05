// ./Heroes/carris.js - Carris Hero Time Limit System
// Handles the special battle end condition for Carris heroes

export class CarrisHeroEffect {
    /**
     * Check if Carris time limit has been reached and handle battle end
     * @param {BattleManager} battleManager 
     * @returns {boolean} True if battle should end due to Carris time limit
     */
    static checkCarrisTimeLimit(battleManager) {
        // Only check from turn 3 onwards
        if (battleManager.currentTurn < 3) {
            return false;
        }

        // IMPORTANT: Only apply Carris time limit if battle hasn't already ended normally
        // Check if either side has already won through normal victory conditions
        const playerHeroesAlive = Object.values(battleManager.playerHeroes).some(hero => hero && hero.alive);
        const opponentHeroesAlive = Object.values(battleManager.opponentHeroes).some(hero => hero && hero.alive);
        
        // If battle has already been decided by normal means, don't override with time limit
        if (!playerHeroesAlive || !opponentHeroesAlive) {
            return false; // Battle already decided normally
        }

        const playerHasCarris = this.playerHasCarrisHero(battleManager);
        const opponentHasCarris = this.opponentHasCarrisHero(battleManager);

        if (!playerHasCarris && !opponentHasCarris) {
            return false; // No Carris heroes, no time limit
        }

        // Handle the different scenarios
        if (playerHasCarris && opponentHasCarris) {
            // Both have Carris - draw
            this.handleCarrisTimeLimitDraw(battleManager);
            return true;
        } else if (playerHasCarris) {
            // Player has Carris - player loses
            this.handleCarrisTimeLimitLoss(battleManager, 'player');
            return true;
        } else if (opponentHasCarris) {
            // Opponent has Carris - opponent loses
            this.handleCarrisTimeLimitLoss(battleManager, 'opponent');
            return true;
        }

        return false;
    }

    /**
     * Check if player has a Carris hero
     */
    static playerHasCarrisHero(battleManager) {
        return this.sideHasCarrisHero(battleManager.playerHeroes);
    }

    /**
     * Check if opponent has a Carris hero
     */
    static opponentHasCarrisHero(battleManager) {
        return this.sideHasCarrisHero(battleManager.opponentHeroes);
    }

    /**
     * Check if a side has any Carris hero
     */
    static sideHasCarrisHero(heroes) {
        return ['left', 'center', 'right'].some(position => {
            const hero = heroes[position];
            return hero && hero.name === 'Carris';
        });
    }

    /**
     * Handle battle end due to both players having Carris (draw)
     */
    static handleCarrisTimeLimitDraw(battleManager) {
        battleManager.addCombatLog('⏰ Everyone\'s time ran out!', 'warning');
        battleManager.addCombatLog('⚖️ Battle ends in a draw due to time limit!', 'info');
        
        // Force all heroes to be defeated to trigger draw condition
        this.forceDrawFromTimeLimit(battleManager);
    }

    /**
     * Handle battle end due to one player having Carris (that player loses)
     */
    static handleCarrisTimeLimitLoss(battleManager, losingSide) {
        if (losingSide === 'player') {
            battleManager.addCombatLog('⏰ Your time ran out!', 'error');
            battleManager.addCombatLog('💀 You lose due to time limit!', 'error');
            
            // Defeat all player heroes
            this.defeatAllHeroesOnSide(battleManager.playerHeroes);
            
            // Send network update to guest
            if (battleManager.isAuthoritative) {
                battleManager.sendBattleUpdate('carris_time_limit', {
                    type: 'player_loss',
                    turn: battleManager.currentTurn,
                    reason: 'Player has Carris - time limit reached',
                    timestamp: Date.now()
                });
            }
        } else {
            battleManager.addCombatLog('⏰ Your opponent\'s time ran out!', 'success');
            battleManager.addCombatLog('🏆 You win due to opponent\'s time limit!', 'success');
            
            // Defeat all opponent heroes
            this.defeatAllHeroesOnSide(battleManager.opponentHeroes);
            
            // Send network update to guest
            if (battleManager.isAuthoritative) {
                battleManager.sendBattleUpdate('carris_time_limit', {
                    type: 'opponent_loss',
                    turn: battleManager.currentTurn,
                    reason: 'Opponent has Carris - time limit reached',
                    timestamp: Date.now()
                });
            }
        }
    }

    /**
     * Force battle to end as draw due to time limit
     */
    static forceDrawFromTimeLimit(battleManager) {
        // Set all heroes as defeated to trigger draw condition
        this.defeatAllHeroesOnSide(battleManager.playerHeroes);
        this.defeatAllHeroesOnSide(battleManager.opponentHeroes);
        
        // Send time limit notification to guest
        if (battleManager.isAuthoritative) {
            battleManager.sendBattleUpdate('carris_time_limit', {
                type: 'draw',
                turn: battleManager.currentTurn,
                reason: 'Both players have Carris - time limit reached',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Defeat all heroes on a given side
     */
    static defeatAllHeroesOnSide(heroes) {
        ['left', 'center', 'right'].forEach(position => {
            if (heroes[position]) {
                heroes[position].alive = false;
                heroes[position].currentHp = 0;
            }
        });
    }

    /**
     * Handle guest receiving Carris time limit notification
     */
    static handleGuestCarrisTimeLimit(data, battleManager) {
        if (battleManager.isAuthoritative) return; // Only process on guest side
        
        const { type, turn, reason } = data;
        
        if (type === 'draw') {
            battleManager.addCombatLog('⏰ Everyone\'s time ran out!', 'warning');
            battleManager.addCombatLog('⚖️ Battle ends in a draw due to time limit!', 'info');
            
            // Set all heroes as defeated to trigger draw condition
            this.defeatAllHeroesOnSide(battleManager.playerHeroes);
            this.defeatAllHeroesOnSide(battleManager.opponentHeroes);
        } else if (type === 'player_loss') {
            // Guest receives that host player lost, so guest wins
            battleManager.addCombatLog('⏰ Your opponent\'s time ran out!', 'success');
            battleManager.addCombatLog('🏆 You win due to opponent\'s time limit!', 'success');
            
            // Defeat opponent heroes (host's player heroes are guest's opponent heroes)
            this.defeatAllHeroesOnSide(battleManager.opponentHeroes);
        } else if (type === 'opponent_loss') {
            // Guest receives that host opponent lost, so guest loses
            battleManager.addCombatLog('⏰ Your time ran out!', 'error');
            battleManager.addCombatLog('💀 You lose due to time limit!', 'error');
            
            // Defeat player heroes (host's opponent heroes are guest's player heroes)
            this.defeatAllHeroesOnSide(battleManager.playerHeroes);
        }
    }
}