// flamebathedWaflav.js - FlamebathedWaflav Hero Battle Effects System
// Consumes evolution counters to gain burned stacks and attack bonus at battle start
// Awards evolution counters based on remaining burned stacks if alive at battle end

export class FlamebathedWaflavHeroEffect {
    
    // Apply FlamebathedWaflav effects at battle start
    static async applyFlamebathedWaflavEffectsAtBattleStart(battleManager) {
        if (!battleManager.isAuthoritative) return;

        try {
            // Check BOTH sides independently for FlamebathedWaflav heroes
            // This ensures both host and guest FlamebathedWaflav effects can trigger
            
            // Check and process host's FlamebathedWaflav
            const hostFlamebathedWaflav = this.findFlamebathedWaflavHero(battleManager.playerHeroes);
            if (hostFlamebathedWaflav) {
                await this.processFlamebathedWaflavBattleStartEffect(battleManager, 'player');
            }
            
            // Check and process guest's FlamebathedWaflav (independent of host's status)
            const guestFlamebathedWaflav = this.findFlamebathedWaflavHero(battleManager.opponentHeroes);
            if (guestFlamebathedWaflav) {
                await this.processFlamebathedWaflavBattleStartEffect(battleManager, 'opponent');
            }

        } catch (error) {
            console.error('Error applying FlamebathedWaflav battle start effects:', error);
        }
    }

    // Apply FlamebathedWaflav effects at battle end
    static async applyFlamebathedWaflavEffectsAtBattleEnd(battleManager) {
        if (!battleManager.isAuthoritative) return;

        try {
            // Check BOTH sides independently for FlamebathedWaflav heroes
            
            // Check and process host's FlamebathedWaflav
            const hostFlamebathedWaflav = this.findFlamebathedWaflavHero(battleManager.playerHeroes);
            if (hostFlamebathedWaflav) {
                await this.processFlamebathedWaflavBattleEndEffect(battleManager, 'player');
            }
            
            // Check and process guest's FlamebathedWaflav
            const guestFlamebathedWaflav = this.findFlamebathedWaflavHero(battleManager.opponentHeroes);
            if (guestFlamebathedWaflav) {
                await this.processFlamebathedWaflavBattleEndEffect(battleManager, 'opponent');
            }

        } catch (error) {
            console.error('Error applying FlamebathedWaflav battle end effects:', error);
        }
    }

    // Find FlamebathedWaflav hero in hero collection
    static findFlamebathedWaflavHero(heroes) {
        for (const position of ['left', 'center', 'right']) {
            const hero = heroes[position];
            if (hero && hero.alive && hero.name === 'FlamebathedWaflav') {
                return { hero, position };
            }
        }
        return null;
    }

    // Process the FlamebathedWaflav battle start effect for the specified side
    static async processFlamebathedWaflavBattleStartEffect(battleManager, heroSide) {
        console.log('🔥 FlamebathedWaflav: Processing battle start effect for', heroSide);
        
        // Get the appropriate counter collection
        const counters = heroSide === 'player' ? battleManager.playerCounters : battleManager.opponentCounters;
        
        if (!counters || !counters.evolutionCounters || counters.evolutionCounters <= 0) {
            console.log('🔥 FlamebathedWaflav: No evolution counters available', counters);
            return; // No counters to use
        }

        const evolutionCounters = counters.evolutionCounters;
        const heroName = heroSide === 'player' ? 'your FlamebathedWaflav' : 'enemy FlamebathedWaflav';

        console.log(`🔥 FlamebathedWaflav: ${heroName} using ${evolutionCounters} evolution counters for power`);

        // Find the hero
        const heroes = heroSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const flamebathedWaflavData = this.findFlamebathedWaflavHero(heroes);
        if (!flamebathedWaflavData) return;
        
        const { hero, position } = flamebathedWaflavData;

        // Apply Burned status effect (X stacks where X = evolutionCounters)
        if (battleManager.statusEffectsManager) {
            battleManager.statusEffectsManager.applyStatusEffect(hero, 'burned', evolutionCounters);
        }

        // Add battle attack bonus (30 * evolutionCounters)
        const attackBonus = 30 * evolutionCounters;
        hero.addBattleAttackBonus(attackBonus);

        // Log the effect trigger
        battleManager.addCombatLog(
            `🔥 ${heroName} channels ${evolutionCounters} Evolution Counters into flame power!`,
            heroSide === 'player' ? 'success' : 'error'
        );

        battleManager.addCombatLog(
            `🔥 ${heroName} gains ${evolutionCounters} Burned stacks and +${attackBonus} attack!`,
            heroSide === 'player' ? 'success' : 'error'
        );

        // Create the fire animation
        console.log('🔥 FlamebathedWaflav: Creating fire animation...');
        this.createFireBathAnimation(battleManager, hero, heroSide, position, evolutionCounters);

        // Update hero attack display
        battleManager.updateHeroAttackDisplay(heroSide, position, hero);

        // Sync effect to opponent
        this.syncBattleStartEffect(battleManager, heroSide, evolutionCounters, attackBonus);
    }

