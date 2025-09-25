// ./Creatures/cuteBird.js - CuteBird Creature that has a chance to evolve into CutePhoenix after battle

export class CuteBirdCreature {
    constructor(heroSelection) {
        this.heroSelection = heroSelection;
        
        console.log('🐦 CuteBird Creature module initialized');
    }

    // Check if a creature is CuteBird
    static isCuteBird(creatureName) {
        return creatureName === 'CuteBird';
    }

    // Process post-battle evolution for all CuteBirds
    async processPostBattleEvolution(heroSelection) {
        if (!heroSelection || !heroSelection.heroCreatureManager) {
            console.error('🐦 Cannot process CuteBird evolution - invalid heroSelection');
            return;
        }

        const formation = heroSelection.formationManager.getBattleFormation();
        let evolutionOccurred = false;
        const evolutionResults = [];

        // Check each hero position
        ['left', 'center', 'right'].forEach(position => {
            if (!formation[position]) return;

            const creatures = heroSelection.heroCreatureManager.getHeroCreatures(position);
            if (!creatures || creatures.length === 0) return;

            // Check each creature for CuteBird
            creatures.forEach((creature, index) => {
                if (creature && creature.name === 'CuteBird') {
                    // Get evolution chance (base 10% + CuteCrown bonuses)
                    let evolutionChance = 0.1; // Base 10% chance
                    
                    // Check for CuteCrown bonuses if the effect system is available
                    if (window.cuteCrownEffect && window.cuteCrownEffect.isInitialized) {
                        evolutionChance = window.cuteCrownEffect.getEvolutionChanceForHero(position);
                    }
                    
                    const evolutionRoll = Math.random();
                    
                    if (evolutionRoll < evolutionChance) {
                        const chancePercent = Math.round(evolutionChance * 100);
                        console.log(`🦅 CuteBird at ${position}[${index}] is evolving! (roll: ${evolutionRoll.toFixed(3)}, chance: ${chancePercent}%)`);
                        
                        evolutionResults.push({
                            position: position,
                            index: index,
                            heroName: formation[position].name
                        });
                    } else {
                        const chancePercent = Math.round(evolutionChance * 100);
                        console.log(`🦅 CuteBird at ${position}[${index}] did not evolve (roll: ${evolutionRoll.toFixed(3)}, chance: ${chancePercent}%)`);
                    }
                }
            });
        });

        // Process all evolutions
        if (evolutionResults.length > 0) {
            // Process evolutions in reverse order to maintain indices
            evolutionResults.sort((a, b) => b.index - a.index);

            for (const evolution of evolutionResults) {
                // Remove the CuteBird
                heroSelection.heroCreatureManager.removeCreatureFromHero(evolution.position, evolution.index);
                
                // Add CutePhoenix at the same position
                // We need to insert at the specific index, not just append
                const heroCreatures = heroSelection.heroCreatureManager.heroCreatures[evolution.position];
                const cardInfo = heroSelection.getCardInfo('CutePhoenix');
                
                if (cardInfo) {
                    // Insert at the same index
                    heroCreatures.splice(evolution.index, 0, {
                        ...cardInfo,
                        addedAt: Date.now(),
                        statusEffects: [],
                        type: 'creature',
                        counters: 0
                    });
                    
                    evolutionOccurred = true;
                    
                    // Show evolution animation/feedback
                    this.showEvolutionFeedback(evolution.position, evolution.index, evolution.heroName);
                    
                    console.log(`🔥 CuteBird evolved into CutePhoenix at ${evolution.position}[${evolution.index}]!`);
                }
            }

            // Trigger state change callback
            if (heroSelection.heroCreatureManager.onStateChange) {
                heroSelection.heroCreatureManager.onStateChange();
            }

            // Save game state
            await heroSelection.saveGameState();
            
            // Send formation update to opponent
            await heroSelection.sendFormationUpdate();

            console.log(`🔥 ${evolutionResults.length} CuteBird(s) evolved into CutePhoenix!`);
        }

        return evolutionOccurred;
    }

    // Show visual feedback for evolution with flame animation
    showEvolutionFeedback(heroPosition, creatureIndex, heroName) {
        // First, inject animation styles if not present
        this.injectEvolutionStyles();
        
        // Animate the creature sprite
        this.animateCreatureEvolution(heroPosition, creatureIndex);
        
        // Show the notification after a short delay
        setTimeout(() => {
            this.showEvolutionNotification(heroPosition, creatureIndex, heroName);
        }, 500);
    }

