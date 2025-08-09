// battleNetworkManager.js - Handles all network communication for battles

export class BattleNetworkManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        // Connection state
        this.opponentConnected = true;
        this.battlePaused = false;
        this.guestReconnecting = false;
        this.pauseStartTime = null;
        this.totalPauseTime = 0;
        this.connectionListener = null;
        this.reconnectionHandshakeTimeout = null;
        this.tabWasHidden = false;

        this.swapMessageQueue = [];
        this.isProcessingSwaps = false;
        this.lastSwapProcessTime = 0;
        this.minSwapInterval = 300;
        this.maxQueueSize = 20; 
        
        // Acknowledgment system
        this.pendingAcks = {};
        this.ackTimeouts = {};
        this.connectionLatency = 100;
        
        this.setupTabVisibilityListener();
    }

    // ============================================
    // SWAP HANDLING
    // ============================================
    
    queueSwapMessage(messageType, data) {
        // Prevent queue overflow
        if (this.swapMessageQueue.length >= this.maxQueueSize) {
            console.warn('⚠️ Swap message queue is full, dropping oldest message');
            this.swapMessageQueue.shift();
        }
        
        this.swapMessageQueue.push({ 
            type: messageType, 
            data, 
            timestamp: Date.now(),
            id: data.swapId || `swap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        });
        
        console.log(`📋 Queued ${messageType} (Queue size: ${this.swapMessageQueue.length})`);
        this.processSwapQueue();
    }

    async processSwapQueue() {
        if (this.isProcessingSwaps || this.swapMessageQueue.length === 0) {
            return;
        }

        this.isProcessingSwaps = true;
        console.log(`🔄 Processing ${this.swapMessageQueue.length} queued swap messages...`);

        while (this.swapMessageQueue.length > 0) {
            const message = this.swapMessageQueue.shift();
            const now = Date.now();
            
            // Ensure minimum interval between swaps for visual clarity
            const timeSinceLastSwap = now - this.lastSwapProcessTime;
            if (timeSinceLastSwap < this.minSwapInterval) {
                const waitTime = this.minSwapInterval - timeSinceLastSwap;
                console.log(`⏱️ Waiting ${waitTime}ms before next swap to prevent visual overlap`);
                await this.battleManager.delay(waitTime);
            }

            // Process the swap message
            console.log(`🎬 Processing ${message.type} (ID: ${message.id})`);
            await this.handleSwapMessage(message);
            this.lastSwapProcessTime = Date.now();
            
            // Small delay between messages for stability
            await this.battleManager.delay(50);
        }

        this.isProcessingSwaps = false;
        console.log('✅ All swap messages processed');
    }

    async handleSwapMessage(message) {
        const bm = this.battleManager;
        
        try {
            switch (message.type) {
                case 'crusader_hookshot_swap':
                    if (bm.crusaderArtifactsHandler) {
                        await bm.crusaderArtifactsHandler.handleGuestHookshotSwap(message.data);
                    }
                    break;
                    
                case 'stormblade_wind_swap':
                    if (bm.attackEffectsManager && bm.attackEffectsManager.stormbladeEffect) {
                        await bm.attackEffectsManager.stormbladeEffect.handleGuestWindSwap(message.data);
                    }
                    break;
                    
                default:
                    console.warn(`Unknown swap message type: ${message.type}`);
            }
        } catch (error) {
            console.error(`❌ Error processing ${message.type}:`, error);
        }
    }

    clearSwapQueue() {
        this.swapMessageQueue = [];
        this.isProcessingSwaps = false;
        this.lastSwapProcessTime = 0;
        console.log('🧹 Swap message queue cleared');
    }

    getSwapQueueStatus() {
        return {
            queueLength: this.swapMessageQueue.length,
            isProcessing: this.isProcessingSwaps,
            lastProcessTime: this.lastSwapProcessTime,
            nextMessages: this.swapMessageQueue.slice(0, 3).map(m => ({
                type: m.type,
                id: m.id,
                timestamp: m.timestamp
            }))
        };
    }


    // ============================================
    // CONNECTION MONITORING
    // ============================================

    setupTabVisibilityListener() {
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.tabWasHidden = true;
                } else if (this.tabWasHidden) {
                    this.tabWasHidden = false;
                    // Clear any stuck pause overlays after a brief delay
                    setTimeout(() => {
                        if (this.opponentConnected && this.battlePaused) {
                            this.resumeBattle('Tab visibility restored');
                        }
                    }, this.getSpeedAdjustedDelay(1000));
                }
            });
        }
    }

    setupOpponentConnectionMonitoring() {
        const bm = this.battleManager;
        if (!bm.roomManager || !bm.roomManager.getRoomRef()) {
            return;
        }

        const roomRef = bm.roomManager.getRoomRef();
        
        this.connectionListener = roomRef.on('value', (snapshot) => {
            const room = snapshot.val();
            if (!room) return;

            const guestOnline = room.guestOnline || false;
            const guestConnected = room.guest && guestOnline;
            const guestReconnecting = room.guestReconnecting || false;
            
            const wasConnected = this.opponentConnected;
            this.opponentConnected = guestConnected;
            
            // Check if guest is reconnecting
            if (guestReconnecting && !this.guestReconnecting) {
                this.handleGuestReconnecting();
                return;
            }
            
            if (wasConnected && !guestConnected) {
                // Don't pause immediately if this might be a tab switch
                if (this.tabWasHidden) {
                    console.log('Opponent appears disconnected but our tab was hidden - waiting before pausing');
                    setTimeout(() => {
                        if (!this.opponentConnected && bm.battleActive) {
                            this.pauseBattle('Guest disconnected');
                        }
                    }, this.getSpeedAdjustedDelay(3000));
                } else {
                    this.pauseBattle('Guest disconnected');
                }
            }
        });
    }

    // ============================================
    // BATTLE PAUSE/RESUME
    // ============================================

    pauseBattle(reason) {
        const bm = this.battleManager;
        if (!bm.isAuthoritative || this.battlePaused) return;
        
        this.battlePaused = true;
        this.pauseStartTime = Date.now();
        
        bm.addCombatLog(`⏸️ Battle paused: ${reason}`, 'warning');
        bm.addCombatLog('⏳ Waiting for opponent to reconnect...', 'info');
        
        bm.saveBattleStateToPersistence();
        
        this.sendBattleUpdate('battle_paused', {
            reason: reason,
            timestamp: Date.now()
        });
        
        this.showBattlePauseUI(reason);
    }

    async resumeBattle(reason) {
        const bm = this.battleManager;
        if (!bm.isAuthoritative || !this.battlePaused) return;
        
        this.battlePaused = false;
        
        if (this.pauseStartTime) {
            this.totalPauseTime += Date.now() - this.pauseStartTime;
            this.pauseStartTime = null;
        }
        
        bm.addCombatLog(`▶️ Battle resumed: ${reason}`, 'success');
        bm.addCombatLog('⚔️ Continuing from where we left off...', 'info');
        
        await bm.saveBattleStateToPersistence();
        
        this.sendBattleUpdate('battle_resumed', {
            reason: reason,
            timestamp: Date.now()
        });
    
        this.hideBattlePauseUI();
        
        // Force clear overlay if it's still there
        setTimeout(() => {
            this.clearStuckPauseOverlay();
        }, 500);
        
        if (bm.battleActive && !bm.checkBattleEnd()) {
            setTimeout(() => {
                bm.authoritative_battleLoop();
            }, 500);
        }
    }

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

    hideBattlePauseUI() {
        const pauseOverlay = document.getElementById('battlePauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => pauseOverlay.remove(), 300);
        }
    }

    clearStuckPauseOverlay() {
        const pauseOverlay = document.getElementById('battlePauseOverlay');
        if (pauseOverlay) {
            console.log('Removing stuck pause overlay');
            pauseOverlay.remove();
        }
        this.battlePaused = false;
    }

    // ============================================
    // RECONNECTION HANDLING
    // ============================================

    handleGuestReconnecting() {
        this.guestReconnecting = true;
        console.log('🔄 HOST: Guest is reconnecting...');
        
        const bm = this.battleManager;
        bm.addCombatLog('🔄 Opponent is reconnecting...', 'info');
        
        // Set a timeout for reconnection handshake
        this.reconnectionHandshakeTimeout = setTimeout(() => {
            this.handleGuestReconnectionTimeout();
        }, this.getSpeedAdjustedDelay(5000));
    }

    handleGuestReconnectionReady() {
        const bm = this.battleManager;
        if (!bm.isAuthoritative) return;
        
        console.log('✅ HOST: Guest signaled ready after reconnection');
        
        // Clear timeout
        if (this.reconnectionHandshakeTimeout) {
            clearTimeout(this.reconnectionHandshakeTimeout);
            this.reconnectionHandshakeTimeout = null;
        }
        
        // Add a small delay to ensure guest is fully ready
        setTimeout(() => {
            if (this.opponentConnected && !bm.checkBattleEnd()) {
                this.resumeBattle('Guest reconnected and ready');
            }
        }, this.getSpeedAdjustedDelay(500));
    }

    handleGuestReconnectionTimeout() {
        const bm = this.battleManager;
        // If battle hasn't ended, resume anyway
        if (bm.battleActive && !bm.checkBattleEnd() && this.opponentConnected) {
            this.resumeBattle('Reconnection timeout - resuming battle');
        }
    }

    // ============================================
    // SENDING DATA
    // ============================================

    sendBattleUpdate(type, data) {
        const bm = this.battleManager;
        if (!bm.isAuthoritative) return;
        
        this.sendBattleData(type, data);
    }

    sendBattleData(type, data) {
        const bm = this.battleManager;
        
        if (bm.gameDataSender) {
            bm.gameDataSender('battle_data', {
                type: type,
                data: data,
                timestamp: Date.now()
            });
        } else {
            console.error('❌ HOST: gameDataSender is not available!');
        }
    }

    sendAcknowledgment(ackType) {
        const bm = this.battleManager;
        if (bm.isAuthoritative) return;
        
        if (bm.gameDataSender) {
            bm.gameDataSender('battle_ack', {
                type: ackType,
                timestamp: Date.now()
            });
        }
    }

    // ============================================
    // ACKNOWLEDGMENT SYSTEM
    // ============================================

    async waitForGuestAcknowledgment(ackType, timeout = 500) {
        const startTime = Date.now();
        
        // Apply speed adjustment to the timeout
        const adjustedTimeout = 1; // Minimal timeout as in original
        
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

    receiveBattleAcknowledgment(ackData) {
        const bm = this.battleManager;
        if (!bm.isAuthoritative) return;
        
        const { type } = ackData;
        
        if (this.pendingAcks && this.pendingAcks[type]) {
            this.pendingAcks[type]();
        }
    }

    getAdaptiveTimeout() {
        const baseTimeout = Math.max(300, this.connectionLatency * 3);
        const maxTimeout = 1000;
        return Math.min(baseTimeout, maxTimeout);
    }

    // ============================================
    // RECEIVING DATA (GUEST)
    // ============================================

    receiveBattleData(message) {
        const bm = this.battleManager;
        
        // Handle host-specific messages first
        if (bm.isAuthoritative) {
            if (message.type === 'guest_reconnection_ready') {
                this.handleGuestReconnectionReady();
            }
            return;
        }

        // Guest message processing
        const { type, data } = message;
        
        // NEW: Queue swap messages for sequential processing
        if (type === 'crusader_hookshot_swap' || type === 'stormblade_wind_swap') {
            this.queueSwapMessage(type, data);
            return;
        }
        
        // Handle all other message types normally
        switch (type) {
            case 'turn_start':
                this.guest_handleTurnStart(data);
                break;
                
            case 'speed_change':
                bm.guest_handleSpeedChange(data);
                break;
                
            case 'randomness_seed':
                bm.guest_handleRandomnessSeed(data);
                break;
                
            case 'creature_action':
                bm.guest_handleCreatureAction(data);
                break;
                
            case 'combined_turn_execution':
                bm.guest_handleCombinedTurnExecution(data);
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
                bm.guest_handleActorAction(data);
                break;
                
            case 'hero_turn_execution':
                bm.guest_handleHeroTurnExecution(data);
                break;
                
            case 'status_effect_change':
                bm.guest_handleStatusEffectChange(data);
                break;

            case 'kill_tracked':
                bm.guest_handleKillTracked(data);
                break;

            case 'necromancy_revival':
                bm.guest_handleNecromancyRevival(data);
                break;

            case 'jiggles_special_attack':
                if (bm.jigglesManager) {
                    bm.jigglesManager.handleGuestSpecialAttack(data);
                }
                break;

            case 'skeleton_archer_projectile_attack':
                if (bm.skeletonArcherManager) {
                    bm.skeletonArcherManager.handleGuestProjectileAttack(data);
                }
                break;

            case 'skeleton_archer_death_salvo':
                if (bm.skeletonArcherManager) {
                    bm.skeletonArcherManager.handleGuestDeathSalvo(data);
                }
                break;

            case 'skeleton_necromancer_revival':
                bm.guest_handleSkeletonNecromancerRevival(data);
                break;

            case 'skeleton_necromancer_hero_revival_death':
                if (bm.skeletonNecromancerManager) {
                    bm.skeletonNecromancerManager.handleGuestHeroRevivalDeath(data);
                }
                break;

            case 'skeleton_death_knight_dark_slash':
                if (bm.skeletonDeathKnightManager) {
                    bm.skeletonDeathKnightManager.handleGuestDarkSlash(data);
                }
                break;

            case 'skeleton_death_knight_slash_storm':
                if (bm.skeletonDeathKnightManager) {
                    bm.skeletonDeathKnightManager.handleGuestDeathSlashStorm(data);
                }
                break;




            case 'blade_frost_triggered':
                bm.guest_handleBladeFrostTriggered(data);
                break;

            case 'sun_sword_burn':
                bm.guest_handleSunSwordBurn(data);
                break;
                
            case 'sun_sword_frozen_resist':
                bm.guest_handleSunSwordFrozenResist(data);
                break;
                
            case 'spell_cast':
                bm.guest_handleSpellCast(data);
                break;
                
            case 'spell_effect':
                bm.guest_handleSpellEffect(data);
                break;
                
            case 'fireshield_applied':
                bm.guest_handleFireshieldApplied(data);
                break;

            case 'toxic_trap_applied':
                bm.guest_handleToxicTrapApplied(data);
                break;

            case 'frost_rune_applied':
                bm.guest_handleFrostRuneApplied(data);
                break;

            case 'crusader_cannon_barrage':
                bm.guest_handleCrusaderCannonBarrage(data);
                break;
                
            case 'crusader_cutlass_attack':
                bm.guest_handleCrusaderCutlassAttack(data);
                break;

            case 'crusader_flintlock_attack':
                bm.guest_handleCrusaderFlintlockAttack(data);
                break;

            case 'crusader_hookshot_swap':
                bm.guest_handleCrusaderHookshotSwap(data);
                break;

            case 'stormblade_wind_swap':
                bm.guest_handleStormbladeWindSwap(data);
                break;
                
            case 'resistance_used':
                if (bm.resistanceManager) {
                    bm.resistanceManager.handleGuestResistanceUsed(data);
                }
                break;

            case 'resistance_stacks_swapped':
                if (bm.resistanceManager) {
                    bm.resistanceManager.handleGuestResistanceSwapped(data);
                }
                break;
        }
    }

    // ============================================
    // GUEST MESSAGE HANDLERS
    // ============================================

    guest_handleTurnStart(data) {
        const bm = this.battleManager;
        bm.currentTurn = data.turn;
        bm.addCombatLog(`📍 Turn ${bm.currentTurn} begins`, 'info');
        
        // Clear any cached equipment counts at turn start
        ['left', 'center', 'right'].forEach(position => {
            if (bm.playerHeroes[position]) {
                delete bm.playerHeroes[position]._syncedUniqueEquipmentCount;
            }
            if (bm.opponentHeroes[position]) {
                delete bm.opponentHeroes[position]._syncedUniqueEquipmentCount;
            }
        });
    }

    guest_handleDamageApplied(data) {
        const bm = this.battleManager;
        const { targetAbsoluteSide, targetPosition, damage, oldHp, newHp, maxHp, died, targetName } = data;
        
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const localTarget = targetLocalSide === 'player' 
            ? bm.playerHeroes[targetPosition]
            : bm.opponentHeroes[targetPosition];

        if (localTarget) {
            localTarget.currentHp = newHp;
            localTarget.alive = !died;
            
            bm.addCombatLog(
                `💔 ${targetName} takes ${damage} damage! (${oldHp} → ${newHp} HP)`,
                targetLocalSide === 'player' ? 'error' : 'success'
            );

            bm.updateHeroHealthBar(targetLocalSide, targetPosition, newHp, maxHp);
            bm.animationManager.createDamageNumber(targetLocalSide, targetPosition, damage, maxHp, 'attack');
            
            if (died && oldHp > 0) {
                bm.handleHeroDeath(localTarget);
            }
        }
    }

    guest_handleCreatureDamageApplied(data) {
        const bm = this.battleManager;
        const { heroAbsoluteSide, heroPosition, creatureIndex, damage, oldHp, newHp, maxHp, died, revivedByNecromancy, creatureName } = data;
        
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const localHero = heroLocalSide === 'player' 
            ? bm.playerHeroes[heroPosition]
            : bm.opponentHeroes[heroPosition];

        if (localHero && localHero.creatures[creatureIndex]) {
            const creature = localHero.creatures[creatureIndex];
            creature.currentHp = newHp;
            
            // Handle death and revival status
            if (died) {
                if (revivedByNecromancy) {
                    // Creature died but was revived
                    creature.alive = true;
                    bm.addCombatLog(
                        `💔 ${creatureName} takes ${damage} damage and dies! (${oldHp} → ${newHp} HP)`,
                        heroLocalSide === 'player' ? 'error' : 'success'
                    );
                    bm.addCombatLog(
                        `💀✨ But ${creatureName} is revived by Necromancy!`,
                        'info'
                    );
                } else {
                    // Creature died and stayed dead
                    creature.alive = false;
                    bm.addCombatLog(
                        `💔 ${creatureName} takes ${damage} damage! (${oldHp} → ${newHp} HP)`,
                        heroLocalSide === 'player' ? 'error' : 'success'
                    );
                }
            } else {
                // Creature survived
                creature.alive = true;
                bm.addCombatLog(
                    `💔 ${creatureName} takes ${damage} damage! (${oldHp} → ${newHp} HP)`,
                    heroLocalSide === 'player' ? 'error' : 'success'
                );
            }

            bm.updateCreatureHealthBar(heroLocalSide, heroPosition, creatureIndex, newHp, maxHp);
            bm.animationManager.createDamageNumberOnCreature(heroLocalSide, heroPosition, creatureIndex, damage, creature.maxHp, 'attack');
            
            // Handle visual death state (only if creature stayed dead)
            if (died && !revivedByNecromancy && oldHp > 0) {
                bm.handleCreatureDeath(localHero, creature, creatureIndex, heroLocalSide, heroPosition);
            }
            
            // If creature was revived, make sure visual state reflects being alive
            if (died && revivedByNecromancy) {
                const creatureElement = document.querySelector(
                    `.${heroLocalSide}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
                );
                
                if (creatureElement) {
                    creatureElement.classList.remove('defeated');
                    const sprite = creatureElement.querySelector('.creature-sprite');
                    if (sprite) {
                        sprite.style.filter = '';
                        sprite.style.opacity = '';
                    }
                }
            }
        }
    }

    guest_handleBattlePaused(data) {
        const bm = this.battleManager;
        this.battlePaused = true;
        
        bm.addCombatLog(`⏸️ Battle paused: ${data.reason}`, 'warning');
        bm.addCombatLog('⏳ Host is waiting for stable connection...', 'info');
        
        this.showBattlePauseUI(data.reason || 'Connection issue');
    }

    guest_handleBattleResumed(data) {
        const bm = this.battleManager;
        this.battlePaused = false;
        
        bm.addCombatLog(`▶️ Battle resumed: ${data.reason}`, 'success');
        bm.addCombatLog('⚔️ Battle continues...', 'info');
        
        this.hideBattlePauseUI();
    }

    async guest_handleBattleEnd(data) {
        const bm = this.battleManager;
        bm.battleActive = false;
        
        const { hostResult, guestResult, hostLives, guestLives, hostGold, guestGold, newTurn } = data;
        
        // Update turn from the battle_end message BEFORE showing rewards
        if (newTurn && bm.battleScreen && bm.battleScreen.turnTracker) {
            bm.battleScreen.turnTracker.setCurrentTurn(newTurn);
            console.log(`🎯 Guest updated turn to ${newTurn} from battle_end message`);
            
            // Reset ability tracking for the new turn
            if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
                window.heroSelection.heroAbilitiesManager.resetTurnBasedTracking();
                console.log('✅ Guest reset ability tracking after turn update');
            }
        }
        
        const myResult = bm.isHost ? hostResult : guestResult;
        
        // Apply battle results first
        bm.applyBattleResults(hostResult, guestResult, hostLives, guestLives, hostGold, guestGold);
        
        // Calculate and apply wealth bonuses for guest
        if (!bm.isHost) {
            const myWealthBonus = bm.calculateWealthBonus(bm.playerHeroes);
            const opponentWealthBonus = bm.calculateWealthBonus(bm.opponentHeroes);
            
            if (myWealthBonus > 0) {
                bm.goldManager.addPlayerGold(myWealthBonus);
            }
            
            if (opponentWealthBonus > 0) {
                bm.goldManager.addOpponentGold(opponentWealthBonus);
            }
        }
        
        // Clear potion effects after battle (GUEST)
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
        
        const myMessage = bm.getResultMessage(myResult);
        bm.addCombatLog(myMessage, myResult === 'victory' ? 'success' : myResult === 'defeat' ? 'error' : 'info');
        
        await bm.cleanupBattleState();
        
        await bm.showBattleResult(myMessage);
        
        // Show rewards with the correct turn number
        if (bm.battleScreen && bm.battleScreen.showCardRewardsAndReturn) {
            setTimeout(() => {
                bm.battleScreen.showCardRewardsAndReturn(myResult);
            }, 0);
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    getSpeedAdjustedDelay(ms) {
        const bm = this.battleManager;
        if (bm.speedManager) {
            return bm.speedManager.calculateAdjustedDelay(ms);
        } else {
            return Math.max(1, Math.floor(ms / bm.battleSpeed));
        }
    }

    // ============================================
    // STATE EXPORT/IMPORT
    // ============================================

    exportState() {
        return {
            opponentConnected: this.opponentConnected,
            battlePaused: this.battlePaused,
            guestReconnecting: this.guestReconnecting,
            pauseStartTime: this.pauseStartTime,
            totalPauseTime: this.totalPauseTime,
            connectionLatency: this.connectionLatency,
            tabWasHidden: this.tabWasHidden
        };
    }

    importState(state) {
        if (!state) return;
        
        this.opponentConnected = state.opponentConnected ?? true;
        this.battlePaused = state.battlePaused ?? false;
        this.guestReconnecting = state.guestReconnecting ?? false;
        this.pauseStartTime = state.pauseStartTime ?? null;
        this.totalPauseTime = state.totalPauseTime ?? 0;
        this.connectionLatency = state.connectionLatency ?? 100;
        this.tabWasHidden = state.tabWasHidden ?? false;
        
        if (this.battlePaused) {
            this.showBattlePauseUI('Battle was paused when restored');
        }
    }

    // ============================================
    // CLEANUP
    // ============================================

    cleanup() {
        // Clear connection listener
        if (this.connectionListener && this.battleManager.roomManager && this.battleManager.roomManager.getRoomRef()) {
            this.battleManager.roomManager.getRoomRef().off('value', this.connectionListener);
            this.connectionListener = null;
        }
        
        // Clear all pending acknowledgments
        Object.values(this.ackTimeouts).forEach(timeoutId => clearTimeout(timeoutId));
        this.pendingAcks = {};
        this.ackTimeouts = {};
        
        // Clear reconnection timeout
        if (this.reconnectionHandshakeTimeout) {
            clearTimeout(this.reconnectionHandshakeTimeout);
            this.reconnectionHandshakeTimeout = null;
        }
        
        // Hide any pause UI
        this.hideBattlePauseUI();
        
        // Reset state
        this.opponentConnected = true;
        this.battlePaused = false;
        this.guestReconnecting = false;
        this.pauseStartTime = null;
        this.totalPauseTime = 0;
        this.connectionLatency = 100;
        this.tabWasHidden = false;
        
        this.clearSwapQueue();
    }
}

