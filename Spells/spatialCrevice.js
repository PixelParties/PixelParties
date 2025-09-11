// spatialCrevice.js - Spatial Crevice Area Effect
// Prevents disenchanting and adds random cards each turn

export class SpatialCreviceEffect {
    constructor() {
        this.isActive = false;
        this.allPossibleCards = null;
    }

    // Check if Spatial Crevice should be active
    checkSpatialCreviceActive(heroSelection) {
        if (!heroSelection?.areaHandler) return false;
        
        const areaCard = heroSelection.areaHandler.getAreaCard();
        return areaCard && areaCard.name === 'SpatialCrevice';
    }

    // Get all possible cards from all characters
    getAllPossibleCards(heroSelection) {
        if (this.allPossibleCards) return this.allPossibleCards;
        
        if (!heroSelection?.characterCards) return [];
        
        const allCards = new Set();
        
        // Extract all cards from all characters
        Object.values(heroSelection.characterCards).forEach(characterCards => {
            characterCards.forEach(card => allCards.add(card));
        });
        
        this.allPossibleCards = Array.from(allCards);
        return this.allPossibleCards;
    }

    // Find a card the player doesn't have in deck
    findCardNotInDeck(heroSelection) {
        const allCards = this.getAllPossibleCards(heroSelection);
        if (allCards.length === 0) return null;
        
        const currentDeck = heroSelection.deckManager.getDeck();
        const deckCardSet = new Set(currentDeck);
        
        // Find cards not in deck
        const availableCards = allCards.filter(card => !deckCardSet.has(card));
        
        // If no cards available, pick any random card
        const cardsToChooseFrom = availableCards.length > 0 ? availableCards : allCards;
        
        // Return random card
        const randomIndex = Math.floor(Math.random() * cardsToChooseFrom.length);
        return cardsToChooseFrom[randomIndex];
    }

    // Add random card to hand at turn start
    async addRandomCardToHand(heroSelection) {
        if (!this.checkSpatialCreviceActive(heroSelection)) return false;
        
        // Check if hand is full
        if (heroSelection.handManager.isHandFull()) {
            console.log('SpatialCrevice: Cannot add card - hand is full');
            return false;
        }
        
        // Find a card not in deck
        const cardToAdd = this.findCardNotInDeck(heroSelection);
        if (!cardToAdd) {
            console.log('SpatialCrevice: No cards available to add');
            return false;
        }
        
        // Add to hand
        const success = await heroSelection.addCardToHand(cardToAdd);
        if (success) {
            console.log(`SpatialCrevice: Added ${cardToAdd} to hand`);
            
            // Show chaotic energy animation after a brief delay to ensure card is in UI
            setTimeout(() => {
                this.createChaoticEnergyAnimation(cardToAdd, heroSelection);
            }, 200);
            
            return true;
        }
        
        return false;
    }

    // Create chaotic energy animation around newly added card
    createChaoticEnergyAnimation(cardName, heroSelection) {
        // Find the card element in hand
        const handCards = document.querySelectorAll('.hand-card');
        let targetCard = null;
        
        // Find the card by data attribute or by checking card name
        handCards.forEach(cardElement => {
            const cardNameAttr = cardElement.getAttribute('data-card-name');
            if (cardNameAttr === cardName) {
                targetCard = cardElement;
            }
        });
        
        if (!targetCard) {
            console.warn('SpatialCrevice: Could not find target card for animation');
            return;
        }
        
        // Create chaotic energy container
        const energyContainer = document.createElement('div');
        energyContainer.className = 'spatial-crevice-energy-container';
        
        // Create multiple chaotic particles
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'spatial-crevice-particle';
            particle.style.animationDelay = `${i * 0.08}s`;
            energyContainer.appendChild(particle);
        }
        
        // Create energy rings
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            ring.className = 'spatial-crevice-ring';
            ring.style.animationDelay = `${i * 0.3}s`;
            energyContainer.appendChild(ring);
        }
        
        // Create reality distortion text
        const distortionText = document.createElement('div');
        distortionText.className = 'spatial-crevice-text';
        distortionText.textContent = 'REALITY BREACH';
        energyContainer.appendChild(distortionText);
        
        // Position relative to card
        targetCard.style.position = 'relative';
        targetCard.appendChild(energyContainer);
        
        // Remove after animation completes
        setTimeout(() => {
            if (energyContainer.parentNode) {
                energyContainer.remove();
            }
        }, 1500);
    }

    // Check if disenchanting should be prevented
    shouldPreventDisenchant(heroSelection) {
        return this.checkSpatialCreviceActive(heroSelection);
    }

    // Show disenchant prevention error
    showDisenchantPreventionError(event) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'spatial-crevice-error-popup';
        errorDiv.innerHTML = `
            <div class="spatial-crevice-error-content">
                <span class="spatial-crevice-error-icon">🌀</span>
                <span class="spatial-crevice-error-text">The space anomaly prevents getting rid of cards easily!</span>
            </div>
        `;
        
        const x = event ? event.clientX : window.innerWidth / 2;
        const y = event ? event.clientY : window.innerHeight / 2;
        
        errorDiv.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y - 50}px;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
            color: white;
            padding: 14px 22px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: spatialCreviceErrorBounce 0.6s ease-out;
            box-shadow: 0 6px 20px rgba(138, 43, 226, 0.6);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'spatialCreviceErrorFade 0.4s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 400);
        }, 2500);
    }

    // Export state for save/load
    exportState() {
        return {
            isActive: this.isActive
        };
    }

    // Import state from save
    importState(state) {
        if (!state) return;
        this.isActive = state.isActive || false;
    }

    // Cleanup
    cleanup() {
        this.isActive = false;
        this.allPossibleCards = null;
    }
}

