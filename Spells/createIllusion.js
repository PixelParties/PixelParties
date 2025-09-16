// Spells/createIllusion.js - CreateIllusion Global Spell Implementation
// Works with GlobalSpellManager for centralized management

import { getAllCardNames, getCardInfo } from '../cardDatabase.js';

export const createIllusionSpell = {
    name: 'CreateIllusion',
    
    // Check if the spell can be activated
    canActivate(heroSelection) {
        const result = { canActivate: false, reason: '', heroName: '' };
        
        // Get CreateIllusion card info from database
        const createIllusionInfo = heroSelection.getCardInfo('CreateIllusion');
        if (!createIllusionInfo) {
            result.reason = 'CreateIllusion spell info not found in database!';
            return result;
        }
        
        const requiredSpellSchool = createIllusionInfo.spellSchool;
        const requiredLevel = createIllusionInfo.level;
        
        // Check if player has any heroes
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => formation[pos] !== null);
        
        if (heroPositions.length === 0) {
            result.reason = 'You need at least one Hero to create illusions!';
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
            result.reason = `No Hero has ${formattedSpellSchool} at level ${requiredLevel} or higher to cast Create Illusion!`;
            return result;
        }
        
        result.canActivate = true;
        result.heroName = castingHeroName;
        return result;
    },
    
    // Get all available creature cards from the database
    getAllCreatureCards() {
        const allCardNames = getAllCardNames();
        const creatureCards = [];
        
        for (const cardName of allCardNames) {
            const cardInfo = getCardInfo(cardName);
            if (cardInfo && cardInfo.cardType === 'Spell' && cardInfo.subtype === 'Creature') {
                creatureCards.push(cardName);
            }
        }
        
        return creatureCards;
    },
    
    // Select different random creatures for each hero
    selectRandomCreatures(availableCreatures, heroCount) {
        if (availableCreatures.length < heroCount) {
            // If we don't have enough different creatures, allow duplicates but minimize them
            const selected = [];
            const remaining = [...availableCreatures];
            
            for (let i = 0; i < heroCount; i++) {
                if (remaining.length === 0) {
                    remaining.push(...availableCreatures);
                }
                
                const randomIndex = Math.floor(Math.random() * remaining.length);
                const chosenCreature = remaining[randomIndex];
                selected.push(chosenCreature);
                remaining.splice(randomIndex, 1);
            }
            
            return selected;
        } else {
            // We have enough creatures to give each hero a different one
            const shuffled = [...availableCreatures];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            return shuffled.slice(0, heroCount);
        }
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
            
            // Consume action if required
            const cardInfo = heroSelection.getCardInfo('CreateIllusion');
            if (cardInfo && cardInfo.action && heroSelection.actionManager) {
                heroSelection.actionManager.consumeAction();
            }
            
            // Get all heroes
            const formation = heroSelection.formationManager.getBattleFormation();
            const heroPositions = ['left', 'center', 'right'].filter(pos => formation[pos] !== null);
            
            // Get all available creature cards
            const allCreatures = this.getAllCreatureCards();
            
            if (allCreatures.length === 0) {
                return {
                    success: false,
                    message: 'No creatures available to summon!',
                    consumed: true // Card was consumed even if effect failed
                };
            }
            
            // Select different random creatures for each hero
            const selectedCreatures = this.selectRandomCreatures(allCreatures, heroPositions.length);
            
            let summonedCreatures = [];
            
            // Summon creatures to each hero
            for (let i = 0; i < heroPositions.length; i++) {
                const position = heroPositions[i];
                const hero = formation[position];
                const creatureName = selectedCreatures[i];
                
                // Add creature to hero with modified HP
                const success = this.addIllusionCreature(heroSelection, position, creatureName);
                if (success) {
                    summonedCreatures.push({
                        heroName: hero.name,
                        heroPosition: position,
                        creatureName: creatureName
                    });
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
            
            // Show visual effects
            if (summonedCreatures.length > 0) {
                setTimeout(() => {
                    this.showIllusionEffects(summonedCreatures);
                }, 200);
            }
            
            // Show success message
            const creatureCount = summonedCreatures.length;
            const message = `${canActivateResult.heroName} created illusions! ${creatureCount} Creature${creatureCount !== 1 ? 's' : ''} materialized with 1 HP!`;
            
            return {
                success: true,
                message: message,
                consumed: true
            };
            
        } catch (error) {
            return {
                success: false,
                message: 'Failed to create illusions',
                consumed: false
            };
        }
    },
    
    // Add a creature with 1 max HP (illusion)
    addIllusionCreature(heroSelection, heroPosition, creatureName) {
        // Check if hero exists at position
        if (!heroSelection.heroCreatureManager.hasHeroAtPosition(heroPosition)) {
            return false;
        }
        
        // Get the card info
        const cardInfo = getCardInfo(creatureName);
        if (!cardInfo) {
            return false;
        }
        
        // Verify it's a creature spell
        if (cardInfo.cardType !== 'Spell' || cardInfo.subtype !== 'Creature') {
            return false;
        }
        
        // Create the illusion creature with modified HP
        const illusionCreature = {
            ...cardInfo,
            addedAt: Date.now(),
            statusEffects: [],
            type: 'creature',
            counters: 0,
            hp: 1, // Set current HP to 1
            maxHp: 1, // Set max HP to 1 permanently
            isIllusion: true // Mark as illusion for future reference
        };
        
        // Add directly to the creature manager's data structure
        heroSelection.heroCreatureManager.heroCreatures[heroPosition].push(illusionCreature);
        
        // Trigger state change callback
        if (heroSelection.heroCreatureManager.onStateChange) {
            heroSelection.heroCreatureManager.onStateChange();
        }
        
        return true;
    },
    
    // Show visual effects for illusion creatures
    showIllusionEffects(summonedCreatures) {
        summonedCreatures.forEach(({ heroPosition, creatureName }) => {
            const heroCreaturesContainer = document.querySelector(`.hero-creatures[data-hero-position="${heroPosition}"]`);
            if (heroCreaturesContainer) {
                const creatureIcons = heroCreaturesContainer.querySelectorAll('.creature-icon');
                const lastCreatureIcon = creatureIcons[creatureIcons.length - 1];
                
                if (lastCreatureIcon) {
                    this.addIllusionEffect(lastCreatureIcon);
                }
            }
        });
    },
    
    // Add shimmering illusion effect to a creature
    addIllusionEffect(creatureElement) {
        // Create illusion effect container
        const illusionContainer = document.createElement('div');
        illusionContainer.className = 'create-illusion-effects';
        illusionContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
            overflow: visible;
        `;
        
        // Create shimmering particles
        for (let i = 0; i < 8; i++) {
            const shimmer = document.createElement('div');
            shimmer.className = 'shimmer-particle';
            shimmer.innerHTML = ['✨', '💫', '🌟'][Math.floor(Math.random() * 3)];
            
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = 2000 + Math.random() * 1000;
            const delay = i * 150;
            
            shimmer.style.cssText = `
                position: absolute;
                top: ${y}%;
                left: ${x}%;
                font-size: ${4 + Math.random() * 6}px;
                color: #e3f2fd;
                text-shadow: 0 0 6px #81d4fa, 0 0 12px #4fc3f7;
                animation: createIllusionShimmer ${duration}ms ease-in-out infinite;
                animation-delay: ${delay}ms;
                opacity: 0.7;
            `;
            
            illusionContainer.appendChild(shimmer);
        }
        
        // Add ethereal glow to the creature
        creatureElement.style.position = 'relative';
        creatureElement.classList.add('create-illusion-summoned');
        creatureElement.appendChild(illusionContainer);
        
        // Remove effects after animation
        setTimeout(() => {
            illusionContainer.remove();
            creatureElement.classList.remove('create-illusion-summoned');
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

// Visual feedback functions
function showGlobalSpellSuccess(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'global-spell-success-popup';
    feedbackDiv.innerHTML = `
        <div class="global-spell-success-content">
            <span class="global-spell-success-icon">✨</span>
            <span class="global-spell-success-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: rgba(63, 81, 181, 0.95);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: globalSpellSuccessBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(63, 81, 181, 0.5);
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
if (typeof document !== 'undefined' && !document.getElementById('createIllusionSpellStyles')) {
    const style = document.createElement('style');
    style.id = 'createIllusionSpellStyles';
    style.textContent = `
        @keyframes createIllusionShimmer {
            0%, 100% {
                opacity: 0.3;
                transform: scale(0.8) rotate(0deg);
            }
            50% {
                opacity: 1;
                transform: scale(1.2) rotate(180deg);
            }
        }
        
        .create-illusion-summoned {
            animation: createIllusionGlow 3s ease-out;
        }
        
        @keyframes createIllusionGlow {
            0% {
                box-shadow: 0 0 0 rgba(63, 81, 181, 0);
                filter: brightness(1) hue-rotate(0deg);
            }
            50% {
                box-shadow: 0 0 15px rgba(63, 81, 181, 0.8), 0 0 30px rgba(63, 81, 181, 0.4);
                filter: brightness(1.2) hue-rotate(60deg);
            }
            100% {
                box-shadow: 0 0 0 rgba(63, 81, 181, 0);
                filter: brightness(1) hue-rotate(0deg);
            }
        }
        
        .create-illusion-effects .shimmer-particle {
            animation-fill-mode: both;
        }
        
        /* Reuse animations from TharxianHorse for consistency */
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
    window.createIllusionSpell = createIllusionSpell;
}