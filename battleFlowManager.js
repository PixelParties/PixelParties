// battleFlowManager.js - Battle Flow Control Module with Ice Age Pause Support
// Handles the main battle flow, turn processing, and actor management

import CavalryCreature from './Creatures/cavalry.js';
import BattleStartManager from './battleStartManager.js';

export class BattleFlowManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.cavalryManager = null;
        this.battleStartManager = new BattleStartManager(battleManager);
    }

    // Start the battle
    async startBattle() {
        const bm = this.battleManager;
        
        if (bm.battleActive) {
            return;
        }

        bm.battleActive = true;
        bm.currentTurn = 0;
        bm.battleLog = []; // Clear legacy array, delegate to BattleScreen
        bm.turnInProgress = false;
        bm.iceAgeInProgress = false;
        
        // Initialize speed control UI
        if (bm.battleScreen && bm.battleScreen.initializeSpeedControl) {
            bm.battleScreen.initializeSpeedControl(bm.isAuthoritative);
        }
        
        // Initialize extensible state
        bm.initializeExtensibleState();
        
        // Re-initialize heroes to ensure fresh health/state (using pre-calculated stats)
        bm.initializeHeroes();

        // Initialize necromancy manager and stacks
        const { NecromancyManager } = await import('./Abilities/necromancy.js');
        bm.necromancyManager = new NecromancyManager(bm);
        bm.necromancyManager.initializeNecromancyStacks();
        bm.necromancyManager.initializeNecromancyStackDisplays();
        
        // Initialize Diplomacy manager
        const { DiplomacyManager } = await import('./Abilities/diplomacy.js');
        bm.diplomacyManager = new DiplomacyManager(bm);
        
        // CREATURES - Initialize creature managers with better error handling
        
        // Initialize Cavalry manager
        try {
            this.cavalryManager = new CavalryCreature(bm);
        } catch (error) {
            this.cavalryManager = null;
        }

        // Initialize Monia protection effect
        try {
            const { MoniaHeroEffect } = await import('./Heroes/monia.js');
            bm.moniaEffect = new MoniaHeroEffect(bm);
        } catch (error) {
            bm.moniaEffect = null;
        }

        try {
            // Initialize Jiggles manager
            const JigglesCreature = (await import('./Creatures/jiggles.js')).default;
            bm.jigglesManager = new JigglesCreature(bm);

            // Initialize Skeleton Archer manager
            const SkeletonArcherCreature = (await import('./Creatures/skeletonArcher.js')).default;
            bm.skeletonArcherManager = new SkeletonArcherCreature(bm);

            // Initialize Skeleton Necromancer manager
            const SkeletonNecromancerCreature = (await import('./Creatures/skeletonNecromancer.js')).default;
            bm.skeletonNecromancerManager = new SkeletonNecromancerCreature(bm);

            // Initialize Skeleton Death Knight manager
            const SkeletonDeathKnightCreature = (await import('./Creatures/skeletonDeathKnight.js')).default;
            bm.skeletonDeathKnightManager = new SkeletonDeathKnightCreature(bm);

            // Initialize Burning Skeleton manager
            const BurningSkeletonCreature = (await import('./Creatures/burningSkeleton.js')).default;
            bm.burningSkeletonManager = new BurningSkeletonCreature(bm);
            
            // Initialize Skeleton Reaper manager
            const SkeletonReaperCreature = (await import('./Creatures/skeletonReaper.js')).default;
            bm.skeletonReaperManager = new SkeletonReaperCreature(bm);

            // Initialize Skeleton Bard manager
            const SkeletonBardCreature = (await import('./Creatures/skeletonBard.js')).default;
            bm.skeletonBardManager = new SkeletonBardCreature(bm);

            // Initialize Skeleton Mage manager
            const SkeletonMageCreature = (await import('./Creatures/skeletonMage.js')).default;
            bm.skeletonMageManager = new SkeletonMageCreature(bm);

            // Initialize Front Soldier manager
            const FrontSoldierCreature = (await import('./Creatures/frontSoldier.js')).default;
            bm.frontSoldierManager = new FrontSoldierCreature(bm);

            // Initialize Archer manager
            const ArcherCreature = (await import('./Creatures/archer.js')).default;
            bm.archerManager = new ArcherCreature(bm);

            // Initialize Royal Corgi manager
            const RoyalCorgiCreatureClass = (await import('./Creatures/royalCorgi.js')).default;
            bm.royalCorgiManager = new RoyalCorgiCreatureClass(bm);

            // Initialize Grinning Cat manager
            const GrinningCatCreatureClass = (await import('./Creatures/grinningCat.js')).default;
            bm.grinningCatManager = new GrinningCatCreatureClass(bm);

            // Initialize Crum manager
            const CrumTheClassPetCreature = (await import('./Creatures/crumTheClassPet.js')).default;
            bm.crumTheClassPetManager = new CrumTheClassPetCreature(bm);

            // Initialize Cold-Hearted Yuki-Onna manager
            const ColdHeartedYukiOnnaCreature = (await import('./Creatures/cold-HeartedYuki-Onna.js')).default;
            bm.coldHeartedYukiOnnaManager = new ColdHeartedYukiOnnaCreature(bm);

        } catch (error) {
            // Initialize fallback null managers to prevent undefined errors
            if (!bm.jigglesManager) bm.jigglesManager = null;
            if (!bm.skeletonArcherManager) bm.skeletonArcherManager = null;
            if (!bm.skeletonNecromancerManager) bm.skeletonNecromancerManager = null;
            if (!bm.skeletonDeathKnightManager) bm.skeletonDeathKnightManager = null;
            if (!bm.skeletonReaperManager) bm.skeletonReaperManager = null;
            if (!bm.royalCorgiManager) bm.royalCorgiManager = null;
            if (!bm.crumTheClassPetManager) bm.crumTheClassPetManager = null;
            if (!bm.coldHeartedYukiOnnaManager) bm.coldHeartedYukiOnnaManager = null;
        }

        try {
            // Initialize Furious Anger effect
            const { initFuriousAngerEffect } = await import('./Spells/furiousAnger.js');
            bm.furiousAngerEffect = initFuriousAngerEffect(bm);
        } catch (error) {
            // Error handled silently
        }

        // Ensure randomness is initialized before battle starts
        if (bm.isAuthoritative && !bm.randomnessInitialized) {
            bm.initializeRandomness();
        }
        
        // Add randomness info to combat log
        if (bm.randomnessManager.isInitialized) {
            bm.addCombatLog(`🎲 Battle randomness initialized (seed: ${bm.randomnessManager.seed.slice(0, 8)}...)`, 'info');
        }
        
        // Log pre-calculated hero stats instead of recalculating
        this.logPreCalculatedHeroStats();
        
        // ============================================
        // CHECKPOINT #1: After battle initialization
        // ============================================
        if (bm.isAuthoritative && bm.checkpointSystem) {
            try {
                await bm.checkpointSystem.createBattleCheckpoint('battle_start');
                bm.addCombatLog('💾 Initial battle state saved', 'system');
            } catch (error) {
                // Error handled silently
            }
        }
        
        // ============================================
        // APPLY ALL START-OF-BATTLE EFFECTS (CENTRALIZED)
        // ============================================
        await this.battleStartManager.applyAllStartOfBattleEffects();
        
        // Final visual refresh after all start effects
        await this.battleStartManager.refreshAllVisuals();
        
        // ============================================
        // CHECKPOINT #2: After all start-of-battle effects
        // ============================================
        if (bm.isAuthoritative && bm.checkpointSystem) {
            try {
                await bm.checkpointSystem.createBattleCheckpoint('effects_complete');
            } catch (error) {
                // Error handled silently
            }
        }
        
        // Save battle state to persistence (legacy system - still works as fallback)
        await bm.saveBattleStateToPersistence();
        
        // Start the battle loop
        if (bm.isAuthoritative) {
            if (!bm.opponentConnected) {
                bm.pauseBattle('Opponent not connected at battle start');
            } else {
                await bm.delay(50);
                this.authoritative_battleLoop();
            }
        }
    }

    // Log pre-calculated hero stats instead of manually calculating
    logPreCalculatedHeroStats() {
        const bm = this.battleManager;
        
        // Stats logging removed - functionality preserved for any dependencies
    }

    // Battle loop with connection awareness and persistence
    async authoritative_battleLoop() {
        const bm = this.battleManager;
        
        if (!bm.isAuthoritative) {
            return;
        }

        // Mark that battle loop is starting
        if (bm.networkManager) {
            if (bm.networkManager.battleLoopRunning) {
                return;
            }
            bm.networkManager.battleLoopRunning = true;
        }

        try {
            while (bm.battleActive && !this.checkBattleEnd()) {
                if (!bm.opponentConnected) {
                    bm.pauseBattle('Opponent disconnected');
                    break; // Exit loop when paused
                }

                if (bm.battlePaused) {
                    break; // Exit loop when paused
                }

                // Check for Ice Age pause
                if (bm.iceAgeInProgress) {
                    // Wait for Ice Age to complete
                    await bm.delay(500);
                    continue;
                }

                bm.currentTurn++;
                bm.addCombatLog(`⚔️ Turn ${bm.currentTurn} begins`, 'info');
                
                bm.sendBattleUpdate('turn_start', { turn: bm.currentTurn });
                            
                // Process all positions for this turn
                for (const position of ['left', 'center', 'right']) {
                    if (!bm.battleActive || this.checkBattleEnd()) break;
                    
                    if (!bm.opponentConnected) {
                        bm.pauseBattle('Opponent disconnected during turn');
                        break;
                    }
                    
                    if (bm.battlePaused) {
                        break;
                    }

                    // Check for Ice Age pause during position processing
                    if (bm.iceAgeInProgress) {
                        // Wait for Ice Age to complete
                        while (bm.iceAgeInProgress && bm.battleActive) {
                            await bm.delay(100);
                        }
                        // If battle ended during Ice Age, break out
                        if (!bm.battleActive || this.checkBattleEnd()) break;
                    }
                    
                    await this.authoritative_processTurnForPosition(position);
                
                    await bm.delay(10);
                }

                // Apply end-of-round Gathering Storm damage
                if (bm.gatheringStormEffect && bm.gatheringStormEffect.isActive) {
                    try {
                        const { applyEndOfRoundGatheringStorm } = await import('./Spells/gatheringStorm.js');
                        await applyEndOfRoundGatheringStorm(bm);
                        await bm.delay(500);
                        if (this.checkBattleEnd()) break;
                    } catch (error) {
                        console.error('Error applying end-of-round storm damage:', error);
                    }
                }
                
                // Exit if battle was paused during turn processing
                if (bm.battlePaused || !bm.opponentConnected) {
                    break;
                }
                
                // Create checkpoint at end of turn
                if (bm.checkpointSystem) {
                    try {
                        await bm.checkpointSystem.createBattleCheckpoint('turn_end');
                    } catch (error) {
                        // Error handled silently
                    }
                }
                
                await bm.delay(10);
            }
        } catch (error) {
            // Error handled silently
        } finally {
            // ADDED: Always clear the running flag when loop exits
            if (bm.networkManager) {
                bm.networkManager.battleLoopRunning = false;
            }
        }
        
        // Only handle battle end if we're still in an active state
        if (bm.battleActive && this.checkBattleEnd()) {
            await bm.delay(200);
            bm.handleBattleEnd();
        }
    }

    // Process turn for a specific position with creatures
    async authoritative_processTurnForPosition(position) {
        const bm = this.battleManager;
        
        if (!bm.isAuthoritative) return;

        bm.turnInProgress = true;
        
        const playerHero = bm.playerHeroes[position];
        const opponentHero = bm.opponentHeroes[position];
        
        const playerCanAct = playerHero && playerHero.alive;
        const opponentCanAct = opponentHero && opponentHero.alive;
        
        if (!playerCanAct && !opponentCanAct) {
            bm.turnInProgress = false;
            return;
        }

        // Build complete actor lists for both sides
        const playerActors = this.buildActorList(playerHero, playerCanAct);
        const opponentActors = this.buildActorList(opponentHero, opponentCanAct);
        
        // Process all actors in paired sequence
        const maxActors = Math.max(playerActors.length, opponentActors.length);
        
        for (let i = 0; i < maxActors; i++) {
            // Check if battle should end before processing more actors
            if (this.checkBattleEnd()) {
                break;
            }

            // Check for Ice Age pause during actor processing
            if (bm.iceAgeInProgress) {
                // Wait for Ice Age to complete
                while (bm.iceAgeInProgress && bm.battleActive) {
                    await bm.delay(100);
                }
                // If battle ended during Ice Age, break out
                if (!bm.battleActive || this.checkBattleEnd()) break;
            }
            
            // Get actors for this iteration
            let playerActor = playerActors[i] || null;
            let opponentActor = opponentActors[i] || null;
            
            // FILTER OUT DEAD ACTORS before they act
            if (playerActor && !this.isActorAlive(playerActor)) {
                playerActor = null;
            }
            
            if (opponentActor && !this.isActorAlive(opponentActor)) {
                opponentActor = null;
            }
            
            // Skip if both actors are dead/invalid
            if (!playerActor && !opponentActor) continue;
            
            // Send actor action update
            const actorActionData = {
                position: position,
                playerActor: playerActor ? {
                    type: playerActor.type,
                    name: playerActor.name,
                    index: playerActor.index,
                    side: 'player'
                } : null,
                opponentActor: opponentActor ? {
                    type: opponentActor.type,
                    name: opponentActor.name,
                    index: opponentActor.index,
                    side: 'opponent'
                } : null
            };
            
            bm.sendBattleUpdate('actor_action', actorActionData);
            
            // Execute actor actions
            await this.executeActorActions(playerActor, opponentActor, position);
            
            await bm.delay(300); // Brief pause between actor pairs (now speed-adjusted)
        }
        
        
        // Clear temporary modifiers at end of turn
        this.clearTurnModifiers(playerHero, opponentHero, position);
        
        // Smart delay: Only wait if TheStormblade animations are actually playing
        if (this.battleManager.attackEffectsManager && 
            this.battleManager.attackEffectsManager.hasActiveStormbladeAnimations()) {
            
            await this.battleManager.attackEffectsManager.waitForStormbladeAnimations();
        }

        // ============================================
        // Process cavalry movements at end of position
        // ============================================
        if (this.cavalryManager) {
            await this.cavalryManager.processEndOfPositionMovements(position);
        }

        bm.turnInProgress = false;
    }

    // Check if an actor is alive
    isActorAlive(actor) {
        if (!actor) return false;
        
        if (actor.type === 'hero') {
            return actor.data && actor.data.alive;
        } else if (actor.type === 'creature') {
            // Check if the creature is still alive
            return actor.data && actor.data.alive;
        }
        
        return false;
    }

    // Build actor list for a hero
    buildActorList(hero, canAct) {
        const actors = [];
        
        if (!canAct || !hero) return actors;
        
        // Add living creatures in NORMAL order (first creature first)
        // This matches the targeting order where heroes target the first creature first
        const livingCreatures = hero.creatures.filter(c => c.alive);
        
        // Process creatures in normal order - first creature acts first
        for (let i = 0; i < livingCreatures.length; i++) {
            const creature = livingCreatures[i];
            const originalIndex = hero.creatures.indexOf(creature);
            
            actors.push({
                type: 'creature',
                name: creature.name,
                data: creature,
                index: originalIndex, // Keep the original index for targeting
                hero: hero
            });
        }
        
        // Add hero last (after all creatures have acted)
        actors.push({
            type: 'hero',
            name: hero.name,
            data: hero,
            hero: hero
        });
        
        return actors;
    }

    // Execute actor actions (with Ice Age support)
    async executeActorActions(playerActor, opponentActor, position) {
        const bm = this.battleManager;
        
        // Check for Ice Age pause before executing actions
        if (bm.iceAgeInProgress) {
            // Wait for Ice Age to complete
            while (bm.iceAgeInProgress && bm.battleActive) {
                await bm.delay(100);
            }
            // If battle ended during Ice Age, return
            if (!bm.battleActive || this.checkBattleEnd()) return;
        }
        
        // ============================================
        // REMEMBER ORIGINAL ACTORS FOR STATUS EFFECTS
        // ============================================
        
        // Remember original actors before filtering for stun/freeze
        // This ensures that stunned/frozen actors still get status effect processing
        const originalPlayerActor = playerActor;
        const originalOpponentActor = opponentActor;
        
        // ============================================
        // STATUS EFFECTS: Check action restrictions
        // ============================================
        
        // Check if player actor can take action (not stunned/frozen)
        if (playerActor && bm.statusEffectsManager && !bm.statusEffectsManager.canTakeAction(playerActor.data)) {
            const stunned = bm.statusEffectsManager.hasStatusEffect(playerActor.data, 'stunned');
            const frozen = bm.statusEffectsManager.hasStatusEffect(playerActor.data, 'frozen');
            
            if (stunned) {
                bm.statusEffectsManager.processTurnSkip(playerActor.data, 'stunned');
            } else if (frozen) {
                bm.statusEffectsManager.processTurnSkip(playerActor.data, 'frozen');
            }
            
            playerActor = null; // Skip this actor's turn
        }
        
        // Check if opponent actor can take action (not stunned/frozen)
        if (opponentActor && bm.statusEffectsManager && !bm.statusEffectsManager.canTakeAction(opponentActor.data)) {
            const stunned = bm.statusEffectsManager.hasStatusEffect(opponentActor.data, 'stunned');
            const frozen = bm.statusEffectsManager.hasStatusEffect(opponentActor.data, 'frozen');
            
            if (stunned) {
                bm.statusEffectsManager.processTurnSkip(opponentActor.data, 'stunned');
            } else if (frozen) {
                bm.statusEffectsManager.processTurnSkip(opponentActor.data, 'frozen');
            }
            
            opponentActor = null; // Skip this actor's turn
        }

        // ============================================
        // ALICE'S LASER EFFECT: Trigger at START of turn (before actions)
        // ============================================

        // Check if Alice is about to take an action and trigger her laser first
        if (originalPlayerActor && originalPlayerActor.type === 'hero' && 
            originalPlayerActor.data && originalPlayerActor.data.name === 'Alice' && 
            originalPlayerActor.data.alive) {
            
            // Import and trigger Alice's laser effect BEFORE her actual action
            try {
                const { AliceHeroEffect } = await import('./Heroes/alice.js');
                await AliceHeroEffect.checkAliceActionEffect(originalPlayerActor.data, bm);
            } catch (error) {
                // Error handled silently
            }
        }

        if (originalOpponentActor && originalOpponentActor.type === 'hero' && 
            originalOpponentActor.data && originalOpponentActor.data.name === 'Alice' && 
            originalOpponentActor.data.alive) {
            
            // Import and trigger Alice's laser effect BEFORE her actual action
            try {
                const { AliceHeroEffect } = await import('./Heroes/alice.js');
                await AliceHeroEffect.checkAliceActionEffect(originalOpponentActor.data, bm);
            } catch (error) {
                // Error handled silently
            }
        }
        
        // ============================================
        // EXISTING ACTOR ACTION LOGIC
        // ============================================
        
        const actions = [];
        let hasSpecialAttacks = false;
        let hasHeroActions = false;
        
        // Collect all creature actions (including all special creature attacks)
        if (playerActor && playerActor.type === 'creature') {
            try {
                // Import creature classes with error handling
                const JigglesCreature = (await import('./Creatures/jiggles.js')).default;
                const SkeletonArcherCreature = (await import('./Creatures/skeletonArcher.js')).default;
                const SkeletonNecromancerCreature = (await import('./Creatures/skeletonNecromancer.js')).default;
                const SkeletonDeathKnightCreature = (await import('./Creatures/skeletonDeathKnight.js')).default;
                const BurningSkeletonCreature = (await import('./Creatures/burningSkeleton.js')).default;
                const SkeletonReaperCreature = (await import('./Creatures/skeletonReaper.js')).default;
                const SkeletonBardCreature = (await import('./Creatures/skeletonBard.js')).default;
                const SkeletonMageCreature = (await import('./Creatures/skeletonMage.js')).default;
                const BoulderCreature = (await import('./Creatures/boulder.js')).default;
                const FrontSoldierCreature = (await import('./Creatures/frontSoldier.js')).default; 
                const ArcherCreature = (await import('./Creatures/archer.js')).default; 
                const MoonlightButterflyCreature = (await import('./Creatures/moonlightButterfly.js')).default;
                const RoyalCorgiCreature = (await import('./Creatures/royalCorgi.js')).default;
                const GrinningCatCreature = (await import('./Creatures/grinningCat.js')).default;
                const CrumTheClassPetCreature = (await import('./Creatures/crumTheClassPet.js')).default;
                const ColdHeartedYukiOnnaCreature = (await import('./Creatures/cold-HeartedYuki-Onna.js')).default;

                if (JigglesCreature.isJiggles(playerActor.name)) {
                    if (bm.jigglesManager) {
                        actions.push(bm.jigglesManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`✨ ${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonArcherCreature.isSkeletonArcher(playerActor.name)) {
                    if (bm.skeletonArcherManager) {
                        actions.push(bm.skeletonArcherManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`💀 ${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonNecromancerCreature.isSkeletonNecromancer(playerActor.name)) {
                    if (bm.skeletonNecromancerManager) {
                        actions.push(bm.skeletonNecromancerManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`🧙 ${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonDeathKnightCreature.isSkeletonDeathKnight(playerActor.name)) {
                    if (bm.skeletonDeathKnightManager) {
                        actions.push(bm.skeletonDeathKnightManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`⚔️ ${playerActor.name} activates!`, 'success');
                    }
                } else if (BurningSkeletonCreature.isBurningSkeleton(playerActor.name)) {
                    if (bm.burningSkeletonManager) {
                        actions.push(bm.burningSkeletonManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`🔥 ${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonReaperCreature.isSkeletonReaper(playerActor.name)) {
                    if (bm.skeletonReaperManager) {
                        actions.push(bm.skeletonReaperManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`💀 ${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonBardCreature.isSkeletonBard(playerActor.name)) {
                    if (bm.skeletonBardManager) {
                        actions.push(bm.skeletonBardManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`🎵 ${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonMageCreature.isSkeletonMage(playerActor.name)) {
                    if (bm.skeletonMageManager) {
                        actions.push(bm.skeletonMageManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`✨ ${playerActor.name} activates!`, 'success');
                    }
                } else if (BoulderCreature.isBoulder(playerActor.name)) {
                    if (!bm.boulderManager) {
                        bm.boulderManager = new BoulderCreature(bm);
                    }
                    actions.push(bm.boulderManager.executeSpecialAttack(playerActor, position));
                    hasSpecialAttacks = true;
                } else if (ArcherCreature.isArcher(playerActor.name)) {
                    if (bm.archerManager) {
                        actions.push(bm.archerManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`🏹 ${playerActor.name} activates!`, 'success');
                    }
                } else if (FrontSoldierCreature.isFrontSoldier(playerActor.name)) {
                    if (bm.frontSoldierManager) {
                        actions.push(bm.frontSoldierManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`🛡️ ${playerActor.name} activates!`, 'success');
                    }
                } else if (RoyalCorgiCreature.isRoyalCorgi(playerActor.name)) {
                    if (bm.royalCorgiManager) {
                        actions.push(bm.royalCorgiManager.executeRoyalCorgiAction(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`🐕 ${playerActor.name} activates!`, 'success');
                    }
                } else if (MoonlightButterflyCreature.isMoonlightButterfly(playerActor.name)) {
                    if (!bm.moonlightButterflyManager) {
                        bm.moonlightButterflyManager = new MoonlightButterflyCreature(bm);
                    }
                    actions.push(bm.moonlightButterflyManager.executeMoonlightButterflyAction(playerActor, position));
                    hasSpecialAttacks = true;
                } else if (CrumTheClassPetCreature.isCrumTheClassPet(playerActor.name)) {
                    if (!bm.crumTheClassPetManager) {
                        bm.crumTheClassPetManager = new CrumTheClassPetCreature(bm);
                    }
                    actions.push(bm.crumTheClassPetManager.executeCrumTheClassPetAction(playerActor, position));
                    hasSpecialAttacks = true;
                } else if (ColdHeartedYukiOnnaCreature.isColdHeartedYukiOnna(playerActor.name)) {
                    if (bm.coldHeartedYukiOnnaManager) {
                        actions.push(bm.coldHeartedYukiOnnaManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`❄️ ${playerActor.name} activates!`, 'success');
                    }
                } else if (GrinningCatCreature.isGrinningCat(playerActor.name)) {
                    if (bm.grinningCatManager) {
                        actions.push(bm.grinningCatManager.executeGrinningCatAction(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`😸 ${playerActor.name} activates!`, 'success');
                    }
                } else {
                    actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                    bm.addCombatLog(`✨ ${playerActor.name} activates!`, 'success');
                }
            } catch (error) {
                actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                bm.addCombatLog(`✨ ${playerActor.name} activates!`, 'success');
            }
        }

        if (opponentActor && opponentActor.type === 'creature') {
            try {
                // Import creature classes with error handling
                const JigglesCreature = (await import('./Creatures/jiggles.js')).default;
                const SkeletonArcherCreature = (await import('./Creatures/skeletonArcher.js')).default;
                const SkeletonNecromancerCreature = (await import('./Creatures/skeletonNecromancer.js')).default;
                const SkeletonDeathKnightCreature = (await import('./Creatures/skeletonDeathKnight.js')).default;
                const BurningSkeletonCreature = (await import('./Creatures/burningSkeleton.js')).default;
                const SkeletonReaperCreature = (await import('./Creatures/skeletonReaper.js')).default;
                const SkeletonBardCreature = (await import('./Creatures/skeletonBard.js')).default;
                const SkeletonMageCreature = (await import('./Creatures/skeletonMage.js')).default;
                const FrontSoldierCreature = (await import('./Creatures/frontSoldier.js')).default;
                const ArcherCreature = (await import('./Creatures/archer.js')).default;
                const MoonlightButterflyCreature = (await import('./Creatures/moonlightButterfly.js')).default;
                const RoyalCorgiCreature = (await import('./Creatures/royalCorgi.js')).default;
                const GrinningCatCreature = (await import('./Creatures/grinningCat.js')).default;
                const CrumTheClassPetCreature = (await import('./Creatures/crumTheClassPet.js')).default;
                const ColdHeartedYukiOnnaCreature = (await import('./Creatures/cold-HeartedYuki-Onna.js')).default;

                if (JigglesCreature.isJiggles(opponentActor.name)) {
                    if (bm.jigglesManager) {
                        actions.push(bm.jigglesManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`✨ ${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonArcherCreature.isSkeletonArcher(opponentActor.name)) {
                    if (bm.skeletonArcherManager) {
                        actions.push(bm.skeletonArcherManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`💀 ${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonNecromancerCreature.isSkeletonNecromancer(opponentActor.name)) {
                    if (bm.skeletonNecromancerManager) {
                        actions.push(bm.skeletonNecromancerManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`🧙 ${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonDeathKnightCreature.isSkeletonDeathKnight(opponentActor.name)) {
                    if (bm.skeletonDeathKnightManager) {
                        actions.push(bm.skeletonDeathKnightManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`⚔️ ${opponentActor.name} activates!`, 'error');
                    }
                } else if (BurningSkeletonCreature.isBurningSkeleton(opponentActor.name)) {
                    if (bm.burningSkeletonManager) {
                        actions.push(bm.burningSkeletonManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`🔥 ${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonReaperCreature.isSkeletonReaper(opponentActor.name)) {
                    if (bm.skeletonReaperManager) {
                        actions.push(bm.skeletonReaperManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`💀 ${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonBardCreature.isSkeletonBard(opponentActor.name)) {
                    if (bm.skeletonBardManager) {
                        actions.push(bm.skeletonBardManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`🎵 ${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonMageCreature.isSkeletonMage(opponentActor.name)) {
                    if (bm.skeletonMageManager) {
                        actions.push(bm.skeletonMageManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`✨ ${opponentActor.name} activates!`, 'error');
                    }
                } else if (FrontSoldierCreature.isFrontSoldier(opponentActor.name)) {
                    if (bm.frontSoldierManager) {
                        actions.push(bm.frontSoldierManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`🛡️ ${opponentActor.name} activates!`, 'error');
                    }
                } else if (ArcherCreature.isArcher(opponentActor.name)) {
                    if (bm.archerManager) {
                        actions.push(bm.archerManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`🏹 ${opponentActor.name} activates!`, 'error');
                    }
                } else if (MoonlightButterflyCreature.isMoonlightButterfly(opponentActor.name)) {
                    if (!bm.moonlightButterflyManager) {
                        bm.moonlightButterflyManager = new MoonlightButterflyCreature(bm);
                    }
                    actions.push(bm.moonlightButterflyManager.executeMoonlightButterflyAction(opponentActor, position));
                    hasSpecialAttacks = true;
                } else if (RoyalCorgiCreature.isRoyalCorgi(opponentActor.name)) {
                    if (bm.royalCorgiManager) {
                        actions.push(bm.royalCorgiManager.executeRoyalCorgiAction(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`🐕 ${opponentActor.name} activates!`, 'error');
                    }
                } else if (CrumTheClassPetCreature.isCrumTheClassPet(opponentActor.name)) {
                    if (!bm.crumTheClassPetManager) {
                        bm.crumTheClassPetManager = new CrumTheClassPetCreature(bm);
                    }
                    actions.push(bm.crumTheClassPetManager.executeCrumTheClassPetAction(opponentActor, position));
                    hasSpecialAttacks = true;
                } else if (ColdHeartedYukiOnnaCreature.isColdHeartedYukiOnna(opponentActor.name)) {
                    if (bm.coldHeartedYukiOnnaManager) {
                        actions.push(bm.coldHeartedYukiOnnaManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`❄️ ${opponentActor.name} activates!`, 'error');
                    }
                } else if (GrinningCatCreature.isGrinningCat(opponentActor.name)) {
                    if (bm.grinningCatManager) {
                        actions.push(bm.grinningCatManager.executeGrinningCatAction(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`😸 ${opponentActor.name} activates!`, 'error');
                    }
                } else {
                    actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                    bm.addCombatLog(`✨ ${opponentActor.name} activates!`, 'error');
                }
            } catch (error) {
                actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                bm.addCombatLog(`✨ ${opponentActor.name} activates!`, 'error');
            }
        }
        
        // Check if we have hero actions to execute
        if ((playerActor && playerActor.type === 'hero') || 
            (opponentActor && opponentActor.type === 'hero')) {
            hasHeroActions = true;
        }
        
        // If we have both special attacks and hero actions, start them simultaneously
        if (hasSpecialAttacks && hasHeroActions) {            
            // Start hero actions without awaiting
            const playerHeroAction = playerActor && playerActor.type === 'hero' ? playerActor : null;
            const opponentHeroAction = opponentActor && opponentActor.type === 'hero' ? opponentActor : null;
            
            const heroActionPromise = bm.executeHeroActions(playerHeroAction, opponentHeroAction, position);
            
            // Add hero actions to the actions array
            actions.push(heroActionPromise);
            
            // Wait for all actions (special attacks + heroes) to complete simultaneously
            await Promise.all(actions);
            
            // Check if battle ended after all actions
            if (this.checkBattleEnd()) {
                return;
            }
        } 
        // If we only have special attacks (no heroes), execute them and check battle end
        else if (hasSpecialAttacks) {
            await Promise.all(actions);
            
            // Check if battle ended after special attacks
            if (this.checkBattleEnd()) {
                return;
            }
        }
        // If we only have hero actions (no special attacks), execute them normally
        else if (hasHeroActions) {
            // Final check before hero actions - but NOT preventing execution
            // Just logging that battle might end with these actions
            if (this.checkBattleEnd()) {
                // Battle may end with these hero actions - still executing to record kills
            }
            
            const playerHeroAction = playerActor && playerActor.type === 'hero' ? playerActor : null;
            const opponentHeroAction = opponentActor && opponentActor.type === 'hero' ? opponentActor : null;
            
            await bm.executeHeroActions(playerHeroAction, opponentHeroAction, position);
        }
        // If we only have regular creature actions, execute them
        else if (actions.length > 0) {
            await Promise.all(actions);
        }
        
        // ============================================
        // STATUS EFFECTS: Post-turn processing
        // ============================================
        
        // Process status effects after actor actions complete
        // This handles poison damage, burn damage, silenced duration, etc.
        // Process for ALL original actors, not just those that acted
        // This ensures that stunned/frozen actors still take poison and burn damage
        if (bm.statusEffectsManager) {
            const statusEffectPromises = [];
            
            // Process status effects for ALL original actors (including stunned/frozen)
            // This is the key fix - we use originalPlayerActor and originalOpponentActor
            // instead of the potentially null playerActor and opponentActor
            if (originalPlayerActor && originalPlayerActor.data && originalPlayerActor.data.alive) {
                statusEffectPromises.push(
                    bm.statusEffectsManager.processStatusEffectsAfterTurn(originalPlayerActor.data)
                );
            }
            
            if (originalOpponentActor && originalOpponentActor.data && originalOpponentActor.data.alive) {
                statusEffectPromises.push(
                    bm.statusEffectsManager.processStatusEffectsAfterTurn(originalOpponentActor.data)
                );
            }
            
            // Wait for all status effect processing to complete
            if (statusEffectPromises.length > 0) {
                await Promise.all(statusEffectPromises);
                
                // Small delay after status effects for visual clarity
                await bm.delay(200);
            }
        }
        
        // ============================================
        // FINAL BATTLE STATE CHECK
        // ============================================
        
        // Final check if battle ended due to status effect damage
        if (this.checkBattleEnd()) {
            return;
        }
    }

    // Clear temporary modifiers at end of turn
    clearTurnModifiers(playerHero, opponentHero, position) {
        const bm = this.battleManager;
        
        if (playerHero) {
            playerHero.clearTemporaryModifiers();
            bm.updateHeroAttackDisplay('player', position, playerHero);
        }
        if (opponentHero) {
            opponentHero.clearTemporaryModifiers();
            bm.updateHeroAttackDisplay('opponent', position, opponentHero);
        }
    }

    // Check if battle should end
    checkBattleEnd() {
        const bm = this.battleManager;
        
        const playerHeroesAlive = Object.values(bm.playerHeroes).filter(hero => hero && hero.alive);
        const opponentHeroesAlive = Object.values(bm.opponentHeroes).filter(hero => hero && hero.alive);
        
        const playerAlive = playerHeroesAlive.length > 0;
        const opponentAlive = opponentHeroesAlive.length > 0;
        
        return !playerAlive || !opponentAlive;
    }
}

export default BattleFlowManager;