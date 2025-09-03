// potionHandler.js - Enhanced Potion Management System with Persistent Battle Effects and Multi-Player Support
// UPDATED: Added ElixirOfStrength support

export class PotionHandler {
    constructor() {
        this.basePotions = 1; // Base potions per turn (always 1)
        this.alchemyBonuses = 0; // Additional potions from Alchemy abilities
        this.availablePotions = 1; // Current available potions this turn
        this.maxPotions = 1; // Maximum potions (base + alchemy bonuses)
        
        // NEW: Persistent potion effects that carry over to battle
        this.activePotionEffects = []; // Array of active potion effects
        
        console.log('PotionHandler initialized with persistent effects system and multi-player support');
    }

    // ===== POTION DETECTION =====

    // Check if a card is a potion
    isPotionCard(cardName, heroSelection = null) {
        // Get card info to check card type
        const cardInfo = heroSelection?.getCardInfo ? heroSelection.getCardInfo(cardName) : null;
        
        if (cardInfo && cardInfo.cardType === 'Potion') {
            return true;
        }
        
        // Fallback: hardcoded list of known potions for backwards compatibility
        const knownPotions = [
            'ExperimentalPotion',
            'ElixirOfStrength', 
            'ElixirOfImmortality',
            'elixirOfCold',
            'LifeSerum',
            'PoisonVial',
            'BottledFlame',
            'bottledLightning',
            'BoulderInABottle',
            'SwordInABottle',
            'AcidVial',
            'ElixirOfQuickness',
            'CloudInABottle',
            'OverflowingChalice',
        ];
        
        return knownPotions.includes(cardName);
    }

    // ===== POTION USAGE =====

    // Check if player can use a potion
    canUsePotion() {
        return this.availablePotions > 0;
    }

    // Main handler for potion click
    async handlePotionClick(cardIndex, cardName, heroSelection) {
        return await this.usePotion(cardIndex, cardName, heroSelection);
    }

    // Main handler for potion drag (when dragged out of hand)
    async handlePotionDrag(cardIndex, cardName, heroSelection) {
        return await this.usePotion(cardIndex, cardName, heroSelection);
    }

    // Use a potion (core logic)
    async usePotion(cardIndex, cardName, heroSelection) {
        try {
            // Check if player can use potions
            if (!this.canUsePotion()) {
                this.showPotionError("You can't drink any more Potions this turn!", cardName);
                return false; // Return false so card stays in hand
            }

            // Consume one available potion
            this.availablePotions--;
            
            // Remove card from hand
            if (heroSelection.handManager) {
                heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            }

            // ===== SPECIAL HANDLING FOR ELIXIR OF QUICKNESS =====
            if (cardName === 'ElixirOfQuickness') {
                // ElixirOfQuickness: Draw 2 cards instead of 1, no battle effects
                if (heroSelection.handManager && heroSelection.deckManager) {
                    const drawnCards = heroSelection.handManager.drawCards(2); // Draw 2 cards instead of 1
                    
                    if (drawnCards.length > 0) {
                        console.log(`Drew ${drawnCards.length} cards after using ElixirOfQuickness: ${drawnCards.join(', ')}`);
                    } else {
                        console.log('No cards available to draw after using ElixirOfQuickness');
                    }
                }

                // Show special usage notification for ElixirOfQuickness
                this.showPotionUsage(cardName);

                // Update UI displays
                if (heroSelection.updateHandDisplay) {
                    heroSelection.updateHandDisplay();
                }
                this.updatePotionDisplay();

                // Save game state
                if (heroSelection.autoSave) {
                    await heroSelection.autoSave();
                }

                console.log('ElixirOfQuickness used successfully - drew extra card, no battle effects added');
                return true;
            }

            // ===== NORMAL POTION HANDLING (ALL OTHER POTIONS) =====
            // Add potion effect to active effects list for battle
            this.addPotionEffect(cardName);

            // Draw 1 card from deck (normal potion behavior)
            if (heroSelection.handManager && heroSelection.deckManager) {
                const drawnCards = heroSelection.handManager.drawCards(1);
                
                if (drawnCards.length > 0) {
                    console.log(`Drew ${drawnCards[0]} after using ${cardName}`);
                } else {
                    console.log('No cards available to draw after using potion');
                }
            }

            // Show usage notification
            this.showPotionUsage(cardName);

            // Update UI displays
            if (heroSelection.updateHandDisplay) {
                heroSelection.updateHandDisplay();
            }
            this.updatePotionDisplay();

            // Save game state
            if (heroSelection.autoSave) {
                await heroSelection.autoSave();
            }

            return true;

        } catch (error) {
            console.error('Error using potion:', error);
            this.showPotionError('Failed to use potion!', cardName);
            return false;
        }
    }

