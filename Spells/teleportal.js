// Spells/teleportal.js - Teleportal Global Spell Implementation
// "Choose any card from your deck and add a copy of it to your hand."
// Costs an Action instead of Gold (like MagneticGlove but as a global spell)
// Action cost is negated if player has any hero with MagicArts level 1+
// UPDATED: Excludes selecting Teleportal cards through the portal

export const teleportalSpell = {
    name: 'Teleportal',
    
    // Check if the spell can be activated
    canActivate(heroSelection) {
        const result = { canActivate: false, reason: '', heroName: '' };
        
        // Get Teleportal card info from database
        const teleportalInfo = heroSelection.getCardInfo('Teleportal');
        if (!teleportalInfo) {
            result.reason = 'Teleportal spell info not found in database!';
            return result;
        }
        
        const requiredSpellSchool = teleportalInfo.spellSchool;
        const requiredLevel = teleportalInfo.level;
        
        console.log(`🌀 Teleportal requires ${requiredSpellSchool} level ${requiredLevel}`);
        
        // Check if player has MagicArts level 1+ (negates action cost)
        const hasMagicArts1Plus = this.hasPlayerMagicArtsLevel1Plus(heroSelection);
        
        // Check if player has actions available (skip if MagicArts 1+)
        if (!hasMagicArts1Plus && (!heroSelection.actionManager || heroSelection.actionManager.getPlayerActions() <= 0)) {
            result.reason = 'You need at least 1 Action to cast Teleportal!';
            return result;
        }
        
        // Check if ANY hero has the required spell school at required level
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => 
            formation[pos] !== null && formation[pos] !== undefined
        );
        
        let canCast = false;
        let castingHeroName = '';
        
        for (const position of heroPositions) {
            const hero = formation[position];
            if (!hero) continue;
            
            // Get hero's abilities
            const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
            if (!heroAbilities) continue;
            
            // Count spell school abilities across all zones
            let spellSchoolLevel = 0;
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                    heroAbilities[zone].forEach(ability => {
                        if (ability && ability.name === requiredSpellSchool) {
                            spellSchoolLevel++;
                        }
                    });
                }
            });
            
            console.log(`🌀 Hero ${hero.name} has ${requiredSpellSchool} level ${spellSchoolLevel}, needs ${requiredLevel}`);
            
            if (spellSchoolLevel >= requiredLevel) {
                canCast = true;
                castingHeroName = hero.name;
                break;
            }
        }
        
        if (!canCast) {
            const formattedSpellSchool = heroSelection.formatCardName ? 
                heroSelection.formatCardName(requiredSpellSchool) : requiredSpellSchool;
            result.reason = `No Hero has ${formattedSpellSchool} at level ${requiredLevel} or higher to cast Teleportal!`;
            return result;
        }
        
        result.canActivate = true;
        result.heroName = castingHeroName;
        result.hasMagicArts1Plus = hasMagicArts1Plus;
        return result;
    },

    // Check if player has any hero with MagicArts level 1 or higher
    hasPlayerMagicArtsLevel1Plus(heroSelection) {
        console.log(`🔍 Checking for MagicArts 1+ across all heroes...`);
        
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => 
            formation[pos] !== null && formation[pos] !== undefined
        );
        
        console.log(`🔍 Active hero positions: ${heroPositions.join(', ')}`);
        
        for (const position of heroPositions) {
            const hero = formation[position];
            if (!hero) {
                console.log(`🔍 No hero at position ${position}`);
                continue;
            }
            
            console.log(`🔍 Checking ${hero.name} at position ${position}`);
            
            // Get hero's abilities
            const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
            if (!heroAbilities) {
                console.log(`🔍 No abilities found for ${hero.name}`);
                continue;
            }
            
            // Count MagicArts abilities across all zones
            let magicArtsLevel = 0;
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                    const zoneAbilities = heroAbilities[zone].filter(ability => ability && ability.name === 'MagicArts');
                    if (zoneAbilities.length > 0) {
                        console.log(`🔍 Found ${zoneAbilities.length} MagicArts in ${hero.name}'s ${zone}`);
                        magicArtsLevel += zoneAbilities.length;
                    }
                }
            });
            
            console.log(`🔍 ${hero.name} total MagicArts level: ${magicArtsLevel}`);
            
            // If this hero has MagicArts level 1+, return true
            if (magicArtsLevel >= 3) {
                console.log(`✅ ${hero.name} has MagicArts level ${magicArtsLevel} - action cost negated!`);
                return true;
            }
        }
        
        console.log(`❌ No hero has MagicArts level 1+`);
        return false;
    },
    
    // Main handler for when Teleportal is clicked/used
    async handleClick(cardIndex, cardName, heroSelection, globalSpellManager) {
        console.log('🌀 Teleportal activated');
        
        // Check if can activate
        const canActivateResult = this.canActivate(heroSelection);
        if (!canActivateResult.canActivate) {
            this.showError(canActivateResult.reason);
            return false;
        }
        
        // Enter Teleportal Mode (don't consume resources yet)
        await this.enterTeleportalMode(heroSelection, cardIndex, canActivateResult.heroName);
        return true;
    },

    // Enter Teleportal Mode
    async enterTeleportalMode(heroSelection, cardIndex, castingHeroName) {
        console.log('🌀 Entering Teleportal Mode');
        
        // Store the mode state
        this.setTeleportalState(heroSelection, {
            active: true,
            cardIndex: cardIndex,
            castingHeroName: castingHeroName,
            activatedAt: Date.now()
        });
        
        // Show notification
        this.showTeleportalNotification(heroSelection);
        
        // Highlight deck cards
        this.highlightDeckCards(true);
        
        // Disable "To Battle!" button
        this.disableToBattleButton(true);
        
        // Add click handlers to deck cards
        this.addDeckCardClickHandlers(heroSelection);
        
        console.log('🌀 Teleportal Mode activated successfully');
    },

    // Exit Teleportal Mode
    async exitTeleportalMode(heroSelection, cancelled = false) {
        console.log('🌀 Exiting Teleportal Mode');
        
        // Clear the mode state
        this.clearTeleportalState(heroSelection);
        
        // Hide notification
        this.hideTeleportalNotification();
        
        // Remove deck highlighting
        this.highlightDeckCards(false);
        
        // Re-enable "To Battle!" button
        this.disableToBattleButton(false);
        
        // Remove click handlers from deck cards
        this.removeDeckCardClickHandlers();
        
        // Update displays
        heroSelection.updateHandDisplay();
        if (heroSelection.updateActionDisplay) {
            heroSelection.updateActionDisplay();
        }
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log('🌀 Teleportal Mode deactivated');
    },

    // Show notification UI
    showTeleportalNotification(heroSelection) {
        // Remove any existing notification
        this.hideTeleportalNotification();
        
        const notification = document.createElement('div');
        notification.id = 'teleportalNotification';
        notification.className = 'teleportal-notification';
        notification.innerHTML = `
            <div class="teleportal-content">
                <span class="teleportal-icon">🌀</span>
                <span class="teleportal-text">Select the card you wish to grab through the portal!</span>
                <button class="teleportal-cancel-btn" onclick="window.cancelTeleportal()">Cancel</button>
            </div>
        `;
        
        // Add to top of game screen
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.appendChild(notification);
        }
        
        // Set up global cancel function
        window.cancelTeleportal = async () => {
            await this.exitTeleportalMode(heroSelection, true);
        };
        
        // Add keyboard event listener for Escape key
        this.keyboardHandler = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                window.cancelTeleportal();
            }
        };
        document.addEventListener('keydown', this.keyboardHandler);
    },

    // Hide notification UI
    hideTeleportalNotification() {
        const notification = document.getElementById('teleportalNotification');
        if (notification) {
            notification.remove();
        }
        
        // Clean up global function
        if (window.cancelTeleportal) {
            delete window.cancelTeleportal;
        }
        
        // Clean up keyboard event listener
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    },

    // Highlight deck cards (reuse MagneticGlove logic)
    highlightDeckCards(highlight) {
        const deckContainer = document.querySelector('.team-building-right');
        const deckCards = document.querySelectorAll('.card-slot');
        
        if (highlight) {
            if (deckContainer) {
                deckContainer.classList.add('teleportal-deck-highlight');
            }
            deckCards.forEach(card => {
                if (!card.classList.contains('empty-slot')) {
                    card.classList.add('teleportal-card-highlight');
                }
            });
        } else {
            if (deckContainer) {
                deckContainer.classList.remove('teleportal-deck-highlight');
            }
            deckCards.forEach(card => {
                card.classList.remove('teleportal-card-highlight');
            });
        }
    },

    // Add click handlers to deck cards
    addDeckCardClickHandlers(heroSelection) {
        // Clean up any existing handlers first
        this.removeDeckCardClickHandlers();
        
        const deckCards = document.querySelectorAll('.card-slot:not(.empty-slot)');
        
        console.log(`🌀 Teleportal: Adding click handlers to ${deckCards.length} deck cards`);
        
        deckCards.forEach(cardSlot => {
            const cardImage = cardSlot.querySelector('img');
            if (cardImage) {
                // Extract card name from image src
                const cardName = this.extractCardNameFromPath(cardImage.src);
                if (cardName) {
                    const clickHandler = async (event) => {
                        event.stopPropagation();
                        await this.selectDeckCard(heroSelection, cardName);
                    };
                    
                    cardSlot.addEventListener('click', clickHandler);
                    cardSlot.setAttribute('data-teleportal-handler', 'true');
                    cardSlot.style.cursor = 'pointer';
                    
                    // Add visual feedback that this card is clickable
                    cardSlot.classList.add('teleportal-clickable');
                }
            }
        });
        
        console.log(`🌀 Teleportal: Successfully added handlers to deck cards`);
    },

    // Remove click handlers from deck cards
    removeDeckCardClickHandlers() {
        const deckCards = document.querySelectorAll('[data-teleportal-handler="true"]');
        console.log(`🌀 Teleportal: Removing click handlers from ${deckCards.length} deck cards`);
        
        deckCards.forEach(cardSlot => {
            // Create a new element to remove all event listeners
            const newElement = cardSlot.cloneNode(true);
            cardSlot.parentNode.replaceChild(newElement, cardSlot);
            
            // Clean up attributes and styling
            newElement.removeAttribute('data-teleportal-handler');
            newElement.style.cursor = '';
            newElement.classList.remove('teleportal-clickable');
        });
    },

    // Handle selecting a card from the deck
    async selectDeckCard(heroSelection, cardName) {
        console.log(`🌀 Selected card from deck: ${cardName}`);
        
        // Check if player is trying to select Teleportal (not allowed)
        if (cardName === 'Teleportal') {
            this.showError('This card cannot pass through the portal!');
            return; // Exit without proceeding - Teleportal mode continues
        }
        
        // Check if hand is full before adding
        if (heroSelection.getHandManager().isHandFull()) {
            this.showError('Your hand is full! Cannot add more cards.');
            return;
        }
        
        // Get teleportal state
        const state = this.getTeleportalState(heroSelection);
        if (!state) {
            this.showError('Teleportal state lost!');
            return;
        }
        
        // Add the selected card to hand
        const success = heroSelection.addCardToHand(cardName);
        
        if (success) {
            console.log(`🌀 Added ${cardName} to hand`);
            
            // Check if MagicArts 1+ negates action cost
            const hasMagicArts1Plus = this.hasPlayerMagicArtsLevel1Plus(heroSelection);
            
            // Only consume action if MagicArts 1+ condition is not met
            if (!hasMagicArts1Plus && heroSelection.actionManager) {
                heroSelection.actionManager.consumeAction();
                console.log('🌀 Action consumed for Teleportal');
            } else if (hasMagicArts1Plus) {
                console.log('🌀 Action cost negated by MagicArts 1+');
            }
            
            // Remove the Teleportal card from hand
            const removedCard = heroSelection.handManager.removeCardFromHandByIndex(state.cardIndex);
            if (!removedCard) {
                console.error('Failed to remove Teleportal card from hand');
            }
            
            // Add Teleportal to graveyard
            if (heroSelection && heroSelection.graveyardManager) {
                heroSelection.graveyardManager.addCard('Teleportal');
                console.log('🌀 Added Teleportal to graveyard');
            }
            
            // Show success feedback
            this.showCardSelectedFeedback(cardName, state.castingHeroName, hasMagicArts1Plus);
            
            // Exit Teleportal Mode (successful completion)
            await this.exitTeleportalMode(heroSelection, false);
        } else {
            console.error(`🌀 Failed to add ${cardName} to hand`);
            this.showError('Could not add card to hand. Please try again.');
        }
    },

    // Extract card name from image path (reuse MagneticGlove logic)
    extractCardNameFromPath(imagePath) {
        if (!imagePath) return null;
        
        // Extract filename from path like "./Cards/All/CardName.png"
        const matches = imagePath.match(/\/([^\/]+)\.png$/);
        if (matches && matches[1]) {
            return matches[1];
        }
        
        return null;
    },

    // Show card selected feedback
    showCardSelectedFeedback(cardName, castingHeroName, hasMagicArts1Plus = false) {
        const formatted = this.formatCardName(cardName);
        
        let message;
        if (hasMagicArts1Plus) {
            message = `${castingHeroName} grabbed ${formatted} through the portal for free! (MagicArts 1+ negated action cost)`;
        } else {
            message = `${castingHeroName} grabbed ${formatted} through the portal!`;
        }
        
        const feedback = document.createElement('div');
        feedback.className = 'teleportal-feedback';
        feedback.innerHTML = `
            <div class="feedback-content">
                <span class="feedback-icon">🌀✨</span>
                <span class="feedback-text">${message}</span>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 2000);
    },

    // Show error message
    showError(message) {
        const error = document.createElement('div');
        error.className = 'teleportal-error';
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
                toBattleBtn.classList.add('teleportal-disabled');
                toBattleBtn.setAttribute('data-original-title', toBattleBtn.title || '');
                toBattleBtn.title = 'Complete Teleportal selection first';
            } else {
                toBattleBtn.classList.remove('teleportal-disabled');
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

    setTeleportalState(heroSelection, state) {
        if (!heroSelection._teleportalState) {
            heroSelection._teleportalState = {};
        }
        Object.assign(heroSelection._teleportalState, state);
    },

    getTeleportalState(heroSelection) {
        return heroSelection._teleportalState || null;
    },

    clearTeleportalState(heroSelection) {
        heroSelection._teleportalState = null;
    },

    // Check if currently in Teleportal Mode
    isInTeleportalMode(heroSelection) {
        const state = this.getTeleportalState(heroSelection);
        return state && state.active;
    },

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },

    // === CLEANUP ===

    // Clean up teleportal state (called during game reset)
    cleanup(heroSelection) {
        console.log('🌀 Cleaning up Teleportal state');
        
        // Clear local state
        this.clearTeleportalState(heroSelection);
        
        // Clean up UI
        this.hideTeleportalNotification();
        this.highlightDeckCards(false);
        this.disableToBattleButton(false);
        this.removeDeckCardClickHandlers();
        
        // Clean up global functions
        if (window.cancelTeleportal) {
            delete window.cancelTeleportal;
        }
        
        // Clean up keyboard handler
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    }
};

// CSS styles for Teleportal
if (typeof document !== 'undefined' && !document.getElementById('teleportalStyles')) {
    const style = document.createElement('style');
    style.id = 'teleportalStyles';
    style.textContent = `
        /* Teleportal Notification */
        .teleportal-notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-weight: bold;
            animation: teleportalSlideIn 0.5s ease-out;
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .teleportal-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .teleportal-icon {
            font-size: 24px;
            animation: teleportalSpin 3s ease-in-out infinite;
        }
        
        .teleportal-text {
            font-size: 16px;
            flex: 1;
        }
        
        .teleportal-cancel-btn {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        
        .teleportal-cancel-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
            transform: scale(1.05);
        }
        
        /* Deck Highlighting */
        .teleportal-deck-highlight {
            border: 3px solid #667eea !important;
            border-radius: 12px !important;
            box-shadow: 0 0 25px rgba(102, 126, 234, 0.5) !important;
            animation: teleportalGlowPulse 2s ease-in-out infinite;
        }
        
        .teleportal-card-highlight {
            border: 2px solid #764ba2 !important;
            border-radius: 8px !important;
            box-shadow: 0 0 15px rgba(118, 75, 162, 0.6) !important;
            transform: scale(1.02) !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
        }
        
        .teleportal-card-highlight:hover {
            transform: scale(1.08) !important;
            box-shadow: 0 0 25px rgba(118, 75, 162, 0.8) !important;
            border-color: #667eea !important;
        }
        
        /* Clickable card styling */
        .card-slot.teleportal-clickable {
            position: relative;
        }

        .card-slot.teleportal-clickable::before {
            content: "🌀";
            position: absolute;
            top: -10px;
            right: -10px;
            font-size: 20px;
            z-index: 10;
            animation: teleportalPortalFloat 2s ease-in-out infinite;
            filter: drop-shadow(0 0 3px rgba(102, 126, 234, 0.8));
        }

        @keyframes teleportalPortalFloat {
            0%, 100% { 
                transform: translateY(0) rotate(0deg) scale(1); 
                opacity: 0.7; 
            }
            50% { 
                transform: translateY(-3px) rotate(180deg) scale(1.1); 
                opacity: 1; 
            }
        }
        
        /* Disabled To Battle Button */
        .to-battle-button.teleportal-disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            filter: grayscale(50%) !important;
        }
        
        /* Success Feedback */
        .teleportal-feedback {
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
            animation: teleportalFeedback 2s ease-out forwards;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .teleportal-feedback .feedback-content {
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 18px;
            font-weight: bold;
        }
        
        .teleportal-feedback .feedback-icon {
            font-size: 28px;
            animation: teleportalSparkle 1s ease-out;
        }
        
        /* Error Message */
        .teleportal-error {
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
            animation: teleportalError 3s ease-out forwards;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .teleportal-error .error-content {
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 16px;
            font-weight: bold;
        }
        
        .teleportal-error .error-icon {
            font-size: 24px;
        }
        
        /* Animations */
        @keyframes teleportalSlideIn {
            from {
                opacity: 0;
                transform: translate(-50%, -100%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
        
        @keyframes teleportalSpin {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(90deg) scale(1.1); }
            50% { transform: rotate(180deg) scale(1); }
            75% { transform: rotate(270deg) scale(1.1); }
        }
        
        @keyframes teleportalGlowPulse {
            0%, 100% { 
                box-shadow: 0 0 25px rgba(102, 126, 234, 0.5);
            }
            50% { 
                box-shadow: 0 0 35px rgba(102, 126, 234, 0.8);
            }
        }
        
        @keyframes teleportalFeedback {
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
        
        @keyframes teleportalSparkle {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-10deg) scale(1.2); }
            75% { transform: rotate(10deg) scale(1.2); }
        }
        
        @keyframes teleportalError {
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
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.teleportalSpell = teleportalSpell;
}