// Initialize a SpatialCrevice area
export function initializeSpatialCreviceArea(areaCard) {
    if (areaCard && areaCard.name === 'SpatialCrevice') {
        // SpatialCrevice doesn't need counters like GatheringStorm
        console.log('SpatialCrevice area initialized');
    }
    return areaCard;
}

// Initialize SpatialCrevice system
export function initializeSpatialCreviceSystem() {
    if (!window.heroSelection) {
        setTimeout(() => initializeSpatialCreviceSystem(), 1000);
        return;
    }

    // Create global SpatialCrevice effect instance
    if (!window.spatialCreviceEffect) {
        window.spatialCreviceEffect = new SpatialCreviceEffect();
    }

    // Hook into turn changes to add cards
    hookIntoTurnChanges();
    
    // Hook into disenchant prevention
    hookIntoDisenchantPrevention();
    
    console.log('SpatialCrevice system initialized');
}

// Hook into turn changes to add cards each turn
function hookIntoTurnChanges() {
    if (!window.heroSelection.onTurnChange._spatialCreviceWrapped) {
        const originalOnTurnChange = window.heroSelection.onTurnChange.bind(window.heroSelection);
        
        window.heroSelection.onTurnChange = async function(turnChangeData) {
            // Call original method first
            await originalOnTurnChange.call(this, turnChangeData);
            
            // Add SpatialCrevice card if active
            if (window.spatialCreviceEffect) {
                await window.spatialCreviceEffect.addRandomCardToHand(this);
            }
        };
        
        window.heroSelection.onTurnChange._spatialCreviceWrapped = true;
    }
}

// Hook into disenchant prevention
function hookIntoDisenchantPrevention() {
    if (!window.handManager) return;
    
    // Hook into disenchantCard method
    if (!window.handManager.disenchantCard._spatialCreviceWrapped) {
        const originalDisenchantCard = window.handManager.disenchantCard.bind(window.handManager);
        
        window.handManager.disenchantCard = async function(cardIndex, cardName, cardElement) {
            // Check if SpatialCrevice prevents disenchanting
            if (window.spatialCreviceEffect && window.heroSelection) {
                if (window.spatialCreviceEffect.shouldPreventDisenchant(window.heroSelection)) {
                    window.spatialCreviceEffect.showDisenchantPreventionError(window.event);
                    return false;
                }
            }
            
            // Call original method if not prevented
            return await originalDisenchantCard.call(this, cardIndex, cardName, cardElement);
        };
        
        window.handManager.disenchantCard._spatialCreviceWrapped = true;
    }
    
    // Also hook into the drag-to-discard functionality (onHandCardDragEnd)
    if (window.onHandCardDragEnd && !window.onHandCardDragEnd._spatialCreviceWrapped) {
        const originalDragEnd = window.onHandCardDragEnd;
        
        window.onHandCardDragEnd = async function(event) {
            // Check if trying to drag to discard pile
            if (window.handManager && window.handManager.isHandDragging()) {
                const dragState = window.handManager.getHandDragState();
                
                if (dragState.isDragging) {
                    const handContainer = document.querySelector('.hand-cards');
                    if (handContainer) {
                        const rect = handContainer.getBoundingClientRect();
                        const x = event.clientX;
                        const y = event.clientY;
                        
                        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                            // Check if dropped on discard pile
                            const discardPile = document.getElementById('discardPileSlot');
                            let droppedOnDiscardPile = false;
                            
                            if (discardPile) {
                                const discardRect = discardPile.getBoundingClientRect();
                                droppedOnDiscardPile = (
                                    x >= discardRect.left && 
                                    x <= discardRect.right && 
                                    y >= discardRect.top && 
                                    y <= discardRect.bottom
                                );
                            }
                            
                            // If dropped on discard pile, check SpatialCrevice
                            if (droppedOnDiscardPile && window.spatialCreviceEffect && window.heroSelection) {
                                if (window.spatialCreviceEffect.shouldPreventDisenchant(window.heroSelection)) {
                                    window.spatialCreviceEffect.showDisenchantPreventionError(event);
                                    window.handManager.endHandCardDrag();
                                    return;
                                }
                            }
                        }
                    }
                }
            }
            
            // Call original method
            return await originalDragEnd.call(this, event);
        };
        
        window.onHandCardDragEnd._spatialCreviceWrapped = true;
    }
}

