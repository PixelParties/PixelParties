// battleManager.js - Complete Battle Manager with Hero Class, Abilities, and Firebase Persistence

import { getCardInfo } from './cardDatabase.js';
import { BattlePersistenceManager } from './battlePersistenceManager.js';
import { Hero } from './hero.js';

export class BattleManager {
    constructor() {
        this.battleActive = false;
        this.currentTurn = 0;
        this.playerHeroes = {};  // left, center, right - Now Hero instances
        this.opponentHeroes = {};  // left, center, right - Now Hero instances
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
    }

    // Initialize battle with formations, references, and abilities
    init(playerFormation, opponentFormation, gameDataSender, isHost, battleScreen, 
     lifeManager, goldManager, onBattleEnd, roomManager = null,
     playerAbilities = null, opponentAbilities = null,
     playerSpellbooks = null, opponentSpellbooks = null) {
        
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
        
        // Initialize heroes with full HP, abilities, and fresh visual state
        this.initializeHeroes();
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
                this.pauseBattle('Guest disconnected');
            } else if (!wasConnected && guestConnected && !this.guestReconnecting) {
                // Only resume if guest isn't in reconnection process
                this.resumeBattle('Guest reconnected');
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
                                    this.playerAbilities, this.playerSpellbooks, mySide);
        this.initializeHeroesForSide('opponent', this.opponentFormation, this.opponentHeroes, 
                                    this.opponentAbilities, this.opponentSpellbooks, opponentSide);
    }

    // Initialize heroes for a specific side
    initializeHeroesForSide(side, formation, heroesObj, abilities, spellbooks, absoluteSide) {
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
                
                heroesObj[position] = hero;
                
                this.resetHeroVisualState(side, position);
                this.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
                this.updateHeroAttackDisplay(side, position, hero);
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
        
        // Initialize extensible state
        this.initializeExtensibleState();
        
        // Re-initialize heroes to ensure fresh health/state
        this.initializeHeroes();
        
        this.addCombatLog('⚔️ Battle begins with Hero abilities active!', 'success');
        
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

    // Process turn for a specific position
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

        const playerTarget = playerCanAct ? this.authoritative_findTarget(position, 'player') : null;
        const opponentTarget = opponentCanAct ? this.authoritative_findTarget(position, 'opponent') : null;

        const playerDamage = this.calculateDamage(playerHero, playerCanAct);
        const opponentDamage = this.calculateDamage(opponentHero, opponentCanAct);

        const turnData = this.createTurnData(position, playerHero, playerTarget, playerDamage, 
                                            opponentHero, opponentTarget, opponentDamage);
        
        this.sendBattleUpdate('combined_turn_execution', turnData);

        const executionPromise = this.executeAttacksWithDamage(
            playerCanAct ? { hero: playerHero, target: playerTarget, damage: playerDamage } : null,
            opponentCanAct ? { hero: opponentHero, target: opponentTarget, damage: opponentDamage } : null
        );

        const ackPromise = this.waitForGuestAcknowledgment('turn_complete', this.getAdaptiveTimeout());

        await Promise.all([executionPromise, ackPromise]);
        
        this.clearTurnModifiers(playerHero, opponentHero, position);
        
        this.turnInProgress = false;
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

    // Create turn data object
    createTurnData(position, playerHero, playerTarget, playerDamage, 
                   opponentHero, opponentTarget, opponentDamage) {
        const createActionData = (hero, target, damage) => {
            if (!hero || !hero.alive) return null;
            
            return {
                attacker: position,
                target: target ? target.position : null,
                damage: damage,
                attackerData: {
                    absoluteSide: hero.absoluteSide,
                    position: hero.position,
                    name: hero.name,
                    abilities: hero.getAllAbilities()
                },
                targetData: target ? {
                    absoluteSide: target.absoluteSide,
                    position: target.position,
                    name: target.name
                } : null
            };
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

    // Combined attack execution with damage application
    async executeAttacksWithDamage(playerAttack, opponentAttack) {
        if (playerAttack && opponentAttack) {
            await this.animateSimultaneousAttacks(playerAttack.hero, opponentAttack.hero);
            
            this.applyAttackDamage(playerAttack);
            this.applyAttackDamage(opponentAttack);
            
            await Promise.all([
                this.animateReturn(playerAttack.hero, 'player'),
                this.animateReturn(opponentAttack.hero, 'opponent')
            ]);
            
        } else if (playerAttack || opponentAttack) {
            const attack = playerAttack || opponentAttack;
            const side = playerAttack ? 'player' : 'opponent';
            
            await this.animateFullAttack(attack.hero, attack.target);
            this.applyAttackDamage(attack);
            await this.animateReturn(attack.hero, side);
        }
    }

    // Apply damage from an attack
    applyAttackDamage(attack) {
        if (!attack || !attack.target) return;
        
        this.authoritative_applyDamage({
            target: attack.target,
            damage: attack.damage,
            newHp: Math.max(0, attack.target.currentHp - attack.damage),
            died: (attack.target.currentHp - attack.damage) <= 0
        });
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
        
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                delete this.pendingAcks[ackType];
                delete this.ackTimeouts[ackType];
                
                this.connectionLatency = Math.min(this.connectionLatency * 1.2, 500);
                resolve();
            }, timeout);
            
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

    // Find target for attacker
    authoritative_findTarget(attackerPosition, attackerSide) {
        if (!this.isAuthoritative) return null;

        const targets = attackerSide === 'player' ? this.opponentHeroes : this.playerHeroes;
        
        const aliveTargets = Object.values(targets).filter(hero => hero && hero.alive);
        if (aliveTargets.length === 0) return null;

        if (targets[attackerPosition] && targets[attackerPosition].alive) {
            return targets[attackerPosition];
        }

        switch (attackerPosition) {
            case 'left':
                if (targets.center && targets.center.alive) return targets.center;
                if (targets.right && targets.right.alive) return targets.right;
                break;
                
            case 'center':
                return aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
                
            case 'right':
                if (targets.center && targets.center.alive) return targets.center;
                if (targets.left && targets.left.alive) return targets.left;
                break;
        }
        
        return aliveTargets[0];
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
        if (this.isAuthoritative) {
            // Host receives guest's ready signal
            if (message.type === 'guest_reconnection_ready') {
                this.handleGuestReconnectionReady();
            }
            return;
        }

        const { type, data } = message;
        
        switch (type) {
            case 'turn_start':
                this.guest_handleTurnStart(data);
                break;
                
            case 'combined_turn_execution':
                this.guest_handleCombinedTurnExecution(data);
                break;
                
            case 'damage_applied':
                this.guest_handleDamageApplied(data);
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

    // GUEST: Handle combined turn execution
    async guest_handleCombinedTurnExecution(data) {
        const { playerAction, opponentAction, position } = data;
        
        this.updateGuestHeroDisplays(playerAction, opponentAction);
        
        if (playerAction && opponentAction) {
            this.addCombatLog(`💥 Both heroes attack simultaneously!`, 'warning');
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
            await this.animateSimultaneousAttacks(heroes.playerHero, heroes.opponentHero);
            await Promise.all([
                this.animateReturn(heroes.playerHero, heroes.playerLocalSide),
                this.animateReturn(heroes.opponentHero, heroes.opponentLocalSide)
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
        const targetLocalSide = (action.targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.addCombatLog(
            `⚔️ ${action.attackerData.name} attacks ${action.targetData.name}!`,
            attackerLocalSide === 'player' ? 'success' : 'error'
        );

        const localAttacker = attackerLocalSide === 'player' 
            ? this.playerHeroes[action.attackerData.position]
            : this.opponentHeroes[action.attackerData.position];

        const localTarget = targetLocalSide === 'player'
            ? this.playerHeroes[action.targetData.position]
            : this.opponentHeroes[action.targetData.position];

        if (localAttacker && localTarget) {
            await this.animateFullAttack(localAttacker, localTarget);
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
        
        const { hostResult, guestResult, hostLives, guestLives, hostGold, guestGold } = data;
        
        const myResult = this.isHost ? hostResult : guestResult;
        
        // Apply battle results first
        this.applyBattleResults(hostResult, guestResult, hostLives, guestLives, hostGold, guestGold);
        
        // Calculate and apply wealth bonuses for guest
        if (!this.isHost) {
            const myWealthBonus = this.calculateWealthBonus(this.playerHeroes);
            const opponentWealthBonus = this.calculateWealthBonus(this.opponentHeroes);
            
            if (myWealthBonus > 0) {
                this.goldManager.addPlayerGold(myWealthBonus);
                console.log(`Applied ${myWealthBonus} Wealth bonus gold for guest`);
            }
            
            if (opponentWealthBonus > 0) {
                this.goldManager.addOpponentGold(opponentWealthBonus);
                console.log(`Applied ${opponentWealthBonus} Wealth bonus gold for opponent`);
            }
        }
        
        const myMessage = this.getResultMessage(myResult);
        this.addCombatLog(myMessage, myResult === 'victory' ? 'success' : myResult === 'defeat' ? 'error' : 'info');
        
        await this.cleanupBattleState();
        
        await this.showBattleResult(myMessage);
        
        if (this.onBattleEnd) {
            this.onBattleEnd(myResult);
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
                
                console.log(`${hero.name} (${position}) has Wealth level ${wealthLevel} - adding ${bonusGold} bonus gold`);
            }
        });
        
        if (totalWealthBonus > 0) {
            console.log(`Total Wealth bonus: +${totalWealthBonus} gold`);
        }
        
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
        const deltaY = targetRect.top - attackerRect.top;
        
        attackerCard.classList.add('attacking');
        attackerCard.style.transition = 'transform 0.12s ease-out';
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

        card.style.transition = 'transform 0.08s ease-in-out';
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
            animation: collisionPulse 0.2s ease-out;
            z-index: 100;
        `;
        
        battleCenter.appendChild(effect);
        setTimeout(() => effect.remove(), 200);
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
            animation: impactPulse 0.15s ease-out;
            z-index: 100;
        `;
        
        targetElement.appendChild(effect);
        setTimeout(() => effect.remove(), 150);
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
            animation: floatUp 0.5s ease-out forwards;
        `;
        
        heroElement.appendChild(damageNumber);
        setTimeout(() => damageNumber.remove(), 500);
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
        // Don't end battle if guest is reconnecting
        if (this.isAuthoritative && this.guestReconnecting) {
            console.log('🛑 Delaying battle end check - guest is reconnecting');
            return false;
        }
        
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

            await this.clearBattleReadyStates();
            
            this.applyLifeChanges(hostResult);
            
            // Award gold with wealth bonuses
            const { hostGoldGain, guestGoldGain } = this.awardGold(hostResult, guestResult);
            
            await this.saveBattleStateToPersistence();
            
            const battleEndData = {
                hostResult,
                guestResult,
                hostLives: this.lifeManager ? this.lifeManager.getPlayerLives() : 10,
                guestLives: this.lifeManager ? this.lifeManager.getOpponentLives() : 10,
                hostGold: this.goldManager ? this.goldManager.getPlayerGold() : 0,
                guestGold: this.goldManager ? this.goldManager.getOpponentGold() : 0
            };
            
            this.sendBattleUpdate('battle_end', battleEndData);
            
            const hostMessage = this.getResultMessage(hostResult);
            this.addCombatLog(hostMessage, hostResult === 'victory' ? 'success' : hostResult === 'defeat' ? 'error' : 'info');
            await this.showBattleResult(hostMessage);
            
            await this.cleanupAfterBattle();
            
            if (this.onBattleEnd) {
                this.onBattleEnd(hostResult);
            }
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
                    battleStartTime: null,
                    hostBattleReadyTime: null,
                    guestBattleReadyTime: null
                });
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
        let hostGoldGain = 0, guestGoldGain = 0;
        
        // Calculate wealth bonuses for each player (moved outside goldManager check)
        const hostWealthBonus = this.calculateWealthBonus(this.playerHeroes); // Host is "player" side
        const guestWealthBonus = this.calculateWealthBonus(this.opponentHeroes); // Guest is "opponent" side
        
        if (this.goldManager) {
            // Calculate base gold (existing system)
            const baseHostGold = this.goldManager.awardBattleGold(hostResult);
            const baseGuestGold = this.goldManager.awardOpponentBattleGold(guestResult);
            
            // Apply wealth bonuses
            if (hostWealthBonus > 0) {
                this.goldManager.addPlayerGold(hostWealthBonus);
                console.log(`Host earned ${hostWealthBonus} bonus gold from Wealth abilities`);
            }
            
            if (guestWealthBonus > 0) {
                this.goldManager.addOpponentGold(guestWealthBonus);
                console.log(`Guest earned ${guestWealthBonus} bonus gold from Wealth abilities`);
            }
            
            hostGoldGain = baseHostGold + hostWealthBonus;
            guestGoldGain = baseGuestGold + guestWealthBonus;
            
            // Log total gold gained
            console.log(`Host total gold gain: ${baseHostGold} (base) + ${hostWealthBonus} (wealth) = ${hostGoldGain}`);
            console.log(`Guest total gold gain: ${baseGuestGold} (base) + ${guestWealthBonus} (wealth) = ${guestGoldGain}`);
        }
        
        // Add combat log messages for wealth bonuses (now variables are in scope)
        this.addWealthBonusLogMessage(
            this.isHost ? hostWealthBonus : guestWealthBonus,
            this.isHost ? guestWealthBonus : hostWealthBonus
        );
        
        return { hostGoldGain, guestGoldGain };
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
                
                await this.roomManager.getRoomRef().child('gameState').update({
                    battleStarted: false,
                    battleActive: false,
                    lastBattleStateUpdate: null
                });
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
            animation: fadeIn 0.3s ease-out;
        `;
        
        document.body.appendChild(resultOverlay);
        
        await this.delay(1000);
        
        resultOverlay.style.animation = 'fadeOut 0.3s ease-out';
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
            }
            if (this.opponentHeroes[position]) {
                const hero = this.opponentHeroes[position];
                this.updateHeroHealthBar('opponent', position, hero.currentHp, hero.maxHp);
                this.updateHeroAttackDisplay('opponent', position, hero);
                if (!hero.alive) {
                    this.handleHeroDeath(hero);
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
        return new Promise(resolve => setTimeout(resolve, ms));
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


    //Handshake stuff for safe guest reconnection
    async handleGuestReconnecting() {
        if (!this.isAuthoritative) return;
        
        console.log('🤝 HOST: Guest is reconnecting, keeping battle paused...');
        this.guestReconnecting = true;
        this.guestReconnectionReady = false;
        
        // Keep battle paused
        if (!this.battlePaused) {
            this.pauseBattle('Guest is reconnecting');
        }
        
        // Set a timeout for reconnection (30 seconds)
        if (this.reconnectionHandshakeTimeout) {
            clearTimeout(this.reconnectionHandshakeTimeout);
        }
        
        this.reconnectionHandshakeTimeout = setTimeout(() => {
            console.log('⏱️ HOST: Guest reconnection timeout - resuming battle');
            this.guestReconnecting = false;
            this.handleGuestReconnectionTimeout();
        }, 30000);
    }

    handleGuestReconnectionReady() {
        if (!this.isAuthoritative) return;
        
        console.log('✅ HOST: Guest signaled ready after reconnection');
        this.guestReconnecting = false;
        this.guestReconnectionReady = true;
        
        // Clear timeout
        if (this.reconnectionHandshakeTimeout) {
            clearTimeout(this.reconnectionHandshakeTimeout);
            this.reconnectionHandshakeTimeout = null;
        }
        
        // Add a small delay to ensure guest is fully ready
        setTimeout(() => {
            if (this.opponentConnected && !this.checkBattleEnd()) {
                this.resumeBattle('Guest reconnected and ready');
            }
        }, 500);
    }

    handleGuestReconnectionTimeout() {
        // If battle hasn't ended, resume anyway
        if (this.battleActive && !this.checkBattleEnd() && this.opponentConnected) {
            this.resumeBattle('Reconnection timeout - resuming battle');
        }
    }
}

// Add required CSS animations
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