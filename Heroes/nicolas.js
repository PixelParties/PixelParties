// nicolas.js - Nicolas Hero Effect Management System

export class NicolasEffectManager {
    constructor() {
        this.nicolasUsedThisTurn = false;
        this.nicolasEffectCost = 4; // Cost in gold
        
        console.log('NicolasEffectManager initialized');
    }

    // Check if Nicolas effect can be used
    canUseNicolasEffect(goldManager) {
        // Check if already used this turn
        if (this.nicolasUsedThisTurn) {
            return {
                canUse: false,
                reason: 'already_used',
                message: 'You can only use this effect once per turn!'
            };
        }

        // Check if player has enough gold
        const playerGold = goldManager.getPlayerGold();
        if (playerGold < this.nicolasEffectCost) {
            return {
                canUse: false,
                reason: 'insufficient_gold',
                message: "You can't afford to use this effect!"
            };
        }

        return {
            canUse: true,
            reason: null,
            message: null
        };
    }

    // Use Nicolas effect (deduct gold, add random potion, mark as used)
    async useNicolasEffect(heroSelection) {
        if (!heroSelection) {
            return false;
        }

        const goldManager = heroSelection.getGoldManager();
        const handManager = heroSelection.getHandManager();
        
        // Double-check we can use the effect
        const canUse = this.canUseNicolasEffect(goldManager);
        if (!canUse.canUse) {
            return false;
        }

        try {
            // Deduct gold
            const newGoldAmount = goldManager.getPlayerGold() - this.nicolasEffectCost;
            goldManager.setPlayerGold(newGoldAmount, 'nicolas_effect');

            // Get random potion
            const randomPotion = this.getRandomPotion();
            
            if (randomPotion) {
                // Add potion to hand
                const addedToHand = handManager.addCardToHand(randomPotion);
                
                if (addedToHand) {
                    // Mark as used this turn
                    this.nicolasUsedThisTurn = true;
                    
                    // Show success message
                    this.showNicolasEffectSuccess(randomPotion);
                    
                    // Update displays
                    heroSelection.updateHandDisplay();
                    heroSelection.updateGoldDisplay(); // This will also update Nicolas visual state
                    
                    // Save game state
                    await heroSelection.saveGameState();
                    
                    // Send update to opponent
                    if (heroSelection.gameDataSender) {
                        heroSelection.gameDataSender('nicolas_effect_used', {
                            goldSpent: this.nicolasEffectCost,
                            potionObtained: randomPotion,
                            timestamp: Date.now()
                        });
                    }
                    
                    console.log(`✨ Nicolas effect used: Paid ${this.nicolasEffectCost} gold for ${randomPotion}`);
                    return true;
                } else {
                    // Refund gold if couldn't add to hand (hand full, etc.)
                    goldManager.setPlayerGold(goldManager.getPlayerGold() + this.nicolasEffectCost, 'nicolas_refund');
                    this.showNicolasEffectError('Hand is full! Could not add potion.');
                    return false;
                }
            } else {
                // Refund gold if no potion found
                goldManager.setPlayerGold(goldManager.getPlayerGold() + this.nicolasEffectCost, 'nicolas_refund');
                this.showNicolasEffectError('No potions available!');
                return false;
            }
            
        } catch (error) {
            console.error('Error using Nicolas effect:', error);
            // Try to refund gold on error
            try {
                goldManager.setPlayerGold(goldManager.getPlayerGold() + this.nicolasEffectCost, 'nicolas_error_refund');
            } catch (refundError) {
                console.error('Error refunding gold:', refundError);
            }
            return false;
        }
    }

    // Get all potions from card database
    getAllPotions() {
        // Get all cards and filter for Potion type
        const allPotions = [];
        
        // List of known potion cards from the database
        const potionCards = [
            'BottledFlame',
            'PoisonVial', 
            'LifeSerum',
            'BottledLightning',
            'BoulderInABottle',
            'ExperimentalPotion',
            'MonsterInABottle',
            'PressedSkill',
            'ElixirOfImmortality',
            'ElixirOfStrength',
            'SwordInABottle'
        ];

        // Verify each potion exists in the database and get its info
        potionCards.forEach(potionName => {
            if (window.heroSelection && window.heroSelection.getCardInfo) {
                const cardInfo = window.heroSelection.getCardInfo(potionName);
                if (cardInfo && cardInfo.cardType === 'Potion') {
                    allPotions.push(potionName);
                }
            } else {
                // Fallback: assume all listed potions are valid
                allPotions.push(potionName);
            }
        });

        return allPotions;
    }

