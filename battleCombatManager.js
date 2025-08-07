// battleCombatManager.js - Combat Management Module
// Handles damage calculation, targeting, and combat execution

import { recordKillWithVisualFeedback } from './Artifacts/wantedPoster.js';

export class BattleCombatManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
    }

    // Get hero ability modifiers for damage calculation
    getHeroAbilityModifiers(hero) {
        const modifiers = {
            attackBonus: 0,
            defenseBonus: 0,
            specialEffects: []
        };
        
        if (hero.hasAbility('Fighting')) {
            const stackCount = hero.getAbilityStackCount('Fighting');
            modifiers.attackBonus += stackCount * 10;
            modifiers.specialEffects.push(`Fighting (+${stackCount * 10} ATK)`);
        }
        
        // Special case for Toras: +10 ATK per unique equipment
        if (hero.name === 'Toras') {
            let uniqueEquipmentCount = 0;
            
            // Use synchronized count if available (for guest displaying opponent's Toras)
            if (hero._syncedUniqueEquipmentCount !== undefined) {
                uniqueEquipmentCount = hero._syncedUniqueEquipmentCount;
            } 
            // Otherwise calculate locally (for own heroes or host)
            else if (hero.equipment && hero.equipment.length > 0) {
                const uniqueEquipmentNames = new Set();
                hero.equipment.forEach(item => {
                    const itemName = item.name || item.cardName;
                    if (itemName) {
                        uniqueEquipmentNames.add(itemName);
                    }
                });
                uniqueEquipmentCount = uniqueEquipmentNames.size;
            }
            
            if (uniqueEquipmentCount > 0) {
                const equipmentBonus = uniqueEquipmentCount * 10;
                modifiers.attackBonus += equipmentBonus;
                modifiers.specialEffects.push(`Toras Equipment Mastery (+${equipmentBonus} ATK from ${uniqueEquipmentCount} unique items)`);
            }
        }
        
        return modifiers;
    }

    // Find target with creatures (heroes now target last creature)
    authoritative_findTargetWithCreatures(attackerPosition, attackerSide) {
        if (!this.battleManager.isAuthoritative) return null;

        const targets = attackerSide === 'player' ? 
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        // Helper function to create creature target if hero has living creatures
        const createCreatureTargetIfAvailable = (hero, heroPosition) => {
            if (!hero || !hero.alive) return null;
            
            const livingCreatures = hero.creatures.filter(c => c.alive);
            if (livingCreatures.length > 0) {
                // Target the FIRST living creature (newest to oldest as mentioned)
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

        // Helper function to get target (creature first, then hero) for any position
        const getTargetForPosition = (heroPosition) => {
            const hero = targets[heroPosition];
            if (!hero || !hero.alive) return null;
            
            // Always check creatures first, regardless of position
            const creatureTarget = createCreatureTargetIfAvailable(hero, heroPosition);
            if (creatureTarget) return creatureTarget;
            
            // If no creatures, target the hero
            return createHeroTarget(hero, heroPosition);
        };

        // Get all alive targets for fallback
        const aliveTargets = Object.values(targets).filter(hero => hero && hero.alive);
        if (aliveTargets.length === 0) return null;

        // Primary targeting: try same position first
        const primaryTarget = getTargetForPosition(attackerPosition);
        if (primaryTarget) return primaryTarget;

        // Alternative targeting with creature priority
        switch (attackerPosition) {
            case 'left':
                // Try center first, then right
                const leftToCenterTarget = getTargetForPosition('center');
                if (leftToCenterTarget) return leftToCenterTarget;
                
                const leftToRightTarget = getTargetForPosition('right');
                if (leftToRightTarget) return leftToRightTarget;
                break;
                
            case 'center':
                // Random target selection, but still check creatures first
                const randomTargetHero = this.battleManager.getRandomChoice(aliveTargets);
                if (randomTargetHero) {
                    const randomTarget = getTargetForPosition(randomTargetHero.position);
                    if (randomTarget) return randomTarget;
                }
                break;
                
            case 'right':
                // Try center first, then left
                const rightToCenterTarget = getTargetForPosition('center');
                if (rightToCenterTarget) return rightToCenterTarget;
                
                const rightToLeftTarget = getTargetForPosition('left');
                if (rightToLeftTarget) return rightToLeftTarget;
                break;
        }
        
        // Last resort - find any alive target (creature first, then hero)
        for (const hero of aliveTargets) {
            const lastResortTarget = getTargetForPosition(hero.position);
            if (lastResortTarget) return lastResortTarget;
        }
        
        // This should never happen if there are alive targets, but safety fallback
        return createHeroTarget(aliveTargets[0], aliveTargets[0].position);
    }

    // Calculate damage for a hero
    calculateDamage(hero, canAct) {
        if (!canAct) return 0;
        
        let damage = hero.getCurrentAttack();
        const modifiers = this.getHeroAbilityModifiers(hero);
        damage += modifiers.attackBonus;
        
        this.battleManager.updateHeroAttackDisplay(hero.side, hero.position, hero);
        
        if (modifiers.specialEffects.length > 0) {
            this.battleManager.addCombatLog(`🎯 ${hero.name} abilities: ${modifiers.specialEffects.join(', ')}`, 'info');
        }
        
        return damage;
    }

    // Execute hero actions
    async executeHeroActions(playerHeroActor, opponentHeroActor, position) {
        // Check if battle ended before executing actions
        if (this.battleManager.checkBattleEnd()) {
            console.log('Battle ended before hero actions, skipping');
            return;
        }
        
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
        
        // Continue with normal attack logic for heroes that didn't cast spells
        const playerTarget = playerWillAttack ? 
            this.authoritative_findTargetWithCreatures(position, 'player') : null;
        const opponentTarget = opponentWillAttack ? 
            this.authoritative_findTargetWithCreatures(position, 'opponent') : null;
        
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
            // Calculate base damage
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
            
            // Execute attacks with modified damage and effects
            const executionPromise = this.executeHeroAttacksWithDamage(
                playerValidAttack ? { 
                    hero: playerHeroActor.data, 
                    target: playerTarget, 
                    damage: playerDamage,
                    effectsTriggered: playerEffectsTriggered  // NEW: Pass effects for animation
                } : null,
                opponentValidAttack ? { 
                    hero: opponentHeroActor.data, 
                    target: opponentTarget, 
                    damage: opponentDamage,
                    effectsTriggered: opponentEffectsTriggered  // NEW: Pass effects for animation
                } : null
            );
            
            const ackPromise = this.battleManager.waitForGuestAcknowledgment('turn_complete', this.battleManager.getAdaptiveTimeout());
            
            await Promise.all([executionPromise, ackPromise]);
        }
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
            if (this.battleManager.battleScreen && this.battleManager.battleScreen.battleLog) {
                this.battleManager.battleScreen.battleLog.logAttackMessage(hostAttack);
                this.battleManager.battleScreen.battleLog.logAttackMessage(guestAttack);
            }
            
            // Both heroes attack - collision animation (meet in middle)
            await this.battleManager.animationManager.animateSimultaneousHeroAttacks(playerAttack, opponentAttack);
            
            // ============================================
            // NEW: Apply damage modifier visual effects BEFORE damage
            // ============================================
            if (this.battleManager.attackEffectsManager) {
                // Small delay to let attack animation reach target
                await this.battleManager.delay(100);
                
                if (playerAttack.effectsTriggered && playerAttack.effectsTriggered.length > 0) {
                    this.battleManager.attackEffectsManager.applyDamageModifierEffects(playerAttack.effectsTriggered);
                }
                if (opponentAttack.effectsTriggered && opponentAttack.effectsTriggered.length > 0) {
                    this.battleManager.attackEffectsManager.applyDamageModifierEffects(opponentAttack.effectsTriggered);
                }
                
                // Wait for effect animations
                if (playerAttack.effectsTriggered?.length > 0 || opponentAttack.effectsTriggered?.length > 0) {
                    await this.battleManager.delay(400);
                }
            }
            
            // Apply damage with potentially modified values
            this.applyAttackDamageToTarget(playerAttack);
            this.applyAttackDamageToTarget(opponentAttack);
            
            await Promise.all([
                this.battleManager.animationManager.animateReturn(playerAttack.hero, 'player'),
                this.battleManager.animationManager.animateReturn(opponentAttack.hero, 'opponent')
            ]);
            
        } else if (playerAttack || opponentAttack) {
            // Only one hero attacks - full dash animation (to target)
            const attack = playerAttack || opponentAttack;
            const side = playerAttack ? 'player' : 'opponent';
            
            // Log the single attack
            if (this.battleManager.battleScreen && this.battleManager.battleScreen.battleLog) {
                this.battleManager.battleScreen.battleLog.logAttackMessage(attack);
            }
            
            await this.battleManager.animationManager.animateHeroAttack(attack.hero, attack.target);
            
            // ============================================
            // NEW: Apply damage modifier visual effects BEFORE damage
            // ============================================
            if (this.battleManager.attackEffectsManager && attack.effectsTriggered && attack.effectsTriggered.length > 0) {
                // Small delay to let attack animation complete
                await this.battleManager.delay(100);
                
                this.battleManager.attackEffectsManager.applyDamageModifierEffects(attack.effectsTriggered);
                
                // Wait for effect animation
                await this.battleManager.delay(400);
            }
            
            // Apply damage with potentially modified value
            this.applyAttackDamageToTarget(attack);
            
            await this.battleManager.animationManager.animateReturn(attack.hero, side);
        }
    }

    // Apply damage to target (hero or creature)
    applyAttackDamageToTarget(attack) {
        if (!attack || !attack.target) return;
        
        if (attack.target.type === 'creature') {
            const wasAlive = attack.target.creature.alive;
            
            // Apply damage to creature
            this.battleManager.authoritative_applyDamageToCreature({
                hero: attack.target.hero,
                creature: attack.target.creature,
                creatureIndex: attack.target.creatureIndex,
                damage: attack.damage,
                position: attack.target.position,
                side: attack.target.side
            });
            
            // Check if creature died from this attack
            if (wasAlive && !attack.target.creature.alive && this.battleManager.isAuthoritative) {
                // Use the Wanted Poster module's visual feedback function
                recordKillWithVisualFeedback(this.battleManager, attack.hero, attack.target.creature, 'creature');
            }
            
            // Process attack effects for creature targets
            if (this.battleManager.attackEffectsManager) {
                this.battleManager.attackEffectsManager.processAttackEffects(
                    attack.hero,
                    attack.target.creature,
                    attack.damage,
                    'basic'
                );
            }
        } else {
            // Hero-to-hero attack
            const defender = attack.target.hero;
            const attacker = attack.hero;
            
            const wasAlive = defender.alive;
            
            // Check for toxic trap
            if (this.checkAndApplyToxicTrap(attacker, defender)) {
                // Toxic trap triggered - original attack is blocked
                console.log(`🍄 ${attacker.name}'s attack was blocked by ${defender.name}'s toxic trap!`);
                return; // Don't process attack effects if attack was blocked
            }

            // Check for frost rune
            if (this.checkAndApplyFrostRune(attacker, defender)) {
                // Frost rune triggered - original attack is blocked
                console.log(`❄️ ${attacker.name}'s attack was blocked by ${defender.name}'s frost rune!`);
                return; // Don't process attack effects if attack was blocked
            }
            
            // Apply the damage
            this.authoritative_applyDamage({
                target: defender,
                damage: attack.damage,
                newHp: Math.max(0, defender.currentHp - attack.damage),
                died: (defender.currentHp - attack.damage) <= 0
            });
            
            // Check if hero died from this attack
            if (wasAlive && !defender.alive && this.battleManager.isAuthoritative) {
                // Use the Wanted Poster module's visual feedback function
                recordKillWithVisualFeedback(this.battleManager, attacker, defender, 'hero');
            }

            // Process attack effects for hero targets (after damage is applied)
            if (this.battleManager.attackEffectsManager) {
                this.battleManager.attackEffectsManager.processAttackEffects(
                    attacker,
                    defender,
                    attack.damage,
                    'basic'
                );
            }

            // Check for fireshield recoil damage (only for hero-to-hero attacks)
            this.checkAndApplyFireshieldRecoil(attacker, defender);
        }
    }

    // Apply damage to target
    authoritative_applyDamage(damageResult, context = {}) {
        if (!this.battleManager.isAuthoritative) return;

        const { target, damage, newHp, died } = damageResult;
        const { source, attacker } = context;
        
        const wasAlive = target.alive;
        const result = target.takeDamage(damage);
        
        if (!this.battleManager.totalDamageDealt[target.absoluteSide]) {
            this.battleManager.totalDamageDealt[target.absoluteSide] = 0;
        }
        this.battleManager.totalDamageDealt[target.absoluteSide] += damage;
        
        this.battleManager.addCombatLog(
            `💔 ${target.name} takes ${damage} damage! (${result.oldHp} → ${result.newHp} HP)`,
            target.side === 'player' ? 'error' : 'success'
        );

        this.battleManager.updateHeroHealthBar(target.side, target.position, result.newHp, target.maxHp);
        const damageSource = arguments[1]?.source || 'attack';
        this.battleManager.animationManager.createDamageNumber(target.side, target.position, damage, target.maxHp, damageSource);
        
        if (result.died && wasAlive) {
            // If we have an attacker and it's a spell kill, record with visual feedback
            if (attacker && source === 'spell') {
                recordKillWithVisualFeedback(this.battleManager, attacker, target, 'hero');
            }
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
        
        // Apply toxic trap effect (poison attacker instead of damaging defender)
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
        
        // Apply frost rune effect (freeze attacker instead of damaging defender)
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
                    // NEW: Add equipment count for Toras synchronization
                    uniqueEquipmentCount: 0
                }
            };
            
            // Calculate unique equipment count if hero is Toras
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

    // Calculate wealth bonus for gold rewards
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