// armsTrade.js - Arms Trade Fighting Spell Implementation

import { getCardInfo } from '../cardDatabase.js';

export class ArmsTradeSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'ArmsTrade';
    }

    getTriggerChance(attacker, target, damage) {
        // 10% chance to trigger
        return 0.10;
    }

    /**
     * Execute Arms Trade effect after a successful attack
     * @param {Object} attacker - The hero who attacked
     * @param {Object} target - The target that was attacked (hero or creature)
     * @param {number} attackDamage - The damage that was dealt
     * @returns {Promise} - Animation completion promise
     */
    async executeEffect(attacker, target, attackDamage) {
        // Determine which side the attacker is on
        const attackerSide = attacker.absoluteSide;
        const isPlayerSide = (attackerSide === (this.battleManager.isHost ? 'host' : 'guest'));
        
        // Get the appropriate deck
        const deck = isPlayerSide ? this.battleManager.playerDeck : this.battleManager.opponentDeck;
        
        if (!deck || !Array.isArray(deck)) {
            console.warn('Arms Trade: No deck available');
            return;
        }

        // Find all Equip Artifacts in the deck
        const equipArtifacts = this.findEquipArtifactsInDeck(deck);
        
        if (equipArtifacts.length === 0) {
            // No Equip Artifacts in deck - abort silently
            return;
        }

        // Randomly select one Equip Artifact using deterministic randomness
        const selectedArtifact = this.battleManager.getRandomChoice(equipArtifacts);
        
        if (!selectedArtifact) {
            console.warn('Arms Trade: Failed to select artifact');
            return;
        }

        // Add the artifact to the hero's equipment permanently
        attacker.equipment.push({
            name: selectedArtifact,
            cardName: selectedArtifact,
            equippedAt: Date.now(),
            source: 'ArmsTrade'
        });

        // Recalculate equipment bonuses (Toras, Energy Core, etc.)
        if (window.heroEquipmentManager && window.heroEquipmentManager.recalculateEquipmentBonuses) {
            window.heroEquipmentManager.recalculateEquipmentBonuses(attacker, this.battleManager);
        }

        // Log the effect
        this.battleManager.addCombatLog(
            `⚔️ ${attacker.name}'s Arms Trade equips ${this.formatArtifactName(selectedArtifact)}!`,
            attacker.side === 'player' ? 'success' : 'error'
        );

        // Show the Artifact card using the exact spell card display pattern
        this.showArtifactCard(attacker, selectedArtifact);

        // Sync to guest if we're the host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('arms_trade_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                artifactName: selectedArtifact,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Find all Equip Artifacts in a deck
     * @param {Array} deck - The deck to search
     * @returns {Array} - Array of Equip Artifact card names
     */
    findEquipArtifactsInDeck(deck) {
        const equipArtifacts = [];
        
        for (const cardName of deck) {
            const cardInfo = getCardInfo(cardName);
            
            if (cardInfo && 
                cardInfo.cardType === 'Artifact' && 
                cardInfo.subtype === 'Equip') {
                equipArtifacts.push(cardName);
            }
        }
        
        return equipArtifacts;
    }

    /**
     * Show the artifact card using the spell card display system
     * @param {Object} attacker - The hero who triggered the spell
     * @param {string} artifactName - The name of the artifact to display
     */
    showArtifactCard(attacker, artifactName) {
        const heroElement = this.battleManager.getHeroElement(attacker.side, attacker.position);
        if (!heroElement) {
            console.warn('Could not find hero element for Arms Trade card display');
            return;
        }

        // Ensure CSS exists
        this.ensureArtifactCardCSS();

        // Create the artifact card effect container (same structure as spell cards)
        const cardContainer = document.createElement('div');
        cardContainer.className = 'arms-trade-card-container';
        
        // Create card display
        const cardDisplay = document.createElement('div');
        cardDisplay.className = 'arms-trade-card-display';
        
        // Get card image path
        const cardImagePath = `./Cards/All/${artifactName}.png`;
        
        cardDisplay.innerHTML = `
            <img src="${cardImagePath}" alt="${artifactName}" class="arms-trade-card-image" 
                 onerror="this.src='./Cards/placeholder.png'">
        `;
        
        cardContainer.appendChild(cardDisplay);
        
        // Position on top of hero card (exactly like spell cards)
        cardContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 600;
            pointer-events: none;
            animation: armsTradeCardEffect ${this.battleManager.getSpeedAdjustedDelay(2000)}ms ease-out forwards;
        `;
        
        heroElement.appendChild(cardContainer);
        
        // Clean up after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(2000);
        setTimeout(() => {
            if (cardContainer && cardContainer.parentNode) {
                cardContainer.remove();
            }
        }, animationDuration);
    }

    /**
     * Get target sync information for network communication
     * @param {Object} target - Target object
     * @returns {Object} - Sync information
     */
    getTargetSyncInfo(target) {
        if (target.type === 'hero' || !target.type) {
            return {
                type: 'hero',
                absoluteSide: target.absoluteSide,
                position: target.position,
                name: target.name
            };
        } else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                absoluteSide: creatureInfo.hero.absoluteSide,
                position: creatureInfo.position,
                creatureIndex: creatureInfo.creatureIndex,
                name: target.name
            };
        }
    }

    /**
     * Find creature information (hero, position, index)
     * @param {Object} creature - Creature object
     * @returns {Object|null} - Creature info or null
     */
    findCreatureInfo(creature) {
        // Search through all heroes and their creatures
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            
            for (const position of ['left', 'center', 'right']) {
                const hero = heroes[position];
                if (!hero || !hero.creatures) continue;
                
                const creatureIndex = hero.creatures.indexOf(creature);
                if (creatureIndex !== -1) {
                    return { hero, side, position, creatureIndex };
                }
            }
        }
        
        return null;
    }

    /**
     * Handle guest receiving Arms Trade effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, artifactName } = data;
        
        // Find local attacker
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        
        if (!localAttacker) {
            console.warn('Could not find local attacker for Arms Trade effect');
            return;
        }

        // Add the artifact to the hero's equipment permanently
        localAttacker.equipment.push({
            name: artifactName,
            cardName: artifactName,
            equippedAt: Date.now(),
            source: 'ArmsTrade'
        });

        // Recalculate equipment bonuses (Toras, Energy Core, etc.)
        if (window.heroEquipmentManager && window.heroEquipmentManager.recalculateEquipmentBonuses) {
            window.heroEquipmentManager.recalculateEquipmentBonuses(localAttacker, this.battleManager);
        }

        // Log the effect
        this.battleManager.addCombatLog(
            `⚔️ ${localAttacker.name}'s Arms Trade equips ${this.formatArtifactName(artifactName)}!`,
            localAttacker.side === 'player' ? 'success' : 'error'
        );

        // Show the artifact card
        this.showArtifactCard(localAttacker, artifactName);
    }

    /**
     * Find target from sync information
     * @param {Object} targetInfo - Target sync info
     * @returns {Object|null} - Target object or null
     */
    findTargetFromSyncInfo(targetInfo) {
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetInfo.type === 'hero') {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            return heroes[targetInfo.position];
        } else {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[targetInfo.position];
            return hero?.creatures?.[targetInfo.creatureIndex];
        }
    }

    /**
     * Format artifact name for display (camelCase to Spaced Words)
     * @param {string} artifactName - The artifact name
     * @returns {string} - Formatted name
     */
    formatArtifactName(artifactName) {
        if (!artifactName || typeof artifactName !== 'string') {
            return artifactName;
        }
        
        // Convert camelCase to spaced words
        return artifactName.replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    /**
     * Ensure CSS for artifact card effect exists
     */
    ensureArtifactCardCSS() {
        if (document.getElementById('armsTradeCardCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'armsTradeCardCSS';
        style.textContent = `
            @keyframes armsTradeCardEffect {
                0% {
                    transform: translate(-50%, -50%) scale(0.3) rotateY(-90deg);
                    opacity: 0;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.1) rotateY(0deg);
                    opacity: 1;
                }
                80% {
                    transform: translate(-50%, -50%) scale(1.0) rotateY(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.3) rotateY(90deg);
                    opacity: 0;
                }
            }
            
            .arms-trade-card-container {
                will-change: transform, opacity;
            }
            
            .arms-trade-card-display {
                width: 120px;
                height: 168px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.6);
                border: 2px solid rgba(255, 215, 0, 0.8);
            }
            
            .arms-trade-card-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('armsTradeCardCSS');
        if (css) css.remove();
        
        // Remove any remaining card containers
        const containers = document.querySelectorAll('.arms-trade-card-container');
        containers.forEach(container => container.remove());
    }
}

export default ArmsTradeSpell;