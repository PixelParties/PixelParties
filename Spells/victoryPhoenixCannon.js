// ./Spells/victoryPhoenixCannon.js - Victory Phoenix Cannon Spell Implementation

class VictoryPhoenixCannonSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'VictoryPhoenixCannon';
        this.displayName = 'Victory Phoenix Cannon';
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Victory Phoenix Cannon spell effect
    async executeSpell(caster, spell) {
        // Find first living CutePhoenix from caster's allies
        const phoenixData = this.findLivingCutePhoenix(caster);
        
        if (!phoenixData) {
            return;
        }

        // Find target hero (nearest enemy hero, ignoring creatures)
        const target = this.findTargetHero(caster);
        
        if (!target) {
            return;
        }

        // Log the spell casting
        this.logSpellCasting(caster, phoenixData, target);
        
        // STEP 1: Create flame aura around the CutePhoenix
        await this.createFlameAura(phoenixData.phoenix, phoenixData.ownerHero);
        
        // STEP 2: Ram the CutePhoenix into target with animation
        await this.executePhoenixRamming(phoenixData, target, caster);
        
        // STEP 3: Apply damage to primary target (300 to hero)
        await this.applyPrimaryDamage(target, caster);
        
        // STEP 4: Apply area damage to all enemy creatures (100 each)
        await this.applyAreaDamageToEnemyCreatures(target.hero, caster);
        
        // STEP 5: Defeat the CutePhoenix that was "fired"
        await this.defeatFiredPhoenix(phoenixData);
    }

    // ============================================
    // SPELL PREREQUISITES
    // ============================================

    // Check if spell can be cast (used by spell system before rolling)
    canCast(caster) {
        return this.canCastSpell(caster);
    }

    // Check if spell can be cast (requires living CutePhoenix)
    canCastSpell(caster) {
        const alliedHeroes = caster.side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Check all allied heroes for living CutePhoenix creatures
        for (const position of ['left', 'center', 'right']) {
            const hero = alliedHeroes[position];
            if (hero && hero.alive && hero.creatures) {
                const livingCutePhoenixes = hero.creatures.filter(creature => 
                    creature.alive && creature.name === 'CutePhoenix'
                );
                if (livingCutePhoenixes.length > 0) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // ============================================
    // PHOENIX AND TARGET FINDING
    // ============================================

    // Find first living CutePhoenix from caster's allies
    findLivingCutePhoenix(caster) {
        const alliedHeroes = caster.side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        for (const position of ['left', 'center', 'right']) {
            const hero = alliedHeroes[position];
            if (hero && hero.alive && hero.creatures) {
                for (let i = 0; i < hero.creatures.length; i++) {
                    const creature = hero.creatures[i];
                    if (creature.alive && creature.name === 'CutePhoenix') {
                        return {
                            phoenix: creature,
                            ownerHero: hero,
                            ownerPosition: position,
                            creatureIndex: i
                        };
                    }
                }
            }
        }
        
        return null;
    }

    // Find target hero (ignores creatures, like ranged attacks)
    findTargetHero(caster) {
        // Use existing targeting logic that ignores creatures
        const target = this.battleManager.combatManager.authoritative_findTargetIgnoringCreatures(
            caster.position, 
            caster.side
        );
        
        return target;
    }

    // ============================================
    // VISUAL EFFECTS AND ANIMATIONS
    // ============================================

    // Create flame aura around the CutePhoenix
    async createFlameAura(phoenix, ownerHero) {
        const phoenixElement = this.findPhoenixElement(ownerHero, phoenix);
        if (!phoenixElement) {
            return;
        }
        
        const flameAura = document.createElement('div');
        flameAura.className = 'victory-phoenix-aura';
        flameAura.innerHTML = '🔥🔥🔥';
        
        flameAura.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 40px;
            z-index: 400;
            pointer-events: none;
            animation: victoryPhoenixAura ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-in-out;
            text-shadow: 
                0 0 20px rgba(255, 140, 0, 1),
                0 0 40px rgba(255, 69, 0, 0.8),
                0 0 60px rgba(255, 215, 0, 0.6);
            filter: drop-shadow(0 0 8px rgba(255, 140, 0, 1));
        `;
        
        phoenixElement.appendChild(flameAura);
        
        // Ensure CSS exists
        this.ensureVictoryPhoenixCannonCSS();
        
        await this.battleManager.delay(800);
        
        // Remove flame aura
        if (flameAura && flameAura.parentNode) {
            flameAura.remove();
        }
    }

    // Execute phoenix ramming animation and mechanics
    async executePhoenixRamming(phoenixData, target, caster) {
        const phoenixElement = this.findPhoenixElement(phoenixData.ownerHero, phoenixData.phoenix);
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!phoenixElement || !targetElement) {
            return;
        }
        
        // Store original position for return animation
        const originalTransform = phoenixElement.style.transform || '';
        
        // Calculate positions for ram animation
        const phoenixRect = phoenixElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const deltaX = targetRect.left + targetRect.width/2 - (phoenixRect.left + phoenixRect.width/2);
        const deltaY = targetRect.top + targetRect.height/2 - (phoenixRect.top + phoenixRect.height/2);
        
        // Add flame trail during ram
        phoenixElement.style.filter = 'brightness(1.5) drop-shadow(0 0 15px rgba(255, 140, 0, 0.9))';
        
        // Ram animation - phoenix charges at target
        phoenixElement.style.transition = `transform ${this.battleManager.getSpeedAdjustedDelay(400)}ms ease-out`;
        phoenixElement.style.transform = `${originalTransform} translate(${deltaX}px, ${deltaY}px) scale(1.2)`;
        phoenixElement.style.zIndex = '500';
        
        await this.battleManager.delay(400);
        
        // Create impact effect
        this.createPhoenixImpact(targetElement);
        
        // Return animation
        phoenixElement.style.transition = `transform ${this.battleManager.getSpeedAdjustedDelay(400)}ms ease-in`;
        phoenixElement.style.transform = originalTransform;
        
        await this.battleManager.delay(400);
        
        // Remove effects
        phoenixElement.style.filter = '';
        phoenixElement.style.zIndex = '';
    }

    // Create phoenix impact effect on target
    createPhoenixImpact(targetElement) {
        const impact = document.createElement('div');
        impact.className = 'victory-phoenix-impact';
        impact.innerHTML = '🔥💥🔥';
        
        impact.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 50px;
            z-index: 450;
            pointer-events: none;
            animation: victoryPhoenixImpact ${this.battleManager.getSpeedAdjustedDelay(300)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(255, 140, 0, 1),
                0 0 40px rgba(255, 69, 0, 0.8);
        `;
        
        targetElement.appendChild(impact);
        
        // Remove impact after animation
        setTimeout(() => {
            if (impact && impact.parentNode) {
                impact.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(300));
    }

    // Find the visual element for a specific phoenix creature
    findPhoenixElement(ownerHero, phoenix) {
        const heroSide = ownerHero.side;
        const heroPosition = ownerHero.position;
        const creatureIndex = ownerHero.creatures.indexOf(phoenix);
        
        if (creatureIndex === -1) {
            return null;
        }
        
        const phoenixElement = document.querySelector(
            `.${heroSide}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        return phoenixElement;
    }

    // ============================================
    // DAMAGE APPLICATION
    // ============================================

    // Apply primary damage to target hero (300 damage)
    async applyPrimaryDamage(target, caster) {
        const primaryDamage = 300;
        
        // Check resistance for primary damage
        const isResisted = this.battleManager.resistanceManager && 
            this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
        
        if (isResisted) {
            this.battleManager.addCombatLog(`🛡️ ${target.hero.name} resisted the phoenix cannon!`, 'info');
        } else {
            // Apply damage using the correct battle manager method
            await this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: primaryDamage,
                newHp: Math.max(0, target.hero.currentHp - primaryDamage),
                died: (target.hero.currentHp - primaryDamage) <= 0
            }, { source: 'spell', attacker: caster, spellName: this.spellName });
        }
    }

    // Apply area damage to all enemy creatures (100 each)
    async applyAreaDamageToEnemyCreatures(targetHero, caster) {
        const areaDamage = 100;
        
        // Find all enemy heroes to damage their creatures
        const enemyHeroes = targetHero.side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const damagePromises = [];
        let totalCreaturesDamaged = 0;
        
        for (const position of ['left', 'center', 'right']) {
            const hero = enemyHeroes[position];
            if (hero && hero.alive && hero.creatures) {
                const livingCreatures = hero.creatures.filter(creature => creature.alive);
                
                for (const creature of livingCreatures) {
                    damagePromises.push(
                        this.battleManager.authoritative_applyDamageToCreature({
                            target: creature,
                            heroOwner: hero,
                            damage: areaDamage,
                            newHp: Math.max(0, creature.currentHp - areaDamage),
                            died: (creature.currentHp - areaDamage) <= 0
                        }, { source: 'spell', attacker: caster, spellName: this.spellName })
                    );
                    totalCreaturesDamaged++;
                }
            }
        }
        
        if (totalCreaturesDamaged > 0) {
            this.battleManager.addCombatLog(
                `🔥💥 Phoenix explosion damages ${totalCreaturesDamaged} enemy creatures for ${areaDamage} each!`,
                caster.side === 'player' ? 'success' : 'error'
            );
            
            await Promise.all(damagePromises);
        } else {
            this.battleManager.addCombatLog(
                `🔥💥 Phoenix explosion finds no enemy creatures to damage!`,
                'info'
            );
        }
    }

    // Defeat the phoenix that was "fired"
    async defeatFiredPhoenix(phoenixData) {
        const { phoenix, ownerHero, creatureIndex } = phoenixData;
        
        // Set phoenix as defeated
        phoenix.alive = false;
        phoenix.currentHp = 0;
        
        // Clear all status effects from the defeated phoenix
        if (this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.clearAllStatusEffects(phoenix);
        }
        
        // Update visual state
        this.updateDefeatedPhoenixVisuals(phoenixData);
        
        // Add combat log
        this.battleManager.addCombatLog(
            `💀 ${phoenix.name} is consumed by the Victory Phoenix Cannon!`,
            ownerHero.side === 'player' ? 'warning' : 'info'
        );
        
        // Trigger death effects if any (like normal creature death)
        if (this.battleManager.triggerCreatureDeathEffects) {
            await this.battleManager.triggerCreatureDeathEffects(
                phoenix, 
                ownerHero, 
                null, // No attacker for self-defeat
                { source: 'spell', spellName: this.spellName }
            );
        }
        
        // Update creature displays
        this.battleManager.updateCreatureVisuals(ownerHero.side, ownerHero.position, ownerHero.creatures);
        
        await this.battleManager.delay(200);
    }

    // Update visual state for defeated phoenix
    updateDefeatedPhoenixVisuals(phoenixData) {
        const phoenixElement = this.findPhoenixElement(phoenixData.ownerHero, phoenixData.phoenix);
        if (!phoenixElement) return;
        
        // Apply defeated visual state
        phoenixElement.classList.add('defeated');
        
        const sprite = phoenixElement.querySelector('.creature-sprite');
        if (sprite) {
            sprite.style.filter = 'grayscale(100%)';
            sprite.style.opacity = '0.5';
        }
        
        // Remove health bar and HP text
        const healthBar = phoenixElement.querySelector('.creature-health-bar');
        const hpText = phoenixElement.querySelector('.creature-hp-text');
        const counterDisplay = phoenixElement.querySelector('.creature-counter-display');
        
        if (healthBar) healthBar.remove();
        if (hpText) hpText.remove();
        if (counterDisplay) counterDisplay.remove();
    }

    // ============================================
    // STYLES AND CSS
    // ============================================

    // Ensure CSS animations exist for victory phoenix cannon effects
    ensureVictoryPhoenixCannonCSS() {
        if (document.getElementById('victoryPhoenixCannonCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'victoryPhoenixCannonCSS';
        style.textContent = `
            @keyframes victoryPhoenixAura {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                }
                25% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1) rotate(90deg);
                }
                75% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0) rotate(270deg);
                }
                100% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.4) rotate(360deg);
                }
            }
            
            @keyframes victoryPhoenixImpact {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(120deg); 
                }
                70% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(240deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(2.2) rotate(360deg); 
                }
            }
            
            /* Enhanced visual effects */
            .victory-phoenix-aura {
                will-change: transform, opacity;
            }
            
            .victory-phoenix-impact {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Clean up any remaining victory phoenix cannon effects
    cleanupVictoryPhoenixCannonEffects() {
        const effects = document.querySelectorAll('.victory-phoenix-aura, .victory-phoenix-impact');
        effects.forEach(effect => effect.remove());
    }

    // ============================================
    // BATTLE LOG AND NETWORKING
    // ============================================

    // Log the spell casting details
    logSpellCasting(caster, phoenixData, target) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Main spell casting log
        this.battleManager.addCombatLog(
            `🔥🚀 ${caster.name} fires ${phoenixData.phoenix.name} as a Victory Phoenix Cannon at ${target.hero.name}!`,
            logType
        );
        
        // Synchronize with guest using correct networking methods
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('spell_effect', {
                spellName: this.spellName,
                displayName: this.displayName,
                casterName: caster.name,
                casterAbsoluteSide: caster.absoluteSide,
                casterPosition: caster.position,
                targetName: target.hero.name,
                targetAbsoluteSide: target.hero.absoluteSide,
                targetPosition: target.position,
                phoenixName: phoenixData.phoenix.name,
                phoenixOwnerPosition: phoenixData.ownerPosition,
                phoenixCreatureIndex: phoenixData.creatureIndex,
                effectType: 'victory_phoenix_cannon',
                primaryDamage: 300,
                areaDamage: 100,
                timestamp: Date.now()
            });
        }
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        if (this.battleManager.isAuthoritative) return;
        
        const { displayName, casterName, targetName, phoenixName, phoenixOwnerPosition, phoenixCreatureIndex } = data;
        
        // Determine local sides for guest
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetLocalSide = (data.targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Add spell casting log
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        this.battleManager.addCombatLog(
            `🔥🚀 ${casterName} fires ${phoenixName} as a Victory Phoenix Cannon at ${targetName}!`,
            logType
        );
        
        // Create mock objects for guest-side animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        const targetHeroes = targetLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const phoenixOwnerHeroes = casterLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const mockTarget = {
            hero: targetHeroes[data.targetPosition],
            position: data.targetPosition,
            side: targetLocalSide
        };
        
        const mockPhoenixData = {
            phoenix: { name: phoenixName },
            ownerHero: phoenixOwnerHeroes[phoenixOwnerPosition],
            ownerPosition: phoenixOwnerPosition,
            creatureIndex: phoenixCreatureIndex
        };
        
        // Play visual effects on guest side
        if (mockTarget.hero && mockPhoenixData.ownerHero) {
            this.playVictoryPhoenixCannonAnimationGuestSide(mockPhoenixData, mockTarget, mockCaster);
        }
    }

    // Guest-side animation (visual only)
    async playVictoryPhoenixCannonAnimationGuestSide(phoenixData, target, caster) {
        try {
            // STEP 1: Find the actual phoenix creature by name and index
            let phoenixElement = null;
            
            if (phoenixData.ownerHero && phoenixData.ownerHero.creatures) {
                // Use the creature index from the network data if available
                if (phoenixData.creatureIndex >= 0 && phoenixData.creatureIndex < phoenixData.ownerHero.creatures.length) {
                    const creature = phoenixData.ownerHero.creatures[phoenixData.creatureIndex];
                    if (creature && creature.name === phoenixData.phoenix.name) {
                        phoenixElement = this.findPhoenixElementByIndex(phoenixData.ownerHero, phoenixData.creatureIndex);
                    }
                }
                
                // Fallback: search by name if index lookup failed
                if (!phoenixElement) {
                    phoenixElement = this.findPhoenixElementByName(phoenixData.ownerHero, phoenixData.phoenix.name);
                }
            }
            
            if (phoenixElement) {
                // STEP 2: Create flame aura around the CutePhoenix
                await this.createFlameAuraGuestSide(phoenixElement);
                
                // STEP 3: Ram animation
                if (target.hero) {
                    await this.executePhoenixRammingGuestSide(phoenixData, target, phoenixElement);
                }
            }
            
        } catch (error) {
            // Error handled silently
        }
        
        // Cleanup any remaining effects
        this.cleanupVictoryPhoenixCannonEffects();
    }

    findPhoenixElementByIndex(ownerHero, creatureIndex) {
        const heroSide = ownerHero.side;
        const heroPosition = ownerHero.position;
        
        const phoenixElement = document.querySelector(
            `.${heroSide}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        return phoenixElement;
    }

    findPhoenixElementByName(ownerHero, phoenixName) {
        const heroSide = ownerHero.side;
        const heroPosition = ownerHero.position;
        
        if (!ownerHero.creatures) {
            return null;
        }
        
        // Find the first living phoenix by name
        for (let i = 0; i < ownerHero.creatures.length; i++) {
            const creature = ownerHero.creatures[i];
            if (creature.alive && creature.name === phoenixName) {
                const phoenixElement = document.querySelector(
                    `.${heroSide}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${i}"]`
                );
                
                if (phoenixElement) {
                    return phoenixElement;
                }
            }
        }
        
        return null;
    }

    // Guest-side flame aura (visual only)
    async createFlameAuraGuestSide(phoenixElement) {
        const flameAura = document.createElement('div');
        flameAura.className = 'victory-phoenix-aura';
        flameAura.innerHTML = '🔥🔥🔥';
        
        flameAura.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 40px;
            z-index: 400;
            pointer-events: none;
            animation: victoryPhoenixAura ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-in-out;
            text-shadow: 
                0 0 20px rgba(255, 140, 0, 1),
                0 0 40px rgba(255, 69, 0, 0.8),
                0 0 60px rgba(255, 215, 0, 0.6);
            filter: drop-shadow(0 0 8px rgba(255, 140, 0, 1));
        `;
        
        phoenixElement.appendChild(flameAura);
        
        // Ensure CSS exists
        this.ensureVictoryPhoenixCannonCSS();
        
        await this.battleManager.delay(800);
        
        // Remove flame aura
        if (flameAura && flameAura.parentNode) {
            flameAura.remove();
        }
    }

    // Guest-side ramming animation (visual only)
    async executePhoenixRammingGuestSide(phoenixData, target, phoenixElement) {
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!targetElement) {
            return;
        }
        
        // Store original position for return animation
        const originalTransform = phoenixElement.style.transform || '';
        
        // Calculate positions for ram animation
        const phoenixRect = phoenixElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const deltaX = targetRect.left + targetRect.width/2 - (phoenixRect.left + phoenixRect.width/2);
        const deltaY = targetRect.top + targetRect.height/2 - (phoenixRect.top + phoenixRect.height/2);
        
        // Add flame trail during ram
        phoenixElement.style.filter = 'brightness(1.5) drop-shadow(0 0 15px rgba(255, 140, 0, 0.9))';
        
        // Ram animation - phoenix charges at target
        phoenixElement.style.transition = `transform ${this.battleManager.getSpeedAdjustedDelay(400)}ms ease-out`;
        phoenixElement.style.transform = `${originalTransform} translate(${deltaX}px, ${deltaY}px) scale(1.2)`;
        phoenixElement.style.zIndex = '500';
        
        await this.battleManager.delay(400);
        
        // Create impact effect
        this.createPhoenixImpact(targetElement);
        
        // Return animation
        phoenixElement.style.transition = `transform ${this.battleManager.getSpeedAdjustedDelay(400)}ms ease-in`;
        phoenixElement.style.transform = originalTransform;
        
        await this.battleManager.delay(400);
        
        // Remove effects
        phoenixElement.style.filter = '';
        phoenixElement.style.zIndex = '';
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
            description: 'Fires a living CutePhoenix as a cannon projectile at the nearest enemy hero, dealing 300 damage to the target and 100 damage to all enemy creatures. The fired CutePhoenix is defeated.',
            damageFormula: '300 damage to target hero + 100 damage to all enemy creatures',
            targetType: 'enemy_hero_ignoring_creatures',
            spellSchool: 'DestructionMagic',
            requirements: 'At least 1 living CutePhoenix creature'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupVictoryPhoenixCannonEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('victoryPhoenixCannonCSS');
        if (css) css.remove();
    }
}

// Export for use in spell system
export default VictoryPhoenixCannonSpell;