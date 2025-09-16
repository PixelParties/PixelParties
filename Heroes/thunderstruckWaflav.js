// thunderstruckWaflav.js - ThunderstruckWaflav Hero Battle Start Effect System
// Consumes all evolution counters to stun all enemies with lightning bolt rain

export class ThunderstruckWaflavHeroEffect {
    
    // Apply ThunderstruckWaflav effects at battle start
    static async applyThunderstruckWaflavEffectsAtBattleStart(battleManager) {
        if (!battleManager.isAuthoritative) return;

        try {
            // Check BOTH sides independently for ThunderstruckWaflav heroes
            // This ensures both host and guest ThunderstruckWaflav effects can trigger
            
            // Check and process host's ThunderstruckWaflav
            const hostThunderstruckWaflav = this.findThunderstruckWaflavHero(battleManager.playerHeroes);
            if (hostThunderstruckWaflav) {
                await this.processThunderstruckWaflavEffect(battleManager, 'player');
            }
            
            // Check and process guest's ThunderstruckWaflav (independent of host's status)
            const guestThunderstruckWaflav = this.findThunderstruckWaflavHero(battleManager.opponentHeroes);
            if (guestThunderstruckWaflav) {
                await this.processThunderstruckWaflavEffect(battleManager, 'opponent');
            }

        } catch (error) {
            console.error('Error applying ThunderstruckWaflav battle start effects:', error);
        }
    }

    // Find ThunderstruckWaflav hero in hero collection
    static findThunderstruckWaflavHero(heroes) {
        for (const position of ['left', 'center', 'right']) {
            const hero = heroes[position];
            if (hero && hero.alive && hero.name === 'ThunderstruckWaflav') {
                return { hero, position };
            }
        }
        return null;
    }

    // Process the ThunderstruckWaflav effect for the specified side
    static async processThunderstruckWaflavEffect(battleManager, heroSide) {
        console.log('⚡ ThunderstruckWaflav: Processing effect for', heroSide);
        
        // Get the appropriate counter collection
        const counters = heroSide === 'player' ? battleManager.playerCounters : battleManager.opponentCounters;
        
        if (!counters || !counters.evolutionCounters || counters.evolutionCounters <= 0) {
            console.log('⚡ ThunderstruckWaflav: No counters to consume', counters);
            return; // No counters to consume
        }

        const evolutionCounters = counters.evolutionCounters;
        const heroName = heroSide === 'player' ? 'your ThunderstruckWaflav' : 'enemy ThunderstruckWaflav';

        console.log(`⚡ ThunderstruckWaflav: ${heroName} consuming ${evolutionCounters} evolution counters`);

        // Consume ALL evolution counters
        counters.evolutionCounters = 0;

        // Log the effect trigger
        battleManager.addCombatLog(
            `⚡ ${heroName} consumes ${evolutionCounters} Evolution Counter${evolutionCounters > 1 ? 's' : ''} to summon a thunderstorm!`,
            heroSide === 'player' ? 'success' : 'error'
        );

        // Create the giant storm animation over enemy side first
        console.log('⚡ ThunderstruckWaflav: Creating giant storm animation...');
        this.createGiantThunderstormAnimation(battleManager, evolutionCounters, heroSide);

        // Create lightning storm animation (individual bolts)
        console.log('⚡ ThunderstruckWaflav: Creating individual lightning bolts...');
        await this.createLightningStormAnimation(battleManager, evolutionCounters, heroSide);

        // Apply stunned to all enemy targets
        await this.applyStunnedToAllEnemies(battleManager, evolutionCounters, heroSide);

        // Sync counter change to opponent
        this.syncCounterChange(battleManager, heroSide, evolutionCounters);

        // Sync back to heroSelection for immediate UI update
        this.syncCountersToHeroSelection(battleManager);
    }

