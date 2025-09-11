// gatheringStorm.js - Gathering Storm Area Effect with Counter System
// Applies storm damage and persistent animations when area is active

export class GatheringStormEffect {
    constructor() {
        this.isActive = false;
        this.stormIntensity = 'normal'; // 'normal' or 'double'
        this.stormOverlay = null;
        this.animationIntervals = [];
        // Track counters for each player's storm
        this.playerStormCounters = 1;
        this.opponentStormCounters = 1;
    }

    // Check if Gathering Storm should be active at battle start
    checkGatheringStormActive(battleManager) {
        if (!battleManager) return { active: false, intensity: 'normal', playerCounters: 1, opponentCounters: 1 };

        const playerHasStorm = battleManager.playerAreaCard && 
                              battleManager.playerAreaCard.name === 'GatheringStorm';
        const opponentHasStorm = battleManager.opponentAreaCard && 
                                battleManager.opponentAreaCard.name === 'GatheringStorm';

        // Get counter values from area cards
        const playerCounters = playerHasStorm ? (battleManager.playerAreaCard.stormCounters || 1) : 1;
        const opponentCounters = opponentHasStorm ? (battleManager.opponentAreaCard.stormCounters || 1) : 1;

        if (playerHasStorm && opponentHasStorm) {
            return { active: true, intensity: 'double', playerCounters, opponentCounters };
        } else if (playerHasStorm || opponentHasStorm) {
            return { active: true, intensity: 'normal', playerCounters, opponentCounters };
        }

        return { active: false, intensity: 'normal', playerCounters: 1, opponentCounters: 1 };
    }

