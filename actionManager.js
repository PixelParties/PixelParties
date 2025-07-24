// actionManager.js - Action Economy Management Module (Team Building Phase Only)

export class ActionManager {
    constructor() {
        this.playerActions = 1;
        this.maxActions = 1;
        this.onActionChangeCallback = null;
        
        console.log('ActionManager initialized - Starting with 1 Action per turn (Team Building only)');
    }

    // Initialize with callback
    init(onActionChangeCallback = null) {
        this.onActionChangeCallback = onActionChangeCallback;
        this.resetActions();
    }

    // Get current player actions
    getPlayerActions() {
        return this.playerActions;
    }

    // Get max player actions
    getMaxActions() {
        return this.maxActions;
    }

    // Check if player has actions available
    hasActions() {
        return this.playerActions > 0;
    }

    // Check if player can play an action card
    canPlayActionCard(cardInfo) {
        // Check if card requires an action
        if (!cardInfo || !cardInfo.action) {
            return { canPlay: true, reason: null };
        }

        // Check if player has actions
        if (this.playerActions <= 0) {
            return { 
                canPlay: false, 
                reason: "You have no Actions left this turn!"
            };
        }

        return { canPlay: true, reason: null };
    }

    // Consume an action
    consumeAction() {
        if (this.playerActions > 0) {
            const oldActions = this.playerActions;
            this.playerActions--;
            
            console.log(`Action consumed: ${oldActions} → ${this.playerActions}`);
            
            this.notifyActionChange({
                player: true,
                oldValue: oldActions,
                newValue: this.playerActions,
                maxActions: this.maxActions
            });
            
            return true;
        }
        
        console.warn('Attempted to consume action but none available');
        return false;
    }

    // Add actions (for future card effects)
    addPlayerActions(amount) {
        const oldActions = this.playerActions;
        this.playerActions += amount;
        
        console.log(`Actions added: ${oldActions} → ${this.playerActions}`);
        
        this.notifyActionChange({
            player: true,
            oldValue: oldActions,
            newValue: this.playerActions,
            maxActions: this.maxActions
        });
    }

    // Reset actions at turn start
    resetActions() {
        const oldPlayerActions = this.playerActions;
        
        this.playerActions = this.maxActions;
        
        console.log(`Actions reset: ${oldPlayerActions} → ${this.playerActions}`);
        
        this.notifyActionChange({
            player: true,
            oldValue: oldPlayerActions,
            newValue: this.playerActions,
            maxActions: this.maxActions,
            reset: true
        });
    }

    // Set opponent actions (for sync) - REMOVED OPPONENT TRACKING

    // Notify listeners of action changes
    notifyActionChange(changeData) {
        if (this.onActionChangeCallback) {
            this.onActionChangeCallback(changeData);
        }
    }

    // Create action display HTML - SIMPLIFIED WITHOUT OPPONENT
    createActionDisplay() {
        return `
            <div class="action-display-container compact">
                <div class="action-display player-actions">
                    <div class="action-header">
                        <span class="action-icon">⚡</span>
                        <span class="action-label">Actions</span>
                    </div>
                    <div class="action-counter">
                        <span class="current-actions">${this.playerActions}</span>
                        <span class="max-actions">/ ${this.maxActions}</span>
                    </div>
                    <div class="action-orbs">
                        ${this.createActionOrbs(this.playerActions, this.maxActions)}
                    </div>
                </div>
            </div>
        `;
    }

    // Create visual action orbs
    createActionOrbs(current, max) {
        let orbsHTML = '';
        for (let i = 0; i < max; i++) {
            const filled = i < current;
            orbsHTML += `<div class="action-orb ${filled ? 'filled' : 'empty'}"></div>`;
        }
        return orbsHTML;
    }

    // Update action display
    updateActionDisplay() {
        // Update player actions
        const playerCurrent = document.querySelector('.player-actions .current-actions');
        const playerOrbs = document.querySelector('.player-actions .action-orbs');
        
        if (playerCurrent) {
            playerCurrent.textContent = this.playerActions;
            
            // Animate the change
            playerCurrent.classList.remove('action-changed');
            void playerCurrent.offsetWidth; // Force reflow
            playerCurrent.classList.add('action-changed');
        }
        
        if (playerOrbs) {
            playerOrbs.innerHTML = this.createActionOrbs(this.playerActions, this.maxActions);
        }
    }

    // Export action data - SIMPLIFIED WITHOUT OPPONENT
    exportActionData() {
        return {
            playerActions: this.playerActions,
            maxActions: this.maxActions,
            timestamp: Date.now()
        };
    }

    // Import action data - SIMPLIFIED WITHOUT OPPONENT
    importActionData(actionData) {
        if (!actionData) return false;
        
        if (actionData.playerActions !== undefined) {
            this.playerActions = actionData.playerActions;
        }
        if (actionData.maxActions !== undefined) {
            this.maxActions = actionData.maxActions;
        }
        
        console.log('Action data imported:', this.exportActionData());
        return true;
    }

    // Reset to initial state
    reset() {
        this.playerActions = 1;
        this.maxActions = 1;
        console.log('ActionManager reset');
    }

    // Get action statistics - SIMPLIFIED WITHOUT OPPONENT
    getActionStats() {
        return {
            playerActions: this.playerActions,
            maxActions: this.maxActions,
            playerHasActions: this.playerActions > 0,
            playerActionsUsed: this.maxActions - this.playerActions
        };
    }

    // Log action state (for debugging) - SIMPLIFIED WITHOUT OPPONENT
    logActionState() {
        console.log('=== ACTION STATE ===');
        console.log('Player Actions:', this.playerActions, '/', this.maxActions);
        console.log('Player Has Actions:', this.hasActions());
        console.log('===================');
    }
}

// Create action error tooltip
function createActionErrorTooltip(message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'action-error-tooltip';
    tooltip.textContent = message;
    
    tooltip.style.cssText = `
        position: fixed;
        background: rgba(244, 67, 54, 0.95);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 10000;
        pointer-events: none;
        animation: actionErrorPulse 0.5s ease-out;
        border: 2px solid rgba(255, 255, 255, 0.3);
    `;
    
    return tooltip;
}

// Show action error at cursor position
window.showActionError = function(message, event) {
    // Remove any existing error tooltips
    const existingTooltips = document.querySelectorAll('.action-error-tooltip');
    existingTooltips.forEach(t => t.remove());
    
    const tooltip = createActionErrorTooltip(message);
    document.body.appendChild(tooltip);
    
    // Position at cursor
    const x = event.clientX;
    const y = event.clientY;
    
    // Adjust position to not go off screen
    const rect = tooltip.getBoundingClientRect();
    let finalX = x - rect.width / 2;
    let finalY = y - rect.height - 20; // Above cursor
    
    if (finalX < 10) finalX = 10;
    if (finalX + rect.width > window.innerWidth - 10) {
        finalX = window.innerWidth - rect.width - 10;
    }
    if (finalY < 10) {
        finalY = y + 20; // Below cursor if too high
    }
    
    tooltip.style.left = `${finalX}px`;
    tooltip.style.top = `${finalY}px`;
    
    // Remove after delay
    setTimeout(() => {
        tooltip.style.animation = 'actionErrorFadeOut 0.3s ease-out';
        setTimeout(() => tooltip.remove(), 300);
    }, 2000);
};

// Export for ES6 module compatibility
export default ActionManager;