    // ===== PERSISTENT POTION EFFECTS SYSTEM =====

    // Add a potion effect to the active effects list
    addPotionEffect(potionName) {
        const potionEffect = {
            name: potionName,
            addedAt: Date.now(),
            id: this.generateEffectId()
        };
        
        this.activePotionEffects.push(potionEffect);
        console.log(`Added ${potionName} to active potion effects. Total effects: ${this.activePotionEffects.length}`);
        
        // Show confirmation of effect being added
        this.showPotionEffectAdded(potionName);
    }

    // Generate unique ID for potion effects
    generateEffectId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Get all active potion effects
    getActivePotionEffects() {
        return [...this.activePotionEffects];
    }

    // Get count of specific potion effect
    getPotionEffectCount(potionName) {
        return this.activePotionEffects.filter(effect => effect.name === potionName).length;
    }

    // Clear all active potion effects (called after battle)
    clearPotionEffects() {
        const effectCount = this.activePotionEffects.length;
        this.activePotionEffects = [];
        
        if (effectCount > 0) {
            console.log(`Cleared ${effectCount} active potion effects after battle`);
            this.showPotionEffectsCleared(effectCount);
        }
    }

    // Apply all active potion effects at battle start (single player - backward compatibility)
    async applyPotionEffectsAtBattleStart(battleManager) {
        if (!this.activePotionEffects.length) {
            console.log('No active potion effects to apply');
            return;
        }

        console.log(`Applying ${this.activePotionEffects.length} potion effects at battle start`);

        // Group effects by potion type for batch processing
        const effectGroups = {};
        this.activePotionEffects.forEach(effect => {
            if (!effectGroups[effect.name]) {
                effectGroups[effect.name] = [];
            }
            effectGroups[effect.name].push(effect);
        });

        // Apply each type of potion effect
        for (const [potionName, effects] of Object.entries(effectGroups)) {
            try {
                await this.delegatePotionEffectToModule(potionName, effects, 'host', battleManager);
            } catch (error) {
                console.error(`Error applying ${potionName} effects:`, error);
            }
        }

        // Show summary of applied effects
        this.showPotionEffectsApplied(effectGroups);
    }

    // ===== NEW: MULTI-PLAYER BATTLE EFFECT SYSTEM =====

    // Apply potion effects from both players at battle start
    async applyBothPlayersPotionEffectsAtBattleStart(hostPotionState, guestPotionState, battleManager) {
        if (!battleManager) {
            console.error('No battle manager provided for potion effects');
            return;
        }
        
        let totalEffectsApplied = 0;
        
        // ===== SPECIAL HANDLING FOR SWORD IN A BOTTLE =====
        // Extract SwordInABottle effects for simultaneous processing
        const hostSwordEffects = hostPotionState?.activePotionEffects?.filter(effect => effect.name === 'SwordInABottle') || [];
        const guestSwordEffects = guestPotionState?.activePotionEffects?.filter(effect => effect.name === 'SwordInABottle') || [];
        
        if (hostSwordEffects.length > 0 || guestSwordEffects.length > 0) {
            console.log(`⚔️ Processing ${hostSwordEffects.length + guestSwordEffects.length} total Sword in a Bottle effects simultaneously`);
            
            try {
                const { SwordInABottlePotion } = await import('./Potions/swordInABottle.js');
                const swordInABottlePotion = new SwordInABottlePotion();
                
                // Use the new simultaneous method
                const swordEffectsProcessed = await swordInABottlePotion.handleSimultaneousEffects(
                    hostSwordEffects,
                    guestSwordEffects,
                    battleManager
                );
                
                totalEffectsApplied += swordEffectsProcessed;
                console.log(`✅ Simultaneous Sword in a Bottle processing completed: ${swordEffectsProcessed} effects`);
                
            } catch (error) {
                console.error('⚠️ Error processing simultaneous Sword in a Bottle effects:', error);
                // Fall back to individual processing if simultaneous fails
                if (hostSwordEffects.length > 0) {
                    const hostEffects = await this.handleSwordInABottleEffects(hostSwordEffects, 'host', battleManager);
                    totalEffectsApplied += hostEffects;
                }
                if (guestSwordEffects.length > 0) {
                    const guestEffects = await this.handleSwordInABottleEffects(guestSwordEffects, 'guest', battleManager);
                    totalEffectsApplied += guestEffects;
                }
            }
        }
        
        // ===== PROCESS ALL OTHER POTION TYPES NORMALLY =====
        // Apply host's other potion effects (excluding SwordInABottle)
        if (hostPotionState && hostPotionState.activePotionEffects && hostPotionState.activePotionEffects.length > 0) {
            const otherHostEffects = hostPotionState.activePotionEffects.filter(effect => effect.name !== 'SwordInABottle');
            if (otherHostEffects.length > 0) {
                const hostEffects = await this.applyPotionEffectsForPlayer(
                    { ...hostPotionState, activePotionEffects: otherHostEffects }, 
                    'host', 
                    battleManager
                );
                totalEffectsApplied += hostEffects;
            }
        }
        
        // Apply guest's other potion effects (excluding SwordInABottle)
        if (guestPotionState && guestPotionState.activePotionEffects && guestPotionState.activePotionEffects.length > 0) {
            const otherGuestEffects = guestPotionState.activePotionEffects.filter(effect => effect.name !== 'SwordInABottle');
            if (otherGuestEffects.length > 0) {
                const guestEffects = await this.applyPotionEffectsForPlayer(
                    { ...guestPotionState, activePotionEffects: otherGuestEffects }, 
                    'guest', 
                    battleManager
                );
                totalEffectsApplied += guestEffects;
            }
        }
        
        if (totalEffectsApplied > 0) {
            battleManager.addCombatLog(`🧪 ${totalEffectsApplied} potion effects activated for battle!`, 'info');
            console.log(`✅ Applied ${totalEffectsApplied} total potion effects from both players`);
        } else {
            console.log('No active potion effects to apply from either player');
        }
    }

