// ./Spells/infighting.js - Infighting Spell Implementation

export class InfightingSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Infighting';
        this.displayName = 'Infighting';
        
        console.log('😡 Infighting spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    async executeSpell(caster, spell) {
        console.log(`😡 ${caster.name} casting ${this.displayName}!`);

        // ============================================
        // STORM RING NEGATION CHECK
        // ============================================
        try {
            const { checkStormRingNegation } = await import('../Artifacts/stormRing.js');
            const negationResult = await checkStormRingNegation(caster, spell, this.battleManager);
            
            if (negationResult.negated) {
                console.log(`⛈️ ${spell.name} was negated by Storm Ring!`);
                return;
            }
        } catch (error) {
            console.log('Storm Ring check failed, continuing with spell execution:', error);
        }
        
        // Find all hero targets EXCEPT the caster (including allies!)
        const allTargets = this.findAllOtherHeroes(caster);
        
        if (allTargets.length === 0) {
            console.log(`😡 ${this.displayName}: No valid targets found!`);
            return;
        }
        
        // Check resistance for all targets
        const resistanceResults = this.checkResistanceForAllTargets(allTargets, caster);
        
        // Log the spell effect
        this.logSpellEffect(caster, allTargets, resistanceResults);
        
        // Start visual effects and infighting application
        const animationPromise = this.playInfightingAnimation(allTargets, caster, resistanceResults);
        const statusPromise = this.applyInfightingToAllTargets(allTargets, caster, resistanceResults);
        
        // Wait for both to complete
        await Promise.all([animationPromise, statusPromise]);
        
        console.log(`😡 ${this.displayName} completed!`);
    }

    // ============================================
    // RESISTANCE CHECKING
    // ============================================

    checkResistanceForAllTargets(targets, caster) {
        const resistanceMap = new Map();
        
        targets.forEach(target => {
            let resisted = false;
            
            if (this.battleManager.resistanceManager) {
                resisted = this.battleManager.resistanceManager.shouldResistSpell(
                    target.hero, 
                    this.spellName, 
                    caster
                );
            }
            
            const key = this.getTargetKey(target);
            resistanceMap.set(key, resisted);
            
            if (resisted) {
                console.log(`🛡️ ${target.hero.name} resisted ${this.displayName}!`);
            }
        });
        
        return resistanceMap;
    }

    getTargetKey(target) {
        return `hero_${target.side}_${target.position}`;
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    findAllOtherHeroes(caster) {
        const targets = [];
        
        // Get ALL heroes from both sides
        const allHeroes = [
            ...Object.entries(this.battleManager.playerHeroes),
            ...Object.entries(this.battleManager.opponentHeroes)
        ];
        
        allHeroes.forEach(([position, hero]) => {
            // Skip if hero doesn't exist, is dead, or is the caster
            if (!hero || !hero.alive || hero === caster) {
                return;
            }
            
            targets.push({
                type: 'hero',
                hero: hero,
                position: position,
                side: hero.side
            });
        });
        
        console.log(`🎯 ${this.displayName} found ${targets.length} targets (excluding caster)`);
        return targets;
    }

    // ============================================
    // STATUS APPLICATION
    // ============================================

    async applyInfightingToAllTargets(targets, caster, resistanceResults) {
        const promises = [];
        
        targets.forEach((target, index) => {
            const delay = index * 80; // Stagger for visual effect
            const targetKey = this.getTargetKey(target);
            const isResisted = resistanceResults.get(targetKey);
            
            const promise = new Promise((resolve) => {
                setTimeout(() => {
                    if (!isResisted) {
                        this.applyInfightingToTarget(target);
                    }
                    resolve();
                }, this.battleManager.getSpeedAdjustedDelay(delay));
            });
            
            promises.push(promise);
        });
        
        await Promise.all(promises);
    }

    applyInfightingToTarget(target) {
        if (target.hero && this.battleManager.statusEffectsManager) {
            this.battleManager.statusEffectsManager.applyStatusEffect(
                target.hero, 
                'infighting', 
                1
            );
            
            console.log(`😡 Applied infighting to ${target.hero.name}`);
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    async playInfightingAnimation(targets, caster, resistanceResults) {
        console.log(`😡 Playing Infighting animation with ${targets.length} targets...`);
        
        this.ensureInfightingCSS();
        
        const totalDuration = 1200;
        
        // Create wave of rage emanating from caster
        await this.createRageWave(caster, targets, totalDuration, resistanceResults);
        
        this.cleanupAllInfightingEffects();
    }

    async createRageWave(caster, targets, duration, resistanceResults) {
        const container = document.body;
        
        // Create expanding rage wave from caster
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        if (!casterElement) return;
        
        const casterRect = casterElement.getBoundingClientRect();
        const centerX = casterRect.left + casterRect.width / 2;
        const centerY = casterRect.top + casterRect.height / 2;
        
        // Create pulsing rage aura from caster
        const rageWave = document.createElement('div');
        rageWave.className = 'infighting-rage-wave';
        rageWave.style.cssText = `
            position: fixed;
            top: ${centerY}px;
            left: ${centerX}px;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: radial-gradient(circle, 
                rgba(139, 0, 0, 0.8) 0%, 
                rgba(255, 0, 0, 0.4) 50%, 
                transparent 100%);
            transform: translate(-50%, -50%);
            z-index: 200;
            pointer-events: none;
            animation: rageWaveExpand ${this.battleManager.getSpeedAdjustedDelay(duration)}ms ease-out forwards;
        `;
        
        container.appendChild(rageWave);
        
        // Create rage particles
        const particlePromises = [];
        for (let i = 0; i < 30; i++) {
            particlePromises.push(
                this.createRageParticle(container, centerX, centerY, i, duration)
            );
        }
        
        // Create berserk effects on each target
        setTimeout(() => {
            targets.forEach((target, index) => {
                const targetKey = this.getTargetKey(target);
                const isResisted = resistanceResults.get(targetKey);
                
                setTimeout(() => {
                    this.createBerserkEffect(target, isResisted);
                }, index * 60);
            });
        }, this.battleManager.getSpeedAdjustedDelay(duration * 0.3));
        
        await Promise.all([
            ...particlePromises,
            new Promise(resolve => 
                setTimeout(resolve, this.battleManager.getSpeedAdjustedDelay(duration))
            )
        ]);
        
        if (rageWave && rageWave.parentNode) {
            rageWave.remove();
        }
    }

    createRageParticle(container, centerX, centerY, index, totalDuration) {
        return new Promise(resolve => {
            const particle = document.createElement('div');
            particle.className = 'rage-particle';
            particle.innerHTML = '😡';
            
            const angle = (index / 30) * Math.PI * 2;
            const distance = 200 + Math.random() * 300;
            const endX = centerX + Math.cos(angle) * distance;
            const endY = centerY + Math.sin(angle) * distance;
            
            const delay = (index / 30) * totalDuration * 0.4;
            const particleDuration = totalDuration * 0.6;
            
            particle.style.cssText = `
                position: fixed;
                top: ${centerY}px;
                left: ${centerX}px;
                font-size: 24px;
                z-index: 210;
                pointer-events: none;
                transform: translate(-50%, -50%);
                animation: rageParticleFly ${this.battleManager.getSpeedAdjustedDelay(particleDuration)}ms ease-out forwards;
                animation-delay: ${this.battleManager.getSpeedAdjustedDelay(delay)}ms;
                --end-x: ${endX}px;
                --end-y: ${endY}px;
                text-shadow: 
                    0 0 10px rgba(139, 0, 0, 0.9),
                    0 0 20px rgba(255, 0, 0, 0.6);
            `;
            
            container.appendChild(particle);
            
            setTimeout(() => {
                if (particle && particle.parentNode) {
                    particle.remove();
                }
                resolve();
            }, this.battleManager.getSpeedAdjustedDelay(delay + particleDuration + 100));
        });
    }

    createBerserkEffect(target, isResisted) {
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        if (!targetElement) return;
        
        // Make the hero shake and show rage
        if (!isResisted) {
            targetElement.classList.add('hero-berserk');
            setTimeout(() => {
                targetElement.classList.remove('hero-berserk');
            }, this.battleManager.getSpeedAdjustedDelay(800));
        }
        
        const berserkEffect = document.createElement('div');
        berserkEffect.className = 'berserk-impact-effect';
        
        if (isResisted) {
            berserkEffect.innerHTML = '🛡️✨';
            berserkEffect.classList.add('resisted');
        } else {
            berserkEffect.innerHTML = '😡💢';
        }
        
        berserkEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 40px;
            z-index: 250;
            pointer-events: none;
            animation: ${isResisted ? 'berserkResisted' : 'berserkImpact'} ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
        `;
        
        if (isResisted) {
            berserkEffect.style.textShadow = `
                0 0 10px rgba(100, 200, 255, 0.9),
                0 0 20px rgba(150, 150, 255, 0.7)
            `;
        } else {
            berserkEffect.style.textShadow = `
                0 0 15px rgba(139, 0, 0, 0.9),
                0 0 25px rgba(255, 0, 0, 0.7)
            `;
        }
        
        targetElement.appendChild(berserkEffect);
        
        setTimeout(() => {
            if (berserkEffect && berserkEffect.parentNode) {
                berserkEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(600));
    }

    cleanupAllInfightingEffects() {
        document.querySelectorAll('.infighting-rage-wave').forEach(el => el.remove());
        document.querySelectorAll('.rage-particle').forEach(el => el.remove());
        document.querySelectorAll('.berserk-impact-effect').forEach(el => el.remove());
        document.querySelectorAll('.hero-berserk').forEach(el => 
            el.classList.remove('hero-berserk')
        );
    }

    ensureInfightingCSS() {
        if (document.getElementById('infightingCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'infightingCSS';
        style.textContent = `
            @keyframes rageWaveExpand {
                0% { 
                    width: 100px;
                    height: 100px;
                    opacity: 0.8;
                }
                50% {
                    opacity: 1;
                }
                100% { 
                    width: 2000px;
                    height: 2000px;
                    opacity: 0;
                }
            }
            
            @keyframes rageParticleFly {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(90deg);
                }
                80% {
                    opacity: 1;
                }
                100% { 
                    top: var(--end-y);
                    left: var(--end-x);
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8) rotate(360deg);
                }
            }
            
            @keyframes berserkImpact {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(-20deg);
                }
                30% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.4) rotate(10deg);
                }
                60% {
                    transform: translate(-50%, -50%) scale(1.2) rotate(-5deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.5) rotate(0deg);
                }
            }
            
            @keyframes berserkResisted {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.3);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.5);
                }
            }
            
            .hero-berserk {
                animation: heroBerserkShake 0.8s ease-in-out !important;
            }
            
            @keyframes heroBerserkShake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-8px) rotate(-2deg); }
                20%, 40%, 60%, 80% { transform: translateX(8px) rotate(2deg); }
            }
            
            .infighting-rage-wave {
                will-change: width, height, opacity;
            }
            
            .rage-particle {
                will-change: transform, opacity, top, left;
            }
            
            .berserk-impact-effect {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    logSpellEffect(caster, targets, resistanceResults) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        let hits = 0, resists = 0;
        targets.forEach(target => {
            const key = this.getTargetKey(target);
            if (resistanceResults.get(key)) resists++;
            else hits++;
        });
        
        let message = `😡 ${caster.name} casts ${this.displayName}`;
        
        if (hits > 0) {
            message += `, causing ${hits} hero${hits > 1 ? 'es' : ''} to become enraged!`;
        } else {
            message += `, but all heroes resisted the rage!`;
        }
        
        this.battleManager.addCombatLog(message, logType);
        
        if (resists > 0 && hits > 0) {
            this.battleManager.addCombatLog(
                `🛡️ ${resists} hero${resists > 1 ? 'es' : ''} resisted the spell!`,
                'info'
            );
        }
        
        // Convert resistance map for sync
        const resistanceData = {};
        resistanceResults.forEach((resisted, key) => {
            resistanceData[key] = resisted;
        });
        
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetCount: targets.length,
            hits: hits,
            resists: resists,
            resistanceData: resistanceData,
            effectType: 'infighting',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    handleGuestSpellEffect(data) {
        const { displayName, casterName, hits, resists, resistanceData } = data;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        let message = `😡 ${casterName} casts ${displayName}`;
        
        if (hits > 0) {
            message += `, causing ${hits} hero${hits > 1 ? 'es' : ''} to become enraged!`;
        } else {
            message += `, but all heroes resisted the rage!`;
        }
        
        this.battleManager.addCombatLog(message, logType);
        
        if (resists > 0 && hits > 0) {
            this.battleManager.addCombatLog(
                `🛡️ ${resists} hero${resists > 1 ? 'es' : ''} resisted the spell!`,
                'info'
            );
        }
        
        // Find caster and targets for animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        const guestTargets = this.findAllOtherHeroesForGuest(mockCaster);
        
        const guestResistanceMap = new Map();
        if (resistanceData) {
            Object.entries(resistanceData).forEach(([key, resisted]) => {
                guestResistanceMap.set(key, resisted);
            });
        }
        
        if (guestTargets.length > 0) {
            this.playInfightingAnimation(guestTargets, mockCaster, guestResistanceMap);
        }
        
        console.log(`😡 GUEST: ${casterName} used ${displayName} on ${data.targetCount} targets`);
    }

    findAllOtherHeroesForGuest(caster) {
        const targets = [];
        
        const allHeroes = [
            ...Object.entries(this.battleManager.playerHeroes),
            ...Object.entries(this.battleManager.opponentHeroes)
        ];
        
        allHeroes.forEach(([position, hero]) => {
            // For guest, we need to exclude based on side and position match
            if (!hero || !hero.alive) return;
            if (hero.side === caster.side && position === caster.position) return;
            
            targets.push({
                type: 'hero',
                hero: hero,
                position: position,
                side: hero.side
            });
        });
        
        return targets;
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    canHandle(spellName) {
        return spellName === this.spellName;
    }

    getSpellInfo() {
        return {
            name: this.spellName,
            displayName: this.displayName,
            description: 'Causes all other heroes (including allies) to become enraged, applying the Infighting status effect.',
            targetType: 'all_other_heroes',
            spellSchool: 'None',
            specialEffects: ['Applies Infighting status effect', 'Affects allies as well as enemies']
        };
    }

    cleanup() {
        this.cleanupAllInfightingEffects();
        
        const css = document.getElementById('infightingCSS');
        if (css) css.remove();
        
        console.log('😡 Infighting spell cleaned up');
    }
}

export default InfightingSpell;