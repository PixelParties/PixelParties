// magicAmethyst.js - Magic Amethyst Artifact Handler Module

export const magicAmethystArtifact = {
    // Card name this artifact handles
    cardName: 'MagicAmethyst',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`Magic Amethyst clicked at index ${cardIndex}`);
        
        // Activate the magic amethyst effect
        await this.activateMagicAmethyst(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`Magic Amethyst dragged outside hand from index ${cardIndex}`);
        
        // Activate the magic amethyst effect
        await this.activateMagicAmethyst(cardIndex, heroSelection);
    },
    
    // Core logic to permanently buff all heroes' Attack
    async activateMagicAmethyst(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const goldManager = heroSelection.getGoldManager();
        const formationManager = heroSelection.formationManager;
        
        if (!handManager || !goldManager || !formationManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Get current formation and count heroes
        const formation = formationManager.getBattleFormation();
        const heroes = Object.values(formation).filter(hero => hero !== null && hero !== undefined);
        const heroCount = heroes.length;
        
        if (heroCount === 0) {
            this.showMagicAmethystError('No heroes to enhance!', cardIndex);
            return;
        }
        
        // Get base cost from card info
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const baseCost = cardInfo?.cost || 2; // Fallback cost if not defined
        const totalCost = baseCost * heroCount;
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < totalCost) {
            this.showMagicAmethystError(
                `Need ${totalCost} Gold (${baseCost} × ${heroCount} heroes). Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-totalCost, 'MagicAmethyst');
        
        console.log(`Magic Amethyst: Spent ${totalCost} gold to enhance ${heroCount} heroes`);
        
        // Apply permanent Attack bonus to all heroes
        heroes.forEach((hero, index) => {
            // Initialize permanent bonuses if they don't exist
            if (hero.attackBonusses === undefined) {
                hero.attackBonusses = 0;
            }
            
            // Add permanent Attack bonus
            hero.attackBonusses += 10;
            
            console.log(`Magic Amethyst: Enhanced ${hero.name} with +10 permanent Attack (total permanent Attack bonus: +${hero.attackBonusses})`);
        });
        
        // Add as permanent artifact for tracking
        if (window.artifactHandler) {
            window.artifactHandler.addPermanentArtifact(this.cardName);
        }
        
        // Handle card removal: Magic Amethyst stays in hand if other cards exist
        const currentHand = handManager.getHand();
        let discardedCardName = this.cardName;
        
        if (currentHand.length > 1) {
            // Find other cards (not Magic Amethyst at the current index)
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
                
                console.log(`Magic Amethyst: Kept Magic Amethyst in hand, discarded ${discardedCardName} instead`);
            } else {
                // Fallback: remove Magic Amethyst (shouldn't happen but safety check)
                discardedCardName = handManager.removeCardFromHandByIndex(cardIndex);
            }
        } else {
            // Only Magic Amethyst in hand, remove it
            discardedCardName = handManager.removeCardFromHandByIndex(cardIndex);
            console.log(`Magic Amethyst: Only card in hand, removed Magic Amethyst itself`);
        }
        
        // Show visual feedback
        this.showMagicAmethystAnimation(cardIndex, heroCount, totalCost, discardedCardName);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        heroSelection.refreshHeroStats(); // This will recalculate and display new Attack values
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`Magic Amethyst activated! Enhanced ${heroCount} heroes with +10 permanent Attack each for ${totalCost} gold.`);
    },
    
    // Show error message
    showMagicAmethystError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'magic-amethyst-error';
        errorDiv.innerHTML = `
            <div class="magic-amethyst-error-content">
                <span class="magic-amethyst-error-icon">⛔</span>
                <span class="magic-amethyst-error-text">${message}</span>
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
            background: linear-gradient(135deg, #dc3545 0%, #9c27b0 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: magicAmethystErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'magicAmethystErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show magic amethyst enhancement animation
    showMagicAmethystAnimation(cardIndex, heroCount, totalCost, discardedCardName = null) {
        // Create magical enhancement effect
        const amethystBurst = document.createElement('div');
        amethystBurst.className = 'magic-amethyst-effect-burst';
        
        // Format discarded card name for display
        const formattedDiscardedCard = discardedCardName ? 
            this.formatCardName(discardedCardName) : null;
        
        // Show different message based on whether Magic Amethyst stayed in hand
        const discardMessage = discardedCardName === this.cardName ? 
            '' : 
            `<div class="magic-amethyst-discard">Discarded: ${formattedDiscardedCard}</div>`;
        
        const stayMessage = discardedCardName !== this.cardName ? 
            '<div class="magic-amethyst-stay">Magic Amethyst remains in hand!</div>' : 
            '';
        
        amethystBurst.innerHTML = `
            <div class="magic-amethyst-gems">
                <span class="gem">🔮</span>
                <span class="gem">🔮</span>
                <span class="gem">🔮</span>
            </div>
            <div class="magic-amethyst-text">
                <div class="magic-amethyst-heroes">Enhanced ${heroCount} Heroes!</div>
                <div class="magic-amethyst-bonus">+10 Attack Each</div>
                <div class="magic-amethyst-cost">Cost: ${totalCost} Gold</div>
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
                amethystBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                amethystBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                amethystBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                amethystBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(amethystBurst);
        
        // Remove after animation
        setTimeout(() => {
            amethystBurst.remove();
        }, 4000);
        
        // Play sound effect if available
        this.playMagicAmethystSound();
    },
    
    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Play magical enhancement sound
    playMagicAmethystSound() {
        // Placeholder for sound effect
        console.log('🎵 Magic Amethyst enhancement sound!');
    }
};

// Add styles for the animation
if (typeof document !== 'undefined' && !document.getElementById('magicAmethystStyles')) {
    const style = document.createElement('style');
    style.id = 'magicAmethystStyles';
    style.textContent = `
        /* Magic Amethyst Effect Animation */
        .magic-amethyst-effect-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: magicAmethystFadeOut 4s ease-out forwards;
        }
        
        .magic-amethyst-gems {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-bottom: 20px;
            animation: magicAmethystGemsFloat 3s ease-out;
        }
        
        .gem {
            font-size: 35px;
            animation: magicAmethystGemShine 2s linear infinite;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(156, 39, 176, 0.8));
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
        
        .magic-amethyst-text {
            text-align: center;
            animation: magicAmethystTextPulse 1.5s ease-out;
        }
        
        .magic-amethyst-heroes {
            font-size: 24px;
            font-weight: bold;
            color: #9c27b0;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 25px rgba(156, 39, 176, 0.9);
            margin-bottom: 8px;
        }
        
        .magic-amethyst-bonus {
            font-size: 20px;
            font-weight: bold;
            color: #e91e63;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(233, 30, 99, 0.8);
            margin-bottom: 8px;
        }
        
        .magic-amethyst-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            margin-bottom: 8px;
        }
        
        .magic-amethyst-stay {
            font-size: 18px;
            font-weight: bold;
            color: #17a2b8;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 18px rgba(23, 162, 184, 0.8);
            margin-bottom: 5px;
        }
        
        .magic-amethyst-discard {
            font-size: 14px;
            font-weight: bold;
            color: #dc3545;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 12px rgba(220, 53, 69, 0.6);
        }
        
        /* Error animations */
        @keyframes magicAmethystErrorBounce {
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
        
        @keyframes magicAmethystErrorFade {
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
        @keyframes magicAmethystGemsFloat {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-80px);
            }
        }
        
        @keyframes magicAmethystGemShine {
            0%, 100% {
                transform: scale(1) rotate(0deg);
                filter: drop-shadow(0 0 10px rgba(156, 39, 176, 0.8));
            }
            25% {
                transform: scale(1.1) rotate(90deg);
                filter: drop-shadow(0 0 15px rgba(186, 69, 206, 1));
            }
            50% {
                transform: scale(1.2) rotate(180deg);
                filter: drop-shadow(0 0 20px rgba(216, 99, 236, 1));
            }
            75% {
                transform: scale(1.1) rotate(270deg);
                filter: drop-shadow(0 0 15px rgba(186, 69, 206, 1));
            }
        }
        
        @keyframes magicAmethystTextPulse {
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
        
        @keyframes magicAmethystFadeOut {
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
        
        /* Enhanced hover effects for magic amethyst cards */
        .hand-card[data-card-name="MagicAmethyst"]:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 8px 25px rgba(156, 39, 176, 0.4);
            transition: all 0.3s ease;
        }
        
        .hand-card[data-card-name="MagicAmethyst"] {
            position: relative;
            overflow: visible;
        }
        
        .hand-card[data-card-name="MagicAmethyst"]::before {
            content: "🔮";
            position: absolute;
            top: -5px;
            right: -5px;
            font-size: 18px;
            animation: magicAmethystCardGemFloat 2s ease-in-out infinite;
            filter: drop-shadow(0 0 5px rgba(156, 39, 176, 0.8));
            z-index: 5;
        }
        
        @keyframes magicAmethystCardGemFloat {
            0%, 100% { 
                transform: translateY(0px) scale(1);
                opacity: 0.8;
            }
            50% { 
                transform: translateY(-3px) scale(1.1);
                opacity: 1;
            }
        }
        
        .magic-amethyst-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .magic-amethyst-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .magic-amethyst-error-icon {
            font-size: 20px;
        }
        
        .magic-amethyst-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(style);
}