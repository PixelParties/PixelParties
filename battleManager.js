// battleManager.js - Complete Battle Manager with BattleLog Integration

import { getCardInfo } from './cardDatabase.js';
import { BattlePersistenceManager } from './battlePersistenceManager.js';
import { Hero } from './hero.js';
import { BattleSpeedManager } from './battleSpeedManager.js';
import { BattleRandomness } from './battleRandomness.js';
import { BattleSpellSystem } from './battleSpellSystem.js';
import StatusEffectsManager from './statusEffects.js';


import { BattleRandomnessManager } from './battleRandomnessManager.js';
import { BattleAnimationManager } from './battleAnimationManager.js';



import { NecromancyManager } from './Abilities/necromancy.js';
import { ResistanceManager, applyResistancePatches } from './Abilities/resistance.js';

import JigglesCreature from './Creatures/jiggles.js';


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
        
        // CONNECTION-AWARE SIMULATION
        this.opponentConnected = true;
        this.battlePaused = false;
        this.roomManager = null;
        this.connectionListener = null;
        this.pauseStartTime = null;
        this.totalPauseTime = 0;
        
        // Spell System
        this.spellSystem = null;

        //ABILITY STUFF
        this.necromancyManager = null; 

        //CREATURE STUFF
        this.jigglesManager = null;

        // OPTIMIZED SYNCHRONIZATION
        this.pendingAcks = {};
        this.ackTimeouts = {};
        this.connectionLatency = 100;
        
        // PERSISTENCE INTEGRATION
        this.persistenceManager = null;
        
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

        this.tabWasHidden = false;
        this.setupTabVisibilityListener();
        
        this.statusEffectsManager = null;
        this.animationManager = null;
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
        playerCreatures = null, opponentCreatures = null) {
        
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
        
        // Initialize persistence manager
        if (this.roomManager) {
            this.persistenceManager = new BattlePersistenceManager(this.roomManager, this.isHost);
        }
        
        // Setup connection monitoring (only for host)
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

    setupTabVisibilityListener() {
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.tabWasHidden = true;
                } else if (this.tabWasHidden) {
                    this.tabWasHidden = false;
                    // Clear any stuck pause overlays after a brief delay (speed-adjusted)
                    setTimeout(() => {
                        if (this.opponentConnected && this.battlePaused) {
                            this.resumeBattle('Tab visibility restored');
                        }
                    }, this.getSpeedAdjustedDelay(1000));
                }
            });
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

    // Setup monitoring of opponent's connection status
    setupOpponentConnectionMonitoring() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return;
        }

        const roomRef = this.roomManager.getRoomRef();
        
        this.connectionListener = roomRef.on('value', (snapshot) => {
            const room = snapshot.val();
            if (!room) return;

            const guestOnline = room.guestOnline || false;
            const guestConnected = room.guest && guestOnline;
            const guestReconnecting = room.guestReconnecting || false; // NEW
            
            const wasConnected = this.opponentConnected;
            this.opponentConnected = guestConnected;
            
            // NEW: Check if guest is reconnecting
            if (guestReconnecting && !this.guestReconnecting) {
                this.handleGuestReconnecting();
                return;
            }
            
            if (wasConnected && !guestConnected) {
                // Don't pause immediately if this might be a tab switch
                if (this.tabWasHidden) {
                    console.log('Opponent appears disconnected but our tab was hidden - waiting before pausing');
                    setTimeout(() => {
                        if (!this.opponentConnected && this.battleActive) {
                            this.pauseBattle('Guest disconnected');
                        }
                    }, this.getSpeedAdjustedDelay(3000)); // Wait 3 seconds before pausing (speed-adjusted)
                } else {
                    this.pauseBattle('Guest disconnected');
                }
            }
        });
    }

    // Pause battle simulation
    pauseBattle(reason) {
        if (!this.isAuthoritative || this.battlePaused) return;
        
        this.battlePaused = true;
        this.pauseStartTime = Date.now();
        
        this.addCombatLog(`⏸️ Battle paused: ${reason}`, 'warning');
        this.addCombatLog('⏳ Waiting for opponent to reconnect...', 'info');
        
        this.saveBattleStateToPersistence();
        
        this.sendBattleUpdate('battle_paused', {
            reason: reason,
            timestamp: Date.now()
        });
        
        this.showBattlePauseUI(reason);
    }

    // Resume battle simulation
    async resumeBattle(reason) {
        if (!this.isAuthoritative || !this.battlePaused) return;
        
        this.battlePaused = false;
        
        if (this.pauseStartTime) {
            this.totalPauseTime += Date.now() - this.pauseStartTime;
            this.pauseStartTime = null;
        }
        
        this.addCombatLog(`▶️ Battle resumed: ${reason}`, 'success');
        this.addCombatLog('⚔️ Continuing from where we left off...', 'info');
        
        await this.saveBattleStateToPersistence();
        
        this.sendBattleUpdate('battle_resumed', {
            reason: reason,
            timestamp: Date.now()
        });
    
        this.hideBattlePauseUI();
        
        // Force clear overlay if it's still there
        setTimeout(() => {
            this.clearStuckPauseOverlay();
        }, 500);
        
        if (this.battleActive && !this.checkBattleEnd()) {
            setTimeout(() => {
                this.authoritative_battleLoop();
            }, 500);
        }
    }

    // Show battle pause UI
    showBattlePauseUI(reason) {
        const existingOverlay = document.getElementById('battlePauseOverlay');
        if (existingOverlay) existingOverlay.remove();
        
        const pauseOverlay = document.createElement('div');
        pauseOverlay.id = 'battlePauseOverlay';
        pauseOverlay.className = 'battle-pause-overlay';
        pauseOverlay.innerHTML = `
            <div class="battle-pause-content">
                <div class="pause-icon">⏸️</div>
                <h2>Battle Paused</h2>
                <p>${reason}</p>
                <div class="pause-spinner"></div>
                <div class="pause-details">
                    <p>• Battle state is preserved</p>
                    <p>• Waiting for opponent to return</p>
                    <p>• Will resume automatically</p>
                </div>
            </div>
        `;
        
        pauseOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-out;
        `;
        
        document.body.appendChild(pauseOverlay);
        
        if (!document.getElementById('battlePauseStyles')) {
            const style = document.createElement('style');
            style.id = 'battlePauseStyles';
            style.textContent = `
                .battle-pause-content {
                    text-align: center;
                    color: white;
                    padding: 40px;
                    border-radius: 20px;
                    background: rgba(0, 0, 0, 0.9);
                    border: 2px solid rgba(255, 193, 7, 0.5);
                    max-width: 400px;
                }
                
                .pause-icon {
                    font-size: 4rem;
                    margin-bottom: 20px;
                }
                
                .battle-pause-content h2 {
                    font-size: 2rem;
                    margin: 0 0 10px 0;
                    color: #ffc107;
                }
                
                .pause-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255, 193, 7, 0.3);
                    border-top: 3px solid #ffc107;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }
                
                .pause-details {
                    margin-top: 20px;
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.8);
                }
                
                .pause-details p {
                    margin: 5px 0;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            
            document.head.appendChild(style);
        }
    }

    // Hide battle pause UI
    hideBattlePauseUI() {
        const pauseOverlay = document.getElementById('battlePauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => pauseOverlay.remove(), 300);
        }
    }

    // Initialize heroes with Hero class and abilities
    initializeHeroes() {
        const mySide = this.isHost ? 'host' : 'guest';
        const opponentSide = this.isHost ? 'guest' : 'host';
        
        // Initialize all heroes
        this.initializeHeroesForSide('player', this.playerFormation, this.playerHeroes, 
                                    this.playerAbilities, this.playerSpellbooks, 
                                    this.playerCreatures, mySide);
        this.initializeHeroesForSide('opponent', this.opponentFormation, this.opponentHeroes, 
                                    this.opponentAbilities, this.opponentSpellbooks, 
                                    this.opponentCreatures, opponentSide);
    }

    // Initialize heroes for a specific side
    initializeHeroesForSide(side, formation, heroesObj, abilities, spellbooks, creatures, absoluteSide) {
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
        if (this.battleActive) {
            return;
        }

        this.battleActive = true;
        this.currentTurn = 0;
        this.battleLog = []; // UPDATED: Clear legacy array, delegate to BattleScreen
        this.turnInProgress = false;
        this.pendingAcks = {};
        this.ackTimeouts = {};
        
        // Reset connection-aware state
        this.battlePaused = false;
        this.pauseStartTime = null;
        this.totalPauseTime = 0;

        // Initialize speed control UI
        if (this.battleScreen && this.battleScreen.initializeSpeedControl) {
            this.battleScreen.initializeSpeedControl(this.isAuthoritative);
        }
        
        // Initialize extensible state
        this.initializeExtensibleState();
        
        // Re-initialize heroes to ensure fresh health/state
        this.initializeHeroes();

        // Initialize necromancy manager and stacks
        this.necromancyManager = new NecromancyManager(this);
        this.necromancyManager.initializeNecromancyStacks();
        this.necromancyManager.initializeNecromancyStackDisplays();
        
        // Initialize Jiggles manager
        this.jigglesManager = new JigglesCreature(this);
        
        // Ensure randomness is initialized before battle starts
        if (this.isAuthoritative && !this.randomnessInitialized) {
            this.initializeRandomness();
        }
        
        // Add randomness info to combat log
        if (this.randomnessManager.isInitialized) {
            this.addCombatLog(`🎲 Battle randomness initialized (seed: ${this.randomnessManager.seed.slice(0, 8)}...)`, 'info');
        }
        
        this.addCombatLog('⚔️ Battle begins with Hero abilities and creatures!', 'success');
        
        // Log any SummoningMagic bonuses applied to creatures
        this.logSummoningMagicBonuses();
        
        if (this.isAuthoritative) {
            try {
                console.log('🧪 Applying potion effects from both players at battle start...');
                
                // Get both players' potion states from Firebase
                const potionStates = await this.getBothPlayersPotionStates();
                
                // Let the potion handler deal with applying effects from both states
                if (window.potionHandler && potionStates) {
                    await window.potionHandler.applyBothPlayersPotionEffectsAtBattleStart(
                        potionStates.host, 
                        potionStates.guest, 
                        this
                    );
                }
                console.log('✅ All potion effects applied successfully');

                // Apply delayed artifact effects from both players (like Poisoned Meat)
                console.log('🥩 Applying delayed artifact effects from both players at battle start...');
                const delayedEffects = await this.getBothPlayersDelayedEffects();
                
                if (delayedEffects) {
                    const { applyBothPlayersDelayedEffects } = await import('./Artifacts/poisonedMeat.js');
                    await applyBothPlayersDelayedEffects(delayedEffects.host, delayedEffects.guest, this);
                }
                
                console.log('✅ All start of battle effects applied successfully');
            } catch (error) {
                console.error('❌ Error applying battle start effects:', error);
                this.addCombatLog('⚠️ Some battle start effects failed to apply', 'warning');
            }
        }
        
        await this.saveBattleStateToPersistence();
        
        if (this.isAuthoritative) {
            if (!this.opponentConnected) {
                this.pauseBattle('Opponent not connected at battle start');
            } else {
                await this.delay(50);
                this.authoritative_battleLoop();
            }
        }
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
        if (!this.isAuthoritative) {
            console.error('NON-AUTHORITATIVE client tried to run battle loop!');
            return;
        }

        while (this.battleActive && !this.checkBattleEnd()) {
            if (!this.opponentConnected) {
                this.pauseBattle('Opponent disconnected');
                return;
            }

            if (this.battlePaused) {
                return;
            }

            this.currentTurn++;
            this.addCombatLog(`📍 Turn ${this.currentTurn} begins`, 'info');
            
            this.sendBattleUpdate('turn_start', { turn: this.currentTurn });
            
            await this.saveBattleStateToPersistence();
            
            for (const position of ['left', 'center', 'right']) {
                if (!this.battleActive || this.checkBattleEnd()) break;
                
                if (!this.opponentConnected) {
                    this.pauseBattle('Opponent disconnected during turn');
                    return;
                }
                
                if (this.battlePaused) {
                    return;
                }
                
                await this.authoritative_processTurnForPosition(position);
                await this.saveBattleStateToPersistence();
                await this.delay(15);
            }
            
            await this.delay(10);
        }
        
        await this.delay(200);
        this.handleBattleEnd();
    }

    // Get hero ability modifiers for damage calculation
    getHeroAbilityModifiers(hero) {
        const modifiers = {
            attackBonus: 0,
            defenseBonus: 0,
            specialEffects: []
        };
        
        if (hero.hasAbility('Fighting')) {
            const stackCount = hero.getAbilityStackCount('Fighting');
            modifiers.attackBonus += stackCount * 10;
            modifiers.specialEffects.push(`Fighting (+${stackCount * 10} ATK)`);
        }
        
        return modifiers;
    }

    // Process turn for a specific position with creatures
    async authoritative_processTurnForPosition(position) {
        if (!this.isAuthoritative) return;

        this.turnInProgress = true;
        
        const playerHero = this.playerHeroes[position];
        const opponentHero = this.opponentHeroes[position];
        
        const playerCanAct = playerHero && playerHero.alive;
        const opponentCanAct = opponentHero && opponentHero.alive;
        
        if (!playerCanAct && !opponentCanAct) {
            this.turnInProgress = false;
            return;
        }

        // Build complete actor lists for both sides
        const playerActors = this.buildActorList(playerHero, playerCanAct);
        const opponentActors = this.buildActorList(opponentHero, opponentCanAct);
        
        // Process all actors in paired sequence
        const maxActors = Math.max(playerActors.length, opponentActors.length);
        
        for (let i = 0; i < maxActors; i++) {
            // Check if battle should end before processing more actors
            if (this.checkBattleEnd()) {
                console.log('Battle ended during actor processing, stopping turn');
                break;
            }
            
            // Get actors for this iteration
            let playerActor = playerActors[i] || null;
            let opponentActor = opponentActors[i] || null;
            
            // FILTER OUT DEAD ACTORS before they act
            if (playerActor && !this.isActorAlive(playerActor)) {
                this.addCombatLog(`💀 ${playerActor.name} has died and cannot act!`, 'info');
                playerActor = null;
            }
            
            if (opponentActor && !this.isActorAlive(opponentActor)) {
                this.addCombatLog(`💀 ${opponentActor.name} has died and cannot act!`, 'info');
                opponentActor = null;
            }
            
            // Skip if both actors are dead/invalid
            if (!playerActor && !opponentActor) continue;
            
            // Send actor action update
            const actorActionData = {
                position: position,
                playerActor: playerActor ? {
                    type: playerActor.type,
                    name: playerActor.name,
                    index: playerActor.index,
                    side: 'player'
                } : null,
                opponentActor: opponentActor ? {
                    type: opponentActor.type,
                    name: opponentActor.name,
                    index: opponentActor.index,
                    side: 'opponent'
                } : null
            };
            
            this.sendBattleUpdate('actor_action', actorActionData);
            
            // Execute actor actions
            await this.executeActorActions(playerActor, opponentActor, position);
            
            await this.delay(300); // Brief pause between actor pairs (now speed-adjusted)
        }
        
        this.clearTurnModifiers(playerHero, opponentHero, position);
        this.turnInProgress = false;
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
        if (!actor) return false;
        
        if (actor.type === 'hero') {
            return actor.data && actor.data.alive;
        } else if (actor.type === 'creature') {
            // Check if the creature is still alive
            return actor.data && actor.data.alive;
        }
        
        return false;
    }

    buildActorList(hero, canAct) {
        const actors = [];
        
        if (!canAct || !hero) return actors;
        
        // Add living creatures in NORMAL order (first creature first)
        // This matches the targeting order where heroes target the first creature first
        const livingCreatures = hero.creatures.filter(c => c.alive);
        
        // Process creatures in normal order - first creature acts first
        for (let i = 0; i < livingCreatures.length; i++) {
            const creature = livingCreatures[i];
            const originalIndex = hero.creatures.indexOf(creature);
            
            actors.push({
                type: 'creature',
                name: creature.name,
                data: creature,
                index: originalIndex, // Keep the original index for targeting
                hero: hero
            });
        }
        
        // Add hero last (after all creatures have acted)
        actors.push({
            type: 'hero',
            name: hero.name,
            data: hero,
            hero: hero
        });
        
        return actors;
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
        // Check if battle ended before executing actions
        if (this.checkBattleEnd()) {
            console.log('Battle ended before actor actions, skipping');
            return;
        }
        
        // ============================================
        // REMEMBER ORIGINAL ACTORS FOR STATUS EFFECTS
        // ============================================
        
        // Remember original actors before filtering for stun/freeze
        // This ensures that stunned/frozen actors still get status effect processing
        const originalPlayerActor = playerActor;
        const originalOpponentActor = opponentActor;
        
        // ============================================
        // STATUS EFFECTS: Check action restrictions
        // ============================================
        
        // Check if player actor can take action (not stunned/frozen)
        if (playerActor && this.statusEffectsManager && !this.statusEffectsManager.canTakeAction(playerActor.data)) {
            const stunned = this.statusEffectsManager.hasStatusEffect(playerActor.data, 'stunned');
            const frozen = this.statusEffectsManager.hasStatusEffect(playerActor.data, 'frozen');
            
            if (stunned) {
                this.statusEffectsManager.processTurnSkip(playerActor.data, 'stunned');
            } else if (frozen) {
                this.statusEffectsManager.processTurnSkip(playerActor.data, 'frozen');
            }
            
            playerActor = null; // Skip this actor's turn
        }
        
        // Check if opponent actor can take action (not stunned/frozen)
        if (opponentActor && this.statusEffectsManager && !this.statusEffectsManager.canTakeAction(opponentActor.data)) {
            const stunned = this.statusEffectsManager.hasStatusEffect(opponentActor.data, 'stunned');
            const frozen = this.statusEffectsManager.hasStatusEffect(opponentActor.data, 'frozen');
            
            if (stunned) {
                this.statusEffectsManager.processTurnSkip(opponentActor.data, 'stunned');
            } else if (frozen) {
                this.statusEffectsManager.processTurnSkip(opponentActor.data, 'frozen');
            }
            
            opponentActor = null; // Skip this actor's turn
        }
        
        // ============================================
        // EXISTING ACTOR ACTION LOGIC
        // ============================================
        
        const actions = [];
        let hasJigglesAttacks = false;
        let hasHeroActions = false;
        
        // Collect all creature actions (including Jiggles special attacks)
        if (playerActor && playerActor.type === 'creature') {
            if (JigglesCreature.isJiggles(playerActor.name)) {
                // Don't await yet - add to actions array
                actions.push(this.jigglesManager.executeSpecialAttack(playerActor, position));
                hasJigglesAttacks = true;
            } else {
                actions.push(this.animationManager.shakeCreature('player', position, playerActor.index));
                this.addCombatLog(`🌟 ${playerActor.name} activates!`, 'success');
            }
        }
        
        if (opponentActor && opponentActor.type === 'creature') {
            if (JigglesCreature.isJiggles(opponentActor.name)) {
                // Don't await yet - add to actions array
                actions.push(this.jigglesManager.executeSpecialAttack(opponentActor, position));
                hasJigglesAttacks = true;
            } else {
                actions.push(this.animationManager.shakeCreature('opponent', position, opponentActor.index));
                this.addCombatLog(`🌟 ${opponentActor.name} activates!`, 'error');
            }
        }
        
        // Check if we have hero actions to execute
        if ((playerActor && playerActor.type === 'hero') || 
            (opponentActor && opponentActor.type === 'hero')) {
            hasHeroActions = true;
        }
        
        // If we have both Jiggles attacks and hero actions, start them simultaneously
        if (hasJigglesAttacks && hasHeroActions) {            
            // Start hero actions without awaiting
            const playerHeroAction = playerActor && playerActor.type === 'hero' ? playerActor : null;
            const opponentHeroAction = opponentActor && opponentActor.type === 'hero' ? opponentActor : null;
            
            const heroActionPromise = this.executeHeroActions(playerHeroAction, opponentHeroAction, position);
            
            // Add hero actions to the actions array
            actions.push(heroActionPromise);
            
            // Wait for all actions (Jiggles + heroes) to complete simultaneously
            await Promise.all(actions);
            
            // Check if battle ended after all actions
            if (this.checkBattleEnd()) {
                return;
            }
        } 
        // If we only have Jiggles attacks (no heroes), execute them and check battle end
        else if (hasJigglesAttacks) {
            await Promise.all(actions);
            
            // Check if battle ended after Jiggles attacks
            if (this.checkBattleEnd()) {
                return;
            }
        }
        // If we only have hero actions (no Jiggles), execute them normally
        else if (hasHeroActions) {
            // Final check before hero actions
            if (this.checkBattleEnd()) {
                return;
            }
            
            const playerHeroAction = playerActor && playerActor.type === 'hero' ? playerActor : null;
            const opponentHeroAction = opponentActor && opponentActor.type === 'hero' ? opponentActor : null;
            
            await this.executeHeroActions(playerHeroAction, opponentHeroAction, position);
        }
        // If we only have regular creature actions, execute them
        else if (actions.length > 0) {
            await Promise.all(actions);
        }
        
        // ============================================
        // STATUS EFFECTS: Post-turn processing (FIXED)
        // ============================================
        
        // Process status effects after actor actions complete
        // This handles poison damage, burn damage, silenced duration, etc.
        // FIXED: Process for ALL original actors, not just those that acted
        // This ensures that stunned/frozen actors still take poison and burn damage
        if (this.statusEffectsManager) {
            const statusEffectPromises = [];
            
            // Process status effects for ALL original actors (including stunned/frozen)
            // This is the key fix - we use originalPlayerActor and originalOpponentActor
            // instead of the potentially null playerActor and opponentActor
            if (originalPlayerActor && originalPlayerActor.data && originalPlayerActor.data.alive) {
                statusEffectPromises.push(
                    this.statusEffectsManager.processStatusEffectsAfterTurn(originalPlayerActor.data)
                );
            }
            
            if (originalOpponentActor && originalOpponentActor.data && originalOpponentActor.data.alive) {
                statusEffectPromises.push(
                    this.statusEffectsManager.processStatusEffectsAfterTurn(originalOpponentActor.data)
                );
            }
            
            // Wait for all status effect processing to complete
            if (statusEffectPromises.length > 0) {
                await Promise.all(statusEffectPromises);
                
                // Small delay after status effects for visual clarity
                await this.delay(200);
            }
        }
        
        // ============================================
        // FINAL BATTLE STATE CHECK
        // ============================================
        
        // Final check if battle ended due to status effect damage
        if (this.checkBattleEnd()) {
            console.log('Battle ended due to status effect damage');
            return;
        }
    }

    async executeHeroActions(playerHeroActor, opponentHeroActor, position) {
        // Check if battle ended before executing actions
        if (this.checkBattleEnd()) {
            console.log('Battle ended before hero actions, skipping');
            return;
        }
        
        const playerCanAttack = playerHeroActor !== null;
        const opponentCanAttack = opponentHeroActor !== null;
        
        // NEW: Check for spell casting before attacking
        let playerSpellToCast = null;
        let opponentSpellToCast = null;
        let playerWillAttack = playerCanAttack;
        let opponentWillAttack = opponentCanAttack;
        
        if (playerCanAttack && this.spellSystem) {
            playerSpellToCast = this.spellSystem.checkSpellCasting(playerHeroActor.data);
            if (playerSpellToCast) {
                playerWillAttack = false; // Hero spent turn casting spell
            }
        }
        
        if (opponentCanAttack && this.spellSystem) {
            opponentSpellToCast = this.spellSystem.checkSpellCasting(opponentHeroActor.data);
            if (opponentSpellToCast) {
                opponentWillAttack = false; // Hero spent turn casting spell
            }
        }
        
        // Execute spell casting if applicable
        if (playerSpellToCast && this.spellSystem) {
            this.spellSystem.executeSpellCasting(playerHeroActor.data, playerSpellToCast);
        }
        
        if (opponentSpellToCast && this.spellSystem) {
            this.spellSystem.executeSpellCasting(opponentHeroActor.data, opponentSpellToCast);
        }
        
        // Continue with normal attack logic for heroes that didn't cast spells
        const playerTarget = playerWillAttack ? 
            this.authoritative_findTargetWithCreatures(position, 'player') : null;
        const opponentTarget = opponentWillAttack ? 
            this.authoritative_findTargetWithCreatures(position, 'opponent') : null;
        
        // Check if targets are valid before proceeding
        const playerValidAttack = playerWillAttack && playerTarget;
        const opponentValidAttack = opponentWillAttack && opponentTarget;
        
        // If no valid attacks can be made and no spells were cast, skip animation
        if (!playerValidAttack && !opponentValidAttack && !playerSpellToCast && !opponentSpellToCast) {
            this.addCombatLog('💨 No actions taken this turn!', 'info');
            return;
        }
        
        // Only proceed with attack animations/damage for heroes that are attacking
        if (playerValidAttack || opponentValidAttack) {
            const playerDamage = playerValidAttack ? 
                this.calculateDamage(playerHeroActor.data, true) : 0;
            const opponentDamage = opponentValidAttack ? 
                this.calculateDamage(opponentHeroActor.data, true) : 0;
            
            const turnData = this.createTurnDataWithCreatures(
                position, 
                playerValidAttack ? playerHeroActor.data : null, playerTarget, playerDamage,
                opponentValidAttack ? opponentHeroActor.data : null, opponentTarget, opponentDamage
            );
            
            this.sendBattleUpdate('hero_turn_execution', turnData);
            
            const executionPromise = this.executeHeroAttacksWithDamage(
                playerValidAttack ? { 
                    hero: playerHeroActor.data, 
                    target: playerTarget, 
                    damage: playerDamage 
                } : null,
                opponentValidAttack ? { 
                    hero: opponentHeroActor.data, 
                    target: opponentTarget, 
                    damage: opponentDamage 
                } : null
            );
            
            const ackPromise = this.waitForGuestAcknowledgment('turn_complete', this.getAdaptiveTimeout());
            
            await Promise.all([executionPromise, ackPromise]);
        }
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
        if (!this.isAuthoritative) return null;

        const targets = attackerSide === 'player' ? this.opponentHeroes : this.playerHeroes;
        
        // Helper function to create creature target if hero has living creatures
        const createCreatureTargetIfAvailable = (hero, heroPosition) => {
            if (!hero || !hero.alive) return null;
            
            const livingCreatures = hero.creatures.filter(c => c.alive);
            if (livingCreatures.length > 0) {
                // Target the FIRST living creature (newest to oldest as mentioned)
                return {
                    type: 'creature',
                    hero: hero,
                    creature: livingCreatures[0],
                    creatureIndex: hero.creatures.indexOf(livingCreatures[0]),
                    position: heroPosition,
                    side: attackerSide === 'player' ? 'opponent' : 'player'
                };
            }
            return null;
        };

        // Helper function to create hero target
        const createHeroTarget = (hero, heroPosition) => {
            if (!hero || !hero.alive) return null;
            
            return {
                type: 'hero',
                hero: hero,
                position: heroPosition,
                side: attackerSide === 'player' ? 'opponent' : 'player'
            };
        };

        // Helper function to get target (creature first, then hero) for any position
        const getTargetForPosition = (heroPosition) => {
            const hero = targets[heroPosition];
            if (!hero || !hero.alive) return null;
            
            // Always check creatures first, regardless of position
            const creatureTarget = createCreatureTargetIfAvailable(hero, heroPosition);
            if (creatureTarget) return creatureTarget;
            
            // If no creatures, target the hero
            return createHeroTarget(hero, heroPosition);
        };

        // Get all alive targets for fallback
        const aliveTargets = Object.values(targets).filter(hero => hero && hero.alive);
        if (aliveTargets.length === 0) return null;

        // Primary targeting: try same position first
        const primaryTarget = getTargetForPosition(attackerPosition);
        if (primaryTarget) return primaryTarget;

        // Alternative targeting with creature priority
        switch (attackerPosition) {
            case 'left':
                // Try center first, then right
                const leftToCenterTarget = getTargetForPosition('center');
                if (leftToCenterTarget) return leftToCenterTarget;
                
                const leftToRightTarget = getTargetForPosition('right');
                if (leftToRightTarget) return leftToRightTarget;
                break;
                
            case 'center':
                // Random target selection, but still check creatures first
                const randomTargetHero = this.getRandomChoice(aliveTargets);
                if (randomTargetHero) {
                    const randomTarget = getTargetForPosition(randomTargetHero.position);
                    if (randomTarget) return randomTarget;
                }
                break;
                
            case 'right':
                // Try center first, then left
                const rightToCenterTarget = getTargetForPosition('center');
                if (rightToCenterTarget) return rightToCenterTarget;
                
                const rightToLeftTarget = getTargetForPosition('left');
                if (rightToLeftTarget) return rightToLeftTarget;
                break;
        }
        
        // Last resort - find any alive target (creature first, then hero)
        for (const hero of aliveTargets) {
            const lastResortTarget = getTargetForPosition(hero.position);
            if (lastResortTarget) return lastResortTarget;
        }
        
        // This should never happen if there are alive targets, but safety fallback
        return createHeroTarget(aliveTargets[0], aliveTargets[0].position);
    }

    // Calculate damage for a hero
    calculateDamage(hero, canAct) {
        if (!canAct) return 0;
        
        let damage = hero.getCurrentAttack();
        const modifiers = this.getHeroAbilityModifiers(hero);
        damage += modifiers.attackBonus;
        
        this.updateHeroAttackDisplay(hero.side, hero.position, hero);
        
        if (modifiers.specialEffects.length > 0) {
            this.addCombatLog(`🎯 ${hero.name} abilities: ${modifiers.specialEffects.join(', ')}`, 'info');
        }
        
        return damage;
    }

    // Create turn data object with creatures
    createTurnDataWithCreatures(position, playerHero, playerTarget, playerDamage, 
                               opponentHero, opponentTarget, opponentDamage) {
        const createActionData = (hero, target, damage) => {
            if (!hero || !hero.alive) return null;
            
            const actionData = {
                attacker: position,
                targetType: target ? target.type : null,
                damage: damage,
                attackerData: {
                    absoluteSide: hero.absoluteSide,
                    position: hero.position,
                    name: hero.name,
                    abilities: hero.getAllAbilities()
                }
            };
            
            if (target) {
                if (target.type === 'creature') {
                    actionData.targetData = {
                        type: 'creature',
                        absoluteSide: target.hero.absoluteSide,
                        position: target.position,
                        creatureIndex: target.creatureIndex,
                        creatureName: target.creature.name
                    };
                } else {
                    actionData.targetData = {
                        type: 'hero',
                        absoluteSide: target.hero.absoluteSide,
                        position: target.position,
                        name: target.hero.name
                    };
                }
            }
            
            return actionData;
        };

        return {
            turn: this.currentTurn,
            position: position,
            playerAction: createActionData(playerHero, playerTarget, playerDamage),
            opponentAction: createActionData(opponentHero, opponentTarget, opponentDamage)
        };
    }

    // Clear temporary modifiers at end of turn
    clearTurnModifiers(playerHero, opponentHero, position) {
        if (playerHero) {
            playerHero.clearTemporaryModifiers();
            this.updateHeroAttackDisplay('player', position, playerHero);
        }
        if (opponentHero) {
            opponentHero.clearTemporaryModifiers();
            this.updateHeroAttackDisplay('opponent', position, opponentHero);
        }
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
            this.applyAttackDamageToTarget(attack);
            await this.animationManager.animateReturn(attack.hero, side);
        }
    }

    // Apply damage to target (hero or creature)
    applyAttackDamageToTarget(attack) {
        if (!attack || !attack.target) return;
        
        if (attack.target.type === 'creature') {
            // Apply damage to creature (creatures don't have toxic trap)
            this.authoritative_applyDamageToCreature({
                hero: attack.target.hero,
                creature: attack.target.creature,
                creatureIndex: attack.target.creatureIndex,
                damage: attack.damage,
                position: attack.target.position,
                side: attack.target.side
            });
        } else {
            // Hero-to-hero attack - check for toxic trap first
            const defender = attack.target.hero;
            const attacker = attack.hero;
            
            
            this.authoritative_applyDamage({
                target: defender,
                damage: attack.damage,
                newHp: Math.max(0, defender.currentHp - attack.damage),
                died: (defender.currentHp - attack.damage) <= 0
            });
            
            // Check for toxic trap
            if (this.checkAndApplyToxicTrap(attacker, defender)) {
                // Toxic trap triggered - original attack is blocked
                console.log(`🍄 ${attacker.name}'s attack was blocked by ${defender.name}'s toxic trap!`);
            }

            // Check for frost rune
            if (this.checkAndApplyFrostRune(attacker, defender)) {
                // Frost rune triggered - original attack is blocked
                console.log(`❄️ ${attacker.name}'s attack was blocked by ${defender.name}'s frost rune!`);
            }

            // Check for fireshield recoil damage (only for hero-to-hero attacks)
            this.checkAndApplyFireshieldRecoil(attacker, defender);
        }
    }

    // Check and apply fireshield recoil damage
    checkAndApplyFireshieldRecoil(attacker, defender) {
        if (!this.isAuthoritative || !this.spellSystem) return;
        
        // Get fireshield spell implementation
        const fireshieldSpell = this.spellSystem.spellImplementations.get('Fireshield');
        if (!fireshieldSpell) return;
        
        // Check if recoil should trigger
        if (!fireshieldSpell.shouldTriggerRecoil(attacker, defender, this.currentTurn)) {
            return;
        }
        
        // Calculate and apply recoil damage
        const recoilDamage = fireshieldSpell.calculateRecoilDamage(defender);
        if (recoilDamage > 0) {
            fireshieldSpell.applyRecoilDamage(attacker, defender, recoilDamage);
        }
    }

    // Check and apply toxic trap effect
    checkAndApplyToxicTrap(attacker, defender) {
        if (!this.isAuthoritative || !this.spellSystem) return false;
        
        // Get toxic trap spell implementation
        const toxicTrapSpell = this.spellSystem.spellImplementations.get('ToxicTrap');
        if (!toxicTrapSpell) return false;
        
        // Check if toxic trap should trigger
        if (!toxicTrapSpell.shouldTriggerToxicTrap(attacker, defender)) {
            return false;
        }
        
        // Apply toxic trap effect (poison attacker instead of damaging defender)
        const blocked = toxicTrapSpell.applyToxicTrapEffect(attacker, defender);
        
        return blocked; // true if attack was blocked
    }

    checkAndApplyFrostRune(attacker, defender) {
        if (!this.isAuthoritative || !this.spellSystem) return false;
        
        // Get frost rune spell implementation
        const frostRuneSpell = this.spellSystem.spellImplementations.get('FrostRune');
        if (!frostRuneSpell) return false;
        
        // Check if frost rune should trigger
        if (!frostRuneSpell.shouldTriggerFrostRune(attacker, defender)) {
            return false;
        }
        
        // Apply frost rune effect (freeze attacker instead of damaging defender)
        const blocked = frostRuneSpell.applyFrostRuneEffect(attacker, defender);
        
        return blocked; // true if attack was blocked
    }

    // Apply damage to a creature
    authoritative_applyDamageToCreature(damageData) {
        if (!this.isAuthoritative) return;
        
        const { hero, creature, creatureIndex, damage, position, side } = damageData;
        
        const oldHp = creature.currentHp;
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
        
        if (!creature.alive && oldHp > 0) {
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

    // Adaptive timeout based on connection quality
    getAdaptiveTimeout() {
        const baseTimeout = Math.max(300, this.connectionLatency * 3);
        const maxTimeout = 1000;
        return Math.min(baseTimeout, maxTimeout);
    }

    // Wait for guest acknowledgment
    async waitForGuestAcknowledgment(ackType, timeout = 500) {
        const startTime = Date.now();
        
        // Apply speed adjustment to the timeout
        //const adjustedTimeout = this.getSpeedAdjustedDelay(timeout);
        const adjustedTimeout = 1;
        
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                delete this.pendingAcks[ackType];
                delete this.ackTimeouts[ackType];
                
                this.connectionLatency = Math.min(this.connectionLatency * 1.2, 500);
                resolve();
            }, adjustedTimeout);
            
            this.pendingAcks[ackType] = () => {
                const responseTime = Date.now() - startTime;
                clearTimeout(timeoutId);
                delete this.pendingAcks[ackType];
                delete this.ackTimeouts[ackType];
                
                this.connectionLatency = Math.max(responseTime + 50, 50);
                resolve();
            };
            
            this.ackTimeouts[ackType] = timeoutId;
        });
    }

    // Apply damage to target
    authoritative_applyDamage(damageResult) {
        if (!this.isAuthoritative) return;

        const { target, damage, newHp, died } = damageResult;
        
        const result = target.takeDamage(damage);
        
        if (!this.totalDamageDealt[target.absoluteSide]) {
            this.totalDamageDealt[target.absoluteSide] = 0;
        }
        this.totalDamageDealt[target.absoluteSide] += damage;
        
        this.addCombatLog(
            `💔 ${target.name} takes ${damage} damage! (${result.oldHp} → ${result.newHp} HP)`,
            target.side === 'player' ? 'error' : 'success'
        );

        this.updateHeroHealthBar(target.side, target.position, result.newHp, target.maxHp);
        const damageSource = arguments[1]?.source || 'attack';
        this.animationManager.createDamageNumber(target.side, target.position, damage, target.maxHp, damageSource);
        
        if (result.died && result.oldHp > 0) {
            this.handleHeroDeath(target);
        }

        this.sendBattleUpdate('damage_applied', {
            targetAbsoluteSide: target.absoluteSide,
            targetPosition: target.position,
            damage: damage,
            oldHp: result.oldHp,
            newHp: result.newHp,
            maxHp: target.maxHp,
            died: result.died,
            targetName: target.name
        });
        
        this.saveBattleStateToPersistence().catch(error => {
            console.error('Error saving state after damage:', error);
        });
    }

    // Receive battle data from host (for GUEST) - UPDATED
    receiveBattleData(message) {        
        // Handle host-specific messages first
        if (this.isAuthoritative) {
            if (message.type === 'guest_reconnection_ready') {
                this.handleGuestReconnectionReady();
            }
            // Don't return early - let host process other messages too if needed
            //return;
        }
        

        // Guest message processing
        const { type, data } = message;
        
        switch (type) {
            case 'turn_start':
                this.guest_handleTurnStart(data);
                break;
                
            case 'speed_change':
                this.guest_handleSpeedChange(data);
                break;
                
            case 'randomness_seed':
                this.guest_handleRandomnessSeed(data);
                break;
                
            case 'creature_action':
                this.guest_handleCreatureAction(data);
                break;
                
            case 'combined_turn_execution':
                this.guest_handleCombinedTurnExecution(data);
                break;
                
            case 'damage_applied':
                this.guest_handleDamageApplied(data);
                break;
                
            case 'creature_damage_applied':
                this.guest_handleCreatureDamageApplied(data);
                break;
                
            case 'battle_end':
                this.guest_handleBattleEnd(data);
                break;
                
            case 'battle_paused':
                this.guest_handleBattlePaused(data);
                break;
                
            case 'battle_resumed':
                this.guest_handleBattleResumed(data);
                break;

            case 'actor_action':
                this.guest_handleActorAction(data);
                break;
                
            case 'hero_turn_execution':
                this.guest_handleHeroTurnExecution(data);
                break;
                
            case 'status_effect_change':
                this.guest_handleStatusEffectChange(data);
                break;



                
            case 'necromancy_revival':
                this.guest_handleNecromancyRevival(data);
                break;



                
            case 'jiggles_special_attack':
                if (this.jigglesManager) {
                    this.jigglesManager.handleGuestSpecialAttack(data);
                }
                break;



                
            case 'spell_cast':
                this.guest_handleSpellCast(data);
                break;
                
            case 'spell_effect':
                this.guest_handleSpellEffect(data);
                break;
                
            case 'fireshield_applied':
                this.guest_handleFireshieldApplied(data);
                break;

            case 'toxic_trap_applied':
                this.guest_handleToxicTrapApplied(data);
                break;

            case 'frost_rune_applied':
                this.guest_handleFrostRuneApplied(data);
                break;
        }
    }

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

    guest_handleFireshieldApplied(data) {
        // Forward to the fireshield spell implementation if available
        if (this.spellSystem && this.spellSystem.spellImplementations.has('Fireshield')) {
            const fireshieldSpell = this.spellSystem.spellImplementations.get('Fireshield');
            fireshieldSpell.handleGuestFireshieldApplied(data);
        } else {
            console.warn('Received fireshield applied but fireshield spell not available');
        }
    }

    guest_handleToxicTrapApplied(data) {
        // Forward to the toxic trap spell implementation if available
        if (this.spellSystem && this.spellSystem.spellImplementations.has('ToxicTrap')) {
            const toxicTrapSpell = this.spellSystem.spellImplementations.get('ToxicTrap');
            toxicTrapSpell.handleGuestToxicTrapApplied(data);
        } else {
            console.warn('Received toxic trap applied but toxic trap spell not available');
        }
    }

    guest_handleFrostRuneApplied(data) {
        // Forward to the frost rune spell implementation if available
        if (this.spellSystem && this.spellSystem.spellImplementations.has('FrostRune')) {
            const frostRuneSpell = this.spellSystem.spellImplementations.get('FrostRune');
            frostRuneSpell.handleGuestFrostRuneApplied(data);
        } else {
            console.warn('Received frost rune applied but frost rune spell not available');
        }
    }
    
    getSpellStatistics() {
        return this.spellSystem ? this.spellSystem.getSpellStatistics() : null;
    }

    // Handle randomness seed from host (for GUEST)
    guest_handleRandomnessSeed(data) {
        const { seed } = data;
        if (seed) {
            this.randomnessManager.initializeFromSeed(seed);
            this.addCombatLog(`🎲 Battle randomness synchronized`, 'info');
        }
    }

    // Receive acknowledgment from guest (for HOST)
    receiveBattleAcknowledgment(ackData) {
        if (!this.isAuthoritative) return;
        
        const { type } = ackData;
        
        if (this.pendingAcks && this.pendingAcks[type]) {
            this.pendingAcks[type]();
        }
    }

    // GUEST: Handle turn start
    guest_handleTurnStart(data) {
        this.currentTurn = data.turn;
        this.addCombatLog(`📍 Turn ${this.currentTurn} begins`, 'info');
    }

    // GUEST: Handle creature action
    async guest_handleCreatureAction(data) {
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
        
        await Promise.all(shakePromises);
    }

    // GUEST: Handle combined turn execution
    async guest_handleCombinedTurnExecution(data) {
        const { playerAction, opponentAction, position } = data;
        
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
        
        this.clearAllTemporaryModifiers();
        
        this.sendAcknowledgment('turn_complete');
    }

    // GUEST: Handle actor action (creatures or heroes)
    async guest_handleActorAction(data) {
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
        
        await Promise.all(shakePromises);
    }

    // GUEST: Handle hero turn execution (reuse existing logic)
    async guest_handleHeroTurnExecution(data) {
        // This is essentially the same as guest_handleCombinedTurnExecution
        await this.guest_handleCombinedTurnExecution(data);
    }

    guest_handleNecromancyRevival(data) {
        if (this.necromancyManager) {
            this.necromancyManager.handleGuestNecromancyRevival(data);
        }
    }

    // Update guest hero displays
    updateGuestHeroDisplays(playerAction, opponentAction) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        
        const updateDisplay = (action, heroesObj) => {
            if (!action || !action.attackerData) return;
            
            const localSide = (action.attackerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const hero = heroesObj[action.attackerData.position];
            
            if (hero) {
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

    // GUEST: Handle damage applied
    guest_handleDamageApplied(data) {
        const { targetAbsoluteSide, targetPosition, damage, oldHp, newHp, maxHp, died, targetName } = data;
        
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const localTarget = targetLocalSide === 'player' 
            ? this.playerHeroes[targetPosition]
            : this.opponentHeroes[targetPosition];

        if (localTarget) {
            localTarget.currentHp = newHp;
            localTarget.alive = !died;
            
            this.addCombatLog(
                `💔 ${targetName} takes ${damage} damage! (${oldHp} → ${newHp} HP)`,
                targetLocalSide === 'player' ? 'error' : 'success'
            );

            this.updateHeroHealthBar(targetLocalSide, targetPosition, newHp, maxHp);
            this.animationManager.createDamageNumber(targetLocalSide, targetPosition, damage, maxHp, 'attack');
            
            if (died && oldHp > 0) {
                this.handleHeroDeath(localTarget);
            }
        }
    }

    // GUEST: Handle creature damage applied
    guest_handleCreatureDamageApplied(data) {
        const { heroAbsoluteSide, heroPosition, creatureIndex, damage, oldHp, newHp, maxHp, died, creatureName } = data;
        
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const localHero = heroLocalSide === 'player' 
            ? this.playerHeroes[heroPosition]
            : this.opponentHeroes[heroPosition];

        if (localHero && localHero.creatures[creatureIndex]) {
            const creature = localHero.creatures[creatureIndex];
            creature.currentHp = newHp;
            creature.alive = !died;
            
            this.addCombatLog(
                `💔 ${creatureName} takes ${damage} damage! (${oldHp} → ${newHp} HP)`,
                heroLocalSide === 'player' ? 'error' : 'success'
            );

            this.updateCreatureHealthBar(heroLocalSide, heroPosition, creatureIndex, newHp, maxHp);
            this.animationManager.createDamageNumberOnCreature(heroLocalSide, heroPosition, creatureIndex, damage, creature.maxHp, 'attack');
            
            if (died && oldHp > 0) {
                this.handleCreatureDeath(localHero, creature, creatureIndex, heroLocalSide, heroPosition);
            }
        }
    }

    // Guest handles battle pause notification
    guest_handleBattlePaused(data) {
        this.battlePaused = true;
        
        this.addCombatLog(`⏸️ Battle paused: ${data.reason}`, 'warning');
        this.addCombatLog('⏳ Host is waiting for stable connection...', 'info');
        
        this.showBattlePauseUI(data.reason || 'Connection issue');
    }

    // Guest handles battle resume notification
    guest_handleBattleResumed(data) {
        this.battlePaused = false;
        
        this.addCombatLog(`▶️ Battle resumed: ${data.reason}`, 'success');
        this.addCombatLog('⚔️ Battle continues...', 'info');
        
        this.hideBattlePauseUI();
    }

    // GUEST: Handle battle end
    async guest_handleBattleEnd(data) {
        this.battleActive = false;
        
        const { hostResult, guestResult, hostLives, guestLives, hostGold, guestGold, newTurn } = data;
        
        // 🔥 NEW: Update turn from the battle_end message BEFORE showing rewards
        if (newTurn && this.battleScreen && this.battleScreen.turnTracker) {
            this.battleScreen.turnTracker.setCurrentTurn(newTurn);
            console.log(`🎯 Guest updated turn to ${newTurn} from battle_end message`);
            
            // Reset ability tracking for the new turn
            if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
                window.heroSelection.heroAbilitiesManager.resetTurnBasedTracking();
                console.log('✅ Guest reset ability tracking after turn update');
            }
        }
        
        const myResult = this.isHost ? hostResult : guestResult;
        
        // Apply battle results first
        this.applyBattleResults(hostResult, guestResult, hostLives, guestLives, hostGold, guestGold);
        
        // Calculate and apply wealth bonuses for guest
        if (!this.isHost) {
            const myWealthBonus = this.calculateWealthBonus(this.playerHeroes);
            const opponentWealthBonus = this.calculateWealthBonus(this.opponentHeroes);
            
            if (myWealthBonus > 0) {
                this.goldManager.addPlayerGold(myWealthBonus);
            }
            
            if (opponentWealthBonus > 0) {
                this.goldManager.addOpponentGold(opponentWealthBonus);
            }
        }
        
        // ===== CLEAR POTION EFFECTS AFTER BATTLE (GUEST) =====
        if (window.potionHandler) {
            try {
                console.log('🧪 Guest clearing potion effects after battle...');
                window.potionHandler.clearPotionEffects();
                console.log('✅ Guest potion effects cleared successfully');
            } catch (error) {
                console.error('❌ Guest error clearing potion effects after battle:', error);
            }
        }
        
        if (window.heroSelection) {
            console.log('🥩 HOST: Clearing processed delayed artifact effects...');
            window.heroSelection.clearProcessedDelayedEffects();
        }
        
        const myMessage = this.getResultMessage(myResult);
        this.addCombatLog(myMessage, myResult === 'victory' ? 'success' : myResult === 'defeat' ? 'error' : 'info');
        
        await this.cleanupBattleState();
        
        await this.showBattleResult(myMessage);
        
        // Show rewards with the correct turn number (already updated above)
        if (this.battleScreen && this.battleScreen.showCardRewardsAndReturn) {
            setTimeout(() => {
                this.battleScreen.showCardRewardsAndReturn(myResult);
            }, 0);
        }
    }

    calculateWealthBonus(heroes) {
        let totalWealthBonus = 0;
        
        // Check each hero position
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && hero.hasAbility('Wealth')) {
                const wealthLevel = hero.getAbilityStackCount('Wealth');
                const bonusGold = wealthLevel * 4; // 4 gold per Wealth level
                totalWealthBonus += bonusGold;
            }
        });
        
        return totalWealthBonus;
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

    // Send acknowledgment to host
    sendAcknowledgment(ackType) {
        if (this.isAuthoritative) return;
        
        if (this.gameDataSender) {
            this.gameDataSender('battle_ack', {
                type: ackType,
                timestamp: Date.now()
            });
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
        const playerHeroesAlive = Object.values(this.playerHeroes).filter(hero => hero && hero.alive);
        const opponentHeroesAlive = Object.values(this.opponentHeroes).filter(hero => hero && hero.alive);
        
        const playerAlive = playerHeroesAlive.length > 0;
        const opponentAlive = opponentHeroesAlive.length > 0;
        
        return !playerAlive || !opponentAlive;
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

    // Send battle update to guest
    sendBattleUpdate(type, data) {
        if (!this.isAuthoritative) return;
        
        this.sendBattleData(type, data);
    }

    // Send battle data to opponent
    sendBattleData(type, data) {
        
        if (this.gameDataSender) {
            
            this.gameDataSender('battle_data', {
                type: type,
                data: data,
                timestamp: Date.now()
            });
            
        } else {
            console.error('❌ HOST: gameDataSender is not available!');
        }
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
            abilitiesUsed: this.abilitiesUsed,
            weatherEffects: this.weatherEffects,
            terrainModifiers: this.terrainModifiers,
            specialRules: this.specialRules,
            
            // Export randomness state
            randomnessState: this.randomnessManager.exportState(),
            
            // Export BattleLog state if available
            battleLogState: this.battleScreen && this.battleScreen.getBattleLogState ? 
                            this.battleScreen.getBattleLogState() : null
        };

        if (this.isAuthoritative) {
            baseState.connectionAware = {
                opponentConnected: this.opponentConnected,
                battlePaused: this.battlePaused,
                pauseStartTime: this.pauseStartTime,
                totalPauseTime: this.totalPauseTime
            };
        }

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

            // Restore randomness state
            if (stateData.randomnessState) {
                this.randomnessManager.importState(stateData.randomnessState);
            }

            // NEW: Restore BattleLog state
            if (stateData.battleLogState && this.battleScreen && this.battleScreen.restoreBattleLogState) {
                this.battleScreen.restoreBattleLogState(stateData.battleLogState);
                console.log('📜 BattleLog state restored');
            }

            if (stateData.spellSystemState && this.spellSystem) {
                this.spellSystem.importState(stateData.spellSystemState);
            }

            if (this.isAuthoritative && stateData.connectionAware) {
                this.battlePaused = stateData.connectionAware.battlePaused || false;
                this.totalPauseTime = stateData.connectionAware.totalPauseTime || 0;
                
                if (this.battlePaused) {
                    this.showBattlePauseUI('Battle was paused when restored');
                }
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
        
        this.battlePaused = false;
        this.pauseStartTime = null;
        this.totalPauseTime = 0;
        
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
        
        this.battlePaused = false;
        this.pauseStartTime = null;
        this.totalPauseTime = 0;
        
        if (this.connectionListener && this.roomManager && this.roomManager.getRoomRef()) {
            this.roomManager.getRoomRef().off('value', this.connectionListener);
            this.connectionListener = null;
        }
        
        this.hideBattlePauseUI();
        
        this.pendingAcks = {};
        Object.values(this.ackTimeouts).forEach(timeoutId => clearTimeout(timeoutId));
        this.ackTimeouts = {};
        this.connectionLatency = 100;
        
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


        if (this.necromancyManager) {
            this.necromancyManager.cleanup();
            this.necromancyManager = null;
        }

        // Cleanup Jiggles manager
        if (this.jigglesManager) {
            this.jigglesManager.cleanup();
            this.jigglesManager = null;
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
        
        if (this.persistenceManager) {
            this.persistenceManager.cleanup();
        }
        
        if (this.statusEffectsManager) {
            this.statusEffectsManager.cleanup();
            this.statusEffectsManager = null;
        }
        
        // NEW: Reset BattleLog through BattleScreen
        if (this.battleScreen && this.battleScreen.battleLog) {
            this.battleScreen.battleLog.clear();
        }
    }

    handleGuestReconnectionReady() {
        if (!this.isAuthoritative) return;
        
        console.log('✅ HOST: Guest signaled ready after reconnection');
        
        // Clear timeout
        if (this.reconnectionHandshakeTimeout) {
            clearTimeout(this.reconnectionHandshakeTimeout);
            this.reconnectionHandshakeTimeout = null;
        }
        
        // Add a small delay to ensure guest is fully ready (speed-adjusted)
        setTimeout(() => {
            if (this.opponentConnected && !this.checkBattleEnd()) {
                this.resumeBattle('Guest reconnected and ready');
            }
        }, this.getSpeedAdjustedDelay(500));
    }

    handleGuestReconnectionTimeout() {
        // If battle hasn't ended, resume anyway
        if (this.battleActive && !this.checkBattleEnd() && this.opponentConnected) {
            this.resumeBattle('Reconnection timeout - resuming battle');
        }
    }
}


export default BattleManager;

applyResistancePatches(BattleManager);
