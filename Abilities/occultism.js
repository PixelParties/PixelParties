// ./Abilities/occultism.js - Occultism Ability Implementation

export class OccultismAbility {
    constructor() {
        this.abilityName = 'Occultism';
        this.hpBonusPerLevel = 20;
        this.attackBonusPerLevel = 5;
        
        // Sacrifice mode state
        this.sacrificeMode = {
            active: false,
            heroPosition: null,
            abilityLevel: 0,
            hpBonus: 0,
            attackBonus: 0
        };
    }

    // Handle click on Occultism ability
    handleClick(heroPosition, abilityLevel) {        
        // Get managers from heroSelection
        if (!window.heroSelection) {
            console.error('HeroSelection not available');
            return;
        }

        const heroCreatureManager = window.heroSelection.getHeroCreatureManager();

        if (!heroCreatureManager) {
            console.error('Required managers not available');
            return;
        }

        // Check if already used this turn
        if (this.usageThisTurn[heroPosition]) {
            this.showError("Occultism can only be used once per turn!");
            return;
        }

        // Check if any hero has creatures
        const hasAnyCreatures = this.checkForAnyCreatures();
        if (!hasAnyCreatures) {
            this.showError("You have no Creatures you could sacrifice!");
            return;
        }

        // Calculate bonuses
        const hpBonus = abilityLevel * this.hpBonusPerLevel;
        const attackBonus = abilityLevel * this.attackBonusPerLevel;

        // Enter sacrifice mode
        this.enterSacrificeMode(heroPosition, abilityLevel, hpBonus, attackBonus);

        // Update UI
        if (window.heroSelection) {
            window.heroSelection.saveGameState();
        }
    }

    // Check if any hero has creatures
    checkForAnyCreatures() {
        if (!window.heroSelection || !window.heroSelection.heroCreatureManager) {
            return false;
        }

        const heroCreatureManager = window.heroSelection.heroCreatureManager;
        
        // Check all positions for creatures
        const positions = ['left', 'center', 'right'];
        for (const position of positions) {
            const creatures = heroCreatureManager.getHeroCreatures(position);
            if (creatures && creatures.length > 0) {
                return true;
            }
        }
        
        return false;
    }

    // Enter sacrifice mode
    enterSacrificeMode(heroPosition, abilityLevel, hpBonus, attackBonus) {
        // Set sacrifice mode state
        this.sacrificeMode = {
            active: true,
            heroPosition: heroPosition,
            abilityLevel: abilityLevel,
            hpBonus: hpBonus,
            attackBonus: attackBonus
        };

        // Add body class for CSS styling
        document.body.classList.add('occultism-sacrifice-mode');

        // Show sacrifice prompt
        this.showSacrificePrompt(hpBonus, attackBonus);

        // Add escape key listener
        this.addEscapeKeyListener();

        // Highlight creatures and disable hand/battle button
        this.updateUIForSacrificeMode(true);
    }

    // Exit sacrifice mode
    exitSacrificeMode() {
        // Clear sacrifice mode state
        this.sacrificeMode.active = false;

        // Remove body class
        document.body.classList.remove('occultism-sacrifice-mode');

        // Hide sacrifice prompt
        this.hideSacrificePrompt();

        // Remove escape key listener
        this.removeEscapeKeyListener();

        // Restore normal UI
        this.updateUIForSacrificeMode(false);
    }

