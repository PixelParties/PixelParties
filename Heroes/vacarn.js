// vacarn.js - Fixed Vacarn Hero Effect Management System

export class VacarnEffectManager {
    constructor() {
        // Track usage per turn (once per turn limit)
        this.vacarnUsedThisTurn = false;
        
        // Store buried creatures by hero position
        // Format: { heroPosition: { creature: cardData, buriedAtTurn: number, buriedAt: timestamp } }
        this.buriedCreatures = {};
        
        // Bury mode state (similar to Leadership mode)
        this.buryMode = {
            active: false,
            heroPosition: null,
            necromancyLevel: 0,
            validCreatures: [],
            overlay: null
        };
        
        // Add restoration flag to prevent interference
        this.isRestoring = false;
    }

    // Check if Vacarn effect can be used
    canUseVacarnEffect(heroPosition, heroSelection) {
        // Check if already used this turn
        if (this.vacarnUsedThisTurn) {
            return {
                canUse: false,
                reason: 'already_used',
                message: 'You can only use this effect once per turn!'
            };
        }

        // Check if this position has a hero
        if (!heroSelection.formationManager) {
            return {
                canUse: false,
                reason: 'no_formation',
                message: 'Formation manager not available!'
            };
        }

        const formation = heroSelection.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        
        if (!hero || hero.name !== 'Vacarn') {
            return {
                canUse: false,
                reason: 'not_vacarn',
                message: 'This effect can only be used by Vacarn!'
            };
        }

        // Check if Vacarn has Necromancy ability
        const necromancyLevel = this.getVacarnNecromancyLevel(heroPosition, heroSelection);
        if (necromancyLevel <= 0) {
            return {
                canUse: false,
                reason: 'no_necromancy',
                message: 'Vacarn needs the Necromancy ability to use this effect!'
            };
        }

        // Check if there are any valid creatures in hand
        const validCreatures = this.getValidCreaturesInHand(necromancyLevel, heroSelection);
        if (validCreatures.length === 0) {
            return {
                canUse: false,
                reason: 'no_valid_creatures',
                message: 'No creatures in hand that can be buried!'
            };
        }

        return {
            canUse: true,
            necromancyLevel: necromancyLevel,
            validCreatures: validCreatures.length
        };
    }

    // Get Vacarn's Necromancy ability level
    getVacarnNecromancyLevel(heroPosition, heroSelection) {
        if (!heroSelection.heroAbilitiesManager) {
            return 0;
        }

        const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(heroPosition);
        if (!heroAbilities) {
            return 0;
        }

        // Check all zones for Necromancy ability
        let necromancyLevel = 0;
        ['zone1', 'zone2', 'zone3'].forEach(zone => {
            if (heroAbilities[zone]) {
                heroAbilities[zone].forEach(ability => {
                    if (ability && ability.name === 'Necromancy') {
                        necromancyLevel++;
                    }
                });
            }
        });

        return necromancyLevel;
    }

    // Get valid creatures in hand (level <= necromancy level)
    getValidCreaturesInHand(necromancyLevel, heroSelection) {
        if (!heroSelection.handManager) {
            return [];
        }

        const hand = heroSelection.handManager.getHand();
        const validCreatures = [];

        hand.forEach((cardName, index) => {
            // Check if it's a creature
            if (!heroSelection.heroCreatureManager || !heroSelection.heroCreatureManager.isCreatureSpell(cardName)) {
                return;
            }

            // Check card level
            const cardInfo = heroSelection.getCardInfo ? heroSelection.getCardInfo(cardName) : null;
            if (!cardInfo) {
                return;
            }

            const cardLevel = cardInfo.level || 0;
            if (cardLevel <= necromancyLevel) {
                validCreatures.push({
                    index: index,
                    name: cardName,
                    level: cardLevel,
                    cardInfo: cardInfo
                });
            }
        });

        return validCreatures;
    }

    // Start Vacarn bury mode
    startBuryMode(heroPosition, heroSelection) {
        const canUse = this.canUseVacarnEffect(heroPosition, heroSelection);
        if (!canUse.canUse) {
            this.showVacarnError(canUse.message);
            return false;
        }

        // Initialize bury mode state
        this.buryMode = {
            active: true,
            heroPosition: heroPosition,
            necromancyLevel: canUse.necromancyLevel,
            validCreatures: this.getValidCreaturesInHand(canUse.necromancyLevel, heroSelection),
            overlay: null
        };

        // Create bury mode UI
        this.createBuryModeUI();
        
        // Enable card selection
        this.enableCreatureSelection();
        
        return true;
    }

