// treasureChest.js - TreasureChest Card Handler Module

export const treasureChestArtifact = {
    // Card name this artifact handles
    cardName: 'TreasureChest',
    
    // Gold reward amount
    goldReward: 10,
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`TreasureChest clicked at index ${cardIndex}`);
        
        // Consume the card and give gold
        await this.consumeAndReward(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`TreasureChest dragged outside hand from index ${cardIndex}`);
        
        // Consume the card and give gold
        await this.consumeAndReward(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and award gold
    async consumeAndReward(cardIndex, heroSelection) {
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
        
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Award gold to player
        goldManager.addPlayerGold(this.goldReward, 'treasure_chest');
        
        // Show visual feedback
        this.showTreasureChestAnimation(cardIndex);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`TreasureChest consumed! Player gained ${this.goldReward} gold.`);
    },
    
    // Show treasure chest opening animation
    showTreasureChestAnimation(cardIndex) {
        // Create floating gold animation
        const goldBurst = document.createElement('div');
        goldBurst.className = 'treasure-chest-gold-burst';
        goldBurst.innerHTML = `
            <div class="gold-coins">
                <span class="gold-coin">🪙</span>
                <span class="gold-coin">🪙</span>
                <span class="gold-coin">🪙</span>
            </div>
            <div class="gold-text">+${this.goldReward} Gold!</div>
        `;
        
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                goldBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                goldBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                goldBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                goldBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(goldBurst);
        
        // Remove after animation
        setTimeout(() => {
            goldBurst.remove();
        }, 2000);
        
        // Play sound effect if available
        this.playTreasureSound();
    },
    
    // Play treasure opening sound
    playTreasureSound() {
        // Placeholder for sound effect
        // You can implement actual sound playing here if you have audio files
        console.log('🎵 Treasure chest opening sound!');
    }
};

// Add styles for the animation
if (typeof document !== 'undefined' && !document.getElementById('treasureChestStyles')) {
    const style = document.createElement('style');
    style.id = 'treasureChestStyles';
    style.textContent = `
        /* Treasure Chest Gold Burst Animation */
        .treasure-chest-gold-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 2s ease-out forwards;
        }
        
        .gold-coins {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            animation: floatUp 1.5s ease-out;
        }
        
        .gold-coin {
            font-size: 32px;
            animation: spin 1s ease-out, scatter 1.5s ease-out;
            display: inline-block;
        }
        
        .gold-coin:nth-child(1) {
            animation-delay: 0s, 0.1s;
            --scatter-x: -30px;
        }
        
        .gold-coin:nth-child(2) {
            animation-delay: 0.1s, 0.2s;
            --scatter-x: 0px;
        }
        
        .gold-coin:nth-child(3) {
            animation-delay: 0.2s, 0.3s;
            --scatter-x: 30px;
        }
        
        .gold-text {
            font-size: 24px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 215, 0, 0.8);
            text-align: center;
            animation: pulse 0.5s ease-out;
        }
        
        @keyframes floatUp {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-50px);
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
                transform: translateX(var(--scatter-x)) translateY(-30px);
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
        
        /* Add cursor pointer to clickable cards */
        .hand-card.clickable {
            cursor: pointer;
        }
        
        .hand-card.clickable:hover {
            transform: translateY(-5px);
            transition: transform 0.2s ease;
        }
    `;
    document.head.appendChild(style);
}