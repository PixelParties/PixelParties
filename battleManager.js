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

import { applyResistancePatches } from './Abilities/resistance.js';

import { recordKillWithVisualFeedback } from './Artifacts/wantedPoster.js'
import { crusaderArtifactsHandler } from './Artifacts/crusaderArtifacts.js';


import { checkFuriousAngerReactions } from './Spells/furiousAnger.js';

import RoyalCorgiCreature from './Creatures/royalCorgi.js';

import { MoniaHeroEffect } from './Heroes/monia.js';


export class BattleManager {
    constructor() {
        this.battleActive = false;
        this.currentTurn = 0;
        this.playerHeroes = {}; 
        this.opponentHeroes = {};  
        this.battleLog = []; // UPDATED: Keep for compatibility, but delegate to BattleScreen's BattleLog
        this.gameDataSender = null;
        this.isHost = false;
        this.battleScreen = null;
        this.lifeManager = null;
        this.goldManager = null;
        this.onBattleEnd = null;
        this.turnInProgress = false;
        
        // Ability data storage
        this.playerAbilities = null;
        this.opponentAbilities = null;
        
        // CENTRALIZED AUTHORITY: Only host runs simulation
        this.isAuthoritative = false;
        
        // Room manager reference
        this.roomManager = null;
        
        this.flowManager = null;
        this.combatManager = null;
        
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
        this.archerManager = null;
        this.royalCorgiManager = null; 
        
        // Attack effects
        this.attackEffectsManager = null;
        
        // PERSISTENCE INTEGRATION
        this.persistenceManager = null;

        
        
        // Individual cards
        this.crusaderArtifactsHandler = null;
        




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
    receiveBattleData(message) {
        return this.networkManager.receiveBattleData(message);
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
        playerPermanentArtifacts = null,  
        opponentPermanentArtifacts = null) {
        
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
        
        
        console.log('ðŸŽ—ï¸ DEBUG: Initializing combat manager...');
        this.combatManager = new BattleCombatManager(this);
        
        // Verify initialization
        if (!this.combatManager) {
            console.error('âŒ CRITICAL: Combat manager failed to initialize!');
        } else if (!this.combatManager.battleManager) {
            console.error('âŒ CRITICAL: Combat manager has no battleManager reference!');
        } else if (this.combatManager.battleManager !== this) {
            console.error('âŒ CRITICAL: Combat manager has wrong battleManager reference!');
            console.log('Expected:', this);
            console.log('Actual:', this.combatManager.battleManager);
        } else {
            console.log('âœ… Combat manager initialized correctly');
        }


        this.crusaderArtifactsHandler = crusaderArtifactsHandler;
        this.crusaderArtifactsHandler.initBattleEffects(this);
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
                console.warn('Invalid battle speed:', speed);
                return;
            }
            
            const oldSpeed = this.battleSpeed;
            this.battleSpeed = speed;
            
            const speedNames = { 1: 'Normal', 2: 'Fast', 4: 'Super Fast' };
            this.addCombatLog(`Battle speed changed to ${speedNames[speed]} (${speed}x)`, 'info');
            
            // Sync speed change to guest
            this.sendBattleUpdate('speed_change', {
                speed: speed,
                speedName: speedNames[speed],
                timestamp: Date.now()
            });
        }
    }
    
    guest_handleSpeedChange(data) {
        
        if (this.isAuthoritative) {
            console.warn('Host should not receive speed change messages');
            return;
        }

        if (this.speedManager) {
            this.speedManager.handleSpeedChange(data);
        } else {
            console.error('Ã¢ÂÅ’ GUEST: speedManager not available!');
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
                
                // Set abilities first (needed for creature HP calculations)
                if (abilities && abilities[position]) {
                    hero.setAbilities(abilities[position]);
                }
                
                // Set spellbooks
                if (spellbooks && spellbooks[position]) {
                    hero.setSpellbook(spellbooks[position]);
                }
                
                // Add creatures with health (including Summoning Magic bonuses)
                if (creatures && creatures[position]) {
                    const creaturesWithHealth = creatures[position].map(creature => {
                        const creatureInfo = getCardInfo(creature.name);
                        const baseHp = creatureInfo?.hp || 10;
                        
                        let hpMultiplier = 1.0;
                        if (hero.hasAbility('SummoningMagic')) {
                            const summoningMagicLevel = hero.getAbilityStackCount('SummoningMagic');
                            hpMultiplier = 1 + (0.25 * summoningMagicLevel);
                        }
                        
                        const finalHp = Math.floor(baseHp * hpMultiplier);
                        
                        // Create clean creature object without status effects
                        const { statusEffects, ...cleanCreature } = creature;
                        
                        return {
                            ...cleanCreature,  // âœ… Now excludes statusEffects
                            currentHp: finalHp,
                            maxHp: finalHp,
                            atk: creatureInfo?.atk || 0,
                            alive: true,
                            type: 'creature'  
                        };
                    });
                    hero.setCreatures(creaturesWithHealth);
                    hero.initializeNecromancyStacks();
                }
                
                // Set equipment
                if (equipment && equipment[position] && Array.isArray(equipment[position])) {
                    hero.setEquipment(equipment[position]);
                    console.log(`âš¡ï¸ Set ${equipment[position].length} equipment items for ${side} ${position}`);
                } else {
                    hero.setEquipment([]);
                }
                
                // Initialize arrow counters immediately after setting equipment
                this.initializeHeroArrowCounters(hero, side, position);
                
                // Use existing setPrecalculatedStats method
                if (effectiveStats && effectiveStats[position]) {
                    hero.setPrecalculatedStats(effectiveStats[position]);
                    console.log(`âœ… Applied pre-calculated stats to ${side} ${position} ${hero.name}: HP ${hero.maxHp}, ATK ${hero.atk}`);
                    
                    // Log bonuses for debugging
                    if (effectiveStats[position].bonuses) {
                        const bonuses = effectiveStats[position].bonuses;
                        if (bonuses.hpBonus > 0 || bonuses.totalAttackBonus > 0) {
                            console.log(`ðŸ’° ${hero.name} bonuses: +${bonuses.hpBonus} HP, +${bonuses.totalAttackBonus} ATK`);
                        }
                    }
                } else {
                    // No pre-calculated stats available - Hero constructor already set base stats
                    console.log(`âš ï¸ No effective stats for ${side} ${position} ${hero.name} - using base stats (HP: ${hero.maxHp}, ATK: ${hero.atk})`);
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
        if (side === 'player') {
            this.playerEquips = {};
        } else {
            this.opponentEquips = {};
        }
        console.log(`ðŸ—‚ï¸ Cleared ${side} manager-level equipment references`);
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
        
        console.log(`ðŸ¹¹ Initialized arrow counters for ${side} ${position} ${hero.name}`);
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
            console.error('Error during battle state restoration:', error);
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
            console.error('Error saving battle state to persistence:', error);
            return false;
        }
    }

    // Start the battle
    async startBattle() {
        if (!this.flowManager) {
            console.error('BattleFlowManager not initialized');
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
            console.error('Error getting potion states from Firebase:', error);
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
    }

    // Battle loop with connection awareness and persistence
    async authoritative_battleLoop() {
        if (!this.flowManager) {
            console.error('BattleFlowManager not initialized');
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
            console.error('BattleFlowManager not initialized');
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
                        console.log(`Ã¢Å¡Â¡ ${creature.name} reacting to ally death: ${deadUnit.name || 'hero'}`);
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
            console.log('Removing stuck pause overlay');
            pauseOverlay.remove();
        }
        this.battlePaused = false;
    }

    isActorAlive(actor) {
        if (!this.flowManager) {
            console.error('BattleFlowManager not initialized');
            return false;
        }
        return this.flowManager.isActorAlive(actor);
    }

    buildActorList(hero, canAct) {
        if (!this.flowManager) {
            console.error('BattleFlowManager not initialized');
            return [];
        }
        return this.flowManager.buildActorList(hero, canAct);
    }

    // Process creature actions (paired from the end)
    async processCreatureActions(position, playerCreatures, opponentCreatures) {
        const maxCreatures = Math.max(playerCreatures.length, opponentCreatures.length);
        
        if (maxCreatures === 0) return;
        
        this.addCombatLog(`Creatures activate for ${position} position!`, 'info');
        
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
            console.error('BattleFlowManager not initialized');
            return;
        }
        return this.flowManager.executeActorActions(playerActor, opponentActor, position);
    }

    async executeHeroActions(playerHeroActor, opponentHeroActor, position) {
        if (!this.combatManager) {
            console.error('Combat manager not initialized');
            return;
        }
        return this.combatManager.executeHeroActions(playerHeroActor, opponentHeroActor, position);
    }

    // Execute hero attacks with damage application
    async executeHeroAttacksWithDamage(playerAttack, opponentAttack) {
        if (!this.combatManager) {
            console.error('Combat manager not initialized');
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
            this.addCombatLog(`${playerCreature.name} activates!`, 'success');
        }
        
        if (opponentCreature) {
            const opponentIndex = this.opponentHeroes[position].creatures.indexOf(opponentCreature);
            shakePromises.push(this.animationManager.shakeCreature('opponent', position, opponentIndex));
            this.addCombatLog(`${opponentCreature.name} activates!`, 'error');
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
            console.error('Combat manager not initialized');
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
            console.error('BattleFlowManager not initialized');
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
        console.log('Ã°Å¸Å½Â¯ DEBUG: applyAttackDamageToTarget called');
        console.log('Attack object:', attack);
        
        if (!this.combatManager) {
            console.error('Ã¢ÂÅ’ CRITICAL: Combat manager not initialized when applying damage!');
            console.error('Available managers:', {
                combatManager: !!this.combatManager,
                flowManager: !!this.flowManager,
                animationManager: !!this.animationManager
            });
            return;
        }
        
        console.log('Ã¢Å“â€¦ Delegating to combat manager...');
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
        if (!this.isAuthoritative) return; // FIXED: was this.battleManager.isAuthoritative
        
        const { hero, creature, creatureIndex, damage, position, side } = damageData;
        const { source, attacker } = context;
        
        // Validate damage is a number
        if (typeof damage !== 'number' || isNaN(damage)) {
            console.error(`⛔ Invalid damage value for creature: ${damage}, skipping damage application`);
            return;
        }
        
        // Find the creature's CURRENT index (after any movements)
        const currentCreatureIndex = hero.creatures.indexOf(creature);
        
        if (currentCreatureIndex === -1) {
            console.error(`⚠️ CRITICAL: Creature ${creature.name} not found in ${hero.name}'s creatures array!`);
            return;
        }
        
        const oldHp = creature.currentHp;
        const wasAlive = creature.alive;
        
        // ⭐ FIXED: Check for Monia protection before applying damage (SYNCHRONOUS)
        let finalDamage = damage;
        if (this.isAuthoritative) { // FIXED: was this.battleManager.isAuthoritative
            finalDamage = MoniaHeroEffect.checkMoniaProtection(creature, damage, this); // FIXED: was this.battleManager
            
            // Validate that protection returned a valid number
            if (typeof finalDamage !== 'number' || isNaN(finalDamage)) {
                console.error(`⛔ Monia protection returned invalid damage for creature: ${finalDamage}, using original`);
                finalDamage = damage;
            }
        }
        
        creature.currentHp = Math.max(0, creature.currentHp - finalDamage);
        
        // Validate creature HP after damage
        if (typeof creature.currentHp !== 'number' || isNaN(creature.currentHp)) {
            console.error(`⛔ Creature HP became NaN after damage! Creature: ${creature.name}, Old HP: ${oldHp}, Damage: ${finalDamage}`);
            creature.currentHp = Math.max(0, oldHp - finalDamage); // Fallback calculation
        }
        
        const willDie = creature.currentHp <= 0;
        
        // Record kill IMMEDIATELY when creature HP drops to 0
        if (willDie && wasAlive && attacker && this.isAuthoritative) { // FIXED: was this.battleManager.isAuthoritative
            recordKillWithVisualFeedback(this, attacker, creature, 'creature'); // FIXED: was this.battleManager
            this.addCombatLog(`${attacker.name} has slain ${creature.name}!`, // FIXED: was this.battleManager.addCombatLog
                            attacker.side === 'player' ? 'success' : 'error');
        }
        
        // Track damage dealt
        if (!this.totalDamageDealt[hero.absoluteSide]) { // FIXED: was this.battleManager.totalDamageDealt
            this.totalDamageDealt[hero.absoluteSide] = 0; // FIXED: was this.battleManager.totalDamageDealt
        }
        this.totalDamageDealt[hero.absoluteSide] += finalDamage; // FIXED: was this.battleManager.totalDamageDealt
        
        this.addCombatLog( // FIXED: was this.battleManager.addCombatLog
            `${creature.name} takes ${finalDamage} damage! (${oldHp} → ${creature.currentHp} HP)`,
            side === 'player' ? 'error' : 'success'
        );
        
        let finalCreatureIndex = currentCreatureIndex;
        let revivedByNecromancy = false;
        let stolenByDarkGear = false;  // Track if stolen
        let necromancyArrayManipulation = null;
        
        // If creature died, handle death sequence
        if (willDie && wasAlive) {
            // Set creature as dead
            creature.alive = false;
            
            // 1. Trigger death effects
            this.triggerCreatureDeathEffects(creature, hero, attacker, context); // FIXED: was this.battleManager.triggerCreatureDeathEffects
            this.checkForSkeletonMageReactions(creature, hero.side, 'creature'); // FIXED: was this.battleManager.checkForSkeletonMageReactions
            
            // 2. Check for Furious Anger
            setTimeout(async () => {
                await checkFuriousAngerReactions(creature, side, hero, this); // FIXED: was this.battleManager
            }, 100);
            
            // 3. Attempt necromancy revival
            if (this.necromancyManager) { // FIXED: was this.battleManager.necromancyManager
                const revivalResult = this.necromancyManager.attemptNecromancyRevival( // FIXED: was this.battleManager.necromancyManager
                    creature, hero, currentCreatureIndex, side, position
                );
                
                if (revivalResult) {
                    revivedByNecromancy = true;
                    if (creature.counters !== undefined) {
                        creature.counters = 0;
                    }
                    finalCreatureIndex = hero.creatures.indexOf(creature);
                    necromancyArrayManipulation = {
                        originalIndex: currentCreatureIndex,
                        moveToEnd: true,
                        newIndex: finalCreatureIndex
                    };
                    
                    // Update visuals for revived creature
                    this.updateCreatureHealthBar(side, position, finalCreatureIndex, creature.currentHp, creature.maxHp); // FIXED: was this.battleManager.updateCreatureHealthBar
                    this.addCombatLog(`${creature.name} rises again, but the kill still counts!`, 'info'); // FIXED: was this.battleManager.addCombatLog
                }
            }
            
            // 4. If not revived, attempt Dark Gear stealing
            if (!revivedByNecromancy) {
                const { attemptDarkGearStealing } = await import('./Artifacts/darkGear.js');
                stolenByDarkGear = await attemptDarkGearStealing(
                    creature, hero, currentCreatureIndex, side, this // FIXED: was this.battleManager
                );
                
                if (stolenByDarkGear) {
                    // DarkGear handles all the cleanup and removal
                    // IMPORTANT: Don't update any visuals here - DarkGear does it all
                    finalCreatureIndex = -1; // Creature is gone
                }
            }
            
            // 5. Only apply death visuals if creature wasn't stolen or revived
            if (!revivedByNecromancy && !stolenByDarkGear) {
                this.handleCreatureDeathWithoutRevival(hero, creature, currentCreatureIndex, side, position); // FIXED: was this.battleManager.handleCreatureDeathWithoutRevival
            }
        } else if (!willDie) {
            // Creature survived, update health bar normally
            this.updateCreatureHealthBar(side, position, currentCreatureIndex, creature.currentHp, creature.maxHp); // FIXED: was this.battleManager.updateCreatureHealthBar
        }
        
        // Only create damage number and send update if creature wasn't stolen
        if (!stolenByDarkGear) {
            const damageSource = context?.source || 'attack';
            this.animationManager.createDamageNumberOnCreature(side, position, finalCreatureIndex, finalDamage, creature.maxHp, damageSource); // FIXED: was this.battleManager.animationManager
            
            // Send update to guest
            this.sendBattleUpdate('creature_damage_applied', { // FIXED: was this.battleManager.sendBattleUpdate
                heroAbsoluteSide: hero.absoluteSide,
                heroPosition: position,
                originalCreatureIndex: creatureIndex,
                currentCreatureIndex: currentCreatureIndex,
                finalCreatureIndex: finalCreatureIndex,
                creatureName: creature.name,
                creatureId: creature.addedAt ? `${creature.name}_${creature.addedAt}` : creature.name,
                damage: finalDamage, // Use finalDamage instead of damage
                oldHp: oldHp,
                newHp: creature.currentHp,
                maxHp: creature.maxHp,
                died: willDie,
                revivedByNecromancy: revivedByNecromancy,
                stolenByDarkGear: stolenByDarkGear,  // NEW: Include stolen flag
                necromancyArrayManipulation: necromancyArrayManipulation,
                debugInfo: {
                    heroCreatureCount: hero.creatures.length,
                    damageSource: damageSource,
                    wasOriginalIndexCorrect: creatureIndex === currentCreatureIndex,
                    indexShift: currentCreatureIndex - creatureIndex
                }
            });
        }
        
        // Save state
        this.saveBattleStateToPersistence().catch(error => { // FIXED: was this.battleManager.saveBattleStateToPersistence
            console.error('Error saving state after creature damage:', error);
        });
    }

    async triggerCreatureDeathEffects(creature, heroOwner, attacker, context) {
        // SKELETON ARCHER DEATH SALVO
        if (creature.name === 'SkeletonArcher' && this.skeletonArcherManager) {
            console.log(`Triggering Skeleton Archer death salvo for ${creature.name}`);
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death salvo (10 arrows at random targets)
            this.skeletonArcherManager.executeDeathSalvo(creature, heroOwner, position, side);
        }
        
        // SKELETON NECROMANCER HERO REVIVAL DEATH EFFECT
        if (creature.name === 'SkeletonNecromancer' && this.skeletonNecromancerManager) {
            console.log(`Triggering Skeleton Necromancer hero revival death effect for ${creature.name}`);
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the hero revival death effect
            await this.skeletonNecromancerManager.executeHeroRevivalDeath(creature, heroOwner, position, side);
        }

        // SKELETON DEATH KNIGHT DEATH SLASH STORM
        if (creature.name === 'SkeletonDeathKnight' && this.skeletonDeathKnightManager) {
            console.log(`Triggering Skeleton Death Knight death slash storm for ${creature.name}`);
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death slash storm (slash all enemies simultaneously)
            await this.skeletonDeathKnightManager.executeDeathSlashStorm(creature, heroOwner, position, side);
        }

        // BURNING SKELETON DEATH FLAME STORM
        if (creature.name === 'BurningSkeleton' && this.burningSkeletonManager) {
            console.log(`Triggering Burning Skeleton death flame storm for ${creature.name}`);
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death flame storm (fire slashes all enemies simultaneously)
            await this.burningSkeletonManager.executeDeathFlameStorm(creature, heroOwner, position, side);
        }
        
        // SKELETON REAPER DEATH SLASH STORM
        if (creature.name === 'SkeletonReaper' && this.skeletonReaperManager) {
            console.log(`Triggering Skeleton Reaper death slash storm for ${creature.name}`);
            
            // Get the side and position for the death effect
            const side = heroOwner.side;
            const position = heroOwner.position;
            
            // Execute the death slash storm (wide arching slashes across all enemies)
            await this.skeletonReaperManager.executeDeathSlashStorm(creature, heroOwner, position, side);
        }

        // SKELETON BARD DEATH INSPIRATION
        if (creature.name === 'SkeletonBard' && this.skeletonBardManager) {
            console.log(`Triggering Skeleton Bard death inspiration for ${creature.name}`);
            
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
                
                // ✅ CALCULATE CREATURE INDEX BEFORE ANY MODIFICATIONS
                const creatureIndex = heroOwner.creatures.indexOf(creature);
                
                // Execute the revenge ice (ice projectile at the attacker)
                await this.skeletonMageManager.executeRevengeIce(creature, heroOwner, position, side, attacker, creatureIndex);
            } else {
                this.addCombatLog(
                    `${creature.name}'s dying spirit finds no living target for revenge!`, 
                    'info'
                );
            }
        }
    }

    handleCreatureDeathWithoutRevival(hero, creature, creatureIndex, side, position) {
        // Clear all status effects from the creature when it dies
        if (this.statusEffectsManager) {
            this.statusEffectsManager.clearAllStatusEffects(creature);
        }

        this.addCombatLog(` ${creature.name} has been defeated!`, 'error');
        
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
                    console.log(`Player ${position}: ${defeatedCreatures.length} defeated creatures with hidden health bars:`, 
                            defeatedCreatures.map(c => c.name));
                }
            }
            
            // Update opponent creature visuals
            if (this.opponentHeroes[position] && this.opponentHeroes[position].creatures) {
                const hero = this.opponentHeroes[position];
                this.updateCreatureVisuals('opponent', position, hero.creatures);
                
                // Log defeated creatures for debugging
                const defeatedCreatures = hero.creatures.filter(c => !c.alive);
                if (defeatedCreatures.length > 0) {
                    console.log(`Opponent ${position}: ${defeatedCreatures.length} defeated creatures with hidden health bars:`, 
                            defeatedCreatures.map(c => c.name));
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
        
        // Call the refresh helper to ensure proper visual states
        setTimeout(() => {
            this.refreshAllCreatureVisuals();
        }, 100);
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
    authoritative_applyDamage(damageResult, context = {}) {
        if (!this.combatManager) {
            console.error('Combat manager not initialized');
            return;
        }
        return this.combatManager.authoritative_applyDamage(damageResult, context);
    }

    // Guest handlers that remain in battleManager
    guest_handleStatusEffectChange(data) {
        if (this.statusEffectsManager) {
            this.statusEffectsManager.handleGuestStatusEffectUpdate(data);
        }
    }

    guest_handleAliceLaserEffect(data) {
        if (this.isAuthoritative) {
            console.warn('Host should not receive Alice laser effect messages');
            return;
        }

        // Initialize Alice effect if needed
        if (!this.aliceEffect) {
            import('./Heroes/alice.js').then(({ AliceHeroEffect }) => {
                this.aliceEffect = new AliceHeroEffect(this);
                this.aliceEffect.handleGuestLaserEffect(data);
            }).catch(error => {
                console.error('Failed to load Alice effect for guest handler:', error);
            });
        } else {
            this.aliceEffect.handleGuestLaserEffect(data);
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
            console.warn('Received spell effect but spell system not initialized');
        }
    }
    
    guest_handleDiplomacyEffectsComplete(data) {
        if (this.diplomacyManager) {
            this.diplomacyManager.handleGuestDiplomacyEffects(data);
        } else {
            console.warn('Received diplomacy effects but diplomacy manager not available');
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
            console.warn('Received fireshield applied but fireshield spell not available');
        }
    }

    guest_handleToxicTrapApplied(data) {
        if (this.spellSystem && this.spellSystem.spellImplementations.has('ToxicTrap')) {
            const toxicTrapSpell = this.spellSystem.spellImplementations.get('ToxicTrap');
            toxicTrapSpell.handleGuestToxicTrapApplied(data);
        } else {
            console.warn('Received toxic trap applied but toxic trap spell not available');
        }
    }

    guest_handleFrostRuneApplied(data) {
        if (this.spellSystem && this.spellSystem.spellImplementations.has('FrostRune')) {
            const frostRuneSpell = this.spellSystem.spellImplementations.get('FrostRune');
            frostRuneSpell.handleGuestFrostRuneApplied(data);
        } else {
            console.warn('Received frost rune applied but frost rune spell not available');
        }
    }

    guest_handleFuriousAngerAction(data) {
        import('./Artifacts/furiousAnger.js').then(({ handleGuestFuriousAngerAction }) => {
            handleGuestFuriousAngerAction(data, this);
        }).catch(error => {
            console.error('Failed to load FuriousAnger for guest handler:', error);
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
            console.error('Failed to load Greatsword artifact for guest handler:', error);
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
            console.warn('Host should not receive rainbows arrow gold award messages');
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
                console.error('Failed to load rainbowsArrow for gold animation:', error);
            });
        }
        
        // Add to combat log
        const attackerName = this.getAttackerNameFromSyncData(attackerAbsoluteSide, attackerPosition);
        this.addCombatLog(
            `${attackerName}'s Rainbows Arrow grants +${goldGain} gold! (${totalDamage} damage Ã· 50)`,
            attackerLocalSide === 'player' ? 'success' : 'info'
        );
    }



    // GUEST PERMANENTS
    guest_handleSnowCannonEffectsComplete(data) {
        import('./Artifacts/snowCannon.js').then(({ handleGuestSnowCannonEffects }) => {
            handleGuestSnowCannonEffects(data, this);
        }).catch(error => {
            console.error('Failed to load Snow Cannon for guest handler:', error);
        });
    }

    guest_handleSnowCannonFreeze(data) {
        import('./Artifacts/snowCannon.js').then(({ handleGuestSnowCannonFreeze }) => {
            handleGuestSnowCannonFreeze(data, this);
        }).catch(error => {
            console.error('Failed to load Snow Cannon for guest handler:', error);
        });
    }

    guest_handleFieldStandardEffectsComplete(data) {
        import('./Artifacts/fieldStandard.js').then(({ handleGuestFieldStandardEffects }) => {
            handleGuestFieldStandardEffects(data, this);
        }).catch(error => {
            console.error('Failed to load Field Standard for guest handler:', error);
        });
    }

    guest_handleFieldStandardRally(data) {
        import('./Artifacts/fieldStandard.js').then(({ handleGuestFieldStandardRally }) => {
            handleGuestFieldStandardRally(data, this);
        }).catch(error => {
            console.error('Failed to load Field Standard for guest handler:', error);
        });
    }

    async guest_handleHeartOfIceTriggered(data) {
        if (this.isAuthoritative) {
            console.warn('Host should not receive Heart of Ice trigger messages');
            return;
        }

        try {
            const { handleGuestHeartOfIceEffect } = await import('./Artifacts/heartOfIce.js');
            handleGuestHeartOfIceEffect(data, this);
        } catch (error) {
            console.error('Failed to load Heart of Ice for guest handler:', error);
        }
    }






    guest_handleCreatureCounterUpdate(data) {
        if (this.isAuthoritative) {
            console.warn('Host should not receive creature counter update messages');
            return;
        }

        const { creatureData } = data;
        const creatureName = creatureData.name;

        // Handle MoonlightButterfly counter updates
        if (creatureName === 'MoonlightButterfly') {
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
    }

    guest_handleCrumExtraAction(data) {
        if (this.isAuthoritative) {
            console.warn('Host should not receive Crum extra action messages');
            return;
        }

        if (!this.crumTheClassPetManager) {
            import('./Creatures/crumTheClassPet.js').then(({ default: CrumTheClassPetCreature }) => {
                this.crumTheClassPetManager = new CrumTheClassPetCreature(this);
                this.crumTheClassPetManager.handleGuestExtraAction(data);
            });
        } else {
            this.crumTheClassPetManager.handleGuestExtraAction(data);
        }
    }

    guest_handleMoonlightButterflyAttack(data) {
        if (this.isAuthoritative) {
            console.warn('Host should not receive moonlight butterfly attack messages');
            return;
        }

        if (!this.moonlightButterflyManager) {
            import('./Creatures/moonlightButterfly.js').then(({ default: MoonlightButterflyCreature }) => {
                this.moonlightButterflyManager = new MoonlightButterflyCreature(this);
                this.moonlightButterflyManager.handleGuestMoonlightAttack(data);
            });
        } else {
            this.moonlightButterflyManager.handleGuestMoonlightAttack(data);
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
            this.addCombatLog(`Ã°Å¸Å½Â² Battle randomness synchronized`, 'info');
        }
    }

    guest_handleCreatureAction(data) {
        // This remains here as it uses battleManager internals
        const { position, playerCreature, opponentCreature } = data;
        
        const shakePromises = [];
        
        if (playerCreature) {
            shakePromises.push(this.animationManager.shakeCreature('player', position, playerCreature.index));
            this.addCombatLog(`Ã°Å¸Å’Å¸ ${playerCreature.name} activates!`, 'success');
        }
        
        if (opponentCreature) {
            shakePromises.push(this.animationManager.shakeCreature('opponent', position, opponentCreature.index));
            this.addCombatLog(`Ã°Å¸Å’Å¸ ${opponentCreature.name} activates!`, 'error');
        }
        
        return Promise.all(shakePromises);
    }

    guest_handleActorAction(data) {
        // This remains here as it uses battleManager internals
        const { position, playerActor, opponentActor } = data;
        
        const shakePromises = [];
        
        if (playerActor && playerActor.type === 'creature') {
            shakePromises.push(this.animationManager.shakeCreature('player', position, playerActor.index));
            this.addCombatLog(`Ã°Å¸Å’Å¸ ${playerActor.name} activates!`, 'success');
        }
        
        if (opponentActor && opponentActor.type === 'creature') {
            shakePromises.push(this.animationManager.shakeCreature('opponent', position, opponentActor.index));
            this.addCombatLog(`Ã°Å¸Å’Å¸ ${opponentActor.name} activates!`, 'error');
        }
        
        return Promise.all(shakePromises);
    }

    guest_handleHeroTurnExecution(data) {
        // This remains here as it uses battleManager internals
        return this.guest_handleCombinedTurnExecution(data);
    }

    guest_handleNecromancyRevival(data) {
        if (this.necromancyManager) {
            this.necromancyManager.handleGuestNecromancyRevival(data);
        }
    }

    guest_handleMoniaProtectionEffect(data) {
        if (this.isAuthoritative)return;

        // Initialize Monia effect if needed
        if (!this.moniaEffect)this.moniaEffect = new MoniaHeroEffect(this);
        
        this.moniaEffect.handleGuestProtectionEffect(data);
    }



    // GUEST: Handle combined turn execution
    async guest_handleCombinedTurnExecution(data) {
        const { playerAction, opponentAction, position, damageModifiers } = data;  // NEW: damageModifiers added
        
        this.updateGuestHeroDisplays(playerAction, opponentAction);
        
        if (playerAction && opponentAction) {
            this.addCombatLog(`Both heroes attack!`, 'warning');
        } else if (playerAction) {
            this.addCombatLog(`Player hero attacks!`, 'success');
        } else if (opponentAction) {
            this.addCombatLog(`Opponent hero attacks!`, 'error');
        }

        if (playerAction && opponentAction) {
            await this.guest_executeSimultaneousAttacks(playerAction, opponentAction);
        } else if (playerAction) {
            await this.guest_executeSingleAttack(playerAction);
        } else if (opponentAction) {
            await this.guest_executeSingleAttack(opponentAction);
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
                                `The Master's Sword activates! Damage Ãƒâ€”${mod.multiplier}!`,
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
                                `Opponent's Master's Sword activates! Damage Ãƒâ€”${mod.multiplier}!`,
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
    async guest_executeSimultaneousAttacks(playerAction, opponentAction) {
        const heroes = this.getGuestHeroesForActions(playerAction, opponentAction);
        
        if (heroes.playerHero && heroes.opponentHero) {
            const playerAttack = this.reconstructAttackObject(playerAction, heroes.playerHero, heroes.playerLocalSide);
            const opponentAttack = this.reconstructAttackObject(opponentAction, heroes.opponentHero, heroes.opponentLocalSide);
            
            // FIX: Pass the correct local sides to the animation
            // Instead of relying on the hardcoded 'player'/'opponent' in the animation method
            // We need to use the actual local sides
            
            const animations = [];
            
            // Use the LOCAL sides for animations
            if (playerAttack.target) {
                if (playerAttack.target.type === 'creature') {
                    animations.push(this.animationManager.animateHeroToCreatureAttack(
                        playerAttack.hero, playerAttack.target, heroes.playerLocalSide
                    ));
                } else {
                    animations.push(this.animationManager.animateCollisionAttackTowards(
                        playerAttack.hero, 
                        this.getHeroElement(playerAttack.target.side, playerAttack.target.position), 
                        heroes.playerLocalSide
                    ));
                }
            }
            
            if (opponentAttack.target) {
                if (opponentAttack.target.type === 'creature') {
                    animations.push(this.animationManager.animateHeroToCreatureAttack(
                        opponentAttack.hero, opponentAttack.target, heroes.opponentLocalSide
                    ));
                } else {
                    animations.push(this.animationManager.animateCollisionAttackTowards(
                        opponentAttack.hero, 
                        this.getHeroElement(opponentAttack.target.side, opponentAttack.target.position), 
                        heroes.opponentLocalSide
                    ));
                }
            }
            
            await Promise.all(animations);
            
            // Return animations with correct local sides
            await Promise.all([
                this.animationManager.animateReturn(heroes.playerHero, heroes.playerLocalSide),
                this.animationManager.animateReturn(heroes.opponentHero, heroes.opponentLocalSide)
            ]);
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
        if (actionData.targetData.type === 'creature') {
            const targetLocalSide = (actionData.targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const targetHeroes = targetLocalSide === 'player' ? this.playerHeroes : this.opponentHeroes;
            const targetHero = targetHeroes[actionData.targetData.position];
            
            if (targetHero && targetHero.creatures) {
                const creature = targetHero.creatures[actionData.targetData.creatureIndex];
                if (creature) {
                    target = {
                        type: 'creature',
                        hero: targetHero,
                        creature: creature,
                        creatureIndex: actionData.targetData.creatureIndex,
                        position: actionData.targetData.position,
                        side: targetLocalSide
                    };
                }
            }
        } else {
            const targetLocalSide = (actionData.targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const targetHeroes = targetLocalSide === 'player' ? this.playerHeroes : this.opponentHeroes;
            const targetHero = targetHeroes[actionData.targetData.position];
            
            if (targetHero) {
                target = {
                    type: 'hero',
                    hero: targetHero,
                    position: actionData.targetData.position,
                    side: targetLocalSide
                };
            }
        }
        
        // Return attack object in the same format as host expects
        return {
            hero: attackerHero,
            target: target,
            damage: actionData.damage || 0,
            effectsTriggered: [], // Guest doesn't have this info, but animations don't need it
            isRanged: false // Guest doesn't have this info, but animations don't need it
        };
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
                host: gameState.hostDelayedArtifactEffects || [],
                guest: gameState.guestDelayedArtifactEffects || []
            };
        } catch (error) {
            console.error('Error getting delayed artifact effects from Firebase:', error);
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
            console.error('Error clearing battle state:', error);
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

        this.addCombatLog(`${hero.name} has been defeated!`, 'error');
        
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
            hpText.textContent = `${currentHp}/${maxHp}`;
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
            console.error(`Could not find hero element with selector: ${selector}`);
        }
        return element;
    }

    // Check if battle should end
    checkBattleEnd() {
        if (!this.flowManager) {
            console.error('BattleFlowManager not initialized');
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

            // Store Royal Corgi draws
            let royalCorgiBonusCards = 0;
            if (this.isAuthoritative && this.royalCorgiManager) {
                const playerCreatures = {
                    left: this.playerHeroes.left?.creatures || [],
                    center: this.playerHeroes.center?.creatures || [],
                    right: this.playerHeroes.right?.creatures || []
                };
                
                royalCorgiBonusCards = this.royalCorgiManager.calculateBonusCardsForPlayer(playerCreatures);
                console.log(`ðŸŽ´ Royal Corgi bonus cards calculated: ${royalCorgiBonusCards}`);
            }
            
            // Store this for the reward system to use
            if (window.heroSelection && window.heroSelection.cardRewardManager) {
                window.heroSelection.cardRewardManager.cachedRoyalCorgiBonusCards = royalCorgiBonusCards;
            }
            
            // ===== CLEAR POTION EFFECTS AFTER BATTLE =====
            if (window.potionHandler) {
                try {
                    window.potionHandler.clearPotionEffects();
                } catch (error) {
                    console.error('Error clearing potion effects after battle:', error);
                }
            }
            
            if (window.heroSelection) {
                window.heroSelection.clearProcessedDelayedEffects();
            }
            
            const battleEndData = {
                hostResult,
                guestResult,
                hostLives: this.lifeManager ? this.lifeManager.getPlayerLives() : 10,
                guestLives: this.lifeManager ? this.lifeManager.getOpponentLives() : 10,
                hostGold: this.goldManager ? this.goldManager.getPlayerGold() : 0,
                guestGold: this.goldManager ? this.goldManager.getOpponentGold() : 0,
                newTurn: newTurn  // Ã°Å¸â€Â¥ NEW: Include the new turn number
            };
            
            // Save final battle state before cleanup
            await this.saveFinalBattleState();
            
            this.sendBattleUpdate('battle_end', battleEndData);
            
            const hostMessage = this.getResultMessage(hostResult);
            this.addCombatLog(hostMessage, hostResult === 'victory' ? 'success' : hostResult === 'defeat' ? 'error' : 'info');
            await this.showBattleResult(hostMessage);
            
            await this.cleanupAfterBattle();
            
            // Cache opponent data for reward calculations BEFORE calling onBattleEnd
            if (window.heroSelection && window.heroSelection.cardRewardManager) {
                window.heroSelection.cardRewardManager.cacheOpponentDataForRewards(
                    this.opponentFormation, 
                    this.opponentAbilities
                );
            }

            // Ã°Å¸â€Â¥ MODIFIED: Don't increment turn again, just show rewards
            if (this.onBattleEnd) {
                this.onBattleEnd(hostResult);
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
                console.log('Ã°Å¸â€™Â¾ Final battle state saved for reward viewing');
            }
        } catch (error) {
            console.error('Error saving final battle state:', error);
        }
    }

    // Restore final battle state for viewing
    async restoreFinalBattleState(finalState) {
        try {
            console.log('Ã°Å¸â€â€ž Restoring final battle state for viewing...');
            
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
            
            // FIXED: Explicitly refresh creature visuals to ensure defeated creatures have no health bars
            setTimeout(() => {
                this.refreshAllCreatureVisuals();
                console.log('Ã°Å¸Â©Â¸ Final battle state: All creature visual states properly applied');
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
                
                // Add final message
                this.addCombatLog('Ã°Å¸â€œÅ“ Viewing final battle state', 'info');
            }
            
            console.log('Ã¢Å“â€¦ Final battle state restored for viewing');
            return true;
        } catch (error) {
            console.error('Error restoring final battle state:', error);
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
            console.log('Ã°Å¸Å½Â Game phase set to Reward');
            return true;
        } catch (error) {
            console.error('Error setting game phase to Reward:', error);
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
                console.log('Ã¢Å“â€¦ Battle ready states cleared, gamePhase remains as Reward');
            } catch (error) {
                console.error('Error clearing battle ready states:', error);
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
        
        // Log wealth bonuses if any
        this.addWealthBonusLogMessage(
            this.isHost ? hostWealthBonus : guestWealthBonus,
            this.isHost ? guestWealthBonus : hostWealthBonus
        );
        
        // Return the battle results without awarding gold
        // Gold will be awarded by the reward screen
        return { 
            hostGoldGain: 0, 
            guestGoldGain: 0 
        };
    }

    // Enhanced combat log message to show wealth bonuses
    addWealthBonusLogMessage(playerWealthBonus, opponentWealthBonus) {
        if (playerWealthBonus > 0 || opponentWealthBonus > 0) {
            this.addCombatLog('Ã°Å¸â€™Â° Wealth Ability Bonuses Applied!', 'info');
            
            if (playerWealthBonus > 0) {
                this.addCombatLog(`You earned +${playerWealthBonus} bonus gold from Wealth abilities!`, 'success');
            }
            
            if (opponentWealthBonus > 0) {
                this.addCombatLog(`Opponent earned +${opponentWealthBonus} bonus gold from Wealth abilities`, 'info');
            }
        }
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
            console.error('Error cleaning up Boulders after battle:', error);
        }

        // ===== CLEANUP DIPLOMACY AFTER BATTLE =====
        try {
            const { DiplomacyManager } = await import('./Abilities/diplomacy.js');
            const recruitedCreatures = DiplomacyManager.cleanupDiplomacyAfterBattle(this);
        } catch (error) {
            console.error('Error cleaning up Diplomacy after battle:', error);
        }

        // ===== CLEANUP GREATSWORD SKELETONS AFTER BATTLE =====
        try {
            const { SkullmaelsGreatswordArtifact } = await import('./Artifacts/skullmaelsGreatsword.js');
            const skeletonsRemoved = SkullmaelsGreatswordArtifact.cleanupGreatswordSkeletonsAfterBattle(this);
        } catch (error) {
            console.error('Error cleaning up Greatsword Skeletons after battle:', error);
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

        if (this.crumTheClassPetManager) {
            this.crumTheClassPetManager.cleanup();
            this.crumTheClassPetManager = null;
        }

        // ===== RESTORE OVERHEAT EQUIPMENT AFTER BATTLE =====
        if (this.spellSystem && this.spellSystem.spellImplementations.has('Overheat')) {
            const overheatSpell = this.spellSystem.spellImplementations.get('Overheat');
            overheatSpell.restoreAllRemovedEquipment();
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
                
                console.log('âœ… Battle cleanup completed, gamePhase preserved for rewards');
            } catch (error) {
                console.error('Error clearing battle messages:', error);
            }
        }
    }

    clearAllBattleBonuses() {
        console.log('ðŸ”„ Clearing battle bonuses from all heroes...');
        
        let bonusesCleared = 0;
        
        // Clear bonuses from player heroes
        ['left', 'center', 'right'].forEach(position => {
            if (this.playerHeroes[position]) {
                const hero = this.playerHeroes[position];
                if (hero.hasBattleBonuses && hero.hasBattleBonuses()) {
                    const summary = hero.getBattleBonusSummary();
                    console.log(`Clearing battle bonuses from player ${hero.name}: ${summary}`);
                    hero.clearBattleBonuses();
                    bonusesCleared++;
                }
            }
            
            if (this.opponentHeroes[position]) {
                const hero = this.opponentHeroes[position];
                if (hero.hasBattleBonuses && hero.hasBattleBonuses()) {
                    const summary = hero.getBattleBonusSummary();
                    console.log(`Clearing battle bonuses from opponent ${hero.name}: ${summary}`);
                    hero.clearBattleBonuses();
                    bonusesCleared++;
                }
            }
        });
        
        if (bonusesCleared > 0) {
            console.log(`âœ… Cleared battle bonuses from ${bonusesCleared} heroes`);
            
            // Add a combat log message
            this.addCombatLog(`ðŸ”„ Battle bonuses cleared from all heroes`, 'info');
        } else {
            console.log('No battle bonuses to clear');
        }
    }

    resetAllCreatureCounters() {
        console.log('Resetting creature counters for all heroes...');
        
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
        
        if (countersReset > 0) {
            console.log(`âœ… Reset counters on ${countersReset} creatures`);
            this.addCombatLog(`ðŸ”„ Creature counters reset`, 'info');
        } else {
            console.log('No creature counters to reset');
        }
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
                    exported[position] = heroes[position].exportState();
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
            
            // Export randomness state
            randomnessState: this.randomnessManager.exportState(),
            
            // Export network manager state
            networkState: this.networkManager.exportState(),
            
            // Export BattleLog state if available
            battleLogState: this.battleScreen && this.battleScreen.getBattleLogState ? 
                            this.battleScreen.getBattleLogState() : null
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
            
            const restoreHeroes = (savedHeroes) => {
                const restored = {};
                for (const position in savedHeroes) {
                    if (savedHeroes[position]) {
                        restored[position] = Hero.fromSavedState(savedHeroes[position]);
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
                console.log('Ã°Å¸â€œÅ“ BattleLog state restored');
            }

            if (stateData.spellSystemState && this.spellSystem) {
                this.spellSystem.importState(stateData.spellSystemState);
            }
            
            this.updateAllHeroVisuals();
            
            return true;
        } catch (error) {
            console.error('Error restoring BattleManager state:', error);
            return false;
        }
    }

    // Update all hero visuals after restoration
    updateAllHeroVisuals() {
        console.log('ðŸŽ¨ Updating all hero visuals...');
        
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
                    console.log(`âš”ï¸ Player ${hero.name}: ${hero.getCurrentAttack()} ATK (base: ${hero.atk}, bonus: +${hero.battleAttackBonus})`);
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
                    console.log(`âš”ï¸ Opponent ${hero.name}: ${hero.getCurrentAttack()} ATK (base: ${hero.atk}, bonus: +${hero.battleAttackBonus})`);
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
        
        if (totalBattleBonuses > 0) {
            console.log(`âš”ï¸ Displayed ${totalBattleBonuses} heroes with active battle bonuses`);
            this.addCombatLog(`âš”ï¸ ${totalBattleBonuses} heroes have active battle bonuses`, 'info');
        }
        
        // Restore fireshield visual effects
        this.restoreFireshieldVisuals();

        // Restore frostRune visual effects
       this.restoreFrostRuneVisuals();

        // Sync abilities to battle screen for tooltip display
        if (this.battleScreen && this.battleScreen.syncAbilitiesFromBattleManager) {
            this.battleScreen.syncAbilitiesFromBattleManager();
        }

        console.log('âœ… All hero visuals updated');
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

    // Reset battle manager - UPDATED WITH BATTLELOG RESET
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

        
        this.randomnessManager.reset();

        
        if (this.flowManager) {
            this.flowManager = null;
        }

        
        if (this.combatManager) {
            this.combatManager = null;
        }


        
        // Cleanup Hero managers
        if (this.aliceEffect) {
            this.aliceEffect.cleanup();
            this.aliceEffect = null;
        }
        
        if (this.moniaEffect) {
            this.moniaEffect.cleanup();
            this.moniaEffect = null;
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

        if (this.crumTheClassPetManager) {
            this.crumTheClassPetManager.cleanup();
            this.crumTheClassPetManager = null;
        }



        if (this.crusaderArtifactsHandler) {
            this.crusaderArtifactsHandler.reset();
            this.crusaderArtifactsHandler = null;
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