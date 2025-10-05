// Creatures/soulShardBa.js - SoulShardBa Creature Implementation

import { TeleportationPowderPotion } from '../Potions/teleportationPowder.js';

export class SoulShardBaCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.BASE_CHANCE = 0.5; // 50% base chance
        this.CHANCE_PER_COPY = 0.1; // +10% per additional SoulShardBa
        
        console.log('💎 Soul Shard Ba Creature module initialized');
    }

    // Check if a creature is Soul Shard Ba
    static isSoulShardBa(creatureName) {
        return creatureName === 'SoulShardBa';
    }

    // Static method for handling disenchant (called from handManager)
    static handleDisenchant(heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Register delayed removal effect for next battle
        SoulShardBaCreature.registerDelayedRemovalEffect(heroSelection);
        
        // Show visual feedback
        SoulShardBaCreature.showDisenchantAnimation();
        
        console.log('✨ Soul Shard Ba disenchanted! Removal effect registered for next battle.');
    }

    // Register the delayed removal effect for next battle
    static registerDelayedRemovalEffect(heroSelection) {
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        let existingEffect = heroSelection.delayedEffects.find(
            effect => effect.source === 'SoulShardBa' && effect.type === 'remove_enemy_creatures'
        );
        
        if (existingEffect) {
            existingEffect.stacks += 1;
            existingEffect.appliedAt = Date.now();
            console.log(`🌀 Increased Soul Shard Ba stacks to ${existingEffect.stacks}`);
        } else {
            heroSelection.delayedEffects.push({
                type: 'remove_enemy_creatures',
                stacks: 1,
                source: 'SoulShardBa',
                appliedAt: Date.now(),
                description: 'Remove random enemy creatures based on unique SoulShard count'
            });
            console.log('🌀 Added new Soul Shard Ba effect with 1 stack');
        }
    }

    // Show disenchant animation
    static showDisenchantAnimation() {
        const effectBurst = document.createElement('div');
        effectBurst.className = 'soul-shard-ba-disenchant';
        effectBurst.innerHTML = `
            <div class="disenchant-content">
                <div class="shard-icon">💎</div>
                <div class="effect-text">Soul Shard Ba Activated!</div>
                <div class="removal-preview">
                    <span class="void-icon">🌀</span>
                    <span>Enemy removal next battle</span>
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
            animation: soulShardBaDisenchant 2s ease-out forwards;
        `;
        
        document.body.appendChild(effectBurst);
        
        setTimeout(() => {
            if (effectBurst.parentNode) {
                effectBurst.remove();
            }
        }, 2000);
    }

    // Execute Soul Shard Ba special attack (chance-based creature removal)
    async executeSpecialAttack(soulShardActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const soulShardCreature = soulShardActor.data;
        const soulShardHero = soulShardActor.hero;
        const attackerSide = soulShardHero.side;
        
        if (!soulShardCreature.alive || soulShardCreature.currentHp <= 0) {
            console.log(`Soul Shard Ba is dead, cannot execute special attack`);
            return;
        }
        
        // Count OTHER SoulShardBa copies controlled by this player
        const alliedHeroes = attackerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        let otherBaCopies = 0;
        ['left', 'center', 'right'].forEach(pos => {
            const hero = alliedHeroes[pos];
            if (hero && hero.creatures) {
                hero.creatures.forEach(c => {
                    if (c.name === 'SoulShardBa' && c.alive && c !== soulShardCreature) {
                        otherBaCopies++;
                    }
                });
            }
        });
        
        // Calculate removal chance
        const removalChance = Math.min(1.0, this.BASE_CHANCE + (otherBaCopies * this.CHANCE_PER_COPY));
        const roll = Math.random();
        
        this.battleManager.addCombatLog(
            `💎 ${soulShardCreature.name} channels void energy... (${Math.round(removalChance * 100)}% chance)`,
            attackerSide === 'player' ? 'success' : 'info'
        );
        
        // Check if removal activates
        if (roll >= removalChance) {
            this.battleManager.addCombatLog(
                `🌀 The void energy dissipates harmlessly!`,
                'info'
            );
            return;
        }
        
        // Find random enemy creature
        const enemyHeroes = attackerSide === 'player' ?
            this.battleManager.opponentHeroes : this.battleManager.playerHeroes;
        
        const enemyCreatures = [];
        ['left', 'center', 'right'].forEach(pos => {
            const hero = enemyHeroes[pos];
            if (hero && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        enemyCreatures.push({
                            creature: creature,
                            hero: hero,
                            creatureIndex: index,
                            heroPosition: pos,
                            heroSide: hero.side
                        });
                    }
                });
            }
        });
        
        if (enemyCreatures.length === 0) {
            this.battleManager.addCombatLog(
                `🌀 ${soulShardCreature.name}'s void energy finds no targets!`,
                'info'
            );
            return;
        }
        
        // Select random enemy creature
        const randomIndex = this.battleManager.getRandomInt(0, enemyCreatures.length - 1);
        const targetInfo = enemyCreatures[randomIndex];
        
        this.battleManager.addCombatLog(
            `🌀 ${soulShardCreature.name} tears ${targetInfo.creature.name} into the void!`,
            attackerSide === 'player' ? 'success' : 'info'
        );
        
        // Send network update BEFORE removal
        this.sendCreatureRemovalUpdate(soulShardActor, targetInfo, position);
        
        await this.battleManager.delay(50);
        
        // Apply the removal using TeleportationPowder's logic
        await this.removeCreature(targetInfo);
    }

    // Remove a creature using TeleportationPowder's logic
    async removeCreature(targetInfo) {
        const teleportPotion = new TeleportationPowderPotion();
        await teleportPotion.applyTeleportationEffect(
            targetInfo.creature,
            this.battleManager,
            targetInfo
        );
    }

    // Send creature removal data to guest for synchronization
    sendCreatureRemovalUpdate(soulShardActor, targetInfo, position) {
        this.battleManager.sendBattleUpdate('soul_shard_ba_combat_removal', {
            soulShardData: {
                side: soulShardActor.hero.side,
                position: position,
                creatureIndex: soulShardActor.index,
                name: soulShardActor.data.name,
                absoluteSide: soulShardActor.hero.absoluteSide
            },
            target: {
                creatureName: targetInfo.creature.name,
                heroPosition: targetInfo.heroPosition,
                creatureIndex: targetInfo.creatureIndex,
                absoluteSide: targetInfo.hero.absoluteSide
            }
        });
    }

    // Handle Soul Shard Ba combat removal on guest side
    async handleGuestCombatRemoval(data) {
        const { soulShardData, target } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const soulShardLocalSide = (soulShardData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetLocalSide = (target.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🌀 ${soulShardData.name} tears ${target.creatureName} into the void!`,
            soulShardLocalSide === 'player' ? 'success' : 'info'
        );
        
        // Find target creature
        const heroes = targetLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const targetHero = heroes[target.heroPosition];
        
        if (targetHero && targetHero.creatures && targetHero.creatures[target.creatureIndex]) {
            const targetCreature = targetHero.creatures[target.creatureIndex];
            const targetInfo = {
                creature: targetCreature,
                hero: targetHero,
                creatureIndex: target.creatureIndex,
                heroPosition: target.heroPosition,
                heroSide: targetLocalSide
            };
            
            // Apply removal using TeleportationPowder's logic
            await this.removeCreature(targetInfo);
        }
    }

    cleanup() {
        console.log('Cleaning up Soul Shard Ba creature effects');
    }
}

// Helper functions for battle start card animation
function createSoulShardBaCardEffect(battleManager, playerSide) {
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
        createCardAnimationOnElement(tempElement, battleManager, 'SoulShardBa');
        setTimeout(() => tempElement.remove(), 2500);
        return;
    }
    createCardAnimationOnElement(heroElement, battleManager, 'SoulShardBa');
}

function createCardAnimationOnElement(element, battleManager, cardName = 'SoulShardBa') {
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
export async function applyBothPlayersDelayedRemovalEffects(hostEffects, guestEffects, battleManager) {
    console.log('🌀 Processing Soul Shard Ba removal effects from both players...');
    
    // STEP 1: Collect targets for BOTH players BEFORE any removals
    const hostTargetsData = collectTargetsForPlayer(battleManager, hostEffects, 'host');
    const guestTargetsData = collectTargetsForPlayer(battleManager, guestEffects, 'guest');
    
    // STEP 2: Process removals for host
    if (hostTargetsData.targets.length > 0) {
        await processRemovals(
            battleManager, 
            hostTargetsData.targets, 
            'host',
            hostTargetsData.totalStacks,
            hostTargetsData.removalMultiplier
        );
    } else if (hostTargetsData.shouldLog) {
        logNoTargets(battleManager, 'host', hostTargetsData);
    }
    
    // STEP 3: Process removals for guest
    if (guestTargetsData.targets.length > 0) {
        await processRemovals(
            battleManager, 
            guestTargetsData.targets, 
            'guest',
            guestTargetsData.totalStacks,
            guestTargetsData.removalMultiplier
        );
    } else if (guestTargetsData.shouldLog) {
        logNoTargets(battleManager, 'guest', guestTargetsData);
    }
}

function collectTargetsForPlayer(battleManager, effects, playerSide) {
    const result = {
        targets: [],
        totalStacks: 0,
        removalMultiplier: 0,
        shouldLog: false
    };
    
    if (!effects || effects.length === 0) {
        return result;
    }
    
    const removalEffects = effects.filter(
        effect => effect.type === 'remove_enemy_creatures' && effect.source === 'SoulShardBa'
    );
    
    if (removalEffects.length === 0) {
        return result;
    }
    
    result.shouldLog = true;
    result.totalStacks = removalEffects.reduce((sum, effect) => sum + effect.stacks, 0);
    
    // Count unique SoulShard creatures on player's side
    const playerHeroes = playerSide === 'host' 
        ? battleManager.playerHeroes 
        : battleManager.opponentHeroes;
    
    const uniqueSoulShards = new Set();
    ['left', 'center', 'right'].forEach(position => {
        const hero = playerHeroes[position];
        if (hero && hero.creatures) {
            hero.creatures.forEach(creature => {
                if (creature.name && creature.name.startsWith('SoulShard') && creature.alive) {
                    uniqueSoulShards.add(creature.name);
                }
            });
        }
    });
    
    result.removalMultiplier = uniqueSoulShards.size;
    
    if (result.removalMultiplier === 0) {
        return result; // No targets, but will log failure
    }
    
    const totalRemovals = result.totalStacks * result.removalMultiplier;
    
    // Collect enemy creatures
    const enemyHeroes = playerSide === 'host' ?
        battleManager.opponentHeroes : battleManager.playerHeroes;
    
    const allEnemyCreatures = [];
    ['left', 'center', 'right'].forEach(pos => {
        const hero = enemyHeroes[pos];
        if (hero && hero.creatures) {
            hero.creatures.forEach((creature, index) => {
                if (creature.alive) {
                    allEnemyCreatures.push({
                        creature: creature,
                        hero: hero,
                        creatureIndex: index,
                        heroPosition: pos,
                        heroSide: hero.side
                    });
                }
            });
        }
    });
    
    // Limit to available targets
    const actualRemovals = Math.min(totalRemovals, allEnemyCreatures.length);
    
    if (actualRemovals === 0) {
        return result; // No targets available
    }
    
    // Shuffle and select creatures
    const shuffled = allEnemyCreatures.sort(() => Math.random() - 0.5);
    result.targets = shuffled.slice(0, actualRemovals);
    
    // Sort by index descending to avoid array shift issues during removal
    result.targets.sort((a, b) => {
        if (a.heroPosition !== b.heroPosition) {
            return a.heroPosition.localeCompare(b.heroPosition);
        }
        return b.creatureIndex - a.creatureIndex;
    });
    
    return result;
}

function logNoTargets(battleManager, playerSide, targetsData) {
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const logType = playerSide === 'host' ? 'warning' : 'info';
    
    if (targetsData.removalMultiplier === 0) {
        battleManager.addCombatLog(
            `⚠️ ${playerName}'s Soul Shard Ba fails - no SoulShard creatures found!`,
            logType
        );
        
        if (battleManager.isAuthoritative) {
            battleManager.sendBattleUpdate('soul_shard_ba_removal_applied', {
                playerSide: playerSide,
                totalRemovals: 0,
                totalStacks: targetsData.totalStacks,
                removalMultiplier: 0,
                failed: true
            });
        }
    } else {
        battleManager.addCombatLog(
            `🌀 ${playerName}'s Soul Shard Ba finds no enemy creatures to banish!`,
            playerSide === 'host' ? 'success' : 'info'
        );
    }
}

