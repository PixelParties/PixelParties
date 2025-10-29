// Potions/planetInABottle.js - Planet in a Bottle Potion Implementation
// Selects a random Area Spell and places it in the player's Area Zone

import { getCardsByFilters } from '../cardDatabase.js';

export class PlanetInABottlePotion {
    constructor() {
        this.name = 'PlanetInABottle';
        this.displayName = 'Planet in a Bottle';
        this.description = 'Selects a random Area Spell and places it in your Area Zone. Replaces any existing Area card.';
        this.effectType = 'area_placement';
        this.targetType = 'self';
        
        console.log('PlanetInABottle potion initialized - area placement only, no battle effects');
    }

    // ===== STATIC METHODS =====

    // Static method to check if a potion is PlanetInABottle
    static isPlanetInABottle(potionName) {
        return potionName === 'PlanetInABottle';
    }

    // Static method to get potion info
    static getPotionInfo() {
        return {
            name: 'PlanetInABottle',
            displayName: 'Planet in a Bottle',
            description: 'Selects a random Area Spell and places it in your Area Zone. Replaces any existing Area card.',
            cardType: 'Potion',
            cost: 0,
            effect: 'Places a random Area Spell in your Area Zone when consumed',
            hasBattleEffects: false
        };
    }

    // Static method to create a new instance
    static create() {
        return new PlanetInABottlePotion();
    }

    // ===== CORE FUNCTIONALITY =====

    // Get all available Area Spells from the card database
    getAvailableAreaSpells() {
        const areaSpells = getCardsByFilters({
            cardType: 'Spell',
            subtype: 'Area'
        });
        
        // Return just the card names
        return areaSpells.map(card => card.name);
    }

    // Select a random Area Spell from available options
    selectRandomAreaSpell() {
        const availableAreaSpells = this.getAvailableAreaSpells();
        
        if (availableAreaSpells.length === 0) {
            console.error('PlanetInABottle: No Area spells found in database!');
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * availableAreaSpells.length);
        return availableAreaSpells[randomIndex];
    }

    // Apply the Planet in a Bottle effect
    async applyPlanetInABottleEffect(heroSelection) {
        if (!heroSelection || !heroSelection.areaHandler) {
            console.error('PlanetInABottle: Missing heroSelection or areaHandler');
            return false;
        }

        // Select random Area Spell
        const selectedAreaSpell = this.selectRandomAreaSpell();
        
        if (!selectedAreaSpell) {
            console.error('PlanetInABottle: Failed to select an Area spell');
            this.showPlanetInABottleError('No Area Spells available!', heroSelection);
            return false;
        }
        
        try {
            // Get card info for the selected Area Spell
            const cardInfo = heroSelection.getCardInfo(selectedAreaSpell);
            if (!cardInfo) {
                console.error(`PlanetInABottle: Could not find card info for ${selectedAreaSpell}`);
                return false;
            }

            // Create new area card object
            const newAreaCard = {
                name: selectedAreaSpell,
                image: cardInfo.image || `./Cards/Areas/${selectedAreaSpell}.png`,
                cost: cardInfo.cost || 0,
                effects: cardInfo.effects || []
            };

            // Initialize area-specific properties
            await this.initializeAreaSpecificProperties(newAreaCard, heroSelection);

            // Place the area card (this will replace any existing area card)
            heroSelection.areaHandler.setAreaCard(newAreaCard);

            // Update area slot display
            heroSelection.areaHandler.updateAreaSlotDisplay();
            heroSelection.areaHandler.updateCachedState();

            // Show success message
            this.showPlanetInABottleSuccess(selectedAreaSpell, heroSelection);

            // Update other UI elements
            heroSelection.updateBattleFormationUI();

            // Save game state and send formation update
            await heroSelection.saveGameState();
            await heroSelection.sendFormationUpdate();

            console.log(`PlanetInABottle: Successfully placed ${selectedAreaSpell} in area zone`);
            return true;

        } catch (error) {
            console.error('PlanetInABottle: Error applying effect:', error);
            this.showPlanetInABottleError('Failed to place Area Spell!', heroSelection);
            return false;
        }
    }

