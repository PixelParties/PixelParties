// Potions/teleportationPowder.js - TeleportationPowder Potion Implementation with Multi-Player Battle Integration

export class TeleportationPowderPotion {
    constructor() {
        this.name = 'TeleportationPowder';
        this.displayName = 'Teleportation Powder';
        this.description = 'Removes up to 5 random enemy creatures from battle entirely';
        this.effectType = 'creature_removal';
        this.targetType = 'enemy_creatures_only';
        this.maxTargets = 5; // Maximum creatures to teleport away
        
        console.log('TeleportationPowder potion initialized with multi-player support');
    }

    // ===== MAIN EFFECT METHODS =====

    // Apply teleportation effect to a single creature
    async applyTeleportationEffect(creature, battleManager, creatureInfo) {
        if (!creature || !battleManager || !creatureInfo) {
            console.error('Invalid parameters for TeleportationPowder effect');
            return false;
        }

        try {
            // Validate creature is alive and valid
            if (!this.isCreatureValid(creature)) {
                console.log(`Skipping TeleportationPowder effect on invalid/dead creature: ${creature.name || 'Unknown'}`);
                return false;
            }

            // Show dark energy effect first
            await this.showDarkEnergyEffect(creature, battleManager, creatureInfo);
            
            // IMMEDIATELY remove visual element
            const { hero, creatureIndex } = creatureInfo;
            const side = hero.side;
            const position = hero.position;
            
            // Remove DOM element first
            const creatureElement = document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
            
            if (creatureElement) {
                creatureElement.style.transition = 'opacity 0.3s ease-out';
                creatureElement.style.opacity = '0';
                setTimeout(() => {
                    if (creatureElement.parentNode) {
                        creatureElement.remove();
                    }
                }, 300);
            }
            
            // Remove creature from its hero's creatures array
            if (hero && hero.creatures && creatureIndex >= 0 && creatureIndex < hero.creatures.length) {
                const removedCreature = hero.creatures.splice(creatureIndex, 1)[0];
                
                console.log(`🌀 Teleported away: ${removedCreature.name} from ${hero.name}`);
                
                // Force complete rebuild of creature container
                setTimeout(() => {
                    const heroSlot = document.querySelector(`.${side}-slot.${position}-slot`);
                    if (heroSlot) {
                        const existingCreatures = heroSlot.querySelector('.battle-hero-creatures');
                        if (existingCreatures) {
                            existingCreatures.remove();
                        }
                        
                        if (hero.creatures.length > 0) {
                            const creaturesHTML = battleManager.battleScreen.createCreaturesHTML(hero.creatures, side, position);
                            heroSlot.insertAdjacentHTML('beforeend', creaturesHTML);
                        }
                    }
                }, 350);
                
                // Send network update to sync creature removal
                if (battleManager.isAuthoritative) {
                    battleManager.sendBattleUpdate('creature_teleported', {
                        heroAbsoluteSide: hero.absoluteSide,
                        heroPosition: hero.position,
                        creatureIndex: creatureIndex,
                        creatureName: removedCreature.name,
                        creatureId: removedCreature.addedAt ? `${removedCreature.name}_${removedCreature.addedAt}` : removedCreature.name,
                        timestamp: Date.now()
                    });
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Error applying TeleportationPowder effect:', error);
            return false;
        }
    }

    // Apply TeleportationPowder effects to multiple targets (main entry point for potion handler)
    async applyTeleportationEffectsToTargets(targets, battleManager, playerRole, effectCount = 1) {
        if (!targets || targets.length === 0) {
            console.log(`No targets provided for TeleportationPowder effects from ${playerRole}`);
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for TeleportationPowder effects');
            return 0;
        }

        console.log(`🌀 Applying TeleportationPowder effects: ${effectCount} powders to ${targets.length} potential targets from ${playerRole}`);

        // Calculate total max creatures to teleport (5 per powder)
        const totalMaxTargets = this.maxTargets * effectCount;
        
        // Limit to available targets
        let actualTargets = targets.slice(0, totalMaxTargets);
        
        // CRITICAL FIX: Sort targets by creatureIndex in descending order
        // This ensures we remove creatures from the end of arrays first,
        // preventing index shifting issues
        actualTargets.sort((a, b) => {
            // First sort by hero position, then by creature index (descending)
            if (a.heroPosition !== b.heroPosition) {
                return a.heroPosition.localeCompare(b.heroPosition);
            }
            return b.creatureIndex - a.creatureIndex; // Descending order
        });
        
        let creaturesRemoved = 0;
        const teleportedCreatureNames = []; // Track which creatures were teleported
        const effectPromises = [];

        // Apply teleportation effects to selected creatures
        for (const targetInfo of actualTargets) {
            if (this.isCreatureValid(targetInfo.creature)) {
                const effectPromise = this.applyTeleportationEffect(targetInfo.creature, battleManager, targetInfo)
                    .then(success => {
                        if (success) {
                            creaturesRemoved++;
                            // Add creature name to the list of teleported creatures
                            teleportedCreatureNames.push(targetInfo.creature.name);
                        }
                        return success;
                    })
                    .catch(error => {
                        console.error(`Error applying TeleportationPowder to ${targetInfo.creature.name}:`, error);
                        return false;
                    });
                
                effectPromises.push(effectPromise);
            }
        }

        // Wait for all effects to complete
        await Promise.all(effectPromises);

        // Add appropriate combat log message with creature names
        this.addBattleLogMessage(battleManager, playerRole, effectCount, creaturesRemoved, actualTargets.length, teleportedCreatureNames);

        // Force creature state sync after teleportation
        if (battleManager.isAuthoritative && creaturesRemoved > 0) {
            setTimeout(() => {
                battleManager.sendCreatureStateSync();
            }, 100);
        }

        console.log(`✅ TeleportationPowder effects completed: ${creaturesRemoved}/${actualTargets.length} creatures teleported by ${effectCount} powders from ${playerRole}`);
        console.log(`Teleported creatures: ${teleportedCreatureNames.join(', ')}`);
        return creaturesRemoved;
    }

    // ===== TARGET VALIDATION AND COLLECTION =====

    // Check if a creature is valid for teleportation
    isCreatureValid(creature) {
        if (!creature) return false;
        
        // Check if creature has alive property and is alive
        if (creature.hasOwnProperty('alive')) {
            return creature.alive === true;
        }
        
        // Fallback: assume creature is valid if no alive property
        return true;
    }

    // Collect up to maxTargets random enemy creatures for teleportation
    collectRandomEnemyCreatures(battleManager, playerRole, maxCreatures) {
        if (!battleManager) {
            console.error('No battle manager provided for target collection');
            return [];
        }

        // Determine which heroes are enemies based on player role
        const enemyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.opponentHeroes) : 
            Object.values(battleManager.playerHeroes);

        const allEnemyCreatures = [];

        // Collect all living enemy creatures with their context
        enemyHeroes.forEach(hero => {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                hero.creatures.forEach((creature, index) => {
                    if (this.isCreatureValid(creature)) {
                        allEnemyCreatures.push({
                            creature: creature,
                            hero: hero,
                            creatureIndex: index,
                            heroPosition: hero.position,
                            heroSide: hero.side
                        });
                    }
                });
            }
        });

        // Shuffle the array randomly and take up to maxCreatures
        const shuffledCreatures = this.shuffleArray([...allEnemyCreatures]);
        const selectedCreatures = shuffledCreatures.slice(0, maxCreatures);

        console.log(`Collected ${selectedCreatures.length} random enemy creatures for ${playerRole} TeleportationPowder effects`);
        console.log('Target breakdown:', selectedCreatures.map(t => `${t.creature.name} (${t.hero.name})`));
        
        return selectedCreatures;
    }