    // Animate the creature sprite with flame effect
    animateCreatureEvolution(heroPosition, creatureIndex) {
        // Find the creature element
        const creatureElement = document.querySelector(
            `.hero-creatures[data-hero-position="${heroPosition}"] .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) {
            console.warn(`🐦 Could not find creature element at ${heroPosition}[${creatureIndex}] for animation`);
            return;
        }

        // Add combustion class
        creatureElement.classList.add('evolving-bird');
        
        // Create flame overlay
        const flameOverlay = document.createElement('div');
        flameOverlay.className = 'evolution-flame-overlay';
        flameOverlay.innerHTML = `
            <div class="flame-particle flame-1">🔥</div>
            <div class="flame-particle flame-2">🔥</div>
            <div class="flame-particle flame-3">🔥</div>
            <div class="flame-particle flame-4">🔥</div>
            <div class="flame-center">🔥</div>
        `;
        
        creatureElement.appendChild(flameOverlay);
        
        // Remove effects after animation
        setTimeout(() => {
            creatureElement.classList.remove('evolving-bird');
            if (flameOverlay.parentNode) {
                flameOverlay.remove();
            }
        }, 2000);
    }

    // Show evolution notification
    showEvolutionNotification(heroPosition, creatureIndex, heroName) {
        const notification = document.createElement('div');
        notification.className = 'cute-bird-evolution-notification';
        notification.innerHTML = `
            <div class="evolution-content">
                <div class="evolution-icon">🐦 → 🔥</div>
                <div class="evolution-text">
                    ${heroName}'s CuteBird evolved into CutePhoenix!
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #FFE082 0%, #FF6E40 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            z-index: 10000;
            animation: evolutionPulse 2s ease-out;
            box-shadow: 0 4px 20px rgba(255, 110, 64, 0.5);
            pointer-events: none;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 2000);
    }

    // Inject CSS styles for evolution animation
    injectEvolutionStyles() {
        if (document.getElementById('cuteBirdEvolutionStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'cuteBirdEvolutionStyles';
        style.textContent = `
            /* Creature combustion animation */
            .creature-icon.evolving-bird {
                animation: birdCombustion 2s ease-out;
                position: relative;
            }
            
            @keyframes birdCombustion {
                0% {
                    filter: brightness(1) hue-rotate(0deg);
                    transform: scale(1);
                }
                25% {
                    filter: brightness(1.5) hue-rotate(30deg) saturate(2);
                    transform: scale(1.1);
                }
                50% {
                    filter: brightness(2) hue-rotate(60deg) saturate(3) contrast(1.5);
                    transform: scale(1.2);
                }
                75% {
                    filter: brightness(1.8) hue-rotate(40deg) saturate(2.5) contrast(1.2);
                    transform: scale(1.15);
                }
                100% {
                    filter: brightness(1) hue-rotate(0deg);
                    transform: scale(1);
                }
            }
            
            /* Flame overlay container */
            .evolution-flame-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 100;
            }
            
            /* Central flame */
            .flame-center {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 40px;
                animation: flamePulse 2s ease-out;
                filter: blur(2px);
                opacity: 0.8;
            }
            
            /* Flame particles */
            .flame-particle {
                position: absolute;
                font-size: 20px;
                animation: flameRise 2s ease-out;
                filter: blur(1px);
            }
            
            .flame-1 {
                top: 60%;
                left: 20%;
                animation-delay: 0s;
            }
            
            .flame-2 {
                top: 60%;
                right: 20%;
                animation-delay: 0.2s;
            }
            
            .flame-3 {
                top: 70%;
                left: 35%;
                animation-delay: 0.4s;
            }
            
            .flame-4 {
                top: 70%;
                right: 35%;
                animation-delay: 0.6s;
            }
            
            @keyframes flamePulse {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.5);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 0.9;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                }
            }
            
            @keyframes flameRise {
                0% {
                    transform: translateY(0) scale(0);
                    opacity: 0;
                }
                30% {
                    transform: translateY(-10px) scale(1.2);
                    opacity: 1;
                }
                70% {
                    transform: translateY(-30px) scale(0.8);
                    opacity: 0.6;
                }
                100% {
                    transform: translateY(-50px) scale(0.4);
                    opacity: 0;
                }
            }
            
            /* Notification animation */
            @keyframes evolutionPulse {
                0% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.1);
                    opacity: 1;
                }
                40% {
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 0;
                }
            }
            
            .evolution-content {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .evolution-icon {
                font-size: 24px;
                animation: iconSpin 1s ease-in-out;
            }
            
            @keyframes iconSpin {
                0% { transform: rotate(0deg); }
                50% { transform: rotate(360deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Reset for new game
    reset() {
        console.log('🐦 CuteBird module reset');
    }

    // Export state (no persistent state needed for this module)
    exportState() {
        return {};
    }

    // Import state (no persistent state needed for this module)
    importState(state) {
        return true;
    }
}

// Static helper methods
export const CuteBirdHelpers = {
    // Check if any creature in a list is CuteBird
    hasCuteBirdInList(creatures) {
        return creatures.some(creature => CuteBirdCreature.isCuteBird(creature.name));
    },

    // Get all CuteBird creatures from a list
    getCuteBirdsFromList(creatures) {
        return creatures.filter(creature => CuteBirdCreature.isCuteBird(creature.name));
    },

    // Count CuteBirds across all heroes
    countAllCuteBirds(heroSelection) {
        let count = 0;
        ['left', 'center', 'right'].forEach(position => {
            const creatures = heroSelection.heroCreatureManager.getHeroCreatures(position);
            count += creatures.filter(c => c.name === 'CuteBird').length;
        });
        return count;
    }
};

export default CuteBirdCreature;