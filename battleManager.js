// battleManager.js - Complete Battle Manager with BattleLog Integration (REFACTORED)
// UPDATED: Uses pre-calculated Hero stats instead of recalculating

import { getCardInfo } from './cardDatabase.js';
import { BattlePersistenceManager } from './battlePersistenceManager.js';
import { Hero } from './hero.js';
import { BattleSpeedManager } from './battleSpeedManager.js';
import { BattleSpellSystem } from './battleSpellSystem.js';
import StatusEffectsManager from './statusEffects.js';
import AttackEffectsManager from './attackEffects.js';
import { killTracker } from './killTracker.js';
import { getCheckpointSystem } from './checkpointSystem.js';

import { BattleRandomnessManager } from './battleRandomnessManager.js';
import { BattleAnimationManager } from './battleAnimationManager.js';
import { BattleNetworkManager } from './battleNetworkManager.js';  
import { BattleFlowManager } from './battleFlowManager.js';
import { BattleCombatManager } from './battleCombatManager.js';
import DamageSourceManager from './damageSourceManager.js';

import { applyResistancePatches } from './Abilities/resistance.js';
import { CannibalismAbility } from './Abilities/cannibalism.js';
import { applyFriendshipPatches } from './Abilities/friendship.js';

import { crusaderArtifactsHandler } from './Artifacts/crusaderArtifacts.js';



import RoyalCorgiCreature from './Creatures/royalCorgi.js';

import { MoniaHeroEffect } from './Heroes/monia.js';
import { kazenaEffect } from './Heroes/kazena.js';
import { NomuHeroEffect } from './Heroes/nomu.js';
import { SwampborneWaflavHeroEffect } from './Heroes/swampborneWaflav.js';


export class BattleManager {
    constructor() {
        this.battleActive = false;
        this.currentTurn = 0;
        this.playerHeroes = {}; 
        this.opponentHeroes = {};  
        this.battleLog = [];
        this.gameDataSender = null;
        this.isHost = false;
        this.battleScreen = null;
        this.lifeManager = null;
        this.goldManager = null;
        this.onBattleEnd = null;
        this.turnInProgress = false;
        this._processingSimultaneousAttack = false;

        // Area storage
        this.playerAreaCard = null;
        this.opponentAreaCard = null;
        
        // Ability data storage
        this.playerAbilities = null;
        this.opponentAbilities = null;
        
        // CENTRALIZED AUTHORITY: Only host runs simulation
        this.isAuthoritative = false;
        
        // Room manager reference
        this.roomManager = null;
        
        this.flowManager = null;
        this.combatManager = null;
        this.damageSourceManager = null;

        // Hand data
        this.playerHand = null;
        this.opponentHand = null;

        // Deck data
        this.playerDeck = null;
        this.opponentDeck = null;

        // Graveyard data
        this.playerGraveyard = null;
        this.opponentGraveyard = null;
        
        // Spell System
        this.spellSystem = null;

        
        //ABILITY STUFF
        this.necromancyManager = null; 
        this.diplomacyManager = null;


        //CREATURE STUFF
        this.jigglesManager = null;
        this.skeletonArcherManager = null;
        this.skeletonNecromancerManager = null;
        this.skeletonDeathKnightManager = null;
        this.skeletonReaperManager = null;
        this.skeletonHealerManager = null;
        this.archerManager = null;
        this.royalCorgiManager = null;
        this.futureTechMechManager = null;
        
        // Attack effects
        this.attackEffectsManager = null;
        
        // PERSISTENCE INTEGRATION
        this.persistenceManager = null;

        
        
        // Individual cards
        this.crusaderArtifactsHandler = null;
        this.kazenaEffect = null;



        // EXTENSIBLE STATE
        this.globalEffects = [];
        this.heroEffects = {};
        this.fieldEffects = [];
        this.totalDamageDealt = {};
        this.abilitiesUsed = {};
        this.weatherEffects = null;
        this.terrainModifiers = [];
        this.specialRules = [];

        // BATTLE SPEED CONTROL - Initialize the speed manager
        this.speedManager = new BattleSpeedManager();
        this.battleSpeed = 1; // 1x = normal, 2x = fast, 4x = super fast
        this.speedLocked = false; // Prevent speed changes during critical moments

        // DETERMINISTIC RANDOMNESS SYSTEM
        this.randomnessManager = new BattleRandomnessManager(this);

        // NETWORK MANAGER - NEW
        this.networkManager = new BattleNetworkManager(this);

        this.royalCorgiManager = new RoyalCorgiCreature(this);
        
        this.statusEffectsManager = null;
        this.animationManager = null;
        this.killTracker = killTracker;

        // HP tracking for stalemate detection
        this.hpHistory = [];
        this.stalemateCheckTurns = 20;
        
        // Make globally accessible for reward calculations
        if (typeof window !== 'undefined') {
            window.killTracker = killTracker;
            window.battleManager = this;
        }
    }

    // ============================================
    // NETWORK FUNCTIONALITY WRAPPERS
    // ============================================

    // Connection monitoring wrappers
    setupOpponentConnectionMonitoring() {
        return this.networkManager.setupOpponentConnectionMonitoring();
    }

    pauseBattle(reason) {
        return this.networkManager.pauseBattle(reason);
    }

    async resumeBattle(reason) {
        return await this.networkManager.resumeBattle(reason);
    }

    handleGuestReconnecting() {
        return this.networkManager.handleGuestReconnecting();
    }

    handleGuestReconnectionReady() {
        return this.networkManager.handleGuestReconnectionReady();
    }

    handleGuestReconnectionTimeout() {
        return this.networkManager.handleGuestReconnectionTimeout();
    }

    // Battle data sync wrappers
    sendBattleUpdate(type, data) {
        return this.networkManager.sendBattleUpdate(type, data);
    }

    sendBattleData(type, data) {
        return this.networkManager.sendBattleData(type, data);
    }

    // Acknowledgment system wrappers
    async waitForGuestAcknowledgment(ackType, timeout = 500) {
        return await this.networkManager.waitForGuestAcknowledgment(ackType, timeout);
    }

    receiveBattleAcknowledgment(ackData) {
        return this.networkManager.receiveBattleAcknowledgment(ackData);
    }

    sendAcknowledgment(ackType) {
        return this.networkManager.sendAcknowledgment(ackType);
    }

    getAdaptiveTimeout() {
        return this.networkManager.getAdaptiveTimeout();
    }

    // Main receive battle data wrapper
    async receiveBattleData(message) {
        return await this.networkManager.receiveBattleData(message);
    }

    // Property accessors for moved properties
    get opponentConnected() {
        return this.networkManager.opponentConnected;
    }

    set opponentConnected(value) {
        this.networkManager.opponentConnected = value;
    }

    get battlePaused() {
        return this.networkManager.battlePaused;
    }

    set battlePaused(value) {
        this.networkManager.battlePaused = value;
    }

    get guestReconnecting() {
        return this.networkManager.guestReconnecting;
    }

    set guestReconnecting(value) {
        this.networkManager.guestReconnecting = value;
    }

    // ============================================
    // DETERMINISTIC RANDOMNESS SYSTEM - DELEGATED
    // ============================================

    // Initialize randomness system (called by host only)
    initializeRandomness(seed = null) {
        return this.randomnessManager.initialize(seed);
    }

    // Initialize randomness from received seed (called by guest)
    initializeRandomnessFromSeed(seed) {
        return this.randomnessManager.initializeFromSeed(seed);
    }

    // Convenient randomness access methods - DELEGATED
    getRandom() {
        return this.randomnessManager.getRandom();
    }

    getRandomInt(min, max) {
        return this.randomnessManager.getRandomInt(min, max);
    }

    getRandomFloat(min, max) {
        return this.randomnessManager.getRandomFloat(min, max);
    }

    getRandomBool(probability = 0.5) {
        return this.randomnessManager.getRandomBool(probability);
    }

    getRandomChoice(array) {
        return this.randomnessManager.getRandomChoice(array);
    }

    getRandomChoices(array, count) {
        return this.randomnessManager.getRandomChoices(array, count);
    }

    shuffleArray(array) {
        return this.randomnessManager.shuffleArray(array);
    }

    getRandomPercent() {
        return this.randomnessManager.getRandomPercent();
    }

    checkChance(percentage) {
        return this.randomnessManager.checkChance(percentage);
    }

    getRandomDamageVariance(baseDamage, variancePercent = 10) {
        return this.randomnessManager.getRandomDamageVariance(baseDamage, variancePercent);
    }

    getWeightedChoice(choices, weights) {
        return this.randomnessManager.getWeightedChoice(choices, weights);
    }

    getRandomNormal(mean, standardDeviation) {
        return this.randomnessManager.getRandomNormal(mean, standardDeviation);
    }

    getRandomId(length = 8) {
        return this.randomnessManager.getRandomId(length);
    }

    getRandomnessDebugInfo() {
        return this.randomnessManager.getRandomnessDebugInfo();
    }

    testRandomnessDistribution(samples = 1000) {
        return this.randomnessManager.testRandomnessDistribution(samples);
    }

    // ============================================
    // CORE BATTLE MANAGER FUNCTIONALITY
    // ============================================

    // Initialize battle with formations, references, and abilities
    init(playerFormation, opponentFormation, gameDataSender, isHost, battleScreen, 
        lifeManager, goldManager, onBattleEnd, roomManager = null,
        playerAbilities = null, opponentAbilities = null,
        playerSpellbooks = null, opponentSpellbooks = null,
        playerCreatures = null, opponentCreatures = null,
        playerEquips = null, opponentEquips = null,
        playerEffectiveStats = null, opponentEffectiveStats = null,
        playerPermanentArtifacts = null, opponentPermanentArtifacts = null,
        playerHand = null, opponentHand = null,
        playerDeck = null, opponentDeck = null,
        playerAreaCard = null, opponentAreaCard = null,
        playerGraveyard = null, opponentGraveyard = null,
        playerCounters = null, opponentCounters = null){
        
        this.playerFormation = playerFormation;
        this.opponentFormation = opponentFormation;
        this.gameDataSender = gameDataSender;
        this.isHost = isHost;
        this.battleScreen = battleScreen;
        this.lifeManager = lifeManager;
        this.goldManager = goldManager;
        this.onBattleEnd = onBattleEnd;
        this.roomManager = roomManager;
        this.isAuthoritative = isHost;

        this.playerCounters = playerCounters || { birthdayPresent: 0, teleports: 0, goldenBananas: 0, evolutionCounters: 1 };
        this.opponentCounters = opponentCounters || { birthdayPresent: 0, teleports: 0, goldenBananas: 0, evolutionCounters: 1 };

        this.checkpointSystem = getCheckpointSystem();
        this.checkpointSystem.init(this, roomManager, isHost);

        
        this.speedManager.init(this, isHost);

        this.killTracker.init(this);
        
        // Initialize persistence manager
        if (this.roomManager) {
            this.persistenceManager = new BattlePersistenceManager(this.roomManager, this.isHost);
        }
        
        // Setup connection monitoring (now through network manager)
        if (this.isAuthoritative && this.roomManager) {
            this.setupOpponentConnectionMonitoring();
        }
        
        // Force a complete reset first
        this.reset();
        
        // Store abilities data AFTER reset
        this.playerAbilities = playerAbilities;
        this.opponentAbilities = opponentAbilities;
        this.playerSpellbooks = playerSpellbooks;
        this.opponentSpellbooks = opponentSpellbooks;
        this.playerCreatures = playerCreatures;  
        this.opponentCreatures = opponentCreatures;
        this.playerEquips = playerEquips;
        this.opponentEquips = opponentEquips;
        this.playerAreaCard = playerAreaCard;
        this.opponentAreaCard = opponentAreaCard;

        // In case of weird data desync/transferral issues: These next few assignments initially did not exist and were added for consistency's sake.
        this.playerHand = playerHand;
        this.opponentHand = opponentHand;
        this.playerDeck = playerDeck;
        this.opponentDeck = opponentDeck;
        this.playerGraveyard = playerGraveyard;     
        this.opponentGraveyard = opponentGraveyard;
        
        // Store effective stats
        this.playerEffectiveStats = playerEffectiveStats;
        this.opponentEffectiveStats = opponentEffectiveStats; 

        // Store permanent artifacts separately
        this.playerPermanentArtifacts = playerPermanentArtifacts || [];
        this.opponentPermanentArtifacts = opponentPermanentArtifacts || [];
        
        // Initialize heroes with full HP, abilities, and fresh visual state
        this.initializeHeroes();
        
        // Initialize randomness system (host only)
        if (this.isAuthoritative) {
            this.randomnessManager.initialize();
        }

        // Initialize Spell System
        this.spellSystem = new BattleSpellSystem(this);
        
        // Initialize Extracted Managers
        this.statusEffectsManager = new StatusEffectsManager(this);
        this.statusEffectsManager.ensureStatusEffectsCSS();
        this.animationManager = new BattleAnimationManager(this);

        // Initialize Attack Effects Manager
        this.attackEffectsManager = new AttackEffectsManager(this);
        this.attackEffectsManager.init();
        
        // Initialize flow manager (add this after other manager initializations)
        this.flowManager = new BattleFlowManager(this);

        this.damageSourceManager = new DamageSourceManager(this);

        
        this.combatManager = new BattleCombatManager(this);
        
        // Initialize Cannibalism manager
        this.cannibalismManager = new CannibalismAbility(this);



        this.crusaderArtifactsHandler = crusaderArtifactsHandler;
        this.crusaderArtifactsHandler.initBattleEffects(this);
        
        // Initialize Kazena Effect
        this.kazenaEffect = kazenaEffect;
        this.kazenaEffect.init(this);
        window.kazenaEffect = kazenaEffect;

        this.swampborneWaflavEffect = SwampborneWaflavHeroEffect.init(this);
    }

    setBattleSpeed(speed) {
        if (this.speedManager) {
            return this.speedManager.changeSpeed(speed);
        } else {
            // Fallback to the old method if speed manager not available
            if (this.speedLocked || !this.isAuthoritative) {
                return; // Only host can change speed, and not during locked periods
            }
            
            const validSpeeds = [1, 2, 4];
            if (!validSpeeds.includes(speed)) {
                return;
            }
            
            const oldSpeed = this.battleSpeed;
            this.battleSpeed = speed;
            
            const speedNames = { 1: 'Normal', 2: 'Fast', 4: 'Super Fast' };
            
            // Sync speed change to guest
            this.sendBattleUpdate('speed_change', {
                speed: speed,
                speedName: speedNames[speed],
                timestamp: Date.now()
            });
        }
    }

    guest_handleCannibalismHealing(data) {
        if (this.cannibalismManager) {
            this.cannibalismManager.handleGuestCannibalismHealing(data);
        }
    }
    
    guest_handleSpeedChange(data) {
        
        if (this.isAuthoritative) {
            return;
        }

        if (this.speedManager) {
            this.speedManager.handleSpeedChange(data);
        } else {
        }
    }

    getSpeedAdjustedDelay(ms) {
        if (this.speedManager) {
            return this.speedManager.calculateAdjustedDelay(ms);
        } else {
            // Fallback
            return Math.max(1, Math.floor(ms / this.battleSpeed));
        }
    }

    // Show battle pause UI
    showBattlePauseUI(reason) {
        return this.networkManager.showBattlePauseUI(reason);
    }

    // Hide battle pause UI
    hideBattlePauseUI() {
        return this.networkManager.hideBattlePauseUI();
    }

    // Initialize heroes with Hero class and abilities
    initializeHeroes() {
        const mySide = this.isHost ? 'host' : 'guest';
        const opponentSide = this.isHost ? 'guest' : 'host';
        
        // Initialize all heroes - NOW INCLUDING EQUIPMENT
        this.initializeHeroesForSide('player', this.playerFormation, this.playerHeroes, 
                                this.playerAbilities, this.playerSpellbooks, 
                                this.playerCreatures, this.playerEquips, mySide,
                                this.playerEffectiveStats);
        this.initializeHeroesForSide('opponent', this.opponentFormation, this.opponentHeroes, 
                                this.opponentAbilities, this.opponentSpellbooks, 
                                this.opponentCreatures, this.opponentEquips, opponentSide,
                                this.opponentEffectiveStats);
    }

    // Initialize heroes for a specific side