    // Utility method to shuffle array randomly
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ===== VISUAL EFFECTS =====

    // Show the dark energy teleportation effect
    async showDarkEnergyEffect(creature, battleManager, creatureInfo) {
        try {
            console.log(`Showing dark energy effect for ${creature.name} at position ${creatureInfo.heroPosition}, index ${creatureInfo.creatureIndex}`);
            
            // Get the creature element
            const creatureElement = this.getCreatureElement(creature, battleManager, creatureInfo);
            if (!creatureElement) {
                console.warn(`Could not find creature element for ${creature.name} - skipping visual effect`);
                console.log('Available creature elements:', document.querySelectorAll('.creature-icon'));
                return;
            }

            console.log(`Found creature element for ${creature.name}:`, creatureElement);
            
            // Create and show the dark energy effect
            await this.createDarkEnergyAnimation(creatureElement);
            
        } catch (error) {
            console.error('Error showing dark energy effect:', error);
        }
    }

    // Create the dark energy animation
    async createDarkEnergyAnimation(creatureElement) {
        // Create the main dark energy swirl
        const darkSwirl = this.createDarkEnergySwirl();
        
        // Position it on the creature
        this.positionEffectOnElement(darkSwirl, creatureElement);
        
        // Add to DOM and animate
        document.body.appendChild(darkSwirl);
        
        // Create multiple energy tendrils
        const tendrils = [];
        const tendrilCount = 6 + Math.floor(Math.random() * 3); // 6-8 tendrils
        
        for (let i = 0; i < tendrilCount; i++) {
            const tendril = this.createEnergyTendril(i);
            this.positionEffectOnElement(tendril, creatureElement);
            document.body.appendChild(tendril);
            tendrils.push(tendril);
        }
        
        // Create void portal effect
        this.createVoidPortalEffect(creatureElement);
        
        // Wait for animation to complete
        await this.waitForAnimation(1200);
        
        // Clean up elements
        darkSwirl.remove();
        tendrils.forEach(tendril => tendril.remove());
    }

