// snowCannon.js - Snow Cannon Permanent Artifact Module

export const snowCannonArtifact = {
    // Card name this artifact handles
    cardName: 'SnowCannon',
    
    // Handle card click/drag (consume and add to permanents)
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`❄️ Snow Cannon activated at index ${cardIndex}`);
        
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
            console.log('❄️ Snow Cannon added to permanent artifacts!');
            
            // Update the permanent artifacts indicator
            if (window.heroSelection && window.heroSelection.heroSelectionUI) {
                window.heroSelection.heroSelectionUI.updatePermanentArtifactsIndicator();
            }
        }
        
        // Show visual feedback
        this.showSnowCannonActivation(cardIndex);
        
        // Update UI
        heroSelection.updateHandDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`❄️ Snow Cannon consumed and added to permanent artifacts!`);
    },
    
    // Show activation animation
    showSnowCannonActivation(cardIndex) {
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
        
        // Get permanent artifacts from battle manager
        const permanentArtifacts = battleManager.battlePermanentArtifacts || [];
        
        // Count Snow Cannons
        const snowCannonCount = permanentArtifacts.filter(artifact => 
            artifact.name === 'SnowCannon'
        ).length;
        
    console.log("SNOW CANNON TEST!");
    console.log("Snow Cannon Count: " + snowCannonCount);
        
        if (snowCannonCount === 0) {
            return; // No Snow Cannons to process
        }
        
        console.log(`❄️ Activating ${snowCannonCount} Snow Cannon${snowCannonCount > 1 ? 's' : ''}!`);
        battleManager.addCombatLog(
            `❄️ ${snowCannonCount} Snow Cannon${snowCannonCount > 1 ? 's' : ''} activate${snowCannonCount === 1 ? 's' : ''}!`,
            'info'
        );
        
        // Apply frozen to random enemies for each Snow Cannon
        for (let i = 0; i < snowCannonCount; i++) {
            await this.fireSnowCannon(battleManager, i);
            
            // Small delay between cannon shots for visual clarity
            if (i < snowCannonCount - 1) {
                await battleManager.delay(300);
            }
        }
        
        // Sync to guest
        battleManager.sendBattleUpdate('snow_cannon_effects_complete', {
            cannonCount: snowCannonCount,
            timestamp: Date.now()
        });
    },
    
    /**
     * Fire a single Snow Cannon at a random enemy
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {number} cannonIndex - Which cannon is firing (for visual variety)
     */
    async fireSnowCannon(battleManager, cannonIndex = 0) {
        // Get all possible enemy targets (heroes and creatures)
        const allTargets = [];
        
        // Add enemy heroes
        ['left', 'center', 'right'].forEach(position => {
            const hero = battleManager.opponentHeroes[position];
            if (hero && hero.alive) {
                allTargets.push({
                    target: hero,
                    type: 'hero',
                    side: 'opponent',
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
                            side: 'opponent',
                            position: position,
                            creatureIndex: index
                        });
                    }
                });
            }
        });
        
        if (allTargets.length === 0) {
            console.log('❄️ No valid targets for Snow Cannon');
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
        battleManager.addCombatLog(
            `❄️ Snow Cannon freezes ${targetName}!`,
            'info'
        );
        
        // Sync specific freeze to guest for animation
        battleManager.sendBattleUpdate('snow_cannon_freeze', {
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
        const { cannonCount } = data;
        
        battleManager.addCombatLog(
            `❄️ ${cannonCount} Snow Cannon${cannonCount > 1 ? 's' : ''} activate${cannonCount === 1 ? 's' : ''}!`,
            'info'
        );
    },
    
    /**
     * Handle individual freeze on guest side
     * @param {Object} data - Freeze data from host
     * @param {BattleManager} battleManager - The battle manager instance
     */
    async handleGuestSnowCannonFreeze(data, battleManager) {
        const { targetData, cannonIndex } = data;
        
        // Create the animation
        await this.createSnowballBarrage(battleManager, targetData);
        
        // Log the freeze
        battleManager.addCombatLog(
            `❄️ Snow Cannon freezes ${targetData.targetName}!`,
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