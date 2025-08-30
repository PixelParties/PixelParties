// futureTechLamp.js - Future Tech Lamp Artifact with Exclusive Mode System
// "Choose 1 card from X random cards in your deck and add it to your hand."
// X = number of FutureTechLamp cards in graveyard + 1

export const futureTechLampArtifact = {
    // Main handler for when FutureTechLamp is clicked/used
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log('🔮 FutureTechLamp activated');
        
        // Check if player can afford the artifact
        const cardInfo = heroSelection.getCardInfo(cardName);
        const cost = cardInfo?.cost || 0;
        const playerGold = heroSelection.getGoldManager().getPlayerGold();
        
        if (playerGold < cost) {
            this.showError(`You need ${cost} Gold to use FutureTechLamp!`);
            return;
        }
        
        // Consume the card from hand
        const removedCard = heroSelection.removeCardFromHandByIndex(cardIndex);
        if (!removedCard) {
            console.error('Failed to remove FutureTechLamp from hand');
            return;
        }
        
        // Charge the gold
        if (cost > 0) {
            heroSelection.getGoldManager().addPlayerGold(-cost, 'future_tech_lamp_use');
        }
        
        // Enter Lamp Mode and register as exclusive
        await this.enterLampMode(heroSelection, cost);
    },

    // Enter Lamp Mode with exclusive artifact registration
    async enterLampMode(heroSelection, goldSpent = 0, savedCardChoices = null) {
        console.log('🔮 Entering Future Tech Lamp Mode');
        
        // IMPORTANT: Register as exclusive artifact FIRST
        if (window.artifactHandler) {
            window.artifactHandler.setExclusiveArtifactActive('FutureTechLamp');
        }
        
        // Calculate number of choices based on FutureTechLamp cards in graveyard
        const numChoices = min(9, this.calculateNumberOfChoices());
        console.log(`🔮 Generating ${numChoices} card choices based on graveyard count`);
        
        // Generate or use saved card choices
        const cardChoices = savedCardChoices || this.generateCardChoices(heroSelection, numChoices);
        
        if (!cardChoices || cardChoices.length === 0) {
            // If no cards available, exit immediately
            console.warn('🔮 No cards available in deck for FutureTechLamp');
            await this.exitLampMode(heroSelection);
            return;
        }
        
        // Store the mode state
        this.setLampState(heroSelection, {
            active: true,
            goldSpent: goldSpent,
            cardChoices: cardChoices,
            numChoices: numChoices,
            activatedAt: Date.now()
        });
        
        // Show lamp mode UI
        this.showLampModeUI(heroSelection, cardChoices, numChoices);
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        // Save game state to persist the mode
        await heroSelection.saveGameState();
        
        console.log('🔮 Future Tech Lamp Mode activated successfully');
    },

    // Exit Lamp Mode with exclusive artifact cleanup
    async exitLampMode(heroSelection) {
        console.log('🔮 Exiting Future Tech Lamp Mode');
        
        // Clear exclusive artifact state FIRST
        if (window.artifactHandler) {
            window.artifactHandler.clearExclusiveArtifactActive();
        }
        
        // Clear the mode state
        this.clearLampState(heroSelection);
        
        // Hide lamp mode UI
        this.hideLampModeUI();
        
        // Re-enable "To Battle!" button
        this.disableToBattleButton(false);
        
        // Update displays
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log('🔮 Future Tech Lamp Mode deactivated');
    },

    // Calculate number of choices based on FutureTechLamp cards in graveyard
    calculateNumberOfChoices() {
        if (!window.graveyardManager) {
            return 1; // Default to 1 if graveyard manager not available
        }
        
        const lampCardsInGraveyard = window.graveyardManager.getCardCount('FutureTechLamp');
        const numChoices = lampCardsInGraveyard + 1;
        
        console.log(`🔮 Found ${lampCardsInGraveyard} FutureTechLamp cards in graveyard, generating ${numChoices} choices`);
        return numChoices;
    },

    // Generate X random cards from player's deck (duplicates allowed)
    generateCardChoices(heroSelection, numChoices = 1) {
        if (!heroSelection.deckManager) {
            return [];
        }
        
        const deck = heroSelection.deckManager.getDeck();
        if (!deck || deck.length === 0) {
            return [];
        }
        
        const choices = [];
        for (let i = 0; i < numChoices; i++) {
            const randomIndex = Math.floor(Math.random() * deck.length);
            choices.push(deck[randomIndex]);
        }
        
        return choices;
    },

    // Show lamp mode UI with dynamic number of card choices
    showLampModeUI(heroSelection, cardChoices, numChoices) {
        // Remove any existing lamp UI
        this.hideLampModeUI();
        
        // Create dynamic header text based on number of choices
        const choicesText = numChoices === 1 ? 'your only option' : 
                           numChoices === 2 ? 'one of these 2 cards' :
                           `one of these ${numChoices} cards`;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'lampModeOverlay';
        overlay.className = 'lamp-mode-overlay';
        overlay.innerHTML = `
            <div class="lamp-mode-container">
                <div class="lamp-mode-header">
                    <div class="lamp-icon">🔮</div>
                    <h2>Future Tech Lamp</h2>
                    <p>Choose ${choicesText} to add to your hand</p>
                </div>
                
                <div class="lamp-card-choices">
                    ${cardChoices.map((cardName, index) => this.createLampCardHTML(cardName, index, heroSelection)).join('')}
                </div>
            </div>
        `;
        
        // Add to game screen
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.appendChild(overlay);
        }
        
        // Add click handlers
        cardChoices.forEach((cardName, index) => {
            const cardElement = overlay.querySelector(`[data-lamp-card-index="${index}"]`);
            if (cardElement) {
                cardElement.addEventListener('click', async () => {
                    await this.selectCard(heroSelection, cardName);
                });
            }
        });
        
        // Add CSS if not already present
        this.ensureLampStyles();
    },

    // Create HTML for a single lamp card choice
    createLampCardHTML(cardName, index, heroSelection) {
        const cardPath = `./Cards/All/${cardName}.png`;
        const formattedName = this.formatCardName(cardName);
        
        return `
            <div class="lamp-card-choice" data-lamp-card-index="${index}">
                <div class="lamp-card-inner">
                    <img src="${cardPath}" 
                         alt="${formattedName}" 
                         class="lamp-card-image"
                         onerror="this.src='./Cards/placeholder.png'">
                    <div class="lamp-card-info">
                        <h3 class="lamp-card-name">${formattedName}</h3>
                    </div>
                    <button class="lamp-card-button">
                        Select Card
                    </button>
                </div>
            </div>
        `;
    },

    // Handle card selection - Modified to add unchosen cards to graveyard
    async selectCard(heroSelection, selectedCard) {
        console.log(`🔮 Selected card from lamp: ${selectedCard}`);
        
        // Check if hand is full before adding
        if (heroSelection.getHandManager().isHandFull()) {
            this.showError('Your hand is full! Cannot add more cards.');
            return;
        }
        
        // Get the current card choices from lamp state
        const lampState = this.getLampState(heroSelection);
        const cardChoices = lampState ? lampState.cardChoices : [];
        
        // Add the selected card to hand
        const success = heroSelection.addCardToHand(selectedCard);
        
        if (success) {
            console.log(`🔮 Added ${selectedCard} to hand`);
            
            // Add the unchosen cards to graveyard
            // Remove only ONE instance of the selected card to handle duplicates correctly
            const unchosenCards = [...cardChoices]; // Create a copy
            const selectedIndex = unchosenCards.indexOf(selectedCard);
            if (selectedIndex !== -1) {
                unchosenCards.splice(selectedIndex, 1); // Remove only the first occurrence
            }
            
            if (unchosenCards.length > 0 && window.graveyardManager) {
                console.log(`🔮 Adding unchosen cards to graveyard: ${unchosenCards.join(', ')}`);
                
                unchosenCards.forEach(unchosenCard => {
                    window.graveyardManager.addCard(unchosenCard);
                    console.log(`🔮 Added ${unchosenCard} to graveyard`);
                });
                
                // Show feedback about cards going to graveyard
                this.showGraveyardFeedback(unchosenCards);
            }
            
            // Show success feedback for selected card
            this.showCardSelectedFeedback(selectedCard);
            
            // Exit Lamp Mode (successful completion)
            await this.exitLampMode(heroSelection);
        } else {
            console.error(`🔮 Failed to add ${selectedCard} to hand`);
            this.showError('Could not add card to hand. Please try again.');
        }
    },

    // Hide lamp mode UI
    hideLampModeUI() {
        const overlay = document.getElementById('lampModeOverlay');
        if (overlay) {
            overlay.remove();
        }
    },

    // Show card selected feedback
    showCardSelectedFeedback(cardName) {
        const formatted = this.formatCardName(cardName);
        
        const feedback = document.createElement('div');
        feedback.className = 'lamp-mode-feedback';
        feedback.innerHTML = `
            <div class="feedback-content">
                <span class="feedback-icon">🔮✨</span>
                <span class="feedback-text">Added ${formatted} to your hand!</span>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 2000);
    },

    // Show graveyard feedback for unchosen cards
    showGraveyardFeedback(unchosenCards) {
        if (!unchosenCards || unchosenCards.length === 0) return;
        
        const cardNames = unchosenCards.map(card => this.formatCardName(card)).join(', ');
        const cardText = unchosenCards.length === 1 ? 'card' : 'cards';
        
        const feedback = document.createElement('div');
        feedback.className = 'lamp-mode-graveyard-feedback';
        feedback.innerHTML = `
            <div class="graveyard-feedback-content">
                <span class="graveyard-feedback-icon">⚰️</span>
                <span class="graveyard-feedback-text">
                    ${cardNames} ${unchosenCards.length === 1 ? 'was' : 'were'} discarded
                </span>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 2500);
    },

    // Show error message
    showError(message) {
        const error = document.createElement('div');
        error.className = 'lamp-mode-error';
        error.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
            </div>
        `;
        
        document.body.appendChild(error);
        
        setTimeout(() => {
            if (error.parentNode) {
                error.remove();
            }
        }, 3000);
    },

    // Disable/enable "To Battle!" button
    disableToBattleButton(disable) {
        const toBattleBtn = document.querySelector('.to-battle-button');
        if (toBattleBtn) {
            toBattleBtn.disabled = disable;
            if (disable) {
                toBattleBtn.classList.add('lamp-mode-disabled');
                toBattleBtn.setAttribute('data-original-title', toBattleBtn.title || '');
                toBattleBtn.title = 'Complete Future Tech Lamp selection first';
            } else {
                toBattleBtn.classList.remove('lamp-mode-disabled');
                const originalTitle = toBattleBtn.getAttribute('data-original-title');
                if (originalTitle) {
                    toBattleBtn.title = originalTitle;
                } else {
                    toBattleBtn.removeAttribute('title');
                }
            }
        }
    },

    // === STATE MANAGEMENT ===

    setLampState(heroSelection, state) {
        if (!heroSelection._lampModeState) {
            heroSelection._lampModeState = {};
        }
        Object.assign(heroSelection._lampModeState, state);
    },

    getLampState(heroSelection) {
        return heroSelection._lampModeState || null;
    },

    clearLampState(heroSelection) {
        heroSelection._lampModeState = null;
    },

    // Check if currently in Lamp Mode
    isInLampMode(heroSelection) {
        const state = this.getLampState(heroSelection);
        return state && state.active;
    },

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },

    // === STATE PERSISTENCE FOR RECONNECTION ===

    // Export state for saving
    exportLampState(heroSelection) {
        const state = this.getLampState(heroSelection);
        if (state && state.active) {
            return {
                lampModeActive: true,
                lampModeGoldSpent: state.goldSpent || 0,
                lampModeCardChoices: state.cardChoices || [],
                lampModeNumChoices: state.numChoices || 1,
                lampModeActivatedAt: state.activatedAt || Date.now()
            };
        }
        return {
            lampModeActive: false
        };
    },

    // Restore state from saved data
    async restoreLampState(heroSelection, savedState) {
        if (savedState && savedState.lampModeActive && savedState.lampModeCardChoices) {
            console.log('🔮 Restoring Future Tech Lamp Mode from saved state');
            
            const goldSpent = savedState.lampModeGoldSpent || 0;
            const cardChoices = savedState.lampModeCardChoices;
            const numChoices = savedState.lampModeNumChoices || cardChoices.length;
            
            // Set the exclusive artifact state
            if (window.artifactHandler) {
                window.artifactHandler.setExclusiveArtifactActive('FutureTechLamp');
            }
            
            // Store the mode state
            this.setLampState(heroSelection, {
                active: true,
                goldSpent: goldSpent,
                cardChoices: cardChoices,
                numChoices: numChoices,
                activatedAt: savedState.lampModeActivatedAt || Date.now()
            });
            
            // Show lamp mode UI with restored data
            this.showLampModeUI(heroSelection, cardChoices, numChoices);
            
            // Disable "To Battle!" button
            this.disableToBattleButton(true);
            
            console.log(`🔮 Future Tech Lamp Mode restored with ${numChoices} choices`);
            return true;
        }
        return false;
    },

    // === CLEANUP AND RESET ===

    // Clean up lamp state (called during game reset)
    cleanup(heroSelection) {
        console.log('🔮 Cleaning up Future Tech Lamp state');
        
        // Clear exclusive artifact state
        if (window.artifactHandler) {
            const activeExclusive = window.artifactHandler.getActiveExclusiveArtifact();
            if (activeExclusive === 'FutureTechLamp') {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
        }
        
        // Clear local state
        this.clearLampState(heroSelection);
        
        // Clean up UI
        this.hideLampModeUI();
        this.disableToBattleButton(false);
    },

    // Emergency exit (for error recovery)
    async emergencyExit(heroSelection) {
        console.log('🔮 Emergency exit from Future Tech Lamp Mode');
        
        try {
            // Force exit without save to avoid potential issues
            if (window.artifactHandler) {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
            
            this.clearLampState(heroSelection);
            this.hideLampModeUI();
            this.disableToBattleButton(false);
            
            // Try to update UI
            if (heroSelection.updateHandDisplay) {
                heroSelection.updateHandDisplay();
            }
            
            console.log('🔮 Emergency exit completed');
        } catch (error) {
            console.error('🔮 Error during emergency exit:', error);
        }
    },

    // Ensure lamp styles are loaded
    ensureLampStyles() {
        if (document.getElementById('lampModeStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'lampModeStyles';
        style.textContent = `
            /* Future Tech Lamp Mode Overlay */
            .lamp-mode-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: lampModeSlideIn 0.5s ease-out;
                padding: 20px; /* Add padding to prevent touching screen edges */
            }
            
            .lamp-mode-container {
                background: linear-gradient(135deg, #4a90e2 0%, #7b68ee 100%);
                border: 3px solid #00ffff;
                border-radius: 20px;
                padding: 30px;
                max-width: 900px;
                width: 90%;
                max-height: 90vh; /* Constrain height to 90% of viewport */
                box-shadow: 
                    0 20px 60px rgba(0, 255, 255, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
                text-align: center;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .lamp-mode-container::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, #00ffff, #ff00ff, #ffff00, #00ffff);
                background-size: 400% 400%;
                border-radius: 22px;
                z-index: -1;
                animation: lampModeGlow 3s ease-in-out infinite;
            }
            
            .lamp-mode-header {
                margin-bottom: 20px;
                flex-shrink: 0; /* Prevent header from shrinking */
            }
            
            .lamp-icon {
                font-size: 60px;
                margin-bottom: 15px;
                animation: lampIconFloat 2s ease-in-out infinite;
                text-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
            }
            
            .lamp-mode-header h2 {
                font-size: 2.5rem;
                margin: 0 0 10px 0;
                color: #fff;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
                font-weight: 800;
                letter-spacing: 2px;
            }
            
            .lamp-mode-header p {
                font-size: 1.2rem;
                color: rgba(255, 255, 255, 0.9);
                margin: 0;
                font-weight: 500;
            }
            
            .lamp-power-text {
                font-size: 1rem !important;
                color: rgba(0, 255, 255, 0.9) !important;
                margin: 8px 0 0 0 !important;
                font-weight: 600 !important;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
                letter-spacing: 1px;
            }
            
            /* SCROLLABLE CARD CHOICES CONTAINER */
            .lamp-card-choices {
                display: flex;
                gap: 25px;
                justify-content: flex-start; /* Changed from center to flex-start for better scrolling */
                flex-wrap: wrap;
                overflow-y: auto;
                overflow-x: hidden;
                flex: 1; /* Take remaining space after header */
                padding: 10px 5px; /* Add padding for better scrollbar appearance */
                margin: -10px -5px; /* Compensate for padding */
                
                /* Custom scrollbar styling */
                scrollbar-width: thin;
                scrollbar-color: rgba(0, 255, 255, 0.6) rgba(255, 255, 255, 0.1);
            }
            
            /* Webkit scrollbar styling for better appearance */
            .lamp-card-choices::-webkit-scrollbar {
                width: 8px;
            }
            
            .lamp-card-choices::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
            }
            
            .lamp-card-choices::-webkit-scrollbar-thumb {
                background: rgba(0, 255, 255, 0.6);
                border-radius: 4px;
                transition: background 0.3s ease;
            }
            
            .lamp-card-choices::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 255, 255, 0.8);
            }
            
            /* Add scroll indicator when content overflows */
            .lamp-card-choices::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 3px;
                background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.8), transparent);
                border-radius: 2px;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            /* Show scroll indicator when scrollable */
            .lamp-card-choices[data-scrollable="true"]::after {
                opacity: 1;
            }
            
            .lamp-card-choice {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(0, 255, 255, 0.5);
                border-radius: 15px;
                padding: 20px;
                transition: all 0.3s ease;
                cursor: pointer;
                flex: 0 0 220px; /* Fixed width instead of flex: 1 */
                max-width: 220px;
                min-width: 180px;
                position: relative;
                overflow: hidden;
            }
            
            .lamp-card-choice::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.6s ease;
            }
            
            .lamp-card-choice:hover {
                transform: translateY(-10px) scale(1.05);
                border-color: rgba(0, 255, 255, 0.8);
                box-shadow: 
                    0 15px 40px rgba(0, 255, 255, 0.4),
                    0 0 30px rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.15);
            }
            
            .lamp-card-choice:hover::before {
                left: 100%;
            }
            
            .lamp-card-choice:active {
                transform: translateY(-8px) scale(1.02);
            }
            
            .lamp-card-inner {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                position: relative;
                z-index: 1;
            }
            
            .lamp-card-image {
                width: 140px;
                height: 196px;
                object-fit: cover;
                border-radius: 12px;
                box-shadow: 
                    0 8px 25px rgba(0, 0, 0, 0.4),
                    0 0 15px rgba(0, 255, 255, 0.3);
                transition: all 0.3s ease;
                border: 2px solid rgba(0, 255, 255, 0.3);
            }
            
            .lamp-card-choice:hover .lamp-card-image {
                box-shadow: 
                    0 12px 35px rgba(0, 0, 0, 0.6),
                    0 0 25px rgba(0, 255, 255, 0.6);
                border-color: rgba(0, 255, 255, 0.8);
                transform: scale(1.05);
            }
            
            .lamp-card-info {
                text-align: center;
            }
            
            .lamp-card-name {
                font-size: 1.1rem;
                margin: 0;
                color: #fff;
                font-weight: 600;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
            }
            
            .lamp-card-button {
                background: linear-gradient(45deg, #00ffff, #4a90e2);
                color: #000;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3);
            }
            
            .lamp-card-button:hover {
                background: linear-gradient(45deg, #00ffff, #7b68ee);
                transform: scale(1.05);
                box-shadow: 0 6px 20px rgba(0, 255, 255, 0.5);
            }
            
            .lamp-card-button:active {
                transform: scale(0.98);
            }
            
            /* Success Feedback */
            .lamp-mode-feedback {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 20px 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10001;
                animation: lampModeFeedback 2s ease-out forwards;
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            /* Graveyard Feedback */
            .lamp-mode-graveyard-feedback {
                position: fixed;
                top: 60%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
                color: white;
                padding: 15px 25px;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
                z-index: 10000;
                animation: lampModeGraveyardFeedback 2.5s ease-out forwards;
                border: 2px solid rgba(255, 255, 255, 0.2);
            }
            
            .feedback-content,
            .graveyard-feedback-content {
                display: flex;
                align-items: center;
                gap: 15px;
                font-size: 18px;
                font-weight: bold;
            }
            
            .graveyard-feedback-content {
                font-size: 16px;
            }
            
            .feedback-icon {
                font-size: 28px;
                animation: lampModeSparkle 1s ease-out;
            }
            
            .graveyard-feedback-icon {
                font-size: 24px;
            }
            
            /* Error Message */
            .lamp-mode-error {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
                padding: 20px 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10001;
                animation: lampModeError 3s ease-out forwards;
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            .error-content {
                display: flex;
                align-items: center;
                gap: 15px;
                font-size: 16px;
                font-weight: bold;
            }
            
            .error-icon {
                font-size: 24px;
            }
            
            /* Disabled To Battle Button */
            .to-battle-button.lamp-mode-disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                filter: grayscale(50%) !important;
            }
            
            /* Animations */
            @keyframes lampModeSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes lampModeGlow {
                0%, 100% { 
                    background-position: 0% 50%; 
                }
                50% { 
                    background-position: 100% 50%; 
                }
            }
            
            @keyframes lampIconFloat {
                0%, 100% { 
                    transform: translateY(0px) scale(1); 
                }
                50% { 
                    transform: translateY(-10px) scale(1.1); 
                }
            }
            
            @keyframes lampModeFeedback {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1);
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.9);
                }
            }
            
            @keyframes lampModeSparkle {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(-10deg) scale(1.2); }
                75% { transform: rotate(10deg) scale(1.2); }
            }
            
            @keyframes lampModeGraveyardFeedback {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                15% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.02);
                }
                85% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.9);
                }
            }
            
            @keyframes lampModeError {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                10% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.05);
                }
                90% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.9);
                }
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .lamp-mode-overlay {
                    padding: 10px;
                }
                
                .lamp-mode-container {
                    padding: 20px;
                    width: 95%;
                    max-height: 95vh;
                }
                
                .lamp-card-choices {
                    gap: 15px;
                    justify-content: center; /* Center on mobile */
                }
                
                .lamp-card-choice {
                    flex: 0 0 150px;
                    max-width: 150px;
                    min-width: 130px;
                    padding: 15px;
                }
                
                .lamp-card-image {
                    width: 100px;
                    height: 140px;
                }
                
                .lamp-icon {
                    font-size: 48px;
                }
                
                .lamp-mode-header h2 {
                    font-size: 2rem;
                }
                
                .lamp-mode-header p {
                    font-size: 1rem;
                }
            }
            
            @media (max-width: 480px) {
                .lamp-mode-container {
                    max-height: 98vh;
                    padding: 15px;
                }
                
                .lamp-mode-header {
                    margin-bottom: 15px;
                }
                
                .lamp-card-choices {
                    gap: 10px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
};

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.futureTechLampArtifact = futureTechLampArtifact;
}