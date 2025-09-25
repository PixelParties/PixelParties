// swordInABottle.js - Sword in a Bottle Potion Effect
// Makes all heroes perform one attack each for every copy of the potion

export class SwordInABottlePotion {
    constructor() {
        this.name = 'SwordInABottle';
    }

    /**
     * Handle Sword in a Bottle potion effects for a specific player
     * @param {Array} effects - Array of Sword in a Bottle effect objects
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - The battle manager instance
     * @returns {number} Number of effects processed
     */
    async handlePotionEffectsForPlayer(effects, playerRole, battleManager) {
        if (!effects || effects.length === 0) {
            return 0;
        }
                
        let totalAttacks = 0;
        const effectCount = effects.length;
        
        // Get the heroes that will attack (based on player role)
        const attackingHeroes = playerRole === 'host' ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);
        
        const aliveAttackingHeroes = attackingHeroes.filter(hero => hero && hero.alive);
        
        if (aliveAttackingHeroes.length === 0) {
            const bottleText = effectCount === 1 ? 'Sword in a Bottle' : 'Swords in a Bottle';
            battleManager.addCombatLog(`⚔️ ${playerRole === 'host' ? 'Your' : 'Opponent\'s'} ${bottleText} found no heroes to empower!`, 'warning');
            return effectCount; // Still count as processed
        }
        
        // Add initial effect message
        const bottleText = effectCount === 1 ? 'Sword in a Bottle shatters' : `${effectCount} Swords in a Bottle shatter`;
        battleManager.addCombatLog(
            `⚔️ ${bottleText}, empowering heroes with mystical sword energy!`, 
            'info'
        );
        
        // For each copy of SwordInABottle, all heroes attack once
        for (let bottleIndex = 0; bottleIndex < effectCount; bottleIndex++) {
            if (effectCount > 1) {
                battleManager.addCombatLog(
                    `⚔️ Mystical Sword ${bottleIndex + 1} of ${effectCount} activates!`, 
                    'info'
                );
            }
            
            // Each alive hero performs one attack
            for (const hero of aliveAttackingHeroes) {
                // Check if hero is still alive (might have died from previous attacks or retaliation)
                if (!hero.alive) {
                    continue;
                }
                
                await this.performSwordInABottleAttack(hero, playerRole, battleManager);
                totalAttacks++;
                
                // Small delay between individual attacks for visual clarity
                await battleManager.delay(300);
                
                // Check if battle ended early due to the attacks
                if (battleManager.checkBattleEnd()) {
                    battleManager.addCombatLog('⚔️ The mystical swords claimed victory before the battle could begin!', 'info');
                    return effectCount;
                }
            }
            
            // Delay between different SwordInABottle copies for dramatic effect
            if (bottleIndex < effectCount - 1) {
                await battleManager.delay(600);
            }
        }
        
        battleManager.addCombatLog(
            `⚔️ Mystical sword barrage complete! ${totalAttacks} spectral strikes unleashed!`, 
            'success'
        );
        
