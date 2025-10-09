// thep.js - Thep Hero Revival Effect
// Thep's Divine Protection: If an ally Hero would die while Thep is alive,
// they are revived to HP equal to 10 × graveyard size (minimum 10 HP)
// Each Hero can only be revived once per battle by this effect

export class ThepHeroEffect {
    /**
     * Check if a dying hero should be revived by Thep's protection
     * @param {Object} dyingHero - The hero that would die
     * @param {Object} battleManager - Battle manager instance
     * @returns {boolean} - True if revival occurred
     */
    static async checkThepRevival(dyingHero, battleManager) {
        if (!battleManager.isAuthoritative) return false;
        
        // Check if hero has already been revived by Thep this battle
        if (dyingHero.customStats && dyingHero.customStats.revivedByThep) {
            return false; // Already revived once, cannot be revived again
        }
        
        // Find Thep on the same team
        const allyHeroes = dyingHero.side === 'player' ? 
            battleManager.playerHeroes : battleManager.opponentHeroes;
        
        let thepHero = null;
        for (const position of ['left', 'center', 'right']) {
            const hero = allyHeroes[position];
            if (hero && hero.name === 'Thep' && hero.alive && hero !== dyingHero) {
                thepHero = hero;
                break;
            }
        }
        
        // No living Thep found
        if (!thepHero) {
            return false;
        }
        
        // Get graveyard size for HP calculation
        const graveyard = dyingHero.side === 'player' ? 
            battleManager.getPlayerGraveyard() : battleManager.getOpponentGraveyard();
        
        const graveyardSize = graveyard ? graveyard.length : 0;
        const revivalHp = Math.max(10, graveyardSize * 10);
        
        // Play the revival animation
        await this.playThepRevivalAnimation(dyingHero, battleManager, revivalHp, graveyardSize);
        
        // Send network update to guest
        this.sendRevivalUpdate(thepHero, dyingHero, revivalHp, graveyardSize, battleManager);
        
        return true;
    }
    
    /**
     * Play the Thep revival animation with green healing effects
     * @param {Object} hero - Hero being revived
     * @param {Object} battleManager - Battle manager instance
     * @param {number} revivalHp - HP to revive with
     * @param {number} graveyardSize - Size of graveyard
     */
    static async playThepRevivalAnimation(hero, battleManager, revivalHp, graveyardSize) {
        const targetElement = battleManager.getHeroElement(hero.side, hero.position);
        
        if (!targetElement) {
            console.error('Could not find target element for Thep revival animation');
            // Still perform the revival even if animation fails
            this.reviveHero(hero, revivalHp, battleManager);
            return;
        }
        
        // Ensure CSS exists
        this.ensureThepRevivalCSS();
        
        // Create green healing light burst
        const revivalLight = document.createElement('div');
        revivalLight.className = 'thep-revival-effect';
        revivalLight.innerHTML = '💚✨💚';
        
        revivalLight.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 1000;
            pointer-events: none;
            animation: thepRevivalBurst 2s ease-out forwards;
            text-shadow: 
                0 0 30px #00ff00,
                0 0 60px #00ff88,
                0 0 90px #ffffff;
        `;
        
        // Create healing rays (green instead of gold)
        for (let i = 0; i < 8; i++) {
            const healingRay = document.createElement('div');
            healingRay.className = 'thep-healing-ray';
            
            const angle = (i * 45) + (Math.random() * 20 - 10);
            const length = 100 + Math.random() * 50;
            
            healingRay.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: center;
                transform: translate(-50%, -50%) rotate(${angle}deg);
                width: 3px;
                height: ${length}px;
                background: linear-gradient(to bottom, 
                    rgba(0, 255, 0, 0.9) 0%,
                    rgba(0, 255, 136, 0.7) 50%,
                    transparent 100%);
                z-index: 999;
                pointer-events: none;
                animation: thepHealingRay 2s ease-out forwards;
            `;
            
            targetElement.appendChild(healingRay);
            
            setTimeout(() => {
                if (healingRay && healingRay.parentNode) {
                    healingRay.remove();
                }
            }, 2000);
        }
        
