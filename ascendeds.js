// ascendeds.js - Ascended Heroes System with Evolution Tracking and Counter Requirements

export class AscendedManager {
    constructor() {
        this.isProcessingAscension = false;
        
        // Evolution counter requirements for Waflav ascensions
        this.waflavEvolutionRequirements = {
            'ThunderstruckWaflav': 3,
            'SwampborneWaflav': 5,
            'FlamebathedWaflav': 1,
            'StormkissedWaflav': 1,
            'DeepDrownedWaflav': 3
        };
    }

    // Check if a card is an Ascended Hero
    isAscendedHero(cardName) {
        if (!window.heroSelection?.getCardInfo) return false;
        
        const cardInfo = window.heroSelection.getCardInfo(cardName);
        return cardInfo && 
               cardInfo.cardType === 'hero' && 
               cardInfo.subtype === 'Ascended' &&
               cardInfo.baseHero;
    }

    // Check if ascension is valid (now includes evolution counter requirements)
    canAscend(targetPosition, ascendedCardName) {
        if (!window.heroSelection) return { canAscend: false, reason: 'Game not initialized' };

        const formation = window.heroSelection.formationManager.getBattleFormation();
        const targetHero = formation[targetPosition];
        
        if (!targetHero) {
            return { canAscend: false, reason: 'No hero in this slot!' };
        }

        const ascendedInfo = window.heroSelection.getCardInfo(ascendedCardName);
        if (!ascendedInfo || !this.isAscendedHero(ascendedCardName)) {
            return { canAscend: false, reason: 'Invalid ascended hero!' };
        }

        // Check evolution counter requirements for Waflav ascensions
        if (ascendedInfo.baseHero === 'Waflav') {
            const requiredCounters = this.waflavEvolutionRequirements[ascendedCardName];
            if (requiredCounters !== undefined) {
                const playerCounters = window.heroSelection.playerCounters?.evolutionCounters || 0;
                
                if (playerCounters < requiredCounters) {
                    return { 
                        canAscend: false, 
                        reason: `You need at least ${requiredCounters} Evolution Counters to Ascend to ${this.formatCardName(ascendedCardName)}!`
                    };
                }
            }
        }

        // Check if target hero matches the baseHero
        if (targetHero.name === ascendedInfo.baseHero) {
            return { 
                canAscend: true, 
                heroName: targetHero.name,
                ascensionType: 'base_to_ascended'
            };
        }

        // Check if both are ascended with same baseHero but different names
        const targetInfo = window.heroSelection.getCardInfo(targetHero.name);
        if (targetInfo && 
            targetInfo.cardType === 'hero' && 
            targetInfo.subtype === 'Ascended' &&
            targetInfo.baseHero === ascendedInfo.baseHero &&
            targetInfo.name !== ascendedInfo.name) {
            return { 
                canAscend: true, 
                heroName: targetHero.name,
                ascensionType: 'ascended_to_ascended'
            };
        }

        return { 
            canAscend: false, 
            reason: `${this.formatCardName(ascendedCardName)} can only transform ${ascendedInfo.baseHero} or other ${ascendedInfo.baseHero} forms!` 
        };
    }

