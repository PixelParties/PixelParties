// ./Creatures/soulShardKhet.js - SoulShard Khet Creature Implementation
// Summons temporary copies of unique SoulShard creatures from graveyard

export class SoulShardKhetCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        console.log('💻 Soul Shard Khet Creature module initialized');
    }

    // Check if a creature is Soul Shard Khet
    static isSoulShardKhet(creatureName) {
        return creatureName === 'SoulShardKhet';
    }

    // Static method for handling disenchant (called from handManager)
    static handleDisenchant(heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Register delayed graveyard summon effect for next battle
        SoulShardKhetCreature.registerDelayedGraveyardSummon(heroSelection);
        
        // Show visual feedback
        SoulShardKhetCreature.showDisenchantAnimation();
        
        console.log('✨ Soul Shard Khet disenchanted! Graveyard summon registered for next battle.');
    }

    // Register the delayed graveyard summon effect for next battle
    static registerDelayedGraveyardSummon(heroSelection) {
        // Initialize delayedEffects array if it doesn't exist
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        // Find existing SoulShardKhet effect to accumulate stacks
        let existingEffect = heroSelection.delayedEffects.find(
            effect => effect.source === 'SoulShardKhet' && effect.type === 'summon_graveyard_soulshards'
        );
        
        if (existingEffect) {
            // Increment stacks for multiple disenchants
            existingEffect.stacks += 1;
            existingEffect.appliedAt = Date.now();
            console.log(`💻 Increased Soul Shard Khet stacks to ${existingEffect.stacks}`);
        } else {
            // Add new effect if none exists
            heroSelection.delayedEffects.push({
                type: 'summon_graveyard_soulshards',
                stacks: 1,
                source: 'SoulShardKhet',
                appliedAt: Date.now(),
                description: 'Summon temporary copies of unique SoulShard creatures from graveyard at battle start'
            });
            console.log('💻 Added new Soul Shard Khet graveyard summon effect with 1 stack');
        }
    }

    // Show disenchant animation
    static showDisenchantAnimation() {
        const effectBurst = document.createElement('div');
        effectBurst.className = 'soul-shard-disenchant';
        effectBurst.innerHTML = `
            <div class="disenchant-content-khet">
                <div class="shard-icon">💻</div>
                <div class="effect-text">Soul Shard Khet Activated!</div>
                <div class="summon-preview">
                    <span class="summon-icon">💀</span>
                    <span>Graveyard summons next battle</span>
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

    async executeSpecialAttack(khetActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const khetCreature = khetActor.data;
        const khetHero = khetActor.hero;
        const actorSide = khetHero.side;
        
        // Safety check: ensure Soul Shard Khet is still alive
        if (!khetCreature.alive || khetCreature.currentHp <= 0) {
            console.log(`Soul Shard Khet is dead, cannot execute special attack`);
            return;
        }
        
        // Get graveyard
        const graveyard = actorSide === 'player' ? 
            this.battleManager.playerGraveyard : 
            this.battleManager.opponentGraveyard;
        
        if (!graveyard || graveyard.length === 0) {
            this.battleManager.addCombatLog(
                `💻 ${khetCreature.name} searches the graveyard but finds no souls to summon!`, 
                actorSide === 'player' ? 'info' : 'info'
            );
            return;
        }
        
        // Find all SoulShard creatures in graveyard (excluding SoulShardKhet itself)
        const soulShardCreatures = graveyard.filter(cardName => 
            cardName && cardName.startsWith('SoulShard') && cardName !== 'SoulShardKhet' && cardName !== 'Soul Shard Khet'
        );
        
        if (soulShardCreatures.length === 0) {
            this.battleManager.addCombatLog(
                `💻 ${khetCreature.name} finds no valid SoulShard souls in the graveyard!`, 
                actorSide === 'player' ? 'info' : 'info'
            );
            return;
        }
        
        // Randomly select one SoulShard creature
        const randomIndex = this.battleManager.getRandomInt(0, soulShardCreatures.length - 1);
        const selectedShard = soulShardCreatures[randomIndex];
        
        this.battleManager.addCombatLog(
            `💻 ${khetCreature.name} channels necromantic energy!`, 
            actorSide === 'player' ? 'success' : 'info'
        );
        
        // Send synchronization data to guest BEFORE summoning
        this.sendGraveyardSummonUpdate(khetActor, position, selectedShard);
        
        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);
        
        // Summon the creature
        await this.summonCreatureFromGraveyard(khetHero, actorSide, position, selectedShard);
    }

    // Summon a creature from graveyard to the hero
    async summonCreatureFromGraveyard(hero, side, position, creatureName) {
        const { getCardInfo } = await import('../cardDatabase.js');
        const creatureInfo = getCardInfo(creatureName);
        
        if (!creatureInfo) {
            console.error(`Could not find creature info for ${creatureName}`);
            return;
        }
        
        // Create creature with health
        const creature = {
            name: creatureName,
            image: `./Creatures/${creatureName}.png`,
            currentHp: creatureInfo.hp || 10,
            maxHp: creatureInfo.hp || 10,
            atk: creatureInfo.atk || 0,
            alive: true,
            type: 'creature',
            addedAt: Date.now(),
            statusEffects: [],
            temporaryModifiers: {},
            counters: 0
        };
        
        // Add creature to hero
        hero.creatures.push(creature);
        
        // Re-render creatures FIRST to create DOM element
        if (this.battleManager.battleScreen && this.battleManager.battleScreen.renderCreaturesAfterInit) {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
        }
        
        // Update necromancy displays
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.initializeNecromancyStackDisplays();
        }
        
        // Small delay to ensure DOM update completes
        await this.battleManager.delay(50);
        
        // THEN play summoning animation (DOM element now exists)
        await this.playSummoningAnimation(hero, side, position);
        
        this.battleManager.addCombatLog(
            `💀 ${creatureName} rises from the graveyard!`,
            side === 'player' ? 'success' : 'info'
        );
    }

    // Play summoning animation (similar to BoulderInABottle)
    async playSummoningAnimation(hero, side, position) {
        // Inject CSS if needed
        this.injectSummoningAnimationCSS();
        
        // Small delay to ensure creature is rendered
        await this.battleManager.delay(50);
        
        // Find the newly summoned creature element (last in array)
        const creatureIndex = hero.creatures.length - 1;
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) {
            console.warn(`Could not find creature element for summoning effect`);
            return;
        }

        // Create summoning circle overlay
        const summoningEffect = document.createElement('div');
        summoningEffect.className = 'khet-summoning-effect';
        summoningEffect.innerHTML = `
            <div class="summoning-circle"></div>
            <div class="summoning-particles">
                ${Array.from({length: 6}, (_, i) => 
                    `<div class="summon-particle particle-${i + 1}"></div>`
                ).join('')}
            </div>
        `;
        
        // Position it over the creature
        creatureElement.style.position = 'relative';
        creatureElement.appendChild(summoningEffect);
        
        // Remove effect after animation completes
        setTimeout(() => {
            if (summoningEffect.parentNode) {
                summoningEffect.parentNode.removeChild(summoningEffect);
            }
        }, 800);
        
        await this.battleManager.delay(800);
    }

    // Inject CSS for summoning animations
    injectSummoningAnimationCSS() {
        if (document.getElementById('khetSummoningStyles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'khetSummoningStyles';
        style.textContent = `
            .khet-summoning-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }

            .summoning-circle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 40px;
                height: 40px;
                border: 2px solid rgba(138, 43, 226, 0.8);
                border-radius: 50%;
                box-shadow: 
                    0 0 10px rgba(138, 43, 226, 0.6),
                    inset 0 0 8px rgba(138, 43, 226, 0.3);
                animation: summonCircleAppear 0.8s ease-out;
            }

            .summoning-particles {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .summon-particle {
                position: absolute;
                width: 3px;
                height: 3px;
                background: #8A2BE2;
                border-radius: 50%;
                box-shadow: 0 0 4px rgba(138, 43, 226, 0.8);
                animation: summonParticle 0.8s ease-out;
            }

            @keyframes summonCircleAppear {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                }
            }

            @keyframes summonParticle {
                0% {
                    transform: scale(0) translateY(10px);
                    opacity: 0;
                }
                30% {
                    transform: scale(1.5) translateY(0);
                    opacity: 1;
                }
                70% {
                    transform: scale(1) translateY(-5px);
                    opacity: 1;
                }
                100% {
                    transform: scale(0) translateY(-15px);
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Send graveyard summon data to guest for synchronization
    sendGraveyardSummonUpdate(khetActor, position, summonedCreature) {
        this.battleManager.sendBattleUpdate('soul_shard_khet_graveyard_summon', {
            khetData: {
                side: khetActor.hero.side,
                position: position,
                creatureIndex: khetActor.index,
                name: khetActor.data.name,
                absoluteSide: khetActor.hero.absoluteSide
            },
            summonedCreature: summonedCreature
        });
    }

    // Handle Soul Shard Khet graveyard summon on guest side
    async handleGuestGraveyardSummon(data) {
        const { khetData, summonedCreature } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const khetLocalSide = (khetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💻 ${khetData.name} channels necromantic energy!`,
            khetLocalSide === 'player' ? 'success' : 'info'
        );
        
        // Find the hero
        const heroes = khetLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[khetData.position];
        
        if (hero) {
            // Summon the creature
            await this.summonCreatureFromGraveyard(hero, khetLocalSide, khetData.position, summonedCreature);
        }
    }

    // Clean up
    cleanup() {
        console.log('Cleaning up Soul Shard Khet creature effects');
    }
}

// Battle start effect functions (called from battleStartManager.js)
export async function applyBothPlayersDelayedGraveyardSummons(hostEffects, guestEffects, battleManager) {
    console.log('💻 Processing Soul Shard Khet graveyard summons from both players...');
    
    if (hostEffects && hostEffects.length > 0) {
        const hostGraveyardEffects = hostEffects.filter(
            effect => effect.type === 'summon_graveyard_soulshards' && effect.source === 'SoulShardKhet'
        );
        if (hostGraveyardEffects.length > 0) {
            console.log('💻 Applying HOST Soul Shard Khet graveyard summons...');
            await applyGraveyardSummons(battleManager, hostGraveyardEffects, 'host');
        }
    }
    
    if (guestEffects && guestEffects.length > 0) {
        const guestGraveyardEffects = guestEffects.filter(
            effect => effect.type === 'summon_graveyard_soulshards' && effect.source === 'SoulShardKhet'
        );
        if (guestGraveyardEffects.length > 0) {
            console.log('💻 Applying GUEST Soul Shard Khet graveyard summons...');
            await applyGraveyardSummons(battleManager, guestGraveyardEffects, 'guest');
        }
    }
}

async function applyGraveyardSummons(battleManager, effects, playerSide) {
    // Show card effect animation
    createSoulShardCardEffect(battleManager, playerSide);
    await battleManager.delay(300);
    
    const playerHeroes = playerSide === 'host' ? 
        battleManager.playerHeroes : battleManager.opponentHeroes;
    
    // Count unique SoulShard types already controlled on battlefield
    const controlledSoulShards = new Set();
    ['left', 'center', 'right'].forEach(position => {
        const hero = playerHeroes[position];
        if (hero && hero.creatures && hero.creatures.length > 0) {
            hero.creatures.forEach(creature => {
                if (creature.alive && creature.name && creature.name.startsWith('SoulShard')) {
                    controlledSoulShards.add(creature.name);
                }
            });
        }
    });
    
    const numControlledTypes = controlledSoulShards.size;
    
    // If player controls no SoulShards, effect fizzles
    if (numControlledTypes === 0) {
        const playerName = playerSide === 'host' ? 'Host' : 'Guest';
        const logType = playerSide === 'host' ? 'warning' : 'info';
        battleManager.addCombatLog(
            `${playerName}'s Soul Shard Khet fizzles - no SoulShard creatures controlled!`,
            logType
        );
        return;
    }
    
    // Get graveyard
    const graveyard = playerSide === 'host' ?
        battleManager.playerGraveyard : battleManager.opponentGraveyard;
    
    if (!graveyard || graveyard.length === 0) {
        const playerName = playerSide === 'host' ? 'Host' : 'Guest';
        const logType = playerSide === 'host' ? 'warning' : 'info';
        battleManager.addCombatLog(
            `${playerName}'s Soul Shard Khet finds an empty graveyard!`,
            logType
        );
        return;
    }
    
    // Find unique SoulShard creatures in graveyard
    const graveyardSoulShards = [...new Set(graveyard.filter(cardName => 
        cardName && cardName.startsWith('SoulShard') && cardName !== 'SoulShardKhet'
    ))];
    
    if (graveyardSoulShards.length === 0) {
        const playerName = playerSide === 'host' ? 'Host' : 'Guest';
        const logType = playerSide === 'host' ? 'warning' : 'info';
        battleManager.addCombatLog(
            `${playerName}'s Soul Shard Khet finds no SoulShard souls!`,
            logType
        );
        return;
    }
    
    // Cap summons at the number of controlled types
    const maxSummonableTypes = Math.min(numControlledTypes, graveyardSoulShards.length);
    const shardsToSummon = graveyardSoulShards.slice(0, maxSummonableTypes);
    
    const totalStacks = effects.reduce((sum, effect) => sum + effect.stacks, 0);
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const logType = playerSide === 'host' ? 'success' : 'info';
    
    // Get living heroes
    const livingHeroes = ['left', 'center', 'right'].filter(pos => 
        playerHeroes[pos] && playerHeroes[pos].alive
    );
    
    if (livingHeroes.length === 0) {
        battleManager.addCombatLog(
            `${playerName}'s Soul Shard Khet has no living heroes to summon to!`,
            logType
        );
        return;
    }
    
    // Summon each capped SoulShard creature (multiplied by stacks) ONE AT A TIME
    let totalSummoned = 0;
    for (let stack = 0; stack < totalStacks; stack++) {
        for (const shardName of shardsToSummon) {
            // Randomly select a living hero
            const randomPos = livingHeroes[battleManager.getRandomInt(0, livingHeroes.length - 1)];
            const hero = playerHeroes[randomPos];
            
            // Create and add the creature (WITHOUT animation)
            await createTemporaryCreature(battleManager, hero, playerSide, randomPos, shardName);
            totalSummoned++;
            
            // Re-render creatures to make the new creature element exist in the DOM
            if (battleManager.battleScreen && battleManager.battleScreen.renderCreaturesAfterInit) {
                battleManager.battleScreen.renderCreaturesAfterInit();
            }
            
            // Update necromancy displays after each summon
            if (battleManager.necromancyManager) {
                battleManager.necromancyManager.initializeNecromancyStackDisplays();
            }
            
            // Small delay to ensure DOM update completes
            await battleManager.delay(50);
            
            // NOW play the summoning animation (after creature element exists)
            await playSummoningAnimationForCreature(battleManager, hero, playerSide, randomPos);
            
            // Delay between summons
            await battleManager.delay(100);
        }
    }
    
    let message = `${playerName}'s Soul Shard Khet ${totalStacks > 1 ? `(x${totalStacks})` : ''} summons ${totalSummoned} SoulShard soul(s) from the graveyard!`;
    if (maxSummonableTypes < graveyardSoulShards.length) {
        message += ` (capped by ${numControlledTypes} controlled type${numControlledTypes > 1 ? 's' : ''})`;
    }
    battleManager.addCombatLog(message, logType);
    
    // Send sync to guest
    if (battleManager.isAuthoritative) {
        battleManager.sendBattleUpdate('soul_shard_khet_battle_start_summons', {
            playerSide: playerSide,
            totalSummoned: totalSummoned,
            totalStacks: totalStacks,
            numControlledTypes: numControlledTypes
        });
    }
    
    await battleManager.delay(300);
}

async function createTemporaryCreature(battleManager, hero, side, position, creatureName) {
    const { getCardInfo } = await import('../cardDatabase.js');
    const creatureInfo = getCardInfo(creatureName);
    
    if (!creatureInfo) {
        console.error(`Could not find creature info for ${creatureName}`);
        return;
    }
    
    // Create temporary creature
    const creature = {
        name: creatureName,
        image: `./Creatures/${creatureName}.png`,
        currentHp: creatureInfo.hp || 10,
        maxHp: creatureInfo.hp || 10,
        atk: creatureInfo.atk || 0,
        alive: true,
        type: 'creature',
        addedAt: Date.now(),
        statusEffects: [],
        temporaryModifiers: {},
        counters: 0,
        isTemporarySummon: true
    };
    
    // Add to hero
    hero.creatures.push(creature);
}

async function playSummoningAnimationForCreature(battleManager, hero, side, position) {
    // Determine local side for animation based on current client perspective
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const localSide = (side === myAbsoluteSide) ? 'player' : 'opponent';
    
    // Create instance of SoulShardKhetCreature to use its animation method
    const khetCreature = new SoulShardKhetCreature(battleManager);
    
    // Play summoning animation (creature element should now exist)
    await khetCreature.playSummoningAnimation(hero, localSide, position);
}

async function summonTemporaryCreature(battleManager, hero, side, position, creatureName) {
    const { getCardInfo } = await import('../cardDatabase.js');
    const creatureInfo = getCardInfo(creatureName);
    
    if (!creatureInfo) {
        console.error(`Could not find creature info for ${creatureName}`);
        return;
    }
    
    // Create temporary creature
    const creature = {
        name: creatureName,
        image: `./Creatures/${creatureName}.png`,
        currentHp: creatureInfo.hp || 10,
        maxHp: creatureInfo.hp || 10,
        atk: creatureInfo.atk || 0,
        alive: true,
        type: 'creature',
        addedAt: Date.now(),
        statusEffects: [],
        temporaryModifiers: {},
        counters: 0,
        isTemporarySummon: true
    };
    
    // Add to hero
    hero.creatures.push(creature);
    
    // Determine local side for animation based on current client perspective
    // side parameter is 'host' or 'guest' (absolute sides)
    // We need to convert to 'player' or 'opponent' (relative to current client)
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const localSide = (side === myAbsoluteSide) ? 'player' : 'opponent';
    
    // Create instance of SoulShardKhetCreature to use its animation method
    const khetCreature = new SoulShardKhetCreature(battleManager);
    
    // Play summoning animation (same as action effect)
    await khetCreature.playSummoningAnimation(hero, localSide, position);
}

// Use shared function name to match other SoulShards
function createSoulShardCardEffect(battleManager, playerSide) {
    // Use the same CSS injection as battleSpellSystem
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
        createCardAnimationOnElement(tempElement, battleManager, 'SoulShardKhet');
        setTimeout(() => tempElement.remove(), 2500);
        return;
    }
    createCardAnimationOnElement(heroElement, battleManager, 'SoulShardKhet');
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

// Use shared function name and signature to match other SoulShards
function createCardAnimationOnElement(element, battleManager, cardName = 'SoulShardKhet') {
    const cardContainer = document.createElement('div');
    cardContainer.className = 'spell-card-container';  // Use same class as battleSpellSystem
    const cardDisplay = document.createElement('div');
    cardDisplay.className = 'spell-card-display';      // Use same class as battleSpellSystem
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

// Use shared CSS ID to match other SoulShards
function ensureSoulShardCardEffectCSS(battleManager) {
    if (document.getElementById('soulShardCardEffectCSS')) return;
    const style = document.createElement('style');
    style.id = 'soulShardCardEffectCSS';
    style.textContent = `
        @keyframes soulShardCardEffect {
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
    `;
    document.head.appendChild(style);
}

export function handleGuestSoulShardKhetBattleStart(data, battleManager) {
    if (battleManager.isAuthoritative) return;
    
    const { playerSide, totalSummoned, totalStacks } = data;
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const isMyEffect = (battleManager.isHost && playerSide === 'host') || 
                       (!battleManager.isHost && playerSide === 'guest');
    const logType = isMyEffect ? 'success' : 'info';
    
    createSoulShardCardEffect(battleManager, playerSide);
    
    battleManager.addCombatLog(
        `💻 ${playerName}'s Soul Shard Khet ${totalStacks > 1 ? `(x${totalStacks})` : ''} summons ${totalSummoned} SoulShard soul(s) from the graveyard!`,
        logType
    );
}

// CSS styles
if (typeof document !== 'undefined' && !document.getElementById('soulShardKhetStyles')) {
    const style = document.createElement('style');
    style.id = 'soulShardKhetStyles';
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
        
        .disenchant-content-khet {
            background: linear-gradient(135deg, rgba(138, 43, 226, 0.95) 0%, rgba(75, 0, 130, 0.95) 100%);
            border: 3px solid rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        .summon-preview {
            color: #E6E6FA;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

export default SoulShardKhetCreature;