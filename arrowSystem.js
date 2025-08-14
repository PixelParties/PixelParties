// arrowSystem.js - Centralized Arrow Management System
// Handles all arrow types that follow the pattern: equip count -> counters -> consume on attack
import { applyGoldenArrowIntegration } from './Artifacts/goldenArrow.js';
import { applyAngelfeatherArrowIntegration } from './Artifacts/angelfeatherArrow.js';
import { applyBombArrowIntegration } from './Artifacts/bombArrow.js';
import { applyPoisonedArrowIntegration } from './Artifacts/poisonedArrow.js';
import { applyRacketArrowIntegration } from './Artifacts/racketArrow.js';
import { applyRainbowsArrowIntegration } from './Artifacts/rainbowsArrow.js';

export class ArrowSystem {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        // Registry of arrow type definitions
        this.arrowTypes = new Map();
        
        // Hero arrow counters: Map<heroId, Map<arrowType, count>>
        this.heroCounters = new Map();
        
        // Visual display cache
        this.displayElements = new Map();
        
        // Register built-in arrow types
        this.registerBuiltInArrows();
        
        console.log('🏹 ArrowSystem initialized');
    }

    // ============================================
    // ARROW TYPE REGISTRATION
    // ============================================

    /**
     * Register a new arrow type
     * @param {Object} config - Arrow configuration
     */
    registerArrowType(config) {
        // Validate required fields
        if (!config.name || !config.displayName) {
            console.error('❌ Arrow config missing required fields:', config);
            return false;
        }

        // Set defaults
        const arrowConfig = {
            // Required
            name: config.name,
            displayName: config.displayName,
            
            // Visual
            icon: config.icon || '🏹',
            counterDisplay: config.counterDisplay || {
                background: 'linear-gradient(45deg, #666, #888)',
                borderColor: '#aaa',
                shadowColor: 'rgba(128, 128, 128, 0.6)'
            },
            
            // Effects
            damageBonus: config.damageBonus || 0,
            statusEffects: config.statusEffects || [], // [{type: 'burned', stacks: 1}]
            
            // Visual effects
            impactEffect: config.impactEffect || null, // Function to create visual effect
            
            // Network sync
            syncMessageType: config.syncMessageType || `${config.name.toLowerCase()}_impact`,
            
            // Custom handler (optional - for complex effects)
            customHandler: config.customHandler || null,
            
            ...config // Allow override of defaults
        };

        this.arrowTypes.set(config.name, arrowConfig);
        console.log(`🏹 Registered arrow type: ${config.displayName}`);
        return true;
    }

    /**
     * Register all built-in arrow types
     */
    registerBuiltInArrows() {
        // Flame Arrow (migrated from existing implementation)
        this.registerArrowType({
            name: 'FlameArrow',
            displayName: 'Flame Arrow',
            icon: '🔥🏹',
            damageBonus: 50,
            statusEffects: [{ type: 'burned', stacks: 1 }],
            counterDisplay: {
                background: 'linear-gradient(45deg, #ff4500, #ff6500)',
                borderColor: '#ffaa00',
                shadowColor: 'rgba(255, 100, 0, 0.6)'
            },
            syncMessageType: 'flame_arrow_impact',
            impactEffect: this.createFlameArrowImpact.bind(this)
        });

        // Ice Arrow - freezes target
        this.registerArrowType({
            name: 'IceArrow',
            displayName: 'Ice Arrow',
            icon: '❄️🏹',
            damageBonus: 30,
            statusEffects: [{ type: 'frozen', stacks: 1 }],
            counterDisplay: {
                background: 'linear-gradient(45deg, #4fc3f7, #29b6f6)',
                borderColor: '#81d4fa',
                shadowColor: 'rgba(79, 195, 247, 0.6)'
            },
            syncMessageType: 'ice_arrow_impact',
            impactEffect: this.createIceArrowImpact.bind(this)
        });

        // Poison Arrow - applies poison
        this.registerArrowType({
            name: 'PoisonArrow',
            displayName: 'Poison Arrow',
            icon: '☠️🏹',
            damageBonus: 25,
            statusEffects: [{ type: 'poisoned', stacks: 2 }],
            counterDisplay: {
                background: 'linear-gradient(45deg, #66bb6a, #4caf50)',
                borderColor: '#81c784',
                shadowColor: 'rgba(76, 175, 80, 0.6)'
            },
            syncMessageType: 'poison_arrow_impact',
            impactEffect: this.createPoisonArrowImpact.bind(this)
        });

        // Lightning Arrow - stuns target
        this.registerArrowType({
            name: 'LightningArrow',
            displayName: 'Lightning Arrow', 
            icon: '⚡🏹',
            damageBonus: 40,
            statusEffects: [{ type: 'stunned', stacks: 1 }],
            counterDisplay: {
                background: 'linear-gradient(45deg, #ffeb3b, #ffc107)',
                borderColor: '#ffca28',
                shadowColor: 'rgba(255, 193, 7, 0.6)'
            },
            syncMessageType: 'lightning_arrow_impact',
            impactEffect: this.createLightningArrowImpact.bind(this)
        });

        console.log(`🏹 Registered ${this.arrowTypes.size} built-in arrow types`);
    }

    // ============================================
    // COUNTER MANAGEMENT
    // ============================================

    /**
     * Initialize arrow counters for all heroes at battle start
     */
    initializeArrowCounters() {
        console.log('🏹 Initializing arrow counters for all heroes...');

        ['player', 'opponent'].forEach(side => {
            const heroes = side === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;

            ['left', 'center', 'right'].forEach(position => {
                const hero = heroes[position];
                if (hero && hero.alive) {
                    this.initializeHeroArrowCounters(hero, side);
                }
            });
        });

        // Update visual displays
        this.updateAllArrowDisplays();
    }

    /**
     * Initialize counters for a specific hero
     * @param {Object} hero - Hero object
     * @param {string} side - 'player' or 'opponent'
     */
    initializeHeroArrowCounters(hero, side) {
        const heroId = `${side}_${hero.position}`;
        const heroCounters = new Map();

        // Check each registered arrow type
        this.arrowTypes.forEach((arrowConfig, arrowName) => {
            const arrowCount = this.countArrowsOnHero(hero, arrowName);
            
            if (arrowCount > 0) {
                heroCounters.set(arrowName, arrowCount);
                
                console.log(`🏹 ${hero.name} receives ${arrowCount} ${arrowConfig.displayName} counter${arrowCount > 1 ? 's' : ''}`);
                
                this.battleManager.addCombatLog(
                    `🏹 ${hero.name} receives ${arrowCount} ${arrowConfig.displayName} counter${arrowCount > 1 ? 's' : ''}!`,
                    side === 'player' ? 'success' : 'info'
                );
            }
        });

        // Store hero counters
        this.heroCounters.set(heroId, heroCounters);
    }

    /**
     * Count how many arrows of a specific type a hero has equipped
     * @param {Object} hero - Hero object
     * @param {string} arrowType - Arrow type name
     * @returns {number} Number of arrows
     */
    countArrowsOnHero(hero, arrowType) {
        if (!hero || !hero.equipment || hero.equipment.length === 0) {
            return 0;
        }

        return hero.equipment.filter(equip => {
            const equipName = equip.name || equip.cardName;
            return equipName === arrowType;
        }).length;
    }

    /**
     * Get current counter count for a hero and arrow type
     * @param {Object} hero - Hero object
     * @param {string} arrowType - Arrow type name
     * @returns {number} Current counter count
     */
    getArrowCounters(hero, arrowType) {
        const heroId = `${hero.side}_${hero.position}`;
        const heroCounters = this.heroCounters.get(heroId);
        
        if (!heroCounters) return 0;
        return heroCounters.get(arrowType) || 0;
    }

    /**
     * Check if hero has any counters for an arrow type
     * @param {Object} hero - Hero object
     * @param {string} arrowType - Arrow type name
     * @returns {boolean} Has counters
     */
    hasArrowCounters(hero, arrowType) {
        return this.getArrowCounters(hero, arrowType) > 0;
    }

    /**
     * Consume one counter for a hero and arrow type
     * @param {Object} hero - Hero object
     * @param {string} arrowType - Arrow type name
     * @returns {boolean} Success
     */
    consumeArrowCounter(hero, arrowType) {
        const heroId = `${hero.side}_${hero.position}`;
        const heroCounters = this.heroCounters.get(heroId);
        
        if (!heroCounters) return false;
        
        const currentCount = heroCounters.get(arrowType) || 0;
        if (currentCount <= 0) return false;

        heroCounters.set(arrowType, currentCount - 1);
        
        const arrowConfig = this.arrowTypes.get(arrowType);
        console.log(`🏹 ${hero.name} uses ${arrowConfig.displayName} counter (${currentCount - 1} remaining)`);

        // Update display
        this.updateArrowDisplay(hero.side, hero.position);
        
        return true;
    }

    // ============================================
    // DAMAGE MODIFICATION
    // ============================================

    /**
     * Calculate damage bonuses from all arrow types
     * @param {Object} attacker - Attacking hero
     * @param {Object} target - Target
     * @param {number} baseDamage - Base damage
     * @returns {Object} {modifiedDamage, effectsTriggered}
     */
    calculateArrowDamageBonus(attacker, target, baseDamage) {
        if (!attacker || !attacker.alive) {
            return { modifiedDamage: baseDamage, effectsTriggered: [] };
        }

        let modifiedDamage = baseDamage;
        const effectsTriggered = [];

        // Check each arrow type
        this.arrowTypes.forEach((arrowConfig, arrowType) => {
            if (this.hasArrowCounters(attacker, arrowType)) {
                // Consume counter
                const counterUsed = this.consumeArrowCounter(attacker, arrowType);
                
                if (counterUsed && arrowConfig.damageBonus > 0) {
                    modifiedDamage += arrowConfig.damageBonus;
                    
                    effectsTriggered.push({
                        arrowType: arrowType,
                        arrowConfig: arrowConfig,
                        target: target,
                        bonusDamage: arrowConfig.damageBonus
                    });

                    console.log(`🏹 ${arrowConfig.displayName} enhances attack: +${arrowConfig.damageBonus} damage`);
                }
            }
        });

        return { modifiedDamage, effectsTriggered };
    }

    // ============================================
    // ATTACK EFFECTS
    // ============================================

    /**
     * Process arrow effects after attack
     * @param {Object} attacker - Attacking hero
     * @param {Object} defender - Defending target
     * @param {number} damage - Damage dealt
     * @param {Array} effectsTriggered - Effects from damage calculation
     */
    async processArrowAttackEffects(attacker, defender, damage, effectsTriggered) {
        if (!effectsTriggered || effectsTriggered.length === 0) return;

        for (const effect of effectsTriggered) {
            await this.processIndividualArrowEffect(attacker, defender, damage, effect);
        }
    }

    /**
     * Process an individual arrow effect
     * @param {Object} attacker - Attacking hero  
     * @param {Object} defender - Defending target
     * @param {number} damage - Damage dealt
     * @param {Object} effect - Effect data
     */
    async processIndividualArrowEffect(attacker, defender, damage, effect) {
        const { arrowType, arrowConfig, bonusDamage } = effect;

        // Apply status effects
        if (arrowConfig.statusEffects && arrowConfig.statusEffects.length > 0) {
            for (const statusEffect of arrowConfig.statusEffects) {
                if (this.battleManager.statusEffectsManager) {
                    this.battleManager.statusEffectsManager.applyStatusEffect(
                        defender, 
                        statusEffect.type, 
                        statusEffect.stacks
                    );
                }
            }
        }

        // Create visual effect
        if (arrowConfig.impactEffect) {
            arrowConfig.impactEffect(defender, arrowConfig);
        }

        // Add combat log
        const statusText = arrowConfig.statusEffects.length > 0 
            ? `, ${arrowConfig.statusEffects.map(s => `${s.stacks} ${s.type}`).join(', ')}`
            : '';
            
        this.battleManager.addCombatLog(
            `🏹 ${attacker.name}'s ${arrowConfig.displayName} strikes! (+${bonusDamage} damage${statusText})`,
            'info'
        );

        // Network sync for multiplayer
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate(arrowConfig.syncMessageType, {
                attackerAbsoluteSide: attacker.absoluteSide,
                attackerPosition: attacker.position,
                defenderInfo: this.getDefenderSyncInfo(defender),
                arrowType: arrowType,
                bonusDamage: bonusDamage,
                statusEffects: arrowConfig.statusEffects,
                timestamp: Date.now()
            });
        }

        // Custom handler (for complex effects)
        if (arrowConfig.customHandler) {
            await arrowConfig.customHandler(attacker, defender, damage, effect, this.battleManager);
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    /**
     * Create flame arrow impact effect
     */
    createFlameArrowImpact(target, arrowConfig) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        // Create flame burst (same as existing FlameArrow implementation)
        const flameBurst = document.createElement('div');
        flameBurst.className = 'arrow-impact-effect flame-arrow-burst';
        
        // Create multiple flame particles
        const flameCount = 8;
        for (let i = 0; i < flameCount; i++) {
            const flame = document.createElement('div');
            flame.className = 'arrow-particle';
            flame.innerHTML = '🔥';
            
            const angle = (360 / flameCount) * i + (Math.random() * 30 - 15);
            const distance = 25 + Math.random() * 15;
            
            flame.style.cssText = `
                position: absolute;
                font-size: ${18 + Math.random() * 6}px;
                animation: arrowParticleExplosion ${this.battleManager.getSpeedAdjustedDelay(900)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 500;
            `;
            
            flameBurst.appendChild(flame);
        }

        this.addImpactEffect(targetElement, flameBurst, arrowConfig);
    }

    /**
     * Create ice arrow impact effect
     */
    createIceArrowImpact(target, arrowConfig) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const iceBurst = document.createElement('div');
        iceBurst.className = 'arrow-impact-effect ice-arrow-burst';
        
        // Create ice shards
        const shardCount = 6;
        for (let i = 0; i < shardCount; i++) {
            const shard = document.createElement('div');
            shard.className = 'arrow-particle';
            shard.innerHTML = '❄️';
            
            const angle = (360 / shardCount) * i + (Math.random() * 30 - 15);
            const distance = 20 + Math.random() * 15;
            
            shard.style.cssText = `
                position: absolute;
                font-size: ${16 + Math.random() * 6}px;
                animation: arrowParticleExplosion ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 500;
            `;
            
            iceBurst.appendChild(shard);
        }

        this.addImpactEffect(targetElement, iceBurst, arrowConfig);
    }

    /**
     * Create poison arrow impact effect
     */
    createPoisonArrowImpact(target, arrowConfig) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const poisonBurst = document.createElement('div');
        poisonBurst.className = 'arrow-impact-effect poison-arrow-burst';
        
        // Create poison clouds
        const cloudCount = 5;
        for (let i = 0; i < cloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'arrow-particle';
            cloud.innerHTML = '☠️';
            
            const angle = (360 / cloudCount) * i + (Math.random() * 40 - 20);
            const distance = 15 + Math.random() * 20;
            
            cloud.style.cssText = `
                position: absolute;
                font-size: ${14 + Math.random() * 8}px;
                animation: arrowParticleExplosion ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 500;
                opacity: 0.8;
            `;
            
            poisonBurst.appendChild(cloud);
        }

        this.addImpactEffect(targetElement, poisonBurst, arrowConfig);
    }

    /**
     * Create lightning arrow impact effect
     */
    createLightningArrowImpact(target, arrowConfig) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const lightningBurst = document.createElement('div');
        lightningBurst.className = 'arrow-impact-effect lightning-arrow-burst';
        
        // Create lightning bolts
        const boltCount = 4;
        for (let i = 0; i < boltCount; i++) {
            const bolt = document.createElement('div');
            bolt.className = 'arrow-particle';
            bolt.innerHTML = '⚡';
            
            const angle = (360 / boltCount) * i + (Math.random() * 45 - 22.5);
            const distance = 30 + Math.random() * 10;
            
            bolt.style.cssText = `
                position: absolute;
                font-size: ${20 + Math.random() * 8}px;
                animation: arrowParticleExplosion ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 500;
            `;
            
            lightningBurst.appendChild(bolt);
        }

        this.addImpactEffect(targetElement, lightningBurst, arrowConfig);
    }

    /**
     * Helper to add impact effect to target
     */
    addImpactEffect(targetElement, effectElement, arrowConfig) {
        // Position effect at target center
        effectElement.style.cssText += `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 500;
        `;
        
        targetElement.appendChild(effectElement);
        
        // Add overlay effect with arrow-specific colors
        const overlay = document.createElement('div');
        overlay.className = 'arrow-impact-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: ${arrowConfig.counterDisplay.background.replace('linear-gradient', 'radial-gradient(circle,').replace('45deg,', '').replace(')', ', transparent 70%)')};
            pointer-events: none;
            z-index: 490;
            animation: arrowImpactPulse ${this.battleManager.getSpeedAdjustedDelay(700)}ms ease-out forwards;
            opacity: 0.4;
        `;
        
        targetElement.appendChild(overlay);
        
        // Clean up after animation
        setTimeout(() => {
            if (effectElement.parentNode) effectElement.remove();
            if (overlay.parentNode) overlay.remove();
        }, this.battleManager.getSpeedAdjustedDelay(1000));
    }

    // ============================================
    // DISPLAY MANAGEMENT
    // ============================================

    /**
     * Update arrow counter display for a specific hero
     * @param {string} side - 'player' or 'opponent'
     * @param {string} position - 'left', 'center', 'right'
     */
    updateArrowDisplay(side, position) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;

        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[position];
        if (!hero) return;

        // Remove existing arrow displays
        const existingDisplays = heroElement.querySelectorAll('.arrow-counter-display');
        existingDisplays.forEach(display => display.remove());

        const heroId = `${side}_${position}`;
        const heroCounters = this.heroCounters.get(heroId);
        if (!heroCounters) return;

        // Create displays for each arrow type with counters > 0
        let displayIndex = 0;
        heroCounters.forEach((count, arrowType) => {
            if (count > 0) {
                const arrowConfig = this.arrowTypes.get(arrowType);
                if (arrowConfig) {
                    this.createArrowCounterDisplay(heroElement, arrowConfig, count, displayIndex);
                    displayIndex++;
                }
            }
        });
    }

    /**
     * Create arrow counter display element
     */
    createArrowCounterDisplay(heroElement, arrowConfig, count, index) {
        const counterDisplay = document.createElement('div');
        counterDisplay.className = 'arrow-counter-display';
        counterDisplay.innerHTML = `
            <div class="arrow-icon">${arrowConfig.icon}</div>
            <div class="arrow-count">${count}</div>
        `;
        
        // Position multiple displays vertically
        const topOffset = 5 + (index * 25);
        
        counterDisplay.style.cssText = `
            position: absolute;
            top: ${topOffset}px;
            right: 5px;
            background: ${arrowConfig.counterDisplay.background};
            border: 2px solid ${arrowConfig.counterDisplay.borderColor};
            border-radius: 8px;
            padding: 2px 6px;
            font-size: 11px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            box-shadow: 0 2px 4px ${arrowConfig.counterDisplay.shadowColor};
            z-index: 200;
            pointer-events: none;
            display: flex;
            align-items: center;
            gap: 3px;
            transition: all 0.3s ease;
        `;
        
        heroElement.appendChild(counterDisplay);
    }

    /**
     * Update all arrow displays
     */
    updateAllArrowDisplays() {
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                this.updateArrowDisplay(side, position);
            });
        });
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get target element for visual effects
     */
    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
    }

    /**
     * Find creature information
     */
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

    /**
     * Get defender sync info for network updates
     */
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

    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================

    /**
     * Handle guest update for arrow impacts
     * @param {string} arrowType - Arrow type
     * @param {Object} data - Sync data
     */
    handleGuestArrowImpact(arrowType, data) {
        const arrowConfig = this.arrowTypes.get(arrowType);
        if (!arrowConfig) return;

        // Find the defender and create visual effect
        const defender = this.findDefenderFromSyncInfo(data.defenderInfo);
        if (defender && arrowConfig.impactEffect) {
            arrowConfig.impactEffect(defender, arrowConfig);
        }
    }

    /**
     * Find defender from sync info
     */
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

    // ============================================
    // STATE PERSISTENCE
    // ============================================

    /**
     * Export arrow state for checkpoints
     */
    exportArrowState() {
        const state = {
            heroCounters: {},
            arrowTypes: {}
        };

        // Export hero counters
        this.heroCounters.forEach((counters, heroId) => {
            const counterObj = {};
            counters.forEach((count, arrowType) => {
                counterObj[arrowType] = count;
            });
            state.heroCounters[heroId] = counterObj;
        });

        // Export registered arrow types (for dynamic arrows)
        this.arrowTypes.forEach((config, arrowType) => {
            state.arrowTypes[arrowType] = {
                name: config.name,
                displayName: config.displayName,
                // Don't export functions, just data
            };
        });

        return state;
    }

    /**
     * Import arrow state from checkpoints
     */
    importArrowState(state) {
        if (!state) return false;

        try {
            // Clear existing counters
            this.heroCounters.clear();

            // Restore hero counters
            if (state.heroCounters) {
                Object.entries(state.heroCounters).forEach(([heroId, counters]) => {
                    const heroCounterMap = new Map();
                    Object.entries(counters).forEach(([arrowType, count]) => {
                        heroCounterMap.set(arrowType, count);
                    });
                    this.heroCounters.set(heroId, heroCounterMap);
                });
            }

            // Update displays after restoration
            this.updateAllArrowDisplays();

            console.log('🏹 Arrow system state restored from checkpoint');
            return true;
        } catch (error) {
            console.error('Error importing arrow state:', error);
            return false;
        }
    }

    // ============================================
    // CSS AND CLEANUP
    // ============================================

    /**
     * Ensure CSS for arrow effects
     */
    ensureArrowCSS() {
        if (document.getElementById('arrowSystemCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'arrowSystemCSS';
        style.textContent = `
            @keyframes arrowParticleExplosion {
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
            
            @keyframes arrowImpactPulse {
                0% {
                    opacity: 0;
                    transform: scale(0.8);
                }
                50% {
                    opacity: 0.6;
                    transform: scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: scale(1);
                }
            }
            
            .arrow-impact-effect {
                will-change: transform, opacity;
            }
            
            .arrow-particle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: center;
                will-change: transform, opacity;
                filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.8));
            }
            
            .arrow-impact-overlay {
                will-change: transform, opacity;
                mix-blend-mode: screen;
            }
            
            .arrow-counter-display {
                transition: all 0.3s ease;
                will-change: transform, opacity;
            }
            
            .arrow-counter-display:hover {
                transform: scale(1.1);
            }
            
            .arrow-icon {
                font-size: 10px;
                line-height: 1;
            }
            
            .arrow-count {
                font-size: 11px;
                line-height: 1;
                min-width: 12px;
                text-align: center;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Initialize system (called when battle starts)
     */
    init() {
        this.ensureArrowCSS();
        this.initializeArrowCounters();
        applyGoldenArrowIntegration(this, this.battleManager);
        applyAngelfeatherArrowIntegration(this, this.battleManager);
        applyBombArrowIntegration(this, this.battleManager);
        applyPoisonedArrowIntegration(this, this.battleManager);
        applyRacketArrowIntegration(this, this.battleManager);
        applyRainbowsArrowIntegration(this, this.battleManager);

    }

    /**
     * Cleanup
     */
    cleanup() {
        // Clear all counter displays
        const displays = document.querySelectorAll('.arrow-counter-display');
        displays.forEach(display => display.remove());

        // Clear state
        this.heroCounters.clear();
        this.displayElements.clear();

        // Remove CSS
        const css = document.getElementById('arrowSystemCSS');
        if (css) css.remove();

        console.log('🏹 ArrowSystem cleaned up');
    }
}

// ============================================
// INTEGRATION HELPERS
// ============================================

/**
 * Apply arrow start-of-battle effects
 * Replaces applyFlameArrowStartOfBattleEffects in battleFlowManager
 */
export function applyArrowStartOfBattleEffects(battleManager) {
    // Access arrow system through attackEffectsManager
    if (battleManager.attackEffectsManager && battleManager.attackEffectsManager.arrowSystem) {
        battleManager.attackEffectsManager.arrowSystem.initializeArrowCounters();
        console.log('🏹 Arrow start-of-battle effects applied');
    } else {
        console.warn('🏹 Arrow system not available for start-of-battle initialization');
        console.log('Available:', {
            attackEffectsManager: !!battleManager.attackEffectsManager,
            arrowSystem: !!(battleManager.attackEffectsManager?.arrowSystem)
        });
    }
}

// Export for use in the game
export default ArrowSystem;