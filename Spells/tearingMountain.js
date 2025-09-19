// ./Spells/tearingMountain.js - Tearing Mountain Area Effect Implementation
// Prevents Burned stack consumption and applies self-targeted MountainTearRiver at battle start

export class TearingMountainEffect {
    constructor() {
        this.isActive = false;
        this.playerHasTearingMountain = false;
        this.opponentHasTearingMountain = false;
    }

    // Check if Tearing Mountain should be active at battle start
    checkTearingMountainActive(battleManager) {
        if (!battleManager) return { active: false, playerHas: false, opponentHas: false };

        const playerHasTearingMountain = battleManager.playerAreaCard && 
                                        battleManager.playerAreaCard.name === 'TearingMountain';
        const opponentHasTearingMountain = battleManager.opponentAreaCard && 
                                          battleManager.opponentAreaCard.name === 'TearingMountain';

        const active = playerHasTearingMountain || opponentHasTearingMountain;

        return { 
            active, 
            playerHas: playerHasTearingMountain, 
            opponentHas: opponentHasTearingMountain 
        };
    }

    // Apply Tearing Mountain effects at battle start
    async applyTearingMountainEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) return;

        const tearingMountainCheck = this.checkTearingMountainActive(battleManager);
        
        if (!tearingMountainCheck.active) return;

        this.isActive = true;
        this.playerHasTearingMountain = tearingMountainCheck.playerHas;
        this.opponentHasTearingMountain = tearingMountainCheck.opponentHas;

        // Log the activation
        if (this.playerHasTearingMountain && this.opponentHasTearingMountain) {
            battleManager.addCombatLog(
                `🏔️ Both players have Tearing Mountains! Burned stacks will persist indefinitely!`,
                'warning'
            );
        } else {
            const owner = this.playerHasTearingMountain ? 'Player' : 'Opponent';
            battleManager.addCombatLog(
                `🏔️ ${owner}'s Tearing Mountain rises! Burned stacks will no longer fade!`,
                'warning'
            );
        }

        // Apply the battle start effect: Cast MountainTearRiver on owner's own side
        if (this.playerHasTearingMountain) {
            await this.castSelfTargetedMountainTearRiver(battleManager, 'player');
        }
        
        if (this.opponentHasTearingMountain) {
            await this.castSelfTargetedMountainTearRiver(battleManager, 'opponent');
        }

        // Sync to guest
        this.syncTearingMountainState(battleManager);
    }

    // Cast MountainTearRiver on the owner's own side instead of enemy side
    async castSelfTargetedMountainTearRiver(battleManager, ownerSide) {
        console.log(`🏔️ ${ownerSide} casting self-targeted MountainTearRiver!`);

        // Import MountainTearRiver spell system
        try {
            const { MountainTearRiverSpell } = await import('./mountainTearRiver.js');
            const mountainTearSpell = new MountainTearRiverSpell(battleManager);
            
            // Find all targets on the owner's own side (friendly fire!)
            const allFriendlyTargets = this.findAllFriendlyTargets(battleManager, ownerSide);
            
            if (allFriendlyTargets.length === 0) {
                console.log(`🏔️ ${ownerSide} Tearing Mountain: No valid friendly targets found!`);
                return;
            }
            
            // Calculate burn stacks (using same logic as MountainTearRiver)
            const burnStacks = this.calculateBurnStacksForOwner(battleManager, ownerSide);
            
            // Check resistance for all friendly targets
            const resistanceResults = this.checkResistanceForAllTargets(allFriendlyTargets, battleManager);
            
            // Log the self-targeting effect
            this.logSelfTargetingEffect(battleManager, ownerSide, burnStacks, allFriendlyTargets, resistanceResults);
            
            // Apply burn to all friendly targets
            await this.applyBurnToAllTargets(allFriendlyTargets, burnStacks, battleManager, resistanceResults);
            
            // Play visual effects (reuse MountainTearRiver visuals but on own side)
            await this.playSelfTargetedLavaFlowAnimation(allFriendlyTargets, ownerSide, battleManager, resistanceResults);
            
            console.log(`🏔️ ${ownerSide} Tearing Mountain self-targeting completed!`);
            
        } catch (error) {
            console.error('Error casting self-targeted MountainTearRiver:', error);
        }
    }

    // Find all friendly targets (heroes and creatures on the same side as the area owner)
    findAllFriendlyTargets(battleManager, ownerSide) {
        const targets = [];
        const friendlyHeroes = ownerSide === 'player' 
            ? battleManager.playerHeroes 
            : battleManager.opponentHeroes;
        
        // Add all living friendly heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = friendlyHeroes[position];
            if (hero && hero.alive) {
                targets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: ownerSide
                });
                
                // Add all living creatures of this hero
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            targets.push({
                                type: 'creature',
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: ownerSide
                            });
                        }
                    });
                }
            }
        });
        
        console.log(`🎯 Tearing Mountain found ${targets.length} friendly targets on ${ownerSide} side`);
        return targets;
    }

    // Calculate burn stacks for the area owner (reuse MountainTearRiver logic)
    calculateBurnStacksForOwner(battleManager, ownerSide) {
        const baseBurnStacks = 1;
        
        // Find a hero with DestructionMagic on the owner's side to calculate burn stacks
        const friendlyHeroes = ownerSide === 'player' 
            ? battleManager.playerHeroes 
            : battleManager.opponentHeroes;
        
        let maxDestructionLevel = 0;
        ['left', 'center', 'right'].forEach(position => {
            const hero = friendlyHeroes[position];
            if (hero && hero.alive) {
                const destructionLevel = hero.hasAbility('DestructionMagic') 
                    ? hero.getAbilityStackCount('DestructionMagic') 
                    : 0;
                maxDestructionLevel = Math.max(maxDestructionLevel, destructionLevel);
            }
        });
        
        const effectiveLevel = Math.max(1, maxDestructionLevel);
        const bonusStacks = Math.floor(effectiveLevel / 3);
        const totalStacks = baseBurnStacks + bonusStacks;
        
        console.log(`🏔️ ${ownerSide} Tearing Mountain DestructionMagic level ${maxDestructionLevel} (effective: ${effectiveLevel}): ${totalStacks} burn stacks (${baseBurnStacks} base + ${bonusStacks} bonus)`);
        
        return totalStacks;
    }

    // Check resistance for all targets (reuse MountainTearRiver logic)
    checkResistanceForAllTargets(targets, battleManager) {
        const resistanceMap = new Map();
        
        targets.forEach(target => {
            let resisted = false;
            
            if (battleManager.resistanceManager) {
                if (target.type === 'hero') {
                    resisted = battleManager.resistanceManager.shouldResistSpell(target.hero, 'MountainTearRiver');
                } else if (target.type === 'creature') {
                    resisted = battleManager.resistanceManager.shouldResistAreaSpell(target, 'MountainTearRiver');
                }
            }
            
            const key = this.getTargetKey(target);
            resistanceMap.set(key, resisted);
            
            if (resisted) {
                console.log(`🛡️ Friendly target resisted: ${target.type} at ${target.position}${target.type === 'creature' ? ` (index ${target.creatureIndex})` : ''}`);
            }
        });
        
        return resistanceMap;
    }

    // Get unique key for a target (same as MountainTearRiver)
    getTargetKey(target) {
        if (target.type === 'hero') {
            return `hero_${target.side}_${target.position}`;
        } else {
            return `creature_${target.side}_${target.position}_${target.creatureIndex}`;
        }
    }

    // Apply burn to all friendly targets
    async applyBurnToAllTargets(targets, burnStacks, battleManager, resistanceResults) {
        const burnPromises = [];
        
        targets.forEach((target, index) => {
            const delay = index * 50;
            const targetKey = this.getTargetKey(target);
            const isResisted = resistanceResults.get(targetKey);
            
            const burnPromise = new Promise((resolve) => {
                setTimeout(() => {
                    if (!isResisted) {
                        this.applyBurnToTarget(target, burnStacks, battleManager);
                    }
                    resolve();
                }, battleManager.getSpeedAdjustedDelay(delay));
            });
            
            burnPromises.push(burnPromise);
        });
        
        await Promise.all(burnPromises);
    }

    // Apply burn stacks to a single target
    applyBurnToTarget(target, burnStacks, battleManager) {
        let actualTarget = null;
        
        if (target.type === 'hero') {
            actualTarget = target.hero;
        } else if (target.type === 'creature') {
            actualTarget = target.creature;
        }
        
        if (actualTarget && battleManager.statusEffectsManager) {
            battleManager.statusEffectsManager.applyStatusEffect(actualTarget, 'burned', burnStacks);
            console.log(`🔥 Applied ${burnStacks} burn stacks to friendly ${actualTarget.name}`);
        }
    }

    // Play self-targeted lava flow animation (reuse MountainTearRiver visuals)
    async playSelfTargetedLavaFlowAnimation(targets, ownerSide, battleManager, resistanceResults) {
        console.log(`🏔️ Playing self-targeted lava flow animation on ${ownerSide} side...`);
        
        // Import and reuse MountainTearRiver's visual system
        try {
            const { MountainTearRiverSpell } = await import('./mountainTearRiver.js');
            const mountainTearSpell = new MountainTearRiverSpell(battleManager);
            
            // Ensure CSS is available
            mountainTearSpell.ensureMountainTearRiverCSS();
            
            // Create lava flow targeting the friendly side instead of enemy side
            await this.createSelfTargetedLavaFlow(targets, ownerSide, battleManager, resistanceResults);
            
        } catch (error) {
            console.error('Error playing self-targeted lava animation:', error);
        }
    }

    // Create lava flow on the friendly side
    async createSelfTargetedLavaFlow(targets, ownerSide, battleManager, resistanceResults) {
        const container = document.body;
        
        // Find the friendly side area by looking for hero elements
        const friendlySlots = document.querySelectorAll(`.${ownerSide}-slot`);
        if (friendlySlots.length === 0) {
            console.warn('Could not find friendly slots for self-targeted lava flow');
        }
        
        // Calculate the area to cover for friendly side
        let flowTop = '20%';
        let flowBottom = '80%';
        
        if (friendlySlots.length > 0) {
            let minTop = Infinity;
            let maxBottom = 0;
            
            friendlySlots.forEach(slot => {
                const rect = slot.getBoundingClientRect();
                minTop = Math.min(minTop, rect.top);
                maxBottom = Math.max(maxBottom, rect.bottom);
            });
            
            flowTop = `${(minTop / window.innerHeight) * 100}%`;
            flowBottom = `${(maxBottom / window.innerHeight) * 100}%`;
        }
        
        // Create main lava flow container targeting friendly side
        const lavaFlow = document.createElement('div');
        lavaFlow.className = 'tearing-mountain-lava-flow';
        lavaFlow.style.cssText = `
            position: fixed;
            top: ${flowTop};
            left: 0;
            right: 0;
            bottom: calc(100% - ${flowBottom});
            z-index: 200;
            pointer-events: none;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(139, 0, 0, 0.4) 20%, 
                rgba(178, 34, 34, 0.7) 50%, 
                rgba(220, 20, 60, 0.5) 80%, 
                transparent 100%);
            clip-path: polygon(0% 40%, 100% 35%, 100% 65%, 0% 70%);
            animation: selfTargetedLavaFlow ${battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
            transform: translateX(-100%);
        `;
        
        container.appendChild(lavaFlow);
        
        // Create impact effects on friendly targets
        setTimeout(() => {
            targets.forEach((target, index) => {
                const targetKey = this.getTargetKey(target);
                const isResisted = resistanceResults.get(targetKey);
                
                setTimeout(() => {
                    this.createSelfTargetedImpactEffect(target, isResisted, battleManager);
                }, index * 30);
            });
        }, battleManager.getSpeedAdjustedDelay(400));
        
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, battleManager.getSpeedAdjustedDelay(800)));
        
        // Remove the lava flow
        if (lavaFlow && lavaFlow.parentNode) {
            lavaFlow.remove();
        }
    }

    // Create impact effect on friendly targets
    createSelfTargetedImpactEffect(target, isResisted, battleManager) {
        let targetElement = null;
        
        if (target.type === 'hero') {
            targetElement = battleManager.getHeroElement(target.side, target.position);
        } else if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }
        
        if (!targetElement) return;
        
        const impactEffect = document.createElement('div');
        impactEffect.className = 'tearing-mountain-impact-effect';
        
        if (isResisted) {
            impactEffect.innerHTML = '🛡️✨';
            impactEffect.classList.add('resisted');
        } else {
            impactEffect.innerHTML = '🏔️🔥';
        }
        
        const fontSize = target.type === 'hero' ? '36px' : '24px';
        
        impactEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: ${fontSize};
            z-index: 250;
            pointer-events: none;
            animation: ${isResisted ? 'tearingMountainResisted' : 'tearingMountainImpact'} ${battleManager.getSpeedAdjustedDelay(400)}ms ease-out forwards;
        `;
        
        if (isResisted) {
            impactEffect.style.textShadow = `
                0 0 10px rgba(100, 200, 255, 0.9),
                0 0 20px rgba(150, 150, 255, 0.7),
                0 0 30px rgba(200, 200, 255, 0.5)
            `;
        } else {
            impactEffect.style.textShadow = `
                0 0 15px rgba(139, 0, 0, 0.9),
                0 0 25px rgba(178, 34, 34, 0.7),
                0 0 35px rgba(220, 20, 60, 0.5)
            `;
        }
        
        targetElement.appendChild(impactEffect);
        
        setTimeout(() => {
            if (impactEffect && impactEffect.parentNode) {
                impactEffect.remove();
            }
        }, battleManager.getSpeedAdjustedDelay(400));
    }

    // Log the self-targeting effect
    logSelfTargetingEffect(battleManager, ownerSide, burnStacks, targets, resistanceResults) {
        const logType = ownerSide === 'player' ? 'warning' : 'info';
        
        // Count actual hits vs resisted
        let heroHits = 0, heroResists = 0;
        let creatureHits = 0, creatureResists = 0;
        
        targets.forEach(target => {
            const key = this.getTargetKey(target);
            const resisted = resistanceResults.get(key);
            
            if (target.type === 'hero') {
                if (resisted) heroResists++;
                else heroHits++;
            } else {
                if (resisted) creatureResists++;
                else creatureHits++;
            }
        });
        
        // Build description of what was hit
        const parts = [];
        if (heroHits > 0) {
            parts.push(`${heroHits} hero${heroHits > 1 ? 'es' : ''}`);
        }
        if (creatureHits > 0) {
            parts.push(`${creatureHits} creature${creatureHits > 1 ? 's' : ''}`);
        }
        
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        let message = `🏔️ ${ownerName}'s Tearing Mountain erupts inward`;
        
        if (parts.length > 0) {
            message += `, burning their own ${parts.join(' and ')} with ${burnStacks} stack${burnStacks > 1 ? 's' : ''} each!`;
        } else {
            message += `, but all friendly targets resisted the self-inflicted molten flow!`;
        }
        
        battleManager.addCombatLog(message, logType);
        
        // Add resistance info if any
        if (heroResists > 0 || creatureResists > 0) {
            const resistParts = [];
            if (heroResists > 0) {
                resistParts.push(`${heroResists} hero${heroResists > 1 ? 'es' : ''}`);
            }
            if (creatureResists > 0) {
                resistParts.push(`${creatureResists} creature${creatureResists > 1 ? 's' : ''}`);
            }
            
            if (parts.length > 0) {
                battleManager.addCombatLog(
                    `🛡️ ${resistParts.join(' and ')} resisted the self-targeting spell!`,
                    'info'
                );
            }
        }

        // Send to guest
        this.syncSelfTargetingEffect(battleManager, ownerSide, burnStacks, heroHits, heroResists, creatureHits, creatureResists);
    }

    // Sync Tearing Mountain state to guest
    syncTearingMountainState(battleManager) {
        battleManager.sendBattleUpdate('tearing_mountain_active', {
            isActive: this.isActive,
            playerHas: this.playerHasTearingMountain,
            opponentHas: this.opponentHasTearingMountain,
            timestamp: Date.now()
        });
    }

    // Sync self-targeting effect to guest
    syncSelfTargetingEffect(battleManager, ownerSide, burnStacks, heroHits, heroResists, creatureHits, creatureResists) {
        battleManager.sendBattleUpdate('tearing_mountain_self_target', {
            ownerSide: ownerSide,
            burnStacks: burnStacks,
            heroHits: heroHits,
            heroResists: heroResists,
            creatureHits: creatureHits,
            creatureResists: creatureResists,
            timestamp: Date.now()
        });
    }

    // Handle guest-side Tearing Mountain activation
    handleGuestTearingMountainActive(data) {
        if (!data) return;

        this.isActive = data.isActive;
        this.playerHasTearingMountain = data.playerHas;
        this.opponentHasTearingMountain = data.opponentHas;
        
        // Log the activation on guest side
        if (window.battleManager) {
            if (this.playerHasTearingMountain && this.opponentHasTearingMountain) {
                window.battleManager.addCombatLog(
                    `🏔️ Both players have Tearing Mountains! Burned stacks will persist indefinitely!`,
                    'warning'
                );
            } else {
                const owner = this.playerHasTearingMountain ? 'Player' : 'Opponent';
                window.battleManager.addCombatLog(
                    `🏔️ ${owner}'s Tearing Mountain rises! Burned stacks will no longer fade!`,
                    'warning'
                );
            }
        }
    }

    // Handle guest-side self-targeting effect
    handleGuestSelfTargetingEffect(data) {
        if (!data || !window.battleManager) return;

        const { ownerSide, burnStacks, heroHits, heroResists, creatureHits, creatureResists } = data;
        
        const logType = ownerSide === 'player' ? 'warning' : 'info';
        
        // Build description matching host
        const parts = [];
        if (heroHits > 0) {
            parts.push(`${heroHits} hero${heroHits > 1 ? 'es' : ''}`);
        }
        if (creatureHits > 0) {
            parts.push(`${creatureHits} creature${creatureHits > 1 ? 's' : ''}`);
        }
        
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        let message = `🏔️ ${ownerName}'s Tearing Mountain erupts inward`;
        
        if (parts.length > 0) {
            message += `, burning their own ${parts.join(' and ')} with ${burnStacks} stack${burnStacks > 1 ? 's' : ''} each!`;
        } else {
            message += `, but all friendly targets resisted the self-inflicted molten flow!`;
        }
        
        window.battleManager.addCombatLog(message, logType);
        
        // Add resistance info if any
        if (heroResists > 0 || creatureResists > 0) {
            const resistParts = [];
            if (heroResists > 0) {
                resistParts.push(`${heroResists} hero${heroResists > 1 ? 'es' : ''}`);
            }
            if (creatureResists > 0) {
                resistParts.push(`${creatureResists} creature${creatureResists > 1 ? 's' : ''}`);
            }
            
            if (parts.length > 0) {
                window.battleManager.addCombatLog(
                    `🛡️ ${resistParts.join(' and ')} resisted the self-targeting spell!`,
                    'info'
                );
            }
        }
    }

    // Check if burn stack consumption should be prevented
    shouldPreventBurnConsumption(battleManager) {
        if (!this.isActive) {
            // Check if Tearing Mountain became active during battle
            const tearingMountainCheck = this.checkTearingMountainActive(battleManager);
            if (tearingMountainCheck.active) {
                this.isActive = true;
                this.playerHasTearingMountain = tearingMountainCheck.playerHas;
                this.opponentHasTearingMountain = tearingMountainCheck.opponentHas;
            }
        }
        
        return this.isActive;
    }

    // Export state for persistence
    exportState() {
        return {
            isActive: this.isActive,
            playerHasTearingMountain: this.playerHasTearingMountain,
            opponentHasTearingMountain: this.opponentHasTearingMountain
        };
    }

    // Import state from persistence
    importState(state) {
        if (!state) return;
        
        this.isActive = state.isActive || false;
        this.playerHasTearingMountain = state.playerHasTearingMountain || false;
        this.opponentHasTearingMountain = state.opponentHasTearingMountain || false;
    }

    // Cleanup
    cleanup() {
        this.isActive = false;
        this.playerHasTearingMountain = false;
        this.opponentHasTearingMountain = false;
        
        // Remove any remaining visual effects
        const tearingMountainEffects = document.querySelectorAll('.tearing-mountain-lava-flow, .tearing-mountain-impact-effect');
        tearingMountainEffects.forEach(effect => effect.remove());
    }
}

