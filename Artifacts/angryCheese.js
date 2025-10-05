// angryCheese.js - AngryCheese Artifact Handler Module

import { getCardsBySpellSchool } from '../cardDatabase.js';

export const angryCheeseArtifact = {
    // Card name this artifact handles
    cardName: 'AngryCheese',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {        
        // Consume the card and distribute DestructionMagic spells
        await this.consumeAndDistributeSpells(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {        
        // Consume the card and distribute DestructionMagic spells
        await this.consumeAndDistributeSpells(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and distribute DestructionMagic spells to all heroes
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
        const cost = cardInfo?.cost || 10; // AngryCheese has same cost as other cheeses
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showAngryCheeseError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'AngryCheese');
                
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Get all DestructionMagic spells from the database
        const allDestructionMagicSpells = getCardsBySpellSchool('DestructionMagic');
        
        if (!allDestructionMagicSpells || allDestructionMagicSpells.length === 0) {
            console.error('No DestructionMagic spells found in database');
            return;
        }
        
        // Filter out Area and global spells (these can't be taught to heroes)
        const teachableSpells = allDestructionMagicSpells.filter(spell => {
            // Exclude Area subtype spells
            if (spell.subtype === 'Area') {
                return false;
            }
            // Exclude global spells
            if (spell.global === true) {
                return false;
            }
            return true;
        });
        
        if (!teachableSpells || teachableSpells.length === 0) {
            console.error('No teachable DestructionMagic spells found after filtering');
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
                continue;
            }
            
            // Select a spell with weighted distribution based on level
            const selectedSpell = this.selectWeightedSpell(teachableSpells);
            
            if (!selectedSpell) {
                console.error(`Failed to select a spell for ${hero.name}`);
                continue;
            }
            
            // Add the spell to the hero's spellbook
            const success = heroSpellbookManager.addSpellToHero(position, selectedSpell.name);
            
            if (success) {
                spellsAdded++;
                addedSpells.push({
                    heroName: hero.name,
                    heroPosition: position,
                    spellName: selectedSpell.name,
                    spellLevel: selectedSpell.level || 0
                });
            } else {
                console.error(`Failed to add ${selectedSpell.name} to ${hero.name}'s spellbook`);
            }
        }
        
        // Show visual feedback with flame particles around empowered heroes
        this.showAngryCheeseAnimation(cardIndex, spellsAdded, addedSpells, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay(); // Update gold display after spending
        heroSelection.updateBattleFormationUI(); // This will show the new spells in hero tooltips
        
        // Save game state
        await heroSelection.saveGameState();
        
        // Send formation update to opponent (includes spellbook data)
        await heroSelection.sendFormationUpdate();
    },
    
    // Show error message when not enough gold
    showAngryCheeseError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'angry-cheese-error';
        errorDiv.innerHTML = `
            <div class="angry-cheese-error-content">
                <span class="angry-cheese-error-icon">⛔</span>
                <span class="angry-cheese-error-text">${message}</span>
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
            animation: angryCheeseErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'angryCheeseErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show angry cheese animation with flame particles
    showAngryCheeseAnimation(cardIndex, spellsAdded, addedSpells, cost) {
        // Create floating cheese animation (central)
        const cheeseBurst = document.createElement('div');
        cheeseBurst.className = 'angry-cheese-spell-burst';
        
        // Create spell details for tooltip
        const spellDetails = addedSpells.map(spell => 
            `${spell.heroName}: ${this.formatSpellName(spell.spellName)} (Lv${spell.spellLevel})`
        ).join('\n');
        
        cheeseBurst.innerHTML = `
            <div class="angry-cheese-icons">
                <span class="angry-cheese-icon">🧀</span>
                <span class="angry-cheese-icon">🔥</span>
                <span class="angry-cheese-icon">🧀</span>
            </div>
            <div class="angry-spell-text" title="${spellDetails}">
                +${spellsAdded} DestructionMagic Spell${spellsAdded !== 1 ? 's' : ''}!
                <div class="angry-cheese-cost">Cost: ${cost} Gold</div>
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
        
        // Show individual spell names above each hero with flame particles
        this.showIndividualSpellNamesWithParticles(addedSpells);
        
        // Remove after animation
        setTimeout(() => {
            cheeseBurst.remove();
        }, 3000);
        
        // Play sound effect if available
        this.playAngryCheeseSound();
    },
    
    // Show individual spell names above each hero with flame particle effects
    showIndividualSpellNamesWithParticles(addedSpells) {
        addedSpells.forEach((spellInfo, index) => {
            // Add delay for staggered effect
            setTimeout(() => {
                this.showSpellNotificationAboveHero(spellInfo.heroPosition, spellInfo);
                // Create flame particles around the hero
                this.createFlameParticles(spellInfo.heroPosition);
            }, index * 400);
        });
    },

    showSpellNotificationAboveHero(heroPosition, spellInfo) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        const notification = document.createElement('div');
        notification.className = 'angry-cheese-spell-notification';
        notification.innerHTML = `
            <div class="angry-spell-notification-content">
                <span class="angry-spell-icon">🔥</span>
                <span>${spellInfo.heroName} learned:</span>
                <div class="angry-spell-name">${this.formatSpellName(spellInfo.spellName)}</div>
                <div class="angry-spell-level">Level ${spellInfo.spellLevel}</div>
            </div>
        `;
        
        // Use the same positioning approach as HolyCheese
        notification.style.cssText = `
            position: absolute;
            top: -100px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(255, 69, 0, 0.95), rgba(220, 20, 60, 0.95));
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 69, 0, 0.8);
            border-radius: 12px;
            padding: 12px 20px;
            box-shadow: 0 8px 32px rgba(255, 69, 0, 0.4);
            z-index: 1000;
            animation: angryNotificationSlide 2.5s ease-out;
            pointer-events: none;
            color: #FFFFFF;
            font-weight: bold;
            text-align: center;
            white-space: nowrap;
        `;
        
        // Set team slot to relative positioning if needed
        teamSlot.style.position = 'relative';
        
        // Append to team slot, not document.body
        teamSlot.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 2500);
    },
    
    // Create flame particles around a hero to indicate angry energy
    createFlameParticles(heroPosition) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'angry-flame-particles';
        particleContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: visible;
            z-index: 999;
        `;
        
        // Create multiple flame particles
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'angry-flame-particle';
            
            // Random starting position around the hero
            const angle = (i / particleCount) * 2 * Math.PI;
            const radius = 30 + Math.random() * 20;
            const startX = 50 + Math.cos(angle) * radius;
            const startY = 50 + Math.sin(angle) * radius;
            
            // Random float target (flames rise upward)
            const floatX = startX + (Math.random() - 0.5) * 30;
            const floatY = startY - 40 - Math.random() * 50;
            
            particle.style.cssText = `
                position: absolute;
                left: ${startX}%;
                top: ${startY}%;
                width: 10px;
                height: 10px;
                background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 69, 0, 0.9) 40%, rgba(220, 20, 60, 0.7) 70%, transparent 100%);
                border-radius: 50%;
                box-shadow: 0 0 12px rgba(255, 69, 0, 0.9), 0 0 24px rgba(220, 20, 60, 0.5);
                animation: angryParticleFloat 2s ease-out forwards;
                animation-delay: ${i * 0.1}s;
                --float-x: ${floatX}%;
                --float-y: ${floatY}%;
                z-index: 999;
            `;
            
            particleContainer.appendChild(particle);
        }
        
        // Add fiery glow effect to the hero slot
        const glowEffect = document.createElement('div');
        glowEffect.className = 'angry-glow-effect';
        glowEffect.style.cssText = `
            position: absolute;
            top: -10%;
            left: -10%;
            width: 120%;
            height: 120%;
            background: radial-gradient(circle, rgba(255, 69, 0, 0.4) 0%, transparent 60%);
            animation: angryGlowPulse 2s ease-out;
            pointer-events: none;
            z-index: 998;
        `;
        
        // Set team slot to relative positioning
        teamSlot.style.position = 'relative';
        
        // Add effects to team slot
        teamSlot.appendChild(glowEffect);
        teamSlot.appendChild(particleContainer);
        
        // Remove after animations complete
        setTimeout(() => {
            particleContainer.remove();
            glowEffect.remove();
        }, 2500);
    },
    
    // Select a spell with weighted distribution (lower level spells are more common)
    selectWeightedSpell(spellList) {
        // Roll for tier with weighted probability
        const roll = Math.random() * 100;
        let maxLevel;
        let tierDescription;
        
        if (roll < 50) {
            maxLevel = 1;
            tierDescription = 'level 1 or lower';
        } else if (roll < 80) {  // 50 + 30
            maxLevel = 2;
            tierDescription = 'level 2 or lower';
        } else if (roll < 95) {  // 50 + 30 + 15
            maxLevel = 3;
            tierDescription = 'level 3 or lower';
        } else {  // Remaining 5%
            maxLevel = 999;  // Effectively no limit
            tierDescription = 'any level';
        }
                
        // Filter spells based on max level
        const eligibleSpells = spellList.filter(spell => {
            const level = spell.level || 0;
            return level <= maxLevel;
        });
        
        if (eligibleSpells.length === 0) {
            console.error(`No DestructionMagic spells found for ${tierDescription}`);
            // Fall back to any spell if no eligible spells found
            if (spellList.length > 0) {
                const randomIndex = Math.floor(Math.random() * spellList.length);
                return spellList[randomIndex];
            }
            return null;
        }
        
        // Select a random spell from eligible spells
        const randomIndex = Math.floor(Math.random() * eligibleSpells.length);
        const selectedSpell = eligibleSpells[randomIndex];
        return selectedSpell;
    },
    
    // Format spell name for display (convert CamelCase to spaced words)
    formatSpellName(spellName) {
        return spellName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    // Play angry cheese sound
    playAngryCheeseSound() {
        // Placeholder for sound effect
    }
};

// Add styles for the animation
if (typeof document !== 'undefined' && !document.getElementById('angryCheeseStyles')) {
    const style = document.createElement('style');
    style.id = 'angryCheeseStyles';
    style.textContent = `
        /* Angry Cheese Spell Burst Animation */
        .angry-cheese-spell-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
        }
        
        .angry-cheese-icons {
            display: flex;
            gap: 15px;
            margin-bottom: 12px;
            animation: floatUp 2.2s ease-out;
            justify-content: center;
        }
        
        .angry-cheese-icon {
            font-size: 40px;
            animation: spin 1.8s ease-out, angryScatter 2.2s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 12px rgba(255, 69, 0, 0.8));
        }
        
        .angry-cheese-icon:nth-child(1) {
            animation-delay: 0s, 0.1s;
            --scatter-x: -45px;
        }
        
        .angry-cheese-icon:nth-child(2) {
            animation-delay: 0.1s, 0.2s;
            --scatter-x: 0px;
            font-size: 44px; /* Make the flame slightly larger */
        }
        
        .angry-cheese-icon:nth-child(3) {
            animation-delay: 0.2s, 0.3s;
            --scatter-x: 45px;
        }
        
        .angry-spell-text {
            font-size: 22px;
            font-weight: bold;
            color: #FF4500;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 69, 0, 0.8),
                0 0 40px rgba(220, 20, 60, 0.4);
            text-align: center;
            animation: pulse 0.7s ease-out;
            cursor: help;
            background: rgba(0, 0, 0, 0.7);
            padding: 8px 16px;
            border-radius: 8px;
            border: 2px solid rgba(255, 69, 0, 0.6);
        }
        
        .angry-cheese-cost {
            font-size: 16px;
            font-weight: bold;
            color: #FF4500;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 69, 0, 0.7);
            margin-top: 5px;
        }
        
        /* Error styles */
        .angry-cheese-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .angry-cheese-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .angry-cheese-error-icon {
            font-size: 20px;
        }
        
        .angry-cheese-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes angryCheeseErrorBounce {
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
        
        @keyframes angryCheeseErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes angryScatter {
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
        
        @keyframes angryNotificationSlide {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            15% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1.05);
            }
            20% {
                transform: translateX(-50%) translateY(0) scale(1);
            }
            80% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-15px) scale(0.9);
            }
        }
        
        /* Flame particle animations */
        @keyframes angryParticleFloat {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            100% {
                opacity: 0;
                left: var(--float-x);
                top: var(--float-y);
                transform: translate(-50%, -50%) scale(0.2);
            }
        }
        
        @keyframes angryGlowPulse {
            0% {
                opacity: 0;
                transform: scale(0.8);
            }
            50% {
                opacity: 1;
                transform: scale(1.15);
            }
            100% {
                opacity: 0;
                transform: scale(1);
            }
        }
        
        /* Reuse some animations from holyCheese */
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
        .angry-spell-text:hover {
            transform: scale(1.05);
            transition: transform 0.2s ease;
        }
    `;
    document.head.appendChild(style);
}