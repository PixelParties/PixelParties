// potionHandler.js - Potion Management System with Alchemy Integration

export class PotionHandler {
    constructor() {
        this.basePotions = 1; // Base potions per turn (always 1)
        this.alchemyBonuses = 0; // Additional potions from Alchemy abilities
        this.availablePotions = 1; // Current available potions this turn
        this.maxPotions = 1; // Maximum potions (base + alchemy bonuses)
        
        console.log('PotionHandler initialized');
    }

    // ===== POTION DETECTION =====

    // Check if a card is a potion
    isPotionCard(cardName, heroSelection = null) {
        // Get card info to check card type
        const cardInfo = heroSelection?.getCardInfo ? heroSelection.getCardInfo(cardName) : null;
        
        if (cardInfo && cardInfo.cardType === 'Potion') {
            return true;
        }
        
        // Fallback: hardcoded list of known potions for backwards compatibility
        const knownPotions = [
            'ExperimentalPotion',
            'ElixirOfStrength', 
            'ElixirOfImmortality',
            'LifeSerum',
            'PoisonVial'
        ];
        
        return knownPotions.includes(cardName);
    }

    // ===== POTION USAGE =====

    // Check if player can use a potion
    canUsePotion() {
        return this.availablePotions > 0;
    }

    // Main handler for potion click
    async handlePotionClick(cardIndex, cardName, heroSelection) {
        return await this.usePotion(cardIndex, cardName, heroSelection);
    }

    // Main handler for potion drag (when dragged out of hand)
    async handlePotionDrag(cardIndex, cardName, heroSelection) {
        return await this.usePotion(cardIndex, cardName, heroSelection);
    }

    // Use a potion (core logic)
    async usePotion(cardIndex, cardName, heroSelection) {
        try {
            // Check if player can use potions
            if (!this.canUsePotion()) {
                this.showPotionError("You can't drink any more Potions this turn!", cardName);
                return false; // Return false so card stays in hand
            }

            // Consume one available potion
            this.availablePotions--;
            
            // Remove card from hand
            if (heroSelection.handManager) {
                heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            }

            // Draw a card from deck
            if (heroSelection.handManager && heroSelection.deckManager) {
                const drawnCards = heroSelection.handManager.drawCards(1);
                
                if (drawnCards.length > 0) {
                    console.log(`Drew ${drawnCards[0]} after using ${cardName}`);
                } else {
                    console.log('No cards available to draw after using potion');
                }
            }

            // Show usage notification
            this.showPotionUsage(cardName);

            // Update UI displays
            if (heroSelection.updateHandDisplay) {
                heroSelection.updateHandDisplay();
            }
            this.updatePotionDisplay();

            // Save game state
            if (heroSelection.autoSave) {
                await heroSelection.autoSave();
            }

            console.log(`Used potion: ${cardName}. Available potions: ${this.availablePotions}/${this.maxPotions}`);
            return true;

        } catch (error) {
            console.error('Error using potion:', error);
            this.showPotionError('Failed to use potion!', cardName);
            return false;
        }
    }

    // ===== ALCHEMY INTEGRATION =====

    // Update alchemy bonuses by counting Alchemy abilities across all heroes
    updateAlchemyBonuses(heroSelection, preserveAvailablePotions = false) {
        let alchemyCount = 0;

        if (heroSelection.heroAbilitiesManager) {
            // Check all hero positions
            ['left', 'center', 'right'].forEach(position => {
                const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
                
                if (heroAbilities) {
                    // Check all zones for this hero
                    ['zone1', 'zone2', 'zone3'].forEach(zone => {
                        if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                            // Count Alchemy abilities in this zone
                            const alchemyInZone = heroAbilities[zone].filter(ability => 
                                ability && ability.name === 'Alchemy'
                            ).length;
                            alchemyCount += alchemyInZone;
                        }
                    });
                }
            });
        }

        const previousBonuses = this.alchemyBonuses;
        this.alchemyBonuses = alchemyCount;
        this.maxPotions = this.basePotions + this.alchemyBonuses;

