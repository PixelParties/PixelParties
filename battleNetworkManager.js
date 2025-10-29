// battleNetworkManager.js - Handles all network communication for battles
import { TeleportationPowderPotion } from './Potions/teleportationPowder.js';

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
        this.battleLoopRunning = false;

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
            this.swapMessageQueue.shift();
        }
        
        this.swapMessageQueue.push({ 
            type: messageType, 
            data, 
            timestamp: Date.now(),
            id: data.swapId || `swap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        });
        
        this.processSwapQueue();
    }

    async processSwapQueue() {
        if (this.isProcessingSwaps || this.swapMessageQueue.length === 0) {
            return;
        }

        this.isProcessingSwaps = true;

        while (this.swapMessageQueue.length > 0) {
            const message = this.swapMessageQueue.shift();
            const now = Date.now();
            
            // Ensure minimum interval between swaps for visual clarity
            const timeSinceLastSwap = now - this.lastSwapProcessTime;
            if (timeSinceLastSwap < this.minSwapInterval) {
                const waitTime = this.minSwapInterval - timeSinceLastSwap;
                await this.battleManager.delay(waitTime);
            }

            // Process the swap message
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
                    
                case 'expedition_position_swap':
                    const { handleGuestExpeditionSwap } = await import('./Spells/expedition.js');
                    await handleGuestExpeditionSwap(bm, message.data);
                    break;
                    
                default:
                    break;
            }
        } catch (error) {
            // Error occurred processing swap message
        }
    }

    clearSwapQueue() {
        this.swapMessageQueue = [];
        this.isProcessingSwaps = false;
        this.lastSwapProcessTime = 0;
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
                    <p>✅ Battle state is preserved</p>
                    <p>✅ Waiting for opponent to return</p>
                    <p>✅ Will resume automatically</p>
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

        // Pause battle immediately when guest starts reconnecting
        if (bm.battleActive && !this.battlePaused) {
            this.pauseBattle('Guest reconnecting - preventing desync');
        }
                
        // Set a timeout for reconnection handshake
        this.reconnectionHandshakeTimeout = setTimeout(() => {
            this.handleGuestReconnectionTimeout();
        }, this.getSpeedAdjustedDelay(5000));
    }

    handleGuestReconnectionReady() {
        const bm = this.battleManager;
        if (!bm.isAuthoritative) return;
        
        // Clear timeout
        if (this.reconnectionHandshakeTimeout) {
            clearTimeout(this.reconnectionHandshakeTimeout);
            this.reconnectionHandshakeTimeout = null;
        }
        
        // Add a small delay to ensure guest is fully ready
        setTimeout(async () => {
            if (this.opponentConnected && !bm.checkBattleEnd()) {
                const resyncSuccess = await this.resyncGuest();
                
                if (resyncSuccess) {
                    // Battle resumes automatically in resyncGuest if successful
                } else {
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
        
        // Skip network updates in singleplayer
        if (window.heroSelection && window.heroSelection.isSingleplayerMode()) {
            return;
        }
        
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
        // Skip waiting in singleplayer mode
        if (window.heroSelection && window.heroSelection.isSingleplayerMode()) {
            return Promise.resolve();
        }
        
        const startTime = Date.now();
        const adjustedTimeout = this.getSpeedAdjustedDelay(timeout); // Use actual timeout param
        
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                delete this.pendingAcks[ackType];
                delete this.ackTimeouts[ackType];
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

    async receiveBattleData(message) {
        const bm = this.battleManager;
        
        // Add defensive check for malformed message
        if (!message || typeof message !== 'object') {
            return;
        }
        
        // Handle host-specific messages first
        if (bm.isAuthoritative) {
            if (message.type === 'guest_reconnection_ready') {
                this.handleGuestReconnectionReady();
            }
            return;
        }

        // Guest message processing
        const { type, data } = message;
        
        // Add defensive check for missing type
        if (!type) {
            return;
        }
        
        // Queue swap messages for sequential processing
        if (type === 'crusader_hookshot_swap' || type === 'expedition_position_swap') {
            this.queueSwapMessage(type, data);
            return;
        }
        
        // Handle all other message types normally
        switch (type) {
            case 'creature_state_sync':
                this.guest_handleCreatureStateSync(data);
                break;
                
            case 'creature_action':
                bm.guest_handleCreatureAction(data);
                break;
                
            case 'creature_damage_applied':
                this.guest_handleCreatureDamageApplied(data);
                break;

            case 'creature_shake_action':
                this.guest_handleCreatureShakeAction(data);
                break;
                
            case 'speed_change':
                bm.guest_handleSpeedChange(data);
                break;
                
            case 'randomness_seed':
                bm.guest_handleRandomnessSeed(data);
                break;
                
            case 'combined_turn_execution':
                bm.guest_handleCombinedTurnExecution(data);
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

            case 'additional_action_execution':
                this.guest_handleAdditionalActionExecution(data);
                break;

            case 'stalemate_detected':
                this.guest_handleStalemateDetected(data);
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

            case 'hand_update':
                this.guest_handleHandUpdate(data);
                break;

            case 'deck_update':
                this.handleDeckUpdate(data);
                break;

            case 'potion_usage':
                if (window.potionHandler) {
                    window.potionHandler.guest_handlePotionUsageVisual(data);
                }
                break;

            case 'potion_effect_added':
                if (window.potionHandler) {
                    window.potionHandler.guest_handlePotionEffectAddedVisual(data);
                }
                break;

            case 'potion_effects_applied':
                if (window.potionHandler) {
                    window.potionHandler.guest_handlePotionEffectsAppliedVisual(data);
                }
                break;

            case 'potion_effects_cleared':
                if (window.potionHandler) {
                    window.potionHandler.guest_handlePotionEffectsClearedVisual(data);
                }
                break;

            case 'potion_specific_visual':
                await window.potionHandler.handlePotionSpecificVisual(data);
                break;

            case 'potion_card_display':
                if (window.potionHandler) {
                    await window.potionHandler.guest_handlePotionCardDisplay(data);
                }
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

            case 'three_headed_giant_special_attack':
                if (bm.threeHeadedGiantManager) {
                    bm.threeHeadedGiantManager.handleGuestSpecialAttack(data);
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
                if (bm.skeletonBardManager) {
                    bm.skeletonBardManager.handleGuestInspiration(data);
                }
                break;

            case 'skeleton_bard_death_inspiration':
                if (bm.skeletonBardManager) {
                    bm.skeletonBardManager.handleGuestDeathInspiration(data);
                }
                break;

            case 'skeleton_mage_lightning_bolt':
                if (bm.skeletonMageManager) {
                    bm.skeletonMageManager.handleGuestLightningBolt(data);
                }
                break;

            case 'skeleton_king_skullmael_summon':
                if (bm.skeletonKingSkullmaelManager) {
                    bm.skeletonKingSkullmaelManager.handleGuestSkeletonSummon(data);
                }
                break;

            case 'skeleton_king_death_spawn':
                if (bm.skeletonKingSkullmaelManager) {
                    bm.skeletonKingSkullmaelManager.handleGuestDeathSkeletonSpawn(data);
                }
                break;

            case 'skeleton_healer_turn_healing':
                if (bm.skeletonHealerManager) {
                    bm.skeletonHealerManager.handleGuestTurnHealing(data);
                }
                break;

            case 'skeleton_healer_death_healing':
                if (bm.skeletonHealerManager) {
                    bm.skeletonHealerManager.handleGuestDeathHealing(data);
                }
                break;

            case 'exploding_skull_death_explosion':
                if (bm.explodingSkullManager) {
                    await bm.explodingSkullManager.handleGuestDeathExplosion(data);
                }
                break;

            case 'exploding_skull_counter_gain':
                if (bm.explodingSkullManager) {
                    bm.explodingSkullManager.handleGuestCounterGainAnimation(data);
                } else {
                    import('./Creatures/explodingSkull.js').then(({ default: ExplodingSkullCreature }) => {
                        bm.explodingSkullManager = new ExplodingSkullCreature(bm);
                        bm.explodingSkullManager.handleGuestCounterGainAnimation(data);
                    });
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

            case 'cheeky_monkee_rock_throw':
                if (bm.cheekyMonkeeManager) {
                    bm.cheekyMonkeeManager.handleGuestRockThrow(data);
                }
                break;

            case 'creature_counter_update':
                bm.guest_handleCreatureCounterUpdate(data);
                break;

            case 'moonlight_butterfly_attack':
                if (bm.moonlightButterflyManager) {
                    bm.moonlightButterflyManager.handleGuestMoonlightAttack(data);
                }
                break;

            case 'royal_corgi_card_draw':
                if (bm.royalCorgiManager) {
                    bm.royalCorgiManager.handleGuestCardDrawAnimation(data);
                }
                break;

            case 'grinning_cat_card_gift':
                if (bm.grinningCatManager) {
                    bm.grinningCatManager.handleGuestCardGift(data);
                }
                break;

            case 'crystal_well_exchange':
                if (window.crystalWellManager) {
                    window.crystalWellManager.handleGuestCrystalWellExchange(data, this.battleManager);
                }
                break;

            case 'crum_extra_action':
                if (bm.crumTheClassPetManager) {
                    bm.crumTheClassPetManager.handleGuestExtraAction(data);
                }
                break;

            case 'alice_laser_effect':
                if (bm.aliceManager) {
                    bm.aliceManager.handleGuestLaserEffect(data);
                }
                break;

            case 'luna_burn_cleansing':
                if (bm.lunaManager) {
                    bm.lunaManager.handleGuestBurnCleansingEffect(data);
                } 
                break;

            case 'ghuanjun_bonus_attack':
                if (bm.ghuanjunManager) {
                    bm.ghuanjunManager.handleGuestBonusAttack(data);
                }
                break;

            case 'ghuanjun_round_reset':
                if (bm.ghuanjunManager) {
                    bm.ghuanjunManager.handleGuestRoundReset(data);
                }
                break;

            case 'carris_immunity_triggered':
                if (this.battleManager.damageSourceManager) {
                    this.battleManager.damageSourceManager.handleGuestCarrisImmunity(data);
                }
                break;

            case 'carris_time_limit':
                this.guest_handleCarrisTimeLimit(data);
                break;

            case 'yuki_onna_blizzard_attack':
                if (bm.coldHeartedYukiOnnaManager) {
                    bm.coldHeartedYukiOnnaManager.handleGuestBlizzardAttack(data);
                }
                break;

            case 'future_tech_mech_special_attack':
                if (bm.futureTechMechManager) {
                    bm.futureTechMechManager.handleGuestSpecialAttack(data);
                }
                break;

            case 'root_of_all_evil_special_attack':
                if (bm.theRootOfAllEvilManager) {
                    bm.theRootOfAllEvilManager.handleGuestSpecialAttack(data);
                } else {
                    // Initialize manager if it doesn't exist
                    try {
                        const { TheRootOfAllEvilCreature } = await import('./Creatures/theRootOfAllEvil.js');
                        bm.theRootOfAllEvilManager = new TheRootOfAllEvilCreature(bm);
                        bm.theRootOfAllEvilManager.handleGuestSpecialAttack(data);
                    } catch (error) {
                        // Initialization failed
                    }
                }
                break;

            case 'graveworm_bite_attack':
                if (bm.graveWormManager) {
                    bm.graveWormManager.handleGuestBiteAttack(data);
                }
                break;

            case 'blue_ice_dragon_frost_breath':
                if (bm.blueIceDragonManager) {
                    bm.blueIceDragonManager.handleGuestFrostBreathAttack(data);
                }
                break;

            case 'demons_gate_spell_cast':
                if (bm.demonsGateManager) {
                    bm.demonsGateManager.handleGuestSpellCast(data);
                }
                break;

            case 'luna_kiai_flame_attack':
                if (bm.lunaKiaiManager) {
                    bm.lunaKiaiManager.handleGuestFlameAttack(data);
                }
                break;

            case 'priest_of_luna_cleansing': 
                if (bm.priestOfLunaManager) {
                    bm.priestOfLunaManager.handleGuestCleansing(data);
                }
                break;

            case 'cutephoenix_fireball_attack':
                if (bm.cutePhoenixManager) {
                    bm.cutePhoenixManager.handleGuestFireballAttack(data);
                }
                break;

            case 'cutephoenix_revival':
                if (bm.cutePhoenixManager) {
                    bm.cutePhoenixManager.handleGuestRevival(data);
                }
                break;



            case 'biomancy_token_vine_attack':
                if (bm.biomancyTokenManager) {
                    bm.biomancyTokenManager.handleGuestVineAttack(data);
                } else {
                    // Initialize manager if it doesn't exist
                    try {
                        const { BiomancyTokenCreature } = await import('./Creatures/biomancyToken.js');
                        bm.biomancyTokenManager = new BiomancyTokenCreature(bm);
                        bm.biomancyTokenManager.handleGuestVineAttack(data);
                    } catch (error) {
                        // Initialization failed
                    }
                }
                break;

                

            case 'monia_protection_effect':
                bm.guest_handleMoniaProtectionEffect(data);
                break;

            case 'thep_revival':
                const { ThepHeroEffect } = await import('./Heroes/thep.js');
                ThepHeroEffect.handleGuestThepRevival(data, bm);
                break;

            case 'gabby_transformation':
                const { GabbyHeroEffect } = await import('./Heroes/gabby.js');
                await GabbyHeroEffect.handleGuestTransformation(data, bm);
                break;

            case 'check_gabby_revival':
                if (!bm.isAuthoritative) {
                    const { GabbyHeroEffect } = await import('./Heroes/gabby.js');
                    await GabbyHeroEffect.checkGabbyRevivalAtTurnStart(bm);
                }
                break;

            case 'nomu_shield_applied':
                bm.guest_handleNomuShieldApplied(data);
                break;

            case 'waflav_evolution_counter_gained':
                if (!bm.isAuthoritative) {
                    // Import and handle Waflav evolution counter update
                    import('./Heroes/waflav.js').then(({ WaflavEffectManager }) => {
                        WaflavEffectManager.handleGuestEvolutionCounterGained(data, bm);
                    }).catch(error => {
                        // Loading failed
                    });
                }
                break;
                
            case 'thunderstruck_waflav_evolution_counters_consumed':
                this.guest_handleThunderstruckWaflavCounterConsumption(data);
                break;

            case 'flamebathed_waflav_battle_start_effect':
                if (!bm.isAuthoritative) {
                    import('./Heroes/flamebathedWaflav.js').then(({ FlamebathedWaflavHeroEffect }) => {
                        FlamebathedWaflavHeroEffect.handleGuestBattleStartEffect(data, bm);
                    }).catch(error => {
                        // Loading failed
                    });
                }
                break;

            case 'flamebathed_waflav_battle_end_effect':
                if (!bm.isAuthoritative) {
                    import('./Heroes/flamebathedWaflav.js').then(({ FlamebathedWaflavHeroEffect }) => {
                        FlamebathedWaflavHeroEffect.handleGuestBattleEndEffect(data, bm);
                    }).catch(error => {
                        // Loading failed
                    });
                }
                break;

            case 'swampborne_poison_retaliation':
                SwampborneWaflavHeroEffect.handleGuestPoisonRetaliation(data, this.battleManager);
                break;

            case 'swampborne_evolution_counter_gained':
                SwampborneWaflavHeroEffect.handleGuestEvolutionCounterGained(data, this.battleManager);
                break;

            case 'deep_drowned_waflav_battle_start_effect':
                if (!bm.isAuthoritative) {
                    import('./Heroes/deepDrownedWaflav.js').then(({ DeepDrownedWaflavHeroEffect }) => {
                        DeepDrownedWaflavHeroEffect.handleGuestBattleStartEffect(data, bm);
                    }).catch(error => {
                        // Loading failed
                    });
                }
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

            case 'rescue_mission_activated':
                if (!bm.isAuthoritative) {
                    const { handleGuestRescueMission } = await import('./Spells/rescueMission.js');
                    await handleGuestRescueMission(data, bm);
                }
                break;

            case 'shipwrecked_hp_halved':
                import('./Spells/shipwrecked.js').then(({ handleGuestShipwreckedHPHalved }) => {
                    handleGuestShipwreckedHPHalved(data, this.battleManager);
                }).catch(error => {
                    console.error('Error handling Shipwrecked HP halving:', error);
                });
                break;

            case 'shipwrecked_battle_start':
                if (!bm.isAuthoritative && window.handleGuestShipwreckedBattleStart) {
                    await window.handleGuestShipwreckedBattleStart(data, bm);
                }
                break;

            case 'blade_frost_triggered':
                bm.guest_handleBladeFrostTriggered(data);
                break;

            case 'blade_swamp_witch_triggered':
                if (bm.attackEffectsManager) {
                    bm.attackEffectsManager.handleGuestBladeSwampWitchTrigger(data);
                }
                break;

            case 'sun_sword_burn':
                bm.guest_handleSunSwordBurn(data);
                break;
                
            case 'sun_sword_frozen_resist':
                bm.guest_handleSunSwordFrozenResist(data);
                break;

            case 'capture_net_capture':
                if (!this.battleManager.captureNetArtifact) {
                    const { CaptureNetArtifact } = await import('./Artifacts/captureNet.js');
                    this.battleManager.captureNetArtifact = new CaptureNetArtifact(this.battleManager);
                }
                await this.battleManager.captureNetArtifact.handleGuestCreatureCapture(data);
                break;



                
            case 'spell_cast':
                bm.guest_handleSpellCast(data);
                break;
                
            case 'spell_effect':
                bm.guest_handleSpellEffect(data);
                break;

            case 'fighting_spell_trigger':
                if (bm.spellSystem) {
                    bm.spellSystem.handleGuestFightingSpellTrigger(data);
                }
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

            case 'stoneskin_applied':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('Stoneskin')) {
                    const stoneskinSpell = this.battleManager.spellSystem.spellImplementations.get('Stoneskin');
                    stoneskinSpell.handleGuestStoneskinApplied(data);
                }
                break;

            case 'stoneskin_damage_reduction':
                this.battleManager.guest_handleStoneskinDamageReduction(data);
                break;

            case 'healing_melody_effect':
                await bm.guest_handleHealingMelodyEffect(data);
                break;

            case 'healing_melody_start':
                bm.guest_handleHealingMelodyStart(data);
                break;

            case 'hero_healed':
                this.guest_handleHeroHealed(data);
                break;
                
            case 'creature_healed':
                this.guest_handleCreatureHealed(data);
                break;

            case 'cannibalism_healing':
                bm.guest_handleCannibalismHealing(data);
                break;

            case 'burning_finger_stack_added':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('BurningFinger')) {
                    const burningFingerSpell = this.battleManager.spellSystem.spellImplementations.get('BurningFinger');
                    burningFingerSpell.guest_handleStackUpdate(data);
                }
                break;

            case 'hand_of_death_counter_update':
                if (bm.spellSystem && bm.spellSystem.spellImplementations.has('HandOfDeath')) {
                    const handOfDeathSpell = bm.spellSystem.spellImplementations.get('HandOfDeath');
                    handOfDeathSpell.handleGuestDeathCounterUpdate(data);
                }
                break;

            case 'hand_of_death_final_effect':
                if (bm.spellSystem && bm.spellSystem.spellImplementations.has('HandOfDeath')) {
                    const handOfDeathSpell = bm.spellSystem.spellImplementations.get('HandOfDeath');
                    handOfDeathSpell.handleGuestFinalDeathEffect(data);
                }
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

            case 'stormblade_banishment':
                bm.guest_handleStormbladeBanishment(data);
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

            case 'anti_intruder_effects_complete':
                const { handleGuestAntiIntruderEffects } = await import('./Artifacts/antiIntruderSystem.js');
                handleGuestAntiIntruderEffects(data, this);
                break;

            case 'anti_intruder_strike':
                const { handleGuestAntiIntruderStrike } = await import('./Artifacts/antiIntruderSystem.js');
                await handleGuestAntiIntruderStrike(data, this);
                break;

            case 'heart_mountain_effects_complete':
                import('./Artifacts/heartOfTheMountain.js').then(({ handleGuestHeartOfMountainEffects }) => {
                    handleGuestHeartOfMountainEffects(data, this.battleManager);
                });
                break;

            case 'heart_mountain_burn':
                import('./Artifacts/heartOfTheMountain.js').then(({ handleGuestHeartOfMountainBurn }) => {
                    handleGuestHeartOfMountainBurn(data, this.battleManager);
                });
                break;

            case 'dichotomy_luna_tempeste_shield':
                if (!bm.isAuthoritative) {
                    const { handleGuestDichotomyShieldEffect } = await import('./Artifacts/dichotomyOfLunaAndTempeste.js');
                    handleGuestDichotomyShieldEffect(data, bm);
                }
                break;

            case 'cloud_pillow_effects_complete':
                return this.battleManager.guest_handleCloudPillowEffectsComplete(data);

            case 'cloud_pillow_protection':
                return this.battleManager.guest_handleCloudPillowProtection(data);

            case 'dark_gear_creature_stolen':
                import('./Artifacts/darkGear.js').then(({ handleGuestDarkGearStealing }) => {
                    handleGuestDarkGearStealing(data, this.battleManager);
                });
                break;

            case 'storm_ring_negation':
                import('./Artifacts/stormRing.js').then(({ handleGuestStormRingNegation }) => {
                    handleGuestStormRingNegation(data, this.battleManager);
                });
                break;

            case 'blood_soaked_coin_damage_animation':
                import('./Artifacts/bloodSoakedCoin.js').then(({ handleGuestBloodSoakedCoinDamage }) => {
                    handleGuestBloodSoakedCoinDamage(data, this.battleManager);
                });
                break;

            case 'soul_shard_shield_applied':
                import('./Creatures/soulShardIb.js').then(({ handleGuestSoulShardShield }) => {
                    handleGuestSoulShardShield(data, this.battleManager);
                }).catch(error => {
                    console.error('Error handling Soul Shard Ib guest effects:', error);
                });
                break;

            case 'soul_shard_combat_shield':
                if (!this.battleManager.soulShardIbManager) {
                    import('./Creatures/soulShardIb.js').then(({ default: SoulShardIbCreature }) => {
                        this.battleManager.soulShardIbManager = new SoulShardIbCreature(this.battleManager);
                        this.battleManager.soulShardIbManager.handleGuestCombatShield(data);
                    });
                } else {
                    this.battleManager.soulShardIbManager.handleGuestCombatShield(data);
                }
                break;

            case 'soul_shard_ka_combat_buff':
                if (!this.battleManager.soulShardKaManager) {
                    import('./Creatures/soulShardKa.js').then(({ default: SoulShardKaCreature }) => {
                        this.battleManager.soulShardKaManager = new SoulShardKaCreature(this.battleManager);
                        this.battleManager.soulShardKaManager.handleGuestCombatBuff(data);
                    });
                } else {
                    this.battleManager.soulShardKaManager.handleGuestCombatBuff(data);
                }
                break;

            case 'soul_shard_ka_attack_applied':
                import('./Creatures/soulShardKa.js').then(({ handleGuestSoulShardKaAttack }) => {
                    handleGuestSoulShardKaAttack(data, this.battleManager);
                }).catch(error => {
                    console.error('Error handling Soul Shard Ka guest effects:', error);
                });
                break;

            case 'soul_shard_khet_graveyard_summon':
                if (!this.battleManager.soulShardKhetManager) {
                    import('./Creatures/soulShardKhet.js').then(({ default: SoulShardKhetCreature }) => {
                        this.battleManager.soulShardKhetManager = new SoulShardKhetCreature(this.battleManager);
                        this.battleManager.soulShardKhetManager.handleGuestGraveyardSummon(data);
                    });
                } else {
                    this.battleManager.soulShardKhetManager.handleGuestGraveyardSummon(data);
                }
                break;

            case 'soul_shard_khet_battle_start_summons':
                import('./Creatures/soulShardKhet.js').then(({ handleGuestSoulShardKhetBattleStart }) => {
                    handleGuestSoulShardKhetBattleStart(data, this.battleManager);
                });
                break;

            case 'soul_shard_ba_combat_removal':
                if (!this.battleManager.soulShardBaManager) {
                    import('./Creatures/soulShardBa.js').then(({ default: SoulShardBaCreature }) => {
                        this.battleManager.soulShardBaManager = new SoulShardBaCreature(this.battleManager);
                        this.battleManager.soulShardBaManager.handleGuestCombatRemoval(data);
                    });
                } else {
                    this.battleManager.soulShardBaManager.handleGuestCombatRemoval(data);
                }
                break;

            case 'soul_shard_ba_removal_applied':
                import('./Creatures/soulShardBa.js').then(({ handleGuestSoulShardBaRemoval }) => {
                    handleGuestSoulShardBaRemoval(data, this.battleManager);
                });
                break;
            
            case 'soul_shard_ren_card_draw':
                if (!bm.soulShardRenManager) {
                    const { default: SoulShardRenCreature } = await import('./Creatures/soulShardRen.js');
                    bm.soulShardRenManager = new SoulShardRenCreature(bm);
                }
                bm.soulShardRenManager.handleGuestCardDraw(data);
                break;

            case 'soul_shard_ren_redraw_applied':
                import('./Creatures/soulShardRen.js').then(({ handleGuestSoulShardRenRedraw }) => {
                    handleGuestSoulShardRenRedraw(data, this.battleManager);
                });
                break;

            case 'soul_shard_sekhem_flame_attack':
                if (!bm.soulShardSekhemManager) {
                    const { default: SoulShardSekhemCreature } = await import('./Creatures/soulShardSekhem.js');
                    bm.soulShardSekhemManager = new SoulShardSekhemCreature(bm);
                }
                bm.soulShardSekhemManager.handleGuestFlameAttack(data);
                break;

            case 'soul_shard_sekhem_damage_applied':
                import('./Creatures/soulShardSekhem.js').then(({ handleGuestSekhemDamage }) => {
                    handleGuestSekhemDamage(data, this.battleManager);
                });
                break;

            case 'soul_shard_shut_mummy_attack':
                if (!bm.soulShardShutManager) {
                    const { default: SoulShardShutCreature } = await import('./Creatures/soulShardShut.js');
                    bm.soulShardShutManager = new SoulShardShutCreature(bm);
                }
                bm.soulShardShutManager.handleGuestMummyAttack(data);
                break;

            case 'soul_shard_shut_graveyard_applied':
                import('./Creatures/soulShardShut.js').then(({ handleGuestShutGraveyard }) => {
                    handleGuestShutGraveyard(data, this.battleManager);
                });
                break;

            case 'soul_shard_sah_mimic':
                if (!bm.soulShardSahManager) {
                    const { default: SoulShardSahCreature } = await import('./Creatures/soulShardSah.js');
                    bm.soulShardSahManager = new SoulShardSahCreature(bm);
                }
                bm.soulShardSahManager.handleGuestMimic(data);
                break;
                
            case 'soul_shard_sah_revert':
                if (!bm.soulShardSahManager) {
                    const { default: SoulShardSahCreature } = await import('./Creatures/soulShardSah.js');
                    bm.soulShardSahManager = new SoulShardSahCreature(bm);
                }
                bm.soulShardSahManager.handleGuestRevert(data);
                break;

            case 'hat_of_madness_cards_added':
                if (!bm.isAuthoritative) {
                    const { handleGuestHatOfMadnessSync } = await import('./Artifacts/hatOfMadness.js');
                    handleGuestHatOfMadnessSync(data, bm);
                }
                break;

            case 'hat_of_madness_action_trigger':
                if (!bm.isAuthoritative) {
                    const { handleGuestHatOfMadnessActionSync } = await import('./Artifacts/hatOfMadness.js');
                    handleGuestHatOfMadnessActionSync(data, bm);
                }
                break;

            case 'shield_of_life_block':
                if (!bm.isAuthoritative) {
                    const { handleGuestShieldOfLifeBlock } = await import('./Artifacts/shieldOfLife.js');
                    handleGuestShieldOfLifeBlock(data, bm);
                }
                break;

            case 'shield_of_death_block':
                if (!bm.isAuthoritative) {
                    const { handleGuestShieldOfDeathBlock } = await import('./Artifacts/shieldOfDeath.js');
                    handleGuestShieldOfDeathBlock(data, bm);
                }
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

            case 'arrow_counter_consumed':
                if (bm.attackEffectsManager && bm.attackEffectsManager.arrowSystem) {
                    bm.attackEffectsManager.arrowSystem.handleGuestArrowCounterConsumed(data);
                }
                break;

            case 'elixir_cold_freeze':
                bm.attackEffectsManager.handleGuestElixirColdFreeze(data);
                break;

            case 'immortal_revival':
                if (bm.combatManager) {
                    bm.combatManager.guest_handleImmortalRevival(data);
                }
                break;

            case 'healing_potion_triggered':
                const { HealingPotion } = await import('./Potions/healingPotion.js');
                HealingPotion.guest_handleHealingTrigger(data, this.battleManager);
                break;

            case 'hero_healed':
                this.guest_handleHeroHealed(data);
                break;

            case 'time_gifted_death_action':
                if (bm.statusEffectsManager) {
                    bm.statusEffectsManager.guest_handleTimeGiftedDeathAction(data);
                }
                break;

            case 'monster_bottle_creatures_created':
                bm.guest_handleMonsterBottleCreaturesCreated(data);
                break;

            case 'sword_in_bottle_attack':
                try {
                    const { SwordInABottlePotion } = await import('./Potions/swordInABottle.js');
                    const swordInABottlePotion = new SwordInABottlePotion();
                    await swordInABottlePotion.guest_handleSwordInBottleAttack(data, this.battleManager);
                } catch (error) {
                    console.error('Error handling sword in bottle attack:', error);
                }
                break;

            case 'creature_teleported':
                if (data) {
                    const teleportationPotion = new TeleportationPowderPotion();
                    teleportationPotion.guest_handleCreatureTeleported(data, this.battleManager);
                }
                break;

            case 'heavy_hit_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('HeavyHit')) {
                    const heavyHitSpell = this.battleManager.spellSystem.spellImplementations.get('HeavyHit');
                    heavyHitSpell.handleGuestEffect(data);
                }
                break;

            case 'blow_of_the_venom_snake_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('BlowOfTheVenomSnake')) {
                    const blowOfTheVenomSnakeSpell = this.battleManager.spellSystem.spellImplementations.get('BlowOfTheVenomSnake');
                    blowOfTheVenomSnakeSpell.handleGuestEffect(data);
                }
                break;

            case 'strong_ox_headbutt_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('StrongOxHeadbutt')) {
                    const strongOxHeadbuttSpell = this.battleManager.spellSystem.spellImplementations.get('StrongOxHeadbutt');
                    strongOxHeadbuttSpell.handleGuestEffect(data);
                }
                break;

            case 'ferocious_tiger_kick_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('FerociousTigerKick')) {
                    const ferociousTigerKickSpell = this.battleManager.spellSystem.spellImplementations.get('FerociousTigerKick');
                    ferociousTigerKickSpell.handleGuestEffect(data);
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

            case 'ultimate_destroyer_punch_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('UltimateDestroyerPunch')) {
                    const ultimateDestroyerPunchSpell = this.battleManager.spellSystem.spellImplementations.get('UltimateDestroyerPunch');
                    ultimateDestroyerPunchSpell.handleGuestEffect(data);
                }
                break;

            case 'forceful_revival_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('ForcefulRevival')) {
                    const forcefulRevivalSpell = this.battleManager.spellSystem.spellImplementations.get('ForcefulRevival');
                    forcefulRevivalSpell.handleGuestEffect(data);
                }
                break;

            case 'crash_landing_triggered':
                if (this.battleManager.spellSystem?.spellImplementations.has('CrashLanding')) {
                    const crashLandingSpell = this.battleManager.spellSystem.spellImplementations.get('CrashLanding');
                    crashLandingSpell.handleGuestCrashLandingEffect(data);
                }
                break;

            case 'thieving_strike_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('ThievingStrike')) {
                    const thievingStrikeSpell = this.battleManager.spellSystem.spellImplementations.get('ThievingStrike');
                    thievingStrikeSpell.handleGuestEffect(data);
                }
                break;

            case 'trial_of_coolness_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('TrialOfCoolness')) {
                    const trialOfCoolnessSpell = this.battleManager.spellSystem.spellImplementations.get('TrialOfCoolness');
                    trialOfCoolnessSpell.handleGuestEffect(data);
                }
                break;

            case 'critical_strike_triggered':
                if (this.battleManager.spellSystem && 
                    this.battleManager.spellSystem.spellImplementations.has('CriticalStrike')) {
                    const criticalStrikeSpell = this.battleManager.spellSystem.spellImplementations.get('CriticalStrike');
                    criticalStrikeSpell.handleGuestEffect(data);
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

            case 'friendship_effects_applied':
                bm.guest_handleFriendshipEffects(data);
                break;

            case 'fireshield_frozen_immunity':
                if (this.statusEffectsManager) {
                    this.statusEffectsManager.handleGuestFireshieldFrozenImmunity(data);
                }
                break;

            case 'gathering_storm_damage':
                bm.guest_handleGatheringStormDamage(data);
                break;

            case 'tearing_mountain_active':
                import('./Spells/tearingMountain.js').then(({ handleGuestTearingMountainActive }) => {
                    handleGuestTearingMountainActive(data, this.battleManager);
                }).catch(error => {
                    // Error handling
                });
                break;

            case 'tearing_mountain_self_target':
                import('./Spells/tearingMountain.js').then(({ handleGuestTearingMountainSelfTarget }) => {
                    handleGuestTearingMountainSelfTarget(data, this.battleManager);
                }).catch(error => {
                    // Error handling
                });
                break;

            case 'graveyard_limited_power_effects':
                import('./Spells/graveyardOfLimitedPower.js').then(({ handleGuestGraveyardOfLimitedPowerEffects }) => {
                    handleGuestGraveyardOfLimitedPowerEffects(data, this.battleManager);
                }).catch(error => {
                    // Error handling
                });
                break;

            case 'doom_clock_start':
                await bm.guest_handleDoomClockStart(data);
                break;
                
            case 'doom_clock_start':
                import('./Spells/doomClock.js').then(({ handleGuestDoomClockStart }) => {
                    handleGuestDoomClockStart(data, this.battleManager);
                }).catch(error => {
                    // Error handling
                });
                break;
                
            case 'doom_clock_increment':
                import('./Spells/doomClock.js').then(({ handleGuestDoomClockIncrement }) => {
                    handleGuestDoomClockIncrement(data, this.battleManager);
                }).catch(error => {
                    // Error handling
                });
                break;
                
            case 'doom_clock_triggered':
                import('./Spells/doomClock.js').then(({ handleGuestDoomClockTriggered }) => {
                    handleGuestDoomClockTriggered(data, this.battleManager);
                }).catch(error => {
                    // Error handling
                });
                break;

            case 'doom_clock_visual_effects':
                if (data.grayOutHeroes) {
                    // Ensure we can gray out heroes even if doomClockEffect isn't initialized yet
                    if (this.battleManager.doomClockEffect) {
                        this.battleManager.doomClockEffect.grayOutAllHeroes(this.battleManager);
                    } else {
                        // Fallback: gray out heroes directly
                        const allHeroElements = document.querySelectorAll('.hero-card, .character-card');
                        allHeroElements.forEach(heroElement => {
                            heroElement.style.filter = 'grayscale(100%) brightness(0.6)';
                            heroElement.style.opacity = '0.7';
                            heroElement.style.transition = 'all 0.5s ease-out';
                        });
                    }
                }
                break;

            case 'pink_sky_start':
                import('./Spells/pinkSky.js').then(({ handleGuestPinkSkyStart }) => {
                    handleGuestPinkSkyStart(data, this.battleManager);
                }).catch(error => {
                    // Error handling
                });
                break;

            case 'big_gwen_start':
                import('./Spells/bigGwen.js').then(({ handleGuestBigGwenStart }) => {
                    handleGuestBigGwenStart(data, this.battleManager);
                }).catch(error => {
                    // Error handling
                });
                break;

            case 'future_tech_fists_shield':
                bm.guest_handleFutureTechFistsShield(data);
                break;

            case 'hero_shield_changed':
                if (bm.combatManager) {
                    bm.combatManager.guest_handleShieldChanged(data);
                }
                break;

            case 'damage_applied_with_shields':
                this.guest_handleDamageAppliedWithShields(data);
                break;

            case 'delayed_effects_cleared':
                this.guest_handleDelayedEffectsCleared(data);
                break;

            case 'request_creature_sync':
                if (bm.isAuthoritative) {
                    bm.sendCreatureStateSync();
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
        bm.addCombatLog(`🔄 Turn ${bm.currentTurn} begins`, 'info');
        
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
                `💥 ${targetName} takes ${damage} damage!)`,
                targetLocalSide === 'player' ? 'error' : 'success'
            );

            bm.updateHeroHealthBar(targetLocalSide, targetPosition, newHp, maxHp);
            bm.animationManager.createDamageNumber(targetLocalSide, targetPosition, damage, maxHp, 'attack');
            
            // ADD THIS: HP bar message for guest
            if (bm.battleScreen && bm.battleScreen.battleLog) {
                bm.battleScreen.battleLog.addHpBarMessage(localTarget, localTarget.currentHp, localTarget.maxHp);
            }
            
            if (died && oldHp > 0) {
                bm.handleHeroDeath(localTarget);
            }
        }
    }

    async guest_handleDamageAppliedWithShields(data) {
        const bm = this.battleManager;
        const { 
            targetAbsoluteSide, targetPosition, 
            totalDamage, shieldDamage, hpDamage,
            oldHp, newHp, maxHp, currentShield, died, targetName,
            healingTriggered, remainingHealingStacks  // NEW: Healing info
        } = data;
        
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const localTarget = targetLocalSide === 'player' 
            ? bm.playerHeroes[targetPosition]
            : bm.opponentHeroes[targetPosition];

        if (localTarget) {
            // Update hero HP and shield - EXACT VALUES FROM HOST
            localTarget.currentHp = newHp;
            localTarget.currentShield = currentShield;
            localTarget.alive = !died;
            
            // NEW: Handle healing if it was triggered on host side
            if (healingTriggered) {
                // Update healing potion stacks
                if (bm.statusEffectsManager) {
                    bm.statusEffectsManager.setStatusEffectStacks(localTarget, 'healthPotionReady', remainingHealingStacks);
                }
                
                // Create healing visual effect
                try {
                    const { HealingPotion } = await import('./Potions/healingPotion.js');
                    HealingPotion.createHealingVisual(localTarget, bm);
                } catch (error) {
                    console.error('Error creating healing visual:', error);
                }
                
                // Add healing combat log
                const logType = targetLocalSide === 'player' ? 'success' : 'info';
                bm.addCombatLog(
                    `💚 ${targetName}'s Healing Potion activates! (${oldHp} → ${newHp} HP)`,
                    logType
                );
            }
            
            // Create damage numbers for shield and HP separately
            if (shieldDamage > 0) {
                bm.animationManager.createDamageNumber(
                    targetLocalSide, 
                    targetPosition, 
                    shieldDamage, 
                    maxHp, 
                    'shield_damage'
                );
            }
            
            if (hpDamage > 0) {
                bm.animationManager.createDamageNumber(
                    targetLocalSide, 
                    targetPosition, 
                    hpDamage, 
                    maxHp, 
                    'attack'
                );
            }
            
            // Update health bar immediately after setting shield value and HP
            bm.updateHeroHealthBar(targetLocalSide, targetPosition, newHp, maxHp);
            
            if (bm.battleScreen && bm.battleScreen.battleLog) {
                bm.battleScreen.battleLog.addHpBarMessage(localTarget, localTarget.currentHp, localTarget.maxHp);
            }

            // DEFENSIVE: Force another update after animation delay
            setTimeout(() => {
                bm.updateHeroHealthBar(targetLocalSide, targetPosition, newHp, maxHp);
            }, 50);
            
            // Add combat log messages
            if (died) {
                if (shieldDamage > 0) {
                    bm.addCombatLog(
                        `💥 ${targetName} takes ${totalDamage} damage (${shieldDamage} to shield, ${hpDamage} to HP) and is defeated!`,
                        targetLocalSide === 'player' ? 'error' : 'success'
                    );
                } else {
                    bm.addCombatLog(
                        `💥 ${targetName} takes ${totalDamage} damage and is defeated!`,
                        targetLocalSide === 'player' ? 'error' : 'success'
                    );
                }
            } else {
                // Only show damage message if healing didn't trigger (to avoid redundant messages)
                if (!healingTriggered) {
                    if (shieldDamage > 0) {
                        bm.addCombatLog(
                            `🩸 ${targetName} takes ${totalDamage} damage (${shieldDamage} to shield, ${hpDamage} to HP)!`,
                            targetLocalSide === 'player' ? 'error' : 'success'
                        );
                    } else {
                        bm.addCombatLog(
                            `🩸 ${targetName} takes ${totalDamage} damage! (${oldHp} → ${newHp} HP)`,
                            targetLocalSide === 'player' ? 'error' : 'success'
                        );
                    }
                }
            }
            
            if (died && oldHp > 0) {
                bm.handleHeroDeath(localTarget);
            }
        }
    }

    guest_handleDelayedEffectsCleared(data) {
        const bm = this.battleManager;
        if (bm.isAuthoritative) return; // Only process on guest side
        
        const { clearedHostEffects, clearedGuestEffects, newGuestEffects } = data;
        
        // Update the guest's local heroSelection state
        if (window.heroSelection) {
            window.heroSelection.delayedEffects = newGuestEffects || [];
            
            if (clearedGuestEffects > 0) {
                bm.addCombatLog(`🧹 Cleared ${clearedGuestEffects} processed artifact effects`, 'info');
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
            return;
        }
        
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const localHero = heroLocalSide === 'player' 
            ? bm.playerHeroes[heroPosition]
            : bm.opponentHeroes[heroPosition];

        if (!localHero || !localHero.creatures) {
            return;
        }

        // IMPROVED CREATURE FINDING: Try multiple strategies with better validation
        let targetCreature = null;
        let targetCreatureIndex = -1;

        // Strategy 1: Use currentCreatureIndex with name validation
        if (currentCreatureIndex >= 0 && currentCreatureIndex < localHero.creatures.length) {
            const candidateCreature = localHero.creatures[currentCreatureIndex];
            if (candidateCreature && candidateCreature.name === creatureName && candidateCreature.currentHp === oldHp) {
                targetCreature = candidateCreature;
                targetCreatureIndex = currentCreatureIndex;
            }
        }

        // Strategy 2: Use originalCreatureIndex with name validation
        if (!targetCreature && originalCreatureIndex >= 0 && originalCreatureIndex < localHero.creatures.length) {
            const candidateCreature = localHero.creatures[originalCreatureIndex];
            if (candidateCreature && candidateCreature.name === creatureName && candidateCreature.currentHp === oldHp) {
                targetCreature = candidateCreature;
                targetCreatureIndex = originalCreatureIndex;
            }
        }

        // Strategy 3: Search by name and HP match (most reliable for guest)
        if (!targetCreature) {
            for (let i = 0; i < localHero.creatures.length; i++) {
                const creature = localHero.creatures[i];
                if (creature.name === creatureName && creature.currentHp === oldHp && creature.alive) {
                    targetCreature = creature;
                    targetCreatureIndex = i;
                    break;
                }
            }
        }

        // Strategy 4: Search by name only (last resort)
        if (!targetCreature) {
            for (let i = 0; i < localHero.creatures.length; i++) {
                const creature = localHero.creatures[i];
                if (creature.name === creatureName && creature.alive) {
                    targetCreature = creature;
                    targetCreatureIndex = i;
                    break;
                }
            }
        }

        // If we still can't find the creature, request sync
        if (!targetCreature) {
            // Request a creature state sync from host
            if (bm.gameDataSender) {
                bm.gameDataSender('battle_data', {
                    type: 'request_creature_sync',
                    data: {
                        reason: 'creature_not_found_for_damage',
                        missingCreature: creatureName,
                        heroPosition: heroPosition,
                        timestamp: Date.now()
                    }
                });
            }
            return;
        }

        // Apply necromancy array manipulation if needed
        if (necromancyArrayManipulation && necromancyArrayManipulation.moveToEnd) {
            // Remove from current position
            const creature = localHero.creatures.splice(targetCreatureIndex, 1)[0];
            // Add to end
            localHero.creatures.push(creature);
            // Update target index
            targetCreatureIndex = localHero.creatures.length - 1;
        }

        // APPLY DAMAGE to the correctly identified creature
        const actualOldHp = targetCreature.currentHp;
        targetCreature.currentHp = newHp;
        
        // Handle death and revival status
        if (died) {
            if (revivedByNecromancy) {
                // Creature died but was revived
                targetCreature.alive = true;
                bm.addCombatLog(
                    `💀 ${creatureName} takes ${damage} damage and dies!`,
                    heroLocalSide === 'player' ? 'error' : 'success'
                );
                bm.addCombatLog(
                    `✨ But ${creatureName} is revived by Necromancy!`,
                    'info'
                );
            } else {
                // Creature died and stayed dead
                targetCreature.alive = false;
                bm.addCombatLog(
                    `💀 ${creatureName} takes ${damage} damage and dies!`,
                    heroLocalSide === 'player' ? 'error' : 'success'
                );
            }
        } else {
            // Creature survived
            targetCreature.alive = true;
            bm.addCombatLog(
                `💥 ${creatureName} takes ${damage} damage! (${actualOldHp} → ${newHp} HP)`,
                heroLocalSide === 'player' ? 'error' : 'success'
            );
        }

        // Update visuals using the FINAL creature index
        const visualIndex = necromancyArrayManipulation ? finalCreatureIndex : targetCreatureIndex;
        
        bm.updateCreatureHealthBar(heroLocalSide, heroPosition, visualIndex, newHp, maxHp);
        bm.animationManager.createDamageNumberOnCreature(heroLocalSide, heroPosition, visualIndex, damage, targetCreature.maxHp, debugInfo?.damageSource || 'attack');
        
        if (bm.battleScreen && bm.battleScreen.battleLog) {
            bm.battleScreen.battleLog.addHpBarMessage(targetCreature, targetCreature.currentHp, targetCreature.maxHp);
        }

        // Handle visual death state (only if creature stayed dead)
        if (died && !revivedByNecromancy && actualOldHp > 0) {
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
                }
                if (hpText) {
                    hpText.remove();
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
                }, 100);
            }
        }
    }

    guest_handleCavalryMovements(data) {
        // Get cavalry manager from flow manager
        if (this.battleManager.flowManager && this.battleManager.flowManager.cavalryManager) {
            this.battleManager.flowManager.cavalryManager.handleGuestCavalryMovements(data);
        }
    }

    guest_handleBattlePaused(data) {
        const bm = this.battleManager;
        this.battlePaused = true;
        
        bm.addCombatLog(`⏸️ Battle paused: ${data.reason}`, 'warning');
        bm.addCombatLog(`⏳ Host is waiting for stable connection...`, 'info');
        
        this.showBattlePauseUI(data.reason || 'Connection issue');
    }

    guest_handleBattleResumed(data) {
        const bm = this.battleManager;
        this.battlePaused = false;
        
        bm.addCombatLog(`▶️ Battle resumed: ${data.reason}`, 'success');
        bm.addCombatLog(`⚔️ Battle continues...`, 'info');
        
        this.hideBattlePauseUI();
    }

    // Handle guest receiving additional action execution
    async guest_handleAdditionalActionExecution(data) {
        const bm = this.battleManager;
        
        if (bm.isAuthoritative) {
            console.warn('Host should not receive additional action execution messages');
            return;
        }

        const { 
            actorData, 
            targetData, 
            damage, 
            effectsTriggered = [], 
            criticalStrikeData,
            isRanged = false,
            timestamp 
        } = data;

        // Determine local side for guest
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const actorLocalSide = (actorData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the acting hero
        const heroes = actorLocalSide === 'player' ? bm.playerHeroes : bm.opponentHeroes;
        const actingHero = heroes[actorData.position];
        
        if (!actingHero) {
            console.error(`Additional action: Hero not found: ${actorLocalSide} ${actorData.position}`);
            return;
        }

        // Find the target
        let target = null;
        if (targetData) {
            target = this.findTargetFromActionData(targetData);
        }

        if (!target) {
            bm.addCombatLog(`🔍 ${actingHero.name} finds no targets for additional attack!`, 'info');
            return;
        }

        // Create attack object for guest-side processing
        const attack = {
            hero: actingHero,
            target: target,
            damage: damage,
            effectsTriggered: effectsTriggered,
            isRanged: isRanged,
            criticalStrikeData: criticalStrikeData
        };

        // Add to combat log
        const logType = actorLocalSide === 'player' ? 'success' : 'error';
        bm.addCombatLog(
            `⚔️ ${actingHero.name} takes an additional action!`,
            logType
        );

        // Log the attack
        if (bm.battleScreen && bm.battleScreen.battleLog) {
            bm.battleScreen.battleLog.logAttackMessage(attack);
        }

        // Execute attack animation
        await bm.animationManager.animateHeroAttack(actingHero, target);

        // Apply damage modifier visual effects if any
        if (bm.attackEffectsManager && effectsTriggered.length > 0) {
            await bm.delay(100);
            bm.attackEffectsManager.applyDamageModifierEffects(effectsTriggered);
            await bm.delay(400);
        }

        // Apply CriticalStrike visual effect if triggered
        if (criticalStrikeData && bm.spellSystem) {
            const criticalStrikeSpell = bm.spellSystem.spellImplementations.get('CriticalStrike');
            if (criticalStrikeSpell) {
                criticalStrikeSpell.createCriticalStrikeEffect(
                    attack.target.type === 'creature' ? attack.target.creature : attack.target.hero
                );
                await bm.delay(200);
            }
        }

        // Note: We don't apply damage on guest side - that's handled by the host
        // The host will send separate damage_applied messages

        // Return animation
        await bm.animationManager.animateReturn(actingHero, actorLocalSide);
        
        // Send acknowledgment that additional action animation completed
        bm.sendAcknowledgment('additional_action_complete');
    }

    /**
     * GUEST: Handle stalemate detection from host
     */
    guest_handleStalemateDetected(data) {
        const bm = this.battleManager;
        
        if (bm.isAuthoritative) {
            return; // Only process on guest side
        }
        
        const { turn, reason } = data;
        
        bm.addCombatLog('⚠️ Stalemate detected! No hero has taken damage for 20 turns.', 'warning');
        bm.addCombatLog('🤝 Battle ends in a draw!', 'info');
        
        // Set all heroes as defeated to trigger draw condition on guest side
        ['left', 'center', 'right'].forEach(position => {
            if (bm.playerHeroes[position]) {
                bm.playerHeroes[position].alive = false;
            }
            if (bm.opponentHeroes[position]) {
                bm.opponentHeroes[position].alive = false;
            }
        });
        
        // Battle will end as draw in the next checkBattleEnd() call
    }

    // Helper method to find target from action data (moved from battleCombatManager)
    findTargetFromActionData(targetData) {
        const bm = this.battleManager;
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetData.type === 'hero') {
            const heroes = targetLocalSide === 'player' ? bm.playerHeroes : bm.opponentHeroes;
            const targetHero = heroes[targetData.position];
            
            if (!targetHero) return null;
            
            return {
                type: 'hero',
                hero: targetHero,
                position: targetData.position,
                side: targetLocalSide
            };
        } else if (targetData.type === 'creature') {
            const heroes = targetLocalSide === 'player' ? bm.playerHeroes : bm.opponentHeroes;
            const targetHero = heroes[targetData.position];
            
            if (!targetHero || !targetHero.creatures) return null;
            
            const creature = targetHero.creatures[targetData.creatureIndex];
            if (!creature) return null;
            
            return {
                type: 'creature',
                hero: targetHero,
                creature: creature,
                creatureIndex: targetData.creatureIndex,
                position: targetData.position,
                side: targetLocalSide
            };
        }
        
        return null;
    }

    guest_handleHandUpdate(data) {
        const bm = this.battleManager;
        const { absoluteSide, hand } = data;
        
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const isMyHand = (absoluteSide === myAbsoluteSide);
        
        if (isMyHand) {
            bm.playerHand = hand;
        } else {
            bm.opponentHand = hand;
        }
    }

    handleDeckUpdate(data) {
        const { absoluteSide, deck } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (localSide === 'player') {
            this.battleManager.playerDeck = deck;
        } else {
            this.battleManager.opponentDeck = deck;
        }
    }

    guest_handleCreatureShakeAction(data) {
        const bm = this.battleManager;
        if (bm.isAuthoritative) return; // Only process on guest side
        
        const { position, creatureName, creatureIndex, heroSide, actionType } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        
        // Map heroSide (which is the host's perspective) to guest's local perspective
        let guestLocalSide;
        if (heroSide === 'player') {
            // Host's player side = guest's opponent side
            guestLocalSide = 'opponent';
        } else {
            // Host's opponent side = guest's player side  
            guestLocalSide = 'player';
        }
        
        // Execute shake animation on guest side
        if (bm.animationManager) {
            bm.animationManager.shakeCreature(guestLocalSide, position, creatureIndex);
        }
        
        // Add combat log message
        const logType = guestLocalSide === 'player' ? 'success' : 'error';
        bm.addCombatLog(`⚡ ${creatureName} activates!`, logType);
    }

    guest_handleCreatureStateSync(data) {
        const bm = this.battleManager;
        
        if (bm.isAuthoritative) {
            return; // Only guests should process this
        }
        
        // Add defensive check for undefined data
        if (!data) {
            return;
        }
        
        // Map absolute sides to guest's relative sides
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        
        // Guest perspective mapping:
        // - hostHeroes from sync → guest's opponentHeroes 
        // - guestHeroes from sync → guest's playerHeroes
        
        // Update guest's player heroes from the sync's guest data
        if (data.guestHeroes) {
            for (const position in data.guestHeroes) {
                if (bm.playerHeroes[position] && data.guestHeroes[position].creatures) {
                    bm.playerHeroes[position].creatures = data.guestHeroes[position].creatures;
                }
            }
        }
        
        // Update guest's opponent heroes from the sync's host data  
        if (data.hostHeroes) {
            for (const position in data.hostHeroes) {
                if (bm.opponentHeroes[position] && data.hostHeroes[position].creatures) {
                    bm.opponentHeroes[position].creatures = data.hostHeroes[position].creatures;
                }
            }
        }
        
        // Force re-render creatures on guest side
        if (bm.battleScreen && bm.battleScreen.renderCreaturesAfterInit) {
            bm.battleScreen.renderCreaturesAfterInit();
        }
        
        // Update necromancy displays
        if (bm.necromancyManager) {
            bm.necromancyManager.initializeNecromancyStackDisplays();
        }
        
        // Refresh creature visuals to show health bars
        setTimeout(() => {
            bm.refreshAllCreatureVisuals();
        }, 100);
    }

    async guest_handleBattleEnd(data) {
        const bm = this.battleManager;
        bm.battleActive = false;

        // Transfer guest-side permanent effects from battle
        if (bm.battleScreen && bm.battleScreen.transferBurningFingerStacksToPermanent) {
            bm.battleScreen.transferBurningFingerStacksToPermanent();
        }

        const { hostResult, guestResult, hostLives, guestLives, hostGold, guestGold, newTurn, permanentGuardians, permanentCaptures,
                hostPlayerCounters, guestPlayerCounters, hostRoyalCorgiBonusCards, guestRoyalCorgiBonusCards } = data;
        
        // Update turn from the battle_end message BEFORE showing rewards
        if (newTurn && bm.battleScreen && bm.battleScreen.turnTracker) {
            bm.battleScreen.turnTracker.setCurrentTurn(newTurn);
            
            // Reset ability tracking for the new turn
            if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
                window.heroSelection.heroAbilitiesManager.resetTurnBasedTracking();
            }
        }
        
        const myResult = bm.isHost ? hostResult : guestResult;
        
        // Apply battle results first
        bm.applyBattleResults(hostResult, guestResult, hostLives, guestLives, hostGold, guestGold);

        // Apply truly permanent stat bonuses to guest's formation
        if (window.heroSelection) {
            const formation = window.heroSelection.formationManager.getBattleFormation();
            const myBonuses = bm.isHost ? data.hostTrulyPermanentBonuses : data.guestTrulyPermanentBonuses;
            
            if (myBonuses) {
                ['left', 'center', 'right'].forEach(position => {
                    if (formation[position] && myBonuses[position]) {
                        formation[position].permanentAttackBonusses = myBonuses[position].permanentAttackBonusses || 0;
                        formation[position].permanentHpBonusses = myBonuses[position].permanentHpBonusses || 0;
                    }
                });
            }
        }
        
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
        
        // Use the appropriate Royal Corgi bonus sent from host
        const myRoyalCorgiBonusCards = bm.isHost ? hostRoyalCorgiBonusCards : guestRoyalCorgiBonusCards;
        
        // Actually draw the Royal Corgi bonus cards for guest
        if (myRoyalCorgiBonusCards > 0 && window.heroSelection && window.heroSelection.handManager) {
            window.heroSelection.handManager.drawCards(myRoyalCorgiBonusCards);
            
            // Show notification
            const notification = document.createElement('div');
            notification.textContent = `Royal Corgi bonus: +${myRoyalCorgiBonusCards} cards!`;
            notification.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 215, 0, 0.9);
                color: black;
                padding: 15px 25px;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
        
        // Store guest's Royal Corgi bonus for the reward system (even though we already drew the cards)
        if (window.heroSelection && window.heroSelection.cardRewardManager) {
            window.heroSelection.cardRewardManager.cachedRoyalCorgiBonusCards = 0; // Set to 0 since we already drew them
        }
        
        // Clear potion effects after battle (GUEST)
        if (window.potionHandler) {
            try {
                window.potionHandler.clearPotionEffects();
            } catch (error) {
                // Error clearing potion effects
            }
        }

        // UPDATE DECK MANAGER WITH MODIFIED DECK
        if (window.heroSelection && window.heroSelection.deckManager) {
            const playerDeck = bm.getPlayerDeck();
            
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
            const playerGraveyard = bm.getPlayerGraveyard();
            
            // Update the main graveyard manager with the modified player graveyard
            window.heroSelection.graveyardManager.importGraveyard({
                cards: playerGraveyard,
                size: playerGraveyard.length,
                timestamp: Date.now()
            });
        }
        
        // Handle permanent guardian skeletons transfer
        if (permanentGuardians && permanentGuardians.length > 0) {
            try {
                const { SkeletonKingSkullmaelCreature } = await import('./Creatures/skeletonKingSkullmael.js');
                SkeletonKingSkullmaelCreature.transferPermanentGuardiansToFormation(
                    permanentGuardians, 
                    window.heroSelection
                );
            } catch (error) {
                // Error transferring permanent guardians
            }
        }

        // After permanent guardians handling
        if (permanentCaptures && permanentCaptures.length > 0) {
            try {
                const { CaptureNetArtifact } = await import('./Artifacts/captureNet.js');
                CaptureNetArtifact.transferPermanentCapturesToFormation(
                    permanentCaptures, 
                    window.heroSelection
                );
            } catch (error) {
                // Error transferring permanent captures
            }
        }

        // RESTORE GUEST'S OWN COUNTERS
        if (window.heroSelection) {
            // Restore the guest's own player counters (not opponent counters)
            const myCounters = bm.isHost ? hostPlayerCounters : guestPlayerCounters;
            const opponentCounters = bm.isHost ? guestPlayerCounters : hostPlayerCounters;
            
            if (myCounters) {
                window.heroSelection.playerCounters = {
                    birthdayPresent: myCounters.birthdayPresent || 0,
                    teleports: myCounters.teleports || 0,
                    goldenBananas: myCounters.goldenBananas || 0,
                    evolutionCounters: myCounters.evolutionCounters !== undefined ? myCounters.evolutionCounters : 1,
                    supplyChain: myCounters.supplyChain || 0
                };
            }
            
            if (opponentCounters) {
                window.heroSelection.opponentCounters = {
                    birthdayPresent: opponentCounters.birthdayPresent || 0,
                    teleports: opponentCounters.teleports || 0,
                    goldenBananas: opponentCounters.goldenBananas || 0,
                    evolutionCounters: opponentCounters.evolutionCounters !== undefined ? opponentCounters.evolutionCounters : 1,
                    supplyChain: opponentCounters.supplyChain || 0
                };
            }
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
            return false;
        }
        
        if (!this.opponentConnected) {
            return false;
        }
        
        try {
            // 1. Pause battle simulation during sync
            const wasPaused = this.battlePaused;
            if (!wasPaused) {
                bm.addCombatLog('⏸️ Pausing battle for guest synchronization...', 'system');
                this.pauseBattle('Guest resynchronization in progress');
            }
            
            // 2. Capture complete current battle state (like checkpoint but for right now)
            const currentState = this.captureCurrentBattleState();
            if (!currentState) {
                return false;
            }
            
            bm.addCombatLog('📤 Sending current battle state to guest...', 'system');
            
            // 3. Send complete state to guest
            this.sendBattleData('resync_battle_state', {
                battleState: currentState,
                resyncId: `resync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                timestamp: Date.now(),
                hostTurn: bm.currentTurn,
                message: 'Host requesting guest resynchronization'
            });
            
            // 4. Wait for guest acknowledgment (longer timeout for full state restore)
            const ackReceived = await this.waitForGuestAcknowledgment('resync_complete', 10000); // 10 second timeout
            
            if (!ackReceived) {
                bm.addCombatLog('⚠ Guest resync failed - no acknowledgment received', 'error');
                
                // Resume battle anyway if it wasn't originally paused
                if (!wasPaused && this.opponentConnected) {
                    this.resumeBattle('Resync failed but guest appears connected');
                }
                return false;
            }
            
            // 5. Resync successful
            bm.addCombatLog('✅ Guest successfully resynchronized to current battle state', 'success');
            
            // 6. Resume battle if it wasn't originally paused
            if (!wasPaused && this.opponentConnected) {
                setTimeout(() => {
                    this.resumeBattle('Guest resynchronization completed');
                }, 500); // Small delay to ensure guest is fully ready
            }
            
            return true;
            
        } catch (error) {
            bm.addCombatLog('⚠ Guest resync failed due to error', 'error');
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
                    return currentCheckpoint;
                }
            }
            
            return null;
            
        } catch (error) {
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
            return;
        }
        
        bm.addCombatLog('🔥 Receiving updated battle state from host...', 'system');
        
        try {
            const { battleState, resyncId, hostTurn, message } = data;
            
            if (!battleState) {
                return;
            }
            
            bm.addCombatLog(`ℹ️ ${message}`, 'info');
            bm.addCombatLog(`🔄 Syncing to host turn ${hostTurn}...`, 'system');
            
            // Apply the complete battle state (like checkpoint restoration)
            const restored = await this.applyResyncBattleState(battleState);
            
            if (restored) {
                bm.addCombatLog('✅ Battle state synchronized with host!', 'success');
                
                // Send acknowledgment to host
                this.sendAcknowledgment('resync_complete');
                
            } else {
                bm.addCombatLog('⚠ Failed to synchronize with host state', 'error');
            }
            
        } catch (error) {
            bm.addCombatLog('⚠ Error during resynchronization', 'error');
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
                
                // The battleState should be a complete checkpoint
                const restored = await bm.checkpointSystem.restoreFromCheckpoint(battleState);
                
                if (restored) {
                    
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
            
            return false;
            
        } catch (error) {
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
    }

    /**
     * HOST: Handle guest desync signal
     * @param {Object} data - Desync signal from guest
     */
    async guest_handleDesyncSignal(data) {
        const bm = this.battleManager;
        
        if (!bm.isAuthoritative) {
            return;
        }
               
        const { guestTurn, message, reason } = data;
                
        // Immediately resync the guest
        const success = await this.resyncGuest();
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
                `💪 ${heroName} gains +${bonusAmount} attack from ${source}!`,
                logType
            );
            
        } else if (bonusType === 'hp') {
            hero.addBattleHpBonus(bonusAmount);
            
            // Update the health display
            bm.updateHeroHealthBar(heroLocalSide, heroPosition, hero.currentHp, hero.maxHp);
            
            // Add to combat log
            const logType = heroLocalSide === 'player' ? 'success' : 'info';
            bm.addCombatLog(
                `❤️ ${heroName} gains +${bonusAmount} HP from ${source}!`,
                logType
            );
        }
    }

    guest_handleCarrisTimeLimit(data) {
        const bm = this.battleManager;
        if (bm.isAuthoritative) return; // Only process on guest side
        
        // Import and use the Carris handler
        import('./Heroes/carris.js').then(({ CarrisHeroEffect }) => {
            CarrisHeroEffect.handleGuestCarrisTimeLimit(data, bm);
        }).catch(error => {
            console.error('Error handling Carris time limit:', error);
        });
    }

    guest_handleHeroHealed(data) {
        const bm = this.battleManager;
        const { targetAbsoluteSide, targetPosition, healing, oldHp, newHp, maxHp, targetName } = data;
        
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const localTarget = targetLocalSide === 'player' 
            ? bm.playerHeroes[targetPosition]
            : bm.opponentHeroes[targetPosition];

        if (localTarget) {
            localTarget.currentHp = newHp;
            
            bm.addCombatLog(
                `💚✨💊 ${targetName} healed for ${healing} HP! (${oldHp} → ${newHp})`,
                targetLocalSide === 'player' ? 'success' : 'info'
            );

            bm.updateHeroHealthBar(targetLocalSide, targetPosition, newHp, maxHp);
            bm.animationManager.createDamageNumber(targetLocalSide, targetPosition, healing, maxHp, 'healing');
        }
    }

    guest_handleCreatureHealed(data) {
        const bm = this.battleManager;
        const { 
            heroAbsoluteSide, heroPosition, 
            creatureIndex, creatureName,
            healing, oldHp, newHp, maxHp
        } = data;
        
        const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const localHero = heroLocalSide === 'player' 
            ? bm.playerHeroes[heroPosition]
            : bm.opponentHeroes[heroPosition];

        if (localHero && localHero.creatures && localHero.creatures[creatureIndex]) {
            const creature = localHero.creatures[creatureIndex];
            creature.currentHp = newHp;
            
            bm.addCombatLog(
                `💚✨💊 ${creatureName} healed for ${healing} HP! (${oldHp} → ${newHp})`,
                heroLocalSide === 'player' ? 'success' : 'info'
            );

            bm.updateCreatureHealthBar(heroLocalSide, heroPosition, creatureIndex, newHp, maxHp);
            bm.animationManager.createDamageNumberOnCreature(heroLocalSide, heroPosition, creatureIndex, healing, maxHp, 'healing');
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
        
        // ADDED: Reset battle loop tracking
        this.battleLoopRunning = false;
        
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