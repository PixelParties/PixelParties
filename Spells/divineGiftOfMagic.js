// Spells/divineGiftOfMagic.js - Divine Gift Of Magic Global Spell Implementation
// Gives each Hero a random high-level (3+) spell from DestructionMagic, DecayMagic, or SupportMagic schools

export const divineGiftOfMagicSpell = {
    name: 'DivineGiftOfMagic',
    
    // Check if the spell can be activated
    canActivate(heroSelection) {
        const result = { canActivate: false, reason: '' };
        
        // Get DivineGiftOfMagic card info
        const spellInfo = heroSelection.getCardInfo('DivineGiftOfMagic');
        if (!spellInfo) {
            result.reason = 'Divine Gift Of Magic spell info not found in database!';
            return result;
        }
        
        const requiredSpellSchool = spellInfo.spellSchool;
        const requiredLevel = spellInfo.level;
        
        // Check if ANY hero has the required spell school at required level
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => 
            formation[pos] !== null && formation[pos] !== undefined
        );
        
        if (heroPositions.length === 0) {
            result.reason = 'No Heroes available to receive divine gifts!';
            return result;
        }
        
        let canCast = false;
        
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
                break;
            }
        }
        
        if (!canCast) {
            const formattedSpellSchool = heroSelection.formatCardName ? 
                heroSelection.formatCardName(requiredSpellSchool) : requiredSpellSchool;
            result.reason = `No Hero has ${formattedSpellSchool} at level ${requiredLevel} or higher to cast Divine Gift Of Magic!`;
            return result;
        }
        
        // Check if there are available high-level spells
        const availableSpells = this.getAvailableHighLevelSpells(heroSelection);
        if (availableSpells.length < 1) {
            result.reason = 'No level 3+ spells available for Divine Gift Of Magic!';
            return result;
        }
        
        result.canActivate = true;
        return result;
    },
    
    // Get list of level 3+ spells that can be given by Divine Gift Of Magic
    getAvailableHighLevelSpells(heroSelection) {
        const validSchools = ['DestructionMagic', 'DecayMagic', 'SupportMagic'];
        const excludedSubtypes = ['Creature', 'Permanent', 'Area'];
        const minimumLevel = 3;
        
        // Use same logic as ButterflyCloud to get all card names
        let allCardNames = [];
        
        if (typeof window !== 'undefined' && window.heroSelection) {
            try {
                const characterCards = window.heroSelection.characterCards;
                if (characterCards) {
                    const cardSet = new Set();
                    Object.values(characterCards).forEach(cards => {
                        cards.forEach(card => cardSet.add(card));
                    });
                    allCardNames = Array.from(cardSet);
                }
                
                if (window.cardDatabase) {
                    allCardNames = allCardNames.concat(Object.keys(window.cardDatabase));
                } else {
                    // Fallback with known high-level cards
                    const knownHighLevelCards = [
                        'IcyGrave', 'PoisonedWell', 'Fireball', 'FlameAvalanche', 'HandOfDeath',
                        'GloriousRebirth', 'CrystalWell', 'Iceage', 'CriticalStrike', 'FrostRune',
                        'VampireOnFire', 'SkeletonNecromancer'
                    ];
                    
                    knownHighLevelCards.forEach(cardName => {
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
            
            // NEW: Check if spell is level 3 or higher
            const spellLevel = cardInfo.level || 0;
            if (spellLevel < minimumLevel) {
                return;
            }
            
            eligibleSpells.push({
                name: cardName,
                info: cardInfo,
                spellSchool: cardInfo.spellSchool,
                level: spellLevel
            });
        });
        
        console.log('DivineGiftOfMagic: Found', eligibleSpells.length, 'eligible level 3+ spells:', eligibleSpells.map(s => s.name));
        return eligibleSpells;
    },
    
    // Select random different spells (up to the number of heroes)
    selectRandomSpells(availableSpells, heroCount) {
        const shuffled = [...availableSpells].sort(() => Math.random() - 0.5);
        const selectedSpells = [];
        
        // Get up to heroCount different spells
        for (let i = 0; i < shuffled.length && selectedSpells.length < heroCount; i++) {
            const spell = shuffled[i];
            
            // Check if we already have this spell
            const alreadySelected = selectedSpells.some(selected => selected.name === spell.name);
            if (!alreadySelected) {
                selectedSpells.push(spell);
            }
        }
        
        return selectedSpells;
    },
    
    // Activate the spell (global activation)
    async activate(heroSelection, cardIndex) {
        const canActivateResult = this.canActivate(heroSelection);
        if (!canActivateResult.canActivate) {
            return {
                success: false,
                message: canActivateResult.reason,
                consumed: false
            };
        }
        
        try {
            // Get all player heroes
            const formation = heroSelection.formationManager.getBattleFormation();
            const heroPositions = ['left', 'center', 'right'].filter(pos => 
                formation[pos] !== null && formation[pos] !== undefined
            );
            
            if (heroPositions.length === 0) {
                return {
                    success: false,
                    message: 'No Heroes available to receive divine gifts!',
                    consumed: false
                };
            }
            
            // Get available high-level spells and select random ones
            const availableSpells = this.getAvailableHighLevelSpells(heroSelection);
            const selectedSpells = this.selectRandomSpells(availableSpells, heroPositions.length);
            
            if (selectedSpells.length === 0) {
                return {
                    success: false,
                    message: 'Could not find any eligible high-level spells!',
                    consumed: false
                };
            }
            
            // Give one spell to each hero (WORKS FOR ALL HEROES NOW)
            const giftResults = [];
            
            for (let i = 0; i < heroPositions.length && i < selectedSpells.length; i++) {
                const position = heroPositions[i];
                const spell = selectedSpells[i];
                const hero = formation[position];
                
                // Add spell to hero's spellbook (no longer checking if spellbook is locked)
                const success = heroSelection.heroSpellbookManager.addSpellToHero(position, spell.name);
                if (success) {
                    giftResults.push({
                        position: position,
                        hero: hero,
                        spell: spell
                    });
                }
            }
            
            if (giftResults.length === 0) {
                return {
                    success: false,
                    message: 'Failed to add any spells to Hero spellbooks!',
                    consumed: false
                };
            }
            
            // Show individual popups for each hero
            this.showDivineGiftEffects(giftResults);
            
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
            const cardInfo = heroSelection.getCardInfo('DivineGiftOfMagic');
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
            
            const giftedHeroes = giftResults.map(result => result.hero.name).join(', ');
            const message = `Divine Gift Of Magic blessed ${giftedHeroes} with powerful spells!`;
            
            return {
                success: true,
                message: message,
                consumed: true,
                giftResults: giftResults
            };
            
        } catch (error) {
            console.error('Error activating Divine Gift Of Magic:', error);
            return {
                success: false,
                message: 'Failed to activate Divine Gift Of Magic',
                consumed: false
            };
        }
    },
    
    // Show divine gift effects above each hero
    showDivineGiftEffects(giftResults) {
        giftResults.forEach((result, index) => {
            // Stagger the popups slightly
            setTimeout(() => {
                this.showHeroGiftPopup(result.position, result.spell, result.hero.name);
            }, index * 300);
        });
    },
    
    // Show gift popup above a specific hero
    showHeroGiftPopup(heroPosition, spell, heroName) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        const formattedSpellName = window.heroSelection?.formatCardName ? 
            window.heroSelection.formatCardName(spell.name) : spell.name;
        const schoolIcon = this.getSpellSchoolIcon(spell.spellSchool);
        
        const popup = document.createElement('div');
        popup.className = 'divine-gift-popup';
        popup.innerHTML = `
            <div class="divine-gift-header">
                <span class="divine-gift-icon">✨</span>
                <span class="divine-gift-title">Divine Gift!</span>
            </div>
            <div class="divine-gift-spell">
                <span class="spell-school-icon">${schoolIcon}</span>
                <span class="spell-name">${formattedSpellName}</span>
                <span class="spell-level">Lv.${spell.level}</span>
            </div>
            <div class="divine-gift-hero">${heroName}</div>
        `;
        
        popup.style.cssText = `
            position: absolute;
            top: -100px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 193, 7, 0.95));
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.8);
            border-radius: 12px;
            padding: 12px;
            min-width: 200px;
            box-shadow: 0 8px 32px rgba(255, 215, 0, 0.6);
            z-index: 1000;
            animation: divineGiftSlide 3s ease-out;
            pointer-events: none;
            color: #3e2723;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif;
            text-align: center;
        `;
        
        teamSlot.style.position = 'relative';
        teamSlot.appendChild(popup);
        
        // Remove popup after animation
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 3000);
    },
    
    // Get icon for spell school (reuse from ButterflyCloud)
    getSpellSchoolIcon(spellSchool) {
        const icons = {
            'DestructionMagic': '🔥',
            'DecayMagic': '☠️', 
            'SupportMagic': '✨'
        };
        return icons[spellSchool] || '🪄';
    },
    
    // Handle click activation (main activation method)
    async handleClick(cardIndex, cardName, heroSelection, globalSpellManager) {
        const result = await this.activate(heroSelection, cardIndex);
        
        // Show visual feedback
        if (result.success) {
            showDivineGiftSuccess(result.message);
        } else {
            showDivineGiftError(result.message);
        }
        
        return result.success;
    }
};

