// soulShardIb.js - Complete implementation with card animation and combat shield effect

export class SoulShardIbCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.SHIELD_AMOUNT_PER_COPY = 20; // Shield amount per SoulShardIb copy
        
        console.log('💎 Soul Shard Ib Creature module initialized');
    }

    // Check if a creature is Soul Shard Ib
    static isSoulShardIb(creatureName) {
        return creatureName === 'SoulShardIb';
    }

    // Static method for handling disenchant (called from handManager)
    static handleDisenchant(heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Register delayed shield effect for next battle
        SoulShardIbCreature.registerDelayedShieldEffect(heroSelection);
        
        // Show visual feedback
        SoulShardIbCreature.showDisenchantAnimation();
        
        console.log('✨ Soul Shard Ib disenchanted! Shield effect registered for next battle.');
    }

    // Register the delayed shield effect for next battle
    static registerDelayedShieldEffect(heroSelection) {
        // Initialize delayedEffects array if it doesn't exist
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        // Find existing SoulShardIb effect to accumulate stacks
        let existingEffect = heroSelection.delayedEffects.find(
            effect => effect.source === 'SoulShardIb' && effect.type === 'shield_all_allies'
        );
        
        if (existingEffect) {
            // Increment stacks for multiple disenchants
            existingEffect.stacks += 1;
            existingEffect.appliedAt = Date.now(); // Update timestamp
            console.log(`🛡️ Increased Soul Shard Ib stacks to ${existingEffect.stacks}`);
        } else {
            // Add new effect if none exists
            heroSelection.delayedEffects.push({
                type: 'shield_all_allies',
                stacks: 1,
                shieldPerStack: 30,
                source: 'SoulShardIb',
                appliedAt: Date.now(),
                description: 'Grant +30 shield to all allies and their creatures at battle start'
            });
            console.log('🛡️ Added new Soul Shard Ib effect with 1 stack');
        }
    }

    // Show disenchant animation
    static showDisenchantAnimation() {
        const effectBurst = document.createElement('div');
        effectBurst.className = 'soul-shard-disenchant';
        effectBurst.innerHTML = `
            <div class="disenchant-content">
                <div class="shard-icon">💎</div>
                <div class="effect-text">Soul Shard Activated!</div>
                <div class="shield-preview">
                    <span class="shield-icon">🛡️</span>
                    <span>+30 Shield next battle</span>
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
            animation: soulShardDisenchant 2s ease-out forwards;
        `;
        
        document.body.appendChild(effectBurst);
        
        setTimeout(() => {
            if (effectBurst.parentNode) {
                effectBurst.remove();
            }
        }, 2000);
    }

    // Execute Soul Shard Ib special attack (shield an ally)
    async executeSpecialAttack(soulShardActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const soulShardCreature = soulShardActor.data;
        const soulShardHero = soulShardActor.hero;
        const attackerSide = soulShardHero.side;
        
        // Safety check: ensure Soul Shard Ib is still alive
        if (!soulShardCreature.alive || soulShardCreature.currentHp <= 0) {
            console.log(`Soul Shard Ib is dead, cannot execute special attack`);
            return;
        }
        
        // Find a random living allied hero to shield
        const alliedHeroes = attackerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const livingAllies = [];
        ['left', 'center', 'right'].forEach(pos => {
            const hero = alliedHeroes[pos];
            if (hero && hero.alive) {
                livingAllies.push({ hero, position: pos });
            }
        });
        
        if (livingAllies.length === 0) {
            this.battleManager.addCombatLog(
                `💎 ${soulShardCreature.name} pulses with energy but finds no allies to protect!`, 
                'info'
            );
            return;
        }
        
        // Count total SoulShardIb copies across all allied heroes
        let totalIbCopies = 0;
        ['left', 'center', 'right'].forEach(pos => {
            const hero = alliedHeroes[pos];
            if (hero && hero.creatures) {
                totalIbCopies += hero.creatures.filter(c => c.name === 'SoulShardIb' && c.alive).length;
            }
        });

        totalIbCopies = Math.max(totalIbCopies, 1);
        
        // Calculate shield amount
        const shieldAmount = totalIbCopies * this.SHIELD_AMOUNT_PER_COPY;
        
        // Select random ally
        const randomIndex = this.battleManager.getRandomInt(0, livingAllies.length - 1);
        const targetAlly = livingAllies[randomIndex];
        
        this.battleManager.addCombatLog(
            `💎 ${soulShardCreature.name} channels protective energy toward ${targetAlly.hero.name}!`, 
            attackerSide === 'player' ? 'success' : 'info'
        );
        
        // Send synchronization data to guest BEFORE applying shield
        this.sendShieldGrantUpdate(soulShardActor, targetAlly, position, shieldAmount, totalIbCopies);
        
        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);
        
        // Apply shield to allied hero
        await this.applyShieldToAlly(soulShardActor, targetAlly, position, shieldAmount, totalIbCopies);
    }

    // Apply shield to an allied hero
    async applyShieldToAlly(soulShardActor, targetAlly, position, shieldAmount, totalIbCopies) {
        const attackerSide = soulShardActor.hero.side;
        
        // Grant shield using combat manager
        if (this.battleManager.combatManager) {
            this.battleManager.combatManager.addShield(targetAlly.hero, shieldAmount);
        } else {
            // Fallback if combat manager not available
            targetAlly.hero.currentShield = (targetAlly.hero.currentShield || 0) + shieldAmount;
            this.battleManager.updateHeroHealthBar(attackerSide, targetAlly.position, 
                targetAlly.hero.currentHp, targetAlly.hero.maxHp);
        }
        
        // Create shield effect animation
        await this.createShieldGrantAnimation(targetAlly.hero, attackerSide, targetAlly.position, shieldAmount);
        
        let logMessage = `🛡️ ${targetAlly.hero.name} gains ${shieldAmount} shield from ${soulShardActor.data.name}!`;
        if (totalIbCopies > 1) {
            logMessage += ` (${totalIbCopies} Ib copies × ${this.SHIELD_AMOUNT_PER_COPY})`;
        }
        
        this.battleManager.addCombatLog(
            logMessage, 
            attackerSide === 'player' ? 'success' : 'info'
        );
    }

    // Create shield grant animation
    async createShieldGrantAnimation(targetHero, side, position, shieldAmount) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;
        
        // Create green shield bubble effect
        const shieldEffect = document.createElement('div');
        shieldEffect.className = 'soul-shard-combat-shield';
        shieldEffect.innerHTML = `
            <div class="shield-bubble">
                <div class="shield-icon">🛡️</div>
                <div class="shield-amount">+${shieldAmount}</div>
            </div>
        `;
        
        shieldEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            pointer-events: none;
            animation: soulShardShieldGrant 1.5s ease-out forwards;
        `;
        
        heroElement.appendChild(shieldEffect);
        
        // Add green glow to hero
        const card = heroElement.querySelector('.battle-hero-card');
        if (card) {
            card.style.transition = 'box-shadow 0.5s ease';
            card.style.boxShadow = '0 0 30px rgba(0, 255, 100, 0.8)';
            
            setTimeout(() => {
                card.style.boxShadow = '';
            }, 1000);
        }
        
        // Clean up animation
        setTimeout(() => {
            if (shieldEffect.parentNode) {
                shieldEffect.remove();
            }
        }, 1500);
        
        await this.battleManager.delay(800);
    }

    // Send shield grant data to guest for synchronization
    sendShieldGrantUpdate(soulShardActor, targetAlly, position, shieldAmount, totalIbCopies) {
        this.battleManager.sendBattleUpdate('soul_shard_combat_shield', {
            soulShardData: {
                side: soulShardActor.hero.side,
                position: position,
                creatureIndex: soulShardActor.index,
                name: soulShardActor.data.name,
                absoluteSide: soulShardActor.hero.absoluteSide
            },
            target: {
                heroName: targetAlly.hero.name,
                position: targetAlly.position,
                absoluteSide: targetAlly.hero.absoluteSide
            },
            shieldAmount: shieldAmount,
            totalIbCopies: totalIbCopies
        });
    }

    // Handle Soul Shard combat shield on guest side
    async handleGuestCombatShield(data) {
        const { soulShardData, target, shieldAmount, totalIbCopies } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const soulShardLocalSide = (soulShardData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetLocalSide = (target.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💎 ${soulShardData.name} channels protective energy toward ${target.heroName}!`, 
            soulShardLocalSide === 'player' ? 'success' : 'info'
        );
        
        // Find and update target hero
        const heroes = targetLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const targetHero = heroes[target.position];
        
        if (targetHero) {
            // Apply shield
            targetHero.currentShield = (targetHero.currentShield || 0) + shieldAmount;
            
            // Update health bar
            this.battleManager.updateHeroHealthBar(targetLocalSide, target.position, 
                targetHero.currentHp, targetHero.maxHp);
            
            // Create animation
            await this.createShieldGrantAnimation(targetHero, targetLocalSide, target.position, shieldAmount);
            
            let logMessage = `🛡️ ${target.heroName} gains ${shieldAmount} shield!`;
            if (totalIbCopies > 1) {
                logMessage += ` (${totalIbCopies} Ib copies × 20)`;
            }
            
            this.battleManager.addCombatLog(
                logMessage,
                targetLocalSide === 'player' ? 'success' : 'info'
            );
        }
    }

    // Clean up
    cleanup() {
        console.log('Cleaning up Soul Shard Ib creature effects');
    }
}

