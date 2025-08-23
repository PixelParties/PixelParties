// wheels.js - Wheels Artifact Handler Module

export const wheelsArtifact = {
    // Card name this artifact handles
    cardName: 'Wheels',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`Wheels clicked at index ${cardIndex}`);
        
        // Activate the treasure hunter's backpack effect
        await this.activateWheels(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`Wheels dragged outside hand from index ${cardIndex}`);
        
        // Activate the treasure hunter's backpack effect
        await this.activateWheels(cardIndex, heroSelection);
    },

    // Core logic to draw cards and remove one
    async activateWheels(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const deckManager = heroSelection.getDeckManager();
        const goldManager = heroSelection.getGoldManager();
        
        if (!handManager || !deckManager || !goldManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Get cost from card database
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 1; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showWheelsError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'Wheels');
        
        console.log(`Wheels: Spent ${cost} gold to activate`);
        
        // Remove Wheels card from hand first
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Check deck size and hand capacity
        const deckSize = deckManager.getDeckSize();
        const maxHandSize = handManager.maxHandSize || 10;
        const currentHandSize = handManager.getHandSize();
        const availableSlots = maxHandSize - currentHandSize;
        
        // Draw up to 4 cards, limited by deck size and hand capacity
        const cardsToDraw = Math.min(4, deckSize, availableSlots);
        
        let drawnCards = [];
        if (cardsToDraw > 0) {
            drawnCards = handManager.drawCards(cardsToDraw);
            console.log(`🎡 Wheels: Drew ${drawnCards.length} cards: ${drawnCards.join(', ')}`);
        } else {
            console.log('🎡 Wheels: No cards could be drawn (deck empty or hand full)');
        }
        
        // Now remove one random card, prioritizing cards that weren't just drawn
        const currentHand = handManager.getHand();
        let cardWasRemoved = false;
        
        if (currentHand.length > 0) {
            // Create a list of card indices that can be removed
            // We want to avoid the cards we just drew if possible
            const candidatesForRemoval = [];
            const drawnCardsCopy = [...drawnCards]; // Copy to track which cards were drawn
            
            currentHand.forEach((cardName, index) => {
                // Check if this card was just drawn
                const drawnIndex = drawnCardsCopy.indexOf(cardName);
                if (drawnIndex !== -1) {
                    // This card was just drawn, remove it from our tracking
                    drawnCardsCopy.splice(drawnIndex, 1);
                    // Don't add to candidates (we prefer not to remove newly drawn cards)
                } else {
                    // This card was not just drawn, it's a good candidate for removal
                    candidatesForRemoval.push(index);
                }
            });
            
            // Choose which card to remove
            let indexToRemove;
            if (candidatesForRemoval.length > 0) {
                // Remove a random non-newly-drawn card
                const randomCandidateIndex = Math.floor(Math.random() * candidatesForRemoval.length);
                indexToRemove = candidatesForRemoval[randomCandidateIndex];
                console.log(`🎡 Wheels: Removing original card "${currentHand[indexToRemove]}" from hand`);
            } else {
                // All cards in hand were just drawn, remove a random one
                indexToRemove = Math.floor(Math.random() * currentHand.length);
                console.log(`🎡 Wheels: Removing newly drawn card "${currentHand[indexToRemove]}" from hand`);
            }
            
            handManager.removeCardFromHandByIndex(indexToRemove);
            cardWasRemoved = true;
        }
        
        // Show visual feedback
        this.showWheelsAnimation(cardIndex, cardsToDraw, cardWasRemoved, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay(); // Update gold display after spending
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`🎡 Wheels activated! Drew ${cardsToDraw} cards${cardWasRemoved ? ' and removed 1 card' : ''} for ${cost} gold.`);
    },
    
    // Show error message when not enough gold
    showWheelsError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'wheels-error';
        errorDiv.innerHTML = `
            <div class="wheels-error-content">
                <span class="wheels-error-icon">⛔</span>
                <span class="wheels-error-text">${message}</span>
            </div>
        `;
        
        // Position near the card or center of hand
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                errorDiv.style.left = `${cardRect.left + cardRect.width / 2}px`;
                errorDiv.style.top = `${cardRect.top - 60}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                errorDiv.style.left = `${handRect.left + handRect.width / 2}px`;
                errorDiv.style.top = `${handRect.top - 60}px`;
            }
        } else {
            // Fallback to center of screen
            errorDiv.style.left = '50%';
            errorDiv.style.top = '50%';
        }
        
        errorDiv.style.cssText += `
            position: fixed;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: wheelsErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'wheelsErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show wheels spinning animation (updated to include cost)
    showWheelsAnimation(cardIndex, cardsDrawn, cardRemoved, cost) {
        // Create spinning wheels animation
        const wheelsBurst = document.createElement('div');
        wheelsBurst.className = 'wheels-effect-burst';
        wheelsBurst.innerHTML = `
            <div class="wheels-spinning">
                <span class="wheel">🎡</span>
                <span class="wheel">🎡</span>
            </div>
            <div class="wheels-text">
                <div class="wheels-draw">+${cardsDrawn} Cards!</div>
                ${cardRemoved ? '<div class="wheels-remove">-1 Card</div>' : ''}
                <div class="wheels-cost">Cost: ${cost} Gold</div>
            </div>
        `;
        
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                wheelsBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                wheelsBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                wheelsBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                wheelsBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(wheelsBurst);
        
        // Remove after animation
        setTimeout(() => {
            wheelsBurst.remove();
        }, 3000);
        
        // Play sound effect if available
        this.playWheelsSound();
    },
    
    // Play wheels spinning sound
    playWheelsSound() {
        // Placeholder for sound effect
        console.log('🎵 Wheels spinning sound!');
    }
};

