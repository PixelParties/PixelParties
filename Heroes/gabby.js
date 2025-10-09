// gabby.js - Gabby/ZombieGabby Hero Revival Effect
// Gabby's Undead Resilience: After being defeated, revives as ZombieGabby after 2 turns
// with double stats. ZombieGabby revives back as Gabby after 3 turns with normal stats.
// Any external revival immediately transforms and resets the counter.

export class GabbyHeroEffect {
    /**
     * Initialize Gabby effect for battle manager
     * @param {Object} battleManager - Battle manager instance
     */
    static init(battleManager) {
        // Initialize turnsSinceDeath for all Gabby/ZombieGabby heroes
        ['left', 'center', 'right'].forEach(position => {
            [battleManager.playerHeroes, battleManager.opponentHeroes].forEach(heroes => {
                const hero = heroes[position];
                if (hero && this.isGabbyVariant(hero.name)) {
                    if (typeof hero.turnsSinceDeath !== 'number') {
                        hero.turnsSinceDeath = 0;
                    }
                }
            });
        });
        
        return this;
    }

    /**
     * Check if hero is Gabby or ZombieGabby
     * @param {string} heroName - Name of hero
     * @returns {boolean}
     */
    static isGabbyVariant(heroName) {
        return heroName === 'Gabby' || heroName === 'ZombieGabby';
    }

    /**
     * Check and process Gabby revival at start of turn
     * Called at the start of each turn in battleFlowManager
     * @param {Object} battleManager - Battle manager instance
     */
    static async checkGabbyRevivalAtTurnStart(battleManager) {
        if (!battleManager.isAuthoritative) return;

        const allHeroes = [
            ...Object.values(battleManager.playerHeroes),
            ...Object.values(battleManager.opponentHeroes)
        ];

        for (const hero of allHeroes) {
            if (!hero || !this.isGabbyVariant(hero.name)) continue;

            // Only process dead Gabby/ZombieGabby
            if (hero.alive) continue;

            // Increment counter
            hero.turnsSinceDeath++;

            // Check for transformation conditions
            if (hero.name === 'Gabby' && hero.turnsSinceDeath >= 2) {
                await this.transformGabbyToZombie(hero, battleManager);
            } else if (hero.name === 'ZombieGabby' && hero.turnsSinceDeath >= 3) {
                await this.transformZombieToGabby(hero, battleManager);
            }
        }
    }

    /**
     * Transform Gabby into ZombieGabby with double stats
     * @param {Object} hero - Gabby hero object
     * @param {Object} battleManager - Battle manager instance
     */
    static async transformGabbyToZombie(hero, battleManager) {
        const side = hero.side;
        const position = hero.position;

        // Calculate doubled stats (battle-duration only)
        const originalAtk = hero.atk;
        const originalMaxHp = hero.maxHp;
        const doubledAtk = originalAtk * 2;
        const doubledMaxHp = originalMaxHp * 2;

        // Transform hero
        hero.name = 'ZombieGabby';
        hero.image = './Cards/All/ZombieGabby.png';
        hero.atk = doubledAtk;
        hero.maxHp = doubledMaxHp;
        hero.currentHp = doubledMaxHp; // Revive at full HP
        hero.alive = true;
        hero.turnsSinceDeath = 0; // Reset counter after revival

        // Mark transformation in customStats
        if (!hero.customStats) hero.customStats = {};
        hero.customStats.isZombieForm = true;
        hero.customStats.originalAtk = originalAtk;
        hero.customStats.originalMaxHp = originalMaxHp;

        // Play zombie revival animation
        await this.playZombieRevivalAnimation(hero, battleManager);

        // Update visuals
        this.updateHeroVisualState(side, position, hero, battleManager);

        // Send network update to guest
        this.sendTransformationUpdate('gabby_to_zombie', hero, doubledAtk, doubledMaxHp, battleManager);

        // Log transformation
        battleManager.addCombatLog(
            `🧟 Gabby rises from death as ZombieGabby with doubled power! (${doubledAtk} ATK, ${doubledMaxHp} HP)`,
            side === 'player' ? 'success' : 'error'
        );
    }

