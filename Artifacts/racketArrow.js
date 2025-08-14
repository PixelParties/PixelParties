// racketArrow.js - Racket Arrow Integration
// When hit, displays music notes over target and a random enemy creature, then defeats the random creature

/**
 * Apply RacketArrow integration to the Arrow System
 * @param {ArrowSystem} arrowSystem - The arrow system instance
 * @param {BattleManager} battleManager - The battle manager instance
 */
export function applyRacketArrowIntegration(arrowSystem, battleManager) {
    arrowSystem.registerArrowType({
        name: 'RacketArrow',
        displayName: 'Racket Arrow',
        icon: '🎾🏹',
        damageBonus: 50,
        counterDisplay: {
            background: 'linear-gradient(45deg, #ffeb3b, #ffc107)',
            borderColor: '#ffca28',
            shadowColor: 'rgba(255, 193, 7, 0.6)'
        },
        syncMessageType: 'racket_arrow_impact',
        impactEffect: createRacketArrowImpactEffect, // Use the enhanced version
        customHandler: async (attacker, defender, damage, effect, battleManager) => {
            await handleRacketArrowEffect(attacker, defender, damage, effect, battleManager, arrowSystem);
        }
    });

    console.log('🎾🏹 RacketArrow integrated with ArrowSystem');
}

/**
 * Create music notes visual effect over a target
 * @param {Object} target - The target to show music notes over
 * @param {Object} arrowConfig - Arrow configuration (unused here)
 */
function createMusicNotesVisual(target, arrowConfig) {
    const targetElement = getTargetElement(target);
    if (!targetElement) return;

    // Create music notes container
    const musicContainer = document.createElement('div');
    musicContainer.className = 'racket-arrow-music-notes';
    
    // Music note symbols to cycle through
    const musicNotes = ['🎵', '🎶', '♪', '♫', '🎼'];
    
    // Create multiple floating music notes
    const noteCount = 6;
    for (let i = 0; i < noteCount; i++) {
        const note = document.createElement('div');
        note.className = 'music-note';
        note.innerHTML = musicNotes[i % musicNotes.length];
        
        // Random positioning around the target
        const angle = (360 / noteCount) * i + (Math.random() * 30 - 15);
        const distance = 20 + Math.random() * 25;
        const delay = i * 100; // Stagger the animation
        
        note.style.cssText = `
            position: absolute;
            font-size: ${16 + Math.random() * 8}px;
            animation: musicNoteFloat 2000ms ease-out forwards;
            animation-delay: ${delay}ms;
            --angle: ${angle}deg;
            --distance: ${distance}px;
            z-index: 500;
            opacity: 0;
        `;
        
        musicContainer.appendChild(note);
    }
    
    // Position container at target center
    musicContainer.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 500;
    `;
    
    targetElement.appendChild(musicContainer);
    
    // Clean up after animation
    setTimeout(() => {
        if (musicContainer.parentNode) {
            musicContainer.remove();
        }
    }, 2500); // Animation duration + buffer
}

/**
 * Handle the main RacketArrow effect logic
 * @param {Object} attacker - The attacking hero
 * @param {Object} defender - The defending target
 * @param {number} damage - Damage dealt
 * @param {Object} effect - Effect data
 * @param {BattleManager} battleManager - Battle manager instance
 * @param {ArrowSystem} arrowSystem - Arrow system instance
 */
async function handleRacketArrowEffect(attacker, defender, damage, effect, battleManager, arrowSystem) {
    // Find a random enemy creature
    const randomCreature = findRandomEnemyCreature(attacker, battleManager);
    
    if (randomCreature) {
        // Show music notes over the random creature
        createMusicNotesVisual(randomCreature.creature || randomCreature, effect.arrowConfig);
        
        // Defeat the random creature
        defeatRandomCreature(randomCreature, battleManager);
        
        // Add combat log
        battleManager.addCombatLog(
            `🎾🏹 ${attacker.name}'s Racket Arrow creates a deadly symphony! ${randomCreature.creature?.name || randomCreature.name} is overwhelmed by the music!`,
            'info'
        );
        
        // Network sync for multiplayer
        if (battleManager.isAuthoritative) {
            battleManager.sendBattleUpdate('racket_arrow_impact', {
                targetInfo: arrowSystem.getDefenderSyncInfo(defender), // Use consistent field name
                randomCreatureInfo: getCreatureSyncInfo(randomCreature),
                timestamp: Date.now()
            });
        }
    } else {
        // No random creature found, just sync the target effect
        if (battleManager.isAuthoritative) {
            battleManager.sendBattleUpdate('racket_arrow_impact', {
                targetInfo: arrowSystem.getDefenderSyncInfo(defender), // Use consistent field name
                randomCreatureInfo: null,
                timestamp: Date.now()
            });
        }
    }
}

/**
 * Find a random enemy creature relative to the attacker
 * @param {Object} attacker - The attacking hero
 * @param {BattleManager} battleManager - Battle manager instance
 * @returns {Object|null} Random enemy creature target or null
 */
