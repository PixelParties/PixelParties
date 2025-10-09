// soulShardSekhem.js - Soul Shard Sekhem implementation with flame damage

export class SoulShardSekhemCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.DAMAGE_AMOUNT_PER_COPY = 30; // Damage amount per SoulShardSekhem copy
        
        console.log('🔥 Soul Shard Sekhem Creature module initialized');
    }

    // Check if a creature is Soul Shard Sekhem
    static isSoulShardSekhem(creatureName) {
        return creatureName === 'SoulShardSekhem';
    }

    // Static method for handling disenchant (called from handManager)
    static handleDisenchant(heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Register delayed damage effect for next battle
        SoulShardSekhemCreature.registerDelayedDamageEffect(heroSelection);
        
        // Show visual feedback
        SoulShardSekhemCreature.showDisenchantAnimation();
        
        console.log('🔥 Soul Shard Sekhem disenchanted! Damage effect registered for next battle.');
    }

    // Register the delayed damage effect for next battle
    static registerDelayedDamageEffect(heroSelection) {
        // Initialize delayedEffects array if it doesn't exist
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        // Find existing SoulShardSekhem effect to accumulate stacks
        let existingEffect = heroSelection.delayedEffects.find(
            effect => effect.source === 'SoulShardSekhem' && effect.type === 'damage_all_enemies'
        );
        
        if (existingEffect) {
            // Increment stacks for multiple disenchants
            existingEffect.stacks += 1;
            existingEffect.appliedAt = Date.now(); // Update timestamp
            console.log(`🔥 Increased Soul Shard Sekhem stacks to ${existingEffect.stacks}`);
        } else {
            // Add new effect if none exists
            heroSelection.delayedEffects.push({
                type: 'damage_all_enemies',
                stacks: 1,
                damagePerStack: 30,
                source: 'SoulShardSekhem',
                appliedAt: Date.now(),
                description: 'Deal 30 non-lethal damage to all enemies at battle start'
            });
            console.log('🔥 Added new Soul Shard Sekhem effect with 1 stack');
        }
    }

    // Show disenchant animation
    static showDisenchantAnimation() {
        const effectBurst = document.createElement('div');
        effectBurst.className = 'soul-shard-sekhem-disenchant';
        effectBurst.innerHTML = `
            <div class="disenchant-content">
                <div class="shard-icon">🔥</div>
                <div class="effect-text">Soul Shard Activated!</div>
                <div class="damage-preview">
                    <span class="flame-icon">🔥</span>
                    <span>30 Damage next battle</span>
                </div>
            </div>
        `;
        
        effectBurst.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: soulShardSekhemDisenchant 2s ease-out forwards;
        `;
        
        document.body.appendChild(effectBurst);
        
        setTimeout(() => {
            if (effectBurst.parentNode) {
                effectBurst.remove();
            }
        }, 2000);
    }

    // Execute Soul Shard Sekhem special attack (damage closest enemy)
    async executeSpecialAttack(sekhemActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const sekhemCreature = sekhemActor.data;
        const sekhemHero = sekhemActor.hero;
        const attackerSide = sekhemHero.side;
        
        // Safety check: ensure Soul Shard Sekhem is still alive
        if (!sekhemCreature.alive || sekhemCreature.currentHp <= 0) {
            console.log(`Soul Shard Sekhem is dead, cannot execute special attack`);
            return;
        }
        
        // Count total SoulShardSekhem copies across all allied heroes
        const alliedHeroes = attackerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        let totalSekhemCopies = 0;
        ['left', 'center', 'right'].forEach(pos => {
            const hero = alliedHeroes[pos];
            if (hero && hero.creatures) {
                totalSekhemCopies += hero.creatures.filter(c => c.name === 'SoulShardSekhem' && c.alive).length;
            }
        });

        totalSekhemCopies = Math.max(totalSekhemCopies, 1);
        
        // Calculate damage amount
        const damageAmount = totalSekhemCopies * this.DAMAGE_AMOUNT_PER_COPY;
        
        // Find closest enemy target using standard targeting
        const target = this.battleManager.combatManager.authoritative_findTargetWithCreatures(position, attackerSide);
        
        if (!target) {
            this.battleManager.addCombatLog(
                `🔥 ${sekhemCreature.name} unleashes flames but finds no enemies to burn!`, 
                'info'
            );
            return;
        }
        
        this.battleManager.addCombatLog(
            `🔥 ${sekhemCreature.name} channels scorching flames toward ${target.type === 'creature' ? target.creature.name : target.hero.name}!`, 
            attackerSide === 'player' ? 'success' : 'info'
        );
        
        // Send synchronization data to guest BEFORE applying damage
        this.sendFlameAttackUpdate(sekhemActor, target, position, damageAmount, totalSekhemCopies);
        
        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);
        
        // Apply non-lethal damage to target
        await this.applyFlameDamageToTarget(sekhemActor, target, position, damageAmount, totalSekhemCopies);
    }

    // Apply non-lethal flame damage to target
    async applyFlameDamageToTarget(sekhemActor, target, position, damageAmount, totalSekhemCopies) {
        const attackerSide = sekhemActor.hero.side;
        
        // Create flame effect animation
        await this.createFlameAttackAnimation(target, damageAmount);
        
        // Apply non-lethal damage
        if (target.type === 'creature') {
            const creature = target.creature;
            const cappedDamage = this.applyNonLethalCap(creature, damageAmount);
            
            await this.battleManager.combatManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: creature,
                creatureIndex: target.creatureIndex,
                damage: cappedDamage,
                position: target.position,
                side: target.side
            }, {
                source: 'flame',
                attacker: sekhemActor.data
            });
        } else {
            const hero = target.hero;
            const cappedDamage = this.applyNonLethalCap(hero, damageAmount);
            
            await this.battleManager.combatManager.authoritative_applyDamage({
                target: hero,
                damage: cappedDamage,
                newHp: Math.max(1, hero.currentHp - cappedDamage),
                died: false
            }, {
                source: 'flame',
                attacker: sekhemActor.data
            });
        }
        
        let logMessage = `🔥 ${target.type === 'creature' ? target.creature.name : target.hero.name} takes ${damageAmount} flame damage from ${sekhemActor.data.name}!`;
        if (totalSekhemCopies > 1) {
            logMessage += ` (${totalSekhemCopies} Sekhem copies × ${this.DAMAGE_AMOUNT_PER_COPY})`;
        }
        
        this.battleManager.addCombatLog(
            logMessage, 
            attackerSide === 'player' ? 'success' : 'info'
        );
    }

    // Apply non-lethal damage cap (ensures target survives with at least 1 HP)
    applyNonLethalCap(target, damage) {
        const currentHp = target.currentHp;
        const currentShield = target.currentShield || 0;
        const totalEffectiveHp = currentHp + currentShield;
        
        if (totalEffectiveHp <= 1) {
            return 0; // Target already at 1 HP or less
        }
        
        const maxDamage = totalEffectiveHp - 1;
        return Math.min(damage, maxDamage);
    }

    // Create flame attack animation
    async createFlameAttackAnimation(target, damageAmount) {
        const targetSide = target.side;
        const targetPosition = target.position;
        
        // Get target element using direct DOM query instead of non-existent method
        let targetElement;
        if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${targetSide}-slot.${targetPosition}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        } else {
            targetElement = document.querySelector(`.${targetSide}-slot.${targetPosition}-slot`);
        }
        
        if (!targetElement) return;
        
        // Create flame effect
        const flameEffect = document.createElement('div');
        flameEffect.className = 'soul-shard-sekhem-flame';
        flameEffect.innerHTML = `
            <div class="flame-burst">
                <div class="flame-icon">🔥</div>
                <div class="flame-amount">-${damageAmount}</div>
            </div>
        `;
        
        flameEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            pointer-events: none;
            animation: soulShardSekhemFlame 1.5s ease-out forwards;
        `;
        
        targetElement.appendChild(flameEffect);
        
        // Add red glow to target
        const card = targetElement.querySelector('.battle-hero-card, .creature-icon');
        if (card) {
            card.style.transition = 'box-shadow 0.5s ease';
            card.style.boxShadow = '0 0 30px rgba(255, 50, 0, 0.8)';
            
            setTimeout(() => {
                card.style.boxShadow = '';
            }, 1000);
        }
        
        // Clean up animation
        setTimeout(() => {
            if (flameEffect.parentNode) {
                flameEffect.remove();
            }
        }, 1500);
        
        await this.battleManager.delay(800);
    }

    // Send flame attack data to guest for synchronization
    sendFlameAttackUpdate(sekhemActor, target, position, damageAmount, totalSekhemCopies) {
        this.battleManager.sendBattleUpdate('soul_shard_sekhem_flame_attack', {
            sekhemData: {
                side: sekhemActor.hero.side,
                position: position,
                creatureIndex: sekhemActor.index,
                name: sekhemActor.data.name,
                absoluteSide: sekhemActor.hero.absoluteSide
            },
            target: {
                type: target.type,
                name: target.type === 'creature' ? target.creature.name : target.hero.name,
                position: target.position,
                absoluteSide: target.hero.absoluteSide,
                creatureIndex: target.type === 'creature' ? target.creatureIndex : undefined
            },
            damageAmount: damageAmount,
            totalSekhemCopies: totalSekhemCopies
        });
    }

    // Handle Soul Shard Sekhem flame attack on guest side
    async handleGuestFlameAttack(data) {
        const { sekhemData, target, damageAmount, totalSekhemCopies } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const sekhemLocalSide = (sekhemData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetLocalSide = (target.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🔥 ${sekhemData.name} channels scorching flames toward ${target.name}!`, 
            sekhemLocalSide === 'player' ? 'success' : 'info'
        );
        
        // Find target element for animation using direct DOM query
        let targetElement;
        if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        } else {
            targetElement = document.querySelector(`.${targetLocalSide}-slot.${target.position}-slot`);
        }
        
        if (targetElement) {
            await this.createFlameAttackAnimation({
                side: targetLocalSide,
                position: target.position,
                type: target.type,
                creatureIndex: target.creatureIndex
            }, damageAmount);
        }
        
        let logMessage = `🔥 ${target.name} takes ${damageAmount} flame damage!`;
        if (totalSekhemCopies > 1) {
            logMessage += ` (${totalSekhemCopies} Sekhem copies × 30)`;
        }
        
        this.battleManager.addCombatLog(
            logMessage,
            targetLocalSide === 'player' ? 'error' : 'success'
        );
    }

    // Clean up
    cleanup() {
        console.log('Cleaning up Soul Shard Sekhem creature effects');
    }
}

// Battle start effect functions
export async function applyBothPlayersDelayedDamageEffects(hostEffects, guestEffects, battleManager) {
    console.log('🔥 Processing Soul Shard Sekhem effects from both players...');
    
    if (hostEffects && hostEffects.length > 0) {
        const hostDamageEffects = hostEffects.filter(
            effect => effect.type === 'damage_all_enemies' && effect.source === 'SoulShardSekhem'
        );
        if (hostDamageEffects.length > 0) {
            console.log('🔥 Applying HOST Soul Shard Sekhem damage...');
            await applyDamageToEnemies(battleManager, hostDamageEffects, 'host');
        }
    }
    
    if (guestEffects && guestEffects.length > 0) {
        const guestDamageEffects = guestEffects.filter(
            effect => effect.type === 'damage_all_enemies' && effect.source === 'SoulShardSekhem'
        );
        if (guestDamageEffects.length > 0) {
            console.log('🔥 Applying GUEST Soul Shard Sekhem damage...');
            await applyDamageToEnemies(battleManager, guestDamageEffects, 'guest');
        }
    }
}

async function applyDamageToEnemies(battleManager, damageEffects, playerSide) {
    const totalStacks = damageEffects.reduce((sum, effect) => sum + effect.stacks, 0);
    const damagePerStack = damageEffects[0]?.damagePerStack || 30;
    
    // Process each stack individually with animation
    for (let stackNum = 0; stackNum < totalStacks; stackNum++) {
        createSekhemCardEffect(battleManager, playerSide);
        await battleManager.delay(200);
        
        const playerHeroes = playerSide === 'host' 
            ? battleManager.playerHeroes 
            : battleManager.opponentHeroes;
        
        const uniqueSoulShards = new Set();
        ['left', 'center', 'right'].forEach(position => {
            const hero = playerHeroes[position];
            if (hero && hero.creatures && hero.creatures.length > 0) {
                hero.creatures.forEach(creature => {
                    if (creature.name && creature.name.startsWith('SoulShard')) {
                        uniqueSoulShards.add(creature.name);
                    }
                });
            }
        });
        
        const soulShardMultiplier = uniqueSoulShards.size;
        const playerName = playerSide === 'host' ? 'Host' : 'Guest';
        const logType = playerSide === 'host' ? 'success' : 'info';
        
        if (soulShardMultiplier === 0) {
            battleManager.addCombatLog(
                `Soul Shard Sekhem stack ${stackNum + 1}/${totalStacks} fails - no SoulShard creatures found!`,
                playerSide === 'host' ? 'warning' : 'info'
            );
            
            if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
                battleManager.sendBattleUpdate('soul_shard_sekhem_damage_applied', {
                    playerSide: playerSide,
                    totalDamage: 0,
                    totalStacks: totalStacks,
                    targetsAffected: 0,
                    damagedTargets: [],
                    soulShardMultiplier: 0,
                    failed: true
                });
            }
            await battleManager.delay(200);
            continue;
        }
        
        const baseDamage = damagePerStack;
        const totalDamage = baseDamage * soulShardMultiplier;
        
        const enemyHeroes = playerSide === 'host' 
            ? battleManager.opponentHeroes 
            : battleManager.playerHeroes;
        
        const enemyTargets = [];
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                enemyTargets.push({ type: 'hero', target: hero, position });
                
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, creatureIndex) => {
                        if (creature.alive) {
                            enemyTargets.push({ type: 'creature', target: creature, hero, position, creatureIndex });
                        }
                    });
                }
            }
        });
        
        if (enemyTargets.length === 0) {
            battleManager.addCombatLog(
                `Soul Shard Sekhem stack ${stackNum + 1}/${totalStacks} finds no enemies!`,
                logType
            );
            await battleManager.delay(200);
            continue;
        }
        
        let targetsAffected = 0;
        const damagedTargets = [];
        
        for (const targetInfo of enemyTargets) {
            const target = targetInfo.target;
            const currentHp = target.currentHp;
            const currentShield = target.currentShield || 0;
            const totalEffectiveHp = currentHp + currentShield;
            
            const cappedDamage = totalEffectiveHp <= 1 ? 0 : Math.min(totalDamage, totalEffectiveHp - 1);
            
            if (cappedDamage > 0) {
                if (targetInfo.type === 'creature') {
                    await battleManager.combatManager.authoritative_applyDamageToCreature({
                        hero: targetInfo.hero,
                        creature: target,
                        creatureIndex: targetInfo.creatureIndex,
                        damage: cappedDamage,
                        position: targetInfo.position,
                        side: playerSide === 'host' ? 'opponent' : 'player'
                    }, {
                        source: 'flame',
                        attacker: null
                    });
                } else {
                    await battleManager.combatManager.authoritative_applyDamage({
                        target: target,
                        damage: cappedDamage,
                        newHp: Math.max(1, target.currentHp - cappedDamage),
                        died: false
                    }, {
                        source: 'flame',
                        attacker: null
                    });
                }
                
                targetsAffected++;
                damagedTargets.push(targetInfo);
                
                await createFlameVisualEffect(targetInfo, cappedDamage, battleManager);
            }
        }
        
        if (targetsAffected > 0) {
            let message = `Soul Shard Sekhem stack ${stackNum + 1}/${totalStacks}`;
            if (soulShardMultiplier > 1) {
                message += ` (x${soulShardMultiplier} unique SoulShards)`;
            }
            message += ` deals ${totalDamage} non-lethal damage to ${targetsAffected} enemies!`;
            if (soulShardMultiplier > 1) {
                message += ` [${baseDamage} base × ${soulShardMultiplier} = ${totalDamage}]`;
            }
            battleManager.addCombatLog(message, logType);
        }
        
        if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
            battleManager.sendBattleUpdate('soul_shard_sekhem_damage_applied', {
                playerSide: playerSide,
                totalDamage: totalDamage,
                totalStacks: totalStacks,
                targetsAffected: targetsAffected,
                damagedTargets: damagedTargets.map(t => ({
                    type: t.type,
                    position: t.position,
                    creatureIndex: t.creatureIndex
                })),
                soulShardMultiplier: soulShardMultiplier,
                uniqueSoulShards: Array.from(uniqueSoulShards),
                failed: false
            });
        }
        
        await battleManager.delay(200);
    }
}

async function createFlameVisualEffect(targetInfo, damage, battleManager) {
    const side = battleManager.isHost ? 
        (targetInfo.hero ? (targetInfo.hero.side === 'player' ? 'opponent' : 'player') : 'opponent') :
        (targetInfo.hero ? (targetInfo.hero.side === 'player' ? 'player' : 'opponent') : 'player');
    
    // Use direct DOM query instead of non-existent method
    let targetElement;
    if (targetInfo.type === 'creature') {
        targetElement = document.querySelector(
            `.${side}-slot.${targetInfo.position}-slot .creature-icon[data-creature-index="${targetInfo.creatureIndex}"]`
        );
    } else {
        targetElement = document.querySelector(`.${side}-slot.${targetInfo.position}-slot`);
    }
    
    if (!targetElement) return;
    
    const flameEffect = document.createElement('div');
    flameEffect.className = 'soul-shard-sekhem-flame';
    flameEffect.innerHTML = `<div class="flame-burst">🔥</div>`;
    flameEffect.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 32px;
        z-index: 1000;
        pointer-events: none;
        animation: sekhemFlameEffect 1s ease-out forwards;
    `;
    
    targetElement.appendChild(flameEffect);
    
    setTimeout(() => {
        if (flameEffect.parentNode) {
            flameEffect.remove();
        }
    }, 1000);
}

function createSekhemCardEffect(battleManager, playerSide) {
    ensureSpellCardEffectCSS(battleManager);
    const side = playerSide === 'host' ? 'player' : 'opponent';
    const heroElement = battleManager.getHeroElement(side, 'center');
    
    if (!heroElement) {
        const heroContainer = document.querySelector(`.${side}-heroes`);
        if (!heroContainer) return;
        const tempElement = document.createElement('div');
        tempElement.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            width: 1px;
            height: 1px;
        `;
        heroContainer.appendChild(tempElement);
        createCardAnimationOnElement(tempElement, battleManager, 'SoulShardSekhem');
        setTimeout(() => tempElement.remove(), 2500);
        return;
    }
    createCardAnimationOnElement(heroElement, battleManager, 'SoulShardSekhem');
}

function createCardAnimationOnElement(element, battleManager, cardName = 'SoulShardSekhem') {
    const cardContainer = document.createElement('div');
    cardContainer.className = 'spell-card-container';
    const cardDisplay = document.createElement('div');
    cardDisplay.className = 'spell-card-display';
    const cardImagePath = `./Cards/All/${cardName}.png`;
    cardDisplay.innerHTML = `
        <img src="${cardImagePath}" alt="${cardName}" class="spell-card-image" 
             onerror="this.src='./Cards/placeholder.png'">
    `;
    cardContainer.appendChild(cardDisplay);
    cardContainer.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 600;
        pointer-events: none;
        animation: spellCardEffect ${battleManager.getSpeedAdjustedDelay(2000)}ms ease-out forwards;
    `;
    element.appendChild(cardContainer);
    const animationDuration = battleManager.getSpeedAdjustedDelay(2000);
    setTimeout(() => {
        if (cardContainer && cardContainer.parentNode) {
            cardContainer.remove();
        }
    }, animationDuration);
}

function ensureSpellCardEffectCSS(battleManager) {
    if (document.getElementById('spellCardEffectCSS')) return;
    const style = document.createElement('style');
    style.id = 'spellCardEffectCSS';
    style.textContent = `
        @keyframes spellCardEffect {
            0% { 
                opacity: 0;
                transform: translateX(-50%) scale(0.3) translateY(20px);
            }
            25% { 
                opacity: 1;
                transform: translateX(-50%) scale(1.1) translateY(-10px);
            }
            75% { 
                opacity: 1;
                transform: translateX(-50%) scale(1.0) translateY(-5px);
            }
            100% { 
                opacity: 0;
                transform: translateX(-50%) scale(0.8) translateY(-30px);
            }
        }
        .spell-card-container {
            will-change: transform, opacity;
        }
        .spell-card-display {
            position: relative;
            width: 120px;
            height: 168px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
            overflow: hidden;
        }
        .spell-card-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 6px;
        }
    `;
    document.head.appendChild(style);
}

export function handleGuestSekhemDamage(data, battleManager) {
    if (battleManager.isAuthoritative) return;
    
    const { playerSide, totalDamage, totalStacks, targetsAffected, damagedTargets, 
            soulShardMultiplier, uniqueSoulShards, failed } = data;
    
    // Show card animation for each stack
    for (let i = 0; i < totalStacks; i++) {
        createSekhemCardEffect(battleManager, playerSide);
    }
    
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const isMyEffect = (playerSide === myAbsoluteSide);
    const logType = isMyEffect ? 'success' : 'info';
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    
    if (failed) {
        battleManager.addCombatLog(
            `⚠️ ${playerName}'s Soul Shard Sekhem fails - no SoulShard creatures found!`,
            isMyEffect ? 'warning' : 'info'
        );
        return;
    }
    
    // Create flame visuals on damaged targets
    damagedTargets.forEach(targetInfo => {
        const side = isMyEffect ? 'opponent' : 'player';
        const targetElement = targetInfo.type === 'creature'
            ? battleManager.getCreatureElement(side, targetInfo.position, targetInfo.creatureIndex)
            : battleManager.getHeroElement(side, targetInfo.position);
        
        if (targetElement) {
            const flameEffect = document.createElement('div');
            flameEffect.innerHTML = '🔥';
            flameEffect.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 32px;
                z-index: 1000;
                pointer-events: none;
                animation: sekhemFlameEffect 1s ease-out forwards;
            `;
            targetElement.appendChild(flameEffect);
            setTimeout(() => flameEffect.remove(), 1000);
        }
    });
    
    let message = `🔥 ${playerName}'s Soul Shard Sekhem ${totalStacks > 1 ? `(x${totalStacks})` : ''}`;
    if (soulShardMultiplier > 1) {
        message += ` (x${soulShardMultiplier} unique SoulShards)`;
    }
    message += ` deals ${totalDamage} non-lethal damage to ${targetsAffected} enemies!`;
    if (soulShardMultiplier > 1) {
        const baseDamage = totalStacks * 30;
        message += ` [${baseDamage} base × ${soulShardMultiplier} = ${totalDamage}]`;
    }
    battleManager.addCombatLog(message, logType);
}

// CSS styles
if (typeof document !== 'undefined' && !document.getElementById('soulShardSekhemStyles')) {
    const style = document.createElement('style');
    style.id = 'soulShardSekhemStyles';
    style.textContent = `
        @keyframes soulShardSekhemDisenchant {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1) translateY(-50px);
            }
        }
        @keyframes soulShardSekhemFlame {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(-40px) scale(0.9);
            }
        }
        @keyframes sekhemFlameEffect {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(-20px) scale(0.9);
            }
        }
        .soul-shard-sekhem-disenchant .disenchant-content {
            background: linear-gradient(135deg, rgba(255, 70, 0, 0.95) 0%, rgba(200, 40, 0, 0.95) 100%);
            border: 3px solid rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .soul-shard-sekhem-disenchant .shard-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .soul-shard-sekhem-disenchant .effect-text {
            color: white;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .soul-shard-sekhem-disenchant .damage-preview {
            color: #ffcc99;
            font-size: 14px;
        }
        .soul-shard-sekhem-flame .flame-burst {
            background: radial-gradient(circle, 
                rgba(255, 100, 0, 0.9) 0%, 
                rgba(255, 50, 0, 0.7) 50%, 
                transparent 100%);
            padding: 20px;
            border-radius: 50%;
            text-align: center;
            box-shadow: 0 0 40px rgba(255, 70, 0, 0.8);
        }
        .soul-shard-sekhem-flame .flame-icon {
            font-size: 32px;
            margin-bottom: 5px;
        }
        .soul-shard-sekhem-flame .flame-amount {
            color: white;
            font-weight: bold;
            font-size: 18px;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(style);
}

export default SoulShardSekhemCreature;