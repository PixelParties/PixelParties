// Heroes/ingo.js - Ingo Hero Effect Manager
// Ingo's Merchant Effect: Whenever a Creature is summoned, gain 2 Gold
// Works both in formation screen and during battle

export class IngoEffectManager {
    constructor() {
        // Track gold earned from Ingo's effect during current battle PER SIDE
        this.battleGoldEarned = {
            player: 0,
            opponent: 0
        };
        
        // Track total creature summons for this battle (for display) PER SIDE
        this.battleCreatureSummons = {
            player: 0,
            opponent: 0
        };
        
        // Reference to battle manager (set during battle init)
        this.battleManager = null;
        
        // Reference to hero selection (set during formation init)
        this.heroSelection = null;
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    
    /**
     * Initialize for battle mode
     */
    initForBattle(battleManager) {
        this.battleManager = battleManager;
        this.battleGoldEarned = {
            player: 0,
            opponent: 0
        };
        this.battleCreatureSummons = {
            player: 0,
            opponent: 0
        };
    }
    
    /**
     * Initialize for formation screen
     */
    initForFormation(heroSelection) {
        this.heroSelection = heroSelection;
    }

    // ============================================
    // FORMATION SCREEN EFFECTS
    // ============================================
    
    /**
     * Check if player has Ingo in their formation
     * @param {Object} formationManager - The formation manager instance
     * @returns {Object|null} Ingo hero object if found, null otherwise
     */
    findIngoInFormation(formationManager) {
        if (!formationManager) return null;
        
        const formation = formationManager.getBattleFormation();
        if (!formation) return null;
        
        for (const position of ['left', 'center', 'right']) {
            const hero = formation[position];
            if (hero && hero.name === 'Ingo') {
                return { hero, position };
            }
        }
        
        return null;
    }
    
    /**
     * Trigger Ingo effect on formation screen (immediate gold award)
     * @param {Object} formationManager - Formation manager
     * @param {Object} goldManager - Gold manager
     * @returns {boolean} True if effect triggered
     */
    async triggerFormationEffect(formationManager, goldManager) {
        const ingoData = this.findIngoInFormation(formationManager);
        if (!ingoData) return false;
        
        try {
            // Award 2 gold immediately
            if (goldManager) {
                goldManager.addPlayerGold(2, 'ingo_creature_summon');
            }
            
            // Update gold display
            if (this.heroSelection) {
                this.heroSelection.updateGoldDisplay();
            }
            
            // Show visual feedback
            this.showFormationGoldEffect(ingoData.position);
            
            return true;
        } catch (error) {
            console.error('Error triggering Ingo formation effect:', error);
            return false;
        }
    }
    
    /**
     * Show visual feedback on formation screen
     * @param {string} heroPosition - Position of Ingo (left/center/right)
     */
    showFormationGoldEffect(heroPosition) {
        const heroElement = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!heroElement) return;
        
        // Create floating gold notification
        const goldEffect = document.createElement('div');
        goldEffect.className = 'ingo-formation-gold-effect';
        goldEffect.innerHTML = `
            <div class="ingo-gold-content">
                <span class="ingo-gold-amount">+2</span>
                <span class="ingo-gold-icon">💰</span>
            </div>
        `;
        
        goldEffect.style.cssText = `
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            pointer-events: none;
            animation: ingoGoldFloat 2s ease-out forwards;
        `;
        
        heroElement.style.position = 'relative';
        heroElement.appendChild(goldEffect);
        
        // Remove after animation
        setTimeout(() => {
            if (goldEffect.parentNode) {
                goldEffect.remove();
            }
        }, 2000);
        
        // Add brief glow to hero
        const heroCard = heroElement.querySelector('.character-card, .hero-card');
        if (heroCard) {
            heroCard.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            heroCard.style.transition = 'box-shadow 0.3s ease';
            
            setTimeout(() => {
                heroCard.style.boxShadow = '';
            }, 800);
        }
    }

    // ============================================
    // BATTLE EFFECTS
    // ============================================
    
    /**
     * Find Ingo in battle formation
     * @param {string} side - 'player' or 'opponent'
     * @returns {Object|null} Ingo hero data if found
     */
    findIngoInBattle(side) {
        if (!this.battleManager) return null;
        
        const heroes = side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        if (!heroes) return null;
        
        for (const position of ['left', 'center', 'right']) {
            const hero = heroes[position];
            if (hero && hero.name === 'Ingo' && hero.alive) {
                return { hero, position, side };
            }
        }
        
        return null;
    }
    