    // Create giant thunderstorm animation over enemy side
    static createGiantThunderstormAnimation(battleManager, counterCount, heroSide) {
        const battleArena = document.getElementById('battleArena');
        if (!battleArena) {
            console.error('❌ ThunderstruckWaflav: battleArena not found');
            return;
        }

        const enemySide = heroSide === 'player' ? 'opponent' : 'player';
        
        // Create storm overlay specifically for enemy side
        const stormOverlay = document.createElement('div');
        stormOverlay.className = 'thunderstruck-storm-overlay';
        
        // Try multiple selectors to find the enemy area
        let enemySideElement = battleArena.querySelector(`.${enemySide}-heroes`);
        
        if (!enemySideElement) {
            enemySideElement = battleArena.querySelector(`.${enemySide}-formation`);
        }
        
        if (!enemySideElement) {
            enemySideElement = battleArena.querySelector(`.${enemySide}-side`);
        }
        
        // Try finding enemy hero slots as fallback
        if (!enemySideElement) {
            const enemySlots = battleArena.querySelectorAll(`.${enemySide}-slot`);
            if (enemySlots.length > 0) {
                // Create a virtual container that encompasses all enemy slots
                const firstSlot = enemySlots[0];
                const lastSlot = enemySlots[enemySlots.length - 1];
                const firstRect = firstSlot.getBoundingClientRect();
                const lastRect = lastSlot.getBoundingClientRect();
                
                // Position storm over the entire enemy area
                const arenaRect = battleArena.getBoundingClientRect();
                stormOverlay.style.cssText = `
                    position: absolute;
                    left: ${Math.min(firstRect.left, lastRect.left) - arenaRect.left - 50}px;
                    top: ${Math.min(firstRect.top, lastRect.top) - arenaRect.top - 100}px;
                    width: ${Math.max(firstRect.right, lastRect.right) - Math.min(firstRect.left, lastRect.left) + 100}px;
                    height: ${Math.max(firstRect.bottom, lastRect.bottom) - Math.min(firstRect.top, lastRect.top) + 200}px;
                    pointer-events: none;
                    z-index: 999;
                    overflow: hidden;
                    opacity: 1;
                    animation: thunderstruckStormFade 3000ms ease-out forwards;
                `;
                
                battleArena.appendChild(stormOverlay);
                console.log('⚡ ThunderstruckWaflav: Storm positioned using enemy slots fallback');
                
                // Create storm elements
                this.createThunderstormClouds(stormOverlay, counterCount);
                this.createThunderstormLightning(stormOverlay, counterCount);
                this.createThunderstormWind(stormOverlay);

                // Remove storm overlay after 3 seconds
                setTimeout(() => {
                    if (stormOverlay && stormOverlay.parentNode) {
                        stormOverlay.remove();
                    }
                }, 3000);
                
                return; // Exit early since we handled it with fallback
            }
        }
        
        if (!enemySideElement) {
            console.error(`❌ ThunderstruckWaflav: Could not find enemy area for ${enemySide}. Available selectors:`, 
                Array.from(battleArena.querySelectorAll('*')).map(el => el.className).filter(c => c).slice(0, 10));
            
            // Ultimate fallback - cover entire battle arena
            stormOverlay.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 999;
                overflow: hidden;
                opacity: 1;
                animation: thunderstruckStormFade 3000ms ease-out forwards;
            `;
            
            battleArena.appendChild(stormOverlay);
            console.log('⚡ ThunderstruckWaflav: Storm positioned using full arena fallback');
            
            // Create storm elements
            this.createThunderstormClouds(stormOverlay, counterCount);
            this.createThunderstormLightning(stormOverlay, counterCount);
            this.createThunderstormWind(stormOverlay);

            // Remove storm overlay after 3 seconds
            setTimeout(() => {
                if (stormOverlay && stormOverlay.parentNode) {
                    stormOverlay.remove();
                }
            }, 3000);
            
            return;
        }

        console.log('⚡ ThunderstruckWaflav: Enemy area found, creating storm animation');
        const enemyRect = enemySideElement.getBoundingClientRect();
        const arenaRect = battleArena.getBoundingClientRect();
        
        stormOverlay.style.cssText = `
            position: absolute;
            left: ${enemyRect.left - arenaRect.left - 50}px;
            top: ${enemyRect.top - arenaRect.top - 100}px;
            width: ${enemyRect.width + 100}px;
            height: ${enemyRect.height + 200}px;
            pointer-events: none;
            z-index: 999;
            overflow: hidden;
            opacity: 1;
            animation: thunderstruckStormFade 3000ms ease-out forwards;
        `;

        battleArena.appendChild(stormOverlay);

        // Create immediate storm elements
        this.createThunderstormClouds(stormOverlay, counterCount);
        this.createThunderstormLightning(stormOverlay, counterCount);
        this.createThunderstormWind(stormOverlay);

        // Remove storm overlay after 3 seconds
        setTimeout(() => {
            if (stormOverlay && stormOverlay.parentNode) {
                stormOverlay.remove();
            }
        }, 3000);
    }

    // Create storm clouds over enemy area
    static createThunderstormClouds(stormOverlay, intensity) {
        const cloudCount = Math.min(8 + intensity * 2, 15);
        
        for (let i = 0; i < cloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'thunderstruck-storm-cloud';
            
            const baseSize = Math.random() * 120 + 80;
            const delay = Math.random() * 500; // Stagger cloud appearance
            
            // Create dramatic storm cloud shapes
            const cloudVariations = [
                `radial-gradient(ellipse ${Math.random() * 40 + 60}% ${Math.random() * 30 + 40}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(8, 8, 15, 0.95) 0%, rgba(20, 20, 30, 0.8) 40%, transparent 75%)`,
                `radial-gradient(ellipse ${Math.random() * 50 + 50}% ${Math.random() * 40 + 30}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(5, 5, 12, 0.9) 0%, rgba(15, 15, 25, 0.7) 50%, transparent 70%)`,
                `radial-gradient(ellipse ${Math.random() * 30 + 70}% ${Math.random() * 20 + 50}% at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(12, 12, 20, 0.85) 0%, rgba(25, 25, 35, 0.6) 60%, transparent 80%)`
            ];

            cloud.style.cssText = `
                position: absolute;
                width: ${baseSize}px;
                height: ${baseSize * (Math.random() * 0.4 + 0.5)}px;
                background: ${cloudVariations[0]}, ${cloudVariations[1]}, ${cloudVariations[2]};
                border-radius: ${Math.random() * 50 + 50}% ${Math.random() * 50 + 50}% ${Math.random() * 50 + 50}% ${Math.random() * 50 + 50}%;
                top: ${Math.random() * 60}%;
                left: ${Math.random() * 80 + 10}%;
                filter: blur(${Math.random() * 2 + 1}px);
                opacity: 0;
                transform: rotate(${Math.random() * 40 - 20}deg) scale(0.5);
                animation: thunderstruckCloudAppear ${delay + 800}ms ease-out forwards,
                           thunderstruckCloudFloat 2000ms ease-in-out infinite;
                animation-delay: ${delay}ms, ${delay + 800}ms;
            `;

            stormOverlay.appendChild(cloud);
        }
    }

    // Create dramatic lightning over enemy area
    static createThunderstormLightning(stormOverlay, intensity) {
        const lightningCount = Math.min(5 + intensity * 3, 12);
        
        for (let i = 0; i < lightningCount; i++) {
            setTimeout(() => {
                this.createThunderstormLightningBolt(stormOverlay, intensity);
            }, Math.random() * 1500); // Spread lightning over first 1.5 seconds
        }
    }

    // Create individual lightning bolt for storm
    static createThunderstormLightningBolt(stormOverlay, intensity) {
        const lightning = document.createElement('div');
        lightning.className = 'thunderstruck-storm-lightning';
        
        // Generate dramatic lightning path
        const startX = Math.random() * 100;
        const startY = 0;
        const endX = Math.random() * 100;
        const endY = Math.random() * 40 + 60;
        
        const lightningPath = this.generateJaggedLightningPath(startX, startY, endX, endY);
        const strokeIntensity = Math.min(0.7 + intensity * 0.1, 1.0);
        
        lightning.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="${lightningPath}" 
                      stroke="rgba(255, 255, 255, ${strokeIntensity})" 
                      stroke-width="${Math.random() * 1.2 + 0.8}" 
                      fill="none" 
                      filter="url(#thunderstruckStormGlow)"/>
                <path d="${lightningPath}" 
                      stroke="rgba(173, 216, 230, ${strokeIntensity * 0.7})" 
                      stroke-width="${Math.random() * 0.6 + 0.4}" 
                      fill="none"/>
                <defs>
                    <filter id="thunderstruckStormGlow">
                        <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
                        <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
            </svg>
        `;
        
        lightning.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            animation: thunderstruckStormLightning 600ms ease-out;
            pointer-events: none;
        `;

        stormOverlay.appendChild(lightning);

        // Create lightning flash effect
        this.createThunderstormFlash(stormOverlay, intensity);

        setTimeout(() => {
            if (lightning.parentNode) {
                lightning.remove();
            }
        }, 600);
    }

    // Create lightning flash effect
    static createThunderstormFlash(stormOverlay, intensity) {
        const flash = document.createElement('div');
        flash.className = 'thunderstruck-storm-flash';
        flash.style.cssText = `
            position: absolute;
            top: -20px;
            left: -20px;
            right: -20px;
            bottom: -20px;
            background: radial-gradient(ellipse, rgba(173, 216, 230, ${Math.min(0.3 + intensity * 0.05, 0.6)}) 0%, transparent 70%);
            animation: thunderstruckStormFlash 300ms ease-out;
            pointer-events: none;
        `;
        
        stormOverlay.appendChild(flash);
        
        setTimeout(() => {
            if (flash.parentNode) {
                flash.remove();
            }
        }, 300);
    }

    // Create wind effects
    static createThunderstormWind(stormOverlay) {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.createThunderstormWindParticle(stormOverlay);
            }, Math.random() * 2000);
        }
    }

    // Create wind particle
    static createThunderstormWindParticle(stormOverlay) {
        const particle = document.createElement('div');
        particle.className = 'thunderstruck-wind-particle';
        
        const size = Math.random() * 3 + 2;
        const duration = Math.random() * 1000 + 1500;

        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(200, 220, 240, 0.7);
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: -10px;
            animation: thunderstruckWindDrift ${duration}ms linear;
            pointer-events: none;
        `;

        stormOverlay.appendChild(particle);

        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, duration);
    }

