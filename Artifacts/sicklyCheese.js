// sicklyCheese.js - SicklyCheese Artifact Handler Module

import { getCardsBySpellSchool } from '../cardDatabase.js';

export const sicklyCheeseArtifact = {
    // Card name this artifact handles
    cardName: 'SicklyCheese',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {        
        // Consume the card and distribute DecayMagic spells
        await this.consumeAndDistributeSpells(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {        
        // Consume the card and distribute DecayMagic spells
        await this.consumeAndDistributeSpells(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and distribute DecayMagic spells to all heroes
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
        const cost = cardInfo?.cost || 10; // SicklyCheese has same cost as other cheeses
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showSicklyCheeseError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold (use negative amount to subtract)
        goldManager.addPlayerGold(-cost, 'SicklyCheese');
                
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Get all DecayMagic spells from the database
        const allDecayMagicSpells = getCardsBySpellSchool('DecayMagic');
        
        if (!allDecayMagicSpells || allDecayMagicSpells.length === 0) {
            console.error('No DecayMagic spells found in database');
            return;
        }
        
        // Filter out Area and global spells (these can't be taught to heroes)
        const teachableSpells = allDecayMagicSpells.filter(spell => {
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
            console.error('No teachable DecayMagic spells found after filtering');
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
        
        // Show visual feedback with toxic gas clouds around infected heroes
        this.showSicklyCheeseAnimation(cardIndex, spellsAdded, addedSpells, cost);
        
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
    showSicklyCheeseError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'sickly-cheese-error';
        errorDiv.innerHTML = `
            <div class="sickly-cheese-error-content">
                <span class="sickly-cheese-error-icon">⛔</span>
                <span class="sickly-cheese-error-text">${message}</span>
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
            animation: sicklyCheeseErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'sicklyCheeseErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show sickly cheese animation with toxic gas particles
    showSicklyCheeseAnimation(cardIndex, spellsAdded, addedSpells, cost) {
        // Create floating cheese animation (central)
        const cheeseBurst = document.createElement('div');
        cheeseBurst.className = 'sickly-cheese-spell-burst';
        
        // Create spell details for tooltip
        const spellDetails = addedSpells.map(spell => 
            `${spell.heroName}: ${this.formatSpellName(spell.spellName)} (Lv${spell.spellLevel})`
        ).join('\n');
        
        cheeseBurst.innerHTML = `
            <div class="sickly-cheese-icons">
                <span class="sickly-cheese-icon">🧀</span>
                <span class="sickly-cheese-icon">☠️</span>
                <span class="sickly-cheese-icon">🧀</span>
            </div>
            <div class="sickly-spell-text" title="${spellDetails}">
                +${spellsAdded} DecayMagic Spell${spellsAdded !== 1 ? 's' : ''}!
                <div class="sickly-cheese-cost">Cost: ${cost} Gold</div>
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
        
        // Show individual spell names above each hero with toxic gas particles
        this.showIndividualSpellNamesWithParticles(addedSpells);
        
        // Remove after animation
        setTimeout(() => {
            cheeseBurst.remove();
        }, 3000);
        
        // Play sound effect if available
        this.playSicklyCheeseSound();
    },
    
    // Show individual spell names above each hero with toxic gas particle effects
    showIndividualSpellNamesWithParticles(addedSpells) {
        addedSpells.forEach((spellInfo, index) => {
            // Add delay for staggered effect
            setTimeout(() => {
                this.showSpellNotificationAboveHero(spellInfo.heroPosition, spellInfo);
                // Create toxic gas particles around the hero
                this.createToxicGasParticles(spellInfo.heroPosition);
            }, index * 400);
        });
    },

    showSpellNotificationAboveHero(heroPosition, spellInfo) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        const notification = document.createElement('div');
        notification.className = 'sickly-cheese-spell-notification';
        notification.innerHTML = `
            <div class="sickly-spell-notification-content">
                <span class="sickly-spell-icon">☠️</span>
                <span>${spellInfo.heroName} learned:</span>
                <div class="sickly-spell-name">${this.formatSpellName(spellInfo.spellName)}</div>
                <div class="sickly-spell-level">Level ${spellInfo.spellLevel}</div>
            </div>
        `;
        
        // Use the same positioning approach as HolyCheese
        notification.style.cssText = `
            position: absolute;
            top: -100px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(34, 139, 34, 0.95), rgba(128, 0, 128, 0.95));
            backdrop-filter: blur(10px);
            border: 2px solid rgba(34, 139, 34, 0.8);
            border-radius: 12px;
            padding: 12px 20px;
            box-shadow: 0 8px 32px rgba(34, 139, 34, 0.4);
            z-index: 1000;
            animation: sicklyNotificationSlide 2.5s ease-out;
            pointer-events: none;
            color: #E0FFE0;
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
    
    // Create toxic gas cloud particles around a hero to indicate decay energy
    createToxicGasParticles(heroPosition) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'sickly-gas-particles';
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
        
        // Create multiple gas cloud particles
        const particleCount = 15;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'sickly-gas-particle';
            
            // Random starting position around the hero
            const angle = (i / particleCount) * 2 * Math.PI;
            const radius = 25 + Math.random() * 25;
            const startX = 50 + Math.cos(angle) * radius;
            const startY = 50 + Math.sin(angle) * radius;
            
            // Random float target (gas disperses outward and slightly upward)
            const floatX = startX + (Math.random() - 0.5) * 50;
            const floatY = startY - 20 - Math.random() * 30;
            
            // Alternate between green and purple
            const isGreen = i % 2 === 0;
            const color1 = isGreen ? '34, 139, 34' : '128, 0, 128';
            const color2 = isGreen ? '0, 100, 0' : '75, 0, 130';
            
            particle.style.cssText = `
                position: absolute;
                left: ${startX}%;
                top: ${startY}%;
                width: 20px;
                height: 20px;
                background: radial-gradient(circle, rgba(${color1}, 0.8) 0%, rgba(${color2}, 0.5) 50%, transparent 100%);
                border-radius: 50%;
                filter: blur(3px);
                box-shadow: 0 0 15px rgba(${color1}, 0.7), 0 0 30px rgba(${color2}, 0.4);
                animation: sicklyGasFloat 2.5s ease-out forwards;
                animation-delay: ${i * 0.08}s;
                --float-x: ${floatX}%;
                --float-y: ${floatY}%;
                z-index: 999;
            `;
            
            particleContainer.appendChild(particle);
        }
        
        // Add toxic glow effect to the hero slot
        const glowEffect = document.createElement('div');
        glowEffect.className = 'sickly-glow-effect';
        glowEffect.style.cssText = `
            position: absolute;
            top: -10%;
            left: -10%;
            width: 120%;
            height: 120%;
            background: radial-gradient(circle, rgba(34, 139, 34, 0.3) 0%, rgba(128, 0, 128, 0.2) 40%, transparent 70%);
            animation: sicklyGlowPulse 2.5s ease-out;
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
        }, 3000);
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
            console.error(`No DecayMagic spells found for ${tierDescription}`);
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
    
    // Play sickly cheese sound
    playSicklyCheeseSound() {
        // Placeholder for sound effect
    }
};

// Add styles for the animation
if (typeof document !== 'undefined' && !document.getElementById('sicklyCheeseStyles')) {
    const style = document.createElement('style');
    style.id = 'sicklyCheeseStyles';
    style.textContent = `
        /* Sickly Cheese Spell Burst Animation */
        .sickly-cheese-spell-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 3s ease-out forwards;
        }
        
        .sickly-cheese-icons {
            display: flex;
            gap: 15px;
            margin-bottom: 12px;
            animation: floatUp 2.2s ease-out;
            justify-content: center;
        }
        
        .sickly-cheese-icon {
            font-size: 40px;
            animation: spin 1.8s ease-out, sicklyScatter 2.2s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 12px rgba(34, 139, 34, 0.8));
        }
        
        .sickly-cheese-icon:nth-child(1) {
            animation-delay: 0s, 0.1s;
            --scatter-x: -45px;
        }
        
        .sickly-cheese-icon:nth-child(2) {
            animation-delay: 0.1s, 0.2s;
            --scatter-x: 0px;
            font-size: 44px; /* Make the skull slightly larger */
        }
        
        .sickly-cheese-icon:nth-child(3) {
            animation-delay: 0.2s, 0.3s;
            --scatter-x: 45px;
        }
        
        .sickly-spell-text {
            font-size: 22px;
            font-weight: bold;
            color: #32CD32;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(34, 139, 34, 0.8),
                0 0 40px rgba(128, 0, 128, 0.4);
            text-align: center;
            animation: pulse 0.7s ease-out;
            cursor: help;
            background: rgba(0, 0, 0, 0.7);
            padding: 8px 16px;
            border-radius: 8px;
            border: 2px solid rgba(34, 139, 34, 0.6);
        }
        
        .sickly-cheese-cost {
            font-size: 16px;
            font-weight: bold;
            color: #32CD32;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(34, 139, 34, 0.7);
            margin-top: 5px;
        }
        
        /* Error styles */
        .sickly-cheese-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .sickly-cheese-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .sickly-cheese-error-icon {
            font-size: 20px;
        }
        
        .sickly-cheese-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes sicklyCheeseErrorBounce {
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
        
        @keyframes sicklyCheeseErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes sicklyScatter {
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
        
        @keyframes sicklyNotificationSlide {
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
        
        /* Toxic gas particle animations */
        @keyframes sicklyGasFloat {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3);
            }
            20% {
                opacity: 0.8;
                transform: translate(-50%, -50%) scale(1.5);
            }
            100% {
                opacity: 0;
                left: var(--float-x);
                top: var(--float-y);
                transform: translate(-50%, -50%) scale(2);
            }
        }
        
        @keyframes sicklyGlowPulse {
            0% {
                opacity: 0;
                transform: scale(0.8);
            }
            30% {
                opacity: 1;
            }
            50% {
                opacity: 0.8;
                transform: scale(1.2);
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
        .sickly-spell-text:hover {
            transform: scale(1.05);
            transition: transform 0.2s ease;
        }
    `;
    document.head.appendChild(style);
}