    // Process the FlamebathedWaflav battle end effect for the specified side
    static async processFlamebathedWaflavBattleEndEffect(battleManager, heroSide) {
        console.log('🔥 FlamebathedWaflav: Processing battle end effect for', heroSide);
        
        // Find the hero
        const heroes = heroSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const flamebathedWaflavData = this.findFlamebathedWaflavHero(heroes);
        
        // Check if hero is still alive
        if (!flamebathedWaflavData || !flamebathedWaflavData.hero.alive) {
            console.log('🔥 FlamebathedWaflav: Hero not alive, no battle end effect');
            return;
        }

        const { hero, position } = flamebathedWaflavData;

        // Check for remaining Burned stacks
        let burnedStacks = 0;
        if (battleManager.statusEffectsManager) {
            burnedStacks = battleManager.statusEffectsManager.getStatusEffectStacks(hero, 'burned');
        }

        if (burnedStacks <= 0) {
            console.log('🔥 FlamebathedWaflav: No burned stacks remaining, no bonus counters');
            return;
        }

        const heroName = heroSide === 'player' ? 'your FlamebathedWaflav' : 'enemy FlamebathedWaflav';

        console.log(`🔥 FlamebathedWaflav: ${heroName} survived with ${burnedStacks} burned stacks - awarding bonus counters`);

        // Award evolution counters equal to remaining burned stacks
        const counters = heroSide === 'player' ? battleManager.playerCounters : battleManager.opponentCounters;
        if (counters) {
            counters.evolutionCounters += burnedStacks;

            // Log the bonus award
            battleManager.addCombatLog(
                `🔥 ${heroName} survives the flames! Gains ${burnedStacks} bonus Evolution Counters!`,
                heroSide === 'player' ? 'success' : 'error'
            );

            // Create reward animation
            this.createSurvivalRewardAnimation(battleManager, hero, heroSide, position, burnedStacks);

            // Sync bonus counter award to opponent
            this.syncBattleEndEffect(battleManager, heroSide, burnedStacks, counters.evolutionCounters);
        }
    }

    // Create fire bath animation at battle start
    static createFireBathAnimation(battleManager, hero, heroSide, position, intensity) {
        const heroElement = battleManager.getHeroElement(heroSide, position);
        if (!heroElement) {
            console.error('🔥 FlamebathedWaflav: Hero element not found');
            return;
        }

        // Create fire overlay
        const fireOverlay = document.createElement('div');
        fireOverlay.className = 'flamebathed-fire-overlay';
        
        fireOverlay.style.cssText = `
            position: absolute;
            top: -20px;
            left: -20px;
            right: -20px;
            bottom: -20px;
            pointer-events: none;
            z-index: 350;
            overflow: hidden;
            opacity: 1;
            animation: flamebathedFireBath 3000ms ease-out forwards;
        `;

        heroElement.appendChild(fireOverlay);

        // Create multiple flame elements for intensity
        const flameCount = Math.min(3 + intensity, 8);
        
        for (let i = 0; i < flameCount; i++) {
            setTimeout(() => {
                this.createFlameElement(fireOverlay, i, flameCount, intensity);
            }, i * 200); // Stagger flame appearance
        }

        // Remove fire overlay after animation
        setTimeout(() => {
            if (fireOverlay && fireOverlay.parentNode) {
                fireOverlay.remove();
            }
        }, 3000);
    }

    // Create individual flame element
    static createFlameElement(fireOverlay, index, totalFlames, intensity) {
        const flame = document.createElement('div');
        flame.className = 'flamebathed-flame';
        flame.innerHTML = '🔥';
        
        // Position flames around the hero
        const angle = (index / totalFlames) * 360;
        const radius = 40 + Math.random() * 20;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        
        const size = 16 + Math.random() * 8 + (intensity * 2);
        
        flame.style.cssText = `
            position: absolute;
            top: calc(50% + ${y}px);
            left: calc(50% + ${x}px);
            transform: translate(-50%, -50%);
            font-size: ${size}px;
            z-index: 351;
            pointer-events: none;
            opacity: 0;
            animation: flamebathedFlameRise 2000ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(255, 100, 0, 0.9),
                0 0 30px rgba(255, 150, 0, 0.6);
        `;
        
        fireOverlay.appendChild(flame);
        
        // Create additional flame particles
        if (Math.random() < 0.6) {
            setTimeout(() => {
                this.createFlameParticle(fireOverlay, x, y);
            }, 500 + Math.random() * 1000);
        }
        
        setTimeout(() => {
            if (flame && flame.parentNode) {
                flame.remove();
            }
        }, 2000);
    }

