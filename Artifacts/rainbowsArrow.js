// rainbowsArrow.js - Rainbows Arrow Artifact Implementation
// Provides Rainbows Arrow Counters that enhance attacks with extra damage and gold generation

/**
 * Register RainbowsArrow with the ArrowSystem
 * @param {ArrowSystem} arrowSystem - The arrow system instance
 * @param {BattleManager} battleManager - The battle manager instance
 */
export function registerRainbowsArrow(arrowSystem, battleManager) {
    // Register RainbowsArrow with damage bonus and custom gold handler
    arrowSystem.registerArrowType({
        name: 'RainbowsArrow',
        displayName: 'Rainbows Arrow',
        icon: '🌈🏹',
        
        // Fixed damage bonus of 50
        damageBonus: 50,
        
        statusEffects: [], // No status effects, just damage and gold
        
        counterDisplay: {
            background: 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080)',
            borderColor: '#ffffff',
            shadowColor: 'rgba(255, 255, 255, 0.8)'
        },
        
        syncMessageType: 'rainbows_arrow_impact',
        impactEffect: createRainbowsArrowImpact,
        
        // Custom handler to calculate gold based on total damage dealt
        customHandler: async (attacker, defender, totalDamage, effectData, battleManager) => {
            // Only process on authoritative side (host)
            if (!battleManager.isAuthoritative) return;
            
            // Calculate gold gain: 1 gold per full 50 damage
            const goldGain = Math.floor(totalDamage / 50);
            
            if (goldGain > 0) {
                // Award gold to the attacking player
                if (battleManager.goldManager) {
                    if (attacker.side === 'player') {
                        battleManager.goldManager.addPlayerGold(goldGain, 'rainbows_arrow');
                    } else {
                        battleManager.goldManager.addOpponentGold(goldGain, 'rainbows_arrow');
                    }
                }
                
                // Display gold gain animation above the target
                displayGoldGainAnimation(defender, goldGain, battleManager);
                
                // Add to combat log
                battleManager.addCombatLog(
                    `🌈 Rainbows Arrow grants +${goldGain} gold! (${totalDamage} damage ÷ 50)`,
                    attacker.side === 'player' ? 'success' : 'info'
                );
                
                // Send gold award to guest for synchronization
                battleManager.sendBattleUpdate('rainbows_arrow_gold_award', {
                    attackerAbsoluteSide: attacker.absoluteSide,
                    attackerPosition: attacker.position,
                    defenderInfo: getDefenderSyncInfo(defender, battleManager),
                    goldGain: goldGain,
                    totalDamage: totalDamage,
                    timestamp: Date.now()
                });
            }
        }
    });
    
    console.log('🌈🏹 RainbowsArrow registered with ArrowSystem');
}

/**
 * Create rainbows arrow impact visual effect
 * @param {Object} target - The target being hit
 * @param {Object} arrowConfig - Arrow configuration
 */
