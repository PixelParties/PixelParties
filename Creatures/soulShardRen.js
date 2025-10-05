// ./Creatures/soulShardRen.js - Soul Shard Ren with hand discard/redraw and chance-based card draw

export class SoulShardRenCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.CARD_DRAW_ANIMATION_TIME = 1000;
        
        console.log('🎴 Soul Shard Ren Creature module initialized');
    }

    // Check if a creature is Soul Shard Ren
    static isSoulShardRen(creatureName) {
        return creatureName === 'SoulShardRen';
    }

    // Static method for handling disenchant (called from handManager)
    static handleDisenchant(heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        SoulShardRenCreature.registerDelayedRedrawEffect(heroSelection);
        SoulShardRenCreature.showDisenchantAnimation();
        
        console.log('✨ Soul Shard Ren disenchanted! Redraw effect registered for next battle.');
    }

    // Register the delayed redraw effect for next battle
    static registerDelayedRedrawEffect(heroSelection) {
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        let existingEffect = heroSelection.delayedEffects.find(
            effect => effect.source === 'SoulShardRen' && effect.type === 'discard_redraw_hand'
        );
        
        if (existingEffect) {
            existingEffect.stacks += 1;
            existingEffect.appliedAt = Date.now();
            console.log(`🎴 Increased Soul Shard Ren stacks to ${existingEffect.stacks}`);
        } else {
            heroSelection.delayedEffects.push({
                type: 'discard_redraw_hand',
                stacks: 1,
                source: 'SoulShardRen',
                appliedAt: Date.now(),
                description: 'Discard hand and draw cards equal to unique SoulShard creatures at battle start'
            });
            console.log('🎴 Added new Soul Shard Ren effect with 1 stack');
        }
    }

    // Show disenchant animation
    static showDisenchantAnimation() {
        const effectBurst = document.createElement('div');
        effectBurst.className = 'soul-shard-ren-disenchant';
        effectBurst.innerHTML = `
            <div class="disenchant-content">
                <div class="shard-icon">🎴</div>
                <div class="effect-text">Soul Shard Activated!</div>
                <div class="redraw-preview">
                    <span class="redraw-icon">🔄</span>
                    <span>Hand redraw next battle</span>
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
            animation: soulShardRenDisenchant 2s ease-out forwards;
        `;
        
        document.body.appendChild(effectBurst);
        
        setTimeout(() => {
            if (effectBurst.parentNode) {
                effectBurst.remove();
            }
        }, 2000);
    }

    // Execute Soul Shard Ren special attack (chance-based card draw)
    async executeSpecialAttack(renActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const renCreature = renActor.data;
        const renHero = renActor.hero;
        const attackerSide = renHero.side;
        
        if (!renCreature.alive || renCreature.currentHp <= 0) {
            console.log(`Soul Shard Ren is dead, cannot execute special attack`);
            return;
        }
        
        // Check if hand is full
        const playerHand = attackerSide === 'player' ? 
            this.battleManager.playerHand : this.battleManager.opponentHand;
        const maxHandSize = 10; // Standard max hand size
        
        if (playerHand.length >= maxHandSize) {
            this.battleManager.addCombatLog(
                `🎴 ${renCreature.name}'s hand is full, cannot draw!`,
                attackerSide === 'player' ? 'info' : 'info'
            );
            return;
        }
        
        // Count total SoulShardRen copies
        const alliedHeroes = attackerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        let totalRenCopies = 0;
        ['left', 'center', 'right'].forEach(pos => {
            const hero = alliedHeroes[pos];
            if (hero && hero.creatures) {
                totalRenCopies += hero.creatures.filter(c => c.name === 'SoulShardRen' && c.alive).length;
            }
        });
        
        // Calculate draw chance: 25% base + 10% per additional Ren
        const baseChance = 25;
        const bonusChance = (totalRenCopies - 1) * 10; // -1 because we don't count this one as "additional"
        const totalChance = baseChance + bonusChance;
        
        // Roll for card draw
        const roll = this.battleManager.getRandomInt(1, 100);
        const success = roll <= totalChance;
        
        this.battleManager.addCombatLog(
            `🎴 ${renCreature.name} attempts to draw a card! (${totalChance}% chance, rolled ${roll})`,
            attackerSide === 'player' ? 'info' : 'info'
        );
        
        if (success) {
            // Send card draw to guest before applying
            this.sendCardDrawUpdate(renActor, position, 1, totalRenCopies, roll, totalChance);
            await this.battleManager.delay(50);
            
            // Draw 1 card
            await this.drawCardsForPlayer(renActor, position, 1, totalRenCopies, roll, totalChance);
            
            // Sync the hand state with opponent
            if (this.battleManager.isAuthoritative) {
                const absoluteSide = renActor.hero.absoluteSide;
                const currentHand = attackerSide === 'player' ? 
                    this.battleManager.playerHand : this.battleManager.opponentHand;
                
                this.battleManager.sendBattleUpdate('hand_update', {
                    absoluteSide: absoluteSide,
                    hand: currentHand
                });
            }
        } else {
            this.battleManager.addCombatLog(
                `❌ ${renCreature.name} fails to draw!`,
                attackerSide === 'player' ? 'warning' : 'info'
            );
        }
    }

    // Draw cards for the player with animation
    async drawCardsForPlayer(renActor, position, cardsToDraw, totalRenCopies, roll, totalChance) {
        const attackerSide = renActor.hero.side;
        
        // Show card draw animations
        for (let i = 0; i < cardsToDraw; i++) {
            await this.showCardDrawAnimation(renActor, position);
            await this.battleManager.delay(200);
        }
        
        // ACTUALLY DRAW THE CARDS - this was missing!
        const heroSelection = window.heroSelection;
        if (heroSelection && heroSelection.handManager) {
            // Draw cards to the correct player's hand
            const isMyEffect = (attackerSide === 'player' && this.battleManager.isHost) || 
                            (attackerSide === 'opponent' && !this.battleManager.isHost);
            
            if (isMyEffect) {
                heroSelection.handManager.drawCards(cardsToDraw);
                
                // Update hand display
                if (heroSelection.updateHandDisplay) {
                    heroSelection.updateHandDisplay();
                }
            }
        }
        
        this.battleManager.addCombatLog(
            `✅ ${renActor.data.name} draws ${cardsToDraw} card${cardsToDraw > 1 ? 's' : ''}!`,
            attackerSide === 'player' ? 'success' : 'info'
        );
    }

    // Show card draw animation (reuses RoyalCorgi pattern)
    async showCardDrawAnimation(renActor, position) {
        const attackerSide = renActor.hero.side;
        const renElement = this.getRenElement(attackerSide, position, renActor.index);
        
        if (!renElement) return;

        const rect = renElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const cardAnimation = document.createElement('div');
        cardAnimation.className = 'ren-card-draw-animation';
        cardAnimation.innerHTML = '🃏';
        cardAnimation.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            font-size: 32px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: renCardDraw ${this.battleManager.getSpeedAdjustedDelay(this.CARD_DRAW_ANIMATION_TIME)}ms ease-out forwards;
        `;

        document.body.appendChild(cardAnimation);

        setTimeout(() => {
            if (cardAnimation.parentNode) {
                cardAnimation.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(this.CARD_DRAW_ANIMATION_TIME));

        await this.battleManager.delay(this.CARD_DRAW_ANIMATION_TIME / 2);
    }

    // Get the DOM element for Soul Shard Ren creature
    getRenElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Send card draw update to guest
    sendCardDrawUpdate(renActor, position, cardsToDraw, totalRenCopies, roll, totalChance) {
        this.battleManager.sendBattleUpdate('soul_shard_ren_card_draw', {
            renData: {
                side: renActor.hero.side,
                position: position,
                creatureIndex: renActor.index,
                name: renActor.data.name,
                absoluteSide: renActor.hero.absoluteSide
            },
            cardsToDraw: cardsToDraw,
            totalRenCopies: totalRenCopies,
            roll: roll,
            totalChance: totalChance
        });
    }

    // Handle card draw on guest side
    async handleGuestCardDraw(data) {
        const { renData, cardsToDraw, totalRenCopies, roll, totalChance } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const renLocalSide = (renData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🎴 ${renData.name} attempts to draw a card! (${totalChance}% chance, rolled ${roll})`,
            renLocalSide === 'player' ? 'info' : 'info'
        );
        
        // Show animations
        const renActor = { data: { name: renData.name }, hero: { side: renLocalSide }, index: renData.creatureIndex };
        for (let i = 0; i < cardsToDraw; i++) {
            await this.showCardDrawAnimation(renActor, renData.position);
            await this.battleManager.delay(200);
        }
        
        // ACTUALLY DRAW THE CARDS ON GUEST SIDE - this was missing!
        const heroSelection = window.heroSelection;
        if (heroSelection && heroSelection.handManager) {
            // Only draw if this is MY creature (not opponent's)
            const isMyEffect = (renLocalSide === 'player');
            
            if (isMyEffect) {
                heroSelection.handManager.drawCards(cardsToDraw);
                
                // Update hand display
                if (heroSelection.updateHandDisplay) {
                    heroSelection.updateHandDisplay();
                }
            }
        }
        
        this.battleManager.addCombatLog(
            `✅ ${renData.name} draws ${cardsToDraw} card${cardsToDraw > 1 ? 's' : ''}!`,
            renLocalSide === 'player' ? 'success' : 'info'
        );
    }

    // Clean up
    cleanup() {
        console.log('Cleaning up Soul Shard Ren creature effects');
        
        const animations = document.querySelectorAll('.ren-card-draw-animation');
        animations.forEach(anim => {
            if (anim.parentNode) {
                anim.remove();
            }
        });
    }
}