    // Create the main dark energy swirl element
    createDarkEnergySwirl() {
        const darkSwirl = document.createElement('div');
        darkSwirl.className = 'teleportation-dark-swirl';
        darkSwirl.innerHTML = '🌀';
        
        darkSwirl.style.cssText = `
            position: absolute;
            font-size: 60px;
            z-index: 1000;
            pointer-events: none;
            animation: teleportationDarkSwirl 1.2s ease-out forwards;
            text-shadow: 
                0 0 30px #4a0080,
                0 0 60px #2d004d,
                0 0 90px #1a002e;
            filter: drop-shadow(0 0 20px rgba(74, 0, 128, 0.9));
            color: #6a1b9a;
        `;
        
        return darkSwirl;
    }

    // Create an energy tendril for the teleportation effect
    createEnergyTendril(index) {
        const tendril = document.createElement('div');
        tendril.className = `teleportation-tendril teleportation-tendril-${index}`;
        
        // Randomize tendril appearance with dark energy symbols
        const tendrils = ['⚡', '✦', '◆', '▲', '●', '◈'];
        const randomTendril = tendrils[Math.floor(Math.random() * tendrils.length)];
        tendril.innerHTML = randomTendril;
        
        // Calculate spiral pattern and random variations
        const angle = (index * (360 / 8)) + (Math.random() * 30 - 15);
        const distance = 40 + Math.random() * 80;
        const duration = 0.6 + Math.random() * 0.8;
        
        tendril.style.cssText = `
            position: absolute;
            font-size: ${10 + Math.random() * 15}px;
            z-index: 999;
            pointer-events: none;
            animation: teleportationTendril${index} ${duration}s ease-out forwards;
            text-shadow: 
                0 0 10px #4a0080,
                0 0 20px #2d004d;
            filter: drop-shadow(0 0 10px rgba(74, 0, 128, 0.7));
            color: #9c27b0;
        `;
        
        // Create custom animation for this tendril
        this.createTendrilAnimation(index, angle, distance, duration);
        
        return tendril;
    }

