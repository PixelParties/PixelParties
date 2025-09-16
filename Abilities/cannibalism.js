// ./Abilities/cannibalism.js - Cannibalism Ability Implementation
// Heals attacker for 10% of damage dealt × Cannibalism level on basic attacks

export class CannibalismAbility {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.abilityName = 'Cannibalism';
    }

    // ============================================
    // CORE CANNIBALISM LOGIC
    // ============================================

    /**
     * Check if hero has Cannibalism ability and apply healing if applicable
     * @param {Object} attacker - The attacking hero
     * @param {Object} target - The target that was hit
     * @param {number} damageDealt - Actual damage dealt to the target
     * @param {string} attackType - Type of attack ('basic', 'spell', etc.)
     */
    async checkAndApplyCannibalism(attacker, target, damageDealt, attackType = 'basic') {
        // Only process basic attacks
        if (attackType !== 'basic') return;
        
        // Only process for living heroes with Cannibalism
        if (!attacker || !attacker.alive || attacker.type === 'creature') return;
        if (!attacker.hasAbility || !attacker.hasAbility('Cannibalism')) return;
        
        // Must have dealt actual damage
        if (!damageDealt || damageDealt <= 0) return;
        
        // Get Cannibalism level (number of Cannibalism abilities)
        const cannibalismLevel = attacker.getAbilityStackCount('Cannibalism');
        if (cannibalismLevel <= 0) return;
        
        // Calculate healing: 10% of damage dealt × Cannibalism level
        const baseHealing = Math.floor(damageDealt * 0.1);
        const totalHealing = baseHealing * cannibalismLevel;
        
        // Apply the healing
        await this.applyCannibalismHealing(attacker, target, totalHealing, damageDealt, cannibalismLevel);
    }

    /**
     * Apply cannibalism healing to the attacker
     * @param {Object} attacker - The hero to heal
     * @param {Object} target - The target that was attacked (for logging)
     * @param {number} healAmount - Amount to heal
     * @param {number} damageDealt - Original damage dealt
     * @param {number} cannibalismLevel - Level of Cannibalism ability
     */
    async applyCannibalismHealing(attacker, target, healAmount, damageDealt, cannibalismLevel) {
        if (healAmount <= 0) return;
        
        // Store old HP for logging
        const oldHp = attacker.currentHp;
        
        // Apply healing (hero.heal() automatically caps at maxHp)
        const healResult = attacker.heal(healAmount);
        const actualHealing = healResult.newHp - oldHp;
        
        // Only proceed if actual healing occurred
        if (actualHealing <= 0) return;
        
        // Update health bar
        this.battleManager.updateHeroHealthBar(attacker.side, attacker.position, attacker.currentHp, attacker.maxHp);
        
        // Create visual effect
        this.createCannibalismEffect(attacker);
        
        // Add combat log
        this.logCannibalismHealing(attacker, target, actualHealing, damageDealt, cannibalismLevel);
        
        // Send network update to guest
        if (this.battleManager.isAuthoritative) {
            this.sendCannibalismUpdate(attacker, target, actualHealing, damageDealt, cannibalismLevel);
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    /**
     * Create visual effect for cannibalism healing
     * @param {Object} hero - The hero being healed
     */
    createCannibalismEffect(hero) {
        const heroElement = this.battleManager.getHeroElement(hero.side, hero.position);
        if (!heroElement) return;
        
        // Create main cannibalism effect
        const effect = document.createElement('div');
        effect.className = 'cannibalism-effect';
        effect.innerHTML = '🩸➡️❤️';
        
        effect.style.cssText = `
            position: absolute;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 28px;
            z-index: 500;
            pointer-events: none;
            animation: cannibalismHeal ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
            text-shadow: 
                0 0 10px rgba(220, 20, 60, 0.8),
                0 0 20px rgba(255, 69, 0, 0.6),
                0 0 30px rgba(255, 215, 0, 0.4);
        `;
        
        heroElement.appendChild(effect);
        
        // Create blood drop particles
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createBloodDrop(heroElement, i);
            }, this.battleManager.getSpeedAdjustedDelay(i * 100));
        }
        
        // Create healing glow
        this.createHealingGlow(heroElement);
        
        // Clean up after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(1000));
    }

    /**
     * Create individual blood drop particle
     * @param {HTMLElement} heroElement - Hero element to attach effect to
     * @param {number} index - Drop index for positioning variation
     */
    createBloodDrop(heroElement, index) {
        const drop = document.createElement('div');
        drop.className = 'cannibalism-blood-drop';
        drop.innerHTML = '🩸';
        
        const angle = (index * 72) + (Math.random() * 30 - 15); // 72° apart with variation
        const distance = 20 + Math.random() * 15;
        
        drop.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: ${16 + Math.random() * 8}px;
            z-index: 499;
            pointer-events: none;
            animation: bloodDropFly ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
            --angle: ${angle}deg;
            --distance: ${distance}px;
        `;
        
        heroElement.appendChild(drop);
        
        // Remove after animation
        setTimeout(() => {
            if (drop && drop.parentNode) {
                drop.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(800));
    }

    /**
     * Create healing glow effect
     * @param {HTMLElement} heroElement - Hero element to attach effect to
     */
    createHealingGlow(heroElement) {
        const glow = document.createElement('div');
        glow.className = 'cannibalism-healing-glow';
        
        glow.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(220, 20, 60, 0.3) 0%, transparent 70%);
            pointer-events: none;
            z-index: 490;
            animation: cannibalismGlow ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        `;
        
        heroElement.appendChild(glow);
        
        // Remove after animation
        setTimeout(() => {
            if (glow && glow.parentNode) {
                glow.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(1000));
    }

    // ============================================
    // LOGGING AND NETWORK SYNC
    // ============================================

    /**
     * Log cannibalism healing to combat log
     * @param {Object} attacker - The healing hero
     * @param {Object} target - The target that was attacked
     * @param {number} actualHealing - Amount actually healed
     * @param {number} damageDealt - Original damage dealt
     * @param {number} cannibalismLevel - Level of Cannibalism ability
     */
    logCannibalismHealing(attacker, target, actualHealing, damageDealt, cannibalismLevel) {
        const targetName = target.name || (target.type === 'creature' ? target.name : 'Unknown');
        const logType = attacker.side === 'player' ? 'success' : 'error';
        
        this.battleManager.addCombatLog(
            `🩸 ${attacker.name}'s Cannibalism heals ${actualHealing} HP from ${targetName}! (${damageDealt} dmg × 10% × ${cannibalismLevel})`,
            logType
        );
    }

    /**
     * Send cannibalism update to guest
     * @param {Object} attacker - The healing hero
     * @param {Object} target - The target that was attacked
     * @param {number} actualHealing - Amount actually healed
     * @param {number} damageDealt - Original damage dealt
     * @param {number} cannibalismLevel - Level of Cannibalism ability
     */
    sendCannibalismUpdate(attacker, target, actualHealing, damageDealt, cannibalismLevel) {
        // Get target info for sync
        const targetInfo = this.getTargetSyncInfo(target);
        
        this.battleManager.sendBattleUpdate('cannibalism_healing', {
            attackerAbsoluteSide: attacker.absoluteSide,
            attackerPosition: attacker.position,
            attackerName: attacker.name,
            targetInfo: targetInfo,
            healing: actualHealing,
            damageDealt: damageDealt,
            cannibalismLevel: cannibalismLevel,
            newHp: attacker.currentHp,
            maxHp: attacker.maxHp,
            timestamp: Date.now()
        });
    }

    /**
     * Get target sync info for network updates
     * @param {Object} target - The target to get sync info for
     * @returns {Object} - Sync info object
     */
    getTargetSyncInfo(target) {
        if (target.type === 'creature') {
            // Find creature info
            const creatureInfo = this.findCreatureInfo(target);
            if (creatureInfo) {
                return {
                    type: 'creature',
                    name: target.name,
                    absoluteSide: creatureInfo.hero.absoluteSide,
                    position: creatureInfo.position,
                    creatureIndex: creatureInfo.creatureIndex
                };
            }
        }
        
        // Hero or fallback
        return {
            type: 'hero',
            name: target.name,
            absoluteSide: target.absoluteSide,
            position: target.position
        };
    }

    /**
     * Find creature information in battle
     * @param {Object} creature - The creature to find
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

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    /**
     * Handle cannibalism healing on guest side
     * @param {Object} data - Healing data from host
     */
    handleGuestCannibalismHealing(data) {
        if (this.battleManager.isAuthoritative) return;
        
        const { 
            attackerAbsoluteSide, 
            attackerPosition, 
            attackerName, 
            targetInfo, 
            healing, 
            damageDealt, 
            cannibalismLevel,
            newHp,
            maxHp
        } = data;
        
        // Determine local sides for guest
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const attackerLocalSide = (attackerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the attacker hero
        const heroes = attackerLocalSide === 'player' ? 
            this.battleManager.playerHeroes : 
            this.battleManager.opponentHeroes;
        const attacker = heroes[attackerPosition];
        
        if (!attacker) {
            console.error(`Cannibalism: Hero not found for healing: ${attackerLocalSide} ${attackerPosition}`);
            return;
        }
        
        // Update hero HP
        attacker.currentHp = newHp;
        
        // Update health bar
        this.battleManager.updateHeroHealthBar(attackerLocalSide, attackerPosition, newHp, maxHp);
        
        // Create visual effect
        this.createCannibalismEffect(attacker);
        
        // Add to combat log
        const logType = attackerLocalSide === 'player' ? 'success' : 'error';
        const targetName = targetInfo.name || 'Unknown';
        
        this.battleManager.addCombatLog(
            `🩸 ${attackerName}'s Cannibalism heals ${healing} HP from ${targetName}! (${damageDealt} dmg × 10% × ${cannibalismLevel})`,
            logType
        );
    }

    // ============================================
    // CSS AND CLEANUP
    // ============================================

    /**
     * Ensure CSS animations exist for cannibalism effects
     */
    ensureCannibalismCSS() {
        if (document.getElementById('cannibalismCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'cannibalismCSS';
        style.textContent = `
            @keyframes cannibalismHeal {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                25% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0);
                }
                75% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.1);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
            }
            
            @keyframes bloodDropFly {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0);
                }
                100% {
                    opacity: 0;
                    transform: 
                        translate(
                            calc(-50% + var(--distance) * cos(var(--angle))),
                            calc(-50% + var(--distance) * sin(var(--angle)))
                        )
                        scale(0.3);
                }
            }
            
            @keyframes cannibalismGlow {
                0% {
                    opacity: 0;
                    transform: scale(0.8);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: scale(1);
                }
            }
            
            .cannibalism-effect {
                will-change: transform, opacity;
                font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;
            }
            
            .cannibalism-blood-drop {
                will-change: transform, opacity;
                font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;
            }
            
            .cannibalism-healing-glow {
                will-change: transform, opacity;
                mix-blend-mode: soft-light;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Initialize cannibalism system
     */
    init() {
        this.ensureCannibalismCSS();
    }

    /**
     * Cleanup cannibalism effects
     */
    cleanup() {
        // Remove any remaining effects
        const effects = document.querySelectorAll('.cannibalism-effect, .cannibalism-blood-drop, .cannibalism-healing-glow');
        effects.forEach(effect => effect.remove());
        
        // Remove CSS
        const css = document.getElementById('cannibalismCSS');
        if (css) css.remove();
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get ability information
     * @returns {Object} - Ability info
     */
    getAbilityInfo() {
        return {
            name: this.abilityName,
            description: 'On basic attacks, heal for 10% of damage dealt × Cannibalism level',
            trigger: 'on_attack_hit',
            type: 'healing',
            stackable: true
        };
    }

    /**
     * Check if this ability can handle the given ability name
     * @param {string} abilityName - Name to check
     * @returns {boolean} - True if this handles the ability
     */
    canHandle(abilityName) {
        return abilityName === this.abilityName;
    }
}

// Export for use in battle system
export default CannibalismAbility;