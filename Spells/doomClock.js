// doomClock.js - Doom Clock Area Effect with Counter System, Visual Feedback, and Counter Synchronization
// Forces battle draw when reaching 12 counters

export class DoomClockEffect {
    constructor() {
        this.isActive = false;
        this.playerDoomCounters = 0;
        this.opponentDoomCounters = 0;
        this.roundsCompletedThisBattle = 0;
    }

    // Check if Doom Clock should be active at battle start
    checkDoomClockActive(battleManager) {
        if (!battleManager) return { active: false, playerCounters: 0, opponentCounters: 0 };

        const playerHasDoom = battleManager.playerAreaCard && 
                              battleManager.playerAreaCard.name === 'DoomClock';
        const opponentHasDoom = battleManager.opponentAreaCard && 
                                battleManager.opponentAreaCard.name === 'DoomClock';

        // Get counter values from area cards
        const playerCounters = playerHasDoom ? (battleManager.playerAreaCard.doomCounters || 0) : 0;
        const opponentCounters = opponentHasDoom ? (battleManager.opponentAreaCard.doomCounters || 0) : 0;

        if (playerHasDoom || opponentHasDoom) {
            return { active: true, playerCounters, opponentCounters };
        }

        return { active: false, playerCounters: 0, opponentCounters: 0 };
    }

    // Initialize Doom Clock effects at battle start
    initializeDoomClock(battleManager) {
        if (!battleManager) return;

        const doomCheck = this.checkDoomClockActive(battleManager);
        
        if (!doomCheck.active) {
            this.isActive = false;
            return;
        }

        this.isActive = true;
        
        // If counters are already set (from reconnection), don't overwrite them
        if (this.playerDoomCounters === 0 && this.opponentDoomCounters === 0) {
            this.playerDoomCounters = doomCheck.playerCounters;
            this.opponentDoomCounters = doomCheck.opponentCounters;
            this.roundsCompletedThisBattle = 0;
        }

        // Sync doom state to guest (only if authoritative)
        if (battleManager.isAuthoritative) {
            battleManager.sendBattleUpdate('doom_clock_start', {
                playerCounters: this.playerDoomCounters,
                opponentCounters: this.opponentDoomCounters,
                timestamp: Date.now()
            });
        }

        // Log current doom clock state
        let doomMessage = '';
        if (this.playerDoomCounters > 0 && this.opponentDoomCounters > 0) {
            doomMessage = `⏰ Twin Doom Clocks tick ominously... ${this.playerDoomCounters}/12, ${this.opponentDoomCounters}/12`;
        } else if (this.playerDoomCounters > 0) {
            doomMessage = `⏰ Doom Clock ticks at ${this.playerDoomCounters}/12...`;
        } else if (this.opponentDoomCounters > 0) {
            doomMessage = `⏰ Doom Clock ticks at ${this.opponentDoomCounters}/12...`;
        } else {
            doomMessage = `⏰ The Doom Clock begins its fateful countdown...`;
        }
        
        battleManager.addCombatLog(doomMessage, 'warning');
    }

