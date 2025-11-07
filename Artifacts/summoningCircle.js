// ./Artifacts/summoningCircle.js - DEBUG VERSION with extensive logging
// Summon a random Creature from deck onto a hero

import { getCardInfo, getCardsByType } from '../cardDatabase.js';

export const summoningCircleArtifact = {
    // Card name this artifact handles
    cardName: 'SummoningCircle',
    
    // Flag to indicate this artifact requires hero targeting
    requiresHeroTarget: true,
    
    // Handle card click - show error that it must be dragged onto a hero
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`✨ SummoningCircle.handleClick called - index: ${cardIndex}`);
        
        // Show error message
        this.showSummoningCircleError(
            'Drag Summoning Circle onto a Hero to use it!',
            cardIndex
        );
    },
    
    // Handle card being dragged outside the hand - show same error
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`✨ SummoningCircle.handleDraggedOutside called - index: ${cardIndex}`);
        
        // Show error message
        this.showSummoningCircleError(
            'Drag Summoning Circle onto a Hero to use it!',
            cardIndex
        );
    },
    
    // Handle drop onto a specific hero (called by artifactHandler)
    async handleHeroDrop(cardIndex, heroPosition, heroSelection) {
        console.log(`✨✨✨ SummoningCircle.handleHeroDrop CALLED!`);
        console.log(`  - cardIndex: ${cardIndex}`);
        console.log(`  - heroPosition: ${heroPosition}`);
        console.log(`  - heroSelection:`, heroSelection ? 'EXISTS' : 'NULL');
        
        try {
            // Activate the summoning circle
            const result = await this.activateSummoningCircle(cardIndex, heroPosition, heroSelection);
            
            console.log(`✨ handleHeroDrop result:`, result);
            
            if (!result.success) {
                console.log(`❌ Activation failed: ${result.reason}`);
                
                // Show error message at hero position
                const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
                if (teamSlot) {
                    this.showDropError(teamSlot, result.reason);
                } else {
                    console.warn(`⚠️ Could not find team slot for position ${heroPosition}`);
                    // Fallback to hand position error
                    this.showSummoningCircleError(result.reason, cardIndex);
                }
            } else {
                console.log(`✅ SUCCESS! Summoned ${result.creatureName} to ${result.heroName}`);
            }
            
            // End the drag operation
            if (heroSelection.handManager) {
                console.log(`✨ Ending hand card drag`);
                heroSelection.handManager.endHandCardDrag();
            }
            
            return result.success;
            
        } catch (error) {
            console.error(`❌ ERROR in handleHeroDrop:`, error);
            
            // End drag on error
            if (heroSelection?.handManager) {
                heroSelection.handManager.endHandCardDrag();
            }
            
            return false;
        }
    },
    
    // Show error at hero slot position
    showDropError(teamSlot, message) {
        console.log(`📢 Showing drop error: ${message}`);
        
        const feedback = document.createElement('div');
        feedback.className = 'summoning-circle-drop-error';
        feedback.textContent = message;
        
        feedback.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            white-space: nowrap;
            z-index: 1000;
            animation: fadeInOut 2s ease-out;
            pointer-events: none;
            background: rgba(244, 67, 54, 0.9);
            color: white;
        `;
        
        teamSlot.style.position = 'relative';
        teamSlot.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    },
    
    // Core logic to summon a random creature onto a specific hero
    async activateSummoningCircle(cardIndex, heroPosition, heroSelection) {
        console.log(`🎯 activateSummoningCircle START`);
        
        if (!heroSelection) {
            console.error('❌ No heroSelection instance available');
            return { success: false, reason: 'System error' };
        }
        
        // Get managers
        console.log(`🔍 Getting managers...`);
        const handManager = heroSelection.handManager;
        const deckManager = heroSelection.deckManager;
        const goldManager = heroSelection.goldManager;
        const formationManager = heroSelection.formationManager;
        
        console.log(`  - handManager:`, handManager ? 'OK' : 'MISSING');
        console.log(`  - deckManager:`, deckManager ? 'OK' : 'MISSING');
        console.log(`  - goldManager:`, goldManager ? 'OK' : 'MISSING');
        console.log(`  - formationManager:`, formationManager ? 'OK' : 'MISSING');
        
        if (!handManager || !deckManager || !goldManager || !formationManager) {
            console.error('❌ Required managers not available');
            return { success: false, reason: 'System error' };
        }
        
        // Get the target hero
        console.log(`🔍 Getting target hero at position ${heroPosition}...`);
        const formation = formationManager.getBattleFormation();
        const targetHero = formation[heroPosition];
        
        console.log(`  - targetHero:`, targetHero ? `${targetHero.name}` : 'NULL');
        
        if (!targetHero) {
            console.error(`❌ No hero at position ${heroPosition}`);
            return { success: false, reason: 'No hero at this position' };
        }
        
        // Get all creatures from the deck
        console.log(`🔍 Checking deck for creatures...`);
        const deck = deckManager.getDeck();
        console.log(`  - Deck size: ${deck.length}`);
        
        const creaturesInDeck = this.getCreaturesFromDeck(deck, heroSelection);
        console.log(`  - Creatures found: ${creaturesInDeck.length}`);
        
        // Check if there are any creatures in the deck
        if (creaturesInDeck.length === 0) {
            console.warn(`⚠️ No creatures in deck!`);
            return { 
                success: false, 
                reason: 'You have no Creatures in your deck to summon!'
            };
        }
        
        // Get cost from card database
        console.log(`🔍 Getting card cost...`);
        const cardInfo = getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 2;
        console.log(`  - Cost: ${cost} gold`);
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        console.log(`  - Current gold: ${currentGold}`);
        
        if (currentGold < cost) {
            console.warn(`⚠️ Not enough gold! Need ${cost}, have ${currentGold}`);
            return {
                success: false,
                reason: `Need ${cost} Gold. Have ${currentGold} Gold.`
            };
        }
        
        // All checks passed - proceed with summoning
        console.log(`✅ All checks passed! Proceeding with summoning...`);
        
        // Spend the gold
        console.log(`💰 Spending ${cost} gold...`);
        goldManager.addPlayerGold(-cost, 'SummoningCircle');
        
        // Remove Summoning Circle card from hand
        console.log(`🗑️ Removing card from hand at index ${cardIndex}...`);
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        console.log(`  - Removed card: ${removedCard}`);
        
        if (removedCard !== this.cardName) {
            console.error(`⚠️ Expected to remove ${this.cardName} but removed ${removedCard}`);
        }
        
        // Select a random creature from the deck
        console.log(`🎲 Selecting random creature from ${creaturesInDeck.length} options...`);
        const randomCreatureName = creaturesInDeck[Math.floor(Math.random() * creaturesInDeck.length)];
        console.log(`  - Selected: ${randomCreatureName}`);
        
        // Get creature info from card database
        const creatureInfo = getCardInfo(randomCreatureName);
        
        if (!creatureInfo) {
            console.error(`❌ Could not find creature info for ${randomCreatureName}`);
            return { success: false, reason: 'Failed to summon creature' };
        }
        
        console.log(`  - Creature level: ${creatureInfo.level}`);
        console.log(`  - Base HP: ${creatureInfo.hp}`);
        console.log(`  - ATK: ${creatureInfo.atk}`);
        
        // Add creature using the HeroCreatureManager (proper way to add creatures)
        console.log(`➕ Adding creature to hero using HeroCreatureManager...`);
        
        // Check if heroCreatureManager is available
        if (!heroSelection.heroCreatureManager) {
            console.error(`❌ heroCreatureManager not available`);
            return { success: false, reason: 'System error' };
        }
        
        // Get creature count before adding
        const creaturesBefore = heroSelection.heroCreatureManager.getHeroCreatures(heroPosition);
        console.log(`  - Before: ${creaturesBefore.length} creatures`);
        
        // Add the creature using the manager
        const addSuccess = heroSelection.heroCreatureManager.addCreatureToHero(heroPosition, randomCreatureName);
        
        if (!addSuccess) {
            console.error(`❌ Failed to add creature to hero`);
            return { success: false, reason: 'Failed to add creature to hero' };
        }
        
        // Get creature count after adding
        const creaturesAfter = heroSelection.heroCreatureManager.getHeroCreatures(heroPosition);
        console.log(`  - After: ${creaturesAfter.length} creatures`);
        console.log(`  - Successfully added ${randomCreatureName} to ${targetHero.name}!`);
        
        // Play summoning animation
        console.log(`🎬 Playing summoning animation...`);
        this.playSummoningAnimation(targetHero, heroPosition);
        
        // Show visual feedback
        console.log(`📢 Showing success feedback...`);
        this.showSummoningSuccess(heroPosition, randomCreatureName, cost);
        
        // Update UI
        console.log(`🔄 Updating UI...`);
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        heroSelection.updateBattleFormationUI();
        
        // Save game state
        console.log(`💾 Saving game state...`);
        await heroSelection.saveGameState();
        
        console.log(`✅✅✅ SUMMONING COMPLETE! ✅✅✅`);
        
        return { 
            success: true, 
            creatureName: randomCreatureName,
            heroName: targetHero.name
        };
    },
    
    // Get all creatures from the deck
    getCreaturesFromDeck(deck, heroSelection) {
        const creaturesInDeck = [];
        
        for (const cardName of deck) {
            const cardInfo = heroSelection.getCardInfo ? heroSelection.getCardInfo(cardName) : getCardInfo(cardName);
            
            // Check if it's a creature (Spell with Creature subtype)
            if (cardInfo && cardInfo.cardType === 'Spell' && cardInfo.subtype === 'Creature') {
                creaturesInDeck.push(cardName);
            }
        }
        
        console.log(`🔍 Found ${creaturesInDeck.length} creatures in deck:`, creaturesInDeck);
        
        return creaturesInDeck;
    },
    
    // Create a creature object for the hero
    createCreatureForHero(hero, creatureInfo, heroSelection) {
        // Calculate creature HP (use base HP with SummoningMagic bonuses)
        const baseHp = creatureInfo.hp || 10;
        
        let hpMultiplier = 1.0;
        if (hero.hasAbility && hero.hasAbility('SummoningMagic')) {
            const summoningMagicLevel = hero.getAbilityStackCount ? hero.getAbilityStackCount('SummoningMagic') : 0;
            hpMultiplier = 1 + (0.25 * summoningMagicLevel);
            console.log(`  - SummoningMagic bonus: ${summoningMagicLevel} stacks (${hpMultiplier}x HP)`);
        }
        
        const finalHp = Math.floor(baseHp * hpMultiplier);
        
        // Create creature with full properties
        const creature = {
            name: creatureInfo.name,
            image: creatureInfo.image,
            currentHp: finalHp,
            maxHp: finalHp,
            atk: creatureInfo.atk || 0,
            alive: true,
            type: 'creature',
            addedAt: Date.now(),
            statusEffects: [],
            temporaryModifiers: {},
            isSummoningCircle: true,
            createdFromArtifact: true,
            level: creatureInfo.level || 0,
            physicalAttack: creatureInfo.physicalAttack
        };
        
        return creature;
    },
    
    // Play creature summoning animation
    playSummoningAnimation(hero, heroPosition) {
        this.injectSummoningAnimationCSS();
        
        setTimeout(() => {
            const creatureElement = document.querySelector(
                `.player-slot.${heroPosition}-slot .creature-icon[data-creature-index="0"]`
            );
            
            if (!creatureElement) {
                console.warn(`⚠️ Could not find creature element for animation`);
                return;
            }
            
            const summoningEffect = document.createElement('div');
            summoningEffect.className = 'summoning-circle-effect';
            summoningEffect.innerHTML = `
                <div class="summoning-circle-ring"></div>
                <div class="summoning-particles">
                    ${Array.from({length: 6}, (_, i) => 
                        `<div class="summon-particle particle-${i + 1}"></div>`
                    ).join('')}
                </div>
            `;
            
            creatureElement.style.position = 'relative';
            creatureElement.appendChild(summoningEffect);
            
            setTimeout(() => {
                if (summoningEffect.parentNode) {
                    summoningEffect.parentNode.removeChild(summoningEffect);
                }
            }, 800);
            
        }, 50);
    },
    
    // Inject CSS for summoning animations
    injectSummoningAnimationCSS() {
        if (document.getElementById('summoningCircleStyles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'summoningCircleStyles';
        style.textContent = `
            .summoning-circle-effect {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 100;
            }
            
            .summoning-circle-ring {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 80%;
                height: 80%;
                border: 3px solid #9c27b0;
                border-radius: 50%;
                transform: translate(-50%, -50%) scale(0);
                animation: summoningCircleExpand 0.8s ease-out;
                box-shadow: 0 0 20px #9c27b0, inset 0 0 20px #9c27b0;
            }
            
            @keyframes summoningCircleExpand {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 1;
                }
                50% {
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(2) rotate(360deg);
                    opacity: 0;
                }
            }
            
            .summoning-particles {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
            
            .summon-particle {
                position: absolute;
                width: 8px;
                height: 8px;
                background: radial-gradient(circle, #9c27b0 0%, transparent 70%);
                border-radius: 50%;
                animation: summonParticleBurst 0.8s ease-out forwards;
                top: 50%;
                left: 50%;
            }
            
            @keyframes summonParticleBurst {
                0% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) translate(40px, 40px) scale(0);
                    opacity: 0;
                }
            }
            
            .particle-1 { animation-delay: 0s; }
            .particle-2 { animation-delay: 0.05s; }
            .particle-3 { animation-delay: 0.1s; }
            .particle-4 { animation-delay: 0.15s; }
            .particle-5 { animation-delay: 0.2s; }
            .particle-6 { animation-delay: 0.25s; }
        `;
        
        document.head.appendChild(style);
    },
    
    // Show error message
    showSummoningCircleError(message, cardIndex) {
        console.log(`📢 Showing error: ${message}`);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'summoning-circle-error';
        errorDiv.innerHTML = `
            <div class="summoning-circle-error-content">
                <span class="summoning-circle-error-icon">⚠️</span>
                <span class="summoning-circle-error-text">${message}</span>
            </div>
        `;
        
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                errorDiv.style.left = `${cardRect.left + cardRect.width / 2}px`;
                errorDiv.style.top = `${cardRect.top - 60}px`;
            } else {
                const handRect = handContainer.getBoundingClientRect();
                errorDiv.style.left = `${handRect.left + handRect.width / 2}px`;
                errorDiv.style.top = `${handRect.top - 60}px`;
            }
        } else {
            errorDiv.style.left = '50%';
            errorDiv.style.top = '50%';
        }
        
        errorDiv.style.cssText += `
            position: fixed;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: summoningCircleErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(255, 152, 0, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'summoningCircleErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show success message
    showSummoningSuccess(heroPosition, creatureName, cost) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) {
            console.warn(`⚠️ Could not find team slot for success message`);
            return;
        }
        
        const formattedName = this.formatCardName(creatureName);
        
        const feedback = document.createElement('div');
        feedback.className = 'summoning-circle-success';
        feedback.innerHTML = `
            <div class="summoning-success-icon">✨</div>
            <div class="summoning-success-text">Summoned ${formattedName}!</div>
            <div class="summoning-success-cost">Cost: ${cost} Gold</div>
        `;
        
        feedback.style.cssText = `
            position: absolute;
            top: -80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            animation: summoningSuccessFade 3s ease-out;
            pointer-events: none;
            background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(156, 39, 176, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        teamSlot.style.position = 'relative';
        teamSlot.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 3000);
    },
    
    // Format card name
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
};

// Add error/success animation styles
if (typeof document !== 'undefined' && !document.getElementById('summoningCircleErrorStyles')) {
    const style = document.createElement('style');
    style.id = 'summoningCircleErrorStyles';
    style.textContent = `
        @keyframes summoningCircleErrorBounce {
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
        
        @keyframes summoningCircleErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes summoningSuccessFade {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            20% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            80% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px) scale(0.9);
            }
        }
        
        .summoning-circle-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .summoning-circle-error-icon {
            font-size: 20px;
        }
        
        .summoning-circle-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        .summoning-success-icon {
            font-size: 24px;
            margin-bottom: 5px;
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.6));
        }
        
        .summoning-success-text {
            font-size: 16px;
            margin-bottom: 3px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        .summoning-success-cost {
            font-size: 12px;
            opacity: 0.9;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(style);
}

export default summoningCircleArtifact;