    // Create bury mode UI overlay
    createBuryModeUI() {
        const overlay = document.createElement('div');
        overlay.className = 'vacarn-bury-mode-overlay';
        overlay.innerHTML = `
            <div class="vacarn-bury-mode-container">
                <div class="vacarn-bury-mode-header">
                    <div class="vacarn-icon">💀</div>
                    <h3>Bury a Creature</h3>
                    <p>Select a Creature (level ≤ ${this.buryMode.necromancyLevel}) to bury and raise next turn.</p>
                </div>
                <div class="vacarn-bury-mode-buttons">
                    <button class="btn btn-secondary" onclick="window.vacarnEffectManager.cancelBuryMode()">
                        <span class="btn-icon">❌</span>
                        <span>Cancel</span>
                    </button>
                </div>
                <div class="vacarn-bury-mode-hand-indicator">
                    <span class="arrow-down">↓</span>
                    <span class="instruction">Click a highlighted Creature below to bury it</span>
                    <span class="arrow-down">↓</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.buryMode.overlay = overlay;
        
        // Add bury mode class to body
        document.body.classList.add('vacarn-bury-mode-active');
    }

    // Enable creature selection in hand
    enableCreatureSelection() {
        setTimeout(() => {
            const handCards = document.querySelectorAll('.hand-card');
            
            if (handCards.length === 0) {
                console.warn('Vacarn: No hand cards found, retrying...');
                setTimeout(() => {
                    this.enableCreatureSelection();
                }, 500);
                return;
            }
            
            // Get valid creature indices
            const validIndices = new Set(this.buryMode.validCreatures.map(c => c.index));
            
            handCards.forEach((card, index) => {
                try {
                    // Store original state
                    card.dataset.originalOnclick = card.getAttribute('onclick') || '';
                    card.dataset.originalCursor = card.style.cursor || '';
                    card.dataset.originalPointerEvents = card.style.pointerEvents || '';
                    
                    if (validIndices.has(index)) {
                        // Valid creature - make it selectable
                        card.style.pointerEvents = 'auto';
                        card.style.cursor = 'pointer';
                        card.setAttribute('onclick', `window.heroSelection.vacarnEffectManager.selectCreatureForBurial(${index})`);
                        card.classList.add('vacarn-creature-selectable');
                    } else {
                        // Not a valid creature - gray it out
                        card.classList.add('vacarn-creature-disabled');
                    }
                } catch (error) {
                    console.error(`Vacarn: Failed to process card ${index}:`, error);
                }
            });
        }, 100);
    }

    // Select a creature for burial
    async selectCreatureForBurial(cardIndex) {        
        if (!this.buryMode.active) {
            console.error('Vacarn: Bury mode not active');
            return;
        }

        // Find the creature in valid creatures list
        const validCreature = this.buryMode.validCreatures.find(c => c.index === cardIndex);
        if (!validCreature) {
            console.error(`Vacarn: Invalid creature selection at index ${cardIndex}`);
            return;
        }

        try {
            // Get hero selection reference
            const heroSelection = window.heroSelection;
            if (!heroSelection) {
                throw new Error('Hero selection not available');
            }

            // Remove creature from hand
            const removedCard = heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            if (!removedCard) {
                throw new Error('Failed to remove card from hand');
            }

            // Store the buried creature
            this.buriedCreatures[this.buryMode.heroPosition] = {
                creature: validCreature.cardInfo,
                buriedAtTurn: heroSelection.getCurrentTurn(),
                buriedAt: Date.now(),
                heroPosition: this.buryMode.heroPosition
            };

            // Mark Vacarn effect as used this turn
            this.vacarnUsedThisTurn = true;

            // Show success message
            this.showVacarnSuccess(`Buried ${this.formatCardName(validCreature.name)}! It will rise next turn.`);

            // Update displays
            heroSelection.updateHandDisplay();
            
            await heroSelection.saveGameState();

            // Send update to opponent
            if (heroSelection.gameDataSender) {
                heroSelection.gameDataSender('vacarn_effect_used', {
                    buriedCreature: validCreature.name,
                    heroPosition: this.buryMode.heroPosition,
                    timestamp: Date.now()
                });
            }

        } catch (error) {
            console.error('Error burying creature:', error);
            this.showVacarnError('Failed to bury creature!');
        } finally {
            // End bury mode
            this.endBuryMode();
        }
    }

    // Cancel bury mode
    cancelBuryMode() {
        this.endBuryMode();
    }

    // End bury mode
    endBuryMode() {        
        // Remove overlay - more robust approach
        if (this.buryMode.overlay) {
            try {
                this.buryMode.overlay.remove();
            } catch (error) {
                console.warn('Vacarn: Error removing overlay via reference:', error);
            }
        }
        
        // Fallback: remove overlay by class name to ensure it's gone
        const existingOverlay = document.querySelector('.vacarn-bury-mode-overlay');
        if (existingOverlay) {
            try {
                existingOverlay.remove();
            } catch (error) {
                console.error('Vacarn: Failed to remove overlay via fallback:', error);
            }
        }
        
        // Remove body class
        document.body.classList.remove('vacarn-bury-mode-active');
        
        // Restore hand card handlers
        const handCards = document.querySelectorAll('.hand-card');
        handCards.forEach((card, index) => {
            try {
                // Restore original onclick
                const originalOnclick = card.dataset.originalOnclick;
                if (originalOnclick && originalOnclick !== '') {
                    card.setAttribute('onclick', originalOnclick);
                } else {
                    card.removeAttribute('onclick');
                }
                
                // Restore original styling
                card.style.cursor = card.dataset.originalCursor || '';
                card.style.pointerEvents = card.dataset.originalPointerEvents || '';
                
                // Clean up datasets
                delete card.dataset.originalOnclick;
                delete card.dataset.originalCursor;
                delete card.dataset.originalPointerEvents;
                
                // Remove vacarn classes
                card.classList.remove('vacarn-creature-selectable', 'vacarn-creature-disabled');
                
            } catch (error) {
                console.error(`Vacarn: Failed to restore card ${index}:`, error);
            }
        });
        
        // Reset state
        this.buryMode = {
            active: false,
            heroPosition: null,
            necromancyLevel: 0,
            validCreatures: [],
            overlay: null
        };
    }

    async processStartOfTurn(heroSelection) {
        const currentTurn = heroSelection.getCurrentTurn();

        let anyChanges = false;

        // Check each buried creature
        for (const heroPosition in this.buriedCreatures) {
            const buriedData = this.buriedCreatures[heroPosition];
            
            // Check if this creature should be raised (next turn after burial)
            if (buriedData.buriedAtTurn < currentTurn) {
                
                // Check if Vacarn is still at this position
                const formation = heroSelection.formationManager.getBattleFormation();
                const hero = formation[heroPosition];
                
                if (hero && hero.name === 'Vacarn') {
                    // Animate and raise the creature
                    await this.animateNecromancyRaise(heroPosition, buriedData.creature);
                    
                    // Add creature to Vacarn's creatures
                    const success = heroSelection.heroCreatureManager.addCreatureToHero(
                        heroPosition, 
                        buriedData.creature.name
                    );
                    
                    if (success) {
                        // Show success message
                        this.showVacarnSuccess(`Vacarn raised ${this.formatCardName(buriedData.creature.name)} from the grave!`);
                        
                        // Update UI
                        heroSelection.updateBattleFormationUI();
                        
                        // Send formation update to opponent
                        await heroSelection.sendFormationUpdate();
                        
                        anyChanges = true;
                    } else {
                        console.error(`Failed to add raised creature ${buriedData.creature.name} to Vacarn`);
                    }
                } else {
                    continue; // Don't remove if Vacarn moved
                }
                
                // Remove the buried creature (it's been raised)
                delete this.buriedCreatures[heroPosition];
            }
        }

        // Always save if there were changes
        if (anyChanges) {
            await heroSelection.saveGameState();
        }
    }

    // Animate necromancy raise effect
    async animateNecromancyRaise(heroPosition, creatureData) {
        const heroCard = document.querySelector(`.team-slot[data-position="${heroPosition}"] .character-card`);
        if (!heroCard) {
            console.warn(`Vacarn: Could not find hero card at ${heroPosition} for animation`);
            return;
        }

        // Get hero card position
        const heroRect = heroCard.getBoundingClientRect();
        
        // Skip animation if hero card is not properly positioned (e.g., during reward screen)
        if (heroRect.width === 0 || heroRect.height === 0 || heroRect.top === 0 || heroRect.left === 0) {
            console.log(`Vacarn: Skipping animation - hero card not properly positioned during reward screen`);
            return;
        }

        // Create necromancy animation overlay
        const animationOverlay = document.createElement('div');
        animationOverlay.className = 'necromancy-animation-overlay';
        animationOverlay.innerHTML = `
            <div class="necromancy-animation">
                <div class="necromancy-icon">💀</div>
                <div class="necromancy-text">Rising...</div>
                <div class="necromancy-creature">${this.formatCardName(creatureData.name)}</div>
            </div>
        `;

        // Position overlay over the hero card
        animationOverlay.style.cssText = `
            position: fixed;
            top: ${heroRect.top}px;
            left: ${heroRect.left}px;
            width: ${heroRect.width}px;
            height: ${heroRect.height}px;
            z-index: 2000;
            pointer-events: none;
        `;

        document.body.appendChild(animationOverlay);

        // Wait for animation to complete
        await new Promise(resolve => {
            setTimeout(() => {
                animationOverlay.remove();
                resolve();
            }, 2000); // 2 second animation
        });
    }

    // Show Vacarn success message
    showVacarnSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'vacarn-effect-success';
        successDiv.innerHTML = `
            <div class="success-content">
                <span class="success-icon">💀</span>
                <span class="success-text">${message}</span>
            </div>
        `;
        
        successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #6f42c1 0%, #495057 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(111, 66, 193, 0.4);
            animation: vacarnSuccessBounce 0.6s ease-out;
            text-align: center;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'vacarnSuccessFade 0.4s ease-out forwards';
            setTimeout(() => successDiv.remove(), 400);
        }, 2500);
    }

    // Show Vacarn error message
    showVacarnError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'vacarn-effect-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
            </div>
        `;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(244, 67, 54, 0.4);
            animation: vacarnErrorShake 0.5s ease-out;
            text-align: center;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'vacarnErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2000);
    }

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Enhanced reset for new turn with restoration protection
    resetForNewTurn() {
        // Only reset if not currently restoring state
        if (this.isRestoring) {
            return;
        }
                
        this.vacarnUsedThisTurn = false;
    }

