// ./Spells/fireshield.js - Fireshield Spell Implementation

export class FireshieldSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Fireshield';
        this.displayName = 'Fireshield';
        
        console.log('🛡️ Fireshield spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Fireshield spell effect
    async executeSpell(caster, spell) {
        console.log(`🛡️ ${caster.name} casting ${this.displayName}!`);
        
        // Apply fireshield buff to caster
        this.applyFireshieldBuff(caster);
        
        // Log the spell effect
        this.logSpellEffect(caster);
        
        // Play fireshield visual effect
        await this.playFireshieldAnimation(caster);
        
        console.log(`🛡️ ${this.displayName} completed!`);
    }

    // ============================================
    // FIRESHIELD BUFF MANAGEMENT
    // ============================================

    // Apply fireshield buff to the caster
    applyFireshieldBuff(caster) {
        // Get current fireshield stacks
        let currentStacks = this.getFireshieldStacks(caster);
        
        // Add one more stack
        currentStacks += 1;
        
        // Update or add fireshield status effect
        this.setFireshieldStacks(caster, currentStacks);
        
        // Calculate recoil damage for display
        const destructionLevel = caster.hasAbility('DestructionMagic') 
            ? caster.getAbilityStackCount('DestructionMagic') 
            : 0;
        const recoilDamage = 20 * destructionLevel * currentStacks;
        
        console.log(`🛡️ ${caster.name} now has ${currentStacks} Fireshield stacks (${recoilDamage} recoil damage)`);
        
        // Store the turn when this fireshield was cast (for timing mechanics)
        const fireshieldEffect = caster.statusEffects.find(effect => effect.name === 'fireshield');
        if (fireshieldEffect) {
            fireshieldEffect.lastCastTurn = this.battleManager.currentTurn;
        }
        
        // Send fireshield update to guest for synchronization
        this.battleManager.sendBattleUpdate('fireshield_applied', {
            heroAbsoluteSide: caster.absoluteSide,
            heroPosition: caster.position,
            heroName: caster.name,
            newStacks: currentStacks,
            recoilDamage: recoilDamage,
            castTurn: this.battleManager.currentTurn,
            timestamp: Date.now()
        });
    }

    // Get current fireshield stacks on a hero
    getFireshieldStacks(hero) {
        const fireshieldEffect = hero.statusEffects.find(effect => effect.name === 'fireshield');
        return fireshieldEffect ? fireshieldEffect.stacks : 0;
    }

    // Set fireshield stacks on a hero
    setFireshieldStacks(hero, stacks) {
        let fireshieldEffect = hero.statusEffects.find(effect => effect.name === 'fireshield');
        
        if (fireshieldEffect) {
            // Update existing fireshield
            fireshieldEffect.stacks = stacks;
            fireshieldEffect.lastUpdated = Date.now();
        } else {
            // Add new fireshield effect
            hero.addStatusEffect({
                name: 'fireshield',
                stacks: stacks,
                type: 'buff',
                permanent: true, // Lasts for the entire battle
                description: `Fire shield with ${stacks} stack(s)`,
                appliedAt: Date.now(),
                lastUpdated: Date.now(),
                lastCastTurn: this.battleManager.currentTurn
            });
        }
    }

    // ============================================
    // RECOIL DAMAGE SYSTEM
    // ============================================

    // Check if an attack should trigger fireshield recoil
    shouldTriggerRecoil(attacker, defender, currentTurn) {
        // Get defender's fireshield effect
        const fireshieldEffect = defender.statusEffects.find(effect => effect.name === 'fireshield');
        
        if (!fireshieldEffect || fireshieldEffect.stacks <= 0) {
            return false;
        }
        
        // Check timing: recoil only applies to attacks that happen AFTER fireshield was cast
        // If fireshield was cast this turn, attacks this turn don't trigger recoil yet
        if (fireshieldEffect.lastCastTurn >= currentTurn) {
            console.log(`🛡️ Fireshield was cast this turn (${fireshieldEffect.lastCastTurn}), no recoil yet`);
            return false;
        }
        
        return true;
    }

    // Calculate recoil damage
    calculateRecoilDamage(defender) {
        const fireshieldStacks = this.getFireshieldStacks(defender);
        const destructionLevel = defender.hasAbility('DestructionMagic') 
            ? defender.getAbilityStackCount('DestructionMagic') 
            : 0;
        
        const recoilDamage = 20 * destructionLevel * fireshieldStacks;
        
        console.log(`🛡️ Fireshield recoil: ${fireshieldStacks} stacks × ${destructionLevel} DestructionMagic × 20 = ${recoilDamage} damage`);
        
        return recoilDamage;
    }

    // Apply recoil damage to attacker
    applyRecoilDamage(attacker, defender, recoilDamage) {
        if (recoilDamage <= 0) return;
        
        // Apply damage to attacker
        this.battleManager.authoritative_applyDamage({
            target: attacker,
            damage: recoilDamage,
            newHp: Math.max(0, attacker.currentHp - recoilDamage),
            died: (attacker.currentHp - recoilDamage) <= 0
        });
        
        // Log the recoil effect
        const attackerSide = attacker.side;
        const logType = attackerSide === 'player' ? 'error' : 'success';
        
        this.battleManager.addCombatLog(
            `🔥 ${attacker.name} takes ${recoilDamage} recoil damage from ${defender.name}'s Fireshield!`,
            logType
        );
        
        // Create recoil visual effect
        this.createRecoilEffect(attacker);
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the fireshield casting animation and create persistent fire ring
    async playFireshieldAnimation(caster) {
        console.log(`🛡️ Playing Fireshield animation for ${caster.name}...`);
        
        // Get caster element
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        
        if (!casterElement) {
            console.error('Could not find caster element for fireshield animation');
            return;
        }
        
        // Create casting flash effect
        await this.createCastingFlashEffect(casterElement);
        
        // Create or update persistent fire ring
        this.createPersistentFireRing(casterElement, caster);
        
        // Ensure CSS exists
        this.ensureFireshieldCSS();
    }

    // Create casting flash effect
    async createCastingFlashEffect(casterElement) {
        const flashEffect = document.createElement('div');
        flashEffect.className = 'fireshield-casting-flash';
        flashEffect.innerHTML = '🔥✨🔥';
        
        flashEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 300;
            pointer-events: none;
            animation: fireshieldCastingFlash ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(255, 100, 0, 1),
                0 0 40px rgba(255, 150, 0, 0.8),
                0 0 60px rgba(255, 200, 0, 0.6);
        `;
        
        casterElement.appendChild(flashEffect);
        
        await this.battleManager.delay(600);
        
        if (flashEffect && flashEffect.parentNode) {
            flashEffect.remove();
        }
    }

    // Create persistent fire ring effect
    createPersistentFireRing(heroElement, hero) {
        // Remove existing fire ring if any
        const existingRing = heroElement.querySelector('.fireshield-ring');
        if (existingRing) {
            existingRing.remove();
        }
        
        // Get current fireshield stacks for visual intensity
        const stacks = this.getFireshieldStacks(hero);
        
        if (stacks <= 0) return;
        
        // Create fire ring container
        const fireRing = document.createElement('div');
        fireRing.className = 'fireshield-ring';
        fireRing.dataset.stacks = stacks;
        
        // Calculate ring intensity based on stacks
        const intensity = Math.min(stacks * 0.3 + 0.4, 1.0); // 0.4 to 1.0 opacity
        const ringSize = Math.min(90 + stacks * 10, 130); // 90px to 130px
        
        fireRing.style.cssText = `
            position: absolute;
            top: 20%; /* Top third of the hero sprite */
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${ringSize}px;
            height: ${ringSize}px;
            border: 3px solid rgba(255, 100, 0, ${intensity});
            border-radius: 50%;
            z-index: 250;
            pointer-events: none;
            animation: fireshieldRingPulse 2s ease-in-out infinite;
            box-shadow: 
                0 0 15px rgba(255, 100, 0, ${intensity * 0.8}),
                inset 0 0 15px rgba(255, 150, 0, ${intensity * 0.6});
            background: radial-gradient(
                circle at center,
                rgba(255, 200, 0, ${intensity * 0.1}) 0%,
                rgba(255, 100, 0, ${intensity * 0.2}) 50%,
                transparent 70%
            );
        `;
        
        // Add fire particles ON the ring's edge
        for (let i = 0; i < Math.min(stacks * 2 + 4, 12); i++) {
            const particle = document.createElement('div');
            particle.className = 'fireshield-particle';
            particle.innerHTML = '🔥';
            
            const angle = (i / (stacks * 2 + 4)) * 360;
            const radius = ringSize / 2 - 8; // Position ON the ring edge
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;
            
            particle.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(calc(-50% + ${x}px), calc(-50% + ${y}px));
                font-size: 14px;
                animation: fireshieldParticleOnEdge ${1.5 + Math.random()}s ease-in-out infinite;
                animation-delay: ${Math.random() * 2}s;
                opacity: ${intensity * 0.9};
                z-index: 5;
            `;
            
            // Store the radius and angle for the animation
            particle.style.setProperty('--radius', `${radius}px`);
            particle.style.setProperty('--angle', `${angle}deg`);
            
            fireRing.appendChild(particle);
        }
        
        heroElement.appendChild(fireRing);
        
        console.log(`🛡️ Created persistent fire ring for ${hero.name} with ${stacks} stacks`);
    }

    // Create recoil visual effect when attacker takes damage
    createRecoilEffect(attacker) {
        const attackerElement = this.battleManager.getHeroElement(attacker.side, attacker.position);
        if (!attackerElement) return;
        
        const recoilEffect = document.createElement('div');
        recoilEffect.className = 'fireshield-recoil-effect';
        recoilEffect.innerHTML = '🔥💥🔥';
        
        recoilEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 36px;
            z-index: 400;
            pointer-events: none;
            animation: fireshieldRecoilFlash ${this.battleManager.getSpeedAdjustedDelay(500)}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(255, 50, 0, 1),
                0 0 30px rgba(255, 100, 0, 0.8);
        `;
        
        attackerElement.appendChild(recoilEffect);
        
        setTimeout(() => {
            if (recoilEffect && recoilEffect.parentNode) {
                recoilEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(500));
    }

    // Restore all fireshield visual effects (called on reconnection)
    restoreFireshieldVisuals() {
        console.log('🛡️ Restoring Fireshield visual effects...');
        
        // Restore for all heroes on both sides
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                
                // Only restore if hero exists, is alive, and has fireshield stacks
                if (hero && hero.alive && this.getFireshieldStacks(hero) > 0) {
                    const heroElement = this.battleManager.getHeroElement(side, position);
                    if (heroElement) {
                        this.createPersistentFireRing(heroElement, hero);
                        console.log(`🛡️ Restored fire ring for ${hero.name} (${this.getFireshieldStacks(hero)} stacks)`);
                    }
                }
            });
        });
    }

    // Remove fireshield effects when a hero dies
    removeFireshieldOnDeath(hero, side, position) {
        console.log(`🛡️ Removing fireshield effects for deceased ${hero.name}`);
        
        // Clear fireshield status effects
        hero.statusEffects = hero.statusEffects.filter(effect => effect.name !== 'fireshield');
        
        // Remove visual fire ring
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (heroElement) {
            const existingRing = heroElement.querySelector('.fireshield-ring');
            if (existingRing) {
                existingRing.remove();
                console.log(`🛡️ Removed fire ring for deceased ${hero.name}`);
            }
        }
    }

    // Clean up fireshield effects
    cleanupFireshieldEffects() {
        // Remove any remaining fireshield effects
        const fireshieldElements = document.querySelectorAll('.fireshield-ring, .fireshield-casting-flash, .fireshield-recoil-effect');
        fireshieldElements.forEach(element => element.remove());
    }

    // Ensure CSS animations exist for fireshield effects
    ensureFireshieldCSS() {
        if (document.getElementById('fireshieldCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'fireshieldCSS';
        style.textContent = `
            @keyframes fireshieldCastingFlash {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(120deg); 
                }
                70% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(240deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.8) rotate(360deg); 
                }
            }
            
            @keyframes fireshieldRingPulse {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.1);
                    opacity: 0.7;
                }
            }
            
            @keyframes fireshieldParticleOnEdge {
                0%, 100% { 
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1);
                    filter: brightness(1);
                }
                25% { 
                    opacity: 0.6;
                    transform: translate(-50%, -50%) scale(1.1);
                    filter: brightness(1.3);
                }
                50% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(0.9);
                    filter: brightness(0.8);
                }
                75% { 
                    opacity: 0.5;
                    transform: translate(-50%, -50%) scale(1.2);
                    filter: brightness(1.4);
                }
            }
            
            @keyframes fireshieldParticle {
                0%, 100% { 
                    opacity: 0.8;
                    transform: translate(var(--x, -50%), var(--y, -50%)) scale(1) rotate(0deg);
                }
                50% { 
                    opacity: 0.4;
                    transform: translate(var(--x, -50%), var(--y, -50%)) scale(1.2) rotate(180deg);
                }
            }
            
            @keyframes fireshieldRecoilFlash {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(90deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg); 
                }
            }
            
            /* Enhanced visual effects */
            .fireshield-ring {
                will-change: transform, opacity;
            }
            
            .fireshield-casting-flash,
            .fireshield-recoil-effect {
                will-change: transform, opacity;
            }
            
            .fireshield-particle {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        const currentStacks = this.getFireshieldStacks(caster);
        const destructionLevel = caster.hasAbility('DestructionMagic') 
            ? caster.getAbilityStackCount('DestructionMagic') 
            : 0;
        const recoilDamage = 20 * destructionLevel * currentStacks;
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `🛡️ ${caster.name} casts ${this.displayName}! Now has ${currentStacks} stack(s) (${recoilDamage} recoil damage)`,
            logType
        );
        
        if (destructionLevel > 0) {
            this.battleManager.addCombatLog(
                `🔥 DestructionMagic level ${destructionLevel} amplifies the fireshield's power!`,
                'info'
            );
        }
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            effectType: 'fireshield_buff',
            fireshieldStacks: currentStacks,
            recoilDamage: recoilDamage,
            destructionLevel: destructionLevel,
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle fireshield applied on guest side
    handleGuestFireshieldApplied(data) {
        const { heroAbsoluteSide, heroPosition, heroName, newStacks, recoilDamage } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🛡️ ${heroName} gains Fireshield! Now has ${newStacks} stack(s) (${recoilDamage} recoil damage)`,
            logType
        );
        
        // Get the hero and apply the buff
        const targetLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetHeroes = targetLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const hero = targetHeroes[heroPosition];
        if (hero) {
            // Apply the fireshield buff
            this.setFireshieldStacks(hero, newStacks);
            
            // Create visual effect
            const heroElement = this.battleManager.getHeroElement(targetLocalSide, heroPosition);
            if (heroElement) {
                this.createPersistentFireRing(heroElement, hero);
            }
        }
        
        console.log(`🛡️ GUEST: ${heroName} received fireshield buff (${newStacks} stacks)`);
    }

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, effectType, fireshieldStacks, recoilDamage } = data;
        
        if (effectType === 'fireshield_buff') {
            // Determine log type based on caster side
            const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
            const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const logType = casterLocalSide === 'player' ? 'success' : 'error';
            
            // Add to battle log
            this.battleManager.addCombatLog(
                `🛡️ ${casterName} casts ${displayName}! Now has ${fireshieldStacks} stack(s) (${recoilDamage} recoil damage)`,
                logType
            );
            
            // Apply visual effect
            const targetLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const targetHeroes = targetLocalSide === 'player' 
                ? this.battleManager.playerHeroes 
                : this.battleManager.opponentHeroes;
            
            const hero = targetHeroes[data.casterPosition];
            if (hero) {
                // Ensure hero has the fireshield buff
                this.setFireshieldStacks(hero, fireshieldStacks);
                
                // Create casting animation (without the buff application)
                const heroElement = this.battleManager.getHeroElement(targetLocalSide, data.casterPosition);
                if (heroElement) {
                    this.createCastingFlashEffect(heroElement);
                    this.createPersistentFireRing(heroElement, hero);
                }
            }
        }
        
        console.log(`🛡️ GUEST: ${casterName} used ${displayName}`);
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
            description: 'Creates a protective fire shield that deals recoil damage to attackers',
            damageFormula: 'Recoil: 20 × DestructionMagic level × Fireshield stacks',
            targetType: 'self_buff',
            spellSchool: 'DestructionMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupFireshieldEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('fireshieldCSS');
        if (css) css.remove();
        
        console.log('🛡️ Fireshield spell cleaned up');
    }
}

// Export for use in spell system
export default FireshieldSpell;