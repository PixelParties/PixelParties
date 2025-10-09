// Spells/expedition.js - Expedition Global Spell Implementation
// Draws 3 random cards from deck, auto-casts MagicArts spells without action cost, adds rest to hand
// Delayed Effect: Randomizes all hero positions at next battle start

import { getCardInfo } from '../cardDatabase.js';

export const expeditionSpell = {
    name: 'Expedition',
    
    // Check if the spell can be activated
    canActivate(heroSelection) {
        const result = { canActivate: false, reason: '', heroName: '' };
        
        // Get Expedition card info from database
        const expeditionInfo = heroSelection.getCardInfo('Expedition');
        if (!expeditionInfo) {
            result.reason = 'Expedition spell info not found in database!';
            return result;
        }
        
        const requiredSpellSchool = expeditionInfo.spellSchool;
        const requiredLevel = expeditionInfo.level;
        
        // Check if player has any heroes
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => formation[pos] !== null);
        
        if (heroPositions.length === 0) {
            result.reason = 'You need at least one Hero to cast Expedition!';
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
            result.reason = `No Hero has ${formattedSpellSchool} at level ${requiredLevel} or higher to cast Expedition!`;
            return result;
        }
        
        result.canActivate = true;
        result.heroName = castingHeroName;
        return result;
    },
    
    // Select 3 random cards from deck (duplicates allowed)
    selectRandomCards(heroSelection, count = 3) {
        const deck = heroSelection.deckManager.getDeck();
        
        if (deck.length === 0) {
            return [];
        }
        
        const selectedCards = [];
        
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * deck.length);
            selectedCards.push(deck[randomIndex]);
        }
        
        return selectedCards;
    },
    
    // Check if a spell is a MagicArts spell and find a valid caster
    findMagicArtsSpellCaster(heroSelection, spellName) {
        const cardInfo = getCardInfo(spellName);
        
        // Must be a spell with MagicArts spell school
        if (!cardInfo || cardInfo.cardType !== 'Spell' || cardInfo.spellSchool !== 'MagicArts') {
            return null;
        }
        
        // Check each hero position to find a valid caster
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'];
        
        for (const position of heroPositions) {
            if (!formation[position]) continue;
            
            // Use centralized spell validation from handManager
            const canUse = heroSelection.handManager.canHeroUseSpell(position, spellName);
            
            if (canUse.canUse) {
                return {
                    position: position,
                    heroName: formation[position].name,
                    isFree: canUse.isFree || false
                };
            }
        }
        
        return null;
    },
    
    // Cast a MagicArts spell without consuming an action
    async castMagicArtsSpell(heroSelection, spellName, casterPosition, globalSpellManager) {
        try {
            // Get card info to check if it's a global spell
            const cardInfo = getCardInfo(spellName);
            
            if (!cardInfo) {
                console.error(`Card info not found for ${spellName}`);
                return false;
            }
            
            // Check if it's a global spell
            if (cardInfo.global) {
                // For global spells, we need to temporarily add to hand, then activate
                
                // Temporarily add spell to hand
                const addedToHand = heroSelection.handManager.addCardToHand(spellName);
                if (!addedToHand) {
                    console.error(`Failed to add ${spellName} to hand for casting`);
                    return false;
                }
                
                // Get the card index (it should be the last card)
                const cardIndex = heroSelection.handManager.getHandSize() - 1;
                
                // BYPASS handleGlobalSpellActivation (which checks actions)
                // and call handleGlobalSpellClick directly (the actual spell logic)
                const result = await globalSpellManager.handleGlobalSpellClick(
                    cardIndex,
                    spellName,
                    heroSelection
                );
                
                // If spell failed to cast, remove it from hand
                if (!result) {
                    heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
                    return false;
                }
                
                return true;
                
            } else {
                // For non-global spells, use the regular spell learning system
                // (This shouldn't happen for MagicArts spells, but included for completeness)
                console.warn(`${spellName} is not a global spell - this shouldn't happen for MagicArts spells`);
                return false;
            }
            
        } catch (error) {
            console.error(`Failed to cast ${spellName}:`, error);
            return false;
        }
    },
    
    // Process cards sequentially with animations
    async processCardsSequentially(heroSelection, cards, globalSpellManager) {
        const cardAnalysis = cards.map(cardName => {
            const casterInfo = this.findMagicArtsSpellCaster(heroSelection, cardName);
            return {
                cardName: cardName,
                casterInfo: casterInfo,
                isCastable: casterInfo !== null
            };
        });
        
        // Show animation and process cards
        const results = await this.showExpeditionAnimation(heroSelection, cardAnalysis, globalSpellManager);
        
        return results;
    },
    
    // Create and manage the expedition animation
    async showExpeditionAnimation(heroSelection, cardAnalysis, globalSpellManager) {
        return new Promise((resolve) => {
            // Create container
            const container = document.createElement('div');
            container.className = 'expedition-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                pointer-events: none;
            `;
            
            // Create cards wrapper
            const cardsWrapper = document.createElement('div');
            cardsWrapper.className = 'expedition-cards-wrapper';
            cardsWrapper.style.cssText = `
                display: flex;
                gap: 30px;
                align-items: center;
            `;
            
            // Create card elements
            const cardElements = cardAnalysis.map((analysis, index) => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'expedition-card';
                cardDiv.dataset.index = index;
                
                const cardPath = `./Cards/All/${analysis.cardName}.png`;
                const cardDisplayName = heroSelection.formatCardName ? 
                    heroSelection.formatCardName(analysis.cardName) : analysis.cardName;
                
                cardDiv.innerHTML = `
                    <img src="${cardPath}" 
                         alt="${cardDisplayName}" 
                         class="expedition-card-image"
                         onerror="this.src='./Cards/placeholder.png'">
                    <div class="expedition-card-name">${cardDisplayName}</div>
                `;
                
                cardDiv.style.cssText = `
                    position: relative;
                    width: 180px;
                    opacity: 0;
                    transform: translateX(200px);
                    transition: all 0.6s ease-out;
                    transition-delay: ${index * 0.2}s;
                `;
                
                cardsWrapper.appendChild(cardDiv);
                return cardDiv;
            });
            
            container.appendChild(cardsWrapper);
            document.body.appendChild(container);
            
            // Trigger slide-in animation
            setTimeout(() => {
                cardElements.forEach(card => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateX(0)';
                });
            }, 100);
            
            // Wait for all cards to slide in, then process sequentially
            setTimeout(async () => {
                const results = {
                    spellsCast: [],
                    cardsAdded: [],
                    handFull: false
                };
                
                // Process each card sequentially
                for (let i = 0; i < cardAnalysis.length; i++) {
                    const analysis = cardAnalysis[i];
                    const cardElement = cardElements[i];
                    
                    if (analysis.isCastable) {
                        // GLOW AND GROW for castable spell
                        cardElement.style.transition = 'all 0.5s ease-in-out';
                        cardElement.style.transform = 'scale(1.5)';
                        cardElement.style.filter = 'drop-shadow(0 0 25px #4a00e0) brightness(1.3)';
                        cardElement.style.boxShadow = '0 0 40px #8e2de2';
                        
                        // Wait for glow animation
                        await this.delay(800);
                        
                        // Cast the spell
                        const castResult = await this.castMagicArtsSpell(
                            heroSelection,
                            analysis.cardName,
                            analysis.casterInfo.position,
                            globalSpellManager
                        );
                        
                        if (castResult) {
                            results.spellsCast.push({
                                spell: analysis.cardName,
                                caster: analysis.casterInfo.heroName
                            });
                        }
                        
                        // Vanish the card
                        cardElement.style.transition = 'all 0.3s ease-out';
                        cardElement.style.opacity = '0';
                        cardElement.style.transform = 'scale(0.5)';
                        
                        await this.delay(400);
                        
                    } else {
                        // Regular card - just vanish and add to hand
                        cardElement.style.transition = 'all 0.3s ease-out';
                        cardElement.style.opacity = '0';
                        cardElement.style.transform = 'scale(0.5)';
                        
                        await this.delay(200);
                        
                        // Try to add to hand
                        if (!heroSelection.handManager.isHandFull()) {
                            const added = heroSelection.handManager.addCardToHand(analysis.cardName);
                            if (added) {
                                results.cardsAdded.push(analysis.cardName);
                            }
                        } else {
                            results.handFull = true;
                        }
                        
                        await this.delay(200);
                    }
                }
                
                // Clean up container
                container.style.opacity = '0';
                container.style.transition = 'opacity 0.3s ease-out';
                
                setTimeout(() => {
                    container.remove();
                    resolve(results);
                }, 300);
                
            }, 100 + (cardAnalysis.length * 200) + 400);
        });
    },
    
    // Helper delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Format results message
    formatResultsMessage(results, totalCards) {
        const parts = [];
        
        if (results.spellsCast.length > 0) {
            const spellsWord = results.spellsCast.length === 1 ? 'spell' : 'spells';
            parts.push(`Cast ${results.spellsCast.length} ${spellsWord}`);
        }
        
        if (results.cardsAdded.length > 0) {
            const cardsWord = results.cardsAdded.length === 1 ? 'card' : 'cards';
            parts.push(`added ${results.cardsAdded.length} ${cardsWord} to hand`);
        }
        
        if (results.handFull && results.cardsAdded.length < totalCards - results.spellsCast.length) {
            parts.push('(hand was full)');
        }
        
        if (parts.length === 0) {
            return 'Expedition revealed 3 cards!';
        }
        
        return 'Expedition: ' + parts.join(', ') + '!';
    },
    
    // Register the delayed expedition randomization effect for next battle
    async registerDelayedExpeditionEffect(heroSelection) {
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        // Add expedition delayed effect
        heroSelection.delayedEffects.push({
            type: 'expedition_randomize_positions',
            source: 'Expedition',
            appliedAt: Date.now(),
            description: 'All your heroes will randomize positions at battle start'
        });
        
        console.log('🗺️ Registered Expedition position randomization for next battle');
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
        
        // Select 3 random cards
        const selectedCards = this.selectRandomCards(heroSelection, 3);
        
        if (selectedCards.length === 0) {
            return {
                success: false,
                message: 'Expedition failed - your deck is empty!',
                consumed: false
            };
        }
        
        // Core spell execution - remove from hand and consume action
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
            const cardInfo = heroSelection.getCardInfo('Expedition');
            if (cardInfo && cardInfo.action && heroSelection.actionManager) {
                heroSelection.actionManager.consumeAction();
            }
            
        } catch (error) {
            return {
                success: false,
                message: 'Failed to cast Expedition - core execution failed',
                consumed: consumedCard
            };
        }
        
        // Process cards with animation (this handles spell casting and hand adding)
        const results = await this.processCardsSequentially(heroSelection, selectedCards, globalSpellManager);
        
        // Register delayed expedition randomization effect
        await this.registerDelayedExpeditionEffect(heroSelection);
        
        // Create success message
        const message = this.formatResultsMessage(results, selectedCards.length);
        
        // Non-critical operations - update displays
        try {
            heroSelection.updateHandDisplay();
            if (heroSelection.updateActionDisplay) {
                heroSelection.updateActionDisplay();
            }
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Send formation update to opponent
            await heroSelection.sendFormationUpdate();
            
        } catch (error) {
            console.error('Expedition display update error:', error);
        }
        
        return {
            success: true,
            message: message + ' Heroes will scramble at battle start!',
            consumed: true,
            results: results
        };
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

// ===== BATTLE START INTEGRATION =====

// Apply delayed expedition effects from both players at battle start
export async function applyBothPlayersExpeditionEffects(hostEffects, guestEffects, battleManager) {
    console.log('🗺️ Processing Expedition delayed effects from both players...');
    
    // Process host's expedition effects (apply to host's heroes)
    if (hostEffects && hostEffects.length > 0) {
        const hostExpeditionEffects = hostEffects.filter(
            effect => effect.type === 'expedition_randomize_positions' && effect.source === 'Expedition'
        );
        
        if (hostExpeditionEffects.length > 0) {
            console.log('🗺️ Applying HOST Expedition randomization...');
            await randomizePlayerHeroPositions(battleManager, 'player', hostExpeditionEffects.length);
        }
    }
    
    // Process guest's expedition effects (apply to guest's heroes)
    if (guestEffects && guestEffects.length > 0) {
        const guestExpeditionEffects = guestEffects.filter(
            effect => effect.type === 'expedition_randomize_positions' && effect.source === 'Expedition'
        );
        
        if (guestExpeditionEffects.length > 0) {
            console.log('🗺️ Applying GUEST Expedition randomization...');
            await randomizePlayerHeroPositions(battleManager, 'opponent', guestExpeditionEffects.length);
        }
    }
}

// Randomize hero positions for a player
async function randomizePlayerHeroPositions(battleManager, side, effectCount = 1) {
    const heroes = side === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
    
    // Get living hero positions
    const occupiedPositions = ['left', 'center', 'right'].filter(pos => heroes[pos] && heroes[pos].alive);
    
    if (occupiedPositions.length <= 1) {
        console.log('🗺️ Not enough heroes to randomize positions');
        battleManager.addCombatLog(
            '🗺️ Expedition effect activated, but not enough heroes to randomize!',
            side === 'player' ? 'error' : 'success'
        );
        return;
    }
    
    // Show expedition card activation animation
    await showExpeditionActivationAnimation(battleManager, side);
    
    // Generate valid randomization (no hero stays in same position)
    const newPositions = generateValidRandomization(occupiedPositions);
    
    console.log('🗺️ Randomization plan:', {
        original: occupiedPositions,
        new: newPositions,
        mapping: occupiedPositions.map((orig, i) => `${orig} -> ${newPositions[i]}`)
    });
    
    // Apply swaps using TheStormblade's infrastructure
    await applyPositionSwaps(battleManager, side, occupiedPositions, newPositions);
    
    // Log the result
    const sideLabel = side === 'player' ? 'Your' : "Opponent's";
    const plural = effectCount > 1 ? 's' : '';
    battleManager.addCombatLog(
        `🗺️ ${sideLabel} Expedition${plural} activated - heroes scramble to new positions!`,
        side === 'player' ? 'error' : 'success'
    );
}

// Generate random permutation where no element stays in same position (derangement)
function generateValidRandomization(positions) {
    if (positions.length <= 1) return positions;
    
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
        // Create shuffled copy
        const shuffled = [...positions].sort(() => Math.random() - 0.5);
        
        // Check if valid (no position stays the same)
        const isValid = positions.every((pos, i) => pos !== shuffled[i]);
        
        if (isValid) {
            return shuffled;
        }
        
        attempts++;
    }
    
    // Fallback: deterministic derangements for small cases
    if (positions.length === 2) {
        // Simple swap
        return [positions[1], positions[0]];
    } else if (positions.length === 3) {
        // Rotate: [A, B, C] -> [B, C, A]
        return [positions[1], positions[2], positions[0]];
    }
    
    console.warn('🗺️ Failed to generate valid randomization after 100 attempts, using fallback');
    return positions;
}

// Apply the position swaps to achieve the target configuration
async function applyPositionSwaps(battleManager, side, originalPositions, newPositions) {
    // Create mapping of where each hero needs to go
    const targetPosition = {};
    originalPositions.forEach((origPos, i) => {
        targetPosition[origPos] = newPositions[i];
    });
    
    console.log('🗺️ Swap plan:', targetPosition);
    
    // Import TheStormblade's swap mechanism
    const { TheStormbladeEffect } = await import('../Artifacts/theStormblade.js');
    const tempStormblade = new TheStormbladeEffect(null, battleManager);
    
    // Use cycle decomposition to perform minimal swaps
    const visited = new Set();
    
    for (const startPos of originalPositions) {
        if (visited.has(startPos)) continue;
        
        // Trace the cycle starting from this position
        const cycle = [];
        let current = startPos;
        
        while (!visited.has(current)) {
            visited.add(current);
            cycle.push(current);
            current = targetPosition[current];
        }
        
        console.log('🗺️ Processing cycle:', cycle);
        
        // Perform swaps in cycle (each swap brings one hero to correct position)
        if (cycle.length > 1) {
            for (let i = 0; i < cycle.length - 1; i++) {
                const pos1 = cycle[i];
                const pos2 = cycle[i + 1];
                
                console.log(`🗺️ Swapping ${pos1} <-> ${pos2}`);
                await tempStormblade.performWindSwap(side, pos1, pos2);
                await battleManager.delay(600);
            }
        }
    }
    
    console.log('🗺️ All swaps completed');
}

// Show expedition card activation animation above center slot
async function showExpeditionActivationAnimation(battleManager, side) {
    const container = document.createElement('div');
    container.className = 'expedition-activation';
    
    const centerSlot = document.querySelector(`.${side}-slot.center-slot`);
    if (!centerSlot) {
        console.warn('🗺️ Could not find center slot for animation');
        return;
    }
    
    const rect = centerSlot.getBoundingClientRect();
    
    container.innerHTML = `
        <img src="./Cards/All/Expedition.png" 
             alt="Expedition" 
             class="expedition-activation-card"
             onerror="this.src='./Cards/placeholder.png'">
        <div class="expedition-activation-text">🗺️ Expedition!</div>
    `;
    
    container.style.cssText = `
        position: fixed;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top - 120}px;
        transform: translate(-50%, 0);
        z-index: 1000;
        pointer-events: none;
        animation: expeditionActivation 2s ease-out forwards;
    `;
    
    document.body.appendChild(container);
    
    await battleManager.delay(2000);
    container.remove();
}

// Visual feedback functions
function showGlobalSpellSuccess(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'global-spell-success-popup';
    feedbackDiv.innerHTML = `
        <div class="global-spell-success-content">
            <span class="global-spell-success-icon">🗺️</span>
            <span class="global-spell-success-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10001;
        pointer-events: none;
        animation: globalSpellSuccessBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(46, 204, 113, 0.5);
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
        z-index: 10001;
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
if (typeof document !== 'undefined' && !document.getElementById('expeditionSpellStyles')) {
    const style = document.createElement('style');
    style.id = 'expeditionSpellStyles';
    style.textContent = `
        /* Card drawing animation styles */
        .expedition-card {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            border-radius: 12px;
            padding: 10px;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        }
        
        .expedition-card-image {
            width: 100%;
            height: auto;
            border-radius: 8px;
            display: block;
        }
        
        .expedition-card-name {
            margin-top: 8px;
            text-align: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        /* Battle activation animation styles */
        .expedition-activation {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        
        .expedition-activation-card {
            width: 140px;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(46, 204, 113, 0.7);
            border: 3px solid rgba(255, 255, 255, 0.6);
        }
        
        .expedition-activation-text {
            color: #2ecc71;
            font-size: 20px;
            font-weight: bold;
            text-shadow: 
                0 0 10px rgba(46, 204, 113, 0.8),
                0 0 20px rgba(46, 204, 113, 0.6),
                2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        @keyframes expeditionActivation {
            0% {
                opacity: 0;
                transform: translate(-50%, -30px) scale(0.7) rotate(-5deg);
            }
            15% {
                opacity: 1;
                transform: translate(-50%, 0) scale(1.15) rotate(3deg);
            }
            30% {
                transform: translate(-50%, 0) scale(1.05) rotate(-2deg);
            }
            40% {
                transform: translate(-50%, 0) scale(1.1) rotate(1deg);
            }
            75% {
                opacity: 1;
                transform: translate(-50%, 0) scale(1) rotate(0deg);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, 15px) scale(0.85) rotate(0deg);
            }
        }
        
        /* Success/Error popup animations */
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
    window.expeditionSpell = expeditionSpell;
}