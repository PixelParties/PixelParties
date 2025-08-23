// coolPresents.js - CoolPresents Artifact Handler Module

export const coolPresentsArtifact = {
    // Card name this artifact handles
    cardName: 'CoolPresents',
    
    // Number of random cards to give
    cardCount: 3,
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`CoolPresents clicked at index ${cardIndex}`);
        
        // Consume the card and give random cards
        await this.consumeAndReward(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`CoolPresents dragged outside hand from index ${cardIndex}`);
        
        // Consume the card and give random cards
        await this.consumeAndReward(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and award random cards
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
        const cost = cardInfo?.cost || 4; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showCoolPresentsError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'CoolPresents');
        
        console.log(`CoolPresents: Spent ${cost} gold to activate`);
        
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Get 3 random cards
        const randomCards = this.getRandomCards(this.cardCount, heroSelection);
        
        if (randomCards.length === 0) {
            console.error('Failed to get random cards');
            return;
        }
        
        // Add cards to deck
        randomCards.forEach(cardName => {
            deckManager.addCardReward(cardName);
        });
        
        // Add cards to hand if there's space
        const cardsAddedToHand = [];
        randomCards.forEach(cardName => {
            if (!handManager.isHandFull()) {
                const added = handManager.addCardToHand(cardName);
                if (added) {
                    cardsAddedToHand.push(cardName);
                }
            }
        });
        
        // Show visual feedback
        this.showCoolPresentsAnimation(cardIndex, randomCards, cardsAddedToHand, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateDeckDisplay();
        heroSelection.updateGoldDisplay(); // Update gold display after spending
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`CoolPresents consumed! Player gained ${randomCards.length} cards: ${randomCards.join(', ')} for ${cost} gold`);
        if (cardsAddedToHand.length > 0) {
            console.log(`${cardsAddedToHand.length} cards also added to hand: ${cardsAddedToHand.join(', ')}`);
        }
    },
    
    // Show error message when not enough gold
    showCoolPresentsError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'cool-presents-error';
        errorDiv.innerHTML = `
            <div class="cool-presents-error-content">
                <span class="cool-presents-error-icon">⛔</span>
                <span class="cool-presents-error-text">${message}</span>
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
            animation: coolPresentsErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'coolPresentsErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Get random cards from the card database
    getRandomCards(count, heroSelection) {
        try {
            // Get all available card names
            const cardDatabase = heroSelection.getCardInfo ? heroSelection : null;
            if (!cardDatabase) {
                console.error('Cannot access card database');
                return [];
            }
            
            // Get a good selection of non-hero cards
            const eligibleCards = this.getEligibleCards(heroSelection);
            
            if (eligibleCards.length === 0) {
                console.error('No eligible cards found');
                return [];
            }
            
            // Randomly select cards
            const selectedCards = [];
            const availableCards = [...eligibleCards];
            
            for (let i = 0; i < count && availableCards.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * availableCards.length);
                const selectedCard = availableCards[randomIndex];
                selectedCards.push(selectedCard);
                
                // Remove from available to avoid immediate duplicates
                availableCards.splice(randomIndex, 1);
            }
            
            return selectedCards;
        } catch (error) {
            console.error('Error getting random cards:', error);
            return [];
        }
    },
    
    // Get list of eligible cards (excluding heroes and the artifact itself)
    getEligibleCards(heroSelection) {
        // Hardcoded list of good reward cards (mix of abilities, spells, and artifacts)
        const eligibleCards = [
            // Abilities
            'Fighting', 'Toughness', 'Leadership', 'Alchemy', 'DestructionMagic', 
            'SummoningMagic', 'DecayMagic', 'Necromancy', 'Thieving', 'Adventurousness',
            'Navigation', 'Wealth', 'Charme', 'Diplomacy', 'MagicArts', 'Resistance', 'SupportMagic',
            
            // Spells
            'Fireball', 'Icebolt', 'Challenge', 'HeavyHit', 'ThievingStrike', 'RainOfArrows',
            'PoisonPollen', 'ToxicFumes', 'VenomInfusion', 'UltimateDestroyerPunch', 'HealingMelody',
            'Stoneskin', 'TrialOfCoolness', 'LootThePrincess', 'PhoenixBombardment',
            
            // Creatures
            'Archer', 'FrontSoldier', 'Cavalry', 'RoyalCorgi', 'BurningSkeleton', 'SkeletonArcher',
            'SkeletonMage', 'SkeletonReaper', 'MoonlightButterfly', 'CrumTheClassPet',
            
            // Potions
            'LifeSerum', 'PoisonVial', 'BottledFlame', 'BottledLightning', 'ElixirOfStrength',
            'ElixirOfImmortality', 'SwordInABottle', 'ExperimentalPotion', 'BoulderInABottle',
            
            // Artifacts
            'MagicCobalt', 'MagicTopaz', 'MagicEmerald', 'HeartOfIce', 'WantedPoster',
            'CoolCheese', 'CrashLanding', 'TheMastersSword', 'TheStormblade', 'BladeOfTheFrostbringer',
            'FieldStandard', 'Juice', 'DarkGear'
        ];
        
        // Filter out cards that don't exist or are inappropriate
        return eligibleCards.filter(cardName => {
            const cardInfo = heroSelection.getCardInfo(cardName);
            return cardInfo && cardInfo.cardType !== 'hero' && cardName !== 'CoolPresents';
        });
    },
    
    // Show cool presents opening animation (updated to include cost)
    showCoolPresentsAnimation(cardIndex, rewardCards, handCards, cost) {
        // Create floating presents animation
        const presentsBurst = document.createElement('div');
        presentsBurst.className = 'cool-presents-burst';
        
        // Create card display
        const cardList = rewardCards.map(card => this.formatCardName(card)).join(', ');
        const handInfo = handCards.length > 0 ? 
            `<div class="hand-info">+${handCards.length} to hand!</div>` : '';
        
        presentsBurst.innerHTML = `
            <div class="presents-boxes">
                <span class="present-box">🎁</span>
                <span class="present-box">🎁</span>
                <span class="present-box">🎁</span>
            </div>
            <div class="presents-text">+${rewardCards.length} Cards!</div>
            <div class="presents-cost">Cost: ${cost} Gold</div>
            <div class="card-names">${cardList}</div>
            ${handInfo}
        `;
        
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                presentsBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                presentsBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                presentsBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                presentsBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(presentsBurst);
        
        // Remove after animation
        setTimeout(() => {
            presentsBurst.remove();
        }, 3000);
        
        // Play sound effect if available
        this.playPresentsSound();
    },
    
    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Play presents opening sound
    playPresentsSound() {
        // Placeholder for sound effect
        console.log('🎵 Cool presents opening sound!');
    }
};

// Add styles for the animation (updated to include error styles and cost display)
if (typeof document !== 'undefined' && !document.getElementById('coolPresentsStyles')) {
    const style = document.createElement('style');
    style.id = 'coolPresentsStyles';
    style.textContent = `
        /* Cool Presents Burst Animation */
        .cool-presents-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
            text-align: center;
            max-width: 300px;
        }
        
        .presents-boxes {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            justify-content: center;
            animation: floatUp 2s ease-out;
        }
        
        .present-box {
            font-size: 36px;
            animation: spin 1.5s ease-out, scatter 2s ease-out;
            display: inline-block;
        }
        
        .present-box:nth-child(1) {
            animation-delay: 0s, 0.2s;
            --scatter-x: -40px;
        }
        
        .present-box:nth-child(2) {
            animation-delay: 0.1s, 0.3s;
            --scatter-x: 0px;
        }
        
        .present-box:nth-child(3) {
            animation-delay: 0.2s, 0.4s;
            --scatter-x: 40px;
        }
        
        .presents-text {
            font-size: 24px;
            font-weight: bold;
            color: #ff6b6b;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 107, 107, 0.8);
            margin-bottom: 8px;
            animation: pulse 0.5s ease-out;
        }
        
        .presents-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            margin-bottom: 8px;
        }
        
        .card-names {
            font-size: 14px;
            font-weight: bold;
            color: #4ecdc4;
            text-shadow: 
                1px 1px 2px rgba(0, 0, 0, 0.8),
                0 0 10px rgba(78, 205, 196, 0.6);
            margin-bottom: 8px;
            line-height: 1.2;
            animation: slideUp 0.8s ease-out 0.5s both;
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
        .cool-presents-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .cool-presents-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .cool-presents-error-icon {
            font-size: 20px;
        }
        
        .cool-presents-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes coolPresentsErrorBounce {
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
        
        @keyframes coolPresentsErrorFade {
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
        
        @keyframes scatter {
            from {
                transform: translateX(0) translateY(0);
            }
            to {
                transform: translateX(var(--scatter-x)) translateY(-40px);
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
    `;
    document.head.appendChild(style);
}