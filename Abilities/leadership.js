// leadership.js - Leadership Ability Implementation

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
        
        // Show initial prompt
        //this.showLeadershipPrompt(heroPosition, stackCount, hand);
        window.leadershipAbility.startLeadershipMode(heroPosition, stackCount);
    },
    
    // Show the initial Leadership prompt
    showLeadershipPrompt(heroPosition, level, hand) {
        // Create prompt overlay
        const promptOverlay = document.createElement('div');
        promptOverlay.className = 'leadership-prompt-overlay';
        promptOverlay.innerHTML = `
            <div class="leadership-prompt-container">
                <h3>⚔️ Leadership Ability</h3>
                <p>Shuffle up to <strong>${level}</strong> card${level > 1 ? 's' : ''} back into your deck to draw that many.</p>
                <div class="leadership-prompt-buttons">
                    <button class="btn btn-primary" onclick="window.leadershipAbility.startLeadershipMode('${heroPosition}', ${level})">
                        Continue
                    </button>
                    <button class="btn btn-secondary" onclick="window.leadershipAbility.closePrompt()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(promptOverlay);
        this.leadershipMode.overlay = promptOverlay;
    },
    
    // Close the prompt
    closePrompt() {
        if (this.leadershipMode.overlay) {
            this.leadershipMode.overlay.remove();
            this.leadershipMode.overlay = null;
        }
    },
    
    // Start Leadership selection mode
    startLeadershipMode(heroPosition, maxCards) {
        this.closePrompt();
        
        // Initialize Leadership mode state
        this.leadershipMode = {
            active: true,
            heroPosition: heroPosition,
            maxCards: maxCards,
            selectedCards: [],
            overlay: null,
            originalHandState: null
        };
        
        // Create Leadership mode UI
        this.createLeadershipModeUI();
        
        // Add click handlers to hand cards
        this.enableCardSelection();
        
        // Update UI state
        this.updateLeadershipUI();
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
                </div>
                <div class="leadership-mode-buttons">
                    <button class="btn btn-primary leadership-confirm-btn" onclick="window.leadershipAbility.confirmSelection()" disabled>
                        Confirm (0/${this.leadershipMode.maxCards})
                    </button>
                    <button class="btn btn-secondary" onclick="window.leadershipAbility.cancelLeadershipMode()">
                        Cancel
                    </button>
                </div>
                <div class="leadership-mode-hand-indicator">
                    <span class="arrow-down">↓</span>
                    <span class="instruction">Click cards below to select</span>
                    <span class="arrow-down">↓</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.leadershipMode.overlay = overlay;
        
        // Add leadership mode class to body
        document.body.classList.add('leadership-mode-active');
    },
    
    // Enable card selection in hand
    enableCardSelection() {
        const handCards = document.querySelectorAll('.hand-card');
        
        handCards.forEach((card, index) => {
            // Store original onclick
            card.dataset.originalOnclick = card.getAttribute('onclick');
            
            // Replace with leadership selection handler
            card.setAttribute('onclick', `window.leadershipAbility.toggleCardSelection(${index})`);
            
            // Add leadership mode class
            card.classList.add('leadership-selectable');
        });
    },
    
    // Toggle card selection
    toggleCardSelection(cardIndex) {
        const handCards = document.querySelectorAll('.hand-card');
        const card = handCards[cardIndex];
        
        if (!card) return;
        
        const isSelected = this.leadershipMode.selectedCards.includes(cardIndex);
        
        if (isSelected) {
            // Deselect card
            const idx = this.leadershipMode.selectedCards.indexOf(cardIndex);
            this.leadershipMode.selectedCards.splice(idx, 1);
            card.classList.remove('leadership-selected');
        } else {
            // Check if we can select more cards
            if (this.leadershipMode.selectedCards.length < this.leadershipMode.maxCards) {
                // Select card
                this.leadershipMode.selectedCards.push(cardIndex);
                card.classList.add('leadership-selected');
            }
        }
        
        // Update UI
        this.updateLeadershipUI();
    },
    
    // Update Leadership mode UI
    updateLeadershipUI() {
        const selectedCount = this.leadershipMode.selectedCards.length;
        const maxCards = this.leadershipMode.maxCards;
        
        // Update confirm button
        const confirmBtn = document.querySelector('.leadership-confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = selectedCount === 0;
            confirmBtn.textContent = `Confirm (${selectedCount}/${maxCards})`;
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
    
    // Confirm card selection
    async confirmSelection() {
        if (this.leadershipMode.selectedCards.length === 0) return;
        
        const selectedCount = this.leadershipMode.selectedCards.length;
        const heroPosition = this.leadershipMode.heroPosition;
        
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
        
        // Draw that many cards
        const drawnCards = handManager.drawCards(selectedCount);
        console.log(`Drew ${drawnCards.length} cards:`, drawnCards);
        
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
        
        // Show success message
        this.showSuccess(`Shuffled ${selectedCount} card${selectedCount > 1 ? 's' : ''} and drew ${drawnCards.length} new card${drawnCards.length > 1 ? 's' : ''}!`);
        
        // End Leadership mode
        this.endLeadershipMode();
    },
    
    // Cancel Leadership mode
    cancelLeadershipMode() {
        this.endLeadershipMode();
    },
    
    // End Leadership mode and clean up
    endLeadershipMode() {
        // Remove overlay
        if (this.leadershipMode.overlay) {
            this.leadershipMode.overlay.remove();
        }
        
        // Remove body class
        document.body.classList.remove('leadership-mode-active');
        
        // Restore hand card handlers
        const handCards = document.querySelectorAll('.hand-card');
        handCards.forEach(card => {
            // Restore original onclick
            const originalOnclick = card.dataset.originalOnclick;
            if (originalOnclick) {
                card.setAttribute('onclick', originalOnclick);
                delete card.dataset.originalOnclick;
            }
            
            // Remove leadership classes
            card.classList.remove('leadership-selectable', 'leadership-selected', 'leadership-disabled');
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

// Add CSS for Leadership mode
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
        
        /* Leadership mode overlay */
        .leadership-mode-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 900;
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
        }
        
        .leadership-mode-buttons {
            margin-bottom: 20px;
            display: flex;
            gap: 15px;
            justify-content: center;
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
        
        /* Hand card states during Leadership mode */
        body.leadership-mode-active .hand-card {
            transition: all 0.3s ease;
        }
        
        .hand-card.leadership-selectable {
            cursor: pointer !important;
            border: 2px solid transparent;
        }
        
        .hand-card.leadership-selectable:hover {
            border-color: #667eea !important;
            transform: translateY(-15px) scale(1.05) !important;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.5) !important;
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
        }
        
        .hand-card.leadership-disabled {
            opacity: 0.5 !important;
            filter: grayscale(50%) !important;
            cursor: not-allowed !important;
            transform: scale(0.95) !important;
        }
        
        .hand-card.leadership-disabled:hover {
            border-color: transparent !important;
            transform: scale(0.95) !important;
            box-shadow: none !important;
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