    // Create custom animation for energy tendrils
    createTendrilAnimation(index, angle, distance, duration) {
        const angleRad = (angle * Math.PI) / 180;
        const endX = Math.cos(angleRad) * distance;
        const endY = Math.sin(angleRad) * distance;
        
        const animationName = `teleportationTendril${index}`;
        
        // Check if animation already exists
        if (this.animationExists(animationName)) {
            return;
        }
        
        const keyframes = `
            @keyframes ${animationName} {
                0% {
                    transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
                    opacity: 0;
                }
                20% {
                    transform: translate(calc(-50% + ${endX * 0.3}px), calc(-50% + ${endY * 0.3}px)) scale(1.2) rotate(90deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(calc(-50% + ${endX * 0.7}px), calc(-50% + ${endY * 0.7}px)) scale(0.9) rotate(180deg);
                    opacity: 0.8;
                }
                80% {
                    transform: translate(calc(-50% + ${endX * 0.9}px), calc(-50% + ${endY * 0.9}px)) scale(0.6) rotate(270deg);
                    opacity: 0.4;
                }
                100% {
                    transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.1) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        
        this.addAnimationToDocument(animationName, keyframes);
    }

    // Create void portal effect on the creature
    createVoidPortalEffect(creatureElement) {
        const voidPortal = document.createElement('div');
        voidPortal.className = 'teleportation-void-portal';
        
        voidPortal.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, 
                transparent 30%, 
                rgba(74, 0, 128, 0.6) 40%, 
                rgba(45, 0, 77, 0.8) 60%,
                rgba(26, 0, 46, 0.9) 80%,
                #000000 100%);
            z-index: 998;
            pointer-events: none;
            animation: teleportationVoidPortal 1.2s ease-out forwards;
            border-radius: 50%;
            border: 2px solid rgba(106, 27, 154, 0.5);
        `;
        
        creatureElement.appendChild(voidPortal);
        
        setTimeout(() => {
            if (voidPortal && voidPortal.parentNode) {
                voidPortal.remove();
            }
        }, 1200);
    }

    // ===== UTILITY METHODS =====

    // Get the DOM element for a creature
    getCreatureElement(creature, battleManager, creatureInfo) {
        if (!creature || !battleManager || !creatureInfo) return null;
        
        const { hero, creatureIndex } = creatureInfo;
        
        if (hero && hero.position && creatureIndex >= 0) {
            const heroSide = hero.side;
            const heroPosition = hero.position;
            
            // Use the correct selector that matches battleManager's DOM structure
            const creatureSelector = `.${heroSide}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`;
            const element = document.querySelector(creatureSelector);
            
            if (!element) {
                console.warn(`Could not find creature element with selector: ${creatureSelector}`);
                // Try alternative selectors as fallback
                const altSelector1 = `.${heroSide}-slot.${heroPosition}-slot .creature-icon:nth-child(${creatureIndex + 1})`;
                const altElement1 = document.querySelector(altSelector1);
                
                if (altElement1) {
                    console.log(`Found creature using alternative selector: ${altSelector1}`);
                    return altElement1;
                }
                
                // Final fallback - find by creature name
                const nameSelector = `.${heroSide}-slot.${heroPosition}-slot .creature-icon img[alt*="${creature.name}"]`;
                const nameElement = document.querySelector(nameSelector);
                if (nameElement) {
                    console.log(`Found creature using name selector: ${nameSelector}`);
                    return nameElement.closest('.creature-icon');
                }
            }
            
            return element;
        }
        
        return null;
    }

    // Position effect on element
    positionEffectOnElement(effectElement, targetElement) {
        if (!targetElement) {
            console.warn('Target element not found for teleportation effect, positioning at center of screen');
            // Fallback to center of screen if element not found
            effectElement.style.left = '50vw';
            effectElement.style.top = '50vh';
            effectElement.style.transform = 'translate(-50%, -50%)';
            return;
        }
        
        const rect = targetElement.getBoundingClientRect();
        
        // Verify the element has valid dimensions
        if (rect.width === 0 || rect.height === 0) {
            console.warn('Target element has no dimensions, using fallback positioning');
            effectElement.style.left = '50vw';
            effectElement.style.top = '50vh';
            effectElement.style.transform = 'translate(-50%, -50%)';
            return;
        }
        
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Add some randomness for multiple effects
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        
        effectElement.style.left = `${centerX + offsetX}px`;
        effectElement.style.top = `${centerY + offsetY}px`;
        effectElement.style.transform = 'translate(-50%, -50%)';
        
        console.log(`Positioned effect at: ${centerX + offsetX}, ${centerY + offsetY}`);
    }