// Add styles for the animation (updated to include error styles and cost display)
if (typeof document !== 'undefined' && !document.getElementById('wheelsStyles')) {
    const style = document.createElement('style');
    style.id = 'wheelsStyles';
    style.textContent = `
        /* Wheels Effect Animation */
        .wheels-effect-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
        }
        
        .wheels-spinning {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-bottom: 15px;
            animation: floatUp 2s ease-out;
        }
        
        .wheel {
            font-size: 40px;
            animation: spin 2s linear infinite;
            display: inline-block;
            filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
        }
        
        .wheel:nth-child(1) {
            animation-delay: 0s;
        }
        
        .wheel:nth-child(2) {
            animation-delay: 0.3s;
        }
        
        .wheels-text {
            text-align: center;
            animation: pulse 1s ease-out;
        }
        
        .wheels-draw {
            font-size: 22px;
            font-weight: bold;
            color: #28a745;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(40, 167, 69, 0.8);
            margin-bottom: 5px;
        }
        
        .wheels-remove {
            font-size: 18px;
            font-weight: bold;
            color: #dc3545;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(220, 53, 69, 0.6);
            margin-bottom: 5px;
        }
        
        .wheels-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
        }
        
        /* Error styles */
        .wheels-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .wheels-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .wheels-error-icon {
            font-size: 20px;
        }
        
        .wheels-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes wheelsErrorBounce {
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
        
        @keyframes wheelsErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes floatUp {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-60px);
            }
        }
        
        @keyframes spin {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(360deg);
            }
        }
        
        @keyframes pulse {
            0% {
                transform: scale(0.5);
                opacity: 0;
            }
            50% {
                transform: scale(1.2);
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            0% {
                opacity: 1;
            }
            70% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }
        
        /* Enhanced hover effects for wheel cards */
        .hand-card[data-card-name="Wheels"]:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
            transition: all 0.3s ease;
        }
        
        .hand-card[data-card-name="Wheels"] {
            position: relative;
            overflow: visible;
        }
        
        .hand-card[data-card-name="Wheels"]::before {
            content: "🎡";
            position: absolute;
            top: -5px;
            right: -5px;
            font-size: 18px;
            animation: wheelIconSpin 3s linear infinite;
            filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.8));
            z-index: 5;
        }
        
        @keyframes wheelIconSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}