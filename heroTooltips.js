// heroTooltips.js - Locked Tooltip Mode Enhancement

export class HeroTooltipManager {
    constructor() {
        this.lockedMode = false;
        this.activeTooltipElement = null;
        this.activeHeroPosition = null;
        this.tooltipHoverState = false;
        
        this.initializeKeyboardListener();
    }

    initializeKeyboardListener() {
        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', (event) => {
                // Only trigger on 't' key press, ignore if typing in input fields
                if (event.key.toLowerCase() === 't' && 
                    !event.target.matches('input, textarea, [contenteditable]')) {
                    this.toggleLockedMode();
                }
            });
        }
    }

    toggleLockedMode() {
        this.lockedMode = !this.lockedMode;
        
        console.log(`Tooltip locked mode: ${this.lockedMode ? 'ON' : 'OFF'}`);
        
        // Update any currently visible tooltip
        if (this.activeTooltipElement) {
            this.updateTooltipLockedState();
        }
        
        // Show brief feedback to user
        this.showModeToggleFeedback();
    }

    showModeToggleFeedback() {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = 'tooltip-mode-feedback';
        feedback.textContent = `Tooltip Lock: ${this.lockedMode ? 'ON' : 'OFF'}`;
        
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10001;
            animation: tooltipFeedbackFade 2s ease-out;
            pointer-events: none;
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            feedback.remove();
        }, 2000);
        
        // Add CSS animation if not already present
        if (!document.getElementById('tooltipFeedbackStyles')) {
            const style = document.createElement('style');
            style.id = 'tooltipFeedbackStyles';
            style.textContent = `
                @keyframes tooltipFeedbackFade {
                    0% { opacity: 0; transform: translateX(20px); }
                    20% { opacity: 1; transform: translateX(0); }
                    80% { opacity: 1; transform: translateX(0); }
                    100% { opacity: 0; transform: translateX(20px); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    isLockedMode() {
        return this.lockedMode;
    }

    // Called when a tooltip is created/updated
    enhanceTooltipForLockedMode(tooltipElement, heroPosition) {
        this.activeTooltipElement = tooltipElement;
        this.activeHeroPosition = heroPosition;
        this.tooltipHoverState = false;
        
        if (this.lockedMode) {
            this.addLockedModeFeatures(tooltipElement);
        }
    }

    addLockedModeFeatures(tooltipElement) {
        // Add padlock indicator
        this.addPadlockIndicator(tooltipElement);
        
        // Add hover listeners to tooltip itself
        this.addTooltipHoverListeners(tooltipElement);
    }

    addPadlockIndicator(tooltipElement) {
        // Check if padlock already exists
        let padlock = tooltipElement.querySelector('.tooltip-padlock');
        
        if (!padlock) {
            padlock = document.createElement('div');
            padlock.className = 'tooltip-padlock';
            padlock.innerHTML = '🔒';
            
            padlock.style.cssText = `
                position: absolute;
                top: 8px;
                left: 8px;
                font-size: 14px;
                background: rgba(0, 0, 0, 0.7);
                color: #ffd700;
                border-radius: 3px;
                padding: 2px 4px;
                z-index: 1;
                pointer-events: none;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
            `;
            
            // Insert at the beginning of tooltip content
            const container = tooltipElement.querySelector('.spellbook-tooltip-container');
            if (container) {
                container.style.position = 'relative';
                container.insertBefore(padlock, container.firstChild);
            }
        }
    }

    addTooltipHoverListeners(tooltipElement) {
        // Remove any existing listeners first
        this.removeTooltipHoverListeners(tooltipElement);
        
        // Add mouseenter listener
        tooltipElement._lockedModeMouseEnter = () => {
            this.tooltipHoverState = true;
            console.log('Tooltip hover: ENTER (locked mode)');
        };
        
        // Add mouseleave listener
        tooltipElement._lockedModeMouseLeave = () => {
            this.tooltipHoverState = false;
            console.log('Tooltip hover: LEAVE (locked mode)');
            
            // Check if we should hide tooltip
            this.checkTooltipHideConditions();
        };
        
        tooltipElement.addEventListener('mouseenter', tooltipElement._lockedModeMouseEnter);
        tooltipElement.addEventListener('mouseleave', tooltipElement._lockedModeMouseLeave);
    }

    removeTooltipHoverListeners(tooltipElement) {
        if (tooltipElement._lockedModeMouseEnter) {
            tooltipElement.removeEventListener('mouseenter', tooltipElement._lockedModeMouseEnter);
            delete tooltipElement._lockedModeMouseEnter;
        }
        
        if (tooltipElement._lockedModeMouseLeave) {
            tooltipElement.removeEventListener('mouseleave', tooltipElement._lockedModeMouseLeave);
            delete tooltipElement._lockedModeMouseLeave;
        }
    }

    // Called when hero hover ends
    handleHeroHoverLeave() {
        if (this.lockedMode && this.activeTooltipElement) {
            console.log('Hero hover: LEAVE (locked mode)');
            // Don't hide immediately, check conditions
            setTimeout(() => {
                this.checkTooltipHideConditions();
            }, 50); // Small delay to allow tooltip hover to register
        }
    }

    checkTooltipHideConditions() {
        if (!this.lockedMode || !this.activeTooltipElement) {
            return;
        }
        
        // In locked mode, only hide if neither hero nor tooltip is hovered
        const heroSelectionUI = window.heroSelection?.heroSelectionUI;
        const isHeroHovered = heroSelectionUI?.isHeroHovered || false;
        
        console.log('Checking hide conditions:', {
            isHeroHovered,
            tooltipHoverState: this.tooltipHoverState,
            lockedMode: this.lockedMode
        });
        
        // Hide only if both hero AND tooltip are not hovered
        if (!isHeroHovered && !this.tooltipHoverState) {
            console.log('Hiding tooltip - neither hero nor tooltip hovered');
            this.hideActiveTooltip();
        }
    }

    hideActiveTooltip() {
        if (this.activeTooltipElement && window.heroSelection?.heroSelectionUI) {
            // Clean up listeners
            this.removeTooltipHoverListeners(this.activeTooltipElement);
            
            // Hide using existing method
            window.heroSelection.heroSelectionUI.hideHeroSpellbookTooltip();
            
            // Reset state
            this.activeTooltipElement = null;
            this.activeHeroPosition = null;
            this.tooltipHoverState = false;
        }
    }

    updateTooltipLockedState() {
        if (this.activeTooltipElement) {
            if (this.lockedMode) {
                this.addLockedModeFeatures(this.activeTooltipElement);
            } else {
                // Remove locked mode features
                this.removePadlockIndicator(this.activeTooltipElement);
                this.removeTooltipHoverListeners(this.activeTooltipElement);
            }
        }
    }

    removePadlockIndicator(tooltipElement) {
        const padlock = tooltipElement.querySelector('.tooltip-padlock');
        if (padlock) {
            padlock.remove();
        }
    }

    // Clean up when tooltip is hidden
    cleanup() {
        if (this.activeTooltipElement) {
            this.removeTooltipHoverListeners(this.activeTooltipElement);
        }
        this.activeTooltipElement = null;
        this.activeHeroPosition = null;
        this.tooltipHoverState = false;
    }
}

// Create global instance
const heroTooltipManager = new HeroTooltipManager();

// Expose to window for global access
if (typeof window !== 'undefined') {
    window.heroTooltipManager = heroTooltipManager;
}

export default heroTooltipManager;