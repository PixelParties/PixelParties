// training.js - Training Ability Implementation

export const trainingAbility = {
    // Process Training upgrades for all heroes after returning from battle
    async processTrainingUpgrades() {
        if (!window.heroSelection?.heroAbilitiesManager || !window.heroSelection?.formationManager) {
            console.warn('Training: Required managers not available');
            return;
        }

        const formation = window.heroSelection.formationManager.getBattleFormation();
        const upgrades = [];

        // Process each hero position
        ['left', 'center', 'right'].forEach(position => {
            const hero = formation[position];
            if (!hero) return;

            // Get initial Training count for this hero
            const initialTrainingCount = window.heroSelection.heroAbilitiesManager
                .getAbilityStackCountForPosition(position, 'Training');
            
            if (initialTrainingCount === 0) return;

            console.log(`Training: ${hero.name} at ${position} has ${initialTrainingCount} Training stacks`);

            // Roll for each initial Training stack
            for (let i = 0; i < initialTrainingCount; i++) {
                const roll = Math.random();
                if (roll <= 0.25) { // 25% chance
                    const upgrade = this.upgradeRandomAbility(position);
                    if (upgrade) {
                        upgrades.push({
                            position,
                            heroName: hero.name,
                            ...upgrade
                        });
                    }
                }
            }
        });

        // Show visual feedback for all upgrades
        if (upgrades.length > 0) {
            await this.showTrainingUpgrades(upgrades);
            
            // Save state after upgrades
            if (window.heroSelection.saveGameState) {
                await window.heroSelection.saveGameState();
            }
            
            // Refresh the entire formation UI to show updated ability zones
            if (window.heroSelection.updateBattleFormationUI) {
                window.heroSelection.updateBattleFormationUI();
            }
            
            // The formation UI update includes hero stats refresh, but call it explicitly for safety
            if (window.heroSelection.refreshHeroStats) {
                window.heroSelection.refreshHeroStats();
            }
        }
    },

    // Upgrade a random ability for the specified hero
    upgradeRandomAbility(heroPosition) {
        const abilities = this.getAllHeroAbilities(heroPosition);
        if (abilities.length === 0) {
            console.warn(`Training: No abilities found for hero at ${heroPosition}`);
            return null;
        }

        // Pick a random ability
        const randomIndex = Math.floor(Math.random() * abilities.length);
        const selectedAbility = abilities[randomIndex];

        // Add another stack of this ability to the same zone
        const success = window.heroSelection.heroAbilitiesManager.addAbilityToZone(
            heroPosition, 
            selectedAbility.zone, 
            { name: selectedAbility.name }, 
            true // bypassUniqueCheck
        );

        if (success) {
            console.log(`Training: Upgraded ${selectedAbility.name} for hero at ${heroPosition}`);
            return {
                abilityName: selectedAbility.name,
                zone: selectedAbility.zone,
                newStackCount: selectedAbility.stackCount + 1
            };
        }

        return null;
    },

    // Get all abilities for a hero in a flat array format
    getAllHeroAbilities(heroPosition) {
        const heroAbilities = window.heroSelection.heroAbilitiesManager.getHeroAbilities(heroPosition);
        if (!heroAbilities) return [];

        const allAbilities = [];

        // Iterate through all zones
        [1, 2, 3].forEach(zoneNum => {
            const zoneName = `zone${zoneNum}`;
            const zone = heroAbilities[zoneName];
            
            if (zone && zone.length > 0) {
                // Each zone contains stacks of the same ability
                const abilityName = zone[0].name;
                allAbilities.push({
                    name: abilityName,
                    zone: zoneNum,
                    stackCount: zone.length
                });
            }
        });

        return allAbilities;
    },

    // Show visual feedback for Training upgrades
    async showTrainingUpgrades(upgrades) {
        console.log(`Training: Showing ${upgrades.length} upgrade(s)`);

        // Create sparkle animations for each upgrade
        upgrades.forEach(upgrade => {
            this.createSparkleAnimation(upgrade.position, upgrade.zone, upgrade.abilityName);
        });

        // Show summary message
        this.showTrainingSummary(upgrades);

        // Wait for animations to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
    },

    // Create sparkle animation for a specific ability zone
    createSparkleAnimation(heroPosition, zoneNumber, abilityName) {
        // Find the team slot for this hero
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) {
            console.warn(`Training: Could not find team slot for ${heroPosition}`);
            return;
        }

        // Find the specific ability zone within the slot
        const abilityZone = teamSlot.querySelector(`.ability-zone[data-zone="${zoneNumber}"]`);
        if (!abilityZone) {
            console.warn(`Training: Could not find ability zone ${zoneNumber} for ${heroPosition}`);
            return;
        }

        // Create sparkle container
        const sparkleContainer = document.createElement('div');
        sparkleContainer.className = 'training-sparkle-container';
        
        // Create multiple sparkle elements
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'training-sparkle';
            sparkle.style.animationDelay = `${i * 0.1}s`;
            sparkleContainer.appendChild(sparkle);
        }

        // Create upgrade arrow
        const arrow = document.createElement('div');
        arrow.className = 'training-upgrade-arrow';
        arrow.innerHTML = '↑';
        sparkleContainer.appendChild(arrow);

        // Create upgrade text
        const upgradeText = document.createElement('div');
        upgradeText.className = 'training-upgrade-text';
        upgradeText.textContent = `${this.formatAbilityName(abilityName)} +1`;
        sparkleContainer.appendChild(upgradeText);

        // Position relative to ability zone
        abilityZone.style.position = 'relative';
        abilityZone.appendChild(sparkleContainer);

        // Remove after animation completes
        setTimeout(() => {
            sparkleContainer.remove();
        }, 3000);
    },

    // Show summary message for all Training upgrades
    showTrainingSummary(upgrades) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'training-summary-popup';
        
        const upgradeTexts = upgrades.map(upgrade => 
            `${upgrade.heroName}: ${this.formatAbilityName(upgrade.abilityName)} +1`
        );
        
        summaryDiv.innerHTML = `
            <div class="training-summary-header">
                <h3>Training Results!</h3>
                <p>Your heroes have grown stronger through training!</p>
            </div>
            <div class="training-summary-list">
                ${upgradeTexts.map(text => `<div class="training-upgrade-item">${text}</div>`).join('')}
            </div>
        `;
        
        summaryDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 193, 7, 0.95));
            color: #212529;
            padding: 25px 35px;
            border-radius: 15px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: trainingPopupSlide 0.5s ease-out;
            max-width: 400px;
            text-align: center;
        `;
        
        document.body.appendChild(summaryDiv);
        
        setTimeout(() => {
            summaryDiv.style.animation = 'trainingPopupFade 0.4s ease-out forwards';
            setTimeout(() => summaryDiv.remove(), 400);
        }, 3000);
    },

    // Format ability name for display (convert camelCase to spaced)
    formatAbilityName(abilityName) {
        if (!abilityName || typeof abilityName !== 'string') {
            return abilityName;
        }
        
        return abilityName.replace(/([a-z])([A-Z])/g, '$1 $2');
    },

    // Hook into the hero selection system to trigger after battle
    initializeTrainingSystem() {
        if (!window.heroSelection) {
            console.warn('Training: Hero selection not available, deferring initialization');
            setTimeout(() => this.initializeTrainingSystem(), 1000);
            return;
        }

        // Check if already initialized to prevent double-wrapping
        if (window.heroSelection.returnToFormationScreenAfterBattle._trainingWrapped) {
            console.log('Training: System already initialized, skipping');
            return;
        }

        // Store original returnToFormationScreenAfterBattle method
        const originalReturn = window.heroSelection.returnToFormationScreenAfterBattle;
        
        // Wrap it with Training processing
        window.heroSelection.returnToFormationScreenAfterBattle = async function() {
            // Call original method first
            await originalReturn.call(this);
            
            // Add a short delay to ensure UI is ready
            setTimeout(async () => {
                await window.trainingAbility.processTrainingUpgrades();
            }, 500);
        };

        // Mark as wrapped to prevent double-wrapping
        window.heroSelection.returnToFormationScreenAfterBattle._trainingWrapped = true;

        console.log('Training: System initialized successfully');
    }
};

// Initialize the Training system when the module loads
if (typeof window !== 'undefined') {
    window.trainingAbility = trainingAbility;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            trainingAbility.initializeTrainingSystem();
        });
    } else {
        trainingAbility.initializeTrainingSystem();
    }
}

// CSS for Training animations
if (typeof document !== 'undefined' && !document.getElementById('trainingStyles')) {
    const style = document.createElement('style');
    style.id = 'trainingStyles';
    style.textContent = `
        /* Training sparkle container */
        .training-sparkle-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 1000;
        }
        
        /* Individual sparkle elements */
        .training-sparkle {
            position: absolute;
            width: 8px;
            height: 8px;
            background: radial-gradient(circle, #ffd700, #ffed4e);
            border-radius: 50%;
            animation: trainingSparkle 2s ease-out forwards;
        }
        
        .training-sparkle:nth-child(1) { top: 10%; left: 20%; }
        .training-sparkle:nth-child(2) { top: 20%; right: 15%; }
        .training-sparkle:nth-child(3) { top: 60%; left: 10%; }
        .training-sparkle:nth-child(4) { bottom: 20%; right: 20%; }
        .training-sparkle:nth-child(5) { top: 40%; left: 50%; }
        .training-sparkle:nth-child(6) { top: 80%; left: 60%; }
        .training-sparkle:nth-child(7) { top: 30%; right: 40%; }
        .training-sparkle:nth-child(8) { bottom: 40%; left: 30%; }
        
        /* Upgrade arrow */
        .training-upgrade-arrow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 28px;
            color: #28a745;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(40, 167, 69, 0.8);
            animation: trainingArrowFloat 2s ease-out;
            z-index: 1001;
        }
        
        /* Upgrade text */
        .training-upgrade-text {
            position: absolute;
            top: 70%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 12px;
            color: #28a745;
            font-weight: bold;
            text-shadow: 0 0 8px rgba(40, 167, 69, 0.6);
            animation: trainingTextFloat 2s ease-out;
            white-space: nowrap;
            z-index: 1001;
        }
        
        /* Training summary popup */
        .training-summary-header h3 {
            margin: 0 0 10px 0;
            font-size: 22px;
            color: #212529;
        }
        
        .training-summary-header p {
            margin: 0 0 15px 0;
            font-size: 14px;
            color: #495057;
            font-weight: normal;
        }
        
        .training-summary-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .training-upgrade-item {
            background: rgba(255, 255, 255, 0.3);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
            color: #212529;
        }
        
        /* Animations */
        @keyframes trainingSparkle {
            0% {
                opacity: 0;
                transform: scale(0) rotate(0deg);
                box-shadow: 0 0 0 rgba(255, 215, 0, 0);
            }
            20% {
                opacity: 1;
                transform: scale(1.2) rotate(90deg);
                box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
            }
            80% {
                opacity: 1;
                transform: scale(1) rotate(270deg);
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
            }
            100% {
                opacity: 0;
                transform: scale(0.5) rotate(360deg);
                box-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
            }
        }
        
        @keyframes trainingArrowFloat {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(20px) scale(0.5);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) translateY(0) scale(1.2);
            }
            70% {
                opacity: 1;
                transform: translate(-50%, -50%) translateY(-10px) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(-30px) scale(0.8);
            }
        }
        
        @keyframes trainingTextFloat {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(10px) scale(0.8);
            }
            40% {
                opacity: 1;
                transform: translate(-50%, -50%) translateY(0) scale(1);
            }
            80% {
                opacity: 1;
                transform: translate(-50%, -50%) translateY(-5px) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(-15px) scale(0.9);
            }
        }
        
        @keyframes trainingPopupSlide {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(-30px) scale(0.9);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, -50%) translateY(0) scale(1);
            }
        }
        
        @keyframes trainingPopupFade {
            0% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.1);
            }
        }
    `;
    document.head.appendChild(style);
}