    // Perform the ascension with evolution tracking and counter consumption
    async performAscension(targetPosition, ascendedCardName, cardIndex) {
        if (this.isProcessingAscension) return false;
        
        this.isProcessingAscension = true;
        
        try {
            const validation = this.canAscend(targetPosition, ascendedCardName);
            if (!validation.canAscend) {
                this.showAscensionError(targetPosition, validation.reason);
                return false;
            }

            const formation = window.heroSelection.formationManager.getBattleFormation();
            const originalHero = formation[targetPosition];
            const ascendedInfo = window.heroSelection.getCardInfo(ascendedCardName);

            // Deduct evolution counters for Waflav ascensions
            let consumedCounters = 0;
            if (ascendedInfo.baseHero === 'Waflav') {
                const requiredCounters = this.waflavEvolutionRequirements[ascendedCardName];
                if (requiredCounters !== undefined) {
                    window.heroSelection.playerCounters.evolutionCounters -= requiredCounters;
                    consumedCounters = requiredCounters;
                }
            }

            // IMMEDIATELY REMOVE ASCENDED CARD FROM HAND - BEFORE ANIMATION
            if (window.heroSelection.handManager) {
                window.heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
                // Update hand display immediately so player sees the card is gone
                window.heroSelection.updateHandDisplay();
            }

            // ASCENSION STACK TRACKING - Prepare the evolution history
            let newAscendedStack = [];
            
            // If the original hero already has an ascension history, preserve it
            if (originalHero.ascendedStack && Array.isArray(originalHero.ascendedStack)) {
                newAscendedStack = [...originalHero.ascendedStack];
            }
            
            // Add the current hero's name to the ascension stack
            // (this represents the form that is being replaced)
            if (!newAscendedStack.includes(originalHero.name)) {
                newAscendedStack.push(originalHero.name);
            }

            // Create new ascended hero with preserved data and updated ascension stack
            const ascendedHero = {
                ...originalHero, // Preserve all existing data
                name: ascendedCardName,
                image: ascendedInfo.image,
                ascendedStack: newAscendedStack  // CRITICAL: Set the evolution history
                // Preserve existing bonuses without adding stat differences
            };

            // Play ascension animation (card already removed from hand)
            await this.playAscensionAnimation(targetPosition, originalHero.name, ascendedCardName);

            // Update the formation
            window.heroSelection.formationManager.updateHeroAtPosition(targetPosition, ascendedHero);

            // NOTE: Card was already removed from hand above - before animation
            // NOTE: Original hero is NOT sent to graveyard - it remains "underneath" as part of ascendedStack

            // Update UI (hand already updated above)
            window.heroSelection.updateBattleFormationUI();
            
            // Save state
            await window.heroSelection.saveGameState();
            await window.heroSelection.sendFormationUpdate();

            // Show success feedback with evolution info and counter consumption
            this.showAscensionSuccess(targetPosition, validation.heroName, ascendedCardName, newAscendedStack, consumedCounters);

            return true;

        } catch (error) {
            console.error('Error during ascension:', error);
            this.showAscensionError(targetPosition, 'Ascension failed due to an error');
            return false;
        } finally {
            this.isProcessingAscension = false;
        }
    }

    // Play epic ascension animation
    async playAscensionAnimation(heroPosition, originalName, ascendedName) {
        const heroSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!heroSlot) return;

        const heroElement = heroSlot.querySelector('.character-image-container');
        if (!heroElement) return;

