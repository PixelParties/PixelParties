// ./Spells/burningFinger.js - BurningFinger Spell Implementation with Stack Synchronization

export class BurningFingerSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'BurningFinger';
        this.displayName = 'Burning Finger';
        this.stacksSynchronized = false;
    }

    // ============================================
    // STACK SYNCHRONIZATION (NEW)
    // ============================================

    // Initialize existing BurningFinger stacks when battle starts
    async initializeExistingStacks() {
        // Scan all heroes for existing burningFingerStack values
        const existingStacks = this.scanExistingStacks();
        
        if (this.battleManager.isAuthoritative) {
            // HOST: Send our stacks to guest and request guest's stacks
            await this.hostSyncStacks(existingStacks);
        } else {
            // GUEST: Send our stacks to host
            await this.guestSendStacks(existingStacks);
        }
        
        this.stacksSynchronized = true;
    }

    // Scan all heroes for existing burningFingerStack values
    scanExistingStacks() {
        const stacks = {
            player: {},
            opponent: {}
        };
        
        // Scan player heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.battleManager.playerHeroes[position];
            if (hero && typeof hero.burningFingerStack === 'number') {
                stacks.player[position] = {
                    heroName: hero.name,
                    stacks: hero.burningFingerStack
                };
            }
        });
        
        // Scan opponent heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.battleManager.opponentHeroes[position];
            if (hero && typeof hero.burningFingerStack === 'number') {
                stacks.opponent[position] = {
                    heroName: hero.name,
                    stacks: hero.burningFingerStack
                };
            }
        });
        
        return stacks;
    }

    // HOST: Synchronize stacks with guest
    async hostSyncStacks(hostStacks) {
        // Send our stacks to guest and request theirs
        this.battleManager.sendBattleUpdate('burning_finger_sync_request', {
            hostStacks: hostStacks,
            timestamp: Date.now()
        });
        
        // Wait a moment for guest response (or proceed if no response)
        await this.battleManager.delay(500);
    }

    // GUEST: Send our stacks to host
    async guestSendStacks(guestStacks) {
        this.battleManager.sendBattleUpdate('burning_finger_sync_response', {
            guestStacks: guestStacks,
            timestamp: Date.now()
        });
    }

    // HOST: Handle guest's stack data
    handleGuestStackSync(data) {
        if (!this.battleManager.isAuthoritative) return;
        
        // Update our copy of opponent heroes with guest's actual stack values
        this.applyStacksToHeroes(data.guestStacks.player, this.battleManager.opponentHeroes, 'opponent');
    }

    // GUEST: Handle host's stack data
    handleHostStackSync(data) {
        if (this.battleManager.isAuthoritative) return;
        
        // Update our copy of opponent heroes with host's actual stack values
        this.applyStacksToHeroes(data.hostStacks.player, this.battleManager.opponentHeroes, 'opponent');
        
        // Send our stacks back to host
        const guestStacks = this.scanExistingStacks();
        this.guestSendStacks(guestStacks);
    }

    // Apply stack data to heroes
    applyStacksToHeroes(stackData, heroCollection, side) {
        Object.entries(stackData).forEach(([position, data]) => {
            if (data && heroCollection[position]) {
                const hero = heroCollection[position];
                hero.burningFingerStack = data.stacks;
            }
        });
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute BurningFinger spell effect
    async executeSpell(caster, spell) {
        // Ensure stacks are synchronized before executing
        if (!this.stacksSynchronized) {
            await this.initializeExistingStacks();
        }
        
        // Get current burning finger stacks for damage calculation
        const currentStacks = caster.burningFingerStack || 0;
        const baseDamage = 100;
        const bonusDamage = currentStacks * 25;
        const totalDamage = baseDamage + bonusDamage;
        
        // Find target using normal attack targeting logic
        const target = this.findTarget(caster);
        
        if (!target) {
            return;
        }

        // Check if target resists the spell
        const isResisted = this.battleManager.resistanceManager && 
            this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
        
        if (!isResisted) {
            // Log the spell effect only if not resisted
            this.logSpellEffect(caster, totalDamage, target, currentStacks);
            this.addBurningFingerStack(caster);
        }
        
        // Play burning finger animation (damage will only be applied if not resisted)
        await this.playBurningFingerAnimation(caster, target, totalDamage, isResisted);
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find target using the same logic as normal attacks
    findTarget(caster) {
        const target = this.battleManager.authoritative_findTargetWithCreatures(
            caster.position, 
            caster.side
        );
        
        return target;
    }

    // ============================================
    // DAMAGE APPLICATION
    // ============================================

    // Apply damage to the target
    applyDamageToTarget(target, damage) {
        let actualTarget;
        let targetSide;
        let targetPosition;
        
        if (target.type === 'creature') {
            // Apply damage to the creature
            actualTarget = target.creature;
            targetSide = target.side;
            targetPosition = target.position;
            
            // Apply damage to creature using the correct function
            this.battleManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: actualTarget,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: targetPosition,
                side: targetSide
            }, { source: 'spell', attacker: null }); // BurningFinger doesn't have a specific attacker
            
            return true;
        } else {
            // Apply damage to the hero
            actualTarget = target.hero;
            targetSide = target.side;
            targetPosition = target.position;
            
            // Apply damage to hero using the correct function
            this.battleManager.authoritative_applyDamage({
                target: actualTarget,
                damage: damage,
                newHp: Math.max(0, actualTarget.currentHp - damage),
                died: (actualTarget.currentHp - damage) <= 0
            }, { source: 'spell', attacker: null }); // BurningFinger doesn't have a specific attacker
            
            return true;
        }
    }

    // ============================================
    // BURNING FINGER STACK MANAGEMENT
    // ============================================

    // Add a burning finger stack to the caster
    addBurningFingerStack(caster) {
        const oldStacks = caster.burningFingerStack || 0;
        caster.burningFingerStack = oldStacks + 1;
        
        // Send stack update to guest
        this.battleManager.sendBattleUpdate('burning_finger_stack_added', {
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            oldStacks: oldStacks,
            newStacks: caster.burningFingerStack,
            timestamp: Date.now()
        });
        
        // Save the updated stack count to persistence immediately
        if (this.battleManager.isAuthoritative) {
            // Update hero selection's saved state
            if (window.heroSelection) {
                window.heroSelection.saveGameState();
            }
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the burning finger animation
    async playBurningFingerAnimation(caster, target, damage, isResisted = false) {
        // Get caster and target elements
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        let targetElement;
        
        if (target.type === 'creature') {
            // Target is a creature
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        } else {
            // Target is a hero
            targetElement = this.battleManager.getHeroElement(target.side, target.position);
        }
        
        if (!casterElement || !targetElement) {
            // Still apply damage even if animation fails (unless resisted)
            if (!isResisted) {
                this.applyDamageToTarget(target, damage);
            }
            return;
        }
        
        // Calculate positions
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = casterRect.left + casterRect.width / 2;
        const startY = casterRect.top + casterRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Create burning finger projectile (fiery trail)
        const burningProjectile = this.createBurningProjectile(startX, startY, endX, endY);
        
        // Animation timing
        const projectileTime = 300; // 300ms for fiery trail
        const slashTime = 400;      // 400ms for slashing effect
        
        // Wait for projectile to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove projectile and apply damage/show slash effect
        if (burningProjectile && burningProjectile.parentNode) {
            burningProjectile.remove();
        }
        
        // Apply damage ONLY if not resisted
        if (!isResisted) {
            this.applyDamageToTarget(target, damage);
        }
        
        // ALWAYS create slash effect (regardless of resistance)
        this.createSlashEffect(targetElement, damage, isResisted);
        
        // Wait for slash effect to complete
        await this.battleManager.delay(slashTime);
        
        // Cleanup
        this.cleanupBurningFingerEffects();
    }

    // Create the burning finger projectile element (fiery trail)
    createBurningProjectile(startX, startY, endX, endY) {
        const projectile = document.createElement('div');
        projectile.className = 'burning-finger-projectile';
        projectile.innerHTML = '🔥👆💨';
        
        // Calculate travel distance for scaling effect
        const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const maxDistance = 800; // Approximate max battlefield width
        const sizeMultiplier = 1 + (distance / maxDistance) * 0.3; // Slightly larger scaling than icebolt
        
        projectile.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: ${Math.min(38 * sizeMultiplier, 55)}px;
            z-index: 400;
            pointer-events: none;
            transform: translate(-50%, -50%);
            animation: burningFingerTravel ${this.battleManager.getSpeedAdjustedDelay(300)}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(255, 100, 0, 0.9),
                0 0 30px rgba(255, 150, 0, 0.7),
                0 0 45px rgba(255, 200, 100, 0.5);
            filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.8));
        `;
        
        // Set CSS custom properties for target position
        projectile.style.setProperty('--target-x', `${endX}px`);
        projectile.style.setProperty('--target-y', `${endY}px`);
        
        document.body.appendChild(projectile);
        
        // Ensure CSS exists
        this.ensureBurningFingerCSS();
        
        return projectile;
    }

    // Create fiery slashing effect at target location
    createSlashEffect(targetElement, damage, isResisted = false) {
        // Create main slash effect
        const effect = document.createElement('div');
        effect.className = isResisted ? 'burning-finger-resistance-shield' : 'burning-finger-slash-effect';
        
        if (isResisted) {
            // Show shield effect for resisted
            effect.innerHTML = '🛡️🔥';
            effect.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                z-index: 450;
                pointer-events: none;
                animation: burningFingerResisted ${this.battleManager.getSpeedAdjustedDelay(400)}ms ease-out forwards;
                text-shadow: 
                    0 0 20px rgba(255, 100, 0, 1),
                    0 0 40px rgba(255, 150, 0, 0.8),
                    0 0 60px rgba(255, 200, 100, 0.6);
            `;
        } else {
            // Normal burning slash
            effect.innerHTML = '🔥⚔️🔥';
            effect.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 52px;
                z-index: 450;
                pointer-events: none;
                animation: burningFingerSlash ${this.battleManager.getSpeedAdjustedDelay(400)}ms ease-out forwards;
                text-shadow: 
                    0 0 20px rgba(255, 100, 0, 1),
                    0 0 40px rgba(255, 150, 0, 0.8),
                    0 0 60px rgba(255, 200, 100, 0.6);
            `;
        }
        
        targetElement.appendChild(effect);
        
        // Create additional fire sparks for non-resisted hits
        if (!isResisted) {
            this.createFireSparks(targetElement, damage);
        }
        
        // Remove effect after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(400));
    }

    // Create fire sparks to represent high damage
    createFireSparks(targetElement, damage) {
        const sparkCount = Math.min(Math.floor(damage / 50), 8); // 1 spark per 50 damage, max 8
        
        for (let i = 0; i < sparkCount; i++) {
            setTimeout(() => {
                const spark = document.createElement('div');
                spark.className = 'burning-finger-fire-spark';
                spark.innerHTML = '🔥';
                
                // Random positioning around the target
                const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
                const distance = 35 + Math.random() * 30;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                
                spark.style.cssText = `
                    position: absolute;
                    top: calc(50% + ${y}px);
                    left: calc(50% + ${x}px);
                    transform: translate(-50%, -50%);
                    font-size: ${18 + Math.random() * 14}px;
                    z-index: 350;
                    pointer-events: none;
                    animation: burningFingerFireSpark ${this.battleManager.getSpeedAdjustedDelay(160)}ms ease-out forwards;
                    text-shadow: 
                        0 0 8px rgba(255, 100, 0, 0.8),
                        0 0 16px rgba(255, 150, 0, 0.6);
                `;
                
                targetElement.appendChild(spark);
                
                setTimeout(() => {
                    if (spark && spark.parentNode) {
                        spark.remove();
                    }
                }, this.battleManager.getSpeedAdjustedDelay(160));
            }, this.battleManager.getSpeedAdjustedDelay(i * 30)); // Staggered spark creation
        }
    }

    // Clean up any remaining burning finger effects
    cleanupBurningFingerEffects() {
        // Remove any remaining projectiles
        const projectiles = document.querySelectorAll('.burning-finger-projectile');
        projectiles.forEach(projectile => projectile.remove());
        
        // Remove any remaining fire effects
        const fireEffects = document.querySelectorAll('.burning-finger-slash-effect, .burning-finger-fire-spark, .burning-finger-resistance-shield');
        fireEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for burning finger effects
    ensureBurningFingerCSS() {
        if (document.getElementById('burningFingerCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'burningFingerCSS';
        style.textContent = `
            @keyframes burningFingerTravel {
                0% { 
                    transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
                    opacity: 1;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.1) rotate(45deg);
                    opacity: 1;
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(315deg);
                }
                100% { 
                    left: var(--target-x);
                    top: var(--target-y);
                    transform: translate(-50%, -50%) scale(1.3) rotate(360deg);
                    opacity: 0.8;
                }
            }
            
            @keyframes burningFingerSlash {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(-45deg); 
                }
                20% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(0deg); 
                }
                50% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.6) rotate(45deg); 
                }
                80% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.8) rotate(90deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(2.0) rotate(135deg); 
                }
            }
            
            @keyframes burningFingerResisted {
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
                    transform: translate(-50%, -50%) scale(1.5) rotate(120deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.7) rotate(180deg); 
                }
            }
            
            @keyframes burningFingerFireSpark {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.2) rotate(0deg); 
                }
                40% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.0) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(360deg); 
                }
            }
            
            /* Enhanced visual effects */
            .burning-finger-projectile {
                will-change: transform, opacity;
            }
            
            .burning-finger-slash-effect, .burning-finger-fire-spark, .burning-finger-resistance-shield {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, damage, target, currentStacks) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        let targetName;
        if (target.type === 'creature') {
            targetName = target.creature.name;
        } else {
            targetName = target.hero.name;
        }
        
        // Main spell effect log
        let logMessage = `🔥👆 ${this.displayName} burns ${targetName} for ${damage} damage!`;
        
        // Add stack information if stacks were used
        if (currentStacks > 0) {
            logMessage += ` (${currentStacks} stacks: +${currentStacks * 25} bonus damage)`;
        }
        
        this.battleManager.addCombatLog(logMessage, logType);
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetName: targetName,
            targetAbsoluteSide: target.hero.absoluteSide,
            targetPosition: target.position,
            targetType: target.type,
            targetCreatureIndex: target.type === 'creature' ? target.creatureIndex : undefined,
            damage: damage,
            currentStacks: currentStacks,
            isResisted: false,
            effectType: 'damage_application',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, damage, currentStacks, isResisted } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log only if not resisted
        if (!isResisted) {
            let logMessage = `🔥👆 ${displayName} burns ${targetName} for ${damage} damage!`;
            
            // Add stack information if stacks were used
            if (currentStacks > 0) {
                logMessage += ` (${currentStacks} stacks: +${currentStacks * 25} bonus damage)`;
            }
            
            this.battleManager.addCombatLog(logMessage, logType);
        }
        
        // Create mock objects for guest-side animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        const targetLocalSide = (data.targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        let mockTarget;
        if (data.targetType === 'creature') {
            // For creature targets
            mockTarget = {
                type: 'creature',
                side: targetLocalSide,
                position: data.targetPosition,
                creatureIndex: data.targetCreatureIndex || 0,
                hero: {} // Mock hero object
            };
        } else {
            // For hero targets
            mockTarget = {
                type: 'hero',
                side: targetLocalSide,
                position: data.targetPosition,
                hero: {} // Mock hero object
            };
        }
        
        // Play visual effects on guest side (no damage application)
        this.playBurningFingerAnimationGuestSide(mockCaster, mockTarget, damage, isResisted);
    }

    // Handle stack update on guest side
    guest_handleStackUpdate(data) {
        const { casterName, casterAbsoluteSide, casterPosition, oldStacks, newStacks } = data;
        
        // Determine if this is our hero or opponent's hero
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the hero and update their stack count
        const heroes = casterLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[casterPosition];
        
        if (hero) {
            hero.burningFingerStack = newStacks;
            
            // Add log message
            this.battleManager.addCombatLog(
                `${casterName} gains Burning Finger stack! (${oldStacks} -> ${newStacks})`,
                casterLocalSide === 'player' ? 'success' : 'info'
            );

            // If this is our own hero, also save to persistence immediately
            if (casterLocalSide === 'player' && window.heroSelection) {
                // Update the permanent hero's stacks in the formation manager
                const formation = window.heroSelection.formationManager.getBattleFormation();
                
                if (formation[casterPosition]) {
                    formation[casterPosition].burningFingerStack = newStacks;
                    
                    // Save to persistence
                    window.heroSelection.saveGameState();
                }
            }
        }
    }

    // Guest-side animation (visual only, no damage application)
    async playBurningFingerAnimationGuestSide(caster, target, damage, isResisted = false) {
        // Get caster element
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        
        // Get target element
        let targetElement;
        if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        } else {
            targetElement = this.battleManager.getHeroElement(target.side, target.position);
        }
        
        if (!casterElement || !targetElement) {
            return;
        }
        
        // Calculate positions
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = casterRect.left + casterRect.width / 2;
        const startY = casterRect.top + casterRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Create burning finger projectile
        const burningProjectile = this.createBurningProjectile(startX, startY, endX, endY);
        
        // Animation timing
        const projectileTime = 300;
        const slashTime = 400;
        
        // Wait for projectile to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove projectile and create slash effect
        if (burningProjectile && burningProjectile.parentNode) {
            burningProjectile.remove();
        }
        
        // Create slash effect (visual only)
        this.createSlashEffect(targetElement, damage, isResisted);
        
        // Wait for slash effect to complete
        await this.battleManager.delay(slashTime);
        
        // Cleanup
        this.cleanupBurningFingerEffects();
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
            description: 'Launches a fiery slash that deals 100 damage plus 25 per Burning Finger stack on the caster. Grants +1 permanent stack to the caster.',
            effectFormula: '100 damage + (25 × Burning Finger stacks on caster), then gain +1 stack',
            targetType: 'single_target_next_opposite',
            spellSchool: 'DestructionMagic',
            persistent: true // Indicates stacks persist across battles
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupBurningFingerEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('burningFingerCSS');
        if (css) css.remove();
        
        // Reset synchronization state
        this.stacksSynchronized = false;
    }
}

// Export for use in spell system
export default BurningFingerSpell;