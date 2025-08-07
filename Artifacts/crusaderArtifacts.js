// Artifacts/crusaderArtifacts.js - Crusader Artifacts with Combat Effects System

// List of all Crusaders artifacts
const CRUSADERS_ARTIFACTS = [
    'CrusadersArm-Cannon',
    'CrusadersCutlass', 
    'CrusadersFlintlock',
    'CrusadersHookshot'
];

class CrusaderArtifactsHandler {
    constructor() {
        this.heroSelection = null;
        this.battleManager = null;
        this.initialized = false;
        console.log('🛡️ CrusaderArtifactsHandler initialized');
    }

    // Initialize with hero selection reference
    init(heroSelection) {
        if (this.initialized) return;
        
        this.heroSelection = heroSelection;
        this.hookIntoTurnChanges();
        this.initialized = true;
        
        console.log('🛡️ Crusader Artifacts system hooked into turn changes');
    }

    // NEW: Initialize with battle manager for combat effects
    initBattleEffects(battleManager) {
        this.battleManager = battleManager;
        console.log('⚔️ Crusader Artifacts battle effects initialized');
    }

    // NEW: Apply all start-of-battle Crusader effects
    async applyStartOfBattleEffects() {
        if (!this.battleManager || !this.battleManager.isAuthoritative) {
            console.log('⚠️ Skipping Crusader effects - not authoritative or no battle manager');
            return;
        }

        console.log('💥 Applying Crusader Artifacts start-of-battle effects...');

        // Apply CrusadersArm-Cannon effects
        await this.applyCrusadersArmCannonEffect();
        

        // Apply CrusadersCutlass effects
        //await this.applyCrusadersCutlassEffect();

        // Future crusader effects can be added here
        // await this.applyCrusadersFlintlockEffect();
        // await this.applyCrusadersHookshotEffect();

        console.log('✅ All Crusader Artifacts effects applied');
    }

    // Apply CrusadersArm-Cannon start-of-battle effect
    async applyCrusadersArmCannonEffect() {
        console.log('💥 Checking CrusadersArm-Cannon effects...');

        // Count CrusadersArm-Cannon artifacts for both players
        const playerCannonCount = this.countCrusaderArtifact('player', 'CrusadersArm-Cannon');
        const opponentCannonCount = this.countCrusaderArtifact('opponent', 'CrusadersArm-Cannon');

        console.log(`🔫 Player has ${playerCannonCount} CrusadersArm-Cannon(s)`);
        console.log(`🔫 Opponent has ${opponentCannonCount} CrusadersArm-Cannon(s)`);

        // Apply damage based on opponent's cannons (you take damage from opponent's cannons)
        if (opponentCannonCount > 0) {
            const damagePerCannon = 40;
            const totalDamage = damagePerCannon * opponentCannonCount;
            await this.applyCrusaderCannonBarrage('player', totalDamage, opponentCannonCount);
        }

        if (playerCannonCount > 0) {
            const damagePerCannon = 40;
            const totalDamage = damagePerCannon * playerCannonCount;
            await this.applyCrusaderCannonBarrage('opponent', totalDamage, playerCannonCount);
        }
    }

