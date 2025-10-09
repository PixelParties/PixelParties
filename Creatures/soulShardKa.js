// soulShardKa.js - Complete implementation with card animation and combat attack buff effect

export class SoulShardKaCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.ATTACK_BONUS_PER_UNIQUE = 20; // Attack bonus per unique SoulShard at battle start
        this.ATTACK_BONUS_PER_COPY = 10;   // Attack bonus per SoulShardKa copy during turn
        
        console.log('⚔️ Soul Shard Ka Creature module initialized');
    }

    // Check if a creature is Soul Shard Ka
    static isSoulShardKa(creatureName) {
        return creatureName === 'SoulShardKa';
    }

    // Static method for handling disenchant (called from handManager)
    static handleDisenchant(heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Register delayed attack effect for next battle
        SoulShardKaCreature.registerDelayedAttackEffect(heroSelection);
        
        // Show visual feedback
        SoulShardKaCreature.showDisenchantAnimation();
        
        console.log('✨ Soul Shard Ka disenchanted! Attack effect registered for next battle.');
    }

    // Register the delayed attack effect for next battle
    static registerDelayedAttackEffect(heroSelection) {
        // Initialize delayedEffects array if it doesn't exist
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        // Find existing SoulShardKa effect to accumulate stacks
        let existingEffect = heroSelection.delayedEffects.find(
            effect => effect.source === 'SoulShardKa' && effect.type === 'attack_boost_all_allies'
        );
        
        if (existingEffect) {
            // Increment stacks for multiple disenchants
            existingEffect.stacks += 1;
            existingEffect.appliedAt = Date.now(); // Update timestamp
            console.log(`⚔️ Increased Soul Shard Ka stacks to ${existingEffect.stacks}`);
        } else {
            // Add new effect if none exists
            heroSelection.delayedEffects.push({
                type: 'attack_boost_all_allies',
                stacks: 1,
                attackPerStack: 20,
                source: 'SoulShardKa',
                appliedAt: Date.now(),
                description: 'Grant +20 attack to all allied heroes per unique SoulShard at battle start'
            });
            console.log('⚔️ Added new Soul Shard Ka effect with 1 stack');
        }
    }

    // Show disenchant animation
    static showDisenchantAnimation() {
        const effectBurst = document.createElement('div');
        effectBurst.className = 'soul-shard-disenchant';
        effectBurst.innerHTML = `
            <div class="disenchant-content-ka">
                <div class="shard-icon">💎</div>
                <div class="effect-text">Soul Shard Activated!</div>
                <div class="attack-preview">
                    <span class="attack-icon">⚔️</span>
                    <span>+20 Attack next battle</span>
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

    // Execute Soul Shard Ka special attack (buff an ally's attack)
    async executeSpecialAttack(soulShardActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const soulShardCreature = soulShardActor.data;
        const soulShardHero = soulShardActor.hero;
        const attackerSide = soulShardHero.side;
        
        // Safety check: ensure Soul Shard Ka is still alive
        if (!soulShardCreature.alive || soulShardCreature.currentHp <= 0) {
            console.log(`Soul Shard Ka is dead, cannot execute special attack`);
            return;
        }
        
        // Find a random living allied hero to buff
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
                `⚔️ ${soulShardCreature.name} pulses with energy but finds no allies to empower!`, 
                'info'
            );
            return;
        }
        
        // Count total SoulShardKa copies across all allied heroes
        let totalKaCopies = 0;
        ['left', 'center', 'right'].forEach(pos => {
            const hero = alliedHeroes[pos];
            if (hero && hero.creatures) {
                totalKaCopies += hero.creatures.filter(c => c.name === 'SoulShardKa' && c.alive).length;
            }
        });

        totalKaCopies = Math.max(totalKaCopies, 1);
        
        // Calculate attack bonus
        const attackBonus = totalKaCopies * this.ATTACK_BONUS_PER_COPY;
        
        // Select random ally
        const randomIndex = this.battleManager.getRandomInt(0, livingAllies.length - 1);
        const targetAlly = livingAllies[randomIndex];
        
        this.battleManager.addCombatLog(
            `⚔️ ${soulShardCreature.name} channels empowering energy toward ${targetAlly.hero.name}!`, 
            attackerSide === 'player' ? 'success' : 'info'
        );
        
        // Send synchronization data to guest BEFORE applying buff
        this.sendAttackBuffUpdate(soulShardActor, targetAlly, position, attackBonus, totalKaCopies);
        
        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);
        
        // Apply attack buff to allied hero
        await this.applyAttackBuffToAlly(soulShardActor, targetAlly, position, attackBonus, totalKaCopies);
    }

    // Apply attack buff to an allied hero
    async applyAttackBuffToAlly(soulShardActor, targetAlly, position, attackBonus, totalKaCopies) {
        const attackerSide = soulShardActor.hero.side;
        
        // Add battle attack bonus
        targetAlly.hero.addBattleAttackBonus(attackBonus);
        
        // Update attack display
        this.battleManager.updateHeroAttackDisplay(attackerSide, targetAlly.position, targetAlly.hero);
        
        // Create attack buff animation
        await this.createAttackBuffAnimation(targetAlly.hero, attackerSide, targetAlly.position);
        
        let logMessage = `⚔️ ${targetAlly.hero.name} gains +${attackBonus} attack from ${soulShardActor.data.name}!`;
        if (totalKaCopies > 1) {
            logMessage += ` (${totalKaCopies} Ka copies × ${this.ATTACK_BONUS_PER_COPY})`;
        }
        
        this.battleManager.addCombatLog(
            logMessage, 
            attackerSide === 'player' ? 'success' : 'info'
        );
    }

    // Create attack buff animation
    async createAttackBuffAnimation(targetHero, side, position) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;
        
        // Create brown earth/clay effect
        const buffEffect = document.createElement('div');
        buffEffect.className = 'soul-shard-combat-attack';
        buffEffect.innerHTML = `
            <div class="attack-buff-bubble">
                <div class="buff-icon">⚔️</div>
                <div class="buff-amount">+ATK</div>
            </div>
        `;
        
        buffEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            pointer-events: none;
            animation: soulShardAttackBuff 1.5s ease-out forwards;
        `;
        
        heroElement.appendChild(buffEffect);
        
        // Add brown glow to hero
        const card = heroElement.querySelector('.battle-hero-card');
        if (card) {
            card.style.transition = 'box-shadow 0.5s ease';
            card.style.boxShadow = '0 0 30px rgba(139, 69, 19, 0.8)';
            
            setTimeout(() => {
                card.style.boxShadow = '';
            }, 1000);
        }
        
        // Clean up animation
        setTimeout(() => {
            if (buffEffect.parentNode) {
                buffEffect.remove();
            }
        }, 1500);
        
        await this.battleManager.delay(800);
    }

    // Send attack buff data to guest for synchronization
    sendAttackBuffUpdate(soulShardActor, targetAlly, position, attackBonus, totalKaCopies) {
        this.battleManager.sendBattleUpdate('soul_shard_ka_combat_buff', {
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
            attackBonus: attackBonus,
            totalKaCopies: totalKaCopies
        });
    }

    // Handle Soul Shard Ka combat buff on guest side
    async handleGuestCombatBuff(data) {
        const { soulShardData, target, attackBonus, totalKaCopies } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const soulShardLocalSide = (soulShardData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetLocalSide = (target.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `⚔️ ${soulShardData.name} channels empowering energy toward ${target.heroName}!`, 
            soulShardLocalSide === 'player' ? 'success' : 'info'
        );
        
        // Find and update target hero
        const heroes = targetLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const targetHero = heroes[target.position];
        
        if (targetHero) {
            // Apply attack bonus
            targetHero.addBattleAttackBonus(attackBonus);
            
            // Update attack display
            this.battleManager.updateHeroAttackDisplay(targetLocalSide, target.position, targetHero);
            
            // Create animation
            await this.createAttackBuffAnimation(targetHero, targetLocalSide, target.position);
            
            let logMessage = `⚔️ ${target.heroName} gains +${attackBonus} attack!`;
            if (totalKaCopies > 1) {
                logMessage += ` (${totalKaCopies} Ka copies × ${this.ATTACK_BONUS_PER_COPY})`;
            }
            
            this.battleManager.addCombatLog(
                logMessage,
                targetLocalSide === 'player' ? 'success' : 'info'
            );
        }
    }

    // Clean up
    cleanup() {
        console.log('Cleaning up Soul Shard Ka creature effects');
    }
}

