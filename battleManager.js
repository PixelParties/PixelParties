// battleManager.js - Complete Battle Manager with Hero Class, Abilities, Creatures, and Firebase Persistence

import { getCardInfo } from './cardDatabase.js';
import { BattlePersistenceManager } from './battlePersistenceManager.js';
import { Hero } from './hero.js';
import { BattleSpeedManager } from './battleSpeedManager.js';

import { NecromancyManager } from './Abilities/necromancy.js';

import JigglesCreature from './Creatures/jiggles.js';


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

        this.tabWasHidden = false;
        this.setupTabVisibilityListener();
    }

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
                            alive: true
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
        this.battleLog = [];
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
        
        // ADD: Initialize Jiggles manager
        this.jigglesManager = new JigglesCreature(this);
        
        this.addCombatLog('⚔️ Battle begins with Hero abilities and creatures!', 'success');
        
        // Log any SummoningMagic bonuses applied to creatures
        this.logSummoningMagicBonuses();
        
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
                actions.push(this.shakeCreature('player', position, playerActor.index));
                this.addCombatLog(`🌟 ${playerActor.name} activates!`, 'success');
            }
        }
        
        if (opponentActor && opponentActor.type === 'creature') {
            if (JigglesCreature.isJiggles(opponentActor.name)) {
                // Don't await yet - add to actions array
                actions.push(this.jigglesManager.executeSpecialAttack(opponentActor, position));
                hasJigglesAttacks = true;
            } else {
                actions.push(this.shakeCreature('opponent', position, opponentActor.index));
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
    }

    async executeHeroActions(playerHeroActor, opponentHeroActor, position) {
        const playerCanAttack = playerHeroActor !== null;
        const opponentCanAttack = opponentHeroActor !== null;
        
        const playerTarget = playerCanAttack ? 
            this.authoritative_findTargetWithCreatures(position, 'player') : null;
        const opponentTarget = opponentCanAttack ? 
            this.authoritative_findTargetWithCreatures(position, 'opponent') : null;
        
        // ADD THIS: Check if targets are valid before proceeding
        const playerValidAttack = playerCanAttack && playerTarget;
        const opponentValidAttack = opponentCanAttack && opponentTarget;
        
        // If no valid attacks can be made, skip animation
        if (!playerValidAttack && !opponentValidAttack) {
            this.addCombatLog('💨 No valid targets remain for hero attacks!', 'info');
            return;
        }
        
        const playerDamage = playerValidAttack ? 
            this.calculateDamage(playerHeroActor.data, true) : 0;
        const opponentDamage = opponentValidAttack ? 
            this.calculateDamage(opponentHeroActor.data, true) : 0;
        
        const turnData = this.createTurnDataWithCreatures(
            position, 
            playerHeroActor?.data, playerTarget, playerDamage,
            opponentHeroActor?.data, opponentTarget, opponentDamage
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

    // Execute creature actions (shake animations)
    async executeCreatureActions(playerCreature, opponentCreature, position) {
        const shakePromises = [];
        
        if (playerCreature) {
            const playerIndex = this.playerHeroes[position].creatures.indexOf(playerCreature);
            shakePromises.push(this.shakeCreature('player', position, playerIndex));
            this.addCombatLog(`🌟 ${playerCreature.name} activates!`, 'success');
        }
        
        if (opponentCreature) {
            const opponentIndex = this.opponentHeroes[position].creatures.indexOf(opponentCreature);
            shakePromises.push(this.shakeCreature('opponent', position, opponentIndex));
            this.addCombatLog(`🌟 ${opponentCreature.name} activates!`, 'error');
        }
        
        await Promise.all(shakePromises);
    }

    // Shake creature animation
    async shakeCreature(side, position, creatureIndex) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;
        
        creatureElement.classList.add('creature-shaking');
        
        // Add glow effect during shake
        creatureElement.style.filter = 'brightness(1.5) drop-shadow(0 0 10px rgba(255, 255, 100, 0.8))';
        
        await this.delay(400); // Now uses speed-adjusted delay
        
        creatureElement.classList.remove('creature-shaking');
        creatureElement.style.filter = '';
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
                const randomTargetHero = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
                const randomTarget = getTargetForPosition(randomTargetHero.position);
                if (randomTarget) return randomTarget;
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
            await this.animateSimultaneousHeroAttacks(playerAttack, opponentAttack);
            
            this.applyAttackDamageToTarget(playerAttack);
            this.applyAttackDamageToTarget(opponentAttack);
            
            await Promise.all([
                this.animateReturn(playerAttack.hero, 'player'),
                this.animateReturn(opponentAttack.hero, 'opponent')
            ]);
            
        } else if (playerAttack || opponentAttack) {
            const attack = playerAttack || opponentAttack;
            const side = playerAttack ? 'player' : 'opponent';
            
            await this.animateHeroAttack(attack.hero, attack.target);
            this.applyAttackDamageToTarget(attack);
            await this.animateReturn(attack.hero, side);
        }
    }

    // Animate simultaneous hero attacks
    async animateCollisionAttackTowards(attacker, targetElement, attackerSide) {
        const attackerElement = this.getHeroElement(attackerSide, attacker.position);
        if (!attackerElement || !targetElement) return;

        const attackerCard = attackerElement.querySelector('.battle-hero-card');
        if (!attackerCard) return;

        const attackerRect = attackerElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const deltaX = (targetRect.left - attackerRect.left) * 0.5;
        const deltaY = (targetRect.top - attackerRect.top) * 0.5;
        
        attackerCard.classList.add('attacking');
        attackerCard.style.transition = `transform ${this.getSpeedAdjustedDelay(80)}ms ease-out`;
        attackerCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
        
        await this.delay(80);
        this.createCollisionEffect();
    }

    // Animate simultaneous hero attacks
    async animateSimultaneousHeroAttacks(playerAttack, opponentAttack) {
        const animations = [];
        
        // Player attack animation
        if (playerAttack.target.type === 'creature') {
            animations.push(this.animateHeroToCreatureAttack(playerAttack.hero, playerAttack.target, 'player'));
        } else {
            animations.push(this.animateCollisionAttackTowards(playerAttack.hero, 
                this.getHeroElement(playerAttack.target.side, playerAttack.target.position), 'player'));
        }
        
        // Opponent attack animation
        if (opponentAttack.target.type === 'creature') {
            animations.push(this.animateHeroToCreatureAttack(opponentAttack.hero, opponentAttack.target, 'opponent'));
        } else {
            animations.push(this.animateCollisionAttackTowards(opponentAttack.hero, 
                this.getHeroElement(opponentAttack.target.side, opponentAttack.target.position), 'opponent'));
        }
        
        await Promise.all(animations);
    }

    // Animate hero attack (single)
    async animateHeroAttack(hero, target) {
        // Safety check for null target
        if (!target) {
            console.warn('animateHeroAttack called with null target, skipping animation');
            return;
        }
        
        if (target.type === 'creature') {
            await this.animateHeroToCreatureAttack(hero, target, hero.side);
        } else {
            await this.animateFullAttack(hero, target.hero);
        }
    }

    // Animate hero attacking a creature
    async animateHeroToCreatureAttack(hero, creatureTarget, heroSide) {
        const heroElement = this.getHeroElement(heroSide, hero.position);
        const creatureElement = document.querySelector(
            `.${creatureTarget.side}-slot.${creatureTarget.position}-slot .creature-icon[data-creature-index="${creatureTarget.creatureIndex}"]`
        );
        
        if (!heroElement || !creatureElement) return;
        
        const heroCard = heroElement.querySelector('.battle-hero-card');
        if (!heroCard) return;
        
        const heroRect = heroElement.getBoundingClientRect();
        const creatureRect = creatureElement.getBoundingClientRect();
        
        const deltaX = creatureRect.left + creatureRect.width/2 - (heroRect.left + heroRect.width/2);
        const deltaY = creatureRect.top + creatureRect.height/2 - (heroRect.top + heroRect.height/2);
            
        heroCard.classList.add('attacking');
        heroCard.style.transition = `transform ${this.getSpeedAdjustedDelay(120)}ms ease-out`;
        heroCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.2)`;
        
        await this.delay(120);
        this.createImpactEffect(creatureElement);
    }

    // Apply damage to target (hero or creature)
    applyAttackDamageToTarget(attack) {
        if (!attack || !attack.target) return;
        
        if (attack.target.type === 'creature') {
            // Apply damage to creature
            this.authoritative_applyDamageToCreature({
                hero: attack.target.hero,
                creature: attack.target.creature,
                creatureIndex: attack.target.creatureIndex,
                damage: attack.damage,
                position: attack.target.position,
                side: attack.target.side
            });
        } else {
            // Apply damage to hero
            this.authoritative_applyDamage({
                target: attack.target.hero,
                damage: attack.damage,
                newHp: Math.max(0, attack.target.hero.currentHp - attack.damage),
                died: (attack.target.hero.currentHp - attack.damage) <= 0
            });
        }
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
        this.createDamageNumberOnCreature(side, position, creatureIndex, damage);
        
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

    // Create damage number on creature
    createDamageNumberOnCreature(side, position, creatureIndex, damage) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;
        
        const damageNumber = document.createElement('div');
        damageNumber.className = 'damage-number';
        damageNumber.textContent = `-${damage}`;
        damageNumber.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            font-weight: bold;
            color: #ff3333;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            z-index: 200;
            pointer-events: none;
            animation: floatUp ${this.getSpeedAdjustedDelay(500)}ms ease-out forwards;
        `;
        
        creatureElement.appendChild(damageNumber);
        setTimeout(() => damageNumber.remove(), this.getSpeedAdjustedDelay(500));
    }

    // Handle creature death
    handleCreatureDeath(hero, creature, creatureIndex, side, position) {
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
        const adjustedTimeout = this.getSpeedAdjustedDelay(timeout);
        
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
        this.createDamageNumber(target.side, target.position, damage);
        
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

    // Receive battle data from host (for GUEST)
    receiveBattleData(message) {        
        // Handle host-specific messages first
        if (this.isAuthoritative) {
            if (message.type === 'guest_reconnection_ready') {
                this.handleGuestReconnectionReady();
            }
            // Don't return early - let host process other messages too if needed
            return;
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
                
            case 'necromancy_revival':
                this.guest_handleNecromancyRevival(data);
                break;
                
            // ADD: Handle Jiggles special attack
            case 'jiggles_special_attack':
                if (this.jigglesManager) {
                    this.jigglesManager.handleGuestSpecialAttack(data);
                }
                break;
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
            shakePromises.push(this.shakeCreature('player', position, playerCreature.index));
            this.addCombatLog(`🌟 ${playerCreature.name} activates!`, 'success');
        }
        
        if (opponentCreature) {
            shakePromises.push(this.shakeCreature('opponent', position, opponentCreature.index));
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
            shakePromises.push(this.shakeCreature('player', position, playerActor.index));
            this.addCombatLog(`🌟 ${playerActor.name} activates!`, 'success');
        }
        
        if (opponentActor && opponentActor.type === 'creature') {
            shakePromises.push(this.shakeCreature('opponent', position, opponentActor.index));
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
                animations.push(this.guest_animateHeroToCreatureAttack(
                    heroes.playerHero, playerAction.targetData, heroes.playerLocalSide
                ));
            } else {
                animations.push(this.animateCollisionAttackTowards(
                    heroes.playerHero, 
                    this.getHeroElement(heroes.opponentLocalSide, opponentAction.targetData.position),
                    heroes.playerLocalSide
                ));
            }
            
            if (opponentTargetsCreature) {
                animations.push(this.guest_animateHeroToCreatureAttack(
                    heroes.opponentHero, opponentAction.targetData, heroes.opponentLocalSide
                ));
            } else {
                animations.push(this.animateCollisionAttackTowards(
                    heroes.opponentHero,
                    this.getHeroElement(heroes.playerLocalSide, playerAction.targetData.position),
                    heroes.opponentLocalSide
                ));
            }
            
            await Promise.all(animations);
            
            await Promise.all([
                this.animateReturn(heroes.playerHero, heroes.playerLocalSide),
                this.animateReturn(heroes.opponentHero, heroes.opponentLocalSide)
            ]);
        }
    }

    // GUEST: Animate hero to creature attack
    async guest_animateHeroToCreatureAttack(hero, targetData, heroSide) {
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const heroElement = this.getHeroElement(heroSide, hero.position);
        const creatureElement = document.querySelector(
            `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
        );
        
        if (!heroElement || !creatureElement) return;
        
        const heroCard = heroElement.querySelector('.battle-hero-card');
        if (!heroCard) return;
        
        const heroRect = heroElement.getBoundingClientRect();
        const creatureRect = creatureElement.getBoundingClientRect();
        
        const deltaX = creatureRect.left + creatureRect.width/2 - (heroRect.left + heroRect.width/2);
        const deltaY = creatureRect.top + creatureRect.height/2 - (heroRect.top + heroRect.height/2);
        
        heroCard.classList.add('attacking');
        heroCard.style.transition = 'transform 0.12s ease-out';
        heroCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.2)`;
        
        await this.delay(120);
        this.createImpactEffect(creatureElement);
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
                await this.guest_animateHeroToCreatureAttack(localAttacker, action.targetData, attackerLocalSide);
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
            
            await this.animateReturn(localAttacker, attackerLocalSide);
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
            this.createDamageNumber(targetLocalSide, targetPosition, damage);
            
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
            this.createDamageNumberOnCreature(heroLocalSide, heroPosition, creatureIndex, damage);
            
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
        
        if (this.goldManager && hostGold !== undefined && guestGold !== undefined) {
            if (this.isHost) {
                this.goldManager.setPlayerGold(hostGold);
                this.goldManager.setOpponentGold(guestGold);
            } else {
                this.goldManager.setPlayerGold(guestGold);
                this.goldManager.setOpponentGold(hostGold);
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

    // ANIMATION METHODS

    // Animate collision attacks
    async animateSimultaneousAttacks(playerHero, opponentHero) {
        const playerElement = this.getHeroElement('player', playerHero.position);
        const opponentElement = this.getHeroElement('opponent', opponentHero.position);
        
        if (!playerElement || !opponentElement) {
            console.error('Could not find hero elements for collision animation');
            return;
        }

        const animations = [
            this.animateCollisionAttackTowards(playerHero, opponentElement, 'player'),
            this.animateCollisionAttackTowards(opponentHero, playerElement, 'opponent')
        ];
        
        await Promise.all(animations);
    }

    // Animate collision attack towards target
    async animateCollisionAttackTowards(attacker, targetElement, attackerSide) {
        const attackerElement = this.getHeroElement(attackerSide, attacker.position);
        if (!attackerElement || !targetElement) return;

        const attackerCard = attackerElement.querySelector('.battle-hero-card');
        if (!attackerCard) return;

        const attackerRect = attackerElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const deltaX = (targetRect.left - attackerRect.left) * 0.5;
        const deltaY = (targetRect.top - attackerRect.top) * 0.5;
        
        attackerCard.classList.add('attacking');
        attackerCard.style.transition = 'transform 0.08s ease-out';
        attackerCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
        
        await this.delay(80);
        this.createCollisionEffect();
    }

    // Animate full attack to target
    async animateFullAttack(attacker, target) {
        const attackerElement = this.getHeroElement(attacker.side, attacker.position);
        const targetElement = this.getHeroElement(target.side, target.position);
        
        if (!attackerElement || !targetElement) {
            console.error(`Could not find elements for attack: ${attacker.name} -> ${target.name}`);
            return;
        }

        const attackerCard = attackerElement.querySelector('.battle-hero-card');
        if (!attackerCard) return;

        const attackerRect = attackerElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const deltaX = targetRect.left - attackerRect.left;
        const deltaY = targetRect.top - targetRect.top;
        
        attackerCard.classList.add('attacking');
        attackerCard.style.transition = `transform ${this.getSpeedAdjustedDelay(120)}ms ease-out`;
        attackerCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.2)`;
        
        await this.delay(120);
        this.createImpactEffect(targetElement);
    }

    // Animate return to position
    async animateReturn(hero, side) {
        const heroElement = this.getHeroElement(side, hero.position);
        if (!heroElement) return;

        const card = heroElement.querySelector('.battle-hero-card');
        if (!card) return;

        card.style.transition = `transform ${this.getSpeedAdjustedDelay(80)}ms ease-in-out`;
        card.style.transform = 'translate(0, 0) scale(1)';
        card.classList.remove('attacking');
        
        await this.delay(80);
    }

    // Create collision effect in battlefield center
    createCollisionEffect() {
        const battleCenter = document.querySelector('.battle-effects-area');
        if (!battleCenter) return;

        const effect = document.createElement('div');
        effect.className = 'collision-effect';
        effect.innerHTML = '💥';
        effect.style.cssText = `
            position: absolute;
            font-size: 48px;
            animation: collisionPulse ${this.getSpeedAdjustedDelay(200)}ms ease-out;
            z-index: 100;
        `;
        
        battleCenter.appendChild(effect);
        setTimeout(() => effect.remove(), this.getSpeedAdjustedDelay(200));
    }

    // Create impact effect on target
    createImpactEffect(targetElement) {
        const effect = document.createElement('div');
        effect.className = 'impact-effect';
        effect.innerHTML = '💥';
        effect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 36px;
            animation: impactPulse ${this.getSpeedAdjustedDelay(150)}ms ease-out;
            z-index: 100;
        `;
        
        targetElement.appendChild(effect);
        setTimeout(() => effect.remove(), this.getSpeedAdjustedDelay(150));
    }

    // Handle hero death
    handleHeroDeath(hero) {
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

    // Create floating damage number
    createDamageNumber(side, position, damage) {
        const heroElement = this.getHeroElement(side, position);
        if (!heroElement) return;

        const damageNumber = document.createElement('div');
        damageNumber.className = 'damage-number';
        damageNumber.textContent = `-${damage}`;
        damageNumber.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 45px;
            font-weight: bold;
            color: #ff3333;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            z-index: 200;
            pointer-events: none;
            animation: floatUp ${this.getSpeedAdjustedDelay(500)}ms ease-out forwards;
        `;
        
        heroElement.appendChild(damageNumber);
        setTimeout(() => damageNumber.remove(), this.getSpeedAdjustedDelay(500));
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
            
            // 🔥 NEW: INCREMENT TURN BEFORE SENDING BATTLE_END MESSAGE
            let newTurn = 1;
            if (this.battleScreen && this.battleScreen.turnTracker) {
                newTurn = await this.battleScreen.turnTracker.incrementTurn();
                
                // Reset ability tracking for the new turn
                if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
                    window.heroSelection.heroAbilitiesManager.resetTurnBasedTracking();
                    console.log('✅ Reset ability tracking after turn increment');
                }
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

    // Add message to combat log
    addCombatLog(message, type = 'info') {
        this.battleLog.push({ message, type, timestamp: Date.now() });
        
        if (this.battleScreen && this.battleScreen.addCombatLogMessage) {
            this.battleScreen.addCombatLogMessage(message, type);
        }
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

    // Export battle state for persistence
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
            specialRules: this.specialRules
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

    // Restore battle state from persistence data
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
        ['left', 'center', 'right'].forEach(position => {
            if (this.playerHeroes[position]) {
                const hero = this.playerHeroes[position];
                this.updateHeroHealthBar('player', position, hero.currentHp, hero.maxHp);
                this.updateHeroAttackDisplay('player', position, hero);
                if (!hero.alive) {
                    this.handleHeroDeath(hero);
                }
                // Update creature visuals
                this.updateCreatureVisuals('player', position, hero.creatures);

                if (this.necromancyManager) {
                    this.necromancyManager.updateNecromancyDisplayForHeroWithCreatures('player', position, hero);
                }
            }
            if (this.opponentHeroes[position]) {
                const hero = this.opponentHeroes[position];
                this.updateHeroHealthBar('opponent', position, hero.currentHp, hero.maxHp);
                this.updateHeroAttackDisplay('opponent', position, hero);
                if (!hero.alive) {
                    this.handleHeroDeath(hero);
                }
                // Update creature visuals
                this.updateCreatureVisuals('opponent', position, hero.creatures);

                if (this.necromancyManager) {
                    this.necromancyManager.updateNecromancyDisplayForHeroWithCreatures('player', position, hero);
                }
            }
        });
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

    // Reset battle manager
    reset() {
        this.battleActive = false;
        this.currentTurn = 0;
        this.battleLog = [];
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

        if (this.necromancyManager) {
            this.necromancyManager.cleanup();
            this.necromancyManager = null;
        }

        // ADD: Cleanup Jiggles manager
        if (this.jigglesManager) {
            this.jigglesManager.cleanup();
            this.jigglesManager = null;
        }

        this.clearVisualEffects();
        
        if (this.persistenceManager) {
            this.persistenceManager.cleanup();
        }
    }


    // Clear all visual effects
    clearVisualEffects() {
        const battleCenter = document.querySelector('.battle-effects-area');
        if (battleCenter) {
            const effects = battleCenter.querySelectorAll('.collision-effect, .impact-effect');
            effects.forEach(effect => effect.remove());
        }
        
        const damageNumbers = document.querySelectorAll('.damage-number');
        damageNumbers.forEach(number => number.remove());
        
        const resultOverlays = document.querySelectorAll('.battle-result-overlay');
        resultOverlays.forEach(overlay => overlay.remove());
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

// Add required CSS animations and creature styles
const style = document.createElement('style');
style.textContent = `
    @keyframes collisionPulse {
        0% { transform: scale(0) rotate(0deg); opacity: 1; }
        100% { transform: scale(2) rotate(180deg); opacity: 0; }
    }
    
    @keyframes impactPulse {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes floatUp {
        0% {
            transform: translate(-50%, -50%);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -150%);
            opacity: 0;
        }
    }
    
    @keyframes creatureShake {
        0%, 100% { transform: translateX(0); }
        10% { transform: translateX(-2px) rotate(-5deg); }
        20% { transform: translateX(2px) rotate(5deg); }
        30% { transform: translateX(-2px) rotate(-5deg); }
        40% { transform: translateX(2px) rotate(5deg); }
        50% { transform: translateX(-2px) rotate(-5deg); }
        60% { transform: translateX(2px) rotate(5deg); }
        70% { transform: translateX(-1px) rotate(-2deg); }
        80% { transform: translateX(1px) rotate(2deg); }
        90% { transform: translateX(-1px) rotate(-2deg); }
    }
    
    .creature-shaking {
        animation: creatureShake 0.4s ease-in-out;
        z-index: 100;
    }
    
    .creature-health-bar {
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 30px;
        height: 4px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .creature-health-fill {
        height: 100%;
        background: linear-gradient(90deg, #4caf50 0%, #66bb6a 100%);
        transition: width 0.3s ease;
    }
    
    .creature-hp-text {
        position: absolute;
        bottom: -15px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 9px;
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        white-space: nowrap;
    }
    
    .creature-icon.defeated {
        opacity: 0.6;
    }
    
    .creature-icon.defeated .creature-sprite {
        filter: grayscale(100%);
        opacity: 0.5;
    }
    
    .battle-hero-card.attacking {
        z-index: 50 !important;
    }
    
    .battle-hero-card.defeated {
        animation: heroDefeat 0.5s ease-out forwards;
    }
    
    .health-bar {
        position: relative;
    }
    
    .battle-result-overlay .battle-result-message {
        font-size: 48px;
        font-weight: bold;
        color: white;
        text-align: center;
        padding: 40px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    }
`;
document.head.appendChild(style);

export default BattleManager;
