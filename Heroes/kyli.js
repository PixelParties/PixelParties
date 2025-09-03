// ./Heroes/kyli.js - Kyli Hero Effect Manager: Nature Bond BiomancyToken Empowerment
// VERSION WITH EXTENSIVE DEBUGGING

export class KyliEffectManager {
    constructor() {
        console.log('🐛 [KYLI DEBUG] KyliEffectManager constructor called');
        // No state tracking needed - returnToFormationScreenAfterBattle handles timing
    }

    // Process Kyli empowerment after battle (called from returnToFormationScreenAfterBattle)
    async processPostBattleEmpowerment(heroSelection) {
        console.log('🐛 [KYLI DEBUG] processPostBattleEmpowerment called');
        console.log('🐛 [KYLI DEBUG] heroSelection object:', heroSelection);
        
        if (!heroSelection) {
            console.error('🐛 [KYLI DEBUG] CRITICAL: heroSelection is null/undefined');
            return;
        }
        
        if (!heroSelection.formationManager) {
            console.error('🐛 [KYLI DEBUG] CRITICAL: heroSelection.formationManager is missing');
            console.log('🐛 [KYLI DEBUG] Available properties on heroSelection:', Object.keys(heroSelection));
            return;
        }
        
        if (!heroSelection.heroCreatureManager) {
            console.error('🐛 [KYLI DEBUG] CRITICAL: heroSelection.heroCreatureManager is missing');
            console.log('🐛 [KYLI DEBUG] Available properties on heroSelection:', Object.keys(heroSelection));
            return;
        }

        console.log('🐛 [KYLI DEBUG] All required managers are available');

        try {
            // Count Kyli heroes in current formation
            console.log('🐛 [KYLI DEBUG] Getting battle formation...');
            const formation = heroSelection.formationManager.getBattleFormation();
            console.log('🐛 [KYLI DEBUG] Formation retrieved:', formation);
            
            const kyliCount = this.countKyliHeroes(formation);
            console.log('🐛 [KYLI DEBUG] Kyli count in formation:', kyliCount);
            
            if (kyliCount === 0) {
                console.log('🐛 [KYLI DEBUG] No Kyli heroes found, exiting empowerment');
                return; // No Kyli heroes, no empowerment
            }

            console.log('🐛 [KYLI DEBUG] Found', kyliCount, 'Kyli hero(s), proceeding with empowerment');

            // Find and empower all BiomancyToken creatures
            const empoweredCount = this.empowerBiomancyTokens(heroSelection, kyliCount);
            console.log('🐛 [KYLI DEBUG] Empowerment complete, empowered count:', empoweredCount);
            
            if (empoweredCount > 0) {
                const totalHpBonus = kyliCount * 20;
                console.log(`🐛 [KYLI DEBUG] SUCCESS: Kyli empowered ${empoweredCount} BiomancyTokens with +${totalHpBonus} HP`);
                this.showEmpowermentNotification(kyliCount, empoweredCount);
                
                // CRITICAL: Save the game state to persist the HP changes
                console.log('🐛 [KYLI DEBUG] Saving game state to persist empowerment...');
                try {
                    if (heroSelection.saveGameState) {
                        await heroSelection.saveGameState();
                        console.log('🐛 [KYLI DEBUG] Game state saved successfully after empowerment');
                    } else {
                        console.error('🐛 [KYLI DEBUG] No saveGameState method available!');
                    }
                } catch (error) {
                    console.error('🐛 [KYLI DEBUG] Error saving game state after empowerment:', error);
                }
            } else {
                console.log('🐛 [KYLI DEBUG] No BiomancyTokens were empowered (none found?)');
            }
        } catch (error) {
            console.error('🐛 [KYLI DEBUG] EXCEPTION in processPostBattleEmpowerment:', error);
            console.error('🐛 [KYLI DEBUG] Stack trace:', error.stack);
        }
    }