// Helper functions
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
        createCardAnimationOnElement(tempElement, battleManager, 'SoulShardKa');
        setTimeout(() => tempElement.remove(), 2500);
        return;
    }
    createCardAnimationOnElement(heroElement, battleManager, 'SoulShardKa');
}

function createCardAnimationOnElement(element, battleManager, cardName = 'SoulShardKa') {
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
export async function applyBothPlayersDelayedAttackEffectsNoClear(hostEffects, guestEffects, battleManager) {
    console.log('⚔️ Processing Soul Shard Ka effects from both players...');
    if (hostEffects && hostEffects.length > 0) {
        const hostAttackEffects = hostEffects.filter(
            effect => effect.type === 'attack_boost_all_allies' && effect.source === 'SoulShardKa'
        );
        if (hostAttackEffects.length > 0) {
            console.log('⚔️ Applying HOST Soul Shard Ka attack bonuses...');
            await applyAttackToAllies(battleManager, hostAttackEffects, 'host');
        }
    }
    if (guestEffects && guestEffects.length > 0) {
        const guestAttackEffects = guestEffects.filter(
            effect => effect.type === 'attack_boost_all_allies' && effect.source === 'SoulShardKa'
        );
        if (guestAttackEffects.length > 0) {
            console.log('⚔️ Applying GUEST Soul Shard Ka attack bonuses...');
            await applyAttackToAllies(battleManager, guestAttackEffects, 'guest');
        }
    }
}

async function applyAttackToAllies(battleManager, attackEffects, playerSide) {
    const totalStacks = attackEffects.reduce((sum, effect) => sum + effect.stacks, 0);
    const attackPerStack = attackEffects[0]?.attackPerStack || 20;
    
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
        const playerName = playerSide === 'host' ? 'Host' : 'Guest';
        const logType = playerSide === 'host' ? 'success' : 'info';
        
        if (soulShardMultiplier === 0) {
            battleManager.addCombatLog(
                `Soul Shard Ka stack ${stackNum + 1}/${totalStacks} fails - no SoulShard creatures found!`,
                playerSide === 'host' ? 'warning' : 'info'
            );
            
            if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
                battleManager.sendBattleUpdate('soul_shard_ka_attack_applied', {
                    playerSide: playerSide,
                    totalAttackBonus: 0,
                    totalStacks: totalStacks,
                    targetsAffected: 0,
                    buffedPositions: [],
                    soulShardMultiplier: 0,
                    failed: true
                });
            }
            await battleManager.delay(200);
            continue;
        }
        
        const baseAttackBonus = attackPerStack;
        const totalAttackBonus = baseAttackBonus * soulShardMultiplier;
        
        const heroesToBuff = playerSide === 'host' 
            ? battleManager.playerHeroes 
            : battleManager.opponentHeroes;
        
        let targetsAffected = 0;
        const buffedTargets = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroesToBuff[position];
            if (hero && hero.alive) {
                hero.addBattleAttackBonus(totalAttackBonus);
                buffedTargets.push(hero);
                targetsAffected++;
                
                const side = playerSide === 'host' ? 'player' : 'opponent';
                battleManager.updateHeroAttackDisplay(side, position, hero);
            }
        });
        
        if (buffedTargets.length > 0) {
            await showAttackBuffVisuals(buffedTargets, totalAttackBonus, battleManager, playerSide);
        }
        
        if (targetsAffected > 0) {
            let message = `Soul Shard Ka stack ${stackNum + 1}/${totalStacks}`;
            if (soulShardMultiplier > 1) {
                message += ` (x${soulShardMultiplier} unique SoulShards)`;
            }
            message += ` grants +${totalAttackBonus} attack to ${targetsAffected} heroes!`;
            if (soulShardMultiplier > 1) {
                message += ` [${baseAttackBonus} base × ${soulShardMultiplier} = ${totalAttackBonus}]`;
            }
            battleManager.addCombatLog(message, logType);
        }
        
        if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
            battleManager.sendBattleUpdate('soul_shard_ka_attack_applied', {
                playerSide: playerSide,
                totalAttackBonus: totalAttackBonus,
                totalStacks: totalStacks,
                targetsAffected: targetsAffected,
                buffedPositions: ['left', 'center', 'right'].filter(pos => {
                    const hero = heroesToBuff[pos];
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

export function handleGuestSoulShardKaAttack(data, battleManager) {
    if (battleManager.isAuthoritative) return;
    
    const { playerSide, totalAttackBonus, totalStacks, targetsAffected, buffedPositions, 
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
            `⚠️ ${playerName}'s Soul Shard Ka fails - no SoulShard creatures found!`,
            isMyEffect ? 'warning' : 'info'
        );
        return;
    }
    
    let actualTargetsAffected = 0;
    buffedPositions.forEach(position => {
        const hero = heroes[position];
        if (hero && hero.alive) {
            hero.addBattleAttackBonus(totalAttackBonus);
            actualTargetsAffected++;
            battleManager.updateHeroAttackDisplay(localSide, position, hero);
            
            const heroElement = battleManager.getHeroElement(localSide, position);
            if (heroElement) {
                createAttackBubbleEffect(heroElement, totalAttackBonus);
            }
        }
    });
    
    let message = `⚔️ ${playerName}'s Soul Shard Ka ${totalStacks > 1 ? `(x${totalStacks})` : ''}`;
    if (soulShardMultiplier > 1) {
        message += ` (x${soulShardMultiplier} unique SoulShards)`;
    }
    message += ` grants +${totalAttackBonus} attack to ${actualTargetsAffected} heroes!`;
    if (soulShardMultiplier > 1) {
        const baseBonus = totalStacks * 20;
        message += ` [${baseBonus} base × ${soulShardMultiplier} = ${totalAttackBonus}]`;
    }
    battleManager.addCombatLog(message, logType);
}

async function showAttackBuffVisuals(targets, attackBonus, battleManager, playerSide) {
    const side = playerSide === 'host' ? 'player' : 'opponent';
    
    targets.forEach(target => {
        const position = target.position || ['left', 'center', 'right'].find(pos => 
            battleManager[side === 'player' ? 'playerHeroes' : 'opponentHeroes'][pos] === target
        );
        
        if (position) {
            const targetElement = battleManager.getHeroElement(side, position);
            if (targetElement) {
                createAttackBubbleEffect(targetElement, attackBonus);
            }
        }
    });
    
    await battleManager.delay(500);
}

function createAttackBubbleEffect(element, attackBonus) {
    const bubble = document.createElement('div');
    bubble.className = 'soul-shard-attack-bubble';
    bubble.textContent = `+${attackBonus} ATK`;
    bubble.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #8B4513;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(139, 69, 19, 0.8);
        animation: attackBubbleRise 1.5s ease-out forwards;
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

// CSS styles
if (typeof document !== 'undefined' && !document.getElementById('soulShardKaStyles')) {
    const style = document.createElement('style');
    style.id = 'soulShardKaStyles';
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
        @keyframes attackBubbleRise {
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
        @keyframes soulShardAttackBuff {
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
        .disenchant-content-ka {
            background: linear-gradient(135deg, rgba(139, 69, 19, 0.95) 0%, rgba(101, 67, 33, 0.95) 100%);
            border: 3px solid rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .attack-preview {
            color: #FFD700;
            font-size: 14px;
        }
        .soul-shard-combat-attack .attack-buff-bubble {
            background: radial-gradient(circle, 
                rgba(139, 69, 19, 0.9) 0%, 
                rgba(101, 67, 33, 0.7) 50%, 
                transparent 100%);
            padding: 20px;
            border-radius: 50%;
            text-align: center;
            box-shadow: 0 0 40px rgba(139, 69, 19, 0.8);
        }
        .soul-shard-combat-attack .buff-icon {
            font-size: 32px;
            margin-bottom: 5px;
        }
        .soul-shard-combat-attack .buff-amount {
            color: #FFD700;
            font-weight: bold;
            font-size: 18px;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(style);
}

export default SoulShardKaCreature;