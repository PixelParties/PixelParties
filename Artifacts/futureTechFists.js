// ./Artifacts/futureTechFists.js - Future Tech Fists Artifact Implementation
// Grants shield points equal to 10x the number of FutureTechFists cards in graveyard when attacking
// LIMITED: Can only trigger 3 times per battle

export class FutureTechFistsArtifact {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.name = 'FutureTechFists';
        
        // Usage tracking - resets each battle
        this.usageCount = 0;
        this.maxUsages = 3;
    }

    /**
     * Handle FutureTechFists effect when attack hits
     * @param {Object} attacker - The attacking hero
     * @param {Object} defender - The target being attacked
     * @param {number} damage - Damage dealt
     * @param {Object} equipmentItem - The FutureTechFists equipment item
     */
    async handleFutureTechFistsEffect(attacker, defender, damage, equipmentItem) {
        if (!this.battleManager.isAuthoritative) return;

        // Check if we've reached the usage limit
        if (this.usageCount >= this.maxUsages) {
            this.battleManager.addCombatLog(
                `⚡ ${attacker.name}'s Future Tech Fists have no energy left! (${this.usageCount}/${this.maxUsages} uses)`,
                attacker.side === 'player' ? 'warning' : 'info'
            );
            return;
        }

        // Count FutureTechFists cards in the attacker's graveyard
        const futureTechFistsCount = this.countFutureTechFistsInGraveyard(attacker);
        
        if (futureTechFistsCount === 0) {
            return;
        }

        // Calculate shield amount (10 per FutureTechFists card in graveyard)
        const shieldAmount = futureTechFistsCount * 5;

        // Increment usage counter
        this.usageCount++;

        // Apply shield directly to hero object (bypass combat manager to avoid double messaging)
        const oldShield = attacker.currentShield || 0;
        attacker.currentShield = oldShield + shieldAmount;

        // Create visual effect
        this.createShieldGenerationEffect(attacker, shieldAmount);

        // Add combat log message with usage info
        this.battleManager.addCombatLog(
            `⚡ ${attacker.name}'s Future Tech Fists generate ${shieldAmount} shield! (${futureTechFistsCount} cards in graveyard) [${this.usageCount}/${this.maxUsages}]`,
            attacker.side === 'player' ? 'success' : 'info'
        );

        // Update health bar on host side
        this.battleManager.updateHeroHealthBar(attacker.side, attacker.position, attacker.currentHp, attacker.maxHp);

        // Send ONLY the FutureTechFists-specific message (not the generic shield message)
        this.battleManager.sendBattleUpdate('future_tech_fists_shield', {
            attackerAbsoluteSide: attacker.absoluteSide,
            attackerPosition: attacker.position,
            attackerName: attacker.name,
            shieldAmount: shieldAmount,
            futureTechFistsCount: futureTechFistsCount,
            oldShield: oldShield,
            newShield: attacker.currentShield,
            usageCount: this.usageCount,
            maxUsages: this.maxUsages,
            timestamp: Date.now()
        });
    }

    /**
     * Count FutureTechFists cards in the attacker's graveyard
     * @param {Object} attacker - The attacking hero
     * @returns {number} Number of FutureTechFists cards in graveyard
     */
    countFutureTechFistsInGraveyard(attacker) {
        // Determine which graveyard to check based on attacker's side
        let graveyard;
        
        if (attacker.side === 'player') {
            graveyard = this.battleManager.getPlayerGraveyard();
        } else {
            graveyard = this.battleManager.getOpponentGraveyard();
        }

        if (!graveyard || !Array.isArray(graveyard)) {
            return 0;
        }

        // Count occurrences of "FutureTechFists" in the graveyard
        return graveyard.filter(cardName => cardName === 'FutureTechFists').length;
    }

    /**
     * Create visual effect for shield generation
     * @param {Object} hero - Hero gaining shield
     * @param {number} shieldAmount - Amount of shield gained
     */
    createShieldGenerationEffect(hero, shieldAmount) {
        const heroElement = this.battleManager.getHeroElement(hero.side, hero.position);
        if (!heroElement) return;

        // Create shield burst effect
        const shieldBurst = document.createElement('div');
        shieldBurst.className = 'future-tech-shield-burst';

        // Create multiple energy orbs
        const orbCount = Math.min(8, Math.max(4, Math.floor(shieldAmount / 25)));
        for (let i = 0; i < orbCount; i++) {
            const orb = document.createElement('div');
            orb.className = 'tech-energy-orb';
            orb.innerHTML = '⚡';

            // Random positioning around hero
            const angle = (360 / orbCount) * i + (Math.random() * 45 - 22.5);
            const distance = 40 + Math.random() * 20;

            orb.style.cssText = `
                position: absolute;
                font-size: ${12 + Math.random() * 8}px;
                animation: techOrbPulse ${this.battleManager.getSpeedAdjustedDelay(1200)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 600;
                color: #00ccff;
                text-shadow: 0 0 8px #00ccff, 0 0 16px #0099cc;
            `;

            shieldBurst.appendChild(orb);
        }

        // Create shield number display with usage indicator
        const shieldNumber = document.createElement('div');
        shieldNumber.className = 'shield-amount-display';
        shieldNumber.innerHTML = `+${shieldAmount} 🛡️<br><small>[${this.usageCount}/${this.maxUsages}]</small>`;
        shieldNumber.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 18px;
            font-weight: bold;
            color: #00ccff;
            text-shadow: 
                2px 2px 0 #000,
                0 0 10px #00ccff,
                0 0 20px #0099cc;
            z-index: 610;
            animation: shieldNumberRise ${this.battleManager.getSpeedAdjustedDelay(1500)}ms ease-out forwards;
            text-align: center;
        `;

        shieldBurst.appendChild(shieldNumber);

        // Position the burst at hero center
        shieldBurst.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 600;
        `;

        heroElement.appendChild(shieldBurst);

        // Create shield aura effect - dimmer if approaching limit
        const shieldAura = document.createElement('div');
        shieldAura.className = 'tech-shield-aura';
        const intensity = this.usageCount >= this.maxUsages ? 0.1 : 0.3 - (this.usageCount * 0.1);
        shieldAura.style.cssText = `
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            background: radial-gradient(ellipse, rgba(0, 204, 255, ${intensity}) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 590;
            animation: techShieldAura ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        `;

        heroElement.appendChild(shieldAura);

        // Clean up after animation
        setTimeout(() => {
            if (shieldBurst.parentNode) shieldBurst.remove();
            if (shieldAura.parentNode) shieldAura.remove();
        }, this.battleManager.getSpeedAdjustedDelay(1500));
    }

    /**
     * Handle guest receiving shield generation message
     * @param {Object} data - Shield data from host
     */
    handleGuestShieldGeneration(data) {
        if (this.battleManager.isAuthoritative) return;

        const { 
            attackerAbsoluteSide, attackerPosition, attackerName, 
            shieldAmount, futureTechFistsCount, oldShield, newShield,
            usageCount, maxUsages
        } = data;

        // Update local usage counter
        this.usageCount = usageCount;

        // Determine local side for guest
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const attackerLocalSide = (attackerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';

        // Find the attacker hero
        const heroes = attackerLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const attacker = heroes[attackerPosition];

        if (!attacker) {
            console.error(`Could not find hero for shield generation: ${attackerLocalSide} ${attackerPosition}`);
            return;
        }

        // Apply shield directly to hero object (consistent with host)
        attacker.currentShield = newShield; // Use the exact value from host

        // Create visual effect
        this.createShieldGenerationEffect(attacker, shieldAmount);

        // Force update the health bar display
        this.battleManager.updateHeroHealthBar(attackerLocalSide, attackerPosition, attacker.currentHp, attacker.maxHp);
        
        // Double-check shield display after a brief delay (defensive programming)
        setTimeout(() => {
            this.battleManager.updateHeroHealthBar(attackerLocalSide, attackerPosition, attacker.currentHp, attacker.maxHp);
        }, 100);

        // Add to combat log with usage info
        const logType = attackerLocalSide === 'player' ? 'success' : 'info';
        this.battleManager.addCombatLog(
            `⚡ ${attackerName}'s Future Tech Fists generate ${shieldAmount} shield! (${futureTechFistsCount} cards in graveyard) [${usageCount}/${maxUsages}]`,
            logType
        );
        
        // DEBUG: Log for troubleshooting
        console.log(`🛡️ Guest received shield: ${attackerName} now has ${newShield} shield (was ${oldShield}) - Usage: ${usageCount}/${maxUsages}`);
    }

    /**
     * Reset usage counter at start of battle
     */
    resetUsageForNewBattle() {
        this.usageCount = 0;
        console.log(`🔄 FutureTechFists usage counter reset to 0/${this.maxUsages}`);
    }

    /**
     * Check if effect can still be used
     * @returns {boolean} True if usage limit not reached
     */
    canUseEffect() {
        return this.usageCount < this.maxUsages;
    }

    /**
     * Get current usage info
     * @returns {Object} Usage information
     */
    getUsageInfo() {
        return {
            usageCount: this.usageCount,
            maxUsages: this.maxUsages,
            remaining: this.maxUsages - this.usageCount,
            canUse: this.canUseEffect()
        };
    }

    /**
     * Export state for checkpoint system
     * @returns {Object} State data
     */
    exportState() {
        return {
            usageCount: this.usageCount,
            maxUsages: this.maxUsages
        };
    }

    /**
     * Import state from checkpoint system
     * @param {Object} state - State data to import
     */
    importState(state) {
        if (state) {
            this.usageCount = state.usageCount || 0;
            this.maxUsages = state.maxUsages || 3;
            console.log(`🔄 FutureTechFists state restored: ${this.usageCount}/${this.maxUsages} uses`);
        }
    }

    /**
     * Inject CSS for shield generation animations
     */
    static injectShieldGenerationCSS() {
        if (document.getElementById('futureTechFistsStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'futureTechFistsStyles';
        style.textContent = `
            /* Future Tech Fists Shield Generation Effects */
            .future-tech-shield-burst {
                will-change: transform, opacity;
            }

            .tech-energy-orb {
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: center;
                will-change: transform, opacity;
                filter: drop-shadow(0 0 6px rgba(0, 204, 255, 0.8));
            }

            .tech-shield-aura {
                will-change: transform, opacity;
                mix-blend-mode: screen;
            }

            .shield-amount-display {
                will-change: transform, opacity;
            }

            .shield-amount-display small {
                font-size: 12px;
                opacity: 0.8;
                display: block;
                margin-top: 2px;
            }

            /* Animation Keyframes */
            @keyframes techOrbPulse {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.5) rotate(120deg);
                }
                60% {
                    opacity: 0.8;
                    transform: translate(
                        calc(-50% + var(--distance) * cos(var(--angle))),
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) scale(1) rotate(240deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(
                        calc(-50% + var(--distance) * cos(var(--angle))),
                        calc(-50% + var(--distance) * sin(var(--angle)))
                    ) scale(0) rotate(360deg);
                }
            }

            @keyframes techShieldAura {
                0% {
                    opacity: 0;
                    transform: scale(0.8);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.2);
                    background: radial-gradient(ellipse, rgba(0, 204, 255, 0.5) 0%, transparent 70%);
                }
                100% {
                    opacity: 0;
                    transform: scale(1);
                }
            }

            @keyframes shieldNumberRise {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px) scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0px) scale(1.2);
                }
                70% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(-10px) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-30px) scale(0.8);
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Initialize the artifact (inject CSS)
     */
    init() {
        FutureTechFistsArtifact.injectShieldGenerationCSS();
        this.resetUsageForNewBattle(); // Reset at initialization
    }

    /**
     * Cleanup
     */
    cleanup() {
        const css = document.getElementById('futureTechFistsStyles');
        if (css) css.remove();
        this.usageCount = 0;
    }
}

// Also export a default for flexibility
export default FutureTechFistsArtifact;