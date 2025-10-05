// ./Creatures/soulShardSah.js - Soul Shard Sah with effect multiplication and mimicry

export class SoulShardSahCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        // List of all other SoulShard types that can be mimicked
        this.MIMIC_TARGETS = [
            'SoulShardIb',
            'SoulShardKa',
            'SoulShardKhet',
            'SoulShardBa',
            'SoulShardRen',
            'SoulShardSekhem',
            'SoulShardShut'
        ];
        
        console.log('🎭 Soul Shard Sah Creature module initialized');
    }

    // Check if a creature is Soul Shard Sah
    static isSoulShardSah(creatureName) {
        return creatureName === 'SoulShardSah';
    }

    // Static method for handling disenchant (called from handManager)
    static handleDisenchant(heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Register delayed multiplication effect for next battle
        SoulShardSahCreature.registerDelayedMultiplicationEffect(heroSelection);
        
        // Show visual feedback
        SoulShardSahCreature.showDisenchantAnimation();
        
        console.log('✨ Soul Shard Sah disenchanted! Multiplication effect registered for next battle.');
    }

    // Register the delayed multiplication effect for next battle
    static registerDelayedMultiplicationEffect(heroSelection) {
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        // Find existing SoulShardSah effect to accumulate stacks
        let existingEffect = heroSelection.delayedEffects.find(
            effect => effect.source === 'SoulShardSah' && effect.type === 'multiply_soulshard_effects'
        );
        
        if (existingEffect) {
            existingEffect.stacks += 1;
            existingEffect.appliedAt = Date.now();
            console.log(`🎭 Increased Soul Shard Sah stacks to ${existingEffect.stacks}`);
        } else {
            heroSelection.delayedEffects.push({
                type: 'multiply_soulshard_effects',
                stacks: 1,
                source: 'SoulShardSah',
                appliedAt: Date.now(),
                description: 'Multiply all other SoulShard delayed effects',
                priority: 0 // Highest priority - processes first
            });
            console.log('🎭 Added new Soul Shard Sah effect with 1 stack');
        }
    }

    // Show disenchant animation
    static showDisenchantAnimation() {
        const effectBurst = document.createElement('div');
        effectBurst.className = 'soul-shard-sah-disenchant';
        effectBurst.innerHTML = `
            <div class="disenchant-content">
                <div class="shard-icon">🎭</div>
                <div class="effect-text">Soul Shard Activated!</div>
                <div class="multiply-preview">
                    <span class="multiply-icon">✖️</span>
                    <span>Effect multiplication next battle</span>
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
            animation: soulShardSahDisenchant 2s ease-out forwards;
        `;
        
        document.body.appendChild(effectBurst);
        
        setTimeout(() => {
            if (effectBurst.parentNode) {
                effectBurst.remove();
            }
        }, 2000);
    }

    // Execute Soul Shard Sah special attack (mimic another SoulShard's effect)
    async executeSpecialAttack(sahActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const sahCreature = sahActor.data;
        const sahHero = sahActor.hero;
        const attackerSide = sahHero.side;
        
        if (!sahCreature.alive || sahCreature.currentHp <= 0) {
            console.log(`Soul Shard Sah is dead, cannot execute special attack`);
            return;
        }
        
        // Randomly select a SoulShard type to mimic
        const targetType = this.MIMIC_TARGETS[
            this.battleManager.getRandomInt(0, this.MIMIC_TARGETS.length - 1)
        ];
        
        this.battleManager.addCombatLog(
            `🎭 ${sahCreature.name} transforms to mimic ${targetType}!`,
            attackerSide === 'player' ? 'success' : 'info'
        );
        
        // Temporarily change name for the mimicked effect
        const originalName = sahCreature.name;
        sahCreature.name = targetType;
        
        // Send mimic update to guest
        this.sendMimicUpdate(sahActor, position, targetType);
        
        await this.battleManager.delay(50);
        
        // Execute the mimicked SoulShard's effect
        await this.executeMimickedEffect(sahActor, position, targetType);
        
        // Revert name back
        sahCreature.name = originalName;
        
        // Send name revert to guest
        this.sendNameRevert(sahActor, position);
    }

    // Execute the mimicked SoulShard's special effect
    async executeMimickedEffect(sahActor, position, targetType) {
        const bm = this.battleManager;
        
        try {
            switch (targetType) {
                case 'SoulShardIb':
                    if (!bm.soulShardIbManager) {
                        const { default: SoulShardIbCreature } = await import('./soulShardIb.js');
                        bm.soulShardIbManager = new SoulShardIbCreature(bm);
                    }
                    await bm.soulShardIbManager.executeSpecialAttack(sahActor, position);
                    break;
                    
                case 'SoulShardKa':
                    if (!bm.soulShardKaManager) {
                        const { default: SoulShardKaCreature } = await import('./soulShardKa.js');
                        bm.soulShardKaManager = new SoulShardKaCreature(bm);
                    }
                    await bm.soulShardKaManager.executeSpecialAttack(sahActor, position);
                    break;
                    
                case 'SoulShardKhet':
                    if (!bm.soulShardKhetManager) {
                        const { default: SoulShardKhetCreature } = await import('./soulShardKhet.js');
                        bm.soulShardKhetManager = new SoulShardKhetCreature(bm);
                    }
                    await bm.soulShardKhetManager.executeSpecialAttack(sahActor, position);
                    break;
                    
                case 'SoulShardBa':
                    if (!bm.soulShardBaManager) {
                        const { default: SoulShardBaCreature } = await import('./soulShardBa.js');
                        bm.soulShardBaManager = new SoulShardBaCreature(bm);
                    }
                    await bm.soulShardBaManager.executeSpecialAttack(sahActor, position);
                    break;
                    
                case 'SoulShardRen':
                    if (!bm.soulShardRenManager) {
                        const { default: SoulShardRenCreature } = await import('./soulShardRen.js');
                        bm.soulShardRenManager = new SoulShardRenCreature(bm);
                    }
                    await bm.soulShardRenManager.executeSpecialAttack(sahActor, position);
                    break;
                    
                case 'SoulShardSekhem':
                    if (!bm.soulShardSekhemManager) {
                        const { default: SoulShardSekhemCreature } = await import('./soulShardSekhem.js');
                        bm.soulShardSekhemManager = new SoulShardSekhemCreature(bm);
                    }
                    await bm.soulShardSekhemManager.executeSpecialAttack(sahActor, position);
                    break;
                    
                case 'SoulShardShut':
                    if (!bm.soulShardShutManager) {
                        const { default: SoulShardShutCreature } = await import('./soulShardShut.js');
                        bm.soulShardShutManager = new SoulShardShutCreature(bm);
                    }
                    await bm.soulShardShutManager.executeSpecialAttack(sahActor, position);
                    break;
            }
        } catch (error) {
            console.error(`Error executing mimicked effect for ${targetType}:`, error);
        }
    }

    // Send mimic update to guest
    sendMimicUpdate(sahActor, position, targetType) {
        this.battleManager.sendBattleUpdate('soul_shard_sah_mimic', {
            sahData: {
                side: sahActor.hero.side,
                position: position,
                creatureIndex: sahActor.index,
                absoluteSide: sahActor.hero.absoluteSide
            },
            targetType: targetType
        });
    }

    // Send name revert to guest
    sendNameRevert(sahActor, position) {
        this.battleManager.sendBattleUpdate('soul_shard_sah_revert', {
            sahData: {
                side: sahActor.hero.side,
                position: position,
                creatureIndex: sahActor.index,
                absoluteSide: sahActor.hero.absoluteSide
            }
        });
    }

    // Handle guest receiving mimic update
    async handleGuestMimic(data) {
        const { sahData, targetType } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const sahLocalSide = (sahData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🎭 Soul Shard Sah transforms to mimic ${targetType}!`,
            sahLocalSide === 'player' ? 'success' : 'info'
        );
        
        // Find the creature and change its name temporarily
        const heroes = sahLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[sahData.position];
        
        if (hero && hero.creatures && hero.creatures[sahData.creatureIndex]) {
            const creature = hero.creatures[sahData.creatureIndex];
            creature.name = targetType;
        }
    }

    // Handle guest receiving name revert
    async handleGuestRevert(data) {
        const { sahData } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const sahLocalSide = (sahData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const heroes = sahLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[sahData.position];
        
        if (hero && hero.creatures && hero.creatures[sahData.creatureIndex]) {
            const creature = hero.creatures[sahData.creatureIndex];
            creature.name = 'SoulShardSah';
        }
    }

    cleanup() {
        console.log('Cleaning up Soul Shard Sah creature effects');
    }
}

// Battle start effect functions - PROCESSES FIRST
export async function applyBothPlayersDelayedMultiplicationEffects(hostEffects, guestEffects, battleManager) {
    console.log('🎭 Processing Soul Shard Sah multiplication effects (PRIORITY)...');
    
    if (hostEffects && hostEffects.length > 0) {
        const hostMultiplyEffects = hostEffects.filter(
            effect => effect.type === 'multiply_soulshard_effects' && effect.source === 'SoulShardSah'
        );
        if (hostMultiplyEffects.length > 0) {
            console.log('🎭 Applying HOST Soul Shard Sah multiplication...');
            await applyMultiplicationEffects(battleManager, hostMultiplyEffects, 'host', hostEffects);
        }
    }
    
    if (guestEffects && guestEffects.length > 0) {
        const guestMultiplyEffects = guestEffects.filter(
            effect => effect.type === 'multiply_soulshard_effects' && effect.source === 'SoulShardSah'
        );
        if (guestMultiplyEffects.length > 0) {
            console.log('🎭 Applying GUEST Soul Shard Sah multiplication...');
            await applyMultiplicationEffects(battleManager, guestMultiplyEffects, 'guest', guestEffects);
        }
    }
}

async function applyMultiplicationEffects(battleManager, multiplyEffects, playerSide, allEffects) {
    createSahCardEffect(battleManager, playerSide);
    await battleManager.delay(300);
    
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const logType = playerSide === 'host' ? 'success' : 'info';
    
    // Process each SoulShardSah stack separately
    for (const sahEffect of multiplyEffects) {
        const stacks = sahEffect.stacks;
        
        // Count OTHER SoulShard effects (excluding SoulShardSah)
        const otherSoulShardEffects = allEffects.filter(effect => 
            effect.source && 
            effect.source.startsWith('SoulShard') && 
            effect.source !== 'SoulShardSah'
        );
        
        if (otherSoulShardEffects.length === 0) {
            battleManager.addCombatLog(
                `🎭 ${playerName}'s Soul Shard Sah finds no other SoulShard effects to multiply!`,
                logType
            );
            continue;
        }
        
        // Create duplicates for each stack
        for (let i = 0; i < stacks; i++) {
            const duplicates = otherSoulShardEffects.map(effect => ({
                ...effect,
                multipliedBy: 'SoulShardSah'
            }));
            
            // Add duplicates to the effects array
            allEffects.push(...duplicates);
            
            battleManager.addCombatLog(
                `✖️ ${playerName}'s Soul Shard Sah multiplies ${otherSoulShardEffects.length} SoulShard effect(s)!`,
                logType
            );
        }
    }
    
    // Sync the modified effects to Firebase if authoritative
    if (battleManager.isAuthoritative) {
        const roomRef = battleManager.roomManager.getRoomRef();
        const effectsKey = playerSide === 'host' ? 'hostdelayedEffects' : 'guestdelayedEffects';
        
        await roomRef.child('gameState').update({
            [effectsKey]: allEffects
        });
    }
}

// Use battleSpellSystem's CSS pattern
function createSahCardEffect(battleManager, playerSide) {
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
        createCardAnimationOnElement(tempElement, battleManager, 'SoulShardSah');
        setTimeout(() => tempElement.remove(), 2500);
        return;
    }
    createCardAnimationOnElement(heroElement, battleManager, 'SoulShardSah');
}

function createCardAnimationOnElement(element, battleManager, cardName = 'SoulShardSah') {
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

// CSS styles
if (typeof document !== 'undefined' && !document.getElementById('soulShardSahStyles')) {
    const style = document.createElement('style');
    style.id = 'soulShardSahStyles';
    style.textContent = `
        @keyframes soulShardSahDisenchant {
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
        
        .soul-shard-sah-disenchant .disenchant-content {
            background: linear-gradient(135deg, rgba(186, 85, 211, 0.95) 0%, rgba(138, 43, 226, 0.95) 100%);
            border: 3px solid rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        .soul-shard-sah-disenchant .shard-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        
        .soul-shard-sah-disenchant .effect-text {
            color: white;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .soul-shard-sah-disenchant .multiply-preview {
            color: #dda0dd;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

export default SoulShardSahCreature;