// CSS for SpatialCrevice animations and effects
if (typeof document !== 'undefined' && !document.getElementById('spatialCreviceStyles')) {
    const style = document.createElement('style');
    style.id = 'spatialCreviceStyles';
    style.textContent = `
        /* Chaotic energy container */
        .spatial-crevice-energy-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 1000;
            overflow: visible;
        }
        
        /* Chaotic particles */
        .spatial-crevice-particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: radial-gradient(circle, #ff00ff, #8a2be2);
            border-radius: 50%;
            animation: spatialCreviceParticle 1.2s ease-out forwards;
            box-shadow: 0 0 8px #ff00ff;
        }
        
        .spatial-crevice-particle:nth-child(1) { top: 20%; left: 30%; }
        .spatial-crevice-particle:nth-child(2) { top: 10%; right: 25%; }
        .spatial-crevice-particle:nth-child(3) { top: 70%; left: 15%; }
        .spatial-crevice-particle:nth-child(4) { bottom: 15%; right: 20%; }
        .spatial-crevice-particle:nth-child(5) { top: 45%; left: 60%; }
        .spatial-crevice-particle:nth-child(6) { top: 85%; left: 70%; }
        .spatial-crevice-particle:nth-child(7) { top: 25%; right: 45%; }
        .spatial-crevice-particle:nth-child(8) { bottom: 35%; left: 25%; }
        .spatial-crevice-particle:nth-child(9) { top: 60%; right: 60%; }
        .spatial-crevice-particle:nth-child(10) { top: 5%; left: 50%; }
        .spatial-crevice-particle:nth-child(11) { bottom: 60%; right: 35%; }
        .spatial-crevice-particle:nth-child(12) { top: 35%; left: 80%; }
        
        /* Energy rings */
        .spatial-crevice-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            border: 2px solid #8a2be2;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: spatialCreviceRing 1s ease-out forwards;
            box-shadow: 0 0 10px #8a2be2;
        }
        
        /* Reality distortion text */
        .spatial-crevice-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 8px;
            color: #ff00ff;
            font-weight: bold;
            text-shadow: 0 0 8px #ff00ff;
            animation: spatialCreviceTextGlitch 1s ease-out;
            white-space: nowrap;
            z-index: 1001;
            letter-spacing: 1px;
        }
        
        /* Error popup styling */
        .spatial-crevice-error-popup {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .spatial-crevice-error-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .spatial-crevice-error-icon {
            font-size: 22px;
            animation: spatialCreviceErrorSpin 2s linear infinite;
        }
        
        .spatial-crevice-error-text {
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.6);
        }
        
        /* Animations */
        @keyframes spatialCreviceParticle {
            0% {
                opacity: 0;
                transform: scale(0) rotate(0deg);
                box-shadow: 0 0 0 rgba(255, 0, 255, 0);
            }
            25% {
                opacity: 1;
                transform: scale(1.5) rotate(90deg);
                box-shadow: 0 0 15px rgba(255, 0, 255, 0.8);
            }
            50% {
                opacity: 1;
                transform: scale(1) rotate(180deg);
                box-shadow: 0 0 20px rgba(138, 43, 226, 0.6);
            }
            75% {
                opacity: 0.8;
                transform: scale(1.2) rotate(270deg);
                box-shadow: 0 0 25px rgba(255, 0, 255, 0.4);
            }
            100% {
                opacity: 0;
                transform: scale(2) rotate(360deg);
                box-shadow: 0 0 30px rgba(138, 43, 226, 0.2);
            }
        }
        
        @keyframes spatialCreviceRing {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0);
                border-width: 4px;
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
                border-width: 3px;
            }
            70% {
                opacity: 0.6;
                transform: translate(-50%, -50%) scale(2);
                border-width: 2px;
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(3);
                border-width: 1px;
            }
        }
        
        @keyframes spatialCreviceTextGlitch {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
                text-shadow: 0 0 0 #ff00ff;
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
                text-shadow: 0 0 15px #ff00ff, 2px 0 0 #8a2be2, -2px 0 0 #ff00ff;
            }
            40% {
                opacity: 0.8;
                transform: translate(-50%, -50%) scale(0.9);
                text-shadow: 0 0 10px #8a2be2, -1px 0 0 #ff00ff, 1px 0 0 #8a2be2;
            }
            60% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1);
                text-shadow: 0 0 12px #ff00ff, 1px 0 0 #8a2be2, -1px 0 0 #ff00ff;
            }
            80% {
                opacity: 0.7;
                transform: translate(-50%, -50%) scale(1);
                text-shadow: 0 0 8px #8a2be2;
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
                text-shadow: 0 0 5px #ff00ff;
            }
        }
        
        @keyframes spatialCreviceErrorBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(25px) scale(0.7);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-8px) scale(1.08);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes spatialCreviceErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-15px) scale(0.9);
            }
        }
        
        @keyframes spatialCreviceErrorSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize the SpatialCrevice system when the module loads
if (typeof window !== 'undefined') {
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeSpatialCreviceSystem();
        });
    } else {
        initializeSpatialCreviceSystem();
    }
}

export default SpatialCreviceEffect;