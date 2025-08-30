// cloudPillow.js - Cloud Pillow Permanent Artifact Module

export const cloudPillowArtifact = {
    // Card name this artifact handles
    cardName: 'CloudPillow',
    
    // Handle card click/drag (consume and add to permanents)
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`Cloud Pillow activated at index ${cardIndex}`);
        
        // Check if player can afford the artifact
        const cardInfo = heroSelection.getCardInfo(cardName);
        const cost = cardInfo?.cost || 0;
        const playerGold = heroSelection.getGoldManager().getPlayerGold();
        
        if (playerGold < cost) {
            this.showError(`You need ${cost} Gold to use CloudPillow!`);
            return;
        }
        
        // Charge the gold
        if (cost > 0) {
            heroSelection.getGoldManager().addPlayerGold(-cost, 'cloud_pillow_use');
        }
        
        // Consume the card and add to permanent list
        await this.consumeCard(cardIndex, heroSelection);
    },
    
    // Core logic to consume card and add to permanents
    async consumeCard(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get hand manager
        const handManager = heroSelection.getHandManager();
        
        if (!handManager) {
            console.error('Hand manager not available');
            return;
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
            console.log('Cloud Pillow added to permanent artifacts!');
            
            // Update the permanent artifacts indicator
            if (window.heroSelection && window.heroSelection.heroSelectionUI) {
                window.heroSelection.heroSelectionUI.updatePermanentArtifactsIndicator();
            }
        }
        
        // Show visual feedback
        this.showCloudPillowActivation(cardIndex);
        
        // Update UI
        heroSelection.updateHandDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        
        await heroSelection.sendFormationUpdate();

        console.log(`Cloud Pillow consumed and added to permanent artifacts!`);
    },
    
    // Show activation animation
    showCloudPillowActivation(cardIndex) {
        const activationBurst = document.createElement('div');
        activationBurst.className = 'cloud-pillow-activation';
        activationBurst.innerHTML = `
            <div class="cloud-burst">
                <span class="cloud-particle">☁️</span>
                <span class="cloud-particle">🛡️</span>
                <span class="cloud-particle">☁️</span>
            </div>
            <div class="pillow-text">Cloud Pillow Ready!</div>
            <div class="pillow-subtext">Will protect allies at battle start</div>
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
    
    // Show error message
    showError(message) {
        const error = document.createElement('div');
        error.className = 'cloud-pillow-error';
        error.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
            </div>
        `;
        
        document.body.appendChild(error);
        
        setTimeout(() => {
            if (error.parentNode) {
                error.remove();
            }
        }, 3000);
    },
    
    // ============================================
    // BATTLE START EFFECT
    // ============================================
    
    /**
     * Apply Cloud Pillow effects at battle start
     * Called after other battle start effects like potions
     * @param {BattleManager} battleManager - The battle manager instance
     */
    async applyCloudPillowEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) {
            return; // Only host applies these effects
        }
        
        // Count Cloud Pillows from each player
        const playerCloudPillows = (battleManager.playerPermanentArtifacts || [])
            .filter(artifact => artifact.name === 'CloudPillow');
        const opponentCloudPillows = (battleManager.opponentPermanentArtifacts || [])
            .filter(artifact => artifact.name === 'CloudPillow');
        
        const totalCloudPillows = playerCloudPillows.length + opponentCloudPillows.length;
        
        console.log("CLOUD PILLOW TEST!");
        console.log(`Player Cloud Pillows: ${playerCloudPillows.length}`);
        console.log(`Opponent Cloud Pillows: ${opponentCloudPillows.length}`);
        console.log(`Total Cloud Pillows: ${totalCloudPillows}`);
        
        if (totalCloudPillows === 0) {
            return; // No Cloud Pillows to process
        }
        
        console.log(`Activating ${totalCloudPillows} Cloud Pillow${totalCloudPillows > 1 ? 's' : ''}!`);
        battleManager.addCombatLog(
            `${totalCloudPillows} Cloud Pillow${totalCloudPillows > 1 ? 's' : ''} activate${totalCloudPillows === 1 ? 's' : ''}!`,
            'info'
        );
        
        let pillowIndex = 0;
        
        // Apply player's Cloud Pillows to their own allies
        for (let i = 0; i < playerCloudPillows.length; i++) {
            await this.activateCloudPillowForAllies(battleManager, pillowIndex, 'player');
            pillowIndex++;
            
            // Small delay between pillow activations
            if (pillowIndex < totalCloudPillows) {
                await battleManager.delay(300);
            }
        }
        
        // Apply opponent's Cloud Pillows to their own allies
        for (let i = 0; i < opponentCloudPillows.length; i++) {
            await this.activateCloudPillowForAllies(battleManager, pillowIndex, 'opponent');
            pillowIndex++;
            
            // Small delay between pillow activations  
            if (pillowIndex < totalCloudPillows) {
                await battleManager.delay(300);
            }
        }
        
        // Sync to guest
        battleManager.sendBattleUpdate('cloud_pillow_effects_complete', {
            playerPillows: playerCloudPillows.length,
            opponentPillows: opponentCloudPillows.length,
            totalPillows: totalCloudPillows,
            timestamp: Date.now()
        });
    },
    
    /**
     * Activate Cloud Pillow for allies (targeting the same side)
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {number} pillowIndex - Which pillow is activating (for visual variety)
     * @param {string} ownerSide - Who owns the pillow ('player' or 'opponent')
     */
    async activateCloudPillowForAllies(battleManager, pillowIndex = 0, ownerSide = 'player') {
        // Target the same side as the owner (allies)
        const targetSide = ownerSide;
        const targetHeroes = targetSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        
        // Get all possible ally targets (heroes and creatures)
        const allTargets = [];
        
        // Add ally heroes
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
            
            // Add ally creatures
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
            console.log(`No valid ally targets for ${ownerSide}'s Cloud Pillow`);
            return;
        }
        
        // Choose random target
        const randomIndex = battleManager.getRandomInt(0, allTargets.length - 1);
        const targetData = allTargets[randomIndex];
        
        // Create cloud pillow animation
        await this.createCloudPillowAnimation(battleManager, targetData);
        
        // Apply clouded status
        if (battleManager.statusEffectsManager) {
            battleManager.statusEffectsManager.applyStatusEffect(targetData.target, 'clouded', 1);
        }
        
        // Log the protection
        const targetName = targetData.target.name || `${targetData.target.type} creature`;
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        battleManager.addCombatLog(
            `${ownerName}'s Cloud Pillow protects ${targetName}!`,
            'info'
        );
        
        // Sync specific protection to guest for animation
        battleManager.sendBattleUpdate('cloud_pillow_protection', {
            ownerSide: ownerSide,
            targetData: {
                type: targetData.type,
                side: targetData.side,
                position: targetData.position,
                creatureIndex: targetData.creatureIndex,
                targetName: targetName
            },
            pillowIndex: pillowIndex,
            timestamp: Date.now()
        });
    },
    
    /**
     * Create cloud pillow protection animation
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {Object} targetData - Information about the target
     */
    async createCloudPillowAnimation(battleManager, targetData) {
        let targetElement;
        
        if (targetData.type === 'hero') {
            targetElement = battleManager.getHeroElement(targetData.side, targetData.position);
        } else {
            targetElement = document.querySelector(
                `.${targetData.side}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }
        
        if (!targetElement) return;
        
        // Create multiple cloud puffs coming from different directions
        const cloudCount = 6;
        const clouds = [];
        
        for (let i = 0; i < cloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud-pillow-projectile';
            cloud.innerHTML = '☁️';
            
            // Random starting position around the target
            const angle = (Math.PI * 2 * i) / cloudCount;
            const distance = 150;
            const startX = Math.cos(angle) * distance;
            const startY = Math.sin(angle) * distance;
            
            cloud.style.cssText = `
                position: absolute;
                font-size: 20px;
                z-index: 500;
                pointer-events: none;
                animation: cloudFloat ${battleManager.getSpeedAdjustedDelay(800)}ms ease-in-out forwards;
                animation-delay: ${i * 80}ms;
                transform: translate(${startX}px, ${startY}px) scale(1.2);
                --start-x: ${startX}px;
                --start-y: ${startY}px;
            `;
            
            targetElement.appendChild(cloud);
            clouds.push(cloud);
        }
        
        // Create soft pillow embrace effect
        setTimeout(() => {
            const embrace = document.createElement('div');
            embrace.className = 'cloud-embrace';
            embrace.innerHTML = '☁️🛡️☁️';
            embrace.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 28px;
                z-index: 501;
                pointer-events: none;
                animation: cloudEmbrace ${battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
            `;
            targetElement.appendChild(embrace);
            
            setTimeout(() => embrace.remove(), battleManager.getSpeedAdjustedDelay(600));
        }, battleManager.getSpeedAdjustedDelay(600));
        
        // Clean up clouds
        setTimeout(() => {
            clouds.forEach(cloud => cloud.remove());
        }, battleManager.getSpeedAdjustedDelay(900));
        
        // Wait for animation to complete
        await battleManager.delay(900);
    },
    
    // ============================================
    // GUEST HANDLERS
    // ============================================
    
    /**
     * Handle Cloud Pillow effects on guest side
     * @param {Object} data - Effect data from host
     * @param {BattleManager} battleManager - The battle manager instance
     */
    handleGuestCloudPillowEffects(data, battleManager) {
        const { playerPillows, opponentPillows, totalPillows } = data;
        
        battleManager.addCombatLog(
            `${totalPillows} Cloud Pillow${totalPillows > 1 ? 's' : ''} activate${totalPillows === 1 ? 's' : ''}!`,
            'info'
        );
        
        if (playerPillows > 0) {
            battleManager.addCombatLog(`Player uses ${playerPillows} Cloud Pillow${playerPillows > 1 ? 's' : ''}!`, 'success');
        }
        if (opponentPillows > 0) {
            battleManager.addCombatLog(`Opponent uses ${opponentPillows} Cloud Pillow${opponentPillows > 1 ? 's' : ''}!`, 'error');
        }
    },
    
    /**
     * Handle individual protection on guest side
     * @param {Object} data - Protection data from host
     * @param {BattleManager} battleManager - The battle manager instance
     */
    async handleGuestCloudPillowProtection(data, battleManager) {
        const { ownerSide, targetData, pillowIndex } = data;
        
        // Create the animation
        await this.createCloudPillowAnimation(battleManager, targetData);
        
        // Log the protection with proper owner identification
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        battleManager.addCombatLog(
            `${ownerName}'s Cloud Pillow protects ${targetData.targetName}!`,
            'info'
        );
    }
};

