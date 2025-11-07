// ./Artifacts/futureTechPotionLauncher.js - Future Tech Potion Launcher Artifact Implementation
// When equipped Hero attacks: 5+X% chance for random battle Potion effect to activate
// Chance scales with FutureTechPotionLauncher cards in graveyard (capped at 25%)

import { getCardsByType } from '../cardDatabase.js';

export class FutureTechPotionLauncherEffect {
    constructor() {
        this.artifactName = 'FutureTechPotionLauncher';
        this.availablePotions = this.loadAvailablePotions();
    }

    /**
     * Load available battle potions (excluding non-battle potions)
     * Uses same filtering logic as ExperimentalPotion
     */
    loadAvailablePotions() {
        try {
            const allPotions = getCardsByType('Potion');
            const potionNames = allPotions
                .map(potion => potion.name)
                .filter(name => 
                    name !== 'ElixirOfQuickness' &&   // No battle effect (only draws cards)
                    name !== 'PlanetInABottle' &&     // No battle effect (places area)
                    name !== 'MagneticPotion'         // No battle effect
                );
            
            return potionNames;
        } catch (error) {
            console.error('Error loading potions from card database:', error);
            // Fallback list of known battle potions
            return [
                'ElixirOfStrength', 'ElixirOfImmortality', 'ElixirOfCold',
                'LifeSerum', 'PoisonVial', 'BottledFlame', 'BottledLightning',
                'BoulderInABottle', 'SwordInABottle', 'AcidVial', 'ExperimentalPotion'
            ];
        }
    }
    /**
     * Main trigger method - called when equipped hero's attack hits
     * @param {Object} attacker - The attacking hero object
     * @param {Object} defender - The defender object (hero or creature)
     * @param {number} damage - Damage dealt
     * @param {Object} battleManager - Battle manager instance
     */
    async onAttackHit(attacker, defender, damage, battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) return;

        try {
            // Determine attacker's player role
            const playerRole = this.determinePlayerRole(attacker, battleManager);
            if (!playerRole) {
                console.error('Could not determine player role for FutureTechPotionLauncher');
                return;
            }

            // Calculate trigger chance
            const baseChance = this.calculateTriggerChance(playerRole, battleManager);
            
            // Roll for activation
            const roll = Math.random() * 100;
            if (roll > baseChance) {
                return; // Effect didn't trigger
            }
            
            // Select random potion
            const selectedPotionName = this.selectRandomPotion(battleManager);
            if (!selectedPotionName) {
                console.error('Failed to select random potion');
                return;
            }

            // Show activation animation
            this.showActivationEffect(playerRole, battleManager);
            
            // Add combat logs
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            const logType = playerRole === 'host' ? 'success' : 'error';
            
            battleManager.addCombatLog(
                `🚀 ${playerName}'s Future Tech Potion Launcher activates!`,
                logType
            );
            
            await battleManager.delay(400);
            
            battleManager.addCombatLog(
                `💉 Launching ${this.formatPotionName(selectedPotionName)}!`,
                'info'
            );

            // Send network sync to guest
            if (battleManager.networkManager) {
            battleManager.networkManager.sendBattleUpdate('future_tech_potion_launcher_activated', {
                playerSide: playerRole,
                selectedPotionName: selectedPotionName,
                attackerPosition: attacker.position
            });
        }

            // Create mock potion effect
            const mockEffect = {
                name: selectedPotionName,
                addedAt: Date.now(),
                id: `launcher_${selectedPotionName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
            };

            // Get potionHandler instance
            const potionHandler = window.potionHandler;
            if (!potionHandler) {
                console.error('PotionHandler not available');
                return;
            }

            await battleManager.delay(300);

            // Apply the potion effect using the standard potion infrastructure
            // This handles card display, animations, and all visual/network sync automatically
            await potionHandler.applyDelegatedPotionEffects(
                [mockEffect],
                playerRole,
                battleManager,
                {
                    showCards: true,
                    source: 'FutureTechPotionLauncher',
                    selectedPotionName: selectedPotionName
                }
            );

        } catch (error) {
            console.error('Error in FutureTechPotionLauncher onAttackHit:', error);
        }
    }

    /**
     * Determine which player role the attacker belongs to
     * @param {Object} attacker - The attacking hero object
     * @param {Object} battleManager - Battle manager instance
     * @returns {string|null} 'host' or 'guest', or null if not found
     */
    determinePlayerRole(attacker, battleManager) {
        // Use the attacker's absoluteSide property directly if available
        if (attacker.absoluteSide) {
            return attacker.absoluteSide;
        }
        
        // Otherwise convert from relative side to absolute side
        if (attacker.side) {
            // If attacker.side is 'player', they're on our side
            // If attacker.side is 'opponent', they're on the other side
            const isAttackerOnPlayerSide = (attacker.side === 'player');
            
            if (battleManager.isHost) {
                return isAttackerOnPlayerSide ? 'host' : 'guest';
            } else {
                return isAttackerOnPlayerSide ? 'guest' : 'host';
            }
        }
        
        console.error('Attacker has no side or absoluteSide property:', attacker);
        return null;
    }

    /**
     * Calculate the trigger chance based on copies in graveyard
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - Battle manager instance
     * @returns {number} Trigger chance percentage (5-25)
     */
    calculateTriggerChance(playerRole, battleManager) {
        // Get the appropriate graveyard
        const graveyard = playerRole === 'host' 
            ? (battleManager.hostGraveyard || [])
            : (battleManager.guestGraveyard || []);
        
        // Count FutureTechPotionLauncher cards in graveyard
        const launcherCount = graveyard.filter(card => 
            card && (card.name === this.artifactName || card.cardName === this.artifactName)
        ).length;

        // Calculate: 5% base + 1% per copy, capped at 25%
        const baseChance = 5;
        const bonusChance = launcherCount * 1;
        const totalChance = Math.min(baseChance + bonusChance, 25);

        return totalChance;
    }

    /**
     * Select a random battle potion
     * @param {Object} battleManager - Battle manager instance
     * @returns {string|null} Selected potion name, or null if selection failed
     */
    selectRandomPotion(battleManager) {
        if (!battleManager.getRandomChoice || this.availablePotions.length === 0) {
            return null;
        }
        return battleManager.getRandomChoice(this.availablePotions);
    }

    /**
     * Show visual activation effect
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - Battle manager instance
     */
    showActivationEffect(playerRole, battleManager) {
        try {
            const launchEffect = document.createElement('div');
            launchEffect.className = 'potion-launcher-effect';
            launchEffect.innerHTML = '🚀💉';
            
            launchEffect.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 50px;
                z-index: 1000;
                pointer-events: none;
                animation: potionLauncherFire 0.8s ease-out forwards;
                text-shadow: 
                    0 0 20px #00ff88,
                    0 0 40px #00ccff,
                    0 0 60px #0088ff;
            `;
            
            document.body.appendChild(launchEffect);
            
            setTimeout(() => {
                if (launchEffect && launchEffect.parentNode) {
                    launchEffect.remove();
                }
            }, 800);
            
        } catch (error) {
            console.error('Error showing launcher activation effect:', error);
        }
    }

