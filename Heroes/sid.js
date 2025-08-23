// ./Heroes/sid.js - Sid Hero Effect: Card Stealing

export class SidHeroEffect {
    constructor() {
        this.stolenCardData = null;
    }

    // Check if Sid is in the formation
    static hasSidInFormation(formation) {
        if (!formation) return false;
        return ['left', 'center', 'right'].some(position => 
            formation[position] && formation[position].name === 'Sid'
        );
    }

    // Main stealing function called from cardRewardManager
    async performCardTheft(heroSelection, cardRewardManager) {       
        if (!heroSelection || !heroSelection.roomManager) {
            return null;
        }

        const formation = heroSelection.formationManager.getBattleFormation();
        
        if (!SidHeroEffect.hasSidInFormation(formation)) {
            return null;
        }

        try {
            const roomRef = heroSelection.roomManager.getRoomRef();
            if (!roomRef) {
                return null;
            }

            const isHost = heroSelection.isHost;
            
            // Get opponent's hand from Firebase
            const gameStateSnapshot = await roomRef.child('gameState').once('value');
            const gameState = gameStateSnapshot.val();
            
            if (!gameState) {
                return null;
            }

            // Get opponent's hand data
            const opponentHandKey = isHost ? 'guestHand' : 'hostHand';
            let opponentHandData = gameState[opponentHandKey];

            // Handle the correct HandManager export format
            let handArray = [];
            if (opponentHandData && opponentHandData.cards && Array.isArray(opponentHandData.cards)) {
                handArray = [...opponentHandData.cards]; // Copy the cards array
            } else {
                return null;
            }

            if (handArray.length === 0) {
                return null;
            }

            // Steal a random card
            const randomIndex = Math.floor(Math.random() * handArray.length);
            const stolenCard = handArray[randomIndex];
            
            // Remove the stolen card from the array
            handArray.splice(randomIndex, 1);

            // Add to Sid player's hand
            if (heroSelection.handManager) {
                const added = heroSelection.handManager.addCardToHand(stolenCard);
                
                if (!added) {
                    return null;
                }
            }

            const updates = {};

            // Update opponent's hand maintaining the correct HandManager format
            updates[`gameState/${opponentHandKey}`] = {
                cards: handArray,
                size: handArray.length,
                maxSize: opponentHandData.maxSize || 10,
                overlapLevel: this.getOverlapLevel(handArray.length),
                timestamp: Date.now()
            };

            // Update our hand using HandManager's export method
            const myHandKey = isHost ? 'hostHand' : 'guestHand';
            if (heroSelection.handManager) {
                updates[`gameState/${myHandKey}`] = heroSelection.handManager.exportHand();
            }

            await roomRef.update(updates);
            
            // Store stolen card data for display
            this.stolenCardData = {
                cardName: String(stolenCard),
                thiefSide: isHost ? 'host' : 'guest',
                victimSide: isHost ? 'guest' : 'host',
                timestamp: Date.now()
            };
            
            // Send sync message
            if (heroSelection.gameDataSender) {
                heroSelection.gameDataSender('sid_card_theft', {
                    stolenCard: String(stolenCard),
                    thiefSide: this.stolenCardData.thiefSide,
                    victimSide: this.stolenCardData.victimSide,
                    timestamp: this.stolenCardData.timestamp
                });
            }

            return this.stolenCardData;

        } catch (error) {
            console.error('🎭 SID THEFT: ERROR during card theft:', error);
            return null;
        }
    }

    // Helper method to calculate overlap level (add this to the SidHeroEffect class)
    getOverlapLevel(handSize) {
        if (handSize <= 5) return 'none';
        if (handSize === 6) return 'light';
        if (handSize === 7) return 'moderate';
        if (handSize === 8) return 'heavy';
        if (handSize >= 9) return 'maximum';
        return 'none';
    }

