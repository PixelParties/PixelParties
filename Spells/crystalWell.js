// crystalWell.js - Crystal Well Area Spell Implementation

export const crystalWellManager = {
    // State - if storedCard is not null, CrystalWell has been used this turn
    storedCard: null,
    
    // Mode state (similar to Leadership)
    crystalWellMode: {
        active: false,
        overlay: null
    },
    
    // Check if CrystalWell can be used this turn
    canUseCrystalWell() {
        return this.storedCard === null;
    },
    
    // Reset for new turn
    resetForNewTurn() {
        this.storedCard = null;
        console.log('CrystalWell: Reset for new turn');
        
        // Update any visible indicators
        this.updateAreaIndicators();
    },
    
    // Reset when new CrystalWell is placed
    resetForNewCrystalWell() {
        this.storedCard = null;
        console.log('CrystalWell: Reset for new CrystalWell placement');
        
        // Update indicators
        this.updateAreaIndicators();
    },
    
    // Initialize the system
    init() {
        this.setupAreaClickListeners();
        console.log('CrystalWell: System initialized');
    },
    
    // Setup area card click detection
    setupAreaClickListeners() {
        // Use MutationObserver to detect when area cards are added/changed
        const observer = new MutationObserver(() => {
            this.attachClickHandlers();
        });
        
        observer.observe(document.body, { 
            childList: true, 
            subtree: true, 
            attributes: true,
            attributeFilter: ['data-area-card']
        });
        
        // Initial setup
        setTimeout(() => this.attachClickHandlers(), 100);
    },
    
    // Attach click handlers to CrystalWell area cards
    attachClickHandlers() {
        const crystalWellCards = document.querySelectorAll('[data-area-card="CrystalWell"]');
        
        crystalWellCards.forEach(areaCard => {
            // Only attach if not already attached
            if (!areaCard.dataset.crystalWellHandlerAttached) {
                areaCard.dataset.crystalWellHandlerAttached = 'true';
                
                areaCard.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.handleAreaClick();
                });
                
                // Add visual indicator
                this.addAreaIndicator(areaCard);
                
                console.log('CrystalWell: Click handler attached to area card');
            }
        });
    },
    
    // Add visual indicator to show CrystalWell status
    addAreaIndicator(areaCard) {
        // Remove existing indicator
        const existingIndicator = areaCard.querySelector('.crystal-well-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.className = 'crystal-well-indicator';
        indicator.innerHTML = this.canUseCrystalWell() ? '💎' : '❌';
        indicator.title = this.canUseCrystalWell() ? 'Click to activate Crystal Well' : 'Crystal Well already used this turn';
        
        indicator.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            font-size: 20px;
            pointer-events: none;
            z-index: 15;
            filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.8));
        `;
        
        // Ensure parent has relative positioning
        areaCard.style.position = 'relative';
        areaCard.appendChild(indicator);
    },
    
    // Update all area indicators
    updateAreaIndicators() {
        const crystalWellCards = document.querySelectorAll('[data-area-card="CrystalWell"]');
        crystalWellCards.forEach(areaCard => {
            this.addAreaIndicator(areaCard);
        });
    },
    
    // Handle area card click
    async handleAreaClick() {
        console.log('CrystalWell: Area card clicked');
        
        // Check if can use
        if (!this.canUseCrystalWell()) {
            this.showError("Crystal Well has already been used this turn!");
            return;
        }
        
        // Check if hand has cards
        const handManager = window.heroSelection?.handManager;
        if (!handManager) {
            this.showError("Cannot access hand!");
            return;
        }
        
        const hand = handManager.getHand();
        if (!hand || hand.length === 0) {
            this.showError("You have no cards in hand!");
            return;
        }
        
        // Start CrystalWell mode
        this.startCrystalWellMode();
    },
    
    // Start CrystalWell mode (similar to Leadership mode)
    startCrystalWellMode() {
        console.log('CrystalWell: Starting CrystalWell mode');
        
        this.crystalWellMode.active = true;
        
        // Create UI overlay
        this.createCrystalWellUI();
        
        // Enable card selection
        this.enableCardSelection();
    },
    
    // Create the CrystalWell mode UI overlay
    createCrystalWellUI() {
        const magicArtsBonus = this.checkMagicArtsBonus();
        
        const overlay = document.createElement('div');
        overlay.className = 'crystal-well-mode-overlay';
        overlay.innerHTML = `
            <div class="crystal-well-mode-container">
                <div class="crystal-well-mode-header">
                    <h3>Crystal Well Activation</h3>
                    <p>Select a card to discard and draw a new one.</p>
                    ${magicArtsBonus ? 
                        '<p class="magic-arts-bonus-info">💎 <strong>Bonus:</strong> You will draw +1 extra card (MagicArts 3+)!</p>' : 
                        '<p class="magic-arts-info">💡 MagicArts 3+ would give +1 extra card</p>'
                    }
                </div>
                <div class="crystal-well-mode-buttons">
                    <button class="btn btn-secondary" onclick="window.crystalWellManager.cancelCrystalWellMode()">
                        Cancel
                    </button>
                </div>
                <div class="crystal-well-mode-hand-indicator">
                    <span class="arrow-down">⬇</span>
                    <span class="instruction">Click a card below to discard it</span>
                    <span class="arrow-down">⬇</span>
                </div>
                <div class="crystal-well-draw-preview">
                    <span class="draw-preview-text">Will draw: <span class="draw-count">${magicArtsBonus ? 2 : 1}</span> card${magicArtsBonus ? 's' : ''}</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.crystalWellMode.overlay = overlay;
        
        // Add mode class to body
        document.body.classList.add('crystal-well-mode-active');
    },
    
    // Enable card selection in hand
    enableCardSelection() {
        setTimeout(() => {
            const handCards = document.querySelectorAll('.hand-card');
            console.log(`CrystalWell: Found ${handCards.length} hand cards for selection`);
            
            if (handCards.length === 0) {
                console.warn('CrystalWell: No hand cards found');
                return;
            }
            
            handCards.forEach((card, index) => {
                try {
                    // Store original attributes
                    card.dataset.originalOnclick = card.getAttribute('onclick') || '';
                    card.dataset.originalCursor = card.style.cursor || '';
                    card.dataset.originalPointerEvents = card.style.pointerEvents || '';
                    
                    // Override for CrystalWell selection
                    card.style.pointerEvents = 'auto';
                    card.style.cursor = 'pointer';
                    card.setAttribute('onclick', `window.crystalWellManager.selectCard(${index})`);
                    
                    // Add selection class
                    card.classList.add('crystal-well-selectable');
                    
                    console.log(`CrystalWell: Enabled card ${index} for selection`);
                } catch (error) {
                    console.error(`CrystalWell: Failed to enable card ${index}:`, error);
                }
            });
        }, 100);
    },
    
    // Select card for discard
    async selectCard(cardIndex) {
        console.log(`CrystalWell: Card ${cardIndex} selected for discard`);
        
        const handManager = window.heroSelection?.handManager;
        if (!handManager) {
            this.showError("Cannot access hand!");
            return;
        }
        
        const hand = handManager.getHand();
        if (cardIndex < 0 || cardIndex >= hand.length) {
            this.showError("Invalid card selection!");
            return;
        }
        
        const cardName = hand[cardIndex];
        
        // Store the discarded card (this marks CrystalWell as used)
        this.storedCard = cardName;
        
        // Sync state with area card
        this.syncStateWithAreaCard();
        
        // Remove card from hand
        handManager.removeCardFromHandByIndex(cardIndex);
        
        // Add to graveyard
        if (window.heroSelection?.graveyardManager) {
            window.heroSelection.graveyardManager.addCard(cardName);
        }
        
        // Calculate total draws (1 base + MagicArts bonus)
        const baseDraws = 1;
        const magicArtsBonus = this.checkMagicArtsBonus();
        const bonusDraws = magicArtsBonus ? 1 : 0;
        const totalDraws = baseDraws + bonusDraws;
        
        // Draw cards
        const drawnCards = handManager.drawCards(totalDraws);
        
        console.log(`CrystalWell: Discarded ${cardName}, drew ${drawnCards.length} cards`);
        
        // Show success message
        let successMessage = `Discarded ${this.formatCardName(cardName)} and drew ${totalDraws} card${totalDraws > 1 ? 's' : ''}!`;
        if (bonusDraws > 0) {
            successMessage += ` (Including MagicArts bonus!)`;
        }
        this.showSuccess(successMessage);
        
        // Update displays
        if (window.heroSelection?.updateHandDisplay) {
            window.heroSelection.updateHandDisplay();
        }
        
        // Update area indicators
        this.updateAreaIndicators();
        
        // Save game state
        if (window.heroSelection?.saveGameState) {
            await window.heroSelection.saveGameState();
        }
        
        // End CrystalWell mode
        this.endCrystalWellMode();
    },
    
    // Check for MagicArts 3+ bonus
    checkMagicArtsBonus() {
        if (!window.heroSelection?.heroAbilitiesManager) {
            return false;
        }
        
        const abilitiesManager = window.heroSelection.heroAbilitiesManager;
        
        // Check all hero positions for MagicArts 3+
        for (const position of ['left', 'center', 'right']) {
            const magicArtsLevel = abilitiesManager.getAbilityStackCountForPosition(position, 'MagicArts');
            if (magicArtsLevel >= 3) {
                console.log(`CrystalWell: Found MagicArts ${magicArtsLevel} at ${position} - bonus draw enabled`);
                return true;
            }
        }
        
        return false;
    },
    
    // End CrystalWell mode
    endCrystalWellMode() {
        console.log('CrystalWell: Ending CrystalWell mode');
        
        // Remove overlay
        if (this.crystalWellMode.overlay) {
            this.crystalWellMode.overlay.remove();
        }
        
        // Remove body class
        document.body.classList.remove('crystal-well-mode-active');
        
        // Restore hand card handlers
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
                
                // Remove CrystalWell classes
                card.classList.remove('crystal-well-selectable');
                
                console.log(`CrystalWell: Restored card ${index}`);
            } catch (error) {
                console.error(`CrystalWell: Failed to restore card ${index}:`, error);
            }
        });
        
        // Reset mode state
        this.crystalWellMode = {
            active: false,
            overlay: null
        };
    },
    
    // Cancel CrystalWell mode
    cancelCrystalWellMode() {
        console.log('CrystalWell: Mode cancelled by user');
        this.endCrystalWellMode();
    },
    
    // Sync stored card state with area card object (for battle manager access)
    syncStateWithAreaCard() {
        const crystalWellCards = document.querySelectorAll('[data-area-card="CrystalWell"]');
        crystalWellCards.forEach(areaCard => {
            if (areaCard.areaCardData) {
                areaCard.areaCardData.storedCard = this.storedCard;
            }
        });
        
        // Also sync with heroSelection area handler if available
        if (window.heroSelection?.areaHandler?.areaCard?.name === 'CrystalWell') {
            window.heroSelection.areaHandler.areaCard.storedCard = this.storedCard;
        }
    },
    
    // Get stored card for exchange (called by battle manager)
    getStoredCardForExchange() {
        return this.storedCard;
    },
    
    // Clear stored card after exchange (called by battle manager)
    clearStoredCardAfterExchange() {
        this.storedCard = null;
        this.syncStateWithAreaCard();
        this.updateAreaIndicators();
        console.log('CrystalWell: Stored card cleared after battle exchange');
    },
    
    // Handle end-of-battle card exchange (called by battle manager)
    handleEndOfBattleExchange(battleManager) {
        if (!battleManager.isAuthoritative) return;
        
        let playerStoredCard = null;
        let opponentStoredCard = null;
        
        // Get player's stored card (host's perspective)
        if (battleManager.playerAreaCard?.name === 'CrystalWell' && battleManager.playerAreaCard.storedCard) {
            playerStoredCard = battleManager.playerAreaCard.storedCard;
        }
        
        // Get opponent's stored card (host's perspective)  
        if (battleManager.opponentAreaCard?.name === 'CrystalWell' && battleManager.opponentAreaCard.storedCard) {
            opponentStoredCard = battleManager.opponentAreaCard.storedCard;
        }
        
        let exchangesPerformed = 0;
        
        // Player gives their stored card to opponent
        if (playerStoredCard) {
            const opponentDeck = battleManager.getDeckBySide('opponent');
            const newOpponentDeck = [...opponentDeck, playerStoredCard];
            battleManager.updateDeckDuringBattle('opponent', newOpponentDeck);
            
            battleManager.addCombatLog(
                `💎 Your CrystalWell card (${this.formatCardName(playerStoredCard)}) was added to opponent's deck!`, 
                'info'
            );
            
            // Clear player's stored card
            battleManager.playerAreaCard.storedCard = null;
            if (this.storedCard === playerStoredCard) {
                this.clearStoredCardAfterExchange();
            }
            
            exchangesPerformed++;
        }
        
        // Opponent gives their stored card to player
        if (opponentStoredCard) {
            const playerDeck = battleManager.getDeckBySide('player');
            const newPlayerDeck = [...playerDeck, opponentStoredCard];
            battleManager.updateDeckDuringBattle('player', newPlayerDeck);
            
            battleManager.addCombatLog(
                `💎 Opponent's CrystalWell card (${this.formatCardName(opponentStoredCard)}) was added to your deck!`, 
                'success'
            );
            
            // Show pop-up for receiving opponent's card
            setTimeout(() => {
                this.showCrystalWellExchange(opponentStoredCard);
            }, 1000); // Delay to avoid conflicting with battle end animations
            
            // Clear opponent's stored card
            battleManager.opponentAreaCard.storedCard = null;
            exchangesPerformed++;
        }
        
        // Send exchange update to guest
        if (exchangesPerformed > 0) {
            this.sendCrystalWellExchange(battleManager, playerStoredCard, opponentStoredCard);
            
            battleManager.addCombatLog(
                `💎 CrystalWell exchange complete: ${exchangesPerformed} card${exchangesPerformed > 1 ? 's' : ''} exchanged!`, 
                'info'
            );
        }
        
        return exchangesPerformed;
    },
    
    // Send crystal well exchange to guest
    sendCrystalWellExchange(battleManager, playerStoredCard, opponentStoredCard) {
        battleManager.sendBattleUpdate('crystal_well_exchange', {
            playerStoredCard: playerStoredCard,
            opponentStoredCard: opponentStoredCard,
            timestamp: Date.now()
        });
    },
    
    // Handle crystal well exchange on guest side
    handleGuestCrystalWellExchange(data, battleManager) {
        const { playerStoredCard, opponentStoredCard } = data;
        
        // Determine which card the guest receives (opposite of what host receives)
        const receivedCard = battleManager.isHost ? opponentStoredCard : playerStoredCard;
        
        if (opponentStoredCard) {
            battleManager.addCombatLog(
                `💎 Your CrystalWell card (${this.formatCardName(opponentStoredCard)}) was added to opponent's deck!`, 
                'info'
            );
        }
        
        if (playerStoredCard) {
            battleManager.addCombatLog(
                `💎 Opponent's CrystalWell card (${this.formatCardName(playerStoredCard)}) was added to your deck!`, 
                'success'
            );
        }
        
        // Show pop-up if guest received a card
        if (receivedCard) {
            setTimeout(() => {
                this.showCrystalWellExchange(receivedCard);
            }, 1000); // Delay to avoid conflicting with battle end animations
        }
        
        // Clear local stored card if it matches what was exchanged
        const myStoredCard = battleManager.isHost ? playerStoredCard : opponentStoredCard;
        if (myStoredCard && this.storedCard === myStoredCard) {
            this.clearStoredCardAfterExchange();
        }
    },
    
    // Show Crystal Well exchange notification
    showCrystalWellExchange(cardName) {
        const exchangeDiv = document.createElement('div');
        exchangeDiv.className = 'crystal-well-exchange-popup';
        exchangeDiv.innerHTML = `
            <div class="crystal-well-exchange-content">
                <div class="crystal-well-exchange-icon">💎</div>
                <div class="crystal-well-exchange-message">
                    Your opponent threw a card into their Crystal Well and it ended up in your deck!
                </div>
                <div class="crystal-well-exchange-card">
                    Received: <strong>${this.formatCardName(cardName)}</strong>
                </div>
            </div>
        `;
        
        exchangeDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(106, 90, 205, 0.95) 0%, rgba(123, 104, 238, 0.95) 100%);
            color: white;
            padding: 25px 35px;
            border-radius: 15px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            animation: crystalWellExchangeAppear 0.6s ease-out;
            max-width: 400px;
            text-align: center;
        `;
        
        document.body.appendChild(exchangeDiv);
        
        setTimeout(() => {
            exchangeDiv.style.animation = 'crystalWellExchangeFade 0.4s ease-out forwards';
            setTimeout(() => exchangeDiv.remove(), 400);
        }, 3500);
    },
    
    // Export state for persistence
    exportState() {
        return {
            storedCard: this.storedCard
        };
    },
    
    // Import state for persistence
    importState(state) {
        if (!state) return false;
        
        if (state.storedCard !== undefined) {
            this.storedCard = state.storedCard;
            console.log(`CrystalWell: Imported state - storedCard: ${this.storedCard}`);
            
            // Update indicators after import
            setTimeout(() => this.updateAreaIndicators(), 100);
            
            return true;
        }
        
        return false;
    },
    
    // Reset all state
    reset() {
        this.storedCard = null;
        
        if (this.crystalWellMode.active) {
            this.endCrystalWellMode();
        }
        
        console.log('CrystalWell: System reset');
    },
    
    // Utility methods
    formatCardName(cardName) {
        if (!cardName || typeof cardName !== 'string') {
            return cardName;
        }
        return cardName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    },
    
    // Show error message
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'crystal-well-error-popup';
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
            animation: crystalWellErrorShake 0.5s ease-out;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'crystalWellErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2000);
    },
    
    // Show success message
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'crystal-well-success-popup';
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
            animation: crystalWellSuccessPulse 0.5s ease-out;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'crystalWellSuccessFade 0.3s ease-out forwards';
            setTimeout(() => successDiv.remove(), 300);
        }, 2500);
    }
};

// Make the manager available globally
if (typeof window !== 'undefined') {
    window.crystalWellManager = crystalWellManager;
}

// CSS for CrystalWell mode
if (typeof document !== 'undefined' && !document.getElementById('crystalWellStyles')) {
    const style = document.createElement('style');
    style.id = 'crystalWellStyles';
    style.textContent = `
        /* CrystalWell mode overlay */
        .crystal-well-mode-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1500;
            padding: 20px;
            animation: slideDown 0.3s ease-out;
        }
        
        .crystal-well-mode-container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        
        .crystal-well-mode-header {
            margin-bottom: 20px;
        }
        
        .crystal-well-mode-header h3 {
            color: white;
            font-size: 28px;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        .crystal-well-mode-header p {
            color: #ddd;
            font-size: 18px;
            margin-bottom: 5px;
        }
        
        .magic-arts-bonus-info {
            color: #28a745 !important;
            font-weight: bold !important;
            font-size: 16px !important;
            text-shadow: 0 0 10px rgba(40, 167, 69, 0.5) !important;
            animation: magicArtsGlow 2s ease-in-out infinite;
        }
        
        .magic-arts-info {
            color: #6c757d !important;
            font-size: 14px !important;
        }
        
        @keyframes magicArtsGlow {
            0%, 100% { text-shadow: 0 0 10px rgba(40, 167, 69, 0.5); }
            50% { text-shadow: 0 0 15px rgba(40, 167, 69, 0.8); }
        }
        
        .crystal-well-mode-buttons {
            margin-bottom: 20px;
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        
        .crystal-well-mode-hand-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            color: #20c997;
            font-size: 18px;
            font-weight: bold;
            margin-top: 20px;
        }
        
        .arrow-down {
            font-size: 24px;
            animation: bounce 1s ease-in-out infinite;
        }
        
        .crystal-well-draw-preview {
            margin-top: 15px;
            padding: 10px 20px;
            background: rgba(32, 201, 151, 0.2);
            border: 2px solid rgba(32, 201, 151, 0.5);
            border-radius: 15px;
            display: inline-block;
        }
        
        .draw-preview-text {
            color: #20c997;
            font-size: 18px;
            font-weight: bold;
        }
        
        .draw-count {
            color: #ffffff;
            font-size: 22px;
            text-shadow: 0 0 10px rgba(32, 201, 151, 0.8);
        }
        
        /* Override hand restrictions during CrystalWell mode */
        body.crystal-well-mode-active .hand-card {
            transition: all 0.3s ease;
            pointer-events: auto !important;
        }
        
        body.crystal-well-mode-active .hand-card.no-actions-available,
        body.crystal-well-mode-active .hand-card.exclusive-hand-disabled,
        body.crystal-well-mode-active .hand-card[data-unaffordable="true"] {
            cursor: pointer !important;
            opacity: 0.7 !important;
            filter: grayscale(50%) !important;
        }
        
        .hand-card.crystal-well-selectable {
            cursor: pointer !important;
            border: 2px solid transparent;
            position: relative;
        }
        
        .hand-card.crystal-well-selectable::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 2px solid rgba(32, 201, 151, 0.3);
            border-radius: 8px;
            pointer-events: none;
            transition: all 0.2s ease;
        }
        
        .hand-card.crystal-well-selectable:hover {
            border-color: #20c997 !important;
            transform: translateY(-15px) scale(1.05) !important;
            box-shadow: 0 10px 30px rgba(32, 201, 151, 0.5) !important;
        }
        
        .hand-card.crystal-well-selectable:hover::before {
            border-color: rgba(32, 201, 151, 0.6);
            box-shadow: 0 0 15px rgba(32, 201, 151, 0.4);
        }
        
        /* Crystal Well area indicator */
        .crystal-well-indicator {
            transition: all 0.3s ease;
        }
        
        /* Crystal Well Exchange Popup Styling */
        .crystal-well-exchange-content {
            text-align: center;
        }

        .crystal-well-exchange-icon {
            font-size: 32px;
            margin-bottom: 15px;
            animation: crystalWellExchangeGlow 2s ease-in-out infinite alternate;
        }

        .crystal-well-exchange-message {
            margin-bottom: 15px;
            line-height: 1.4;
        }

        .crystal-well-exchange-card {
            font-size: 18px;
            color: #FFD700;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }

        @keyframes crystalWellExchangeGlow {
            0% { 
                filter: drop-shadow(0 0 10px rgba(106, 90, 205, 0.8));
            }
            100% { 
                filter: drop-shadow(0 0 20px rgba(123, 104, 238, 1));
            }
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
        
        @keyframes crystalWellErrorShake {
            0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
            25% { transform: translate(-50%, -50%) rotate(-3deg); }
            75% { transform: translate(-50%, -50%) rotate(3deg); }
        }
        
        @keyframes crystalWellErrorFade {
            from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
        
        @keyframes crystalWellSuccessPulse {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        
        @keyframes crystalWellSuccessFade {
            from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
        }

        @keyframes crystalWellExchangeAppear {
            0% { 
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.7) rotateY(-90deg);
            }
            50% {
                transform: translate(-50%, -50%) scale(1.05) rotateY(0deg);
            }
            100% { 
                opacity: 1;
                transform: translate(-50%, -50%) scale(1) rotateY(0deg);
            }
        }

        @keyframes crystalWellExchangeFade {
            0% { 
                opacity: 1; 
                transform: translate(-50%, -50%) scale(1);
            }
            100% { 
                opacity: 0; 
                transform: translate(-50%, -50%) scale(0.9);
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize when loaded
if (typeof window !== 'undefined') {
    // Initialize after a short delay to ensure other systems are ready
    setTimeout(() => {
        crystalWellManager.init();
    }, 500);
}