function createRainbowsArrowImpact(target, arrowConfig) {
    const targetElement = getTargetElement(target);
    if (!targetElement) return;

    // Create rainbow burst container
    const rainbowBurst = document.createElement('div');
    rainbowBurst.className = 'arrow-impact-effect rainbows-arrow-burst';
    
    // Create rainbow particles with different colors
    const colors = ['#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80', '#00ffff', '#0080ff'];
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'arrow-particle rainbow-particle';
        particle.innerHTML = '✨';
        
        const angle = (360 / particleCount) * i + (Math.random() * 30 - 15);
        const distance = 30 + Math.random() * 20;
        const color = colors[i % colors.length];
        
        particle.style.cssText = `
            position: absolute;
            font-size: ${16 + Math.random() * 8}px;
            animation: rainbowParticleExplosion 1000ms ease-out forwards;
            --angle: ${angle}deg;
            --distance: ${distance}px;
            --color: ${color};
            z-index: 500;
            color: ${color};
            filter: drop-shadow(0 0 8px ${color});
        `;
        
        rainbowBurst.appendChild(particle);
    }

    // Add rainbow waves effect
    const waveCount = 3;
    for (let i = 0; i < waveCount; i++) {
        const wave = document.createElement('div');
        wave.className = 'arrow-particle rainbow-wave';
        wave.innerHTML = '🌈';
        
        const angle = (360 / waveCount) * i + (Math.random() * 60 - 30);
        const distance = 25 + i * 10;
        
        wave.style.cssText = `
            position: absolute;
            font-size: ${20 + i * 4}px;
            animation: rainbowWaveExpansion 1200ms ease-out forwards;
            --angle: ${angle}deg;
            --distance: ${distance}px;
            z-index: 505;
            animation-delay: ${i * 100}ms;
        `;
        
        rainbowBurst.appendChild(wave);
    }

    // Add arrow impact symbol
    const arrowImpact = document.createElement('div');
    arrowImpact.className = 'arrow-impact rainbow-impact';
    arrowImpact.innerHTML = '🏹💥';
    arrowImpact.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 28px;
        z-index: 510;
        animation: rainbowImpactFlash 800ms ease-out forwards;
        filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.9));
    `;
    
    rainbowBurst.appendChild(arrowImpact);

    // Position burst at target center
    rainbowBurst.style.cssText += `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 500;
    `;
    
    targetElement.appendChild(rainbowBurst);
    
    // Add rainbow overlay effect
    const rainbowOverlay = document.createElement('div');
    rainbowOverlay.className = 'arrow-impact-overlay rainbow-overlay';
    rainbowOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle, 
            rgba(255, 0, 0, 0.2) 0%, 
            rgba(255, 128, 0, 0.2) 14%, 
            rgba(255, 255, 0, 0.2) 28%, 
            rgba(0, 255, 0, 0.2) 42%, 
            rgba(0, 255, 255, 0.2) 57%, 
            rgba(0, 0, 255, 0.2) 71%, 
            rgba(255, 0, 255, 0.2) 85%, 
            transparent 100%);
        pointer-events: none;
        z-index: 490;
        animation: rainbowPulse 900ms ease-out forwards;
        mix-blend-mode: screen;
    `;
    
    targetElement.appendChild(rainbowOverlay);
    
    // Clean up after animation
    setTimeout(() => {
        if (rainbowBurst.parentNode) rainbowBurst.remove();
        if (rainbowOverlay.parentNode) rainbowOverlay.remove();
    }, 1200);
}

/**
 * Display gold gain animation above the target
 * @param {Object} target - The target that was hit
 * @param {number} goldGain - Amount of gold gained
 * @param {Object} battleManager - Battle manager instance
 */
export function displayGoldGainAnimation(target, goldGain, battleManager) {
    const targetElement = getTargetElement(target);
    if (!targetElement) return;

    // Create gold gain display
    const goldDisplay = document.createElement('div');
    goldDisplay.className = 'rainbows-gold-gain';
    goldDisplay.innerHTML = `+${goldGain} 🪙`;
    
    goldDisplay.style.cssText = `
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 18px;
        font-weight: bold;
        color: #ffd700;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        z-index: 600;
        pointer-events: none;
        animation: goldGainFloat 1500ms ease-out forwards;
    `;
    
    targetElement.appendChild(goldDisplay);
    
    // Clean up after animation
    setTimeout(() => {
        if (goldDisplay.parentNode) goldDisplay.remove();
    }, 1500);
}

/**
 * Get target element for visual effects
 * @param {Object} target - The target object
 * @returns {Element|null} The target DOM element
 */
function getTargetElement(target) {
    // This function should match the one in ArrowSystem
    // For now, we'll use a simplified version
    if (target.type === 'hero' || !target.type) {
        return document.querySelector(`.${target.side}-slot.${target.position}-slot`);
    } else {
        // Creature target
        const creatureInfo = findCreatureInfo(target);
        if (!creatureInfo) return null;
        
        const { side, position, creatureIndex } = creatureInfo;
        return document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }
}

/**
 * Find creature information (simplified version for visual effects)
 * @param {Object} creature - The creature object
 * @returns {Object|null} Creature info with side, position, and index
 */
function findCreatureInfo(creature) {
    // For visual effects, we can try to get the info from the creature's properties
    // This is a simplified fallback version
    if (creature.side && creature.position !== undefined) {
        return {
            side: creature.side,
            position: creature.position,
            creatureIndex: creature.creatureIndex || 0
        };
    }
    return null;
}

/**
 * Get defender sync info for network updates
 * @param {Object} defender - The defending target
 * @param {Object} battleManager - Battle manager instance
 * @returns {Object} Defender sync information
 */
