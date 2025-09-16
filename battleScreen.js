// battleScreen.js - Battle Screen Module with BattleLog Integration and Ability Synchronization
// UPDATED: Uses pre-calculated Hero stats instead of recalculating

import BattleManager from './battleManager.js';
import { BattleLog } from './battleLog.js';
import { getCardInfo } from './cardDatabase.js';

export class BattleScreen {
    constructor() {
        this.isHost = false;
        this.playerFormation = null;
        this.opponentFormation = null;
        this.gameDataSender = null;
        this.roomManager = null;
        this.lifeManager = null;
        this.goldManager = null;
        this.turnTracker = null;
        this.playerAbilities = null;
        this.opponentAbilities = null;
        
        // Initialize BattleLog instance
        this.battleLog = new BattleLog('combatLog', 1000);
        
        // Initialize battle manager with synchronization support
        this.battleManager = new BattleManager();
    }

    // Speed-aware delay method
    getSpeedAdjustedDelay(ms) {
        if (this.battleManager && this.battleManager.speedManager) {
            return this.battleManager.speedManager.calculateAdjustedDelay(ms);
        } else if (this.battleManager && this.battleManager.battleSpeed) {
            return Math.max(1, Math.floor(ms / this.battleManager.battleSpeed));
        }
        return ms;
    }

    // Speed-aware async delay method
    async delay(ms) {
        const adjustedMs = this.getSpeedAdjustedDelay(ms);
        return new Promise(resolve => setTimeout(resolve, adjustedMs));
    }

    // Initialize battle screen with abilities
    init(isHost, playerFormation, opponentFormation, gameDataSender, roomManager, 
        lifeManager, goldManager, turnTracker, roomManagerForPersistence = null,
        playerAbilities = null, opponentAbilities = null,
        playerSpellbooks = null, opponentSpellbooks = null,
        actionManager = null,
        playerCreatures = null, opponentCreatures = null,
        playerEquips = null, opponentEquips = null,
        playerEffectiveStats = null, opponentEffectiveStats = null,
        playerPermanentArtifacts = null, opponentPermanentArtifacts = null,
        playerHand = null, opponentHand = null,
        playerDeck = null, opponentDeck = null,
        playerAreaCard = null, opponentAreaCard = null,
        playerGraveyard = null, opponentGraveyard = null,
        playerCounters = null, opponentCounters = null) { 
            
        this.isHost = isHost;
        this.playerFormation = playerFormation;
        this.opponentFormation = opponentFormation;
        this.gameDataSender = gameDataSender;
        this.roomManager = roomManager;
        this.lifeManager = lifeManager;
        this.goldManager = goldManager;
        this.turnTracker = turnTracker;
        this.playerAbilities = playerAbilities;
        this.opponentAbilities = opponentAbilities;
        this.playerSpellbooks = playerSpellbooks;
        this.opponentSpellbooks = opponentSpellbooks;
        this.playerCreatures = playerCreatures;  
        this.opponentCreatures = opponentCreatures;
        this.playerEquips = playerEquips;
        this.opponentEquips = opponentEquips;
        this.playerPermanentArtifacts = playerPermanentArtifacts || [];
        this.opponentPermanentArtifacts = opponentPermanentArtifacts || [];
        this.playerHand = playerHand || [];
        this.opponentHand = opponentHand || [];
        this.playerDeck = playerDeck || [];
        this.opponentDeck = opponentDeck || [];
        this.playerGraveyard = playerGraveyard || [];
        this.opponentGraveyard = opponentGraveyard || [];
        this.playerAreaCard = playerAreaCard;
        this.opponentAreaCard = opponentAreaCard;
        this.playerCounters = playerCounters || { birthdayPresent: 0 };
        this.opponentCounters = opponentCounters || { birthdayPresent: 0 };

        // Initialize battle manager with abilities and creatures
        this.battleManager.init(
            playerFormation, opponentFormation,
            gameDataSender,
            isHost,
            this,
            lifeManager,
            goldManager,
            (result) => this.onBattleEnd(result),
            roomManagerForPersistence || roomManager,
            playerAbilities, opponentAbilities,
            playerSpellbooks, opponentSpellbooks,
            playerCreatures,  opponentCreatures,
            playerEquips, opponentEquips,
            playerEffectiveStats, opponentEffectiveStats,
            this.playerPermanentArtifacts, this.opponentPermanentArtifacts,
            this.playerHand, this.opponentHand,
            this.playerDeck, this.opponentDeck,
            this.playerAreaCard, this.opponentAreaCard,
            this.playerGraveyard, this.opponentGraveyard,
            this.playerCounters, this.opponentCounters  
        );
    }

    // Show battle arena
    showBattleArena() {
        // Hide team building UI
        const heroSelectionScreen = document.querySelector('.hero-selection-screen');
        if (heroSelectionScreen) {
            heroSelectionScreen.style.display = 'none';
        }
        
        // Create and show battle screen
        this.createBattleScreen();
    }

    // Start the battle directly with speed-aware delays and ability synchronization
    async startBattle() {        
        // Send current formation to opponent BEFORE battle initialization
        if (!this.isHost && window.heroSelection && window.heroSelection.sendFormationUpdate) {
            await window.heroSelection.sendFormationUpdate();
            // Add a small delay to ensure host receives the update
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Only the host should initiate the battle
        if (this.isHost) {
            // Set game phase to Battle when battle starts
            if (window.heroSelection && window.heroSelection.reconnectionManager) {
                window.heroSelection.reconnectionManager.setGamePhaseToBattle();
            }
            
            setTimeout(() => {
                // Re-render creatures after battle manager init
                this.renderCreaturesAfterInit();
                
                // Initialize necromancy stacks and displays
                if (this.battleManager.necromancyManager) {
                    // Initialize necromancy stacks for all heroes
                    this.battleManager.necromancyManager.initializeNecromancyStacks();
                    // Initialize visual displays
                    this.battleManager.necromancyManager.initializeNecromancyStackDisplays();
                }
                
                // Initialize speed control UI
                const speedUISuccess = this.initializeSpeedControlUI();
                if (!speedUISuccess) {
                    // Try to add a fallback message to the battle center
                    const battleCenter = document.getElementById('battleCenter');
                    if (battleCenter) {
                        battleCenter.innerHTML = `
                            <div class="speed-control-error">
                                <p>⚠️ Speed controls unavailable</p>
                                <p style="font-size: 12px; color: #aaa;">Host: ${this.isHost}, BM: ${!!this.battleManager}, SM: ${!!(this.battleManager && this.battleManager.speedManager)}</p>
                            </div>
                        `;
                    }
                }
                
                // Get latest abilities right before battle starts
                const latestPlayerAbilities = this.getLatestPlayerAbilities();
                const latestPlayerSpellbooks = this.getLatestPlayerSpellbooks();
                const latestPlayerCreatures = this.getLatestPlayerCreatures();
                const latestPlayerEquipment = this.getLatestPlayerEquipment();
                const latestPlayerEffectiveStats = this.getLatestPlayerEffectiveStats();
                const latestPlayerHand = this.getLatestPlayerHand();
                const latestPlayerDeck = this.getLatestPlayerDeck();
                const latestPlayerGraveyard = this.getLatestPlayerGraveyard();
                const latestPlayerAreaCard = this.getLatestPlayerAreaData();

                // Update battle manager with latest player data
                this.updateBattleManagerPlayerData(latestPlayerAbilities, latestPlayerSpellbooks, latestPlayerCreatures, latestPlayerEquipment, latestPlayerHand, latestPlayerDeck, latestPlayerGraveyard, latestPlayerAreaCard); 

                // Also update effective stats
                this.playerEffectiveStats = latestPlayerEffectiveStats;
                this.battleManager.playerEffectiveStats = latestPlayerEffectiveStats;

                // Start the synchronized battle
                this.battleManager.startBattle();

                // Notify guest to start with current ability state
                if (this.gameDataSender) {
                    this.gameDataSender('battle_start', {
                        timestamp: Date.now(),
                        synchronized: true,
                        hostAbilities: latestPlayerAbilities,
                        hostSpellbooks: latestPlayerSpellbooks,
                        hostCreatures: latestPlayerCreatures,
                        hostEquipment: latestPlayerEquipment,
                        hostEffectiveStats: latestPlayerEffectiveStats,
                        hostFormation: this.playerFormation,
                        hostHand: latestPlayerHand,
                        hostDeck: latestPlayerDeck,
                        hostBirthdayPresentCounter: this.playerBirthdayPresentCounter 
                    });
                }
            }, this.getSpeedAdjustedDelay(500));
        }
    }

    getLatestPlayerHand() {
        if (window.heroSelection && window.heroSelection.handManager) {
            return window.heroSelection.handManager.getHand();
        }
        return this.playerHand || [];
    }

    getLatestPlayerDeck() {
        if (window.heroSelection && window.heroSelection.deckManager) {
            return window.heroSelection.deckManager.getDeck();
        }
        return this.playerDeck || [];
    }

    getLatestPlayerGraveyard() {
        if (window.heroSelection && window.heroSelection.graveyardManager) {
            return window.heroSelection.graveyardManager.getGraveyard();
        }
        return this.playerGraveyard || [];
    }

    getLatestOpponentGraveyard() {
        return this.opponentGraveyardData || [];
    }

    // Helper method to get current player abilities from heroSelection
    getLatestPlayerAbilities() {
        if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
            const abilitiesManager = window.heroSelection.heroAbilitiesManager;
            const latestAbilities = {};
            
            // Get abilities for each position
            ['left', 'center', 'right'].forEach(position => {
                const heroAbilities = abilitiesManager.getHeroAbilities(position);
                if (heroAbilities && this.hasHeroAtPosition(position)) {
                    latestAbilities[position] = heroAbilities;
                }
            });
            return latestAbilities;
        }
        
        return this.playerAbilities;
    }

    // Helper method to get current player spellbooks
    getLatestPlayerSpellbooks() {
        if (window.heroSelection && window.heroSelection.heroSpellbookManager) {
            const spellbookManager = window.heroSelection.heroSpellbookManager;
            const latestSpellbooks = {};
            
            // Get spellbooks for each position
            ['left', 'center', 'right'].forEach(position => {
                const heroSpellbook = spellbookManager.getHeroSpellbook(position);
                if (heroSpellbook && this.hasHeroAtPosition(position)) {
                    latestSpellbooks[position] = heroSpellbook;
                }
            });
            return latestSpellbooks;
        }
        
        return this.playerSpellbooks;
    }

