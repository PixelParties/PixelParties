// actionManager.js - Action Economy Management Module (Team Building Phase Only)

export class ActionManager {
    constructor() {
        this.playerActions = 1;
        this.maxActions = 1;
        this.baseDivinityBonus = 0; // Track the Divinity bonus separately
        this.onActionChangeCallback = null;
    }

    // Initialize with callback
    init(onActionChangeCallback = null) {
        this.onActionChangeCallback = onActionChangeCallback;
        this.resetActions();
    }

    // Calculate Divinity bonuses similar to how Alchemy bonuses work
    updateDivinityBonuses(heroSelection) {
        if (!heroSelection || !heroSelection.heroAbilitiesManager || !heroSelection.formationManager) {
            return;
        }

        let totalDivinityCount = 0;
        const formation = heroSelection.formationManager.getBattleFormation();
        
        // Count Divinity abilities across all hero positions
        ['left', 'center', 'right'].forEach(position => {
            if (formation[position]) { // Only count if there's a hero in this position
                const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
                
                if (heroAbilities) {
                    ['zone1', 'zone2', 'zone3'].forEach(zone => {
                        if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                            heroAbilities[zone].forEach(ability => {
                                if (ability && ability.name === 'Divinity') {
                                    totalDivinityCount++;
                                }
                            });
                        }
                    });
                }
            }
        });

        // Update the Divinity bonus and max actions
        const oldMaxActions = this.maxActions;
        const oldPlayerActions = this.playerActions;
        
        this.baseDivinityBonus = totalDivinityCount;
        this.maxActions = 1 + this.baseDivinityBonus; // Base 1 + Divinity count
        
        // If we gained max actions, also increase current actions proportionally
        if (this.maxActions > oldMaxActions) {
            const actionIncrease = this.maxActions - oldMaxActions;
            this.playerActions += actionIncrease;
        } else if (this.maxActions < oldMaxActions && this.playerActions > this.maxActions) {
            // If we lost max actions and current exceeds new max, cap it
            this.playerActions = this.maxActions;
        }

        // Notify of changes if values actually changed
        if (oldPlayerActions !== this.playerActions || oldMaxActions !== this.maxActions) {
            this.notifyActionChange({
                player: true,
                oldValue: oldPlayerActions,
                newValue: this.playerActions,
                maxActions: this.maxActions,
                divinityUpdate: true,
                divinityCount: totalDivinityCount
            });
        }
    }

    // Get current Divinity bonus
    getDivinityBonus() {
        return this.baseDivinityBonus;
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
                
        this.notifyActionChange({
            player: true,
            oldValue: oldActions,
            newValue: this.playerActions,
            maxActions: this.maxActions
        });
    }

    // Reset actions at turn start - now preserves Divinity bonuses
    resetActions() {
        const oldPlayerActions = this.playerActions;
        
        this.playerActions = this.maxActions; // Reset to current max (including Divinity bonuses)
                
        this.notifyActionChange({
            player: true,
            oldValue: oldPlayerActions,
            newValue: this.playerActions,
            maxActions: this.maxActions,
            reset: true
        });
    }

    // Notify listeners of action changes
    notifyActionChange(changeData) {
        if (this.onActionChangeCallback) {
            this.onActionChangeCallback(changeData);
        }
    }

    // Create action display HTML - Enhanced to show Divinity bonus (orbs only)
    createActionDisplay() {
        const divinityBonusText = this.baseDivinityBonus > 0 ? 
            `<div class="action-bonus-text">+${this.baseDivinityBonus} from Divinity</div>` : '';
        
        return `
            <div class="action-display-container compact">
                <div class="action-display player-actions ${this.baseDivinityBonus > 0 ? 'has-divinity-bonus' : ''}"
                    onmouseenter="window.showActionTooltip(this, ${this.playerActions}, ${this.maxActions})"
                    onmouseleave="window.hideActionTooltip()">
                    ${divinityBonusText}
                    <div class="action-orbs">
                        ${this.createActionOrbs(this.playerActions, this.maxActions)}
                    </div>
                </div>
            </div>
        `;
    }

    // Create visual action orbs - Enhanced to show base vs bonus actions
    createActionOrbs(current, max) {
        let orbsHTML = '';
        for (let i = 0; i < max; i++) {
            const filled = i < current;
            const isBonus = i >= 1; // Actions beyond the first are from Divinity
            orbsHTML += `<div class="action-orb ${filled ? 'filled' : 'empty'} ${isBonus ? 'bonus' : 'base'}"></div>`;
        }
        return orbsHTML;
    }

    // Update action display
    updateActionDisplay() {
        const playerOrbs = document.querySelector('.player-actions .action-orbs');
        
        if (playerOrbs) {
            playerOrbs.innerHTML = this.createActionOrbs(this.playerActions, this.maxActions);
            
            // Update the parent action display with new hover data
            const actionDisplay = document.querySelector('.action-display.player-actions');
            if (actionDisplay) {
                actionDisplay.setAttribute('onmouseenter', 
                    `window.showActionTooltip(this, ${this.playerActions}, ${this.maxActions})`);
            }
            
            // Add animation to the orbs container to indicate change
            playerOrbs.classList.remove('action-orbs-changed');
            void playerOrbs.offsetWidth; // Force reflow
            playerOrbs.classList.add('action-orbs-changed');
        }
    }

    // Export action data - Now includes Divinity data
    exportActionData() {
        return {
            playerActions: this.playerActions,
            maxActions: this.maxActions,
            baseDivinityBonus: this.baseDivinityBonus,
            timestamp: Date.now()
        };
    }

    // Import action data - Now includes Divinity data
    importActionData(actionData) {
        if (!actionData) return false;
        
        if (actionData.playerActions !== undefined) {
            this.playerActions = actionData.playerActions;
        }
        if (actionData.maxActions !== undefined) {
            this.maxActions = actionData.maxActions;
        }
        if (actionData.baseDivinityBonus !== undefined) {
            this.baseDivinityBonus = actionData.baseDivinityBonus;
        }
        return true;
    }

    // Reset to initial state
    reset() {
        this.playerActions = 1;
        this.maxActions = 1;
        this.baseDivinityBonus = 0;
    }

    // Get action statistics - Enhanced with Divinity info
    getActionStats() {
        return {
            playerActions: this.playerActions,
            maxActions: this.maxActions,
            baseDivinityBonus: this.baseDivinityBonus,
            playerHasActions: this.playerActions > 0,
            playerActionsUsed: this.maxActions - this.playerActions
        };
    }
}

// Create action error tooltip - Updated to use CSS classes
function createActionErrorTooltip(message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'action-error-tooltip';
    tooltip.textContent = message;
    
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
        tooltip.classList.add('fade-out');
        setTimeout(() => tooltip.remove(), 300);
    }, 2000);
};

window.showActionTooltip = function(element, currentActions, maxActions) {
    // Remove any existing action tooltip
    window.hideActionTooltip();
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'actionTooltip';
    tooltip.className = 'action-tooltip';
    tooltip.textContent = `Actions: ${currentActions}/${maxActions}`;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip above the action display
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 10;
    
    // Adjust if going off screen
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top < 10) {
        // Show below instead
        top = rect.bottom + 10;
        tooltip.classList.add('below');
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    
    // Add fade in animation
    requestAnimationFrame(() => {
        tooltip.classList.add('visible');
    });
};

window.hideActionTooltip = function() {
    const tooltip = document.getElementById('actionTooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
        setTimeout(() => {
            tooltip.remove();
        }, 200);
    }
};

// Export for ES6 module compatibility
export default ActionManager;