    // Apply potion effects for a specific player role
    async applyPotionEffectsForPlayer(potionState, playerRole, battleManager) {
        if (!potionState || !potionState.activePotionEffects || potionState.activePotionEffects.length === 0) {
            return 0;
        }
        
        // Group effects by potion type for batch processing
        const effectGroups = {};
        potionState.activePotionEffects.forEach(effect => {
            if (!effectGroups[effect.name]) {
                effectGroups[effect.name] = [];
            }
            effectGroups[effect.name].push(effect);
        });
        
        let effectsApplied = 0;
        
        // Apply each type of potion effect using the specific potion modules
        for (const [potionName, effects] of Object.entries(effectGroups)) {
            try {
                const appliedCount = await this.delegatePotionEffectToModule(
                    potionName, 
                    effects, 
                    playerRole, 
                    battleManager
                );
                effectsApplied += appliedCount;
            } catch (error) {
                console.error(`Error applying ${potionName} effects for ${playerRole}:`, error);
            }
        }
        
        return effectsApplied;
    }

    // Delegate potion effects to their specific modules
    async delegatePotionEffectToModule(potionName, effects, playerRole, battleManager) {
        switch (potionName) {
            case 'ElixirOfStrength':
                return await this.handleElixirOfStrengthEffects(effects, playerRole, battleManager);
            
            case 'ElixirOfCold':
                return await this.handleElixirOfColdEffects(effects, playerRole, battleManager);

            case 'LifeSerum':
                return await this.handleLifeSerumEffects(effects, playerRole, battleManager);
            
            case 'BottledFlame':
                return await this.handleBottledFlameEffects(effects, playerRole, battleManager);
            
            case 'BottledLightning':
                return await this.handleBottledLightningEffects(effects, playerRole, battleManager);

            case 'PoisonVial':
                return await this.handlePoisonVialEffects(effects, playerRole, battleManager);

            case 'BoulderInABottle':
                return await this.handleBoulderInABottleEffects(effects, playerRole, battleManager);

            case 'SwordInABottle':  
                return await this.handleSwordInABottleEffects(effects, playerRole, battleManager);

            case 'AcidVial': 
                return await this.handleAcidVialEffects(effects, playerRole, battleManager);
                
            case 'ExperimentalPotion':
                return await this.handleExperimentalPotionEffects(effects, playerRole, battleManager);

            case 'ElixirOfImmortality':
                return await this.handleElixirOfImmortality(effects, playerRole, battleManager);

            case 'MonsterInABottle':
                return await this.handleMonsterInABottleEffects(effects, playerRole, battleManager);

            case 'CloudInABottle':
                return await this.handleCloudInABottleEffects(effects, playerRole, battleManager);

            case 'OverflowingChalice':
                return await this.handleOverflowingChaliceEffects(effects, playerRole, battleManager);
                
            // Add other potion types here as they get battle effects
            default:
                console.log(`No battle effect defined for potion: ${potionName}`);
                return 0;
        }
    }