// Helper functions for battle start effects
function createSoulShardCardEffect(battleManager, playerSide) {
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
        createCardAnimationOnElement(tempElement, battleManager, 'SoulShardIb');
        setTimeout(() => tempElement.remove(), 2500);
        return;
    }
    createCardAnimationOnElement(heroElement, battleManager, 'SoulShardIb');
}

function createCardAnimationOnElement(element, battleManager, cardName = 'SoulShardIb') {
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

// Battle start effect functions
export async function applyBothPlayersDelayedEffectsNoClear(hostEffects, guestEffects, battleManager) {
    console.log('🛡️ Processing Soul Shard Ib effects from both players...');
    if (hostEffects && hostEffects.length > 0) {
        const hostShieldEffects = hostEffects.filter(
            effect => effect.type === 'shield_all_allies' && effect.source === 'SoulShardIb'
        );
        if (hostShieldEffects.length > 0) {
            console.log('🛡️ Applying HOST Soul Shard Ib shields...');
            await applyShieldToAllies(battleManager, hostShieldEffects, 'host');
        }
    }
    if (guestEffects && guestEffects.length > 0) {
        const guestShieldEffects = guestEffects.filter(
            effect => effect.type === 'shield_all_allies' && effect.source === 'SoulShardIb'
        );
        if (guestShieldEffects.length > 0) {
            console.log('🛡️ Applying GUEST Soul Shard Ib shields...');
            await applyShieldToAllies(battleManager, guestShieldEffects, 'guest');
        }
    }
}

async function applyShieldToAllies(battleManager, shieldEffects, playerSide) {
    const totalStacks = shieldEffects.reduce((sum, effect) => sum + effect.stacks, 0);
    const shieldPerStack = shieldEffects[0]?.shieldPerStack || 30;
    
    // Process each stack individually with animation
    for (let stackNum = 0; stackNum < totalStacks; stackNum++) {
        createSoulShardCardEffect(battleManager, playerSide);
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
        if (soulShardMultiplier === 0) {
            const playerName = playerSide === 'host' ? 'Host' : 'Guest';
            const logType = playerSide === 'host' ? 'warning' : 'info';
            battleManager.addCombatLog(
                `Soul Shard Ib stack ${stackNum + 1}/${totalStacks} fails - no SoulShard creatures found!`,
                logType
            );
            
            if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
                battleManager.sendBattleUpdate('soul_shard_shield_applied', {
                    playerSide: playerSide,
                    totalShield: 0,
                    totalStacks: totalStacks,
                    targetsAffected: 0,
                    shieldedPositions: [],
                    soulShardMultiplier: 0,
                    failed: true
                });
            }
            await battleManager.delay(200);
            continue;
        }
        
        const baseShield = shieldPerStack;
        const totalShield = baseShield * soulShardMultiplier;
        
        const heroesToShield = playerSide === 'host' 
            ? battleManager.playerHeroes 
            : battleManager.opponentHeroes;
        
        const playerName = playerSide === 'host' ? 'Host' : 'Guest';
        const logType = playerSide === 'host' ? 'success' : 'info';
        let targetsAffected = 0;
        const shieldedTargets = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroesToShield[position];
            if (hero && hero.alive) {
                hero.currentShield = (hero.currentShield || 0) + totalShield;
                shieldedTargets.push(hero);
                targetsAffected++;
                
                if (battleManager.updateHeroHealthBar) {
                    battleManager.updateHeroHealthBar(hero.side, hero.position, hero.currentHp, hero.maxHp);
                }
                
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, creatureIndex) => {
                        if (creature.alive) {
                            creature.currentShield = (creature.currentShield || 0) + totalShield;
                            shieldedTargets.push({...creature, creatureIndex, heroPosition: position});
                            targetsAffected++;
                        }
                    });
                }
            }
        });
        
        if (shieldedTargets.length > 0) {
            await showShieldVisuals(shieldedTargets, totalShield, battleManager);
        }
        
        if (targetsAffected > 0) {
            let message = `Soul Shard Ib stack ${stackNum + 1}/${totalStacks}`;
            if (soulShardMultiplier > 1) {
                message += ` (x${soulShardMultiplier} unique SoulShards)`;
            }
            message += ` grants +${totalShield} shield to ${targetsAffected} targets!`;
            if (soulShardMultiplier > 1) {
                message += ` [${baseShield} base × ${soulShardMultiplier} = ${totalShield}]`;
            }
            battleManager.addCombatLog(message, logType);
        }
        
        if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
            battleManager.sendBattleUpdate('soul_shard_shield_applied', {
                playerSide: playerSide,
                totalShield: totalShield,
                totalStacks: totalStacks,
                targetsAffected: targetsAffected,
                shieldedPositions: ['left', 'center', 'right'].filter(pos => {
                    const hero = heroesToShield[pos];
                    return hero && hero.alive;
                }),
                soulShardMultiplier: soulShardMultiplier,
                uniqueSoulShards: Array.from(uniqueSoulShards),
                failed: false
            });
        }
        
        await battleManager.delay(200);
    }
}