    formatCardName(cardName) {
        // Ensure cardName is a string
        if (typeof cardName !== 'string') {
            console.warn('formatCardName received non-string:', cardName);
            cardName = String(cardName);
        }
        
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Handle receiving theft notification as victim
    async handleOpponentTheft(data, heroSelection) {      
        if (!data || !heroSelection) return;

        const { stolenCard, thiefSide, victimSide } = data;
                
        // Store the theft data for display
        this.stolenCardData = {
            cardName: stolenCard,
            thiefSide: thiefSide,
            victimSide: victimSide,
            timestamp: data.timestamp
        };

        // Remove the card from our hand
        if (heroSelection.handManager) {
            const myHand = heroSelection.handManager.getHand();
            
            const cardIndex = myHand.indexOf(stolenCard);
            
            if (cardIndex !== -1) {
                await heroSelection.removeCardFromHandByIndex(cardIndex);
                
                // NEW: Check if we're in reward screen and update it immediately
                const rewardOverlay = document.getElementById('cardRewardOverlay');
                if (rewardOverlay && heroSelection.cardRewardManager) {
                    setTimeout(() => {
                        heroSelection.cardRewardManager.updateRewardScreenHandDisplay();
                    }, 100);
                }
                
                // Update Firebase with our new hand
                if (heroSelection.roomManager) {
                    const roomRef = heroSelection.roomManager.getRoomRef();
                    if (roomRef) {
                        const isHost = heroSelection.isHost;
                        const myHandKey = isHost ? 'hostHand' : 'guestHand';

                        setTimeout(async () => {
                            if (heroSelection.roomManager) {
                                const roomRef = heroSelection.roomManager.getRoomRef();
                                if (roomRef) {
                                    const updatedHandData = heroSelection.handManager.exportHand();
                                    await roomRef.child('gameState').child(myHandKey).set(updatedHandData);
                                }
                            }
                        }, 100);

                        if (heroSelection.gameDataSender) {
                            const messageData = {
                                stolenCard: String(stolenCard),
                                thiefSide: this.stolenCardData.thiefSide,
                                victimSide: this.stolenCardData.victimSide,
                                timestamp: this.stolenCardData.timestamp
                            };
                            heroSelection.gameDataSender('sid_card_theft', messageData);
                        }
                    }
                }
                
                // Show notification to victim
                this.showVictimNotification(stolenCard);
                
            } else {
                console.warn(`🎭 VICTIM: Card ${stolenCard} not found in hand!`);
            }
        }
    }

    showVictimNotification(cardName) {
        const formattedName = this.formatCardName(cardName);
        
        const notification = document.createElement('div');
        notification.className = 'sid-theft-notification';
        notification.innerHTML = `
            <div class="sid-theft-content">
                <span class="sid-icon">🎭</span>
                <span class="theft-text">Opponent's Sid stole <strong>${formattedName}</strong> from your hand!</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(138, 43, 226, 0.95));
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 8px 25px rgba(138, 43, 226, 0.6);
            border: 2px solid rgba(255, 255, 255, 0.2);
            animation: sidTheftSlideIn 0.5s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Add animation style if not present
        if (!document.getElementById('sidTheftAnimations')) {
            const style = document.createElement('style');
            style.id = 'sidTheftAnimations';
            style.textContent = `
                @keyframes sidTheftSlideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes sidTheftSlideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
                
                .sid-theft-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .sid-theft-content .sid-icon {
                    font-size: 24px;
                    animation: sidIconSpin 2s ease-in-out;
                }
                
                @keyframes sidIconSpin {
                    0% { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(180deg) scale(1.2); }
                    100% { transform: rotate(360deg) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            notification.style.animation = 'sidTheftSlideOut 0.5s ease-out';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    // Generate HTML for the stolen cards section in reward breakdown
    generateStolenCardsHTML(isThief) {
        if (!this.stolenCardData) return '';

        const formattedName = this.formatCardName(this.stolenCardData.cardName);

        if (isThief) {
            return `
                <div class="sid-theft-section">
                    <div class="sid-theft-header">
                        <span class="sid-icon">🎭</span>
                        <span class="sid-title">Stolen Cards</span>
                    </div>
                    <div class="sid-theft-item success">
                        <span class="theft-icon">+</span>
                        <span class="theft-card-name">${formattedName}</span>
                        <span class="theft-message">Sid completed a heist!</span>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="sid-theft-section">
                    <div class="sid-theft-header">
                        <span class="sid-icon">🎭</span>
                        <span class="sid-title">Stolen Cards</span>
                    </div>
                    <div class="sid-theft-item loss">
                        <span class="theft-icon">-</span>
                        <span class="theft-card-name">${formattedName}</span>
                        <span class="theft-message">Enemy Sid stole from you!</span>
                    </div>
                </div>
            `;
        }
    }

    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Get styles for Sid theft display
    static getSidStyles() {
        return `
            .sid-theft-section {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 2px solid rgba(138, 43, 226, 0.3);
            }

            .sid-theft-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                font-weight: bold;
                color: #fff;
                font-size: 14px;
            }

            .sid-theft-header .sid-icon {
                font-size: 18px;
                filter: drop-shadow(0 0 4px rgba(138, 43, 226, 0.6));
            }

            .sid-theft-header .sid-title {
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .sid-theft-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                border-radius: 8px;
                margin: 6px 0;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .sid-theft-item.success {
                background: rgba(76, 175, 80, 0.15);
                border: 1px solid rgba(76, 175, 80, 0.3);
            }

            .sid-theft-item.success:hover {
                background: rgba(76, 175, 80, 0.2);
                transform: translateX(3px);
            }

            .sid-theft-item.success .theft-icon {
                color: #4caf50;
                font-weight: bold;
                font-size: 16px;
            }

            .sid-theft-item.success .theft-card-name {
                color: #4caf50;
                font-weight: 600;
                flex: 1;
            }

            .sid-theft-item.success .theft-message {
                color: rgba(76, 175, 80, 0.9);
                font-style: italic;
                font-size: 12px;
            }

            .sid-theft-item.loss {
                background: rgba(244, 67, 54, 0.15);
                border: 1px solid rgba(244, 67, 54, 0.3);
            }

            .sid-theft-item.loss:hover {
                background: rgba(244, 67, 54, 0.2);
                transform: translateX(3px);
            }

            .sid-theft-item.loss .theft-icon {
                color: #f44336;
                font-weight: bold;
                font-size: 16px;
            }

            .sid-theft-item.loss .theft-card-name {
                color: #f44336;
                font-weight: 600;
                flex: 1;
            }

            .sid-theft-item.loss .theft-message {
                color: rgba(244, 67, 54, 0.9);
                font-style: italic;
                font-size: 12px;
            }
        `;
    }
}

// Singleton instance
export const sidHeroEffect = new SidHeroEffect();