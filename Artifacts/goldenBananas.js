// goldenBananas.js - GoldenBananas Artifact Handler Module

export const goldenBananasArtifact = {
    // Card name this artifact handles
    cardName: 'GoldenBananas',
    
    // Gold amounts
    goldPerPayout: 4,
    totalPayouts: 3,
    artifactCost: 8, // Fallback cost if not in database
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`GoldenBananas clicked at index ${cardIndex}`);
        
        // Process the golden bananas
        await this.processGoldenBananas(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`GoldenBananas dragged outside hand from index ${cardIndex}`);
        
        // Process the golden bananas
        await this.processGoldenBananas(cardIndex, heroSelection);
    },
    
    // Core logic to process golden bananas
    async processGoldenBananas(cardIndex, heroSelection) {
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
        
        // Get artifact cost from card database
        const cardInfo = heroSelection.getCardInfo ? heroSelection.getCardInfo(this.cardName) : null;
        const artifactCost = (cardInfo && cardInfo.cost) ? cardInfo.cost : this.artifactCost;
        
        // Check if player can afford it
        const playerGold = goldManager.getPlayerGold();
        if (playerGold < artifactCost) {
            console.error(`Player cannot afford GoldenBananas (has ${playerGold}, needs ${artifactCost})`);
            return;
        }
        
        // Remove card from hand first
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Deduct the cost first
        goldManager.addPlayerGold(-artifactCost, 'golden_bananas_cost');
        
        // Update UI immediately to show cost deduction
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Increment the goldenBananas counter
        if (heroSelection.playerCounters && typeof heroSelection.playerCounters.goldenBananas === 'number') {
            heroSelection.playerCounters.goldenBananas++;
            console.log(`GoldenBananas counter increased to ${heroSelection.playerCounters.goldenBananas}`);
        }
        
        // Show initial activation animation
        this.showActivationAnimation(cardIndex);
        
        // Award gold 3 times with delays (reduced timing, overlapping animations)
        for (let i = 0; i < this.totalPayouts; i++) {
            setTimeout(async () => {
                // Award gold
                goldManager.addPlayerGold(this.goldPerPayout, 'golden_bananas_payout');
                
                // Update UI immediately to show the gold increase
                heroSelection.updateGoldDisplay();
                
                // Show payout animation
                this.showPayoutAnimation(i + 1);
                
            }, (i + 1) * 267); // Reduced from 800ms to 267ms (800/3)
        }
        
        // Final save after all payouts complete
        setTimeout(async () => {
            await heroSelection.saveGameState();
        }, (this.totalPayouts + 1) * 267);
        
        const totalGoldGained = (this.goldPerPayout * this.totalPayouts) - artifactCost;
        console.log(`GoldenBananas processed! Net gold gain: ${totalGoldGained} (${this.totalPayouts} payouts of ${this.goldPerPayout} minus ${artifactCost} cost)`);
    },
    
    // Show initial activation animation
    showActivationAnimation(cardIndex) {
        // Create activation burst
        const activationBurst = document.createElement('div');
        activationBurst.className = 'golden-bananas-activation';
        activationBurst.innerHTML = `
            <div class="activation-content">
                <div class="banana-shower">
                    <span class="banana">🍌</span>
                    <span class="banana">🍌</span>
                    <span class="banana">🍌</span>
                    <span class="banana">🍌</span>
                    <span class="banana">🍌</span>
                </div>
                <div class="activation-text">Golden Bananas Activated!</div>
            </div>
        `;
        
        // Position near where the card was
        this.positionNearCard(activationBurst, cardIndex);
        
        // Add to body
        document.body.appendChild(activationBurst);
        
        // Remove after animation
        setTimeout(() => {
            activationBurst.remove();
        }, 2000);
        
        // Play activation sound
        this.playActivationSound();
    },
    
    // Show individual payout animation
    showPayoutAnimation(payoutNumber) {
        // Create payout animation
        const payoutBurst = document.createElement('div');
        payoutBurst.className = 'golden-bananas-payout';
        payoutBurst.innerHTML = `
            <div class="payout-content">
                <div class="payout-icons">
                    <span class="payout-banana">🍌</span>
                    <span class="payout-gold">💰</span>
                </div>
                <div class="payout-text">+${this.goldPerPayout} Gold!</div>
                <div class="payout-counter">Payout ${payoutNumber}/${this.totalPayouts}</div>
            </div>
        `;
        
        // Position in center-right of screen
        const goldDisplay = document.querySelector('.gold-display-enhanced');
        if (goldDisplay) {
            const rect = goldDisplay.getBoundingClientRect();
            payoutBurst.style.left = `${rect.right + 20}px`;
            payoutBurst.style.top = `${rect.top + (payoutNumber - 3) * 60}px`;
        } else {
            // Fallback positioning
            payoutBurst.style.right = '50px';
            payoutBurst.style.top = `${100 + (payoutNumber - 3) * 60}px`;
        }
        
        // Add to body
        document.body.appendChild(payoutBurst);
        
        // Remove after animation
        setTimeout(() => {
            payoutBurst.remove();
        }, 2500);
        
        // Play payout sound
        this.playPayoutSound();
    },
    
    // Position element near where the card was
    positionNearCard(element, cardIndex) {
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                element.style.left = `${cardRect.left + cardRect.width / 2}px`;
                element.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                element.style.left = `${handRect.left + handRect.width / 2}px`;
                element.style.top = `${handRect.top}px`;
            }
        } else {
            // Fallback to center of screen
            element.style.left = '50%';
            element.style.top = '50%';
        }
        
        element.style.position = 'fixed';
        element.style.transform = 'translate(-50%, -50%)';
        element.style.zIndex = '10000';
        element.style.pointerEvents = 'none';
    },
    
    // Play activation sound
    playActivationSound() {
        // Placeholder for sound effect
        console.log('🎵 Golden Bananas activation sound!');
    },
    
    // Play payout sound
    playPayoutSound() {
        // Placeholder for sound effect
        console.log('🎵 Golden Bananas payout sound!');
    }
};