    // Called when a full round completes (all positions acted once)
    async processRoundCompletion(battleManager) {
        if (!this.isActive || !battleManager || !battleManager.isAuthoritative) return false;

        this.roundsCompletedThisBattle++;
        
        // Check if any doom clock should increment
        let playerIncremented = false;
        let opponentIncremented = false;

        if (battleManager.playerAreaCard && battleManager.playerAreaCard.name === 'DoomClock') {
            this.playerDoomCounters = (this.playerDoomCounters || 0) + 1;
            battleManager.playerAreaCard.doomCounters = this.playerDoomCounters;
            playerIncremented = true;
        }

        if (battleManager.opponentAreaCard && battleManager.opponentAreaCard.name === 'DoomClock') {
            this.opponentDoomCounters = (this.opponentDoomCounters || 0) + 1;
            battleManager.opponentAreaCard.doomCounters = this.opponentDoomCounters;
            opponentIncremented = true;
        }

        // IMMEDIATELY send network update if any incremented (before showing visuals)
        if (playerIncremented || opponentIncremented) {
            battleManager.addCombatLog(
                `⏰ The Doom Clock advances! Player: ${this.playerDoomCounters}/12, Opponent: ${this.opponentDoomCounters}/12`, 
                'warning'
            );
            
            // NEW: Determine host/guest sequence based on who is the authoritative player
            // Host always goes first, then guest
            const hostIsPlayer = battleManager.isAuthoritative; // Host is always authoritative
            
            battleManager.sendBattleUpdate('doom_clock_increment', {
                playerCounters: this.playerDoomCounters,
                opponentCounters: this.opponentDoomCounters,
                roundsCompleted: this.roundsCompletedThisBattle,
                playerIncremented: playerIncremented,
                opponentIncremented: opponentIncremented,
                hostIsPlayer: hostIsPlayer, // NEW: Tell guest who is host
                timestamp: Date.now()
            });
            
            // FIXED: Always show host increment first, then guest increment
            const hostAnimationPromises = [];
            
            if (hostIsPlayer && playerIncremented) {
                // Host is player side - show player increment first
                hostAnimationPromises.push(this.showDoomClockIncrement('player', this.playerDoomCounters));
                
                if (opponentIncremented) {
                    // Then guest (opponent) after delay
                    hostAnimationPromises.push(
                        battleManager.delay(267).then(() => 
                            this.showDoomClockIncrement('opponent', this.opponentDoomCounters)
                        )
                    );
                }
            } else if (!hostIsPlayer && opponentIncremented) {
                // Host is opponent side - show opponent increment first
                hostAnimationPromises.push(this.showDoomClockIncrement('opponent', this.opponentDoomCounters));
                
                if (playerIncremented) {
                    // Then guest (player) after delay
                    hostAnimationPromises.push(
                        battleManager.delay(267).then(() => 
                            this.showDoomClockIncrement('player', this.playerDoomCounters)
                        )
                    );
                }
            } else {
                // Only one increment or edge case - show whichever one incremented
                if (playerIncremented) {
                    hostAnimationPromises.push(this.showDoomClockIncrement('player', this.playerDoomCounters));
                }
                if (opponentIncremented) {
                    hostAnimationPromises.push(this.showDoomClockIncrement('opponent', this.opponentDoomCounters));
                }
            }
            
            // Wait for host animations to complete
            await Promise.all(hostAnimationPromises);
        }

        // Check for doom at 12 counters
        const playerDoom = this.playerDoomCounters >= 12;
        const opponentDoom = this.opponentDoomCounters >= 12;

        if (playerDoom || opponentDoom) {
            return await this.triggerDoomClock(battleManager, playerDoom, opponentDoom);
        }

        return false; // Battle continues normally
    }

