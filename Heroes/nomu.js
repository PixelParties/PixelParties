// Heroes/nomu.js - Nomu Hero Effect Implementation
// Grants shield based on teleports counter at battle start

export class NomuHeroEffect {
    constructor() {
        this.name = 'NomuHeroEffect';
    }

    // Apply Nomu's teleport shield effect at battle start
    static async applyNomuShieldEffects(battleManager) {
        if (!battleManager.isAuthoritative) {
            return; // Only host applies effects
        }

        try {
            // Check both sides for Nomu heroes
            await this.applyNomuShieldForSide(battleManager, 'player');
            await this.applyNomuShieldForSide(battleManager, 'opponent');
        } catch (error) {
            console.error('Error applying Nomu shield effects:', error);
        }
    }

    // Apply shield effects for one side
    static async applyNomuShieldForSide(battleManager, side) {
        const heroes = side === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const counters = side === 'player' ? battleManager.playerCounters : battleManager.opponentCounters;
        
        // Count Nomu heroes on this side
        let nomuCount = 0;
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && hero.name === 'Nomu') {
                nomuCount++;
            }
        });

        if (nomuCount === 0) {
            return; // No Nomu heroes on this side
        }

        // Get teleports counter value
        const teleportsCount = counters.teleports || 0;
        if (teleportsCount === 0) {
            return; // No teleports used, no shield to grant
        }

        // Calculate shield amount: 40 per teleport per Nomu
        const shieldPerTarget = 40 * teleportsCount * nomuCount;

        // Apply shield to all living heroes on this side
        const shieldTargets = [];
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive) {
                // Grant shield
                hero.currentShield = (hero.currentShield || 0) + shieldPerTarget;
                shieldTargets.push({ hero, position, side });
                
                // Update health bar display
                battleManager.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
            }
        });

        // Add combat log message
        if (shieldTargets.length > 0) {
            const shieldText = nomuCount === 1 ? 'Nomu' : `${nomuCount} Nomu heroes`;
            battleManager.addCombatLog(
                `🔮 ${shieldText} grant${nomuCount === 1 ? 's' : ''} ${shieldPerTarget} shield to all allies! (${teleportsCount} teleports × 50 × ${nomuCount})`,
                side === 'player' ? 'success' : 'info'
            );
        }

        // Play shield bubble animation for all targets
        if (shieldTargets.length > 0) {
            await this.playShieldBubbleAnimation(battleManager, shieldTargets, shieldPerTarget);
        }

        // Sync to guest if this is the host
        if (battleManager.isAuthoritative) {
            this.syncNomuShieldToGuest(battleManager, side, shieldTargets, shieldPerTarget, teleportsCount, nomuCount);
        }
    }

    // Play shield bubble animation
    static async playShieldBubbleAnimation(battleManager, targets, shieldAmount) {
        // Create bubble animations for all targets simultaneously
        const animationPromises = targets.map(target => 
            this.createShieldBubbleForTarget(target, shieldAmount)
        );

        // Wait for all animations to complete
        await Promise.all(animationPromises);
    }

    // Create shield bubble animation for a single target
    static createShieldBubbleForTarget(target, shieldAmount) {
        return new Promise((resolve) => {
            const heroElement = document.querySelector(`.${target.side}-slot.${target.position}-slot .battle-hero-card`);
            if (!heroElement) {
                resolve();
                return;
            }

            // Create bubble container
            const bubbleContainer = document.createElement('div');
            bubbleContainer.className = 'nomu-shield-bubble-container';
            bubbleContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 100;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // Create the main bubble
            const bubble = document.createElement('div');
            bubble.className = 'nomu-shield-bubble';
            bubble.style.cssText = `
                width: 80px;
                height: 80px;
                background: radial-gradient(circle at 30% 30%, rgba(0, 204, 255, 0.3), rgba(0, 150, 255, 0.6), rgba(0, 100, 200, 0.8));
                border-radius: 50%;
                border: 3px solid rgba(0, 204, 255, 0.9);
                box-shadow: 
                    0 0 20px rgba(0, 204, 255, 0.8),
                    inset 0 0 20px rgba(255, 255, 255, 0.3);
                animation: nomuShieldBubble 2s ease-out forwards;
                transform: scale(0);
            `;

            // Create shield amount text
            const shieldText = document.createElement('div');
            shieldText.className = 'nomu-shield-text';
            shieldText.textContent = `+${shieldAmount} 🛡️`;
            shieldText.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-weight: bold;
                font-size: 14px;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                animation: nomuShieldText 2s ease-out forwards;
                opacity: 0;
            `;

            bubble.appendChild(shieldText);
            bubbleContainer.appendChild(bubble);

            // Position container relative to hero element
            heroElement.style.position = 'relative';
            heroElement.appendChild(bubbleContainer);

            // Remove after animation completes
            setTimeout(() => {
                if (bubbleContainer.parentNode) {
                    bubbleContainer.remove();
                }
                resolve();
            }, 2000);
        });
    }

    // Sync shield application to guest
    static syncNomuShieldToGuest(battleManager, side, targets, shieldAmount, teleportsCount, nomuCount) {
        if (!battleManager.gameDataSender) return;

        const targetData = targets.map(target => ({
            position: target.position,
            heroName: target.hero.name,
            newShield: target.hero.currentShield,
            newHp: target.hero.currentHp,
            maxHp: target.hero.maxHp
        }));

        // Send to guest
        battleManager.gameDataSender('battle_data', {
            type: 'nomu_shield_applied',
            data: {
                side: side === 'player' ? 
                    (battleManager.isHost ? 'host' : 'guest') :
                    (battleManager.isHost ? 'guest' : 'host'),
                targets: targetData,
                shieldAmount,
                teleportsCount,
                nomuCount,
                timestamp: Date.now()
            }
        });
    }

    // Guest handler for Nomu shield effects
    static handleGuestNomuShield(data, battleManager) {
        if (battleManager.isAuthoritative) return;

        const { side: absoluteSide, targets, shieldAmount, teleportsCount, nomuCount } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const localSide = (absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const heroes = localSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;

        // Apply shield values from host
        const shieldTargets = [];
        targets.forEach(targetData => {
            const hero = heroes[targetData.position];
            if (hero) {
                hero.currentShield = targetData.newShield;
                battleManager.updateHeroHealthBar(localSide, targetData.position, targetData.newHp, targetData.maxHp);
                shieldTargets.push({ 
                    hero, 
                    position: targetData.position, 
                    side: localSide 
                });
            }
        });

        // Add combat log message
        if (shieldTargets.length > 0) {
            const shieldText = nomuCount === 1 ? 'Nomu' : `${nomuCount} Nomu heroes`;
            battleManager.addCombatLog(
                `🔮 ${shieldText} grant${nomuCount === 1 ? 's' : ''} ${shieldAmount} shield to all allies! (${teleportsCount} teleports × 50 × ${nomuCount})`,
                localSide === 'player' ? 'success' : 'info'
            );
        }

        // Play animation for guest
        if (shieldTargets.length > 0) {
            this.playShieldBubbleAnimation(battleManager, shieldTargets, shieldAmount);
        }
    }
}

// Add CSS for the shield bubble animation
if (typeof document !== 'undefined' && !document.getElementById('nomuShieldStyles')) {
    const style = document.createElement('style');
    style.id = 'nomuShieldStyles';
    style.textContent = `
        @keyframes nomuShieldBubble {
            0% {
                transform: scale(0);
                opacity: 0;
            }
            20% {
                transform: scale(1.2);
                opacity: 0.9;
            }
            40% {
                transform: scale(1);
                opacity: 1;
            }
            60% {
                transform: scale(1.1);
                opacity: 0.8;
            }
            100% {
                transform: scale(0);
                opacity: 0;
            }
        }

        @keyframes nomuShieldText {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1);
            }
            70% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
        }

        .nomu-shield-bubble-container {
            animation: none !important;
        }
    `;
    document.head.appendChild(style);
}

export default NomuHeroEffect;