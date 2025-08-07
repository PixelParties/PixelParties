// Artifacts/crusaderArtifacts.js - Crusader Artifacts with Combat Effects System

// List of all Crusaders artifacts
const CRUSADERS_ARTIFACTS = [
    'CrusadersArm-Cannon',
    'CrusadersCutlass', 
    'CrusadersFlintlock',
    'CrusadersHookshot'
];

class CrusaderArtifactsHandler {
    constructor() {
        this.heroSelection = null;
        this.battleManager = null;
        this.initialized = false;
        console.log('🛡️ CrusaderArtifactsHandler initialized');
    }

    // Initialize with hero selection reference
    init(heroSelection) {
        if (this.initialized) return;
        
        this.heroSelection = heroSelection;
        this.hookIntoTurnChanges();
        this.initialized = true;
        
        console.log('🛡️ Crusader Artifacts system hooked into turn changes');
    }

    // Initialize with battle manager for combat effects
    initBattleEffects(battleManager) {
        this.battleManager = battleManager;
        console.log('⚔️ Crusader Artifacts battle effects initialized');
    }

    // Apply all start-of-battle Crusader effects
    async applyStartOfBattleEffects() {
        if (!this.battleManager || !this.battleManager.isAuthoritative) {
            console.log('⚠️ Skipping Crusader effects - not authoritative or no battle manager');
            return;
        }

        console.log('💥 Applying Crusader Artifacts start-of-battle effects...');

        // Apply effects in order
        // Hookshot goes first to swap positions before damage effects
        await this.applyCrusadersHookshotEffect();
        
        await this.applyCrusadersArmCannonEffect();
        
        await this.applyCrusadersCutlassEffect();

        await this.applyCrusadersFlintlockEffect();

        console.log('✅ All Crusader Artifacts effects applied');
    }

    // ============================================
    // CRUSADERS HOOKSHOT IMPLEMENTATION
    // ============================================

    // Apply CrusadersHookshot start-of-battle effect
    async applyCrusadersHookshotEffect() {
        console.log('⚓ Checking CrusadersHookshot effects...');

        // Count CrusadersHookshot artifacts for both players
        const playerHookshotCount = this.countCrusaderArtifact('player', 'CrusadersHookshot');
        const opponentHookshotCount = this.countCrusaderArtifact('opponent', 'CrusadersHookshot');

        console.log(`⚓ Player has ${playerHookshotCount} CrusadersHookshot(s)`);
        console.log(`⚓ Opponent has ${opponentHookshotCount} CrusadersHookshot(s)`);

        // Apply swaps based on player's hookshots (swap opponent's heroes)
        if (playerHookshotCount > 0) {
            await this.applyHookshotSwaps('opponent', playerHookshotCount, 'player');
        }

        // Apply swaps based on opponent's hookshots (swap player's heroes)
        if (opponentHookshotCount > 0) {
            await this.applyHookshotSwaps('player', opponentHookshotCount, 'opponent');
        }
    }

    // Apply hookshot swaps to target side
    async applyHookshotSwaps(targetSide, hookshotCount, attackerSide) {
        const sideLabel = targetSide === 'player' ? 'Player' : 'Opponent';
        const attackerLabel = attackerSide === 'player' ? 'Player' : 'Opponent';
        
        console.log(`⚓ ${attackerLabel}'s Hookshots will swap ${sideLabel} heroes ${hookshotCount} time(s)`);

        // Get living heroes on target side
        const heroes = targetSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const livingPositions = [];
        ['left', 'center', 'right'].forEach(position => {
            if (heroes[position] && heroes[position].alive) {
                livingPositions.push(position);
            }
        });

        // Need at least 2 heroes to swap
        if (livingPositions.length < 2) {
            console.log(`⚓ Not enough living heroes to swap (only ${livingPositions.length} alive)`);
            this.battleManager.addCombatLog(
                `⚓ ${attackerLabel}'s Crusader Hookshot finds insufficient targets!`,
                'warning'
            );
            return;
        }

        // Log initial effect
        this.battleManager.addCombatLog(
            `⚓ ${attackerLabel}'s Crusader Hookshot activates! ${hookshotCount} chain(s) launch!`,
            'warning'
        );

        // Track which positions have been swapped to avoid double-swapping
        const swappedPairs = new Set();

        // Perform swaps
        for (let i = 0; i < hookshotCount; i++) {
            // Find a valid pair to swap
            let attempts = 0;
            let position1 = null;
            let position2 = null;
            
            while (attempts < 10) {
                // Randomly select two different positions
                const shuffled = [...livingPositions].sort(() => this.battleManager.getRandom() - 0.5);
                position1 = shuffled[0];
                position2 = shuffled[1];
                
                // Check if this pair hasn't been swapped yet
                const pairKey = [position1, position2].sort().join('-');
                if (!swappedPairs.has(pairKey)) {
                    swappedPairs.add(pairKey);
                    break;
                }
                
                attempts++;
            }

            if (position1 && position2 && position1 !== position2) {
                console.log(`⚓ Hookshot #${i + 1}: Swapping ${position1} ↔ ${position2}`);
                
                // Send swap data to guest for animation sync
                const swapData = {
                    targetSide: targetSide,
                    position1: position1,
                    position2: position2,
                    hookshotNumber: i + 1,
                    totalHookshots: hookshotCount,
                    attackerSide: attackerSide
                };
                
                this.battleManager.sendBattleUpdate('crusader_hookshot_swap', swapData);
                
                // Perform the swap with animation
                await this.performHookshotSwap(targetSide, position1, position2);
                
                // Log the swap
                const hero1Name = heroes[position2].name; // After swap
                const hero2Name = heroes[position1].name; // After swap
                this.battleManager.addCombatLog(
                    `⚓ Chains ensnare ${hero1Name} and ${hero2Name} - they swap positions!`,
                    targetSide === 'player' ? 'error' : 'success'
                );
                
                // Delay between multiple swaps
                if (i < hookshotCount - 1) {
                    await this.battleManager.delay(500);
                }
            }
        }
    }

    // Perform the actual hero swap with animation
    async performHookshotSwap(side, position1, position2) {
        // Get hero references
        const heroes = side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const hero1 = heroes[position1];
        const hero2 = heroes[position2];
        
        if (!hero1 || !hero2) {
            console.error(`⚓ Cannot swap - missing heroes at ${position1} or ${position2}`);
            return;
        }

        // Animate the chain effect
        await this.animateHookshotChains(side, position1, position2);
        
        // ===== SWAP IN HERO REFERENCES =====
        heroes[position1] = hero2;
        heroes[position2] = hero1;
        
        // Update hero position properties
        hero1.position = position2;
        hero2.position = position1;
        
        // ===== NEW: SWAP IN FORMATION DATA FOR PERSISTENCE =====
        const formation = side === 'player' ? 
            this.battleManager.playerFormation : 
            this.battleManager.opponentFormation;
        
        // Swap the formation data
        const tempFormationData = formation[position1];
        formation[position1] = formation[position2];
        formation[position2] = tempFormationData;
        
        console.log(`⚓ Updated formation - ${position1} now has ${formation[position1]?.name}, ${position2} now has ${formation[position2]?.name}`);
        
        // ===== ALSO UPDATE ABILITIES, SPELLBOOKS, CREATURES, AND EQUIPMENT DATA =====
        // These are stored separately and need to be swapped too
        if (side === 'player') {
            // Swap player abilities
            if (this.battleManager.playerAbilities) {
                const tempAbilities = this.battleManager.playerAbilities[position1];
                this.battleManager.playerAbilities[position1] = this.battleManager.playerAbilities[position2];
                this.battleManager.playerAbilities[position2] = tempAbilities;
            }
            
            // Swap player spellbooks
            if (this.battleManager.playerSpellbooks) {
                const tempSpellbooks = this.battleManager.playerSpellbooks[position1];
                this.battleManager.playerSpellbooks[position1] = this.battleManager.playerSpellbooks[position2];
                this.battleManager.playerSpellbooks[position2] = tempSpellbooks;
            }
            
            // Swap player creatures
            if (this.battleManager.playerCreatures) {
                const tempCreatures = this.battleManager.playerCreatures[position1];
                this.battleManager.playerCreatures[position1] = this.battleManager.playerCreatures[position2];
                this.battleManager.playerCreatures[position2] = tempCreatures;
            }
            
            // Swap player equipment
            if (this.battleManager.playerEquips) {
                const tempEquips = this.battleManager.playerEquips[position1];
                this.battleManager.playerEquips[position1] = this.battleManager.playerEquips[position2];
                this.battleManager.playerEquips[position2] = tempEquips;
            }
        } else {
            // Swap opponent abilities
            if (this.battleManager.opponentAbilities) {
                const tempAbilities = this.battleManager.opponentAbilities[position1];
                this.battleManager.opponentAbilities[position1] = this.battleManager.opponentAbilities[position2];
                this.battleManager.opponentAbilities[position2] = tempAbilities;
            }
            
            // Swap opponent spellbooks
            if (this.battleManager.opponentSpellbooks) {
                const tempSpellbooks = this.battleManager.opponentSpellbooks[position1];
                this.battleManager.opponentSpellbooks[position1] = this.battleManager.opponentSpellbooks[position2];
                this.battleManager.opponentSpellbooks[position2] = tempSpellbooks;
            }
            
            // Swap opponent creatures
            if (this.battleManager.opponentCreatures) {
                const tempCreatures = this.battleManager.opponentCreatures[position1];
                this.battleManager.opponentCreatures[position1] = this.battleManager.opponentCreatures[position2];
                this.battleManager.opponentCreatures[position2] = tempCreatures;
            }
            
            // Swap opponent equipment
            if (this.battleManager.opponentEquips) {
                const tempEquips = this.battleManager.opponentEquips[position1];
                this.battleManager.opponentEquips[position1] = this.battleManager.opponentEquips[position2];
                this.battleManager.opponentEquips[position2] = tempEquips;
            }
        }
        
        // ===== SWAP VISUAL ELEMENTS =====
        this.swapHeroVisuals(side, position1, position2);
        
        // ===== UPDATE DISPLAYS =====
        // Update any visual displays that depend on position
        this.battleManager.updateHeroHealthBar(side, position1, hero2.currentHp, hero2.maxHp);
        this.battleManager.updateHeroHealthBar(side, position2, hero1.currentHp, hero1.maxHp);
        this.battleManager.updateHeroAttackDisplay(side, position1, hero2);
        this.battleManager.updateHeroAttackDisplay(side, position2, hero1);
        
        // Update creature visuals
        this.battleManager.updateCreatureVisuals(side, position1, hero2.creatures);
        this.battleManager.updateCreatureVisuals(side, position2, hero1.creatures);
        
        // Update necromancy displays if applicable
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.updateNecromancyStackDisplay(side, position1, hero2.necromancyStacks);
            this.battleManager.necromancyManager.updateNecromancyStackDisplay(side, position2, hero1.necromancyStacks);
        }
        
