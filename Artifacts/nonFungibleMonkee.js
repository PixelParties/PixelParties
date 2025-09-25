// nonFungibleMonkee.js - NonFungibleMonkee Artifact Handler Module

export const nonFungibleMonkeeArtifact = {
    // Card name this artifact handles
    cardName: 'NonFungibleMonkee',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {        
        // Consume the card and give Monkee reward
        await this.consumeAndReward(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {        
        // Consume the card and give Monkee reward
        await this.consumeAndReward(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and award random Monkee
    async consumeAndReward(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const goldManager = heroSelection.getGoldManager();
        const deckManager = heroSelection.getDeckManager();
        
        if (!handManager || !goldManager || !deckManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Get cost from card database
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 10; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showNonFungibleMonkeeError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'NonFungibleMonkee');
                
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Get 1 prioritized Monkee
        const selectedMonkee = this.selectPrioritizedMonkee(heroSelection);
        
        if (!selectedMonkee) {
            console.error('Failed to get Monkee creature');
            return;
        }
        
        // Add Monkee to deck
        deckManager.addCardReward(selectedMonkee);
        
        // Add Monkee to hand if there's space
        let addedToHand = false;
        if (!handManager.isHandFull()) {
            const added = handManager.addCardToHand(selectedMonkee);
            if (added) {
                addedToHand = true;
            }
        }
        
        // Show visual feedback
        this.showNonFungibleMonkeeAnimation(cardIndex, selectedMonkee, addedToHand, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateDeckDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
    },
    
    // Show error message when not enough gold
    showNonFungibleMonkeeError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'nonfungible-monkee-error';
        errorDiv.innerHTML = `
            <div class="nonfungible-monkee-error-content">
                <span class="nonfungible-monkee-error-icon">🐒</span>
                <span class="nonfungible-monkee-error-text">${message}</span>
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
            background: linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: nonFungibleMonkeeErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'nonFungibleMonkeeErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Select prioritized Monkee creature (least owned first)
    selectPrioritizedMonkee(heroSelection) {
        try {
            // Get all Monkee creatures
            const monkeeCreatures = this.getMonkeeCreatures(heroSelection);
            
            if (monkeeCreatures.length === 0) {
                console.error('No Monkee creatures found');
                return null;
            }
            
            // Get current deck to count existing Monkees
            const deckManager = heroSelection.getDeckManager();
            const currentDeck = deckManager.getDeck();
            
            // Count how many of each Monkee the player already has
            const monkeeCounts = {};
            monkeeCreatures.forEach(monkee => {
                monkeeCounts[monkee] = currentDeck.filter(card => card === monkee).length;
            });
            
            // Find the minimum count
            const minCount = Math.min(...Object.values(monkeeCounts));
            
            // Get all Monkees with the minimum count (tied for least owned)
            const leastOwnedMonkees = monkeeCreatures.filter(monkee => 
                monkeeCounts[monkee] === minCount
            );
            
            // Randomly select from the least owned Monkees
            const randomIndex = Math.floor(Math.random() * leastOwnedMonkees.length);
            const selectedMonkee = leastOwnedMonkees[randomIndex];
            
            return selectedMonkee;
            
        } catch (error) {
            console.error('Error selecting prioritized Monkee:', error);
            return null;
        }
    },
    
    // Get list of all Monkee creatures
    getMonkeeCreatures(heroSelection) {
        try {
            // Use hardcoded list of known Monkee creatures from cardDatabase
            // This is more reliable than trying to query the database dynamically
            const allMonkeeCreatures = ['CheekyMonkee', 'ResilientMonkee', 'NimbleMonkee', 'CriminalMonkee'];
            
            // Filter to only include creatures that exist in the card database
            const validMonkeeCreatures = allMonkeeCreatures.filter(monkeeName => {
                const cardInfo = heroSelection.getCardInfo ? heroSelection.getCardInfo(monkeeName) : null;
                return cardInfo && 
                       cardInfo.cardType === 'Spell' && 
                       cardInfo.subtype === 'Creature' &&
                       cardInfo.archetype === 'Monkees';
            });
                        
            if (validMonkeeCreatures.length === 0) {
                console.warn('No valid Monkee creatures found, using fallback list');
                return allMonkeeCreatures; // Use all known Monkees as fallback
            }
            
            return validMonkeeCreatures;
            
        } catch (error) {
            console.error('Error getting Monkee creatures from database:', error);
            
            // Fallback to hardcoded list if database access fails
            return ['CheekyMonkee', 'ResilientMonkee', 'NimbleMonkee', 'CriminalMonkee'];
        }
    },
    
    // Show NonFungibleMonkee activation animation
    showNonFungibleMonkeeAnimation(cardIndex, selectedMonkee, addedToHand, cost) {
        // Create floating Monkee animation
        const monkeeBurst = document.createElement('div');
        monkeeBurst.className = 'nonfungible-monkee-burst';
        
        // Create card display
        const formattedMonkeeName = this.formatCardName(selectedMonkee);
        const handInfo = addedToHand ? 
            `<div class="hand-info">+1 to hand!</div>` : '';
        
        monkeeBurst.innerHTML = `
            <div class="monkee-icon">🐒</div>
            <div class="monkee-text">NFM Minted!</div>
            <div class="monkee-cost">Cost: ${cost} Gold</div>
            <div class="monkee-name">${formattedMonkeeName}</div>
            <div class="deck-info">+1 to deck!</div>
            ${handInfo}
        `;
        
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                monkeeBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                monkeeBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                monkeeBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                monkeeBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(monkeeBurst);
        
        // Remove after animation
        setTimeout(() => {
            monkeeBurst.remove();
        }, 3000);
        
        // Play sound effect if available
        this.playMonkeeSound();
    },
    
    // Handle disenchant effect - adds GoldenBananas to hand
    processDisenchantEffect(cardName, heroSelection) {
        console.log(`Processing disenchant effect for ${cardName}`);
        
        // Only process if the disenchanted card was NonFungibleMonkee
        if (cardName !== this.cardName) {
            return false;
        }
        
        if (!heroSelection) {
            console.error('No heroSelection instance available for disenchant effect');
            return false;
        }
        
        const handManager = heroSelection.getHandManager();
        const deckManager = heroSelection.getDeckManager();
        
        if (!handManager || !deckManager) {
            console.error('HandManager or DeckManager not available for disenchant effect');
            return false;
        }
        
        let addedToHand = false;
        let addedToDeck = false;
        
        // Add GoldenBananas to hand if there's space
        if (!handManager.isHandFull()) {
            const added = handManager.addCardToHand('GoldenBananas');
            if (added) {
                addedToHand = true;
                console.log('NonFungibleMonkee disenchant: Added GoldenBananas to hand');
            }
        }
        
        // Always add GoldenBananas to deck (increases future draw chances)
        const deckAdded = deckManager.addCardReward('GoldenBananas');
        if (deckAdded) {
            addedToDeck = true;
            console.log('NonFungibleMonkee disenchant: Added GoldenBananas to deck');
        }
        
        // Show visual feedback if either addition was successful
        if (addedToHand || addedToDeck) {
            this.showDisenchantReward(addedToHand, addedToDeck);
            
            // Update UI
            if (addedToHand) {
                heroSelection.updateHandDisplay();
            }
            if (addedToDeck) {
                heroSelection.updateDeckDisplay();
            }
            
            // Save state
            heroSelection.autoSave();
        }
        
        return addedToHand || addedToDeck;
    },
    
    // Show disenchant reward feedback
    showDisenchantReward(addedToHand = false, addedToDeck = false) {
        const feedback = document.createElement('div');
        feedback.className = 'nonfungible-monkee-disenchant-reward';
        
        // Create message based on what was added
        let message = '';
        if (addedToHand && addedToDeck) {
            message = '+Golden Bananas to hand & deck!';
        } else if (addedToHand) {
            message = '+Golden Bananas to hand!';
        } else if (addedToDeck) {
            message = '+Golden Bananas to deck!';
        } else {
            message = 'Golden Bananas effect triggered!';
        }
        
        feedback.innerHTML = `
            <div class="disenchant-reward-content">
                <span class="disenchant-reward-icon">🌟</span>
                <span class="disenchant-reward-text">${message}</span>
            </div>
        `;
        
        feedback.style.cssText = `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #8B4513;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            pointer-events: none;
            animation: disenchantRewardBounce 2s ease-out;
            box-shadow: 0 6px 20px rgba(255, 215, 0, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    },
    
    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Play Monkee sound
    playMonkeeSound() {
        // Placeholder for sound effect
    }
};

// Add styles for the animations
if (typeof document !== 'undefined' && !document.getElementById('nonFungibleMonkeeStyles')) {
    const style = document.createElement('style');
    style.id = 'nonFungibleMonkeeStyles';
    style.textContent = `
        /* NonFungibleMonkee Burst Animation */
        .nonfungible-monkee-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
            text-align: center;
            max-width: 300px;
        }
        
        .monkee-icon {
            font-size: 48px;
            margin-bottom: 10px;
            animation: monkeeJump 1.5s ease-out;
        }
        
        .monkee-text {
            font-size: 24px;
            font-weight: bold;
            color: #ff6b6b;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 107, 107, 0.8);
            margin-bottom: 8px;
            animation: pulse 0.5s ease-out;
        }
        
        .monkee-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            margin-bottom: 8px;
        }
        
        .monkee-name {
            font-size: 18px;
            font-weight: bold;
            color: #4ecdc4;
            text-shadow: 
                1px 1px 2px rgba(0, 0, 0, 0.8),
                0 0 10px rgba(78, 205, 196, 0.6);
            margin-bottom: 8px;
            line-height: 1.2;
            animation: slideUp 0.8s ease-out 0.5s both;
        }
        
        .deck-info {
            font-size: 14px;
            font-weight: bold;
            color: #95e1d3;
            text-shadow: 
                1px 1px 2px rgba(0, 0, 0, 0.8),
                0 0 10px rgba(149, 225, 211, 0.8);
            animation: slideUp 0.8s ease-out 0.6s both;
        }
        
        .hand-info {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 2px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.8);
            animation: slideUp 0.8s ease-out 0.8s both;
        }
        
        /* Error styles */
        .nonfungible-monkee-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .nonfungible-monkee-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .nonfungible-monkee-error-icon {
            font-size: 20px;
        }
        
        .nonfungible-monkee-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        /* Disenchant reward styles */
        .nonfungible-monkee-disenchant-reward {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .disenchant-reward-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .disenchant-reward-icon {
            font-size: 24px;
            animation: bananaSwing 1s ease-in-out infinite;
        }
        
        .disenchant-reward-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes nonFungibleMonkeeErrorBounce {
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
        
        @keyframes nonFungibleMonkeeErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes monkeeJump {
            0% {
                transform: translateY(0) scale(1);
            }
            30% {
                transform: translateY(-30px) scale(1.2);
            }
            60% {
                transform: translateY(-10px) scale(1.1);
            }
            100% {
                transform: translateY(0) scale(1);
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
        
        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            0% {
                opacity: 1;
            }
            80% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }
        
        @keyframes disenchantRewardBounce {
            0% {
                transform: translate(-50%, -50%) scale(0.5);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.2);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
        }
        
        @keyframes bananaSwing {
            0%, 100% { transform: rotate(-10deg); }
            50% { transform: rotate(10deg); }
        }
    `;
    document.head.appendChild(style);
}

// Export for global access
if (typeof window !== 'undefined') {
    window.nonFungibleMonkeeArtifact = nonFungibleMonkeeArtifact;
}