// bombArrow.js - Bomb Arrow Artifact
// Provides explosive arrow counters with +50 damage and area explosion effect

/**
 * Apply Bomb Arrow integration to the Arrow System
 * @param {ArrowSystem} arrowSystem - The arrow system to integrate with
 * @param {BattleManager} battleManager - The battle manager instance
 */
export function applyBombArrowIntegration(arrowSystem, battleManager) {
    // Register Bomb Arrow with the arrow system
    arrowSystem.registerArrowType({
        name: 'BombArrow',
        displayName: 'Bomb Arrow',
        icon: '💣🏹',
        damageBonus: 50,
        statusEffects: [], // Pure damage, no status effects
        counterDisplay: {
            background: 'linear-gradient(45deg, #ff4500, #ff8c00)',
            borderColor: '#ff6347',
            shadowColor: 'rgba(255, 69, 0, 0.8)'
        },
        syncMessageType: 'bomb_arrow_impact',
        impactEffect: createBombArrowImpact.bind(null, battleManager)
    });

    console.log('💣🏹 Bomb Arrow integrated with Arrow System');
}

/**
 * Create explosive impact effect for Bomb Arrow
 * @param {BattleManager} battleManager - Battle manager for timing and utilities
 * @param {Object} target - The target that was hit
 * @param {Object} arrowConfig - Arrow configuration
 */
function createBombArrowImpact(battleManager, target, arrowConfig) {
    const targetElement = getTargetElement(target, battleManager);
    if (!targetElement) return;

    // Find the slot container (hero slot) for the explosion
    const slotElement = targetElement.closest('.player-slot, .opponent-slot') || 
                      targetElement.closest('[class*="-slot"]');
    
    if (!slotElement) {
        console.warn('Could not find slot element for bomb explosion');
        return;
    }

    // Create explosion animation that fills the entire slot
    createExplosionAnimation(slotElement, battleManager);
    
    // Apply area damage to all targets in the same slot
    if (battleManager.isAuthoritative) {
        applyAreaDamage(target, battleManager);
    }
}

/**
 * Create explosion animation that fills the entire slot
 * @param {Element} slotElement - The slot container element
 * @param {BattleManager} battleManager - Battle manager instance
 */
function createExplosionAnimation(slotElement, battleManager) {
    // Create explosion overlay
    const explosionOverlay = document.createElement('div');
    explosionOverlay.className = 'bomb-arrow-explosion';
    
    // Create multiple explosion particles
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'explosion-particle';
        particle.innerHTML = '💥';
        
        const angle = (360 / particleCount) * i + (Math.random() * 30 - 15);
        const distance = 30 + Math.random() * 40;
        const delay = Math.random() * 200;
        
        particle.style.cssText = `
            position: absolute;
            font-size: ${20 + Math.random() * 15}px;
            animation: explosionParticleBlast ${battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
            animation-delay: ${battleManager.getSpeedAdjustedDelay(delay)}ms;
            --angle: ${angle}deg;
            --distance: ${distance}px;
            z-index: 520;
        `;
        
        explosionOverlay.appendChild(particle);
    }
    
    // Create central explosion blast
    const centralBlast = document.createElement('div');
    centralBlast.className = 'explosion-blast';
    centralBlast.innerHTML = '💥';
    centralBlast.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 60px;
        z-index: 525;
        animation: explosionBlastPulse ${battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
    `;
    
    explosionOverlay.appendChild(centralBlast);
    
    // Position explosion to fill entire slot
    explosionOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 520;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    slotElement.appendChild(explosionOverlay);
    
    // Add fiery glow overlay that fills the slot
    const glowOverlay = document.createElement('div');
    glowOverlay.className = 'bomb-arrow-glow';
    glowOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle, rgba(255, 69, 0, 0.4) 0%, rgba(255, 140, 0, 0.2) 50%, transparent 80%);
        pointer-events: none;
        z-index: 515;
        animation: explosionGlowPulse ${battleManager.getSpeedAdjustedDelay(700)}ms ease-out forwards;
    `;
    
    slotElement.appendChild(glowOverlay);
    
    // Clean up after animation
    setTimeout(() => {
        if (explosionOverlay.parentNode) explosionOverlay.remove();
        if (glowOverlay.parentNode) glowOverlay.remove();
    }, battleManager.getSpeedAdjustedDelay(1000));
}

/**
 * Apply area damage to all targets in the same slot
 * @param {Object} originalTarget - The target that was initially hit
 * @param {BattleManager} battleManager - Battle manager instance
 */
function applyAreaDamage(originalTarget, battleManager) {
    // Find all targets in the same slot as the original target
    const targetsInSlot = findAllTargetsInSameSlot(originalTarget, battleManager);
    
    console.log(`💣 Bomb Arrow explosion affects ${targetsInSlot.length} targets in slot`);
    
    // DELAY the area damage to let the initial explosion animation start
    // This prevents damage numbers from being immediately covered by explosion effects
    setTimeout(() => {
        // Apply 50 damage to each target (including the original target again for the explosion)
        targetsInSlot.forEach(target => {
            const explosionDamage = 50;
            
            if (target.type === 'hero') {
                // Apply damage to hero
                battleManager.authoritative_applyDamage({
                    target: target.hero,
                    damage: explosionDamage,
                    newHp: Math.max(0, target.hero.currentHp - explosionDamage),
                    died: (target.hero.currentHp - explosionDamage) <= 0
                }, {
                    source: 'bomb_explosion',
                    attacker: null // No specific attacker for area damage
                });
                
                console.log(`💥 Explosion deals ${explosionDamage} damage to ${target.hero.name}`);
                
            } else if (target.type === 'creature') {
                // Apply damage to creature
                battleManager.authoritative_applyDamageToCreature({
                    hero: target.hero,
                    creature: target.creature,
                    creatureIndex: target.creatureIndex,
                    damage: explosionDamage,
                    position: target.position,
                    side: target.side
                }, {
                    source: 'bomb_explosion',
                    attacker: null // No specific attacker for area damage
                });
                
                console.log(`💥 Explosion deals ${explosionDamage} damage to ${target.creature.name}`);
            }
        });
        
        // Send explosion effect to guest for visual sync
        battleManager.sendBattleUpdate('bomb_arrow_explosion', {
            targetInfo: getTargetSyncInfo(originalTarget, battleManager),
            affectedTargets: targetsInSlot.length,
            timestamp: Date.now()
        });
        
    }, battleManager.getSpeedAdjustedDelay(200)); // 200ms delay to let explosion animation start
}

