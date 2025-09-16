// ./Spells/frostRune.js - FrostRune Spell Implementation

export class FrostRuneSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'FrostRune';
        this.displayName = 'Frost Rune';
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute FrostRune spell effect
    async executeSpell(caster, spell) {
        // Apply frostRune buff to caster
        this.applyFrostRuneBuff(caster);
        
        // Log the spell effect
        this.logSpellEffect(caster);
        
        // Play frostRune visual effect
        await this.playFrostRuneAnimation(caster);
    }

    // ============================================
    // FROST RUNE BUFF MANAGEMENT
    // ============================================

    // Apply frostRune buff to the caster
    applyFrostRuneBuff(caster) {
        // Get current frostRune stacks
        let currentStacks = this.getFrostRuneStacks(caster);
        
        // Add one more stack
        currentStacks += 1;
        
        // Update or add frostRune status effect
        this.setFrostRuneStacks(caster, currentStacks);
        
        // Calculate frozen stacks for display (with Gon bonus)
        const baseStacks = currentStacks;
        const gonBonus = caster.name === 'Gon' ? 1 : 0;
        const totalFrozenStacks = baseStacks + gonBonus;
        
        // Store the turn when this frostRune was cast
        const frostRuneEffect = caster.statusEffects.find(effect => effect.name === 'frostRune');
        if (frostRuneEffect) {
            frostRuneEffect.lastCastTurn = this.battleManager.currentTurn;
        }
        
        // Send frostRune update to guest for synchronization
        this.battleManager.sendBattleUpdate('frost_rune_applied', {
            heroAbsoluteSide: caster.absoluteSide,
            heroPosition: caster.position,
            heroName: caster.name,
            newStacks: currentStacks,
            frozenStacks: totalFrozenStacks,
            gonBonus: gonBonus,
            castTurn: this.battleManager.currentTurn,
            timestamp: Date.now()
        });
    }

    // Get current frostRune stacks on a hero
    getFrostRuneStacks(hero) {
        const frostRuneEffect = hero.statusEffects.find(effect => effect.name === 'frostRune');
        return frostRuneEffect ? frostRuneEffect.stacks : 0;
    }

    // Set frostRune stacks on a hero
    setFrostRuneStacks(hero, stacks) {
        let frostRuneEffect = hero.statusEffects.find(effect => effect.name === 'frostRune');
        
        if (frostRuneEffect) {
            // Update existing frostRune
            frostRuneEffect.stacks = stacks;
            frostRuneEffect.lastUpdated = Date.now();
        } else {
            // Add new frostRune effect
            hero.addStatusEffect({
                name: 'frostRune',
                stacks: stacks,
                type: 'buff',
                permanent: true, // Lasts for the entire battle
                description: `Frost rune with ${stacks} stack(s)`,
                appliedAt: Date.now(),
                lastUpdated: Date.now(),
                lastCastTurn: this.battleManager.currentTurn
            });
        }
    }

    // ============================================
    // FROST RUNE TRIGGER SYSTEM
    // ============================================

    // Check if an attack should trigger frost rune
    shouldTriggerFrostRune(attacker, defender) {
        // Get defender's frostRune effect
        const frostRuneEffect = defender.statusEffects.find(effect => effect.name === 'frostRune');
        
        if (!frostRuneEffect || frostRuneEffect.stacks <= 0) {
            return false;
        }
        
        return true;
    }

    // Calculate frozen stacks to apply to attacker
    calculateFrozenStacks(defender) {
        const frostRuneStacks = this.getFrostRuneStacks(defender);
        
        // Base frozen stacks equal to frostRune stacks
        let frozenStacks = frostRuneStacks;
        
        // Add Gon bonus if defender is Gon
        if (defender.name === 'Gon') {
            frozenStacks += 1;
        }
        
        return frozenStacks;
    }

    // Apply frost rune effect to attacker (called from battleManager)
    applyFrostRuneEffect(attacker, defender) {
        const frozenStacks = this.calculateFrozenStacks(defender);
        
        if (frozenStacks <= 0) return false;
        
        // Apply frozen to attacker using the status effects manager
        if (this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.applyStatusEffect(attacker, 'frozen', frozenStacks);
        } else {
            return false;
        }
        
        // Log the frost rune effect
        const attackerSide = attacker.side;
        const logType = attackerSide === 'player' ? 'error' : 'success';
        
        const gonMessage = defender.name === 'Gon' ? ' (enhanced by Gon)' : '';
        this.battleManager.addCombatLog(
            `❄️ ${attacker.name} triggers ${defender.name}'s Frost Rune${gonMessage} and receives ${frozenStacks} frozen stacks!`,
            logType
        );
        
        // Create frost rune trigger visual effect
        this.createFrostRuneTriggerEffect(attacker, defender);
        
        return true; // Attack was blocked
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the frostRune casting animation and create persistent snowflakes
    async playFrostRuneAnimation(caster) {
        // Get caster element
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        
        if (!casterElement) {
            return;
        }
        
        // Create casting flash effect
        await this.createCastingFlashEffect(casterElement);
        
        // Create or update persistent snowflakes
        this.createPersistentSnowflakes(casterElement, caster);
        
        // Ensure CSS exists
        this.ensureFrostRuneCSS();
    }

    // Create casting flash effect
    async createCastingFlashEffect(casterElement) {
        const flashEffect = document.createElement('div');
        flashEffect.className = 'frost-rune-casting-flash';
        flashEffect.innerHTML = '❄️💨❄️';
        
        flashEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 300;
            pointer-events: none;
            animation: frostRuneCastingFlash ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(100, 200, 255, 1),
                0 0 40px rgba(150, 220, 255, 0.8),
                0 0 60px rgba(200, 240, 255, 0.6);
        `;
        
        casterElement.appendChild(flashEffect);
        
        await this.battleManager.delay(600);
        
        if (flashEffect && flashEffect.parentNode) {
            flashEffect.remove();
        }
    }

    // Create persistent snowflake effects
    createPersistentSnowflakes(heroElement, hero) {
        // Remove existing snowflakes if any
        const existingSnowflakes = heroElement.querySelectorAll('.frost-rune-snowflake');
        existingSnowflakes.forEach(snowflake => snowflake.remove());
        
        // Get current frostRune stacks for snowflake count
        const stacks = this.getFrostRuneStacks(hero);
        
        if (stacks <= 0) return;
        
        // Get hero dimensions for random positioning
        const heroCard = heroElement.querySelector('.battle-hero-card');
        const cardWidth = heroCard ? heroCard.offsetWidth : 80;
        const cardHeight = heroCard ? heroCard.offsetHeight : 100;
        
        // Create snowflakes - one per stack
        for (let i = 0; i < stacks; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'frost-rune-snowflake';
            snowflake.dataset.snowflakeIndex = i;
            snowflake.innerHTML = '❄️';
            
            // Generate random position (but deterministic based on stack index for consistency)
            const seed = (hero.name.charCodeAt(0) + i * 137) % 1000;
            const randomX = (seed % 60) + 10; // 10% to 70% of width
            const randomY = (((seed * 7) % 80) + 10); // 10% to 90% of height
            
            // Calculate intensity based on total stacks
            const intensity = Math.min(stacks * 0.2 + 0.5, 1.0); // 0.5 to 1.0 opacity
            
            snowflake.style.cssText = `
                position: absolute;
                top: ${randomY}%;
                left: ${randomX}%;
                transform: translate(-50%, -50%);
                font-size: 16px;
                z-index: 250;
                pointer-events: none;
                animation: frostRuneSnowflakePulse ${2 + Math.random()}s ease-in-out infinite;
                animation-delay: ${Math.random() * 2}s;
                opacity: ${intensity};
                text-shadow: 
                    0 0 8px rgba(100, 200, 255, ${intensity * 0.8}),
                    0 0 16px rgba(150, 220, 255, ${intensity * 0.6});
                filter: hue-rotate(${i * 20}deg) saturate(1.3);
            `;
            
            heroElement.appendChild(snowflake);
        }
    }

    // Create frost rune trigger effect when an attack is blocked
    createFrostRuneTriggerEffect(attacker, defender) {
        const attackerElement = this.battleManager.getHeroElement(attacker.side, attacker.position);
        const defenderElement = this.battleManager.getHeroElement(defender.side, defender.position);
        
        // Create ice cloud on attacker
        if (attackerElement) {
            const iceCloud = document.createElement('div');
            iceCloud.className = 'frost-rune-trigger-effect';
            iceCloud.innerHTML = '🧊💨❄️';
            
            iceCloud.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 36px;
                z-index: 400;
                pointer-events: none;
                animation: frostRuneTrigger ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
                text-shadow: 
                    0 0 15px rgba(100, 200, 255, 1),
                    0 0 30px rgba(150, 220, 255, 0.8);
            `;
            
            attackerElement.appendChild(iceCloud);
            
            setTimeout(() => {
                if (iceCloud && iceCloud.parentNode) {
                    iceCloud.remove();
                }
            }, this.battleManager.getSpeedAdjustedDelay(800));
        }
        
        // Create defensive flash on defender
        if (defenderElement) {
            const defenseFlash = document.createElement('div');
            defenseFlash.className = 'frost-rune-defense-flash';
            defenseFlash.innerHTML = '🛡️❄️';
            
            defenseFlash.style.cssText = `
                position: absolute;
                top: 30%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 32px;
                z-index: 350;
                pointer-events: none;
                animation: frostRuneDefense ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
                text-shadow: 
                    0 0 12px rgba(100, 255, 255, 1),
                    0 0 24px rgba(150, 255, 255, 0.8);
            `;
            
            defenderElement.appendChild(defenseFlash);
            
            setTimeout(() => {
                if (defenseFlash && defenseFlash.parentNode) {
                    defenseFlash.remove();
                }
            }, this.battleManager.getSpeedAdjustedDelay(600));
        }
    }

    // Restore all frostRune visual effects (called on reconnection)
    restoreFrostRuneVisuals() {
        // Restore for all heroes on both sides
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                
                // Only restore if hero exists, is alive, and has frostRune stacks
                if (hero && hero.alive && this.getFrostRuneStacks(hero) > 0) {
                    const heroElement = this.battleManager.getHeroElement(side, position);
                    if (heroElement) {
                        this.createPersistentSnowflakes(heroElement, hero);
                    }
                }
            });
        });
    }

    // Remove frostRune effects when a hero dies
    removeFrostRuneOnDeath(hero, side, position) {
        // Clear frostRune status effects
        hero.statusEffects = hero.statusEffects.filter(effect => effect.name !== 'frostRune');
        
        // Remove visual snowflakes
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (heroElement) {
            const existingSnowflakes = heroElement.querySelectorAll('.frost-rune-snowflake');
            existingSnowflakes.forEach(snowflake => snowflake.remove());
        }
    }

    // Clean up frostRune effects
    cleanupFrostRuneEffects() {
        // Remove any remaining frostRune effects
        const frostRuneElements = document.querySelectorAll('.frost-rune-snowflake, .frost-rune-casting-flash, .frost-rune-trigger-effect, .frost-rune-defense-flash');
        frostRuneElements.forEach(element => element.remove());
    }

    // Ensure CSS animations exist for frostRune effects
    ensureFrostRuneCSS() {
        if (document.getElementById('frostRuneCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'frostRuneCSS';
        style.textContent = `
            @keyframes frostRuneCastingFlash {
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
            
            @keyframes frostRuneSnowflakePulse {
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
            
            @keyframes frostRuneTrigger {
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
            
            @keyframes frostRuneDefense {
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
            .frost-rune-snowflake {
                will-change: transform, opacity;
            }
            
            .frost-rune-casting-flash,
            .frost-rune-trigger-effect,
            .frost-rune-defense-flash {
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
        
        const currentStacks = this.getFrostRuneStacks(caster);
        const gonBonus = caster.name === 'Gon' ? 1 : 0;
        const frozenStacks = currentStacks + gonBonus;
        
        // Main spell effect log
        const gonMessage = gonBonus > 0 ? ' (enhanced by Gon)' : '';
        this.battleManager.addCombatLog(
            `❄️ ${caster.name} casts ${this.displayName}${gonMessage}! Now has ${currentStacks} stack(s) (${frozenStacks} frozen to attackers)`,
            logType
        );
        
        if (gonBonus > 0) {
            this.battleManager.addCombatLog(
                `🥶 Gon's frost mastery enhances the rune's freezing power!`,
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
            effectType: 'frost_rune_buff',
            frostRuneStacks: currentStacks,
            frozenStacks: frozenStacks,
            gonBonus: gonBonus,
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle frostRune applied on guest side
    handleGuestFrostRuneApplied(data) {
        const { heroAbsoluteSide, heroPosition, heroName, newStacks, frozenStacks, gonBonus } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        const gonMessage = gonBonus > 0 ? ' (enhanced by Gon)' : '';
        this.battleManager.addCombatLog(
            `❄️ ${heroName} gains Frost Rune${gonMessage}! Now has ${newStacks} stack(s) (${frozenStacks} frozen to attackers)`,
            logType
        );
        
        // Get the hero and apply the buff
        const targetLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetHeroes = targetLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const hero = targetHeroes[heroPosition];
        if (hero) {
            // Apply the frostRune buff
            this.setFrostRuneStacks(hero, newStacks);
            
            // Create visual effect
            const heroElement = this.battleManager.getHeroElement(targetLocalSide, heroPosition);
            if (heroElement) {
                this.createPersistentSnowflakes(heroElement, hero);
            }
        }
    }

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, effectType, frostRuneStacks, frozenStacks, gonBonus } = data;
        
        if (effectType === 'frost_rune_buff') {
            // Determine log type based on caster side
            const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
            const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const logType = casterLocalSide === 'player' ? 'success' : 'error';
            
            // Add to battle log
            const gonMessage = gonBonus > 0 ? ' (enhanced by Gon)' : '';
            this.battleManager.addCombatLog(
                `❄️ ${casterName} casts ${displayName}${gonMessage}! Now has ${frostRuneStacks} stack(s) (${frozenStacks} frozen to attackers)`,
                logType
            );
            
            // Apply visual effect
            const targetLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const targetHeroes = targetLocalSide === 'player' 
                ? this.battleManager.playerHeroes 
                : this.battleManager.opponentHeroes;
            
            const hero = targetHeroes[data.casterPosition];
            if (hero) {
                // Ensure hero has the frostRune buff
                this.setFrostRuneStacks(hero, frostRuneStacks);
                
                // Create casting animation (without the buff application)
                const heroElement = this.battleManager.getHeroElement(targetLocalSide, data.casterPosition);
                if (heroElement) {
                    this.createCastingFlashEffect(heroElement);
                    this.createPersistentSnowflakes(heroElement, hero);
                }
            }
        }
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
            description: 'Creates a frost rune that freezes attackers instead of taking damage',
            damageFormula: 'Frozen: FrostRune stacks (+1 if caster is Gon)',
            targetType: 'self_buff',
            spellSchool: 'IceMagic'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupFrostRuneEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('frostRuneCSS');
        if (css) css.remove();
    }
}

// Export for use in spell system
export default FrostRuneSpell;