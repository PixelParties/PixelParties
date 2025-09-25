// ./Heroes/mary.js - Mary Hero Effect Manager: CuteBird Summoning after Battle

export class MaryEffectManager {
    constructor() {
        // No state tracking needed - returnToFormationScreenAfterBattle handles timing
    }

    // Process Mary CuteBird summoning after battle (called from returnToFormationScreenAfterBattle)
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
            // Find Mary heroes in current formation and spawn CuteBirds
            const formation = heroSelection.formationManager.getBattleFormation();
            const maryPositions = this.findMaryHeroes(formation);
            
            if (maryPositions.length === 0) {
                return; // No Mary heroes, no birds to summon
            }

            // Spawn CuteBird for each Mary hero
            const spawnedCount = await this.spawnCuteBirdsForMaryHeroes(heroSelection, maryPositions);
            
            if (spawnedCount > 0) {
                this.showCuteBirdSummonNotification(maryPositions.length, spawnedCount);
                
                // CRITICAL: Save the game state to persist the new creatures
                try {
                    if (heroSelection.saveGameState) {
                        await heroSelection.saveGameState();
                    }
                    
                    // Send formation update to opponent to sync new creatures
                    if (heroSelection.sendFormationUpdate) {
                        await heroSelection.sendFormationUpdate();
                    }
                } catch (error) {
                    console.error('Mary: Error saving game state after CuteBird summoning:', error);
                }
            }
        } catch (error) {
            console.error('Mary: Exception in processPostBattleEmpowerment:', error);
        }
    }

    // Find all Mary heroes in formation
    findMaryHeroes(formation) {
        if (!formation) {
            return [];
        }
        
        const maryPositions = [];
        const positions = ['left', 'center', 'right'];
        
        positions.forEach(position => {
            const hero = formation[position];
            
            if (!hero) {
                return;
            }
            
            if (hero.name === 'Mary') {
                maryPositions.push(position);
            }
        });
        
        return maryPositions;
    }

    // Spawn CuteBird creatures for all Mary heroes
    async spawnCuteBirdsForMaryHeroes(heroSelection, maryPositions) {
        let totalSpawned = 0;

        for (const position of maryPositions) {
            try {
                // Spawn a CuteBird for this Mary hero
                const success = heroSelection.heroCreatureManager.addCreatureToHero(position, 'CuteBird');
                
                if (success) {
                    totalSpawned++;
                    
                    // Show individual spawn animation
                    this.showCuteBirdSpawnAnimation(position);
                } else {
                    console.warn(`Mary: Failed to spawn CuteBird for Mary at ${position}`);
                }
            } catch (error) {
                console.error(`Mary: Error spawning CuteBird for Mary at ${position}:`, error);
            }
        }
        
        return totalSpawned;
    }

    // Show spawn animation for individual CuteBird
    showCuteBirdSpawnAnimation(position) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
            const teamSlot = document.querySelector(`.team-slot[data-position="${position}"]`);
            
            if (!teamSlot) {
                return;
            }

            // Create spawn effect
            const spawnEffect = document.createElement('div');
            spawnEffect.className = 'mary-cutebird-spawn-effect';
            spawnEffect.innerHTML = `
                <div class="spawn-icon">🐦</div>
                <div class="spawn-text">Cute Bird!</div>
            `;
            
            spawnEffect.style.cssText = `
                position: absolute;
                top: -35px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
                color: #2d3436;
                padding: 6px 12px;
                border-radius: 16px;
                font-size: 12px;
                font-weight: bold;
                white-space: nowrap;
                z-index: 1000;
                pointer-events: none;
                animation: marySpawnEffect 2.5s ease-out forwards;
                box-shadow: 0 4px 12px rgba(253, 203, 110, 0.4);
                border: 2px solid rgba(255, 234, 167, 0.6);
                display: flex;
                align-items: center;
                gap: 4px;
            `;

            // Ensure the team slot can contain the spawn effect
            teamSlot.style.position = 'relative';
            
            teamSlot.appendChild(spawnEffect);

            // Remove after animation completes
            setTimeout(() => {
                if (spawnEffect.parentNode) {
                    spawnEffect.remove();
                }
            }, 2500);
        }, 100);
    }

    // Show main summoning notification
    showCuteBirdSummonNotification(maryCount, spawnedCount) {
        const notification = document.createElement('div');
        notification.className = 'mary-cutebird-notification';
        notification.innerHTML = `
            <div class="notification-icon">🐦</div>
            <div class="notification-content">
                <div class="notification-title">Friendship Power</div>
                <div class="notification-text">
                    Summoned ${spawnedCount} Cute Bird${spawnedCount > 1 ? 's' : ''}!
                </div>
                <div class="notification-details">
                    From ${maryCount} Mary hero${maryCount > 1 ? 's' : ''} after battle
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 15%;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
            color: #2d3436;
            padding: 20px 32px;
            border-radius: 20px;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif;
            text-align: center;
            z-index: 10000;
            pointer-events: none;
            animation: maryNotification 3.5s ease-out forwards;
            box-shadow: 0 8px 32px rgba(253, 203, 110, 0.5);
            border: 3px solid rgba(255, 234, 167, 0.4);
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

    // Reset for new turn - no state to reset since CuteBird summoning is permanent
    resetForNewTurn() {
        // No state tracking, no reset needed
    }

    // Reset to initial state - no state to reset
    reset() {
        // No persistent state to reset
    }
}

// Inject CSS styles for Mary effects
if (typeof document !== 'undefined' && !document.getElementById('maryEffectStyles')) {
    const style = document.createElement('style');
    style.id = 'maryEffectStyles';
    style.textContent = `
        /* Mary Spawn Animation */
        @keyframes marySpawnEffect {
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

        /* Mary Notification Animation */
        @keyframes maryNotification {
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

        /* Mary Spawn Effect Styling */
        .mary-cutebird-spawn-effect .spawn-icon {
            font-size: 14px;
            filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
        }

        .mary-cutebird-spawn-effect .spawn-text {
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif;
            letter-spacing: 0.5px;
            font-weight: 900;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }

        /* Mary Notification Styling */
        .mary-cutebird-notification .notification-icon {
            font-size: 32px;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
        }

        .mary-cutebird-notification .notification-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        .mary-cutebird-notification .notification-text {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .mary-cutebird-notification .notification-details {
            font-size: 12px;
            opacity: 0.9;
            font-style: italic;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .mary-cutebird-spawn-effect {
                font-size: 10px;
                padding: 4px 8px;
            }
            
            .mary-cutebird-notification {
                padding: 16px 24px;
                min-width: 240px;
            }
            
            .mary-cutebird-notification .notification-icon {
                font-size: 28px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other modules
export default MaryEffectManager;