    // Count Kyli heroes in formation
    countKyliHeroes(formation) {
        console.log('🐛 [KYLI DEBUG] countKyliHeroes called with formation:', formation);
        
        if (!formation) {
            console.error('🐛 [KYLI DEBUG] Formation is null/undefined');
            return 0;
        }
        
        let count = 0;
        const positions = ['left', 'center', 'right'];
        
        positions.forEach(position => {
            console.log(`🐛 [KYLI DEBUG] Checking position ${position}...`);
            const hero = formation[position];
            
            if (!hero) {
                console.log(`🐛 [KYLI DEBUG] No hero at position ${position}`);
                return;
            }
            
            console.log(`🐛 [KYLI DEBUG] Hero at ${position}:`, hero);
            console.log(`🐛 [KYLI DEBUG] Hero name: "${hero.name}"`);
            
            if (hero.name === 'Kyli') {
                count++;
                console.log(`🐛 [KYLI DEBUG] Found Kyli at position ${position}! Count now: ${count}`);
            } else {
                console.log(`🐛 [KYLI DEBUG] Hero at ${position} is ${hero.name}, not Kyli`);
            }
        });
        
        console.log('🐛 [KYLI DEBUG] Final Kyli count:', count);
        return count;
    }

    // Empower all BiomancyToken creatures
    empowerBiomancyTokens(heroSelection, kyliCount) {
        console.log('🐛 [KYLI DEBUG] empowerBiomancyTokens called with kyliCount:', kyliCount);
        
        const hpBonusPerKyli = 20;
        const totalHpBonus = kyliCount * hpBonusPerKyli;
        console.log('🐛 [KYLI DEBUG] Total HP bonus to apply:', totalHpBonus);
        
        let empoweredCount = 0;

        // Process each hero position
        const positions = ['left', 'center', 'right'];
        positions.forEach(position => {
            console.log(`🐛 [KYLI DEBUG] Processing creatures at position ${position}...`);
            
            try {
                const creatures = heroSelection.heroCreatureManager.getHeroCreatures(position);
                console.log(`🐛 [KYLI DEBUG] Creatures at ${position}:`, creatures);
                console.log(`🐛 [KYLI DEBUG] Number of creatures at ${position}:`, creatures.length);
                
                if (creatures.length === 0) {
                    console.log(`🐛 [KYLI DEBUG] No creatures at position ${position}`);
                    return;
                }
                
                creatures.forEach((creature, index) => {
                    console.log(`🐛 [KYLI DEBUG] Examining creature ${index} at ${position}:`, creature);
                    console.log(`🐛 [KYLI DEBUG] Creature name: "${creature.name}"`);
                    console.log(`🐛 [KYLI DEBUG] Creature current HP: ${creature.currentHp}`);
                    console.log(`🐛 [KYLI DEBUG] Creature max HP: ${creature.hp}`);
                    
                    if (creature.name === 'BiomancyToken') {
                        console.log(`🐛 [KYLI DEBUG] Found BiomancyToken at ${position}-${index}!`);
                        
                        // Store original values for logging
                        const originalMaxHp = creature.hp;
                        const originalCurrentHp = creature.currentHp;
                        
                        console.log(`🐛 [KYLI DEBUG] BEFORE empowerment - MaxHP: ${originalMaxHp}, CurrentHP: ${originalCurrentHp}`);
                        
                        // Apply HP bonus directly to the creature
                        creature.hp = creature.hp + totalHpBonus;
                        creature.currentHp = creature.currentHp + totalHpBonus;
                        
                        console.log(`🐛 [KYLI DEBUG] AFTER empowerment - MaxHP: ${creature.hp}, CurrentHP: ${creature.currentHp}`);
                        console.log(`🐛 [KYLI DEBUG] HP increase: ${creature.hp - originalMaxHp}`);
                        
                        // Show buff animation
                        this.showTokenBuffAnimation(position, index, totalHpBonus);
                        empoweredCount++;
                        
                        console.log(`🐛 [KYLI DEBUG] Successfully empowered BiomancyToken at ${position}-${index}: +${totalHpBonus} HP`);
                        console.log(`🐛 [KYLI DEBUG] Total empowered so far: ${empoweredCount}`);
                    } else {
                        console.log(`🐛 [KYLI DEBUG] Creature at ${position}-${index} is ${creature.name}, not BiomancyToken`);
                    }
                });
            } catch (error) {
                console.error(`🐛 [KYLI DEBUG] ERROR processing creatures at ${position}:`, error);
                console.error(`🐛 [KYLI DEBUG] Stack trace:`, error.stack);
            }
        });
        
        console.log('🐛 [KYLI DEBUG] Final empowered count:', empoweredCount);
        return empoweredCount;
    }

