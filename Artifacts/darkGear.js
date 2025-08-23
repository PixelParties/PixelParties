// darkGear.js - Dark Gear Permanent Artifact Module

export const darkGearArtifact = {
    // Card name this artifact handles
    cardName: 'DarkGear',
    
    // Handle card click/drag (consume and add to permanents)
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`⚙️ Dark Gear activated at index ${cardIndex}`);
        
        // Consume the card and add to permanent list
        await this.consumeCard(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and add to permanents
    async consumeCard(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const goldManager = heroSelection.getGoldManager();
        
        if (!handManager || !goldManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Get cost from card database
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 2; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showDarkGearError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'DarkGear');
        
        console.log(`DarkGear: Spent ${cost} gold to activate`);
        
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Add to permanent artifacts list using global artifactHandler
        if (window.artifactHandler) {
            window.artifactHandler.addPermanentArtifact(this.cardName);
            console.log('⚙️ Dark Gear added to permanent artifacts!');
            
            // Update the permanent artifacts indicator
            if (window.heroSelection && window.heroSelection.heroSelectionUI) {
                window.heroSelection.heroSelectionUI.updatePermanentArtifactsIndicator();
            }
        }
        
        // Show visual feedback
        this.showDarkGearActivation(cardIndex, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        await heroSelection.sendFormationUpdate();

        console.log(`⚙️ Dark Gear consumed and added to permanent artifacts for ${cost} gold!`);
    },
    
    // Show error message when not enough gold
    showDarkGearError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'dark-gear-error';
        errorDiv.innerHTML = `
            <div class="dark-gear-error-content">
                <span class="dark-gear-error-icon">⛔</span>
                <span class="dark-gear-error-text">${message}</span>
            </div>
        `;
        
        // Position near the card or center of hand
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                errorDiv.style.left = `${cardRect.left + cardRect.width / 2}px`;
                errorDiv.style.top = `${cardRect.top - 60}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                errorDiv.style.left = `${handRect.left + handRect.width / 2}px`;
                errorDiv.style.top = `${handRect.top - 60}px`;
            }
        } else {
            // Fallback to center of screen
            errorDiv.style.left = '50%';
            errorDiv.style.top = '50%';
        }
        
        errorDiv.style.cssText += `
            position: fixed;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #dc3545 0%, #404040 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: darkGearErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'darkGearErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show activation animation (updated to include cost)
    showDarkGearActivation(cardIndex, cost) {
        const activationBurst = document.createElement('div');
        activationBurst.className = 'dark-gear-activation';
        activationBurst.innerHTML = `
            <div class="dark-burst">
                <span class="dark-particle">⚙️</span>
                <span class="dark-particle">🖤</span>
                <span class="dark-particle">⚙️</span>
            </div>
            <div class="gear-text">Dark Gear Armed!</div>
            <div class="gear-subtext">Will steal enemy creatures on death</div>
            <div class="gear-cost">Cost: ${cost} Gold</div>
        `;
        
        // Position near the card
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                activationBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                activationBurst.style.top = `${cardRect.top}px`;
            } else {
                const handRect = handContainer.getBoundingClientRect();
                activationBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                activationBurst.style.top = `${handRect.top}px`;
            }
        }
        
        document.body.appendChild(activationBurst);
        
        setTimeout(() => {
            activationBurst.remove();
        }, 3000);
    },
    
    // ============================================
    // CREATURE STEALING LOGIC (unchanged)
    // ============================================
    
    /**
     * Attempt to steal a creature that just died
     * Called from battleManager when a creature dies and is not revived
     */
    async attemptCreatureStealing(deadCreature, originalHero, creatureIndex, originalSide, battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) {
            return false; // Only host handles stealing
        }
        
        // Determine which side can steal (opposite of the dead creature's side)
        const stealerSide = originalSide === 'player' ? 'opponent' : 'player';
        
        // Get DarkGear count for the stealer
        const stealerPermanentArtifacts = stealerSide === 'player' ? 
            (battleManager.playerPermanentArtifacts || []) :
            (battleManager.opponentPermanentArtifacts || []);
        
        const darkGears = stealerPermanentArtifacts.filter(artifact => artifact.name === 'DarkGear');
        
        if (darkGears.length === 0) {
            return false; // No DarkGears to trigger
        }
        
        console.log(`⚙️ ${darkGears.length} Dark Gear(s) available for stealing from ${stealerSide}`);
        
        // Roll for each DarkGear independently (20% chance each)
        let stealTriggered = false;
        for (let i = 0; i < darkGears.length; i++) {
            const roll = battleManager.getRandomPercent();
            console.log(`⚙️ Dark Gear ${i + 1} roll: ${roll}% (need ≤20%)`);
            
            if (roll <= 20) {
                stealTriggered = true;
                console.log(`⚙️ Dark Gear ${i + 1} triggered! Stealing ${deadCreature.name}`);
                break; // Only one can trigger per death
            }
        }
        
        if (!stealTriggered) {
            console.log(`⚙️ No Dark Gears triggered for ${deadCreature.name}`);
            return false;
        }
        
        // Find a random living hero on the stealer's side to receive the creature
        const stealerHeroes = stealerSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const livingHeroes = Object.keys(stealerHeroes).filter(pos => 
            stealerHeroes[pos] && stealerHeroes[pos].alive
        );
        
        if (livingHeroes.length === 0) {
            console.log(`⚙️ No living heroes on ${stealerSide} side to receive stolen creature`);
            return false;
        }
        
        const randomHeroPosition = battleManager.getRandomChoice(livingHeroes);
        const receivingHero = stealerHeroes[randomHeroPosition];
        
        console.log(`⚙️ ${receivingHero.name} (${stealerSide} ${randomHeroPosition}) will receive stolen ${deadCreature.name}`);
        
        // Perform the stealing
        await this.performCreatureStealing(
            deadCreature, 
            originalHero, 
            creatureIndex, 
            originalSide,
            receivingHero, 
            randomHeroPosition, 
            stealerSide, 
            battleManager
        );
        
        return true;
    },
    
    /**
     * Actually perform the creature stealing
     */
    async performCreatureStealing(deadCreature, originalHero, creatureIndex, originalSide, 
                                receivingHero, receivingPosition, stealerSide, battleManager) {
        
        // STEP 0: Ensure the creature is marked as dead first
        if (creatureIndex >= 0 && creatureIndex < originalHero.creatures.length) {
            originalHero.creatures[creatureIndex].alive = false;
        }
        
        // STEP 1: Remove ALL visual elements for this creature
        const creatureElements = document.querySelectorAll(
            `.${originalSide}-slot.${originalHero.position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        creatureElements.forEach(el => el.remove());
        
        // Also remove any floating damage numbers or effects
        const damageNumbers = document.querySelectorAll(
            `.${originalSide}-slot.${originalHero.position}-slot .damage-number`
        );
        damageNumbers.forEach(el => {
            if (el.textContent.includes(deadCreature.name)) {
                el.remove();
            }
        });
        
        // STEP 2: Remove from original hero's creatures array
        const removedCreature = originalHero.creatures.splice(creatureIndex, 1)[0];
        if (!removedCreature) {
            console.error(`⚠️ Failed to remove creature at index ${creatureIndex}`);
            return;
        }
        
        // STEP 3: Update all remaining creature indices in the DOM
        const remainingCreatures = document.querySelectorAll(
            `.${originalSide}-slot.${originalHero.position}-slot .creature-icon`
        );
        remainingCreatures.forEach((el, index) => {
            el.setAttribute('data-creature-index', index);
        });
        
        // STEP 3.5: Force complete re-render of original hero's creatures
        if (battleManager.battleScreen && battleManager.battleScreen.renderCreaturesAfterInit) {
            // Clear and re-render to ensure no ghost creatures
            const heroSlot = document.querySelector(`.${originalSide}-slot.${originalHero.position}-slot`);
            if (heroSlot) {
                const creaturesContainer = heroSlot.querySelector('.battle-hero-creatures');
                if (creaturesContainer) {
                    creaturesContainer.remove();
                }
            }
            battleManager.battleScreen.renderCreaturesAfterInit();
        } else {
            battleManager.updateCreatureVisuals(originalSide, originalHero.position, originalHero.creatures);
        }
        
        // STEP 4: Show dark gear stealing effect on the now-empty original position
        await this.createDarkGearStealingEffect(battleManager, originalSide, originalHero.position, creatureIndex);
        
        // STEP 5: Create the stolen creature (revived at full HP) and add to new hero
        const stolenCreature = {
            ...deadCreature,
            currentHp: deadCreature.maxHp, // Full HP
            alive: true,
            statusEffects: [], // Clear status effects
            counters: 0, // Reset counters
            stolenBy: 'DarkGear',
            originalOwner: originalHero.name,
            stolenAt: Date.now()
        };
        
        receivingHero.creatures.push(stolenCreature);
        
        // STEP 6: Re-render to show creature at new position
        if (battleManager.battleScreen && battleManager.battleScreen.renderCreaturesAfterInit) {
            battleManager.battleScreen.renderCreaturesAfterInit();
        } else {
            battleManager.updateCreatureVisuals(stealerSide, receivingPosition, receivingHero.creatures);
        }
        
        // STEP 7: Show arrival effect at the new location
        await this.createStealingArrivalEffect(battleManager, stealerSide, receivingPosition, receivingHero.creatures.length - 1);
        
        // STEP 8: Add combat log
        battleManager.addCombatLog(
            `⚙️ Dark Gear steals ${deadCreature.name} and gives it to ${receivingHero.name}!`,
            stealerSide === 'player' ? 'success' : 'error'
        );
        
        // STEP 9: Update necromancy displays if available
        if (battleManager.necromancyManager) {
            battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                originalSide, originalHero.position, originalHero
            );
            battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                stealerSide, receivingPosition, receivingHero
            );
        }
        
        // STEP 10: Sync creature stealing data AND visual effects to guest
        battleManager.sendBattleUpdate('dark_gear_creature_stolen', {
            stolenCreature: {
                name: deadCreature.name,
                maxHp: deadCreature.maxHp,
                atk: deadCreature.atk
            },
            originalOwner: {
                side: originalSide,
                position: originalHero.position,
                heroName: originalHero.name,
                creatureIndex: creatureIndex
            },
            newOwner: {
                side: stealerSide,
                position: receivingPosition,
                heroName: receivingHero.name
            },
            // NEW: Add visual effects data
            stealingEffects: {
                stealingPosition: {
                    side: originalSide,
                    position: originalHero.position,
                    creatureIndex: creatureIndex
                },
                arrivalPosition: {
                    side: stealerSide,
                    position: receivingPosition,
                    newCreatureIndex: receivingHero.creatures.length - 1
                }
            },
            timestamp: Date.now()
        });

        // Wait for guest to finish animations before continuing
        if (battleManager.networkManager && !battleManager.isHost) {
            // Only wait if we're the host and there's a guest to sync with
            await battleManager.waitForGuestAcknowledgment('dark_gear_complete', 3000); // 3 second timeout for animations
        }
        
        console.log(`⚙️ ${deadCreature.name} successfully stolen by Dark Gear!`);
    },
    
    /**
     * Create dark gear stealing visual effect
     */
    async createDarkGearStealingEffect(battleManager, targetSide, targetPosition, creatureIndex) {
        const creatureElement = document.querySelector(
            `.${targetSide}-slot.${targetPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;
        
        // Create dark particle effect
        const darkEffect = document.createElement('div');
        darkEffect.className = 'dark-gear-steal-effect';
        darkEffect.innerHTML = `
            <div class="dark-particles">
                <span class="dark-particle">⚙️</span>
                <span class="dark-particle">🖤</span>
                <span class="dark-particle">⚙️</span>
                <span class="dark-particle">⚫</span>
                <span class="dark-particle">⚙️</span>
            </div>
            <div class="gear-rotation">
                <span class="gear-large">⚙️</span>
                <span class="gear-small">⚙️</span>
            </div>
        `;
        
        darkEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 600;
            pointer-events: none;
            animation: darkGearSteal ${battleManager.getSpeedAdjustedDelay(1500)}ms ease-out forwards;
        `;
        
        creatureElement.appendChild(darkEffect);
        
        // Remove effect after animation
        setTimeout(() => {
            if (darkEffect.parentNode) {
                darkEffect.remove();
            }
        }, battleManager.getSpeedAdjustedDelay(1500));
        
        // Wait for effect to complete
        await battleManager.delay(1500);
    },
    
    /**
     * Create arrival effect when stolen creature appears at new location
     */
    async createStealingArrivalEffect(battleManager, targetSide, targetPosition, creatureIndex) {
        // Wait a moment for the creature element to be rendered
        await battleManager.delay(100);
        
        const creatureElement = document.querySelector(
            `.${targetSide}-slot.${targetPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) {
            console.warn('Could not find creature element for arrival effect');
            return;
        }
        
        // Create arrival effect
        const arrivalEffect = document.createElement('div');
        arrivalEffect.className = 'dark-gear-arrival-effect';
        arrivalEffect.innerHTML = `
            <div class="arrival-sparkles">
                <span class="sparkle">✨</span>
                <span class="sparkle">⚙️</span>
                <span class="sparkle">✨</span>
                <span class="sparkle">💫</span>
                <span class="sparkle">⚙️</span>
            </div>
            <div class="arrival-ring">
                <div class="ring-outer"></div>
                <div class="ring-inner"></div>
            </div>
        `;
        
        arrivalEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 600;
            pointer-events: none;
            animation: darkGearArrival ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        `;
        
        creatureElement.appendChild(arrivalEffect);
        
        // Remove effect after animation
        setTimeout(() => {
            if (arrivalEffect.parentNode) {
                arrivalEffect.remove();
            }
        }, battleManager.getSpeedAdjustedDelay(1000));
        
        // Wait for effect to complete
        await battleManager.delay(1000);
    },
    
    // ============================================
    // GUEST HANDLERS (unchanged)
    // ============================================
    
    /**
     * Handle creature stealing on guest side
     */
    async handleGuestCreatureStealing(data, battleManager) {
        const { stolenCreature, originalOwner, newOwner, stealingEffects } = data;
        
        // Determine local sides for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const originalLocalSide = (originalOwner.side === 'player') ? 
            (myAbsoluteSide === 'host' ? 'player' : 'opponent') :
            (myAbsoluteSide === 'host' ? 'opponent' : 'player');
        const newOwnerLocalSide = (newOwner.side === 'player') ?
            (myAbsoluteSide === 'host' ? 'player' : 'opponent') :
            (myAbsoluteSide === 'host' ? 'opponent' : 'player');
        
        // Get the heroes
        const originalHeroes = originalLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const newOwnerHeroes = newOwnerLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        
        const originalHero = originalHeroes[originalOwner.position];
        const receivingHero = newOwnerHeroes[newOwner.position];
        
        if (!originalHero || !receivingHero) {
            console.error('GUEST: Could not find heroes for creature stealing');
            return;
        }
        
        // STEP 1: Explicitly remove the DOM element for the stolen creature
        const originalCreatureElement = document.querySelector(
            `.${originalLocalSide}-slot.${originalOwner.position}-slot .creature-icon[data-creature-index="${originalOwner.creatureIndex}"]`
        );
        if (originalCreatureElement) {
            originalCreatureElement.remove();
            console.log(`GUEST: Removed DOM element for stolen ${stolenCreature.name} from ${originalLocalSide} ${originalOwner.position}`);
        }
        
        // STEP 2: Remove from original hero IMMEDIATELY (remove from the end if index is out of bounds)
        if (originalOwner.creatureIndex < originalHero.creatures.length) {
            originalHero.creatures.splice(originalOwner.creatureIndex, 1);
        } else if (originalHero.creatures.length > 0) {
            originalHero.creatures.splice(-1, 1); // Remove last creature as fallback
        }
        
        // STEP 3: Force immediate re-render to remove the visual from original position
        if (battleManager.battleScreen && battleManager.battleScreen.renderCreaturesAfterInit) {
            battleManager.battleScreen.renderCreaturesAfterInit();
        } else {
            battleManager.updateCreatureVisuals(originalLocalSide, originalOwner.position, originalHero.creatures);
        }
        
        // STEP 4: Show visual stealing effect on now-empty original position (GUEST-SIDE ANIMATION)
        if (stealingEffects && stealingEffects.stealingPosition) {
            await this.createDarkGearStealingEffect(
                battleManager, 
                originalLocalSide, 
                originalOwner.position, 
                stealingEffects.stealingPosition.creatureIndex
            );
        }
        
        // STEP 5: Create the stolen creature and add to new owner
        const revivedCreature = {
            name: stolenCreature.name,
            currentHp: stolenCreature.maxHp,
            maxHp: stolenCreature.maxHp,
            atk: stolenCreature.atk,
            alive: true,
            statusEffects: [],
            counters: 0,
            type: 'creature',
            stolenBy: 'DarkGear'
        };
        
        receivingHero.creatures.push(revivedCreature);
        
        // STEP 6: Re-render to show creature at new position
        if (battleManager.battleScreen && battleManager.battleScreen.renderCreaturesAfterInit) {
            battleManager.battleScreen.renderCreaturesAfterInit();
        } else {
            battleManager.updateCreatureVisuals(newOwnerLocalSide, newOwner.position, receivingHero.creatures);
        }
        
        // STEP 7: Show arrival effect at the new location (GUEST-SIDE ANIMATION)
        if (stealingEffects && stealingEffects.arrivalPosition) {
            await this.createStealingArrivalEffect(
                battleManager, 
                newOwnerLocalSide, 
                newOwner.position, 
                receivingHero.creatures.length - 1
            );
        }
        
        // STEP 8: Update necromancy displays if available
        if (battleManager.necromancyManager) {
            battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                originalLocalSide, originalOwner.position, originalHero
            );
            battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                newOwnerLocalSide, newOwner.position, receivingHero
            );
        }
        
        // STEP 9: Add to combat log
        battleManager.addCombatLog(
            `⚙️ Dark Gear steals ${stolenCreature.name} and gives it to ${newOwner.heroName}!`,
            newOwnerLocalSide === 'player' ? 'success' : 'error'
        );
        battleManager.sendAcknowledgment('dark_gear_complete');

        console.log(`GUEST: ${stolenCreature.name} successfully stolen by Dark Gear!`);
    }
};

// Add styles for the animations (updated to include error styles and cost display)
if (typeof document !== 'undefined' && !document.getElementById('darkGearStyles')) {
    const style = document.createElement('style');
    style.id = 'darkGearStyles';
    style.textContent = `
        /* Dark Gear Activation */
        .dark-gear-activation {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: darkGearActivation 3s ease-out forwards;
        }
        
        .dark-burst {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            animation: darkBurst 2s ease-out;
            justify-content: center;
        }
        
        .dark-particle {
            font-size: 36px;
            animation: darkSpin 1.5s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(60, 60, 60, 0.8));
        }
        
        .dark-particle:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .dark-particle:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        .gear-text {
            font-size: 24px;
            font-weight: bold;
            color: #404040;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(60, 60, 60, 0.8);
            text-align: center;
            animation: gearTextPulse 0.8s ease-out;
            margin-bottom: 5px;
        }
        
        .gear-subtext {
            font-size: 16px;
            color: #fff;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.5s ease-out 0.3s forwards;
            margin-bottom: 5px;
        }
        
        .gear-cost {
            font-size: 14px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.5s ease-out 0.6s forwards;
        }
        
        /* Error styles */
        .dark-gear-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .dark-gear-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .dark-gear-error-icon {
            font-size: 20px;
        }
        
        .dark-gear-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes darkGearErrorBounce {
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
        
        @keyframes darkGearErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Dark Gear Stealing Effect */
        .dark-gear-steal-effect {
            pointer-events: none;
        }
        
        .dark-particles {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        .dark-particles .dark-particle {
            position: absolute;
            font-size: 20px;
            animation: darkParticleFloat 1.5s ease-out forwards;
        }
        
        .dark-particles .dark-particle:nth-child(1) {
            animation-delay: 0s;
            top: -20px;
            left: -20px;
        }
        
        .dark-particles .dark-particle:nth-child(2) {
            animation-delay: 0.1s;
            top: -15px;
            left: 15px;
        }
        
        .dark-particles .dark-particle:nth-child(3) {
            animation-delay: 0.2s;
            top: 20px;
            left: -15px;
        }
        
        .dark-particles .dark-particle:nth-child(4) {
            animation-delay: 0.3s;
            top: 15px;
            left: 20px;
        }
        
        .dark-particles .dark-particle:nth-child(5) {
            animation-delay: 0.4s;
            top: 0px;
            left: 0px;
        }
        
        .gear-rotation {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        .gear-large {
            position: absolute;
            font-size: 40px;
            top: -20px;
            left: -20px;
            animation: gearRotateClockwise 1.5s linear forwards;
            filter: drop-shadow(0 0 15px rgba(0, 0, 0, 0.8));
        }
        
        .gear-small {
            position: absolute;
            font-size: 20px;
            top: 10px;
            left: 10px;
            animation: gearRotateCounterClockwise 1.5s linear forwards;
            filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.6));
        }
        
        /* Dark Gear Arrival Effect */
        .dark-gear-arrival-effect {
            pointer-events: none;
        }
        
        .arrival-sparkles {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        .arrival-sparkles .sparkle {
            position: absolute;
            font-size: 16px;
            animation: sparkleRise 1s ease-out forwards;
        }
        
        .arrival-sparkles .sparkle:nth-child(1) {
            animation-delay: 0s;
            top: -25px;
            left: -25px;
        }
        
        .arrival-sparkles .sparkle:nth-child(2) {
            animation-delay: 0.1s;
            top: -20px;
            left: 20px;
        }
        
        .arrival-sparkles .sparkle:nth-child(3) {
            animation-delay: 0.2s;
            top: 25px;
            left: -20px;
        }
        
        .arrival-sparkles .sparkle:nth-child(4) {
            animation-delay: 0.3s;
            top: 20px;
            left: 25px;
        }
        
        .arrival-sparkles .sparkle:nth-child(5) {
            animation-delay: 0.4s;
            top: 0px;
            left: 0px;
        }
        
        .arrival-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        .ring-outer {
            position: absolute;
            width: 60px;
            height: 60px;
            border: 3px solid #404040;
            border-radius: 50%;
            top: -30px;
            left: -30px;
            animation: ringExpand 1s ease-out forwards;
            opacity: 0.8;
        }
        
        .ring-inner {
            position: absolute;
            width: 30px;
            height: 30px;
            border: 2px solid #606060;
            border-radius: 50%;
            top: -15px;
            left: -15px;
            animation: ringExpand 1s ease-out 0.2s forwards;
            opacity: 0.6;
        }
        
        @keyframes darkGearActivation {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }
        
        @keyframes darkBurst {
            0% { transform: translateY(0); }
            100% { transform: translateY(-60px); }
        }
        
        @keyframes darkSpin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.3); }
            100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes gearTextPulse {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes darkGearSteal {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            30% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
            70% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
        }
        
        @keyframes darkParticleFloat {
            0% { 
                opacity: 0; 
                transform: scale(0.5) translateY(0px);
            }
            50% { 
                opacity: 1; 
                transform: scale(1) translateY(-30px);
            }
            100% { 
                opacity: 0; 
                transform: scale(0.3) translateY(-50px);
            }
        }
        
        @keyframes gearRotateClockwise {
            0% { 
                opacity: 0;
                transform: rotate(0deg) scale(0.5);
            }
            30% {
                opacity: 1;
                transform: rotate(180deg) scale(1.2);
            }
            100% { 
                opacity: 0;
                transform: rotate(720deg) scale(1.5);
            }
        }
        
        @keyframes gearRotateCounterClockwise {
            0% { 
                opacity: 0;
                transform: rotate(0deg) scale(0.3);
            }
            30% {
                opacity: 1;
                transform: rotate(-180deg) scale(1);
            }
            100% { 
                opacity: 0;
                transform: rotate(-720deg) scale(1.2);
            }
        }
        
        @keyframes darkGearArrival {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
        
        @keyframes sparkleRise {
            0% { 
                opacity: 0; 
                transform: scale(0.5) translateY(0px);
            }
            30% { 
                opacity: 1; 
                transform: scale(1.2) translateY(-10px);
            }
            100% { 
                opacity: 0; 
                transform: scale(0.3) translateY(-30px);
            }
        }
        
        @keyframes ringExpand {
            0% { 
                opacity: 0;
                transform: scale(0.1);
            }
            50% {
                opacity: 1;
                transform: scale(1);
            }
            100% { 
                opacity: 0;
                transform: scale(1.5);
            }
        }
        
        /* Card glow in hand */
        .hand-card[data-card-name="DarkGear"] {
            position: relative;
            border: 2px solid #404040 !important;
            box-shadow: 
                0 0 15px rgba(60, 60, 60, 0.6),
                inset 0 0 15px rgba(60, 60, 60, 0.1) !important;
            animation: darkGearGlow 3s ease-in-out infinite;
        }
        
        .hand-card[data-card-name="DarkGear"]::before {
            content: "⚙️";
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 20px;
            background: radial-gradient(circle, #404040, #000000);
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #606060;
            z-index: 10;
            animation: darkGearBadgePulse 2s ease-in-out infinite;
        }
        
        @keyframes darkGearGlow {
            0%, 100% { 
                box-shadow: 
                    0 0 15px rgba(60, 60, 60, 0.6),
                    inset 0 0 15px rgba(60, 60, 60, 0.1);
            }
            50% { 
                box-shadow: 
                    0 0 25px rgba(60, 60, 60, 0.9),
                    inset 0 0 25px rgba(60, 60, 60, 0.2);
            }
        }
        
        @keyframes darkGearBadgePulse {
            0%, 100% { 
                transform: scale(1);
                filter: drop-shadow(0 0 5px rgba(60, 60, 60, 0.8));
            }
            50% { 
                transform: scale(1.1);
                filter: drop-shadow(0 0 10px rgba(60, 60, 60, 1));
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in battle flow
export async function attemptDarkGearStealing(deadCreature, originalHero, creatureIndex, originalSide, battleManager) {
    return await darkGearArtifact.attemptCreatureStealing(deadCreature, originalHero, creatureIndex, originalSide, battleManager);
}

// Export guest handler
export async function handleGuestDarkGearStealing(data, battleManager) {
    return await darkGearArtifact.handleGuestCreatureStealing(data, battleManager);
}