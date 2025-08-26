// handManager.js - Enhanced Hand Management with Exclusive Artifact Support and Card Disenchanting

import { artifactHandler } from './artifactHandler.js';
import { globalSpellManager } from './globalSpellManager.js';
import { potionHandler } from './potionHandler.js';
import { magicArtsRedraw } from './Abilities/magicArts.js';

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

        // ===== TEST HELPER FLAGS =====
        // Set to false to disable test functionality completely
        this.ENABLE_TEST_HELPERS = true;
        // Set to false if you only want to disable the auto-add feature
        this.AUTO_ADD_TEST_CARD = true;
        // The test card to add
        this.TEST_CARD_NAME = 'GatheringStorm';
    }

    // ===== TEST HELPER FUNCTION =====
    // This function adds a test card to the hand for testing purposes
    // Easy to remove - just delete this function and the call in drawInitialHand()
    addTestCardToHand() {
        if (!this.ENABLE_TEST_HELPERS || !this.AUTO_ADD_TEST_CARD) {
            return false;
        }

        // Check if we have room in hand
        if (this.hand.length >= this.maxHandSize) {
            console.warn('⌛ TEST: Cannot add test card - hand is full');
            return false;
        }

        // Add the test card
        const success = this.addCardToHand(this.TEST_CARD_NAME);
        if (success) {
            console.log(`🧪 TEST: Added "${this.TEST_CARD_NAME}" to hand for testing`);
            return true;
        } else {
            console.warn(`⌛ TEST: Failed to add "${this.TEST_CARD_NAME}" to hand`);
            return false;
        }
    }

    // === CARD DISENCHANTING FEATURE ===

    // Method to handle card disenchanting (right-click removal for gold)
    async disenchantCard(cardIndex, cardName, cardElement) {
        // Check if entire hand is disabled due to exclusive artifact
        if (window.artifactHandler && window.artifactHandler.isExclusiveArtifactActive()) {
            const activeExclusive = window.artifactHandler.getActiveExclusiveArtifact();
            const formattedName = this.formatCardName(activeExclusive);
            showHandDisabledError(`Hand is disabled while ${formattedName} is active`, window.event);
            return false;
        }

        // Validate inputs
        if (cardIndex < 0 || cardIndex >= this.hand.length) {
            console.warn('Invalid card index for disenchanting');
            return false;
        }

        if (this.hand[cardIndex] !== cardName) {
            console.warn('Card name mismatch during disenchanting');
            return false;
        }

        try {
            // Play dust animation before removing the card
            await this.playDisenchantAnimation(cardElement, cardName);
            
            // Remove the card from hand
            const removedCard = this.removeCardFromHandByIndex(cardIndex);
            
            if (removedCard) {
                // Award 2 gold to the player
                if (window.heroSelection && window.heroSelection.goldManager) {
                    window.heroSelection.goldManager.addPlayerGold(2, 'card_disenchant');
                }
                
                // Show success feedback
                this.showDisenchantFeedback(cardElement, cardName);
                
                // Trigger UI updates through heroSelection if available
                if (window.heroSelection) {
                    window.heroSelection.updateHandDisplay();
                    window.heroSelection.updateGoldDisplay();
                    await window.heroSelection.autoSave();
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error during card disenchanting:', error);
            return false;
        }
    }

    // Play disenchant animation on the card element
    async playDisenchantAnimation(cardElement, cardName) {
        if (!cardElement) return;
        
        return new Promise((resolve) => {
            // Create dust particle container
            const dustContainer = document.createElement('div');
            dustContainer.className = 'disenchant-dust-container';
            
            // Position relative to the card
            const rect = cardElement.getBoundingClientRect();
            dustContainer.style.cssText = `
                position: fixed;
                left: ${rect.left}px;
                top: ${rect.top}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                pointer-events: none;
                z-index: 10000;
            `;
            
            document.body.appendChild(dustContainer);
            
            // Create multiple dust particles
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.className = 'dust-particle';
                
                const angle = (i / 8) * 2 * Math.PI;
                const distance = 50 + Math.random() * 30;
                const endX = Math.cos(angle) * distance;
                const endY = Math.sin(angle) * distance;
                
                particle.style.cssText = `
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 4px;
                    height: 4px;
                    background: #FFD700;
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    animation: dustFloat 0.3s ease-out forwards;
                    --end-x: ${endX}px;
                    --end-y: ${endY}px;
                    opacity: 0.9;
                    box-shadow: 0 0 6px #FFD700;
                `;
                
                dustContainer.appendChild(particle);
            }
            
            // Fade out the card itself
            cardElement.style.transition = 'all 0.3s ease-out';
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'scale(0.8)';
            
            // Clean up after animation
            setTimeout(() => {
                dustContainer.remove();
                resolve();
            }, 300);
        });
    }

    // Show success feedback for disenchanting
    showDisenchantFeedback(cardElement, cardName) {
        if (!cardElement) return;
        
        const feedback = document.createElement('div');
        feedback.className = 'disenchant-feedback';
        feedback.innerHTML = `
            <div class="disenchant-feedback-content">
                <span class="disenchant-icon">✨</span>
                <span class="disenchant-text">+2 Gold</span>
            </div>
        `;
        
        const rect = cardElement.getBoundingClientRect();
        feedback.style.cssText = `
            position: fixed;
            left: ${rect.left + rect.width / 2}px;
            top: ${rect.top - 30}px;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #8B4513;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10001;
            pointer-events: none;
            animation: disenchantFeedback 2s ease-out;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    }

    // === ENHANCED DRAG & DROP EVENT HANDLERS ===

    // Start dragging a hand card - now with entire hand disabling approach
    startHandCardDrag(cardIndex, cardName, draggedElement) {
        // NOTE: Exclusive artifact blocking is now handled at the global function level
        // (onHandCardDragStart) before this method is even called, so we don't need
        // to check here anymore since the entire hand gets disabled.

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
        
        // Check if this is a global spell and add body class
        if (window.globalSpellManager && window.heroSelection && 
            window.globalSpellManager.isGlobalSpell(cardName, window.heroSelection)) {
            document.body.classList.add('dragging-global-spell');
        }

        return true;
    }

    // Check if the entire hand should be disabled due to exclusive artifact
    isHandDisabledByExclusive() {
        return window.artifactHandler ? window.artifactHandler.isExclusiveArtifactActive() : false;
    }

    // Get info about the active exclusive artifact
    getActiveExclusiveInfo() {
        if (!window.artifactHandler || !window.artifactHandler.isExclusiveArtifactActive()) {
            return null;
        }
        
        return {
            name: window.artifactHandler.getActiveExclusiveArtifact(),
            formattedName: this.formatCardName(window.artifactHandler.getActiveExclusiveArtifact())
        };
    }

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
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
        
        // Remove body class for ability dragging
        document.body.classList.remove('dragging-ability');
        
        // Remove body class for global spell dragging
        document.body.classList.remove('dragging-global-spell');

        this.resetDragState();
    }

    // Handle invalid drop
    handleInvalidDrop() {
        if (!this.dragState.isDragging) return;
        
        this.endHandCardDrag();
    }

    // === EXISTING HAND ZONE DRAG & DROP HANDLERS (unchanged) ===

    onZoneDragEnter(event) {
        if (this.isHandDragging()) {
            event.preventDefault();
            event.stopPropagation();
            
            const handZone = event.currentTarget;
            handZone.classList.add('hand-zone-drag-over');
            
            return false;
        }
    }

    onZoneDragOver(event) {
        if (this.isHandDragging()) {
            event.preventDefault();
            event.stopPropagation();
            
            event.dataTransfer.dropEffect = 'move';
            
            return false;
        }
    }

    onZoneDragLeave(event) {
        const handZone = event.currentTarget;
        const rect = handZone.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            handZone.classList.remove('hand-zone-drag-over');
        }
    }

    onZoneDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (this.isHandDragging()) {
            const handZone = event.currentTarget;
            
            handZone.classList.remove('hand-zone-drag-over');
            
            const dropX = event.clientX;
            
            const result = this.handleHandDrop(dropX, handZone);
            if (result.success) {
                this.notifyHandChanged();
            }
        }
        
        return false;
    }

    calculateInsertionPosition(dropX, handZoneElement) {
        const handCards = handZoneElement.querySelectorAll('.hand-card');
        
        if (handCards.length === 0) {
            return 0;
        }

        if (handCards.length === 1 && this.dragState.isDragging) {
            return 0;
        }

        let closestIndex = 0;
        let closestDistance = Infinity;

        handCards.forEach((card, index) => {
            if (this.dragState.isDragging && index === this.dragState.draggedCardIndex) {
                return;
            }

            const cardRect = card.getBoundingClientRect();
            const cardCenterX = cardRect.left + (cardRect.width / 2);
            const distance = Math.abs(dropX - cardCenterX);

            if (distance < closestDistance) {
                closestDistance = distance;
                
                if (dropX < cardCenterX) {
                    closestIndex = index;
                } else {
                    closestIndex = index + 1;
                }
            }
        });

        if (this.dragState.isDragging && this.dragState.draggedCardIndex < closestIndex) {
            closestIndex--;
        }

        return Math.max(0, Math.min(closestIndex, this.hand.length - 1));
    }

    reorderHand(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.hand.length || 
            toIndex < 0 || toIndex >= this.hand.length || 
            fromIndex === toIndex) {
            return false;
        }

        const [movedCard] = this.hand.splice(fromIndex, 1);
        this.hand.splice(toIndex, 0, movedCard);
        
        return true;
    }

    handleHandDrop(dropX, handZoneElement) {
        if (!this.dragState.isDragging) {
            return { success: false, needsUIUpdate: false, needsSave: false };
        }

        const targetIndex = this.calculateInsertionPosition(dropX, handZoneElement);
        const originalIndex = this.dragState.draggedCardIndex;

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

    resetDragState() {
        this.dragState = {
            isDragging: false,
            draggedCardIndex: -1,
            draggedCardName: null,
            draggedElement: null,
            originalHand: []
        };
    }

    getHandDragState() {
        return { ...this.dragState };
    }

    isHandDragging() {
        return this.dragState.isDragging;
    }

    notifyHandChanged() {
        if (window.heroSelection && typeof window.heroSelection.autoSave === 'function') {
            window.heroSelection.autoSave();
        }
        
        if (window.heroSelection && typeof window.heroSelection.updateHandDisplay === 'function') {
            window.heroSelection.updateHandDisplay();
        }
    }

    // === EXISTING HAND MANAGEMENT METHODS (unchanged) ===

    getHand() {
        return [...this.hand];
    }

    getHandSize() {
        return this.hand.length;
    }

    clearHand() {
        this.hand = [];
        this.resetDragState();
    }

    drawCards(count = 1) {
        if (!this.deckManager || this.deckManager.getDeckSize() === 0) {
            console.warn('Cannot draw cards: no deck available or deck is empty');
            return [];
        }

        const deck = this.deckManager.getDeck();
        const drawnCards = [];

        for (let i = 0; i < count; i++) {
            if (this.hand.length >= this.maxHandSize) {
                console.warn(`Hand is full (${this.maxHandSize} cards), cannot draw more cards`);
                break;
            }

            const randomIndex = Math.floor(Math.random() * deck.length);
            const drawnCard = deck[randomIndex];
            
            this.hand.push(drawnCard);
            drawnCards.push(drawnCard);
        }        
        return drawnCards;
    }

    // ===== MODIFIED: Add test helper call =====
    drawInitialHand() {
        this.clearHand();
        const drawnCards = this.drawCards(5);
        
        // ===== TEST HELPER: Add test card after initial hand is drawn =====
        // TO REMOVE: Simply delete this line and the addTestCardToHand() function above
        this.addTestCardToHand();
        
        return drawnCards;
    }

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
        return true;
    }

    removeCardFromHand(cardName) {
        const index = this.hand.indexOf(cardName);
        if (index > -1) {
            this.hand.splice(index, 1);
            return true;
        } else {
            console.warn(`Card ${cardName} not found in hand`);
            return false;
        }
    }

    removeCardFromHandByIndex(index) {
        if (index >= 0 && index < this.hand.length) {
            const removedCard = this.hand.splice(index, 1)[0];
            return removedCard;
        } else {
            console.warn(`Invalid hand index: ${index}`);
            return null;
        }
    }

    hasCard(cardName) {
        return this.hand.includes(cardName);
    }

    getCardCount(cardName) {
        return this.hand.filter(card => card === cardName).length;
    }

    isHandFull() {
        return this.hand.length >= this.maxHandSize;
    }

    isHandEmpty() {
        return this.hand.length === 0;
    }

    setMaxHandSize(size) {
        this.maxHandSize = Math.max(1, size);
    }

    // === ENHANCED HAND DISPLAY WITH EXCLUSIVE ARTIFACT SUPPORT ===

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

    // Enhanced hand content creation with ENTIRE HAND disabling when exclusive artifact is active
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

        // Check if ANY exclusive artifact is active - this disables the ENTIRE hand
        const isAnyExclusiveActive = window.artifactHandler ? 
            window.artifactHandler.isExclusiveArtifactActive() : false;
        const activeExclusiveArtifact = isAnyExclusiveActive ? 
            window.artifactHandler.getActiveExclusiveArtifact() : null;

        let handHTML = `
            <div class="hand-container${isAnyExclusiveActive ? ' exclusive-disabled' : ''}">
                <div class="hand-cards" 
                    data-card-count="${this.hand.length}"
                    data-exclusive-disabled="${isAnyExclusiveActive}"
                    ondragover="onHandZoneDragOver(event)"
                    ondrop="onHandZoneDrop(event)"
                    ondragleave="onHandZoneDragLeave(event)"
                    ondragenter="onHandZoneDragEnter(event)">
        `;

        // Add exclusive artifact notification bar if any is active
        if (isAnyExclusiveActive) {
            const formattedArtifactName = this.formatCardName(activeExclusiveArtifact);
            handHTML += `
                <div class="hand-exclusive-overlay">
                    <div class="hand-exclusive-message">
                        <span class="hand-exclusive-icon">🔒</span>
                        <span class="hand-exclusive-text">Hand disabled while ${formattedArtifactName} is active</span>
                    </div>
                </div>
            `;
        }

        this.hand.forEach((cardName, index) => {
            const cardPath = `./Cards/All/${cardName}.png`;
            const cardDisplayName = formatCardNameFunction ? formatCardNameFunction(cardName) : cardName;
            
            // Get card info to check various attributes
            const cardInfo = window.heroSelection?.getCardInfo ? 
                window.heroSelection.getCardInfo(cardName) : null;
            const requiresAction = cardInfo && cardInfo.action;
            const hasActions = window.heroSelection?.actionManager?.hasActions() || false;
            
            // Check if this is an ability card
            const isAbilityCard = window.heroSelection?.heroAbilitiesManager?.isAbilityCard(cardName) || false;
            
            // Check if this is a spell card
            const isSpellCard = window.heroSelection?.heroSpellbookManager?.isSpellCard(cardName) || false;
            const isGlobalSpell = window.globalSpellManager?.isGlobalSpell(cardName, window.heroSelection) || false;
            
            // Check if this is a potion card
            const isPotionCard = window.potionHandler?.isPotionCard(cardName, window.heroSelection) || false;

            

            // Check if this is an artifact and if it's unaffordable
            let isUnaffordable = false;
            let dataCardType = 'other';
            if (isAbilityCard) {
                dataCardType = 'ability';
            } else if (isSpellCard && !isGlobalSpell) {
                dataCardType = 'spell';
            } else if (isGlobalSpell) {
                dataCardType = 'global-spell';
            } else if (isPotionCard) {
                dataCardType = 'potion';
            } else if (cardInfo && cardInfo.cardType === 'Artifact') {
                dataCardType = 'artifact';
                // Check if player can afford it
                if (cardInfo.cost && cardInfo.cost > 0) {
                    const playerGold = window.heroSelection?.goldManager?.getPlayerGold() || 0;
                    isUnaffordable = playerGold < cardInfo.cost;
                }
            }

            // Check if this is an equip artifact
            const isEquipArtifact = cardInfo && cardInfo.cardType === 'Artifact' && cardInfo.subtype === 'Equip';
            if (isEquipArtifact) {
                dataCardType = 'equip-artifact';
            }
            
            // If ANY exclusive artifact is active, ALL cards are disabled
            const canPlay = !isAnyExclusiveActive && (!requiresAction || hasActions) && !isUnaffordable;
            
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
            if (isAnyExclusiveActive) cardClasses += ' exclusive-hand-disabled';

            // Add clickable class for special cards (only if they can be played)
            let clickableClass = '';
            if ((dataCardType === 'artifact' || dataCardType === 'global-spell' || dataCardType === 'potion') && canPlay) {
                clickableClass = ' clickable';
            }

            // ===== TEST HELPER: Add visual indicator for test cards =====
            let testCardIndicator = '';
            if (this.ENABLE_TEST_HELPERS && cardName === this.TEST_CARD_NAME) {
                testCardIndicator = '<div class="test-card-indicator">🧪</div>';
                cardClasses += ' test-card';
            }

            handHTML += `
                <div class="${cardClasses}${clickableClass}" 
                    data-card-index="${index}" 
                    data-card-name="${cardName}"
                    data-card-type="${dataCardType}"
                    data-requires-action="${requiresAction}"
                    data-can-play="${canPlay}"
                    data-unaffordable="${isUnaffordable}"
                    data-exclusive-hand-disabled="${isAnyExclusiveActive}"
                    draggable="${canPlay ? 'true' : 'false'}"
                    ondragstart="${canPlay ? `onHandCardDragStart(event, ${index}, '${cardName}')` : 'return false;'}"
                    ondragend="onHandCardDragEnd(event)"
                    onclick="onHandCardClick(event, ${index}, '${cardName}')"
                    oncontextmenu="onHandCardRightClick(event, ${index}, '${cardName}')"
                    onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                    onmouseleave="window.hideCardTooltip()">
                    <img src="${cardPath}" 
                        alt="${cardDisplayName}" 
                        class="hand-card-image"
                        onerror="this.src='./Cards/placeholder.png'">
                    ${requiresAction ? '<div class="action-indicator">⚡</div>' : ''}
                    ${testCardIndicator}
                </div>
            `;
        });

        handHTML += `
                    </div>
                </div>
            `;

        return handHTML;
    }

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

    getOverlapLevel() {
        if (this.hand.length <= 5) return 'none';
        if (this.hand.length === 6) return 'light';
        if (this.hand.length === 7) return 'moderate';
        if (this.hand.length === 8) return 'heavy';
        if (this.hand.length >= 9) return 'maximum';
        return 'none';
    }

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

    shuffleHand() {
        for (let i = this.hand.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.hand[i], this.hand[j]] = [this.hand[j], this.hand[i]];
        }
        return this.getHand();
    }

    exportHand() {
        return {
            cards: [...this.hand],
            size: this.hand.length,
            maxSize: this.maxHandSize,
            overlapLevel: this.getOverlapLevel(),
            timestamp: Date.now()
        };
    }

    importHand(handData) {
        if (!handData || !Array.isArray(handData.cards)) {
            console.error('Invalid hand data provided');
            return false;
        }

        this.hand = [...handData.cards];
        if (handData.maxSize) {
            this.maxHandSize = handData.maxSize;
        }
        this.resetDragState();
        return true;
    }

    reset() {
        this.hand = [];
        this.maxHandSize = 10;
        this.resetDragState();
    }
}

// ===== ENHANCED GLOBAL HAND CARD FUNCTIONS WITH EXCLUSIVE SUPPORT =====

// Enhanced hand card drag start with ENTIRE HAND disabling
function onHandCardDragStart(event, cardIndex, cardName) {
    if (window.handManager && window.heroSelection) {
        // Check if entire hand is disabled due to exclusive artifact
        if (window.artifactHandler && window.artifactHandler.isExclusiveArtifactActive()) {
            const activeExclusive = window.artifactHandler.getActiveExclusiveArtifact();
            const formattedName = window.handManager.formatCardName(activeExclusive);
            event.preventDefault();
            showHandDisabledError(`Hand is disabled while ${formattedName} is active`, event);
            return false;
        }

        // Check if it's an artifact and if player can afford it
        const affordCheck = canPlayerAffordArtifact(cardName);
        if (!affordCheck.canAfford) {
            event.preventDefault();
            showGoldError(affordCheck.reason, event);
            return false;
        }
        
        // Check if player can play action card
        const cardInfo = window.heroSelection.getCardInfo ? 
            window.heroSelection.getCardInfo(cardName) : null;
        
        if (window.heroSelection.actionManager) {
            const actionCheck = window.heroSelection.actionManager.canPlayActionCard(cardInfo);
            
            if (!actionCheck.canPlay) {
                event.preventDefault();
                showActionError(actionCheck.reason, event);
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
                setupOperaDragImage(event, draggedElement);
            } else if (isFirefox) {
                setupFirefoxDragImage(event, draggedElement);
            } else {
                setupDefaultDragImage(event, draggedElement);
            }
        } catch (error) {
            console.error('Error setting up drag:', error);
        }
        
        // DELAY visual modifications to not interfere with ghost image generation
        setTimeout(() => {
            const success = window.handManager.startHandCardDrag(cardIndex, cardName, draggedElement);
            if (!success) {
                // Drag was blocked, clean up dataTransfer
                event.preventDefault();
                return false;
            }
        }, 0);
    }
}

// Enhanced hand card click with ENTIRE HAND disabling
async function onHandCardClick(event, cardIndex, cardName) {
    event.stopPropagation();

    // Check if entire hand is disabled due to exclusive artifact
    if (window.artifactHandler && window.artifactHandler.isExclusiveArtifactActive()) {
        const activeExclusive = window.artifactHandler.getActiveExclusiveArtifact();
        const formattedName = window.handManager ? 
            window.handManager.formatCardName(activeExclusive) : activeExclusive;
        showHandDisabledError(`Hand is disabled while ${formattedName} is active`, event);
        return;
    }

    // Check if it's a potion
    if (window.potionHandler && window.potionHandler.isPotionCard(cardName, window.heroSelection)) {
        const result = await window.potionHandler.handlePotionClick(cardIndex, cardName, window.heroSelection);
        return;
    }
        
    // Check if it's an artifact and if player can afford it
    const affordCheck = canPlayerAffordArtifact(cardName);
    if (!affordCheck.canAfford) {
        showGoldError(affordCheck.reason, event);
        return;
    }

    // Check if it's a global spell
    if (window.globalSpellManager && window.globalSpellManager.isGlobalSpell(cardName, window.heroSelection)) {
        const result = await window.globalSpellManager.handleGlobalSpellActivation(cardIndex, cardName, window.heroSelection);
        
        // Check for MagicArts redraw after successful activation
        if (result && window.heroSelection) {
            await magicArtsRedraw.handleMagicArtsRedraw(cardName, window.heroSelection);
        }
        
        return;
    }
    
    // Use artifact handler for all artifacts
    if (window.artifactHandler) {
        const handled = await window.artifactHandler.handleArtifactClick(cardIndex, cardName, window.heroSelection);
        if (handled) {
            return; // Artifact was successfully handled
        }
    }
}

// Enhanced hand card right-click with ENTIRE HAND disabling and disenchanting
async function onHandCardRightClick(event, cardIndex, cardName) {
    // Prevent the browser context menu
    event.preventDefault();
    event.stopPropagation();
    
    if (window.handManager && window.heroSelection) {
        const cardElement = event.target.closest('.hand-card');
        const success = await window.handManager.disenchantCard(cardIndex, cardName, cardElement);
        
        if (!success) {
            // Could show an error message here if needed
            console.warn('Failed to disenchant card:', cardName);
        }
    }
    
    return false;
}

// === UTILITY FUNCTIONS (unchanged) ===

function canPlayerAffordArtifact(cardName) {
    if (!window.heroSelection) {
        return { canAfford: false, reason: 'Game not initialized' };
    }
    
    const cardInfo = window.heroSelection.getCardInfo(cardName);
    if (!cardInfo) {
        return { canAfford: true };
    }
    
    if (cardInfo.cardType !== 'Artifact') {
        return { canAfford: true };
    }
    
    const artifactCost = cardInfo.cost || 0;
    if (artifactCost <= 0) {
        return { canAfford: true };
    }
    
    const playerGold = window.heroSelection.getGoldManager().getPlayerGold();
    
    if (playerGold >= artifactCost) {
        return { canAfford: true };
    } else {
        return { 
            canAfford: false, 
            reason: `You need ${artifactCost} Gold to play this card!`,
            cost: artifactCost,
            currentGold: playerGold,
            shortBy: artifactCost - playerGold
        };
    }
}

function showGoldError(message, event) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'gold-error-popup';
    errorDiv.innerHTML = `
        <div class="gold-error-content">
            <span class="gold-error-icon">💰</span>
            <span class="gold-error-text">${message}</span>
        </div>
    `;
    
    const x = event ? event.clientX : window.innerWidth / 2;
    const y = event ? event.clientY : window.innerHeight / 2;
    
    errorDiv.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y - 50}px;
        transform: translateX(-50%);
        background: rgba(220, 53, 69, 0.95);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: goldErrorBounce 0.5s ease-out;
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.2);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'goldErrorFade 0.3s ease-out forwards';
        setTimeout(() => errorDiv.remove(), 300);
    }, 2000);
}

function showActionError(message, event) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'action-error-popup';
    errorDiv.innerHTML = `
        <div class="action-error-content">
            <span class="action-error-icon">⚡</span>
            <span class="action-error-text">${message}</span>
        </div>
    `;
    
    const x = event ? event.clientX : window.innerWidth / 2;
    const y = event ? event.clientY : window.innerHeight / 2;
    
    errorDiv.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y - 50}px;
        transform: translateX(-50%);
        background: rgba(255, 193, 7, 0.95);
        color: #212529;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: actionErrorBounce 0.5s ease-out;
        box-shadow: 0 4px 15px rgba(255, 193, 7, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'actionErrorFade 0.3s ease-out forwards';
        setTimeout(() => errorDiv.remove(), 300);
    }, 2000);
}

// NEW: Show hand disabled error message
function showHandDisabledError(message, event) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'hand-disabled-error-popup';
    errorDiv.innerHTML = `
        <div class="hand-disabled-error-content">
            <span class="hand-disabled-error-icon">🔒</span>
            <span class="hand-disabled-error-text">${message}</span>
        </div>
    `;
    
    const x = event ? event.clientX : window.innerWidth / 2;
    const y = event ? event.clientY : window.innerHeight / 2;
    
    errorDiv.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y - 50}px;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #6f42c1 0%, #495057 100%);
        color: white;
        padding: 14px 22px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: handDisabledErrorBounce 0.6s ease-out;
        box-shadow: 0 6px 20px rgba(111, 66, 193, 0.6);
        border: 2px solid rgba(255, 255, 255, 0.3);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'handDisabledErrorFade 0.4s ease-out forwards';
        setTimeout(() => errorDiv.remove(), 400);
    }, 2500);
}

// === REMAINING FUNCTIONS (unchanged) ===

function setupOperaDragImage(event, draggedElement) {
    const cardImage = draggedElement.querySelector('.hand-card-image');
    if (cardImage && cardImage.complete) {
        event.dataTransfer.setDragImage(cardImage, cardImage.offsetWidth / 2, cardImage.offsetHeight / 2);
    } else {
        const canvas = createCustomDragImage(draggedElement);
        if (canvas) {
            event.dataTransfer.setDragImage(canvas, canvas.width / 2, canvas.height / 2);
        }
    }
}

function setupFirefoxDragImage(event, draggedElement) {
    const canvas = createOptimizedDragImage(draggedElement);
    if (canvas) {
        event.dataTransfer.setDragImage(canvas, canvas.width / 2, canvas.height / 2);
    }
}

function setupDefaultDragImage(event, draggedElement) {
    const cardImage = draggedElement.querySelector('.hand-card-image');
    if (cardImage && cardImage.complete) {
        const rect = cardImage.getBoundingClientRect();
        event.dataTransfer.setDragImage(cardImage, rect.width / 2, rect.height / 2);
    }
}

function createCustomDragImage(cardElement) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 150;
        canvas.height = 210;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        const cardImage = cardElement.querySelector('.hand-card-image');
        if (cardImage && cardImage.complete && cardImage.naturalWidth > 0) {
            try {
                ctx.drawImage(cardImage, 5, 5, canvas.width - 10, canvas.height * 0.8 - 10);
            } catch (imgError) {
                console.warn('Could not draw card image to canvas:', imgError);
            }
        }
        
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

function createOptimizedDragImage(cardElement) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 120;
        canvas.height = 168;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width *= dpr;
        canvas.height *= dpr;
        ctx.scale(dpr, dpr);
        
        canvas.style.width = '120px';
        canvas.style.height = '168px';
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 168);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(1, 'rgba(248, 249, 250, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 120, 168);
        
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 118, 166);
        
        const cardImage = cardElement.querySelector('.hand-card-image');
        if (cardImage && cardImage.complete && cardImage.naturalWidth > 0) {
            try {
                ctx.drawImage(cardImage, 3, 3, 114, 134);
            } catch (imgError) {
                console.warn('Could not draw card image to canvas:', imgError);
                ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
                ctx.fillRect(3, 3, 114, 134);
                ctx.fillStyle = '#666';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Card', 60, 70);
            }
        }
        
        const cardName = cardElement.querySelector('.hand-card-name');
        if (cardName) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            
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

async function onHandCardDragEnd(event) {
    if (window.handManager) {
        const dragState = window.handManager.getHandDragState();
        if (dragState.isDragging) {
            const handContainer = document.querySelector('.hand-cards');
            if (handContainer) {
                const rect = handContainer.getBoundingClientRect();
                const x = event.clientX;
                const y = event.clientY;
                
                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    // Check if it's a potion being dragged out of hand
                    if (window.potionHandler && window.potionHandler.isPotionCard(dragState.draggedCardName, window.heroSelection)) {
                        const result = await window.potionHandler.handlePotionDrag(
                            dragState.draggedCardIndex,
                            dragState.draggedCardName,
                            window.heroSelection
                        );
                    }
                    else if (window.globalSpellManager && window.heroSelection &&
                        window.globalSpellManager.isGlobalSpell(dragState.draggedCardName, window.heroSelection)) {
                                                
                        const result = await window.globalSpellManager.handleGlobalSpellActivation(
                            dragState.draggedCardIndex,
                            dragState.draggedCardName,
                            window.heroSelection
                        );
                        
                        // Check for MagicArts redraw after successful activation
                        if (result && window.heroSelection) {
                            await magicArtsRedraw.handleMagicArtsRedraw(dragState.draggedCardName, window.heroSelection);
                        }
                    }
                    else if (window.artifactHandler) {
                        const result = await window.artifactHandler.handleArtifactDrag(
                            dragState.draggedCardIndex, 
                            dragState.draggedCardName, 
                            window.heroSelection
                        );
                    }
                }
            }
        }
        
        window.handManager.endHandCardDrag();
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

// Enhanced styles including exclusive restriction indicators and disenchant animations
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
    
    /* ===== TEST HELPER STYLES ===== */
    .hand-card.test-card {
        border: 2px solid #28a745 !important;
        box-shadow: 0 0 15px rgba(40, 167, 69, 0.6) !important;
    }
    
    .test-card-indicator {
        position: absolute;
        top: -8px;
        left: -8px;
        font-size: 20px;
        background: rgba(40, 167, 69, 0.9);
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        z-index: 15;
        animation: testCardPulse 2s ease-in-out infinite;
    }
    
    @keyframes testCardPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    /* ===== END TEST HELPER STYLES ===== */
    
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
        content: "Can't use that";
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

if (typeof document !== 'undefined' && !document.getElementById('goldErrorStyles')) {
    const style = document.createElement('style');
    style.id = 'goldErrorStyles';
    style.textContent = `
        @keyframes goldErrorBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes goldErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes actionErrorBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes actionErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* NEW: Hand disabled error animations */
        @keyframes handDisabledErrorBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(25px) scale(0.7);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-8px) scale(1.08);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes handDisabledErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-15px) scale(0.9);
            }
        }
        
        /* NEW: Disenchant animations */
        @keyframes dustFloat {
            0% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.9;
            }
            100% {
                transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(0);
                opacity: 0;
            }
        }
        
        @keyframes disenchantFeedback {
            0% {
                transform: translateX(-50%) translateY(0) scale(0.8);
                opacity: 0;
            }
            20% {
                transform: translateX(-50%) translateY(-10px) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translateX(-50%) translateY(-30px) scale(1);
                opacity: 0;
            }
        }
        
        @keyframes sparkle {
            0%, 100% { transform: scale(1) rotate(0deg); }
            50% { transform: scale(1.2) rotate(180deg); }
        }
        
        .gold-error-popup {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .gold-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .gold-error-icon {
            font-size: 20px;
            filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.8));
        }
        
        .gold-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        .action-error-popup {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .action-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .action-error-icon {
            font-size: 20px;
        }
        
        .action-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        /* NEW: Hand disabled error styling */
        .hand-disabled-error-popup {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .hand-disabled-error-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .hand-disabled-error-icon {
            font-size: 22px;
            filter: drop-shadow(0 0 4px rgba(111, 66, 193, 0.8));
            animation: handDisabledIconPulse 2s ease-in-out infinite;
        }
        
        .hand-disabled-error-text {
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.6);
        }
        
        @keyframes handDisabledIconPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }
        
        /* NEW: Disenchant feedback styling */
        .disenchant-feedback {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .disenchant-feedback-content {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .disenchant-icon {
            font-size: 16px;
            animation: sparkle 1s ease-in-out infinite;
        }
        
        .hand-card.disenchanting {
            transition: all 0.8s ease-out;
            opacity: 0;
            transform: scale(0.8);
        }
        
        .hand-card[data-card-type="artifact"][data-unaffordable="true"] {
            position: relative;
            opacity: 0.7;
        }
        
        .hand-card[data-card-type="artifact"][data-unaffordable="true"]::after {
            content: "💰";
            position: absolute;
            top: 5px;
            left: 5px;
            font-size: 20px;
            filter: drop-shadow(0 0 3px rgba(220, 53, 69, 0.8));
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
        }
        
        /* NEW: Entire hand disabled styling */
        .hand-container.exclusive-disabled {
            position: relative;
            opacity: 0.4;
            filter: grayscale(60%) blur(1px);
            pointer-events: none;
            transition: all 0.3s ease;
        }
        
        .hand-container.exclusive-disabled::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, 
                rgba(111, 66, 193, 0.15) 0%, 
                rgba(73, 80, 87, 0.15) 100%);
            border-radius: 12px;
            z-index: 10;
            animation: exclusiveHandOverlay 3s ease-in-out infinite;
        }
        
        @keyframes exclusiveHandOverlay {
            0%, 100% { 
                background: linear-gradient(135deg, 
                    rgba(111, 66, 193, 0.15) 0%, 
                    rgba(73, 80, 87, 0.15) 100%);
            }
            50% { 
                background: linear-gradient(135deg, 
                    rgba(111, 66, 193, 0.25) 0%, 
                    rgba(73, 80, 87, 0.25) 100%);
            }
        }
        
        .hand-exclusive-overlay {
            position: absolute;
            top: -40px;
            left: 0;
            right: 0;
            z-index: 15;
            display: flex;
            justify-content: center;
        }
        
        .hand-exclusive-message {
            background: linear-gradient(135deg, #6f42c1 0%, #495057 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(111, 66, 193, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: exclusiveMessageFloat 2s ease-in-out infinite;
        }
        
        @keyframes exclusiveMessageFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
        }
        
        .hand-exclusive-icon {
            font-size: 16px;
            animation: exclusiveIconSpin 3s linear infinite;
        }
        
        @keyframes exclusiveIconSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .hand-card.exclusive-hand-disabled {
            cursor: not-allowed !important;
            opacity: 0.3 !important;
            filter: grayscale(70%) !important;
        }
        
        .hand-card.exclusive-hand-disabled:hover {
            transform: none !important;
            box-shadow: none !important;
        }
    `;
    document.head.appendChild(style);
}

if (typeof window !== 'undefined') {
    import('./artifactHandler.js').then(module => {
        window.artifactHandler = module.artifactHandler;
        window.artifactHandler.preloadAllArtifacts();
    }).catch(error => {
        console.error('Could not load artifact handler:', error);
    });

    import('./potionHandler.js').then(module => {
        window.potionHandler = module.potionHandler;
    }).catch(error => {
        console.error('Could not load potion handler:', error);
    });
    
    window.showActionError = showActionError;
    window.showHandDisabledError = showHandDisabledError;
    window.onHandCardDragStart = onHandCardDragStart;
    window.onHandCardDragEnd = onHandCardDragEnd;
    window.onHandZoneDragEnter = onHandZoneDragEnter;
    window.onHandZoneDragOver = onHandZoneDragOver;
    window.onHandZoneDragLeave = onHandZoneDragLeave;
    window.onHandZoneDrop = onHandZoneDrop;
    window.onHandCardClick = onHandCardClick;
    window.onHandCardRightClick = onHandCardRightClick; // NEW: Export right-click handler
    window.canPlayerAffordArtifact = canPlayerAffordArtifact;
    window.showGoldError = showGoldError;
}