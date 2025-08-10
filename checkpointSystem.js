// checkpointSystem.js - Complete Battle State Checkpoint System
// Handles atomic battle state snapshots for robust reconnection and persistence
// UPDATED: Fixed equipment dual-storage issue

import { Hero } from './hero.js';

export class CheckpointSystem {
    constructor() {
        this.currentCheckpoint = null;
        this.previousCheckpoint = null; // Fallback
        this.checkpointVersion = '2.0.1'; // Updated version for equipment fix
        this.isEnabled = true;
        this.roomManager = null;
        this.isHost = false;
        
        // Checkpoint timing control
        this.lastCheckpointTime = 0;
        this.minCheckpointInterval = 100; // ms
        
        console.log('🔄 CheckpointSystem initialized v' + this.checkpointVersion);
    }

    // Initialize with battle context
    init(battleManager, roomManager, isHost) {
        this.battleManager = battleManager;
        this.roomManager = roomManager;
        this.isHost = isHost;
        
        console.log(`📍 CheckpointSystem initialized for ${isHost ? 'HOST' : 'GUEST'}`);
    }

    // ============================================
    // CHECKPOINT CREATION
    // ============================================

    /**
     * Create a complete checkpoint of current battle state
     * @param {string} checkpointType - 'battle_start', 'turn_end', 'effects_complete', 'battle_end'
     * @returns {Object} Complete checkpoint data
     */
    createCheckpoint(checkpointType = 'manual') {
        if (!this.battleManager || !this.battleManager.battleActive) {
            return null;
        }

        try {
            const checkpoint = {
                // Metadata
                version: this.checkpointVersion,
                timestamp: Date.now(),
                checkpointType: checkpointType,
                turnNumber: this.battleManager.currentTurn,
                isHost: this.isHost,
                
                // Core Battle State
                battleState: {
                    battleActive: this.battleManager.battleActive,
                    currentTurn: this.battleManager.currentTurn,
                    turnInProgress: this.battleManager.turnInProgress,
                    totalDamageDealt: { ...this.battleManager.totalDamageDealt },
                },
                
                // Heroes - Complete state for both sides
                heroes: this.captureAllHeroStates(),
                
                // Formations
                formations: this.captureFormations(),
                
                // Abilities, Spells, Creatures, Equipment
                abilities: this.captureAbilities(),
                spellbooks: this.captureSpellbooks(),
                creatures: this.captureCreatures(),
                equipment: this.captureEquipment(),
                
                // Random State - CRITICAL for determinism
                randomState: this.captureRandomState(),
                
                // Manager States
                managerStates: this.captureManagerStates(),
                
                // Battle Log (last 100 entries for context)
                battleLog: this.captureBattleLog(),
                
                // Network/Speed State
                networkState: this.captureNetworkState(),
                
                // Extended State
                extendedState: this.captureExtendedState()
            };
            
            // Calculate hash for validation
            checkpoint.stateHash = this.calculateStateHash(checkpoint);
            
            return checkpoint;
            
        } catch (error) {
            console.error('❌ Error creating checkpoint:', error);
            return null;
        }
    }

    // ============================================
    // STATE CAPTURE METHODS
    // ============================================

