// birthdayPresent.js - Birthday Present Artifact Handler Module with Counter System

export const birthdayPresentArtifact = {
    // Card name this artifact handles
    cardName: 'BirthdayPresent',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {       
        // Activate the birthday present effect
        await this.activateBirthdayPresent(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand (same as click for this artifact)
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {        
        // Activate the birthday present effect
        await this.activateBirthdayPresent(cardIndex, heroSelection);
    },

    // Core logic to draw cards for player and increment birthday present counter
    async activateBirthdayPresent(cardIndex, heroSelection) {
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
        const cost = cardInfo?.cost || 0; // Birthday Present should be free, but check anyway
        
        // Check if player has enough gold (if any cost)
        if (cost > 0) {
            const currentGold = goldManager.getPlayerGold();
            if (currentGold < cost) {
                this.showBirthdayPresentError(
                    `Need ${cost} Gold. Have ${currentGold} Gold.`,
                    cardIndex
                );
                return;
            }
            
            // Spend the gold
            goldManager.addPlayerGold(-cost, 'BirthdayPresent');
        }
                
        // Remove Birthday Present card from hand first
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Check deck size and hand capacity for drawing cards
        const deckSize = deckManager.getDeckSize();
        const maxHandSize = handManager.maxHandSize || 10;
        const currentHandSize = handManager.getHandSize();
        const availableSlots = maxHandSize - currentHandSize;
        
        // Draw up to 2 cards, limited by deck size and hand capacity
        const cardsToDraw = Math.min(2, deckSize, availableSlots);
        
        let drawnCards = [];
        if (cardsToDraw > 0) {
            drawnCards = handManager.drawCards(cardsToDraw);
        } 
        
        // Increment the birthday present counter by 2 (for opponent draws)
        heroSelection.birthdayPresentCounter = (heroSelection.birthdayPresentCounter || 0) + 2;
        
        // Show visual feedback
        this.showBirthdayPresentAnimation(cardIndex, cardsToDraw, 2);
        
        // Update UI
        heroSelection.updateHandDisplay();
        if (cost > 0) {
            heroSelection.updateGoldDisplay();
        }
        
        // Save game state (this persists the birthdayPresentCounter)
        await heroSelection.saveGameState();
    },
    
    // Show error message when not enough gold (unlikely for Birthday Present)
    showBirthdayPresentError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'birthday-present-error';
        errorDiv.innerHTML = `
            <div class="birthday-present-error-content">
                <span class="birthday-present-error-icon">⛔</span>
                <span class="birthday-present-error-text">${message}</span>
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
            animation: birthdayPresentErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'birthdayPresentErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show birthday present animation
    showBirthdayPresentAnimation(cardIndex, cardsDrawn, counterIncrement) {
        // Create birthday present animation
        const birthdayBurst = document.createElement('div');
        birthdayBurst.className = 'birthday-present-effect-burst';
        birthdayBurst.innerHTML = `
            <div class="birthday-present-animation">
                <span class="present">🎁</span>
                <span class="present">🎉</span>
            </div>
            <div class="birthday-present-text">
                <div class="birthday-present-draw">+${cardsDrawn} Cards!</div>
                <div class="birthday-present-opponent">+${counterIncrement} to Opponent Counter</div>
            </div>
        `;
        
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                birthdayBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                birthdayBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                birthdayBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                birthdayBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(birthdayBurst);
        
        // Remove after animation
        setTimeout(() => {
            birthdayBurst.remove();
        }, 3000);
        
        // Play sound effect if available
        this.playBirthdayPresentSound();
    },
    
    // Play birthday present sound
    playBirthdayPresentSound() {
        // Placeholder for sound effect
        console.log('🎵 Birthday Present celebration sound!');
    },

    // Process birthday present counter at battle end to give cards to opponent
    // This should be called by the battle system when processing rewards
    processBirthdayPresentCounter(counter, targetHeroSelection) {
        if (!counter || counter <= 0 || !targetHeroSelection) {
            return 0;
        }
        
        const handManager = targetHeroSelection.getHandManager();
        if (!handManager) {
            return 0;
        }
        
        // Give the opponent cards equal to the counter
        const drawnCards = handManager.drawCards(counter);
        
        // Show visual feedback
        this.showBirthdayPresentOpponentDraw(counter, drawnCards.length);
        
        // Update UI
        targetHeroSelection.updateHandDisplay();
        
        // Save state
        targetHeroSelection.saveGameState();
        
        return drawnCards.length;
    },

    // Show visual feedback for opponent draws
    showBirthdayPresentOpponentDraw(expectedCards, actualCards) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'birthday-present-opponent-draw-feedback';
        feedbackDiv.innerHTML = `
            <div class="birthday-present-opponent-draw-content">
                <span class="birthday-present-opponent-draw-icon">🎁</span>
                <span class="birthday-present-opponent-draw-text">Birthday Present: +${actualCards} Cards!</span>
            </div>
        `;
        
        feedbackDiv.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: birthdayPresentOpponentDrawFeedback 3s ease-out;
            box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(feedbackDiv);
        
        setTimeout(() => {
            feedbackDiv.remove();
        }, 3000);
    }
};

// Add styles for the animation (keeping existing styles with small update)
if (typeof document !== 'undefined' && !document.getElementById('birthdayPresentStyles')) {
    const style = document.createElement('style');
    style.id = 'birthdayPresentStyles';
    style.textContent = `
        /* Birthday Present Effect Animation */
        .birthday-present-effect-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
        }
        
        .birthday-present-animation {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-bottom: 15px;
            animation: floatUp 2s ease-out;
        }
        
        .present {
            font-size: 40px;
            animation: bounce 1.5s ease-out infinite;
            display: inline-block;
            filter: drop-shadow(0 0 8px rgba(255, 192, 203, 0.6));
        }
        
        .present:nth-child(1) {
            animation-delay: 0s;
        }
        
        .present:nth-child(2) {
            animation-delay: 0.3s;
        }
        
        .birthday-present-text {
            text-align: center;
            animation: pulse 1s ease-out;
        }
        
        .birthday-present-draw {
            font-size: 22px;
            font-weight: bold;
            color: #28a745;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(40, 167, 69, 0.8);
            margin-bottom: 5px;
        }
        
        .birthday-present-opponent {
            font-size: 16px;
            font-weight: bold;
            color: #ff6b6b;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 107, 107, 0.7);
        }
        
        /* Error styles */
        .birthday-present-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .birthday-present-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .birthday-present-error-icon {
            font-size: 20px;
        }
        
        .birthday-present-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes birthdayPresentErrorBounce {
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
        
        @keyframes birthdayPresentErrorFade {
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
        
        @keyframes bounce {
            0%, 100% {
                transform: translateY(0) scale(1);
            }
            50% {
                transform: translateY(-10px) scale(1.1);
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

        /* Opponent draw feedback animations */
        @keyframes birthdayPresentOpponentDrawFeedback {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px) scale(0.8);
            }
            20% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1.1);
            }
            80% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px) scale(0.9);
            }
        }
        
        .birthday-present-opponent-draw-feedback {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .birthday-present-opponent-draw-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .birthday-present-opponent-draw-icon {
            font-size: 24px;
            animation: bounce 1s ease-out infinite;
        }
        
        .birthday-present-opponent-draw-text {
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
        }
    `;
    document.head.appendChild(style);
}