    // Helper method to get current player creatures
    getLatestPlayerCreatures() {
        if (window.heroSelection && window.heroSelection.heroCreatureManager) {
            const creatureManager = window.heroSelection.heroCreatureManager;
            const latestCreatures = {};
            
            // Get creatures for each position
            ['left', 'center', 'right'].forEach(position => {
                const heroCreatures = creatureManager.getHeroCreatures(position);
                if (heroCreatures && this.hasHeroAtPosition(position)) {
                    latestCreatures[position] = heroCreatures;
                }
            });
            
            return latestCreatures;
        }
        
        return this.playerCreatures;
    }

    // Helper method to get current player equipment
    getLatestPlayerEquipment() {
        if (window.heroSelection && window.heroSelection.heroEquipmentManager) {
            const equipmentManager = window.heroSelection.heroEquipmentManager;
            const latestEquipment = {};
            
            // Get equipment for each position
            ['left', 'center', 'right'].forEach(position => {
                const heroEquipment = equipmentManager.getHeroEquipment(position);
                if (heroEquipment && this.hasHeroAtPosition(position)) {
                    latestEquipment[position] = heroEquipment;
                }
            });
            
            return latestEquipment;
        }
        
        return this.playerEquips;
    }

    getLatestPlayerEffectiveStats() {
        if (!window.heroSelection) {
            return {};
        }
        
        const effectiveStats = {};
        
        // Get current effective stats for each position (already calculated!)
        ['left', 'center', 'right'].forEach(position => {
            if (this.hasHeroAtPosition(position)) {
                const stats = window.heroSelection.calculateEffectiveHeroStats(position);
                if (stats) {
                    effectiveStats[position] = stats;
                }
            }
        });
        
        return effectiveStats;
    }

    getLatestPlayerAreaData() {
        if (window.heroSelection && window.heroSelection.areaHandler) {
            const areaCard = window.heroSelection.areaHandler.getAreaCard();
            if (areaCard && areaCard.name === 'GatheringStorm') {
                // Ensure counter data is preserved
                return {
                    ...areaCard,
                    stormCounters: areaCard.stormCounters || 1
                };
            }
            return areaCard;
        }
        return this.playerAreaCard;
    }

    // Helper method to check if there's a hero at a position
    hasHeroAtPosition(position) {
        return this.playerFormation && this.playerFormation[position] && this.playerFormation[position] !== null;
    }

    // Helper method to update battle manager with latest player data
    updateBattleManagerPlayerData(abilities, spellbooks, creatures, equipment, hand = null, deck = null, graveyard = null, areaCard = null) {
        if (this.battleManager) {
            // Update stored data
            this.playerAbilities = abilities;
            this.playerSpellbooks = spellbooks;
            this.playerCreatures = creatures;
            this.playerEquips = equipment;
            if (hand !== null) {
                this.playerHand = hand;
            }
            if (deck !== null) {
                this.playerDeck = deck;
            }
            if (graveyard !== null) {
                this.playerGraveyard = graveyard;
            }
            if (areaCard !== null) {
                this.playerAreaCard = areaCard;
            }
            
            // Update battle manager references
            this.battleManager.playerAbilities = abilities;
            this.battleManager.playerSpellbooks = spellbooks;
            this.battleManager.playerCreatures = creatures;
            this.battleManager.playerEquips = equipment;
            if (hand !== null) {
                this.battleManager.playerHand = hand;
            }
            if (deck !== null) {
                this.battleManager.playerDeck = deck;
            }
            if (graveyard !== null) {
                this.battleManager.playerGraveyard = graveyard;
            }
            if (areaCard !== null) {
                this.battleManager.playerAreaCard = areaCard;
            }
        }
    }

    // Updated receiveBattleStart method to handle ability synchronization
    receiveBattleStart(data) {
        if (!this.isHost && this.battleManager) {
            
            // Sync all host data as opponent data
            if (data.hostAbilities) {
                this.opponentAbilities = data.hostAbilities;
                this.battleManager.opponentAbilities = data.hostAbilities;
            }
            
            if (data.hostSpellbooks) {
                this.opponentSpellbooks = data.hostSpellbooks;
                this.battleManager.opponentSpellbooks = data.hostSpellbooks;
            }
            
            if (data.hostCreatures) {
                this.opponentCreatures = data.hostCreatures;
                this.battleManager.opponentCreatures = data.hostCreatures;
            }
            
            if (data.hostEquipment) {
                this.opponentEquips = data.hostEquipment;
                this.battleManager.opponentEquips = data.hostEquipment;
            }

            if (data.hostPermanentArtifacts) {
                this.opponentPermanentArtifactsData = data.hostPermanentArtifacts;
            }
            
            if (data.hostEffectiveStats) {
                this.opponentEffectiveStats = data.hostEffectiveStats;
                this.battleManager.opponentEffectiveStats = data.hostEffectiveStats;
            }
            
            if (data.hostFormation) {
                this.opponentFormation = data.hostFormation;
                this.battleManager.opponentFormation = data.hostFormation;
            }
            
            if (data.hostHand) {
                this.opponentHand = data.hostHand;
                this.battleManager.opponentHand = data.hostHand;
            }
            if (data.hostDeck) {
                this.opponentDeck = data.hostDeck;
                this.battleManager.opponentDeck = data.hostDeck;
            }
            if (data.hostGraveyard) {
                this.opponentGraveyard = data.hostGraveyard;
                this.battleManager.opponentGraveyard = data.hostGraveyard;
            }

            if (data.hostBirthdayPresentCounter !== undefined) {
                this.opponentBirthdayPresentCounter = data.hostBirthdayPresentCounter;
                this.battleManager.opponentBirthdayPresentCounter = data.hostBirthdayPresentCounter;
            }
            
            // Get guest's own latest data
            const guestStats = this.getLatestPlayerEffectiveStats();
            const guestAbilities = this.getLatestPlayerAbilities();
            const guestSpellbooks = this.getLatestPlayerSpellbooks();
            const guestCreatures = this.getLatestPlayerCreatures();
            const guestEquipment = this.getLatestPlayerEquipment();
            const guestHand = this.getLatestPlayerHand();
            const guestDeck = this.getLatestPlayerDeck();
            const guestGraveyard = this.getLatestPlayerGraveyard();

            // Update guest's own data in battle manager
            this.playerAbilities = guestAbilities;
            this.playerSpellbooks = guestSpellbooks;
            this.playerCreatures = guestCreatures;
            this.playerEquips = guestEquipment;
            this.playerHand = guestHand;
            this.playerDeck = guestDeck;
            this.playerGraveyard = guestGraveyard; 
            this.playerEffectiveStats = guestStats;
            
            this.battleManager.playerAbilities = guestAbilities;
            this.battleManager.playerSpellbooks = guestSpellbooks;
            this.battleManager.playerCreatures = guestCreatures;
            this.battleManager.playerEquips = guestEquipment;
            this.battleManager.playerHand = guestHand;
            this.battleManager.playerDeck = guestDeck;
            this.battleManager.playerGraveyard = guestGraveyard;
            this.battleManager.playerEffectiveStats = guestStats;

            const guestFormationWithPersistentData = this.preservePersistentDataInFormation(
                window.heroSelection.formationManager.getBattleFormation()
            );

            // Send guest data back to host
            if (this.gameDataSender) {
                this.gameDataSender('battle_data', {
                    type: 'guest_abilities_sync',
                    data: {
                        guestAbilities,
                        guestSpellbooks,
                        guestCreatures,
                        guestEquipment,
                        guestEffectiveStats: guestStats, 
                        guestBattleFormation: guestFormationWithPersistentData,
                        guestHand,
                        guestDeck,
                        guestGraveyard,
                        guestBirthdayPresentCounter: window.heroSelection?.birthdayPresentCounter || 0,
                        timestamp: Date.now()
                    }
                });
            }
            
            // Re-initialize player heroes with guest's own data including equipment
            if (this.battleManager.playerFormation) {
                this.battleManager.initializeHeroesForSide(
                    'player', 
                    this.battleManager.playerFormation, 
                    this.battleManager.playerHeroes, 
                    guestAbilities,
                    guestSpellbooks,
                    guestCreatures,
                    guestEquipment,  // Ensure equipment is included
                    'guest',
                    guestStats
                );
            }
            
            // Re-initialize opponent heroes with synced host data including equipment
            if (this.battleManager.opponentFormation && (
                this.battleManager.opponentAbilities || 
                this.battleManager.opponentSpellbooks || 
                this.battleManager.opponentCreatures || 
                this.battleManager.opponentEquips ||
                this.battleManager.opponentEffectiveStats)) {
                
                this.battleManager.initializeHeroesForSide(
                    'opponent', 
                    this.battleManager.opponentFormation, 
                    this.battleManager.opponentHeroes, 
                    this.battleManager.opponentAbilities,
                    this.battleManager.opponentSpellbooks,
                    this.battleManager.opponentCreatures,
                    this.battleManager.opponentEquips,  // Ensure equipment is included
                    'host',
                    this.battleManager.opponentEffectiveStats
                );
            }
            
            // Initialize necromancy displays
            if (this.battleManager.necromancyManager) {
                this.battleManager.necromancyManager.initializeNecromancyStackDisplays();
            }
            
            // Initialize speed control UI
            this.initializeSpeedControlUI();
            
            // Start battle with all data ready
            this.battleManager.startBattle();
        }
    }

    preservePersistentDataInFormation(formation) {
        if (!formation || !window.heroSelection) return formation;
        
        // Get the current formation with persistent data from heroSelection
        const currentFormation = window.heroSelection.formationManager.getBattleFormation();
        
        // Preserve persistent properties like burningFingerStack
        ['left', 'center', 'right'].forEach(position => {
            if (formation[position] && currentFormation[position]) {
                // Copy persistent properties
                if (currentFormation[position].burningFingerStack !== undefined) {
                    formation[position].burningFingerStack = currentFormation[position].burningFingerStack;
                }
                // Add other persistent properties here as needed
            }
        });
        
        return formation;
    }

