// snowCannon.js - Snow Cannon Permanent Artifact Module

export const snowCannonArtifact = {
    // Card name this artifact handles
    cardName: 'SnowCannon',
    
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
                this.showSnowCannonError(
                    `Need ${cost} Gold. Have ${currentGold} Gold.`,
                    cardIndex
                );
                return;
            }
            
            // Spend the gold (use negative amount to subtract)
            goldManager.addPlayerGold(-cost, 'SnowCannon');
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
        this.showSnowCannonActivation(cardIndex, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay(); // Update gold display after spending
        
        // Save game state
        await heroSelection.saveGameState();
        await heroSelection.sendFormationUpdate();
    },
    
    // Show error message when not enough gold
    showSnowCannonError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'snow-cannon-error';
        errorDiv.innerHTML = `
            <div class="snow-cannon-error-content">
                <span class="snow-cannon-error-icon">⛔</span>
                <span class="snow-cannon-error-text">${message}</span>
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
            animation: snowCannonErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'snowCannonErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show activation animation (updated to include cost)
    showSnowCannonActivation(cardIndex, cost) {
        const activationBurst = document.createElement('div');
        activationBurst.className = 'snow-cannon-activation';
        activationBurst.innerHTML = `
            <div class="snow-burst">
                <span class="snow-particle">❄️</span>
                <span class="snow-particle">🎯</span>
                <span class="snow-particle">❄️</span>
            </div>
            <div class="cannon-text">Snow Cannon Armed!</div>
            <div class="cannon-subtext">Will freeze enemies at battle start</div>
            ${cost > 0 ? `<div class="cannon-cost">Cost: ${cost} Gold</div>` : ''}
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
     * Apply Snow Cannon effects at battle start
     * Called after other battle start effects like potions
     * @param {BattleManager} battleManager - The battle manager instance
     */
    async applySnowCannonEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) {
            return; // Only host applies these effects
        }
        
        // Count Snow Cannons from each player
        const playerSnowCannons = (battleManager.playerPermanentArtifacts || [])
            .filter(artifact => artifact.name === 'SnowCannon');
        const opponentSnowCannons = (battleManager.opponentPermanentArtifacts || [])
            .filter(artifact => artifact.name === 'SnowCannon');
        
        const totalSnowCannons = playerSnowCannons.length + opponentSnowCannons.length;
        
        if (totalSnowCannons === 0) {
            return; // No Snow Cannons to process
        }
        
        battleManager.addCombatLog(
            `❄️ ${totalSnowCannons} Snow Cannon${totalSnowCannons > 1 ? 's' : ''} activate${totalSnowCannons === 1 ? 's' : ''}!`,
            'info'
        );
        
        let cannonIndex = 0;
        
        // Fire player's Snow Cannons at opponents
        for (let i = 0; i < playerSnowCannons.length; i++) {
            await this.fireSnowCannonAtEnemies(battleManager, cannonIndex, 'player');
            cannonIndex++;
            
            // Small delay between cannon shots
            if (cannonIndex < totalSnowCannons) {
                await battleManager.delay(300);
            }
        }
        
        // Fire opponent's Snow Cannons at player
        for (let i = 0; i < opponentSnowCannons.length; i++) {
            await this.fireSnowCannonAtEnemies(battleManager, cannonIndex, 'opponent');
            cannonIndex++;
            
            // Small delay between cannon shots  
            if (cannonIndex < totalSnowCannons) {
                await battleManager.delay(300);
            }
        }
        
        // Sync to guest
        battleManager.sendBattleUpdate('snow_cannon_effects_complete', {
            playerCannons: playerSnowCannons.length,
            opponentCannons: opponentSnowCannons.length,
            totalCannons: totalSnowCannons,
            timestamp: Date.now()
        });
    },
    
    /**
     * Fire Snow Cannon at enemies (targeting the opposite side)
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {number} cannonIndex - Which cannon is firing (for visual variety)
     * @param {string} ownerSide - Who owns the cannon ('player' or 'opponent')
     */
    async fireSnowCannonAtEnemies(battleManager, cannonIndex = 0, ownerSide = 'player') {
        // Determine target side (opposite of owner)
        const targetSide = ownerSide === 'player' ? 'opponent' : 'player';
        const targetHeroes = targetSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        
        // Get all possible enemy targets (heroes and creatures)
        const allTargets = [];
        
        // Add enemy heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = targetHeroes[position];
            if (hero && hero.alive) {
                allTargets.push({
                    target: hero,
                    type: 'hero',
                    side: targetSide,
                    position: position
                });
            }
            
            // Add enemy creatures
            if (hero && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        allTargets.push({
                            target: creature,
                            type: 'creature',
                            side: targetSide,
                            position: position,
                            creatureIndex: index
                        });
                    }
                });
            }
        });
        
        if (allTargets.length === 0) {
            return;
        }
        
        // Choose random target
        const randomIndex = battleManager.getRandomInt(0, allTargets.length - 1);
        const targetData = allTargets[randomIndex];
        
        // Create snowball barrage animation
        await this.createSnowballBarrage(battleManager, targetData);
        
        // Apply frozen status
        if (battleManager.statusEffectsManager) {
            battleManager.statusEffectsManager.applyStatusEffect(targetData.target, 'frozen', 1);
        }
        
        // Log the freeze
        const targetName = targetData.target.name || `${targetData.target.type} creature`;
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        battleManager.addCombatLog(
            `❄️ ${ownerName}'s Snow Cannon freezes ${targetName}!`,
            'info'
        );
        
        // Sync specific freeze to guest for animation
        battleManager.sendBattleUpdate('snow_cannon_freeze', {
            ownerSide: ownerSide,
            targetData: {
                type: targetData.type,
                side: targetData.side,
                position: targetData.position,
                creatureIndex: targetData.creatureIndex,
                targetName: targetName
            },
            cannonIndex: cannonIndex,
            timestamp: Date.now()
        });
    },
    
    /**
     * Create snowball barrage animation
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {Object} targetData - Information about the target
     */
    async createSnowballBarrage(battleManager, targetData) {
        let targetElement;
        
        if (targetData.type === 'hero') {
            targetElement = battleManager.getHeroElement(targetData.side, targetData.position);
        } else {
            targetElement = document.querySelector(
                `.${targetData.side}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }
        
        if (!targetElement) return;
        
        // Create multiple snowballs coming from different directions
        const snowballCount = 5;
        const snowballs = [];
        
        for (let i = 0; i < snowballCount; i++) {
            const snowball = document.createElement('div');
            snowball.className = 'snow-cannon-projectile';
            snowball.innerHTML = '❄️';
            
            // Random starting position around the target
            const angle = (Math.PI * 2 * i) / snowballCount;
            const distance = 200;
            const startX = Math.cos(angle) * distance;
            const startY = Math.sin(angle) * distance;
            
            snowball.style.cssText = `
                position: absolute;
                font-size: 24px;
                z-index: 500;
                pointer-events: none;
                animation: snowballFly ${battleManager.getSpeedAdjustedDelay(600)}ms ease-in forwards;
                animation-delay: ${i * 50}ms;
                transform: translate(${startX}px, ${startY}px) scale(1.5);
                --start-x: ${startX}px;
                --start-y: ${startY}px;
            `;
            
            targetElement.appendChild(snowball);
            snowballs.push(snowball);
        }
        
        // Create impact effect
        setTimeout(() => {
            const impact = document.createElement('div');
            impact.className = 'snow-impact';
            impact.innerHTML = '❄️💥❄️';
            impact.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 32px;
                z-index: 501;
                pointer-events: none;
                animation: snowImpact ${battleManager.getSpeedAdjustedDelay(400)}ms ease-out forwards;
            `;
            targetElement.appendChild(impact);
            
            setTimeout(() => impact.remove(), battleManager.getSpeedAdjustedDelay(400));
        }, battleManager.getSpeedAdjustedDelay(500));
        
        // Clean up snowballs
        setTimeout(() => {
            snowballs.forEach(snowball => snowball.remove());
        }, battleManager.getSpeedAdjustedDelay(700));
        
        // Wait for animation to complete
        await battleManager.delay(700);
    },
    
    // ============================================
    // GUEST HANDLERS
    // ============================================
    
    /**
     * Handle Snow Cannon effects on guest side
     * @param {Object} data - Effect data from host
     * @param {BattleManager} battleManager - The battle manager instance
     */
    handleGuestSnowCannonEffects(data, battleManager) {
        const { playerCannons, opponentCannons, totalCannons } = data;
        
        battleManager.addCombatLog(
            `❄️ ${totalCannons} Snow Cannon${totalCannons > 1 ? 's' : ''} activate${totalCannons === 1 ? 's' : ''}!`,
            'info'
        );
        
        if (playerCannons > 0) {
            battleManager.addCombatLog(`❄️ Player fires ${playerCannons} Snow Cannon${playerCannons > 1 ? 's' : ''}!`, 'success');
        }
        if (opponentCannons > 0) {
            battleManager.addCombatLog(`❄️ Opponent fires ${opponentCannons} Snow Cannon${opponentCannons > 1 ? 's' : ''}!`, 'error');
        }
    },
    
    /**
     * Handle individual freeze on guest side
     * @param {Object} data - Freeze data from host
     * @param {BattleManager} battleManager - The battle manager instance
     */
    async handleGuestSnowCannonFreeze(data, battleManager) {
        const { ownerSide, targetData, cannonIndex } = data;
        
        // Create the animation
        await this.createSnowballBarrage(battleManager, targetData);
        
        // Log the freeze with proper owner identification
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        battleManager.addCombatLog(
            `❄️ ${ownerName}'s Snow Cannon freezes ${targetData.targetName}!`,
            'info'
        );
    }
};