    /**
     * Transform ZombieGabby back into Gabby with normal stats
     * @param {Object} hero - ZombieGabby hero object
     * @param {Object} battleManager - Battle manager instance
     */
    static async transformZombieToGabby(hero, battleManager) {
        const side = hero.side;
        const position = hero.position;

        // Retrieve original stats
        const originalAtk = hero.customStats?.originalAtk || Math.floor(hero.atk / 2);
        const originalMaxHp = hero.customStats?.originalMaxHp || Math.floor(hero.maxHp / 2);

        // Transform hero back
        hero.name = 'Gabby';
        hero.image = './Cards/All/Gabby.png';
        hero.atk = originalAtk;
        hero.maxHp = originalMaxHp;
        hero.currentHp = originalMaxHp; // Revive at full HP
        hero.alive = true;
        hero.turnsSinceDeath = 0; // Reset counter after revival

        // Clear zombie form markers
        if (hero.customStats) {
            hero.customStats.isZombieForm = false;
        }

        // Play normal revival animation (Thep-style)
        await this.playNormalRevivalAnimation(hero, battleManager);

        // Update visuals
        this.updateHeroVisualState(side, position, hero, battleManager);

        // Send network update to guest
        this.sendTransformationUpdate('zombie_to_gabby', hero, originalAtk, originalMaxHp, battleManager);

        // Log transformation
        battleManager.addCombatLog(
            `💚 ZombieGabby returns to life as Gabby with restored power! (${originalAtk} ATK, ${originalMaxHp} HP)`,
            side === 'player' ? 'success' : 'error'
        );
    }

    /**
     * Handle external revival detection - transforms and resets counter
     * Call this whenever a Gabby variant is revived by other means
     * @param {Object} hero - Hero being revived
     * @param {Object} battleManager - Battle manager instance
     */
    static handleExternalRevival(hero, battleManager) {
        if (!this.isGabbyVariant(hero.name)) return;
        if (!battleManager.isAuthoritative) return;

        // Reset counter
        hero.turnsSinceDeath = 0;

        // Transform if needed
        if (hero.name === 'Gabby') {
            // Transform to ZombieGabby
            const originalAtk = hero.atk;
            const originalMaxHp = hero.maxHp;
            
            hero.name = 'ZombieGabby';
            hero.image = './Cards/All/ZombieGabby.png';
            hero.atk = originalAtk * 2;
            hero.maxHp = originalMaxHp * 2;
            hero.currentHp = hero.maxHp; // Already revived, set to max

            if (!hero.customStats) hero.customStats = {};
            hero.customStats.isZombieForm = true;
            hero.customStats.originalAtk = originalAtk;
            hero.customStats.originalMaxHp = originalMaxHp;

            battleManager.addCombatLog(
                `🧟 Gabby's revival triggers her transformation into ZombieGabby!`,
                hero.side === 'player' ? 'success' : 'error'
            );
        } else if (hero.name === 'ZombieGabby') {
            // Transform back to Gabby
            const originalAtk = hero.customStats?.originalAtk || Math.floor(hero.atk / 2);
            const originalMaxHp = hero.customStats?.originalMaxHp || Math.floor(hero.maxHp / 2);

            hero.name = 'Gabby';
            hero.image = './Cards/All/Gabby.png';
            hero.atk = originalAtk;
            hero.maxHp = originalMaxHp;
            hero.currentHp = hero.maxHp; // Already revived, set to max

            if (hero.customStats) {
                hero.customStats.isZombieForm = false;
            }

            battleManager.addCombatLog(
                `💚 ZombieGabby's revival triggers her transformation back into Gabby!`,
                hero.side === 'player' ? 'success' : 'error'
            );
        }

        // Update visuals after transformation
        this.updateHeroVisualState(hero.side, hero.position, hero, battleManager);

        // Send network update
        this.sendTransformationUpdate(
            hero.name === 'ZombieGabby' ? 'external_gabby_to_zombie' : 'external_zombie_to_gabby',
            hero,
            hero.atk,
            hero.maxHp,
            battleManager
        );
    }