function findRandomEnemyCreature(attacker, battleManager) {
    const attackerSide = attacker.side;
    const enemySide = attackerSide === 'player' ? 'opponent' : 'player';
    const enemyHeroes = enemySide === 'player' ? 
        battleManager.playerHeroes : 
        battleManager.opponentHeroes;
    
    // Collect all living enemy creatures
    const enemyCreatures = [];
    
    Object.keys(enemyHeroes).forEach(position => {
        const hero = enemyHeroes[position];
        if (hero && hero.alive && hero.creatures) {
            hero.creatures.forEach((creature, index) => {
                if (creature.alive) {
                    enemyCreatures.push({
                        type: 'creature',
                        hero: hero,
                        creature: creature,
                        creatureIndex: index,
                        position: position,
                        side: enemySide
                    });
                }
            });
        }
    });
    
    if (enemyCreatures.length === 0) {
        return null; // No enemy creatures available
    }
    
    // Return random creature using deterministic randomness
    const randomIndex = battleManager.getRandomInt(0, enemyCreatures.length - 1);
    return enemyCreatures[randomIndex];
}

/**
 * Defeat a random creature by applying massive damage
 * @param {Object} creatureTarget - The creature target to defeat
 * @param {BattleManager} battleManager - Battle manager instance
 */
function defeatRandomCreature(creatureTarget, battleManager) {
    if (!battleManager.isAuthoritative) return; // Only host can apply damage
    
    const { hero, creature, creatureIndex, position, side } = creatureTarget;
    
    // Apply massive damage to guarantee defeat
    const massiveDamage = 999999;
    
    battleManager.authoritative_applyDamageToCreature({
        hero: hero,
        creature: creature,
        creatureIndex: creatureIndex,
        damage: massiveDamage,
        position: position,
        side: side
    }, {
        source: 'racket_arrow',
        attacker: null // No specific attacker for this effect
    });
}

/**
 * Get creature sync info for network synchronization
 * @param {Object} creatureTarget - Creature target object
 * @returns {Object} Sync info for the creature
 */
function getCreatureSyncInfo(creatureTarget) {
    return {
        type: 'creature',
        absoluteSide: creatureTarget.hero.absoluteSide,
        position: creatureTarget.position,
        creatureIndex: creatureTarget.creatureIndex,
        name: creatureTarget.creature.name
    };
}

/**
 * Get target element for visual effects (helper function)
 * @param {Object} target - Target object
 * @returns {HTMLElement|null} Target DOM element
 */
function getTargetElement(target) {
    // This is a simplified version - in practice, you'd use the arrowSystem's method
    if (target.type === 'hero' || !target.type) {
        // For heroes, find the hero element
        const side = target.side || (target.absoluteSide === 'host' ? 'player' : 'opponent');
        return document.querySelector(`.${side}-slot.${target.position}-slot`);
    } else {
        // For creatures, find the creature element
        const side = target.side || (target.hero?.absoluteSide === 'host' ? 'player' : 'opponent');
        const position = target.position || target.hero?.position;
        const creatureIndex = target.creatureIndex;
        
        return document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }
}

/**
 * Enhanced impact effect for RacketArrow that handles both target and random creature
 * @param {Object} target - The target that was hit
 * @param {Object} arrowConfig - Arrow configuration
 * @param {Object} data - Additional data from network sync (for guest side)
 */
function createRacketArrowImpactEffect(target, arrowConfig, data = null) {
    // Always show music notes over the original target
    createMusicNotesVisual(target, arrowConfig);
    
    // If we have network sync data (guest side), also show effect over random creature
    if (data && data.randomCreatureInfo) {
        // We need the arrow system to find the creature, but we don't have direct access
        // So we'll use a simple DOM-based approach
        const randomCreature = findCreatureFromSyncInfo(data.randomCreatureInfo);
        if (randomCreature) {
            createMusicNotesVisual(randomCreature, arrowConfig);
        }
    }
}

/**
 * Simple helper to find creature from sync info (guest side only)
 */
function findCreatureFromSyncInfo(creatureInfo) {
    if (!creatureInfo) return null;
    
    // Determine local side based on current battle manager state
    const battleManager = window.battleManager; // Access global battle manager
    if (!battleManager) return null;
    
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const localSide = (creatureInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    
    if (creatureInfo.type === 'creature') {
        const heroes = localSide === 'player' ? 
            battleManager.playerHeroes : 
            battleManager.opponentHeroes;
        const hero = heroes[creatureInfo.position];
        return hero?.creatures?.[creatureInfo.creatureIndex];
    }
    
    return null;
}

// Ensure CSS for music note animations
function ensureRacketArrowCSS() {
    if (document.getElementById('racketArrowCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'racketArrowCSS';
    style.textContent = `
        @keyframes musicNoteFloat {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2) rotate(10deg);
            }
            80% {
                opacity: 1;
                transform: 
                    translate(
                        calc(-50% + var(--distance) * cos(var(--angle))), 
                        calc(-50% + var(--distance) * sin(var(--angle)) - 30px)
                    ) 
                    scale(1) 
                    rotate(20deg);
            }
            100% {
                opacity: 0;
                transform: 
                    translate(
                        calc(-50% + var(--distance) * cos(var(--angle))), 
                        calc(-50% + var(--distance) * sin(var(--angle)) - 50px)
                    ) 
                    scale(0.5) 
                    rotate(30deg);
            }
        }
        
        .racket-arrow-music-notes {
            will-change: transform, opacity;
        }
        
        .music-note {
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center;
            will-change: transform, opacity;
            filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.8));
            font-weight: bold;
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize CSS when the module loads
if (typeof document !== 'undefined') {
    ensureRacketArrowCSS();
}