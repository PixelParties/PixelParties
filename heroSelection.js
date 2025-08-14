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
import { HeroAbilitiesManager } from './heroAbilities.js';
import { getHeroInfo, getCardInfo } from './cardDatabase.js';
import { HeroSpellbookManager } from './heroSpellbook.js';
import { ActionManager } from './actionManager.js';
import { HeroCreatureManager } from './creatures.js';
import { GameStateMachine } from './gameStateMachine.js';
import { globalSpellManager } from './globalSpellManager.js';
import { potionHandler } from './potionHandler.js';
import { HeroEquipmentManager } from './heroEquipment.js';

import { leadershipAbility } from './Abilities/leadership.js';

import { NicolasEffectManager } from './Heroes/nicolas.js';
import { VacarnEffectManager } from './Heroes/vacarn.js';
import { SemiEffectManager } from './Heroes/semi.js';

import { crusaderArtifactsHandler } from './Artifacts/crusaderArtifacts.js';


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
        this.globalSpellManager = globalSpellManager;


        // Guard Change mode tracking
        this.guardChangeMode = false;
        
        this.stateMachine = new GameStateMachine();
        
        // Store opponent abilities data with enhanced debugging
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
        this.heroCreatureManager = new HeroCreatureManager();
        this.heroEquipmentManager = new HeroEquipmentManager();

        this.potionHandler = potionHandler; 


        this.nicolasEffectManager = new NicolasEffectManager();
        this.vacarnEffectManager = new VacarnEffectManager();
        this.semiEffectManager = new SemiEffectManager();


        this.crusaderArtifactsHandler = crusaderArtifactsHandler;

        // Initialize hero abilities manager with references
        this.heroAbilitiesManager.init(
            this.handManager,
            this.formationManager, 
            async () => {
                // Enhanced callback for when ability state changes
                this.updateBattleFormationUI(); // This now includes stat updates
                this.updateHandDisplay();
                
                // Update potion bonuses when abilities change
                this.potionHandler.updateAlchemyBonuses(this);
                
                // NEW: Explicitly refresh hero stats when abilities change
                setTimeout(() => {
                    this.refreshHeroStats();
                }, 100);
                
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

        // Initialize creature manager with references
        this.heroCreatureManager.init(
            this.handManager,
            this.formationManager,
            async () => {
                // Callback for when creature state changes
                this.updateBattleFormationUI();
                await this.saveGameState();
            }
        );

        this.heroEquipmentManager.init(
            this.handManager,
            this.formationManager,
            this.goldManager,
            async () => {
                // Callback for when equipment state changes
                this.updateBattleFormationUI();
                await this.saveGameState();
            }
        );

        // Initialize enhanced hand manager drag support
        this.initializeHandManagerWithEnhancedDragSupport();

        // Expose handManager to window for HTML event handlers
        if (typeof window !== 'undefined') {
            window.handManager = this.handManager;
            window.potionHandler = this.potionHandler; // Expose potion handler
            // Make leadership ability available globally
            window.leadershipAbility = leadershipAbility;
        }

        this.initializeStatUpdateSystem();

        
        // UI state
        this.stateInitialized = false;
        
        // Character card mappings
        this.characterCards = {
            'Alice': ['CrumTheClassPet', 'DestructionMagic', 'Jiggles', 'LootThePrincess', 'MoonlightButterfly', 'PhoenixBombardment', 'RoyalCorgi', 'SummoningMagic'],
            'Cecilia': ['CrusadersArm-Cannon', 'CrusadersCutlass', 'CrusadersFlintlock', 'CrusadersHookshot', 'Leadership', 'Navigation', 'WantedPoster', 'Wealth'],
            'Darge': ['AngelfeatherArrow', 'BombArrow', 'FlameArrow', 'GoldenArrow', 'PoisonedArrow', 'RacketArrow', 'RainbowsArrow', 'RainOfArrows'],
            'Gon': ['BladeOfTheFrostbringer', 'Clone', 'Cold-HeartedYuki-Onna', 'FrostRune', 'HeartOfIce', 'Icebolt', 'IcyGrave', 'SnowCannon'],
            'Ida': ['BottledFlame', 'BurningSkeleton',  'DestructionMagic', 'Fireball', 'Fireshield', 'FlameAvalanche', 'MountainTearRiver', 'VampireOnFire'],
            'Medea': ['DecayMagic', 'PoisonedMeat', 'PoisonedWell', 'PoisonPollen', 'PoisonVial', 'ToxicFumes', 'ToxicTrap', 'VenomInfusion'],
            'Monia': ['CoolCheese', 'CoolnessOvercharge', 'CoolPresents', 'CrashLanding', 'GloriousRebirth', 'LifeSerum', 'TrialOfCoolness', 'UltimateDestroyerPunch'],
            'Nicolas': ['AlchemicJournal', 'Alchemy', 'BottledFlame', 'BottledLightning', 'BoulderInABottle', 'ExperimentalPotion', 'MonsterInABottle', 'PressedSkill'],
            'Semi': ['Adventurousness', 'ElixirOfImmortality', 'ElixirOfStrength', 'HealingMelody', 'MagneticGlove', 'Stoneskin', 'TreasureChest', 'TreasureHuntersBackpack'],
            'Sid': ['MagicAmethyst', 'MagicCobalt', 'MagicEmerald', 'MagicRuby', 'MagicSapphire', 'MagicTopaz', 'Thieving', 'ThievingStrike'],
            'Tharx': ['Archer', 'Cavalry', 'Challenge', 'FieldStandard', 'FrontSoldier', 'FuriousAnger', 'GuardChange', 'TharxianHorse'],
            'Toras': ['Fighting', 'HeavyHit', 'LegendarySwordOfABarbarianKing', 'SkullmaelsGreatsword', 'SwordInABottle', 'TheMastersSword', 'TheStormblade', 'TheSunSword'],
            'Vacarn': ['Necromancy', 'SkeletonArcher', 'SkeletonBard', 'SkeletonDeathKnight', 'SkeletonMage', 'SkeletonNecromancer', 'SkeletonReaper', 'SummoningMagic']
        };
    }

    // Initialize with game context and setup turn tracker
    async init(isHost, gameDataSender, onSelectionComplete, roomManager) {
        // Transition to initializing state
        this.stateMachine.transitionTo(this.stateMachine.states.INITIALIZING);
        
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
            this.updateActionDisplay();
            if (actionChangeData.player) {
                this.syncActionsWithOpponent();
            }
        });
        
        // Initialize reconnection manager
        const { ReconnectionManager } = await import('./reconnectionManager.js');
        this.reconnectionManager = new ReconnectionManager();
        this.reconnectionManager.init(this, roomManager, gameDataSender, isHost);
        
        // Set up battle state listener
        this.setupBattleStateListener();
        
        // Add state change listener for debugging
        this.stateMachine.onStateChange((fromState, toState, context) => {
            console.log(`HeroSelection state changed: ${fromState} -> ${toState}`, context);
        });

        this.crusaderArtifactsHandler.init(this);
        
        return this.loadCharacters();
    }

    calculateEffectiveHeroStats(heroPosition) {
        const formation = this.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        if (!hero) return null;
        
        // Get base stats from card database
        const heroInfo = this.getCardInfo(hero.name);
        if (!heroInfo || heroInfo.cardType !== 'hero') return null;
        
        // Get ability stack counts directly from the abilities manager
        const toughnessStacks = this.heroAbilitiesManager.getAbilityStackCountForPosition(heroPosition, 'Toughness');
        const fightingStacks = this.heroAbilitiesManager.getAbilityStackCountForPosition(heroPosition, 'Fighting');
        
        // Check for Toras equipment bonus
        let equipmentAttackBonus = 0;
        if (hero.name === 'Toras') {
            const equipment = this.heroEquipmentManager.getHeroEquipment(heroPosition);
            const equipmentCount = equipment ? equipment.length : 0;
            equipmentAttackBonus = equipmentCount * 10; // +10 Attack per equipment for Toras
        }
        
        // Get permanent bonuses from LegendarySwordOfABarbarianKing
        let permanentAttackBonus = 0;
        let permanentHpBonus = 0;
        
        // If hero object has permanent bonuses, use them
        if (hero.attackBonusses !== undefined) {
            permanentAttackBonus = hero.attackBonusses;
        }
        if (hero.hpBonusses !== undefined) {
            permanentHpBonus = hero.hpBonusses;
        }
        
        // Calculate final stats with all bonuses
        const hpBonus = toughnessStacks * 200;
        const fightingAttackBonus = fightingStacks * 10;
        const totalAttackBonus = fightingAttackBonus + equipmentAttackBonus + permanentAttackBonus;
        const totalHpBonus = hpBonus + permanentHpBonus;
        
        return {
            maxHp: heroInfo.hp + totalHpBonus,
            currentHp: heroInfo.hp + totalHpBonus,
            attack: heroInfo.atk + totalAttackBonus,
            bonuses: {
                toughnessStacks,
                fightingStacks,
                hpBonus,
                attackBonus: fightingAttackBonus,
                equipmentCount: hero.name === 'Toras' ? (this.heroEquipmentManager.getHeroEquipment(heroPosition)?.length || 0) : 0,
                equipmentAttackBonus,
                permanentAttackBonus,  
                permanentHpBonus,      
                totalAttackBonus,
                totalHpBonus           
            }
        };
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
            const result = originalEndDrag();
            
            // NEW: Trigger stat refresh after drag operations
            if (window.heroSelection) {
                setTimeout(() => {
                    window.heroSelection.refreshHeroStats();
                }, 100);
            }
            
            return result;
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
            // Skip processing if in cleanup state
            if (this.stateMachine.isInState(this.stateMachine.states.CLEANING_UP)) {
                return;
            }
            
            const gameState = snapshot.val();
            if (!gameState) return;
            
            const hostReady = gameState.hostBattleReady || false;
            const guestReady = gameState.guestBattleReady || false;
            const battleStarted = gameState.battleStarted || false;
            
            // Don't clear battle state if we're actively transitioning or in battle
            if (this.stateMachine.isInState(this.stateMachine.states.TEAM_BUILDING) && 
                battleStarted && 
                !this.stateMachine.isInState(this.stateMachine.states.RECONNECTING)) {
                
                await this.emergencyBattleStateClear();
                return; // Skip rest of processing to let the clear take effect
            }
            
            // Only update button state if we're in team building phase
            if (this.stateMachine.isInState(this.stateMachine.states.TEAM_BUILDING)) {
                
                const toBattleBtn = document.querySelector('.to-battle-button');
                if (toBattleBtn) {
                    const myReady = this.isHost ? hostReady : guestReady;
                    const opponentReady = this.isHost ? guestReady : hostReady;
                    
                    // Only disable if we're ready but opponent isn't, or if battle started
                    const shouldDisable = (myReady && !opponentReady) || battleStarted;
                    toBattleBtn.disabled = shouldDisable;
                }
            }
            
            // Check if we're waiting and opponent just became ready
            if (this.stateMachine.isInState(this.stateMachine.states.WAITING_FOR_BATTLE)) {
                if (hostReady && guestReady && !battleStarted) {
                    
                    // Transition to battle starting
                    this.stateMachine.transitionTo(this.stateMachine.states.TRANSITIONING_TO_BATTLE, {
                        reason: 'firebase_both_ready'
                    });
                    
                    // Only host marks battle as started
                    if (this.isHost) {
                        await roomRef.child('gameState').update({
                            battleStarted: true,
                            battleStartTime: Date.now()
                        });
                    }
                }
            }

            // Check if we should transition to battle screen
            if (battleStarted && 
                this.stateMachine.isInState(this.stateMachine.states.TRANSITIONING_TO_BATTLE)) {
                // Transition to battle
                this.transitionToBattleScreen();
            }
            
            // Handle case where we load into a game where opponent is already waiting
            if (!battleStarted && 
                this.stateMachine.isInState(this.stateMachine.states.TEAM_BUILDING)) {
                
                const myReady = this.isHost ? hostReady : guestReady;
                const opponentReady = this.isHost ? guestReady : hostReady;
                
                if (myReady && !opponentReady) {
                    // We're ready, opponent isn't - show waiting
                    this.showBattleWaitingOverlay();
                }
            }
        });
    }

    // Emergency battle state clear for when normal cleanup fails
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
                battleEndedAt: null,      
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

    // Ensure button state when UI updates
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

    // Handle turn changes from TurnTracker - UPDATED with Leadership reset
    async onTurnChange(turnChangeData) {
        // Reset actions at the start of each turn (team building phase)
        this.actionManager.resetActions();

        if (this.potionHandler) {
            this.potionHandler.updateAlchemyBonuses(this);
            this.potionHandler.resetPotionsForTurn();
        }
        
        // Reset Leadership usage and ability attachment tracking for new turn
        if (this.heroAbilitiesManager) {
            this.heroAbilitiesManager.resetTurnBasedTracking();
        }
        
        // Reset Nicolas effect usage for new turn
        if (this.nicolasEffectManager) {
            this.nicolasEffectManager.resetForNewTurn();
        }

        // Reset Vacarn effect usage for new turn
        if (this.vacarnEffectManager) {
            this.vacarnEffectManager.resetForNewTurn();
            
            // Process any buried creatures that should be raised
            await this.vacarnEffectManager.processStartOfTurn(this);
        }
        
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

    async setGamePhase(phase) {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            await this.roomManager.getRoomRef().child('gameState').update({
                gamePhase: phase,
                gamePhaseUpdated: Date.now()
            });
            console.log(`🎯 Game phase set to: ${phase}`);
            return true;
        } catch (error) {
            console.error('Error setting game phase:', error);
            return false;
        }
    }

    // Restore game state method with battle reconnection support and ability debugging
    async restoreGameState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('gameState').once('value');
            const gameState = snapshot.val();
            
            // Check if game state exists AND has character assignments
            if (!gameState || 
                !gameState.hostCharacters || gameState.hostCharacters.length === 0 ||
                !gameState.guestCharacters || gameState.guestCharacters.length === 0) {
                
                console.log('No valid game state found - starting fresh game');
                
                // Transition to initializing state for fresh game
                this.stateMachine.transitionTo(this.stateMachine.states.INITIALIZING);
                
                // Start character selection for new game
                const selectionStarted = await this.startSelection();
                
                if (!selectionStarted) {
                    console.error('Failed to start character selection for new game');
                    this.stateMachine.transitionTo(this.stateMachine.states.ERROR, {
                        error: 'Failed to start character selection'
                    });
                    return false;
                }
                
                console.log('✅ New game character selection started successfully');
                
                // Update UI
                if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                    window.updateHeroSelectionUI();
                }
                
                return false; // Indicate no state was restored (this is a new game)
            }
            
            // Valid game state found with character assignments - proceed with reconnection
            console.log('🔄 Valid game state found with character assignments');
            
            // Transition to reconnecting state
            this.stateMachine.transitionTo(this.stateMachine.states.RECONNECTING, {
                reason: 'restoring_saved_state'
            });
            
            console.log('🔄 Delegating reconnection to ReconnectionManager');
            
            // Initialize reconnection manager if not already done
            if (!this.reconnectionManager) {
                const { ReconnectionManager } = await import('./reconnectionManager.js');
                this.reconnectionManager = new ReconnectionManager();
                this.reconnectionManager.init(
                    this,
                    this.roomManager, 
                    this.gameDataSender,
                    this.isHost
                );
            }
            
            // Delegate all reconnection logic to the centralized manager
            const success = await this.reconnectionManager.handleReconnection(gameState);

            // Additional restoration for permanent artifacts (direct handling)
            if (success && gameState && window.artifactHandler) {
                const playerRole = this.isHost ? 'host' : 'guest';
                const permanentArtifactsKey = `${playerRole}PermanentArtifacts`;
                const permanentArtifactsData = gameState[permanentArtifactsKey];
                
                if (permanentArtifactsData) {
                    window.artifactHandler.importPermanentArtifactsState(permanentArtifactsData);
                    console.log('📋 Permanent artifacts restored during reconnection');
                }
            }

            return success;

        } catch (error) {
            console.error('Error restoring game state:', error);
            
            // On error, assume fresh game
            console.log('Error during restore - treating as fresh game');
            
            this.stateMachine.transitionTo(this.stateMachine.states.INITIALIZING);
            
            // Try to start fresh game
            try {
                const selectionStarted = await this.startSelection();
                if (selectionStarted) {
                    console.log('✅ Recovery successful - started fresh game');
                    
                    if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                        window.updateHeroSelectionUI();
                    }
                    
                    return false;
                }
            } catch (startError) {
                console.error('Failed to start fresh game after restore error:', startError);
            }
            
            // If all else fails, transition to error state
            this.stateMachine.transitionTo(this.stateMachine.states.ERROR, {
                error: error.message
            });
            
            return false;
        }
    }

    // Verify restored abilities for debugging
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

    // Verify opponent abilities for debugging
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
                
                // Save abilities
                const abilitiesState = this.heroAbilitiesManager.exportAbilitiesState();
                gameState.hostAbilitiesState = sanitizeForFirebase(abilitiesState);
                
                // Save spellbooks
                const spellbooksState = this.heroSpellbookManager.exportSpellbooksState();
                gameState.hostSpellbooksState = sanitizeForFirebase(spellbooksState);
                
                // Save creatures
                const creaturesState = this.heroCreatureManager.exportCreaturesState();
                gameState.hostCreaturesState = sanitizeForFirebase(creaturesState);

                // Save equipment
                const equipmentState = this.heroEquipmentManager.exportEquipmentState();
                gameState.hostEquipmentState = sanitizeForFirebase(equipmentState);

                // Save Guard Change state for HOST only
                const globalSpellState = this.globalSpellManager.exportGlobalSpellState();
                gameState.hostGlobalSpellState = sanitizeForFirebase(globalSpellState);

                // Save opponent abilities data if we have it
                if (this.opponentAbilitiesData) {
                    gameState.guestAbilitiesData = sanitizeForFirebase(this.opponentAbilitiesData);
                }
                
                // Save opponent spellbooks data if we have it
                if (this.opponentSpellbooksData) {
                    gameState.guestSpellbooksData = sanitizeForFirebase(this.opponentSpellbooksData);
                }
                
                // Save opponent creatures data if we have it
                if (this.opponentCreaturesData) {
                    gameState.guestCreaturesData = sanitizeForFirebase(this.opponentCreaturesData);
                }
                
                // Save opponent equipment data if we have it
                if (this.opponentEquipmentData) {
                    gameState.guestEquipmentData = sanitizeForFirebase(this.opponentEquipmentData);
                }
                
                // Save action data for host
                if (this.actionManager) {
                    gameState.hostActionData = sanitizeForFirebase(this.actionManager.exportActionData());
                }

                // Save permanent artifacts for host
                if (window.artifactHandler) {
                    gameState.hostPermanentArtifacts = sanitizeForFirebase(window.artifactHandler.exportPermanentArtifactsState());
                }

                // Save magnetic glove state for host
                if (window.magneticGloveArtifact) {
                    gameState.hostMagneticGloveState = sanitizeForFirebase(window.magneticGloveArtifact.exportMagneticGloveState(this));
                }

                // Save potion state for host (now includes active effects)
                if (this.potionHandler) {
                    gameState.hostPotionState = sanitizeForFirebase(this.potionHandler.exportPotionState());
                    console.log(`💾 Host saving potion state with ${this.potionHandler.getPotionStatus().activeEffects} active effects`);
                }


                // Save Hero effect states for host
                if (this.nicolasEffectManager) {
                    gameState.hostNicolasState = sanitizeForFirebase(this.nicolasEffectManager.exportNicolasState());
                }
                if (this.vacarnEffectManager) {
                    gameState.hostVacarnState = sanitizeForFirebase(this.vacarnEffectManager.exportVacarnState());
                }
                if (this.semiEffectManager) {
                    gameState.hostSemiState = sanitizeForFirebase(this.semiEffectManager.exportSemiState());
                }




                // Save delayed artifact effects for host
                if (this.delayedArtifactEffects) {
                    gameState.hostDelayedArtifactEffects = sanitizeForFirebase(this.delayedArtifactEffects);
                    console.log(`💾 Host saving ${this.delayedArtifactEffects.length} delayed artifact effects`);
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
                
                // Save abilities
                const abilitiesState = this.heroAbilitiesManager.exportAbilitiesState();
                gameState.guestAbilitiesState = sanitizeForFirebase(abilitiesState);
                
                // Save spellbooks
                const spellbooksState = this.heroSpellbookManager.exportSpellbooksState();
                gameState.guestSpellbooksState = sanitizeForFirebase(spellbooksState);
                
                // Save creatures
                const creaturesState = this.heroCreatureManager.exportCreaturesState();
                gameState.guestCreaturesState = sanitizeForFirebase(creaturesState);

                // Save equipment
                const equipmentState = this.heroEquipmentManager.exportEquipmentState();
                gameState.guestEquipmentState = sanitizeForFirebase(equipmentState);

                // Save Guard Change state for GUEST only
                const globalSpellState = this.globalSpellManager.exportGlobalSpellState();
                gameState.guestGlobalSpellState = sanitizeForFirebase(globalSpellState);

                // Save opponent abilities data if we have it
                if (this.opponentAbilitiesData) {
                    gameState.hostAbilitiesData = sanitizeForFirebase(this.opponentAbilitiesData);
                }
                
                // Save opponent spellbooks data if we have it
                if (this.opponentSpellbooksData) {
                    gameState.hostSpellbooksData = sanitizeForFirebase(this.opponentSpellbooksData);
                }
                
                // Save opponent creatures data if we have it
                if (this.opponentCreaturesData) {
                    gameState.hostCreaturesData = sanitizeForFirebase(this.opponentCreaturesData);
                }
                
                // Save opponent equipment data if we have it
                if (this.opponentEquipmentData) {
                    gameState.hostEquipmentData = sanitizeForFirebase(this.opponentEquipmentData);
                }
                
                // Save action data for guest
                if (this.actionManager) {
                    gameState.guestActionData = sanitizeForFirebase(this.actionManager.exportActionData());
                }

                // Save permanent artifacts for guest
                if (window.artifactHandler) {
                    gameState.guestPermanentArtifacts = sanitizeForFirebase(window.artifactHandler.exportPermanentArtifactsState());
                }

                // Save magnetic glove state for guest
                if (window.magneticGloveArtifact) {
                    gameState.guestMagneticGloveState = sanitizeForFirebase(window.magneticGloveArtifact.exportMagneticGloveState(this));
                }

                // Save potion state for guest (now includes active effects)
                if (this.potionHandler) {
                    gameState.guestPotionState = sanitizeForFirebase(this.potionHandler.exportPotionState());
                    console.log(`💾 Guest saving potion state with ${this.potionHandler.getPotionStatus().activeEffects} active effects`);
                }



                // Save Hero effect states for guest
                if (this.nicolasEffectManager) {
                    gameState.guestNicolasState = sanitizeForFirebase(this.nicolasEffectManager.exportNicolasState());
                }
                if (this.vacarnEffectManager) {
                    gameState.guestVacarnState = sanitizeForFirebase(this.vacarnEffectManager.exportVacarnState());
                }
                if (this.semiEffectManager) {
                    gameState.guestSemiState = sanitizeForFirebase(this.semiEffectManager.exportSemiState());
                }




                // Save delayed artifact effects for guest
                if (this.delayedArtifactEffects) {
                    gameState.guestDelayedArtifactEffects = sanitizeForFirebase(this.delayedArtifactEffects);
                    console.log(`💾 Guest saving ${this.delayedArtifactEffects.length} delayed artifact effects`);
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
            return true;
        } catch (error) {
            console.error('Error saving game state:', error);
            return false;
        }
    }

    // Verify abilities before saving for debugging
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
    restorePlayerData(deckData, handData, lifeData, goldData, globalSpellData = null, potionData = null, nicolasData = null, vacarnData = null, delayedArtifactEffectsData = null, semiData = null, permanentArtifactsData = null) {
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

        if (potionData && this.potionHandler) {
            const potionRestored = this.potionHandler.importPotionState(potionData, false);
            if (potionRestored) {
                console.log('✅ Potion state restored successfully');
                // Don't call updateAlchemyBonuses here - it will be called by reconnectionManager if needed
            }
        } else {
            // Initialize potion state for new game
            this.potionHandler.resetForNewGame(); // Use new method that clears any lingering effects
            this.potionHandler.updateAlchemyBonuses(this);
            console.log('📝 No potion data found - initialized fresh for new game');
        }


        // Restore Hero effect states
        if (nicolasData && this.nicolasEffectManager) {
            const nicolasRestored = this.nicolasEffectManager.importNicolasState(nicolasData);
            if (nicolasRestored) {
                console.log('✅ Nicolas effect state restored successfully');
            }
        } else {
            if (this.nicolasEffectManager) {
                this.nicolasEffectManager.reset();
                console.log('📝 No Nicolas data found - initialized fresh state');
            }
        }
        if (vacarnData && this.vacarnEffectManager) {
            const vacarnRestored = this.vacarnEffectManager.importVacarnState(vacarnData);
            if (vacarnRestored) {
                console.log('✅ Vacarn effect state restored successfully');
            }
        } else {
            if (this.vacarnEffectManager) {
                this.vacarnEffectManager.reset();
            }
        }
        if (semiData && this.semiEffectManager) {
            const semiRestored = this.semiEffectManager.importSemiState(semiData);
            if (semiRestored) {
                console.log('✅ Semi effect state restored successfully');
            }
        } else {
            // Initialize Semi state if no saved data
            if (this.semiEffectManager) {
                this.semiEffectManager.reset();
                console.log('📝 No Semi data found - initialized fresh state');
            }
        }




        // ===== Restore delayed artifact effects =====
        if (delayedArtifactEffectsData && Array.isArray(delayedArtifactEffectsData)) {
            this.delayedArtifactEffects = [...delayedArtifactEffectsData];
            console.log(`✅ Restored ${this.delayedArtifactEffects.length} delayed artifact effects`);
            
            // Log what effects were restored
            this.delayedArtifactEffects.forEach((effect, index) => {
                console.log(`🥩 Restored effect ${index + 1}: ${effect.source} - ${effect.description}`);
            });
        } else {
            // Initialize empty array if no saved data
            this.delayedArtifactEffects = [];
            console.log('📝 No delayed artifact effects found - initialized empty array');
        }

        // ===== Restore permanent artifacts =====
        if (permanentArtifactsData && window.artifactHandler) {
            const restored = window.artifactHandler.importPermanentArtifactsState(permanentArtifactsData);
            if (restored) {
                console.log('✅ Permanent artifacts state restored successfully');
            } else {
                console.log('🔍 No permanent artifacts found - initialized empty list');
            }
        } else {
            console.log('🔍 No permanent artifacts data found - keeping current state');
        }

        
        // Restore player-specific global spell state (including Guard Change mode)
        if (globalSpellData && this.globalSpellManager) {
            console.log('🔄 Restoring player-specific global spell state:', globalSpellData);
            const globalSpellRestored = this.globalSpellManager.importGlobalSpellState(globalSpellData);
            
            if (globalSpellRestored) {
                // CRITICAL: Sync the Guard Change mode with HeroCreatureManager
                const isGuardChangeActive = this.globalSpellManager.isGuardChangeModeActive();
                console.log('🔄 Syncing Guard Change mode with HeroCreatureManager:', isGuardChangeActive);
                
                if (this.heroCreatureManager) {
                    this.heroCreatureManager.setGuardChangeMode(isGuardChangeActive);
                }
                
                // Update UI to show Guard Change indicator if active
                if (isGuardChangeActive) {
                    console.log('🛡️ Guard Change mode restored and active');
                    // UI will be updated by the importGlobalSpellState method
                    
                    // Ensure body class is properly set for reconnection
                    if (typeof document !== 'undefined') {
                        document.body.classList.add('guard-change-active');
                    }
                }
                
                console.log('✅ Player-specific global spell state restored successfully');
            } else {
                console.log('⚠️ No player-specific global spell state to restore');
            }
        } else {
            console.log('📝 No global spell data found for this player - ensuring Guard Change is off');
            
            // Ensure Guard Change mode is off if no data
            if (this.globalSpellManager) {
                this.globalSpellManager.setGuardChangeMode(false, this);
            }
        }
        
        // Initialize life manager with turn tracker after restoration
        this.initializeLifeManagerWithTurnTracker();

        setTimeout(() => this.refreshHeroStats(), 200);
    }

    // Enhanced start character selection process
    async startSelection() {
        if (this.allCharacters.length < 6) {
            return false;
        }

        // Check if we already have character assignments (from restoration)
        if (this.playerCharacters.length > 0 && this.opponentCharacters.length > 0) {
            // Transition to selecting hero state
            this.stateMachine.transitionTo(this.stateMachine.states.SELECTING_HERO);
            
            // Update the UI with existing assignments
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                window.updateHeroSelectionUI();
            }
            
            return true;
        }

        // Only the HOST should generate character selections, and only if no characters exist
        if (!this.isHost) {
            // Transition to selecting hero state
            this.stateMachine.transitionTo(this.stateMachine.states.SELECTING_HERO);
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
        // Transition to selecting hero state
        this.stateMachine.transitionTo(this.stateMachine.states.SELECTING_HERO);
        
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

        if (this.potionHandler) {
            this.potionHandler.resetForNewGame();
        }
        
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
                this.stateMachine.transitionTo(this.stateMachine.states.SELECTING_HERO);
                
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
        
        // Transition to team building state
        this.stateMachine.transitionTo(this.stateMachine.states.TEAM_BUILDING);

        // Calculate and award starting gold
        const startingGold = this.calculateStartingGold(character);
        this.goldManager.setPlayerGold(startingGold, 'starting_gold');
        console.log(`💰 Awarded ${startingGold} starting gold to player`);

        // Initialize battle formation with selected character in center
        this.formationManager.initWithCharacter(character);

        // Get full hero info from database
        const heroInfo = getHeroInfo(character.name);
        if (heroInfo) {
            // Initialize hero with starting abilities in center position
            this.heroAbilitiesManager.updateHeroPlacement('center', heroInfo);
            
            // Immediately update potion bonuses after hero placement
            this.potionHandler.updateAlchemyBonuses(this);
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

    // Send formation update to opponent via P2P with abilities and comprehensive debugging
    async sendFormationUpdate() {
        if (this.gameDataSender) {
            // Gather abilities data
            const abilitiesData = {
                left: this.heroAbilitiesManager.getHeroAbilities('left'),
                center: this.heroAbilitiesManager.getHeroAbilities('center'),
                right: this.heroAbilitiesManager.getHeroAbilities('right')
            };
            
            // Gather spellbooks data
            const spellbooksData = {
                left: this.heroSpellbookManager.getHeroSpellbook('left'),
                center: this.heroSpellbookManager.getHeroSpellbook('center'),
                right: this.heroSpellbookManager.getHeroSpellbook('right')
            };
            
            // Gather creatures data
            const creaturesData = {
                left: this.heroCreatureManager.getHeroCreatures('left'),
                center: this.heroCreatureManager.getHeroCreatures('center'),
                right: this.heroCreatureManager.getHeroCreatures('right')
            };

            const equipmentData = {
                left: this.heroEquipmentManager.getHeroEquipment('left'),
                center: this.heroEquipmentManager.getHeroEquipment('center'),
                right: this.heroEquipmentManager.getHeroEquipment('right')
            };
            
            // Send all data
            this.gameDataSender('formation_update', {
                playerRole: this.isHost ? 'host' : 'guest',
                battleFormation: this.formationManager.getBattleFormation(),
                abilities: abilitiesData,
                spellbooks: spellbooksData,
                creatures: creaturesData,
                equipment: equipmentData 
            });
        }
    }

    // Receive formation update from opponent with abilities and comprehensive debugging
    receiveFormationUpdate(data) {
        // Update opponent formation
        this.formationManager.updateOpponentFormation(data);
        
        // Store opponent abilities if included
        if (data.abilities) {
            // Store for later use when battle starts
            this.opponentAbilitiesData = data.abilities;
            
            // If we're in team building phase, update display
            if (this.stateMachine.isInState(this.stateMachine.states.TEAM_BUILDING)) {
                this.updateOpponentAbilityDisplay();
            }
        }
        
        // Store opponent spellbooks if included
        if (data.spellbooks) {
            // Store for later use when battle starts
            this.opponentSpellbooksData = data.spellbooks;
        }
        
        // Store opponent creatures if included
        if (data.creatures) {
            // Store for later use when battle starts
            this.opponentCreaturesData = data.creatures;
        }
        
        // Store opponent equipment if included - THIS WAS MISSING!
        if (data.equipment) {
            // Store for later use when battle starts
            this.opponentEquipmentData = data.equipment;
            console.log('📦 Received opponent equipment data:', data.equipment);
        }
    }

    // Update opponent ability display (optional UI enhancement)
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

    // Align opponent abilities with their formation
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
        
        // Calculate opponent's starting gold
        const opponentStartingGold = this.calculateStartingGold(this.opponentSelectedCharacter);
        this.goldManager.setOpponentGold(opponentStartingGold, 'starting_gold');
        console.log(`💰 Set opponent's starting gold to ${opponentStartingGold}`);
        
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
        console.log('🛡️ Returning to formation screen after battle');
        
        // Transition to cleanup state
        this.stateMachine.transitionTo(this.stateMachine.states.CLEANING_UP, {
            reason: 'returning_from_battle'
        });
        
        try {
            // STEP 1: Set game phase to Formation immediately
            await this.setGamePhase('Formation');
            
            // ===== CLEAR POTION EFFECTS WHEN RETURNING TO FORMATION =====
            if (this.potionHandler) {
                try {
                    this.potionHandler.clearPotionEffects();
                } catch (error) {
                    console.error('❌ Error clearing potion effects during formation return:', error);
                }
            }
            
            if (window.heroSelection) {
                console.log('🥩 HOST: Clearing processed delayed artifact effects...');
                window.heroSelection.clearProcessedDelayedEffects();
            }
            
            // STEP 2: IMMEDIATE UI UPDATES (no waiting for Firebase)
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
                heroSelectionScreen.dataset.postBattle = 'true';
                
                setTimeout(() => {
                    const deckColumn = document.querySelector('.team-building-right');
                    if (deckColumn) {
                        deckColumn.style.display = 'none';
                        deckColumn.offsetHeight;
                        deckColumn.style.display = '';
                    }
                    
                    setTimeout(() => {
                        delete heroSelectionScreen.dataset.postBattle;
                    }, 300);
                }, 50);
            }

            if (this.cardPreviewManager) {
                this.cardPreviewManager.forceLayoutRecalculation();
            }
            
            // Force button to enabled state
            const toBattleBtn = document.querySelector('.to-battle-button');
            if (toBattleBtn) {
                toBattleBtn.disabled = false;
            }
            
            // Reset turn-based ability tracking
            if (this.heroAbilitiesManager) {
                this.heroAbilitiesManager.resetTurnBasedTracking();
            }
                
            // Reset actions for the new turn after battle
            if (this.actionManager) {
                this.actionManager.resetActions();
                console.log('✨ Actions reset for new turn after battle');
            }

            // Reset Nicolas effect usage when returning to formation
            if (this.nicolasEffectManager) {
                this.nicolasEffectManager.resetForNewTurn();
                console.log('✨ Nicolas effect usage reset when returning to formation');
            }
            if (this.vacarnEffectManager) {
                this.vacarnEffectManager.resetForNewTurn();
            }
            
            // STEP 3: Transition to team building state BEFORE updating UI
            this.stateMachine.transitionTo(this.stateMachine.states.TEAM_BUILDING);
            
            // STEP 4: NOW update UI to show team building
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                window.updateHeroSelectionUI();
            }
            
            // Update deck display immediately
            this.updateDeckDisplay();
            
            // STEP 5: Background Firebase cleanup
            this.aggressiveBattleStateClear().then(() => {
                console.log('Background Firebase cleanup completed');
            }).catch(error => {
                console.log('Background Firebase cleanup failed, but UI already updated');
            });
            
        } catch (error) {
            console.error('Error returning to formation screen:', error);
            this.stateMachine.transitionTo(this.stateMachine.states.ERROR, {
                error: error.message
            });
        }
    }

    // More aggressive state clearing with multiple approaches
    async aggressiveBattleStateClear() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return;
        }

        const roomRef = this.roomManager.getRoomRef();
        
        try {
            // Check current battle ready states before clearing
            const currentState = await roomRef.child('gameState').once('value');
            const gameState = currentState.val();
            
            // Only clear our own ready state, not the opponent's
            const updates = {
                battleStarted: false,
                battleStartTime: null,
                aggressiveCleared: Date.now(),
                lastBattleCleared: Date.now()
            };
            
            // Only clear our own ready state
            if (this.isHost) {
                updates.hostBattleReady = false;
                // Don't touch guestBattleReady
            } else {
                updates.guestBattleReady = false;
                // Don't touch hostBattleReady
            }
            
            await roomRef.child('gameState').update(updates);
            
        } catch (error) {
            // Error occurred but don't log it
        }
    }

    // Handle To Battle click with improved state management
    async handleToBattleClick() {
        console.log('To Battle clicked');
        
        // Can only go to battle from team building state
        if (!this.stateMachine.isInState(this.stateMachine.states.TEAM_BUILDING)) {
            console.log('Not in correct state to go to battle');
            return;
        }
        
        // Prevent multiple clicks
        const toBattleBtn = document.querySelector('.to-battle-button');
        if (toBattleBtn && toBattleBtn.disabled) {
            return;
        }
        
        // Disable the button immediately
        if (toBattleBtn) {
            toBattleBtn.disabled = true;
        }
        
        // Transition to waiting state
        this.stateMachine.transitionTo(this.stateMachine.states.WAITING_FOR_BATTLE);
        
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
                // Ensure we're in the right state before transitioning
                if (!this.stateMachine.isInState(this.stateMachine.states.TRANSITIONING_TO_BATTLE)) {
                    this.stateMachine.transitionTo(this.stateMachine.states.TRANSITIONING_TO_BATTLE, {
                        reason: 'battle_already_started'
                    });
                }
                this.transitionToBattleScreen();
                return;
            }
            
            // If both are ready and battle hasn't started yet
            if (hostReady && guestReady && !battleStarted && 
                this.stateMachine.isInState(this.stateMachine.states.WAITING_FOR_BATTLE)) {
                
                // Transition to battle starting
                this.stateMachine.transitionTo(this.stateMachine.states.TRANSITIONING_TO_BATTLE, {
                    reason: 'both_players_ready'
                });
                
                // Only HOST should mark battle as started
                if (this.isHost) {
                    // ❗ CRITICAL: Set ALL battle flags atomically to prevent race conditions
                    await roomRef.child('gameState').update({
                        battleStarted: true,
                        battleStartTime: Date.now(),
                        battleEndedAt: null,        // Clear previous battle end timestamp
                        battleActive: true,         // Mark battle as active
                        gamePhase: 'Battle',        // Set phase atomically
                        gamePhaseUpdated: Date.now(),
                        battlePaused: false         // Ensure not paused
                    });
                    console.log('🔥 HOST: Battle state set atomically - battleStarted, gamePhase=Battle, battleActive=true');
                    
                    // Send battle start signal via P2P
                    if (this.gameDataSender) {
                        this.gameDataSender('battle_transition_start', {
                            timestamp: Date.now()
                        });
                    }
                }
                
                // Both players transition to battle
                this.transitionToBattleScreen();
            } else {
                // Show waiting overlay
                this.showBattleWaitingOverlay();
            }
        } catch (error) {
            console.error('Error in checkAndHandleBattleTransition:', error);
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
        // Transition back to team building from waiting state
        this.stateMachine.transitionTo(this.stateMachine.states.TEAM_BUILDING, {
            reason: 'battle_ready_cancelled'
        });
        
        // Re-enable To Battle button
        const toBattleBtn = document.querySelector('.to-battle-button');
        if (toBattleBtn) {
            toBattleBtn.disabled = false;
        }
        
        // Hide waiting overlay
        this.hideBattleWaitingOverlay();
        
        // Clear ready state in Firebase
        await this.setPlayerBattleReady(false);
    }
    
    // Transition to battle screen (called when both are ready)
    async transitionToBattleScreen() {
        console.log('🔥 Transitioning to battle screen');

        this.globalSpellManager.clearGuardChangeMode(this);
        
        // Check if we're in a valid state to transition to battle
        const validStates = [
            this.stateMachine.states.TRANSITIONING_TO_BATTLE,
            this.stateMachine.states.WAITING_FOR_BATTLE
        ];
        
        if (!this.stateMachine.isInAnyState(validStates)) {
            console.warn('Not in correct state to transition to battle. Current state:', this.stateMachine.getState());
            
            if (this.stateMachine.isInState(this.stateMachine.states.WAITING_FOR_BATTLE)) {
                console.log('Fixing state: WAITING_FOR_BATTLE -> TRANSITIONING_TO_BATTLE');
                this.stateMachine.transitionTo(this.stateMachine.states.TRANSITIONING_TO_BATTLE, {
                    reason: 'state_fix_for_battle'
                });
            } else {
                return;
            }
        }
        
        // ✅ Game phase is now set atomically by HOST in checkAndHandleBattleTransition()
        // This eliminates the race condition that caused reconnection issues
        console.log('✅ Battle state already set atomically - proceeding with battle');
        
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
            
            // Transition to in battle state
            this.stateMachine.transitionTo(this.stateMachine.states.IN_BATTLE, {
                reason: 'battle_screen_initialized'
            });
            
            // Start the battle!
            this.battleScreen.startBattle();
        }
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

    // Battle screen management with abilities, spellbooks, and creatures
    initBattleScreen() {        
        if (!this.selectedCharacter || !this.opponentSelectedCharacter) {
            return false;
        }
        
        // NEW: Calculate effective stats for all player heroes
        const playerEffectiveStats = {};
        ['left', 'center', 'right'].forEach(position => {
            const stats = this.calculateEffectiveHeroStats(position);
            if (stats) {
                playerEffectiveStats[position] = stats;
                console.log(`📊 Calculated effective stats for ${position}: HP ${stats.maxHp}, ATK ${stats.attack}`);
            }
        });
        
        // Get player abilities
        const playerAbilities = {
            left: this.heroAbilitiesManager.getHeroAbilities('left'),
            center: this.heroAbilitiesManager.getHeroAbilities('center'),
            right: this.heroAbilitiesManager.getHeroAbilities('right')
        };


        // Get permanent artifacts list for battle
        const permanentArtifacts = window.artifactHandler ? 
            window.artifactHandler.getPermanentArtifacts() : [];
        
        // Verify player abilities
        let totalPlayerAbilities = 0;
        ['left', 'center', 'right'].forEach(position => {
            const abilities = playerAbilities[position];
            if (abilities) {
                // Count total abilities and Fighting specifically
                let totalAbilities = 0;
                let fightingCount = 0;
                let toughnessCount = 0;
                
                ['zone1', 'zone2', 'zone3'].forEach(zone => {
                    if (abilities[zone] && Array.isArray(abilities[zone])) {
                        totalAbilities += abilities[zone].length;
                        const fightingInZone = abilities[zone].filter(a => a && a.name === 'Fighting').length;
                        const toughnessInZone = abilities[zone].filter(a => a && a.name === 'Toughness').length;
                        fightingCount += fightingInZone;
                        toughnessCount += toughnessInZone;
                    }
                });
                
                if (totalAbilities > 0) {
                    totalPlayerAbilities += totalAbilities;
                }
                
                // Log stat-affecting abilities
                if (fightingCount > 0 || toughnessCount > 0) {
                    const formation = this.formationManager.getBattleFormation();
                    const hero = formation[position];
                    if (hero) {
                        console.log(`⚔️ ${hero.name} has ${fightingCount} Fighting (+${fightingCount * 10} ATK) and ${toughnessCount} Toughness (+${toughnessCount * 200} HP)`);
                    }
                }
            }
        });
                    
        // Get opponent abilities (from stored data if available)
        let opponentAbilities = null;
        if (this.opponentAbilitiesData) {
            // Transform opponent abilities to match our formation alignment
            opponentAbilities = this.alignOpponentAbilities(this.opponentAbilitiesData);
            
            if (opponentAbilities) {
                let totalOpponentAbilities = 0;
                ['left', 'center', 'right'].forEach(position => {
                    const abilities = opponentAbilities[position];
                    if (abilities) {
                        let fightingCount = 0;
                        let toughnessCount = 0;
                        let totalAbilities = 0;
                        ['zone1', 'zone2', 'zone3'].forEach(zone => {
                            if (abilities[zone] && Array.isArray(abilities[zone])) {
                                totalAbilities += abilities[zone].length;
                                fightingCount += abilities[zone].filter(a => a && a.name === 'Fighting').length;
                                toughnessCount += abilities[zone].filter(a => a && a.name === 'Toughness').length;
                            }
                        });
                        if (totalAbilities > 0) {
                            totalOpponentAbilities += totalAbilities;
                        }
                    }
                });
            }
        }
        
        const hasValidPlayerAbilities = Object.values(playerAbilities).some(pos => pos !== null);
        
        if (!hasValidPlayerAbilities) {
            console.warn('⚠️ No valid player abilities found, attempting emergency recovery');
            
            // EMERGENCY RECOVERY: Try to rebuild abilities from formation
            const formation = this.formationManager.getBattleFormation();
            const emergencyAbilities = {};
            
            ['left', 'center', 'right'].forEach(position => {
                if (formation[position]) {
                    // Try to get abilities from the heroAbilitiesManager directly
                    const directAbilities = this.heroAbilitiesManager.heroAbilityZones?.[position];
                    if (directAbilities) {
                        emergencyAbilities[position] = directAbilities;
                        console.log(`🎮 Emergency recovery: found abilities for ${position}`);
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

        // Get equipment data for all player heroes
        const playerEquipment = {
            left: this.heroEquipmentManager.getHeroEquipment('left'),
            center: this.heroEquipmentManager.getHeroEquipment('center'),
            right: this.heroEquipmentManager.getHeroEquipment('right')
        };

        // Get opponent equipment (from stored data if available)
        let opponentEquipment = null;
        if (this.opponentEquipmentData) {
            opponentEquipment = this.opponentEquipmentData;
        }
        
        // Get creature data for all player heroes
        const playerCreatures = {
            left: this.heroCreatureManager.getHeroCreatures('left'),
            center: this.heroCreatureManager.getHeroCreatures('center'),
            right: this.heroCreatureManager.getHeroCreatures('right')
        };
        
        // Get opponent creatures (from stored data if available)
        let opponentCreatures = null;
        if (this.opponentCreaturesData) {
            opponentCreatures = this.opponentCreaturesData;
        }
        
        // Get opponent effective stats (from stored data if available)
        let opponentEffectiveStats = null;
        if (this.opponentEffectiveStatsData) {
            opponentEffectiveStats = this.opponentEffectiveStatsData;
        }
        
        // Initialize battle screen with all data        
        try {
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
                this.actionManager,
                playerCreatures,      
                opponentCreatures,
                playerEquipment,
                opponentEquipment,
                playerEffectiveStats,
                opponentEffectiveStats,
                permanentArtifacts   
            );
            
            console.log('✅ Battle screen initialized with stat-enhanced Hero instances');
            return true;
            
        } catch (error) {
            console.error('❌ Error during battle screen initialization:', error);
            return false;
        }
    }

    // Get hero abilities manager
    getHeroAbilitiesManager() {
        return this.heroAbilitiesManager;
    }

    // Get hero creature manager
    getHeroCreatureManager() {
        return this.heroCreatureManager;
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

    // Calculate starting gold based on selected hero
    calculateStartingGold(character) {
        let startingGold = 4; // Base gold
        console.log('🏆 Calculating starting gold for', character.name);
        
        // Get hero info to check abilities
        const heroInfo = getHeroInfo(character.name);
        if (heroInfo) {
            // Check for Wealth in starting abilities
            let wealthCount = 0;
            
            // Check ability1
            if (heroInfo.ability1 === 'Wealth') {
                wealthCount++;
            }
            
            // Check ability2
            if (heroInfo.ability2 === 'Wealth') {
                wealthCount++;
            }
            
            if (wealthCount > 0) {
                const wealthGold = wealthCount * 4;
                startingGold += wealthGold;
                console.log(`💰 ${character.name} has ${wealthCount} Wealth abilities, adding ${wealthGold} gold`);
            }
        }
        
        // Check if hero is Semi
        if (character.name === 'Semi') {
            startingGold += 6;
            console.log('🌟 Semi hero selected! Adding 6 bonus gold');
        }
        
        console.log(`📊 Total starting gold for ${character.name}: ${startingGold}`);
        return startingGold;
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
        // Map state machine states to old phase names for compatibility
        const state = this.stateMachine.getState();
        const stateMap = {
            [this.stateMachine.states.INITIALIZING]: 'loading',
            [this.stateMachine.states.SELECTING_HERO]: 'selection',
            [this.stateMachine.states.TEAM_BUILDING]: 'team_building',
            [this.stateMachine.states.WAITING_FOR_BATTLE]: 'team_building',
            [this.stateMachine.states.TRANSITIONING_TO_BATTLE]: 'battle_active',
            [this.stateMachine.states.IN_BATTLE]: 'battle_active',
            [this.stateMachine.states.VIEWING_REWARDS]: 'team_building',
            [this.stateMachine.states.RECONNECTING]: 'loading',
            [this.stateMachine.states.CLEANING_UP]: 'loading',
            [this.stateMachine.states.ERROR]: 'loading'
        };
        
        return stateMap[state] || 'loading';
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

    // Clear processed delayed artifact effects
    clearProcessedDelayedEffects() {
        if (this.delayedArtifactEffects && this.delayedArtifactEffects.length > 0) {
            // Filter out processed PoisonedMeat effects
            const filteredEffects = this.delayedArtifactEffects.filter(
                effect => !(effect.type === 'poison_all_player_targets' && effect.source === 'PoisonedMeat')
            );
            
            const removedCount = this.delayedArtifactEffects.length - filteredEffects.length;
            this.delayedArtifactEffects = filteredEffects;
            
            if (removedCount > 0) {
                console.log(`🧹 Cleared ${removedCount} processed PoisonedMeat effects from local state`);
                
                // Save updated state to Firebase
                this.saveGameState().then(() => {
                    console.log('💾 Updated game state after clearing delayed effects');
                });
            }
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
        
        // Check if we're dropping an equip artifact card
        if (this.isDraggingEquipArtifactCard()) {
            const success = await this.handleEquipArtifactDrop(targetSlot);
            return success;
        }
        
        // Otherwise, handle hero swapping as normal
        const swapInfo = await this.formationManager.handleDrop(targetSlot);
        if (swapInfo) {
            // Get the updated formation
            const formation = this.formationManager.getBattleFormation();
            
            // Update ability zones based on hero movement
            if (swapInfo.wasSwap) {
                // Heroes swapped positions - swap their abilities, spellbooks, creatures, and equipment
                this.heroAbilitiesManager.moveHeroAbilities(swapInfo.from, swapInfo.to);
                this.heroSpellbookManager.moveHeroSpellbook(swapInfo.from, swapInfo.to);
                this.heroCreatureManager.moveHeroCreatures(swapInfo.from, swapInfo.to);
                this.heroEquipmentManager.moveHeroEquipment(swapInfo.from, swapInfo.to);
            } else {
                // Hero moved to empty slot
                this.heroAbilitiesManager.moveHeroAbilities(swapInfo.from, swapInfo.to);
                this.heroAbilitiesManager.clearHeroAbilities(swapInfo.from);
                this.heroSpellbookManager.moveHeroSpellbook(swapInfo.from, swapInfo.to);
                this.heroSpellbookManager.clearHeroSpellbook(swapInfo.from);
                this.heroCreatureManager.moveHeroCreatures(swapInfo.from, swapInfo.to);
                this.heroCreatureManager.clearHeroCreatures(swapInfo.from);
                this.heroEquipmentManager.moveHeroEquipment(swapInfo.from, swapInfo.to);
                this.heroEquipmentManager.clearHeroEquipment(swapInfo.from);
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
        // Check if this is a global spell being dropped on a hero slot
        if (this.globalSpellManager.isDraggingGlobalSpell(this)) {
            return this.globalSpellManager.handleGlobalSpellDropOnHero(targetSlot, this);
        }

        const dragState = this.handManager.getHandDragState();
        const spellCardName = dragState.draggedCardName;
        const cardIndex = dragState.draggedCardIndex;
        
        // Get card info to check if it requires an action
        const cardInfo = getCardInfo(spellCardName);
        
        // Check if this is FrontSoldier being summoned for free
        const isFrontSoldierFree = this.canSummonFrontSoldierForFree(targetSlot, spellCardName);
        
        // Check if player can play action card (skip for free FrontSoldier)
        if (!isFrontSoldierFree) {
            const actionCheck = this.actionManager.canPlayActionCard(cardInfo);
            if (!actionCheck.canPlay) {
                this.handManager.endHandCardDrag();
                window.showActionError(actionCheck.reason, window.event || { clientX: 0, clientY: 0 });
                return false;
            }
        }

        // Check if it's a creature spell
        if (this.heroCreatureManager.isCreatureSpell(spellCardName)) {
            // Check if hero can summon the creature
            const learnCheck = this.canHeroLearnSpell(targetSlot, spellCardName);

            if (!learnCheck.canLearn) {
                this.handManager.endHandCardDrag();
                this.showSpellDropResult(targetSlot, learnCheck.reason, false);
                return false;
            }

            // Hero can summon the creature!
            const success = this.heroCreatureManager.addCreatureToHero(targetSlot, spellCardName);

            if (success) {
                // Consume action if required (skip for free FrontSoldier)
                if (cardInfo.action && !isFrontSoldierFree) {
                    this.actionManager.consumeAction();
                }
                
                // Remove spell from hand
                this.handManager.removeCardFromHandByIndex(cardIndex);
                
                // Show success message
                const successMessage = isFrontSoldierFree ? 
                    `${learnCheck.heroName} summoned ${this.formatCardName(spellCardName)} for free!` :
                    `${learnCheck.heroName} summoned ${this.formatCardName(spellCardName)}!`;
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

        const learnCheck = this.canHeroLearnSpell(targetSlot, spellCardName);

        if (!learnCheck.canLearn) {
            // NEW: Check if this is Semi's gold learning case
            if (learnCheck.isSemiGoldLearning) {
                this.handManager.endHandCardDrag();
                
                // Show Semi's gold learning dialog
                const dialogShown = this.semiEffectManager.showSemiGoldLearningDialog(
                    this, targetSlot, spellCardName, cardIndex
                );
                
                if (!dialogShown) {
                    this.showSpellDropResult(targetSlot, 'Failed to show Semi dialog', false);
                }
                
                return dialogShown;
            }
            
            // Show error message for normal failure
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

    // Update potion display
    updatePotionDisplay() {
        if (this.potionHandler) {
            this.potionHandler.updatePotionDisplay();
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
        
        // Update hero stats after UI refresh with short delay to ensure DOM is ready
        setTimeout(() => {
            this.refreshHeroStats();
        }, 50);
    }

    refreshHeroStats() {
        if (this.heroSelectionUI && typeof this.heroSelectionUI.updateAllHeroStats === 'function') {
            this.heroSelectionUI.updateAllHeroStats();
        }
        
        // Also log current stat bonuses for debugging
        ['left', 'center', 'right'].forEach(position => {
            const stats = this.calculateEffectiveHeroStats(position);
            if (stats && (stats.bonuses.toughnessStacks > 0 || stats.bonuses.fightingStacks > 0)) {
                const formation = this.formationManager.getBattleFormation();
                const hero = formation[position];
                if (hero) {
                    console.log(`📊 ${hero.name} (${position}): ` +
                            `HP ${stats.maxHp} (+${stats.bonuses.hpBonus}), ` +
                            `ATK ${stats.attack} (+${stats.bonuses.attackBonus})`);
                }
            }
        });
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
        // Clear opponent abilities data
        this.opponentAbilitiesData = null;
        
        // Cleanup reconnection manager
        if (this.reconnectionManager) {
            this.reconnectionManager.cleanup();
            this.reconnectionManager = null;
        }
        
        // Remove battle state listener
        if (this.battleStateListener && this.roomManager && this.roomManager.getRoomRef()) {
            this.roomManager.getRoomRef().child('gameState').off('value', this.battleStateListener);
            this.battleStateListener = null;
        }
        
        // Clear all tooltips first
        this.clearAllTooltips();
        
        // Reset state machine instead of individual flags
        this.stateMachine.reset();
        
        // Clear any pending card rewards
        this.clearAnyActiveCardRewards();
        
        // Reset turn tracker
        this.turnTracker.reset();
        this.heroSpellbookManager.reset();
        this.heroCreatureManager.reset();
        this.globalSpellManager.reset();

        // Reset action manager
        if (this.actionManager) {
            this.actionManager.reset();
        }

        // Reset artifact handler (including permanent artifacts for new games)
        if (window.artifactHandler) {
            window.artifactHandler.reset();
        }

        // ===== RESET POTION HANDLER FOR NEW GAME =====
        if (this.potionHandler) {
            this.potionHandler.resetForNewGame(); 
        }

        // Reset Hero effect managers
        if (this.nicolasEffectManager) {
            this.nicolasEffectManager.reset();
        }
        if (this.vacarnEffectManager) {
            this.vacarnEffectManager.reset();
        }
        if (this.semiEffectManager) {
            this.semiEffectManager.reset();
        }
        
        // Reset crusader artifacts handler
        if (this.crusaderArtifactsHandler) {
            this.crusaderArtifactsHandler.reset();
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
        
        const permanentArtifactsIndicator = this.heroSelectionUI.createPermanentArtifactsIndicator();


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
        
        // // Create action display
        const actionDisplay = this.actionManager.createActionDisplay();
        
        // Create potion display
        const potionDisplay = window.potionHandler ? window.potionHandler.createPotionDisplay() : '';
        setTimeout(() => this.refreshHeroStats(), 200);
        
        return `
            ${lifeDisplay}
            ${permanentArtifactsIndicator}
            <div class="team-building-container">
                <!-- Left Column - Team Formation -->
                <div class="team-building-left">
                    <div class="team-header">
                        <div class="team-header-title">
                            <h2>🛡️ Your Battle Formation</h2>
                            ${this.globalSpellManager.isGuardChangeModeActive() ? 
                            '<div class="guard-change-indicator">🛡️ Guard Change Active</div>' : 
                            ''}
                        </div>
                        <p class="drag-hint">💡 Drag and drop heroes to rearrange your formation!</p>
                        <p class="drag-hint">🎯 Drag ability cards to any hero slot to attach them!</p>
                        <p class="drag-hint">📜 Drag spell cards to heroes to add them to their Spellbook!</p>
                        <p class="drag-hint">🐾 Drag creatures to reorder them within the same hero!</p>
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
                <div class="team-building-right-wrapper">
                    <!-- Tooltip Container - now a sibling, not a child -->
                    <div class="deck-tooltip-anchor" id="deckTooltipAnchor">
                        <div class="deck-tooltip-content" id="deckTooltipContent" style="display: none;">
                            <!-- Tooltip content will be inserted here -->
                        </div>
                    </div>
                    
                    <!-- Deck Container -->
                    <div class="team-building-right">
                        ${deckGrid}
                    </div>
                </div>
                
                <!-- Gold, Action, and Potion Display - positioned together -->
                <div class="resource-display-container">
                    <div class="resource-top-row">
                        ${goldDisplay}
                        ${potionDisplay}
                    </div>
                    <div class="resource-bottom-row">
                        ${actionDisplay}
                    </div>
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
        const cardName = dragState.draggedCardName; // FIX: Get cardName from dragState
        
        return this.heroSpellbookManager.isSpellCard(cardName) && 
            !this.globalSpellManager.isGlobalSpell(cardName, this);
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

        // Special exception for Cavalry with 3 total heroes
        if (spellCardName === 'Cavalry') {
            // Count total heroes in formation
            const totalHeroes = Object.values(formation).filter(h => h !== null && h !== undefined).length;
            if (totalHeroes >= 3) {
                return { canLearn: true, heroName: hero.name };
            }
        }

        // Special exception for FrontSoldier when hero has no creatures
        if (spellCardName === 'FrontSoldier') {
            const heroCreatures = this.heroCreatureManager.getHeroCreatures(heroPosition);
            if (heroCreatures.length === 0) {
                return { canLearn: true, heroName: hero.name };
            }
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
            // NEW: Check if Semi can use gold learning
            if (hero.name === 'Semi') {
                const semiCheck = this.semiEffectManager.canUseSemiGoldLearning(this, heroPosition, spellCardName);
                if (semiCheck.canUse) {
                    return { 
                        canLearn: false, 
                        reason: `Semi can learn this for ${semiCheck.goldCost} Gold`,
                        isSemiGoldLearning: true,
                        semiData: semiCheck,
                        heroName: hero.name
                    };
                } else if (semiCheck.goldCost && semiCheck.playerGold !== undefined) {
                    return { 
                        canLearn: false, 
                        reason: `Semi needs ${semiCheck.goldCost} Gold to learn this (have ${semiCheck.playerGold})`
                    };
                }
            }
            
            const formattedSpellSchool = this.formatCardName(spellSchool);
            const formattedSpellName = this.formatCardName(spellCardName);
            
            return { 
                canLearn: false, 
                reason: `${hero.name} needs ${formattedSpellSchool} at level ${spellLevel} or higher to learn ${formattedSpellName}!`
            };
        }

        return { canLearn: true, heroName: hero.name };
    }

    canSummonFrontSoldierForFree(heroPosition, spellCardName) {
        if (spellCardName !== 'FrontSoldier') {
            return false;
        }
        
        // Check if hero has no creatures yet
        const heroCreatures = this.heroCreatureManager.getHeroCreatures(heroPosition);
        return heroCreatures.length === 0;
    }

    // Add helper method to check if dragging an equip artifact card
    isDraggingEquipArtifactCard() {
        if (!this.handManager || !this.handManager.isHandDragging()) {
            return false;
        }
        
        const dragState = this.handManager.getHandDragState();
        const cardName = dragState.draggedCardName;
        
        return this.heroEquipmentManager.isEquipArtifactCard(cardName);
    }

    async handleEquipArtifactDrop(targetSlot) {
        const dragState = this.handManager.getHandDragState();
        const artifactCardName = dragState.draggedCardName;
        const cardIndex = dragState.draggedCardIndex;
        
        // Add artifact to hero
        const result = this.heroEquipmentManager.addArtifactToHero(targetSlot, artifactCardName);
        
        if (result.success) {
            // Remove from hand
            this.handManager.removeCardFromHandByIndex(cardIndex);
            
            // Show success message
            const formation = this.formationManager.getBattleFormation();
            const hero = formation[targetSlot];
            const successMessage = `${hero.name} equipped ${this.formatCardName(artifactCardName)}!`;
            this.showEquipDropResult(targetSlot, successMessage, true);
            
            // Update UI and save
            this.updateHandDisplay();
            this.updateGoldDisplay();
            await this.saveGameState();
            await this.sendFormationUpdate();
        } else {
            // Show error message
            this.showEquipDropResult(targetSlot, result.reason, false);
        }
        
        this.handManager.endHandCardDrag();
        return result.success;
    }

    showEquipDropResult(heroPosition, message, success) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `equip-drop-feedback ${success ? 'success' : 'error'}`;
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
                'background: rgba(255, 193, 7, 0.9); color: #212529;' : 
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

    initializeStatUpdateSystem() {
        // Set up global stat update functions for use by ability manager
        if (typeof window !== 'undefined') {
            // Global stat update function for specific positions
            window.updateHeroStats = (slotPosition) => {
                if (this.heroSelectionUI && typeof this.heroSelectionUI.updateHeroStats === 'function') {
                    this.heroSelectionUI.updateHeroStats(slotPosition);
                }
            };
            
            // Global stat update function for all positions  
            window.updateAllHeroStats = () => {
                if (this.heroSelectionUI && typeof this.heroSelectionUI.updateAllHeroStats === 'function') {
                    this.heroSelectionUI.updateAllHeroStats();
                }
            };
            
            console.log('✅ Stat update system initialized');
        }
    }

    syncStatsForBattleTransition() {
        console.log('🔄 Syncing stats for battle transition...');
        
        // For each hero position, log the effective stats
        ['left', 'center', 'right'].forEach(position => {
            const stats = this.calculateEffectiveHeroStats(position);
            if (stats) {
                const formation = this.formationManager.getBattleFormation();
                const hero = formation[position];
                if (hero) {
                    console.log(`⚔️ ${hero.name} entering battle: ` +
                            `${stats.maxHp} HP, ${stats.attack} ATK ` +
                            `(+${stats.bonuses.hpBonus} HP, +${stats.bonuses.attackBonus} ATK from abilities)`);
                }
            }
        });
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
            window.heroSelection.refreshHeroStats(); 
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