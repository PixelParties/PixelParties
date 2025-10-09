// ./Artifacts/antiIntruderSystem.js - Anti-Intruder System Permanent Artifact

export const antiIntruderSystemArtifact = {
    // Card name this artifact handles
    cardName: 'AntiIntruderSystem',
    
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
        const cost = cardInfo?.cost || 0;
        
        // Check if player has enough gold
        if (cost > 0) {
            const currentGold = goldManager.getPlayerGold();
            if (currentGold < cost) {
                this.showAntiIntruderError(
                    `Need ${cost} Gold. Have ${currentGold} Gold.`,
                    cardIndex
                );
                return;
            }
            
            // Spend the gold
            goldManager.addPlayerGold(-cost, 'AntiIntruderSystem');
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
        this.showAntiIntruderActivation(cardIndex, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        await heroSelection.sendFormationUpdate();
    },
    
    // Show error message when not enough gold
    showAntiIntruderError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'anti-intruder-error';
        errorDiv.innerHTML = `
            <div class="anti-intruder-error-content">
                <span class="anti-intruder-error-icon">⛔</span>
                <span class="anti-intruder-error-text">${message}</span>
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
                const handRect = handContainer.getBoundingClientRect();
                errorDiv.style.left = `${handRect.left + handRect.width / 2}px`;
                errorDiv.style.top = `${handRect.top - 60}px`;
            }
        } else {
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
            animation: antiIntruderErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'antiIntruderErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show activation animation
    showAntiIntruderActivation(cardIndex, cost) {
        const activationBurst = document.createElement('div');
        activationBurst.className = 'anti-intruder-activation';
        activationBurst.innerHTML = `
            <div class="intruder-burst">
                <span class="intruder-particle">🎯</span>
                <span class="intruder-particle">🔴</span>
                <span class="intruder-particle">🎯</span>
            </div>
            <div class="intruder-text">Anti-Intruder System Armed!</div>
            <div class="intruder-subtext">Will eliminate enemy creatures at battle start</div>
            ${cost > 0 ? `<div class="intruder-cost">Cost: ${cost} Gold</div>` : ''}
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
     * Apply Anti-Intruder System effects at battle start (BEFORE other permanent effects)
     * @param {BattleManager} battleManager - The battle manager instance
     */
    async applyAntiIntruderEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) {
            return; // Only host applies these effects
        }
        
        // Count Anti-Intruder Systems from each player
        const playerSystems = (battleManager.playerPermanentArtifacts || [])
            .filter(artifact => artifact.name === 'AntiIntruderSystem');
        const opponentSystems = (battleManager.opponentPermanentArtifacts || [])
            .filter(artifact => artifact.name === 'AntiIntruderSystem');
        
        const totalSystems = playerSystems.length + opponentSystems.length;
        
        if (totalSystems === 0) {
            return; // No systems to process
        }
        
        battleManager.addCombatLog(
            `🎯 ${totalSystems} Anti-Intruder System${totalSystems > 1 ? 's' : ''} activate${totalSystems === 1 ? 's' : ''}!`,
            'info'
        );
        
        let systemIndex = 0;
        
        // Fire player's systems at opponent creatures
        for (let i = 0; i < playerSystems.length; i++) {
            await this.fireSystemAtEnemies(battleManager, systemIndex, 'player');
            systemIndex++;
            
            // Small delay between system shots
            if (systemIndex < totalSystems) {
                await battleManager.delay(300);
            }
        }
        
        // Fire opponent's systems at player creatures
        for (let i = 0; i < opponentSystems.length; i++) {
            await this.fireSystemAtEnemies(battleManager, systemIndex, 'opponent');
            systemIndex++;
            
            // Small delay between system shots
            if (systemIndex < totalSystems) {
                await battleManager.delay(300);
            }
        }
        
        // Sync to guest
        battleManager.sendBattleUpdate('anti_intruder_effects_complete', {
            playerSystems: playerSystems.length,
            opponentSystems: opponentSystems.length,
            totalSystems: totalSystems,
            timestamp: Date.now()
        });
    },
    
    /**
     * Fire Anti-Intruder System at enemies
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {number} systemIndex - Which system is firing (for variety)
     * @param {string} ownerSide - Who owns the system ('player' or 'opponent')
     */
    async fireSystemAtEnemies(battleManager, systemIndex = 0, ownerSide = 'player') {
        // Determine target side (opposite of owner)
        const targetSide = ownerSide === 'player' ? 'opponent' : 'player';
        const targetHeroes = targetSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        
        // Collect all living enemy creatures
        const allTargets = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = targetHeroes[position];
            if (hero && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        allTargets.push({
                            creature: creature,
                            hero: hero,
                            creatureIndex: index,
                            position: position,
                            side: targetSide
                        });
                    }
                });
            }
        });
        
        if (allTargets.length === 0) {
            const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
            battleManager.addCombatLog(
                `🎯 ${ownerName}'s Anti-Intruder System finds no targets!`,
                'info'
            );
            return;
        }
        
        // Choose random target
        const randomIndex = battleManager.getRandomInt(0, allTargets.length - 1);
        const targetData = allTargets[randomIndex];
        
        // Get source hero for firing position (use center hero as source)
        const archerPosition = 'center';
        const archerHeroes = ownerSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const archerHero = archerHeroes[archerPosition];
        
        if (!archerHero) {
            console.error('No hero found at center position for Anti-Intruder System');
            return;
        }
        
        // CRITICAL: Send sync to guest BEFORE starting animation
        // This ensures guest starts animation at the same time as host
        battleManager.sendBattleUpdate('anti_intruder_strike', {
            ownerSide: ownerSide,
            targetData: {
                type: 'creature',
                side: targetData.side,
                absoluteSide: targetData.hero.absoluteSide,
                position: targetData.position,
                creatureIndex: targetData.creatureIndex,
                targetName: targetData.creature.name
            },
            damage: 200, // SYSTEM_DAMAGE constant
            systemIndex: systemIndex,
            timestamp: Date.now()
        });
        
        // Small delay to ensure guest receives message
        await battleManager.delay(50);
        
        // Create arrow animation on host
        await this.createSystemArrow(battleManager, archerHero, targetData, ownerSide);
        
        // Apply 200 damage to the creature AFTER arrow hits
        const SYSTEM_DAMAGE = 200;
        await battleManager.combatManager.authoritative_applyDamageToCreature({
            hero: targetData.hero,
            creature: targetData.creature,
            creatureIndex: targetData.creatureIndex,
            damage: SYSTEM_DAMAGE,
            position: targetData.position,
            side: targetData.side
        }, {
            source: 'anti_intruder',
            attacker: null // No specific attacker
        });
        
        // Log the hit
        const ownerName = ownerSide === 'player' ? 'Player' : 'Opponent';
        battleManager.addCombatLog(
            `🎯 ${ownerName}'s Anti-Intruder System strikes ${targetData.creature.name} for ${SYSTEM_DAMAGE} damage!`,
            'info'
        );
    },
    
    /**
     * Create arrow projectile using Archer's animation system
     * @param {BattleManager} battleManager - The battle manager instance
     * @param {Object} sourceHero - Hero from which to fire (for positioning)
     * @param {Object} targetData - Target information
     * @param {string} ownerSide - Owner side
     */
    async createSystemArrow(battleManager, sourceHero, targetData, ownerSide) {
        // Get source element (use hero card as source)
        const sourceElement = document.querySelector(
            `.${ownerSide}-slot.${sourceHero.position}-slot .battle-hero-card`
        );
        
        // Get target element
        let targetElement = document.querySelector(
            `.${targetData.side}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
        );
        
        if (!sourceElement || !targetElement) {
            console.warn('Could not find elements for Anti-Intruder System arrow');
            return;
        }
        
        // Create arrow projectile (reusing Archer's arrow creation logic)
        const projectile = this.createArrowProjectile(sourceElement, targetElement, battleManager);
        if (!projectile) {
            console.error('Failed to create Anti-Intruder arrow');
            return;
        }
        
        // Calculate travel time
        const ARROW_TRAVEL_TIME = 500;
        const adjustedTravelTime = battleManager.getSpeedAdjustedDelay(ARROW_TRAVEL_TIME);
        
        // Wait for arrow to reach target
        await battleManager.delay(adjustedTravelTime);
        
        // Create impact effect
        this.createImpactEffect(targetElement);
        
        // Remove projectile after impact
        if (projectile && projectile.parentNode) {
            projectile.remove();
        }
    },
    
    /**
     * Create arrow projectile (adapted from Archer module)
     */
    createArrowProjectile(fromElement, toElement, battleManager) {
        if (!fromElement || !toElement) {
            return null;
        }
        
        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            return null;
        }
        
        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();
            
            if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
                return null;
            }
            
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;
            
            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                return null;
            }
            
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance < 10 || distance > 2000) {
                return null;
            }
            
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            
            const projectile = document.createElement('div');
            projectile.className = 'anti-intruder-arrow';
            
            const ARROW_TRAVEL_TIME = 500;
            const adjustedTravelTime = battleManager.getSpeedAdjustedDelay(ARROW_TRAVEL_TIME);
            
            // Red/tech themed arrow instead of brown
            projectile.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                width: 35px;
                height: 5px;
                background: linear-gradient(90deg, 
                    #8B0000 0%, 
                    #DC143C 20%, 
                    #FF0000 50%, 
                    #DC143C 80%, 
                    #8B0000 100%);
                transform-origin: 0 50%;
                transform: rotate(${angle}deg);
                z-index: 1500;
                pointer-events: none;
                border-radius: 2px;
                box-shadow: 
                    0 1px 3px rgba(0, 0, 0, 0.6),
                    0 0 10px rgba(255, 0, 0, 0.5),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4);
                --target-x: ${deltaX}px;
                --target-y: ${deltaY}px;
                --angle: ${angle}deg;
            `;
            
            // Red arrowhead
            const arrowhead = document.createElement('div');
            arrowhead.className = 'anti-intruder-arrow-head';
            arrowhead.style.cssText = `
                position: absolute;
                right: -10px;
                top: -5px;
                width: 0;
                height: 0;
                border-left: 15px solid #8B0000;
                border-top: 7px solid transparent;
                border-bottom: 7px solid transparent;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 5px rgba(255, 0, 0, 0.5));
            `;
            
            projectile.appendChild(arrowhead);
            
            // Tech-themed fletching
            const fletching = document.createElement('div');
            fletching.className = 'anti-intruder-arrow-fletching';
            fletching.style.cssText = `
                position: absolute;
                left: -8px;
                top: -3px;
                width: 10px;
                height: 10px;
                background: linear-gradient(45deg, #FF4500, #FF6347);
                clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
                opacity: 0.9;
            `;
            
            projectile.appendChild(fletching);
            
            document.body.appendChild(projectile);
            
            // Manually animate the arrow instead of using CSS animation
            // This gives us better control over cleanup
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / adjustedTravelTime, 1);
                
                if (progress < 1) {
                    // Update position
                    const currentX = deltaX * progress;
                    const currentY = deltaY * progress;
                    projectile.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${angle}deg)`;
                    
                    requestAnimationFrame(animate);
                } else {
                    // Animation complete - arrow has reached target
                    projectile.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${angle}deg)`;
                }
            };
            
            requestAnimationFrame(animate);
            
            return projectile;
            
        } catch (error) {
            console.error('Error creating anti-intruder arrow:', error);
            return null;
        }
    },
    
    /**
     * Create impact effect at target location
     */
    createImpactEffect(targetElement) {
        if (!targetElement) return;
        
        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const impact = document.createElement('div');
        impact.className = 'anti-intruder-impact-effect';
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 50px;
            height: 50px;
            background: radial-gradient(circle, 
                rgba(255, 0, 0, 0.9) 0%, 
                rgba(255, 69, 0, 0.7) 40%, 
                rgba(255, 215, 0, 0.5) 70%, 
                transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: antiIntruderImpact 0.6s ease-out forwards;
            box-shadow: 0 0 15px rgba(255, 0, 0, 0.8);
        `;
        
        document.body.appendChild(impact);
        
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 600);
    },
    
    // ============================================
    // GUEST HANDLERS
    // ============================================
    
    /**
     * Handle Anti-Intruder effects completion on guest side
     */
    handleGuestAntiIntruderEffects(data, battleManager) {
        const { playerSystems, opponentSystems, totalSystems } = data;
        
        battleManager.addCombatLog(
            `🎯 ${totalSystems} Anti-Intruder System${totalSystems > 1 ? 's' : ''} activate${totalSystems === 1 ? 's' : ''}!`,
            'info'
        );
        
        if (playerSystems > 0) {
            battleManager.addCombatLog(`🎯 Player fires ${playerSystems} System${playerSystems > 1 ? 's' : ''}!`, 'success');
        }
        if (opponentSystems > 0) {
            battleManager.addCombatLog(`🎯 Opponent fires ${opponentSystems} System${opponentSystems > 1 ? 's' : ''}!`, 'error');
        }
    },
    
    /**
     * Handle individual strike on guest side
     * CRITICAL: This runs BEFORE creature dies on guest, allowing proper animation sync
     */
    async handleGuestAntiIntruderStrike(data, battleManager) {
        const { ownerSide, targetData, damage, systemIndex } = data;
        
        // Determine local sides
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        
        // Map ownerSide ('player'/'opponent' from host perspective) to absolute side
        const ownerAbsoluteSide = ownerSide === 'player' ? 'host' : 'guest';
        const ownerLocalSide = (ownerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Map target side using absoluteSide from targetData
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find source element (hero card at center position)
        const sourceElement = document.querySelector(
            `.${ownerLocalSide}-slot.center-slot .battle-hero-card`
        );
        
        // Find target element
        const targetElement = document.querySelector(
            `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
        );
        
        if (!sourceElement || !targetElement) {
            console.warn('Guest: Could not find elements for Anti-Intruder arrow animation');
            console.log('Owner local side:', ownerLocalSide, 'Target local side:', targetLocalSide);
            console.log('Target data:', targetData);
            // Still show the combat log even if animation fails
            const ownerName = ownerLocalSide === 'player' ? 'Player' : 'Opponent';
            battleManager.addCombatLog(
                `🎯 ${ownerName}'s Anti-Intruder System strikes ${targetData.targetName} for ${damage} damage!`,
                'info'
            );
            return;
        }
        
        // Create arrow projectile - PASS battleManager to createArrowProjectile
        const projectile = this.createArrowProjectile(sourceElement, targetElement, battleManager);
        if (!projectile) {
            console.error('Guest: Failed to create Anti-Intruder arrow');
            return;
        }
        
        // Calculate travel time
        const ARROW_TRAVEL_TIME = 500;
        const adjustedTravelTime = battleManager.getSpeedAdjustedDelay(ARROW_TRAVEL_TIME);
        
        // Wait for arrow to reach target
        await new Promise(resolve => setTimeout(resolve, adjustedTravelTime));
        
        // Create impact effect
        this.createImpactEffect(targetElement);
        
        // Remove projectile after impact - CRITICAL FOR CLEANUP
        if (projectile && projectile.parentNode) {
            projectile.remove();
        }
        
        // Log the strike
        const ownerName = ownerLocalSide === 'player' ? 'Player' : 'Opponent';
        battleManager.addCombatLog(
            `🎯 ${ownerName}'s Anti-Intruder System strikes ${targetData.targetName} for ${damage} damage!`,
            'info'
        );
    }
};