        return new Promise((resolve) => {
            // Create animation container
            const animationContainer = document.createElement('div');
            animationContainer.className = 'ascension-animation-container';
            
            const rect = heroElement.getBoundingClientRect();
            animationContainer.style.cssText = `
                position: fixed;
                left: ${rect.left}px;
                top: ${rect.top}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                pointer-events: none;
                z-index: 10000;
                overflow: visible;
            `;
            
            document.body.appendChild(animationContainer);

            // Create multiple sparkle particles
            for (let i = 0; i < 20; i++) {
                const sparkle = document.createElement('div');
                sparkle.className = 'ascension-sparkle';
                
                const angle = (i / 20) * 2 * Math.PI;
                const distance = 30 + Math.random() * 40;
                const endX = Math.cos(angle) * distance;
                const endY = Math.sin(angle) * distance;
                const size = 4 + Math.random() * 6;
                
                sparkle.style.cssText = `
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: ${size}px;
                    height: ${size}px;
                    background: radial-gradient(circle, #FFD700 0%, #FFA500 50%, transparent 100%);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    animation: ascensionSparkle 1.5s ease-out forwards;
                    --end-x: ${endX}px;
                    --end-y: ${endY}px;
                    opacity: 0;
                    box-shadow: 0 0 8px #FFD700;
                `;
                
                animationContainer.appendChild(sparkle);
            }

            // Create energy burst effect
            const energyBurst = document.createElement('div');
            energyBurst.className = 'ascension-energy-burst';
            energyBurst.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                width: 20px;
                height: 20px;
                background: radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, rgba(255, 165, 0, 0.6) 30%, transparent 70%);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: ascensionEnergyBurst 1.5s ease-out forwards;
                box-shadow: 
                    0 0 20px #FFD700,
                    0 0 40px #FFA500,
                    0 0 60px #FF8C00;
            `;
            animationContainer.appendChild(energyBurst);

            // Add glow effect to hero
            heroElement.style.animation = 'ascensionHeroGlow 1.5s ease-out';
            heroElement.style.filter = 'brightness(1.5) saturate(1.3)';

            // Clean up after animation
            setTimeout(() => {
                animationContainer.remove();
                heroElement.style.animation = '';
                heroElement.style.filter = '';
                resolve();
            }, 1500);
        });
    }

    // Show ascension success feedback with evolution history and counter consumption
    showAscensionSuccess(heroPosition, originalName, ascendedName, ascendedStack = [], consumedCounters = 0) {
        const heroSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!heroSlot) return;

        // Create evolution chain display
        let evolutionChain = '';
        if (ascendedStack.length > 0) {
            const totalEvolutions = ascendedStack.length + 1; // +1 for current ascended form
            evolutionChain = `<div class="evolution-chain" style="font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 4px;">
                Evolution ${totalEvolutions}: ${ascendedStack[0]} → ${this.formatCardName(ascendedName)}
            </div>`;
        }

        // Add counter consumption info for Waflav ascensions
        let counterInfo = '';
        if (consumedCounters > 0) {
            counterInfo = `<div class="counter-consumption" style="font-size: 10px; color: rgba(255,215,0,0.9); margin-top: 2px;">
                Consumed ${consumedCounters} Evolution Counter${consumedCounters > 1 ? 's' : ''}
            </div>`;
        }

        const feedback = document.createElement('div');
        feedback.className = 'ascension-success-feedback';
        feedback.innerHTML = `
            <div class="ascension-success-content">
                <span class="ascension-success-icon">⭐</span>
                <div class="ascension-success-main">
                    <span class="ascension-success-text">${this.formatCardName(originalName)} ascended to ${this.formatCardName(ascendedName)}!</span>
                    ${evolutionChain}
                    ${counterInfo}
                </div>
            </div>
        `;
        
        feedback.style.cssText = `
            position: absolute;
            top: -90px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10001;
            pointer-events: none;
            animation: ascensionSuccessFeedback 4s ease-out;
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
            white-space: nowrap;
            max-width: 3800px;
        `;
        
        heroSlot.style.position = 'relative';
        heroSlot.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 4000);
    }

    // Show ascension error feedback
    showAscensionError(heroPosition, message) {
        const heroSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!heroSlot) return;

        const feedback = document.createElement('div');
        feedback.className = 'ascension-error-feedback';
        feedback.innerHTML = `
            <div class="ascension-error-content">
                <span class="ascension-error-icon">❌</span>
                <span class="ascension-error-text">${message}</span>
            </div>
        `;
        
        feedback.style.cssText = `
            position: absolute;
            top: -60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10001;
            pointer-events: none;
            animation: ascensionErrorFeedback 3s ease-out;
            box-shadow: 0 6px 20px rgba(244, 67, 54, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
            white-space: nowrap;
            max-width: 3200px;
            text-align: center;
        `;
        
        heroSlot.style.position = 'relative';
        heroSlot.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }

    // Get tooltip info for ascension drop with evolution preview and counter requirements
    getAscensionDropTooltipInfo(targetPosition, ascendedCardName) {
        const validation = this.canAscend(targetPosition, ascendedCardName);
        
        if (validation.canAscend) {
            // Get current hero to show evolution chain preview
            const formation = window.heroSelection.formationManager.getBattleFormation();
            const targetHero = formation[targetPosition];
            
            let evolutionPreview = '';
            if (targetHero && targetHero.ascendedStack && targetHero.ascendedStack.length > 0) {
                const nextEvolution = targetHero.ascendedStack.length + 2; // +1 for current, +1 for next
                evolutionPreview = ` (Evolution ${nextEvolution})`;
            }

            // Add counter cost info for Waflav ascensions
            let counterCostInfo = '';
            const ascendedInfo = window.heroSelection.getCardInfo(ascendedCardName);
            if (ascendedInfo && ascendedInfo.baseHero === 'Waflav') {
                const requiredCounters = this.waflavEvolutionRequirements[ascendedCardName];
                if (requiredCounters !== undefined) {
                    const playerCounters = window.heroSelection.playerCounters?.evolutionCounters || 0;
                    counterCostInfo = ` (Cost: ${requiredCounters} Evolution Counters, Have: ${playerCounters})`;
                }
            }
            
            return {
                canDrop: true,
                message: `Transform ${validation.heroName} into ${this.formatCardName(ascendedCardName)}!${evolutionPreview}${counterCostInfo}`,
                type: 'can-ascend'
            };
        }
        
        return {
            canDrop: false,
            message: validation.reason,
            type: 'cannot-ascend'
        };
    }

    // Get evolution history for a hero (utility method)
    getEvolutionHistory(heroData) {
        if (!heroData || !heroData.ascendedStack || heroData.ascendedStack.length === 0) {
            return {
                hasHistory: false,
                evolutionCount: 0,
                originalForm: heroData?.name || 'Unknown',
                currentForm: heroData?.name || 'Unknown',
                fullChain: []
            };
        }
        
        const fullChain = [...heroData.ascendedStack, heroData.name];
        
        return {
            hasHistory: true,
            evolutionCount: heroData.ascendedStack.length,
            originalForm: heroData.ascendedStack[0],
            currentForm: heroData.name,
            fullChain: fullChain,
            evolutionChainText: fullChain.map(name => this.formatCardName(name)).join(' → ')
        };
    }

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}

// Create global instance
export const ascendedManager = new AscendedManager();

// Add CSS styles for ascension animations (updated for evolution display)
if (typeof document !== 'undefined' && !document.getElementById('ascensionStyles')) {
    const style = document.createElement('style');
    style.id = 'ascensionStyles';
    style.textContent = `
        /* Ascension Animation Keyframes */
        @keyframes ascensionSparkle {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1) rotate(0deg);
            }
            100% {
                opacity: 0;
                transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(0.2) rotate(360deg);
            }
        }
        