    initializeHeroesForSide(side, formation, heroesObj, abilities, spellbooks, creatures, equipment, absoluteSide, effectiveStats = null) {
        ['left', 'center', 'right'].forEach(position => {
            const heroData = formation[position];
            if (heroData) {
                const hero = new Hero(heroData, position, side, absoluteSide);
                
                // Initialize shield system for hero
                hero.currentShield = 0; // All heroes start with 0 shield
                
                // Set abilities first (needed for creature HP calculations)
                if (abilities && abilities[position]) {
                    hero.setAbilities(abilities[position]);
                }
                
                // Set spellbooks
                if (spellbooks && spellbooks[position]) {
                    hero.setSpellbook(spellbooks[position]);
                }
                
                // Add creatures with health (including Kyli bonuses AND Summoning Magic bonuses)
                if (creatures && creatures.hasOwnProperty(position)) {
                    if (creatures[position] && Array.isArray(creatures[position]) && creatures[position].length > 0) {
                        const creaturesWithHealth = creatures[position].map(creature => {
                            const creatureInfo = getCardInfo(creature.name);
                            
                            // Use creature's existing HP if modified by Kyli, otherwise use database
                            const baseHp = creature.hp !== undefined ? creature.hp : (creatureInfo?.hp || 10);
                            const baseCurrentHp = creature.currentHp !== undefined ? creature.currentHp : baseHp;
                            
                            let hpMultiplier = 1.0;
                            if (hero.hasAbility('SummoningMagic')) {
                                const summoningMagicLevel = hero.getAbilityStackCount('SummoningMagic');
                                hpMultiplier = 1 + (0.25 * summoningMagicLevel);
                            }
                            
                            // Apply Summoning Magic bonus to the already-modified HP (if any)
                            const finalMaxHp = Math.floor(baseHp * hpMultiplier);
                            const finalCurrentHp = Math.floor(baseCurrentHp * hpMultiplier);
                            
                            // Create clean creature object without status effects
                            const { statusEffects, ...cleanCreature } = creature;
                            
                            return {
                                ...cleanCreature,
                                currentHp: finalCurrentHp,
                                maxHp: finalMaxHp,
                                atk: creatureInfo?.atk || 0,
                                alive: true,
                                type: 'creature'  
                            };
                        });
                        hero.setCreatures(creaturesWithHealth);
                    } else {
                        // Handle null case or empty array - set empty creatures
                        hero.setCreatures([]);
                    }
                    hero.initializeNecromancyStacks();
                }
                
                // Set equipment
                if (equipment && equipment[position] && Array.isArray(equipment[position])) {
                    hero.setEquipment(equipment[position]);
                } else {
                    hero.setEquipment([]);
                }
                
                // Transfer burning finger stacks from permanent to battle hero
                if (heroData.burningFingerStack !== undefined) {
                    hero.burningFingerStack = heroData.burningFingerStack;
                }
                
                // Initialize arrow counters immediately after setting equipment
                this.initializeHeroArrowCounters(hero, side, position);
                
                // Use existing setPrecalculatedStats method
                if (effectiveStats && effectiveStats[position]) {
                    hero.setPrecalculatedStats(effectiveStats[position]);
                    
                    // Log bonuses for debugging
                    if (effectiveStats[position].bonuses) {
                        const bonuses = effectiveStats[position].bonuses;
                        if (bonuses.hpBonus > 0 || bonuses.totalAttackBonus > 0) {
                            // Debug logging can be added here if needed
                        }
                    }
                }

                // Store the hero
                heroesObj[position] = hero;
                
                // Update all visual elements with the correct stats
                this.resetHeroVisualState(side, position);
                this.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
                this.updateHeroAttackDisplay(side, position, hero);
                this.updateCreatureVisuals(side, position, hero.creatures);
            }
        });
        
        // Clear manager-level equipment references to prevent future conflicts
        /*if (side === 'player') {
            this.playerEquips = {};
        } else {
            this.opponentEquips = {};
        }*/
    }

    initializeHeroArrowCounters(hero, side, position) {
        if (!this.attackEffectsManager || !this.attackEffectsManager.arrowSystem) {
            // Arrow system not ready yet, will be initialized later
            return;
        }
        
        const arrowSystem = this.attackEffectsManager.arrowSystem;
        
        // Initialize counters for this specific hero
        arrowSystem.initializeHeroArrowCounters(hero, side);
        
        // Update display for this hero
        arrowSystem.updateArrowDisplay(side, position);
    }

