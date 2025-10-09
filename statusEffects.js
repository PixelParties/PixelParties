import { SwampborneWaflavHeroEffect } from './Heroes/swampborneWaflav.js';

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
            taunting: {
                name: 'taunting',
                displayName: 'Taunting',
                type: 'buff',
                targetTypes: ['hero'],
                persistent: false,
                visual: 'taunt_shout',
                description: 'Draws enemy attacks to this zone. Reduces by 1 stack each turn.'
            },
            elixirOfCold: {
                name: 'elixirOfCold',
                displayName: 'Elixir of Cold',
                type: 'buff',
                targetTypes: ['hero'], // Only heroes can have this buff
                persistent: true, // Lasts entire battle
                visual: 'frost_aura',
                description: 'Each stack gives 50% chance to freeze target on attack'
            },
            stoneskin: {
                name: 'stoneskin',
                displayName: 'Stoneskin',
                type: 'buff',
                targetTypes: ['hero'], // Only heroes can have stoneskin
                persistent: true, // Lasts entire battle
                visual: 'stone_aura',
                description: 'Stone-like protection'
            },
            timeGifted: {
                name: 'timeGifted',
                displayName: 'Time Gifted',
                type: 'buff',
                targetTypes: ['hero', 'creature'], // Both heroes and creatures can be time gifted
                persistent: true, // Lasts entire battle
                visual: 'time_aura',
                description: 'Blessed with the gift of time manipulation'
            },
            immortal: {
                name: 'immortal',
                displayName: 'Immortal',
                type: 'buff',
                targetTypes: ['hero'], // Only heroes can have immortal
                persistent: true, // Lasts until consumed or battle ends
                visual: 'immortal_halo',
                description: 'When dying without heal-block, revive with 100 HP and consume 1 stack.'
            },
            healthPotionReady: {
                name: 'healthPotionReady',
                displayName: 'Healing Reserve',
                type: 'buff',
                targetTypes: ['hero'], // Only heroes
                persistent: true, // Lasts entire battle
                visual: null, // NO VISUAL - invisible to player
                description: 'Auto-heals to full when HP drops below 100'
            },
            clouded: {
                name: 'clouded',
                displayName: 'Clouded',
                type: 'buff',
                targetTypes: ['hero', 'creature'], // Both heroes and creatures can be clouded
                persistent: false, // Decreases when taking damage
                visual: 'cloud_aura',
                description: 'Takes half damage from any source. Reduces by 1 stack after taking damage.'
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
            dazed: {
                name: 'dazed',
                displayName: 'Dazed',
                type: 'debuff',
                targetTypes: ['hero'],
                persistent: false, // Decreases every turn
                visual: 'daze_swirl',
                description: 'Skips turns. Reduces by 1 stack when turn is skipped. Negates Kazena passive effects.'
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
            },
            healblock: {
                name: 'healblock',
                displayName: 'Heal-Block',
                type: 'debuff',
                targetTypes: ['hero', 'creature'], // Both can be heal-blocked
                persistent: false, // Decreases each turn via duration
                visual: 'heal_block_symbol',
                description: 'Cannot be healed or revived. Reduces by 1 stack each turn (persists when dead).'
            },
            weakened: {
                name: 'weakened',
                displayName: 'Weakened',
                type: 'debuff',
                targetTypes: ['hero'],
                persistent: false,
                visual: 'weakness_arrow',
                description: 'Deals half damage on attacks. Reduces by 1 stack each turn.'
            },
            infighting: {
                name: 'infighting',
                displayName: 'Infighting',
                type: 'debuff',
                targetTypes: ['hero'], // Only heroes can have infighting
                persistent: false, // Decreases each turn
                visual: 'rage_aura',
                description: 'Overcome with rage. Reduces by 1 stack each turn.'
            }
        };
    }

    // ============================================
    // MEDEA POISON INTERACTION
    // ============================================

    /**
     * Count the number of "Medea" heroes on the enemy team relative to the target
     * @param {Object} target - The target taking poison damage
     * @returns {number} - Number of enemy Medea heroes
     */
    countEnemyMedeaHeroes(target) {
        // Determine which side is the enemy team
        const targetSide = target.side;
        const enemySide = targetSide === 'player' ? 'opponent' : 'player';
        
        // Get the enemy heroes collection
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        // Count alive Medea heroes on enemy team
        let medeaCount = 0;
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive && hero.name === 'Medea') {
                medeaCount++;
            }
        });
        
        return medeaCount;
    }

    /**
     * Apply Medea poison damage multiplier
     * @param {number} baseDamage - Base poison damage
     * @param {Object} target - Target taking damage
     * @returns {Object} - {damage, medeaCount, multiplier}
     */
    applyMedeaPoisonMultiplier(baseDamage, target) {
        const medeaCount = this.countEnemyMedeaHeroes(target);
        
        if (medeaCount === 0) {
            return {
                damage: baseDamage,
                medeaCount: 0,
                multiplier: 1
            };
        }
        
        // Double the damage for each enemy Medea
        const multiplier = Math.pow(2, medeaCount);
        const finalDamage = baseDamage * multiplier;
        
        return {
            damage: finalDamage,
            medeaCount: medeaCount,
            multiplier: multiplier
        };
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

        // Don't apply status effects to dead targets
        const isTargetAlive = (target.type === 'hero' || !target.type) ? target.alive : target.alive;
        if (!isTargetAlive) {
            return false;
        }

        // Check if we can negate this status effect with Juice
        const definition = this.statusEffectDefinitions[effectName];
        if (definition && definition.type === 'debuff' && this.checkAndConsumeJuice(target, effectName, stacks)) {
            // Juice consumed to negate the negative effect!
            return false;
        }

        // Check for SwampborneWaflav evolution counter award
        if (this.battleManager.swampborneWaflavEffect) {
            SwampborneWaflavHeroEffect.checkPoisonEvolutionCounter(target, effectName, stacks, this.battleManager);
        }
        
        // Check for frozen resistance and immunity checks...
        if (effectName === 'frozen' && this.battleManager && this.battleManager.attackEffectsManager) {
            const sunSwordEffect = this.battleManager.attackEffectsManager.sunSwordEffect;
            
            if (sunSwordEffect && sunSwordEffect.checkFrozenResistance(target)) {
                // Resistance successful!
                sunSwordEffect.createFrozenResistanceEffect(target);
                
                this.battleManager.addCombatLog(
                    `☀️ ${target.name}'s Sun Sword resists the frozen effect!`,
                    target.side === 'player' ? 'success' : 'info'
                );
                
                // Sync to guest if host
                if (this.battleManager.isAuthoritative) {
                    this.battleManager.sendBattleUpdate('sun_sword_frozen_resist', {
                        targetInfo: this.getTargetSyncInfo(target),
                        timestamp: Date.now()
                    });
                }
                
                return false; // Don't apply the frozen effect
            }
        }

        // Fireshield frozen immunity check
        if (effectName === 'frozen') {
            // Check if target has any fireshield stacks
            const fireshieldEffect = target.statusEffects ? target.statusEffects.find(effect => effect.name === 'fireshield') : null;
            const fireshieldStacks = fireshieldEffect ? fireshieldEffect.stacks : 0;
            
            if (fireshieldStacks > 0) {
                // Fireshield provides complete immunity to frozen
                this.createFireshieldFrozenImmunityEffect(target);
                
                this.battleManager.addCombatLog(
                    `🛡️ ${target.name}'s Fireshield protects against the frozen effect! (${fireshieldStacks} stacks)`,
                    target.side === 'player' ? 'success' : 'info'
                );
                
                // Sync to guest if host
                if (this.battleManager.isAuthoritative) {
                    this.battleManager.sendBattleUpdate('fireshield_frozen_immunity', {
                        targetInfo: this.getTargetSyncInfo(target),
                        fireshieldStacks: fireshieldStacks,
                        timestamp: Date.now()
                    });
                }
                
                return false; // Don't apply the frozen effect
            }
        }

        // Handle special interactions BEFORE applying the effect
        this.handleStatusInteractions(target, effectName);

        // Get existing status effect
        let statusEffect = this.getStatusEffect(target, effectName);
        const wasExisting = !!statusEffect;
        
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

        // FIX: Handle visual effects differently for new vs existing effects
        if (wasExisting) {
            // For existing effects, just update the indicator
            this.updateStatusVisualIndicator(target, effectName);
            // Still create the application flash effect
            this.createApplicationEffect(this.getTargetElement(target), target, effectName);
        } else {
            // For new effects, create full visual effect
            this.createStatusVisualEffect(target, effectName, 'applied');
        }

        // Sync with guest if host
        if (this.battleManager.isAuthoritative) {
            this.syncStatusEffectToGuest(target, effectName, statusEffect.stacks, wasExisting ? 'updated' : 'applied');
        }

        return true;
    }

    checkAndConsumeJuice(target, effectName, stacks) {
        // Determine target's side - works for both heroes and creatures
        let targetSide = null;
        if (target.side) {
            targetSide = target.side;
        } else if (target.type === 'hero' || !target.type) {
            targetSide = target.side;
        } else {
            // For creatures, we need to find their hero to get the side
            const creatureInfo = this.findCreatureInfo(target);
            if (creatureInfo && creatureInfo.hero) {
                targetSide = creatureInfo.hero.side;
            }
        }
        
        if (!targetSide) {
            return false; // Cannot determine target side
        }
        
        // Get the appropriate permanent artifacts array based on target's side
        const permanentArtifacts = targetSide === 'player' 
            ? this.battleManager.playerPermanentArtifacts 
            : this.battleManager.opponentPermanentArtifacts;
            
        if (!permanentArtifacts || !Array.isArray(permanentArtifacts)) {
            return false; // No permanent artifacts available for this side
        }
        
        const juiceIndex = permanentArtifacts.findIndex(
            artifact => artifact.name === 'Juice'
        );
        
        if (juiceIndex === -1) {
            return false; // No Juice available for this side
        }
        
        // Consume one Juice to negate the status effect
        permanentArtifacts.splice(juiceIndex, 1);
        
        // Create visual effect
        this.createJuiceNegationEffect(target, effectName);
        
        // Log the negation
        this.battleManager.addCombatLog(
            `🧃 ${target.name} consumes Juice to negate ${stacks} stack${stacks > 1 ? 's' : ''} of ${effectName}!`,
            target.side === 'player' ? 'success' : 'info'
        );
        
        // Sync to guest if host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('juice_negation', {
                targetInfo: this.getTargetSyncInfo(target),
                effectName: effectName,
                stacks: stacks,
                targetSide: targetSide,
                remainingJuicePlayer: this.battleManager.playerPermanentArtifacts ? 
                    this.battleManager.playerPermanentArtifacts.filter(a => a.name === 'Juice').length : 0,
                remainingJuiceOpponent: this.battleManager.opponentPermanentArtifacts ? 
                    this.battleManager.opponentPermanentArtifacts.filter(a => a.name === 'Juice').length : 0,
                timestamp: Date.now()
            });
        }
        return true;
    }

    handleGuestJuiceNegation(data) {
        const { targetInfo, effectName, stacks, remainingJuice } = data;
        
        // Update local juice count
        if (this.battleManager.battlePermanentArtifacts) {
            // Sync the juice count by removing consumed ones
            const currentJuice = this.battleManager.battlePermanentArtifacts.filter(a => a.name === 'Juice').length;
            if (currentJuice > remainingJuice) {
                // Remove the difference
                for (let i = 0; i < (currentJuice - remainingJuice); i++) {
                    const index = this.battleManager.battlePermanentArtifacts.findIndex(a => a.name === 'Juice');
                    if (index !== -1) {
                        this.battleManager.battlePermanentArtifacts.splice(index, 1);
                    }
                }
            }
        }
        
        // Find the target
        const target = this.findTargetFromSyncInfo(targetInfo);
        if (!target) return;
        
        // Create visual effect
        this.createJuiceNegationEffect(target, effectName);
        
        // Add to battle log
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = targetLocalSide === 'player' ? 'success' : 'info';
        
        this.battleManager.addCombatLog(
            `🧃 ${target.name} consumes Juice to negate ${stacks} stack${stacks > 1 ? 's' : ''} of ${effectName}!`,
            logType
        );
    }

    createJuiceNegationEffect(target, effectName) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const juiceEffect = document.createElement('div');
        juiceEffect.className = 'juice-negation-effect';
        juiceEffect.innerHTML = '🧃✨';
        
        juiceEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 36px;
            z-index: 400;
            pointer-events: none;
            animation: juiceNegationBurst ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(255, 107, 107, 0.9),
                0 0 40px rgba(255, 107, 107, 0.6);
        `;
        
        targetElement.appendChild(juiceEffect);
        
        setTimeout(() => {
            if (juiceEffect && juiceEffect.parentNode) {
                juiceEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(1000));
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
        } else {
            // FIX: Update the visual indicator to show new stack count
            this.updateStatusVisualIndicator(target, effectName);
        }

        // Log the removal
        this.logStatusEffectRemoval(target, effectName, stacks, oldStacks, statusEffect.stacks);

        // Sync with guest if host
        if (this.battleManager.isAuthoritative) {
            if (statusEffect.stacks === 0) {
                this.syncStatusEffectToGuest(target, effectName, 0, 'removed');
            } else {
                // FIX: Sync the updated stack count to guest
                this.syncStatusEffectToGuest(target, effectName, statusEffect.stacks, 'updated');
            }
        }

        return true;
    }

    updateStatusVisualIndicator(target, effectName) {
        // Don't update indicators for dead targets
        const isTargetAlive = (target.type === 'hero' || !target.type) ? target.alive : target.alive;
        if (!isTargetAlive) {
            return;
        }

        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        // FIX: Force DOM update by using requestAnimationFrame to ensure removal completes
        const existingIndicator = targetElement.querySelector(`.status-indicator-${effectName}`);
        if (existingIndicator) {
            existingIndicator.remove();
            
            // Use requestAnimationFrame to ensure DOM has updated before creating new indicator
            requestAnimationFrame(() => {
                // Double-check that the indicator was actually removed
                const stillExists = targetElement.querySelector(`.status-indicator-${effectName}`);
                if (stillExists) {
                    stillExists.remove();
                }
                
                // Now create the new indicator
                this.createPersistentStatusIndicator(targetElement, target, effectName);
            });
        } else {
            // No existing indicator, create new one immediately
            this.createPersistentStatusIndicator(targetElement, target, effectName);
        }
    }

    // Refresh all status effect visuals (for guest sync)
    refreshAllStatusEffectVisuals() {        
        // Refresh player heroes
        ['left', 'center', 'right'].forEach(position => {
            if (this.battleManager.playerHeroes[position]) {
                const hero = this.battleManager.playerHeroes[position];
                
                // Restore status indicators for alive heroes
                if (hero.alive && hero.statusEffects && hero.statusEffects.length > 0) {
                    hero.statusEffects.forEach(effect => {
                        this.updateStatusVisualIndicator(hero, effect.name);
                    });
                }
                
                // Refresh creature status effects
                if (hero.creatures) {
                    hero.creatures.forEach((creature, index) => {
                        // Only restore indicators for alive creatures
                        if (creature.alive && creature.statusEffects && creature.statusEffects.length > 0) {
                            creature.statusEffects.forEach(effect => {
                                this.updateStatusVisualIndicator(creature, effect.name);
                            });
                        }
                    });
                }
            }
            
            if (this.battleManager.opponentHeroes[position]) {
                const hero = this.battleManager.opponentHeroes[position];
                
                // Restore status indicators for alive heroes
                if (hero.alive && hero.statusEffects && hero.statusEffects.length > 0) {
                    hero.statusEffects.forEach(effect => {
                        this.updateStatusVisualIndicator(hero, effect.name);
                    });
                }
                
                // Refresh creature status effects
                if (hero.creatures) {
                    hero.creatures.forEach((creature, index) => {
                        // Only restore indicators for alive creatures
                        if (creature.alive && creature.statusEffects && creature.statusEffects.length > 0) {
                            creature.statusEffects.forEach(effect => {
                                this.updateStatusVisualIndicator(creature, effect.name);
                            });
                        }
                    });
                }
            }
        });
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

        // Process damage-dealing effects first
        await this.processPoisonDamage(target);
        await this.processBurnDamage(target);

        // Process duration-based effects
        this.processSilencedDuration(target);
        this.processTauntingDuration(target);
        this.processHealBlockDuration(target);
        this.processWeakenedDuration(target);
        this.processInfightingDuration(target);

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
            // Log the skip message first
            this.battleManager.addCombatLog(
                `😵 ${target.name} is stunned and skips their turn!`,
                target.side === 'player' ? 'error' : 'success'
            );
            // Then remove the effect (which will trigger recovery message)
            this.removeStatusEffect(target, 'stunned', 1);
        } else if (skipReason === 'frozen') {
            // Log the skip message first
            this.battleManager.addCombatLog(
                `🧊 ${target.name} is frozen and skips their turn!`,
                target.side === 'player' ? 'error' : 'success'
            );
            // Then remove the effect (which will trigger recovery message)
            this.removeStatusEffect(target, 'frozen', 1);
        }
    }

    // ============================================
    // DAMAGE PROCESSING (ENHANCED WITH MEDEA)
    // ============================================

    // Process poison damage - ENHANCED with Medea interaction
    async processPoisonDamage(target) {
        const poisonStacks = this.getStatusEffectStacks(target, 'poisoned');
        if (poisonStacks === 0) return;

        const baseDamage = 10 * poisonStacks;
        
        // Apply Medea poison multiplier
        const medeaResult = this.applyMedeaPoisonMultiplier(baseDamage, target);
        const finalDamage = medeaResult.damage;
        
        // Apply damage
        if (target.type === 'hero' || !target.type) {
            // Hero damage with poison source
            await this.battleManager.authoritative_applyDamage({
                target: target,
                damage: finalDamage,
                newHp: Math.max(0, target.currentHp - finalDamage),
                died: (target.currentHp - finalDamage) <= 0
            }, { source: 'poison' }); // Pass poison source
        } else {
            // Creature damage with poison source
            this.applyCreatureDamage(target, finalDamage, 'poison');
        }

        // Create enhanced poison damage visual
        this.createStatusDamageVisuals(target, finalDamage, 'poison');

        // Create additional poison visual effect  
        this.createStatusVisualEffect(target, 'poisoned', 'damage');

        // Enhanced logging with Medea interaction
        if (medeaResult.medeaCount > 0) {
            this.battleManager.addCombatLog(
                `🐍 ${target.name} takes ${finalDamage} poison damage (${baseDamage} × ${medeaResult.multiplier} from ${medeaResult.medeaCount} enemy Medea)!`,
                target.side === 'player' ? 'error' : 'success'
            );
            
            // Additional Medea-specific visual effect
            this.createMedeaPoisonEffect(target, medeaResult.medeaCount);
        } else {
            this.battleManager.addCombatLog(
                `☠️ ${target.name} takes ${finalDamage} poison damage!`,
                target.side === 'player' ? 'error' : 'success'
            );
        }

        await this.battleManager.delay(300);
    }

    // Create special visual effect for Medea-enhanced poison
    createMedeaPoisonEffect(target, medeaCount) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const medeaEffect = document.createElement('div');
        medeaEffect.className = 'medea-poison-enhancement';
        medeaEffect.innerHTML = '🐍'.repeat(medeaCount);
        
        medeaEffect.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 16px;
            z-index: 350;
            pointer-events: none;
            animation: medeaPoisonPulse ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
            text-shadow: 
                0 0 10px rgba(128, 0, 128, 0.9),
                0 0 20px rgba(128, 0, 128, 0.6);
        `;
        
        targetElement.appendChild(medeaEffect);
        
        setTimeout(() => {
            if (medeaEffect && medeaEffect.parentNode) {
                medeaEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(1000));
    }

    // Process burn damage
    async processBurnDamage(target) {
        const burnStacks = this.getStatusEffectStacks(target, 'burned');
        if (burnStacks === 0) return;

        // LunaKiai immunity check
        if (target.type === 'creature' && target.name === 'LunaKiai') {
            return; // Skip damage but keep the status effect
        }
        if (target.type === 'creature' && target.name === 'PriestOfLuna') {
            return; // Skip damage but keep the status effect
        }

        const baseDamage = 60 * burnStacks;
        
        // Apply Medea poison multiplier
        const medeaResult = this.applyMedeaPoisonMultiplier(baseDamage, target);
        const finalDamage = medeaResult.damage;
        
        // Apply damage
        if (target.type === 'hero' || !target.type) {
            // Hero damage with burn source
            await this.battleManager.authoritative_applyDamage({
                target: target,
                damage: finalDamage,
                newHp: Math.max(0, target.currentHp - finalDamage),
                died: (target.currentHp - finalDamage) <= 0
            }, { source: 'burn' }); // Pass burn source
        } else {
            // Creature damage with burn source
            this.applyCreatureDamage(target, finalDamage, 'burn');
        }

        // Create enhanced burn damage visual
        this.createStatusDamageVisuals(target, finalDamage, 'burn');

        // Create additional burn visual effect
        this.createStatusVisualEffect(target, 'burned', 'damage');

        // Enhanced logging with Medea interaction
        if (medeaResult.medeaCount > 0) {
            this.battleManager.addCombatLog(
                `🔥 ${target.name} takes ${finalDamage} burn damage (${baseDamage} × ${medeaResult.multiplier} from ${medeaResult.medeaCount} enemy Medea)!`,
                target.side === 'player' ? 'error' : 'success'
            );
            
            // Additional Medea-specific visual effect
            this.createMedeaPoisonEffect(target, medeaResult.medeaCount);
        } else {
            this.battleManager.addCombatLog(
                `🔥 ${target.name} takes ${finalDamage} burn damage!`,
                target.side === 'player' ? 'error' : 'success'
            );
        }

        // ============================================
        // Check if Tearing Mountain prevents burn consumption
        // ============================================
        let shouldRemoveBurnStack = true;
        try {
            const { shouldPreventBurnConsumption } = await import('../Spells/tearingMountain.js');
            if (shouldPreventBurnConsumption(this.battleManager)) {
                shouldRemoveBurnStack = false;
                // Add a subtle log to indicate burn persistence (only occasionally to avoid spam)
                if (Math.random() < 0.1) { // 10% chance to show message
                    this.battleManager.addCombatLog(
                        `🗻 Tearing Mountain's presence prevents ${target.name}'s burn from fading!`,
                        'info'
                    );
                }
            }
        } catch (error) {
            // TearingMountain not available, proceed normally
        }

        // Only remove burn stack if Tearing Mountain doesn't prevent it
        if (shouldRemoveBurnStack) {
            // Remove one stack of burned after damage is applied (minimum 0)
            this.removeStatusEffect(target, 'burned', 1);
            
            // Log if burn is completely removed
            if (!this.hasStatusEffect(target, 'burned')) {
                this.battleManager.addCombatLog(
                    `🔥 ${target.name}'s burn has been extinguished!`,
                    target.side === 'player' ? 'success' : 'error'
                );
            }
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

    // Process taunting duration (decreases each turn)
    processTauntingDuration(target) {
        if (this.hasStatusEffect(target, 'taunting')) {
            this.removeStatusEffect(target, 'taunting', 1);
            
            if (!this.hasStatusEffect(target, 'taunting')) {
                this.battleManager.addCombatLog(
                    `📢 ${target.name} is no longer taunting!`,
                    target.side === 'player' ? 'success' : 'error'
                );
            }
        }
    }

    // Process heal-block duration (decreases each turn, but only for alive targets)
    processHealBlockDuration(target) {
        if (this.hasStatusEffect(target, 'healblock')) {
            this.removeStatusEffect(target, 'healblock', 1);
            
            if (!this.hasStatusEffect(target, 'healblock')) {
                this.battleManager.addCombatLog(
                    `🩹 ${target.name} is no longer heal-blocked!`,
                    target.side === 'player' ? 'success' : 'error'
                );
            }
        }
    }

    // Process weakened duration (decreases each turn)
    processWeakenedDuration(target) {
        if (this.hasStatusEffect(target, 'weakened')) {
            this.removeStatusEffect(target, 'weakened', 1);
            
            if (!this.hasStatusEffect(target, 'weakened')) {
                this.battleManager.addCombatLog(
                    `💪 ${target.name} is no longer weakened!`,
                    target.side === 'player' ? 'success' : 'error'
                );
            }
        }
    }

    // Process infighting duration (decreases each turn)
    processInfightingDuration(target) {
        if (this.hasStatusEffect(target, 'infighting')) {
            this.removeStatusEffect(target, 'infighting', 1);
            
            if (!this.hasStatusEffect(target, 'infighting')) {
                this.battleManager.addCombatLog(
                    `😤 ${target.name} is no longer infighting!`,
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
    // VISUAL EFFECTS (ENHANCED WITH MEDEA)
    // ============================================

    // Create visual effect for status application/damage
    createStatusVisualEffect(target, effectName, actionType) {
        // Don't create visual effects for dead targets
        const isTargetAlive = (target.type === 'hero' || !target.type) ? target.alive : target.alive;
        if (!isTargetAlive) {
            return;
        }

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
            stoneskin: { icon: '🗿', color: '#8B4513' },
            timeGifted: { icon: '⏰', color: '#4a90e2' },
            immortal: { icon: '✨', color: 'rgba(255, 215, 0, 0.9)' },
            silenced: { icon: '🔇', color: 'rgba(128, 128, 128, 0.9)' },
            poisoned: { icon: '☠️', color: 'rgba(128, 0, 128, 0.9)' },
            stunned: { icon: '😵', color: 'rgba(255, 255, 0, 0.9)' },
            burned: { icon: '🔥', color: 'rgba(255, 100, 0, 0.9)' },
            frozen: { icon: '🧊', color: 'rgba(100, 200, 255, 0.9)' },
            dazed: { icon: '😵‍💫', color: 'rgba(200, 150, 255, 0.9)' },
            taunting: { icon: '📢', color: 'rgba(255, 107, 107, 0.9)' },
            healblock: { icon: '🚫', color: 'rgba(220, 53, 69, 0.9)' },
            weakened: { icon: '↓', color: 'rgba(220, 53, 69, 0.9)' },
            infighting: { icon: '😡', color: 'rgba(139, 0, 0, 0.9)' },
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

    // Create persistent status indicator - ✅ FIXED
    createPersistentStatusIndicator(targetElement, target, effectName) {
        // Don't create indicators for dead targets
        const isTargetAlive = (target.type === 'hero' || !target.type) ? target.alive : target.alive;
        if (!isTargetAlive) {
            return;
        }

        // FIX: More aggressive cleanup of existing indicators for this effect
        const existingIndicators = targetElement.querySelectorAll(`.status-indicator-${effectName}`);
        existingIndicators.forEach(indicator => indicator.remove());

        const stacks = this.getStatusEffectStacks(target, effectName);
        if (stacks === 0) return;

        const indicators = {
            stoneskin: { icon: '🗿', color: '#8B4513' },
            immortal: { icon: '✨', color: '#ffd700' },
            clouded: { icon: '☁️', color: '#87ceeb' } ,
            timeGifted: { icon: '⏰', color: '#4a90e2' },
            silenced: { icon: '🔇', color: '#808080' },
            poisoned: { icon: '☠️', color: '#800080' },
            stunned: { icon: '😵', color: '#ffff00' },
            burned: { icon: '🔥', color: '#ff6400' },
            frozen: { icon: '🧊', color: '#64c8ff' },
            dazed: { icon: '😵‍💫', color: '#c896ff' },
            taunting: { icon: '📢', color: '#ff6b6b' },
            healblock: { icon: '🚫', color: '#dc3545' },
            weakened: { icon: '↘', color: '#dc3545' },
            infighting: { icon: '😡', color: '#8B0000' },

        };

        const indicator = indicators[effectName];
        if (!indicator) return;

        const statusIndicator = document.createElement('div');
        statusIndicator.className = `status-indicator status-indicator-${effectName}`;
        
        // FIX: Position indicators based on CURRENT state, not including the indicator we just removed
        const currentIndicators = targetElement.querySelectorAll('.status-indicator');
        const xOffset = currentIndicators.length * 25;
        
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

    /**
     * Create visual effect for fireshield frozen immunity
     * @param {Object} target - The target that resisted frozen
     */
    createFireshieldFrozenImmunityEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const immunityEffect = document.createElement('div');
        immunityEffect.className = 'fireshield-frozen-immunity-effect';
        immunityEffect.innerHTML = '🛡️❄️';
        
        immunityEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 32px;
            z-index: 350;
            pointer-events: none;
            animation: fireshieldImmunityFlash ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(255, 100, 0, 0.9),
                0 0 30px rgba(255, 150, 0, 0.6),
                0 0 45px rgba(100, 200, 255, 0.4);
        `;
        
        targetElement.appendChild(immunityEffect);
        
        setTimeout(() => {
            if (immunityEffect && immunityEffect.parentNode) {
                immunityEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(800));
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
    // CSS AND CLEANUP (ENHANCED WITH MEDEA)
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
            
            @keyframes medeaPoisonPulse {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) scale(1) translateY(-10px);
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
            .status-damage-effect,
            .medea-poison-enhancement {
                will-change: transform, opacity;
            }

            @keyframes fireshieldImmunityFlash {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(-10deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(5deg); 
                }
                60% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(-2deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1) rotate(0deg); 
                }
            }

            @keyframes juiceNegationBurst {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                40% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(2) rotate(360deg); 
                }
            }
            
            .fireshield-frozen-immunity-effect {
                will-change: transform, opacity;
            }

            /* Heal-block specific styling */
            .status-indicator-healblock {
                background: #dc3545 !important;
                border-color: rgba(220, 53, 69, 0.8) !important;
                animation: healBlockPulse 2s ease-in-out infinite !important;
            }
            
            @keyframes healBlockPulse {
                0%, 100% { 
                    box-shadow: 0 2px 6px rgba(220, 53, 69, 0.3);
                    transform: translateX(-50%) scale(1);
                }
                50% { 
                    box-shadow: 0 2px 8px rgba(220, 53, 69, 0.6);
                    transform: translateX(-50%) scale(1.05);
                }
            }

            @keyframes immortalRevivalBurst {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.5);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(2);
                }
            }

            @keyframes immortalGodRay {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--angle)) scaleY(0);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--angle)) scaleY(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--angle)) scaleY(0.5);
                }
            }

            @keyframes weakenedPulse {
                0%, 100% { 
                    transform: translateX(-50%) scale(1) rotate(0deg);
                    color: #dc3545;
                }
                50% { 
                    transform: translateX(-50%) scale(1.1) rotate(-5deg);
                    color: #ff6b6b;
                }
            }

            .status-indicator-weakened {
                animation: weakenedPulse 2s ease-in-out infinite !important;
                background: #dc3545 !important;
                border-color: rgba(220, 53, 69, 0.8) !important;
            }

            @keyframes dazedSwirl {
                0%, 100% { 
                    transform: translateX(-50%) scale(1) rotate(0deg);
                    color: #c896ff;
                }
                25% { 
                    transform: translateX(-50%) scale(1.05) rotate(90deg);
                    color: #e6b3ff;
                }
                50% { 
                    transform: translateX(-50%) scale(1.1) rotate(180deg);
                    color: #c896ff;
                }
                75% { 
                    transform: translateX(-50%) scale(1.05) rotate(270deg);
                    color: #e6b3ff;
                }
            }

            .status-indicator-dazed {
                animation: dazedSwirl 3s ease-in-out infinite !important;
                background: #c896ff !important;
                border-color: rgba(200, 150, 255, 0.8) !important;
            }

            @keyframes timeGiftedDeathAction {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(180deg); 
                }
                70% { 
                    opacity: 0.9; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(270deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1) rotate(360deg); 
                }
            }

            .time-gifted-death-action-effect {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
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
    }

    /**
     * Process clouded stack removal after taking damage
     * @param {Object} target - The target that took damage
     * @param {number} damageAmount - Amount of damage taken (for logging)
     */
    processCloudedAfterDamage(target, damageAmount) {
        if (!this.hasStatusEffect(target, 'clouded')) {
            return;
        }
        
        // Remove 1 stack of clouded
        this.removeStatusEffect(target, 'clouded', 1);
        
        // Log if clouded is completely removed
        if (!this.hasStatusEffect(target, 'clouded')) {
            this.battleManager.addCombatLog(
                `☁️ ${target.name}'s Clouded protection fades away!`,
                target.side === 'player' ? 'info' : 'success'
            );
        }
    }

    // ============================================
    // LOGGING
    // ============================================

    // Log status effect application
    logStatusEffectApplication(target, effectName, appliedStacks, totalStacks) {
        const definition = this.statusEffectDefinitions[effectName];
        const logType = target.side === 'error';
        
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

    // Handle guest status effect update - ✅ FIXED
    handleGuestStatusEffectUpdate(data) {
        const { targetInfo, effectName, stacks, action } = data;
        
        // Find the target
        const target = this.findTargetFromSyncInfo(targetInfo);
        if (!target) return;

        // Don't apply status effects to dead targets
        const isTargetAlive = (target.type === 'hero' || !target.type) ? target.alive : target.alive;
        if (!isTargetAlive) {
            return;
        }

        if (action === 'applied') {
            // Set the exact stacks (don't add, as this is a sync)
            this.setStatusEffectStacks(target, effectName, stacks);
            this.createStatusVisualEffect(target, effectName, 'applied');
        } else if (action === 'updated') {
            // Handle stack updates (e.g., burn reduced from 2 to 1)
            this.setStatusEffectStacks(target, effectName, stacks);
            this.updateStatusVisualIndicator(target, effectName);
        } else if (action === 'removed') {
            this.removeStatusEffectFromTarget(target, effectName);
            this.removeStatusVisualEffect(target, effectName);
        }
    }

    /**
     * Handle fireshield frozen immunity on guest side
     * @param {Object} data - Immunity event data
     */
    handleGuestFireshieldFrozenImmunity(data) {
        const { targetInfo, fireshieldStacks } = data;
        
        // Find the target
        const target = this.findTargetFromSyncInfo(targetInfo);
        if (!target) return;
        
        // Determine log type based on target side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = targetLocalSide === 'player' ? 'success' : 'info';
        
        // Create visual effect
        this.createFireshieldFrozenImmunityEffect(target);
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🛡️ ${target.name}'s Fireshield protects against the frozen effect! (${fireshieldStacks} stacks)`,
            logType
        );
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
    // BATTLE MANAGEMENT (ENHANCED WITH FIXES)
    // ============================================

    // Clear all status effects from target (battle end
    clearAllStatusEffects(target, completeClearing = false) {
    if (!target.statusEffects) return;
        
        // Determine which effects to preserve based on clearing mode
        let effectsToPreserve = [];
        
        if (!completeClearing) {
            // During battle: Preserve heal-block effects when target dies
            effectsToPreserve = target.statusEffects.filter(effect => effect.name === 'healblock');
        }
        // If completeClearing = true, preserve nothing (clear everything)
        
        // Remove visual indicators
        const targetElement = this.getTargetElement(target);
        if (targetElement) {
            const indicators = targetElement.querySelectorAll('.status-indicator');
            indicators.forEach(indicator => {
                // If complete clearing, remove all indicators
                if (completeClearing) {
                    indicator.remove();
                } else {
                    // Otherwise, only remove non-heal-block indicators
                    if (!indicator.classList.contains('status-indicator-healblock')) {
                        indicator.remove();
                    }
                }
            });
            
            // Remove any floating status effects
            const floatingEffects = targetElement.querySelectorAll(
                '.status-application-effect, .status-damage-effect, .medea-poison-enhancement'
            );
            floatingEffects.forEach(effect => effect.remove());
        }
        
        // Set status effects to preserved effects (empty array if complete clearing)
        target.statusEffects = effectsToPreserve;
        
        const isAlive = (target.type === 'hero' || !target.type) ? target.alive : target.alive;
        const clearingMode = completeClearing ? 'COMPLETE' : 'PARTIAL';
    }

    // Add a safety cleanup method to be called after death
    cleanupDeadTargetVisuals(target, completeClearing = false) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;
        
        // Remove status-related visual elements
        let selector = '.status-application-effect, .status-damage-effect, .medea-poison-enhancement';
        
        if (completeClearing) {
            // For complete clearing, remove ALL status indicators including heal-block
            selector += ', .status-indicator';
        } else {
            // For partial clearing, preserve heal-block indicators
            selector += ', .status-indicator:not(.status-indicator-healblock)';
        }
        
        const statusElements = targetElement.querySelectorAll(selector);
        statusElements.forEach(element => {
            element.remove();
        });
        
        const clearingMode = completeClearing ? 'COMPLETE' : 'PARTIAL';
    }

    // Check if attacker is weakened and should deal reduced damage
    applyWeakenedDamageReduction(attacker, baseDamage) {
        if (!this.hasStatusEffect(attacker, 'weakened')) {
            return baseDamage;
        }
        
        const weakenedStacks = this.getStatusEffectStacks(attacker, 'weakened');
        if (weakenedStacks > 0) {
            // Half damage, rounded up
            const reducedDamage = Math.ceil(baseDamage / 2);
            
            this.battleManager.addCombatLog(
                `${attacker.name} deals reduced damage due to being weakened! (${baseDamage} → ${reducedDamage})`,
                attacker.side === 'player' ? 'error' : 'success'
            );
            
            return reducedDamage;
        }
        
        return baseDamage;
    }

    /**
     * Check if hero should attack allies due to infighting
     * @param {Object} hero - Hero with potential infighting
     * @param {string} position - Hero's position
     * @returns {Object|null} - { shouldInfight: boolean, target: Object|null, skipSpellcasting: boolean }
     */
    checkInfightingEffect(hero, position) {
        if (!this.hasStatusEffect(hero, 'infighting')) {
            return { shouldInfight: false, target: null, skipSpellcasting: false };
        }
        
        const heroSide = hero.side;
        const allies = heroSide === 'player' ? 
            this.battleManager.playerHeroes : 
            this.battleManager.opponentHeroes;
        
        // Check for living ally heroes (excluding self)
        const livingAllyHeroes = [];
        ['left', 'center', 'right'].forEach(pos => {
            const allyHero = allies[pos];
            if (allyHero && allyHero.alive && pos !== position) {
                livingAllyHeroes.push({ hero: allyHero, position: pos });
            }
        });
        
        if (livingAllyHeroes.length > 0) {
            // Random ally hero
            const randomAlly = this.battleManager.getRandomChoice(livingAllyHeroes);
            
            this.battleManager.addCombatLog(
                `💢 ${hero.name} is overcome with rage and attacks ally ${randomAlly.hero.name}!`,
                heroSide === 'player' ? 'error' : 'warning'
            );
            
            return {
                shouldInfight: true,
                skipSpellcasting: true,
                target: {
                    type: 'hero',
                    hero: randomAlly.hero,
                    position: randomAlly.position,
                    side: heroSide // Same side as attacker!
                }
            };
        }
        
        // Check for living ally creatures
        const livingAllyCreatures = [];
        ['left', 'center', 'right'].forEach(pos => {
            const allyHero = allies[pos];
            if (allyHero && allyHero.creatures) {
                allyHero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        livingAllyCreatures.push({
                            hero: allyHero,
                            creature: creature,
                            creatureIndex: index,
                            position: pos
                        });
                    }
                });
            }
        });
        
        if (livingAllyCreatures.length > 0) {
            // Random ally creature
            const randomCreature = this.battleManager.getRandomChoice(livingAllyCreatures);
            
            this.battleManager.addCombatLog(
                `💢 ${hero.name} is overcome with rage and attacks ally ${randomCreature.creature.name}!`,
                heroSide === 'player' ? 'error' : 'warning'
            );
            
            return {
                shouldInfight: true,
                skipSpellcasting: true,
                target: {
                    type: 'creature',
                    hero: randomCreature.hero,
                    creature: randomCreature.creature,
                    creatureIndex: randomCreature.creatureIndex,
                    position: randomCreature.position,
                    side: heroSide // Same side as attacker!
                }
            };
        }
        
        // No allies to attack - proceed normally
        return { shouldInfight: false, target: null, skipSpellcasting: false };
    }

    /**
     * Check if target has timeGifted and should take a final action before death
     * @param {Object} target - The target that would die
     * @param {Object} context - Damage context
     * @returns {boolean} - True if timeGifted was processed
     */
    async checkAndProcessTimeGiftedDeathAction(target, context = {}) {
        if (!this.battleManager.isAuthoritative) return false;
        
        // Check if target has timeGifted
        const timeGiftedStacks = this.getStatusEffectStacks(target, 'timeGifted');
        if (timeGiftedStacks === 0) return false;
        
        // Remove one stack of timeGifted
        this.removeStatusEffect(target, 'timeGifted', 1);
        
        // Create visual effect
        this.createTimeGiftedDeathActionEffect(target);
        
        // Log the effect
        this.battleManager.addCombatLog(
            `⏰ ${target.name}'s Time Gifted grants one final action before death!`,
            target.side === 'player' ? 'info' : 'warning'
        );
        
        // Sync to guest if host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('time_gifted_death_action', {
                targetInfo: this.getTargetSyncInfo(target),
                remainingStacks: this.getStatusEffectStacks(target, 'timeGifted'),
                timestamp: Date.now()
            });
        }
        
        // Add a brief delay to let the death register visually before the surprise action
        await this.battleManager.delay(400);
        
        // Execute the additional action based on target type
        try {
            if (target.type === 'hero' || !target.type) {
                // Hero additional action
                if (this.battleManager.combatManager) {
                    await this.battleManager.combatManager.executeAdditionalAction(target, target.position);
                }
            } else {
                // Creature additional action - need to find the creature's hero and create actor
                const creatureInfo = this.findCreatureInfo(target);
                if (creatureInfo && this.battleManager.flowManager) {
                    // Store original HP and temporarily set to 1 so creature can act
                    const originalHp = target.currentHp;
                    target.currentHp = 1;
                    
                    try {
                        const actor = {
                            type: 'creature',
                            name: target.name,
                            data: target,
                            index: creatureInfo.creatureIndex,
                            hero: creatureInfo.hero
                        };
                        this.battleManager.flowManager.activateCreatureSpecialAttack(actor, creatureInfo.position);
                        await this.battleManager.delay(100);
                    } finally {
                        // Always restore original HP regardless of success/failure
                        target.currentHp = originalHp;
                    }
                }
            }
        } catch (error) {
            console.error('Error during timeGifted death action:', error);
        }
        
        return true; // Indicates that timeGifted was processed
    }

    /**
     * Create visual effect for timeGifted death action
     * @param {Object} target - The target using timeGifted
     */
    createTimeGiftedDeathActionEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const timeEffect = document.createElement('div');
        timeEffect.className = 'time-gifted-death-action-effect';
        timeEffect.innerHTML = '⏰💫';
        
        timeEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 40px;
            z-index: 500;
            pointer-events: none;
            animation: timeGiftedDeathAction ${this.battleManager.getSpeedAdjustedDelay(1500)}ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(74, 144, 226, 0.9),
                0 0 40px rgba(74, 144, 226, 0.6);
        `;
        
        targetElement.appendChild(timeEffect);
        
        setTimeout(() => {
            if (timeEffect && timeEffect.parentNode) {
                timeEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(1500));
    }

    /**
     * Handle timeGifted death action on guest side
     * @param {Object} data - Sync data from host
     */
    guest_handleTimeGiftedDeathAction(data) {
        if (this.battleManager.isAuthoritative) return;

        const { targetInfo, remainingStacks } = data;
        
        // Find the target
        const target = this.findTargetFromSyncInfo(targetInfo);
        if (!target) return;
        
        // Update timeGifted stacks
        this.setStatusEffectStacks(target, 'timeGifted', remainingStacks);
        
        // Create visual effect
        this.createTimeGiftedDeathActionEffect(target);
        
        // Add to battle log
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = targetLocalSide === 'player' ? 'info' : 'warning';
        
        this.battleManager.addCombatLog(
            `⏰ ${target.name}'s Time Gifted grants one final action before death!`,
            logType
        );
    }

    /**
     * Helper method to find creature info (already exists but may need to be accessible)
     */
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

    // Clear all status effects from all targets (battle end)
    clearAllBattleStatusEffects() {        
        // Clear from all heroes with COMPLETE clearing
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                
                if (hero) {
                    // Use complete clearing for battle end
                    this.clearAllStatusEffects(hero, true);
                    
                    // Clear from hero's creatures with COMPLETE clearing
                    if (hero.creatures) {
                        hero.creatures.forEach(creature => {
                            // Use complete clearing for battle end
                            this.clearAllStatusEffects(creature, true);
                        });
                    }
                }
            });
        });
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.clearAllBattleStatusEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('statusEffectsCSS');
        if (css) css.remove();
    }

    // ============================================
    // EXPORT/IMPORT FOR PERSISTENCE (ENHANCED)
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

    updateCreatureStatusIndicator(creature, effectName) {
        if (!creature.alive) return;
        this.updateStatusVisualIndicator(creature, effectName);
    }

    // Restore visual effects for all existing status effects
    restoreAllStatusVisualEffects() {       
        // Restore for all heroes
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                
                // SAFETY: Only restore indicators for alive heroes with status effects
                if (hero && hero.alive && hero.statusEffects && hero.statusEffects.length > 0) {
                    hero.statusEffects.forEach(effect => {
                        this.createPersistentStatusIndicator(
                            this.getTargetElement(hero), hero, effect.name
                        );
                    });
                }
                
                // Restore for creatures
                if (hero && hero.creatures) {
                    hero.creatures.forEach(creature => {
                        // Only restore indicators for alive creatures with status effects
                        if (creature.alive && creature.statusEffects && creature.statusEffects.length > 0) {
                            creature.statusEffects.forEach(effect => {
                                this.createPersistentStatusIndicator(
                                    this.getTargetElement(creature), creature, effect.name
                                );
                            });
                        } else if (!creature.alive && creature.statusEffects && creature.statusEffects.length > 0) {
                            // Log warning if dead creature has status effects (shouldn't happen after fix)
                            console.warn(`⚠️ Dead creature ${creature.name} still has ${creature.statusEffects.length} status effects - clearing them now!`);
                            // Emergency cleanup
                            creature.statusEffects = [];
                        }
                    });
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