    // Apply Gathering Storm effects at battle start
    async applyGatheringStormEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) return;

        const stormCheck = this.checkGatheringStormActive(battleManager);
        
        if (!stormCheck.active) return;

        this.isActive = true;
        this.stormIntensity = stormCheck.intensity;
        // Store counter values
        this.playerStormCounters = stormCheck.playerCounters;
        this.opponentStormCounters = stormCheck.opponentCounters;

        // Create storm animation immediately
        this.createStormAnimation(battleManager);

        // Enhanced log messages showing counter values
        let stormMessage = '';
        if (this.stormIntensity === 'double') {
            stormMessage = `The clash of two Gathering Storms creates a devastating maelstrom! (Player: ${this.playerStormCounters}x, Opponent: ${this.opponentStormCounters}x)`;
        } else {
            const activeCounters = battleManager.playerAreaCard?.name === 'GatheringStorm' ? 
                this.playerStormCounters : this.opponentStormCounters;
            stormMessage = `Dark storm clouds gather, unleashing nature's fury! (${activeCounters}x power)`;
        }
        
        battleManager.addCombatLog(`⛈️ ${stormMessage}`, 'warning');

        // Apply storm damage
        await this.applyStormDamage(battleManager);
    }

    // Apply damage to all targets on the battlefield
    async applyStormDamage(battleManager) {
        const baseDamage = 10;
        const damageInstances = this.stormIntensity === 'double' ? 2 : 1;

        for (let instance = 0; instance < damageInstances; instance++) {
            if (damageInstances > 1) {
                battleManager.addCombatLog(
                    `⚡ Storm wave ${instance + 1} of ${damageInstances} strikes!`, 
                    'warning'
                );
            }

            // Collect all targets
            const allTargets = this.getAllTargets(battleManager);
            
            if (allTargets.length === 0) {
                continue;
            }

            // Check resistance for all targets
            const resistanceResults = this.checkResistanceForAllTargets(allTargets, battleManager);
            
            // Calculate which targets will die
            const deathResults = this.calculateDeathResults(allTargets, baseDamage, resistanceResults, instance, battleManager);
            
            // Log consolidated storm effect
            this.logStormEffect(battleManager, allTargets, baseDamage, resistanceResults, deathResults, instance);

            // Apply damage to all targets
            for (const target of allTargets) {
                await this.applyStormDamageToTarget(battleManager, target, baseDamage, instance, resistanceResults);
            }

            // Delay between damage instances if double storm
            if (instance < damageInstances - 1) {
                await battleManager.delay(800);
            }
        }
    }

    // Check resistance for all targets upfront
    checkResistanceForAllTargets(targets, battleManager) {
        const resistanceMap = new Map();
        
        targets.forEach(target => {
            let resisted = false;
            
            if (battleManager.resistanceManager) {
                if (target.type === 'hero') {
                    resisted = battleManager.resistanceManager.shouldResistSpell(target.hero, 'GatheringStorm');
                } else if (target.type === 'creature') {
                    resisted = battleManager.resistanceManager.shouldResistAreaSpell(target, 'GatheringStorm');
                }
            }
            
            const key = this.getTargetKey(target);
            resistanceMap.set(key, resisted);
        });
        
        return resistanceMap;
    }

    // Calculate which targets will die from the damage (before applying it)
    calculateDeathResults(targets, baseDamage, resistanceResults, stormInstance, battleManager) {
        const deathMap = new Map();
        
        targets.forEach(target => {
            const key = this.getTargetKey(target);
            const isResisted = resistanceResults.get(key);
            let willDie = false;
            
            // Only calculate death if target is not resisted
            if (!isResisted) {
                const actualDamage = this.calculateStormDamageForTarget(battleManager, target, baseDamage, stormInstance);
                
                if (target.type === 'hero') {
                    willDie = (target.hero.currentHp - actualDamage) <= 0;
                } else if (target.type === 'creature') {
                    willDie = (target.creature.currentHp - actualDamage) <= 0;
                }
            }
            
            deathMap.set(key, willDie);
        });
        
        return deathMap;
    }

    // Get unique key for a target
    getTargetKey(target) {
        if (target.type === 'hero') {
            return `hero_${target.side}_${target.position}`;
        } else {
            return `creature_${target.side}_${target.position}_${target.creatureIndex}`;
        }
    }

    // Log consolidated storm effect with enhanced HP tracking
    logStormEffect(battleManager, targets, baseDamage, resistanceResults, deathResults, stormInstance) {
        // Count actual hits vs resisted vs deaths
        let totalHits = 0;
        let totalResists = 0;
        let totalDeaths = 0;
        let totalDamage = 0;
        
        // Collect detailed target information
        let hitTargetDetails = [];
        let deadTargetNames = [];
        
        targets.forEach(target => {
            const key = this.getTargetKey(target);
            const resisted = resistanceResults.get(key);
            const willDie = deathResults.get(key);
            
            if (resisted) {
                totalResists++;
            } else {
                totalHits++;
                const actualDamage = this.calculateStormDamageForTarget(battleManager, target, baseDamage, stormInstance);
                totalDamage = actualDamage; // All targets take same damage
                
                // Get target name and HP info
                let targetName, currentHp, maxHp, previousHp;
                
                if (target.type === 'hero') {
                    targetName = target.hero.name;
                    currentHp = target.hero.currentHp;
                    maxHp = target.hero.maxHp;
                    previousHp = currentHp; // Store current HP as previous before damage
                } else if (target.type === 'creature') {
                    targetName = target.creature.name;
                    currentHp = target.creature.currentHp;
                    maxHp = target.creature.maxHp;
                    previousHp = currentHp; // Store current HP as previous before damage
                }
                
                // Calculate HP after damage
                const hpAfterDamage = Math.max(0, currentHp - actualDamage);
                
                // Store hit target details
                hitTargetDetails.push({
                    name: targetName,
                    previousHp: previousHp,
                    currentHp: hpAfterDamage,
                    willDie: willDie
                });
                
                // Track deaths
                if (willDie) {
                    totalDeaths++;
                    deadTargetNames.push(targetName);
                }
            }
        });
        
        // Build enhanced consolidated message
        if (totalHits > 0) {
            // Build target details string
            const targetDetailsStrings = hitTargetDetails.map(target => 
                `${target.name} ❤️ ${target.previousHp} → ${target.currentHp}`
            );
            
            let message = `⚡ The Gathering Storm strikes ${totalHits} target${totalHits > 1 ? 's' : ''} for ${totalDamage} damage each: ${targetDetailsStrings.join(', ')}!`;
            
            // Add death information if any targets died
            if (totalDeaths > 0) {
                if (deadTargetNames.length === 1) {
                    message += ` ${deadTargetNames[0]} perished in the Storm!`;
                } else if (deadTargetNames.length === 2) {
                    message += ` ${deadTargetNames[0]} and ${deadTargetNames[1]} perished in the Storm!`;
                } else {
                    // Handle 3+ deaths
                    const lastTarget = deadTargetNames.pop();
                    message += ` ${deadTargetNames.join(', ')} and ${lastTarget} perished in the Storm!`;
                }
            }
            
            battleManager.addCombatLog(message, 'warning');
        }
        
        // Add separate resistance info if there were resists
        /*if (totalResists > 0) {
            battleManager.addCombatLog(
                `🛡️ ${totalResists} target${totalResists > 1 ? 's' : ''} resisted the storm!`,
                'info'
            );
        }*/

        // Convert resistance and death maps to serializable format for guest
        const resistanceData = {};
        const deathData = {};
        resistanceResults.forEach((resisted, key) => {
            resistanceData[key] = resisted;
        });
        deathResults.forEach((willDie, key) => {
            deathData[key] = willDie;
        });

        // Send storm effect update to guest with enhanced data
        battleManager.sendBattleUpdate('gathering_storm_damage', {
            intensity: this.stormIntensity,
            playerCounters: this.playerStormCounters,
            opponentCounters: this.opponentStormCounters,
            reason: stormInstance === 0 ? 'battle_start' : 'round_end',
            stormInstance: stormInstance,
            targetCount: targets.length,
            totalHits: totalHits,
            totalResists: totalResists,
            totalDeaths: totalDeaths,
            totalDamage: totalDamage,
            resistanceData: resistanceData,
            deathData: deathData,
            // Add enhanced data for guest synchronization
            hitTargetDetails: hitTargetDetails,
            deadTargetNames: deadTargetNames,
            timestamp: Date.now()
        });
    }

    // Get all valid targets on the battlefield
    getAllTargets(battleManager) {
        const targets = [];

        // Add all heroes
        ['left', 'center', 'right'].forEach(position => {
            const playerHero = battleManager.playerHeroes[position];
            const opponentHero = battleManager.opponentHeroes[position];

            if (playerHero && playerHero.alive) {
                targets.push({
                    type: 'hero',
                    hero: playerHero,
                    side: 'player',
                    position: position
                });
            }

            if (opponentHero && opponentHero.alive) {
                targets.push({
                    type: 'hero',
                    hero: opponentHero,
                    side: 'opponent',
                    position: position
                });
            }

            // Add all living creatures
            if (playerHero && playerHero.creatures) {
                playerHero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        targets.push({
                            type: 'creature',
                            hero: playerHero,
                            creature: creature,
                            creatureIndex: index,
                            side: 'player',
                            position: position
                        });
                    }
                });
            }

            if (opponentHero && opponentHero.creatures) {
                opponentHero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        targets.push({
                            type: 'creature',
                            hero: opponentHero,
                            creature: creature,
                            creatureIndex: index,
                            side: 'opponent',
                            position: position
                        });
                    }
                });
            }
        });

        return targets;
    }

    // Calculate damage based on which storm is affecting this target
    calculateStormDamageForTarget(battleManager, target, baseDamage, stormInstance = 0) {
        // Determine which storm is doing damage based on who has the storm area
        const playerHasStorm = battleManager.playerAreaCard?.name === 'GatheringStorm';
        const opponentHasStorm = battleManager.opponentAreaCard?.name === 'GatheringStorm';

        if (this.stormIntensity === 'double') {
            // Both have storms - use specific counters for each instance
            // Instance 0: Host's storm (playerCounters)
            // Instance 1: Guest's storm (opponentCounters)
            const countersToUse = stormInstance === 0 ? this.playerStormCounters : this.opponentStormCounters;
            return baseDamage * countersToUse;
        } else if (playerHasStorm) {
            return baseDamage * this.playerStormCounters;
        } else if (opponentHasStorm) {
            return baseDamage * this.opponentStormCounters;
        }
        
        return baseDamage; // Fallback
    }

    // Apply storm damage to a specific target
    async applyStormDamageToTarget(battleManager, target, baseDamage, stormInstance = 0, resistanceResults) {
        const targetKey = this.getTargetKey(target);
        const isResisted = resistanceResults.get(targetKey);
        
        // Skip damage if resisted
        if (isResisted) {
            this.createLightningStrike(target, true); // Show resisted visual
            return;
        }

        // Calculate actual damage using counters
        const actualDamage = this.calculateStormDamageForTarget(battleManager, target, baseDamage, stormInstance);

        if (target.type === 'hero') {
            // Apply damage to hero
            const damageResult = {
                target: target.hero,
                damage: actualDamage,
                damageType: 'storm',
                side: target.side,
                position: target.position
            };

            await battleManager.authoritative_applyDamage(damageResult, {
                source: 'gathering_storm',
                preventRevival: false,
                aoe: true
            });

        } else if (target.type === 'creature') {
            // Apply damage to creature
            const damageData = {
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: actualDamage,
                position: target.position,
                side: target.side
            };

            await battleManager.authoritative_applyDamageToCreature(damageData, {
                source: 'gathering_storm',
                preventRevival: false,
                aoe: true
            });
        }

        // Add visual lightning effect
        this.createLightningStrike(target, false);
    }

    // Handle guest storm start
    handleGuestStormStart(data) {
        if (!data) return;

        this.isActive = true;
        this.stormIntensity = data.intensity;
        // Restore counter values on guest
        this.playerStormCounters = data.playerCounters || 1;
        this.opponentStormCounters = data.opponentCounters || 1;
        
        // Create animation for guest
        this.createStormAnimation();

        // Enhanced log message with counter info - only for initial storm start
        if (data.reason === 'battle_start') {
            let stormMessage = '';
            if (this.stormIntensity === 'double') {
                stormMessage = `The clash of two Gathering Storms creates a devastating maelstrom! (Player: ${this.playerStormCounters}x, Opponent: ${this.opponentStormCounters}x)`;
            } else {
                const activeCounters = data.playerCounters > 1 ? data.playerCounters : data.opponentCounters;
                stormMessage = `Dark storm clouds gather, unleashing nature's fury! (${activeCounters}x power)`;
            }
            
            // Add to combat log if battle manager is available
            if (window.battleManager) {
                window.battleManager.addCombatLog(`⛈️ ${stormMessage}`, 'warning');
            }
        }

        // Handle consolidated damage logging
        if (data.totalHits !== undefined) {
            this.handleGuestStormDamageLog(data);
        }
    }

    // Handle guest-side consolidated damage logging with enhanced HP tracking
    handleGuestStormDamageLog(data) {
        if (!window.battleManager) return;

        const { totalHits, totalResists, totalDeaths, totalDamage, stormInstance, hitTargetDetails, deadTargetNames } = data;
        
        // Add storm wave message for double storms
        if (this.stormIntensity === 'double' && stormInstance !== undefined) {
            const totalWaves = 2;
            if (stormInstance < totalWaves - 1) {
                window.battleManager.addCombatLog(
                    `⚡ Storm wave ${stormInstance + 1} of ${totalWaves} strikes!`, 
                    'warning'
                );
            }
        }

        // Build enhanced consolidated message matching host
        if (totalHits > 0) {
            let message;
            
            // Use enhanced data if available, otherwise fall back to simple format
            if (hitTargetDetails && hitTargetDetails.length > 0) {
                // Enhanced format with HP details
                const targetDetailsStrings = hitTargetDetails.map(target => 
                    `${target.name} ❤️ ${target.previousHp} → ${target.currentHp}`
                );
                
                message = `⚡ The Gathering Storm strikes ${totalHits} target${totalHits > 1 ? 's' : ''} for ${totalDamage} damage each: ${targetDetailsStrings.join(', ')}!`;
                
                // Add death information if any targets died
                if (totalDeaths > 0 && deadTargetNames && deadTargetNames.length > 0) {
                    if (deadTargetNames.length === 1) {
                        message += ` ${deadTargetNames[0]} perished in the Storm!`;
                    } else if (deadTargetNames.length === 2) {
                        message += ` ${deadTargetNames[0]} and ${deadTargetNames[1]} perished in the Storm!`;
                    } else {
                        // Handle 3+ deaths
                        const lastTarget = deadTargetNames[deadTargetNames.length - 1];
                        const otherTargets = deadTargetNames.slice(0, -1);
                        message += ` ${otherTargets.join(', ')} and ${lastTarget} perished in the Storm!`;
                    }
                }
            } else {
                // Fall back to simple format for backwards compatibility
                message = `⚡ The gathering storm strikes ${totalHits} target${totalHits > 1 ? 's' : ''} for ${totalDamage} damage each!`;
                
                // Add death information if any targets died
                if (totalDeaths > 0) {
                    message += ` ${totalDeaths} of them died.`;
                }
            }
            
            window.battleManager.addCombatLog(message, 'warning');
        }
        
        // Add separate resistance info if there were resists
        /*if (totalResists > 0) {
            window.battleManager.addCombatLog(
                `🛡️ ${totalResists} target${totalResists > 1 ? 's' : ''} resisted the storm!`,
                'info'
            );
        }*/
    }

    // Apply end-of-round storm damage
    async applyEndOfRoundStormDamage(battleManager) {
        if (!this.isActive || !battleManager || !battleManager.isAuthoritative) return;

        battleManager.addCombatLog('The gathering storm lashes out at the end of the round!', 'warning');

        // Apply the same damage as battle start
        await this.applyStormDamage(battleManager);
    }

    // Handle guest end-of-round storm damage
    handleGuestRoundStormDamage(data) {
        if (!data) return;

        // Update counter values if provided
        if (data.playerCounters) this.playerStormCounters = data.playerCounters;
        if (data.opponentCounters) this.opponentStormCounters = data.opponentCounters;

        // Add combat log message for guest
        if (window.battleManager) {
            window.battleManager.addCombatLog('The gathering storm lashes out at the end of the round!', 'warning');
        }

        // Handle consolidated damage logging
        if (data.totalHits !== undefined) {
            this.handleGuestStormDamageLog(data);
        }
    }

    exportState() {
        return {
            isActive: this.isActive,
            stormIntensity: this.stormIntensity,
            playerStormCounters: this.playerStormCounters,
            opponentStormCounters: this.opponentStormCounters
        };
    }

    // Import state from checkpoint system
    importState(state) {
        if (!state) return;
        
        this.isActive = state.isActive || false;
        this.stormIntensity = state.stormIntensity || 'normal';
        this.playerStormCounters = state.playerStormCounters || 1;
        this.opponentStormCounters = state.opponentStormCounters || 1;
        
        // Restart animation if storm was active
        if (this.isActive) {
            setTimeout(() => {
                this.restartStormAnimation();
            }, 500);
        }
    }

    // Create persistent storm animation overlay
    createStormAnimation(battleManager) {
        // Remove existing storm if present
        this.removeStormAnimation();

        const battleArena = document.getElementById('battleArena');
        if (!battleArena) return;

        // Create storm overlay
        this.stormOverlay = document.createElement('div');
        this.stormOverlay.className = 'gathering-storm-overlay';
        this.stormOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 1000;
            overflow: hidden;
        `;

        // Create storm clouds
        this.createStormClouds();
        
        // Start continuous lightning
        this.startContinuousLightning();

        // Start wind effects
        this.startWindEffects();

        battleArena.appendChild(this.stormOverlay);

        // Add storm CSS if not already present
        this.injectStormCSS();
    }

    // Create animated storm clouds
    createStormClouds() {
        if (!this.stormOverlay) return;

        // Spawn initial dense cloud coverage immediately
        this.spawnInitialCloudCoverage();
        
        // Start continuous cloud spawning for perpetual storm
        this.startContinuousCloudSpawning();
    }

    // Spawn dense initial cloud coverage across entire screen
    spawnInitialCloudCoverage() {
        if (!this.stormOverlay) return;

        const initialCloudCount = this.stormIntensity === 'double' ? 15 : 10;
        
        for (let i = 0; i < initialCloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'storm-cloud initial-cloud';
            
            const baseSize = this.stormIntensity === 'double' ? 
                Math.random() * 350 + 250 : 
                Math.random() * 250 + 150;
            
            // Create chaotic cloud shapes
            const cloudVariations = [
                `radial-gradient(ellipse ${Math.random() * 40 + 60}% ${Math.random() * 30 + 40}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(12, 12, 18, 0.95) 0%, rgba(25, 25, 35, 0.8) 40%, transparent 75%)`,
                `radial-gradient(ellipse ${Math.random() * 50 + 50}% ${Math.random() * 40 + 30}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(8, 8, 15, 0.9) 0%, rgba(20, 20, 28, 0.7) 50%, transparent 70%)`,
                `radial-gradient(ellipse ${Math.random() * 30 + 70}% ${Math.random() * 20 + 50}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(18, 18, 25, 0.85) 0%, rgba(30, 30, 40, 0.6) 60%, transparent 80%)`,
                `radial-gradient(ellipse ${Math.random() * 45 + 55}% ${Math.random() * 35 + 45}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(5, 5, 12, 0.9) 0%, transparent 65%)`
            ];

            cloud.style.cssText = `
                position: absolute;
                width: ${baseSize}px;
                height: ${baseSize * (Math.random() * 0.4 + 0.5)}px;
                background: ${cloudVariations[0]}, ${cloudVariations[1]}, ${cloudVariations[2]}, ${cloudVariations[3]};
                border-radius: ${Math.random() * 50 + 50}% ${Math.random() * 50 + 50}% ${Math.random() * 50 + 50}% ${Math.random() * 50 + 50}%;
                top: ${Math.random() * 120 - 10}%;
                left: ${Math.random() * 120 - 10}%;
                filter: blur(${Math.random() * 2 + 1}px);
                opacity: ${Math.random() * 0.2 + 0.9};
                transform: rotate(${Math.random() * 40 - 20}deg);
                animation: initialCloudDrift ${Math.random() * 15 + 20}s linear, initialCloudFade 0.5s ease-in;
            `;

            this.stormOverlay.appendChild(cloud);
        }
    }

    // Spawn a single cloud
    spawnSingleCloud() {
        if (!this.stormOverlay || !this.isActive) return;

        const cloud = document.createElement('div');
        cloud.className = 'storm-cloud';
        
        const baseSize = this.stormIntensity === 'double' ? 
            Math.random() * 350 + 250 : 
            Math.random() * 250 + 150;
        
        const animationDuration = this.stormIntensity === 'double' ? 
            Math.random() * 12 + 8 : 
            Math.random() * 20 + 12;

        // Create more chaotic, irregular cloud shape using multiple overlapping gradients
        const cloudVariations = [
            `radial-gradient(ellipse ${Math.random() * 40 + 60}% ${Math.random() * 30 + 40}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(12, 12, 18, 0.95) 0%, rgba(25, 25, 35, 0.8) 40%, transparent 75%)`,
            `radial-gradient(ellipse ${Math.random() * 50 + 50}% ${Math.random() * 40 + 30}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(8, 8, 15, 0.9) 0%, rgba(20, 20, 28, 0.7) 50%, transparent 70%)`,
            `radial-gradient(ellipse ${Math.random() * 30 + 70}% ${Math.random() * 20 + 50}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(18, 18, 25, 0.85) 0%, rgba(30, 30, 40, 0.6) 60%, transparent 80%)`,
            `radial-gradient(ellipse ${Math.random() * 45 + 55}% ${Math.random() * 35 + 45}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(5, 5, 12, 0.9) 0%, transparent 65%)`
        ];

        cloud.style.cssText = `
            position: absolute;
            width: ${baseSize}px;
            height: ${baseSize * (Math.random() * 0.4 + 0.5)}px;
            background: ${cloudVariations[0]}, ${cloudVariations[1]}, ${cloudVariations[2]}, ${cloudVariations[3]};
            border-radius: ${Math.random() * 50 + 50}% ${Math.random() * 50 + 50}% ${Math.random() * 50 + 50}% ${Math.random() * 50 + 50}%;
            top: ${Math.random() * 100}%;
            left: -${baseSize}px;
            animation: driftClouds ${animationDuration}s linear;
            filter: blur(${Math.random() * 2 + 1}px);
            opacity: ${Math.random() * 0.2 + 0.9};
            transform: rotate(${Math.random() * 40 - 20}deg);
        `;

        this.stormOverlay.appendChild(cloud);

        // Remove cloud after animation completes
        setTimeout(() => {
            if (cloud.parentNode) {
                cloud.parentNode.removeChild(cloud);
            }
        }, animationDuration * 1000);
    }

    // Start continuous cloud spawning
    startContinuousCloudSpawning() {
        const spawnFrequency = this.stormIntensity === 'double' ? 1500 : 2500; // More frequent spawning
        
        const cloudSpawnInterval = setInterval(() => {
            if (!this.isActive || !this.stormOverlay) {
                clearInterval(cloudSpawnInterval);
                return;
            }
            
            this.spawnSingleCloud();
            
            // Occasionally spawn multiple clouds at once for density
            if (Math.random() < 0.4) {
                setTimeout(() => this.spawnSingleCloud(), Math.random() * 1000);
            }
        }, Math.random() * spawnFrequency + 1000);

        this.animationIntervals.push(cloudSpawnInterval);
    }

    // Start continuous lightning effects
    startContinuousLightning() {
        const lightningFrequency = this.stormIntensity === 'double' ? 1500 : 3000;
        
        const lightningInterval = setInterval(() => {
            if (!this.isActive || !this.stormOverlay) {
                clearInterval(lightningInterval);
                return;
            }
            
            this.createRandomLightning();
        }, Math.random() * lightningFrequency + 500);

        this.animationIntervals.push(lightningInterval);
    }

    // Start wind particle effects
    startWindEffects() {
        const windInterval = setInterval(() => {
            if (!this.isActive || !this.stormOverlay) {
                clearInterval(windInterval);
                return;
            }
            
            this.createWindParticle();
        }, Math.random() * 200 + 100);

        this.animationIntervals.push(windInterval);
    }

    // Create random lightning flash
    createRandomLightning() {
        if (!this.stormOverlay) return;

        // Create lightning bolt SVG
        const lightning = document.createElement('div');
        lightning.className = 'lightning-bolt';
        
        const intensity = this.stormIntensity === 'double' ? 0.9 : 0.7;
        const boltCount = this.stormIntensity === 'double' ? 
            Math.floor(Math.random() * 3) + 2 : 
            Math.floor(Math.random() * 2) + 1;
        
        // Generate random lightning bolt paths
        const svgPaths = this.generateLightningPaths(boltCount);
        
        lightning.innerHTML = `
            <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;" viewBox="0 0 100 100" preserveAspectRatio="none">
                ${svgPaths.map(path => `
                    <path d="${path}" 
                          stroke="rgba(255, 255, 255, ${intensity})" 
                          stroke-width="${Math.random() * 0.8 + 0.3}" 
                          fill="none" 
                          filter="url(#lightningGlow)"/>
                `).join('')}
                <defs>
                    <filter id="lightningGlow">
                        <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
                        <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
            </svg>
        `;
        
        lightning.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            animation: lightningFlash 0.4s ease-out;
            pointer-events: none;
        `;

        this.stormOverlay.appendChild(lightning);

        setTimeout(() => {
            if (lightning.parentNode) {
                lightning.parentNode.removeChild(lightning);
            }
        }, 400);
    }

    // Generate random lightning bolt SVG paths
    generateLightningPaths(count = 1) {
        const paths = [];
        
        for (let i = 0; i < count; i++) {
            // Random starting point anywhere on screen
            const startX = Math.random() * 100; // 0-100% across
            const startY = Math.random() * 30; // Top 30% of screen
            
            // Random ending point anywhere on screen
            const endX = Math.random() * 100;
            const endY = Math.random() * 70 + 30; // Bottom 70% of screen
            
            // Generate jagged path from start to end
            const path = this.generateJaggedPath(startX, startY, endX, endY, 4, 8);
            paths.push(path);
        }
        
        return paths;
    }

    // Generate targeted lightning bolt path from top to specific target
    generateTargetedLightningPath(targetRect) {
        const startX = 50; // Start from center top
        const startY = 0;
        
        // End at target position (convert to percentage)
        const endX = ((targetRect.left + targetRect.width / 2) / window.innerWidth) * 100;
        const endY = ((targetRect.top + targetRect.height / 2) / window.innerHeight) * 100;
        
        // More controlled jagged path for targeted strikes
        return this.generateJaggedPath(startX, startY, endX, endY, 3, 6);
    }

    // Generate jagged lightning path between two points
    generateJaggedPath(startX, startY, endX, endY, minSegments = 3, maxSegments = 8) {
        const segments = Math.floor(Math.random() * (maxSegments - minSegments + 1)) + minSegments;
        let path = `M ${startX} ${startY}`;
        
        let currentX = startX;
        let currentY = startY;
        
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        for (let i = 1; i <= segments; i++) {
            // Calculate progress along main path
            const progress = i / segments;
            
            // Base position along straight line
            const baseX = startX + deltaX * progress;
            const baseY = startY + deltaY * progress;
            
            // Add random jaggedness
            const jagX = baseX + (Math.random() - 0.5) * 15; // Random horizontal offset
            const jagY = baseY + (Math.random() - 0.5) * 8; // Smaller vertical offset
            
            // Ensure we end exactly at target for last segment
            if (i === segments) {
                path += ` L ${endX} ${endY}`;
            } else {
                path += ` L ${jagX} ${jagY}`;
                
                // Add occasional branches
                if (Math.random() < 0.3) {
                    const branchLength = Math.random() * 10 + 5;
                    const branchAngle = (Math.random() - 0.5) * Math.PI;
                    const branchEndX = jagX + Math.cos(branchAngle) * branchLength;
                    const branchEndY = jagY + Math.sin(branchAngle) * branchLength;
                    path += ` M ${jagX} ${jagY} L ${branchEndX} ${branchEndY} M ${jagX} ${jagY}`;
                }
            }
            
            currentX = jagX;
            currentY = jagY;
        }
        
        return path;
    }

    // Create targeted lightning strike on specific target
    createLightningStrike(target, isResisted = false) {
        let targetElement = null;

        if (target.type === 'hero') {
            targetElement = document.querySelector(`.${target.side}-slot.${target.position}-slot`);
        } else if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }

        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const lightning = document.createElement('div');
        lightning.className = 'targeted-lightning-bolt';
        
        // Generate targeted lightning path
        const lightningPath = this.generateTargetedLightningPath(rect);
        const intensity = this.stormIntensity === 'double' ? 0.9 : 0.7;
        
        // Different colors for resisted vs normal strikes
        const strokeColor = isResisted ? 'rgba(100, 200, 255, ' + intensity + ')' : 'rgba(255, 255, 255, ' + intensity + ')';
        const innerStrokeColor = isResisted ? 'rgba(150, 150, 255, ' + (intensity * 0.6) + ')' : 'rgba(200, 220, 255, ' + (intensity * 0.6) + ')';
        
        lightning.innerHTML = `
            <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="${lightningPath}" 
                      stroke="${strokeColor}" 
                      stroke-width="0.8" 
                      fill="none" 
                      filter="url(#targetedLightningGlow)"/>
                <path d="${lightningPath}" 
                      stroke="${innerStrokeColor}" 
                      stroke-width="0.4" 
                      fill="none"/>
                <defs>
                    <filter id="targetedLightningGlow">
                        <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                        <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
            </svg>
        `;
        
        lightning.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            animation: targetedStrike 0.6s ease-out;
            pointer-events: none;
            z-index: 1001;
        `;

        document.body.appendChild(lightning);

        setTimeout(() => {
            if (lightning.parentNode) {
                lightning.parentNode.removeChild(lightning);
            }
        }, 600);
    }

    // Create wind particle
    createWindParticle() {
        if (!this.stormOverlay) return;

        const particle = document.createElement('div');
        particle.className = 'wind-particle';
        
        const size = Math.random() * 4 + 1;
        const duration = this.stormIntensity === 'double' ? 
            Math.random() * 2 + 1 : 
            Math.random() * 3 + 2;

        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(200, 200, 220, 0.6);
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: -10px;
            animation: windDrift ${duration}s linear;
        `;

        this.stormOverlay.appendChild(particle);

        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, duration * 1000);
    }

    // Remove storm animation
    removeStormAnimation() {
        if (this.stormOverlay) {
            if (this.stormOverlay.parentNode) {
                this.stormOverlay.parentNode.removeChild(this.stormOverlay);
            }
            this.stormOverlay = null;
        }

        // Clear animation intervals
        this.animationIntervals.forEach(interval => clearInterval(interval));
        this.animationIntervals = [];
    }

    // Inject storm-specific CSS
    injectStormCSS() {
        if (document.getElementById('gatheringStormStyles')) return;

        const style = document.createElement('style');
        style.id = 'gatheringStormStyles';
        style.textContent = `
            @keyframes driftClouds {
                0% { transform: translateX(0); }
                100% { transform: translateX(calc(100vw + 400px)); }
            }

            @keyframes initialCloudDrift {
                0% { transform: translateX(0) rotate(var(--initial-rotation, 0deg)); }
                100% { transform: translateX(calc(100vw + 400px)) rotate(var(--initial-rotation, 0deg)); }
            }

            @keyframes initialCloudFade {
                0% { opacity: 0; }
                100% { opacity: var(--final-opacity, 0.9); }
            }

            @keyframes lightningFlash {
                0% { 
                    opacity: 0; 
                    transform: scale(0.8);
                }
                20% { 
                    opacity: 1; 
                    transform: scale(1.1);
                }
                50% { 
                    opacity: 0.8; 
                    transform: scale(1);
                }
                100% { 
                    opacity: 0;
                    transform: scale(1.05);
                }
            }

            @keyframes targetedStrike {
                0% { 
                    opacity: 0; 
                    transform: scaleY(0.1) scaleX(0.5); 
                }
                30% { 
                    opacity: 1; 
                    transform: scaleY(1) scaleX(1.2); 
                }
                70% { 
                    opacity: 0.7; 
                    transform: scaleY(1) scaleX(1); 
                }
                100% { 
                    opacity: 0; 
                    transform: scaleY(0.9) scaleX(0.8); 
                }
            }

            @keyframes windDrift {
                0% { 
                    transform: translateX(0) rotate(0deg); 
                    opacity: 0; 
                }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { 
                    transform: translateX(calc(100vw + 20px)) rotate(360deg); 
                    opacity: 0; 
                }
            }

            .gathering-storm-overlay .storm-cloud {
                will-change: transform;
            }

            .gathering-storm-overlay .lightning-flash {
                will-change: opacity;
            }

            .gathering-storm-overlay .wind-particle {
                will-change: transform, opacity;
            }
        `;

        document.head.appendChild(style);
    }

    // Restart storm animation (for reconnection)
    restartStormAnimation() {
        if (!this.isActive) return;
        
        // Remove existing animation
        this.removeStormAnimation();
        
        // Recreate animation
        setTimeout(() => {
            this.createStormAnimation();
        }, 100);
    }

    // Cleanup
    cleanup() {
        this.isActive = false;
        this.removeStormAnimation();
    }
}

