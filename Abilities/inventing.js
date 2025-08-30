// Abilities/inventing.js - Inventing Ability System
// Tracks counters and handles disenchant-triggered effects

export class InventingAbility {
    constructor() {
        // Track each Inventing instance by heroPosition-zone key
        // Format: 'left-1', 'center-2', 'right-3'
        this.inventingData = {};
        
        console.log('InventingAbility system initialized');
    }

    // Initialize the system (called once when game loads)
    init() {
        // Hook into existing systems would be done in heroSelection.js
        console.log('InventingAbility system ready');
    }

    // Main handler - called when any card is disenchanted
    handleDisenchant(heroSelection) {
        if (!heroSelection || !heroSelection.heroAbilitiesManager) {
            console.warn('InventingAbility: Invalid heroSelection reference');
            return;
        }

        console.log('🔧 InventingAbility: Processing disenchant trigger...');
        
        // Find all Heroes with Inventing abilities
        const inventingInstances = this.findAllInventingInstances(heroSelection);
        
        if (inventingInstances.length === 0) {
            console.log('🔧 InventingAbility: No Inventing abilities found');
            return;
        }

        let totalCountersAdded = 0;
        
        // Process each Inventing instance
        inventingInstances.forEach(instance => {
            const { heroPosition, zone, level } = instance;
            const key = `${heroPosition}-${zone}`;
            
            // Ensure data exists for this instance
            if (!this.inventingData[key]) {
                this.inventingData[key] = {
                    counters: 0,
                    generationsThisTurn: 0
                };
            }
            
            const data = this.inventingData[key];
            
            // Check if this Inventing can still generate counters this turn
            if (data.generationsThisTurn < level) {
                // Add counters equal to level
                data.counters += level;
                data.generationsThisTurn += 1;
                totalCountersAdded += level;
                
                console.log(`🔧 InventingAbility: ${heroPosition} hero zone ${zone} (level ${level}) gains ${level} counters (${data.counters} total, ${data.generationsThisTurn}/${level} generations this turn)`);
                
                // Show visual feedback
                this.showCounterGainFeedback(heroPosition, zone, level, data.counters);
            } else {
                console.log(`🔧 InventingAbility: ${heroPosition} hero zone ${zone} has reached generation limit (${data.generationsThisTurn}/${level})`);
            }
        });

        if (totalCountersAdded > 0) {
            console.log(`🔧 InventingAbility: Added ${totalCountersAdded} total counters across all Inventing abilities`);
            
            // Update counter displays
            this.updateInventingCounterDisplays();
            
            // Check for card draws after all counters are added
            this.checkAndProcessCardDraws(heroSelection);
        }
    }

    // Find all Inventing instances across all heroes
    findAllInventingInstances(heroSelection) {
        const instances = [];
        const abilitiesManager = heroSelection.heroAbilitiesManager;
        
        ['left', 'center', 'right'].forEach(heroPosition => {
            const heroAbilities = abilitiesManager.getHeroAbilities(heroPosition);
            
            if (heroAbilities) {
                // Check each zone for Inventing abilities
                [1, 2, 3].forEach(zoneNumber => {
                    const zone = heroAbilities[`zone${zoneNumber}`];
                    
                    if (zone && zone.length > 0 && zone[0].name === 'Inventing') {
                        instances.push({
                            heroPosition,
                            zone: zoneNumber,
                            level: zone.length // Stack count = level
                        });
                    }
                });
            }
        });
        
        return instances;
    }