async function processRemovals(battleManager, targets, playerSide, totalStacks, removalMultiplier) {
    const removedNames = [];
    const teleportPotion = new TeleportationPowderPotion();
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const logType = playerSide === 'host' ? 'success' : 'info';
    
    // Calculate targets per stack
    const targetsPerStack = Math.floor(targets.length / totalStacks);
    const remainderTargets = targets.length % totalStacks;
    
    let currentTargetIndex = 0;
    
    // Process each stack individually with animation
    for (let stackNum = 0; stackNum < totalStacks; stackNum++) {
        createSoulShardBaCardEffect(battleManager, playerSide);
        await battleManager.delay(200);
        
        // Determine how many targets this stack removes
        const targetsThisStack = targetsPerStack + (stackNum < remainderTargets ? 1 : 0);
        const stackTargets = targets.slice(currentTargetIndex, currentTargetIndex + targetsThisStack);
        currentTargetIndex += targetsThisStack;
        
        // Apply removals for this stack
        for (const targetInfo of stackTargets) {
            await teleportPotion.applyTeleportationEffect(
                targetInfo.creature,
                battleManager,
                targetInfo
            );
            removedNames.push(targetInfo.creature.name);
            await battleManager.delay(200);
        }
        
        let message = `Soul Shard Ba stack ${stackNum + 1}/${totalStacks}`;
        if (removalMultiplier > 1) {
            message += ` (x${removalMultiplier} unique SoulShards)`;
        }
        message += ` banishes ${stackTargets.length} enemy creature${stackTargets.length !== 1 ? 's' : ''} to the void!`;
        
        battleManager.addCombatLog(message, logType);
        
        if (battleManager.isAuthoritative && stackNum === totalStacks - 1) {
            battleManager.sendBattleUpdate('soul_shard_ba_removal_applied', {
                playerSide: playerSide,
                totalRemovals: targets.length,
                totalStacks: totalStacks,
                removalMultiplier: removalMultiplier,
                removedCreatures: removedNames,
                failed: false
            });
        }
        
        await battleManager.delay(200);
    }
}