        // ✅ FIX: Only modify availablePotions if NOT preserving them (i.e., during normal gameplay)
        if (!preserveAvailablePotions) {
            // If alchemy bonuses increased, immediately add to available potions
            if (this.alchemyBonuses > previousBonuses) {
                const increase = this.alchemyBonuses - previousBonuses;
                this.availablePotions += increase;
                console.log(`Alchemy bonuses increased by ${increase}! Available potions: ${this.availablePotions}/${this.maxPotions}`);
                
                // Update display immediately
                this.updatePotionDisplay();
            } else if (this.alchemyBonuses < previousBonuses) {
                // If alchemy bonuses decreased, adjust max but don't reduce current (until next turn)
                console.log(`Alchemy bonuses decreased. Max potions: ${this.maxPotions}, Current: ${this.availablePotions}`);
                
                // Update display
                this.updatePotionDisplay();
            }
        } else {
            // During reconnection - just recalculate max, don't touch available
            console.log(`🧪 Alchemy bonuses recalculated: ${this.alchemyBonuses}, Max potions: ${this.maxPotions}, Available preserved: ${this.availablePotions}`);
            
            // Update display
            this.updatePotionDisplay();
        }

        return this.alchemyBonuses;
    }

    // ===== TURN MANAGEMENT =====

    // Reset potions for new turn
    resetPotionsForTurn() {
        this.availablePotions = this.maxPotions;
        console.log(`Potions reset for new turn: ${this.availablePotions}/${this.maxPotions}`);
        
        // Update display
        this.updatePotionDisplay();
    }

    // ===== UI MANAGEMENT =====

    // Create potion display HTML
    createPotionDisplay() {
        const potionIcon = this.availablePotions > 0 ? '🧪' : '⚗️';
        const displayClass = this.availablePotions === 0 ? 'potions-depleted' : '';
        
        return `
            <div class="potion-display ${displayClass}" id="potionDisplay">
                <div class="potion-label">Available Potions</div>
                <div class="potion-amount">
                    <span class="potion-icon">${potionIcon}</span>
                    <span class="potion-number">${this.availablePotions}</span>
                </div>
            </div>
        `;
    }

    // Update potion display in the UI
    updatePotionDisplay() {
        const potionDisplay = document.getElementById('potionDisplay');
        if (potionDisplay) {
            const newHTML = this.createPotionDisplay();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHTML;
            const newPotionDisplay = tempDiv.firstElementChild;
            
            potionDisplay.parentNode.replaceChild(newPotionDisplay, potionDisplay);
        }
    }

    // Show potion usage notification
    showPotionUsage(potionName) {
        const formattedName = this.formatCardName(potionName);
        
        const notification = document.createElement('div');
        notification.className = 'potion-usage-notification';
        notification.innerHTML = `
            <div class="potion-usage-content">
                <span class="potion-usage-icon">🧙‍♂️</span>
                <span class="potion-usage-text">${formattedName} has been used!</span>
            </div>
        `;
        
        // Position in center of screen
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: potionUsageBounce 0.6s ease-out;
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => {
            notification.style.animation = 'potionUsageFade 0.4s ease-out forwards';
            setTimeout(() => notification.remove(), 400);
        }, 2000);
    }

    // Show potion error notification
    showPotionError(message, potionName = '') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'potion-error-popup';
        errorDiv.innerHTML = `
            <div class="potion-error-content">
                <span class="potion-error-icon">⚗️</span>
                <span class="potion-error-text">${message}</span>
            </div>
        `;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
            color: white;
            padding: 14px 22px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: potionErrorBounce 0.5s ease-out;
            box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'potionErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2000);
    }

    // ===== STATE PERSISTENCE =====

    // Export potion state for saving
    exportPotionState() {
        return {
            basePotions: this.basePotions,
            alchemyBonuses: this.alchemyBonuses,
            availablePotions: this.availablePotions,
            maxPotions: this.maxPotions,
            exportedAt: Date.now()
        };
    }

    // ✅ FIXED: Import potion state for loading (preserves 0 values and supports reconnection mode)
    importPotionState(state, isReconnection = false) {
        if (!state) {
            console.log('No potion state to import, using defaults');
            return false;
        }

        this.basePotions = state.basePotions || 1;
        this.alchemyBonuses = state.alchemyBonuses || 0;
        
        // ✅ FIX: Properly handle 0 values by checking for undefined/null instead of falsy
        this.availablePotions = (state.availablePotions !== undefined && state.availablePotions !== null) ? state.availablePotions : 1;
        this.maxPotions = state.maxPotions || 1;

        console.log('Imported potion state:', {
            available: this.availablePotions,
            max: this.maxPotions,
            alchemy: this.alchemyBonuses,
            isReconnection: isReconnection
        });

        return true;
    }

    // ===== UTILITY METHODS =====

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Get current potion status
    getPotionStatus() {
        return {
            available: this.availablePotions,
            max: this.maxPotions,
            basePotions: this.basePotions,
            alchemyBonuses: this.alchemyBonuses,
            canUse: this.canUsePotion()
        };
    }

    // Reset to initial state
    reset() {
        this.basePotions = 1;
        this.alchemyBonuses = 0;
        this.availablePotions = 1;
        this.maxPotions = 1;
        
        console.log('PotionHandler reset to initial state');
    }
}