// Functions for managing storm counters externally

// Initialize a GatheringStorm area with counter = 1
export function initializeGatheringStormArea(areaCard) {
    if (areaCard && areaCard.name === 'GatheringStorm') {
        areaCard.stormCounters = 1;
    }
    return areaCard;
}

// Increment storm counters after battle
export function incrementGatheringStormCounters(areaCard) {
    if (areaCard && areaCard.name === 'GatheringStorm') {
        areaCard.stormCounters = (areaCard.stormCounters || 1) + 1;
        return true;
    }
    return false;
}

// Get storm counter value
export function getGatheringStormCounters(areaCard) {
    if (areaCard && areaCard.name === 'GatheringStorm') {
        return areaCard.stormCounters || 1;
    }
    return 1;
}

// Initialize GatheringStorm counter system (similar to Training)
export function initializeGatheringStormSystem() {
    if (!window.heroSelection) {
        setTimeout(() => initializeGatheringStormSystem(), 1000);
        return;
    }

    // Check if already initialized to prevent double-wrapping
    if (window.heroSelection.returnToFormationScreenAfterBattle._gatheringStormWrapped) {
        return;
    }

    // Store original returnToFormationScreenAfterBattle method
    const originalReturn = window.heroSelection.returnToFormationScreenAfterBattle;
    
    // Wrap it with GatheringStorm counter processing
    window.heroSelection.returnToFormationScreenAfterBattle = async function() {
        // Call original method first
        await originalReturn.call(this);
        
        // Add a short delay to ensure UI is ready, then process increment
        setTimeout(async () => {
            await processGatheringStormCounterIncrement(this);
        }, 500);
    };

    // Mark as wrapped to prevent double-wrapping
    window.heroSelection.returnToFormationScreenAfterBattle._gatheringStormWrapped = true;
}