// Add styles for the animations
if (typeof document !== 'undefined' && !document.getElementById('snowCannonStyles')) {
    const style = document.createElement('style');
    style.id = 'snowCannonStyles';
    style.textContent = `
        /* Snow Cannon Activation */
        .snow-cannon-activation {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: cannonActivation 3s ease-out forwards;
        }
        
        .snow-burst {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            animation: snowBurst 2s ease-out;
            justify-content: center;
        }
        
        .snow-particle {
            font-size: 36px;
            animation: snowSpin 1.5s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(100, 200, 255, 0.8));
        }
        
        .snow-particle:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .snow-particle:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        .cannon-text {
            font-size: 24px;
            font-weight: bold;
            color: #64c8ff;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(100, 200, 255, 0.8);
            text-align: center;
            animation: cannonTextPulse 0.8s ease-out;
            margin-bottom: 5px;
        }
        
        .cannon-subtext {
            font-size: 16px;
            color: #fff;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.5s ease-out 0.3s forwards;
        }
        
        .cannon-cost {
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
        .snow-cannon-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .snow-cannon-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .snow-cannon-error-icon {
            font-size: 20px;
        }
        
        .snow-cannon-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes snowCannonErrorBounce {
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
        
        @keyframes snowCannonErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Snowball projectile animation */
        @keyframes snowballFly {
            0% {
                transform: translate(var(--start-x), var(--start-y)) scale(1.5);
                opacity: 0.3;
            }
            30% {
                opacity: 1;
            }
            100% {
                transform: translate(0, 0) scale(1);
                opacity: 0;
            }
        }
        
        /* Snow impact animation */
        @keyframes snowImpact {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.5);
            }
        }
        
        @keyframes cannonActivation {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }
        
        @keyframes snowBurst {
            0% { transform: translateY(0); }
            100% { transform: translateY(-60px); }
        }
        
        @keyframes snowSpin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.3); }
            100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes cannonTextPulse {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        /* Card glow in hand */
        .hand-card[data-card-name="SnowCannon"] {
            position: relative;
            border: 2px solid #64c8ff !important;
            box-shadow: 
                0 0 15px rgba(100, 200, 255, 0.6),
                inset 0 0 15px rgba(100, 200, 255, 0.1) !important;
            animation: snowCannonGlow 3s ease-in-out infinite;
        }
        
        .hand-card[data-card-name="SnowCannon"]::before {
            content: "❄️";
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 20px;
            background: radial-gradient(circle, #64c8ff, #ffffff);
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            z-index: 10;
            animation: snowCannonBadgePulse 2s ease-in-out infinite;
        }
        
        @keyframes snowCannonGlow {
            0%, 100% { 
                box-shadow: 
                    0 0 15px rgba(100, 200, 255, 0.6),
                    inset 0 0 15px rgba(100, 200, 255, 0.1);
            }
            50% { 
                box-shadow: 
                    0 0 25px rgba(100, 200, 255, 0.9),
                    inset 0 0 25px rgba(100, 200, 255, 0.2);
            }
        }
        
        @keyframes snowCannonBadgePulse {
            0%, 100% { 
                transform: scale(1);
                filter: drop-shadow(0 0 5px rgba(100, 200, 255, 0.8));
            }
            50% { 
                transform: scale(1.1);
                filter: drop-shadow(0 0 10px rgba(100, 200, 255, 1));
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in battle flow
export async function applySnowCannonBattleEffects(battleManager) {
    return await snowCannonArtifact.applySnowCannonEffects(battleManager);
}

// Export guest handlers
export function handleGuestSnowCannonEffects(data, battleManager) {
    return snowCannonArtifact.handleGuestSnowCannonEffects(data, battleManager);
}

export async function handleGuestSnowCannonFreeze(data, battleManager) {
    return await snowCannonArtifact.handleGuestSnowCannonFreeze(data, battleManager);
}