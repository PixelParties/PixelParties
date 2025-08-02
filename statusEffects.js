// statusEffects.js - Centralized Status Effects System for Heroes and Creatures

export class StatusEffectsManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        // Status effect definitions
        this.statusEffectDefinitions = {
            fireshield: {
                name: 'fireshield',
                displayName: 'Fireshield',
                type: 'buff',
                targetTypes: ['hero'], // Only heroes can have fireshield
                persistent: true, // Lasts entire battle
                visual: 'fire_ring',
                description: 'Fire shield that deals recoil damage to attackers'
            },
            silenced: {
                name: 'silenced',
                displayName: 'Silenced',
                type: 'debuff',
                targetTypes: ['hero'], // Only heroes can be silenced
                persistent: false, // Decreases each turn
                visual: 'silence_symbol',
                description: 'Cannot cast spells. Reduces by 1 stack each turn.'
            },
            poisoned: {
                name: 'poisoned',
                displayName: 'Poisoned',
                type: 'debuff',
                targetTypes: ['hero', 'creature'], // Both can be poisoned
                persistent: false, // Decreases each turn via damage
                visual: 'poison_cloud',
                description: 'Takes 10 damage per stack after each turn.'
            },
            stunned: {
                name: 'stunned',
                displayName: 'Stunned',
                type: 'debuff',
                targetTypes: ['hero', 'creature'], // Both can be stunned
                persistent: false, // Decreases when skipping turns
                visual: 'stun_stars',
                description: 'Skips turns. Reduces by 1 stack when turn is skipped.'
            },
            burned: {
                name: 'burned',
                displayName: 'Burned',
                type: 'debuff',
                targetTypes: ['hero', 'creature'], // Both can be burned
                persistent: false, // Decreases each turn via damage
                visual: 'burn_flames',
                description: 'Takes 60 damage per stack after each turn. Reduces by 1 stack after damage. Removes frozen.'
            },
            frozen: {
                name: 'frozen',
                displayName: 'Frozen',
                type: 'debuff',
                targetTypes: ['hero', 'creature'], // Both can be frozen
                persistent: false, // Decreases when skipping turns
                visual: 'freeze_crystal',
                description: 'Skips turns. Reduces by 1 stack when turn is skipped. Removes burned.'
            }
        };
        
        console.log('🎭 StatusEffectsManager initialized');
    }

    // ============================================
    // CORE STATUS EFFECT MANAGEMENT
    // ============================================

    // Apply status effect to target (hero or creature)
    applyStatusEffect(target, effectName, stacks = 1) {
        if (!this.isValidTarget(target, effectName)) {
            console.warn(`Cannot apply ${effectName} to ${target.name}: invalid target type`);
            return false;
        }

        // Handle special interactions BEFORE applying the effect
        this.handleStatusInteractions(target, effectName);

        // Get or create the status effect
        let statusEffect = this.getStatusEffect(target, effectName);
        
        if (statusEffect) {
            // Add to existing stacks
            statusEffect.stacks += stacks;
            statusEffect.lastUpdated = Date.now();
        } else {
            // Create new status effect
            statusEffect = this.createStatusEffect(effectName, stacks);
            this.addStatusEffectToTarget(target, statusEffect);
        }

        // Log the application
        this.logStatusEffectApplication(target, effectName, stacks, statusEffect.stacks);

        // Create visual effect
        this.createStatusVisualEffect(target, effectName, 'applied');

        // Sync with guest if host
        if (this.battleManager.isAuthoritative) {
            this.syncStatusEffectToGuest(target, effectName, statusEffect.stacks, 'applied');
        }

        return true;
    }

    // Remove status effect stacks from target
    removeStatusEffect(target, effectName, stacks = 1) {
        const statusEffect = this.getStatusEffect(target, effectName);
        if (!statusEffect) return false;

        const oldStacks = statusEffect.stacks;
        statusEffect.stacks = Math.max(0, statusEffect.stacks - stacks);
        statusEffect.lastUpdated = Date.now();

        if (statusEffect.stacks === 0) {
            // Remove the effect entirely
            this.removeStatusEffectFromTarget(target, effectName);
            this.removeStatusVisualEffect(target, effectName);
        }

        // Log the removal
        this.logStatusEffectRemoval(target, effectName, stacks, oldStacks, statusEffect.stacks);

        // Sync with guest if host
        if (this.battleManager.isAuthoritative && statusEffect.stacks === 0) {
            this.syncStatusEffectToGuest(target, effectName, 0, 'removed');
        }

        return true;
    }

    // Get status effect from target
    getStatusEffect(target, effectName) {
        if (!target.statusEffects) {
            target.statusEffects = [];
        }
        return target.statusEffects.find(effect => effect.name === effectName);
    }

    // Get status effect stacks
    getStatusEffectStacks(target, effectName) {
        const effect = this.getStatusEffect(target, effectName);
        return effect ? effect.stacks : 0;
    }

    // Check if target has status effect
    hasStatusEffect(target, effectName) {
        return this.getStatusEffectStacks(target, effectName) > 0;
    }

    // ============================================
    // TURN-BASED STATUS EFFECT PROCESSING
    // ============================================

    // Process all status effects for a target at the end of their turn
    async processStatusEffectsAfterTurn(target) {
        if (!target.statusEffects || target.statusEffects.length === 0) return;

        console.log(`🎭 Processing status effects for ${target.name}...`);

        // Process damage-dealing effects first
        await this.processPoisonDamage(target);
        await this.processBurnDamage(target);

        // Process duration-based effects
        this.processSilencedDuration(target);

        // Clean up expired effects
        this.cleanupExpiredEffects(target);
    }

    // Check if target can take action (not stunned/frozen)
    canTakeAction(target) {
        const stunned = this.hasStatusEffect(target, 'stunned');
        const frozen = this.hasStatusEffect(target, 'frozen');
        
        return !stunned && !frozen;
    }

    // Check if hero can cast spells (not silenced)
    canCastSpells(hero) {
        return !this.hasStatusEffect(hero, 'silenced');
    }

    // Process turn skip for stunned/frozen targets
    processTurnSkip(target, skipReason) {
        if (skipReason === 'stunned') {
            this.removeStatusEffect(target, 'stunned', 1);
            this.battleManager.addCombatLog(
                `😵 ${target.name} is stunned and skips their turn!`,
                target.side === 'player' ? 'error' : 'success'
            );
        } else if (skipReason === 'frozen') {
            this.removeStatusEffect(target, 'frozen', 1);
            this.battleManager.addCombatLog(
                `🧊 ${target.name} is frozen and skips their turn!`,
                target.side === 'player' ? 'error' : 'success'
            );
        }
    }

    // ============================================
    // DAMAGE PROCESSING
    // ============================================

    // Process poison damage
    async processPoisonDamage(target) {
        const poisonStacks = this.getStatusEffectStacks(target, 'poisoned');
        if (poisonStacks === 0) return;

        const damage = 10 * poisonStacks;
        
        // Apply damage
        if (target.type === 'hero' || !target.type) {
            // Hero damage with poison source
            this.battleManager.authoritative_applyDamage({
                target: target,
                damage: damage,
                newHp: Math.max(0, target.currentHp - damage),
                died: (target.currentHp - damage) <= 0
            }, { source: 'poison' }); // Pass poison source
        } else {
            // Creature damage with poison source
            this.applyCreatureDamage(target, damage, 'poison');
        }

        // Create enhanced poison damage visual
        this.createStatusDamageVisuals(target, damage, 'poison');

        // Create additional poison visual effect  
        this.createStatusVisualEffect(target, 'poisoned', 'damage');

        // Log the damage
        this.battleManager.addCombatLog(
            `☠️ ${target.name} takes ${damage} poison damage!`,
            target.side === 'player' ? 'error' : 'success'
        );

        await this.battleManager.delay(300);
    }

    // Process burn damage
    async processBurnDamage(target) {
        const burnStacks = this.getStatusEffectStacks(target, 'burned');
        if (burnStacks === 0) return;

        const damage = 60 * burnStacks; // CHANGED: from 30 to 60 damage per stack
        
        // Apply damage
        if (target.type === 'hero' || !target.type) {
            // Hero damage with burn source
            this.battleManager.authoritative_applyDamage({
                target: target,
                damage: damage,
                newHp: Math.max(0, target.currentHp - damage),
                died: (target.currentHp - damage) <= 0
            }, { source: 'burn' }); // Pass burn source
        } else {
            // Creature damage with burn source
            this.applyCreatureDamage(target, damage, 'burn');
        }

        // Create enhanced burn damage visual
        this.createStatusDamageVisuals(target, damage, 'burn');

        // Create additional burn visual effect
        this.createStatusVisualEffect(target, 'burned', 'damage');

        // Log the damage
        this.battleManager.addCombatLog(
            `🔥 ${target.name} takes ${damage} burn damage!`,
            target.side === 'player' ? 'error' : 'success'
        );

        // NEW: Remove one stack of burned after damage is applied (minimum 0)
        this.removeStatusEffect(target, 'burned', 1);
        
        // Log if burn is completely removed
        if (!this.hasStatusEffect(target, 'burned')) {
            this.battleManager.addCombatLog(
                `🔥 ${target.name}'s burn has been extinguished!`,
                target.side === 'player' ? 'success' : 'error'
            );
        }

        await this.battleManager.delay(300);
    }

    // Apply damage to creature
    applyCreatureDamage(creature, damage, damageType) {
        // Find the creature's hero and position
        const creatureInfo = this.findCreatureInfo(creature);
        if (!creatureInfo) return;

        const { hero, creatureIndex, side, position } = creatureInfo;

        // Apply damage using battle manager's creature damage system with damage source
        this.battleManager.authoritative_applyDamageToCreature({
            hero: hero,
            creature: creature,
            creatureIndex: creatureIndex,
            damage: damage,
            position: position,
            side: side
        }, { source: damageType }); // Pass the damage source (poison/burn)
    }

    createStatusDamageVisuals(target, damage, damageType) {
        if (target.type === 'hero' || !target.type) {
            // Hero damage visualization
            this.battleManager.animationManager.createDamageNumber(
                target.side, 
                target.position, 
                damage, 
                target.maxHp, 
                damageType
            );
        } else {
            // Creature damage visualization
            const creatureInfo = this.findCreatureInfo(target);
            if (creatureInfo) {
                const { side, position, creatureIndex } = creatureInfo;
                this.battleManager.animationManager.createDamageNumberOnCreature(
                    side, 
                    position, 
                    creatureIndex, 
                    damage, 
                    target.maxHp, 
                    damageType
                );
            }
        }
    }

    // Process silenced duration (decreases each turn)
    processSilencedDuration(target) {
        if (this.hasStatusEffect(target, 'silenced')) {
            this.removeStatusEffect(target, 'silenced', 1);
            
            if (!this.hasStatusEffect(target, 'silenced')) {
                this.battleManager.addCombatLog(
                    `🗣️ ${target.name} is no longer silenced!`,
                    target.side === 'player' ? 'success' : 'error'
                );
            }
        }
    }

    // ============================================
    // STATUS EFFECT INTERACTIONS
    // ============================================

    // Handle special interactions between status effects
    handleStatusInteractions(target, newEffectName) {
        if (newEffectName === 'burned') {
            // Applying burn removes all frozen stacks
            if (this.hasStatusEffect(target, 'frozen')) {
                const frozenStacks = this.getStatusEffectStacks(target, 'frozen');
                this.removeStatusEffect(target, 'frozen', frozenStacks);
                this.battleManager.addCombatLog(
                    `🔥 ${target.name}'s burn melts away the ice!`,
                    'info'
                );
            }
        } else if (newEffectName === 'frozen') {
            // Applying freeze removes all burn stacks
            if (this.hasStatusEffect(target, 'burned')) {
                const burnStacks = this.getStatusEffectStacks(target, 'burned');
                this.removeStatusEffect(target, 'burned', burnStacks);
                this.battleManager.addCombatLog(
                    `🧊 ${target.name}'s ice extinguishes the flames!`,
                    'info'
                );
            }
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Create visual effect for status application/damage
    createStatusVisualEffect(target, effectName, actionType) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const definition = this.statusEffectDefinitions[effectName];
        if (!definition) return;

        switch (actionType) {
            case 'applied':
                this.createApplicationEffect(targetElement, target, effectName);
                this.createPersistentStatusIndicator(targetElement, target, effectName);
                break;
            case 'damage':
                this.createDamageEffect(targetElement, effectName);
                break;
        }
    }

    // Create application effect
    createApplicationEffect(targetElement, target, effectName) {
        const effects = {
            silenced: { icon: '🔇', color: 'rgba(128, 128, 128, 0.9)' },
            poisoned: { icon: '☠️', color: 'rgba(128, 0, 128, 0.9)' },
            stunned: { icon: '😵', color: 'rgba(255, 255, 0, 0.9)' },
            burned: { icon: '🔥', color: 'rgba(255, 100, 0, 0.9)' },
            frozen: { icon: '🧊', color: 'rgba(100, 200, 255, 0.9)' }
        };

        const effect = effects[effectName];
        if (!effect) return;

        const applicationEffect = document.createElement('div');
        applicationEffect.className = `status-application-effect status-${effectName}`;
        applicationEffect.innerHTML = effect.icon;
        
        applicationEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 36px;
            z-index: 300;
            pointer-events: none;
            animation: statusApplicationPulse ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
            text-shadow: 
                0 0 15px ${effect.color},
                0 0 30px ${effect.color.replace('0.9', '0.6')};
        `;
        
        targetElement.appendChild(applicationEffect);
        
        setTimeout(() => {
            if (applicationEffect && applicationEffect.parentNode) {
                applicationEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(800));
    }

    // Create persistent status indicator
    createPersistentStatusIndicator(targetElement, target, effectName) {
        // Remove existing indicator if any
        const existingIndicator = targetElement.querySelector(`.status-indicator-${effectName}`);
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const stacks = this.getStatusEffectStacks(target, effectName);
        if (stacks === 0) return;

        const indicators = {
            silenced: { icon: '🔇', color: '#808080' },
            poisoned: { icon: '☠️', color: '#800080' },
            stunned: { icon: '😵', color: '#ffff00' },
            burned: { icon: '🔥', color: '#ff6400' },
            frozen: { icon: '🧊', color: '#64c8ff' }
        };

        const indicator = indicators[effectName];
        if (!indicator) return;

        const statusIndicator = document.createElement('div');
        statusIndicator.className = `status-indicator status-indicator-${effectName}`;
        
        // Position indicators in a row above the target
        const existingIndicators = targetElement.querySelectorAll('.status-indicator');
        const xOffset = existingIndicators.length * 25;
        
        statusIndicator.style.cssText = `
            position: absolute;
            top: -35px;
            left: calc(50% + ${xOffset}px);
            transform: translateX(-50%);
            width: 20px;
            height: 20px;
            background: ${indicator.color};
            border: 2px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            z-index: 250;
            pointer-events: none;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
        `;
        
        // Show stacks if > 1
        if (stacks > 1) {
            statusIndicator.innerHTML = `<span style="color: white; font-weight: bold; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);">${stacks}</span>`;
        } else {
            statusIndicator.innerHTML = `<span style="color: white; font-size: 8px;">${indicator.icon}</span>`;
        }
        
        targetElement.appendChild(statusIndicator);
    }

    // Create damage effect
    createDamageEffect(targetElement, effectName) {
        const effects = {
            poisoned: { icon: '☠️💨', color: '#800080' },
            burned: { icon: '🔥💥', color: '#ff6400' }
        };

        const effect = effects[effectName];
        if (!effect) return;

        const damageEffect = document.createElement('div');
        damageEffect.className = `status-damage-effect status-${effectName}-damage`;
        damageEffect.innerHTML = effect.icon;
        
        damageEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 28px;
            z-index: 400;
            pointer-events: none;
            animation: statusDamageFloat ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
            text-shadow: 
                0 0 10px ${effect.color},
                0 0 20px ${effect.color}90;
        `;
        
        targetElement.appendChild(damageEffect);
        
        setTimeout(() => {
            if (damageEffect && damageEffect.parentNode) {
                damageEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(600));
    }

    // Remove persistent visual effect
    removeStatusVisualEffect(target, effectName) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const indicator = targetElement.querySelector(`.status-indicator-${effectName}`);
        if (indicator) {
            indicator.remove();
        }

        // Reposition remaining indicators
        this.repositionStatusIndicators(targetElement);
    }

    // Reposition status indicators after removal
    repositionStatusIndicators(targetElement) {
        const indicators = targetElement.querySelectorAll('.status-indicator');
        indicators.forEach((indicator, index) => {
            const xOffset = index * 25;
            indicator.style.left = `calc(50% + ${xOffset}px)`;
        });
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Get target element (hero or creature)
    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            // Hero element
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
            // Creature element
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;

            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
    }

    // Find creature information (hero, position, index)
    findCreatureInfo(creature) {
        // Search through all heroes and their creatures
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            
            for (const position of ['left', 'center', 'right']) {
                const hero = heroes[position];
                if (!hero || !hero.creatures) continue;
                
                const creatureIndex = hero.creatures.indexOf(creature);
                if (creatureIndex !== -1) {
                    return { hero, side, position, creatureIndex };
                }
            }
        }
        
        return null;
    }

    // Check if target is valid for this status effect
    isValidTarget(target, effectName) {
        const definition = this.statusEffectDefinitions[effectName];
        if (!definition) return false;

        const targetType = (target.type === 'hero' || !target.type) ? 'hero' : 'creature';
        return definition.targetTypes.includes(targetType);
    }

    // Create status effect object
    createStatusEffect(effectName, stacks) {
        const definition = this.statusEffectDefinitions[effectName];
        
        return {
            name: effectName,
            displayName: definition.displayName,
            stacks: stacks,
            type: definition.type,
            persistent: definition.persistent,
            description: definition.description,
            appliedAt: Date.now(),
            lastUpdated: Date.now(),
            appliedTurn: this.battleManager.currentTurn
        };
    }

    // Add status effect to target
    addStatusEffectToTarget(target, statusEffect) {
        if (!target.statusEffects) {
            target.statusEffects = [];
        }
        target.statusEffects.push(statusEffect);
    }

    // Remove status effect from target
    removeStatusEffectFromTarget(target, effectName) {
        if (!target.statusEffects) return;
        target.statusEffects = target.statusEffects.filter(effect => effect.name !== effectName);
    }

    // Clean up expired effects
    cleanupExpiredEffects(target) {
        if (!target.statusEffects) return;
        
        const beforeCount = target.statusEffects.length;
        target.statusEffects = target.statusEffects.filter(effect => effect.stacks > 0);
        const afterCount = target.statusEffects.length;
        
        if (beforeCount !== afterCount) {
            console.log(`🧹 Cleaned up ${beforeCount - afterCount} expired status effects from ${target.name}`);
        }
    }

    // ============================================
    // LOGGING
    // ============================================

    // Log status effect application
    logStatusEffectApplication(target, effectName, appliedStacks, totalStacks) {
        const definition = this.statusEffectDefinitions[effectName];
        const logType = target.side === 'player' ? 'error' : 'success';
        
        this.battleManager.addCombatLog(
            `🎭 ${target.name} gains ${definition.displayName} x${appliedStacks}! (Total: ${totalStacks})`,
            logType
        );
    }

    // Log status effect removal
    logStatusEffectRemoval(target, effectName, removedStacks, oldStacks, newStacks) {
        if (newStacks === 0) {
            const definition = this.statusEffectDefinitions[effectName];
            this.battleManager.addCombatLog(
                `✨ ${target.name} recovers from ${definition.displayName}!`,
                target.side === 'player' ? 'success' : 'error'
            );
        }
    }

    // ============================================
    // SYNCHRONIZATION
    // ============================================

    // Sync status effect change to guest
    syncStatusEffectToGuest(target, effectName, stacks, action) {
        if (!this.battleManager.isAuthoritative) return;

        const targetInfo = this.getTargetSyncInfo(target);
        
        this.battleManager.sendBattleUpdate('status_effect_change', {
            targetInfo: targetInfo,
            effectName: effectName,
            stacks: stacks,
            action: action, // 'applied' or 'removed'
            timestamp: Date.now()
        });
    }

    // Get target sync information
    getTargetSyncInfo(target) {
        if (target.type === 'hero' || !target.type) {
            return {
                type: 'hero',
                absoluteSide: target.absoluteSide,
                position: target.position,
                name: target.name
            };
        } else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                absoluteSide: creatureInfo.hero.absoluteSide,
                position: creatureInfo.position,
                creatureIndex: creatureInfo.creatureIndex,
                name: target.name
            };
        }
    }

    // Handle guest status effect update
    handleGuestStatusEffectUpdate(data) {
        const { targetInfo, effectName, stacks, action } = data;
        
        // Find the target
        const target = this.findTargetFromSyncInfo(targetInfo);
        if (!target) return;

        if (action === 'applied') {
            // Set the exact stacks (don't add, as this is a sync)
            this.setStatusEffectStacks(target, effectName, stacks);
            this.createStatusVisualEffect(target, effectName, 'applied');
        } else if (action === 'removed') {
            this.removeStatusEffectFromTarget(target, effectName);
            this.removeStatusVisualEffect(target, effectName);
        }
    }

    // Find target from sync info
    findTargetFromSyncInfo(targetInfo) {
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetInfo.type === 'hero') {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            return heroes[targetInfo.position];
        } else {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[targetInfo.position];
            return hero?.creatures?.[targetInfo.creatureIndex];
        }
    }

    // Set status effect stacks directly (for sync)
    setStatusEffectStacks(target, effectName, stacks) {
        let statusEffect = this.getStatusEffect(target, effectName);
        
        if (statusEffect) {
            statusEffect.stacks = stacks;
            statusEffect.lastUpdated = Date.now();
        } else if (stacks > 0) {
            statusEffect = this.createStatusEffect(effectName, stacks);
            this.addStatusEffectToTarget(target, statusEffect);
        }
    }

    // ============================================
    // BATTLE MANAGEMENT
    // ============================================

    // Clear all status effects from target (battle end)
    clearAllStatusEffects(target) {
        if (!target.statusEffects) return;
        
        // Remove all visual indicators
        const targetElement = this.getTargetElement(target);
        if (targetElement) {
            const indicators = targetElement.querySelectorAll('.status-indicator');
            indicators.forEach(indicator => indicator.remove());
        }
        
        target.statusEffects = [];
        console.log(`🧹 Cleared all status effects from ${target.name}`);
    }

    // Clear all status effects from all targets (battle end)
    clearAllBattleStatusEffects() {
        console.log('🧹 Clearing all status effects from battle...');
        
        // Clear from all heroes
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                
                if (hero) {
                    this.clearAllStatusEffects(hero);
                    
                    // Clear from hero's creatures
                    if (hero.creatures) {
                        hero.creatures.forEach(creature => {
                            this.clearAllStatusEffects(creature);
                        });
                    }
                }
            });
        });
    }

    // ============================================
    // CSS AND CLEANUP
    // ============================================

    // Ensure CSS exists for status effects
    ensureStatusEffectsCSS() {
        if (document.getElementById('statusEffectsCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'statusEffectsCSS';
        style.textContent = `
            @keyframes statusApplicationPulse {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(120deg); 
                }
                70% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(240deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.8) rotate(360deg); 
                }
            }
            
            @keyframes statusDamageFloat {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                50% {
                    opacity: 0.9;
                    transform: translate(-50%, -70%) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -90%) scale(1);
                }
            }
            
            .status-indicator {
                transition: all 0.3s ease;
                will-change: transform, opacity;
            }
            
            .status-indicator:hover {
                transform: translateX(-50%) scale(1.2);
            }
            
            .status-application-effect,
            .status-damage-effect {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.clearAllBattleStatusEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('statusEffectsCSS');
        if (css) css.remove();
        
        console.log('🎭 StatusEffectsManager cleaned up');
    }

    // ============================================
    // EXPORT/IMPORT FOR PERSISTENCE
    // ============================================

    // Export status effects state (for persistence)
    exportStatusEffectsState() {
        // Status effects are already stored in hero.statusEffects and creature.statusEffects
        // The persistence manager will handle them automatically
        return {
            initialized: true,
            version: '1.0.0'
        };
    }

    // Import status effects state (for persistence)
    importStatusEffectsState(state) {
        if (!state || !state.initialized) return false;
        
        // Restore visual effects for all status effects
        this.restoreAllStatusVisualEffects();
        
        return true;
    }

    // Restore visual effects for all existing status effects
    restoreAllStatusVisualEffects() {
        console.log('🎭 Restoring status effect visual indicators...');
        
        // Restore for all heroes
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                
                if (hero && hero.statusEffects) {
                    hero.statusEffects.forEach(effect => {
                        this.createPersistentStatusIndicator(
                            this.getTargetElement(hero), hero, effect.name
                        );
                    });
                    
                    // Restore for creatures
                    if (hero.creatures) {
                        hero.creatures.forEach(creature => {
                            if (creature.statusEffects) {
                                creature.statusEffects.forEach(effect => {
                                    this.createPersistentStatusIndicator(
                                        this.getTargetElement(creature), creature, effect.name
                                    );
                                });
                            }
                        });
                    }
                }
            });
        });
    }
}

// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.StatusEffectsManager = StatusEffectsManager;
}

export default StatusEffectsManager;