export function handleGuestSoulShardBaRemoval(data, battleManager) {
    if (battleManager.isAuthoritative) return;
    
    const { playerSide, totalRemovals, totalStacks, removalMultiplier, removedCreatures, failed } = data;
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const isMyEffect = (playerSide === myAbsoluteSide);
    
    // Show card animation for each stack
    for (let i = 0; i < totalStacks; i++) {
        createSoulShardBaCardEffect(battleManager, playerSide);
    }
    
    if (failed) {
        battleManager.addCombatLog(
            `⚠️ ${playerName}'s Soul Shard Ba fails - no SoulShard creatures found!`,
            isMyEffect ? 'warning' : 'info'
        );
        return;
    }
    
    let message = `🌀 ${playerName}'s Soul Shard Ba ${totalStacks > 1 ? `(x${totalStacks})` : ''}`;
    if (removalMultiplier > 1) {
        message += ` (x${removalMultiplier} unique SoulShards)`;
    }
    message += ` banishes ${totalRemovals} enemy creature${totalRemovals !== 1 ? 's' : ''} to the void!`;
    
    battleManager.addCombatLog(message, isMyEffect ? 'success' : 'info');
}

// CSS styles
if (typeof document !== 'undefined' && !document.getElementById('soulShardBaStyles')) {
    const style = document.createElement('style');
    style.id = 'soulShardBaStyles';
    style.textContent = `
        @keyframes soulShardBaDisenchant {
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
        
        .soul-shard-ba-disenchant .disenchant-content {
            background: linear-gradient(135deg, rgba(74, 0, 128, 0.95) 0%, rgba(45, 0, 77, 0.95) 100%);
            border: 3px solid rgba(156, 39, 176, 0.4);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        .soul-shard-ba-disenchant .shard-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        
        .soul-shard-ba-disenchant .effect-text {
            color: white;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .soul-shard-ba-disenchant .removal-preview {
            color: #ce93d8;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

export default SoulShardBaCreature;