export function handleGuestSoulShardShield(data, battleManager) {
    if (battleManager.isAuthoritative) return;
    const { playerSide, totalShield, totalStacks, targetsAffected, shieldedPositions, 
            soulShardMultiplier, uniqueSoulShards, failed } = data;
    
    // Show card animation for each stack
    for (let i = 0; i < totalStacks; i++) {
        createSoulShardCardEffect(battleManager, playerSide);
    }
    
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const isMyEffect = (playerSide === myAbsoluteSide);
    const localSide = isMyEffect ? 'player' : 'opponent';
    const heroes = localSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const logType = isMyEffect ? 'success' : 'info';
    
    if (failed) {
        battleManager.addCombatLog(
            `⚠️ ${playerName}'s Soul Shard Ib fails - no SoulShard creatures found!`,
            isMyEffect ? 'warning' : 'info'
        );
        return;
    }
    let actualTargetsAffected = 0;
    shieldedPositions.forEach(position => {
        const hero = heroes[position];
        if (hero && hero.alive) {
            hero.currentShield = (hero.currentShield || 0) + totalShield;
            actualTargetsAffected++;
            battleManager.updateHeroHealthBar(localSide, position, hero.currentHp, hero.maxHp);
            if (hero.creatures && hero.creatures.length > 0) {
                hero.creatures.forEach(creature => {
                    if (creature.alive) {
                        creature.currentShield = (creature.currentShield || 0) + totalShield;
                        actualTargetsAffected++;
                    }
                });
            }
            const heroElement = battleManager.getHeroElement(localSide, position);
            if (heroElement) {
                createShieldBubbleEffect(heroElement, totalShield);
            }
        }
    });
    shieldedPositions.forEach(position => {
        const hero = heroes[position];
        if (hero && hero.creatures) {
            battleManager.updateCreatureVisuals(localSide, position, hero.creatures);
        }
    });
    let message = `🛡️ ${playerName}'s Soul Shard Ib ${totalStacks > 1 ? `(x${totalStacks})` : ''}`;
    if (soulShardMultiplier > 1) {
        message += ` (x${soulShardMultiplier} unique SoulShards)`;
    }
    message += ` grants +${totalShield} shield to ${actualTargetsAffected} targets!`;
    if (soulShardMultiplier > 1) {
        const baseShield = totalStacks * 30;
        message += ` [${baseShield} base × ${soulShardMultiplier} = ${totalShield}]`;
    }
    battleManager.addCombatLog(message, logType);
}