    // Get a random potion card name
    getRandomPotion() {
        const allPotions = this.getAllPotions();
        
        if (allPotions.length === 0) {
            console.error('No potions found in database!');
            return null;
        }

        const randomIndex = Math.floor(Math.random() * allPotions.length);
        return allPotions[randomIndex];
    }

    // Show Nicolas effect dialog
    showNicolasDialog(heroSelection, heroPosition) {
        const goldManager = heroSelection.getGoldManager();
        const canUse = this.canUseNicolasEffect(goldManager);

        if (!canUse.canUse) {
            // Show error message
            this.showNicolasEffectError(canUse.message);
            return;
        }

        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.id = 'nicolasEffectDialog';
        overlay.className = 'nicolas-effect-overlay';
        overlay.innerHTML = `
            <div class="nicolas-dialog-container">
                <div class="nicolas-dialog-content">
                    <div class="nicolas-dialog-header">
                        <div class="nicolas-icon">🧪</div>
                        <h3>Nicolas's Alchemy</h3>
                    </div>
                    <div class="nicolas-dialog-body">
                        <p>Pay <span class="gold-cost">4 Gold</span> to add a random <span class="potion-text">Potion</span> to your hand?</p>
                        <div class="current-gold">
                            <span class="gold-icon">🪙</span>
                            <span>Current Gold: ${goldManager.getPlayerGold()}</span>
                        </div>
                    </div>
                    <div class="nicolas-dialog-buttons">
                        <button class="nicolas-btn nicolas-btn-no" onclick="window.closeNicolasDialog()">
                            <span class="btn-icon">❌</span>
                            <span>No</span>
                        </button>
                        <button class="nicolas-btn nicolas-btn-yes" onclick="window.confirmNicolasEffect()">
                            <span class="btn-icon">✨</span>
                            <span>Yes</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles if not already present
        this.ensureNicolasDialogStyles();

        // Prevent body scrolling
        document.body.classList.add('nicolas-dialog-active');

        // Add to body
        document.body.appendChild(overlay);

        // Animate in
        overlay.style.animation = 'fadeIn 0.3s ease-out';

        // Store reference for the confirm handler
        overlay.dataset.heroPosition = heroPosition;

        // Set up global handlers
        window.closeNicolasDialog = () => {
            this.closeNicolasDialog();
        };

        window.confirmNicolasEffect = async () => {
            await this.confirmNicolasEffect(heroSelection);
        };
    }

    // Close Nicolas dialog
    closeNicolasDialog() {
        const overlay = document.getElementById('nicolasEffectDialog');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                overlay.remove();
                document.body.classList.remove('nicolas-dialog-active');
                
                // Clean up global handlers
                if (typeof window !== 'undefined') {
                    window.closeNicolasDialog = null;
                    window.confirmNicolasEffect = null;
                }
            }, 300);
        }
    }

    // Confirm Nicolas effect usage
    async confirmNicolasEffect(heroSelection) {
        // Close dialog first
        this.closeNicolasDialog();
        
        // Use the effect
        await this.useNicolasEffect(heroSelection);
    }

    // Show Nicolas effect success message
    showNicolasEffectSuccess(potionName) {
        const formattedPotionName = this.formatCardName(potionName);
        
        const successDiv = document.createElement('div');
        successDiv.className = 'nicolas-effect-success';
        successDiv.innerHTML = `
            <div class="success-content">
                <span class="success-icon">✨</span>
                <span class="success-text">Obtained ${formattedPotionName}!</span>
            </div>
        `;
        
        successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
            animation: nicolasSuccessBounce 0.6s ease-out;
            text-align: center;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'nicolasSuccessFade 0.4s ease-out forwards';
            setTimeout(() => successDiv.remove(), 400);
        }, 2000);
    }

    // Show Nicolas effect error message  
    showNicolasEffectError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'nicolas-effect-error';
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
            animation: nicolasErrorShake 0.5s ease-out;
            text-align: center;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'nicolasErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 1000); // Show for 1 second as requested
    }

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Ensure dialog styles are present
    ensureNicolasDialogStyles() {
        if (document.getElementById('nicolasDialogStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'nicolasDialogStyles';
        style.textContent = `
            .nicolas-effect-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            body.nicolas-dialog-active {
                overflow: hidden !important;
            }
            
            .nicolas-dialog-container {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 3px solid #667eea;
                border-radius: 20px;
                padding: 30px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
                position: relative;
            }
            
            .nicolas-dialog-header {
                text-align: center;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }
            
            .nicolas-icon {
                font-size: 32px;
                animation: nicolasIconFloat 3s ease-in-out infinite;
            }
            
            .nicolas-dialog-header h3 {
                margin: 0;
                font-size: 1.8rem;
                color: #667eea;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            }
            
            .nicolas-dialog-body {
                text-align: center;
                margin-bottom: 25px;
            }
            
            .nicolas-dialog-body p {
                font-size: 1.2rem;
                color: rgba(255, 255, 255, 0.9);
                margin: 0 0 15px 0;
                line-height: 1.4;
            }
            
            .gold-cost {
                color: #ffd700;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            .potion-text {
                color: #20c997;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            .current-gold {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.8);
                background: rgba(255, 215, 0, 0.1);
                border: 1px solid rgba(255, 215, 0, 0.3);
                border-radius: 8px;
                padding: 8px 16px;
                margin: 0 auto;
                max-width: 200px;
            }
            
            .current-gold .gold-icon {
                font-size: 18px;
                filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.6));
            }
            
