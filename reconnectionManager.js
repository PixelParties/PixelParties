// reconnectionManager.js - Centralized Reconnection Management System with Guard Change Support and Vacarn Integration

import { 
    selectComputerTeamForBattle, 
    computerTeamsExist,
    getRepresentativeHero 
} from './generateComputerParty.js';

export class ReconnectionManager {
    constructor() {
        this.heroSelection = null;
        this.roomManager = null;
        this.gameDataSender = null;
        this.isHost = false;
        
        // Reconnection state tracking
        this.reconnectionInProgress = false;
        this.reconnectionAttempts = 0;
        this.maxReconnectionAttempts = 3;
        
        // Battle reconnection specific state
        this.guestReconnecting = false;
        this.guestReconnectionReady = false;
        this.reconnectionHandshakeTimeout = null;
    }

    // Initialize with required dependencies
    init(heroSelection, roomManager, gameDataSender, isHost) {
        this.heroSelection = heroSelection;
        this.roomManager = roomManager;
        this.gameDataSender = gameDataSender;
        this.isHost = isHost;
    }

    // ===== MAIN RECONNECTION ENTRY POINT =====

    // Main reconnection handler - replaces heroSelection.restoreGameState()
    async handleReconnection(gameState) {
        if (!gameState) {
            return false;
        }

        try {
            const latestGameState = await this.fetchLatestGameState();
            const gameStateToUse = latestGameState || gameState;

            const basicDataRestored = await this.restoreBasicGameData(gameStateToUse);
            
            if (!basicDataRestored) {
                return false;
            }

            const gamePhase = gameStateToUse.gamePhase || 'Formation';

            switch (gamePhase) {
                case 'Battle':
                    return await this.handleBattleReconnection(gameStateToUse);

                case 'Reward':
                    return await this.handleRewardReconnection(gameStateToUse);

                case 'Victory':
                    return await this.handleVictoryReconnection(gameStateToUse);

                case 'Formation':
                default:
                    return await this.handleFormationReconnection(gameStateToUse);
            }

        } catch (error) {
            console.error('[BATTLE RECON DEBUG] ❌ CRITICAL ERROR in reconnection handler:', error);
            console.error('[BATTLE RECON DEBUG] Error stack:', error.stack);
            
            if (this.heroSelection && this.heroSelection.stateMachine) {
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.ERROR,
                    { error: error.message, source: 'reconnection' }
                );
            }
            return false;
        }
    }

    async handleVictoryReconnection(gameState) {        
        // Ensure we have the battle data needed for victory display
        if (!this.heroSelection.selectedCharacter || !this.heroSelection.opponentSelectedCharacter) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }

        // Get victory data from game state
        const victoryData = gameState.victoryData;
        if (!victoryData) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }

        // Transition to victory state
        this.heroSelection.stateMachine.transitionTo(
            this.heroSelection.stateMachine.states.VICTORY,
            { source: 'victory_reconnection' }
        );

        // Determine winner data for display
        let winnerFormation;
        
        // Try to get formation from stored victory data first
        if (victoryData.winnerFormation) {
            winnerFormation = victoryData.winnerFormation;
        } else {
            // Fallback to current formation data
            if (victoryData.winner === 'player') {
                winnerFormation = this.heroSelection.formationManager.getBattleFormation();
            } else {
                winnerFormation = this.heroSelection.formationManager.getOpponentBattleFormation();
            }
        }

        // Create winner display data with enhanced information
        const winnerDisplayData = {
            playerName: victoryData.winnerName || 'Unknown Player',
            heroes: winnerFormation ? 
                [winnerFormation.left, winnerFormation.center, winnerFormation.right].filter(h => h) : 
                [],
            isLocalPlayer: victoryData.winner === 'player',
            victoryType: victoryData.victoryType || 'victory',
            finalScore: victoryData.finalScore || { player: 0, opponent: 0 }
        };

        // Show victory screen after UI settles
        setTimeout(() => {
            if (this.heroSelection.victoryScreen) {
                this.heroSelection.victoryScreen.showVictoryScreen(winnerDisplayData, this.heroSelection);
            }
        }, this.getSpeedAdjustedDelay(200));

        return true;
    }

    // Fetch the latest game state from Firebase to avoid race conditions
    async fetchLatestGameState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return null;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('gameState').once('value');
            const latestState = snapshot.val();
            
            return latestState;
        } catch (error) {
            return null;
        }
    }

    // ===== GAME PHASE MANAGEMENT =====

    // Set game phase in Firebase
    async setGamePhase(phase) {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            await this.roomManager.getRoomRef().child('gameState').update({
                gamePhase: phase,
                gamePhaseUpdated: Date.now()
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Set game phase to Battle (called when battle starts)
    async setGamePhaseToBattle() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }

        try {
            await this.roomManager.getRoomRef().child('gameState').update({
                gamePhase: 'Battle',
                gamePhaseUpdated: Date.now(),
                battleActive: true,        // Ensure battle is marked as active
                battleStarted: true,       // Ensure battle is marked as started  
                battlePaused: false,       // Clear any pause state
                battleEndedAt: null        // CRITICAL: Clear previous battle end timestamp
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Set game phase to Reward (called when battle ends)
    async setGamePhaseToReward() {
        try {
            await this.roomManager.getRoomRef().child('gameState').update({
                gamePhase: 'Reward',
                gamePhaseUpdated: Date.now(),
                battleEndedAt: Date.now()
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Set game phase to Formation (called when rewards are selected)
    async setGamePhaseToFormation() {
        return await this.setGamePhase('Formation');
    }

    // ===== BASIC DATA RESTORATION =====

    // Restore basic game data (characters, formations, etc.)
    async restoreBasicGameData(gameState) {
        try {
            // Keep the state machine in RECONNECTING while restoring data
            this.heroSelection.stateMachine.updateContext({
                restoringData: true,
                progress: 'basic_data'
            });
            
            // Restore turn using TurnTracker
            await this.heroSelection.turnTracker.importTurnData(gameState);

            // Restore character assignments
            if (gameState.hostCharacters && gameState.guestCharacters) {
                if (this.isHost) {
                    this.heroSelection.playerCharacters = gameState.hostCharacters || [];
                    this.heroSelection.opponentCharacters = gameState.guestCharacters || [];
                } else {
                    this.heroSelection.playerCharacters = gameState.guestCharacters || [];
                    this.heroSelection.opponentCharacters = gameState.hostCharacters || [];
                }
            }

            // Update restoration progress
            this.heroSelection.stateMachine.updateContext({
                progress: 'formations'
            });

            // Restore player selections and formations
            if (this.isHost && gameState.hostSelected) {
                this.heroSelection.selectedCharacter = gameState.hostSelected;
                
                // Skip formation restoration during battle reconnection
                // Let battle persistence handle formations to preserve hookshot swaps
                const isBattleReconnection = gameState.gamePhase === 'Battle' && gameState.battleActive;
                
                if (gameState.hostBattleFormation && !isBattleReconnection) {
                    // Only restore formations if NOT during battle reconnection
                    this.heroSelection.formationManager.importFormationState({
                        battleFormation: gameState.hostBattleFormation,
                        opponentBattleFormation: gameState.guestBattleFormation ? 
                            this.heroSelection.formationManager.alignOpponentFormation(gameState.guestBattleFormation) : null
                    }, true);
                } else if (!isBattleReconnection) {
                    // Only init with character if NOT during battle reconnection
                    this.heroSelection.formationManager.initWithCharacter(this.heroSelection.selectedCharacter);
                }
                // If it IS battle reconnection, leave formations empty - they'll be restored from battle persistence

                // Check the specific teleport state for this player
                const myTeleportState = this.isHost ? gameState.hostTeleportState : gameState.guestTeleportState;

                this.heroSelection.restorePlayerData(
                    gameState.hostDeck, 
                    gameState.hostHand, 
                    gameState.hostLifeData, 
                    gameState.hostGoldData,
                    gameState.hostGlobalSpellState,
                    gameState.hostPotionState,
                    gameState.hostNicolasState,
                    gameState.hostRiffelState,
                    gameState.hostVacarnState,
                    gameState.hostdelayedEffects,
                    gameState.hostSemiState,
                    gameState.hostHeinzState,
                    gameState.hostKazenaState, 
                    gameState.hostPermanentArtifacts,
                    gameState.guestPermanentArtifacts,
                    gameState.hostMagicSapphiresUsed,
                    gameState.hostMagicRubiesUsed,
                    gameState.hostPlayerCounters,
                    gameState.hostAreaCard,
                    gameState.hostGraveyardState,
                    gameState.hostInventingState,
                    gameState.hostOccultismState,
                    gameState.hostGraveWormState,
                    gameState.hostCrystalWellState,
                    gameState.hostTeleportState,
                    gameState.guestPlayerCounters
                );
            } else if (!this.isHost && gameState.guestSelected) {
                this.heroSelection.selectedCharacter = gameState.guestSelected;
                
                // Skip formation restoration during battle reconnection
                const isBattleReconnection = gameState.gamePhase === 'Battle' && gameState.battleActive;
                
                if (gameState.guestBattleFormation && !isBattleReconnection) {
                    // Only restore formations if NOT during battle reconnection
                    this.heroSelection.formationManager.importFormationState({
                        battleFormation: gameState.guestBattleFormation,
                        opponentBattleFormation: gameState.hostBattleFormation ? 
                            this.heroSelection.formationManager.alignOpponentFormation(gameState.hostBattleFormation) : null
                    }, false);
                } else if (!isBattleReconnection) {
                    // Only init with character if NOT during battle reconnection
                    this.heroSelection.formationManager.initWithCharacter(this.heroSelection.selectedCharacter);
                }
                
                const guestMagicSapphireValue = gameState.guestMagicSapphiresUsed;
                const guestMagicRubyValue = gameState.guestMagicRubiesUsed;

                // Check the specific teleport state for this player
                const myTeleportState = this.isHost ? gameState.hostTeleportState : gameState.guestTeleportState;

                this.heroSelection.restorePlayerData(
                    gameState.guestDeck, 
                    gameState.guestHand, 
                    gameState.guestLifeData, 
                    gameState.guestGoldData,
                    gameState.guestGlobalSpellState,
                    gameState.guestPotionState,
                    gameState.guestNicolasState,
                    gameState.guestRiffelState,
                    gameState.guestVacarnState,
                    gameState.guestdelayedEffects,
                    gameState.guestSemiState,
                    gameState.guestHeinzState,
                    gameState.guestKazenaState,
                    gameState.guestPermanentArtifacts,
                    gameState.hostPermanentArtifacts, 
                    guestMagicSapphireValue,
                    guestMagicRubyValue,
                    gameState.guestPlayerCounters,
                    gameState.guestAreaCard,
                    gameState.guestGraveyardState,
                    gameState.guestInventingState,
                    gameState.guestOccultismState,
                    gameState.guestGraveWormState,
                    gameState.guestCrystalWellState,
                    gameState.guestTeleportState,
                    gameState.hostPlayerCounters
                );
            }
                
            if (gameState.hostAreaCard || gameState.guestAreaCard) {
                const currentAreaCard = this.heroSelection.areaHandler.getAreaCard();
                
                // Restore doom counters from saved data
                const playerAreaCard = this.isHost ? gameState.hostAreaCard : gameState.guestAreaCard;
                const opponentAreaCard = this.isHost ? gameState.guestAreaCard : gameState.hostAreaCard;
                
                import('./Spells/doomClock.js').then(({ restoreDoomCountersFromSavedData }) => {
                    restoreDoomCountersFromSavedData(this.heroSelection, playerAreaCard, opponentAreaCard);
                }).catch(error => {
                    // Silent error handling
                });
                
                // Force UI update for area slot
                setTimeout(() => {
                    this.heroSelection.updateBattleFormationUI();
                }, 100);
            }

            // Update restoration progress
            this.heroSelection.stateMachine.updateContext({
                progress: 'advanced_data'
            });

            // Restore advanced data (abilities, spellbooks, creatures, actions)
            await this.restoreAdvancedData(gameState);

            // Restore opponent data
            this.restoreOpponentData(gameState);

            // Initialize life manager with turn tracker
            this.heroSelection.initializeLifeManagerWithTurnTracker();

            // Clear restoration progress
            this.heroSelection.stateMachine.updateContext({
                restoringData: false,
                progress: 'complete'
            });

            return true;

        } catch (error) {
            // Update state machine context with error
            this.heroSelection.stateMachine.updateContext({
                restoringData: false,
                progress: 'failed',
                error: error.message
            });
            
            return false;
        }
    }

    // Restore advanced data (abilities, spellbooks, creatures, equipment, actions)
    async restoreAdvancedData(gameState) {
        // Restore abilities - always restore them
        if (this.isHost && gameState.hostAbilitiesState) {
            this.heroSelection.heroAbilitiesManager.importAbilitiesState(gameState.hostAbilitiesState);
        } else if (!this.isHost && gameState.guestAbilitiesState) {
            this.heroSelection.heroAbilitiesManager.importAbilitiesState(gameState.guestAbilitiesState);
        } else {
            // Initialize from current formation if no saved state
            const formation = this.heroSelection.formationManager.getBattleFormation();
            for (const position of ['left', 'center', 'right']) {
                if (formation[position]) {
                    const heroInfo = this.heroSelection.getCardInfo(formation[position].name);
                    if (heroInfo) {
                        this.heroSelection.heroAbilitiesManager.updateHeroPlacement(position, heroInfo);
                    }
                }
            }
        }

        // Restore Spellbooks - always restore them
        if (this.isHost && gameState.hostSpellbooksState) {
            this.heroSelection.heroSpellbookManager.importSpellbooksState(gameState.hostSpellbooksState);
        } else if (!this.isHost && gameState.guestSpellbooksState) {
            this.heroSelection.heroSpellbookManager.importSpellbooksState(gameState.guestSpellbooksState);
        }

        // Restore creatures - always restore them
        if (this.isHost && gameState.hostCreaturesState) {
            this.heroSelection.heroCreatureManager.importCreaturesState(gameState.hostCreaturesState);
        } else if (!this.isHost && gameState.guestCreaturesState) {
            this.heroSelection.heroCreatureManager.importCreaturesState(gameState.guestCreaturesState);
        }

        // Restore equipment - always restore them
        if (this.isHost && gameState.hostEquipmentState) {
            // Only restore if NOT during battle reconnection (to avoid conflicts with checkpoint)
            const isBattleReconnection = gameState.gamePhase === 'Battle' && gameState.battleActive;
            
            if (!isBattleReconnection && this.heroSelection.heroEquipmentManager) {
                try {
                    const equipmentRestored = this.heroSelection.heroEquipmentManager.importEquipmentState(gameState.hostEquipmentState);
                } catch (error) {
                    // Initialize empty equipment state as fallback
                    if (this.heroSelection.heroEquipmentManager) {
                        this.heroSelection.heroEquipmentManager.heroEquipment = {
                            left: [], center: [], right: []
                        };
                    }
                }
            }
        } else if (!this.isHost && gameState.guestEquipmentState) {
            // Only restore if NOT during battle reconnection (to avoid conflicts with checkpoint)
            const isBattleReconnection = gameState.gamePhase === 'Battle' && gameState.battleActive;
            
            if (!isBattleReconnection && this.heroSelection.heroEquipmentManager) {
                try {
                    const equipmentRestored = this.heroSelection.heroEquipmentManager.importEquipmentState(gameState.guestEquipmentState);
                } catch (error) {
                    // Initialize empty equipment state as fallback
                    if (this.heroSelection.heroEquipmentManager) {
                        this.heroSelection.heroEquipmentManager.heroEquipment = {
                            left: [], center: [], right: []
                        };
                    }
                }
            }
        } else {
            // Initialize equipment state if no saved data and not battle reconnection
            const isBattleReconnection = gameState.gamePhase === 'Battle' && gameState.battleActive;
            if (!isBattleReconnection && this.heroSelection.heroEquipmentManager) {
                this.heroSelection.heroEquipmentManager.reset();
            }
        }

        // CRITICAL: Re-sync Guard Change mode with HeroCreatureManager after creature restoration
        // This ensures that creatures can be moved between heroes if Guard Change was active
        if (this.heroSelection.globalSpellManager && this.heroSelection.heroCreatureManager) {
            const isGuardChangeActive = this.heroSelection.globalSpellManager.isGuardChangeModeActive();
            if (isGuardChangeActive) {
                this.heroSelection.heroCreatureManager.setGuardChangeMode(true);
            }
        }

        // Restore action data
        if (this.isHost && gameState.hostActionData) {
            this.heroSelection.actionManager.importActionData(gameState.hostActionData);
        } else if (!this.isHost && gameState.guestActionData) {
            this.heroSelection.actionManager.importActionData(gameState.guestActionData);
        } else {
            this.heroSelection.actionManager.resetActions();
        }

        // Restore special modes
        if (this.isHost && gameState.hostMagneticGloveState) {
            if (window.magneticGloveArtifact) {
                await window.magneticGloveArtifact.restoreMagneticGloveState(this.heroSelection, gameState.hostMagneticGloveState);
            }
        } else if (!this.isHost && gameState.guestMagneticGloveState) {
            if (window.magneticGloveArtifact) {
                await window.magneticGloveArtifact.restoreMagneticGloveState(this.heroSelection, gameState.guestMagneticGloveState);
            }
        }
        if (this.isHost && gameState.hostFutureTechLampState) {
            if (window.futureTechLampArtifact) {
                await window.futureTechLampArtifact.restoreLampState(this.heroSelection, gameState.hostFutureTechLampState);
            }
        } else if (!this.isHost && gameState.guestFutureTechLampState) {
            if (window.futureTechLampArtifact) {
                await window.futureTechLampArtifact.restoreLampState(this.heroSelection, gameState.guestFutureTechLampState);
            }
        }
        if (this.isHost && gameState.hostFutureTechCopyDeviceState) {
            if (window.futureTechCopyDeviceArtifact) {
                await window.futureTechCopyDeviceArtifact.restoreCopyDeviceState(this.heroSelection, gameState.hostFutureTechCopyDeviceState);
            }
        } else if (!this.isHost && gameState.guestFutureTechCopyDeviceState) {
            if (window.futureTechCopyDeviceArtifact) {
                await window.futureTechCopyDeviceArtifact.restoreCopyDeviceState(this.heroSelection, gameState.guestFutureTechCopyDeviceState);
            }
        }
        if (this.isHost && gameState.hostPremonitionState) {
            if (this.heroSelection.premonitionAbility) {
                await this.heroSelection.premonitionAbility.restorePremonitionState(this.heroSelection, gameState.hostPremonitionState);
            }
        } else if (!this.isHost && gameState.guestPremonitionState) {
            if (this.heroSelection.premonitionAbility) {
                await this.heroSelection.premonitionAbility.restorePremonitionState(this.heroSelection, gameState.guestPremonitionState);
            }
        }

        // Restore potion state
        if (this.isHost && gameState.hostPotionState) {
            if (this.heroSelection.potionHandler) {
                const potionRestored = this.heroSelection.potionHandler.importPotionState(gameState.hostPotionState);
                if (potionRestored) {
                    // Recalculate alchemy bonuses based on current abilities
                    this.heroSelection.potionHandler.updateAlchemyBonuses(this.heroSelection);
                }
            }
        } else if (!this.isHost && gameState.guestPotionState) {
            if (this.heroSelection.potionHandler) {
                const potionRestored = this.heroSelection.potionHandler.importPotionState(gameState.guestPotionState);
                if (potionRestored) {
                    // Recalculate alchemy bonuses based on current abilities  
                    this.heroSelection.potionHandler.updateAlchemyBonuses(this.heroSelection);
                }
            }
        } else {
            // Initialize potion state if no saved data
            if (this.heroSelection.potionHandler) {
                this.heroSelection.potionHandler.reset();
                this.heroSelection.potionHandler.updateAlchemyBonuses(this.heroSelection);
            }
        }

        // Restore Hero effect states
        if (this.isHost && gameState.hostNicolasState) {
            if (this.heroSelection.nicolasEffectManager) {
                const nicolasRestored = this.heroSelection.nicolasEffectManager.importNicolasState(gameState.hostNicolasState);
            }
        } else if (!this.isHost && gameState.guestNicolasState) {
            if (this.heroSelection.nicolasEffectManager) {
                const nicolasRestored = this.heroSelection.nicolasEffectManager.importNicolasState(gameState.guestNicolasState);
            }
        } else {
            // Initialize Nicolas state if no saved data
            if (this.heroSelection.nicolasEffectManager) {
                this.heroSelection.nicolasEffectManager.reset();
            }
        }
        
        if (this.isHost && gameState.hostRiffelState) {
            if (this.heroSelection.riffelEffectManager) {
                const riffelRestored = this.heroSelection.riffelEffectManager.importRiffelState(gameState.hostRiffelState);
            }
        } else if (!this.isHost && gameState.guestRiffelState) {
            if (this.heroSelection.riffelEffectManager) {
                const riffelRestored = this.heroSelection.riffelEffectManager.importRiffelState(gameState.guestRiffelState);
            }
        } else {
            // Initialize Riffel state if no saved data
            if (this.heroSelection.riffelEffectManager) {
                this.heroSelection.riffelEffectManager.reset();
            }
        }

        if (this.isHost && gameState.hostVacarnState) {
            if (this.heroSelection.vacarnEffectManager) {
                const vacarnRestored = this.heroSelection.vacarnEffectManager.importVacarnState(gameState.hostVacarnState);
                if (vacarnRestored) {
                    // Log details about what was restored
                    const vacarnState = this.heroSelection.vacarnEffectManager.getState();
                    const buriedCount = Object.keys(vacarnState.buriedCreatures).length;
                    
                    // If there are buried creatures, process what they are
                    if (buriedCount > 0) {
                        Object.entries(vacarnState.buriedCreatures).forEach(([position, data]) => {
                            // Details available for processing if needed
                        });
                    }
                }
            }
        } else if (!this.isHost && gameState.guestVacarnState) {
            if (this.heroSelection.vacarnEffectManager) {
                const vacarnRestored = this.heroSelection.vacarnEffectManager.importVacarnState(gameState.guestVacarnState);
                if (vacarnRestored) {
                    // Log details about what was restored
                    const vacarnState = this.heroSelection.vacarnEffectManager.getState();
                    const buriedCount = Object.keys(vacarnState.buriedCreatures).length;
                    
                    // If there are buried creatures, process what they are
                    if (buriedCount > 0) {
                        Object.entries(vacarnState.buriedCreatures).forEach(([position, data]) => {
                            // Details available for processing if needed
                        });
                    }
                }
            }
        } else {
            // Initialize Vacarn state if no saved data
            if (this.heroSelection.vacarnEffectManager) {
                this.heroSelection.vacarnEffectManager.reset();
            }
        }
        if (this.isHost && gameState.hostSemiState) {
            if (this.heroSelection.semiEffectManager) {
                const semiRestored = this.heroSelection.semiEffectManager.importSemiState(gameState.hostSemiState);
            }
        } else if (!this.isHost && gameState.guestSemiState) {
            if (this.heroSelection.semiEffectManager) {
                const semiRestored = this.heroSelection.semiEffectManager.importSemiState(gameState.guestSemiState);
            }
        } else {
            // Initialize Semi state if no saved data
            if (this.heroSelection.semiEffectManager) {
                this.heroSelection.semiEffectManager.reset();
            }
        }        
        if (this.isHost && gameState.hostHeinzState) {
            if (this.heroSelection.heinzEffectManager) {
                const heinzRestored = this.heroSelection.heinzEffectManager.importHeinzState(gameState.hostHeinzState);
            }
        } else if (!this.isHost && gameState.guestHeinzState) {
            if (this.heroSelection.heinzEffectManager) {
                const heinzRestored = this.heroSelection.heinzEffectManager.importHeinzState(gameState.guestHeinzState);
            }
        } else {
            // Initialize Heinz state if no saved data
            if (this.heroSelection.heinzEffectManager) {
                this.heroSelection.heinzEffectManager.reset();
            }
        }
        if (this.isHost && gameState.hostKazenaState) {
            if (this.heroSelection.kazenaEffectManager) {
                const kazenaRestored = this.heroSelection.kazenaEffectManager.importKazenaState(gameState.hostKazenaState);
            }
        } else if (!this.isHost && gameState.guestKazenaState) {
            if (this.heroSelection.kazenaEffectManager) {
                const kazenaRestored = this.heroSelection.kazenaEffectManager.importKazenaState(gameState.guestKazenaState);
            }
        } else {
            // Initialize Kazena state if no saved data
            if (this.heroSelection.kazenaEffectManager) {
                this.heroSelection.kazenaEffectManager.reset();
            }
        }

        // Restore GraveWorm state
        if (this.isHost && gameState.hostGraveWormState) {
            if (this.heroSelection.graveWormCreature) {
                const graveWormRestored = this.heroSelection.graveWormCreature.importState(gameState.hostGraveWormState);
            }
        } else if (!this.isHost && gameState.guestGraveWormState) {
            if (this.heroSelection.graveWormCreature) {
                const graveWormRestored = this.heroSelection.graveWormCreature.importState(gameState.guestGraveWormState);
            }
        } else {
            // Initialize GraveWorm state if no saved data
            if (this.heroSelection.graveWormCreature) {
                this.heroSelection.graveWormCreature.reset();
            }
        }
        // Restore NimbleMonkee state
        if (this.isHost && gameState.hostNimbleMonkeeState) {
            if (this.heroSelection.nimbleMonkeeCreature) {
                const nimbleMonkeeRestored = this.heroSelection.nimbleMonkeeCreature.importState(gameState.hostNimbleMonkeeState);
            }
        } else if (!this.isHost && gameState.guestNimbleMonkeeState) {
            if (this.heroSelection.nimbleMonkeeCreature) {
                const nimbleMonkeeRestored = this.heroSelection.nimbleMonkeeCreature.importState(gameState.guestNimbleMonkeeState);
            }
        } else {
            // Initialize NimbleMonkee state if no saved data
            if (this.heroSelection.nimbleMonkeeCreature) {
                this.heroSelection.nimbleMonkeeCreature.reset();
            }
        }
        // Restore CriminalMonkee state
        if (this.isHost && gameState.hostCriminalMonkeeState) {
            if (this.heroSelection.criminalMonkeeCreature) {
                this.heroSelection.criminalMonkeeCreature.importState(gameState.hostCriminalMonkeeState);
            }
        } else if (!this.isHost && gameState.guestCriminalMonkeeState) {
            if (this.heroSelection.criminalMonkeeCreature) {
                this.heroSelection.criminalMonkeeCreature.importState(gameState.guestCriminalMonkeeState);
            }
        } else {
            // Initialize CriminalMonkee state if no saved data
            if (this.heroSelection.criminalMonkeeCreature) {
                this.heroSelection.criminalMonkeeCreature.reset();
            }
        }

        // Restore Abilities
        if (this.isHost && gameState.hostInventingState) {
            if (this.heroSelection.inventingAbility) {
                this.heroSelection.inventingAbility.importState(gameState.hostInventingState);
            }
        } else if (!this.isHost && gameState.guestInventingState) {
            if (this.heroSelection.inventingAbility) {
                this.heroSelection.inventingAbility.importState(gameState.guestInventingState);
            }
        } else {
            if (this.heroSelection.inventingAbility) {
                this.heroSelection.inventingAbility.reset();
            }
        }
        if (this.isHost && gameState.hostOccultismState) {
            if (this.heroSelection.occultismAbility) {
                this.heroSelection.occultismAbility.importState(gameState.hostOccultismState);
            }
        }
        else if (!this.isHost && gameState.guestOccultismState) {
            if (this.heroSelection.occultismAbility) {
                this.heroSelection.occultismAbility.importState(gameState.guestOccultismState);
            }
        } else {
            if (this.heroSelection.occultismAbility) {
                this.heroSelection.occultismAbility.reset();
            }
        }
        if (this.isHost && gameState.hostPremonitionState) {
            if (this.heroSelection.premonitionAbility) {
                await this.heroSelection.premonitionAbility.importState(gameState.hostPremonitionState, this.heroSelection);
            }
        } else if (!this.isHost && gameState.guestPremonitionState) {
            if (this.heroSelection.premonitionAbility) {
                await this.heroSelection.premonitionAbility.importState(gameState.guestPremonitionState, this.heroSelection);
            }
        } else {
            if (this.heroSelection.premonitionAbility) {
                this.heroSelection.premonitionAbility.reset();
            }
        }

        // ===== SPECIAL HANDLING FOR TURN-BASED EFFECTS DURING RECONNECTION =====
        // After restoring all states, check if any Vacarn creatures should be raised
        if (this.heroSelection.vacarnEffectManager) {
            const currentTurn = this.heroSelection.getCurrentTurn();
            
            // Process any buried creatures that should be raised
            await this.heroSelection.vacarnEffectManager.processStartOfTurn(this.heroSelection);
        }
    }

    isSingleplayerMode() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }
        const roomId = this.roomManager.getRoomRef().key;
        return roomId && roomId.startsWith('sp_');
    }

    // Restore opponent data
    restoreOpponentData(gameState) {
        // Skip opponent data restoration in singleplayer
        if (this.isSingleplayerMode()) {
            console.log('🎮 Singleplayer: Skipping opponent data restoration');
            return;
        }

        // Original multiplayer logic
        if (this.isHost && gameState.guestSelected) {
            this.heroSelection.opponentSelectedCharacter = gameState.guestSelected;
        } else if (!this.isHost && gameState.hostSelected) {
            this.heroSelection.opponentSelectedCharacter = gameState.hostSelected;
        }

        if (this.isHost && gameState.guestAbilitiesData) {
            this.heroSelection.opponentAbilitiesData = gameState.guestAbilitiesData;
        } else if (!this.isHost && gameState.hostAbilitiesData) {
            this.heroSelection.opponentAbilitiesData = gameState.hostAbilitiesData;
        }

        if (this.isHost && gameState.guestSpellbooksData) {
            this.heroSelection.opponentSpellbooksData = gameState.guestSpellbooksData;
        } else if (!this.isHost && gameState.hostSpellbooksData) {
            this.heroSelection.opponentSpellbooksData = gameState.hostSpellbooksData;
        }

        if (this.isHost && gameState.guestCreaturesData) {
            this.heroSelection.opponentCreaturesData = gameState.guestCreaturesData;
        } else if (!this.isHost && gameState.hostCreaturesData) {
            this.heroSelection.opponentCreaturesData = gameState.hostCreaturesData;
        }
    }

    // Singleplayer-specific battle reconnection
    async handleSingleplayerBattleReconnection(gameState) {
        this.reconnectionInProgress = true;

        const currentBattleState = await this.checkCurrentBattleState();
        
        if (currentBattleState.battleEnded || !currentBattleState.battleActive) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }

        let checkpointLoaded = false;
        let checkpointSystem = null;
        let checkpoint = null;
        
        try {
            const { getCheckpointSystem } = await import('./checkpointSystem.js');
            checkpointSystem = getCheckpointSystem();
            
            checkpointSystem.init(null, this.roomManager, this.isHost);
            checkpoint = await checkpointSystem.loadCheckpoint();
            
            if (checkpoint && checkpoint.formations) {
                const myFormation = checkpoint.formations.player;
                const aiFormation = checkpoint.formations.opponent;
                
                if (myFormation && this.heroSelection.formationManager) {
                    this.heroSelection.formationManager.battleFormation = myFormation;
                }
                
                if (aiFormation && this.heroSelection.formationManager) {
                    this.heroSelection.formationManager.opponentBattleFormation = aiFormation;
                }
                
                checkpointLoaded = true;
            }
        } catch (error) {
            // Could not load checkpoint
        }

        if (!this.heroSelection.opponentSelectedCharacter) {
            try {
                // Select and randomize one of the 3 computer teams
                const computerTeam = await selectComputerTeamForBattle(this.roomManager.getRoomRef());
                
                if (computerTeam) {
                    console.log('✅ Computer team loaded for battle');
                    
                    // Store the full team data for battle initialization
                    this.heroSelection.computerTeamData = computerTeam;
                    
                    // Set representative hero for opponent selection display
                    const formation = computerTeam.formation;
                    this.heroSelection.opponentSelectedCharacter = 
                        formation.left || formation.center || formation.right || {
                            id: 999,
                            name: 'AI Opponent',
                            image: './Cards/All/Alice.png',
                            filename: 'Alice.png'
                        };
                    
                    // Set opponent formation
                    this.heroSelection.formationManager.opponentBattleFormation = computerTeam.formation;
                    
                    // Set opponent abilities data
                    this.heroSelection.opponentAbilitiesData = computerTeam.abilities;
                    
                    // Set opponent spellbooks data
                    this.heroSelection.opponentSpellbooksData = computerTeam.spellbooks;
                    
                    // Set opponent creatures data
                    this.heroSelection.opponentCreaturesData = computerTeam.creatures;
                    
                    // Set opponent equipment (if your system supports it)
                    if (this.heroSelection.opponentEquipmentData !== undefined) {
                        this.heroSelection.opponentEquipmentData = computerTeam.equipment;
                    }
                    
                } else {
                    console.error('Failed to load computer team, using fallback');
                    // Fallback to default opponent
                    this.heroSelection.opponentSelectedCharacter = {
                        id: 999,
                        name: 'AI Opponent',
                        image: './Cards/All/Alice.png',
                        filename: 'Alice.png'
                    };
                }
            } catch (error) {
                console.error('Error loading computer team:', error);
                // Fallback to default opponent
                this.heroSelection.opponentSelectedCharacter = {
                    id: 999,
                    name: 'AI Opponent',
                    image: './Cards/All/Alice.png',
                    filename: 'Alice.png'
                };
            }
        }

        const battleInitialized = this.heroSelection.initBattleScreen();
        
        if (!battleInitialized) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }
        
        this.showBattleArena();

        if (this.heroSelection.battleScreen) {
            this.heroSelection.battleScreen.initializeSpeedControlUI();
        }

        if (checkpoint && checkpointSystem) {
            try {
                if (this.heroSelection.battleScreen && this.heroSelection.battleScreen.battleManager) {
                    checkpointSystem.init(
                        this.heroSelection.battleScreen.battleManager,
                        this.roomManager,
                        this.isHost
                    );
                    
                    this.heroSelection.battleScreen.battleManager.checkpointSystem = checkpointSystem;
                    
                    const restored = await checkpointSystem.restoreFromCheckpoint(checkpoint);
                    
                    if (restored) {
                        this.addCombatLog('Battle state restored!', 'success');
                        
                        const battleManager = this.heroSelection.battleScreen.battleManager;
                        battleManager.onBattleEnd = async (battleResult) => {
                            await this.heroSelection.setGamePhase('Reward');
                            
                            if (this.heroSelection.cardRewardManager && this.heroSelection.turnTracker) {
                                await this.heroSelection.cardRewardManager.showRewardsAfterBattle(
                                    this.heroSelection.turnTracker,
                                    this.heroSelection,
                                    battleResult
                                );
                            }
                        };
                        
                        this.heroSelection.stateMachine.transitionTo(
                            this.heroSelection.stateMachine.states.IN_BATTLE,
                            { source: 'singleplayer_checkpoint_restoration' }
                        );
                        
                        const battleManager2 = this.heroSelection.battleScreen.battleManager;
                        if (battleManager2 && battleManager2.battleActive && !battleManager2.checkBattleEnd()) {
                            setTimeout(() => {
                                battleManager2.flowManager.authoritative_battleLoop();
                            }, this.getSpeedAdjustedDelay(1000));
                        }
                        
                        this.completeReconnection();
                        return true;
                    }
                }
            } catch (error) {
                console.error('Checkpoint restoration failed:', error);
            }
        }

        const battleManager = this.heroSelection.battleScreen?.battleManager;
        
        if (battleManager) {
            battleManager.forceRefreshBattleState();
            
            battleManager.onBattleEnd = async (battleResult) => {
                await this.heroSelection.setGamePhase('Reward');
                
                if (this.heroSelection.cardRewardManager && this.heroSelection.turnTracker) {
                    await this.heroSelection.cardRewardManager.showRewardsAfterBattle(
                        this.heroSelection.turnTracker,
                        this.heroSelection,
                        battleResult
                    );
                }
            };
            
            this.addCombatLog('Restarting battle...', 'warning');
            
            await this.roomManager.getRoomRef().update({
                battleRestarted: true,
                battleRestartedAt: Date.now(),
                gamePhase: 'Battle',
                battleActive: true,
                battleStarted: true
            });
            
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.IN_BATTLE,
                { source: 'singleplayer_battle_restart' }
            );
            
            setTimeout(() => {
                this.heroSelection.battleScreen.startBattle();
            }, this.getSpeedAdjustedDelay(1000));
            
            this.completeReconnection();
            return true;
        }

        await this.setGamePhase('Formation');
        this.heroSelection.stateMachine.transitionTo(
            this.heroSelection.stateMachine.states.TEAM_BUILDING,
            { source: 'singleplayer_battle_reconnection_failed' }
        );
        
        this.reconnectionInProgress = false;
        return false;
    }

    // ===== SPECIFIC RECONNECTION HANDLERS =====

    // Handle battle reconnection
    async handleBattleReconnection(gameState) {
        console.log('[BATTLE RECON DEBUG] ========================================');
        console.log('[BATTLE RECON DEBUG] handleBattleReconnection() called');
        console.log('[BATTLE RECON DEBUG] Checking if singleplayer mode...');
        
        // Singleplayer mode: Skip all opponent-waiting logic
        if (this.isSingleplayerMode()) {
            console.log('[BATTLE RECON DEBUG] ✅ SINGLEPLAYER MODE DETECTED');
            console.log('[BATTLE RECON DEBUG] Delegating to handleSingleplayerBattleReconnection()');
            return await this.handleSingleplayerBattleReconnection(gameState);
        }
        
        console.log('[BATTLE RECON DEBUG] Multiplayer mode - continuing with standard reconnection');
        console.log('[BATTLE RECON DEBUG] ========================================');

        // Verify we have both characters selected before attempting battle reconnection
        if (!this.heroSelection.selectedCharacter || !this.heroSelection.opponentSelectedCharacter) {
            return await this.handleFormationReconnection(gameState);
        }

        // Double-check if battle has ended while we were reconnecting
        const currentBattleState = await this.checkCurrentBattleState();
        
        if (currentBattleState.battleEnded) {
            // Update the game state to reflect the current reality
            const updatedGameState = { ...gameState, gamePhase: 'Reward' };
            return await this.handleRewardReconnection(updatedGameState);
        }
        
        if (!currentBattleState.battleActive) {
            // Check if there are pending rewards
            const hasPendingRewards = await this.checkForPendingRewards();
            if (hasPendingRewards) {
                const updatedGameState = { ...gameState, gamePhase: 'Reward' };
                return await this.handleRewardReconnection(updatedGameState);
            } else {
                await this.setGamePhase('Formation');
                return await this.handleFormationReconnection(gameState);
            }
        }
        
        // Set reconnection in progress
        this.reconnectionInProgress = true;

        // Signal to host that we might be desynced
        if (this.heroSelection && this.heroSelection.battleScreen && this.heroSelection.battleScreen.battleManager) {
            const battleManager = this.heroSelection.battleScreen.battleManager;
            if (battleManager.networkManager) {
                battleManager.networkManager.signalDesyncToHost();
            }
        }

        // ============================================
        // STEP 1: Pre-load checkpoint to restore formations
        // ============================================
        
        let checkpointLoaded = false;
        let checkpointSystem = null;
        let checkpoint = null;
        
        try {
            const { getCheckpointSystem } = await import('./checkpointSystem.js');
            checkpointSystem = getCheckpointSystem();
            
            // Initialize checkpoint system with minimal setup
            checkpointSystem.init(null, this.roomManager, this.isHost);
            
            // Load the checkpoint
            checkpoint = await checkpointSystem.loadCheckpoint();
            
            if (checkpoint && checkpoint.formations) {
                // Restore formations to FormationManager BEFORE creating battle screen
                if (this.heroSelection.formationManager) {
                    // Determine which formations belong to us based on host/guest status
                    const myFormation = this.isHost ? checkpoint.formations.player : checkpoint.formations.opponent;
                    const theirFormation = this.isHost ? checkpoint.formations.opponent : checkpoint.formations.player;
                    
                    // Restore our formation
                    if (myFormation) {
                        this.heroSelection.formationManager.battleFormation = myFormation;
                    }
                    
                    // Restore opponent formation (need to align it properly)
                    if (theirFormation) {
                        // Opponent formation needs to be flipped for display
                        const alignedOpponent = this.heroSelection.formationManager.alignOpponentFormation(theirFormation);
                        this.heroSelection.formationManager.opponentBattleFormation = alignedOpponent;
                    }
                    
                    checkpointLoaded = true;
                }
                
                // Also restore abilities, spellbooks, creatures, and equipment to heroSelection managers
                if (checkpoint.abilities) {
                    const myAbilities = this.isHost ? checkpoint.abilities.player : checkpoint.abilities.opponent;
                    if (myAbilities && this.heroSelection.heroAbilitiesManager) {
                        this.heroSelection.heroAbilitiesManager.heroAbilities = myAbilities;
                    }
                }
                
                if (checkpoint.spellbooks) {
                    const mySpellbooks = this.isHost ? checkpoint.spellbooks.player : checkpoint.spellbooks.opponent;
                    if (mySpellbooks && this.heroSelection.heroSpellbookManager) {
                        this.heroSelection.heroSpellbookManager.heroSpellbooks = mySpellbooks;
                    }
                }
                
                if (checkpoint.creatures) {
                    const myCreatures = this.isHost ? checkpoint.creatures.player : checkpoint.creatures.opponent;
                    if (myCreatures && this.heroSelection.heroCreatureManager) {
                        this.heroSelection.heroCreatureManager.heroCreatures = myCreatures;
                    }
                }
                
                if (checkpoint.equipment) {
                    // Equipment will be restored at hero level during full checkpoint restoration
                }
            }
        } catch (error) {
            // Could not pre-load checkpoint
        }

        // ============================================
        // STEP 2: Fallback formation restoration from gameState
        // ============================================
        if (!checkpointLoaded) {
            // Try to restore from gameState as fallback
            const myFormation = this.isHost ? gameState.hostBattleFormation : gameState.guestBattleFormation;
            const theirFormation = this.isHost ? gameState.guestBattleFormation : gameState.hostBattleFormation;
            
            if (myFormation && this.heroSelection.formationManager) {
                this.heroSelection.formationManager.battleFormation = myFormation;
            }
            
            if (theirFormation && this.heroSelection.formationManager) {
                const alignedOpponent = this.heroSelection.formationManager.alignOpponentFormation(theirFormation);
                this.heroSelection.formationManager.opponentBattleFormation = alignedOpponent;
            }
        }

        // ============================================
        // STEP 3: Initialize Battle Screen with restored formations
        // ============================================
        
        // Now initialize battle screen - it will use the restored formations
        const battleInitialized = this.heroSelection.initBattleScreen();
        if (!battleInitialized) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }
        
        // Show battle arena - should now display heroes properly
        this.showBattleArena();

        // Initialize speed control UI after showing battle arena
        if (this.heroSelection.battleScreen) {
            const speedUISuccess = this.heroSelection.battleScreen.initializeSpeedControlUI();
            if (!speedUISuccess) {
                const battleCenter = document.getElementById('battleCenter');
                if (battleCenter) {
                    battleCenter.innerHTML = `
                        <div class="speed-control-error">
                            <p>Speed controls unavailable (reconnection)</p>
                            <p style="font-size: 12px; color: #aaa;">Reconnecting...</p>
                        </div>
                    `;
                }
            }
        }

        // ============================================
        // STEP 4: Complete checkpoint restoration
        // ============================================
        if (checkpoint && checkpointSystem) {
            try {
                // Re-initialize checkpoint system with the actual battle manager
                if (this.heroSelection.battleScreen && this.heroSelection.battleScreen.battleManager) {
                    checkpointSystem.init(
                        this.heroSelection.battleScreen.battleManager,
                        this.roomManager,
                        this.isHost
                    );
                    
                    // Set checkpoint system reference in battle manager
                    this.heroSelection.battleScreen.battleManager.checkpointSystem = checkpointSystem;
                    
                    // Restore from the already loaded checkpoint
                    const restored = await checkpointSystem.restoreFromCheckpoint(checkpoint);
                    
                    if (restored) {
                        // Add success message to combat log
                        this.addCombatLog('Battle state restored from checkpoint!', 'success');
                        
                        const checkpointInfo = checkpointSystem.getCheckpointInfo();
                        if (checkpointInfo) {
                            this.addCombatLog(
                                `Resumed from Turn ${checkpointInfo.turn} (${checkpointInfo.type})`, 
                                'info'
                            );
                        }
                        
                        // Sync abilities for tooltip display
                        if (this.heroSelection.battleScreen.syncAbilitiesFromBattleManager) {
                            this.heroSelection.battleScreen.syncAbilitiesFromBattleManager();
                        }
                        
                        // Handle host-specific reconnection tasks
                        if (this.isHost && this.heroSelection.battleScreen.battleManager.isAuthoritative) {
                            await this.handleHostCheckpointReconnection(this.heroSelection.battleScreen.battleManager);
                        }
                        
                        // Transition to IN_BATTLE state
                        this.heroSelection.stateMachine.transitionTo(
                            this.heroSelection.stateMachine.states.IN_BATTLE,
                            { source: 'checkpoint_restoration', restored: true }
                        );
                        
                        this.completeReconnection();
                        return true;
                    }
                }
            } catch (error) {
                // Error during full checkpoint restoration
            }
        }

        // ============================================
        // STEP 5: Fallback to legacy Firebase restoration
        // ============================================
        
        const reconnectionSuccess = await this.handleFirebaseBattleReconnection(gameState);
        
        if (reconnectionSuccess) {
            // Transition to IN_BATTLE state
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.IN_BATTLE,
                { source: 'legacy_restoration', restored: true }
            );
            
            this.completeReconnection();
            return true;
        }

        // ============================================
        // STEP 6: Final fallback - Restart battle
        // ============================================
        
        const battleManager = this.heroSelection.battleScreen?.battleManager;
        if (battleManager) {
            try {
                // Clear any corrupted state
                battleManager.forceRefreshBattleState();
                
                // Clear checkpoints and persistence
                if (checkpointSystem) {
                    await checkpointSystem.clearCheckpoint();
                }
                if (battleManager.persistenceManager) {
                    await battleManager.persistenceManager.clearBattleState();
                }
                
                // Mark battle as restarted
                await this.roomManager.getRoomRef().update({
                    battleRestarted: true,
                    battleRestartedAt: Date.now(),
                    gamePhase: 'Battle',
                    gamePhaseUpdated: Date.now(),
                    battleActive: true,
                    battleStarted: true,
                    battlePaused: false
                });
                
                this.addCombatLog('Battle restarting with fresh state...', 'warning');
                
                // Transition to IN_BATTLE state
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.IN_BATTLE,
                    { source: 'battle_restart', fresh: true }
                );
                
                // Start battle after delay
                setTimeout(() => {
                    this.heroSelection.battleScreen.startBattle();
                }, this.getSpeedAdjustedDelay(1000));
                
                this.completeReconnection();
                return true;
                
            } catch (error) {
                // Failed to restart battle
            }
        }

        // ============================================
        // STEP 7: Complete failure - Return to formation
        // ============================================
        
        await this.setGamePhase('Formation');
        
        // Transition back to team building
        this.heroSelection.stateMachine.transitionTo(
            this.heroSelection.stateMachine.states.TEAM_BUILDING,
            { source: 'battle_reconnection_failed' }
        );
        
        this.reconnectionInProgress = false;
        return false;
    }

    // Helper method for host-specific checkpoint reconnection tasks
    async handleHostCheckpointReconnection(battleManager) {
        // Check if battle was paused
        if (battleManager.battlePaused) {
            // Re-check opponent connection status
            const roomRef = this.roomManager.getRoomRef();
            if (roomRef) {
                try {
                    const snapshot = await roomRef.once('value');
                    const room = snapshot.val();
                    
                    if (room && room.guestOnline) {
                        await battleManager.resumeBattle('Host reconnected, guest is online');
                        
                        // Resume battle loop if needed
                        if (battleManager.battleActive && !battleManager.checkBattleEnd()) {
                            setTimeout(() => {
                                battleManager.flowManager.authoritative_battleLoop();
                            }, 1000);
                        }
                    } else {
                        this.addCombatLog('Waiting for opponent to reconnect...', 'warning');
                    }
                } catch (error) {
                    // Error checking guest status
                }
            }
        } else {
            // Battle wasn't paused - check if we need to resume the loop
            if (battleManager.battleActive && !battleManager.checkBattleEnd()) {
                const resyncSuccess = await battleManager.networkManager.resyncGuest();

                setTimeout(() => {
                    battleManager.flowManager.authoritative_battleLoop();
                }, 1000);
            }
        }
        
        // Mark host as reconnected
        await this.markPlayerReconnected();
    }

    // Check the current battle state to see if battle has ended
    async checkCurrentBattleState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return { battleActive: false, battleEnded: true };
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const gameStateSnapshot = await roomRef.child('gameState').once('value');
            const gameState = gameStateSnapshot.val();
            
            if (!gameState) {
                return { battleActive: false, battleEnded: true };
            }
            
            const battleActive = gameState.battleActive || false;
            const battleStarted = gameState.battleStarted || false;
            const gamePhase = gameState.gamePhase || 'Formation';
            
            const battleEnded = gamePhase === 'Reward' || 
                (battleStarted && !battleActive) ||
                (gameState.battleEndedAt && gamePhase !== 'Battle');
            
            const result = {
                battleActive,
                battleStarted,
                battleEnded,
                gamePhase
            };
            
            return result;
            
        } catch (error) {
            return { battleActive: false, battleEnded: true };
        }
    }

    // Check if there are pending rewards for the player
    async checkForPendingRewards() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const isHost = this.isHost;
            const rewardKey = isHost ? 'hostPendingRewards' : 'guestPendingRewards';
            
            const snapshot = await roomRef.child('gameState').child(rewardKey).once('value');
            const pendingRewards = snapshot.val();
            
            const hasRewards = pendingRewards && 
                            pendingRewards.rewards && 
                            pendingRewards.rewards.length > 0;
            
            return hasRewards;
            
        } catch (error) {
            return false;
        }
    }

    // Handle reward screen reconnection
    async handleRewardReconnection(gameState) {
        // Singleplayer: Ensure AI opponent is set
        if (this.isSingleplayerMode() && !this.heroSelection.opponentSelectedCharacter) {
            // Set AI opponent for singleplayer
            if (gameState.guestSelected) {
                this.heroSelection.opponentSelectedCharacter = gameState.guestSelected;
            } else {
                // Fallback: Create default AI opponent
                this.heroSelection.opponentSelectedCharacter = {
                    id: 999,
                    name: 'AI Opponent',
                    image: './Cards/All/Alice.png',
                    filename: 'Alice.png'
                };
            }
        }

        // Ensure we have the battle data needed for battle screen initialization
        if (!this.heroSelection.selectedCharacter || !this.heroSelection.opponentSelectedCharacter) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }

        // Get current formations for battle screen initialization
        const playerFormation = this.heroSelection.formationManager.getBattleFormation();
        const opponentFormation = this.heroSelection.formationManager.getOpponentBattleFormation();
        
        if (!playerFormation || !opponentFormation) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }

        // Initialize battle screen before showing rewards
        let battleSetupSuccess = false;
        
        try {
            // Try normal initialization
            battleSetupSuccess = this.heroSelection.initBattleScreen();
            
            if (battleSetupSuccess && this.heroSelection.battleScreen) {
                this.heroSelection.battleScreen.createBattleScreen();
                
                const battleArena = document.getElementById('battleArena');
                if (battleArena) {
                    battleArena.style.display = 'none';
                } else {
                    battleSetupSuccess = false;
                }
            }
        } catch (error) {
            battleSetupSuccess = false;
        }

        // Alternative manual setup if normal failed
        if (!battleSetupSuccess) {
            battleSetupSuccess = await this.setupBattleScreenForRewardReconnection();
        }

        // Last resort - direct battle arena creation
        if (!battleSetupSuccess) {
            try {
                const gameScreen = document.getElementById('gameScreen');
                if (gameScreen) {
                    let battleArena = document.getElementById('battleArena');
                    if (!battleArena) {
                        battleArena = document.createElement('div');
                        battleArena.id = 'battleArena';
                        battleArena.className = 'battle-arena';
                        battleArena.style.display = 'none';
                        battleArena.innerHTML = '<div class="battle-reconnection-placeholder"><h2>Battle Arena Ready</h2><p>Reconnected to post-battle state</p></div>';
                        gameScreen.appendChild(battleArena);
                        battleSetupSuccess = true;
                    }
                }
            } catch (error) {
                // Fallback failed
            }
        }

        if (!battleSetupSuccess) {
            await this.setGamePhase('Formation');
            return await this.handleFormationReconnection(gameState);
        }
        
        // Transition to viewing rewards state
        this.heroSelection.stateMachine.transitionTo(
            this.heroSelection.stateMachine.states.VIEWING_REWARDS,
            { source: 'reward_reconnection' }
        );
        
        // REMOVED: Don't trigger onSelectionComplete during reconnection
        // This was causing the initial hand draw to overwrite the restored hand
        
        this.heroSelection.stateInitialized = true;

        // Show reward screen immediately after UI settles
        setTimeout(async () => {
            const hasRewards = await this.heroSelection.cardRewardManager.checkAndRestorePendingRewards(this.heroSelection);
            if (!hasRewards) {
                // If no rewards found, switch back to formation mode
                await this.setGamePhase('Formation');
                
                // Transition back to team building
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.TEAM_BUILDING,
                    { source: 'no_rewards_found' }
                );
            }
        }, this.getSpeedAdjustedDelay(200));
        
        return true;
    }

    async setupBattleScreenForRewardReconnection() {
        try {
            // Ensure both characters are selected
            if (!this.heroSelection.selectedCharacter || !this.heroSelection.opponentSelectedCharacter) {
                return false;
            }
            
            // Get formations from the restored battle state instead of formation manager
            const restoredBattleState = await this.persistenceManager.loadBattleState();
            const playerFormation = this.isHost ? 
                restoredBattleState.hostFormation : 
                restoredBattleState.guestFormation;
            const opponentFormation = this.isHost ? 
                restoredBattleState.guestFormation : 
                restoredBattleState.hostFormation;
            
            if (!playerFormation || !opponentFormation) {
                return false;
            }
            
            // Import BattleScreen if needed
            if (!this.heroSelection.battleScreen) {
                const { BattleScreen } = await import('./battleScreen.js');
                this.heroSelection.battleScreen = new BattleScreen();
            }
            
            // Get all the battle data
            const playerAbilities = {
                left: this.heroSelection.heroAbilitiesManager.getHeroAbilities('left'),
                center: this.heroSelection.heroAbilitiesManager.getHeroAbilities('center'),
                right: this.heroSelection.heroAbilitiesManager.getHeroAbilities('right')
            };
            
            const playerSpellbooks = {
                left: this.heroSelection.heroSpellbookManager.getHeroSpellbook('left'),
                center: this.heroSelection.heroSpellbookManager.getHeroSpellbook('center'),
                right: this.heroSelection.heroSpellbookManager.getHeroSpellbook('right')
            };
            
            const playerCreatures = {
                left: this.heroSelection.heroCreatureManager.getHeroCreatures('left'),
                center: this.heroSelection.heroCreatureManager.getHeroCreatures('center'),
                right: this.heroSelection.heroCreatureManager.getHeroCreatures('right')
            };
            
            // Initialize with current data
            this.heroSelection.battleScreen.init(
                this.heroSelection.isHost,
                playerFormation,
                opponentFormation,
                this.heroSelection.gameDataSender,
                this.heroSelection.roomManager,
                this.heroSelection.lifeManager,
                this.heroSelection.goldManager,
                this.heroSelection.turnTracker,
                this.heroSelection.roomManager,
                playerAbilities,
                this.heroSelection.opponentAbilitiesData,
                playerSpellbooks,
                this.heroSelection.opponentSpellbooksData,
                this.heroSelection.actionManager,
                playerCreatures,
                this.heroSelection.opponentCreaturesData
            );
            
            // Create battle screen HTML
            this.heroSelection.battleScreen.createBattleScreen();
            
            // After initializing battle screen, restore final battle state if available
            const finalBattleState = await this.loadFinalBattleState();
            if (finalBattleState) {
                // Restore the battle state to show the end-of-battle situation
                if (this.heroSelection.battleScreen.battleManager) {
                    await this.heroSelection.battleScreen.battleManager.restoreFinalBattleState(finalBattleState);
                }
            }
            
            // Hide it initially
            const battleArena = document.getElementById('battleArena');
            if (battleArena) {
                battleArena.style.display = 'none';
                return true;
            } else {
                return false;
            }
            
        } catch (error) {
            return false;
        }
    }

    // Load final battle state from Firebase
    async loadFinalBattleState() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return null;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('gameState').child('finalBattleState').once('value');
            const finalState = snapshot.val();
            
            if (finalState && finalState.isFinalState) {
                return finalState;
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    // Handle formation screen reconnection
    async handleFormationReconnection(gameState) {
        // Singleplayer: Generate AI opponent if needed
        if (this.isSingleplayerMode()) {
            // Ensure we have an opponent character (AI)
            if (!this.heroSelection.opponentSelectedCharacter) {
                this.heroSelection.opponentSelectedCharacter = {
                    id: 999,
                    name: 'AI Opponent',
                    image: './Cards/All/Alice.png'
                };
            }
            
            // For singleplayer, we don't need to wait for character assignments
            // Just check if the player has selected their hero
            const hasPlayerSelected = this.heroSelection.selectedCharacter !== null;
            
            if (hasPlayerSelected) {
                // Player has selected - go to team building
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.TEAM_BUILDING,
                    { source: 'singleplayer_reconnection', hasSelection: true }
                );
                
                // Force UI update
                if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                    setTimeout(() => {
                        window.updateHeroSelectionUI();
                    }, 150);
                }
                
                this.heroSelection.stateInitialized = true;
                return true;
            } else {
                // Player hasn't selected yet - go to hero selection
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.SELECTING_HERO,
                    { source: 'singleplayer_reconnection', hasSelection: false }
                );
                
                this.heroSelection.stateInitialized = true;
                return true;
            }
        }
        
        if (this.isSingleplayerMode()) {
            const roomRef = this.roomManager.getRoomRef();
            
            // Check if computer teams exist
            const teamsExist = await computerTeamsExist(roomRef);
            
            // If player has a hero but computer teams don't exist, initialize them
            if (!teamsExist && this.heroSelection.selectedCharacter) {
                const playerHeroName = this.heroSelection.selectedCharacter.name;
                try {
                    await initializeComputerTeams(roomRef, playerHeroName);
                    console.log('✅ Computer teams initialized during reconnection');
                } catch (error) {
                    console.error('Failed to initialize computer teams during reconnection:', error);
                }
            }
        }
        

        // MULTIPLAYER MODE
        // Check if this is actually a fresh game (no characters assigned)
        const hasHostCharacters = gameState.hostCharacters && gameState.hostCharacters.length > 0;
        const hasGuestCharacters = gameState.guestCharacters && gameState.guestCharacters.length > 0;
        
        if (!hasHostCharacters || !hasGuestCharacters) {
            // Transition back to initializing for fresh game
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.INITIALIZING
            );
            
            // Trigger character selection generation
            const selectionStarted = await this.heroSelection.startSelection();
            if (!selectionStarted) {
                // Transition to error state on failure
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.ERROR,
                    { error: 'Failed to start character selection' }
                );
                return false;
            }
            
            // Update UI
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                window.updateHeroSelectionUI();
            }
            
            return true;
        }
        
        // We have character assignments - continue with reconnection
        
        // Determine if player has already selected a hero
        const hasPlayerSelected = this.isHost ? gameState.hostSelected : gameState.guestSelected;
        
        // Transition to appropriate state based on selection status
        if (hasPlayerSelected) {
            // Player has selected a hero - go to team building
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.TEAM_BUILDING,
                { source: 'reconnection', hasSelection: true }
            );
        } else {
            // Player hasn't selected yet - go to hero selection
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.SELECTING_HERO,
                { source: 'reconnection', hasSelection: false }
            );
        }

        // Check for active teleport state and restore if needed
        if (hasPlayerSelected && this.heroSelection.teleportState) {
            // Let teleport.js handle its own reconnection logic
            setTimeout(async () => {
                // Ensure teleport module is available
                if (window.teleportSpell) {
                    await window.teleportSpell.handleReconnection(this.heroSelection, this.getSpeedAdjustedDelay(500));
                } else {
                    // Try to import teleport module if not available
                    try {
                        const teleportModule = await import('./Spells/teleport.js');
                        if (typeof window !== 'undefined') {
                            window.teleportSpell = teleportModule.teleportSpell;
                        }
                        await window.teleportSpell.handleReconnection(this.heroSelection, this.getSpeedAdjustedDelay(500));
                    } catch (error) {
                        // Clear invalid state
                        this.heroSelection.teleportState = null;
                        this.heroSelection.saveGameState();
                    }
                }
            }, this.getSpeedAdjustedDelay(500));
        }


        // Clear battle ready states when returning to formation
        if (this.roomManager && this.roomManager.getRoomRef()) {
            const updateKey = this.isHost ? 'hostBattleReady' : 'guestBattleReady';
            await this.roomManager.getRoomRef().child('gameState').update({
                [updateKey]: false,
                [`${updateKey}Time`]: null
            });
        }
        
        this.heroSelection.stateInitialized = true;
        
        return true;
    }

    // ===== BATTLE RECONNECTION SPECIFIC METHODS =====

    // Handle Firebase battle reconnection
    async handleFirebaseBattleReconnection(gameState) {
        try {
            // Signal that we're reconnecting
            await this.signalReconnecting();
            
            // Add initial messages to combat log
            this.addCombatLog('Reconnecting to ongoing battle...', 'info');
            
            const battlePaused = gameState.battlePaused || false;
            if (battlePaused) {
                this.addCombatLog('Battle was paused when you disconnected', 'warning');
            }
            
            this.addCombatLog('Loading battle state from Firebase...', 'info');
            
            // Get the battle manager from the battle screen
            const battleManager = this.heroSelection.battleScreen?.battleManager;
            if (!battleManager) {
                return false;
            }

            // Check if battle manager has persistence support
            if (!battleManager.persistenceManager) {
                return false;
            }

            // Attempt to restore battle state from Firebase
            const restoredFromPersistence = await battleManager.restoreFromPersistence();
            
            if (restoredFromPersistence) {
                this.addCombatLog('Battle state restored from Firebase!', 'success');
                
                // NEW: Ensure abilities are synced for tooltip display
                const battleScreen = this.heroSelection.battleScreen;
                if (battleScreen && battleScreen.syncAbilitiesFromBattleManager) {
                    battleScreen.syncAbilitiesFromBattleManager();
                    this.addCombatLog('Opponent abilities synchronized for display', 'info');
                }
                
                // Verify the restored state is valid
                if (!battleManager.battleActive || battleManager.currentTurn === 0) {
                    this.addCombatLog('Battle state appears invalid, restarting...', 'warning');
                    return await this.fallbackRestartBattle();
                }
                
                // Handle different reconnection scenarios
                if (battleManager.battlePaused) {
                    this.addCombatLog('Battle is paused - waiting for opponent', 'warning');
                    this.addCombatLog('Battle will resume when connection is stable', 'info');
                } else {
                    this.addCombatLog('Battle continues from saved state...', 'info');
                }
                
                // Mark player as reconnected in Firebase
                await this.markPlayerReconnected();
                
                // Handle host vs guest reconnection
                if (this.isHost && battleManager.isAuthoritative) {
                    await this.handleHostReconnection(battleManager);
                }
                
                // Signal that we're ready to resume
                await this.signalReconnectionReady();
                
                return true;                
            } else {
                this.addCombatLog('No saved battle state found', 'warning');
                
                // Fallback: restart battle from beginning
                return await this.fallbackRestartBattle();
            }

        } catch (error) {
            // Clear reconnecting flag on error
            await this.clearReconnectingFlag();
            throw error;
        }
    }

    // Signal reconnecting (guest only)
    async signalReconnecting() {
        if (this.isHost) return; // Only guest needs to signal
        
        try {
            await this.roomManager.getRoomRef().update({
                guestReconnecting: true,
                guestReconnectingAt: Date.now()
            });
        } catch (error) {
            // Error signaling reconnection
        }
    }

    // Signal reconnection ready (guest only)
    async signalReconnectionReady() {
        if (this.isHost) return; // Only guest needs to signal
        
        try {
            // Clear reconnecting flag
            await this.roomManager.getRoomRef().update({
                guestReconnecting: false,
                guestReconnectionReady: Date.now()
            });
            
            // Send ready signal via P2P
            if (this.gameDataSender) {
                this.gameDataSender('battle_data', {
                    type: 'guest_reconnection_ready',
                    timestamp: Date.now()
                });
            }
            
            this.addCombatLog('Ready to resume battle!', 'success');
        } catch (error) {
            // Error signaling reconnection ready
        }
    }

    // Clear reconnecting flag
    async clearReconnectingFlag() {
        if (this.isHost) return;
        
        try {
            await this.roomManager.getRoomRef().update({
                guestReconnecting: false
            });
        } catch (error) {
            // Error clearing reconnecting flag
        }
    }

    // Handle host reconnection
    async handleHostReconnection(battleManager) {
    // Check if battle was paused due to host disconnection
    if (battleManager.battlePaused) {
        // Re-check opponent connection status
        const roomRef = this.roomManager.getRoomRef();
        if (roomRef) {
            try {
                const snapshot = await roomRef.once('value');
                const room = snapshot.val();
                
                if (room && room.guestOnline) {
                    await battleManager.resumeBattle('Host reconnected, guest is online');
                    
                    // Resume battle loop if needed
                    if (battleManager.battleActive && !battleManager.checkBattleEnd()) {
                        setTimeout(() => {
                            battleManager.authoritative_battleLoop();
                        }, 1000);
                    }
                } else {
                    this.addCombatLog('Guest is offline - battle remains paused', 'warning');
                }
            } catch (error) {
                    // Error checking guest status
                }
            }
        } else {
            // Battle wasn't paused - resume normal simulation            
            if (battleManager.battleActive && !battleManager.checkBattleEnd()) {
                setTimeout(() => {
                    battleManager.authoritative_battleLoop();
                }, 1000);
            }
        }
    }

    // Mark player as reconnected
    async markPlayerReconnected() {
        try {
            const roomRef = this.roomManager.getRoomRef();
            const updateData = {
                [`${this.isHost ? 'host' : 'guest'}ReconnectedAt`]: Date.now(),
                [`${this.isHost ? 'host' : 'guest'}Online`]: true,
                lastBattleReconnection: Date.now()
            };
            
            await roomRef.update(updateData);            
        } catch (error) {
            // Error marking player as reconnected
        }
    }

    // Fallback restart battle
    async fallbackRestartBattle() {
        this.addCombatLog('Restarting battle from beginning...', 'warning');
        
        try {
            // Get the battle manager
            const battleManager = this.heroSelection.battleScreen?.battleManager;
            if (!battleManager) {
                return false;
            }

            // Force refresh battle state to clean slate
            battleManager.forceRefreshBattleState();
            
            // Clear any existing battle state in Firebase
            if (battleManager.persistenceManager) {
                await battleManager.persistenceManager.clearBattleState();
            }
            
            // Mark battle as restarted in Firebase and set proper game phase
            await this.roomManager.getRoomRef().update({
                battleRestarted: true,
                battleRestartedAt: Date.now(),
                gamePhase: 'Battle',
                gamePhaseUpdated: Date.now(),
                battleActive: true,
                battleStarted: true,
                battlePaused: false
            });
            
            this.addCombatLog('Battle restarting with fresh state...', 'info');
            
            // Transition to IN_BATTLE state for fresh battle
            this.heroSelection.stateMachine.transitionTo(
                this.heroSelection.stateMachine.states.IN_BATTLE,
                { source: 'battle_restart', fresh: true }
            );
            
            // Start battle after short delay (speed-adjusted)
            setTimeout(() => {
                this.heroSelection.battleScreen.startBattle();
            }, this.getSpeedAdjustedDelay(1000));
            
            return true;
            
        } catch (error) {
            // Set game phase to Formation on complete failure
            try {
                await this.setGamePhase('Formation');
                
                // Transition to team building on failure
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.TEAM_BUILDING,
                    { source: 'battle_restart_failed', error: error.message }
                );
            } catch (updateError) {
                // Last resort - transition to error state
                this.heroSelection.stateMachine.transitionTo(
                    this.heroSelection.stateMachine.states.ERROR,
                    { source: 'battle_restart_critical_failure', error: updateError.message }
                );
            }
            
            return false;
        }
    }

    // ===== UTILITY METHODS =====

    // Check if battle state exists in Firebase
    async checkBattleStateExists() {
        try {
            const roomRef = this.roomManager.getRoomRef();
            const battleStateSnapshot = await roomRef.child('battleState').once('value');
            const exists = battleStateSnapshot.exists();
            
            if (exists) {
                // Additional validation - check if it has basic required fields
                const battleState = battleStateSnapshot.val();
                const hasRequiredFields = battleState.battleActive !== undefined && 
                                        battleState.currentTurn !== undefined &&
                                        battleState.hostHeroes !== undefined &&
                                        battleState.guestHeroes !== undefined;
                                        
                if (!hasRequiredFields) {
                    return false;
                }
            }
            
            return exists;
        } catch (error) {
            return false;
        }
    }

    // Get battle state metadata from Firebase
    async getBattleStateMetadata() {
        try {
            const roomRef = this.roomManager.getRoomRef();
            const battleStateSnapshot = await roomRef.child('battleState').once('value');
            const battleState = battleStateSnapshot.val();
            
            if (battleState) {
                return {
                    exists: true,
                    lastUpdatedBy: battleState.lastUpdatedBy,
                    lastUpdatedAt: battleState.lastUpdatedAt,
                    currentTurn: battleState.currentTurn,
                    version: battleState.version,
                    battlePaused: battleState.connectionState?.battlePaused || false,
                    pauseReason: battleState.connectionState?.battlePaused ? 'Connection issue' : null
                };
            } else {
                return { exists: false };
            }
        } catch (error) {
            return { exists: false, error: error.message };
        }
    }

    // Show battle arena
    showBattleArena() {
        // Only show battle arena if we're in appropriate state
        const validStates = [
            this.heroSelection.stateMachine.states.TRANSITIONING_TO_BATTLE,
            this.heroSelection.stateMachine.states.IN_BATTLE,
            this.heroSelection.stateMachine.states.RECONNECTING,
            this.heroSelection.stateMachine.states.VIEWING_REWARDS
        ];
        
        const currentState = this.heroSelection.stateMachine.getState();
        
        if (!this.heroSelection.stateMachine.isInAnyState(validStates)) {
            return;
        }
        
        const heroSelectionScreen = document.querySelector('.hero-selection-screen');
        if (heroSelectionScreen) {
            heroSelectionScreen.style.display = 'none';
        }
        
        if (!this.heroSelection.battleScreen) {
            return;
        }
        
        this.heroSelection.battleScreen.showBattleArena();
    }

    // Add message to combat log
    addCombatLog(message, type = 'info') {
        if (this.heroSelection.battleScreen) {
            this.heroSelection.battleScreen.addCombatLogMessage(message, type);
        }
    }

    // Complete reconnection
    completeReconnection() {
        this.reconnectionInProgress = false;
        this.reconnectionAttempts = 0;
                
        // Update state machine context to indicate reconnection is complete
        if (this.heroSelection && this.heroSelection.stateMachine) {
            this.heroSelection.stateMachine.updateContext({
                reconnectionComplete: true,
                reconnectionTime: Date.now()
            });
        }
    }

    // ===== CLEANUP AND RESET =====

    // Cleanup method
    cleanup() {
        this.reconnectionInProgress = false;
        this.reconnectionAttempts = 0;
        
        // Clear reconnecting flag if we're guest
        if (!this.isHost) {
            this.clearReconnectingFlag();
        }
        
        // Clear handshake timeout
        if (this.reconnectionHandshakeTimeout) {
            clearTimeout(this.reconnectionHandshakeTimeout);
            this.reconnectionHandshakeTimeout = null;
        }
        
        // Clear any state machine context related to reconnection
        if (this.heroSelection && this.heroSelection.stateMachine) {
            this.heroSelection.stateMachine.updateContext({
                reconnecting: false,
                reconnectionComplete: false
            });
        }
    }

    async getBattleStateFromFirebase() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return null;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const snapshot = await roomRef.child('battleState').once('value');
            return snapshot.val();
        } catch (error) {
            return null;
        }
    }

    // Reset for new game
    reset() {
        this.cleanup();
    }

    getSpeedAdjustedDelay(ms) {
        // Try to get speed from battle manager if available
        if (this.heroSelection && this.heroSelection.battleScreen && this.heroSelection.battleScreen.battleManager) {
            const battleManager = this.heroSelection.battleScreen.battleManager;
            if (battleManager.speedManager) {
                return battleManager.speedManager.calculateAdjustedDelay(ms);
            } else if (battleManager.battleSpeed) {
                return Math.max(1, Math.floor(ms / battleManager.battleSpeed));
            }
        }
        // Fallback to normal delay if no speed manager available
        return ms;
    }
}