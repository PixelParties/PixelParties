// deckManager.js - Deck Management Module with Card Rewards Support and Hero Card Integration
// UPDATED: Removed duplicate restrictions to allow multiple copies of the same card

export class DeckManager {
    constructor() {
        this.deck = []; // Array of card names in player's deck
    }

    // Get player's deck (returns copy to prevent external modification)
    getDeck() {
        return [...this.deck];
    }

    // Get deck size
    getDeckSize() {
        return this.deck.length;
    }

    // Clear the deck
    clearDeck() {
        this.deck = [];
    }

    // Add multiple cards to deck (used when selecting a hero) - UPDATED
    addCards(cardNames, replaceExisting = true) {
        if (!Array.isArray(cardNames)) {
            console.error('addCards expects an array of card names');
            return false;
        }

        if (replaceExisting) {
            // Original behavior - replace deck with new cards
            this.deck = [...cardNames];
        } else {
            // New behavior - add cards to existing deck (allows duplicates)
            this.deck.push(...cardNames);
        }
        
        return true;
    }

    // Add multiple hero cards to deck (for hero rewards) - UPDATED to allow duplicates
    addHeroCards(cardNames) {
        if (!Array.isArray(cardNames)) {
            console.error('addHeroCards expects an array of card names');
            return false;
        }

        // Add all hero cards to deck (duplicates allowed)
        this.deck.push(...cardNames);
        return true;
    }

    // Remove duplicate cards from deck and return to unique cards only
    removeDuplicates() {
        const originalLength = this.deck.length;
        const uniqueCards = [...new Set(this.deck)];
        
        if (uniqueCards.length !== originalLength) {
            this.deck = uniqueCards;
            return originalLength - uniqueCards.length; // Return number of duplicates removed
        } else {
            return 0;
        }
    }

    // Add single card to deck - UPDATED to allow duplicates
    addCard(cardName) {
        if (!cardName || typeof cardName !== 'string') {
            console.error('Invalid card name provided');
            return false;
        }

        // CHANGED: Always add card, duplicates are now allowed
        this.deck.push(cardName);
        console.log(`Added card ${cardName} to deck (duplicates allowed)`);
        return true;
    }

    // Add card to deck (allows duplicates for rewards) - Already supported duplicates
    addCardReward(cardName) {
        if (!cardName || typeof cardName !== 'string') {
            console.error('Invalid card name provided');
            return false;
        }

        this.deck.push(cardName);
        return true;
    }

    // Remove card from deck (for future functionality)
    removeCard(cardName) {
        if (!cardName || typeof cardName !== 'string') {
            console.error('Invalid card name provided');
            return false;
        }

        const index = this.deck.indexOf(cardName);
        if (index > -1) {
            this.deck.splice(index, 1);
            return true;
        } else {
            console.warn(`Card ${cardName} not found in deck`);
            return false;
        }
    }

    // Remove all instances of a card from deck
    removeAllInstancesOfCard(cardName) {
        if (!cardName || typeof cardName !== 'string') {
            console.error('Invalid card name provided');
            return 0;
        }

        const initialLength = this.deck.length;
        this.deck = this.deck.filter(card => card !== cardName);
        const removedCount = initialLength - this.deck.length;
        
        if (removedCount > 0) {
            console.log(`Removed ${removedCount} instances of ${cardName} from deck`);
        }
        
        return removedCount;
    }

    // Check if deck contains a specific card
    hasCard(cardName) {
        return this.deck.includes(cardName);
    }

    // Get count of a specific card in deck
    getCardCount(cardName) {
        return this.deck.filter(card => card === cardName).length;
    }

    // Get all unique cards in deck (for filtering rewards)
    getUniqueCards() {
        return [...new Set(this.deck)];
    }

    // Get cards by type or filter (for future functionality)
    getCardsByFilter(filterFunction) {
        if (typeof filterFunction !== 'function') {
            console.error('Filter must be a function');
            return [];
        }
        return this.deck.filter(filterFunction);
    }

