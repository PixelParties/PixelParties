// battleNetworkManager.js - Handles all network communication for battles
// UPDATED: Uses pre-calculated Hero stats instead of manual calculations

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
            console.warn('Swap message queue is full, dropping oldest message');
            this.swapMessageQueue.shift();
        }
        
        this.swapMessageQueue.push({ 
            type: messageType, 
            data, 
            timestamp: Date.now(),
            id: data.swapId || `swap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        });
        
        console.log(`Ã°Å¸â€œâ€¹ Queued ${messageType} (Queue size: ${this.swapMessageQueue.length})`);
        this.processSwapQueue();
    }

    async processSwapQueue() {
        if (this.isProcessingSwaps || this.swapMessageQueue.length === 0) {
            return;
        }

        this.isProcessingSwaps = true;
        console.log(`Ã°Å¸â€â€ž Processing ${this.swapMessageQueue.length} queued swap messages...`);

        while (this.swapMessageQueue.length > 0) {
            const message = this.swapMessageQueue.shift();
            const now = Date.now();
            
            // Ensure minimum interval between swaps for visual clarity
            const timeSinceLastSwap = now - this.lastSwapProcessTime;
            if (timeSinceLastSwap < this.minSwapInterval) {
                const waitTime = this.minSwapInterval - timeSinceLastSwap;
                console.log(`Ã¢ÂÂ±Ã¯Â¸Â Waiting ${waitTime}ms before next swap to prevent visual overlap`);
                await this.battleManager.delay(waitTime);
            }

            // Process the swap message
            console.log(`Ã°Å¸Å½Â¬ Processing ${message.type} (ID: ${message.id})`);
            await this.handleSwapMessage(message);
            this.lastSwapProcessTime = Date.now();
            
            // Small delay between messages for stability
            await this.battleManager.delay(50);
        }

        this.isProcessingSwaps = false;
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
            console.error(`Error processing ${message.type}:`, error);
        }
    }

    clearSwapQueue() {
        this.swapMessageQueue = [];
        this.isProcessingSwaps = false;
        this.lastSwapProcessTime = 0;
        console.log('Ã°Å¸Â§Â¹ Swap message queue cleared');
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
        
        bm.addCombatLog(`Ã¢ÂÂ¸Ã¯Â¸Â Battle paused: ${reason}`, 'warning');
        bm.addCombatLog('Ã¢ÂÂ³ Waiting for opponent to reconnect...', 'info');
        
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
        
        bm.addCombatLog(`Ã¢â€“Â¶Ã¯Â¸Â Battle resumed: ${reason}`, 'success');
        bm.addCombatLog('Ã¢Å¡â€Ã¯Â¸Â Continuing from where we left off...', 'info');
        
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
                <div class="pause-icon">Ã¢ÂÂ¸Ã¯Â¸Â</div>
                <h2>Battle Paused</h2>
                <p>${reason}</p>
                <div class="pause-spinner"></div>
                <div class="pause-details">
                    <p>Ã¢â‚¬Â¢ Battle state is preserved</p>
                    <p>Ã¢â‚¬Â¢ Waiting for opponent to return</p>
                    <p>Ã¢â‚¬Â¢ Will resume automatically</p>
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
        const bm = this.battleManager;
        bm.addCombatLog('Ã¢Å¡ Ã¯Â¸Â Guest reconnecting - checking for desync...', 'warning');

        // Pause battle immediately when guest starts reconnecting
        if (bm.battleActive && !this.battlePaused) {
            this.pauseBattle('Guest reconnecting - preventing desync');
        }

        console.log('Ã°Å¸â€â€ž HOST: Guest is reconnecting...');
        
        bm.addCombatLog('Ã°Å¸â€â€ž Opponent is reconnecting...', 'info');
        
        // Set a timeout for reconnection handshake
        this.reconnectionHandshakeTimeout = setTimeout(() => {
            this.handleGuestReconnectionTimeout();
        }, this.getSpeedAdjustedDelay(5000));
    }

    handleGuestReconnectionReady() {
        const bm = this.battleManager;
        if (!bm.isAuthoritative) return;
        
        console.log('Ã¢Å“â€¦ HOST: Guest signaled ready after reconnection');
        
        // Clear timeout
        if (this.reconnectionHandshakeTimeout) {
            clearTimeout(this.reconnectionHandshakeTimeout);
            this.reconnectionHandshakeTimeout = null;
        }
        
        // Add a small delay to ensure guest is fully ready
        setTimeout(async () => {
            if (this.opponentConnected && !bm.checkBattleEnd()) {
                console.log('Ã°Å¸â€â€ž HOST: Resyncing guest after reconnection...');
                const resyncSuccess = await this.resyncGuest();
                
                if (resyncSuccess) {
                    console.log('Ã¢Å“â€¦ HOST: Guest resync completed, resuming battle');
                    // Battle resumes automatically in resyncGuest if successful
                } else {
                    console.warn('Ã¢Å¡ Ã¯Â¸Â HOST: Guest resync failed, but resuming anyway');
                    this.resumeBattle('Guest reconnected (resync failed but attempting to continue)');
                }
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
            console.error('Ã¢ÂÅ’ HOST: gameDataSender is not available!');
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
        
        // Queue swap messages for sequential processing
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
                
            case 'resync_battle_state':
                this.guest_handleResyncBattleState(data);
                break;
                
            case 'guest_desync_signal':
                this.guest_handleDesyncSignal(data);
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

            case 'battle_stat_bonus':
                this.guest_handleBattleStatBonus(data);
                break;
            




            case 'necromancy_revival':
                bm.guest_handleNecromancyRevival(data);
                break;

            case 'diplomacy_effects_complete':
                if (data.operations) {
                    this.battleManager.guest_handleDiplomacyEffectsComplete(data);
                }
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

            case 'burning_skeleton_fire_slash':
                if (bm.burningSkeletonManager) {
                    bm.burningSkeletonManager.handleGuestFireSlash(data);
                }
                break;

            case 'burning_skeleton_flame_storm':
                if (bm.burningSkeletonManager) {
                    bm.burningSkeletonManager.handleGuestDeathFlameStorm(data);
                }
                break;
            
            case 'skeleton_reaper_scythe_reap':
                if (bm.skeletonReaperManager) {
                    bm.skeletonReaperManager.handleGuestScytheReap(data);
                }
                break;

            case 'skeleton_reaper_death_slash_storm':
                if (bm.skeletonReaperManager) {
                    bm.skeletonReaperManager.handleGuestDeathSlashStorm(data);
                }
                break;

            case 'skeleton_bard_inspiration':
                bm.guest_handleSkeletonBardInspiration(data);
                break;

            case 'skeleton_bard_death_inspiration':
                bm.guest_handleSkeletonBardDeathInspiration(data);
                break;

            case 'skeleton_mage_lightning_bolt':
                if (bm.skeletonMageManager) {
                    bm.skeletonMageManager.handleGuestLightningBolt(data);
                }
                break;

            case 'cavalry_movements':
                this.guest_handleCavalryMovements(data);
                break;

            case 'front_soldier_sword_slash':
                if (bm.frontSoldierManager) {
                    bm.frontSoldierManager.handleGuestSwordSlash(data);
                }
                break;

            case 'archer_arrow_attack':
                if (bm.archerManager) {
                    bm.archerManager.handleGuestArrowAttack(data);
                }
                break;

            case 'creature_counter_update':
                bm.guest_handleCreatureCounterUpdate(data);
                break;

            case 'moonlight_butterfly_attack':
                bm.guest_handleMoonlightButterflyAttack(data);
                break;

            case 'royal_corgi_card_draw':
                if (bm.royalCorgiManager) {
                    bm.royalCorgiManager.handleGuestCardDrawAnimation(data);
                }
                break;

            case 'crum_extra_action':
                bm.guest_handleCrumExtraAction(data);
                break;

            case 'alice_laser_effect':
                bm.guest_handleAliceLaserEffect(data);
                break;

            case 'yuki_onna_blizzard_attack':
                if (bm.coldHeartedYukiOnnaManager) {
                    bm.coldHeartedYukiOnnaManager.handleGuestBlizzardAttack(data);
                }
                break;

            case 'monia_protection_effect':
                bm.guest_handleMoniaProtectionEffect(data);
                break;



            
            case 'field_standard_effects_complete':
                import('./Artifacts/fieldStandard.js').then(({ handleGuestFieldStandardEffects }) => {
                    handleGuestFieldStandardEffects(data, this.battleManager);
                });
                break;

            case 'field_standard_rally':
                import('./Artifacts/fieldStandard.js').then(({ handleGuestFieldStandardRally }) => {
                    handleGuestFieldStandardRally(data, this.battleManager);
                });
                break;

            case 'furious_anger_action':
                bm.guest_handleFuriousAngerAction(data);
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

            case 'greatsword_skeleton_summon':
                bm.guest_handleGreatswordSkeletonSummon(data);
                break;

            case 'snow_cannon_effects_complete':
                import('./Artifacts/snowCannon.js').then(({ handleGuestSnowCannonEffects }) => {
                    handleGuestSnowCannonEffects(data, this.battleManager);
                });
                break;

            case 'snow_cannon_freeze':
                import('./Artifacts/snowCannon.js').then(({ handleGuestSnowCannonFreeze }) => {
                    handleGuestSnowCannonFreeze(data, this.battleManager);
                });
                break;

            case 'dark_gear_creature_stolen':
                import('./Artifacts/darkGear.js').then(({ handleGuestDarkGearStealing }) => {
                    handleGuestDarkGearStealing(data, this.battleManager);
                });
                break;
                

            case 'flame_arrow_impact':
                bm.guest_handleFlameArrowImpact(data);
                break;

            case 'golden_arrow_impact':
                bm.guest_handleGoldenArrowImpact(data);
                break;

            case 'angelfeather_arrow_impact':
                bm.guest_handleAngelfeatherArrowImpact(data);
                break;

            case 'bomb_arrow_impact':
                bm.guest_handleBombArrowImpact(data);
                break;
            
            case 'poisoned_arrow_impact':
                bm.guest_handlePoisonedArrowImpact(data);
                break;

            case 'racket_arrow_impact':
                bm.guest_handleRacketArrowImpact(data);
                break;

            case 'rainbows_arrow_impact':
                bm.guest_handleRainbowsArrowImpact(data);
                break;

            case 'rainbows_arrow_gold_award':
                bm.guest_handleRainbowsArrowGoldAward(data);
                break;

            case 'elixir_cold_freeze':
                bm.attackEffectsManager.handleGuestElixirColdFreeze(data);
                break;





            case 'heavy_hit_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('HeavyHit')) {
                    const heavyHitSpell = this.battleManager.spellSystem.spellImplementations.get('HeavyHit');
                    heavyHitSpell.handleGuestEffect(data);
                }
                break;
                
            case 'challenge_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('Challenge')) {
                    const challengeSpell = this.battleManager.spellSystem.spellImplementations.get('Challenge');
                    challengeSpell.handleGuestEffect(data);
                }
                break;

            case 'rain_of_arrows_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('RainOfArrows')) {
                    const rainOfArrowsSpell = this.battleManager.spellSystem.spellImplementations.get('RainOfArrows');
                    rainOfArrowsSpell.handleGuestEffect(data);
                }
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

            case 'fireshield_frozen_immunity':
                if (this.statusEffectsManager) {
                    this.statusEffectsManager.handleGuestFireshieldFrozenImmunity(data);
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
        bm.addCombatLog(`Ã°Å¸â€œÂ Turn ${bm.currentTurn} begins`, 'info');
        
        // REMOVED: Manual equipment count clearing - stats are pre-calculated
        // No need to manage synced equipment counts anymore
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
                `${targetName} takes ${damage} damage!)`,
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
        const { 
            heroAbsoluteSide, heroPosition, 
            originalCreatureIndex, currentCreatureIndex, finalCreatureIndex,
            creatureName, creatureId,
            damage, oldHp, newHp, maxHp, died, revivedByNecromancy,
            stolenByDarkGear,  // Handle stolen flag
            necromancyArrayManipulation, debugInfo 
        } = data;
        
        // If creature was stolen, skip normal damage handling
        if (stolenByDarkGear) {
            console.log(`⚙️ Guest: Creature ${creatureName} was stolen by Dark Gear, skipping damage visuals`);
            return;
        }
        
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const localHero = heroLocalSide === 'player' 
            ? bm.playerHeroes[heroPosition]
            : bm.opponentHeroes[heroPosition];

        if (!localHero || !localHero.creatures) {
            console.error(`Guest: Hero not found for creature damage`, { heroLocalSide, heroPosition });
            return;
        }

        // MOVEMENT-AWARE CREATURE FINDING: Try multiple strategies to find the correct creature
        let targetCreature = null;
        let targetCreatureIndex = -1;

        // Strategy 1: Use currentCreatureIndex (most likely to be correct)
        if (currentCreatureIndex >= 0 && currentCreatureIndex < localHero.creatures.length) {
            const candidateCreature = localHero.creatures[currentCreatureIndex];
            if (candidateCreature && candidateCreature.name === creatureName) {
                targetCreature = candidateCreature;
                targetCreatureIndex = currentCreatureIndex;
                console.log(`âœ… Guest: Found creature using currentCreatureIndex ${currentCreatureIndex}`);
            }
        }

        // Strategy 2: Use originalCreatureIndex as fallback (in case movement hasn't been processed)
        if (!targetCreature && originalCreatureIndex >= 0 && originalCreatureIndex < localHero.creatures.length) {
            const candidateCreature = localHero.creatures[originalCreatureIndex];
            if (candidateCreature && candidateCreature.name === creatureName) {
                targetCreature = candidateCreature;
                targetCreatureIndex = originalCreatureIndex;
                console.log(`âš ï¸ Guest: Using originalCreatureIndex ${originalCreatureIndex} as fallback`);
            }
        }

        // Strategy 3: Search by creature name and unique ID (last resort)
        if (!targetCreature) {
            for (let i = 0; i < localHero.creatures.length; i++) {
                const creature = localHero.creatures[i];
                if (creature.name === creatureName) {
                    // If we have a unique ID, verify it matches
                    if (creatureId && creature.addedAt) {
                        const expectedId = `${creature.name}_${creature.addedAt}`;
                        if (expectedId === creatureId) {
                            targetCreature = creature;
                            targetCreatureIndex = i;
                            console.log(`ðŸ” Guest: Found creature by unique ID ${creatureId} at index ${i}`);
                            break;
                        }
                    } else {
                        // No unique ID available, use first match by name
                        targetCreature = creature;
                        targetCreatureIndex = i;
                        console.log(`ðŸ” Guest: Found creature by name ${creatureName} at index ${i}`);
                        break;
                    }
                }
            }
        }

        // SAFETY CHECK: If we still can't find the creature, log detailed debug info
        if (!targetCreature) {
            console.error(`âŒ Guest: Could not find creature for damage application!`, {
                creatureName,
                creatureId,
                originalCreatureIndex,
                currentCreatureIndex,
                heroLocalSide,
                heroPosition,
                availableCreatures: localHero.creatures.map((c, i) => ({ 
                    index: i, 
                    name: c.name, 
                    id: c.addedAt ? `${c.name}_${c.addedAt}` : 'no-id',
                    alive: c.alive 
                })),
                debugInfo
            });
            return;
        }

        // DEBUG LOGGING: Show index resolution
        if (debugInfo && !debugInfo.wasOriginalIndexCorrect) {
            console.log(`ðŸŽ Guest: Creature moved! Original: ${originalCreatureIndex} â†’ Current: ${currentCreatureIndex} (shift: ${debugInfo.indexShift})`);
        }

        // Apply necromancy array manipulation if needed (unchanged)
        if (necromancyArrayManipulation && necromancyArrayManipulation.moveToEnd) {
            // Remove from current position
            const creature = localHero.creatures.splice(targetCreatureIndex, 1)[0];
            // Add to end
            localHero.creatures.push(creature);
            // Update target index
            targetCreatureIndex = localHero.creatures.length - 1;
        }

        // APPLY DAMAGE to the correctly identified creature
        targetCreature.currentHp = newHp;
        
        // Handle death and revival status
        if (died) {
            if (revivedByNecromancy) {
                // Creature died but was revived
                targetCreature.alive = true;
                bm.addCombatLog(
                    `${creatureName} takes ${damage} damage and dies!`,
                    heroLocalSide === 'player' ? 'error' : 'success'
                );
                bm.addCombatLog(
                    `But ${creatureName} is revived by Necromancy!`,
                    'info'
                );
            } else {
                // Creature died and stayed dead
                targetCreature.alive = false;
                bm.addCombatLog(
                    `${creatureName} takes ${damage} damage!`,
                    heroLocalSide === 'player' ? 'error' : 'success'
                );
            }
        } else {
            // Creature survived
            targetCreature.alive = true;
            bm.addCombatLog(
                `${creatureName} takes ${damage} damage!)`,
                heroLocalSide === 'player' ? 'error' : 'success'
            );
        }

        // Update visuals using the FINAL creature index
        const visualIndex = necromancyArrayManipulation ? finalCreatureIndex : targetCreatureIndex;
        bm.updateCreatureHealthBar(heroLocalSide, heroPosition, visualIndex, newHp, maxHp);
        bm.animationManager.createDamageNumberOnCreature(heroLocalSide, heroPosition, visualIndex, damage, targetCreature.maxHp, debugInfo?.damageSource || 'attack');
        
        // Handle visual death state (only if creature stayed dead)
        if (died && !revivedByNecromancy && oldHp > 0) {
            bm.handleCreatureDeath(localHero, targetCreature, visualIndex, heroLocalSide, heroPosition);
            
            // Remove health bar and HP text for defeated creature
            const creatureElement = document.querySelector(
                `.${heroLocalSide}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${visualIndex}"]`
            );
            
            if (creatureElement) {
                const healthBar = creatureElement.querySelector('.creature-health-bar');
                const hpText = creatureElement.querySelector('.creature-hp-text');
                if (healthBar) {
                    healthBar.remove();
                    console.log(`GUEST: Removed health bar for defeated ${creatureName}`);
                }
                if (hpText) {
                    hpText.remove();
                    console.log(`GUEST: Removed HP text for defeated ${creatureName}`);
                }
            }
        }
        
        // If creature was revived, restore visual state
        if (died && revivedByNecromancy) {
            const creatureElement = document.querySelector(
                `.${heroLocalSide}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${visualIndex}"]`
            );
            
            if (creatureElement) {
                creatureElement.classList.remove('defeated');
                const sprite = creatureElement.querySelector('.creature-sprite');
                if (sprite) {
                    sprite.style.filter = '';
                    sprite.style.opacity = '';
                }
                
                // Restore health bars for revived creatures
                setTimeout(() => {
                    bm.updateCreatureVisuals(heroLocalSide, heroPosition, localHero.creatures);
                    console.log(`GUEST: Restored health bar for revived ${creatureName}`);
                }, 100);
            }
        }
    }

    guest_handleCavalryMovements(data) {
        // Get cavalry manager from flow manager
        if (this.battleManager.flowManager && this.battleManager.flowManager.cavalryManager) {
            this.battleManager.flowManager.cavalryManager.handleGuestCavalryMovements(data);
        } else {
            console.warn('Received cavalry movements but cavalry manager not available');
        }
    }

    guest_handleBattlePaused(data) {
        const bm = this.battleManager;
        this.battlePaused = true;
        
        bm.addCombatLog(`Battle paused: ${data.reason}`, 'warning');
        bm.addCombatLog('Host is waiting for stable connection...', 'info');
        
        this.showBattlePauseUI(data.reason || 'Connection issue');
    }

    guest_handleBattleResumed(data) {
        const bm = this.battleManager;
        this.battlePaused = false;
        
        bm.addCombatLog(`Battle resumed: ${data.reason}`, 'success');
        bm.addCombatLog('Battle continues...', 'info');
        
        this.hideBattlePauseUI();
    }

    async guest_handleBattleEnd(data) {
        const bm = this.battleManager;
        bm.battleActive = false;
        
        const { hostResult, guestResult, hostLives, guestLives, hostGold, guestGold, newTurn } = data;
        
        // Update turn from the battle_end message BEFORE showing rewards
        if (newTurn && bm.battleScreen && bm.battleScreen.turnTracker) {
            bm.battleScreen.turnTracker.setCurrentTurn(newTurn);
            console.log(`Guest updated turn to ${newTurn} from battle_end message`);
            
            // Reset ability tracking for the new turn
            if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
                window.heroSelection.heroAbilitiesManager.resetTurnBasedTracking();
                console.log('Guest reset ability tracking after turn update');
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
                window.potionHandler.clearPotionEffects();
            } catch (error) {
                console.error('Guest error clearing potion effects after battle:', error);
            }
        }
        
        if (window.heroSelection) {
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
    // RESYNC AFTER DC
    // ============================================

    /**
     * HOST: Resynchronize guest to match host's current battle state
     * Called after host reconnects or when guest signals desync
     * @returns {boolean} Success status
     */
    async resyncGuest() {
        const bm = this.battleManager;
        
        if (!bm.isAuthoritative) {
            console.error('nly host can initiate guest resync');
            return false;
        }
        
        if (!this.opponentConnected) {
            return false;
        }
        
        console.log('HOST: Starting guest resynchronization...');
        
        try {
            // 1. Pause battle simulation during sync
            const wasPaused = this.battlePaused;
            if (!wasPaused) {
                bm.addCombatLog('Pausing battle for guest synchronization...', 'system');
                this.pauseBattle('Guest resynchronization in progress');
            }
            
            // 2. Capture complete current battle state (like checkpoint but for right now)
            const currentState = this.captureCurrentBattleState();
            if (!currentState) {
                console.error('Failed to capture current battle state for resync');
                return false;
            }
            
            bm.addCombatLog('Sending current battle state to guest...', 'system');
            
            // 3. Send complete state to guest
            this.sendBattleData('resync_battle_state', {
                battleState: currentState,
                resyncId: `resync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                timestamp: Date.now(),
                hostTurn: bm.currentTurn,
                message: 'Host requesting guest resynchronization'
            });
            
            // 4. Wait for guest acknowledgment (longer timeout for full state restore)
            console.log('HOST: Waiting for guest to acknowledge resync...');
            const ackReceived = await this.waitForGuestAcknowledgment('resync_complete', 10000); // 10 second timeout
            
            if (!ackReceived) {
                console.error('Guest failed to acknowledge resynchronization');
                bm.addCombatLog('Guest resync failed - no acknowledgment received', 'error');
                
                // Resume battle anyway if it wasn't originally paused
                if (!wasPaused && this.opponentConnected) {
                    this.resumeBattle('Resync failed but guest appears connected');
                }
                return false;
            }
            
            // 5. Resync successful
            console.log('HOST: Guest resynchronization completed successfully');
            bm.addCombatLog('Guest successfully resynchronized to current battle state', 'success');
            
            // 6. Resume battle if it wasn't originally paused
            if (!wasPaused && this.opponentConnected) {
                setTimeout(() => {
                    this.resumeBattle('Guest resynchronization completed');
                }, 500); // Small delay to ensure guest is fully ready
            }
            
            return true;
            
        } catch (error) {
            console.error('Error during guest resynchronization:', error);
            bm.addCombatLog('Guest resync failed due to error', 'error');
            return false;
        }
    }

    /**
     * HOST: Capture current battle state for guest resync (similar to checkpoint but immediate)
     * @returns {Object} Complete current battle state
     */
    captureCurrentBattleState() {
        const bm = this.battleManager;
        
        try {
            // Use checkpoint system to capture complete state, but mark it as 'resync'
            if (bm.checkpointSystem) {
                const currentCheckpoint = bm.checkpointSystem.createCheckpoint('resync');
                if (currentCheckpoint) {
                    console.log('Ã°Å¸â€œÂ¸ Captured current battle state for guest resync');
                    return currentCheckpoint;
                }
            }
            
            console.error('Ã¢ÂÅ’ Failed to create resync checkpoint');
            return null;
            
        } catch (error) {
            console.error('Ã¢ÂÅ’ Error capturing current battle state:', error);
            return null;
        }
    }

    /**
     * GUEST: Handle incoming resync request from host
     * @param {Object} data - Resync data from host
     */
    async guest_handleResyncBattleState(data) {
        const bm = this.battleManager;
        
        if (bm.isAuthoritative) {
            console.warn('Ã¢Å¡ Ã¯Â¸Â Host should not receive resync messages');
            return;
        }
        
        console.log('Ã°Å¸â€â€ž GUEST: Received resync request from host');
        bm.addCombatLog('Ã°Å¸â€â€ž Receiving updated battle state from host...', 'system');
        
        try {
            const { battleState, resyncId, hostTurn, message } = data;
            
            if (!battleState) {
                console.error('Ã¢ÂÅ’ GUEST: No battle state in resync message');
                return;
            }
            
            bm.addCombatLog(`Ã°Å¸â€œÂ¡ ${message}`, 'info');
            bm.addCombatLog(`Ã°Å¸Å½Â¯ Syncing to host turn ${hostTurn}...`, 'system');
            
            // Apply the complete battle state (like checkpoint restoration)
            const restored = await this.applyResyncBattleState(battleState);
            
            if (restored) {
                console.log('Ã¢Å“â€¦ GUEST: Successfully applied resync battle state');
                bm.addCombatLog('Ã¢Å“â€¦ Battle state synchronized with host!', 'success');
                
                // Send acknowledgment to host
                this.sendAcknowledgment('resync_complete');
                console.log('Ã°Å¸â€œÂ¤ GUEST: Sent resync complete acknowledgment to host');
                
            } else {
                console.error('Ã¢ÂÅ’ GUEST: Failed to apply resync battle state');
                bm.addCombatLog('Ã¢ÂÅ’ Failed to synchronize with host state', 'error');
            }
            
        } catch (error) {
            console.error('Ã¢ÂÅ’ GUEST: Error handling resync:', error);
            bm.addCombatLog('Ã¢ÂÅ’ Error during resynchronization', 'error');
        }
    }

    /**
     * GUEST: Apply the resync battle state (similar to checkpoint restoration)
     * @param {Object} battleState - Complete battle state from host
     * @returns {boolean} Success status
     */
    async applyResyncBattleState(battleState) {
        const bm = this.battleManager;
        
        try {
            // Use checkpoint system to restore the state
            if (bm.checkpointSystem && battleState) {
                console.log('Ã°Å¸â€â€ž GUEST: Applying resync state via checkpoint system...');
                
                // The battleState should be a complete checkpoint
                const restored = await bm.checkpointSystem.restoreFromCheckpoint(battleState);
                
                if (restored) {
                    console.log('Ã¢Å“â€¦ GUEST: Resync state applied successfully');
                    
                    // Force update all visuals to match new state
                    bm.updateAllHeroVisuals();
                    
                    // Re-render creatures
                    if (bm.battleScreen) {
                        bm.battleScreen.renderCreaturesAfterInit();
                    }
                    
                    // Update necromancy displays
                    if (bm.necromancyManager) {
                        bm.necromancyManager.initializeNecromancyStackDisplays();
                    }
                    
                    // Restore visual effects
                    bm.restoreFireshieldVisuals();
                    bm.restoreFrostRuneVisuals();
                    
                    return true;
                }
            }
            
            console.error('Ã¢ÂÅ’ GUEST: Failed to apply resync state');
            return false;
            
        } catch (error) {
            console.error('Ã¢ÂÅ’ GUEST: Error applying resync state:', error);
            return false;
        }
    }

    /**
     * GUEST: Signal to host that we are desynced and need resync
     * Called when guest reconnects or detects desync
     */
    signalDesyncToHost() {
        const bm = this.battleManager;
        
        if (bm.isAuthoritative) return; // Only guest can signal desync
        
        console.log('Ã°Å¸â€œÂ¡ GUEST: Signaling desync to host - requesting resynchronization');
        
        if (bm.gameDataSender) {
            bm.gameDataSender('battle_data', {
                type: 'guest_desync_signal',
                data: {
                    timestamp: Date.now(),
                    guestTurn: bm.currentTurn,
                    message: 'Guest is desynced and needs resynchronization',
                    reason: 'reconnection'
                }
            });
        }
        
        bm.addCombatLog('Ã°Å¸â€œÂ¡ Requesting battle state sync from host...', 'system');
    }

    /**
     * HOST: Handle guest desync signal
     * @param {Object} data - Desync signal from guest
     */
    async guest_handleDesyncSignal(data) {
        const bm = this.battleManager;
        
        if (!bm.isAuthoritative) {
            console.warn('Ã¢Å¡ Ã¯Â¸Â Guest should not receive desync signals');
            return;
        }
        
        console.log('Ã¢Å¡ Ã¯Â¸Â HOST: Guest reports desync - initiating resynchronization');
        bm.addCombatLog('Ã¢Å¡ Ã¯Â¸Â Guest detected desync - resynchronizing...', 'warning');
        
        const { guestTurn, message, reason } = data;
        
        if (guestTurn !== bm.currentTurn) {
            console.log(`Ã°Å¸Å½Â¯ HOST: Turn mismatch detected - Host: ${bm.currentTurn}, Guest: ${guestTurn}`);
            bm.addCombatLog(`Ã°Å¸Å½Â¯ Turn mismatch: Host(${bm.currentTurn}) vs Guest(${guestTurn})`, 'warning');
        }
        
        bm.addCombatLog(`Ã°Å¸â€œÂ¡ ${message}`, 'info');
        
        // Immediately resync the guest
        const success = await this.resyncGuest();
        
        if (success) {
            console.log('Ã¢Å“â€¦ HOST: Guest desync resolved successfully');
        } else {
            console.error('Ã¢ÂÅ’ HOST: Failed to resolve guest desync');
        }
    }

    guest_handleBattleStatBonus(data) {
        const bm = this.battleManager;
        if (bm.isAuthoritative) return; // Only process on guest side
        
        const { heroAbsoluteSide, heroPosition, heroName, bonusType, bonusAmount, source } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the hero
        const heroes = heroLocalSide === 'player' ? bm.playerHeroes : bm.opponentHeroes;
        const hero = heroes[heroPosition];
        
        if (!hero) {
            console.error(`Guest: Hero not found for stat bonus: ${heroLocalSide} ${heroPosition}`);
            return;
        }
        
        // Apply the battle bonus
        if (bonusType === 'attack') {
            hero.addBattleAttackBonus(bonusAmount);
            
            // Update the display
            bm.updateHeroAttackDisplay(heroLocalSide, heroPosition, hero);
            
            // Add to combat log
            const logType = heroLocalSide === 'player' ? 'success' : 'info';
            bm.addCombatLog(
                `âš”ï¸ ${heroName} gains +${bonusAmount} attack from ${source}!`,
                logType
            );
            
            console.log(`Guest: Applied +${bonusAmount} attack bonus to ${heroLocalSide} ${heroName}`);
        } else if (bonusType === 'hp') {
            hero.addBattleHpBonus(bonusAmount);
            
            // Update the health display
            bm.updateHeroHealthBar(heroLocalSide, heroPosition, hero.currentHp, hero.maxHp);
            
            // Add to combat log
            const logType = heroLocalSide === 'player' ? 'success' : 'info';
            bm.addCombatLog(
                `â¤ï¸ ${heroName} gains +${bonusAmount} HP from ${source}!`,
                logType
            );
            
            console.log(`Guest: Applied +${bonusAmount} HP bonus to ${heroLocalSide} ${heroName}`);
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