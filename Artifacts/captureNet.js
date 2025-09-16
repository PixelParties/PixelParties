// ./Artifacts/captureNet.js - Capture Net Equip Artifact Module
// Permanently captures defeated enemy creatures with a 99% chance per equipped net

export class CaptureNetArtifact {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeCaptureEffects = new Set(); // Track active capture animations
        
        // Inject CSS styles for capture animations
        this.injectCaptureNetStyles();
        
        console.log('🕸️ Capture Net Artifact module initialized');
    }

    // Check if a hero has Capture Net equipped
    static hasEquippedCaptureNet(hero) {
        if (!hero || !hero.equipment) return false;
        return hero.equipment.some(item => 
            item.name === 'CaptureNet' || item.cardName === 'CaptureNet'
        );
    }

    // Count how many Capture Nets a hero has equipped
    static getCaptureNetCount(hero) {
        if (!hero || !hero.equipment) return 0;
        return hero.equipment.filter(item => 
            item.name === 'CaptureNet' || item.cardName === 'CaptureNet'
        ).length;
    }

    // Main capture attempt function - called when a creature dies
    async attemptCreatureCapture(deadCreature, originalHero, creatureIndex, originalSide, attacker, attackerSide) {
        if (!this.battleManager.isAuthoritative) return false;
        
        // Only trigger if there's an attacker and it's a hero (not a creature)
        // Heroes don't have type property set, creatures have type: 'creature'
        if (!attacker || attacker.type === 'creature') return false;
        
        // Check if attacker has Capture Nets equipped
        const captureNetCount = CaptureNetArtifact.getCaptureNetCount(attacker);
        if (captureNetCount === 0) return false;

        console.log(`🕸️ ${attacker.name} has ${captureNetCount} Capture Net(s), attempting capture of ${deadCreature.name}`);

        // Roll 99% chance for each Capture Net independently
        let captureSucceeded = false;
        for (let i = 0; i < captureNetCount; i++) {
            const roll = this.battleManager.getRandomPercent();
            console.log(`🕸️ Capture Net ${i + 1} roll: ${roll}% (need ≤10%)`);
            
            if (roll <= 10) {
                captureSucceeded = true;
                console.log(`🕸️ Capture Net ${i + 1} succeeded! Capturing ${deadCreature.name}`);
                break; // Only one net needs to succeed
            }
        }

        if (!captureSucceeded) {
            console.log(`🕸️ All Capture Nets failed for ${deadCreature.name}`);
            return false;
        }

        this.battleManager.addCombatLog(
            `🕸️ ${attacker.name}'s Capture Net ensnares ${deadCreature.name}!`,
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE performing capture
        this.sendCaptureNetUpdate(deadCreature, originalHero, originalSide, attacker, attackerSide, creatureIndex);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Perform the capture
        await this.performCreatureCapture(
            deadCreature, 
            originalHero, 
            creatureIndex, 
            originalSide,
            attacker, 
            attackerSide
        );

        return true;
    }

    // Actually perform the creature capture
    async performCreatureCapture(deadCreature, originalHero, creatureIndex, originalSide, attacker, attackerSide) {
        
        // STEP 1: Show capture animation at original location
        await this.createCaptureNetEffect(originalSide, originalHero.position, creatureIndex);

        // STEP 2: Explicitly remove ALL visual elements for this creature (like DarkGear does)
        const creatureElements = document.querySelectorAll(
            `.${originalSide}-slot.${originalHero.position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        creatureElements.forEach(el => el.remove());

        // Also remove any floating damage numbers or effects
        const damageNumbers = document.querySelectorAll(
            `.${originalSide}-slot.${originalHero.position}-slot .damage-number`
        );
        damageNumbers.forEach(el => {
            if (el.textContent.includes(deadCreature.name)) {
                el.remove();
            }
        });

        // STEP 3: Remove creature from original hero's creatures array
        if (creatureIndex >= 0 && creatureIndex < originalHero.creatures.length) {
            const capturedCreature = originalHero.creatures.splice(creatureIndex, 1)[0];

            // STEP 4: Update all remaining creature indices in the DOM
            const remainingCreatures = document.querySelectorAll(
                `.${originalSide}-slot.${originalHero.position}-slot .creature-icon`
            );
            remainingCreatures.forEach((el, index) => {
                el.setAttribute('data-creature-index', index);
            });
            
            console.log(`🕸️ Removed ${capturedCreature.name} from ${originalHero.name}'s creatures`);
            
            // STEP 5: Create captured creature (stays defeated but changes ownership)
            const permanentCapturedCreature = {
                ...capturedCreature,
                alive: false, // Keep defeated status
                capturedBy: 'CaptureNet',
                capturedFrom: originalHero.name,
                capturedAt: Date.now(),
                originalOwner: originalHero.name,
                newOwner: attacker.name,
                permanentCapture: true // Flag for permanent transfer
            };

            // STEP 6: Add to attacker's creatures (at the end, defeated)
            attacker.creatures.push(permanentCapturedCreature);

            console.log(`🕸️ ${deadCreature.name} permanently captured by ${attacker.name}`);
        }

        // STEP 7: Force complete re-render of both heroes' creatures
        const originalHeroSlot = document.querySelector(`.${originalSide}-slot.${originalHero.position}-slot`);
        if (originalHeroSlot) {
            const creaturesContainer = originalHeroSlot.querySelector('.battle-hero-creatures');
            if (creaturesContainer) {
                creaturesContainer.remove();
            }
        }
        
        const attackerHeroSlot = document.querySelector(`.${attackerSide}-slot.${attacker.position}-slot`);
        if (attackerHeroSlot) {
            const creaturesContainer = attackerHeroSlot.querySelector('.battle-hero-creatures');
            if (creaturesContainer) {
                creaturesContainer.remove();
            }
        }

        // STEP 8: Force re-render to update visuals
        if (this.battleManager.battleScreen && this.battleManager.battleScreen.renderCreaturesAfterInit) {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
        }

        // Update necromancy displays if available
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                originalSide, originalHero.position, originalHero
            );
            this.battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                attackerSide, attacker.position, attacker
            );
        }

        this.battleManager.addCombatLog(
            `🕸️ ${deadCreature.name} has been permanently captured by ${attacker.name}!`,
            'info'
        );
    }

    // Create capture net visual effect
    async createCaptureNetEffect(targetSide, targetPosition, creatureIndex) {
        // Find the creature element
        const creatureElement = document.querySelector(
            `.${targetSide}-slot.${targetPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) {
            console.warn('Could not find creature element for capture net effect');
            return;
        }

        // Create capture net overlay
        const captureEffect = document.createElement('div');
        captureEffect.className = 'capture-net-effect';
        captureEffect.innerHTML = `
            <div class="net-overlay">
                <div class="net-pattern"></div>
                <div class="net-pattern net-pattern-2"></div>
            </div>
            <div class="capture-particles">
                ${Array.from({length: 6}, (_, i) => 
                    `<div class="capture-particle particle-${i + 1}">🕸️</div>`
                ).join('')}
            </div>
            <div class="capture-text">CAPTURED!</div>
        `;
        
        captureEffect.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 600;
            animation: captureNetSequence ${this.battleManager.getSpeedAdjustedDelay(2000)}ms ease-out forwards;
        `;
        
        creatureElement.appendChild(captureEffect);
        
        // Track active effect
        this.activeCaptureEffects.add(captureEffect);
        
        // Remove effect after animation
        setTimeout(() => {
            if (captureEffect.parentNode) {
                captureEffect.remove();
            }
            this.activeCaptureEffects.delete(captureEffect);
        }, this.battleManager.getSpeedAdjustedDelay(2000));
        
        // Wait for effect to complete
        await this.battleManager.delay(2000);
    }

    // Send capture net data to guest for synchronization
    sendCaptureNetUpdate(deadCreature, originalHero, originalSide, attacker, attackerSide, creatureIndex) {
        this.battleManager.sendBattleUpdate('capture_net_capture', {
            capturedCreature: {
                name: deadCreature.name,
                maxHp: deadCreature.maxHp,
                atk: deadCreature.atk,
                currentHp: deadCreature.currentHp
            },
            originalOwner: {
                side: originalSide,
                position: originalHero.position,
                heroName: originalHero.name,
                creatureIndex: creatureIndex,
                absoluteSide: originalHero.absoluteSide
            },
            newOwner: {
                side: attackerSide,
                position: attacker.position,
                heroName: attacker.name,
                absoluteSide: attacker.absoluteSide
            },
            timestamp: Date.now()
        });
    }

    // Handle capture on guest side
    async handleGuestCreatureCapture(data) {
        const { capturedCreature, originalOwner, newOwner } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        
        // Determine local sides for guest
        const originalLocalSide = (originalOwner.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const newOwnerLocalSide = (newOwner.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Get the heroes
        const originalHeroes = originalLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const newOwnerHeroes = newOwnerLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const originalHero = originalHeroes[originalOwner.position];
        const attackerHero = newOwnerHeroes[newOwner.position];
        
        if (!originalHero || !attackerHero) {
            console.error('GUEST: Could not find heroes for capture net');
            return;
        }

        this.battleManager.addCombatLog(
            `🕸️ ${newOwner.heroName}'s Capture Net ensnares ${capturedCreature.name}!`,
            newOwnerLocalSide === 'player' ? 'success' : 'error'
        );

        // STEP 1: Show capture animation at original location
        await this.createCaptureNetEffect(originalLocalSide, originalOwner.position, originalOwner.creatureIndex);

        // STEP 2: Explicitly remove ALL visual elements for this creature (same as host)
        const creatureElements = document.querySelectorAll(
            `.${originalLocalSide}-slot.${originalOwner.position}-slot .creature-icon[data-creature-index="${originalOwner.creatureIndex}"]`
        );
        creatureElements.forEach(el => el.remove());

        // Also remove any floating damage numbers or effects
        const damageNumbers = document.querySelectorAll(
            `.${originalLocalSide}-slot.${originalOwner.position}-slot .damage-number`
        );
        damageNumbers.forEach(el => {
            if (el.textContent.includes(capturedCreature.name)) {
                el.remove();
            }
        });

        // STEP 3: Remove from original hero
        if (originalOwner.creatureIndex < originalHero.creatures.length) {
            const removedCreature = originalHero.creatures.splice(originalOwner.creatureIndex, 1)[0];
            
            // Update remaining creature indices in the DOM
            const remainingCreatures = document.querySelectorAll(
                `.${originalLocalSide}-slot.${originalOwner.position}-slot .creature-icon`
            );
            remainingCreatures.forEach((el, index) => {
                el.setAttribute('data-creature-index', index);
            });
            
            // STEP 4: Add to new owner as captured creature
            const permanentCapturedCreature = {
                name: capturedCreature.name,
                currentHp: capturedCreature.currentHp,
                maxHp: capturedCreature.maxHp,
                atk: capturedCreature.atk,
                alive: false, // Keep defeated
                type: 'creature',
                capturedBy: 'CaptureNet',
                capturedFrom: originalOwner.heroName,
                capturedAt: Date.now(),
                originalOwner: originalOwner.heroName,
                newOwner: newOwner.heroName,
                permanentCapture: true
            };
            
            attackerHero.creatures.push(permanentCapturedCreature);
            
            console.log(`GUEST: ${capturedCreature.name} captured by ${newOwner.heroName}`);
        }

        // STEP 5: Force complete re-render of both heroes' creature containers
        const originalHeroSlot = document.querySelector(`.${originalLocalSide}-slot.${originalOwner.position}-slot`);
        if (originalHeroSlot) {
            const creaturesContainer = originalHeroSlot.querySelector('.battle-hero-creatures');
            if (creaturesContainer) {
                creaturesContainer.remove();
            }
        }
        
        const attackerHeroSlot = document.querySelector(`.${newOwnerLocalSide}-slot.${newOwner.position}-slot`);
        if (attackerHeroSlot) {
            const creaturesContainer = attackerHeroSlot.querySelector('.battle-hero-creatures');
            if (creaturesContainer) {
                creaturesContainer.remove();
            }
        }

        // STEP 6: Re-render to show changes
        if (this.battleManager.battleScreen && this.battleManager.battleScreen.renderCreaturesAfterInit) {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
        }

        // Update necromancy displays if available
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                originalLocalSide, originalOwner.position, originalHero
            );
            this.battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                newOwnerLocalSide, newOwner.position, attackerHero
            );
        }

        this.battleManager.addCombatLog(
            `🕸️ ${capturedCreature.name} has been permanently captured by ${newOwner.heroName}!`,
            'info'
        );
    }

    // Check if a creature is a captured creature (for identification)
    static isCapturedCreature(creature) {
        return creature && creature.permanentCapture === true && creature.capturedBy === 'CaptureNet';
    }

    // Collect all captured creatures from battle for transfer to formation
    static collectPermanentCapturesFromBattle(battleManager) {
        if (!battleManager) {
            return [];
        }

        const permanentCaptures = [];
        
        // Check all heroes from both sides
        const allHeroes = [
            ...Object.entries(battleManager.playerHeroes || {}),
            ...Object.entries(battleManager.opponentHeroes || {})
        ];

        for (const [position, hero] of allHeroes) {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                const captures = hero.creatures.filter(creature => 
                    this.isCapturedCreature(creature)
                );
                
                if (captures.length > 0) {
                    permanentCaptures.push({
                        heroPosition: position,
                        heroSide: hero.side,
                        heroAbsoluteSide: hero.absoluteSide,
                        heroName: hero.name,
                        captures: captures.map(capture => ({
                            name: capture.name,
                            currentHp: capture.currentHp,
                            maxHp: capture.maxHp,
                            atk: capture.atk,
                            alive: false, // Always defeated
                            type: 'creature',
                            capturedBy: 'CaptureNet',
                            capturedFrom: capture.capturedFrom,
                            capturedAt: capture.capturedAt,
                            originalOwner: capture.originalOwner,
                            newOwner: capture.newOwner,
                            permanentCapture: true
                        }))
                    });
                }
            }
        }

        return permanentCaptures;
    }

    // Transfer permanent captures to formation screen
    static transferPermanentCapturesToFormation(permanentCaptures, heroSelection) {
        if (!permanentCaptures || permanentCaptures.length === 0 || !heroSelection) {
            console.log('CAPTURE NET DEBUG: No captures to transfer or missing heroSelection');
            return 0;
        }

        let capturesTransferred = 0;
        let capturesRemoved = 0;
        const myAbsoluteSide = heroSelection.isHost ? 'host' : 'guest';

        console.log(`CAPTURE NET DEBUG: Starting transfer for ${myAbsoluteSide}, processing ${permanentCaptures.length} capture groups`);
        console.log('CAPTURE NET DEBUG: Full capture data:', JSON.stringify(permanentCaptures, null, 2));

        for (const captureData of permanentCaptures) {
            const capturingHeroSide = captureData.heroAbsoluteSide;
            
            console.log(`CAPTURE NET DEBUG: Processing capture group from ${capturingHeroSide} hero ${captureData.heroName} at position ${captureData.heroPosition}`);
            
            for (const capture of captureData.captures) {
                console.log(`CAPTURE NET DEBUG: Processing capture of ${capture.name} from ${capture.originalOwner} to ${capture.newOwner}`);
                
                // PART 1: If the capturing hero is mine, add the creature to my collection
                if (capturingHeroSide === myAbsoluteSide) {
                    console.log(`CAPTURE NET DEBUG: This is my hero ${captureData.heroName}, attempting to add ${capture.name}`);
                    
                    const success = heroSelection.heroCreatureManager.addCreatureToHero(
                        captureData.heroPosition, 
                        capture.name,
                        capture // Pass the full capture data
                    );
                    
                    if (success) {
                        capturesTransferred++;
                        console.log(`CAPTURE NET DEBUG: Successfully added captured ${capture.name} to ${captureData.heroName}'s collection`);
                    } else {
                        console.log(`CAPTURE NET DEBUG: FAILED to add captured ${capture.name} to ${captureData.heroName}'s collection`);
                    }
                } else {
                    console.log(`CAPTURE NET DEBUG: Capturing hero ${captureData.heroName} is not mine (${capturingHeroSide} vs ${myAbsoluteSide}), skipping addition`);
                }
                
                // PART 2: If the original owner is mine, remove the creature from my collection
                console.log(`CAPTURE NET DEBUG: Checking if I need to remove ${capture.name} from original owner ${capture.originalOwner}`);
                console.log(`CAPTURE NET DEBUG: Searching for hero ${capture.originalOwner} in my formation`);
                
                const originalOwnerHero = this.findHeroByName(heroSelection, capture.originalOwner);
                
                if (!originalOwnerHero) {
                    console.log(`CAPTURE NET DEBUG: Hero ${capture.originalOwner} not found in my formation (this is normal if it was opponent's creature)`);
                } else {
                    console.log(`CAPTURE NET DEBUG: Found original owner hero:`, originalOwnerHero);
                    
                    if (originalOwnerHero.heroPosition === undefined) {
                        console.log(`CAPTURE NET DEBUG: ERROR - originalOwnerHero.heroPosition is undefined`);
                    } else {
                        console.log(`CAPTURE NET DEBUG: Attempting to remove ${capture.name} from ${capture.originalOwner} at position ${originalOwnerHero.heroPosition}`);
                        console.log(`CAPTURE NET DEBUG: Removal parameters - heroPosition: ${originalOwnerHero.heroPosition}, creatureName: ${capture.name}, timestamp: ${capture.capturedAt}`);
                        
                        // This creature was captured from my hero, so remove it
                        const removed = this.removeCreatureFromHeroCollection(
                            heroSelection,
                            originalOwnerHero.heroPosition,
                            capture.name,
                            capture.capturedAt // Use timestamp as unique identifier
                        );
                        
                        if (removed) {
                            capturesRemoved++;
                            console.log(`CAPTURE NET DEBUG: Successfully removed captured ${capture.name} from ${capture.originalOwner}'s collection`);
                        } else {
                            console.log(`CAPTURE NET DEBUG: FAILED to remove captured ${capture.name} from ${capture.originalOwner}'s collection - THIS IS THE BUG!`);
                        }
                    }
                }
            }
        }

        console.log(`CAPTURE NET DEBUG: Transfer complete: ${capturesTransferred} added, ${capturesRemoved} removed`);

        if (capturesTransferred > 0 || capturesRemoved > 0) {
            console.log(`CAPTURE NET DEBUG: CaptureNet transfer complete: ${capturesTransferred} added, ${capturesRemoved} removed`);
            
            // Update UI to show the changes
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                setTimeout(() => {
                    window.updateHeroSelectionUI();
                }, 100);
            }
        }

        return capturesTransferred;
    }

    // Helper method to find hero by name in heroSelection
    static findHeroByName(heroSelection, heroName) {
        console.log(`CAPTURE NET DEBUG: findHeroByName searching for ${heroName}`);
        
        if (!heroSelection) {
            console.log('CAPTURE NET DEBUG: ERROR - heroSelection is null/undefined');
            return null;
        }
        
        // FIX: Use formationManager instead of direct playerFormation property
        if (!heroSelection.formationManager) {
            console.log('CAPTURE NET DEBUG: ERROR - formationManager is null/undefined');
            return null;
        }

        const playerFormation = heroSelection.formationManager.getBattleFormation();
        if (!playerFormation) {
            console.log('CAPTURE NET DEBUG: ERROR - getBattleFormation returned null/undefined');
            return null;
        }

        console.log(`CAPTURE NET DEBUG: playerFormation keys:`, Object.keys(playerFormation));
        console.log(`CAPTURE NET DEBUG: playerFormation heroes:`, Object.entries(playerFormation).map(([pos, hero]) => ({position: pos, name: hero?.name})));
        
        // Search through player formation
        for (const [position, hero] of Object.entries(playerFormation)) {
            console.log(`CAPTURE NET DEBUG: Checking position ${position}, hero:`, hero?.name);
            if (hero && hero.name === heroName) {
                console.log(`CAPTURE NET DEBUG: Found hero ${heroName} at position ${position}`);
                return { ...hero, heroPosition: position };
            }
        }
        
        console.log(`CAPTURE NET DEBUG: Hero ${heroName} not found in playerFormation`);
        return null;
    }

    // Helper method to remove a specific creature from hero's collection
    static removeCreatureFromHeroCollection(heroSelection, heroPosition, creatureName, capturedAtTimestamp) {
        console.log(`CAPTURE NET DEBUG: removeCreatureFromHeroCollection called with position: ${heroPosition}, creature: ${creatureName}, timestamp: ${capturedAtTimestamp}`);
        
        if (!heroSelection) {
            console.log('CAPTURE NET DEBUG: ERROR - heroSelection is null/undefined');
            return false;
        }
        
        if (!heroSelection.heroCreatureManager) {
            console.log('CAPTURE NET DEBUG: ERROR - heroCreatureManager not available');
            return false;
        }

        console.log(`CAPTURE NET DEBUG: heroCreatureManager available:`, !!heroSelection.heroCreatureManager);
        console.log(`CAPTURE NET DEBUG: heroCreatureManager methods:`, Object.getOwnPropertyNames(heroSelection.heroCreatureManager.__proto__));

        try {
            console.log(`CAPTURE NET DEBUG: Getting creatures for hero at position ${heroPosition}`);
            
            // Get the hero's current creatures
            const heroCreatures = heroSelection.heroCreatureManager.getCreaturesForHero 
                ? heroSelection.heroCreatureManager.getCreaturesForHero(heroPosition)
                : heroSelection.heroCreatureManager.getHeroCreatures(heroPosition); // Fallback method name
            
            console.log(`CAPTURE NET DEBUG: Retrieved creatures:`, heroCreatures);
            
            if (!heroCreatures) {
                console.log(`CAPTURE NET DEBUG: ERROR - getCreaturesForHero returned null/undefined for position ${heroPosition}`);
                return false;
            }
            
            if (!Array.isArray(heroCreatures)) {
                console.log(`CAPTURE NET DEBUG: ERROR - getCreaturesForHero returned non-array:`, typeof heroCreatures);
                return false;
            }
            
            if (heroCreatures.length === 0) {
                console.log(`CAPTURE NET DEBUG: No creatures found for hero at position ${heroPosition}`);
                return false;
            }

            console.log(`CAPTURE NET DEBUG: Found ${heroCreatures.length} creatures for hero:`, heroCreatures.map(c => ({name: c.name, capturedAt: c.capturedAt, addedAt: c.addedAt})));

            // Find the specific creature to remove using timestamp or other unique identifier
            let creatureIndex = -1;
            
            if (capturedAtTimestamp) {
                console.log(`CAPTURE NET DEBUG: Searching by timestamp ${capturedAtTimestamp}`);
                
                // Try to find by timestamp first (most precise)
                creatureIndex = heroCreatures.findIndex(creature => {
                    const matches = creature.name === creatureName && 
                        (creature.capturedAt === capturedAtTimestamp || creature.addedAt === capturedAtTimestamp);
                    console.log(`CAPTURE NET DEBUG: Checking creature ${creature.name} - capturedAt: ${creature.capturedAt}, addedAt: ${creature.addedAt}, matches: ${matches}`);
                    return matches;
                });
                
                console.log(`CAPTURE NET DEBUG: Timestamp search result: index ${creatureIndex}`);
            }
            
            if (creatureIndex === -1) {
                console.log(`CAPTURE NET DEBUG: Timestamp search failed, falling back to name search`);
                // Fallback: find by name (remove the first matching creature)
                creatureIndex = heroCreatures.findIndex(creature => {
                    const matches = creature.name === creatureName;
                    console.log(`CAPTURE NET DEBUG: Name search - creature ${creature.name} matches: ${matches}`);
                    return matches;
                });
                console.log(`CAPTURE NET DEBUG: Name search result: index ${creatureIndex}`);
            }

            if (creatureIndex === -1) {
                console.log(`CAPTURE NET DEBUG: ERROR - Could not find creature ${creatureName} in hero's collection`);
                console.log(`CAPTURE NET DEBUG: Available creatures:`, heroCreatures.map(c => c.name));
                return false;
            }

            console.log(`CAPTURE NET DEBUG: Found creature at index ${creatureIndex}, attempting removal`);
            
            // Remove the creature using the creature manager's method
            let removed;
            if (heroSelection.heroCreatureManager.removeCreatureFromHero) {
                console.log(`CAPTURE NET DEBUG: Using removeCreatureFromHero method`);
                removed = heroSelection.heroCreatureManager.removeCreatureFromHero(heroPosition, creatureIndex);
            } else if (heroSelection.heroCreatureManager.removeCreature) {
                console.log(`CAPTURE NET DEBUG: Using removeCreature method (fallback)`);
                removed = heroSelection.heroCreatureManager.removeCreature(heroPosition, creatureIndex);
            } else {
                console.log(`CAPTURE NET DEBUG: ERROR - No removal method found on heroCreatureManager`);
                console.log(`CAPTURE NET DEBUG: Available methods:`, Object.getOwnPropertyNames(heroSelection.heroCreatureManager));
                return false;
            }
            
            console.log(`CAPTURE NET DEBUG: Removal result:`, removed);
            
            if (removed) {
                console.log(`CAPTURE NET DEBUG: Successfully removed ${creatureName} from hero at position ${heroPosition}`);
                return true;
            } else {
                console.log(`CAPTURE NET DEBUG: ERROR - Removal method returned false/null`);
                return false;
            }

        } catch (error) {
            console.log(`CAPTURE NET DEBUG: ERROR - Exception during removal:`, error);
            console.log(`CAPTURE NET DEBUG: Error stack:`, error.stack);
            return false;
        }
    }

    // Static method to clean up captured creatures after battle ends (remove temporary ones)
    static cleanupCapturedCreaturesAfterBattle(battleManager) {
        if (!battleManager) {
            return 0;
        }

        // Note: Since all captures are permanent, we don't remove any
        // This method exists for consistency with other artifact patterns
        return 0;
    }

    // Get captured creature count for a hero
    static getCapturedCreatureCount(hero) {
        if (!hero || !hero.creatures) {
            return 0;
        }
        
        return hero.creatures.filter(creature => this.isCapturedCreature(creature)).length;
    }

    // Inject CSS styles for capture net animations
    injectCaptureNetStyles() {
        if (document.getElementById('captureNetStyles')) {
            return; // Already injected
        }
        
        const style = document.createElement('style');
        style.id = 'captureNetStyles';
        style.textContent = `
            /* Capture Net Effects */
            .capture-net-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 600;
            }

            .net-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    45deg,
                    transparent 30%, 
                    rgba(139, 69, 19, 0.3) 32%, 
                    rgba(139, 69, 19, 0.3) 34%, 
                    transparent 36%
                ),
                linear-gradient(
                    -45deg,
                    transparent 30%, 
                    rgba(139, 69, 19, 0.3) 32%, 
                    rgba(139, 69, 19, 0.3) 34%, 
                    transparent 36%
                );
                background-size: 8px 8px;
                border: 2px solid #8b4513;
                border-radius: 4px;
                animation: netTighten 1s ease-out;
            }

            .net-pattern-2 {
                background: linear-gradient(
                    90deg,
                    transparent 48%, 
                    rgba(160, 82, 45, 0.4) 49%, 
                    rgba(160, 82, 45, 0.4) 51%, 
                    transparent 52%
                ),
                linear-gradient(
                    0deg,
                    transparent 48%, 
                    rgba(160, 82, 45, 0.4) 49%, 
                    rgba(160, 82, 45, 0.4) 51%, 
                    transparent 52%
                );
                background-size: 6px 6px;
                animation-delay: 0.2s;
            }

            .capture-particles {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }

            .capture-particle {
                position: absolute;
                font-size: 12px;
                animation: captureParticleFloat 1.5s ease-out;
                filter: drop-shadow(0 0 3px rgba(139, 69, 19, 0.8));
            }

            .capture-particle.particle-1 {
                top: -20px;
                left: -20px;
                animation-delay: 0.1s;
            }

            .capture-particle.particle-2 {
                top: -15px;
                left: 15px;
                animation-delay: 0.2s;
            }

            .capture-particle.particle-3 {
                top: 15px;
                left: -15px;
                animation-delay: 0.3s;
            }

            .capture-particle.particle-4 {
                top: 20px;
                left: 20px;
                animation-delay: 0.4s;
            }

            .capture-particle.particle-5 {
                top: 0px;
                left: -25px;
                animation-delay: 0.5s;
            }

            .capture-particle.particle-6 {
                top: 0px;
                left: 25px;
                animation-delay: 0.6s;
            }

            .capture-text {
                position: absolute;
                top: -25px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 10px;
                font-weight: bold;
                color: #8b4513;
                text-shadow: 
                    0 0 6px rgba(139, 69, 19, 0.9),
                    1px 1px 2px rgba(0, 0, 0, 0.8);
                animation: captureTextAppear 1s ease-out 0.5s both;
                background: rgba(255, 255, 255, 0.9);
                padding: 2px 6px;
                border-radius: 3px;
                border: 1px solid #8b4513;
            }

            /* Keyframe Animations */
            @keyframes captureNetSequence {
                0% {
                    opacity: 0;
                    transform: scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: scale(1.1);
                }
                70% {
                    opacity: 1;
                    transform: scale(1);
                }
                100% {
                    opacity: 0;
                    transform: scale(0.9);
                }
            }

            @keyframes netTighten {
                0% {
                    transform: scale(1.2);
                    opacity: 0.3;
                }
                50% {
                    transform: scale(1);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(0.95);
                    opacity: 0.6;
                }
            }

            @keyframes captureParticleFloat {
                0% {
                    opacity: 0;
                    transform: scale(0.3) translateY(5px);
                }
                30% {
                    opacity: 1;
                    transform: scale(1) translateY(0px);
                }
                70% {
                    opacity: 1;
                    transform: scale(0.8) translateY(-5px);
                }
                100% {
                    opacity: 0;
                    transform: scale(0.3) translateY(-15px);
                }
            }

            @keyframes captureTextAppear {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(5px) scale(0.5);
                }
                50% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0) scale(1.1);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-5px) scale(0.8);
                }
            }

            /* Captured creature visual indicator */
            .creature-icon.captured-creature {
                border: 2px solid #8b4513 !important;
                box-shadow: 
                    0 0 8px rgba(139, 69, 19, 0.6),
                    inset 0 0 8px rgba(139, 69, 19, 0.1) !important;
            }

            .creature-icon.captured-creature::after {
                content: "🕸️";
                position: absolute;
                top: -5px;
                right: -5px;
                font-size: 14px;
                background: radial-gradient(circle, #8b4513, #5d2f0a);
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #a0522d;
                z-index: 10;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Clean up active capture effects (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeCaptureEffects.size} active Capture Net effects`);
        
        this.activeCaptureEffects.forEach(effect => {
            try {
                if (effect && effect.parentNode) {
                    effect.remove();
                }
            } catch (error) {
                console.warn('Error removing capture net effect during cleanup:', error);
            }
        });
        
        this.activeCaptureEffects.clear();

        // Remove any orphaned capture effects
        try {
            const orphanedEffects = document.querySelectorAll('.capture-net-effect');
            orphanedEffects.forEach(effect => {
                if (effect.parentNode) {
                    effect.remove();
                }
            });
            
            if (orphanedEffects.length > 0) {
                console.log(`Cleaned up ${orphanedEffects.length} orphaned Capture Net effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned capture net effects:', error);
        }
    }
}

// Export the main attempt function for battleManager integration
export async function attemptCaptureNetCapture(deadCreature, originalHero, creatureIndex, originalSide, attacker, attackerSide, battleManager) {
    if (!battleManager.captureNetArtifact) {
        battleManager.captureNetArtifact = new CaptureNetArtifact(battleManager);
    }
    
    return await battleManager.captureNetArtifact.attemptCreatureCapture(
        deadCreature, originalHero, creatureIndex, originalSide, attacker, attackerSide
    );
}

// Export guest handler for battleManager integration
export async function handleGuestCaptureNetCapture(data, battleManager) {
    if (!battleManager.captureNetArtifact) {
        battleManager.captureNetArtifact = new CaptureNetArtifact(battleManager);
    }
    
    return await battleManager.captureNetArtifact.handleGuestCreatureCapture(data);
}

export default CaptureNetArtifact;