// Add styles for the animations
if (typeof document !== 'undefined' && !document.getElementById('goldenBananasStyles')) {
    const style = document.createElement('style');
    style.id = 'goldenBananasStyles';
    style.textContent = `
        /* Golden Bananas Activation Animation */
        .golden-bananas-activation {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeInOut 2s ease-out forwards;
        }
        
        .activation-content {
            text-align: center;
        }
        
        .banana-shower {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-bottom: 15px;
            animation: bananaShower 1.5s ease-out;
        }
        
        .banana {
            font-size: 28px;
            animation: bananaRain 1.5s ease-out;
            display: inline-block;
        }
        
        .banana:nth-child(1) {
            animation-delay: 0s;
            --fall-x: -20px;
        }
        
        .banana:nth-child(2) {
            animation-delay: 0.1s;
            --fall-x: -10px;
        }
        
        .banana:nth-child(3) {
            animation-delay: 0.2s;
            --fall-x: 0px;
        }
        
        .banana:nth-child(4) {
            animation-delay: 0.3s;
            --fall-x: 10px;
        }
        
        .banana:nth-child(5) {
            animation-delay: 0.4s;
            --fall-x: 20px;
        }
        
        .activation-text {
            font-size: 20px;
            font-weight: bold;
            color: #FFD700;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 215, 0, 0.9);
            animation: activationPulse 0.8s ease-out;
        }
        
        /* Golden Bananas Payout Animation */
        .golden-bananas-payout {
            position: fixed;
            z-index: 10000;
            pointer-events: none;
            animation: payoutSlideIn 2.5s ease-out forwards;
        }
        
        .payout-content {
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #8B4513;
            padding: 12px 20px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
            border: 3px solid rgba(255, 255, 255, 0.4);
        }
        
        .payout-icons {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-bottom: 8px;
            animation: payoutIconBounce 0.6s ease-out;
        }
        
        .payout-banana, .payout-gold {
            font-size: 24px;
            animation: payoutIconSpin 0.8s ease-out;
        }
        
        .payout-banana {
            animation-delay: 0s;
        }
        
        .payout-gold {
            animation-delay: 0.2s;
        }
        
        .payout-text {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
            animation: payoutTextGlow 0.5s ease-out;
        }
        
        .payout-counter {
            font-size: 12px;
            opacity: 0.8;
            font-weight: bold;
        }
        
        /* Animations */
        @keyframes bananaShower {
            from {
                transform: translateY(-30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes bananaRain {
            0% {
                transform: translateY(-40px) translateX(0) rotate(0deg);
                opacity: 0;
            }
            50% {
                opacity: 1;
            }
            100% {
                transform: translateY(20px) translateX(var(--fall-x)) rotate(180deg);
                opacity: 0.8;
            }
        }
        
        @keyframes activationPulse {
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
        
        @keyframes payoutSlideIn {
            0% {
                transform: translateX(100px);
                opacity: 0;
            }
            15% {
                transform: translateX(-10px);
                opacity: 1;
            }
            25% {
                transform: translateX(0);
            }
            85% {
                transform: translateX(0);
                opacity: 1;
            }
            100% {
                transform: translateX(50px);
                opacity: 0;
            }
        }
        
        @keyframes payoutIconBounce {
            0% {
                transform: scale(0.3);
            }
            50% {
                transform: scale(1.3);
            }
            100% {
                transform: scale(1);
            }
        }
        
        @keyframes payoutIconSpin {
            from {
                transform: rotate(0deg) scale(1);
            }
            50% {
                transform: rotate(180deg) scale(1.2);
            }
            to {
                transform: rotate(360deg) scale(1);
            }
        }
        
        @keyframes payoutTextGlow {
            0% {
                text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
            }
            50% {
                text-shadow: 0 0 20px rgba(255, 215, 0, 1);
            }
            100% {
                text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
            }
        }
        
        @keyframes fadeInOut {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1);
            }
            80% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
        }
        
        /* Add cursor pointer to clickable cards */
        .hand-card.clickable[data-card-name="GoldenBananas"] {
            cursor: pointer;
        }
        
        .hand-card.clickable[data-card-name="GoldenBananas"]:hover {
            transform: translateY(-8px);
            transition: transform 0.3s ease;
            box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
        }
    `;
    document.head.appendChild(style);
}