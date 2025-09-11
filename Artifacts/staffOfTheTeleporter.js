// staffOfTheTeleporter.js - Staff of the Teleporter Artifact Handler Module

export const staffOfTheTeleporterArtifact = {
    // Card name this artifact handles
    cardName: 'StaffOfTheTeleporter',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`Staff of the Teleporter clicked at index ${cardIndex}`);
        
        // Activate the staff effect
        await this.activateStaff(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`Staff of the Teleporter dragged outside hand from index ${cardIndex}`);
        
        // Activate the staff effect
        await this.activateStaff(cardIndex, heroSelection);
    },

    // Core logic to discard entire hand and redraw
    async activateStaff(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const deckManager = heroSelection.getDeckManager();
        const goldManager = heroSelection.getGoldManager();
        const graveyardManager = heroSelection.graveyardManager;
        
        if (!handManager || !deckManager || !goldManager || !graveyardManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Get cost from card database
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 2; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showStaffError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Get current hand before making changes
        const currentHand = handManager.getHand();
        const handSize = currentHand.length;
        
        if (handSize === 0) {
            this.showStaffError('No cards to teleport!', cardIndex);
            return;
        }
        
        // Spend the gold
        goldManager.addPlayerGold(-cost, 'Staff of the Teleporter');
        console.log(`Staff of the Teleporter: Spent ${cost} gold to activate`);
        
        // Add all cards in hand to graveyard (including the staff itself)
        currentHand.forEach(cardName => {
            graveyardManager.addCard(cardName);
        });
        
        console.log(`📜 Staff of the Teleporter: Added ${handSize} cards to graveyard: ${currentHand.join(', ')}`);
        
        // Clear the entire hand
        handManager.clearHand();
        
        // Check deck size and draw constraints
        const deckSize = deckManager.getDeckSize();
        const maxHandSize = handManager.maxHandSize || 10;
        
        // Draw the same number of cards that were discarded, limited by deck size and max hand size
        const cardsToDraw = Math.min(handSize, deckSize, maxHandSize);
        
        let drawnCards = [];
        if (cardsToDraw > 0) {
            drawnCards = handManager.drawCards(cardsToDraw);
            console.log(`📜 Staff of the Teleporter: Drew ${drawnCards.length} new cards: ${drawnCards.join(', ')}`);
        } else {
            console.log('📜 Staff of the Teleporter: No cards could be drawn (deck empty)');
        }
        
        // Show visual feedback
        this.showStaffAnimation(cardIndex, handSize, drawnCards.length, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`📜 Staff of the Teleporter activated! Discarded ${handSize} cards, drew ${drawnCards.length} new cards for ${cost} gold.`);
    },
    
    // Show error message when not enough gold or no cards
    showStaffError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'staff-error';
        errorDiv.innerHTML = `
            <div class="staff-error-content">
                <span class="staff-error-icon">🚫</span>
                <span class="staff-error-text">${message}</span>
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
            background: linear-gradient(135deg, #dc3545 0%, #6f42c1 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: staffErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'staffErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show staff teleportation animation
    showStaffAnimation(cardIndex, cardsDiscarded, cardsDrawn, cost) {
        // Create teleportation effect
        const staffBurst = document.createElement('div');
        staffBurst.className = 'staff-effect-burst';
        staffBurst.innerHTML = `
            <div class="staff-teleporting">
                <span class="staff-icon">📜</span>
                <span class="teleport-effect">✨</span>
                <span class="teleport-effect">🌀</span>
                <span class="teleport-effect">✨</span>
            </div>
            <div class="staff-text">
                <div class="staff-discard">-${cardsDiscarded} Cards</div>
                <div class="staff-draw">+${cardsDrawn} Cards</div>
                <div class="staff-cost">Cost: ${cost} Gold</div>
            </div>
        `;
        
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                staffBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                staffBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                staffBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                staffBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(staffBurst);
        
        // Remove after animation
        setTimeout(() => {
            staffBurst.remove();
        }, 3000);
        
        // Play sound effect if available
        this.playStaffSound();
    },
    
    // Play staff teleportation sound
    playStaffSound() {
        // Placeholder for sound effect
        console.log('🎵 Staff teleportation sound!');
    }
};

// Add styles for the animation
if (typeof document !== 'undefined' && !document.getElementById('staffOfTheTeleporterStyles')) {
    const style = document.createElement('style');
    style.id = 'staffOfTheTeleporterStyles';
    style.textContent = `
        /* Staff Effect Animation */
        .staff-effect-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
        }
        
        .staff-teleporting {
            display: flex;
            gap: 15px;
            justify-content: center;
            align-items: center;
            margin-bottom: 15px;
            animation: teleportFloat 2s ease-out;
        }
        
        .staff-icon {
            font-size: 40px;
            animation: staffGlow 2s ease-out infinite;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(111, 66, 193, 0.8));
        }
        
        .teleport-effect {
            font-size: 30px;
            animation: teleportSpin 1.5s linear infinite;
            display: inline-block;
        }
        
        .teleport-effect:nth-child(2) {
            animation-delay: 0.2s;
            filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
        }
        
        .teleport-effect:nth-child(3) {
            animation-delay: 0.4s;
            font-size: 35px;
            filter: drop-shadow(0 0 12px rgba(138, 43, 226, 0.8));
        }
        
        .teleport-effect:nth-child(4) {
            animation-delay: 0.6s;
            filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
        }
        
        .staff-text {
            text-align: center;
            animation: pulse 1s ease-out;
        }
        
        .staff-discard {
            font-size: 20px;
            font-weight: bold;
            color: #dc3545;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(220, 53, 69, 0.8);
            margin-bottom: 5px;
        }
        
        .staff-draw {
            font-size: 22px;
            font-weight: bold;
            color: #6f42c1;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(111, 66, 193, 0.8);
            margin-bottom: 5px;
        }
        
        .staff-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
        }
        
        /* Error styles */
        .staff-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .staff-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .staff-error-icon {
            font-size: 20px;
        }
        
        .staff-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes staffErrorBounce {
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
        
        @keyframes staffErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes teleportFloat {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-60px);
            }
        }
        
        @keyframes staffGlow {
            0%, 100% {
                filter: drop-shadow(0 0 10px rgba(111, 66, 193, 0.8));
                transform: scale(1);
            }
            50% {
                filter: drop-shadow(0 0 20px rgba(111, 66, 193, 1));
                transform: scale(1.1);
            }
        }
        
        @keyframes teleportSpin {
            from {
                transform: rotate(0deg) scale(1);
            }
            50% {
                transform: rotate(180deg) scale(1.3);
            }
            to {
                transform: rotate(360deg) scale(1);
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
        
        /* Enhanced hover effects for staff cards */
        .hand-card[data-card-name="StaffOfTheTeleporter"]:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 8px 25px rgba(111, 66, 193, 0.6);
            transition: all 0.3s ease;
        }
        
        .hand-card[data-card-name="StaffOfTheTeleporter"] {
            position: relative;
            overflow: visible;
        }
        
        .hand-card[data-card-name="StaffOfTheTeleporter"]::before {
            content: "📜";
            position: absolute;
            top: -5px;
            right: -5px;
            font-size: 18px;
            animation: staffIconGlow 3s ease-in-out infinite;
            filter: drop-shadow(0 0 8px rgba(111, 66, 193, 0.8));
            z-index: 5;
        }
        
        @keyframes staffIconGlow {
            0%, 100% { 
                transform: scale(1); 
                filter: drop-shadow(0 0 8px rgba(111, 66, 193, 0.8));
            }
            50% { 
                transform: scale(1.2); 
                filter: drop-shadow(0 0 15px rgba(111, 66, 193, 1));
            }
        }
    `;
    document.head.appendChild(style);
}