    /**
     * Play sickly green undead revival animation for Gabby → ZombieGabby
     * @param {Object} hero - Hero being revived
     * @param {Object} battleManager - Battle manager instance
     */
    static async playZombieRevivalAnimation(hero, battleManager) {
        const targetElement = battleManager.getHeroElement(hero.side, hero.position);
        
        if (!targetElement) {
            console.error('Could not find target element for Gabby zombie revival animation');
            return;
        }
        
        // Ensure CSS exists
        this.ensureGabbyRevivalCSS();
        
        // Create sickly green undead burst
        const revivalLight = document.createElement('div');
        revivalLight.className = 'gabby-zombie-revival-effect';
        revivalLight.innerHTML = '🧟‍♀️💀🧟‍♀️';
        
        revivalLight.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 1000;
            pointer-events: none;
            animation: gabbyZombieRevivalBurst 2s ease-out forwards;
            text-shadow: 
                0 0 30px #00ff00,
                0 0 60px #88ff00,
                0 0 90px #00aa00;
        `;
        
        // Create sickly green rays
        for (let i = 0; i < 12; i++) {
            const undeadRay = document.createElement('div');
            undeadRay.className = 'gabby-undead-ray';
            
            const angle = (i * 30) + (Math.random() * 15 - 7.5);
            const length = 80 + Math.random() * 60;
            
            undeadRay.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: center;
                transform: translate(-50%, -50%) rotate(${angle}deg);
                width: 4px;
                height: ${length}px;
                background: linear-gradient(to bottom, 
                    rgba(0, 255, 0, 0.9) 0%,
                    rgba(136, 255, 0, 0.6) 50%,
                    rgba(0, 170, 0, 0.3) 70%,
                    transparent 100%);
                z-index: 999;
                pointer-events: none;
                animation: gabbyUndeadRay 2s ease-out forwards;
                filter: blur(1px);
            `;
            
            targetElement.appendChild(undeadRay);
            
            setTimeout(() => {
                if (undeadRay && undeadRay.parentNode) {
                    undeadRay.remove();
                }
            }, 2000);
        }
        
        targetElement.appendChild(revivalLight);
        
        // Add undead pulse to card
        const card = targetElement.querySelector('.battle-hero-card');
        if (card) {
            card.style.animation = 'gabbyUndeadPulse 2s ease-out';
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
     * Play normal revival animation (Thep-style) for ZombieGabby → Gabby
     * @param {Object} hero - Hero being revived
     * @param {Object} battleManager - Battle manager instance
     */
    static async playNormalRevivalAnimation(hero, battleManager) {
        const targetElement = battleManager.getHeroElement(hero.side, hero.position);
        
        if (!targetElement) {
            console.error('Could not find target element for Gabby normal revival animation');
            return;
        }
        
        // Ensure CSS exists
        this.ensureGabbyRevivalCSS();
        
        // Create healing light burst (Thep-style green)
        const revivalLight = document.createElement('div');
        revivalLight.className = 'gabby-normal-revival-effect';
        revivalLight.innerHTML = '💚✨💚';
        
        revivalLight.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            z-index: 1000;
            pointer-events: none;
            animation: gabbyNormalRevivalBurst 2s ease-out forwards;
            text-shadow: 
                0 0 30px #00ff00,
                0 0 60px #00ff88,
                0 0 90px #ffffff;
        `;
        
        // Create healing rays
        for (let i = 0; i < 8; i++) {
            const healingRay = document.createElement('div');
            healingRay.className = 'gabby-healing-ray';
            
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
                animation: gabbyHealingRay 2s ease-out forwards;
            `;
            
            targetElement.appendChild(healingRay);
            
            setTimeout(() => {
                if (healingRay && healingRay.parentNode) {
                    healingRay.remove();
                }
            }, 2000);
        }
        
        targetElement.appendChild(revivalLight);
        
        // Add healing pulse to card
        const card = targetElement.querySelector('.battle-hero-card');
        if (card) {
            card.style.animation = 'gabbyHealingPulse 2s ease-out';
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
     * Update hero visual state after transformation/revival
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

            // Update hero image
            const heroImage = heroElement.querySelector('.battle-hero-image');
            if (heroImage) {
                heroImage.src = hero.image;
            }
        }
        
        // Update health bar
        battleManager.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
        
        // Update attack display
        battleManager.updateHeroAttackDisplay(side, position, hero);
    }

    /**
     * Send transformation update to guest
     * @param {string} transformationType - Type of transformation
     * @param {Object} hero - Hero that transformed
     * @param {number} newAtk - New attack value
     * @param {number} newMaxHp - New max HP value
     * @param {Object} battleManager - Battle manager instance
     */
    static sendTransformationUpdate(transformationType, hero, newAtk, newMaxHp, battleManager) {
        battleManager.sendBattleUpdate('gabby_transformation', {
            transformationType: transformationType,
            heroAbsoluteSide: hero.absoluteSide,
            heroPosition: hero.position,
            heroName: hero.name,
            newAtk: newAtk,
            newMaxHp: newMaxHp,
            newCurrentHp: hero.currentHp,
            turnsSinceDeath: hero.turnsSinceDeath,
            timestamp: Date.now()
        });
    }

