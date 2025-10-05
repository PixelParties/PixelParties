// potionHandler.js - Enhanced Potion Management System with Persistent Battle Effects and Multi-Player Support
// UPDATED: Fixed formation phase visual sync issue and removed all console logging

export class PotionHandler {
    constructor() {
        this.basePotions = 1; // Base potions per turn (always 1)
        this.alchemyBonuses = 0; // Additional potions from Alchemy abilities
        this.availablePotions = 1; // Current available potions this turn
        this.maxPotions = 1; // Maximum potions (base + alchemy bonuses)
        
        // NEW: Persistent potion effects that carry over to battle
        this.activePotionEffects = []; // Array of active potion effects
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
            'HealingPotion',
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
            'PlanetInABottle',
            'TeleportationPowder',
            'PunchInTheBox'
        ];
        
        return knownPotions.includes(cardName);
    }

    // ===== BATTLE PHASE DETECTION =====
    
    // Check if we're currently in battle phase
    isInBattlePhase(heroSelection = null) {
        if (!heroSelection) return false;
        
        // Check if we're currently in battle phase
        const currentPhase = heroSelection.getCurrentPhase();
        return currentPhase === 'battle_active';
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
                }

                // Show special usage notification for ElixirOfQuickness
                this.showPotionUsage(cardName);
                
                // Only send visual sync during battle phase
                if (this.isInBattlePhase(heroSelection)) {
                    this.sendPotionVisualSync('potion_usage', {
                        potionName: cardName,
                        visualType: 'usage'
                    }, heroSelection);
                }

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
            }

            // ===== SPECIAL HANDLING FOR PLANET IN A BOTTLE =====
            if (cardName === 'PlanetInABottle') {
                // PlanetInABottle: Place random Area Spell, draw 1 card, no battle effects
                try {
                    const { PlanetInABottlePotion } = await import('./Potions/planetInABottle.js');
                    const planetBottle = new PlanetInABottlePotion();
                    
                    // Apply the planet effect (place random area)
                    const planetSuccess = await planetBottle.applyPlanetInABottleEffect(heroSelection);
                    
                    if (planetSuccess) {
                        // Draw 1 card (normal potion behavior)
                        if (heroSelection.handManager && heroSelection.deckManager) {
                            const drawnCards = heroSelection.handManager.drawCards(1);
                        }

                        // Show special usage notification for PlanetInABottle
                        this.showPotionUsage(cardName);
                        
                        // Only send visual sync during battle phase
                        if (this.isInBattlePhase(heroSelection)) {
                            this.sendPotionVisualSync('potion_usage', {
                                potionName: cardName,
                                visualType: 'usage'
                            }, heroSelection);
                        }

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
                    } else {
                        // Planet effect failed, but potion was still consumed
                        // Show error but don't restore potion count (already consumed)
                        this.showPotionError('Failed to place Area Spell!', cardName);
                        
                        // Still draw a card as fallback
                        if (heroSelection.handManager && heroSelection.deckManager) {
                            const drawnCards = heroSelection.handManager.drawCards(1);
                        }
                        
                        // Update UI
                        if (heroSelection.updateHandDisplay) {
                            heroSelection.updateHandDisplay();
                        }
                        this.updatePotionDisplay();
                        
                        // Save state
                        if (heroSelection.autoSave) {
                            await heroSelection.autoSave();
                        }
                        
                        return true; // Still return true - potion was consumed
                    }
                } catch (error) {
                    // Show error but potion was still consumed
                    this.showPotionError('Failed to use Planet in a Bottle!', cardName);
                    
                    // Fallback: still draw a card
                    if (heroSelection.handManager && heroSelection.deckManager) {
                        const drawnCards = heroSelection.handManager.drawCards(1);
                    }
                    
                    // Update UI
                    if (heroSelection.updateHandDisplay) {
                        heroSelection.updateHandDisplay();
                    }
                    this.updatePotionDisplay();
                    
                    // Save state
                    if (heroSelection.autoSave) {
                        await heroSelection.autoSave();
                    }
                    
                    return true; // Still return true - potion was consumed
                }
            }

            // ===== NORMAL POTION HANDLING (ALL OTHER POTIONS) =====
            // Add potion effect to active effects list for battle
            this.addPotionEffect(cardName);

            // Draw 1 card from deck (normal potion behavior)
            if (heroSelection.handManager && heroSelection.deckManager) {
                const drawnCards = heroSelection.handManager.drawCards(1);
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
        
        // Show confirmation of effect being added
        this.showPotionEffectAdded(potionName);
        
        // Only send visual sync during battle phase
        if (this.isInBattlePhase()) {
            this.sendPotionVisualSync('potion_effect_added', {
                potionName: potionName,
                visualType: 'effect_added'
            });
        }
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
            this.showPotionEffectsCleared(effectCount);
            
            // Only send visual sync during battle phase
            if (this.isInBattlePhase()) {
                this.sendPotionVisualSync('potion_effects_cleared', {
                    effectCount: effectCount,
                    visualType: 'effects_cleared'
                });
            }
        }
    }

    // Apply all active potion effects at battle start (single player - backward compatibility)
    async applyPotionEffectsAtBattleStart(battleManager) {
        if (!this.activePotionEffects.length) {
            return;
        }

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
                // Handle error silently
            }
        }

        // Show summary of applied effects
        this.showPotionEffectsApplied(effectGroups);
        
        // Send visual sync to guest
        this.sendPotionVisualSync('potion_effects_applied', {
            effectGroups: effectGroups,
            visualType: 'effects_applied'
        });
    }

    // ===== NEW: MULTI-PLAYER BATTLE EFFECT SYSTEM =====

    // Apply potion effects from both players at battle start
    async applyBothPlayersPotionEffectsAtBattleStart(hostPotionState, guestPotionState, battleManager) {
        if (!battleManager) {
            return;
        }
        
        let totalEffectsApplied = 0;
        
        // ===== SPECIAL HANDLING FOR SWORD IN A BOTTLE =====
        // Extract SwordInABottle effects for simultaneous processing
        const hostSwordEffects = hostPotionState?.activePotionEffects?.filter(effect => effect.name === 'SwordInABottle') || [];
        const guestSwordEffects = guestPotionState?.activePotionEffects?.filter(effect => effect.name === 'SwordInABottle') || [];
        
        if (hostSwordEffects.length > 0 || guestSwordEffects.length > 0) {
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
                
            } catch (error) {
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
            
            // Show visual effects for applied potions
            const allEffectGroups = {};
            
            // Combine host effects
            if (hostPotionState?.activePotionEffects) {
                hostPotionState.activePotionEffects.forEach(effect => {
                    if (!allEffectGroups[effect.name]) {
                        allEffectGroups[effect.name] = [];
                    }
                    allEffectGroups[effect.name].push(effect);
                });
            }
            
            // Combine guest effects
            if (guestPotionState?.activePotionEffects) {
                guestPotionState.activePotionEffects.forEach(effect => {
                    if (!allEffectGroups[effect.name]) {
                        allEffectGroups[effect.name] = [];
                    }
                    allEffectGroups[effect.name].push(effect);
                });
            }
            
            // Show combined effects applied notification
            this.showPotionEffectsApplied(allEffectGroups);
            
            // Send visual sync to guest
            this.sendPotionVisualSync('potion_effects_applied', {
                effectGroups: allEffectGroups,
                visualType: 'effects_applied',
                totalEffects: totalEffectsApplied
            });
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
                // Handle error silently
            }
        }
        
        return effectsApplied;
    }

    // ===== NEW: POTION-SPECIFIC VISUAL EFFECTS HANDLER =====

    // Handle potion-specific visual effects for guest
    async handlePotionSpecificVisual(data) {
        const { potionName, visualType, playerSide, effectCount = 1 } = data;
        
        if (visualType !== 'potion_effects') {
            return;
        }
        
        // Get battle manager from window or global context
        let battleManager = null;
        if (window.battleManager) {
            battleManager = window.battleManager;
        } else if (typeof window !== 'undefined' && window.heroSelection && window.heroSelection.battleManager) {
            battleManager = window.heroSelection.battleManager;
        }
        
        if (!battleManager) {
            return;
        }
        
        // Only process on guest side
        if (battleManager.isAuthoritative) {
            return;
        }
        
        try {
            // Route to specific potion module for visual effects
            switch (potionName) {
                case 'AcidVial':
                    const { AcidVialPotion } = await import('./Potions/acidVial.js');
                    const acidVialPotion = new AcidVialPotion();
                    await this.applyGuestVisualEffects(acidVialPotion, data, battleManager);
                    break;
                    
                case 'BottledFlame':
                    const { BottledFlamePotion } = await import('./Potions/bottledFlame.js');
                    const bottledFlamePotion = new BottledFlamePotion();
                    await this.applyGuestVisualEffects(bottledFlamePotion, data, battleManager);
                    break;
                    
                case 'BottledLightning':
                case 'bottledLightning':
                    const { BottledLightningPotion } = await import('./Potions/bottledLightning.js');
                    const bottledLightningPotion = new BottledLightningPotion();
                    await bottledLightningPotion.guest_handleVisualEffects(data, battleManager);
                    break;
                    
                case 'ElixirOfCold':
                case 'elixirOfCold':
                    const { ElixirOfColdPotion } = await import('./Potions/elixirOfCold.js');
                    const elixirOfColdPotion = new ElixirOfColdPotion();
                    await this.applyGuestVisualEffects(elixirOfColdPotion, data, battleManager);
                    break;
                    
                case 'CloudInABottle':
                    const { CloudInABottlePotion } = await import('./Potions/cloudInABottle.js');
                    const cloudInABottlePotion = new CloudInABottlePotion();
                    await this.applyGuestVisualEffects(cloudInABottlePotion, data, battleManager);
                    break;
                    
                case 'ElixirOfImmortality':
                    const { ElixirOfImmortality } = await import('./Potions/elixirOfImmortality.js');
                    const elixirOfImmortality = new ElixirOfImmortality();
                    await this.applyGuestVisualEffects(elixirOfImmortality, data, battleManager);
                    break;
                    
                case 'BoulderInABottle':
                    const { BoulderInABottlePotion } = await import('./Potions/boulderInABottle.js');
                    const boulderInABottlePotion = new BoulderInABottlePotion();
                    await this.applyGuestVisualEffects(boulderInABottlePotion, data, battleManager);
                    break;

                case 'ElixirOfStrength':
                    const { ElixirOfStrengthPotion } = await import('./Potions/elixirOfStrength.js');
                    const elixirOfStrengthPotion = new ElixirOfStrengthPotion();
                    await elixirOfStrengthPotion.guest_handleVisualEffects(data, battleManager);
                    break;

                case 'LifeSerum':
                    const { LifeSerumPotion } = await import('./Potions/lifeSerum.js');
                    const lifeSerumPotion = new LifeSerumPotion();
                    await lifeSerumPotion.guest_handleVisualEffects(data, battleManager);
                    break;

                case 'PoisonVial':
                    const { PoisonVialPotion } = await import('./Potions/poisonVial.js');
                    const poisonVialPotion = new PoisonVialPotion();
                    await poisonVialPotion.guest_handleVisualEffects(data, battleManager);
                    break;

                case 'SwordInABottle':
                    const { SwordInABottlePotion } = await import('./Potions/swordInABottle.js');
                    const swordInABottlePotion = new SwordInABottlePotion();
                    await swordInABottlePotion.guest_handleVisualEffects(data, battleManager);
                    break;

                case 'TeleportationPowder':
                    const { TeleportationPowderPotion } = await import('./Potions/teleportationPowder.js');
                    const teleportationPowderPotion = new TeleportationPowderPotion();
                    await teleportationPowderPotion.guest_handleVisualEffects(data, battleManager);
                    break;

                case 'PunchInTheBox':
                    const { PunchInTheBoxPotion } = await import('./Potions/punchInTheBox.js');
                    const punchInTheBoxPotion = new PunchInTheBoxPotion();
                    await punchInTheBoxPotion.guest_handleVisualEffects(data, battleManager);
                    break;

                case 'ExperimentalPotion':
                    const { ExperimentalPotionPotion } = await import('./Potions/experimentalPotion.js');
                    const experimentalPotionPotion = new ExperimentalPotionPotion();
                    await experimentalPotionPotion.guest_handleVisualEffects(data, battleManager);
                    break;

                case 'MonsterInABottle':
                    const { MonsterInABottlePotion } = await import('./Potions/monsterInABottle.js');
                    const monsterInABottlePotion = new MonsterInABottlePotion();
                    await monsterInABottlePotion.guest_handleVisualEffects(data, battleManager);
                    break;

                case 'OverflowingChalice':
                    const { OverflowingChalicePotion } = await import('./Potions/overflowingChalice.js');
                    const overflowingChalicePotion = new OverflowingChalicePotion();
                    await overflowingChalicePotion.guest_handleVisualEffects(data, battleManager);
                    break;

                case 'MagicLamp':
                    const { MagicLampPotion } = await import('./Potions/magicLamp.js');
                    const magicLampPotion = new MagicLampPotion();
                    await magicLampPotion.guest_handleVisualEffects(data, battleManager);
                    break;
                    
                // Add more potion cases as needed
                default:
                    break;
            }
        } catch (error) {
            // Handle error silently
        }
    }

    // Apply guest visual effects using the potion's visual methods
    async applyGuestVisualEffects(potionInstance, data, battleManager) {
        const { potionName, playerSide, effectCount = 1 } = data;
        
        // Determine targets from guest's perspective
        // If host used the potion, determine the appropriate targets based on potion type
        const isHostPotion = (playerSide === 'host');
        
        // Get targets based on potion type and who used it
        let targets = [];
        
        // Check potion targeting type
        const targetType = this.getPotionTargetType(potionName);
        
        switch (targetType) {
            case 'enemy_all':
                // Targets all enemies (from user's perspective)
                targets = isHostPotion ? 
                    this.getGuestTargetsForHostPotion(battleManager, 'enemy') :
                    this.getGuestTargetsForGuestPotion(battleManager, 'enemy');
                break;
                
            case 'ally_all':
                // Targets all allies (from user's perspective)
                targets = isHostPotion ? 
                    this.getGuestTargetsForHostPotion(battleManager, 'ally') :
                    this.getGuestTargetsForGuestPotion(battleManager, 'ally');
                break;
                
            case 'enemy_heroes_only':
                // Targets only enemy heroes
                targets = isHostPotion ? 
                    this.getGuestHeroTargetsForHostPotion(battleManager, 'enemy') :
                    this.getGuestHeroTargetsForGuestPotion(battleManager, 'enemy');
                break;
                
            case 'ally_heroes_only':
                // Targets only ally heroes
                targets = isHostPotion ? 
                    this.getGuestHeroTargetsForHostPotion(battleManager, 'ally') :
                    this.getGuestHeroTargetsForGuestPotion(battleManager, 'ally');
                break;
                
            default:
                return;
        }
        
        if (targets.length === 0) {
            return;
        }
        
        // Apply visual effects to all targets
        const visualPromises = targets.map(target => {
            // Call the appropriate visual method based on potion type
            switch (potionName) {
                case 'AcidVial':
                    return potionInstance.showAcidSplashEffect(target, battleManager);
                case 'BottledFlame':
                    return potionInstance.showBurstingFlameEffect(target, battleManager);
                case 'ElixirOfCold':
                case 'elixirOfCold':
                    return potionInstance.showColdBlessing(target, battleManager);
                case 'CloudInABottle':
                    return potionInstance.showCloudedApplicationEffect(target, battleManager);
                case 'ElixirOfImmortality':
                    return potionInstance.showImmortalApplicationEffect(target, battleManager);
                case 'BoulderInABottle':
                    return potionInstance.playQuickSummoningEffect(target, battleManager);
                // ADD THESE NEW CASES:
                case 'ElixirOfStrength':
                    return potionInstance.showStrengthBoostEffect(target, battleManager, potionInstance.attackBonus * effectCount);
                case 'LifeSerum':
                    return potionInstance.showLifeBoostEffect(target, battleManager, potionInstance.hpBonus * effectCount);
                case 'PoisonVial':
                    return potionInstance.showPoisonCloudEffect(target, battleManager);
                case 'TeleportationPowder':
                    // TeleportationPowder targets creatures, so we need creature info
                    if (target.type === 'creature') {
                        const creatureInfo = this.findCreatureInfoForTarget(target, battleManager);
                        if (creatureInfo) {
                            return potionInstance.showDarkEnergyEffect(target, battleManager, creatureInfo);
                        }
                    }
                    return Promise.resolve();
                case 'PunchInTheBox':
                    return potionInstance.showPunchEffect(target, battleManager);
                case 'ExperimentalPotion':
                    return potionInstance.showTransformationEffect(playerRole, battleManager);
                case 'MonsterInABottle':
                    return potionInstance.playQuickSummoningEffect(target);
                case 'SwordInABottle':
                case 'OverflowingChalice':
                case 'MagicLamp':
                    // These potions don't have specific target-based visual methods
                    return Promise.resolve();
                default:
                    return Promise.resolve();
            }
        });
        
        await Promise.all(visualPromises);
        
        // Show battle log message from guest's perspective
        const playerName = isHostPotion ? 'Host' : 'Guest';
        const logType = isHostPotion ? 'error' : 'success'; // From guest's perspective
        
        const formattedName = this.formatCardName(potionName);
        let message;
        if (effectCount === 1) {
            message = `🧪 ${playerName}'s ${formattedName} affects ${targets.length} target(s)!`;
        } else {
            message = `🧪 ${playerName}'s ${effectCount} ${formattedName}s affect ${targets.length} target(s)!`;
        }
        
        battleManager.addCombatLog(message, logType);
    }

    // Helper method to find creature info for TeleportationPowder visual effects
    findCreatureInfoForTarget(creature, battleManager) {
        // Search through all heroes and their creatures to find the creature info
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
            
            for (const position of ['left', 'center', 'right']) {
                const hero = heroes[position];
                if (!hero || !hero.creatures) continue;
                
                const creatureIndex = hero.creatures.indexOf(creature);
                if (creatureIndex !== -1) {
                    return {
                        hero: hero,
                        creatureIndex: creatureIndex,
                        heroPosition: position,
                        heroSide: side
                    };
                }
            }
        }
        
        return null;
    }

    // Get potion target type
    getPotionTargetType(potionName) {
        const targetTypes = {
            'AcidVial': 'enemy_heroes_only',
            'BottledFlame': 'enemy_all',
            'BottledLightning': 'enemy_all',
            'bottledLightning': 'enemy_all',
            'ElixirOfCold': 'ally_heroes_only',
            'elixirOfCold': 'ally_heroes_only',
            'CloudInABottle': 'ally_all',
            'ElixirOfImmortality': 'ally_heroes_only',
            'BoulderInABottle': 'ally_heroes_only',
            'PoisonVial': 'enemy_all',
            'LifeSerum': 'ally_heroes_only',
            'ElixirOfStrength': 'ally_heroes_only'
        };
        
        return targetTypes[potionName] || 'enemy_all';
    }

    // Get targets for host potion from guest perspective
    getGuestTargetsForHostPotion(battleManager, targetType) {
        if (targetType === 'enemy') {
            // Host's enemies are guest's own heroes/creatures
            return this.getAllTargetsFromHeroes(Object.values(battleManager.playerHeroes));
        } else {
            // Host's allies are guest's opponent heroes/creatures
            return this.getAllTargetsFromHeroes(Object.values(battleManager.opponentHeroes));
        }
    }

    // Get targets for guest potion from guest perspective
    getGuestTargetsForGuestPotion(battleManager, targetType) {
        if (targetType === 'enemy') {
            // Guest's enemies are host's heroes/creatures (guest's opponents)
            return this.getAllTargetsFromHeroes(Object.values(battleManager.opponentHeroes));
        } else {
            // Guest's allies are guest's own heroes/creatures
            return this.getAllTargetsFromHeroes(Object.values(battleManager.playerHeroes));
        }
    }

    // Get hero targets only
    getGuestHeroTargetsForHostPotion(battleManager, targetType) {
        if (targetType === 'enemy') {
            return Object.values(battleManager.playerHeroes).filter(hero => hero && hero.alive);
        } else {
            return Object.values(battleManager.opponentHeroes).filter(hero => hero && hero.alive);
        }
    }

    getGuestHeroTargetsForGuestPotion(battleManager, targetType) {
        if (targetType === 'enemy') {
            return Object.values(battleManager.opponentHeroes).filter(hero => hero && hero.alive);
        } else {
            return Object.values(battleManager.playerHeroes).filter(hero => hero && hero.alive);
        }
    }

    // Get all targets (heroes and creatures) from hero array
    getAllTargetsFromHeroes(heroes) {
        const targets = [];
        
        heroes.forEach(hero => {
            if (hero && hero.alive) {
                targets.push(hero);
                
                // Add living creatures
                if (hero.creatures) {
                    hero.creatures.forEach(creature => {
                        if (creature && creature.alive) {
                            targets.push(creature);
                        }
                    });
                }
            }
        });
        
        return targets;
    }

    // ===== P2P VISUAL SYNCHRONIZATION =====

    // Send visual sync message to guest
    sendPotionVisualSync(messageType, data, heroSelection = null) {
        // Try to get battleManager from various contexts
        let battleManager = null;
        
        // First try the passed battleManager from battle start context
        if (data && data.battleManager) {
            battleManager = data.battleManager;
            delete data.battleManager; // Remove from data before sending
        } else if (heroSelection && heroSelection.battleManager) {
            battleManager = heroSelection.battleManager;
        } else if (window.battleManager) {
            battleManager = window.battleManager;
        } else if (typeof window !== 'undefined' && window.heroSelection && window.heroSelection.battleManager) {
            battleManager = window.heroSelection.battleManager;
        }
        
        if (battleManager && battleManager.sendBattleUpdate && battleManager.isAuthoritative) {
            const syncData = {
                ...data,
                timestamp: Date.now(),
                // Only set playerSide if not already provided
                playerSide: data.playerSide || (battleManager.isHost ? 'host' : 'guest')
            };
            
            battleManager.sendBattleUpdate(messageType, syncData);
        }
    }

    // ===== GUEST VISUAL HANDLERS =====

    // Handle potion usage visual on guest side
    guest_handlePotionUsageVisual(data) {
        const { potionName, playerSide, visualType } = data;
        
        if (visualType === 'usage') {
            this.showPotionUsage(potionName);
        }
    }

    // Handle potion effect added visual on guest side
    guest_handlePotionEffectAddedVisual(data) {
        const { potionName, playerSide, visualType } = data;
        
        if (visualType === 'effect_added') {
            this.showPotionEffectAdded(potionName);
        }
    }

    // Handle potion effects applied visual on guest side
    guest_handlePotionEffectsAppliedVisual(data) {
        const { effectGroups, playerSide, visualType, totalEffects } = data;
        
        if (visualType === 'effects_applied' && effectGroups) {
            this.showPotionEffectsApplied(effectGroups);
        }
    }

    // Handle potion effects cleared visual on guest side
    guest_handlePotionEffectsClearedVisual(data) {
        const { effectCount, playerSide, visualType } = data;
        
        if (visualType === 'effects_cleared' && effectCount > 0) {
            this.showPotionEffectsCleared(effectCount);
        }
    }

    // Delegate potion effects to their specific modules
    async delegatePotionEffectToModule(potionName, effects, playerRole, battleManager) {
        switch (potionName) {
            case 'ElixirOfStrength':
                return await this.handleElixirOfStrengthEffects(effects, playerRole, battleManager);
            
            case 'ElixirOfCold':
            case 'elixirOfCold':
                return await this.handleElixirOfColdEffects(effects, playerRole, battleManager);

            case 'LifeSerum':
                return await this.handleLifeSerumEffects(effects, playerRole, battleManager);
            
            case 'BottledFlame':
                return await this.handleBottledFlameEffects(effects, playerRole, battleManager);
            
            case 'BottledLightning':
            case 'bottledLightning':
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

            case 'HealingPotion':
                return await this.handleHealingPotionEffects(effects, playerRole, battleManager);

            case 'MonsterInABottle':
                return await this.handleMonsterInABottleEffects(effects, playerRole, battleManager);

            case 'CloudInABottle':
                return await this.handleCloudInABottleEffects(effects, playerRole, battleManager);

            case 'OverflowingChalice':
                return await this.handleOverflowingChaliceEffects(effects, playerRole, battleManager);

            case 'TeleportationPowder':
                return await this.handleTeleportationPowderEffects(effects, playerRole, battleManager);

            case 'MagicLamp':
                return await this.handleMagicLampEffects(effects, playerRole, battleManager);
                
            case 'PunchInTheBox':
                return await this.handlePunchInTheBoxEffects(effects, playerRole, battleManager);
                
            // Add other potion types here as they get battle effects
            default:
                return 0;
        }
    }

    async handlePunchInTheBoxEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the PunchInTheBox module
            const { PunchInTheBoxPotion } = await import('./Potions/punchInTheBox.js');
            const punchInTheBoxPotion = new PunchInTheBoxPotion();
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'PunchInTheBox',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the PunchInTheBox module
            const effectsProcessed = await punchInTheBoxPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
            // Fallback: log failure
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `👊 ${playerName}'s Punch in the Box failed to activate properly`, 
                'warning'
            );
            
            return effects.length;
        }
    }

    async handleMagicLampEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the MagicLamp module
            const { MagicLampPotion } = await import('./Potions/magicLamp.js');
            const magicLampPotion = new MagicLampPotion();
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'MagicLamp',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the MagicLamp module
            const effectsProcessed = await magicLampPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
            // Fallback: log failure
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `🪔 ${playerName}'s Magic Lamp failed to activate properly`, 
                'warning'
            );
            
            return effects.length;
        }
    }

    async handleTeleportationPowderEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the TeleportationPowder module
            const { TeleportationPowderPotion } = await import('./Potions/teleportationPowder.js');
            const teleportationPowderPotion = new TeleportationPowderPotion();
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'TeleportationPowder',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the TeleportationPowder module
            const effectsProcessed = await teleportationPowderPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
            // Fallback: log failure
            const playerName = playerRole === 'host' ? 'Host' : 'Guest';
            battleManager.addCombatLog(
                `🌀 ${playerName}'s Teleportation Powder failed to activate properly`, 
                'warning'
            );
            
            return effects.length;
        }
    }

    async handleOverflowingChaliceEffects(effects, playerRole, battleManager) {
        try {
            const { OverflowingChalicePotion } = await import('./Potions/overflowingChalice.js');
            const overflowingChalicePotion = new OverflowingChalicePotion();
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'OverflowingChalice',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            const effectsProcessed = await overflowingChalicePotion.handlePotionEffectsForPlayer(
                effects, playerRole, battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
            return effects.length;
        }
    }

    async handleCloudInABottleEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the CloudInABottle module
            const { CloudInABottlePotion } = await import('./Potions/cloudInABottle.js');
            const cloudInABottlePotion = new CloudInABottlePotion();
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'CloudInABottle',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the CloudInABottle module
            const effectsProcessed = await cloudInABottlePotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
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
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'MonsterInABottle',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the MonsterInABottle module
            const effectsProcessed = await monsterInABottlePotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
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

    async handleHealingPotionEffects(effects, playerRole, battleManager) {
        try {
            const { HealingPotion } = await import('./Potions/healingPotion.js');
            const healingPotion = new HealingPotion();
            
            const effectsProcessed = await healingPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
            return 0;
        }
    }

    async handleElixirOfImmortality(effects, playerRole, battleManager) {
        try {
            const { ElixirOfImmortality } = await import('./Potions/elixirOfImmortality.js');
            const elixirOfImmortality = new ElixirOfImmortality();
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'ElixirOfImmortality',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            const effectsProcessed = await elixirOfImmortality.handlePotionEffectsForPlayer(
                effects, playerRole, battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
            return 0;
        }
    }

    async handleExperimentalPotionEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the ExperimentalPotion module
            const { ExperimentalPotionPotion } = await import('./Potions/experimentalPotion.js');
            const experimentalPotionPotion = new ExperimentalPotionPotion();
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'ExperimentalPotion',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the ExperimentalPotion module
            const effectsProcessed = await experimentalPotionPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
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
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'AcidVial',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the AcidVial module
            const effectsProcessed = await acidVialPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
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
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'ElixirOfStrength',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the ElixirOfStrength module
            const effectsProcessed = await elixirOfStrengthPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
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
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'ElixirOfCold',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            const effectsProcessed = await elixirOfColdPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
            return 0;
        }
    }

    async handleLifeSerumEffects(effects, playerRole, battleManager) {
        try {
            const { LifeSerumPotion } = await import('./Potions/lifeSerum.js');
            const lifeSerumPotion = new LifeSerumPotion();
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'LifeSerum',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            const effectsProcessed = await lifeSerumPotion.handlePotionEffectsForPlayer(
                effects, playerRole, battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
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
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'SwordInABottle',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Use the individual player method (fallback)
            const effectsProcessed = await swordInABottlePotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
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
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'BoulderInABottle',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the BoulderInABottle module
            const effectsProcessed = await boulderInABottlePotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
            return 0;
        }
    }

    async handleBottledFlameEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the enhanced BottledFlame module
            const { BottledFlamePotion } = await import('./Potions/bottledFlame.js');
            const bottledFlamePotion = new BottledFlamePotion();
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'BottledFlame',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the BottledFlame module
            const effectsProcessed = await bottledFlamePotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
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
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'BottledLightning',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the BottledLightning module
            const effectsProcessed = await bottledLightningPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
            return 0;
        }
    }

    async handlePoisonVialEffects(effects, playerRole, battleManager) {
        try {
            // Import and use the PoisonVial module
            const { PoisonVialPotion } = await import('./Potions/poisonVial.js');
            const poisonVialPotion = new PoisonVialPotion();
            
            // Send visual sync to guest BEFORE applying effects
            this.sendPotionVisualSync('potion_specific_visual', {
                potionName: 'PoisonVial',
                visualType: 'potion_effects',
                effectCount: effects.length,
                playerSide: playerRole,
                battleManager: battleManager 
            });
            
            // Delegate everything to the PoisonVial module
            const effectsProcessed = await poisonVialPotion.handlePotionEffectsForPlayer(
                effects, 
                playerRole, 
                battleManager
            );
            
            return effectsProcessed;
            
        } catch (error) {
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
            return false;
        }

        this.basePotions = state.basePotions || 1;
        this.alchemyBonuses = state.alchemyBonuses || 0;
        
        // Properly handle 0 values by checking for undefined/null instead of falsy
        this.availablePotions = (state.availablePotions !== undefined && state.availablePotions !== null) ? state.availablePotions : 1;
        this.maxPotions = state.maxPotions || 1;

        // Import active potion effects
        this.activePotionEffects = state.activePotionEffects || [];

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