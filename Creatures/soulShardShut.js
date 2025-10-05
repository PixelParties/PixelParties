// soulShardShut.js - Soul Shard Shut implementation with graveyard manipulation

export class SoulShardShutCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        console.log('🪦 Soul Shard Shut Creature module initialized');
    }

    // Check if a creature is Soul Shard Shut
    static isSoulShardShut(creatureName) {
        return creatureName === 'SoulShardShut';
    }

    // Static method for handling disenchant (called from handManager)
    static handleDisenchant(heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Register delayed graveyard effect for next battle
        SoulShardShutCreature.registerDelayedGraveyardEffect(heroSelection);
        
        // Show visual feedback
        SoulShardShutCreature.showDisenchantAnimation();
        
        console.log('🪦 Soul Shard Shut disenchanted! Graveyard effect registered for next battle.');
    }

    // Register the delayed graveyard effect for next battle
    static registerDelayedGraveyardEffect(heroSelection) {
        // Initialize delayedEffects array if it doesn't exist
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        // Find existing SoulShardShut effect to accumulate stacks
        let existingEffect = heroSelection.delayedEffects.find(
            effect => effect.source === 'SoulShardShut' && effect.type === 'add_deck_to_graveyard'
        );
        
        if (existingEffect) {
            // Increment stacks for multiple disenchants
            existingEffect.stacks += 1;
            existingEffect.appliedAt = Date.now();
            console.log(`🪦 Increased Soul Shard Shut stacks to ${existingEffect.stacks}`);
        } else {
            // Add new effect if none exists
            heroSelection.delayedEffects.push({
                type: 'add_deck_to_graveyard',
                stacks: 1,
                cardsPerStack: 2,
                source: 'SoulShardShut',
                appliedAt: Date.now(),
                description: 'Add 2 random deck cards to graveyard per unique SoulShard creature'
            });
            console.log('🪦 Added new Soul Shard Shut effect with 1 stack');
        }
    }

    // Show disenchant animation
    static showDisenchantAnimation() {
        const effectBurst = document.createElement('div');
        effectBurst.className = 'soul-shard-shut-disenchant';
        effectBurst.innerHTML = `
            <div class="disenchant-content">
                <div class="shard-icon">🪦</div>
                <div class="effect-text">Soul Shard Activated!</div>
                <div class="graveyard-preview">
                    <span class="tomb-icon">🪦</span>
                    <span>Graveyard expansion next battle</span>
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
            animation: soulShardShutDisenchant 2s ease-out forwards;
        `;
        
        document.body.appendChild(effectBurst);
        
        setTimeout(() => {
            if (effectBurst.parentNode) {
                effectBurst.remove();
            }
        }, 2000);
    }

    // Execute Soul Shard Shut special attack (damage equal to graveyard size)
    async executeSpecialAttack(shutActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const shutCreature = shutActor.data;
        const shutHero = shutActor.hero;
        const attackerSide = shutHero.side;
        
        // Safety check: ensure Soul Shard Shut is still alive
        if (!shutCreature.alive || shutCreature.currentHp <= 0) {
            console.log(`Soul Shard Shut is dead, cannot execute special attack`);
            return;
        }
        
        // Get owner's graveyard size
        const graveyardSize = this.getOwnerGraveyardSize(attackerSide);
        const damageAmount = graveyardSize;
        
        // Find closest enemy target using standard targeting
        const target = this.battleManager.combatManager.authoritative_findTargetWithCreatures(position, attackerSide);
        
        if (!target) {
            this.battleManager.addCombatLog(
                `🪦 ${shutCreature.name} summons mummies but finds no enemies!`, 
                'info'
            );
            return;
        }
        
        this.battleManager.addCombatLog(
            `🪦 ${shutCreature.name} summons ancient mummies toward ${target.type === 'creature' ? target.creature.name : target.hero.name}!`, 
            attackerSide === 'player' ? 'success' : 'info'
        );
        
        // Send synchronization data to guest BEFORE applying damage
        this.sendMummyAttackUpdate(shutActor, target, position, damageAmount, graveyardSize);
        
        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);
        
        // Apply damage to target
        await this.applyMummyDamageToTarget(shutActor, target, position, damageAmount, graveyardSize);
    }

    // Get owner's graveyard size
    getOwnerGraveyardSize(attackerSide) {
        const bm = this.battleManager;
        
        // Determine which graveyard to check based on attacker side
        if (attackerSide === 'player') {
            // Player's graveyard
            if (bm.isHost) {
                return bm.playerGraveyard?.length || 0;
            } else {
                return bm.playerGraveyard?.length || 0;
            }
        } else {
            // Opponent's graveyard
            if (bm.isHost) {
                return bm.opponentGraveyard?.length || 0;
            } else {
                return bm.opponentGraveyard?.length || 0;
            }
        }
    }

    // Apply mummy damage to target
    async applyMummyDamageToTarget(shutActor, target, position, damageAmount, graveyardSize) {
        const attackerSide = shutActor.hero.side;
        
        // Create mummy attack animation
        await this.createMummyAttackAnimation(target, damageAmount);
        
        // Apply damage
        if (target.type === 'creature') {
            await this.battleManager.combatManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: damageAmount,
                position: target.position,
                side: target.side
            }, {
                source: 'mummy',
                attacker: shutActor.data
            });
        } else {
            await this.battleManager.combatManager.authoritative_applyDamage({
                target: target.hero,
                damage: damageAmount,
                newHp: Math.max(0, target.hero.currentHp - damageAmount),
                died: target.hero.currentHp - damageAmount <= 0
            }, {
                source: 'mummy',
                attacker: shutActor.data
            });
        }
        
        this.battleManager.addCombatLog(
            `🪦 ${target.type === 'creature' ? target.creature.name : target.hero.name} takes ${damageAmount} damage from mummies! (Graveyard: ${graveyardSize} cards)`, 
            attackerSide === 'player' ? 'success' : 'info'
        );
    }

    // Create mummy attack animation
    async createMummyAttackAnimation(target, damageAmount) {
        const targetSide = target.side;
        const targetPosition = target.position;
        
        // Get target element
        let targetElement;
        if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${targetSide}-slot.${targetPosition}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        } else {
            targetElement = document.querySelector(`.${targetSide}-slot.${targetPosition}-slot`);
        }
        
        if (!targetElement) return;
        
        // Create mummy effect
        const mummyEffect = document.createElement('div');
        mummyEffect.className = 'soul-shard-shut-mummy';
        mummyEffect.innerHTML = `
            <div class="mummy-burst">
                <div class="mummy-icon">🧟</div>
                <div class="mummy-amount">-${damageAmount}</div>
            </div>
        `;
        
        mummyEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            pointer-events: none;
            animation: soulShardShutMummy 1.5s ease-out forwards;
        `;
        
        targetElement.appendChild(mummyEffect);
        
        // Add dark purple glow to target
        const card = targetElement.querySelector('.battle-hero-card, .creature-icon');
        if (card) {
            card.style.transition = 'box-shadow 0.5s ease';
            card.style.boxShadow = '0 0 30px rgba(100, 50, 150, 0.8)';
            
            setTimeout(() => {
                card.style.boxShadow = '';
            }, 1000);
        }
        
        // Clean up animation
        setTimeout(() => {
            if (mummyEffect.parentNode) {
                mummyEffect.remove();
            }
        }, 1500);
        
        await this.battleManager.delay(800);
    }

    // Send mummy attack data to guest for synchronization
    sendMummyAttackUpdate(shutActor, target, position, damageAmount, graveyardSize) {
        this.battleManager.sendBattleUpdate('soul_shard_shut_mummy_attack', {
            shutData: {
                side: shutActor.hero.side,
                position: position,
                creatureIndex: shutActor.index,
                name: shutActor.data.name,
                absoluteSide: shutActor.hero.absoluteSide
            },
            target: {
                type: target.type,
                name: target.type === 'creature' ? target.creature.name : target.hero.name,
                position: target.position,
                absoluteSide: target.hero.absoluteSide,
                creatureIndex: target.type === 'creature' ? target.creatureIndex : undefined
            },
            damageAmount: damageAmount,
            graveyardSize: graveyardSize
        });
    }

    // Handle Soul Shard Shut mummy attack on guest side
    async handleGuestMummyAttack(data) {
        const { shutData, target, damageAmount, graveyardSize } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const shutLocalSide = (shutData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetLocalSide = (target.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🪦 ${shutData.name} summons ancient mummies toward ${target.name}!`, 
            shutLocalSide === 'player' ? 'success' : 'info'
        );
        
        // Find target element for animation
        let targetElement;
        if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        } else {
            targetElement = document.querySelector(`.${targetLocalSide}-slot.${target.position}-slot`);
        }
        
        if (targetElement) {
            await this.createMummyAttackAnimation({
                side: targetLocalSide,
                position: target.position,
                type: target.type,
                creatureIndex: target.creatureIndex
            }, damageAmount);
        }
        
        this.battleManager.addCombatLog(
            `🪦 ${target.name} takes ${damageAmount} damage from mummies! (Graveyard: ${graveyardSize} cards)`,
            targetLocalSide === 'player' ? 'error' : 'success'
        );
    }

    // Clean up
    cleanup() {
        console.log('Cleaning up Soul Shard Shut creature effects');
    }
}