        @keyframes ascensionEnergyBurst {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0);
            }
            20% {
                opacity: 0.8;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(8);
            }
        }
        
        @keyframes ascensionHeroGlow {
            0%, 100% {
                filter: brightness(1) saturate(1);
                box-shadow: none;
            }
            50% {
                filter: brightness(1.8) saturate(1.5);
                box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
            }
        }
        
        @keyframes ascensionSuccessFeedback {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            15% {
                opacity: 1;
                transform: translateX(-50%) translateY(-10px) scale(1.05);
            }
            85% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px) scale(1);
            }
        }
        
        @keyframes ascensionErrorFeedback {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            20% {
                opacity: 1;
                transform: translateX(-50%) translateY(-10px) scale(1.05);
            }
            80% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px) scale(1);
            }
        }
        
        /* Ascension Drop States */
        .team-slot.ascension-drop-ready {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 165, 0, 0.3) 100%);
            border-color: #FFD700;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
            animation: ascensionDropPulse 1s ease-in-out infinite;
        }
        
        .team-slot.ascension-drop-invalid {
            background: linear-gradient(135deg, rgba(244, 67, 54, 0.2) 0%, rgba(229, 57, 53, 0.2) 100%);
            border-color: #f44336;
            box-shadow: 0 0 15px rgba(244, 67, 54, 0.3);
        }
        
        @keyframes ascensionDropPulse {
            0%, 100% { 
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
            }
            50% { 
                box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
            }
        }
        
        .ascension-drop-tooltip {
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        .ascension-drop-tooltip.can-ascend {
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #8B4513;
            border-color: rgba(255, 255, 255, 0.5);
        }
        
        .ascension-drop-tooltip.cannot-ascend {
            background: linear-gradient(135deg, #dc3545 0%, #e63946 100%);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
        }
        
        .ascension-drop-tooltip.long-text {
            max-width: 4500px;
            min-width: 280px;
            white-space: normal;
            text-align: center;
            line-height: 1.4;
            word-wrap: break-word;
            padding: 12px 20px;
        }
        
        /* Hand Card Ascended Hero Styling */
        .hand-card.ascended-hero-card {
            border: 2px solid #FFD700;
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
            position: relative;
        }
        
        .hand-card.ascended-hero-card:hover {
            border-color: #FFA500;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
            transform: translateY(-3px);
        }
        
        .hand-card.ascended-hero-card::before {
            content: "⭐";
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 16px;
            background: rgba(255, 215, 0, 0.9);
            color: #8B4513;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            z-index: 10;
            animation: ascendedCardGlow 2s ease-in-out infinite;
        }
        
        @keyframes ascendedCardGlow {
            0%, 100% { 
                box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
            }
            50% { 
                box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
            }
        }
        
        /* Evolution Chain Styling */
        .evolution-chain {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 4px;
            text-align: center;
            line-height: 1.2;
        }

        /* Counter Consumption Styling */
        .counter-consumption {
            font-size: 10px;
            color: rgba(255, 215, 0, 0.9);
            margin-top: 2px;
            text-align: center;
            line-height: 1.2;
        }
        
        .ascension-success-content {
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }
        
        .ascension-success-main {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .ascension-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .ascension-success-icon,
        .ascension-error-icon {
            font-size: 18px;
            animation: feedbackIconSpin 2s ease-in-out;
            flex-shrink: 0;
        }
        
        @keyframes feedbackIconSpin {
            0% { transform: scale(1) rotate(0deg); }
            50% { transform: scale(1.2) rotate(180deg); }
            100% { transform: scale(1) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ascendedManager = ascendedManager;
}