    exportVacarnState() {
        const state = {
            vacarnUsedThisTurn: this.vacarnUsedThisTurn,
            buriedCreatures: { ...this.buriedCreatures },
            timestamp: Date.now()
        };
        
        return state;
    }

    importVacarnState(stateData) {
        if (!stateData || typeof stateData !== 'object') {
            console.error('💀 VACARN IMPORT: Invalid Vacarn state data provided');
            return false;
        }

        // Set restoration flag to prevent interference from turn change events
        this.isRestoring = true;

        try {
            // Restore the used flag
            if (typeof stateData.vacarnUsedThisTurn === 'boolean') {
                this.vacarnUsedThisTurn = stateData.vacarnUsedThisTurn;
            }

            // Restore buried creatures
            if (stateData.buriedCreatures && typeof stateData.buriedCreatures === 'object') {
                this.buriedCreatures = { ...stateData.buriedCreatures };
                const buriedCount = Object.keys(this.buriedCreatures).length;
                
                // Log details of each buried creature
                Object.entries(this.buriedCreatures).forEach(([position, data]) => {
                });
            }
            return true;

        } finally {
            // Clear restoration flag after a short delay to allow for any pending operations
            setTimeout(() => {
                this.isRestoring = false;
            }, 1000);
        }
    }

    // Reset all state (for new game)
    reset() {
        this.vacarnUsedThisTurn = false;
        this.buriedCreatures = {};
        this.buryMode = {
            active: false,
            heroPosition: null,
            necromancyLevel: 0,
            validCreatures: [],
            overlay: null
        };
        this.isRestoring = false;
    }

