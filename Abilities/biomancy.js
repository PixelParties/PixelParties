// biomancy.js - Biomancy Ability: Converts Potions into BiomancyToken Creatures

export const biomancyAbility = {
    // Handle potion activation interception for Biomancy
    handlePotionActivation(heroSelection, potionCardName) {
        // Check all hero positions for Biomancy ability
        const positions = ['left', 'center', 'right'];
        const biomancyHeroes = [];
        
        for (const position of positions) {
            // Check if there's a hero at this position
            const formation = heroSelection.formationManager.getBattleFormation();
            if (formation[position]) {
                // Check if this hero has Biomancy ability
                const biomancyLevel = heroSelection.heroAbilitiesManager.getAbilityStackCountForPosition(position, 'Biomancy');
                if (biomancyLevel > 0) {
                    biomancyHeroes.push({
                        position: position,
                        level: biomancyLevel,
                        hero: formation[position]
                    });
                }
            }
        }
        
        // If no heroes have Biomancy, allow normal potion processing
        if (biomancyHeroes.length === 0) {
            return false; // Don't intercept
        }
        
        // Inject summoning animation CSS
        this.injectBiomancyAnimationCSS();
        
        // Create BiomancyToken creatures for each Biomancy hero
        for (const biomancyHero of biomancyHeroes) {
            this.createBiomancyToken(heroSelection, biomancyHero.position, biomancyHero.level, potionCardName);
        }
        
        console.log(`Biomancy intercepted ${potionCardName} - created ${biomancyHeroes.length} BiomancyTokens`);
        
        return true; // Intercept - prevent normal graveyard addition
    },
    
    // Create a BiomancyToken creature with HP multiplied by Biomancy level
    createBiomancyToken(heroSelection, heroPosition, biomancyLevel, sourcePotionName) {
        // Get the base card info from database
        const cardInfo = heroSelection.getCardInfo('BiomancyToken');
        if (!cardInfo) {
            console.error('BiomancyToken not found in card database');
            return;
        }
        
        // Calculate multiplied HP
        const baseHp = 10;
        const multipliedHp = baseHp * biomancyLevel;
        
        // Create the BiomancyToken creature object using database info
        const biomancyToken = {
            ...cardInfo,  // Spread all database properties including 'image'
            maxHp: multipliedHp,
            currentHp: multipliedHp,
            hp: multipliedHp,  // Also set hp property for consistency
            description: `Created from ${sourcePotionName} by Biomancy ${biomancyLevel}`,
            addedAt: Date.now(),
            statusEffects: [],
            type: 'creature',
            counters: 0,
            sourcePotion: sourcePotionName,
            biomancyLevel: biomancyLevel,
            isPermanent: true // Mark as permanent for persistence
        };
        
        // Ensure the hero's creatures array exists
        if (!heroSelection.heroCreatureManager.heroCreatures[heroPosition]) {
            heroSelection.heroCreatureManager.heroCreatures[heroPosition] = [];
        }
        
        // Add to the END of the hero's creatures array (so it gets index equal to current length)
        const creatureIndex = heroSelection.heroCreatureManager.heroCreatures[heroPosition].length;
        heroSelection.heroCreatureManager.heroCreatures[heroPosition].push(biomancyToken);
        
        // Notify state change for UI updates and persistence
        if (heroSelection.heroCreatureManager.onStateChange) {
            heroSelection.heroCreatureManager.onStateChange();
        }
        
        // Play summoning animation after UI updates
        setTimeout(() => {
            this.playBiomancySummoningEffect(heroPosition, creatureIndex);
        }, 100);
        
        console.log(`Created BiomancyToken for ${heroPosition} hero with ${multipliedHp} HP (Biomancy ${biomancyLevel})`);
    },
    
    // Play biomancy summoning animation
    playBiomancySummoningEffect(heroPosition, creatureIndex) {
        // Find the BiomancyToken creature element
        const tokenElement = document.querySelector(
            `.team-slot[data-position="${heroPosition}"] .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!tokenElement) {
            console.warn(`Could not find BiomancyToken element at ${heroPosition}[${creatureIndex}] for summoning effect`);
            return;
        }

        // Add summoning class for glow effect
        tokenElement.classList.add('summoning-biomancy');

        // Create summoning circle overlay with green/nature theme
        const summoningEffect = document.createElement('div');
        summoningEffect.className = 'biomancy-summoning-effect';
        summoningEffect.innerHTML = `
            <div class="summoning-circle-biomancy"></div>
            <div class="summoning-particles-biomancy">
                ${Array.from({length: 8}, (_, i) => 
                    `<div class="summon-particle-biomancy particle-${i + 1}"></div>`
                ).join('')}
            </div>
        `;
        
        // Position it over the token
        tokenElement.style.position = 'relative';
        tokenElement.appendChild(summoningEffect);
        
        // Remove effect and class after animation completes
        setTimeout(() => {
            if (summoningEffect.parentNode) {
                summoningEffect.parentNode.removeChild(summoningEffect);
            }
            tokenElement.classList.remove('summoning-biomancy');
        }, 800); // Total animation duration
    },
    
    // Inject CSS for biomancy summoning animations
    injectBiomancyAnimationCSS() {
        if (document.getElementById('biomancySummoningStyles')) {
            return; // Already injected
        }
        
        const style = document.createElement('style');
        style.id = 'biomancySummoningStyles';
        style.textContent = `
            /* Biomancy Summoning Effect - Green/Nature Theme */
            .biomancy-summoning-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }

            /* Summoning Circle - Bright green */
            .summoning-circle-biomancy {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 45px;
                height: 45px;
                border: 3px solid rgba(34, 197, 94, 0.9);
                border-radius: 50%;
                box-shadow: 
                    0 0 20px rgba(34, 197, 94, 0.8),
                    0 0 40px rgba(34, 197, 94, 0.6),
                    inset 0 0 15px rgba(34, 197, 94, 0.4);
                animation: summonCircleAppearBiomancy 0.8s ease-out;
            }

            /* Summoning Particles - Green sparkles */
            .summoning-particles-biomancy {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .summon-particle-biomancy {
                position: absolute;
                width: 4px;
                height: 4px;
                background: #22c55e;
                border-radius: 50%;
                box-shadow: 
                    0 0 6px rgba(34, 197, 94, 1),
                    0 0 12px rgba(34, 197, 94, 0.8);
                animation: summonParticleBiomancy 0.8s ease-out;
            }

            /* Add some leaf-shaped particles for variety */
            .summon-particle-biomancy:nth-child(even) {
                width: 3px;
                height: 3px;
                background: radial-gradient(circle, #22c55e 0%, rgba(34, 197, 94, 0.6) 100%);
            }

            /* Particle Positions - arranged in a circle */
            .summon-particle-biomancy.particle-1 {
                top: 15%;
                left: 50%;
                animation-delay: 0s;
            }
            .summon-particle-biomancy.particle-2 {
                top: 30%;
                left: 75%;
                animation-delay: 0.08s;
            }
            .summon-particle-biomancy.particle-3 {
                top: 50%;
                left: 80%;
                animation-delay: 0.16s;
            }
            .summon-particle-biomancy.particle-4 {
                top: 70%;
                left: 65%;
                animation-delay: 0.24s;
            }
            .summon-particle-biomancy.particle-5 {
                top: 70%;
                left: 35%;
                animation-delay: 0.32s;
            }
            .summon-particle-biomancy.particle-6 {
                top: 50%;
                left: 20%;
                animation-delay: 0.40s;
            }
            .summon-particle-biomancy.particle-7 {
                top: 30%;
                left: 25%;
                animation-delay: 0.48s;
            }
            .summon-particle-biomancy.particle-8 {
                top: 50%;
                left: 50%;
                animation-delay: 0.56s;
            }

            /* Keyframe Animations */
            @keyframes summonCircleAppearBiomancy {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 0;
                    border-color: rgba(34, 197, 94, 0);
                    filter: blur(3px);
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.3) rotate(90deg);
                    opacity: 1;
                    border-color: rgba(34, 197, 94, 1);
                    box-shadow: 
                        0 0 30px rgba(34, 197, 94, 1),
                        0 0 60px rgba(34, 197, 94, 0.8),
                        inset 0 0 20px rgba(34, 197, 94, 0.6);
                    filter: blur(0px);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1) rotate(180deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.7) rotate(360deg);
                    opacity: 0;
                    border-color: rgba(34, 197, 94, 0);
                    filter: blur(2px);
                }
            }

            @keyframes summonParticleBiomancy {
                0% {
                    transform: scale(0) translateY(15px);
                    opacity: 0;
                    filter: brightness(2);
                }
                30% {
                    transform: scale(1.8) translateY(0);
                    opacity: 1;
                    box-shadow: 
                        0 0 10px rgba(34, 197, 94, 1),
                        0 0 20px rgba(34, 197, 94, 0.8);
                    filter: brightness(1.5);
                }
                70% {
                    transform: scale(1) translateY(-8px);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(0) translateY(-20px);
                    opacity: 0;
                    filter: brightness(0.5);
                }
            }

            /* Add green glow to biomancy token during summoning */
            .creature-icon.summoning-biomancy {
                animation: biomancySummonGlow 0.8s ease-out;
            }

            .creature-icon.summoning-biomancy .creature-sprite {
                filter: brightness(1.5) drop-shadow(0 0 15px rgba(34, 197, 94, 0.8));
            }

            @keyframes biomancySummonGlow {
                0% {
                    filter: brightness(2) drop-shadow(0 0 20px rgba(34, 197, 94, 1));
                    transform: scale(0.8);
                }
                50% {
                    filter: brightness(1.8) drop-shadow(0 0 25px rgba(34, 197, 94, 0.9));
                    transform: scale(1.05);
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(34, 197, 94, 0));
                    transform: scale(1);
                }
            }
        `;
        
        document.head.appendChild(style);
    },
    
    // Reset method for consistency with other abilities
    reset() {
        // Biomancy doesn't need turn-based reset since it creates permanent creatures
    }
};

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.biomancyAbility = biomancyAbility;
}