// battleManager.js - Complete Battle Manager with BattleLog Integration (REFACTORED)

import { getCardInfo } from './cardDatabase.js';
import { BattlePersistenceManager } from './battlePersistenceManager.js';
import { Hero } from './hero.js';
import { BattleSpeedManager } from './battleSpeedManager.js';
import { BattleRandomness } from './battleRandomness.js';
import { BattleSpellSystem } from './battleSpellSystem.js';
import StatusEffectsManager from './statusEffects.js';
import AttackEffectsManager from './attackEffects.js';
import { killTracker } from './killTracker.js';

import { BattleRandomnessManager } from './battleRandomnessManager.js';
import { BattleAnimationManager } from './battleAnimationManager.js';
import { BattleNetworkManager } from './battleNetworkManager.js';  
import { BattleFlowManager } from './battleFlowManager.js';
import { BattleCombatManager } from './battleCombatManager.js';

import { NecromancyManager } from './Abilities/necromancy.js';
import { ResistanceManager, applyResistancePatches } from './Abilities/resistance.js';

import JigglesCreature from './Creatures/jiggles.js';

import { recordKillWithVisualFeedback } from './Artifacts/wantedPoster.js'
import { crusaderArtifactsHandler } from './Artifacts/crusaderArtifacts.js';


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

        //CREATURE STUFF
        this.jigglesManager = null;

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
        playerEquips = null, opponentEquips = null) {
        
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
        this.combatManager = new BattleCombatManager(this);


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
            this.addCombatLog(`⚡ Battle speed changed to ${speedNames[speed]} (${speed}x)`, 'info');
            
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
            console.error('❌ GUEST: speedManager not available!');
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
                                    this.playerCreatures, this.playerEquips, mySide);  // Added playerEquips
        this.initializeHeroesForSide('opponent', this.opponentFormation, this.opponentHeroes, 
                                    this.opponentAbilities, this.opponentSpellbooks, 
                                    this.opponentCreatures, this.opponentEquips, opponentSide);  // Added opponentEquips
    }

    // Initialize heroes for a specific side
    initializeHeroesForSide(side, formation, heroesObj, abilities, spellbooks, creatures, equipment, absoluteSide) {  // Added equipment parameter
        ['left', 'center', 'right'].forEach(position => {
            const heroData = formation[position];
            if (heroData) {
                const hero = new Hero(heroData, position, side, absoluteSide);
                
                if (abilities && abilities[position]) {
                    hero.setAbilities(abilities[position]);
                }
                
                if (spellbooks && spellbooks[position]) {
                    hero.setSpellbook(spellbooks[position]);
                }
                
                // Add creatures with health (with SummoningMagic bonus)
                if (creatures && creatures[position]) {
                    const creaturesWithHealth = creatures[position].map(creature => {
                        const creatureInfo = getCardInfo(creature.name);
                        const baseHp = creatureInfo?.hp || 10;
                        
                        // Calculate SummoningMagic bonus
                        let hpMultiplier = 1.0;
                        if (hero.hasAbility('SummoningMagic')) {
                            const summoningMagicLevel = hero.getAbilityStackCount('SummoningMagic');
                            hpMultiplier = 1 + (0.1 * summoningMagicLevel); // +10% per level
                        }
                        
                        const finalHp = Math.floor(baseHp * hpMultiplier);
                        
                        return {
                            ...creature,
                            currentHp: finalHp,
                            maxHp: finalHp,
                            atk: creatureInfo?.atk || 0,
                            alive: true,
                            type: 'creature'  
                        };
                    });
                    hero.setCreatures(creaturesWithHealth);

                    // Initialize necromancy stacks for each hero
                    hero.initializeNecromancyStacks();
                }
                
                // ADD EQUIPMENT TO HERO
                if (equipment && equipment[position]) {
                    hero.setEquipment(equipment[position]);
                    console.log(`⚔️ Set ${equipment[position].length} equipment items for ${side} ${position} hero`);
                }
                
                heroesObj[position] = hero;
                
                this.resetHeroVisualState(side, position);
                this.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
                this.updateHeroAttackDisplay(side, position, hero);
                
                // Update creature visuals
                this.updateCreatureVisuals(side, position, hero.creatures);
            }
        });
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
                    // Remove health bar and HP text when defeated
                    const healthBar = creatureElement.querySelector('.creature-health-bar');
                    const hpText = creatureElement.querySelector('.creature-hp-text');
                    if (healthBar) healthBar.remove();
                    if (hpText) hpText.remove();
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

    // Log SummoningMagic bonuses for all creatures
    logSummoningMagicBonuses() {
        let bonusesApplied = false;
        
        // Check player heroes
        ['left', 'center', 'right'].forEach(position => {
            const playerHero = this.playerHeroes[position];
            if (playerHero && playerHero.hasAbility('SummoningMagic') && playerHero.creatures.length > 0) {
                const summoningLevel = playerHero.getAbilityStackCount('SummoningMagic');
                const bonusPercent = summoningLevel * 10;
                this.addCombatLog(
                    `✨ ${playerHero.name}'s creatures receive +${bonusPercent}% HP from SummoningMagic level ${summoningLevel}!`, 
                    'success'
                );
                bonusesApplied = true;
            }
            
            const opponentHero = this.opponentHeroes[position];
            if (opponentHero && opponentHero.hasAbility('SummoningMagic') && opponentHero.creatures.length > 0) {
                const summoningLevel = opponentHero.getAbilityStackCount('SummoningMagic');
                const bonusPercent = summoningLevel * 10;
                this.addCombatLog(
                    `✨ Opponent's ${opponentHero.name}'s creatures receive +${bonusPercent}% HP from SummoningMagic level ${summoningLevel}!`, 
                    'error'
                );
                bonusesApplied = true;
            }
        });
        
        if (bonusesApplied) {
            this.addCombatLog('🛡️ Summoning Magic empowers the summoned creatures!', 'info');
        }
    }

    logTorasEquipmentBonuses() {
        let bonusesApplied = false;
        
        // Check player heroes
        ['left', 'center', 'right'].forEach(position => {
            const playerHero = this.playerHeroes[position];
            if (playerHero && playerHero.name === 'Toras' && playerHero.equipment && playerHero.equipment.length > 0) {
                // Count unique equipment
                const uniqueEquipmentNames = new Set();
                playerHero.equipment.forEach(item => {
                    const itemName = item.name || item.cardName;
                    if (itemName) {
                        uniqueEquipmentNames.add(itemName);
                    }
                });
                
                const uniqueCount = uniqueEquipmentNames.size;
                if (uniqueCount > 0) {
                    const bonus = uniqueCount * 10;
                    this.addCombatLog(
                        `⚔️ Toras gains +${bonus} ATK from mastering ${uniqueCount} unique equipment!`, 
                        'success'
                    );
                    bonusesApplied = true;
                }
            }
            
            const opponentHero = this.opponentHeroes[position];
            if (opponentHero && opponentHero.name === 'Toras' && opponentHero.equipment && opponentHero.equipment.length > 0) {
                // Count unique equipment
                const uniqueEquipmentNames = new Set();
                opponentHero.equipment.forEach(item => {
                    const itemName = item.name || item.cardName;
                    if (itemName) {
                        uniqueEquipmentNames.add(itemName);
                    }
                });
                
                const uniqueCount = uniqueEquipmentNames.size;
                if (uniqueCount > 0) {
                    const bonus = uniqueCount * 10;
                    this.addCombatLog(
                        `⚔️ Opponent's Toras gains +${bonus} ATK from mastering ${uniqueCount} unique equipment!`, 
                        'error'
                    );
                    bonusesApplied = true;
                }
            }
        });
        
        if (bonusesApplied) {
            this.addCombatLog('🗡️ Toras\'s equipment mastery enhances combat prowess!', 'info');
        }
    }

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
        
        this.addCombatLog(`🐾 Creatures activate for ${position} position!`, 'info');
        
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
            this.addCombatLog(`🌟 ${playerCreature.name} activates!`, 'success');
        }
        
        if (opponentCreature) {
            const opponentIndex = this.opponentHeroes[position].creatures.indexOf(opponentCreature);
            shakePromises.push(this.animationManager.shakeCreature('opponent', position, opponentIndex));
            this.addCombatLog(`🌟 ${opponentCreature.name} activates!`, 'error');
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
                    await this.delay(400);
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
            // NEW: Apply damage modifier visual effects BEFORE damage
            // ============================================
            if (this.attackEffectsManager && attack.effectsTriggered && attack.effectsTriggered.length > 0) {
                // Small delay to let attack animation complete
                await this.delay(100);
                
                this.attackEffectsManager.applyDamageModifierEffects(attack.effectsTriggered);
                
                // Wait for effect animation
                await this.delay(400);
            }
            
            // Apply damage with potentially modified value
            this.applyAttackDamageToTarget(attack);
            
            await this.animationManager.animateReturn(attack.hero, side);
        }
    }

    // Apply damage to target (hero or creature)
    applyAttackDamageToTarget(attack) {
        if (!this.combatManager) {
            console.error('Combat manager not initialized');
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
    authoritative_applyDamageToCreature(damageData, context = {}) {
        if (!this.isAuthoritative) return;
        
        const { hero, creature, creatureIndex, damage, position, side } = damageData;
        const { source, attacker } = context;
        
        const oldHp = creature.currentHp;
        const wasAlive = creature.alive;
        creature.currentHp = Math.max(0, creature.currentHp - damage);
        creature.alive = creature.currentHp > 0;
        
        if (!this.totalDamageDealt[hero.absoluteSide]) {
            this.totalDamageDealt[hero.absoluteSide] = 0;
        }
        this.totalDamageDealt[hero.absoluteSide] += damage;
        
        this.addCombatLog(
            `💔 ${creature.name} takes ${damage} damage! (${oldHp} → ${creature.currentHp} HP)`,
            side === 'player' ? 'error' : 'success'
        );
        
        // Update creature health display
        this.updateCreatureHealthBar(side, position, creatureIndex, creature.currentHp, creature.maxHp);
        const damageSource = arguments[1]?.source || 'attack';
        this.animationManager.createDamageNumberOnCreature(side, position, creatureIndex, damage, creature.maxHp, damageSource);
        
        if (!creature.alive && wasAlive) {
            // If we have an attacker and it's a spell kill, record with visual feedback
            if (attacker && source === 'spell') {
                recordKillWithVisualFeedback(this, attacker, creature, 'creature');
            }
            this.handleCreatureDeath(hero, creature, creatureIndex, side, position);
        }
        
        this.sendBattleUpdate('creature_damage_applied', {
            heroAbsoluteSide: hero.absoluteSide,
            heroPosition: position,
            creatureIndex: creatureIndex,
            damage: damage,
            oldHp: oldHp,
            newHp: creature.currentHp,
            maxHp: creature.maxHp,
            died: !creature.alive,
            creatureName: creature.name
        });
        
        this.saveBattleStateToPersistence().catch(error => {
            console.error('Error saving state after creature damage:', error);
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
        // Clear all status effects from the creature when it dies
        if (this.statusEffectsManager) {
            this.statusEffectsManager.clearAllStatusEffects(creature);
        }

        // Attempt necromancy revival
        if (this.necromancyManager && this.isAuthoritative) {
            const revived = this.necromancyManager.attemptNecromancyRevival(
                creature, hero, creatureIndex, side, position
            );
            
            if (revived) {
                // Creature was revived, skip the death handling
                return;
            }
        }

        this.addCombatLog(`☠️ ${creature.name} has been defeated!`, 'error');
        
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (creatureElement) {
            creatureElement.classList.add('defeated');
            const sprite = creatureElement.querySelector('.creature-sprite');
            if (sprite) {
                sprite.style.filter = 'grayscale(100%)';
                sprite.style.opacity = '0.5';
            }
        }
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



    
    getSpellStatistics() {
        return this.spellSystem ? this.spellSystem.getSpellStatistics() : null;
    }

    guest_handleRandomnessSeed(data) {
        const { seed } = data;
        if (seed) {
            this.randomnessManager.initializeFromSeed(seed);
            this.addCombatLog(`🎲 Battle randomness synchronized`, 'info');
        }
    }

    guest_handleCreatureAction(data) {
        // This remains here as it uses battleManager internals
        const { position, playerCreature, opponentCreature } = data;
        
        const shakePromises = [];
        
        if (playerCreature) {
            shakePromises.push(this.animationManager.shakeCreature('player', position, playerCreature.index));
            this.addCombatLog(`🌟 ${playerCreature.name} activates!`, 'success');
        }
        
        if (opponentCreature) {
            shakePromises.push(this.animationManager.shakeCreature('opponent', position, opponentCreature.index));
            this.addCombatLog(`🌟 ${opponentCreature.name} activates!`, 'error');
        }
        
        return Promise.all(shakePromises);
    }

    guest_handleActorAction(data) {
        // This remains here as it uses battleManager internals
        const { position, playerActor, opponentActor } = data;
        
        const shakePromises = [];
        
        if (playerActor && playerActor.type === 'creature') {
            shakePromises.push(this.animationManager.shakeCreature('player', position, playerActor.index));
            this.addCombatLog(`🌟 ${playerActor.name} activates!`, 'success');
        }
        
        if (opponentActor && opponentActor.type === 'creature') {
            shakePromises.push(this.animationManager.shakeCreature('opponent', position, opponentActor.index));
            this.addCombatLog(`🌟 ${opponentActor.name} activates!`, 'error');
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

    // GUEST: Handle combined turn execution
    async guest_handleCombinedTurnExecution(data) {
        const { playerAction, opponentAction, position, damageModifiers } = data;  // NEW: damageModifiers added
        
        this.updateGuestHeroDisplays(playerAction, opponentAction);
        
        if (playerAction && opponentAction) {
            this.addCombatLog(`💥 Both heroes attack!`, 'warning');
        } else if (playerAction) {
            this.addCombatLog(`⚔️ Player hero attacks!`, 'success');
        } else if (opponentAction) {
            this.addCombatLog(`⚔️ Opponent hero attacks!`, 'error');
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
                                `⚔️ The Master's Sword activates! Damage ×${mod.multiplier}!`,
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
                                `⚔️ Opponent's Master's Sword activates! Damage ×${mod.multiplier}!`,
                                'error'
                            );
                        }
                    }
                }
            }
            
            // Wait for effect animations if any were triggered
            if ((damageModifiers.player?.length > 0) || (damageModifiers.opponent?.length > 0)) {
                await this.delay(400);
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
            // Check if attacks target creatures
            const playerTargetsCreature = playerAction.targetType === 'creature';
            const opponentTargetsCreature = opponentAction.targetType === 'creature';
            
            const animations = [];
            
            if (playerTargetsCreature) {
                animations.push(this.animationManager.guest_animateHeroToCreatureAttack(
                    heroes.playerHero, playerAction.targetData, heroes.playerLocalSide
                ));
            } else {
                animations.push(this.animationManager.animateCollisionAttackTowards(
                    heroes.playerHero, 
                    this.getHeroElement(heroes.opponentLocalSide, playerAction.targetData.position),
                    heroes.playerLocalSide
                ));
            }
            
            if (opponentTargetsCreature) {
                animations.push(this.animationManager.guest_animateHeroToCreatureAttack(
                    heroes.opponentHero, opponentAction.targetData, heroes.opponentLocalSide
                ));
            } else {
                animations.push(this.animationManager.animateCollisionAttackTowards(
                    heroes.opponentHero,
                    this.getHeroElement(heroes.playerLocalSide, opponentAction.targetData.position),
                    heroes.opponentLocalSide
                ));
            }
            
            await Promise.all(animations);
            
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
            if (action.targetType === 'creature') {
                this.addCombatLog(
                    `⚔️ ${action.attackerData.name} attacks ${action.targetData.creatureName}!`,
                    attackerLocalSide === 'player' ? 'success' : 'error'
                );
                await this.animationManager.guest_animateHeroToCreatureAttack(localAttacker, action.targetData, attackerLocalSide);
            } else {
                const targetLocalSide = (action.targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
                const localTarget = targetLocalSide === 'player'
                    ? this.playerHeroes[action.targetData.position]
                    : this.opponentHeroes[action.targetData.position];
                
                this.addCombatLog(
                    `⚔️ ${action.attackerData.name} attacks ${action.targetData.name}!`,
                    attackerLocalSide === 'player' ? 'success' : 'error'
                );
                
                if (localTarget) {
                    await this.animateFullAttack(localAttacker, localTarget);
                }
            }
            
            await this.animationManager.animateReturn(localAttacker, attackerLocalSide);
        }
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

        this.addCombatLog(`☠️ ${hero.name} has been defeated!`, 'error');
        
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

    // Update hero attack display
    updateHeroAttackDisplay(side, position, hero) {
        const heroElement = this.getHeroElement(side, position);
        if (!heroElement || !hero) return;

        const attackBase = heroElement.querySelector('.attack-base');
        const attackBonus = heroElement.querySelector('.attack-bonus');
        const attackValue = heroElement.querySelector('.attack-value');
        const attackContainer = heroElement.querySelector('.battle-hero-attack');
        
        if (attackBase) {
            const currentAttack = hero.getCurrentAttack();
            const abilityModifiers = this.getHeroAbilityModifiers(hero);
            const totalBonus = (currentAttack - hero.baseAtk) + abilityModifiers.attackBonus;
            
            const oldValue = attackBase.textContent;
            const newValue = hero.baseAtk.toString();
            
            attackBase.textContent = hero.baseAtk;
            
            if (attackBonus) {
                if (totalBonus > 0) {
                    attackBonus.textContent = `+${totalBonus}`;
                    attackBonus.style.color = '#4caf50';
                    attackBonus.style.display = 'inline';
                    
                    if (attackContainer) {
                        attackContainer.classList.add('attack-buffed');
                        attackContainer.classList.remove('attack-debuffed');
                    }
                } else if (totalBonus < 0) {
                    attackBonus.textContent = `${totalBonus}`;
                    attackBonus.style.color = '#f44336';
                    attackBonus.style.display = 'inline';
                    
                    if (attackContainer) {
                        attackContainer.classList.add('attack-debuffed');
                        attackContainer.classList.remove('attack-buffed');
                    }
                } else {
                    attackBonus.style.display = 'none';
                    
                    if (attackContainer) {
                        attackContainer.classList.remove('attack-buffed', 'attack-debuffed');
                    }
                }
            }
            
            if (attackValue && (oldValue !== newValue || totalBonus !== 0)) {
                attackValue.classList.remove('value-changed');
                void attackValue.offsetWidth;
                attackValue.classList.add('value-changed');
                
                setTimeout(() => {
                    attackValue.classList.remove('value-changed');
                }, 500);
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
        this.battleActive = false;
        
        if (this.isAuthoritative) {
            // Final reconnection check - don't end if guest is reconnecting
            if (this.guestReconnecting) {
                console.log('🛑 Aborting battle end - guest is reconnecting');
                this.battleActive = true; // Re-activate battle
                return;
            }

            const hostHeroesAlive = Object.values(this.playerHeroes).some(hero => hero && hero.alive);
            const guestHeroesAlive = Object.values(this.opponentHeroes).some(hero => hero && hero.alive);
            
            const { hostResult, guestResult } = this.determineBattleResults(hostHeroesAlive, guestHeroesAlive);

            // Set game phase to Reward BEFORE clearing battle states
            console.log('🎁 Setting game phase to Reward before cleanup');
            await this.setGamePhaseToReward();

            // CRITICAL: Mark battle as ended with timestamp for reconnection detection
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
                    console.log('✅ Reset ability tracking after turn increment');
                }
            }
            
            // ===== CLEAR POTION EFFECTS AFTER BATTLE =====
            if (window.potionHandler) {
                try {
                    console.log('🧪 Clearing potion effects after battle...');
                    window.potionHandler.clearPotionEffects();
                    console.log('✅ Potion effects cleared successfully');
                } catch (error) {
                    console.error('❌ Error clearing potion effects after battle:', error);
                }
            }
            
            if (window.heroSelection) {
                console.log('🥩 HOST: Clearing processed delayed artifact effects...');
                window.heroSelection.clearProcessedDelayedEffects();
            }
            
            const battleEndData = {
                hostResult,
                guestResult,
                hostLives: this.lifeManager ? this.lifeManager.getPlayerLives() : 10,
                guestLives: this.lifeManager ? this.lifeManager.getOpponentLives() : 10,
                hostGold: this.goldManager ? this.goldManager.getPlayerGold() : 0,
                guestGold: this.goldManager ? this.goldManager.getOpponentGold() : 0,
                newTurn: newTurn  // 🔥 NEW: Include the new turn number
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

            // 🔥 MODIFIED: Don't increment turn again, just show rewards
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
                console.log('💾 Final battle state saved for reward viewing');
            }
        } catch (error) {
            console.error('Error saving final battle state:', error);
        }
    }

    // Restore final battle state for viewing
    async restoreFinalBattleState(finalState) {
        try {
            console.log('🔄 Restoring final battle state for viewing...');
            
            // Don't reactivate the battle
            this.battleActive = false;
            
            // Initialize necromancy manager if not already done
            if (!this.necromancyManager) {
                const { NecromancyManager } = await import('./Abilities/necromancy.js');
                this.necromancyManager = new NecromancyManager(this);
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
                this.addCombatLog('📜 Viewing final battle state', 'info');
            }
            
            console.log('✅ Final battle state restored for viewing');
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
            console.log('🎁 Game phase set to Reward');
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
                console.log('✅ Battle ready states cleared, gamePhase remains as Reward');
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
            hostGoldGain: 0,  // Set to 0 since gold is awarded later
            guestGoldGain: 0  // Set to 0 since gold is awarded later
        };
    }

    // Enhanced combat log message to show wealth bonuses
    addWealthBonusLogMessage(playerWealthBonus, opponentWealthBonus) {
        if (playerWealthBonus > 0 || opponentWealthBonus > 0) {
            this.addCombatLog('💰 Wealth Ability Bonuses Applied!', 'info');
            
            if (playerWealthBonus > 0) {
                this.addCombatLog(`🏆 You earned +${playerWealthBonus} bonus gold from Wealth abilities!`, 'success');
            }
            
            if (opponentWealthBonus > 0) {
                this.addCombatLog(`⚔️ Opponent earned +${opponentWealthBonus} bonus gold from Wealth abilities`, 'info');
            }
        }
    }

    // Cleanup after battle
    async cleanupAfterBattle() {
        if (this.persistenceManager) {
            await this.persistenceManager.clearBattleState();
        }
        
        // ADD: Cleanup Jiggles effects
        if (this.jigglesManager) {
            this.jigglesManager.cleanup();
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
                
                // UPDATED: Don't clear gamePhase here - it should stay as 'Reward'
                await this.roomManager.getRoomRef().child('gameState').update({
                    battleStarted: false,
                    battleActive: false,
                    lastBattleStateUpdate: null,
                    battleCleanupCompleted: Date.now()
                    // NOTE: gamePhase stays as 'Reward'
                });
                
                console.log('✅ Battle cleanup completed, gamePhase preserved for rewards');
            } catch (error) {
                console.error('Error clearing battle messages:', error);
            }
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
                return '🎉 Victory! You have defeated your opponent!';
            case 'defeat':
                return '💀 Defeat! Your army has been vanquished!';
            case 'draw':
                return '🤝 Draw! Both armies have fallen!';
            default:
                return '❓ Battle outcome unknown';
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
                console.log('📜 BattleLog state restored');
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
        console.log('🎨 Updating all hero visuals...');
        
        ['left', 'center', 'right'].forEach(position => {
            // Update player heroes
            if (this.playerHeroes[position]) {
                const hero = this.playerHeroes[position];
                
                // Update health bar
                this.updateHeroHealthBar('player', position, hero.currentHp, hero.maxHp);
                
                // Update attack display
                this.updateHeroAttackDisplay('player', position, hero);
                
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
                
                console.log(`Updated player ${hero.name}: ${hero.currentHp}/${hero.maxHp} HP, alive: ${hero.alive}`);
            }
            
            // Update opponent heroes
            if (this.opponentHeroes[position]) {
                const hero = this.opponentHeroes[position];
                
                // Update health bar
                this.updateHeroHealthBar('opponent', position, hero.currentHp, hero.maxHp);
                
                // Update attack display
                this.updateHeroAttackDisplay('opponent', position, hero);
                
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
                
                console.log(`Updated opponent ${hero.name}: ${hero.currentHp}/${hero.maxHp} HP, alive: ${hero.alive}`);
            }
        });
        
        
        // Restore fireshield visual effects
        this.restoreFireshieldVisuals();

        // Restore frostRune visual effects
       this.restoreFrostRuneVisuals();

        // Sync abilities to battle screen for tooltip display
        if (this.battleScreen && this.battleScreen.syncAbilitiesFromBattleManager) {
            this.battleScreen.syncAbilitiesFromBattleManager();
        }

        console.log('✅ All hero visuals updated');
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
        this.battleLog = []; // UPDATED: Clear legacy array
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

        if (this.necromancyManager) {
            this.necromancyManager.cleanup();
            this.necromancyManager = null;
        }

        // Cleanup Jiggles manager
        if (this.jigglesManager) {
            this.jigglesManager.cleanup();
            this.jigglesManager = null;
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
        
        // NEW: Reset BattleLog through BattleScreen
        if (this.battleScreen && this.battleScreen.battleLog) {
            this.battleScreen.battleLog.clear();
        }
    }
}


export default BattleManager;

applyResistancePatches(BattleManager);