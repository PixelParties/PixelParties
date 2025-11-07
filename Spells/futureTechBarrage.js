// futureTechBarrage.js - Future Tech Barrage Fighting Spell Implementation

import { getCardInfo } from '../cardDatabase.js';

export class FutureTechBarrageSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'FutureTechBarrage';
    }

    getTriggerChance(attacker, target, damage) {
        // 25% chance to trigger, but ONLY if attacker has artifacts
        if (!this.hasArtifacts(attacker)) {
            return 0; // Cannot trigger without artifacts
        }
        return 0.25;
    }

    /**
     * Check if hero has any artifacts equipped
     * @param {Object} hero - The hero to check
     * @returns {boolean} - True if hero has artifacts
     */
    hasArtifacts(hero) {
        if (!hero.equipment || hero.equipment.length === 0) {
            return false;
        }
        
        // Filter for actual artifacts
        const artifacts = hero.equipment.filter(item => {
            const cardName = item.name || item.cardName;
            const cardInfo = getCardInfo(cardName);
            return cardInfo && cardInfo.cardType === 'Artifact';
        });
        
        return artifacts.length > 0;
    }

    /**
     * Execute Future Tech Barrage effect
     * Doubles damage and removes one random artifact
     * @param {Object} attacker - The hero who attacked
     * @param {Object} target - The target that was attacked
     * @param {number} attackDamage - The original damage that was dealt
     * @returns {Promise<number>} - Modified damage (doubled)
     */
    async executeEffect(attacker, target, attackDamage) {
        // Double-check artifacts are available (safety check)
        if (!attacker.equipment || attacker.equipment.length === 0) {
            return attackDamage;
        }
        
        // Get all artifacts
        const artifacts = attacker.equipment.filter(item => {
            const cardName = item.name || item.cardName;
            const cardInfo = getCardInfo(cardName);
            return cardInfo && cardInfo.cardType === 'Artifact';
        });
        
        if (artifacts.length === 0) {
            return attackDamage;
        }

        // Select random artifact to remove using deterministic randomness
        const artifactToRemove = this.battleManager.getRandomChoice(artifacts);
        
        if (!artifactToRemove) {
            console.warn('Future Tech Barrage: Failed to select artifact');
            return attackDamage;
        }

        const artifactName = artifactToRemove.name || artifactToRemove.cardName;

        // Remove the artifact temporarily (for this battle only)
        const index = attacker.equipment.indexOf(artifactToRemove);
        if (index !== -1) {
            attacker.equipment.splice(index, 1);
        }

        // Recalculate equipment bonuses (this updates stats immediately)
        if (window.heroEquipmentManager && window.heroEquipmentManager.recalculateEquipmentBonuses) {
            window.heroEquipmentManager.recalculateEquipmentBonuses(attacker, this.battleManager);
        }

        // Calculate additional damage needed (original damage already dealt)
        const additionalDamage = attackDamage;
        const totalDamage = attackDamage * 2;

        // Apply the additional damage to the target
        await this.applyAdditionalDamage(target, additionalDamage, attacker);

        // Log the effect
        this.battleManager.addCombatLog(
            `⚡ ${attacker.name}'s Future Tech Barrage activates! Lost ${this.formatArtifactName(artifactName)} (+${additionalDamage} bonus damage)`,
            attacker.side === 'player' ? 'success' : 'error'
        );

        // Show visual effect
        this.showBarrageEffect(attacker, target, artifactName, totalDamage);

        // Sync to guest if we're the host
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('future_tech_barrage_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                targetInfo: this.getTargetSyncInfo(target),
                artifactRemoved: artifactName,
                additionalDamage: additionalDamage,
                timestamp: Date.now()
            });
        }

        return totalDamage;
    }

    /**
     * Apply additional damage to target through proper combat system
     * Routes through damageSourceManager and handles all effects properly
     * @param {Object} target - Target to damage
     * @param {Number} damage - Additional damage amount
     * @param {Object} source - Source of damage (attacker)
     */
    async applyAdditionalDamage(target, damage, source) {
        if (!target || !target.alive || damage <= 0) return;

        // Create damage context for the combat system
        const damageContext = {
            source: 'spell_effect', // This is bonus spell damage, not a direct attack
            attacker: source,
            spell: 'FutureTechBarrage',
            isBonus: true
        };

        // For heroes - use the proper combat damage system
        if (target.type === 'hero' || !target.type) {
            // Apply damage modifications through damage source manager
            let finalDamage = damage;
            
            if (this.battleManager.damageSourceManager) {
                const result = this.battleManager.damageSourceManager.applyDamageModifications(
                    target, 
                    damage, 
                    damageContext
                );
                finalDamage = result.finalDamage;
            }

            // Apply damage through shield first, then HP
            let remainingDamage = finalDamage;
            
            if (target.currentShield && target.currentShield > 0) {
                const shieldAbsorbed = Math.min(target.currentShield, remainingDamage);
                target.currentShield -= shieldAbsorbed;
                remainingDamage -= shieldAbsorbed;
            }
            
            if (remainingDamage > 0) {
                target.currentHp = Math.max(0, target.currentHp - remainingDamage);
            }
            
            // Update health bar display
            this.battleManager.updateHeroHealthBar(target.side, target.position, target.currentHp, target.maxHp);
            
            // Check if hero died and handle death properly
            if (target.currentHp <= 0 && target.alive) {
                target.alive = false;
                target.currentHp = 0;
                
                // Use proper death handling through battle manager
                // This grays out the hero and clears status effects
                if (this.battleManager.handleHeroDeath) {
                    this.battleManager.handleHeroDeath(target);
                }
                
                // Check if battle has ended (all heroes on one side defeated)
                if (this.battleManager.checkBattleEnd) {
                    this.battleManager.checkBattleEnd();
                }
            }
        }
        // For creatures - use creature-specific damage system
        else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return;

            const { hero: ownerHero, side, position, creatureIndex } = creatureInfo;
            
            // Apply damage modifications through damage source manager
            let finalDamage = damage;
            
            if (this.battleManager.damageSourceManager) {
                const result = this.battleManager.damageSourceManager.applyDamageModifications(
                    target, 
                    damage, 
                    damageContext
                );
                finalDamage = result.finalDamage;
            }

            // Apply damage to creature
            const oldHp = target.currentHp;
            target.currentHp = Math.max(0, target.currentHp - finalDamage);
            
            // Update creature display
            if (this.battleManager.updateCreatureDisplay) {
                this.battleManager.updateCreatureDisplay(side, position, creatureIndex);
            }
            
            // Check if creature died
            if (target.currentHp <= 0 && target.alive) {
                target.alive = false;
                target.currentHp = 0;
                
                // Trigger death effects through proper system
                if (this.battleManager.triggerCreatureDeathEffects) {
                    await this.battleManager.triggerCreatureDeathEffects(
                        target, 
                        ownerHero, 
                        source, 
                        damageContext
                    );
                }
                
                // Handle creature removal from hero
                if (this.battleManager.handleCreatureDeath) {
                    this.battleManager.handleCreatureDeath(ownerHero, target, creatureIndex, side, position);
                }
            }
        }
    }

    /**
     * Handle guest receiving Future Tech Barrage effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, artifactRemoved, additionalDamage, targetInfo } = data;
        
        // Find local attacker and target
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        const localTarget = this.findTargetFromSyncInfo(targetInfo);
        
        if (!localAttacker) {
            console.warn('Could not find local attacker for Future Tech Barrage effect');
            return;
        }

        if (!localTarget) {
            console.warn('Could not find local target for Future Tech Barrage effect');
            return;
        }

        // Find and remove the artifact
        if (localAttacker.equipment && Array.isArray(localAttacker.equipment)) {
            const artifactIndex = localAttacker.equipment.findIndex(item => {
                const name = item.name || item.cardName;
                return name === artifactRemoved;
            });
            
            if (artifactIndex !== -1) {
                localAttacker.equipment.splice(artifactIndex, 1);
            }
        }

        // Recalculate equipment bonuses
        if (window.heroEquipmentManager && window.heroEquipmentManager.recalculateEquipmentBonuses) {
            window.heroEquipmentManager.recalculateEquipmentBonuses(localAttacker, this.battleManager);
        }

        // Apply the additional damage to match host
        await this.applyAdditionalDamage(localTarget, additionalDamage, localAttacker);

        // Log the effect
        this.battleManager.addCombatLog(
            `⚡ ${localAttacker.name}'s Future Tech Barrage activates! Lost ${this.formatArtifactName(artifactRemoved)} (+${additionalDamage} bonus damage)`,
            localAttacker.side === 'player' ? 'success' : 'error'
        );

        // Show the visual effect
        const totalDamage = additionalDamage * 2; // For display purposes
        this.showBarrageEffect(localAttacker, localTarget, artifactRemoved, totalDamage);
    }

    /**
     * Show visual effect for Future Tech Barrage
     * @param {Object} attacker - The attacking hero
     * @param {Object} target - The target being hit
     * @param {string} artifactName - Name of removed artifact
     * @param {number} damage - The doubled damage
     */
    showBarrageEffect(attacker, target, artifactName, damage) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) {
            console.warn('Could not find target element for Future Tech Barrage effect');
            return;
        }

        // Ensure CSS exists
        this.ensureBarrageCSS();

        // Create main effect container
        const effectContainer = document.createElement('div');
        effectContainer.className = 'future-tech-barrage-container';
        effectContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 1000;
            overflow: visible;
        `;

        // Create energy burst effect
        const energyBurst = document.createElement('div');
        energyBurst.className = 'ftb-energy-burst';
        effectContainer.appendChild(energyBurst);

        // Create tech particles
        for (let i = 0; i < 8; i++) {
            const particle = this.createTechParticle(i);
            effectContainer.appendChild(particle);
        }

        // Add damage indicator
        const damageIndicator = document.createElement('div');
        damageIndicator.className = 'ftb-damage-indicator';
        damageIndicator.innerHTML = `
            <div class="ftb-damage-text">
                ⚡ ⚡ ⚡
            </div>
        `;
        effectContainer.appendChild(damageIndicator);

        // Add lost artifact indicator
        const artifactIndicator = document.createElement('div');
        artifactIndicator.className = 'ftb-artifact-lost';
        artifactIndicator.textContent = `Lost: ${this.formatArtifactName(artifactName)}`;
        effectContainer.appendChild(artifactIndicator);

        // Add screen flash
        this.addScreenFlash();

        // Add to target
        targetElement.appendChild(effectContainer);

        // Clean up after animation
        const animDuration = this.battleManager.getSpeedAdjustedDelay(1500);
        setTimeout(() => {
            if (effectContainer.parentNode) {
                effectContainer.remove();
            }
        }, animDuration);
    }

    /**
     * Create a single tech particle
     * @param {number} index - Particle index for positioning
     * @returns {HTMLElement} - Particle element
     */
    createTechParticle(index) {
        const particle = document.createElement('div');
        particle.className = 'ftb-tech-particle';
        
        const angle = (index / 8) * 360;
        const delay = index * 50;
        
        particle.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 8px;
            height: 8px;
            background: linear-gradient(135deg, #00f5ff, #00bfff);
            border-radius: 50%;
            box-shadow: 0 0 10px #00f5ff, 0 0 20px #00bfff;
            transform: translate(-50%, -50%);
            animation: ftbParticle ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out ${delay}ms forwards;
            --particle-angle: ${angle}deg;
        `;
        
        return particle;
    }

    /**
     * Add screen flash effect
     */
    addScreenFlash() {
        const battleArea = document.querySelector('.battle-area');
        if (!battleArea) return;
        
        const flash = document.createElement('div');
        flash.className = 'ftb-screen-flash';
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 245, 255, 0.3);
            pointer-events: none;
            z-index: 9999;
            animation: ftbFlash ${this.battleManager.getSpeedAdjustedDelay(400)}ms ease-out;
        `;
        
        document.body.appendChild(flash);
        
        setTimeout(() => {
            if (flash.parentNode) {
                flash.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(400));
    }

    /**
     * Get target element (hero or creature)
     * @param {Object} target - Target object
     * @returns {HTMLElement|null} - DOM element
     */
    getTargetElement(target) {
        if (!target) return null;
        
        if (target.type === 'hero' || !target.type) {
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
    }

    /**
     * Get target sync information for network communication
     * @param {Object} target - Target object
     * @returns {Object|null} - Sync information
     */
    getTargetSyncInfo(target) {
        if (!target) return null;
        
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
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            
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
     * Find target from sync information
     * @param {Object} targetInfo - Target sync info
     * @returns {Object|null} - Target object or null
     */
    findTargetFromSyncInfo(targetInfo) {
        if (!targetInfo) return null;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetInfo.type === 'hero') {
            const heroes = localSide === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            return heroes[targetInfo.position];
        } else {
            const heroes = localSide === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
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
     * Ensure CSS for visual effects exists
     */
    ensureBarrageCSS() {
        if (document.getElementById('futureTechBarrageCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'futureTechBarrageCSS';
        style.textContent = `
            @keyframes ftbEnergyBurst {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
                20% {
                    transform: translate(-50%, -50%) scale(1.5);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(3);
                    opacity: 0;
                }
            }
            
            @keyframes ftbParticle {
                0% {
                    transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(0);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(100px);
                    opacity: 0;
                }
            }
            
            @keyframes ftbDamageIndicator {
                0% {
                    transform: translateX(-50%) translateY(0) scale(0);
                    opacity: 0;
                }
                20% {
                    transform: translateX(-50%) translateY(-20px) scale(1.3);
                    opacity: 1;
                }
                80% {
                    transform: translateX(-50%) translateY(-30px) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateX(-50%) translateY(-40px) scale(0.8);
                    opacity: 0;
                }
            }
            
            @keyframes ftbArtifactLost {
                0% {
                    transform: translateX(-50%) translateY(0) scale(1);
                    opacity: 0;
                }
                20% {
                    transform: translateX(-50%) translateY(10px) scale(1.1);
                    opacity: 1;
                }
                80% {
                    transform: translateX(-50%) translateY(20px) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateX(-50%) translateY(30px) scale(0.9);
                    opacity: 0;
                }
            }
            
            @keyframes ftbFlash {
                0% {
                    opacity: 0;
                }
                50% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                }
            }
            
            .future-tech-barrage-container {
                will-change: transform, opacity;
            }
            
            .ftb-energy-burst {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 120px;
                height: 120px;
                background: radial-gradient(circle,
                    rgba(0, 245, 255, 0.8) 0%,
                    rgba(0, 191, 255, 0.6) 30%,
                    rgba(0, 191, 255, 0.3) 60%,
                    transparent 100%
                );
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: ftbEnergyBurst 1000ms ease-out forwards;
                box-shadow: 0 0 40px rgba(0, 245, 255, 0.6);
                mix-blend-mode: screen;
            }
            
            .ftb-tech-particle {
                will-change: transform, opacity;
            }
            
            .ftb-damage-indicator {
                position: absolute;
                top: -50px;
                left: 50%;
                transform: translateX(-50%);
                animation: ftbDamageIndicator 1200ms ease-out forwards;
                z-index: 1100;
            }
            
            .ftb-damage-text {
                font-size: 32px;
                font-weight: bold;
                color: #00f5ff;
                text-shadow: 
                    0 0 10px rgba(0, 245, 255, 0.8),
                    0 0 20px rgba(0, 191, 255, 0.6),
                    2px 2px 4px rgba(0, 0, 0, 0.8);
                white-space: nowrap;
            }
            
            .ftb-artifact-lost {
                position: absolute;
                bottom: -60px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 14px;
                font-weight: bold;
                color: #ff6b6b;
                text-shadow: 
                    0 0 8px rgba(255, 107, 107, 0.8),
                    1px 1px 3px rgba(0, 0, 0, 0.8);
                white-space: nowrap;
                animation: ftbArtifactLost 1200ms ease-out forwards;
                z-index: 1100;
            }
            
            .ftb-screen-flash {
                will-change: opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('futureTechBarrageCSS');
        if (css) css.remove();
        
        // Remove any remaining effect containers
        const containers = document.querySelectorAll('.future-tech-barrage-container');
        containers.forEach(container => container.remove());
        
        // Remove any remaining flashes
        const flashes = document.querySelectorAll('.ftb-screen-flash');
        flashes.forEach(flash => flash.remove());
    }
}

export default FutureTechBarrageSpell;