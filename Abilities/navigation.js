// navigation.js - Navigation Ability Implementation

export const navigationAbility = {
    // Current Navigation mode state
    navigationMode: {
        active: false,
        heroPosition: null,
        navigationLevel: 0,
        overlay: null
    },
    
    // Check if hero can use Navigation (delegate to heroAbilitiesManager)
    canUseNavigation(heroPosition) {
        if (!window.heroSelection?.heroAbilitiesManager) {
            console.warn('HeroAbilitiesManager not available for Navigation check');
            return false;
        }
        
        // Use heroAbilitiesManager's tracking (similar to Leadership)
        // This would need to be added to heroAbilitiesManager if it doesn't exist yet
        return window.heroSelection.heroAbilitiesManager.canUseNavigation?.(heroPosition) ?? true;
    },
    
    // Mark Navigation as used for this hero (delegate to heroAbilitiesManager)
    markNavigationUsed(heroPosition) {
        if (!window.heroSelection?.heroAbilitiesManager) {
            console.warn('HeroAbilitiesManager not available for Navigation tracking');
            return false;
        }
        
        // Use heroAbilitiesManager's tracking (similar to Leadership)
        // This would need to be added to heroAbilitiesManager if it doesn't exist yet
        const success = window.heroSelection.heroAbilitiesManager.markNavigationUsed?.(heroPosition) ?? false;
        
        if (success) {
            // Save the state immediately after marking as used
            if (window.heroSelection?.saveGameState) {
                window.heroSelection.saveGameState();
            }
        }
        
        return success;
    },
    
    // Handle Navigation ability click
    async handleClick(heroPosition, stackCount) {
        console.log(`Navigation clicked: position=${heroPosition}, level=${stackCount}`);
        
        // Check if hero selection is available
        if (!window.heroSelection) {
            console.error('Hero selection not available');
            this.showError('Game not properly initialized!');
            return;
        }
        
        // Check if this hero has already used Navigation this turn
        if (!this.canUseNavigation(heroPosition)) {
            this.showError("This Hero's Navigation was already used this turn!");
            return;
        }
        
        // Get hand manager
        const handManager = window.heroSelection.getHandManager();
        if (!handManager) {
            console.error('Hand manager not available');
            this.showError('Cannot access hand!');
            return;
        }
        
        // Get current hand and count unique cards
        const hand = handManager.getHand();
        const uniqueCards = new Set(hand).size;
        
        console.log(`Navigation check: ${uniqueCards} unique cards vs ${stackCount} Navigation level`);
        
        // Check if too many unique cards
        if (uniqueCards > stackCount) {
            this.showError("You have too many unique cards to navigate your deck!");
            return;
        }
        
        // Start Navigation mode
        this.startNavigationMode(heroPosition, stackCount);
    },
    
    // Start Navigation search mode
    startNavigationMode(heroPosition, navigationLevel) {
        console.log(`Starting Navigation mode for hero ${heroPosition}, level: ${navigationLevel}`);
        
        // Set exclusive artifact to disable other interactions (like MagneticGlove)
        if (window.artifactHandler) {
            window.artifactHandler.setExclusiveArtifactActive('Navigation');
        }
        
        // Initialize Navigation mode state
        this.navigationMode = {
            active: true,
            heroPosition: heroPosition,
            navigationLevel: navigationLevel,
            overlay: null
        };
        
        // Create Navigation mode UI
        this.createNavigationModeUI();
        
        // Highlight deck and add click handlers (like MagneticGlove)
        this.highlightDeckCards(true);
        this.addDeckCardClickHandlers();
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        console.log('Navigation mode activated successfully');
    },
    
    // Create Navigation mode UI overlay
    createNavigationModeUI() {
        const overlay = document.createElement('div');
        overlay.className = 'navigation-mode-overlay';
        overlay.innerHTML = `
            <div class="navigation-mode-container">
                <div class="navigation-mode-header">
                    <h3>🧭 Navigate Your Deck</h3>
                    <p>Choose a card from your deck to add to your hand.</p>
                    <p class="navigation-hint">💡 Click any card in your deck below to select it!</p>
                </div>
                <div class="navigation-mode-buttons">
                    <button class="btn btn-secondary" onclick="window.navigationAbility.cancelNavigationMode()">
                        Cancel
                    </button>
                </div>
                <div class="navigation-mode-indicator">
                    <span class="arrow-down">↓</span>
                    <span class="instruction">Click a deck card below</span>
                    <span class="arrow-down">↓</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.navigationMode.overlay = overlay;
        
        // Add navigation mode class to body
        document.body.classList.add('navigation-mode-active');
    },
    
    // Add click handlers to deck cards (similar to MagneticGlove)
    addDeckCardClickHandlers() {
        const deckCards = document.querySelectorAll('.card-slot:not(.empty-slot)');
        
        deckCards.forEach(cardSlot => {
            const cardImage = cardSlot.querySelector('img');
            if (cardImage) {
                // Extract card name from image src
                const cardName = this.extractCardNameFromPath(cardImage.src);
                if (cardName) {
                    const clickHandler = async (event) => {
                        event.stopPropagation();
                        await this.selectDeckCard(cardName);
                    };
                    
                    cardSlot.addEventListener('click', clickHandler);
                    cardSlot.setAttribute('data-navigation-handler', 'true');
                    cardSlot.style.cursor = 'pointer';
                }
            }
        });
    },
    
    // Handle selecting a card from the deck
    async selectDeckCard(cardName) {
        console.log(`Navigation: Selected card from deck: ${cardName}`);
        
        const heroSelection = window.heroSelection;
        
        // Check if hand is full before adding
        if (heroSelection.getHandManager().isHandFull()) {
            this.showError('Your hand is full! Cannot add more cards.');
            return;
        }
        
        // Add the selected card to hand
        const success = heroSelection.addCardToHand(cardName);
        
        if (success) {
            console.log(`Navigation: Added ${cardName} to hand`);
            
            // Show success feedback
            this.showCardSelectedFeedback(cardName);
            
            // IMPORTANT: Only mark Navigation as used AFTER successful selection
            this.markNavigationUsed(this.navigationMode.heroPosition);
            
            // Exit Navigation mode
            await this.endNavigationMode();
            
            // Save game state
            await heroSelection.saveGameState();
        } else {
            console.error(`Navigation: Failed to add ${cardName} to hand`);
            this.showError('Could not add card to hand. Please try again.');
        }
    },
    
    // Cancel Navigation mode
    async cancelNavigationMode() {
        console.log('Navigation mode cancelled by player');
        await this.endNavigationMode();
    },
    
    // End Navigation mode
    async endNavigationMode() {
        console.log('Ending Navigation mode');
        
        // Clear exclusive artifact state (like MagneticGlove)
        if (window.artifactHandler) {
            window.artifactHandler.clearExclusiveArtifactActive();
        }
        
        // Remove overlay
        if (this.navigationMode.overlay) {
            this.navigationMode.overlay.remove();
        }
        
        // Remove body class
        document.body.classList.remove('navigation-mode-active');
        
        // Remove deck highlighting and click handlers
        this.highlightDeckCards(false);
        this.removeDeckCardClickHandlers();
        
        // Re-enable "To Battle!" button
        this.disableToBattleButton(false);
        
        // Reset Navigation mode state
        this.navigationMode = {
            active: false,
            heroPosition: null,
            navigationLevel: 0,
            overlay: null
        };
        
        // Update displays
        if (window.heroSelection) {
            window.heroSelection.updateHandDisplay();
        }
        
        console.log('Navigation mode ended successfully');
    },
    
    // Extract card name from image path (copied from MagneticGlove)
    extractCardNameFromPath(imagePath) {
        if (!imagePath) return null;
        
        // Extract filename from path like "./Cards/All/CardName.png"
        const matches = imagePath.match(/\/([^\/]+)\.png$/);
        if (matches && matches[1]) {
            return matches[1];
        }
        
        return null;
    },
    
    // Highlight deck cards (similar to MagneticGlove)
    highlightDeckCards(highlight) {
        const deckContainer = document.querySelector('.team-building-right');
        const deckCards = document.querySelectorAll('.card-slot');
        
        if (highlight) {
            if (deckContainer) {
                deckContainer.classList.add('navigation-deck-highlight');
            }
            deckCards.forEach(card => {
                if (!card.classList.contains('empty-slot')) {
                    card.classList.add('navigation-card-highlight');
                }
            });
        } else {
            if (deckContainer) {
                deckContainer.classList.remove('navigation-deck-highlight');
            }
            deckCards.forEach(card => {
                card.classList.remove('navigation-card-highlight');
            });
        }
    },
    
    // Remove click handlers from deck cards (similar to MagneticGlove)
    removeDeckCardClickHandlers() {
        const deckCards = document.querySelectorAll('[data-navigation-handler="true"]');
        deckCards.forEach(cardSlot => {
            // Create a new element to remove all event listeners
            const newElement = cardSlot.cloneNode(true);
            cardSlot.parentNode.replaceChild(newElement, cardSlot);
            
            // Clean up attributes
            newElement.removeAttribute('data-navigation-handler');
            newElement.style.cursor = '';
        });
    },
    
    // Disable/enable "To Battle!" button (similar to MagneticGlove)
    disableToBattleButton(disable) {
        const toBattleBtn = document.querySelector('.to-battle-button');
        if (toBattleBtn) {
            toBattleBtn.disabled = disable;
            if (disable) {
                toBattleBtn.classList.add('navigation-disabled');
                toBattleBtn.setAttribute('data-original-title', toBattleBtn.title || '');
                toBattleBtn.title = 'Complete Navigation first';
            } else {
                toBattleBtn.classList.remove('navigation-disabled');
                const originalTitle = toBattleBtn.getAttribute('data-original-title');
                if (originalTitle) {
                    toBattleBtn.title = originalTitle;
                } else {
                    toBattleBtn.removeAttribute('title');
                }
            }
        }
    },
    
    // Show error message (similar to Leadership)
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'navigation-error-popup';
        errorDiv.textContent = message;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(220, 53, 69, 0.95);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            animation: navigationErrorShake 0.5s ease-out;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'navigationErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2000);
    },
    
    // Show success message (similar to MagneticGlove)
    showCardSelectedFeedback(cardName) {
        const formatted = this.formatCardName(cardName);
        
        const feedback = document.createElement('div');
        feedback.className = 'navigation-feedback';
        feedback.innerHTML = `
            <div class="feedback-content">
                <span class="feedback-icon">🧭✨</span>
                <span class="feedback-text">Found ${formatted} and added it to your hand!</span>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    },
    
    // Format card name for display (copied from MagneticGlove)
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
};

