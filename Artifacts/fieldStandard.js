// fieldStandard.js - Field Standard Permanent Artifact Module

export const fieldStandardArtifact = {
    // Card name this artifact handles
    cardName: 'FieldStandard',
    
    // Handle card click/drag (consume and add to permanents)
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`🎺 Field Standard activated at index ${cardIndex}`);
        
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
            console.log('🎺 Field Standard added to permanent artifacts!');
            
            // Update the permanent artifacts indicator
            if (window.heroSelection && window.heroSelection.heroSelectionUI) {
                window.heroSelection.heroSelectionUI.updatePermanentArtifactsIndicator();
            }
        }
        
        // Show visual feedback
        this.showFieldStandardActivation(cardIndex);
        
        // Update UI
        heroSelection.updateHandDisplay();
        
        // Save game state
        await heroSelection.saveGameState();

        await heroSelection.sendFormationUpdate();
        
        console.log(`🎺 Field Standard consumed and added to permanent artifacts!`);
    },
    
    // Show activation animation
    showFieldStandardActivation(cardIndex) {
        const activationBurst = document.createElement('div');
        activationBurst.className = 'field-standard-activation';
        activationBurst.innerHTML = `
            <div class="standard-burst">
                <span class="standard-particle">🎺</span>
                <span class="standard-particle">🏴</span>
                <span class="standard-particle">🎺</span>
            </div>
            <div class="standard-text">Field Standard Raised!</div>
            <div class="standard-subtext">Will rally creatures at battle start</div>
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
     * Apply Field Standard effects at battle start
     * Called after other battle start effects like potions
     * @param {BattleManager} battleManager - The battle manager instance
     */
    async applyFieldStandardEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) {
            return; // Only host applies these effects
        }
        
        // Count Field Standards from each player
        const playerStandards = (battleManager.playerPermanentArtifacts || [])
            .filter(artifact => artifact.name === 'FieldStandard');
        const opponentStandards = (battleManager.opponentPermanentArtifacts || [])
            .filter(artifact => artifact.name === 'FieldStandard');
        
        const totalStandards = playerStandards.length + opponentStandards.length;

        console.log("FIELD STANDARD DEBUG:");
        console.log("playerPermanentArtifacts:", battleManager.playerPermanentArtifacts);
        console.log("opponentPermanentArtifacts:", battleManager.opponentPermanentArtifacts);

        // Check if artifacts exist but with different names
        const allPlayerArtifacts = battleManager.playerPermanentArtifacts || [];
        const allOpponentArtifacts = battleManager.opponentPermanentArtifacts || [];
        console.log("All player artifact names:", allPlayerArtifacts.map(a => a.name || a));
        console.log("All opponent artifact names:", allOpponentArtifacts.map(a => a.name || a));
        
        if (totalStandards === 0) {
            return; // No Field Standards to process
        }
        
        console.log(`🎺 Activating ${totalStandards} Field Standard${totalStandards > 1 ? 's' : ''}!`);
        battleManager.addCombatLog(
            `🎺 ${totalStandards} Field Standard${totalStandards > 1 ? 's' : ''} rally the troops!`,
            'info'
        );
        
        let standardIndex = 0;
        
        // Player's Field Standards rally player's creatures
        for (let i = 0; i < playerStandards.length; i++) {
            await this.rallyRandomCreatureForOwner(battleManager, 'player', standardIndex);
            standardIndex++;
            
            // Small delay between standard activations
            if (standardIndex < totalStandards) {
                await battleManager.delay(500);
            }
        }
        
        // Opponent's Field Standards rally opponent's creatures
        for (let i = 0; i < opponentStandards.length; i++) {
            await this.rallyRandomCreatureForOwner(battleManager, 'opponent', standardIndex);
            standardIndex++;
            
            // Small delay between standard activations
            if (standardIndex < totalStandards) {
                await battleManager.delay(500);
            }
        }
        
        // Sync to guest
        battleManager.sendBattleUpdate('field_standard_effects_complete', {
            playerStandards: playerStandards.length,
            opponentStandards: opponentStandards.length,
            totalStandards: totalStandards,
            timestamp: Date.now()
        });
    },
    
    
    /**
     * Rally a random creature for the specified side
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {string} side - 'host' or 'guest'
     * @param {number} standardIndex - Which standard this is (for logging)
     */
    async rallyRandomCreatureForOwner(battleManager, ownerSide, standardIndex = 0) {
        // Field Standards rally the owner's creatures (not the enemy's)
        const heroes = ownerSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const allCreatures = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        allCreatures.push({
                            creature: creature,
                            hero: hero,
                            position: position,
                            creatureIndex: index,
                            side: ownerSide // Use the owner side directly
                        });
                    }
                });
            }
        });
        
        if (allCreatures.length === 0) {
            const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
            console.log(`🎺 No creatures available to rally for ${ownerName}`);
            battleManager.addCombatLog(`🎺 ${ownerName}'s Field Standard sounds, but no creatures respond!`, 'info');
            return;
        }
        
        // Choose random creature
        const randomIndex = battleManager.getRandomInt(0, allCreatures.length - 1);
        const chosenCreature = allCreatures[randomIndex];
        
        // Show trumpet animation
        await this.createTrumpetAnimation(battleManager, chosenCreature);
        
        // Execute the creature's special attack
        await this.executeCreatureRally(battleManager, chosenCreature);
        
        // Log the rally
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        const rallyLogSide = ownerSide === 'player' ? 'success' : 'error';
        battleManager.addCombatLog(
            `🎺 ${ownerName}'s Field Standard rallies ${chosenCreature.creature.name}!`,
            rallyLogSide
        );
        
        // Sync specific rally to guest
        battleManager.sendBattleUpdate('field_standard_rally', {
            ownerSide: ownerSide,
            creatureData: {
                position: chosenCreature.position,
                creatureIndex: chosenCreature.creatureIndex,
                creatureName: chosenCreature.creature.name
            },
            standardIndex: standardIndex,
            timestamp: Date.now()
        });
    },
    
    /**
     * Create trumpet animation above a creature
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {Object} creatureData - Information about the creature
     */
    async createTrumpetAnimation(battleManager, creatureData) {
        let targetElement;
        
        targetElement = document.querySelector(
            `.${creatureData.side}-slot.${creatureData.position}-slot .creature-icon[data-creature-index="${creatureData.creatureIndex}"]`
        );
        
        if (!targetElement) return;
        
        // Create trumpet animation
        const trumpet = document.createElement('div');
        trumpet.className = 'field-standard-trumpet';
        trumpet.innerHTML = '🎺';
        
        trumpet.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 24px;
            z-index: 500;
            pointer-events: none;
            animation: trumpetRally ${battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
        `;
        
        targetElement.appendChild(trumpet);
        
        // Create sound waves
        for (let i = 0; i < 3; i++) {
            const wave = document.createElement('div');
            wave.className = 'trumpet-wave';
            wave.innerHTML = '♪';
            wave.style.cssText = `
                position: absolute;
                top: -25px;
                left: ${30 + (i * 20)}%;
                transform: translateX(-50%);
                font-size: 16px;
                z-index: 499;
                pointer-events: none;
                animation: trumpetWave ${battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
                animation-delay: ${i * 150}ms;
                opacity: 0;
            `;
            targetElement.appendChild(wave);
            
            setTimeout(() => wave.remove(), battleManager.getSpeedAdjustedDelay(1000));
        }
        
        setTimeout(() => trumpet.remove(), battleManager.getSpeedAdjustedDelay(800));
        
        // Wait for animation to complete
        await battleManager.delay(300);
    },
    
    /**
     * Execute the creature's rally (special attack)
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {Object} creatureData - Information about the creature
     */
    async executeCreatureRally(battleManager, creatureData) {
        // Create actor object similar to normal creature actions
        const actor = {
            type: 'creature',
            name: creatureData.creature.name,
            data: creatureData.creature,
            index: creatureData.creatureIndex,
            hero: creatureData.hero
        };
        
        // Execute creature special attack based on type
        try {
            const creatureName = creatureData.creature.name;
            
            // Import creature classes as needed and execute their special attacks
            if (creatureName.includes('Jiggles')) {
                if (battleManager.jigglesManager) {
                    await battleManager.jigglesManager.executeSpecialAttack(actor, creatureData.position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonArcher') {
                if (battleManager.skeletonArcherManager) {
                    await battleManager.skeletonArcherManager.executeSpecialAttack(actor, creatureData.position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonNecromancer') {
                if (battleManager.skeletonNecromancerManager) {
                    await battleManager.skeletonNecromancerManager.executeSpecialAttack(actor, creatureData.position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonDeathKnight') {
                if (battleManager.skeletonDeathKnightManager) {
                    await battleManager.skeletonDeathKnightManager.executeSpecialAttack(actor, creatureData.position);
                    return;
                }
            }
            
            if (creatureName === 'BurningSkeleton') {
                if (battleManager.burningSkeletonManager) {
                    await battleManager.burningSkeletonManager.executeSpecialAttack(actor, creatureData.position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonReaper') {
                if (battleManager.skeletonReaperManager) {
                    await battleManager.skeletonReaperManager.executeSpecialAttack(actor, creatureData.position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonBard') {
                if (battleManager.skeletonBardManager) {
                    await battleManager.skeletonBardManager.executeSpecialAttack(actor, creatureData.position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonMage') {
                if (battleManager.skeletonMageManager) {
                    await battleManager.skeletonMageManager.executeSpecialAttack(actor, creatureData.position);
                    return;
                }
            }
            
            if (creatureName === 'FrontSoldier') {
                if (battleManager.frontSoldierManager) {
                    await battleManager.frontSoldierManager.executeSpecialAttack(actor, creatureData.position);
                    return;
                }
            }
            
            if (creatureName === 'Archer') {
                if (battleManager.archerManager) {
                    await battleManager.archerManager.executeSpecialAttack(actor, creatureData.position);
                    return;
                }
            }
            
            // Default action for creatures without special attacks - just shake
            await battleManager.animationManager.shakeCreature(creatureData.side, creatureData.position, creatureData.creatureIndex);
            
        } catch (error) {
            console.error('Error executing creature rally:', error);
            // Fallback to simple shake animation
            await battleManager.animationManager.shakeCreature(creatureData.side, creatureData.position, creatureData.creatureIndex);
        }
    },
    
    // ============================================
    // GUEST HANDLERS
    // ============================================
    
    /**
     * Handle Field Standard effects on guest side
     * @param {Object} data - Effect data from host
     * @param {BattleManager} battleManager - The battle manager instance
     */
    handleGuestFieldStandardEffects(data, battleManager) {
        const { playerStandards, opponentStandards, totalStandards } = data;
        
        battleManager.addCombatLog(
            `🎺 ${totalStandards} Field Standard${totalStandards > 1 ? 's' : ''} rally the troops!`,
            'info'
        );
        
        if (playerStandards > 0) {
            battleManager.addCombatLog(`🎺 Player raises ${playerStandards} Field Standard${playerStandards > 1 ? 's' : ''}!`, 'success');
        }
        if (opponentStandards > 0) {
            battleManager.addCombatLog(`🎺 Opponent raises ${opponentStandards} Field Standard${opponentStandards > 1 ? 's' : ''}!`, 'error');
        }
    },
    
    /**
     * Handle individual rally on guest side
     * @param {Object} data - Rally data from host
     * @param {BattleManager} battleManager - The battle manager instance
     */
    async handleGuestFieldStandardRally(data, battleManager) {
        const { ownerSide, creatureData } = data;
        
        // Convert owner side to local player/opponent side
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const localSide = (ownerSide === 'player') ? 'player' : 'opponent';
        
        // Find the creature element
        const targetElement = document.querySelector(
            `.${localSide}-slot.${creatureData.position}-slot .creature-icon[data-creature-index="${creatureData.creatureIndex}"]`
        );
        
        if (targetElement) {
            // Create the trumpet animation
            await this.createTrumpetAnimationGuest(battleManager, targetElement);
        }
        
        // Log the rally with proper owner identification
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        const rallyLogSide = (ownerSide === 'player') ? 'success' : 'error';
        battleManager.addCombatLog(
            `🎺 ${ownerName}'s Field Standard rallies ${creatureData.creatureName}!`,
            rallyLogSide
        );
    },
    
    /**
     * Create trumpet animation for guest (simpler version)
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {Element} targetElement - The creature element
     */
    async createTrumpetAnimationGuest(battleManager, targetElement) {
        // Create trumpet animation
        const trumpet = document.createElement('div');
        trumpet.className = 'field-standard-trumpet';
        trumpet.innerHTML = '🎺';
        
        trumpet.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 24px;
            z-index: 500;
            pointer-events: none;
            animation: trumpetRally ${battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
        `;
        
        targetElement.appendChild(trumpet);
        
        // Create sound waves
        for (let i = 0; i < 3; i++) {
            const wave = document.createElement('div');
            wave.className = 'trumpet-wave';
            wave.innerHTML = '♪';
            wave.style.cssText = `
                position: absolute;
                top: -25px;
                left: ${30 + (i * 20)}%;
                transform: translateX(-50%);
                font-size: 16px;
                z-index: 499;
                pointer-events: none;
                animation: trumpetWave ${battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
                animation-delay: ${i * 150}ms;
                opacity: 0;
            `;
            targetElement.appendChild(wave);
            
            setTimeout(() => wave.remove(), battleManager.getSpeedAdjustedDelay(1000));
        }
        
        setTimeout(() => trumpet.remove(), battleManager.getSpeedAdjustedDelay(800));
    }
};

// Add styles for the animations
if (typeof document !== 'undefined' && !document.getElementById('fieldStandardStyles')) {
    const style = document.createElement('style');
    style.id = 'fieldStandardStyles';
    style.textContent = `
        /* Field Standard Activation */
        .field-standard-activation {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: standardActivation 3s ease-out forwards;
        }
        
        .standard-burst {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            animation: standardBurst 2s ease-out;
            justify-content: center;
        }
        
        .standard-particle {
            font-size: 36px;
            animation: standardSpin 1.5s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
        }
        
        .standard-particle:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .standard-particle:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        .standard-text {
            font-size: 24px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 215, 0, 0.8);
            text-align: center;
            animation: standardTextPulse 0.8s ease-out;
            margin-bottom: 5px;
        }
        
        .standard-subtext {
            font-size: 16px;
            color: #fff;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.5s ease-out 0.3s forwards;
        }
        
        /* Trumpet rally animation */
        @keyframes trumpetRally {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(10px) scale(0.5);
            }
            50% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.2);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-15px) scale(1);
            }
        }
        
        /* Trumpet wave animation */
        @keyframes trumpetWave {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(0px) scale(0.8);
            }
            50% {
                opacity: 1;
                transform: translateX(-50%) translateY(-10px) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px) scale(0.6);
            }
        }
        
        @keyframes standardActivation {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }
        
        @keyframes standardBurst {
            0% { transform: translateY(0); }
            100% { transform: translateY(-60px); }
        }
        
        @keyframes standardSpin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.3); }
            100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes standardTextPulse {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        /* Card glow in hand */
        .hand-card[data-card-name="FieldStandard"] {
            position: relative;
            border: 2px solid #ffd700 !important;
            box-shadow: 
                0 0 15px rgba(255, 215, 0, 0.6),
                inset 0 0 15px rgba(255, 215, 0, 0.1) !important;
            animation: fieldStandardGlow 3s ease-in-out infinite;
        }
        
        .hand-card[data-card-name="FieldStandard"]::before {
            content: "🎺";
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 20px;
            background: radial-gradient(circle, #ffd700, #ffffff);
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            z-index: 10;
            animation: fieldStandardBadgePulse 2s ease-in-out infinite;
        }
        
        @keyframes fieldStandardGlow {
            0%, 100% { 
                box-shadow: 
                    0 0 15px rgba(255, 215, 0, 0.6),
                    inset 0 0 15px rgba(255, 215, 0, 0.1);
            }
            50% { 
                box-shadow: 
                    0 0 25px rgba(255, 215, 0, 0.9),
                    inset 0 0 25px rgba(255, 215, 0, 0.2);
            }
        }
        
        @keyframes fieldStandardBadgePulse {
            0%, 100% { 
                transform: scale(1);
                filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.8));
            }
            50% { 
                transform: scale(1.1);
                filter: drop-shadow(0 0 10px rgba(255, 215, 0, 1));
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in battle flow
export async function applyFieldStandardBattleEffects(battleManager) {
    return await fieldStandardArtifact.applyFieldStandardEffects(battleManager);
}

// Export guest handlers
export function handleGuestFieldStandardEffects(data, battleManager) {
    return fieldStandardArtifact.handleGuestFieldStandardEffects(data, battleManager);
}

export async function handleGuestFieldStandardRally(data, battleManager) {
    return await fieldStandardArtifact.handleGuestFieldStandardRally(data, battleManager);
}