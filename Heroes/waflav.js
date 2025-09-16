// waflav.js - Enhanced Waflav Hero Evolution Effect Management System with Descension and Evolution Counter Rewards

export class WaflavEffectManager {
    constructor() {
        this.waflavStatBonus = {
            hp: 20,
            attack: 5
        };
        
        // Evolution counter rewards for descending from Waflav ascended forms
        this.waflavDescensionRewards = {
            'ThunderstruckWaflav': 3,
            'SwampborneWaflav': 3,
            'FlamebathedWaflav': 1,
            'StormkissedWaflav': 3,
            'DeepDrownedWaflav': 3
        };
        
        console.log('WaflavEffectManager initialized with descension support and evolution counter rewards');
    }

    // Check if Waflav evolution can be used (exact Waflav only)
    canUseWaflavEvolution(heroSelection, heroPosition) {
        if (!heroSelection || !heroSelection.playerCounters) {
            return {
                canUse: false,
                reason: 'invalid_game_state',
                message: 'Game state not available!'
            };
        }

        const formation = heroSelection.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        
        if (!hero) {
            return {
                canUse: false,
                reason: 'no_hero',
                message: 'No hero found at this position!'
            };
        }

        // Check if hero name is exactly "Waflav" (not just containing it)
        if (!WaflavEffectManager.isExactWaflavHero(hero.name)) {
            return {
                canUse: false,
                reason: 'wrong_hero',
                message: null // Silent failure - no error message
            };
        }

        // Check if player has evolution counters
        const evolutionCounters = heroSelection.playerCounters.evolutionCounters || 0;
        if (evolutionCounters <= 0) {
            return {
                canUse: false,
                reason: 'no_counters',
                message: 'No Evolution Counters to spend!'
            };
        }

        return {
            canUse: true,
            reason: null,
            message: null
        };
    }

    // ============================================
    // DESCENSION FUNCTIONALITY WITH EVOLUTION COUNTER REWARDS
    // ============================================

    // Check if Waflav descension can be used (Waflav variants only)
    canUseWaflavDescension(heroSelection, heroPosition) {
        if (!heroSelection) {
            return {
                canUse: false,
                reason: 'invalid_game_state',
                message: 'Game state not available!'
            };
        }

        const formation = heroSelection.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        
        if (!hero) {
            return {
                canUse: false,
                reason: 'no_hero',
                message: 'No hero found at this position!'
            };
        }

        // Check if hero name includes "Waflav" but is NOT exactly "Waflav"
        if (!this.isWaflavVariant(hero.name)) {
            return {
                canUse: false,
                reason: 'wrong_hero',
                message: null // Silent failure - no error message
            };
        }

        // Check if hero has ascension history to descend from
        if (!hero.ascendedStack || hero.ascendedStack.length === 0) {
            return {
                canUse: false,
                reason: 'no_ascension_history',
                message: 'This hero has no forms to descend to!'
            };
        }

        return {
            canUse: true,
            reason: null,
            message: null,
            heroName: hero.name
        };
    }

    // Check if a hero is a Waflav variant (includes "Waflav" but is not exactly "Waflav")
    isWaflavVariant(heroName) {
        return heroName && 
               typeof heroName === 'string' && 
               heroName.includes('Waflav') && 
               heroName !== 'Waflav';
    }

