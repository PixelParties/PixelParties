// Heroes/semi.js - Semi Effect Manager for Gold-based Spell Learning

export class SemiEffectManager {
    constructor() {
        console.log('SemiEffectManager initialized');
    }

    // Check if a hero can use Semi's special gold-based learning
    canUseSemiGoldLearning(heroSelection, heroPosition, spellCardName) {
        // Get hero data
        const formation = heroSelection.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        
        // Must be Semi
        if (!hero || hero.name !== 'Semi') {
            return { canUse: false, reason: 'Not Semi' };
        }
        
        // Get spell info
        const spellInfo = heroSelection.getCardInfo(spellCardName);
        if (!spellInfo || spellInfo.cardType !== 'Spell') {
            return { canUse: false, reason: 'Invalid spell' };
        }
        
        // EXCLUDE CREATURES: Semi's gold learning only works for spellbook spells, not creatures
        if (heroSelection.heroCreatureManager && heroSelection.heroCreatureManager.isCreatureSpell(spellCardName)) {
            return { canUse: false, reason: 'Cannot use gold learning for creatures' };
        }
        
        const spellSchool = spellInfo.spellSchool;
        const spellLevel = spellInfo.level || 0;
        
        // Get Semi's current ability level for this spell school
        const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(heroPosition);
        let totalSpellSchoolLevel = 0;
        
        ['zone1', 'zone2', 'zone3'].forEach(zone => {
            if (heroAbilities && heroAbilities[zone]) {
                heroAbilities[zone].forEach(ability => {
                    if (ability && ability.name === spellSchool) {
                        totalSpellSchoolLevel++;
                    }
                });
            }
        });
        
        // Check if Semi needs to pay (ability level < spell level)
        if (totalSpellSchoolLevel >= spellLevel) {
            return { canUse: false, reason: 'Already has required level' };
        }
        
        // Calculate gold cost
        const levelDifference = spellLevel - totalSpellSchoolLevel;
        const goldCost = levelDifference * 10;
        
        // Check if player has enough gold
        const playerGold = heroSelection.goldManager.getPlayerGold();
        if (playerGold < goldCost) {
            return { 
                canUse: false, 
                reason: `Need ${goldCost} Gold (have ${playerGold})`,
                goldCost: goldCost,
                playerGold: playerGold,
                shortfall: goldCost - playerGold
            };
        }
        
        return {
            canUse: true,
            spellName: spellInfo.name,
            spellSchool: spellSchool,
            spellLevel: spellLevel,
            heroAbilityLevel: totalSpellSchoolLevel,
            levelDifference: levelDifference,
            goldCost: goldCost,
            playerGold: playerGold
        };
    }

