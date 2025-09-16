// ./Spells/antiMagicShield.js - Anti-Magic Shield Global Spell Implementation

export class AntiMagicShieldSpell {
    constructor() {
        this.spellName = 'AntiMagicShield';
        this.displayName = 'Anti-Magic Shield';
        console.log('🛡️ Anti-Magic Shield spell module initialized');
    }

    // Handle clicking the Anti-Magic Shield card
    async handleClick(cardIndex, cardName, heroSelection, globalSpellManager) {
        try {
            // Get the card info to verify it's the right spell
            const cardInfo = heroSelection.getCardInfo(cardName);
            if (!cardInfo || cardInfo.name !== 'AntiMagicShield') {
                console.error('❌ Invalid spell card for Anti-Magic Shield');
                return false;
            }

            // Apply the spell effect to all player heroes
            const heroesAffected = this.applyAntiMagicShieldEffect(heroSelection);
            
            if (heroesAffected === 0) {
                // No heroes in formation to affect
                this.showFeedback('No heroes in formation to shield!', false);
                return false;
            }

            // Remove the card from hand (using same pattern as Teleportal)
            const removedCard = heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            if (!removedCard) {
                console.error('❌ Failed to remove Anti-Magic Shield from hand');
                return false;
            }

            // Add to graveyard (using same pattern as Teleportal)
            if (heroSelection.graveyardManager) {
                heroSelection.graveyardManager.addCard(cardName);
                console.log('🛡️ Added Anti-Magic Shield to graveyard');
            }

            // Consume action if required
            if (cardInfo.action && heroSelection.actionManager) {
                const actionConsumed = heroSelection.actionManager.consumeAction();
                if (!actionConsumed) {
                    console.warn('⚠️ Failed to consume action for Anti-Magic Shield');
                }
            }

            // Save game state to persist the spell shield changes
            heroSelection.saveGameState();

            // Update UI
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                window.updateHeroSelectionUI();
            }

            // Show success feedback
            this.showFeedback(
                `Anti-Magic Shield applied! ${heroesAffected} hero${heroesAffected > 1 ? 'es' : ''} will resist the first spell in the next battle.`, 
                true
            );

            // Play spell effect animation
            this.playSpellEffectAnimation();

            console.log(`✅ Anti-Magic Shield successfully applied to ${heroesAffected} heroes`);
            return true;

        } catch (error) {
            console.error('❌ Error casting Anti-Magic Shield:', error);
            this.showFeedback('Failed to cast Anti-Magic Shield!', false);
            return false;
        }
    }

    // Apply the Anti-Magic Shield effect to all player heroes
    applyAntiMagicShieldEffect(heroSelection) {
        let heroesAffected = 0;

        try {
            // Get current battle formation
            const formation = heroSelection.formationManager.getBattleFormation();
            if (!formation) {
                console.warn('⚠️ No battle formation found');
                return 0;
            }

            // Apply spell shields to all heroes in formation
            ['left', 'center', 'right'].forEach(position => {
                const heroData = formation[position];
                if (heroData) {
                    // Increment spell shields for this hero
                    if (heroData.spellShields === undefined) {
                        heroData.spellShields = 0;
                    }
                    heroData.spellShields += 1;
                    heroesAffected++;

                    console.log(`🛡️ Applied spell shield to ${heroData.name} (now has ${heroData.spellShields} spell shields)`);
                }
            });

            // Update the formation in the formation manager
            heroSelection.formationManager.battleFormation = formation;

            return heroesAffected;

        } catch (error) {
            console.error('❌ Error applying Anti-Magic Shield effect:', error);
            return 0;
        }
    }

    // Show feedback to the player
    showFeedback(message, success) {
        try {
            // Create feedback element
            const feedback = document.createElement('div');
            feedback.className = `anti-magic-shield-feedback ${success ? 'success' : 'error'}`;
            feedback.textContent = message;
            
            feedback.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                white-space: nowrap;
                z-index: 2000;
                animation: antiMagicShieldFeedback 3s ease-out forwards;
                pointer-events: none;
                background: ${success ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)'};
                color: white;
                border: 2px solid ${success ? '#4caf50' : '#f44336'};
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            `;
            
            document.body.appendChild(feedback);
            
            // Ensure CSS exists
            this.ensureFeedbackCSS();
            
            // Remove after animation
            setTimeout(() => {
                if (feedback && feedback.parentNode) {
                    feedback.remove();
                }
            }, 3000);

        } catch (error) {
            console.error('❌ Error showing feedback:', error);
        }
    }

    // Play spell effect animation
    playSpellEffectAnimation() {
        try {
            // Create magical shield effect over the formation area
            const formationArea = document.querySelector('.formation-container') || 
                                 document.querySelector('.team-container') ||
                                 document.querySelector('.hero-selection-screen');
            
            if (!formationArea) {
                console.warn('⚠️ Could not find formation area for animation');
                return;
            }

            const shieldEffect = document.createElement('div');
            shieldEffect.className = 'anti-magic-shield-animation';
            shieldEffect.innerHTML = '🛡️✨🛡️';
            
            shieldEffect.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                z-index: 1500;
                pointer-events: none;
                animation: antiMagicShieldCast 2s ease-out forwards;
                text-shadow: 0 0 20px rgba(100, 200, 255, 1);
                filter: drop-shadow(0 0 10px rgba(100, 200, 255, 0.8));
            `;
            
            // Make sure parent is positioned
            if (formationArea.style.position !== 'relative' && formationArea.style.position !== 'absolute') {
                formationArea.style.position = 'relative';
            }
            
            formationArea.appendChild(shieldEffect);
            
            // Ensure CSS exists
            this.ensureAnimationCSS();
            
            // Remove after animation
            setTimeout(() => {
                if (shieldEffect && shieldEffect.parentNode) {
                    shieldEffect.remove();
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Error playing spell animation:', error);
        }
    }

    // Ensure feedback CSS exists
    ensureFeedbackCSS() {
        if (document.getElementById('antiMagicShieldFeedbackCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'antiMagicShieldFeedbackCSS';
        style.textContent = `
            @keyframes antiMagicShieldFeedback {
                0% { 
                    opacity: 0; 
                    transform: translateX(-50%) translateY(-20px) scale(0.8); 
                }
                15% { 
                    opacity: 1; 
                    transform: translateX(-50%) translateY(0) scale(1.1); 
                }
                25% { 
                    transform: translateX(-50%) translateY(0) scale(1); 
                }
                85% { 
                    opacity: 1; 
                    transform: translateX(-50%) translateY(0) scale(1); 
                }
                100% { 
                    opacity: 0; 
                    transform: translateX(-50%) translateY(-10px) scale(0.9); 
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Ensure animation CSS exists
    ensureAnimationCSS() {
        if (document.getElementById('antiMagicShieldAnimationCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'antiMagicShieldAnimationCSS';
        style.textContent = `
            @keyframes antiMagicShieldCast {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg); 
                }
                20% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.2) rotate(90deg); 
                }
                50% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg); 
                }
                80% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.8) rotate(270deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(2.2) rotate(360deg); 
                }
            }
            
            .anti-magic-shield-animation {
                will-change: transform, opacity;
            }
        `;
        document.head.appendChild(style);
    }

    // Get spell information
    getSpellInfo() {
        return {
            name: this.spellName,
            displayName: this.displayName,
            description: 'During the next battle: All Heroes you control are unaffected by the first Spell that would affect them.',
            type: 'global',
            targetType: 'all_player_heroes',
            effect: 'spell_resistance'
        };
    }

    // Cleanup (called when needed)
    cleanup() {
        // Remove any remaining visual effects
        const effects = document.querySelectorAll('.anti-magic-shield-animation, .anti-magic-shield-feedback');
        effects.forEach(effect => effect.remove());
        
        // Remove CSS if needed
        const feedbackCSS = document.getElementById('antiMagicShieldFeedbackCSS');
        const animationCSS = document.getElementById('antiMagicShieldAnimationCSS');
        if (feedbackCSS) feedbackCSS.remove();
        if (animationCSS) animationCSS.remove();
        
        console.log('🛡️ Anti-Magic Shield spell cleaned up');
    }
}

// Create singleton instance for global access
export const antiMagicShieldSpell = new AntiMagicShieldSpell();

// Make it available globally
if (typeof window !== 'undefined') {
    window.antiMagicShieldSpell = antiMagicShieldSpell;
}