        targetElement.appendChild(revivalLight);
        
        // Add green healing pulse to card
        const card = targetElement.querySelector('.battle-hero-card');
        if (card) {
            card.style.animation = 'thepHealingPulse 2s ease-out';
            setTimeout(() => {
                if (card) {
                    card.style.animation = '';
                }
            }, 2000);
        }
        
        // Wait for animation to start
        await battleManager.delay(1000);
        
        // Perform the actual revival
        this.reviveHero(hero, revivalHp, battleManager);
        
        // Wait for animation to complete
        await battleManager.delay(1000);
        
        if (revivalLight && revivalLight.parentNode) {
            revivalLight.remove();
        }
    }
    
    /**
     * Revive the hero with specified HP
     * @param {Object} hero - Hero to revive
     * @param {number} revivalHp - HP to revive with
     * @param {Object} battleManager - Battle manager instance
     */
    static reviveHero(hero, revivalHp, battleManager) {
        // Revive the hero
        hero.alive = true;
        hero.currentHp = revivalHp;
        
        // Mark hero as revived by Thep (cannot be revived again)
        if (!hero.customStats) {
            hero.customStats = {};
        }
        hero.customStats.revivedByThep = true;
        
        // Update hero visual state (following ForcefulRevival pattern)
        this.updateHeroVisualState(hero.side, hero.position, hero, battleManager);
        
        // Log the revival
        battleManager.addCombatLog(
            `💚 Thep's divine protection revives ${hero.name} with ${revivalHp} HP!`,
            hero.side === 'player' ? 'success' : 'error'
        );
    }
    
    /**
     * Update hero visual state after revival (from ForcefulRevival pattern)
     * @param {string} side - Hero side
     * @param {string} position - Hero position
     * @param {Object} hero - Hero object
     * @param {Object} battleManager - Battle manager instance
     */
    static updateHeroVisualState(side, position, hero, battleManager) {
        // Remove defeated visual state
        const heroElement = battleManager.getHeroElement(side, position);
        if (heroElement) {
            const card = heroElement.querySelector('.battle-hero-card');
            if (card) {
                card.classList.remove('defeated');
                card.style.filter = '';
                card.style.opacity = '';
                card.style.transform = '';
            }
        }
        
        // Update health bar
        battleManager.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
    }
    
    /**
     * Send revival update to network
     * @param {Object} thepHero - Thep hero that triggered revival
     * @param {Object} dyingHero - Hero being revived
     * @param {number} revivalHp - HP being revived with
     * @param {number} graveyardSize - Size of graveyard
     * @param {Object} battleManager - Battle manager instance
     */
    static sendRevivalUpdate(thepHero, dyingHero, revivalHp, graveyardSize, battleManager) {
        battleManager.sendBattleUpdate('thep_revival', {
            dyingHeroAbsoluteSide: dyingHero.absoluteSide,
            dyingHeroPosition: dyingHero.position,
            dyingHeroName: dyingHero.name,
            thepPosition: thepHero.position,
            revivalHp: revivalHp,
            graveyardSize: graveyardSize,
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle guest receiving Thep revival from host
     * @param {Object} data - Revival data from host
     * @param {Object} battleManager - Battle manager instance
     */
    static handleGuestThepRevival(data, battleManager) {
        if (battleManager.isAuthoritative) {
            console.warn('Host should not receive Thep revival messages');
            return;
        }
        
        const { dyingHeroAbsoluteSide, dyingHeroPosition, dyingHeroName, revivalHp, graveyardSize } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const dyingHeroLocalSide = (dyingHeroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the dying hero
        const heroes = dyingHeroLocalSide === 'player' ? 
            battleManager.playerHeroes : battleManager.opponentHeroes;
        const dyingHero = heroes[dyingHeroPosition];
        
        if (!dyingHero) {
            console.error(`Guest: Hero not found for Thep revival: ${dyingHeroLocalSide} ${dyingHeroPosition}`);
            return;
        }
        
        // Play guest-side animation (visual only)
        this.playGuestSideAnimation(dyingHero, revivalHp, dyingHeroLocalSide, dyingHeroPosition, battleManager);
        
        // Add to combat log
        const logType = dyingHeroLocalSide === 'player' ? 'success' : 'error';
        battleManager.addCombatLog(
            `💚 Thep's divine protection revives ${dyingHeroName} with ${revivalHp} HP! (${graveyardSize} cards in graveyard)`,
            logType
        );
    }
    
    /**
     * Guest-side animation (visual only, revival already handled)
     * @param {Object} hero - Hero being revived
     * @param {number} revivalHp - HP being revived with
     * @param {string} side - Local side
     * @param {string} position - Hero position
     * @param {Object} battleManager - Battle manager instance
     */
    static async playGuestSideAnimation(hero, revivalHp, side, position, battleManager) {
        // Apply revival first
        hero.alive = true;
        hero.currentHp = revivalHp;
        
        // Mark as revived by Thep
        if (!hero.customStats) {
            hero.customStats = {};
        }
        hero.customStats.revivedByThep = true;
        
        // Update visual state immediately
        this.updateHeroVisualState(side, position, hero, battleManager);
        
        const targetElement = battleManager.getHeroElement(side, position);
        
        if (!targetElement) {
            console.error('Could not find target element for guest Thep revival animation');
            return;
        }
        
        // Ensure CSS exists
        this.ensureThepRevivalCSS();
        
        // Create green healing light burst
        const revivalLight = document.createElement('div');
        revivalLight.className = 'thep-revival-effect';
        revivalLight.innerHTML = '💚✨💚';
        
        revivalLight.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 1000;
            pointer-events: none;
            animation: thepRevivalBurst 2s ease-out forwards;
            text-shadow: 
                0 0 30px #00ff00,
                0 0 60px #00ff88,
                0 0 90px #ffffff;
        `;
        
        // Create healing rays
        for (let i = 0; i < 8; i++) {
            const healingRay = document.createElement('div');
            healingRay.className = 'thep-healing-ray';
            
            const angle = (i * 45) + (Math.random() * 20 - 10);
            const length = 100 + Math.random() * 50;
            
            healingRay.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: center;
                transform: translate(-50%, -50%) rotate(${angle}deg);
                width: 3px;
                height: ${length}px;
                background: linear-gradient(to bottom, 
                    rgba(0, 255, 0, 0.9) 0%,
                    rgba(0, 255, 136, 0.7) 50%,
                    transparent 100%);
                z-index: 999;
                pointer-events: none;
                animation: thepHealingRay 2s ease-out forwards;
            `;
            
            targetElement.appendChild(healingRay);
            
            setTimeout(() => {
                if (healingRay && healingRay.parentNode) {
                    healingRay.remove();
                }
            }, 2000);
        }
        
        targetElement.appendChild(revivalLight);
        
        // Add green healing pulse to card
        const card = targetElement.querySelector('.battle-hero-card');
        if (card) {
            card.style.animation = 'thepHealingPulse 2s ease-out';
            setTimeout(() => {
                if (card) {
                    card.style.animation = '';
                }
            }, 2000);
        }
        
        await battleManager.delay(2000);
        
        if (revivalLight && revivalLight.parentNode) {
            revivalLight.remove();
        }
    }
    
    /**
     * Inject CSS for Thep revival animations
     */
    static ensureThepRevivalCSS() {
        if (document.getElementById('thepRevivalStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'thepRevivalStyles';
        style.textContent = `
            @keyframes thepRevivalBurst {
                0% {
                    transform: translate(-50%, -50%) scale(0.5);
                    opacity: 0;
                }
                20% {
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.5);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(2);
                    opacity: 0;
                }
            }
            
            @keyframes thepHealingRay {
                0% {
                    opacity: 0;
                    height: 0;
                }
                20% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                }
            }
            
            @keyframes thepHealingPulse {
                0%, 100% {
                    box-shadow: 0 0 0 rgba(0, 255, 0, 0);
                }
                50% {
                    box-shadow: 0 0 30px rgba(0, 255, 0, 0.8),
                                0 0 60px rgba(0, 255, 136, 0.6);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

export default ThepHeroEffect;