// Make the ability available globally for onclick handlers
if (typeof window !== 'undefined') {
    window.navigationAbility = navigationAbility;
}

// CSS styles for Navigation mode
if (typeof document !== 'undefined' && !document.getElementById('navigationStyles')) {
    const style = document.createElement('style');
    style.id = 'navigationStyles';
    style.textContent = `
        /* Navigation mode overlay */
        .navigation-mode-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1500;
            padding: 20px;
            animation: slideDown 0.3s ease-out;
        }
        
        .navigation-mode-container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        
        .navigation-mode-header {
            margin-bottom: 20px;
        }
        
        .navigation-mode-header h3 {
            color: white;
            font-size: 28px;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        .navigation-mode-header p {
            color: #ddd;
            font-size: 18px;
            margin-bottom: 5px;
        }
        
        .navigation-hint {
            color: #28a745 !important;
            font-weight: bold !important;
            font-size: 16px !important;
            text-shadow: 0 0 10px rgba(40, 167, 69, 0.5) !important;
        }
        
        .navigation-mode-buttons {
            margin-bottom: 20px;
        }
        
        .navigation-mode-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            color: #28a745;
            font-size: 18px;
            font-weight: bold;
            margin-top: 20px;
        }
        
        .arrow-down {
            font-size: 24px;
            animation: bounce 1s ease-in-out infinite;
        }
        
        /* Deck highlighting */
        .navigation-deck-highlight {
            border: 3px solid #28a745 !important;
            border-radius: 12px !important;
            box-shadow: 0 0 25px rgba(40, 167, 69, 0.5) !important;
            animation: navigationGlowPulse 2s ease-in-out infinite;
        }
        
        .navigation-card-highlight {
            border: 2px solid #20c997 !important;
            border-radius: 8px !important;
            box-shadow: 0 0 15px rgba(32, 201, 151, 0.6) !important;
            transform: scale(1.02) !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
        }
        
        .navigation-card-highlight:hover {
            transform: scale(1.08) !important;
            box-shadow: 0 0 25px rgba(32, 201, 151, 0.8) !important;
            border-color: #28a745 !important;
        }
        
        /* Disabled To Battle Button */
        .to-battle-button.navigation-disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            filter: grayscale(50%) !important;
        }
        
        /* Success Feedback */
        .navigation-feedback {
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
            animation: navigationFeedback 2s ease-out forwards;
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
            animation: navigationSparkle 1s ease-out;
        }
        
        /* Animations */
        @keyframes slideDown {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        @keyframes navigationGlowPulse {
            0%, 100% { 
                box-shadow: 0 0 25px rgba(40, 167, 69, 0.5);
            }
            50% { 
                box-shadow: 0 0 35px rgba(40, 167, 69, 0.8);
            }
        }
        
        @keyframes navigationFeedback {
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
        
        @keyframes navigationSparkle {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-10deg) scale(1.2); }
            75% { transform: rotate(10deg) scale(1.2); }
        }
        
        @keyframes navigationErrorShake {
            0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
            25% { transform: translate(-50%, -50%) rotate(-3deg); }
            75% { transform: translate(-50%, -50%) rotate(3deg); }
        }
        
        @keyframes navigationErrorFade {
            from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
    `;
    document.head.appendChild(style);
}