    // Receive battle data from opponent with acknowledgment support
    receiveBattleData(data) {
        // Handle battle start message
        if (data.type === 'battle_start') {
            this.receiveBattleStart(data.data || data);
            return;
        }
        
        // Handle guest abilities sync message at battleScreen level
        if (data.type === 'guest_abilities_sync') {
            this.receiveGuestAbilitiesSync(data.data || data);
            return;
        }

        // Handle Sid card theft
        if (data.type === 'sid_card_theft') {
            if (window.heroSelection) {
                import('./Heroes/sid.js').then(({ sidHeroEffect }) => {
                    sidHeroEffect.handleOpponentTheft(data.data || data, window.heroSelection);
                });
            }
            return;
        }
        
        // Route all other battle messages to the battle manager
        if (this.battleManager) {
            this.battleManager.receiveBattleData(data);
        }
    }

    receiveGuestAbilitiesSync(data) {
        if (this.isHost) {
            // Update all opponent data
            if (data.guestAbilities) {
                this.opponentAbilities = data.guestAbilities;
                this.battleManager.opponentAbilities = data.guestAbilities;
            }
            
            if (data.guestSpellbooks) {
                this.opponentSpellbooks = data.guestSpellbooks;
                this.battleManager.opponentSpellbooks = data.guestSpellbooks;
            }
            
            if (data.guestCreatures) {
                this.opponentCreatures = data.guestCreatures;
                this.battleManager.opponentCreatures = data.guestCreatures;
            }
            
            if (data.guestEquipment) {
                this.opponentEquips = data.guestEquipment;
                this.battleManager.opponentEquips = data.guestEquipment;
            }

            if (data.guestEffectiveStats) {
                this.opponentEffectiveStats = data.guestEffectiveStats;
                this.battleManager.opponentEffectiveStats = data.guestEffectiveStats;
            }

            if (data.guestHand) {
                this.opponentHand = data.guestHand;
                this.battleManager.opponentHand = data.guestHand;
            }
            if (data.guestDeck) {
                this.opponentDeck = data.guestDeck;
                this.battleManager.opponentDeck = data.guestDeck;
            }
            if (data.guestGraveyard) {
                this.opponentGraveyard = data.guestGraveyard;
                this.battleManager.opponentGraveyard = data.guestGraveyard;
            }

            if (data.guestBattleFormation) {
                this.opponentFormation = data.guestBattleFormation;
                this.battleManager.opponentFormation = data.guestBattleFormation;
            }
            if (data.guestBirthdayPresentCounter !== undefined) {
                this.opponentBirthdayPresentCounter = data.guestBirthdayPresentCounter;
                this.battleManager.opponentBirthdayPresentCounter = data.guestBirthdayPresentCounter;
            }

            
            // Re-initialize opponent heroes with all synced data
            if (this.battleManager) {
                this.battleManager.initializeHeroesForSide(
                    'opponent', 
                    this.battleManager.opponentFormation, 
                    this.battleManager.opponentHeroes, 
                    this.battleManager.opponentAbilities,
                    this.battleManager.opponentSpellbooks,
                    this.battleManager.opponentCreatures,
                    this.battleManager.opponentEquips,
                    'guest',
                    this.battleManager.opponentEffectiveStats
                );
                
                // Re-initialize arrow counters for all arrow types after equipment sync
                if (this.battleManager.attackEffectsManager && 
                    this.battleManager.attackEffectsManager.arrowSystem) {
                    this.battleManager.attackEffectsManager.arrowSystem.initializeArrowCounters();
                }
            }
        }
    }

    // Handle battle end
    async onBattleEnd(result) {      
        // THIS METHOD IS ONLY CALLED BY HOST!!!
          
        // Show card rewards with the battle result
        setTimeout(() => {
            this.showCardRewardsAndReturn(result);
        }, 0);
    }

    transferBurningFingerStacksToPermanent() {
        
        if (!window.heroSelection || !window.heroSelection.formationManager) {
            return;
        }
        
        const formation = window.heroSelection.formationManager.getBattleFormation();
        
        ['left', 'center', 'right'].forEach(position => {
            const battleHero = this.battleManager.playerHeroes[position];
            const permanentHero = formation[position];
            
            if (battleHero && permanentHero && battleHero.burningFingerStack !== undefined) {
                const oldPermanentStacks = permanentHero.burningFingerStack || 0;
                permanentHero.burningFingerStack = battleHero.burningFingerStack;
            }
        });
        
        // Save the updated permanent hero state
        if (window.heroSelection.saveGameState) {
            window.heroSelection.saveGameState().then(async () => {
                // Send updated formation to opponent
                if (window.heroSelection.sendFormationUpdate) {
                    await window.heroSelection.sendFormationUpdate();
                }
            });
        }
    }
    