async function showShieldVisuals(targets, shieldAmount, battleManager) {
    targets.forEach(target => {
        let targetElement = null;
        if (target.type === 'creature') {
            targetElement = findCreatureElement(target, battleManager);
        } else {
            targetElement = battleManager.getHeroElement(target.side, target.position);
        }
        if (targetElement) {
            createShieldBubbleEffect(targetElement, shieldAmount);
        }
    });
    await battleManager.delay(500);
}

function createShieldBubbleEffect(element, shieldAmount) {
    const bubble = document.createElement('div');
    bubble.className = 'soul-shard-shield-bubble';
    bubble.textContent = `+${shieldAmount}`;
    bubble.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #00ccff;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(0, 204, 255, 0.8);
        animation: shieldBubbleRise 1.5s ease-out forwards;
        pointer-events: none;
        z-index: 1000;
    `;
    element.style.position = 'relative';
    element.appendChild(bubble);
    setTimeout(() => {
        if (bubble.parentNode) {
            bubble.remove();
        }
    }, 1500);
}

function findCreatureElement(creature, battleManager) {
    return null;
}

// CSS styles
if (typeof document !== 'undefined' && !document.getElementById('soulShardIbStyles')) {
    const style = document.createElement('style');
    style.id = 'soulShardIbStyles';
    style.textContent = `
        @keyframes soulShardDisenchant {
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
        @keyframes shieldBubbleRise {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -100%) translateY(-30px) scale(0.9);
            }
        }
        @keyframes soulShardShieldGrant {
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
        .disenchant-content {
            background: linear-gradient(135deg, rgba(0, 204, 255, 0.95) 0%, rgba(0, 150, 200, 0.95) 100%);
            border: 3px solid rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .shard-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .effect-text {
            color: white;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .shield-preview {
            color: #b0e0ff;
            font-size: 14px;
        }
        .soul-shard-combat-shield .shield-bubble {
            background: radial-gradient(circle, 
                rgba(0, 255, 100, 0.9) 0%, 
                rgba(0, 200, 80, 0.7) 50%, 
                transparent 100%);
            padding: 20px;
            border-radius: 50%;
            text-align: center;
            box-shadow: 0 0 40px rgba(0, 255, 100, 0.8);
        }
        .soul-shard-combat-shield .shield-icon {
            font-size: 32px;
            margin-bottom: 5px;
        }
        .soul-shard-combat-shield .shield-amount {
            color: white;
            font-weight: bold;
            font-size: 18px;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(style);
}

export default SoulShardIbCreature;