// magicEmerald.js - Magic Emerald Artifact with Exclusive Artifact System Integration
// "Choose any card from your deck and add a copy of it."

export const magicEmeraldArtifact = {
    // Main handler for when MagicEmerald is clicked/used
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log('💚 MagicEmerald activated');
        
        // Check if player can afford the artifact
        const cardInfo = heroSelection.getCardInfo(cardName);
        const cost = cardInfo?.cost || 0;
        const playerGold = heroSelection.getGoldManager().getPlayerGold();
        
        if (playerGold < cost) {
            this.showError(`You need ${cost} Gold to use MagicEmerald!`);
            return;
        }
        
        // Enter Emerald Mode WITHOUT consuming anything yet
        // Store the card index and cost for later consumption
        await this.enterEmeraldMode(heroSelection, cardIndex, cost);
    },

    // Enter Emerald Mode with exclusive artifact registration
    async enterEmeraldMode(heroSelection, cardIndex, cost) {
        console.log('💚 Entering Emerald Mode');
        
        // IMPORTANT: Register as exclusive artifact FIRST
        if (window.artifactHandler) {
            window.artifactHandler.setExclusiveArtifactActive('MagicEmerald');
        }
        
        // Store the mode state - save the card index and cost for later consumption
        this.setEmeraldState(heroSelection, {
            active: true,
            cardIndex: cardIndex,
            cost: cost,
            activatedAt: Date.now()
        });
        
        // Show notification
        this.showEmeraldNotification(heroSelection);
        
        // Highlight deck cards
        this.highlightDeckCards(true);
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        // Add click handlers to deck cards - this will now force refresh all handlers
        this.addDeckCardClickHandlers(heroSelection);
        
        // Save game state to persist the mode
        await heroSelection.saveGameState();
        
        console.log('💚 Emerald Mode activated successfully');
    },

    // Exit Emerald Mode with exclusive artifact cleanup
    async exitEmeraldMode(heroSelection, cancelled = false) {
        console.log('💚 Exiting Emerald Mode');
        
        // Get current state
        const state = this.getEmeraldState(heroSelection);
        
        // If cancelled, we need to do nothing since nothing was consumed yet
        if (cancelled && state) {
            console.log('💚 Emerald Mode cancelled - no resources were consumed');
        }
        
        // IMPORTANT: Clear exclusive artifact state FIRST
        if (window.artifactHandler) {
            window.artifactHandler.clearExclusiveArtifactActive();
        }
        
        // Clear the mode state
        this.clearEmeraldState(heroSelection);
        
        // Hide notification
        this.hideEmeraldNotification();
        
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
        
        console.log('💚 Emerald Mode deactivated');
    },

    // Show notification UI with enhanced styling
    showEmeraldNotification(heroSelection) {
        // Remove any existing notification
        this.hideEmeraldNotification();
        
        const notification = document.createElement('div');
        notification.id = 'emeraldNotification';
        notification.className = 'emerald-notification';
        notification.innerHTML = `
            <div class="emerald-content">
                <span class="emerald-icon">💚</span>
                <span class="emerald-text">Select a card in your deck to add a copy of it.</span>
                <button class="emerald-cancel-btn" onclick="window.cancelEmerald()">Cancel</button>
            </div>
        `;
        
        // Add to top of game screen
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.appendChild(notification);
        }
        
        // Set up global cancel function
        window.cancelEmerald = async () => {
            await this.exitEmeraldMode(heroSelection, true);
        };
    },

    // Hide notification UI
    hideEmeraldNotification() {
        const notification = document.getElementById('emeraldNotification');
        if (notification) {
            notification.remove();
        }
        
        // Clean up global function
        if (window.cancelEmerald) {
            delete window.cancelEmerald;
        }
    },

    // Highlight deck cards
    highlightDeckCards(highlight) {
        const deckContainer = document.querySelector('.team-building-right');
        const deckCards = document.querySelectorAll('.card-slot');
        
        if (highlight) {
            if (deckContainer) {
                deckContainer.classList.add('emerald-deck-highlight');
            }
            deckCards.forEach(card => {
                if (!card.classList.contains('empty-slot')) {
                    card.classList.add('emerald-card-highlight');
                }
            });
        } else {
            if (deckContainer) {
                deckContainer.classList.remove('emerald-deck-highlight');
            }
            deckCards.forEach(card => {
                card.classList.remove('emerald-card-highlight');
            });
        }
    },

    // ENHANCED: Add click handlers to deck cards with cleanup first
    addDeckCardClickHandlers(heroSelection) {
        // FIRST: Clean up any existing Emerald handlers to prevent duplicates
        this.removeDeckCardClickHandlers();
        
        // THEN: Add fresh handlers to all current deck cards
        const deckCards = document.querySelectorAll('.card-slot:not(.empty-slot)');
        
        console.log(`💚 MagicEmerald: Adding click handlers to ${deckCards.length} deck cards`);
        
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
                    cardSlot.setAttribute('data-emerald-handler', 'true');
                    cardSlot.style.cursor = 'pointer';
                    
                    // Add visual feedback that this card is clickable for Emerald
                    cardSlot.classList.add('emerald-clickable');
                } else {
                    console.warn('💚 MagicEmerald: Could not extract card name from image path:', cardImage.src);
                }
            } else {
                console.warn('💚 MagicEmerald: Card slot found without image element');
            }
        });
        
        console.log(`💚 MagicEmerald: Successfully added handlers to deck cards`);
    },

    // ENHANCED: Remove click handlers from deck cards with better cleanup
    removeDeckCardClickHandlers() {
        const deckCards = document.querySelectorAll('[data-emerald-handler="true"]');
        console.log(`💚 MagicEmerald: Removing click handlers from ${deckCards.length} deck cards`);
        
        deckCards.forEach(cardSlot => {
            // Create a new element to remove all event listeners
            const newElement = cardSlot.cloneNode(true);
            cardSlot.parentNode.replaceChild(newElement, cardSlot);
            
            // Clean up attributes and styling
            newElement.removeAttribute('data-emerald-handler');
            newElement.style.cursor = '';
            newElement.classList.remove('emerald-clickable');
        });
    },

    // NEW: Force refresh deck card handlers (call this if you suspect handlers are missing)
    refreshDeckCardHandlers(heroSelection) {
        console.log('💚 MagicEmerald: Force refreshing deck card handlers');
        
        // Only refresh if we're actually in Emerald mode
        if (this.isInEmeraldMode(heroSelection)) {
            this.addDeckCardClickHandlers(heroSelection);
        }
    },

    // NEW: Validate that all deck cards have proper handlers
    validateDeckCardHandlers() {
        const deckCards = document.querySelectorAll('.card-slot:not(.empty-slot)');
        const handledCards = document.querySelectorAll('[data-emerald-handler="true"]');
        
        const validation = {
            totalDeckCards: deckCards.length,
            handledCards: handledCards.length,
            isValid: deckCards.length === handledCards.length,
            missingHandlers: deckCards.length - handledCards.length
        };
        
        if (!validation.isValid) {
            console.warn(`💚 MagicEmerald: Handler validation failed - ${validation.missingHandlers} cards missing handlers`);
        }
        
        return validation;
    },

    // Handle selecting a card from the deck for duplication
    async selectDeckCard(heroSelection, cardName) {
        console.log(`💚 Selected card from deck for duplication: ${cardName}`);
        
        // Get the stored state to access card index and cost
        const state = this.getEmeraldState(heroSelection);
        if (!state) {
            this.showError('Emerald state not found!');
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
        let discardedCardName = 'MagicEmerald';
        
        if (currentHand.length > 1) {
            // Find other cards (not MagicEmerald at the stored index)
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
                
                console.log(`💚 MagicEmerald: Kept MagicEmerald in hand, discarded ${discardedCardName} instead`);
            } else {
                // Fallback: remove MagicEmerald
                discardedCardName = handManager.removeCardFromHandByIndex(state.cardIndex);
            }
        } else {
            // Only MagicEmerald in hand, remove it
            discardedCardName = handManager.removeCardFromHandByIndex(state.cardIndex);
            console.log(`💚 MagicEmerald: Only card in hand, removed MagicEmerald itself`);
        }

        if (discardedCardName && heroSelection && heroSelection.graveyardManager) {
            heroSelection.graveyardManager.addCard(discardedCardName);
            console.log(`Magic Emerald: Added ${discardedCardName} to graveyard`);
        }
        
        // Charge the gold
        if (state.cost > 0) {
            heroSelection.getGoldManager().addPlayerGold(-state.cost, 'magic_emerald_use');
        }
        
        // Add one copy of the selected card to deck
        const success = deckManager.addCard(cardName);
        
        if (success) {
            console.log(`💚 Added ${cardName} to deck`);
            
            // Show success feedback
            this.showCardAddedFeedback(cardName, discardedCardName);
            
            // Update displays immediately
            heroSelection.updateDeckDisplay();
            heroSelection.updateHandDisplay();
            heroSelection.updateGoldDisplay();
            
            // Exit Emerald Mode (not cancelled, so no restoration needed)
            await this.exitEmeraldMode(heroSelection, false);
        } else {
            console.error(`💚 Failed to add ${cardName} to deck`);
            this.showError('Could not add card to deck. Please try again.');
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

    // Show card added feedback
    showCardAddedFeedback(cardName, discardedCard) {
        const formattedCard = this.formatCardName(cardName);
        const formattedDiscarded = this.formatCardName(discardedCard);
        
        let message = `Added a copy of ${formattedCard} to your deck!`;
        if (discardedCard !== 'MagicEmerald') {
            message += ` (Consumed ${formattedDiscarded})`;
        }
        
        const feedback = document.createElement('div');
        feedback.className = 'emerald-feedback';
        feedback.innerHTML = `
            <div class="feedback-content">
                <span class="feedback-icon">💚➕</span>
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
        error.className = 'emerald-error';
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
                toBattleBtn.classList.add('emerald-disabled');
                toBattleBtn.setAttribute('data-original-title', toBattleBtn.title || '');
                toBattleBtn.title = 'Complete Emerald selection first';
            } else {
                toBattleBtn.classList.remove('emerald-disabled');
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

    setEmeraldState(heroSelection, state) {
        if (!heroSelection._emeraldState) {
            heroSelection._emeraldState = {};
        }
        Object.assign(heroSelection._emeraldState, state);
    },

    getEmeraldState(heroSelection) {
        return heroSelection._emeraldState || null;
    },

    clearEmeraldState(heroSelection) {
        heroSelection._emeraldState = null;
    },

    // Check if currently in Emerald Mode
    isInEmeraldMode(heroSelection) {
        const state = this.getEmeraldState(heroSelection);
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
    exportEmeraldState(heroSelection) {
        const state = this.getEmeraldState(heroSelection);
        if (state && state.active) {
            return {
                emeraldActive: true,
                emeraldCardIndex: state.cardIndex || 0,
                emeraldCost: state.cost || 0,
                emeraldActivatedAt: state.activatedAt || Date.now()
            };
        }
        return {
            emeraldActive: false
        };
    },

    // Restore state from saved data - integrates with exclusive artifact system
    async restoreEmeraldState(heroSelection, savedState) {
        if (savedState && savedState.emeraldActive) {
            console.log('MagicEmerald: Restoring Emerald Mode from saved state');
            
            const cardIndex = savedState.emeraldCardIndex || 0;
            const cost = savedState.emeraldCost || 0;
            
            // Re-enter Emerald Mode without consuming card or gold
            await this.enterEmeraldModeFromRestore(heroSelection, cardIndex, cost);
            
            return true;
        }
        return false;
    },

    // Special version for restoration that doesn't consume resources
    async enterEmeraldModeFromRestore(heroSelection, cardIndex, cost) {
        console.log('MagicEmerald: Entering Emerald Mode from restore');
        
        // IMPORTANT: Register as exclusive artifact FIRST (for restoration)
        if (window.artifactHandler) {
            window.artifactHandler.setExclusiveArtifactActive('MagicEmerald');
        }
        
        // Store the mode state
        this.setEmeraldState(heroSelection, {
            active: true,
            cardIndex: cardIndex,
            cost: cost,
            activatedAt: Date.now(),
            restored: true
        });
        
        // Show notification
        this.showEmeraldNotification(heroSelection);
        
        // Highlight deck cards
        this.highlightDeckCards(true);
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        // Add click handlers to deck cards - this will now force refresh all handlers
        this.addDeckCardClickHandlers(heroSelection);
        
        console.log('MagicEmerald: Emerald Mode restored successfully with exclusive registration');
    },

    // === CLEANUP AND RESET ===

    // Clean up emerald state (called during game reset)
    cleanup(heroSelection) {
        console.log('💚 Cleaning up Emerald state');
        
        // Clear exclusive artifact state
        if (window.artifactHandler) {
            const activeExclusive = window.artifactHandler.getActiveExclusiveArtifact();
            if (activeExclusive === 'MagicEmerald') {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
        }
        
        // Clear local state
        this.clearEmeraldState(heroSelection);
        
        // Clean up UI
        this.hideEmeraldNotification();
        this.highlightDeckCards(false);
        this.disableToBattleButton(false);
        this.removeDeckCardClickHandlers();
    },

    // Emergency exit (for error recovery)
    async emergencyExit(heroSelection) {
        console.log('💚 Emergency exit from Emerald Mode');
        
        try {
            // Force exit without save to avoid potential issues
            if (window.artifactHandler) {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
            
            this.clearEmeraldState(heroSelection);
            this.hideEmeraldNotification();
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
            
            console.log('💚 Emergency exit completed');
        } catch (error) {
            console.error('💚 Error during emergency exit:', error);
        }
    }
};

// Enhanced CSS styles for Emerald with exclusive artifact integration and clickable cards
if (typeof document !== 'undefined' && !document.getElementById('emeraldStyles')) {
    const style = document.createElement('style');
    style.id = 'emeraldStyles';
    style.textContent = `
        /* Emerald Notification */
        .emerald-notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-weight: bold;
            animation: emeraldSlideIn 0.5s ease-out;
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .emerald-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .emerald-icon {
            font-size: 24px;
            animation: emeraldPulse 2s ease-in-out infinite;
        }
        
        .emerald-text {
            font-size: 16px;
            flex: 1;
        }
        
        .emerald-cancel-btn {
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
        
        .emerald-cancel-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
            transform: scale(1.05);
        }
        
        /* Deck Highlighting */
        .emerald-deck-highlight {
            border: 3px solid #28a745 !important;
            border-radius: 12px !important;
            box-shadow: 0 0 25px rgba(40, 167, 69, 0.5) !important;
            animation: emeraldGlowPulse 2s ease-in-out infinite;
        }
        
        .emerald-card-highlight {
            border: 2px solid #20c997 !important;
            border-radius: 8px !important;
            box-shadow: 0 0 15px rgba(32, 201, 151, 0.6) !important;
            transform: scale(1.02) !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
        }
        
        .emerald-card-highlight:hover {
            transform: scale(1.08) !important;
            box-shadow: 0 0 25px rgba(32, 201, 151, 0.8) !important;
            border-color: #28a745 !important;
        }
        
        /* NEW: Clickable card styling */
        .card-slot.emerald-clickable {
            position: relative;
        }

        .card-slot.emerald-clickable::before {
            content: "👆";
            position: absolute;
            top: -10px;
            right: -10px;
            font-size: 20px;
            z-index: 10;
            animation: emeraldClickableFloat 2s ease-in-out infinite;
            filter: drop-shadow(0 0 3px rgba(40, 167, 69, 0.8));
        }

        @keyframes emeraldClickableFloat {
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
        .to-battle-button.emerald-disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            filter: grayscale(50%) !important;
        }
        
        /* Success Feedback */
        .emerald-feedback {
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
            animation: emeraldFeedback 2s ease-out forwards;
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
            animation: emeraldSparkle 1s ease-out;
        }
        
        /* Error Message */
        .emerald-error {
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
            animation: emeraldError 3s ease-out forwards;
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
        @keyframes emeraldSlideIn {
            from {
                opacity: 0;
                transform: translate(-50%, -100%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
        
        @keyframes emeraldPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        @keyframes emeraldGlowPulse {
            0%, 100% { 
                box-shadow: 0 0 25px rgba(40, 167, 69, 0.5);
            }
            50% { 
                box-shadow: 0 0 35px rgba(40, 167, 69, 0.8);
            }
        }
        
        @keyframes emeraldFeedback {
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
        
        @keyframes emeraldSparkle {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-10deg) scale(1.2); }
            75% { transform: rotate(10deg) scale(1.2); }
        }
        
        @keyframes emeraldError {
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
        .emerald-notification + .exclusive-restriction-error {
            top: 80px; /* Push other exclusive errors below our notification */
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.magicEmeraldArtifact = magicEmeraldArtifact;
}