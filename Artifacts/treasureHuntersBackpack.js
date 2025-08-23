// treasureHuntersBackpack.js - TreasureHuntersBackpack Artifact Handler Module

import { getCardsBySubtype } from '../cardDatabase.js';

export const treasureHuntersBackpackArtifact = {
    // Card name this artifact handles
    cardName: 'TreasureHuntersBackpack',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`TreasureHuntersBackpack clicked at index ${cardIndex}`);
        
        // Activate the treasure hunter's backpack effect
        await this.activateTreasureHuntersBackpack(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`TreasureHuntersBackpack dragged outside hand from index ${cardIndex}`);
        
        // Activate the treasure hunter's backpack effect
        await this.activateTreasureHuntersBackpack(cardIndex, heroSelection);
    },
    
    // Core logic to equip random Equip artifacts to all ally Heroes
    async activateTreasureHuntersBackpack(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const goldManager = heroSelection.getGoldManager();
        const heroEquipmentManager = heroSelection.heroEquipmentManager; // Use the equipment manager!
        
        if (!handManager || !goldManager || !heroEquipmentManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Get cost from card database
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 3; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showBackpackError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'TreasureHuntersBackpack');
        
        console.log(`TreasureHuntersBackpack: Spent ${cost} gold to activate`);
        
        // Remove TreasureHuntersBackpack card from hand first
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Get all Equip artifacts from the database
        const allEquipCards = getCardsBySubtype('Equip');
        console.log('🔍 All Equip cards (both Artifacts and Spells):', allEquipCards);

        // FILTER: Only get Equip ARTIFACTS, not Equip SPELLS
        const allEquipArtifacts = allEquipCards.filter(card => 
            card && card.cardType === 'Artifact' && card.subtype === 'Equip'
        );

        console.log('🔍 Filtered Equip ARTIFACTS only:', allEquipArtifacts);

        const equipNames = allEquipArtifacts.map(artifact => artifact.name);
        console.log('🔍 Final equip artifact names:', equipNames);

        if (equipNames.length === 0) {
            console.warn('🎒 TreasureHuntersBackpack: No Equip Artifacts found in database!');
            this.showBackpackAnimation([], cost);
            await heroSelection.saveGameState();
            return;
        }
        
        // Get all hero positions that have heroes
        const allyHeroPositions = this.getAllyHeroPositions(heroSelection);
        
        if (allyHeroPositions.length === 0) {
            console.warn('🎒 TreasureHuntersBackpack: No ally Heroes found!');
            this.showBackpackAnimation([], cost);
            await heroSelection.saveGameState();
            return;
        }
        
        // Equip random artifacts to each ally Hero position
        const equipResults = [];

        for (const position of allyHeroPositions) {
            // Select a random Equip artifact for this position
            const selectedEquip = this.selectRandomEquip(equipNames);
            
            if (selectedEquip) {
                console.log(`🔍 Attempting to equip ${selectedEquip} to ${position} FOR FREE`);
                
                // Get the full artifact info
                const equipInfo = allEquipArtifacts.find(artifact => artifact.name === selectedEquip);
                
                if (!equipInfo) {
                    console.error(`🔍 Could not find equipment info for ${selectedEquip}`);
                    continue;
                }
                
                // BYPASS COST CHECK: Add equipment directly to the hero for FREE
                const equipmentEntry = {
                    name: selectedEquip,
                    cardName: selectedEquip,
                    cost: equipInfo.cost || 0,
                    image: equipInfo.image || `./Cards/All/${selectedEquip}.png`,
                    equippedAt: Date.now(),
                    equippedBy: 'TreasureHuntersBackpack', // Mark as free equipment
                    free: true // Flag to indicate this was free
                };
                
                // Add directly to the equipment manager's internal storage (bypassing cost check)
                if (!heroEquipmentManager.heroEquipment[position]) {
                    heroEquipmentManager.heroEquipment[position] = [];
                }
                heroEquipmentManager.heroEquipment[position].push(equipmentEntry);
                
                // Get hero name for display
                const formation = heroSelection.formationManager.getBattleFormation();
                const hero = formation[position];
                
                equipResults.push({
                    heroName: hero ? hero.name : position,
                    equipName: selectedEquip,
                    position: position
                });
                
                console.log(`🎒 TreasureHuntersBackpack: Equipped ${selectedEquip} (cost: ${equipInfo.cost}) to ${hero ? hero.name : position} FOR FREE!`);
                
                // Trigger the equipment change callback if it exists
                if (heroEquipmentManager.onEquipmentChangeCallback) {
                    heroEquipmentManager.onEquipmentChangeCallback({
                        type: 'artifact_equipped',
                        heroPosition: position,
                        artifactName: selectedEquip,
                        hero: hero,
                        free: true
                    });
                }
            }
        }
        
        // Show visual feedback
        this.showBackpackAnimation(equipResults, cost);

        // Update UI (if needed for hero displays)
        if (heroSelection.updateBattleFormationUI) {
            heroSelection.updateBattleFormationUI();
        }

        // NEW: Update the hand display to remove the used card visually
        if (heroSelection.updateHandDisplay) {
            heroSelection.updateHandDisplay();
        }
        
        // Update gold display after spending
        heroSelection.updateGoldDisplay();

        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`🎒 TreasureHuntersBackpack activated! Equipped ${equipResults.length} items to ${allyHeroPositions.length} Heroes for ${cost} gold.`);
    },
    
    // Show error message when not enough gold
    showBackpackError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'treasure-backpack-error';
        errorDiv.innerHTML = `
            <div class="treasure-backpack-error-content">
                <span class="treasure-backpack-error-icon">⛔</span>
                <span class="treasure-backpack-error-text">${message}</span>
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
            background: linear-gradient(135deg, #dc3545 0%, #8b4513 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: treasureBackpackErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'treasureBackpackErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },

    getAllyHeroPositions(heroSelection) {
        const positions = [];
        
        if (heroSelection.formationManager) {
            const formation = heroSelection.formationManager.getBattleFormation();
            console.log(`🔍 Checking formation:`, formation);
            
            // Check each position for a hero
            ['left', 'center', 'right'].forEach(position => {
                if (formation[position] && formation[position].name) {
                    positions.push(position);
                    console.log(`🔍 Found hero at ${position}: ${formation[position].name}`);
                }
            });
        }
        
        console.log(`🔍 Total hero positions found: ${positions.length}`, positions);
        return positions;
    },
    
    // Select 1 random Equip artifact from the available list
    selectRandomEquip(equipNames) {
        if (equipNames.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * equipNames.length);
        return equipNames[randomIndex];
    },
    
    // Show treasure hunter's backpack animation with equipped items (updated to include cost)
    showBackpackAnimation(equipResults, cost) {
        // Create main backpack animation
        const backpackBurst = document.createElement('div');
        backpackBurst.className = 'treasure-backpack-effect-burst';
        
        backpackBurst.innerHTML = `
            <div class="backpack-opening">
                <span class="backpack-icon">🎒</span>
                <div class="opening-sparkles">
                    <span class="sparkle">✨</span>
                    <span class="sparkle">✨</span>
                    <span class="sparkle">✨</span>
                </div>
            </div>
            <div class="backpack-text">
                <div class="backpack-main">Treasure Discovered!</div>
                <div class="backpack-count">Equipped ${equipResults.length} item${equipResults.length !== 1 ? 's' : ''}!</div>
                <div class="backpack-cost">Cost: ${cost} Gold</div>
            </div>
        `;
        
        // Position in center of screen
        backpackBurst.style.cssText = `
            position: fixed;
            left: 50%;
            top: 30%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
        `;
        
        document.body.appendChild(backpackBurst);
        
        // Remove main animation after 3 seconds
        setTimeout(() => {
            backpackBurst.remove();
        }, 3000);
        
        // Show individual equip animations above each Hero
        equipResults.forEach((result, index) => {
            setTimeout(() => {
                // FIX: Pass the entire result object, not result.hero
                this.showHeroEquipAnimation(result, result.equipName);
            }, 500 + (index * 200)); // Stagger the individual animations
        });
        
        // Play sound effect if available
        this.playBackpackSound();
    },
    
    // Show individual equip animation above a specific Hero
    showHeroEquipAnimation(heroData, equipName) {
        // heroData now contains { heroName, position } instead of just hero object
        const position = heroData.position;
        const heroName = heroData.heroName;
        
        // Try to find the Hero's visual element on screen using position
        const heroElement = this.findHeroElementByPosition(position);
        
        const equipAnimation = document.createElement('div');
        equipAnimation.className = 'hero-equip-animation';
        
        const formattedEquipName = this.formatEquipName(equipName);
        
        equipAnimation.innerHTML = `
            <div class="equip-icon">⚔️</div>
            <div class="equip-text">
                <div class="equip-name">${formattedEquipName}</div>
                <div class="equip-status">equipped!</div>
            </div>
        `;
        
        // Position above the Hero or fallback to center
        if (heroElement) {
            const heroRect = heroElement.getBoundingClientRect();
            equipAnimation.style.cssText = `
                position: fixed;
                left: ${heroRect.left + heroRect.width / 2}px;
                top: ${heroRect.top - 60}px;
                transform: translateX(-50%);
                z-index: 10001;
                pointer-events: none;
                animation: heroEquipFade 3s ease-out forwards;
            `;
        } else {
            // Fallback position if Hero element not found
            const randomOffset = (Math.random() - 0.5) * 400;
            equipAnimation.style.cssText = `
                position: fixed;
                left: ${50 + (randomOffset / window.innerWidth * 100)}%;
                top: 60%;
                transform: translateX(-50%);
                z-index: 10001;
                pointer-events: none;
                animation: heroEquipFade 3s ease-out forwards;
            `;
        }
        
        document.body.appendChild(equipAnimation);
        
        // Remove after animation
        setTimeout(() => {
            equipAnimation.remove();
        }, 3000);
    },

    findHeroElementByPosition(position) {
        const selectors = [
            `[data-position="${position}"]`,
            `.team-slot[data-position="${position}"]`,
            `.hero-slot-${position}`,
            `.${position}-slot`
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }
        
        return null;
    },

    
    // Try to find the visual element representing a Hero on screen
    findHeroElement(hero) {
        if (!hero || !hero.name) return null;
        
        // Try common selectors for Hero elements
        const selectors = [
            `[data-hero-name="${hero.name}"]`,
            `[data-hero="${hero.name}"]`,
            `.hero-card[data-name="${hero.name}"]`,
            `.battle-hero[data-name="${hero.name}"]`,
            `.hero-${hero.name.toLowerCase()}`,
            `.hero-display[data-hero="${hero.name}"]`
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }
        
        // If no specific Hero element found, return null
        return null;
    },
    
    // Format equipment name for display
    formatEquipName(equipName) {
        return equipName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Play treasure discovery sound
    playBackpackSound() {
        // Placeholder for sound effect
        console.log('🎵 Treasure discovery sound!');
    }
};

// Add styles for the animations (updated to include error styles and cost display)
if (typeof document !== 'undefined' && !document.getElementById('treasureBackpackStyles')) {
    const style = document.createElement('style');
    style.id = 'treasureBackpackStyles';
    style.textContent = `
        /* Treasure Hunter's Backpack Effect Animation */
        .treasure-backpack-effect-burst {
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
            min-width: 300px;
            text-align: center;
        }
        
        .backpack-opening {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
            animation: floatUp 2.5s ease-out;
        }
        
        .backpack-icon {
            font-size: 50px;
            animation: backpackOpen 2s ease-in-out infinite;
            filter: drop-shadow(0 0 10px rgba(139, 69, 19, 0.8));
        }
        
        .opening-sparkles {
            display: flex;
            gap: 8px;
        }
        
        .sparkle {
            font-size: 22px;
            animation: sparkle 1.5s ease-in-out infinite;
            filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.8));
        }
        
        .sparkle:nth-child(1) {
            animation-delay: 0s;
        }
        
        .sparkle:nth-child(2) {
            animation-delay: 0.4s;
        }
        
        .sparkle:nth-child(3) {
            animation-delay: 0.8s;
        }
        
        .backpack-text {
            text-align: center;
            animation: textReveal 1s ease-out 1s both;
        }
        
        .backpack-main {
            font-size: 26px;
            font-weight: bold;
            color: #8b4513;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(139, 69, 19, 0.8);
            margin-bottom: 8px;
        }
        
        .backpack-count {
            font-size: 18px;
            font-weight: bold;
            color: #228b22;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(34, 139, 34, 0.6);
            margin-bottom: 8px;
        }
        
        .backpack-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
        }
        
        /* Error styles */
        .treasure-backpack-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .treasure-backpack-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .treasure-backpack-error-icon {
            font-size: 20px;
        }
        
        .treasure-backpack-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes treasureBackpackErrorBounce {
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
        
        @keyframes treasureBackpackErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Individual Hero Equipment Animation */
        .hero-equip-animation {
            display: flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.95) 0%, rgba(255, 140, 0, 0.95) 100%);
            padding: 8px 16px;
            border-radius: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.5);
            animation: heroEquipBounce 0.6s ease-out;
        }
        
        .equip-icon {
            font-size: 24px;
            animation: equipIconSpin 1s ease-out;
            filter: drop-shadow(0 0 5px rgba(139, 69, 19, 0.8));
        }
        
        .equip-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        .equip-name {
            font-size: 14px;
            font-weight: bold;
            color: #8b4513;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
            line-height: 1.2;
        }
        
        .equip-status {
            font-size: 12px;
            font-weight: bold;
            color: #228b22;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
            text-transform: uppercase;
        }
        
        @keyframes floatUp {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-60px);
            }
        }
        
        @keyframes backpackOpen {
            0%, 100% {
                transform: scale(1) rotateY(0deg);
            }
            50% {
                transform: scale(1.1) rotateY(15deg);
            }
        }
        
        @keyframes sparkle {
            0%, 100% {
                transform: scale(1) rotate(0deg);
                opacity: 0.7;
            }
            50% {
                transform: scale(1.4) rotate(180deg);
                opacity: 1;
            }
        }
        
        @keyframes textReveal {
            from {
                transform: scale(0.5);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }
        
        @keyframes heroEquipBounce {
            0% {
                transform: translateX(-50%) translateY(20px) scale(0.8);
                opacity: 0;
            }
            60% {
                transform: translateX(-50%) translateY(-5px) scale(1.05);
                opacity: 1;
            }
            100% {
                transform: translateX(-50%) translateY(0) scale(1);
                opacity: 1;
            }
        }
        
        @keyframes heroEquipFade {
            0% {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            70% {
                opacity: 1;
                transform: translateX(-50%) translateY(-10px);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }
        }
        
        @keyframes equipIconSpin {
            from {
                transform: rotateY(0deg);
            }
            to {
                transform: rotateY(360deg);
            }
        }
        
        @keyframes fadeOut {
            0% {
                opacity: 1;
            }
            70% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }
        
        /* Enhanced hover effects for TreasureHuntersBackpack cards */
        .hand-card[data-card-name="TreasureHuntersBackpack"]:hover {
            transform: translateY(-10px) scale(1.05);
            box-shadow: 0 12px 35px rgba(139, 69, 19, 0.6);
            transition: all 0.3s ease;
        }
        
        .hand-card[data-card-name="TreasureHuntersBackpack"] {
            position: relative;
            overflow: visible;
        }
        
        @keyframes backpackGlow {
            0%, 100% { 
                transform: scale(1); 
                opacity: 0.8; 
            }
            50% { 
                transform: scale(1.05); 
                opacity: 1; 
            }
        }
    `;
    document.head.appendChild(style);
}