    /**
     * Handle guest receiving Gabby transformation from host
     * @param {Object} data - Transformation data from host
     * @param {Object} battleManager - Battle manager instance
     */
    static async handleGuestTransformation(data, battleManager) {
        if (battleManager.isAuthoritative) {
            console.warn('Host should not receive Gabby transformation messages');
            return;
        }

        const { transformationType, heroAbsoluteSide, heroPosition, heroName, newAtk, newMaxHp, newCurrentHp, turnsSinceDeath } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the hero
        const heroes = heroLocalSide === 'player' ? 
            battleManager.playerHeroes : battleManager.opponentHeroes;
        const hero = heroes[heroPosition];
        
        if (!hero) {
            console.error(`Guest: Hero not found for Gabby transformation: ${heroLocalSide} ${heroPosition}`);
            return;
        }

        // Store original stats if transforming to zombie
        if (transformationType === 'gabby_to_zombie' || transformationType === 'external_gabby_to_zombie') {
            if (!hero.customStats) hero.customStats = {};
            hero.customStats.originalAtk = hero.atk;
            hero.customStats.originalMaxHp = hero.maxHp;
            hero.customStats.isZombieForm = true;
        } else {
            if (hero.customStats) {
                hero.customStats.isZombieForm = false;
            }
        }

        // **APPLY TRANSFORMATION IMMEDIATELY (BEFORE ANIMATION)**
        hero.name = heroName;
        hero.image = `./Cards/All/${heroName}.png`;
        hero.atk = newAtk;
        hero.maxHp = newMaxHp;
        hero.currentHp = newCurrentHp;
        hero.alive = true;
        hero.turnsSinceDeath = turnsSinceDeath;

        // **UPDATE VISUALS IMMEDIATELY**
        this.updateHeroVisualState(heroLocalSide, heroPosition, hero, battleManager);

        // **THEN PLAY ANIMATION**
        if (transformationType === 'gabby_to_zombie' || transformationType === 'external_gabby_to_zombie') {
            await this.playZombieRevivalAnimation(hero, battleManager);
        } else {
            await this.playNormalRevivalAnimation(hero, battleManager);
        }

        // Add to combat log
        const logType = heroLocalSide === 'player' ? 'success' : 'error';
        if (transformationType.includes('zombie')) {
            battleManager.addCombatLog(
                `🧟 ${heroName} rises from death with doubled power!`,
                logType
            );
        } else {
            battleManager.addCombatLog(
                `💚 ${heroName} returns to life with restored power!`,
                logType
            );
        }
    }

    /**
     * Inject CSS for Gabby revival animations
     */
    static ensureGabbyRevivalCSS() {
        if (document.getElementById('gabbyRevivalStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'gabbyRevivalStyles';
        style.textContent = `
            @keyframes gabbyZombieRevivalBurst {
                0% {
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                    opacity: 0;
                }
                20% {
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(2.5) rotate(360deg);
                    opacity: 0;
                }
            }
            
            @keyframes gabbyUndeadRay {
                0% {
                    opacity: 0;
                    height: 0;
                }
                20% {
                    opacity: 1;
                }
                80% {
                    opacity: 0.8;
                }
                100% {
                    opacity: 0;
                }
            }
            
            @keyframes gabbyUndeadPulse {
                0%, 100% {
                    box-shadow: 0 0 0 rgba(0, 255, 0, 0);
                    filter: none;
                }
                50% {
                    box-shadow: 0 0 40px rgba(0, 255, 0, 0.9),
                                0 0 80px rgba(136, 255, 0, 0.7);
                    filter: hue-rotate(90deg) brightness(1.2);
                }
            }
            
            @keyframes gabbyNormalRevivalBurst {
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
            
            @keyframes gabbyHealingRay {
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
            
            @keyframes gabbyHealingPulse {
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

    /**
     * Cleanup Gabby effects after battle
     */
    static cleanup() {
        // Reset all counters (handled by Hero class reset)
        // Remove CSS if needed
        const styles = document.getElementById('gabbyRevivalStyles');
        if (styles) {
            styles.remove();
        }
    }
}

export default GabbyHeroEffect;