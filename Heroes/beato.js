// ./Heroes/beato.js - Beato Hero Effect Manager: Start of Turn Spell Learning
// At the start of every turn, Beato permanently learns 1 random spell following ButterflyCloud rules
import { getHeroCards } from '../heroStartingCards.js';
import { getAllHeroes } from '../cardDatabase.js';

export class BeatoEffectManager {
    constructor() {
        // No persistent state needed - effect triggers every turn
    }

    // Process Beato spell learning after battle (called from returnToFormationScreenAfterBattle)
    async processPostBattleEmpowerment(heroSelection) {
        if (!heroSelection) {
            console.error('❌ Beato: No heroSelection provided');
            return;
        }
        
        if (!heroSelection.formationManager) {
            console.error('❌ Beato: No formationManager found');
            return;
        }
        
        if (!heroSelection.heroSpellbookManager) {
            console.error('❌ Beato: No heroSpellbookManager found');
            return;
        }

        console.log('🎯 Beato: Starting post-battle spell learning');

        try {
            // Find Beato in current formation
            const formation = heroSelection.formationManager.getBattleFormation();
            const beatoPosition = this.findBeatoPosition(formation);
            
            if (!beatoPosition) {
                console.log('ℹ️ Beato: Not in formation, skipping spell learning');
                return; // No Beato in formation
            }

            console.log(`✅ Beato found at position: ${beatoPosition}`);

            // Get available spells using ButterflyCloud logic
            const availableSpells = this.getAvailableSpellsForBeato(heroSelection);
            
            if (availableSpells.length === 0) {
                console.warn('⚠️ Beato: No spells available to learn!');
                return;
            }

            console.log(`📚 Beato: ${availableSpells.length} spells available`);

            // Select 1 random spell
            const selectedSpell = this.selectRandomSpell(availableSpells);
            
            console.log(`🎲 Beato: Selected spell: ${selectedSpell.name}`);

            // Add spell to Beato's spellbook
            const success = heroSelection.heroSpellbookManager.addSpellToHero(beatoPosition, selectedSpell.name);
            
            if (success) {
                console.log(`✅ Beato: Successfully learned ${selectedSpell.name}`);
                
                // Show visual effect
                this.showBeatoSpellLearningEffect(beatoPosition, selectedSpell);
                
                // CRITICAL: Save the game state to persist the spell
                try {
                    if (heroSelection.saveGameState) {
                        await heroSelection.saveGameState();
                        console.log('💾 Beato: Game state saved');
                    }
                } catch (error) {
                    console.error('❌ Error saving game state after Beato spell learning:', error);
                    throw error; // Re-throw to prevent silent failure
                }

                // Send formation update to opponent
                try {
                    if (heroSelection.sendFormationUpdate) {
                        await heroSelection.sendFormationUpdate();
                        console.log('📡 Beato: Formation update sent');
                    }
                } catch (error) {
                    console.error('❌ Error sending formation update after Beato spell learning:', error);
                    // Don't throw here - the spell was learned, just notify
                }
            } else {
                console.error(`❌ Beato: Failed to learn spell ${selectedSpell.name}`);
            }
        } catch (error) {
            console.error('❌ Exception in Beato processPostBattleEmpowerment:', error);
            throw error; // Re-throw so we know something failed
        }
    }

    // Find Beato's position in formation
    findBeatoPosition(formation) {
        if (!formation) {
            return null;
        }
        
        const positions = ['left', 'center', 'right'];
        
        for (const position of positions) {
            const hero = formation[position];
            // Check for both Beato and EternalBeato
            if (hero && (hero.name === 'Beato' || hero.name === 'EternalBeato')) {
                return position;
            }
        }
        
        return null;
    }