// ===== VISUAL FEEDBACK FUNCTIONS =====

function showDivineGiftSuccess(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'divine-gift-success-popup';
    feedbackDiv.innerHTML = `
        <div class="divine-gift-success-content">
            <span class="divine-gift-success-icon">✨</span>
            <span class="divine-gift-success-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 25%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 193, 7, 0.95));
        color: #3e2723;
        padding: 18px 28px;
        border-radius: 12px;
        font-size: 15px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: divineGiftSuccessBounce 0.6s ease-out;
        box-shadow: 0 8px 32px rgba(255, 215, 0, 0.6);
        border: 2px solid rgba(255, 255, 255, 0.8);
        max-width: 500px;
        text-align: center;
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(feedbackDiv);
    
    setTimeout(() => {
        feedbackDiv.style.animation = 'divineGiftSuccessFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3500);
}

function showDivineGiftError(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'divine-gift-error-popup';
    feedbackDiv.innerHTML = `
        <div class="divine-gift-error-content">
            <span class="divine-gift-error-icon">⚠️</span>
            <span class="divine-gift-error-text">${message}</span>
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
        animation: divineGiftErrorBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(244, 67, 54, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(feedbackDiv);
    
    setTimeout(() => {
        feedbackDiv.style.animation = 'divineGiftErrorFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3000);
}

// ===== CSS STYLES =====

// Add CSS animations and styles
if (typeof document !== 'undefined' && !document.getElementById('divineGiftSpellStyles')) {
    const style = document.createElement('style');
    style.id = 'divineGiftSpellStyles';
    style.textContent = `
        /* Divine Gift Popup Styles */
        .divine-gift-popup {
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            text-align: center;
        }
        
        .divine-gift-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 13px;
        }
        
        .divine-gift-icon {
            font-size: 16px;
            animation: divineGiftIconSparkle 2s ease-in-out infinite;
        }
        
        .divine-gift-title {
            color: #3e2723;
        }
        
        .divine-gift-spell {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin: 8px 0;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.4);
            border-radius: 8px;
            font-weight: 600;
            font-size: 12px;
            border: 1px solid rgba(255, 255, 255, 0.6);
        }
        
        .spell-school-icon {
            font-size: 14px;
        }
        
        .spell-name {
            flex: 1;
            color: #2e7d32;
            font-weight: 700;
        }
        
        .spell-level {
            background: rgba(76, 175, 80, 0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }
        
        .divine-gift-hero {
            font-size: 11px;
            font-weight: 600;
            color: #5d4037;
            margin-top: 6px;
        }
        
        /* Animations */
        @keyframes divineGiftSlide {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(15px) scale(0.8);
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
                transform: translateX(-50%) translateY(-10px) scale(0.9);
            }
        }
        
        @keyframes divineGiftIconSparkle {
            0%, 100% { 
                transform: scale(1) rotate(0deg);
                filter: brightness(1);
            }
            25% { 
                transform: scale(1.1) rotate(90deg);
                filter: brightness(1.3);
            }
            50% { 
                transform: scale(1.2) rotate(180deg);
                filter: brightness(1.5);
            }
            75% { 
                transform: scale(1.1) rotate(270deg);
                filter: brightness(1.3);
            }
        }
        
        /* Success popup animations */
        @keyframes divineGiftSuccessBounce {
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
        
        @keyframes divineGiftSuccessFade {
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
        @keyframes divineGiftErrorBounce {
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
        
        @keyframes divineGiftErrorFade {
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
        .divine-gift-success-content,
        .divine-gift-error-content {
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: center;
        }
        
        .divine-gift-success-icon,
        .divine-gift-error-icon {
            font-size: 20px;
        }
        
        .divine-gift-success-text,
        .divine-gift-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.divineGiftOfMagicSpell = divineGiftOfMagicSpell;
}