// Add styles for the animations
if (typeof document !== 'undefined' && !document.getElementById('antiIntruderStyles')) {
    const style = document.createElement('style');
    style.id = 'antiIntruderStyles';
    style.textContent = `
        /* Anti-Intruder Activation */
        .anti-intruder-activation {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: intruderActivation 3s ease-out forwards;
        }
        
        .intruder-burst {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            animation: intruderBurst 2s ease-out;
            justify-content: center;
        }
        
        .intruder-particle {
            font-size: 36px;
            animation: intruderSpin 1.5s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.8));
        }
        
        .intruder-particle:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .intruder-particle:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        .intruder-text {
            font-size: 24px;
            font-weight: bold;
            color: #ff0000;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(255, 0, 0, 0.8);
            text-align: center;
            animation: intruderTextPulse 0.8s ease-out;
            margin-bottom: 5px;
        }
        
        .intruder-subtext {
            font-size: 16px;
            color: #fff;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.5s ease-out 0.3s forwards;
        }
        
        .intruder-cost {
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
        .anti-intruder-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .anti-intruder-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .anti-intruder-error-icon {
            font-size: 20px;
        }
        
        .anti-intruder-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes antiIntruderErrorBounce {
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
        
        @keyframes antiIntruderErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Impact animation */
        @keyframes antiIntruderImpact {
            0% { 
                opacity: 1;
                transform: translate(-50%, -50%) scale(0.4);
            }
            40% { 
                opacity: 0.9;
                transform: translate(-50%, -50%) scale(1.3);
            }
            100% { 
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.2);
            }
        }
        
        @keyframes intruderActivation {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }
        
        @keyframes intruderBurst {
            0% { transform: translateY(0); }
            100% { transform: translateY(-60px); }
        }
        
        @keyframes intruderSpin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.3); }
            100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes intruderTextPulse {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        /* Card glow in hand */
        .hand-card[data-card-name="AntiIntruderSystem"] {
            position: relative;
            border: 2px solid #ff0000 !important;
            box-shadow: 
                0 0 15px rgba(255, 0, 0, 0.6),
                inset 0 0 15px rgba(255, 0, 0, 0.1) !important;
            animation: antiIntruderGlow 3s ease-in-out infinite;
        }
        
        .hand-card[data-card-name="AntiIntruderSystem"]::before {
            content: "🎯";
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 20px;
            background: radial-gradient(circle, #ff0000, #ffffff);
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            z-index: 10;
            animation: antiIntruderBadgePulse 2s ease-in-out infinite;
        }
        
        @keyframes antiIntruderGlow {
            0%, 100% { 
                box-shadow: 
                    0 0 15px rgba(255, 0, 0, 0.6),
                    inset 0 0 15px rgba(255, 0, 0, 0.1);
            }
            50% { 
                box-shadow: 
                    0 0 25px rgba(255, 0, 0, 0.9),
                    inset 0 0 25px rgba(255, 0, 0, 0.2);
            }
        }
        
        @keyframes antiIntruderBadgePulse {
            0%, 100% { 
                transform: scale(1);
                filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.8));
            }
            50% { 
                transform: scale(1.1);
                filter: drop-shadow(0 0 10px rgba(255, 0, 0, 1));
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in battle flow
export async function applyAntiIntruderBattleEffects(battleManager) {
    return await antiIntruderSystemArtifact.applyAntiIntruderEffects(battleManager);
}

// Export guest handlers
export function handleGuestAntiIntruderEffects(data, battleManager) {
    return antiIntruderSystemArtifact.handleGuestAntiIntruderEffects(data, battleManager);
}

export async function handleGuestAntiIntruderStrike(data, battleManager) {
    // Call the method with correct context binding
    return await antiIntruderSystemArtifact.handleGuestAntiIntruderStrike.call(
        antiIntruderSystemArtifact, 
        data, 
        battleManager
    );
}