// Battle start effect functions
export async function applyBothPlayersDelayedRedrawEffects(hostEffects, guestEffects, battleManager) {
    console.log('🎴 Processing Soul Shard Ren redraw effects from both players...');
    
    if (hostEffects && hostEffects.length > 0) {
        const hostRedrawEffects = hostEffects.filter(
            effect => effect.type === 'discard_redraw_hand' && effect.source === 'SoulShardRen'
        );
        if (hostRedrawEffects.length > 0) {
            console.log('🎴 Applying HOST Soul Shard Ren hand redraw...');
            await applyHandRedraw(battleManager, hostRedrawEffects, 'host');
        }
    }
    
    if (guestEffects && guestEffects.length > 0) {
        const guestRedrawEffects = guestEffects.filter(
            effect => effect.type === 'discard_redraw_hand' && effect.source === 'SoulShardRen'
        );
        if (guestRedrawEffects.length > 0) {
            console.log('🎴 Applying GUEST Soul Shard Ren hand redraw...');
            await applyHandRedraw(battleManager, guestRedrawEffects, 'guest');
        }
    }
}

async function applyHandRedraw(battleManager, redrawEffects, playerSide) {
    const totalStacks = redrawEffects.reduce((sum, effect) => sum + effect.stacks, 0);
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const logType = playerSide === 'host' ? 'success' : 'info';
    
    const heroSelection = window.heroSelection;
    if (!heroSelection) {
        console.error('No heroSelection available for hand redraw');
        return;
    }
    
    // Process each stack individually with animation
    for (let stackNum = 0; stackNum < totalStacks; stackNum++) {
        createSoulShardRenCardEffect(battleManager, playerSide);
        await battleManager.delay(200);
        
        const playerHeroes = playerSide === 'host' ? 
            battleManager.playerHeroes : battleManager.opponentHeroes;
        
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
        
        const uniqueCount = uniqueSoulShards.size;
        const cardsToDraw = uniqueCount;
        
        if (uniqueCount === 0) {
            battleManager.addCombatLog(
                `Soul Shard Ren stack ${stackNum + 1}/${totalStacks} fails - no SoulShard creatures found!`,
                playerSide === 'host' ? 'warning' : 'info'
            );
            
            if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
                battleManager.sendBattleUpdate('soul_shard_ren_redraw_applied', {
                    playerSide: playerSide,
                    cardsToDraw: 0,
                    totalStacks: totalStacks,
                    uniqueCount: 0,
                    failed: true
                });
            }
            await battleManager.delay(200);
            continue;
        }
        
        const isMyEffect = (playerSide === 'host' && battleManager.isHost) || 
                           (playerSide === 'guest' && !battleManager.isHost);
        
        if (isMyEffect && heroSelection.handManager && heroSelection.graveyardManager) {
            const currentHand = heroSelection.handManager.getHand();
            currentHand.forEach(cardName => {
                heroSelection.graveyardManager.addCard(cardName);
            });
            
            const discardedCount = currentHand.length;
            heroSelection.handManager.clearHand();
            
            battleManager.addCombatLog(
                `Soul Shard Ren stack ${stackNum + 1}/${totalStacks} discards ${discardedCount} cards!`,
                logType
            );
            
            for (let i = 0; i < cardsToDraw; i++) {
                showBattleStartCardAnimation(battleManager, playerSide);
                await battleManager.delay(150);
            }
            
            heroSelection.handManager.drawCards(cardsToDraw);
            
            battleManager.addCombatLog(
                `${playerName} draws ${cardsToDraw} cards! (${uniqueCount} unique SoulShards)`,
                logType
            );
            
            if (heroSelection.updateHandDisplay) {
                heroSelection.updateHandDisplay();
            }
        }
        
        if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
            battleManager.sendBattleUpdate('soul_shard_ren_redraw_applied', {
                playerSide: playerSide,
                cardsToDraw: cardsToDraw,
                totalStacks: totalStacks,
                uniqueCount: uniqueCount,
                uniqueSoulShards: Array.from(uniqueSoulShards),
                failed: false
            });
        }
        
        await battleManager.delay(200);
    }
}