// CSS enhancements for visual feedback
const ENHANCED_SWAP_STYLES = `
.hero-swapped {
    animation: heroSwapFlash 0.5s ease-out !important;
    position: relative;
}

@keyframes heroSwapFlash {
    0% { 
        box-shadow: 0 0 0 rgba(255, 215, 0, 0);
        transform: scale(1);
    }
    50% { 
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 
                    0 0 40px rgba(255, 215, 0, 0.4);
        transform: scale(1.05);
    }
    100% { 
        box-shadow: 0 0 0 rgba(255, 215, 0, 0);
        transform: scale(1);
    }
}

/* Prevent multiple swap animations from overlapping */
.hero-swapped.hero-swapped {
    animation-duration: 0.3s !important;
}

/* Add subtle glow during swaps to indicate processing */
.battle-hero-slot.processing-swap {
    box-shadow: 0 0 10px rgba(135, 206, 250, 0.5);
    transition: box-shadow 0.2s ease;
}
`;

export function injectEnhancedSwapStyles() {
    if (!document.getElementById('enhancedSwapStyles')) {
        const style = document.createElement('style');
        style.id = 'enhancedSwapStyles';
        style.textContent = ENHANCED_SWAP_STYLES;
        document.head.appendChild(style);
    }
}

export default BattleNetworkManager;
