// Spells/butterflyCloud.js - Butterfly Cloud Global Spell Implementation
// Adds 3 random spells from DestructionMagic, DecayMagic, or SupportMagic schools to a Hero's spellbook

export const butterflyCloudSpell = {
    name: 'ButterflyCloud',
    
    // Check if the spell can be activated on a specific hero
    canActivateOnHero(heroSelection, heroPosition) {
        const result = { canActivate: false, reason: '', heroName: '' };
        
        // Get ButterflyCloud card info from database
        const butterflyCloudInfo = heroSelection.getCardInfo('ButterflyCloud');
        if (!butterflyCloudInfo) {
            result.reason = 'Butterfly Cloud spell info not found in database!';
            return result;
        }
        
        const requiredSpellSchool = butterflyCloudInfo.spellSchool;
        const requiredLevel = butterflyCloudInfo.level;
        
        // Check if ANY hero has the required spell school at required level
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => 
            formation[pos] !== null && formation[pos] !== undefined
        );
        
        let canCast = false;
        let castingHeroName = '';
        
        for (const position of heroPositions) {
            const hero = formation[position];
            if (!hero) continue;
            
            // Get hero's abilities
            const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
            if (!heroAbilities) continue;
            
            // Count spell school abilities across all zones
            let spellSchoolLevel = 0;
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                    heroAbilities[zone].forEach(ability => {
                        if (ability && ability.name === requiredSpellSchool) {
                            spellSchoolLevel++;
                        }
                    });
                }
            });
            
            if (spellSchoolLevel >= requiredLevel) {
                canCast = true;
                castingHeroName = hero.name;
                break;
            }
        }
        
        if (!canCast) {
            const formattedSpellSchool = heroSelection.formatCardName ? 
                heroSelection.formatCardName(requiredSpellSchool) : requiredSpellSchool;
            result.reason = `No Hero has ${formattedSpellSchool} at level ${requiredLevel} or higher to cast Butterfly Cloud!`;
            return result;
        }
        
        // Check if there's a hero in the target position
        const targetHero = formation[heroPosition];
        
        if (!targetHero) {
            result.reason = 'Cannot cast Butterfly Cloud on an empty slot!';
            return result;
        }
        
        // REMOVED: Check if hero's spellbook is already locked
        // This allows multiple Butterfly Clouds to be used on the same hero
        
        // Check if there are available spells to add
        const availableSpells = this.getAvailableSpellsForButterfly(heroSelection);
        if (availableSpells.length < 3) {
            result.reason = 'Not enough eligible spells available for Butterfly Cloud!';
            return result;
        }
        
        result.canActivate = true;
        result.heroName = targetHero.name;
        return result;
    },
    
    // Get list of spells that can be added by Butterfly Cloud
    getAvailableSpellsForButterfly(heroSelection) {
        const validSchools = ['DestructionMagic', 'DecayMagic', 'SupportMagic'];
        const excludedSubtypes = ['Creature', 'Permanent', 'Area'];
        
        // Import and use the getAllCardNames function from cardDatabase
        let allCardNames = [];
        
        // Try to get card names from the cardDatabase module
        if (typeof window !== 'undefined' && window.heroSelection) {
            // Access the card database through heroSelection's characterCards or try direct import
            try {
                // First, try to get all card names by checking all character cards
                const characterCards = window.heroSelection.characterCards;
                if (characterCards) {
                    const cardSet = new Set();
                    Object.values(characterCards).forEach(cards => {
                        cards.forEach(card => cardSet.add(card));
                    });
                    allCardNames = Array.from(cardSet);
                }
                
                // Also try to access the global cardDatabase if available
                if (window.cardDatabase) {
                    allCardNames = allCardNames.concat(Object.keys(window.cardDatabase));
                } else {
                    // Fallback: try to enumerate by testing known card patterns
                    const knownCards = [
                        'Icebolt', 'IcyGrave', 'VenomInfusion', 'ToxicFumes', 'ToxicTrap', 'PoisonPollen', 'PoisonedWell', 'Curse',
                        'PhoenixBombardment', 'BurningFinger', 'Fireball', 'FlameAvalanche', 'MountainTearRiver', 'VampireOnFire', 'HandOfDeath',
                        'HealingMelody', 'Stoneskin', 'Haste', 'GloriousRebirth', 'CrystalWell', 'SpatialCrevice', 'DoomClock'
                    ];
                    
                    knownCards.forEach(cardName => {
                        const cardInfo = heroSelection.getCardInfo(cardName);
                        if (cardInfo && cardInfo.cardType === 'Spell') {
                            allCardNames.push(cardName);
                        }
                    });
                }
            } catch (error) {
                console.warn('Error accessing card database:', error);
            }
        }
        
        // Remove duplicates
        allCardNames = [...new Set(allCardNames)];
        
        const eligibleSpells = [];
        
        allCardNames.forEach(cardName => {
            const cardInfo = heroSelection.getCardInfo(cardName);
            
            // Check if it's a spell card
            if (!cardInfo || cardInfo.cardType !== 'Spell') {
                return;
            }
            
            // Check if it has one of the valid spell schools
            if (!validSchools.includes(cardInfo.spellSchool)) {
                return;
            }
            
            // Exclude global spells
            if (cardInfo.global === true) {
                return;
            }
            
            // Exclude spells with forbidden subtypes
            if (cardInfo.subtype && excludedSubtypes.includes(cardInfo.subtype)) {
                return;
            }
            
            // Add to eligible list
            eligibleSpells.push({
                name: cardName,
                info: cardInfo,
                spellSchool: cardInfo.spellSchool,
                level: cardInfo.level || 0
            });
        });
        
        console.log('ButterflyCloud: Found', eligibleSpells.length, 'eligible spells:', eligibleSpells.map(s => s.name));
        return eligibleSpells;
    },
    
    // Select 3 random different spells
    selectRandomSpells(availableSpells) {
        const shuffled = [...availableSpells].sort(() => Math.random() - 0.5);
        const selectedSpells = [];
        
        // Ensure we get 3 different spells
        for (let i = 0; i < shuffled.length && selectedSpells.length < 3; i++) {
            const spell = shuffled[i];
            
            // Check if we already have this spell
            const alreadySelected = selectedSpells.some(selected => selected.name === spell.name);
            if (!alreadySelected) {
                selectedSpells.push(spell);
            }
        }
        
        return selectedSpells;
    },
    
    // Activate the spell on a specific hero position
    async activate(heroSelection, cardIndex, heroPosition) {
        // Check if can activate on this hero
        const canActivateResult = this.canActivateOnHero(heroSelection, heroPosition);
        if (!canActivateResult.canActivate) {
            return {
                success: false,
                message: canActivateResult.reason,
                consumed: false
            };
        }
        
        try {
            // Get available spells and select 3 random ones
            const availableSpells = this.getAvailableSpellsForButterfly(heroSelection);
            const selectedSpells = this.selectRandomSpells(availableSpells);
            
            if (selectedSpells.length < 3) {
                return {
                    success: false,
                    message: 'Could not find 3 different eligible spells!',
                    consumed: false
                };
            }
            
            // Add spells to hero's spellbook
            let addedSpells = [];
            let failedSpells = [];
            
            for (const spell of selectedSpells) {
                const success = heroSelection.heroSpellbookManager.addSpellToHero(heroPosition, spell.name);
                if (success) {
                    addedSpells.push(spell);
                } else {
                    failedSpells.push(spell);
                }
            }
            
            if (addedSpells.length === 0) {
                return {
                    success: false,
                    message: 'Failed to add any spells to spellbook!',
                    consumed: false
                };
            }
            
            // UPDATED: Lock the spellbook and reactivate all disabled spells
            const lockResult = heroSelection.heroSpellbookManager.lockHeroSpellbook(heroPosition);
            if (!lockResult) {
                return {
                    success: false,
                    message: 'Failed to lock spellbook!',
                    consumed: false
                };
            }
            
            // Show visual feedback with the added spells
            this.showButterflyCloudEffect(heroPosition, addedSpells, canActivateResult.heroName);
            
            // Remove the spell from hand
            const removedCard = heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            if (!removedCard) {
                return {
                    success: false,
                    message: 'Failed to remove card from hand',
                    consumed: false
                };
            }
            
            // Consume action if required
            const cardInfo = heroSelection.getCardInfo('ButterflyCloud');
            if (cardInfo && cardInfo.action && heroSelection.actionManager) {
                heroSelection.actionManager.consumeAction();
            }
            
            // Update displays
            heroSelection.updateHandDisplay();
            heroSelection.updateBattleFormationUI();
            
            if (heroSelection.updateActionDisplay) {
                heroSelection.updateActionDisplay();
            }
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Send formation update to opponent
            await heroSelection.sendFormationUpdate();
            
            const spellNames = addedSpells.map(spell => heroSelection.formatCardName(spell.name)).join(', ');
            const message = `Butterfly Cloud enchanted ${canActivateResult.heroName}! Added: ${spellNames}. Spellbook permanently locked!`;
            
            return {
                success: true,
                message: message,
                consumed: true,
                addedSpells: addedSpells
            };
            
        } catch (error) {
            console.error('Error activating Butterfly Cloud:', error);
            return {
                success: false,
                message: 'Failed to activate Butterfly Cloud',
                consumed: false
            };
        }
    },
    
    // Show the butterfly cloud visual effect
    showButterflyCloudEffect(heroPosition, addedSpells, heroName) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        // Create the effect container
        const effectContainer = document.createElement('div');
        effectContainer.className = 'butterfly-cloud-effect';
        
        // Create floating butterflies
        const butterflyCount = 6;
        let butterfliesHTML = '';
        
        for (let i = 0; i < butterflyCount; i++) {
            const delay = (i * 0.2).toFixed(1);
            const duration = (2 + Math.random()).toFixed(1);
            const startAngle = Math.random() * 360;
            
            butterfliesHTML += `
                <div class="floating-butterfly" style="
                    animation-delay: ${delay}s;
                    animation-duration: ${duration}s;
                    transform: rotate(${startAngle}deg);
                ">🦋</div>
            `;
        }
        
        effectContainer.innerHTML = `
            <div class="butterfly-swirl">
                ${butterfliesHTML}
            </div>
        `;
        
        // Position and add the effect
        teamSlot.style.position = 'relative';
        teamSlot.appendChild(effectContainer);
        
        // Show the spell notification popup
        setTimeout(() => {
            this.showSpellNotification(heroPosition, addedSpells, heroName);
        }, 1000);
        
        // Remove effect after animation completes
        setTimeout(() => {
            if (effectContainer.parentNode) {
                effectContainer.remove();
            }
        }, 4000);
    },
    
    // Show notification popup with the added spells
    showSpellNotification(heroPosition, addedSpells, heroName) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        const spellList = addedSpells.map(spell => {
            const formattedName = window.heroSelection?.formatCardName ? 
                window.heroSelection.formatCardName(spell.name) : spell.name;
            const schoolIcon = this.getSpellSchoolIcon(spell.spellSchool);
            return `<div class="spell-notification-item">${schoolIcon} ${formattedName}</div>`;
        }).join('');
        
        const notification = document.createElement('div');
        notification.className = 'butterfly-spell-notification';
        notification.innerHTML = `
            <div class="spell-notification-header">
                <span class="butterfly-icon">🦋</span>
                <span class="notification-title">${heroName} learned new spells!</span>
            </div>
            <div class="spell-notification-list">
                ${spellList}
            </div>
            <div class="spell-notification-footer">
                <span class="lock-icon">🔒</span>
                <span class="lock-text">Spellbook permanently locked</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: absolute;
            top: -120px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(255, 182, 193, 0.95), rgba(221, 160, 221, 0.95));
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 105, 180, 0.8);
            border-radius: 12px;
            padding: 16px;
            min-width: 280px;
            box-shadow: 0 8px 32px rgba(255, 105, 180, 0.4);
            z-index: 1000;
            animation: butterflyNotificationSlide 4s ease-out;
            pointer-events: none;
            color: #4a0e4e;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif;
        `;
        
        teamSlot.appendChild(notification);
        
        // Remove notification after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    },
    
    // Get icon for spell school
    getSpellSchoolIcon(spellSchool) {
        const icons = {
            'DestructionMagic': '🔥',
            'DecayMagic': '☠️',
            'SupportMagic': '✨'
        };
        return icons[spellSchool] || '📜';
    },
    
    // Handle drop activation (called by GlobalSpellManager)
    async handleDrop(heroPosition, cardIndex, cardName, heroSelection, globalSpellManager) {
        const result = await this.activate(heroSelection, cardIndex, heroPosition);
        
        // Show visual feedback
        if (result.success) {
            showButterflyCloudSuccess(result.message);
        } else {
            showButterflyCloudError(result.message);
        }
        
        return result.success;
    },
    
    // Handle click activation (for consistency with other global spells)
    async handleClick(cardIndex, cardName, heroSelection, globalSpellManager) {
        // Show hint that this spell must be dropped on a hero
        showButterflyCloudHint('Drag Butterfly Cloud onto a Hero to enchant their spellbook!');
        return false;
    }
};