    // Show Semi's gold learning dialog
    showSemiGoldLearningDialog(heroSelection, heroPosition, spellCardName, cardIndex) {
        const checkResult = this.canUseSemiGoldLearning(heroSelection, heroPosition, spellCardName);
        
        if (!checkResult.canUse) {
            console.log('Cannot use Semi gold learning:', checkResult.reason);
            return false;
        }
        
        const { spellName, goldCost } = checkResult;
        const formattedSpellName = heroSelection.formatCardName(spellName);
        
        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'semi-gold-dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-out;
        `;
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'semi-gold-dialog';
        dialog.style.cssText = `
            background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            text-align: center;
            min-width: 320px;
            max-width: 400px;
            animation: dialogSlideIn 0.4s ease-out;
        `;
        
        dialog.innerHTML = `
            <div class="semi-dialog-header">
                <div class="semi-icon">💰</div>
                <h3 style="margin: 8px 0; font-size: 18px;">Semi's Special Learning</h3>
            </div>
            
            <div class="semi-dialog-content" style="margin: 16px 0;">
                <p style="margin: 8px 0; font-size: 16px;">
                    Pay <strong>${goldCost} Gold</strong> to teach Semi<br>
                    <strong>${formattedSpellName}</strong>?
                </p>
                <div style="font-size: 14px; opacity: 0.8; margin-top: 8px;">
                    Current Gold: ${checkResult.playerGold}
                </div>
            </div>
            
            <div class="semi-dialog-buttons" style="display: flex; gap: 12px; justify-content: center;">
                <button class="semi-dialog-btn semi-no-btn" style="
                    background: rgba(220, 53, 69, 0.8);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">No</button>
                <button class="semi-dialog-btn semi-yes-btn" style="
                    background: rgba(40, 167, 69, 0.8);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">Yes</button>
            </div>
        `;
        
        // Add hover effects
        const noBtn = dialog.querySelector('.semi-no-btn');
        const yesBtn = dialog.querySelector('.semi-yes-btn');
        
        noBtn.addEventListener('mouseenter', () => {
            noBtn.style.background = 'rgba(220, 53, 69, 1)';
            noBtn.style.transform = 'scale(1.05)';
        });
        noBtn.addEventListener('mouseleave', () => {
            noBtn.style.background = 'rgba(220, 53, 69, 0.8)';
            noBtn.style.transform = 'scale(1)';
        });
        
        yesBtn.addEventListener('mouseenter', () => {
            yesBtn.style.background = 'rgba(40, 167, 69, 1)';
            yesBtn.style.transform = 'scale(1.05)';
        });
        yesBtn.addEventListener('mouseleave', () => {
            yesBtn.style.background = 'rgba(40, 167, 69, 0.8)';
            yesBtn.style.transform = 'scale(1)';
        });
        
        // Handle button clicks
        noBtn.addEventListener('click', () => {
            this.closeSemiDialog(overlay);
        });
        
        yesBtn.addEventListener('click', async () => {
            await this.handleSemiGoldPayment(heroSelection, heroPosition, spellCardName, cardIndex, goldCost, overlay);
        });
        
        // Handle clicking outside dialog
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeSemiDialog(overlay);
            }
        });
        
        // Handle Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeSemiDialog(overlay);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        return true;
    }

    // Handle Semi's gold payment and spell learning
    async handleSemiGoldPayment(heroSelection, heroPosition, spellCardName, cardIndex, goldCost, dialogOverlay) {
        try {
            // Double-check we can still do this (gold might have changed)
            const checkResult = this.canUseSemiGoldLearning(heroSelection, heroPosition, spellCardName);
            if (!checkResult.canUse) {
                console.error('Cannot proceed with Semi gold learning:', checkResult.reason);
                this.closeSemiDialog(dialogOverlay);
                return false;
            }
            
            // NEW: Check if spell requires action and if player has actions
            const cardInfo = heroSelection.getCardInfo(spellCardName);
            if (cardInfo && cardInfo.action) {
                const actionCheck = heroSelection.actionManager.canPlayActionCard(cardInfo);
                if (!actionCheck.canPlay) {
                    console.error('Cannot use Semi gold learning: no actions available');
                    this.closeSemiDialog(dialogOverlay);
                    
                    // Show action error feedback
                    const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
                    if (teamSlot) {
                        this.showActionErrorFeedback(teamSlot, actionCheck.reason);
                    }
                    
                    return false;
                }
            }
            
            // Deduct gold
            const currentGold = heroSelection.goldManager.getPlayerGold();
            heroSelection.goldManager.setPlayerGold(currentGold - goldCost, 'semi_spell_learning');
            
            console.log(`💰 Semi paid ${goldCost} Gold to learn ${spellCardName}`);
            
            // Add spell to Semi's spellbook
            const success = heroSelection.heroSpellbookManager.addSpellToHero(heroPosition, spellCardName);
            
            if (success) {
                // NEW: Consume action if the spell requires one
                if (cardInfo && cardInfo.action) {
                    heroSelection.actionManager.consumeAction();
                    console.log('⚡ Action consumed for Semi\'s gold learning');
                }
                
                // Remove spell from hand
                heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
                
                // Show success feedback
                this.showSemiSuccessFeedback(heroPosition, spellCardName, goldCost);
                
                // Update UI
                heroSelection.updateHandDisplay();
                heroSelection.updateGoldDisplay();
                heroSelection.updateActionDisplay(); // NEW: Update action display
                await heroSelection.saveGameState();
                await heroSelection.sendFormationUpdate();
                
                console.log(`✅ Semi successfully learned ${spellCardName} for ${goldCost} Gold`);
                
                this.closeSemiDialog(dialogOverlay);
                return true;
            } else {
                // Failed to add spell - refund gold
                heroSelection.goldManager.setPlayerGold(currentGold, 'semi_spell_learning_refund');
                console.error('Failed to add spell to Semi - gold refunded');
                this.closeSemiDialog(dialogOverlay);
                return false;
            }
            
        } catch (error) {
            console.error('Error in Semi gold payment:', error);
            this.closeSemiDialog(dialogOverlay);
            return false;
        }
    }

    // Show action error feedback
    showActionErrorFeedback(teamSlot, errorMessage) {
        const feedback = document.createElement('div');
        feedback.className = 'semi-action-error-feedback';
        feedback.textContent = errorMessage;
        
        feedback.style.cssText = `
            position: absolute;
            top: -60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #dc3545 0%, #e63946 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            pointer-events: none;
            animation: semiErrorBounce 1s ease-out;
            box-shadow: 0 4px 20px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        teamSlot.style.position = 'relative';
        teamSlot.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }

    // Show success feedback
    showSemiSuccessFeedback(heroPosition, spellCardName, goldCost) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        // Create success message
        const feedback = document.createElement('div');
        feedback.className = 'semi-success-feedback';
        feedback.innerHTML = `
            <div class="semi-success-content">
                <div class="semi-success-icon">💰✨</div>
                <div class="semi-success-text">
                    Semi learned ${this.formatCardName(spellCardName)}<br>
                    <small>Paid ${goldCost} Gold</small>
                </div>
            </div>
        `;
        
        feedback.style.cssText = `
            position: absolute;
            top: -60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            pointer-events: none;
            animation: semiSuccessBounce 1s ease-out;
            box-shadow: 0 4px 20px rgba(40, 167, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        teamSlot.style.position = 'relative';
        teamSlot.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }

    // Close Semi dialog
    closeSemiDialog(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.style.animation = 'fadeOut 0.2s ease-out forwards';
            setTimeout(() => {
                overlay.remove();
            }, 200);
        }
    }

    // Format card name
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Export state (Semi doesn't need special state beyond gold/spells)
    exportSemiState() {
        return {
            // Semi's special ability doesn't need persistent state
            // Gold and spells are handled by their respective managers
            timestamp: Date.now()
        };
    }

    // Import state (for completeness)
    importSemiState(state) {
        // Nothing special to restore for Semi
        return true;
    }

    // Reset (for completeness)
    reset() {
        // Nothing special to reset for Semi
        console.log('SemiEffectManager reset');
    }
}

// Add required CSS animations
if (typeof document !== 'undefined' && !document.getElementById('semiEffectStyles')) {
    const style = document.createElement('style');
    style.id = 'semiEffectStyles';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes dialogSlideIn {
            from { 
                opacity: 0; 
                transform: translateY(-20px) scale(0.9); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0) scale(1); 
            }
        }
        
        @keyframes semiSuccessBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            80% {
                transform: translateX(-50%) translateY(0) scale(0.98);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes semiErrorBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            80% {
                transform: translateX(-50%) translateY(0) scale(0.98);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        .semi-icon {
            font-size: 24px;
            margin-bottom: 4px;
        }
        
        .semi-success-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .semi-success-icon {
            font-size: 20px;
        }
        
        .semi-success-text {
            line-height: 1.3;
        }
        
        .semi-success-text small {
            opacity: 0.8;
            font-size: 12px;
        }
    `;
    document.head.appendChild(style);
}

// Export the manager
export const semiEffectManager = new SemiEffectManager();