    // Create flame particle effect
    static createFlameParticle(fireOverlay, baseX, baseY) {
        const particle = document.createElement('div');
        particle.className = 'flamebathed-particle';
        particle.innerHTML = '✨';
        
        const offsetX = baseX + (Math.random() - 0.5) * 30;
        const offsetY = baseY + (Math.random() - 0.5) * 30;
        
        particle.style.cssText = `
            position: absolute;
            top: calc(50% + ${offsetY}px);
            left: calc(50% + ${offsetX}px);
            transform: translate(-50%, -50%);
            font-size: 12px;
            z-index: 352;
            pointer-events: none;
            opacity: 0;
            animation: flamebathedParticleFloat 1500ms ease-out forwards;
            color: rgba(255, 200, 0, 0.9);
        `;
        
        fireOverlay.appendChild(particle);
        
        setTimeout(() => {
            if (particle && particle.parentNode) {
                particle.remove();
            }
        }, 1500);
    }

    // Create survival reward animation at battle end
    static createSurvivalRewardAnimation(battleManager, hero, heroSide, position, bonusCounters) {
        const heroElement = battleManager.getHeroElement(heroSide, position);
        if (!heroElement) return;

        // Create reward effect
        const rewardEffect = document.createElement('div');
        rewardEffect.className = 'flamebathed-survival-reward';
        rewardEffect.innerHTML = `🏆+${bonusCounters}`;
        
        rewardEffect.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 24px;
            z-index: 400;
            pointer-events: none;
            animation: flamebathedRewardFloat 2000ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(255, 215, 0, 0.9),
                0 0 40px rgba(255, 255, 0, 0.6);
        `;
        
        heroElement.appendChild(rewardEffect);

        // Create celebration particles
        for (let i = 0; i < bonusCounters; i++) {
            setTimeout(() => {
                this.createRewardParticle(heroElement, i);
            }, i * 100);
        }
        
        setTimeout(() => {
            if (rewardEffect && rewardEffect.parentNode) {
                rewardEffect.remove();
            }
        }, 2000);
    }

    // Create reward particle
    static createRewardParticle(heroElement, index) {
        const particle = document.createElement('div');
        particle.className = 'flamebathed-reward-particle';
        particle.innerHTML = '💎';
        
        const angle = (index * 45) % 360;
        const distance = 30 + Math.random() * 20;
        
        particle.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 16px;
            z-index: 401;
            pointer-events: none;
            animation: flamebathedRewardParticle 1500ms ease-out forwards;
            --particle-angle: ${angle}deg;
            --particle-distance: ${distance}px;
        `;
        
        heroElement.appendChild(particle);
        
        setTimeout(() => {
            if (particle && particle.parentNode) {
                particle.remove();
            }
        }, 1500);
    }

    // Sync battle start effect to guest
    static syncBattleStartEffect(battleManager, heroSide, evolutionCounters, attackBonus) {
        if (!battleManager.sendBattleUpdate) return;

        const absoluteSide = (heroSide === 'player') ? 
            (battleManager.isHost ? 'host' : 'guest') : 
            (battleManager.isHost ? 'guest' : 'host');

        battleManager.sendBattleUpdate('flamebathed_waflav_battle_start_effect', {
            targetAbsoluteSide: absoluteSide,
            evolutionCounters: evolutionCounters,
            attackBonus: attackBonus,
            timestamp: Date.now()
        });
    }

    // Sync battle end effect to guest
    static syncBattleEndEffect(battleManager, heroSide, bonusCounters, newCounterTotal) {
        if (!battleManager.sendBattleUpdate) return;

        const absoluteSide = (heroSide === 'player') ? 
            (battleManager.isHost ? 'host' : 'guest') : 
            (battleManager.isHost ? 'guest' : 'host');

        battleManager.sendBattleUpdate('flamebathed_waflav_battle_end_effect', {
            targetAbsoluteSide: absoluteSide,
            bonusCounters: bonusCounters,
            newCounterTotal: newCounterTotal,
            timestamp: Date.now()
        });
    }

