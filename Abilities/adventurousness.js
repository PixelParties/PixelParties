// adventurousness.js - Adventurousness Ability Click Handler

export class AdventurousnessAbility {
    constructor() {
        this.abilityName = 'Adventurousness';
        this.goldPerLevel = 10;
    }

    // Handle click on Adventurousness ability
    handleClick(heroPosition, abilityLevel) {
        console.log(`Adventurousness clicked - Hero: ${heroPosition}, Level: ${abilityLevel}`);
        
        // Get managers from heroSelection
        if (!window.heroSelection) {
            console.error('HeroSelection not available');
            return;
        }

        const actionManager = window.heroSelection.getActionManager();
        const goldManager = window.heroSelection.getGoldManager();

        if (!actionManager || !goldManager) {
            console.error('Required managers not available');
            return;
        }

        // Check if player has actions
        if (!actionManager.hasActions()) {
            // Show error message
            this.showActionError("Adventurousness costs an Action!");
            return;
        }

        // Calculate gold amount
        const goldAmount = abilityLevel * this.goldPerLevel;

        // Show confirmation dialog
        this.showConfirmationDialog(heroPosition, abilityLevel, goldAmount, actionManager, goldManager);
    }

    // Show error message for no actions
    showActionError(message) {
        // Create error tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'adventurousness-error-tooltip';
        tooltip.textContent = message;
        
        tooltip.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            z-index: 10000;
            animation: adventurousnessErrorShake 0.5s ease-out;
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(tooltip);
        
        // Remove after delay
        setTimeout(() => {
            tooltip.style.animation = 'adventurousnessErrorFadeOut 0.3s ease-out';
            setTimeout(() => tooltip.remove(), 300);
        }, 2000);
    }