    /**
     * Trigger Ingo effect during battle (track gold, show visual)
     * @param {string} side - Which side summoned the creature
     * @param {Object} creature - The creature that was summoned
     * @returns {boolean} True if effect triggered
     */
    async triggerBattleEffect(side, creature) {
        if (!this.battleManager) return false;
        
        // Only host handles game logic
        if (!this.battleManager.isAuthoritative) return false;
        
        const ingoData = this.findIngoInBattle(side);
        if (!ingoData) return false;
        
        try {
            // Increment battle counters FOR THIS SIDE
            this.battleGoldEarned[side] += 2;
            this.battleCreatureSummons[side] += 1;
            
            console.log(`💰 Ingo (${side}) earned 2 gold from summoning ${creature.name || 'creature'}! Total: ${this.battleGoldEarned[side]}`);
            
            // Show visual feedback
            this.showBattleGoldEffect(ingoData.side, ingoData.position);
            
            // Stream to guest if in multiplayer
            this.streamBattleEffectToGuest(side, creature.name || 'creature');
            
            // Save checkpoint to persist the gold
            if (this.battleManager.checkpointSystem) {
                await this.battleManager.checkpointSystem.saveCheckpoint('ingo_creature_summon');
            }
            
            return true;
        } catch (error) {
            console.error('Error triggering Ingo battle effect:', error);
            return false;
        }
    }
    
