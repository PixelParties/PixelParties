// stormkissedWaflav.js - StormkissedWaflav Hero Effect Manager

export class StormkissedWaflavEffectManager {
    constructor() {
        this.reset();
    }

    reset() {
        // No persistent state needed for this effect
    }

    // Process post-battle empowerment for StormkissedWaflav
    async processPostBattleEmpowerment(heroSelection) {
        if (!heroSelection || !heroSelection.formationManager) {
            return;
        }

        // Check if player has any StormkissedWaflav heroes
        const formation = heroSelection.formationManager.getBattleFormation();
        const stormkissedPositions = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = formation[position];
            if (hero && hero.name === 'StormkissedWaflav') {
                stormkissedPositions.push(position);
            }
        });

        // If no StormkissedWaflav heroes, no empowerment
        if (stormkissedPositions.length === 0) {
            return;
        }

        // Add 3 evolution counters
        const evolutionGain = 3;
        heroSelection.playerCounters.evolutionCounters += evolutionGain;

        // Show tornado effects for each StormkissedWaflav with delay to ensure UI is ready
        stormkissedPositions.forEach((position, index) => {
            // Stagger the effects slightly for multiple heroes
            setTimeout(() => {
                this.showTornadoEffect(position, evolutionGain);
            }, 100 + (index * 200));
        });

        // Save the updated counters
        if (heroSelection.saveGameState) {
            await heroSelection.saveGameState();
        }

        // Update evolution counter displays
        this.updateEvolutionCounterDisplays();
    }

    // Show tornado effects spiraling around StormkissedWaflav
    showTornadoEffect(heroPosition, evolutionGain) {
        // Find the team slot (more specific selector)
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) {
            console.log(`StormkissedWaflav: Could not find team slot for position ${heroPosition}`);
            return;
        }

        // Find the character image container within the team slot for precise positioning
        const imageContainer = teamSlot.querySelector('.character-image-container');
        const targetElement = imageContainer || teamSlot;

        console.log(`StormkissedWaflav: Showing tornado effect for ${heroPosition}`);

        // Ensure the target has relative positioning
        targetElement.style.position = 'relative';
        targetElement.style.overflow = 'visible';

        // Create tornado effect container
        const tornadoContainer = document.createElement('div');
        tornadoContainer.className = 'stormkissed-tornado-effect';
        tornadoContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            overflow: visible;
        `;

        // Create multiple tornados spinning around the hero
        for (let i = 0; i < 3; i++) {
            const tornado = document.createElement('div');
            tornado.className = `tornado tornado-${i}`;
            
            // Each tornado starts at a different angle around the hero
            const startAngle = i * 120; // 120 degrees apart
            
            tornado.style.cssText = `
                position: absolute;
                width: 8px;
                height: 40px;
                left: 50%;
                top: 50%;
                margin: -20px 0 0 -4px;
                background: linear-gradient(to bottom, 
                    rgba(135, 206, 235, 0.9) 0%,
                    rgba(135, 206, 235, 0.7) 30%,
                    rgba(135, 206, 235, 0.5) 70%,
                    rgba(135, 206, 235, 0.2) 100%);
                border-radius: 50% 50% 10% 10%;
                transform-origin: center bottom;
                animation: tornadoSpin ${2 + i * 0.3}s linear infinite, 
                          tornadoOrbit ${3 + i * 0.5}s linear infinite;
                animation-delay: ${i * 0.2}s;
                filter: drop-shadow(0 0 4px rgba(135, 206, 235, 0.6));
            `;
            
            // Set initial position around the hero
            tornado.style.setProperty('--start-angle', `${startAngle}deg`);
            
            tornadoContainer.appendChild(tornado);
        }

        // Create swirling debris around the tornados
        for (let i = 0; i < 8; i++) {
            const debris = document.createElement('div');
            debris.className = `tornado-debris debris-${i}`;
            
            debris.style.cssText = `
                position: absolute;
                width: 3px;
                height: 3px;
                left: 50%;
                top: 50%;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                animation: debrisOrbit ${2 + Math.random() * 2}s linear infinite;
                animation-delay: ${Math.random() * 2}s;
                filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8));
            `;
            
            tornadoContainer.appendChild(debris);
        }

        // Create central wind vortex
        const vortex = document.createElement('div');
        vortex.className = 'tornado-vortex';
        vortex.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 60px;
            height: 60px;
            margin: -30px 0 0 -30px;
            border: 2px solid rgba(135, 206, 235, 0.3);
            border-radius: 50%;
            border-top-color: rgba(135, 206, 235, 0.8);
            border-right-color: rgba(135, 206, 235, 0.6);
            animation: vortexSpin 1s linear infinite;
        `;
        tornadoContainer.appendChild(vortex);

        // Add the tornado container to the target element
        targetElement.appendChild(tornadoContainer);

        // Remove after animation completes
        setTimeout(() => {
            if (tornadoContainer.parentNode) {
                tornadoContainer.remove();
            }
            console.log(`StormkissedWaflav: Tornado effect completed for ${heroPosition}`);
        }, 4000);

        // Ensure animations are loaded
        this.ensureTornadoAnimations();
    }

    // Ensure tornado animation styles are added to the document
    ensureTornadoAnimations() {
        if (document.getElementById('stormkissedWaflavTornadoAnimations')) {
            return; // Already added
        }

        const style = document.createElement('style');
        style.id = 'stormkissedWaflavTornadoAnimations';
        style.textContent = `
            /* Tornado Spin Animation */
            @keyframes tornadoSpin {
                0% {
                    transform: rotate(0deg) scaleY(1);
                }
                100% {
                    transform: rotate(360deg) scaleY(1.2);
                }
            }

            /* Tornado Orbital Motion */
            @keyframes tornadoOrbit {
                0% {
                    transform: rotate(var(--start-angle, 0deg)) translateY(-30px) rotate(0deg);
                }
                100% {
                    transform: rotate(calc(var(--start-angle, 0deg) + 360deg)) translateY(-30px) rotate(-360deg);
                }
            }

            /* Debris Orbital Motion */
            @keyframes debrisOrbit {
                0% {
                    transform: rotate(0deg) translateX(25px) rotate(0deg);
                    opacity: 0.8;
                }
                50% {
                    transform: rotate(180deg) translateX(35px) rotate(-180deg);
                    opacity: 1;
                }
                100% {
                    transform: rotate(360deg) translateX(25px) rotate(-360deg);
                    opacity: 0.8;
                }
            }

            /* Central Vortex Spin */
            @keyframes vortexSpin {
                0% {
                    transform: rotate(0deg);
                    border-top-color: rgba(135, 206, 235, 0.8);
                    border-right-color: rgba(135, 206, 235, 0.6);
                }
                50% {
                    border-top-color: rgba(255, 255, 255, 0.9);
                    border-right-color: rgba(135, 206, 235, 0.8);
                }
                100% {
                    transform: rotate(360deg);
                    border-top-color: rgba(135, 206, 235, 0.8);
                    border-right-color: rgba(135, 206, 235, 0.6);
                }
            }

            /* Tornado shape enhancements */
            .tornado {
                box-shadow: inset 0 0 10px rgba(135, 206, 235, 0.3);
            }

            .tornado::before {
                content: '';
                position: absolute;
                top: 0;
                left: 50%;
                width: 2px;
                height: 100%;
                background: rgba(255, 255, 255, 0.4);
                transform: translateX(-50%);
                animation: tornadoSpiral 1s linear infinite;
            }

            @keyframes tornadoSpiral {
                0% { transform: translateX(-50%) scaleX(1); }
                25% { transform: translateX(-40%) scaleX(0.8); }
                50% { transform: translateX(-50%) scaleX(0.6); }
                75% { transform: translateX(-60%) scaleX(0.8); }
                100% { transform: translateX(-50%) scaleX(1); }
            }

            /* Ensure the effect doesn't interfere with interactions */
            .stormkissed-tornado-effect {
                pointer-events: none !important;
            }
        `;

        document.head.appendChild(style);
    }

    // Update evolution counter displays across the UI
    updateEvolutionCounterDisplays() {
        // Update any evolution counter displays in the UI
        const evolutionDisplays = document.querySelectorAll('.evolution-counter-display');
        evolutionDisplays.forEach(display => {
            if (window.heroSelection && window.heroSelection.playerCounters) {
                display.textContent = window.heroSelection.playerCounters.evolutionCounters;
            }
        });
    }

    // Export state for saving (minimal state needed)
    exportStormkissedWaflavState() {
        return {
            // No persistent state for this effect
            lastActivated: Date.now()
        };
    }

    // Import state for loading
    importStormkissedWaflavState(stateData) {
        // No persistent state to restore
        return true;
    }
}

// Export singleton instance
export const stormkissedWaflavEffectManager = new StormkissedWaflavEffectManager();