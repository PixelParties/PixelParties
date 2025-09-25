// graveyard.js - Graveyard Management Module

// Import token checking function from card database
import { isToken } from './cardDatabase.js';

export class GraveyardManager {
    constructor() {
        this.graveyard = []; // Array of card names in order of discard
    }

    // Add a card to the graveyard - UPDATED TO EXCLUDE TOKENS
    addCard(cardName) {
        if (!cardName || typeof cardName !== 'string') {
            console.error('Invalid card name provided to graveyard');
            return false;
        }

        // Check if card is a Token - if so, ignore it completely
        if (isToken(cardName)) {
            return true; // Return true because this is expected behavior
        }

        this.graveyard.push(cardName);
        return true;
    }

    // Get all cards in graveyard (returns copy)
    getGraveyard() {
        return [...this.graveyard];
    }

    // Get unique cards with counts (similar to deck)
    getUniqueCards() {
        return [...new Set(this.graveyard)];
    }

    // Get count of a specific card
    getCardCount(cardName) {
        return this.graveyard.filter(card => card === cardName).length;
    }

    // Get graveyard size
    getSize() {
        return this.graveyard.length;
    }

    // Check if graveyard is empty
    isEmpty() {
        return this.graveyard.length === 0;
    }

    // Get graveyard statistics
    getStats() {
        const uniqueCards = new Set(this.graveyard);
        return {
            totalCards: this.graveyard.length,
            uniqueCards: uniqueCards.size,
            cardCounts: this.graveyard.reduce((counts, card) => {
                counts[card] = (counts[card] || 0) + 1;
                return counts;
            }, {})
        };
    }

    // Create graveyard tooltip content HTML
    createTooltipHTML(formatCardNameFunction) {
        if (this.isEmpty()) {
            return `
                <div class="graveyard-tooltip-content empty">
                    <h4 class="graveyard-tooltip-title">⚰️ Graveyard</h4>
                    <div class="graveyard-empty">No cards discarded yet</div>
                </div>
            `;
        }

        const uniqueCards = this.getUniqueCards();
        const stats = this.getStats();

        let cardsHTML = '';
        uniqueCards.forEach(cardName => {
            const count = this.getCardCount(cardName);
            const displayName = formatCardNameFunction ? formatCardNameFunction(cardName) : cardName;
            
            cardsHTML += `
                <div class="graveyard-card-entry">
                    <span class="graveyard-card-name">${displayName}</span>
                    <span class="graveyard-card-count">×${count}</span>
                </div>
            `;
        });

        return `
            <div class="graveyard-tooltip-content">
                <h4 class="graveyard-tooltip-title">⚰️ Discard pile (${stats.totalCards} cards)</h4>
                <div class="graveyard-cards-list">
                    ${cardsHTML}
                </div>
                <div class="graveyard-summary">
                    ${stats.uniqueCards} unique cards
                </div>
            </div>
        `;
    }

    // Export graveyard data (for saving/syncing)
    exportGraveyard() {
        return {
            cards: [...this.graveyard],
            size: this.graveyard.length,
            timestamp: Date.now()
        };
    }

    // Import graveyard data (for loading/syncing)
    importGraveyard(graveyardData) {
        if (!graveyardData || !Array.isArray(graveyardData.cards)) {
            console.error('Invalid graveyard data provided');
            return false;
        }

        this.graveyard = [...graveyardData.cards];
        return true;
    }

    // Reset graveyard
    reset() {
        this.graveyard = [];
    }
}

// Global graveyard instance
export const graveyardManager = new GraveyardManager();

// Global functions for tooltip management
let graveyardTooltip = null;

