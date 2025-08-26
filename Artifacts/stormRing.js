// stormRing.js - Storm Ring Permanent Artifact Module

export const stormRingArtifact = {
    // Card name this artifact handles
    cardName: 'StormRing',
    
    // Handle card click (consume and add to permanents)
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`⛈️ Storm Ring activated at index ${cardIndex}`);
        
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
        const cost = cardInfo?.cost || 2; // Fallback cost if not defined
        
        // Check if player has enough gold
        const currentGold = goldManager.getPlayerGold();
        if (currentGold < cost) {
            this.showStormRingError(
                `Need ${cost} Gold. Have ${currentGold} Gold.`,
                cardIndex
            );
            return;
        }
        
        // Spend the gold
        goldManager.addPlayerGold(-cost, 'StormRing');
        
        console.log(`StormRing: Spent ${cost} gold to activate`);
        
        // Remove card from hand
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Add to permanent artifacts list using global artifactHandler
        if (window.artifactHandler) {
            window.artifactHandler.addPermanentArtifact(this.cardName);
            console.log('⛈️ Storm Ring added to permanent artifacts!');
            
            // Update the permanent artifacts indicator
            if (window.heroSelection && window.heroSelection.heroSelectionUI) {
                window.heroSelection.heroSelectionUI.updatePermanentArtifactsIndicator();
            }
        }
        
        // Show visual feedback
        this.showStormRingActivation(cardIndex, cost);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        await heroSelection.sendFormationUpdate();

        console.log(`⛈️ Storm Ring consumed and added to permanent artifacts for ${cost} gold!`);
    },
    
    // Show error message when not enough gold
    showStormRingError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'storm-ring-error';
        errorDiv.innerHTML = `
            <div class="storm-ring-error-content">
                <span class="storm-ring-error-icon">⛔</span>
                <span class="storm-ring-error-text">${message}</span>
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
            background: linear-gradient(135deg, #4a90e2 0%, #2c5282 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: stormRingErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(74, 144, 226, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after showing
        setTimeout(() => {
            errorDiv.style.animation = 'stormRingErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show activation animation
    showStormRingActivation(cardIndex, cost) {
        const activationBurst = document.createElement('div');
        activationBurst.className = 'storm-ring-activation';
        activationBurst.innerHTML = `
            <div class="storm-burst">
                <span class="storm-particle">⛈️</span>
                <span class="storm-particle">🌪️</span>
                <span class="storm-particle">⛈️</span>
            </div>
            <div class="storm-text">Storm Ring Armed!</div>
            <div class="storm-subtext">Will protect against AOE spells</div>
            <div class="storm-cost">Cost: ${cost} Gold</div>
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
    // AOE SPELL NEGATION LOGIC
    // ============================================
    
    /**
     * Check if an AOE spell should be negated by Storm Ring
     * Called from battleSpellSystem before spell execution
     */
    async checkAoeSpellNegation(casterHero, spell, battleManager) {        
        if (!battleManager || !battleManager.isAuthoritative) {
            return { negated: false }; // Only host handles negation
        }
                        
        // Determine target side (opposite of caster)
        const targetSide = casterHero.side === 'player' ? 'opponent' : 'player';
        
        // Get Storm Ring count for the target side
        const targetPermanentArtifacts = targetSide === 'player' ? 
            (battleManager.playerPermanentArtifacts || []) :
            (battleManager.opponentPermanentArtifacts || []);
                
        const stormRings = targetPermanentArtifacts.filter(artifact => artifact.name === 'StormRing');
                
        if (stormRings.length === 0) {
            return { negated: false }; // No Storm Rings to protect
        }
                
        // Calculate negation chance using formula 1 - 0.9^X
        const stormRingCount = stormRings.length;
        const negationChance = 1 - Math.pow(0.9, stormRingCount);
        
        // Roll for negation
        const roll = battleManager.getRandom();
        const negated = roll <= negationChance;
                
        if (negated) {
            // Show storm protection effect
            await this.showStormProtection(targetSide, battleManager);
            
            // Log the negation
            battleManager.addCombatLog(
                `⛈️ Storm Ring negates ${casterHero.name}'s ${spell.name}!`,
                targetSide === 'player' ? 'success' : 'error'
            );
            
            // Send negation update to guest
            battleManager.sendBattleUpdate('storm_ring_negation', {
                casterAbsoluteSide: casterHero.absoluteSide,
                casterPosition: casterHero.position,
                casterName: casterHero.name,
                spellName: spell.name,
                targetSide: targetSide,
                stormRingCount: stormRingCount,
                negationChance: negationChance,
                timestamp: Date.now()
            });
        }
        
        return { negated: negated };
    },
    
    /**
     * Show storm protection visual effect across entire lineup
     */
    async showStormProtection(protectedSide, battleManager) {
        console.log(`⛈️ Showing storm protection for ${protectedSide} side`);
        
        // Create storm winds across the entire protected lineup
        const positions = ['left', 'center', 'right'];
        const stormEffects = [];
        
        positions.forEach(position => {
            const heroSlot = document.querySelector(`.${protectedSide}-slot.${position}-slot`);
            if (heroSlot) {
                const stormEffect = this.createStormWindEffect();
                heroSlot.appendChild(stormEffect);
                stormEffects.push(stormEffect);
            }
        });
        
        // Wait for storm animation to complete
        await battleManager.delay(2000);
        
        // Clean up storm effects
        stormEffects.forEach(effect => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        });
    },
    
    /**
     * Create storm wind visual effect
     */
    createStormWindEffect() {
        const stormEffect = document.createElement('div');
        stormEffect.className = 'storm-ring-protection';
        stormEffect.innerHTML = `
            <div class="storm-winds">
                <span class="wind-particle">🌪️</span>
                <span class="wind-particle">💨</span>
                <span class="wind-particle">⛈️</span>
                <span class="wind-particle">💨</span>
                <span class="wind-particle">🌪️</span>
            </div>
            <div class="protection-ring">
                <div class="ring-outer"></div>
                <div class="ring-inner"></div>
            </div>
        `;
        
        stormEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            z-index: 600;
            pointer-events: none;
            animation: stormProtection 2s ease-out forwards;
        `;
        
        return stormEffect;
    },
    
    // ============================================
    // GUEST HANDLERS
    // ============================================
    
    /**
     * Handle storm ring negation on guest side
     */
    handleGuestStormRingNegation(data, battleManager) {
        if (battleManager.isAuthoritative) {
            console.warn('Host should not receive storm ring negation messages');
            return;
        }

        const { casterAbsoluteSide, casterPosition, casterName, spellName, targetSide, stormRingCount, negationChance } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetSide === 'player') ? 
            (myAbsoluteSide === 'host' ? 'player' : 'opponent') :
            (myAbsoluteSide === 'host' ? 'opponent' : 'player');
        
        // Show storm protection effect on guest side
        this.showStormProtection(targetLocalSide, battleManager);
        
        // Add to combat log
        const logType = targetLocalSide === 'player' ? 'success' : 'error';
        battleManager.addCombatLog(
            `⛈️ Storm Ring negates ${casterName}'s ${spellName}!`,
            logType
        );
        
        console.log(`GUEST: Storm Ring negation processed for ${spellName}`);
    }
};

