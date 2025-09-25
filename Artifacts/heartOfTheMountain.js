// heartOfTheMountain.js - Heart of the Mountain Permanent Artifact Module
// Permanent Artifact that burns all targets at battle start

export const heartOfTheMountainArtifact = {
    // Card name this artifact handles
    cardName: 'HeartOfTheMountain',
    
    // Handle card click/drag (consume and add to permanents)
    async handleClick(cardIndex, cardName, heroSelection) {       
        // Consume the card and add to permanent list
        await this.consumeCard(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and add to permanents
    async consumeCard(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const goldManager = heroSelection.getGoldManager();
        
        if (!handManager || !goldManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Get cost from card database
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 0; // Default cost of 0 if not defined
        
        // Check if player has enough gold (if there's a cost)
        if (cost > 0) {
            const currentGold = goldManager.getPlayerGold();
            if (currentGold < cost) {
                this.showHeartOfMountainError(
                    `Need ${cost} Gold. Have ${currentGold} Gold.`,
                    cardIndex
                );
                return;
            }
            
            // Spend the gold (use negative amount to subtract)
            goldManager.addPlayerGold(-cost, 'HeartOfTheMountain');
            console.log(`🔥 Heart of the Mountain: Spent ${cost} gold to activate`);
        }
        
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Add to permanent artifacts list
        if (window.artifactHandler) {
            window.artifactHandler.addPermanentArtifact(this.cardName);
            
            // Update the permanent artifacts indicator
            if (window.heroSelection && window.heroSelection.heroSelectionUI) {
                window.heroSelection.heroSelectionUI.updatePermanentArtifactsIndicator();
            }
        }
        
        // Show visual feedback
        this.showHeartOfMountainActivation(cardIndex, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay(); // Update gold display after spending
        
        // Save game state
        await heroSelection.saveGameState();
        await heroSelection.sendFormationUpdate();
    },
    
    // Show error message when not enough gold
    showHeartOfMountainError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'heart-mountain-error';
        errorDiv.innerHTML = `
            <div class="heart-mountain-error-content">
                <span class="heart-mountain-error-icon">⛔</span>
                <span class="heart-mountain-error-text">${message}</span>
            </div>
        `;
        
        // Position near the card or center of hand
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                errorDiv.style.left = `${cardRect.left + cardRect.width / 2}px`;
                errorDiv.style.top = `${cardRect.top - 60}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                errorDiv.style.left = `${handRect.left + handRect.width / 2}px`;
                errorDiv.style.top = `${handRect.top - 60}px`;
            }
        } else {
            // Fallback to center of screen
            errorDiv.style.left = '50%';
            errorDiv.style.top = '50%';
        }
        
        errorDiv.style.cssText += `
            position: fixed;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: heartMountainErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'heartMountainErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show activation animation (updated to include cost)
    showHeartOfMountainActivation(cardIndex, cost) {
        const activationBurst = document.createElement('div');
        activationBurst.className = 'heart-mountain-activation';
        activationBurst.innerHTML = `
            <div class="mountain-burst">
                <span class="mountain-particle">🔥</span>
                <span class="mountain-particle">⛰️</span>
                <span class="mountain-particle">🔥</span>
            </div>
            <div class="mountain-text">Heart of the Mountain Armed!</div>
            <div class="mountain-subtext">Will burn all targets at battle start</div>
            ${cost > 0 ? `<div class="mountain-cost">Cost: ${cost} Gold</div>` : ''}
        `;
        
        // Position near the card
        const handContainer = document.querySelector('.hand-cards');
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                activationBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                activationBurst.style.top = `${cardRect.top}px`;
            } else {
                const handRect = handContainer.getBoundingClientRect();
                activationBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                activationBurst.style.top = `${handRect.top}px`;
            }
        }
        
        document.body.appendChild(activationBurst);
        
        setTimeout(() => {
            activationBurst.remove();
        }, 3000);
    },
    
    // ============================================
    // BATTLE START EFFECT
    // ============================================
    
    /**
     * Apply Heart of the Mountain effects at battle start
     * Called after other battle start effects like potions
     * @param {BattleManager} battleManager - The battle manager instance
     */
    async applyHeartOfMountainEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) {
            return; // Only host applies these effects
        }
        
        // Count Heart of the Mountains from each player
        const playerHearts = (battleManager.playerPermanentArtifacts || [])
            .filter(artifact => artifact.name === 'HeartOfTheMountain');
        const opponentHearts = (battleManager.opponentPermanentArtifacts || [])
            .filter(artifact => artifact.name === 'HeartOfTheMountain');
        
        const totalHearts = playerHearts.length + opponentHearts.length;
        
        if (totalHearts === 0) {
            return; // No Hearts to process
        }
        
        battleManager.addCombatLog(
            `🔥 ${totalHearts} Heart${totalHearts > 1 ? 's' : ''} of the Mountain activate${totalHearts === 1 ? 's' : ''}!`,
            'info'
        );
        
        let heartIndex = 0;
        
        // Fire player's Hearts at all targets
        for (let i = 0; i < playerHearts.length; i++) {
            await this.fireHeartOfMountainAtAllTargets(battleManager, heartIndex, 'player');
            heartIndex++;
            
            // Small delay between heart activations
            if (heartIndex < totalHearts) {
                await battleManager.delay(300);
            }
        }
        
        // Fire opponent's Hearts at all targets
        for (let i = 0; i < opponentHearts.length; i++) {
            await this.fireHeartOfMountainAtAllTargets(battleManager, heartIndex, 'opponent');
            heartIndex++;
            
            // Small delay between heart activations
            if (heartIndex < totalHearts) {
                await battleManager.delay(300);
            }
        }
        
        // Sync to guest
        battleManager.sendBattleUpdate('heart_mountain_effects_complete', {
            playerHearts: playerHearts.length,
            opponentHearts: opponentHearts.length,
            totalHearts: totalHearts,
            timestamp: Date.now()
        });
    },
    
    /**
     * Fire Heart of the Mountain at all targets (burns everyone)
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {number} heartIndex - Which heart is firing (for visual variety)
     * @param {string} ownerSide - Who owns the heart ('player' or 'opponent')
     */
    async fireHeartOfMountainAtAllTargets(battleManager, heartIndex = 0, ownerSide = 'player') {
        // Find ALL targets (heroes and creatures on both sides)
        const allTargets = this.findAllTargets(battleManager);
        
        if (allTargets.length === 0) {
            return;
        }
        
        // Apply burned status to all targets IMMEDIATELY (at start of animation)
        for (const targetData of allTargets) {
            if (battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(targetData.target, 'burned', 1);
            }
            
            // Sync individual burn to guest for animation
            battleManager.sendBattleUpdate('heart_mountain_burn', {
                ownerSide: ownerSide,
                targetData: {
                    type: targetData.type,
                    side: targetData.side,
                    position: targetData.position,
                    creatureIndex: targetData.creatureIndex,
                    targetName: targetData.target.name,
                    absoluteSide: targetData.target.absoluteSide || 
                        (targetData.hero ? targetData.hero.absoluteSide : undefined)
                },
                heartIndex: heartIndex,
                timestamp: Date.now()
            });
        }
        
        // Create mountain fire effects for all targets (visual confirmation)
        await this.createMountainFireBarrage(battleManager, allTargets);
        
        // Log the mass burn
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        battleManager.addCombatLog(
            `🔥 ${ownerName}'s Heart of the Mountain sets ${allTargets.length} targets ablaze!`,
            'info'
        );
    },
    
    /**
     * Find all targets (heroes and creatures on both sides)
     * Based on LunaKiai's findAllTargets method
     */
    findAllTargets(battleManager) {
        const targets = [];
        
        // Check both player and opponent sides
        ['player', 'opponent'].forEach(side => {
            const heroes = side === 'player' ? 
                battleManager.playerHeroes : battleManager.opponentHeroes;
            
            // Check all hero positions
            ['left', 'center', 'right'].forEach(position => {
                const hero = heroes[position];
                if (hero && hero.alive) {
                    // Add hero as target
                    targets.push({
                        type: 'hero',
                        target: hero,
                        side: side,
                        position: position,
                        targetInfo: {
                            type: 'hero',
                            absoluteSide: hero.absoluteSide,
                            position: position,
                            name: hero.name
                        }
                    });
                    
                    // Add living creatures as targets
                    if (hero.creatures) {
                        hero.creatures.forEach((creature, index) => {
                            if (creature.alive) {
                                targets.push({
                                    type: 'creature',
                                    target: creature,
                                    side: side,
                                    position: position,
                                    creatureIndex: index,
                                    hero: hero,
                                    targetInfo: {
                                        type: 'creature',
                                        absoluteSide: hero.absoluteSide,
                                        position: position,
                                        creatureIndex: index,
                                        name: creature.name
                                    }
                                });
                            }
                        });
                    }
                }
            });
        });
        
        return targets;
    },
    
    /**
     * Create mountain fire barrage animation for all targets
     * Based on LunaKiai's flame effects but mountain-themed
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {Array} allTargets - All targets to affect
     */
    async createMountainFireBarrage(battleManager, allTargets) {
        const flamePromises = [];
        
        for (const targetData of allTargets) {
            const targetElement = this.getTargetElement(targetData);
            if (targetElement) {
                const flameEffect = this.createMountainFlameEffect(targetElement, battleManager);
                flamePromises.push(flameEffect.promise);
            }
        }
        
        // Wait for flame effects to complete
        await Promise.all(flamePromises);
    },
    
    // Get the DOM element for a target
    getTargetElement(targetData) {
        if (targetData.type === 'hero') {
            const heroElement = document.querySelector(
                `.${targetData.side}-slot.${targetData.position}-slot .battle-hero-card`
            );
            if (!heroElement) {
                // Fallback to the slot itself
                return document.querySelector(`.${targetData.side}-slot.${targetData.position}-slot`);
            }
            return heroElement;
        } else if (targetData.type === 'creature') {
            return document.querySelector(
                `.${targetData.side}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }
        return null;
    },
    
    // Create mountain flame effect with volcanic fire particles
    createMountainFlameEffect(targetElement, battleManager) {
        if (!targetElement) return { promise: Promise.resolve() };

        const flameContainer = document.createElement('div');
        flameContainer.className = 'heart-mountain-flame';
        
        const FLAME_DURATION = 1500; // 1.5 second flame duration
        const adjustedDuration = battleManager.getSpeedAdjustedDelay(FLAME_DURATION);
        
        // Position relative to the target's parent container
        const targetParent = targetElement.parentElement;
        const targetRect = targetElement.getBoundingClientRect();
        const parentRect = targetParent.getBoundingClientRect();
        
        // Calculate position relative to parent
        const relativeLeft = targetRect.left - parentRect.left;
        const relativeTop = targetRect.top - parentRect.top;
        
        // Position the container to cover the target area
        flameContainer.style.cssText = `
            position: absolute;
            left: ${relativeLeft - 20}px;
            top: ${relativeTop - 20}px;
            width: ${targetRect.width + 40}px;
            height: ${targetRect.height + 40}px;
            pointer-events: none;
            z-index: 1600;
            overflow: hidden;
        `;
        
        // Create mountain fire particles (more intense than regular flames)
        const flameCount = 12;
        
        for (let i = 0; i < flameCount; i++) {
            const flame = document.createElement('div');
            flame.className = 'heart-mountain-flame-particle';
            flame.innerHTML = '🔥';
            
            const size = Math.random() * 10 + 6; // Slightly larger flames
            const startX = Math.random() * 100; // % position within container
            const animationDelay = Math.random() * adjustedDuration * 0.3;
            
            const baseAnimationDuration = Math.random() * 600 + 800; // Faster, more intense
            const animationDuration = battleManager.getSpeedAdjustedDelay(baseAnimationDuration);
            
            flame.style.cssText = `
                position: absolute;
                left: ${startX}%;
                bottom: 0px;
                font-size: ${size}px;
                color: rgba(255, ${Math.random() * 50 + 150}, 0, ${Math.random() * 0.3 + 0.7});
                animation: heartMountainFlameRise ${animationDuration}ms ease-out infinite;
                animation-delay: ${animationDelay}ms;
                text-shadow: 0 0 6px rgba(255, 69, 0, 0.9);
                filter: blur(${Math.random() * 0.1}px) hue-rotate(${Math.random() * 30}deg);
            `;
            
            flameContainer.appendChild(flame);
        }
        
        // Append to the target's parent for proper relative positioning
        targetParent.appendChild(flameContainer);
        
        const promise = new Promise(resolve => {
            setTimeout(() => {
                if (flameContainer && flameContainer.parentNode) {
                    flameContainer.remove();
                }
                resolve();
            }, adjustedDuration);
        });
        
        return { container: flameContainer, promise };
    },
    
    // ============================================
    // GUEST HANDLERS
    // ============================================
    
    /**
     * Handle Heart of the Mountain effects on guest side
     * @param {Object} data - Effect data from host
     * @param {BattleManager} battleManager - The battle manager instance
     */
    handleGuestHeartOfMountainEffects(data, battleManager) {
        const { playerHearts, opponentHearts, totalHearts } = data;
        
        battleManager.addCombatLog(
            `🔥 ${totalHearts} Heart${totalHearts > 1 ? 's' : ''} of the Mountain activate${totalHearts === 1 ? 's' : ''}!`,
            'info'
        );
        
        if (playerHearts > 0) {
            battleManager.addCombatLog(`🔥 Player's Heart${playerHearts > 1 ? 's' : ''} of the Mountain ignite${playerHearts === 1 ? 's' : ''}!`, 'success');
        }
        if (opponentHearts > 0) {
            battleManager.addCombatLog(`🔥 Opponent's Heart${opponentHearts > 1 ? 's' : ''} of the Mountain ignite${opponentHearts === 1 ? 's' : ''}!`, 'error');
        }
    },
    
    /**
     * Handle individual burn on guest side
     * @param {Object} data - Burn data from host
     * @param {BattleManager} battleManager - The battle manager instance
     */
    async handleGuestHeartOfMountainBurn(data, battleManager) {
        const { ownerSide, targetData, heartIndex } = data;
        
        // Find target element for animation
        const targetElement = this.getTargetElementFromData(targetData, battleManager);
        
        if (targetElement) {
            // Create the mountain flame animation
            await this.createMountainFlameEffect(targetElement, battleManager);
        }
        
        // Log the burn with proper owner identification
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        battleManager.addCombatLog(
            `🔥 ${ownerName}'s Heart of the Mountain burns ${targetData.targetName}!`,
            'info'
        );
    },
    
    // Helper to get target element from sync data
    getTargetElementFromData(targetData, battleManager) {
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetData.type === 'hero') {
            const heroElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .battle-hero-card`
            );
            if (!heroElement) {
                return document.querySelector(`.${targetLocalSide}-slot.${targetData.position}-slot`);
            }
            return heroElement;
        } else if (targetData.type === 'creature') {
            return document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }
        return null;
    }
};

// Add styles for the animations
if (typeof document !== 'undefined' && !document.getElementById('heartMountainStyles')) {
    const style = document.createElement('style');
    style.id = 'heartMountainStyles';
    style.textContent = `
        /* Heart of the Mountain Activation */
        .heart-mountain-activation {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: heartMountainActivation 3s ease-out forwards;
        }
        
        .mountain-burst {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            animation: mountainBurst 2s ease-out;
            justify-content: center;
        }
        
        .mountain-particle {
            font-size: 36px;
            animation: mountainSpin 1.5s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(255, 69, 0, 0.8));
        }
        
        .mountain-particle:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .mountain-particle:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        .mountain-text {
            font-size: 24px;
            font-weight: bold;
            color: #ff4500;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 69, 0, 0.8);
            text-align: center;
            animation: mountainTextPulse 0.8s ease-out;
            margin-bottom: 5px;
        }
        
        .mountain-subtext {
            font-size: 16px;
            color: #fff;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.5s ease-out 0.3s forwards;
        }
        
        .mountain-cost {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.5s ease-out 0.5s forwards;
        }
        
        /* Error styles */
        .heart-mountain-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .heart-mountain-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .heart-mountain-error-icon {
            font-size: 20px;
        }
        
        .heart-mountain-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes heartMountainErrorBounce {
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
        
        @keyframes heartMountainErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Heart of the Mountain Flame Styles */
        .heart-mountain-flame {
            border-radius: 8px;
            position: relative;
            overflow: visible;
        }

        .heart-mountain-flame-particle {
            will-change: transform, opacity;
            user-select: none;
            pointer-events: none;
        }

        @keyframes heartMountainFlameRise {
            0% { 
                transform: translateY(0px) translateX(0px) rotate(0deg) scale(1);
                opacity: 0;
            }
            20% {
                opacity: 1;
            }
            80% {
                opacity: 0.9;
            }
            100% { 
                transform: translateY(-80px) translateX(${Math.random() * 30 - 15}px) rotate(${Math.random() * 360}deg) scale(0.2);
                opacity: 0;
            }
        }
        
        @keyframes heartMountainActivation {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }
        
        @keyframes mountainBurst {
            0% { transform: translateY(0); }
            100% { transform: translateY(-60px); }
        }
        
        @keyframes mountainSpin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.4); }
            100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes mountainTextPulse {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        /* Card glow in hand */
        .hand-card[data-card-name="HeartOfTheMountain"] {
            position: relative;
            border: 2px solid #ff4500 !important;
            box-shadow: 
                0 0 15px rgba(255, 69, 0, 0.6),
                inset 0 0 15px rgba(255, 69, 0, 0.1) !important;
            animation: heartMountainGlow 3s ease-in-out infinite;
        }
        
        .hand-card[data-card-name="HeartOfTheMountain"]::before {
            content: "🔥";
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 20px;
            background: radial-gradient(circle, #ff4500, #ff6347);
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            z-index: 10;
            animation: heartMountainBadgePulse 2s ease-in-out infinite;
        }
        
        @keyframes heartMountainGlow {
            0%, 100% { 
                box-shadow: 
                    0 0 15px rgba(255, 69, 0, 0.6),
                    inset 0 0 15px rgba(255, 69, 0, 0.1);
            }
            50% { 
                box-shadow: 
                    0 0 25px rgba(255, 69, 0, 0.9),
                    inset 0 0 25px rgba(255, 69, 0, 0.2);
            }
        }
        
        @keyframes heartMountainBadgePulse {
            0%, 100% { 
                transform: scale(1);
                filter: drop-shadow(0 0 5px rgba(255, 69, 0, 0.8));
            }
            50% { 
                transform: scale(1.1);
                filter: drop-shadow(0 0 10px rgba(255, 69, 0, 1));
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in battle flow
export async function applyHeartOfMountainBattleEffects(battleManager) {
    return await heartOfTheMountainArtifact.applyHeartOfMountainEffects(battleManager);
}

// Export guest handlers
export function handleGuestHeartOfMountainEffects(data, battleManager) {
    return heartOfTheMountainArtifact.handleGuestHeartOfMountainEffects(data, battleManager);
}

export async function handleGuestHeartOfMountainBurn(data, battleManager) {
    return await heartOfTheMountainArtifact.handleGuestHeartOfMountainBurn(data, battleManager);
}