// Show card animation during battle start
function showBattleStartCardAnimation(battleManager, playerSide) {
    const side = playerSide === 'host' ? 'player' : 'opponent';
    const heroElement = battleManager.getHeroElement(side, 'center');
    
    if (!heroElement) return;
    
    const rect = heroElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const cardAnim = document.createElement('div');
    cardAnim.className = 'ren-card-draw-animation';
    cardAnim.innerHTML = '🃏';
    cardAnim.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        font-size: 28px;
        transform: translate(-50%, -50%);
        z-index: 1600;
        pointer-events: none;
        animation: renCardDraw ${battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
    `;
    
    document.body.appendChild(cardAnim);
    
    setTimeout(() => {
        if (cardAnim.parentNode) {
            cardAnim.remove();
        }
    }, battleManager.getSpeedAdjustedDelay(800));
}

// Create card effect at battle start (shows SoulShardRen card image)
function createSoulShardRenCardEffect(battleManager, playerSide) {
    ensureSpellCardEffectCSS(battleManager);
    const side = playerSide === 'host' ? 'player' : 'opponent';
    const heroElement = battleManager.getHeroElement(side, 'center');
    
    if (!heroElement) return;
    
    const cardContainer = document.createElement('div');
    cardContainer.className = 'spell-card-container';
    const cardDisplay = document.createElement('div');
    cardDisplay.className = 'spell-card-display';
    const cardImagePath = `./Cards/All/SoulShardRen.png`;
    cardDisplay.innerHTML = `
        <img src="${cardImagePath}" alt="Soul Shard Ren" class="spell-card-image" 
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
    heroElement.appendChild(cardContainer);
    
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

// Handle guest receiving redraw effect
export function handleGuestSoulShardRenRedraw(data, battleManager) {
    if (battleManager.isAuthoritative) return;
    
    const { playerSide, cardsToDraw, totalStacks, uniqueCount, uniqueSoulShards, failed } = data;
    
    // Show card animation for each stack
    for (let i = 0; i < totalStacks; i++) {
        createSoulShardRenCardEffect(battleManager, playerSide);
    }
    
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const isMyEffect = (playerSide === myAbsoluteSide);
    const logType = isMyEffect ? 'success' : 'info';
    
    if (failed) {
        battleManager.addCombatLog(
            `⚠️ ${playerName}'s Soul Shard Ren fails - no SoulShard creatures found!`,
            isMyEffect ? 'warning' : 'info'
        );
        return;
    }
    
    // If this is my effect, actually manipulate the hand
    if (isMyEffect && window.heroSelection) {
        const heroSelection = window.heroSelection;
        
        if (heroSelection.handManager && heroSelection.graveyardManager) {
            const currentHand = heroSelection.handManager.getHand();
            currentHand.forEach(cardName => {
                heroSelection.graveyardManager.addCard(cardName);
            });
            
            const discardedCount = currentHand.length;
            heroSelection.handManager.clearHand();
            
            battleManager.addCombatLog(
                `🎴 Soul Shard Ren ${totalStacks > 1 ? `(x${totalStacks})` : ''} discards ${discardedCount} cards!`,
                logType
            );
            
            // Draw new cards
            heroSelection.handManager.drawCards(cardsToDraw);
            
            // Update hand display
            if (heroSelection.updateHandDisplay) {
                heroSelection.updateHandDisplay();
            }
        }
    }
    
    battleManager.addCombatLog(
        `📚 ${playerName} draws ${cardsToDraw} cards! (${uniqueCount} unique SoulShards ${totalStacks > 1 ? `x ${totalStacks} stacks` : ''})`,
        logType
    );
}

// CSS styles
if (typeof document !== 'undefined' && !document.getElementById('soulShardRenStyles')) {
    const style = document.createElement('style');
    style.id = 'soulShardRenStyles';
    style.textContent = `
        @keyframes soulShardRenDisenchant {
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
        @keyframes renCardDraw {
            0% { 
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
            }
            25% { 
                opacity: 1;
                transform: translate(-50%, -70%) scale(1.3) rotate(90deg);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -90%) scale(1.5) rotate(180deg);
            }
            75% {
                opacity: 0.8;
                transform: translate(-50%, -110%) scale(1.2) rotate(270deg);
            }
            100% { 
                opacity: 0;
                transform: translate(-50%, -130%) scale(0.8) rotate(360deg);
            }
        }
        .soul-shard-ren-disenchant .disenchant-content {
            background: linear-gradient(135deg, rgba(255, 100, 100, 0.95) 0%, rgba(200, 50, 50, 0.95) 100%);
            border: 3px solid rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .soul-shard-ren-disenchant .shard-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .soul-shard-ren-disenchant .effect-text {
            color: white;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .soul-shard-ren-disenchant .redraw-preview {
            color: #ffcccc;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

export default SoulShardRenCreature;