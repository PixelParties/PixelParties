// cuteCheese.js - CuteCheese Artifact Handler Module

import { getSpellsBySchool, getCardsByFilters } from '../cardDatabase.js';

export const cuteCheeseArtifact = {
    // Card name this artifact handles
    cardName: 'CuteCheese',
    
    // Number of SummoningMagic spells to give
    cardCount: 3,
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`CuteCheese clicked at index ${cardIndex}`);
        
        // Consume the card and give SummoningMagic spells
        await this.consumeAndReward(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`CuteCheese dragged outside hand from index ${cardIndex}`);
        
        // Consume the card and give SummoningMagic spells
        await this.consumeAndReward(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and award SummoningMagic spells
    async consumeAndReward(cardIndex, heroSelection) {
        console.log("CuteCheese Checkpoint -1");
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        console.log("CuteCheese Checkpoint -2");
        // Get managers
        const handManager = heroSelection.getHandManager();
        const goldManager = heroSelection.getGoldManager();
        
        if (!handManager || !goldManager) {
            console.error('Required managers not available');
            return;
        }
        
        console.log("CuteCheese Checkpoint -3");
        // Get cost from card database
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 10; // Default cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showCuteCheeseError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        console.log("CuteCheese Checkpoint -4");
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'CuteCheese');
        
        console.log(`CuteCheese: Spent ${cost} gold to activate`);
        
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        console.log("CuteCheese Checkpoint -5");
        // Get 3 random different SummoningMagic spells
        const randomSpells = this.getRandomSummoningSpells(this.cardCount, heroSelection);
        
        if (!randomSpells || randomSpells.length === 0) {
            console.error('Failed to get SummoningMagic spells - no spells returned');
            // Try to give player their gold back since we couldn't complete the transaction
            goldManager.addPlayerGold(cost, 'CuteCheese_refund');
            // Add the card back to hand since we removed it
            handManager.addCardToHand(this.cardName);
            heroSelection.updateHandDisplay();
            heroSelection.updateGoldDisplay();
            this.showCuteCheeseError('No SummoningMagic spells available!', cardIndex);
            return;
        }
        
        console.log("CuteCheese Checkpoint -6");
        // Add spells to hand only (NOT to deck)
        const spellsAddedToHand = [];
        randomSpells.forEach(spellName => {
            if (!handManager.isHandFull()) {
                const added = handManager.addCardToHand(spellName);
                if (added) {
                    spellsAddedToHand.push(spellName);
                }
            }
        });
        
        // Show visual feedback with hearts and clouds
        this.showCuteCheeseAnimation(cardIndex, spellsAddedToHand, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay(); // Update gold display after spending
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`CuteCheese consumed! Player gained ${spellsAddedToHand.length} SummoningMagic spells: ${spellsAddedToHand.join(', ')} for ${cost} gold`);
    },
    
    // Get random SummoningMagic spells (different from each other)
    getRandomSummoningSpells(count, heroSelection) {
        console.log("CuteCheese SummoningMagic Checkpoint 0");
        try {
            // Get all available SummoningMagic spells
            const summoningSpells = this.getAllSummoningSpells(heroSelection);
            
            if (summoningSpells.length === 0) {
                console.error('No SummoningMagic spells found');
                return [];
            }
            
            // If we have fewer spells than requested, return all available
            if (summoningSpells.length <= count) {
                return [...summoningSpells];
            }
            
            // Randomly select different spells
            const selectedSpells = [];
            const availableSpells = [...summoningSpells];
            
            for (let i = 0; i < count && availableSpells.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * availableSpells.length);
                const selectedSpell = availableSpells[randomIndex];
                selectedSpells.push(selectedSpell);
                
                // Remove from available to ensure different spells
                availableSpells.splice(randomIndex, 1);
            }
            
            return selectedSpells;
        } catch (error) {
            console.error('Error getting SummoningMagic spells:', error);
            return [];
        }
    },
    
    // Get all SummoningMagic spell cards from database
    getAllSummoningSpells(heroSelection) {
        console.log("CuteCheese Getting SummoningMagic Spells");
        
        try {
            // Try to use the imported function from cardDatabase
            let summoningSpells = [];
            
            // First try: Use imported getSpellsBySchool function
            if (typeof getSpellsBySchool !== 'undefined') {
                const spellCards = getSpellsBySchool('SummoningMagic');
                summoningSpells = spellCards.map(card => card.name);
                console.log(`Got ${summoningSpells.length} SummoningMagic spells from getSpellsBySchool`);
            }
            // Second try: Use imported getCardsByFilters function
            else if (typeof getCardsByFilters !== 'undefined') {
                const spellCards = getCardsByFilters({
                    cardType: 'Spell',
                    spellSchool: 'SummoningMagic'
                });
                summoningSpells = spellCards.map(card => card.name);
                console.log(`Got ${summoningSpells.length} SummoningMagic spells from getCardsByFilters`);
            }
            // Third try: Check if heroSelection has these methods
            else if (heroSelection?.getSpellsBySchool) {
                const spellCards = heroSelection.getSpellsBySchool('SummoningMagic');
                summoningSpells = spellCards.map(card => card.name);
                console.log(`Got ${summoningSpells.length} SummoningMagic spells from heroSelection.getSpellsBySchool`);
            }
            // Fourth try: Check if heroSelection has getCardsByFilters
            else if (heroSelection?.getCardsByFilters) {
                const spellCards = heroSelection.getCardsByFilters({
                    cardType: 'Spell',
                    spellSchool: 'SummoningMagic'
                });
                summoningSpells = spellCards.map(card => card.name);
                console.log(`Got ${summoningSpells.length} SummoningMagic spells from heroSelection.getCardsByFilters`);
            }
            // Fifth try: Check if functions are available globally (window scope)
            else if (typeof window !== 'undefined') {
                if (window.getSpellsBySchool) {
                    const spellCards = window.getSpellsBySchool('SummoningMagic');
                    summoningSpells = spellCards.map(card => card.name);
                    console.log(`Got ${summoningSpells.length} SummoningMagic spells from window.getSpellsBySchool`);
                } else if (window.getCardsByFilters) {
                    const spellCards = window.getCardsByFilters({
                        cardType: 'Spell',
                        spellSchool: 'SummoningMagic'
                    });
                    summoningSpells = spellCards.map(card => card.name);
                    console.log(`Got ${summoningSpells.length} SummoningMagic spells from window.getCardsByFilters`);
                }
            }
            
            if (summoningSpells.length > 0) {
                console.log(`CuteCheese: Found ${summoningSpells.length} SummoningMagic spells: ${summoningSpells.join(', ')}`);
                return summoningSpells;
            } else {
                console.error('Could not access cardDatabase functions to get SummoningMagic spells');
                return [];
            }
            
        } catch (error) {
            console.error('Error getting SummoningMagic spells from database:', error);
            return [];
        }
    },
    
    // Show error message when not enough gold
    showCuteCheeseError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'cute-cheese-error';
        errorDiv.innerHTML = `
            <div class="cute-cheese-error-content">
                <span class="cute-cheese-error-icon">💔</span>
                <span class="cute-cheese-error-text">${message}</span>
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
            background: linear-gradient(135deg, #ff69b4 0%, #ffb6c1 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: cuteCheeseErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(255, 105, 180, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'cuteCheeseErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show hearts and clouds animation around new cards
    showCuteCheeseAnimation(cardIndex, spellCards, cost) {
        // Create cute burst animation
        const cuteBurst = document.createElement('div');
        cuteBurst.className = 'cute-cheese-burst';
        
        // Create card display
        const cardList = spellCards.map(card => this.formatCardName(card)).join(', ');
        
        cuteBurst.innerHTML = `
            <div class="cute-icons">
                <span class="cute-icon">💖</span>
                <span class="cute-icon">☁️</span>
                <span class="cute-icon">💕</span>
            </div>
            <div class="cute-text">+${spellCards.length} Summoning Spells!</div>
            <div class="cute-cost">Cost: ${cost} Gold</div>
            <div class="summoning-names">${cardList}</div>
        `;
        
        // Position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                cuteBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                cuteBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                cuteBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                cuteBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(cuteBurst);
        
        // Also add cute indicators to the new cards in hand
        setTimeout(() => {
            this.addCuteIndicatorsToNewCards(spellCards);
        }, 100);
        
        // Remove after animation
        setTimeout(() => {
            cuteBurst.remove();
        }, 3000);
        
        // Play sound effect if available
        this.playCuteCheeseSound();
    },
    
    // Add cute indicators to the newly added cards
    addCuteIndicatorsToNewCards(spellCards) {
        const handContainer = document.querySelector('.hand-cards');
        if (!handContainer) return;
        
        const handCards = handContainer.querySelectorAll('.hand-card');
        
        handCards.forEach(card => {
            const cardName = card.getAttribute('data-card-name');
            if (spellCards.includes(cardName)) {
                // Add temporary cute indicators
                const heartIndicator = document.createElement('div');
                heartIndicator.className = 'new-spell-heart';
                heartIndicator.textContent = '💝';
                
                heartIndicator.style.cssText = `
                    position: absolute;
                    top: -10px;
                    left: -5px;
                    font-size: 20px;
                    z-index: 100;
                    animation: heartFloat 2s ease-in-out;
                `;
                
                const cloudIndicator = document.createElement('div');
                cloudIndicator.className = 'new-spell-cloud';
                cloudIndicator.textContent = '☁️';
                
                cloudIndicator.style.cssText = `
                    position: absolute;
                    bottom: -10px;
                    right: -5px;
                    font-size: 20px;
                    z-index: 100;
                    animation: cloudDrift 2s ease-in-out;
                `;
                
                card.appendChild(heartIndicator);
                card.appendChild(cloudIndicator);
                
                // Remove after animation
                setTimeout(() => {
                    heartIndicator.remove();
                    cloudIndicator.remove();
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
    
    // Play cute cheese sound
    playCuteCheeseSound() {
        // Placeholder for sound effect
        console.log('🎵 Cute magical summoning sound!');
    }
};

// Add styles for the animation
if (typeof document !== 'undefined' && !document.getElementById('cuteCheeseStyles')) {
    const style = document.createElement('style');
    style.id = 'cuteCheeseStyles';
    style.textContent = `
        /* Cute Cheese Burst Animation */
        .cute-cheese-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
            text-align: center;
            max-width: 350px;
        }
        
        .cute-icons {
            display: flex;
            gap: 25px;
            margin-bottom: 10px;
            justify-content: center;
            animation: cuteFloat 2s ease-out;
        }
        
        .cute-icon {
            font-size: 36px;
            animation: cuteBounce 1.5s ease-out, cuteScatter 2s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(255, 182, 193, 0.8));
        }
        
        .cute-icon:nth-child(1) {
            animation-delay: 0s, 0.2s;
            --scatter-x: -50px;
            --scatter-y: -25px;
        }
        
        .cute-icon:nth-child(2) {
            animation-delay: 0.15s, 0.35s;
            --scatter-x: 0px;
            --scatter-y: -40px;
        }
        
        .cute-icon:nth-child(3) {
            animation-delay: 0.3s, 0.5s;
            --scatter-x: 50px;
            --scatter-y: -25px;
        }
        
        .cute-text {
            font-size: 24px;
            font-weight: bold;
            color: #ff69b4;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 105, 180, 0.8);
            margin-bottom: 8px;
            animation: cutePulse 0.5s ease-out;
        }
        
        .cute-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            margin-bottom: 8px;
        }
        
        .summoning-names {
            font-size: 14px;
            font-weight: bold;
            color: #ffb6c1;
            text-shadow: 
                1px 1px 2px rgba(0, 0, 0, 0.8),
                0 0 10px rgba(255, 182, 193, 0.6);
            margin-bottom: 8px;
            line-height: 1.2;
            animation: slideUp 0.8s ease-out 0.5s both;
        }
        
        /* Error styles */
        .cute-cheese-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .cute-cheese-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .cute-cheese-error-icon {
            font-size: 20px;
        }
        
        .cute-cheese-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes cuteCheeseErrorBounce {
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
        
        @keyframes cuteCheeseErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes cuteFloat {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-60px);
            }
        }
        
        @keyframes cuteBounce {
            0% {
                transform: scale(0) rotate(0deg);
            }
            50% {
                transform: scale(1.2) rotate(180deg);
            }
            100% {
                transform: scale(1) rotate(360deg);
            }
        }
        
        @keyframes cuteScatter {
            from {
                transform: translateX(0) translateY(0);
            }
            to {
                transform: translateX(var(--scatter-x)) translateY(var(--scatter-y));
            }
        }
        
        @keyframes cutePulse {
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
        
        @keyframes heartFloat {
            0% {
                transform: translateY(0) rotate(0deg) scale(1);
                opacity: 1;
            }
            50% {
                transform: translateY(-15px) rotate(-15deg) scale(1.1);
            }
            100% {
                transform: translateY(-25px) rotate(15deg) scale(0.9);
                opacity: 0;
            }
        }
        
        @keyframes cloudDrift {
            0% {
                transform: translateX(0) translateY(0) scale(1);
                opacity: 1;
            }
            50% {
                transform: translateX(10px) translateY(-5px) scale(1.15);
            }
            100% {
                transform: translateX(20px) translateY(0) scale(1);
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