    // Get current state for debugging
    getState() {
        return {
            vacarnUsedThisTurn: this.vacarnUsedThisTurn,
            buriedCreatures: { ...this.buriedCreatures },
            buryModeActive: this.buryMode.active,
            isRestoring: this.isRestoring
        };
    }

    // Setup CSS styles
    setupStyles() {
        if (document.getElementById('vacarnEffectStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'vacarnEffectStyles';
        style.textContent = `
            /* Vacarn bury mode overlay */
            .vacarn-bury-mode-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.9);
                z-index: 1500;
                padding: 20px;
                animation: slideDown 0.3s ease-out;
            }
            
            .vacarn-bury-mode-container {
                max-width: 800px;
                margin: 0 auto;
                text-align: center;
            }
            
            .vacarn-bury-mode-header {
                margin-bottom: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
            }
            
            .vacarn-icon {
                font-size: 32px;
                animation: vacarnIconFloat 3s ease-in-out infinite;
            }
            
            .vacarn-bury-mode-header h3 {
                color: #6f42c1;
                font-size: 28px;
                margin: 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            }
            
            .vacarn-bury-mode-header p {
                color: #ddd;
                font-size: 18px;
                margin: 0;
            }
            
            .vacarn-bury-mode-buttons {
                margin-bottom: 20px;
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            
            .vacarn-bury-mode-hand-indicator {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
                color: #6f42c1;
                font-size: 18px;
                font-weight: bold;
                margin-top: 20px;
            }
            
            .arrow-down {
                font-size: 24px;
                animation: bounce 1s ease-in-out infinite;
            }
            
            /* Hand card states during bury mode */
            body.vacarn-bury-mode-active .hand-card {
                transition: all 0.3s ease;
            }
            
            .hand-card.vacarn-creature-selectable {
                cursor: pointer !important;
                border: 2px solid transparent;
                position: relative;
                pointer-events: auto !important;
            }
            
            .hand-card.vacarn-creature-selectable::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border: 2px solid rgba(111, 66, 193, 0.4);
                border-radius: 8px;
                pointer-events: none;
                transition: all 0.2s ease;
                background: rgba(111, 66, 193, 0.1);
            }
            
            .hand-card.vacarn-creature-selectable:hover {
                border-color: #6f42c1 !important;
                transform: translateY(-15px) scale(1.05) !important;
                box-shadow: 0 10px 30px rgba(111, 66, 193, 0.5) !important;
            }
            
            .hand-card.vacarn-creature-selectable:hover::before {
                border-color: rgba(111, 66, 193, 0.8);
                box-shadow: 0 0 15px rgba(111, 66, 193, 0.4);
                background: rgba(111, 66, 193, 0.2);
            }
            
            .hand-card.vacarn-creature-disabled {
                opacity: 0.3 !important;
                filter: grayscale(80%) !important;
                cursor: not-allowed !important;
                transform: scale(0.95) !important;
                pointer-events: none !important;
            }
            
            /* Necromancy animation */
            .necromancy-animation-overlay {
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                background: rgba(111, 66, 193, 0.9);
                backdrop-filter: blur(5px);
            }
            
            .necromancy-animation {
                text-align: center;
                color: white;
                animation: necromancyPulse 2s ease-in-out;
            }
            
            .necromancy-icon {
                font-size: 32px;
                margin-bottom: 8px;
                animation: necromancyIconSpin 2s ease-in-out;
            }
            
            .necromancy-text {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 4px;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            .necromancy-creature {
                font-size: 16px;
                font-weight: bold;
                color: #ffd700;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            /* Animations */
            @keyframes vacarnIconFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                33% { transform: translateY(-4px) rotate(3deg); }
                66% { transform: translateY(4px) rotate(-3deg); }
            }
            
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            @keyframes necromancyPulse {
                0%, 100% { transform: scale(1); opacity: 0.9; }
                50% { transform: scale(1.1); opacity: 1; }
            }
            
            @keyframes necromancyIconSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            @keyframes vacarnSuccessBounce {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                60% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            
            @keyframes vacarnSuccessFade {
                from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }
            
            @keyframes vacarnErrorShake {
                0%, 100% { transform: translate(-50%, -50%); }
                25% { transform: translate(-52%, -50%); }
                75% { transform: translate(-48%, -50%); }
            }
            
            @keyframes vacarnErrorFade {
                from { opacity: 1; transform: translate(-50%, -50%); }
                to { opacity: 0; transform: translate(-50%, -50%) translateY(-10px); }
            }
            
            .success-content,
            .error-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .success-icon,
            .error-icon {
                font-size: 20px;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Export for global access and setup
if (typeof window !== 'undefined') {
    window.VacarnEffectManager = VacarnEffectManager;
    
    // Create global instance
    window.vacarnEffectManager = new VacarnEffectManager();
    
    // Setup styles
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.vacarnEffectManager.setupStyles();
        });
    } else {
        window.vacarnEffectManager.setupStyles();
    }
}

export default VacarnEffectManager;