    // Show confirmation dialog
    showConfirmationDialog(heroPosition, abilityLevel, goldAmount, actionManager, goldManager) {
        // Remove any existing dialog
        const existingDialog = document.getElementById('adventurousnessDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.id = 'adventurousnessDialog';
        overlay.className = 'adventurousness-dialog-overlay';
        
        // Get hero name
        let heroName = 'Hero';
        if (window.heroSelection && window.heroSelection.formationManager) {
            const formation = window.heroSelection.formationManager.getBattleFormation();
            if (formation[heroPosition]) {
                heroName = formation[heroPosition].name;
            }
        }

        overlay.innerHTML = `
            <div class="adventurousness-dialog">
                <div class="dialog-header">
                    <span class="ability-icon">🗺️</span>
                    <h3>Adventurousness</h3>
                </div>
                <div class="dialog-content">
                    <p class="dialog-hero">${heroName} at ${this.formatPosition(heroPosition)}</p>
                    <p class="dialog-level">Level ${abilityLevel} Adventurousness</p>
                    <div class="dialog-question">
                        <p>Spend <span class="action-cost">1 Action</span> to gain <span class="gold-reward">${goldAmount} Gold</span>?</p>
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button class="dialog-btn btn-yes" onclick="window.adventurousnessConfirm(true)">
                        <span class="btn-icon">✓</span> Yes
                    </button>
                    <button class="dialog-btn btn-no" onclick="window.adventurousnessConfirm(false)">
                        <span class="btn-icon">✗</span> No
                    </button>
                </div>
            </div>
        `;

        // Add styles
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: adventurousnessOverlayFadeIn 0.3s ease-out;
        `;

        document.body.appendChild(overlay);

        // Store data for confirmation
        this.pendingAction = {
            heroPosition,
            abilityLevel,
            goldAmount,
            actionManager,
            goldManager
        };

        // Set up global confirm function
        window.adventurousnessConfirm = (confirmed) => {
            this.handleConfirmation(confirmed);
        };

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.handleConfirmation(false);
            }
        });
    }

    // Handle dialog confirmation
    async handleConfirmation(confirmed) {
        const dialog = document.getElementById('adventurousnessDialog');
        if (!dialog) return;

        if (confirmed && this.pendingAction) {
            const { goldAmount, actionManager, goldManager } = this.pendingAction;

            // Consume action
            actionManager.consumeAction();

            // Add gold with animation
            goldManager.addPlayerGold(goldAmount, 'adventurousness');

            // Update displays
            if (window.heroSelection) {
                window.heroSelection.updateActionDisplay();
                window.heroSelection.updateGoldDisplay();
                
                // Update hand display to gray out action cards if no actions left
                window.heroSelection.updateHandDisplay();
                
                // Save game state
                await window.heroSelection.saveGameState();
            }

            // Show success feedback
            this.showSuccessFeedback(goldAmount);
        }

        // Remove dialog with animation
        dialog.style.animation = 'adventurousnessOverlayFadeOut 0.3s ease-out';
        setTimeout(() => {
            dialog.remove();
            delete window.adventurousnessConfirm;
            this.pendingAction = null;
        }, 300);
    }

    // Show success feedback
    showSuccessFeedback(goldAmount) {
        const feedback = document.createElement('div');
        feedback.className = 'adventurousness-success';
        feedback.innerHTML = `
            <span class="success-icon">✨</span>
            <span class="success-text">+${goldAmount} Gold from Adventurousness!</span>
        `;
        
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 20px 32px;
            border-radius: 12px;
            font-weight: bold;
            font-size: 20px;
            box-shadow: 0 6px 24px rgba(76, 175, 80, 0.4);
            z-index: 10001;
            animation: adventurousnessSuccessBounce 0.6s ease-out;
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        document.body.appendChild(feedback);

        // Remove after animation
        setTimeout(() => {
            feedback.style.animation = 'adventurousnessSuccessFadeOut 0.4s ease-out';
            setTimeout(() => feedback.remove(), 400);
        }, 2000);
    }

    // Format position for display
    formatPosition(position) {
        return position.charAt(0).toUpperCase() + position.slice(1);
    }
}

// Create and export singleton instance
export const adventurousnessAbility = new AdventurousnessAbility();

// Add required CSS animations
if (typeof document !== 'undefined' && !document.getElementById('adventurousnessStyles')) {
    const style = document.createElement('style');
    style.id = 'adventurousnessStyles';
    style.textContent = `
        @keyframes adventurousnessErrorShake {
            0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
            25% { transform: translate(-50%, -50%) rotate(-2deg); }
            75% { transform: translate(-50%, -50%) rotate(2deg); }
        }
        
        @keyframes adventurousnessErrorFadeOut {
            to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
        
        @keyframes adventurousnessOverlayFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes adventurousnessOverlayFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes adventurousnessSuccessBounce {
            0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        
        @keyframes adventurousnessSuccessFadeOut {
            to { 
                opacity: 0; 
                transform: translate(-50%, -50%) translateY(-20px) scale(0.9); 
            }
        }
        
        .adventurousness-dialog {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            border-radius: 16px;
            padding: 0;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: adventurousnessDialogSlideIn 0.3s ease-out;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        @keyframes adventurousnessDialogSlideIn {
            from { 
                transform: translateY(-20px) scale(0.9); 
                opacity: 0;
            }
            to { 
                transform: translateY(0) scale(1); 
                opacity: 1;
            }
        }
        
        .adventurousness-dialog .dialog-header {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .adventurousness-dialog .dialog-header h3 {
            margin: 0;
            color: white;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        
        .adventurousness-dialog .ability-icon {
            font-size: 32px;
        }
        
        .adventurousness-dialog .dialog-content {
            padding: 24px;
            text-align: center;
        }
        
        .adventurousness-dialog .dialog-hero {
            font-size: 18px;
            color: #ecf0f1;
            margin: 0 0 8px 0;
            font-weight: bold;
        }
        
        .adventurousness-dialog .dialog-level {
            font-size: 16px;
            color: #bdc3c7;
            margin: 0 0 20px 0;
        }
        
        .adventurousness-dialog .dialog-question {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 8px;
            margin: 16px 0;
        }
        
        .adventurousness-dialog .dialog-question p {
            margin: 0;
            font-size: 18px;
            color: white;
        }
        
        .adventurousness-dialog .action-cost {
            color: #e74c3c;
            font-weight: bold;
        }
        
        .adventurousness-dialog .gold-reward {
            color: #f1c40f;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(241, 196, 15, 0.5);
        }
        
        .adventurousness-dialog .dialog-buttons {
            display: flex;
            padding: 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .adventurousness-dialog .dialog-btn {
            flex: 1;
            padding: 20px;
            border: none;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .adventurousness-dialog .btn-yes {
            background: #27ae60;
            color: white;
            border-right: 1px solid rgba(0, 0, 0, 0.2);
        }
        
        .adventurousness-dialog .btn-yes:hover {
            background: #2ecc71;
            transform: translateY(-2px);
        }
        
        .adventurousness-dialog .btn-no {
            background: #e74c3c;
            color: white;
        }
        
        .adventurousness-dialog .btn-no:hover {
            background: #c0392b;
            transform: translateY(-2px);
        }
        
        .adventurousness-dialog .btn-icon {
            font-size: 24px;
        }
        
        .adventurousness-success .success-icon {
            font-size: 28px;
        }
    `;
    document.head.appendChild(style);
}