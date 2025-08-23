// charme.js - Charme Ability Manager for Free Redraws

export class CharmeManager {
    constructor() {
        this.charmeCounters = 0;
        this.cardRewardManager = null; // Reference to the card reward manager
    }

    // Initialize with card reward manager reference
    init(cardRewardManager) {
        this.cardRewardManager = cardRewardManager;
        console.log('CharmeManager initialized');
    }

    // Calculate Charme counters from hero abilities
    calculateCharmeCounters(heroSelection) {
        if (!heroSelection || !heroSelection.heroAbilitiesManager) {
            return 0;
        }

        let totalCharmeCounters = 0;
        
        // Check each hero position for Charme abilities
        ['left', 'center', 'right'].forEach(position => {
            const charmeCount = heroSelection.heroAbilitiesManager.getAbilityStackCountForPosition(position, 'Charme');
            totalCharmeCounters += charmeCount;
            
            if (charmeCount > 0) {
                console.log(`🎭 ${position} hero has ${charmeCount} Charme abilities`);
            }
        });
        
        console.log(`🎭 Total Charme counters earned: ${totalCharmeCounters}`);
        return totalCharmeCounters;
    }

    // Set Charme counters (called when rewards are first shown)
    setCharmeCounters(heroSelection) {
        this.charmeCounters = this.calculateCharmeCounters(heroSelection);
        if (this.charmeCounters > 0) {
            console.log(`🎭 Player earned ${this.charmeCounters} Charme counters for free redraws!`);
        }
        return this.charmeCounters;
    }

    // Get current Charme counter count
    getCharmeCounters() {
        return this.charmeCounters;
    }

    // Check if redraw should be free (has Charme counters)
    shouldRedrawBeFree() {
        return this.charmeCounters > 0;
    }

    // Get effective redraw cost (0 if using Charme counters)
    getEffectiveRedrawCost(baseRedrawCost) {
        return this.charmeCounters > 0 ? 0 : baseRedrawCost;
    }

    // Consume a Charme counter for redraw
    consumeCharmeCounter() {
        if (this.charmeCounters > 0) {
            this.charmeCounters--;
            console.log(`🎭 Used Charme counter for free redraw! ${this.charmeCounters} remaining`);
            this.showCharmeCounterUsed();
            return true;
        }
        return false;
    }

    // Show visual feedback when Charme counter is used
    showCharmeCounterUsed() {
        const charmeBadge = document.querySelector('.charme-counter-badge');
        if (charmeBadge) {
            // Create animation effect
            const usedIndicator = document.createElement('div');
            usedIndicator.className = 'charme-used-indicator';
            usedIndicator.textContent = '🎭 FREE!';
            usedIndicator.style.cssText = `
                position: absolute;
                top: 50%;
                right: -80px;
                transform: translateY(-50%);
                color: #4caf50;
                font-size: 14px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                animation: charmeUsedSlide 2s ease-out forwards;
                z-index: 101;
                white-space: nowrap;
            `;
            
            charmeBadge.style.position = 'relative';
            charmeBadge.appendChild(usedIndicator);
            
            // Flash the badge
            charmeBadge.style.animation = 'charmeBadgeFlash 0.6s ease-out';
            setTimeout(() => {
                charmeBadge.style.animation = '';
            }, 600);
            
            setTimeout(() => {
                usedIndicator.remove();
            }, 2000);
        }
    }

    // Create Charme counters display as a circle badge
    createCharmeCountersHTML() {
        if (this.charmeCounters <= 0) {
            return '';
        }

        return `
            <div class="charme-counter-badge" title="Free redraws available">
                <span class="charme-counter-number">${this.charmeCounters}</span>
            </div>
        `;
    }

    // Create the cost display for redraw button
    createRedrawCostHTML(baseRedrawCost) {
        if (this.charmeCounters > 0) {
            return `<span class="free-cost-text">FREE</span>`;
        } else {
            return `
                <span class="gold-icon">💰</span>
                <span class="cost-number">${baseRedrawCost}</span>
            `;
        }
    }