    // Increment turn after battle
    async incrementTurnAfterBattle() {
        if (this.turnTracker) {
            try {
                await this.turnTracker.incrementTurn();

                // Reset ability tracking for the new turn
                if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
                    window.heroSelection.heroAbilitiesManager.resetTurnBasedTracking();
                }
            } catch (error) {
                // Silently handle error
            }
        }
    }
    
    // Show card rewards then return to formation with speed-aware delays
    async showCardRewardsAndReturn(result) {
        
        if (window.heroSelection && window.heroSelection.cardRewardManager) {
            try {
                // Pass the battle result to the reward manager
                await window.heroSelection.cardRewardManager.showRewardsAfterBattle(
                    window.heroSelection.turnTracker,
                    window.heroSelection,
                    result // Ensure battle result is passed
                );
            } catch (error) {
                this.returnToFormationScreen();
            }
        } else {
            this.returnToFormationScreen();
        }
    }

    // Clear tooltips before transition
    clearTooltipsBeforeTransition() {
        // Clear battle-specific tooltips
        const battleTooltips = document.querySelectorAll(`
            .battle-card-tooltip,
            .preview-card-display,
            #battleCardPreview .preview-card-display,
            .hero-abilities-debug
        `);
        
        battleTooltips.forEach(tooltip => tooltip.remove());
        
        // Clear any card preview content in battle interface
        const previewArea = document.getElementById('battleCardPreview');
        if (previewArea) {
            previewArea.innerHTML = `
                <div class="preview-placeholder">
                    <div class="preview-icon">👁️</div>
                    <p>Hover over any card to preview</p>
                </div>
            `;
        }
        
        // Use hero selection's comprehensive cleanup if available
        if (window.heroSelection && typeof window.heroSelection.clearAllTooltips === 'function') {
            window.heroSelection.clearAllTooltips();
        }
        
        // Clear global battle tooltip functions
        if (typeof window !== 'undefined') {
            window.showBattleCardPreview = null;
            window.hideBattleCardPreview = null;
            window.showHeroInBattleTooltip = null;
            window.hideHeroInBattleTooltip = null;
        }
    }

    // Return to formation screen with better state management
    returnToFormationScreen() {
        // Clear all tooltips before transition
        this.clearTooltipsBeforeTransition();
        
        // Show surrender button when returning to formation
        this.showSurrenderButton();
        
        // Use the new returnToFormationScreenAfterBattle method with state cleanup
        if (window.heroSelection && typeof window.heroSelection.returnToFormationScreenAfterBattle === 'function') {
            window.heroSelection.returnToFormationScreenAfterBattle();
        } else {
            // Fallback to basic method if new one isn't available
            this.basicReturnToFormationScreen();
        }
    }

    // Basic return method (kept as backup)
    basicReturnToFormationScreen() {
        // Hide battle arena
        const battleArena = document.getElementById('battleArena');
        if (battleArena) {
            battleArena.style.display = 'none';
        }
        
        // Show hero selection screen
        const heroSelectionScreen = document.querySelector('.hero-selection-screen');
        if (heroSelectionScreen) {
            heroSelectionScreen.style.display = 'flex';
        }
        
        // ADDED: Show surrender button when returning to formation
        this.showSurrenderButton();
        
        // Update UI to show team building
        if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
            window.updateHeroSelectionUI();
        }
        
        // Update deck display immediately
        if (window.heroSelection && typeof window.heroSelection.updateDeckDisplay === 'function') {
            window.heroSelection.updateDeckDisplay();
        }
        
        // Re-enable the To Battle button
        const toBattleBtn = document.querySelector('.to-battle-button');
        if (toBattleBtn) {
            toBattleBtn.disabled = false;
        }
        
        // Clear battle ready states in Firebase
        if (this.roomManager && this.roomManager.getRoomRef()) {
            this.roomManager.getRoomRef().child('gameState').update({
                hostBattleReady: false,
                guestBattleReady: false,
                battleStarted: false,
                battleStartTime: null
            }).catch(error => {
                // Silently handle error
            });
        }
    }

    // Create the battle screen layout with enhanced hero display
    createBattleScreen() {
        const gameScreen = document.getElementById('gameScreen');
        if (!gameScreen) {
            return;
        }
        
        // Create battle arena container
        let battleArena = document.getElementById('battleArena');
        if (!battleArena) {
            battleArena = document.createElement('div');
            battleArena.id = 'battleArena';
            battleArena.className = 'battle-arena';
            gameScreen.appendChild(battleArena);
        }
        
        // Generate battle screen HTML
        const battleHTML = this.generateBattleScreenHTML();
        
        if (!battleHTML || battleHTML.trim() === '') {
            return;
        }
        
        battleArena.innerHTML = battleHTML;
        battleArena.style.display = 'block';
        
        // Initialize BattleLog after DOM is ready
        setTimeout(() => {
            const logInitialized = this.battleLog.init();
            if (logInitialized) {
                // Add initial welcome messages
                this.battleLog.addMessage('🎯 Battle ready with abilities!', 'success');
                this.battleLog.addMessage('⚔️ Heroes are empowered!', 'info');
                this.battleLog.addMessage('🛡️ Abilities will affect combat!', 'info');
                this.battleLog.addMessage('🔄 Real-time synchronization active', 'system');
            }
        }, 100);
        
        // Add life display at the top
        this.updateBattleLifeDisplay();
        
        // Initialize card preview functionality
        this.initializeCardPreview();
        
        // Display ability info for debugging (can be removed later)
        this.displayAbilityInfo();
        
        // Initialize necromancy displays if battle manager exists
        if (this.battleManager && this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.injectNecromancyCSS();
            this.battleManager.necromancyManager.initializeNecromancyStackDisplays();
        }
    }

    // Generate battle screen HTML with speed controls in battle center
    generateBattleScreenHTML() {
        // Player formation (bottom row)
        const playerFormation = this.playerFormation;
        // Opponent formation (top row)
        const opponentFormation = this.opponentFormation;
        
        return `
            <div class="battle-field-container">
                <!-- Battle Field (75% width) -->
                <div class="battle-field">
                    <!-- Opponent Heroes Row (Top) -->
                    <div class="battle-row opponent-row">
                        ${this.createBattleHeroSlot(opponentFormation.left, 'opponent', 'left')}
                        ${this.createBattleHeroSlot(opponentFormation.center, 'opponent', 'center')}
                        ${this.createBattleHeroSlot(opponentFormation.right, 'opponent', 'right')}
                    </div>
                    
                    <!-- Player Heroes Row (Bottom) -->
                    <div class="battle-row player-row">
                        ${this.createBattleHeroSlot(playerFormation.left, 'player', 'left')}
                        ${this.createBattleHeroSlot(playerFormation.center, 'player', 'center')}
                        ${this.createBattleHeroSlot(playerFormation.right, 'player', 'right')}
                    </div>
                    
                    <!-- Speed Control Panel (Far Right) -->
                    <div class="battle-speed-panel-container" id="battleCenter">
                        <!-- Speed controls will be inserted here by BattleSpeedManager -->
                    </div>
                </div>
                
                <!-- Interface Panel (25% width) -->
                <div class="battle-interface-panel">
                    <!-- Card Preview Area -->
                    <div class="card-preview-section">
                        <div class="preview-header">
                            <h3>🃏 Card Preview</h3>
                        </div>
                        <div class="card-preview-area" id="battleCardPreview">
                            <div class="preview-placeholder">
                                <div class="preview-icon">👁️</div>
                                <p>Hover over any card to preview</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Combat Log Area - UPDATED with creature toggle button -->
                    <div class="combat-log-section">
                        <div class="log-header">
                            <h3>📜 Combat Log</h3>
                            <div class="log-controls">
                                <button id="logScrollTop" class="log-control-btn" title="Scroll to top">⬆️</button>
                                <button id="logToggleAutoScroll" class="log-control-btn" title="Toggle auto-scroll">📌</button>
                                <button id="logToggleCombat" class="log-control-btn" title="Toggle combat messages">⚔️</button>
                                <button id="logToggleCreature" class="log-control-btn" title="Toggle creature messages">👾</button>
                            </div>
                        </div>
                        <div class="combat-log-area" id="combatLog">
                            <!-- BattleLog will populate this area -->
                        </div>
                    </div>
                    
                    <!-- Ability Info (for debugging - can be removed later) -->
                    <div class="ability-info-section" id="abilityInfoSection" style="display: none;">
                        <div class="log-header">
                            <h3>🎯 Hero Abilities</h3>
                        </div>
                        <div class="ability-info-area" id="abilityInfo">
                            <!-- Will be populated by displayAbilityInfo() -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Updated initializeLogControls method to handle the new combat toggle button
    initializeLogControls() {
        // Set up log control buttons
        setTimeout(() => {
            const scrollTopBtn = document.getElementById('logScrollTop');
            const toggleAutoScrollBtn = document.getElementById('logToggleAutoScroll');
            const toggleCombatBtn = document.getElementById('logToggleCombat');
            const toggleCreatureBtn = document.getElementById('logToggleCreature');
            
            if (scrollTopBtn) {
                scrollTopBtn.addEventListener('click', () => {
                    this.battleLog.scrollToTop();
                });
            }
            
            if (toggleAutoScrollBtn) {
                toggleAutoScrollBtn.addEventListener('click', () => {
                    const autoScroll = this.battleLog.toggleAutoScroll();
                    toggleAutoScrollBtn.title = autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll';
                    toggleAutoScrollBtn.style.opacity = autoScroll ? '1' : '0.5';
                });
            }
            
            if (toggleCombatBtn) {
                // Set initial state based on battleLog
                const initialCombatState = this.battleLog.getCombatMessagesEnabled();
                toggleCombatBtn.textContent = initialCombatState ? '⚔️' : '🚫⚔️';
                toggleCombatBtn.title = initialCombatState ? 'Hide combat messages' : 'Show combat messages';
                
                toggleCombatBtn.addEventListener('click', () => {
                    const isEnabled = this.battleLog.toggleCombatMessages();
                    
                    // Update button appearance
                    toggleCombatBtn.textContent = isEnabled ? '⚔️' : '🚫⚔️';
                    toggleCombatBtn.title = isEnabled ? 'Hide combat messages' : 'Show combat messages';
                    
                    // Optional: Add visual feedback
                    toggleCombatBtn.style.opacity = isEnabled ? '1' : '0.7';
                    
                    // Brief animation to show the toggle happened
                    toggleCombatBtn.style.transform = 'scale(0.9)';
                    setTimeout(() => {
                        toggleCombatBtn.style.transform = 'scale(1)';
                    }, 100);
                });
            }
            
            if (toggleCreatureBtn) {
                // Set initial state based on battleLog
                const initialCreatureState = this.battleLog.getCreatureMessagesEnabled();
                toggleCreatureBtn.textContent = initialCreatureState ? '👾' : '🚫👾';
                toggleCreatureBtn.title = initialCreatureState ? 'Hide creature messages' : 'Show creature messages';
                
                toggleCreatureBtn.addEventListener('click', () => {
                    const isEnabled = this.battleLog.toggleCreatureMessages();
                    
                    // Update button appearance
                    toggleCreatureBtn.textContent = isEnabled ? '👾' : '🚫👾';
                    toggleCreatureBtn.title = isEnabled ? 'Hide creature messages' : 'Show creature messages';
                    
                    // Optional: Add visual feedback
                    toggleCreatureBtn.style.opacity = isEnabled ? '1' : '0.7';
                    
                    // Brief animation to show the toggle happened
                    toggleCreatureBtn.style.transform = 'scale(0.9)';
                    setTimeout(() => {
                        toggleCreatureBtn.style.transform = 'scale(1)';
                    }, 100);
                });
            }
        }, 150);
    }

    // Initialize speed control UI - NEW METHOD
    initializeSpeedControlUI() {
        // Get the battle center container
        const battleCenter = document.getElementById('battleCenter');
        if (!battleCenter) {
            return false;
        }
        
        // Check if battle manager exists
        if (!this.battleManager) {
            return false;
        }
        
        // Check if speed manager exists
        if (!this.battleManager.speedManager) {
            return false;
        }
        
        // Initialize speed manager UI
        const success = this.battleManager.speedManager.initializeUI(battleCenter);
        
        // Initialize log control buttons
        this.initializeLogControls();
        
        return success;
    }

    // Create individual battle hero slot using pre-calculated hero stats
    createBattleHeroSlot(hero, side, position) {
        if (!hero) {
            return `
                <div class="battle-hero-slot empty-hero-slot ${side}-slot ${position}-slot">
                    <div class="empty-hero-placeholder">
                        <div class="empty-icon">👻</div>
                        <div class="empty-text">Empty</div>
                    </div>
                </div>
            `;
        }
        
        // FIXED: Create card data for hover preview WITH HERO STATS
        let heroStats = null;
        try {
            // Get the actual hero instance from battle manager to get current stats
            if (this.battleManager) {
                const heroInstance = side === 'player' 
                    ? this.battleManager.playerHeroes[position]
                    : this.battleManager.opponentHeroes[position];
                
                if (heroInstance) {
                    // Create hero stats object with current battle stats
                    heroStats = {
                        currentHp: heroInstance.currentHp,
                        maxHp: heroInstance.maxHp,
                        attack: heroInstance.getCurrentAttack(),
                        defense: heroInstance.defense || 0,
                        speed: heroInstance.speed || 0
                    };
                }
            }
        } catch (error) {
            console.warn('Could not get hero stats for tooltip:', error);
        }

        const cardData = {
            imagePath: hero.image,
            displayName: hero.name,
            cardType: 'character',
            heroStats: heroStats
        };
        const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
        
        // SIMPLIFIED: Use pre-calculated stats from Hero objects
        let displayAttack = 10; // fallback
        let attackBonus = 0;
        let attackContainerClass = '';
        let bonusDisplay = '';
        
        try {
            // Get the actual hero instance from battle manager to read pre-calculated stats
            if (this.battleManager) {
                const heroInstance = side === 'player' 
                    ? this.battleManager.playerHeroes[position]
                    : this.battleManager.opponentHeroes[position];
                
                if (heroInstance) {
                    // Use the hero's current attack value (already includes all bonuses)
                    displayAttack = heroInstance.getCurrentAttack();
                    attackBonus = displayAttack - heroInstance.baseAtk;
                } else {
                    // Fallback: Get base stats from card database
                    const heroInfo = getCardInfo(hero.name);
                    if (heroInfo && heroInfo.cardType === 'hero') {
                        displayAttack = heroInfo.atk;
                    }
                }
            } else {
                // Fallback: Get base stats from card database
                const heroInfo = getCardInfo(hero.name);
                if (heroInfo && heroInfo.cardType === 'hero') {
                    displayAttack = heroInfo.atk;
                }
            }
            
            // Format bonus display
            if (attackBonus > 0) {
                bonusDisplay = `<span class="attack-bonus" style="color: #4caf50; display: inline;">+${attackBonus}</span>`;
                attackContainerClass = 'attack-buffed';
            } else {
                bonusDisplay = `<span class="attack-bonus" style="display: none;"></span>`;
            }
            
        } catch (error) {
            // Fallback to basic display
            const heroInfo = getCardInfo(hero.name);
            if (heroInfo && heroInfo.cardType === 'hero') {
                displayAttack = heroInfo.atk;
            }
            bonusDisplay = `<span class="attack-bonus" style="display: none;"></span>`;
        }

        // Get creatures for this hero from battle manager
        let creaturesHTML = '';
        if (this.battleManager) {
            const heroInstance = side === 'player' 
                ? this.battleManager.playerHeroes[position]
                : this.battleManager.opponentHeroes[position];
            
            if (heroInstance && heroInstance.creatures && heroInstance.creatures.length > 0) {
                creaturesHTML = this.createCreaturesHTML(heroInstance.creatures, side, position);
            }
        }
        
        // Enhanced hover handlers
        return `
            <div class="battle-hero-slot ${side}-slot ${position}-slot" data-hero-id="${hero.id}"
                onmouseenter="window.showBattleCardPreview('${cardDataJson}'); window.showHeroInBattleTooltip('${side}', '${position}');"
                onmouseleave="window.hideBattleCardPreview(); window.hideHeroInBattleTooltip();">
                <div class="battle-hero-card">
                    <div class="hero-image-container">
                        <img src="${hero.image}" 
                            alt="${hero.name}" 
                            class="battle-hero-image"
                            onerror="this.src='./Cards/All/placeholder.png'">
                    </div>
                    <div class="hero-info-bar">
                        <div class="battle-hero-name">${hero.name}</div>
                        <div class="battle-hero-health">
                            <div class="health-bar">
                                <div class="health-fill" style="width: 100%"></div>
                            </div>
                        </div>
                        <div class="battle-hero-attack ${attackContainerClass}">
                            <div class="attack-icon">⚔️</div>
                            <div class="attack-value">
                                <span class="attack-base">${displayAttack - attackBonus}</span>
                                ${bonusDisplay}
                            </div>
                        </div>
                        <div class="necromancy-stack-indicator" style="display: none;">
                            <div class="necromancy-stack-circle">
                                <span class="necromancy-stack-number">0</span>
                            </div>
                        </div>
                    </div>
                </div>
                ${creaturesHTML}
            </div>
        `;
    }

    // Show card preview in interface panel WITH STATS SUPPORT
    showCardPreview(cardData) {
        const previewArea = document.getElementById('battleCardPreview');
        if (!previewArea) return;
        
        // Show stats for ANY hero tooltip (any character card)
        const shouldShowStats = (cardData.cardType === 'character' || cardData.cardType === 'hero') && cardData.heroStats;
        
        
        // Build preview with optional stats overlay
        let previewHTML = `
            <div class="preview-card-display">
                <div class="battle-preview-image-container" style="position: relative; display: inline-block;">
                    <img src="${cardData.imagePath}" 
                         alt="${cardData.displayName}" 
                         class="preview-card-image"
                         onerror="this.src='./Cards/All/placeholder.png'">
        `;
        
        // Add stats overlay if this is a character card with stats
        if (shouldShowStats) {
            const stats = cardData.heroStats;
            previewHTML += `
                    <div class="battle-preview-stats" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                        <div class="battle-preview-stat hp-stat" style="position: absolute; bottom: 15%; left: 25%; background: rgba(0,0,0,0.0); color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;">
                            <span class="stat-value">${stats.maxHp}</span>
                        </div>
                        <div class="battle-preview-stat attack-stat" style="position: absolute; bottom: 15%; right: 20%; background: rgba(0,0,0,0.0); color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;">
                            <span class="stat-value">${stats.attack}</span>
                        </div>
                    </div>
            `;
        } 
        
        previewHTML += `
                </div>
                <div class="preview-card-info">
                    <p class="card-type">${cardData.cardType === 'character' ? '🦸 Hero' : '🃏 Ability'}</p>
                </div>
            </div>
        `;
        
        previewArea.innerHTML = previewHTML;
    }

    // Create creatures HTML for battle display (same as formation screen)
    createCreaturesHTML(creatures, side, position) {
        if (!creatures || creatures.length === 0) return '';
        
        return `
            <div class="battle-hero-creatures" data-hero-position="${position}" data-side="${side}">
                ${creatures.map((creature, index) => {
                    const creatureSprite = `./Creatures/${creature.name}.png`;
                    const cardData = {
                        imagePath: creature.image,
                        displayName: this.formatCardName(creature.name),
                        cardType: 'creature'
                    };
                    const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
                    
                    // Vary animation speed for visual interest
                    const speedClasses = ['speed-slow', 'speed-normal', 'speed-fast'];
                    const speedClass = speedClasses[index % speedClasses.length];
                    
                    // Get creature's current stats
                    const currentHp = creature.currentHp || creature.maxHp || 10;
                    const maxHp = creature.maxHp || 10;
                    const hpPercentage = (currentHp / maxHp) * 100;
                    
                    // Determine health bar color based on percentage
                    let healthBarColor = 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)'; // Green
                    if (hpPercentage <= 30) {
                        healthBarColor = 'linear-gradient(90deg, #f44336 0%, #ef5350 100%)'; // Red
                    } else if (hpPercentage <= 60) {
                        healthBarColor = 'linear-gradient(90deg, #ff9800 0%, #ffa726 100%)'; // Orange
                    }
                    
                    return `
                        <div class="creature-icon ${!creature.alive ? 'defeated' : ''}" 
                            data-creature-index="${index}"
                            onmouseenter="window.showBattleCardPreview('${cardDataJson}')"
                            onmouseleave="window.hideBattleCardPreview()">
                            <div class="creature-sprite-container">
                                <img src="${creatureSprite}" 
                                    alt="${creature.name}" 
                                    class="creature-sprite ${speedClass}"
                                    onerror="this.src='./Creatures/placeholder.png'"
                                    style="${!creature.alive ? 'filter: grayscale(100%); opacity: 0.5;' : ''}">
                            </div>
                            ${creature.alive ? `
                                <div class="creature-health-bar">
                                    <div class="creature-health-fill" style="width: ${hpPercentage}%; background: ${healthBarColor};"></div>
                                </div>
                                <div class="creature-hp-text">${currentHp}/${maxHp}</div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // NECROMANCY INTEGRATION: Enhanced renderCreaturesAfterInit with necromancy display updates
    renderCreaturesAfterInit() {
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroInstance = side === 'player' 
                    ? this.battleManager.playerHeroes[position]
                    : this.battleManager.opponentHeroes[position];
                
                if (heroInstance && heroInstance.creatures && heroInstance.creatures.length > 0) {
                    const heroSlot = document.querySelector(`.${side}-slot.${position}-slot`);
                    if (heroSlot) {
                        // Remove existing creatures if any
                        const existingCreatures = heroSlot.querySelector('.battle-hero-creatures');
                        if (existingCreatures) {
                            existingCreatures.remove();
                        }
                        
                        // Add new creatures HTML
                        const creaturesHTML = this.createCreaturesHTML(heroInstance.creatures, side, position);
                        heroSlot.insertAdjacentHTML('beforeend', creaturesHTML);
                        
                        // NECROMANCY INTEGRATION: Update necromancy displays
                        if (this.battleManager.necromancyManager) {
                            this.battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                                side, position, heroInstance
                            );
                        }
                    }
                }
            });
        });
    }

    // Display ability info for debugging
    displayAbilityInfo() {
        const abilityInfoArea = document.getElementById('abilityInfo');
        const abilityInfoSection = document.getElementById('abilityInfoSection');
        
        if (!abilityInfoArea || !abilityInfoSection) return;
        
        // Only show in development/debug mode
        if (window.location.hostname === 'localhost' || window.location.search.includes('debug')) {
            abilityInfoSection.style.display = 'block';
            
            let infoHTML = '<div style="font-size: 0.8rem; padding: 10px;">';
            
            // Display player abilities
            infoHTML += '<strong>Player Heroes:</strong><br>';
            ['left', 'center', 'right'].forEach(position => {
                const hero = this.playerFormation[position];
                if (hero && this.playerAbilities && this.playerAbilities[position]) {
                    const abilities = this.playerAbilities[position];
                    infoHTML += `<div style="margin: 5px 0;"><strong>${hero.name} (${position}):</strong><br>`;
                    
                    for (let i = 1; i <= 3; i++) {
                        const zone = abilities[`zone${i}`];
                        if (zone && zone.length > 0) {
                            infoHTML += `Zone ${i}: ${this.formatCardName(zone[0].name)} x${zone.length}<br>`;
                        }
                    }
                    infoHTML += '</div>';
                }
            });
            
            infoHTML += '</div>';
            abilityInfoArea.innerHTML = infoHTML;
        }
    }

    syncAbilitiesFromBattleManager() {
        if (!this.battleManager) return;
        
        // Extract current abilities from restored hero objects
        const playerAbilities = {};
        const opponentAbilities = {};
        
        // Extract player abilities
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.battleManager.playerHeroes[position];
            if (hero && hero.abilities) {
                playerAbilities[position] = hero.abilities;
            }
        });
        
        // Extract opponent abilities  
        ['left', 'center', 'right'].forEach(position => {
            const hero = this.battleManager.opponentHeroes[position];
            if (hero && hero.abilities) {
                opponentAbilities[position] = hero.abilities;
            }
        });
        
        // Update our own ability references for tooltip display
        this.playerAbilities = playerAbilities;
        this.opponentAbilities = opponentAbilities;
        
        // Also update the battle manager's references for consistency
        this.battleManager.playerAbilities = playerAbilities;
        this.battleManager.opponentAbilities = opponentAbilities;
    }

    // Initialize card preview functionality
    initializeCardPreview() {
        // Attach global functions for card preview
        window.showBattleCardPreview = (cardDataJson) => {
            try {
                const cardData = JSON.parse(cardDataJson.replace(/&quot;/g, '"'));
                this.showCardPreview(cardData);
            } catch (error) {
                // Silently handle error
            }
        };
        
        window.hideBattleCardPreview = () => {
            this.hideCardPreview();
        };
        
        // Abilities debug display functions
        window.showHeroInBattleTooltip = (side, position) => {
            this.showHeroInBattleTooltip(side, position);
        };
        
        window.hideHeroInBattleTooltip = () => {
            this.hideHeroInBattleTooltip();
        };
    }

    // Helper function to format camelCase names to spaced names
    formatCardName(name) {
        if (!name || typeof name !== 'string') {
            return name;
        }
        
        // Convert camelCase to spaced words
        // This regex finds lowercase letters followed by uppercase letters
        // and inserts a space between them
        return name.replace(/([a-z])([A-Z])/g, '$1 $2')
                   .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'); // Handle cases like "XMLParser" -> "XML Parser"
    }

    // Show hero abilities and spellbook tooltip
    showHeroInBattleTooltip(side, position) {
        // Get the hero from battle manager
        let hero = null;
        if (side === 'player') {
            hero = this.battleManager.playerHeroes[position];
        } else if (side === 'opponent') {
            hero = this.battleManager.opponentHeroes[position];
        }
        
        if (!hero) {
            return;
        }
        
        // Get the hero element to position tooltip relative to it
        const heroElement = this.getHeroElement(side, position);
        if (!heroElement) {
            return;
        }
        
        // Get all abilities from the hero
        const allAbilities = hero.getAllAbilities();
        
        // Create abilities array for display
        const abilitiesArray = [];
        allAbilities.forEach(abilityData => {
            // Add each ability instance to the array
            for (let i = 0; i < abilityData.stackCount; i++) {
                abilitiesArray.push(abilityData.name);
            }
        });
        
        // Get all spells from the hero
        const allSpells = hero.getAllSpells();
        
        // Filter out Creature spells (we only show non-creature spells in the spellbook tooltip)
        const filteredSpells = allSpells.filter(spell => spell.subtype !== 'Creature');
        
        // Sort spells by school first, then by name
        const sortedSpells = filteredSpells.sort((a, b) => {
            // First sort by school (using spellSchool property from database)
            const schoolCompare = (a.spellSchool || 'Unknown').localeCompare(b.spellSchool || 'Unknown');
            if (schoolCompare !== 0) return schoolCompare;
            // Then sort by name within the same school
            return a.name.localeCompare(b.name);
        });

        // Get creature count
        const creatureCount = hero.creatures ? hero.creatures.length : 0;
        
        // Get equipment from the hero (sorted alphabetically)
        const equipment = hero.getEquipment ? hero.getEquipment() : [];
                    
        // Create a floating tooltip to show abilities
        const existingTooltip = document.querySelector('.hero-abilities-debug');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        const tooltip = document.createElement('div');
        tooltip.className = 'hero-abilities-debug';
        
        // Format abilities by zone for better visualization
        let zoneHTML = '';
        ['zone1', 'zone2', 'zone3'].forEach((zone, index) => {
            const zoneData = hero.abilities[zone];
            if (zoneData && zoneData.length > 0) {
                const abilityName = this.formatCardName(zoneData[0].name);
                const stackCount = zoneData.length;
                zoneHTML += `<div class="ability-zone-item">Zone ${index + 1}: ${abilityName} x${stackCount}</div>`;
            }
        });
        
        if (!zoneHTML) {
            zoneHTML = '<div style="color: #999;">No abilities</div>';
        }
        
        // Format spellbook for display with detailed spell info
        let spellbookHTML = '';
        if (sortedSpells.length > 0) {
            spellbookHTML = '<div class="spellbook-list">';
            
            let currentSchool = null;
            sortedSpells.forEach(spell => {
                const spellSchool = spell.spellSchool || 'Unknown';
                
                // Add school header if we're starting a new school
                if (spellSchool !== currentSchool) {
                    if (currentSchool !== null) {
                        spellbookHTML += '</div>'; // Close previous school section
                    }
                    currentSchool = spellSchool;
                    
                    // Get school color based on school name
                    const schoolColors = {
                        'DestructionMagic': '#ff6b6b',     // Red, fire-themed
                        'SupportMagic': '#ffd43b',         // Yellow, holy-themed
                        'DecayMagic': '#845ef7',           // Purple, darkness-themed
                        'MagicArts': '#4dabf7',            // Blue, arcane-themed
                        'SummoningMagic': '#51cf66',       // Green, nature-themed
                        'Fighting': '#ff8c42',              // Orange, physical combat-themed
                        'Unknown': '#868e96'
                    };
                    const schoolColor = schoolColors[spellSchool] || '#868e96';
                    
                    // Get school icon based on school name
                    const schoolIcons = {
                        'DestructionMagic': '🔥',
                        'SupportMagic': '✨',
                        'DecayMagic': '💀',
                        'MagicArts': '🔮',
                        'SummoningMagic': '🌿',
                        'Fighting': '⚔️',
                        'Unknown': '❓'
                    };
                    const schoolIcon = schoolIcons[spellSchool] || '❓';
                    
                    // Format school name for display
                    const displaySchoolName = spellSchool
                        .replace(/([A-Z])/g, ' $1')
                        .trim()
                        .replace('Magic Arts', 'Magic Arts')
                        .replace('Destruction Magic', 'Destruction Magic')
                        .replace('Support Magic', 'Support Magic')
                        .replace('Decay Magic', 'Decay Magic')
                        .replace('Summoning Magic', 'Summoning Magic');
                    
                    spellbookHTML += `
                        <div class="spell-school-header" style="color: ${schoolColor};">
                            <span class="school-icon">${schoolIcon}</span> ${displaySchoolName}
                        </div>
                        <div class="spell-school-section">
                    `;
                }
                
                // Create spell card
                const spellLevel = spell.level !== undefined ? spell.level : 0;
                
                // Build spell description from available data
                let spellDescription = '';
                if (spell.subtype) {
                    spellDescription = `${spell.subtype}`;
                    if (spell.action) {
                        spellDescription += ' • Action';
                    }
                } else if (spell.action) {
                    spellDescription = 'Action spell';
                } else {
                    spellDescription = 'Spell';
                }
                
                spellbookHTML += `
                    <div class="spell-card">
                        <div class="spell-header">
                            <span class="spell-name">${this.formatCardName(spell.name)}</span>
                            <span class="spell-level">Lvl ${spellLevel}</span>
                        </div>
                        <div class="spell-effect">${spellDescription}</div>
                    </div>
                `;
            });
            
            if (currentSchool !== null) {
                spellbookHTML += '</div>'; // Close last school section
            }
            
            spellbookHTML += '</div>';
        } else {
            spellbookHTML = '<div style="color: #999;">No spells learned</div>';
        }
        
        // Format equipment for display
        let equipmentHTML = '';
        try {
            const equipment = hero.getEquipment ? hero.getEquipment() : [];
            
            if (equipment.length > 0) {
                equipmentHTML = '<div class="equipment-list">';
                
                equipment.forEach(item => {
                    const itemName = item.name || item.cardName || 'Unknown Item';
                    const itemCost = item.cost !== undefined ? item.cost : 0;
                    
                    equipmentHTML += `
                        <div class="equipment-item">
                            <span class="equipment-icon">⚔️</span>
                            <span class="equipment-name">${this.formatCardName(itemName)}</span>
                            ${itemCost > 0 ? `<span class="equipment-cost">${itemCost}💰</span>` : ''}
                        </div>
                    `;
                });
                
                equipmentHTML += '</div>';
            } else {
                equipmentHTML = '<div style="color: #999;">No equipment</div>';
            }
        } catch (error) {
            equipmentHTML = '<div style="color: #999;">Equipment data unavailable</div>';
        }
        
        tooltip.innerHTML = `
            <div class="hero-tooltip-container">
                <h4 class="hero-tooltip-title">${hero.name}${creatureCount > 0 ? ` (${creatureCount} creatures)` : ''}</h4>
                
                <div class="abilities-section">
                    <h5 class="section-title">⚡ Abilities</h5>
                    <div class="abilities-content">
                        ${zoneHTML}
                    </div>
                </div>
                
                <div class="spellbook-section">
                    <h5 class="section-title">📜 Spellbook (${sortedSpells.length})</h5>
                    <div class="spellbook-content">
                        ${spellbookHTML}
                    </div>
                </div>
                
                ${equipment.length > 0 ? `
                    <div class="equipment-section">
                        <h5 class="section-title">🛡️ Equipment (${equipment.length})</h5>
                        <div class="equipment-content">
                            ${equipmentHTML}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add styles for the enhanced tooltip
        this.ensureTooltipStyles();
        
        // Position tooltip above the hero element
        const heroRect = heroElement.getBoundingClientRect();
        
        tooltip.style.cssText = `
            position: fixed;
            z-index: 10000;
            pointer-events: none;
            animation: fadeIn 0.3s ease-out;
            max-height: 40vh;  /* Add max height - 60% of viewport height */
            overflow-y: auto;  /* Add scrollbar when needed */
            overflow-x: hidden;
        `;
        
        // Add to body first to calculate dimensions
        document.body.appendChild(tooltip);
        
        // Calculate position after adding to DOM
        const tooltipRect = tooltip.getBoundingClientRect();
        const leftPos = heroRect.left + (heroRect.width / 2) - (tooltipRect.width / 2);
        let topPos = heroRect.top - tooltipRect.height - 10; // 10px gap above hero
        
        // Apply calculated position
        tooltip.style.left = `${leftPos}px`;
        
        // Check if tooltip goes off screen and adjust
        if (leftPos < 10) {
            tooltip.style.left = '10px';
        } else if (leftPos + tooltipRect.width > window.innerWidth - 10) {
            tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
        }
        
        if (topPos < 10) {
            // If tooltip would go off top, position it below the hero instead
            topPos = heroRect.bottom + 10;
        }
        
        // If still too tall, just position at top with margin
        if (topPos + tooltipRect.height > window.innerHeight - 10) {
            topPos = 10;
        }
        
        tooltip.style.top = `${topPos}px`;
        
        // Add global wheel event listener for scrolling the tooltip
        const wheelHandler = (e) => {
            const activeTooltip = document.querySelector('.hero-abilities-debug');
            if (activeTooltip) {
                e.preventDefault(); // Prevent any page scrolling
                activeTooltip.scrollTop += e.deltaY;
            }
        };
        
        // Store handler reference so we can remove it later
        tooltip._wheelHandler = wheelHandler;
        document.addEventListener('wheel', wheelHandler, { passive: false });
    }

    // Ensure tooltip styles are loaded
    ensureTooltipStyles() {
        if (document.getElementById('heroTooltipEnhancedStyles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'heroTooltipEnhancedStyles';
        style.textContent = `
            .hero-tooltip-container {
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(16, 16, 32, 0.98));
                color: white;
                padding: 20px;
                border-radius: 12px;
                border: 2px solid #667eea;
                min-width: 350px;
                max-width: 450px;
                box-shadow: 
                    0 10px 30px rgba(0, 0, 0, 0.8),
                    0 0 40px rgba(102, 126, 234, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
            }
            
            /* Custom scrollbar for the tooltip */
            .hero-abilities-debug::-webkit-scrollbar {
                width: 8px;
            }
            
            .hero-abilities-debug::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            }
            
            .hero-abilities-debug::-webkit-scrollbar-thumb {
                background: rgba(102, 126, 234, 0.6);
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .hero-abilities-debug::-webkit-scrollbar-thumb:hover {
                background: rgba(102, 126, 234, 0.8);
            }
            
            /* Firefox scrollbar */
            .hero-abilities-debug {
                scrollbar-width: thin;
                scrollbar-color: rgba(102, 126, 234, 0.6) rgba(0, 0, 0, 0.3);
            }
            
            .hero-tooltip-title {
                margin: 0 0 15px 0;
                color: #fff;
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                background: linear-gradient(45deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .abilities-section,
            .spellbook-section,
            .equipment-section {
                margin-bottom: 15px;
            }
            
            .spellbook-section,
            .equipment-section {
                border-top: 1px solid rgba(102, 126, 234, 0.3);
                padding-top: 15px;
            }
            
            .section-title {
                margin: 0 0 10px 0;
                color: #9ca3ff;
                font-size: 16px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .abilities-content {
                font-size: 14px;
                padding-left: 15px;
            }
            
            .ability-zone-item {
                margin: 4px 0;
                padding: 4px 8px;
                background: rgba(102, 126, 234, 0.1);
                border-radius: 4px;
                border-left: 3px solid #667eea;
            }
            
            .spellbook-content,
            .equipment-content {
                max-height: 400px;
                overflow-y: auto;
                padding-right: 5px;
            }
            
            .spellbook-content::-webkit-scrollbar,
            .equipment-content::-webkit-scrollbar {
                width: 6px;
            }
            
            .spellbook-content::-webkit-scrollbar-track,
            .equipment-content::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 3px;
            }
            
            .spellbook-content::-webkit-scrollbar-thumb,
            .equipment-content::-webkit-scrollbar-thumb {
                background: rgba(102, 126, 234, 0.5);
                border-radius: 3px;
            }
            
            .spellbook-content::-webkit-scrollbar-thumb:hover,
            .equipment-content::-webkit-scrollbar-thumb:hover {
                background: rgba(102, 126, 234, 0.7);
            }
            
            .spell-school-header {
                font-size: 14px;
                font-weight: bold;
                margin: 8px 0 6px 0;
                padding: 4px 0;
                display: flex;
                align-items: center;
                gap: 4px;
                text-transform: uppercase;
                letter-spacing: 1px;
                opacity: 0.9;
            }
            
            .school-icon {
                font-size: 16px;
            }
            
            .spell-school-section {
                margin-left: 10px;
                margin-bottom: 8px;
            }
            
            .spell-card {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                padding: 10px;
                margin: 6px 0;
                transition: all 0.2s ease;
            }
            
            .spell-card:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateX(2px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            
            .spell-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }
            
            .spell-name {
                font-size: 14px;
                font-weight: bold;
                color: #fff;
            }
            
            .spell-level {
                font-size: 12px;
                padding: 2px 6px;
                background: rgba(102, 126, 234, 0.3);
                border-radius: 12px;
                color: #c3ceff;
                font-weight: bold;
            }
            
            .spell-effect {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.4;
                font-style: italic;
            }
            
            .spellbook-list {
                font-size: 14px;
            }
            
            /* Equipment styles */
            .equipment-list {
                font-size: 14px;
                padding-left: 10px;
            }
            
            .equipment-item {
                background: rgba(255, 193, 7, 0.1);
                border: 1px solid rgba(255, 193, 7, 0.2);
                border-radius: 6px;
                padding: 8px 12px;
                margin: 6px 0;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s ease;
            }
            
            .equipment-item:hover {
                background: rgba(255, 193, 7, 0.15);
                border-color: rgba(255, 193, 7, 0.3);
                transform: translateX(2px);
                box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
            }
            
            .equipment-icon {
                font-size: 16px;
                filter: drop-shadow(0 0 2px rgba(255, 193, 7, 0.5));
            }
            
            .equipment-name {
                flex: 1;
                font-weight: 600;
                color: #ffd700;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
            
            .equipment-cost {
                font-size: 12px;
                padding: 2px 6px;
                background: rgba(255, 193, 7, 0.2);
                border-radius: 10px;
                color: #ffd700;
                font-weight: bold;
                white-space: nowrap;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Get hero element by side and position
    getHeroElement(side, position) {
        const selector = `.${side}-slot.${position}-slot`;
        const element = document.querySelector(selector);
        return element;
    }

    // Hide hero abilities and spellbook tooltip with speed-aware animation
    hideHeroInBattleTooltip() {
        const tooltip = document.querySelector('.hero-abilities-debug');
        if (tooltip) {
            // Remove the wheel event listener
            if (tooltip._wheelHandler) {
                document.removeEventListener('wheel', tooltip._wheelHandler);
            }
            
            tooltip.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => tooltip.remove(), this.getSpeedAdjustedDelay(300));
        }
    }

    // Hide card preview
    hideCardPreview() {
        const previewArea = document.getElementById('battleCardPreview');
        if (!previewArea) return;
        
        previewArea.innerHTML = `
            <div class="preview-placeholder">
                <div class="preview-icon">👁️</div>
                <p>Hover over any card to preview</p>
            </div>
        `;
    }

    // Updated to use BattleLog instead of manual DOM manipulation
    addCombatLogMessage(message, type = 'info') {
        if (this.battleLog && this.battleLog.isInitialized) {
            // Use the new BattleLog system
            this.battleLog.addMessage(message, type);
        } else {
            // Fallback to old method if BattleLog isn't ready yet
            const logArea = document.getElementById('combatLog');
            if (!logArea) return;
            
            // Remove placeholder if it exists
            const placeholder = logArea.querySelector('.log-placeholder');
            if (placeholder) {
                placeholder.remove();
            }
            
            // Create new message element
            const messageElement = document.createElement('div');
            messageElement.className = `log-message log-${type}`;
            messageElement.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> ${message}`;
            
            // Add to log
            logArea.appendChild(messageElement);
            
            // Auto scroll to bottom
            logArea.scrollTop = logArea.scrollHeight;
            
            // Keep only last 50 messages
            const messages = logArea.querySelectorAll('.log-message');
            if (messages.length > 50) {
                messages[0].remove();
            }
        }
    }

    // NEW: Method to get battle log state for persistence
    getBattleLogState() {
        return this.battleLog ? this.battleLog.exportState() : null;
    }

    // NEW: Method to restore battle log state from persistence
    restoreBattleLogState(logState) {
        if (this.battleLog && logState) {
            return this.battleLog.importState(logState);
        }
        return false;
    }

    // Update life display for battle screen
    updateBattleLifeDisplay() {
        // The life display should already be present from the team building screen
        // Just ensure it's visible and on top
        const lifeDisplay = document.querySelector('.life-display-container');
        if (lifeDisplay) {
            lifeDisplay.style.zIndex = '200'; // Ensure it's above battle screen
        }
    }

    // Show surrender button (called when returning to formation screen)
    showSurrenderButton() {
        
        // Remove battle-active class that might hide the surrender button
        document.body.classList.remove('battle-active');
        
        // Find and show the surrender button
        const surrenderButton = document.querySelector('.surrender-button');
        if (surrenderButton) {
            surrenderButton.style.display = '';
            surrenderButton.style.visibility = 'visible';
            surrenderButton.disabled = false;
        }
        
        // Also try common surrender button selectors as fallbacks
        const surrenderButtonAlt = document.querySelector('#surrenderButton, .surrender-btn, [data-action="surrender"]');
        if (surrenderButtonAlt && !surrenderButton) {
            surrenderButtonAlt.style.display = '';
            surrenderButtonAlt.style.visibility = 'visible';
            surrenderButtonAlt.disabled = false;
        }
    }

    // Add static method as well for global access
    static showSurrenderButton() {
        
        document.body.classList.remove('battle-active');
        
        const surrenderButton = document.querySelector('.surrender-button');
        if (surrenderButton) {
            surrenderButton.style.display = '';
            surrenderButton.style.visibility = 'visible';
            surrenderButton.disabled = false;
        }
    }

    // Reset battle screen
    reset() {
        // Clear all tooltips first
        this.clearTooltipsBeforeTransition();
        
        // NEW: Clear the BattleLog
        if (this.battleLog) {
            this.battleLog.clear();
        }
        
        // Reset battle manager with synchronization state
        if (this.battleManager) {
            this.battleManager.reset();
        }
        
        // Clean up speed manager if it exists
        if (this.battleManager && this.battleManager.speedManager) {
            this.battleManager.speedManager.cleanup();
        }
        
        // Clear ability data
        this.playerAbilities = null;
        this.opponentAbilities = null;
        
        // Remove battle arena
        const battleArena = document.getElementById('battleArena');
        if (battleArena) {
            battleArena.remove();
        }
        
        // Remove any old waiting overlays (cleanup)
        const waitingOverlay = document.getElementById('battleWaitingOverlay');
        if (waitingOverlay) {
            waitingOverlay.remove();
        }
    }
}