        // ===== NEW: SAVE TO PERSISTENCE =====
        // Save the updated battle state with swapped formations
        if (this.battleManager.isAuthoritative) {
            await this.battleManager.saveBattleStateToPersistence();
            console.log(`⚓ Saved swapped positions to persistence`);
        }
        
        console.log(`⚓ Swapped ${hero1.name} to ${position2} and ${hero2.name} to ${position1} (including formations)`);
    }

    // Animate hookshot chains between two heroes
    async animateHookshotChains(side, position1, position2) {
        // Ensure CSS is loaded
        this.ensureHookshotAnimationCSS();
        
        // Get hero elements
        const heroElement1 = this.getHeroElement(side, position1);
        const heroElement2 = this.getHeroElement(side, position2);
        
        if (!heroElement1 || !heroElement2) {
            console.warn('⚠️ Could not find hero elements for hookshot animation');
            return;
        }

        // Get positions for chain animation
        const rect1 = heroElement1.getBoundingClientRect();
        const rect2 = heroElement2.getBoundingClientRect();
        
        // Create chain elements
        const chain1 = this.createChainElement(rect1, rect2, 'chain1');
        const chain2 = this.createChainElement(rect2, rect1, 'chain2');
        
        // Add chains to document
        document.body.appendChild(chain1);
        document.body.appendChild(chain2);
        
        // Create impact effects at both heroes
        this.createChainImpact(heroElement1);
        this.createChainImpact(heroElement2);
        
        // Sound effect placeholder
        // this.playChainSound();
        
        // Wait for impact
        await this.battleManager.delay(200);
        
        // Animate hero movement
        const movePromise1 = this.animateHeroMovement(heroElement1, rect1, rect2);
        const movePromise2 = this.animateHeroMovement(heroElement2, rect2, rect1);
        
        // Keep chains attached during movement
        this.animateChainMovement(chain1, rect1, rect2, 1000);
        this.animateChainMovement(chain2, rect2, rect1, 1000);
        
        // Wait for movement to complete
        await Promise.all([movePromise1, movePromise2]);
        
        // Remove chains with fade effect
        chain1.style.animation = 'chainFadeOut 0.3s ease-out forwards';
        chain2.style.animation = 'chainFadeOut 0.3s ease-out forwards';
        
        await this.battleManager.delay(300);
        
        // Clean up
        chain1.remove();
        chain2.remove();
    }

    // Create a chain element between two points
    createChainElement(fromRect, toRect, id) {
        const chain = document.createElement('div');
        chain.className = 'hookshot-chain';
        chain.id = `hookshot-${id}`;
        
        const centerX1 = fromRect.left + fromRect.width / 2;
        const centerY1 = fromRect.top + fromRect.height / 2;
        const centerX2 = toRect.left + toRect.width / 2;
        const centerY2 = toRect.top + toRect.height / 2;
        
        const length = Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
        const angle = Math.atan2(centerY2 - centerY1, centerX2 - centerX1) * 180 / Math.PI;
        
        chain.style.cssText = `
            position: fixed;
            left: ${centerX1}px;
            top: ${centerY1}px;
            width: ${length}px;
            height: 4px;
            background: linear-gradient(90deg, 
                #444 0%, #666 25%, #888 50%, #666 75%, #444 100%);
            border: 1px solid #222;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
            transform-origin: left center;
            transform: rotate(${angle}deg);
            z-index: 500;
            animation: chainAppear 0.2s ease-out;
        `;
        
        // Add chain link pattern
        chain.innerHTML = '<div class="chain-pattern"></div>';
        
        return chain;
    }

    // Create chain impact effect
    createChainImpact(heroElement) {
        const impact = document.createElement('div');
        impact.className = 'hookshot-impact';
        impact.innerHTML = '⚓';
        
        impact.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 36px;
            z-index: 600;
            pointer-events: none;
            animation: hookshotImpact 0.4s ease-out forwards;
            filter: drop-shadow(0 0 10px rgba(100, 100, 100, 0.8));
        `;
        
        heroElement.appendChild(impact);
        
        // Remove after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 400);
    }

    // Animate hero movement to new position
    async animateHeroMovement(heroElement, fromRect, toRect, duration = 1000) {
        const deltaX = toRect.left - fromRect.left;
        const deltaY = toRect.top - fromRect.top;
        
        // Apply transition and transform
        heroElement.style.transition = `transform ${duration}ms ease-in-out`;
        heroElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        heroElement.style.zIndex = '550';
        
        // Wait for animation
        await this.battleManager.delay(duration);
        
        // Reset transform (actual position swap happens separately)
        heroElement.style.transition = '';
        heroElement.style.transform = '';
        heroElement.style.zIndex = '';
    }

    // Animate chain movement to follow heroes
    animateChainMovement(chainElement, fromRect, toRect, duration) {
        let startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease in-out
            const eased = progress < 0.5 
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Interpolate positions
            const currentX1 = fromRect.left + (toRect.left - fromRect.left) * eased + fromRect.width / 2;
            const currentY1 = fromRect.top + (toRect.top - fromRect.top) * eased + fromRect.height / 2;
            const currentX2 = toRect.left + (fromRect.left - toRect.left) * eased + toRect.width / 2;
            const currentY2 = toRect.top + (fromRect.top - toRect.top) * eased + toRect.height / 2;
            
            const length = Math.sqrt(Math.pow(currentX2 - currentX1, 2) + Math.pow(currentY2 - currentY1, 2));
            const angle = Math.atan2(currentY2 - currentY1, currentX2 - currentX1) * 180 / Math.PI;
            
            chainElement.style.left = `${currentX1}px`;
            chainElement.style.top = `${currentY1}px`;
            chainElement.style.width = `${length}px`;
            chainElement.style.transform = `rotate(${angle}deg)`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Swap hero visual elements in the DOM
    swapHeroVisuals(side, position1, position2) {
        const slot1 = document.querySelector(`.${side}-slot.${position1}-slot`);
        const slot2 = document.querySelector(`.${side}-slot.${position2}-slot`);
        
        if (!slot1 || !slot2) {
            console.error('⚓ Could not find hero slots to swap visuals');
            return;
        }

        // Clone the inner content
        const content1 = slot1.innerHTML;
        const content2 = slot2.innerHTML;
        
        // Swap the content
        slot1.innerHTML = content2;
        slot2.innerHTML = content1;
        
        console.log(`⚓ Swapped visual content between ${position1} and ${position2}`);
    }

    // Get hero element helper
    getHeroElement(side, position) {
        return document.querySelector(`.${side}-slot.${position}-slot`);
    }

    // Handle guest hookshot swap animation
    handleGuestHookshotSwap(data) {
        console.log('⚓ Guest handling hookshot swap:', data);
        
        const { targetSide, position1, position2, hookshotNumber, totalHookshots, attackerSide } = data;
        
        // Log initial effect if first hookshot
        if (hookshotNumber === 1) {
            const attackerLabel = attackerSide === 'player' ? 'Player' : 'Opponent';
            this.battleManager.addCombatLog(
                `⚓ ${attackerLabel}'s Crusader Hookshot activates! ${totalHookshots} chain(s) launch!`,
                'warning'
            );
        }
        
        // Perform the swap on guest side
        this.performGuestHookshotSwap(targetSide, position1, position2, attackerSide);
    }

    // Perform hookshot swap on guest side
    async performGuestHookshotSwap(side, position1, position2, attackerSide) {
        // Convert absolute side to local side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetIsMyPlayer = (side === 'player' && this.battleManager.isHost) || 
                                 (side === 'opponent' && !this.battleManager.isHost);
        const localSide = targetIsMyPlayer ? 'player' : 'opponent';
        
        // Get hero references
        const heroes = localSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const hero1 = heroes[position1];
        const hero2 = heroes[position2];
        
        if (!hero1 || !hero2) {
            console.error(`⚓ GUEST: Cannot swap - missing heroes at ${position1} or ${position2}`);
            return;
        }

        // Log the swap
        this.battleManager.addCombatLog(
            `⚓ Chains ensnare ${hero1.name} and ${hero2.name} - they swap positions!`,
            localSide === 'player' ? 'error' : 'success'
        );

        // Animate the chain effect
        await this.animateHookshotChains(localSide, position1, position2);
        
        // Swap heroes in the data model
        heroes[position1] = hero2;
        heroes[position2] = hero1;
        
        // Update hero position properties
        hero1.position = position2;
        hero2.position = position1;
        
        // Swap visual elements
        this.swapHeroVisuals(localSide, position1, position2);
        
        // Update displays
        this.battleManager.updateHeroHealthBar(localSide, position1, hero2.currentHp, hero2.maxHp);
        this.battleManager.updateHeroHealthBar(localSide, position2, hero1.currentHp, hero1.maxHp);
        this.battleManager.updateHeroAttackDisplay(localSide, position1, hero2);
        this.battleManager.updateHeroAttackDisplay(localSide, position2, hero1);
        
        // Update creature visuals
        this.battleManager.updateCreatureVisuals(localSide, position1, hero2.creatures);
        this.battleManager.updateCreatureVisuals(localSide, position2, hero1.creatures);
        
        // Update necromancy displays if applicable
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.updateNecromancyStackDisplay(localSide, position1, hero2.necromancyStacks);
            this.battleManager.necromancyManager.updateNecromancyStackDisplay(localSide, position2, hero1.necromancyStacks);
        }
        
        console.log(`⚓ GUEST: Swapped ${hero1.name} to ${position2} and ${hero2.name} to ${position1}`);
    }

    // Ensure hookshot animation CSS
    ensureHookshotAnimationCSS() {
        if (document.getElementById('crusaderHookshotStyles')) return;

        const style = document.createElement('style');
        style.id = 'crusaderHookshotStyles';
        style.textContent = `
            @keyframes chainAppear {
                0% {
                    opacity: 0;
                    transform: rotate(var(--angle, 0deg)) scaleX(0);
                }
                100% {
                    opacity: 1;
                    transform: rotate(var(--angle, 0deg)) scaleX(1);
                }
            }
            
            @keyframes chainFadeOut {
                0% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                    filter: blur(4px);
                }
            }
            
            @keyframes hookshotImpact {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8) rotate(360deg);
                }
            }
            
            .hookshot-chain {
                will-change: transform, width, left, top;
                background-image: repeating-linear-gradient(
                    90deg,
                    #666 0px,
                    #888 2px,
                    #666 4px,
                    #444 6px,
                    #666 8px
                );
            }
            
            .chain-pattern {
                width: 100%;
                height: 100%;
                background: repeating-linear-gradient(
                    90deg,
                    transparent 0px,
                    rgba(255, 255, 255, 0.1) 4px,
                    transparent 8px
                );
            }
            
            .hookshot-impact {
                will-change: transform, opacity;
                color: #666;
                text-shadow: 
                    0 0 10px rgba(100, 100, 100, 0.8),
                    0 0 20px rgba(150, 150, 150, 0.6);
            }
        `;

        document.head.appendChild(style);
    }

    // ============================================
    // OTHER CRUSADER ARTIFACTS (EXISTING)
    // ============================================

    async applyCrusadersFlintlockEffect() {
        console.log('🔫 Checking CrusadersFlintlock effects...');

        // Process each side and position
        const sides = [
            { name: 'player', heroes: this.battleManager.playerHeroes },
            { name: 'opponent', heroes: this.battleManager.opponentHeroes }
        ];

        const flintlockAttacks = [];

        // Scan all heroes for CrusadersFlintlock
        for (const side of sides) {
            for (const position of ['left', 'center', 'right']) {
                const hero = side.heroes[position];
                if (!hero || !hero.alive) continue;

                const flintlockCount = hero.countEquipment('CrusadersFlintlock');

                if (flintlockCount > 0) {
                    // Find a random target hero (purely random among living enemies)
                    const target = this.findRandomTargetHero(position, side.name);

                    if (target) {
                        flintlockAttacks.push({
                            attacker: hero,
                            attackerPosition: position,
                            attackerSide: side.name,
                            target: target,
                            flintlockCount: flintlockCount,
                            damage: 50 * flintlockCount
                        });
                    } else {
                        console.log(`🔫 ${hero.name} has ${flintlockCount} Flintlock(s) but found no valid targets`);
                    }
                }
            }
        }

        if (flintlockAttacks.length === 0) {
            console.log('🔫 No CrusadersFlintlock attacks to execute');
            return;
        }

        // Execute all flintlock attacks
        console.log(`🔫 Executing ${flintlockAttacks.length} CrusadersFlintlock attacks...`);
        
        // Log the overall effect
        this.battleManager.addCombatLog(
            `🔫 Crusaders Flintlock fires! ${flintlockAttacks.length} targeted shot(s)!`, 
            'warning'
        );

        // Process each attack
        for (const attack of flintlockAttacks) {
            // Create flintlock attack data for network sync
            const flintlockData = {
                attackerInfo: {
                    name: attack.attacker.name,
                    position: attack.attackerPosition,
                    side: attack.attackerSide,
                    absoluteSide: attack.attacker.absoluteSide
                },
                targetInfo: this.getTargetSyncData(attack.target),
                damage: attack.damage,
                flintlockCount: attack.flintlockCount
            };

            // Send flintlock attack to guest for visual sync
            this.battleManager.sendBattleUpdate('crusader_flintlock_attack', flintlockData);

            // Create visual effect
            await this.createFlintlockAttackAnimation(attack);

            // Apply damage to target hero and all creatures
            await this.applyFlintlockDamage(attack);

            // Small delay between attacks
            await this.battleManager.delay(400);
        }

        console.log('✅ All CrusadersFlintlock attacks completed');
    }

    // Find a random target hero
    findRandomTargetHero(attackerPosition, attackerSide) {
        const enemySide = attackerSide === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        // Get all alive enemy heroes
        const aliveEnemyHeroes = [];
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive) {
                aliveEnemyHeroes.push({
                    hero: hero,
                    position: position,
                    side: enemySide
                });
            }
        });
        
        // If there are living heroes, pick one randomly
        if (aliveEnemyHeroes.length > 0) {
            const target = this.battleManager.getRandomChoice(aliveEnemyHeroes);
            console.log(`🎯 CrusadersFlintlock targeting random living hero: ${target.hero.name} at ${target.position}`);
            return target;
        }
        
        // No living heroes - no valid targets
        console.log(`🎯 CrusadersFlintlock found no living heroes to target!`);
        return null;
    }

    // Create flintlock attack animation
    async createFlintlockAttackAnimation(attack) {
        const targetElement = this.getTargetElement({
            type: 'hero',
            side: attack.target.side,
            position: attack.target.position
        });
        
        const attackerElement = this.getTargetElement({
            type: 'hero',
            side: attack.attackerSide,
            position: attack.attackerPosition
        });
        
        if (!targetElement || !attackerElement) {
            console.warn('⚠️ Could not find target or attacker element for flintlock animation');
            return;
        }

        // Ensure CSS is loaded
        this.ensureFlintlockAnimationCSS();

        // Calculate positions
        const attackerRect = attackerElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const startX = attackerRect.left + attackerRect.width / 2;
        const startY = attackerRect.top + attackerRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;

        // Create muzzle flash at attacker
        this.createMuzzleFlash(attackerElement);

        // Create bullet projectile
        const bullet = this.createBulletProjectile(startX, startY, endX, endY);
        
        // Animation timing
        const projectileTime = 200; // Fast bullet travel
        const impactTime = 300;     // Impact and damage application
        
        // Wait for bullet to reach target
        await this.battleManager.delay(projectileTime);
        
        // Remove bullet and create impact
        if (bullet && bullet.parentNode) {
            bullet.remove();
        }
        
        // Create impact effect
        this.createBulletImpact(targetElement);
        
        // Wait for impact effect
        await this.battleManager.delay(impactTime);
        
        // Return promise that resolves when animation completes
        return Promise.resolve();
    }

    createMuzzleFlash(attackerElement) {
        const muzzleFlash = document.createElement('div');
        muzzleFlash.className = 'crusader-muzzle-flash';
        muzzleFlash.innerHTML = '💥';
        
        muzzleFlash.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 32px;
            z-index: 650;
            pointer-events: none;
            animation: crusaderMuzzleFlash 300ms ease-out forwards;
            text-shadow: 
                0 0 20px rgba(255, 255, 0, 1),
                0 0 40px rgba(255, 200, 0, 0.8);
        `;
        
        attackerElement.appendChild(muzzleFlash);
        
        setTimeout(() => {
            if (muzzleFlash.parentNode) {
                muzzleFlash.remove();
            }
        }, 300);
    }

    createBulletProjectile(startX, startY, endX, endY) {
        const bullet = document.createElement('div');
        bullet.className = 'crusader-bullet';
        bullet.innerHTML = '●';
        
        bullet.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: 8px;
            color: #444;
            z-index: 600;
            pointer-events: none;
            transform: translate(-50%, -50%);
            animation: crusaderBulletTravel ${this.battleManager.getSpeedAdjustedDelay(200)}ms linear forwards;
            text-shadow: 0 0 4px rgba(68, 68, 68, 0.8);
        `;
        
        // Set CSS custom properties for target position
        bullet.style.setProperty('--target-x', `${endX}px`);
        bullet.style.setProperty('--target-y', `${endY}px`);
        
        document.body.appendChild(bullet);
        
        return bullet;
    }

    createBulletImpact(targetElement) {
        const impact = document.createElement('div');
        impact.className = 'crusader-bullet-impact';
        impact.innerHTML = '💥';
        
        impact.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            z-index: 650;
            pointer-events: none;
            animation: crusaderBulletImpact ${this.battleManager.getSpeedAdjustedDelay(300)}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(255, 100, 0, 1),
                0 0 30px rgba(255, 150, 0, 0.8);
        `;
        
        targetElement.appendChild(impact);
        
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 300);
    }

    // Apply flintlock damage to target hero and all creatures
    async applyFlintlockDamage(attack) {
        const { target, damage, attacker } = attack;
        
        if (!target || !target.hero) {
            console.warn('⚠️ Invalid target for flintlock damage');
            return;
        }

        // Apply damage to the target hero if it's alive
        if (target.hero.alive) {
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: damage,
                newHp: Math.max(0, target.hero.currentHp - damage),
                died: (target.hero.currentHp - damage) <= 0
            }, {
                source: 'crusader_flintlock',
                attacker: attacker
            });
            
            this.battleManager.addCombatLog(
                `🔫 ${attacker.name}'s Crusader Flintlock shoots ${target.hero.name} for ${damage} damage!`,
                target.hero.side === 'player' ? 'error' : 'success'
            );
        }

        // Apply damage to all living creatures of the target hero with small delays
        if (target.hero.creatures && target.hero.creatures.length > 0) {
            const damagePromises = [];
            
            target.hero.creatures.forEach((creature, index) => {
                if (creature.alive) {
                    const damagePromise = new Promise((resolve) => {
                        setTimeout(() => {
                            this.battleManager.authoritative_applyDamageToCreature({
                                hero: target.hero,
                                creature: creature,
                                creatureIndex: index,
                                damage: damage,
                                position: target.position,
                                side: target.side
                            }, {
                                source: 'crusader_flintlock',
                                attacker: attacker
                            });
                            
                            this.battleManager.addCombatLog(
                                `🔫 ${attacker.name}'s Crusader Flintlock shoots ${creature.name} for ${damage} damage!`,
                                target.side === 'player' ? 'error' : 'success'
                            );
                            
                            resolve();
                        }, this.battleManager.getSpeedAdjustedDelay(50 + index * 30));
                    });
                    damagePromises.push(damagePromise);
                }
            });
            
            // Wait for all creature damage to be applied
            await Promise.all(damagePromises);
        }
    }

    // Ensure flintlock animation CSS
    ensureFlintlockAnimationCSS() {
        if (document.getElementById('crusaderFlintlockStyles')) return;

        const style = document.createElement('style');
        style.id = 'crusaderFlintlockStyles';
        style.textContent = `
            @keyframes crusaderMuzzleFlash {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.5);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(2);
                }
            }
            
            @keyframes crusaderBulletTravel {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    left: var(--target-x);
                    top: var(--target-y);
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.2);
                }
            }
            
            @keyframes crusaderBulletImpact {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(120deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.8) rotate(360deg);
                }
            }
            
            .crusader-muzzle-flash {
                will-change: transform, opacity;
            }
            
            .crusader-bullet {
                will-change: transform, opacity;
                border-radius: 50%;
            }
            
            .crusader-bullet-impact {
                will-change: transform, opacity;
            }
        `;

        document.head.appendChild(style);
    }

    // Handle guest flintlock attack
    handleGuestFlintlockAttack(data) {
        console.log('🔫 Guest handling flintlock attack:', data);
        
        const { attackerInfo, targetInfo, damage, flintlockCount } = data;
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🔫 ${attackerInfo.name}'s Crusader Flintlock fires ${flintlockCount} shot(s) for ${damage} damage each!`,
            'warning'
        );

        // Create mock objects for guest-side animation
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const attackerLocalSide = (attackerInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetLocalSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const targetHeroes = targetLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const mockAttack = {
            attacker: {
                name: attackerInfo.name
            },
            attackerPosition: attackerInfo.position,
            attackerSide: attackerLocalSide,
            target: {
                hero: targetHeroes[targetInfo.position],
                position: targetInfo.position,
                side: targetLocalSide
            },
            flintlockCount: flintlockCount,
            damage: damage
        };
        
        // Play visual effects on guest side (no damage application)
        if (mockAttack.target.hero) {
            this.createFlintlockAttackAnimation(mockAttack);
        }
        
        console.log(`🔫 GUEST: ${attackerInfo.name} used Crusader Flintlock on ${targetInfo.name}`);
    }

    // Apply CrusadersArm-Cannon start-of-battle effect
    async applyCrusadersArmCannonEffect() {
        console.log('💥 Checking CrusadersArm-Cannon effects...');

        // Count CrusadersArm-Cannon artifacts for both players
        const playerCannonCount = this.countCrusaderArtifact('player', 'CrusadersArm-Cannon');
        const opponentCannonCount = this.countCrusaderArtifact('opponent', 'CrusadersArm-Cannon');

        console.log(`🔫 Player has ${playerCannonCount} CrusadersArm-Cannon(s)`);
        console.log(`🔫 Opponent has ${opponentCannonCount} CrusadersArm-Cannon(s)`);

        // Apply damage based on opponent's cannons (you take damage from opponent's cannons)
        if (opponentCannonCount > 0) {
            const damagePerCannon = 40;
            const totalDamage = damagePerCannon * opponentCannonCount;
            await this.applyCrusaderCannonBarrage('player', totalDamage, opponentCannonCount);
        }

        if (playerCannonCount > 0) {
            const damagePerCannon = 40;
            const totalDamage = damagePerCannon * playerCannonCount;
            await this.applyCrusaderCannonBarrage('opponent', totalDamage, playerCannonCount);
        }
    }

    async applyCrusadersCutlassEffect() {
        console.log('⚔️ Checking CrusadersCutlass effects...');

        // Process each side and position
        const sides = [
            { name: 'player', heroes: this.battleManager.playerHeroes },
            { name: 'opponent', heroes: this.battleManager.opponentHeroes }
        ];

        const cutlassAttacks = [];

        // Scan all heroes for CrusadersCutlass
        for (const side of sides) {
            for (const position of ['left', 'center', 'right']) {
                const hero = side.heroes[position];
                if (!hero || !hero.alive) continue;

                const cutlassCount = hero.countEquipment('CrusadersCutlass');

                if (cutlassCount > 0) {
                    // Find this hero's target using normal attack targeting
                    const target = this.battleManager.combatManager.authoritative_findTargetWithCreatures(position, side.name);

                    if (target) {
                        cutlassAttacks.push({
                            attacker: hero,
                            attackerPosition: position,
                            attackerSide: side.name,
                            target: target,
                            cutlassCount: cutlassCount,
                            damage: 50 * cutlassCount
                        });
                    }
                }
            }
        }

        if (cutlassAttacks.length === 0) {
            console.log('⚔️ No CrusadersCutlass attacks to execute');
            return;
        }

        // Execute all cutlass attacks
        console.log(`⚔️ Executing ${cutlassAttacks.length} CrusadersCutlass attacks...`);
        
        // Log the overall effect
        this.battleManager.addCombatLog(
            `⚔️ Crusaders Cutlass strikes! ${cutlassAttacks.length} targeted attack(s)!`, 
            'warning'
        );

        // Group attacks by target for silenced stacking
        const targetSilencedStacks = new Map();

        // Process each attack
        for (const attack of cutlassAttacks) {
            // Track silenced stacks for this target
            const targetKey = this.getTargetKey(attack.target);
            const currentStacks = targetSilencedStacks.get(targetKey) || 0;
            targetSilencedStacks.set(targetKey, currentStacks + attack.cutlassCount);

            // Create cutlass attack data for network sync
            const cutlassData = {
                attackerInfo: {
                    name: attack.attacker.name,
                    position: attack.attackerPosition,
                    side: attack.attackerSide,
                    absoluteSide: attack.attacker.absoluteSide
                },
                targetInfo: this.getTargetSyncData(attack.target),
                damage: attack.damage,
                cutlassCount: attack.cutlassCount
            };

            // Send cutlass attack to guest for visual sync
            this.battleManager.sendBattleUpdate('crusader_cutlass_attack', cutlassData);

            // Create visual effect
            await this.createCutlassAttackAnimation(attack);

            // Apply damage
            await this.applyCutlassDamage(attack);

            // Small delay between attacks
            await this.battleManager.delay(200);
        }

        // Apply silenced effects after all attacks
        for (const [targetKey, silencedStacks] of targetSilencedStacks) {
            const targetData = this.parseTargetKey(targetKey);
            const target = this.findTargetFromData(targetData);
            
            if (target && target.alive) {
                // Apply silenced status effect
                if (this.battleManager.statusEffectsManager) {
                    this.battleManager.statusEffectsManager.applyStatusEffect(target, 'silenced', silencedStacks);
                }

                this.battleManager.addCombatLog(
                    `🔇 ${target.name} is silenced for ${silencedStacks} turn(s) by Crusader Cutlass!`,
                    target.side === 'player' ? 'error' : 'success'
                );
            }
        }

        console.log('✅ All CrusadersCutlass attacks completed');
    }

    // Create a unique key for a target (for grouping attacks)
    getTargetKey(target) {
        if (target.type === 'hero') {
            return `hero-${target.side}-${target.position}`;
        } else if (target.type === 'creature') {
            // Find the creature index
            const creatureIndex = target.hero.creatures.indexOf(target.creature);
            return `creature-${target.side}-${target.position}-${creatureIndex}`;
        }
        return `unknown-${Date.now()}`;
    }

    // Parse a target key back to target data
    parseTargetKey(targetKey) {
        const parts = targetKey.split('-');
        if (parts[0] === 'hero') {
            return {
                type: 'hero',
                side: parts[1],
                position: parts[2]
            };
        } else if (parts[0] === 'creature') {
            return {
                type: 'creature',
                side: parts[1],
                position: parts[2],
                creatureIndex: parseInt(parts[3])
            };
        }
        return null;
    }

    // Get target sync data for network synchronization
    getTargetSyncData(target) {
        if (target.type === 'hero') {
            return {
                type: 'hero',
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                name: target.hero.name
            };
        } else if (target.type === 'creature') {
            // Find the creature index in the hero's creatures array
            const creatureIndex = target.hero.creatures.indexOf(target.creature);
            return {
                type: 'creature',
                absoluteSide: target.hero.absoluteSide,
                position: target.position,
                creatureIndex: creatureIndex,
                name: target.creature.name
            };
        }
        return null;
    }

    // Create vicious slash attack animation
    async createCutlassAttackAnimation(attack) {
        const targetElement = this.getTargetElement({
            type: attack.target.type,
            side: attack.target.side,
            position: attack.target.position,
            creatureIndex: attack.target.type === 'creature' ? 
                attack.target.hero.creatures.indexOf(attack.target.creature) : null
        });
        
        if (!targetElement) {
            console.warn('⚠️ Could not find target element for cutlass animation');
            return;
        }

        // Ensure CSS is loaded
        this.ensureCutlassAnimationCSS();

        // Create slash effect container
        const slashContainer = document.createElement('div');
        slashContainer.className = 'cutlass-slash-container';
        
        // Create multiple slash lines for a vicious effect
        const slashLines = ['⚔️', '🗡️', '💥'];
        
        for (let i = 0; i < 3; i++) {
            const slash = document.createElement('div');
            slash.className = 'cutlass-slash-line';
            slash.innerHTML = slashLines[i];
            
            // Vary the angle and timing for each slash
            const angle = -45 + (i * 30); // -45°, -15°, 15°
            const delay = i * 100;
            
            slash.style.cssText = `
                position: absolute;
                font-size: 28px;
                color: #ff4444;
                text-shadow: 0 0 10px rgba(255, 68, 68, 0.8);
                animation: cutlassSlash 600ms ease-out forwards;
                animation-delay: ${delay}ms;
                transform-origin: center;
                --slash-angle: ${angle}deg;
                opacity: 0;
            `;
            
            slashContainer.appendChild(slash);
        }
        
        // Position the container at target center
        slashContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 600;
        `;
        
        targetElement.appendChild(slashContainer);
        
        // Add screen flash effect
        this.createSlashFlashEffect(targetElement);
        
        // Clean up after animation
        setTimeout(() => {
            if (slashContainer.parentNode) {
                slashContainer.remove();
            }
        }, 900);
        
        // Return promise that resolves when animation completes
        return new Promise(resolve => {
            setTimeout(resolve, 900);
        });
    }

    // Create flash effect for slash
    createSlashFlashEffect(targetElement) {
        const flash = document.createElement('div');
        flash.className = 'cutlass-flash-effect';
        
        flash.style.cssText = `
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 60%);
            pointer-events: none;
            z-index: 590;
            opacity: 0;
            animation: cutlassFlash 200ms ease-out;
            border-radius: 10px;
        `;
        
        targetElement.appendChild(flash);
        
        setTimeout(() => {
            if (flash.parentNode) {
                flash.remove();
            }
        }, 200);
    }

    // Ensure cutlass animation CSS
    ensureCutlassAnimationCSS() {
        if (document.getElementById('crusaderCutlassStyles')) return;

        const style = document.createElement('style');
        style.id = 'crusaderCutlassStyles';
        style.textContent = `
            .cutlass-slash-container {
                overflow: visible;
            }
            
            .cutlass-slash-line {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(var(--slash-angle)) scale(0);
                filter: drop-shadow(0 0 8px rgba(255, 68, 68, 0.9));
                z-index: 601;
            }
            
            @keyframes cutlassSlash {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle)) scale(0) translateX(-100px);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle)) scale(1.5) translateX(-30px);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle)) scale(1.2) translateX(0px);
                }
                80% {
                    opacity: 0.8;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle)) scale(1) translateX(30px);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(var(--slash-angle)) scale(0.5) translateX(100px);
                }
            }
            
            @keyframes cutlassFlash {
                0% {
                    opacity: 0;
                    transform: scale(0.8);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.1);
                }
                100% {
                    opacity: 0;
                    transform: scale(1.2);
                }
            }
            
            .cutlass-flash-effect {
                mix-blend-mode: screen;
            }
        `;

        document.head.appendChild(style);
    }

    // Apply cutlass damage to target
    async applyCutlassDamage(attack) {
        const { target, cutlassCount, attacker } = attack;
        
        if (!target || !target.type) {
            console.warn('⚠️ Invalid target for cutlass damage');
            return;
        }

        // Calculate damage: 40 times the number of CrusadersCutlass on the attacking hero
        const actualDamage = 40 * cutlassCount;
        
        if (target.type === 'hero') {
            // Apply damage to hero
            this.battleManager.authoritative_applyDamage({
                target: target.hero,
                damage: actualDamage,
                newHp: Math.max(0, target.hero.currentHp - actualDamage),
                died: (target.hero.currentHp - actualDamage) <= 0
            }, {
                source: 'crusader_cutlass',
                attacker: attacker
            });
            
            this.battleManager.addCombatLog(
                `⚔️ ${attacker.name}'s Crusader Cutlass strikes ${target.hero.name} for ${actualDamage} damage!`,
                target.hero.side === 'player' ? 'error' : 'success'
            );
            
        } else if (target.type === 'creature') {
            // Find creature index
            const creatureIndex = target.hero.creatures.indexOf(target.creature);
            
            // Apply damage to creature
            this.battleManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: creatureIndex,
                damage: actualDamage,
                position: target.position,
                side: target.side
            }, {
                source: 'crusader_cutlass',
                attacker: attacker
            });
            
            this.battleManager.addCombatLog(
                `⚔️ ${attacker.name}'s Crusader Cutlass strikes ${target.creature.name} for ${actualDamage} damage!`,
                target.side === 'player' ? 'error' : 'success'
            );
        }
    }

    // Find target object from parsed target data
    findTargetFromData(targetData) {
        if (!targetData) return null;
        
        // Get the appropriate heroes collection based on side
        let heroes;
        if (targetData.side === 'player') {
            heroes = this.battleManager.playerHeroes;
        } else {
            heroes = this.battleManager.opponentHeroes;
        }
        
        const hero = heroes[targetData.position];
        if (!hero) return null;
        
        if (targetData.type === 'hero') {
            return hero;
        } else if (targetData.type === 'creature') {
            if (hero.creatures && targetData.creatureIndex < hero.creatures.length) {
                return hero.creatures[targetData.creatureIndex];
            }
        }
        
        return null;
    }

    // Count specific Crusader artifact for a side
    countCrusaderArtifact(side, artifactName) {
        let count = 0;
        
        // Get the appropriate heroes based on side
        let heroes;
        if (side === 'player') {
            heroes = this.battleManager.playerHeroes;
        } else {
            heroes = this.battleManager.opponentHeroes;
        }

        // Count artifacts across all hero positions
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.equipment && hero.equipment.length > 0) {
                hero.equipment.forEach(item => {
                    const itemName = item.name || item.cardName;
                    if (itemName === artifactName) {
                        count++;
                    }
                });
            }
        });

        return count;
    }

    // Apply cannon barrage to all targets on a side
    async applyCrusaderCannonBarrage(targetSide, totalDamage, cannonCount) {
        if (totalDamage <= 0) return;

        const sideLabel = targetSide === 'player' ? 'Player' : 'Opponent';
        console.log(`💥 Applying ${totalDamage} Crusader Cannon damage to all ${sideLabel} targets...`);

        // Log the effect
        this.battleManager.addCombatLog(
            `💥 Crusaders Arm-Cannon barrage! ${cannonCount} cannon(s) fire for ${totalDamage} damage each!`, 
            'warning'
        );

        // Get all targets (heroes and creatures)
        const targets = this.getAllTargetsOnSide(targetSide);
        
        if (targets.length === 0) {
            console.log('⚠️ No targets found for cannon barrage');
            return;
        }

        console.log(`🎯 Found ${targets.length} targets for cannon barrage`);

        // Create cannonball animation data for network sync
        const cannonballData = {
            targetSide: targetSide,
            damage: totalDamage,
            cannonCount: cannonCount,
            targets: targets.map(target => ({
                type: target.type,
                position: target.position,
                creatureIndex: target.creatureIndex || null,
                name: target.target.name
            }))
        };

        // Send cannonball effect to guest first (for animation sync)
        this.battleManager.sendBattleUpdate('crusader_cannon_barrage', cannonballData);

        // Start animations
        const animationPromise = this.createCannonballBarrageAnimation(targets, cannonCount);

        // Apply damage to all targets after a short delay (to sync with animation)
        await this.battleManager.delay(800); // Wait for cannonballs to "travel"

        // Apply damage to each target
        for (const targetData of targets) {
            await this.applyCannonDamageToTarget(targetData, totalDamage);
            await this.battleManager.delay(100); // Stagger damage slightly
        }

        // Wait for animations to complete
        await animationPromise;

        console.log('✅ Crusader Cannon barrage complete');
    }

    // Get all valid targets on a side (heroes + creatures)
    getAllTargetsOnSide(side) {
        const targets = [];
        let heroes;

        if (side === 'player') {
            heroes = this.battleManager.playerHeroes;
        } else {
            heroes = this.battleManager.opponentHeroes;
        }

        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive) {
                // Add the hero as a target
                targets.push({
                    type: 'hero',
                    position: position,
                    target: hero,
                    side: side
                });

                // Add all living creatures as targets
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            targets.push({
                                type: 'creature',
                                position: position,
                                creatureIndex: index,
                                target: creature,
                                hero: hero,
                                side: side
                            });
                        }
                    });
                }
            }
        });

        return targets;
    }

    // Apply cannon damage to a specific target
    async applyCannonDamageToTarget(targetData, damage) {
        const { type, target, side, position } = targetData;

        if (type === 'hero') {
            // Apply damage to hero
            this.battleManager.authoritative_applyDamage({
                target: target,
                damage: damage,
                newHp: Math.max(0, target.currentHp - damage),
                died: (target.currentHp - damage) <= 0
            }, {
                source: 'crusader_cannon',
                attacker: null
            });
        } else if (type === 'creature') {
            // Apply damage to creature
            this.battleManager.authoritative_applyDamageToCreature({
                hero: targetData.hero,
                creature: target,
                creatureIndex: targetData.creatureIndex,
                damage: damage,
                position: position,
                side: side
            }, {
                source: 'crusader_cannon',
                attacker: null
            });
        }
    }

    // Create cannonball barrage animation
    async createCannonballBarrageAnimation(targets, cannonCount) {
        console.log(`🎬 Creating cannonball animation for ${targets.length} targets with ${cannonCount} cannons`);
        
        // Ensure CSS is loaded
        this.ensureCannonballAnimationCSS();

        // Create cannonballs for each target
        const animationPromises = targets.map((targetData, index) => {
            // Stagger cannonball launches slightly
            const delay = index * 100;
            return new Promise(resolve => {
                setTimeout(() => {
                    this.createSingleCannonballAnimation(targetData).then(resolve);
                }, delay);
            });
        });

        // Wait for all cannonball animations to complete
        await Promise.all(animationPromises);
    }

    // Create single cannonball animation to a target
    async createSingleCannonballAnimation(targetData) {
        const targetElement = this.getTargetElement(targetData);
        if (!targetElement) {
            console.warn('⚠️ Could not find target element for cannonball animation');
            return;
        }

        // Create cannonball element
        const cannonball = document.createElement('div');
        cannonball.className = 'crusader-cannonball';
        cannonball.innerHTML = '💥';

        // Position cannonball off-screen (coming from opponent's side)
        const targetRect = targetElement.getBoundingClientRect();
        const startX = targetData.side === 'player' ? window.innerWidth + 100 : -100;
        const startY = Math.random() * 200 + 100; // Vary starting height
        const targetX = targetRect.left + (targetRect.width / 2);
        const targetY = targetRect.top + (targetRect.height / 2);

        cannonball.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: 24px;
            z-index: 1000;
            pointer-events: none;
            transform-origin: center;
            filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.8));
        `;

        document.body.appendChild(cannonball);

        // Create explosion effect at target
        const createExplosion = () => {
            const explosion = document.createElement('div');
            explosion.className = 'crusader-cannon-explosion';
            explosion.innerHTML = '💥';
            
            explosion.style.cssText = `
                position: fixed;
                left: ${targetX}px;
                top: ${targetY}px;
                font-size: 36px;
                z-index: 1001;
                pointer-events: none;
                transform: translate(-50%, -50%) scale(0);
                animation: crusaderExplosion 0.6s ease-out forwards;
                filter: drop-shadow(0 0 12px rgba(255, 50, 0, 1));
            `;

            document.body.appendChild(explosion);

            // Remove explosion after animation
            setTimeout(() => {
                if (explosion.parentNode) {
                    explosion.remove();
                }
            }, 600);

            // Screen shake effect
            this.createScreenShake();
        };

        // Animate cannonball to target
        const duration = 800;
        const startTime = Date.now();

        const animateCannonball = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for more realistic trajectory
            const easeInQuad = progress * progress;
            
            const currentX = startX + (targetX - startX) * progress;
            const currentY = startY + (targetY - startY) * easeInQuad;
            
            // Rotate cannonball as it flies
            const rotation = progress * 360 * 2;
            
            cannonball.style.left = `${currentX}px`;
            cannonball.style.top = `${currentY}px`;
            cannonball.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${1 + progress * 0.5})`;
            
            if (progress < 1) {
                requestAnimationFrame(animateCannonball);
            } else {
                // Cannonball reached target - create explosion
                createExplosion();
                
                // Remove cannonball
                if (cannonball.parentNode) {
                    cannonball.remove();
                }
            }
        };

        // Start animation
        requestAnimationFrame(animateCannonball);

        // Return promise that resolves when animation completes
        return new Promise(resolve => {
            setTimeout(resolve, duration + 600); // Include explosion time
        });
    }

    // Get target element for animation
    getTargetElement(targetData) {
        const { type, side, position, creatureIndex } = targetData;

        if (type === 'hero') {
            return document.querySelector(`.${side}-slot.${position}-slot`);
        } else if (type === 'creature') {
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }

        return null;
    }

    // Create screen shake effect
    createScreenShake() {
        const battleField = document.querySelector('.battle-field-container');
        if (battleField) {
            battleField.classList.add('screen-shake');
            setTimeout(() => {
                battleField.classList.remove('screen-shake');
            }, 500);
        }
    }

    // Handle guest cannonball animation
    handleGuestCannonBarrage(data) {
        console.log('🎬 Guest handling cannonball barrage animation:', data);
        
        const { targetSide, damage, cannonCount, targets } = data;
        
        // Log the effect for guest
        this.battleManager.addCombatLog(
            `💥 Crusaders Arm-Cannon barrage! ${cannonCount} cannon(s) fire for ${damage} damage each!`, 
            'warning'
        );

        // Convert target data back to target objects for animation
        const targetObjects = targets.map(targetInfo => {
            let targetElement = null;
            let target = null;

            if (targetInfo.type === 'hero') {
                const heroes = targetSide === 'player' ? 
                    this.battleManager.playerHeroes : 
                    this.battleManager.opponentHeroes;
                target = heroes[targetInfo.position];
                targetElement = this.getTargetElement({
                    type: 'hero',
                    side: targetSide,
                    position: targetInfo.position
                });
            } else if (targetInfo.type === 'creature') {
                const heroes = targetSide === 'player' ? 
                    this.battleManager.playerHeroes : 
                    this.battleManager.opponentHeroes;
                const hero = heroes[targetInfo.position];
                target = hero?.creatures?.[targetInfo.creatureIndex];
                targetElement = this.getTargetElement({
                    type: 'creature',
                    side: targetSide,
                    position: targetInfo.position,
                    creatureIndex: targetInfo.creatureIndex
                });
            }

            return {
                type: targetInfo.type,
                position: targetInfo.position,
                creatureIndex: targetInfo.creatureIndex,
                target: target,
                side: targetSide,
                element: targetElement
            };
        }).filter(t => t.target && t.element); // Filter out invalid targets

        // Create animation
        this.createCannonballBarrageAnimation(targetObjects, cannonCount);
    }

    // Ensure cannonball animation CSS
    ensureCannonballAnimationCSS() {
        if (document.getElementById('crusaderCannonballStyles')) return;

        const style = document.createElement('style');
        style.id = 'crusaderCannonballStyles';
        style.textContent = `
            .crusader-cannonball {
                transition: all 0.1s linear;
                text-shadow: 0 0 8px rgba(255, 100, 0, 0.9);
                animation: cannonballGlow 0.3s ease-in-out infinite alternate;
            }

            @keyframes cannonballGlow {
                from {
                    filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.8));
                    transform: translate(-50%, -50%) scale(1);
                }
                to {
                    filter: drop-shadow(0 0 12px rgba(255, 150, 0, 1));
                    transform: translate(-50%, -50%) scale(1.1);
                }
            }

            @keyframes crusaderExplosion {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(2) rotate(360deg);
                    opacity: 0;
                }
            }

            .screen-shake {
                animation: screenShake 0.5s ease-in-out;
            }

            @keyframes screenShake {
                0%, 100% { transform: translateX(0); }
                10% { transform: translateX(-5px) translateY(2px); }
                20% { transform: translateX(5px) translateY(-2px); }
                30% { transform: translateX(-5px) translateY(2px); }
                40% { transform: translateX(5px) translateY(-2px); }
                50% { transform: translateX(-3px) translateY(1px); }
                60% { transform: translateX(3px) translateY(-1px); }
                70% { transform: translateX(-3px) translateY(1px); }
                80% { transform: translateX(3px) translateY(-1px); }
                90% { transform: translateX(-1px) translateY(0px); }
            }

            .crusader-cannon-explosion {
                animation: crusaderExplosion 0.6s ease-out forwards;
            }
        `;

        document.head.appendChild(style);
    }

    // Hook into the turn change system (existing functionality)
    hookIntoTurnChanges() {
        if (!this.heroSelection || !this.heroSelection.onTurnChange) {
            console.error('❌ Cannot hook into turn changes - heroSelection not available');
            return;
        }

        // Store the original onTurnChange method
        const originalOnTurnChange = this.heroSelection.onTurnChange.bind(this.heroSelection);
        
        // Override it to include our crusader artifacts handling
        this.heroSelection.onTurnChange = (turnChangeData) => {
            // Call the original method first
            originalOnTurnChange(turnChangeData);
            
            // Then handle our crusader artifacts transformation
            this.handleCrusaderArtifactsTransformation();
        };
    }

    // Main handler for crusader artifacts transformation (existing functionality)
    async handleCrusaderArtifactsTransformation() {
        if (!this.heroSelection || !this.heroSelection.heroEquipmentManager) {
            console.error('❌ Equipment manager not available for crusader transformation');
            return;
        }

        const equipmentManager = this.heroSelection.heroEquipmentManager;
        const positions = ['left', 'center', 'right'];
        const transformations = [];

        // Scan all hero positions for crusader artifacts
        for (const position of positions) {
            const equipment = equipmentManager.getHeroEquipment(position);
            
            console.log(`🔍 Scanning ${position} hero equipment:`, equipment.map(e => e.name || e.cardName));
            
            for (let i = 0; i < equipment.length; i++) {
                const item = equipment[i];
                const itemName = item.name || item.cardName;
                
                if (CRUSADERS_ARTIFACTS.includes(itemName)) {
                    // Found a crusader artifact - prepare transformation
                    const newArtifact = this.getRandomDifferentCrusaderArtifact(itemName);
                    transformations.push({
                        position,
                        index: i,
                        oldArtifact: itemName,
                        newArtifact
                    });
                    console.log(`📋 Planned transformation: ${itemName} (index ${i}) → ${newArtifact} on ${position} hero`);
                }
            }
        }

        // Execute all transformations
        if (transformations.length > 0) {
            console.log(`🛡️ Transforming ${transformations.length} Crusader artifacts`);
            
            // Collect affected positions for animation
            const affectedPositions = [...new Set(transformations.map(t => t.position))];
            
            // IMPORTANT: Sort transformations by position and index in REVERSE order
            // This prevents index shifting issues when removing multiple items
            transformations.sort((a, b) => {
                if (a.position !== b.position) {
                    // Sort positions: right, center, left (arbitrary but consistent)
                    const posOrder = { right: 0, center: 1, left: 2 };
                    return posOrder[a.position] - posOrder[b.position];
                }
                // Within same position, sort by index descending (highest first)
                return b.index - a.index;
            });
            
            // Execute transformations silently (without individual animations)
            for (const transformation of transformations) {
                await this.executeCrusaderTransformationSilent(transformation);
            }
            
            // Debug: Final summary of all transformations
            console.log('🛡️ CRUSADER TRANSFORMATION SUMMARY:');
            transformations.forEach((t, i) => {
                console.log(`  ${i + 1}. ${t.position} hero: ${t.oldArtifact} → ${t.newArtifact}`);
            });
            
            // Play single unified animation for all transformations
            await this.playCrusaderTransformationAnimation(affectedPositions);
            
            // Save game state after all transformations
            if (this.heroSelection.saveGameState) {
                await this.heroSelection.saveGameState();
            }
        }
    }

    // Get a random different crusader artifact (existing functionality)
    getRandomDifferentCrusaderArtifact(currentArtifact) {
        const otherArtifacts = CRUSADERS_ARTIFACTS.filter(artifact => artifact !== currentArtifact);
        const randomIndex = Math.floor(Math.random() * otherArtifacts.length);
        return otherArtifacts[randomIndex];
    }

    // Execute a single crusader transformation silently (existing functionality)
    async executeCrusaderTransformationSilent(transformation) {
        const { position, index, oldArtifact, newArtifact } = transformation;
        const equipmentManager = this.heroSelection.heroEquipmentManager;

        try {
            // Debug: show current equipment before removal
            const beforeEquipment = equipmentManager.getHeroEquipment(position);
            console.log(`🔄 Before removing index ${index} from ${position}:`, beforeEquipment.map(e => e.name || e.cardName));
            
            // Remove the old artifact
            const removedItem = equipmentManager.removeArtifactFromHero(position, index);
            if (!removedItem) {
                console.error(`❌ Failed to remove ${oldArtifact} from ${position} hero at index ${index}`);
                return;
            }

            console.log(`🗑️ Successfully removed: ${removedItem.name || removedItem.cardName} from ${position} at index ${index}`);

            // Add the new artifact (without cost)
            const success = await this.addCrusaderArtifactWithoutCost(position, newArtifact);
            if (!success) {
                console.error(`❌ Failed to add ${newArtifact} to ${position} hero`);
                // Try to restore the old artifact
                equipmentManager.heroEquipment[position].splice(index, 0, removedItem);
                return;
            }

            // Debug: show final equipment after addition
            const afterEquipment = equipmentManager.getHeroEquipment(position);
            console.log(`✅ After adding ${newArtifact} to ${position}:`, afterEquipment.map(e => e.name || e.cardName));
            console.log(`🔄 Transformation complete: ${oldArtifact} → ${newArtifact} on ${position} hero`);

        } catch (error) {
            console.error(`❌ Error during crusader transformation:`, error);
        }
    }

    // Add crusader artifact without charging gold cost (existing functionality)
    async addCrusaderArtifactWithoutCost(heroPosition, artifactCardName) {
        const equipmentManager = this.heroSelection.heroEquipmentManager;
        
        // Check if there's a hero at this position
        const formation = this.heroSelection.formationManager.getBattleFormation();
        const hero = formation[heroPosition];
        if (!hero) {
            return false;
        }

        // Get artifact info
        const cardInfo = this.heroSelection.getCardInfo(artifactCardName);
        if (!cardInfo) {
            return false;
        }

        // Create equipment entry (without charging cost)
        const equipmentEntry = {
            name: artifactCardName,
            cardName: artifactCardName,
            cost: cardInfo.cost || 0,
            image: cardInfo.image || `./Cards/All/${artifactCardName}.png`,
            equippedAt: Date.now(),
            crusaderTransformed: true // Mark as transformed
        };

        // Add to equipment
        equipmentManager.heroEquipment[heroPosition].push(equipmentEntry);

        // Trigger callback
        if (equipmentManager.onEquipmentChangeCallback) {
            equipmentManager.onEquipmentChangeCallback({
                type: 'crusader_transformed',
                heroPosition,
                artifactName: artifactCardName,
                hero: hero
            });
        }

        return true;
    }

    // Play unified transformation animation for all affected heroes (existing functionality)
    async playCrusaderTransformationAnimation(affectedPositions) {
        const heroSlots = [];
        
        // Find all affected hero slot elements
        for (const position of affectedPositions) {
            const heroSlot = document.querySelector(`.team-slot[data-position="${position}"]`);
            if (heroSlot) {
                heroSlots.push({ element: heroSlot, position });
            }
        }
        
        if (heroSlots.length === 0) {
            console.warn('⚠️ No hero slots found for crusader transformation animation');
            return;
        }

        // Add styles if not already present
        this.ensureCrusaderAnimationStyles();

        // Create animation effects for each affected hero
        const animationPromises = heroSlots.map(({ element, position }) => 
            this.createCrusaderEffectForHero(element, position)
        );

        // Wait for all animations to complete
        await Promise.all(animationPromises);
    }

    // Create crusader transformation effect for a single hero (existing functionality)
    async createCrusaderEffectForHero(heroSlot, position) {
        // Create glow overlay
        const glowOverlay = document.createElement('div');
        glowOverlay.className = 'crusader-glow-overlay';
        
        // Create sparkle container
        const sparkleContainer = document.createElement('div');
        sparkleContainer.className = 'crusader-sparkle-container';
        
        // Generate sparkles
        const sparkleSymbols = ['⚔️', '🛡️', '✨', '⭐', '🔥', '💫'];
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'crusader-sparkle';
            sparkle.textContent = sparkleSymbols[Math.floor(Math.random() * sparkleSymbols.length)];
            sparkle.style.animationDelay = `${i * 0.1}s`;
            sparkleContainer.appendChild(sparkle);
        }

        // Position and add overlays
        heroSlot.style.position = 'relative';
        heroSlot.appendChild(glowOverlay);
        heroSlot.appendChild(sparkleContainer);

        // Add glow effect to hero slot
        heroSlot.classList.add('crusader-transforming');

        // Remove effects after animation
        setTimeout(() => {
            if (glowOverlay.parentNode) glowOverlay.remove();
            if (sparkleContainer.parentNode) sparkleContainer.remove();
            heroSlot.classList.remove('crusader-transforming');
        }, 1200);

        // Return promise that resolves when animation completes
        return new Promise(resolve => {
            setTimeout(resolve, 1200);
        });
    }

    // Format artifact name for display (existing functionality)
    formatArtifactName(artifactName) {
        return artifactName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace('Crusaders ', '')
            .trim();
    }

    // Ensure CSS styles are loaded (existing functionality enhanced)
    ensureCrusaderAnimationStyles() {
        if (document.getElementById('crusaderTransformationStyles')) return;

        const style = document.createElement('style');
        style.id = 'crusaderTransformationStyles';
        style.textContent = `
            /* Hero slot transformation effects */
            .crusader-transforming {
                animation: crusaderHeroGlow 1.2s ease-out;
                transform-origin: center;
            }

            .crusader-glow-overlay {
                position: absolute;
                top: -5px;
                left: -5px;
                right: -5px;
                bottom: -5px;
                background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
                border-radius: 20px;
                opacity: 0;
                animation: crusaderGlow 1.2s ease-out;
                pointer-events: none;
                z-index: 99;
            }

            .crusader-sparkle-container {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 100;
            }

            .crusader-sparkle {
                position: absolute;
                font-size: 18px;
                opacity: 0;
                animation: crusaderSparkleFloat 1.2s ease-out;
                pointer-events: none;
                text-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
            }

            /* Distribute sparkles around the hero slot */
            .crusader-sparkle:nth-child(1) { top: 10%; left: 10%; animation-delay: 0s; }
            .crusader-sparkle:nth-child(2) { top: 10%; right: 10%; animation-delay: 0.1s; }
            .crusader-sparkle:nth-child(3) { top: 50%; left: -5%; animation-delay: 0.2s; }
            .crusader-sparkle:nth-child(4) { top: 50%; right: -5%; animation-delay: 0.3s; }
            .crusader-sparkle:nth-child(5) { bottom: 10%; left: 10%; animation-delay: 0.4s; }
            .crusader-sparkle:nth-child(6) { bottom: 10%; right: 10%; animation-delay: 0.5s; }
            .crusader-sparkle:nth-child(7) { top: 30%; left: 50%; transform: translateX(-50%); animation-delay: 0.6s; }
            .crusader-sparkle:nth-child(8) { bottom: 30%; left: 50%; transform: translateX(-50%); animation-delay: 0.7s; }

            /* Animations */
            @keyframes crusaderHeroGlow {
                0% { 
                    box-shadow: 0 0 0 rgba(255, 215, 0, 0);
                    border-color: transparent;
                }
                30% { 
                    box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4);
                    border-color: rgba(255, 215, 0, 0.6);
                }
                70% { 
                    box-shadow: 0 0 25px rgba(255, 215, 0, 0.6), 0 0 50px rgba(255, 215, 0, 0.3);
                    border-color: rgba(255, 215, 0, 0.4);
                }
                100% { 
                    box-shadow: 0 0 0 rgba(255, 215, 0, 0);
                    border-color: transparent;
                }
            }

            @keyframes crusaderGlow {
                0% { opacity: 0; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1.05); }
                100% { opacity: 0; transform: scale(1.1); }
            }

            @keyframes crusaderSparkleFloat {
                0% { 
                    opacity: 0; 
                    transform: translateY(0) rotate(0deg) scale(0.5); 
                }
                20% { 
                    opacity: 1; 
                    transform: translateY(-10px) rotate(90deg) scale(1.2); 
                }
                50% { 
                    opacity: 1; 
                    transform: translateY(-25px) rotate(180deg) scale(1); 
                }
                80% { 
                    opacity: 1; 
                    transform: translateY(-15px) rotate(270deg) scale(1.1); 
                }
                100% { 
                    opacity: 0; 
                    transform: translateY(-30px) rotate(360deg) scale(0.8); 
                }
            }

            /* Add subtle pulse to equipment area during transformation */
            .crusader-transforming .equipment-display {
                animation: crusaderEquipmentPulse 1.2s ease-out;
            }

            @keyframes crusaderEquipmentPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
            }
        `;

        document.head.appendChild(style);
    }

    // Utility methods for external access (existing functionality)

    // Check if an artifact is a crusader artifact
    isCrusaderArtifact(artifactName) {
        return CRUSADERS_ARTIFACTS.includes(artifactName);
    }

    // Get all crusader artifacts currently equipped
    getAllEquippedCrusaderArtifacts() {
        if (!this.heroSelection || !this.heroSelection.heroEquipmentManager) {
            return [];
        }

        const equipmentManager = this.heroSelection.heroEquipmentManager;
        const positions = ['left', 'center', 'right'];
        const crusaderArtifacts = [];

        for (const position of positions) {
            const equipment = equipmentManager.getHeroEquipment(position);
            
            equipment.forEach((item, index) => {
                const itemName = item.name || item.cardName;
                if (CRUSADERS_ARTIFACTS.includes(itemName)) {
                    crusaderArtifacts.push({
                        position,
                        index,
                        artifact: itemName
                    });
                }
            });
        }

        return crusaderArtifacts;
    }

    // Get transformation statistics
    getTransformationStats() {
        const equipped = this.getAllEquippedCrusaderArtifacts();
        return {
            totalEquipped: equipped.length,
            byPosition: {
                left: equipped.filter(item => item.position === 'left').length,
                center: equipped.filter(item => item.position === 'center').length,
                right: equipped.filter(item => item.position === 'right').length
            },
            artifacts: equipped.map(item => item.artifact)
        };
    }

    // Reset/cleanup method
    reset() {
        this.battleManager = null;
        this.initialized = false;
        console.log('🛡️ CrusaderArtifactsHandler reset');
    }
}

// Create and export the handler instance
const crusaderArtifactsHandler = new CrusaderArtifactsHandler();

// Export as crusaderArtifactsArtifact to match the naming convention expected by artifactHandler
export const crusaderArtifactsArtifact = crusaderArtifactsHandler;

// Also export the handler directly for easier access
export { crusaderArtifactsHandler };

// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.crusaderArtifactsHandler = crusaderArtifactsHandler;
}