    /**
     * Show visual feedback during battle
     * @param {string} side - Hero side
     * @param {string} position - Hero position
     */
    showBattleGoldEffect(side, position) {
        if (!this.battleManager) return;
        
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;
        
        // Ensure CSS exists
        this.ensureIngoEffectCSS();
        
        // Create floating gold notification
        const goldEffect = document.createElement('div');
        goldEffect.className = 'ingo-battle-gold-effect';
        goldEffect.innerHTML = `
            <div class="ingo-gold-content">
                <span class="ingo-gold-amount">+2</span>
                <span class="ingo-gold-icon">💰</span>
            </div>
        `;
        
        goldEffect.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            pointer-events: none;
            animation: ingoGoldFloat 2s ease-out forwards;
            font-weight: bold;
            font-size: 16px;
        `;
        
        heroElement.style.position = 'relative';
        heroElement.appendChild(goldEffect);
        
        // Remove after animation
        setTimeout(() => {
            if (goldEffect.parentNode) {
                goldEffect.remove();
            }
        }, 2000);
        
        // Add brief golden glow to hero card
        const heroCard = heroElement.querySelector('.battle-hero-card, .hero-card');
        if (heroCard) {
            heroCard.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            heroCard.style.transition = 'box-shadow 0.3s ease';
            
            setTimeout(() => {
                heroCard.style.boxShadow = '';
            }, 800);
        }
    }
    
    /**
     * Stream Ingo effect to guest player
     * @param {string} side - Which side summoned the creature
     * @param {string} creatureName - Name of summoned creature
     */
    streamBattleEffectToGuest(side, creatureName) {
        if (!this.battleManager || this.battleManager.isSinglePlayer) return;
        
        // Convert side to absolute side for network transmission
        const absoluteSide = side === 'player' ? 
            (this.battleManager.isHost ? 'host' : 'guest') : 
            (this.battleManager.isHost ? 'guest' : 'host');
        
        this.battleManager.sendBattleUpdate('ingo_creature_gold', {
            absoluteSide: absoluteSide,
            creatureName: creatureName,
            goldAmount: 2,
            totalGold: this.battleGoldEarned,
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle guest receiving Ingo effect from host
     * @param {Object} data - Effect data from host
     */
    handleGuestIngoEffect(data) {
        if (!this.battleManager || this.battleManager.isAuthoritative) {
            console.warn('Only guest should receive Ingo effect messages');
            return;
        }
        
        const { absoluteSide, creatureName, goldAmount, totalGold } = data;
        
        // Update counters to match host
        this.battleGoldEarned = totalGold || this.battleGoldEarned + goldAmount;
        this.battleCreatureSummons += 1;
        
        // Determine local side for guest
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find Ingo on the correct side
        const ingoData = this.findIngoInBattle(localSide);
        if (ingoData) {
            // Show visual feedback
            this.showBattleGoldEffect(ingoData.side, ingoData.position);
        }
        
        console.log(`💰 [Guest] Ingo earned ${goldAmount} gold from ${creatureName}! Total: ${this.battleGoldEarned}`);
    }

    // ============================================
    // BATTLE END CALCULATION
    // ============================================
    
    /**
     * Calculate Ingo bonuses for all heroes in formation (called at battle end)
     * @param {Object} formation - Hero formation
     * @param {string} side - 'player' or 'opponent'
     * @returns {Object} Bonus data
     */
    calculateFormationIngoBonus(formation, side) {
        const bonusData = {
            totalBonus: 0,
            details: []
        };
        
        // Only award bonus if Ingo is in formation and creatures were summoned
        const hasIngo = Object.values(formation).some(hero => 
            hero && hero.name === 'Ingo'
        );
        
        if (!hasIngo || this.battleGoldEarned === 0) {
            return bonusData;
        }
        
        bonusData.totalBonus = this.battleGoldEarned;
        bonusData.details.push({
            heroName: 'Ingo',
            creatureSummons: this.battleCreatureSummons,
            goldPerSummon: 2,
            goldBonus: this.battleGoldEarned
        });
        
        console.log(`💰 Ingo battle bonus: ${this.battleGoldEarned} gold (${this.battleCreatureSummons} creatures summoned)`);
        
        return bonusData;
    }
    
    /**
     * Generate HTML for Ingo bonus display in gold breakdown
     * @param {Object} bonusData - Bonus data from calculateFormationIngoBonus
     * @returns {string} HTML string
     */
    generateIngoBonusHTML(bonusData) {
        if (!bonusData || bonusData.totalBonus <= 0) {
            return '';
        }
        
        const detail = bonusData.details[0]; // Only one Ingo
        
        return `
            <div class="ingo-bonus-section">
                <div class="bonus-header">
                    <span class="bonus-icon">🏪</span>
                    <span class="bonus-title">Ingo's Merchant Network</span>
                    <span class="bonus-amount">+${bonusData.totalBonus} Gold</span>
                </div>
                <div class="bonus-details">
                    <div class="bonus-detail-item">
                        <span class="detail-label">Creatures Summoned:</span>
                        <span class="detail-value">${detail.creatureSummons}</span>
                    </div>
                    <div class="bonus-detail-item">
                        <span class="detail-label">Gold per Summon:</span>
                        <span class="detail-value">+2 💰</span>
                    </div>
                    <div class="bonus-total">
                        <span class="total-label">Total Bonus:</span>
                        <span class="total-value">${detail.goldBonus} Gold</span>
                    </div>
                </div>
                <div class="bonus-description">
                    💡 Ingo earns gold whenever creatures are summoned to the battlefield
                </div>
            </div>
        `;
    }
    
    /**
     * Get Ingo bonus styles for rewards screen
     * @returns {string} CSS string
     */
    getIngoBonusStyles() {
        return `
            .ingo-bonus-section {
                background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                border-radius: 12px;
                padding: 16px;
                margin: 12px 0;
                box-shadow: 0 4px 12px rgba(255, 165, 0, 0.3);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            .ingo-bonus-section .bonus-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            .ingo-bonus-section .bonus-icon {
                font-size: 24px;
            }
            
            .ingo-bonus-section .bonus-title {
                flex: 1;
                font-weight: bold;
                font-size: 16px;
                color: #333;
            }
            
            .ingo-bonus-section .bonus-amount {
                font-weight: bold;
                font-size: 18px;
                color: #2c5f2d;
                background: rgba(255, 255, 255, 0.7);
                padding: 4px 12px;
                border-radius: 8px;
            }
            
            .ingo-bonus-section .bonus-details {
                margin: 10px 0;
                background: rgba(255, 255, 255, 0.4);
                padding: 10px;
                border-radius: 8px;
            }
            
            .ingo-bonus-section .bonus-detail-item {
                display: flex;
                justify-content: space-between;
                margin: 6px 0;
                color: #333;
                font-size: 14px;
            }
            
            .ingo-bonus-section .detail-label {
                font-weight: normal;
            }
            
            .ingo-bonus-section .detail-value {
                font-weight: bold;
            }
            
            .ingo-bonus-section .bonus-total {
                display: flex;
                justify-content: space-between;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 2px solid rgba(255, 255, 255, 0.5);
                font-size: 15px;
                font-weight: bold;
                color: #2c5f2d;
            }
            
            .ingo-bonus-section .bonus-description {
                margin-top: 10px;
                padding: 8px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 6px;
                font-size: 12px;
                color: #555;
                font-style: italic;
            }
        `;
    }

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    
    /**
     * Export state for checkpoint system
     * @returns {Object} Current state
     */
    exportState() {
        return {
            battleGoldEarned: this.battleGoldEarned,
            battleCreatureSummons: this.battleCreatureSummons,
            timestamp: Date.now()
        };
    }
    
    /**
     * Import state from checkpoint
     * @param {Object} state - Saved state
     * @returns {boolean} Success status
     */
    importState(state) {
        if (!state || typeof state !== 'object') {
            return false;
        }
        
        // Handle both old (number) and new (object) formats
        if (typeof state.battleGoldEarned === 'number') {
            // Old format: convert to new format (assume it was player's gold)
            this.battleGoldEarned = {
                player: state.battleGoldEarned || 0,
                opponent: 0
            };
        } else if (typeof state.battleGoldEarned === 'object') {
            // New format: use directly
            this.battleGoldEarned = {
                player: state.battleGoldEarned.player || 0,
                opponent: state.battleGoldEarned.opponent || 0
            };
        }
        
        // Handle summons count similarly
        if (typeof state.battleCreatureSummons === 'number') {
            this.battleCreatureSummons = {
                player: state.battleCreatureSummons || 0,
                opponent: 0
            };
        } else if (typeof state.battleCreatureSummons === 'object') {
            this.battleCreatureSummons = {
                player: state.battleCreatureSummons.player || 0,
                opponent: state.battleCreatureSummons.opponent || 0
            };
        }
        
        return true;
    }
    
    /**
     * Get current state for debugging
     * @returns {Object} Current state
     */
    getState() {
        return {
            battleGoldEarned: this.battleGoldEarned,
            battleCreatureSummons: this.battleCreatureSummons,
            battleManagerConnected: !!this.battleManager,
            heroSelectionConnected: !!this.heroSelection
        };
    }
    
    /**
     * Reset all state
     */
    reset() {
        this.battleGoldEarned = {
            player: 0,
            opponent: 0
        };
        this.battleCreatureSummons = {
            player: 0,
            opponent: 0
        };
        this.battleManager = null;
        this.heroSelection = null;
    }
    
    /**
     * Reset for new battle (keep references)
     */
    resetForNewBattle() {
        this.battleGoldEarned = {
            player: 0,
            opponent: 0
        };
        this.battleCreatureSummons = {
            player: 0,
            opponent: 0
        };
    }

    // ============================================
    // CSS INJECTION
    // ============================================
    
    /**
     * Ensure CSS styles are injected
     */
    ensureIngoEffectCSS() {
        if (document.getElementById('ingoEffectStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'ingoEffectStyles';
        style.textContent = `
            @keyframes ingoGoldFloat {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(0) scale(0.5);
                }
                10% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(-10px) scale(1.1);
                }
                50% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(-30px) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-50px) scale(0.8);
                }
            }
            
            .ingo-formation-gold-effect,
            .ingo-battle-gold-effect {
                user-select: none;
            }
            
            .ingo-gold-content {
                display: flex;
                align-items: center;
                gap: 4px;
                background: linear-gradient(135deg, #FFD700, #FFA500);
                color: #333;
                padding: 6px 12px;
                border-radius: 12px;
                font-weight: bold;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                border: 2px solid rgba(255, 255, 255, 0.5);
            }
            
            .ingo-gold-amount {
                font-size: 16px;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .ingo-gold-icon {
                font-size: 18px;
                animation: ingoGoldSpin 1.5s ease-in-out infinite;
            }
            
            @keyframes ingoGoldSpin {
                0%, 100% {
                    transform: rotate(0deg) scale(1);
                }
                25% {
                    transform: rotate(-10deg) scale(1.1);
                }
                50% {
                    transform: rotate(10deg) scale(1.2);
                }
                75% {
                    transform: rotate(-5deg) scale(1.1);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize CSS when module loads
if (typeof document !== 'undefined') {
    const manager = new IngoEffectManager();
    manager.ensureIngoEffectCSS();
}

// Default export
export default IngoEffectManager;