    // Export state for saving
    exportCharmeState() {
        return {
            charmeCounters: this.charmeCounters
        };
    }

    // Import state for restoration
    importCharmeState(state, heroSelection) {
        if (state && state.charmeCounters !== undefined) {
            this.charmeCounters = state.charmeCounters;
            console.log('🎭 Restored Charme counters:', this.charmeCounters);
            return true;
        } else {
            // Recalculate if not saved (backward compatibility)
            this.charmeCounters = this.calculateCharmeCounters(heroSelection);
            console.log('🎭 Recalculated Charme counters for backward compatibility:', this.charmeCounters);
            return false;
        }
    }

    // Reset Charme state
    reset() {
        this.charmeCounters = 0;
        console.log('🎭 CharmeManager reset');
    }

    // Get Charme CSS styles
    static getCharmeStyles() {
        return `
            /* Charme Counter Badge - Pink Circle */
            .charme-counter-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                width: 24px;
                height: 24px;
                background: linear-gradient(135deg, #e91e63 0%, #ad1457 100%);
                border: 2px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                box-shadow: 0 2px 8px rgba(233, 30, 99, 0.4);
                animation: charmeBadgePulse 2s ease-in-out infinite;
            }

            .charme-counter-number {
                color: white;
                font-size: 12px;
                font-weight: 900;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
                line-height: 1;
            }

            .free-cost-text {
                color: #4caf50;
                font-weight: 900;
                font-size: 16px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }

            /* Enhanced redraw button needs relative positioning for badge */
            .enhanced-redraw-button {
                position: relative;
            }

            /* Charme Badge Animations */
            @keyframes charmeBadgePulse {
                0%, 100% { 
                    transform: scale(1); 
                    box-shadow: 0 2px 8px rgba(233, 30, 99, 0.4);
                }
                50% { 
                    transform: scale(1.1); 
                    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.6);
                }
            }

            @keyframes charmeBadgeFlash {
                0% { 
                    transform: scale(1); 
                    background: linear-gradient(135deg, #e91e63 0%, #ad1457 100%);
                }
                50% { 
                    transform: scale(1.3); 
                    background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
                }
                100% { 
                    transform: scale(1); 
                    background: linear-gradient(135deg, #e91e63 0%, #ad1457 100%);
                }
            }

            @keyframes charmeUsedSlide {
                0% { 
                    opacity: 0; 
                    transform: translateY(-50%) translateX(-20px) scale(0.8); 
                }
                25% { 
                    opacity: 1; 
                    transform: translateY(-50%) translateX(0px) scale(1.2); 
                }
                75% { 
                    opacity: 1; 
                    transform: translateY(-50%) translateX(0px) scale(1); 
                }
                100% { 
                    opacity: 0; 
                    transform: translateY(-50%) translateX(20px) scale(0.9); 
                }
            }

            /* Hover effect for the badge */
            .charme-counter-badge:hover {
                transform: scale(1.2);
                animation: none;
                box-shadow: 0 4px 16px rgba(233, 30, 99, 0.7);
            }

            /* For larger numbers, make badge slightly bigger */
            .charme-counter-badge:has(.charme-counter-number:is([data-count="10"], [data-count="11"], [data-count="12"], [data-count="13"], [data-count="14"], [data-count="15"], [data-count="16"], [data-count="17"], [data-count="18"], [data-count="19"])) {
                width: 28px;
                height: 28px;
                top: -10px;
                right: -10px;
            }

            /* Alternative for 2-digit numbers using text content check */
            .charme-counter-badge .charme-counter-number {
                font-size: 12px;
            }

            /* Make badge bigger for 2-digit numbers */
            .enhanced-redraw-button:has(.charme-counter-badge .charme-counter-number:is(:contains("10"), :contains("11"), :contains("12"), :contains("13"), :contains("14"), :contains("15"), :contains("16"), :contains("17"), :contains("18"), :contains("19"))) .charme-counter-badge {
                width: 28px;
                height: 28px;
                top: -10px;
                right: -10px;
            }
        `;
    }
}

export default CharmeManager;