// Add styles for the animations
if (typeof document !== 'undefined' && !document.getElementById('stormRingStyles')) {
    const style = document.createElement('style');
    style.id = 'stormRingStyles';
    style.textContent = `
        /* Storm Ring Activation */
        .storm-ring-activation {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: stormRingActivation 3s ease-out forwards;
        }
        
        .storm-burst {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            animation: stormBurst 2s ease-out;
            justify-content: center;
        }
        
        .storm-particle {
            font-size: 36px;
            animation: stormSpin 1.5s ease-out;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(74, 144, 226, 0.8));
        }
        
        .storm-particle:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .storm-particle:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        .storm-text {
            font-size: 24px;
            font-weight: bold;
            color: #4a90e2;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 20px rgba(74, 144, 226, 0.8);
            text-align: center;
            animation: stormTextPulse 0.8s ease-out;
            margin-bottom: 5px;
        }
        
        .storm-subtext {
            font-size: 16px;
            color: #fff;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.5s ease-out 0.3s forwards;
            margin-bottom: 5px;
        }
        
        .storm-cost {
            font-size: 14px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                1px 1px 3px rgba(0, 0, 0, 0.8),
                0 0 15px rgba(255, 215, 0, 0.7);
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.5s ease-out 0.6s forwards;
        }
        
        /* Error styles */
        .storm-ring-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .storm-ring-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .storm-ring-error-icon {
            font-size: 20px;
        }
        
        .storm-ring-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes stormRingErrorBounce {
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
        
        @keyframes stormRingErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Storm Protection Effect */
        .storm-ring-protection {
            pointer-events: none;
        }
        
        .storm-winds {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 120%;
            height: 120%;
        }
        
        .storm-winds .wind-particle {
            position: absolute;
            font-size: 24px;
            animation: windSwirl 2s ease-out forwards;
        }
        
        .storm-winds .wind-particle:nth-child(1) {
            animation-delay: 0s;
            top: 10%;
            left: 10%;
        }
        
        .storm-winds .wind-particle:nth-child(2) {
            animation-delay: 0.2s;
            top: 20%;
            right: 10%;
        }
        
        .storm-winds .wind-particle:nth-child(3) {
            animation-delay: 0.4s;
            bottom: 20%;
            left: 15%;
        }
        
        .storm-winds .wind-particle:nth-child(4) {
            animation-delay: 0.6s;
            bottom: 10%;
            right: 15%;
        }
        
        .storm-winds .wind-particle:nth-child(5) {
            animation-delay: 0.8s;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        .protection-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        .ring-outer {
            position: absolute;
            width: 100px;
            height: 100px;
            border: 3px solid #4a90e2;
            border-radius: 50%;
            top: -50px;
            left: -50px;
            animation: protectionRingExpand 2s ease-out forwards;
            opacity: 0.8;
        }
        
        .ring-inner {
            position: absolute;
            width: 60px;
            height: 60px;
            border: 2px solid #7bb3f0;
            border-radius: 50%;
            top: -30px;
            left: -30px;
            animation: protectionRingExpand 2s ease-out 0.3s forwards;
            opacity: 0.6;
        }
        
        @keyframes stormRingActivation {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }
        
        @keyframes stormBurst {
            0% { transform: translateY(0); }
            100% { transform: translateY(-60px); }
        }
        
        @keyframes stormSpin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.3); }
            100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes stormTextPulse {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes stormProtection {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            30% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
            70% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
        }
        
        @keyframes windSwirl {
            0% { 
                opacity: 0; 
                transform: scale(0.5) rotate(0deg);
            }
            30% { 
                opacity: 1; 
                transform: scale(1.2) rotate(120deg);
            }
            70% { 
                opacity: 1; 
                transform: scale(1) rotate(240deg);
            }
            100% { 
                opacity: 0; 
                transform: scale(0.3) rotate(360deg);
            }
        }
        
        @keyframes protectionRingExpand {
            0% { 
                opacity: 0;
                transform: scale(0.3);
            }
            50% {
                opacity: 1;
                transform: scale(1.2);
            }
            100% { 
                opacity: 0;
                transform: scale(2);
            }
        }
        
        /* Card glow in hand */
        .hand-card[data-card-name="StormRing"] {
            position: relative;
            border: 2px solid #4a90e2 !important;
            box-shadow: 
                0 0 15px rgba(74, 144, 226, 0.6),
                inset 0 0 15px rgba(74, 144, 226, 0.1) !important;
            animation: stormRingGlow 3s ease-in-out infinite;
        }
        
        .hand-card[data-card-name="StormRing"]::before {
            content: "⛈️";
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 20px;
            background: radial-gradient(circle, #4a90e2, #2c5282);
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #7bb3f0;
            z-index: 10;
            animation: stormRingBadgePulse 2s ease-in-out infinite;
        }
        
        @keyframes stormRingGlow {
            0%, 100% { 
                box-shadow: 
                    0 0 15px rgba(74, 144, 226, 0.6),
                    inset 0 0 15px rgba(74, 144, 226, 0.1);
            }
            50% { 
                box-shadow: 
                    0 0 25px rgba(74, 144, 226, 0.9),
                    inset 0 0 25px rgba(74, 144, 226, 0.2);
            }
        }
        
        @keyframes stormRingBadgePulse {
            0%, 100% { 
                transform: scale(1);
                filter: drop-shadow(0 0 5px rgba(74, 144, 226, 0.8));
            }
            50% { 
                transform: scale(1.1);
                filter: drop-shadow(0 0 10px rgba(74, 144, 226, 1));
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in battle flow
export async function checkStormRingNegation(casterHero, spell, battleManager) {
    return await stormRingArtifact.checkAoeSpellNegation(casterHero, spell, battleManager);
}

// Export guest handler
export async function handleGuestStormRingNegation(data, battleManager) {
    return stormRingArtifact.handleGuestStormRingNegation(data, battleManager);
}