// ===== VISUAL FEEDBACK FUNCTIONS =====

function showButterflyCloudSuccess(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'butterfly-cloud-success-popup';
    feedbackDiv.innerHTML = `
        <div class="butterfly-cloud-success-content">
            <span class="butterfly-cloud-success-icon">🦋</span>
            <span class="butterfly-cloud-success-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(255, 182, 193, 0.95), rgba(221, 160, 221, 0.95));
        color: #4a0e4e;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: butterflyCloudSuccessBounce 0.6s ease-out;
        box-shadow: 0 8px 32px rgba(255, 105, 180, 0.4);
        border: 2px solid rgba(255, 105, 180, 0.8);
        max-width: 500px;
        text-align: center;
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(feedbackDiv);
    
    setTimeout(() => {
        feedbackDiv.style.animation = 'butterflyCloudSuccessFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3500);
}

function showButterflyCloudError(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'butterfly-cloud-error-popup';
    feedbackDiv.innerHTML = `
        <div class="butterfly-cloud-error-content">
            <span class="butterfly-cloud-error-icon">⚠️</span>
            <span class="butterfly-cloud-error-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: rgba(244, 67, 54, 0.95);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: butterflyCloudErrorBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(244, 67, 54, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(feedbackDiv);
    
    setTimeout(() => {
        feedbackDiv.style.animation = 'butterflyCloudErrorFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3000);
}

function showButterflyCloudHint(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'butterfly-cloud-hint-popup';
    feedbackDiv.innerHTML = `
        <div class="butterfly-cloud-hint-content">
            <span class="butterfly-cloud-hint-icon">🦋</span>
            <span class="butterfly-cloud-hint-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.95), rgba(255, 152, 0, 0.95));
        color: #3e2723;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: butterflyCloudHintBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(255, 193, 7, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(feedbackDiv);
    
    setTimeout(() => {
        feedbackDiv.style.animation = 'butterflyCloudHintFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 2500);
}

// ===== CSS STYLES =====

// Add CSS animations and styles
if (typeof document !== 'undefined' && !document.getElementById('butterflyCloudSpellStyles')) {
    const style = document.createElement('style');
    style.id = 'butterflyCloudSpellStyles';
    style.textContent = `
        /* Butterfly Cloud Effect */
        .butterfly-cloud-effect {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 5;
            overflow: visible;
        }
        
        .butterfly-swirl {
            position: relative;
            width: 100%;
            height: 100%;
        }
        
        .floating-butterfly {
            position: absolute;
            top: 50%;
            left: 50%;
            font-size: 20px;
            animation: butterflyFloat 3s ease-in-out infinite;
            transform-origin: center;
        }
        
        /* Spell Notification Styles */
        .butterfly-spell-notification {
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            text-align: center;
        }
        
        .spell-notification-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 12px;
            font-weight: bold;
            font-size: 14px;
        }
        
        .butterfly-icon {
            font-size: 18px;
        }
        
        .notification-title {
            color: #4a0e4e;
        }
        
        .spell-notification-list {
            margin: 12px 0;
        }
        
        .spell-notification-item {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin: 6px 0;
            padding: 6px 12px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
            border: 1px solid rgba(255, 105, 180, 0.4);
        }
        
        .spell-notification-footer {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-top: 12px;
            font-size: 11px;
            font-weight: 600;
            color: #8e24aa;
        }
        
        .lock-icon {
            font-size: 12px;
        }
        
        /* Animations */
        @keyframes butterflyFloat {
            0% {
                transform: translate(-50%, -50%) rotate(0deg) translateX(0px) rotate(0deg);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            25% {
                transform: translate(-50%, -50%) rotate(90deg) translateX(40px) rotate(-90deg);
            }
            50% {
                transform: translate(-50%, -50%) rotate(180deg) translateX(60px) rotate(-180deg);
            }
            75% {
                transform: translate(-50%, -50%) rotate(270deg) translateX(40px) rotate(-270deg);
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) rotate(360deg) translateX(0px) rotate(-360deg);
                opacity: 0;
            }
        }
        
        @keyframes butterflyNotificationSlide {
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
        
        /* Success popup animations */
        @keyframes butterflyCloudSuccessBounce {
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
        
        @keyframes butterflyCloudSuccessFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Error popup animations */
        @keyframes butterflyCloudErrorBounce {
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
        
        @keyframes butterflyCloudErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Hint popup animations */
        @keyframes butterflyCloudHintBounce {
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
        
        @keyframes butterflyCloudHintFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Popup content styling */
        .butterfly-cloud-success-content,
        .butterfly-cloud-error-content,
        .butterfly-cloud-hint-content {
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: center;
        }
        
        .butterfly-cloud-success-icon,
        .butterfly-cloud-error-icon,
        .butterfly-cloud-hint-icon {
            font-size: 20px;
        }
        
        .butterfly-cloud-success-text,
        .butterfly-cloud-error-text,
        .butterfly-cloud-hint-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.butterflyCloudSpell = butterflyCloudSpell;
}