    // Perform Waflav descension with evolution counter rewards
    async performWaflavDescension(heroSelection, heroPosition) {
        if (!heroSelection) {
            return false;
        }

        // Double-check we can use the descension
        const canUse = this.canUseWaflavDescension(heroSelection, heroPosition);
        if (!canUse.canUse) {
            return false;
        }

        try {
            const formation = heroSelection.formationManager.getBattleFormation();
            const hero = formation[heroPosition];
            
            if (!hero || !hero.ascendedStack || hero.ascendedStack.length === 0) {
                console.error('Invalid hero or no ascension history for descension');
                return false;
            }

            // Get the current hero name (will be sent to graveyard)
            const currentHeroName = hero.name;
            
            // Check if we should award evolution counters for this descension
            let evolutionCountersAwarded = 0;
            if (this.waflavDescensionRewards[currentHeroName]) {
                evolutionCountersAwarded = this.waflavDescensionRewards[currentHeroName];
                
                // Award evolution counters to the player
                if (!heroSelection.playerCounters) {
                    heroSelection.playerCounters = {};
                }
                heroSelection.playerCounters.evolutionCounters = (heroSelection.playerCounters.evolutionCounters || 0) + evolutionCountersAwarded;
                
                console.log(`🧬 Awarded ${evolutionCountersAwarded} Evolution Counters for descending from ${currentHeroName}`);
            }
            
            // Get the newest (most recent) form from ascendedStack
            const newestForm = hero.ascendedStack[hero.ascendedStack.length - 1];
            
            // Create new ascended stack without the newest form
            const newAscendedStack = [...hero.ascendedStack];
            newAscendedStack.pop(); // Remove the newest form
            
            // Get card info for the form we're descending to
            const descendToInfo = heroSelection.getCardInfo(newestForm);
            if (!descendToInfo) {
                console.error('Could not find card info for descension target:', newestForm);
                return false;
            }

            // Transform the hero back to the newest form
            hero.name = newestForm;
            hero.image = descendToInfo.image;
            hero.ascendedStack = newAscendedStack;
            
            // Add the current (removed) hero form to graveyard
            if (heroSelection.graveyardManager) {
                heroSelection.graveyardManager.addCard(currentHeroName);
            }

            // Update the formation
            heroSelection.formationManager.updateHeroAtPosition(heroPosition, hero);
            
            // Update displays
            heroSelection.updateBattleFormationUI();
            heroSelection.refreshHeroStats();
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Send update to opponent
            await heroSelection.sendFormationUpdate();
            
            // Send network update about the descension (including evolution counter info)
            if (heroSelection.gameDataSender) {
                heroSelection.gameDataSender('waflav_descension_used', {
                    heroPosition: heroPosition,
                    fromHeroName: currentHeroName,
                    toHeroName: newestForm,
                    newAscendedStack: newAscendedStack,
                    evolutionCountersAwarded: evolutionCountersAwarded,
                    newEvolutionCounterTotal: heroSelection.playerCounters.evolutionCounters,
                    timestamp: Date.now()
                });
            }
            
            console.log(`🔄 Waflav descension: ${currentHeroName} descended to ${newestForm}${evolutionCountersAwarded > 0 ? ` (+${evolutionCountersAwarded} Evolution Counters)` : ''}`);
            return true;
            
        } catch (error) {
            console.error('Error performing Waflav descension:', error);
            return false;
        }
    }

