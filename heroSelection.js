import { DeckManager } from './deckManager.js';
import { HandManager } from './handManager.js';
import { LifeManager } from './lifeManager.js';
import { GoldManager } from './goldManager.js';
import { BattleScreen } from './battleScreen.js';
import { CardRewardManager } from './cardRewardManager.js';
import { CardPreviewManager } from './cardPreviewManager.js';
import { FormationManager } from './formationManager.js';
import { HeroSelectionUI } from './heroSelectionUI.js';
import { TurnTracker } from './turnTracker.js';
import { BattleReconnectionManager } from './battleReconnection.js';
import { HeroAbilitiesManager } from './heroAbilities.js';
import { getHeroInfo, getCardInfo } from './cardDatabase.js';
import { HeroSpellbookManager } from './heroSpellbook.js';
import { ActionManager } from './actionManager.js';

export class HeroSelection {
    constructor() {
        this.allCharacters = [];
        this.playerCharacters = []; // Player's 3 character options
        this.opponentCharacters = []; // Opponent's 3 character options
        this.selectedCharacter = null;
        this.opponentSelectedCharacter = null;
        this.isHost = false;
        this.gameDataSender = null; // Function to send data to opponent
        this.onSelectionComplete = null; // Callback when selection is done
        this.roomManager = null; // Reference to room manager for Firebase access
        this.battleStateListener = null; // Firebase listener for battle state
        
        // Battle state management flags
        this.isReturningFromBattle = false;
        this.battleStateCleanupInProgress = false;
        this.listenerTemporarilyDisabled = false;
        this.isTransitioningToBattle = false;
        this.isRestoringFromSave = false; 
        
        // Battle reconnection manager
        this.battleReconnectionManager = null;
        
        // NEW: Store opponent abilities data with enhanced debugging
        this.opponentAbilitiesData = null;
        
        // Initialize centralized turn tracker
        this.turnTracker = new TurnTracker();
        
        // Initialize managers
        this.deckManager = new DeckManager();
        this.handManager = new HandManager(this.deckManager);
        this.lifeManager = new LifeManager();
        this.goldManager = new GoldManager();
        this.battleScreen = new BattleScreen();
        this.heroAbilitiesManager = new HeroAbilitiesManager();
        this.cardRewardManager = new CardRewardManager(this.deckManager, this.handManager, this.goldManager);
        this.cardPreviewManager = new CardPreviewManager();
        this.formationManager = new FormationManager();
        this.heroSelectionUI = new HeroSelectionUI();
        this.heroSpellbookManager = new HeroSpellbookManager();
        this.actionManager = new ActionManager();
    

        // Initialize hero abilities manager with references
        this.heroAbilitiesManager.init(
            this.handManager,
            this.formationManager, 
            async () => {
                // Callback for when ability state changes
                this.updateBattleFormationUI();
                this.updateHandDisplay();
                await this.saveGameState();
            }
        );

        // Initialize hero spellbook manager with references
        this.heroSpellbookManager.init(
            this.handManager,
            this.formationManager,
            async () => {
                // Callback for when spellbook state changes
                this.updateBattleFormationUI();
                await this.saveGameState();
            }
        );

        // Initialize enhanced hand manager drag support
        this.initializeHandManagerWithEnhancedDragSupport();

        // Expose handManager to window for HTML event handlers
        if (typeof window !== 'undefined') {
            window.handManager = this.handManager;
        }
        
        // UI state
        this.currentPhase = 'selection'; // 'loading', 'selection', 'team_building', 'battle_active'
        this.stateInitialized = false;
        
        // Character card mappings
        this.characterCards = {
            'Alice': ['CrumTheClassPet', 'DestructionMagic', 'Jiggles', 'LootThePrincess', 'MoonlightButterfly', 'PhoenixBombardment', 'RoyalCorgi', 'SummoningMagic'],
            'Cecilia': ['CrusadersArm-Cannon', 'CrusadersCutlass', 'CrusadersFlintlock', 'CrusadersHookshot', 'Leadership', 'TreasureChest', 'WantedPoster', 'Wealth'],
            'Darge': ['AngelfeatherArrow', 'BombArrow', 'FlameArrow', 'GoldenArrow', 'PoisonedArrow', 'RacketArrow', 'RainbowsArrow', 'RainOfArrows'],
            'Gon': ['BladeOfTheFrostbringer', 'Clone', 'Cold-HeartedYuki-Onna', 'FrostRune', 'HeartOfIce', 'Icebolt', 'IcyGrave', 'SnowCannon'],
            'Ida': ['BottledFlame', 'BurningSkeleton', 'ChaorcFriendlyFireballer', 'DestructionMagic', 'Fireball', 'Fireshield', 'FlameAvalanche', 'VampireOnFire'],
            'Medea': ['DecayMagic', 'PoisonedMeat', 'PoisonedWell', 'PoisonPollen', 'PoisonVial', 'ToxicFumes', 'ToxicTrap', 'VenomInfusion'],
            'Monia': ['CoolCheese', 'CoolnessOvercharge', 'CoolPresents', 'CrashLanding', 'GloriousRebirth', 'LifeSerum', 'TrialOfCoolness', 'UltimateDestroyerPunch'],
            'Nicolas': ['AlchemicJournal', 'Alchemy', 'BottledFlame', 'BottledLightning', 'BoulderInABottle', 'ExperimentalPotion', 'MonsterInABottle', 'PressedSkill'],
            'Semi': ['Adventurousness', 'ElixirOfImmortality', 'ElixirOfStrength', 'HealingMelody', 'MagneticGlove', 'Stoneskin', 'TreasureChest', 'TreasureHuntersBackpack'],
            'Sid': ['MagicAmethyst', 'MagicCobalt', 'MagicEmerald', 'MagicRuby', 'MagicSapphire', 'MagicTopaz', 'Thieving', 'ThievingStrike'],
            'Tharx': ['Archer', 'Cavalry', 'Challenge', 'FieldStandard', 'FrontSoldier', 'FuriousAnger', 'GuardChange', 'TharxianHorse'],
            'Toras': ['HeavyHit', 'LegendarySwordOfABarbarianKing', 'Overheat', 'SkullmaelsGreatsword', 'SwordInABottle', 'TheMastersSword', 'TheStormblade', 'TheSunSword'],
            'Vacarn': ['Necromancy', 'SkeletonArcher', 'SkeletonBard', 'SkeletonDeathKnight', 'SkeletonMage', 'SkeletonNecromancer', 'SkeletonReaper', 'SummoningMagic']
        };
    }

    // Initialize with game context and setup turn tracker
    async init(isHost, gameDataSender, onSelectionComplete, roomManager) {
        this.isHost = isHost;
        this.gameDataSender = gameDataSender;
        this.onSelectionComplete = onSelectionComplete;
        this.roomManager = roomManager;
        
        // Initialize turn tracker with dependencies
        this.turnTracker.init(
            roomManager,
            gameDataSender,
            (turnChangeData) => this.onTurnChange(turnChangeData)
        );

        
    // Initialize action manager with callback
        this.actionManager.init((actionChangeData) => {
            // Update UI when actions change
            this.updateActionDisplay();
            
            // Sync with opponent
            if (actionChangeData.player) {
                this.syncActionsWithOpponent();
            }
        });
        
        // Set up battle state listener
        this.setupBattleStateListener();
        
        return this.loadCharacters();
    }

    // Sync actions with opponent:
    syncActionsWithOpponent() {
        if (this.gameDataSender) {
            const actionData = this.actionManager.exportActionData();
            this.gameDataSender('action_update', {
                playerActions: actionData.playerActions,
                maxActions: actionData.maxActions
            });
        }
    }

    // Enhanced hand manager initialization with ability drag support
    initializeHandManagerWithEnhancedDragSupport() {
        if (!this.handManager) return;
        
        const originalStartDrag = this.handManager.startHandCardDrag.bind(this.handManager);
        const originalEndDrag = this.handManager.endHandCardDrag.bind(this.handManager);
        
        this.handManager.startHandCardDrag = function(cardIndex, cardName, draggedElement) {
            const result = originalStartDrag(cardIndex, cardName, draggedElement);
            
            // Check if dragging ability card
            if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
                if (window.heroSelection.heroAbilitiesManager.isAbilityCard(cardName)) {
                    document.body.classList.add('dragging-ability');
                }
            }
            
            return result;
        };
        