/**
 * Find all targets (hero + creatures) in the same slot as the original target
 * @param {Object} originalTarget - The original target
 * @param {BattleManager} battleManager - Battle manager instance
 * @returns {Array} Array of all targets in the same slot
 */
function findAllTargetsInSameSlot(originalTarget, battleManager) {
    const targets = [];
    
    // Determine which slot (hero position) we're dealing with
    let targetPosition, targetSide;
    
    if (originalTarget.type === 'hero' || !originalTarget.type) {
        targetPosition = originalTarget.position;
        targetSide = originalTarget.side;
    } else {
        // For creatures, find their hero's position
        const creatureInfo = findCreatureInfo(originalTarget, battleManager);
        if (!creatureInfo) return targets;
        
        targetPosition = creatureInfo.position;
        targetSide = creatureInfo.side;
    }
    
    // Get the hero at this position
    const heroes = targetSide === 'player' ? 
        battleManager.playerHeroes : 
        battleManager.opponentHeroes;
    
    const hero = heroes[targetPosition];
    if (!hero || !hero.alive) return targets;
    
    // Add the hero as a target
    targets.push({
        type: 'hero',
        hero: hero,
        position: targetPosition,
        side: targetSide
    });
    
    // Add all living creatures of this hero as targets
    if (hero.creatures) {
        hero.creatures.forEach((creature, index) => {
            if (creature.alive) {
                targets.push({
                    type: 'creature',
                    hero: hero,
                    creature: creature,
                    creatureIndex: index,
                    position: targetPosition,
                    side: targetSide
                });
            }
        });
    }
    
    return targets;
}

/**
 * Get target element for visual effects
 * @param {Object} target - The target object
 * @param {BattleManager} battleManager - Battle manager instance
 * @returns {Element|null} Target DOM element
 */
function getTargetElement(target, battleManager) {
    if (target.type === 'hero' || !target.type) {
        return battleManager.getHeroElement(target.side, target.position);
    } else {
        const creatureInfo = findCreatureInfo(target, battleManager);
        if (!creatureInfo) return null;
        
        const { side, position, creatureIndex } = creatureInfo;
        return document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }
}

/**
 * Find creature information for targeting
 * @param {Object} creature - The creature object
 * @param {BattleManager} battleManager - Battle manager instance
 * @returns {Object|null} Creature info object
 */
function findCreatureInfo(creature, battleManager) {
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
 * Get target sync info for network updates
 * @param {Object} target - The target object
 * @param {BattleManager} battleManager - Battle manager instance
 * @returns {Object} Sync info object
 */
function getTargetSyncInfo(target, battleManager) {
    if (target.type === 'hero' || !target.type) {
        return {
            type: 'hero',
            absoluteSide: target.absoluteSide,
            position: target.position,
            name: target.name
        };
    } else {
        const creatureInfo = findCreatureInfo(target, battleManager);
        if (!creatureInfo) return null;
        
        return {
            type: 'creature',
            absoluteSide: creatureInfo.hero.absoluteSide,
            position: creatureInfo.position,
            creatureIndex: creatureInfo.creatureIndex,
            name: target.name
        };
    }
}

// Ensure CSS for bomb arrow effects
export function ensureBombArrowCSS() {
    if (document.getElementById('bombArrowCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'bombArrowCSS';
    style.textContent = `
        /* Existing explosion animations... */
        @keyframes explosionParticleBlast {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) rotate(0deg) scale(0);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(90deg) scale(1.5);
            }
            100% {
                opacity: 0;
                transform: 
                    translate(
                        calc(-50% + var(--distance) * cos(var(--angle))), 
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) 
                    rotate(180deg) 
                    scale(0.3);
            }
        }
        
        @keyframes explosionBlastPulse {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(2);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(3);
            }
        }
        
        @keyframes explosionGlowPulse {
            0% {
                opacity: 0;
                transform: scale(0.5);
            }
            40% {
                opacity: 0.8;
                transform: scale(1.2);
            }
            100% {
                opacity: 0;
                transform: scale(1);
            }
        }
        
        .bomb-arrow-explosion {
            will-change: transform, opacity;
        }
        
        .explosion-particle {
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center;
            will-change: transform, opacity;
            filter: drop-shadow(0 0 8px rgba(255, 69, 0, 1));
        }
        
        .explosion-blast {
            will-change: transform, opacity;
            filter: drop-shadow(0 0 15px rgba(255, 69, 0, 1));
        }
        
        .bomb-arrow-glow {
            will-change: transform, opacity;
            mix-blend-mode: screen;
        }
        
        /* NEW: Ensure damage numbers appear above explosion effects */
        .damage-number {
            z-index: 600 !important; /* Higher than explosion effects (520-525) */
        }
        
        .creature-damage-number {
            z-index: 600 !important; /* Higher than explosion effects (520-525) */
        }
    `;
    
    document.head.appendChild(style);
}

// Auto-inject CSS when module loads
if (typeof document !== 'undefined') {
    ensureBombArrowCSS();
}