function getDefenderSyncInfo(defender, battleManager) {
    if (defender.type === 'hero' || !defender.type) {
        return {
            type: 'hero',
            absoluteSide: defender.absoluteSide,
            position: defender.position,
            name: defender.name
        };
    } else {
        // For creatures, we need to find their info
        const creatureInfo = findCreatureInfoForDefender(defender, battleManager);
        if (!creatureInfo) return null;
        
        return {
            type: 'creature',
            absoluteSide: creatureInfo.hero.absoluteSide,
            position: creatureInfo.position,
            creatureIndex: creatureInfo.creatureIndex,
            name: defender.name
        };
    }
}

/**
 * Find creature information for defender sync
 * @param {Object} creature - The creature object
 * @param {Object} battleManager - Battle manager instance
 * @returns {Object|null} Creature info with side, position, and index
 */
function findCreatureInfoForDefender(creature, battleManager) {
    for (const side of ['player', 'opponent']) {
        const heroes = side === 'player' ? 
            battleManager.playerHeroes : 
            battleManager.opponentHeroes;
        
        for (const position of ['left', 'center', 'right']) {
            const hero = heroes[position];
            if (!hero || !hero.creatures) continue;
            
            const creatureIndex = hero.creatures.indexOf(creature);
            if (creatureIndex !== -1) {
                return { hero, side, position, creatureIndex };
            }
        }
    }
    return null;
}

/**
 * Ensure CSS for rainbows arrow effects
 */
export function ensureRainbowsArrowCSS() {
    if (document.getElementById('rainbowsArrowCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'rainbowsArrowCSS';
    style.textContent = `
        @keyframes rainbowParticleExplosion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) rotate(0deg) scale(0);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(180deg) scale(1.3);
            }
            100% {
                opacity: 0;
                transform: 
                    translate(
                        calc(-50% + var(--distance) * cos(var(--angle))), 
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) 
                    rotate(360deg) 
                    scale(0.2);
            }
        }
        
        @keyframes rainbowWaveExpansion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
            }
            50% {
                opacity: 1;
                transform: 
                    translate(
                        calc(-50% + var(--distance) * cos(var(--angle)) * 0.5), 
                        calc(-50% + var(--distance) * sin(var(--angle)) * 0.5)
                    ) 
                    scale(1.2) rotate(180deg);
            }
            100% {
                opacity: 0;
                transform: 
                    translate(
                        calc(-50% + var(--distance) * cos(var(--angle))), 
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) 
                    scale(0.8) rotate(360deg);
            }
        }
        
        @keyframes rainbowImpactFlash {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3) rotate(-15deg);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.4) rotate(10deg);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.1) rotate(0deg);
            }
        }
        
        @keyframes rainbowPulse {
            0% {
                opacity: 0;
                transform: scale(0.6);
            }
            50% {
                opacity: 0.8;
                transform: scale(1.3);
            }
            100% {
                opacity: 0;
                transform: scale(1);
            }
        }
        
        @keyframes goldGainFloat {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(0px) scale(0.8);
            }
            20% {
                opacity: 1;
                transform: translateX(-50%) translateY(-10px) scale(1.2);
            }
            80% {
                opacity: 1;
                transform: translateX(-50%) translateY(-30px) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-50px) scale(0.8);
            }
        }
        
        .rainbows-arrow-burst {
            will-change: transform, opacity;
        }
        
        .rainbow-particle {
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center;
            will-change: transform, opacity;
            text-shadow: 0 0 8px var(--color, #ffffff);
        }
        
        .rainbow-wave {
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center;
            will-change: transform, opacity;
        }
        
        .rainbow-impact {
            will-change: transform, opacity;
        }
        
        .rainbow-overlay {
            will-change: transform, opacity;
        }
        
        .rainbows-gold-gain {
            will-change: transform, opacity;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Apply the RainbowsArrow integration to the arrow system
 * @param {ArrowSystem} arrowSystem - Arrow system instance
 * @param {BattleManager} battleManager - Battle manager instance
 */
export function applyRainbowsArrowIntegration(arrowSystem, battleManager) {
    // Register RainbowsArrow
    registerRainbowsArrow(arrowSystem, battleManager);
    
    // Ensure CSS is loaded
    ensureRainbowsArrowCSS();
    
    console.log('🌈🏹 RainbowsArrow integration completed successfully');
}

// Export for use in the game
export default { 
    registerRainbowsArrow, 
    ensureRainbowsArrowCSS, 
    applyRainbowsArrowIntegration,
    displayGoldGainAnimation
};