    // Count specific Crusader artifact for a side
    countCrusaderArtifact(side, artifactName) {
        let count = 0;
        
        // Get the appropriate heroes based on side
        let heroes;
        if (side === 'player') {
            heroes = this.battleManager.playerHeroes;
        } else {
            heroes = this.battleManager.opponentHeroes;
        }

        // Count artifacts across all hero positions
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.equipment && hero.equipment.length > 0) {
                hero.equipment.forEach(item => {
                    const itemName = item.name || item.cardName;
                    if (itemName === artifactName) {
                        count++;
                    }
                });
            }
        });

        return count;
    }

    // Apply cannon barrage to all targets on a side
    async applyCrusaderCannonBarrage(targetSide, totalDamage, cannonCount) {
        if (totalDamage <= 0) return;

        const sideLabel = targetSide === 'player' ? 'Player' : 'Opponent';
        console.log(`💥 Applying ${totalDamage} Crusader Cannon damage to all ${sideLabel} targets...`);

        // Log the effect
        this.battleManager.addCombatLog(
            `💥 Crusaders Arm-Cannon barrage! ${cannonCount} cannon(s) fire for ${totalDamage} damage each!`, 
            'warning'
        );

        // Get all targets (heroes and creatures)
        const targets = this.getAllTargetsOnSide(targetSide);
        
        if (targets.length === 0) {
            console.log('⚠️ No targets found for cannon barrage');
            return;
        }

        console.log(`🎯 Found ${targets.length} targets for cannon barrage`);

        // Create cannonball animation data for network sync
        const cannonballData = {
            targetSide: targetSide,
            damage: totalDamage,
            cannonCount: cannonCount,
            targets: targets.map(target => ({
                type: target.type,
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                name: target.target.name
            }))
        };

        // Send cannonball effect to guest first (for animation sync)
        this.battleManager.sendBattleUpdate('crusader_cannon_barrage', cannonballData);

        // Start animations
        const animationPromise = this.createCannonballBarrageAnimation(targets, cannonCount);

        // Apply damage to all targets after a short delay (to sync with animation)
        await this.battleManager.delay(800); // Wait for cannonballs to "travel"

        // Apply damage to each target
        for (const targetData of targets) {
            await this.applyCannonDamageToTarget(targetData, totalDamage);
            await this.battleManager.delay(100); // Stagger damage slightly
        }

        // Wait for animations to complete
        await animationPromise;

        console.log('✅ Crusader Cannon barrage complete');
    }

    // Get all valid targets on a side (heroes + creatures)
    getAllTargetsOnSide(side) {
        const targets = [];
        let heroes;

        if (side === 'player') {
            heroes = this.battleManager.playerHeroes;
        } else {
            heroes = this.battleManager.opponentHeroes;
        }

        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive) {
                // Add the hero as a target
                targets.push({
                    type: 'hero',
                    position: position,
                    target: hero,
                    side: side
                });

                // Add all living creatures as targets
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            targets.push({
                                type: 'creature',
                                position: position,
                                creatureIndex: index,
                                target: creature,
                                hero: hero,
                                side: side
                            });
                        }
                    });
                }
            }
        });

        return targets;
    }

    // Apply cannon damage to a specific target
    async applyCannonDamageToTarget(targetData, damage) {
        const { type, target, side, position } = targetData;

        if (type === 'hero') {
            // Apply damage to hero
            this.battleManager.authoritative_applyDamage({
                target: target,
                damage: damage,
                newHp: Math.max(0, target.currentHp - damage),
                died: (target.currentHp - damage) <= 0
            }, {
                source: 'crusader_cannon',
                attacker: null
            });
        } else if (type === 'creature') {
            // Apply damage to creature
            this.battleManager.authoritative_applyDamageToCreature({
                hero: targetData.hero,
                creature: target,
                creatureIndex: targetData.creatureIndex,
                damage: damage,
                position: position,
                side: side
            }, {
                source: 'crusader_cannon',
                attacker: null
            });
        }
    }

    // Create cannonball barrage animation
    async createCannonballBarrageAnimation(targets, cannonCount) {
        console.log(`🎬 Creating cannonball animation for ${targets.length} targets with ${cannonCount} cannons`);
        
        // Ensure CSS is loaded
        this.ensureCannonballAnimationCSS();

        // Create cannonballs for each target
        const animationPromises = targets.map((targetData, index) => {
            // Stagger cannonball launches slightly
            const delay = index * 100;
            return new Promise(resolve => {
                setTimeout(() => {
                    this.createSingleCannonballAnimation(targetData).then(resolve);
                }, delay);
            });
        });

        // Wait for all cannonball animations to complete
        await Promise.all(animationPromises);
    }

    // Create single cannonball animation to a target
    async createSingleCannonballAnimation(targetData) {
        const targetElement = this.getTargetElement(targetData);
        if (!targetElement) {
            console.warn('⚠️ Could not find target element for cannonball animation');
            return;
        }

        // Create cannonball element
        const cannonball = document.createElement('div');
        cannonball.className = 'crusader-cannonball';
        cannonball.innerHTML = '💥';

        // Position cannonball off-screen (coming from opponent's side)
        const targetRect = targetElement.getBoundingClientRect();
        const startX = targetData.side === 'player' ? window.innerWidth + 100 : -100;
        const startY = Math.random() * 200 + 100; // Vary starting height
        const targetX = targetRect.left + (targetRect.width / 2);
        const targetY = targetRect.top + (targetRect.height / 2);

        cannonball.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: 24px;
            z-index: 1000;
            pointer-events: none;
            transform-origin: center;
            filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.8));
        `;

        document.body.appendChild(cannonball);

        // Create explosion effect at target
        const createExplosion = () => {
            const explosion = document.createElement('div');
            explosion.className = 'crusader-cannon-explosion';
            explosion.innerHTML = '💥';
            
            explosion.style.cssText = `
                position: fixed;
                left: ${targetX}px;
                top: ${targetY}px;
                font-size: 36px;
                z-index: 1001;
                pointer-events: none;
                transform: translate(-50%, -50%) scale(0);
                animation: crusaderExplosion 0.6s ease-out forwards;
                filter: drop-shadow(0 0 12px rgba(255, 50, 0, 1));
            `;

            document.body.appendChild(explosion);

            // Remove explosion after animation
            setTimeout(() => {
                if (explosion.parentNode) {
                    explosion.remove();
                }
            }, 600);

            // Screen shake effect
            this.createScreenShake();
        };

        // Animate cannonball to target
        const duration = 800;
        const startTime = Date.now();

        const animateCannonball = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for more realistic trajectory
            const easeInQuad = progress * progress;
            
            const currentX = startX + (targetX - startX) * progress;
            const currentY = startY + (targetY - startY) * easeInQuad;
            
            // Rotate cannonball as it flies
            const rotation = progress * 360 * 2;
            
            cannonball.style.left = `${currentX}px`;
            cannonball.style.top = `${currentY}px`;
            cannonball.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${1 + progress * 0.5})`;
            
            if (progress < 1) {
                requestAnimationFrame(animateCannonball);
            } else {
                // Cannonball reached target - create explosion
                createExplosion();
                
                // Remove cannonball
                if (cannonball.parentNode) {
                    cannonball.remove();
                }
            }
        };

        // Start animation
        requestAnimationFrame(animateCannonball);

        // Return promise that resolves when animation completes
        return new Promise(resolve => {
            setTimeout(resolve, duration + 600); // Include explosion time
        });
    }

    // Get target element for animation
    getTargetElement(targetData) {
        const { type, side, position, creatureIndex } = targetData;

        if (type === 'hero') {
            return document.querySelector(`.${side}-slot.${position}-slot`);
        } else if (type === 'creature') {
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }

        return null;
    }

    // Create screen shake effect
    createScreenShake() {
        const battleField = document.querySelector('.battle-field-container');
        if (battleField) {
            battleField.classList.add('screen-shake');
            setTimeout(() => {
                battleField.classList.remove('screen-shake');
            }, 500);
        }
    }

    // Handle guest cannonball animation
    handleGuestCannonBarrage(data) {
        console.log('🎬 Guest handling cannonball barrage animation:', data);
        
        const { targetSide, damage, cannonCount, targets } = data;
        
        // Log the effect for guest
        this.battleManager.addCombatLog(
            `💥 Crusaders Arm-Cannon barrage! ${cannonCount} cannon(s) fire for ${damage} damage each!`, 
            'warning'
        );

        // Convert target data back to target objects for animation
        const targetObjects = targets.map(targetInfo => {
            let targetElement = null;
            let target = null;

            if (targetInfo.type === 'hero') {
                const heroes = targetSide === 'player' ? 
                    this.battleManager.playerHeroes : 
                    this.battleManager.opponentHeroes;
                target = heroes[targetInfo.position];
                targetElement = this.getTargetElement({
                    type: 'hero',
                    side: targetSide,
                    position: targetInfo.position
                });
            } else if (targetInfo.type === 'creature') {
                const heroes = targetSide === 'player' ? 
                    this.battleManager.playerHeroes : 
                    this.battleManager.opponentHeroes;
                const hero = heroes[targetInfo.position];
                target = hero?.creatures?.[targetInfo.creatureIndex];
                targetElement = this.getTargetElement({
                    type: 'creature',
                    side: targetSide,
                    position: targetInfo.position,
                    creatureIndex: targetInfo.creatureIndex
                });
            }

            return {
                type: targetInfo.type,
                position: targetInfo.position,
                creatureIndex: targetInfo.creatureIndex,
                target: target,
                side: targetSide,
                element: targetElement
            };
        }).filter(t => t.target && t.element); // Filter out invalid targets

        // Create animation
        this.createCannonballBarrageAnimation(targetObjects, cannonCount);
    }

    // Ensure cannonball animation CSS
    ensureCannonballAnimationCSS() {
        if (document.getElementById('crusaderCannonballStyles')) return;

        const style = document.createElement('style');
        style.id = 'crusaderCannonballStyles';
        style.textContent = `
            .crusader-cannonball {
                transition: all 0.1s linear;
                text-shadow: 0 0 8px rgba(255, 100, 0, 0.9);
                animation: cannonballGlow 0.3s ease-in-out infinite alternate;
            }

            @keyframes cannonballGlow {
                from {
                    filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.8));
                    transform: translate(-50%, -50%) scale(1);
                }
                to {
                    filter: drop-shadow(0 0 12px rgba(255, 150, 0, 1));
                    transform: translate(-50%, -50%) scale(1.1);
                }
            }

            @keyframes crusaderExplosion {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(2) rotate(360deg);
                    opacity: 0;
                }
            }

            .screen-shake {
                animation: screenShake 0.5s ease-in-out;
            }

            @keyframes screenShake {
                0%, 100% { transform: translateX(0); }
                10% { transform: translateX(-5px) translateY(2px); }
                20% { transform: translateX(5px) translateY(-2px); }
                30% { transform: translateX(-5px) translateY(2px); }
                40% { transform: translateX(5px) translateY(-2px); }
                50% { transform: translateX(-3px) translateY(1px); }
                60% { transform: translateX(3px) translateY(-1px); }
                70% { transform: translateX(-3px) translateY(1px); }
                80% { transform: translateX(3px) translateY(-1px); }
                90% { transform: translateX(-1px) translateY(0px); }
            }

            .crusader-cannon-explosion {
                animation: crusaderExplosion 0.6s ease-out forwards;
            }
        `;

        document.head.appendChild(style);
    }

    // Hook into the turn change system (existing functionality)
    hookIntoTurnChanges() {
        if (!this.heroSelection || !this.heroSelection.onTurnChange) {
            console.error('❌ Cannot hook into turn changes - heroSelection not available');
            return;
        }

        // Store the original onTurnChange method
        const originalOnTurnChange = this.heroSelection.onTurnChange.bind(this.heroSelection);
        
        // Override it to include our crusader artifacts handling
        this.heroSelection.onTurnChange = (turnChangeData) => {
            // Call the original method first
            originalOnTurnChange(turnChangeData);
            
            // Then handle our crusader artifacts transformation
            this.handleCrusaderArtifactsTransformation();
        };
    }

    // Main handler for crusader artifacts transformation (existing functionality)
    async handleCrusaderArtifactsTransformation() {
        if (!this.heroSelection || !this.heroSelection.heroEquipmentManager) {
            console.error('❌ Equipment manager not available for crusader transformation');
            return;
        }

        const equipmentManager = this.heroSelection.heroEquipmentManager;
        const positions = ['left', 'center', 'right'];
        const transformations = [];

        // Scan all hero positions for crusader artifacts
        for (const position of positions) {
            const equipment = equipmentManager.getHeroEquipment(position);
            
            console.log(`🔍 Scanning ${position} hero equipment:`, equipment.map(e => e.name || e.cardName));
            
            for (let i = 0; i < equipment.length; i++) {
                const item = equipment[i];
                const itemName = item.name || item.cardName;
                
                if (CRUSADERS_ARTIFACTS.includes(itemName)) {
                    // Found a crusader artifact - prepare transformation
                    const newArtifact = this.getRandomDifferentCrusaderArtifact(itemName);
                    transformations.push({
                        position,
                        index: i,
                        oldArtifact: itemName,
                        newArtifact
                    });
                    console.log(`📋 Planned transformation: ${itemName} (index ${i}) → ${newArtifact} on ${position} hero`);
                }
            }
        }

        // Execute all transformations
        if (transformations.length > 0) {
            console.log(`🛡️ Transforming ${transformations.length} Crusader artifacts`);
            
            // Collect affected positions for animation
            const affectedPositions = [...new Set(transformations.map(t => t.position))];
            
            // IMPORTANT: Sort transformations by position and index in REVERSE order
            // This prevents index shifting issues when removing multiple items
            transformations.sort((a, b) => {
                if (a.position !== b.position) {
                    // Sort positions: right, center, left (arbitrary but consistent)
                    const posOrder = { right: 0, center: 1, left: 2 };
                    return posOrder[a.position] - posOrder[b.position];
                }
                // Within same position, sort by index descending (highest first)
                return b.index - a.index;
            });
            
            // Execute transformations silently (without individual animations)
            for (const transformation of transformations) {
                await this.executeCrusaderTransformationSilent(transformation);
            }
            
            // Debug: Final summary of all transformations
            console.log('🛡️ CRUSADER TRANSFORMATION SUMMARY:');
            transformations.forEach((t, i) => {
                console.log(`  ${i + 1}. ${t.position} hero: ${t.oldArtifact} → ${t.newArtifact}`);
            });
            
            // Play single unified animation for all transformations
            await this.playCrusaderTransformationAnimation(affectedPositions);
            
            // Save game state after all transformations
            if (this.heroSelection.saveGameState) {
                await this.heroSelection.saveGameState();
            }
        }
    }

    // Get a random different crusader artifact (existing functionality)
    getRandomDifferentCrusaderArtifact(currentArtifact) {
        const otherArtifacts = CRUSADERS_ARTIFACTS.filter(artifact => artifact !== currentArtifact);
        const randomIndex = Math.floor(Math.random() * otherArtifacts.length);
        return otherArtifacts[randomIndex];
    }

    // Execute a single crusader transformation silently (existing functionality)
    async executeCrusaderTransformationSilent(transformation) {
        const { position, index, oldArtifact, newArtifact } = transformation;
        const equipmentManager = this.heroSelection.heroEquipmentManager;

        try {
            // Debug: show current equipment before removal
            const beforeEquipment = equipmentManager.getHeroEquipment(position);
            console.log(`🔄 Before removing index ${index} from ${position}:`, beforeEquipment.map(e => e.name || e.cardName));
            
            // Remove the old artifact
            const removedItem = equipmentManager.removeArtifactFromHero(position, index);
            if (!removedItem) {
                console.error(`❌ Failed to remove ${oldArtifact} from ${position} hero at index ${index}`);
                return;
            }

            console.log(`🗑️ Successfully removed: ${removedItem.name || removedItem.cardName} from ${position} at index ${index}`);

            // Add the new artifact (without cost)
            const success = await this.addCrusaderArtifactWithoutCost(position, newArtifact);
            if (!success) {
                console.error(`❌ Failed to add ${newArtifact} to ${position} hero`);
                // Try to restore the old artifact
                equipmentManager.heroEquipment[position].splice(index, 0, removedItem);
                return;
            }

            // Debug: show final equipment after addition
            const afterEquipment = equipmentManager.getHeroEquipment(position);
            console.log(`✅ After adding ${newArtifact} to ${position}:`, afterEquipment.map(e => e.name || e.cardName));
            console.log(`🔄 Transformation complete: ${oldArtifact} → ${newArtifact} on ${position} hero`);

        } catch (error) {
            console.error(`❌ Error during crusader transformation:`, error);
        }
    }

    // Add crusader artifact without charging gold cost (existing functionality)
    async addCrusaderArtifactWithoutCost(heroPosition, artifactCardName) {
        const equipmentManager = this.heroSelection.heroEquipmentManager;
        
        // Check if there's a hero at this position
        const formation = this.heroSelection.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        if (!hero) {
            return false;
        }

        // Get artifact info
        const cardInfo = this.heroSelection.getCardInfo(artifactCardName);
        if (!cardInfo) {
            return false;
        }

        // Create equipment entry (without charging cost)
        const equipmentEntry = {
            name: artifactCardName,
            cardName: artifactCardName,
            cost: cardInfo.cost || 0,
            image: cardInfo.image || `./Cards/All/${artifactCardName}.png`,
            equippedAt: Date.now(),
            crusaderTransformed: true // Mark as transformed
        };

        // Add to equipment
        equipmentManager.heroEquipment[heroPosition].push(equipmentEntry);

        // Trigger callback
        if (equipmentManager.onEquipmentChangeCallback) {
            equipmentManager.onEquipmentChangeCallback({
                type: 'crusader_transformed',
                heroPosition,
                artifactName: artifactCardName,
                hero: hero
            });
        }

        return true;
    }

    // Play unified transformation animation for all affected heroes (existing functionality)
    async playCrusaderTransformationAnimation(affectedPositions) {
        const heroSlots = [];
        
        // Find all affected hero slot elements
        for (const position of affectedPositions) {
            const heroSlot = document.querySelector(`.team-slot[data-position="${position}"]`);
            if (heroSlot) {
                heroSlots.push({ element: heroSlot, position });
            }
        }
        
        if (heroSlots.length === 0) {
            console.warn('⚠️ No hero slots found for crusader transformation animation');
            return;
        }

        // Add styles if not already present
        this.ensureCrusaderAnimationStyles();

        // Create animation effects for each affected hero
        const animationPromises = heroSlots.map(({ element, position }) => 
            this.createCrusaderEffectForHero(element, position)
        );

        // Wait for all animations to complete
        await Promise.all(animationPromises);
    }

    // Create crusader transformation effect for a single hero (existing functionality)
    async createCrusaderEffectForHero(heroSlot, position) {
        // Create glow overlay
        const glowOverlay = document.createElement('div');
        glowOverlay.className = 'crusader-glow-overlay';
        
        // Create sparkle container
        const sparkleContainer = document.createElement('div');
        sparkleContainer.className = 'crusader-sparkle-container';
        
        // Generate sparkles
        const sparkleSymbols = ['⚔️', '🛡️', '✨', '⭐', '🔥', '💫'];
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'crusader-sparkle';
            sparkle.textContent = sparkleSymbols[Math.floor(Math.random() * sparkleSymbols.length)];
            sparkle.style.animationDelay = `${i * 0.1}s`;
            sparkleContainer.appendChild(sparkle);
        }

        // Position and add overlays
        heroSlot.style.position = 'relative';
        heroSlot.appendChild(glowOverlay);
        heroSlot.appendChild(sparkleContainer);

        // Add glow effect to hero slot
        heroSlot.classList.add('crusader-transforming');

        // Remove effects after animation
        setTimeout(() => {
            if (glowOverlay.parentNode) glowOverlay.remove();
            if (sparkleContainer.parentNode) sparkleContainer.remove();
            heroSlot.classList.remove('crusader-transforming');
        }, 1200);

        // Return promise that resolves when animation completes
        return new Promise(resolve => {
            setTimeout(resolve, 1200);
        });
    }

    // Format artifact name for display (existing functionality)
    formatArtifactName(artifactName) {
        return artifactName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace('Crusaders ', '')
            .trim();
    }

    // Ensure CSS styles are loaded (existing functionality enhanced)
    ensureCrusaderAnimationStyles() {
        if (document.getElementById('crusaderTransformationStyles')) return;

        const style = document.createElement('style');
        style.id = 'crusaderTransformationStyles';
        style.textContent = `
            /* Hero slot transformation effects */
            .crusader-transforming {
                animation: crusaderHeroGlow 1.2s ease-out;
                transform-origin: center;
            }

            .crusader-glow-overlay {
                position: absolute;
                top: -5px;
                left: -5px;
                right: -5px;
                bottom: -5px;
                background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
                border-radius: 20px;
                opacity: 0;
                animation: crusaderGlow 1.2s ease-out;
                pointer-events: none;
                z-index: 99;
            }

            .crusader-sparkle-container {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 100;
            }

            .crusader-sparkle {
                position: absolute;
                font-size: 18px;
                opacity: 0;
                animation: crusaderSparkleFloat 1.2s ease-out;
                pointer-events: none;
                text-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
            }

            /* Distribute sparkles around the hero slot */
            .crusader-sparkle:nth-child(1) { top: 10%; left: 10%; animation-delay: 0s; }
            .crusader-sparkle:nth-child(2) { top: 10%; right: 10%; animation-delay: 0.1s; }
            .crusader-sparkle:nth-child(3) { top: 50%; left: -5%; animation-delay: 0.2s; }
            .crusader-sparkle:nth-child(4) { top: 50%; right: -5%; animation-delay: 0.3s; }
            .crusader-sparkle:nth-child(5) { bottom: 10%; left: 10%; animation-delay: 0.4s; }
            .crusader-sparkle:nth-child(6) { bottom: 10%; right: 10%; animation-delay: 0.5s; }
            .crusader-sparkle:nth-child(7) { top: 30%; left: 50%; transform: translateX(-50%); animation-delay: 0.6s; }
            .crusader-sparkle:nth-child(8) { bottom: 30%; left: 50%; transform: translateX(-50%); animation-delay: 0.7s; }

            /* Animations */
            @keyframes crusaderHeroGlow {
                0% { 
                    box-shadow: 0 0 0 rgba(255, 215, 0, 0);
                    border-color: transparent;
                }
                30% { 
                    box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4);
                    border-color: rgba(255, 215, 0, 0.6);
                }
                70% { 
                    box-shadow: 0 0 25px rgba(255, 215, 0, 0.6), 0 0 50px rgba(255, 215, 0, 0.3);
                    border-color: rgba(255, 215, 0, 0.4);
                }
                100% { 
                    box-shadow: 0 0 0 rgba(255, 215, 0, 0);
                    border-color: transparent;
                }
            }

            @keyframes crusaderGlow {
                0% { opacity: 0; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1.05); }
                100% { opacity: 0; transform: scale(1.1); }
            }

            @keyframes crusaderSparkleFloat {
                0% { 
                    opacity: 0; 
                    transform: translateY(0) rotate(0deg) scale(0.5); 
                }
                20% { 
                    opacity: 1; 
                    transform: translateY(-10px) rotate(90deg) scale(1.2); 
                }
                50% { 
                    opacity: 1; 
                    transform: translateY(-25px) rotate(180deg) scale(1); 
                }
                80% { 
                    opacity: 1; 
                    transform: translateY(-15px) rotate(270deg) scale(1.1); 
                }
                100% { 
                    opacity: 0; 
                    transform: translateY(-30px) rotate(360deg) scale(0.8); 
                }
            }

            /* Add subtle pulse to equipment area during transformation */
            .crusader-transforming .equipment-display {
                animation: crusaderEquipmentPulse 1.2s ease-out;
            }

            @keyframes crusaderEquipmentPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
            }
        `;

        document.head.appendChild(style);
    }

    // Utility methods for external access (existing functionality)

    // Check if an artifact is a crusader artifact
    isCrusaderArtifact(artifactName) {
        return CRUSADERS_ARTIFACTS.includes(artifactName);
    }

    // Get all crusader artifacts currently equipped
    getAllEquippedCrusaderArtifacts() {
        if (!this.heroSelection || !this.heroSelection.heroEquipmentManager) {
            return [];
        }

        const equipmentManager = this.heroSelection.heroEquipmentManager;
        const positions = ['left', 'center', 'right'];
        const crusaderArtifacts = [];

        for (const position of positions) {
            const equipment = equipmentManager.getHeroEquipment(position);
            
            equipment.forEach((item, index) => {
                const itemName = item.name || item.cardName;
                if (CRUSADERS_ARTIFACTS.includes(itemName)) {
                    crusaderArtifacts.push({
                        position,
                        index,
                        artifact: itemName
                    });
                }
            });
        }

        return crusaderArtifacts;
    }

    // Get transformation statistics
    getTransformationStats() {
        const equipped = this.getAllEquippedCrusaderArtifacts();
        return {
            totalEquipped: equipped.length,
            byPosition: {
                left: equipped.filter(item => item.position === 'left').length,
                center: equipped.filter(item => item.position === 'center').length,
                right: equipped.filter(item => item.position === 'right').length
            },
            artifacts: equipped.map(item => item.artifact)
        };
    }

    // Reset/cleanup method
    reset() {
        this.battleManager = null;
        this.initialized = false;
        console.log('🛡️ CrusaderArtifactsHandler reset');
    }
}

// Create and export the handler instance
const crusaderArtifactsHandler = new CrusaderArtifactsHandler();

// Export as crusaderArtifactsArtifact to match the naming convention expected by artifactHandler
export const crusaderArtifactsArtifact = crusaderArtifactsHandler;

// Also export the handler directly for easier access
export { crusaderArtifactsHandler };

// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.crusaderArtifactsHandler = crusaderArtifactsHandler;
}