    /**
     * Handle visual effects for guest player
     * Called when guest receives equipment_specific_effect update
     * @param {Object} data - Effect data from network
     * @param {Object} battleManager - Battle manager instance
     */
    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, selectedPotionName } = data;
        const isHostEffect = (playerSide === 'host');
        
        // Show activation animation
        this.showActivationEffect(playerSide, battleManager);
        
        // Add combat logs (inverted for guest perspective)
        const playerName = isHostEffect ? 'Host' : 'Guest';
        const logType = isHostEffect ? 'error' : 'success';
        
        battleManager.addCombatLog(
            `🚀 ${playerName}'s Future Tech Potion Launcher activates!`,
            logType
        );
        
        await battleManager.delay(400);
        
        if (selectedPotionName) {
            battleManager.addCombatLog(
                `💉 Launching ${this.formatPotionName(selectedPotionName)}!`,
                'info'
            );
        }
    }

    /**
     * Format potion name for display (add spaces before capital letters)
     * @param {string} potionName - Camel case potion name
     * @returns {string} Formatted potion name
     */
    formatPotionName(potionName) {
        return potionName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}

// Inject CSS for launcher animations
if (typeof document !== 'undefined' && !document.getElementById('potionLauncherStyles')) {
    const style = document.createElement('style');
    style.id = 'potionLauncherStyles';
    style.textContent = `
        @keyframes potionLauncherFire {
            0% {
                transform: translate(-50%, -50%) scale(0.5) rotate(-10deg);
                opacity: 0;
            }
            30% {
                transform: translate(-50%, -50%) scale(1.3) rotate(5deg);
                opacity: 1;
            }
            60% {
                transform: translate(-50%, -50%) scale(1.1) rotate(-5deg);
                opacity: 0.9;
            }
            100% {
                transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
                opacity: 0;
            }
        }
        
        .potion-launcher-effect {
            will-change: transform, opacity;
            backface-visibility: hidden;
            perspective: 1000px;
        }
    `;
    document.head.appendChild(style);
}

// Export and attach to window for global access
if (typeof window !== 'undefined') {
    window.FutureTechPotionLauncherEffect = FutureTechPotionLauncherEffect;
    
    // Create global instance for easy access
    if (!window.futureTechPotionLauncherEffect) {
        window.futureTechPotionLauncherEffect = new FutureTechPotionLauncherEffect();
    }
}

export default FutureTechPotionLauncherEffect;