    // Handle guest receiving battle start effect
    static handleGuestBattleStartEffect(data, battleManager) {
        if (!data || !battleManager || battleManager.isAuthoritative) {
            return;
        }

        const { targetAbsoluteSide, evolutionCounters, attackBonus } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const heroLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';

        // Find the FlamebathedWaflav hero
        const heroes = heroLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const flamebathedWaflavData = this.findFlamebathedWaflavHero(heroes);
        
        if (!flamebathedWaflavData) return;
        
        const { hero, position } = flamebathedWaflavData;

        // Apply the effects on guest side
        if (battleManager.statusEffectsManager) {
            battleManager.statusEffectsManager.applyStatusEffect(hero, 'burned', evolutionCounters);
        }

        hero.addBattleAttackBonus(attackBonus);

        // Create fire animation
        this.createFireBathAnimation(battleManager, hero, heroLocalSide, position, evolutionCounters);

        // Update attack display
        battleManager.updateHeroAttackDisplay(heroLocalSide, position, hero);

        // Add to combat log
        const heroName = heroLocalSide === 'player' ? 'your FlamebathedWaflav' : 'enemy FlamebathedWaflav';
        const logType = heroLocalSide === 'player' ? 'success' : 'error';
        
        battleManager.addCombatLog(
            `🔥 ${heroName} channels ${evolutionCounters} Evolution Counters into flame power!`,
            logType
        );

        battleManager.addCombatLog(
            `🔥 ${heroName} gains ${evolutionCounters} Burned stacks and +${attackBonus} attack!`,
            logType
        );

        console.log(`🔥 Guest received FlamebathedWaflav battle start effect: ${evolutionCounters} counters, +${attackBonus} attack`);
    }

    // Handle guest receiving battle end effect
    static handleGuestBattleEndEffect(data, battleManager) {
        if (!data || !battleManager || battleManager.isAuthoritative) {
            return;
        }

        const { targetAbsoluteSide, bonusCounters, newCounterTotal } = data;
        
        // Determine local side for guest
        const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
        const heroLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const isMyCounter = (targetAbsoluteSide === myAbsoluteSide);

        // Update the appropriate counter on guest side
        if (isMyCounter) {
            battleManager.playerCounters.evolutionCounters = newCounterTotal;
        } else {
            battleManager.opponentCounters.evolutionCounters = newCounterTotal;
        }

        // Find the hero for animation
        const heroes = heroLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const flamebathedWaflavData = this.findFlamebathedWaflavHero(heroes);
        
        if (flamebathedWaflavData) {
            const { hero, position } = flamebathedWaflavData;
            this.createSurvivalRewardAnimation(battleManager, hero, heroLocalSide, position, bonusCounters);
        }

        // Add to combat log
        const heroName = heroLocalSide === 'player' ? 'your FlamebathedWaflav' : 'enemy FlamebathedWaflav';
        const logType = heroLocalSide === 'player' ? 'success' : 'error';
        
        battleManager.addCombatLog(
            `🔥 ${heroName} survives the flames! Gains ${bonusCounters} bonus Evolution Counters!`,
            logType
        );

        console.log(`🔥 Guest received FlamebathedWaflav battle end effect: +${bonusCounters} bonus counters`);
    }

    // Ensure animation styles are present
    static ensureFlameStyles() {
        if (document.getElementById('flamebathedWaflavStyles')) return;
        
        console.log('🔥 FlamebathedWaflav: Loading CSS styles...');
        
        const style = document.createElement('style');
        style.id = 'flamebathedWaflavStyles';
        style.textContent = `
            @keyframes flamebathedFireBath {
                0% {
                    opacity: 0;
                    transform: scale(0.8);
                }
                20% {
                    opacity: 1;
                    transform: scale(1.1);
                }
                80% {
                    opacity: 0.8;
                    transform: scale(1);
                }
                100% {
                    opacity: 0;
                    transform: scale(1.2);
                }
            }

            @keyframes flamebathedFlameRise {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(120deg);
                }
                70% {
                    opacity: 0.8;
                    transform: translate(-50%, -60%) scale(1) rotate(240deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -80%) scale(0.8) rotate(360deg);
                }
            }

            @keyframes flamebathedParticleFloat {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) translateY(-20px);
                }
            }

            @keyframes flamebathedRewardFloat {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.5) translateY(0);
                }
                30% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1.3) translateY(-10px);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) scale(1) translateY(-30px);
                }
            }

            @keyframes flamebathedRewardParticle {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1) 
                              translateX(calc(cos(var(--particle-angle)) * var(--particle-distance)))
                              translateY(calc(sin(var(--particle-angle)) * var(--particle-distance)));
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3)
                              translateX(calc(cos(var(--particle-angle)) * var(--particle-distance) * 1.5))
                              translateY(calc(sin(var(--particle-angle)) * var(--particle-distance) * 1.5));
                }
            }
            
            .flamebathed-fire-overlay {
                will-change: transform, opacity;
            }

            .flamebathed-flame,
            .flamebathed-particle,
            .flamebathed-survival-reward,
            .flamebathed-reward-particle {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
        console.log('🔥 FlamebathedWaflav: CSS styles loaded successfully');
    }
}

// Ensure styles are loaded when module is imported
if (typeof document !== 'undefined') {
    FlamebathedWaflavHeroEffect.ensureFlameStyles();
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FlamebathedWaflavHeroEffect = FlamebathedWaflavHeroEffect;
}

export default FlamebathedWaflavHeroEffect;