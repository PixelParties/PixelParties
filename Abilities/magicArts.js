// Abilities/magicArts.js - MagicArts Redraw System

export const magicArtsRedraw = {
    // Check if a card is a MagicArts spell
    isMagicArtsSpell(cardName, heroSelection) {
        if (!heroSelection || !heroSelection.getCardInfo) {
            return false;
        }
        
        const cardInfo = heroSelection.getCardInfo(cardName);
        return cardInfo && cardInfo.spellSchool === 'MagicArts';
    },
    
    // Calculate total MagicArts levels across all heroes
    getTotalMagicArtsLevel(heroSelection) {
        if (!heroSelection || !heroSelection.heroAbilitiesManager || !heroSelection.formationManager) {
            return 0;
        }
        
        const formation = heroSelection.formationManager.getBattleFormation();
        let totalMagicArts = 0;
        
        ['left', 'center', 'right'].forEach(position => {
            if (formation[position]) {
                const magicArtsLevel = heroSelection.heroAbilitiesManager.getAbilityStackCountForPosition(position, 'MagicArts');
                totalMagicArts += magicArtsLevel;
            }
        });
        
        return totalMagicArts;
    },
    
    // Roll for redraw chance
    rollForRedraw(magicArtsLevel) {
        if (magicArtsLevel <= 0) {
            return false;
        }
        
        // Roll 20% chance for each MagicArts level
        for (let i = 0; i < magicArtsLevel; i++) {
            const roll = Math.random();
            if (roll <= 0.2) {
                return true; // Success! Player gets a redraw
            }
        }
        
        return false; // No success
    },
    
    // Main function to handle MagicArts redraw after spell activation
    async handleMagicArtsRedraw(cardName, heroSelection) {
        if (!this.isMagicArtsSpell(cardName, heroSelection)) {
            return false; // Not a MagicArts spell
        }
        
        const totalMagicArts = this.getTotalMagicArtsLevel(heroSelection);
        
        if (totalMagicArts <= 0) {
            return false; // No MagicArts levels
        }
        
        const shouldRedraw = this.rollForRedraw(totalMagicArts);
        if (!shouldRedraw) {
            return false;
        }
        
        // Success! Draw a card        
        try {
            const drawnCards = heroSelection.handManager.drawCards(1);
            if (drawnCards && drawnCards.length > 0) {
                const drawnCard = drawnCards[0];
                
                // Update hand display
                heroSelection.updateHandDisplay();
                
                // Save state
                await heroSelection.saveGameState();
                
                // Show sparkle effect on the newly drawn card
                setTimeout(() => {
                    this.showMagicArtsSparkleEffect(drawnCard);
                }, 150); // Small delay to ensure DOM is updated
                
                return true;
            }
        } catch (error) {
            console.error('Error during MagicArts redraw:', error);
        }
        
        return false;
    },
    
    // Show sparkle particle effect over the newly drawn card
    showMagicArtsSparkleEffect(cardName) {
        // Find the newly drawn card in the hand (should be the last one)
        const handCards = document.querySelectorAll('.hand-card');
        
        // Try to find by card name first
        let targetCard = Array.from(handCards).find(card => {
            const cardNameAttr = card.getAttribute('data-card-name');
            return cardNameAttr === cardName;
        });
        
        // If not found by name, use the last card (newly drawn)
        if (!targetCard && handCards.length > 0) {
            targetCard = handCards[handCards.length - 1];
        }
        
        if (!targetCard) {
            console.warn(`Could not find card ${cardName} for sparkle effect`);
            return;
        }
        
        this.addMagicArtsSparkleEffect(targetCard);
    },
    
    // Add sparkle particle effect to a card element
    addMagicArtsSparkleEffect(cardElement) {
        // Create sparkle container
        const sparkleContainer = document.createElement('div');
        sparkleContainer.className = 'magic-arts-sparkles';
        sparkleContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 20;
            overflow: visible;
        `;
        
        // Create multiple sparkle particles
        for (let i = 0; i < 15; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'magic-arts-sparkle-particle';
            sparkle.innerHTML = ['✨', '⭐', '💫', '🌟', '⚡'][Math.floor(Math.random() * 5)];
            
            const angle = (i / 15) * 360 + Math.random() * 30;
            const distance = 25 + Math.random() * 30;
            const duration = 1800 + Math.random() * 1200;
            const delay = i * 70;
            
            sparkle.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                font-size: ${10 + Math.random() * 14}px;
                color: #9d4edd;
                text-shadow: 0 0 12px #9d4edd, 0 0 24px #c77dff, 0 0 36px #e0aaff;
                animation: magicArtsSparkle ${duration}ms ease-out forwards;
                animation-delay: ${delay}ms;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                transform: translate(-50%, -50%);
            `;
            
            sparkleContainer.appendChild(sparkle);
        }
        
        // Add magical glow effect to the card itself
        cardElement.style.position = 'relative';
        cardElement.classList.add('magic-arts-redrawn');
        cardElement.appendChild(sparkleContainer);
        
        // Remove sparkles and glow after animation
        setTimeout(() => {
            sparkleContainer.remove();
            cardElement.classList.remove('magic-arts-redrawn');
        }, 4000);
    }
};

// Add CSS animations if not already present
if (typeof document !== 'undefined' && !document.getElementById('magicArtsRedrawStyles')) {
    const style = document.createElement('style');
    style.id = 'magicArtsRedrawStyles';
    style.textContent = `
        @keyframes magicArtsSparkle {
            0% {
                transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(0);
                opacity: 0;
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-12px) scale(1.1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(-1 * var(--distance))) scale(0.2);
            }
        }
        
        .magic-arts-redrawn {
            animation: magicArtsRedrawGlow 3.5s ease-out;
        }
        
        @keyframes magicArtsRedrawGlow {
            0% {
                box-shadow: 0 0 0 rgba(157, 78, 221, 0);
                filter: brightness(1);
            }
            20% {
                box-shadow: 0 0 25px rgba(157, 78, 221, 0.8), 0 0 50px rgba(199, 125, 255, 0.4);
                filter: brightness(1.3);
            }
            40% {
                box-shadow: 0 0 30px rgba(157, 78, 221, 1), 0 0 60px rgba(199, 125, 255, 0.6);
                filter: brightness(1.5);
            }
            60% {
                box-shadow: 0 0 35px rgba(157, 78, 221, 0.9), 0 0 70px rgba(199, 125, 255, 0.5);
                filter: brightness(1.4);
            }
            100% {
                box-shadow: 0 0 0 rgba(157, 78, 221, 0);
                filter: brightness(1);
            }
        }
        
        .magic-arts-sparkles .magic-arts-sparkle-particle {
            animation-fill-mode: both;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.magicArtsRedraw = magicArtsRedraw;
}