    // Generate jagged lightning path
    static generateJaggedLightningPath(startX, startY, endX, endY) {
        const segments = Math.floor(Math.random() * 5) + 4;
        let path = `M ${startX} ${startY}`;
        
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        for (let i = 1; i <= segments; i++) {
            const progress = i / segments;
            const baseX = startX + deltaX * progress;
            const baseY = startY + deltaY * progress;
            
            // Add jaggedness
            const jagX = baseX + (Math.random() - 0.5) * 20;
            const jagY = baseY + (Math.random() - 0.5) * 10;
            
            if (i === segments) {
                path += ` L ${endX} ${endY}`;
            } else {
                path += ` L ${jagX} ${jagY}`;
                
                // Add occasional branches
                if (Math.random() < 0.4) {
                    const branchLength = Math.random() * 15 + 8;
                    const branchAngle = (Math.random() - 0.5) * Math.PI;
                    const branchEndX = jagX + Math.cos(branchAngle) * branchLength;
                    const branchEndY = jagY + Math.sin(branchAngle) * branchLength;
                    path += ` M ${jagX} ${jagY} L ${branchEndX} ${branchEndY} M ${jagX} ${jagY}`;
                }
            }
        }
        
        return path;
    }

    // Apply stunned status to all enemy heroes and creatures
    static async applyStunnedToAllEnemies(battleManager, stunStacks, heroSide) {
        const enemySide = heroSide === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;

        let totalTargetsStunned = 0;

        // Stun all enemy heroes
        for (const position of ['left', 'center', 'right']) {
            const hero = enemyHeroes[position];
            if (hero && hero.alive && battleManager.statusEffectsManager) {
                battleManager.statusEffectsManager.applyStatusEffect(hero, 'stunned', stunStacks);
                totalTargetsStunned++;
            }
        }

        // Stun all enemy creatures
        for (const position of ['left', 'center', 'right']) {
            const hero = enemyHeroes[position];
            if (hero && hero.creatures) {
                hero.creatures.forEach(creature => {
                    if (creature.alive && battleManager.statusEffectsManager) {
                        battleManager.statusEffectsManager.applyStatusEffect(creature, 'stunned', stunStacks);
                        totalTargetsStunned++;
                    }
                });
            }
        }

        // Log the stunning effect
        if (totalTargetsStunned > 0) {
            battleManager.addCombatLog(
                `⚡ Lightning strikes ${totalTargetsStunned} enem${totalTargetsStunned === 1 ? 'y' : 'ies'}, stunning them for ${stunStacks} turn${stunStacks > 1 ? 's' : ''}!`,
                heroSide === 'player' ? 'success' : 'error'
            );
        }
    }

