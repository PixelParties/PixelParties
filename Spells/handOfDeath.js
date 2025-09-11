// ./Spells/handOfDeath.js - Hand of Death Spell Implementation

export class HandOfDeathSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'HandOfDeath';
        this.displayName = 'Hand of Death';
        
        // Death counter thresholds
        this.DEATH_COUNTER_THRESHOLD = 3;
        this.CHANNELING_ANIMATION_TIME = 2000; // 2 seconds for channeling
        this.FINAL_EFFECT_ANIMATION_TIME = 3000; // 3 seconds for final darkness
        
        // Inject CSS styles
        this.injectHandOfDeathStyles();
        
        console.log('💀 Hand of Death spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Hand of Death spell effect
    async executeSpell(caster, spell) {
        console.log(`💀 ${caster.name} casting ${this.displayName}!`);
        
        // Initialize death counters if not present
        if (caster.deathCounters === undefined) {
            caster.deathCounters = 0;
        }
        
        // Add a death counter
        caster.deathCounters++;
        
        this.battleManager.addCombatLog(
            `💀 ${caster.name} begins channeling dark energy... (${caster.deathCounters}/3 Death Counters)`,
            caster.side === 'player' ? 'success' : 'error'
        );
        
        // Send counter update to guest
        this.sendDeathCounterUpdate(caster);
        
        // Play channeling animation
        await this.playChannelingAnimation(caster);
        
        // Check if we've reached the threshold
        if (caster.deathCounters >= this.DEATH_COUNTER_THRESHOLD) {
            // Reset counters first
            caster.deathCounters = 0;
            this.sendDeathCounterUpdate(caster);
            
            // Execute the final death effect
            await this.executeFinalDeathEffect(caster);
        }
        
        console.log(`💀 ${this.displayName} completed!`);
    }

    // ============================================
    // CHANNELING SYSTEM
    // ============================================

    // Check if hero should channel instead of normal actions
    shouldChannel(hero) {
        return hero.deathCounters > 0 && hero.deathCounters < this.DEATH_COUNTER_THRESHOLD;
    }

    // Execute channeling turn (called from battle flow)
    async executeChannelingTurn(hero) {
        if (!this.battleManager.isAuthoritative) return;
        
        console.log(`💀 ${hero.name} continues channeling Hand of Death...`);
        
        // Add another death counter
        hero.deathCounters++;
        
        this.battleManager.addCombatLog(
            `💀 ${hero.name} channels deeper into darkness... (${hero.deathCounters}/3 Death Counters)`,
            hero.side === 'player' ? 'success' : 'error'
        );
        
        // Send counter update to guest
        this.sendDeathCounterUpdate(hero);
        
        // Play channeling animation
        await this.playChannelingAnimation(hero);
        
        // Check if we've reached the threshold
        if (hero.deathCounters >= this.DEATH_COUNTER_THRESHOLD) {
            // Reset counters
            hero.deathCounters = 0;
            this.sendDeathCounterUpdate(hero);
            
            // Execute the final death effect
            await this.executeFinalDeathEffect(hero);
        }
    }

    // Check if hero action should be overridden by channeling (called from combatManager)
    async checkAndExecuteChanneling(heroActor, position) {
        if (!this.battleManager.isAuthoritative) return false;
        
        const hero = heroActor.data;
        if (this.shouldChannel(hero)) {
            // Hero must channel instead of normal actions
            await this.executeChannelingTurn(hero);
            return true; // Channeling was executed, skip normal actions
        }
        
        return false; // No channeling, proceed with normal actions
    }

    // ============================================
    // FINAL DEATH EFFECT
    // ============================================

    // Execute the final death effect - target enemy with highest HP
    async executeFinalDeathEffect(caster) {
        console.log(`💀 ${caster.name} unleashes the Hand of Death!`);
        
        // Find enemy hero with highest current HP
        const target = this.findHighestHpEnemy(caster);
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💀 Hand of Death finds no living enemies to claim!`,
                'info'
            );
            return;
        }
        
        this.battleManager.addCombatLog(
            `💀 The Hand of Death reaches for ${target.name}!`,
            caster.side === 'player' ? 'success' : 'error'
        );
        
        // Send final effect to guest
        this.sendFinalDeathEffect(caster, target);
        
        // Play final darkness animation
        await this.playFinalDarknessAnimation(target);
        
        // Instantly defeat the target
        this.instantlyDefeatTarget(target, caster);
        
        this.battleManager.addCombatLog(
            `💀 ${target.name} has been claimed by the Hand of Death!`,
            target.side === 'player' ? 'error' : 'success'
        );
    }

    // Find enemy hero with highest current HP
    findHighestHpEnemy(caster) {
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' ? 
            this.battleManager.playerHeroes : 
            this.battleManager.opponentHeroes;
        
        let highestHpHero = null;
        let highestHp = 0;
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive && hero.currentHp > highestHp) {
                highestHp = hero.currentHp;
                highestHpHero = hero;
            }
        });
        
        return highestHpHero;
    }

    // Instantly defeat the target hero
    instantlyDefeatTarget(target, caster) {
        if (!target || !target.alive) return;
        
        const oldHp = target.currentHp;
        
        // Set HP to 0 and mark as defeated
        target.currentHp = 0;
        target.alive = false;
        
        // Clear all shields
        if (target.clearShield) {
            target.clearShield();
        }
        
        // Apply defeated visual state
        this.battleManager.handleHeroDeath(target);
        
        // Update health bar
        this.battleManager.updateHeroHealthBar(target.side, target.position, 0, target.maxHp);
        
        // Send damage update to guest (using existing system)
        this.battleManager.sendBattleUpdate('damage_applied', {
            targetAbsoluteSide: target.absoluteSide,
            targetPosition: target.position,
            damage: oldHp,
            oldHp: oldHp,
            newHp: 0,
            maxHp: target.maxHp,
            died: true,
            targetName: target.name,
            damageSource: 'HandOfDeath'
        });
        
        // Record the kill
        if (this.battleManager.killTracker && caster) {
            this.battleManager.killTracker.recordKill(caster, target, 'hero', 'HandOfDeath');
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play channeling animation above the caster
    async playChannelingAnimation(caster) {
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        if (!casterElement) return;
        
        const rect = casterElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const channelingEffect = document.createElement('div');
        channelingEffect.className = 'hand-of-death-channeling';
        channelingEffect.innerHTML = `
            <div class="dark-energy-swirl">💀</div>
            <div class="dark-energy-particles">
                <span class="particle">⚫</span>
                <span class="particle">⚫</span>
                <span class="particle">⚫</span>
                <span class="particle">⚫</span>
                <span class="particle">⚫</span>
            </div>
        `;
        
        channelingEffect.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY - 50}px;
            transform: translate(-50%, -50%);
            z-index: 1500;
            pointer-events: none;
            animation: handOfDeathChanneling ${this.battleManager.getSpeedAdjustedDelay(this.CHANNELING_ANIMATION_TIME)}ms ease-out forwards;
        `;
        
        document.body.appendChild(channelingEffect);
        
        // Wait for animation to complete
        await this.battleManager.delay(this.CHANNELING_ANIMATION_TIME);
        
        // Remove effect
        if (channelingEffect.parentNode) {
            channelingEffect.remove();
        }
    }

    // Play final darkness animation on the target
    async playFinalDarknessAnimation(target) {
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        if (!targetElement) return;
        
        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const darknessEffect = document.createElement('div');
        darknessEffect.className = 'hand-of-death-final-darkness';
        darknessEffect.innerHTML = `
            <div class="darkness-vortex">
                <div class="death-skull">💀</div>
                <div class="darkness-waves">
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                </div>
                <div class="death-hands">
                    <span class="hand">🫴</span>
                    <span class="hand">🫴</span>
                    <span class="hand">🫴</span>
                    <span class="hand">🫴</span>
                </div>
            </div>
        `;
        
        darknessEffect.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: handOfDeathFinalDarkness ${this.battleManager.getSpeedAdjustedDelay(this.FINAL_EFFECT_ANIMATION_TIME)}ms ease-out forwards;
        `;
        
        document.body.appendChild(darknessEffect);
        
        // Wait for animation to complete
        await this.battleManager.delay(this.FINAL_EFFECT_ANIMATION_TIME);
        
        // Remove effect
        if (darknessEffect.parentNode) {
            darknessEffect.remove();
        }
    }

    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================

    // Send death counter update to guest
    sendDeathCounterUpdate(caster) {
        this.battleManager.sendBattleUpdate('hand_of_death_counter_update', {
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            casterName: caster.name,
            deathCounters: caster.deathCounters || 0,
            timestamp: Date.now()
        });
    }

    // Send final death effect to guest
    sendFinalDeathEffect(caster, target) {
        this.battleManager.sendBattleUpdate('hand_of_death_final_effect', {
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            casterName: caster.name,
            targetAbsoluteSide: target.absoluteSide,
            targetPosition: target.position,
            targetName: target.name,
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle death counter update on guest side
    handleGuestDeathCounterUpdate(data) {
        const { casterAbsoluteSide, casterPosition, casterName, deathCounters } = data;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀 ${casterName} channels dark energy... (${deathCounters}/3 Death Counters)`,
            casterLocalSide === 'player' ? 'success' : 'error'
        );
        
        // Update the hero's death counters on guest side
        const heroes = casterLocalSide === 'player' ? 
            this.battleManager.playerHeroes : 
            this.battleManager.opponentHeroes;
        const caster = heroes[casterPosition];
        if (caster) {
            caster.deathCounters = deathCounters;
        }
        
        // Play channeling animation on guest side
        this.playGuestChannelingAnimation(casterLocalSide, casterPosition);
    }

    // Handle final death effect on guest side
    handleGuestFinalDeathEffect(data) {
        const { casterName, targetName, targetAbsoluteSide, targetPosition } = data;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀 The Hand of Death reaches for ${targetName}!`,
            'warning'
        );
        
        // Play final darkness animation on guest side
        this.playGuestFinalDarknessAnimation(targetLocalSide, targetPosition);
    }

    // Play channeling animation on guest side
    async playGuestChannelingAnimation(side, position) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;
        
        await this.playChannelingAnimation({ side, position });
    }

    // Play final darkness animation on guest side
    async playGuestFinalDarknessAnimation(side, position) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;
        
        await this.playFinalDarknessAnimation({ side, position });
    }

    // Handle guest spell effect (main entry point for guest-side updates)
    handleGuestSpellEffect(data) {
        const { spellName } = data;
        
        if (spellName !== this.spellName) return;
        
        // This method can be extended if needed for additional guest-side effects
        console.log(`💀 GUEST: Hand of Death effect processed`);
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
            description: 'Channel dark energy over multiple turns. After 3 Death Counters, instantly defeat the enemy hero with the highest HP.',
            effectFormula: '3 turns to channel, then instant death to highest HP enemy',
            targetType: 'channeled_instant_death',
            spellSchool: 'DecayMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        // Remove all Hand of Death effects
        const effects = document.querySelectorAll('.hand-of-death-channeling, .hand-of-death-final-darkness');
        effects.forEach(effect => effect.remove());
        
        // Remove CSS if needed
        const css = document.getElementById('handOfDeathCSS');
        if (css) css.remove();
        
        console.log('💀 Hand of Death spell cleaned up');
    }

    // ============================================
    // CSS INJECTION
    // ============================================

    // Inject CSS styles for Hand of Death effects
    injectHandOfDeathStyles() {
        if (document.getElementById('handOfDeathCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'handOfDeathCSS';
        style.textContent = `
            /* Hand of Death Channeling Animation */
            @keyframes handOfDeathChanneling {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                20% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0);
                }
                80% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.5);
                }
            }
            
            /* Final Darkness Animation */
            @keyframes handOfDeathFinalDarkness {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                25% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(2.0);
                }
                75% { 
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(3.0);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(4.0);
                }
            }
            
            /* Dark Energy Swirl */
            .dark-energy-swirl {
                font-size: 48px;
                animation: darkEnergyRotate 2s linear infinite;
                text-shadow: 
                    0 0 20px rgba(128, 0, 128, 1),
                    0 0 40px rgba(75, 0, 130, 0.8),
                    0 0 60px rgba(138, 43, 226, 0.6);
            }
            
            @keyframes darkEnergyRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Dark Energy Particles */
            .dark-energy-particles {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
            
            .dark-energy-particles .particle {
                position: absolute;
                font-size: 12px;
                opacity: 0.8;
                animation: particleFloat 3s ease-in-out infinite;
            }
            
            .dark-energy-particles .particle:nth-child(1) {
                top: 10px;
                left: 10px;
                animation-delay: 0s;
            }
            
            .dark-energy-particles .particle:nth-child(2) {
                top: 20px;
                right: 10px;
                animation-delay: 0.6s;
            }
            
            .dark-energy-particles .particle:nth-child(3) {
                bottom: 10px;
                left: 20px;
                animation-delay: 1.2s;
            }
            
            .dark-energy-particles .particle:nth-child(4) {
                bottom: 20px;
                right: 20px;
                animation-delay: 1.8s;
            }
            
            .dark-energy-particles .particle:nth-child(5) {
                top: 50%;
                left: 50%;
                animation-delay: 2.4s;
            }
            
            @keyframes particleFloat {
                0%, 100% { 
                    transform: translateY(0px) scale(1);
                    opacity: 0.8;
                }
                50% { 
                    transform: translateY(-20px) scale(1.2);
                    opacity: 0.4;
                }
            }
            
            /* Darkness Vortex */
            .darkness-vortex {
                position: relative;
                width: 200px;
                height: 200px;
            }
            
            .death-skull {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 64px;
                z-index: 10;
                animation: skullPulse 1s ease-in-out infinite alternate;
                text-shadow: 
                    0 0 30px rgba(255, 0, 0, 1),
                    0 0 60px rgba(139, 0, 0, 0.8),
                    0 0 90px rgba(75, 0, 0, 0.6);
            }
            
            @keyframes skullPulse {
                0% { transform: translate(-50%, -50%) scale(1); }
                100% { transform: translate(-50%, -50%) scale(1.3); }
            }
            
            /* Darkness Waves */
            .darkness-waves {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 100%;
                height: 100%;
            }
            
            .darkness-waves .wave {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 50px;
                height: 50px;
                border: 3px solid rgba(128, 0, 128, 0.6);
                border-radius: 50%;
                animation: waveExpand 2s ease-out infinite;
            }
            
            .darkness-waves .wave:nth-child(1) { animation-delay: 0s; }
            .darkness-waves .wave:nth-child(2) { animation-delay: 0.7s; }
            .darkness-waves .wave:nth-child(3) { animation-delay: 1.4s; }
            
            @keyframes waveExpand {
                0% {
                    width: 50px;
                    height: 50px;
                    opacity: 0.8;
                    border-color: rgba(128, 0, 128, 0.8);
                }
                100% {
                    width: 300px;
                    height: 300px;
                    opacity: 0;
                    border-color: rgba(75, 0, 130, 0);
                }
            }
            
            /* Death Hands */
            .death-hands {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
            
            .death-hands .hand {
                position: absolute;
                font-size: 32px;
                opacity: 0.9;
                animation: handReach 2.5s ease-out infinite;
                text-shadow: 0 0 15px rgba(139, 0, 0, 0.8);
            }
            
            .death-hands .hand:nth-child(1) {
                top: 0;
                left: 50%;
                animation-delay: 0s;
            }
            
            .death-hands .hand:nth-child(2) {
                top: 50%;
                right: 0;
                animation-delay: 0.6s;
            }
            
            .death-hands .hand:nth-child(3) {
                bottom: 0;
                left: 50%;
                animation-delay: 1.2s;
            }
            
            .death-hands .hand:nth-child(4) {
                top: 50%;
                left: 0;
                animation-delay: 1.8s;
            }
            
            @keyframes handReach {
                0% {
                    transform: scale(0.5) rotate(0deg);
                    opacity: 0;
                }
                50% {
                    transform: scale(1.2) rotate(180deg);
                    opacity: 0.9;
                }
                100% {
                    transform: scale(0.8) rotate(360deg);
                    opacity: 0;
                }
            }
            
            /* Enhanced visual effects */
            .hand-of-death-channeling,
            .hand-of-death-final-darkness {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Export for use in spell system
export default HandOfDeathSpell;