// Export functions for battle manager integration
export async function applyTearingMountainBattleEffects(battleManager) {
    if (!battleManager.tearingMountainEffect) {
        battleManager.tearingMountainEffect = new TearingMountainEffect();
    }
    
    await battleManager.tearingMountainEffect.applyTearingMountainEffects(battleManager);
}

export function handleGuestTearingMountainActive(data, battleManager) {
    if (!battleManager.tearingMountainEffect) {
        battleManager.tearingMountainEffect = new TearingMountainEffect();
    }
    
    battleManager.tearingMountainEffect.handleGuestTearingMountainActive(data);
}

export function handleGuestTearingMountainSelfTarget(data, battleManager) {
    if (!battleManager.tearingMountainEffect) {
        battleManager.tearingMountainEffect = new TearingMountainEffect();
    }
    
    battleManager.tearingMountainEffect.handleGuestSelfTargetingEffect(data);
}

// Global function to check if burn consumption should be prevented
export function shouldPreventBurnConsumption(battleManager) {
    if (!battleManager || !battleManager.tearingMountainEffect) {
        return false;
    }
    
    return battleManager.tearingMountainEffect.shouldPreventBurnConsumption(battleManager);
}

// CSS injection for Tearing Mountain specific animations
if (typeof document !== 'undefined' && !document.getElementById('tearingMountainStyles')) {
    const style = document.createElement('style');
    style.id = 'tearingMountainStyles';
    style.textContent = `
        @keyframes selfTargetedLavaFlow {
            0% { 
                transform: translateX(-100%);
                opacity: 0;
            }
            10% {
                opacity: 0.9;
            }
            20% { 
                transform: translateX(-50%);
                opacity: 1;
            }
            80% { 
                transform: translateX(50%);
                opacity: 1;
            }
            90% {
                opacity: 0.7;
            }
            100% { 
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        @keyframes tearingMountainImpact {
            0% { 
                opacity: 0; 
                transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
            }
            30% { 
                opacity: 1; 
                transform: translate(-50%, -50%) scale(1.4) rotate(180deg); 
            }
            70% { 
                opacity: 0.9; 
                transform: translate(-50%, -50%) scale(1.2) rotate(270deg); 
            }
            100% { 
                opacity: 0; 
                transform: translate(-50%, -50%) scale(1.6) rotate(360deg); 
            }
        }
        
        @keyframes tearingMountainResisted {
            0% { 
                opacity: 0; 
                transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
            }
            30% { 
                opacity: 1; 
                transform: translate(-50%, -50%) scale(1.5) rotate(90deg); 
            }
            70% { 
                opacity: 0.8; 
                transform: translate(-50%, -50%) scale(1.4) rotate(180deg); 
            }
            100% { 
                opacity: 0; 
                transform: translate(-50%, -50%) scale(1.7) rotate(270deg); 
            }
        }
        
        .tearing-mountain-lava-flow {
            will-change: transform, opacity;
        }
        
        .tearing-mountain-impact-effect {
            will-change: transform, opacity;
        }
        
        .tearing-mountain-impact-effect.resisted {
            text-shadow: 
                0 0 10px rgba(100, 200, 255, 0.9),
                0 0 20px rgba(150, 150, 255, 0.7),
                0 0 30px rgba(200, 200, 255, 0.5) !important;
        }
    `;
    
    document.head.appendChild(style);
}

export default TearingMountainEffect;