    // Show Waflav descension dialog with evolution counter rewards preview
    showWaflavDescensionDialog(heroSelection, heroPosition) {
        const canUse = this.canUseWaflavDescension(heroSelection, heroPosition);

        if (!canUse.canUse) {
            // Only show error message if there is one
            if (canUse.message) {
                this.showWaflavDescensionError(canUse.message);
            }
            return;
        }

        const formation = heroSelection.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        const newestForm = hero.ascendedStack[hero.ascendedStack.length - 1];
        const formattedNewestForm = this.formatCardName(newestForm);
        
        // Check if this descension will award evolution counters
        const evolutionReward = this.waflavDescensionRewards[hero.name] || 0;
        const currentCounters = heroSelection.playerCounters?.evolutionCounters || 0;

        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.id = 'waflavDescensionDialog';
        overlay.className = 'waflav-descension-overlay';
        
        let rewardSection = '';
        if (evolutionReward > 0) {
            rewardSection = `
                <div class="descension-reward">
                    <span class="reward-icon">🧬</span>
                    <span>Gain ${evolutionReward} Evolution Counter${evolutionReward > 1 ? 's' : ''} (${currentCounters} → ${currentCounters + evolutionReward})</span>
                </div>
            `;
        }
        
        overlay.innerHTML = `
            <div class="waflav-dialog-container descension">
                <div class="waflav-dialog-content">
                    <div class="waflav-dialog-header">
                        <div class="waflav-icon">🔄</div>
                        <h3>Waflav Descension</h3>
                    </div>
                    <div class="waflav-dialog-body">
                        <p>Descend <span class="current-hero">${canUse.heroName}</span> back to <span class="target-hero">${formattedNewestForm}</span>?</p>
                        ${rewardSection}
                        <div class="descension-warning">
                            <span class="warning-icon">⚠️</span>
                            <span>${canUse.heroName} will be sent to the graveyard</span>
                        </div>
                    </div>
                    <div class="waflav-dialog-buttons">
                        <button class="waflav-btn waflav-btn-no" onclick="window.closeWaflavDescensionDialog()">
                            <span class="btn-icon">❌</span>
                            <span>No</span>
                        </button>
                        <button class="waflav-btn waflav-btn-yes" onclick="window.confirmWaflavDescension()">
                            <span class="btn-icon">🔄</span>
                            <span>Yes</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles if not already present
        this.ensureWaflavDialogStyles();
        this.ensureDescensionRewardStyles();

        // Prevent body scrolling
        document.body.classList.add('waflav-dialog-active');

        // Add to body
        document.body.appendChild(overlay);

        // Animate in
        overlay.style.animation = 'fadeIn 0.3s ease-out';

        // Store reference for the confirm handler
        overlay.dataset.heroPosition = heroPosition;

        // Set up global handlers
        window.closeWaflavDescensionDialog = () => {
            this.closeWaflavDescensionDialog();
        };

        window.confirmWaflavDescension = async () => {
            await this.confirmWaflavDescension(heroSelection, heroPosition);
        };

        // Handle Escape key
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                this.closeWaflavDescensionDialog();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        overlay.escapeHandler = handleEscape;
    }

    // Close Waflav descension dialog
    closeWaflavDescensionDialog() {
        const overlay = document.getElementById('waflavDescensionDialog');
        if (overlay) {
            // Remove escape handler
            if (overlay.escapeHandler) {
                document.removeEventListener('keydown', overlay.escapeHandler);
            }

            overlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                overlay.remove();
                document.body.classList.remove('waflav-dialog-active');
                
                // Clean up global handlers
                if (typeof window !== 'undefined') {
                    window.closeWaflavDescensionDialog = null;
                    window.confirmWaflavDescension = null;
                }
            }, 300);
        }
    }

    // Confirm Waflav descension
    async confirmWaflavDescension(heroSelection, heroPosition) {
        // Close dialog first
        this.closeWaflavDescensionDialog();
        
        // Perform the descension
        const success = await this.performWaflavDescension(heroSelection, heroPosition);
        
        if (success) {
            // Check if evolution counters were awarded and show appropriate success message
            const formation = heroSelection.formationManager.getBattleFormation();
            const hero = formation[heroPosition];
            const evolutionReward = this.waflavDescensionRewards[hero.name] || 0;
            
            if (evolutionReward > 0) {
                this.showWaflavDescensionSuccessWithCounters(evolutionReward, heroSelection.playerCounters.evolutionCounters);
            } else {
                this.showWaflavDescensionSuccess();
            }
        } else {
            this.showWaflavDescensionError('Descension failed!');
        }
    }

    // Show descension success message
    showWaflavDescensionSuccess() {
        const successDiv = document.createElement('div');
        successDiv.className = 'waflav-descension-success';
        successDiv.innerHTML = `
            <div class="success-content">
                <span class="success-icon">✅</span>
                <span class="success-text">Descension completed!</span>
            </div>
        `;
        
        successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(76, 175, 80, 0.95);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
            animation: waflavSuccessBounce 0.6s ease-out;
            text-align: center;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'waflavSuccessFade 0.3s ease-out forwards';
            setTimeout(() => successDiv.remove(), 300);
        }, 1500);
    }

    // Show descension success message with evolution counter rewards
    showWaflavDescensionSuccessWithCounters(countersAwarded, totalCounters) {
        const successDiv = document.createElement('div');
        successDiv.className = 'waflav-descension-success';
        successDiv.innerHTML = `
            <div class="success-content">
                <span class="success-icon">✅</span>
                <div class="success-details">
                    <span class="success-text">Descension completed!</span>
                    <div class="counter-reward">
                        <span class="counter-icon">🧬</span>
                        <span>+${countersAwarded} Evolution Counter${countersAwarded > 1 ? 's' : ''} (${totalCounters} total)</span>
                    </div>
                </div>
            </div>
        `;
        
        successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(76, 175, 80, 0.95);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
            animation: waflavSuccessBounce 0.6s ease-out;
            text-align: center;
            min-width: 280px;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'waflavSuccessFade 0.3s ease-out forwards';
            setTimeout(() => successDiv.remove(), 300);
        }, 2000); // Show longer to let player read the counter info
    }

    // Show descension error message
    showWaflavDescensionError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'waflav-descension-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
            </div>
        `;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(244, 67, 54, 0.4);
            animation: waflavErrorShake 0.5s ease-out;
            text-align: center;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'waflavErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 1000);
    }