    async handleOverflowingChaliceEffects(effects, playerRole, battleManager) {
        try {
            const { OverflowingChalicePotion } = await import('./Potions/overflowingChalice.js');
            const overflowingChalicePotion = new OverflowingChalicePotion();
            
            const effectsProcessed = await overflowingChalicePotion.handlePotionEffectsForPlayer(
                effects, playerRole, battleManager
            );
            
            console.log(`🏆 OverflowingChalice delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating OverflowingChalice effects for ${playerRole}:`, error);
            return effects.length;
        }
    }

    async handleCloudInABottleEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the CloudInABottle module
            const { CloudInABottlePotion } = await import('./Potions/cloudInABottle.js');
            const cloudInABottlePotion = new CloudInABottlePotion();
            
            // Delegate everything to the CloudInABottle module
            const effectsProcessed = await cloudInABottlePotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            console.log(`☁️ CloudInABottle delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating CloudInABottle effects for ${playerRole}:`, error);
            
            // Fallback: try basic clouded application
            const allyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.playerHeroes) : 
                Object.values(battleManager.opponentHeroes);
                
            const effectCount = effects.length;
            const cloudedStacks = 1 * effectCount;
            let fallbackTargets = 0;
            
            for (const hero of allyHeroes) {
                if (hero && hero.alive && battleManager.statusEffectsManager) {
                    // Apply clouded status effect
                    battleManager.statusEffectsManager.applyStatusEffect(hero, 'clouded', cloudedStacks);
                    fallbackTargets++;
                    
                    // Apply to creatures too
                    if (hero.creatures) {
                        hero.creatures.forEach(creature => {
                            if (creature.alive) {
                                battleManager.statusEffectsManager.applyStatusEffect(creature, 'clouded', cloudedStacks);
                                fallbackTargets++;
                            }
                        });
                    }
                }
            }
            
            battleManager.addCombatLog(`☁️ Cloud in a Bottle effects applied (+${cloudedStacks} clouded stacks to ${fallbackTargets} targets)`, 'info');
            return effectCount;
        }
    }

    async handleMonsterInABottleEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the MonsterInABottle module
            const { MonsterInABottlePotion } = await import('./Potions/monsterInABottle.js');
            const monsterInABottlePotion = new MonsterInABottlePotion();
            
            // Delegate everything to the MonsterInABottle module
            const effectsProcessed = await monsterInABottlePotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            console.log(`✅ MonsterInABottle delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating MonsterInABottle effects for ${playerRole}:`, error);
            
            // Fallback: add generic creatures to player heroes
            const allyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.playerHeroes) : 
                Object.values(battleManager.opponentHeroes);
                
            const effectCount = effects.length;
            let fallbackTargets = 0;
            
            for (const hero of allyHeroes) {
                if (hero && hero.alive) {
                    // Add a basic level 0 creature as fallback
                    const fallbackCreature = {
                        name: 'SkeletonMage',
                        currentHp: 50,
                        maxHp: 50,
                        atk: 0,
                        alive: true,
                        type: 'creature',
                        addedAt: Date.now(),
                        statusEffects: [],
                        temporaryModifiers: {},
                        isMonsterInABottle: true,
                        createdFromPotion: true
                    };
                    
                    hero.creatures.unshift(fallbackCreature);
                    fallbackTargets++;
                }
            }
            
            battleManager.addCombatLog(`🎲 MonsterInABottle summoned creatures (fallback mode)`, 'info');
            return effectCount;
        }
    }

    async handleElixirOfImmortality(effects, playerRole, battleManager) {
        try {
            const { ElixirOfImmortality } = await import('./Potions/elixirOfImmortality.js');
            const elixirOfImmortality = new ElixirOfImmortality();
            
            const effectsProcessed = await elixirOfImmortality.handlePotionEffectsForPlayer(
                effects, playerRole, battleManager
            );
            
            console.log(`✅ ElixirOfImmortality delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating ElixirOfImmortality effects for ${playerRole}:`, error);
            return 0;
        }
    }

    async handleExperimentalPotionEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the ExperimentalPotion module
            const { ExperimentalPotionPotion } = await import('./Potions/experimentalPotion.js');
            const experimentalPotionPotion = new ExperimentalPotionPotion();
            
            // Delegate everything to the ExperimentalPotion module
            const effectsProcessed = await experimentalPotionPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            console.log(`✅ ExperimentalPotion delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating ExperimentalPotion effects for ${playerRole}:`, error);
            
            // Fallback: add a generic log message
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `🧪 ${playerName}'s Experimental Potion failed to activate properly`, 
                'warning'
            );
            
            return effects.length;
        }
    }

    async handleAcidVialEffects(effects, playerRole, battleManager) {
    try {
        // Import and use the AcidVial module
        const { AcidVialPotion } = await import('./Potions/acidVial.js');
        const acidVialPotion = new AcidVialPotion();
        
        // Delegate everything to the AcidVial module
        const effectsProcessed = await acidVialPotion.handlePotionEffectsForPlayer(
            effects, 
            playerRole, 
            battleManager
        );
        
        console.log(`✅ AcidVial delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
        return effectsProcessed;
        
    } catch (error) {
        console.error(`Error delegating AcidVial effects for ${playerRole}:`, error);
        
        // Fallback: try basic damage and heal-block application
        const enemyHeroes = playerRole === 'host' ? 
            Object.values(battleManager.opponentHeroes) : 
            Object.values(battleManager.playerHeroes);
            
        const effectCount = effects.length;
        const damagePerVial = 100;
        const healBlockPerVial = 3;
        const totalDamage = damagePerVial * effectCount;
        const totalHealBlock = healBlockPerVial * effectCount;
        let fallbackTargets = 0;
        
        for (const hero of enemyHeroes) {
            if (hero && hero.alive) {
                // Apply damage
                if (battleManager.isAuthoritative) {
                    await battleManager.authoritative_applyDamage({
                        target: hero,
                        damage: totalDamage,
                        newHp: Math.max(0, hero.currentHp - totalDamage),
                        died: (hero.currentHp - totalDamage) <= 0
                    }, { source: 'acid' });
                }
                
                // Apply heal-block
                if (battleManager.statusEffectsManager) {
                    battleManager.statusEffectsManager.applyStatusEffect(hero, 'healblock', totalHealBlock);
                }
                
                fallbackTargets++;
            }
        }
        
        battleManager.addCombatLog(`🧪 Acid Vial effects applied (+${totalDamage} damage, +${totalHealBlock} heal-block to ${fallbackTargets} heroes)`, 'info');
        return effectCount;
    }
}

    async handleElixirOfStrengthEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the ElixirOfStrength module
            const { ElixirOfStrengthPotion } = await import('./Potions/elixirOfStrength.js');
            const elixirOfStrengthPotion = new ElixirOfStrengthPotion();
            
            // Delegate everything to the ElixirOfStrength module
            const effectsProcessed = await elixirOfStrengthPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            console.log(`✅ ElixirOfStrength delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating ElixirOfStrength effects for ${playerRole}:`, error);
            
            // Fallback: try basic strength application
            const allyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.playerHeroes) : 
                Object.values(battleManager.opponentHeroes);
                
            const effectCount = effects.length;
            const attackBonus = 50 * effectCount; // 50 per potion
            let fallbackTargets = 0;
            
            for (const hero of allyHeroes) {
                if (hero && hero.alive && hero.addBattleAttackBonus) {
                    hero.addBattleAttackBonus(attackBonus);
                    
                    // Update display
                    if (battleManager.updateHeroAttackDisplay) {
                        battleManager.updateHeroAttackDisplay(hero.side, hero.position, hero);
                    }
                    
                    fallbackTargets++;
                }
            }
            
            battleManager.addCombatLog(`⚔️ Elixir of Strength effects applied (+${attackBonus} attack to ${fallbackTargets} heroes)`, 'info');
            return effectCount;
        }
    }

    async handleElixirOfColdEffects(effects, playerRole, battleManager) {
        try {
            const { ElixirOfColdPotion } = await import('./Potions/elixirOfCold.js');
            const elixirOfColdPotion = new ElixirOfColdPotion();
            
            const effectsProcessed = await elixirOfColdPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            console.log(`❄️ ElixirOfCold delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating ElixirOfCold effects for ${playerRole}:`, error);
            return 0;
        }
    }

    async handleLifeSerumEffects(effects, playerRole, battleManager) {
        try {
            const { LifeSerumPotion } = await import('./Potions/lifeSerum.js');
            const lifeSerumPotion = new LifeSerumPotion();
            
            const effectsProcessed = await lifeSerumPotion.handlePotionEffectsForPlayer(
                effects, playerRole, battleManager
            );
            
            console.log(`✅ LifeSerum delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating LifeSerum effects for ${playerRole}:`, error);
            
            // Fallback: basic HP application
            const allyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.playerHeroes) : 
                Object.values(battleManager.opponentHeroes);
                
            const effectCount = effects.length;
            const hpBonus = 200 * effectCount;
            let fallbackTargets = 0;
            
            for (const hero of allyHeroes) {
                if (hero && hero.alive && hero.addBattleHpBonus) {
                    hero.addBattleHpBonus(hpBonus);
                    
                    if (battleManager.updateHeroHealthBar) {
                        battleManager.updateHeroHealthBar(hero.side, hero.position, hero.currentHp, hero.maxHp);
                    }
                    
                    fallbackTargets++;
                }
            }
            
            battleManager.addCombatLog(`❤️ Life Serum effects applied (+${hpBonus} HP to ${fallbackTargets} heroes)`, 'info');
            return effectCount;
        }
    }

    async handleSwordInABottleEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the SwordInABottle module
            const { SwordInABottlePotion } = await import('./Potions/swordInABottle.js');
            const swordInABottlePotion = new SwordInABottlePotion();
            
            // Use the individual player method (fallback)
            const effectsProcessed = await swordInABottlePotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            console.log(`✅ Sword in a Bottle delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating Sword in a Bottle effects for ${playerRole}:`, error);
            
            // Fallback: minimal effect logging
            battleManager.addCombatLog(`⚔️ Sword in a Bottle effects failed to activate properly`, 'error');
            return effects.length; // Still count as processed to avoid errors
        }
    }

    async handleBoulderInABottleEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the BoulderInABottle module
            const { BoulderInABottlePotion } = await import('./Potions/boulderInABottle.js');
            const boulderInABottlePotion = new BoulderInABottlePotion();
            
            // Delegate everything to the BoulderInABottle module
            const effectsProcessed = await boulderInABottlePotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            console.log(`✅ BoulderInABottle delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating BoulderInABottle effects for ${playerRole}:`, error);
            return 0;
        }
    }

    async handleBottledFlameEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the enhanced BottledFlame module
            const { BottledFlamePotion } = await import('./Potions/bottledFlame.js');
            const bottledFlamePotion = new BottledFlamePotion();
            
            // Delegate everything to the BottledFlame module
            const effectsProcessed = await bottledFlamePotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            console.log(`✅ BottledFlame delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating BottledFlame effects for ${playerRole}:`, error);
            
            // Fallback: try basic burn application using status effects manager
            const enemyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.opponentHeroes) : 
                Object.values(battleManager.playerHeroes);
                
            const effectCount = effects.length;
            let fallbackTargets = 0;
            
            for (const hero of enemyHeroes) {
                if (hero && hero.alive && battleManager.statusEffectsManager) {
                    battleManager.statusEffectsManager.applyStatusEffect(hero, 'burned', effectCount);
                    fallbackTargets++;
                }
            }
                        
            return effectCount;
        }
    }

    async handleBottledLightningEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the BottledLightning module
            const { BottledLightningPotion } = await import('./Potions/bottledLightning.js');
            const bottledLightningPotion = new BottledLightningPotion();
            
            // Delegate everything to the BottledLightning module
            const effectsProcessed = await bottledLightningPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            console.log(`✅ BottledLightning delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating BottledLightning effects for ${playerRole}:`, error);
            return 0;
        }
    }

    async handlePoisonVialEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the PoisonVial module
            const { PoisonVialPotion } = await import('./Potions/poisonVial.js');
            const poisonVialPotion = new PoisonVialPotion();
            
            // Delegate everything to the PoisonVial module
            const effectsProcessed = await poisonVialPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            console.log(`✅ PoisonVial delegation completed: ${effectsProcessed} effects processed for ${playerRole}`);
            return effectsProcessed;
            
        } catch (error) {
            console.error(`Error delegating PoisonVial effects for ${playerRole}:`, error);
            
            // Fallback: try basic poison application using status effects manager
            const enemyHeroes = playerRole === 'host' ? 
                Object.values(battleManager.opponentHeroes) : 
                Object.values(battleManager.playerHeroes);
                
            const effectCount = effects.length;
            let fallbackTargets = 0;
            
            for (const hero of enemyHeroes) {
                if (hero && hero.alive && battleManager.statusEffectsManager) {
                    battleManager.statusEffectsManager.applyStatusEffect(hero, 'poisoned', effectCount);
                    fallbackTargets++;
                }
            }
                        
            return effectCount;
        }
    }

    // ===== ALCHEMY INTEGRATION =====

    // Update alchemy bonuses by counting Alchemy abilities across all heroes
    updateAlchemyBonuses(heroSelection, preserveAvailablePotions = false) {
        let alchemyCount = 0;

        if (heroSelection.heroAbilitiesManager) {
            // Check all hero positions
            ['left', 'center', 'right'].forEach(position => {
                const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
                
                if (heroAbilities) {
                    // Check all zones for this hero
                    ['zone1', 'zone2', 'zone3'].forEach(zone => {
                        if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                            // Count Alchemy abilities in this zone
                            const alchemyInZone = heroAbilities[zone].filter(ability => 
                                ability && ability.name === 'Alchemy'
                            ).length;
                            alchemyCount += alchemyInZone;
                        }
                    });
                }
            });
        }

        const previousBonuses = this.alchemyBonuses;
        this.alchemyBonuses = alchemyCount;
        this.maxPotions = this.basePotions + this.alchemyBonuses;

        // Only modify availablePotions if NOT preserving them (i.e., during normal gameplay)
        if (!preserveAvailablePotions) {
            // If alchemy bonuses increased, immediately add to available potions
            if (this.alchemyBonuses > previousBonuses) {
                const increase = this.alchemyBonuses - previousBonuses;
                this.availablePotions += increase;
                
                // Update display immediately
                this.updatePotionDisplay();
            } else if (this.alchemyBonuses < previousBonuses) {
                // If alchemy bonuses decreased, adjust max but don't reduce current (until next turn)
                console.log(`Alchemy bonuses decreased. Max potions: ${this.maxPotions}, Current: ${this.availablePotions}`);
                
                // Update display
                this.updatePotionDisplay();
            }
        } else {
            // During reconnection - just recalculate max, don't touch available
            
            // Update display
            this.updatePotionDisplay();
        }

        return this.alchemyBonuses;
    }

    // ===== TURN MANAGEMENT =====

    // Reset potions for new turn
    resetPotionsForTurn() {
        this.availablePotions = this.maxPotions;
        console.log(`Potions reset for new turn: ${this.availablePotions}/${this.maxPotions}`);
        
        // Update display
        this.updatePotionDisplay();
    }

    // ===== UI MANAGEMENT =====

    // Create potion display HTML
    createPotionDisplay() {
        const potionIcon = this.availablePotions > 0 ? '🧪' : '⚗️';
        const displayClass = this.availablePotions === 0 ? 'potions-depleted' : '';
        
        // Add active effects indicator
        const activeEffectsIndicator = this.activePotionEffects.length > 0 ? 
            `<div class="active-effects-indicator" title="${this.activePotionEffects.length} potion effect(s) ready for battle">🔥${this.activePotionEffects.length}</div>` : '';
        
        return `
            <div class="potion-display ${displayClass}" id="potionDisplay">
                <div class="potion-amount">
                    <span class="potion-icon">${potionIcon}</span>
                    <span class="potion-number">${this.availablePotions}</span>
                </div>
                ${activeEffectsIndicator}
            </div>
        `;
    }

    // Update potion display in the UI
    updatePotionDisplay() {
        const potionDisplay = document.getElementById('potionDisplay');
        if (potionDisplay) {
            const newHTML = this.createPotionDisplay();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHTML;
            const newPotionDisplay = tempDiv.firstElementChild;
            
            potionDisplay.parentNode.replaceChild(newPotionDisplay, potionDisplay);
        }
    }

    // Show potion usage notification
    showPotionUsage(potionName) {
        const formattedName = this.formatCardName(potionName);
        
        const notification = document.createElement('div');
        notification.className = 'potion-usage-notification';
        notification.innerHTML = `
            <div class="potion-usage-content">
                <span class="potion-usage-icon">🧙‍♂️</span>
                <span class="potion-usage-text">${formattedName} has been used!</span>
            </div>
        `;
        
        // Position in center of screen
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: potionUsageBounce 0.6s ease-out;
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => {
            notification.style.animation = 'potionUsageFade 0.4s ease-out forwards';
            setTimeout(() => notification.remove(), 400);
        }, 2000);
    }

    // Show potion effect added notification
    showPotionEffectAdded(potionName) {
        const formattedName = this.formatCardName(potionName);
        
        const notification = document.createElement('div');
        notification.className = 'potion-effect-added-notification';
        notification.innerHTML = `
            <div class="potion-effect-content">
                <span class="potion-effect-icon">✨</span>
                <span class="potion-effect-text">${formattedName} effect ready for battle!</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 60%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
            color: white;
            padding: 14px 20px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: bold;
            z-index: 9999;
            pointer-events: none;
            animation: potionEffectBounce 0.5s ease-out;
            box-shadow: 0 5px 15px rgba(255, 152, 0, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'potionEffectFade 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 1500);
    }

    // Show potion effects applied at battle start
    showPotionEffectsApplied(effectGroups) {
        const totalEffects = Object.values(effectGroups).reduce((sum, effects) => sum + effects.length, 0);
        
        if (totalEffects === 0) return;
        
        const notification = document.createElement('div');
        notification.className = 'potion-effects-applied-notification';
        
        let effectsText = '';
        for (const [potionName, effects] of Object.entries(effectGroups)) {
            const formattedName = this.formatCardName(potionName);
            effectsText += `${formattedName} x${effects.length}, `;
        }
        effectsText = effectsText.slice(0, -2); // Remove trailing comma
        
        notification.innerHTML = `
            <div class="potion-effects-applied-content">
                <span class="potion-effects-applied-icon">🔥</span>
                <span class="potion-effects-applied-text">Battle effects: ${effectsText}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #e91e63 0%, #ad1457 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            pointer-events: none;
            animation: potionEffectsAppliedBounce 0.7s ease-out;
            box-shadow: 0 6px 20px rgba(233, 30, 99, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
            max-width: 80%;
            text-align: center;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'potionEffectsAppliedFade 0.4s ease-out forwards';
            setTimeout(() => notification.remove(), 400);
        }, 3000);
    }

    // Show potion effects cleared after battle
    showPotionEffectsCleared(effectCount) {
        const notification = document.createElement('div');
        notification.className = 'potion-effects-cleared-notification';
        notification.innerHTML = `
            <div class="potion-effects-cleared-content">
                <span class="potion-effects-cleared-icon">🌟</span>
                <span class="potion-effects-cleared-text">${effectCount} potion effect(s) cleared</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: bold;
            z-index: 9998;
            pointer-events: none;
            animation: potionEffectsClearedBounce 0.4s ease-out;
            box-shadow: 0 4px 12px rgba(156, 39, 176, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'potionEffectsClearedFade 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Show potion error notification
    showPotionError(message, potionName = '') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'potion-error-popup';
        errorDiv.innerHTML = `
            <div class="potion-error-content">
                <span class="potion-error-icon">⚗️</span>
                <span class="potion-error-text">${message}</span>
            </div>
        `;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
            color: white;
            padding: 14px 22px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: potionErrorBounce 0.5s ease-out;
            box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'potionErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2000);
    }

    // ===== STATE PERSISTENCE =====

    // Export potion state for saving (INCLUDES ACTIVE EFFECTS)
    exportPotionState() {
        return {
            basePotions: this.basePotions,
            alchemyBonuses: this.alchemyBonuses,
            availablePotions: this.availablePotions,
            maxPotions: this.maxPotions,
            activePotionEffects: [...this.activePotionEffects],
            exportedAt: Date.now()
        };
    }

    // Import potion state for loading (INCLUDES ACTIVE EFFECTS)
    importPotionState(state, isReconnection = false) {
        if (!state) {
            console.log('No potion state to import, using defaults');
            return false;
        }

        this.basePotions = state.basePotions || 1;
        this.alchemyBonuses = state.alchemyBonuses || 0;
        
        // Properly handle 0 values by checking for undefined/null instead of falsy
        this.availablePotions = (state.availablePotions !== undefined && state.availablePotions !== null) ? state.availablePotions : 1;
        this.maxPotions = state.maxPotions || 1;

        // Import active potion effects
        this.activePotionEffects = state.activePotionEffects || [];

        console.log('Imported potion state:', {
            available: this.availablePotions,
            max: this.maxPotions,
            alchemy: this.alchemyBonuses,
            activeEffects: this.activePotionEffects.length,
            isReconnection: isReconnection
        });

        return true;
    }

    // ===== UTILITY METHODS =====

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Get current potion status (INCLUDES ACTIVE EFFECTS)
    getPotionStatus() {
        return {
            available: this.availablePotions,
            max: this.maxPotions,
            basePotions: this.basePotions,
            alchemyBonuses: this.alchemyBonuses,
            canUse: this.canUsePotion(),
            activeEffects: this.activePotionEffects.length,
            activeEffectsList: [...this.activePotionEffects]
        };
    }

    // Reset to initial state (PRESERVE ACTIVE EFFECTS unless specifically cleared)
    reset(clearActiveEffects = false) {
        this.basePotions = 1;
        this.alchemyBonuses = 0;
        this.availablePotions = 1;
        this.maxPotions = 1;
        
        if (clearActiveEffects) {
            // Clear active effects for new game scenarios
            const clearedCount = this.activePotionEffects.length;
            this.activePotionEffects = [];
        }
    }

    // Specific method for new game reset
    resetForNewGame() {
        this.reset(true); // Force clear active effects
    }

    // Specific method for turn reset (existing behavior)
    resetForTurn() {
        this.reset(false); // Preserve active effects
    }
}

// Create global instance
const potionHandler = new PotionHandler();

// CSS is now handled in action-display.css instead of dynamic injection
// (The previous dynamic CSS injection code has been removed)

// Export both the class and the instance
export { potionHandler };

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.potionHandler = potionHandler;
}

// Legacy function exports for backward compatibility
export async function handlePotionUse(cardIndex, cardName, heroSelection) {
    return await potionHandler.handlePotionClick(cardIndex, cardName, heroSelection);
}