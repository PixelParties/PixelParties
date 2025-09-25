// ./Creatures/royalCorgi.js - Royal Corgi Creature with Persistent Counter System

export class RoyalCorgiCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeAnimations = new Set(); // Track active animations for cleanup
        
        // Royal Corgi stats
        this.CARD_DRAW_ANIMATION_TIME = 1000; // 1 second card draw animation
        this.COUNTERS_PER_CARD_DRAW = 3;
        this.MAX_BONUS_CARDS_PER_CORGI = 99;
        
        // Inject CSS styles
        this.injectRoyalCorgiStyles();
    }

    // Check if a creature is Royal Corgi
    static isRoyalCorgi(creatureName) {
        return creatureName === 'RoyalCorgi';
    }

    // Execute Royal Corgi special action - gain counter and possibly show card draw animation
    async executeRoyalCorgiAction(corgiActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const corgi = corgiActor.data;
        const corgiHero = corgiActor.hero;
        const attackerSide = corgiHero.side;
        
        // Safety check: ensure Corgi is still alive
        if (!corgi.alive || corgi.currentHp <= 0) {
            return;
        }
        
        // Initialize counters if not present
        if (corgi.counters === undefined) {
            corgi.counters = 0;
        }
        
        // Gain a counter
        corgi.counters++;
        
        this.battleManager.addCombatLog(
            `👑 ${corgi.name} gains a counter (${corgi.counters} total)!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Update counter display for all players
        this.sendCounterUpdate(corgiActor, position);
        
        // Check if we should show card draw animation (every 3 counters)
        if (corgi.counters % this.COUNTERS_PER_CARD_DRAW === 0) {
            this.battleManager.addCombatLog(
                `📚 ${corgi.name} has earned a card draw bonus! (${corgi.counters / this.COUNTERS_PER_CARD_DRAW} cards earned)`, 
                attackerSide === 'player' ? 'success' : 'error'
            );

            // Send card draw animation to guest
            this.sendCardDrawAnimation(corgiActor, position);
            
            // Show card draw animation
            await this.showCardDrawAnimation(corgiActor, position);
        }
    }

    // Show card draw animation above the Corgi
    async showCardDrawAnimation(corgiActor, position) {
        const attackerSide = corgiActor.hero.side;
        const corgiElement = this.getCorgiElement(attackerSide, position, corgiActor.index);
        
        if (!corgiElement) return;

        const rect = corgiElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const cardAnimation = document.createElement('div');
        cardAnimation.className = 'corgi-card-draw-animation';
        cardAnimation.innerHTML = '🃏';
        cardAnimation.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            font-size: 32px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: corgiCardDraw ${this.battleManager.getSpeedAdjustedDelay(this.CARD_DRAW_ANIMATION_TIME)}ms ease-out forwards;
        `;

        document.body.appendChild(cardAnimation);
        this.activeAnimations.add(cardAnimation);

        // Remove animation after completion
        setTimeout(() => {
            if (cardAnimation.parentNode) {
                cardAnimation.remove();
                this.activeAnimations.delete(cardAnimation);
            }
        }, this.battleManager.getSpeedAdjustedDelay(this.CARD_DRAW_ANIMATION_TIME));

        await this.battleManager.delay(this.CARD_DRAW_ANIMATION_TIME / 2); // Wait for animation to reach peak
    }

    // Get the DOM element for Royal Corgi creature
    getCorgiElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Send counter update to guest for synchronization
    sendCounterUpdate(corgiActor, position) {
        const attackerSide = corgiActor.hero.side;
        
        this.battleManager.sendBattleUpdate('creature_counter_update', {
            creatureData: {
                side: attackerSide,
                position: position,
                creatureIndex: corgiActor.index,
                name: corgiActor.data.name,
                absoluteSide: corgiActor.hero.absoluteSide,
                counters: corgiActor.data.counters || 0
            }
        });
    }

    // Send card draw animation to guest for synchronization
    sendCardDrawAnimation(corgiActor, position) {
        const attackerSide = corgiActor.hero.side;
        
        this.battleManager.sendBattleUpdate('royal_corgi_card_draw', {
            corgiData: {
                side: attackerSide,
                position: position,
                creatureIndex: corgiActor.index,
                name: corgiActor.data.name,
                absoluteSide: corgiActor.hero.absoluteSide,
                counters: corgiActor.data.counters || 0
            }
        });
    }

    // Handle counter update on guest side (reuses MoonlightButterfly logic)
    handleGuestCounterUpdate(data) {
        const { creatureData } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const creatureLocalSide = (creatureData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Update counter display
        this.updateCreatureCounterDisplay(
            creatureLocalSide,
            creatureData.position,
            creatureData.creatureIndex,
            creatureData.counters
        );
    }

    // Handle card draw animation on guest side
    handleGuestCardDrawAnimation(data) {
        const { corgiData } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const corgiLocalSide = (corgiData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `📚 ${corgiData.name} has earned a card draw bonus!`, 
            corgiLocalSide === 'player' ? 'success' : 'error'
        );

        // Create the animation on guest side
        this.createGuestCardDrawAnimation(corgiData, myAbsoluteSide);
    }

    // Create card draw animation on guest side
    async createGuestCardDrawAnimation(corgiData, myAbsoluteSide) {
        const corgiLocalSide = (corgiData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const corgiElement = this.getCorgiElement(
            corgiLocalSide,
            corgiData.position,
            corgiData.creatureIndex
        );

        if (!corgiElement) {
            console.warn('Royal Corgi element not found on guest side');
            return;
        }

        const rect = corgiElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const cardAnimation = document.createElement('div');
        cardAnimation.className = 'corgi-card-draw-animation';
        cardAnimation.innerHTML = '🃏';
        cardAnimation.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            font-size: 32px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: corgiCardDraw ${this.battleManager.getSpeedAdjustedDelay(this.CARD_DRAW_ANIMATION_TIME)}ms ease-out forwards;
        `;

        document.body.appendChild(cardAnimation);
        this.activeAnimations.add(cardAnimation);

        // Remove animation after completion
        setTimeout(() => {
            if (cardAnimation.parentNode) {
                cardAnimation.remove();
                this.activeAnimations.delete(cardAnimation);
            }
        }, this.battleManager.getSpeedAdjustedDelay(this.CARD_DRAW_ANIMATION_TIME));
    }

    // Update creature counter display (reuses MoonlightButterfly logic)
    updateCreatureCounterDisplay(side, position, creatureIndex, counters) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;

        // Remove existing counter display
        const existingCounter = creatureElement.querySelector('.creature-counter-display');
        if (existingCounter) {
            existingCounter.remove();
        }

        // Add new counter display if counters > 0
        if (counters > 0) {
            const counterDisplay = document.createElement('div');
            counterDisplay.className = 'creature-counter-display';
            counterDisplay.textContent = counters;
            
            // Add special styling for Royal Corgi counters
            const isMultipleOfThree = counters % this.COUNTERS_PER_CARD_DRAW === 0;
            counterDisplay.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background: ${isMultipleOfThree ? 'gold' : 'white'};
                color: ${isMultipleOfThree ? 'white' : '#333'};
                border: 2px solid ${isMultipleOfThree ? '#ffd700' : '#666'};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 10;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                ${isMultipleOfThree ? 'animation: corgiCounterGlow 2s ease-in-out infinite;' : ''}
            `;
            
            creatureElement.appendChild(counterDisplay);
        }
    }

    // Calculate bonus cards for all Royal Corgis owned by a player
    calculateBonusCardsForPlayer(heroCreatures) {
        let totalBonusCards = 0;
        Object.values(heroCreatures).forEach(heroCreatureList => {
            if (Array.isArray(heroCreatureList)) {
                heroCreatureList.forEach(creature => {
                    if (RoyalCorgiCreature.isRoyalCorgi(creature.name)) {  // Remove && creature.alive
                        const counters = creature.counters || 0;
                        const bonusCards = Math.floor(counters / this.COUNTERS_PER_CARD_DRAW);
                        const cappedBonusCards = Math.min(bonusCards, this.MAX_BONUS_CARDS_PER_CORGI);
                        totalBonusCards += cappedBonusCards;
                        
                        console.log(`👑 Royal Corgi with ${counters} counters grants ${cappedBonusCards} bonus cards`);
                    }
                });
            }
        });
        
        return totalBonusCards;
    }

    // Clean up all active animations (called on battle end/reset)
    cleanup() {        
        this.activeAnimations.forEach(animation => {
            try {
                if (animation && animation.parentNode) {
                    animation.remove();
                }
            } catch (error) {
                console.warn('Error removing Royal Corgi animation during cleanup:', error);
            }
        });
        
        this.activeAnimations.clear();

        // Also remove any orphaned animation elements
        try {
            const orphanedAnimations = document.querySelectorAll('.corgi-card-draw-animation');
            orphanedAnimations.forEach(animation => {
                if (animation.parentNode) {
                    animation.remove();
                }
            });
        } catch (error) {
            console.warn('Error cleaning up orphaned Royal Corgi animations:', error);
        }
    }

    // Inject CSS styles for Royal Corgi effects
    injectRoyalCorgiStyles() {
        if (document.getElementById('royalCorgiStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'royalCorgiStyles';
        style.textContent = `
            /* Royal Corgi Card Draw Animation */
            @keyframes corgiCardDraw {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                25% { 
                    opacity: 1;
                    transform: translate(-50%, -70%) scale(1.3) rotate(90deg);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -90%) scale(1.5) rotate(180deg);
                }
                75% {
                    opacity: 0.8;
                    transform: translate(-50%, -110%) scale(1.2) rotate(270deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -130%) scale(0.8) rotate(360deg);
                }
            }

            /* Royal Corgi Counter Glow Effect (when multiple of 3) */
            @keyframes corgiCounterGlow {
                0%, 100% { 
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 10px rgba(255, 215, 0, 0.6);
                    transform: scale(1);
                }
                50% { 
                    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.9);
                    transform: scale(1.1);
                }
            }

            /* Enhanced creature glow when Royal Corgi is at card draw milestone */
            .creature-icon.corgi-milestone .creature-sprite {
                filter: brightness(1.3) drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
                animation: corgiMilestoneGlow 2s ease-in-out infinite alternate;
            }

            @keyframes corgiMilestoneGlow {
                0% { 
                    filter: brightness(1.3) drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
                }
                100% { 
                    filter: brightness(1.6) drop-shadow(0 0 25px rgba(255, 215, 0, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const RoyalCorgiHelpers = {
    // Check if any creature in a list is Royal Corgi
    hasRoyalCorgiInList(creatures) {
        return creatures.some(creature => RoyalCorgiCreature.isRoyalCorgi(creature.name));
    },

    // Get all Royal Corgi creatures from a list
    getRoyalCorgiFromList(creatures) {
        return creatures.filter(creature => RoyalCorgiCreature.isRoyalCorgi(creature.name));
    },

    // Calculate total bonus cards from all Royal Corgis in a list
    calculateTotalBonusCards(creatures, maxPerCorgi = 2) {
        return RoyalCorgiHelpers.getRoyalCorgiFromList(creatures)
            .reduce((total, corgi) => {
                const counters = corgi.counters || 0;
                const bonusCards = Math.floor(counters / 3);
                return total + Math.min(bonusCards, maxPerCorgi);
            }, 0);
    }
};

export default RoyalCorgiCreature;