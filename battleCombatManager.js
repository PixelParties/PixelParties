// battleCombatManager.js - Combat Management Module
// Handles damage calculation, targeting, and combat execution

import { recordKillWithVisualFeedback } from './Artifacts/wantedPoster.js';

export class BattleCombatManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
    }

    // Use Hero's pre-calculated attack value directly
    getHeroAbilityModifiers(hero) {
        const modifiers = {
            attackBonus: 0,
            defenseBonus: 0,
            specialEffects: []
        };
        
        // Simply return the difference between current attack and base attack
        // The hero already has the correct attack value calculated in heroSelection
        const attackDifference = hero.getCurrentAttack() - hero.baseAtk;
        
        if (attackDifference > 0) {
            modifiers.attackBonus = attackDifference;
            
            // For display purposes, show what contributed to the bonus
            if (hero.hasAbility('Fighting')) {
                const fightingStacks = hero.getAbilityStackCount('Fighting');
                modifiers.specialEffects.push(`Fighting (+${fightingStacks * 10} ATK)`);
            }
            
            // Special case for Toras: show equipment bonus if applicable
            if (hero.name === 'Toras' && hero.equipment && hero.equipment.length > 0) {
                const uniqueEquipmentNames = new Set();
                hero.equipment.forEach(item => {
                    const itemName = item.name || item.cardName;
                    if (itemName) {
                        uniqueEquipmentNames.add(itemName);
                    }
                });
                
                const uniqueCount = uniqueEquipmentNames.size;
                if (uniqueCount > 0) {
                    const equipmentBonus = uniqueCount * 10;
                    modifiers.specialEffects.push(`Toras Equipment Mastery (+${equipmentBonus} ATK from ${uniqueCount} unique items)`);
                }
            }
        }
        
        return modifiers;
    }

    // Find target with creatures (heroes now target last creature)
    authoritative_findTargetWithCreatures(attackerPosition, attackerSide) {
        if (!this.battleManager.isAuthoritative) return null;

        const targets = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        // Get all alive targets for fallback
        const aliveTargets = Object.values(targets).filter(hero => hero && hero.alive);
        if (aliveTargets.length === 0) return null;

        // NEW: Check for taunting zones first
        const tauntingZones = this.findTauntingZones(attackerSide);
        
        if (tauntingZones.length > 0) {
            console.log(`🎯 Taunting detected! Prioritizing zones: ${tauntingZones.join(', ')}`);
            
            // Prioritize taunting zones - try to find closest taunting zone to attacker
            let preferredTauntingZone = null;
            
            // Check if attacker's same position has taunting first
            if (tauntingZones.includes(attackerPosition)) {
                preferredTauntingZone = attackerPosition;
            } else {
                // Find closest taunting zone based on attacker position
                switch (attackerPosition) {
                    case 'left':
                        if (tauntingZones.includes('center')) preferredTauntingZone = 'center';
                        else if (tauntingZones.includes('right')) preferredTauntingZone = 'right';
                        break;
                    case 'center':
                        // For center, pick first available taunting zone
                        preferredTauntingZone = tauntingZones[0];
                        break;
                    case 'right':
                        if (tauntingZones.includes('center')) preferredTauntingZone = 'center';
                        else if (tauntingZones.includes('left')) preferredTauntingZone = 'left';
                        break;
                }
                
                // If no preferred zone found, use first taunting zone
                if (!preferredTauntingZone) {
                    preferredTauntingZone = tauntingZones[0];
                }
            }
            
            // Try to get target from preferred taunting zone
            if (preferredTauntingZone) {
                const tauntingTarget = this.getTargetForPosition(preferredTauntingZone, attackerSide);
                if (tauntingTarget) {
                    console.log(`📢 ${tauntingTarget.hero.name} draws the attack with taunting!`);
                    return tauntingTarget;
                }
            }
            
            // Fallback: try any taunting zone
            for (const zone of tauntingZones) {
                const tauntingTarget = this.getTargetForPosition(zone, attackerSide);
                if (tauntingTarget) {
                    console.log(`📢 ${tauntingTarget.hero.name} draws the attack with taunting!`);
                    return tauntingTarget;
                }
            }
        }

        // No taunting or taunting zones have no valid targets - use normal targeting logic
        console.log(`🎯 Normal targeting (no taunting priority)`);

        // Primary targeting: try same position first
        const primaryTarget = this.getTargetForPosition(attackerPosition, attackerSide);
        if (primaryTarget) return primaryTarget;

        // Alternative targeting logic (same as before)
        switch (attackerPosition) {
            case 'left':
                // Try center first, then right
                const leftToCenterTarget = this.getTargetForPosition('center', attackerSide);
                if (leftToCenterTarget) return leftToCenterTarget;
                
                const leftToRightTarget = this.getTargetForPosition('right', attackerSide);
                if (leftToRightTarget) return leftToRightTarget;
                break;
                
            case 'center':
                // Random target selection, but still check creatures first
                const randomTargetHero = this.battleManager.getRandomChoice(aliveTargets);
                if (randomTargetHero) {
                    const randomTarget = this.getTargetForPosition(randomTargetHero.position, attackerSide);
                    if (randomTarget) return randomTarget;
                }
                break;
                
            case 'right':
                // Try center first, then left
                const rightToCenterTarget = this.getTargetForPosition('center', attackerSide);
                if (rightToCenterTarget) return rightToCenterTarget;
                
                const rightToLeftTarget = this.getTargetForPosition('left', attackerSide);
                if (rightToLeftTarget) return rightToLeftTarget;
                break;
        }
        
        // Last resort - find any alive target (creature first, then hero)
        for (const hero of aliveTargets) {
            const lastResortTarget = this.getTargetForPosition(hero.position, attackerSide);
            if (lastResortTarget) return lastResortTarget;
        }
        
        return null;
    }

    // Find target ignoring creatures (heroes only)
    authoritative_findTargetIgnoringCreatures(attackerPosition, attackerSide) {
        if (!this.battleManager.isAuthoritative) return null;

        const targets = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        // Helper function to create hero target (ignoring creatures)
        const createHeroTarget = (hero, heroPosition) => {
            if (!hero || !hero.alive) return null;
            
            return {
                type: 'hero',
                hero: hero,
                position: heroPosition,
                side: attackerSide === 'player' ? 'opponent' : 'player'
            };
        };

        // Helper function to get hero target for any position (ignoring creatures)
        const getHeroOnlyTargetForPosition = (heroPosition) => {
            const hero = targets[heroPosition];
            if (!hero || !hero.alive) return null;
            
            // Only target the hero (skip creatures entirely)
            return createHeroTarget(hero, heroPosition);
        };

        // Get all alive targets for fallback
        const aliveTargets = Object.values(targets).filter(hero => hero && hero.alive);
        if (aliveTargets.length === 0) return null;

        // NEW: Check for taunting zones first (even for ranged attacks)
        const tauntingZones = this.findTauntingZones(attackerSide);
        
        if (tauntingZones.length > 0) {
            console.log(`🏹 Ranged attack with taunting priority! Zones: ${tauntingZones.join(', ')}`);
            
            // For ranged attacks, still prioritize taunting zones
            let preferredTauntingZone = null;
            
            // Check if attacker's same position has taunting first
            if (tauntingZones.includes(attackerPosition)) {
                preferredTauntingZone = attackerPosition;
            } else {
                // Find closest taunting zone based on attacker position
                switch (attackerPosition) {
                    case 'left':
                        if (tauntingZones.includes('center')) preferredTauntingZone = 'center';
                        else if (tauntingZones.includes('right')) preferredTauntingZone = 'right';
                        break;
                    case 'center':
                        // For center, pick first available taunting zone
                        preferredTauntingZone = tauntingZones[0];
                        break;
                    case 'right':
                        if (tauntingZones.includes('center')) preferredTauntingZone = 'center';
                        else if (tauntingZones.includes('left')) preferredTauntingZone = 'left';
                        break;
                }
                
                // If no preferred zone found, use first taunting zone
                if (!preferredTauntingZone) {
                    preferredTauntingZone = tauntingZones[0];
                }
            }
            
            // Try to get hero target from preferred taunting zone
            if (preferredTauntingZone) {
                const tauntingTarget = getHeroOnlyTargetForPosition(preferredTauntingZone);
                if (tauntingTarget) {
                    console.log(`📢 ${tauntingTarget.hero.name} draws the ranged attack with taunting!`);
                    return tauntingTarget;
                }
            }
            
            // Fallback: try any taunting zone
            for (const zone of tauntingZones) {
                const tauntingTarget = getHeroOnlyTargetForPosition(zone);
                if (tauntingTarget) {
                    console.log(`📢 ${tauntingTarget.hero.name} draws the ranged attack with taunting!`);
                    return tauntingTarget;
                }
            }
        }

        // No taunting or taunting zones have no valid targets - use normal targeting logic
        console.log(`🏹 Normal ranged targeting (no taunting priority)`);

        // Primary targeting: try same position first
        const primaryTarget = getHeroOnlyTargetForPosition(attackerPosition);
        if (primaryTarget) return primaryTarget;

        // Alternative targeting with same priority logic as original
        switch (attackerPosition) {
            case 'left':
                // Try center first, then right
                const leftToCenterTarget = getHeroOnlyTargetForPosition('center');
                if (leftToCenterTarget) return leftToCenterTarget;
                
                const leftToRightTarget = getHeroOnlyTargetForPosition('right');
                if (leftToRightTarget) return leftToRightTarget;
                break;
                
            case 'center':
                // Random target selection
                const randomTargetHero = this.battleManager.getRandomChoice(aliveTargets);
                if (randomTargetHero) {
                    const randomTarget = getHeroOnlyTargetForPosition(randomTargetHero.position);
                    if (randomTarget) return randomTarget;
                }
                break;
                
            case 'right':
                // Try center first, then left
                const rightToCenterTarget = getHeroOnlyTargetForPosition('center');
                if (rightToCenterTarget) return rightToCenterTarget;
                
                const rightToLeftTarget = getHeroOnlyTargetForPosition('left');
                if (rightToLeftTarget) return rightToLeftTarget;
                break;
        }
        
        // Last resort - find any alive hero
        for (const hero of aliveTargets) {
            const lastResortTarget = getHeroOnlyTargetForPosition(hero.position);
            if (lastResortTarget) return lastResortTarget;
        }
        
        return null;
    }

    // Find a completely random target (for death effects, etc.)
    authoritative_findRandomTarget(attackerSide) {
        if (!this.battleManager.isAuthoritative) return null;

        const targets = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        // Collect all possible targets (heroes and creatures)
        const allTargets = [];
        
        Object.keys(targets).forEach(position => {
            const hero = targets[position];
            if (hero && hero.alive) {
                // Add hero as potential target
                allTargets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: attackerSide === 'player' ? 'opponent' : 'player'
                });
                
                // Add living creatures as potential targets
                if (hero.creatures) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            allTargets.push({
                                type: 'creature',
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: attackerSide === 'player' ? 'opponent' : 'player'
                            });
                        }
                    });
                }
            }
        });
        
        if (allTargets.length === 0) return null;
        
        // Return completely random target using deterministic randomness
        const randomIndex = this.battleManager.getRandomInt(0, allTargets.length - 1);
        return allTargets[randomIndex];
    }

    findTauntingZones(attackerSide) {
        if (!this.battleManager.isAuthoritative) return [];

        const targets = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        const tauntingZones = [];
        
        Object.keys(targets).forEach(position => {
            const hero = targets[position];
            if (hero && hero.alive && this.battleManager.statusEffectsManager) {
                if (this.battleManager.statusEffectsManager.hasStatusEffect(hero, 'taunting')) {
                    tauntingZones.push(position);
                }
            }
        });
        
        return tauntingZones;
    }

    getTargetForPosition(heroPosition, attackerSide) {
        const targets = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        const hero = targets[heroPosition];
        if (!hero || !hero.alive) return null;
        
        // Helper function to create creature target if hero has living creatures
        const createCreatureTargetIfAvailable = (hero, heroPosition) => {
            if (!hero || !hero.alive) return null;
            
            const livingCreatures = hero.creatures.filter(c => c.alive);
            if (livingCreatures.length > 0) {
                // Target the FIRST living creature
                return {
                    type: 'creature',
                    hero: hero,
                    creature: livingCreatures[0],
                    creatureIndex: hero.creatures.indexOf(livingCreatures[0]),
                    position: heroPosition,
                    side: attackerSide === 'player' ? 'opponent' : 'player'
                };
            }
            return null;
        };

        // Helper function to create hero target
        const createHeroTarget = (hero, heroPosition) => {
            if (!hero || !hero.alive) return null;
            
            return {
                type: 'hero',
                hero: hero,
                position: heroPosition,
                side: attackerSide === 'player' ? 'opponent' : 'player'
            };
        };

        // Always check creatures first, then hero
        const creatureTarget = createCreatureTargetIfAvailable(hero, heroPosition);
        if (creatureTarget) return creatureTarget;
        
        // If no creatures, target the hero
        return createHeroTarget(hero, heroPosition);
    }

    // Use hero's pre-calculated damage value directly
    calculateDamage(hero, canAct) {
        if (!canAct) return 0;
        
        // Simply use the hero's current attack - all bonuses are already included
        const damage = hero.getCurrentAttack();
        
        // Update display to reflect current stats
        this.battleManager.updateHeroAttackDisplay(hero.side, hero.position, hero);
        
        // Log any ability effects for transparency (but don't recalculate)
        const modifiers = this.getHeroAbilityModifiers(hero);
        if (modifiers.specialEffects.length > 0) {
            this.battleManager.addCombatLog(`🎯 ${hero.name} abilities: ${modifiers.specialEffects.join(', ')}`, 'info');
        }
        
        return damage;
    }

    // Execute hero actions
    async executeHeroActions(playerHeroActor, opponentHeroActor, position) {
        // The battle end check was preventing final kills from being recorded
        
        const playerCanAttack = playerHeroActor !== null;
        const opponentCanAttack = opponentHeroActor !== null;
        
        // NEW: Check for spell casting before attacking
        let playerSpellToCast = null;
        let opponentSpellToCast = null;
        let playerWillAttack = playerCanAttack;
        let opponentWillAttack = opponentCanAttack;
        
        if (playerCanAttack && this.battleManager.spellSystem) {
            playerSpellToCast = this.battleManager.spellSystem.checkSpellCasting(playerHeroActor.data);
            if (playerSpellToCast) {
                playerWillAttack = false; // Hero spent turn casting spell
            }
        }
        
        if (opponentCanAttack && this.battleManager.spellSystem) {
            opponentSpellToCast = this.battleManager.spellSystem.checkSpellCasting(opponentHeroActor.data);
            if (opponentSpellToCast) {
                opponentWillAttack = false; // Hero spent turn casting spell
            }
        }
        
        // Execute spell casting if applicable
        if (playerSpellToCast && this.battleManager.spellSystem) {
            this.battleManager.spellSystem.executeSpellCasting(playerHeroActor.data, playerSpellToCast);
        }
        
        if (opponentSpellToCast && this.battleManager.spellSystem) {
            this.battleManager.spellSystem.executeSpellCasting(opponentHeroActor.data, opponentSpellToCast);
        }
        
        // UPDATED: Check for ranged attackers and use appropriate targeting
        let playerTarget = null;
        let playerIsRanged = false;
        let opponentTarget = null;
        let opponentIsRanged = false;
        
        if (playerWillAttack) {
            playerIsRanged = this.isRangedAttacker(playerHeroActor.data);
            if (playerIsRanged) {
                playerTarget = this.authoritative_findTargetIgnoringCreatures(position, 'player');
                this.battleManager.addCombatLog(`🏹 ${playerHeroActor.data.name} uses ranged attack!`, 'info');
            } else {
                playerTarget = this.authoritative_findTargetWithCreatures(position, 'player');
            }
        }
        
        if (opponentWillAttack) {
            opponentIsRanged = this.isRangedAttacker(opponentHeroActor.data);
            if (opponentIsRanged) {
                opponentTarget = this.authoritative_findTargetIgnoringCreatures(position, 'opponent');
                this.battleManager.addCombatLog(`🏹 ${opponentHeroActor.data.name} uses ranged attack!`, 'info');
            } else {
                opponentTarget = this.authoritative_findTargetWithCreatures(position, 'opponent');
            }
        }
        
        // Check if targets are valid before proceeding
        const playerValidAttack = playerWillAttack && playerTarget;
        const opponentValidAttack = opponentWillAttack && opponentTarget;
        
        // If no valid attacks can be made and no spells were cast, skip animation
        if (!playerValidAttack && !opponentValidAttack && !playerSpellToCast && !opponentSpellToCast) {
            this.battleManager.addCombatLog('💨 No actions taken this turn!', 'info');
            return;
        }
        
        // Only proceed with attack animations/damage for heroes that are attacking
        if (playerValidAttack || opponentValidAttack) {
            // Calculate damage using pre-calculated hero stats
            let playerDamage = playerValidAttack ? 
                this.calculateDamage(playerHeroActor.data, true) : 0;
            let opponentDamage = opponentValidAttack ? 
                this.calculateDamage(opponentHeroActor.data, true) : 0;
            
            // ============================================
            // NEW: APPLY DAMAGE MODIFIERS (TheMastersSword, etc.)
            // ============================================
            let playerEffectsTriggered = [];
            let opponentEffectsTriggered = [];
            
            if (playerValidAttack && this.battleManager.attackEffectsManager) {
                const playerModResult = this.battleManager.attackEffectsManager.calculateDamageModifiers(
                    playerHeroActor.data,
                    playerTarget.type === 'creature' ? playerTarget.creature : playerTarget.hero,
                    playerDamage
                );
                playerDamage = playerModResult.modifiedDamage;
                playerEffectsTriggered = playerModResult.effectsTriggered;
            }
            
            if (opponentValidAttack && this.battleManager.attackEffectsManager) {
                const opponentModResult = this.battleManager.attackEffectsManager.calculateDamageModifiers(
                    opponentHeroActor.data,
                    opponentTarget.type === 'creature' ? opponentTarget.creature : opponentTarget.hero,
                    opponentDamage
                );
                opponentDamage = opponentModResult.modifiedDamage;
                opponentEffectsTriggered = opponentModResult.effectsTriggered;
            }
            
            // Create turn data with potentially modified damage
            const turnData = this.createTurnDataWithCreatures(
                position, 
                playerValidAttack ? playerHeroActor.data : null, playerTarget, playerDamage,
                opponentValidAttack ? opponentHeroActor.data : null, opponentTarget, opponentDamage
            );
            
            // NEW: Add damage modifier info to turn data for network sync
            if (playerEffectsTriggered.length > 0 || opponentEffectsTriggered.length > 0) {
                turnData.damageModifiers = {
                    player: playerEffectsTriggered.map(e => ({
                        name: e.name,
                        multiplier: e.multiplier,
                        swordCount: e.swordCount || 0
                    })),
                    opponent: opponentEffectsTriggered.map(e => ({
                        name: e.name,
                        multiplier: e.multiplier,
                        swordCount: e.swordCount || 0
                    }))
                };
            }
            
            this.battleManager.sendBattleUpdate('hero_turn_execution', turnData);
            
            // Execute attacks with modified damage and effects - UPDATED with ranged flags
            const executionPromise = this.battleManager.executeHeroAttacksWithDamage(
                playerValidAttack ? { 
                    hero: playerHeroActor.data, 
                    target: playerTarget, 
                    damage: playerDamage,
                    effectsTriggered: playerEffectsTriggered,
                    isRanged: playerIsRanged  // NEW: Add ranged flag
                } : null,
                opponentValidAttack ? { 
                    hero: opponentHeroActor.data, 
                    target: opponentTarget, 
                    damage: opponentDamage,
                    effectsTriggered: opponentEffectsTriggered,
                    isRanged: opponentIsRanged  // NEW: Add ranged flag
                } : null
            );
            
            const ackPromise = this.battleManager.waitForGuestAcknowledgment('turn_complete', this.battleManager.getAdaptiveTimeout());
            
            await Promise.all([executionPromise, ackPromise]);
        }
    }

    isRangedAttacker(hero) {
        // For now, Darge always uses ranged attacks as proof of concept
        return hero.name === 'Darge';
    }

    // Execute hero attacks with damage application
    async executeHeroAttacksWithDamage(playerAttack, opponentAttack) {
        if (playerAttack && opponentAttack) {
            // Both heroes attack - log host's attack first, then guest's attack
            let hostAttack, guestAttack;
            
            if (playerAttack.hero.absoluteSide === 'host') {
                hostAttack = playerAttack;
                guestAttack = opponentAttack;
            } else {
                hostAttack = opponentAttack;
                guestAttack = playerAttack;
            }
            
            // Log attacks with host first
            if (this.battleScreen && this.battleScreen.battleLog) {
                this.battleScreen.battleLog.logAttackMessage(hostAttack);
                this.battleScreen.battleLog.logAttackMessage(guestAttack);
            }
            
            // Both heroes attack - collision animation (meet in middle)
            await this.animationManager.animateSimultaneousHeroAttacks(playerAttack, opponentAttack);
            
            // ============================================
            // Apply damage modifier visual effects BEFORE damage
            // ============================================
            if (this.attackEffectsManager) {
                // Small delay to let attack animation reach target
                await this.delay(100);
                
                if (playerAttack.effectsTriggered && playerAttack.effectsTriggered.length > 0) {
                    this.attackEffectsManager.applyDamageModifierEffects(playerAttack.effectsTriggered);
                }
                if (opponentAttack.effectsTriggered && opponentAttack.effectsTriggered.length > 0) {
                    this.attackEffectsManager.applyDamageModifierEffects(opponentAttack.effectsTriggered);
                }
                
                // Wait for effect animations
                if (playerAttack.effectsTriggered?.length > 0 || opponentAttack.effectsTriggered?.length > 0) {
                    await this.delay(400);
                }
            }
            
            // Apply damage with potentially modified values - now includes ranged flag
            this.applyAttackDamageToTarget(playerAttack);
            this.applyAttackDamageToTarget(opponentAttack);
            
            await Promise.all([
                this.animationManager.animateReturn(playerAttack.hero, 'player'),
                this.animationManager.animateReturn(opponentAttack.hero, 'opponent')
            ]);
            
        } else if (playerAttack || opponentAttack) {
            // Only one hero attacks - full dash animation (to target)
            const attack = playerAttack || opponentAttack;
            const side = playerAttack ? 'player' : 'opponent';
            
            // Log the single attack
            if (this.battleScreen && this.battleScreen.battleLog) {
                this.battleScreen.battleLog.logAttackMessage(attack);
            }
            
            await this.animationManager.animateHeroAttack(attack.hero, attack.target);
            
            // ============================================
            // Apply damage modifier visual effects BEFORE damage
            // ============================================
            if (this.attackEffectsManager && attack.effectsTriggered && attack.effectsTriggered.length > 0) {
                // Small delay to let attack animation complete
                await this.delay(100);
                
                this.attackEffectsManager.applyDamageModifierEffects(attack.effectsTriggered);
                
                // Wait for effect animation
                await this.delay(400);
            }
            
            // Apply damage with potentially modified value - now includes ranged flag
            this.applyAttackDamageToTarget(attack);
            
            await this.animationManager.animateReturn(attack.hero, side);
        }
    }

    // Apply damage to target (hero or creature)
    async applyAttackDamageToTarget(attack) {
        if (!attack || !attack.target) return;
        
        if (attack.target.type === 'creature') {
            const wasAlive = attack.target.creature.alive;
            
            // Apply damage to creature - this now handles kill tracking and necromancy revival internally
            this.battleManager.authoritative_applyDamageToCreature({
                hero: attack.target.hero,
                creature: attack.target.creature,
                creatureIndex: attack.target.creatureIndex,
                damage: attack.damage,
                position: attack.target.position,
                side: attack.target.side
            }, {
                source: 'attack', // Specify this was from an attack
                attacker: attack.hero // Pass the attacker for kill tracking
            });
                                    
            // ✅ FIXED: Process attack effects for creature targets WITH effectsTriggered
            if (this.battleManager.attackEffectsManager) {
                this.battleManager.attackEffectsManager.processAttackEffects(
                    attack.hero,
                    attack.target.creature,
                    attack.damage,
                    'basic',
                    attack.effectsTriggered || []  // ✅ Pass the effects that were triggered!
                );
            }
            
            if (this.battleManager.spellSystem) {
                await this.battleManager.spellSystem.checkAndApplyFightingSpellTriggers(
                    attack.hero,
                    attack.target.creature,
                    attack.damage
                );
            }
            
        } else {
            // Hero-to-hero attack
            const defender = attack.target.hero;
            const attacker = attack.hero;
            const isRanged = attack.isRanged || false;
            
            const wasAlive = defender.alive;
            
            // Skip trap checks for ranged attacks - they don't trigger close-range traps!
            if (!isRanged) {
                // Check for toxic trap (only for melee attacks)
                if (this.checkAndApplyToxicTrap(attacker, defender)) {
                    // Toxic trap triggered - original attack is blocked
                    console.log(`🍄 ${attacker.name}'s attack was blocked by ${defender.name}'s toxic trap!`);
                    return; // Exit early, no damage applied
                }

                // Check for frost rune (only for melee attacks)
                if (this.checkAndApplyFrostRune(attacker, defender)) {
                    // Frost rune triggered - original attack is blocked
                    console.log(`❄️ ${attacker.name}'s attack was blocked by ${defender.name}'s frost rune!`);
                    return; // Exit early, no damage applied
                }
            } else {
                // Ranged attack - traps don't trigger
                console.log(`🏹 ${attacker.name}'s ranged attack bypasses close-range traps!`);
            }
            
            // Apply the damage
            this.authoritative_applyDamage({
                target: defender,
                damage: attack.damage,
                newHp: Math.max(0, defender.currentHp - attack.damage),
                died: (defender.currentHp - attack.damage) <= 0
            }, {
                source: 'attack',
                attacker: attacker
            });
                        
            // Check for SkeletonMage reactions to ally death (only if hero actually died)
            if (wasAlive && !defender.alive) {
                this.battleManager.checkForSkeletonMageReactions(defender, defender.side, 'hero');
            }

            // ✅ FIXED: Process attack effects for hero targets WITH effectsTriggered
            if (this.battleManager.attackEffectsManager) {
                this.battleManager.attackEffectsManager.processAttackEffects(
                    attacker,
                    defender,
                    attack.damage,
                    'basic',
                    attack.effectsTriggered || []  // ✅ Pass the effects that were triggered!
                );
            }
            
            if (this.battleManager.spellSystem) {
                await this.battleManager.spellSystem.checkAndApplyFightingSpellTriggers(
                    attacker,
                    defender,
                    attack.damage
                );
            }

            // Skip fireshield recoil for ranged attacks (they're not close enough to get burned)
            if (!isRanged) {
                // Check for fireshield recoil damage (only for melee hero-to-hero attacks)
                this.checkAndApplyFireshieldRecoil(attacker, defender);
            } else {
                console.log(`🏹 ${attacker.name}'s ranged attack avoids ${defender.name}'s fireshield recoil!`);
            }
        }
    }

    // Apply damage to target
    authoritative_applyDamage(damageResult, context = {}) {
        if (!this.battleManager.isAuthoritative) return;

        const { target, damage, newHp, died } = damageResult;
        const { source, attacker } = context;
        
        const wasAlive = target.alive;
        const result = target.takeDamage(damage);
        
        // CRITICAL: Record kill IMMEDIATELY when hero dies, before any other processing
        if (result.died && wasAlive && attacker && this.battleManager.isAuthoritative) {
            recordKillWithVisualFeedback(this.battleManager, attacker, target, 'hero');
            console.log(`🎯 PRIORITY: Recorded hero kill ${attacker.name} -> ${target.name} (source: ${source})`);
        }
        
        if (!this.battleManager.totalDamageDealt[target.absoluteSide]) {
            this.battleManager.totalDamageDealt[target.absoluteSide] = 0;
        }
        this.battleManager.totalDamageDealt[target.absoluteSide] += damage;
        
        this.battleManager.addCombatLog(
            `💔 ${target.name} takes ${damage} damage! (${result.oldHp} → ${result.newHp} HP)`,
            target.side === 'player' ? 'error' : 'success'
        );

        this.battleManager.updateHeroHealthBar(target.side, target.position, result.newHp, target.maxHp);
        const damageSource = context?.source || 'attack';
        this.battleManager.animationManager.createDamageNumber(target.side, target.position, damage, target.maxHp, damageSource);
        
        if (result.died && wasAlive) {
            this.battleManager.handleHeroDeath(target);
        }

        this.battleManager.sendBattleUpdate('damage_applied', {
            targetAbsoluteSide: target.absoluteSide,
            targetPosition: target.position,
            damage: damage,
            oldHp: result.oldHp,
            newHp: result.newHp,
            maxHp: target.maxHp,
            died: result.died,
            targetName: target.name
        });
        
        this.battleManager.saveBattleStateToPersistence().catch(error => {
            console.error('Error saving state after damage:', error);
        });
    }

    // Check and apply fireshield recoil damage
    checkAndApplyFireshieldRecoil(attacker, defender) {
        if (!this.battleManager.isAuthoritative || !this.battleManager.spellSystem) return;
        
        // Get fireshield spell implementation
        const fireshieldSpell = this.battleManager.spellSystem.spellImplementations.get('Fireshield');
        if (!fireshieldSpell) return;
        
        // Check if recoil should trigger
        if (!fireshieldSpell.shouldTriggerRecoil(attacker, defender, this.battleManager.currentTurn)) {
            return;
        }
        
        // Calculate and apply recoil damage
        const recoilDamage = fireshieldSpell.calculateRecoilDamage(defender);
        if (recoilDamage > 0) {
            fireshieldSpell.applyRecoilDamage(attacker, defender, recoilDamage);
        }
    }

    // Check and apply toxic trap effect
    checkAndApplyToxicTrap(attacker, defender) {
        if (!this.battleManager.isAuthoritative || !this.battleManager.spellSystem) return false;
        
        // Get toxic trap spell implementation
        const toxicTrapSpell = this.battleManager.spellSystem.spellImplementations.get('ToxicTrap');
        if (!toxicTrapSpell) return false;
        
        // Check if toxic trap should trigger
        if (!toxicTrapSpell.shouldTriggerToxicTrap(attacker, defender)) {
            return false;
        }
        
        // Apply toxic trap effect (poison attacker)
        const blocked = toxicTrapSpell.applyToxicTrapEffect(attacker, defender);
        
        return blocked; // true if attack was blocked
    }

    // Check and apply frost rune effect
    checkAndApplyFrostRune(attacker, defender) {
        if (!this.battleManager.isAuthoritative || !this.battleManager.spellSystem) return false;
        
        // Get frost rune spell implementation
        const frostRuneSpell = this.battleManager.spellSystem.spellImplementations.get('FrostRune');
        if (!frostRuneSpell) return false;
        
        // Check if frost rune should trigger
        if (!frostRuneSpell.shouldTriggerFrostRune(attacker, defender)) {
            return false;
        }
        
        // Apply frost rune effect (freeze attacker)
        const blocked = frostRuneSpell.applyFrostRuneEffect(attacker, defender);
        
        return blocked; // true if attack was blocked
    }

    // Create turn data object with creatures
    createTurnDataWithCreatures(position, playerHero, playerTarget, playerDamage, 
                                opponentHero, opponentTarget, opponentDamage) {
        const createActionData = (hero, target, damage) => {
            if (!hero || !hero.alive) return null;
            
            const actionData = {
                attacker: position,
                targetType: target ? target.type : null,
                damage: damage,
                attackerData: {
                    absoluteSide: hero.absoluteSide,
                    position: hero.position,
                    name: hero.name,
                    abilities: hero.getAllAbilities(),
                    // Equipment count for synchronization (but stats are already calculated)
                    uniqueEquipmentCount: 0
                }
            };
            
            // Calculate unique equipment count if hero is Toras (for display sync only)
            if (hero.name === 'Toras' && hero.equipment && hero.equipment.length > 0) {
                const uniqueEquipmentNames = new Set();
                hero.equipment.forEach(item => {
                    const itemName = item.name || item.cardName;
                    if (itemName) {
                        uniqueEquipmentNames.add(itemName);
                    }
                });
                actionData.attackerData.uniqueEquipmentCount = uniqueEquipmentNames.size;
            }
            
            if (target) {
                if (target.type === 'creature') {
                    actionData.targetData = {
                        type: 'creature',
                        absoluteSide: target.hero.absoluteSide,
                        position: target.position,
                        creatureIndex: target.creatureIndex,
                        creatureName: target.creature.name
                    };
                } else {
                    actionData.targetData = {
                        type: 'hero',
                        absoluteSide: target.hero.absoluteSide,
                        position: target.position,
                        name: target.hero.name
                    };
                }
            }
            
            return actionData;
        };

        return {
            turn: this.battleManager.currentTurn,
            position: position,
            playerAction: createActionData(playerHero, playerTarget, playerDamage),
            opponentAction: createActionData(opponentHero, opponentTarget, opponentDamage)
        };
    }

    // SIMPLIFIED: Just count Wealth abilities from pre-calculated hero data
    calculateWealthBonus(heroes) {
        let totalWealthBonus = 0;
        
        // Check each hero position
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && hero.hasAbility('Wealth')) {
                const wealthLevel = hero.getAbilityStackCount('Wealth');
                const bonusGold = wealthLevel * 4; // 4 gold per Wealth level
                totalWealthBonus += bonusGold;
            }
        });
        
        return totalWealthBonus;
    }
}

export default BattleCombatManager;
