// Spells/auroraBorealis.js - Aurora Borealis Global Spell Implementation
// Finds highest MagicArts level and draws that many different non-creature spells from deck

import { getCardInfo } from '../cardDatabase.js';

export const auroraBorealisSpell = {
    name: 'AuroraBorealis',
    
    // Check if the spell can be activated
    canActivate(heroSelection) {
        const result = { canActivate: false, reason: '', heroName: '' };
        
        // Get AuroraBorealis card info from database
        const auroraBorealisInfo = heroSelection.getCardInfo('AuroraBorealis');
        if (!auroraBorealisInfo) {
            result.reason = 'Aurora Borealis spell info not found in database!';
            return result;
        }
        
        const requiredSpellSchool = auroraBorealisInfo.spellSchool;
        const requiredLevel = auroraBorealisInfo.level;
        
        // Check if player has any heroes
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => formation[pos] !== null);
        
        if (heroPositions.length === 0) {
            result.reason = 'You need at least one Hero to cast Aurora Borealis!';
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
            
            if (spellSchoolLevel >= requiredLevel) {
                canCast = true;
                castingHeroName = hero.name;
                break;
            }
        }
        
        if (!canCast) {
            const formattedSpellSchool = heroSelection.formatCardName ? 
                heroSelection.formatCardName(requiredSpellSchool) : requiredSpellSchool;
            result.reason = `No Hero has ${formattedSpellSchool} at level ${requiredLevel} or higher to cast Aurora Borealis!`;
            return result;
        }
        
        result.canActivate = true;
        result.heroName = castingHeroName;
        return result;
    },
    
    // Find the highest MagicArts level among all heroes
    findHighestMagicArtsLevel(heroSelection) {
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => formation[pos] !== null);
        
        let highestLevel = 0;
        
        for (const position of heroPositions) {
            const magicArtsLevel = heroSelection.heroAbilitiesManager.getAbilityStackCountForPosition(position, 'MagicArts');
            if (magicArtsLevel > highestLevel) {
                highestLevel = magicArtsLevel;
            }
        }
        
        return highestLevel;
    },
    
    // Get non-creature spells from deck with different names
    selectNonCreatureSpells(heroSelection, maxCount) {
        const deck = heroSelection.deckManager.getDeck();
        const selectedSpells = [];
        const usedNames = new Set();
        
        // Filter and select spells
        for (const cardName of deck) {
            // Skip if we already have enough spells
            if (selectedSpells.length >= maxCount) {
                break;
            }
            
            // Skip if we already selected this spell name
            if (usedNames.has(cardName)) {
                continue;
            }
            
            // Get card info
            const cardInfo = getCardInfo(cardName);
            if (!cardInfo) {
                continue;
            }
            
            // Check if it's a spell that's NOT a creature
            if (cardInfo.cardType === 'Spell' && cardInfo.subtype !== 'Creature') {
                selectedSpells.push(cardName);
                usedNames.add(cardName);
            }
        }
        
        return selectedSpells;
    },
    
    // Activate the spell
    async activate(heroSelection, cardIndex, globalSpellManager) {
        const canActivateResult = this.canActivate(heroSelection);
        if (!canActivateResult.canActivate) {
            return {
                success: false,
                message: canActivateResult.reason,
                consumed: false
            };
        }
        
        // Find highest MagicArts level
        const magicArtsLevel = this.findHighestMagicArtsLevel(heroSelection);
        
        if (magicArtsLevel === 0) {
            return {
                success: false,
                message: 'No MagicArts abilities found among your heroes!',
                consumed: false
            };
        }
        
        // Get non-creature spells from deck
        const selectedSpells = this.selectNonCreatureSpells(heroSelection, magicArtsLevel);
        
        if (selectedSpells.length === 0) {
            return {
                success: false,
                message: 'Aurora Borealis failed - you have no Spells in your deck!',
                consumed: false
            };
        }
        
        // Core spell execution - these are critical operations
        let coreSpellSuccess = false;
        let addedCount = 0;
        let consumedCard = false;
        
        try {
            // Remove the spell from hand
            const removedCard = heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            if (!removedCard) {
                return {
                    success: false,
                    message: 'Failed to remove card from hand',
                    consumed: false
                };
            }
            consumedCard = true;
            
            // Consume action if required
            const cardInfo = heroSelection.getCardInfo('AuroraBorealis');
            if (cardInfo && cardInfo.action && heroSelection.actionManager) {
                heroSelection.actionManager.consumeAction();
            }
            
            // Add spells to hand (respecting hand size limit)
            const maxHandSize = heroSelection.handManager.maxHandSize;
            
            for (const spellName of selectedSpells) {
                // Check if hand is full
                if (heroSelection.handManager.getHandSize() >= maxHandSize) {
                    break;
                }
                
                // Add spell to hand
                const success = heroSelection.handManager.addCardToHand(spellName);
                if (success) {
                    addedCount++;
                }
            }
            
            coreSpellSuccess = true;
            
        } catch (error) {
            console.error('Core Aurora Borealis execution error:', error);
            return {
                success: false,
                message: 'Failed to cast Aurora Borealis - core execution failed',
                consumed: consumedCard
            };
        }
        
        // Create success message - core spell worked
        const spellsWord = addedCount === 1 ? 'spell' : 'spells';
        let message = `${canActivateResult.heroName} cast Aurora Borealis! Added ${addedCount} ${spellsWord} to hand`;
        
        if (addedCount < selectedSpells.length) {
            const missedCount = selectedSpells.length - addedCount;
            message += ` (${missedCount} couldn't fit)`;
        }
        
        if (magicArtsLevel > selectedSpells.length) {
            message += ` (only ${selectedSpells.length} valid spells in deck)`;
        }
        
        // Non-critical operations - if these fail, don't show error popup
        try {
            // Update displays
            heroSelection.updateHandDisplay();
            if (heroSelection.updateActionDisplay) {
                heroSelection.updateActionDisplay();
            }
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Send formation update to opponent
            await heroSelection.sendFormationUpdate();
            
            // Show visual effects
            setTimeout(() => {
                this.showAuroraEffects();
            }, 200);
            
        } catch (error) {
            // Log the error but don't fail the spell since core functionality worked
            console.error('Aurora Borealis post-execution error (non-critical):', error);
        }
        
        return {
            success: true,
            message: message,
            consumed: true
        };
    },
    
    // Show visual effects for Aurora Borealis
    showAuroraEffects() {
        // Create aurora effect container
        const auroraContainer = document.createElement('div');
        auroraContainer.className = 'aurora-borealis-effects';
        auroraContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        `;
        
        // Create aurora waves
        for (let i = 0; i < 5; i++) {
            const wave = document.createElement('div');
            wave.className = 'aurora-wave';
            
            const colors = ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff8800'];
            const color = colors[i % colors.length];
            const delay = i * 200;
            const duration = 2000 + (i * 300);
            
            wave.style.cssText = `
                position: absolute;
                top: ${20 + i * 15}%;
                left: -100%;
                width: 200%;
                height: 8px;
                background: linear-gradient(90deg, transparent 0%, ${color}80 30%, ${color}ff 50%, ${color}80 70%, transparent 100%);
                border-radius: 4px;
                animation: auroraWave ${duration}ms ease-in-out;
                animation-delay: ${delay}ms;
                animation-fill-mode: both;
                box-shadow: 0 0 15px ${color}aa;
            `;
            
            auroraContainer.appendChild(wave);
        }
        
        // Create sparkle particles
        for (let i = 0; i < 15; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'aurora-sparkle';
            sparkle.innerHTML = ['✨', '💫', '⭐'][Math.floor(Math.random() * 3)];
            
            const x = Math.random() * 100;
            const y = Math.random() * 60 + 10;
            const duration = 3000 + Math.random() * 2000;
            const delay = Math.random() * 1000;
            
            sparkle.style.cssText = `
                position: absolute;
                top: ${y}%;
                left: ${x}%;
                font-size: ${8 + Math.random() * 12}px;
                color: #ffffff;
                text-shadow: 0 0 10px #00ffff, 0 0 20px #ff00ff;
                animation: auroraSparkle ${duration}ms ease-in-out infinite;
                animation-delay: ${delay}ms;
                opacity: 0.8;
            `;
            
            auroraContainer.appendChild(sparkle);
        }
        
        // Add to document
        document.body.appendChild(auroraContainer);
        
        // Remove effects after animation
        setTimeout(() => {
            auroraContainer.remove();
        }, 4000);
    },
    
    // Handle click activation (called by GlobalSpellManager)
    async handleClick(cardIndex, cardName, heroSelection, globalSpellManager) {
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

// Visual feedback functions (reused from createIllusion pattern)
function showGlobalSpellSuccess(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'global-spell-success-popup';
    feedbackDiv.innerHTML = `
        <div class="global-spell-success-content">
            <span class="global-spell-success-icon">🌌</span>
            <span class="global-spell-success-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: globalSpellSuccessBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(74, 0, 224, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(feedbackDiv);
    
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
    
    setTimeout(() => {
        feedbackDiv.style.animation = 'globalSpellErrorFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3000);
}

// Add CSS animations
if (typeof document !== 'undefined' && !document.getElementById('auroraBorealisSpellStyles')) {
    const style = document.createElement('style');
    style.id = 'auroraBorealisSpellStyles';
    style.textContent = `
        @keyframes auroraWave {
            0% {
                left: -100%;
                opacity: 0;
            }
            20% {
                opacity: 1;
            }
            80% {
                opacity: 1;
            }
            100% {
                left: 100%;
                opacity: 0;
            }
        }
        
        @keyframes auroraSparkle {
            0%, 100% {
                opacity: 0.3;
                transform: scale(0.8) rotate(0deg);
            }
            50% {
                opacity: 1;
                transform: scale(1.2) rotate(180deg);
            }
        }
        
        /* Reuse animations from other global spells for consistency */
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
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.auroraBorealisSpell = auroraBorealisSpell;
}