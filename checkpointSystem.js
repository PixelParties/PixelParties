// checkpointSystem.js - Complete Battle State Checkpoint System
// Handles atomic battle state snapshots for robust reconnection and persistence
// UPDATED: Fixed equipment dual-storage issue + Battle Bonus Support

import { Hero } from './hero.js';

export class CheckpointSystem {
    constructor() {
        this.currentCheckpoint = null;
        this.previousCheckpoint = null; // Fallback
        this.checkpointVersion = '2.1.0'; // Updated version for battle bonus support
        this.isEnabled = true;
        this.roomManager = null;
        this.isHost = false;
        
        // Checkpoint timing control
        this.lastCheckpointTime = 0;
        this.minCheckpointInterval = 5000; // ms
    }

    // Initialize with battle context
    init(battleManager, roomManager, isHost) {
        this.battleManager = battleManager;
        this.roomManager = roomManager;
        this.isHost = isHost;
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
                    // Store by absoluteSide (host/guest) not relative side (player/opponent)
                    hostHand: this.isHost ? (this.battleManager.playerHand || []) : (this.battleManager.opponentHand || []),
                    guestHand: this.isHost ? (this.battleManager.opponentHand || []) : (this.battleManager.playerHand || []),
                    hostDeck: this.isHost ? (this.battleManager.playerDeck || []) : (this.battleManager.opponentDeck || []),
                    guestDeck: this.isHost ? (this.battleManager.opponentDeck || []) : (this.battleManager.playerDeck || []),
                    hostGraveyard: this.isHost ? (this.battleManager.playerGraveyard || []) : (this.battleManager.opponentGraveyard || []),
                    guestGraveyard: this.isHost ? (this.battleManager.opponentGraveyard || []) : (this.battleManager.playerGraveyard || []),
                    hostBirthdayPresentCounter: this.isHost ? (this.battleManager.playerBirthdayPresentCounter || 0) : (this.battleManager.opponentBirthdayPresentCounter || 0),
                    guestBirthdayPresentCounter: this.isHost ? (this.battleManager.opponentBirthdayPresentCounter || 0) : (this.battleManager.playerBirthdayPresentCounter || 0),
                    // ===== CRITICAL: Save counters by absoluteSide for gold bonuses and other effects =====
                    hostCounters: this.isHost ? (this.battleManager.playerCounters || { birthdayPresent: 0, teleports: 0, goldenBananas: 0, evolutionCounters: 1 }) : (this.battleManager.opponentCounters || { birthdayPresent: 0, teleports: 0, goldenBananas: 0, evolutionCounters: 1 }),
                    guestCounters: this.isHost ? (this.battleManager.opponentCounters || { birthdayPresent: 0, teleports: 0, goldenBananas: 0, evolutionCounters: 1 }) : (this.battleManager.playerCounters || { birthdayPresent: 0, teleports: 0, goldenBananas: 0, evolutionCounters: 1 })
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
                permanentArtifacts: this.capturePermanentArtifacts(),
                
                // Random State
                randomState: this.captureRandomState(),
                
                // Manager States
                managerStates: this.captureManagerStates(),
                
                // Battle Log (last 100 entries for context)
                battleLog: this.captureBattleLog(),
                
                // Network/Speed State
                networkState: this.captureNetworkState(),

                // Area
                areaData: this.captureAreaData(),
                
                // Extended State
                extendedState: this.captureExtendedState()
            };
            
            // Calculate hash for validation
            checkpoint.stateHash = this.calculateStateHash(checkpoint);
            
