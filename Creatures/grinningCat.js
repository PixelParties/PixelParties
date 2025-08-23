// ./Creatures/grinningCat.js - Grinning Cat Creature with Card Giving System

export class GrinningCatCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeAnimations = new Set(); // Track active animations for cleanup
        
        // Grinning Cat stats
        this.CARD_GIFT_ANIMATION_TIME = 1500; // 1.5 second card gift animation
        this.COUNTERS_PER_CARD_GIFT = 2;
        
        // Inject CSS styles
        this.injectGrinningCatStyles();
        
        console.log('😸 Grinning Cat Creature module initialized');
    }

    // Check if a creature is Grinning Cat
    static isGrinningCat(creatureName) {
        return creatureName === 'GrinningCat';
    }

    // Execute Grinning Cat special action - gain counter and possibly give card to opponent
    async executeGrinningCatAction(catActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const cat = catActor.data;
        const catHero = catActor.hero;
        const attackerSide = catHero.side;
        
        // Safety check: ensure Cat is still alive
        if (!cat.alive || cat.currentHp <= 0) {
            console.log(`Grinning Cat is dead, cannot execute action`);
            return;
        }
        
        // Initialize counters if not present
        if (cat.counters === undefined) {
            cat.counters = 0;
        }
        
        // Gain a counter
        cat.counters++;
        
        this.battleManager.addCombatLog(
            `😸 ${cat.name} gains a counter (${cat.counters} total)!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Update counter display for all players
        this.sendCounterUpdate(catActor, position);
        
        // Check if we should give a card (every 2 counters)
        if (cat.counters % this.COUNTERS_PER_CARD_GIFT === 0) {
            // Reset counters
            cat.counters = 0;
            
            // Update counter display after reset
            this.sendCounterUpdate(catActor, position);
            
            this.battleManager.addCombatLog(
                `😸 ${cat.name} gives a GrinningCat card to the opponent!`, 
                attackerSide === 'player' ? 'success' : 'error'
            );

            // Add GrinningCat card to opponent's deck
            this.giveCardToOpponent(catActor, position);
            
            // Show card gift animation
            await this.showCardGiftAnimation(catActor, position);
        }
    }

    // Give GrinningCat card to opponent's deck
    giveCardToOpponent(catActor, position) {
        const attackerSide = catActor.hero.side;
        const opponentSide = attackerSide === 'player' ? 'opponent' : 'player';
        
        // Get opponent's deck
        const opponentDeck = this.battleManager.getDeckBySide(opponentSide);
        const newOpponentDeck = [...opponentDeck, 'GrinningCat'];
        
        // Update opponent's deck
        this.battleManager.updateDeckDuringBattle(opponentSide, newOpponentDeck);
        
        // Send card gift to guest
        this.sendCardGift(catActor, position);
    }

    // Show card gift animation above the Cat
    async showCardGiftAnimation(catActor, position) {
        const attackerSide = catActor.hero.side;
        const catElement = this.getCatElement(attackerSide, position, catActor.index);
        
        if (!catElement) return;

        const rect = catElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const cardAnimation = document.createElement('div');
        cardAnimation.className = 'grinning-cat-card-gift-animation';
        
        // Create mini card image
        const cardPath = './Cards/All/GrinningCat.png';
        cardAnimation.innerHTML = `
            <div class="gift-card-container">
                <img src="${cardPath}" alt="GrinningCat" class="gift-card-image" 
                     onerror="this.src='./Cards/placeholder.png'">
                <div class="gift-sparkles">✨</div>
            </div>
        `;
        
        cardAnimation.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: grinningCatCardGift ${this.battleManager.getSpeedAdjustedDelay(this.CARD_GIFT_ANIMATION_TIME)}ms ease-out forwards;
        `;

        document.body.appendChild(cardAnimation);
        this.activeAnimations.add(cardAnimation);

        // Remove animation after completion
        setTimeout(() => {
            if (cardAnimation.parentNode) {
                cardAnimation.remove();
                this.activeAnimations.delete(cardAnimation);
            }
        }, this.battleManager.getSpeedAdjustedDelay(this.CARD_GIFT_ANIMATION_TIME));

        await this.battleManager.delay(this.CARD_GIFT_ANIMATION_TIME / 2); // Wait for animation to reach peak
    }

    // Get the DOM element for Grinning Cat creature
    getCatElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Send counter update to guest for synchronization
    sendCounterUpdate(catActor, position) {
        const attackerSide = catActor.hero.side;
        
        this.battleManager.sendBattleUpdate('creature_counter_update', {
            creatureData: {
                side: attackerSide,
                position: position,
                creatureIndex: catActor.index,
                name: catActor.data.name,
                absoluteSide: catActor.hero.absoluteSide,
                counters: catActor.data.counters || 0
            }
        });
    }

    // Send card gift to guest for synchronization
    sendCardGift(catActor, position) {
        const attackerSide = catActor.hero.side;
        
        this.battleManager.sendBattleUpdate('grinning_cat_card_gift', {
            catData: {
                side: attackerSide,
                position: position,
                creatureIndex: catActor.index,
                name: catActor.data.name,
                absoluteSide: catActor.hero.absoluteSide,
                counters: catActor.data.counters || 0
            }
        });
    }

    // Handle counter update on guest side (reuses existing counter update logic)
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

    // Handle card gift on guest side
    handleGuestCardGift(data) {
        const { catData } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const catLocalSide = (catData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `😸 ${catData.name} gives a GrinningCat card to the opponent!`, 
            catLocalSide === 'player' ? 'success' : 'error'
        );

        // Create the animation on guest side
        this.createGuestCardGiftAnimation(catData, myAbsoluteSide);
    }

    // Create card gift animation on guest side
    async createGuestCardGiftAnimation(catData, myAbsoluteSide) {
        const catLocalSide = (catData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const catElement = this.getCatElement(
            catLocalSide,
            catData.position,
            catData.creatureIndex
        );

        if (!catElement) {
            console.warn('Grinning Cat element not found on guest side');
            return;
        }

        const rect = catElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const cardAnimation = document.createElement('div');
        cardAnimation.className = 'grinning-cat-card-gift-animation';
        
        // Create mini card image
        const cardPath = './Cards/All/GrinningCat.png';
        cardAnimation.innerHTML = `
            <div class="gift-card-container">
                <img src="${cardPath}" alt="GrinningCat" class="gift-card-image" 
                     onerror="this.src='./Cards/placeholder.png'">
                <div class="gift-sparkles">✨</div>
            </div>
        `;
        
        cardAnimation.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: grinningCatCardGift ${this.battleManager.getSpeedAdjustedDelay(this.CARD_GIFT_ANIMATION_TIME)}ms ease-out forwards;
        `;

        document.body.appendChild(cardAnimation);
        this.activeAnimations.add(cardAnimation);

        // Remove animation after completion
        setTimeout(() => {
            if (cardAnimation.parentNode) {
                cardAnimation.remove();
                this.activeAnimations.delete(cardAnimation);
            }
        }, this.battleManager.getSpeedAdjustedDelay(this.CARD_GIFT_ANIMATION_TIME));
    }

    // Update creature counter display (reuses existing logic)
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
            
            // Add special styling for Grinning Cat counters (different from Corgi)
            const isAtGiftThreshold = counters >= this.COUNTERS_PER_CARD_GIFT;
            counterDisplay.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background: ${isAtGiftThreshold ? 'purple' : 'white'};
                color: ${isAtGiftThreshold ? 'white' : '#333'};
                border: 2px solid ${isAtGiftThreshold ? '#8e44ad' : '#666'};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 10;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                ${isAtGiftThreshold ? 'animation: grinningCatCounterGlow 2s ease-in-out infinite;' : ''}
            `;
            
            creatureElement.appendChild(counterDisplay);
        }
    }

    // Clean up all active animations (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeAnimations.size} active Grinning Cat animations`);
        
        this.activeAnimations.forEach(animation => {
            try {
                if (animation && animation.parentNode) {
                    animation.remove();
                }
            } catch (error) {
                console.warn('Error removing Grinning Cat animation during cleanup:', error);
            }
        });
        
        this.activeAnimations.clear();

        // Also remove any orphaned animation elements
        try {
            const orphanedAnimations = document.querySelectorAll('.grinning-cat-card-gift-animation');
            orphanedAnimations.forEach(animation => {
                if (animation.parentNode) {
                    animation.remove();
                }
            });
            
            if (orphanedAnimations.length > 0) {
                console.log(`Cleaned up ${orphanedAnimations.length} orphaned Grinning Cat animations`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned Grinning Cat animations:', error);
        }
    }

    // Inject CSS styles for Grinning Cat effects
    injectGrinningCatStyles() {
        if (document.getElementById('grinningCatStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'grinningCatStyles';
        style.textContent = `
            /* Grinning Cat Card Gift Animation */
            @keyframes grinningCatCardGift {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) translateY(0px);
                }
                25% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.8) translateY(-20px);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0) translateY(-40px);
                }
                75% {
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(0.9) translateY(-60px);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.6) translateY(-80px);
                }
            }

            /* Gift card container */
            .gift-card-container {
                position: relative;
                width: 40px;
                height: 56px;
                border-radius: 4px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
            }

            .gift-card-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 4px;
            }

            .gift-sparkles {
                position: absolute;
                top: -10px;
                right: -10px;
                font-size: 16px;
                animation: sparkleRotate 1.5s linear infinite;
            }

            @keyframes sparkleRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Grinning Cat Counter Glow Effect (when at gift threshold) */
            @keyframes grinningCatCounterGlow {
                0%, 100% { 
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 10px rgba(142, 68, 173, 0.6);
                    transform: scale(1);
                }
                50% { 
                    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4), 0 0 20px rgba(142, 68, 173, 0.9);
                    transform: scale(1.1);
                }
            }

            /* Enhanced creature glow when Grinning Cat is at gift threshold */
            .creature-icon.grinning-cat-gift-ready .creature-sprite {
                filter: brightness(1.3) drop-shadow(0 0 15px rgba(142, 68, 173, 0.8));
                animation: grinningCatGiftGlow 2s ease-in-out infinite alternate;
            }

            @keyframes grinningCatGiftGlow {
                0% { 
                    filter: brightness(1.3) drop-shadow(0 0 15px rgba(142, 68, 173, 0.8));
                }
                100% { 
                    filter: brightness(1.6) drop-shadow(0 0 25px rgba(142, 68, 173, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const GrinningCatHelpers = {
    // Check if any creature in a list is Grinning Cat
    hasGrinningCatInList(creatures) {
        return creatures.some(creature => GrinningCatCreature.isGrinningCat(creature.name));
    },

    // Get all Grinning Cat creatures from a list
    getGrinningCatFromList(creatures) {
        return creatures.filter(creature => GrinningCatCreature.isGrinningCat(creature.name));
    }
};

export default GrinningCatCreature;