// ./Spells/iceage.js - Enhanced Ice Age Spell Implementation with Snowstorm Animation

export class IceAgeSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Iceage';  // Must match exactly what's in card database
        this.displayName = 'Ice Age';
        
        console.log('❄️🌨️ Ice Age spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Ice Age spell effect
    async executeSpell(caster, spell) {
        console.log(`❄️🌨️ ${caster.name} casting ${this.displayName}!`);
        
        // Calculate frozen stacks based on DecayMagic level (same as Icebolt)
        const frozenStacks = this.calculateFrozenStacks(caster);
        
        // Find all enemy targets
        const targets = this.findAllEnemyTargets(caster);
        
        if (!targets || targets.length === 0) {
            console.log(`❄️🌨️ ${this.displayName}: No valid targets found!`);
            return;
        }

        console.log(`❄️🌨️ ${this.displayName} targeting ${targets.length} enemies!`);

        // Log the spell effect
        this.logSpellEffect(caster, frozenStacks, targets);
        
        // ⭐ Pause the battle during Ice Age animation
        this.pauseBattleDuringIceAge();
        
        // Play new snowstorm animation (2 seconds total)
        await this.playSnowstormAnimation(caster, targets, frozenStacks);
        
        // ⭐ Resume the battle after animation
        this.resumeBattleAfterIceAge();
        
        console.log(`❄️🌨️ ${this.displayName} completed!`);
    }

    // ============================================
    // BATTLE PAUSE/RESUME SYSTEM (UNCHANGED)
    // ============================================

    // Pause battle during Ice Age (except for simultaneous opponent actions)
    pauseBattleDuringIceAge() {
        const bm = this.battleManager;
        
        // Set a special flag to indicate Ice Age is in progress
        bm.iceAgeInProgress = true;
        
        // Add combat log message
        bm.addCombatLog('🌨️ The world freezes as an ICE AGE descends upon the battlefield!', 'warning');
        
        // Send update to guest about Ice Age pause
        if (bm.isAuthoritative) {
            bm.sendBattleUpdate('ice_age_pause', {
                casterName: bm.playerHeroes ? Object.values(bm.playerHeroes).find(h => h.hasAbility('DecayMagic'))?.name || 'Unknown' : 'Unknown',
                timestamp: Date.now()
            });
        }
        
        console.log('🌨️ Battle paused for Ice Age animation');
    }

    // Resume battle after Ice Age animation
    resumeBattleAfterIceAge() {
        const bm = this.battleManager;
        
        // Clear the Ice Age flag
        bm.iceAgeInProgress = false;
        
        // Add combat log message
        bm.addCombatLog('🌨️ The ice age subsides... battle resumes with frozen enemies!', 'info');
        
        // Send update to guest about Ice Age resume
        if (bm.isAuthoritative) {
            bm.sendBattleUpdate('ice_age_resume', {
                timestamp: Date.now()
            });
        }
        
        console.log('✅ Battle resumed after Ice Age animation');
    }

    // ============================================
    // FROZEN STACK CALCULATION (UNCHANGED)
    // ============================================

    // Calculate frozen stacks: 1 + floor(DecayMagic level / 2) + 1 if caster is Gon
    calculateFrozenStacks(caster) {
        // Get DecayMagic level (defaults to 0 if hero doesn't have the ability)
        const decayMagicLevel = caster.hasAbility('DecayMagic') 
            ? caster.getAbilityStackCount('DecayMagic') 
            : 0;
        
        const additionalStacks = Math.floor(decayMagicLevel / 2);
        let frozenStacks = 1 + additionalStacks;
        
        // Special bonus for Gon
        const gonBonus = caster.name === 'Gon' ? 1 : 0;
        frozenStacks += gonBonus;
        
        let logDetails = `1 base + ${additionalStacks} from DecayMagic`;
        if (gonBonus > 0) {
            logDetails += ` + ${gonBonus} from Gon's mastery`;
        }
        
        console.log(`❄️🌨️ ${caster.name} DecayMagic level ${decayMagicLevel}: ${frozenStacks} frozen stacks (${logDetails})`);
        
        return frozenStacks;
    }

    // ============================================
    // TARGET FINDING (UNCHANGED)
    // ============================================

    // Find all enemy targets (heroes and creatures)
    findAllEnemyTargets(caster) {
        const targets = [];
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = caster.side === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        // Add all alive enemy heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                targets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: enemySide
                });
                
                // Add all alive creatures from this hero
                if (hero.creatures) {
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
        
        console.log(`🎯 ${this.displayName} found ${targets.length} enemy targets`);
        targets.forEach(target => {
            if (target.type === 'creature') {
                console.log(`  - Creature: ${target.creature.name} (${target.position} slot)`);
            } else {
                console.log(`  - Hero: ${target.hero.name} (${target.position} slot)`);
            }
        });
        
        return targets;
    }

    // ============================================
    // FROZEN APPLICATION (UNCHANGED)
    // ============================================

    // Apply frozen stacks to all targets (with individual resistance checks)
    applyFrozenToAllTargets(targets, frozenStacks, caster) {
        let successCount = 0;
        let resistedCount = 0;
        
        targets.forEach(target => {
            let actualTarget;
            
            if (target.type === 'creature') {
                actualTarget = target.creature;
            } else {
                actualTarget = target.hero;
            }
            
            // Check if target resists the spell (individual resistance check)
            const isResisted = this.battleManager.resistanceManager && 
                this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
            
            if (isResisted) {
                console.log(`🛡️ ${actualTarget.name} resisted ${this.displayName}!`);
                resistedCount++;
                
                // Send individual resistance update to guest
                if (this.battleManager.isAuthoritative) {
                    this.battleManager.sendBattleUpdate('spell_effect', {
                        spellName: this.spellName,
                        displayName: this.displayName,
                        targetName: actualTarget.name,
                        targetAbsoluteSide: target.hero.absoluteSide,
                        targetPosition: target.position,
                        targetType: target.type,
                        targetCreatureIndex: target.type === 'creature' ? target.creatureIndex : undefined,
                        frozenStacks: frozenStacks,
                        isResisted: true,
                        effectType: 'individual_resistance',
                        timestamp: Date.now()
                    });
                }
            } else {
                // Apply frozen status effect using the status effects manager
                if (this.battleManager.statusEffectsManager) {
                    const success = this.battleManager.statusEffectsManager.applyStatusEffect(
                        actualTarget, 
                        'frozen', 
                        frozenStacks
                    );
                    
                    if (success) {
                        console.log(`❄️🌨️ Successfully applied ${frozenStacks} frozen stacks to ${actualTarget.name}`);
                        successCount++;
                    }
                }
            }
        });
        
        console.log(`❄️🌨️ Ice Age results: ${successCount} affected, ${resistedCount} resisted`);
        return { successCount, resistedCount };
    }

    // ============================================
    // NEW SNOWSTORM ANIMATION (2 SECONDS)
    // ============================================

    // Play the new snowstorm animation (2 seconds total)
    async playSnowstormAnimation(caster, targets, frozenStacks) {
        console.log(`❄️🌨️ Playing SNOWSTORM Ice Age animation affecting ${targets.length} targets...`);
        
        // Determine enemy side for area effect
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        
        // Start the snowstorm
        this.createSnowstormEffect(enemySide);
        
        // Apply frozen effects at 1 second mark (middle of animation)
        setTimeout(() => {
            const results = this.applyFrozenToAllTargets(targets, frozenStacks, caster);
            console.log(`❄️🌨️ Frozen effects applied: ${results.successCount} affected, ${results.resistedCount} resisted`);
        }, 1000);
        
        // Wait for full 2-second animation
        await this.battleManager.delay(2000);
        
        // Clean up effects
        this.cleanupSnowstormEffects();
        
        console.log(`❄️🌨️ Snowstorm animation completed`);
    }

    // Create the main snowstorm effect
    createSnowstormEffect(enemySide) {
        // Remove any existing effects
        this.cleanupSnowstormEffects();
        
        // Find the enemy battle area
        const enemyRow = document.querySelector(`.${enemySide}-row`);
        if (!enemyRow) {
            console.error(`Could not find ${enemySide} row for Ice Age snowstorm`);
            return;
        }
        
        const rowRect = enemyRow.getBoundingClientRect();
        const padding = 20;
        
        // Create snowstorm container
        const snowstormContainer = document.createElement('div');
        snowstormContainer.className = 'iceage-snowstorm-container';
        snowstormContainer.id = 'iceageSnowstormContainer';
        
        snowstormContainer.style.cssText = `
            position: fixed;
            left: ${rowRect.left - padding}px;
            top: ${rowRect.top - padding}px;
            width: ${rowRect.width + (padding * 2)}px;
            height: ${rowRect.height + (padding * 2)}px;
            z-index: 1000;
            pointer-events: none;
            overflow: hidden;
            background: linear-gradient(135deg, 
                rgba(255, 255, 255, 0.1) 0%,
                rgba(240, 248, 255, 0.2) 25%,
                rgba(255, 255, 255, 0.3) 50%,
                rgba(240, 248, 255, 0.2) 75%,
                rgba(255, 255, 255, 0.1) 100%
            );
            border-radius: 15px;
            box-shadow: inset 0 0 50px rgba(255, 255, 255, 0.3);
        `;
        
        // Create hundreds of snowflakes
        this.generateSnowflakes(snowstormContainer, 500); // Increased from 300
        
        // Create white particles for intensity
        this.generateWhiteParticles(snowstormContainer, 400); // Increased from 200
        
        document.body.appendChild(snowstormContainer);
        this.ensureSnowstormCSS();
        
        console.log(`❄️🌨️ Snowstorm created over ${enemySide} side with 500 particles`);
    }

    // Generate snowflakes flying across the entire screen
    generateSnowflakes(container, count) {
        const containerRect = container.getBoundingClientRect();
        let snowflakeHTML = '';
        
        for (let i = 0; i < count; i++) {
            const size = Math.random() * 15 + 8; // 8-23px
            // Start from far left, spread across ENTIRE SCREEN HEIGHT
            const startX = -200 - Math.random() * 100; // Start -200 to -300px left
            const startY = Math.random() * (window.innerHeight + 400) - 200; // Cover FULL screen height + buffer
            const animationDelay = Math.random() * 1500; // 0-1.5s delay (faster start)
            const animationDuration = 800 + Math.random() * 400; // 0.8-1.2s duration (much faster!)
            const rotation = Math.random() * 360;
            
            // End positions: sweep across ENTIRE SCREEN width
            const endX = window.innerWidth + 200 + Math.random() * 100; // Go to far right of screen
            const endY = startY + Math.random() * 300 - 150; // More vertical drift
            
            snowflakeHTML += `
                <div class="snowstorm-snowflake" style="
                    left: ${startX}px;
                    top: ${startY}px;
                    font-size: ${size}px;
                    animation-delay: ${animationDelay}ms;
                    animation-duration: ${animationDuration}ms;
                    transform: rotate(${rotation}deg);
                    --end-x: ${endX}px;
                    --end-y: ${endY}px;
                ">❄</div>
            `;
        }
        
        const snowflakeLayer = document.createElement('div');
        snowflakeLayer.className = 'snowstorm-snowflakes-layer';
        snowflakeLayer.innerHTML = snowflakeHTML;
        container.appendChild(snowflakeLayer);
    }

    // Generate white particles flying across entire screen
    generateWhiteParticles(container, count) {
        const containerRect = container.getBoundingClientRect();
        let particleHTML = '';
        
        for (let i = 0; i < count; i++) {
            const size = Math.random() * 8 + 3; // 3-11px
            // Start from left side, spread across ENTIRE SCREEN HEIGHT
            const startX = -150 - Math.random() * 100; // Start -150 to -250px left
            const startY = Math.random() * (window.innerHeight + 300) - 150; // Cover FULL screen height
            const animationDelay = Math.random() * 1500;
            const animationDuration = 700 + Math.random() * 500; // 0.7-1.2s (faster!)
            const opacity = 0.4 + Math.random() * 0.4; // 0.4-0.8
            
            // End positions: sweep across ENTIRE SCREEN width
            const endX = window.innerWidth + 150 + Math.random() * 100;
            const endY = startY + Math.random() * 200 - 100;
            
            particleHTML += `
                <div class="snowstorm-particle" style="
                    left: ${startX}px;
                    top: ${startY}px;
                    width: ${size}px;
                    height: ${size}px;
                    animation-delay: ${animationDelay}ms;
                    animation-duration: ${animationDuration}ms;
                    opacity: ${opacity};
                    --end-x: ${endX}px;
                    --end-y: ${endY}px;
                "></div>
            `;
        }
        
        const particleLayer = document.createElement('div');
        particleLayer.className = 'snowstorm-particles-layer';
        particleLayer.innerHTML = particleHTML;
        container.appendChild(particleLayer);
    }

    // Clean up snowstorm effects
    cleanupSnowstormEffects() {
        const container = document.getElementById('iceageSnowstormContainer');
        if (container) {
            container.remove();
        }
    }

    // Ensure snowstorm CSS exists
    ensureSnowstormCSS() {
        if (document.getElementById('snowstormIceageCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'snowstormIceageCSS';
        style.textContent = `
            .iceage-snowstorm-container {
                will-change: transform, opacity;
                animation: snowstormContainerPulse 2s ease-in-out;
            }
            
            @keyframes snowstormContainerPulse {
                0% { 
                    opacity: 0;
                    transform: scale(0.9);
                }
                20% { 
                    opacity: 0.8;
                    transform: scale(1.02);
                }
                80% { 
                    opacity: 0.9;
                    transform: scale(1.0);
                }
                100% { 
                    opacity: 0;
                    transform: scale(1.05);
                }
            }
            
            .snowstorm-snowflakes-layer {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2;
            }
            
            .snowstorm-particles-layer {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
            }
            
            .snowstorm-snowflake {
                position: absolute;
                color: rgba(255, 255, 255, 0.9);
                text-shadow: 
                    0 0 10px rgba(200, 240, 255, 0.8),
                    0 0 20px rgba(255, 255, 255, 0.6);
                animation: snowstormDiagonalFlow linear;
                pointer-events: none;
                z-index: 3;
            }
            
            .snowstorm-particle {
                position: absolute;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.7) 50%, transparent 100%);
                border-radius: 50%;
                animation: snowstormDiagonalFlow linear;
                pointer-events: none;
                box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
            }
            
            @keyframes snowstormDiagonalFlow {
                0% {
                    transform: translate(0, 0) rotate(0deg) scale(0.2);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                    transform: translate(calc(var(--end-x) * 0.2), calc(var(--end-y) * 0.1)) rotate(45deg) scale(0.8);
                }
                90% {
                    opacity: 1;
                    transform: translate(calc(var(--end-x) * 0.9), calc(var(--end-y) * 0.8)) rotate(315deg) scale(1.2);
                }
                100% {
                    transform: translate(var(--end-x), var(--end-y)) rotate(360deg) scale(0.1);
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG (UNCHANGED)
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, frozenStacks, targets) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Main spell effect log
        let logMessage = `❄️🌨️ ${this.displayName} engulfs all enemies in apocalyptic winter! ${frozenStacks} frozen stack${frozenStacks > 1 ? 's' : ''} incoming!`;
        
        // Add special message for Gon's bonus
        if (caster.name === 'Gon') {
            logMessage += ` (Gon's mastery intensifies the eternal winter!)`;
        }
        
        this.battleManager.addCombatLog(logMessage, logType);
        
        // Send spell effect update to guest with all target information
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetCount: targets.length,
            frozenStacks: frozenStacks,
            isResisted: false,
            effectType: 'area_effect',
            hasGonBonus: caster.name === 'Gon',
            enemySide: caster.side === 'player' ? 'opponent' : 'player',
            targets: targets.map(target => ({
                type: target.type,
                name: target.type === 'creature' ? target.creature.name : target.hero.name,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.type === 'creature' ? target.creatureIndex : undefined
            })),
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING (UPDATED FOR SNOWSTORM)
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetCount, frozenStacks, effectType, hasGonBonus, enemySide } = data;
        
        if (effectType === 'area_effect') {
            // Handle main area effect
            const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
            const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const logType = casterLocalSide === 'player' ? 'success' : 'error';
            
            // Add to battle log
            let logMessage = `❄️🌨️ ${displayName} engulfs all enemies in apocalyptic winter! ${frozenStacks} frozen stack${frozenStacks > 1 ? 's' : ''} incoming!`;
            
            if (hasGonBonus) {
                logMessage += ` (Gon's mastery intensifies the eternal winter!)`;
            }
            
            this.battleManager.addCombatLog(logMessage, logType);
            
            // Handle guest-side pause
            this.handleGuestIceAgePause(data);
            
            // Play snowstorm animation on guest side
            this.playSnowstormAnimationGuestSide(data);
            
        } else if (effectType === 'individual_resistance') {
            // Handle individual resistance
            console.log(`❄️🌨️ GUEST: ${data.targetName} resisted Ice Age`);
        }
        
        console.log(`❄️🌨️ GUEST: ${casterName} used ${displayName} affecting ${targetCount} targets${hasGonBonus ? ' (Gon bonus)' : ''}`);
    }

    // Handle guest-side Ice Age pause
    handleGuestIceAgePause(data) {
        // Set guest-side Ice Age flag
        this.battleManager.iceAgeInProgress = true;
        this.battleManager.addCombatLog('🌨️ The world freezes as an ICE AGE descends upon the battlefield!', 'warning');
        console.log('🌨️ GUEST: Ice Age pause received from host');
    }

    // Handle guest-side Ice Age resume
    handleGuestIceAgeResume(data) {
        // Clear guest-side Ice Age flag
        this.battleManager.iceAgeInProgress = false;
        this.battleManager.addCombatLog('🌨️ The ice age subsides... battle resumes with frozen enemies!', 'info');
        console.log('✅ GUEST: Ice Age resume received from host');
    }

    // Guest-side snowstorm animation (visual only)
    async playSnowstormAnimationGuestSide(data) {
        // Calculate the correct enemy side from guest's perspective
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const guestEnemySide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'opponent' : 'player';
        
        console.log(`❄️🌨️ GUEST: Playing snowstorm animation on ${guestEnemySide} side (caster absolute side: ${data.casterAbsoluteSide}, my absolute side: ${myAbsoluteSide})`);
        
        // Start snowstorm with correct perspective
        this.createSnowstormEffect(guestEnemySide);
        
        // Wait for 2-second animation
        await this.battleManager.delay(2000);
        
        // Cleanup and resume
        this.cleanupSnowstormEffects();
        this.handleGuestIceAgeResume(data);
    }

    // ============================================
    // UTILITY METHODS (UNCHANGED)
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
            description: 'Unleashes a devastating snowstorm upon the battlefield, pausing time while hundreds of snowflakes and ice particles engulf all enemies. Applies frozen stacks to all enemy heroes and creatures.',
            effectFormula: '1 frozen stack + floor(DecayMagic level / 2) additional stacks + 1 if caster is Gon (applied to ALL enemies)',
            targetType: 'all_enemies',
            spellSchool: 'DecayMagic',
            pausesBattle: true,
            isEndgameSpell: true
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupSnowstormEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('snowstormIceageCSS');
        if (css) css.remove();
        
        // Clear any Ice Age flags
        if (this.battleManager) {
            this.battleManager.iceAgeInProgress = false;
        }
        
        console.log('❄️🌨️ Snowstorm Ice Age spell cleaned up');
    }
}

// Export for use in spell system
export default IceAgeSpell;