    // Create lightning storm animation
    static async createLightningStormAnimation(battleManager, counterCount, heroSide) {
        const enemySide = heroSide === 'player' ? 'opponent' : 'player';
        
        // Create multiple lightning bolts based on counter count
        const boltPromises = [];
        for (let i = 0; i < counterCount; i++) {
            // Stagger the bolts slightly for dramatic effect
            const delay = i * 150; // 150ms between each bolt
            boltPromises.push(
                new Promise(resolve => {
                    setTimeout(async () => {
                        await this.createSingleLightningBolt(battleManager, enemySide, i, counterCount);
                        resolve();
                    }, delay);
                })
            );
        }

        // Wait for all lightning bolts to complete
        await Promise.all(boltPromises);
    }

    // Create a single lightning bolt
    static async createSingleLightningBolt(battleManager, targetSide, boltIndex, totalBolts) {
        const battleArena = document.getElementById('battleArena');
        if (!battleArena) return;

        // Create lightning bolt element
        const lightning = document.createElement('div');
        lightning.className = 'thunderstruck-lightning-bolt';
        
        // Scale bolt size based on total counter count (more counters = bigger bolts)
        const sizeMultiplier = Math.min(1 + (totalBolts * 0.3), 3); // Cap at 3x size
        const width = Math.max(4, 8 * sizeMultiplier);
        
        // Position randomly over enemy side
        const sideClass = `.${targetSide}-heroes`;
        const enemySideElement = battleArena.querySelector(sideClass);
        
        if (!enemySideElement) return;

        const enemyRect = enemySideElement.getBoundingClientRect();
        const arenaRect = battleArena.getBoundingClientRect();
        
        // Random position within enemy side bounds
        const leftPercent = Math.random() * 80 + 10; // 10-90% to avoid edges
        const leftPosition = (enemyRect.left - arenaRect.left) + (enemyRect.width * leftPercent / 100);
        
        lightning.style.cssText = `
            position: absolute;
            top: -50px;
            left: ${leftPosition}px;
            width: ${width}px;
            height: 400px;
            background: linear-gradient(180deg, 
                transparent 0%, 
                #ffffff 5%, 
                #add8e6 15%, 
                #87ceeb 25%, 
                #6495ed 50%, 
                #4169e1 75%, 
                #0000ff 90%, 
                #00008b 100%);
            border-radius: 2px;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            filter: drop-shadow(0 0 ${width * 2}px #87ceeb) 
                    drop-shadow(0 0 ${width * 4}px #4169e1);
            transform: scaleY(0) rotate(${Math.random() * 10 - 5}deg);
            transform-origin: top center;
        `;

        battleArena.appendChild(lightning);

        // Animate lightning strike
        lightning.style.animation = `thunderstruckLightningStrike ${battleManager.getSpeedAdjustedDelay ? battleManager.getSpeedAdjustedDelay(800) : 800}ms ease-out forwards`;

        // Create lightning flash effect
        this.createLightningFlash(battleArena, sizeMultiplier);

        // Create electrical sparks at impact
        setTimeout(() => {
            this.createImpactSparks(battleArena, leftPosition, sizeMultiplier);
        }, battleManager.getSpeedAdjustedDelay ? battleManager.getSpeedAdjustedDelay(400) : 400);

        // Remove bolt after animation
        setTimeout(() => {
            if (lightning && lightning.parentNode) {
                lightning.remove();
            }
        }, battleManager.getSpeedAdjustedDelay ? battleManager.getSpeedAdjustedDelay(1200) : 1200);
    }

