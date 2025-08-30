// futureTechCopyDevice.js - Future Tech Copy Device Artifact with Exclusive Mode System
// "Select 1 card from your discard pile to add copies of to your hand and deck!"
// Adds X copies to both hand and deck, where X = number of copies in graveyard

export const futureTechCopyDeviceArtifact = {
    // Main handler for when FutureTechCopyDevice is clicked/used
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log('🔋 FutureTechCopyDevice activated');
    
        // Ensure styles are loaded before any UI operations
        this.ensureCopyDeviceStyles();
        
        // Check if graveyard has any valid cards (excluding FutureTechCopyDevice itself)
        if (!window.graveyardManager || this.hasNoValidGraveyardCards()) {
            this.showError('You have no valid cards in your discard pile to copy!');
            return;
        }
        
        // Check if player can afford the artifact
        const cardInfo = heroSelection.getCardInfo(cardName);
        const cost = cardInfo?.cost || 0;
        const playerGold = heroSelection.getGoldManager().getPlayerGold();
        
        if (playerGold < cost) {
            this.showError(`You need ${cost} Gold to use FutureTechCopyDevice!`);
            return;
        }
        
        // Consume the card from hand
        const removedCard = heroSelection.removeCardFromHandByIndex(cardIndex);
        if (!removedCard) {
            console.error('Failed to remove FutureTechCopyDevice from hand');
            return;
        }
        
        // Charge the gold
        if (cost > 0) {
            heroSelection.getGoldManager().addPlayerGold(-cost, 'future_tech_copy_device_use');
        }
        
        // Enter Copy Device Mode and register as exclusive
        await this.enterCopyDeviceMode(heroSelection, cost);
    },

    // Check if there are no valid cards in graveyard (excluding FutureTechCopyDevice)
    hasNoValidGraveyardCards() {
        if (!window.graveyardManager || window.graveyardManager.isEmpty()) {
            return true;
        }
        
        const uniqueCards = window.graveyardManager.getUniqueCards();
        // Filter out FutureTechCopyDevice and check if any valid cards remain
        const validCards = uniqueCards.filter(cardName => cardName !== 'FutureTechCopyDevice');
        return validCards.length === 0;
    },

    // Enter Copy Device Mode with exclusive artifact registration
    async enterCopyDeviceMode(heroSelection, goldSpent = 0, savedCardChoices = null) {
        console.log('🔋 Entering Future Tech Copy Device Mode');
        
        // IMPORTANT: Register as exclusive artifact FIRST
        if (window.artifactHandler) {
            window.artifactHandler.setExclusiveArtifactActive('FutureTechCopyDevice');
        }
        
        // Generate or use saved card choices from graveyard
        const cardChoices = savedCardChoices || this.generateGraveyardChoices();
        
        if (!cardChoices || cardChoices.length === 0) {
            // If no cards available, exit immediately
            console.warn('🔋 No valid cards available in graveyard for FutureTechCopyDevice');
            await this.exitCopyDeviceMode(heroSelection);
            return;
        }
        
        // Store the mode state
        this.setCopyDeviceState(heroSelection, {
            active: true,
            goldSpent: goldSpent,
            cardChoices: cardChoices,
            activatedAt: Date.now()
        });
        
        // Show copy device mode UI
        this.showCopyDeviceModeUI(heroSelection, cardChoices);
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        // Save game state to persist the mode
        await heroSelection.saveGameState();
        
        console.log('🔋 Future Tech Copy Device Mode activated successfully');
    },

    // Exit Copy Device Mode with exclusive artifact cleanup
    async exitCopyDeviceMode(heroSelection) {
        console.log('🔋 Exiting Future Tech Copy Device Mode');
        
        // Clear exclusive artifact state FIRST
        if (window.artifactHandler) {
            window.artifactHandler.clearExclusiveArtifactActive();
        }
        
        // Clear the mode state
        this.clearCopyDeviceState(heroSelection);
        
        // Hide copy device mode UI
        this.hideCopyDeviceModeUI();
        
        // Re-enable "To Battle!" button
        this.disableToBattleButton(false);
        
        // Update displays
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log('🔋 Future Tech Copy Device Mode deactivated');
    },

    // Generate card choices from graveyard (excluding FutureTechCopyDevice)
    generateGraveyardChoices() {
        if (!window.graveyardManager) {
            return [];
        }
        
        const uniqueCards = window.graveyardManager.getUniqueCards();
        const choices = [];
        
        uniqueCards.forEach(cardName => {
            // Skip FutureTechCopyDevice - it cannot copy itself
            if (cardName === 'FutureTechCopyDevice') {
                return;
            }
            
            const count = window.graveyardManager.getCardCount(cardName);
            choices.push({
                cardName: cardName,
                count: count
            });
        });
        
        console.log(`🔋 Generated ${choices.length} graveyard choices (excluding FutureTechCopyDevice)`);
        return choices;
    },

    // Show copy device mode UI with graveyard cards
    showCopyDeviceModeUI(heroSelection, cardChoices) {
        // Remove any existing copy device UI
        this.hideCopyDeviceModeUI();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'copyDeviceModeOverlay';
        overlay.className = 'copy-device-mode-overlay';
        overlay.innerHTML = `
            <div class="copy-device-mode-container">
                <div class="copy-device-mode-header">
                    <div class="copy-device-icon">🔋</div>
                    <h2>Future Tech Copy Device</h2>
                    <p>Select 1 card from your discard pile to add copies of to your hand and deck!</p>
                    <button class="copy-device-cancel-btn" onclick="window.cancelCopyDevice()">Cancel</button>
                </div>
                
                <div class="copy-device-cards-grid">
                    ${this.createGraveyardGridHTML(cardChoices, heroSelection)}
                </div>
            </div>
        `;
        
        // Add to game screen
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.appendChild(overlay);
        }
        
        // Set up global cancel function and keyboard handler
        window.cancelCopyDevice = async () => {
            await this.exitCopyDeviceMode(heroSelection, true);
        };
        
        // Add keyboard event listener for Escape key
        this.keyboardHandler = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                window.cancelCopyDevice();
            }
        };
        document.addEventListener('keydown', this.keyboardHandler);
        
        // Add click handlers for each card (existing code)
        cardChoices.forEach((choice, index) => {
            const cardElement = overlay.querySelector(`[data-copy-device-card-index="${index}"]`);
            if (cardElement) {
                cardElement.addEventListener('click', async () => {
                    await this.selectGraveyardCard(heroSelection, choice.cardName, choice.count);
                });
            }
        });
        
        // Add CSS if not already present
        this.ensureCopyDeviceStyles();
    },

    // Create graveyard grid HTML similar to deck interface
    createGraveyardGridHTML(cardChoices, heroSelection) {
        if (cardChoices.length === 0) {
            return `
                <div class="graveyard-empty-message">
                    <div class="empty-icon">⚰️</div>
                    <div>No valid cards in discard pile</div>
                    <div class="empty-note">(FutureTechCopyDevice cannot copy itself)</div>
                </div>
            `;
        }

        let gridHTML = '<div class="copy-device-grid-wrapper">';
        
        // Create rows of 3 cards each (similar to deck grid)
        for (let i = 0; i < cardChoices.length; i += 3) {
            gridHTML += '<div class="copy-device-grid-row">';
            
            // Add up to 3 cards per row
            for (let j = 0; j < 3; j++) {
                const choiceIndex = i + j;
                const choice = choiceIndex < cardChoices.length ? cardChoices[choiceIndex] : null;
                
                if (choice) {
                    const cardPath = `./Cards/All/${choice.cardName}.png`;
                    const cardDisplayName = this.formatCardName(choice.cardName);
                    
                    gridHTML += `
                        <div class="copy-device-card-slot" data-copy-device-card-index="${choiceIndex}">
                            <div class="copy-device-card-inner">
                                <img src="${cardPath}" 
                                     alt="${cardDisplayName}" 
                                     class="copy-device-card-image"
                                     onerror="this.src='./Cards/placeholder.png'">
                                <div class="copy-device-card-info">
                                    <h4 class="copy-device-card-name">${cardDisplayName}</h4>
                                    <div class="copy-device-card-count">×${choice.count} in graveyard</div>
                                    <div class="copy-device-effect-preview">
                                        Will add ${choice.count} to hand + ${choice.count} to deck
                                    </div>
                                </div>
                                <button class="copy-device-card-button">
                                    Copy ${choice.count}×
                                </button>
                            </div>
                        </div>
                    `;
                }
            }
            
            gridHTML += '</div>'; // Close row
        }
        
        gridHTML += '</div>'; // Close wrapper
        return gridHTML;
    },

    // Handle graveyard card selection
    async selectGraveyardCard(heroSelection, selectedCard, copyCount) {
        console.log(`🔋 Selected ${selectedCard} from graveyard, copying ${copyCount} times`);
        
        // Calculate how many can fit in hand (fill to capacity)
        const currentHandSize = heroSelection.getHandManager().getHandSize();
        const maxHandSize = heroSelection.getHandManager().maxHandSize;
        const availableHandSpace = maxHandSize - currentHandSize;
        const handCopiesToAdd = Math.min(copyCount, availableHandSpace);
        
        // Add copies to hand (up to capacity)
        let handCopiesAdded = 0;
        for (let i = 0; i < handCopiesToAdd; i++) {
            const success = heroSelection.addCardToHand(selectedCard);
            if (success) {
                handCopiesAdded++;
            } else {
                console.error(`Failed to add copy ${i + 1} of ${selectedCard} to hand`);
                break;
            }
        }
        
        // Add all copies to deck (deck has no limit)
        let deckCopiesAdded = 0;
        for (let i = 0; i < copyCount; i++) {
            const success = heroSelection.getDeckManager().addCard(selectedCard);
            if (success) {
                deckCopiesAdded++;
            } else {
                console.error(`Failed to add copy ${i + 1} of ${selectedCard} to deck`);
                break;
            }
        }
        
        if (deckCopiesAdded === copyCount) {
            console.log(`🔋 Successfully added ${handCopiesAdded} copies to hand and ${deckCopiesAdded} copies to deck`);
            
            // ADD TO GRAVEYARD NOW - only on successful completion
            if (heroSelection && heroSelection.graveyardManager) {
                heroSelection.graveyardManager.addCard('FutureTechCopyDevice');
                console.log('Added FutureTechCopyDevice to graveyard');
            }
            
            // Update deck display immediately after successful completion
            if (heroSelection.updateDeckDisplay) {
                heroSelection.updateDeckDisplay();
            }
            
            // Show success feedback
            this.showCopySuccessFeedback(selectedCard, copyCount, handCopiesAdded);
            
            // Exit Copy Device Mode (successful completion)
            await this.exitCopyDeviceMode(heroSelection, false);
        }
    },

    // Exit Copy Device Mode with exclusive artifact cleanup
    async exitCopyDeviceMode(heroSelection, cancelled = false) {
        console.log('🔋 Exiting Future Tech Copy Device Mode');
        
        // Get current state
        const state = this.getCopyDeviceState(heroSelection);
        
        // If cancelled, refund gold and return card to hand
        if (cancelled && state) {
            if (state.goldSpent > 0) {
                heroSelection.getGoldManager().addPlayerGold(state.goldSpent, 'copy_device_refund');
                console.log(`🔋 Refunded ${state.goldSpent} gold`);
            }
            
            // Add FutureTechCopyDevice back to hand
            const success = heroSelection.addCardToHand('FutureTechCopyDevice');
            if (success) {
                console.log('🔋 FutureTechCopyDevice returned to hand');
            }
        }
        
        // Clear exclusive artifact state FIRST
        if (window.artifactHandler) {
            window.artifactHandler.clearExclusiveArtifactActive();
        }
        
        // Clear the mode state
        this.clearCopyDeviceState(heroSelection);
        
        // Hide copy device mode UI
        this.hideCopyDeviceModeUI();
        
        // Re-enable "To Battle!" button
        this.disableToBattleButton(false);
        
        // Update displays
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log('🔋 Future Tech Copy Device Mode deactivated');
    },

    // Hide copy device mode UI
    hideCopyDeviceModeUI() {
        const overlay = document.getElementById('copyDeviceModeOverlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Clean up global function
        if (window.cancelCopyDevice) {
            delete window.cancelCopyDevice;
        }
        
        // Clean up keyboard event listener
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    },

    // Show success feedback
    showCopySuccessFeedback(cardName, copyCount) {
        const formatted = this.formatCardName(cardName);
        
        const feedback = document.createElement('div');
        feedback.className = 'copy-device-feedback';
        feedback.innerHTML = `
            <div class="copy-feedback-content">
                <span class="copy-feedback-icon">🔋✨</span>
                <span class="copy-feedback-text">Copied ${copyCount}× ${formatted}!</span>
                <div class="copy-feedback-details">+${copyCount} to hand, +${copyCount} to deck</div>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 3000);
    },

    // Show error message
    showError(message) {
        const error = document.createElement('div');
        error.className = 'copy-device-error';
        error.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
            </div>
        `;
        
        document.body.appendChild(error);
        
        setTimeout(() => {
            if (error.parentNode) {
                error.remove();
            }
        }, 3000);
    },

    // Disable/enable "To Battle!" button
    disableToBattleButton(disable) {
        const toBattleBtn = document.querySelector('.to-battle-button');
        if (toBattleBtn) {
            toBattleBtn.disabled = disable;
            if (disable) {
                toBattleBtn.classList.add('copy-device-mode-disabled');
                toBattleBtn.setAttribute('data-original-title', toBattleBtn.title || '');
                toBattleBtn.title = 'Complete Future Tech Copy Device selection first';
            } else {
                toBattleBtn.classList.remove('copy-device-mode-disabled');
                const originalTitle = toBattleBtn.getAttribute('data-original-title');
                if (originalTitle) {
                    toBattleBtn.title = originalTitle;
                } else {
                    toBattleBtn.removeAttribute('title');
                }
            }
        }
    },

    // === STATE MANAGEMENT ===

    setCopyDeviceState(heroSelection, state) {
        if (!heroSelection._copyDeviceModeState) {
            heroSelection._copyDeviceModeState = {};
        }
        Object.assign(heroSelection._copyDeviceModeState, state);
    },

    getCopyDeviceState(heroSelection) {
        return heroSelection._copyDeviceModeState || null;
    },

    clearCopyDeviceState(heroSelection) {
        heroSelection._copyDeviceModeState = null;
    },

    // Check if currently in Copy Device Mode
    isInCopyDeviceMode(heroSelection) {
        const state = this.getCopyDeviceState(heroSelection);
        return state && state.active;
    },

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },

    // === STATE PERSISTENCE FOR RECONNECTION ===

    // Export state for saving
    exportCopyDeviceState(heroSelection) {
        const state = this.getCopyDeviceState(heroSelection);
        if (state && state.active) {
            return {
                copyDeviceModeActive: true,
                copyDeviceModeGoldSpent: state.goldSpent || 0,
                copyDeviceModeCardChoices: state.cardChoices || [],
                copyDeviceModeActivatedAt: state.activatedAt || Date.now()
            };
        }
        return {
            copyDeviceModeActive: false
        };
    },

    // Restore state from saved data
    async restoreCopyDeviceState(heroSelection, savedState) {
        if (savedState && savedState.copyDeviceModeActive && savedState.copyDeviceModeCardChoices) {
            console.log('🔋 Restoring Future Tech Copy Device Mode from saved state');
            
            const goldSpent = savedState.copyDeviceModeGoldSpent || 0;
            const cardChoices = savedState.copyDeviceModeCardChoices;
            
            // Set the exclusive artifact state
            if (window.artifactHandler) {
                window.artifactHandler.setExclusiveArtifactActive('FutureTechCopyDevice');
            }
            
            // Store the mode state
            this.setCopyDeviceState(heroSelection, {
                active: true,
                goldSpent: goldSpent,
                cardChoices: cardChoices,
                activatedAt: savedState.copyDeviceModeActivatedAt || Date.now()
            });
            
            // Show copy device mode UI with restored data
            this.showCopyDeviceModeUI(heroSelection, cardChoices);
            
            // Disable "To Battle!" button
            this.disableToBattleButton(true);
            
            console.log(`🔋 Future Tech Copy Device Mode restored with ${cardChoices.length} choices`);
            return true;
        }
        return false;
    },

    // === CLEANUP AND RESET ===

    // Clean up copy device state (called during game reset)
    cleanup(heroSelection) {
        console.log('🔋 Cleaning up Future Tech Copy Device state');
        
        // Clear exclusive artifact state
        if (window.artifactHandler) {
            const activeExclusive = window.artifactHandler.getActiveExclusiveArtifact();
            if (activeExclusive === 'FutureTechCopyDevice') {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
        }
        
        // Clear local state
        this.clearCopyDeviceState(heroSelection);
        
        // Clean up UI
        this.hideCopyDeviceModeUI();
        this.disableToBattleButton(false);
        
        // Clean up global functions
        if (window.cancelCopyDevice) {
            delete window.cancelCopyDevice;
        }
        
        // Clean up keyboard handler
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    },

    // Emergency exit (for error recovery)
    async emergencyExit(heroSelection) {
        console.log('🔋 Emergency exit from Future Tech Copy Device Mode');
        
        try {
            // Force exit without save to avoid potential issues
            if (window.artifactHandler) {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
            
            this.clearCopyDeviceState(heroSelection);
            this.hideCopyDeviceModeUI();
            this.disableToBattleButton(false);
            
            // Try to update UI
            if (heroSelection.updateHandDisplay) {
                heroSelection.updateHandDisplay();
            }
            
            console.log('🔋 Emergency exit completed');
        } catch (error) {
            console.error('🔋 Error during emergency exit:', error);
        }
    },

    // Ensure copy device styles are loaded
    ensureCopyDeviceStyles() {
        if (document.getElementById('copyDeviceModeStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'copyDeviceModeStyles';
        style.textContent = `
            /* Future Tech Copy Device Mode Overlay */
            .copy-device-mode-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: copyDeviceModeSlideIn 0.5s ease-out;
            }
            
            .copy-device-mode-container {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                border: 3px solid #00ff88;
                border-radius: 20px;
                padding: 40px;
                max-width: 1000px;
                width: 90%;
                max-height: 90%;
                overflow-y: auto;
                box-shadow: 
                    0 20px 60px rgba(0, 255, 136, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
                text-align: center;
                position: relative;
            }
            
            .copy-device-mode-container::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, #00ff88, #28a745, #20c997, #00ff88);
                background-size: 400% 400%;
                border-radius: 22px;
                z-index: -1;
                animation: copyDeviceModeGlow 3s ease-in-out infinite;
            }
            
            .copy-device-mode-header {
                margin-bottom: 30px;
            }
            
            .copy-device-icon {
                font-size: 60px;
                margin-bottom: 15px;
                animation: copyDeviceIconFloat 2s ease-in-out infinite;
                text-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
            }
            
            .copy-device-mode-header h2 {
                font-size: 2.5rem;
                margin: 0 0 10px 0;
                color: #fff;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
                font-weight: 800;
                letter-spacing: 2px;
            }
            
            .copy-device-mode-header p {
                font-size: 1.2rem;
                color: rgba(255, 255, 255, 0.9);
                margin: 0;
                font-weight: 500;
            }
            
            .copy-device-cards-grid {
                margin-top: 20px;
            }
            
            .copy-device-grid-wrapper {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .copy-device-grid-row {
                display: flex;
                gap: 20px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .copy-device-card-slot {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(0, 255, 136, 0.5);
                border-radius: 15px;
                padding: 20px;
                transition: all 0.3s ease;
                cursor: pointer;
                flex: 1;
                max-width: 280px;
                min-width: 200px;
                position: relative;
                overflow: hidden;
            }
            
            .copy-device-card-slot::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.6s ease;
            }
            
            .copy-device-card-slot:hover {
                transform: translateY(-10px) scale(1.05);
                border-color: rgba(0, 255, 136, 0.8);
                box-shadow: 
                    0 15px 40px rgba(0, 255, 136, 0.4),
                    0 0 30px rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.15);
            }
            
            .copy-device-card-slot:hover::before {
                left: 100%;
            }
            
            .copy-device-card-inner {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                position: relative;
                z-index: 1;
            }
            
            .copy-device-card-image {
                width: 120px;
                height: 168px;
                object-fit: cover;
                border-radius: 12px;
                box-shadow: 
                    0 8px 25px rgba(0, 0, 0, 0.4),
                    0 0 15px rgba(0, 255, 136, 0.3);
                transition: all 0.3s ease;
                border: 2px solid rgba(0, 255, 136, 0.3);
            }
            
            .copy-device-card-slot:hover .copy-device-card-image {
                box-shadow: 
                    0 12px 35px rgba(0, 0, 0, 0.6),
                    0 0 25px rgba(0, 255, 136, 0.6);
                border-color: rgba(0, 255, 136, 0.8);
                transform: scale(1.05);
            }
            
            .copy-device-card-info {
                text-align: center;
            }
            
            .copy-device-card-name {
                font-size: 1.1rem;
                margin: 0 0 8px 0;
                color: #fff;
                font-weight: 600;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
            }
            
            .copy-device-card-count {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 8px;
                font-weight: 500;
            }
            
            .copy-device-effect-preview {
                font-size: 0.8rem;
                color: rgba(0, 255, 136, 0.9);
                font-weight: bold;
                text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
                border: 1px solid rgba(0, 255, 136, 0.3);
                padding: 4px 8px;
                border-radius: 12px;
                background: rgba(0, 255, 136, 0.1);
            }
            
            .copy-device-card-button {
                background: linear-gradient(45deg, #00ff88, #28a745);
                color: #000;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
            }
            
            .copy-device-card-button:hover {
                background: linear-gradient(45deg, #00ff88, #20c997);
                transform: scale(1.05);
                box-shadow: 0 6px 20px rgba(0, 255, 136, 0.5);
            }
            
            /* Success Feedback */
            .copy-device-feedback {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 20px 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10001;
                animation: copyDeviceFeedback 3s ease-out forwards;
                border: 2px solid rgba(255, 255, 255, 0.3);
                text-align: center;
            }
            
            .copy-feedback-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
            }
            
            .copy-feedback-icon {
                font-size: 28px;
                animation: copyDeviceSparkle 1s ease-out;
            }
            
            .copy-feedback-text {
                font-size: 18px;
                font-weight: bold;
            }
            
            .copy-feedback-details {
                font-size: 14px;
                opacity: 0.9;
                font-weight: 500;
            }
            
            /* Error Message */
            .copy-device-error {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
                padding: 20px 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10001;
                animation: copyDeviceError 3s ease-out forwards;
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            .graveyard-empty-message {
                text-align: center;
                padding: 40px;
                color: rgba(255, 255, 255, 0.7);
            }

            .copy-device-cancel-btn {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.3);
                padding: 10px 20px;
                border-radius: 25px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                transition: all 0.2s ease;
                margin-top: 15px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .copy-device-cancel-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                border-color: rgba(255, 255, 255, 0.5);
                transform: scale(1.05);
                box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
            }
            
            .empty-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }

            .empty-note {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.6);
                font-style: italic;
                margin-top: 10px;
            }
            
            /* Disabled To Battle Button */
            .to-battle-button.copy-device-mode-disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                filter: grayscale(50%) !important;
            }
            
            /* Animations */
            @keyframes copyDeviceModeSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes copyDeviceModeGlow {
                0%, 100% { 
                    background-position: 0% 50%; 
                }
                50% { 
                    background-position: 100% 50%; 
                }
            }
            
            @keyframes copyDeviceIconFloat {
                0%, 100% { 
                    transform: translateY(0px) scale(1); 
                }
                50% { 
                    transform: translateY(-10px) scale(1.1); 
                }
            }
            
            @keyframes copyDeviceFeedback {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
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
            
            @keyframes copyDeviceSparkle {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(-10deg) scale(1.2); }
                75% { transform: rotate(10deg) scale(1.2); }
            }
            
            @keyframes copyDeviceError {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                10% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.05);
                }
                90% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.9);
                }
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .copy-device-mode-container {
                    padding: 20px;
                    width: 95%;
                }
                
                .copy-device-grid-row {
                    gap: 15px;
                }
                
                .copy-device-card-slot {
                    max-width: none;
                    min-width: 150px;
                }
                
                .copy-device-card-image {
                    width: 100px;
                    height: 140px;
                }
                
                .copy-device-icon {
                    font-size: 48px;
                }
                
                .copy-device-mode-header h2 {
                    font-size: 2rem;
                }
                
                .copy-device-mode-header p {
                    font-size: 1rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
};

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.futureTechCopyDeviceArtifact = futureTechCopyDeviceArtifact;
}