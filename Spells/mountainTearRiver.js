// ./Spells/mountainTearRiver.js - Mountain Tear River Spell Implementation

export class MountainTearRiverSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'MountainTearRiver';
        this.displayName = 'Mountain Tear River';
        
        console.log('🌋 MountainTearRiver spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute MountainTearRiver spell effect
    async executeSpell(caster, spell) {
        console.log(`🌋 ${caster.name} casting ${this.displayName}!`);

        // ============================================
        // STORM RING NEGATION CHECK
        // ============================================
        try {
            const { checkStormRingNegation } = await import('../Artifacts/stormRing.js');
            const negationResult = await checkStormRingNegation(caster, spell, this.battleManager);
            
            if (negationResult.negated) {
                console.log(`⛈️ ${spell.name} was negated by Storm Ring!`);
                return; // Spell negated - exit without executing
            }
        } catch (error) {
            console.log('Storm Ring check failed, continuing with spell execution:', error);
        }
        
        
        // Calculate burn stacks based on DestructionMagic level
        const burnStacks = this.calculateBurnStacks(caster);
        
        // Find all enemy targets
        const allTargets = this.findAllEnemyTargets(caster);
        
        if (allTargets.length === 0) {
            console.log(`🌋 ${this.displayName}: No valid targets found!`);
            return;
        }
        
        // Pass caster to resistance check for Ida effect
        const resistanceResults = this.checkResistanceForAllTargets(allTargets, caster);
        
        // Log the spell effect with resistance info
        this.logSpellEffect(caster, burnStacks, allTargets, resistanceResults);
        
        // Start visual effects and burn application
        const animationPromise = this.playLavaFlowAnimation(allTargets, caster, resistanceResults);
        const burnPromise = this.applyBurnToAllTargets(allTargets, burnStacks, caster, resistanceResults);
        
        // Wait for both to complete
        await Promise.all([animationPromise, burnPromise]);
        
        console.log(`🌋 ${this.displayName} completed!`);
    }

    // ============================================
    // RESISTANCE CHECKING
    // ============================================

    // Check resistance for all targets upfront (same as FlameAvalanche)
    checkResistanceForAllTargets(targets, caster) {
        const resistanceMap = new Map();
        
        targets.forEach(target => {
            let resisted = false;
            
            // Pass caster to resistance manager for Ida effect
            if (this.battleManager.resistanceManager) {
                if (target.type === 'hero') {
                    resisted = this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
                } else if (target.type === 'creature') {
                    // For area spells, shouldResistAreaSpell handles creatures differently
                    resisted = this.battleManager.resistanceManager.shouldResistAreaSpell(target, this.spellName, caster);
                }
            }
            
            // Create a unique key for each target
            const key = this.getTargetKey(target);
            resistanceMap.set(key, resisted);
            
            if (resisted) {
                console.log(`🛡️ Target resisted: ${target.type} at ${target.position}${target.type === 'creature' ? ` (index ${target.creatureIndex})` : ''}`);
            }
        });
        
        return resistanceMap;
    }

    // Get unique key for a target
    getTargetKey(target) {
        if (target.type === 'hero') {
            return `hero_${target.side}_${target.position}`;
        } else {
            return `creature_${target.side}_${target.position}_${target.creatureIndex}`;
        }
    }

    // ============================================
    // BURN STACK CALCULATION
    // ============================================

    // Calculate burn stacks: 1 + floor(DestructionMagic level / 3)
    calculateBurnStacks(caster) {
        const baseBurnStacks = 1;
        
        // Get DestructionMagic level
        const destructionLevel = caster.hasAbility('DestructionMagic') 
            ? caster.getAbilityStackCount('DestructionMagic') 
            : 0;
        
        // Add 1 stack for every 3 levels of DestructionMagic
        const bonusStacks = Math.floor(destructionLevel / 3);
        const totalStacks = baseBurnStacks + bonusStacks;
        
        console.log(`🌋 ${caster.name} DestructionMagic level ${destructionLevel}: ${totalStacks} burn stacks (${baseBurnStacks} base + ${bonusStacks} bonus)`);
        
        return totalStacks;
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find all enemy targets (heroes and creatures) - same as FlameAvalanche
    findAllEnemyTargets(caster) {
        const targets = [];
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        // Add all living enemy heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                targets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: enemySide
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
                                side: enemySide
                            });
                        }
                    });
                }
            }
        });
        
        console.log(`🎯 ${this.displayName} found ${targets.length} targets`);
        return targets;
    }

    // ============================================
    // BURN APPLICATION
    // ============================================

    // Apply burn to all targets with staggered timing for visual effect
    async applyBurnToAllTargets(targets, burnStacks, caster, resistanceResults) {
        const burnPromises = [];
        
        // Apply burn to all targets with slight delays for visual effect
        targets.forEach((target, index) => {
            const delay = index * 50;
            const targetKey = this.getTargetKey(target);
            const isResisted = resistanceResults.get(targetKey);
            
            const burnPromise = new Promise((resolve) => {
                setTimeout(() => {
                    // Only apply burn if not resisted
                    if (!isResisted) {
                        this.applyBurnToTarget(target, burnStacks, caster);
                    }
                    resolve();
                }, this.battleManager.getSpeedAdjustedDelay(delay));
            });
            
            burnPromises.push(burnPromise);
        });
        
        // Wait for all burn to be applied
        await Promise.all(burnPromises);
    }

    // Apply burn stacks to a single target
    applyBurnToTarget(target, burnStacks, caster) {
        let actualTarget = null;
        
        if (target.type === 'hero') {
            actualTarget = target.hero;
        } else if (target.type === 'creature') {
            actualTarget = target.creature;
        }
        
        if (actualTarget && this.battleManager.statusEffectsManager) {
            // Apply burn status effect using the status effects manager
            this.battleManager.statusEffectsManager.applyStatusEffect(actualTarget, 'burned', burnStacks);
            
            console.log(`🔥 Applied ${burnStacks} burn stacks to ${actualTarget.name}`);
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the main lava flow animation
    async playLavaFlowAnimation(targets, caster, resistanceResults) {
        console.log(`🌋 Playing Mountain Tear River animation with ${targets.length} targets...`);
        
        // Total animation duration: ~800ms (longer than FlameAvalanche for the lava flow effect)
        const totalDuration = 800;
        
        // Create the lava flow that sweeps across the enemy side
        await this.createLavaFlow(targets, caster, totalDuration, resistanceResults);
        
        // Cleanup any remaining lava effects
        this.cleanupAllLavaEffects();
    }

    // Create a lava flow that sweeps across the enemy side
    async createLavaFlow(targets, caster, duration, resistanceResults) {
        // Use document.body like FlameAvalanche does for reliable positioning
        const container = document.body;
        
        // Determine enemy side for animation
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        
        // Find the enemy side area by looking for hero elements
        const enemySlots = document.querySelectorAll(`.${enemySide}-slot`);
        if (enemySlots.length === 0) {
            console.warn('Could not find enemy slots for lava flow positioning');
            // Continue anyway - the lava will flow across the whole screen
        }
        
        // Calculate the area to cover (or use full screen as fallback)
        let flowTop = '20%';
        let flowBottom = '80%';
        
        if (enemySlots.length > 0) {
            // Get bounding boxes of enemy area
            let minTop = Infinity;
            let maxBottom = 0;
            
            enemySlots.forEach(slot => {
                const rect = slot.getBoundingClientRect();
                minTop = Math.min(minTop, rect.top);
                maxBottom = Math.max(maxBottom, rect.bottom);
            });
            
            // Convert to percentages relative to viewport
            flowTop = `${(minTop / window.innerHeight) * 100}%`;
            flowBottom = `${(maxBottom / window.innerHeight) * 100}%`;
        }
        
        // Create main lava flow container
        const lavaFlow = document.createElement('div');
        lavaFlow.className = 'mountain-tear-river-flow';
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
                rgba(255, 100, 0, 0.3) 20%, 
                rgba(255, 50, 0, 0.6) 50%, 
                rgba(200, 0, 0, 0.4) 80%, 
                transparent 100%);
            clip-path: polygon(0% 40%, 100% 35%, 100% 65%, 0% 70%);
            animation: lavaFlowSweep ${this.battleManager.getSpeedAdjustedDelay(duration)}ms ease-out forwards;
            transform: translateX(-100%);
        `;
        
        container.appendChild(lavaFlow);
        
        // Create lava bubbles and impacts
        const bubblePromises = [];
        
        // Create 20 lava bubbles that flow across
        for (let i = 0; i < 20; i++) {
            bubblePromises.push(this.createLavaBubble(container, i, duration));
        }
        
        // Create impact effects on targets after a delay
        setTimeout(() => {
            targets.forEach((target, index) => {
                const targetKey = this.getTargetKey(target);
                const isResisted = resistanceResults.get(targetKey);
                
                setTimeout(() => {
                    this.createLavaImpactEffect(target, isResisted);
                }, index * 30);
            });
        }, this.battleManager.getSpeedAdjustedDelay(duration * 0.4)); // Impacts start at 40% through animation
        
        // Wait for all bubbles and the main flow to complete
        await Promise.all([
            ...bubblePromises,
            new Promise(resolve => setTimeout(resolve, this.battleManager.getSpeedAdjustedDelay(duration)))
        ]);
        
        // Remove the main lava flow
        if (lavaFlow && lavaFlow.parentNode) {
            lavaFlow.remove();
        }
        
        this.ensureMountainTearRiverCSS();
    }

    // Create individual lava bubbles that flow across the screen
    createLavaBubble(container, index, totalDuration) {
        return new Promise(resolve => {
            const bubble = document.createElement('div');
            bubble.className = 'lava-bubble';
            bubble.innerHTML = '🔥';
            
            // Randomize bubble properties
            const size = 16 + Math.random() * 16; // 16-32px
            const startDelay = (index / 20) * totalDuration * 0.3; // Stagger bubble starts
            const bubbleDuration = totalDuration * 0.8; // Bubbles take 80% of total time
            const yPosition = 40 + Math.random() * 20; // 40-60% from top
            
            bubble.style.cssText = `
                position: fixed;
                top: ${yPosition}%;
                left: -50px;
                font-size: ${size}px;
                z-index: 210;
                pointer-events: none;
                transform: translateY(-50%);
                animation: lavaBubbleFlow ${this.battleManager.getSpeedAdjustedDelay(bubbleDuration)}ms linear forwards;
                animation-delay: ${this.battleManager.getSpeedAdjustedDelay(startDelay)}ms;
                text-shadow: 
                    0 0 10px rgba(255, 100, 0, 0.8),
                    0 0 20px rgba(255, 150, 0, 0.6),
                    0 0 30px rgba(255, 200, 0, 0.4);
            `;
            
            container.appendChild(bubble);
            
            // Remove bubble after animation
            setTimeout(() => {
                if (bubble && bubble.parentNode) {
                    bubble.remove();
                }
                resolve();
            }, this.battleManager.getSpeedAdjustedDelay(startDelay + bubbleDuration + 100));
        });
    }

    // Create impact effect when lava hits a target
    createLavaImpactEffect(target, isResisted) {
        let targetElement = null;
        
        if (target.type === 'hero') {
            targetElement = this.battleManager.getHeroElement(target.side, target.position);
        } else if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }
        
        if (!targetElement) return;
        
        const impactEffect = document.createElement('div');
        impactEffect.className = 'lava-impact-effect';
        
        if (isResisted) {
            // Show shield effect for resisted targets
            impactEffect.innerHTML = '🛡️✨';
            impactEffect.classList.add('resisted');
        } else {
            impactEffect.innerHTML = '🌋🔥';
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
            animation: ${isResisted ? 'lavaResisted' : 'lavaImpact'} ${this.battleManager.getSpeedAdjustedDelay(300)}ms ease-out forwards;
        `;
        
        if (isResisted) {
            impactEffect.style.textShadow = `
                0 0 10px rgba(100, 200, 255, 0.9),
                0 0 20px rgba(150, 150, 255, 0.7),
                0 0 30px rgba(200, 200, 255, 0.5)
            `;
        } else {
            impactEffect.style.textShadow = `
                0 0 15px rgba(255, 50, 0, 0.9),
                0 0 25px rgba(255, 100, 0, 0.7),
                0 0 35px rgba(255, 150, 0, 0.5)
            `;
        }
        
        targetElement.appendChild(impactEffect);
        
        // Remove after animation
        setTimeout(() => {
            if (impactEffect && impactEffect.parentNode) {
                impactEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(300));
    }

    // Clean up any remaining lava effects
    cleanupAllLavaEffects() {
        // Remove any remaining lava flows
        const lavaFlows = document.querySelectorAll('.mountain-tear-river-flow');
        lavaFlows.forEach(flow => flow.remove());
        
        // Remove any remaining lava bubbles
        const lavaBubbles = document.querySelectorAll('.lava-bubble');
        lavaBubbles.forEach(bubble => bubble.remove());
        
        // Remove any remaining impact effects
        const impactEffects = document.querySelectorAll('.lava-impact-effect');
        impactEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for lava effects
    ensureMountainTearRiverCSS() {
        if (document.getElementById('mountainTearRiverCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'mountainTearRiverCSS';
        style.textContent = `
            @keyframes lavaFlowSweep {
                0% { 
                    transform: translateX(-100%);
                    opacity: 0;
                }
                10% {
                    opacity: 0.8;
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
                    opacity: 0.6;
                }
                100% { 
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            @keyframes lavaBubbleFlow {
                0% { 
                    left: -50px;
                    opacity: 0;
                    transform: translateY(-50%) scale(0.5) rotate(0deg);
                }
                10% {
                    opacity: 1;
                    transform: translateY(-50%) scale(1.1) rotate(45deg);
                }
                90% {
                    opacity: 1;
                    transform: translateY(-50%) scale(1.0) rotate(315deg);
                }
                100% { 
                    left: calc(100vw + 50px);
                    opacity: 0;
                    transform: translateY(-50%) scale(0.8) rotate(360deg);
                }
            }
            
            @keyframes lavaImpact {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(120deg); 
                }
                70% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(240deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(360deg); 
                }
            }
            
            @keyframes lavaResisted {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(60deg); 
                }
                70% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(120deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg); 
                }
            }
            
            .mountain-tear-river-flow {
                will-change: transform, opacity;
            }
            
            .lava-bubble {
                will-change: transform, opacity, left;
                filter: drop-shadow(0 0 6px rgba(255, 100, 0, 0.8));
            }
            
            .lava-impact-effect {
                will-change: transform, opacity;
            }
            
            .lava-impact-effect.resisted {
                text-shadow: 
                    0 0 10px rgba(100, 200, 255, 0.9),
                    0 0 20px rgba(150, 150, 255, 0.7),
                    0 0 30px rgba(200, 200, 255, 0.5) !important;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, burnStacks, targets, resistanceResults) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
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
        
        let message = `🌋 ${this.displayName} flows across the battlefield`;
        
        if (parts.length > 0) {
            message += `, burning ${parts.join(' and ')} with ${burnStacks} stack${burnStacks > 1 ? 's' : ''} each!`;
        } else {
            // All targets resisted
            message += `, but all targets resisted the molten flow!`;
        }
        
        // Add resistance info if any
        if (heroResists > 0 || creatureResists > 0) {
            const resistParts = [];
            if (heroResists > 0) {
                resistParts.push(`${heroResists} hero${heroResists > 1 ? 'es' : ''}`);
            }
            if (creatureResists > 0) {
                resistParts.push(`${creatureResists} creature${creatureResists > 1 ? 's' : ''}`);
            }
            
            // Only add this line if some targets were hit
            if (parts.length > 0) {
                this.battleManager.addCombatLog(
                    `🛡️ ${resistParts.join(' and ')} resisted the spell!`,
                    'info'
                );
            }
        }
        
        // Main spell effect log
        this.battleManager.addCombatLog(message, logType);
        
        // Convert resistance map to serializable format for guest
        const resistanceData = {};
        resistanceResults.forEach((resisted, key) => {
            resistanceData[key] = resisted;
        });
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            burnStacks: burnStacks,
            targetCount: targets.length,
            heroHits: heroHits,
            heroResists: heroResists,
            creatureHits: creatureHits,
            creatureResists: creatureResists,
            resistanceData: resistanceData,
            effectType: 'area_burn',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, burnStacks, heroHits, heroResists, creatureHits, creatureResists, resistanceData } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Build description matching host
        const parts = [];
        if (heroHits > 0) {
            parts.push(`${heroHits} hero${heroHits > 1 ? 'es' : ''}`);
        }
        if (creatureHits > 0) {
            parts.push(`${creatureHits} creature${creatureHits > 1 ? 's' : ''}`);
        }
        
        let message = `🌋 ${displayName} flows across the battlefield`;
        
        if (parts.length > 0) {
            message += `, burning ${parts.join(' and ')} with ${burnStacks} stack${burnStacks > 1 ? 's' : ''} each!`;
        } else {
            message += `, but all targets resisted the molten flow!`;
        }
        
        // Add main log
        this.battleManager.addCombatLog(message, logType);
        
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
                this.battleManager.addCombatLog(
                    `🛡️ ${resistParts.join(' and ')} resisted the spell!`,
                    'info'
                );
            }
        }
        
        // Find the caster and targets for guest-side animation
        const casterSide = casterLocalSide;
        const casterPosition = data.casterPosition;
        
        // Create mock caster object for animation
        const mockCaster = {
            side: casterSide,
            position: casterPosition,
            name: casterName
        };
        
        // Find targets on guest side
        const guestTargets = this.findAllEnemyTargetsForGuest(mockCaster);
        
        // Convert resistance data to Map format for guest
        const guestResistanceMap = new Map();
        if (resistanceData) {
            Object.entries(resistanceData).forEach(([key, resisted]) => {
                guestResistanceMap.set(key, resisted);
            });
        }
        
        // Play visual effects on guest side
        if (guestTargets.length > 0) {
            this.playLavaFlowAnimation(guestTargets, mockCaster, guestResistanceMap);
        }
        
        console.log(`🌋 GUEST: ${casterName} used ${displayName} on ${data.targetCount} targets`);
    }

    // Find enemy targets for guest-side animation (same as FlameAvalanche)
    findAllEnemyTargetsForGuest(caster) {
        const targets = [];
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        // Add all living enemy heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                targets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: enemySide
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
                                side: enemySide
                            });
                        }
                    });
                }
            }
        });
        
        return targets;
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Check if this spell module handles the given spell
    canHandle(spellName) {
        return spellName === this.spellName;
    }

    // Get spell information
    getSpellInfo() {
        return {
            name: this.spellName,
            displayName: this.displayName,
            description: 'A flowing river of molten lava that engulfs all enemies, applying burn stacks. Burn causes damage over time.',
            burnFormula: '1 + floor(DestructionMagic level / 3) burn stacks',
            targetType: 'all_enemies',
            spellSchool: 'DestructionMagic',
            specialEffects: ['Applies Burn status effect instead of direct damage']
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupAllLavaEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('mountainTearRiverCSS');
        if (css) css.remove();
        
        console.log('🌋 MountainTearRiver spell cleaned up');
    }
}

// Export for use in spell system
export default MountainTearRiverSpell;