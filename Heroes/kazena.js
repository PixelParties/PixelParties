// kazena.js - Kazena Hero Effect Management System

export class KazenaEffectManager {
    constructor() {
        this.kazenaUsedThisTurn = false;
        this.targetHandSize = 7; // Draw until we have 7 cards
        
        console.log('KazenaEffectManager initialized');
    }

    // Check if Kazena effect can be used
    canUseKazenaEffect(handManager) {
        // Check if already used this turn
        if (this.kazenaUsedThisTurn) {
            return {
                canUse: false,
                reason: 'already_used',
                message: 'You can only use this effect once per turn!'
            };
        }

        // Check current hand size
        const currentHandSize = handManager.getHandSize();
        if (currentHandSize >= this.targetHandSize) {
            return {
                canUse: false,
                reason: 'hand_full',
                message: `You already have ${currentHandSize} cards in hand!`
            };
        }

        return {
            canUse: true,
            reason: null,
            message: null
        };
    }

    // Calculate how many cards will be drawn
    calculateCardsToDraw(handManager) {
        const currentHandSize = handManager.getHandSize();
        return Math.max(0, this.targetHandSize - currentHandSize);
    }

    // Use Kazena effect (draw cards until hand has 7)
    async useKazenaEffect(heroSelection) {
        if (!heroSelection) {
            return false;
        }

        const handManager = heroSelection.getHandManager();
        
        // Double-check we can use the effect
        const canUse = this.canUseKazenaEffect(handManager);
        if (!canUse.canUse) {
            return false;
        }

        try {
            // Calculate cards to draw
            const cardsToDraw = this.calculateCardsToDraw(handManager);
            
            if (cardsToDraw === 0) {
                this.showKazenaEffectError('Hand is already at target size!');
                return false;
            }

            // Draw cards
            const drawnCards = handManager.drawCards(cardsToDraw);
            
            if (drawnCards.length > 0) {
                // Mark as used this turn
                this.kazenaUsedThisTurn = true;
                
                // Show success message
                this.showKazenaEffectSuccess(drawnCards.length);
                
                // Update displays
                heroSelection.updateHandDisplay();
                
                // Save game state
                await heroSelection.saveGameState();
                
                // Send update to opponent
                if (heroSelection.gameDataSender) {
                    heroSelection.gameDataSender('kazena_effect_used', {
                        cardsDrawn: drawnCards.length,
                        timestamp: Date.now()
                    });
                }
                
                console.log(`✨ Kazena effect used: Drew ${drawnCards.length} cards`);
                return true;
            } else {
                this.showKazenaEffectError('Could not draw cards from deck!');
                return false;
            }
            
        } catch (error) {
            console.error('Error using Kazena effect:', error);
            return false;
        }
    }

