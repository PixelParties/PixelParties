// magneticGlove.js - Enhanced Magnetic Glove Artifact with Exclusive Artifact System Integration
// "Choose any card from your deck and add a copy of it to your hand."

export const magneticGloveArtifact = {
    // Main handler for when MagneticGlove is clicked/used
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log('🧲 MagneticGlove activated');
        
        // Check if player can afford the artifact
        const cardInfo = heroSelection.getCardInfo(cardName);
        const cost = cardInfo?.cost || 0;
        const playerGold = heroSelection.getGoldManager().getPlayerGold();
        
        if (playerGold < cost) {
            this.showError(`You need ${cost} Gold to use MagneticGlove!`);
            return;
        }
        
        // Consume the card from hand
        const removedCard = heroSelection.removeCardFromHandByIndex(cardIndex);
        if (!removedCard) {
            console.error('Failed to remove MagneticGlove from hand');
            return;
        }
        
        // Charge the gold
        if (cost > 0) {
            heroSelection.getGoldManager().addPlayerGold(-cost, 'magnetic_glove_use');
        }
        
        // Enter Magnetic Glove Mode and register as exclusive
        await this.enterMagneticGloveMode(heroSelection, cost);
    },

    // Enter Magnetic Glove Mode with exclusive artifact registration
    async enterMagneticGloveMode(heroSelection, goldSpent = 0) {
        console.log('🧲 Entering Magnetic Glove Mode');
        
        // IMPORTANT: Register as exclusive artifact FIRST
        if (window.artifactHandler) {
            window.artifactHandler.setExclusiveArtifactActive('MagneticGlove');
        }
        
        // Store the mode state
        this.setMagneticGloveState(heroSelection, {
            active: true,
            goldSpent: goldSpent,
            activatedAt: Date.now()
        });
        
        // Show notification
        this.showMagneticGloveNotification(heroSelection);
        
        // Highlight deck cards
        this.highlightDeckCards(true);
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        // Add click handlers to deck cards
        this.addDeckCardClickHandlers(heroSelection);
        
        // Save game state to persist the mode
        await heroSelection.saveGameState();
        
        console.log('🧲 Magnetic Glove Mode activated successfully');
    },

    // Exit Magnetic Glove Mode with exclusive artifact cleanup
    async exitMagneticGloveMode(heroSelection, cancelled = false) {
        console.log('🧲 Exiting Magnetic Glove Mode');
        
        // Get current state
        const state = this.getMagneticGloveState(heroSelection);
        
        // If cancelled, refund gold and return card to hand
        if (cancelled && state) {
            if (state.goldSpent > 0) {
                heroSelection.getGoldManager().addPlayerGold(state.goldSpent, 'magnetic_glove_refund');
                console.log(`🧲 Refunded ${state.goldSpent} gold`);
            }
            
            // Add MagneticGlove back to hand
            const success = heroSelection.addCardToHand('MagneticGlove');
            if (success) {
                console.log('🧲 MagneticGlove returned to hand');
            }
        }
        
        // Clear exclusive artifact state FIRST
        if (window.artifactHandler) {
            window.artifactHandler.clearExclusiveArtifactActive();
        }
        
        // Clear the mode state
        this.clearMagneticGloveState(heroSelection);
        
        // Hide notification
        this.hideMagneticGloveNotification();
        
        // Remove deck highlighting
        this.highlightDeckCards(false);
        
        // Re-enable "To Battle!" button
        this.disableToBattleButton(false);
        
        // Remove click handlers from deck cards
        this.removeDeckCardClickHandlers();
        
        // Update displays - This will refresh the hand and show unblocked exclusive artifacts
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log('🧲 Magnetic Glove Mode deactivated');
    },

    // Show notification UI with enhanced styling
    showMagneticGloveNotification(heroSelection) {
        // Remove any existing notification
        this.hideMagneticGloveNotification();
        
        const notification = document.createElement('div');
        notification.id = 'magneticGloveNotification';
        notification.className = 'magnetic-glove-notification';
        notification.innerHTML = `
            <div class="magnetic-glove-content">
                <span class="magnetic-glove-icon">🧲</span>
                <span class="magnetic-glove-text">Choose a card from your deck to add to your hand.</span>
                <button class="magnetic-glove-cancel-btn" onclick="window.cancelMagneticGlove()">Cancel</button>
            </div>
        `;
        
        // Add to top of game screen
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.appendChild(notification);
        }
        
        // Set up global cancel function
        window.cancelMagneticGlove = async () => {
            await this.exitMagneticGloveMode(heroSelection, true);
        };
        
        // Add keyboard event listener for Escape key
        this.keyboardHandler = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                window.cancelMagneticGlove();
            }
        };
        document.addEventListener('keydown', this.keyboardHandler);
    },

    // Hide notification UI
    hideMagneticGloveNotification() {
        const notification = document.getElementById('magneticGloveNotification');
        if (notification) {
            notification.remove();
        }
        
        // Clean up global function
        if (window.cancelMagneticGlove) {
            delete window.cancelMagneticGlove;
        }
        
        // Clean up keyboard event listener
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    },

    // Highlight deck cards
    highlightDeckCards(highlight) {
        const deckContainer = document.querySelector('.team-building-right');
        const deckCards = document.querySelectorAll('.card-slot');
        
        if (highlight) {
            if (deckContainer) {
                deckContainer.classList.add('magnetic-glove-deck-highlight');
            }
            deckCards.forEach(card => {
                if (!card.classList.contains('empty-slot')) {
                    card.classList.add('magnetic-glove-card-highlight');
                }
            });
        } else {
            if (deckContainer) {
                deckContainer.classList.remove('magnetic-glove-deck-highlight');
            }
            deckCards.forEach(card => {
                card.classList.remove('magnetic-glove-card-highlight');
            });
        }
    },

    // Add click handlers to deck cards
    addDeckCardClickHandlers(heroSelection) {
        const deckCards = document.querySelectorAll('.card-slot:not(.empty-slot)');
        
        deckCards.forEach(cardSlot => {
            const cardImage = cardSlot.querySelector('img');
            if (cardImage) {
                // Extract card name from image src
                const cardName = this.extractCardNameFromPath(cardImage.src);
                if (cardName) {
                    const clickHandler = async (event) => {
                        event.stopPropagation();
                        await this.selectDeckCard(heroSelection, cardName);
                    };
                    
                    cardSlot.addEventListener('click', clickHandler);
                    cardSlot.setAttribute('data-magnetic-glove-handler', 'true');
                    cardSlot.style.cursor = 'pointer';
                }
            }
        });
    },

    // Remove click handlers from deck cards
    removeDeckCardClickHandlers() {
        const deckCards = document.querySelectorAll('[data-magnetic-glove-handler="true"]');
        deckCards.forEach(cardSlot => {
            // Create a new element to remove all event listeners
            const newElement = cardSlot.cloneNode(true);
            cardSlot.parentNode.replaceChild(newElement, cardSlot);
            
            // Clean up attributes
            newElement.removeAttribute('data-magnetic-glove-handler');
            newElement.style.cursor = '';
        });
    },

    // Handle selecting a card from the deck
    async selectDeckCard(heroSelection, cardName) {
        console.log(`Selected card from deck: ${cardName}`);
        
        // Check if hand is full before adding
        if (heroSelection.getHandManager().isHandFull()) {
            this.showError('Your hand is full! Cannot add more cards.');
            return;
        }
        
        // Add the selected card to hand
        const success = heroSelection.addCardToHand(cardName);
        
        if (success) {
            console.log(`Added ${cardName} to hand`);
            
            // ADD TO GRAVEYARD NOW - only on successful completion
            if (heroSelection && heroSelection.graveyardManager) {
                heroSelection.graveyardManager.addCard('MagneticGlove');
                console.log('Added MagneticGlove to graveyard');
            }
            
            // Show success feedback
            this.showCardSelectedFeedback(cardName);
            
            // Exit Magnetic Glove Mode (successful completion)
            await this.exitMagneticGloveMode(heroSelection, false);
        } else {
            console.error(`Failed to add ${cardName} to hand`);
            this.showError('Could not add card to hand. Please try again.');
        }
    },

    // Extract card name from image path
    extractCardNameFromPath(imagePath) {
        if (!imagePath) return null;
        
        // Extract filename from path like "./Cards/All/CardName.png"
        const matches = imagePath.match(/\/([^\/]+)\.png$/);
        if (matches && matches[1]) {
            return matches[1];
        }
        
        return null;
    },

    // Show card selected feedback
    showCardSelectedFeedback(cardName) {
        const formatted = this.formatCardName(cardName);
        
        const feedback = document.createElement('div');
        feedback.className = 'magnetic-glove-feedback';
        feedback.innerHTML = `
            <div class="feedback-content">
                <span class="feedback-icon">🧲✨</span>
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

    // Show error message
    showError(message) {
        const error = document.createElement('div');
        error.className = 'magnetic-glove-error';
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
                toBattleBtn.classList.add('magnetic-glove-disabled');
                toBattleBtn.setAttribute('data-original-title', toBattleBtn.title || '');
                toBattleBtn.title = 'Complete Magnetic Glove selection first';
            } else {
                toBattleBtn.classList.remove('magnetic-glove-disabled');
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

    setMagneticGloveState(heroSelection, state) {
        if (!heroSelection._magneticGloveState) {
            heroSelection._magneticGloveState = {};
        }
        Object.assign(heroSelection._magneticGloveState, state);
    },

    getMagneticGloveState(heroSelection) {
        return heroSelection._magneticGloveState || null;
    },

    clearMagneticGloveState(heroSelection) {
        heroSelection._magneticGloveState = null;
    },

    // Check if currently in Magnetic Glove Mode
    isInMagneticGloveMode(heroSelection) {
        const state = this.getMagneticGloveState(heroSelection);
        return state && state.active;
    },

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },

    // === ENHANCED STATE PERSISTENCE WITH EXCLUSIVE INTEGRATION ===

    // Export state for saving - integrates with exclusive artifact system
    exportMagneticGloveState(heroSelection) {
        const state = this.getMagneticGloveState(heroSelection);
        if (state && state.active) {
            return {
                magneticGloveActive: true,
                magneticGloveGoldSpent: state.goldSpent || 0,
                magneticGloveActivatedAt: state.activatedAt || Date.now()
            };
        }
        return {
            magneticGloveActive: false
        };
    },

    // Restore state from saved data - integrates with exclusive artifact system
    async restoreMagneticGloveState(heroSelection, savedState) {
        if (savedState && savedState.magneticGloveActive) {
            console.log('🧲 Restoring Magnetic Glove Mode from saved state');
            
            const goldSpent = savedState.magneticGloveGoldSpent || 0;
            
            // Re-enter Magnetic Glove Mode without consuming card or gold
            await this.enterMagneticGloveModeFromRestore(heroSelection, goldSpent);
            
            return true;
        }
        return false;
    },

    // Special version for restoration that doesn't consume resources
    async enterMagneticGloveModeFromRestore(heroSelection, goldSpent) {
        console.log('🧲 Entering Magnetic Glove Mode from restore');
        
        // IMPORTANT: Register as exclusive artifact FIRST (for restoration)
        if (window.artifactHandler) {
            window.artifactHandler.setExclusiveArtifactActive('MagneticGlove');
        }
        
        // Store the mode state
        this.setMagneticGloveState(heroSelection, {
            active: true,
            goldSpent: goldSpent,
            activatedAt: Date.now(),
            restored: true
        });
        
        // Show notification
        this.showMagneticGloveNotification(heroSelection);
        
        // Highlight deck cards
        this.highlightDeckCards(true);
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        // Add click handlers to deck cards
        this.addDeckCardClickHandlers(heroSelection);
        
        console.log('🧲 Magnetic Glove Mode restored successfully with exclusive registration');
    },

    // === CLEANUP AND RESET ===

    // Clean up magnetic glove state (called during game reset)
    cleanup(heroSelection) {
        console.log('🧲 Cleaning up Magnetic Glove state');
        
        // Clear exclusive artifact state
        if (window.artifactHandler) {
            const activeExclusive = window.artifactHandler.getActiveExclusiveArtifact();
            if (activeExclusive === 'MagneticGlove') {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
        }
        
        // Clear local state
        this.clearMagneticGloveState(heroSelection);
        
        // Clean up UI
        this.hideMagneticGloveNotification();
        this.highlightDeckCards(false);
        this.disableToBattleButton(false);
        this.removeDeckCardClickHandlers();
        
        // Clean up global functions
        if (window.cancelMagneticGlove) {
            delete window.cancelMagneticGlove;
        }
        
        // Clean up keyboard handler
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    },

    // Emergency exit (for error recovery)
    async emergencyExit(heroSelection) {
        console.log('🧲 Emergency exit from Magnetic Glove Mode');
        
        try {
            // Force exit without save to avoid potential issues
            if (window.artifactHandler) {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
            
            this.clearMagneticGloveState(heroSelection);
            this.hideMagneticGloveNotification();
            this.highlightDeckCards(false);
            this.disableToBattleButton(false);
            this.removeDeckCardClickHandlers();
            
            // Clean up global functions and keyboard handler
            if (window.cancelMagneticGlove) {
                delete window.cancelMagneticGlove;
            }
            if (this.keyboardHandler) {
                document.removeEventListener('keydown', this.keyboardHandler);
                this.keyboardHandler = null;
            }
            
            // Try to update UI
            if (heroSelection.updateHandDisplay) {
                heroSelection.updateHandDisplay();
            }
            
            console.log('🧲 Emergency exit completed');
        } catch (error) {
            console.error('🧲 Error during emergency exit:', error);
        }
    }
};

// Enhanced CSS styles for Magnetic Glove with exclusive artifact integration
if (typeof document !== 'undefined' && !document.getElementById('magneticGloveStyles')) {
    const style = document.createElement('style');
    style.id = 'magneticGloveStyles';
    style.textContent = `
        /* Magnetic Glove Notification */
        .magnetic-glove-notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-weight: bold;
            animation: magneticGloveSlideIn 0.5s ease-out;
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .magnetic-glove-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .magnetic-glove-icon {
            font-size: 24px;
            animation: magneticGlovePulse 2s ease-in-out infinite;
        }
        
        .magnetic-glove-text {
            font-size: 16px;
            flex: 1;
        }
        
        .magnetic-glove-cancel-btn {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        
        .magnetic-glove-cancel-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
            transform: scale(1.05);
        }
        
        /* Deck Highlighting */
        .magnetic-glove-deck-highlight {
            border: 3px solid #667eea !important;
            border-radius: 12px !important;
            box-shadow: 0 0 25px rgba(102, 126, 234, 0.5) !important;
            animation: magneticGlowPulse 2s ease-in-out infinite;
        }
        
        .magnetic-glove-card-highlight {
            border: 2px solid #764ba2 !important;
            border-radius: 8px !important;
            box-shadow: 0 0 15px rgba(118, 75, 162, 0.6) !important;
            transform: scale(1.02) !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
        }
        
        .magnetic-glove-card-highlight:hover {
            transform: scale(1.08) !important;
            box-shadow: 0 0 25px rgba(118, 75, 162, 0.8) !important;
            border-color: #667eea !important;
        }
        
        /* Disabled To Battle Button */
        .to-battle-button.magnetic-glove-disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            filter: grayscale(50%) !important;
        }
        
        /* Success Feedback */
        .magnetic-glove-feedback {
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
            animation: magneticGloveFeedback 2s ease-out forwards;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .feedback-content {
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 18px;
            font-weight: bold;
        }
        
        .feedback-icon {
            font-size: 28px;
            animation: magneticGloveSparkle 1s ease-out;
        }
        
        /* Error Message */
        .magnetic-glove-error {
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
            animation: magneticGloveError 3s ease-out forwards;
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
        
        /* Animations */
        @keyframes magneticGloveSlideIn {
            from {
                opacity: 0;
                transform: translate(-50%, -100%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
        
        @keyframes magneticGlovePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        @keyframes magneticGlowPulse {
            0%, 100% { 
                box-shadow: 0 0 25px rgba(102, 126, 234, 0.5);
            }
            50% { 
                box-shadow: 0 0 35px rgba(102, 126, 234, 0.8);
            }
        }
        
        @keyframes magneticGloveFeedback {
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
        
        @keyframes magneticGloveSparkle {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-10deg) scale(1.2); }
            75% { transform: rotate(10deg) scale(1.2); }
        }
        
        @keyframes magneticGloveError {
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
        
        /* Integration with other exclusive artifacts */
        .magnetic-glove-notification + .exclusive-restriction-error {
            top: 80px; /* Push other exclusive errors below our notification */
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.magneticGloveArtifact = magneticGloveArtifact;
}