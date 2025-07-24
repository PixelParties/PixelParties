// handManager.js - Fixed Hand Management with Opera-Compatible Drag & Drop

export class HandManager {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.hand = []; // Array of card names in player's hand
        this.maxHandSize = 10; // Maximum cards in hand (can be adjusted)
        
        // Drag and drop state for hand reordering
        this.dragState = {
            isDragging: false,
            draggedCardIndex: -1,
            draggedCardName: null,
            draggedElement: null,
            originalHand: [] // Backup of original hand order
        };
        
        console.log('HandManager initialized with Opera-compatible drag & drop support');
    }

    // === DRAG & DROP EVENT HANDLERS - OPERA COMPATIBLE ===

    // Start dragging a hand card
    startHandCardDrag(cardIndex, cardName, draggedElement) {
        this.dragState = {
            isDragging: true,
            draggedCardIndex: cardIndex,
            draggedCardName: cardName,
            draggedElement: draggedElement,
            originalHand: [...this.hand]
        };

        // Apply visual feedback AFTER drag image is generated
        if (draggedElement) {
            draggedElement.classList.add('hand-card-dragging');
            
            // Use CSS transitions instead of direct style manipulation
            draggedElement.style.opacity = '0.6';
            draggedElement.style.transform = 'scale(0.95) rotate(5deg)';
            draggedElement.style.zIndex = '1000';
        }
        
        // Check if this is an ability card and add body class
        if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
            if (window.heroSelection.heroAbilitiesManager.isAbilityCard(cardName)) {
                document.body.classList.add('dragging-ability');
            }
        }

        console.log(`Started dragging hand card: ${cardName} from index ${cardIndex}`);
    }

    // End drag operation
    endHandCardDrag() {
        if (this.dragState.draggedElement) {
            // Remove visual feedback
            this.dragState.draggedElement.style.opacity = '';
            this.dragState.draggedElement.style.transform = '';
            this.dragState.draggedElement.style.zIndex = '';
            this.dragState.draggedElement.classList.remove('hand-card-dragging');
        }

        // Clean up any visual states
        const allHandCards = document.querySelectorAll('.hand-card');
        allHandCards.forEach(card => {
            card.classList.remove('hand-card-drag-over', 'touch-dragging');
        });
        
        // CLEAN UP ALL ABILITY TOOLTIPS when drag ends
        const allTooltips = document.querySelectorAll('.ability-drop-tooltip');
        allTooltips.forEach(tooltip => tooltip.remove());
        console.log('🔍 Cleaned up all tooltips on drag end');
        
        // Remove body class for ability dragging
        document.body.classList.remove('dragging-ability');

        this.resetDragState();
    }

    // Handle invalid drop
    handleInvalidDrop() {
        if (!this.dragState.isDragging) return;
        
        console.log(`Invalid drop, returning card to original position`);
        this.endHandCardDrag();
    }

    // === HAND ZONE DRAG & DROP HANDLERS ===

    onZoneDragEnter(event) {
        // Only handle if we're dragging a hand card
        if (this.isHandDragging()) {
            event.preventDefault();
            event.stopPropagation();
            
            const handZone = event.currentTarget;
            handZone.classList.add('hand-zone-drag-over');
            
            return false;
        }
    }

    onZoneDragOver(event) {
        // Only handle if we're dragging a hand card
        if (this.isHandDragging()) {
            event.preventDefault();
            event.stopPropagation();
            
            // Set drop effect
            event.dataTransfer.dropEffect = 'move';
            
            return false;
        }
    }

    onZoneDragLeave(event) {
        // Remove visual feedback when leaving the hand zone
        const handZone = event.currentTarget;
        const rect = handZone.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        
        // Only remove feedback if we're actually leaving the zone
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            handZone.classList.remove('hand-zone-drag-over');
        }
    }

    onZoneDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Only handle if we're dragging a hand card
        if (this.isHandDragging()) {
            const handZone = event.currentTarget;
            
            // Remove visual feedback immediately
            handZone.classList.remove('hand-zone-drag-over');
            
            // Get the drop position (cursor X coordinate)
            const dropX = event.clientX;
            
            // Handle the drop and reorder the hand
            const result = this.handleHandDrop(dropX, handZone);
            if (result.success) {
                console.log('Hand card successfully reordered');
                // Notify parent that hand changed and needs saving
                this.notifyHandChanged();
            } else {
                console.log('Hand card drop cancelled or failed');
            }
        }
        
        return false;
    }

    // Calculate insertion position based on cursor position over hand zone
    calculateInsertionPosition(dropX, handZoneElement) {
        const handCards = handZoneElement.querySelectorAll('.hand-card');
        
        if (handCards.length === 0) {
            return 0;
        }

        // Special case: if only one card and we're dragging it, return position 0
        if (handCards.length === 1 && this.dragState.isDragging) {
            return 0;
        }

        let closestIndex = 0;
        let closestDistance = Infinity;

        handCards.forEach((card, index) => {
            // Skip the currently dragged card
            if (this.dragState.isDragging && index === this.dragState.draggedCardIndex) {
                return;
            }

            const cardRect = card.getBoundingClientRect();
            const cardCenterX = cardRect.left + (cardRect.width / 2);
            const distance = Math.abs(dropX - cardCenterX);

            if (distance < closestDistance) {
                closestDistance = distance;
                
                // Determine if we should insert before or after this card
                if (dropX < cardCenterX) {
                    closestIndex = index;
                } else {
                    closestIndex = index + 1;
                }
            }
        });

        // Adjust for removed dragged card if we're dragging from this hand
        if (this.dragState.isDragging && this.dragState.draggedCardIndex < closestIndex) {
            closestIndex--;
        }

        // Clamp to valid range
        return Math.max(0, Math.min(closestIndex, this.hand.length - 1));
    }

    // Reorder hand by moving a card to a new position
    reorderHand(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.hand.length || 
            toIndex < 0 || toIndex >= this.hand.length || 
            fromIndex === toIndex) {
            return false;
        }

        // Remove card from original position
        const [movedCard] = this.hand.splice(fromIndex, 1);
        
        // Insert at new position
        this.hand.splice(toIndex, 0, movedCard);

        console.log(`Reordered hand: moved ${movedCard} from index ${fromIndex} to ${toIndex}`);
        console.log('New hand order:', this.hand);
        
        return true;
    }

    // Handle drop in hand zone
    handleHandDrop(dropX, handZoneElement) {
        if (!this.dragState.isDragging) {
            return { success: false, needsUIUpdate: false, needsSave: false };
        }

        const targetIndex = this.calculateInsertionPosition(dropX, handZoneElement);
        const originalIndex = this.dragState.draggedCardIndex;

        console.log(`Dropping card from index ${originalIndex} to index ${targetIndex}`);

        // Only reorder if position actually changed
        if (originalIndex !== targetIndex) {
            const success = this.reorderHand(originalIndex, targetIndex);
            if (success) {
                this.endHandCardDrag();
                return { success: true, needsUIUpdate: true, needsSave: true };
            }
        }

        this.endHandCardDrag();
        return { success: false, needsUIUpdate: false, needsSave: false };
    }

    // Reset drag state
    resetDragState() {
        this.dragState = {
            isDragging: false,
            draggedCardIndex: -1,
            draggedCardName: null,
            draggedElement: null,
            originalHand: []
        };
    }

    // Get current drag state
    getHandDragState() {
        return { ...this.dragState };
    }

    // Check if currently dragging a hand card
    isHandDragging() {
        return this.dragState.isDragging;
    }

    // Notify parent that hand changed and needs saving
    notifyHandChanged() {
        // Try to notify the hero selection to save the game state
        if (window.heroSelection && typeof window.heroSelection.autoSave === 'function') {
            window.heroSelection.autoSave();
        }
        
        // Update hand display
        if (window.heroSelection && typeof window.heroSelection.updateHandDisplay === 'function') {
            window.heroSelection.updateHandDisplay();
        }
    }

    // === EXISTING HAND MANAGEMENT METHODS (unchanged) ===

    // Get player's hand (returns copy to prevent external modification)
    getHand() {
        return [...this.hand];
    }

    // Get hand size
    getHandSize() {
        return this.hand.length;
    }

    // Clear the hand
    clearHand() {
        this.hand = [];
        this.resetDragState();
        console.log('Hand cleared');
    }

    // Draw random cards from deck (cards are infinite, so no removal from deck)
    drawCards(count = 1) {
        if (!this.deckManager || this.deckManager.getDeckSize() === 0) {
            console.warn('Cannot draw cards: no deck available or deck is empty');
            return [];
        }

        const deck = this.deckManager.getDeck();
        const drawnCards = [];

        for (let i = 0; i < count; i++) {
            // Stop if hand is at max capacity
            if (this.hand.length >= this.maxHandSize) {
                console.warn(`Hand is full (${this.maxHandSize} cards), cannot draw more cards`);
                break;
            }

            // Draw random card from deck (infinite, so deck doesn't change)
            const randomIndex = Math.floor(Math.random() * deck.length);
            const drawnCard = deck[randomIndex];
            
            this.hand.push(drawnCard);
            drawnCards.push(drawnCard);
        }

        console.log(`Drew ${drawnCards.length} cards:`, drawnCards);
        console.log(`Hand now contains ${this.hand.length} cards:`, this.hand);
        
        return drawnCards;
    }

    // Draw initial hand (5 cards)
    drawInitialHand() {
        this.clearHand();
        return this.drawCards(5);
    }

    // Add specific card to hand (for rewards and future functionality)
    addCardToHand(cardName) {
        if (this.hand.length >= this.maxHandSize) {
            console.warn(`Hand is full (${this.maxHandSize} cards), cannot add card`);
            return false;
        }

        if (!cardName || typeof cardName !== 'string') {
            console.error('Invalid card name provided to addCardToHand');
            return false;
        }

        this.hand.push(cardName);
        console.log(`Added ${cardName} to hand. Hand size: ${this.hand.length}`);
        return true;
    }

    // Remove card from hand (for playing cards)
    removeCardFromHand(cardName) {
        const index = this.hand.indexOf(cardName);
        if (index > -1) {
            this.hand.splice(index, 1);
            console.log(`Removed ${cardName} from hand. Hand size: ${this.hand.length}`);
            return true;
        } else {
            console.warn(`Card ${cardName} not found in hand`);
            return false;
        }
    }

    // Remove card from hand by index (for playing cards)
    removeCardFromHandByIndex(index) {
        if (index >= 0 && index < this.hand.length) {
            const removedCard = this.hand.splice(index, 1)[0];
            console.log(`Removed ${removedCard} from hand at index ${index}. Hand size: ${this.hand.length}`);
            return removedCard;
        } else {
            console.warn(`Invalid hand index: ${index}`);
            return null;
        }
    }

    // Check if hand contains a specific card
    hasCard(cardName) {
        return this.hand.includes(cardName);
    }

    // Get card count for specific card name
    getCardCount(cardName) {
        return this.hand.filter(card => card === cardName).length;
    }

    // Check if hand is full
    isHandFull() {
        return this.hand.length >= this.maxHandSize;
    }

    // Check if hand is empty
    isHandEmpty() {
        return this.hand.length === 0;
    }

    // Set maximum hand size
    setMaxHandSize(size) {
        this.maxHandSize = Math.max(1, size);
        console.log(`Max hand size set to: ${this.maxHandSize}`);
    }

    // Create hand display HTML with integrated drag & drop support
    createHandDisplay(formatCardNameFunction, goldManager = null) {
        const handContent = this.createHandContent(formatCardNameFunction);
        const goldDisplay = goldManager ? this.createGoldDisplay(goldManager) : '';
        
        return `
            <div class="hand-display-container">
                ${handContent}
                ${goldDisplay}
            </div>
        `;
    }

    // Create hand content (cards) with Opera-compatible event handlers
    createHandContent(formatCardNameFunction) {
        if (this.hand.length === 0) {
            return `
                <div class="hand-container empty">
                    <div class="hand-placeholder">
                        <div class="hand-icon">🃏</div>
                        <div>No cards in hand</div>
                    </div>
                </div>
            `;
        }

        let handHTML = `
            <div class="hand-container">
                <div class="hand-cards" 
                    data-card-count="${this.hand.length}"
                    ondragover="onHandZoneDragOver(event)"
                    ondrop="onHandZoneDrop(event)"
                    ondragleave="onHandZoneDragLeave(event)"
                    ondragenter="onHandZoneDragEnter(event)">
        `;

        this.hand.forEach((cardName, index) => {
            const cardPath = `./Cards/All/${cardName}.png`;
            const cardDisplayName = formatCardNameFunction ? formatCardNameFunction(cardName) : cardName;
            
            // Get card info to check if it requires an action
            const cardInfo = window.heroSelection?.getCardInfo ? 
                window.heroSelection.getCardInfo(cardName) : null;
            const requiresAction = cardInfo && cardInfo.action;
            const hasActions = window.heroSelection?.actionManager?.hasActions() || false;
            
            // Check if this is an ability card
            const isAbilityCard = window.heroSelection?.heroAbilitiesManager?.isAbilityCard(cardName) || false;
            
            // Check if this is a spell card
            const isSpellCard = window.heroSelection?.heroSpellbookManager?.isSpellCard(cardName) || false;
            
            // Determine if card can be played
            const canPlay = !requiresAction || hasActions;
            
            const cardData = {
                imagePath: cardPath,
                displayName: cardDisplayName,
                cardType: 'hand',
                handIndex: index,
                requiresAction: requiresAction,
                canPlay: canPlay
            };
            const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');

            let cardClasses = 'hand-card';
            if (isAbilityCard) cardClasses += ' ability-card';
            if (isSpellCard) cardClasses += ' spell-card';
            if (!canPlay) cardClasses += ' no-actions-available';

            handHTML += `
                <div class="${cardClasses}" 
                    data-card-index="${index}" 
                    data-card-name="${cardName}"
                    data-card-type="${isAbilityCard ? 'ability' : (isSpellCard ? 'spell' : 'other')}"
                    data-requires-action="${requiresAction}"
                    data-can-play="${canPlay}"
                    draggable="${canPlay ? 'true' : 'false'}"
                    ondragstart="${canPlay ? `onHandCardDragStart(event, ${index}, '${cardName}')` : 'return false;'}"
                    ondragend="onHandCardDragEnd(event)"
                    onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                    onmouseleave="window.hideCardTooltip()">
                    <img src="${cardPath}" 
                        alt="${cardDisplayName}" 
                        class="hand-card-image"
                        onerror="this.src='./Cards/placeholder.png'">
                    ${requiresAction ? '<div class="action-indicator">⚡</div>' : ''}
                </div>
            `;
        });

        handHTML += `
                    </div>
                </div>
            `;

        return handHTML;
    }

    // Create gold display HTML
    createGoldDisplay(goldManager) {
        const playerGold = goldManager.getPlayerGold();
        const opponentGold = goldManager.getOpponentGold();
        
        return `
            <div class="gold-display-wrapper">
                <div class="gold-display-inline">
                    <div class="gold-item player-gold-display">
                        <div class="gold-label">Your Gold</div>
                        <div class="gold-amount">
                            <span class="gold-icon">🪙</span>
                            <span class="player-gold-number">${playerGold}</span>
                        </div>
                    </div>
                    
                    <div class="gold-item opponent-gold-display">
                        <div class="gold-label">Opponent Gold</div>
                        <div class="gold-amount">
                            <span class="gold-icon">🪙</span>
                            <span class="opponent-gold-number">${opponentGold}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Get hand statistics
    getHandStats() {
        return {
            totalCards: this.hand.length,
            maxCards: this.maxHandSize,
            uniqueCards: new Set(this.hand).size,
            duplicates: this.hand.length - new Set(this.hand).size,
            cardCounts: this.hand.reduce((counts, card) => {
                counts[card] = (counts[card] || 0) + 1;
                return counts;
            }, {}),
            remainingSpace: this.maxHandSize - this.hand.length,
            overlapLevel: this.getOverlapLevel(),
            isDragging: this.dragState.isDragging
        };
    }

    // Calculate overlap level based on hand size
    getOverlapLevel() {
        if (this.hand.length <= 5) return 'none';
        if (this.hand.length === 6) return 'light';
        if (this.hand.length === 7) return 'moderate';
        if (this.hand.length === 8) return 'heavy';
        if (this.hand.length >= 9) return 'maximum';
        return 'none';
    }

    // Get overlap description for UI feedback
    getOverlapDescription() {
        const level = this.getOverlapLevel();
        const descriptions = {
            'none': 'Cards displayed with normal spacing',
            'light': 'Cards slightly overlapped',
            'moderate': 'Cards moderately overlapped',
            'heavy': 'Cards heavily overlapped',
            'maximum': 'Cards at maximum overlap'
        };
        return descriptions[level] || 'Normal spacing';
    }

    // Shuffle hand
    shuffleHand() {
        for (let i = this.hand.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.hand[i], this.hand[j]] = [this.hand[j], this.hand[i]];
        }
        console.log('Hand shuffled');
        return this.getHand();
    }

    // Export hand data (for saving/syncing)
    exportHand() {
        return {
            cards: [...this.hand],
            size: this.hand.length,
            maxSize: this.maxHandSize,
            overlapLevel: this.getOverlapLevel(),
            timestamp: Date.now()
        };
    }

    // Import hand data (for loading/syncing)
    importHand(handData) {
        if (!handData || !Array.isArray(handData.cards)) {
            console.error('Invalid hand data provided');
            return false;
        }

        this.hand = [...handData.cards];
        if (handData.maxSize) {
            this.maxHandSize = handData.maxSize;
        }
        this.resetDragState(); // Reset any drag state when importing
        console.log(`Imported hand with ${this.hand.length} cards:`, this.hand);
        console.log(`Overlap level: ${this.getOverlapLevel()}`);
        return true;
    }

    // Reset hand to initial state
    reset() {
        this.hand = [];
        this.maxHandSize = 10;
        this.resetDragState();
        console.log('HandManager reset');
    }

    // Log current hand state (for debugging)
    logHandState() {
        console.log('=== ENHANCED HAND STATE ===');
        console.log('Cards:', this.hand);
        console.log('Size:', this.hand.length);
        console.log('Max Size:', this.maxHandSize);
        console.log('Overlap Level:', this.getOverlapLevel());
        console.log('Overlap Description:', this.getOverlapDescription());
        console.log('Drag State:', this.dragState);
        console.log('Stats:', this.getHandStats());
        console.log('==========================');
    }
}

// Global hand card drag functions (matching hero drag pattern)
function onHandCardDragStart(event, cardIndex, cardName) {
    if (window.handManager && window.heroSelection) {
        // Get card info
        const cardInfo = window.heroSelection.getCardInfo ? 
            window.heroSelection.getCardInfo(cardName) : null;
        
        // Check if player can play action card
        if (window.heroSelection.actionManager) {
            const actionCheck = window.heroSelection.actionManager.canPlayActionCard(cardInfo);
            
            if (!actionCheck.canPlay) {
                event.preventDefault();
                window.showActionError(actionCheck.reason, event);
                return false;
            }
        }

        const draggedElement = event.target.closest('.hand-card');
        
        if (!draggedElement) {
            console.error('No valid hand card element found for drag start');
            event.preventDefault();
            return false;
        }
        
        // Browser detection for different drag image strategies
        const isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
        const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        const isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1 && !isOpera;
        const isSafari = navigator.userAgent.toLowerCase().indexOf('safari') > -1 && !isChrome && !isOpera;
        
        // Set dataTransfer FIRST (before any visual modifications)
        try {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.dropEffect = 'move';
            
            // Set drag data
            event.dataTransfer.setData('application/x-hand-drag', JSON.stringify({
                cardIndex: cardIndex,
                cardName: cardName
            }));
            event.dataTransfer.setData('text/plain', cardName);
            
            // Browser-specific drag image handling
            if (isOpera) {
                // Opera needs explicit drag image
                setupOperaDragImage(event, draggedElement);
            } else if (isFirefox) {
                // Firefox works better with smaller, properly sized drag images
                setupFirefoxDragImage(event, draggedElement);
            } else {
                // Chrome, Safari, and others usually work fine with default
                // But we can still provide a smaller custom image if needed
                setupDefaultDragImage(event, draggedElement);
            }
            
            console.log(`Drag started for ${cardName} from index ${cardIndex} (Browser: ${getBrowserName()})`);
        } catch (error) {
            console.error('Error setting up drag:', error);
            // Don't prevent default on error - let browser handle it
        }
        
        // DELAY visual modifications to not interfere with ghost image generation
        setTimeout(() => {
            window.handManager.startHandCardDrag(cardIndex, cardName, draggedElement);
        }, 0);
    }
}

// Opera-specific drag image setup
function setupOperaDragImage(event, draggedElement) {
    const cardImage = draggedElement.querySelector('.hand-card-image');
    if (cardImage && cardImage.complete) {
        // Use the card image as drag image with proper sizing
        event.dataTransfer.setDragImage(cardImage, cardImage.offsetWidth / 2, cardImage.offsetHeight / 2);
    } else {
        // Fallback: create a custom drag image
        const canvas = createCustomDragImage(draggedElement);
        if (canvas) {
            event.dataTransfer.setDragImage(canvas, canvas.width / 2, canvas.height / 2);
        }
    }
}

// Firefox-specific drag image setup
function setupFirefoxDragImage(event, draggedElement) {
    // Firefox handles drag images differently - create a smaller, optimized version
    const canvas = createOptimizedDragImage(draggedElement);
    if (canvas) {
        // Use smaller offsets for Firefox
        event.dataTransfer.setDragImage(canvas, canvas.width / 2, canvas.height / 2);
    }
    // If canvas creation fails, let Firefox use its default
}

// Default drag image setup for Chrome, Safari, etc.
function setupDefaultDragImage(event, draggedElement) {
    // Most browsers work fine with default behavior
    // Only set custom drag image if there are issues
    const cardImage = draggedElement.querySelector('.hand-card-image');
    if (cardImage && cardImage.complete) {
        // Use actual rendered dimensions, not natural dimensions
        const rect = cardImage.getBoundingClientRect();
        event.dataTransfer.setDragImage(cardImage, rect.width / 2, rect.height / 2);
    }
}

// Get browser name for logging
function getBrowserName() {
    if ((!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) return 'Opera';
    if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) return 'Firefox';
    if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) return 'Chrome';
    if (navigator.userAgent.toLowerCase().indexOf('safari') > -1) return 'Safari';
    return 'Unknown';
}

// Create custom drag image for better Opera compatibility
function createCustomDragImage(cardElement) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use fixed size based on actual card dimensions in CSS
        canvas.width = 150;  // Match hand-card-image width from CSS
        canvas.height = 210; // Match hand-card-image height from CSS
        
        // Draw card background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw border
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Try to draw the card image if available
        const cardImage = cardElement.querySelector('.hand-card-image');
        if (cardImage && cardImage.complete && cardImage.naturalWidth > 0) {
            try {
                ctx.drawImage(cardImage, 5, 5, canvas.width - 10, canvas.height * 0.8 - 10);
            } catch (imgError) {
                console.warn('Could not draw card image to canvas:', imgError);
            }
        }
        
        // Draw card name
        const cardName = cardElement.querySelector('.hand-card-name');
        if (cardName) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(cardName.textContent, canvas.width / 2, canvas.height - 15);
        }
        
        return canvas;
    } catch (error) {
        console.error('Error creating custom drag image:', error);
        return null;
    }
}

// Create optimized drag image specifically for Firefox
function createOptimizedDragImage(cardElement) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use smaller, fixed dimensions for Firefox to prevent scaling issues
        canvas.width = 120;   // Smaller than default
        canvas.height = 168;  // Maintain aspect ratio
        
        // Set higher DPI for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width *= dpr;
        canvas.height *= dpr;
        ctx.scale(dpr, dpr);
        
        // Reset dimensions for CSS
        canvas.style.width = '120px';
        canvas.style.height = '168px';
        
        // Draw card background with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 168);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(1, 'rgba(248, 249, 250, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 120, 168);
        
        // Draw border
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 118, 166);
        
        // Try to draw the card image
        const cardImage = cardElement.querySelector('.hand-card-image');
        if (cardImage && cardImage.complete && cardImage.naturalWidth > 0) {
            try {
                ctx.drawImage(cardImage, 3, 3, 114, 134);
            } catch (imgError) {
                console.warn('Could not draw card image to canvas:', imgError);
                // Draw placeholder
                ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
                ctx.fillRect(3, 3, 114, 134);
                ctx.fillStyle = '#666';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Card', 60, 70);
            }
        }
        
        // Draw card name with better typography
        const cardName = cardElement.querySelector('.hand-card-name');
        if (cardName) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            
            // Truncate long names
            let text = cardName.textContent;
            if (text.length > 12) {
                text = text.substring(0, 12) + '...';
            }
            
            ctx.fillText(text, 60, 155);
        }
        
        return canvas;
    } catch (error) {
        console.error('Error creating optimized drag image:', error);
        return null;
    }
}

function onHandCardDragEnd(event) {
    if (window.handManager) {
        window.handManager.endHandCardDrag();
        console.log('Hand card drag ended');
    }
}

function onHandZoneDragEnter(event) {
    if (window.handManager) {
        window.handManager.onZoneDragEnter(event);
    }
}

function onHandZoneDragOver(event) {
    if (window.handManager) {
        return window.handManager.onZoneDragOver(event);
    }
}

function onHandZoneDragLeave(event) {
    if (window.handManager) {
        window.handManager.onZoneDragLeave(event);
    }
}

function onHandZoneDrop(event) {
    if (window.handManager) {
        return window.handManager.onZoneDrop(event);
    }
}

const actionIndicatorStyle = document.createElement('style');
actionIndicatorStyle.textContent = `
    .hand-card {
        position: relative;
    }
    
    .hand-card .action-indicator {
        position: absolute;
        top: 5px;
        right: 5px;
        font-size: 18px;
        color: #ffd700;
        text-shadow: 
            0 0 5px rgba(255, 215, 0, 0.8),
            0 0 10px rgba(255, 140, 0, 0.6);
        z-index: 10;
        animation: actionPulse 2s ease-in-out infinite;
    }
    
    .hand-card.no-actions-available {
        opacity: 0.6;
        filter: grayscale(30%);
        cursor: not-allowed;
    }
    
    .hand-card.no-actions-available::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, 
            rgba(244, 67, 54, 0.1) 0%, 
            rgba(244, 67, 54, 0.2) 100%);
        pointer-events: none;
        border-radius: 8px;
    }
    
    .hand-card.no-actions-available:hover::before {
        content: "No Actions!";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(244, 67, 54, 0.95);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: bold;
        font-size: 14px;
        z-index: 100;
        white-space: nowrap;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
        animation: noActionsPulse 0.3s ease-out;
    }
    
    @keyframes noActionsPulse {
        from {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
        }
        to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }
`;

// Attach global functions to window for cross-module access
if (typeof window !== 'undefined') {
    window.onHandCardDragStart = onHandCardDragStart;
    window.onHandCardDragEnd = onHandCardDragEnd;
    window.onHandZoneDragEnter = onHandZoneDragEnter;
    window.onHandZoneDragOver = onHandZoneDragOver;
    window.onHandZoneDragLeave = onHandZoneDragLeave;
    window.onHandZoneDrop = onHandZoneDrop;
    
    console.log('Opera-compatible hand card drag functions attached to window');
}
