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
    
    // Activate the spell (called from globalSpellManager)
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
        this.registerDelayedEffect(heroSelection);
        
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
    },
    
    // Register delayed effect for next battle
    registerDelayedEffect(heroSelection) {
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
    }
};

// ============================================
// BATTLE START EFFECT - POSITION RANDOMIZATION
// ============================================

// Main export function called by battleStartManager
// Applies Expedition position randomization for both players
export async function applyBothPlayersExpeditionEffects(hostDelayedEffects, guestDelayedEffects, battleManager) {
    if (!battleManager.isAuthoritative) {
        console.log('🗺️ Guest - skipping Expedition position randomization (host will handle)');
        return;
    }
    
    console.log('🗺️ Checking for Expedition delayed effects...');
    
    // hostDelayedEffects and guestDelayedEffects are arrays, not DelayedEffectsManager objects
    // Filter the arrays directly to find expedition effects
    const hostEffects = (Array.isArray(hostDelayedEffects) ? hostDelayedEffects : [])
        .filter(effect => effect && effect.type === 'expedition_randomize_positions');
    const hostExpeditionCount = hostEffects.length;
    
    const guestEffects = (Array.isArray(guestDelayedEffects) ? guestDelayedEffects : [])
        .filter(effect => effect && effect.type === 'expedition_randomize_positions');
    const guestExpeditionCount = guestEffects.length;
    
    console.log(`🗺️ Found ${hostExpeditionCount} host Expedition(s), ${guestExpeditionCount} guest Expedition(s)`);
    
    // Apply effects sequentially (host first, then guest)
    if (hostExpeditionCount > 0) {
        await randomizePlayerHeroPositions(battleManager, 'player', hostExpeditionCount);
        
        // Note: Effects are cleared by the system after battle start, no need to manually remove
    }
    
    if (guestExpeditionCount > 0) {
        await randomizePlayerHeroPositions(battleManager, 'opponent', guestExpeditionCount);
        
        // Note: Effects are cleared by the system after battle start, no need to manually remove
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
    
    // Apply swaps using our integrated swap mechanism
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
                await performPositionSwap(battleManager, side, pos1, pos2);
                await battleManager.delay(600);
            }
        }
    }
    
    console.log('🗺️ All swaps completed');
}

// ============================================
// POSITION SWAP FUNCTIONALITY
// (Integrated from TheStormblade for Expedition's use)
// ============================================

