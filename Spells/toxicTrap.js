// ./Spells/toxicTrap.js - ToxicTrap Spell Implementation

export class ToxicTrapSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'ToxicTrap';
        this.displayName = 'Toxic Trap';
        
        console.log('🍄 ToxicTrap spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute ToxicTrap spell effect
    async executeSpell(caster, spell) {
        console.log(`🍄 ${caster.name} casting ${this.displayName}!`);
        
        // Apply toxicTrap buff to caster
        this.applyToxicTrapBuff(caster);
        
        // Log the spell effect
        this.logSpellEffect(caster);
        
        // Play toxicTrap visual effect
        await this.playToxicTrapAnimation(caster);
        
        console.log(`🍄 ${this.displayName} completed!`);
    }

    // ============================================
    // TOXIC TRAP BUFF MANAGEMENT
    // ============================================

    // Apply toxicTrap buff to the caster
    applyToxicTrapBuff(caster) {
        // Get current toxicTrap stacks
        let currentStacks = this.getToxicTrapStacks(caster);
        
        // Add one more stack
        currentStacks += 1;
        
        // Update or add toxicTrap status effect
        this.setToxicTrapStacks(caster, currentStacks);
        
        // Calculate poison damage for display
        const decayLevel = caster.hasAbility('DecayMagic') 
            ? caster.getAbilityStackCount('DecayMagic') 
            : 0;
        const poisonStacks = currentStacks * (1 + Math.floor(decayLevel / 2));
        
        console.log(`🍄 ${caster.name} now has ${currentStacks} ToxicTrap stacks (${poisonStacks} poison stacks to attackers)`);
        
        // Store the turn when this toxicTrap was cast
        const toxicTrapEffect = caster.statusEffects.find(effect => effect.name === 'toxicTrap');
        if (toxicTrapEffect) {
            toxicTrapEffect.lastCastTurn = this.battleManager.currentTurn;
        }
        
        // Send toxicTrap update to guest for synchronization
        this.battleManager.sendBattleUpdate('toxic_trap_applied', {
            heroAbsoluteSide: caster.absoluteSide,
            heroPosition: caster.position,
            heroName: caster.name,
            newStacks: currentStacks,
            poisonStacks: poisonStacks,
            castTurn: this.battleManager.currentTurn,
            timestamp: Date.now()
        });
    }

    // Get current toxicTrap stacks on a hero
    getToxicTrapStacks(hero) {
        const toxicTrapEffect = hero.statusEffects.find(effect => effect.name === 'toxicTrap');
        return toxicTrapEffect ? toxicTrapEffect.stacks : 0;
    }

    // Set toxicTrap stacks on a hero
    setToxicTrapStacks(hero, stacks) {
        let toxicTrapEffect = hero.statusEffects.find(effect => effect.name === 'toxicTrap');
        
        if (toxicTrapEffect) {
            // Update existing toxicTrap
            toxicTrapEffect.stacks = stacks;
            toxicTrapEffect.lastUpdated = Date.now();
        } else {
            // Add new toxicTrap effect
            hero.addStatusEffect({
                name: 'toxicTrap',
                stacks: stacks,
                type: 'buff',
                permanent: true, // Lasts for the entire battle
                description: `Toxic trap with ${stacks} stack(s)`,
                appliedAt: Date.now(),
                lastUpdated: Date.now(),
                lastCastTurn: this.battleManager.currentTurn
            });
        }
    }

    // ============================================
    // TOXIC TRAP TRIGGER SYSTEM
    // ============================================

    // Check if an attack should trigger toxic trap
    shouldTriggerToxicTrap(attacker, defender) {
        // Get defender's toxicTrap effect
        const toxicTrapEffect = defender.statusEffects.find(effect => effect.name === 'toxicTrap');
        
        if (!toxicTrapEffect || toxicTrapEffect.stacks <= 0) {
            return false;
        }
        
        return true;
    }

    // Calculate poison stacks to apply to attacker
    calculatePoisonStacks(defender) {
        const toxicTrapStacks = this.getToxicTrapStacks(defender);
        const decayLevel = defender.hasAbility('DecayMagic') 
            ? defender.getAbilityStackCount('DecayMagic') 
            : 0;
        
        const poisonStacks = toxicTrapStacks * (1 + Math.floor(decayLevel / 2));
        
        console.log(`🍄 ToxicTrap trigger: ${toxicTrapStacks} stacks × (1 + floor(${decayLevel}/2)) = ${poisonStacks} poison stacks`);
        
        return poisonStacks;
    }

    // Apply toxic trap effect to attacker (called from battleManager)
    applyToxicTrapEffect(attacker, defender) {
        const poisonStacks = this.calculatePoisonStacks(defender);
        
        if (poisonStacks <= 0) return false;
        
        // Apply poison to attacker using the status effects manager
        if (this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.applyStatusEffect(attacker, 'poisoned', poisonStacks);
        } else {
            console.error('StatusEffectsManager not available for toxic trap effect');
            return false;
        }
        
        // Log the toxic trap effect
        const attackerSide = attacker.side;
        const logType = attackerSide === 'player' ? 'error' : 'success';
        
        this.battleManager.addCombatLog(
            `🍄 ${attacker.name} triggers ${defender.name}'s Toxic Trap and receives ${poisonStacks} poison stacks!`,
            logType
        );
        
        // Create toxic trap trigger visual effect
        this.createToxicTrapTriggerEffect(attacker, defender);
        
        return true; // Attack was blocked
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the toxicTrap casting animation and create persistent mushrooms
    async playToxicTrapAnimation(caster) {
        console.log(`🍄 Playing ToxicTrap animation for ${caster.name}...`);
        
        // Get caster element
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        
        if (!casterElement) {
            console.error('Could not find caster element for toxicTrap animation');
            return;
        }
        
        // Create casting flash effect
        await this.createCastingFlashEffect(casterElement);
        
        // Create or update persistent mushrooms
        this.createPersistentMushrooms(casterElement, caster);
        
        // Ensure CSS exists
        this.ensureToxicTrapCSS();
    }

    // Create casting flash effect
    async createCastingFlashEffect(casterElement) {
        const flashEffect = document.createElement('div');
        flashEffect.className = 'toxic-trap-casting-flash';
        flashEffect.innerHTML = '🍄💨🍄';
        
        flashEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 300;
            pointer-events: none;
            animation: toxicTrapCastingFlash ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(128, 0, 128, 1),
                0 0 40px rgba(150, 0, 150, 0.8),
                0 0 60px rgba(200, 0, 200, 0.6);
        `;
        
        casterElement.appendChild(flashEffect);
        
        await this.battleManager.delay(600);
        
        if (flashEffect && flashEffect.parentNode) {
            flashEffect.remove();
        }
    }

    // Create persistent mushroom effects
    createPersistentMushrooms(heroElement, hero) {
        // Remove existing mushrooms if any
        const existingMushrooms = heroElement.querySelectorAll('.toxic-trap-mushroom');
        existingMushrooms.forEach(mushroom => mushroom.remove());
        
        // Get current toxicTrap stacks for mushroom count
        const stacks = this.getToxicTrapStacks(hero);
        
        if (stacks <= 0) return;
        
        // Get hero dimensions for random positioning
        const heroCard = heroElement.querySelector('.battle-hero-card');
        const cardWidth = heroCard ? heroCard.offsetWidth : 80;
        const cardHeight = heroCard ? heroCard.offsetHeight : 100;
        
        // Create mushrooms - one per stack
        for (let i = 0; i < stacks; i++) {
            const mushroom = document.createElement('div');
            mushroom.className = 'toxic-trap-mushroom';
            mushroom.dataset.mushroomIndex = i;
            mushroom.innerHTML = '🍄';
            
            // Generate random position (but deterministic based on stack index for consistency)
            const seed = (hero.name.charCodeAt(0) + i * 123) % 1000;
            const randomX = (seed % 60) + 10; // 10% to 70% of width
            const randomY = (((seed * 7) % 80) + 10); // 10% to 90% of height
            
            // Calculate intensity based on total stacks
            const intensity = Math.min(stacks * 0.2 + 0.5, 1.0); // 0.5 to 1.0 opacity
            
            mushroom.style.cssText = `
                position: absolute;
                top: ${randomY}%;
                left: ${randomX}%;
                transform: translate(-50%, -50%);
                font-size: 16px;
                z-index: 250;
                pointer-events: none;
                animation: toxicTrapMushroomPulse ${2 + Math.random()}s ease-in-out infinite;
                animation-delay: ${Math.random() * 2}s;
                opacity: ${intensity};
                text-shadow: 
                    0 0 8px rgba(128, 0, 128, ${intensity * 0.8}),
                    0 0 16px rgba(150, 50, 150, ${intensity * 0.6});
                filter: hue-rotate(${i * 30}deg) saturate(1.2);
            `;
            
            heroElement.appendChild(mushroom);
        }
        
        console.log(`🍄 Created ${stacks} persistent mushrooms for ${hero.name}`);
    }

    // Create toxic trap trigger effect when an attack is blocked
    createToxicTrapTriggerEffect(attacker, defender) {
        const attackerElement = this.battleManager.getHeroElement(attacker.side, attacker.position);
        const defenderElement = this.battleManager.getHeroElement(defender.side, defender.position);
        
        // Create poison cloud on attacker
        if (attackerElement) {
            const poisonCloud = document.createElement('div');
            poisonCloud.className = 'toxic-trap-trigger-effect';
            poisonCloud.innerHTML = '☠️💨🍄';
            
            poisonCloud.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 36px;
                z-index: 400;
                pointer-events: none;
                animation: toxicTrapTrigger ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
                text-shadow: 
                    0 0 15px rgba(128, 0, 128, 1),
                    0 0 30px rgba(150, 50, 150, 0.8);
            `;
            
            attackerElement.appendChild(poisonCloud);
            
            setTimeout(() => {
                if (poisonCloud && poisonCloud.parentNode) {
                    poisonCloud.remove();
                }
            }, this.battleManager.getSpeedAdjustedDelay(800));
        }
        
        // Create defensive flash on defender
        if (defenderElement) {
            const defenseFlash = document.createElement('div');
            defenseFlash.className = 'toxic-trap-defense-flash';
            defenseFlash.innerHTML = '🛡️🍄';
            
            defenseFlash.style.cssText = `
                position: absolute;
                top: 30%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 32px;
                z-index: 350;
                pointer-events: none;
                animation: toxicTrapDefense ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
                text-shadow: 
                    0 0 12px rgba(0, 255, 100, 1),
                    0 0 24px rgba(50, 255, 150, 0.8);
            `;
            
            defenderElement.appendChild(defenseFlash);
            
            setTimeout(() => {
                if (defenseFlash && defenseFlash.parentNode) {
                    defenseFlash.remove();
                }
            }, this.battleManager.getSpeedAdjustedDelay(600));
        }
    }

    // Restore all toxicTrap visual effects (called on reconnection)
    restoreToxicTrapVisuals() {
        console.log('🍄 Restoring ToxicTrap visual effects...');
        
        // Restore for all heroes on both sides
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                
                // Only restore if hero exists, is alive, and has toxicTrap stacks
                if (hero && hero.alive && this.getToxicTrapStacks(hero) > 0) {
                    const heroElement = this.battleManager.getHeroElement(side, position);
                    if (heroElement) {
                        this.createPersistentMushrooms(heroElement, hero);
                        console.log(`🍄 Restored mushrooms for ${hero.name} (${this.getToxicTrapStacks(hero)} stacks)`);
                    }
                }
            });
        });
    }

    // Remove toxicTrap effects when a hero dies
    removeToxicTrapOnDeath(hero, side, position) {
        console.log(`🍄 Removing toxicTrap effects for deceased ${hero.name}`);
        
        // Clear toxicTrap status effects
        hero.statusEffects = hero.statusEffects.filter(effect => effect.name !== 'toxicTrap');
        
        // Remove visual mushrooms
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (heroElement) {
            const existingMushrooms = heroElement.querySelectorAll('.toxic-trap-mushroom');
            existingMushrooms.forEach(mushroom => mushroom.remove());
            console.log(`🍄 Removed mushrooms for deceased ${hero.name}`);
        }
    }

    // Clean up toxicTrap effects
    cleanupToxicTrapEffects() {
        // Remove any remaining toxicTrap effects
        const toxicTrapElements = document.querySelectorAll('.toxic-trap-mushroom, .toxic-trap-casting-flash, .toxic-trap-trigger-effect, .toxic-trap-defense-flash');
        toxicTrapElements.forEach(element => element.remove());
    }

    // Ensure CSS animations exist for toxicTrap effects
    ensureToxicTrapCSS() {
        if (document.getElementById('toxicTrapCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'toxicTrapCSS';
        style.textContent = `
            @keyframes toxicTrapCastingFlash {
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
            
            @keyframes toxicTrapMushroomPulse {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    opacity: 0.8;
                }
                25% { 
                    transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
                    opacity: 0.6;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(0.9) rotate(-3deg);
                    opacity: 1;
                }
                75% { 
                    transform: translate(-50%, -50%) scale(1.05) rotate(3deg);
                    opacity: 0.7;
                }
            }
            
            @keyframes toxicTrapTrigger {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(90deg); 
                }
                70% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(270deg); 
                }
            }
            
            @keyframes toxicTrapDefense {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3); 
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
            
            /* Enhanced visual effects */
            .toxic-trap-mushroom {
                will-change: transform, opacity;
            }
            
            .toxic-trap-casting-flash,
            .toxic-trap-trigger-effect,
            .toxic-trap-defense-flash {
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
        
        const currentStacks = this.getToxicTrapStacks(caster);
        const decayLevel = caster.hasAbility('DecayMagic') 
            ? caster.getAbilityStackCount('DecayMagic') 
            : 0;
        const poisonStacks = currentStacks * (1 + Math.floor(decayLevel / 2));
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `🍄 ${caster.name} casts ${this.displayName}! Now has ${currentStacks} stack(s) (${poisonStacks} poison to attackers)`,
            logType
        );
        
        if (decayLevel > 0) {
            this.battleManager.addCombatLog(
                `☠️ DecayMagic level ${decayLevel} enhances the toxic trap's potency!`,
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
            effectType: 'toxic_trap_buff',
            toxicTrapStacks: currentStacks,
            poisonStacks: poisonStacks,
            decayLevel: decayLevel,
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle toxicTrap applied on guest side
    handleGuestToxicTrapApplied(data) {
        const { heroAbsoluteSide, heroPosition, heroName, newStacks, poisonStacks } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🍄 ${heroName} gains Toxic Trap! Now has ${newStacks} stack(s) (${poisonStacks} poison to attackers)`,
            logType
        );
        
        // Get the hero and apply the buff
        const targetLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetHeroes = targetLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const hero = targetHeroes[heroPosition];
        if (hero) {
            // Apply the toxicTrap buff
            this.setToxicTrapStacks(hero, newStacks);
            
            // Create visual effect
            const heroElement = this.battleManager.getHeroElement(targetLocalSide, heroPosition);
            if (heroElement) {
                this.createPersistentMushrooms(heroElement, hero);
            }
        }
        
        console.log(`🍄 GUEST: ${heroName} received toxicTrap buff (${newStacks} stacks)`);
    }

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, effectType, toxicTrapStacks, poisonStacks } = data;
        
        if (effectType === 'toxic_trap_buff') {
            // Determine log type based on caster side
            const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
            const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const logType = casterLocalSide === 'player' ? 'success' : 'error';
            
            // Add to battle log
            this.battleManager.addCombatLog(
                `🍄 ${casterName} casts ${displayName}! Now has ${toxicTrapStacks} stack(s) (${poisonStacks} poison to attackers)`,
                logType
            );
            
            // Apply visual effect
            const targetLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const targetHeroes = targetLocalSide === 'player' 
                ? this.battleManager.playerHeroes 
                : this.battleManager.opponentHeroes;
            
            const hero = targetHeroes[data.casterPosition];
            if (hero) {
                // Ensure hero has the toxicTrap buff
                this.setToxicTrapStacks(hero, toxicTrapStacks);
                
                // Create casting animation (without the buff application)
                const heroElement = this.battleManager.getHeroElement(targetLocalSide, data.casterPosition);
                if (heroElement) {
                    this.createCastingFlashEffect(heroElement);
                    this.createPersistentMushrooms(heroElement, hero);
                }
            }
        }
        
        console.log(`🍄 GUEST: ${casterName} used ${displayName}`);
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
            description: 'Creates a toxic trap that poisons attackers instead of taking damage',
            damageFormula: 'Poison: ToxicTrap stacks × (1 + floor(DecayMagic level / 2))',
            targetType: 'self_buff',
            spellSchool: 'DecayMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupToxicTrapEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('toxicTrapCSS');
        if (css) css.remove();
        
        console.log('🍄 ToxicTrap spell cleaned up');
    }
}

// Export for use in spell system
export default ToxicTrapSpell;