async function processGatheringStormCounterIncrement(heroSelection) {
    if (!heroSelection || !heroSelection.areaHandler) return false;
    
    const currentArea = heroSelection.areaHandler.getAreaCard();
    
    if (currentArea && currentArea.name === 'GatheringStorm') {
        const wasIncremented = incrementGatheringStormCounters(currentArea);
        
        if (wasIncremented) {
            const newCount = currentArea.stormCounters || 1;
            
            // Update area display
            if (heroSelection.areaHandler.updateAreaDisplay) {
                heroSelection.areaHandler.updateAreaDisplay();
            }
            
            // Save the updated area state
            try {
                await heroSelection.saveGameState();
            } catch (error) {
                // Error saving - continue silently
            }
            
            return true;
        }
    }
    
    return false;
}

// Export functions for external use
export async function applyGatheringStormBattleEffects(battleManager) {
    if (!battleManager.gatheringStormEffect) {
        battleManager.gatheringStormEffect = new GatheringStormEffect();
    }
    
    await battleManager.gatheringStormEffect.applyGatheringStormEffects(battleManager);
}

export function handleGuestGatheringStormDamage(data, battleManager) {
    if (!battleManager.gatheringStormEffect) {
        battleManager.gatheringStormEffect = new GatheringStormEffect();
    }
    
    battleManager.gatheringStormEffect.handleGuestStormStart(data);
}

// Handle guest storm damage (compatibility with existing handler name)
export function handleGuestGatheringStormStart(data, battleManager) {
    return handleGuestGatheringStormDamage(data, battleManager);
}

export async function applyEndOfRoundGatheringStorm(battleManager) {
    if (!battleManager.gatheringStormEffect) {
        return; // No storm active
    }
    
    await battleManager.gatheringStormEffect.applyEndOfRoundStormDamage(battleManager);
}

export default GatheringStormEffect;