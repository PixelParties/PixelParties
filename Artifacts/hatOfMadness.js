// ./Artifacts/hatOfMadness.js - Hat of Madness Artifact with Action-Based Random Card Addition

import { getAllAbilityCards } from '../cardDatabase.js';

export class HatOfMadnessArtifact {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeAnimations = new Set();
        
        // Inject CSS styles for animations
        this.injectHatOfMadnessStyles();
        
        console.log('🎩 Hat of Madness Artifact module initialized');
    }

    // Count total HatOfMadness items equipped by a hero
    countHatOfMadnessOnHero(heroPosition, equipmentData) {
        if (!equipmentData || !equipmentData[heroPosition]) {
            return 0;
        }
        
        const equipment = equipmentData[heroPosition];
        return equipment.filter(item => 
            item && (item.name === 'HatOfMadness' || item.cardName === 'HatOfMadness')
        ).length;
    }

    // Check and trigger Hat of Madness on hero action
    async checkAndTriggerOnHeroAction(hero, heroPosition) {
        if (!this.battleManager.isAuthoritative) return;
        
        // Determine which side this hero is on and get their equipment
        const isPlayerHero = hero.side === 'player';
        const equipmentData = isPlayerHero ? 
            this.battleManager.playerEquips : 
            this.battleManager.opponentEquips;
        
        // Count Hat of Madness items on this hero
        const hatCount = this.countHatOfMadnessOnHero(heroPosition, equipmentData);
        
        if (hatCount === 0) return;
        
        // Roll for each Hat of Madness independently (20% chance each)
        const triggeredHats = [];
        for (let i = 0; i < hatCount; i++) {
            const roll = this.battleManager.getRandomPercent();
            if (roll <= 20) { // 20% chance
                triggeredHats.push(i);
            }
        }
        
        if (triggeredHats.length === 0) return;
        
        // Generate random cards for triggered hats
        const randomCards = this.generateRandomCards(triggeredHats.length);
        const ownerSide = hero.side;
        const targetSide = ownerSide === 'player' ? 'opponent' : 'player';
        
        // Add cards to target deck
        const currentDeck = this.battleManager.getDeckBySide(targetSide);
        const newDeck = [...currentDeck, ...randomCards];
        this.battleManager.updateDeckDuringBattle(targetSide, newDeck);

        // Log the overall effect
        this.battleManager.addCombatLog(
            `🎩 ${hero.name}'s Hat of Madness triggers! ${triggeredHats.length} random card${triggeredHats.length > 1 ? 's' : ''} added to ${targetSide === 'player' ? 'your' : 'opponent\'s'} deck!`,
            ownerSide === 'player' ? 'success' : 'error'
        );

        // Show individual card animations with staggered timing
        for (let i = 0; i < randomCards.length; i++) {
            const cardName = randomCards[i];
            
            // Stagger animations
            setTimeout(async () => {
                await this.showMadnessCardAnimation(cardName, ownerSide, this.battleManager);
                
                // Log individual card
                this.battleManager.addCombatLog(
                    `🎭 Added: ${this.formatCardName(cardName)}`,
                    ownerSide === 'player' ? 'success' : 'error'
                );
            }, i * 400); // 400ms between each card animation
        }

        // Send network sync to guest
        this.sendHatOfMadnessActionSync(
            triggeredHats.length, 
            randomCards, 
            ownerSide, 
            hero.name,
            this.battleManager
        );
        
        // Small delay to let first animation start
        await this.battleManager.delay(200);
    }

    // Count total HatOfMadness items equipped by a formation (kept for compatibility)
    countHatOfMadnessInFormation(formation, heroEquipmentManager, side) {
        let totalHats = 0;
        const hatDetails = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = formation[position];
            if (!hero) return;
            
            // Get equipment for this hero
            const equipment = heroEquipmentManager ? 
                heroEquipmentManager.getHeroEquipment(position) : [];
            
            // Count HatOfMadness items
            const hatsCount = equipment.filter(item => 
                item && (item.name === 'HatOfMadness' || item.cardName === 'HatOfMadness')
            ).length;
            
            if (hatsCount > 0) {
                totalHats += hatsCount;
                hatDetails.push({
                    heroName: hero.name,
                    position: position,
                    hatCount: hatsCount
                });
            }
        });
        
        return { totalHats, hatDetails };
    }

    // Process end-of-battle effects (now does nothing - removed functionality)
    async processEndOfBattleEffects(battleManager) {
        // Hat of Madness no longer triggers at end of battle
        // All functionality moved to action-based triggers
        console.log('🎩 Hat of Madness end-of-battle processing skipped (now action-based)');
    }

    countHatOfMadnessInEquipment(formation, equipmentData, side) {
        let totalHats = 0;
        const hatDetails = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = formation[position];
            if (!hero) return;
            
            // Get equipment for this position from battleManager's equipment data
            const equipment = equipmentData && equipmentData[position] ? equipmentData[position] : [];
            
            // Count HatOfMadness items
            const hatsCount = equipment.filter(item => 
                item && (item.name === 'HatOfMadness' || item.cardName === 'HatOfMadness')
            ).length;
            
            if (hatsCount > 0) {
                totalHats += hatsCount;
                hatDetails.push({
                    heroName: hero.name,
                    position: position,
                    hatCount: hatsCount
                });
            }
        });
        
        return { totalHats, hatDetails };
    }

    // Generate completely random cards from the entire card pool
    generateRandomCards(count) {
        const allCards = this.getAllAvailableCards();
        const randomCards = [];
        
        for (let i = 0; i < count; i++) {
            const randomIndex = this.battleManager.getRandomInt(0, allCards.length - 1);
            randomCards.push(allCards[randomIndex]);
        }
        
        return randomCards;
    }

    // Get all available cards from the card database
    getAllAvailableCards() {
        try {
            // Get all ability cards from the database
            const abilityCards = getAllAbilityCards();
            
            // If we have cards from database, use them
            if (abilityCards && abilityCards.length > 0) {
                return abilityCards.map(card => card.name || card.cardName).filter(name => name);
            }
        } catch (error) {
            console.warn('Could not load cards from database, using fallback list');
        }
        
        // Fallback list of common cards
        return [
            'Fireball', 'Icebolt', 'Lightning', 'HealingMelody', 'Fireshield', 'Teleport',
            'Archer', 'Cavalry', 'FrontSoldier', 'SkeletonArcher', 'SkeletonMage', 'RoyalCorgi',
            'Fighting', 'MagicArts', 'Necromancy', 'Leadership', 'Training', 'Alchemy',
            'DestructionMagic', 'SummoningMagic', 'SupportMagic', 'DecayMagic', 'Biomancy',
            'Wealth', 'Navigation', 'WantedPoster', 'Inventing', 'Adventurousness', 'Charme',
            'BombArrow', 'FlameArrow', 'GoldenArrow', 'PoisonedArrow', 'RainbowsArrow',
            'BoulderInABottle', 'MonsterInABottle', 'BottledLightning', 'BottledFlame', 'AcidVial'
        ];
    }

    // Show card animation similar to GrinningCat's gift animation
    async showMadnessCardAnimation(cardName, ownerSide, battleManager) {
        // Create floating card animation
        const cardAnimation = document.createElement('div');
        cardAnimation.className = 'hat-of-madness-card-animation';
        
        // Use proper card path
        const cardPath = `./Cards/All/${cardName}.png`;
        cardAnimation.innerHTML = `
            <div class="madness-card-container">
                <img src="${cardPath}" alt="${cardName}" class="madness-card-image" 
                     onerror="this.src='./Cards/placeholder.png'">
                <div class="madness-effects">🎩✨🎭</div>
                <div class="madness-label">${this.formatCardName(cardName)}</div>
            </div>
        `;
        
        // Position randomly across the screen for chaotic effect
        const randomX = 20 + Math.random() * 60; // 20% to 80% of screen width
        const randomY = 20 + Math.random() * 60; // 20% to 80% of screen height
        
        cardAnimation.style.cssText = `
            position: fixed;
            left: ${randomX}%;
            top: ${randomY}%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: hatOfMadnessCardGift ${battleManager.getSpeedAdjustedDelay(2500)}ms ease-out forwards;
        `;

        document.body.appendChild(cardAnimation);
        this.activeAnimations.add(cardAnimation);

        // Remove animation after completion
        setTimeout(() => {
            if (cardAnimation.parentNode) {
                cardAnimation.remove();
                this.activeAnimations.delete(cardAnimation);
            }
        }, battleManager.getSpeedAdjustedDelay(2500));

        // Return promise that resolves when animation peaks
        await battleManager.delay(1200);
    }

    // Send network synchronization to guest for action-based triggers
    sendHatOfMadnessActionSync(hatCount, randomCards, ownerSide, heroName, battleManager) {
        if (battleManager.sendBattleUpdate) {
            // Convert relative sides to absolute sides for network sync
            const ownerAbsoluteSide = battleManager.isHost ? 
                (ownerSide === 'player' ? 'host' : 'guest') :
                (ownerSide === 'player' ? 'guest' : 'host');
                
            battleManager.sendBattleUpdate('hat_of_madness_action_trigger', {
                hatCount: hatCount,
                cardsAdded: randomCards,
                ownerAbsoluteSide: ownerAbsoluteSide,
                heroName: heroName,
                timestamp: Date.now()
            });
        }
    }

    // Send network synchronization to guest (legacy end-of-battle method, kept for compatibility)
    sendHatOfMadnessSync(hatCount, randomCards, ownerSide, hatDetails, battleManager) {
        if (battleManager.sendBattleUpdate) {
            // Convert relative sides to absolute sides for network sync
            const ownerAbsoluteSide = battleManager.isHost ? 
                (ownerSide === 'player' ? 'host' : 'guest') :
                (ownerSide === 'player' ? 'guest' : 'host');
                
            battleManager.sendBattleUpdate('hat_of_madness_cards_added', {
                hatCount: hatCount,
                cardsAdded: randomCards,
                ownerAbsoluteSide: ownerAbsoluteSide,  // Use absolute side
                hatDetails: hatDetails,
                timestamp: Date.now()
            });
        }
    }

    // Handle guest-side synchronization for action-based triggers
    handleGuestHatOfMadnessActionSync(data, battleManager) {
        const { hatCount, cardsAdded, ownerAbsoluteSide, heroName } = data;
        
        // Convert absolute side to local perspective
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const ownerLocalSide = (ownerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetSide = ownerLocalSide === 'player' ? 'opponent' : 'player';
        
        // Show animations and log messages
        cardsAdded.forEach((cardName, index) => {
            setTimeout(async () => {
                await this.showMadnessCardAnimation(cardName, ownerLocalSide, battleManager);
                
                battleManager.addCombatLog(
                    `🎭 Added: ${this.formatCardName(cardName)}`,
                    ownerLocalSide === 'player' ? 'success' : 'error'
                );
            }, index * 400);
        });
        
        // Log the overall effect
        battleManager.addCombatLog(
            `🎩 ${heroName}'s Hat of Madness triggers! ${hatCount} random card${hatCount > 1 ? 's' : ''} added to ${targetSide === 'player' ? 'your' : 'opponent\'s'} deck!`,
            ownerLocalSide === 'player' ? 'success' : 'error'
        );
    }

    // Handle guest-side synchronization (legacy end-of-battle method, kept for compatibility)
    handleGuestHatOfMadnessSync(data, battleManager) {
        const { hatCount, cardsAdded, ownerAbsoluteSide, hatDetails } = data;
        
        // Convert absolute side to local perspective
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const ownerLocalSide = (ownerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetSide = ownerLocalSide === 'player' ? 'opponent' : 'player';
        
        // Show animations and log messages
        cardsAdded.forEach((cardName, index) => {
            setTimeout(async () => {
                await this.showMadnessCardAnimation(cardName, ownerLocalSide, battleManager);
                
                battleManager.addCombatLog(
                    `🎭 Added: ${this.formatCardName(cardName)}`,
                    ownerLocalSide === 'player' ? 'success' : 'error'
                );
            }, index * 400);
        });
        
        // Log the overall effect
        battleManager.addCombatLog(
            `🎩 Hat of Madness madness! ${hatCount} random cards added to ${targetSide === 'player' ? 'your' : 'opponent\'s'} deck!`,
            ownerLocalSide === 'player' ? 'success' : 'error'
        );
    }

    // Format card name for display (same as other modules)
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Inject CSS styles for Hat of Madness animations
    injectHatOfMadnessStyles() {
        if (document.getElementById('hatOfMadnessStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'hatOfMadnessStyles';
        style.textContent = `
            /* Hat of Madness Card Animation */
            @keyframes hatOfMadnessCardGift {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.2) rotate(-180deg);
                    filter: hue-rotate(0deg) brightness(0.5);
                }
                20% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.9) rotate(-90deg);
                    filter: hue-rotate(90deg) brightness(1.2);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(0deg);
                    filter: hue-rotate(180deg) brightness(1.5);
                }
                70% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1) rotate(45deg);
                    filter: hue-rotate(270deg) brightness(1.3);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.4) rotate(180deg);
                    filter: hue-rotate(360deg) brightness(0.7);
                }
            }

            /* Madness card container with chaotic styling */
            .madness-card-container {
                position: relative;
                width: 70px;
                height: 98px;
                border-radius: 8px;
                overflow: visible;
                box-shadow: 0 6px 20px rgba(128, 0, 128, 0.9), 
                           0 0 30px rgba(255, 0, 255, 0.6),
                           inset 0 0 10px rgba(128, 0, 128, 0.3);
                border: 3px solid transparent;
                background: linear-gradient(45deg, #800080, #ff00ff, #800080, #ff00ff);
                background-size: 400% 400%;
                animation: madnessBorderPulse 1s ease-in-out infinite;
            }

            .madness-card-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 5px;
                filter: saturate(1.5) contrast(1.2);
            }

            .madness-effects {
                position: absolute;
                top: -20px;
                right: -20px;
                font-size: 24px;
                animation: madnessEffectsFloat 2s ease-in-out infinite;
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
            }

            .madness-label {
                position: absolute;
                bottom: -25px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 10px;
                font-weight: bold;
                color: #ff00ff;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                background: rgba(128, 0, 128, 0.8);
                padding: 2px 6px;
                border-radius: 4px;
                white-space: nowrap;
                max-width: 100px;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            @keyframes madnessBorderPulse {
                0%, 100% { 
                    background-position: 0% 50%;
                    box-shadow: 0 6px 20px rgba(128, 0, 128, 0.9), 
                               0 0 30px rgba(255, 0, 255, 0.6);
                }
                50% { 
                    background-position: 100% 50%;
                    box-shadow: 0 8px 25px rgba(255, 0, 255, 0.9), 
                               0 0 40px rgba(128, 0, 128, 0.8);
                }
            }

            @keyframes madnessEffectsFloat {
                0%, 100% { 
                    transform: translateY(0px) rotate(0deg) scale(1);
                }
                25% { 
                    transform: translateY(-5px) rotate(90deg) scale(1.1);
                }
                50% { 
                    transform: translateY(-8px) rotate(180deg) scale(0.9);
                }
                75% { 
                    transform: translateY(-3px) rotate(270deg) scale(1.2);
                }
            }

            /* Cleanup for hat of madness animations */
            .hat-of-madness-card-animation {
                user-select: none;
                will-change: transform, opacity, filter;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Cleanup all active animations
    cleanup() {
        console.log(`Cleaning up ${this.activeAnimations.size} active Hat of Madness animations`);
        
        this.activeAnimations.forEach(animation => {
            try {
                if (animation && animation.parentNode) {
                    animation.remove();
                }
            } catch (error) {
                console.warn('Error removing Hat of Madness animation during cleanup:', error);
            }
        });
        
        this.activeAnimations.clear();

        // Remove any orphaned animations
        try {
            const orphanedAnimations = document.querySelectorAll('.hat-of-madness-card-animation');
            orphanedAnimations.forEach(animation => {
                if (animation.parentNode) {
                    animation.remove();
                }
            });
            
            if (orphanedAnimations.length > 0) {
                console.log(`Cleaned up ${orphanedAnimations.length} orphaned Hat of Madness animations`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned Hat of Madness animations:', error);
        }
    }
}

// Static helper functions for integration
export function processHatOfMadnessEndOfBattle(battleManager) {
    // End-of-battle processing is now disabled
    // All Hat of Madness functionality moved to action-based triggers
    return Promise.resolve();
}

export function handleGuestHatOfMadnessSync(data, battleManager) {
    if (!battleManager.hatOfMadnessArtifact) {
        battleManager.hatOfMadnessArtifact = new HatOfMadnessArtifact(battleManager);
    }
    return battleManager.hatOfMadnessArtifact.handleGuestHatOfMadnessSync(data, battleManager);
}

export function handleGuestHatOfMadnessActionSync(data, battleManager) {
    if (!battleManager.hatOfMadnessArtifact) {
        battleManager.hatOfMadnessArtifact = new HatOfMadnessArtifact(battleManager);
    }
    return battleManager.hatOfMadnessArtifact.handleGuestHatOfMadnessActionSync(data, battleManager);
}

export function checkHatOfMadnessOnHeroAction(battleManager, hero, heroPosition) {
    if (!battleManager.hatOfMadnessArtifact) {
        battleManager.hatOfMadnessArtifact = new HatOfMadnessArtifact(battleManager);
    }
    return battleManager.hatOfMadnessArtifact.checkAndTriggerOnHeroAction(hero, heroPosition);
}

export default HatOfMadnessArtifact;