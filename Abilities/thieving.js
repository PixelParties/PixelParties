// ./Abilities/thieving.js - Thieving Ability Implementation

export class ThievingManager {
    constructor() {
        // Configurable constant for gold stolen per thieving level
        this.GOLD_PER_THIEVING_LEVEL = 2;
    }

    /**
     * Calculate thieving amounts for both players
     * @param {Object} playerFormation - Player's hero formation
     * @param {Object} opponentFormation - Opponent's hero formation  
     * @param {Object} playerAbilities - Player's hero abilities
     * @param {Object} opponentAbilities - Opponent's hero abilities
     * @param {number} playerCurrentGold - Player's current gold before rewards
     * @param {number} opponentCurrentGold - Opponent's current gold before rewards
     * @returns {Object} Thieving calculation results
     */
    calculateThievingEffects(playerFormation, opponentFormation, playerAbilities, opponentAbilities, 
                           playerCurrentGold, opponentCurrentGold) {
        
        const result = {
            playerThievingLevel: 0,
            opponentThievingLevel: 0,
            playerGoldStolen: 0,      // Gold player steals from opponent
            opponentGoldStolen: 0,    // Gold opponent steals from player
            playerNetThieving: 0,     // Net thieving effect for player
            opponentNetThieving: 0,   // Net thieving effect for opponent
            playerThievingDetails: [],
            opponentThievingDetails: []
        };

        // Calculate player's thieving level
        result.playerThievingLevel = this.calculateThievingLevel(
            playerFormation, playerAbilities, result.playerThievingDetails, 'Player'
        );

        // Calculate opponent's thieving level  
        result.opponentThievingLevel = this.calculateThievingLevel(
            opponentFormation, opponentAbilities, result.opponentThievingDetails, 'Opponent'
        );

        // Calculate actual gold theft amounts (limited by available gold)
        // Apply the gold multiplier here
        const playerMaxSteal = result.playerThievingLevel * this.GOLD_PER_THIEVING_LEVEL;
        const opponentMaxSteal = result.opponentThievingLevel * this.GOLD_PER_THIEVING_LEVEL;
        
        result.playerGoldStolen = Math.min(playerMaxSteal, opponentCurrentGold);
        result.opponentGoldStolen = Math.min(opponentMaxSteal, playerCurrentGold);

        // Calculate net thieving effects
        result.playerNetThieving = result.playerGoldStolen - result.opponentGoldStolen;
        result.opponentNetThieving = result.opponentGoldStolen - result.playerGoldStolen;

        return result;
    }

    /**
     * Calculate thieving level for a specific player's formation
     * @param {Object} formation - Hero formation object
     * @param {Object} abilities - Hero abilities object
     * @param {Array} details - Array to populate with thieving details
     * @param {string} playerLabel - Label for logging purposes
     * @returns {number} Total thieving level
     */
    calculateThievingLevel(formation, abilities, details, playerLabel) {
        let totalThievingLevel = 0;

        if (!formation || !abilities) {
            return 0;
        }

        ['left', 'center', 'right'].forEach(position => {
            const hero = formation[position];
            if (hero && abilities[position]) {
                
                let heroThievingLevel = 0;
                
                // Count Thieving abilities across all zones
                ['zone1', 'zone2', 'zone3'].forEach(zone => {
                    if (abilities[position][zone] && Array.isArray(abilities[position][zone])) {
                        const thievingCount = abilities[position][zone].filter(a => a && a.name === 'Thieving').length;
                        heroThievingLevel += thievingCount;
                    }
                });
                
                if (heroThievingLevel > 0) {
                    totalThievingLevel += heroThievingLevel;
                    details.push({
                        heroName: hero.name,
                        position: position,
                        level: heroThievingLevel,
                        goldPerLevel: this.GOLD_PER_THIEVING_LEVEL,
                        totalGoldStolen: heroThievingLevel * this.GOLD_PER_THIEVING_LEVEL
                    });
                }
            }
        });
        return totalThievingLevel;
    }

