// Heroes/kazena.js - Kazena Hero Effect System
export class KazenaEffect {
    constructor() {
        this.battleManager = null;
        this.initialized = false;
        this.windAnimationCSS = null;
    }

    init(battleManager) {
        this.battleManager = battleManager;
        this.initialized = true;
        this.ensureWindAnimationCSS();
    }

    // Add counters to all Kazena heroes when any swap occurs
    async onHeroSwap(swapData) {
        if (!this.initialized || !this.battleManager) return;

        // Find all Kazena heroes on both sides
        const kazenaHeroes = this.getAllKazenaHeroes();
        
        if (kazenaHeroes.length === 0) return;

        // Filter out Kazena heroes whose effects should be negated
        const activeKazenaHeroes = kazenaHeroes.filter(kazenaData => {
            return this.isKazenaEffectActive(kazenaData.hero);
        });

        // Log negated Kazenas for debugging
        const negatedKazenas = kazenaHeroes.filter(kazenaData => {
            return !this.isKazenaEffectActive(kazenaData.hero);
        });

        if (negatedKazenas.length > 0) {
            negatedKazenas.forEach(kazenaData => {
                const reasons = this.getKazenaNegationReasons(kazenaData.hero);
                this.battleManager.addCombatLog(
                    `🌪️💫 ${kazenaData.hero.name}'s wind magic is negated (${reasons.join(', ')})`,
                    'info'
                );
            });
        }

        if (activeKazenaHeroes.length === 0) {
            if (negatedKazenas.length > 0) {
                this.battleManager.addCombatLog(
                    `🌪️ The winds are still... all Kazena effects are negated`,
                    'info'
                );
            }
            return;
        }

        // Add 1 counter to each active Kazena hero
        activeKazenaHeroes.forEach(kazenaData => {
            this.addKazenaCounter(kazenaData.hero, kazenaData.side, kazenaData.position);
        });

        // Show wind animation on active Kazenas only
        await this.showWindAnimationOnKazenas(activeKazenaHeroes);

        // Log the effect
        const totalKazenas = kazenaHeroes.length;
        const activeCount = activeKazenaHeroes.length;
        const negatedCount = totalKazenas - activeCount;

        if (negatedCount > 0) {
            this.battleManager.addCombatLog(
                `🌪️ Kazena senses the winds of change! +${activeCount} counter(s) added (${negatedCount} negated).`,
                'info'
            );
        } else {
            this.battleManager.addCombatLog(
                `🌪️ Kazena senses the winds of change! +${activeCount} counter(s) added.`,
                'info'
            );
        }
    }

