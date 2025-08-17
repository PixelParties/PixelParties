// battleFlowManager.js - Battle Flow Control Module with Ice Age Pause Support
// Handles the main battle flow, turn processing, and actor management

import CavalryCreature from './Creatures/cavalry.js';

import { applyArrowStartOfBattleEffects } from './arrowSystem.js';

export class BattleFlowManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.cavalryManager = null;
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
        
        
        // ============================================
        // ARROWS - UPDATED TO USE ARROW SYSTEM
        // Each player needs to initialize their own counters
        // ============================================
        applyArrowStartOfBattleEffects(bm);


        // Initialize Diplomacy manager
        const { DiplomacyManager } = await import('./Abilities/diplomacy.js');
        bm.diplomacyManager = new DiplomacyManager(bm);
        console.log(' Diplomacy manager initialized');
        
        // CREATURES - Initialize creature managers with better error handling
        
        // Initialize Cavalry manager
        try {
            this.cavalryManager = new CavalryCreature(bm);
            console.log(' Cavalry manager initialized');
        } catch (error) {
            console.error('Error initializing cavalry manager:', error);
            this.cavalryManager = null;
        }

        // Initialize Monia protection effect
        try {
            const { MoniaHeroEffect } = await import('./Heroes/monia.js');
            bm.moniaEffect = new MoniaHeroEffect(bm);
            console.log('🛡️ Monia protection effect initialized');
        } catch (error) {
            console.error('⚠️ Error initializing Monia protection effect:', error);
            bm.moniaEffect = null;
        }

        try {
            // Initialize Jiggles manager
            const JigglesCreature = (await import('./Creatures/jiggles.js')).default;
            bm.jigglesManager = new JigglesCreature(bm);
            console.log(' Jiggles manager initialized');

            // Initialize Skeleton Archer manager
            const SkeletonArcherCreature = (await import('./Creatures/skeletonArcher.js')).default;
            bm.skeletonArcherManager = new SkeletonArcherCreature(bm);
            console.log(' Skeleton Archer manager initialized');

            // Initialize Skeleton Necromancer manager
            const SkeletonNecromancerCreature = (await import('./Creatures/skeletonNecromancer.js')).default;
            bm.skeletonNecromancerManager = new SkeletonNecromancerCreature(bm);
            console.log(' Skeleton Necromancer manager initialized');

            // Initialize Skeleton Death Knight manager
            const SkeletonDeathKnightCreature = (await import('./Creatures/skeletonDeathKnight.js')).default;
            bm.skeletonDeathKnightManager = new SkeletonDeathKnightCreature(bm);
            console.log(' Skeleton Death Knight manager initialized');

            // Initialize Burning Skeleton manager
            const BurningSkeletonCreature = (await import('./Creatures/burningSkeleton.js')).default;
            bm.burningSkeletonManager = new BurningSkeletonCreature(bm);
            console.log(' Burning Skeleton manager initialized');
            
            // Initialize Skeleton Reaper manager
            const SkeletonReaperCreature = (await import('./Creatures/skeletonReaper.js')).default;
            bm.skeletonReaperManager = new SkeletonReaperCreature(bm);
            console.log(' Skeleton Reaper manager initialized');

            // Initialize Skeleton Bard manager
            const SkeletonBardCreature = (await import('./Creatures/skeletonBard.js')).default;
            bm.skeletonBardManager = new SkeletonBardCreature(bm);
            console.log(' Skeleton Bard manager initialized');

            // Initialize Skeleton Mage manager
            const SkeletonMageCreature = (await import('./Creatures/skeletonMage.js')).default;
            bm.skeletonMageManager = new SkeletonMageCreature(bm);
            console.log(' Skeleton Mage manager initialized');

            // Initialize Front Soldier manager
            const FrontSoldierCreature = (await import('./Creatures/frontSoldier.js')).default;
            bm.frontSoldierManager = new FrontSoldierCreature(bm);
            console.log(' Front Soldier manager initialized');

            // Initialize Archer manager
            const ArcherCreature = (await import('./Creatures/archer.js')).default;
            bm.archerManager = new ArcherCreature(bm);
            console.log(' Archer manager initialized');

            // Initialize Royal Corgi manager
            const RoyalCorgiCreatureClass = (await import('./Creatures/royalCorgi.js')).default;
            bm.royalCorgiManager = new RoyalCorgiCreatureClass(bm);
            console.log(' Royal Corgi manager initialized');

            // Initialize Crum manager
            const CrumTheClassPetCreature = (await import('./Creatures/crumTheClassPet.js')).default;
            bm.crumTheClassPetManager = new CrumTheClassPetCreature(bm);
            console.log(' Crum manager initialized');

            // Initialize Cold-Hearted Yuki-Onna manager
            const ColdHeartedYukiOnnaCreature = (await import('./Creatures/cold-HeartedYuki-Onna.js')).default;
            bm.coldHeartedYukiOnnaManager = new ColdHeartedYukiOnnaCreature(bm);
            console.log('❄️ Cold-Hearted Yuki-Onna manager initialized');


            // Verify managers are properly set
            if (!bm.jigglesManager) {
                console.error('CRITICAL: Jiggles manager failed to initialize!');
            }
            if (!bm.skeletonArcherManager) {
                console.error('CRITICAL: Skeleton Archer manager failed to initialize!');
            }
            if (!bm.skeletonNecromancerManager) {
                console.error('CRITICAL: Skeleton Necromancer manager failed to initialize!');
            }
            if (!bm.skeletonDeathKnightManager) {
                console.error('CRITICAL: Skeleton Death Knight manager failed to initialize!');
            }
            if (!bm.burningSkeletonManager) {
                console.error('CRITICAL: Burning Skeleton manager failed to initialize!');
            }
            if (!bm.skeletonReaperManager) {
                console.error('CRITICAL: Skeleton Reaper manager failed to initialize!');
            }
            if (!bm.skeletonBardManager) {
                console.error('CRITICAL: Skeleton Bard manager failed to initialize!');
            }
            if (!bm.skeletonMageManager) {
                console.error('CRITICAL: Skeleton Mage manager failed to initialize!');
            }
            
        } catch (error) {
            console.error('CRITICAL: Error initializing creature managers:', error);
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
            console.log('ðŸ”¥ Furious Anger effect initialized');
        } catch (error) {
            console.error('âš ï¸ Error initializing Furious Anger effect:', error);
        }

        // Ensure randomness is initialized before battle starts
        if (bm.isAuthoritative && !bm.randomnessInitialized) {
            bm.initializeRandomness();
        }
        
        // Add randomness info to combat log
        if (bm.randomnessManager.isInitialized) {
            bm.addCombatLog(`ðŸŽ² Battle randomness initialized (seed: ${bm.randomnessManager.seed.slice(0, 8)}...)`, 'info');
        }
        
        // Log pre-calculated hero stats instead of recalculating
        this.logPreCalculatedHeroStats();
        
        // ============================================
        // CHECKPOINT #1: After battle initialization
        // ============================================
        if (bm.isAuthoritative && bm.checkpointSystem) {
            try {
                await bm.checkpointSystem.createBattleCheckpoint('battle_start');
                bm.addCombatLog('ðŸ“ Initial battle state saved', 'system');
            } catch (error) {
                console.error('Failed to create battle_start checkpoint:', error);
            }
        }
        
        // ============================================
        // Apply start-of-battle effects (HOST ONLY)
        // ============================================
        if (bm.isAuthoritative) {
            try {
            // Get both players' potion states from Firebase
                const potionStates = await bm.getBothPlayersPotionStates();
                
                // Let the potion handler deal with applying effects from both states
                if (window.potionHandler && potionStates) {
                    await window.potionHandler.applyBothPlayersPotionEffectsAtBattleStart(
                        potionStates.host, 
                        potionStates.guest, 
                        bm
                    );
                }
                console.log(' All potion effects applied successfully');

                if (bm.battleScreen && typeof bm.battleScreen.renderCreaturesAfterInit === 'function') {
                    bm.battleScreen.renderCreaturesAfterInit();
                    console.log('ðŸª¨ Re-rendered creatures after potion effects applied');
                }

                // Also update necromancy displays if boulders were added
                if (bm.necromancyManager) {
                    bm.necromancyManager.initializeNecromancyStackDisplays();
                }

                // Apply Diplomacy effects (creature recruitment)
                console.log('ðŸ¤ Applying Diplomacy effects at battle start...');
                if (bm.diplomacyManager) {
                    await bm.diplomacyManager.applyDiplomacyEffects();
                }

                // Re-render creatures after Diplomacy effects (creatures may have moved)
                if (bm.battleScreen && typeof bm.battleScreen.renderCreaturesAfterInit === 'function') {
                    bm.battleScreen.renderCreaturesAfterInit();
                    console.log('ðŸ¤ Re-rendered creatures after Diplomacy effects applied');
                }

                // Update necromancy displays if creatures were recruited
                if (bm.necromancyManager) {
                    bm.necromancyManager.initializeNecromancyStackDisplays();
                }

                // Apply Tharx HP bonus effects (after all creatures are in their final positions)
                console.log('âš”ï¸ Applying Tharx HP bonus effects at battle start...');
                const { TharxHeroEffect } = await import('./Heroes/tharx.js');
                TharxHeroEffect.applyTharxEffectsAtBattleStart(bm);

                // Re-render creatures after Tharx effects (HP values may have changed)
                if (bm.battleScreen && typeof bm.battleScreen.renderCreaturesAfterInit === 'function') {
                    bm.battleScreen.renderCreaturesAfterInit();
                    console.log('âš”ï¸ Re-rendered creatures after Tharx HP bonus effects applied');
                }

                // Update necromancy displays after HP changes
                if (bm.necromancyManager) {
                    bm.necromancyManager.initializeNecromancyStackDisplays();
                }

                // Apply delayed artifact effects from both players (like Poisoned Meat)
                console.log('ðŸ¥© Applying delayed artifact effects from both players at battle start...');
                const delayedEffects = await bm.getBothPlayersDelayedEffects();
                
                if (delayedEffects) {
                    const { applyBothPlayersDelayedEffects } = await import('./Artifacts/poisonedMeat.js');
                    await applyBothPlayersDelayedEffects(delayedEffects.host, delayedEffects.guest, bm);
                }

                console.log('ðŸ”¥ Applying Crusader Artifacts start-of-battle effects...');
                if (bm.crusaderArtifactsHandler) {
                    await bm.crusaderArtifactsHandler.applyStartOfBattleEffects();
                }

                try {
                    const { applySnowCannonBattleEffects } = await import('./Artifacts/snowCannon.js');
                    await applySnowCannonBattleEffects(bm);
                } catch (error) {
                    console.error(' Error applying Snow Cannon effects:', error);
                }

                try {
                    const { applyFieldStandardBattleEffects } = await import('./Artifacts/fieldStandard.js');
                    await applyFieldStandardBattleEffects(bm);
                } catch (error) {
                    console.error('Error applying Field Standard effects:', error);
                }
                
                console.log(' All start of battle effects applied successfully');
                
                // ============================================
                // CHECKPOINT #2: After all start-of-battle effects
                // ============================================
                if (bm.checkpointSystem) {
                    try {
                        await bm.checkpointSystem.createBattleCheckpoint('effects_complete');
                    } catch (error) {
                        console.error('Failed to create effects_complete checkpoint:', error);
                    }
                }
                
            } catch (error) {
                console.error(' Error applying battle start effects:', error);
                bm.addCombatLog('Some battle start effects failed to apply', 'warning');
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
        
        // Log player heroes
        console.log('PLAYER HEROES:');
        ['left', 'center', 'right'].forEach(position => {
            const hero = bm.playerHeroes[position];
            if (hero && hero.alive) {
                const currentAttack = hero.getCurrentAttack();
                const attackBonus = currentAttack - hero.baseAtk;
                const hpBonus = hero.maxHp - hero.baseMaxHp;
                
                console.log(`  ${hero.name} (${position}): ${hero.currentHp}/${hero.maxHp} HP (+${hpBonus}), ${currentAttack} ATK (+${attackBonus})`);
                
                // Log ability contributions to bonuses
                if (hero.hasAbility('Toughness')) {
                    const toughnessStacks = hero.getAbilityStackCount('Toughness');
                    console.log(`Toughness: ${toughnessStacks} stacks (+${toughnessStacks * 200} HP)`);
                }
                
                if (hero.hasAbility('Fighting')) {
                    const fightingStacks = hero.getAbilityStackCount('Fighting');
                    console.log(`Fighting: ${fightingStacks} stacks (+${fightingStacks * 10} ATK)`);
                }
                
                // Log Toras equipment bonus if applicable
                if (hero.name === 'Toras' && hero.equipment && hero.equipment.length > 0) {
                    const uniqueEquipment = new Set();
                    hero.equipment.forEach(item => {
                        const itemName = item.name || item.cardName;
                        if (itemName) uniqueEquipment.add(itemName);
                    });
                    const equipmentBonus = uniqueEquipment.size * 10;
                    console.log(`Equipment Mastery: ${uniqueEquipment.size} unique items (+${equipmentBonus} ATK)`);
                }
                
                // Log creature stats with SummoningMagic bonuses
                if (hero.creatures && hero.creatures.length > 0) {
                    const summoningMagicStacks = hero.getAbilityStackCount('SummoningMagic');
                    const hpMultiplier = 1 + (0.25 * summoningMagicStacks);
                    
                    console.log(`Creatures (${hero.creatures.length}):`);
                    hero.creatures.forEach((creature, index) => {
                        const status = creature.alive ? 'Ã¢Å“â€¦' : 'Ã°Å¸â€™â‚¬';
                        console.log(`${index + 1}. ${status} ${creature.name}: ${creature.currentHp}/${creature.maxHp} HP`);
                    });
                    
                    if (summoningMagicStacks > 0) {
                        console.log(`SummoningMagic: ${summoningMagicStacks} stacks (${hpMultiplier.toFixed(2)} creature HP)`);
                    }
                }
            }
        });
        
        // Log opponent heroes
        console.log('OPPONENT HEROES:');
        ['left', 'center', 'right'].forEach(position => {
            const hero = bm.opponentHeroes[position];
            if (hero && hero.alive) {
                const currentAttack = hero.getCurrentAttack();
                const attackBonus = currentAttack - hero.baseAtk;
                const hpBonus = hero.maxHp - hero.baseMaxHp;
                
                console.log(`  ${hero.name} (${position}): ${hero.currentHp}/${hero.maxHp} HP (+${hpBonus}), ${currentAttack} ATK (+${attackBonus})`);
                
                // Log creature count
                if (hero.creatures && hero.creatures.length > 0) {
                    const aliveCreatures = hero.creatures.filter(c => c.alive).length;
                    console.log(`Creatures: ${aliveCreatures}/${hero.creatures.length} alive`);
                }
            }
        });
    }

    // Battle loop with connection awareness and persistence
    async authoritative_battleLoop() {
        const bm = this.battleManager;
        
        if (!bm.isAuthoritative) {
            console.error('NON-AUTHORITATIVE client tried to run battle loop!');
            return;
        }

        while (bm.battleActive && !this.checkBattleEnd()) {
            if (!bm.opponentConnected) {
                bm.pauseBattle('Opponent disconnected');
                return;
            }

            if (bm.battlePaused) {
                return;
            }

            // Check for Ice Age pause
            if (bm.iceAgeInProgress) {
                console.log('Battle loop paused due to Ice Age in progress');
                // Wait for Ice Age to complete
                await bm.delay(500);
                continue;
            }

            bm.currentTurn++;
            bm.addCombatLog(`Turn ${bm.currentTurn} begins`, 'info');
            
            bm.sendBattleUpdate('turn_start', { turn: bm.currentTurn });
                        
            // Process all positions for this turn
            for (const position of ['left', 'center', 'right']) {
                if (!bm.battleActive || this.checkBattleEnd()) break;
                
                if (!bm.opponentConnected) {
                    bm.pauseBattle('Opponent disconnected during turn');
                    return;
                }
                
                if (bm.battlePaused) {
                    return;
                }

                // Check for Ice Age pause during position processing
                if (bm.iceAgeInProgress) {
                    console.log('Position processing paused due to Ice Age in progress');
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
            
            // ============================================
            // CHECKPOINT: At end of turn - KEEP THIS!
            // ============================================
            if (bm.checkpointSystem) {
                try {
                    await bm.checkpointSystem.createBattleCheckpoint('turn_end');
                    console.log(`Turn ${bm.currentTurn} checkpoint saved`);
                } catch (error) {
                    console.error(`Failed to create turn_end checkpoint for turn ${bm.currentTurn}:`, error);
                }
            }
            
            await bm.delay(10);
        }
        
        await bm.delay(200);
        bm.handleBattleEnd();
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
                console.log('Battle ended during actor processing, stopping turn');
                break;
            }

            // Check for Ice Age pause during actor processing
            if (bm.iceAgeInProgress) {
                console.log('Ã°Å¸Å’Â¨Ã¯Â¸Â Actor processing paused due to Ice Age in progress');
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
        
        // ­Check for Ice Age pause before executing actions
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
                const { AliceHeroEffect } = await import('../Heroes/alice.js');
                await AliceHeroEffect.checkAliceActionEffect(originalPlayerActor.data, bm);
            } catch (error) {
                console.error('Error triggering Alice laser effect:', error);
            }
        }

        if (originalOpponentActor && originalOpponentActor.type === 'hero' && 
            originalOpponentActor.data && originalOpponentActor.data.name === 'Alice' && 
            originalOpponentActor.data.alive) {
            
            // Import and trigger Alice's laser effect BEFORE her actual action
            try {
                const { AliceHeroEffect } = await import('../Heroes/alice.js');
                await AliceHeroEffect.checkAliceActionEffect(originalOpponentActor.data, bm);
            } catch (error) {
                console.error('Error triggering Alice laser effect:', error);
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
                const CrumTheClassPetCreature = (await import('./Creatures/crumTheClassPet.js')).default;
                const ColdHeartedYukiOnnaCreature = (await import('./Creatures/cold-HeartedYuki-Onna.js')).default;


                if (!bm.skeletonNecromancerManager) {
                    console.error('CRITICAL: Skeleton Necromancer manager failed to initialize!');
                } else if (typeof bm.skeletonNecromancerManager.executeHeroRevivalDeath !== 'function') {
                    console.error('CRITICAL: Skeleton Necromancer manager missing executeHeroRevivalDeath method!');
                }
                
                if (JigglesCreature.isJiggles(playerActor.name)) {
                    if (bm.jigglesManager) {
                        actions.push(bm.jigglesManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: JigglesManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonArcherCreature.isSkeletonArcher(playerActor.name)) {
                    if (bm.skeletonArcherManager) {
                        actions.push(bm.skeletonArcherManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonArcherManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonNecromancerCreature.isSkeletonNecromancer(playerActor.name)) {
                    if (bm.skeletonNecromancerManager) {
                        actions.push(bm.skeletonNecromancerManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonNecromancerManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonDeathKnightCreature.isSkeletonDeathKnight(playerActor.name)) {
                    if (bm.skeletonDeathKnightManager) {
                        actions.push(bm.skeletonDeathKnightManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonDeathKnightManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                    }
                } else if (BurningSkeletonCreature.isBurningSkeleton(playerActor.name)) {
                    if (bm.burningSkeletonManager) {
                        actions.push(bm.burningSkeletonManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: BurningSkeletonManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonReaperCreature.isSkeletonReaper(playerActor.name)) {
                    if (bm.skeletonReaperManager) {
                        actions.push(bm.skeletonReaperManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonReaperManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonBardCreature.isSkeletonBard(playerActor.name)) {
                    if (bm.skeletonBardManager) {
                        actions.push(bm.skeletonBardManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonBardManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonMageCreature.isSkeletonMage(playerActor.name)) {
                    if (bm.skeletonMageManager) {
                        actions.push(bm.skeletonMageManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonMageManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
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
                        console.error('CRITICAL: ArcherManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                    }
                } else if (FrontSoldierCreature.isFrontSoldier(playerActor.name)) {
                    if (bm.frontSoldierManager) {
                        actions.push(bm.frontSoldierManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: FrontSoldierManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                    }
                } else if (RoyalCorgiCreature.isRoyalCorgi(playerActor.name)) {
                    if (bm.royalCorgiManager) {
                        actions.push(bm.royalCorgiManager.executeRoyalCorgiAction(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: RoyalCorgiManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
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
                        console.error('CRITICAL: ColdHeartedYukiOnnaManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                    }
                } else {
                    actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                    bm.addCombatLog(`${playerActor.name} activates!`, 'success');
                }
            } catch (error) {
                console.error('Error importing creature classes:', error);
                actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                bm.addCombatLog(`${playerActor.name} activates!`, 'success');
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
                const CrumTheClassPetCreature = (await import('./Creatures/crumTheClassPet.js')).default;
                const ColdHeartedYukiOnnaCreature = (await import('./Creatures/cold-HeartedYuki-Onna.js')).default;


                if (JigglesCreature.isJiggles(opponentActor.name)) {
                    if (bm.jigglesManager) {
                        actions.push(bm.jigglesManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('RITICAL: JigglesManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonArcherCreature.isSkeletonArcher(opponentActor.name)) {
                    if (bm.skeletonArcherManager) {
                        actions.push(bm.skeletonArcherManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonArcherManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonNecromancerCreature.isSkeletonNecromancer(opponentActor.name)) {
                    if (bm.skeletonNecromancerManager) {
                        actions.push(bm.skeletonNecromancerManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonNecromancerManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonDeathKnightCreature.isSkeletonDeathKnight(opponentActor.name)) {
                    if (bm.skeletonDeathKnightManager) {
                        actions.push(bm.skeletonDeathKnightManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonDeathKnightManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                    }
                } else if (BurningSkeletonCreature.isBurningSkeleton(opponentActor.name)) {
                    if (bm.burningSkeletonManager) {
                        actions.push(bm.burningSkeletonManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: BurningSkeletonManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonReaperCreature.isSkeletonReaper(opponentActor.name)) {
                    if (bm.skeletonReaperManager) {
                        actions.push(bm.skeletonReaperManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonReaperManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonBardCreature.isSkeletonBard(opponentActor.name)) {
                    if (bm.skeletonBardManager) {
                        actions.push(bm.skeletonBardManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonBardManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonMageCreature.isSkeletonMage(opponentActor.name)) {
                    if (bm.skeletonMageManager) {
                        actions.push(bm.skeletonMageManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: SkeletonMageManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                    }
                } else if (FrontSoldierCreature.isFrontSoldier(opponentActor.name)) {
                    if (bm.frontSoldierManager) {
                        actions.push(bm.frontSoldierManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('CRITICAL: FrontSoldierManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                    }
                } else if (ArcherCreature.isArcher(opponentActor.name)) {
                    if (bm.archerManager) {
                        actions.push(bm.archerManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('ðŸ”¥ CRITICAL: ArcherManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`ðŸ”¸ ${opponentActor.name} activates!`, 'error');
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
                        console.error('CRITICAL: RoyalCorgiManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
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
                        console.error('CRITICAL: ColdHeartedYukiOnnaManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                    }
                } else {
                    actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                    bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
                }
            } catch (error) {
                console.error('Error importing creature classes:', error);
                actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                bm.addCombatLog(`${opponentActor.name} activates!`, 'error');
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
                console.log('Ã¢Å¡ Ã¯Â¸Â Battle may end with these hero actions - still executing to record kills');
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
            console.log('Battle ended due to status effect damage');
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