// Battle start effect functions
export async function applyBothPlayersDelayedGraveyardEffects(hostEffects, guestEffects, battleManager) {
    console.log('🪦 Processing Soul Shard Shut effects from both players...');
    
    if (hostEffects && hostEffects.length > 0) {
        const hostGraveyardEffects = hostEffects.filter(
            effect => effect.type === 'add_deck_to_graveyard' && effect.source === 'SoulShardShut'
        );
        if (hostGraveyardEffects.length > 0) {
            console.log('🪦 Applying HOST Soul Shard Shut graveyard effects...');
            await applyGraveyardEffects(battleManager, hostGraveyardEffects, 'host');
        }
    }
    
    if (guestEffects && guestEffects.length > 0) {
        const guestGraveyardEffects = guestEffects.filter(
            effect => effect.type === 'add_deck_to_graveyard' && effect.source === 'SoulShardShut'
        );
        if (guestGraveyardEffects.length > 0) {
            console.log('🪦 Applying GUEST Soul Shard Shut graveyard effects...');
            await applyGraveyardEffects(battleManager, guestGraveyardEffects, 'guest');
        }
    }
}

async function applyGraveyardEffects(battleManager, graveyardEffects, playerSide) {
    const totalStacks = graveyardEffects.reduce((sum, effect) => sum + effect.stacks, 0);
    const cardsPerStack = graveyardEffects[0]?.cardsPerStack || 2;
    
    // Process each stack individually with animation
    for (let stackNum = 0; stackNum < totalStacks; stackNum++) {
        createShutCardEffect(battleManager, playerSide);
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
                `Soul Shard Shut stack ${stackNum + 1}/${totalStacks} fails - no SoulShard creatures found!`,
                logType
            );
            
            if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
                battleManager.sendBattleUpdate('soul_shard_shut_graveyard_applied', {
                    playerSide: playerSide,
                    totalCards: 0,
                    totalStacks: totalStacks,
                    cardsAdded: [],
                    soulShardMultiplier: 0,
                    failed: true
                });
            }
            await battleManager.delay(200);
            continue;
        }
        
        const totalCardsToAdd = cardsPerStack * soulShardMultiplier;
        
        const playerDeck = playerSide === 'host' 
            ? battleManager.playerDeck 
            : battleManager.opponentDeck;
        
        if (!playerDeck || playerDeck.length === 0) {
            battleManager.addCombatLog(
                `Soul Shard Shut stack ${stackNum + 1}/${totalStacks} finds an empty deck!`,
                logType
            );
            await battleManager.delay(200);
            continue;
        }
        
        const cardsAdded = [];
        for (let i = 0; i < totalCardsToAdd; i++) {
            const randomIndex = Math.floor(Math.random() * playerDeck.length);
            const randomCard = playerDeck[randomIndex];
            cardsAdded.push(randomCard);
        }
        
        const playerGraveyard = playerSide === 'host' 
            ? battleManager.playerGraveyard 
            : battleManager.opponentGraveyard;
        
        if (playerGraveyard) {
            cardsAdded.forEach(card => playerGraveyard.push(card));
        }
        
        let message = `Soul Shard Shut stack ${stackNum + 1}/${totalStacks}`;
        if (soulShardMultiplier > 1) {
            message += ` (x${soulShardMultiplier} unique SoulShards)`;
        }
        message += ` adds ${totalCardsToAdd} random deck cards to graveyard!`;
        if (soulShardMultiplier > 1) {
            const baseCards = cardsPerStack;
            message += ` [${baseCards} base × ${soulShardMultiplier} = ${totalCardsToAdd}]`;
        }
        battleManager.addCombatLog(message, logType);
        
        if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
            battleManager.sendBattleUpdate('soul_shard_shut_graveyard_applied', {
                playerSide: playerSide,
                totalCards: totalCardsToAdd,
                totalStacks: totalStacks,
                cardsAdded: cardsAdded,
                soulShardMultiplier: soulShardMultiplier,
                uniqueSoulShards: Array.from(uniqueSoulShards),
                failed: false
            });
        }
        
        await battleManager.delay(200);
    }
}

