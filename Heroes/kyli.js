// ./Heroes/kyli.js - Kyli Hero Effect Manager: Nature Bond BiomancyToken Empowerment

export class KyliEffectManager {
    constructor() {
        // No state tracking needed - returnToFormationScreenAfterBattle handles timing
    }

    // Process Kyli empowerment after battle (called from returnToFormationScreenAfterBattle)
    async processPostBattleEmpowerment(heroSelection) {
        if (!heroSelection) {
            return;
        }
        
        if (!heroSelection.formationManager) {
            return;
        }
        
        if (!heroSelection.heroCreatureManager) {
            return;
        }

        try {
            // Count Kyli heroes in current formation
            const formation = heroSelection.formationManager.getBattleFormation();
            
            const kyliCount = this.countKyliHeroes(formation);
            
            if (kyliCount === 0) {
                return; // No Kyli heroes, no empowerment
            }

            // Find and empower all BiomancyToken creatures
            const empoweredCount = this.empowerBiomancyTokens(heroSelection, kyliCount);
            
            if (empoweredCount > 0) {
                this.showEmpowermentNotification(kyliCount, empoweredCount);
                
                // CRITICAL: Save the game state to persist the HP changes
                try {
                    if (heroSelection.saveGameState) {
                        await heroSelection.saveGameState();
                    }
                } catch (error) {
                    // Error saving game state after empowerment
                }
            }
        } catch (error) {
            // Exception in processPostBattleEmpowerment
        }
    }

    // Count Kyli heroes in formation
    countKyliHeroes(formation) {
        if (!formation) {
            return 0;
        }
        
        let count = 0;
        const positions = ['left', 'center', 'right'];
        
        positions.forEach(position => {
            const hero = formation[position];
            
            if (!hero) {
                return;
            }
            
            if (hero.name === 'Kyli') {
                count++;
            }
        });
        
        return count;
    }

    // Empower all BiomancyToken creatures
    empowerBiomancyTokens(heroSelection, kyliCount) {
        const hpBonusPerKyli = 20;
        const totalHpBonus = kyliCount * hpBonusPerKyli;
        
        let empoweredCount = 0;

        // Process each hero position
        const positions = ['left', 'center', 'right'];
        positions.forEach(position => {
            try {
                const creatures = heroSelection.heroCreatureManager.getHeroCreatures(position);
                
                if (creatures.length === 0) {
                    return;
                }
                
                creatures.forEach((creature, index) => {
                    if (creature.name === 'BiomancyToken') {
                        // Apply HP bonus directly to the creature
                        creature.hp = creature.hp + totalHpBonus;
                        creature.currentHp = creature.currentHp + totalHpBonus;
                        
                        // Show buff animation
                        this.showTokenBuffAnimation(position, index, totalHpBonus);
                        empoweredCount++;
                    }
                });
            } catch (error) {
                // Error processing creatures at position
            }
        });
        
        return empoweredCount;
    }

    // Show buff animation for empowered token
    showTokenBuffAnimation(position, creatureIndex, hpBonus) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
            const selector = `.hero-creatures[data-hero-position="${position}"] .creature-icon[data-creature-index="${creatureIndex}"]`;
            
            const creatureElement = document.querySelector(selector);
            
            if (!creatureElement) {
                return;
            }

            // Create buff effect
            const buffEffect = document.createElement('div');
            buffEffect.className = 'kyli-token-buff-effect';
            buffEffect.innerHTML = `
                <div class="buff-icon">🌱</div>
                <div class="buff-text">+${hpBonus} HP</div>
            `;
            
            buffEffect.style.cssText = `
                position: absolute;
                top: -35px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%);
                color: #1b5e20;
                padding: 6px 12px;
                border-radius: 16px;
                font-size: 12px;
                font-weight: bold;
                white-space: nowrap;
                z-index: 1000;
                pointer-events: none;
                animation: kyliBuffEffect 2.5s ease-out forwards;
                box-shadow: 0 4px 12px rgba(46, 125, 50, 0.4);
                border: 2px solid rgba(76, 175, 80, 0.3);
                display: flex;
                align-items: center;
                gap: 4px;
            `;

