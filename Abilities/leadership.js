// leadership.js - Leadership Ability Implementation - FIXED VERSION WITH BONUS DRAWS

export const leadershipAbility = {
    // Track which heroes have used Leadership this turn
    heroLeadershipUsed: {},
    
    // Current Leadership mode state
    leadershipMode: {
        active: false,
        heroPosition: null,
        maxCards: 0,
        selectedCards: [],
        overlay: null,
        originalHandState: null
    },
    
    // Initialize or get usage tracking from heroAbilitiesManager
    getUsageTracking() {
        if (!window.heroSelection?.heroAbilitiesManager) {
            console.warn('HeroAbilitiesManager not available, using local tracking');
            return this.heroLeadershipUsed;
        }
        
        // Use the HeroAbilitiesManager's tracking
        return window.heroSelection.heroAbilitiesManager.heroLeadershipUsedThisTurn;
    },
    
    // Check if hero can use Leadership
    canUseLeadership(heroPosition) {
        if (!window.heroSelection?.heroAbilitiesManager) {
            console.warn('HeroAbilitiesManager not available, using local tracking');
            return !this.heroLeadershipUsed[heroPosition];
        }
        
        // Use the HeroAbilitiesManager's method
        return window.heroSelection.heroAbilitiesManager.canUseLeadership(heroPosition);
    },
    
    // Mark Leadership as used for this hero
    markLeadershipUsed(heroPosition) {
        if (!window.heroSelection?.heroAbilitiesManager) {
            console.warn('HeroAbilitiesManager not available, using local tracking');
            this.heroLeadershipUsed[heroPosition] = true;
            return;
        }
        
        // Use the HeroAbilitiesManager's method
        const success = window.heroSelection.heroAbilitiesManager.markLeadershipUsed(heroPosition);
        
        if (success) {
            // Save the state immediately after marking as used
            if (window.heroSelection?.saveGameState) {
                window.heroSelection.saveGameState();
            }
        }
    },
    
    // Calculate total cards to draw including bonus
    calculateTotalDraws(cardsRemoved) {
        const baseDraws = cardsRemoved;
        const bonusDraws = Math.floor(cardsRemoved / 3);
        return baseDraws + bonusDraws;
    },
    
    // Handle Leadership ability click
    async handleClick(heroPosition, stackCount) {
        console.log(`Leadership clicked: position=${heroPosition}, level=${stackCount}`);
        
        // Check if hero selection is available
        if (!window.heroSelection) {
            console.error('Hero selection not available');
            this.showError('Game not properly initialized!');
            return;
        }
        
        // Check if this hero has already used Leadership this turn
        if (!this.canUseLeadership(heroPosition)) {
            this.showError("This Hero's Leadership was already used this turn!");
            return;
        }
        
        // Get hand manager
        const handManager = window.heroSelection.getHandManager();
        if (!handManager) {
            console.error('Hand manager not available');
            this.showError('Cannot access hand!');
            return;
        }
        
        // Get current hand
        const hand = handManager.getHand();
        if (hand.length === 0) {
            this.showError("You have no cards in hand!");
            return;
        }
        
        // Start Leadership mode directly
        this.startLeadershipMode(heroPosition, stackCount);
    },
    
    // Start Leadership selection mode with improved initialization
    startLeadershipMode(heroPosition, maxCards) {
        console.log(`Leadership: Starting Leadership mode for hero ${heroPosition}, max cards: ${maxCards}`);
        
        // Ensure we have valid hand cards before proceeding
        const handCards = document.querySelectorAll('.hand-card');
        if (handCards.length === 0) {
            console.error('Leadership: No hand cards found, cannot start Leadership mode');
            this.showError('No cards available to select!');
            return false;
        }
        
        // Initialize Leadership mode state
        this.leadershipMode = {
            active: true,
            heroPosition: heroPosition,
            maxCards: maxCards,
            selectedCards: [],
            overlay: null,
            originalHandState: null
        };
        
        // Create Leadership mode UI first
        this.createLeadershipModeUI();
        
        // Add click handlers to hand cards with improved reliability
        this.enableCardSelection();
        
        // Add a verification check after a short delay
        setTimeout(() => {
            if (!this.checkLeadershipModeState()) {
                console.warn('Leadership: Mode initialization may have failed, attempting recovery...');
                this.enableCardSelection(); // Try again
            }
        }, 200);
        
        console.log('Leadership: Mode started successfully');
        return true;
    },
    
    // Create the Leadership mode UI overlay
    createLeadershipModeUI() {
        const overlay = document.createElement('div');
        overlay.className = 'leadership-mode-overlay';
        overlay.innerHTML = `
            <div class="leadership-mode-container">
                <div class="leadership-mode-header">
                    <h3>Select Cards to Shuffle Back</h3>
                    <p>Select up to <strong>${this.leadershipMode.maxCards}</strong> card${this.leadershipMode.maxCards > 1 ? 's' : ''} to shuffle into your deck and draw that many.</p>
                    <p class="leadership-bonus-info">💡 <strong>Bonus:</strong> Draw +1 extra card for every 3 cards shuffled back!</p>
                </div>
                <div class="leadership-mode-buttons">
                    <button class="btn btn-primary leadership-confirm-btn" onclick="window.leadershipAbility.confirmSelection()" disabled>
                        Confirm (0/${this.leadershipMode.maxCards})
                    </button>
                    <button class="btn btn-secondary" onclick="window.leadershipAbility.cancelLeadershipMode()">
                        Cancel
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="window.leadershipAbility.refreshLeadershipSelection()" style="font-size: 12px;">
                        Refresh
                    </button>
                </div>
                <div class="leadership-mode-hand-indicator">
                    <span class="arrow-down">↓</span>
                    <span class="instruction">Click cards below to select</span>
                    <span class="arrow-down">↓</span>
                </div>
                <div class="leadership-draw-preview">
                    <span class="draw-preview-text">Will draw: <span class="draw-count">0</span> cards</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.leadershipMode.overlay = overlay;
        
        // Add leadership mode class to body
        document.body.classList.add('leadership-mode-active');
    },
    
    // Enable card selection in hand with improved reliability
    enableCardSelection() {
        // Add a small delay to ensure DOM is fully ready
        setTimeout(() => {
            const handCards = document.querySelectorAll('.hand-card');
            console.log(`Leadership: Found ${handCards.length} hand cards`);
            
            if (handCards.length === 0) {
                console.warn('Leadership: No hand cards found, retrying...');
                // Retry after a longer delay
                setTimeout(() => {
                    this.enableCardSelection();
                }, 500);
                return;
            }
            
            handCards.forEach((card, index) => {
                try {
                    // Store original onclick and other important attributes
                    card.dataset.originalOnclick = card.getAttribute('onclick') || '';
                    card.dataset.originalCursor = card.style.cursor || '';
                    card.dataset.originalPointerEvents = card.style.pointerEvents || '';
                    
                    // Force enable the card for Leadership selection
                    card.style.pointerEvents = 'auto';
                    card.style.cursor = 'pointer';
                    
                    // Replace with leadership selection handler
                    card.setAttribute('onclick', `window.leadershipAbility.toggleCardSelection(${index})`);
                    
                    // Add leadership mode class
                    card.classList.add('leadership-selectable');
                    
                    console.log(`Leadership: Enabled card ${index} (${card.dataset.cardName})`);
                } catch (error) {
                    console.error(`Leadership: Failed to enable card ${index}:`, error);
                }
            });
            
            // Force update the UI after enabling selection
            this.updateLeadershipUI();
            
        }, 100); // Small delay to ensure DOM is ready
    },
    
    // Enhanced toggle card selection with better error handling
    toggleCardSelection(cardIndex) {
        console.log(`Leadership: Toggle selection for card ${cardIndex}`);
        
        const handCards = document.querySelectorAll('.hand-card');
        
        if (cardIndex < 0 || cardIndex >= handCards.length) {
            console.error(`Leadership: Invalid card index ${cardIndex}, have ${handCards.length} cards`);
            return;
        }
        
        const card = handCards[cardIndex];
        if (!card) {
            console.error(`Leadership: Card at index ${cardIndex} not found`);
            return;
        }
        
        // Ensure the card is still selectable
        if (!card.classList.contains('leadership-selectable')) {
            console.warn(`Leadership: Card ${cardIndex} is no longer selectable, re-enabling...`);
            this.enableCardSelection();
            return;
        }
        
        const isSelected = this.leadershipMode.selectedCards.includes(cardIndex);
        
        if (isSelected) {
            // Deselect card
            const idx = this.leadershipMode.selectedCards.indexOf(cardIndex);
            this.leadershipMode.selectedCards.splice(idx, 1);
            card.classList.remove('leadership-selected');
            console.log(`Leadership: Deselected card ${cardIndex}`);
        } else {
            // Check if we can select more cards
            if (this.leadershipMode.selectedCards.length < this.leadershipMode.maxCards) {
                // Select card
                this.leadershipMode.selectedCards.push(cardIndex);
                card.classList.add('leadership-selected');
                console.log(`Leadership: Selected card ${cardIndex}`);
            } else {
                console.log(`Leadership: Maximum cards already selected (${this.leadershipMode.maxCards})`);
            }
        }
        
        // Update UI
        this.updateLeadershipUI();
    },
    
    // Update Leadership mode UI
    updateLeadershipUI() {
        const selectedCount = this.leadershipMode.selectedCards.length;
        const maxCards = this.leadershipMode.maxCards;
        const totalDraws = this.calculateTotalDraws(selectedCount);
        
        // Update confirm button
        const confirmBtn = document.querySelector('.leadership-confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = selectedCount === 0;
            confirmBtn.textContent = `Confirm (${selectedCount}/${maxCards})`;
        }
        
        // Update draw preview
        const drawCountElement = document.querySelector('.draw-count');
        if (drawCountElement) {
            drawCountElement.textContent = totalDraws;
            
            // Add visual feedback for bonus draws
            const drawPreviewElement = document.querySelector('.draw-preview-text');
            if (drawPreviewElement && selectedCount >= 3) {
                const bonusDraws = Math.floor(selectedCount / 3);
                drawPreviewElement.innerHTML = `Will draw: <span class="draw-count">${totalDraws}</span> cards <span class="bonus-indicator">(+${bonusDraws} bonus!)</span>`;
            } else if (drawPreviewElement) {
                drawPreviewElement.innerHTML = `Will draw: <span class="draw-count">${totalDraws}</span> cards`;
            }
        }
        
        // Update card states
        const handCards = document.querySelectorAll('.hand-card');
        handCards.forEach((card, index) => {
            if (selectedCount >= maxCards && !this.leadershipMode.selectedCards.includes(index)) {
                // Gray out unselected cards when max is reached
                card.classList.add('leadership-disabled');
            } else {
                card.classList.remove('leadership-disabled');
            }
        });
    },
    
    // Confirm card selection with bonus draws
    async confirmSelection() {
        if (this.leadershipMode.selectedCards.length === 0) return;
        
        const selectedCount = this.leadershipMode.selectedCards.length;
        const heroPosition = this.leadershipMode.heroPosition;
        const totalDraws = this.calculateTotalDraws(selectedCount);
        const bonusDraws = Math.floor(selectedCount / 3);
        
        // Get hand manager
        const handManager = window.heroSelection.getHandManager();
        const deckManager = window.heroSelection.getDeckManager();
        
        if (!handManager || !deckManager) {
            console.error('Managers not available');
            this.cancelLeadershipMode();
            return;
        }
        
        // Get the selected cards (in reverse order to maintain indices)
        const selectedCardNames = [];
        const sortedIndices = [...this.leadershipMode.selectedCards].sort((a, b) => b - a);
        
        for (const index of sortedIndices) {
            const cardName = handManager.getHand()[index];
            if (cardName) {
                selectedCardNames.push(cardName);
                handManager.removeCardFromHandByIndex(index);
            }
        }
        
        // The cards are shuffled back into the deck conceptually (infinite deck)
        console.log(`Shuffled ${selectedCardNames.length} cards back into deck:`, selectedCardNames);
        
        // Draw total cards (base + bonus)
        const drawnCards = handManager.drawCards(totalDraws);
        console.log(`Drew ${drawnCards.length} cards (${selectedCount} base + ${bonusDraws} bonus):`, drawnCards);
        
        // Mark Leadership as used for this hero
        this.markLeadershipUsed(heroPosition);
        
        // Update displays
        if (window.heroSelection.updateHandDisplay) {
            window.heroSelection.updateHandDisplay();
        }
        
        // Save game state
        if (window.heroSelection.saveGameState) {
            await window.heroSelection.saveGameState();
        }
        
        // Show success message with bonus info
        let successMessage = `Shuffled ${selectedCount} card${selectedCount > 1 ? 's' : ''} and drew ${drawnCards.length} new card${drawnCards.length > 1 ? 's' : ''}!`;
        if (bonusDraws > 0) {
            successMessage += ` (Including ${bonusDraws} bonus draw${bonusDraws > 1 ? 's' : ''}!)`;
        }
        this.showSuccess(successMessage);
        
        // End Leadership mode
        this.endLeadershipMode();
    },
    
    // Cancel Leadership mode
    cancelLeadershipMode() {
        this.endLeadershipMode();
    },
    
    // Enhanced end Leadership mode with better cleanup
    endLeadershipMode() {
        console.log('Leadership: Ending Leadership mode');
        
        // Remove overlay
        if (this.leadershipMode.overlay) {
            this.leadershipMode.overlay.remove();
        }
        
        // Remove body class
        document.body.classList.remove('leadership-mode-active');
        
        // Restore hand card handlers with better error handling
        const handCards = document.querySelectorAll('.hand-card');
        handCards.forEach((card, index) => {
            try {
                // Restore original onclick
                const originalOnclick = card.dataset.originalOnclick;
                if (originalOnclick && originalOnclick !== '') {
                    card.setAttribute('onclick', originalOnclick);
                } else {
                    card.removeAttribute('onclick');
                }
                
                // Restore original styling
                card.style.cursor = card.dataset.originalCursor || '';
                card.style.pointerEvents = card.dataset.originalPointerEvents || '';
                
                // Clean up datasets
                delete card.dataset.originalOnclick;
                delete card.dataset.originalCursor;
                delete card.dataset.originalPointerEvents;
                
                // Remove leadership classes
                card.classList.remove('leadership-selectable', 'leadership-selected', 'leadership-disabled');
                
                console.log(`Leadership: Restored card ${index}`);
            } catch (error) {
                console.error(`Leadership: Failed to restore card ${index}:`, error);
            }
        });
        
        // Reset state
        this.leadershipMode = {
            active: false,
            heroPosition: null,
            maxCards: 0,
            selectedCards: [],
            overlay: null,
            originalHandState: null
        };
        
        console.log('Leadership: Mode ended successfully');
    },
    
    // Add a method to check if Leadership mode is properly initialized
    checkLeadershipModeState() {
        if (!this.leadershipMode.active) {
            console.warn('Leadership: Mode is not active');
            return false;
        }
        
        const handCards = document.querySelectorAll('.hand-card');
        const selectableCards = document.querySelectorAll('.hand-card.leadership-selectable');
        
        if (handCards.length === 0) {
            console.error('Leadership: No hand cards found');
            return false;
        }
        
        if (selectableCards.length !== handCards.length) {
            console.warn(`Leadership: Only ${selectableCards.length}/${handCards.length} cards are selectable`);
            // Try to re-enable selection
            this.enableCardSelection();
            return false;
        }
        
        return true;
    },
    
    // Debug method to help identify Leadership selection issues
    debugLeadershipState() {
        console.log('=== Leadership Debug Info ===');
        console.log('Leadership mode active:', this.leadershipMode.active);
        console.log('Selected cards:', this.leadershipMode.selectedCards);
        console.log('Max cards:', this.leadershipMode.maxCards);
        
        const handCards = document.querySelectorAll('.hand-card');
        console.log('Total hand cards:', handCards.length);
        
        const selectableCards = document.querySelectorAll('.hand-card.leadership-selectable');
        console.log('Selectable cards:', selectableCards.length);
        
        const selectedCards = document.querySelectorAll('.hand-card.leadership-selected');
        console.log('Currently selected cards:', selectedCards.length);
        
        // Check each card's state
        handCards.forEach((card, index) => {
            const cardName = card.dataset.cardName || 'unknown';
            const isSelectable = card.classList.contains('leadership-selectable');
            const isSelected = card.classList.contains('leadership-selected');
            const isDisabled = card.classList.contains('leadership-disabled');
            const onclick = card.getAttribute('onclick');
            const pointerEvents = window.getComputedStyle(card).pointerEvents;
            const cursor = window.getComputedStyle(card).cursor;
            
            console.log(`Card ${index} (${cardName}):`, {
                selectable: isSelectable,
                selected: isSelected,
                disabled: isDisabled,
                onclick: onclick ? onclick.substring(0, 50) + '...' : 'none',
                pointerEvents: pointerEvents,
                cursor: cursor
            });
        });
        
        console.log('=== End Leadership Debug ===');
    },
    
    // Method to force refresh Leadership selection (can be called manually for debugging)
    refreshLeadershipSelection() {
        if (!this.leadershipMode.active) {
            console.log('Leadership: Mode not active, cannot refresh');
            return false;
        }
        
        console.log('Leadership: Forcing refresh of card selection...');
        
        // Clear existing selection state
        const handCards = document.querySelectorAll('.hand-card');
        handCards.forEach(card => {
            card.classList.remove('leadership-selectable', 'leadership-selected', 'leadership-disabled');
        });
        
        // Re-enable selection
        this.enableCardSelection();
        
        // Update UI
        this.updateLeadershipUI();
        
        console.log('Leadership: Selection refreshed');
        return true;
    },
    
    // Show error message
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'leadership-error-popup';
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
            animation: leadershipErrorShake 0.5s ease-out;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'leadershipErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2000);
    },
    
    // Show success message
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'leadership-success-popup';
        successDiv.textContent = message;
        
        successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(40, 167, 69, 0.95);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            animation: leadershipSuccessPulse 0.5s ease-out;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'leadershipSuccessFade 0.3s ease-out forwards';
            setTimeout(() => successDiv.remove(), 300);
        }, 2500);
    }
};

// Make the ability available globally for the onclick handlers
if (typeof window !== 'undefined') {
    window.leadershipAbility = leadershipAbility;
}

// Enhanced CSS for Leadership mode with bonus draw styling
if (typeof document !== 'undefined' && !document.getElementById('leadershipStyles')) {
    const style = document.createElement('style');
    style.id = 'leadershipStyles';
    style.textContent = `
        /* Leadership prompt overlay */
        .leadership-prompt-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease-out;
        }
        
        .leadership-prompt-container {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 249, 250, 0.98));
            border: 3px solid #667eea;
            border-radius: 20px;
            padding: 30px;
            max-width: 400px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: modalSlideIn 0.3s ease-out;
        }
        
        .leadership-prompt-container h3 {
            font-size: 24px;
            margin-bottom: 15px;
            color: #333;
        }
        
        .leadership-prompt-container p {
            font-size: 16px;
            color: #666;
            margin-bottom: 25px;
        }
        
        .leadership-prompt-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        
        /* Enhanced Leadership mode overlay */
        .leadership-mode-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1500;
            padding: 20px;
            animation: slideDown 0.3s ease-out;
        }
        
        .leadership-mode-container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        
        .leadership-mode-header {
            margin-bottom: 20px;
        }
        
        .leadership-mode-header h3 {
            color: white;
            font-size: 28px;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        .leadership-mode-header p {
            color: #ddd;
            font-size: 18px;
            margin-bottom: 5px;
        }
        
        .leadership-bonus-info {
            color: #28a745 !important;
            font-weight: bold !important;
            font-size: 16px !important;
            text-shadow: 0 0 10px rgba(40, 167, 69, 0.5) !important;
            animation: bonusInfoGlow 2s ease-in-out infinite;
        }
        
        @keyframes bonusInfoGlow {
            0%, 100% { text-shadow: 0 0 10px rgba(40, 167, 69, 0.5); }
            50% { text-shadow: 0 0 15px rgba(40, 167, 69, 0.8); }
        }
        
        .leadership-mode-buttons {
            margin-bottom: 20px;
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .leadership-mode-hand-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            color: #667eea;
            font-size: 18px;
            font-weight: bold;
            margin-top: 20px;
        }
        
        .arrow-down {
            font-size: 24px;
            animation: bounce 1s ease-in-out infinite;
        }
        
        .leadership-draw-preview {
            margin-top: 15px;
            padding: 10px 20px;
            background: rgba(40, 167, 69, 0.2);
            border: 2px solid rgba(40, 167, 69, 0.5);
            border-radius: 15px;
            display: inline-block;
        }
        
        .draw-preview-text {
            color: #28a745;
            font-size: 18px;
            font-weight: bold;
        }
        
        .draw-count {
            color: #ffffff;
            font-size: 22px;
            text-shadow: 0 0 10px rgba(40, 167, 69, 0.8);
        }
        
        .bonus-indicator {
            color: #ffd700;
            font-size: 16px;
            animation: bonusPulse 1.5s ease-in-out infinite;
        }
        
        @keyframes bonusPulse {
            0%, 100% { 
                transform: scale(1);
                text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
            }
            50% { 
                transform: scale(1.1);
                text-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
            }
        }
        
        /* ENHANCED: Override all card restrictions during Leadership mode */
        body.leadership-mode-active .hand-card {
            transition: all 0.3s ease;
            pointer-events: auto !important;
        }
        
        body.leadership-mode-active .hand-card.no-actions-available,
        body.leadership-mode-active .hand-card.exclusive-hand-disabled,
        body.leadership-mode-active .hand-card[data-unaffordable="true"] {
            cursor: pointer !important;
            opacity: 0.7 !important;
            filter: grayscale(50%) !important;
        }
        
        .hand-card.leadership-selectable {
            cursor: pointer !important;
            border: 2px solid transparent;
            position: relative;
        }
        
        .hand-card.leadership-selectable::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 2px solid rgba(102, 126, 234, 0.3);
            border-radius: 8px;
            pointer-events: none;
            transition: all 0.2s ease;
        }
        
        .hand-card.leadership-selectable:hover {
            border-color: #667eea !important;
            transform: translateY(-15px) scale(1.05) !important;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.5) !important;
        }
        
        .hand-card.leadership-selectable:hover::before {
            border-color: rgba(102, 126, 234, 0.6);
            box-shadow: 0 0 15px rgba(102, 126, 234, 0.4);
        }
        
        .hand-card.leadership-selected {
            border: 3px solid #28a745 !important;
            box-shadow: 0 0 20px rgba(40, 167, 69, 0.6) !important;
            transform: translateY(-10px) scale(1.03) !important;
        }
        
        .hand-card.leadership-selected::after {
            content: '✓';
            position: absolute;
            top: -10px;
            right: -10px;
            background: #28a745;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            z-index: 10;
        }
        
        .hand-card.leadership-disabled {
            opacity: 0.4 !important;
            filter: grayscale(70%) !important;
            cursor: not-allowed !important;
            transform: scale(0.95) !important;
        }
        
        .hand-card.leadership-disabled:hover {
            border-color: transparent !important;
            transform: scale(0.95) !important;
            box-shadow: none !important;
        }
        
        body.leadership-mode-active .hand-card.leadership-selectable.no-actions-available:hover::before,
        body.leadership-mode-active .hand-card.leadership-selectable.exclusive-hand-disabled:hover::before {
            content: none;
        }
        
        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideDown {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        @keyframes leadershipErrorShake {
            0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
            25% { transform: translate(-50%, -50%) rotate(-3deg); }
            75% { transform: translate(-50%, -50%) rotate(3deg); }
        }
        
        @keyframes leadershipErrorFade {
            from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
        
        @keyframes leadershipSuccessPulse {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        
        @keyframes leadershipSuccessFade {
            from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
        }
    `;
    document.head.appendChild(style);
}