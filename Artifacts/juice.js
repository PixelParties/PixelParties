// juice.js - Juice Card Handler Module

export const juiceArtifact = {
    // Card name this artifact handles
    cardName: 'Juice',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`Juice clicked at index ${cardIndex}`);
        
        // Consume the card and add to permanent list
        await this.consumeCard(cardIndex, heroSelection);
    },
    
    // Core logic to consume card (no game effects yet, just testing permanent list)
    async consumeCard(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        
        if (!handManager) {
            console.error('Hand manager not available');
            return;
        }
        
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // **IMPORTANT: Add to permanent artifacts list!**
        if (window.artifactHandler) {
            window.artifactHandler.addPermanentArtifact(this.cardName);
            console.log('📋 Juice added to permanent artifacts tracking!');
            
            // Update the permanent artifacts indicator
            if (window.heroSelection && window.heroSelection.heroSelectionUI) {
                window.heroSelection.heroSelectionUI.updatePermanentArtifactsIndicator();
            }
        }
        
        // Show visual feedback
        this.showJuiceAnimation(cardIndex);
        
        // Update UI
        heroSelection.updateHandDisplay();
        
        // Save game state (now includes the permanent artifact)
        await heroSelection.saveGameState();
        
        console.log(`🧃 Juice consumed and added to permanent artifacts list!`);
    },
    
    // Show juice consumption animation
    showJuiceAnimation(cardIndex) {
        // Create floating juice animation
        const juiceBurst = document.createElement('div');
        juiceBurst.className = 'juice-burst-animation';
        juiceBurst.innerHTML = `
            <div class="juice-splash">
                <span class="juice-drop">🧃</span>
                <span class="juice-drop">✨</span>
                <span class="juice-drop">📋</span>
            </div>
            <div class="juice-text">Added to Permanent List!</div>
            <div class="juice-subtext">Testing permanent artifact tracking</div>
        `;
        
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                juiceBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                juiceBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                juiceBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                juiceBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(juiceBurst);
        
        // Remove after animation
        setTimeout(() => {
            juiceBurst.remove();
        }, 3500);
        
        // Play sound effect if available
        this.playJuiceSound();
    },
    
    // Play juice sound
    playJuiceSound() {
        // Placeholder for sound effect
        console.log('🎵 *Juice consumed - added to permanent list*');
    }
};

// Add styles for the animation
if (typeof document !== 'undefined' && !document.getElementById('juiceStyles')) {
    const style = document.createElement('style');
    style.id = 'juiceStyles';
    style.textContent = `
        /* Juice Burst Animation */
        .juice-burst-animation {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: juiceFadeOut 3.5s ease-out forwards;
        }
        
        .juice-splash {
            display: flex;
            gap: 12px;
            margin-bottom: 15px;
            animation: juiceFloatUp 2.5s ease-out;
            justify-content: center;
            align-items: center;
        }
        
        .juice-drop {
            font-size: 32px;
            animation: juiceBounce 1.8s ease-out, juiceScatter 2.5s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.6));
        }
        
        .juice-drop:nth-child(1) {
            animation-delay: 0s, 0.2s;
            --scatter-x: -40px;
        }
        
        .juice-drop:nth-child(2) {
            animation-delay: 0.1s, 0.3s;
            --scatter-x: 0px;
        }
        
        .juice-drop:nth-child(3) {
            animation-delay: 0.2s, 0.4s;
            --scatter-x: 40px;
        }
        
        .juice-text {
            font-size: 22px;
            font-weight: bold;
            color: #ff6b6b;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 107, 107, 0.8);
            text-align: center;
            animation: juicePulse 0.8s ease-out;
            margin-bottom: 5px;
        }
        
        .juice-subtext {
            font-size: 16px;
            font-weight: bold;
            color: #4ecdc4;
            text-shadow: 
                1px 1px 2px rgba(0, 0, 0, 0.6),
                0 0 15px rgba(78, 205, 196, 0.6);
            text-align: center;
            animation: juiceSubPulse 1s ease-out 0.3s both;
        }
        
        @keyframes juiceFloatUp {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-70px);
            }
        }
        
        @keyframes juiceBounce {
            0% {
                transform: scale(1) rotate(0deg);
            }
            25% {
                transform: scale(1.4) rotate(5deg);
            }
            50% {
                transform: scale(1.1) rotate(-3deg);
            }
            75% {
                transform: scale(1.3) rotate(2deg);
            }
            100% {
                transform: scale(1) rotate(0deg);
            }
        }
        
        @keyframes juiceScatter {
            from {
                transform: translateX(0) translateY(0);
            }
            to {
                transform: translateX(var(--scatter-x)) translateY(-50px);
            }
        }
        
        @keyframes juicePulse {
            0% {
                transform: scale(0.3);
                opacity: 0;
            }
            50% {
                transform: scale(1.4);
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }
        
        @keyframes juiceSubPulse {
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
        
        @keyframes juiceFadeOut {
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
        
        /* Add special permanent artifact glow effect for juice cards in hand */
        .hand-card[data-card-name="Juice"] {
            position: relative;
            border: 2px solid #ff6b6b !important;
            box-shadow: 
                0 0 15px rgba(255, 107, 107, 0.6),
                inset 0 0 15px rgba(255, 107, 107, 0.1) !important;
            animation: juiceCardGlow 3s ease-in-out infinite;
        }
        
        .hand-card[data-card-name="Juice"]::before {
            content: "⚡";
            position: absolute;
            top: -5px;
            right: -5px;
            font-size: 18px;
            background: radial-gradient(circle, #ff6b6b, #ff8e8e);
            border-radius: 50%;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            z-index: 10;
            animation: juiceCardPermanentPulse 2s ease-in-out infinite;
        }
        
        @keyframes juiceCardGlow {
            0%, 100% { 
                box-shadow: 
                    0 0 15px rgba(255, 107, 107, 0.6),
                    inset 0 0 15px rgba(255, 107, 107, 0.1);
            }
            50% { 
                box-shadow: 
                    0 0 25px rgba(255, 107, 107, 0.9),
                    inset 0 0 25px rgba(255, 107, 107, 0.2);
            }
        }
        
        @keyframes juiceCardPermanentPulse {
            0%, 100% { 
                transform: scale(1);
                filter: drop-shadow(0 0 5px rgba(255, 107, 107, 0.8));
            }
            50% { 
                transform: scale(1.15);
                filter: drop-shadow(0 0 10px rgba(255, 107, 107, 1));
            }
        }
    `;
    document.head.appendChild(style);
}