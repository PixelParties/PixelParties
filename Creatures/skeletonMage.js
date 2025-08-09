// ./Creatures/skeletonMage.js - Skeleton Mage Creature Lightning Bolt Module

export class SkeletonMageCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeProjectiles = new Set(); // Track active projectiles for cleanup
        
        // Skeleton Mage stats
        this.LIGHTNING_DAMAGE = 30;
        this.PROJECTILE_TRAVEL_TIME = 400; // 0.4 second base travel time
        this.SPELL_NAME = 'LightningBolt'; // For resistance checking
        
        // Inject CSS styles
        this.injectSkeletonMageStyles();
        
        console.log('⚡ Skeleton Mage Creature module initialized');
    }

    // Check if a creature is Skeleton Mage
    static isSkeletonMage(creatureName) {
        return creatureName === 'SkeletonMage';
    }

    // Execute Skeleton Mage special attack (normal turn action)
    async executeSpecialAttack(mageActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const mageCreature = mageActor.data;
        const mageHero = mageActor.hero;
        const attackerSide = mageHero.side;
        
        // Safety check: ensure Skeleton Mage is still alive
        if (!mageCreature.alive || mageCreature.currentHp <= 0) {
            console.log(`Skeleton Mage is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `⚡ ${mageCreature.name} channels mystical energy and prepares a lightning bolt!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find a completely random target (any enemy hero or creature)
        const target = this.battleManager.combatManager.authoritative_findRandomTarget(attackerSide);
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${mageCreature.name} finds no enemies to strike with lightning!`, 
                'info'
            );
            return;
        }
        
        // Execute lightning bolt
        await this.executeLightningBolt(mageActor, target, position, 'special_attack');
    }

    // ============================================
    // ALLY DEATH REACTION
    // ============================================

    // Execute ally death reaction (triggered when an allied unit dies)
    async executeAllyDeathReaction(mageCreature, mageHero, position, mageSide, deadUnit) {
        if (!this.battleManager.isAuthoritative) return;

        // Safety check: ensure Skeleton Mage is still alive
        if (!mageCreature.alive || mageCreature.currentHp <= 0) {
            return;
        }
        
        const deadUnitName = deadUnit.name || 'ally';
        this.battleManager.addCombatLog(
            `⚡💀 ${mageCreature.name} senses ${deadUnitName}'s demise and unleashes vengeful lightning!`, 
            mageSide === 'player' ? 'warning' : 'warning'
        );

        // Find a completely random target (any enemy hero or creature)
        const target = this.battleManager.combatManager.authoritative_findRandomTarget(mageSide);
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${mageCreature.name}'s vengeful lightning finds no enemies to strike!`, 
                'info'
            );
            return;
        }
        
        // Create actor-like object for the mage
        const mageActor = {
            data: mageCreature,
            hero: mageHero,
            index: mageHero.creatures.indexOf(mageCreature)
        };
        
        // Execute lightning bolt as revenge
        await this.executeLightningBolt(mageActor, target, position, 'ally_death_reaction');
    }

    // ============================================
    // CORE LIGHTNING BOLT EXECUTION
    // ============================================

    // Execute the lightning bolt attack with resistance checking
    async executeLightningBolt(mageActor, target, position, triggerType) {
        const attackerSide = mageActor.hero.side;
        const mageCreature = mageActor.data;
        
        // Log target acquisition
        const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
        this.battleManager.addCombatLog(
            `🎯 ${mageCreature.name} targets ${targetName} with crackling lightning!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Check for resistance (only for heroes, creatures can't resist)
        let isResisted = false;
        if (target.type === 'hero') {
            isResisted = this.battleManager.resistanceManager && 
                this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.SPELL_NAME);
            
            if (isResisted) {
                console.log(`🛡️ ${target.hero.name} resisted ${mageCreature.name}'s lightning bolt!`);
            }
        }

        // Send synchronization data to guest BEFORE starting host animation
        this.sendLightningBoltUpdate(mageActor, target, position, triggerType, isResisted);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute lightning bolt with visual effects
        await this.executeLightningProjectile(mageActor, target, position, isResisted);
    }

    // Execute the lightning projectile with visual effects (host side)
    async executeLightningProjectile(mageActor, target, position, isResisted = false) {
        const attackerSide = mageActor.hero.side;
        const mageElement = this.getMageElement(attackerSide, position, mageActor.index);
        const targetElement = this.getTargetElement(target);
        
        if (!mageElement) {
            console.error('Skeleton Mage element not found, cannot create lightning projectile');
            return;
        }

        if (!targetElement) {
            console.error('Target element not found, cannot create lightning projectile');
            return;
        }
        
        // Create and launch lightning projectile
        const projectile = this.createLightningProjectile(mageElement, targetElement);
        if (!projectile) {
            console.error('Failed to create lightning projectile');
            return;
        }

        this.activeProjectiles.add(projectile);

        // Calculate speed-adjusted travel time
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.PROJECTILE_TRAVEL_TIME);
        
        // Wait for projectile to reach target
        await this.battleManager.delay(adjustedTravelTime);
        
        // Apply damage when projectile hits (only if not resisted)
        if (!isResisted) {
            this.applyLightningDamage(target, mageActor.data);
        }
        
        // Add impact effect
        this.createLightningImpactEffect(targetElement, isResisted);
        
        // Clean up projectile
        this.removeProjectile(projectile);

        if (isResisted) {
            this.battleManager.addCombatLog(
                `🛡️ The lightning is deflected by ${target.hero.name}'s resistance!`, 
                'info'
            );
        } else {
            this.battleManager.addCombatLog(
                `⚡ The lightning bolt strikes with devastating force, dealing ${this.LIGHTNING_DAMAGE} damage!`, 
                'info'
            );
        }
    }

    // ============================================
    // PROJECTILE CREATION AND VISUAL EFFECTS
    // ============================================

    // Create a lightning bolt projectile that travels from mage to target
    createLightningProjectile(fromElement, toElement) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create lightning projectile: missing elements', { fromElement: !!fromElement, toElement: !!toElement });
            return null;
        }

        // Additional validation: ensure elements are still in DOM
        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            console.warn('Cannot create lightning projectile: elements not in DOM');
            return null;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            // Validate that elements have valid dimensions
            if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
                console.warn('Cannot create lightning projectile: elements have invalid dimensions');
                return null;
            }

            // Calculate center positions
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            // Enhanced validation for coordinates
            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid lightning projectile coordinates detected:', { fromX, fromY, toX, toY });
                return null;
            }

            // Calculate projectile properties
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Prevent projectiles that are too short or too long (likely errors)
            if (distance < 10 || distance > 2000) {
                console.warn(`Invalid lightning projectile distance: ${distance}px`);
                return null;
            }

            // Create the lightning bolt projectile element (simple black lightning bolt)
            const projectile = document.createElement('div');
            projectile.className = 'skeleton-mage-lightning';
            projectile.innerHTML = '⚡';
            
            // Calculate speed-adjusted travel time for CSS animation
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.PROJECTILE_TRAVEL_TIME);
            
            projectile.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                font-size: 24px;
                color: #000000;
                transform: translate(-50%, -50%);
                z-index: 1500;
                pointer-events: none;
                animation: lightningTravel ${adjustedTravelTime}ms linear forwards;
                --target-x: ${deltaX}px;
                --target-y: ${deltaY}px;
                text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.3);
            `;
            
            document.body.appendChild(projectile);
            
            console.log(`Created lightning projectile: ${distance.toFixed(1)}px, travel time: ${adjustedTravelTime}ms`);
            return projectile;
            
        } catch (error) {
            console.error('Error creating lightning projectile:', error);
            return null;
        }
    }

    // Create lightning impact effect at target location
    createLightningImpactEffect(targetElement, isResisted = false) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const impact = document.createElement('div');
        impact.className = 'lightning-impact-effect';
        
        if (isResisted) {
            impact.innerHTML = '🛡️⚡';
            impact.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                font-size: 32px;
                transform: translate(-50%, -50%);
                z-index: 1600;
                pointer-events: none;
                animation: lightningResisted 0.5s ease-out forwards;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            `;
        } else {
            impact.innerHTML = '⚡💥';
            impact.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                font-size: 32px;
                transform: translate(-50%, -50%);
                z-index: 1600;
                pointer-events: none;
                animation: lightningImpact 0.5s ease-out forwards;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            `;
        }

        document.body.appendChild(impact);

        // Create secondary lightning effects around target (if not resisted)
        if (!isResisted) {
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    this.createSimpleLightningSpark(centerX, centerY, i);
                }, i * 40);
            }
        }

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 500);
    }

    // Create simple lightning sparks around impact
    createSimpleLightningSpark(centerX, centerY, index) {
        const spark = document.createElement('div');
        spark.className = 'lightning-impact-spark';
        spark.innerHTML = '⚡';
        
        // Simple positioning around the impact
        const angle = (index / 3) * Math.PI * 2;
        const distance = 25 + Math.random() * 15;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        spark.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: 16px;
            color: #000000;
            transform: translate(-50%, -50%);
            z-index: 1550;
            pointer-events: none;
            animation: lightningSparkFade 0.3s ease-out forwards;
            text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(spark);
        
        setTimeout(() => {
            if (spark.parentNode) {
                spark.remove();
            }
        }, 300);
    }

    // ============================================
    // DAMAGE APPLICATION
    // ============================================

    // Apply Skeleton Mage lightning damage to target
    applyLightningDamage(target, attackingMage = null) {
        const damage = this.LIGHTNING_DAMAGE;
        
        if (target.type === 'hero') {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, { 
                source: 'spell', 
                spellName: this.SPELL_NAME,
                attacker: attackingMage // ✅ Pass the attacking creature
            });
        } else if (target.type === 'creature') {
            this.battleManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: target.position,
                side: target.side
            }, { 
                source: 'spell', 
                spellName: this.SPELL_NAME,
                attacker: attackingMage // ✅ Pass the attacking creature
            });
        }
    }

    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================

    // Send lightning bolt data to guest for synchronization
    sendLightningBoltUpdate(mageActor, target, position, triggerType, isResisted) {
        const attackerSide = mageActor.hero.side;
        
        this.battleManager.sendBattleUpdate('skeleton_mage_lightning_bolt', {
            mageData: {
                side: attackerSide,
                position: position,
                creatureIndex: mageActor.index,
                name: mageActor.data.name,
                absoluteSide: mageActor.hero.absoluteSide
            },
            target: {
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null
            },
            damage: this.LIGHTNING_DAMAGE,
            travelTime: this.PROJECTILE_TRAVEL_TIME,
            triggerType: triggerType,
            isResisted: isResisted
        });
    }

    // Handle Skeleton Mage lightning bolt on guest side
    handleGuestLightningBolt(data) {
        const { mageData, target, damage, travelTime, triggerType, isResisted } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const mageLocalSide = (mageData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (triggerType === 'ally_death_reaction') {
            this.battleManager.addCombatLog(
                `⚡💀 ${mageData.name} unleashes vengeful lightning!`, 
                'warning'
            );
        } else {
            this.battleManager.addCombatLog(
                `⚡ ${mageData.name} hurls a crackling lightning bolt!`, 
                mageLocalSide === 'player' ? 'success' : 'error'
            );
        }

        // Start guest animation immediately
        this.createGuestLightningProjectile(mageData, target, travelTime, myAbsoluteSide, isResisted);
    }

    // Create lightning projectile on guest side
    async createGuestLightningProjectile(mageData, targetData, travelTime, myAbsoluteSide, isResisted) {
        const mageLocalSide = (mageData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const mageElement = this.getMageElement(
            mageLocalSide,
            mageData.position,
            mageData.creatureIndex
        );

        if (!mageElement) {
            console.warn('Skeleton Mage element not found on guest side');
            return;
        }

        // Find target element using absoluteSide mapping
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        let targetElement = null;
        
        if (targetData.type === 'hero') {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .battle-hero-card`
            );
            if (!targetElement) {
                // Fallback to slot
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot`
                );
            }
        } else if (targetData.type === 'creature' && targetData.creatureIndex !== null) {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }

        if (targetElement) {
            const projectile = this.createLightningProjectile(mageElement, targetElement);
            if (projectile) {
                this.activeProjectiles.add(projectile);
            }

            // Calculate speed-adjusted travel time
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(travelTime);
            
            // Wait for projectile to reach target, then show impact
            await this.battleManager.delay(adjustedTravelTime);
            
            this.createLightningImpactEffect(targetElement, isResisted);
            this.removeProjectile(projectile);

            // Log result (but don't apply actual damage - host handles that)
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            if (isResisted) {
                this.battleManager.addCombatLog(
                    `🛡️ ${targetName} resists the lightning bolt!`, 
                    'info'
                );
            } else {
                this.battleManager.addCombatLog(
                    `⚡ ${targetName} is struck by lightning for ${this.LIGHTNING_DAMAGE} damage!`, 
                    targetLocalSide === 'player' ? 'error' : 'success'
                );
            }
        } else {
            console.warn(`Guest: Target element not found for ${targetData.type} at ${targetLocalSide}-${targetData.position}`);
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Get the DOM element for Skeleton Mage creature
    getMageElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Get the DOM element for a target (reused from SkeletonArcher)
    getTargetElement(target) {
        if (!target || !target.side || !target.position) {
            console.warn('Invalid target data:', target);
            return null;
        }

        let element = null;
        
        if (target.type === 'hero') {
            element = document.querySelector(`.${target.side}-slot.${target.position}-slot .battle-hero-card`);
            if (!element) {
                // Fallback to the slot itself
                element = document.querySelector(`.${target.side}-slot.${target.position}-slot`);
            }
        } else if (target.type === 'creature') {
            if (target.creatureIndex === undefined || target.creatureIndex < 0) {
                console.warn('Invalid creature index for target:', target);
                return null;
            }
            element = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }

        if (!element) {
            console.warn(`Target element not found for ${target.type} at ${target.side}-${target.position}${target.type === 'creature' ? `-${target.creatureIndex}` : ''}`);
        }

        return element;
    }

    // Remove projectile with cleanup
    removeProjectile(projectile) {
        if (projectile && projectile.parentNode) {
            this.activeProjectiles.delete(projectile);
            projectile.remove();
        }
    }

    // Clean up all active projectiles (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeProjectiles.size} active Skeleton Mage lightning projectiles`);
        
        this.activeProjectiles.forEach(projectile => {
            try {
                if (projectile && projectile.parentNode) {
                    projectile.remove();
                }
            } catch (error) {
                console.warn('Error removing lightning projectile during cleanup:', error);
            }
        });
        
        this.activeProjectiles.clear();

        // Also remove any orphaned projectile elements
        try {
            const orphanedProjectiles = document.querySelectorAll('.skeleton-mage-lightning');
            orphanedProjectiles.forEach(projectile => {
                if (projectile.parentNode) {
                    projectile.remove();
                }
            });
            
            if (orphanedProjectiles.length > 0) {
                console.log(`Cleaned up ${orphanedProjectiles.length} orphaned Skeleton Mage lightning projectiles`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned lightning projectiles:', error);
        }
    }

    // Inject CSS styles for Skeleton Mage effects
    injectSkeletonMageStyles() {
        if (document.getElementById('skeletonMageCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'skeletonMageCreatureStyles';
        style.textContent = `
            /* Skeleton Mage Lightning Projectile Styles */
            .skeleton-mage-lightning {
                will-change: transform, opacity;
            }

            @keyframes lightningTravel {
                0% { 
                    transform: translate(-50%, -50%);
                    opacity: 1;
                }
                100% { 
                    transform: translate(calc(-50% + var(--target-x)), calc(-50% + var(--target-y)));
                    opacity: 0.8;
                }
            }

            @keyframes lightningImpact {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.5);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(2);
                }
            }

            @keyframes lightningResisted {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.3);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.6);
                }
            }

            @keyframes lightningSparkFade {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
            }

            /* Enhanced creature glow when Skeleton Mage is channeling lightning */
            .creature-icon.mage-channeling .creature-sprite {
                filter: brightness(1.6) drop-shadow(0 0 12px rgba(100, 100, 100, 0.8));
                animation: mageChannelGlow 1.2s ease-in-out infinite alternate;
            }

            @keyframes mageChannelGlow {
                0% { 
                    filter: brightness(1.6) drop-shadow(0 0 12px rgba(100, 100, 100, 0.8));
                }
                100% { 
                    filter: brightness(2.0) drop-shadow(0 0 20px rgba(150, 150, 150, 1));
                }
            }


            /* Ice projectile and impact animations */
            @keyframes iceTravel {
                0% { 
                    transform: translate(-50%, -50%);
                    opacity: 1;
                }
                100% { 
                    transform: translate(calc(-50% + var(--target-x)), calc(-50% + var(--target-y)));
                    opacity: 0.9;
                }
            }

            @keyframes iceImpact {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.3);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.8);
                }
            }

            @keyframes iceCrystalShatter {
                0% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1) rotate(0deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(180deg);
                }
            }
        `;
        
        document.head.appendChild(style);
    }



    // ============================================
    // REVENGE ICE DEATH EFFECT
    // ============================================

    // Execute revenge ice when Skeleton Mage dies (ice projectile at attacker)
    async executeRevengeIce(dyingMage, heroOwner, position, side, attacker) {
        if (!this.battleManager.isAuthoritative) return;

        const mageCreature = dyingMage;
        const mageSide = side;
        
        this.battleManager.addCombatLog(
            `💀❄️ ${mageCreature.name}'s dying spirit unleashes vengeful ice at its killer!`, 
            mageSide === 'player' ? 'info' : 'info'
        );

        // Create target object for the attacker
        const target = this.createTargetFromAttacker(attacker);
        
        if (!target) {
            this.battleManager.addCombatLog(
                `💨 ${mageCreature.name}'s revenge ice cannot find its target!`, 
                'info'
            );
            return;
        }

        // Log target acquisition
        this.battleManager.addCombatLog(
            `🎯 Vengeful ice seeks ${attacker.name} for killing ${mageCreature.name}!`, 
            'warning'
        );

        // Send revenge ice data to guest for synchronization
        this.sendRevengeIceUpdate(mageCreature, heroOwner, position, mageSide, target);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(100);

        // Execute the revenge ice attack
        await this.executeRevengeIceAttack(mageCreature, heroOwner, position, mageSide, target);
    }

    // Create target object from attacker
    createTargetFromAttacker(attacker) {
        // Determine if attacker is hero or creature
        if (attacker.type === 'hero' || !attacker.type) {
            // Hero attacker
            return {
                type: 'hero',
                hero: attacker,
                position: attacker.position,
                side: attacker.side
            };
        } else {
            // Creature attacker - need to find its position and index
            const creatureInfo = this.findCreatureInfo(attacker);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                hero: creatureInfo.hero,
                creature: attacker,
                creatureIndex: creatureInfo.creatureIndex,
                position: creatureInfo.position,
                side: creatureInfo.side
            };
        }
    }

    // Find creature information (helper method)
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

    // Execute the revenge ice attack (ice projectile with freeze)
    async executeRevengeIceAttack(mageCreature, heroOwner, position, mageSide, target) {
        // Get the mage element (even though it's dead, we need it for projectile origin)
        const mageElement = this.getMageElement(
            mageSide, 
            position, 
            heroOwner.creatures.indexOf(mageCreature)
        );
        
        if (!mageElement) {
            console.error('Skeleton Mage element not found for revenge ice');
            return;
        }

        const targetElement = this.getTargetElement(target);
        
        if (!targetElement) {
            console.error('Target element not found for revenge ice');
            return;
        }
        
        // Create and launch ice projectile
        const projectile = this.createIceProjectile(mageElement, targetElement);
        if (!projectile) {
            console.error('Failed to create ice projectile');
            return;
        }

        this.activeProjectiles.add(projectile);

        // Calculate speed-adjusted travel time
        const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.PROJECTILE_TRAVEL_TIME);
        
        // Wait for projectile to reach target
        await this.battleManager.delay(adjustedTravelTime);
        
        // Apply freeze status effect when projectile hits
        this.applyRevengeFreeze(target);
        
        // Add ice impact effect
        this.createIceImpactEffect(targetElement);
        
        // Clean up projectile
        this.removeProjectile(projectile);

        this.battleManager.addCombatLog(
            `❄️ The vengeful ice strikes and freezes ${target.hero?.name || target.creature?.name}!`, 
            'warning'
        );
    }

    // Create ice projectile (modified from lightning projectile)
    createIceProjectile(fromElement, toElement) {
        if (!fromElement || !toElement) {
            console.warn('Cannot create ice projectile: missing elements', { fromElement: !!fromElement, toElement: !!toElement });
            return null;
        }

        if (!document.body.contains(fromElement) || !document.body.contains(toElement)) {
            console.warn('Cannot create ice projectile: elements not in DOM');
            return null;
        }

        try {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
                console.warn('Cannot create ice projectile: elements have invalid dimensions');
                return null;
            }

            // Calculate center positions
            const fromX = fromRect.left + fromRect.width / 2;
            const fromY = fromRect.top + fromRect.height / 2;
            const toX = toRect.left + toRect.width / 2;
            const toY = toRect.top + toRect.height / 2;

            if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX) || !isFinite(toY)) {
                console.warn('Invalid ice projectile coordinates detected:', { fromX, fromY, toX, toY });
                return null;
            }

            // Calculate projectile properties
            const deltaX = toX - fromX;
            const deltaY = toY - fromY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance < 10 || distance > 2000) {
                console.warn(`Invalid ice projectile distance: ${distance}px`);
                return null;
            }

            // Create the ice projectile element (ice shard)
            const projectile = document.createElement('div');
            projectile.className = 'skeleton-mage-ice';
            projectile.innerHTML = '❄️';
            
            // Calculate speed-adjusted travel time for CSS animation
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(this.PROJECTILE_TRAVEL_TIME);
            
            projectile.style.cssText = `
                position: fixed;
                left: ${fromX}px;
                top: ${fromY}px;
                font-size: 24px;
                color: #87CEEB;
                transform: translate(-50%, -50%);
                z-index: 1500;
                pointer-events: none;
                animation: iceTravel ${adjustedTravelTime}ms linear forwards;
                --target-x: ${deltaX}px;
                --target-y: ${deltaY}px;
                text-shadow: 
                    0 0 10px rgba(135, 206, 235, 0.8),
                    0 0 20px rgba(173, 216, 230, 0.6);
                filter: drop-shadow(0 0 8px rgba(135, 206, 235, 0.8));
            `;
            
            document.body.appendChild(projectile);
            
            console.log(`Created ice projectile: ${distance.toFixed(1)}px, travel time: ${adjustedTravelTime}ms`);
            return projectile;
            
        } catch (error) {
            console.error('Error creating ice projectile:', error);
            return null;
        }
    }

    // Create ice impact effect at target location
    createIceImpactEffect(targetElement) {
        if (!targetElement) return;

        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const impact = document.createElement('div');
        impact.className = 'ice-impact-effect';
        impact.innerHTML = '❄️💎';
        
        impact.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            font-size: 32px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: iceImpact 0.6s ease-out forwards;
            text-shadow: 
                0 0 15px rgba(135, 206, 235, 1),
                0 0 30px rgba(173, 216, 230, 0.8);
            filter: drop-shadow(0 0 12px rgba(135, 206, 235, 1));
        `;

        document.body.appendChild(impact);

        // Create ice crystals around impact
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                this.createIceCrystal(centerX, centerY, i);
            }, i * 60);
        }

        // Remove impact effect after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 600);
    }

    // Create ice crystals around impact
    createIceCrystal(centerX, centerY, index) {
        const crystal = document.createElement('div');
        crystal.className = 'ice-impact-crystal';
        crystal.innerHTML = '💎';
        
        // Position crystals in a circle around the impact
        const angle = (index / 6) * Math.PI * 2;
        const distance = 20 + Math.random() * 15;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        crystal.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: 12px;
            color: #87CEEB;
            transform: translate(-50%, -50%);
            z-index: 1550;
            pointer-events: none;
            animation: iceCrystalShatter 0.4s ease-out forwards;
            text-shadow: 0 0 8px rgba(135, 206, 235, 0.8);
        `;
        
        document.body.appendChild(crystal);
        
        setTimeout(() => {
            if (crystal.parentNode) {
                crystal.remove();
            }
        }, 400);
    }

    // Apply freeze status effect to target
    applyRevengeFreeze(target) {
        if (!this.battleManager.statusEffectsManager) return;

        const targetData = target.type === 'creature' ? target.creature : target.hero;
        
        // Apply 1 stack of Frozen
        const success = this.battleManager.statusEffectsManager.applyStatusEffect(
            targetData, 
            'frozen', 
            1
        );

        if (success) {
            const targetName = target.type === 'creature' ? target.creature.name : target.hero.name;
            this.battleManager.addCombatLog(
                `🧊 ${targetName} is frozen by the vengeful ice magic!`,
                target.side === 'player' ? 'error' : 'success'
            );
        }
    }

    // Send revenge ice data to guest for synchronization
    sendRevengeIceUpdate(mageCreature, heroOwner, position, mageSide, target) {
        this.battleManager.sendBattleUpdate('skeleton_mage_revenge_ice', {
            mageData: {
                side: mageSide,
                position: position,
                creatureIndex: heroOwner.creatures.indexOf(mageCreature),
                name: mageCreature.name,
                absoluteSide: heroOwner.absoluteSide
            },
            target: {
                type: target.type,
                side: target.side,
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                heroName: target.hero ? target.hero.name : null,
                creatureName: target.creature ? target.creature.name : null
            },
            travelTime: this.PROJECTILE_TRAVEL_TIME
        });
    }

    // Handle Skeleton Mage revenge ice on guest side
    handleGuestRevengeIce(data) {
        const { mageData, target, travelTime } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const mageLocalSide = (mageData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `💀❄️ ${mageData.name}'s dying spirit unleashes vengeful ice!`, 
            'info'
        );

        // Start guest animation immediately
        this.createGuestRevengeIce(mageData, target, travelTime, myAbsoluteSide);
    }

    // Create revenge ice on guest side
    async createGuestRevengeIce(mageData, targetData, travelTime, myAbsoluteSide) {
        const mageLocalSide = (mageData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const mageElement = this.getMageElement(
            mageLocalSide,
            mageData.position,
            mageData.creatureIndex
        );

        if (!mageElement) {
            console.warn('Skeleton Mage element not found on guest side for revenge ice');
            return;
        }

        // Find target element using absoluteSide mapping
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        let targetElement = null;
        
        if (targetData.type === 'hero') {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .battle-hero-card`
            );
            if (!targetElement) {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${targetData.position}-slot`
                );
            }
        } else if (targetData.type === 'creature' && targetData.creatureIndex !== null) {
            targetElement = document.querySelector(
                `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }

        if (targetElement) {
            const projectile = this.createIceProjectile(mageElement, targetElement);
            if (projectile) {
                this.activeProjectiles.add(projectile);
            }

            // Calculate speed-adjusted travel time
            const adjustedTravelTime = this.battleManager.getSpeedAdjustedDelay(travelTime);
            
            // Wait for projectile to reach target, then show impact
            await this.battleManager.delay(adjustedTravelTime);
            
            this.createIceImpactEffect(targetElement);
            this.removeProjectile(projectile);

            // Log result (but don't apply actual effect - host handles that)
            const targetName = targetData.type === 'hero' ? targetData.heroName : targetData.creatureName;
            this.battleManager.addCombatLog(
                `❄️ Vengeful ice strikes and freezes ${targetName}!`,
                'warning'
            );
        } else {
            console.warn(`Guest: Target element not found for revenge ice at ${targetLocalSide}-${targetData.position}`);
        }
    }
}

// Static helper methods
export const SkeletonMageHelpers = {
    // Check if any creature in a list is Skeleton Mage
    hasSkeletonMageInList(creatures) {
        return creatures.some(creature => SkeletonMageCreature.isSkeletonMage(creature.name));
    },

    // Get all Skeleton Mage creatures from a list
    getSkeletonMageFromList(creatures) {
        return creatures.filter(creature => SkeletonMageCreature.isSkeletonMage(creature.name));
    },

    // Add channeling visual effect to Skeleton Mage
    addChannelingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('mage-channeling');
        }
    },

    // Remove channeling visual effect from Skeleton Mage
    removeChannelingEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('mage-channeling');
        }
    }
};

export default SkeletonMageCreature;