    captureAllHeroStates() {
        const heroStates = {
            player: {},
            opponent: {}
        };
        
        ['left', 'center', 'right'].forEach(position => {
            // Player heroes
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero) {
                heroStates.player[position] = this.captureHeroState(playerHero);
            }
            
            // Opponent heroes
            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero) {
                heroStates.opponent[position] = this.captureHeroState(opponentHero);
            }
        });
        
        return heroStates;
    }

    captureHeroState(hero) {
        return {
            // Identity
            id: hero.id,
            name: hero.name,
            image: hero.image,
            
            // Combat stats
            currentHp: hero.currentHp,
            maxHp: hero.maxHp,
            baseHp: hero.baseHp,
            atk: hero.atk,
            baseAtk: hero.baseAtk,
            alive: hero.alive,
            
            // Position info
            position: hero.position,
            side: hero.side,
            absoluteSide: hero.absoluteSide,
            
            // Abilities state
            abilities: hero.abilities ? JSON.parse(JSON.stringify(hero.abilities)) : {},
            abilityStacks: hero.abilityStacks || {},
            
            // Spells state
            spells: hero.spells ? JSON.parse(JSON.stringify(hero.spells)) : [],
            spellCooldowns: hero.spellCooldowns || {},
            
            // Creatures array WITH positions
            creatures: hero.creatures ? hero.creatures.map((creature, index) => ({
                ...this.captureCreatureState(creature),
                arrayIndex: index
            })) : [],
            
            // Equipment - NOW CAPTURED AT HERO LEVEL ONLY
            equipment: hero.equipment ? JSON.parse(JSON.stringify(hero.equipment)) : [],
            
            // Status effects
            statusEffects: hero.statusEffects ? JSON.parse(JSON.stringify(hero.statusEffects)) : [],
            
            // Temporary modifiers
            temporaryModifiers: hero.temporaryModifiers || {},
            
            // Special states
            necromancyStacks: hero.necromancyStacks || 0,
            maxNecromancyStacks: hero.maxNecromancyStacks || 0,
            
            // Any custom properties
            customStats: hero.customStats || {},
            combatHistory: hero.combatHistory || []
        };
    }

    captureCreatureState(creature) {
        return {
            name: creature.name,
            image: creature.image,
            currentHp: creature.currentHp,
            maxHp: creature.maxHp,
            atk: creature.atk,
            alive: creature.alive,
            type: creature.type || 'creature',
            statusEffects: creature.statusEffects || [],
            temporaryModifiers: creature.temporaryModifiers || {},
            createdAt: creature.createdAt,
            lastDamaged: creature.lastDamaged
        };
    }

    captureFormations() {
        return {
            player: JSON.parse(JSON.stringify(this.battleManager.playerFormation || {})),
            opponent: JSON.parse(JSON.stringify(this.battleManager.opponentFormation || {}))
        };
    }

    captureAbilities() {
        return {
            player: JSON.parse(JSON.stringify(this.battleManager.playerAbilities || {})),
            opponent: JSON.parse(JSON.stringify(this.battleManager.opponentAbilities || {}))
        };
    }

    captureSpellbooks() {
        return {
            player: JSON.parse(JSON.stringify(this.battleManager.playerSpellbooks || {})),
            opponent: JSON.parse(JSON.stringify(this.battleManager.opponentSpellbooks || {}))
        };
    }

    captureCreatures() {
        return {
            player: JSON.parse(JSON.stringify(this.battleManager.playerCreatures || {})),
            opponent: JSON.parse(JSON.stringify(this.battleManager.opponentCreatures || {}))
        };
    }

    captureEquipment() {
        // FIXED: Equipment is now stored at hero level only
        // Return empty objects for backward compatibility
        console.log('📋 Equipment capture skipped - using hero-level storage only');
        return {
            player: {},
            opponent: {}
        };
    }

    captureRandomState() {
        if (!this.battleManager.randomnessManager) {
            return null;
        }
        
        return this.battleManager.randomnessManager.exportState();
    }

    captureManagerStates() {
        const states = {};
        
        // Spell System State
        if (this.battleManager.spellSystem) {
            states.spellSystem = this.battleManager.spellSystem.exportState ? 
                this.battleManager.spellSystem.exportState() : {};
        }
        
        // Status Effects State
        if (this.battleManager.statusEffectsManager) {
            states.statusEffects = this.battleManager.statusEffectsManager.exportStatusEffectsState ?
                this.battleManager.statusEffectsManager.exportStatusEffectsState() : {};
        }
        
        // Kill Tracker State
        if (this.battleManager.killTracker) {
            states.killTracker = this.battleManager.killTracker.exportState ?
                this.battleManager.killTracker.exportState() : {};
        }
        
        // Attack Effects State
        if (this.battleManager.attackEffectsManager) {
            states.attackEffects = {
                // Capture any persistent attack effect states
            };
        }
        
        // Speed Manager State
        if (this.battleManager.speedManager) {
            states.speedManager = {
                currentSpeed: this.battleManager.speedManager.currentSpeed || 1,
                speedLocked: this.battleManager.speedManager.speedLocked || false
            };
        }
        
        return states;
    }

    captureBattleLog() {
        let battleLogData = [];
        
        // Try to get from BattleScreen's BattleLog first
        if (this.battleManager.battleScreen && this.battleManager.battleScreen.battleLog) {
            if (this.battleManager.battleScreen.battleLog.exportState) {
                const exported = this.battleManager.battleScreen.battleLog.exportState();
                if (exported && exported.messages) {
                    battleLogData = exported.messages;
                }
            }
        }
        
        // Fallback to legacy array if nothing found
        if (battleLogData.length === 0 && this.battleManager.battleLog && Array.isArray(this.battleManager.battleLog)) {
            battleLogData = this.battleManager.battleLog.slice(-100);
        }
        
        // Always return an array
        return Array.isArray(battleLogData) ? battleLogData : [];
    }

    captureNetworkState() {
        if (!this.battleManager.networkManager) {
            return {};
        }
        
        return {
            opponentConnected: this.battleManager.networkManager.opponentConnected,
            battlePaused: this.battleManager.networkManager.battlePaused,
            guestReconnecting: this.battleManager.networkManager.guestReconnecting
        };
    }

    captureExtendedState() {
        return {
            globalEffects: JSON.parse(JSON.stringify(this.battleManager.globalEffects || [])),
            heroEffects: JSON.parse(JSON.stringify(this.battleManager.heroEffects || {})),
            fieldEffects: JSON.parse(JSON.stringify(this.battleManager.fieldEffects || [])),
            abilitiesUsed: JSON.parse(JSON.stringify(this.battleManager.abilitiesUsed || {})),
            weatherEffects: this.battleManager.weatherEffects,
            terrainModifiers: JSON.parse(JSON.stringify(this.battleManager.terrainModifiers || [])),
            specialRules: JSON.parse(JSON.stringify(this.battleManager.specialRules || []))
        };
    }

    // ============================================
    // CHECKPOINT SAVING
    // ============================================

    /**
     * Save checkpoint to Firebase
     * @param {string} checkpointType - Type of checkpoint
     * @returns {boolean} Success status
     */
    async saveCheckpoint(checkpointType = 'manual') {
        // Throttle saves
        const now = Date.now();
        if (now - this.lastCheckpointTime < this.minCheckpointInterval) {
            return false;
        }
        
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            console.warn('⚠️ Cannot save checkpoint - no room reference');
            return false;
        }
        
        try {
            // Create checkpoint
            const checkpoint = this.createCheckpoint(checkpointType);
            if (!checkpoint) {
                console.warn('⚠️ Failed to create checkpoint');
                return false;
            }
            
            // Store as current and move current to previous
            this.previousCheckpoint = this.currentCheckpoint;
            this.currentCheckpoint = checkpoint;
            this.lastCheckpointTime = now;
            
            // Save to Firebase
            const roomRef = this.roomManager.getRoomRef();
            const checkpointRef = roomRef.child('battleCheckpoint');
            
            await checkpointRef.set(this.sanitizeForFirebase(checkpoint));
            
            // Also mark that we have a checkpoint
            await roomRef.child('gameState').update({
                hasCheckpoint: true,
                lastCheckpointTime: now,
                checkpointTurn: checkpoint.turnNumber,
                checkpointType: checkpointType
            });
            
            console.log(`✅ Checkpoint saved (${checkpointType}) at turn ${checkpoint.turnNumber}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error saving checkpoint:', error);
            return false;
        }
    }

    // ============================================
    // CHECKPOINT LOADING
    // ============================================

    /**
     * Load checkpoint from Firebase
     * @returns {Object|null} Checkpoint data or null
     */
    async loadCheckpoint() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            console.warn('⚠️ Cannot load checkpoint - no room reference');
            return null;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const checkpointRef = roomRef.child('battleCheckpoint');
            const snapshot = await checkpointRef.once('value');
            const checkpoint = snapshot.val();
            
            if (!checkpoint) {
                console.log('📍 No checkpoint found in Firebase');
                return null;
            }
            
            // Validate checkpoint
            if (!this.validateCheckpoint(checkpoint)) {
                console.warn('⚠️ Invalid checkpoint data');
                return null;
            }
            
            console.log(`📥 Loaded checkpoint from turn ${checkpoint.turnNumber} (${checkpoint.checkpointType})`);
            return checkpoint;
            
        } catch (error) {
            console.error('❌ Error loading checkpoint:', error);
            return null;
        }
    }

    // ============================================
    // CHECKPOINT RESTORATION
    // ============================================

    /**
     * Restore battle state from checkpoint
     * @param {Object} checkpoint - Checkpoint to restore from
     * @returns {boolean} Success status
     */
    async restoreFromCheckpoint(checkpoint) {
        if (!checkpoint || !this.battleManager) {
            console.error('❌ Cannot restore - missing checkpoint or battleManager');
            return false;
        }
        
        try {
            console.log(`🔄 Restoring from checkpoint (turn ${checkpoint.turnNumber})...`);
            
            // 1. Restore core battle state
            this.restoreBattleState(checkpoint.battleState);
            
            // 2. Restore formations
            this.restoreFormations(checkpoint.formations);
            
            // 3. Restore abilities, spellbooks, creatures, equipment
            this.restoreAbilities(checkpoint.abilities);
            this.restoreSpellbooks(checkpoint.spellbooks);
            this.restoreCreatures(checkpoint.creatures);
            this.restoreEquipment(checkpoint.equipment);
            
            // 4. Restore all heroes with complete state
            this.restoreAllHeroes(checkpoint.heroes);

            // Reinitialize kill tracker data structure for current perspective
            if (this.battleManager.killTracker) {
                // Force reinitialize the kill tracking structure
                this.battleManager.killTracker.reset();
                this.battleManager.killTracker.init(this.battleManager);
                console.log('🔄 Kill tracker reset and reinitialized after perspective swap');
            }
            
            // 5. Restore random state for determinism
            this.restoreRandomState(checkpoint.randomState);
            
            // 6. Restore manager states
            this.restoreManagerStates(checkpoint.managerStates);
            
            // 7. Restore battle log
            this.restoreBattleLog(checkpoint.battleLog);
            
            // 8. Restore extended state
            this.restoreExtendedState(checkpoint.extendedState);
            
            // 9. Update all visuals
            this.updateAllVisuals();
            
            // Store this as current checkpoint
            this.currentCheckpoint = checkpoint;
            
            console.log(`✅ Successfully restored from checkpoint (turn ${checkpoint.turnNumber})`);
            
            // Add restoration message to combat log
            this.battleManager.addCombatLog(
                `📍 Battle restored from checkpoint (Turn ${checkpoint.turnNumber})`,
                'system'
            );
            
            return true;
            
        } catch (error) {
            console.error('❌ Error restoring from checkpoint:', error);
            
            // Try fallback to previous checkpoint if available
            if (this.previousCheckpoint && checkpoint !== this.previousCheckpoint) {
                console.log('🔄 Attempting fallback to previous checkpoint...');
                return this.restoreFromCheckpoint(this.previousCheckpoint);
            }
            
            return false;
        }
    }

    // ============================================
    // RESTORATION METHODS
    // ============================================

    restoreBattleState(battleState) {
        if (!battleState) return;
        
        this.battleManager.battleActive = battleState.battleActive;
        this.battleManager.currentTurn = battleState.currentTurn;
        this.battleManager.turnInProgress = battleState.turnInProgress || false;
        this.battleManager.totalDamageDealt = battleState.totalDamageDealt || {};
        
        // IMPORTANT: Initialize battleLog as empty array before restoration
        this.battleManager.battleLog = [];
    }

    restoreFormations(formations) {
        if (!formations) return;
        
        // For guests, swap player and opponent data
        let playerFormation, opponentFormation;
        if (this.isHost) {
            playerFormation = formations.player || {};
            opponentFormation = formations.opponent || {};
        } else {
            // GUEST: Swap the formations since checkpoint was saved from host perspective
            playerFormation = formations.opponent || {};  // Guest's actual formation
            opponentFormation = formations.player || {};   // Host's formation (guest's opponent)
        }
        
        // Restore to battle manager
        this.battleManager.playerFormation = playerFormation;
        this.battleManager.opponentFormation = opponentFormation;
        
        // CRITICAL: Also update the battle screen's references
        if (this.battleManager.battleScreen) {
            this.battleManager.battleScreen.playerFormation = playerFormation;
            this.battleManager.battleScreen.opponentFormation = opponentFormation;
        }
        
        // CRITICAL: Update FormationManager so it stays in sync
        if (window.heroSelection && window.heroSelection.formationManager) {
            const formationManager = window.heroSelection.formationManager;
            
            // Restore player formation
            if (playerFormation) {
                formationManager.battleFormation = playerFormation;
            }
            
            // Restore opponent formation (need to reverse the alignment for opponent)
            if (opponentFormation) {
                // For opponent, we need to flip the alignment
                const alignedOpponent = {
                    left: opponentFormation.right,
                    center: opponentFormation.center,
                    right: opponentFormation.left
                };
                formationManager.opponentBattleFormation = alignedOpponent;
            }
            
            console.log('✅ FormationManager updated with restored formations');
        }
    }

    restoreAbilities(abilities) {
        if (!abilities) return;
        
        // For guests, swap player and opponent data
        if (this.isHost) {
            this.battleManager.playerAbilities = abilities.player || {};
            this.battleManager.opponentAbilities = abilities.opponent || {};
        } else {
            // GUEST: Swap the abilities since checkpoint was saved from host perspective
            this.battleManager.playerAbilities = abilities.opponent || {};  // Guest's actual abilities
            this.battleManager.opponentAbilities = abilities.player || {};   // Host's abilities (guest's opponent)
        }
    }

    restoreSpellbooks(spellbooks) {
        if (!spellbooks) return;
        
        // For guests, swap player and opponent data
        if (this.isHost) {
            this.battleManager.playerSpellbooks = spellbooks.player || {};
            this.battleManager.opponentSpellbooks = spellbooks.opponent || {};
        } else {
            // GUEST: Swap the spellbooks since checkpoint was saved from host perspective
            this.battleManager.playerSpellbooks = spellbooks.opponent || {};  // Guest's actual spellbooks
            this.battleManager.opponentSpellbooks = spellbooks.player || {};   // Host's spellbooks (guest's opponent)
        }
    }

    restoreCreatures(creatures) {
        if (!creatures) return;
        
        // For guests, swap player and opponent data
        if (this.isHost) {
            this.battleManager.playerCreatures = creatures.player || {};
            this.battleManager.opponentCreatures = creatures.opponent || {};
        } else {
            // GUEST: Swap the creatures since checkpoint was saved from host perspective
            this.battleManager.playerCreatures = creatures.opponent || {};  // Guest's actual creatures
            this.battleManager.opponentCreatures = creatures.player || {};   // Host's creatures (guest's opponent)
        }
    }

    restoreEquipment(equipment) {
        // FIXED: Equipment restoration now handled at hero level only
        if (!equipment) return;
        
        // Log but don't actually restore anything at manager level
        console.log('📋 Manager-level equipment restoration skipped - heroes handle their own equipment');
        
        // Clear any existing manager-level equipment to avoid conflicts
        if (this.battleManager) {
            this.battleManager.playerEquips = {};
            this.battleManager.opponentEquips = {};
        }
    }

    restoreAllHeroes(heroStates) {
        if (!heroStates) return;
        
        // Clear existing heroes first
        this.battleManager.playerHeroes = {};
        this.battleManager.opponentHeroes = {};
        
        // For guests, swap player and opponent data
        let playerHeroes, opponentHeroes;
        if (this.isHost) {
            playerHeroes = heroStates.player || {};
            opponentHeroes = heroStates.opponent || {};
        } else {
            // GUEST: Swap the hero states since checkpoint was saved from host perspective
            playerHeroes = heroStates.opponent || {};  // Guest's actual heroes
            opponentHeroes = heroStates.player || {};   // Host's heroes (guest's opponents)
        }
        
        // Restore player heroes
        ['left', 'center', 'right'].forEach(position => {
            if (playerHeroes[position]) {
                const hero = this.restoreHero(playerHeroes[position]);
                // CRITICAL: Update the side property to match the new perspective
                hero.side = 'player';
                this.battleManager.playerHeroes[position] = hero;
            }
            
            if (opponentHeroes[position]) {
                const hero = this.restoreHero(opponentHeroes[position]);
                // CRITICAL: Update the side property to match the new perspective  
                hero.side = 'opponent';
                this.battleManager.opponentHeroes[position] = hero;
            }
        });
        
        // CRITICAL: Reinitialize kill tracker for the new perspective
        if (this.battleManager.killTracker) {
            this.battleManager.killTracker.initializeKillTracking();
            console.log('🔄 Kill tracker reinitialized for perspective swap');
        }
        
        // CRITICAL: Clear manager-level equipment after hero restoration
        this.battleManager.playerEquips = {};
        this.battleManager.opponentEquips = {};
        console.log('📋 Cleared manager-level equipment to prevent conflicts');
    }

    restoreHero(heroState) {
        // Create hero from saved state using the imported Hero class
        const hero = Hero.fromSavedState(heroState);
        
        // Ensure all properties are restored
        hero.abilities = heroState.abilities || {};
        hero.spells = heroState.spells || [];
        hero.equipment = heroState.equipment || [];
        hero.creatures = heroState.creatures || [];
        hero.statusEffects = heroState.statusEffects || [];
        hero.temporaryModifiers = heroState.temporaryModifiers || {};
        hero.necromancyStacks = heroState.necromancyStacks || 0;
        hero.maxNecromancyStacks = heroState.maxNecromancyStacks || 0;
        
        return hero;
    }

    restoreRandomState(randomState) {
        if (!randomState || !this.battleManager.randomnessManager) return;
        
        this.battleManager.randomnessManager.importState(randomState);
        console.log('🎲 Random state restored');
    }

    restoreManagerStates(managerStates) {
        if (!managerStates) return;
        
        // Restore spell system
        if (managerStates.spellSystem && this.battleManager.spellSystem) {
            if (this.battleManager.spellSystem.importState) {
                this.battleManager.spellSystem.importState(managerStates.spellSystem);
            }
        }
        
        // Restore status effects
        if (managerStates.statusEffects && this.battleManager.statusEffectsManager) {
            if (this.battleManager.statusEffectsManager.importStatusEffectsState) {
                this.battleManager.statusEffectsManager.importStatusEffectsState(managerStates.statusEffects);
            }
        }
        
        // Restore kill tracker
        if (managerStates.killTracker && this.battleManager.killTracker) {
            if (this.battleManager.killTracker.importState) {
                this.battleManager.killTracker.importState(managerStates.killTracker);
            }
        }
        
        // Restore speed settings
        if (managerStates.speedManager && this.battleManager.speedManager) {
            this.battleManager.speedManager.currentSpeed = managerStates.speedManager.currentSpeed || 1;
            this.battleManager.speedManager.speedLocked = managerStates.speedManager.speedLocked || false;
        }
    }

    restoreBattleLog(battleLog) {
        if (!battleLog) return;
        
        // Ensure battleLog is an array
        let logArray = battleLog;
        
        // Handle different formats
        if (battleLog.messages && Array.isArray(battleLog.messages)) {
            // If it's an object with messages array (from BattleLog export)
            logArray = battleLog.messages;
        } else if (!Array.isArray(battleLog)) {
            // If it's not an array at all, create empty array
            logArray = [];
            console.warn('⚠️ Battle log was not in expected format');
        }
        
        // Restore to BattleScreen's BattleLog if available
        if (this.battleManager.battleScreen && this.battleManager.battleScreen.battleLog) {
            if (this.battleManager.battleScreen.battleLog.importState) {
                this.battleManager.battleScreen.battleLog.importState({ messages: logArray });
            }
        }
        
        // IMPORTANT: Always restore as array to legacy battleLog
        this.battleManager.battleLog = Array.isArray(logArray) ? [...logArray] : [];
    }

    restoreExtendedState(extendedState) {
        if (!extendedState) return;
        
        this.battleManager.globalEffects = extendedState.globalEffects || [];
        this.battleManager.heroEffects = extendedState.heroEffects || {};
        this.battleManager.fieldEffects = extendedState.fieldEffects || [];
        this.battleManager.abilitiesUsed = extendedState.abilitiesUsed || {};
        this.battleManager.weatherEffects = extendedState.weatherEffects || null;
        this.battleManager.terrainModifiers = extendedState.terrainModifiers || [];
        this.battleManager.specialRules = extendedState.specialRules || [];
    }

    updateAllVisuals() {
        if (!this.battleManager) return;
        
        // Ensure battle screen HTML is properly created with restored heroes
        if (this.battleManager.battleScreen) {
            // Re-create battle screen HTML with the restored formations
            const battleArena = document.getElementById('battleArena');
            if (battleArena) {
                // Generate fresh battle HTML with restored hero data
                const battleHTML = this.battleManager.battleScreen.generateBattleScreenHTML();
                if (battleHTML && battleHTML.trim() !== '') {
                    battleArena.innerHTML = battleHTML;
                    console.log('✅ Battle screen HTML recreated with restored heroes');
                    
                    // Re-initialize battle log after DOM is recreated
                    setTimeout(() => {
                        if (this.battleManager.battleScreen.battleLog) {
                            this.battleManager.battleScreen.battleLog.init();
                            console.log('✅ Battle log re-initialized');
                        }
                        
                        // Re-initialize speed controls
                        this.battleManager.battleScreen.initializeSpeedControlUI();
                    }, 100);
                }
            }
        }
        
        // Now update all hero visuals (they should exist in DOM now)
        this.battleManager.updateAllHeroVisuals();
        
        // Explicitly update creature visuals to ensure proper death states
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                if (hero && hero.creatures && hero.creatures.length > 0) {
                    console.log(`🩸 Updating creature visuals for ${side} ${position} (${hero.creatures.length} creatures)`);
                    this.battleManager.updateCreatureVisuals(side, position, hero.creatures);
                    
                    // Log defeated creatures for debugging
                    const defeatedCreatures = hero.creatures.filter(c => !c.alive);
                    if (defeatedCreatures.length > 0) {
                        console.log(`💀 ${defeatedCreatures.length} defeated creatures should have hidden health bars:`, 
                                defeatedCreatures.map(c => c.name));
                    }
                }
            });
        });
        
        // Re-render creatures after restoration
        if (this.battleManager.battleScreen) {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
        }
        
        // Update necromancy displays
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.initializeNecromancyStackDisplays();
        }
        
        // Restore visual effects
        this.battleManager.restoreFireshieldVisuals();
        this.battleManager.restoreFrostRuneVisuals();
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    validateCheckpoint(checkpoint) {
        if (!checkpoint) return false;
        
        // Check required fields
        if (!checkpoint.version || !checkpoint.timestamp || !checkpoint.battleState) {
            return false;
        }
        
        // Version compatibility check
        const [major] = checkpoint.version.split('.');
        const [currentMajor] = this.checkpointVersion.split('.');
        if (major !== currentMajor) {
            console.warn(`⚠️ Checkpoint version mismatch: ${checkpoint.version} vs ${this.checkpointVersion}`);
            // Could add migration logic here
        }
        
        return true;
    }

    calculateStateHash(checkpoint) {
        // Simple hash for validation
        const str = JSON.stringify({
            turn: checkpoint.turnNumber,
            heroes: checkpoint.heroes,
            random: checkpoint.randomState
        });
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(16);
    }

    sanitizeForFirebase(obj) {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeForFirebase(item)).filter(item => item !== undefined);
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const sanitizedValue = this.sanitizeForFirebase(value);
            if (sanitizedValue !== undefined) {
                sanitized[key] = sanitizedValue;
            }
        }
        return sanitized;
    }

    // ============================================
    // CHECKPOINT MANAGEMENT
    // ============================================

    async clearCheckpoint() {
        if (!this.roomManager || !this.roomManager.getRoomRef()) {
            return false;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            await roomRef.child('battleCheckpoint').remove();
            await roomRef.child('gameState').update({
                hasCheckpoint: false,
                lastCheckpointTime: null,
                checkpointTurn: null,
                checkpointType: null
            });
            
            this.currentCheckpoint = null;
            this.previousCheckpoint = null;
            
            console.log('🧹 Checkpoint cleared');
            return true;
            
        } catch (error) {
            console.error('❌ Error clearing checkpoint:', error);
            return false;
        }
    }

    hasCheckpoint() {
        return this.currentCheckpoint !== null;
    }

    getCheckpointInfo() {
        if (!this.currentCheckpoint) return null;
        
        return {
            turn: this.currentCheckpoint.turnNumber,
            type: this.currentCheckpoint.checkpointType,
            timestamp: this.currentCheckpoint.timestamp,
            version: this.currentCheckpoint.version
        };
    }

    // ============================================
    // INTEGRATION HELPERS
    // ============================================

    /**
     * Called by battle manager at key points
     */
    async createBattleCheckpoint(type) {
        // Only host creates checkpoints
        if (!this.isHost) return;
        
        return await this.saveCheckpoint(type);
    }

    /**
     * Called during reconnection
     */
    async restoreFromLatestCheckpoint() {
        const checkpoint = await this.loadCheckpoint();
        if (!checkpoint) {
            console.log('📍 No checkpoint available for restoration');
            return false;
        }
        
        return await this.restoreFromCheckpoint(checkpoint);
    }
}

// Singleton instance
let checkpointSystemInstance = null;

export function getCheckpointSystem() {
    if (!checkpointSystemInstance) {
        checkpointSystemInstance = new CheckpointSystem();
    }
    return checkpointSystemInstance;
}

export default CheckpointSystem;