    // Check all Inventing instances for 5+ counters and process card draws
    checkAndProcessCardDraws(heroSelection) {
        let totalCardsDrawn = 0;
        
        // Process all instances that have 5+ counters
        Object.keys(this.inventingData).forEach(key => {
            const data = this.inventingData[key];
            
            while (data.counters >= 5) {
                // Remove 5 counters and draw 1 card
                data.counters -= 5;
                totalCardsDrawn += 1;
                
                const [heroPosition, zone] = key.split('-');
                console.log(`🔧 InventingAbility: ${heroPosition} hero zone ${zone} converts 5 counters to 1 card draw (${data.counters} counters remaining)`);
                
                // Draw the card
                const success = heroSelection.handManager.addCardToHand(this.drawCardFromDeck(heroSelection));
                if (success) {
                    // Show visual feedback for card draw
                    this.showCardDrawFeedback(heroPosition, parseInt(zone));
                }
            }
        });

        if (totalCardsDrawn > 0) {
            console.log(`🔧 InventingAbility: Drew ${totalCardsDrawn} card(s) from Inventing counter conversions`);
            
            // Update counter displays after spending counters
            this.updateInventingCounterDisplays();
            
            // Update UI
            if (heroSelection.updateHandDisplay) {
                heroSelection.updateHandDisplay();
            }
            
            // Auto-save the updated state
            if (heroSelection.autoSave) {
                heroSelection.autoSave();
            }
        }
    }

    // Draw a random card from the deck
    drawCardFromDeck(heroSelection) {
        if (!heroSelection.deckManager) {
            console.warn('InventingAbility: No deck manager available');
            return 'MagicAmethyst'; // Fallback card
        }

        const deck = heroSelection.deckManager.getDeck();
        if (deck.length === 0) {
            console.warn('InventingAbility: Deck is empty, using fallback card');
            return 'MagicAmethyst'; // Fallback card
        }

        // Draw a random card from the deck
        const randomIndex = Math.floor(Math.random() * deck.length);
        return deck[randomIndex];
    }

    // Show visual feedback when counters are gained
    showCounterGainFeedback(heroPosition, zone, countersGained, totalCounters) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;

        const feedback = document.createElement('div');
        feedback.className = 'inventing-counter-feedback';
        feedback.innerHTML = `
            <div class="inventing-feedback-content">
                <span class="inventing-icon">🔧</span>
                <span class="inventing-text">+${countersGained} counters (${totalCounters} total)</span>
            </div>
        `;
        
        feedback.style.cssText = `
            position: absolute;
            top: -60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: bold;
            z-index: 10001;
            pointer-events: none;
            animation: inventingCounterFeedback 3s ease-out;
            box-shadow: 0 4px 15px rgba(23, 162, 184, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
            white-space: nowrap;
        `;
        