function createShutCardEffect(battleManager, playerSide) {
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
        createCardAnimationOnElement(tempElement, battleManager, 'SoulShardShut');
        setTimeout(() => tempElement.remove(), 2500);
        return;
    }
    createCardAnimationOnElement(heroElement, battleManager, 'SoulShardShut');
}

function createCardAnimationOnElement(element, battleManager, cardName = 'SoulShardShut') {
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

export function handleGuestShutGraveyard(data, battleManager) {
    if (battleManager.isAuthoritative) return;
    
    const { playerSide, totalCards, totalStacks, cardsAdded, 
            soulShardMultiplier, uniqueSoulShards, failed } = data;
    
    // Show card animation for each stack
    for (let i = 0; i < totalStacks; i++) {
        createShutCardEffect(battleManager, playerSide);
    }
    
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const isMyEffect = (playerSide === myAbsoluteSide);
    const logType = isMyEffect ? 'success' : 'info';
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    
    if (failed) {
        battleManager.addCombatLog(
            `⚠️ ${playerName}'s Soul Shard Shut fails - no SoulShard creatures found!`,
            isMyEffect ? 'warning' : 'info'
        );
        return;
    }
    
    // Add cards to local graveyard
    const playerGraveyard = isMyEffect 
        ? battleManager.playerGraveyard 
        : battleManager.opponentGraveyard;
    
    if (playerGraveyard && cardsAdded) {
        cardsAdded.forEach(card => playerGraveyard.push(card));
    }
    
    let message = `🪦 ${playerName}'s Soul Shard Shut ${totalStacks > 1 ? `(x${totalStacks})` : ''}`;
    if (soulShardMultiplier > 1) {
        message += ` (x${soulShardMultiplier} unique SoulShards)`;
    }
    message += ` adds ${totalCards} random deck cards to graveyard!`;
    if (soulShardMultiplier > 1) {
        const baseCards = totalStacks * 2;
        message += ` [${baseCards} base × ${soulShardMultiplier} = ${totalCards}]`;
    }
    battleManager.addCombatLog(message, logType);
}

// CSS styles
if (typeof document !== 'undefined' && !document.getElementById('soulShardShutStyles')) {
    const style = document.createElement('style');
    style.id = 'soulShardShutStyles';
    style.textContent = `
        @keyframes soulShardShutDisenchant {
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
        @keyframes soulShardShutMummy {
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
        .soul-shard-shut-disenchant .disenchant-content {
            background: linear-gradient(135deg, rgba(100, 50, 150, 0.95) 0%, rgba(70, 30, 100, 0.95) 100%);
            border: 3px solid rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .soul-shard-shut-disenchant .shard-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .soul-shard-shut-disenchant .effect-text {
            color: white;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .soul-shard-shut-disenchant .graveyard-preview {
            color: #d8b3ff;
            font-size: 14px;
        }
        .soul-shard-shut-mummy .mummy-burst {
            background: radial-gradient(circle, 
                rgba(100, 50, 150, 0.9) 0%, 
                rgba(70, 30, 100, 0.7) 50%, 
                transparent 100%);
            padding: 20px;
            border-radius: 50%;
            text-align: center;
            box-shadow: 0 0 40px rgba(100, 50, 150, 0.8);
        }
        .soul-shard-shut-mummy .mummy-icon {
            font-size: 32px;
            margin-bottom: 5px;
        }
        .soul-shard-shut-mummy .mummy-amount {
            color: white;
            font-weight: bold;
            font-size: 18px;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(style);
}

export default SoulShardShutCreature;