    // Add battle log message with proper player context
    addBattleLogMessage(battleManager, playerRole, effectCount, creaturesRemoved, totalTargets, teleportedCreatureNames = []) {
        if (!battleManager || !battleManager.addCombatLog) {
            console.warn('No battle manager or combat log available for TeleportationPowder message');
            return;
        }

        const playerName = playerRole === 'host' ? 'Host' : 'Guest';
        const logType = playerRole === 'host' ? 'success' : 'error';
        
        let message;
        
        if (creaturesRemoved === 0) {
            message = `🌀 ${playerName}'s Teleportation Powder${effectCount > 1 ? 's' : ''} fizzle${effectCount === 1 ? 's' : ''} - no creatures to banish!`;
        } else {
            // Create the creature names part
            let creatureNamesText = '';
            if (teleportedCreatureNames.length > 0) {
                if (teleportedCreatureNames.length === 1) {
                    creatureNamesText = ` (${teleportedCreatureNames[0]})`;
                } else if (teleportedCreatureNames.length === 2) {
                    creatureNamesText = ` (${teleportedCreatureNames.join(' and ')})`;
                } else if (teleportedCreatureNames.length <= 5) {
                    const lastCreature = teleportedCreatureNames.pop();
                    creatureNamesText = ` (${teleportedCreatureNames.join(', ')}, and ${lastCreature})`;
                    teleportedCreatureNames.push(lastCreature); // restore the array
                } else {
                    // For more than 5 creatures, show first few and "and X others"
                    const firstFew = teleportedCreatureNames.slice(0, 3);
                    const remaining = teleportedCreatureNames.length - 3;
                    creatureNamesText = ` (${firstFew.join(', ')}, and ${remaining} others)`;
                }
            }
            
            // Create the main message
            const powderText = effectCount === 1 ? 'Teleportation Powder' : `${effectCount} Teleportation Powders`;
            const creatureText = creaturesRemoved === 1 ? 'creature' : 'creatures';
            const verbText = creaturesRemoved === 1 ? 'banishes' : 'banish';
            
            message = `🌀 ${playerName}'s ${powderText} ${verbText} ${creaturesRemoved} enemy ${creatureText} to the void!${creatureNamesText}`;
        }
        
        battleManager.addCombatLog(message, logType);
    }

    // Check if animation already exists
    animationExists(animationName) {
        const styleSheets = document.styleSheets;
        for (let i = 0; i < styleSheets.length; i++) {
            try {
                const rules = styleSheets[i].cssRules || styleSheets[i].rules;
                for (let j = 0; j < rules.length; j++) {
                    if (rules[j].type === CSSRule.KEYFRAMES_RULE && rules[j].name === animationName) {
                        return true;
                    }
                }
            } catch (e) {
                // Cross-origin stylesheets might throw errors, ignore them
                continue;
            }
        }
        return false;
    }

    // Add animation to document
    addAnimationToDocument(animationName, keyframes) {
        let styleSheet = document.getElementById('teleportationPowderAnimations');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'teleportationPowderAnimations';
            document.head.appendChild(styleSheet);
        }
        
