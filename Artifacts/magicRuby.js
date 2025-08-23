// magicRuby.js - Magic Ruby Artifact Handler Module

export const magicRubyArtifact = {
    // Card name this artifact handles
    cardName: 'MagicRuby',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`Magic Ruby clicked at index ${cardIndex}`);
        
        // Activate the magic ruby effect
        await this.activateMagicRuby(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`Magic Ruby dragged outside hand from index ${cardIndex}`);
        
        // Activate the magic ruby effect
        await this.activateMagicRuby(cardIndex, heroSelection);
    },
    
    // Core logic to permanently increase hand size limit
    async activateMagicRuby(cardIndex, heroSelection) {
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
        const rubyCost = cardInfo?.cost || 3; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < rubyCost) {
            this.showMagicRubyError(
                `Need ${rubyCost} Gold to use Magic Ruby. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold
        goldManager.addPlayerGold(-rubyCost, 'MagicRuby');
        
        console.log(`Magic Ruby: Spent ${rubyCost} gold to increase permanent hand size limit`);
        
        // Increment the permanent ruby counter
        if (heroSelection.magicRubiesUsed === undefined) {
            heroSelection.magicRubiesUsed = 0;
        }
        heroSelection.magicRubiesUsed++;
        console.log(`🔴 DEBUG: After increment - magicRubiesUsed = ${heroSelection.magicRubiesUsed} (type: ${typeof heroSelection.magicRubiesUsed})`);

        console.log(`🔴 DEBUG: Magic Ruby incremented to ${heroSelection.magicRubiesUsed}`);
        console.log(`Magic Ruby: Increased permanent hand size limit (total rubies used: ${heroSelection.magicRubiesUsed})`);
        
        // Update hand manager's max hand size immediately
        const newMaxHandSize = 10 + heroSelection.magicRubiesUsed;
        handManager.setMaxHandSize(newMaxHandSize);
        console.log(`Magic Ruby: Hand size limit increased to ${newMaxHandSize}`);
        
        // Add as permanent artifact for tracking
        if (window.artifactHandler) {
            window.artifactHandler.addPermanentArtifact(this.cardName);
        }
        
        // Handle card removal: Magic Ruby stays in hand if other cards exist
        const currentHand = handManager.getHand();
        let discardedCardName = this.cardName;
        
        if (currentHand.length > 1) {
            // Find other cards (not Magic Ruby at the current index)
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
                
                console.log(`Magic Ruby: Kept Magic Ruby in hand, discarded ${discardedCardName} instead`);
            } else {
                // Fallback: remove Magic Ruby (shouldn't happen but safety check)
                discardedCardName = handManager.removeCardFromHandByIndex(cardIndex);
            }
        } else {
            // Only Magic Ruby in hand, remove it
            discardedCardName = handManager.removeCardFromHandByIndex(cardIndex);
            console.log(`Magic Ruby: Only card in hand, removed Magic Ruby itself`);
        }
        
        // Show visual feedback
        this.showMagicRubyAnimation(cardIndex, rubyCost, discardedCardName, newMaxHandSize);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        console.log(`🔴 DEBUG: Before save - magicRubiesUsed = ${heroSelection.magicRubiesUsed} (type: ${typeof heroSelection.magicRubiesUsed})`);
        await heroSelection.saveGameState();
        console.log(`🔴 DEBUG: After save - magicRubiesUsed = ${heroSelection.magicRubiesUsed} (type: ${typeof heroSelection.magicRubiesUsed})`);
        console.log(`🔴 DEBUG: Save completed after Magic Ruby use`);

        
        console.log(`Magic Ruby activated! Hand size limit increased to ${newMaxHandSize} for ${rubyCost} gold.`);
    },
    
    // Show error message
    showMagicRubyError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'magic-ruby-error';
        errorDiv.innerHTML = `
            <div class="magic-ruby-error-content">
                <span class="magic-ruby-error-icon">⛔</span>
                <span class="magic-ruby-error-text">${message}</span>
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
            background: linear-gradient(135deg, #dc3545 0%, #dc143c 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: magicRubyErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'magicRubyErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show magic ruby enhancement animation
    showMagicRubyAnimation(cardIndex, rubyCost, discardedCardName = null, newMaxHandSize) {
        // Create magical enhancement effect
        const rubyBurst = document.createElement('div');
        rubyBurst.className = 'magic-ruby-effect-burst';
        
        // Format discarded card name for display
        const formattedDiscardedCard = discardedCardName ? 
            this.formatCardName(discardedCardName) : null;
        
        // Show different message based on whether Magic Ruby stayed in hand
        const discardMessage = discardedCardName === this.cardName ? 
            '' : 
            `<div class="magic-ruby-discard">Discarded: ${formattedDiscardedCard}</div>`;
        
        const stayMessage = discardedCardName !== this.cardName ? 
            '<div class="magic-ruby-stay">Magic Ruby remains in hand!</div>' : 
            '';
        
        rubyBurst.innerHTML = `
            <div class="magic-ruby-gems">
                <span class="gem">🔴</span>
                <span class="gem">🔴</span>
                <span class="gem">🔴</span>
            </div>
            <div class="magic-ruby-text">
                <div class="magic-ruby-effect">Hand Size Permanently Increased!</div>
                <div class="magic-ruby-bonus">New Hand Limit: ${newMaxHandSize} Cards</div>
                <div class="magic-ruby-cost">Cost: ${rubyCost} Gold</div>
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
                rubyBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                rubyBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                rubyBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                rubyBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(rubyBurst);
        
        // Remove after animation
        setTimeout(() => {
            rubyBurst.remove();
        }, 4000);
        
        // Play sound effect if available
        this.playMagicRubySound();
    },
    
    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Play magical enhancement sound
    playMagicRubySound() {
        // Placeholder for sound effect
        console.log('🎵 Magic Ruby enhancement sound!');
    }
};

// Add styles for the animation
if (typeof document !== 'undefined' && !document.getElementById('magicRubyStyles')) {
    const style = document.createElement('style');
    style.id = 'magicRubyStyles';
    style.textContent = `
        /* Magic Ruby Effect Animation */
        .magic-ruby-effect-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: magicRubyFadeOut 4s ease-out forwards;
        }
        
        .magic-ruby-gems {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-bottom: 20px;
            animation: magicRubyGemsFloat 3s ease-out;
        }
        
        .gem {
            font-size: 35px;
            animation: magicRubyGemShine 2s linear infinite;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(220, 20, 60, 0.8));
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
        
        .magic-ruby-text {
            text-align: center;
            animation: magicRubyTextPulse 1.5s ease-out;
        }
        
        .magic-ruby-effect {
            font-size: 24px;
            font-weight: bold;
            color: #dc143c;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 25px rgba(220, 20, 60, 0.9);
            margin-bottom: 8px;
        }
        
        .magic-ruby-bonus {
            font-size: 20px;
            font-weight: bold;
            color: #e74c3c;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(231, 76, 60, 0.8);
            margin-bottom: 8px;
        }
        
        .magic-ruby-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            margin-bottom: 8px;
        }
        
        .magic-ruby-stay {
            font-size: 18px;
            font-weight: bold;
            color: #17a2b8;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 18px rgba(23, 162, 184, 0.8);
            margin-bottom: 5px;
        }
        
        .magic-ruby-discard {
            font-size: 14px;
            font-weight: bold;
            color: #dc3545;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 12px rgba(220, 53, 69, 0.6);
        }
        
        /* Error animations */
        @keyframes magicRubyErrorBounce {
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
        
        @keyframes magicRubyErrorFade {
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
        @keyframes magicRubyGemsFloat {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-80px);
            }
        }
        
        @keyframes magicRubyGemShine {
            0%, 100% {
                transform: scale(1) rotate(0deg);
                filter: drop-shadow(0 0 10px rgba(220, 20, 60, 0.8));
            }
            25% {
                transform: scale(1.1) rotate(90deg);
                filter: drop-shadow(0 0 15px rgba(240, 40, 80, 1));
            }
            50% {
                transform: scale(1.2) rotate(180deg);
                filter: drop-shadow(0 0 20px rgba(255, 60, 100, 1));
            }
            75% {
                transform: scale(1.1) rotate(270deg);
                filter: drop-shadow(0 0 15px rgba(240, 40, 80, 1));
            }
        }
        
        @keyframes magicRubyTextPulse {
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
        
        @keyframes magicRubyFadeOut {
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
        
        /* Enhanced hover effects for magic ruby cards */
        .hand-card[data-card-name="MagicRuby"]:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 8px 25px rgba(220, 20, 60, 0.4);
            transition: all 0.3s ease;
        }
        
        .hand-card[data-card-name="MagicRuby"] {
            position: relative;
            overflow: visible;
        }
        
        .hand-card[data-card-name="MagicRuby"]::before {
            content: "🔴";
            position: absolute;
            top: -5px;
            right: -5px;
            font-size: 18px;
            animation: magicRubyCardGemFloat 2s ease-in-out infinite;
            filter: drop-shadow(0 0 5px rgba(220, 20, 60, 0.8));
            z-index: 5;
        }
        
        @keyframes magicRubyCardGemFloat {
            0%, 100% { 
                transform: translateY(0px) scale(1);
                opacity: 0.8;
            }
            50% { 
                transform: translateY(-3px) scale(1.1);
                opacity: 1;
            }
        }
        
        .magic-ruby-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .magic-ruby-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .magic-ruby-error-icon {
            font-size: 20px;
        }
        
        .magic-ruby-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(style);
}