// Create global instance
const potionHandler = new PotionHandler();

// Add CSS for potion notifications and display
if (typeof document !== 'undefined' && !document.getElementById('potionHandlerStyles')) {
    const style = document.createElement('style');
    style.id = 'potionHandlerStyles';
    style.textContent = `
        /* Potion Display Styles */
        .potion-display {
            background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.2);
            min-width: 140px;
            transition: all 0.3s ease;
        }

        .potion-display.potions-depleted {
            background: linear-gradient(135deg, #757575 0%, #424242 100%);
            opacity: 0.7;
        }

        .potion-label {
            font-weight: bold;
            font-size: 14px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
            margin-bottom: 4px;
        }

        .potion-amount {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .potion-icon {
            font-size: 20px;
            filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5));
        }

        .potion-number {
            font-size: 24px;
            font-weight: bold;
            color: #e1f5fe;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* Potion Usage Animations */
        @keyframes potionUsageBounce {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            60% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }

        @keyframes potionUsageFade {
            from {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            to {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
        }

        /* Potion Error Animations */
        @keyframes potionErrorBounce {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.7);
            }
            60% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.08);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }

        @keyframes potionErrorFade {
            from {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            to {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
        }

        /* Potion notification content styles */
        .potion-usage-content,
        .potion-error-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .potion-usage-icon,
        .potion-error-icon {
            font-size: 20px;
            filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.3));
        }

        .potion-usage-text,
        .potion-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* Hand card potion indicators */
        .hand-card[data-card-type="potion"] {
            position: relative;
        }

        .hand-card[data-card-type="potion"]::after {
            content: "🧪";
            position: absolute;
            top: 5px;
            right: 5px;
            font-size: 16px;
            filter: drop-shadow(0 0 3px rgba(156, 39, 176, 0.8));
            animation: potionCardPulse 2s ease-in-out infinite;
        }

        @keyframes potionCardPulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.15); opacity: 1; }
        }

        /* Integration with resource display container */
        .resource-display-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            left: 64%;
            align-items: center;
        }

        .resource-top-row {
            display: flex;
            gap: 16px;
            align-items: flex-start;
            margin-left: 30px; 
        }

        .resource-bottom-row {
            display: flex;
            justify-content: center;
        }
    `;
    document.head.appendChild(style);
}

// Export both the class and the instance
export { potionHandler };

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.potionHandler = potionHandler;
}

// Legacy function exports for backward compatibility
export async function handlePotionUse(cardIndex, cardName, heroSelection) {
    return await potionHandler.handlePotionClick(cardIndex, cardName, heroSelection);
}