    // Show Kazena effect dialog
    showKazenaDialog(heroSelection, heroPosition) {
        const handManager = heroSelection.getHandManager();
        const canUse = this.canUseKazenaEffect(handManager);

        if (!canUse.canUse) {
            // Show error message
            this.showKazenaEffectError(canUse.message);
            return;
        }

        const cardsToDraw = this.calculateCardsToDraw(handManager);
        const currentHandSize = handManager.getHandSize();

        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.id = 'kazenaEffectDialog';
        overlay.className = 'kazena-effect-overlay';
        overlay.innerHTML = `
            <div class="kazena-dialog-container">
                <div class="kazena-dialog-content">
                    <div class="kazena-dialog-header">
                        <div class="kazena-icon">🌊</div>
                        <h3>Kazena's Flow</h3>
                    </div>
                    <div class="kazena-dialog-body">
                        <p>Do you want to draw <span class="cards-amount">${cardsToDraw} card${cardsToDraw !== 1 ? 's' : ''}</span>?</p>
                        <div class="current-hand-info">
                            <span class="hand-icon">🃏</span>
                            <span>Current Hand: ${currentHandSize} → ${this.targetHandSize} cards</span>
                        </div>
                    </div>
                    <div class="kazena-dialog-buttons">
                        <button class="kazena-btn kazena-btn-no" onclick="window.closeKazenaDialog()">
                            <span class="btn-icon">❌</span>
                            <span>No</span>
                        </button>
                        <button class="kazena-btn kazena-btn-yes" onclick="window.confirmKazenaEffect()">
                            <span class="btn-icon">✨</span>
                            <span>Yes</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles if not already present
        this.ensureKazenaDialogStyles();

        // Prevent body scrolling
        document.body.classList.add('kazena-dialog-active');

        // Add to body
        document.body.appendChild(overlay);

        // Animate in
        overlay.style.animation = 'fadeIn 0.3s ease-out';

        // Store reference for the confirm handler
        overlay.dataset.heroPosition = heroPosition;

        // Set up global handlers
        window.closeKazenaDialog = () => {
            const dialog = document.getElementById('kazenaEffectDialog');
            if (dialog) {
                dialog.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    dialog.remove();
                    document.body.classList.remove('kazena-dialog-active');
                }, 300);
            }
        };

        window.confirmKazenaEffect = async () => {
            const dialog = document.getElementById('kazenaEffectDialog');
            if (dialog && window.heroSelection) {
                // Close dialog first
                window.closeKazenaDialog();
                
                // Use the effect
                await window.heroSelection.kazenaEffectManager.useKazenaEffect(window.heroSelection);
            }
        };
    }

    // Show success message
    showKazenaEffectSuccess(cardsDrawn) {
        const successPopup = document.createElement('div');
        successPopup.className = 'kazena-effect-success';
        successPopup.innerHTML = `
            <div class="success-content">
                <span class="success-icon">✨</span>
                <span>Drew ${cardsDrawn} card${cardsDrawn !== 1 ? 's' : ''}!</span>
            </div>
        `;
        
        document.body.appendChild(successPopup);
        
        // Animate in
        successPopup.style.animation = 'kazenaSuccessBounce 0.5s ease-out';
        
        // Remove after animation
        setTimeout(() => {
            successPopup.style.animation = 'kazenaSuccessFade 0.5s ease-out';
            setTimeout(() => successPopup.remove(), 500);
        }, 1500);
    }

    // Show error message
    showKazenaEffectError(message) {
        const errorPopup = document.createElement('div');
        errorPopup.className = 'kazena-effect-error';
        errorPopup.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(errorPopup);
        
        // Animate in
        errorPopup.style.animation = 'kazenaErrorShake 0.5s ease-out';
        
        // Remove after animation
        setTimeout(() => {
            errorPopup.style.animation = 'kazenaErrorFade 0.5s ease-out';
            setTimeout(() => errorPopup.remove(), 500);
        }, 2000);
    }

    // Ensure styles are added
    ensureKazenaDialogStyles() {
        if (document.getElementById('kazenaEffectStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'kazenaEffectStyles';
        style.textContent = `
            /* Kazena Effect Dialog Styles */
            .kazena-effect-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.75);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            }
            
            .kazena-dialog-container {
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
                border-radius: 20px;
                padding: 3px;
                box-shadow: 0 10px 40px rgba(59, 130, 246, 0.4);
                max-width: 450px;
                width: 90%;
            }
            
            .kazena-dialog-content {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border-radius: 18px;
                padding: 30px;
            }
            
            .kazena-dialog-header {
                text-align: center;
                margin-bottom: 25px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }
            
            .kazena-icon {
                font-size: 32px;
                animation: kazenaIconFloat 3s ease-in-out infinite;
            }
            
            .kazena-dialog-header h3 {
                margin: 0;
                font-size: 1.8rem;
                color: #60a5fa;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            }
            
            .kazena-dialog-body {
                text-align: center;
                margin-bottom: 25px;
            }
            
            .kazena-dialog-body p {
                font-size: 1.2rem;
                color: rgba(255, 255, 255, 0.9);
                margin: 0 0 15px 0;
                line-height: 1.4;
            }
            
            .cards-amount {
                color: #60a5fa;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            .current-hand-info {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.8);
                background: rgba(96, 165, 250, 0.1);
                border: 1px solid rgba(96, 165, 250, 0.3);
                border-radius: 8px;
                padding: 8px 16px;
                margin: 0 auto;
                max-width: 250px;
            }
            
            .current-hand-info .hand-icon {
                font-size: 18px;
                filter: drop-shadow(0 0 4px rgba(96, 165, 250, 0.6));
            }
            
            .kazena-dialog-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            
            .kazena-btn {
                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 100px;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            }
            
            .kazena-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            }
            
            .kazena-btn:active {
                transform: translateY(0);
            }
            
            .kazena-btn-no {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            }
            
            .kazena-btn-no:hover {
                background: linear-gradient(135deg, #e94560 0%, #d42c40 100%);
                box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
            }
            
            .kazena-btn-yes {
                background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
            }
            
            .kazena-btn-yes:hover {
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
            }
            
            .btn-icon {
                font-size: 18px;
            }
            
            /* Success and Error Popups */
            .kazena-effect-success,
            .kazena-effect-error {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                padding: 20px 30px;
                border-radius: 12px;
                font-size: 1.1rem;
                font-weight: bold;
                z-index: 10001;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            }
            
            .kazena-effect-success {
                background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
                color: white;
            }
            
            .kazena-effect-error {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
            }
            
            /* Animations */
            @keyframes kazenaIconFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                33% { transform: translateY(-3px) rotate(2deg); }
                66% { transform: translateY(3px) rotate(-2deg); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.9); }
            }
            
            @keyframes kazenaSuccessBounce {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                60% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            
            @keyframes kazenaSuccessFade {
                from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }
            
            @keyframes kazenaErrorShake {
                0%, 100% { transform: translate(-50%, -50%); }
                25% { transform: translate(-52%, -50%); }
                75% { transform: translate(-48%, -50%); }
            }
            
            @keyframes kazenaErrorFade {
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
            
            body.kazena-dialog-active {
                overflow: hidden;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Reset Kazena effect usage (called at start of new turn)
    resetForNewTurn() {
        this.kazenaUsedThisTurn = false;
        console.log('✨ Kazena effect usage reset for new turn');
    }

    // Export Kazena effect state for saving
    exportKazenaState() {
        return {
            kazenaUsedThisTurn: this.kazenaUsedThisTurn,
            timestamp: Date.now()
        };
    }

    // Import Kazena effect state for loading
    importKazenaState(stateData) {
        if (!stateData || typeof stateData !== 'object') {
            console.error('Invalid Kazena state data provided');
            return false;
        }

        if (typeof stateData.kazenaUsedThisTurn === 'boolean') {
            this.kazenaUsedThisTurn = stateData.kazenaUsedThisTurn;
            console.log(`✨ Kazena effect state restored: used=${this.kazenaUsedThisTurn}`);
            return true;
        }

        return false;
    }

    // Reset all state (for new game)
    reset() {
        this.kazenaUsedThisTurn = false;
        console.log('✨ Kazena effect manager reset for new game');
    }

    // Get current state for debugging
    getState() {
        return {
            kazenaUsedThisTurn: this.kazenaUsedThisTurn,
            targetHandSize: this.targetHandSize
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.KazenaEffectManager = KazenaEffectManager;
}

export default KazenaEffectManager;