// Add consolidated styles for battle screen including log control styles
if (!document.getElementById('battleScreenStyles')) {
    const style = document.createElement('style');
    style.id = 'battleScreenStyles';
    style.textContent = `
        /* ============================================
        BATTLE SCREEN & CREATURE STYLES - UPDATED
        ============================================ */

        /* NEW: Log control buttons styling */
        .log-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 0 5px;
        }

        .log-controls {
            display: flex;
            gap: 5px;
        }

        .log-control-btn {
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.4);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 28px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .log-control-btn:hover {
            background: rgba(102, 126, 234, 0.4);
            border-color: rgba(102, 126, 234, 0.6);
            transform: translateY(-1px);
        }

        .log-control-btn:active {
            transform: translateY(0);
        }

        .ability-info-section {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 10px;
            max-height: 150px;
            overflow-y: auto;
        }

        .ability-info-area {
            padding: 10px;
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.8);
        }

        /* ============================================
        CREATURE DISPLAY STYLES - COMPLETELY TRANSPARENT CONTAINERS
        ============================================ */

        /* Hero creatures container - COMPLETELY TRANSPARENT */
        .hero-creatures {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 10px;
            padding: 0; /* Remove padding to eliminate visual space */
            min-height: 20px;
            background: transparent; /* Explicitly transparent */
            border: none;
            justify-content: center;
        }

        .battle-hero-creatures {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 8px;
            z-index: 15;
            /* Allow overflow for HP bars */
            overflow: visible;
            /* ENSURE NO BACKGROUND */
            background: transparent;
            border: none;
            box-shadow: none;
            border-radius: 0;
        }

        /* Player creatures ABOVE their heroes (just above the hero card) */
        .player-slot .battle-hero-creatures {
            top: -45px;
            bottom: auto;
        }

        /* Opponent creatures BELOW their heroes (just below the hero card) */
        .opponent-slot .battle-hero-creatures {
            top: 100%;
            bottom: auto;
            margin-top: 5px;
        }

        .battle-hero-slot {
            position: relative;
            /* Allow overflow for creature HP bars */
            overflow: visible !important;
        }

        /* Creature icon styling - COMPLETELY TRANSPARENT CONTAINER */
        .creature-icon {
            position: relative;
            width: 30px;
            height: 30px;
            /* COMPLETELY TRANSPARENT - no visual container elements */
            border: none;
            border-radius: 50%;
            background: transparent;
            cursor: pointer;
            transition: transform 0.2s ease;
            /* Allow child elements to overflow for HP bars */
            overflow: visible;
            /* ENSURE NO SHADOWS OR OUTLINES */
            box-shadow: none;
            outline: none;
        }

        .creature-icon:hover {
            transform: scale(1.15);
            z-index: 25;
            /* ENSURE NO BACKGROUND ON HOVER */
            background: transparent;
        }

        .creature-sprite-container {
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden; /* Keep this for the sprite animation */
            border-radius: 50%;
            /* COMPLETELY TRANSPARENT - no visual container elements */
            background: transparent;
            border: none;
            box-shadow: none;
            outline: none;
        }

        /* Sprite animation container and styles */
        .creature-sprite {
            width: 300%; /* 3 frames side by side */
            height: 100%;
            image-rendering: pixelated; /* Crisp pixel art */
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            position: absolute;
            left: 0;
            top: 0;
            /* Animation: 2-1-2-3-2-1-2-3 pattern */
            animation: creatureLoop 1.6s steps(1) infinite;
        }

        /* Different animation speeds for variety */
        .creature-sprite.speed-slow {
            animation-duration: 2.4s;
        }

        .creature-sprite.speed-normal {
            animation-duration: 1.6s;
        }

        .creature-sprite.speed-fast {
            animation-duration: 1.2s;
        }

        /* Pause animation on hover for better visibility */
        .creature-icon:hover .creature-sprite {
            animation-play-state: paused;
        }

        /* ============================================
        CREATURE HEALTH BAR STYLES - ABOVE CREATURES
        ============================================ */

        .creature-health-bar {
            position: absolute;
            top: -12px; /* Position ABOVE the creature */
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 6px;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #000000; /* Black border instead of white */
            border-radius: 3px;
            overflow: hidden;
            z-index: 10;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
        }

        .creature-health-fill {
            height: 100%;
            transition: width 0.3s ease, background 0.3s ease;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        .creature-hp-text {
            position: absolute;
            top: -26px; /* Position ABOVE the health bar */
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            font-weight: bold;
            color: white;
            text-shadow: 
                1px 1px 2px rgba(0, 0, 0, 1),
                0 0 4px rgba(0, 0, 0, 0.9);
            white-space: nowrap;
            z-index: 11;
            pointer-events: none;
            background: rgba(0, 0, 0, 0.7);
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 35px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        /* Defeated creature styles */
        .creature-icon.defeated {
            opacity: 0.8;
            background: transparent; /* Keep transparent even when defeated */
        }

        .creature-icon.defeated .creature-sprite-container {
            background: transparent; /* No container styling even when defeated */
        }

        .creature-icon.defeated .creature-sprite {
            filter: grayscale(100%);
            opacity: 0.4;
        }

        /* Hover state enhancements */
        .creature-icon:hover .creature-health-bar {
            height: 7px;
            top: -13px;
            width: 45px;
        }

        .creature-icon:hover .creature-hp-text {
            font-size: 11px;
            top: -28px;
        }

        /* Add glow effect to sprite on hover instead of container */
        .creature-icon:hover .creature-sprite {
            filter: brightness(1.3) drop-shadow(0 0 8px rgba(255, 255, 255, 0.6));
        }

        /* Critical health pulsing effect */
        .creature-health-fill[style*="f44336"] {
            animation: criticalPulse 1s ease-in-out infinite;
        }

        /* Additional fix for any other creature-related containers */
        .creature-drop-zone,
        .creature-placement-area,
        .creatures-section {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }

        /* ============================================
        CREATURE ANIMATIONS & EFFECTS
        ============================================ */

        /* Keyframes for the 2-1-2-3 loop pattern */
        @keyframes creatureLoop {
            0% {
                /* Frame 2 (middle) */
                transform: translateX(-33.333%);
            }
            12.5% {
                /* Frame 1 (left) */
                transform: translateX(0%);
            }
            25% {
                /* Frame 2 (middle) */
                transform: translateX(-33.333%);
            }
            37.5% {
                /* Frame 3 (right) */
                transform: translateX(-66.666%);
            }
            50% {
                /* Frame 2 (middle) */
                transform: translateX(-33.333%);
            }
            62.5% {
                /* Frame 1 (left) */
                transform: translateX(0%);
            }
            75% {
                /* Frame 2 (middle) */
                transform: translateX(-33.333%);
            }
            87.5% {
                /* Frame 3 (right) */
                transform: translateX(-66.666%);
            }
            100% {
                /* Back to Frame 2 to loop smoothly */
                transform: translateX(-33.333%);
            }
        }

        /* Alternative smoother animation timing */
        @keyframes creatureSmoothLoop {
            0%, 100% { transform: translateX(-33.333%); } /* Frame 2 */
            16.66% { transform: translateX(0%); } /* Frame 1 */
            33.33% { transform: translateX(-33.333%); } /* Frame 2 */
            50% { transform: translateX(-66.666%); } /* Frame 3 */
            66.66% { transform: translateX(-33.333%); } /* Frame 2 */
            83.33% { transform: translateX(0%); } /* Frame 1 */
        }

        /* Damage number animation for creatures */
        .creature-icon .damage-number {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
            font-weight: bold;
            color: #ff3333;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.9),
                0 0 8px rgba(255, 0, 0, 0.5);
            z-index: 200;
            pointer-events: none;
            animation: creatureDamageFloat 0.6s ease-out forwards;
        }

        @keyframes creatureDamageFloat {
            0% {
                transform: translate(-50%, -50%) scale(0.5);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -80%) scale(1.2);
            }
            100% {
                transform: translate(-50%, -100%) scale(1);
                opacity: 0;
            }
        }

        /* Shake animation enhancement for better visibility */
        .creature-shaking {
            animation: creatureShake 0.4s ease-in-out;
            z-index: 100;
        }

        /* Add glow to sprite during shake instead of container */
        .creature-shaking .creature-sprite {
            filter: brightness(1.5) drop-shadow(0 0 10px rgba(255, 255, 100, 0.8));
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

        @keyframes criticalPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        /* ============================================
        BATTLE-SPECIFIC ANIMATIONS
        ============================================ */

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

        /* ============================================
        BATTLE LAYOUT ADJUSTMENTS WITH SPEED CONTROLS
        ============================================ */

        /* Adjust battle row spacing to accommodate creatures with HP bars AND speed controls */
        .battle-field {
            position: relative;
            overflow: visible;
            padding-top: 40px; /* Extra padding for opponent creature HP bars */
            padding-bottom: 40px; /* Extra padding for player creature HP bars */
        }

        .battle-row {
            margin-bottom: 20px;
        }

        .opponent-row {
            margin-bottom: 40px;
        }

        .player-row {
            margin-top: 40px;
        }

        /* Battle center area for speed controls */
        .battle-center {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 80px;
            position: relative;
            margin: 20px 0;
        }

        .battle-hero-card.attacking {
            z-index: 50 !important;
        }

        .battle-hero-card.defeated {
            animation: heroDefeat 0.5s ease-out forwards;
        }

        @keyframes heroDefeat {
            0% { opacity: 1; transform: scale(1); }
            100% { opacity: 0.3; transform: scale(0.9); filter: grayscale(100%); }
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

        /* ============================================
        VISUAL FEEDBACK FOR CREATURE INTERACTIONS
        ============================================ */

        /* Creature drop zones */
        .team-slot.creature-drop-ready {
            box-shadow: 0 0 20px rgba(76, 175, 80, 0.8);
        }

        .team-slot.creature-drop-invalid {
            box-shadow: 0 0 20px rgba(244, 67, 54, 0.8);
        }

        /* Adjust character card layout to accommodate creatures */
        .character-card.with-ability-zones {
            padding-bottom: 10px;
        }

        /* Visual feedback when dragging creature spell */
        .hand-card.spell-card[data-card-type="spell"] {
            /* Style for creature spell cards in hand */
        }
        
        /* ============================================
        NECROMANCY STACK INDICATOR STYLES - NEXT TO ATTACK STAT
        ============================================ */
        
        .necromancy-stack-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 4px;
        }
        
        .necromancy-stack-circle {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 
                0 2px 6px rgba(0, 0, 0, 0.5),
                0 0 10px rgba(138, 43, 226, 0.4); /* Purple glow for necromancy */
            transition: all 0.3s ease;
        }
        
        .necromancy-stack-number {
            font-size: 11px;
            font-weight: bold;
            color: white;
            text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
            line-height: 1;
        }
        
        .necromancy-stack-circle.stack-consumed {
            animation: necromancyStackPulse 0.6s ease-out;
        }
        
        @keyframes necromancyStackPulse {
            0% {
                transform: scale(1);
                box-shadow: 
                    0 2px 6px rgba(0, 0, 0, 0.5),
                    0 0 10px rgba(138, 43, 226, 0.4);
            }
            50% {
                transform: scale(1.2);
                box-shadow: 
                    0 4px 12px rgba(0, 0, 0, 0.7),
                    0 0 20px rgba(138, 43, 226, 0.8);
                background: rgba(138, 43, 226, 0.9);
            }
            100% {
                transform: scale(1);
                box-shadow: 
                    0 2px 6px rgba(0, 0, 0, 0.5),
                    0 0 10px rgba(138, 43, 226, 0.4);
                background: rgba(0, 0, 0, 0.9);
            }
        }
        
        /* Hover effect for necromancy indicator */
        .battle-hero-slot:hover .necromancy-stack-circle {
            transform: scale(1.1);
            box-shadow: 
                0 3px 8px rgba(0, 0, 0, 0.6),
                0 0 15px rgba(138, 43, 226, 0.6);
        }
        
        /* Hide necromancy indicator when hero has no necromancy ability or no creatures */
        .battle-hero-slot:not(.has-necromancy-stacks) .necromancy-stack-indicator {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

// Export for ES6 module compatibility
export default BattleScreen;