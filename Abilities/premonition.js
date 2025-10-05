// premonition.js - Premonition Ability Implementation
// Once per turn per hero: Choose 1 card from X random cards from the entire card pool and add it to your hand

import { getAllAbilityCards } from '../cardDatabase.js';

export const premonitionAbility = {
    // Track which heroes have used Premonition this turn (by hero name, not position)
    heroPremonitionUsed: new Set(),
    
    // Current Premonition mode state
    premonitionMode: {
        active: false,
        heroPosition: null,
        heroName: null,
        cardChoices: [],
        numChoices: 3, // Default number of premonition glimpses
        overlay: null
    },
    
    // Helper method to get hero name from position
    getHeroNameFromPosition(position) {
        if (!window.heroSelection?.formationManager) {
            return null;
        }
        
        const formation = window.heroSelection.formationManager.getBattleFormation();
        const hero = formation[position];
        return hero ? hero.name : null;
    },
    
    // Check if hero can use Premonition
    canUsePremonition(heroPosition) {
        const heroName = this.getHeroNameFromPosition(heroPosition);
        if (!heroName) {
            console.warn('Premonition: Could not determine hero name for position', heroPosition);
            return false;
        }
        
        // Check if this specific hero has already used Premonition this turn
        return !this.heroPremonitionUsed.has(heroName);
    },
    
    // Mark Premonition as used for this hero
    markPremonitionUsed(heroPosition) {
        const heroName = this.getHeroNameFromPosition(heroPosition);
        if (!heroName) {
            console.warn('Premonition: Could not determine hero name for position', heroPosition);
            return false;
        }
        
        // Mark this specific hero as having used Premonition
        this.heroPremonitionUsed.add(heroName);
        
        // Save the state immediately after marking as used
        if (window.heroSelection?.saveGameState) {
            window.heroSelection.saveGameState();
        }
        
        return true;
    },
    
    // Handle Premonition ability click
    async handleClick(heroPosition, stackCount, heroSelection) {
        console.log(`Premonition clicked: position=${heroPosition}, level=${stackCount}`);
        
        // Check if hero selection is available
        if (!heroSelection) {
            console.error('Hero selection not available');
            this.showError('Game not properly initialized!');
            return;
        }
        
        // Get hero name with retry logic for reconnection scenarios
        let heroName = this.getHeroNameFromPosition(heroPosition);
        if (!heroName) {
            // Wait a bit and try again (formation might still be loading after reconnection)
            await new Promise(resolve => setTimeout(resolve, 100));
            heroName = this.getHeroNameFromPosition(heroPosition);
            
            if (!heroName) {
                this.showError('Could not determine hero for Premonition! Formation may still be loading.');
                return;
            }
        }
        
        // Check if this hero has already used Premonition this turn
        if (!this.canUsePremonition(heroPosition)) {
            this.showError(`${heroName} can only glimpse other timelines once per turn!`);
            return;
        }
        
        // Check if hand is full
        const handManager = heroSelection.getHandManager();
        if (!handManager) {
            console.error('Hand manager not available');
            this.showError('Cannot access hand!');
            return;
        }
        
        if (handManager.isHandFull()) {
            this.showError('Your hand is full!');
            return;
        }
        
        // Start Premonition mode
        await this.enterPremonitionMode(heroSelection, heroPosition, heroName, stackCount);
    },
    
    // Enter Premonition mode
    async enterPremonitionMode(heroSelection, heroPosition, heroName, stackCount, savedCardChoices = null) {
        console.log(`Starting Premonition mode for ${heroName} at position ${heroPosition} with ${stackCount} choices`);
        
        // Set exclusive artifact to disable other interactions
        if (window.artifactHandler) {
            window.artifactHandler.setExclusiveArtifactActive('Premonition');
        }
        
        // Use stackCount instead of hardcoded value
        const numChoices = stackCount;
        
        // Generate or use saved card choices
        const cardChoices = savedCardChoices || this.generateRandomCards(numChoices);
        
        if (!cardChoices || cardChoices.length === 0) {
            console.warn('Premonition: No cards available for selection');
            await this.exitPremonitionMode(heroSelection);
            this.showError('No visions available in the timeline!');
            return;
        }
        
        // Initialize Premonition mode state with actual numChoices
        this.premonitionMode = {
            active: true,
            heroPosition: heroPosition,
            heroName: heroName,
            cardChoices: cardChoices,
            numChoices: numChoices, // Use the actual stackCount
            overlay: null
        };
        
        // Create Premonition mode UI
        this.showPremonitionModeUI(heroSelection, cardChoices, heroName);
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        // Save game state to persist the mode
        await heroSelection.saveGameState();
        
        console.log('Premonition mode activated successfully');
    },
    
    // Exit Premonition mode
    async exitPremonitionMode(heroSelection) {
        console.log('Exiting Premonition mode');
        
        // Clear exclusive artifact state
        if (window.artifactHandler) {
            window.artifactHandler.clearExclusiveArtifactActive();
        }
        
        // Remove overlay
        this.hidePremonitionModeUI();
        
        // Re-enable "To Battle!" button
        this.disableToBattleButton(false);
        
        // Reset Premonition mode state
        this.premonitionMode = {
            active: false,
            heroPosition: null,
            heroName: null,
            cardChoices: [],
            numChoices: 3,
            overlay: null
        };
        
        // Update displays
        if (heroSelection) {
            heroSelection.updateHandDisplay();
        }
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log('Premonition mode ended successfully');
    },
    
    // Generate random cards from the entire card pool
    generateRandomCards(numChoices = 3) {
        try {
            const allCards = getAllAbilityCards(); // Get all non-hero, non-token cards
            
            if (!allCards || allCards.length === 0) {
                console.warn('Premonition: No cards available in card database');
                return [];
            }
            
            const choices = [];
            const cardNames = allCards.map(card => card.name);
            
            for (let i = 0; i < numChoices; i++) {
                const randomIndex = Math.floor(Math.random() * cardNames.length);
                choices.push(cardNames[randomIndex]);
            }
            
            console.log(`Premonition: Generated ${choices.length} random cards:`, choices);
            return choices;
        } catch (error) {
            console.error('Premonition: Error generating random cards:', error);
            return [];
        }
    },
    
    // Show Premonition mode UI
    showPremonitionModeUI(heroSelection, cardChoices, heroName) {
        // Remove any existing premonition UI
        this.hidePremonitionModeUI();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'premonitionModeOverlay';
        overlay.className = 'premonition-mode-overlay';
        overlay.innerHTML = `
            <div class="premonition-mode-container">
                <div class="premonition-mode-header">
                    <div class="premonition-icon">🔮</div>
                    <h2>${heroName}'s Premonition</h2>
                    <p>Glimpse into other timelines and choose one card to manifest</p>
                    <p class="premonition-hint">💫 Click any card below to add it to your hand!</p>
                </div>
                
                <div class="premonition-card-choices">
                    ${cardChoices.map((cardName, index) => this.createPremonitionCardHTML(cardName, index, heroSelection)).join('')}
                </div>
            </div>
        `;
        
        // Add to game screen
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.appendChild(overlay);
        }
        
        this.premonitionMode.overlay = overlay;
        
        // Add click handlers
        cardChoices.forEach((cardName, index) => {
            const cardElement = overlay.querySelector(`[data-premonition-card-index="${index}"]`);
            if (cardElement) {
                cardElement.addEventListener('click', async () => {
                    await this.selectCard(heroSelection, cardName);
                });
            }
        });
        
        // Ensure styles are loaded
        this.ensurePremonitionStyles();
    },
    
    // Create HTML for a single premonition card choice
    createPremonitionCardHTML(cardName, index, heroSelection) {
        const cardPath = `./Cards/All/${cardName}.png`;
        const formattedName = this.formatCardName(cardName);
        
        return `
            <div class="premonition-card-choice" data-premonition-card-index="${index}">
                <div class="premonition-card-inner">
                    <img src="${cardPath}" 
                         alt="${formattedName}" 
                         class="premonition-card-image"
                         onerror="this.src='./Cards/placeholder.png'">
                    <div class="premonition-card-info">
                        <h3 class="premonition-card-name">${formattedName}</h3>
                    </div>
                    <button class="premonition-card-button">
                        Manifest Card
                    </button>
                </div>
            </div>
        `;
    },
    
    // Handle card selection
    async selectCard(heroSelection, selectedCard) {
        console.log(`Premonition: Selected card: ${selectedCard}`);
        
        // Check if hand is full before adding (double-check)
        if (heroSelection.getHandManager().isHandFull()) {
            this.showError('Your hand is full! Cannot add more cards.');
            return;
        }
        
        // Add the selected card to hand
        const success = heroSelection.addCardToHand(selectedCard);
        
        if (success) {
            console.log(`Premonition: Added ${selectedCard} to hand`);
            
            // Show success feedback
            this.showCardSelectedFeedback(selectedCard, this.premonitionMode.heroName);
            
            // IMPORTANT: Only mark Premonition as used AFTER successful selection
            this.markPremonitionUsed(this.premonitionMode.heroPosition);
            
            // Exit Premonition mode
            await this.exitPremonitionMode(heroSelection);
            
            // Save game state
            await heroSelection.saveGameState();
        } else {
            console.error(`Premonition: Failed to add ${selectedCard} to hand`);
            this.showError('Could not manifest the card. Please try again.');
        }
    },
    
    // Hide Premonition mode UI
    hidePremonitionModeUI() {
        const overlay = document.getElementById('premonitionModeOverlay');
        if (overlay) {
            overlay.remove();
        }
    },
    
    // Show success feedback
    showCardSelectedFeedback(cardName, heroName) {
        const formatted = this.formatCardName(cardName);
        
        const feedback = document.createElement('div');
        feedback.className = 'premonition-feedback';
        feedback.innerHTML = `
            <div class="feedback-content">
                <span class="feedback-icon">🔮✨</span>
                <span class="feedback-text">${heroName} manifested ${formatted} from another timeline!</span>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 2500);
    },
    
    // Show error message
    showError(message) {
        console.log(`🚨 showError called with message: "${message}"`);
        
        // FORCE ENSURE STYLES ARE LOADED
        this.ensurePremonitionStyles();
        
        const error = document.createElement('div');
        error.className = 'premonition-error';
        
        // ADD INLINE STYLES AS BACKUP to guarantee positioning
        error.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
            color: white !important;
            padding: 20px 30px !important;
            border-radius: 15px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
            z-index: 10001 !important;
            border: 2px solid rgba(255, 255, 255, 0.3) !important;
            font-size: 16px !important;
            font-weight: bold !important;
            pointer-events: none !important;
        `;
        
        error.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
            </div>
        `;
        
        document.body.appendChild(error);
        console.log(`📌 Error element added to DOM with forced positioning`);
        
        setTimeout(() => {
            if (error.parentNode) {
                error.remove();
                console.log(`🗑️ Error element removed from DOM`);
            }
        }, 3000);
    }
,
    
    // Disable/enable "To Battle!" button
    disableToBattleButton(disable) {
        const toBattleBtn = document.querySelector('.to-battle-button');
        if (toBattleBtn) {
            toBattleBtn.disabled = disable;
            if (disable) {
                toBattleBtn.classList.add('premonition-disabled');
                toBattleBtn.setAttribute('data-original-title', toBattleBtn.title || '');
                toBattleBtn.title = 'Complete Premonition first';
            } else {
                toBattleBtn.classList.remove('premonition-disabled');
                const originalTitle = toBattleBtn.getAttribute('data-original-title');
                if (originalTitle) {
                    toBattleBtn.title = originalTitle;
                } else {
                    toBattleBtn.removeAttribute('title');
                }
            }
        }
    },
    
    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Check if currently in Premonition Mode
    isInPremonitionMode() {
        return this.premonitionMode.active;
    },
    
    // Reset for new turn
    resetTurnBasedTracking() {
        this.heroPremonitionUsed.clear();
        
        // Also exit premonition mode if still active (safety measure)
        if (this.premonitionMode.active) {
            this.exitPremonitionMode(window.heroSelection);
        }
    },
    
    // Export state for saving
    exportState() {
        return {
            heroPremonitionUsed: Array.from(this.heroPremonitionUsed), // Convert Set to Array for JSON
            premonitionMode: {
                active: this.premonitionMode.active,
                heroPosition: this.premonitionMode.heroPosition,
                heroName: this.premonitionMode.heroName,
                cardChoices: this.premonitionMode.cardChoices,
                numChoices: this.premonitionMode.numChoices
                // Don't save overlay reference
            }
        };
    },
    
    // Import state for loading
    async importState(state, heroSelection) {
        if (!state) return false;
        
        if (state.heroPremonitionUsed) {
            this.heroPremonitionUsed = new Set(state.heroPremonitionUsed);
        }
        
        if (state.premonitionMode && state.premonitionMode.active && state.premonitionMode.cardChoices) {
            console.log('Restoring Premonition Mode from saved state');
            
            // Make sure to pass the saved numChoices as stackCount
            await this.enterPremonitionMode(
                heroSelection,
                state.premonitionMode.heroPosition,
                state.premonitionMode.heroName,
                state.premonitionMode.numChoices, // Pass this as stackCount
                state.premonitionMode.cardChoices
            );
            
            return true;
        }
        
        return true;
    },

    // === STATE PERSISTENCE FOR RECONNECTION (dedicated methods like FutureTechLamp) ===

    // Export premonition state for saving (dedicated method)
    exportPremonitionState(heroSelection) {
        if (this.premonitionMode.active) {
            return {
                premonitionModeActive: true,
                premonitionModeHeroPosition: this.premonitionMode.heroPosition,
                premonitionModeHeroName: this.premonitionMode.heroName,
                premonitionModeCardChoices: this.premonitionMode.cardChoices,
                premonitionModeNumChoices: this.premonitionMode.numChoices,
                premonitionModeActivatedAt: Date.now(),
                heroPremonitionUsed: Array.from(this.heroPremonitionUsed)
            };
        }
        return {
            premonitionModeActive: false,
            heroPremonitionUsed: Array.from(this.heroPremonitionUsed)
        };
    },

    // Restore premonition state from saved data (dedicated method)
    async restorePremonitionState(heroSelection, savedState) {
        if (!savedState) return false;
        
        // Always restore used tracking
        if (savedState.heroPremonitionUsed) {
            this.heroPremonitionUsed = new Set(savedState.heroPremonitionUsed);
        }
        
        // Restore active mode if it was active
        if (savedState.premonitionModeActive && savedState.premonitionModeCardChoices) {
            console.log('🔮 Restoring Premonition Mode from saved state');
            
            const heroPosition = savedState.premonitionModeHeroPosition;
            const heroName = savedState.premonitionModeHeroName;
            const cardChoices = savedState.premonitionModeCardChoices;
            const numChoices = savedState.premonitionModeNumChoices || cardChoices.length;
            
            // Set exclusive artifact state FIRST
            if (window.artifactHandler) {
                window.artifactHandler.setExclusiveArtifactActive('Premonition');
            }
            
            // Initialize Premonition mode state directly (skip enterPremonitionMode to avoid regenerating cards)
            this.premonitionMode = {
                active: true,
                heroPosition: heroPosition,
                heroName: heroName,
                cardChoices: cardChoices,
                numChoices: numChoices,
                overlay: null
            };
            
            // Show premonition mode UI with restored data
            this.showPremonitionModeUI(heroSelection, cardChoices, heroName);
            
            // Disable "To Battle!" button
            this.disableToBattleButton(true);
            
            console.log(`🔮 Premonition Mode restored for ${heroName} with ${numChoices} choices`);
            return true;
        }
        
        return true;
    },

    // === CLEANUP AND RESET ===

    // Clean up premonition state (called during game reset)
    cleanup(heroSelection) {
        console.log('🔮 Cleaning up Premonition state');
        
        // Clear exclusive artifact state
        if (window.artifactHandler) {
            const activeExclusive = window.artifactHandler.getActiveExclusiveArtifact();
            if (activeExclusive === 'Premonition') {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
        }
        
        // Clear local state
        this.premonitionMode = {
            active: false,
            heroPosition: null,
            heroName: null,
            cardChoices: [],
            numChoices: 3,
            overlay: null
        };
        
        // Clean up UI
        this.hidePremonitionModeUI();
        this.disableToBattleButton(false);
    },

    // Emergency exit (for error recovery)
    async emergencyExit(heroSelection) {
        console.log('🔮 Emergency exit from Premonition Mode');
        
        try {
            // Force exit without save to avoid potential issues
            if (window.artifactHandler) {
                window.artifactHandler.clearExclusiveArtifactActive();
            }
            
            this.premonitionMode = {
                active: false,
                heroPosition: null,
                heroName: null,
                cardChoices: [],
                numChoices: 3,
                overlay: null
            };
            
            this.hidePremonitionModeUI();
            this.disableToBattleButton(false);
            
            // Try to update UI
            if (heroSelection.updateHandDisplay) {
                heroSelection.updateHandDisplay();
            }
            
            console.log('🔮 Emergency exit completed');
        } catch (error) {
            console.error('🔮 Error during emergency exit:', error);
        }
    },
    
    // Reset for new game
    reset() {
        this.heroPremonitionUsed.clear();
        
        // Exit premonition mode if active
        if (this.premonitionMode.active) {
            this.exitPremonitionMode(window.heroSelection);
        }
        
        this.premonitionMode = {
            active: false,
            heroPosition: null,
            heroName: null,
            cardChoices: [],
            numChoices: 3,
            overlay: null
        };
    },
    
    // Ensure premonition styles are loaded
    ensurePremonitionStyles() {
        if (document.getElementById('premonitionStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'premonitionStyles';
        style.textContent = `
            /* Premonition Mode Overlay */
            .premonition-mode-overlay {
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
                animation: premonitionSlideIn 0.5s ease-out;
                padding: 20px;
            }
            
            .premonition-mode-container {
                background: linear-gradient(135deg, #4b0082 0%, #8a2be2 50%, #9370db 100%);
                border: 3px solid #ffd700;
                border-radius: 20px;
                padding: 30px;
                max-width: 900px;
                width: 90%;
                max-height: 90vh;
                box-shadow: 
                    0 20px 60px rgba(255, 215, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
                text-align: center;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .premonition-mode-container::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, #ffd700, #ff1493, #00ffff, #ffd700);
                background-size: 400% 400%;
                border-radius: 22px;
                z-index: -1;
                animation: premonitionGlow 3s ease-in-out infinite;
            }
            
            .premonition-mode-header {
                margin-bottom: 20px;
                flex-shrink: 0;
            }
            
            .premonition-icon {
                font-size: 60px;
                margin-bottom: 15px;
                animation: premonitionFloat 2s ease-in-out infinite;
                text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
            }
            
            .premonition-mode-header h2 {
                font-size: 2.5rem;
                margin: 0 0 10px 0;
                color: #fff;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
                font-weight: 800;
                letter-spacing: 2px;
            }
            
            .premonition-mode-header p {
                font-size: 1.2rem;
                color: rgba(255, 255, 255, 0.9);
                margin: 0 0 8px 0;
                font-weight: 500;
            }
            
            .premonition-hint {
                font-size: 1rem !important;
                color: rgba(255, 215, 0, 0.9) !important;
                margin: 8px 0 0 0 !important;
                font-weight: 600 !important;
                text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                letter-spacing: 1px;
            }
            
            .premonition-card-choices {
                display: flex;
                gap: 25px;
                justify-content: flex-start;
                flex-wrap: wrap;
                overflow-y: auto;
                overflow-x: hidden;
                flex: 1;
                padding: 10px 5px;
                margin: -10px -5px;
                
                /* Custom scrollbar styling */
                scrollbar-width: thin;
                scrollbar-color: rgba(255, 215, 0, 0.6) rgba(255, 255, 255, 0.1);
            }
            
            .premonition-card-choices::-webkit-scrollbar {
                width: 8px;
            }
            
            .premonition-card-choices::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
            }
            
            .premonition-card-choices::-webkit-scrollbar-thumb {
                background: rgba(255, 215, 0, 0.6);
                border-radius: 4px;
                transition: background 0.3s ease;
            }
            
            .premonition-card-choices::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 215, 0, 0.8);
            }
            
            .premonition-card-choice {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 215, 0, 0.5);
                border-radius: 15px;
                padding: 20px;
                transition: all 0.3s ease;
                cursor: pointer;
                flex: 0 0 220px;
                max-width: 220px;
                min-width: 180px;
                position: relative;
                overflow: hidden;
            }
            
            .premonition-card-choice::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.2), transparent);
                transition: left 0.6s ease;
            }
            
            .premonition-card-choice:hover {
                transform: translateY(-10px) scale(1.05);
                border-color: rgba(255, 215, 0, 0.8);
                box-shadow: 
                    0 15px 40px rgba(255, 215, 0, 0.4),
                    0 0 30px rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.15);
            }
            
            .premonition-card-choice:hover::before {
                left: 100%;
            }
            
            .premonition-card-choice:active {
                transform: translateY(-8px) scale(1.02);
            }
            
            .premonition-card-inner {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                position: relative;
                z-index: 1;
            }
            
            .premonition-card-image {
                width: 140px;
                height: 196px;
                object-fit: cover;
                border-radius: 12px;
                box-shadow: 
                    0 8px 25px rgba(0, 0, 0, 0.4),
                    0 0 15px rgba(255, 215, 0, 0.3);
                transition: all 0.3s ease;
                border: 2px solid rgba(255, 215, 0, 0.3);
            }
            
            .premonition-card-choice:hover .premonition-card-image {
                box-shadow: 
                    0 12px 35px rgba(0, 0, 0, 0.6),
                    0 0 25px rgba(255, 215, 0, 0.6);
                border-color: rgba(255, 215, 0, 0.8);
                transform: scale(1.05);
            }
            
            .premonition-card-info {
                text-align: center;
            }
            
            .premonition-card-name {
                font-size: 1.1rem;
                margin: 0;
                color: #fff;
                font-weight: 600;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
            }
            
            .premonition-card-button {
                background: linear-gradient(45deg, #ffd700, #8a2be2);
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
                box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
            }
            
            .premonition-card-button:hover {
                background: linear-gradient(45deg, #ffd700, #9370db);
                transform: scale(1.05);
                box-shadow: 0 6px 20px rgba(255, 215, 0, 0.5);
            }
            
            .premonition-card-button:active {
                transform: scale(0.98);
            }
            
            /* Success Feedback */
            .premonition-feedback {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #8a2be2 0%, #9370db 100%);
                color: white;
                padding: 20px 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10001;
                animation: premonitionFeedback 2.5s ease-out forwards;
                border: 2px solid rgba(255, 215, 0, 0.5);
            }
            
            .feedback-content {
                display: flex;
                align-items: center;
                gap: 15px;
                font-size: 18px;
                font-weight: bold;
            }
            
            .feedback-icon {
                font-size: 28px;
                animation: premonitionSparkle 1s ease-out;
            }
            
            /* Error Message */
            .premonition-error {
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
                animation: premonitionError 3s ease-out forwards;
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            .error-content {
                display: flex;
                align-items: center;
                gap: 15px;
                font-size: 16px;
                font-weight: bold;
            }
            
            .error-icon {
                font-size: 24px;
            }
            
            /* Disabled To Battle Button */
            .to-battle-button.premonition-disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                filter: grayscale(50%) !important;
            }
            
            /* Animations */
            @keyframes premonitionSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes premonitionGlow {
                0%, 100% { 
                    background-position: 0% 50%; 
                }
                50% { 
                    background-position: 100% 50%; 
                }
            }
            
            @keyframes premonitionFloat {
                0%, 100% { 
                    transform: translateY(0px) scale(1); 
                }
                50% { 
                    transform: translateY(-10px) scale(1.1); 
                }
            }
            
            @keyframes premonitionFeedback {
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
            
            @keyframes premonitionSparkle {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(-10deg) scale(1.2); }
                75% { transform: rotate(10deg) scale(1.2); }
            }
            
            @keyframes premonitionError {
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
                .premonition-mode-overlay {
                    padding: 10px;
                }
                
                .premonition-mode-container {
                    padding: 20px;
                    width: 95%;
                    max-height: 95vh;
                }
                
                .premonition-card-choices {
                    gap: 15px;
                    justify-content: center;
                }
                
                .premonition-card-choice {
                    flex: 0 0 150px;
                    max-width: 150px;
                    min-width: 130px;
                    padding: 15px;
                }
                
                .premonition-card-image {
                    width: 100px;
                    height: 140px;
                }
                
                .premonition-icon {
                    font-size: 48px;
                }
                
                .premonition-mode-header h2 {
                    font-size: 2rem;
                }
                
                .premonition-mode-header p {
                    font-size: 1rem;
                }
            }
            
            @media (max-width: 480px) {
                .premonition-mode-container {
                    max-height: 98vh;
                    padding: 15px;
                }
                
                .premonition-mode-header {
                    margin-bottom: 15px;
                }
                
                .premonition-card-choices {
                    gap: 10px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
};

// Make the ability available globally for onclick handlers
if (typeof window !== 'undefined') {
    window.premonitionAbility = premonitionAbility;
}