    /**
     * Check if Kazena's effect should be active (not negated)
     * @param {Object} kazenaHero - The Kazena hero to check
     * @returns {boolean} - True if effect should be active, false if negated
     */
    isKazenaEffectActive(kazenaHero) {
        // Check if hero is dead
        if (!kazenaHero.alive) {
            return false;
        }

        // Check for negating status effects using the battleManager's status effects manager
        if (this.battleManager && this.battleManager.statusEffectsManager) {
            const statusManager = this.battleManager.statusEffectsManager;
            
            // Check for frozen status
            if (statusManager.hasStatusEffect(kazenaHero, 'frozen')) {
                return false;
            }
            
            // Check for stunned status
            if (statusManager.hasStatusEffect(kazenaHero, 'stunned')) {
                return false;
            }
            
            // Check for dazed status
            if (statusManager.hasStatusEffect(kazenaHero, 'dazed')) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get reasons why Kazena's effect is negated (for logging)
     * @param {Object} kazenaHero - The Kazena hero to check
     * @returns {Array} - Array of negation reasons
     */
    getKazenaNegationReasons(kazenaHero) {
        const reasons = [];

        // Check if hero is dead
        if (!kazenaHero.alive) {
            reasons.push('dead');
        }

        // Check for status effects
        if (this.battleManager && this.battleManager.statusEffectsManager) {
            const statusManager = this.battleManager.statusEffectsManager;
            
            if (statusManager.hasStatusEffect(kazenaHero, 'frozen')) {
                const stacks = statusManager.getStatusEffectStacks(kazenaHero, 'frozen');
                reasons.push(`frozen (${stacks})`);
            }
            
            if (statusManager.hasStatusEffect(kazenaHero, 'stunned')) {
                const stacks = statusManager.getStatusEffectStacks(kazenaHero, 'stunned');
                reasons.push(`stunned (${stacks})`);
            }
            
            if (statusManager.hasStatusEffect(kazenaHero, 'dazed')) {
                const stacks = statusManager.getStatusEffectStacks(kazenaHero, 'dazed');
                reasons.push(`dazed (${stacks})`);
            }
        }

        return reasons.length > 0 ? reasons : ['unknown'];
    }

    getAllKazenaHeroes() {
        const kazenaHeroes = [];
        
        // Check player heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.battleManager.playerHeroes[position];
            if (hero && hero.name === 'Kazena') {
                kazenaHeroes.push({ hero, side: 'player', position });
            }
        });

        // Check opponent heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.battleManager.opponentHeroes[position];
            if (hero && hero.name === 'Kazena') {
                kazenaHeroes.push({ hero, side: 'opponent', position });
            }
        });

        return kazenaHeroes;
    }

    addKazenaCounter(hero, side, position) {
        // Initialize counter if it doesn't exist
        if (hero.kazenaCounters === undefined) {
            hero.kazenaCounters = 0;
        }
        
        hero.kazenaCounters++;
        
        // Update visual display
        this.updateKazenaCounterDisplay(side, position, hero.kazenaCounters);
    }

    updateKazenaCounterDisplay(side, position, counterCount) {
        const heroSlot = document.querySelector(`.${side}-slot.${position}-slot`);
        if (!heroSlot) return;

        // Remove existing counter display
        const existingCounter = heroSlot.querySelector('.kazena-counter-display');
        if (existingCounter) {
            existingCounter.remove();
        }

        // Add new counter display
        const counterDisplay = document.createElement('div');
        counterDisplay.className = 'kazena-counter-display';
        counterDisplay.innerHTML = `
            <div class="kazena-counter-badge">
                <span class="kazena-counter-icon">🌪️</span>
                <span class="kazena-counter-number">${counterCount}</span>
            </div>
        `;
        
        heroSlot.appendChild(counterDisplay);
    }

    async showWindAnimationOnKazenas(kazenaHeroes) {
        const animationPromises = kazenaHeroes.map(async (kazenaData) => {
            const heroSlot = document.querySelector(`.${kazenaData.side}-slot.${kazenaData.position}-slot`);
            if (!heroSlot) return;

            // Create wind swirl effect
            const windEffect = document.createElement('div');
            windEffect.className = 'kazena-wind-swirl';
            windEffect.innerHTML = '🌪️💨🌀💨🌪️';
            
            heroSlot.appendChild(windEffect);
            
            // Remove after animation
            setTimeout(() => {
                if (windEffect.parentNode) {
                    windEffect.remove();
                }
            }, 2000);
        });

        await Promise.all(animationPromises);
    }

    // Calculate bonus cards for reward screen
    calculateKazenaBonusCards(heroSelection) {
        if (!heroSelection || !heroSelection.formationManager) {
            return 0;
        }

        const formation = heroSelection.formationManager.getBattleFormation();
        
        let totalBonusCards = 0;

        ['left', 'center', 'right'].forEach(position => {
            const hero = formation[position];
            
            if (hero && hero.name === 'Kazena') {
                const counters = hero.kazenaCounters || 0;
                const bonusCards = Math.floor(counters / 3) + 1;
                totalBonusCards += bonusCards;
            }
        });

        return totalBonusCards;
    }

    transferCountersToFormation(battleManager) {
        if (!battleManager) {
            return;
        }
        
        // Try multiple paths to get heroSelection
        let heroSelection = null;
        let formation = null;
        
        // Path 1: Via battleScreen.heroSelection
        if (battleManager.battleScreen && battleManager.battleScreen.heroSelection) {
            heroSelection = battleManager.battleScreen.heroSelection;
            formation = heroSelection.formationManager.getBattleFormation();
        }
        // Path 2: Via global window.heroSelection
        else if (typeof window !== 'undefined' && window.heroSelection) {
            heroSelection = window.heroSelection;
            formation = heroSelection.formationManager.getBattleFormation();
        }
        // Path 3: Via battleManager's stored formation data (direct approach)
        else if (battleManager.playerFormation) {
            formation = battleManager.playerFormation;
        }
        
        if (!formation) {
            return;
        }
        
        ['left', 'center', 'right'].forEach(position => {
            const battleHero = battleManager.playerHeroes[position];
            const formationHero = formation[position];
            
            if (battleHero && formationHero && 
                battleHero.name === 'Kazena' && 
                battleHero.kazenaCounters !== undefined) {
                
                // Ensure the property exists on the formation hero
                formationHero.kazenaCounters = battleHero.kazenaCounters;
                
                // ADDITIONAL: Also update the heroSelection's formation if we have it
                if (heroSelection && heroSelection.formationManager) {
                    try {
                        // Update the formation manager's battle formation directly
                        const battleFormation = heroSelection.formationManager.getBattleFormation();
                        if (battleFormation && battleFormation[position]) {
                            battleFormation[position].kazenaCounters = battleHero.kazenaCounters;
                        }
                        
                        // Force save the formation state
                        if (heroSelection.formationManager.saveBattleFormation) {
                            heroSelection.formationManager.saveBattleFormation();
                        }
                    } catch (error) {
                        // Silent error handling
                    }
                }
            }
        });
        
        // ADDITIONAL: If we used window.heroSelection, trigger a save
        if (heroSelection && heroSelection.saveGameState) {
            try {
                heroSelection.saveGameState();
            } catch (error) {
                // Silent error handling
            }
        }
    }

    // Clear all Kazena counters after rewards
    clearAllKazenaCounters(heroSelection) {
        if (!heroSelection || !heroSelection.formationManager) {
            return;
        }

        const formation = heroSelection.formationManager.getBattleFormation();
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = formation[position];
            if (hero && hero.name === 'Kazena' && hero.kazenaCounters) {
                hero.kazenaCounters = 0;
                
                // Remove visual counter display
                const heroSlot = document.querySelector(`.player-formation .${position}-slot`);
                if (heroSlot) {
                    const counterDisplay = heroSlot.querySelector('.kazena-counter-display');
                    if (counterDisplay) {
                        counterDisplay.remove();
                    }
                }
            }
        });
    }

    // Export state for persistence
    exportKazenaState() {
        if (!this.battleManager) return {};

        const state = {
            playerKazenaCounters: {},
            opponentKazenaCounters: {}
        };

        ['left', 'center', 'right'].forEach(position => {
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero && playerHero.name === 'Kazena' && playerHero.kazenaCounters) {
                state.playerKazenaCounters[position] = playerHero.kazenaCounters;
            }

            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero && opponentHero.name === 'Kazena' && opponentHero.kazenaCounters) {
                state.opponentKazenaCounters[position] = opponentHero.kazenaCounters;
            }
        });

        return state;
    }

    // Import state for persistence
    importKazenaState(state) {
        if (!state || !this.battleManager) return;

        // Restore player Kazena counters
        if (state.playerKazenaCounters) {
            Object.entries(state.playerKazenaCounters).forEach(([position, count]) => {
                const hero = this.battleManager.playerHeroes[position];
                if (hero && hero.name === 'Kazena') {
                    hero.kazenaCounters = count;
                    this.updateKazenaCounterDisplay('player', position, count);
                }
            });
        }

        // Restore opponent Kazena counters
        if (state.opponentKazenaCounters) {
            Object.entries(state.opponentKazenaCounters).forEach(([position, count]) => {
                const hero = this.battleManager.opponentHeroes[position];
                if (hero && hero.name === 'Kazena') {
                    hero.kazenaCounters = count;
                    this.updateKazenaCounterDisplay('opponent', position, count);
                }
            });
        }
    }

    ensureWindAnimationCSS() {
        if (this.windAnimationCSS || document.getElementById('kazenaWindStyles')) return;

        const style = document.createElement('style');
        style.id = 'kazenaWindStyles';
        style.textContent = `
            .kazena-counter-display {
                position: absolute;
                top: 5px;
                right: 5px;
                z-index: 100;
                pointer-events: none;
            }

            .kazena-counter-badge {
                background: linear-gradient(135deg, #87CEEB 0%, #4169E1 100%);
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.8);
                border-radius: 20px;
                padding: 4px 8px;
                font-size: 12px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 3px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                animation: kazenaPulse 2s ease-in-out infinite;
            }

            .kazena-counter-icon {
                font-size: 10px;
                animation: kazenaWindSpin 3s linear infinite;
            }

            .kazena-wind-swirl {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 20px;
                pointer-events: none;
                z-index: 200;
                animation: kazenaWindSwirl 2s ease-out forwards;
            }

            @keyframes kazenaPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }

            @keyframes kazenaWindSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            @keyframes kazenaWindSwirl {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                }
                70% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(540deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8) rotate(720deg);
                }
            }
        `;

        document.head.appendChild(style);
        this.windAnimationCSS = style;
    }

    cleanup() {
        if (this.windAnimationCSS) {
            this.windAnimationCSS.remove();
            this.windAnimationCSS = null;
        }
        this.battleManager = null;
        this.initialized = false;
    }
}

// Create singleton instance
export const kazenaEffect = new KazenaEffect();