        try {
            styleSheet.appendChild(document.createTextNode(keyframes));
        } catch (e) {
            // Fallback for older browsers
            styleSheet.styleSheet.cssText += keyframes;
        }
    }

    // Wait for animation to complete
    async waitForAnimation(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    // ===== INTEGRATION METHODS FOR POTION HANDLER =====

    // Main integration method called by potion handler
    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0) {
            console.log('No TeleportationPowder effects to apply');
            return 0;
        }

        if (!battleManager) {
            console.error('No battle manager provided for TeleportationPowder effects');
            return 0;
        }

        console.log(`🌀 TeleportationPowder handling ${effects.length} effect(s) for ${playerRole}`);

        try {
            // Calculate total max creatures to teleport
            const effectCount = effects.length;
            const maxCreaturesToTeleport = this.maxTargets * effectCount;
            
            // Collect random enemy creatures
            const targets = this.collectRandomEnemyCreatures(battleManager, playerRole, maxCreaturesToTeleport);
            
            if (targets.length === 0) {
                console.log(`No valid creature targets found for ${playerRole} TeleportationPowder effects`);
                battleManager.addCombatLog(
                    `🌀 ${playerRole === 'host' ? 'Host' : 'Guest'}'s Teleportation Powder finds no creatures to banish!`, 
                    playerRole === 'host' ? 'success' : 'error'
                );
                return 0;
            }

            // Apply teleportation effects to selected creatures
            const creaturesRemoved = await this.applyTeleportationEffectsToTargets(
                targets, 
                battleManager, 
                playerRole, 
                effectCount
            );

            return effectCount; // Return number of potion effects processed
            
        } catch (error) {
            console.error(`Error handling TeleportationPowder effects for ${playerRole}:`, error);
            
            // Fallback: log failure
            this.applyFallbackTeleportationEffects(battleManager, playerRole, effects.length);
            return effects.length;
        }
    }

    // Fallback teleportation effect application (minimal effect)
    applyFallbackTeleportationEffects(battleManager, playerRole, effectCount) {
        try {
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `🌀 ${playerName}'s Teleportation Powder effects failed to activate properly`, 
                'warning'
            );
            
            console.log(`Fallback TeleportationPowder: Failed to apply ${effectCount} teleportation effects`);
            
        } catch (error) {
            console.error('Error in fallback TeleportationPowder application:', error);
        }
    }

    // Handle guest receiving creature teleportation update
    guest_handleCreatureTeleported(data, battleManager) {
        if (!data) {
            console.warn('TeleportationPowder: No data provided for guest creature teleportation');
            return;
        }
        
        if (!battleManager) {
            console.error('TeleportationPowder: No battle manager provided for guest creature teleportation');
            return;
        }
        
        if (battleManager.isAuthoritative) {
            console.warn('TeleportationPowder: Host should not process guest teleportation messages');
            return;
        }
        
        const { heroAbsoluteSide, heroPosition, creatureIndex, creatureName, creatureId, timestamp } = data;
        
        // Validate required data
        if (!heroAbsoluteSide || !heroPosition || creatureIndex === undefined || !creatureName) {
            console.error('TeleportationPowder: Invalid data for creature teleportation:', data);
            return;
        }
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        console.log(`Guest: Processing teleportation of ${creatureName} from ${targetLocalSide} ${heroPosition}`);
        
        // Find the target hero
        const heroes = targetLocalSide === 'player' ? 
            battleManager.playerHeroes : 
            battleManager.opponentHeroes;
            
        if (!heroes) {
            console.error(`TeleportationPowder: No heroes object found for ${targetLocalSide} side`);
            return;
        }
        
        const hero = heroes[heroPosition];
        if (!hero) {
            console.error(`TeleportationPowder: No hero found at position ${heroPosition} on ${targetLocalSide} side`);
            return;
        }
        
        if (!hero.creatures || !Array.isArray(hero.creatures)) {
            console.error(`TeleportationPowder: Invalid creatures array for hero ${hero.name || 'Unknown'}`);
            return;
        }
        
        // Validate creature index
        if (creatureIndex < 0 || creatureIndex >= hero.creatures.length) {
            console.warn(`TeleportationPowder: Invalid creature index ${creatureIndex} for hero with ${hero.creatures.length} creatures`);
            return;
        }
        
        // Find the creature to teleport
        const creature = hero.creatures[creatureIndex];
        if (!creature) {
            console.warn(`TeleportationPowder: Could not find creature at index ${creatureIndex}`);
            return;
        }
        
        // Validate creature name matches (safety check)
        if (creature.name !== creatureName) {
            console.warn(`TeleportationPowder: Creature name mismatch. Expected: ${creatureName}, Found: ${creature.name}`);
            // Continue anyway - host is authoritative
        }
        
        console.log(`Guest: Found creature to teleport: ${creature.name} at index ${creatureIndex}`);
        
        // Create creature info for the effect
        const creatureInfo = {
            creature: creature,
            hero: hero,
            creatureIndex: creatureIndex,
            heroPosition: heroPosition,
            heroSide: targetLocalSide
        };
        
        // Show the teleportation animation on guest side, then remove creature
        this.showDarkEnergyEffect(creature, battleManager, creatureInfo)
            .then(() => {
                // After animation completes, remove the creature
                this.removeCreatureFromGuest(hero, creatureIndex, creatureName, targetLocalSide, heroPosition, battleManager);
            })
            .catch(error => {
                console.error('TeleportationPowder: Error during guest teleportation animation:', error);
                // Still remove the creature even if animation failed
                this.removeCreatureFromGuest(hero, creatureIndex, creatureName, targetLocalSide, heroPosition, battleManager);
            });
    }

    removeCreatureFromGuest(hero, creatureIndex, creatureName, targetLocalSide, heroPosition, battleManager) {
        if (!hero || !hero.creatures || !Array.isArray(hero.creatures)) {
            console.error('TeleportationPowder: Invalid hero or creatures array for guest removal');
            return;
        }
        
        // Double-check index validity
        if (creatureIndex < 0 || creatureIndex >= hero.creatures.length) {
            console.warn(`TeleportationPowder: Cannot remove creature at invalid index ${creatureIndex}`);
            return;
        }
        
        // Remove the creature from the array
        const removedCreature = hero.creatures.splice(creatureIndex, 1)[0];
        
        if (removedCreature) {
            console.log(`Guest: Successfully removed ${removedCreature.name || creatureName} from ${hero.name || 'Unknown Hero'}`);
            
            // Force complete visual rebuild to prevent index issues
            this.forceCompleteCreatureRefresh(targetLocalSide, heroPosition, hero, battleManager);
            
            // Update necromancy displays
            if (battleManager.necromancyManager) {
                try {
                    battleManager.necromancyManager.initializeNecromancyStackDisplays();
                } catch (error) {
                    console.warn('TeleportationPowder: Error updating necromancy displays:', error);
                }
            }
            
            // Add to combat log with specific creature name
            const logType = targetLocalSide === 'player' ? 'error' : 'success';
            if (battleManager.addCombatLog) {
                battleManager.addCombatLog(
                    `🌀 ${creatureName} vanishes into the void!`,
                    logType
                );
            }
            
            // Force a creature state refresh after a brief delay
            setTimeout(() => {
                if (battleManager.refreshAllCreatureVisuals) {
                    battleManager.refreshAllCreatureVisuals();
                }
            }, 100);
            
        } else {
            console.error(`TeleportationPowder: Failed to remove creature ${creatureName} at index ${creatureIndex}`);
        }
    }

    removeCreatureElement(side, position, creatureIndex) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (creatureElement) {
            // Add removal animation
            creatureElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            creatureElement.style.opacity = '0';
            creatureElement.style.transform = 'scale(0.5)';
            
            setTimeout(() => {
                if (creatureElement.parentNode) {
                    creatureElement.remove();
                }
            }, 300);
        }
    }

    forceCompleteCreatureRefresh(side, position, hero, battleManager) {
        if (!side || !position || !hero) {
            console.error('TeleportationPowder: Invalid parameters for creature refresh');
            return;
        }
        
        try {
            // Remove all existing creature elements for this hero
            const heroSlot = document.querySelector(`.${side}-slot.${position}-slot`);
            if (heroSlot) {
                const existingCreatures = heroSlot.querySelector('.battle-hero-creatures');
                if (existingCreatures) {
                    existingCreatures.remove();
                }
                
                // Rebuild creatures if any remain
                if (hero.creatures && hero.creatures.length > 0 && battleManager.battleScreen) {
                    try {
                        const creaturesHTML = battleManager.battleScreen.createCreaturesHTML(hero.creatures, side, position);
                        if (creaturesHTML) {
                            heroSlot.insertAdjacentHTML('beforeend', creaturesHTML);
                        }
                    } catch (error) {
                        console.error('TeleportationPowder: Error creating creatures HTML:', error);
                    }
                }
            }
            
            // Update visual states
            if (battleManager.updateCreatureVisuals) {
                battleManager.updateCreatureVisuals(side, position, hero.creatures || []);
            }
            
        } catch (error) {
            console.error('TeleportationPowder: Error during creature refresh:', error);
        }
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is TeleportationPowder
    static isTeleportationPowder(potionName) {
        return potionName === 'TeleportationPowder';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'TeleportationPowder',
            displayName: 'Teleportation Powder',
            description: 'Removes up to 5 random enemy creatures from battle entirely',
            cardType: 'Potion',
            cost: 0,
            effect: 'Removes up to 5 random enemy creatures from the battlefield at battle start',
            maxTargets: 5,
            targetType: 'enemy_creatures_only'
        };
    }

    // Static method to create a new instance
    static create() {
        return new TeleportationPowderPotion();
    }

    // Static method for quick effect application (utility)
    static async applyToRandomEnemyCreatures(battleManager, playerRole, stackCount = 1) {
        const potion = new TeleportationPowderPotion();
        const maxCreatures = potion.maxTargets * stackCount;
        const targets = potion.collectRandomEnemyCreatures(battleManager, playerRole, maxCreatures);
        return await potion.applyTeleportationEffectsToTargets(targets, battleManager, playerRole, stackCount);
    }
}

