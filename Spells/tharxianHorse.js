// Spells/tharxianHorse.js - TharxianHorse Global Spell Implementation
// Works with GlobalSpellManager for centralized management

export const tharxianHorseSpell = {
    name: 'TharxianHorse',
    
    // Check if the spell can be activated
    canActivate(heroSelection) {
        const result = { canActivate: false, reason: '', heroName: '' };
        
        // Get TharxianHorse card info from database
        const tharxianHorseInfo = heroSelection.getCardInfo('TharxianHorse');
        if (!tharxianHorseInfo) {
            result.reason = 'TharxianHorse spell info not found in database!';
            return result;
        }
        
        const requiredSpellSchool = tharxianHorseInfo.spellSchool;
        const requiredLevel = tharxianHorseInfo.level;
        
        console.log(`🐎 TharxianHorse requires ${requiredSpellSchool} level ${requiredLevel}`);
        
        // Check if player has any heroes
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => formation[pos] !== null);
        
        if (heroPositions.length === 0) {
            result.reason = 'You need at least one Hero to use Tharxian Horse!';
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
            
            console.log(`🐎 Hero ${hero.name} has ${requiredSpellSchool} level ${spellSchoolLevel}, needs ${requiredLevel}`);
            
            if (spellSchoolLevel >= requiredLevel) {
                canCast = true;
                castingHeroName = hero.name;
                break;
            }
        }
        
        if (!canCast) {
            const formattedSpellSchool = heroSelection.formatCardName ? 
                heroSelection.formatCardName(requiredSpellSchool) : requiredSpellSchool;
            result.reason = `No Hero has ${formattedSpellSchool} at level ${requiredLevel} or higher to cast Tharxian Horse!`;
            return result;
        }
        
        // Now check the specific TharxianHorse requirement:
        // At least one ally Hero's MagicArts level >= at least one Creature's level in deck
        const deck = heroSelection.deckManager.getDeck();
        const creatureCards = deck.filter(cardName => 
            heroSelection.heroCreatureManager.isCreatureSpell(cardName)
        );
        
        if (creatureCards.length === 0) {
            result.reason = 'You have no Creatures to hop out of the Horse!';
            return result;
        }
        
        // Get creature levels
        const creatureLevels = creatureCards.map(cardName => {
            const cardInfo = heroSelection.getCardInfo(cardName);
            return cardInfo ? (cardInfo.level || 0) : 0;
        });
        
        // Check if any hero's MagicArts level >= any creature level
        let canUseHorse = false;
        for (const position of heroPositions) {
            const magicArtsLevel = heroSelection.heroAbilitiesManager.getAbilityStackCountForPosition(position, 'MagicArts');
            
            console.log(`🐎 ${formation[position].name} has MagicArts level ${magicArtsLevel}`);
            
            // Check if this hero's MagicArts level >= any creature level
            if (creatureLevels.some(creatureLevel => magicArtsLevel >= creatureLevel)) {
                canUseHorse = true;
                console.log(`🐎 ${formation[position].name} can summon creatures (MagicArts ${magicArtsLevel})`);
                break;
            }
        }
        
        if (!canUseHorse) {
            result.reason = 'You have no Creatures to hop out of the Horse!';
            return result;
        }
        
        result.canActivate = true;
        result.heroName = castingHeroName;
        return result;
    },
    
    // Activate the spell
    async activate(heroSelection, cardIndex, globalSpellManager) {
        console.log('🐎 Activating Tharxian Horse spell');
        
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
            // Remove the spell from hand
            const removedCard = heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            if (!removedCard) {
                console.error('Failed to remove TharxianHorse card from hand');
                return {
                    success: false,
                    message: 'Failed to remove card from hand',
                    consumed: false
                };
            }
            
            // Consume action if required (check from database)
            const cardInfo = heroSelection.getCardInfo('TharxianHorse');
            if (cardInfo && cardInfo.action && heroSelection.actionManager) {
                heroSelection.actionManager.consumeAction();
            }
            
            // Get all heroes and deck creatures
            const formation = heroSelection.formationManager.getBattleFormation();
            const heroPositions = ['left', 'center', 'right'].filter(pos => formation[pos] !== null);
            const deck = heroSelection.deckManager.getDeck();
            const creatureCards = deck.filter(cardName => 
                heroSelection.heroCreatureManager.isCreatureSpell(cardName)
            );
            
            let summonedCreatures = [];
            
            // For each hero, summon a random creature if possible
            for (const position of heroPositions) {
                const hero = formation[position];
                const magicArtsLevel = heroSelection.heroAbilitiesManager.getAbilityStackCountForPosition(position, 'MagicArts');
                
                // Filter creatures that this hero can summon (level <= MagicArts level)
                const validCreatures = creatureCards.filter(cardName => {
                    const cardInfo = heroSelection.getCardInfo(cardName);
                    const creatureLevel = cardInfo ? (cardInfo.level || 0) : 0;
                    return magicArtsLevel >= creatureLevel;
                });
                
                if (validCreatures.length > 0) {
                    // Choose random creature
                    const randomIndex = Math.floor(Math.random() * validCreatures.length);
                    const chosenCreature = validCreatures[randomIndex];
                    
                    // Add creature to hero
                    const success = heroSelection.heroCreatureManager.addCreatureToHero(position, chosenCreature);
                    if (success) {
                        summonedCreatures.push({
                            heroName: hero.name,
                            heroPosition: position,
                            creatureName: chosenCreature
                        });
                        console.log(`🐎 ${hero.name} summoned ${chosenCreature} from the Tharxian Horse!`);
                    }
                }
            }
            
            // Update displays
            heroSelection.updateHandDisplay();
            if (heroSelection.updateActionDisplay) {
                heroSelection.updateActionDisplay();
            }
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Send formation update to opponent
            await heroSelection.sendFormationUpdate();
            
            // Show visual effects for summoned creatures
            if (summonedCreatures.length > 0) {
                setTimeout(() => {
                    this.showSummonEffects(summonedCreatures);
                }, 200); // Small delay to ensure DOM is updated
            }
            
            // Show success message
            const creatureCount = summonedCreatures.length;
            const message = `${canActivateResult.heroName} activated Tharxian Horse! ${creatureCount} Creature${creatureCount !== 1 ? 's' : ''} hopped out!`;
            
            return {
                success: true,
                message: message,
                consumed: true
            };
            
        } catch (error) {
            console.error('Error activating Tharxian Horse:', error);
            return {
                success: false,
                message: 'Failed to activate Tharxian Horse',
                consumed: false
            };
        }
    },
    
    // Show visual effects for summoned creatures
    showSummonEffects(summonedCreatures) {
        summonedCreatures.forEach(({ heroPosition, creatureName }) => {
            // Find the creature element that was just added
            const heroCreaturesContainer = document.querySelector(`.hero-creatures[data-hero-position="${heroPosition}"]`);
            if (heroCreaturesContainer) {
                const creatureIcons = heroCreaturesContainer.querySelectorAll('.creature-icon');
                const lastCreatureIcon = creatureIcons[creatureIcons.length - 1];
                
                if (lastCreatureIcon) {
                    this.addSparkleEffect(lastCreatureIcon);
                    console.log(`✨ Added sparkle effects to ${creatureName} for ${heroPosition} hero`);
                }
            }
        });
    },
    
    // Add sparkle particle effect to a creature
    addSparkleEffect(creatureElement) {
        // Create sparkle container
        const sparkleContainer = document.createElement('div');
        sparkleContainer.className = 'tharxian-horse-sparkles';
        sparkleContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
            overflow: visible;
        `;
        
        // Create multiple sparkle particles
        for (let i = 0; i < 15; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle-particle';
            sparkle.innerHTML = ['✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 4)];
            
            const angle = (i / 15) * 360 + Math.random() * 30;
            const distance = 25 + Math.random() * 20;
            const duration = 1200 + Math.random() * 800;
            const delay = i * 60;
            
            sparkle.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                font-size: ${6 + Math.random() * 10}px;
                color: #ffd700;
                text-shadow: 0 0 8px #ffd700, 0 0 15px #ffed4e;
                animation: tharxianHorseSparkle ${duration}ms ease-out forwards;
                animation-delay: ${delay}ms;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                transform: translate(-50%, -50%);
            `;
            
            sparkleContainer.appendChild(sparkle);
        }
        
        // Add magical glow effect to the creature itself
        creatureElement.style.position = 'relative';
        creatureElement.classList.add('tharxian-horse-summoned');
        creatureElement.appendChild(sparkleContainer);
        
        // Remove sparkles and glow after animation
        setTimeout(() => {
            sparkleContainer.remove();
            creatureElement.classList.remove('tharxian-horse-summoned');
        }, 3000);
    },
    
    // Handle click activation (called by GlobalSpellManager)
    async handleClick(cardIndex, cardName, heroSelection, globalSpellManager) {
        console.log(`🐎 Tharxian Horse clicked: ${cardName} at index ${cardIndex}`);
        
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
            <span class="global-spell-success-icon">🐎</span>
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
if (typeof document !== 'undefined' && !document.getElementById('tharxianHorseSpellStyles')) {
    const style = document.createElement('style');
    style.id = 'tharxianHorseSpellStyles';
    style.textContent = `
        @keyframes tharxianHorseSparkle {
            0% {
                transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(0);
                opacity: 0;
            }
            15% {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-8px) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(-1 * var(--distance))) scale(0.2);
            }
        }
        
        .tharxian-horse-summoned {
            animation: tharxianHorseSummonGlow 2s ease-out;
        }
        
        @keyframes tharxianHorseSummonGlow {
            0% {
                box-shadow: 0 0 0 rgba(255, 215, 0, 0);
                filter: brightness(1);
            }
            50% {
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4);
                filter: brightness(1.3);
            }
            100% {
                box-shadow: 0 0 0 rgba(255, 215, 0, 0);
                filter: brightness(1);
            }
        }
        
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
        
        .tharxian-horse-sparkles .sparkle-particle {
            animation-fill-mode: both;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.tharxianHorseSpell = tharxianHorseSpell;
}