            // Ensure the creature element can contain the buff effect
            creatureElement.style.position = 'relative';
            
            creatureElement.appendChild(buffEffect);

            // Remove after animation completes
            setTimeout(() => {
                if (buffEffect.parentNode) {
                    buffEffect.remove();
                }
            }, 2500);
        }, 100);
    }

    // Show empowerment notification
    showEmpowermentNotification(kyliCount, tokenCount) {
        const hpPerToken = kyliCount * 20;
        
        const notification = document.createElement('div');
        notification.className = 'kyli-empowerment-notification';
        notification.innerHTML = `
            <div class="notification-icon">🌱</div>
            <div class="notification-content">
                <div class="notification-title">Nature's Bond</div>
                <div class="notification-text">
                    Empowered ${tokenCount} BiomancyToken${tokenCount > 1 ? 's' : ''}
                </div>
                <div class="notification-details">
                    +${hpPerToken} HP from ${kyliCount} Kyli hero${kyliCount > 1 ? 's' : ''}
                </div>
            </div>
        `;
        
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
            animation: kyliNotification 3.5s ease-out forwards;
            box-shadow: 0 8px 32px rgba(46, 125, 50, 0.5);
            border: 3px solid rgba(76, 175, 80, 0.4);
            min-width: 280px;
            display: flex;
            align-items: center;
            gap: 16px;
        `;

        document.body.appendChild(notification);

        // Remove after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3500);
    }

    // Reset for new turn - no state to reset since empowerment is permanent until creatures are replaced
    resetForNewTurn() {
        // No state tracking, no reset needed
    }

    // Reset to initial state - no state to reset
    reset() {
        // No persistent state to reset
    }
}

// Inject CSS styles for Kyli effects
if (typeof document !== 'undefined' && !document.getElementById('kyliEffectStyles')) {
    const style = document.createElement('style');
    style.id = 'kyliEffectStyles';
    style.textContent = `
        /* Kyli Buff Animation */
        @keyframes kyliBuffEffect {
            0% { 
                opacity: 0;
                transform: translateX(-50%) translateY(0px) scale(0.6);
            }
            20% { 
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.1);
            }
            50% {
                opacity: 1;
                transform: translateX(-50%) translateY(-10px) scale(1.0);
            }
            80% {
                opacity: 1;
                transform: translateX(-50%) translateY(-15px) scale(0.95);
            }
            100% { 
                opacity: 0;
                transform: translateX(-50%) translateY(-25px) scale(0.8);
            }
        }

        /* Kyli Notification Animation */
        @keyframes kyliNotification {
            0% { 
                opacity: 0;
                transform: translateX(-50%) translateY(-30px) scale(0.7);
            }
            15% { 
                opacity: 1;
                transform: translateX(-50%) translateY(0px) scale(1.05);
            }
            85% { 
                opacity: 1;
                transform: translateX(-50%) translateY(0px) scale(1);
            }
            100% { 
                opacity: 0;
                transform: translateX(-50%) translateY(-20px) scale(0.9);
            }
        }

        /* Kyli Buff Effect Styling */
        .kyli-token-buff-effect .buff-icon {
            font-size: 14px;
            filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
        }

        .kyli-token-buff-effect .buff-text {
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif;
            letter-spacing: 0.5px;
            font-weight: 900;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }

        /* Kyli Notification Styling */
        .kyli-empowerment-notification .notification-icon {
            font-size: 32px;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
        }

        .kyli-empowerment-notification .notification-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        .kyli-empowerment-notification .notification-text {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .kyli-empowerment-notification .notification-details {
            font-size: 12px;
            opacity: 0.9;
            font-style: italic;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .kyli-token-buff-effect {
                font-size: 10px;
                padding: 4px 8px;
            }
            
            .kyli-empowerment-notification {
                padding: 16px 24px;
                min-width: 240px;
            }
            
            .kyli-empowerment-notification .notification-icon {
                font-size: 28px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other modules
export default KyliEffectManager;