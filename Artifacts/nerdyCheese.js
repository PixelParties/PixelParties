// nerdyCheese.js - NerdyCheese Artifact Handler Module

import { getMagicArtsSpells, getCardsByFilters } from '../cardDatabase.js';

export const nerdyCheeseArtifact = {
    // Card name this artifact handles
    cardName: 'NerdyCheese',
    
    // Number of MagicArts spells to give
    cardCount: 3,
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`NerdyCheese clicked at index ${cardIndex}`);
        
        // Consume the card and give MagicArts spells
        await this.consumeAndReward(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`NerdyCheese dragged outside hand from index ${cardIndex}`);
        
        // Consume the card and give MagicArts spells
        await this.consumeAndReward(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and award MagicArts spells
    async consumeAndReward(cardIndex, heroSelection) {
        console.log("NerdyCheese Checkpoint -1");
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        console.log("NerdyCheese Checkpoint -2");
        // Get managers
        const handManager = heroSelection.getHandManager();
        const goldManager = heroSelection.getGoldManager();
        
        if (!handManager || !goldManager) {
            console.error('Required managers not available');
            return;
        }
        
        console.log("NerdyCheese Checkpoint -3");
        // Get cost from card database
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 10; // Default cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showNerdyCheeseError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        console.log("NerdyCheese Checkpoint -4");
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'NerdyCheese');
        
        console.log(`NerdyCheese: Spent ${cost} gold to activate`);
        
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        console.log("NerdyCheese Checkpoint -5");
        // Get 3 random different MagicArts spells
        const randomSpells = this.getRandomMagicArtsSpells(this.cardCount, heroSelection);
        
        if (!randomSpells || randomSpells.length === 0) {
            console.error('Failed to get MagicArts spells - no spells returned');
            // Try to give player their gold back since we couldn't complete the transaction
            goldManager.addPlayerGold(cost, 'NerdyCheese_refund');
            // Add the card back to hand since we removed it
            handManager.addCardToHand(this.cardName);
            heroSelection.updateHandDisplay();
            heroSelection.updateGoldDisplay();
            this.showNerdyCheeseError('No MagicArts spells available!', cardIndex);
            return;
        }
        
        console.log("NerdyCheese Checkpoint -6");
        // Add spells to hand only (NOT to deck like CoolPresents)
        const spellsAddedToHand = [];
        randomSpells.forEach(spellName => {
            if (!handManager.isHandFull()) {
                const added = handManager.addCardToHand(spellName);
                if (added) {
                    spellsAddedToHand.push(spellName);
                }
            }
        });
        
        // Show visual feedback with wizard hats
        this.showNerdyCheeseAnimation(cardIndex, spellsAddedToHand, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay(); // Update gold display after spending
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`NerdyCheese consumed! Player gained ${spellsAddedToHand.length} MagicArts spells: ${spellsAddedToHand.join(', ')} for ${cost} gold`);
    },
    
    // Get random MagicArts spells (different from each other)
    getRandomMagicArtsSpells(count, heroSelection) {
        console.log("NerdyCheese MagicArts Checkpoint 0");
        try {
            // Get all available MagicArts spells
            const magicArtsSpells = this.getAllMagicArtsSpells(heroSelection);
            
            if (magicArtsSpells.length === 0) {
                console.error('No MagicArts spells found');
                return [];
            }
            
            // If we have fewer spells than requested, return all available
            if (magicArtsSpells.length <= count) {
                return [...magicArtsSpells];
            }
            
            // Randomly select different spells
            const selectedSpells = [];
            const availableSpells = [...magicArtsSpells];
            
            for (let i = 0; i < count && availableSpells.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * availableSpells.length);
                const selectedSpell = availableSpells[randomIndex];
                selectedSpells.push(selectedSpell);
                
                // Remove from available to ensure different spells
                availableSpells.splice(randomIndex, 1);
            }
            
            return selectedSpells;
        } catch (error) {
            console.error('Error getting MagicArts spells:', error);
            return [];
        }
    },
    
    // Get all MagicArts spell cards from database
    getAllMagicArtsSpells(heroSelection) {
        console.log("NerdyCheese Getting MagicArts Spells");
        
        try {
            // Try to use the imported function from cardDatabase
            let magicArtsSpells = [];
            
            // First try: Use imported getMagicArtsSpells function
            if (typeof getMagicArtsSpells !== 'undefined') {
                const spellCards = getMagicArtsSpells();
                magicArtsSpells = spellCards.map(card => card.name);
                console.log(`Got ${magicArtsSpells.length} MagicArts spells from imported function`);
            }
            // Second try: Use imported getCardsByFilters function
            else if (typeof getCardsByFilters !== 'undefined') {
                const spellCards = getCardsByFilters({
                    cardType: 'Spell',
                    spellSchool: 'MagicArts'
                });
                magicArtsSpells = spellCards.map(card => card.name);
                console.log(`Got ${magicArtsSpells.length} MagicArts spells from getCardsByFilters`);
            }
            // Third try: Check if heroSelection has these methods
            else if (heroSelection?.getMagicArtsSpells) {
                const spellCards = heroSelection.getMagicArtsSpells();
                magicArtsSpells = spellCards.map(card => card.name);
                console.log(`Got ${magicArtsSpells.length} MagicArts spells from heroSelection.getMagicArtsSpells`);
            }
            // Fourth try: Check if heroSelection has getCardsByFilters
            else if (heroSelection?.getCardsByFilters) {
                const spellCards = heroSelection.getCardsByFilters({
                    cardType: 'Spell',
                    spellSchool: 'MagicArts'
                });
                magicArtsSpells = spellCards.map(card => card.name);
                console.log(`Got ${magicArtsSpells.length} MagicArts spells from heroSelection.getCardsByFilters`);
            }
            // Fifth try: Check if functions are available globally (window scope)
            else if (typeof window !== 'undefined') {
                if (window.getMagicArtsSpells) {
                    const spellCards = window.getMagicArtsSpells();
                    magicArtsSpells = spellCards.map(card => card.name);
                    console.log(`Got ${magicArtsSpells.length} MagicArts spells from window.getMagicArtsSpells`);
                } else if (window.getCardsByFilters) {
                    const spellCards = window.getCardsByFilters({
                        cardType: 'Spell',
                        spellSchool: 'MagicArts'
                    });
                    magicArtsSpells = spellCards.map(card => card.name);
                    console.log(`Got ${magicArtsSpells.length} MagicArts spells from window.getCardsByFilters`);
                }
            }
            
            if (magicArtsSpells.length > 0) {
                console.log(`NerdyCheese: Found ${magicArtsSpells.length} MagicArts spells: ${magicArtsSpells.join(', ')}`);
                return magicArtsSpells;
            } else {
                console.error('Could not access cardDatabase functions to get MagicArts spells');
                return [];
            }
            
        } catch (error) {
            console.error('Error getting MagicArts spells from database:', error);
            return [];
        }
    },
    
    // Show error message when not enough gold
    showNerdyCheeseError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'nerdy-cheese-error';
        errorDiv.innerHTML = `
            <div class="nerdy-cheese-error-content">
                <span class="nerdy-cheese-error-icon">⛔</span>
                <span class="nerdy-cheese-error-text">${message}</span>
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
            animation: nerdyCheeseErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'nerdyCheeseErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show wizard hat animation around new cards
    showNerdyCheeseAnimation(cardIndex, spellCards, cost) {
        // Create wizard hat burst animation
        const wizardBurst = document.createElement('div');
        wizardBurst.className = 'nerdy-cheese-burst';
        
        // Create card display
        const cardList = spellCards.map(card => this.formatCardName(card)).join(', ');
        
        wizardBurst.innerHTML = `
            <div class="wizard-hats">
                <span class="wizard-hat">🎩</span>
                <span class="wizard-hat">🧙</span>
                <span class="wizard-hat">🎩</span>
            </div>
            <div class="nerdy-text">+${spellCards.length} MagicArts Spells!</div>
            <div class="nerdy-cost">Cost: ${cost} Gold</div>
            <div class="spell-names">${cardList}</div>
        `;
        
        // Position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                wizardBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                wizardBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                wizardBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                wizardBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(wizardBurst);
        
        // Also add wizard hats floating around the new cards in hand
        setTimeout(() => {
            this.addWizardHatsToNewCards(spellCards);
        }, 100);
        
        // Remove after animation
        setTimeout(() => {
            wizardBurst.remove();
        }, 3000);
        
        // Play sound effect if available
        this.playNerdyCheeseSound();
    },
    
    // Add wizard hat indicators to the newly added cards
    addWizardHatsToNewCards(spellCards) {
        const handContainer = document.querySelector('.hand-cards');
        if (!handContainer) return;
        
        const handCards = handContainer.querySelectorAll('.hand-card');
        
        handCards.forEach(card => {
            const cardName = card.getAttribute('data-card-name');
            if (spellCards.includes(cardName)) {
                // Add a temporary wizard hat indicator
                const wizardIndicator = document.createElement('div');
                wizardIndicator.className = 'new-spell-wizard-hat';
                wizardIndicator.textContent = '🧙‍♂️';
                
                wizardIndicator.style.cssText = `
                    position: absolute;
                    top: -15px;
                    right: -5px;
                    font-size: 24px;
                    z-index: 100;
                    animation: wizardHatFloat 2s ease-in-out;
                `;
                
                card.appendChild(wizardIndicator);
                
                // Remove after animation
                setTimeout(() => {
                    wizardIndicator.remove();
                }, 2000);
            }
        });
    },
    
    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Play nerdy cheese sound
    playNerdyCheeseSound() {
        // Placeholder for sound effect
        console.log('🎵 Magical wizard spell sound!');
    }
};

// Add styles for the animation
if (typeof document !== 'undefined' && !document.getElementById('nerdyCheeseStyles')) {
    const style = document.createElement('style');
    style.id = 'nerdyCheeseStyles';
    style.textContent = `
        /* Nerdy Cheese Burst Animation */
        .nerdy-cheese-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
            text-align: center;
            max-width: 350px;
        }
        
        .wizard-hats {
            display: flex;
            gap: 20px;
            margin-bottom: 10px;
            justify-content: center;
            animation: wizardFloat 2s ease-out;
        }
        
        .wizard-hat {
            font-size: 36px;
            animation: wizardSpin 1.5s ease-out, wizardScatter 2s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(138, 43, 226, 0.6));
        }
        
        .wizard-hat:nth-child(1) {
            animation-delay: 0s, 0.2s;
            --scatter-x: -45px;
            --scatter-y: -20px;
        }
        
        .wizard-hat:nth-child(2) {
            animation-delay: 0.1s, 0.3s;
            --scatter-x: 0px;
            --scatter-y: -35px;
        }
        
        .wizard-hat:nth-child(3) {
            animation-delay: 0.2s, 0.4s;
            --scatter-x: 45px;
            --scatter-y: -20px;
        }
        
        .nerdy-text {
            font-size: 24px;
            font-weight: bold;
            color: #8a2be2;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(138, 43, 226, 0.8);
            margin-bottom: 8px;
            animation: magicPulse 0.5s ease-out;
        }
        
        .nerdy-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            margin-bottom: 8px;
        }
        
        .spell-names {
            font-size: 14px;
            font-weight: bold;
            color: #9370db;
            text-shadow: 
                1px 1px 2px rgba(0, 0, 0, 0.8),
                0 0 10px rgba(147, 112, 219, 0.6);
            margin-bottom: 8px;
            line-height: 1.2;
            animation: slideUp 0.8s ease-out 0.5s both;
        }
        
        /* Error styles */
        .nerdy-cheese-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .nerdy-cheese-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .nerdy-cheese-error-icon {
            font-size: 20px;
        }
        
        .nerdy-cheese-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes nerdyCheeseErrorBounce {
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
        
        @keyframes nerdyCheeseErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes wizardFloat {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-60px);
            }
        }
        
        @keyframes wizardSpin {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(720deg);
            }
        }
        
        @keyframes wizardScatter {
            from {
                transform: translateX(0) translateY(0);
            }
            to {
                transform: translateX(var(--scatter-x)) translateY(var(--scatter-y));
            }
        }
        
        @keyframes magicPulse {
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
        
        @keyframes wizardHatFloat {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            50% {
                transform: translateY(-10px) rotate(180deg);
            }
            100% {
                transform: translateY(-20px) rotate(360deg);
                opacity: 0;
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