// Add CSS animations for TeleportationPowder effects
if (typeof document !== 'undefined' && !document.getElementById('teleportationPowderStyles')) {
    const style = document.createElement('style');
    style.id = 'teleportationPowderStyles';
    style.textContent = `
        /* Main dark swirl animation */
        @keyframes teleportationDarkSwirl {
            0% {
                transform: translate(-50%, -50%) scale(0.1) rotate(0deg);
                opacity: 0;
            }
            25% {
                transform: translate(-50%, -50%) scale(1.3) rotate(180deg);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.8) rotate(360deg);
                opacity: 0.9;
            }
            75% {
                transform: translate(-50%, -50%) scale(2.2) rotate(540deg);
                opacity: 0.6;
            }
            100% {
                transform: translate(-50%, -50%) scale(3.0) rotate(720deg);
                opacity: 0;
            }
        }
        
        /* Void portal animation */
        @keyframes teleportationVoidPortal {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            30% {
                transform: translate(-50%, -50%) scale(0.8);
                opacity: 0.8;
            }
            60% {
                transform: translate(-50%, -50%) scale(1.2);
                opacity: 0.6;
            }
            90% {
                transform: translate(-50%, -50%) scale(1.5);
                opacity: 0.3;
            }
            100% {
                transform: translate(-50%, -50%) scale(2.0);
                opacity: 0;
            }
        }
        
        /* Base styles for teleportation effects */
        .teleportation-dark-swirl {
            will-change: transform, opacity;
        }
        
        .teleportation-tendril {
            will-change: transform, opacity;
        }
        
        .teleportation-void-portal {
            will-change: transform, opacity;
        }
        
        /* Enhanced dark energy effects */
        .teleportation-dark-swirl:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, 
                rgba(74, 0, 128, 0.5) 0%, 
                rgba(45, 0, 77, 0.4) 40%, 
                transparent 80%);
            border-radius: 50%;
            animation: teleportationDarkGlow 1.2s ease-out;
        }
        
        @keyframes teleportationDarkGlow {
            0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
                opacity: 0;
            }
            40% {
                transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -50%) scale(3) rotate(360deg);
                opacity: 0;
            }
        }
        
        /* Improved tendril effects */
        .teleportation-tendril {
            text-shadow: 
                0 0 8px #4a0080,
                0 0 16px #2d004d,
                0 0 24px #1a002e;
        }
        
        /* Responsive teleportation effects */
        @media (max-width: 768px) {
            .teleportation-dark-swirl {
                font-size: 40px !important;
            }
            
            .teleportation-tendril {
                font-size: 12px !important;
            }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            .teleportation-dark-swirl {
                text-shadow: 
                    0 0 10px #ffffff,
                    0 0 20px #000000;
            }
            
            .teleportation-tendril {
                text-shadow: 
                    0 0 6px #ffffff,
                    0 0 12px #000000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .teleportation-dark-swirl {
                animation: teleportationReducedMotion 0.6s ease-out forwards;
            }
            
            .teleportation-tendril {
                animation: none;
                opacity: 0;
            }
            
            .teleportation-void-portal {
                animation: teleportationPortalReducedMotion 0.8s ease-out forwards;
            }
        }
        
        @keyframes teleportationReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.5);
            }
        }
        
        @keyframes teleportationPortalReducedMotion {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0);
            }
            50% {
                opacity: 0.5;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.2);
            }
        }
        
        /* Performance optimizations */
        .teleportation-dark-swirl,
        .teleportation-tendril,
        .teleportation-void-portal {
            backface-visibility: hidden;
            perspective: 1000px;
            transform-style: preserve-3d;
        }
        
        /* Additional void portal styling */
        .teleportation-void-portal {
            box-shadow: 
                0 0 20px rgba(74, 0, 128, 0.8),
                inset 0 0 20px rgba(26, 0, 46, 0.9);
        }
        
        /* Enhanced tendril variety */
        .teleportation-tendril:nth-child(even) {
            animation-delay: 0.1s;
        }
        
        .teleportation-tendril:nth-child(3n) {
            animation-delay: 0.05s;
            animation-duration: 0.8s;
        }
        
        .teleportation-tendril:nth-child(4n) {
            animation-delay: 0.15s;
            animation-duration: 1.0s;
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.TeleportationPowderPotion = TeleportationPowderPotion;
}

console.log('TeleportationPowder potion module loaded with multi-player integration');