// Add styles for the animations
if (typeof document !== 'undefined' && !document.getElementById('cloudPillowStyles')) {
    const style = document.createElement('style');
    style.id = 'cloudPillowStyles';
    style.textContent = `
        /* Cloud Pillow Activation */
        .cloud-pillow-activation {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: pillowActivation 3s ease-out forwards;
        }
        
        .cloud-burst {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            animation: cloudBurst 2s ease-out;
            justify-content: center;
        }
        
        .cloud-particle {
            font-size: 32px;
            animation: cloudSpin 1.8s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.8));
        }
        
        .cloud-particle:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .cloud-particle:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        .pillow-text {
            font-size: 24px;
            font-weight: bold;
            color: #f0f8ff;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(240, 248, 255, 0.8);
            text-align: center;
            animation: pillowTextPulse 0.8s ease-out;
            margin-bottom: 5px;
        }
        
        .pillow-subtext {
            font-size: 16px;
            color: #fff;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.5s ease-out 0.3s forwards;
        }
        
        /* Cloud projectile animation */
        @keyframes cloudFloat {
            0% {
                transform: translate(var(--start-x), var(--start-y)) scale(1.2);
                opacity: 0.3;
            }
            30% {
                opacity: 1;
            }
            100% {
                transform: translate(0, 0) scale(1);
                opacity: 0.8;
            }
        }
        
        /* Cloud embrace animation */
        @keyframes cloudEmbrace {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.3);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.8);
            }
        }
        
        @keyframes pillowActivation {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }
        
        @keyframes cloudBurst {
            0% { transform: translateY(0); }
            100% { transform: translateY(-40px); }
        }
        
        @keyframes cloudSpin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.2); }
            100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes pillowTextPulse {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        /* Error Message */
        .cloud-pillow-error {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            animation: cloudPillowError 3s ease-out forwards;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .cloud-pillow-error .error-content {
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 16px;
            font-weight: bold;
        }
        
        .cloud-pillow-error .error-icon {
            font-size: 24px;
        }
        
        @keyframes cloudPillowError {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            10% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.05);
            }
            90% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
        }
        
        /* Card glow in hand */
        .hand-card[data-card-name="CloudPillow"] {
            position: relative;
            border: 2px solid #f0f8ff !important;
            box-shadow: 
                0 0 15px rgba(240, 248, 255, 0.6),
                inset 0 0 15px rgba(240, 248, 255, 0.1) !important;
            animation: cloudPillowGlow 3s ease-in-out infinite;
        }
        
        .hand-card[data-card-name="CloudPillow"]::before {
            content: "☁️";
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 18px;
            background: radial-gradient(circle, #f0f8ff, #ffffff);
            border-radius: 50%;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            z-index: 10;
            animation: cloudPillowBadgePulse 2.5s ease-in-out infinite;
        }
        
        @keyframes cloudPillowGlow {
            0%, 100% { 
                box-shadow: 
                    0 0 15px rgba(240, 248, 255, 0.6),
                    inset 0 0 15px rgba(240, 248, 255, 0.1);
            }
            50% { 
                box-shadow: 
                    0 0 25px rgba(240, 248, 255, 0.9),
                    inset 0 0 25px rgba(240, 248, 255, 0.2);
            }
        }
        
        @keyframes cloudPillowBadgePulse {
            0%, 100% { 
                transform: scale(1);
                filter: drop-shadow(0 0 5px rgba(240, 248, 255, 0.8));
            }
            50% { 
                transform: scale(1.05);
                filter: drop-shadow(0 0 10px rgba(240, 248, 255, 1));
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in battle flow
export async function applyCloudPillowBattleEffects(battleManager) {
    return await cloudPillowArtifact.applyCloudPillowEffects(battleManager);
}

// Export guest handlers
export function handleGuestCloudPillowEffects(data, battleManager) {
    return cloudPillowArtifact.handleGuestCloudPillowEffects(data, battleManager);
}

export async function handleGuestCloudPillowProtection(data, battleManager) {
    return await cloudPillowArtifact.handleGuestCloudPillowProtection(data, battleManager);
}