    // Show buff animation for empowered token
    showTokenBuffAnimation(position, creatureIndex, hpBonus) {
        console.log(`🐛 [KYLI DEBUG] showTokenBuffAnimation called for ${position}-${creatureIndex} with bonus ${hpBonus}`);
        
        // Small delay to ensure UI is ready
        setTimeout(() => {
            console.log(`🐛 [KYLI DEBUG] Executing buff animation for ${position}-${creatureIndex}`);
            
            const selector = `.hero-creatures[data-hero-position="${position}"] .creature-icon[data-creature-index="${creatureIndex}"]`;
            console.log(`🐛 [KYLI DEBUG] Looking for element with selector: ${selector}`);
            
            const creatureElement = document.querySelector(selector);
            console.log(`🐛 [KYLI DEBUG] Found creature element:`, creatureElement);
            
            if (!creatureElement) {
                console.warn(`🐛 [KYLI DEBUG] Could not find creature element for buff animation at ${position}-${creatureIndex}`);
                
                // Try alternative selectors for debugging
                const altSelector1 = `.hero-creatures[data-hero-position="${position}"]`;
                const container = document.querySelector(altSelector1);
                console.log(`🐛 [KYLI DEBUG] Container element:`, container);
                
                if (container) {
                    const allCreatures = container.querySelectorAll('.creature-icon');
                    console.log(`🐛 [KYLI DEBUG] All creature icons in container:`, allCreatures);
                    console.log(`🐛 [KYLI DEBUG] Number of creature icons:`, allCreatures.length);
                    
                    allCreatures.forEach((el, idx) => {
                        console.log(`🐛 [KYLI DEBUG] Creature ${idx} data-creature-index:`, el.getAttribute('data-creature-index'));
                    });
                }
                
                return;
            }

            console.log(`🐛 [KYLI DEBUG] Creating buff effect element...`);

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

            console.log(`🐛 [KYLI DEBUG] Setting creature element position to relative...`);
            // Ensure the creature element can contain the buff effect
            creatureElement.style.position = 'relative';
            
            console.log(`🐛 [KYLI DEBUG] Appending buff effect to creature element...`);
            creatureElement.appendChild(buffEffect);
            
            console.log(`🐛 [KYLI DEBUG] Buff animation element created and attached successfully`);

            // Remove after animation completes
            setTimeout(() => {
                console.log(`🐛 [KYLI DEBUG] Removing buff effect after animation completion`);
                if (buffEffect.parentNode) {
                    buffEffect.remove();
                    console.log(`🐛 [KYLI DEBUG] Buff effect removed successfully`);
                } else {
                    console.log(`🐛 [KYLI DEBUG] Buff effect was already removed`);
                }
            }, 2500);
        }, 100);
    }

    // Show empowerment notification
    showEmpowermentNotification(kyliCount, tokenCount) {
        console.log(`🐛 [KYLI DEBUG] showEmpowermentNotification called - kyliCount: ${kyliCount}, tokenCount: ${tokenCount}`);
        
        const hpPerToken = kyliCount * 20;
        console.log(`🐛 [KYLI DEBUG] HP per token: ${hpPerToken}`);
        
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

        console.log(`🐛 [KYLI DEBUG] Appending notification to document body...`);
        document.body.appendChild(notification);
        console.log(`🐛 [KYLI DEBUG] Notification displayed successfully`);

        // Remove after animation
        setTimeout(() => {
            console.log(`🐛 [KYLI DEBUG] Removing notification after animation`);
            if (notification.parentNode) {
                notification.remove();
                console.log(`🐛 [KYLI DEBUG] Notification removed successfully`);
            } else {
                console.log(`🐛 [KYLI DEBUG] Notification was already removed`);
            }
        }, 3500);
    }

    // Reset for new turn - no state to reset since empowerment is permanent until creatures are replaced
    resetForNewTurn() {
        console.log('🐛 [KYLI DEBUG] resetForNewTurn called');
        // No state tracking, no reset needed
    }

    // Reset to initial state - no state to reset
    reset() {
        console.log('🐛 [KYLI DEBUG] reset called');
        // No persistent state to reset
        console.log('🐛 [KYLI DEBUG] Kyli: Reset (no state to clear)');
    }
}

// Inject CSS styles for Kyli effects
if (typeof document !== 'undefined' && !document.getElementById('kyliEffectStyles')) {
    console.log('🐛 [KYLI DEBUG] Injecting CSS styles...');
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
    console.log('🐛 [KYLI DEBUG] CSS styles injected successfully');
} else {
    console.log('🐛 [KYLI DEBUG] CSS styles already exist, skipping injection');
}

// Export for use in other modules
export default KyliEffectManager;