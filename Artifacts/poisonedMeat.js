// poisonedMeat.js - PoisonedMeat Artifact Handler Module (FIXED)

export const poisonedMeatArtifact = {
    // Card name this artifact handles
    cardName: 'PoisonedMeat',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`PoisonedMeat clicked at index ${cardIndex}`);
        
        // Apply the artifact effect
        await this.applyPoisonedMeatEffect(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`PoisonedMeat dragged outside hand from index ${cardIndex}`);
        
        // Apply the artifact effect
        await this.applyPoisonedMeatEffect(cardIndex, heroSelection);
    },
    
    // Core logic to apply poisoned meat effect
    async applyPoisonedMeatEffect(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const heroCreatureManager = heroSelection.getHeroCreatureManager();
        
        if (!handManager || !heroCreatureManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Check gold cost and deduct it
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 0;
        const playerGold = heroSelection.getGoldManager().getPlayerGold();
        
        if (playerGold < cost) {
            this.showError(`You need ${cost} Gold to use ${this.cardName}!`);
            return;
        }
        
        // Count total creatures controlled by player
        const totalCreatures = heroCreatureManager.getTotalCreatureCount();
        
        // Calculate cards to draw: 1 base + 1 per creature, max 4
        const cardsToDraw = Math.min(4, 1 + totalCreatures);
        
        // Remove card from hand first
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        //  Deduct gold cost if applicable
        if (cost > 0) {
            heroSelection.getGoldManager().addPlayerGold(-cost, 'poisoned_meat_use');
            console.log(`🥩 Deducted ${cost} gold for PoisonedMeat use`);
        }
        
        // Draw cards
        const drawnCards = handManager.drawCards(cardsToDraw);
        
        console.log(`🥩 PoisonedMeat: Drew ${cardsToDraw} cards (1 base + ${totalCreatures} from creatures)`);
        
        // Register delayed poison effect for next battle
        await this.registerDelayedPoisonEffect(heroSelection);
        
        // Show visual feedback
        this.showPoisonedMeatAnimation(cardIndex, cardsToDraw, totalCreatures);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay(); // 🔧 FIX 1: Update gold display after deduction
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`🥩 PoisonedMeat consumed! Drew ${cardsToDraw} cards. Poison curse registered for next battle.`);
    },
    
    // Register the delayed poison effect for next battle
    async registerDelayedPoisonEffect(heroSelection) {
        // Method 1: Try to integrate with potionHandler system (preferred)
        if (window.potionHandler && typeof window.potionHandler.addBattleStartEffect === 'function') {
            window.potionHandler.addBattleStartEffect('poisoned_meat_curse', {
                type: 'poison_all_player_targets',
                stacks: 1,
                source: 'PoisonedMeat',
                description: 'All your targets will be poisoned at battle start'
            });
            console.log('🥩 Registered poison curse with potionHandler for next battle');
            return;
        }
        
        // Method 2: Fallback - store in heroSelection state
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        // 🔧 FIX 2: Don't remove existing effects - allow stacking
        // Find existing PoisonedMeat effect to accumulate stacks
        let existingEffect = heroSelection.delayedEffects.find(
            effect => effect.source === 'PoisonedMeat' && effect.type === 'poison_all_player_targets'
        );
        
        if (existingEffect) {
            // 🔧 FIX 2: Increment stacks instead of replacing
            existingEffect.stacks += 1;
            existingEffect.appliedAt = Date.now(); // Update timestamp
            console.log(`🥩 Increased PoisonedMeat curse stacks to ${existingEffect.stacks}`);
        } else {
            // 🔧 FIX 2: Add new effect if none exists
            heroSelection.delayedEffects.push({
                type: 'poison_all_player_targets',
                stacks: 1,
                source: 'PoisonedMeat',
                appliedAt: Date.now(),
                description: 'All your targets will be poisoned at battle start'
            });
            console.log('🥩 Added new PoisonedMeat curse with 1 stack');
        }
        
        console.log('🥩 Stored poison curse in heroSelection for next battle');
    },
    
    // Show poisoned meat consumption animation
    showPoisonedMeatAnimation(cardIndex, cardsToDraw, creatureCount) {
        // Create visual effect burst
        const effectBurst = document.createElement('div');
        effectBurst.className = 'poisoned-meat-effect-burst';
        effectBurst.innerHTML = `
            <div class="poisoned-meat-content">
                <div class="meat-icon">🥩</div>
                <div class="effect-details">
                    <div class="cards-drawn">
                        <span class="card-icon">🃏</span>
                        <span class="effect-text">+${cardsToDraw} Cards!</span>
                    </div>
                    ${creatureCount > 0 ? `
                    <div class="creature-bonus">
                        <span class="creature-icon">🐾</span>
                        <span class="effect-text">${creatureCount} Creature Bonus</span>
                    </div>
                    ` : ''}
                    <div class="poison-warning">
                        <span class="poison-icon">☠️</span>
                        <span class="warning-text">Curse Applied!</span>
                    </div>
                </div>
            </div>
        `;
        
        // Position near the consumed card
        this.positionEffectBurst(effectBurst, cardIndex);
        
        // Add to DOM
        document.body.appendChild(effectBurst);
        
        // Remove after animation
        setTimeout(() => {
            if (effectBurst && effectBurst.parentNode) {
                effectBurst.remove();
            }
        }, 3000);
        
        // Play sound effect
        this.playPoisonedMeatSound();
    },
    
    // Position the visual effect near the card
    positionEffectBurst(effectBurst, cardIndex) {
        const handContainer = document.querySelector('.hand-cards');
        
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                effectBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                effectBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                effectBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                effectBurst.style.top = `${handRect.top}px`;
            }
        } else {
            // Fallback to screen center
            effectBurst.style.left = '50%';
            effectBurst.style.top = '50%';
        }
    },
    
    // Play sound effect
    playPoisonedMeatSound() {
        console.log('🎵 *ominous chomping and poisonous bubbling sounds*');
    },
    
    // 🔧 FIX 1: Add error display method similar to other artifacts
    showError(message) {
        const error = document.createElement('div');
        error.className = 'poisoned-meat-error';
        error.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
            </div>
        `;
        
        error.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            animation: poisonedMeatError 3s ease-out forwards;
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(error);
        
        setTimeout(() => {
            if (error.parentNode) {
                error.remove();
            }
        }, 3000);
    },
    
    // Export state for persistence - IMPORTANT for delayed effects
    exportArtifactState() {
        return {
            artifact: 'PoisonedMeat',
            version: '1.0.0'
        };
    }
};

// ===== GLOBAL UTILITY FUNCTIONS FOR BATTLE INTEGRATION =====

// Static method to check for and apply battle-start poison effects
// This should be called by the battle system at battle start
export async function applyPoisonedMeatDelayedEffects(battleManager, heroSelection) {
    if (!heroSelection || !heroSelection.delayedEffects) {
        return;
    }
    
    // Find poison effects from PoisonedMeat
    const poisonEffects = heroSelection.delayedEffects.filter(
        effect => effect.type === 'poison_all_player_targets' && effect.source === 'PoisonedMeat'
    );
    
    if (poisonEffects.length === 0) {
        return;
    }
    
    console.log('🥩 Applying PoisonedMeat curse at battle start...');
    
    // Apply poison to all player targets
    await poisonAllPlayerTargets(battleManager, poisonEffects);
    
    // Remove the processed effects
    heroSelection.delayedEffects = heroSelection.delayedEffects.filter(
        effect => !(effect.type === 'poison_all_player_targets' && effect.source === 'PoisonedMeat')
    );
    
    // Save updated state
    if (heroSelection.saveGameState) {
        await heroSelection.saveGameState();
    }
}

// NEW: Apply delayed effects from both players
export async function applyBothPlayersDelayedEffects(hostEffects, guestEffects, battleManager) {
    console.log('🥩 Processing delayed artifact effects from both players...');
    
    // Process host's delayed effects (apply to host's heroes)
    if (hostEffects && hostEffects.length > 0) {
        const hostPoisonEffects = hostEffects.filter(
            effect => effect.type === 'poison_all_player_targets' && effect.source === 'PoisonedMeat'
        );
        
        if (hostPoisonEffects.length > 0) {
            console.log('🥩 Applying HOST PoisonedMeat curse...');
            await poisonPlayerTargets(battleManager, hostPoisonEffects, 'host');
        }
    }
    
    // Process guest's delayed effects (apply to guest's heroes)
    if (guestEffects && guestEffects.length > 0) {
        const guestPoisonEffects = guestEffects.filter(
            effect => effect.type === 'poison_all_player_targets' && effect.source === 'PoisonedMeat'
        );
        
        if (guestPoisonEffects.length > 0) {
            console.log('🥩 Applying GUEST PoisonedMeat curse...');
            await poisonPlayerTargets(battleManager, guestPoisonEffects, 'guest');
        }
    }
}

// Apply poison to targets of a specific player (host or guest)
async function poisonPlayerTargets(battleManager, poisonEffects, playerSide) {
    if (!battleManager.statusEffectsManager) {
        console.error('StatusEffectsManager not available for PoisonedMeat curse');
        return;
    }
    
    // Calculate total stacks from all effects
    const totalStacks = poisonEffects.reduce((sum, effect) => sum + effect.stacks, 0);
    
    let targetsAffected = 0;
    
    // Determine which heroes to poison based on player side
    // From the host's perspective: host = playerHeroes, guest = opponentHeroes
    const heroesToPoison = playerSide === 'host' 
        ? battleManager.playerHeroes 
        : battleManager.opponentHeroes;
    
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const logType = playerSide === 'host' ? 'error' : 'success';
    
    // Apply poison to all of this player's heroes
    ['left', 'center', 'right'].forEach(position => {
        const hero = heroesToPoison[position];
        if (hero && hero.alive) {
            console.log(`🥩 Applying poison to ${playerName}'s ${hero.name} (id: ${hero.id || 'no-id'})`);
            battleManager.statusEffectsManager.applyStatusEffect(hero, 'poisoned', totalStacks);
            
            // Verify it was applied
            const poisonStacks = battleManager.statusEffectsManager.getStatusEffectStacks(hero, 'poisoned');
            console.log(`🥩 Verification: ${hero.name} now has ${poisonStacks} poison stacks`);
            targetsAffected++;

            // Apply poison to hero's creatures
            if (hero.creatures && hero.creatures.length > 0) {
                hero.creatures.forEach(creature => {
                    if (creature.alive) {
                        battleManager.statusEffectsManager.applyStatusEffect(creature, 'poisoned', totalStacks);
                        targetsAffected++;
                        console.log(`☠️ PoisonedMeat curse: Applied ${totalStacks} poison to ${playerName}'s ${creature.name}`);
                    }
                });
            }
        }
    });
    
    // Add combat log message
    if (targetsAffected > 0) {
        const message = playerSide === 'host' 
            ? `🥩 Your PoisonedMeat curse activates! ${targetsAffected} of your targets are poisoned with ${totalStacks} stack${totalStacks > 1 ? 's' : ''}!`
            : `🥩 Opponent's PoisonedMeat curse activates! ${targetsAffected} of their targets are poisoned with ${totalStacks} stack${totalStacks > 1 ? 's' : ''}!`;
            
        battleManager.addCombatLog(message, logType);
    }
    
    // Small delay for visual effect processing
    await battleManager.delay(300);
}