        this.handManager.endHandCardDrag = function() {
            document.body.classList.remove('dragging-ability');
            return originalEndDrag();
        };
    }

    // Check if dragging an ability card
    isDraggingAbilityCard() {
        if (!this.handManager || !this.handManager.isHandDragging()) {
            return false;
        }
        
        const dragState = this.handManager.getHandDragState();
        return this.heroAbilitiesManager.isAbilityCard(dragState.draggedCardName);
    }

    // Battle state listener with more robust state management
    setupBattleStateListener() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) return;
        
        const roomRef = this.roomManager.getRoomRef();
        
        // Remove any existing listener
        if (this.battleStateListener) {
            roomRef.child('gameState').off('value', this.battleStateListener);
        }
        
        // Set up new listener
        this.battleStateListener = roomRef.child('gameState').on('value', async (snapshot) => {
            // Skip processing if listener is temporarily disabled or cleanup is in progress
            if (this.listenerTemporarilyDisabled || this.battleStateCleanupInProgress) {
                return;
            }
            
            const gameState = snapshot.val();
            if (!gameState) return;
            
            const hostReady = gameState.hostBattleReady || false;
            const guestReady = gameState.guestBattleReady || false;
            const battleStarted = gameState.battleStarted || false;
            
            // Don't clear battle state if we're actively transitioning
            if (this.getCurrentPhase() === 'team_building' && 
                battleStarted && 
                !this.isReturningFromBattle && 
                !this.isTransitioningToBattle &&
                !this.isRestoringFromSave) {
                
                await this.emergencyBattleStateClear();
                return; // Skip rest of processing to let the clear take effect
            }
            
            // Only update button state if we're in team building phase AND not returning from battle AND not transitioning
            if (this.getCurrentPhase() === 'team_building' && 
                !this.isReturningFromBattle && 
                !this.isTransitioningToBattle) {
                
                const toBattleBtn = document.querySelector('.to-battle-button');
                if (toBattleBtn) {
                    const myReady = this.isHost ? hostReady : guestReady;
                    const opponentReady = this.isHost ? guestReady : hostReady;
                    
                    // IMPROVED: Only disable if we're ready but opponent isn't, or if battle started
                    const shouldDisable = (myReady && !opponentReady) || battleStarted;
                    toBattleBtn.disabled = shouldDisable;
                }
            }
            
            // Check if we're waiting and opponent just became ready
            const waitingOverlay = document.getElementById('battleFormationWaitingOverlay');
            if (waitingOverlay && waitingOverlay.style.display === 'flex') {
                if (hostReady && guestReady && !battleStarted && !this.isTransitioningToBattle) {
                    
                    // Set transition flag BEFORE making any changes
                    this.isTransitioningToBattle = true;
                    
                    // Only host marks battle as started
                    if (this.isHost) {
                        await roomRef.child('gameState').update({
                            battleStarted: true,
                            battleStartTime: Date.now()
                        });
                    }
                }
                
                if (battleStarted && this.isTransitioningToBattle) {
                    // Transition to battle
                    this.transitionToBattleScreen();
                }
            }
            
            // Handle case where we load into a game where opponent is already waiting
            if (!battleStarted && 
                this.getCurrentPhase() === 'team_building' && 
                !this.isReturningFromBattle && 
                !this.isTransitioningToBattle) {
                
                const myReady = this.isHost ? hostReady : guestReady;
                const opponentReady = this.isHost ? guestReady : hostReady;
                
                if (myReady && !opponentReady) {
                    // We're ready, opponent isn't - show waiting
                    this.showBattleWaitingOverlay();
                }
            }
        });
    }

    // NEW: Emergency battle state clear for when normal cleanup fails
    async emergencyBattleStateClear() {
        
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return;
        }

        // Temporarily disable listener to prevent feedback loops
        this.listenerTemporarilyDisabled = true;
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            
            // Force clear ALL battle-related states
            await roomRef.child('gameState').update({
                hostBattleReady: false,
                guestBattleReady: false,
                battleStarted: false,
                battleStartTime: null,
                emergencyCleared: Date.now(),
                lastBattleCleared: Date.now()
            });
            
            // Force button to enabled state
            const toBattleBtn = document.querySelector('.to-battle-button');
            if (toBattleBtn) {
                toBattleBtn.disabled = false;
            }
            
        } catch (error) {
            // Error occurred but don't log it
        } finally {
            // Re-enable listener after a delay
            setTimeout(() => {
                this.listenerTemporarilyDisabled = false;
            }, 1000);
        }
    }

    // OVERRIDE: Ensure button state when UI updates
    ensureToBattleButtonState() {
        const toBattleBtn = document.querySelector('.to-battle-button');
        if (toBattleBtn && this.getCurrentPhase() === 'team_building') {
            // AGGRESSIVE: Always force enable the button when ensuring state
            toBattleBtn.disabled = false;
            
            // Double-check in next tick to make sure it sticks
            setTimeout(() => {
                if (toBattleBtn.disabled) {
                    toBattleBtn.disabled = false;
                }
            }, 100);
        }
    }

    // Handle turn changes from TurnTracker
    onTurnChange(turnChangeData) {
        // Reset actions at the start of each turn (team building phase)
        this.actionManager.resetActions();
        
        // Update UI to reflect new turn
        if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
            window.updateHeroSelectionUI();
        }
    }

    // Load all character images from the Cards/Characters folder
    async loadCharacters() {
        try {
            const characterFiles = [
                'Alice.png', 'Cecilia.png', 'Gon.png', 'Ida.png', 'Medea.png',
                'Monia.png', 'Nicolas.png', 'Toras.png', 'Sid.png', 'Darge.png', 
                'Vacarn.png', 'Tharx.png', 'Semi.png'
            ];

            // Load character data
            this.allCharacters = characterFiles.map((filename, index) => ({
                id: index,
                name: this.formatCharacterName(filename),
                image: `./Cards/Characters/${filename}`,
                filename: filename
            }));

            // ALWAYS attempt to restore state first (for both fresh games and reconnections)
            const stateRestored = await this.restoreGameState();
            
            if (stateRestored) {
                // State restored
            } else {
                // No existing game state found
            }
            
            this.stateInitialized = true;
            return true;
        } catch (error) {
            return false;
        }
    }

    // Restore game state method with battle reconnection support and ability debugging
    async restoreGameState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }
        
        this.isRestoringFromSave = true;

        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('gameState').once('value');
            const gameState = snapshot.val();
            
            if (!gameState) {
                console.log('No game state found to restore');
                return false;
            }

            console.log('Restoring game state from Firebase');

            // Restore turn using TurnTracker
            await this.turnTracker.importTurnData(gameState);

            // STEP 1: First restore all character assignments and selections
            let charactersRestored = false;
            
            // Restore character assignments if they exist
            if (gameState.hostCharacters && gameState.guestCharacters) {
                if (this.isHost) {
                    this.playerCharacters = gameState.hostCharacters || [];
                    this.opponentCharacters = gameState.guestCharacters || [];
                } else {
                    this.playerCharacters = gameState.guestCharacters || [];
                    this.opponentCharacters = gameState.hostCharacters || [];
                }

                charactersRestored = true;
                console.log('Characters restored:', {
                    playerCount: this.playerCharacters.length,
                    opponentCount: this.opponentCharacters.length
                });
            }

            // Restore player selections and formations
            if (this.isHost && gameState.hostSelected) {
                this.selectedCharacter = gameState.hostSelected;
                console.log('Host character selected:', this.selectedCharacter.name);
                
                // Restore formations using FormationManager
                if (gameState.hostBattleFormation) {
                    this.formationManager.importFormationState({
                        battleFormation: gameState.hostBattleFormation,
                        opponentBattleFormation: gameState.guestBattleFormation ? 
                            this.formationManager.alignOpponentFormation(gameState.guestBattleFormation) : null
                    }, true);
                } else {
                    this.formationManager.initWithCharacter(this.selectedCharacter);
                }

                // Restore other host data including gold
                this.restorePlayerData(gameState.hostDeck, gameState.hostHand, gameState.hostLifeData, gameState.hostGoldData);
                
            } else if (!this.isHost && gameState.guestSelected) {
                this.selectedCharacter = gameState.guestSelected;
                console.log('Guest character selected:', this.selectedCharacter.name);
                
                // Restore formations using FormationManager
                if (gameState.guestBattleFormation) {
                    this.formationManager.importFormationState({
                        battleFormation: gameState.guestBattleFormation,
                        opponentBattleFormation: gameState.hostBattleFormation ? 
                            this.formationManager.alignOpponentFormation(gameState.hostBattleFormation) : null
                    }, false);
                } else {
                    this.formationManager.initWithCharacter(this.selectedCharacter);
                }

                // Restore other guest data including gold
                this.restorePlayerData(gameState.guestDeck, gameState.guestHand, gameState.guestLifeData, gameState.guestGoldData);
            }

            // Restore abilities
            let abilitiesRestored = false;
            
            if (this.isHost && gameState.hostAbilitiesState) {
                abilitiesRestored = this.heroAbilitiesManager.importAbilitiesState(gameState.hostAbilitiesState);
                
                if (abilitiesRestored) {
                    // Verify Fighting abilities were restored
                    this.verifyRestoredAbilities('HOST');
                }
            } else if (!this.isHost && gameState.guestAbilitiesState) {
                abilitiesRestored = this.heroAbilitiesManager.importAbilitiesState(gameState.guestAbilitiesState);
                
                if (abilitiesRestored) {
                    // Verify Fighting abilities were restored
                    this.verifyRestoredAbilities('GUEST');
                }
            } else {
                // If no saved abilities state, initialize from current formation
                const formation = this.formationManager.getBattleFormation();
                for (const position of ['left', 'center', 'right']) {
                    if (formation[position]) {
                        const heroInfo = getHeroInfo(formation[position].name);
                        if (heroInfo) {
                            this.heroAbilitiesManager.updateHeroPlacement(position, heroInfo);
                        }
                    }
                }
                abilitiesRestored = true;
                this.verifyRestoredAbilities('INITIALIZED');
            }

            // Restore opponent abilities data with verification
            if (this.isHost && gameState.guestAbilitiesData) {
                this.opponentAbilitiesData = gameState.guestAbilitiesData;
                this.verifyOpponentAbilities('GUEST');
            } else if (!this.isHost && gameState.hostAbilitiesData) {
                this.opponentAbilitiesData = gameState.hostAbilitiesData;
                this.verifyOpponentAbilities('HOST');
            }

            // Restore Spellbooks
            let spellbooksRestored = false;

            if (this.isHost && gameState.hostSpellbooksState) {
                spellbooksRestored = this.heroSpellbookManager.importSpellbooksState(gameState.hostSpellbooksState);
                console.log('Host spellbooks restored:', spellbooksRestored);
            } else if (!this.isHost && gameState.guestSpellbooksState) {
                spellbooksRestored = this.heroSpellbookManager.importSpellbooksState(gameState.guestSpellbooksState);
                console.log('Guest spellbooks restored:', spellbooksRestored);
            }

            // Store opponent spellbooks data
            if (this.isHost && gameState.guestSpellbooksData) {
                this.opponentSpellbooksData = gameState.guestSpellbooksData;
            } else if (!this.isHost && gameState.hostSpellbooksData) {
                this.opponentSpellbooksData = gameState.hostSpellbooksData;
            }

            // NEW: Restore action data
            let actionsRestored = false;
            
            if (this.isHost && gameState.hostActionData) {
                actionsRestored = this.actionManager.importActionData(gameState.hostActionData);
                console.log('Host actions restored:', actionsRestored, gameState.hostActionData);
            } else if (!this.isHost && gameState.guestActionData) {
                actionsRestored = this.actionManager.importActionData(gameState.guestActionData);
                console.log('Guest actions restored:', actionsRestored, gameState.guestActionData);
            } else {
                // If no saved action state, reset to defaults
                this.actionManager.resetActions();
                console.log('No saved action state, reset to defaults');
                actionsRestored = true;
            }

            // Restore opponent selection
            if (this.isHost && gameState.guestSelected) {
                this.opponentSelectedCharacter = gameState.guestSelected;
                console.log('Opponent (guest) character:', this.opponentSelectedCharacter.name);
            } else if (!this.isHost && gameState.hostSelected) {
                this.opponentSelectedCharacter = gameState.hostSelected;
                console.log('Opponent (host) character:', this.opponentSelectedCharacter.name);
            }

            // Determine current phase based on selections
            if (charactersRestored) {
                const hasPlayerSelected = this.isHost ? gameState.hostSelected : gameState.guestSelected;
                const hasOpponentSelected = this.isHost ? gameState.guestSelected : gameState.hostSelected;
                
                if (hasPlayerSelected) {
                    this.currentPhase = 'team_building';
                    console.log('Current phase: team_building');
                } else {
                    this.currentPhase = 'selection';
                    console.log('Current phase: selection');
                }
            } else {
                console.log('No characters restored, cannot determine phase');
                return false;
            }

            // Initialize life manager with turn tracker
            this.initializeLifeManagerWithTurnTracker();

            // STEP 2: NOW check for battle reconnection AFTER characters are restored
            if (BattleReconnectionManager.shouldHandleBattleReconnection(gameState)) {
                console.log('Battle reconnection detected');
                
                // Verify we have both characters selected before attempting battle reconnection
                if (!this.selectedCharacter || !this.opponentSelectedCharacter) {
                    console.log('Cannot handle battle reconnection - missing character selections');
                    // Cannot handle battle reconnection - missing character selections
                    // Fall back to normal restoration
                } else {
                    // Initialize battle reconnection manager
                    this.battleReconnectionManager = new BattleReconnectionManager(this);
                    
                    // Handle battle reconnection
                    const reconnectionHandled = await this.battleReconnectionManager.detectAndHandleBattleReconnection(gameState);
                    
                    if (reconnectionHandled) {
                        console.log('Battle reconnection handled successfully');
                        this.stateInitialized = true;
                        return true;
                    } else {
                        console.log('Battle reconnection failed, continuing with normal restoration');
                        // Continue with normal restoration as fallback
                    }
                }
            }

            // STEP 3: Handle normal game flow (non-battle or fallback)
            
            // Check if selection is complete
            if (this.selectedCharacter && this.opponentSelectedCharacter) {
                setTimeout(() => {
                    if (this.onSelectionComplete) {
                        this.onSelectionComplete({
                            playerCharacter: this.selectedCharacter,
                            opponentCharacter: this.opponentSelectedCharacter
                        });
                    }
                }, 100);
            }

            this.stateInitialized = true;
            
            // Check for pending rewards AFTER state restoration
            setTimeout(async () => {
                this.isRestoringFromSave = false; 
                if (this.currentPhase === 'team_building') {
                    const hasRewards = await this.cardRewardManager.checkAndRestorePendingRewards(this);
                    if (hasRewards) {
                        console.log('Pending card rewards restored');
                    }
                }
            }, 100);
            
            console.log('Game state restoration complete');
            return true;
        } catch (error) {
            console.error('Error restoring game state:', error);
            this.isRestoringFromSave = false; 
            return false;
        }
    }

    // NEW: Verify restored abilities for debugging
    verifyRestoredAbilities(role) {
        const currentAbilities = this.heroAbilitiesManager.exportAbilitiesState();
        
        // Count Fighting abilities specifically
        let totalFighting = 0;
        ['left', 'center', 'right'].forEach(position => {
            const zones = currentAbilities.heroAbilityZones?.[position];
            if (zones) {
                let positionFighting = 0;
                ['zone1', 'zone2', 'zone3'].forEach(zone => {
                    if (zones[zone] && Array.isArray(zones[zone])) {
                        const fightingCount = zones[zone].filter(a => a && a.name === 'Fighting').length;
                        positionFighting += fightingCount;
                    }
                });
                if (positionFighting > 0) {
                    totalFighting += positionFighting;
                }
            }
        });
    }

    // NEW: Verify opponent abilities for debugging
    verifyOpponentAbilities(opponentRole) {
        if (!this.opponentAbilitiesData) {
            return;
        }
        
        let totalOpponentFighting = 0;
        ['left', 'center', 'right'].forEach(position => {
            const abilities = this.opponentAbilitiesData[position];
            if (abilities) {
                let positionFighting = 0;
                ['zone1', 'zone2', 'zone3'].forEach(zone => {
                    if (abilities[zone] && Array.isArray(abilities[zone])) {
                        positionFighting += abilities[zone].filter(a => a && a.name === 'Fighting').length;
                    }
                });
                if (positionFighting > 0) {
                    totalOpponentFighting += positionFighting;
                }
            }
        });
    }

    // Handle reconnection messages
    handleReconnectionMessage(type, data) {
        if (this.battleReconnectionManager) {
            this.battleReconnectionManager.handleReconnectionMessage(type, data);
        }
    }

    // Initialize life manager with turn tracker reference
    initializeLifeManagerWithTurnTracker() {
        if (this.lifeManager) {
            this.lifeManager.init(
                this.lifeManager.onLifeChangeCallback,
                this.turnTracker // Pass turn tracker reference
            );
        }
    }

    // Save game state method with comprehensive ability verification and debugging
    async saveGameState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            const roomRef = this.roomManager.getRoomRef();
            
            // Helper function to sanitize data for Firebase
            const sanitizeForFirebase = (obj) => {
                if (obj === undefined) return null;
                if (obj === null) return null;
                if (typeof obj !== 'object') return obj;
                if (Array.isArray(obj)) {
                    return obj.map(item => sanitizeForFirebase(item));
                }
                
                const sanitized = {};
                for (const [key, value] of Object.entries(obj)) {
                    sanitized[key] = sanitizeForFirebase(value);
                }
                return sanitized;
            };
            
            const gameState = {
                hostCharacters: this.isHost ? this.playerCharacters : this.opponentCharacters,
                guestCharacters: this.isHost ? this.opponentCharacters : this.playerCharacters,
                // Use TurnTracker for turn data
                ...this.turnTracker.exportTurnData(),
                lastUpdated: Date.now()
            };

            // Add player selections and formations with enhanced ability saving
            if (this.isHost && this.selectedCharacter) {
                gameState.hostSelected = this.selectedCharacter;
                gameState.hostBattleFormation = sanitizeForFirebase(this.formationManager.getBattleFormation());

                // Save other host data including gold
                if (this.deckManager) {
                    gameState.hostDeck = sanitizeForFirebase(this.deckManager.exportDeck());
                }
                if (this.handManager) {
                    gameState.hostHand = sanitizeForFirebase(this.handManager.exportHand());
                }
                if (this.lifeManager) {
                    gameState.hostLifeData = sanitizeForFirebase(this.lifeManager.exportLifeData());
                }
                if (this.goldManager) {
                    gameState.hostGoldData = sanitizeForFirebase(this.goldManager.exportGoldData());
                }
                
                // ENHANCED: Save abilities with comprehensive verification
                const abilitiesState = this.heroAbilitiesManager.exportAbilitiesState();
                
                // Verify Fighting abilities before saving
                this.verifyAbilitiesBeforeSave('HOST', abilitiesState);
                
                gameState.hostAbilitiesState = sanitizeForFirebase(abilitiesState);
                
                // Save spellbooks
                const spellbooksState = this.heroSpellbookManager.exportSpellbooksState();
                gameState.hostSpellbooksState = sanitizeForFirebase(spellbooksState);

                // Save opponent abilities data if we have it
                if (this.opponentAbilitiesData) {
                    gameState.guestAbilitiesData = sanitizeForFirebase(this.opponentAbilitiesData);
                }
                
                // Save opponent spellbooks data if we have it
                if (this.opponentSpellbooksData) {
                    gameState.guestSpellbooksData = sanitizeForFirebase(this.opponentSpellbooksData);
                }
                
                // NEW: Save action data for host
                if (this.actionManager) {
                    gameState.hostActionData = sanitizeForFirebase(this.actionManager.exportActionData());
                }

            } else if (!this.isHost && this.selectedCharacter) {
                gameState.guestSelected = this.selectedCharacter;
                gameState.guestBattleFormation = sanitizeForFirebase(this.formationManager.getBattleFormation());

                // Save other guest data including gold
                if (this.deckManager) {
                    gameState.guestDeck = sanitizeForFirebase(this.deckManager.exportDeck());
                }
                if (this.handManager) {
                    gameState.guestHand = sanitizeForFirebase(this.handManager.exportHand());
                }
                if (this.lifeManager) {
                    gameState.guestLifeData = sanitizeForFirebase(this.lifeManager.exportLifeData());
                }
                if (this.goldManager) {
                    gameState.guestGoldData = sanitizeForFirebase(this.goldManager.exportGoldData());
                }
                
                // Save abilities with comprehensive verification
                const abilitiesState = this.heroAbilitiesManager.exportAbilitiesState();
                
                // Verify Fighting abilities before saving
                this.verifyAbilitiesBeforeSave('GUEST', abilitiesState);
                
                gameState.guestAbilitiesState = sanitizeForFirebase(abilitiesState);
                
                // Save spellbooks
                const spellbooksState = this.heroSpellbookManager.exportSpellbooksState();
                gameState.guestSpellbooksState = sanitizeForFirebase(spellbooksState);

                // Save opponent abilities data if we have it
                if (this.opponentAbilitiesData) {
                    gameState.hostAbilitiesData = sanitizeForFirebase(this.opponentAbilitiesData);
                }
                
                // Save opponent spellbooks data if we have it
                if (this.opponentSpellbooksData) {
                    gameState.hostSpellbooksData = sanitizeForFirebase(this.opponentSpellbooksData);
                }
                
                // NEW: Save action data for guest
                if (this.actionManager) {
                    gameState.guestActionData = sanitizeForFirebase(this.actionManager.exportActionData());
                }
            }

            // Save opponent's selection regardless of whether we have selected
            if (this.isHost && this.opponentSelectedCharacter) {
                gameState.guestSelected = this.opponentSelectedCharacter;
            } else if (!this.isHost && this.opponentSelectedCharacter) {
                gameState.hostSelected = this.opponentSelectedCharacter;
            }

            // Sanitize the entire gameState object
            const sanitizedGameState = sanitizeForFirebase(gameState);
            
            await roomRef.child('gameState').update(sanitizedGameState);
            console.log('Game state saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving game state:', error);
            return false;
        }
    }


    // NEW: Verify abilities before saving for debugging
    verifyAbilitiesBeforeSave(role, abilitiesState) {
        let totalFightingToSave = 0;
        ['left', 'center', 'right'].forEach(position => {
            const zones = abilitiesState.heroAbilityZones?.[position];
            if (zones) {
                let positionFighting = 0;
                ['zone1', 'zone2', 'zone3'].forEach(zone => {
                    if (zones[zone] && Array.isArray(zones[zone])) {
                        const fightingCount = zones[zone].filter(a => a && a.name === 'Fighting').length;
                        positionFighting += fightingCount;
                    }
                });
                if (positionFighting > 0) {
                    totalFightingToSave += positionFighting;
                }
            }
        });
    }

    // Delegate turn operations to TurnTracker
    getCurrentTurn() {
        return this.turnTracker.getCurrentTurn();
    }

    async incrementTurn() {
        return await this.turnTracker.incrementTurn();
    }

    async setCurrentTurn(turn) {
        this.turnTracker.setCurrentTurn(turn);
        await this.turnTracker.saveTurnState();
    }

    // Helper method to restore player-specific data
    restorePlayerData(deckData, handData, lifeData, goldData) {
        // Restore deck
        if (deckData && this.deckManager) {
            const deckRestored = this.deckManager.importDeck(deckData);
        } else if (this.selectedCharacter) {
            const characterCards = this.characterCards[this.selectedCharacter.name];
            if (characterCards) {
                this.deckManager.addCards(characterCards);
            }
        }

        // Restore hand
        if (handData && this.handManager) {
            const handRestored = this.handManager.importHand(handData);
        }
        
        // Restore life data
        if (lifeData && this.lifeManager) {
            const lifeRestored = this.lifeManager.importLifeData(lifeData);
        }
        
        // Restore gold data
        if (goldData && this.goldManager) {
            const goldRestored = this.goldManager.importGoldData(goldData);
        }
        
        // Initialize life manager with turn tracker after restoration
        this.initializeLifeManagerWithTurnTracker();
    }

    // Enhanced start character selection process
    async startSelection() {
        if (this.allCharacters.length < 6) {
            return false;
        }

        // Check if we already have character assignments (from restoration)
        if (this.playerCharacters.length > 0 && this.opponentCharacters.length > 0) {
            // Update the UI with existing assignments
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                window.updateHeroSelectionUI();
            }
            
            return true;
        }

        // Only the HOST should generate character selections, and only if no characters exist
        if (!this.isHost) {
            this.currentPhase = 'selection';
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                window.updateHeroSelectionUI();
            }
            return true;
        }

        // IMPORTANT: Check if this is truly a fresh game before resetting
        const currentTurn = this.turnTracker.getCurrentTurn();
        if (currentTurn > 1) {
            // Don't proceed with new game generation if turn > 1
            return false;
        }

        // Host generates NEW character selection only if none exists
        this.currentPhase = 'selection';
        
        // Clear any previous selections to ensure fresh start
        this.selectedCharacter = null;
        this.opponentSelectedCharacter = null;
        this.formationManager.reset();
        this.cardRewardManager.clearAnyActiveCardRewards();
        
        // Reset managers for new game
        this.deckManager.reset();
        this.handManager.reset();
        this.lifeManager.reset();
        this.goldManager.reset();
        
        // Reset turn tracker for new game ONLY if it's truly turn 1
        if (currentTurn === 1) {
            this.turnTracker.reset();
            this.initializeLifeManagerWithTurnTracker();
        }
        
        // Generate new character selection
        const selectedIndices = this.getRandomUniqueIndices(this.allCharacters.length, 6);
        const allSelectedCharacters = selectedIndices.map(index => this.allCharacters[index]);
        
        // Split into two groups of 3 (host gets first 3, guest gets last 3)
        this.playerCharacters = allSelectedCharacters.slice(0, 3);
        this.opponentCharacters = allSelectedCharacters.slice(3, 6);

        // IMPORTANT: Save the character assignments immediately after generation
        await this.saveGameState();

        // Send character selections to guest via P2P/Firebase
        if (this.gameDataSender) {
            this.gameDataSender('character_selection', {
                hostCharacters: this.playerCharacters,
                guestCharacters: this.opponentCharacters,
                phase: 'selection_ready'
            });
        }

        // Update the UI after character generation
        if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
            window.updateHeroSelectionUI();
            
            setTimeout(() => {
                if (window.updateHeroSelectionUI) {
                    window.updateHeroSelectionUI();
                }
            }, 100);
        }

        return true;
    }

    // Receive character selection from opponent
    receiveCharacterSelection(data) {
        if (data.phase === 'selection_ready') {
            
            if (this.isHost) {
                return;
            }
            
            // Guest receives character assignments from host
            if (data.hostCharacters && data.guestCharacters) {
                this.opponentCharacters = data.hostCharacters;
                this.playerCharacters = data.guestCharacters;
                this.currentPhase = 'selection';
                
                // Guest should also save the state after receiving characters
                this.saveGameState();
                
                if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                    window.updateHeroSelectionUI();
                }
            }
        }
    }

    // Select a character (when player clicks on one)
    async selectCharacter(characterId) {
        const character = this.playerCharacters.find(c => c.id === characterId);
        if (!character) {
            return false;
        }

        this.selectedCharacter = character;
        this.currentPhase = 'team_building';

        // Initialize battle formation with selected character in center
        this.formationManager.initWithCharacter(character);

        // Get full hero info from database
        const heroInfo = getHeroInfo(character.name);
        if (heroInfo) {
            // Initialize hero with starting abilities in center position
            this.heroAbilitiesManager.updateHeroPlacement('center', heroInfo);
        }

        // Initialize life manager with turn tracker for team building phase
        this.initializeLifeManagerWithTurnTracker();

        // Add character's cards to deck
        const characterCards = this.characterCards[character.name];
        if (characterCards) {
            this.deckManager.addCards(characterCards);
        } else {
            this.deckManager.clearDeck();
        }

        // Draw initial hand immediately after character selection!
        const drawnCards = this.handManager.drawInitialHand();

        // Hide card preview if visible
        this.cardPreviewManager.hideCardPreview();

        // Reset actions when selecting a new character
        this.actionManager.resetActions();
        
        // Save complete selection state to Firebase (including new hand)
        await this.saveGameState();

        // Send selection to opponent
        if (this.gameDataSender) {
            this.gameDataSender('character_selected', {
                character: character,
                playerRole: this.isHost ? 'host' : 'guest'
            });
        }

        // Send initial formation update to opponent
        await this.sendFormationUpdate();

        // Update the UI to show the new hand immediately
        if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
            window.updateHeroSelectionUI();
        }

        // Check if both players have selected
        this.checkSelectionComplete();

        return true;
    }

    // ENHANCED: Send formation update to opponent via P2P with abilities and comprehensive debugging
    async sendFormationUpdate() {
        if (this.gameDataSender) {                        
            const abilitiesData = {
                left: this.heroAbilitiesManager.getHeroAbilities('left'),
                center: this.heroAbilitiesManager.getHeroAbilities('center'),
                right: this.heroAbilitiesManager.getHeroAbilities('right')
            };
            
            // Count and verify abilities being sent
            let totalAbilitiesSent = 0;
            let totalFightingSent = 0;
            ['left', 'center', 'right'].forEach(position => {
                const abilities = abilitiesData[position];
                if (abilities) {
                    let positionAbilities = 0;
                    let positionFighting = 0;
                    
                    ['zone1', 'zone2', 'zone3'].forEach(zone => {
                        if (abilities[zone] && Array.isArray(abilities[zone])) {
                            positionAbilities += abilities[zone].length;
                            const fightingCount = abilities[zone].filter(a => a && a.name === 'Fighting').length;
                            positionFighting += fightingCount;
                            
                            if (abilities[zone].length > 0) {
                                abilities[zone].forEach((ability, idx) => {
                                    // Count abilities
                                });
                            }
                        }
                    });
                    
                    if (positionAbilities > 0) {
                        totalAbilitiesSent += positionAbilities;
                        totalFightingSent += positionFighting;
                    }
                }
            });
                        
            this.gameDataSender('formation_update', {
                playerRole: this.isHost ? 'host' : 'guest',
                battleFormation: this.formationManager.getBattleFormation(),
                abilities: abilitiesData 
            });

            const spellbooksData = {
            left: this.heroSpellbookManager.getHeroSpellbook('left'),
            center: this.heroSpellbookManager.getHeroSpellbook('center'),
            right: this.heroSpellbookManager.getHeroSpellbook('right')
        };

        this.gameDataSender('formation_update', {
            playerRole: this.isHost ? 'host' : 'guest',
            battleFormation: this.formationManager.getBattleFormation(),
            abilities: abilitiesData,
            spellbooks: spellbooksData // Add spellbooks to the message
        });
        }
    }

    // Receive formation update from opponent with abilities and comprehensive debugging
    receiveFormationUpdate(data) {
        
        this.formationManager.updateOpponentFormation(data);
        
        // Store opponent abilities if included
        if (data.abilities) {            
            let totalOpponentAbilities = 0;
            let totalOpponentFighting = 0;
            ['left', 'center', 'right'].forEach(position => {
                const abilities = data.abilities[position];
                if (abilities) {
                    let positionAbilities = 0;
                    let positionFighting = 0;
                    
                    ['zone1', 'zone2', 'zone3'].forEach(zone => {
                        if (abilities[zone] && Array.isArray(abilities[zone])) {
                            positionAbilities += abilities[zone].length;
                            const fightingCount = abilities[zone].filter(a => a && a.name === 'Fighting').length;
                            positionFighting += fightingCount;
                            
                            if (abilities[zone].length > 0) {
                                abilities[zone].forEach((ability, idx) => {
                                    // Count abilities
                                });
                            }
                        }
                    });
                    
                    if (positionAbilities > 0) {
                        totalOpponentAbilities += positionAbilities;
                        totalOpponentFighting += positionFighting;
                    }
                }
            });

            // Store opponent spellbooks if included
            if (data.spellbooks) {                
                // Store for later use when battle starts
                this.opponentSpellbooksData = data.spellbooks;
                
                // Log spellbook counts
                ['left', 'center', 'right'].forEach(position => {
                    const spellbook = data.spellbooks[position];
                    
                });
            }
                        
            // Store for later use when battle starts
            this.opponentAbilitiesData = data.abilities;
            
            // If we're in team building phase, update display
            if (this.currentPhase === 'team_building') {
                this.updateOpponentAbilityDisplay();
            }
        }
    }

    // NEW: Update opponent ability display (optional UI enhancement)
    updateOpponentAbilityDisplay() {
        if (!this.opponentAbilitiesData) return;
        
        // This is optional - you could add visual indicators showing
        // how many abilities each opponent hero has
        ['left', 'center', 'right'].forEach(position => {
            const abilities = this.opponentAbilitiesData[position];
            if (abilities) {
                const totalAbilities = 
                    (abilities.zone1?.length || 0) +
                    (abilities.zone2?.length || 0) +
                    (abilities.zone3?.length || 0);
                
                // Could add UI indicators here if desired
            }
        });
    }

    // NEW: Align opponent abilities with their formation
    alignOpponentAbilities(opponentAbilities) {
        if (!opponentAbilities) return null;
        
        // Since opponent formation is already aligned in FormationManager,
        // we just need to match abilities to the aligned formation
        return {
            left: opponentAbilities.left || null,
            center: opponentAbilities.center || null,
            right: opponentAbilities.right || null
        };
    }

    // Format filename to display name
    formatCharacterName(filename) {
        return filename
            .replace('.png', '')
            .replace('.jpg', '')
            .replace('.jpeg', '')
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Receive opponent's character selection
    async receiveOpponentSelection(data) {
        this.opponentSelectedCharacter = data.character;
        
        // Update Firebase with opponent's selection
        if (this.roomManager && this.roomManager.getRoomRef()) {
            try {
                const roomRef = this.roomManager.getRoomRef();
                const updateKey = data.playerRole === 'host' ? 'hostSelected' : 'guestSelected';
                const update = {};
                update[updateKey] = data.character;
                update.lastUpdated = Date.now();
                
                await roomRef.child('gameState').update(update);
            } catch (error) {
                // Error occurred but don't log it
            }
        }
        
        this.checkSelectionComplete();
    }

    // Check if selection is complete and trigger completion callback
    checkSelectionComplete() {
        if (this.selectedCharacter && this.opponentSelectedCharacter) {
            if (this.onSelectionComplete) {
                this.onSelectionComplete({
                    playerCharacter: this.selectedCharacter,
                    opponentCharacter: this.opponentSelectedCharacter
                });
            }
        }
    }

    // Show character preview
    showCharacterPreview(character) {
        this.cardPreviewManager.showCharacterPreview(
            character, 
            this.characterCards, 
            (cardName) => this.formatCardName(cardName)
        );
    }

    // Show card tooltip
    showCardTooltip(cardData, cardElement) {
        this.cardPreviewManager.showCardTooltip(cardData, cardElement);
    }

    // Hide card tooltip
    hideCardTooltip() {
        this.cardPreviewManager.hideCardTooltip();
    }

    // Clear all tooltips
    clearAllTooltips() {
        this.cardPreviewManager.clearAllTooltips();
    }

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Generate array of unique random indices
    getRandomUniqueIndices(maxIndex, count) {
        const indices = [];
        const available = Array.from({ length: maxIndex }, (_, i) => i);
        
        for (let i = 0; i < count && available.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * available.length);
            indices.push(available[randomIndex]);
            available.splice(randomIndex, 1);
        }
        
        return indices;
    }

    // Show card rewards using new system
    async showCardRewards(battleResult = 'victory') {
        return this.cardRewardManager.showRewardsAfterBattle(
            this.turnTracker, 
            this,
            battleResult // Pass the battle result through
        );
    }

    // Check and restore card rewards using new system
    async checkAndRestorePendingCardRewards() {
        return this.cardRewardManager.checkAndRestorePendingRewards(this);
    }

    // Clear any active card rewards (for cleanup operations)
    clearAnyActiveCardRewards() {
        this.cardRewardManager.clearAnyActiveCardRewards();
    }

    // Update deck display after adding reward cards
    updateDeckDisplay() {
        // Find the deck display container in the team building right section
        const deckContainer = document.querySelector('.team-building-right');
        if (deckContainer) {
            // Regenerate the deck grid HTML
            const updatedDeckGrid = this.deckManager.createDeckGrid((cardName) => this.formatCardName(cardName));
            
            // Replace the deck content
            deckContainer.innerHTML = updatedDeckGrid;
            
            // Add special highlighting to newly added reward card if it exists
            const lastAddedCard = this.cardRewardManager.getLastAddedRewardCard();
            if (lastAddedCard) {
                setTimeout(() => {
                    const rewardCardSlots = deckContainer.querySelectorAll('.reward-card-slot');
                    const lastRewardSlot = Array.from(rewardCardSlots).find(slot => {
                        const cardName = slot.querySelector('.card-name');
                        return cardName && cardName.textContent.includes(this.formatCardName(lastAddedCard));
                    });
                    
                    if (lastRewardSlot) {
                        lastRewardSlot.classList.add('newly-added');
                        
                        // Scroll to the newly added card if it's not visible
                        const scrollableWrapper = deckContainer.querySelector('.deck-grid-wrapper.scrollable');
                        if (scrollableWrapper) {
                            // Get the position of the newly added card
                            const cardTop = lastRewardSlot.offsetTop;
                            const cardHeight = lastRewardSlot.offsetHeight;
                            const wrapperHeight = scrollableWrapper.offsetHeight;
                            const currentScroll = scrollableWrapper.scrollTop;
                            
                            // Check if card is not fully visible
                            if (cardTop < currentScroll || cardTop + cardHeight > currentScroll + wrapperHeight) {
                                // Scroll to center the card
                                scrollableWrapper.scrollTo({
                                    top: cardTop - (wrapperHeight / 2) + (cardHeight / 2),
                                    behavior: 'smooth'
                                });
                            }
                        }
                        
                        // Remove the highlight after animation completes
                        setTimeout(() => {
                            lastRewardSlot.classList.remove('newly-added');
                            this.cardRewardManager.clearLastAddedRewardCard();
                        }, 2000);
                    }
                }, 100);
            }
        }
    }

    // Manual screen transition fallback
    manuallyReturnToFormationScreen() {
        // Hide battle arena if it exists
        const battleArena = document.getElementById('battleArena');
        if (battleArena) {
            battleArena.style.display = 'none';
        }
        
        // Show the hero selection screen
        const heroSelectionScreen = document.querySelector('.hero-selection-screen');
        if (heroSelectionScreen) {
            heroSelectionScreen.style.display = 'flex';
        }
        
        // Update the UI to show team building
        window.updateHeroSelectionUI();
        
        // Update the deck display immediately
        this.updateDeckDisplay();
        
        // Ensure game screen is visible
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.classList.remove('hidden');
        }
        
        // Reset any battle states
        this.isPlayerReady = false;
        this.isOpponentReady = false;
    }

    // Return to formation screen with more aggressive cleanup
    async returnToFormationScreenAfterBattle() {
        
        // Set flag to prevent Firebase listener from interfering
        this.isReturningFromBattle = true;
        this.battleStateCleanupInProgress = true;
        this.listenerTemporarilyDisabled = true;
        this.isTransitioningToBattle = false;
        
        try {
            // STEP 1: IMMEDIATE UI UPDATES (no waiting for Firebase)
            
            // Clear all tooltips
            this.clearAllTooltips();
            
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
            
            // Force button to enabled state IMMEDIATELY
            const toBattleBtn = document.querySelector('.to-battle-button');
            if (toBattleBtn) {
                toBattleBtn.disabled = false;
            }
            
            // Reset turn-based ability tracking for the new turn!
            if (this.heroAbilitiesManager) {
                this.heroAbilitiesManager.resetTurnBasedTracking();
            }
                
            // Reset actions for the new turn after battle
            if (this.actionManager) {
                this.actionManager.resetActions();
                console.log('✨ Actions reset for new turn after battle');
            }
            
            // Update UI to show team building
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                window.updateHeroSelectionUI();
            }
            
            // Update deck display immediately
            this.updateDeckDisplay();
            
            // STEP 2: FIREBASE CLEANUP (non-blocking, happens in background)
            // Start Firebase cleanup but don't await it - let it happen in background
            this.aggressiveBattleStateClear().then(() => {
                console.log('Background Firebase cleanup completed');
            }).catch(error => {
                console.log('Background Firebase cleanup failed, but UI already updated');
            });
            
            // Extra Firebase cleanup (also non-blocking)
            if (this.roomManager && this.roomManager.getRoomRef()) {
                const roomRef = this.roomManager.getRoomRef();
                Promise.all([
                    roomRef.child('gameState/hostBattleReady').set(false),
                    roomRef.child('gameState/guestBattleReady').set(false),
                    roomRef.child('gameState/battleStarted').set(false),
                    roomRef.child('gameState/battleStartTime').remove(),
                    roomRef.child('gameState/hostBattleReadyTime').remove(),
                    roomRef.child('gameState/guestBattleReadyTime').remove()
                ]).catch(error => {
                    // Error occurred but UI is already updated
                });
            }
            
            // STEP 3: Re-enable Firebase listener after a delay (non-blocking)
            setTimeout(() => {
                this.isReturningFromBattle = false;
                this.battleStateCleanupInProgress = false;
                this.listenerTemporarilyDisabled = false;
                
                // Final verification that states are cleared
                if (this.roomManager && this.roomManager.getRoomRef()) {
                    this.roomManager.getRoomRef().child('gameState').once('value', (snapshot) => {
                        const state = snapshot.val();
                        if (state && (state.hostBattleReady || state.guestBattleReady || state.battleStarted)) {
                            this.emergencyBattleStateClear();
                        }
                    });
                }
            }, 2000);
            
        } catch (error) {
            // Even if cleanup fails, try to return to formation
            this.isReturningFromBattle = false;
            this.battleStateCleanupInProgress = false;
            this.listenerTemporarilyDisabled = false;
            this.isTransitioningToBattle = false;
        }
    }

    // More aggressive state clearing with multiple approaches
    async aggressiveBattleStateClear() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return;
        }

        const roomRef = this.roomManager.getRoomRef();
        
        try {
            // Method 1: Direct update
            await roomRef.child('gameState').update({
                hostBattleReady: false,
                guestBattleReady: false,
                battleStarted: false,
                battleStartTime: null,
                aggressiveCleared: Date.now(),
                lastBattleCleared: Date.now()
            });
            
            // Method 2: Individual field clearing (in parallel, not sequential)
            await Promise.all([
                roomRef.child('gameState/hostBattleReady').set(false),
                roomRef.child('gameState/guestBattleReady').set(false),
                roomRef.child('gameState/battleStarted').set(false),
                roomRef.child('gameState/battleStartTime').remove()
            ]);
            
            // Method 3: Quick verification (removed the 500ms delay!)
            const verification = await roomRef.child('gameState').once('value');
            const verifyState = verification.val();
            
            if (verifyState && verifyState.battleStarted) {
                await roomRef.child('gameState/battleStarted').set(false);
            }
            
        } catch (error) {
            // Error occurred but don't log it
        }
    }

    // Handle To Battle click with improved state management
    async handleToBattleClick() {
        
        // Prevent multiple clicks
        const toBattleBtn = document.querySelector('.to-battle-button');
        if (toBattleBtn && toBattleBtn.disabled) {
            return;
        }
        
        // Disable the button immediately
        if (toBattleBtn) {
            toBattleBtn.disabled = true;
        }
        
        // Set player ready state
        await this.setPlayerBattleReady(true);
        
        // Check if we should transition
        await this.checkAndHandleBattleTransition();
    }
    
    // Set player's battle ready state
    async setPlayerBattleReady(ready) {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const updateKey = this.isHost ? 'hostBattleReady' : 'guestBattleReady';
            
            await roomRef.child('gameState').update({
                [updateKey]: ready,
                [`${updateKey}Time`]: ready ? Date.now() : null
            });
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    // Check and handle battle transition
    async checkAndHandleBattleTransition() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) return;
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('gameState').once('value');
            const gameState = snapshot.val();
            
            if (!gameState) {
                return;
            }
            
            const hostReady = gameState.hostBattleReady || false;
            const guestReady = gameState.guestBattleReady || false;
            const battleStarted = gameState.battleStarted || false;
            
            // If battle already started, join it
            if (battleStarted) {
                this.transitionToBattleScreen();
                return;
            }
            
            // If both are ready and battle hasn't started yet
            if (hostReady && guestReady && !battleStarted) {
                
                // Only HOST should mark battle as started
                if (this.isHost) {
                    await roomRef.child('gameState').update({
                        battleStarted: true,
                        battleStartTime: Date.now()
                    });
                    
                    // Send battle start signal via P2P
                    if (this.gameDataSender) {
                        this.gameDataSender('battle_transition_start', {
                            timestamp: Date.now()
                        });
                    }
                }
                
                // Both players transition
                this.transitionToBattleScreen();
            } else {
                // Show waiting overlay
                this.showBattleWaitingOverlay();
            }
        } catch (error) {
            // Error occurred but don't log it
        }
    }
    
    // Show waiting overlay
    showBattleWaitingOverlay() {
        // Create or update waiting overlay
        let waitingOverlay = document.getElementById('battleFormationWaitingOverlay');
        if (!waitingOverlay) {
            waitingOverlay = document.createElement('div');
            waitingOverlay.id = 'battleFormationWaitingOverlay';
            waitingOverlay.className = 'battle-formation-waiting-overlay';
            document.body.appendChild(waitingOverlay);
        }
        
        waitingOverlay.innerHTML = `
            <div class="waiting-content">
                <h2>⏳ Waiting for opponent...</h2>
                <div class="waiting-spinner"></div>
                <p>Your battle formation is ready!</p>
                <p style="font-size: 0.9rem; color: #aaa; margin-top: 10px;">
                    Opponent needs to click "To Battle!"
                </p>
                <button class="btn btn-secondary" onclick="window.cancelBattleReady()">
                    Cancel
                </button>
            </div>
        `;
        
        waitingOverlay.style.display = 'flex';
        
        // Set up cancel function
        window.cancelBattleReady = async () => {
            await this.cancelBattleReady();
        };
    }
    
    // Hide waiting overlay
    hideBattleWaitingOverlay() {
        const waitingOverlay = document.getElementById('battleFormationWaitingOverlay');
        if (waitingOverlay) {
            waitingOverlay.style.display = 'none';
        }
    }
    
    // Cancel battle ready
    async cancelBattleReady() {
        
        // Re-enable To Battle button
        const toBattleBtn = document.querySelector('.to-battle-button');
        if (toBattleBtn) {
            toBattleBtn.disabled = false;
        }
        
        // Hide waiting overlay
        this.hideBattleWaitingOverlay();
        
        // Clear ready state
        await this.setPlayerBattleReady(false);
        
        // NEW: Ensure the other player's ready state is also considered cleared locally
        this.isPlayerReady = false;
        this.isOpponentReady = false;
    }
    
    // Transition to battle screen (called when both are ready)
    transitionToBattleScreen() {
        
        // Keep transition flag true during the transition
        this.isTransitioningToBattle = true;
        
        // Hide any waiting overlay
        this.hideBattleWaitingOverlay();
        
        // Clear all tooltips
        this.clearAllTooltips();
        
        // Initialize battle screen with current formations
        this.initBattleScreen();
        
        // Hide team building UI
        const heroSelectionScreen = document.querySelector('.hero-selection-screen');
        if (heroSelectionScreen) {
            heroSelectionScreen.style.display = 'none';
        }
        
        // Show battle screen
        if (this.battleScreen) {
            this.battleScreen.showBattleArena();
            
            // Start the battle!
            this.battleScreen.startBattle();
        }
        
        // Clear transition flag after battle starts
        setTimeout(() => {
            this.isTransitioningToBattle = false;
        }, 1000);
    }
    
    // Simplified battle receive handler (now handled by Firebase listener)
    receiveBattleReady(data) {
        // The Firebase listener will handle the state change
    }

    getActionManager() {
        return this.actionManager;
    }

    getCardInfo(cardName) {
        return getCardInfo(cardName);
    }

    // Battle screen management with abilities and comprehensive verification and debugging
    initBattleScreen() {
        if (!this.selectedCharacter || !this.opponentSelectedCharacter) {
            return false;
        }
        
        const playerAbilities = {
            left: this.heroAbilitiesManager.getHeroAbilities('left'),
            center: this.heroAbilitiesManager.getHeroAbilities('center'),
            right: this.heroAbilitiesManager.getHeroAbilities('right')
        };
        
        ['left', 'center', 'right'].forEach(position => {
            const abilities = playerAbilities[position];

            if (abilities) {
                // Count total abilities and Fighting specifically
                let totalAbilities = 0;
                let fightingCount = 0;
                
                ['zone1', 'zone2', 'zone3'].forEach(zone => {
                    if (abilities[zone] && Array.isArray(abilities[zone])) {
                        totalAbilities += abilities[zone].length;
                        const fightingInZone = abilities[zone].filter(a => a && a.name === 'Fighting').length;
                        fightingCount += fightingInZone;
                    }
                });
            }
        });
        
        // Get opponent abilities (from stored data if available)
        let opponentAbilities = null;
        if (this.opponentAbilitiesData) {
            // Transform opponent abilities to match our formation alignment
            opponentAbilities = this.alignOpponentAbilities(this.opponentAbilitiesData);
            
            if (opponentAbilities) {
                ['left', 'center', 'right'].forEach(position => {
                    const abilities = opponentAbilities[position];
                    if (abilities) {
                        let fightingCount = 0;
                        ['zone1', 'zone2', 'zone3'].forEach(zone => {
                            if (abilities[zone] && Array.isArray(abilities[zone])) {
                                fightingCount += abilities[zone].filter(a => a && a.name === 'Fighting').length;
                            }
                        });
                    }
                });
            }
        }
        
        const hasValidPlayerAbilities = Object.values(playerAbilities).some(pos => pos !== null);
        
        if (!hasValidPlayerAbilities) {            
            // EMERGENCY RECOVERY: Try to rebuild abilities from formation
            const formation = this.formationManager.getBattleFormation();
            
            // This is an emergency fallback - in production, you'd want better error handling
            const emergencyAbilities = {};
            ['left', 'center', 'right'].forEach(position => {
                if (formation[position]) {
                    // Try to get abilities from the heroAbilitiesManager directly
                    const directAbilities = this.heroAbilitiesManager.heroAbilityZones?.[position];
                    if (directAbilities) {
                        emergencyAbilities[position] = directAbilities;
                    }
                }
            });
            
            if (Object.keys(emergencyAbilities).length > 0) {
                Object.assign(playerAbilities, emergencyAbilities);
            }
        }
        
        // Get spellbook data for all player heroes
        const playerSpellbooks = {
            left: this.heroSpellbookManager.getHeroSpellbook('left'),
            center: this.heroSpellbookManager.getHeroSpellbook('center'),
            right: this.heroSpellbookManager.getHeroSpellbook('right')
        };

        // Get opponent spellbooks (from stored data if available)
        let opponentSpellbooks = null;
        if (this.opponentSpellbooksData) {
            opponentSpellbooks = this.opponentSpellbooksData;
        }

        // Pass to battleScreen.init()
        this.battleScreen.init(
            this.isHost,
            this.formationManager.getBattleFormation(),
            this.formationManager.getOpponentBattleFormation(),
            this.gameDataSender,
            this.roomManager,
            this.lifeManager,
            this.goldManager,
            this.turnTracker,
            this.roomManager,
            playerAbilities,
            opponentAbilities,
            playerSpellbooks,    
            opponentSpellbooks,
            this.actionManager  // NEW: Pass action manager
        );
        
        return true;
    }

    // Get hero abilities manager
    getHeroAbilitiesManager() {
        return this.heroAbilitiesManager;
    }

    // === HAND MANAGEMENT DELEGATION ===
    // These methods delegate to handManager but handle the UI updates and auto-saving

    getHand() {
        return this.handManager.getHand();
    }

    getHandSize() {
        return this.handManager.getHandSize();
    }

    getHandManager() {
        return this.handManager;
    }

    async addCardToHand(cardName) {
        const success = this.handManager.addCardToHand(cardName);
        if (success) {
            await this.autoSave();
            this.updateHandDisplay();
        }
        return success;
    }

    async removeCardFromHand(cardName) {
        const success = this.handManager.removeCardFromHand(cardName);
        if (success) {
            await this.autoSave();
            this.updateHandDisplay();
        }
        return success;
    }

    async removeCardFromHandByIndex(index) {
        const removedCard = this.handManager.removeCardFromHandByIndex(index);
        if (removedCard) {
            await this.autoSave();
            this.updateHandDisplay();
        }
        return removedCard;
    }

    updateHandDisplay() {
        const handContainer = document.querySelector('.hand-display-area-inline .hand-container');
        if (handContainer) {
            const updatedHandDisplay = this.handManager.createHandDisplay((cardName) => this.formatCardName(cardName));
            handContainer.outerHTML = updatedHandDisplay;
        }
    }

    async drawInitialHand() {
        const drawnCards = this.handManager.drawInitialHand();
        await this.saveGameState();
        
        // Update displays separately
        this.updateHandDisplay();
        this.updateGoldDisplay();
        
        return drawnCards;
    }

    // Auto-save helper method
    async autoSave() {
        if (this.selectedCharacter) {
            await this.saveGameState();
            
            // Ensure gold display is updated after save
            this.updateGoldDisplay();
        }
    }

    // Getter methods
    getCurrentPhase() {
        return this.currentPhase;
    }

    getPlayerCharacters() {
        return [...this.playerCharacters];
    }

    getOpponentCharacters() {
        return [...this.opponentCharacters];
    }

    getSelectedCharacter() {
        return this.selectedCharacter;
    }

    getOpponentSelectedCharacter() {
        return this.opponentSelectedCharacter;
    }

    isSelectionComplete() {
        return this.selectedCharacter !== null && this.opponentSelectedCharacter !== null;
    }

    getDeck() {
        return this.deckManager.getDeck();
    }

    getDeckSize() {
        return this.deckManager.getDeckSize();
    }

    getDeckManager() {
        return this.deckManager;
    }

    getGoldManager() {
        return this.goldManager;
    }

    getLifeManager() {
        return this.lifeManager;
    }
    
    getBattleScreen() {
        return this.battleScreen;
    }

    getTurnTracker() {
        return this.turnTracker;
    }

    getOpponentBattleFormation() {
        return this.formationManager.getOpponentBattleFormation();
    }

    // Initialize callbacks
    initLifeChangeCallback(callback) {
        this.lifeManager.init(callback, this.turnTracker);
    }
    
    initGoldChangeCallback(callback) {
        this.goldManager.init((goldChangeData) => {
            // Handle gold changes - but only update player gold display
            
            // Update the fixed gold display
            this.updateGoldDisplay();
            
            // Call the provided callback if needed
            if (callback) {
                callback(goldChangeData);
            }
        });
    }

    // Update gold display
    updateGoldDisplay() {
        // The gold display is now fixed positioned, so we need to update it directly
        const goldDisplay = document.querySelector('.gold-display-enhanced');
        if (goldDisplay) {
            // Replace the entire gold display with updated content
            goldDisplay.outerHTML = this.goldManager.createGoldDisplay();
        } else {
            // If gold display doesn't exist, add it to the game screen
            const gameScreen = document.getElementById('gameScreen');
            if (gameScreen) {
                // Remove any existing gold display first
                const existingGold = gameScreen.querySelector('.gold-display-enhanced');
                if (existingGold) {
                    existingGold.remove();
                }
                
                // Add the new gold display
                gameScreen.insertAdjacentHTML('beforeend', this.goldManager.createGoldDisplay());
            }
        }
    }
    
    updateLifeDisplay() {
        const lifeDisplayContainer = document.querySelector('.life-display-container');
        if (lifeDisplayContainer) {
            const lifeDisplay = this.lifeManager.createLifeDisplay();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = lifeDisplay;
            const newContent = tempDiv.querySelector('.life-display-container').innerHTML;
            lifeDisplayContainer.innerHTML = newContent;
        }
    }

    // Drag and Drop delegation to FormationManager with ability card handling
    startDrag(character, fromSlot, draggedElement) {
        this.formationManager.startDrag(character, fromSlot, draggedElement);
    }

    // Enhanced handleDrop to check for ability cards first
    async handleDrop(targetSlot) {
        // Check if dropping a spell card
        if (this.isDraggingSpellCard()) {
            const success = await this.handleSpellDrop(targetSlot);
            return success;
        }

        // Check if we're dropping an ability card
        if (this.isDraggingAbilityCard()) {
            // Let the abilities manager handle it
            const success = await this.heroAbilitiesManager.handleTeamSlotDrop(
                { preventDefault: () => {}, stopPropagation: () => {} }, 
                targetSlot
            );
            
            if (success) {
                this.updateBattleFormationUI();
                await this.saveGameState();
            }
            
            return success;
        }
        
        // Otherwise, handle hero swapping as normal
        const swapInfo = await this.formationManager.handleDrop(targetSlot);
        if (swapInfo) {
            // Get the updated formation
            const formation = this.formationManager.getBattleFormation();
            
            // Update ability zones based on hero movement
            if (swapInfo.wasSwap) {
                // Heroes swapped positions - swap their abilities
                this.heroAbilitiesManager.moveHeroAbilities(swapInfo.from, swapInfo.to);
                this.heroSpellbookManager.moveHeroSpellbook(swapInfo.from, swapInfo.to);
            } else {
                // Hero moved to empty slot
                this.heroAbilitiesManager.moveHeroAbilities(swapInfo.from, swapInfo.to);
                this.heroAbilitiesManager.clearHeroAbilities(swapInfo.from);
                this.heroSpellbookManager.moveHeroSpellbook(swapInfo.from, swapInfo.to);
                this.heroSpellbookManager.clearHeroSpellbook(swapInfo.from);
            }
            
            this.updateBattleFormationUI();
            
            // Save state after formation change
            await this.saveGameState();
            
            // Send formation update to opponent
            await this.sendFormationUpdate();
        }
        return !!swapInfo;
    }

    // Spell drop handler
    async handleSpellDrop(targetSlot) {
        const dragState = this.handManager.getHandDragState();
        const spellCardName = dragState.draggedCardName;
        const cardIndex = dragState.draggedCardIndex;
        
        // Get card info to check if it requires an action
        const cardInfo = getCardInfo(spellCardName);
        
        // Check if player can play action card
        const actionCheck = this.actionManager.canPlayActionCard(cardInfo);
        if (!actionCheck.canPlay) {
            this.handManager.endHandCardDrag();
            window.showActionError(actionCheck.reason, window.event || { clientX: 0, clientY: 0 });
            return false;
        }

        // Check if hero can learn the spell
        const learnCheck = this.canHeroLearnSpell(targetSlot, spellCardName);

        if (!learnCheck.canLearn) {
            // Show error message
            this.handManager.endHandCardDrag();
            this.showSpellDropResult(targetSlot, learnCheck.reason, false);
            return false;
        }

        // Hero can learn the spell!
        const success = this.heroSpellbookManager.addSpellToHero(targetSlot, spellCardName);

        if (success) {
            // Consume action if required
            if (cardInfo.action) {
                this.actionManager.consumeAction();
            }
            
            // Remove spell from hand
            this.handManager.removeCardFromHandByIndex(cardIndex);
            
            // Show success message
            const successMessage = `${learnCheck.heroName} added ${this.formatCardName(spellCardName)} to their Spellbook!`;
            this.showSpellDropResult(targetSlot, successMessage, true);

            // Update UI and save
            this.updateHandDisplay();
            this.updateActionDisplay();
            await this.saveGameState();
            await this.sendFormationUpdate();
        }

        this.handManager.endHandCardDrag();
        return success;
    }

    updateActionDisplay() {
        const actionDisplay = document.querySelector('.action-display-container');
        if (actionDisplay) {
            actionDisplay.outerHTML = this.actionManager.createActionDisplay();
        }
    }

    // Show visual feedback for spell drop result
    showSpellDropResult(heroPosition, message, success) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `spell-drop-feedback ${success ? 'success' : 'error'}`;
        feedback.textContent = message;
        
        // Style the feedback
        feedback.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            white-space: nowrap;
            z-index: 1000;
            animation: fadeInOut 2s ease-out;
            pointer-events: none;
            ${success ? 
                'background: rgba(76, 175, 80, 0.9); color: white;' : 
                'background: rgba(244, 67, 54, 0.9); color: white;'}
        `;
        
        // Add to slot
        teamSlot.style.position = 'relative';
        teamSlot.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    }

    handleInvalidDrop() {
        this.formationManager.handleInvalidDrop();
        this.updateBattleFormationUI();
    }

    // Update the battle formation UI after drag/drop
    updateBattleFormationUI() {
        this.heroSelectionUI.updateBattleFormationUI(
            this.formationManager.getBattleFormation(),
            (position, character) => this.createTeamSlotHTML(position, character)
        );
    }

    // Create team slot HTML (delegating to UI manager)
    createTeamSlotHTML(position, character = null) {
        return this.heroSelectionUI.createTeamSlotHTML(
            position, 
            character,
            (char, ...args) => this.heroSelectionUI.createCharacterCardHTML(char, ...args),
            this.heroAbilitiesManager  // Pass the abilities manager
        );
    }

    reset() {        
        // Set cleanup flags
        this.isReturningFromBattle = false;
        this.battleStateCleanupInProgress = false;
        this.listenerTemporarilyDisabled = false;
        this.isTransitioningToBattle = false;
        
        // Clear opponent abilities data
        this.opponentAbilitiesData = null;
        
        // Cleanup battle reconnection manager
        if (this.battleReconnectionManager) {
            this.battleReconnectionManager.cleanup();
            this.battleReconnectionManager = null;
        }
        
        // Remove battle state listener
        if (this.battleStateListener && this.roomManager && this.roomManager.getRoomRef()) {
            this.roomManager.getRoomRef().child('gameState').off('value', this.battleStateListener);
            this.battleStateListener = null;
        }
        
        // Clear all tooltips first
        this.clearAllTooltips();
        
        this.isPlayerReady = false;
        this.isOpponentReady = false;
        this.battleActive = false;
        
        // Clear any pending card rewards
        this.clearAnyActiveCardRewards();
        
        // Reset turn tracker
        this.turnTracker.reset();
        this.heroSpellbookManager.reset();

        // Reset action manager
        if (this.actionManager) {
            this.actionManager.reset();
        }
        
        // Hide battle waiting overlay
        this.hideBattleWaitingOverlay();
        
        const battleArena = document.getElementById('battleArena');
        if (battleArena) {
            battleArena.style.display = 'none';
            battleArena.remove();
        }
        
        const waitingOverlay = document.getElementById('battleWaitingOverlay');
        if (waitingOverlay) {
            waitingOverlay.style.display = 'none';
            waitingOverlay.remove();
        }
        
        // Additional cleanup for any card reward overlays and styles
        const rewardOverlay = document.getElementById('cardRewardOverlay');
        if (rewardOverlay) {
            rewardOverlay.remove();
        }
        
        const redrawStyles = document.getElementById('redrawStyles');
        if (redrawStyles) {
            redrawStyles.remove();
        }
        
        const heroSelectionScreen = document.querySelector('.hero-selection-screen');
        if (heroSelectionScreen) {
            heroSelectionScreen.style.display = 'flex';
        }

        this.heroAbilitiesManager.reset();
        
        // Clear battle states in Firebase
        if (this.roomManager && this.roomManager.getRoomRef()) {
            this.roomManager.getRoomRef().child('gameState').update({
                hostBattleReady: false,
                guestBattleReady: false,
                battleStarted: false,
                battleStartTime: null
            }).catch(error => {
                // Error occurred but don't log it
            });
        }
    }

    // Generate selection screen HTML
    generateSelectionHTML() {
        return this.heroSelectionUI.generateSelectionHTML(this.playerCharacters);
    }

    // Generate team building screen HTML
    generateTeamBuildingHTML() {
        if (!this.selectedCharacter) {
            return '<div class="loading-heroes"><h2>❌ No character selected</h2></div>';
        }

        // Get the battle formation
        const battleFormation = this.formationManager.getBattleFormation();
        
        // Create the team slots
        const leftSlot = this.createTeamSlotHTML('left', battleFormation.left);
        const centerSlot = this.createTeamSlotHTML('center', battleFormation.center);
        const rightSlot = this.createTeamSlotHTML('right', battleFormation.right);
        
        // Create life display
        const lifeDisplay = this.lifeManager.createLifeDisplay();
        
        // Create hand display
        const handDisplay = this.handManager.createHandDisplay(
            (cardName) => this.formatCardName(cardName)
        );
        
        // Create deck grid
        const deckGrid = this.deckManager.createDeckGrid(
            (cardName) => this.formatCardName(cardName)
        );
        
        // Create gold display
        const goldDisplay = this.goldManager.createGoldDisplay();
        
        // Create action display
        const actionDisplay = this.actionManager.createActionDisplay();

        return `
            ${lifeDisplay}
            <div class="team-building-container">
                <!-- Left Column - Team Formation -->
                <div class="team-building-left">
                    <div class="team-header">
                        <h2>🛡️ Your Battle Formation</h2>
                        <p class="drag-hint">💡 Drag and drop heroes to rearrange your formation!</p>
                        <p class="drag-hint">🎯 Drag ability cards to any hero slot to attach them!</p>
                        <p class="drag-hint">📜 Drag spell cards to heroes to add them to their spellbook!</p>
                    </div>
                    
                    <div class="team-slots-container">
                        ${leftSlot}
                        ${centerSlot}
                        ${rightSlot}
                    </div>
                    
                    <!-- Hand directly below hero slots -->
                    <div class="hand-display-area-inline">
                        ${handDisplay}
                    </div>
                </div>
                
                <!-- Right Column - Player's Deck -->
                <div class="team-building-right">
                    ${deckGrid}
                </div>
                
                <!-- Gold and Action Display - positioned together -->
                <div class="resource-display-container">
                    ${goldDisplay}
                    ${actionDisplay}
                </div>
            </div>
        `;
    }

    // Handle bonus card draw message from opponent
    receiveRewardBonusDraw(data) {
        this.cardRewardManager.handleOpponentBonusCardDraw(this);
    }

    // Check if dragging a spell card
    isDraggingSpellCard() {
        if (!this.handManager || !this.handManager.isHandDragging()) {
            return false;
        }
        
        const dragState = this.handManager.getHandDragState();
        return this.heroSpellbookManager.isSpellCard(dragState.draggedCardName);
    }

    // Check if hero can learn a spell
    canHeroLearnSpell(heroPosition, spellCardName) {
        const formation = this.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        
        // Check 1: Is there a hero in the slot?
        if (!hero) {
            return { canLearn: false, reason: "You can't add Spells to an empty slot!" };
        }

        // Check 2: Get spell info
        const spellInfo = getCardInfo(spellCardName);
        if (!spellInfo || spellInfo.cardType !== 'Spell') {
            return { canLearn: false, reason: "Invalid spell card!" };
        }

        // Check 3: Does hero have required spell school at required level?
        const spellSchool = spellInfo.spellSchool;
        const spellLevel = spellInfo.level || 0;

        // Count spell school abilities across all zones
        const heroAbilities = this.heroAbilitiesManager.getHeroAbilities(heroPosition);
        
        let totalSpellSchoolLevel = 0;

        ['zone1', 'zone2', 'zone3'].forEach(zone => {
            if (heroAbilities && heroAbilities[zone]) {
                heroAbilities[zone].forEach(ability => {
                    if (ability && ability.name === spellSchool) {
                        totalSpellSchoolLevel++;
                    }
                });
            }
        });

        // Check 4: Compare levels
        if (totalSpellSchoolLevel < spellLevel) {
            const formattedSpellSchool = this.formatCardName(spellSchool);
            const formattedSpellName = this.formatCardName(spellCardName);
            
            return { 
                canLearn: false, 
                reason: `${hero.name} needs ${formattedSpellSchool} at level ${spellLevel} or higher to learn ${formattedSpellName}!`
            };
        }

        return { canLearn: true, heroName: hero.name };
    }
}

// Global drag and drop functions (Hero formation only - hand drag/drop is now in HandManager)
function onHeroDragStart(event, characterJson, slotPosition) {
    if (window.heroSelection) {
        try {
            const character = JSON.parse(characterJson.replace(/&quot;/g, '"'));
            window.heroSelection.startDrag(character, slotPosition, event.target.closest('.character-card'));
            
            // More explicit dataTransfer setup for cross-browser compatibility
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.dropEffect = 'move';
            
            // Use custom MIME type and set data
            event.dataTransfer.setData('application/x-hero-drag', JSON.stringify({
                character: character,
                slotPosition: slotPosition
            }));
            
            // Fallback for older browsers
            event.dataTransfer.setData('text/plain', character.name);
        } catch (error) {
            // Error occurred but don't log it
        }
    }
}

function onHeroDragEnd(event) {
    // Clean up any drag state
    const allSlots = document.querySelectorAll('.team-slot');
    allSlots.forEach(slot => {
        slot.classList.remove('drag-over', 'invalid-drop');
    });
    
    if (window.heroSelection && window.heroSelection.formationManager.isDragging()) {
        window.heroSelection.handleInvalidDrop();
    }
}

function onHeroSlotDragOver(event) {
    if (window.heroSelection && window.heroSelection.formationManager.isDragging()) {
        // Prevent default more explicitly
        event.preventDefault();
        event.stopPropagation();
        
        // Set drop effect consistently
        event.dataTransfer.dropEffect = 'move';
        
        const slot = event.currentTarget;
        
        // Remove drag-over from all other slots first
        const allSlots = document.querySelectorAll('.team-slot');
        allSlots.forEach(s => {
            if (s !== slot) {
                s.classList.remove('drag-over');
            }
        });
        
        // Add drag-over to current slot
        slot.classList.add('drag-over');
        
        return false; // Additional prevention for Opera
    }
}

function onHeroSlotDragEnter(event) {
    if (window.heroSelection && window.heroSelection.formationManager.isDragging()) {
        event.preventDefault();
        event.stopPropagation();
        
        const slot = event.currentTarget;
        slot.classList.add('drag-over');
        
        return false;
    }
}

function onHeroSlotDragLeave(event) {
    // Only remove drag-over if we're actually leaving the slot
    // (not just moving to a child element)
    const slot = event.currentTarget;
    const rect = slot.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        slot.classList.remove('drag-over');
    }
}

async function onHeroSlotDrop(event, targetSlot) {
    event.preventDefault();
    event.stopPropagation();
    
    const slot = event.currentTarget;
    
    // Clean up all drag-over states
    const allSlots = document.querySelectorAll('.team-slot');
    allSlots.forEach(s => s.classList.remove('drag-over', 'invalid-drop'));
    
    if (window.heroSelection) {
        // Verify we have valid drag data
        const customData = event.dataTransfer.getData('application/x-hero-drag');
        const fallbackData = event.dataTransfer.getData('text/plain');
        
        if (customData || fallbackData) {
            const success = await window.heroSelection.handleDrop(targetSlot);
        }
    }
    
    return false;
}

// Global function for character selection
function selectCharacterCard(characterId) {
    if (window.heroSelection) {
        const success = window.heroSelection.selectCharacter(characterId);
        if (success) {
            window.updateHeroSelectionUI();
        }
    }
}

// Global function to show character card preview
function showCharacterPreview(characterId) {
    if (window.heroSelection) {
        const character = window.heroSelection.getPlayerCharacters().find(c => c.id === characterId);
        if (character) {
            window.heroSelection.showCharacterPreview(character);
        }
    }
}

// Global function to hide character card preview
function hideCharacterPreview() {
    if (window.heroSelection && window.heroSelection.cardPreviewManager) {
        window.heroSelection.cardPreviewManager.hideCardPreview();
    }
}

// Global function to show card tooltip
function showCardTooltip(cardDataJson, element) {
    if (window.heroSelection) {
        try {
            const cardData = JSON.parse(cardDataJson.replace(/&quot;/g, '"'));
            window.heroSelection.showCardTooltip(cardData, element);
        } catch (error) {
            // Error occurred but don't log it
        }
    }
}

// Global function to hide card tooltip
function hideCardTooltip() {
    if (window.heroSelection) {
        window.heroSelection.hideCardTooltip();
    }
}

// Global function to update UI based on current phase
function updateHeroSelectionUI() {
    
    if (!window.heroSelection) {
        return;
    }
    
    // Clear all tooltips before UI transition
    if (typeof window.heroSelection.clearAllTooltips === 'function') {
        window.heroSelection.clearAllTooltips();
    }
    
    const gameScreen = document.getElementById('gameScreen');
    if (!gameScreen) {
        return;
    }
    
    const heroContainer = gameScreen.querySelector('.hero-selection-screen');
    if (!heroContainer) {
        return;
    }
    
    const phase = window.heroSelection.getCurrentPhase();
    
    // Generate appropriate HTML based on phase
    switch (phase) {
        case 'selection':
            const selectionHTML = window.heroSelection.generateSelectionHTML();
            heroContainer.innerHTML = selectionHTML;
            break;
            
        case 'team_building':
            const teamBuildingHTML = window.heroSelection.generateTeamBuildingHTML();
            heroContainer.innerHTML = teamBuildingHTML;
            
            // Ensure gold display is created after team building UI is rendered
            setTimeout(() => {
                window.heroSelection.updateGoldDisplay();
            }, 100);
            break;
            
        case 'battle_active':
            // Don't update UI during battle - battle screen is handling display
            break;
            
        default:
            heroContainer.innerHTML = `
                <div class="hero-selection-waiting">
                    <h2>⚔️ Battle Arena Loading...</h2>
                    <p>Preparing for epic combat...</p>
                </div>
            `;
            break;
    }
}

// Attach global functions to window for cross-module access
if (typeof window !== 'undefined') {
    window.HeroSelection = HeroSelection;
    window.selectCharacterCard = selectCharacterCard;
    window.showCharacterPreview = showCharacterPreview;
    window.hideCharacterPreview = hideCharacterPreview;
    window.showCardTooltip = showCardTooltip;
    window.hideCardTooltip = hideCardTooltip;
    window.updateHeroSelectionUI = updateHeroSelectionUI;
    
    // Ensure handManager is available globally for HTML event handlers
    // Note: This will be set when HeroSelection is instantiated, but we add a fallback here
    if (window.heroSelection && window.heroSelection.handManager) {
        window.handManager = window.heroSelection.handManager;
    }
    
    // Existing hero formation drag and drop functions
    window.onHeroDragStart = onHeroDragStart;
    window.onHeroDragEnd = onHeroDragEnd;
    window.onHeroSlotDragOver = onHeroSlotDragOver;
    window.onHeroSlotDragLeave = onHeroSlotDragLeave;
    window.onHeroSlotDrop = onHeroSlotDrop;
    
    // Battle button handler
    window.handleToBattleClick = async function() {
        if (window.heroSelection) {
            await window.heroSelection.handleToBattleClick();
        }
    };
}

// Export for ES6 module compatibility
export { updateHeroSelectionUI };