        teamSlot.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }

    // Show visual feedback when cards are drawn
    showCardDrawFeedback(heroPosition, zone) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;

        const feedback = document.createElement('div');
        feedback.className = 'inventing-draw-feedback';
        feedback.innerHTML = `
            <div class="inventing-draw-content">
                <span class="inventing-draw-icon">🃏</span>
                <span class="inventing-draw-text">Inventing draws card!</span>
            </div>
        `;
        
        feedback.style.cssText = `
            position: absolute;
            top: -90px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 10px 18px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10002;
            pointer-events: none;
            animation: inventingDrawFeedback 4s ease-out;
            box-shadow: 0 6px 20px rgba(40, 167, 69, 0.6);
            border: 2px solid rgba(255, 255, 255, 0.4);
            white-space: nowrap;
        `;
        
        teamSlot.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 4000);
    }

    // Reset generation counters for new turn
    resetTurn() {
        let resetCount = 0;
        
        Object.keys(this.inventingData).forEach(key => {
            if (this.inventingData[key].generationsThisTurn > 0) {
                resetCount++;
            }
            this.inventingData[key].generationsThisTurn = 0;
        });
        
        if (resetCount > 0) {
            console.log(`🔧 InventingAbility: Reset generation counters for ${resetCount} Inventing instance(s) for new turn`);
        }
    }

    // Export state for save/restore
    exportState() {
        return {
            inventingData: JSON.parse(JSON.stringify(this.inventingData))
        };
    }

    // Import state from save/restore
    importState(state) {
        if (!state) return false;
        
        if (state.inventingData) {
            this.inventingData = JSON.parse(JSON.stringify(state.inventingData));
            
            const instanceCount = Object.keys(this.inventingData).length;
            let totalCounters = 0;
            let totalGenerations = 0;
            
            Object.values(this.inventingData).forEach(data => {
                totalCounters += data.counters;
                totalGenerations += data.generationsThisTurn;
            });
            
            console.log(`🔧 InventingAbility: Restored ${instanceCount} Inventing instance(s) with ${totalCounters} total counters and ${totalGenerations} generations this turn`);
            return true;
        }
        
        return false;
    }

    // Clean up data for Inventing instances that no longer exist
    cleanupObsoleteData(heroSelection) {
        if (!heroSelection) return;
        
        const currentInstances = this.findAllInventingInstances(heroSelection);
        const currentKeys = new Set(currentInstances.map(instance => 
            `${instance.heroPosition}-${instance.zone}`
        ));
        
        let cleanedCount = 0;
        Object.keys(this.inventingData).forEach(key => {
            if (!currentKeys.has(key)) {
                delete this.inventingData[key];
                cleanedCount++;
            }
        });
        
        if (cleanedCount > 0) {
            console.log(`🔧 InventingAbility: Cleaned up ${cleanedCount} obsolete Inventing instance(s)`);
        }
    }

    // Get current state info for debugging
    getStateInfo() {
        const instances = Object.keys(this.inventingData).length;
        let totalCounters = 0;
        let totalGenerations = 0;
        
        Object.values(this.inventingData).forEach(data => {
            totalCounters += data.counters;
            totalGenerations += data.generationsThisTurn;
        });
        
        return {
            instances,
            totalCounters,
            totalGenerations,
            data: { ...this.inventingData }
        };
    }

    // Get current counter count for a specific hero position and zone
    getCountersForPosition(heroPosition, zone) {
        const key = `${heroPosition}-${zone}`;
        return this.inventingData[key] ? this.inventingData[key].counters : 0;
    }

    // Update all Inventing counter displays in the UI
    updateInventingCounterDisplays() {
        Object.keys(this.inventingData).forEach(key => {
            const [heroPosition, zone] = key.split('-');
            const counterCount = this.inventingData[key].counters;
            
            const counterDisplay = document.querySelector(`.inventing-counter-display[data-position="${heroPosition}"][data-zone="${zone}"]`);
            if (counterDisplay) {
                const counterValue = counterDisplay.querySelector('.inventing-counter-value');
                if (counterValue) {
                    counterValue.textContent = counterCount;
                    
                    // Add brief highlight effect when counter changes
                    counterDisplay.classList.add('counter-updated');
                    setTimeout(() => {
                        counterDisplay.classList.remove('counter-updated');
                    }, 500);
                }
            }
        });
    }

    // Reset everything (for new games)
    reset() {
        this.inventingData = {};
        console.log('🔧 InventingAbility: System reset for new game');
    }
}

// Create singleton instance
export const inventingAbility = new InventingAbility();

// CSS styles for visual feedback
if (typeof document !== 'undefined' && !document.getElementById('inventingAbilityStyles')) {
    const style = document.createElement('style');
    style.id = 'inventingAbilityStyles';
    style.textContent = `
        /* Inventing counter gain feedback animation */
        @keyframes inventingCounterFeedback {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(15px) scale(0.8);
            }
            20% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            80% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-15px) scale(0.9);
            }
        }
        
        /* Inventing card draw feedback animation */
        @keyframes inventingDrawFeedback {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.7);
            }
            15% {
                opacity: 1;
                transform: translateX(-50%) translateY(-10px) scale(1.1);
            }
            25% {
                transform: translateX(-50%) translateY(-8px) scale(1.05);
            }
            85% {
                opacity: 1;
                transform: translateX(-50%) translateY(-8px) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px) scale(0.8);
            }
        }
        
        /* Inventing feedback content styling */
        .inventing-feedback-content {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .inventing-draw-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .inventing-icon, .inventing-draw-icon {
            font-size: 16px;
        }
        
        .inventing-text, .inventing-draw-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            letter-spacing: 0.5px;
        }
    `;
    document.head.appendChild(style);
}

// Initialize system when module loads
if (typeof window !== 'undefined') {
    window.inventingAbility = inventingAbility;
}