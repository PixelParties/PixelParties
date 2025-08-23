// alchemicJournal.js - AlchemicJournal Artifact Handler Module

import { getCardsByType } from '../cardDatabase.js';

export const alchemicJournalArtifact = {
    // Card name this artifact handles
    cardName: 'AlchemicJournal',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`AlchemicJournal clicked at index ${cardIndex}`);
        
        // Activate the alchemic journal effect
        await this.activateAlchemicJournal(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`AlchemicJournal dragged outside hand from index ${cardIndex}`);
        
        // Activate the alchemic journal effect
        await this.activateAlchemicJournal(cardIndex, heroSelection);
    },
    
    // Core logic to select and add 2 different random potions
    async activateAlchemicJournal(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const goldManager = heroSelection.getGoldManager();
        
        if (!handManager || !goldManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Get cost from card database
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 3; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showAlchemicJournalError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'AlchemicJournal');
        
        console.log(`AlchemicJournal: Spent ${cost} gold to activate`);
        
        // Remove AlchemicJournal card from hand first
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Get all potion cards from the database
        const allPotions = getCardsByType('Potion');
        const potionNames = allPotions.map(potion => potion.name);
        
        if (potionNames.length === 0) {
            console.warn('🧪 AlchemicJournal: No potions found in database!');
            this.showAlchemicJournalAnimation(cardIndex, [], cost);
            await heroSelection.saveGameState();
            return;
        }
        
        // Select 2 different random potions
        const selectedPotions = this.selectRandomPotions(potionNames, 2);
        
        // Check hand capacity
        const maxHandSize = handManager.maxHandSize || 10;
        const currentHandSize = handManager.getHandSize();
        const availableSlots = maxHandSize - currentHandSize;
        
        // Add potions to hand (limited by available space)
        const potionsToAdd = Math.min(selectedPotions.length, availableSlots);
        const addedPotions = [];
        
        for (let i = 0; i < potionsToAdd; i++) {
            const potionName = selectedPotions[i];
            const success = handManager.addCardToHand(potionName);
            if (success) {
                addedPotions.push(potionName);
                console.log(`🧪 AlchemicJournal: Added ${potionName} to hand`);
            }
        }
        
        // Show visual feedback
        this.showAlchemicJournalAnimation(cardIndex, addedPotions, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay(); // Update gold display after spending
        
        // Save game state
        await heroSelection.saveGameState();
        
        const addedCount = addedPotions.length;
        const missedCount = selectedPotions.length - addedCount;
        
        console.log(`🧪 AlchemicJournal activated! Added ${addedCount} potions${missedCount > 0 ? ` (${missedCount} couldn't fit in hand)` : ''} for ${cost} gold.`);
    },
    
    // Show error message when not enough gold
    showAlchemicJournalError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alchemic-journal-error';
        errorDiv.innerHTML = `
            <div class="alchemic-journal-error-content">
                <span class="alchemic-journal-error-icon">⛔</span>
                <span class="alchemic-journal-error-text">${message}</span>
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
            background: linear-gradient(135deg, #dc3545 0%, #8b4513 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: alchemicJournalErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'alchemicJournalErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Select N different random potions from the available list
    selectRandomPotions(potionNames, count) {
        if (potionNames.length === 0) {
            return [];
        }
        
        // Create a copy to avoid modifying the original array
        const availablePotions = [...potionNames];
        const selectedPotions = [];
        
        // Select up to 'count' different potions
        const selectionsToMake = Math.min(count, availablePotions.length);
        
        for (let i = 0; i < selectionsToMake; i++) {
            const randomIndex = Math.floor(Math.random() * availablePotions.length);
            const selectedPotion = availablePotions[randomIndex];
            
            selectedPotions.push(selectedPotion);
            
            // Remove the selected potion to ensure we don't select it again
            availablePotions.splice(randomIndex, 1);
        }
        
        return selectedPotions;
    },
    
    // Show alchemic journal brewing animation (updated to include cost)
    showAlchemicJournalAnimation(cardIndex, addedPotions, cost) {
        // Create brewing animation
        const journalBurst = document.createElement('div');
        journalBurst.className = 'alchemic-journal-effect-burst';
        
        // Create potion bottle icons based on how many were added
        const potionIcons = addedPotions.map(() => '🧪').join(' ');
        
        journalBurst.innerHTML = `
            <div class="journal-brewing">
                <span class="journal-book">📖</span>
                <div class="brewing-sparkles">
                    <span class="sparkle">✨</span>
                    <span class="sparkle">✨</span>
                    <span class="sparkle">✨</span>
                </div>
            </div>
            <div class="journal-potions">
                <div class="potion-bottles">${potionIcons}</div>
            </div>
            <div class="journal-text">
                <div class="journal-main">Alchemic Discovery!</div>
                <div class="journal-count">+${addedPotions.length} Random Potion${addedPotions.length !== 1 ? 's' : ''}!</div>
                <div class="journal-cost">Cost: ${cost} Gold</div>
                ${addedPotions.length > 0 ? 
                    `<div class="journal-names">${addedPotions.map(name => this.formatPotionName(name)).join(', ')}</div>` : 
                    '<div class="journal-empty">No potions discovered!</div>'
                }
            </div>
        `;
        
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                journalBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                journalBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                journalBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                journalBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(journalBurst);
        
        // Remove after animation
        setTimeout(() => {
            journalBurst.remove();
        }, 4000);
        
        // Play sound effect if available
        this.playAlchemicJournalSound();
    },
    
    // Format potion name for display
    formatPotionName(potionName) {
        return potionName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Play alchemic brewing sound
    playAlchemicJournalSound() {
        // Placeholder for sound effect
        console.log('🎵 Alchemic brewing sound!');
    }
};

// Add styles for the animation (updated to include error styles and cost display)
if (typeof document !== 'undefined' && !document.getElementById('alchemicJournalStyles')) {
    const style = document.createElement('style');
    style.id = 'alchemicJournalStyles';
    style.textContent = `
        /* Alchemic Journal Effect Animation */
        .alchemic-journal-effect-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 4s ease-out forwards;
            min-width: 300px;
        }
        
        .journal-brewing {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
            animation: floatUp 3s ease-out;
        }
        
        .journal-book {
            font-size: 45px;
            animation: bookFlip 2s ease-in-out infinite;
            filter: drop-shadow(0 0 8px rgba(139, 69, 19, 0.8));
        }
        
        .brewing-sparkles {
            display: flex;
            gap: 8px;
        }
        
        .sparkle {
            font-size: 20px;
            animation: sparkle 1.5s ease-in-out infinite;
            filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.8));
        }
        
        .sparkle:nth-child(1) {
            animation-delay: 0s;
        }
        
        .sparkle:nth-child(2) {
            animation-delay: 0.3s;
        }
        
        .sparkle:nth-child(3) {
            animation-delay: 0.6s;
        }
        
        .journal-potions {
            text-align: center;
            margin-bottom: 15px;
            animation: potionAppear 1s ease-out 0.5s both;
        }
        
        .potion-bottles {
            font-size: 32px;
            letter-spacing: 10px;
            animation: bounce 1s ease-out 1s;
            filter: drop-shadow(0 0 8px rgba(138, 43, 226, 0.6));
        }
        
        .journal-text {
            text-align: center;
            animation: textReveal 1s ease-out 1.5s both;
        }
        
        .journal-main {
            font-size: 24px;
            font-weight: bold;
            color: #8b4513;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(139, 69, 19, 0.8);
            margin-bottom: 5px;
        }
        
        .journal-count {
            font-size: 20px;
            font-weight: bold;
            color: #9932cc;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(153, 50, 204, 0.6);
            margin-bottom: 8px;
        }
        
        .journal-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            margin-bottom: 8px;
        }
        
        .journal-names {
            font-size: 14px;
            color: #4b0082;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
            max-width: 280px;
            line-height: 1.3;
        }
        
        .journal-empty {
            font-size: 16px;
            color: #696969;
            font-style: italic;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
        }
        
        /* Error styles */
        .alchemic-journal-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .alchemic-journal-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .alchemic-journal-error-icon {
            font-size: 20px;
        }
        
        .alchemic-journal-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes alchemicJournalErrorBounce {
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
        
        @keyframes alchemicJournalErrorFade {
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
                transform: translateY(-80px);
            }
        }
        
        @keyframes bookFlip {
            0%, 100% {
                transform: rotateY(0deg);
            }
            50% {
                transform: rotateY(180deg);
            }
        }
        
        @keyframes sparkle {
            0%, 100% {
                transform: scale(1) rotate(0deg);
                opacity: 0.7;
            }
            50% {
                transform: scale(1.3) rotate(180deg);
                opacity: 1;
            }
        }
        
        @keyframes potionAppear {
            from {
                transform: scale(0) rotateY(0deg);
                opacity: 0;
            }
            to {
                transform: scale(1) rotateY(360deg);
                opacity: 1;
            }
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
                transform: translateY(0);
            }
            40% {
                transform: translateY(-10px);
            }
            60% {
                transform: translateY(-5px);
            }
        }
        
        @keyframes textReveal {
            from {
                transform: scale(0.5);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            0% {
                opacity: 1;
            }
            75% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }
        
        /* Enhanced hover effects for AlchemicJournal cards */
        .hand-card[data-card-name="AlchemicJournal"]:hover {
            transform: translateY(-10px) scale(1.03);
            box-shadow: 0 10px 30px rgba(139, 69, 19, 0.5);
            transition: all 0.3s ease;
        }
        
        .hand-card[data-card-name="AlchemicJournal"] {
            position: relative;
            overflow: visible;
        }
        
        @keyframes journalGlow {
            0%, 100% { 
                transform: scale(1) rotate(0deg); 
                opacity: 0.8; 
            }
            50% { 
                transform: scale(1.1) rotate(5deg); 
                opacity: 1; 
            }
        }
        
        @keyframes journalSparkle {
            0%, 100% { 
                transform: scale(1); 
                opacity: 0.6; 
            }
            50% { 
                transform: scale(1.2); 
                opacity: 1; 
            }
        }
    `;
    document.head.appendChild(style);
}