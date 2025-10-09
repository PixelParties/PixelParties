// thievingStrike.js - Thieving Strike Fighting Spell Implementation - UPDATED

export class ThievingStrikeSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'ThievingStrike';
    }

    /**
     * Execute Thieving Strike effect after a successful attack
     * @param {Object} attacker - The hero who attacked
     * @param {Object} target - The target that was attacked (hero or creature)
     * @param {number} attackDamage - The damage that was dealt
     * @returns {Promise} - Animation completion promise
     */
    async executeEffect(attacker, target, attackDamage) {
        // Show spell card since this always triggers when called
        if (this.battleManager.spellSystem) {
            this.battleManager.spellSystem.showFightingSpellCard(attacker, 'ThievingStrike');
        }

        // Determine opponent's deck relative to attacker
        const attackerSide = attacker.side; // 'player' or 'opponent'
        const opponentSide = attackerSide === 'player' ? 'opponent' : 'player';
        
        // Get opponent's deck
        const opponentDeck = this.battleManager.getDeckBySide(opponentSide);
        
        if (!opponentDeck || opponentDeck.length === 0) {
            // No cards to steal
            this.battleManager.addCombatLog(
                `💰 ${attacker.name}'s Thieving Strike finds no cards to steal!`,
                attacker.side === 'player' ? 'success' : 'error'
            );
            
            // Still show visual effect but no card
            this.createTheftEffect(target, null);
            
            // Sync to guest
            if (this.battleManager.isAuthoritative) {
                this.battleManager.sendBattleUpdate('thieving_strike_triggered', {
                    attackerInfo: this.getTargetSyncInfo(attacker),
                    targetInfo: this.getTargetSyncInfo(target),
                    stolenCard: null,
                    timestamp: Date.now()
                });
            }
            return;
        }
        
        // Randomly select a card to steal
        const randomIndex = this.battleManager.getRandomInt(0, opponentDeck.length - 1);
        const stolenCard = opponentDeck[randomIndex];
        
        // Remove the card from opponent's deck
        const newOpponentDeck = [...opponentDeck];
        newOpponentDeck.splice(randomIndex, 1);
        
        // Add the stolen card to attacker's deck
        const attackerDeck = this.battleManager.getDeckBySide(attackerSide);
        const newAttackerDeck = [...attackerDeck, stolenCard];
        
        // Add the stolen card to attacker's hand as well
        const attackerHand = this.battleManager.getHandBySide(attackerSide);
        const newAttackerHand = [...attackerHand, stolenCard];
        
        // Update both decks and the attacker's hand in battle manager (this will sync and persist)
        this.battleManager.updateDeckDuringBattle(opponentSide, newOpponentDeck);
        this.battleManager.updateDeckDuringBattle(attackerSide, newAttackerDeck);
        this.battleManager.updateHandDuringBattle(attackerSide, newAttackerHand);
        
        // ADDITIONAL FIX: Also update the main hand manager if available (like Sid's approach)
        if (window.heroSelection && window.heroSelection.handManager && attackerSide === 'player') {
            try {
                const added = window.heroSelection.handManager.addCardToHand(stolenCard);
                if (added) {
                    console.log(`💰 ThievingStrike: Successfully added ${stolenCard} to main hand manager`);
                    
                    // Update the card reward screen hand display if it's open
                    if (window.heroSelection.cardRewardManager) {
                        setTimeout(() => {
                            if (window.heroSelection.cardRewardManager.updateRewardScreenHandDisplay) {
                                window.heroSelection.cardRewardManager.updateRewardScreenHandDisplay();
                            }
                        }, 100);
                    }
                } else {
                    console.warn(`💰 ThievingStrike: Failed to add ${stolenCard} to main hand manager (hand might be full)`);
                }
            } catch (error) {
                console.error('💰 ThievingStrike: Error updating main hand manager:', error);
            }
        }
        
        // Add to combat log
        this.battleManager.addCombatLog(
            `💰 ${attacker.name}'s Thieving Strike steals ${this.formatCardName(stolenCard)} and adds it to their hand and deck!`,
            attacker.side === 'player' ? 'success' : 'error'
        );
        
        // Create visual effect with stolen card
        this.createTheftEffect(target, stolenCard);
        
        // Sync to guest
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('thieving_strike_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                targetInfo: this.getTargetSyncInfo(target),
                stolenCard: stolenCard,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Create the theft visual effect above the target
     * @param {Object} target - The target to create effect around
     * @param {string|null} stolenCard - The name of the stolen card, or null if no card
     */
    async createTheftEffect(target, stolenCard) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) {
            console.warn('Could not find target element for Thieving Strike effect');
            return;
        }

        // Ensure CSS exists
        this.ensureTheftEffectCSS();

        // Create the theft effect container
        const theftContainer = document.createElement('div');
        theftContainer.className = 'thieving-strike-container';
        
        if (stolenCard) {
            // Create stolen card display
            const cardDisplay = document.createElement('div');
            cardDisplay.className = 'stolen-card-display';
            
            // Get card image path
            const cardImagePath = `./Cards/All/${stolenCard}.png`;
            
            cardDisplay.innerHTML = `
                <img src="${cardImagePath}" alt="${stolenCard}" class="stolen-card-image" 
                     onerror="this.src='./Cards/placeholder.png'">
                <div class="theft-cross">✗</div>
                <div class="theft-label">STOLEN</div>
            `;
            
            theftContainer.appendChild(cardDisplay);
        } else {
            // No card to steal - show empty hands
            const emptyDisplay = document.createElement('div');
            emptyDisplay.className = 'empty-theft-display';
            emptyDisplay.innerHTML = `
                <div class="empty-hands">🤲</div>
                <div class="theft-label">NOTHING TO STEAL</div>
            `;
            theftContainer.appendChild(emptyDisplay);
        }
        
        // Position above target
        theftContainer.style.cssText = `
            position: absolute;
            top: -80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 600;
            pointer-events: none;
            animation: thievingStrikeEffect ${this.battleManager.getSpeedAdjustedDelay(2000)}ms ease-out forwards;
        `;
        
        targetElement.appendChild(theftContainer);
        
        // Clean up after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(2000);
        setTimeout(() => {
            if (theftContainer && theftContainer.parentNode) {
                theftContainer.remove();
            }
        }, animationDuration);
    }

    /**
     * Get the DOM element for the target (hero or creature)
     * @param {Object} target - Target object
     * @returns {HTMLElement|null} - Target DOM element
     */
    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            // Hero element
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
            // Creature element
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) {
                console.warn('Could not find creature info for Thieving Strike target');
                return null;
            }

            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
    }

    /**
     * Find creature information (hero, position, index)
     * @param {Object} creature - Creature object
     * @returns {Object|null} - Creature info or null
     */
    findCreatureInfo(creature) {
        // Search through all heroes and their creatures
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            
            for (const position of ['left', 'center', 'right']) {
                const hero = heroes[position];
                if (!hero || !hero.creatures) continue;
                
                const creatureIndex = hero.creatures.indexOf(creature);
                if (creatureIndex !== -1) {
                    return { hero, side, position, creatureIndex };
                }
            }
        }
        
        return null;
    }

    /**
     * Get target sync information for network communication
     * @param {Object} target - Target object
     * @returns {Object} - Sync information
     */
    getTargetSyncInfo(target) {
        if (target.type === 'hero' || !target.type) {
            return {
                type: 'hero',
                absoluteSide: target.absoluteSide,
                position: target.position,
                name: target.name
            };
        } else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                absoluteSide: creatureInfo.hero.absoluteSide,
                position: creatureInfo.position,
                creatureIndex: creatureInfo.creatureIndex,
                name: target.name
            };
        }
    }

    /**
     * Handle guest receiving Thieving Strike effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, targetInfo, stolenCard } = data;
        
        // Find local targets
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        const localTarget = this.findTargetFromSyncInfo(targetInfo);
        
        if (!localAttacker || !localTarget) {
            console.warn('Could not find local targets for Thieving Strike effect');
            return;
        }

        // Log the effect
        if (stolenCard) {
            this.battleManager.addCombatLog(
                `💰 ${localAttacker.name}'s Thieving Strike steals ${this.formatCardName(stolenCard)} and adds it to their hand and deck!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );
            
            // GUEST SIDE: Also update the main hand manager if this is the guest's card
            if (window.heroSelection && window.heroSelection.handManager && localAttacker.side === 'player') {
                try {
                    const added = window.heroSelection.handManager.addCardToHand(stolenCard);
                    if (added) {
                        console.log(`💰 ThievingStrike (Guest): Successfully added ${stolenCard} to main hand manager`);
                        
                        // Update the card reward screen hand display if it's open
                        if (window.heroSelection.cardRewardManager) {
                            setTimeout(() => {
                                if (window.heroSelection.cardRewardManager.updateRewardScreenHandDisplay) {
                                    window.heroSelection.cardRewardManager.updateRewardScreenHandDisplay();
                                }
                            }, 100);
                        }
                    }
                } catch (error) {
                    console.error('💰 ThievingStrike (Guest): Error updating main hand manager:', error);
                }
            }
        } else {
            this.battleManager.addCombatLog(
                `💰 ${localAttacker.name}'s Thieving Strike finds no cards to steal!`,
                localAttacker.side === 'player' ? 'success' : 'error'
            );
        }

        // Create visual effect
        this.createTheftEffect(localTarget, stolenCard);
    }

    /**
     * Find target from sync information
     * @param {Object} targetInfo - Target sync info
     * @returns {Object|null} - Target object or null
     */
    findTargetFromSyncInfo(targetInfo) {
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetInfo.type === 'hero') {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            return heroes[targetInfo.position];
        } else {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[targetInfo.position];
            return hero?.creatures?.[targetInfo.creatureIndex];
        }
    }

    /**
     * Format card name for display
     * @param {string} cardName - Raw card name
     * @returns {string} - Formatted card name
     */
    formatCardName(cardName) {
        if (!cardName || typeof cardName !== 'string') {
            return cardName;
        }
        
        // Convert camelCase to spaced words
        return cardName.replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    /**
     * Ensure CSS for theft effect exists
     */
    ensureTheftEffectCSS() {
        if (document.getElementById('thievingStrikeCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'thievingStrikeCSS';
        style.textContent = `
            @keyframes thievingStrikeEffect {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.3) translateY(20px);
                }
                25% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1.1) translateY(-10px);
                }
                75% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1.0) translateY(-5px);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.8) translateY(-30px);
                }
            }
            
            .thieving-strike-container {
                will-change: transform, opacity;
            }
            
            .stolen-card-display {
                position: relative;
                width: 60px;
                height: 84px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
                overflow: hidden;
            }
            
            .stolen-card-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                filter: brightness(0.7) saturate(0.5);
            }
            
            .theft-cross {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 36px;
                color: #ff4444;
                text-shadow: 
                    2px 2px 4px rgba(0, 0, 0, 0.8),
                    0 0 8px rgba(255, 68, 68, 0.6);
                font-weight: bold;
                z-index: 10;
            }
            
            .theft-label {
                position: absolute;
                bottom: -20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 68, 68, 0.9);
                color: white;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: bold;
                white-space: nowrap;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
            }
            
            .empty-theft-display {
                text-align: center;
                padding: 10px;
            }
            
            .empty-hands {
                font-size: 32px;
                margin-bottom: 5px;
                filter: grayscale(100%);
                opacity: 0.7;
            }
            
            .empty-theft-display .theft-label {
                position: static;
                transform: none;
                background: rgba(128, 128, 128, 0.9);
                margin-top: 5px;
                display: inline-block;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('thievingStrikeCSS');
        if (css) css.remove();
        
        // Remove any remaining effects
        const effects = document.querySelectorAll('.thieving-strike-container');
        effects.forEach(effect => effect.remove());
    }
}

export default ThievingStrikeSpell;