    // Show sacrifice selection prompt
    showSacrificePrompt(hpBonus, attackBonus) {
        // Remove any existing prompt
        const existingPrompt = document.getElementById('occultismSacrificePrompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }

        // Create prompt overlay
        const prompt = document.createElement('div');
        prompt.id = 'occultismSacrificePrompt';
        prompt.className = 'occultism-sacrifice-prompt';
        
        prompt.innerHTML = `
            <div class="occultism-prompt-content">
                <div class="occultism-prompt-header">
                    <span class="occultism-icon">🔮</span>
                    <h3>Occultism</h3>
                </div>
                <div class="occultism-prompt-message">
                    Select a Creature to sacrifice for ${hpBonus} max HP and ${attackBonus} attack!
                </div>
                <div class="occultism-prompt-actions">
                    <button class="occultism-cancel-btn" onclick="window.occultismAbility.handleCancel()">
                        <span class="btn-icon">✗</span> Cancel
                    </button>
                </div>
            </div>
        `;

        // Add styles
        prompt.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%);
            color: white;
            padding: 0;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(74, 20, 140, 0.5);
            z-index: 9999;
            animation: occultismPromptSlideIn 0.4s ease-out;
            border: 2px solid rgba(255, 255, 255, 0.2);
            max-width: 500px;
            min-width: 400px;
        `;

        document.body.appendChild(prompt);
    }

    // Hide sacrifice prompt
    hideSacrificePrompt() {
        const prompt = document.getElementById('occultismSacrificePrompt');
        if (prompt) {
            prompt.style.animation = 'occultismPromptSlideOut 0.3s ease-out';
            setTimeout(() => prompt.remove(), 300);
        }
    }

    // Update UI for sacrifice mode
    updateUIForSacrificeMode(enabled) {
        if (enabled) {
            // Disable hand
            document.body.classList.add('occultism-hand-disabled');
            
            // Disable "To Battle!" button
            const toBattleBtn = document.querySelector('.to-battle-button');
            if (toBattleBtn) {
                toBattleBtn.classList.add('occultism-disabled');
                toBattleBtn.disabled = true;
            }

            // Highlight creatures
            this.highlightCreatures(true);
        } else {
            // Re-enable hand
            document.body.classList.remove('occultism-hand-disabled');
            
            // Re-enable "To Battle!" button
            const toBattleBtn = document.querySelector('.to-battle-button');
            if (toBattleBtn) {
                toBattleBtn.classList.remove('occultism-disabled');
                toBattleBtn.disabled = false;
            }

            // Remove creature highlights
            this.highlightCreatures(false);
        }
    }

    // Highlight creatures for selection
    highlightCreatures(enabled) {
        const creatureIcons = document.querySelectorAll('.creature-icon');
        
        creatureIcons.forEach(creatureIcon => {
            if (enabled) {
                creatureIcon.classList.add('occultism-selectable');
                
                // Add click handler if not already present
                if (!creatureIcon.hasAttribute('data-occultism-handler')) {
                    creatureIcon.setAttribute('data-occultism-handler', 'true');
                    
                    const clickHandler = (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        this.handleCreatureSacrifice(creatureIcon);
                    };
                    
                    creatureIcon.addEventListener('click', clickHandler);
                    creatureIcon._occultismClickHandler = clickHandler;
                }
            } else {
                creatureIcon.classList.remove('occultism-selectable');
                
                // Remove click handler
                if (creatureIcon._occultismClickHandler) {
                    creatureIcon.removeEventListener('click', creatureIcon._occultismClickHandler);
                    delete creatureIcon._occultismClickHandler;
                    creatureIcon.removeAttribute('data-occultism-handler');
                }
            }
        });
    }

    // Handle creature sacrifice
    async handleCreatureSacrifice(creatureElement) {
        if (!this.sacrificeMode.active) return;

        // Get creature data from element
        const heroContainer = creatureElement.closest('.hero-creatures');
        const heroPosition = heroContainer?.getAttribute('data-hero-position');
        const creatureIndexAttr = creatureElement.getAttribute('data-creature-index');
        const creatureIndex = parseInt(creatureIndexAttr, 10);

        // Enhanced validation
        if (!heroPosition || creatureIndexAttr === null || creatureIndexAttr === undefined || isNaN(creatureIndex) || creatureIndex < 0) {
            console.error('Invalid creature data for sacrifice');
            return;
        }

        const heroCreatureManager = window.heroSelection.heroCreatureManager;
        const formationManager = window.heroSelection.formationManager;

        // Get and validate creatures array
        const creatures = heroCreatureManager.getHeroCreatures(heroPosition);
        
        if (creatureIndex >= creatures.length) {
            console.error('Creature index out of bounds');
            return;
        }
        
        const sacrificedCreature = creatures[creatureIndex];
        
        if (!sacrificedCreature) {
            console.error('Creature not found for sacrifice');
            return;
        }

        // Sacrifice the creature (this will trigger GraveWorm events and other sacrifice effects)
        const removedCreature = heroCreatureManager.sacrificeCreature(heroPosition, creatureIndex, 'Occultism');

        if (!removedCreature) {
            console.error('Failed to sacrifice creature');
            return;
        }

        // Add the sacrificed creature to the graveyard
        if (window.heroSelection && window.heroSelection.graveyardManager) {
            window.heroSelection.graveyardManager.addCard(removedCreature.name);
        }

        // Apply permanent stat bonuses to the Occultism user
        const occultismHeroPosition = this.sacrificeMode.heroPosition;
        const formation = formationManager.getBattleFormation();
        const occultismHero = formation[occultismHeroPosition];

        if (occultismHero) {
            // Add permanent stat bonuses
            if (!occultismHero.attackBonusses) occultismHero.attackBonusses = 0;
            if (!occultismHero.hpBonusses) occultismHero.hpBonusses = 0;
            
            occultismHero.attackBonusses += this.sacrificeMode.attackBonus;
            occultismHero.hpBonusses += this.sacrificeMode.hpBonus;
            
            // Mark as used this turn ONLY after successful sacrifice
            this.usageThisTurn[occultismHeroPosition] = true;
        }

        if (window.heroSelection) {
            try {
                await window.heroSelection.saveGameState();
            } catch (error) {
                console.error('Failed to sync Occultism sacrifice:', error);
            }
        }

        // Show sacrifice success feedback
        this.showSacrificeSuccess(removedCreature.name, this.sacrificeMode.hpBonus, this.sacrificeMode.attackBonus);

        // Exit sacrifice mode
        this.exitSacrificeMode();
        await window.heroSelection.sendFormationUpdate();
    }

    // Handle cancel button or escape key
    handleCancel() {
        if (!this.sacrificeMode.active) return;

        // Exit sacrifice mode without effects
        this.exitSacrificeMode();

        // Show cancel feedback
        this.showCancelFeedback();
    }

    // Add escape key listener
    addEscapeKeyListener() {
        this.escapeKeyHandler = (event) => {
            if (event.key === 'Escape' && this.sacrificeMode.active) {
                event.preventDefault();
                event.stopPropagation();
                this.handleCancel();
            }
        };

        document.addEventListener('keydown', this.escapeKeyHandler);
    }

    // Remove escape key listener
    removeEscapeKeyListener() {
        if (this.escapeKeyHandler) {
            document.removeEventListener('keydown', this.escapeKeyHandler);
            this.escapeKeyHandler = null;
        }
    }

    // Show error message
    showError(message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'occultism-error-tooltip';
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
            animation: occultismErrorShake 0.5s ease-out;
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => {
            tooltip.style.animation = 'occultismErrorFadeOut 0.3s ease-out';
            setTimeout(() => tooltip.remove(), 300);
        }, 2000);
    }

    // Show sacrifice success feedback
    showSacrificeSuccess(creatureName, hpBonus, attackBonus) {
        const feedback = document.createElement('div');
        feedback.className = 'occultism-success';
        feedback.innerHTML = `
            <span class="success-icon">🔮</span>
            <span class="success-text">Sacrificed ${this.formatCreatureName(creatureName)} for +${hpBonus} HP and +${attackBonus} ATK!</span>
        `;
        
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%);
            color: white;
            padding: 20px 32px;
            border-radius: 12px;
            font-weight: bold;
            font-size: 20px;
            box-shadow: 0 6px 24px rgba(74, 20, 140, 0.4);
            z-index: 10001;
            animation: occultismSuccessBounce 0.6s ease-out;
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 500px;
            text-align: center;
        `;

        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.style.animation = 'occultismSuccessFadeOut 0.4s ease-out';
            setTimeout(() => feedback.remove(), 400);
        }, 3000);
    }

    // Show cancel feedback
    showCancelFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'occultism-cancel';
        feedback.innerHTML = `
            <span class="cancel-icon">✗</span>
            <span class="cancel-text">Occultism cancelled</span>
        `;
        
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(108, 117, 125, 0.95);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            animation: occultismCancelFade 0.4s ease-out;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        document.body.appendChild(feedback);

        setTimeout(() => feedback.remove(), 1000);
    }

    // Format creature name for display
    formatCreatureName(creatureName) {
        return creatureName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Reset turn-based tracking (called by heroAbilitiesManager)
    resetTurnBasedTracking() {
        this.usageThisTurn = {
            left: false,
            center: false,
            right: false
        };

        // Also exit sacrifice mode if still active (safety measure)
        if (this.sacrificeMode.active) {
            this.exitSacrificeMode();
        }
    }

    // Export state for saving
    exportState() {
        return {
            usageThisTurn: { ...this.usageThisTurn },
            sacrificeMode: { ...this.sacrificeMode }
        };
    }

    // Import state for loading
    importState(state) {
        if (!state) return false;

        if (state.usageThisTurn) {
            this.usageThisTurn = { ...state.usageThisTurn };
        }

        if (state.sacrificeMode) {
            // Don't restore active sacrifice mode on reconnection for simplicity
            this.sacrificeMode = {
                active: false,
                heroPosition: null,
                abilityLevel: 0,
                hpBonus: 0,
                attackBonus: 0
            };
        }

        return true;
    }

    // Helper method to get hero name from position
    getHeroNameFromPosition(position) {
        if (!window.heroSelection?.formationManager) {
            return null;
        }
        
        const formation = window.heroSelection.formationManager.getBattleFormation();
        const hero = formation[position];
        return hero ? hero.name : null;
    }

    // Reset for new game
    reset() {
        this.usageThisTurn = {
            left: false,
            center: false,
            right: false
        };

        // Exit sacrifice mode if active
        if (this.sacrificeMode.active) {
            this.exitSacrificeMode();
        }

        this.sacrificeMode = {
            active: false,
            heroPosition: null,
            abilityLevel: 0,
            hpBonus: 0,
            attackBonus: 0
        };
    }
}

