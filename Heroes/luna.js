// ./Heroes/luna.js - Luna Hero Manager (following Creature manager pattern)

export class LunaHeroManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.heroName = 'Luna';
        this.activeCleansingEffects = new Set(); // Track active cleansing effects for cleanup
        
        // Luna animation constants
        this.CLEANSING_DURATION = 2000; // 2 second goddess-tier cleansing duration
        
        // Inject CSS styles for Luna's effects
        this.injectLunaStyles();
        
        console.log('🌙 Luna Hero Manager initialized');
    }

    // Static method to check if a hero is Luna (follows Creature pattern)
    static isLuna(heroName) {
        return heroName === 'Luna';
    }

    // Execute Luna's special action when she acts (called from battle flow)
    async executeHeroAction(lunaActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const luna = lunaActor.data;
        
        // Safety check: ensure Luna is still alive
        if (!luna.alive || luna.currentHp <= 0) {
            console.log(`Luna is dead, cannot execute special action`);
            return;
        }

        console.log('🌙 Luna\'s burn cleansing effect triggered!');
        
        // Execute the burn cleansing effect
        await this.executeBurnCleansingEffect(luna);
    }

    // ============================================
    // BURN CLEANSING EFFECT EXECUTION
    // ============================================

    // Execute Luna's burn cleansing effect
    async executeBurnCleansingEffect(luna) {
        if (!this.battleManager.isAuthoritative) return;

        const affectedTargets = [];
        let totalCleansed = 0;

        // Collect all targets (heroes and creatures from both sides)
        const allTargets = this.getAllTargets();

        // Process each target
        for (const target of allTargets) {
            const burnStacks = this.battleManager.statusEffectsManager.getStatusEffectStacks(target, 'burned');
            
            if (burnStacks > 0) {
                // Track this target for animation and counter increment
                affectedTargets.push({
                    name: target.name,
                    type: target.type || 'hero',
                    side: this.getTargetSide(target),
                    removedStacks: 1,
                    remainingStacks: burnStacks - 1,
                    target: target, // Add reference to actual target for animations
                    targetInfo: this.getTargetSyncInfo(target)
                });
                
                totalCleansed++;
                
                console.log(`🌙 Luna cleansed 1 burned from ${target.name} (${burnStacks} -> ${burnStacks - 1})`);
            }
        }

        if (totalCleansed > 0) {
            // Send synchronization data to guest BEFORE starting animations
            this.sendBurnCleansingUpdate(luna, affectedTargets, totalCleansed);
            
            // Short delay to ensure guest receives the message
            await this.battleManager.delay(100);
            
            // Create magical cleansing animations for all affected targets
            await this.createLunaCleansingEffects(luna, affectedTargets);
            
            // Apply the actual burn removal DURING the animation
            await this.battleManager.delay(600); // Wait for animation buildup
            
            for (const targetData of affectedTargets) {
                // Remove 1 burned stack
                this.battleManager.statusEffectsManager.removeStatusEffect(targetData.target, 'burned', 1);
                
                console.log(`🌙 Luna cleansed 1 burned from ${targetData.name} (${targetData.removedStacks + targetData.remainingStacks} -> ${targetData.remainingStacks})`);
            }
            
            // Increment Luna buffs counter for each affected target
            this.incrementLunaBuffsCounter(luna, totalCleansed);
            
            // Log the effect
            this.logBurnCleansingEffect(luna, affectedTargets, totalCleansed);
            
        } else {
            console.log('🌙 Luna found no burned targets to cleanse');
            this.battleManager.addCombatLog(
                '🌙 Luna\'s cleansing light finds no burned allies or enemies to heal!',
                luna.side === 'player' ? 'info' : 'info'
            );
        }
    }

    // ============================================
    // MAGICAL ANIMATION SYSTEM
    // ============================================

    // Create Luna's magical burn cleansing effects
    async createLunaCleansingEffects(luna, affectedTargets) {
        const cleansingPromises = [];
        
        // Create the goddess aura effect around Luna first
        const lunaElement = this.battleManager.getHeroElement(luna.side, luna.position);
        if (lunaElement) {
            const goddessAura = this.createGoddessAura(lunaElement);
            this.activeCleansingEffects.add(goddessAura);
            cleansingPromises.push(goddessAura.promise);
        }
        
        // Create fire-to-ice cleansing effects for each affected target
        for (const targetData of affectedTargets) {
            const targetElement = this.getTargetElement(targetData);
            if (targetElement) {
                const cleansingEffect = this.createFireToIceEffect(targetElement);
                this.activeCleansingEffects.add(cleansingEffect);
                cleansingPromises.push(cleansingEffect.promise);
            }
        }
        
        // Wait for all effects to complete
        await Promise.all(cleansingPromises);
    }

    // Create goddess aura effect around Luna
    createGoddessAura(lunaElement) {
        if (!lunaElement) return { promise: Promise.resolve() };

        const auraContainer = document.createElement('div');
        auraContainer.className = 'luna-goddess-aura';
        
        const adjustedDuration = this.battleManager.getSpeedAdjustedDelay(this.CLEANSING_DURATION);
        
        // Position the aura container to cover Luna
        auraContainer.style.cssText = `
            position: absolute;
            left: -40px;
            top: -40px;
            width: calc(100% + 80px);
            height: calc(100% + 80px);
            pointer-events: none;
            z-index: 1500;
            overflow: visible;
        `;
        
        // Create magical energy rings
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            ring.className = 'luna-energy-ring';
            
            const size = 60 + (i * 30);
            const delay = i * 200;
            
            ring.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                width: ${size}px;
                height: ${size}px;
                transform: translate(-50%, -50%);
                border: 2px solid rgba(255, 215, 0, 0.8);
                border-radius: 50%;
                animation: lunaEnergyRing ${adjustedDuration}ms ease-in-out;
                animation-delay: ${this.battleManager.getSpeedAdjustedDelay(delay)}ms;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 215, 0, 0.3);
            `;
            
            auraContainer.appendChild(ring);
        }
        
        // Create floating goddess particles
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'luna-goddess-particle';
            
            const particleSymbols = ['✨', '🌟', '💫', '⭐'];
            particle.innerHTML = particleSymbols[Math.floor(Math.random() * particleSymbols.length)];
            
            const size = Math.random() * 8 + 4;
            const angle = (360 / particleCount) * i;
            const radius = 40 + Math.random() * 20;
            const animationDelay = Math.random() * adjustedDuration * 0.3;
            
            particle.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                font-size: ${size}px;
                color: rgba(255, 215, 0, ${Math.random() * 0.4 + 0.6});
                animation: lunaGoddessParticle ${adjustedDuration}ms ease-out;
                animation-delay: ${animationDelay}ms;
                text-shadow: 0 0 10px rgba(255, 215, 0, 0.9);
                transform: translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px);
            `;
            
            auraContainer.appendChild(particle);
        }
        
        // Add central crown symbol
        const crown = document.createElement('div');
        crown.className = 'luna-goddess-crown';
        crown.innerHTML = '👑';
        crown.style.cssText = `
            position: absolute;
            left: 50%;
            top: 20%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            animation: lunaGoddessGlow ${adjustedDuration}ms ease-in-out;
            text-shadow: 0 0 15px rgba(255, 215, 0, 1);
            filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
        `;
        
        auraContainer.appendChild(crown);
        
        lunaElement.appendChild(auraContainer);
        
        const promise = new Promise(resolve => {
            setTimeout(() => {
                if (auraContainer && auraContainer.parentNode) {
                    auraContainer.remove();
                }
                this.activeCleansingEffects.delete({ container: auraContainer, promise });
                resolve();
            }, adjustedDuration);
        });
        
        return { container: auraContainer, promise };
    }

    // Create fire-to-ice transformation effect for burned targets
    createFireToIceEffect(targetElement) {
        if (!targetElement) return { promise: Promise.resolve() };

        const effectContainer = document.createElement('div');
        effectContainer.className = 'luna-fire-to-ice-effect';
        
        const adjustedDuration = this.battleManager.getSpeedAdjustedDelay(this.CLEANSING_DURATION);
        
        // Position relative to the target's parent container
        const targetParent = targetElement.parentElement;
        const targetRect = targetElement.getBoundingClientRect();
        const parentRect = targetParent.getBoundingClientRect();
        
        // Calculate position relative to parent
        const relativeLeft = targetRect.left - parentRect.left;
        const relativeTop = targetRect.top - parentRect.top;
        
        effectContainer.style.cssText = `
            position: absolute;
            left: ${relativeLeft - 30}px;
            top: ${relativeTop - 30}px;
            width: ${targetRect.width + 60}px;
            height: ${targetRect.height + 60}px;
            pointer-events: none;
            z-index: 1600;
            overflow: visible;
        `;
        
        // Phase 1: Fire particles (first half of animation)
        const fireParticleCount = 6;
        for (let i = 0; i < fireParticleCount; i++) {
            const fireParticle = document.createElement('div');
            fireParticle.className = 'luna-fire-particle';
            fireParticle.innerHTML = '🔥';
            
            const size = Math.random() * 4 + 6;
            const startX = Math.random() * 100;
            const animationDelay = Math.random() * (adjustedDuration * 0.3);
            
            fireParticle.style.cssText = `
                position: absolute;
                left: ${startX}%;
                top: 80%;
                font-size: ${size}px;
                color: rgba(255, 100, 0, ${Math.random() * 0.4 + 0.6});
                animation: lunaFireBurn ${adjustedDuration * 0.5}ms ease-out;
                animation-delay: ${animationDelay}ms;
                text-shadow: 0 0 8px rgba(255, 100, 0, 0.9);
            `;
            
            effectContainer.appendChild(fireParticle);
        }
        
        // Phase 2: Ice/cleansing particles (second half of animation)
        const iceParticleCount = 8;
        for (let i = 0; i < iceParticleCount; i++) {
            const iceParticle = document.createElement('div');
            iceParticle.className = 'luna-ice-particle';
            iceParticle.innerHTML = '❄️';
            
            const size = Math.random() * 4 + 5;
            const startX = Math.random() * 100;
            const animationDelay = (adjustedDuration * 0.4) + (Math.random() * (adjustedDuration * 0.2));
            
            iceParticle.style.cssText = `
                position: absolute;
                left: ${startX}%;
                top: 20%;
                font-size: ${size}px;
                color: rgba(150, 200, 255, ${Math.random() * 0.4 + 0.6});
                animation: lunaIceCleanse ${adjustedDuration * 0.6}ms ease-out;
                animation-delay: ${animationDelay}ms;
                text-shadow: 0 0 8px rgba(150, 200, 255, 0.9);
            `;
            
            effectContainer.appendChild(iceParticle);
        }
        
        // Central transformation symbol
        const transformSymbol = document.createElement('div');
        transformSymbol.className = 'luna-transform-symbol';
        transformSymbol.innerHTML = '🌙';
        transformSymbol.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: 18px;
            animation: lunaTransformation ${adjustedDuration}ms ease-in-out;
            text-shadow: 0 0 12px rgba(200, 220, 255, 1);
        `;
        
        effectContainer.appendChild(transformSymbol);
        
        targetParent.appendChild(effectContainer);
        
        const promise = new Promise(resolve => {
            setTimeout(() => {
                if (effectContainer && effectContainer.parentNode) {
                    effectContainer.remove();
                }
                this.activeCleansingEffects.delete({ container: effectContainer, promise });
                resolve();
            }, adjustedDuration);
        });
        
        return { container: effectContainer, promise };
    }

    // Get target element for animations
    getTargetElement(targetData) {
        if (targetData.type === 'hero') {
            const heroElement = document.querySelector(
                `.${targetData.side}-slot.${targetData.targetInfo.position}-slot .battle-hero-card`
            );
            if (!heroElement) {
                return document.querySelector(`.${targetData.side}-slot.${targetData.targetInfo.position}-slot`);
            }
            return heroElement;
        } else if (targetData.type === 'creature') {
            return document.querySelector(
                `.${targetData.side}-slot.${targetData.targetInfo.position}-slot .creature-icon[data-creature-index="${targetData.targetInfo.creatureIndex}"]`
            );
        }
        return null;
    }

    // Get target sync information for network synchronization
    getTargetSyncInfo(target) {
        if (target.type === 'hero' || !target.type) {
            return {
                type: 'hero',
                absoluteSide: target.absoluteSide,
                position: target.position,
                name: target.name
            };
        } else {
            // For creatures, find their hero information
            const creatureInfo = this.battleManager.statusEffectsManager.findCreatureInfo(target);
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

    // ============================================
    // TARGET COLLECTION
    // ============================================

    // Get all targets (heroes and creatures from both sides)
    getAllTargets() {
        const allTargets = [];

        // Collect from both player and opponent heroes
        ['player', 'opponent'].forEach(side => {
            const heroes = side === 'player' 
                ? this.battleManager.playerHeroes 
                : this.battleManager.opponentHeroes;

            ['left', 'center', 'right'].forEach(position => {
                const hero = heroes[position];
                if (hero && hero.alive) {
                    // Add the hero
                    allTargets.push(hero);

                    // Add all living creatures
                    if (hero.creatures && hero.creatures.length > 0) {
                        hero.creatures.forEach(creature => {
                            if (creature.alive && creature.currentHp > 0) {
                                allTargets.push(creature);
                            }
                        });
                    }
                }
            });
        });

        return allTargets;
    }

    // Get the side of a target (for logging purposes)
    getTargetSide(target) {
        if (target.side) {
            return target.side;
        }
        
        // For creatures, we need to find their hero to get the side
        if (target.type === 'creature') {
            const creatureInfo = this.battleManager.statusEffectsManager.findCreatureInfo(target);
            return creatureInfo?.hero?.side || 'unknown';
        }
        
        return 'unknown';
    }

    // ============================================
    // COUNTER MANAGEMENT
    // ============================================

    // Increment Luna buffs counter
    incrementLunaBuffsCounter(luna, count) {
        // Determine which counter to increment based on Luna's side
        if (luna.side === 'player') {
            // Luna is on player side, increment player counter
            if (!this.battleManager.playerCounters.lunaBuffs) {
                this.battleManager.playerCounters.lunaBuffs = 0;
            }
            this.battleManager.playerCounters.lunaBuffs += count;
            
            console.log(`🌙 Player Luna buffs counter: ${this.battleManager.playerCounters.lunaBuffs} (+${count})`);
        } else {
            // Luna is on opponent side, increment opponent counter
            if (!this.battleManager.opponentCounters.lunaBuffs) {
                this.battleManager.opponentCounters.lunaBuffs = 0;
            }
            this.battleManager.opponentCounters.lunaBuffs += count;
            
            console.log(`🌙 Opponent Luna buffs counter: ${this.battleManager.opponentCounters.lunaBuffs} (+${count})`);
        }
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the burn cleansing effect to battle log
    logBurnCleansingEffect(luna, affectedTargets, totalCleansed) {
        const lunaSide = luna.side;
        const logType = lunaSide === 'player' ? 'success' : 'error';
        
        // Main cleansing effect log
        this.battleManager.addCombatLog(
            `🌙 Luna's cleansing light removes burned from ${totalCleansed} target${totalCleansed > 1 ? 's' : ''}!`,
            logType
        );

        // Detailed log for each affected target (limit to prevent spam)
        if (affectedTargets.length <= 3) {
            affectedTargets.forEach(target => {
                this.battleManager.addCombatLog(
                    `✨ ${target.name} is cleansed of burn!`,
                    'info'
                );
            });
        } else {
            this.battleManager.addCombatLog(
                `✨ Multiple targets cleansed: ${affectedTargets.map(t => t.name).join(', ')}`,
                'info'
            );
        }
    }

    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================

    // Send burn cleansing effect data to guest for synchronization
    sendBurnCleansingUpdate(luna, affectedTargets, totalCleansed) {
        // Get current counter values for sync
        const playerLunaBuffs = this.battleManager.playerCounters.lunaBuffs || 0;
        const opponentLunaBuffs = this.battleManager.opponentCounters.lunaBuffs || 0;

        this.battleManager.sendBattleUpdate('luna_burn_cleansing', {
            lunaData: {
                side: luna.side,
                position: luna.position,
                name: luna.name,
                absoluteSide: luna.absoluteSide
            },
            affectedTargets: affectedTargets.map(target => ({
                name: target.name,
                type: target.type,
                side: target.side,
                removedStacks: target.removedStacks,
                remainingStacks: target.remainingStacks,
                targetInfo: target.targetInfo
            })),
            totalCleansed: totalCleansed,
            counterUpdates: {
                playerLunaBuffs: playerLunaBuffs,
                opponentLunaBuffs: opponentLunaBuffs
            },
            cleansingDuration: this.CLEANSING_DURATION,
            timestamp: Date.now()
        });
    }

    // Handle Luna burn cleansing effect on guest side
    handleGuestBurnCleansingEffect(data) {
        const { lunaData, affectedTargets, totalCleansed, counterUpdates, cleansingDuration } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const lunaLocalSide = (lunaData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Update local counters to match host
        this.battleManager.playerCounters.lunaBuffs = counterUpdates.playerLunaBuffs;
        this.battleManager.opponentCounters.lunaBuffs = counterUpdates.opponentLunaBuffs;
        
        // Log the effect
        this.battleManager.addCombatLog(
            `🌙 Luna's cleansing light removes burned from ${totalCleansed} target${totalCleansed > 1 ? 's' : ''}!`,
            lunaLocalSide === 'player' ? 'success' : 'error'
        );

        // Log affected targets (limited to prevent spam)
        if (affectedTargets.length <= 3) {
            affectedTargets.forEach(target => {
                this.battleManager.addCombatLog(
                    `✨ ${target.name} is cleansed of burn!`,
                    'info'
                );
            });
        } else {
            this.battleManager.addCombatLog(
                `✨ Multiple targets cleansed: ${affectedTargets.map(t => t.name).join(', ')}`,
                'info'
            );
        }

        // Start guest-side animations
        this.createGuestCleansingEffects(lunaData, affectedTargets, myAbsoluteSide);

        // Console log for testing
        console.log(`🌙 GUEST: Luna buffs counters synced - Player: ${counterUpdates.playerLunaBuffs}, Opponent: ${counterUpdates.opponentLunaBuffs}`);
    }

    // Create cleansing effects on guest side
    async createGuestCleansingEffects(lunaData, affectedTargets, myAbsoluteSide) {
        const cleansingPromises = [];
        const lunaLocalSide = (lunaData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Create goddess aura around Luna
        const lunaElement = this.battleManager.getHeroElement(lunaLocalSide, lunaData.position);
        if (lunaElement) {
            const goddessAura = this.createGoddessAura(lunaElement);
            this.activeCleansingEffects.add(goddessAura);
            cleansingPromises.push(goddessAura.promise);
        }
        
        // Create fire-to-ice effects for all affected targets
        for (const targetData of affectedTargets) {
            const targetLocalSide = (targetData.targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            let targetElement = null;
            
            if (targetData.targetInfo.type === 'hero') {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.targetInfo.position}-slot .battle-hero-card`
                );
                if (!targetElement) {
                    targetElement = document.querySelector(
                        `.${targetLocalSide}-slot.${targetData.targetInfo.position}-slot`
                    );
                }
            } else if (targetData.targetInfo.type === 'creature') {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.targetInfo.position}-slot .creature-icon[data-creature-index="${targetData.targetInfo.creatureIndex}"]`
                );
            }

            if (targetElement) {
                const cleansingEffect = this.createFireToIceEffect(targetElement);
                this.activeCleansingEffects.add(cleansingEffect);
                cleansingPromises.push(cleansingEffect.promise);
            }
        }
        
        // Wait for all cleansing effects to complete
        await Promise.all(cleansingPromises);
    }

    // ============================================
    // CSS STYLES
    // ============================================

    // Inject CSS styles for Luna's magical effects
    injectLunaStyles() {
        if (document.getElementById('lunaHeroStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'lunaHeroStyles';
        style.textContent = `
            /* Luna Goddess Aura Styles */
            .luna-goddess-aura {
                border-radius: 50%;
                position: relative;
                overflow: visible;
            }

            .luna-energy-ring {
                opacity: 0;
                will-change: transform, opacity;
            }

            @keyframes lunaEnergyRing {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                30% { 
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1);
                }
                70% { 
                    opacity: 0.6;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.5);
                }
            }

            .luna-goddess-particle {
                will-change: transform, opacity;
                user-select: none;
                pointer-events: none;
            }

            @keyframes lunaGoddessParticle {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--angle, 0deg)) translateY(-40px) scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--angle, 0deg)) translateY(-60px) scale(1);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--angle, 0deg)) translateY(-100px) scale(1.2);
                }
            }

            @keyframes lunaGoddessGlow {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2);
                    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1));
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1);
                    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
                }
            }

            /* Fire to Ice Transformation Styles */
            .luna-fire-to-ice-effect {
                border-radius: 8px;
                position: relative;
                overflow: visible;
            }

            .luna-fire-particle {
                will-change: transform, opacity;
                user-select: none;
                pointer-events: none;
            }

            @keyframes lunaFireBurn {
                0% { 
                    opacity: 0;
                    transform: translateY(0px) scale(0.8);
                }
                30% {
                    opacity: 1;
                    transform: translateY(-10px) scale(1.1);
                }
                100% { 
                    opacity: 0;
                    transform: translateY(-30px) scale(0.6);
                    filter: brightness(0.5);
                }
            }

            .luna-ice-particle {
                will-change: transform, opacity;
                user-select: none;
                pointer-events: none;
            }

            @keyframes lunaIceCleanse {
                0% { 
                    opacity: 0;
                    transform: translateY(-20px) scale(0.3);
                }
                40% {
                    opacity: 1;
                    transform: translateY(10px) scale(1.2);
                }
                100% { 
                    opacity: 0;
                    transform: translateY(40px) scale(0.8);
                    filter: brightness(1.5);
                }
            }

            @keyframes lunaTransformation {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                }
                25% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.3) rotate(90deg);
                    color: rgba(255, 100, 0, 1);
                    text-shadow: 0 0 12px rgba(255, 100, 0, 1);
                }
                75% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1) rotate(270deg);
                    color: rgba(150, 200, 255, 1);
                    text-shadow: 0 0 12px rgba(150, 200, 255, 1);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8) rotate(360deg);
                }
            }

            /* Enhanced hero glow when Luna is channeling */
            .battle-hero-card.luna-channeling {
                filter: brightness(1.8) drop-shadow(0 0 25px rgba(255, 215, 0, 0.9));
                animation: lunaChannelGlow 2s ease-in-out;
            }

            @keyframes lunaChannelGlow {
                0% { 
                    filter: brightness(1.8) drop-shadow(0 0 25px rgba(255, 215, 0, 0.9));
                }
                50% { 
                    filter: brightness(2.2) drop-shadow(0 0 35px rgba(255, 215, 0, 1));
                }
                100% { 
                    filter: brightness(1.8) drop-shadow(0 0 25px rgba(255, 215, 0, 0.9));
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // CLEANUP
    // ============================================

    // Clean up Luna manager
    cleanup() {
        console.log(`🌙 Cleaning up ${this.activeCleansingEffects.size} active Luna cleansing effects`);
        
        this.activeCleansingEffects.forEach(effect => {
            try {
                if (effect.container && effect.container.parentNode) {
                    effect.container.remove();
                }
            } catch (error) {
                console.warn('Error removing Luna effect during cleanup:', error);
            }
        });
        
        this.activeCleansingEffects.clear();

        // Remove any orphaned Luna effects
        try {
            const orphanedEffects = document.querySelectorAll('.luna-goddess-aura, .luna-fire-to-ice-effect');
            orphanedEffects.forEach(effect => {
                if (effect.parentNode) {
                    effect.remove();
                }
            });
            
            if (orphanedEffects.length > 0) {
                console.log(`🌙 Cleaned up ${orphanedEffects.length} orphaned Luna effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned Luna effects:', error);
        }

        console.log('🌙 Luna Hero Manager cleaned up');
    }
}

// Static helper methods (following Creature pattern)
export const LunaHelpers = {
    // Check if any hero in a formation is Luna
    hasLunaInFormation(formation) {
        return Object.values(formation).some(hero => hero && LunaHeroManager.isLuna(hero.name));
    },

    // Get Luna from formation if present
    getLunaFromFormation(formation) {
        for (const position in formation) {
            const hero = formation[position];
            if (hero && LunaHeroManager.isLuna(hero.name)) {
                return { hero, position };
            }
        }
        return null;
    }
};

export default LunaHeroManager;