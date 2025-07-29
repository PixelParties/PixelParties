// Spells/guardChange.js - GuardChange Global Spell Implementation
// Works with GlobalSpellManager for centralized management

export const guardChangeSpell = {
    name: 'GuardChange',
    
    // Check if the spell can be activated
    canActivate(heroSelection) {
        const result = { canActivate: false, reason: '', heroName: '' };
        
        // Get GuardChange card info from database
        const guardChangeInfo = heroSelection.getCardInfo('GuardChange');
        if (!guardChangeInfo) {
            result.reason = 'GuardChange spell info not found in database!';
            return result;
        }
        
        const requiredSpellSchool = guardChangeInfo.spellSchool;
        const requiredLevel = guardChangeInfo.level;
        
        console.log(`🛡️ GuardChange requires ${requiredSpellSchool} level ${requiredLevel}`);
        
        // Check if player has any heroes
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => formation[pos] !== null);
        
        if (heroPositions.length <= 1) {
            result.reason = 'Guard Change requires at least 2 Heroes to be effective!';
            return result;
        }
        
        // Check if player has any creatures
        const totalCreatures = heroSelection.heroCreatureManager.getTotalCreatureCount();
        if (totalCreatures === 0) {
            result.reason = 'Guard Change requires at least 1 Creature to be effective!';
            return result;
        }
        
        // Check if ANY hero has the required spell school at required level
        let canCast = false;
        let castingHeroName = '';
        
        for (const position of heroPositions) {
            const hero = formation[position];
            if (!hero) continue;
            
            // Get hero's abilities
            const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
            if (!heroAbilities) continue;
            
            // Count spell school abilities across all zones
            let spellSchoolLevel = 0;
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                    heroAbilities[zone].forEach(ability => {
                        if (ability && ability.name === requiredSpellSchool) {
                            spellSchoolLevel++;
                        }
                    });
                }
            });
            
            console.log(`🛡️ Hero ${hero.name} has ${requiredSpellSchool} level ${spellSchoolLevel}, needs ${requiredLevel}`);
            
            if (spellSchoolLevel >= requiredLevel) {
                canCast = true;
                castingHeroName = hero.name;
                break;
            }
        }
        
        if (!canCast) {
            const formattedSpellSchool = heroSelection.formatCardName ? 
                heroSelection.formatCardName(requiredSpellSchool) : requiredSpellSchool;
            result.reason = `No Hero has ${formattedSpellSchool} at level ${requiredLevel} or higher to cast Guard Change!`;
            return result;
        }
        
        result.canActivate = true;
        result.heroName = castingHeroName;
        return result;
    },
    
    // Activate the spell
    async activate(heroSelection, cardIndex, globalSpellManager) {
        console.log('🛡️ Activating Guard Change spell');
        
        // Check if can activate
        const canActivateResult = this.canActivate(heroSelection);
        if (!canActivateResult.canActivate) {
            return {
                success: false,
                message: canActivateResult.reason,
                consumed: false
            };
        }
        
        try {
            // Activate Guard Change mode through the manager
            globalSpellManager.setGuardChangeMode(true, heroSelection);
            
            // Remove the spell from hand
            const removedCard = heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            if (!removedCard) {
                console.error('Failed to remove Guard Change card from hand');
                return {
                    success: false,
                    message: 'Failed to remove card from hand',
                    consumed: false
                };
            }
            
            // Consume action if required (check from database)
            const cardInfo = heroSelection.getCardInfo('GuardChange');
            if (cardInfo && cardInfo.action && heroSelection.actionManager) {
                heroSelection.actionManager.consumeAction();
            }
            
            // Update displays
            heroSelection.updateHandDisplay();
            if (heroSelection.updateActionDisplay) {
                heroSelection.updateActionDisplay();
            }
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Show success message
            const message = `${canActivateResult.heroName} activated Guard Change! You can now move Creatures freely between Heroes.`;
            
            return {
                success: true,
                message: message,
                consumed: true
            };
            
        } catch (error) {
            console.error('Error activating Guard Change:', error);
            return {
                success: false,
                message: 'Failed to activate Guard Change',
                consumed: false
            };
        }
    },
    
    // Handle click activation (called by GlobalSpellManager)
    async handleClick(cardIndex, cardName, heroSelection, globalSpellManager) {
        console.log(`🛡️ Guard Change clicked: ${cardName} at index ${cardIndex}`);
        
        const result = await this.activate(heroSelection, cardIndex, globalSpellManager);
        
        // Show visual feedback
        if (result.success) {
            showGlobalSpellSuccess(result.message);
        } else {
            showGlobalSpellError(result.message);
        }
        
        return result.success;
    }
};

// Visual feedback functions
function showGlobalSpellSuccess(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'global-spell-success-popup';
    feedbackDiv.innerHTML = `
        <div class="global-spell-success-content">
            <span class="global-spell-success-icon">🛡️</span>
            <span class="global-spell-success-text">${message}</span>
        </div>
    `;
    
    // Position in center of screen
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: rgba(76, 175, 80, 0.95);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: globalSpellSuccessBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(76, 175, 80, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(feedbackDiv);
    
    // Remove after animation
    setTimeout(() => {
        feedbackDiv.style.animation = 'globalSpellSuccessFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3000);
}

function showGlobalSpellError(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'global-spell-error-popup';
    feedbackDiv.innerHTML = `
        <div class="global-spell-error-content">
            <span class="global-spell-error-icon">⚠️</span>
            <span class="global-spell-error-text">${message}</span>
        </div>
    `;
    
    // Position in center of screen
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: rgba(244, 67, 54, 0.95);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: globalSpellErrorBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(244, 67, 54, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(feedbackDiv);
    
    // Remove after animation
    setTimeout(() => {
        feedbackDiv.style.animation = 'globalSpellErrorFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3000);
}

// Add CSS animations if not already present
if (typeof document !== 'undefined' && !document.getElementById('guardChangeSpellStyles')) {
    const style = document.createElement('style');
    style.id = 'guardChangeSpellStyles';
    style.textContent = `
        @keyframes globalSpellSuccessBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes globalSpellSuccessFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes globalSpellErrorBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes globalSpellErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        .global-spell-success-content {
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: center;
        }
        
        .global-spell-error-content {
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: center;
        }
        
        .global-spell-success-icon,
        .global-spell-error-icon {
            font-size: 20px;
        }
        
        .global-spell-success-text,
        .global-spell-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.guardChangeSpell = guardChangeSpell;
}