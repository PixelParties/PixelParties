// magicTopaz.js - Magic Topaz Artifact with Exclusive Artifact System Integration
// "Choose any card from your deck and permanently remove it."

export const magicTopazArtifact = {
    // Main handler for when MagicTopaz is clicked/used
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log('💎 MagicTopaz activated');
        
        // Check if player can afford the artifact
        const cardInfo = heroSelection.getCardInfo(cardName);
        const cost = cardInfo?.cost || 0;
        const playerGold = heroSelection.getGoldManager().getPlayerGold();
        
        if (playerGold < cost) {
            this.showError(`You need ${cost} Gold to use MagicTopaz!`);
            return;
        }
        
        // Enter Topaz Mode WITHOUT consuming anything yet
        // Store the card index and cost for later consumption
        await this.enterTopazMode(heroSelection, cardIndex, cost);
    },

    // Enter Topaz Mode with exclusive artifact registration
    async enterTopazMode(heroSelection, cardIndex, cost) {
        console.log('💎 Entering Topaz Mode');
        
        // IMPORTANT: Register as exclusive artifact FIRST
        if (window.artifactHandler) {
            window.artifactHandler.setExclusiveArtifactActive('MagicTopaz');
        }
        
        // Store the mode state - save the card index and cost for later consumption
        this.setTopazState(heroSelection, {
            active: true,
            cardIndex: cardIndex,
            cost: cost,
            activatedAt: Date.now()
        });
        
        // Show notification
        this.showTopazNotification(heroSelection);
        
        // Highlight deck cards
        this.highlightDeckCards(true);
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        // Add click handlers to deck cards - this will now force refresh all handlers
        this.addDeckCardClickHandlers(heroSelection);
        
        // Save game state to persist the mode
        await heroSelection.saveGameState();
        
        console.log('💎 Topaz Mode activated successfully');
    },

    // Exit Topaz Mode with exclusive artifact cleanup
    async exitTopazMode(heroSelection, cancelled = false) {
        console.log('💎 Exiting Topaz Mode');
        
        // Get current state
        const state = this.getTopazState(heroSelection);
        
        // If cancelled, we need to do nothing since nothing was consumed yet
        if (cancelled && state) {
            console.log('💎 Topaz Mode cancelled - no resources were consumed');
        }
        
        // IMPORTANT: Clear exclusive artifact state FIRST
        if (window.artifactHandler) {
            window.artifactHandler.clearExclusiveArtifactActive();
        }
        
        // Clear the mode state
        this.clearTopazState(heroSelection);
        
        // Hide notification
        this.hideTopazNotification();
        
        // Remove deck highlighting
        this.highlightDeckCards(false);
        
        // Re-enable "To Battle!" button
        this.disableToBattleButton(false);
        
        // Remove click handlers from deck cards
        this.removeDeckCardClickHandlers();
        
        // Update displays - This will refresh the hand and show unblocked exclusive artifacts
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        heroSelection.updateDeckDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log('💎 Topaz Mode deactivated');
    },

    // Show notification UI with enhanced styling
    showTopazNotification(heroSelection) {
        // Remove any existing notification
        this.hideTopazNotification();
        
        const notification = document.createElement('div');
        notification.id = 'topazNotification';
        notification.className = 'topaz-notification';
        notification.innerHTML = `
            <div class="topaz-content">
                <span class="topaz-icon">💎</span>
                <span class="topaz-text">Select a card in your deck to permanently remove.</span>
                <button class="topaz-cancel-btn" onclick="window.cancelTopaz()">Cancel</button>
            </div>
        `;
        
        // Add to top of game screen
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.appendChild(notification);
        }
        
        // Set up global cancel function
        window.cancelTopaz = async () => {
            await this.exitTopazMode(heroSelection, true);
        };
    },

    // Hide notification UI
    hideTopazNotification() {
        const notification = document.getElementById('topazNotification');
        if (notification) {
            notification.remove();
        }
        
        // Clean up global function
        if (window.cancelTopaz) {
            delete window.cancelTopaz;
        }
    },

    // Highlight deck cards
    highlightDeckCards(highlight) {
        const deckContainer = document.querySelector('.team-building-right');
        const deckCards = document.querySelectorAll('.card-slot');
        
        if (highlight) {
            if (deckContainer) {
                deckContainer.classList.add('topaz-deck-highlight');
            }
            deckCards.forEach(card => {
                if (!card.classList.contains('empty-slot')) {
                    card.classList.add('topaz-card-highlight');
                }
            });
        } else {
            if (deckContainer) {
                deckContainer.classList.remove('topaz-deck-highlight');
            }
            deckCards.forEach(card => {
                card.classList.remove('topaz-card-highlight');
            });
        }
    },

    // ENHANCED: Add click handlers to deck cards with cleanup first
    addDeckCardClickHandlers(heroSelection) {
        // FIRST: Clean up any existing Topaz handlers to prevent duplicates
        this.removeDeckCardClickHandlers();
        
        // THEN: Add fresh handlers to all current deck cards
        const deckCards = document.querySelectorAll('.card-slot:not(.empty-slot)');
        
        console.log(`💎 MagicTopaz: Adding click handlers to ${deckCards.length} deck cards`);
        
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
                    cardSlot.setAttribute('data-topaz-handler', 'true');
                    cardSlot.style.cursor = 'pointer';
                    
                    // Add visual feedback that this card is clickable for Topaz
                    cardSlot.classList.add('topaz-clickable');
                } else {
                    console.warn('💎 MagicTopaz: Could not extract card name from image path:', cardImage.src);
                }
            } else {
                console.warn('💎 MagicTopaz: Card slot found without image element');
            }
        });
        
        console.log(`💎 MagicTopaz: Successfully added handlers to deck cards`);
    },

    // ENHANCED: Remove click handlers from deck cards with better cleanup
    removeDeckCardClickHandlers() {
        const deckCards = document.querySelectorAll('[data-topaz-handler="true"]');
        console.log(`💎 MagicTopaz: Removing click handlers from ${deckCards.length} deck cards`);
        
        deckCards.forEach(cardSlot => {
            // Create a new element to remove all event listeners
            const newElement = cardSlot.cloneNode(true);
            cardSlot.parentNode.replaceChild(newElement, cardSlot);
            
            // Clean up attributes and styling
            newElement.removeAttribute('data-topaz-handler');
            newElement.style.cursor = '';
            newElement.classList.remove('topaz-clickable');
        });
    },

    // NEW: Force refresh deck card handlers (call this if you suspect handlers are missing)
    refreshDeckCardHandlers(heroSelection) {
        console.log('💎 MagicTopaz: Force refreshing deck card handlers');
        
        // Only refresh if we're actually in Topaz mode
        if (this.isInTopazMode(heroSelection)) {
            this.addDeckCardClickHandlers(heroSelection);
        }
    },

    // NEW: Validate that all deck cards have proper handlers
    validateDeckCardHandlers() {
        const deckCards = document.querySelectorAll('.card-slot:not(.empty-slot)');
        const handledCards = document.querySelectorAll('[data-topaz-handler="true"]');
        
        const validation = {
            totalDeckCards: deckCards.length,
            handledCards: handledCards.length,
            isValid: deckCards.length === handledCards.length,
            missingHandlers: deckCards.length - handledCards.length
        };
        
        if (!validation.isValid) {
            console.warn(`💎 MagicTopaz: Handler validation failed - ${validation.missingHandlers} cards missing handlers`);
        }
        
        return validation;
    },

    // Handle selecting a card from the deck for removal
    async selectDeckCard(heroSelection, cardName) {
        console.log(`💎 Selected card from deck for removal: ${cardName}`);
        
        // Get the stored state to access card index and cost
        const state = this.getTopazState(heroSelection);
        if (!state) {
            this.showError('Topaz state not found!');
            return;
        }
        
        // Check if the card exists in the deck
        const deckManager = heroSelection.getDeckManager();
        const cardCount = deckManager.getCardCount(cardName);
        
        if (cardCount === 0) {
            this.showError('Card not found in deck!');
            return;
        }
        
        // NOW handle the card consumption (similar to MagicCobalt)
        const handManager = heroSelection.getHandManager();
        const currentHand = handManager.getHand();
        let discardedCardName = 'MagicTopaz';
        
        if (currentHand.length > 1) {
            // Find other cards (not MagicTopaz at the stored index)
            const otherCardIndices = [];
            currentHand.forEach((handCardName, index) => {
                if (index !== state.cardIndex) {
                    otherCardIndices.push(index);
                }
            });
            
            if (otherCardIndices.length > 0) {
                // Randomly select one of the other cards to discard
                const randomIndex = Math.floor(Math.random() * otherCardIndices.length);
                const indexToRemove = otherCardIndices[randomIndex];
                discardedCardName = handManager.removeCardFromHandByIndex(indexToRemove);
                
                console.log(`💎 MagicTopaz: Kept MagicTopaz in hand, discarded ${discardedCardName} instead`);
            } else {
                // Fallback: remove MagicTopaz
                discardedCardName = handManager.removeCardFromHandByIndex(state.cardIndex);
            }
        } else {
            // Only MagicTopaz in hand, remove it
            discardedCardName = handManager.removeCardFromHandByIndex(state.cardIndex);
            console.log(`💎 MagicTopaz: Only card in hand, removed MagicTopaz itself`);
        }

        if (discardedCardName && heroSelection && heroSelection.graveyardManager) {
            heroSelection.graveyardManager.addCard(discardedCardName);
            console.log(`Magic Topaz: Added ${discardedCardName} to graveyard`);
        }
        
        // Charge the gold
        if (state.cost > 0) {
            heroSelection.getGoldManager().addPlayerGold(-state.cost, 'magic_topaz_use');
        }
        
        // Remove one copy of the selected card from deck
        const success = deckManager.removeCard(cardName);
        
        if (success) {
            console.log(`💎 Removed ${cardName} from deck`);
            
            // Show success feedback
            this.showCardRemovedFeedback(cardName, discardedCardName);
            
            // Update displays immediately
            heroSelection.updateDeckDisplay();
            heroSelection.updateHandDisplay();
            heroSelection.updateGoldDisplay();
            
            // Exit Topaz Mode (not cancelled, so no restoration needed)
            await this.exitTopazMode(heroSelection, false);
        } else {
            console.error(`💎 Failed to remove ${cardName} from deck`);
            this.showError('Could not remove card from deck. Please try again.');
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

    // Show card removed feedback
    showCardRemovedFeedback(cardName, discardedCard) {
        const formattedCard = this.formatCardName(cardName);
        const formattedDiscarded = this.formatCardName(discardedCard);
        
        let message = `Permanently removed ${formattedCard} from your deck!`;
        if (discardedCard !== 'MagicTopaz') {
            message += ` (Consumed ${formattedDiscarded})`;
        }
        
        const feedback = document.createElement('div');
        feedback.className = 'topaz-feedback';
        feedback.innerHTML = `
            <div class="feedback-content">
                <span class="feedback-icon">💎🗑️</span>
                <span class="feedback-text">${message}</span>
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
        error.className = 'topaz-error';
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
                toBattleBtn.classList.add('topaz-disabled');
                toBattleBtn.setAttribute('data-original-title', toBattleBtn.title || '');
                toBattleBtn.title = 'Complete Topaz selection first';
            } else {
                toBattleBtn.classList.remove('topaz-disabled');
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

    setTopazState(heroSelection, state) {
        if (!heroSelection._topazState) {
            heroSelection._topazState = {};
        }
        Object.assign(heroSelection._topazState, state);
    },

    getTopazState(heroSelection) {
        return heroSelection._topazState || null;
    },

    clearTopazState(heroSelection) {
        heroSelection._topazState = null;
    },

    // Check if currently in Topaz Mode
    isInTopazMode(heroSelection) {
        const state = this.getTopazState(heroSelection);
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
    exportTopazState(heroSelection) {
        const state = this.getTopazState(heroSelection);
        if (state && state.active) {
            return {
                topazActive: true,
                topazCardIndex: state.cardIndex || 0,
                topazCost: state.cost || 0,
                topazActivatedAt: state.activatedAt || Date.now()
            };
        }
        return {
            topazActive: false
        };
    },

    // Restore state from saved data - integrates with exclusive artifact system
    async restoreTopazState(heroSelection, savedState) {
        if (savedState && savedState.topazActive) {
            console.log('MagicTopaz: Restoring Topaz Mode from saved state');
            
            const cardIndex = savedState.topazCardIndex || 0;
            const cost = savedState.topazCost || 0;
            
            // Re-enter Topaz Mode without consuming card or gold
            await this.enterTopazModeFromRestore(heroSelection, cardIndex, cost);
            
            return true;
        }
        return false;
    },

    // Special version for restoration that doesn't consume resources
    async enterTopazModeFromRestore(heroSelection, cardIndex, cost) {
        console.log('MagicTopaz: Entering Topaz Mode from restore');
        
        // IMPORTANT: Register as exclusive artifact FIRST (for restoration)
        if (window.artifactHandler) {
            window.artifactHandler.setExclusiveArtifactActive('MagicTopaz');
        }
        
        // Store the mode state
        this.setTopazState(heroSelection, {
            active: true,
            cardIndex: cardIndex,
            cost: cost,
            activatedAt: Date.now(),
            restored: true
        });
        
        // Show notification
        this.showTopazNotification(heroSelection);
        
        // Highlight deck cards
        this.highlightDeckCards(true);
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        // Add click handlers to deck cards - this will now force refresh all handlers
        this.addDeckCardClickHandlers(heroSelection);
        
        console.log('MagicTopaz: Topaz Mode restored successfully with exclusive registration');
    },

    // === CLEANUP AND RESET ===

    // Clean up topaz state (called during game reset)
    cleanup(heroSelection) {
        console.log('💎 Cleaning up Topaz state');
        
        // Clear exclusive artifact state
        if (window.artifactHandler) {
            const activeExclusive = window.artifactHandler.getActiveExclusiveArtifact();
            if (activeExclusive === 'MagicTopaz') {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
        }
        
        // Clear local state
        this.clearTopazState(heroSelection);
        
        // Clean up UI
        this.hideTopazNotification();
        this.highlightDeckCards(false);
        this.disableToBattleButton(false);
        this.removeDeckCardClickHandlers();
    },

    // Emergency exit (for error recovery)
    async emergencyExit(heroSelection) {
        console.log('💎 Emergency exit from Topaz Mode');
        
        try {
            // Force exit without save to avoid potential issues
            if (window.artifactHandler) {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
            
            this.clearTopazState(heroSelection);
            this.hideTopazNotification();
            this.highlightDeckCards(false);
            this.disableToBattleButton(false);
            this.removeDeckCardClickHandlers();
            
            // Try to update UI
            if (heroSelection.updateHandDisplay) {
                heroSelection.updateHandDisplay();
            }
            if (heroSelection.updateDeckDisplay) {
                heroSelection.updateDeckDisplay();
            }
            
            console.log('💎 Emergency exit completed');
        } catch (error) {
            console.error('💎 Error during emergency exit:', error);
        }
    }
};

// Enhanced CSS styles for Topaz with exclusive artifact integration and clickable cards
if (typeof document !== 'undefined' && !document.getElementById('topazStyles')) {
    const style = document.createElement('style');
    style.id = 'topazStyles';
    style.textContent = `
        /* Topaz Notification */
        .topaz-notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-weight: bold;
            animation: topazSlideIn 0.5s ease-out;
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .topaz-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .topaz-icon {
            font-size: 24px;
            animation: topazPulse 2s ease-in-out infinite;
        }
        
        .topaz-text {
            font-size: 16px;
            flex: 1;
        }
        
        .topaz-cancel-btn {
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
        
        .topaz-cancel-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
            transform: scale(1.05);
        }
        
        /* Deck Highlighting */
        .topaz-deck-highlight {
            border: 3px solid #ff6b6b !important;
            border-radius: 12px !important;
            box-shadow: 0 0 25px rgba(255, 107, 107, 0.5) !important;
            animation: topazGlowPulse 2s ease-in-out infinite;
        }
        
        .topaz-card-highlight {
            border: 2px solid #ff8e53 !important;
            border-radius: 8px !important;
            box-shadow: 0 0 15px rgba(255, 142, 83, 0.6) !important;
            transform: scale(1.02) !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
        }
        
        .topaz-card-highlight:hover {
            transform: scale(1.08) !important;
            box-shadow: 0 0 25px rgba(255, 142, 83, 0.8) !important;
            border-color: #ff6b6b !important;
        }
        
        /* NEW: Clickable card styling */
        .card-slot.topaz-clickable {
            position: relative;
        }

        .card-slot.topaz-clickable::before {
            content: "👆";
            position: absolute;
            top: -10px;
            right: -10px;
            font-size: 20px;
            z-index: 10;
            animation: topazClickableFloat 2s ease-in-out infinite;
            filter: drop-shadow(0 0 3px rgba(255, 107, 107, 0.8));
        }

        @keyframes topazClickableFloat {
            0%, 100% { 
                transform: translateY(0) scale(1); 
                opacity: 0.7; 
            }
            50% { 
                transform: translateY(-3px) scale(1.1); 
                opacity: 1; 
            }
        }
        
        /* Disabled To Battle Button */
        .to-battle-button.topaz-disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            filter: grayscale(50%) !important;
        }
        
        /* Success Feedback */
        .topaz-feedback {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            animation: topazFeedback 2s ease-out forwards;
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
            animation: topazSparkle 1s ease-out;
        }
        
        /* Error Message */
        .topaz-error {
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
            animation: topazError 3s ease-out forwards;
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
        @keyframes topazSlideIn {
            from {
                opacity: 0;
                transform: translate(-50%, -100%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
        
        @keyframes topazPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        @keyframes topazGlowPulse {
            0%, 100% { 
                box-shadow: 0 0 25px rgba(255, 107, 107, 0.5);
            }
            50% { 
                box-shadow: 0 0 35px rgba(255, 107, 107, 0.8);
            }
        }
        
        @keyframes topazFeedback {
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
        
        @keyframes topazSparkle {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-10deg) scale(1.2); }
            75% { transform: rotate(10deg) scale(1.2); }
        }
        
        @keyframes topazError {
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
        .topaz-notification + .exclusive-restriction-error {
            top: 80px; /* Push other exclusive errors below our notification */
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.magicTopazArtifact = magicTopazArtifact;
}