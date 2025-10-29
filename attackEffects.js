// attackEffects.js - Centralized Attack Effects Handler with FutureTechFists
import { TheMastersSwordEffect } from './Artifacts/theMastersSword.js';
import { registerTheSunSword } from './Artifacts/theSunSword.js';
import { skullmaelsGreatswordArtifact } from './Artifacts/skullmaelsGreatsword.js';
import { FutureTechFistsArtifact } from './Artifacts/futureTechFists.js';
import ArrowSystem from './arrowSystem.js';
import { registerTheStormblade } from './Artifacts/theStormblade.js';

export class AttackEffectsManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        // Registry of attack effect handlers
        this.effectHandlers = new Map();
        
        // Registry of damage modifier handlers
        this.damageModifiers = new Map();
        
        // Equip effect instances
        this.mastersSwordEffect = new TheMastersSwordEffect(this.battleManager);
        this.sunSwordEffect = null;
        this.skullmaelsGreatswordArtifact = skullmaelsGreatswordArtifact;
        this.futureTechFistsArtifact = new FutureTechFistsArtifact(this.battleManager);
        this.stormbladeEffect = null;

        // Arrow System
        this.arrowSystem = new ArrowSystem(this.battleManager);
        
        // Flag to prevent multiple skeleton summons per attack
        this._skeletonSummonedThisAttack = false;

        // Register built-in handlers
        this.registerBuiltInHandlers();
    }
    
    // Register built-in effect handlers
    registerBuiltInHandlers() {  
        // Register BladeOfTheFrostbringer handler
        this.registerEffectHandler('BladeOfTheFrostbringer', {
            trigger: 'on_attack_hit',
            handler: this.handleBladeOfTheFrostbringer.bind(this)
        });

        // Register BladeOfTheSwampWitch handler
        this.registerEffectHandler('BladeOfTheSwampWitch', {
            trigger: 'on_attack_hit',
            handler: this.handleBladeOfTheSwampWitch.bind(this)
        });
        
        // Register SkullmaelsGreatsword handler
        this.registerEffectHandler('SkullmaelsGreatsword', {
            trigger: 'on_attack_hit',
            handler: this.handleSkullmaelsGreatsword.bind(this)
        });
        
        // Register FutureTechFists handler
        this.registerEffectHandler('FutureTechFists', {
            trigger: 'on_attack_hit',
            handler: this.handleFutureTechFists.bind(this)
        });
        
        // Register Equip item effects
        this.registerDamageModifier('TheMastersSword', {
            handler: this.handleMastersSwordDamage.bind(this)
        });
        this.sunSwordEffect = registerTheSunSword(this, this.battleManager); 

        this.stormbladeEffect = registerTheStormblade(this, this.battleManager);

    }
    
    // Register a new attack effect handler
    registerEffectHandler(effectName, handlerConfig) {
        this.effectHandlers.set(effectName, handlerConfig);
    }
    
    // Register a damage modifier handler
    registerDamageModifier(modifierName, config) {
        this.damageModifiers.set(modifierName, config);
    }
    
    // Calculate damage modifications BEFORE damage is applied
    calculateDamageModifiers(attacker, target, baseDamage) {
        if (!attacker || !attacker.alive || baseDamage <= 0) {
            return { modifiedDamage: baseDamage, effectsTriggered: [] };
        }
        
        let modifiedDamage = baseDamage;
        const effectsTriggered = [];
        
        // Check for TheMastersSword
        if (this.mastersSwordEffect && attacker.equipment && attacker.equipment.length > 0) {
            const swordCount = this.mastersSwordEffect.countMastersSwords(attacker);
            
            if (swordCount > 0 && this.mastersSwordEffect.shouldTrigger(attacker)) {
                const multiplier = this.mastersSwordEffect.calculateMultiplier(swordCount);
                modifiedDamage = Math.floor(baseDamage * multiplier);
                
                effectsTriggered.push({
                    name: 'TheMastersSword',
                    swordCount: swordCount,
                    multiplier: multiplier,
                    target: target
                });
            }
        }
        
        // Check for Arrow System effects
        if (this.arrowSystem) {
            const arrowResult = this.arrowSystem.calculateArrowDamageBonus(attacker, target, modifiedDamage);
            modifiedDamage = arrowResult.modifiedDamage;
            effectsTriggered.push(...arrowResult.effectsTriggered);
        }
        
        return { modifiedDamage, effectsTriggered };
    }
    
    // Apply visual effects for triggered damage modifiers
    applyDamageModifierEffects(effectsTriggered) {
        effectsTriggered.forEach(effect => {
            if (effect.name === 'TheMastersSword' && this.mastersSwordEffect) {
                this.mastersSwordEffect.createSwordSlashAnimation(
                    effect.target,
                    effect.swordCount,
                    effect.multiplier
                );
                
                // Add combat log message
                this.battleManager.addCombatLog(
                    `The Master's Sword activates! Damage ×${effect.multiplier}!`,
                    'success'
                );
            }
        });
    }
    
    // Handler for TheMastersSword damage modification
    handleMastersSwordDamage(attacker, target, baseDamage) {
        // This is handled in calculateDamageModifiers
        // Kept for consistency with the registration pattern
        return baseDamage;
    }
    
    // Handler for FutureTechFists effect
    async handleFutureTechFists(attacker, defender, damage, equipmentItem) {
        if (this.futureTechFistsArtifact) {
            await this.futureTechFistsArtifact.handleFutureTechFistsEffect(
                attacker, defender, damage, equipmentItem
            );
        }
    }
    
    // Process all attack effects when an attack lands
    async processAttackEffects(attacker, defender, damage, attackType = 'basic', effectsTriggered = []) {
        // Reset skeleton summon flag at start of each attack
        this._skeletonSummonedThisAttack = false;
        
        // Only process effects for living attackers and defenders
        if (!attacker || !attacker.alive || !defender) return;
        
        // Skip if attack was blocked (damage = 0 from toxic trap, etc)
        if (damage <= 0) return;
        
        // Only process for basic attacks (not spells, not status damage)
        if (attackType !== 'basic') return;
        
        // Process arrow effects from damage calculation
        if (this.arrowSystem && effectsTriggered && effectsTriggered.length > 0) {
            const arrowEffects = effectsTriggered.filter(effect => effect.arrowType);
            if (arrowEffects.length > 0) {
                await this.arrowSystem.processArrowAttackEffects(attacker, defender, damage, arrowEffects);
            }
        }

        await this.processElixirOfColdFreeze(attacker, defender, damage);
        
        // Get all equipment-based attack effects from the attacker
        const attackEffects = this.getAttackerEffects(attacker);
        
        if (attackEffects.length === 0) return;
                
        // Process each effect
        for (const effect of attackEffects) {
            await this.processIndividualEffect(effect, attacker, defender, damage);
        }
    }
    
    // Get all attack effects from attacker's equipment
    getAttackerEffects(attacker) {
        const effects = [];
        
        // Check if attacker is a hero with equipment
        if (!attacker.equipment || attacker.equipment.length === 0) {
            return effects;
        }
        
        // Check each piece of equipment
        attacker.equipment.forEach(equip => {
            const equipName = equip.name || equip.cardName;
            
            // Check if this equipment has a registered effect handler
            if (this.effectHandlers.has(equipName)) {
                effects.push({
                    name: equipName,
                    source: equip,
                    handler: this.effectHandlers.get(equipName)
                });
            }
        });
        
        return effects;
    }
    
    // Process an individual attack effect
    async processIndividualEffect(effect, attacker, defender, damage) {
        const handler = effect.handler;
        
        // Check trigger condition
        if (handler.trigger !== 'on_attack_hit') return;
        
        // Execute the handler
        try {
            await handler.handler(attacker, defender, damage, effect.source);
        } catch (error) {
            console.error(`Error processing attack effect ${effect.name}:`, error);
        }
    }
    
    // ============================================
    // SPECIFIC EFFECT HANDLERS
    // ============================================

    // Handler for BladeOfTheSwampWitch effect
    async handleBladeOfTheSwampWitch(attacker, defender, damage, equipmentItem) {
        // Always apply 1 stack of poisoned (100% chance, no RNG)
        if (this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.applyStatusEffect(defender, 'poisoned', 1);
        }
        
        // Create poison cloud visual effect
        this.createPoisonCloudEffect(defender);
        
        // Add combat log message
        this.battleManager.addCombatLog(
            `${attacker.name}'s Blade of the Swamp Witch poisons ${defender.name}!`,
            'info'
        );
        
        // Send update to guest if host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('blade_swamp_witch_triggered', {
                attackerAbsoluteSide: attacker.absoluteSide,
                attackerPosition: attacker.position,
                defenderInfo: this.getDefenderSyncInfo(defender),
                timestamp: Date.now()
            });
        }
    }
    
    // Handler for BladeOfTheFrostbringer effect
    async handleBladeOfTheFrostbringer(attacker, defender, damage, equipmentItem) {
        // 20% chance to trigger
        const triggerChance = 0.20;
        const roll = this.battleManager.getRandom();
        
        if (roll > triggerChance) {
            return; // No trigger
        }
        
        // Apply 1 stack of frozen

        // Apply frozen status
        if (this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.applyStatusEffect(defender, 'frozen', 1);
        }
        
        // Create ice burst visual effect
        this.createIceBurstEffect(defender);
        
        // Add combat log message
        this.battleManager.addCombatLog(
            `${attacker.name}'s Blade of the Frostbringer freezes ${defender.name}!`,
            'info'
        );
        
        // Send update to guest if host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('blade_frost_triggered', {
                attackerAbsoluteSide: attacker.absoluteSide,
                attackerPosition: attacker.position,
                defenderInfo: this.getDefenderSyncInfo(defender),
                timestamp: Date.now()
            });
        }
    }

    async processElixirOfColdFreeze(attacker, defender, damage) {
        // Check if attacker has elixirOfCold status effect
        if (!this.battleManager.statusEffectsManager) return;
        
        const elixirStacks = this.battleManager.statusEffectsManager.getStatusEffectStacks(attacker, 'elixirOfCold');
        if (elixirStacks === 0) return;
        
        // Roll for each stack independently (50% chance each)
        let freezeSuccess = false;
        for (let i = 0; i < elixirStacks; i++) {
            const roll = this.battleManager.getRandom();
            if (roll <= 0.50) { // 50% chance per stack
                freezeSuccess = true;
                break; // Only apply 1 stack of frozen max per attack
            }
        }
        
        if (freezeSuccess) {            
            // Apply frozen status
            this.battleManager.statusEffectsManager.applyStatusEffect(defender, 'frozen', 1);
            
            // Reuse the same visual effect as BladeOfTheFrostbringer
            this.createIceBurstEffect(defender);
            
            // Add combat log message
            this.battleManager.addCombatLog(
                `❄️ ${attacker.name}'s Elixir of Cold freezes ${defender.name}!`,
                attacker.side === 'player' ? 'success' : 'error'
            );
            
            // Send update to guest if host
            if (this.battleManager.isAuthoritative) {
                this.battleManager.sendBattleUpdate('elixir_cold_freeze', {
                    attackerAbsoluteSide: attacker.absoluteSide,
                    attackerPosition: attacker.position,
                    defenderInfo: this.getDefenderSyncInfo(defender),
                    elixirStacks: elixirStacks,
                    timestamp: Date.now()
                });
            }
        }
    }

    handleGuestElixirColdFreeze(data) {
        const { defenderInfo, elixirStacks } = data;
        
        // Find the defender
        const defender = this.findDefenderFromSyncInfo(defenderInfo);
        if (!defender) return;
        
        // Create the visual effect (reuse ice burst)
        this.createIceBurstEffect(defender);
        
        // Add to combat log
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const attackerLocalSide = data.attackerAbsoluteSide === myAbsoluteSide ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `❄️ Elixir of Cold freezes the target! (${elixirStacks} stacks)`,
            attackerLocalSide === 'player' ? 'success' : 'error'
        );
    }
    
    // Handler for SkullmaelsGreatsword effect
    async handleSkullmaelsGreatsword(attacker, defender, damage, equipmentItem) {
        // Only process if we're the authoritative host
        if (!this.battleManager.isAuthoritative) return;
        
        // Check if this specific sword should trigger (20% chance)
        const triggerChance = 0.20;
        const roll = this.battleManager.getRandom();
        
        if (roll > triggerChance) {
            return; // This sword didn't trigger
        }
        
        // Check if we've already summoned a skeleton this attack
        // (Multiple swords can be equipped but only one skeleton summons)
        if (this._skeletonSummonedThisAttack) {
            return;
        }
        
        // Mark that we're summoning a skeleton for this attack
        this._skeletonSummonedThisAttack = true;
                
        // Execute the skeleton summon
        if (this.skullmaelsGreatswordArtifact) {
            // Get a random skeleton and summon it
            const skeletonCard = this.skullmaelsGreatswordArtifact.getRandomSkeletonCard(this.battleManager);
            if (skeletonCard) {
                await this.skullmaelsGreatswordArtifact.executeSkeletonSummon(attacker, this.battleManager);
            }
        }
    }
    
    // Create ice burst visual effect
    createIceBurstEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;
        
        // Create ice burst container
        const iceBurst = document.createElement('div');
        iceBurst.className = 'blade-frost-burst';
        
        // Create multiple ice shards
        const shardCount = 6;
        for (let i = 0; i < shardCount; i++) {
            const shard = document.createElement('div');
            shard.className = 'ice-shard';
            shard.innerHTML = '❄️';
            
            // Random angle for each shard
            const angle = (360 / shardCount) * i + (Math.random() * 30 - 15);
            const distance = 30 + Math.random() * 20;
            
            shard.style.cssText = `
                position: absolute;
                font-size: ${16 + Math.random() * 8}px;
                animation: iceShardFly ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 500;
            `;
            
            iceBurst.appendChild(shard);
        }
        
        // Position the burst at target center
        iceBurst.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 500;
        `;
        
        targetElement.appendChild(iceBurst);
        
        // Add freezing overlay effect
        const freezeOverlay = document.createElement('div');
        freezeOverlay.className = 'blade-frost-overlay';
        freezeOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(100, 200, 255, 0.4) 0%, transparent 70%);
            pointer-events: none;
            z-index: 490;
            animation: bladeFrostPulse ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
        `;
        
        targetElement.appendChild(freezeOverlay);
        
        // Clean up after animation
        setTimeout(() => {
            if (iceBurst.parentNode) iceBurst.remove();
            if (freezeOverlay.parentNode) freezeOverlay.remove();
        }, this.battleManager.getSpeedAdjustedDelay(800));
    }

    // Create poison cloud visual effect
    createPoisonCloudEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;
        
        // Create poison cloud container
        const poisonCloud = document.createElement('div');
        poisonCloud.className = 'blade-swamp-witch-cloud';
        
        // Create multiple poison particles
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'poison-particle';
            particle.innerHTML = '☠️';
            
            // Random angle for each particle
            const angle = (360 / particleCount) * i + (Math.random() * 30 - 15);
            const distance = 20 + Math.random() * 15;
            
            particle.style.cssText = `
                position: absolute;
                font-size: ${12 + Math.random() * 6}px;
                animation: poisonParticleDrift ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 500;
            `;
            
            poisonCloud.appendChild(particle);
        }
        
        // Position the cloud at target center
        poisonCloud.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 500;
        `;
        
        targetElement.appendChild(poisonCloud);
        
        // Add poison overlay effect
        const poisonOverlay = document.createElement('div');
        poisonOverlay.className = 'blade-swamp-witch-overlay';
        poisonOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(128, 0, 128, 0.4) 0%, transparent 70%);
            pointer-events: none;
            z-index: 490;
            animation: bladeSwampWitchPulse ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
        `;
        
        targetElement.appendChild(poisonOverlay);
        
        // Clean up after animation
        setTimeout(() => {
            if (poisonCloud.parentNode) poisonCloud.remove();
            if (poisonOverlay.parentNode) poisonOverlay.remove();
        }, this.battleManager.getSpeedAdjustedDelay(1000));
    }
    
    // Get target element
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
    
    // Find creature information
    findCreatureInfo(creature) {
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            
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
    
    // Get defender sync info for network updates
    getDefenderSyncInfo(defender) {
        if (defender.type === 'hero' || !defender.type) {
            return {
                type: 'hero',
                absoluteSide: defender.absoluteSide,
                position: defender.position,
                name: defender.name
            };
        } else {
            const creatureInfo = this.findCreatureInfo(defender);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                absoluteSide: creatureInfo.hero.absoluteSide,
                position: creatureInfo.position,
                creatureIndex: creatureInfo.creatureIndex,
                name: defender.name
            };
        }
    }
    
    // Handle guest update for blade frost trigger
    handleGuestBladeFrostTrigger(data) {
        const { defenderInfo } = data;
        
        // Find the defender
        const defender = this.findDefenderFromSyncInfo(defenderInfo);
        if (!defender) return;
        
        // Create the visual effect
        this.createIceBurstEffect(defender);
    }

    // Handle guest update for blade swamp witch trigger
    handleGuestBladeSwampWitchTrigger(data) {
        const { defenderInfo } = data;
        
        // Find the defender
        const defender = this.findDefenderFromSyncInfo(defenderInfo);
        if (!defender) return;
        
        // Create the visual effect
        this.createPoisonCloudEffect(defender);
    }
    
    // Find defender from sync info
    findDefenderFromSyncInfo(defenderInfo) {
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (defenderInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (defenderInfo.type === 'hero') {
            const heroes = localSide === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            return heroes[defenderInfo.position];
        } else {
            const heroes = localSide === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            const hero = heroes[defenderInfo.position];
            return hero?.creatures?.[defenderInfo.creatureIndex];
        }
    }

    /**
     * Reset all attack effects for new battle
     */
    resetForNewBattle() {
        // Reset FutureTechFists usage counter
        if (this.futureTechFistsArtifact) {
            this.futureTechFistsArtifact.resetUsageForNewBattle();
        }

        // Reset other effects if needed
        this._skeletonSummonedThisAttack = false;
    }

    /**
     * Export state for checkpoint system
     * @returns {Object} State data
     */
    exportState() {
        const state = {};

        // Export FutureTechFists state
        if (this.futureTechFistsArtifact) {
            state.futureTechFists = this.futureTechFistsArtifact.exportState();
        }

        // Export Arrow System state
        if (this.arrowSystem) {
            state.arrowSystem = this.arrowSystem.exportArrowState();
        }

        // Export other effect states as needed
        return state;
    }

    /**
     * Import state from checkpoint system
     * @param {Object} state - State data to import
     */
    importState(state) {
        if (!state) return;

        // Import FutureTechFists state
        if (state.futureTechFists && this.futureTechFistsArtifact) {
            this.futureTechFistsArtifact.importState(state.futureTechFists);
        }

        // Import Arrow System state
        if (state.arrowSystem && this.arrowSystem) {
            this.arrowSystem.importArrowState(state.arrowSystem);
        }
    }
    
    // Ensure CSS for attack effects including shield damage numbers
    ensureAttackEffectsCSS() {
        if (document.getElementById('attackEffectsCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'attackEffectsCSS';
        style.textContent = `
            @keyframes iceShardFly {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(0deg) scale(0);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(180deg) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: 
                        translate(
                            calc(-50% + var(--distance) * cos(var(--angle))), 
                            calc(-50% + var(--distance) * sin(var(--angle)))
                        ) 
                        rotate(360deg) 
                        scale(0.3);
                }
            }
            
            @keyframes bladeFrostPulse {
                0% {
                    opacity: 0;
                    transform: scale(0.8);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.1);
                }
                100% {
                    opacity: 0;
                    transform: scale(1);
                }
            }
            
            .blade-frost-burst {
                will-change: transform, opacity;
            }
            
            .ice-shard {
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: center;
                filter: drop-shadow(0 0 4px rgba(100, 200, 255, 0.8));
                will-change: transform, opacity;
            }
            
            .blade-frost-overlay {
                will-change: transform, opacity;
                mix-blend-mode: screen;
            }

            /* Shield Damage Numbers */
            .damage-number.shield_damage {
                color: #00ccff !important;
                text-shadow: 
                    2px 2px 0 #000000,
                    0 0 10px #00ccff,
                    0 0 20px #0099cc !important;
                border: 2px solid #00ccff;
                background: rgba(0, 204, 255, 0.2) !important;
            }

            .damage-number.shield_damage::before {
                content: "🛡️ ";
            }

            @keyframes poisonParticleDrift {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(0deg) scale(0);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(120deg) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: 
                        translate(
                            calc(-50% + var(--distance) * cos(var(--angle))), 
                            calc(-50% + var(--distance) * sin(var(--angle)))
                        ) 
                        rotate(240deg) 
                        scale(0.3);
                }
            }

            @keyframes bladeSwampWitchPulse {
                0% {
                    opacity: 0;
                    transform: scale(0.8);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.1);
                }
                100% {
                    opacity: 0;
                    transform: scale(1);
                }
            }

            .blade-swamp-witch-cloud {
                will-change: transform, opacity;
            }

            .poison-particle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: center;
                filter: drop-shadow(0 0 4px rgba(128, 0, 128, 0.8));
                will-change: transform, opacity;
            }

            .blade-swamp-witch-overlay {
                will-change: transform, opacity;
                mix-blend-mode: screen;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Initialize (called when battle starts)
    init() {
        this.ensureAttackEffectsCSS();
        
        // Initialize the arrow system after AttackEffectsManager is ready
        if (this.arrowSystem) {
            this.arrowSystem.init();
        }

        // Initialize FutureTechFists artifact
        if (this.futureTechFistsArtifact) {
            this.futureTechFistsArtifact.init();
        }

        // Reset for new battle
        this.resetForNewBattle();
    }
    
    // Cleanup
    cleanup() {
        this.effectHandlers.clear();
        this.damageModifiers.clear();
        
        if (this.mastersSwordEffect) {
            this.mastersSwordEffect.cleanup();
            this.mastersSwordEffect = null;
        }

        if (this.sunSwordEffect) {
            this.sunSwordEffect.cleanup();
            this.sunSwordEffect = null;
        }
        
        if (this.skullmaelsGreatswordArtifact) {
            this.skullmaelsGreatswordArtifact = null;
        }

        if (this.futureTechFistsArtifact) {
            this.futureTechFistsArtifact.cleanup();
            this.futureTechFistsArtifact = null;
        }

        // Arrow System cleanup
        if (this.arrowSystem) {
            this.arrowSystem.cleanup();
            this.arrowSystem = null;
        }
        
        this._skeletonSummonedThisAttack = false;
        
        const css = document.getElementById('attackEffectsCSS');
        if (css) css.remove();
    }
}

// Export for use in battleManager
export default AttackEffectsManager;