// magicSapphire.js - Magic Sapphire Artifact Handler Module

export const magicSapphireArtifact = {
    // Card name this artifact handles
    cardName: 'MagicSapphire',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`Magic Sapphire clicked at index ${cardIndex}`);
        
        // Activate the magic sapphire effect
        await this.activateMagicSapphire(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`Magic Sapphire dragged outside hand from index ${cardIndex}`);
        
        // Activate the magic sapphire effect
        await this.activateMagicSapphire(cardIndex, heroSelection);
    },
    
    // Core logic to permanently increase gold gain from battles
    async activateMagicSapphire(cardIndex, heroSelection) {
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
        
        // Get base cost from card info
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const sapphireCost = cardInfo?.cost || 3; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < sapphireCost) {
            this.showMagicSapphireError(
                `Need ${sapphireCost} Gold to use Magic Sapphire. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold
        goldManager.addPlayerGold(-sapphireCost, 'MagicSapphire');
        
        console.log(`Magic Sapphire: Spent ${sapphireCost} gold to increase permanent battle gold gain`);
        
        // Increment the permanent sapphire counter
        if (heroSelection.magicSapphiresUsed === undefined) {
            heroSelection.magicSapphiresUsed = 0;
        }
        heroSelection.magicSapphiresUsed++;
        console.log(`💎 DEBUG: After increment - magicSapphiresUsed = ${heroSelection.magicSapphiresUsed} (type: ${typeof heroSelection.magicSapphiresUsed})`);

        console.log(`💎 DEBUG: Magic Sapphire incremented to ${heroSelection.magicSapphiresUsed}`);
        console.log(`Magic Sapphire: Increased permanent gold gain (total sapphires used: ${heroSelection.magicSapphiresUsed})`);
        
        // Add as permanent artifact for tracking
        if (window.artifactHandler) {
            window.artifactHandler.addPermanentArtifact(this.cardName);
        }
        
        // Handle card removal: Magic Sapphire stays in hand if other cards exist
        const currentHand = handManager.getHand();
        let discardedCardName = this.cardName;
        
        if (currentHand.length > 1) {
            // Find other cards (not Magic Sapphire at the current index)
            const otherCardIndices = [];
            currentHand.forEach((cardName, index) => {
                if (index !== cardIndex) {
                    otherCardIndices.push(index);
                }
            });
            
            if (otherCardIndices.length > 0) {
                // Randomly select one of the other cards to discard
                const randomIndex = Math.floor(Math.random() * otherCardIndices.length);
                const indexToRemove = otherCardIndices[randomIndex];
                discardedCardName = handManager.removeCardFromHandByIndex(indexToRemove);
                
                console.log(`Magic Sapphire: Kept Magic Sapphire in hand, discarded ${discardedCardName} instead`);
            } else {
                // Fallback: remove Magic Sapphire (shouldn't happen but safety check)
                discardedCardName = handManager.removeCardFromHandByIndex(cardIndex);
            }
        } else {
            // Only Magic Sapphire in hand, remove it
            discardedCardName = handManager.removeCardFromHandByIndex(cardIndex);
            console.log(`Magic Sapphire: Only card in hand, removed Magic Sapphire itself`);
        }
        
        // Show visual feedback
        this.showMagicSapphireAnimation(cardIndex, sapphireCost, discardedCardName);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        console.log(`💎 DEBUG: Before save - magicSapphiresUsed = ${heroSelection.magicSapphiresUsed} (type: ${typeof heroSelection.magicSapphiresUsed})`);
        await heroSelection.saveGameState();
        console.log(`💎 DEBUG: After save - magicSapphiresUsed = ${heroSelection.magicSapphiresUsed} (type: ${typeof heroSelection.magicSapphiresUsed})`);
        console.log(`💎 DEBUG: Save completed after Magic Sapphire use`);

        
        console.log(`Magic Sapphire activated! Permanent gold gain increased to +${heroSelection.magicSapphiresUsed} per battle for ${sapphireCost} gold.`);
    },
    
    // Show error message
    showMagicSapphireError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'magic-sapphire-error';
        errorDiv.innerHTML = `
            <div class="magic-sapphire-error-content">
                <span class="magic-sapphire-error-icon">⛔</span>
                <span class="magic-sapphire-error-text">${message}</span>
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
            background: linear-gradient(135deg, #dc3545 0%, #0066cc 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: magicSapphireErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'magicSapphireErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show magic sapphire enhancement animation
    showMagicSapphireAnimation(cardIndex, sapphireCost, discardedCardName = null) {
        // Create magical enhancement effect
        const sapphireBurst = document.createElement('div');
        sapphireBurst.className = 'magic-sapphire-effect-burst';
        
        // Format discarded card name for display
        const formattedDiscardedCard = discardedCardName ? 
            this.formatCardName(discardedCardName) : null;
        
        // Show different message based on whether Magic Sapphire stayed in hand
        const discardMessage = discardedCardName === this.cardName ? 
            '' : 
            `<div class="magic-sapphire-discard">Discarded: ${formattedDiscardedCard}</div>`;
        
        const stayMessage = discardedCardName !== this.cardName ? 
            '<div class="magic-sapphire-stay">Magic Sapphire remains in hand!</div>' : 
            '';
        
        sapphireBurst.innerHTML = `
            <div class="magic-sapphire-gems">
                <span class="gem">💎</span>
                <span class="gem">💎</span>
                <span class="gem">💎</span>
            </div>
            <div class="magic-sapphire-text">
                <div class="magic-sapphire-effect">Permanent Gold Gain Increased!</div>
                <div class="magic-sapphire-bonus">+1 Gold After Every Battle</div>
                <div class="magic-sapphire-cost">Cost: ${sapphireCost} Gold</div>
                ${stayMessage}
                ${discardMessage}
            </div>
        `;
        
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                sapphireBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                sapphireBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                sapphireBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                sapphireBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(sapphireBurst);
        
        // Remove after animation
        setTimeout(() => {
            sapphireBurst.remove();
        }, 4000);
        
        // Play sound effect if available
        this.playMagicSapphireSound();
    },
    
    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Play magical enhancement sound
    playMagicSapphireSound() {
        // Placeholder for sound effect
        console.log('🎵 Magic Sapphire enhancement sound!');
    }
};

// Add styles for the animation
if (typeof document !== 'undefined' && !document.getElementById('magicSapphireStyles')) {
    const style = document.createElement('style');
    style.id = 'magicSapphireStyles';
    style.textContent = `
        /* Magic Sapphire Effect Animation */
        .magic-sapphire-effect-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: magicSapphireFadeOut 4s ease-out forwards;
        }
        
        .magic-sapphire-gems {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-bottom: 20px;
            animation: magicSapphireGemsFloat 3s ease-out;
        }
        
        .gem {
            font-size: 35px;
            animation: magicSapphireGemShine 2s linear infinite;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(0, 102, 204, 0.8));
        }
        
        .gem:nth-child(1) {
            animation-delay: 0s;
        }
        
        .gem:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .gem:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        .magic-sapphire-text {
            text-align: center;
            animation: magicSapphireTextPulse 1.5s ease-out;
        }
        
        .magic-sapphire-effect {
            font-size: 24px;
            font-weight: bold;
            color: #0066cc;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 25px rgba(0, 102, 204, 0.9);
            margin-bottom: 8px;
        }
        
        .magic-sapphire-bonus {
            font-size: 20px;
            font-weight: bold;
            color: #007bff;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(0, 123, 255, 0.8);
            margin-bottom: 8px;
        }
        
        .magic-sapphire-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            margin-bottom: 8px;
        }
        
        .magic-sapphire-stay {
            font-size: 18px;
            font-weight: bold;
            color: #17a2b8;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 18px rgba(23, 162, 184, 0.8);
            margin-bottom: 5px;
        }
        
        .magic-sapphire-discard {
            font-size: 14px;
            font-weight: bold;
            color: #dc3545;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 12px rgba(220, 53, 69, 0.6);
        }
        
        /* Error animations */
        @keyframes magicSapphireErrorBounce {
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
        
        @keyframes magicSapphireErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Success animations */
        @keyframes magicSapphireGemsFloat {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-80px);
            }
        }
        
        @keyframes magicSapphireGemShine {
            0%, 100% {
                transform: scale(1) rotate(0deg);
                filter: drop-shadow(0 0 10px rgba(0, 102, 204, 0.8));
            }
            25% {
                transform: scale(1.1) rotate(90deg);
                filter: drop-shadow(0 0 15px rgba(30, 132, 234, 1));
            }
            50% {
                transform: scale(1.2) rotate(180deg);
                filter: drop-shadow(0 0 20px rgba(60, 162, 255, 1));
            }
            75% {
                transform: scale(1.1) rotate(270deg);
                filter: drop-shadow(0 0 15px rgba(30, 132, 234, 1));
            }
        }
        
        @keyframes magicSapphireTextPulse {
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
        
        @keyframes magicSapphireFadeOut {
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
        
        /* Enhanced hover effects for magic sapphire cards */
        .hand-card[data-card-name="MagicSapphire"]:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 8px 25px rgba(0, 102, 204, 0.4);
            transition: all 0.3s ease;
        }
        
        .hand-card[data-card-name="MagicSapphire"] {
            position: relative;
            overflow: visible;
        }
        
        .hand-card[data-card-name="MagicSapphire"]::before {
            content: "💎";
            position: absolute;
            top: -5px;
            right: -5px;
            font-size: 18px;
            animation: magicSapphireCardGemFloat 2s ease-in-out infinite;
            filter: drop-shadow(0 0 5px rgba(0, 102, 204, 0.8));
            z-index: 5;
        }
        
        @keyframes magicSapphireCardGemFloat {
            0%, 100% { 
                transform: translateY(0px) scale(1);
                opacity: 0.8;
            }
            50% { 
                transform: translateY(-3px) scale(1.1);
                opacity: 1;
            }
        }
        
        .magic-sapphire-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .magic-sapphire-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .magic-sapphire-error-icon {
            font-size: 20px;
        }
        
        .magic-sapphire-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(style);
}