// Perform a position swap between two heroes
async function performPositionSwap(battleManager, side, position1, position2) {
    // Get hero references
    const heroes = side === 'player' ? 
        battleManager.playerHeroes : battleManager.opponentHeroes;
    
    const hero1 = heroes[position1];
    const hero2 = heroes[position2];
    
    if (!hero1 || !hero2) {
        console.error(`🗺️ Cannot swap - missing heroes at ${position1} or ${position2}`);
        return;
    }

    // ===== NETWORK SYNC: Send swap data to guest =====
    if (battleManager.isAuthoritative) {
        const swapId = `expedition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const swapData = {
            side: side,
            position1: position1,
            position2: position2,
            swapId: swapId
        };
        
        battleManager.sendBattleUpdate('expedition_position_swap', swapData);
        
        // Wait for guest acknowledgment at higher speeds
        if (battleManager.battleSpeed > 1) {
            await battleManager.waitForGuestAcknowledgment('expedition_swap_' + swapId, 300);
        }
    }

    // Animate the swap effect (this takes about 1600ms total)
    await animatePositionSwap(battleManager, side, position1, position2);

    // ===== SWAP IN HERO REFERENCES ONLY =====
    heroes[position1] = hero2;
    heroes[position2] = hero1;
    
    // Update hero position properties
    hero1.position = position2;
    hero2.position = position1;
    
    // ===== SWAP ABILITIES, SPELLBOOKS, CREATURES, AND EQUIPMENT DATA =====
    if (side === 'player') {
        // Swap player abilities
        if (battleManager.playerAbilities) {
            const tempAbilities = battleManager.playerAbilities[position1];
            battleManager.playerAbilities[position1] = battleManager.playerAbilities[position2];
            battleManager.playerAbilities[position2] = tempAbilities;
        }
        
        // Swap player spellbooks
        if (battleManager.playerSpellbooks) {
            const tempSpellbooks = battleManager.playerSpellbooks[position1];
            battleManager.playerSpellbooks[position1] = battleManager.playerSpellbooks[position2];
            battleManager.playerSpellbooks[position2] = tempSpellbooks;
        }
        
        // Swap player creatures
        if (battleManager.playerCreatures) {
            const tempCreatures = battleManager.playerCreatures[position1];
            battleManager.playerCreatures[position1] = battleManager.playerCreatures[position2];
            battleManager.playerCreatures[position2] = tempCreatures;
        }
        
        // Swap player equipment
        if (battleManager.playerEquips) {
            const tempEquips = battleManager.playerEquips[position1];
            battleManager.playerEquips[position1] = battleManager.playerEquips[position2];
            battleManager.playerEquips[position2] = tempEquips;
        }
    } else {
        // Swap opponent abilities
        if (battleManager.opponentAbilities) {
            const tempAbilities = battleManager.opponentAbilities[position1];
            battleManager.opponentAbilities[position1] = battleManager.opponentAbilities[position2];
            battleManager.opponentAbilities[position2] = tempAbilities;
        }
        
        // Swap opponent spellbooks
        if (battleManager.opponentSpellbooks) {
            const tempSpellbooks = battleManager.opponentSpellbooks[position1];
            battleManager.opponentSpellbooks[position1] = battleManager.opponentSpellbooks[position2];
            battleManager.opponentSpellbooks[position2] = tempSpellbooks;
        }
        
        // Swap opponent creatures
        if (battleManager.opponentCreatures) {
            const tempCreatures = battleManager.opponentCreatures[position1];
            battleManager.opponentCreatures[position1] = battleManager.opponentCreatures[position2];
            battleManager.opponentCreatures[position2] = tempCreatures;
        }
        
        // Swap opponent equipment
        if (battleManager.opponentEquips) {
            const tempEquips = battleManager.opponentEquips[position1];
            battleManager.opponentEquips[position1] = battleManager.opponentEquips[position2];
            battleManager.opponentEquips[position2] = tempEquips;
        }
    }
    
    // ===== SWAP RESISTANCE STACKS =====
    if (battleManager.resistanceManager) {
        battleManager.resistanceManager.swapResistanceStacks(side, position1, position2);
        console.log(`🗺️ Swapped resistance stacks between ${position1} and ${position2}`);
    }

    // ===== SWAP VISUAL ELEMENTS =====
    swapHeroVisuals(side, position1, position2);

    // ===== SWAP ARROW COUNTERS =====
    if (battleManager.arrowSystem) {
        battleManager.arrowSystem.swapArrowCounters(side, position1, position2);
    }
        
    // ===== UPDATE DISPLAYS =====
    battleManager.updateHeroHealthBar(side, position1, hero2.currentHp, hero2.maxHp);
    battleManager.updateHeroHealthBar(side, position2, hero1.currentHp, hero1.maxHp);
    battleManager.updateHeroAttackDisplay(side, position1, hero2);
    battleManager.updateHeroAttackDisplay(side, position2, hero1);
    
    // Update creature visuals
    battleManager.updateCreatureVisuals(side, position1, hero2.creatures);
    battleManager.updateCreatureVisuals(side, position2, hero1.creatures);
    
    // ===== RESTORE STATUS EFFECT VISUALS FOR SWAPPED CREATURES =====
    if (battleManager.statusEffectsManager) {
        // Restore status indicators for creatures that moved to position1
        if (hero2.creatures && hero2.creatures.length > 0) {
            hero2.creatures.forEach(creature => {
                if (creature.alive && creature.statusEffects && creature.statusEffects.length > 0) {
                    creature.statusEffects.forEach(effect => {
                        battleManager.statusEffectsManager.updateStatusVisualIndicator(creature, effect.name);
                    });
                }
            });
        }
        
        // Restore status indicators for creatures that moved to position2
        if (hero1.creatures && hero1.creatures.length > 0) {
            hero1.creatures.forEach(creature => {
                if (creature.alive && creature.statusEffects && creature.statusEffects.length > 0) {
                    creature.statusEffects.forEach(effect => {
                        battleManager.statusEffectsManager.updateStatusVisualIndicator(creature, effect.name);
                    });
                }
            });
        }
    }
    
    // Update necromancy displays if applicable
    if (battleManager.necromancyManager) {
        battleManager.necromancyManager.updateNecromancyStackDisplay(side, position1, hero2.necromancyStacks);
        battleManager.necromancyManager.updateNecromancyStackDisplay(side, position2, hero1.necromancyStacks);
    }
    
    // ===== SAVE TO PERSISTENCE =====
    if (battleManager.isAuthoritative) {
        await battleManager.saveBattleStateToPersistence();
        console.log(`🗺️ Saved expedition-swapped positions to persistence`);
    }
    
    console.log(`🗺️ Expedition-swapped ${hero1.name} to ${position2} and ${hero2.name} to ${position1}`);
}

// Animate position swap between two heroes
async function animatePositionSwap(battleManager, side, position1, position2) {
    // Initial delay to let players process what's about to happen
    await battleManager.delay(250);
    
    // Ensure CSS is loaded
    ensureExpeditionSwapCSS();
    
    // Get hero elements
    const heroElement1 = getHeroElement(side, position1);
    const heroElement2 = getHeroElement(side, position2);
    
    if (!heroElement1 || !heroElement2) {
        console.warn('⚠️ Could not find hero elements for swap animation');
        return;
    }

    // Get positions for wind animation
    const rect1 = heroElement1.getBoundingClientRect();
    const rect2 = heroElement2.getBoundingClientRect();
    
    // Create wind effects connecting both heroes
    const windEffect1 = createWindEffect(rect1, rect2, 'wind1');
    const windEffect2 = createWindEffect(rect2, rect1, 'wind2');
    
    // Add wind effects to document
    document.body.appendChild(windEffect1);
    document.body.appendChild(windEffect2);
    
    // Create swirling wind impact at both heroes
    createWindImpact(heroElement1);
    createWindImpact(heroElement2);
    
    // Wait for wind buildup
    await battleManager.delay(300);
    
    // Animate hero spinning movement
    const movePromise1 = animateSpinningMovement(battleManager, heroElement1, rect1, rect2);
    const movePromise2 = animateSpinningMovement(battleManager, heroElement2, rect2, rect1);
    
    // Keep wind effects active during movement
    animateWindFlow(windEffect1, rect1, rect2, 1200);
    animateWindFlow(windEffect2, rect2, rect1, 1200);
    
    // Wait for movement to complete
    await Promise.all([movePromise1, movePromise2]);
    
    // Remove wind effects with fade
    windEffect1.style.animation = 'expeditionWindFadeOut 0.4s ease-out forwards';
    windEffect2.style.animation = 'expeditionWindFadeOut 0.4s ease-out forwards';
    
    await battleManager.delay(400);
    
    // Clean up
    windEffect1.remove();
    windEffect2.remove();
    
    // Final delay to let players see the result
    await battleManager.delay(300);
}

// Create wind effect between two points
function createWindEffect(fromRect, toRect, id) {
    const wind = document.createElement('div');
    wind.className = 'expedition-swap-wind';
    wind.id = `expedition-${id}`;
    
    const centerX1 = fromRect.left + fromRect.width / 2;
    const centerY1 = fromRect.top + fromRect.height / 2;
    const centerX2 = toRect.left + toRect.width / 2;
    const centerY2 = toRect.top + toRect.height / 2;
    
    const length = Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
    const angle = Math.atan2(centerY2 - centerY1, centerX2 - centerX1) * 180 / Math.PI;
    
    wind.style.cssText = `
        position: fixed;
        left: ${centerX1}px;
        top: ${centerY1}px;
        width: ${length}px;
        height: 8px;
        background: linear-gradient(90deg, 
            rgba(173, 216, 230, 0.8) 0%, 
            rgba(135, 206, 250, 0.9) 25%, 
            rgba(100, 149, 237, 1) 50%, 
            rgba(135, 206, 250, 0.9) 75%, 
            rgba(173, 216, 230, 0.8) 100%);
        border-radius: 4px;
        box-shadow: 0 0 15px rgba(135, 206, 250, 0.6);
        transform-origin: left center;
        transform: rotate(${angle}deg);
        z-index: 500;
        animation: expeditionWindAppear 0.3s ease-out;
        opacity: 0.8;
    `;
    
    // Add wind particle pattern
    const particles = document.createElement('div');
    particles.className = 'expedition-wind-particles';
    particles.innerHTML = '🌪️ 💨 🌀 💨 🌪️';
    particles.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        animation: expeditionWindParticleFlow 0.8s linear infinite;
        white-space: nowrap;
    `;
    
    wind.appendChild(particles);
    
    return wind;
}

// Create swirling wind impact effect
function createWindImpact(heroElement) {
    const impact = document.createElement('div');
    impact.className = 'expedition-wind-impact';
    
    // Create multiple wind symbols for swirling effect
    const windSymbols = ['🌪️', '💨', '🌀'];
    const symbolCount = 6;
    
    for (let i = 0; i < symbolCount; i++) {
        const symbol = document.createElement('div');
        symbol.className = 'expedition-wind-symbol';
        symbol.innerHTML = windSymbols[i % windSymbols.length];
        
        const angle = (360 / symbolCount) * i;
        symbol.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            font-size: 20px;
            z-index: 600;
            pointer-events: none;
            animation: expeditionWindSwirl 1s ease-out forwards;
            --wind-angle: ${angle}deg;
            --wind-radius: 40px;
            transform: translate(-50%, -50%);
            filter: drop-shadow(0 0 8px rgba(135, 206, 250, 0.8));
        `;
        
        impact.appendChild(symbol);
    }
    
    impact.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 600;
    `;
    
    heroElement.appendChild(impact);
    
    // Remove after animation
    setTimeout(() => {
        if (impact.parentNode) {
            impact.remove();
        }
    }, 1000);
}

// Animate hero spinning movement to new position
async function animateSpinningMovement(battleManager, heroElement, fromRect, toRect, duration = 1200) {
    // Always target the battle-hero-card, which is the standard for battle animations
    const heroCard = heroElement.querySelector('.battle-hero-card');
    if (!heroCard) {
        console.warn('Could not find .battle-hero-card element for swap animation');
        return; // Skip animation if card element not found
    }
    
    // Calculate relative movement between the two slots
    const slot1Center = {
        x: fromRect.left + fromRect.width / 2,
        y: fromRect.top + fromRect.height / 2
    };
    const slot2Center = {
        x: toRect.left + toRect.width / 2, 
        y: toRect.top + toRect.height / 2
    };
    
    const deltaX = slot2Center.x - slot1Center.x;
    const deltaY = slot2Center.y - slot1Center.y;
    
    // Apply animation consistently to the hero card
    heroCard.style.transition = `transform ${duration}ms ease-in-out`;
    heroCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(720deg) scale(1.1)`;
    heroCard.style.zIndex = '1000';
    heroCard.style.filter = 'drop-shadow(0 0 15px rgba(135, 206, 250, 0.8))';
    
    await battleManager.delay(duration);
    
    // Reset all styles on the same element
    heroCard.style.transition = '';
    heroCard.style.transform = '';
    heroCard.style.zIndex = '';
    heroCard.style.filter = '';
}

// Animate wind flow to follow hero movement
function animateWindFlow(windElement, fromRect, toRect, duration) {
    let startTime = Date.now();
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out with wind turbulence
        const eased = progress < 0.5 
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // Add slight turbulence to wind flow
        const turbulence = Math.sin(progress * Math.PI * 4) * 5;
        
        // Interpolate positions with turbulence
        const currentX1 = fromRect.left + (toRect.left - fromRect.left) * eased + fromRect.width / 2;
        const currentY1 = fromRect.top + (toRect.top - fromRect.top) * eased + fromRect.height / 2 + turbulence;
        const currentX2 = toRect.left + (fromRect.left - toRect.left) * eased + toRect.width / 2;
        const currentY2 = toRect.top + (fromRect.top - toRect.top) * eased + toRect.height / 2 + turbulence;
        
        const length = Math.sqrt(Math.pow(currentX2 - currentX1, 2) + Math.pow(currentY2 - currentY1, 2));
        const angle = Math.atan2(currentY2 - currentY1, currentX2 - currentX1) * 180 / Math.PI;
        
        windElement.style.left = `${currentX1}px`;
        windElement.style.top = `${currentY1}px`;
        windElement.style.width = `${length}px`;
        windElement.style.transform = `rotate(${angle}deg)`;
        windElement.style.opacity = `${0.8 * (1 - progress * 0.3)}`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
}

// Swap hero visual elements in the DOM
function swapHeroVisuals(side, position1, position2) {
    const slot1 = document.querySelector(`.${side}-slot.${position1}-slot`);
    const slot2 = document.querySelector(`.${side}-slot.${position2}-slot`);
    
    if (!slot1 || !slot2) {
        console.error('🗺️ Could not find hero slots to swap visuals');
        return;
    }

    // Use element-based swapping instead of innerHTML
    try {
        // Create temporary container
        const tempContainer = document.createElement('div');
        tempContainer.style.display = 'none';
        document.body.appendChild(tempContainer);
        
        // Store references to all children
        const slot1Children = Array.from(slot1.children);
        const slot2Children = Array.from(slot2.children);
        
        // Move slot1 children to temp
        slot1Children.forEach(child => tempContainer.appendChild(child));
        
        // Move slot2 children to slot1
        slot2Children.forEach(child => slot1.appendChild(child));
        
        // Move temp children to slot2
        Array.from(tempContainer.children).forEach(child => slot2.appendChild(child));
        
        // Clean up temp container
        tempContainer.remove();
        
        // Add visual feedback
        slot1.classList.add('hero-swapped');
        slot2.classList.add('hero-swapped');
        
        // Remove visual feedback after brief delay
        setTimeout(() => {
            slot1.classList.remove('hero-swapped');
            slot2.classList.remove('hero-swapped');
        }, 400);
        
        console.log(`🗺️ Visual swap completed between ${position1} and ${position2}`);
        
    } catch (error) {
        console.error('🗺️ Error in visual swap, falling back to innerHTML method:', error);
        
        // Fallback to original method
        const content1 = slot1.innerHTML;
        const content2 = slot2.innerHTML;
        slot1.innerHTML = content2;
        slot2.innerHTML = content1;
    }
}

// Get hero element helper
function getHeroElement(side, position) {
    return document.querySelector(`.${side}-slot.${position}-slot`);
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

// Ensure CSS for swap animations
function ensureExpeditionSwapCSS() {
    if (document.getElementById('expeditionSwapStyles')) return;

    const style = document.createElement('style');
    style.id = 'expeditionSwapStyles';
    style.textContent = `
        @keyframes expeditionWindAppear {
            0% {
                opacity: 0;
                transform: rotate(var(--angle, 0deg)) scaleX(0);
                filter: blur(4px);
            }
            100% {
                opacity: 0.8;
                transform: rotate(var(--angle, 0deg)) scaleX(1);
                filter: blur(0px);
            }
        }
        
        @keyframes expeditionWindFadeOut {
            0% {
                opacity: 0.8;
                filter: blur(0px);
            }
            100% {
                opacity: 0;
                filter: blur(6px);
            }
        }
        
        @keyframes expeditionWindParticleFlow {
            0% {
                transform: translate(-50%, -50%) translateX(-100%);
                opacity: 0;
            }
            20% {
                opacity: 1;
            }
            80% {
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) translateX(100%);
                opacity: 0;
            }
        }
        
        @keyframes expeditionWindSwirl {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) 
                           rotate(0deg) 
                           translateX(0px) 
                           scale(0.5);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) 
                           rotate(180deg) 
                           translateX(var(--wind-radius)) 
                           scale(1.2);
            }
            70% {
                opacity: 1;
                transform: translate(-50%, -50%) 
                           rotate(540deg) 
                           translateX(calc(var(--wind-radius) * 1.5)) 
                           scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) 
                           rotate(720deg) 
                           translateX(calc(var(--wind-radius) * 2)) 
                           scale(0.8);
            }
        }
        
        .expedition-swap-wind {
            will-change: transform, opacity, width, left, top;
            background-image: repeating-linear-gradient(
                90deg,
                rgba(135, 206, 250, 0.9) 0px,
                rgba(173, 216, 230, 0.7) 3px,
                rgba(100, 149, 237, 1) 6px,
                rgba(173, 216, 230, 0.7) 9px,
                rgba(135, 206, 250, 0.9) 12px
            );
            animation: expeditionWindPulse 0.6s ease-in-out infinite alternate;
        }
        
        @keyframes expeditionWindPulse {
            from {
                box-shadow: 0 0 15px rgba(135, 206, 250, 0.6);
            }
            to {
                box-shadow: 0 0 25px rgba(135, 206, 250, 0.9);
            }
        }
        
        .expedition-wind-particles {
            color: rgba(135, 206, 250, 0.9);
            text-shadow: 0 0 8px rgba(135, 206, 250, 0.8);
        }
        
        .expedition-wind-impact {
            will-change: transform, opacity;
        }
        
        .expedition-wind-symbol {
            will-change: transform, opacity;
            color: rgba(135, 206, 250, 1);
            text-shadow: 
                0 0 10px rgba(135, 206, 250, 0.8),
                0 0 20px rgba(173, 216, 230, 0.6);
        }
    `;

    document.head.appendChild(style);
}

// Add CSS animations for card drawing
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

// ============================================
// GUEST HANDLER FOR NETWORK SYNC
// ============================================

// Handle expedition position swap on guest side
export async function handleGuestExpeditionSwap(battleManager, data) {
    const { side, position1, position2, swapId } = data;
    
    // Convert absolute side to local side
    const targetIsMyPlayer = (side === 'player' && battleManager.isHost) || 
                            (side === 'opponent' && !battleManager.isHost);
    const localSide = targetIsMyPlayer ? 'player' : 'opponent';
    
    // Get hero references
    const heroes = localSide === 'player' ? 
        battleManager.playerHeroes : battleManager.opponentHeroes;
    
    const hero1 = heroes[position1];
    const hero2 = heroes[position2];
    
    if (!hero1 || !hero2) {
        console.error(`🗺️ Guest: Cannot swap - missing heroes at ${position1} or ${position2}`);
        // Send acknowledgment even on error
        if (swapId) {
            battleManager.sendAcknowledgment('expedition_swap_' + swapId);
        }
        return;
    }

    // Animate the swap effect
    await animatePositionSwap(battleManager, localSide, position1, position2);
    
    // ===== SWAP IN HERO REFERENCES =====
    heroes[position1] = hero2;
    heroes[position2] = hero1;
    
    // Update hero position properties
    hero1.position = position2;
    hero2.position = position1;
    
    // ===== SWAP ABILITIES, SPELLBOOKS, CREATURES, AND EQUIPMENT DATA =====
    if (localSide === 'player') {
        // Swap player data
        if (battleManager.playerAbilities) {
            const temp = battleManager.playerAbilities[position1];
            battleManager.playerAbilities[position1] = battleManager.playerAbilities[position2];
            battleManager.playerAbilities[position2] = temp;
        }
        
        if (battleManager.playerSpellbooks) {
            const temp = battleManager.playerSpellbooks[position1];
            battleManager.playerSpellbooks[position1] = battleManager.playerSpellbooks[position2];
            battleManager.playerSpellbooks[position2] = temp;
        }
        
        if (battleManager.playerCreatures) {
            const temp = battleManager.playerCreatures[position1];
            battleManager.playerCreatures[position1] = battleManager.playerCreatures[position2];
            battleManager.playerCreatures[position2] = temp;
        }
        
        if (battleManager.playerEquips) {
            const temp = battleManager.playerEquips[position1];
            battleManager.playerEquips[position1] = battleManager.playerEquips[position2];
            battleManager.playerEquips[position2] = temp;
        }
    } else {
        // Swap opponent data
        if (battleManager.opponentAbilities) {
            const temp = battleManager.opponentAbilities[position1];
            battleManager.opponentAbilities[position1] = battleManager.opponentAbilities[position2];
            battleManager.opponentAbilities[position2] = temp;
        }
        
        if (battleManager.opponentSpellbooks) {
            const temp = battleManager.opponentSpellbooks[position1];
            battleManager.opponentSpellbooks[position1] = battleManager.opponentSpellbooks[position2];
            battleManager.opponentSpellbooks[position2] = temp;
        }
        
        if (battleManager.opponentCreatures) {
            const temp = battleManager.opponentCreatures[position1];
            battleManager.opponentCreatures[position1] = battleManager.opponentCreatures[position2];
            battleManager.opponentCreatures[position2] = temp;
        }
        
        if (battleManager.opponentEquips) {
            const temp = battleManager.opponentEquips[position1];
            battleManager.opponentEquips[position1] = battleManager.opponentEquips[position2];
            battleManager.opponentEquips[position2] = temp;
        }
    }
    
    // ===== SWAP RESISTANCE STACKS =====
    if (battleManager.resistanceManager) {
        battleManager.resistanceManager.swapResistanceStacks(localSide, position1, position2);
    }

    // ===== RE-RENDER EVERYTHING =====
    if (battleManager.battleScreen) {
        // Re-render heroes
        if (typeof battleManager.battleScreen.renderHeroes === 'function') {
            battleManager.battleScreen.renderHeroes();
        }
        
        // Re-render abilities
        if (typeof battleManager.battleScreen.renderAbilities === 'function') {
            battleManager.battleScreen.renderAbilities();
        }
        
        // Re-render equipment
        if (typeof battleManager.battleScreen.renderEquipmentForHero === 'function') {
            battleManager.battleScreen.renderEquipmentForHero(localSide, position1);
            battleManager.battleScreen.renderEquipmentForHero(localSide, position2);
        }
        
        // Re-render creatures
        if (typeof battleManager.battleScreen.renderCreaturesAfterInit === 'function') {
            battleManager.battleScreen.renderCreaturesAfterInit();
        }
    }
    
    // Send acknowledgment back to host
    if (swapId) {
        battleManager.sendAcknowledgment('expedition_swap_' + swapId);
    }
    
    console.log(`🗺️ Guest: Completed swap ${position1} <-> ${position2} on ${localSide} side`);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.expeditionSpell = expeditionSpell;
    window.handleGuestExpeditionSwap = handleGuestExpeditionSwap;
}