// Clear processed delayed effects from Firebase
async function clearProcessedDelayedEffects(battleManager, hostEffects, guestEffects) {
    if (!battleManager.roomManager || !battleManager.roomManager.getRoomRef()) {
        return;
    }
    
    try {
        const roomRef = battleManager.roomManager.getRoomRef();
        
        // Filter out processed PoisonedMeat effects
        const filteredHostEffects = hostEffects ? hostEffects.filter(
            effect => !(effect.type === 'poison_all_player_targets' && effect.source === 'PoisonedMeat')
        ) : [];
        
        const filteredGuestEffects = guestEffects ? guestEffects.filter(
            effect => !(effect.type === 'poison_all_player_targets' && effect.source === 'PoisonedMeat')
        ) : [];
        
        // Update Firebase with filtered effects
        await roomRef.child('gameState').update({
            hostdelayedEffects: filteredHostEffects.length > 0 ? filteredHostEffects : null,
            guestdelayedEffects: filteredGuestEffects.length > 0 ? filteredGuestEffects : null,
            delayedEffectsProcessedAt: Date.now()
        });
        
        console.log('🧹 Cleared processed PoisonedMeat effects from Firebase');
    } catch (error) {
        console.error('Error clearing processed delayed effects:', error);
    }
}

// Apply poison to all player targets (original function - kept for backward compatibility)
async function poisonAllPlayerTargets(battleManager, poisonEffects) {
    if (!battleManager.statusEffectsManager) {
        console.error('StatusEffectsManager not available for PoisonedMeat curse');
        return;
    }
    
    // 🔧 FIX 2: Calculate total stacks from all effects (now works correctly)
    const totalStacks = poisonEffects.reduce((sum, effect) => sum + effect.stacks, 0);
    
    let targetsAffected = 0;
    
    // Apply poison to all player heroes
    ['left', 'center', 'right'].forEach(position => {
        const hero = battleManager.playerHeroes[position];
        if (hero && hero.alive) {
            battleManager.statusEffectsManager.applyStatusEffect(hero, 'poisoned', totalStacks);
            targetsAffected++;
            console.log(`☠️ PoisonedMeat curse: Applied ${totalStacks} poison to ${hero.name}`);
            
            // Apply poison to hero's creatures
            if (hero.creatures && hero.creatures.length > 0) {
                hero.creatures.forEach(creature => {
                    if (creature.alive) {
                        battleManager.statusEffectsManager.applyStatusEffect(creature, 'poisoned', totalStacks);
                        targetsAffected++;
                        console.log(`☠️ PoisonedMeat curse: Applied ${totalStacks} poison to ${creature.name}`);
                    }
                });
            }
        }
    });
    
    // Add combat log message
    if (targetsAffected > 0) {
        battleManager.addCombatLog(
            `🥩 The PoisonedMeat curse activates! ${targetsAffected} of your targets are poisoned with ${totalStacks} stack${totalStacks > 1 ? 's' : ''}!`,
            'error'
        );
    }
    
    // Small delay for visual effect processing
    await battleManager.delay(500);
}