// Create and export singleton instance
export const occultismAbility = new OccultismAbility();

// Add required CSS animations and styles
if (typeof document !== 'undefined' && !document.getElementById('occultismStyles')) {
    const style = document.createElement('style');
    style.id = 'occultismStyles';
    style.textContent = `
        /* Occultism Error Animations */
        @keyframes occultismErrorShake {
            0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
            25% { transform: translate(-50%, -50%) rotate(-2deg); }
            75% { transform: translate(-50%, -50%) rotate(2deg); }
        }
        
        @keyframes occultismErrorFadeOut {
            to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
        
        /* Occultism Success Animations */
        @keyframes occultismSuccessBounce {
            0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        
        @keyframes occultismSuccessFadeOut {
            to { 
                opacity: 0; 
                transform: translate(-50%, -50%) translateY(-20px) scale(0.9); 
            }
        }
        
        /* Occultism Cancel Animation */
        @keyframes occultismCancelFade {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        
        /* Occultism Prompt Animations */
        @keyframes occultismPromptSlideIn {
            from { 
                transform: translateX(-50%) translateY(-100px); 
                opacity: 0;
            }
            to { 
                transform: translateX(-50%) translateY(0); 
                opacity: 1;
            }
        }
        
        @keyframes occultismPromptSlideOut {
            from { 
                transform: translateX(-50%) translateY(0); 
                opacity: 1;
            }
            to { 
                transform: translateX(-50%) translateY(-100px); 
                opacity: 0;
            }
        }
        
        /* Occultism Prompt Styles */
        .occultism-prompt-content {
            text-align: center;
        }
        
        .occultism-prompt-header {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        
        .occultism-prompt-header h3 {
            margin: 0;
            color: white;
            font-size: 24px;
        }
        
        .occultism-icon {
            font-size: 32px;
        }
        
        .occultism-prompt-message {
            padding: 24px;
            font-size: 18px;
            color: #f8f9fa;
            line-height: 1.4;
        }
        
        .occultism-prompt-actions {
            padding: 0 24px 24px 24px;
        }
        
        .occultism-cancel-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .occultism-cancel-btn:hover {
            background: #c82333;
            transform: translateY(-2px);
        }
        
        /* Hand disabling during sacrifice mode */
        .occultism-hand-disabled .hand-container {
            opacity: 0.4;
            filter: grayscale(60%);
            pointer-events: none;
        }
        
        .occultism-hand-disabled .hand-container::before {
            content: "Occultism Mode Active";
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10;
        }
        
        /* Button disabling during sacrifice mode */
        .to-battle-button.occultism-disabled {
            opacity: 0.4;
            filter: grayscale(60%);
            cursor: not-allowed;
        }
        
        /* Creature highlighting during sacrifice mode */
        .creature-icon.occultism-selectable {
            cursor: pointer;
            animation: occultismCreaturePulse 2s ease-in-out infinite;
            border: 3px solid #7B1FA2;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(123, 31, 162, 0.6);
            transform: scale(1.05);
        }
        
        .creature-icon.occultism-selectable:hover {
            animation: occultismCreatureHover 0.3s ease-out;
            border-color: #4A148C;
            box-shadow: 0 0 30px rgba(74, 20, 140, 0.8);
            transform: scale(1.1);
        }
        
        @keyframes occultismCreaturePulse {
            0%, 100% { 
                box-shadow: 0 0 20px rgba(123, 31, 162, 0.6);
            }
            50% { 
                box-shadow: 0 0 30px rgba(123, 31, 162, 0.9);
            }
        }
        
        @keyframes occultismCreatureHover {
            0% { transform: scale(1.05); }
            50% { transform: scale(1.15); }
            100% { transform: scale(1.1); }
        }
        
        /* Success feedback styles */
        .occultism-success .success-icon {
            font-size: 28px;
        }
        
        .occultism-cancel .cancel-icon {
            font-size: 20px;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.occultismAbility = occultismAbility;
}