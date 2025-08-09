// ./Creatures/skeletonBard.js - Skeleton Bard Creature Module

export class SkeletonBardCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeMusicEffects = new Set(); // Track active music note effects for cleanup
        
        // Inject CSS styles
        this.injectSkeletonBardStyles();
        
        console.log('🎵 Skeleton Bard Creature module initialized');
    }

    // Check if a creature is Skeleton Bard
    static isSkeletonBard(creatureName) {
        return creatureName === 'SkeletonBard';
    }

    // Execute Skeleton Bard special attack - inspire another creature to act
    async executeSpecialAttack(bardActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const bardCreature = bardActor.data;
        const bardHero = bardActor.hero;
        const bardSide = bardHero.side;
        
        // Safety check: ensure Skeleton Bard is still alive
        if (!bardCreature.alive || bardCreature.currentHp <= 0) {
            console.log(`Skeleton Bard is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `🎵 ${bardCreature.name} begins to play an inspiring melody!`, 
            bardSide === 'player' ? 'success' : 'error'
        );

        // Find eligible ally creatures (alive, not SkeletonBard)
        const targetCreature = this.findEligibleAllyCreature(bardHero, bardCreature);
        
        if (!targetCreature) {
            this.battleManager.addCombatLog(
                `💨 ${bardCreature.name}'s music echoes emptily - no allies to inspire!`, 
                'info'
            );
            return;
        }
        
        // Log target inspiration
        this.battleManager.addCombatLog(
            `✨ ${bardCreature.name}'s melody inspires ${targetCreature.creature.name} to act again!`, 
            bardSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE starting host effects
        this.sendInspirationUpdate(bardActor, targetCreature, position, 'special_attack');

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute inspiration effect with visual effects
        await this.executeInspirationEffect(bardActor, targetCreature, position);
    }

    // Find an eligible ally creature to inspire (alive, not SkeletonBard)
    findEligibleAllyCreature(bardHero, bardCreature) {
        const eligibleCreatures = [];
        
        // Get all heroes on the same side as the bard
        const alliedHeroes = bardHero.side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Collect all eligible creatures from all allied heroes
        Object.values(alliedHeroes).forEach(hero => {
            if (hero && hero.alive && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    // Must be alive, not be SkeletonBard, and not be the same creature instance
                    if (creature.alive && 
                        !SkeletonBardCreature.isSkeletonBard(creature.name) && 
                        creature !== bardCreature) {
                        
                        eligibleCreatures.push({
                            creature: creature,
                            hero: hero,
                            creatureIndex: index,
                            position: hero.position
                        });
                    }
                });
            }
        });
        
        if (eligibleCreatures.length === 0) {
            return null;
        }
        
        // Return random eligible creature using deterministic randomness
        const randomIndex = this.battleManager.getRandomInt(0, eligibleCreatures.length - 1);
        return eligibleCreatures[randomIndex];
    }

    // Execute the inspiration effect with visual effects and creature triggering
    async executeInspirationEffect(bardActor, targetCreature, position) {
        const bardSide = bardActor.hero.side;
        const bardElement = this.getBardElement(bardSide, position, bardActor.index);
        const targetElement = this.getCreatureElement(
            targetCreature.hero.side, 
            targetCreature.position, 
            targetCreature.creatureIndex
        );
        
        if (!bardElement || !targetElement) {
            console.error('Skeleton Bard or target creature element not found');
            return;
        }
        
        // Create music note effects between bard and target
        this.createMusicNoteEffect(bardElement, targetElement);
        
        // Wait for music notes to travel
        await this.battleManager.delay(800);
        
        // Now trigger the target creature's special attack
        await this.triggerCreatureSpecialAttack(targetCreature, position);
        
        this.battleManager.addCombatLog(
            `🎶 The inspiring melody takes effect - ${targetCreature.creature.name} springs into action!`, 
            'info'
        );
    }

    // Trigger the special attack of the target creature
    async triggerCreatureSpecialAttack(targetCreature, originalPosition) {
        try {
            // Import creature classes dynamically to avoid circular dependencies
            const JigglesCreature = (await import('./jiggles.js')).default;
            const SkeletonArcherCreature = (await import('./skeletonArcher.js')).default;
            const SkeletonNecromancerCreature = (await import('./skeletonNecromancer.js')).default;
            const SkeletonDeathKnightCreature = (await import('./skeletonDeathKnight.js')).default;
            const BurningSkeletonCreature = (await import('./burningSkeleton.js')).default;
            const SkeletonReaperCreature = (await import('./skeletonReaper.js')).default;

            // Create actor data for the target creature
            const targetActor = {
                type: 'creature',
                name: targetCreature.creature.name,
                data: targetCreature.creature,
                index: targetCreature.creatureIndex,
                hero: targetCreature.hero
            };

            const creatureName = targetCreature.creature.name;
            const bm = this.battleManager;
            
            // Determine creature type and call appropriate special attack
            if (JigglesCreature.isJiggles(creatureName)) {
                if (bm.jigglesManager) {
                    await bm.jigglesManager.executeSpecialAttack(targetActor, targetCreature.position);
                } else {
                    await this.fallbackCreatureActivation(targetActor, targetCreature.position);
                }
            } else if (SkeletonArcherCreature.isSkeletonArcher(creatureName)) {
                if (bm.skeletonArcherManager) {
                    await bm.skeletonArcherManager.executeSpecialAttack(targetActor, targetCreature.position);
                } else {
                    await this.fallbackCreatureActivation(targetActor, targetCreature.position);
                }
            } else if (SkeletonNecromancerCreature.isSkeletonNecromancer(creatureName)) {
                if (bm.skeletonNecromancerManager) {
                    await bm.skeletonNecromancerManager.executeSpecialAttack(targetActor, targetCreature.position);
                } else {
                    await this.fallbackCreatureActivation(targetActor, targetCreature.position);
                }
            } else if (SkeletonDeathKnightCreature.isSkeletonDeathKnight(creatureName)) {
                if (bm.skeletonDeathKnightManager) {
                    await bm.skeletonDeathKnightManager.executeSpecialAttack(targetActor, targetCreature.position);
                } else {
                    await this.fallbackCreatureActivation(targetActor, targetCreature.position);
                }
            } else if (BurningSkeletonCreature.isBurningSkeleton(creatureName)) {
                if (bm.burningSkeletonManager) {
                    await bm.burningSkeletonManager.executeSpecialAttack(targetActor, targetCreature.position);
                } else {
                    await this.fallbackCreatureActivation(targetActor, targetCreature.position);
                }
            } else if (SkeletonReaperCreature.isSkeletonReaper(creatureName)) {
                if (bm.skeletonReaperManager) {
                    await bm.skeletonReaperManager.executeSpecialAttack(targetActor, targetCreature.position);
                } else {
                    await this.fallbackCreatureActivation(targetActor, targetCreature.position);
                }
            } else {
                // Regular creature without special attack - just do shake animation
                await this.fallbackCreatureActivation(targetActor, targetCreature.position);
            }
            
        } catch (error) {
            console.error('❌ Error triggering creature special attack:', error);
            // Fallback to regular activation
            await this.fallbackCreatureActivation(targetCreature, targetCreature.position);
        }
    }

    // Fallback creature activation (shake animation)
    async fallbackCreatureActivation(targetActor, position) {
        await this.battleManager.animationManager.shakeCreature(
            targetActor.hero.side, 
            position, 
            targetActor.index
        );
        
        this.battleManager.addCombatLog(
            `🌟 ${targetActor.data.name} activates!`, 
            targetActor.hero.side === 'player' ? 'success' : 'error'
        );
    }

    // ============================================
    // DEATH INSPIRATION EFFECT
    // ============================================

    // Execute death inspiration when Skeleton Bard dies (inspire up to 2 creatures)
    async executeDeathInspiration(dyingBard, heroOwner, position, side) {
        if (!this.battleManager.isAuthoritative) return;

        const bardCreature = dyingBard;
        const bardSide = side;
        
        this.battleManager.addCombatLog(
            `💀🎵 ${bardCreature.name} plays one final, inspiring requiem as it dies!`, 
            'info'
        );

        // Find up to 2 different eligible creatures
        const targetCreatures = this.findMultipleEligibleAllyCreatures(heroOwner, bardCreature, 2);
        
        if (targetCreatures.length === 0) {
            this.battleManager.addCombatLog(
                `💨 The final song echoes in vain - no allies remain to be inspired!`, 
                'info'
            );
            return;
        }

        // Send death inspiration data to guest for synchronization
        this.sendDeathInspirationUpdate(bardCreature, heroOwner, position, bardSide, targetCreatures);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(100);

        // Execute the death inspiration effect
        await this.executeDeathInspirationEffect(bardCreature, heroOwner, position, bardSide, targetCreatures);
    }

    // Find up to N eligible ally creatures for death effect
    findMultipleEligibleAllyCreatures(bardHero, bardCreature, maxCount) {
        const eligibleCreatures = [];
        
        // Get all heroes on the same side as the bard
        const alliedHeroes = bardHero.side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Collect all eligible creatures from all allied heroes
        Object.values(alliedHeroes).forEach(hero => {
            if (hero && hero.alive && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    // Must be alive, not be SkeletonBard, and not be the same creature instance
                    if (creature.alive && 
                        !SkeletonBardCreature.isSkeletonBard(creature.name) && 
                        creature !== bardCreature) {
                        
                        eligibleCreatures.push({
                            creature: creature,
                            hero: hero,
                            creatureIndex: index,
                            position: hero.position
                        });
                    }
                });
            }
        });
        
        if (eligibleCreatures.length === 0) {
            return [];
        }
        
        // Shuffle and take up to maxCount creatures
        const shuffled = this.battleManager.shuffleArray([...eligibleCreatures]);
        return shuffled.slice(0, Math.min(maxCount, shuffled.length));
    }

    // Execute the death inspiration effect for multiple creatures
    async executeDeathInspirationEffect(bardCreature, heroOwner, position, bardSide, targetCreatures) {
        const INSPIRATION_DELAY = 400; // 400ms between each inspiration
        
        // Get the bard element (even though it's dead, we need it for visual effects)
        const bardElement = this.getBardElement(bardSide, position, heroOwner.creatures.indexOf(bardCreature));
        
        if (!bardElement) {
            console.error('Skeleton Bard element not found for death inspiration');
            return;
        }

        this.battleManager.addCombatLog(
            `🎼 The requiem inspires ${targetCreatures.length} creature${targetCreatures.length > 1 ? 's' : ''} to fight on!`, 
            'info'
        );

        // Inspire creatures sequentially with delays
        for (let i = 0; i < targetCreatures.length; i++) {
            const targetCreature = targetCreatures[i];
            
            this.battleManager.addCombatLog(
                `✨ Death song ${i + 1}/${targetCreatures.length} inspires ${targetCreature.creature.name}!`, 
                'warning'
            );

            // Create visual effects for this inspiration
            const targetElement = this.getCreatureElement(
                targetCreature.hero.side, 
                targetCreature.position, 
                targetCreature.creatureIndex
            );
            
            if (bardElement && targetElement) {
                this.createMusicNoteEffect(bardElement, targetElement, true); // death = true for different visual
            }
            
            // Wait for music notes, then trigger creature
            await this.battleManager.delay(800);
            await this.triggerCreatureSpecialAttack(targetCreature, position);
            
            // Delay before next inspiration (except for the last one)
            if (i < targetCreatures.length - 1) {
                await this.battleManager.delay(INSPIRATION_DELAY);
            }
        }

        this.battleManager.addCombatLog(
            `🎵 ${bardCreature.name}'s final requiem complete - the melody lives on!`, 
            'info'
        );
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Create music note effect traveling from bard to target creature
    createMusicNoteEffect(fromElement, toElement, isDeath = false) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create music notes: missing elements');
            return;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            // Calculate positions
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            // Validate coordinates
            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid music note coordinates');
                return;
            }

            // Create multiple music notes for a richer effect
            const noteCount = isDeath ? 5 : 3;
            const notes = ['♪', '♫', '♬', '♩', '♭'];
            
            for (let i = 0; i < noteCount; i++) {
                setTimeout(() => {
                    this.createSingleMusicNote(fromX, fromY, toX, toY, notes[i % notes.length], isDeath);
                }, i * 150); // Stagger note creation
            }
            
            // Create ambient glow effects on both elements
            this.addMusicGlow(fromElement, isDeath);
            this.addMusicGlow(toElement, isDeath);
            
            console.log(`Created ${noteCount} music notes from bard to target${isDeath ? ' (death inspiration)' : ''}`);
            
        } catch (error) {
            console.error('Error creating music note effect:', error);
        }
    }

    // Create a single music note that travels from source to target
    createSingleMusicNote(fromX, fromY, toX, toY, noteSymbol, isDeath = false) {
        const note = document.createElement('div');
        note.className = `skeleton-bard-note${isDeath ? ' death-note' : ''}`;
        
        // Calculate travel properties
        const deltaX = toX - fromX;
        const deltaY = toY - fromY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Add some random curve to the path
        const curveX = (Math.random() - 0.5) * 100;
        const curveY = (Math.random() - 0.5) * 50 - 25; // Slight upward bias
        
        const travelTime = Math.max(600, distance * 1.5); // Slower than arrows
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(travelTime);
        
        note.style.cssText = `
            position: fixed;
            left: ${fromX}px;
            top: ${fromY}px;
            font-size: ${isDeath ? '28px' : '24px'};
            color: ${isDeath ? '#9d4edd' : '#4ecdc4'};
            z-index: 1500;
            pointer-events: none;
            font-weight: bold;
            text-shadow: 
                0 0 10px ${isDeath ? '#9d4edd' : '#4ecdc4'},
                0 0 20px ${isDeath ? '#7209b7' : '#26a69a'},
                2px 2px 4px rgba(0, 0, 0, 0.5);
            animation: musicNoteFlight ${adjustedTravelTime}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
            --target-x: ${deltaX}px;
            --target-y: ${deltaY}px;
            --curve-x: ${curveX}px;
            --curve-y: ${curveY}px;
        `;
        
        note.textContent = noteSymbol;
        note.setAttribute('data-note-type', isDeath ? 'death' : 'inspiration');
        
        document.body.appendChild(note);
        this.activeMusicEffects.add(note);

        // Remove note after animation
        setTimeout(() => {
            this.removeMusicNote(note);
        }, adjustedTravelTime + 100);
    }

    // Add musical glow effect to an element
    addMusicGlow(element, isDeath = false) {
        if (!element) return;
        
        const glowClass = isDeath ? 'bard-death-glow' : 'bard-inspiration-glow';
        element.classList.add(glowClass);
        
        // Remove glow after effect duration
        setTimeout(() => {
            element.classList.remove(glowClass);
        }, this.battleManager.getSpeedAdjustedDelay(2000));
    }

    // Remove music note with cleanup
    removeMusicNote(note) {
        if (note && note.parentNode) {
            this.activeMusicEffects.delete(note);
            note.remove();
        }
    }

    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================

    // Send inspiration data to guest for synchronization
    sendInspirationUpdate(bardActor, targetCreature, position, effectType) {
        this.battleManager.sendBattleUpdate('skeleton_bard_inspiration', {
            bardData: {
                side: bardActor.hero.side,
                position: position,
                creatureIndex: bardActor.index,
                name: bardActor.data.name,
                absoluteSide: bardActor.hero.absoluteSide
            },
            target: {
                side: targetCreature.hero.side,
                absoluteSide: targetCreature.hero.absoluteSide,
                position: targetCreature.position,
                creatureIndex: targetCreature.creatureIndex,
                creatureName: targetCreature.creature.name
            },
            effectType: effectType, // 'special_attack' or 'death_inspiration'
            timestamp: Date.now()
        });
    }

    // Send death inspiration data to guest
    sendDeathInspirationUpdate(bardCreature, heroOwner, position, bardSide, targetCreatures) {
        this.battleManager.sendBattleUpdate('skeleton_bard_death_inspiration', {
            bardData: {
                side: bardSide,
                position: position,
                creatureIndex: heroOwner.creatures.indexOf(bardCreature),
                name: bardCreature.name,
                absoluteSide: heroOwner.absoluteSide
            },
            targets: targetCreatures.map(target => ({
                side: target.hero.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex,
                creatureName: target.creature.name
            })),
            inspirationDelay: 400,
            timestamp: Date.now()
        });
    }

    // Handle inspiration effect on guest side
    async handleGuestInspiration(data) {
        const { bardData, target, effectType } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const bardLocalSide = (bardData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🎵 ${bardData.name} plays an inspiring melody!`, 
            bardLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest visual effects
        await this.createGuestInspiration(bardData, target, myAbsoluteSide, false);
    }

    // Handle death inspiration on guest side
    async handleGuestDeathInspiration(data) {
        const { bardData, targets, inspirationDelay } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const bardLocalSide = (bardData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀🎵 ${bardData.name} plays one final, inspiring requiem as it dies!`, 
            'info'
        );

        // Start guest death inspiration effects
        await this.createGuestDeathInspiration(bardData, targets, inspirationDelay, myAbsoluteSide);
    }

    // Create inspiration effect on guest side
    async createGuestInspiration(bardData, targetData, myAbsoluteSide, isDeath = false) {
        const bardLocalSide = (bardData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const bardElement = this.getBardElement(
            bardLocalSide,
            bardData.position,
            bardData.creatureIndex
        );

        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetElement = this.getCreatureElement(
            targetLocalSide,
            targetData.position,
            targetData.creatureIndex
        );

        if (bardElement && targetElement) {
            this.createMusicNoteEffect(bardElement, targetElement, isDeath);
            
            // Wait for music notes to complete
            await this.battleManager.delay(800);
            
            this.battleManager.addCombatLog(
                `✨ The melody inspires ${targetData.creatureName} to act again!`, 
                targetLocalSide === 'player' ? 'success' : 'error'
            );
        }
    }

    // Create death inspiration effect on guest side
    async createGuestDeathInspiration(bardData, targets, inspirationDelay, myAbsoluteSide) {
        const bardLocalSide = (bardData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const bardElement = this.getBardElement(
            bardLocalSide,
            bardData.position,
            bardData.creatureIndex
        );

        if (!bardElement) {
            console.warn('Skeleton Bard element not found on guest side for death inspiration');
            return;
        }

        this.battleManager.addCombatLog(
            `🎼 The requiem inspires ${targets.length} creature${targets.length > 1 ? 's' : ''} to fight on!`, 
            'info'
        );

        // Process each target sequentially
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            const targetLocalSide = (target.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            
            this.battleManager.addCombatLog(
                `✨ Death song ${i + 1}/${targets.length} inspires ${target.creatureName}!`, 
                'warning'
            );

            const targetElement = this.getCreatureElement(
                targetLocalSide,
                target.position,
                target.creatureIndex
            );

            if (targetElement) {
                this.createMusicNoteEffect(bardElement, targetElement, true);
                await this.battleManager.delay(800); // Wait for music notes
            }
            
            // Delay before next inspiration
            if (i < targets.length - 1) {
                await this.battleManager.delay(inspirationDelay);
            }
        }

        this.battleManager.addCombatLog(
            `🎵 ${bardData.name}'s final requiem complete - the melody lives on!`, 
            'info'
        );
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Get the DOM element for Skeleton Bard creature
    getBardElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for any creature
    getCreatureElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Clean up all active music effects (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeMusicEffects.size} active Skeleton Bard music effects`);
        
        this.activeMusicEffects.forEach(effect => {
            try {
                if (effect && effect.parentNode) {
                    effect.remove();
                }
            } catch (error) {
                console.warn('Error removing music effect during cleanup:', error);
            }
        });
        
        this.activeMusicEffects.clear();

        // Remove any orphaned music note elements
        try {
            const orphanedNotes = document.querySelectorAll('.skeleton-bard-note');
            orphanedNotes.forEach(note => {
                if (note.parentNode) {
                    note.remove();
                }
            });
            
            if (orphanedNotes.length > 0) {
                console.log(`Cleaned up ${orphanedNotes.length} orphaned Skeleton Bard music notes`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned music notes:', error);
        }

        // Remove any lingering glow effects
        try {
            const glowElements = document.querySelectorAll('.bard-inspiration-glow, .bard-death-glow');
            glowElements.forEach(element => {
                element.classList.remove('bard-inspiration-glow', 'bard-death-glow');
            });
        } catch (error) {
            console.warn('Error cleaning up glow effects:', error);
        }
    }

    // Inject CSS styles for Skeleton Bard effects
    injectSkeletonBardStyles() {
        if (document.getElementById('skeletonBardCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'skeletonBardCreatureStyles';
        style.textContent = `
            /* Skeleton Bard Music Note Styles */
            .skeleton-bard-note {
                transition: all 0.1s ease;
                transform-origin: center;
                user-select: none;
                font-family: 'Arial', sans-serif;
            }

            .skeleton-bard-note.death-note {
                filter: brightness(1.3) hue-rotate(15deg);
            }

            @keyframes musicNoteFlight {
                0% { 
                    opacity: 1;
                    transform: translate(0, 0) scale(0.8) rotate(0deg);
                }
                25% {
                    opacity: 1;
                    transform: translate(calc(var(--target-x) * 0.3 + var(--curve-x) * 0.5), calc(var(--target-y) * 0.3 + var(--curve-y))) scale(1.1) rotate(180deg);
                }
                50% {
                    opacity: 1;
                    transform: translate(calc(var(--target-x) * 0.6 + var(--curve-x) * 0.8), calc(var(--target-y) * 0.6 + var(--curve-y) * 0.8)) scale(1.2) rotate(360deg);
                }
                75% {
                    opacity: 1;
                    transform: translate(calc(var(--target-x) * 0.8 + var(--curve-x) * 0.4), calc(var(--target-y) * 0.8 + var(--curve-y) * 0.4)) scale(1.1) rotate(540deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(var(--target-x), var(--target-y)) scale(1.3) rotate(720deg);
                }
            }

            /* Glow effects for inspired creatures */
            .bard-inspiration-glow {
                animation: inspirationGlow 2s ease-in-out;
                position: relative;
            }

            .bard-death-glow {
                animation: deathInspirationGlow 2s ease-in-out;
                position: relative;
            }

            @keyframes inspirationGlow {
                0%, 100% { 
                    filter: brightness(1);
                    box-shadow: none;
                }
                50% { 
                    filter: brightness(1.6) saturate(1.4);
                    box-shadow: 
                        0 0 15px rgba(78, 205, 196, 0.8),
                        0 0 30px rgba(78, 205, 196, 0.4),
                        inset 0 0 15px rgba(78, 205, 196, 0.2);
                }
            }

            @keyframes deathInspirationGlow {
                0%, 100% { 
                    filter: brightness(1);
                    box-shadow: none;
                }
                50% { 
                    filter: brightness(1.6) saturate(1.4) hue-rotate(15deg);
                    box-shadow: 
                        0 0 15px rgba(157, 78, 221, 0.8),
                        0 0 30px rgba(157, 78, 221, 0.4),
                        inset 0 0 15px rgba(157, 78, 221, 0.2);
                }
            }

            /* Enhanced creature visual when being inspired */
            .creature-icon.being-inspired .creature-sprite {
                animation: creatureInspiration 1s ease-in-out;
            }

            @keyframes creatureInspiration {
                0%, 100% { 
                    transform: scale(1) rotate(0deg);
                    filter: brightness(1);
                }
                25% { 
                    transform: scale(1.05) rotate(-2deg);
                    filter: brightness(1.2);
                }
                50% { 
                    transform: scale(1.1) rotate(0deg);
                    filter: brightness(1.4);
                }
                75% { 
                    transform: scale(1.05) rotate(2deg);
                    filter: brightness(1.2);
                }
            }

            /* Skeleton Bard playing animation */
            .creature-icon.bard-playing .creature-sprite {
                animation: bardPlaying 2s ease-in-out infinite;
            }

            @keyframes bardPlaying {
                0%, 100% { 
                    transform: scale(1) rotate(0deg);
                    filter: brightness(1);
                }
                50% { 
                    transform: scale(1.08) rotate(1deg);
                    filter: brightness(1.3) saturate(1.2);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const SkeletonBardHelpers = {
    // Check if any creature in a list is Skeleton Bard
    hasSkeletonBardInList(creatures) {
        return creatures.some(creature => SkeletonBardCreature.isSkeletonBard(creature.name));
    },

    // Get all Skeleton Bard creatures from a list
    getSkeletonBardFromList(creatures) {
        return creatures.filter(creature => SkeletonBardCreature.isSkeletonBard(creature.name));
    },

    // Add playing visual effect to Skeleton Bard
    addPlayingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('bard-playing');
        }
    },

    // Remove playing visual effect from Skeleton Bard
    removePlayingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('bard-playing');
        }
    },

    // Add inspiration visual effect to creature
    addInspirationEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('being-inspired');
            setTimeout(() => {
                creatureElement.classList.remove('being-inspired');
            }, 1000);
        }
    }
};

export default SkeletonBardCreature;