// CSS styles for the poisoned meat effect (unchanged)
if (typeof document !== 'undefined' && !document.getElementById('poisonedMeatStyles')) {
    const style = document.createElement('style');
    style.id = 'poisonedMeatStyles';
    style.textContent = `
        /* PoisonedMeat Effect Animation */
        .poisoned-meat-effect-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: poisonedMeatEffect 3s ease-out forwards;
        }
        
        .poisoned-meat-content {
            background: linear-gradient(135deg, rgba(139, 69, 19, 0.95) 0%, rgba(160, 82, 45, 0.95) 100%);
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.8),
                inset 0 0 20px rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            min-width: 200px;
        }
        
        .meat-icon {
            font-size: 48px;
            margin-bottom: 10px;
            animation: meatPulse 2s ease-in-out infinite;
            filter: drop-shadow(0 0 15px rgba(139, 69, 19, 0.8));
        }
        
        .effect-details {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .cards-drawn,
        .creature-bonus {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #90EE90;
            font-weight: bold;
            font-size: 16px;
        }
        
        .poison-warning {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #FF6B6B;
            font-weight: bold;
            font-size: 14px;
            margin-top: 5px;
            animation: poisonWarningPulse 1s ease-in-out infinite;
        }
        
        .card-icon,
        .creature-icon {
            font-size: 20px;
            filter: drop-shadow(0 0 8px rgba(144, 238, 144, 0.8));
        }
        
        .poison-icon {
            font-size: 18px;
            filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.8));
        }
        
        .effect-text {
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        .warning-text {
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        @keyframes poisonedMeatEffect {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3) rotate(-10deg);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
            }
            80% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1) rotate(0deg);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8) rotate(0deg) translateY(-30px);
            }
        }
        
        @keyframes meatPulse {
            0%, 100% {
                transform: scale(1);
                filter: drop-shadow(0 0 15px rgba(139, 69, 19, 0.8));
            }
            50% {
                transform: scale(1.1);
                filter: drop-shadow(0 0 25px rgba(139, 69, 19, 1));
            }
        }
        
        @keyframes poisonWarningPulse {
            0%, 100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.7;
                transform: scale(1.05);
            }
        }
        
        @keyframes poisonedMeatError {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            10% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.05);
            }
            90% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
        }
        
        /* Add cursor pointer to clickable artifact cards */
        .hand-card[data-card-type="artifact"].clickable {
            cursor: pointer;
        }
        
        .hand-card[data-card-type="artifact"].clickable:hover {
            transform: translateY(-8px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}