    // Show doom clock increment animation
    async showDoomClockIncrement(side, currentCounters) {
        const overlay = document.createElement('div');
        overlay.className = 'doom-clock-increment-overlay';
        
        overlay.innerHTML = `
            <div class="doom-clock-increment">
                <div class="doom-orb">
                    <span class="doom-counter">${currentCounters}</span>
                </div>
                <div class="doom-increment-text">Doom Clock</div>
                <div class="doom-progress">${currentCounters}/12</div>
            </div>
        `;
        
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: doomFadeIn 0.4s ease-out;
        `;
        
        const incrementContainer = overlay.querySelector('.doom-clock-increment');
        incrementContainer.style.cssText = `
            text-align: center;
            color: white;
            animation: doomCounterPulse 0.5s ease-in-out;
        `;
        
        const orb = overlay.querySelector('.doom-orb');
        orb.style.cssText = `
            width: 120px;
            height: 120px;
            background: radial-gradient(circle, #ff4444 0%, #cc0000 70%, #880000 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px auto;
            box-shadow: 
                0 0 30px rgba(255, 68, 68, 0.8),
                inset 0 0 20px rgba(0, 0, 0, 0.3);
            border: 3px solid rgba(255, 255, 255, 0.3);
            animation: doomOrbPulse 0.5s ease-in-out;
        `;
        
        const counter = overlay.querySelector('.doom-counter');
        counter.style.cssText = `
            font-size: 3rem;
            font-weight: bold;
            color: white;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            font-family: 'Arial', sans-serif;
        `;
        
        const text = overlay.querySelector('.doom-increment-text');
        text.style.cssText = `
            font-size: 1.5rem;
            margin-bottom: 10px;
            color: #ff6666;
            font-weight: bold;
        `;
        
        const progress = overlay.querySelector('.doom-progress');
        progress.style.cssText = `
            font-size: 1.2rem;
            color: #cccccc;
        `;
        
        document.body.appendChild(overlay);
        
        // Add CSS animations if not already present
        this.injectDoomClockIncrementCSS();
        
        // Show for 0.5 seconds
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fade out
        overlay.style.animation = 'doomFadeOut 0.133s ease-out';
        await new Promise(resolve => setTimeout(resolve, 133));
        
        overlay.remove();
    }

    // Inject CSS for doom clock increment animations
    injectDoomClockIncrementCSS() {
        if (document.getElementById('doomClockIncrementStyles')) return;

        const style = document.createElement('style');
        style.id = 'doomClockIncrementStyles';
        style.textContent = `
            @keyframes doomOrbPulse {
                0%, 100% { 
                    transform: scale(1);
                    box-shadow: 
                        0 0 30px rgba(255, 68, 68, 0.8),
                        inset 0 0 20px rgba(0, 0, 0, 0.3);
                }
                50% { 
                    transform: scale(1.1);
                    box-shadow: 
                        0 0 50px rgba(255, 68, 68, 1),
                        0 0 100px rgba(255, 68, 68, 0.5),
                        inset 0 0 30px rgba(0, 0, 0, 0.5);
                }
            }

            @keyframes doomCounterPulse {
                0%, 100% { 
                    opacity: 0.9;
                    transform: scale(1);
                }
                50% { 
                    opacity: 1;
                    transform: scale(1.05);
                }
            }

            @keyframes doomFadeOut {
                0% { 
                    opacity: 1; 
                    transform: scale(1); 
                }
                100% { 
                    opacity: 0; 
                    transform: scale(0.9); 
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Trigger doom clock at 12 counters
    async triggerDoomClock(battleManager, playerDoom, opponentDoom) {
        // Reset counters to 0 for clocks that reached 12
        if (playerDoom && battleManager.playerAreaCard) {
            battleManager.playerAreaCard.doomCounters = 0;
            this.playerDoomCounters = 0;
        }
        if (opponentDoom && battleManager.opponentAreaCard) {
            battleManager.opponentAreaCard.doomCounters = 0;
            this.opponentDoomCounters = 0;
        }

        // Show doom message
        battleManager.addCombatLog('💀⏰ The Doom Clock strikes 12!', 'error');
        
        // SEND MESSAGE TO GUEST FIRST - before showing overlay
        battleManager.sendBattleUpdate('doom_clock_triggered', {
            playerDoom,
            opponentDoom,
            playerCountersReset: playerDoom ? 0 : this.playerDoomCounters,
            opponentCountersReset: opponentDoom ? 0 : this.opponentDoomCounters,
            message: 'The Doom Clock strikes 12!',
            timestamp: Date.now()
        });
        
        // Small delay to ensure guest receives message before we start animation
        await battleManager.delay(100);
        
        // NOW show visual overlay simultaneously on both sides
        await this.showDoomClockMessage(battleManager);

        battleManager.sendBattleUpdate('doom_clock_visual_effects', {
            grayOutHeroes: true,
            timestamp: Date.now()
        });

        // Force battle to end in draw
        return this.forceBattleDraw(battleManager);
    }

    // Show dramatic doom clock message
    async showDoomClockMessage(battleManager) {
        const overlay = document.createElement('div');
        overlay.className = 'doom-clock-overlay';
        overlay.innerHTML = `
            <div class="doom-clock-message">
                <div class="doom-clock-icon">⏰💀</div>
                <div class="doom-clock-text">The Doom Clock strikes 12!</div>
                <div class="doom-clock-subtitle">Fate has decreed this battle a draw...</div>
            </div>
        `;
        
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: doomFadeIn 0.8s ease-out;
        `;
        
        const messageContainer = overlay.querySelector('.doom-clock-message');
        messageContainer.style.cssText = `
            text-align: center;
            color: #cc0000;
            font-family: serif;
            text-shadow: 0 0 20px rgba(204, 0, 0, 0.8);
            transform: scale(0.8);
            animation: doomPulse 2s ease-in-out infinite;
        `;
        
        overlay.querySelector('.doom-clock-icon').style.cssText = `
            font-size: 5rem; 
            margin-bottom: 1.5rem;
            filter: drop-shadow(0 0 10px rgba(204, 0, 0, 0.8));
        `;
        overlay.querySelector('.doom-clock-text').style.cssText = `
            font-size: 3rem; 
            font-weight: bold; 
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 3px;
        `;
        overlay.querySelector('.doom-clock-subtitle').style.cssText = `
            font-size: 1.5rem; 
            opacity: 0.9;
            font-style: italic;
        `;
        
        document.body.appendChild(overlay);
        
        // Add CSS animations
        this.injectDoomClockCSS();
        
        // Wait for dramatic effect, then remove
        await battleManager.delay(4000);
        overlay.remove();
    }

    // Force battle to end in a draw
    forceBattleDraw(battleManager) {
        // Show visual effect for battle ending
        this.grayOutAllHeroes(battleManager);
        
        // Kill all heroes to trigger draw condition
        ['left', 'center', 'right'].forEach(position => {
            if (battleManager.playerHeroes[position] && battleManager.playerHeroes[position].alive) {
                battleManager.playerHeroes[position].alive = false;
                battleManager.playerHeroes[position].currentHp = 0;
                battleManager.handleHeroDeath(battleManager.playerHeroes[position]);
            }
            if (battleManager.opponentHeroes[position] && battleManager.opponentHeroes[position].alive) {
                battleManager.opponentHeroes[position].alive = false;
                battleManager.opponentHeroes[position].currentHp = 0;
                battleManager.handleHeroDeath(battleManager.opponentHeroes[position]);
            }
        });

        return true; // Signal that battle should end
    }

    grayOutAllHeroes(battleManager) {
        // Method 1: Use battleManager's getHeroElement method (most reliable)
        if (battleManager) {
            const positions = ['left', 'center', 'right'];
            const sides = ['player', 'opponent'];
            
            sides.forEach(side => {
                positions.forEach(position => {
                    const heroElement = battleManager.getHeroElement(side, position);
                    if (heroElement) {
                        const card = heroElement.querySelector('.battle-hero-card');
                        if (card) {
                            card.style.filter = 'grayscale(100%) brightness(0.6)';
                            card.style.opacity = '0.7';
                            card.style.transition = 'all 0.5s ease-out';
                        }
                    }
                });
            });
        }
        
        // Method 2: Direct selector approach as backup
        const allHeroElements = document.querySelectorAll('.battle-hero-card');
        allHeroElements.forEach(heroElement => {
            heroElement.style.filter = 'grayscale(100%) brightness(0.6)';
            heroElement.style.opacity = '0.7';
            heroElement.style.transition = 'all 0.5s ease-out';
        });
        
        // Method 3: Fallback for any missed elements
        const fallbackSelectors = ['.hero-card', '.character-card'];
        fallbackSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.filter = 'grayscale(100%) brightness(0.6)';
                element.style.opacity = '0.7';
                element.style.transition = 'all 0.5s ease-out';
            });
        });
    }
    // Inject CSS for doom clock animations
    injectDoomClockCSS() {
        if (document.getElementById('doomClockStyles')) return;

        const style = document.createElement('style');
        style.id = 'doomClockStyles';
        style.textContent = `
            @keyframes doomFadeIn {
                0% { 
                    opacity: 0; 
                    transform: scale(0.5); 
                    background: rgba(0, 0, 0, 0);
                }
                100% { 
                    opacity: 1; 
                    transform: scale(1); 
                    background: rgba(0, 0, 0, 0.95);
                }
            }

            @keyframes doomPulse {
                0%, 100% { 
                    transform: scale(0.8);
                    text-shadow: 0 0 20px rgba(204, 0, 0, 0.8);
                }
                50% { 
                    transform: scale(1.1);
                    text-shadow: 0 0 30px rgba(204, 0, 0, 1), 0 0 60px rgba(255, 0, 0, 0.5);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Guest handlers
    handleGuestDoomClockStart(data) {
        if (!data) return;

        this.isActive = true;
        this.playerDoomCounters = data.playerCounters || 0;
        this.opponentDoomCounters = data.opponentCounters || 0;
        this.roundsCompletedThisBattle = 0;
        
        // Log doom clock state for guest
        let doomMessage = '';
        if (this.playerDoomCounters > 0 && this.opponentDoomCounters > 0) {
            doomMessage = `⏰ Twin Doom Clocks tick ominously... Player: ${this.playerDoomCounters}/12, Opponent: ${this.opponentDoomCounters}/12`;
        } else if (this.playerDoomCounters > 0) {
            doomMessage = `⏰ Player's Doom Clock ticks at ${this.playerDoomCounters}/12...`;
        } else if (this.opponentDoomCounters > 0) {
            doomMessage = `⏰ Opponent's Doom Clock ticks at ${this.opponentDoomCounters}/12...`;
        } else {
            doomMessage = `⏰ The Doom Clock begins its fateful countdown...`;
        }
        
        if (window.battleManager) {
            window.battleManager.addCombatLog(doomMessage, 'warning');
        }
    }

    async handleGuestDoomClockIncrement(data) {
        if (!data) return;
        
        this.playerDoomCounters = data.playerCounters || 0;
        this.opponentDoomCounters = data.opponentCounters || 0;
        this.roundsCompletedThisBattle = data.roundsCompleted || 0;
        
        if (window.battleManager) {
            window.battleManager.addCombatLog(
                `⏰ The Doom Clock advances! Player: ${this.playerDoomCounters}/12, Opponent: ${this.opponentDoomCounters}/12`, 
                'warning'
            );
            
            // NEW: Sync counters back to area cards for display
            if (window.battleManager.playerAreaCard && window.battleManager.playerAreaCard.name === 'DoomClock') {
                window.battleManager.playerAreaCard.doomCounters = this.playerDoomCounters;
            }
            if (window.battleManager.opponentAreaCard && window.battleManager.opponentAreaCard.name === 'DoomClock') {
                window.battleManager.opponentAreaCard.doomCounters = this.opponentDoomCounters;
            }
            
            // FIXED: Guest mirrors the same host-first sequence that host plays
            const guestAnimationPromises = [];
            const hostIsPlayer = data.hostIsPlayer; // NEW: Get host info from data
            
            if (hostIsPlayer && data.playerIncremented) {
                // Host is player side - show player (host) increment first
                guestAnimationPromises.push(this.showDoomClockIncrement('player', this.playerDoomCounters));
                
                if (data.opponentIncremented) {
                    // Then guest (opponent) after delay
                    guestAnimationPromises.push(
                        window.battleManager.delay(267).then(() =>
                            this.showDoomClockIncrement('opponent', this.opponentDoomCounters)
                        )
                    );
                }
            } else if (!hostIsPlayer && data.opponentIncremented) {
                // Host is opponent side - show opponent (host) increment first
                guestAnimationPromises.push(this.showDoomClockIncrement('opponent', this.opponentDoomCounters));
                
                if (data.playerIncremented) {
                    // Then guest (player) after delay
                    guestAnimationPromises.push(
                        window.battleManager.delay(267).then(() =>
                            this.showDoomClockIncrement('player', this.playerDoomCounters)
                        )
                    );
                }
            } else {
                // Only one increment or edge case - show whichever one incremented
                if (data.playerIncremented) {
                    guestAnimationPromises.push(this.showDoomClockIncrement('player', this.playerDoomCounters));
                }
                if (data.opponentIncremented) {
                    guestAnimationPromises.push(this.showDoomClockIncrement('opponent', this.opponentDoomCounters));
                }
            }
            
            // Wait for all guest animations to complete
            await Promise.all(guestAnimationPromises);
        }
    }

    async handleGuestDoomClockTriggered(data) {
        if (!data) return;
        
        // Update counter states
        this.playerDoomCounters = data.playerCountersReset || 0;
        this.opponentDoomCounters = data.opponentCountersReset || 0;
        
        if (window.battleManager) {
            window.battleManager.addCombatLog('💀⏰ The Doom Clock strikes 12!', 'error');
            
            // Show the doom message overlay
            await this.showDoomClockMessage(window.battleManager);
            
            // Gray out heroes on guest side too
            this.grayOutAllHeroes(window.battleManager);
        }
    }

    // State management for persistence
    exportState() {
        return {
            isActive: this.isActive,
            playerDoomCounters: this.playerDoomCounters,
            opponentDoomCounters: this.opponentDoomCounters,
            roundsCompletedThisBattle: this.roundsCompletedThisBattle
        };
    }

    importState(state) {
        if (!state) return;
        
        this.isActive = state.isActive || false;
        this.playerDoomCounters = state.playerDoomCounters || 0;
        this.opponentDoomCounters = state.opponentCounters || 0;
        this.roundsCompletedThisBattle = state.roundsCompletedThisBattle || 0;
    }

    cleanup() {
        this.isActive = false;
        this.playerDoomCounters = 0;
        this.opponentDoomCounters = 0;
        this.roundsCompletedThisBattle = 0;
    }
}

// ===== COUNTER SYNCHRONIZATION FUNCTIONS =====

// Sync doom counters after battle ends
export function syncDoomCountersAfterBattle(battleManager) {
    if (!battleManager) return;
    
    // Get counter data from battle
    const playerDoomCounters = battleManager.playerAreaCard?.name === 'DoomClock' ? 
        (battleManager.playerAreaCard.doomCounters || 0) : 0;
    const opponentDoomCounters = battleManager.opponentAreaCard?.name === 'DoomClock' ? 
        (battleManager.opponentAreaCard.doomCounters || 0) : 0;
    
    // Send formation update with doom counter data
    if (battleManager.isAuthoritative && battleManager.gameDataSender) {
        // Send the opponent's doom counter data to guest
        if (window.heroSelection && window.heroSelection.sendFormationUpdate) {
            window.heroSelection.sendFormationUpdate();
        }
    }
}

// Handle doom counter sync on guest side
export function handleGuestDoomCounterSync(areaCardData, heroSelection) {
    if (!areaCardData || !heroSelection) return;
    
    // If this is opponent's doom clock data, update it
    if (areaCardData.name === 'DoomClock' && areaCardData.doomCounters !== undefined) {
        // Store opponent's area card with counters
        if (heroSelection.areaHandler) {
            heroSelection.areaHandler.opponentAreaCard = areaCardData;
        }
    }
}

// Update doom clock display in formation screen
export function updateDoomClockDisplayInFormation(heroSelection) {
    if (!heroSelection) return;
    
    // Update area display to show current counters
    if (heroSelection.areaHandler && typeof heroSelection.areaHandler.updateAreaDisplay === 'function') {
        heroSelection.areaHandler.updateAreaDisplay();
    }
}

// Restore doom counters from saved data during reconnection
export function restoreDoomCountersFromSavedData(heroSelection, playerAreaCard, opponentAreaCard) {
    if (!heroSelection || !heroSelection.areaHandler) return;
    
    let countersRestored = false;
    
    // Restore player's doom counters
    if (playerAreaCard && playerAreaCard.name === 'DoomClock' && playerAreaCard.doomCounters > 0) {
        heroSelection.areaHandler.setAreaCard(playerAreaCard);
        countersRestored = true;
    }
    
    // Restore opponent's doom counters
    if (opponentAreaCard && opponentAreaCard.name === 'DoomClock' && opponentAreaCard.doomCounters > 0) {
        heroSelection.areaHandler.opponentAreaCard = opponentAreaCard;
        countersRestored = true;
    }
    
    // Update display if any counters were restored
    if (countersRestored) {
        setTimeout(() => {
            updateDoomClockDisplayInFormation(heroSelection);
        }, 200);
    }
}

// ===== EXISTING UTILITY FUNCTIONS =====

// Reset DoomClock counters to 0 if they are >= 12 (prevents carry-over from previous battles)
export function resetDoomClockCountersIfNeeded(areaCard) {
    if (areaCard && areaCard.name === 'DoomClock' && areaCard.doomCounters >= 12) {
        areaCard.doomCounters = 0;
        return true; // Indicate that a reset occurred
    }
    return false;
}

// Utility functions for area handler integration
export function initializeDoomClockArea(areaCard) {
    if (areaCard && areaCard.name === 'DoomClock') {
        areaCard.doomCounters = areaCard.doomCounters || 0;
    }
    return areaCard;
}

export function incrementDoomClockCounters(areaCard) {
    if (areaCard && areaCard.name === 'DoomClock') {
        areaCard.doomCounters = (areaCard.doomCounters || 0) + 1;
        return true;
    }
    return false;
}

export function getDoomClockCounters(areaCard) {
    if (areaCard && areaCard.name === 'DoomClock') {
        return areaCard.doomCounters || 0;
    }
    return 0;
}

// Battle manager integration functions
export async function applyDoomClockBattleEffects(battleManager) {
    if (!battleManager.doomClockEffect) {
        battleManager.doomClockEffect = new DoomClockEffect();
    }
    
    battleManager.doomClockEffect.initializeDoomClock(battleManager);
}

export async function processDoomClockRoundCompletion(battleManager) {
    if (!battleManager.doomClockEffect) return false;
    
    return await battleManager.doomClockEffect.processRoundCompletion(battleManager);
}

// Guest handler functions
export function handleGuestDoomClockStart(data, battleManager) {
    if (!battleManager.doomClockEffect) {
        battleManager.doomClockEffect = new DoomClockEffect();
    }
    
    battleManager.doomClockEffect.handleGuestDoomClockStart(data);
}

export function handleGuestDoomClockIncrement(data, battleManager) {
    if (!battleManager.doomClockEffect) {
        battleManager.doomClockEffect = new DoomClockEffect();
    }
    
    battleManager.doomClockEffect.handleGuestDoomClockIncrement(data);
}

export async function handleGuestDoomClockTriggered(data, battleManager) {
    if (!battleManager.doomClockEffect) {
        battleManager.doomClockEffect = new DoomClockEffect();
    }
    
    return await battleManager.doomClockEffect.handleGuestDoomClockTriggered(data);
}

// Initialize DoomClock counter display system (similar to GatheringStorm)
export function initializeDoomClockSystem() {
    if (!window.heroSelection) {
        console.warn('DoomClock: Hero selection not available, deferring initialization');
        setTimeout(() => initializeDoomClockSystem(), 1000);
        return;
    }

    // Check if already initialized to prevent double-wrapping
    if (window.heroSelection.returnToFormationScreenAfterBattle._doomClockWrapped) {
        return;
    }

    // Store original returnToFormationScreenAfterBattle method
    const originalReturn = window.heroSelection.returnToFormationScreenAfterBattle;
    
    // Wrap it with DoomClock counter processing
    window.heroSelection.returnToFormationScreenAfterBattle = async function() {
        // Call original method first
        await originalReturn.call(this);
        
        // Add a short delay to ensure UI is ready, then process display update
        setTimeout(async () => {
            await processDoomClockDisplayUpdate(this);
        }, 500);
    };

    // Mark as wrapped to prevent double-wrapping
    window.heroSelection.returnToFormationScreenAfterBattle._doomClockWrapped = true;
}

async function processDoomClockDisplayUpdate(heroSelection) {
    if (!heroSelection || !heroSelection.areaHandler) return false;
    
    const currentArea = heroSelection.areaHandler.getAreaCard();
    
    if (currentArea && currentArea.name === 'DoomClock') {        
        // Update area display to show current counter state
        if (heroSelection.areaHandler.updateAreaDisplay) {
            heroSelection.areaHandler.updateAreaDisplay();
        }
        
        return true;
    }
    
    return false;
}

export default DoomClockEffect;