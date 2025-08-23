// ./Spells/gloriousRebirth.js - Glorious Rebirth Spell Implementation

export class GloriousRebirthSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'GloriousRebirth';
        this.displayName = 'Glorious Rebirth';
        
        console.log('✨ Glorious Rebirth spell module initialized');
    }

    // ============================================
    // SPELL CASTING CONDITIONS
    // ============================================

    // Check if spell can be cast (requires at least 1 dead ally with 0 heal-block)
    canCast(caster) {
        const eligibleTargets = this.findEligibleTargets(caster);
        const canCast = eligibleTargets.length > 0;
        
        if (!canCast) {
            console.log(`✨ ${caster.name} cannot cast ${this.displayName} - no eligible dead allies`);
        } else {
            console.log(`✨ ${caster.name} can cast ${this.displayName} - ${eligibleTargets.length} eligible target(s)`);
        }
        
        return canCast;
    }

    // Find dead ally heroes with 0 heal-block stacks
    findEligibleTargets(caster) {
        const allies = caster.side === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const eligibleTargets = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = allies[position];
            if (hero && !hero.alive) {
                // Check heal-block stacks
                const healBlockStacks = this.battleManager.statusEffectsManager 
                    ? this.battleManager.statusEffectsManager.getStatusEffectStacks(hero, 'heal-block')
                    : 0;
                
                if (healBlockStacks === 0) {
                    eligibleTargets.push({ hero, position });
                    console.log(`✨ Eligible target found: ${hero.name} at ${position} (${healBlockStacks} heal-block stacks)`);
                } else {
                    console.log(`✨ ${hero.name} at ${position} not eligible (${healBlockStacks} heal-block stacks)`);
                }
            }
        });
        
        return eligibleTargets;
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Glorious Rebirth spell effect
    async executeSpell(caster, spell) {
        console.log(`✨ ${caster.name} casting ${this.displayName}!`);
        
        // Find eligible targets
        const eligibleTargets = this.findEligibleTargets(caster);
        
        if (eligibleTargets.length === 0) {
            console.log(`✨ ${this.displayName}: No eligible targets found!`);
            return;
        }
        
        // Randomly select target
        const randomIndex = Math.floor(this.battleManager.getRandom() * eligibleTargets.length);
        const selectedTarget = eligibleTargets[randomIndex];
        
        console.log(`✨ ${this.displayName} targeting: ${selectedTarget.hero.name} at ${selectedTarget.position}`);
        
        // Log the spell effect
        this.logSpellEffect(caster, selectedTarget);
        
        // Play glorious rebirth animation and revival
        await this.playGloriousRebirthAnimation(caster, selectedTarget);
        
        console.log(`✨ ${this.displayName} completed!`);
    }

    // ============================================
    // REVIVAL MECHANICS
    // ============================================

    // Revive the target hero at 50% max HP
    reviveHero(targetData) {
        const { hero, position } = targetData;
        const casterSide = hero.side;
        
        // Calculate revival HP (50% of max HP)
        const revivalHp = Math.floor(hero.maxHp / 2);
        
        // Revive the hero
        hero.alive = true;
        hero.currentHp = revivalHp;
        
        console.log(`✨ ${hero.name} revived with ${revivalHp}/${hero.maxHp} HP`);
        
        // Update hero visual state
        this.updateHeroVisualState(casterSide, position, hero);
        
        // Apply 99 heal-block stacks to prevent future revivals
        if (this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.applyStatusEffect(hero, 'heal-block', 99);
            console.log(`✨ Applied 99 heal-block stacks to ${hero.name} to prevent future revivals`);
        }
        
        return revivalHp;
    }

    // Update hero visual state after revival
    updateHeroVisualState(side, position, hero) {
        // Remove defeated visual state
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (heroElement) {
            const card = heroElement.querySelector('.battle-hero-card');
            if (card) {
                card.classList.remove('defeated');
                card.style.filter = '';
                card.style.opacity = '';
                card.style.transform = '';
            }
        }
        
        // Update health bar
        this.battleManager.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
        
        console.log(`✨ Updated visual state for revived ${hero.name}`);
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the glorious rebirth animation with light beams
    async playGloriousRebirthAnimation(caster, targetData) {
        console.log(`✨ Playing Glorious Rebirth animation for ${targetData.hero.name}...`);
        
        const { hero, position } = targetData;
        const targetElement = this.battleManager.getHeroElement(hero.side, position);
        
        if (!targetElement) {
            console.error('Could not find target element for glorious rebirth animation');
            // Still perform the revival even if animation fails
            const revivalHp = this.reviveHero(targetData);
            this.sendRevivalUpdate(caster, targetData, revivalHp);
            return;
        }
        
        // Create light beam effects
        this.createLightBeamEffect(targetElement);
        
        // Animation timing
        const lightBeamTime = 400; // Light beams descend
        const revivalTime = 200;   // Revival flash
        
        // Wait for light beams to reach target
        await this.battleManager.delay(lightBeamTime);
        
        // Perform the actual revival
        const revivalHp = this.reviveHero(targetData);
        
        // Create revival flash effect
        this.createRevivalFlashEffect(targetElement);
        
        // Send network update to guest
        this.sendRevivalUpdate(caster, targetData, revivalHp);
        
        // Wait for revival effect to complete
        await this.battleManager.delay(revivalTime);
        
        // Cleanup
        this.cleanupGloriousRebirthEffects();
    }

    // Create light beam effects descending from top of screen
    createLightBeamEffect(targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;
        
        // Create multiple light beams for dramatic effect
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const lightBeam = document.createElement('div');
                lightBeam.className = 'glorious-rebirth-light-beam';
                lightBeam.innerHTML = '✨⚡✨';
                
                // Random horizontal offset for multiple beams
                const offsetX = (Math.random() - 0.5) * 60;
                const startY = -50; // Start from top of screen
                
                lightBeam.style.cssText = `
                    position: fixed;
                    left: ${targetX + offsetX}px;
                    top: ${startY}px;
                    font-size: ${32 + Math.random() * 16}px;
                    z-index: 450;
                    pointer-events: none;
                    transform: translate(-50%, -50%);
                    animation: gloriousRebirthLightBeam ${this.battleManager.getSpeedAdjustedDelay(400)}ms ease-in forwards;
                    text-shadow: 
                        0 0 20px rgba(255, 255, 100, 1),
                        0 0 40px rgba(255, 215, 0, 0.8),
                        0 0 60px rgba(255, 255, 255, 0.6);
                    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
                `;
                
                // Set target position for animation
                lightBeam.style.setProperty('--target-y', `${targetY}px`);
                
                document.body.appendChild(lightBeam);
            }, this.battleManager.getSpeedAdjustedDelay(i * 80)); // Staggered beam creation
        }
        
        // Ensure CSS exists
        this.ensureGloriousRebirthCSS();
    }

    // Create revival flash effect at target location
    createRevivalFlashEffect(targetElement) {
        const effect = document.createElement('div');
        effect.className = 'glorious-rebirth-revival-flash';
        effect.innerHTML = '🌟✨🌟';
        
        effect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 56px;
            z-index: 500;
            pointer-events: none;
            animation: gloriousRebirthRevivalFlash ${this.battleManager.getSpeedAdjustedDelay(200)}ms ease-out forwards;
            text-shadow: 
                0 0 25px rgba(255, 255, 255, 1),
                0 0 50px rgba(255, 215, 0, 0.9),
                0 0 75px rgba(255, 255, 100, 0.7);
        `;
        
        targetElement.appendChild(effect);
        
        // Remove effect after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(200));
    }

    // Send revival update to network
    sendRevivalUpdate(caster, targetData, revivalHp) {
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetName: targetData.hero.name,
            targetAbsoluteSide: targetData.hero.absoluteSide,
            targetPosition: targetData.position,
            revivalHp: revivalHp,
            maxHp: targetData.hero.maxHp,
            effectType: 'hero_revival',
            timestamp: Date.now()
        });
    }

    // Clean up any remaining glorious rebirth effects
    cleanupGloriousRebirthEffects() {
        // Remove any remaining light beams
        const lightBeams = document.querySelectorAll('.glorious-rebirth-light-beam');
        lightBeams.forEach(beam => beam.remove());
        
        // Remove any remaining revival effects
        const revivalEffects = document.querySelectorAll('.glorious-rebirth-revival-flash');
        revivalEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for glorious rebirth effects
    ensureGloriousRebirthCSS() {
        if (document.getElementById('gloriousRebirthCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'gloriousRebirthCSS';
        style.textContent = `
            @keyframes gloriousRebirthLightBeam {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.6) rotate(0deg);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0) rotate(30deg);
                }
                80% {
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.2) rotate(300deg);
                }
                100% { 
                    top: var(--target-y);
                    opacity: 0.3;
                    transform: translate(-50%, -50%) scale(1.4) rotate(360deg);
                }
            }
            
            @keyframes gloriousRebirthRevivalFlash {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                25% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.6) rotate(90deg); 
                }
                50% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.8) rotate(180deg); 
                }
                75% { 
                    opacity: 0.7; 
                    transform: translate(-50%, -50%) scale(2.0) rotate(270deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(2.2) rotate(360deg); 
                }
            }
            
            /* Enhanced visual effects */
            .glorious-rebirth-light-beam {
                will-change: transform, opacity, top;
            }
            
            .glorious-rebirth-revival-flash {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, targetData) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        const targetName = targetData.hero.name;
        
        // Main spell effect log
        const logMessage = `✨ ${this.displayName} brings ${targetName} back from defeat with divine light!`;
        
        this.battleManager.addCombatLog(logMessage, logType);
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, revivalHp, maxHp } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        const logMessage = `✨ ${displayName} brings ${targetName} back from defeat with divine light!`;
        this.battleManager.addCombatLog(logMessage, logType);
        
        // Update target hero on guest side
        const targetLocalSide = (data.targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetHeroes = targetLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const targetHero = targetHeroes[data.targetPosition];
        
        if (targetHero) {
            // Revive the hero
            targetHero.alive = true;
            targetHero.currentHp = revivalHp;
            
            // Update visual state
            this.updateHeroVisualState(targetLocalSide, data.targetPosition, targetHero);
            
            // Apply heal-block status effect on guest side
            if (this.battleManager.statusEffectsManager) {
                this.battleManager.statusEffectsManager.applyStatusEffect(targetHero, 'heal-block', 99);
            }
        }
        
        // Create mock objects for guest-side animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        const mockTarget = {
            hero: targetHero || { name: targetName },
            position: data.targetPosition
        };
        
        // Play visual effects on guest side
        this.playGloriousRebirthAnimationGuestSide(mockCaster, mockTarget);
        
        console.log(`✨ GUEST: ${casterName} used ${displayName} to revive ${targetName} (${revivalHp}/${maxHp} HP)`);
    }

    // Guest-side animation (visual only, revival already handled)
    async playGloriousRebirthAnimationGuestSide(caster, target) {
        const targetElement = this.battleManager.getHeroElement(target.hero.side || 'player', target.position);
        
        if (!targetElement) {
            console.error('Could not find target element for guest glorious rebirth animation');
            return;
        }
        
        // Create light beam effects
        this.createLightBeamEffect(targetElement);
        
        // Animation timing
        const lightBeamTime = 400;
        const revivalTime = 200;
        
        // Wait for light beams to reach target
        await this.battleManager.delay(lightBeamTime);
        
        // Create revival flash effect
        this.createRevivalFlashEffect(targetElement);
        
        // Wait for revival effect to complete
        await this.battleManager.delay(revivalTime);
        
        // Cleanup
        this.cleanupGloriousRebirthEffects();
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
            description: 'Revives a random defeated ally hero at 50% max HP with divine light beams. Can only be used once per hero per battle.',
            effectFormula: 'Revive at 50% max HP + 99 heal-block stacks',
            targetType: 'random_dead_ally',
            spellSchool: 'Divine',
            restrictions: 'Requires defeated ally with 0 heal-block stacks. Once per hero per battle.'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupGloriousRebirthEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('gloriousRebirthCSS');
        if (css) css.remove();
        
        console.log('✨ Glorious Rebirth spell cleaned up');
    }
}

// Export for use in spell system
export default GloriousRebirthSpell;