    // Update creature visuals to show health
    updateCreatureVisuals(side, position, creatures) {
        if (!creatures || creatures.length === 0) return;
        
        const creatureContainer = document.querySelector(
            `.${side}-slot.${position}-slot .battle-hero-creatures`
        );
        
        if (!creatureContainer) return;
        
        // Update each creature's health display
        creatures.forEach((creature, index) => {
            const creatureElement = creatureContainer.querySelector(
                `.creature-icon[data-creature-index="${index}"]`
            );
            
            if (creatureElement) {
                // Update defeated state
                if (!creature.alive) {
                    creatureElement.classList.add('defeated');
                    // Reset counters when creature dies
                    if (creature.counters !== undefined) {
                        creature.counters = 0;
                    }

                    // Remove health bar and HP text when defeated
                    const healthBar = creatureElement.querySelector('.creature-health-bar');
                    const hpText = creatureElement.querySelector('.creature-hp-text');
                    const counterDisplay = creatureElement.querySelector('.creature-counter-display'); // FIX: Add missing declaration
                    if (healthBar) healthBar.remove();
                    if (hpText) hpText.remove();
                    if (counterDisplay) counterDisplay.remove(); // Now this works correctly
                } else {
                    // Add or update health bar
                    let healthBar = creatureElement.querySelector('.creature-health-bar');
                    let hpText = creatureElement.querySelector('.creature-hp-text');
                    
                    if (!healthBar) {
                        healthBar = document.createElement('div');
                        healthBar.className = 'creature-health-bar';
                        healthBar.innerHTML = `<div class="creature-health-fill"></div>`;
                        creatureElement.appendChild(healthBar);
                    }
                    
                    if (!hpText) {
                        hpText = document.createElement('div');
                        hpText.className = 'creature-hp-text';
                        creatureElement.appendChild(hpText);
                    }
                    
                    // Update health display
                    const healthFill = healthBar.querySelector('.creature-health-fill');
                    if (healthFill) {
                        const percentage = Math.max(0, (creature.currentHp / creature.maxHp) * 100);
                        healthFill.style.width = `${percentage}%`;
                        
                        // Update color based on health
                        if (percentage > 60) {
                            healthFill.style.background = 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)';
                        } else if (percentage > 30) {
                            healthFill.style.background = 'linear-gradient(90deg, #ff9800 0%, #ffa726 100%)';
                        } else {
                            healthFill.style.background = 'linear-gradient(90deg, #f44336 0%, #ef5350 100%)';
                        }
                    }
                    
                    if (hpText) {
                        hpText.textContent = `${creature.currentHp}/${creature.maxHp}`;
                    }
                    // Update counter display
                    this.updateCreatureCounterDisplay(creatureElement, creature);
                }
                
                // Update sprite visual state
                const sprite = creatureElement.querySelector('.creature-sprite');
                if (sprite) {
                    if (!creature.alive) {
                        sprite.style.filter = 'grayscale(100%)';
                        sprite.style.opacity = '0.5';
                    } else {
                        sprite.style.filter = '';
                        sprite.style.opacity = '';
                    }
                }
            }
        });
    }

    addCreatureCombatLog(message, type = 'info', options = {}) {
        if (this.battleScreen && this.battleScreen.battleLog) {
            const metadata = {
                isCreatureMessage: true,
                isCreatureDeathMessage: options.isDeathMessage || false,
                ...options.metadata
            };
            this.battleScreen.battleLog.addMessage(message, type, null, metadata);
        }
    }

    // Update creature counter display
    updateCreatureCounterDisplay(creatureElement, creature) {
        if (!creatureElement) return;

        // Remove existing counter display
        const existingCounter = creatureElement.querySelector('.creature-counter-display');
        if (existingCounter) {
            existingCounter.remove();
        }

        // Add new counter display if counters > 0 and creature is alive
        if (creature.alive && creature.counters > 0) {
            const counterDisplay = document.createElement('div');
            counterDisplay.className = 'creature-counter-display';
            counterDisplay.textContent = creature.counters;
            counterDisplay.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background: white;
                color: #333;
                border: 2px solid #666;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 10;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                animation: counterPulse 2s ease-in-out infinite;
            `;
            
            creatureElement.appendChild(counterDisplay);
        }
    }

    // Reset hero visual state
    resetHeroVisualState(side, position) {
        const heroElement = this.getHeroElement(side, position);
        if (heroElement) {
            const card = heroElement.querySelector('.battle-hero-card');
            if (card) {
                card.classList.remove('defeated', 'attacking');
                card.style.filter = '';
                card.style.opacity = '';
                card.style.transform = '';
            }
        }
    }

    // Restore battle state from Firebase persistence
    async restoreFromPersistence() {
        if (!this.persistenceManager) {
            return false;
        }

        try {
            const savedState = await this.persistenceManager.loadBattleState();
            if (!savedState) {
                return false;
            }

            const restored = await this.persistenceManager.restoreBattleState(this, savedState);
            if (restored) {
                await this.saveBattleStateToPersistence();
                return true;
            }
            return false;

        } catch (error) {
            return false;
        }
    }

    // Save current battle state to Firebase persistence
    async saveBattleStateToPersistence() {
        if (!this.persistenceManager || !this.battleActive) {
            return false;
        }

        try {
            return await this.persistenceManager.saveBattleState(this);
        } catch (error) {
            return false;
        }
    }

    // Start the battle
    async startBattle() {
        if (!this.flowManager) {
            return;
        }
        return this.flowManager.startBattle();
    }

    async getBothPlayersPotionStates() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return null;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('gameState').once('value');
            const gameState = snapshot.val();
            
            if (!gameState) return null;
            
            return {
                host: gameState.hostPotionState || null,
                guest: gameState.guestPotionState || null
            };
        } catch (error) {
            return null;
        }
    }

    // REMOVED: Stat logging functions that recalculated stats
    // Heroes now have pre-calculated stats from heroSelection

    // Initialize extensible state
    initializeExtensibleState() {
        this.globalEffects = [];
        this.heroEffects = {};
        this.fieldEffects = [];
        this.totalDamageDealt = {};
        this.abilitiesUsed = {};
        this.weatherEffects = null;
        this.terrainModifiers = [];
        this.specialRules = [];
        this.hpHistory = [];
    }

    // Battle loop with connection awareness and persistence
    async authoritative_battleLoop() {
        if (!this.flowManager) {
            return;
        }
        return this.flowManager.authoritative_battleLoop();
    }

    // Get hero ability modifiers for damage calculation
    getHeroAbilityModifiers(hero) {
        return this.combatManager ? 
            this.combatManager.getHeroAbilityModifiers(hero) : 
            { attackBonus: 0, defenseBonus: 0, specialEffects: [] };
    }

    // Process turn for a specific position with creatures
    async authoritative_processTurnForPosition(position) {
        if (!this.flowManager) {
            return;
        }
        return this.flowManager.authoritative_processTurnForPosition(position);
    }

    checkForSkeletonMageReactions(deadUnit, deadUnitSide, deadUnitType) {
        if (!this.isAuthoritative || !this.skeletonMageManager) return;
        
        // Find all living SkeletonMages on the same side as the dead unit
        const alliedHeroes = deadUnitSide === 'player' ? this.playerHeroes : this.opponentHeroes;
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = alliedHeroes[position];
            if (hero && hero.alive && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive && 
                        creature.name === 'SkeletonMage' && 
                        creature !== deadUnit) {
                        // This SkeletonMage should react to the allied death
                        this.skeletonMageManager.executeAllyDeathReaction(
                            creature, hero, position, deadUnitSide, deadUnit
                        );
                    }
                });
            }
        });
    }

    // Force clear any stuck pause overlays
    clearStuckPauseOverlay() {
        const pauseOverlay = document.getElementById('battlePauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.remove();
        }
        this.battlePaused = false;
    }

    isActorAlive(actor) {
        if (!this.flowManager) {
            return false;
        }
        return this.flowManager.isActorAlive(actor);
    }

    buildActorList(hero, canAct) {
        if (!this.flowManager) {
            return [];
        }
        return this.flowManager.buildActorList(hero, canAct);
    }

    // Process creature actions (paired from the end)
    async processCreatureActions(position, playerCreatures, opponentCreatures) {
        const maxCreatures = Math.max(playerCreatures.length, opponentCreatures.length);
        
        if (maxCreatures === 0) return;
                
        // Process from the START of the arrays (first creatures first)
        for (let i = 0; i < maxCreatures; i++) {
            const playerCreatureIndex = i; // Changed from: playerCreatures.length - 1 - i
            const opponentCreatureIndex = i; // Changed from: opponentCreatures.length - 1 - i
            
            const playerCreature = playerCreatureIndex < playerCreatures.length ? playerCreatures[playerCreatureIndex] : null;
            const opponentCreature = opponentCreatureIndex < opponentCreatures.length ? opponentCreatures[opponentCreatureIndex] : null;
            
            // Create creature action data
            const creatureActionData = {
                position: position,
                playerCreature: playerCreature ? {
                    name: playerCreature.name,
                    index: playerCreatureIndex,
                    side: 'player'
                } : null,
                opponentCreature: opponentCreature ? {
                    name: opponentCreature.name,
                    index: opponentCreatureIndex,
                    side: 'opponent'
                } : null
            };
            
            // Send creature action update
            this.sendBattleUpdate('creature_action', creatureActionData);
            
            // Execute creature actions (shake animations)
            await this.executeCreatureActions(playerCreature, opponentCreature, position);
            
            await this.delay(300); // Brief pause between creature actions
        }
    }

     async executeActorActions(playerActor, opponentActor, position) {
        if (!this.flowManager) {
            return;
        }
        return this.flowManager.executeActorActions(playerActor, opponentActor, position);
    }

    async executeHeroActions(playerHeroActor, opponentHeroActor, position) {
        if (!this.combatManager) {
            return;
        }
        return this.combatManager.executeHeroActions(playerHeroActor, opponentHeroActor, position);
    }

    // Execute hero attacks with damage application
    async executeHeroAttacksWithDamage(playerAttack, opponentAttack) {
        if (!this.combatManager) {
            return;
        }
        return this.combatManager.executeHeroAttacksWithDamage(playerAttack, opponentAttack);
    }

    // Execute creature actions (shake animations)
    async executeCreatureActions(playerCreature, opponentCreature, position) {
        const shakePromises = [];
        
        if (playerCreature) {
            const playerIndex = this.playerHeroes[position].creatures.indexOf(playerCreature);
            shakePromises.push(this.animationManager.shakeCreature('player', position, playerIndex));
        }
        
        if (opponentCreature) {
            const opponentIndex = this.opponentHeroes[position].creatures.indexOf(opponentCreature);
            shakePromises.push(this.animationManager.shakeCreature('opponent', position, opponentIndex));
        }
        
        await Promise.all(shakePromises);
    }

    // Find target with creatures (heroes now target last creature)
    authoritative_findTargetWithCreatures(attackerPosition, attackerSide) {
        return this.combatManager ? 
            this.combatManager.authoritative_findTargetWithCreatures(attackerPosition, attackerSide) : 
            null;
    }

    // Calculate damage for a hero
    calculateDamage(hero, canAct) {
        return this.combatManager ? 
            this.combatManager.calculateDamage(hero, canAct) : 
            0;
    }

    // Create turn data object with creatures
    createTurnDataWithCreatures(position, playerHero, playerTarget, playerDamage, 
                                opponentHero, opponentTarget, opponentDamage) {
        if (!this.combatManager) {
            return {};
        }
        return this.combatManager.createTurnDataWithCreatures(
            position, playerHero, playerTarget, playerDamage,
            opponentHero, opponentTarget, opponentDamage
        );
    }

    // Clear temporary modifiers at end of turn
    clearTurnModifiers(playerHero, opponentHero, position) {
        if (!this.flowManager) {
            return;
        }
        return this.flowManager.clearTurnModifiers(playerHero, opponentHero, position);
    }

    // Execute hero attacks with damage application
    async executeHeroAttacksWithDamage(playerAttack, opponentAttack) {
        if (playerAttack && opponentAttack) {
            // Both heroes attack - log host's attack first, then guest's attack
            let hostAttack, guestAttack;
            
            if (playerAttack.hero.absoluteSide === 'host') {
                hostAttack = playerAttack;
                guestAttack = opponentAttack;
            } else {
                hostAttack = opponentAttack;
                guestAttack = playerAttack;
            }
            
            // Log attacks with host first
            if (this.battleScreen && this.battleScreen.battleLog) {
                this.battleScreen.battleLog.logAttackMessage(hostAttack);
                this.battleScreen.battleLog.logAttackMessage(guestAttack);
            }
            
            // Both heroes attack - collision animation (meet in middle)
            await this.animationManager.animateSimultaneousHeroAttacks(playerAttack, opponentAttack);
            
            // ============================================
            // NEW: Apply damage modifier visual effects BEFORE damage
            // ============================================
            if (this.attackEffectsManager) {
                // Small delay to let attack animation reach target
                await this.delay(100);
                
                if (playerAttack.effectsTriggered && playerAttack.effectsTriggered.length > 0) {
                    this.attackEffectsManager.applyDamageModifierEffects(playerAttack.effectsTriggered);
                }
                if (opponentAttack.effectsTriggered && opponentAttack.effectsTriggered.length > 0) {
                    this.attackEffectsManager.applyDamageModifierEffects(opponentAttack.effectsTriggered);
                }
                
                // Wait for effect animations
                if (playerAttack.effectsTriggered?.length > 0 || opponentAttack.effectsTriggered?.length > 0) {
                    await this.delay(100);
                }
            }
            
            // Apply damage with potentially modified values
            this.applyAttackDamageToTarget(playerAttack);
            this.applyAttackDamageToTarget(opponentAttack);
            
            await Promise.all([
                this.animationManager.animateReturn(playerAttack.hero, 'player'),
                this.animationManager.animateReturn(opponentAttack.hero, 'opponent')
            ]);
            
        } else if (playerAttack || opponentAttack) {
            // Only one hero attacks - full dash animation (to target)
            const attack = playerAttack || opponentAttack;
            const side = playerAttack ? 'player' : 'opponent';
            
            // Log the single attack
            if (this.battleScreen && this.battleScreen.battleLog) {
                this.battleScreen.battleLog.logAttackMessage(attack);
            }
            
            await this.animationManager.animateHeroAttack(attack.hero, attack.target);
            
            // ============================================
            // Apply damage modifier visual effects BEFORE damage
            // ============================================
            if (this.attackEffectsManager && attack.effectsTriggered && attack.effectsTriggered.length > 0) {
                // Small delay to let attack animation complete
                await this.delay(100);
                
                this.attackEffectsManager.applyDamageModifierEffects(attack.effectsTriggered);
                
                // Wait for effect animation
                await this.delay(100);
            }
            
            // Apply damage with potentially modified value
            this.applyAttackDamageToTarget(attack);
            
            await this.animationManager.animateReturn(attack.hero, side);
        }
    }

    // Apply damage to target (hero or creature)
    applyAttackDamageToTarget(attack) {       
        if (!this.combatManager) {
            return;
        }
        return this.combatManager.applyAttackDamageToTarget(attack);
    }

    // Check and apply fireshield recoil damage
    checkAndApplyFireshieldRecoil(attacker, defender) {
        if (!this.combatManager) return;
        return this.combatManager.checkAndApplyFireshieldRecoil(attacker, defender);
    }

    // Check and apply toxic trap effect
    checkAndApplyToxicTrap(attacker, defender) {
        if (!this.combatManager) return false;
        return this.combatManager.checkAndApplyToxicTrap(attacker, defender);
    }

    checkAndApplyFrostRune(attacker, defender) {
        if (!this.combatManager) return false;
        return this.combatManager.checkAndApplyFrostRune(attacker, defender);
    }

    // Apply damage to a creature
    async authoritative_applyDamageToCreature(damageData, context = {}) {
        if (!this.combatManager) {
            return;
        }
        return await this.combatManager.authoritative_applyDamageToCreature(damageData, context);
    }

    async triggerCreatureDeathEffects(creature, heroOwner, attacker, context) {
        // SKELETON ARCHER DEATH SALVO
        if (creature.name === 'SkeletonArcher' && this.skeletonArcherManager) {
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death salvo (10 arrows at random targets)
            this.skeletonArcherManager.executeDeathSalvo(creature, heroOwner, position, side);
        }
        
        // SKELETON NECROMANCER HERO REVIVAL DEATH EFFECT
        if (creature.name === 'SkeletonNecromancer' && this.skeletonNecromancerManager) {
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the hero revival death effect
            await this.skeletonNecromancerManager.executeHeroRevivalDeath(creature, heroOwner, position, side);
        }

        // SKELETON DEATH KNIGHT DEATH SLASH STORM
        if (creature.name === 'SkeletonDeathKnight' && this.skeletonDeathKnightManager) {
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death slash storm (slash all enemies simultaneously)
            await this.skeletonDeathKnightManager.executeDeathSlashStorm(creature, heroOwner, position, side);
        }

        // BURNING SKELETON DEATH FLAME STORM
        if (creature.name === 'BurningSkeleton' && this.burningSkeletonManager) {
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death flame storm (fire slashes all enemies simultaneously)
            await this.burningSkeletonManager.executeDeathFlameStorm(creature, heroOwner, position, side);
        }
        
        // SKELETON REAPER DEATH SLASH STORM
        if (creature.name === 'SkeletonReaper' && this.skeletonReaperManager) {
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death slash storm (wide arching slashes across all enemies)
            await this.skeletonReaperManager.executeDeathSlashStorm(creature, heroOwner, position, side);
        }

        // SKELETON BARD DEATH INSPIRATION
        if (creature.name === 'SkeletonBard' && this.skeletonBardManager) {
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death inspiration (inspire up to 2 creatures)
            await this.skeletonBardManager.executeDeathInspiration(creature, heroOwner, position, side);
        }

        // SKELETON MAGE REVENGE ICE DEATH EFFECT
        if (creature.name === 'SkeletonMage' && this.skeletonMageManager) {            
            // Check if there's an attacker and they're still alive
            if (attacker && attacker.alive) {
                // Get the side and position for the death effect
                const side = heroOwner.side;
                const position = heroOwner.position;
                
                // CALCULATE CREATURE INDEX BEFORE ANY MODIFICATIONS
                const creatureIndex = heroOwner.creatures.indexOf(creature);
                
                // Execute the revenge ice (ice projectile at the attacker)
                await this.skeletonMageManager.executeRevengeIce(creature, heroOwner, position, side, attacker, creatureIndex);
            } else {
                this.addCombatLog(
                    `💀 ${creature.name}'s dying spirit finds no living target for revenge!`, 
                    'info'
                );
            }
        }

        // SKELETON KING SKULLMAEL DEATH SKELETON SPAWN
        if (creature.name === 'SkeletonKingSkullmael' && this.skeletonKingSkullmaelManager) {
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the permanent skeleton spawn effect
            await this.skeletonKingSkullmaelManager.executeDeathSkeletonSpawn(creature, heroOwner, position, side);
        }

        // SKELETON HEALER DEATH HEALING
        if (creature.name === 'SkeletonHealer' && this.skeletonHealerManager) {
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death healing effect
            await this.skeletonHealerManager.executeDeathHealing(creature, heroOwner, position, side);
        }

        // EXPLODING SKULL DEATH EXPLOSION
        if (creature.name === 'ExplodingSkull' && this.explodingSkullManager) {
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death explosion
            await this.explodingSkullManager.executeDeathExplosion(creature, heroOwner, position, side);
        }
    }

    handleCreatureDeathWithoutRevival(hero, creature, creatureIndex, side, position) {
        // Clear all status effects from the creature when it dies
        if (this.statusEffectsManager) {
            this.statusEffectsManager.clearAllStatusEffects(creature);
        }

        //this.addCombatLog(`💀 ${creature.name} has been defeated!`, 'error');
        
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (creatureElement) {
            creatureElement.classList.add('defeated');
            
            // Apply defeated visual state to sprite
            const sprite = creatureElement.querySelector('.creature-sprite');
            if (sprite) {
                sprite.style.filter = 'grayscale(100%)';
                sprite.style.opacity = '0.5';
            }
            
            // Remove health bar and HP text when defeated (same as updateCreatureVisuals)
            const healthBar = creatureElement.querySelector('.creature-health-bar');
            const hpText = creatureElement.querySelector('.creature-hp-text');
            if (healthBar) {
                healthBar.remove();
            }
            if (hpText) {
                hpText.remove();
            }
        }
    }

    refreshAllCreatureVisuals() {       
        ['left', 'center', 'right'].forEach(position => {
            // Update player creature visuals
            if (this.playerHeroes[position] && this.playerHeroes[position].creatures) {
                const hero = this.playerHeroes[position];
                this.updateCreatureVisuals('player', position, hero.creatures);
                
                // Log defeated creatures for debugging
                const defeatedCreatures = hero.creatures.filter(c => !c.alive);
                if (defeatedCreatures.length > 0) {
                }
            }
            
            // Update opponent creature visuals
            if (this.opponentHeroes[position] && this.opponentHeroes[position].creatures) {
                const hero = this.opponentHeroes[position];
                this.updateCreatureVisuals('opponent', position, hero.creatures);
                
                // Log defeated creatures for debugging
                const defeatedCreatures = hero.creatures.filter(c => !c.alive);
                if (defeatedCreatures.length > 0) {
                }
            }
        });
    }

    renderCreaturesAfterInit() {
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroInstance = side === 'player' 
                    ? this.playerHeroes[position]
                    : this.opponentHeroes[position];
                
                if (heroInstance && heroInstance.creatures && heroInstance.creatures.length > 0) {
                    const heroSlot = document.querySelector(`.${side}-slot.${position}-slot`);
                    if (heroSlot) {
                        // Remove existing creatures if any
                        const existingCreatures = heroSlot.querySelector('.battle-hero-creatures');
                        if (existingCreatures) {
                            existingCreatures.remove();
                        }
                        
                        // Add new creatures HTML
                        const creaturesHTML = this.battleScreen.createCreaturesHTML(heroInstance.creatures, side, position);
                        heroSlot.insertAdjacentHTML('beforeend', creaturesHTML);
                        
                        // Update necromancy displays
                        if (this.necromancyManager) {
                            this.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                                side, position, heroInstance
                            );
                        }
                    }
                }
            });
        });
    }

    // Update creature health bar
    updateCreatureHealthBar(side, position, creatureIndex, currentHp, maxHp) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;
        
        const healthFill = creatureElement.querySelector('.creature-health-fill');
        const hpText = creatureElement.querySelector('.creature-hp-text');
        
        if (healthFill && hpText) {
            const percentage = Math.max(0, (currentHp / maxHp) * 100);
            healthFill.style.width = `${percentage}%`;
            hpText.textContent = `${currentHp}/${maxHp}`;
            
            // Change color based on health
            if (percentage > 60) {
                healthFill.style.background = 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)';
            } else if (percentage > 30) {
                healthFill.style.background = 'linear-gradient(90deg, #ff9800 0%, #ffa726 100%)';
            } else {
                healthFill.style.background = 'linear-gradient(90deg, #f44336 0%, #ef5350 100%)';
            }
        }
    }

    // Handle creature death
    handleCreatureDeath(hero, creature, creatureIndex, side, position) {
        // This method is now only called for creatures that were not revived
        // (The revival attempt happens in authoritative_applyDamageToCreature)
        this.handleCreatureDeathWithoutRevival(hero, creature, creatureIndex, side, position);
    }

    // Apply damage to target
    async authoritative_applyDamage(damageResult, context = {}) {
        if (!this.combatManager) {
            return;
        }
        return await this.combatManager.authoritative_applyDamage(damageResult, context);
    }

    verifyAndFixShieldDisplays() {
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.playerHeroes : this.opponentHeroes;
                const hero = heroes[position];
                
                if (hero && hero.currentShield > 0) {                    
                    // Force update the health bar
                    this.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
                    
                    // Verify the visual elements exist
                    const heroElement = this.getHeroElement(side, position);
                    if (heroElement) {
                        const healthBar = heroElement.querySelector('.health-bar');
                        const shieldBar = healthBar ? healthBar.querySelector('.shield-bar') : null;
                        const hpText = healthBar ? healthBar.querySelector('.hp-text') : null;
                        
                        if (!shieldBar) {
                            console.warn(`⚠️ Missing shield bar for ${hero.name}, forcing recreation`);
                            this.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
                        }
                        
                        if (hpText && !hpText.textContent.includes('🛡️')) {
                            console.warn(`⚠️ HP text missing shield info for ${hero.name}, fixing`);
                            this.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
                        }
                    }
                }
            });
        });
    }




    // Guest handlers that remain in battleManager
    guest_handleStatusEffectChange(data) {
        if (this.statusEffectsManager) {
            this.statusEffectsManager.handleGuestStatusEffectUpdate(data);
        }
    }

    guest_handleSpellCast(data) {
        if (this.spellSystem) {
            this.spellSystem.handleGuestSpellCast(data);
        }
    }

    guest_handleSpellEffect(data) {
        if (this.spellSystem) {
            this.spellSystem.handleGuestSpellEffect(data);
        } else {
        }
    }
    
    guest_handleDiplomacyEffectsComplete(data) {
        if (this.diplomacyManager) {
            this.diplomacyManager.handleGuestDiplomacyEffects(data);
        } else {
        }
    }
    
    guest_handleKillTracked(data) {
        if (this.killTracker) {
            this.killTracker.handleSyncedKill(data);
        }
    }

    guest_handleBladeFrostTriggered(data) {
        if (this.attackEffectsManager) {
            this.attackEffectsManager.handleGuestBladeFrostTrigger(data);
        }
    }

    guest_handleSunSwordBurn(data) {
        if (this.attackEffectsManager && this.attackEffectsManager.sunSwordEffect) {
            this.attackEffectsManager.sunSwordEffect.handleGuestSunSwordBurn(data);
        }
    }

    guest_handleSunSwordFrozenResist(data) {
        if (this.attackEffectsManager && this.attackEffectsManager.sunSwordEffect) {
            this.attackEffectsManager.sunSwordEffect.handleGuestFrozenResistance(data);
        }
    }

    guest_handleFireshieldApplied(data) {
        if (this.spellSystem && this.spellSystem.spellImplementations.has('Fireshield')) {
            const fireshieldSpell = this.spellSystem.spellImplementations.get('Fireshield');
            fireshieldSpell.handleGuestFireshieldApplied(data);
        } else {
        }
    }

    guest_handleToxicTrapApplied(data) {
        if (this.spellSystem && this.spellSystem.spellImplementations.has('ToxicTrap')) {
            const toxicTrapSpell = this.spellSystem.spellImplementations.get('ToxicTrap');
            toxicTrapSpell.handleGuestToxicTrapApplied(data);
        } else {
        }
    }

    guest_handleFrostRuneApplied(data) {
        if (this.spellSystem && this.spellSystem.spellImplementations.has('FrostRune')) {
            const frostRuneSpell = this.spellSystem.spellImplementations.get('FrostRune');
            frostRuneSpell.handleGuestFrostRuneApplied(data);
        } else {
        }
    }

    guest_handleFuriousAngerAction(data) {
        import('./Artifacts/furiousAnger.js').then(({ handleGuestFuriousAngerAction }) => {
            handleGuestFuriousAngerAction(data, this);
        }).catch(error => {
        });
    }

    guest_handleHealingMelodyEffect(data) {
        if (this.isAuthoritative) {
            return;
        }

        if (this.spellSystem && this.spellSystem.spellImplementations.has('HealingMelody')) {
            const healingMelodySpell = this.spellSystem.spellImplementations.get('HealingMelody');
            // Call the async handler but don't await it at the network layer
            // The spell system will handle its own timing
            healingMelodySpell.handleGuestSpellEffect(data);
        } else {
        }
    }

    guest_handleHealingMelodyStart(data) {
        if (this.isAuthoritative) {
            return;
        }

        const { casterAbsoluteSide, casterPosition, casterName } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const casterLocalSide = (casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Start the animation immediately on guest side
        if (this.spellSystem && this.spellSystem.spellImplementations.has('HealingMelody')) {
            const healingMelodySpell = this.spellSystem.spellImplementations.get('HealingMelody');
            healingMelodySpell.playGuestSideAnimation(casterLocalSide);
        }
    }

    guest_handleMonsterBottleCreaturesCreated(data) {
        import('./Potions/monsterInABottle.js').then(({ MonsterInABottlePotion }) => {
            const handler = new MonsterInABottlePotion();
            handler.handleGuestCreaturesCreated(data, this);
        }).catch(error => {
        });
    }



    //GUEST EQUIP HANDLERS

    guest_handleCrusaderCannonBarrage(data) {
        if (this.crusaderArtifactsHandler) {
            this.crusaderArtifactsHandler.handleGuestCannonBarrage(data);
        }
    }

    guest_handleCrusaderCutlassAttack(data) {
        if (this.crusaderArtifactsHandler) {
            this.crusaderArtifactsHandler.handleGuestCutlassAttack(data);
        }
    }

    guest_handleCrusaderFlintlockAttack(data) {
        if (this.crusaderArtifactsHandler) {
            this.crusaderArtifactsHandler.handleGuestFlintlockAttack(data);
        }
    }
 
    guest_handleCrusaderHookshotSwap(data) {
        if (this.crusaderArtifactsHandler) {
            this.crusaderArtifactsHandler.handleGuestHookshotSwap(data);
        }
    }

    guest_handleStormbladeWindSwap(data) {
        if (this.attackEffectsManager && this.attackEffectsManager.stormbladeEffect) {
            this.attackEffectsManager.stormbladeEffect.handleGuestWindSwap(data);
        }
    }
    
    guest_handleGreatswordSkeletonSummon(data) {
        import('./Artifacts/skullmaelsGreatsword.js').then(({ skullmaelsGreatswordArtifact }) => {
            skullmaelsGreatswordArtifact.handleGuestSkeletonSummon(data, this);
        }).catch(error => {
        });
    }

    guest_handleArrowImpact(arrowType, data) {
        if (this.attackEffectsManager && this.attackEffectsManager.arrowSystem) {
            this.attackEffectsManager.arrowSystem.handleGuestArrowImpact(arrowType, data);
        }
    }

    guest_handleFlameArrowImpact(data) {
        this.guest_handleArrowImpact('FlameArrow', data);
    }

    guest_handleGoldenArrowImpact(data) {
        this.guest_handleArrowImpact('GoldenArrow', data);
    }

    guest_handleAngelfeatherArrowImpact(data) {
        this.guest_handleArrowImpact('AngelfeatherArrow', data);
    }

    guest_handleBombArrowImpact(data) {
        this.guest_handleArrowImpact('BombArrow', data);
    }

    guest_handlePoisonedArrowImpact(data) {
        this.guest_handleArrowImpact('PoisonedArrow', data);
    }

    guest_handleRacketArrowImpact(data) {
        this.guest_handleArrowImpact('RacketArrow', data);
    }

    guest_handleRainbowsArrowImpact(data) {
        this.guest_handleArrowImpact('RainbowsArrow', data);
    }

    guest_handleRainbowsArrowGoldAward(data) {
        if (this.isAuthoritative) {
            return;
        }

        const { attackerAbsoluteSide, attackerPosition, defenderInfo, goldGain, totalDamage } = data;
        
        // Determine local sides for the guest
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const attackerLocalSide = (attackerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Award gold to the correct side
        if (this.goldManager) {
            if (attackerLocalSide === 'player') {
                this.goldManager.addPlayerGold(goldGain, 'rainbows_arrow');
            } else {
                this.goldManager.addOpponentGold(goldGain, 'rainbows_arrow');
            }
        }
        
        // Find the defender for visual effect
        const defender = this.findDefenderFromSyncInfo(defenderInfo);
        if (defender) {
            // Import and use the display function from rainbowsArrow
            import('./Artifacts/rainbowsArrow.js').then(({ displayGoldGainAnimation }) => {
                displayGoldGainAnimation(defender, goldGain, this);
            }).catch(error => {
            });
        }
        
        // Add to combat log
        const attackerName = this.getAttackerNameFromSyncData(attackerAbsoluteSide, attackerPosition);
        this.addCombatLog(
            `🌈 ${attackerName}'s Rainbows Arrow grants +${goldGain} gold! (${totalDamage} damage ÷ 50)`,
            attackerLocalSide === 'player' ? 'success' : 'info'
        );
    }



    // GUEST PERMANENTS
    guest_handleSnowCannonEffectsComplete(data) {
        import('./Artifacts/snowCannon.js').then(({ handleGuestSnowCannonEffects }) => {
            handleGuestSnowCannonEffects(data, this);
        }).catch(error => {
        });
    }

    guest_handleSnowCannonFreeze(data) {
        import('./Artifacts/snowCannon.js').then(({ handleGuestSnowCannonFreeze }) => {
            handleGuestSnowCannonFreeze(data, this);
        }).catch(error => {
        });
    }

    guest_handleCloudPillowEffectsComplete(data) {
        import('./Artifacts/cloudPillow.js').then(({ handleGuestCloudPillowEffects }) => {
            handleGuestCloudPillowEffects(data, this);
        }).catch(error => {
        });
    }

    guest_handleCloudPillowProtection(data) {
        import('./Artifacts/cloudPillow.js').then(({ handleGuestCloudPillowProtection }) => {
            handleGuestCloudPillowProtection(data, this);
        }).catch(error => {
        });
    }

    guest_handleFieldStandardEffectsComplete(data) {
        import('./Artifacts/fieldStandard.js').then(({ handleGuestFieldStandardEffects }) => {
            handleGuestFieldStandardEffects(data, this);
        }).catch(error => {
        });
    }

    guest_handleFieldStandardRally(data) {
        import('./Artifacts/fieldStandard.js').then(({ handleGuestFieldStandardRally }) => {
            handleGuestFieldStandardRally(data, this);
        }).catch(error => {
        });
    }

    async guest_handleHeartOfIceTriggered(data) {
        if (this.isAuthoritative) {
            return;
        }

        try {
            const { handleGuestHeartOfIceEffect } = await import('./Artifacts/heartOfIce.js');
            handleGuestHeartOfIceEffect(data, this);
        } catch (error) {
        }
    }

    guest_handleCreatureCounterUpdate(data) {
        if (this.isAuthoritative) {
            return;
        }

        const { creatureData } = data;
        const creatureName = creatureData.name;

        // Handle MoonlightButterfly counter updates
        if (creatureName === 'RoyalCorgi') {
            if (!this.royalCorgiManager) {
                import('./Creatures/royalCorgi.js').then(({ default: RoyalCorgiCreature }) => {
                    this.royalCorgiManager = new RoyalCorgiCreature(this);
                    this.royalCorgiManager.handleGuestCounterUpdate(data);
                });
            } else {
                this.royalCorgiManager.handleGuestCounterUpdate(data);
            }
        }
        // Handle MoonlightButterfly counter updates
        else if (creatureName === 'MoonlightButterfly') {
            if (!this.moonlightButterflyManager) {
                import('./Creatures/moonlightButterfly.js').then(({ default: MoonlightButterflyCreature }) => {
                    this.moonlightButterflyManager = new MoonlightButterflyCreature(this);
                    this.moonlightButterflyManager.handleGuestCounterUpdate(data);
                });
            } else {
                this.moonlightButterflyManager.handleGuestCounterUpdate(data);
            }
        }
        // Handle CrumTheClassPet counter updates
        else if (creatureName === 'CrumTheClassPet') {
            if (!this.crumTheClassPetManager) {
                import('./Creatures/crumTheClassPet.js').then(({ default: CrumTheClassPetCreature }) => {
                    this.crumTheClassPetManager = new CrumTheClassPetCreature(this);
                    this.crumTheClassPetManager.handleGuestCounterUpdate(data);
                });
            } else {
                this.crumTheClassPetManager.handleGuestCounterUpdate(data);
            }
        }
        else if (creatureName === 'GrinningCat') {
            if (!this.grinningCatManager) {
                import('./Creatures/grinningCat.js').then(({ default: GrinningCatCreature }) => {
                    this.grinningCatManager = new GrinningCatCreature(this);
                    this.grinningCatManager.handleGuestCounterUpdate(data);
                });
            } else {
                this.grinningCatManager.handleGuestCounterUpdate(data);
            }
        }
        else if (creatureName === 'ExplodingSkull') {
            if (!bm.explodingSkullManager) {
                import('./Creatures/explodingSkull.js').then(({ default: ExplodingSkullCreature }) => {
                    bm.explodingSkullManager = new ExplodingSkullCreature(bm);
                    bm.explodingSkullManager.handleGuestCounterUpdate(data);
                });
            } else {
                bm.explodingSkullManager.handleGuestCounterUpdate(data);
            }
        }
    }

    // Helper method to get attacker name from sync data
    getAttackerNameFromSyncData(attackerAbsoluteSide, attackerPosition) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const attackerLocalSide = (attackerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const heroes = attackerLocalSide === 'player' ? this.playerHeroes : this.opponentHeroes;
        const attacker = heroes[attackerPosition];
        
        return attacker ? attacker.name : 'Unknown Hero';
    }

    // Helper method to find defender from sync info
    findDefenderFromSyncInfo(defenderInfo) {
        if (!defenderInfo) return null;
        
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const defenderLocalSide = (defenderInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (defenderInfo.type === 'hero') {
            const heroes = defenderLocalSide === 'player' ? this.playerHeroes : this.opponentHeroes;
            return heroes[defenderInfo.position];
        } else if (defenderInfo.type === 'creature') {
            const heroes = defenderLocalSide === 'player' ? this.playerHeroes : this.opponentHeroes;
            const hero = heroes[defenderInfo.position];
            return hero?.creatures?.[defenderInfo.creatureIndex];
        }
        
        return null;
    }



    
    getSpellStatistics() {
        return this.spellSystem ? this.spellSystem.getSpellStatistics() : null;
    }

    guest_handleRandomnessSeed(data) {
        const { seed } = data;
        if (seed) {
            this.randomnessManager.initializeFromSeed(seed);
        }
    }

    guest_handleCreatureAction(data) {
        const { position, playerCreature, opponentCreature } = data;
        
        const shakePromises = [];
        
        if (playerCreature) {
            shakePromises.push(this.animationManager.shakeCreature('player', position, playerCreature.index));
            this.addCombatLog(`⚡ ${playerCreature.name} activates!`, 'success');
        }
        
        if (opponentCreature) {
            shakePromises.push(this.animationManager.shakeCreature('opponent', position, opponentCreature.index));
            this.addCombatLog(`⚡ ${opponentCreature.name} activates!`, 'error');
        }
        
        return Promise.all(shakePromises);
    }

    guest_handleActorAction(data) {
        const { position, playerActor, opponentActor } = data;
        
        // Only log creature activations - don't shake them
        // The actual animation will come from creature-specific messages
        if (playerActor && playerActor.type === 'creature') {
            this.addCombatLog(`⚡ ${playerActor.name} activates!`, 'success');
        }
        
        if (opponentActor && opponentActor.type === 'creature') {
            this.addCombatLog(`⚡ ${opponentActor.name} activates!`, 'error');
        }
        
        // Heroes don't need handling here since they're handled by
        // 'hero_turn_execution' messages
    }

    guest_handleHeroTurnExecution(data) {
        return this.guest_handleCombinedTurnExecution(data);
    }


    guest_handleNecromancyRevival(data) {
        if (this.necromancyManager) {
            this.necromancyManager.handleGuestNecromancyRevival(data);
        }
    }

    guest_handleMoniaProtectionEffect(data) {
        if (this.isAuthoritative)return;

        if (!this.moniaEffect)this.moniaEffect = new MoniaHeroEffect(this);
        
        this.moniaEffect.handleGuestProtectionEffect(data);
    }

    guest_handleNomuShieldApplied(data) {
        if (this.isAuthoritative) return;

        NomuHeroEffect.handleGuestNomuShield(data, this);
    }

    guest_handleStoneskinDamageReduction(data) {
        if (this.damageSourceManager) {
            this.damageSourceManager.handleGuestStoneskinReduction(data);
        }
    }

    guest_handleGatheringStormDamage(data) {
        if (this.isAuthoritative) {
            return;
        }

        try {
            import('./Spells/gatheringStorm.js').then(({ handleGuestGatheringStormDamage }) => {
                handleGuestGatheringStormDamage(data, this);
            }).catch(error => {
                console.error('Error handling guest gathering storm:', error);
            });
        } catch (error) {
            console.error('Error importing gathering storm handler:', error);
        }
    }

    guest_handleFutureTechFistsShield(data) {
        if (this.isAuthoritative) return;

        // Use the existing instance from AttackEffectsManager
        if (this.attackEffectsManager && this.attackEffectsManager.futureTechFistsArtifact) {
            this.attackEffectsManager.futureTechFistsArtifact.handleGuestShieldGeneration(data);
        }
    }



    // GUEST: Handle combined turn execution
    async guest_handleCombinedTurnExecution(data) {
        const { playerAction, opponentAction, position, damageModifiers, animationTiming } = data;

        // Update guest hero displays
        this.updateGuestHeroDisplays(playerAction, opponentAction);
        
        // Add combat log messages
        if (playerAction && opponentAction) {
            this.addCombatLog(`⚔️ Both heroes attack!`, 'warning');
        } else if (playerAction) {
            this.addCombatLog(`🗡️ Player hero attacks!`, 'success');
        } else if (opponentAction) {
            this.addCombatLog(`🗡️ Opponent hero attacks!`, 'error');
        } else {
            console.warn('⚠️ [HANDLER DEBUG] No actions to execute - both playerAction and opponentAction are falsy');
        }

        // Execute attack animations with timing data
        if (playerAction && opponentAction) {
            await this.guest_executeSimultaneousAttacks(playerAction, opponentAction, animationTiming);
        } else if (playerAction) {
            await this.guest_executeSingleAttack(playerAction, animationTiming);
        } else if (opponentAction) {
            await this.guest_executeSingleAttack(opponentAction, animationTiming);
        }
        
        // ============================================
        // Handle damage modifier visual effects for guest
        // ============================================
        if (damageModifiers && this.attackEffectsManager && this.attackEffectsManager.mastersSwordEffect) {
            // Small delay to sync with animation timing
            await this.delay(100);
            
            if (damageModifiers.player && damageModifiers.player.length > 0) {
                for (const mod of damageModifiers.player) {
                    if (mod.name === 'TheMastersSword' && playerAction && playerAction.targetData) {
                        // Find the target and apply visual effect
                        const target = this.findTargetFromActionData(playerAction.targetData);
                        if (target) {
                            this.attackEffectsManager.mastersSwordEffect.createSwordSlashAnimation(
                                target,
                                mod.swordCount,
                                mod.multiplier
                            );
                            this.addCombatLog(
                                `✨ The Master's Sword activates! Damage ×${mod.multiplier}!`,
                                'success'
                            );
                        }
                    }
                }
            }
            
            if (damageModifiers.opponent && damageModifiers.opponent.length > 0) {
                for (const mod of damageModifiers.opponent) {
                    if (mod.name === 'TheMastersSword' && opponentAction && opponentAction.targetData) {
                        // Find the target and apply visual effect
                        const target = this.findTargetFromActionData(opponentAction.targetData);
                        if (target) {
                            this.attackEffectsManager.mastersSwordEffect.createSwordSlashAnimation(
                                target,
                                mod.swordCount,
                                mod.multiplier
                            );
                            this.addCombatLog(
                                `✨ Opponent's Master's Sword activates! Damage ×${mod.multiplier}!`,
                                'error'
                            );
                        }
                    }
                }
            }
            
            // Wait for effect animations if any were triggered
            if ((damageModifiers.player?.length > 0) || (damageModifiers.opponent?.length > 0)) {
                await this.delay(100);
            }
        }
        
        this.clearAllTemporaryModifiers();
        
        this.sendAcknowledgment('turn_complete');
    }

    findTargetFromActionData(targetData) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetData.type === 'hero') {
            const heroes = targetLocalSide === 'player' ? this.playerHeroes : this.opponentHeroes;
            return heroes[targetData.position];
        } else if (targetData.type === 'creature') {
            const heroes = targetLocalSide === 'player' ? this.playerHeroes : this.opponentHeroes;
            const hero = heroes[targetData.position];
            return hero?.creatures?.[targetData.creatureIndex];
        }
        
        return null;
    }

    // Update guest hero displays
    updateGuestHeroDisplays(playerAction, opponentAction) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        
        const updateDisplay = (action, heroesObj) => {
            if (!action || !action.attackerData) return;
            
            const localSide = (action.attackerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const hero = heroesObj[action.attackerData.position];
            
            if (hero) {
                // Store the unique equipment count from the authoritative source
                if (action.attackerData.name === 'Toras' && action.attackerData.uniqueEquipmentCount !== undefined) {
                    hero._syncedUniqueEquipmentCount = action.attackerData.uniqueEquipmentCount;
                }
                this.updateHeroAttackDisplay(localSide, action.attackerData.position, hero);
            }
        };
        
        updateDisplay(playerAction, playerAction && playerAction.attackerData.absoluteSide === myAbsoluteSide 
            ? this.playerHeroes : this.opponentHeroes);
        updateDisplay(opponentAction, opponentAction && opponentAction.attackerData.absoluteSide === myAbsoluteSide 
            ? this.playerHeroes : this.opponentHeroes);
    }

    // Clear all temporary modifiers
    clearAllTemporaryModifiers() {
        ['left', 'center', 'right'].forEach(pos => {
            if (this.playerHeroes[pos]) {
                this.playerHeroes[pos].clearTemporaryModifiers();
                this.updateHeroAttackDisplay('player', pos, this.playerHeroes[pos]);
            }
            if (this.opponentHeroes[pos]) {
                this.opponentHeroes[pos].clearTemporaryModifiers();
                this.updateHeroAttackDisplay('opponent', pos, this.opponentHeroes[pos]);
            }
        });
    }

    // GUEST: Execute simultaneous attacks
    async guest_executeSimultaneousAttacks(playerAction, opponentAction, animationTiming = null) {

        const heroes = this.getGuestHeroesForActions(playerAction, opponentAction);
        
        
        if (heroes.playerHero && heroes.opponentHero) {
            const playerAttack = this.reconstructAttackObject(playerAction, heroes.playerHero, heroes.playerLocalSide);
            const opponentAttack = this.reconstructAttackObject(opponentAction, heroes.opponentHero, heroes.opponentLocalSide);
            
            const animations = [];
            
            // Player attack animation
            if (playerAttack.target) {                
                if (playerAttack.target.type === 'creature') {
                    animations.push(this.animationManager.animateHeroToCreatureAttack(
                        playerAttack.hero, playerAttack.target, heroes.playerLocalSide, animationTiming
                    ));
                } else {
                    const targetElement = this.getHeroElement(playerAttack.target.side, playerAttack.target.position);
                    
                    animations.push(this.animationManager.animateCollisionAttackTowards(
                        playerAttack.hero, 
                        targetElement, 
                        heroes.playerLocalSide, animationTiming
                    ));
                }
            } else {
                console.warn('❌ [ANIMATION DEBUG] Player attack animation SKIPPED - no target:', {
                    reason: playerAttack.debugInfo?.reason || 'unknown'
                });
            }
            
            // Opponent attack animation  
            if (opponentAttack.target) {                
                if (opponentAttack.target.type === 'creature') {
                    animations.push(this.animationManager.animateHeroToCreatureAttack(
                        opponentAttack.hero, opponentAttack.target, heroes.opponentLocalSide, animationTiming
                    ));
                } else {
                    const targetElement = this.getHeroElement(opponentAttack.target.side, opponentAttack.target.position);                    
                    animations.push(this.animationManager.animateCollisionAttackTowards(
                        opponentAttack.hero, 
                        targetElement, 
                        heroes.opponentLocalSide, animationTiming
                    ));
                }
            } else {
                console.warn('❌ [ANIMATION DEBUG] Opponent attack animation SKIPPED - no target:', {
                    reason: opponentAttack.debugInfo?.reason || 'unknown'
                });
            }
            
            if (animations.length > 0) {
                await Promise.all(animations);
            } else {
                console.error('❌ [ANIMATION DEBUG] NO ANIMATIONS TO RUN - both targets failed');
            }
            
            // Return animations with correct local sides
            await Promise.all([
                this.animationManager.animateReturn(heroes.playerHero, heroes.playerLocalSide, animationTiming),
                this.animationManager.animateReturn(heroes.opponentHero, heroes.opponentLocalSide, animationTiming)
            ]);
        } else {
            console.error('❌ [ANIMATION DEBUG] Heroes not found for simultaneous attacks:', {
                playerHeroMissing: !heroes.playerHero,
                opponentHeroMissing: !heroes.opponentHero
            });
        }
    }

    // Get guest heroes for actions
    getGuestHeroesForActions(playerAction, opponentAction) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        
        const playerLocalSide = (playerAction.attackerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const opponentLocalSide = (opponentAction.attackerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';

        const playerHero = playerLocalSide === 'player' 
            ? this.playerHeroes[playerAction.attackerData.position]
            : this.opponentHeroes[playerAction.attackerData.position];
            
        const opponentHero = opponentLocalSide === 'player' 
            ? this.playerHeroes[opponentAction.attackerData.position]
            : this.opponentHeroes[opponentAction.attackerData.position];

        return {
            playerHero,
            opponentHero,
            playerLocalSide,
            opponentLocalSide
        };
    }

    // GUEST: Execute single attack
    async guest_executeSingleAttack(action) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const attackerLocalSide = (action.attackerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const localAttacker = attackerLocalSide === 'player' 
            ? this.playerHeroes[action.attackerData.position]
            : this.opponentHeroes[action.attackerData.position];

        if (localAttacker) {
            // Reconstruct attack object to match host format
            const attack = this.reconstructAttackObject(action, localAttacker, attackerLocalSide);
            
            // Use the SAME method as host: animateHeroAttack
            await this.animationManager.animateHeroAttack(attack.hero, attack.target);
            
            // Use the SAME return animation as host
            await this.animationManager.animateReturn(localAttacker, attackerLocalSide);
        }
    }

    reconstructAttackObject(actionData, attackerHero, attackerLocalSide) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        
        // Find the target
        let target = null;
        let debugInfo = { targetFound: false, reason: 'unknown' };
        
        if (!actionData || !actionData.targetData) {
            debugInfo.reason = 'missing_action_or_target_data';
            console.warn('❌ [ANIMATION DEBUG] Missing actionData or targetData');
            return {
                hero: attackerHero,
                target: null,
                damage: actionData?.damage || 0,
                effectsTriggered: [],
                isRanged: false,
                debugInfo: debugInfo
            };
        }
        
        if (actionData.targetData.type === 'creature') {
            const targetLocalSide = (actionData.targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const targetHeroes = targetLocalSide === 'player' ? this.playerHeroes : this.opponentHeroes;
            const targetHero = targetHeroes[actionData.targetData.position];
                        
            if (!targetHero) {
                debugInfo.reason = 'target_hero_not_found';
                console.warn('❌ [ANIMATION DEBUG] Target hero not found:', {
                    targetLocalSide,
                    position: actionData.targetData.position,
                    availableHeroes: Object.keys(targetHeroes)
                });
            } else if (!targetHero.creatures) {
                debugInfo.reason = 'target_hero_no_creatures';
                console.warn('❌ [ANIMATION DEBUG] Target hero has no creatures array');
            } else if (actionData.targetData.creatureIndex >= targetHero.creatures.length) {
                debugInfo.reason = 'creature_index_out_of_bounds';
                console.warn('❌ [ANIMATION DEBUG] Creature index out of bounds:', {
                    requestedIndex: actionData.targetData.creatureIndex,
                    availableCreatures: targetHero.creatures.length,
                    creatureNames: targetHero.creatures.map(c => c.name)
                });
            } else {
                const creature = targetHero.creatures[actionData.targetData.creatureIndex];
                if (!creature) {
                    debugInfo.reason = 'creature_not_found_at_index';
                    console.warn('❌ [ANIMATION DEBUG] Creature not found at index:', actionData.targetData.creatureIndex);
                } else {
                    target = {
                        type: 'creature',
                        hero: targetHero,
                        creature: creature,
                        creatureIndex: actionData.targetData.creatureIndex,
                        position: actionData.targetData.position,
                        side: targetLocalSide
                    };
                    debugInfo.targetFound = true;
                    debugInfo.reason = 'creature_found';
                }
            }
        } else {
            // Hero target
            const targetLocalSide = (actionData.targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const targetHeroes = targetLocalSide === 'player' ? this.playerHeroes : this.opponentHeroes;
            const targetHero = targetHeroes[actionData.targetData.position];
            
            if (!targetHero) {
                debugInfo.reason = 'target_hero_not_found';
                console.warn('❌ [ANIMATION DEBUG] Target hero not found:', {
                    targetLocalSide,
                    position: actionData.targetData.position,
                    availableHeroes: Object.keys(targetHeroes)
                });
            } else {                
                target = {
                    type: 'hero',
                    hero: targetHero,
                    position: actionData.targetData.position,
                    side: targetLocalSide
                };
                debugInfo.targetFound = true;
                debugInfo.reason = 'hero_found';
            }
        }
        
        const result = {
            hero: attackerHero,
            target: target,
            damage: actionData.damage || 0,
            effectsTriggered: [],
            isRanged: false,
            debugInfo: debugInfo
        };
        
        return result;
    }

    calculateWealthBonus(heroes) {
        return this.combatManager ? 
            this.combatManager.calculateWealthBonus(heroes) : 
            0;
    }

    async getBothPlayersDelayedEffects() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return null;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('gameState').once('value');
            const gameState = snapshot.val();
            
            if (!gameState) return null;
            
            return {
                host: gameState.hostdelayedEffects || [],
                guest: gameState.guestdelayedEffects || []
            };
        } catch (error) {
            return null;
        }
    }

    // Apply battle results
    applyBattleResults(hostResult, guestResult, hostLives, guestLives, hostGold, guestGold) {
        if (this.lifeManager) {
            if (this.isHost) {
                this.lifeManager.setPlayerLives(hostLives);
                this.lifeManager.setOpponentLives(guestLives);
            } else {
                this.lifeManager.setPlayerLives(guestLives);
                this.lifeManager.setOpponentLives(hostLives);
            }
        }
    }

    // Cleanup battle state
    async cleanupBattleState() {
        try {
            if (this.persistenceManager) {
                await this.persistenceManager.clearBattleState();
            }
        
            if (this.roomManager && this.roomManager.getRoomRef()) {
                await this.roomManager.getRoomRef().child('gameState').update({
                    battleStarted: false,
                    battleActive: false,
                    lastBattleStateUpdate: null
                });
            }
        } catch (error) {
        }
    }

    // Handle hero death
    handleHeroDeath(hero) {
        // Clear all status effects from the hero when it dies
        if (this.statusEffectsManager) {
            this.statusEffectsManager.clearAllStatusEffects(hero);
        }

        // Remove frost rune effects when hero dies
        if (this.spellSystem && this.spellSystem.spellImplementations.has('FrostRune')) {
            const frostRuneSpell = this.spellSystem.spellImplementations.get('FrostRune');
            frostRuneSpell.removeFrostRuneOnDeath(hero, hero.side, hero.position);
        }

        //this.addCombatLog(`💀 ${hero.name} has been defeated!`, 'error');
        
        const heroElement = this.getHeroElement(hero.side, hero.position);
        if (heroElement) {
            const card = heroElement.querySelector('.battle-hero-card');
            if (card) {
                card.classList.add('defeated');
                card.style.filter = 'grayscale(100%)';
                card.style.opacity = '0.5';
            }
        }
    }

    // Update hero health bar with HP text
    updateHeroHealthBar(side, position, currentHp, maxHp) {
        const heroElement = this.getHeroElement(side, position);
        if (!heroElement) return;

        const healthFill = heroElement.querySelector('.health-fill');
        const healthBar = heroElement.querySelector('.health-bar');
        
        // Get hero object directly and read shield from hero, not combat manager
        const heroes = side === 'player' ? this.playerHeroes : this.opponentHeroes;
        const hero = heroes[position];
        const currentShield = hero ? (hero.currentShield || 0) : 0; // Read directly from hero
        
        if (healthFill) {
            const percentage = Math.max(0, (currentHp / maxHp) * 100);
            healthFill.style.width = `${percentage}%`;
            
            if (percentage > 60) {
                healthFill.style.background = 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)';
            } else if (percentage > 30) {
                healthFill.style.background = 'linear-gradient(90deg, #ff9800 0%, #ffa726 100%)';
            } else {
                healthFill.style.background = 'linear-gradient(90deg, #f44336 0%, #ef5350 100%)';
            }
        }
        
        if (healthBar) {
            // Update or create HP text
            let hpText = healthBar.querySelector('.hp-text');
            if (!hpText) {
                hpText = document.createElement('div');
                hpText.className = 'hp-text';
                hpText.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 10px;
                    font-weight: bold;
                    color: white;
                    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                    z-index: 10;
                    pointer-events: none;
                `;
                healthBar.appendChild(hpText);
            }
            
            // Update HP text with shield info
            if (currentShield > 0) {
                hpText.textContent = `${currentHp}/${maxHp} (+${currentShield} 🛡️)`;
                hpText.style.color = '#00ccff';
                hpText.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 204, 255, 0.6)';
            } else {
                hpText.textContent = `${currentHp}/${maxHp}`;
                hpText.style.color = 'white';
                hpText.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';
            }

            // Add shield bar if hero has shield - IMPROVED WITH FORCE UPDATE
            if (currentShield > 0) {
                let shieldBar = healthBar.querySelector('.shield-bar');
                if (!shieldBar) {
                    shieldBar = document.createElement('div');
                    shieldBar.className = 'shield-bar';
                    shieldBar.style.cssText = `
                        position: absolute;
                        top: -4px;
                        left: 0;
                        right: 0;
                        height: 4px;
                        background: linear-gradient(90deg, #00ccff 0%, #0099cc 100%);
                        border-radius: 2px;
                        border: 1px solid rgba(0, 204, 255, 0.8);
                        box-shadow: 0 0 6px rgba(0, 204, 255, 0.6);
                        z-index: 11;
                    `;
                    healthBar.appendChild(shieldBar);
                }
                
                // Force shield bar to be visible and updated
                shieldBar.style.display = 'block';
                shieldBar.style.opacity = '1';
                
                // Add shield glow to health bar
                healthBar.style.boxShadow = '0 0 10px rgba(0, 204, 255, 0.5)';
                healthBar.setAttribute('data-has-shield', 'true');
                
            } else {
                // Remove or hide shield bar if no shield
                const shieldBar = healthBar.querySelector('.shield-bar');
                if (shieldBar) {
                    shieldBar.style.display = 'none';
                    shieldBar.style.opacity = '0';
                }
                
                // Remove shield glow
                healthBar.style.boxShadow = '';
                healthBar.removeAttribute('data-has-shield');
            }
        }
    }

    // Update hero attack display - SIMPLIFIED to use pre-calculated stats
    updateHeroAttackDisplay(side, position, hero) {
        const heroElement = this.getHeroElement(side, position);
        if (!heroElement || !hero) return;

        const attackBase = heroElement.querySelector('.attack-base');
        const attackBonus = heroElement.querySelector('.attack-bonus');
        const attackContainer = heroElement.querySelector('.battle-hero-attack');
        
        if (attackBase && attackBonus) {
            const currentAttack = hero.getCurrentAttack(); 
            attackBase.textContent = currentAttack;
            
            // Show battle bonuses if active
            const battleBonus = hero.battleAttackBonus || 0;
            if (battleBonus > 0) {
                attackBonus.textContent = `+${battleBonus}`;
                attackBonus.style.display = 'inline';
                if (attackContainer) {
                    attackContainer.classList.add('attack-buffed');
                    attackContainer.classList.remove('attack-debuffed');
                }
                
                // Add tooltip to show it's a battle bonus
                attackContainer.title = `Base Attack: ${hero.atk}, Battle Bonus: +${battleBonus}, Total: ${currentAttack}`;
            } else {
                attackBonus.style.display = 'none';
                if (attackContainer) {
                    attackContainer.classList.remove('attack-buffed', 'attack-debuffed');
                    attackContainer.title = `Attack: ${currentAttack}`;
                }
            }
        }
    }

    // Get hero element by side and position
    getHeroElement(side, position) {
        const selector = `.${side}-slot.${position}-slot`;
        const element = document.querySelector(selector);
        if (!element) {
        }
        return element;
    }

    // Check if battle should end
    checkBattleEnd() {
        if (!this.flowManager) {
            return false;
        }
        return this.flowManager.checkBattleEnd();
    }

    // Handle battle end
    async handleBattleEnd() {
        // Create final checkpoint before cleanup
        if (this.isAuthoritative && this.checkpointSystem) {
            await this.checkpointSystem.createBattleCheckpoint('battle_end');
        }
        
        // Transfer burning finger stacks from battle heroes to permanent heroes
        this.battleScreen.transferBurningFingerStacksToPermanent();
        
        if (this.kazenaEffect) {
            this.kazenaEffect.transferCountersToFormation(this);
        }

        // Handle CrystalWell card exchange before battle ends
        if (window.crystalWellManager && this.isAuthoritative) {
            try {
                window.crystalWellManager.handleEndOfBattleExchange(this);
            } catch (error) {
                console.error('Error during CrystalWell exchange:', error);
            }
        }

        // Transfer area card counters back to heroSelection
        if (window.heroSelection && window.heroSelection.areaHandler) {
            // Sync player area card with updated counters
            if (this.playerAreaCard) {
                // SAFETY CHECK: Reset DoomClock counters if they're 12 or higher
                if (this.playerAreaCard.name === 'DoomClock' && this.playerAreaCard.doomCounters >= 12) {
                    this.playerAreaCard.doomCounters = 0;
                }
                window.heroSelection.areaHandler.setAreaCard(this.playerAreaCard);
            }
            
            // Sync opponent area card with updated counters  
            if (this.opponentAreaCard) {
                // SAFETY CHECK: Reset DoomClock counters if they're 12 or higher
                if (this.opponentAreaCard.name === 'DoomClock' && this.opponentAreaCard.doomCounters >= 12) {
                    this.opponentAreaCard.doomCounters = 0;
                }
                window.heroSelection.areaHandler.opponentAreaCard = this.opponentAreaCard;
            }
        }

        // Collect permanent guardian skeletons before cleanup
        let permanentGuardians = [];
        if (this.isAuthoritative) {
            try {
                const { SkeletonKingSkullmaelCreature } = await import('./Creatures/skeletonKingSkullmael.js');
                permanentGuardians = SkeletonKingSkullmaelCreature.collectPermanentGuardiansFromBattle(this);
            } catch (error) {
                console.error('Error collecting permanent guardian skeletons:', error);
            }
        }

        // Collect permanent captures before cleanup
        let permanentCaptures = [];
        if (this.isAuthoritative) {
            try {
                const { CaptureNetArtifact } = await import('./Artifacts/captureNet.js');
                permanentCaptures = CaptureNetArtifact.collectPermanentCapturesFromBattle(this);
            } catch (error) {
                console.error('Error collecting permanent captures:', error);
            }
        }

        this.battleActive = false;
        
        if (this.isAuthoritative) {
            // Final reconnection check - don't end if guest is reconnecting
            if (this.guestReconnecting) {
                this.battleActive = true; // Re-activate battle
                return;
            }

            const hostHeroesAlive = Object.values(this.playerHeroes).some(hero => hero && hero.alive);
            const guestHeroesAlive = Object.values(this.opponentHeroes).some(hero => hero && hero.alive);
            
            const { hostResult, guestResult } = this.determineBattleResults(hostHeroesAlive, guestHeroesAlive);

            // Set game phase to Reward BEFORE clearing battle states
            await this.setGamePhaseToReward();

            // Apply FlamebathedWaflav battle end effects
            try {
                const { FlamebathedWaflavHeroEffect } = await import('./Heroes/flamebathedWaflav.js');
                await FlamebathedWaflavHeroEffect.applyFlamebathedWaflavEffectsAtBattleEnd(this);
            } catch (error) {
                console.error('Error applying FlamebathedWaflav battle end effects:', error);
            }

            // Transfer counters back to heroSelection for host
            if (window.heroSelection) {
                // Restore host's own player counters
                window.heroSelection.playerCounters = this.playerCounters || { 
                    birthdayPresent: 0, 
                    teleports: 0, 
                    goldenBananas: 0, 
                    evolutionCounters: 1,
                    lunaBuffs: 0,
                    supplyChain: 0 
                };
                // The opponent's counters become the host's opponent counter data
                window.heroSelection.opponentCounters = this.opponentCounters || { 
                    birthdayPresent: 0, 
                    teleports: 0, 
                    goldenBananas: 0, 
                    evolutionCounters: 1,
                    lunaBuffs: 0,
                    supplyChain: 0 
                };
            }

            // Mark battle as ended with timestamp for reconnection detection
            if (this.roomManager && this.roomManager.getRoomRef()) {
                await this.roomManager.getRoomRef().child('gameState').update({
                    battleActive: false,
                    battleStarted: false,
                    battleEndedAt: Date.now(),
                    battleResult: {
                        hostResult,
                        guestResult,
                        endedAt: Date.now()
                    }
                });
            }

            await this.clearBattleReadyStates();
            
            this.applyLifeChanges(hostResult);
            
            // Award gold with wealth bonuses
            const { hostGoldGain, guestGoldGain } = this.awardGold(hostResult, guestResult);
            
            await this.saveBattleStateToPersistence();
            
            let newTurn = 1;
            if (this.battleScreen && this.battleScreen.turnTracker) {
                newTurn = await this.battleScreen.turnTracker.incrementTurn();
                
                // Reset ability tracking for the new turn
                if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
                    window.heroSelection.heroAbilitiesManager.resetTurnBasedTracking();
                }
            }

            // Calculate Royal Corgi bonuses for BOTH players
            let hostRoyalCorgiBonusCards = 0;
            let guestRoyalCorgiBonusCards = 0;
            
            if (this.royalCorgiManager) {
                // Host's bonus (their playerHeroes)
                const hostCreatures = {
                    left: this.playerHeroes.left?.creatures || [],
                    center: this.playerHeroes.center?.creatures || [],
                    right: this.playerHeroes.right?.creatures || []
                };
                hostRoyalCorgiBonusCards = this.royalCorgiManager.calculateBonusCardsForPlayer(hostCreatures);
                
                // Guest's bonus (host's opponentHeroes)
                const guestCreatures = {
                    left: this.opponentHeroes.left?.creatures || [],
                    center: this.opponentHeroes.center?.creatures || [],
                    right: this.opponentHeroes.right?.creatures || []
                };
                guestRoyalCorgiBonusCards = this.royalCorgiManager.calculateBonusCardsForPlayer(guestCreatures);
            }
            
            // Store host's Royal Corgi bonus for the reward system
            if (window.heroSelection && window.heroSelection.cardRewardManager) {
                window.heroSelection.cardRewardManager.cachedRoyalCorgiBonusCards = hostRoyalCorgiBonusCards;
            }
            
            // ===== CLEAR POTION EFFECTS AFTER BATTLE =====
            if (window.potionHandler) {
                try {
                    window.potionHandler.clearPotionEffects();
                } catch (error) {
                    console.error('Error clearing potion effects:', error);
                }
            }

            // Sync doom counters to guest
            if (this.isAuthoritative) {
                const { syncDoomCountersAfterBattle } = await import('./Spells/doomClock.js');
                syncDoomCountersAfterBattle(this);
            }
            
            const battleEndData = {
                hostResult,
                guestResult,
                hostLives: this.lifeManager ? this.lifeManager.getPlayerLives() : 10,
                guestLives: this.lifeManager ? this.lifeManager.getOpponentLives() : 10,
                hostGold: this.goldManager ? this.goldManager.getPlayerGold() : 0,
                guestGold: this.goldManager ? this.goldManager.getOpponentGold() : 0,
                newTurn: newTurn,
                permanentGuardians: permanentGuardians,
                permanentCaptures: permanentCaptures,
                // ADD COUNTER DATA FOR BOTH HOST AND GUEST
                hostPlayerCounters: this.playerCounters || { 
                    birthdayPresent: 0, 
                    teleports: 0, 
                    goldenBananas: 0, 
                    evolutionCounters: 1,
                    lunaBuffs: 0,
                    supplyChain: 0
                },
                guestPlayerCounters: this.opponentCounters || { 
                    birthdayPresent: 0, 
                    teleports: 0, 
                    goldenBananas: 0, 
                    evolutionCounters: 1,
                    lunaBuffs: 0,
                    supplyChain: 0
                },
                // ADD ROYAL CORGI BONUS DATA
                hostRoyalCorgiBonusCards: hostRoyalCorgiBonusCards,
                guestRoyalCorgiBonusCards: guestRoyalCorgiBonusCards
            };
            
            // Save final battle state before cleanup
            await this.saveFinalBattleState();
            
            this.sendBattleUpdate('battle_end', battleEndData);
            
            const hostMessage = this.getResultMessage(hostResult);
            this.addCombatLog(`${hostMessage}`, hostResult === 'victory' ? 'success' : hostResult === 'defeat' ? 'error' : 'info');
            await this.showBattleResult(hostMessage);

            // UPDATE DECK MANAGER WITH MODIFIED DECK
            if (window.heroSelection && window.heroSelection.deckManager) {
                const playerDeck = this.getPlayerDeck();
                
                // Update the main deck manager with the modified player deck
                window.heroSelection.deckManager.importDeck({
                    cards: playerDeck,
                    size: playerDeck.length,
                    uniqueCards: [...new Set(playerDeck)].length,
                    timestamp: Date.now()
                });
            }

            // UPDATE GRAVEYARD MANAGER WITH MODIFIED GRAVEYARD
            if (window.heroSelection && window.heroSelection.graveyardManager) {
                const playerGraveyard = this.getPlayerGraveyard();
                
                // Update the main graveyard manager with the modified player graveyard
                window.heroSelection.graveyardManager.importGraveyard({
                    cards: playerGraveyard,
                    size: playerGraveyard.length,
                    timestamp: Date.now()
                });
            }
            
            await this.cleanupAfterBattle();
            
            // Cache opponent data for reward calculations BEFORE calling onBattleEnd
            if (window.heroSelection && window.heroSelection.cardRewardManager) {
                window.heroSelection.cardRewardManager.cacheOpponentDataForRewards(
                    this.opponentFormation, 
                    this.opponentAbilities
                );
            }

            if (this.onBattleEnd) {
                this.onBattleEnd(hostResult);
            }

            // Transfer permanent guardians to formation for host
            if (permanentGuardians.length > 0) {
                try {
                    const { SkeletonKingSkullmaelCreature } = await import('./Creatures/skeletonKingSkullmael.js');
                    SkeletonKingSkullmaelCreature.transferPermanentGuardiansToFormation(
                        permanentGuardians, 
                        window.heroSelection
                    );
                } catch (error) {
                    console.error('Error transferring permanent guardian skeletons to host formation:', error);
                }
            }

            // Transfer permanent captures to formation for host
            if (permanentCaptures.length > 0) {
                try {
                    const { CaptureNetArtifact } = await import('./Artifacts/captureNet.js');
                    CaptureNetArtifact.transferPermanentCapturesToFormation(
                        permanentCaptures, 
                        window.heroSelection
                    );
                } catch (error) {
                    console.error('Error transferring permanent captures to host formation:', error);
                }
            }
        }
    }

    // Save final battle state for viewing during rewards
    async saveFinalBattleState() {
        if (!this.persistenceManager || !this.roomManager) return;
        
        try {
            // Export current battle state with all details
            const finalState = this.exportBattleState();
            
            // Add additional metadata
            finalState.isFinalState = true;
            finalState.savedAt = Date.now();
            finalState.battleLog = this.battleLog; // Ensure full battle log is saved
            
            // Save it under a different key in Firebase
            const roomRef = this.roomManager.getRoomRef();
            if (roomRef) {
                await roomRef.child('gameState').child('finalBattleState').set(
                    this.persistenceManager.sanitizeForFirebase(finalState)
                );
            }
        } catch (error) {
        }
    }

    // Restore final battle state for viewing
    async restoreFinalBattleState(finalState) {
        try {            
            // Don't reactivate the battle
            this.battleActive = false;
            
            // Initialize Ability managers if not already done
            if (!this.necromancyManager) {
                const { NecromancyManager } = await import('./Abilities/necromancy.js');
                this.necromancyManager = new NecromancyManager(this);
            }
            if (!this.diplomacyManager) {
                const { DiplomacyManager } = await import('./Abilities/diplomacy.js');
                this.diplomacyManager = new DiplomacyManager(this);
            }
            

            // Restore the state using existing restoration logic
            if (this.persistenceManager) {
                await this.persistenceManager.restoreBattleState(this, finalState);
            } else {
                // Fallback restoration
                this.restoreBattleState(finalState);
            }

            // Sync abilities for tooltip display
            if (this.battleScreen && this.battleScreen.syncAbilitiesFromBattleManager) {
                this.battleScreen.syncAbilitiesFromBattleManager();
            }
            
            // Make sure battle appears ended
            this.battleActive = false;
            this.turnInProgress = false;
            
            // Clear any pause overlays
            this.hideBattlePauseUI();
            
            // IMPORTANT: Force update all hero visuals after restoration
            await this.delay(100); // Small delay to ensure DOM is ready
            this.updateAllHeroVisuals();
            
            // Re-render creatures after restoration
            this.renderCreaturesAfterInit();
            
            // Explicitly refresh creature visuals to ensure defeated creatures have no health bars
            setTimeout(() => {
                this.refreshAllCreatureVisuals();
            }, 200);
            
            // Initialize and update necromancy displays
            if (this.necromancyManager) {
                this.necromancyManager.initializeNecromancyStackDisplays();
                
                // Update necromancy displays for all heroes
                ['left', 'center', 'right'].forEach(position => {
                    ['player', 'opponent'].forEach(side => {
                        const heroes = side === 'player' ? this.playerHeroes : this.opponentHeroes;
                        const hero = heroes[position];
                        if (hero) {
                            this.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(side, position, hero);
                        }
                    });
                });
            }
            
            // NEW: Restore combat log through BattleScreen
            if (finalState.battleLog && this.battleScreen && this.battleScreen.restoreBattleLogState) {
                this.battleScreen.restoreBattleLogState({
                    messages: finalState.battleLog
                });
            }
            return true;
        } catch (error) {
            return false;
        }
    }
    

    renderCreaturesAfterInit() {
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroInstance = side === 'player' 
                    ? this.playerHeroes[position]
                    : this.opponentHeroes[position];
                
                if (heroInstance && heroInstance.creatures && heroInstance.creatures.length > 0) {
                    const heroSlot = document.querySelector(`.${side}-slot.${position}-slot`);
                    if (heroSlot) {
                        // Remove existing creatures if any
                        const existingCreatures = heroSlot.querySelector('.battle-hero-creatures');
                        if (existingCreatures) {
                            existingCreatures.remove();
                        }
                        
                        // Add new creatures HTML
                        const creaturesHTML = this.battleScreen.createCreaturesHTML(heroInstance.creatures, side, position);
                        heroSlot.insertAdjacentHTML('beforeend', creaturesHTML);
                        
                        // Update necromancy displays
                        if (this.necromancyManager) {
                            this.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                                side, position, heroInstance
                            );
                        }
                    }
                }
            });
        });
    }

    async setGamePhaseToReward() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            await this.roomManager.getRoomRef().child('gameState').update({
                gamePhase: 'Reward',
                gamePhaseUpdated: Date.now(),
                battleEndedAt: Date.now()
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Determine battle results
    determineBattleResults(hostAlive, guestAlive) {
        let hostResult, guestResult;
        
        if (hostAlive && !guestAlive) {
            hostResult = 'victory';
            guestResult = 'defeat';
        } else if (!hostAlive && guestAlive) {
            hostResult = 'defeat';
            guestResult = 'victory';
        } else {
            hostResult = 'draw';
            guestResult = 'draw';
        }
        
        return { hostResult, guestResult };
    }

    // Clear battle ready states
    async clearBattleReadyStates() {
        if (this.roomManager && this.roomManager.getRoomRef()) {
            try {
                await this.roomManager.getRoomRef().child('gameState').update({
                    hostBattleReady: false,
                    guestBattleReady: false,
                    battleStarted: false,
                    battleActive: false,  // Battle is no longer active
                    battleStartTime: null,
                    hostBattleReadyTime: null,
                    guestBattleReadyTime: null,
                    // NOTE: We keep gamePhase as 'Reward' and lastBattleStateUpdate for reconnection
                    battleCleanedAt: Date.now()
                });
            } catch (error) {
            }
        }
    }

    // Apply life changes based on result
    applyLifeChanges(hostResult) {
        if (!this.lifeManager) return;
        
        if (hostResult === 'victory') {
            this.lifeManager.damageOpponent(1);
        } else if (hostResult === 'defeat') {
            this.lifeManager.damagePlayer(1);
        }
    }

    // Award gold based on results
    awardGold(hostResult, guestResult) {
        // Calculate wealth bonuses for logging only
        const hostWealthBonus = this.calculateWealthBonus(this.playerHeroes);
        const guestWealthBonus = this.calculateWealthBonus(this.opponentHeroes);
        
        // Return the battle results without awarding gold
        // Gold will be awarded by the reward screen
        return { 
            hostGoldGain: 0, 
            guestGoldGain: 0 
        };
    }

    // Cleanup after battle
    async cleanupAfterBattle() {
        if (this.persistenceManager) {
            await this.persistenceManager.clearBattleState();
        }

        // Clear all status effects from creatures and heroes
        if (this.statusEffectsManager) {
            this.statusEffectsManager.clearAllBattleStatusEffects();
        }

        // Clear battle bonuses from all Heroes and Creatures
        this.clearAllBattleBonuses();
        this.resetAllCreatureCounters();

        // ===== CLEANUP BOULDERS AFTER BATTLE =====
        try {
            const { BoulderInABottlePotion } = await import('./Potions/boulderInABottle.js');
            const bouldersRemoved = BoulderInABottlePotion.cleanupBouldersAfterBattle(this);
            
        } catch (error) {
        }

        // ===== CLEANUP DIPLOMACY AFTER BATTLE =====
        try {
            const { DiplomacyManager } = await import('./Abilities/diplomacy.js');
            DiplomacyManager.cleanupDiplomacyAfterBattle(this);
        } catch (error) {
        }

        // ===== CLEANUP GREATSWORD SKELETONS AFTER BATTLE =====
        try {
            const { SkullmaelsGreatswordArtifact } = await import('./Artifacts/skullmaelsGreatsword.js');
            SkullmaelsGreatswordArtifact.cleanupGreatswordSkeletonsAfterBattle(this);
        } catch (error) {
        }

        // ===== CLEANUP CAPTURED CREATURES AFTER BATTLE =====
        try {
            const { CaptureNetArtifact } = await import('./Artifacts/captureNet.js');
            CaptureNetArtifact.cleanupCapturedCreaturesAfterBattle(this);
        } catch (error) {
            console.error('Error cleaning up captured creatures after battle:', error);
        }

        // ===== CLEANUP HAT OF MADNESS AFTER BATTLE =====
        if (this.hatOfMadnessArtifact) {
            this.hatOfMadnessArtifact.cleanup();
            this.hatOfMadnessArtifact = null;
        }
        
        if (this.arrowSystem) {
            this.arrowSystem.cleanup();
            this.arrowSystem = null;
        }

        if (this.furiousAngerEffect) {
            this.furiousAngerEffect.cleanup();
            this.furiousAngerEffect = null;
        }
        
        // CREATURE CLEANUPS
        if (this.jigglesManager) {
            this.jigglesManager.cleanup();
        }
        if (this.skeletonArcherManager) {
            this.skeletonArcherManager.cleanup();
            this.skeletonArcherManager = null;
        }
        if (this.skeletonNecromancerManager) {
            this.skeletonNecromancerManager.cleanup();
            this.skeletonNecromancerManager = null;
        }
        if (this.skeletonDeathKnightManager) {
            this.skeletonDeathKnightManager.cleanup();
            this.skeletonDeathKnightManager = null;
        }
        if (this.skeletonReaperManager) {
            this.skeletonReaperManager.cleanup();
            this.skeletonReaperManager = null;
        }
        if (this.skeletonBardManager) {
            this.skeletonBardManager.cleanup();
            this.skeletonBardManager = null;
        }
        if (this.skeletonMageManager) {
            this.skeletonMageManager.cleanup();
            this.skeletonMageManager = null;
        }
        if (this.skeletonHealerManager) {
            this.skeletonHealerManager.cleanup();
            this.skeletonHealerManager = null;
        }
        if (this.explodingSkullManager) {
            this.explodingSkullManager.cleanup();
            this.explodingSkullManager = null;
        }
        if (this.cavalryManager) {
            this.cavalryManager.cleanup();
            this.cavalryManager = null;
        }
        if (this.archerManager) {
            this.archerManager.cleanup();
            this.archerManager = null;
        }
        if (this.moonlightButterflyManager) {
            this.moonlightButterflyManager.cleanup();
            this.moonlightButterflyManager = null;
        }
        if (this.royalCorgiManager) { 
            this.royalCorgiManager.cleanup();
            this.royalCorgiManager = null;
        }
        if (this.grinningCatManager) {
            this.grinningCatManager.cleanup();
            this.grinningCatManager = null;
        }
        if (this.crumTheClassPetManager) {
            this.crumTheClassPetManager.cleanup();
            this.crumTheClassPetManager = null;
        }
        if (this.futureTechMechManager) {
            this.futureTechMechManager.cleanup();
            this.futureTechMechManager = null;
        }
        if (this.graveWormManager) {
            this.graveWormManager.cleanup();
            this.graveWormManager = null;
        }
        if (this.blueIceDragonManager) {
            this.blueIceDragonManager.cleanup();
            this.blueIceDragonManager = null;
        }
        if (this.demonsGateManager) {
            this.demonsGateManager.cleanup();
            this.demonsGateManager = null;
        }
        if (this.lunaKiaiManager) {
            this.lunaKiaiManager.cleanup();
            this.lunaKiaiManager = null;
        }
        if (this.priestOfLunaManager) {
            this.priestOfLunaManager.cleanup();
            this.priestOfLunaManager = null;
        }
        if (this.cutePhoenixManager) {
            this.cutePhoenixManager.cleanup();
            this.cutePhoenixManager = null;
        }



        if (this.lunaManager) {
            this.lunaManager.cleanup();
            this.lunaManager = null;
        }


        // Area cleanups
        
        if (this.gatheringStormEffect) {
            this.gatheringStormEffect.cleanup();
            this.gatheringStormEffect = null;
        }
        if (this.tearingMountainEffect) {
            this.tearingMountainEffect.cleanup();
            this.tearingMountainEffect = null;
        }
        if (this.pinkSkyEffect) {
            this.pinkSkyEffect.cleanup();
            this.pinkSkyEffect = null;
        }

        

        // Ability cleanups
        if (this.cannibalismManager) {
            this.cannibalismManager.cleanup();
            this.cannibalismManager = null;
        }

        // Hero cleanups
        if (this.swampborneWaflavEffect) {
            this.swampborneWaflavEffect.cleanup();
            this.swampborneWaflavEffect = null;
        }

        // ===== RESTORE OVERHEAT EQUIPMENT AFTER BATTLE =====
        if (this.spellSystem && this.spellSystem.spellImplementations.has('Overheat')) {
            const overheatSpell = this.spellSystem.spellImplementations.get('Overheat');
            overheatSpell.restoreAllRemovedEquipment();
        }

        // ===== CLEANUP MONSTER IN A BOTTLE AFTER BATTLE =====
        try {
            const { MonsterInABottlePotion } = await import('./Potions/monsterInABottle.js');
            MonsterInABottlePotion.cleanupMonsterBottleAfterBattle(this);
            
        } catch (error) {
        }

        if (this.roomManager && this.roomManager.getRoomRef()) {
            try {
                const gameDataRef = this.roomManager.getRoomRef().child('game_data');
                const snapshot = await gameDataRef.once('value');
                const messages = snapshot.val() || {};
                
                const updates = {};
                Object.keys(messages).forEach(key => {
                    const msg = messages[key];
                    if (msg.type === 'battle_data' || msg.type === 'battle_ack' || 
                        msg.type === 'battle_start' || msg.type === 'battle_transition_start') {
                        updates[key] = null;
                    }
                });
                
                if (Object.keys(updates).length > 0) {
                    await gameDataRef.update(updates);
                }
                
                // Don't clear gamePhase here - it should stay as 'Reward'
                await this.roomManager.getRoomRef().child('gameState').update({
                    battleStarted: false,
                    battleActive: false,
                    lastBattleStateUpdate: null,
                    battleCleanupCompleted: Date.now()
                    // gamePhase stays as 'Reward'
                });
                
            } catch (error) {
            }
        }
    }

    clearAllBattleBonuses() {
        let bonusesCleared = 0;
        let shieldsCleared = 0;
        
        // Clear bonuses and shields from player heroes
        ['left', 'center', 'right'].forEach(position => {
            if (this.playerHeroes[position]) {
                const hero = this.playerHeroes[position];
                if (hero.hasBattleBonuses && hero.hasBattleBonuses()) {
                    const summary = hero.getBattleBonusSummary();
                    hero.clearBattleBonuses();
                    bonusesCleared++;
                }

                // Clear shields
                if (hero.currentShield > 0) {
                    hero.currentShield = 0;
                    shieldsCleared++;
                }
            }
            
            if (this.opponentHeroes[position]) {
                const hero = this.opponentHeroes[position];
                if (hero.hasBattleBonuses && hero.hasBattleBonuses()) {
                    const summary = hero.getBattleBonusSummary();
                    hero.clearBattleBonuses();
                    bonusesCleared++;
                }

                // Clear shields
                if (hero.currentShield > 0) {
                    hero.currentShield = 0;
                    shieldsCleared++;
                }
            }
        });
    }

    sendCreatureStateSync() {
        if (!this.isAuthoritative) return;
                
        // Send in ABSOLUTE terms (host/guest) not relative terms (player/opponent)
        const creatureState = {
            hostHeroes: {},
            guestHeroes: {}
        };
        
        // Host's player heroes are host heroes
        // Host's opponent heroes are guest heroes
        ['left', 'center', 'right'].forEach(position => {
            if (this.playerHeroes[position] && this.playerHeroes[position].creatures) {
                creatureState.hostHeroes[position] = {
                    creatures: this.playerHeroes[position].creatures.map(c => ({
                        name: c.name,
                        currentHp: c.currentHp,
                        maxHp: c.maxHp,
                        alive: c.alive,
                        addedAt: c.addedAt,
                        counters: c.counters || 0
                    }))
                };
            }
            if (this.opponentHeroes[position] && this.opponentHeroes[position].creatures) {
                creatureState.guestHeroes[position] = {
                    creatures: this.opponentHeroes[position].creatures.map(c => ({
                        name: c.name,
                        currentHp: c.currentHp,
                        maxHp: c.maxHp,
                        alive: c.alive,
                        addedAt: c.addedAt,
                        counters: c.counters || 0
                    }))
                };
            }
        });
        
        this.sendBattleUpdate('creature_state_sync', creatureState);
    }

    resetAllCreatureCounters() {
        let countersReset = 0;
        
        // Reset counters for player heroes
        ['left', 'center', 'right'].forEach(position => {
            if (this.playerHeroes[position] && this.playerHeroes[position].creatures) {
                this.playerHeroes[position].creatures.forEach(creature => {
                    if (creature.counters > 0) {
                        creature.counters = 0;
                        countersReset++;
                    }
                });
            }
            
            if (this.opponentHeroes[position] && this.opponentHeroes[position].creatures) {
                this.opponentHeroes[position].creatures.forEach(creature => {
                    if (creature.counters > 0) {
                        creature.counters = 0;
                        countersReset++;
                    }
                });
            }
        });
    }

    // Show battle result flash
    async showBattleResult(message) {
        const resultOverlay = document.createElement('div');
        resultOverlay.className = 'battle-result-overlay';
        resultOverlay.innerHTML = `
            <div class="battle-result-message">
                ${message}
            </div>
        `;
        
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn ${this.getSpeedAdjustedDelay(300)}ms ease-out;
        `;
        
        document.body.appendChild(resultOverlay);
        
        await this.delay(1000);
        
        resultOverlay.style.animation = `fadeOut ${this.getSpeedAdjustedDelay(300)}ms ease-out`;
        await this.delay(300);
        resultOverlay.remove();
    }

    // Add message to combat log through BattleScreen
    addCombatLog(message, type = 'info') {
        // NEW: Delegate to BattleScreen's BattleLog system
        if (this.battleScreen && typeof this.battleScreen.addCombatLogMessage === 'function') {
            this.battleScreen.addCombatLogMessage(message, type);
        }
        
        // LEGACY: Keep for compatibility - maintain the array for persistence
        this.battleLog.push({ 
            message, 
            type, 
            timestamp: Date.now() 
        });
    }

    // Get result message based on outcome
    getResultMessage(result) {
        switch (result) {
            case 'victory':
                return 'Victory! You have defeated your opponent!';
            case 'defeat':
                return 'Defeat! Your army has been vanquished!';
            case 'draw':
                return 'Draw! Both armies have fallen!';
            default:
                return 'Battle outcome unknown';
        }
    }

    // Export battle state for persistence - UPDATED WITH BATTLELOG
    exportBattleState() {
        const exportHeroes = (heroes) => {
            const exported = {};
            for (const position in heroes) {
                if (heroes[position]) {
                    const heroState = heroes[position].exportState();
                    // Ensure shield is included in export
                    heroState.currentShield = heroes[position].currentShield || 0;
                    exported[position] = heroState;
                }
            }
            return exported;
        };
        
        const baseState = {
            battleActive: this.battleActive,
            currentTurn: this.currentTurn,
            turnInProgress: this.turnInProgress,
            playerHeroes: exportHeroes(this.playerHeroes),
            opponentHeroes: exportHeroes(this.opponentHeroes),
            playerFormation: this.playerFormation,
            opponentFormation: this.opponentFormation,
            playerAbilities: this.playerAbilities,
            opponentAbilities: this.opponentAbilities,
            playerSpellbooks: this.playerSpellbooks, 
            opponentSpellbooks: this.opponentSpellbooks,
            playerCreatures: this.playerCreatures,
            opponentCreatures: this.opponentCreatures,
            playerHand: this.playerHand,
            opponentHand: this.opponentHand, 
            playerDeck: this.playerDeck,
            opponentDeck: this.opponentDeck,
            playerGraveyard: this.playerGraveyard,
            opponentGraveyard: this.opponentGraveyard, 
            battleLog: this.battleLog,
            globalEffects: this.globalEffects,
            heroEffects: this.heroEffects,
            fieldEffects: this.fieldEffects,
            totalDamageDealt: this.totalDamageDealt,
            killTrackerState: this.killTracker ? this.killTracker.exportState() : null,
            abilitiesUsed: this.abilitiesUsed,
            weatherEffects: this.weatherEffects,
            terrainModifiers: this.terrainModifiers,
            specialRules: this.specialRules,
            playerCounters: this.playerCounters || { birthdayPresent: 0 },
            opponentCounters: this.opponentCounters || { birthdayPresent: 0 },
            
            // Export HP tracking for stalemate detection
            hpHistory: this.hpHistory || [],
            stalemateCheckTurns: this.stalemateCheckTurns || 20,
            
            // Export randomness state
            randomnessState: this.randomnessManager.exportState(),
            
            // Export network manager state
            networkState: this.networkManager.exportState(),
            
            // Export BattleLog state if available
            battleLogState: this.battleScreen && this.battleScreen.getBattleLogState ? 
                            this.battleScreen.getBattleLogState() : null,
            
            ghuanjunState: this.ghuanjunManager ? this.ghuanjunManager.exportState() : null
        };

        return baseState;
    }


    // Restore battle state from persistence data - UPDATED WITH BATTLELOG
    restoreBattleState(stateData) {
        try {
            this.battleActive = stateData.battleActive || false;
            this.currentTurn = stateData.currentTurn || 0;
            this.turnInProgress = stateData.turnInProgress || false;
            this.battleLog = stateData.battleLog || [];
            
            // Restore HP tracking for stalemate detection
            this.hpHistory = stateData.hpHistory || [];
            this.stalemateCheckTurns = stateData.stalemateCheckTurns || 20;
            
            const restoreHeroes = (savedHeroes) => {
                const restored = {};
                for (const position in savedHeroes) {
                    if (savedHeroes[position]) {
                        const hero = Hero.fromSavedState(savedHeroes[position]);
                        // Restore shield data
                        hero.currentShield = savedHeroes[position].currentShield || 0;
                        restored[position] = hero;
                    }
                }
                return restored;
            };
            
            this.playerHeroes = restoreHeroes(stateData.playerHeroes || {});
            this.opponentHeroes = restoreHeroes(stateData.opponentHeroes || {});
            
            this.playerFormation = stateData.playerFormation || {};
            this.opponentFormation = stateData.opponentFormation || {};
            this.playerAbilities = stateData.playerAbilities || null;
            this.opponentAbilities = stateData.opponentAbilities || null;
            this.playerSpellbooks = stateData.playerSpellbooks || null;  
            this.opponentSpellbooks = stateData.opponentSpellbooks || null; 
            this.playerCreatures = stateData.playerCreatures || null;
            this.opponentCreatures = stateData.opponentCreatures || null;

            this.globalEffects = stateData.globalEffects || [];
            this.heroEffects = stateData.heroEffects || {};
            this.fieldEffects = stateData.fieldEffects || [];
            this.totalDamageDealt = stateData.totalDamageDealt || {};
            this.abilitiesUsed = stateData.abilitiesUsed || {};
            this.weatherEffects = stateData.weatherEffects || null;
            this.terrainModifiers = stateData.terrainModifiers || [];
            this.specialRules = stateData.specialRules || [];

            this.playerHand = stateData.playerHand || [];
            this.opponentHand = stateData.opponentHand || [];

            this.playerDeck = stateData.playerDeck || [];
            this.opponentDeck = stateData.opponentDeck || [];

            this.playerGraveyard = stateData.playerGraveyard || [];
            this.opponentGraveyard = stateData.opponentGraveyard || [];
            
            this.playerCounters = stateData.playerCounters || { birthdayPresent: 0 };
            this.opponentCounters = stateData.opponentCounters || { birthdayPresent: 0 };

            if (stateData.randomnessState) {
                this.randomnessManager.importState(stateData.randomnessState);
            }

            if (stateData.networkState) {
                this.networkManager.importState(stateData.networkState);
            }

            if (stateData.killTrackerState && this.killTracker) {
                this.killTracker.importState(stateData.killTrackerState);
            }

            if (stateData.battleLogState && this.battleScreen && this.battleScreen.restoreBattleLogState) {
                this.battleScreen.restoreBattleLogState(stateData.battleLogState);
            }

            if (stateData.spellSystemState && this.spellSystem) {
                this.spellSystem.importState(stateData.spellSystemState);
            }
            
            if (stateData.ghuanjunState && this.ghuanjunManager) {
                this.ghuanjunManager.importState(stateData.ghuanjunState);
            }
            
            this.updateAllHeroVisuals();
            
            return true;
        } catch (error) {
            console.error('Error restoring battle state:', error);
            return false;
        }
    }

    // Update all hero visuals after restoration
    updateAllHeroVisuals() {
        
        let totalBattleBonuses = 0;
        
        ['left', 'center', 'right'].forEach(position => {
            // Update player heroes
            if (this.playerHeroes[position]) {
                const hero = this.playerHeroes[position];
                
                // Update health bar
                this.updateHeroHealthBar('player', position, hero.currentHp, hero.maxHp);
                
                // Update attack display (now shows battle bonuses)
                this.updateHeroAttackDisplay('player', position, hero);
                
                // Count battle bonuses for logging
                if (hero.battleAttackBonus > 0) {
                    totalBattleBonuses++;
                }
                
                // Handle defeated state
                if (!hero.alive) {
                    this.applyDefeatedVisualState('player', position);
                } else {
                    this.resetHeroVisualState('player', position);
                }
                
                // Update creature visuals
                if (hero.creatures && hero.creatures.length > 0) {
                    this.updateCreatureVisuals('player', position, hero.creatures);
                }
            }
            
            // Update opponent heroes
            if (this.opponentHeroes[position]) {
                const hero = this.opponentHeroes[position];
                
                // Update health bar
                this.updateHeroHealthBar('opponent', position, hero.currentHp, hero.maxHp);
                
                // Update attack display (now shows battle bonuses)
                this.updateHeroAttackDisplay('opponent', position, hero);
                
                // Count battle bonuses for logging
                if (hero.battleAttackBonus > 0) {
                    totalBattleBonuses++;
                }
                
                // Handle defeated state
                if (!hero.alive) {
                    this.applyDefeatedVisualState('opponent', position);
                } else {
                    this.resetHeroVisualState('opponent', position);
                }
                
                // Update creature visuals
                if (hero.creatures && hero.creatures.length > 0) {
                    this.updateCreatureVisuals('opponent', position, hero.creatures);
                }
            }
        });
        
        // Restore fireshield visual effects
        this.restoreFireshieldVisuals();

        // Restore frostRune visual effects
       this.restoreFrostRuneVisuals();

        if (this.statusEffectsManager) {
            this.statusEffectsManager.restoreAllStatusVisualEffects();
        }

        // Sync abilities to battle screen for tooltip display
        if (this.battleScreen && this.battleScreen.syncAbilitiesFromBattleManager) {
            this.battleScreen.syncAbilitiesFromBattleManager();
        }
    }

    // Restore fireshield visual effects after reconnection
    restoreFireshieldVisuals() {
        if (this.spellSystem && this.spellSystem.spellImplementations.has('Fireshield')) {
            const fireshieldSpell = this.spellSystem.spellImplementations.get('Fireshield');
            fireshieldSpell.restoreFireshieldVisuals();
        }
    }

    restoreFrostRuneVisuals() {
        if (this.spellSystem && this.spellSystem.spellImplementations.has('FrostRune')) {
            const frostRuneSpell = this.spellSystem.spellImplementations.get('FrostRune');
            frostRuneSpell.restoreFrostRuneVisuals();
        }
    }

    applyDefeatedVisualState(side, position) {
        const heroElement = this.getHeroElement(side, position);
        if (heroElement) {
            const card = heroElement.querySelector('.battle-hero-card');
            if (card) {
                card.classList.add('defeated');
                card.style.filter = 'grayscale(100%)';
                card.style.opacity = '0.5';
            }
        }
    }

    // Force refresh battle state
    forceRefreshBattleState() {
        this.initializeHeroes();
        this.battleActive = false;
        this.turnInProgress = false;
        this.currentTurn = 0;
        
        // Reset randomness system
        if (this.isAuthoritative) {
            this.initializeRandomness();
        }
    }

    updateHandDuringBattle(side, newHand) {
        if (side === 'player') {
            this.playerHand = newHand;
        } else if (side === 'opponent') {
            this.opponentHand = newHand;
        }
        
        // Send update to guest if host
        if (this.isAuthoritative) {
            const absoluteSide = side === 'player' 
                ? (this.isHost ? 'host' : 'guest')
                : (this.isHost ? 'guest' : 'host');
                
            this.sendBattleUpdate('hand_update', {
                absoluteSide: absoluteSide,
                hand: newHand
            });
        }
        
        // Save state after hand update
        this.saveBattleStateToPersistence();
    }

    getPlayerHand() {
        return this.playerHand || [];
    }

    getOpponentHand() {
        return this.opponentHand || [];
    }

    getHandBySide(side) {
        return side === 'player' ? this.getPlayerHand() : this.getOpponentHand();
    }

    getHandByAbsoluteSide(absoluteSide) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        return (absoluteSide === myAbsoluteSide) ? this.getPlayerHand() : this.getOpponentHand();
    }

    updateDeckDuringBattle(side, newDeck) {
        if (side === 'player') {
            this.playerDeck = newDeck;
        } else if (side === 'opponent') {
            this.opponentDeck = newDeck;
        }
        
        // Send update to guest if host
        if (this.isAuthoritative) {
            const absoluteSide = side === 'player' 
                ? (this.isHost ? 'host' : 'guest')
                : (this.isHost ? 'guest' : 'host');
                
            this.sendBattleUpdate('deck_update', {
                absoluteSide: absoluteSide,
                deck: newDeck
            });
        }
        
        // Save state after deck update
        this.saveBattleStateToPersistence();
    }

    getPlayerDeck() {
        return this.playerDeck || [];
    }

    getOpponentDeck() {
        return this.opponentDeck || [];
    }

    getDeckBySide(side) {
        return side === 'player' ? this.getPlayerDeck() : this.getOpponentDeck();
    }

    getDeckByAbsoluteSide(absoluteSide) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        return (absoluteSide === myAbsoluteSide) ? this.getPlayerDeck() : this.getOpponentDeck();
    }

    getPlayerGraveyard() {
        return this.playerGraveyard || [];
    }

    getOpponentGraveyard() {
        return this.opponentGraveyard || [];
    }

    getGraveyardBySide(side) {
        return side === 'player' ? this.getPlayerGraveyard() : this.getOpponentGraveyard();
    }

    getGraveyardByAbsoluteSide(absoluteSide) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        return (absoluteSide === myAbsoluteSide) ? this.getPlayerGraveyard() : this.getOpponentGraveyard();
    }

    // Utility delay function
    delay(ms) {
        if (this.speedManager) {
            const adjustedMs = this.speedManager.calculateAdjustedDelay(ms);
            return new Promise(resolve => setTimeout(resolve, adjustedMs));
        } else {
            // Fallback
            const adjustedMs = Math.max(1, Math.floor(ms / this.battleSpeed));
            return new Promise(resolve => setTimeout(resolve, adjustedMs));
        }
    }

    /**
     * Record current HP of all heroes for stalemate detection
     */
    recordCurrentHpSnapshot() {
        const snapshot = {
            turn: this.currentTurn,
            playerHeroes: {},
            opponentHeroes: {}
        };
        
        // Record player heroes HP
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.playerHeroes[position];
            snapshot.playerHeroes[position] = hero ? (hero.alive ? hero.currentHp : 0) : null;
        });
        
        // Record opponent heroes HP
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.opponentHeroes[position];
            snapshot.opponentHeroes[position] = hero ? (hero.alive ? hero.currentHp : 0) : null;
        });
        
        this.hpHistory.push(snapshot);
        
        // Keep only the last 20 turns + current turn
        if (this.hpHistory.length > this.stalemateCheckTurns + 1) {
            this.hpHistory.shift();
        }
    }

    /**
     * Check if battle is in stalemate (no HP decrease for 20 turns)
     * @returns {boolean} True if stalemate detected
     */
    checkForStalemate() {
        // Need at least 21 turns of data (current + 20 previous)
        if (this.hpHistory.length < this.stalemateCheckTurns + 1) {
            return false;
        }
        
        const currentSnapshot = this.hpHistory[this.hpHistory.length - 1];
        const pastSnapshot = this.hpHistory[this.hpHistory.length - 1 - this.stalemateCheckTurns];
        
        // Check all hero positions on both sides
        const positions = ['left', 'center', 'right'];
        
        for (const position of positions) {
            // Check player heroes
            const currentPlayerHp = currentSnapshot.playerHeroes[position];
            const pastPlayerHp = pastSnapshot.playerHeroes[position];
            
            // If hero exists in both snapshots, check if HP decreased
            if (currentPlayerHp !== null && pastPlayerHp !== null) {
                if (currentPlayerHp < pastPlayerHp) {
                    return false; // HP decreased, not a stalemate
                }
            }
            
            // Check opponent heroes  
            const currentOpponentHp = currentSnapshot.opponentHeroes[position];
            const pastOpponentHp = pastSnapshot.opponentHeroes[position];
            
            // If hero exists in both snapshots, check if HP decreased
            if (currentOpponentHp !== null && pastOpponentHp !== null) {
                if (currentOpponentHp < pastOpponentHp) {
                    return false; // HP decreased, not a stalemate
                }
            }
        }
        
        // No hero HP decreased in the last 20 turns - stalemate detected
        return true;
    }

    // Reset battle manager
    reset() {
        this.battleActive = false;
        this.currentTurn = 0;
        this.battleLog = []; // Clear legacy array
        this.turnInProgress = false;
        
        // Cleanup network manager
        this.networkManager.cleanup();
        
        this.hideBattlePauseUI();
        
        this.initializeExtensibleState();
        
        ['left', 'center', 'right'].forEach(position => {
            this.resetHeroVisualState('player', position);
            this.resetHeroVisualState('opponent', position);
        });
        
        this.playerHeroes = {};
        this.opponentHeroes = {};
        this.playerAbilities = null;
        this.opponentAbilities = null;
        this.playerSpellbooks = null;  
        this.opponentSpellbooks = null; 
        this.playerCreatures = null;
        this.opponentCreatures = null;
        this.playerGraveyard = null; 
        this.opponentGraveyard = null; 

        
        this.randomnessManager.reset();

        
        if (this.flowManager) {
            this.flowManager = null;
        }

        
        if (this.combatManager) {
            this.combatManager = null;
        }

        if (this.damageSourceManager) {
            this.damageSourceManager.cleanup();
            this.damageSourceManager = null;
        }


        
        // Cleanup Hero managers
        if (this.aliceManager) {
            this.aliceManager.cleanup();
            this.aliceManager = null;
        }        
        if (this.moniaEffect) {
            this.moniaEffect.cleanup();
            this.moniaEffect = null;
        }
        if (this.ghuanjunManager) {
            this.ghuanjunManager.cleanup();
            this.ghuanjunManager = null;
        }
        if (this.lunaManager) {
            this.lunaManager.cleanup();
            this.lunaManager = null;
        }



        // Cleanup Ability managers
        if (this.necromancyManager) {
            this.necromancyManager.cleanup();
            this.necromancyManager = null;
        }
        if (this.diplomacyManager) {
            this.diplomacyManager.cleanup();
            this.diplomacyManager = null;
        }


        
        // Area cleanups
        if (this.gatheringStormEffect) {
            this.gatheringStormEffect.cleanup();
            this.gatheringStormEffect = null;
        }
        if (this.tearingMountainEffect) {
            this.tearingMountainEffect.cleanup();
            this.tearingMountainEffect = null;
        }
        if (this.pinkSkyEffect) {
            this.pinkSkyEffect.cleanup();
            this.pinkSkyEffect = null;
        }

        

        // Cleanup Creature managers
        if (this.jigglesManager) {
            this.jigglesManager.cleanup();
            this.jigglesManager = null;
        }
        if (this.skeletonNecromancerManager) {
            this.skeletonNecromancerManager.cleanup();
            this.skeletonNecromancerManager = null;
        }
        if (this.skeletonDeathKnightManager) {
            this.skeletonDeathKnightManager.cleanup();
            this.skeletonDeathKnightManager = null;
        }
        if (this.burningSkeletonManager) {
            this.burningSkeletonManager.cleanup();
            this.burningSkeletonManager = null;
        }
        if (this.skeletonKingSkullmaelManager) {
            this.skeletonKingSkullmaelManager.cleanup();
            this.skeletonKingSkullmaelManager = null;
        }
        if (this.skeletonReaperManager) {
            this.skeletonReaperManager.cleanup();
            this.skeletonReaperManager = null;
        }
        if (this.skeletonBardManager) {
            this.skeletonBardManager.cleanup();
            this.skeletonBardManager = null;
        }
        if (this.skeletonMageManager) {
            this.skeletonMageManager.cleanup();
            this.skeletonMageManager = null;
        }
        if (this.skeletonHealerManager) {
            this.skeletonHealerManager.cleanup();
            this.skeletonHealerManager = null;
        }

        if (this.frontSoldierManager) {
            this.frontSoldierManager.cleanup();
            this.frontSoldierManager = null;
        }
        if (this.archerManager) {
            this.archerManager.cleanup();
            this.archerManager = null;
        }
        if (this.moonlightButterflyManager) {
            this.moonlightButterflyManager.cleanup();
            this.moonlightButterflyManager = null;
        }
        if (this.royalCorgiManager) {
            this.royalCorgiManager.cleanup();
            this.royalCorgiManager = null;
        }
        if (this.grinningCatManager) {
            this.grinningCatManager.cleanup();
            this.grinningCatManager = null;
        }
        if (this.crumTheClassPetManager) {
            this.crumTheClassPetManager.cleanup();
            this.crumTheClassPetManager = null;
        }
        if (this.futureTechMechManager) {
            this.futureTechMechManager.cleanup();
            this.futureTechMechManager = null;
        }
        if (this.graveWormManager) {
            this.graveWormManager.cleanup();
            this.graveWormManager = null;
        }
        if (this.blueIceDragonManager) {
            this.blueIceDragonManager.cleanup();
            this.blueIceDragonManager = null;
        }
        if (this.demonsGateManager) {
            this.demonsGateManager.cleanup();
            this.demonsGateManager = null;
        }
        if (this.lunaKiaiManager) {
            this.lunaKiaiManager.cleanup();
            this.lunaKiaiManager = null;
        }
        if (this.priestOfLunaManager) {
            this.priestOfLunaManager.cleanup();
            this.priestOfLunaManager = null;
        }





        // Cleanup Artifacts
        if (this.crusaderArtifactsHandler) {
            this.crusaderArtifactsHandler.reset();
            this.crusaderArtifactsHandler = null;
        }
        if (this.hatOfMadnessArtifact) {
            this.hatOfMadnessArtifact.cleanup();
            this.hatOfMadnessArtifact = null;
        }




        // Cleanup fireshield visual effects
        if (this.spellSystem && this.spellSystem.spellImplementations.has('Fireshield')) {
            const fireshieldSpell = this.spellSystem.spellImplementations.get('Fireshield');
            fireshieldSpell.cleanupFireshieldEffects();
        }

        // Cleanup frost rune visual effects
        if (this.spellSystem && this.spellSystem.spellImplementations.has('FrostRune')) {
            const frostRuneSpell = this.spellSystem.spellImplementations.get('FrostRune');
            frostRuneSpell.cleanupFrostRuneEffects();
        }

        // Reset randomness system
        this.randomness = null;
        this.randomnessSeed = null;
        this.randomnessInitialized = false;

        if (this.spellSystem) {
            this.spellSystem.reset();
            this.spellSystem = null;
        }

        if (this.animationManager) {
            this.animationManager.cleanup();
            this.animationManager = null;
        }
        
        if (this.attackEffectsManager) {
            this.attackEffectsManager.cleanup();
            this.attackEffectsManager = null;
        }

        if (this.persistenceManager) {
            this.persistenceManager.cleanup();
        }
        
        if (this.statusEffectsManager) {
            this.statusEffectsManager.cleanup();
            this.statusEffectsManager = null;
        }

        if (this.killTracker) {
            this.killTracker.reset();
        }
        
        // Reset BattleLog through BattleScreen
        if (this.battleScreen && this.battleScreen.battleLog) {
            this.battleScreen.battleLog.clear();
        }
    }
}


export default BattleManager;

applyResistancePatches(BattleManager);
applyFriendshipPatches(BattleManager);
