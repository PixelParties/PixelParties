// heroes/Heinz.js - Heinz Hero Effect Manager
// Handles "first discard of turn" bonus: +2 extra gold and draw 1 card

export class HeinzEffectManager {
    constructor() {
        // Track if the first discard bonus has been used this turn
        this.heinzFirstDiscardUsed = false;
    }

    // Reset all Heinz effects for new game
    reset() {
        this.heinzFirstDiscardUsed = false;
    }

    // Reset turn-based effects (called at start of each turn)
    resetForNewTurn() {
        this.heinzFirstDiscardUsed = false;
    }

    // Check if player has Heinz in formation and can trigger the first discard bonus
    canTriggerHeinzFirstDiscardBonus(heroSelection) {
        // Already used this turn
        if (this.heinzFirstDiscardUsed) {
            return false;
        }

        // Check if player has Heinz in their formation
        const formation = heroSelection.formationManager.getBattleFormation();
        const hasHeinz = Object.values(formation).some(hero => 
            hero && hero.name === 'Heinz'
        );

        return hasHeinz;
    }

    // Trigger Heinz's first discard bonus effect
    async triggerHeinzFirstDiscardBonus(heroSelection) {
        if (!this.canTriggerHeinzFirstDiscardBonus(heroSelection)) {
            return false;
        }

        try {
            // Award 2 extra gold (on top of the 2 already given by disenchanting)
            if (heroSelection.goldManager) {
                heroSelection.goldManager.addPlayerGold(2, 'heinz_first_discard_bonus');
            }

            // Draw 1 card
            if (heroSelection.handManager && !heroSelection.handManager.isHandFull()) {
                const drawnCards = heroSelection.handManager.drawCards(1);
                if (drawnCards.length > 0) {
                    // Update hand display to show new card
                    heroSelection.updateHandDisplay();
                }
            }

            // Mark the first discard bonus as used for this turn
            this.heinzFirstDiscardUsed = true;

            // Show visual feedback to player
            this.showHeinzDiscardBonus();

            // Update gold display
            heroSelection.updateGoldDisplay();

            // Save game state to persist the effect usage
            await heroSelection.saveGameState();

            return true;

        } catch (error) {
            console.error('Error triggering Heinz first discard bonus:', error);
            return false;
        }
    }

    // Show visual feedback when Heinz effect triggers
    showHeinzDiscardBonus() {
        // Create floating notification
        const notification = document.createElement('div');
        notification.className = 'heinz-discard-bonus-notification';
        notification.innerHTML = `
            <div class="heinz-bonus-content">
                <div class="heinz-bonus-icon">⚡</div>
                <div class="heinz-bonus-text">
                    <div class="heinz-bonus-title">Heinz's Invention!</div>
                    <div class="heinz-bonus-details">+2 Extra Gold • Draw 1 Card</div>
                </div>
            </div>
        `;

        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: heinzBonusSlideIn 0.5s ease-out;
            box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;

        document.body.appendChild(notification);

        // Remove notification after animation
        setTimeout(() => {
            notification.style.animation = 'heinzBonusFadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Export Heinz state for saving/syncing
    exportHeinzState() {
        return {
            heinzFirstDiscardUsed: this.heinzFirstDiscardUsed,
            timestamp: Date.now()
        };
    }

    // Import Heinz state for loading/syncing
    importHeinzState(state) {
        if (!state || typeof state !== 'object') {
            return false;
        }

        this.heinzFirstDiscardUsed = Boolean(state.heinzFirstDiscardUsed);
        
        return true;
    }

    // Get current state for debugging
    getState() {
        return {
            heinzFirstDiscardUsed: this.heinzFirstDiscardUsed
        };
    }
}

// Add CSS animations if not already present
if (typeof document !== 'undefined' && !document.getElementById('heinzEffectStyles')) {
    const style = document.createElement('style');
    style.id = 'heinzEffectStyles';
    style.textContent = `
        @keyframes heinzBonusSlideIn {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(-30px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(5px) scale(1.05);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }

        @keyframes heinzBonusFadeOut {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px) scale(0.9);
            }
        }

        .heinz-discard-bonus-notification {
            font-family: Arial, sans-serif;
        }

        .heinz-bonus-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .heinz-bonus-icon {
            font-size: 24px;
            animation: heinzIconSpark 1.5s ease-in-out infinite;
        }

        .heinz-bonus-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .heinz-bonus-title {
            font-size: 16px;
            font-weight: bold;
            color: white;
        }

        .heinz-bonus-details {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.9);
            font-weight: normal;
        }

        @keyframes heinzIconSpark {
            0%, 100% { 
                transform: scale(1) rotate(0deg);
                filter: brightness(1);
            }
            50% { 
                transform: scale(1.1) rotate(5deg);
                filter: brightness(1.2);
            }
        }
    `;
    document.head.appendChild(style);
}