            .nicolas-dialog-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            
            .nicolas-btn {
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
            
            .nicolas-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            }
            
            .nicolas-btn:active {
                transform: translateY(0);
            }
            
            .nicolas-btn-no {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            }
            
            .nicolas-btn-no:hover {
                background: linear-gradient(135deg, #e94560 0%, #d42c40 100%);
                box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
            }
            
            .nicolas-btn-yes {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            }
            
            .nicolas-btn-yes:hover {
                background: linear-gradient(135deg, #32cc52 0%, #26d9a8 100%);
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
            }
            
            .btn-icon {
                font-size: 18px;
            }
            
            /* Animations */
            @keyframes nicolasIconFloat {
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
            
            @keyframes nicolasSuccessBounce {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                60% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            
            @keyframes nicolasSuccessFade {
                from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }
            
            @keyframes nicolasErrorShake {
                0%, 100% { transform: translate(-50%, -50%); }
                25% { transform: translate(-52%, -50%); }
                75% { transform: translate(-48%, -50%); }
            }
            
            @keyframes nicolasErrorFade {
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

    // Reset Nicolas effect usage (called at start of new turn)
    resetForNewTurn() {
        this.nicolasUsedThisTurn = false;
        console.log('✨ Nicolas effect usage reset for new turn');
    }

    // Export Nicolas effect state for saving
    exportNicolasState() {
        return {
            nicolasUsedThisTurn: this.nicolasUsedThisTurn,
            timestamp: Date.now()
        };
    }

    // Import Nicolas effect state for loading
    importNicolasState(stateData) {
        if (!stateData || typeof stateData !== 'object') {
            console.error('Invalid Nicolas state data provided');
            return false;
        }

        if (typeof stateData.nicolasUsedThisTurn === 'boolean') {
            this.nicolasUsedThisTurn = stateData.nicolasUsedThisTurn;
            console.log(`✨ Nicolas effect state restored: used=${this.nicolasUsedThisTurn}`);
            return true;
        }

        return false;
    }

    // Reset all state (for new game)
    reset() {
        this.nicolasUsedThisTurn = false;
        console.log('✨ Nicolas effect manager reset for new game');
    }

    // Get current state for debugging
    getState() {
        return {
            nicolasUsedThisTurn: this.nicolasUsedThisTurn,
            nicolasEffectCost: this.nicolasEffectCost
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.NicolasEffectManager = NicolasEffectManager;
}

export default NicolasEffectManager;