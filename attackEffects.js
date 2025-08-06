// attackEffects.js - Centralized Attack Effects Handler
import { TheMastersSwordEffect } from './Artifacts/theMastersSword.js';
import { registerTheSunSword } from './Artifacts/theSunSword.js';

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

        // Register built-in handlers
        this.registerBuiltInHandlers();
        
        console.log('⚔️ AttackEffectsManager initialized');
    }
    
    // Register built-in effect handlers
    registerBuiltInHandlers() {  
        // Register BladeOfTheFrostbringer handler
        this.registerEffectHandler('BladeOfTheFrostbringer', {
            trigger: 'on_attack_hit',
            handler: this.handleBladeOfTheFrostbringer.bind(this)
        });
        
        // Register TheMastersSword damage modifier
        this.registerDamageModifier('TheMastersSword', {
            handler: this.handleMastersSwordDamage.bind(this)
        });
        
        // Register TheSunSword effect  // <-- ADD THIS
        this.sunSwordEffect = registerTheSunSword(this, this.battleManager);  // <-- ADD THIS
        
        console.log('⚔️ TheMastersSword and TheSunSword effects registered');  // <-- MODIFY THIS
    }
    
    // Register a new attack effect handler
    registerEffectHandler(effectName, handlerConfig) {
        this.effectHandlers.set(effectName, handlerConfig);
        console.log(`📝 Registered attack effect handler: ${effectName}`);
    }
    
    // Register a damage modifier handler
    registerDamageModifier(modifierName, config) {
        this.damageModifiers.set(modifierName, config);
        console.log(`📝 Registered damage modifier: ${modifierName}`);
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
                
                console.log(`⚔️ TheMastersSword: ${swordCount} sword(s) → ×${multiplier} damage (${baseDamage} → ${modifiedDamage})`);
            }
        }
        
        // Future damage modifiers can be added here
        
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
                    `⚔️ The Master's Sword activates! Damage ×${effect.multiplier}!`,
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
    
    // Process all attack effects when an attack lands
    async processAttackEffects(attacker, defender, damage, attackType = 'basic') {
        // Only process effects for living attackers and defenders
        if (!attacker || !attacker.alive || !defender) return;
        
        // Skip if attack was blocked (damage = 0 from toxic trap, etc)
        if (damage <= 0) return;
        
        // Only process for basic attacks (not spells, not status damage)
        if (attackType !== 'basic') return;
        
        // Get all equipment-based attack effects from the attacker
        const attackEffects = this.getAttackerEffects(attacker);
        
        if (attackEffects.length === 0) return;
        
        console.log(`🎯 Processing ${attackEffects.length} attack effects for ${attacker.name}`);
        
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
    
    // Handler for BladeOfTheFrostbringer effect
    async handleBladeOfTheFrostbringer(attacker, defender, damage, equipmentItem) {
        // 20% chance to trigger
        const triggerChance = 0.20;
        const roll = this.battleManager.getRandom();
        
        if (roll > triggerChance) {
            return; // No trigger
        }
        
        // Apply 1 stack of frozen
        console.log(`❄️ BladeOfTheFrostbringer triggers! Freezing ${defender.name}`);
        
        // Apply frozen status
        if (this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.applyStatusEffect(defender, 'frozen', 1);
        }
        
        // Create ice burst visual effect
        this.createIceBurstEffect(defender);
        
        // Add combat log message
        this.battleManager.addCombatLog(
            `❄️ ${attacker.name}'s Blade of the Frostbringer freezes ${defender.name}!`,
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
    
    // Ensure CSS for attack effects
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
        `;
        
        document.head.appendChild(style);
    }
    
    // Initialize (called when battle starts)
    init() {
        this.ensureAttackEffectsCSS();
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
        
        const css = document.getElementById('attackEffectsCSS');
        if (css) css.remove();
        
        console.log('⚔️ AttackEffectsManager cleaned up');
    }
}

// Export for use in battleManager
export default AttackEffectsManager;