    /**
     * Create HTML for thieving breakdown display
     * @param {Object} thievingData - Thieving calculation results
     * @param {boolean} isPlayer - True if this is for the player, false for opponent
     * @returns {string} HTML string for thieving breakdown
     */
    createThievingBreakdownHTML(thievingData, isPlayer = true) {
        if (!thievingData) return '';

        const goldStolen = isPlayer ? thievingData.playerGoldStolen : thievingData.opponentGoldStolen;
        const goldLost = isPlayer ? thievingData.opponentGoldStolen : thievingData.playerGoldStolen;
        const netThieving = isPlayer ? thievingData.playerNetThieving : thievingData.opponentNetThieving;
        const details = isPlayer ? thievingData.playerThievingDetails : thievingData.opponentThievingDetails;

        let html = '';

        // Show gold stolen (positive)
        if (goldStolen > 0) {
            html += `
                <div class="gold-line-item thieving-bonus">
                    <span class="gold-source">Thieving (${goldStolen} stolen)</span>
                    <span class="gold-arrow">→</span>
                    <span class="gold-amount">+${goldStolen}</span>
                </div>
            `;

            // Show thieving details
            if (details.length > 0) {
                html += `
                    <div class="thieving-details">
                        ${details.map(detail => `
                            <div class="thieving-detail-line">
                                <span class="hero-name">${detail.heroName}</span>
                                <span class="thieving-level">${detail.level} ${detail.level === 1 ? 'level' : 'levels'}</span>
                                <span class="thieving-contribution">Steals ${detail.totalGoldStolen}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        // Show gold lost (negative, in red)
        if (goldLost > 0) {
            html += `
                <div class="gold-line-item thieving-penalty">
                    <span class="gold-source">Stolen by opponent</span>
                    <span class="gold-arrow">→</span>
                    <span class="gold-amount">-${goldLost}</span>
                </div>
            `;
        }

        return html;
    }

    /**
     * Apply thieving effects to gold managers
     * @param {Object} playerGoldManager - Player's gold manager
     * @param {Object} opponentGoldManager - Opponent's gold manager  
     * @param {Object} thievingData - Thieving calculation results
     * @param {boolean} isHost - Whether current player is host
     */
    applyThievingEffects(playerGoldManager, opponentGoldManager, thievingData, isHost = true) {
        if (!playerGoldManager || !opponentGoldManager || !thievingData) {
            console.warn('Missing required managers or data for thieving effects');
            return;
        }

        const playerNetEffect = thievingData.playerNetThieving;
        const opponentNetEffect = thievingData.opponentNetThieving;

        // Apply net thieving effects
        if (playerNetEffect > 0) {
            // Player gains gold from thieving
            playerGoldManager.addPlayerGold(playerNetEffect);
        } else if (playerNetEffect < 0) {
            // Player loses gold to opponent's thieving
            playerGoldManager.subtractPlayerGold(Math.abs(playerNetEffect));
        }

        if (opponentNetEffect > 0) {
            // Opponent gains gold from thieving
            opponentGoldManager.addOpponentGold(opponentNetEffect);
        } else if (opponentNetEffect < 0) {
            // Opponent loses gold to player's thieving
            opponentGoldManager.subtractOpponentGold(Math.abs(opponentNetEffect));
        }
    }

    /**
     * Complete thieving calculation for reward screen integration
     * @param {Object} heroSelection - Hero selection manager reference
     * @param {Object} goldManager - Gold manager reference
     * @returns {Object} Complete thieving breakdown for rewards
     */
    calculateForRewards(heroSelection, goldManager) {
        if (!heroSelection || !heroSelection.formationManager || !heroSelection.heroAbilitiesManager) {
            return {
                thievingGained: 0,
                thievingLost: 0,
                thievingDetails: null
            };
        }

        // Get current formations and abilities
        const playerFormation = heroSelection.formationManager.getBattleFormation();
        const playerAbilities = {};
        ['left', 'center', 'right'].forEach(position => {
            playerAbilities[position] = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
        });

        // Get opponent data (cached from battle)
        const opponentData = this.getOpponentDataForThieving(heroSelection);
        if (!opponentData) {
            return {
                thievingGained: 0,
                thievingLost: 0,
                thievingDetails: null
            };
        }

        const { opponentFormation, opponentAbilities } = opponentData;

        // Get current gold amounts BEFORE rewards
        const playerCurrentGold = goldManager.getPlayerGold();
        const opponentCurrentGold = goldManager.getOpponentGold();

        // Calculate thieving effects
        const thievingData = this.calculateThievingEffects(
            playerFormation, opponentFormation,
            playerAbilities, opponentAbilities,
            playerCurrentGold, opponentCurrentGold
        );

        return {
            thievingGained: thievingData.playerGoldStolen,
            thievingLost: thievingData.opponentGoldStolen,
            thievingDetails: thievingData
        };
    }

    /**
     * Get opponent data for thieving calculations
     * @param {Object} heroSelection - Hero selection manager reference
     * @returns {Object|null} Opponent formation and abilities data
     */
    getOpponentDataForThieving(heroSelection) {
        // Try to get cached opponent data from hero selection
        if (heroSelection && heroSelection.cachedOpponentData) {
            return heroSelection.cachedOpponentData;
        }

        // Try to get from battle manager if available
        if (window.heroSelection && window.heroSelection.battleScreen && 
            window.heroSelection.battleScreen.battleManager) {
            const battleManager = window.heroSelection.battleScreen.battleManager;
            
            return {
                opponentFormation: battleManager.opponentFormation,
                opponentAbilities: battleManager.opponentAbilities
            };
        }

        console.warn('⚠️ Could not retrieve opponent data for thieving calculation');
        return null;
    }

    /**
     * Generate HTML sections for thieving breakdown
     * @param {Object} thievingData - Thieving calculation results
     * @returns {string} HTML string for thieving sections
     */
    generateBreakdownHTML(thievingData) {
        if (!thievingData || (!thievingData.thievingGained && !thievingData.thievingLost)) {
            return '';
        }

        let html = '';

        // Thieving Gained Section
        if (thievingData.thievingGained > 0) {
            html += `
                <div class="gold-line-item thieving-bonus">
                    <span class="gold-source">Thieving (${thievingData.thievingGained} stolen)</span>
                    <span class="gold-arrow">→</span>
                    <span class="gold-amount">+${thievingData.thievingGained}</span>
                </div>
            `;

            // Thieving Details
            if (thievingData.thievingDetails && thievingData.thievingDetails.playerThievingDetails) {
                html += `
                    <div class="thieving-details">
                        ${thievingData.thievingDetails.playerThievingDetails.map(detail => `
                            <div class="thieving-detail-line">
                                <span class="hero-name">${detail.heroName}</span>
                                <span class="thieving-level">${detail.level} ${detail.level === 1 ? 'level' : 'levels'}</span>
                                <span class="thieving-gold">Steals ${detail.totalGoldStolen}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        // Thieving Lost Section
        if (thievingData.thievingLost > 0) {
            html += `
                <div class="gold-line-item thieving-penalty">
                    <span class="gold-source">Stolen by opponent</span>
                    <span class="gold-arrow">→</span>
                    <span class="gold-amount">-${thievingData.thievingLost}</span>
                </div>
            `;
        }

        return html;
    }

    /**
     * Send thieving update to opponent
     * @param {Object} thievingDetails - Thieving calculation results
     * @param {Function} gameDataSender - Function to send game data
     */
    sendThievingUpdate(thievingDetails, gameDataSender) {
        if (gameDataSender && thievingDetails && 
            (thievingDetails.playerGoldStolen > 0 || thievingDetails.opponentGoldStolen > 0)) {
            
            gameDataSender('thieving_effects', {
                playerGoldStolen: thievingDetails.playerGoldStolen,
                opponentGoldStolen: thievingDetails.opponentGoldStolen,
                playerThievingDetails: thievingDetails.playerThievingDetails,
                opponentThievingDetails: thievingDetails.opponentThievingDetails,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle opponent thieving effects
     * @param {Object} thievingData - Received thieving data from opponent
     * @param {Object} goldManager - Gold manager reference
     */
    handleOpponentEffects(thievingData, goldManager) {       
        if (!goldManager) {
            console.warn('⚠️ No gold manager available for thieving effects');
            return;
        }
        
        // Apply gold changes to opponent's gold (from our perspective)
        if (thievingData.opponentGoldStolen > 0) {
            // Opponent stole gold from us - reduce our gold
            goldManager.subtractPlayerGold(thievingData.opponentGoldStolen);
        }
        
        if (thievingData.playerGoldStolen > 0) {
            // We stole gold from opponent - reduce opponent's gold  
            goldManager.subtractOpponentGold(thievingData.playerGoldStolen);
        }
        
        // Show visual notification
        this.showThievingNotification(thievingData);
    }

    /**
     * Show thieving notification to player
     * @param {Object} thievingData - Thieving effect data
     */
    showThievingNotification(thievingData) {
        let message = '';
        let type = 'info';
        
        if (thievingData.playerGoldStolen > 0 && thievingData.opponentGoldStolen > 0) {
            const net = thievingData.playerGoldStolen - thievingData.opponentGoldStolen;
            if (net > 0) {
                message = `🏴‍☠️ Thieving Battle! You stole ${net} more gold than opponent!`;
                type = 'success';
            } else if (net < 0) {
                message = `💸 Thieving Battle! Opponent stole ${Math.abs(net)} more gold than you!`;
                type = 'error';
            } else {
                message = `⚖️ Thieving Standoff! Both sides stole equal amounts!`;
                type = 'info';
            }
        } else if (thievingData.playerGoldStolen > 0) {
            message = `🏴‍☠️ Your thieves stole ${thievingData.playerGoldStolen} gold!`;
            type = 'success';
        } else if (thievingData.opponentGoldStolen > 0) {
            message = `💸 Opponent's thieves stole ${thievingData.opponentGoldStolen} gold from you!`;
            type = 'error';
        }
        
        if (message) {
            this.createAndShowNotification(message, type);
        }
    }

    /**
     * Create and display a notification element
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    createAndShowNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `thieving-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : type === 'error' ? 'rgba(244, 67, 54, 0.9)' : 'rgba(102, 126, 234, 0.9)'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        // Ensure animations are available
        this.ensureNotificationStyles();
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    /**
     * Ensure notification styles are loaded
     */
    ensureNotificationStyles() {
        if (document.getElementById('thievingNotificationStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'thievingNotificationStyles';
        style.textContent = `
            @keyframes slideIn {
                from { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
                to { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
            }
            
            @keyframes slideOut {
                from { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
                to { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Create combat log messages for thieving effects
     * @param {Object} thievingData - Thieving calculation results
     * @param {Function} addLogCallback - Function to add messages to combat log
     */
    logThievingEffects(thievingData, addLogCallback) {
        if (!thievingData || !addLogCallback) return;

        const { playerGoldStolen, opponentGoldStolen, playerThievingDetails, opponentThievingDetails } = thievingData;

        // Log thieving attempts
        if (playerGoldStolen > 0 || opponentGoldStolen > 0) {
            addLogCallback('🏴‍☠️ Thieving Abilities Activated!', 'info');
        }

        if (playerGoldStolen > 0) {
            const heroNames = playerThievingDetails.map(d => d.heroName).join(', ');
            addLogCallback(
                `💰 Your thieves (${heroNames}) stole ${playerGoldStolen} gold from the opponent!`, 
                'success'
            );
        }

        if (opponentGoldStolen > 0) {
            const heroNames = opponentThievingDetails.map(d => d.heroName).join(', ');
            addLogCallback(
                `💸 Opponent's thieves (${heroNames}) stole ${opponentGoldStolen} gold from you!`, 
                'error'
            );
        }

        // Log if thieving was limited by available gold
        const playerMaxSteal = thievingData.playerThievingLevel * this.GOLD_PER_THIEVING_LEVEL;
        const opponentMaxSteal = thievingData.opponentThievingLevel * this.GOLD_PER_THIEVING_LEVEL;
        
        if (playerMaxSteal > playerGoldStolen) {
            addLogCallback(
                `⚠️ Your thieves attempted to steal ${playerMaxSteal} gold but opponent only had ${playerGoldStolen}!`, 
                'info'
            );
        }

        if (opponentMaxSteal > opponentGoldStolen) {
            addLogCallback(
                `⚠️ Opponent's thieves attempted to steal ${opponentMaxSteal} gold but you only had ${opponentGoldStolen}!`, 
                'info'
            );
        }
    }
}

// Export for ES6 module compatibility
export default ThievingManager;