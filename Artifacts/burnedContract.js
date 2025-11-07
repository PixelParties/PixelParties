// ./Artifacts/burnedContract.js - BurnedContract Artifact Handler Module
// Sacrifices a random creature (preferring lowest level) to permanently boost all Heroes' stats

export const burnedContractArtifact = {
    // Card name this artifact handles
    cardName: 'BurnedContract',
    
    // Prevent re-entry
    isActivating: false,
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`BurnedContract clicked at index ${cardIndex}`);
        
        // Prevent double-activation
        if (this.isActivating) {
            console.log('⚠️ BurnedContract already activating, ignoring duplicate call');
            return;
        }
        
        // Activate the burned contract effect
        await this.activateBurnedContract(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`BurnedContract dragged outside hand from index ${cardIndex}`);
        
        // Prevent double-activation
        if (this.isActivating) {
            console.log('⚠️ BurnedContract already activating, ignoring duplicate call');
            return;
        }
        
        // Activate the burned contract effect
        await this.activateBurnedContract(cardIndex, heroSelection);
    },

    // Core logic to sacrifice a creature and boost all heroes
    async activateBurnedContract(cardIndex, heroSelection) {
        // Set activation flag
        this.isActivating = true;
        
        try {
            if (!heroSelection) {
                console.error('No heroSelection instance available');
                return;
            }
            
            // Get managers
            const handManager = heroSelection.getHandManager();
            const goldManager = heroSelection.getGoldManager();
            const heroCreatureManager = heroSelection.heroCreatureManager;
            const formationManager = heroSelection.formationManager;
            
            if (!handManager || !goldManager || !heroCreatureManager || !formationManager) {
                console.error('Required managers not available');
                return;
            }
            
            // Get cost from card database
            const cardInfo = heroSelection.getCardInfo(this.cardName);
            const cost = cardInfo?.cost || 0;
            
            // === VALIDATE EVERYTHING FIRST (before spending any resources) ===
            console.log(`🔥 BurnedContract: Validating (Cost: ${cost}, Gold: ${goldManager.getPlayerGold()})`);
            
            // Check if player has enough gold
            const currentGold = goldManager.getPlayerGold();
            if (currentGold < cost) {
                console.log(`❌ BurnedContract: Not enough gold (need ${cost}, have ${currentGold})`);
                this.showBurnedContractError(
                    `Need ${cost} Gold. Have ${currentGold} Gold.`,
                    cardIndex
                );
                return;
            }
            
            // Check if player has any creatures
            const { hasCreatures, lowestLevelCreature } = this.findLowestLevelCreature(heroCreatureManager);
            
            if (!hasCreatures) {
                console.log(`❌ BurnedContract: No creatures available`);
                this.showBurnedContractError(
                    'No Creatures available to sacrifice!',
                    cardIndex
                );
                return;
            }
            
            console.log(`✅ BurnedContract: Checks passed, target: ${lowestLevelCreature.creature.name}`);
            
            // === ALL CHECKS PASSED - NOW COMMIT ===
            
            // Spend the gold
            goldManager.addPlayerGold(-cost, 'BurnedContract');
            console.log(`🔥 BurnedContract: Spent ${cost} gold (remaining: ${goldManager.getPlayerGold()})`);
            
            // Remove BurnedContract card from hand
            const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
            
            if (removedCard !== this.cardName) {
                console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
                return;
            }
            
            console.log(`🔥 BurnedContract: Card removed, starting animation`);
            
            // Play dark ritual animation (1 second delay)
            await this.playDarkRitualAnimation(lowestLevelCreature, heroSelection);
            
            console.log(`🔥 BurnedContract: Animation done, sacrificing`);
            
            // Sacrifice the creature (triggers GraveWorm automatically)
            const sacrificedCreature = heroCreatureManager.sacrificeCreature(
                lowestLevelCreature.position, 
                lowestLevelCreature.index,
                'BurnedContract'
            );
            
            if (!sacrificedCreature) {
                console.error('❌ BurnedContract: Failed to sacrifice');
                return;
            }
            
            console.log(`✅ BurnedContract: Sacrificed ${sacrificedCreature.name}`);
            
            // Add to graveyard
            if (heroSelection.graveyardManager) {
                heroSelection.graveyardManager.addCard(sacrificedCreature.name);
            }
            
            // Define stat bonuses
            const hpBonus = 50;
            const attackBonus = 10;
            
            // Apply permanent stat bonuses to ALL heroes
            const formation = formationManager.getBattleFormation();
            const positions = ['left', 'center', 'right'];
            let heroesBuffed = 0;
            
            positions.forEach(position => {
                const hero = formation[position];
                if (hero) {
                    if (!hero.attackBonusses) hero.attackBonusses = 0;
                    if (!hero.hpBonusses) hero.hpBonusses = 0;
                    
                    hero.attackBonusses += attackBonus;
                    hero.hpBonusses += hpBonus;
                    
                    heroesBuffed++;
                    console.log(`✅ Buffed ${hero.name} (+${attackBonus} ATK, +${hpBonus} HP)`);
                }
            });
            
            console.log(`🔥 BurnedContract: Buffed ${heroesBuffed} heroes total`);
            
            // Show success feedback
            this.showBurnedContractSuccess(sacrificedCreature.name, hpBonus, attackBonus, heroesBuffed);
            
            // Update UI and save state
            heroSelection.updateHandDisplay();
            heroSelection.updateGoldDisplay();
            await heroSelection.saveGameState();
            await heroSelection.sendFormationUpdate();
            
            console.log(`🔥 BurnedContract: COMPLETE! Sacrificed ${sacrificedCreature.name}, buffed ${heroesBuffed} heroes!`);
            
        } catch (error) {
            console.error('❌ BurnedContract: Error during activation:', error);
        } finally {
            // Always clear the flag
            this.isActivating = false;
            console.log(`🔥 BurnedContract: Flag cleared`);
        }
    },
    
    // Find the lowest level creature to sacrifice
    findLowestLevelCreature(heroCreatureManager) {
        const positions = ['left', 'center', 'right'];
        let lowestLevelCreature = null;
        let hasCreatures = false;
        
        positions.forEach(position => {
            const creatures = heroCreatureManager.getHeroCreatures(position);
            
            if (creatures && creatures.length > 0) {
                hasCreatures = true;
                
                creatures.forEach((creature, index) => {
                    // Skip GraveWorms
                    if (creature.name === 'GraveWorm') {
                        return;
                    }
                    
                    const creatureLevel = creature.level || 1;
                    
                    if (!lowestLevelCreature || creatureLevel < lowestLevelCreature.level) {
                        lowestLevelCreature = {
                            creature: creature,
                            level: creatureLevel,
                            position: position,
                            index: index
                        };
                    }
                    else if (creatureLevel === lowestLevelCreature.level && Math.random() < 0.5) {
                        lowestLevelCreature = {
                            creature: creature,
                            level: creatureLevel,
                            position: position,
                            index: index
                        };
                    }
                });
            }
        });
        
        return { hasCreatures, lowestLevelCreature };
    },
    
    // Play dark ritual animation
    async playDarkRitualAnimation(targetCreature, heroSelection) {
        if (!targetCreature) return;
        
        console.log(`🔥 Playing animation on ${targetCreature.creature.name}`);
        
        // Find the creature element
        const creatureElement = document.querySelector(
            `.hero-creatures[data-hero-position="${targetCreature.position}"] .creature-icon[data-creature-index="${targetCreature.index}"]`
        );
        
        // Find all hero card elements
        const heroElements = document.querySelectorAll('.battle-hero-card');
        
        // Create effects
        if (creatureElement) {
            this.createDarkRitualEffect(creatureElement, 'creature');
        } else {
            console.warn(`⚠️ Could not find creature element`);
        }
        
        heroElements.forEach(heroElement => {
            this.createDarkRitualEffect(heroElement, 'hero');
        });
        
        // Wait 1 second using standard Promise
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`✅ Animation complete`);
    },
    
    // Create dark ritual particle effect
    createDarkRitualEffect(element, type) {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        
        const ritualEffect = document.createElement('div');
        ritualEffect.className = `dark-ritual-effect ${type}-ritual`;
        ritualEffect.style.cssText = `
            position: fixed;
            left: ${rect.left + rect.width / 2}px;
            top: ${rect.top + rect.height / 2}px;
            width: ${rect.width * 1.2}px;
            height: ${rect.height * 1.2}px;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 9999;
        `;
        
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = `ritual-particle particle-${i}`;
            ritualEffect.appendChild(particle);
        }
        
        const darkCircle = document.createElement('div');
        darkCircle.className = 'ritual-dark-circle';
        ritualEffect.appendChild(darkCircle);
        
        document.body.appendChild(ritualEffect);
        
        setTimeout(() => {
            if (ritualEffect.parentNode) {
                ritualEffect.remove();
            }
        }, 1200);
    },
    
    // Show error message
    showBurnedContractError(message, cardIndex) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'burned-contract-error';
        errorDiv.innerHTML = `
            <div class="burned-contract-error-content">
                <span class="burned-contract-error-icon">⛔</span>
                <span class="burned-contract-error-text">${message}</span>
            </div>
        `;
        
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
            background: linear-gradient(135deg, #8b0000 0%, #dc143c 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: burnedContractErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(139, 0, 0, 0.6);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'burnedContractErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    },
    
    // Show success feedback
    showBurnedContractSuccess(sacrificedName, hpBonus, attackBonus, heroesBuffed) {
        const successDiv = document.createElement('div');
        successDiv.className = 'burned-contract-success';
        successDiv.innerHTML = `
            <div class="burned-contract-success-content">
                <div class="success-icon">🔥</div>
                <div class="success-title">Dark Ritual Complete!</div>
                <div class="success-details">
                    <div class="sacrifice-text">Sacrificed: ${sacrificedName}</div>
                    <div class="buff-text">+${hpBonus} HP & +${attackBonus} ATK to ${heroesBuffed} ${heroesBuffed === 1 ? 'Hero' : 'Heroes'}!</div>
                </div>
            </div>
        `;
        
        successDiv.style.cssText = `
            position: fixed;
            left: 50%;
            top: 30%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1a0000 0%, #4a0000 100%);
            color: #ff6b6b;
            padding: 24px;
            border-radius: 16px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            pointer-events: none;
            animation: burnedContractSuccessBounce 0.6s ease-out;
            box-shadow: 
                0 8px 32px rgba(139, 0, 0, 0.8),
                inset 0 0 30px rgba(255, 0, 0, 0.2);
            border: 3px solid rgba(139, 0, 0, 0.8);
            text-align: center;
            min-width: 350px;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'burnedContractSuccessFade 0.4s ease-out forwards';
            setTimeout(() => successDiv.remove(), 400);
        }, 2500);
    }
};

// Add styles for animations
if (typeof document !== 'undefined' && !document.getElementById('burnedContractStyles')) {
    const style = document.createElement('style');
    style.id = 'burnedContractStyles';
    style.textContent = `
        .dark-ritual-effect {
            position: fixed;
            pointer-events: none;
        }
        
        .ritual-particle {
            position: absolute;
            width: 8px;
            height: 8px;
            background: radial-gradient(circle, #2d0a0a 0%, #1a0000 70%, transparent 100%);
            border-radius: 50%;
            opacity: 0;
            animation: ritualParticleFloat 1s ease-out;
            box-shadow: 
                0 0 10px rgba(139, 0, 0, 0.8),
                0 0 20px rgba(90, 0, 0, 0.6);
        }
        
        .ritual-particle.particle-0 { top: 0%; left: 50%; animation-delay: 0s; }
        .ritual-particle.particle-1 { top: 10%; left: 85%; animation-delay: 0.08s; }
        .ritual-particle.particle-2 { top: 30%; left: 100%; animation-delay: 0.16s; }
        .ritual-particle.particle-3 { top: 50%; left: 100%; animation-delay: 0.24s; }
        .ritual-particle.particle-4 { top: 70%; left: 100%; animation-delay: 0.32s; }
        .ritual-particle.particle-5 { top: 90%; left: 85%; animation-delay: 0.40s; }
        .ritual-particle.particle-6 { top: 100%; left: 50%; animation-delay: 0.48s; }
        .ritual-particle.particle-7 { top: 90%; left: 15%; animation-delay: 0.56s; }
        .ritual-particle.particle-8 { top: 70%; left: 0%; animation-delay: 0.64s; }
        .ritual-particle.particle-9 { top: 50%; left: 0%; animation-delay: 0.72s; }
        .ritual-particle.particle-10 { top: 30%; left: 0%; animation-delay: 0.80s; }
        .ritual-particle.particle-11 { top: 10%; left: 15%; animation-delay: 0.88s; }
        
        .ritual-dark-circle {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100%;
            height: 100%;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, transparent 30%, rgba(139, 0, 0, 0.4) 70%, transparent 100%);
            border-radius: 50%;
            animation: ritualCirclePulse 1s ease-out;
            box-shadow: 
                inset 0 0 30px rgba(139, 0, 0, 0.6),
                0 0 40px rgba(139, 0, 0, 0.4);
        }
        
        .burned-contract-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .burned-contract-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .burned-contract-error-icon {
            font-size: 20px;
        }
        
        .burned-contract-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        .burned-contract-success-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }
        
        .burned-contract-success .success-icon {
            font-size: 48px;
            filter: drop-shadow(0 0 10px rgba(255, 107, 107, 0.8));
            animation: successIconPulse 0.6s ease-out;
        }
        
        .burned-contract-success .success-title {
            font-size: 20px;
            color: #ffaaaa;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        .burned-contract-success .success-details {
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 14px;
        }
        
        .burned-contract-success .sacrifice-text {
            color: #ff8888;
        }
        
        .burned-contract-success .buff-text {
            color: #ffcc88;
            font-size: 16px;
        }
        
        @keyframes ritualParticleFloat {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0);
            }
            30% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.5);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5) translateY(-30px);
            }
        }
        
        @keyframes ritualCirclePulse {
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
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        @keyframes burnedContractErrorBounce {
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
        
        @keyframes burnedContractErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        @keyframes burnedContractSuccessBounce {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            60% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        @keyframes burnedContractSuccessFade {
            from {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            to {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
        }
        
        @keyframes successIconPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.2);
            }
        }
        
        .hand-card[data-card-name="BurnedContract"]:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 8px 25px rgba(139, 0, 0, 0.6);
            transition: all 0.3s ease;
        }
        
        .hand-card[data-card-name="BurnedContract"] {
            position: relative;
            overflow: visible;
        }
        
        .hand-card[data-card-name="BurnedContract"]::before {
            content: "🔥";
            position: absolute;
            top: -5px;
            right: -5px;
            font-size: 18px;
            animation: burnedContractIconFlicker 2s ease-in-out infinite;
            filter: drop-shadow(0 0 8px rgba(139, 0, 0, 0.8));
            z-index: 5;
        }
        
        @keyframes burnedContractIconFlicker {
            0%, 100% { 
                opacity: 1;
                transform: scale(1);
            }
            50% { 
                opacity: 0.7;
                transform: scale(1.1);
            }
        }
    `;
    document.head.appendChild(style);
}