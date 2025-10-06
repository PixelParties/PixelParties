// Potions/experimentalPotion.js - ExperimentalPotion Implementation
// Delegates to potionHandler for proper card display and animation handling

import { getCardsByType } from '../cardDatabase.js';

export class ExperimentalPotionPotion {
    constructor() {
        this.name = 'ExperimentalPotion';
        this.displayName = 'Experimental Potion';
        this.description = 'Randomly selects another potion and executes its effects twice';
        this.effectType = 'random_double_effect';
        this.targetType = 'varies';
        
        this.availablePotions = this.loadAvailablePotions();
    }

    loadAvailablePotions() {
        try {
            const allPotions = getCardsByType('Potion');
            const potionNames = allPotions
                .map(potion => potion.name)
                .filter(name => name !== 'ExperimentalPotion',  // Can't select itself
                                        'ElixirOfQuickness',   // No battle effect (only draws cards)
                                        'PlanetInABottle'  );
            
            return potionNames;
        } catch (error) {
            console.error('Error loading potions from card database:', error);
            return [
                'ElixirOfStrength', 'ElixirOfImmortality', 'ElixirOfCold',
                'LifeSerum', 'PoisonVial', 'BottledFlame', 'BottledLightning',
                'BoulderInABottle', 'SwordInABottle', 'AcidVial'
            ];
        }
    }

    // Main integration method - called by potionHandler
    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0) return 0;
        if (!battleManager) return 0;

        try {
            let totalEffectsProcessed = 0;

            for (const effect of effects) {
                const processedCount = await this.processExperimentalPotionEffect(
                    playerRole, 
                    battleManager
                );
                totalEffectsProcessed += processedCount;
                
                if (effects.length > 1) {
                    await battleManager.delay(300);
                }
            }

            return totalEffectsProcessed;
            
        } catch (error) {
            console.error(`Error handling ExperimentalPotion effects:`, error);
            return effects.length;
        }
    }

    async processExperimentalPotionEffect(playerRole, battleManager) {
        try {
            // Show transformation animation
            this.showTransformationEffect(playerRole, battleManager);
            
            // Select random potion
            const selectedPotionName = this.selectRandomPotion(battleManager);
            
            if (!selectedPotionName) {
                battleManager.addCombatLog(
                    `🧪 ${playerRole === 'host' ? 'Host' : 'Guest'}'s Experimental Potion fizzles out!`, 
                    'warning'
                );
                return 0;
            }

            // Add combat log
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            const logType = playerRole === 'host' ? 'success' : 'error';
            
            battleManager.addCombatLog(
                `🧪 ${playerName}'s Experimental Potion bubbles and transforms!`, 
                logType
            );
            
            await battleManager.delay(500);
            
            battleManager.addCombatLog(
                `✨ It becomes ${this.formatPotionName(selectedPotionName)} and activates twice!`, 
                'info'
            );

            // Send visual sync for transformation
            if (battleManager.isAuthoritative && battleManager.networkManager) {
                battleManager.networkManager.sendBattleUpdate('potion_specific_visual', {
                    potionName: 'ExperimentalPotion',
                    visualType: 'potion_effects',
                    effectCount: 1,
                    playerSide: playerRole,
                    selectedPotionName: selectedPotionName
                });
            }

            // Create mock effects for the selected potion (2x)
            const mockEffects = this.createMockEffectsForPotion(selectedPotionName, 2);

            // Get potionHandler instance
            const potionHandler = window.potionHandler;
            if (!potionHandler) {
                console.error('PotionHandler not available');
                return 0;
            }

            // Delegate to potionHandler to apply these effects
            // This will handle card display, animations, and all visual sync
            const totalApplied = await potionHandler.applyDelegatedPotionEffects(
                mockEffects,
                playerRole,
                battleManager,
                {
                    showCards: true,
                    source: 'ExperimentalPotion',
                    selectedPotionName: selectedPotionName
                }
            );

            return 1; // Return 1 for the ExperimentalPotion itself
            
        } catch (error) {
            console.error('Error processing ExperimentalPotion:', error);
            return 0;
        }
    }

    selectRandomPotion(battleManager) {
        if (!battleManager.getRandomChoice || this.availablePotions.length === 0) {
            return null;
        }
        return battleManager.getRandomChoice(this.availablePotions);
    }

    createMockEffectsForPotion(potionName, count) {
        const effects = [];
        for (let i = 0; i < count; i++) {
            effects.push({
                name: potionName,
                addedAt: Date.now(),
                id: `experimental_${potionName}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`
            });
        }
        return effects;
    }

    showTransformationEffect(playerRole, battleManager) {
        try {
            const transformationEffect = document.createElement('div');
            transformationEffect.className = 'experimental-potion-transformation';
            transformationEffect.innerHTML = '🌀';
            
            transformationEffect.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 60px;
                z-index: 1000;
                pointer-events: none;
                animation: experimentalPotionSpin 1s ease-out forwards;
                text-shadow: 
                    0 0 20px #ff6b6b,
                    0 0 40px #4ecdc4,
                    0 0 60px #45b7d1;
            `;
            
            document.body.appendChild(transformationEffect);
            
            setTimeout(() => {
                if (transformationEffect && transformationEffect.parentNode) {
                    transformationEffect.remove();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error showing transformation effect:', error);
        }
    }

    async guest_handleVisualEffects(data, battleManager) {
        if (!battleManager || battleManager.isAuthoritative) return;
        
        const { playerSide, effectCount = 1, selectedPotionName } = data;
        const isHostPotion = (playerSide === 'host');
        
        for (let i = 0; i < effectCount; i++) {
            this.showTransformationEffect(playerSide, battleManager);
            
            if (i < effectCount - 1) {
                await battleManager.delay(300);
            }
        }
        
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success';
        
        battleManager.addCombatLog(
            `🧪 ${playerName}'s Experimental Potion bubbles and transforms!`,
            logType
        );
        
        await battleManager.delay(500);
        
        if (selectedPotionName) {
            battleManager.addCombatLog(
                `✨ It becomes ${this.formatPotionName(selectedPotionName)} and activates twice!`,
                'info'
            );
        }
    }

    formatPotionName(potionName) {
        return potionName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}

// CSS animations remain the same...
if (typeof document !== 'undefined' && !document.getElementById('experimentalPotionStyles')) {
    const style = document.createElement('style');
    style.id = 'experimentalPotionStyles';
    style.textContent = `
        @keyframes experimentalPotionSpin {
            0% {
                transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                opacity: 0;
            }
            25% {
                transform: translate(-50%, -50%) scale(1.2) rotate(90deg);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                opacity: 0.9;
            }
            75% {
                transform: translate(-50%, -50%) scale(1.3) rotate(270deg);
                opacity: 0.7;
            }
            100% {
                transform: translate(-50%, -50%) scale(0.8) rotate(360deg);
                opacity: 0;
            }
        }
        
        .experimental-potion-transformation {
            will-change: transform, opacity;
            backface-visibility: hidden;
            perspective: 1000px;
        }
    `;
    document.head.appendChild(style);
}

if (typeof window !== 'undefined') {
    window.ExperimentalPotionPotion = ExperimentalPotionPotion;
}