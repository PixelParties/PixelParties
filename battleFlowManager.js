// battleFlowManager.js - Battle Flow Control Module
// Handles the main battle flow, turn processing, and actor management

export class BattleFlowManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
    }

    // Start the battle
    async startBattle() {
        const bm = this.battleManager;
        
        if (bm.battleActive) {
            return;
        }

        bm.battleActive = true;
        bm.currentTurn = 0;
        bm.battleLog = []; // UPDATED: Clear legacy array, delegate to BattleScreen
        bm.turnInProgress = false;
        
        // Initialize speed control UI
        if (bm.battleScreen && bm.battleScreen.initializeSpeedControl) {
            bm.battleScreen.initializeSpeedControl(bm.isAuthoritative);
        }
        
        // Initialize extensible state
        bm.initializeExtensibleState();
        
        // Re-initialize heroes to ensure fresh health/state
        bm.initializeHeroes();

        // Initialize necromancy manager and stacks
        const { NecromancyManager } = await import('./Abilities/necromancy.js');
        bm.necromancyManager = new NecromancyManager(bm);
        bm.necromancyManager.initializeNecromancyStacks();
        bm.necromancyManager.initializeNecromancyStackDisplays();
        
        // CREATURES - Initialize creature managers with better error handling
        try {
            // Initialize Jiggles manager
            const JigglesCreature = (await import('./Creatures/jiggles.js')).default;
            bm.jigglesManager = new JigglesCreature(bm);
            console.log('✅ Jiggles manager initialized');

            // Initialize Skeleton Archer manager
            const SkeletonArcherCreature = (await import('./Creatures/skeletonArcher.js')).default;
            bm.skeletonArcherManager = new SkeletonArcherCreature(bm);
            console.log('✅ Skeleton Archer manager initialized');

            // Initialize Skeleton Necromancer manager
            const SkeletonNecromancerCreature = (await import('./Creatures/skeletonNecromancer.js')).default;
            bm.skeletonNecromancerManager = new SkeletonNecromancerCreature(bm);
            console.log('✅ Skeleton Necromancer manager initialized');
            
            // Verify managers are properly set
            if (!bm.jigglesManager) {
                console.error('❌ CRITICAL: Jiggles manager failed to initialize!');
            }
            if (!bm.skeletonArcherManager) {
                console.error('❌ CRITICAL: Skeleton Archer manager failed to initialize!');
            }
            if (!bm.skeletonNecromancerManager) {
                console.error('❌ CRITICAL: Skeleton Necromancer manager failed to initialize!');
            }
            
        } catch (error) {
            console.error('❌ CRITICAL: Error initializing creature managers:', error);
            // Initialize fallback null managers to prevent undefined errors
            if (!bm.jigglesManager) bm.jigglesManager = null;
            if (!bm.skeletonArcherManager) bm.skeletonArcherManager = null;
            if (!bm.skeletonNecromancerManager) bm.skeletonNecromancerManager = null;
        }

        // Ensure randomness is initialized before battle starts
        if (bm.isAuthoritative && !bm.randomnessInitialized) {
            bm.initializeRandomness();
        }
        
        // Add randomness info to combat log
        if (bm.randomnessManager.isInitialized) {
            bm.addCombatLog(`🎲 Battle randomness initialized (seed: ${bm.randomnessManager.seed.slice(0, 8)}...)`, 'info');
        }
        
        bm.addCombatLog('⚔️ Battle begins with Hero abilities and creatures!', 'success');
        
        // Log any SummoningMagic bonuses applied to creatures
        bm.logSummoningMagicBonuses();
        
        bm.logTorasEquipmentBonuses();
        
        if (bm.isAuthoritative) {
            try {
                console.log('🧪 Applying potion effects from both players at battle start...');
                
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
                console.log('✅ All potion effects applied successfully');

                // Apply delayed artifact effects from both players (like Poisoned Meat)
                console.log('🥩 Applying delayed artifact effects from both players at battle start...');
                const delayedEffects = await bm.getBothPlayersDelayedEffects();
                
                if (delayedEffects) {
                    const { applyBothPlayersDelayedEffects } = await import('./Artifacts/poisonedMeat.js');
                    await applyBothPlayersDelayedEffects(delayedEffects.host, delayedEffects.guest, bm);
                }

                console.log('💥 Applying Crusader Artifacts start-of-battle effects...');
                if (bm.crusaderArtifactsHandler) {
                    await bm.crusaderArtifactsHandler.applyStartOfBattleEffects();
                }
                
                console.log('✅ All start of battle effects applied successfully');
            } catch (error) {
                console.error('❌ Error applying battle start effects:', error);
                bm.addCombatLog('⚠️ Some battle start effects failed to apply', 'warning');
            }
        }
        
        await bm.saveBattleStateToPersistence();
        
        if (bm.isAuthoritative) {
            if (!bm.opponentConnected) {
                bm.pauseBattle('Opponent not connected at battle start');
            } else {
                await bm.delay(50);
                this.authoritative_battleLoop();
            }
        }
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

            bm.currentTurn++;
            bm.addCombatLog(`📍 Turn ${bm.currentTurn} begins`, 'info');
            
            bm.sendBattleUpdate('turn_start', { turn: bm.currentTurn });
            
            await bm.saveBattleStateToPersistence();
            
            for (const position of ['left', 'center', 'right']) {
                if (!bm.battleActive || this.checkBattleEnd()) break;
                
                if (!bm.opponentConnected) {
                    bm.pauseBattle('Opponent disconnected during turn');
                    return;
                }
                
                if (bm.battlePaused) {
                    return;
                }
                
                await this.authoritative_processTurnForPosition(position);
                await bm.saveBattleStateToPersistence();
                await bm.delay(15);
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
            
            // Get actors for this iteration
            let playerActor = playerActors[i] || null;
            let opponentActor = opponentActors[i] || null;
            
            // FILTER OUT DEAD ACTORS before they act
            if (playerActor && !this.isActorAlive(playerActor)) {
                bm.addCombatLog(`💀 ${playerActor.name} has died and cannot act!`, 'info');
                playerActor = null;
            }
            
            if (opponentActor && !this.isActorAlive(opponentActor)) {
                bm.addCombatLog(`💀 ${opponentActor.name} has died and cannot act!`, 'info');
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
            
            console.log('🌪️ Waiting for active Stormblade animations to complete...');
            await this.battleManager.attackEffectsManager.waitForStormbladeAnimations();
            console.log('🌪️ Stormblade animations completed, continuing battle...');
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

    // Execute actor actions
    async executeActorActions(playerActor, opponentActor, position) {
        const bm = this.battleManager;
        
        // Check if battle ended before executing actions
        if (this.checkBattleEnd()) {
            console.log('Battle ended before actor actions, skipping');
            return;
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
        // EXISTING ACTOR ACTION LOGIC - FIXED WITH SAFETY CHECKS
        // ============================================
        
        const actions = [];
        let hasSpecialAttacks = false;
        let hasHeroActions = false;
        
        // Collect all creature actions (including Jiggles, SkeletonArcher, and SkeletonNecromancer special attacks)
        if (playerActor && playerActor.type === 'creature') {
            try {
                // Import creature classes with error handling
                const JigglesCreature = (await import('./Creatures/jiggles.js')).default;
                const SkeletonArcherCreature = (await import('./Creatures/skeletonArcher.js')).default;
                const SkeletonNecromancerCreature = (await import('./Creatures/skeletonNecromancer.js')).default;

                if (!bm.skeletonNecromancerManager) {
                    console.error('❌ CRITICAL: Skeleton Necromancer manager failed to initialize!');
                } else if (typeof bm.skeletonNecromancerManager.executeHeroRevivalDeath !== 'function') {
                    console.error('❌ CRITICAL: Skeleton Necromancer manager missing executeHeroRevivalDeath method!');
                }
                
                if (JigglesCreature.isJiggles(playerActor.name)) {
                    if (bm.jigglesManager) {
                        actions.push(bm.jigglesManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('❌ CRITICAL: JigglesManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`🌟 ${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonArcherCreature.isSkeletonArcher(playerActor.name)) {
                    if (bm.skeletonArcherManager) {
                        actions.push(bm.skeletonArcherManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('❌ CRITICAL: SkeletonArcherManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`🌟 ${playerActor.name} activates!`, 'success');
                    }
                } else if (SkeletonNecromancerCreature.isSkeletonNecromancer(playerActor.name)) {
                    if (bm.skeletonNecromancerManager) {
                        actions.push(bm.skeletonNecromancerManager.executeSpecialAttack(playerActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('❌ CRITICAL: SkeletonNecromancerManager not available for', playerActor.name);
                        actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                        bm.addCombatLog(`🌟 ${playerActor.name} activates!`, 'success');
                    }
                } else {
                    actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                    bm.addCombatLog(`🌟 ${playerActor.name} activates!`, 'success');
                }
            } catch (error) {
                console.error('❌ Error importing creature classes:', error);
                actions.push(bm.animationManager.shakeCreature('player', position, playerActor.index));
                bm.addCombatLog(`🌟 ${playerActor.name} activates!`, 'success');
            }
        }

        if (opponentActor && opponentActor.type === 'creature') {
            try {
                // Import creature classes with error handling
                const JigglesCreature = (await import('./Creatures/jiggles.js')).default;
                const SkeletonArcherCreature = (await import('./Creatures/skeletonArcher.js')).default;
                const SkeletonNecromancerCreature = (await import('./Creatures/skeletonNecromancer.js')).default;
                
                if (JigglesCreature.isJiggles(opponentActor.name)) {
                    if (bm.jigglesManager) {
                        actions.push(bm.jigglesManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('❌ CRITICAL: JigglesManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`🌟 ${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonArcherCreature.isSkeletonArcher(opponentActor.name)) {
                    if (bm.skeletonArcherManager) {
                        actions.push(bm.skeletonArcherManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('❌ CRITICAL: SkeletonArcherManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`🌟 ${opponentActor.name} activates!`, 'error');
                    }
                } else if (SkeletonNecromancerCreature.isSkeletonNecromancer(opponentActor.name)) {
                    if (bm.skeletonNecromancerManager) {
                        actions.push(bm.skeletonNecromancerManager.executeSpecialAttack(opponentActor, position));
                        hasSpecialAttacks = true;
                    } else {
                        console.error('❌ CRITICAL: SkeletonNecromancerManager not available for', opponentActor.name);
                        actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                        bm.addCombatLog(`🌟 ${opponentActor.name} activates!`, 'error');
                    }
                } else {
                    actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                    bm.addCombatLog(`🌟 ${opponentActor.name} activates!`, 'error');
                }
            } catch (error) {
                console.error('❌ Error importing creature classes:', error);
                actions.push(bm.animationManager.shakeCreature('opponent', position, opponentActor.index));
                bm.addCombatLog(`🌟 ${opponentActor.name} activates!`, 'error');
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
            // Final check before hero actions
            if (this.checkBattleEnd()) {
                return;
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