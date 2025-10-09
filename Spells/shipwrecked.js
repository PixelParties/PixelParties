// Spells/shipwrecked.js - Shipwrecked Global Spell Implementation - FIXED
// Draws cards until hand reaches 10, adds delayed effect that halves all heroes' HP at battle start

import { getCardInfo } from '../cardDatabase.js';

export const shipwreckedSpell = {
    name: 'Shipwrecked',
    
    // Check if the spell can be activated
    canActivate(heroSelection) {
        const result = { canActivate: false, reason: '', heroName: '' };
        
        // Get Shipwrecked card info from database
        const shipwreckedInfo = heroSelection.getCardInfo('Shipwrecked');
        if (!shipwreckedInfo) {
            result.reason = 'Shipwrecked spell info not found in database!';
            return result;
        }
        
        const requiredSpellSchool = shipwreckedInfo.spellSchool;
        const baseRequiredLevel = shipwreckedInfo.level;
        
        // Check if player has any heroes
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => formation[pos] !== null);
        
        if (heroPositions.length === 0) {
            result.reason = 'You need at least one Hero to cast Shipwrecked!';
            return result;
        }
        
        // Check if ANY hero has the required spell school at required level (accounting for Navigation reduction)
        let canCast = false;
        let castingHeroName = '';
        
        for (const position of heroPositions) {
            const hero = formation[position];
            if (!hero) continue;
            
            // Get hero's abilities
            const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
            if (!heroAbilities) continue;
            
            // Count spell school abilities and Navigation abilities across all zones
            let spellSchoolLevel = 0;
            let navigationLevel = 0;
            
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                    heroAbilities[zone].forEach(ability => {
                        if (ability && ability.name === requiredSpellSchool) {
                            spellSchoolLevel++;
                        }
                        if (ability && ability.name === 'Navigation') {
                            navigationLevel++;
                        }
                    });
                }
            });
            
            // Calculate effective required level (reduced by Navigation)
            const effectiveRequiredLevel = Math.max(0, baseRequiredLevel - navigationLevel);
            
            if (spellSchoolLevel >= effectiveRequiredLevel) {
                canCast = true;
                castingHeroName = hero.name;
                break;
            }
        }
        
        if (!canCast) {
            const formattedSpellSchool = heroSelection.formatCardName ? 
                heroSelection.formatCardName(requiredSpellSchool) : requiredSpellSchool;
            result.reason = `No Hero has ${formattedSpellSchool} at required level to cast Shipwrecked! (Navigation reduces the requirement)`;
            return result;
        }
        
        result.canActivate = true;
        result.heroName = castingHeroName;
        return result;
    },
    
    // Calculate how many cards to draw
    calculateCardsToDraw(heroSelection) {
        const currentHandSize = heroSelection.handManager.getHandSize();
        const targetHandSize = 10;
        
        // We're about to remove Shipwrecked from hand, so don't count it
        const effectiveCurrentHandSize = currentHandSize - 1;
        
        if (effectiveCurrentHandSize >= targetHandSize) {
            return 0; // Already at or above target
        }
        
        return targetHandSize - effectiveCurrentHandSize;
    },
    
    // Register the delayed shipwrecked effect for next battle
    async registerDelayedShipwreckedEffect(heroSelection) {
        if (!heroSelection.delayedEffects) {
            heroSelection.delayedEffects = [];
        }
        
        // Add shipwrecked delayed effect
        heroSelection.delayedEffects.push({
            type: 'shipwrecked_halve_hp',
            source: 'Shipwrecked',
            appliedAt: Date.now(),
            description: 'All your heroes will have their HP halved at battle start'
        });
        
        console.log('🚢 Registered Shipwrecked HP halving for next battle');
    },
    
    // Activate the spell
    async activate(heroSelection, cardIndex, globalSpellManager) {
        const canActivateResult = this.canActivate(heroSelection);
        if (!canActivateResult.canActivate) {
            return {
                success: false,
                message: canActivateResult.reason,
                consumed: false
            };
        }
        
        // Core spell execution - remove from hand and consume action
        let consumedCard = false;
        
        try {
            // Remove the spell from hand
            const removedCard = heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            if (!removedCard) {
                return {
                    success: false,
                    message: 'Failed to remove card from hand',
                    consumed: false
                };
            }
            consumedCard = true;
            
            // Consume action if required
            const cardInfo = heroSelection.getCardInfo('Shipwrecked');
            if (cardInfo && cardInfo.action && heroSelection.actionManager) {
                heroSelection.actionManager.consumeAction();
            }
            
        } catch (error) {
            return {
                success: false,
                message: 'Failed to cast Shipwrecked - core execution failed',
                consumed: consumedCard
            };
        }
        
        // Calculate how many cards to draw
        const cardsToDraw = this.calculateCardsToDraw(heroSelection);
        
        // Draw cards if needed
        let drewCards = 0;
        if (cardsToDraw > 0) {
            const drawnCards = heroSelection.handManager.drawCards(cardsToDraw);
            drewCards = drawnCards.length;
        }
        
        // Always register delayed effect, regardless of whether cards were drawn
        await this.registerDelayedShipwreckedEffect(heroSelection);
        
        // Create success message
        let message = 'Shipwrecked: ';
        if (drewCards > 0) {
            message += `Drew ${drewCards} card${drewCards > 1 ? 's' : ''} to reach 10! `;
        } else {
            message += 'Hand already full! ';
        }
        message += 'Your heroes will be shipwrecked at battle start!';
        
        // Show shipwreck animation
        await this.showShipwreckedActivationAnimation(heroSelection);
        
        // Non-critical operations - update displays
        try {
            heroSelection.updateHandDisplay();
            if (heroSelection.updateActionDisplay) {
                heroSelection.updateActionDisplay();
            }
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Send formation update to opponent
            await heroSelection.sendFormationUpdate();
            
        } catch (error) {
            console.error('Shipwrecked display update error:', error);
        }
        
        return {
            success: true,
            message: message,
            consumed: true,
            cardsToDraw: cardsToDraw,
            drewCards: drewCards
        };
    },
    
    // Show shipwreck activation animation (card rising from waves)
    async showShipwreckedActivationAnimation(heroSelection) {
        return new Promise((resolve) => {
            const container = document.createElement('div');
            container.className = 'shipwrecked-activation-container';
            
            container.innerHTML = `
                <div class="shipwrecked-waves"></div>
                <div class="shipwrecked-card-container">
                    <img src="./Cards/All/Shipwrecked.png" 
                         alt="Shipwrecked" 
                         class="shipwrecked-card-image"
                         onerror="this.src='./Cards/placeholder.png'">
                </div>
                <div class="shipwrecked-text">🚢 Shipwrecked!</div>
            `;
            
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: linear-gradient(180deg, 
                    rgba(0, 32, 64, 0.95) 0%, 
                    rgba(0, 64, 128, 0.95) 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                pointer-events: none;
                animation: shipwreckedFadeIn 0.3s ease-out;
            `;
            
            document.body.appendChild(container);
            
            // Animate and remove
            setTimeout(() => {
                container.style.animation = 'shipwreckedFadeOut 0.5s ease-out forwards';
                setTimeout(() => {
                    container.remove();
                    resolve();
                }, 500);
            }, 2000);
        });
    },
    
    // Handle click activation (called by GlobalSpellManager)
    async handleClick(cardIndex, cardName, heroSelection, globalSpellManager) {
        const result = await this.activate(heroSelection, cardIndex, globalSpellManager);
        
        // Show visual feedback
        if (result.success) {
            showGlobalSpellSuccess(result.message);
        } else {
            showGlobalSpellError(result.message);
        }
        
        return result.success;
    }
};

// ===== BATTLE START INTEGRATION =====

// Apply delayed shipwrecked effects from both players at battle start
export async function applyBothPlayersShipwreckedEffects(hostEffects, guestEffects, battleManager) {
    console.log('🚢 Processing Shipwrecked delayed effects from both players...');
    
    // Process host's shipwrecked effects (apply to host's heroes)
    if (hostEffects && hostEffects.length > 0) {
        const hostShipwreckedEffects = hostEffects.filter(
            effect => effect.type === 'shipwrecked_halve_hp' && effect.source === 'Shipwrecked'
        );
        
        if (hostShipwreckedEffects.length > 0) {
            console.log(`🚢 Applying ${hostShipwreckedEffects.length} HOST Shipwrecked effect(s)...`);
            await halvePlayerHeroesHP(battleManager, 'player', hostShipwreckedEffects.length);
        }
    }
    
    // Process guest's shipwrecked effects (apply to guest's heroes)
    if (guestEffects && guestEffects.length > 0) {
        const guestShipwreckedEffects = guestEffects.filter(
            effect => effect.type === 'shipwrecked_halve_hp' && effect.source === 'Shipwrecked'
        );
        
        if (guestShipwreckedEffects.length > 0) {
            console.log(`🚢 Applying ${guestShipwreckedEffects.length} GUEST Shipwrecked effect(s)...`);
            await halvePlayerHeroesHP(battleManager, 'opponent', guestShipwreckedEffects.length);
        }
    }
}

// FIXED: Halve all heroes' HP for a player, multiple times based on effectCount
async function halvePlayerHeroesHP(battleManager, side, effectCount = 1) {
    const heroes = side === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
    
    // Get living heroes
    const livingHeroPositions = ['left', 'center', 'right'].filter(pos => heroes[pos] && heroes[pos].alive);
    
    if (livingHeroPositions.length === 0) {
        console.log('🚢 No living heroes to apply Shipwrecked effects to');
        return;
    }
    
    // FIX #1: Send network message to guest BEFORE showing animation
    // This ensures guest also sees the animation
    if (battleManager.isAuthoritative) {
        // Convert player/opponent to absolute host/guest sides
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const absoluteSide = side === 'player' ? myAbsoluteSide : (myAbsoluteSide === 'host' ? 'guest' : 'host');
        
        battleManager.sendBattleUpdate('shipwrecked_battle_start', {
            side: absoluteSide,
            effectCount: effectCount,
            timestamp: Date.now()
        });
    }
    
    // Show shipwreck activation animation
    await showShipwreckedBattleStartAnimation(battleManager, side, effectCount);
    
    // FIX #2: Actually halve HP multiple times based on effectCount
    for (let iteration = 1; iteration <= effectCount; iteration++) {
        console.log(`🚢 Shipwrecked iteration ${iteration}/${effectCount}`);
        
        // Apply HP halving to each living hero
        for (const position of livingHeroPositions) {
            const hero = heroes[position];
            if (!hero || !hero.alive) continue;
            
            const oldHp = hero.currentHp;
            const newHp = Math.ceil(oldHp / 2); // Round up to avoid 0 HP
            const hpLost = oldHp - newHp;
            
            // Skip if no HP would be lost (already at 1 HP)
            if (hpLost === 0) continue;
            
            hero.currentHp = newHp;
            
            // Update health bar
            battleManager.updateHeroHealthBar(side, position, newHp, hero.maxHp);
            
            // Create damage number
            battleManager.animationManager.createDamageNumber(
                side, 
                position, 
                hpLost, 
                hero.maxHp, 
                'shipwrecked'
            );
            
            // Send network update to guest if host
            if (battleManager.isAuthoritative) {
                battleManager.sendBattleUpdate('shipwrecked_hp_halved', {
                    heroAbsoluteSide: hero.absoluteSide,
                    heroPosition: position,
                    heroName: hero.name,
                    oldHp: oldHp,
                    newHp: newHp,
                    hpLost: hpLost,
                    maxHp: hero.maxHp,
                    iteration: iteration,
                    totalIterations: effectCount,
                    timestamp: Date.now()
                });
            }
            
            // Small delay between heroes for visual clarity
            await battleManager.delay(200);
        }
        
        // Delay between iterations if there are multiple
        if (iteration < effectCount) {
            await battleManager.delay(500);
        }
    }
    
    // Log the result
    const sideLabel = side === 'player' ? 'Your' : "Opponent's";
    const plural = effectCount > 1 ? 's' : '';
    const timesText = effectCount > 1 ? ` ${effectCount} times` : '';
    battleManager.addCombatLog(
        `🚢 ${sideLabel} Shipwrecked spell${plural} activate - heroes' HP halved${timesText}!`,
        side === 'player' ? 'error' : 'success'
    );
}

// Show shipwreck battle start animation with card and wave effects
async function showShipwreckedBattleStartAnimation(battleManager, side, effectCount) {
    // Find the center hero position to anchor the animation
    const heroes = side === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
    const centerHero = heroes['center'];
    
    // If no center hero, find any hero
    let anchorPosition = 'center';
    if (!centerHero || !centerHero.alive) {
        for (const pos of ['left', 'right']) {
            if (heroes[pos] && heroes[pos].alive) {
                anchorPosition = pos;
                break;
            }
        }
    }
    
    const centerSlot = document.querySelector(`.${side}-slot.${anchorPosition}-slot`);
    if (!centerSlot) {
        console.warn('🚢 Could not find anchor slot for animation');
        return;
    }
    
    const rect = centerSlot.getBoundingClientRect();
    
    const container = document.createElement('div');
    container.className = 'shipwrecked-battle-activation';
    
    // Show effect count if multiple
    const countText = effectCount > 1 ? ` x${effectCount}` : '';
    
    container.innerHTML = `
        <div class="shipwrecked-battle-waves"></div>
        <img src="./Cards/All/Shipwrecked.png" 
             alt="Shipwrecked" 
             class="shipwrecked-battle-card"
             onerror="this.src='./Cards/placeholder.png'">
        <div class="shipwrecked-battle-text">🚢💀 Shipwrecked!${countText}</div>
    `;
    
    container.style.cssText = `
        position: fixed;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top - 150}px;
        transform: translate(-50%, 0);
        z-index: 1000;
        pointer-events: none;
        animation: shipwreckedBattleActivation 2.5s ease-out forwards;
    `;
    
    document.body.appendChild(container);
    
    await battleManager.delay(2500);
    container.remove();
}

// Guest-side handler for HP halving
export function handleGuestShipwreckedHPHalved(data, battleManager) {
    const bm = battleManager;
    if (bm.isAuthoritative) return;
    
    const { heroAbsoluteSide, heroPosition, heroName, oldHp, newHp, hpLost, maxHp, iteration, totalIterations } = data;
    
    const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
    const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    
    const heroes = heroLocalSide === 'player' ? bm.playerHeroes : bm.opponentHeroes;
    const hero = heroes[heroPosition];
    
    if (!hero) return;
    
    // Apply HP change
    hero.currentHp = newHp;
    
    // Update health bar
    bm.updateHeroHealthBar(heroLocalSide, heroPosition, newHp, maxHp);
    
    // Create damage number
    bm.animationManager.createDamageNumber(
        heroLocalSide,
        heroPosition,
        hpLost,
        maxHp,
        'shipwrecked'
    );
    
    // Add combat log
    const logType = heroLocalSide === 'player' ? 'error' : 'success';
    const iterationText = totalIterations > 1 ? ` (${iteration}/${totalIterations})` : '';
    bm.addCombatLog(
        `🚢 ${heroName} loses ${hpLost} HP from being shipwrecked${iterationText}! (${oldHp} → ${newHp})`,
        logType
    );
}

// FIX #1: Guest-side handler for battle start animation
export async function handleGuestShipwreckedBattleStart(data, battleManager) {
    const bm = battleManager;
    if (bm.isAuthoritative) return; // Only process on guest side
    
    const { side: absoluteSide, effectCount } = data;
    
    // Convert absolute side to local side
    const myAbsoluteSide = bm.isHost ? 'host' : 'guest';
    const localSide = (absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    
    console.log(`🚢 Guest showing Shipwrecked animation for ${localSide} side (${effectCount} effect(s))`);
    
    // Show the animation on guest's screen
    await showShipwreckedBattleStartAnimation(bm, localSide, effectCount);
}

// Visual feedback functions
function showGlobalSpellSuccess(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'global-spell-success-popup';
    feedbackDiv.innerHTML = `
        <div class="global-spell-success-content">
            <span class="global-spell-success-icon">🚢</span>
            <span class="global-spell-success-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #2c5f7d 0%, #1a3a4d 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10001;
        pointer-events: none;
        animation: globalSpellSuccessBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(44, 95, 125, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(feedbackDiv);
    
    setTimeout(() => {
        feedbackDiv.style.animation = 'globalSpellSuccessFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3000);
}

function showGlobalSpellError(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'global-spell-error-popup';
    feedbackDiv.innerHTML = `
        <div class="global-spell-error-content">
            <span class="global-spell-error-icon">⚠️</span>
            <span class="global-spell-error-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: rgba(244, 67, 54, 0.95);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10001;
        pointer-events: none;
        animation: globalSpellErrorBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(244, 67, 54, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(feedbackDiv);
    
    setTimeout(() => {
        feedbackDiv.style.animation = 'globalSpellErrorFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3000);
}

// Add CSS animations
if (typeof document !== 'undefined' && !document.getElementById('shipwreckedSpellStyles')) {
    const style = document.createElement('style');
    style.id = 'shipwreckedSpellStyles';
    style.textContent = `
        /* Activation animation styles */
        .shipwrecked-activation-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }
        
        .shipwrecked-waves {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 200px;
            background: repeating-linear-gradient(
                90deg,
                rgba(0, 100, 200, 0.5) 0px,
                rgba(0, 150, 255, 0.5) 50px,
                rgba(0, 100, 200, 0.5) 100px
            );
            animation: shipwreckedWaves 2s linear infinite;
            opacity: 0.6;
        }
        
        @keyframes shipwreckedWaves {
            0% { background-position: 0 0; }
            100% { background-position: 100px 0; }
        }
        
        .shipwrecked-card-container {
            position: relative;
            z-index: 10;
            animation: shipwreckedCardRise 2s ease-out;
        }
        
        .shipwrecked-card-image {
            width: 180px;
            height: auto;
            border-radius: 12px;
            box-shadow: 
                0 10px 40px rgba(0, 0, 0, 0.8),
                0 0 60px rgba(0, 150, 255, 0.6);
            border: 3px solid rgba(255, 255, 255, 0.4);
        }
        
        @keyframes shipwreckedCardRise {
            0% {
                opacity: 0;
                transform: translateY(200px) rotate(-10deg);
            }
            50% {
                opacity: 1;
                transform: translateY(-20px) rotate(5deg);
            }
            100% {
                opacity: 1;
                transform: translateY(0) rotate(0deg);
            }
        }
        
        .shipwrecked-text {
            color: #fff;
            font-size: 28px;
            font-weight: bold;
            text-shadow: 
                0 0 10px rgba(0, 150, 255, 0.8),
                0 0 20px rgba(0, 100, 200, 0.6),
                2px 2px 4px rgba(0, 0, 0, 0.8);
            animation: shipwreckedTextFloat 2s ease-in-out;
        }
        
        @keyframes shipwreckedTextFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        @keyframes shipwreckedFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes shipwreckedFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        /* Battle start animation styles */
        .shipwrecked-battle-activation {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
        }
        
        .shipwrecked-battle-waves {
            position: absolute;
            width: 300px;
            height: 100px;
            background: repeating-linear-gradient(
                90deg,
                rgba(0, 100, 200, 0.4) 0px,
                rgba(0, 150, 255, 0.4) 30px,
                rgba(0, 100, 200, 0.4) 60px
            );
            animation: shipwreckedBattleWaves 1.5s linear infinite;
            border-radius: 50%;
            opacity: 0.7;
        }
        
        @keyframes shipwreckedBattleWaves {
            0% { background-position: 0 0; }
            100% { background-position: 60px 0; }
        }
        
        .shipwrecked-battle-card {
            width: 140px;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
            border: 3px solid rgba(255, 255, 255, 0.5);
            z-index: 10;
            position: relative;
        }
        
        .shipwrecked-battle-text {
            color: #fff;
            font-size: 22px;
            font-weight: bold;
            text-shadow: 
                0 0 10px rgba(200, 0, 0, 0.8),
                0 0 20px rgba(150, 0, 0, 0.6),
                2px 2px 4px rgba(0, 0, 0, 0.8);
            z-index: 10;
            position: relative;
        }
        
        @keyframes shipwreckedBattleActivation {
            0% {
                opacity: 0;
                transform: translate(-50%, 50px) scale(0.7);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -10px) scale(1.1);
            }
            40% {
                transform: translate(-50%, 0) scale(1.05);
            }
            80% {
                opacity: 1;
                transform: translate(-50%, 0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -20px) scale(0.9);
            }
        }
        
        /* Success/Error popup animations */
        @keyframes globalSpellSuccessBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes globalSpellSuccessFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes globalSpellErrorBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes globalSpellErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.shipwreckedSpell = shipwreckedSpell;
    window.handleGuestShipwreckedBattleStart = handleGuestShipwreckedBattleStart;
}