    // Initialize area-specific properties for different Area Spells
    async initializeAreaSpecificProperties(areaCard, heroSelection) {
        switch (areaCard.name) {
            case 'GatheringStorm':
                // Initialize GatheringStorm with storm counters
                try {
                    const { initializeGatheringStormArea } = await import('../Spells/gatheringStorm.js');
                    initializeGatheringStormArea(areaCard);
                } catch (error) {
                    console.warn('PlanetInABottle: Could not import GatheringStorm initializer, using fallback');
                    areaCard.stormCounters = 1;
                }
                break;

            case 'DoomClock':
                // Initialize DoomClock with doom counters
                try {
                    const { initializeDoomClockArea } = await import('../Spells/doomClock.js');
                    initializeDoomClockArea(areaCard);
                } catch (error) {
                    console.warn('PlanetInABottle: Could not import DoomClock initializer, using fallback');
                    areaCard.doomCounters = 0;
                }
                break;

            case 'CrystalWell':
                // Reset CrystalWell when placed
                try {
                    const { crystalWellManager } = await import('../Spells/crystalWell.js');
                    crystalWellManager.resetForNewCrystalWell();
                } catch (error) {
                    console.warn('PlanetInABottle: Could not import CrystalWell manager');
                }
                break;

            default:
                // No special initialization needed
                break;
        }
    }

    // Show success notification
    showPlanetInABottleSuccess(areaSpellName, heroSelection) {
        const formattedName = this.formatCardName(areaSpellName);
        
        const notification = document.createElement('div');
        notification.className = 'planet-bottle-success-notification';
        notification.innerHTML = `
            <div class="planet-bottle-success-content">
                <span class="planet-bottle-success-icon">🌍✨</span>
                <span class="planet-bottle-success-text">Planet in a Bottle summoned ${formattedName}!</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: planetBottleBounce 0.6s ease-out;
            box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(notification);
        
        // Add CSS animations if not already present
        this.injectPlanetInABottleCSS();
        
        // Remove after animation
        setTimeout(() => {
            notification.style.animation = 'planetBottleFade 0.4s ease-out forwards';
            setTimeout(() => notification.remove(), 400);
        }, 2000);
    }

    // Show error notification
    showPlanetInABottleError(message, heroSelection) {
        const notification = document.createElement('div');
        notification.className = 'planet-bottle-error-notification';
        notification.innerHTML = `
            <div class="planet-bottle-error-content">
                <span class="planet-bottle-error-icon">🌍💥</span>
                <span class="planet-bottle-error-text">${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
            color: white;
            padding: 14px 22px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: planetBottleErrorBounce 0.5s ease-out;
            box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(notification);
        
        // Add CSS animations if not already present
        this.injectPlanetInABottleCSS();
        
        setTimeout(() => {
            notification.style.animation = 'planetBottleErrorFade 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Inject CSS animations
    injectPlanetInABottleCSS() {
        if (document.getElementById('planetInABottleStyles')) return;

        const style = document.createElement('style');
        style.id = 'planetInABottleStyles';
        style.textContent = `
            @keyframes planetBottleBounce {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(-180deg);
                }
                70% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1) rotate(10deg);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1) rotate(0deg);
                }
            }

            @keyframes planetBottleFade {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }

            @keyframes planetBottleErrorBounce {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                70% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }

            @keyframes planetBottleErrorFade {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.9);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // ===== NOTE: NO BATTLE EFFECT METHODS =====
    // PlanetInABottle has no battle effects, so no handlePotionEffectsForPlayer method
    // or other battle-related methods are implemented. This keeps it simple and focused
    // on its single purpose: placing a random Area Spell when consumed.
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.PlanetInABottlePotion = PlanetInABottlePotion;
}

console.log('PlanetInABottle potion module loaded - area placement only, no battle effects');