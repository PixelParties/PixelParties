// coolCheese.js - CoolCheese Artifact Handler Module

import { getCardsBySpellSchool } from '../cardDatabase.js';

export const coolCheeseArtifact = {
    // Card name this artifact handles
    cardName: 'CoolCheese',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`CoolCheese clicked at index ${cardIndex}`);
        
        // Consume the card and distribute Fighting spells
        await this.consumeAndDistributeSpells(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`CoolCheese dragged outside hand from index ${cardIndex}`);
        
        // Consume the card and distribute Fighting spells
        await this.consumeAndDistributeSpells(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and distribute Fighting spells to all heroes
    async consumeAndDistributeSpells(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const goldManager = heroSelection.getGoldManager();
        const heroAbilitiesManager = heroSelection.getHeroAbilitiesManager();
        const heroSpellbookManager = heroSelection.heroSpellbookManager;
        const formationManager = heroSelection.formationManager;
        
        if (!handManager || !goldManager || !heroAbilitiesManager || !heroSpellbookManager || !formationManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Get cost from card database
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 2; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showCoolCheeseError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'CoolCheese');
        
        console.log(`CoolCheese: Spent ${cost} gold to activate`);
        
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Get all Fighting spells from the database
        const allFightingSpells = getCardsBySpellSchool('Fighting');
        
        if (!allFightingSpells || allFightingSpells.length === 0) {
            console.error('No Attacks found in database');
            return;
        }
        
        // Get current formation
        const formation = formationManager.getBattleFormation();
        const positions = ['left', 'center', 'right'];
        
        let spellsAdded = 0;
        const addedSpells = []; // Track what spells were added for display
        
        // Go through each hero position
        for (const position of positions) {
            const hero = formation[position];
            
            // Skip if no hero in this position
            if (!hero) {
                console.log(`No hero at ${position} position, skipping`);
                continue;
            }
            
            // Get the hero's Fighting ability level
            const fightingLevel = heroAbilitiesManager.getAbilityStackCountForPosition(position, 'Fighting');
            console.log(`${hero.name} at ${position} has Fighting level ${fightingLevel}`);
            
            // Filter Fighting spells that this hero can learn (level <= fightingLevel)
            const eligibleSpells = allFightingSpells.filter(spell => {
                const spellLevel = spell.level || 0;
                return spellLevel <= fightingLevel;
            });
            
            if (eligibleSpells.length === 0) {
                console.log(`${hero.name} has no eligible Attacks (Fighting level ${fightingLevel})`);
                continue;
            }
            
            // Randomly select one spell from eligible spells
            const randomIndex = Math.floor(Math.random() * eligibleSpells.length);
            const selectedSpell = eligibleSpells[randomIndex];
            
            // Add the spell to the hero's spellbook
            const success = heroSpellbookManager.addSpellToHero(position, selectedSpell.name);
            
            if (success) {
                console.log(`🧀 Added ${selectedSpell.name} (level ${selectedSpell.level || 0}) to ${hero.name}'s spellbook`);
                spellsAdded++;
                addedSpells.push({
                    heroName: hero.name,
                    spellName: selectedSpell.name,
                    spellLevel: selectedSpell.level || 0
                });
            } else {
                console.error(`Failed to add ${selectedSpell.name} to ${hero.name}'s spellbook`);
            }
        }
        
        // Show visual feedback
        this.showCoolCheeseAnimation(cardIndex, spellsAdded, addedSpells, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay(); // Update gold display after spending
        heroSelection.updateBattleFormationUI(); // This will show the new spells in hero tooltips
        
        // Save game state
        await heroSelection.saveGameState();
        
        // Send formation update to opponent (includes spellbook data)
        await heroSelection.sendFormationUpdate();
        
        console.log(`🧀 CoolCheese consumed! Added ${spellsAdded} Attacks to heroes for ${cost} gold.`);
    },
    
    // Show error message when not enough gold
    showCoolCheeseError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'cool-cheese-error';
        errorDiv.innerHTML = `
            <div class="cool-cheese-error-content">
                <span class="cool-cheese-error-icon">⛔</span>
                <span class="cool-cheese-error-text">${message}</span>
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
            background: linear-gradient(135deg, #dc3545 0%, #ff6b35 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: coolCheeseErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'coolCheeseErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show cool cheese animation (updated to include cost)
    showCoolCheeseAnimation(cardIndex, spellsAdded, addedSpells, cost) {
        // Create floating cheese animation (central)
        const cheeseBurst = document.createElement('div');
        cheeseBurst.className = 'cool-cheese-spell-burst';
        
        // Create spell details for tooltip
        const spellDetails = addedSpells.map(spell => 
            `${spell.heroName}: ${this.formatSpellName(spell.spellName)} (Lv${spell.spellLevel})`
        ).join('\n');
        
        cheeseBurst.innerHTML = `
            <div class="cheese-icons">
                <span class="cheese-icon">🧀</span>
                <span class="cheese-icon">⚔️</span>
                <span class="cheese-icon">🧀</span>
            </div>
            <div class="spell-text" title="${spellDetails}">
                +${spellsAdded} Attack${spellsAdded !== 1 ? 's' : ''}!
                <div class="cheese-cost">Cost: ${cost} Gold</div>
            </div>
        `;
        
        // Try to position near where the card was
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                cheeseBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                cheeseBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                cheeseBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                cheeseBurst.style.top = `${handRect.top}px`;
            }
        }
        
        // Add to body
        document.body.appendChild(cheeseBurst);
        
        // Show individual spell names above each hero
        this.showIndividualSpellNames(addedSpells);
        
        // Remove after animation
        setTimeout(() => {
            cheeseBurst.remove();
        }, 3000);
        
        // Play sound effect if available
        this.playCoolCheeseSound();
    },
    
    // Show individual spell names above each hero
    showIndividualSpellNames(addedSpells) {
        addedSpells.forEach((spellInfo, index) => {
            // Find the hero's team slot by checking all positions
            const heroSlot = this.findHeroSlot(spellInfo.heroName);
            
            if (heroSlot) {
                // Add a slight delay for each spell to create a staggered effect
                setTimeout(() => {
                    // Create floating spell name
                    const spellFloat = document.createElement('div');
                    spellFloat.className = 'individual-spell-float';
                    spellFloat.innerHTML = `
                        <div class="spell-name-display">
                            ⚔️ ${this.formatSpellName(spellInfo.spellName)}
                            <div class="spell-level">(Level ${spellInfo.spellLevel})</div>
                        </div>
                    `;
                    
                    // Position above the hero slot
                    const heroRect = heroSlot.getBoundingClientRect();
                    spellFloat.style.left = `${heroRect.left + heroRect.width / 2}px`;
                    spellFloat.style.top = `${heroRect.top - 30}px`;
                    
                    // Add to body
                    document.body.appendChild(spellFloat);
                    
                    // Remove after animation
                    setTimeout(() => {
                        if (spellFloat.parentNode) {
                            spellFloat.remove();
                        }
                    }, 3000);
                    
                    console.log(`🔍 Showing ${spellInfo.spellName} above ${spellInfo.heroName}`);
                }, index * 300); // Stagger by 300ms for each hero
            } else {
                console.warn(`Could not find hero slot for ${spellInfo.heroName}`);
            }
        });
    },
    
    // Find hero slot by hero name
    findHeroSlot(heroName) {
        const teamSlots = document.querySelectorAll('.team-slot');
        
        for (const slot of teamSlots) {
            // Look for the hero name in the slot's content
            const heroNameElement = slot.querySelector('.character-name');
            if (heroNameElement && heroNameElement.textContent.trim() === heroName) {
                return slot;
            }
            
            // Fallback: check if the slot has the hero name anywhere in its text content
            if (slot.textContent.includes(heroName)) {
                return slot;
            }
        }
        
        // If not found by name, try to find by position data attribute
        const positions = ['left', 'center', 'right'];
        for (const position of positions) {
            const slot = document.querySelector(`.team-slot[data-position="${position}"]`);
            if (slot && slot.textContent.includes(heroName)) {
                return slot;
            }
        }
        
        return null;
    },
    
    // Format spell name for display (convert CamelCase to spaced words)
    formatSpellName(spellName) {
        return spellName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Play cool cheese sound
    playCoolCheeseSound() {
        // Placeholder for sound effect
        console.log('🎵 Cool cheese spell distribution sound!');
    }
};

// Add styles for the animation (updated to include error styles and cost display)
if (typeof document !== 'undefined' && !document.getElementById('coolCheeseStyles')) {
    const style = document.createElement('style');
    style.id = 'coolCheeseStyles';
    style.textContent = `
        /* Cool Cheese Spell Burst Animation */
        .cool-cheese-spell-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
        }
        
        .cheese-icons {
            display: flex;
            gap: 15px;
            margin-bottom: 12px;
            animation: floatUp 2.2s ease-out;
            justify-content: center;
        }
        
        .cheese-icon {
            font-size: 40px;
            animation: spin 1.8s ease-out, scatter 2.2s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 8px rgba(255, 107, 53, 0.6));
        }
        
        .cheese-icon:nth-child(1) {
            animation-delay: 0s, 0.1s;
            --scatter-x: -45px;
        }
        
        .cheese-icon:nth-child(2) {
            animation-delay: 0.1s, 0.2s;
            --scatter-x: 0px;
            font-size: 44px; /* Make the sword slightly larger */
        }
        
        .cheese-icon:nth-child(3) {
            animation-delay: 0.2s, 0.3s;
            --scatter-x: 45px;
        }
        
        .spell-text {
            font-size: 22px;
            font-weight: bold;
            color: #ff6b35;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 107, 53, 0.8),
                0 0 40px rgba(255, 107, 53, 0.4);
            text-align: center;
            animation: pulse 0.7s ease-out;
            cursor: help;
            background: rgba(0, 0, 0, 0.7);
            padding: 8px 16px;
            border-radius: 8px;
            border: 2px solid rgba(255, 107, 53, 0.6);
        }
        
        .cheese-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            margin-top: 5px;
        }
        
        /* Error styles */
        .cool-cheese-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .cool-cheese-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .cool-cheese-error-icon {
            font-size: 20px;
        }
        
        .cool-cheese-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes coolCheeseErrorBounce {
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
        
        @keyframes coolCheeseErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Individual Spell Name Display Above Heroes */
        .individual-spell-float {
            position: fixed;
            transform: translate(-50%, -100%);
            z-index: 10001;
            pointer-events: none;
            animation: spellNameFloat 2.5s ease-out forwards;
        }
        
        .spell-name-display {
            font-size: 18px;
            font-weight: bold;
            color: #4CAF50;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.9),
                0 0 15px rgba(76, 175, 80, 0.8),
                0 0 30px rgba(76, 175, 80, 0.4);
            text-align: center;
            background: rgba(0, 0, 0, 0.8);
            padding: 6px 12px;
            border-radius: 6px;
            border: 2px solid rgba(76, 175, 80, 0.6);
            white-space: nowrap;
            animation: spellNamePulse 0.5s ease-out;
        }
        
        @keyframes spellNameFloat {
            0% {
                transform: translate(-50%, -100%);
                opacity: 0;
            }
            20% {
                transform: translate(-50%, -130%);
                opacity: 1;
            }
            80% {
                transform: translate(-50%, -160%);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -180%);
                opacity: 0;
            }
        }
        
        @keyframes spellNamePulse {
            0% {
                transform: scale(0.5);
                opacity: 0;
            }
            50% {
                transform: scale(1.1);
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }
        @keyframes floatUp {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-70px);
            }
        }
        
        @keyframes spin {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(540deg);
            }
        }
        
        @keyframes scatter {
            from {
                transform: translateX(0) translateY(0);
                opacity: 1;
            }
            50% {
                opacity: 1;
            }
            to {
                transform: translateX(var(--scatter-x)) translateY(-50px);
                opacity: 0.3;
            }
        }
        
        @keyframes pulse {
            0% {
                transform: scale(0.3);
                opacity: 0;
            }
            50% {
                transform: scale(1.4);
            }
            100% {
                transform: scale(1);
                opacity: 1;
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
        
        /* Add hover effect for spell details */
        .spell-text:hover {
            transform: scale(1.05);
            transition: transform 0.2s ease;
        }
    `;
    document.head.appendChild(style);
}