    // Create lightning flash effect
    static createLightningFlash(battleArena, intensity) {
        const flash = document.createElement('div');
        flash.className = 'thunderstruck-lightning-flash';
        flash.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(173, 216, 230, ${Math.min(0.3 + intensity * 0.1, 0.8)});
            z-index: 999;
            pointer-events: none;
            animation: thunderstruckLightningFlash 200ms ease-out;
        `;
        
        battleArena.appendChild(flash);
        
        setTimeout(() => {
            if (flash && flash.parentNode) {
                flash.remove();
            }
        }, 200);
    }

    // Create electrical sparks at impact point
    static createImpactSparks(battleArena, xPosition, intensity) {
        const sparkCount = Math.min(3 + Math.floor(intensity * 2), 8);
        
        for (let i = 0; i < sparkCount; i++) {
            const spark = document.createElement('div');
            spark.className = 'thunderstruck-impact-spark';
            
            const angle = (Math.PI * 2 * i) / sparkCount;
            const distance = 20 + Math.random() * 30;
            const size = 3 + Math.random() * 4;
            
            spark.style.cssText = `
                position: absolute;
                bottom: 50px;
                left: ${xPosition}px;
                width: ${size}px;
                height: ${size}px;
                background: radial-gradient(circle, #ffffff 0%, #add8e6 50%, transparent 100%);
                border-radius: 50%;
                z-index: 1001;
                pointer-events: none;
                animation: thunderstruckImpactSpark 600ms ease-out forwards;
                --spark-x: ${Math.cos(angle) * distance}px;
                --spark-y: ${Math.sin(angle) * distance}px;
            `;
            
            battleArena.appendChild(spark);
            
            setTimeout(() => {
                if (spark && spark.parentNode) {
                    spark.remove();
                }
            }, 600);
        }
    }

    // Sync counter change to opponent
    static syncCounterChange(battleManager, heroSide, countersConsumed) {
        if (!battleManager.sendBattleUpdate) return;

        const absoluteSide = (heroSide === 'player') ? 
            (battleManager.isHost ? 'host' : 'guest') : 
            (battleManager.isHost ? 'guest' : 'host');

        battleManager.sendBattleUpdate('thunderstruck_waflav_evolution_counters_consumed', {
            targetAbsoluteSide: absoluteSide,
            countersConsumed: countersConsumed,
            newCounterTotal: 0,
            timestamp: Date.now()
        });
    }

    // Handle guest receiving counter consumption update
    static handleGuestCounterConsumption(data, battleManager) {
        if (!data || !battleManager || battleManager.isAuthoritative) {
            return;
        }

        const { targetAbsoluteSide, countersConsumed, newCounterTotal } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const isMyCounter = (targetAbsoluteSide === myAbsoluteSide);

        // Update the appropriate counter
        if (isMyCounter) {
            battleManager.playerCounters.evolutionCounters = newCounterTotal;
        } else {
            battleManager.opponentCounters.evolutionCounters = newCounterTotal;
        }

        // Sync to heroSelection immediately
        this.syncCountersToHeroSelection(battleManager);

        console.log(`⚡ Guest received ThunderstruckWaflav counter consumption: ${countersConsumed} counters consumed`);
    }

    // Sync counter changes back to heroSelection
    static syncCountersToHeroSelection(battleManager) {
        if (typeof window === 'undefined' || !window.heroSelection) {
            return;
        }

        try {
            const heroSelection = window.heroSelection;
            
            // Update heroSelection counters with battle manager counters
            if (battleManager.playerCounters) {
                heroSelection.playerCounters = { ...heroSelection.playerCounters, ...battleManager.playerCounters };
            }
            
            if (battleManager.opponentCounters) {
                heroSelection.opponentCounters = { ...heroSelection.opponentCounters, ...battleManager.opponentCounters };
            }

            // Save the updated state
            if (heroSelection.saveGameState) {
                heroSelection.saveGameState().catch(error => {
                    console.warn('Error saving game state after ThunderstruckWaflav counter consumption:', error);
                });
            }

            console.log('⚡ Synced evolution counters to heroSelection after ThunderstruckWaflav effect');
        } catch (error) {
            console.warn('Error syncing counters to heroSelection:', error);
        }
    }

    // Ensure lightning animation styles are present
    static ensureLightningStyles() {
        if (document.getElementById('thunderstruckWaflavStyles')) return;
        
        console.log('⚡ ThunderstruckWaflav: Loading CSS styles...');
        
        const style = document.createElement('style');
        style.id = 'thunderstruckWaflavStyles';
        style.textContent = `
            @keyframes thunderstruckLightningStrike {
                0% {
                    opacity: 0;
                    transform: scaleY(0) rotate(var(--rotation, 0deg));
                }
                20% {
                    opacity: 1;
                    transform: scaleY(0.3) rotate(var(--rotation, 0deg));
                }
                40% {
                    opacity: 1;
                    transform: scaleY(0.8) rotate(var(--rotation, 0deg));
                }
                60% {
                    opacity: 1;
                    transform: scaleY(1) rotate(var(--rotation, 0deg));
                }
                80% {
                    opacity: 0.8;
                    transform: scaleY(1) rotate(var(--rotation, 0deg));
                }
                100% {
                    opacity: 0;
                    transform: scaleY(1) rotate(var(--rotation, 0deg));
                }
            }
            
            @keyframes thunderstruckLightningFlash {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }
            
            @keyframes thunderstruckImpactSpark {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(calc(-50% + var(--spark-x)), calc(-50% + var(--spark-y))) scale(0.2);
                }
            }

            /* New storm overlay animations */
            @keyframes thunderstruckStormFade {
                0% { 
                    opacity: 1; 
                    transform: scale(0.8);
                }
                30% { 
                    opacity: 1; 
                    transform: scale(1);
                }
                66% { /* Start fading at 2 seconds (66% of 3s) */
                    opacity: 1; 
                    transform: scale(1.05);
                }
                100% { 
                    opacity: 0; 
                    transform: scale(1.1);
                }
            }

            @keyframes thunderstruckCloudAppear {
                0% {
                    opacity: 0;
                    transform: scale(0.3);
                }
                100% {
                    opacity: 0.9;
                    transform: scale(1);
                }
            }

            @keyframes thunderstruckCloudFloat {
                0%, 100% {
                    transform: scale(1) translateY(0);
                }
                50% {
                    transform: scale(1.05) translateY(-10px);
                }
            }

            @keyframes thunderstruckStormLightning {
                0% { 
                    opacity: 0; 
                    transform: scaleY(0.2);
                }
                20% { 
                    opacity: 1; 
                    transform: scaleY(1.1);
                }
                50% { 
                    opacity: 0.8; 
                    transform: scaleY(1);
                }
                100% { 
                    opacity: 0; 
                    transform: scaleY(0.9);
                }
            }

            @keyframes thunderstruckStormFlash {
                0% { opacity: 0; }
                30% { opacity: 1; }
                100% { opacity: 0; }
            }

            @keyframes thunderstruckWindDrift {
                0% { 
                    transform: translateX(0) rotate(0deg); 
                    opacity: 0; 
                }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { 
                    transform: translateX(calc(100% + 50px)) rotate(180deg); 
                    opacity: 0; 
                }
            }
            
            .thunderstruck-lightning-bolt {
                will-change: transform, opacity;
            }
            
            .thunderstruck-lightning-flash {
                will-change: opacity;
            }
            
            .thunderstruck-impact-spark {
                will-change: transform, opacity;
            }

            .thunderstruck-storm-overlay {
                will-change: opacity, transform;
                background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.1) 0%, transparent 70%);
            }

            .thunderstruck-storm-cloud {
                will-change: transform, opacity;
            }

            .thunderstruck-storm-lightning {
                will-change: opacity, transform;
            }

            .thunderstruck-wind-particle {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
        console.log('⚡ ThunderstruckWaflav: CSS styles loaded successfully');
    }
}

// Ensure styles are loaded when module is imported
if (typeof document !== 'undefined') {
    ThunderstruckWaflavHeroEffect.ensureLightningStyles();
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ThunderstruckWaflavHeroEffect = ThunderstruckWaflavHeroEffect;
}

export default ThunderstruckWaflavHeroEffect;