            return checkpoint;
            
        } catch (error) {
            return null;
        }
    }

    // ============================================
    // STATE CAPTURE METHODS
    // ============================================

    captureAllHeroStates() {
        // CRITICAL FIX: Store heroes by absoluteSide (host/guest) not relative side (player/opponent)
        // This prevents the singleton battleManager reference issue from causing hero swaps
        const heroStates = {
            host: {},
            guest: {}
        };
        
        ['left', 'center', 'right'].forEach(position => {
            // Player heroes
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero) {
                const capturedState = this.captureHeroState(playerHero);
                // Store by absoluteSide, not by player/opponent
                const absoluteSide = playerHero.absoluteSide || (this.isHost ? 'host' : 'guest');
                heroStates[absoluteSide][position] = capturedState;
            }
            
            // Opponent heroes
            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero) {
                const capturedState = this.captureHeroState(opponentHero);
                // Store by absoluteSide, not by player/opponent
                const absoluteSide = opponentHero.absoluteSide || (this.isHost ? 'guest' : 'host');
                heroStates[absoluteSide][position] = capturedState;
            }
        });
        
        return heroStates;
    }

    captureHeroState(hero) {
        // This includes battle bonuses and any other state that the hero manages
        if (hero.exportState && typeof hero.exportState === 'function') {
            const heroState = hero.exportState();
            return heroState;
        } else {
            // Fallback to manual capture if exportState is not available
            return this.captureHeroStateFallback(hero);
        }
    }

    // Fallback method for hero state capture (keeps existing logic as backup)
    captureHeroStateFallback(hero) {
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
            
            // Shield system support - was missing!
            currentShield: hero.currentShield || 0,
            
            // Position info
            position: hero.position,
            side: hero.side,
            absoluteSide: hero.absoluteSide,
            
            // Battle bonuses
            battleAttackBonus: hero.battleAttackBonus || 0,
            battleHpBonus: hero.battleHpBonus || 0,
            
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
            
            // Equipment - captured at hero level only
            equipment: hero.equipment ? JSON.parse(JSON.stringify(hero.equipment)) : [],
            
            // Status effects
            statusEffects: hero.statusEffects ? JSON.parse(JSON.stringify(hero.statusEffects)) : [],
            
            // Temporary modifiers
            temporaryModifiers: hero.temporaryModifiers || {},
            
            // Special states
            necromancyStacks: hero.necromancyStacks || 0,
            maxNecromancyStacks: hero.maxNecromancyStacks || 0,

            // Arrow counters
            flameArrowCounters: hero.flameArrowCounters || 0,
            
            // Any custom properties
            customStats: hero.customStats || {},
            combatHistory: hero.combatHistory || [],
            
            // Special hero properties that might exist
            burningFingerStack: hero.burningFingerStack || 0,
            _syncedUniqueEquipmentCount: hero._syncedUniqueEquipmentCount || 0
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
            lastDamaged: creature.lastDamaged,
            counters: creature.counters || 0
        };
    }

    captureFormations() {
        // Store by absoluteSide (host/guest) not relative side (player/opponent)
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';
        
        return {
            [myAbsoluteSide]: JSON.parse(JSON.stringify(this.battleManager.playerFormation || {})),
            [opponentAbsoluteSide]: JSON.parse(JSON.stringify(this.battleManager.opponentFormation || {}))
        };
    }

    captureAbilities() {
        // Store by absoluteSide (host/guest) not relative side (player/opponent)
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';
        
        return {
            [myAbsoluteSide]: JSON.parse(JSON.stringify(this.battleManager.playerAbilities || {})),
            [opponentAbsoluteSide]: JSON.parse(JSON.stringify(this.battleManager.opponentAbilities || {}))
        };
    }

    captureSpellbooks() {
        // Store by absoluteSide (host/guest) not relative side (player/opponent)
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';
        
        return {
            [myAbsoluteSide]: JSON.parse(JSON.stringify(this.battleManager.playerSpellbooks || {})),
            [opponentAbsoluteSide]: JSON.parse(JSON.stringify(this.battleManager.opponentSpellbooks || {}))
        };
    }

    captureCreatures() {
        // Store by absoluteSide (host/guest) not relative side (player/opponent)
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';
        
        return {
            [myAbsoluteSide]: JSON.parse(JSON.stringify(this.battleManager.playerCreatures || {})),
            [opponentAbsoluteSide]: JSON.parse(JSON.stringify(this.battleManager.opponentCreatures || {}))
        };
    }

    captureEquipment() {
        // Return empty objects for backward compatibility
        return {
            player: {},
            opponent: {}
        };
    }

    capturePermanentArtifacts() {
        if (!this.battleManager.battlePermanentArtifacts) {
            return [];
        }
        return JSON.parse(JSON.stringify(this.battleManager.battlePermanentArtifacts));
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
        
        // Attack Effects State - NOW INCLUDES FUTURETECHFISTS AND ALL ATTACK EFFECTS
        if (this.battleManager.attackEffectsManager) {
            states.attackEffects = this.battleManager.attackEffectsManager.exportState();
        }
        
        // Arrow System State (legacy compatibility - still needed for older saves)
        if (this.battleManager.attackEffectsManager && this.battleManager.attackEffectsManager.arrowSystem) {
            states.arrowSystem = this.battleManager.attackEffectsManager.arrowSystem.exportArrowState();
        }

        // Ingo Effect State
        if (this.battleManager.ingoEffectManager) {
            states.ingoEffect = this.battleManager.ingoEffectManager.exportState();
        }

        // Area Effect States
        if (this.battleManager.gatheringStormEffect) {
            states.gatheringStormEffect = this.battleManager.gatheringStormEffect.exportState();
        }
        if (this.battleManager.doomClockEffect) {
            states.doomClockEffect = this.battleManager.doomClockEffect.exportState();
        }
        if (this.battleManager.pinkSkyEffect) {
            states.pinkSkyEffect = this.battleManager.pinkSkyEffect.exportState();
        }
        if (this.battleManager.bigGwenEffect) {
            states.bigGwenEffect = this.battleManager.bigGwenEffect.exportState();
        }
        
        // Ritual Chamber Effect State
        if (this.battleManager.ritualChamberEffect) {
            states.ritualChamberEffect = this.battleManager.ritualChamberEffect.exportState();
        }
        
        // Speed Manager State
        if (this.battleManager.speedManager) {
            states.speedManager = {
                currentSpeed: this.battleManager.speedManager.currentSpeed || 1,
                speedLocked: this.battleManager.speedManager.speedLocked || false
            };
        }
        
        // ===== INGO INTEGRATION: Capture Ingo Effect State =====
        if (this.battleManager.ingoEffectManager) {
            states.ingoState = this.battleManager.ingoEffectManager.exportState();
        }
        // ========================================================
        
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
            return false;
        }
        
        try {
            // Create checkpoint
            const checkpoint = this.createCheckpoint(checkpointType);
            if (!checkpoint) {
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
            
            // NEW: Sync creature states to guest after successful checkpoint save
            if (this.isHost) {
                await this.syncCreatureStatesToGuest();
            }
            
            return true;
            
        } catch (error) {
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
            return null;
        }
        
        try {
            const roomRef = this.roomManager.getRoomRef();
            const checkpointRef = roomRef.child('battleCheckpoint');
            const snapshot = await checkpointRef.once('value');
            const checkpoint = snapshot.val();
            
            if (!checkpoint) {
                return null;
            }
            
            // Validate checkpoint
            if (!this.validateCheckpoint(checkpoint)) {
                return null;
            }
            
            return checkpoint;
            
        } catch (error) {
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
            return false;
        }
        
        try {
            // 1. Restore core battle state
            this.restoreBattleState(checkpoint.battleState);
            
            // 2. Restore formations
            this.restoreFormations(checkpoint.formations);
            
            // 3. Restore abilities, spellbooks, creatures, equipment
            this.restoreAbilities(checkpoint.abilities);
            this.restoreSpellbooks(checkpoint.spellbooks);
            this.restoreCreatures(checkpoint.creatures);
            this.restoreEquipment(checkpoint.equipment);
            this.restorePermanentArtifacts(checkpoint.permanentArtifacts);
            this.restoreAreaData(checkpoint.areaData);
            
            // 4. Restore all heroes with complete state
            this.restoreAllHeroes(checkpoint.heroes);

            // Reinitialize kill tracker data structure for current perspective
            if (this.battleManager.killTracker) {
                // Force reinitialize the kill tracking structure
                this.battleManager.killTracker.reset();
                this.battleManager.killTracker.init(this.battleManager);
            }
            
            // ============================================
            // 🔧 CRITICAL: RE-WRAP CREATURE ARRAYS WITH AUTO-DETECTION
            // This ensures Ingo and other creature-summon effects work after reconnection
            // Without this, the Proxy that detects creature additions is lost during restoration
            // ============================================
            this.rewrapAllCreatureArrays();
            
            // 5. Restore random state for determinism
            this.restoreRandomState(checkpoint.randomState);
            
            // 6. Restore manager states
            this.restoreManagerStates(checkpoint.managerStates);
            
            // 7. Restore battle log
            this.restoreBattleLog(checkpoint.battleLog);

            // 8. RE-INITIALIZE CREATURE MANAGERS
            if (this.battleManager.flowManager) {
                await this.battleManager.flowManager.initializeAllCreatures();
            }
            
            // 9. Restore extended state
            this.restoreExtendedState(checkpoint.extendedState);
            
            // 10. Update all visuals
            this.updateAllVisuals();
            
            // Store this as current checkpoint
            this.currentCheckpoint = checkpoint;
            
            // ============================================
            // SET CHECKPOINT COOLDOWN AFTER RESTORATION
            // Prevents immediate checkpoint creation after reconnect
            // ============================================
            this.lastCheckpointTime = Date.now();
            
            // NEW: Sync creature states to guest after successful restoration
            if (this.isHost) {
                await this.syncCreatureStatesToGuest();
            }
            
            console.log('✅ RESTORATION COMPLETE - Ingo counters and creature detection fully operational');
            
            return true;
            
        } catch (error) {
            console.error('❌ Error in restoreFromCheckpoint:', error);
            console.error('Error details:', error.stack);
            // Try fallback to previous checkpoint if available
            if (this.previousCheckpoint && checkpoint !== this.previousCheckpoint) {
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

        // Use absoluteSide (host/guest) not relative side (player/opponent)
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';
        
        // Restore hands
        this.battleManager.playerHand = battleState[`${myAbsoluteSide}Hand`] || [];
        this.battleManager.opponentHand = battleState[`${opponentAbsoluteSide}Hand`] || [];
        
        // Restore decks
        this.battleManager.playerDeck = battleState[`${myAbsoluteSide}Deck`] || [];
        this.battleManager.opponentDeck = battleState[`${opponentAbsoluteSide}Deck`] || [];
        
        // Restore graveyards
        this.battleManager.playerGraveyard = battleState[`${myAbsoluteSide}Graveyard`] || [];
        this.battleManager.opponentGraveyard = battleState[`${opponentAbsoluteSide}Graveyard`] || [];
        
        // Restore birthday present counters
        this.battleManager.playerBirthdayPresentCounter = battleState[`${myAbsoluteSide}BirthdayPresentCounter`] || 0;
        this.battleManager.opponentBirthdayPresentCounter = battleState[`${opponentAbsoluteSide}BirthdayPresentCounter`] || 0;
        
        // ===== CRITICAL: Restore counters by absoluteSide =====
        this.battleManager.playerCounters = battleState[`${myAbsoluteSide}Counters`] || { birthdayPresent: 0, teleports: 0, goldenBananas: 0, evolutionCounters: 1 };
        this.battleManager.opponentCounters = battleState[`${opponentAbsoluteSide}Counters`] || { birthdayPresent: 0, teleports: 0, goldenBananas: 0, evolutionCounters: 1 };
        console.log(`✅ Restored ${myAbsoluteSide} counters:`, this.battleManager.playerCounters);
        
        // Initialize battleLog as empty array before restoration
        this.battleManager.battleLog = [];
    }

    restoreFormations(formations) {
        if (!formations) return;
    
        // NEW: Read from host/guest keys based on absoluteSide
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';
        
        const playerFormation = formations[myAbsoluteSide] || {};
        const opponentFormation = formations[opponentAbsoluteSide] || {};
        
        // Restore to battle manager
        this.battleManager.playerFormation = playerFormation;
        this.battleManager.opponentFormation = opponentFormation;
        
        // Also update the battle screen's references
        if (this.battleManager.battleScreen) {
            this.battleManager.battleScreen.playerFormation = playerFormation;
            this.battleManager.battleScreen.opponentFormation = opponentFormation;
        }
        
        // Update FormationManager so it stays in sync
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
        }
    }

    restoreAbilities(abilities) {
        if (!abilities) return;
        
        // Use absoluteSide (host/guest) not relative side (player/opponent)
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';
        
        this.battleManager.playerAbilities = abilities[myAbsoluteSide] || {};
        this.battleManager.opponentAbilities = abilities[opponentAbsoluteSide] || {};
    }

    restoreSpellbooks(spellbooks) {
        if (!spellbooks) return;
        
        // Use absoluteSide (host/guest) not relative side (player/opponent)
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';
        
        this.battleManager.playerSpellbooks = spellbooks[myAbsoluteSide] || {};
        this.battleManager.opponentSpellbooks = spellbooks[opponentAbsoluteSide] || {};
    }

    restoreCreatures(creatures) {
        if (!creatures) return;
        
        // Use absoluteSide (host/guest) not relative side (player/opponent)
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';
        
        this.battleManager.playerCreatures = creatures[myAbsoluteSide] || {};
        this.battleManager.opponentCreatures = creatures[opponentAbsoluteSide] || {};
    }

    restoreEquipment(equipment) {
        // FIXED: Equipment restoration now handled at hero level only
        if (!equipment) return;
        
        // Clear any existing manager-level equipment to avoid conflicts
        if (this.battleManager) {
            this.battleManager.playerEquips = {};
            this.battleManager.opponentEquips = {};
        }
    }

    restorePermanentArtifacts(permanentArtifacts) {
        if (!permanentArtifacts) return;
        
        this.battleManager.battlePermanentArtifacts = [...permanentArtifacts];
    }

    restoreAllHeroes(heroStates) {
        if (!heroStates) return;
        
        // Clear existing heroes first
        this.battleManager.playerHeroes = {};
        this.battleManager.opponentHeroes = {};
        
        // ===== CRITICAL FIX: Use absoluteSide to determine which heroes are which =====
        const myAbsoluteSide = this.isHost ? 'host' : 'guest';
        const opponentAbsoluteSide = this.isHost ? 'guest' : 'host';
        
        // NEW: Read from host/guest keys based on absoluteSide
        // The checkpoint stores heroes by their absolute side (host/guest), not relative (player/opponent)
        const myHeroes = heroStates[myAbsoluteSide] || {};
        const opponentHeroes = heroStates[opponentAbsoluteSide] || {};
        
        // Restore player heroes (my heroes)
        ['left', 'center', 'right'].forEach(position => {
            if (myHeroes[position]) {
                // ===== Override side properties to match current client's perspective =====
                const heroState = { ...myHeroes[position] };
                heroState.side = 'player';
                heroState.absoluteSide = myAbsoluteSide;
                heroState.position = position;
                
                // Now restore the hero with the corrected state
                const hero = this.restoreHero(heroState);
                
                // Double-check the values are correct after restoration
                hero.side = 'player';
                hero.absoluteSide = myAbsoluteSide;
                hero.position = position;
                this.battleManager.playerHeroes[position] = hero;
            }
            
            if (opponentHeroes[position]) {
                // ===== Override side properties to match current client's perspective =====
                const heroState = { ...opponentHeroes[position] };
                heroState.side = 'opponent';
                heroState.absoluteSide = opponentAbsoluteSide;
                heroState.position = position;
                
                // Now restore the hero with the corrected state
                const hero = this.restoreHero(heroState);
                
                // Double-check the values are correct after restoration
                hero.side = 'opponent';
                hero.absoluteSide = opponentAbsoluteSide;
                hero.position = position;
                this.battleManager.opponentHeroes[position] = hero;
            }
        });
        
        // Reinitialize kill tracker for the new perspective
        if (this.battleManager.killTracker) {
            this.battleManager.killTracker.reset();
            this.battleManager.killTracker.init(this.battleManager);
        }
        
        // Clear manager-level equipment after hero restoration
        this.battleManager.playerEquips = {};
        this.battleManager.opponentEquips = {};
    }
    restoreHero(heroState) {
        // This will handle battle bonuses and all other state correctly
        const hero = Hero.fromSavedState(heroState);
        
        // The fromSavedState method should handle everything, but ensure critical properties are set
        // (This is defensive programming - the fromSavedState should already handle this)
        if (heroState.battleAttackBonus !== undefined) {
            hero.battleAttackBonus = heroState.battleAttackBonus;
        }
        if (heroState.battleHpBonus !== undefined) {
            hero.battleHpBonus = heroState.battleHpBonus;
        }
        
        // Explicitly restore shield data
        if (heroState.currentShield !== undefined) {
            hero.currentShield = heroState.currentShield;
        } else {
            // Ensure shield is initialized to 0 if not present
            hero.currentShield = 0;
        }
        
        return hero;
    }

    /**
     * Re-wrap all hero creature arrays with auto-detection after restoration
     * This ensures that creature summons are properly detected after reconnection
     * CRITICAL: This fixes the Ingo counter and other creature-summon effects after host reconnects
     */
    rewrapAllCreatureArrays() {
        if (!this.battleManager || !this.battleManager.wrapCreaturesArrayWithAutoDetection) {
            console.warn('⚠️ Cannot rewrap creature arrays - battle manager or method missing');
            return;
        }

        console.log('🔧 Re-wrapping creature arrays with auto-detection after restoration...');

        // Re-wrap all player heroes
        ['left', 'center', 'right'].forEach(position => {
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero && playerHero.creatures) {
                // Clear the wrapped flag so it can be wrapped again
                playerHero._creaturesWrapped = false;
                this.battleManager.wrapCreaturesArrayWithAutoDetection(playerHero);
                console.log(`✅ Re-wrapped creatures array for player ${position} hero`);
            }

            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero && opponentHero.creatures) {
                // Clear the wrapped flag so it can be wrapped again
                opponentHero._creaturesWrapped = false;
                this.battleManager.wrapCreaturesArrayWithAutoDetection(opponentHero);
                console.log(`✅ Re-wrapped creatures array for opponent ${position} hero`);
            }
        });

        console.log('✅ All creature arrays re-wrapped with auto-detection');
    }


    restoreRandomState(randomState) {
        if (!randomState || !this.battleManager.randomnessManager) return;
        
        this.battleManager.randomnessManager.importState(randomState);
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
        
        // Restore Attack Effects State
        if (managerStates.attackEffects && this.battleManager.attackEffectsManager) {
            if (this.battleManager.attackEffectsManager.importState) {
                this.battleManager.attackEffectsManager.importState(managerStates.attackEffects);
            }
        }
        
        // Restore speed settings
        if (managerStates.speedManager && this.battleManager.speedManager) {
            this.battleManager.speedManager.currentSpeed = managerStates.speedManager.currentSpeed || 1;
            this.battleManager.speedManager.speedLocked = managerStates.speedManager.speedLocked || false;
        }

        // Restore Arrow System state (legacy compatibility)
        if (managerStates.arrowSystem && 
            this.battleManager.attackEffectsManager && 
            this.battleManager.attackEffectsManager.arrowSystem) {
            this.battleManager.attackEffectsManager.arrowSystem.importArrowState(managerStates.arrowSystem);
        }
        
        // Restore Ingo Effect
        if (managerStates.ingoEffect && this.battleManager.ingoEffectManager) {
            this.battleManager.ingoEffectManager.importState(managerStates.ingoEffect);
        }
        
        // Restore Gathering Storm Effect
        if (managerStates.gatheringStormEffect) {
            // Import the Gathering Storm effect class if needed
            if (!this.battleManager.gatheringStormEffect) {
                import('./Spells/gatheringStorm.js').then(({ GatheringStormEffect }) => {
                    this.battleManager.gatheringStormEffect = new GatheringStormEffect();
                    this.battleManager.gatheringStormEffect.importState(managerStates.gatheringStormEffect);
                }).catch(error => {
                    console.error('Error importing Gathering Storm effect:', error);
                });
            } else {
                this.battleManager.gatheringStormEffect.importState(managerStates.gatheringStormEffect);
            }
        }
        // Restore DoomClock Effect
        if (managerStates.doomClockEffect) {
            // Import the DoomClock effect class if needed
            if (!this.battleManager.doomClockEffect) {
                import('./Spells/doomClock.js').then(({ DoomClockEffect }) => {
                    this.battleManager.doomClockEffect = new DoomClockEffect();
                    this.battleManager.doomClockEffect.importState(managerStates.doomClockEffect);
                }).catch(error => {
                    console.error('Error importing DoomClock effect:', error);
                });
            } else {
                this.battleManager.doomClockEffect.importState(managerStates.doomClockEffect);
            }
        }
        // Restore PinkSky Effect
        if (managerStates.pinkSkyEffect) {
            // Import the PinkSky effect class if needed
            if (!this.battleManager.pinkSkyEffect) {
                import('./Spells/pinkSky.js').then(({ PinkSkyEffect }) => {
                    this.battleManager.pinkSkyEffect = new PinkSkyEffect();
                    this.battleManager.pinkSkyEffect.importState(managerStates.pinkSkyEffect);
                }).catch(error => {
                    console.error('Error importing PinkSky effect:', error);
                });
            } else {
                this.battleManager.pinkSkyEffect.importState(managerStates.pinkSkyEffect);
            }
        }
        // Restore BigGwen Effect
        if (managerStates.bigGwenEffect) {
            // Import the BigGwen effect class if needed
            if (!this.battleManager.bigGwenEffect) {
                import('./Spells/bigGwen.js').then(({ BigGwenEffect }) => {
                    this.battleManager.bigGwenEffect = new BigGwenEffect();
                    this.battleManager.bigGwenEffect.importState(managerStates.bigGwenEffect);
                }).catch(error => {
                    console.error('Error importing BigGwen effect:', error);
                });
            } else {
                this.battleManager.bigGwenEffect.importState(managerStates.bigGwenEffect);
            }
        }
        
        // Restore RitualChamber Effect
        if (managerStates.ritualChamberEffect) {
            // Import the RitualChamber effect class if needed
            if (!this.battleManager.ritualChamberEffect) {
                import('./Spells/ritualChamber.js').then(({ RitualChamberEffect }) => {
                    this.battleManager.ritualChamberEffect = new RitualChamberEffect();
                    this.battleManager.ritualChamberEffect.importState(managerStates.ritualChamberEffect);
                }).catch(error => {
                    console.error('Error importing RitualChamber effect:', error);
                });
            } else {
                this.battleManager.ritualChamberEffect.importState(managerStates.ritualChamberEffect);
            }
        }
        
        // ===== INGO INTEGRATION: Restore Ingo Effect State =====
        if (managerStates.ingoState && this.battleManager.ingoEffectManager) {
            this.battleManager.ingoEffectManager.importState(managerStates.ingoState);
            console.log('✅ Restored Ingo Effect Manager state');
        }
        // ========================================================
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
                    
                    // Re-initialize battle log after DOM is recreated
                    setTimeout(() => {
                        if (this.battleManager.battleScreen.battleLog) {
                            this.battleManager.battleScreen.battleLog.init();
                        }
                        
                        // Re-initialize speed controls
                        this.battleManager.battleScreen.initializeSpeedControlUI();
                    }, 100);
                }
            }
        }
        
        // Now update all hero visuals (they should exist in DOM now)
        this.battleManager.updateAllHeroVisuals();
    
        // Fix Gabby/ZombieGabby images after restoration**
        this.updateGabbyTransformationVisuals();
        
        // Explicitly update attack displays to show battle bonuses
        this.updateHeroAttackDisplaysWithBonuses();
        
        // Explicitly update creature visuals to ensure proper death states
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                if (hero && hero.creatures && hero.creatures.length > 0) {
                    this.battleManager.updateCreatureVisuals(side, position, hero.creatures);
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

        // Update FlameArrow displays
        if (this.battleManager.attackEffectsManager && 
            this.battleManager.attackEffectsManager.flameArrowEffect) {
            this.battleManager.attackEffectsManager.flameArrowEffect.updateAllFlameArrowDisplays();
        }
        
        // Restore visual effects
        this.battleManager.restoreFireshieldVisuals();
        this.battleManager.restoreFrostRuneVisuals();
        
        // Verify shield displays after restoration
        setTimeout(() => {
            this.battleManager.verifyAndFixShieldDisplays();
        }, 200);
    }

    updateGabbyTransformationVisuals() {
        const bm = this.battleManager;
        
        ['left', 'center', 'right'].forEach(position => {
            // Check player heroes
            const playerHero = bm.playerHeroes[position];
            if (playerHero && this.isGabbyVariant(playerHero.name)) {
                this.updateGabbyHeroImage('player', position, playerHero);
            }
            
            // Check opponent heroes
            const opponentHero = bm.opponentHeroes[position];
            if (opponentHero && this.isGabbyVariant(opponentHero.name)) {
                this.updateGabbyHeroImage('opponent', position, opponentHero);
            }
        });
    }

    isGabbyVariant(heroName) {
        return heroName === 'Gabby' || heroName === 'ZombieGabby';
    }

    updateGabbyHeroImage(side, position, hero) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;
        
        const heroImage = heroElement.querySelector('.battle-hero-image');
        if (heroImage) {
            // Ensure the image matches the current hero state
            const correctImage = `./Cards/All/${hero.name}.png`;
            if (heroImage.src !== correctImage && !heroImage.src.endsWith(correctImage)) {
                heroImage.src = correctImage;
            }
        }
    }

    // Update hero attack displays to show current totals including battle bonuses
    updateHeroAttackDisplaysWithBonuses() {
        ['left', 'center', 'right'].forEach(position => {
            // Update player heroes
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero) {
                this.battleManager.updateHeroAttackDisplay('player', position, playerHero);
            }
            
            // Update opponent heroes
            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero) {
                this.battleManager.updateHeroAttackDisplay('opponent', position, opponentHero);
            }
        });
    }



    // ============================================
    // AREA SYNC METHODS
    // ============================================

    captureAreaData() {
        if (!this.battleManager) return null;
        
        return {
            playerAreaCard: this.battleManager.playerAreaCard || null,
            opponentAreaCard: this.battleManager.opponentAreaCard || null
        };
    }

    // Add this method in the RESTORATION METHODS section  
    restoreAreaData(areaData) {
        if (!areaData || !this.battleManager) return;
        
        // For guests, swap player and opponent data
        if (this.isHost) {
            this.battleManager.playerAreaCard = areaData.playerAreaCard;
            this.battleManager.opponentAreaCard = areaData.opponentAreaCard;
        } else {
            // GUEST: Swap the area data since checkpoint was saved from host perspective
            this.battleManager.playerAreaCard = areaData.opponentAreaCard;
            this.battleManager.opponentAreaCard = areaData.playerAreaCard;
        }
    }

    // ============================================
    // GRAVEYARD SYNC METHODS
    // ============================================

    /**
     * Capture all current graveyard states for sync (optional future enhancement)
     */
    captureAllGraveyardStatesForSync() {
        const graveyardStates = {
            player: this.battleManager.playerGraveyard || [],
            opponent: this.battleManager.opponentGraveyard || []
        };
        
        return graveyardStates;
    }
    
    /**
     * Sync graveyard states with guest (optional future enhancement)
     */
    async syncGraveyardStatesToGuest() {
        if (!this.isHost || !this.battleManager) return;
        
        const graveyardStates = this.captureAllGraveyardStatesForSync();
        
        // Send to guest via network manager
        this.battleManager.sendBattleUpdate('graveyard_state_sync', {
            graveyardStates: graveyardStates,
            timestamp: Date.now(),
            syncReason: 'checkpoint'
        });
    }

    /**
     * Apply received graveyard states from host (optional future enhancement)  
     */
    applyGraveyardStatesFromSync(syncData) {
        if (this.isHost || !syncData || !syncData.graveyardStates) return;
        
        const { graveyardStates } = syncData;
        
        // For guest, swap player and opponent data since checkpoint was from host perspective
        const playerGraveyard = graveyardStates.opponent || []; // Guest's actual graveyard
        const opponentGraveyard = graveyardStates.player || []; // Host's graveyard (guest's opponent)
        
        // Apply to battle manager
        this.battleManager.playerGraveyard = playerGraveyard;
        this.battleManager.opponentGraveyard = opponentGraveyard;
    }


    

    // ============================================
    // CREATURE SYNC METHODS
    // ============================================

    /**
     * Capture all current creature states across all heroes
     * @returns {Object} Complete creature state data for sync
     */
    captureAllCreatureStatesForSync() {
        const creatureStates = {
            player: {},
            opponent: {}
        };
        
        ['left', 'center', 'right'].forEach(position => {
            // Player heroes
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero && playerHero.creatures) {
                creatureStates.player[position] = playerHero.creatures.map((creature, index) => ({
                    ...this.captureCreatureState(creature),
                    arrayIndex: index
                }));
            }
            
            // Opponent heroes
            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero && opponentHero.creatures) {
                creatureStates.opponent[position] = opponentHero.creatures.map((creature, index) => ({
                    ...this.captureCreatureState(creature),
                    arrayIndex: index
                }));
            }
        });
        
        return creatureStates;
    }

    /**
     * Sync creature states with guest (host only)
     */
    async syncCreatureStatesToGuest() {
        if (!this.isHost || !this.battleManager) return;
        
        const creatureStates = this.captureAllCreatureStatesForSync();
        
        // Send to guest via network manager
        this.battleManager.sendBattleUpdate('creature_state_sync', {
            creatureStates: creatureStates,
            timestamp: Date.now(),
            syncReason: 'checkpoint'
        });
    }

    /**
     * Apply received creature states from host (guest only)
     */
    applyCreatureStatesFromSync(syncData) {
        if (this.isHost || !syncData || !syncData.creatureStates) return;
        
        const { creatureStates } = syncData;
        
        // For guest, swap player and opponent data since checkpoint was from host perspective
        const playerCreatures = creatureStates.opponent || {}; // Guest's actual creatures
        const opponentCreatures = creatureStates.player || {}; // Host's creatures (guest's opponent)
        
        // Apply to player heroes
        ['left', 'center', 'right'].forEach(position => {
            if (playerCreatures[position] && this.battleManager.playerHeroes[position]) {
                this.applySyncedCreaturesToHero(this.battleManager.playerHeroes[position], playerCreatures[position]);
            }
            
            if (opponentCreatures[position] && this.battleManager.opponentHeroes[position]) {
                this.applySyncedCreaturesToHero(this.battleManager.opponentHeroes[position], opponentCreatures[position]);
            }
        });
        
        // Update all creature visuals
        this.updateAllCreatureVisualsAfterSync();
    }

    /**
     * Apply synced creature data to a specific hero
     */
    applySyncedCreaturesToHero(hero, syncedCreatures) {
        if (!hero || !hero.creatures || !Array.isArray(syncedCreatures)) return;
        
        // Update existing creatures or add missing ones
        syncedCreatures.forEach((syncedCreature, index) => {
            if (index < hero.creatures.length) {
                // Update existing creature
                const creature = hero.creatures[index];
                creature.currentHp = syncedCreature.currentHp;
                creature.maxHp = syncedCreature.maxHp;
                creature.alive = syncedCreature.alive;
                creature.statusEffects = syncedCreature.statusEffects || [];
                creature.counters = syncedCreature.counters || 0;
            } else {
                // Add missing creature (shouldn't normally happen, but defensive)
                hero.creatures.push({
                    name: syncedCreature.name,
                    image: syncedCreature.image,
                    currentHp: syncedCreature.currentHp,
                    maxHp: syncedCreature.maxHp,
                    atk: syncedCreature.atk,
                    alive: syncedCreature.alive,
                    type: syncedCreature.type || 'creature',
                    statusEffects: syncedCreature.statusEffects || [],
                    counters: syncedCreature.counters || 0
                });
            }
        });
        
        // Remove extra creatures if guest has more than host
        if (hero.creatures.length > syncedCreatures.length) {
            hero.creatures.splice(syncedCreatures.length);
        }
    }

    /**
     * Update all creature visuals after sync
     */
    updateAllCreatureVisualsAfterSync() {
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                if (hero && hero.creatures && hero.creatures.length > 0) {
                    this.battleManager.updateCreatureVisuals(side, position, hero.creatures);
                }
            });
        });
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
            
            return true;
            
        } catch (error) {
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