        return effectCount;
    }

    /**
     * Handle Sword in a Bottle effects from BOTH players simultaneously
     * @param {Array} hostEffects - Host's Sword in a Bottle effects
     * @param {Array} guestEffects - Guest's Sword in a Bottle effects
     * @param {Object} battleManager - The battle manager instance
     * @returns {number} Total number of effects processed
     */
    async handleSimultaneousEffects(hostEffects, guestEffects, battleManager) {
        const hostCount = hostEffects ? hostEffects.length : 0;
        const guestCount = guestEffects ? guestEffects.length : 0;
        const totalBottles = hostCount + guestCount;
        
        if (totalBottles === 0) {
            return 0;
        }
                
        // Calculate max iterations needed (some players might have more bottles)
        const maxBottles = Math.max(hostCount, guestCount);
        
        // Add initial effect message
        const bottleText = totalBottles === 1 ? 'Sword in a Bottle shatters' : `${totalBottles} Swords in a Bottle shatter`;
        battleManager.addCombatLog(
            `⚔️ ${bottleText} across the battlefield, empowering all heroes with mystical sword energy!`, 
            'info'
        );
        
        let totalAttacks = 0;
        
        // Process each "wave" of bottles simultaneously
        for (let bottleWave = 0; bottleWave < maxBottles; bottleWave++) {
            const hasHostBottle = bottleWave < hostCount;
            const hasGuestBottle = bottleWave < guestCount;
            
            if (!hasHostBottle && !hasGuestBottle) break;
            
            if (maxBottles > 1) {
                const waveBottles = (hasHostBottle ? 1 : 0) + (hasGuestBottle ? 1 : 0);
                battleManager.addCombatLog(
                    `⚔️ Mystical Sword wave ${bottleWave + 1} activates (${waveBottles} bottle${waveBottles > 1 ? 's' : ''}!)`, 
                    'info'
                );
            }
            
            // Collect all attacks for this wave
            const allAttacks = [];
            
            // Add host attacks if they have a bottle this wave
            if (hasHostBottle) {
                const hostAttacks = await this.collectAttacksForPlayer('host', battleManager);
                allAttacks.push(...hostAttacks);
            }
            
            // Add guest attacks if they have a bottle this wave
            if (hasGuestBottle) {
                const guestAttacks = await this.collectAttacksForPlayer('guest', battleManager);
                allAttacks.push(...guestAttacks);
            }
            
            if (allAttacks.length === 0) {
                battleManager.addCombatLog('⚔️ No heroes available to wield the mystical swords!', 'warning');
                continue;
            }
            
            // Execute all attacks simultaneously
            const waveAttacks = await this.executeSimultaneousAttacks(allAttacks, battleManager);
            totalAttacks += waveAttacks;
            
            // Delay between waves if there are multiple
            if (bottleWave < maxBottles - 1) {
                await battleManager.delay(800);
            }
            
            // Check if battle ended early due to the attacks
            if (battleManager.checkBattleEnd()) {
                battleManager.addCombatLog('⚔️ The mystical swords claimed victory before the battle could begin!', 'info');
                return totalBottles;
            }
        }
        
        battleManager.addCombatLog(
            `⚔️ Mystical sword storm complete! ${totalAttacks} spectral strikes unleashed simultaneously!`, 
            'success'
        );
        
        return totalBottles;
    }

    /**
     * Collect all potential attacks for a player without executing them
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - The battle manager instance
     * @returns {Array} Array of attack objects ready to execute
     */
    async collectAttacksForPlayer(playerRole, battleManager) {
        // Get the heroes that will attack (based on player role)
        const attackingHeroes = playerRole === 'host' ? 
            Object.values(battleManager.playerHeroes) : 
            Object.values(battleManager.opponentHeroes);
        
        const aliveAttackingHeroes = attackingHeroes.filter(hero => hero && hero.alive);
        const attacks = [];
        
        for (const hero of aliveAttackingHeroes) {
            const attackData = await this.prepareAttackForHero(hero, playerRole, battleManager);
            if (attackData) {
                attacks.push(attackData);
            }
        }
        
        return attacks;
    }

    /**
     * Prepare attack data for a hero without executing it
     * @param {Object} hero - The attacking hero
     * @param {string} playerRole - 'host' or 'guest'
     * @param {Object} battleManager - The battle manager instance
     * @returns {Object|null} Attack data or null if no valid target
     */
    async prepareAttackForHero(hero, playerRole, battleManager) {
        // Determine attacker side for targeting
        const attackerSide = playerRole === 'host' ? 'player' : 'opponent';
        
        // FIXED: Check if hero is Darge for ranged targeting
        let target;
        if (hero.name === 'Darge') {
            // Darge uses ranged attacks - ignore creatures
            target = battleManager.combatManager.authoritative_findTargetIgnoringCreatures(
                hero.position, 
                attackerSide
            );
        } else {
            // Normal melee targeting
            target = battleManager.combatManager.authoritative_findTargetWithCreatures(
                hero.position, 
                attackerSide
            );
        }
        
        if (!target) {
            return null;
        }
        
        // Calculate damage using existing logic
        const baseDamage = battleManager.combatManager.calculateDamage(hero, true);
        
        // Apply damage modifiers
        let finalDamage = baseDamage;
        let effectsTriggered = [];
        
        if (battleManager.attackEffectsManager) {
            const modResult = battleManager.attackEffectsManager.calculateDamageModifiers(
                hero,
                target.type === 'creature' ? target.creature : target.hero,
                baseDamage
            );
            finalDamage = modResult.modifiedDamage;
            effectsTriggered = modResult.effectsTriggered;
        }
        
        return {
            hero: hero,
            target: target,
            damage: finalDamage,
            effectsTriggered: effectsTriggered,
            playerRole: playerRole,
            attackerSide: attackerSide,
            isRanged: hero.name === 'Darge'
        };
    }

    /**
     * Execute all attacks simultaneously
     * @param {Array} allAttacks - Array of attack data objects
     * @param {Object} battleManager - The battle manager instance
     * @returns {number} Number of attacks executed
     */
    async executeSimultaneousAttacks(allAttacks, battleManager) {
        if (allAttacks.length === 0) return 0;
                
        // Log all attacks first and send network sync for each
        allAttacks.forEach(attack => {
            const targetName = attack.target.type === 'creature' ? attack.target.creature.name : attack.target.hero.name;
            battleManager.addCombatLog(
                `⚔️ ${attack.hero.name} conjures a mystical sword and strikes ${targetName} for ${attack.damage} damage!`,
                attack.attackerSide === 'player' ? 'success' : 'error'
            );
            
            // Send network sync for guest
            this.sendAttackSync(attack, battleManager);
        });
        
        // Start all attack animations simultaneously
        const attackAnimations = allAttacks.map(attack => 
            battleManager.animationManager.animateHeroAttack(attack.hero, attack.target)
        );
        
        // Wait for all animations to complete
        await Promise.all(attackAnimations);
        
        // Apply all damage modifier effects simultaneously
        const effectAnimations = [];
        allAttacks.forEach(attack => {
            if (attack.effectsTriggered && attack.effectsTriggered.length > 0) {
                effectAnimations.push(
                    battleManager.attackEffectsManager.applyDamageModifierEffects(attack.effectsTriggered)
                );
            }
        });
        
        if (effectAnimations.length > 0) {
            await Promise.all(effectAnimations);
            await battleManager.delay(400);
        }
        
        // Apply all damage simultaneously
        allAttacks.forEach(attack => {
            battleManager.combatManager.applyAttackDamageToTarget(attack);
        });
        
        // Return all heroes to their positions simultaneously
        const returnAnimations = allAttacks.map(attack => 
            battleManager.animationManager.animateReturn(attack.hero, attack.attackerSide)
        );
        
        await Promise.all(returnAnimations);
        
        // Small pause for visual effect
        await battleManager.delay(200);
        
        return allAttacks.length;
    }

    /**
     * Perform a single Sword in a Bottle attack for a hero
     * @param {Object} hero - The attacking hero
     * @param {string} playerRole - 'host' or 'guest' 
     * @param {Object} battleManager - The battle manager instance
     */
    async performSwordInABottleAttack(hero, playerRole, battleManager) {
        // Determine attacker side for targeting (host uses 'player', guest uses 'opponent')
        const attackerSide = playerRole === 'host' ? 'player' : 'opponent';
        
        // FIXED: Check if hero is Darge for ranged targeting
        let target;
        if (hero.name === 'Darge') {
            // Darge uses ranged attacks - ignore creatures
            target = battleManager.combatManager.authoritative_findTargetIgnoringCreatures(
                hero.position, 
                attackerSide
            );
        } else {
            // Normal melee targeting
            target = battleManager.combatManager.authoritative_findTargetWithCreatures(
                hero.position, 
                attackerSide
            );
        }
        
        if (!target) {
            battleManager.addCombatLog(
                `⚔️ ${hero.name}'s mystical sword finds no target to strike!`, 
                'warning'
            );
            return;
        }
        
        // Calculate damage using existing logic (includes abilities like Fighting)
        const baseDamage = battleManager.combatManager.calculateDamage(hero, true);
        
        // Apply damage modifiers (equipment effects, etc.)
        let finalDamage = baseDamage;
        let effectsTriggered = [];
        
        if (battleManager.attackEffectsManager) {
            const modResult = battleManager.attackEffectsManager.calculateDamageModifiers(
                hero,
                target.type === 'creature' ? target.creature : target.hero,
                baseDamage
            );
            finalDamage = modResult.modifiedDamage;
            effectsTriggered = modResult.effectsTriggered;
        }
        
        // Create attack object for the combat system
        const attack = {
            hero: hero,
            target: target,
            damage: finalDamage,
            effectsTriggered: effectsTriggered,
            isRanged: hero.name === 'Darge'
        };
        
        // Log the attack with appropriate styling
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        battleManager.addCombatLog(
            `⚔️ ${hero.name} conjures a mystical sword and strikes ${targetName} for ${finalDamage} damage!`,
            attackerSide === 'player' ? 'success' : 'error'
        );
        
        // FIXED: Send network sync to guest BEFORE animation
        this.sendAttackSync(attack, battleManager, attackerSide);
        
        // Perform attack animation
        await battleManager.animationManager.animateHeroAttack(hero, target);
        
        // Apply damage modifier visual effects (like TheMastersSword)
        if (effectsTriggered && effectsTriggered.length > 0) {
            battleManager.attackEffectsManager.applyDamageModifierEffects(effectsTriggered);
            await battleManager.delay(400);
        }
        
        // Apply the actual damage using the existing damage system
        // This handles all the complex logic: death, necromancy revival, kill tracking, etc.
        battleManager.combatManager.applyAttackDamageToTarget(attack);
        
        // Return hero to original position
        await battleManager.animationManager.animateReturn(hero, attackerSide);
        
        // Small pause for visual effect
        await battleManager.delay(100);
    }

    /**
     * Send attack synchronization to guest
     * @param {Object} attack - The attack data
     * @param {Object} battleManager - The battle manager instance
     * @param {string} attackerSide - Optional attacker side override
     */
    sendAttackSync(attack, battleManager, attackerSide = null) {
        if (!battleManager.isAuthoritative) return;
        
        const actualAttackerSide = attackerSide || attack.attackerSide;
        
        // Create attack data for guest synchronization
        const attackData = {
            attackerData: {
                absoluteSide: attack.hero.absoluteSide,
                position: attack.hero.position,
                name: attack.hero.name
            },
            targetData: attack.target ? {
                type: attack.target.type,
                absoluteSide: attack.target.type === 'creature' ? attack.target.hero.absoluteSide : attack.target.hero.absoluteSide,
                position: attack.target.position,
                ...(attack.target.type === 'creature' ? {
                    creatureIndex: attack.target.creatureIndex,
                    creatureName: attack.target.creature.name
                } : {
                    name: attack.target.hero.name
                })
            } : null,
            damage: attack.damage,
            isRanged: attack.isRanged || false
        };
        
        // Send to guest for animation sync
        battleManager.sendBattleUpdate('sword_in_bottle_attack', attackData);
    }

    /**
     * Handle guest-side Sword in a Bottle attack animation
     * @param {Object} data - Attack data from host
     * @param {Object} battleManager - The battle manager instance
     */
    async guest_handleSwordInBottleAttack(data, battleManager) {
        if (battleManager.isAuthoritative) return;
        
        const { attackerData, targetData, damage, isRanged } = data;
        
        // Find attacker hero on guest side
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const attackerLocalSide = (attackerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const attackerHeroes = attackerLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const attacker = attackerHeroes[attackerData.position];
        
        if (!attacker) return;
        
        // Find target on guest side
        let target = null;
        if (targetData) {
            const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const targetHeroes = targetLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
            const targetHero = targetHeroes[targetData.position];
            
            if (targetData.type === 'creature' && targetHero?.creatures?.[targetData.creatureIndex]) {
                target = {
                    type: 'creature',
                    hero: targetHero,
                    creature: targetHero.creatures[targetData.creatureIndex],
                    creatureIndex: targetData.creatureIndex,
                    position: targetData.position,
                    side: targetLocalSide
                };
            } else if (targetData.type === 'hero' && targetHero) {
                target = {
                    type: 'hero',
                    hero: targetHero,
                    position: targetData.position,
                    side: targetLocalSide
                };
            }
        }
        
        if (target) {
            // Log the attack
            const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
            battleManager.addCombatLog(
                `⚔️ ${attacker.name} conjures a mystical sword and strikes ${targetName} for ${damage} damage!`,
                attackerLocalSide === 'player' ? 'success' : 'error'
            );
            
            // Animate the attack using the same system as normal attacks
            await battleManager.animationManager.animateHeroAttack(attacker, target);
            await battleManager.animationManager.animateReturn(attacker, attackerLocalSide);
        }
    }

    /**
     * Static method to check if a card is Sword in a Bottle
     * @param {string} cardName - Name of the card to check
     * @returns {boolean} True if the card is Sword in a Bottle
     */
    static isSwordInABottle(cardName) {
        return cardName === 'SwordInABottle';
    }

    /**
     * Get display name for the potion
     * @returns {string} Formatted display name
     */
    getDisplayName() {
        return 'Sword In A Bottle';
    }

    /**
     * Get potion description
     * @returns {string} Description of the potion's effect
     */
    getDescription() {
        return 'At the start of battle, all your heroes perform one attack each for every copy of this potion.';
    }
}