export function showGraveyardTooltip(discardPileElement) {
    // Don't show tooltip if already dragging a card
    if (window.handManager && window.handManager.isHandDragging()) {
        return;
    }

    // Remove existing tooltip
    hideGraveyardTooltip();

    const formatCardName = (cardName) => {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    const tooltipHTML = graveyardManager.createTooltipHTML(formatCardName);
    
    // Create tooltip element
    graveyardTooltip = document.createElement('div');
    graveyardTooltip.className = 'graveyard-tooltip';
    graveyardTooltip.innerHTML = tooltipHTML;
    
    // Add wheel event listener to the tooltip for direct scrolling
    graveyardTooltip.addEventListener('wheel', (event) => {
        handleGraveyardTooltipScroll(event, graveyardTooltip);
    });
    
    document.body.appendChild(graveyardTooltip);
    
    // Add wheel event listener to the discard pile element for scroll forwarding
    addDiscardPileScrollSupport(discardPileElement);
    
    // Position tooltip
    const rect = discardPileElement.getBoundingClientRect();
    const tooltipRect = graveyardTooltip.getBoundingClientRect();
    
    // Position to the left of discard pile, similar to hero tooltips
    let leftPos = rect.left - tooltipRect.width - 20;
    let topPos = rect.top;
    
    // Adjust if going off screen
    if (leftPos < 10) {
        // Position to the right instead
        leftPos = rect.right + 20;
    }
    
    if (topPos < 10) {
        topPos = 10;
    }
    
    // Ensure it doesn't go off bottom of screen
    if (topPos + tooltipRect.height > window.innerHeight - 10) {
        topPos = window.innerHeight - tooltipRect.height - 10;
    }
    
    graveyardTooltip.style.left = `${leftPos}px`;
    graveyardTooltip.style.top = `${topPos}px`;
    
    // Fade in
    requestAnimationFrame(() => {
        graveyardTooltip.classList.add('visible');
    });
}

export function hideGraveyardTooltip() {
    if (graveyardTooltip) {
        graveyardTooltip.classList.remove('visible');
        setTimeout(() => {
            if (graveyardTooltip) {
                graveyardTooltip.remove();
                graveyardTooltip = null;
            }
        }, 200);
    }
    
    // Clean up wheel listeners
    cleanupDiscardPileScrollSupport();
}

// Handle tooltip scroll events
function handleGraveyardTooltipScroll(event, tooltip) {
    const cardsList = tooltip.querySelector('.graveyard-cards-list');
    if (!cardsList) return;
    
    // Check if the cards list is actually scrollable
    if (cardsList.scrollHeight <= cardsList.clientHeight) {
        return; // Not scrollable, ignore
    }
    
    // Prevent default behavior
    event.preventDefault();
    
    // Calculate scroll amount (adjust multiplier for smooth scrolling)
    const scrollAmount = event.deltaY * 1.05;
    
    // Apply scroll
    cardsList.scrollTop += scrollAmount;
    
    // Add visual feedback
    cardsList.classList.add('scrolling');
    clearTimeout(cardsList.scrollTimeout);
    cardsList.scrollTimeout = setTimeout(() => {
        cardsList.classList.remove('scrolling');
    }, 150);
}

function addDiscardPileScrollSupport(discardPileElement) {
    // Remove any existing wheel listener
    if (discardPileElement.graveyardWheelListener) {
        discardPileElement.removeEventListener('wheel', discardPileElement.graveyardWheelListener);
    }
    
    // Create new wheel listener
    discardPileElement.graveyardWheelListener = (event) => {
        // Only handle if graveyard tooltip is currently visible
        if (!graveyardTooltip) return;
        
        // Forward the scroll event to the tooltip
        handleGraveyardTooltipScroll(event, graveyardTooltip);
    };
    
    // Add the wheel listener with passive: false to allow preventDefault
    discardPileElement.addEventListener('wheel', discardPileElement.graveyardWheelListener, { passive: false });
}

// Clean up wheel listeners
function cleanupDiscardPileScrollSupport() {
    const discardPileElements = document.querySelectorAll('.discard-pile-slot');
    discardPileElements.forEach(element => {
        if (element.graveyardWheelListener) {
            element.removeEventListener('wheel', element.graveyardWheelListener);
            delete element.graveyardWheelListener;
        }
    });
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.graveyardManager = graveyardManager;
    window.showGraveyardTooltip = showGraveyardTooltip;
    window.hideGraveyardTooltip = hideGraveyardTooltip;
}

// Add CSS styles for graveyard tooltip
if (typeof document !== 'undefined' && !document.getElementById('graveyardTooltipStyles')) {
    const style = document.createElement('style');
    style.id = 'graveyardTooltipStyles';
    style.textContent = `
        .graveyard-tooltip {
            position: fixed;
            background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 12px;
            padding: 16px;
            min-width: 250px;
            max-width: 350px;
            max-height: 400px;
            z-index: 10000;
            opacity: 0;
            transform: translateY(5px);
            transition: all 0.2s ease;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.8);
            pointer-events: none;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif;
        }
        
        .graveyard-tooltip.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        .graveyard-tooltip-title {
            color: #f0f0f0;
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 12px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .graveyard-cards-list {
            max-height: 250px;
            overflow-y: auto;
            margin-bottom: 10px;
        }
        
        .graveyard-cards-list::-webkit-scrollbar {
            width: 6px;
        }
        
        .graveyard-cards-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }
        
        .graveyard-cards-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.6);
            border-radius: 3px;
        }
        
        .graveyard-cards-list::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.8);
        }
        
        .graveyard-card-entry {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 10px;
            margin: 4px 0;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            border-left: 3px solid #ffffff;
            transition: all 0.2s ease;
        }
        
        .graveyard-card-entry:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateX(2px);
        }
        
        .graveyard-card-name {
            color: #fff;
            font-weight: 500;
            font-size: 14px;
        }
        
        .graveyard-card-count {
            color: #e0e0e0;
            font-weight: bold;
            font-size: 12px;
            padding: 2px 8px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            white-space: nowrap;
        }
        
        .graveyard-summary {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.3);
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }
        
        .graveyard-tooltip-content.empty {
            text-align: center;
            padding: 10px;
        }
        
        .graveyard-empty {
            color: rgba(255, 255, 255, 0.5);
            font-style: italic;
            padding: 20px 10px;
        }
        
        /* Ensure discard pile has proper hover styling */
        .discard-pile-slot:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: #ffffff;
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
        }

        .graveyard-cards-list.scrolling {
            background: rgba(255, 255, 255, 0.15);
        }

        /* Add scroll indicator shadow */
        .graveyard-cards-list[data-scrollable="true"]::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 10px;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.3));
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
}