    // Get list of spells that Beato can learn (using ButterflyCloud rules)
    getAvailableSpellsForBeato(heroSelection) {
        const validSchools = ['DestructionMagic', 'DecayMagic', 'SupportMagic'];
        const excludedSubtypes = ['Creature', 'Permanent', 'Area'];
        
        // SPECIAL EXCLUSIONS: Spells that cannot be learned by Beato
        const excludedSpells = ['PhoenixTackle', 'VictoryPhoenixCannon'];
        
        // NEW: Determine if this is EternalBeato (Ascended form)
        const formation = heroSelection.formationManager.getBattleFormation();
        const beatoPosition = this.findBeatoPosition(formation);
        const isEternalBeato = beatoPosition && formation[beatoPosition]?.name === 'EternalBeato';
        
        // Get all card names - DYNAMICALLY load all hero names from cardDatabase
        let allCardNames = [];
        
        try {
            // Dynamically get all hero names from cardDatabase
            const allHeroes = getAllHeroes();
            const heroNames = allHeroes.map(hero => hero.name);
            
            console.log(`🔍 Beato: Dynamically loaded ${heroNames.length} heroes from database`);
            
            const cardSet = new Set();
            heroNames.forEach(heroName => {
                const heroCards = getHeroCards(heroName);
                if (heroCards && Array.isArray(heroCards)) {
                    heroCards.forEach(card => cardSet.add(card));
                }
            });
            allCardNames = Array.from(cardSet);
            
            // Also get from card database
            if (typeof window !== 'undefined' && window.cardDatabase) {
                allCardNames = allCardNames.concat(Object.keys(window.cardDatabase));
            }
        } catch (error) {
            console.error('Error accessing cards for Beato:', error);
            // Don't return empty - still try with what we have
        }
        
        // Remove duplicates
        allCardNames = [...new Set(allCardNames)];
        
        if (allCardNames.length === 0) {
            console.error('❌ Beato: No cards found in database!');
            return [];
        }
        
        console.log(`📋 Beato: Found ${allCardNames.length} total cards to filter`);
        
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
            
            // SPECIAL EXCLUSION: Exclude Phoenix spells
            if (excludedSpells.includes(cardName)) {
                return;
            }
            
            // NEW: For EternalBeato, only include spells with level 3+
            if (isEternalBeato) {
                const spellLevel = cardInfo.level !== undefined ? cardInfo.level : 0;
                if (spellLevel < 3) {
                    return; // Skip spells below level 3 for EternalBeato
                }
            }
            
            // Add to eligible list
            eligibleSpells.push({
                name: cardName,
                info: cardInfo,
                spellSchool: cardInfo.spellSchool,
                level: cardInfo.level || 0
            });
        });
        
        console.log(`📚 ${isEternalBeato ? 'EternalBeato' : 'Beato'} eligible spells: ${eligibleSpells.length}${isEternalBeato ? ' (level 3+)' : ''}`);
        return eligibleSpells;
    }


    // Select 1 random spell
    selectRandomSpell(availableSpells) {
        if (availableSpells.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * availableSpells.length);
        return availableSpells[randomIndex];
    }

    // Show visual effect when Beato learns a spell
    showBeatoSpellLearningEffect(beatoPosition, learnedSpell) {
        const spellSchoolIcon = this.getSpellSchoolIcon(learnedSpell.spellSchool);
        const formattedSpellName = window.heroSelection?.formatCardName ? 
            window.heroSelection.formatCardName(learnedSpell.name) : learnedSpell.name;
        
        // Create spell learning notification - follow Kyli's exact positioning pattern
        const notification = document.createElement('div');
        notification.className = 'beato-spell-learning-notification';
        notification.innerHTML = `
            <div class="beato-notification-content">
                <div class="beato-notification-header">
                    <span class="beato-icon">📚</span>
                    <span class="beato-title">Beato learned a new spell!</span>
                </div>
                <div class="beato-spell-display">
                    <span class="beato-spell-icon">${spellSchoolIcon}</span>
                    <span class="beato-spell-name">${formattedSpellName}</span>
                </div>
            </div>
        `;
        
        // Use the same positioning approach as Kyli's notification
        notification.style.cssText = `
            position: fixed;
            top: 15%;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%);
            color: #1b5e20;
            padding: 20px 32px;
            border-radius: 20px;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif;
            text-align: center;
            z-index: 10000;
            pointer-events: none;
            animation: beatoSpellNotification 3.5s ease-out forwards;
            box-shadow: 0 8px 32px rgba(76, 175, 80, 0.5);
            border: 3px solid rgba(129, 199, 132, 0.4);
            min-width: 280px;
        `;

        // Append to body like Kyli does
        document.body.appendChild(notification);

        // Remove after animation completes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3500);
    }

    // Get icon for spell school
    getSpellSchoolIcon(spellSchool) {
        const icons = {
            'DestructionMagic': '🔥',
            'DecayMagic': '💀',
            'SupportMagic': '✨'
        };
        return icons[spellSchool] || '📜';
    }

    // Reset for new turn - no state to reset since effect triggers every turn
    resetForNewTurn() {
        // No turn-based state to reset
    }

    // Reset to initial state - no state to reset
    reset() {
        // No persistent state to reset
    }

    // Export state for saving (no state needed)
    exportBeatoState() {
        return {
            // No persistent state to save
        };
    }

    // Import state for loading (no state needed)
    importBeatoState(state) {
        // No persistent state to restore
        return true;
    }
}

// Add CSS styles for Beato spell learning effect
if (typeof document !== 'undefined' && !document.getElementById('beatoSpellLearningStyles')) {
    const style = document.createElement('style');
    style.id = 'beatoSpellLearningStyles';
    style.textContent = `
        /* Beato Spell Learning Notification Animation */
        @keyframes beatoSpellNotification {
            0% { 
                opacity: 0;
                transform: translateX(-50%) translateY(10px) scale(0.8);
            }
            15% { 
                opacity: 1;
                transform: translateX(-50%) translateY(0px) scale(1.05);
            }
            20% {
                transform: translateX(-50%) translateY(0px) scale(1.0);
            }
            85% { 
                opacity: 1;
                transform: translateX(-50%) translateY(0px) scale(1);
            }
            100% { 
                opacity: 0;
                transform: translateX(-50%) translateY(-15px) scale(0.9);
            }
        }

        /* Beato Notification Styling */
        .beato-spell-learning-notification .beato-notification-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 10px;
        }

        .beato-spell-learning-notification .beato-icon {
            font-size: 18px;
            filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
        }

        .beato-spell-learning-notification .beato-title {
            font-size: 14px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        .beato-spell-learning-notification .beato-spell-display {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.4);
            border-radius: 10px;
            border: 1px solid rgba(129, 199, 132, 0.4);
        }

        .beato-spell-learning-notification .beato-spell-icon {
            font-size: 16px;
            filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
        }

        .beato-spell-learning-notification .beato-spell-name {
            font-size: 13px;
            font-weight: 600;
            color: #2e7d32;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            letter-spacing: 0.5px;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .beato-spell-learning-notification {
                padding: 12px 16px;
                min-width: 200px;
            }
            
            .beato-spell-learning-notification .beato-title {
                font-size: 12px;
            }
            
            .beato-spell-learning-notification .beato-spell-name {
                font-size: 11px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other modules
export default BeatoEffectManager;