    // ============================================
    // MAIN WAFLAV CLICK HANDLER
    // ============================================

    // Main handler for when any Waflav hero is clicked
    handleWaflavHeroClick(heroSelection, heroPosition) {
        const formation = heroSelection.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        
        if (!hero) {
            return false;
        }

        // Check if it's exactly "Waflav" - show evolution dialog
        if (WaflavEffectManager.isExactWaflavHero(hero.name)) {
            this.showWaflavDialog(heroSelection, heroPosition);
            return true;
        }

        // Check if it's a Waflav variant - show descension dialog
        if (this.isWaflavVariant(hero.name)) {
            this.showWaflavDescensionDialog(heroSelection, heroPosition);
            return true;
        }

        // Not a Waflav hero
        return false;
    }

    // ============================================
    // EXISTING EVOLUTION FUNCTIONALITY (unchanged)
    // ============================================

    // Use Waflav evolution (consume counter, apply permanent stat boost)
    async useWaflavEvolution(heroSelection, heroPosition) {
        if (!heroSelection) {
            return false;
        }

        // Double-check we can use the evolution (includes exact name check)
        const canUse = this.canUseWaflavEvolution(heroSelection, heroPosition);
        if (!canUse.canUse) {
            return false;
        }

        try {
            // Get the hero from formation
            const formation = heroSelection.formationManager.getBattleFormation();
            const hero = formation[heroPosition];
            
            if (!hero) {
                console.error('No hero found at position:', heroPosition);
                return false;
            }

            // Final safety check - ensure exact name match
            if (!WaflavEffectManager.isExactWaflavHero(hero.name)) {
                console.error('Evolution attempted on non-exact Waflav hero:', hero.name);
                return false;
            }

            // Consume evolution counter
            heroSelection.playerCounters.evolutionCounters -= 1;
            
            // Apply permanent stat bonuses
            hero.attackBonusses = (hero.attackBonusses || 0) + this.waflavStatBonus.attack;
            hero.hpBonusses = (hero.hpBonusses || 0) + this.waflavStatBonus.hp;
            
            // Update displays first
            heroSelection.updateBattleFormationUI();
            heroSelection.refreshHeroStats();
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Send update to opponent
            if (heroSelection.gameDataSender) {
                heroSelection.gameDataSender('waflav_evolution_used', {
                    heroPosition: heroPosition,
                    heroName: hero.name,
                    evolutionCountersRemaining: heroSelection.playerCounters.evolutionCounters,
                    timestamp: Date.now()
                });
            }
            
            console.log(`🧬 Waflav evolution used: ${hero.name} gained +${this.waflavStatBonus.hp} HP and +${this.waflavStatBonus.attack} Attack`);
            return true;
            
        } catch (error) {
            console.error('Error using Waflav evolution:', error);
            return false;
        }
    }