    // Shuffle deck (for future functionality)
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        return this.getDeck();
    }

    // Create deck grid HTML for UI display - supports dynamic grid sizing with duplicate counts
    createDeckGrid(formatCardNameFunction) {
        if (this.deck.length === 0) {
            return `
                <div class="card-preview-placeholder">
                    <div class="preview-icon">🃏</div>
                    <div>No cards in deck</div>
                </div>
            `;
        }

        // Show unique cards for display but include counts
        const uniqueCards = this.getUniqueCards();
        
        // Always use 3x3 grid
        const gridSize = { cols: 3, rows: 3, maxCards: 9 };
        const needsScroll = uniqueCards.length > 9;
        
        let gridHTML = `
            <div class="card-preview-content">
                <div class="card-preview-header">
                    <h3>🃏 Your Deck</h3>
                    <p class="deck-stats">
                        ${uniqueCards.length} unique cards, ${this.deck.length} total cards
                        ${needsScroll ? ' (scroll to see all)' : ''}
                    </p>
                </div>
                <div class="deck-grid-wrapper ${needsScroll ? 'scrollable' : ''}">
                    <div class="deck-grid-container">
        `;

        // Create rows of 3 cards each
        for (let i = 0; i < uniqueCards.length; i += 3) {
            gridHTML += `<div class="deck-grid-row">`;
            
            // Add up to 3 cards per row
            for (let j = 0; j < 3; j++) {
                const cardIndex = i + j;
                const cardName = cardIndex < uniqueCards.length ? uniqueCards[cardIndex] : null;
                
                if (cardName) {
                    // Deck card from ./Cards/All/
                    const cardPath = `./Cards/All/${cardName}.png`;
                    const cardDisplayName = formatCardNameFunction ? formatCardNameFunction(cardName) : cardName;
                    const cardCount = this.getCardCount(cardName);
                    const cardData = {
                        imagePath: cardPath,
                        displayName: cardDisplayName,
                        cardType: 'deck'
                    };
                    const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
                    
                    // Add special styling for reward cards (cards beyond the original 8)
                    const isRewardCard = cardIndex >= 8;
                    const rewardClass = isRewardCard ? 'reward-card-slot' : '';
                    
                    // Special styling for cards with multiple copies
                    const duplicateClass = cardCount > 1 ? 'duplicate-card-slot' : '';
                    
                    gridHTML += `
                        <div class="card-slot ${rewardClass} ${duplicateClass}">
                            <img src="${cardPath}" 
                                 alt="${cardDisplayName}" 
                                 class="preview-card ${isRewardCard ? 'reward-card-preview' : ''}"
                                 onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                                 onmouseleave="window.hideCardTooltip()"
                                 onerror="this.src='./Cards/placeholder.png'">
                            <div class="card-name">${cardDisplayName}</div>
                            ${cardCount > 1 ? `<div class="card-count-badge">${cardCount}</div>` : ''}
                        </div>
                    `;
                } else if (uniqueCards.length <= 9) {
                    // Only show empty slots if we have 9 or fewer cards total
                    gridHTML += `
                        <div class="card-slot empty-slot">
                            <div class="empty-card">Empty</div>
                        </div>
                    `;
                }
            }
            
            gridHTML += `</div>`; // Close row
        }

        gridHTML += `
                    </div>
                </div>
            </div>
        `;

        // Add styles for duplicate indicators
        if (!document.getElementById('deckGridDuplicateStyles')) {
            const style = document.createElement('style');
            style.id = 'deckGridDuplicateStyles';
            style.textContent = `
                .deck-stats {
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.8);
                    margin: 5px 0 15px 0;
                    text-align: center;
                }
                
                .duplicate-card-slot {
                    position: relative;
                }
                
                .duplicate-card-slot .preview-card {
                    border: 2px solid rgba(255, 193, 7, 0.6) !important;
                    box-shadow: 0 0 10px rgba(255, 193, 7, 0.3) !important;
                }
                
                .card-count-badge {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                    color: white;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    border: 2px solid white;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    z-index: 5;
                }
                
                .duplicate-card-slot:hover .card-count-badge {
                    transform: scale(1.1);
                    background: linear-gradient(135deg, #ff7675 0%, #fd79a8 100%);
                }
                
                .reward-card-slot.duplicate-card-slot .preview-card {
                    border: 2px solid rgba(255, 193, 7, 0.8) !important;
                    box-shadow: 0 0 15px rgba(255, 193, 7, 0.5), 0 0 5px rgba(255, 255, 255, 0.3) !important;
                }
            `;
            document.head.appendChild(style);
        }

        return gridHTML;
    }

    // Export deck data (for saving/syncing)
    exportDeck() {
        return {
            cards: [...this.deck],
            size: this.deck.length,
            uniqueCards: this.getUniqueCards().length,
            timestamp: Date.now()
        };
    }

    // Import deck data (for loading/syncing)
    importDeck(deckData) {
        if (!deckData || !Array.isArray(deckData.cards)) {
            console.error('Invalid deck data provided');
            return false;
        }

        this.deck = [...deckData.cards];
        return true;
    }

    // Get deck statistics (for future functionality) - UPDATED with duplicate info
    getDeckStats() {
        const uniqueCards = new Set(this.deck);
        const cardCounts = this.deck.reduce((counts, card) => {
            counts[card] = (counts[card] || 0) + 1;
            return counts;
        }, {});
        
        const duplicateCards = Object.entries(cardCounts).filter(([card, count]) => count > 1);
        
        return {
            totalCards: this.deck.length,
            uniqueCards: uniqueCards.size,
            duplicates: this.deck.length - uniqueCards.size,
            duplicateCardTypes: duplicateCards.length,
            cardCounts: cardCounts,
            mostCommonCard: duplicateCards.length > 0 ? 
                duplicateCards.reduce((max, [card, count]) => count > max.count ? {card, count} : max, {card: null, count: 0}) : 
                null
        };
    }

    // Reset deck to initial state
    reset() {
        this.deck = [];
    }

    // Validate deck (for future game rules) - UPDATED to support duplicate validation without removal
    validateDeck(rules = {}) {
        const {
            minCards = 0,
            maxCards = Infinity,
            allowDuplicates = true,
            maxDuplicatesPerCard = Infinity, // For validation only, doesn't remove cards
            requiredCards = []
        } = rules;

        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Check card count
        if (this.deck.length < minCards) {
            validation.isValid = false;
            validation.errors.push(`Deck has ${this.deck.length} cards, minimum required: ${minCards}`);
        }

        if (this.deck.length > maxCards) {
            validation.isValid = false;
            validation.errors.push(`Deck has ${this.deck.length} cards, maximum allowed: ${maxCards}`);
        }

        // Check for duplicates if not allowed
        if (!allowDuplicates) {
            const uniqueCards = new Set(this.deck);
            if (uniqueCards.size !== this.deck.length) {
                validation.isValid = false;
                validation.errors.push('Duplicate cards found, but duplicates are not allowed');
            }
        }

        // Check maximum duplicates per card (validation only - doesn't modify deck)
        if (maxDuplicatesPerCard < Infinity) {
            const cardCounts = this.getDeckStats().cardCounts;
            for (const [cardName, count] of Object.entries(cardCounts)) {
                if (count > maxDuplicatesPerCard) {
                    validation.warnings.push(`Card "${cardName}" appears ${count} times, recommended maximum: ${maxDuplicatesPerCard}`);
                }
            }
        }

        // Check required cards
        for (const requiredCard of requiredCards) {
            if (!this.deck.includes(requiredCard)) {
                validation.isValid = false;
                validation.errors.push(`Required card missing: ${requiredCard}`);
            }
        }

        return validation;
    }

    // NEW: Get cards that appear multiple times (for display/analysis purposes)
    getDuplicateCards() {
        const cardCounts = this.getDeckStats().cardCounts;
        return Object.entries(cardCounts)
            .filter(([card, count]) => count > 1)
            .map(([card, count]) => ({ card, count }));
    }

    // NEW: Get cards sorted by frequency (most duplicated first)
    getCardsByFrequency() {
        const cardCounts = this.getDeckStats().cardCounts;
        return Object.entries(cardCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([card, count]) => ({ card, count }));
    }
}