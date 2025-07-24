// deckManager.js - Deck Management Module with Card Rewards Support and Hero Card Integration

export class DeckManager {
    constructor() {
        this.deck = []; // Array of card names in player's deck
        console.log('DeckManager initialized');
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
        console.log('Deck cleared');
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
            console.log(`Replaced deck with ${this.deck.length} cards:`, this.deck);
        } else {
            // New behavior - add cards to existing deck
            this.deck.push(...cardNames);
            console.log(`Added ${cardNames.length} cards to deck. Total: ${this.deck.length}`);
        }
        
        return true;
    }

    // Add multiple hero cards to deck (for hero rewards)
    addHeroCards(cardNames) {
        if (!Array.isArray(cardNames)) {
            console.error('addHeroCards expects an array of card names');
            return false;
        }

        // Add all hero cards to deck
        this.deck.push(...cardNames);
        console.log(`Added ${cardNames.length} hero cards to deck. Total: ${this.deck.length}`);
        return true;
    }

    // Remove duplicate cards from deck and return to unique cards only
    removeDuplicates() {
        const originalLength = this.deck.length;
        const uniqueCards = [...new Set(this.deck)];
        
        if (uniqueCards.length !== originalLength) {
            this.deck = uniqueCards;
            console.log(`Removed ${originalLength - uniqueCards.length} duplicate cards. Deck now has ${this.deck.length} unique cards`);
            return originalLength - uniqueCards.length; // Return number of duplicates removed
        } else {
            console.log('No duplicates found in deck');
            return 0;
        }
    }

    // Add single card to deck (for future functionality)
    addCard(cardName) {
        if (!cardName || typeof cardName !== 'string') {
            console.error('Invalid card name provided');
            return false;
        }

        if (!this.deck.includes(cardName)) {
            this.deck.push(cardName);
            console.log(`Added ${cardName} to deck. Deck size: ${this.deck.length}`);
            return true;
        } else {
            console.warn(`Card ${cardName} already in deck`);
            return false;
        }
    }

    // Add card to deck (allows duplicates for rewards)
    addCardReward(cardName) {
        if (!cardName || typeof cardName !== 'string') {
            console.error('Invalid card name provided');
            return false;
        }

        this.deck.push(cardName);
        console.log(`Added reward card ${cardName} to deck. Deck size: ${this.deck.length}`);
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
            console.log(`Removed ${cardName} from deck. Deck size: ${this.deck.length}`);
            return true;
        } else {
            console.warn(`Card ${cardName} not found in deck`);
            return false;
        }
    }

    // Check if deck contains a specific card
    hasCard(cardName) {
        return this.deck.includes(cardName);
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
        console.log('Deck shuffled');
        return this.getDeck();
    }

    // Create deck grid HTML for UI display - supports dynamic grid sizing
    createDeckGrid(formatCardNameFunction) {
        if (this.deck.length === 0) {
            return `
                <div class="card-preview-placeholder">
                    <div class="preview-icon">🃏</div>
                    <div>No cards in deck</div>
                </div>
            `;
        }

        // Show unique cards for display (but deck can have duplicates)
        const uniqueCards = this.getUniqueCards();
        
        // Always use 3x3 grid
        const gridSize = { cols: 3, rows: 3, maxCards: 9 };
        const needsScroll = uniqueCards.length > 9;
        
        let gridHTML = `
            <div class="card-preview-content">
                <div class="card-preview-header">
                    <h3>🃏 Your Deck</h3>
                    ${uniqueCards.length > 9 ? 
                        `<p class="deck-overflow-notice">${uniqueCards.length} cards (scroll to see all)</p>` : 
                        ''
                    }
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
                    const cardCount = this.deck.filter(c => c === cardName).length;
                    const cardData = {
                        imagePath: cardPath,
                        displayName: cardDisplayName,
                        cardType: 'deck'
                    };
                    const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
                    
                    // Add special styling for reward cards (cards beyond the original 8)
                    const isRewardCard = cardIndex >= 8;
                    const rewardClass = isRewardCard ? 'reward-card-slot' : '';
                    
                    gridHTML += `
                        <div class="card-slot ${rewardClass}">
                            <img src="${cardPath}" 
                                 alt="${cardDisplayName}" 
                                 class="preview-card ${isRewardCard ? 'reward-card-preview' : ''}"
                                 onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                                 onmouseleave="window.hideCardTooltip()"
                                 onerror="this.src='./Cards/placeholder.png'">
                            <div class="card-name">${cardDisplayName}${cardCount > 1 ? ` (${cardCount})` : ''}</div>
                            ${isRewardCard ? '<div class="reward-indicator">⭐</div>' : ''}
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
        console.log(`Imported deck with ${this.deck.length} cards (${this.getUniqueCards().length} unique):`, this.deck);
        return true;
    }

    // Get deck statistics (for future functionality)
    getDeckStats() {
        return {
            totalCards: this.deck.length,
            uniqueCards: new Set(this.deck).size,
            duplicates: this.deck.length - new Set(this.deck).size,
            cardCounts: this.deck.reduce((counts, card) => {
                counts[card] = (counts[card] || 0) + 1;
                return counts;
            }, {})
        };
    }

    // Reset deck to initial state
    reset() {
        this.deck = [];
        console.log('DeckManager reset');
    }

    // Validate deck (for future game rules)
    validateDeck(rules = {}) {
        const {
            minCards = 0,
            maxCards = Infinity,
            allowDuplicates = true,
            requiredCards = []
        } = rules;

        const validation = {
            isValid: true,
            errors: []
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

        // Check required cards
        for (const requiredCard of requiredCards) {
            if (!this.deck.includes(requiredCard)) {
                validation.isValid = false;
                validation.errors.push(`Required card missing: ${requiredCard}`);
            }
        }

        return validation;
    }

    // Log current deck state (for debugging)
    logDeckState() {
        console.log('=== DECK STATE ===');
        console.log('Cards:', this.deck);
        console.log('Size:', this.deck.length);
        console.log('Unique Cards:', this.getUniqueCards());
        console.log('Stats:', this.getDeckStats());
        console.log('==================');
    }
}