    // Show Waflav evolution dialog
    showWaflavDialog(heroSelection, heroPosition) {
        const canUse = this.canUseWaflavEvolution(heroSelection, heroPosition);

        if (!canUse.canUse) {
            // Only show error message if there is one (silent failure for non-exact Waflav heroes)
            if (canUse.message) {
                this.showWaflavEvolutionError(canUse.message);
            }
            return;
        }

        // Get current evolution counters
        const evolutionCounters = heroSelection.playerCounters.evolutionCounters || 0;

        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.id = 'waflavEvolutionDialog';
        overlay.className = 'waflav-evolution-overlay';
        overlay.innerHTML = `
            <div class="waflav-dialog-container">
                <div class="waflav-dialog-content">
                    <div class="waflav-dialog-header">
                        <div class="waflav-icon">🧬</div>
                        <h3>Waflav Evolution</h3>
                    </div>
                    <div class="waflav-dialog-body">
                        <p>Spend <span class="evolution-cost">1 Evolution Counter</span> for <span class="stat-bonus">+20 max HP</span> and <span class="stat-bonus">+5 Attack</span>?</p>
                        <div class="current-counters">
                            <span class="counter-icon">🧬</span>
                            <span>Evolution Counters: ${evolutionCounters}</span>
                        </div>
                    </div>
                    <div class="waflav-dialog-buttons">
                        <button class="waflav-btn waflav-btn-no" onclick="window.closeWaflavDialog()">
                            <span class="btn-icon">❌</span>
                            <span>No</span>
                        </button>
                        <button class="waflav-btn waflav-btn-yes" onclick="window.confirmWaflavEvolution()">
                            <span class="btn-icon">✨</span>
                            <span>Yes</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles if not already present
        this.ensureWaflavDialogStyles();

        // Prevent body scrolling
        document.body.classList.add('waflav-dialog-active');

        // Add to body
        document.body.appendChild(overlay);

        // Animate in
        overlay.style.animation = 'fadeIn 0.3s ease-out';

        // Store reference for the confirm handler
        overlay.dataset.heroPosition = heroPosition;

        // Set up global handlers
        window.closeWaflavDialog = () => {
            this.closeWaflavDialog();
        };

        window.confirmWaflavEvolution = async () => {
            await this.confirmWaflavEvolution(heroSelection, heroPosition);
        };

        // Handle Escape key
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                this.closeWaflavDialog();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        overlay.escapeHandler = handleEscape;
    }

    // Close Waflav dialog
    closeWaflavDialog() {
        const overlay = document.getElementById('waflavEvolutionDialog');
        if (overlay) {
            // Remove escape handler
            if (overlay.escapeHandler) {
                document.removeEventListener('keydown', overlay.escapeHandler);
            }

            overlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                overlay.remove();
                document.body.classList.remove('waflav-dialog-active');
                
                // Clean up global handlers
                if (typeof window !== 'undefined') {
                    window.closeWaflavDialog = null;
                    window.confirmWaflavEvolution = null;
                }
            }, 300);
        }
    }

    // Confirm Waflav evolution usage
    async confirmWaflavEvolution(heroSelection, heroPosition) {
        // Close dialog first
        this.closeWaflavDialog();
        
        // Use the evolution
        await this.useWaflavEvolution(heroSelection, heroPosition);
    }

    // Show Waflav evolution error message  
    showWaflavEvolutionError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'waflav-evolution-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
            </div>
        `;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(244, 67, 54, 0.4);
            animation: waflavErrorShake 0.5s ease-out;
            text-align: center;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'waflavErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 1000);
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Check if a hero name contains "Waflav" (for display purposes like counters)
    isWaflavHero(heroName) {
        return heroName && typeof heroName === 'string' && heroName.includes('Waflav');
    }

    // Check if a hero name is EXACTLY "Waflav" (not just containing it)
    static isExactWaflavHero(heroName) {
        return heroName === 'Waflav';
    }

    // ============================================
    // EVOLUTION COUNTER KILL REWARDS (unchanged)
    // ============================================

    // Handle when a Waflav hero gets a kill - award evolution counter
    static handleWaflavKill(attacker, battleManager) {
        // Check if the attacker is exactly "Waflav"
        if (!WaflavEffectManager.isExactWaflavHero(attacker.name)) {
            return false;
        }

        if (!battleManager || !battleManager.isAuthoritative) {
            return false;
        }

        // Determine which player owns this Waflav
        let targetCounters;
        let targetAbsoluteSide;

        if (attacker.side === 'player') {
            targetCounters = battleManager.playerCounters;
            targetAbsoluteSide = 'host';
        } else {
            targetCounters = battleManager.opponentCounters;
            targetAbsoluteSide = 'guest';
        }

        if (!targetCounters) {
            console.warn('No counter object found for Waflav kill reward');
            return false;
        }

        // Award the evolution counter
        targetCounters.evolutionCounters = (targetCounters.evolutionCounters || 0) + 1;

        // Log the reward
        const logMessage = `🧬 ${attacker.name} gained an Evolution Counter from defeating an enemy! (${targetCounters.evolutionCounters} total)`;
        const logType = attacker.side === 'player' ? 'success' : 'info';
        
        if (battleManager.addCombatLog) {
            battleManager.addCombatLog(logMessage, logType);
        }

        // Send network update to sync the counter change
        if (battleManager.sendBattleUpdate) {
            battleManager.sendBattleUpdate('waflav_evolution_counter_gained', {
                targetAbsoluteSide: targetAbsoluteSide,
                heroName: attacker.name,
                heroPosition: attacker.position,
                newCounterTotal: targetCounters.evolutionCounters,
                timestamp: Date.now()
            });
        }

        // Sync back to heroSelection if possible (immediate update)
        WaflavEffectManager.syncCountersToHeroSelection(battleManager);

        console.log(`🧬 ${attacker.name} awarded evolution counter, total: ${targetCounters.evolutionCounters}`);
        return true;
    }

    // Guest handler for receiving evolution counter updates
    static handleGuestEvolutionCounterGained(data, battleManager) {

        if (!data || !battleManager || battleManager.isAuthoritative) {
            return;
        }

        const { targetAbsoluteSide, heroName, heroPosition, newCounterTotal } = data;
        
        // Check if the attacker is exactly "Waflav"
        if (heroName !== "Waflav") {
            return;
        }

        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const isMyCounter = (targetAbsoluteSide === myAbsoluteSide);

        // Update the appropriate counter
        if (isMyCounter) {
            battleManager.playerCounters.evolutionCounters = newCounterTotal;
        } else {
            battleManager.opponentCounters.evolutionCounters = newCounterTotal;
        }

        // Add combat log message
        const logMessage = `🧬 ${heroName} gained an Evolution Counter from defeating an enemy! (${newCounterTotal} total)`;
        const logType = isMyCounter ? 'success' : 'info';
        
        if (battleManager.addCombatLog) {
            battleManager.addCombatLog(logMessage, logType);
        }

        // Sync to heroSelection immediately
        WaflavEffectManager.syncCountersToHeroSelection(battleManager);

        console.log(`🧬 Guest received evolution counter update: ${newCounterTotal}`);
    }

    // Sync counter changes back to heroSelection immediately
    static syncCountersToHeroSelection(battleManager) {
        if (typeof window === 'undefined' || !window.heroSelection) {
            return;
        }

        try {
            const heroSelection = window.heroSelection;
            
            // Update heroSelection counters with battle manager counters
            if (battleManager.playerCounters) {
                heroSelection.playerCounters = { ...heroSelection.playerCounters, ...battleManager.playerCounters };
            }
            
            if (battleManager.opponentCounters) {
                heroSelection.opponentCounters = { ...heroSelection.opponentCounters, ...battleManager.opponentCounters };
            }

            // Save the updated state
            if (heroSelection.saveGameState) {
                heroSelection.saveGameState().catch(error => {
                    console.warn('Error saving game state after evolution counter update:', error);
                });
            }

            console.log('🧬 Synced evolution counters to heroSelection');
        } catch (error) {
            console.warn('Error syncing counters to heroSelection:', error);
        }
    }

    // Ensure dialog styles are present
    ensureWaflavDialogStyles() {
        if (document.getElementById('waflavDialogStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'waflavDialogStyles';
        style.textContent = `
            .waflav-evolution-overlay, .waflav-descension-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            body.waflav-dialog-active {
                overflow: hidden !important;
            }
            
            .waflav-dialog-container {
                background: linear-gradient(135deg, #2e1065 0%, #3730a3 100%);
                border: 3px solid #8e24aa;
                border-radius: 20px;
                padding: 30px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
                position: relative;
            }

            .waflav-dialog-container.descension {
                border-color: #ff9800;
                background: linear-gradient(135deg, #e65100 0%, #ff9800 100%);
            }
            
            .waflav-dialog-header {
                text-align: center;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }
            
            .waflav-icon {
                font-size: 32px;
                animation: waflavIconFloat 3s ease-in-out infinite;
            }
            
            .waflav-dialog-header h3 {
                margin: 0;
                font-size: 1.8rem;
                color: #8e24aa;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            }

            .waflav-dialog-container.descension .waflav-dialog-header h3 {
                color: #fff3e0;
            }
            
            .waflav-dialog-body {
                text-align: center;
                margin-bottom: 25px;
            }
            
            .waflav-dialog-body p {
                font-size: 1.2rem;
                color: rgba(255, 255, 255, 0.9);
                margin: 0 0 15px 0;
                line-height: 1.4;
            }
            
            .evolution-cost {
                color: #8e24aa;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            .stat-bonus {
                color: #4caf50;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }

            .current-hero {
                color: #ffeb3b;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }

            .target-hero {
                color: #4caf50;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            .current-counters {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.8);
                background: rgba(142, 36, 170, 0.1);
                border: 1px solid rgba(142, 36, 170, 0.3);
                border-radius: 8px;
                padding: 8px 16px;
                margin: 0 auto;
                max-width: 200px;
            }

            .descension-warning {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.9);
                background: rgba(255, 152, 0, 0.1);
                border: 1px solid rgba(255, 152, 0, 0.3);
                border-radius: 8px;
                padding: 8px 16px;
                margin: 0 auto;
                max-width: 300px;
            }

            .descension-warning .warning-icon {
                font-size: 18px;
                filter: drop-shadow(0 0 4px rgba(255, 152, 0, 0.6));
            }
            
            .current-counters .counter-icon {
                font-size: 18px;
                filter: drop-shadow(0 0 4px rgba(142, 36, 170, 0.6));
            }
            
            .waflav-dialog-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            
            .waflav-btn {
                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 100px;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            }
            
            .waflav-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            }
            
            .waflav-btn:active {
                transform: translateY(0);
            }
            
            .waflav-btn-no {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            }
            
            .waflav-btn-no:hover {
                background: linear-gradient(135deg, #e94560 0%, #d42c40 100%);
                box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
            }
            
            .waflav-btn-yes {
                background: linear-gradient(135deg, #8e24aa 0%, #5e35b1 100%);
            }
            
            .waflav-btn-yes:hover {
                background: linear-gradient(135deg, #ab47bc 0%, #7e57c2 100%);
                box-shadow: 0 6px 20px rgba(142, 36, 170, 0.4);
            }

            .waflav-dialog-container.descension .waflav-btn-yes {
                background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
            }

            .waflav-dialog-container.descension .waflav-btn-yes:hover {
                background: linear-gradient(135deg, #ffb74d 0%, #ff9800 100%);
                box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
            }
            
            .btn-icon {
                font-size: 18px;
            }
            
            /* Animations */
            @keyframes waflavIconFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                33% { transform: translateY(-3px) rotate(2deg); }
                66% { transform: translateY(3px) rotate(-2deg); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.9); }
            }
            
            @keyframes waflavSuccessBounce {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                60% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            
            @keyframes waflavSuccessFade {
                from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }
            
            @keyframes waflavErrorShake {
                0%, 100% { transform: translate(-50%, -50%); }
                25% { transform: translate(-52%, -50%); }
                75% { transform: translate(-48%, -50%); }
            }
            
            @keyframes waflavErrorFade {
                from { opacity: 1; transform: translate(-50%, -50%); }
                to { opacity: 0; transform: translate(-50%, -50%) translateY(-10px); }
            }
            
            .success-content,
            .error-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .success-icon,
            .error-icon {
                font-size: 20px;
            }

            /* Evolution counter display styles */
            .evolution-counter-display {
                position: absolute;
                bottom: 2px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #8e24aa 0%, #5e35b1 100%);
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                box-shadow: 0 2px 6px rgba(142, 36, 170, 0.4);
                border: 2px solid rgba(255, 255, 255, 0.3);
                z-index: 15;
            }

            .evolution-counter-display:before {
                content: '🧬';
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 8px;
                opacity: 0.8;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Add styles for the descension reward display
    ensureDescensionRewardStyles() {
        if (document.getElementById('waflavDescensionRewardStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'waflavDescensionRewardStyles';
        style.textContent = `
            .descension-reward {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.9);
                background: rgba(76, 175, 80, 0.2);
                border: 1px solid rgba(76, 175, 80, 0.4);
                border-radius: 8px;
                padding: 8px 16px;
                margin: 10px auto;
                max-width: 300px;
            }

            .descension-reward .reward-icon {
                font-size: 18px;
                filter: drop-shadow(0 0 4px rgba(76, 175, 80, 0.6));
            }

            .success-details {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
            }

            .counter-reward {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.9);
            }

            .counter-reward .counter-icon {
                font-size: 16px;
                filter: drop-shadow(0 0 4px rgba(142, 36, 170, 0.6));
            }
        `;
        
        document.head.appendChild(style);
    }

    // Export Waflav state for saving (minimal - counters are saved elsewhere)
    exportWaflavState() {
        return {
            timestamp: Date.now()
        };
    }

    // Import Waflav state for loading (minimal)
    importWaflavState(stateData) {
        // Waflav state is minimal since evolution counters are stored in playerCounters
        // and permanent bonuses are stored on hero objects
        return true;
    }

    // Reset all state (for new game)
    reset() {
        console.log('🧬 Waflav effect manager reset for new game');
    }

    // Get current state for debugging
    getState() {
        return {
            waflavStatBonus: this.waflavStatBonus,
            waflavDescensionRewards: this.waflavDescensionRewards
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.WaflavEffectManager = WaflavEffectManager;
}

export default WaflavEffectManager;