// Potions/experimentalPotion.js - ExperimentalPotion Implementation with Random Double Effect

export class ExperimentalPotionPotion {
    constructor() {
        this.name = 'ExperimentalPotion';
        this.displayName = 'Experimental Potion';
        this.description = 'Randomly selects another potion and executes its effects twice';
        this.effectType = 'random_double_effect';
        this.targetType = 'varies';
        
        // List of all other potions that can be randomly selected (excluding itself)
        this.availablePotions = [
            'ElixirOfStrength',
            'ElixirOfImmortality', 
            'ElixirOfCold',
            'LifeSerum',
            'PoisonVial',
            'BottledFlame',
            'BottledLightning',
            'BoulderInABottle',
            'SwordInABottle',
            'AcidVial'
        ];
        
        console.log('ExperimentalPotion initialized with random double effect capability');
    }

    // ===== MAIN INTEGRATION METHOD =====

    // Main integration method called by potion handler
    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0) {
            console.log('No ExperimentalPotion effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for ExperimentalPotion effects');
            return 0;
        }

        console.log(`🧪 ExperimentalPotion handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            let totalEffectsProcessed = 0;

            // Process each ExperimentalPotion effect
            for (const effect of effects) {
                const processedCount = await this.processExperimentalPotionEffect(playerRole, battleManager);
                totalEffectsProcessed += processedCount;
                
                // Small delay between multiple experimental potions for visual clarity
                if (effects.length > 1) {
                    await battleManager.delay(300);
                }
            }

            return totalEffectsProcessed;
            
        } catch (error) {
            console.error(`Error handling ExperimentalPotion effects for ${playerRole}:`, error);
            return effects.length; // Return as if processed to avoid errors
        }
    }

    // ===== CORE EFFECT PROCESSING =====

    // Process a single ExperimentalPotion effect
    async processExperimentalPotionEffect(playerRole, battleManager) {
        try {
            // Show initial transformation effect
            this.showTransformationEffect(playerRole, battleManager);
            
            // Randomly select a potion from available options
            const selectedPotionName = this.selectRandomPotion(battleManager);
            
            if (!selectedPotionName) {
                console.error('Failed to select a random potion for ExperimentalPotion');
                battleManager.addCombatLog(
                    `🧪 ${playerRole === 'host' ? 'Host' : 'Guest'}'s Experimental Potion fizzles out!`, 
                    'warning'
                );
                return 0;
            }

            console.log(`🎲 ExperimentalPotion selected: ${selectedPotionName} (will execute twice)`);
            
            // Add transformation combat log messages
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            const logType = playerRole === 'host' ? 'success' : 'error';
            
            battleManager.addCombatLog(
                `🧪 ${playerName}'s Experimental Potion bubbles and transforms!`, 
                logType
            );
            
            // Small delay for dramatic effect
            await battleManager.delay(500);
            
            battleManager.addCombatLog(
                `✨ It becomes ${this.formatPotionName(selectedPotionName)} and activates twice!`, 
                'info'
            );

            // Execute the selected potion's effects twice
            const totalEffectsApplied = await this.executeSelectedPotionTwice(
                selectedPotionName, 
                playerRole, 
                battleManager
            );

            console.log(`✅ ExperimentalPotion completed: ${selectedPotionName} applied ${totalEffectsApplied} times`);
            return 1; // Return 1 to indicate this ExperimentalPotion was processed

        } catch (error) {
            console.error('Error processing ExperimentalPotion effect:', error);
            battleManager.addCombatLog(
                `⚠️ ${playerRole === 'host' ? 'Host' : 'Guest'}'s Experimental Potion failed to activate!`, 
                'warning'
            );
            return 0;
        }
    }

    // ===== RANDOM SELECTION =====

    // Randomly select a potion using the battle manager's deterministic randomness
    selectRandomPotion(battleManager) {
        if (!battleManager.getRandomChoice || this.availablePotions.length === 0) {
            console.error('Cannot select random potion - no randomness system or no available potions');
            return null;
        }

        const selectedPotion = battleManager.getRandomChoice(this.availablePotions);
        console.log(`🎯 ExperimentalPotion randomly selected: ${selectedPotion}`);
        return selectedPotion;
    }

    // ===== DOUBLE EXECUTION =====

    // Execute the selected potion's effects twice
    async executeSelectedPotionTwice(potionName, playerRole, battleManager) {
        let totalApplications = 0;

        try {
            console.log(`🔄 Executing ${potionName} twice for ExperimentalPotion...`);

            // Execute the first application
            battleManager.addCombatLog(`🥇 First ${this.formatPotionName(potionName)} activation:`, 'info');
            const firstApplication = await this.executeSinglePotionEffect(potionName, playerRole, battleManager);
            totalApplications += firstApplication;

            // Delay between applications for visual clarity and game balance
            await battleManager.delay(800);

            // Execute the second application
            battleManager.addCombatLog(`🥈 Second ${this.formatPotionName(potionName)} activation:`, 'info');
            const secondApplication = await this.executeSinglePotionEffect(potionName, playerRole, battleManager);
            totalApplications += secondApplication;

            console.log(`✅ ${potionName} executed twice: ${totalApplications} total applications`);
            return totalApplications;

        } catch (error) {
            console.error(`Error executing ${potionName} twice for ExperimentalPotion:`, error);
            return totalApplications; // Return whatever we managed to apply
        }
    }

    // Execute a single instance of the selected potion
    async executeSinglePotionEffect(potionName, playerRole, battleManager) {
        try {
            // Create a mock effect for the selected potion
            const mockEffect = { 
                name: potionName, 
                addedAt: Date.now(), 
                id: `experimental_${potionName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` 
            };

            // Delegate to the specific potion implementation
            const effectsApplied = await this.delegateToSpecificPotion(
                potionName, 
                [mockEffect], 
                playerRole, 
                battleManager
            );

            return effectsApplied;

        } catch (error) {
            console.error(`Error executing single ${potionName} effect:`, error);
            return 0;
        }
    }

    // ===== POTION DELEGATION =====

    // Delegate to specific potion implementation (mirrors potionHandler.js logic)
    async delegateToSpecificPotion(potionName, effects, playerRole, battleManager) {
        try {
            console.log(`🔄 Delegating to ${potionName} implementation...`);

            switch (potionName) {
                case 'ElixirOfStrength':
                    return await this.handleElixirOfStrengthEffects(effects, playerRole, battleManager);
                
                case 'ElixirOfCold':
                    return await this.handleElixirOfColdEffects(effects, playerRole, battleManager);

                case 'LifeSerum':
                    return await this.handleLifeSerumEffects(effects, playerRole, battleManager);
                
                case 'BottledFlame':
                    return await this.handleBottledFlameEffects(effects, playerRole, battleManager);
                
                case 'BottledLightning':
                    return await this.handleBottledLightningEffects(effects, playerRole, battleManager);

                case 'PoisonVial':
                    return await this.handlePoisonVialEffects(effects, playerRole, battleManager);

                case 'BoulderInABottle':
                    return await this.handleBoulderInABottleEffects(effects, playerRole, battleManager);

                case 'SwordInABottle':  
                    return await this.handleSwordInABottleEffects(effects, playerRole, battleManager);

                case 'AcidVial': 
                    return await this.handleAcidVialEffects(effects, playerRole, battleManager);

                case 'ElixirOfImmortality':
                    console.log(`ElixirOfImmortality effects not yet implemented for battle`);
                    battleManager.addCombatLog(
                        `⚠️ ${this.formatPotionName(potionName)} effects not yet implemented`, 
                        'warning'
                    );
                    return 0;
                    
                default:
                    console.log(`No battle effect defined for potion: ${potionName}`);
                    battleManager.addCombatLog(
                        `⚠️ Unknown potion effect: ${this.formatPotionName(potionName)}`, 
                        'warning'
                    );
                    return 0;
            }
        } catch (error) {
            console.error(`Error delegating to ${potionName}:`, error);
            return 0;
        }
    }

    // ===== INDIVIDUAL POTION EFFECT HANDLERS =====

    async handleElixirOfStrengthEffects(effects, playerRole, battleManager) {
        try {
            const { ElixirOfStrengthPotion } = await import('./elixirOfStrength.js');
            const elixirOfStrengthPotion = new ElixirOfStrengthPotion();
            return await elixirOfStrengthPotion.handlePotionEffectsForPlayer(effects, playerRole, battleManager);
        } catch (error) {
            console.error(`Error with ElixirOfStrength from ExperimentalPotion:`, error);
            return this.applyFallbackEffect('ElixirOfStrength', playerRole, battleManager);
        }
    }

    async handleElixirOfColdEffects(effects, playerRole, battleManager) {
        try {
            const { ElixirOfColdPotion } = await import('./elixirOfCold.js');
            const elixirOfColdPotion = new ElixirOfColdPotion();
            return await elixirOfColdPotion.handlePotionEffectsForPlayer(effects, playerRole, battleManager);
        } catch (error) {
            console.error(`Error with ElixirOfCold from ExperimentalPotion:`, error);
            return this.applyFallbackEffect('ElixirOfCold', playerRole, battleManager);
        }
    }

    async handleLifeSerumEffects(effects, playerRole, battleManager) {
        try {
            const { LifeSerumPotion } = await import('./lifeSerum.js');
            const lifeSerumPotion = new LifeSerumPotion();
            return await lifeSerumPotion.handlePotionEffectsForPlayer(effects, playerRole, battleManager);
        } catch (error) {
            console.error(`Error with LifeSerum from ExperimentalPotion:`, error);
            return this.applyFallbackEffect('LifeSerum', playerRole, battleManager);
        }
    }

    async handleBottledFlameEffects(effects, playerRole, battleManager) {
        try {
            const { BottledFlamePotion } = await import('./bottledFlame.js');
            const bottledFlamePotion = new BottledFlamePotion();
            return await bottledFlamePotion.handlePotionEffectsForPlayer(effects, playerRole, battleManager);
        } catch (error) {
            console.error(`Error with BottledFlame from ExperimentalPotion:`, error);
            return this.applyFallbackEffect('BottledFlame', playerRole, battleManager);
        }
    }

    async handleBottledLightningEffects(effects, playerRole, battleManager) {
        try {
            const { BottledLightningPotion } = await import('./bottledLightning.js');
            const bottledLightningPotion = new BottledLightningPotion();
            return await bottledLightningPotion.handlePotionEffectsForPlayer(effects, playerRole, battleManager);
        } catch (error) {
            console.error(`Error with BottledLightning from ExperimentalPotion:`, error);
            return this.applyFallbackEffect('BottledLightning', playerRole, battleManager);
        }
    }

    async handlePoisonVialEffects(effects, playerRole, battleManager) {
        try {
            const { PoisonVialPotion } = await import('./poisonVial.js');
            const poisonVialPotion = new PoisonVialPotion();
            return await poisonVialPotion.handlePotionEffectsForPlayer(effects, playerRole, battleManager);
        } catch (error) {
            console.error(`Error with PoisonVial from ExperimentalPotion:`, error);
            return this.applyFallbackEffect('PoisonVial', playerRole, battleManager);
        }
    }

    async handleBoulderInABottleEffects(effects, playerRole, battleManager) {
        try {
            const { BoulderInABottlePotion } = await import('./boulderInABottle.js');
            const boulderInABottlePotion = new BoulderInABottlePotion();
            return await boulderInABottlePotion.handlePotionEffectsForPlayer(effects, playerRole, battleManager);
        } catch (error) {
            console.error(`Error with BoulderInABottle from ExperimentalPotion:`, error);
            return this.applyFallbackEffect('BoulderInABottle', playerRole, battleManager);
        }
    }

    async handleSwordInABottleEffects(effects, playerRole, battleManager) {
        try {
            const { SwordInABottlePotion } = await import('./swordInABottle.js');
            const swordInABottlePotion = new SwordInABottlePotion();
            return await swordInABottlePotion.handlePotionEffectsForPlayer(effects, playerRole, battleManager);
        } catch (error) {
            console.error(`Error with SwordInABottle from ExperimentalPotion:`, error);
            return this.applyFallbackEffect('SwordInABottle', playerRole, battleManager);
        }
    }

    async handleAcidVialEffects(effects, playerRole, battleManager) {
        try {
            const { AcidVialPotion } = await import('./acidVial.js');
            const acidVialPotion = new AcidVialPotion();
            return await acidVialPotion.handlePotionEffectsForPlayer(effects, playerRole, battleManager);
        } catch (error) {
            console.error(`Error with AcidVial from ExperimentalPotion:`, error);
            return this.applyFallbackEffect('AcidVial', playerRole, battleManager);
        }
    }

    // ===== VISUAL EFFECTS =====

    // Show transformation visual effect
    showTransformationEffect(playerRole, battleManager) {
        try {
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            
            // Create transformation visual effect
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
            
            // Remove after animation
            setTimeout(() => {
                if (transformationEffect && transformationEffect.parentNode) {
                    transformationEffect.remove();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error showing transformation effect:', error);
        }
    }

    // ===== FALLBACK HANDLING =====

    // Apply fallback effect if potion module fails to load
    applyFallbackEffect(potionName, playerRole, battleManager) {
        console.warn(`Applying fallback effect for ${potionName}`);
        
        battleManager.addCombatLog(
            `⚠️ ${this.formatPotionName(potionName)} effect partially applied (fallback mode)`, 
            'warning'
        );
        
        return 1; // Return 1 to indicate something was attempted
    }

    // ===== UTILITY METHODS =====

    // Format potion name for display
    formatPotionName(potionName) {
        return potionName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is ExperimentalPotion
    static isExperimentalPotion(potionName) {
        return potionName === 'ExperimentalPotion';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'ExperimentalPotion',
            displayName: 'Experimental Potion',
            description: 'Randomly selects another potion and executes its effects twice',
            cardType: 'Potion',
            cost: 0,
            effect: 'Randomly transforms into another potion and activates twice at battle start',
            targetType: 'varies',
            rarity: 'epic'
        };
    }

    // Static method to create a new instance
    static create() {
        return new ExperimentalPotionPotion();
    }

    // Static method for quick effect application (utility)
    static async applyRandomDoubleEffect(battleManager, playerRole) {
        const potion = new ExperimentalPotionPotion();
        const mockEffect = { name: 'ExperimentalPotion', addedAt: Date.now(), id: `static_${Date.now()}` };
        return await potion.handlePotionEffectsForPlayer([mockEffect], playerRole, battleManager);
    }
}

// Add CSS animations for ExperimentalPotion effects
if (typeof document !== 'undefined' && !document.getElementById('experimentalPotionStyles')) {
    const style = document.createElement('style');
    style.id = 'experimentalPotionStyles';
    style.textContent = `
        /* Experimental Potion transformation animation */
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
        
        /* Base styles for experimental potion effects */
        .experimental-potion-transformation {
            will-change: transform, opacity;
        }
        
        /* Enhanced transformation effects */
        .experimental-potion-transformation:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, 
                rgba(255, 107, 107, 0.4) 0%, 
                rgba(78, 205, 196, 0.3) 40%, 
                rgba(69, 183, 209, 0.2) 70%,
                transparent 90%);
            border-radius: 50%;
            animation: experimentalGlow 1s ease-out;
        }
        
        @keyframes experimentalGlow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            40% {
                transform: translate(-50%, -50%) scale(1.3);
                opacity: 0.7;
            }
            100% {
                transform: translate(-50%, -50%) scale(2.5);
                opacity: 0;
            }
        }
        
        /* Responsive experimental effects */
        @media (max-width: 768px) {
            .experimental-potion-transformation {
                font-size: 40px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .experimental-potion-transformation {
                text-shadow: 
                    0 0 8px #ffffff,
                    0 0 16px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .experimental-potion-transformation {
                animation: experimentalReducedMotion 0.5s ease-out forwards;
            }
        }
        
        @keyframes experimentalReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        /* Performance optimizations */
        .experimental-potion-transformation {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.ExperimentalPotionPotion = ExperimentalPotionPotion;
}

console.log('ExperimentalPotion module loaded with random double effect capability');