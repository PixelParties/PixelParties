// ./Creatures/skeletonKingSkullmael.js - Skeleton King Skullmael Creature Module
// Spawns random level 1 skeleton creatures for all ally heroes when it takes its turn

import { getCardInfo } from '../cardDatabase.js';

export class SkeletonKingSkullmaelCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeSkeletonEffects = new Set(); // Track active skeleton summoning effects
        
        // Level 1 skeleton creatures that can be spawned
        this.LEVEL_1_SKELETONS = [
            'SkeletonArcher',
            'SkeletonBard', 
            'SkeletonReaper',
            'BurningSkeleton'
        ];
        
        // Inject CSS styles for summoning animations (reuse BoulderInABottle styles)
        this.injectSkeletonSummoningStyles();
        
        console.log('👑 Skeleton King Skullmael Creature module initialized');
    }

    // Check if a creature is Skeleton King Skullmael
    static isSkeletonKingSkullmael(creatureName) {
        return creatureName === 'SkeletonKingSkullmael';
    }

    // Execute Skeleton King Skullmael special attack - spawn skeletons for all allies
    async executeSpecialAttack(skullmaelActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const skullmaelCreature = skullmaelActor.data;
        const skullmaelHero = skullmaelActor.hero;
        const attackerSide = skullmaelHero.side;
        
        // Safety check: ensure Skeleton King Skullmael is still alive
        if (!skullmaelCreature.alive || skullmaelCreature.currentHp <= 0) {
            console.log(`Skeleton King Skullmael is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `👑💀 ${skullmaelCreature.name} raises his royal scepter, summoning skeleton minions!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find all ally heroes (same side as Skullmael)
        const allyHeroes = this.findAllAllyHeroes(attackerSide);
        
        if (allyHeroes.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${skullmaelCreature.name} finds no allies to summon skeletons for!`, 
                'info'
            );
            return;
        }

        // Generate random skeletons for each ally
        const skeletonSummons = allyHeroes.map(hero => ({
            hero: hero,
            skeletonType: this.getRandomLevel1Skeleton()
        }));

        this.battleManager.addCombatLog(
            `👑 Skeleton King summons ${skeletonSummons.length} skeleton minions for his allies!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Send synchronization data to guest BEFORE starting host animation
        this.sendSkeletonSummonUpdate(skullmaelActor, skeletonSummons, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute skeleton summoning with visual effects
        await this.executeSkeletonSummoning(skullmaelActor, skeletonSummons, position);
    }

    // Find all ally heroes on the same side
    findAllAllyHeroes(attackerSide) {
        const allyHeroes = attackerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const livingAllies = [];
        
        Object.keys(allyHeroes).forEach(position => {
            const hero = allyHeroes[position];
            if (hero && hero.alive) {
                livingAllies.push({
                    hero: hero,
                    position: position,
                    side: attackerSide
                });
            }
        });
        
        return livingAllies;
    }

    // Get a random level 1 skeleton creature
    getRandomLevel1Skeleton() {
        const randomIndex = this.battleManager.getRandomInt(0, this.LEVEL_1_SKELETONS.length - 1);
        return this.LEVEL_1_SKELETONS[randomIndex];
    }

    // Execute the skeleton summoning with visual effects
    async executeSkeletonSummoning(skullmaelActor, skeletonSummons, position) {
        const attackerSide = skullmaelActor.hero.side;
        
        // FIRST: Create all skeletons
        skeletonSummons.forEach((summon) => {
            this.createSkeletonForHero(summon.hero.hero, summon.skeletonType, this.battleManager.currentTurn);
            
            this.battleManager.addCombatLog(
                `💀 ${summon.skeletonType} rises to serve ${summon.hero.hero.name}!`, 
                attackerSide === 'player' ? 'success' : 'error'
            );
        });

        // SECOND: Update displays so DOM elements exist
        if (this.battleManager.battleScreen && typeof this.battleManager.battleScreen.renderCreaturesAfterInit === 'function') {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
        }

        // Update necromancy displays if applicable
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.initializeNecromancyStackDisplays();
        }

        // THIRD: Now play animations (DOM elements should exist)
        const summonPromises = [];
        skeletonSummons.forEach((summon, index) => {
            summonPromises.push(this.playSkeletonSummoningEffect(summon.hero, summon.skeletonType, index));
        });

        // Wait for all summoning animations to complete
        await Promise.all(summonPromises);

        this.battleManager.addCombatLog(
            `👑✨ Skeleton King Skullmael's summoning ritual complete!`, 
            'info'
        );
    }

    // Create a skeleton creature for a specific hero
    createSkeletonForHero(hero, skeletonType, currentTurn) {
        // Get skeleton card info from database
        const skeletonInfo = getCardInfo(skeletonType);
        if (!skeletonInfo) {
            console.error(`Could not find skeleton info for: ${skeletonType}`);
            return;
        }

        // Apply Summoning Magic bonus if the hero has it
        let hpMultiplier = 1.0;
        if (hero.hasAbility && hero.hasAbility('SummoningMagic')) {
            const summoningMagicLevel = hero.getAbilityStackCount('SummoningMagic');
            hpMultiplier = 1 + (0.25 * summoningMagicLevel);
        }

        const finalHp = Math.floor(skeletonInfo.hp * hpMultiplier);

        // Create skeleton creature with full properties
        const skeleton = {
            name: skeletonType,
            image: `./Creatures/${skeletonType}.png`,
            currentHp: finalHp,
            maxHp: finalHp,
            atk: skeletonInfo.atk || 0,
            alive: true,
            type: 'creature',
            addedAt: Date.now(),
            statusEffects: [],
            temporaryModifiers: {},
            isSkeletonMinion: true, // Special flag to identify skeletons spawned by Skullmael
            createdFromSkullmael: true,
            creationTurn: currentTurn,
            physicalAttack: skeletonInfo.physicalAttack !== false // Default to true unless explicitly false
        };

        // Add skeleton to the FRONT of the hero's creatures array
        hero.creatures.unshift(skeleton);

        console.log(`💀 ${skeletonType} created for ${hero.name} with ${finalHp} HP (Turn ${currentTurn})`);
    }

    // Play skeleton summoning animation for a hero
    async playSkeletonSummoningEffect(allyHeroData, skeletonType, delayIndex) {
        // Add staggered delay for visual appeal
        const staggerDelay = delayIndex * 200;
        await this.battleManager.delay(staggerDelay);

        // Add small delay to ensure DOM is fully updated (like TheRootOfAllEvil does)
        await this.battleManager.delay(100);

        // Find the skeleton creature element (should be the first creature since we unshift it)
        const skeletonElement = document.querySelector(
            `.${allyHeroData.side}-slot.${allyHeroData.position}-slot .creature-icon[data-creature-index="0"]`
        );
        
        if (!skeletonElement) {
            console.warn(`Could not find skeleton element for summoning effect`);
            return;
        }

        // Create summoning circle overlay with skeleton-specific styling
        const summoningEffect = document.createElement('div');
        summoningEffect.className = 'skeleton-summoning-effect';
        summoningEffect.innerHTML = `
            <div class="summoning-circle skeleton-circle"></div>
            <div class="summoning-particles">
                ${Array.from({length: 8}, (_, i) => 
                    `<div class="summon-particle skeleton-particle particle-${i + 1}"></div>`
                ).join('')}
            </div>
            <div class="skeleton-type-indicator">${skeletonType.replace('Skeleton', '')}</div>
        `;
        
        // Position it over the skeleton
        skeletonElement.style.position = 'relative';
        skeletonElement.appendChild(summoningEffect);
        
        // Remove effect after animation completes
        setTimeout(() => {
            if (summoningEffect.parentNode) {
                summoningEffect.parentNode.removeChild(summoningEffect);
            }
        }, 1200); // Extended animation duration for skeleton summoning
    }

    // Send skeleton summon data to guest for synchronization
    sendSkeletonSummonUpdate(skullmaelActor, skeletonSummons, position) {
        const attackerSide = skullmaelActor.hero.side;
        
        // Convert summons to sync-friendly format
        const summonsData = skeletonSummons.map(summon => ({
            heroPosition: summon.hero.position,
            heroName: summon.hero.hero.name,
            skeletonType: summon.skeletonType,
            absoluteSide: summon.hero.hero.absoluteSide
        }));

        this.battleManager.sendBattleUpdate('skeleton_king_skullmael_summon', {
            skullmaelData: {
                side: attackerSide,
                position: position,
                creatureIndex: skullmaelActor.index,
                name: skullmaelActor.data.name,
                absoluteSide: skullmaelActor.hero.absoluteSide
            },
            summons: summonsData,
            currentTurn: this.battleManager.currentTurn
        });
    }

    // Handle skeleton summoning on guest side
    async handleGuestSkeletonSummon(data) {
        const { skullmaelData, summons, currentTurn } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const skullmaelLocalSide = (skullmaelData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `👑💀 ${skullmaelData.name} raises his royal scepter, summoning skeleton minions!`, 
            skullmaelLocalSide === 'player' ? 'success' : 'error'
        );

        this.battleManager.addCombatLog(
            `👑 Skeleton King summons ${summons.length} skeleton minions for his allies!`, 
            skullmaelLocalSide === 'player' ? 'success' : 'error'
        );

        // Process each summon on guest side
        const summonPromises = [];
        
        summons.forEach((summonData, index) => {
            const heroLocalSide = (summonData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            const heroes = heroLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[summonData.heroPosition];
            
            if (hero) {
                // Create skeleton for guest
                this.createSkeletonForHero(hero, summonData.skeletonType, currentTurn);
                
                // Play summoning animation
                const allyHeroData = {
                    hero: hero,
                    position: summonData.heroPosition,
                    side: heroLocalSide
                };
                summonPromises.push(this.playSkeletonSummoningEffect(allyHeroData, summonData.skeletonType, index));
                
                this.battleManager.addCombatLog(
                    `💀 ${summonData.skeletonType} rises to serve ${summonData.heroName}!`, 
                    heroLocalSide === 'player' ? 'success' : 'error'
                );
            }
        });

        // Wait for all summoning animations to complete
        await Promise.all(summonPromises);

        this.battleManager.addCombatLog(
            `👑✨ Skeleton King Skullmael's summoning ritual complete!`, 
            'info'
        );
    }

    // Execute permanent skeleton spawn when Skeleton King Skullmael dies
    async executeDeathSkeletonSpawn(skullmaelCreature, heroOwner, position, side) {
        if (!this.battleManager.isAuthoritative) return;
        
        this.battleManager.addCombatLog(
            `👑💀 ${skullmaelCreature.name}'s dying will summons a permanent guardian!`, 
            side === 'player' ? 'success' : 'error'
        );

        // Get a random skeleton type
        const skeletonType = this.getRandomLevel1Skeleton();
        
        // Send synchronization data to guest BEFORE creating skeleton
        this.sendDeathSkeletonSpawnUpdate(skullmaelCreature, heroOwner, skeletonType, position, side);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Create the PERMANENT skeleton
        this.createPermanentSkeletonForHero(heroOwner, skeletonType, this.battleManager.currentTurn);
        
        this.battleManager.addCombatLog(
            `🛡️ A permanent ${skeletonType} rises to guard ${heroOwner.name}!`, 
            side === 'player' ? 'success' : 'error'
        );

        // Update displays so DOM elements exist
        if (this.battleManager.battleScreen && typeof this.battleManager.battleScreen.renderCreaturesAfterInit === 'function') {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
        }

        // Update necromancy displays if applicable
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.initializeNecromancyStackDisplays();
        }

        // Play summoning animation
        const allyHeroData = {
            hero: heroOwner,
            position: position,
            side: side
        };
        
        await this.playSkeletonSummoningEffect(allyHeroData, skeletonType, 0);
    }

    // Create a PERMANENT skeleton creature for a specific hero (no cleanup flags)
    createPermanentSkeletonForHero(hero, skeletonType, currentTurn) {
        // Get skeleton card info from database
        const skeletonInfo = getCardInfo(skeletonType);
        if (!skeletonInfo) {
            console.error(`Could not find skeleton info for: ${skeletonType}`);
            return;
        }

        // Apply Summoning Magic bonus if the hero has it
        let hpMultiplier = 1.0;
        if (hero.hasAbility && hero.hasAbility('SummoningMagic')) {
            const summoningMagicLevel = hero.getAbilityStackCount('SummoningMagic');
            hpMultiplier = 1 + (0.25 * summoningMagicLevel);
        }

        const finalHp = Math.floor(skeletonInfo.hp * hpMultiplier);

        // Create PERMANENT skeleton creature (NO temporary flags)
        const skeleton = {
            name: skeletonType,
            image: `./Creatures/${skeletonType}.png`,
            currentHp: finalHp,
            maxHp: finalHp,
            atk: skeletonInfo.atk || 0,
            alive: true,
            type: 'creature',
            addedAt: Date.now(),
            statusEffects: [],
            temporaryModifiers: {},
            // NOTE: NO isSkeletonMinion or createdFromSkullmael flags - this makes it permanent
            permanentSkeletonGuardian: true, // Optional: flag to identify these special skeletons
            creationTurn: currentTurn,
            physicalAttack: skeletonInfo.physicalAttack !== false
        };

        // Add skeleton to the FRONT of the hero's creatures array (in front as requested)
        hero.creatures.unshift(skeleton);

        console.log(`👑 PERMANENT ${skeletonType} created for ${hero.name} with ${finalHp} HP (Turn ${currentTurn})`);
    }

    // Send death skeleton spawn data to guest for synchronization
    sendDeathSkeletonSpawnUpdate(skullmaelCreature, heroOwner, skeletonType, position, side) {
        this.battleManager.sendBattleUpdate('skeleton_king_death_spawn', {
            skullmaelData: {
                side: side,
                position: position,
                name: skullmaelCreature.name,
                absoluteSide: heroOwner.absoluteSide
            },
            heroData: {
                heroPosition: position,
                heroName: heroOwner.name,
                absoluteSide: heroOwner.absoluteSide
            },
            skeletonType: skeletonType,
            currentTurn: this.battleManager.currentTurn
        });
    }

    // Handle death skeleton spawn on guest side
    async handleGuestDeathSkeletonSpawn(data) {
        const { skullmaelData, heroData, skeletonType, currentTurn } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const skullmaelLocalSide = (skullmaelData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const heroLocalSide = (heroData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `👑💀 ${skullmaelData.name}'s dying will summons a permanent guardian!`, 
            skullmaelLocalSide === 'player' ? 'success' : 'error'
        );

        // Find the target hero
        const heroes = heroLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[heroData.heroPosition];
        
        if (hero) {
            // Create PERMANENT skeleton for guest
            this.createPermanentSkeletonForHero(hero, skeletonType, currentTurn);
            
            this.battleManager.addCombatLog(
                `🛡️ A permanent ${skeletonType} rises to guard ${heroData.heroName}!`, 
                heroLocalSide === 'player' ? 'success' : 'error'
            );

            // Play summoning animation
            const allyHeroData = {
                hero: hero,
                position: heroData.heroPosition,
                side: heroLocalSide
            };
            
            await this.playSkeletonSummoningEffect(allyHeroData, skeletonType, 0);
            
            this.battleManager.addCombatLog(
                `👑✨ ${skullmaelData.name}'s final gift is complete!`, 
                'info'
            );
        }
    }

    // Check if a creature is a temporary Skullmael skeleton (for cleanup)
    static isTemporarySkullmaelSkeleton(creature) {
        return creature && (creature.isSkeletonMinion || creature.createdFromSkullmael);
    }

    // Check if a creature is a permanent Skullmael skeleton guardian
    static isPermanentSkullmaelSkeleton(creature) {
        return creature && creature.permanentSkeletonGuardian === true;
    }

    // Get count of permanent Skullmael skeleton guardians for a hero
    static getPermanentSkullmaelSkeletonCount(hero) {
        if (!hero || !hero.creatures) {
            return 0;
        }
        
        return hero.creatures.filter(creature => this.isPermanentSkullmaelSkeleton(creature)).length;
    }

    // Collect all permanent guardian skeletons from battle for transfer to formation
    static collectPermanentGuardiansFromBattle(battleManager) {
        if (!battleManager) {
            return [];
        }

        const permanentGuardians = [];
        
        // Check all heroes from both sides
        const allHeroes = [
            ...Object.entries(battleManager.playerHeroes || {}),
            ...Object.entries(battleManager.opponentHeroes || {})
        ];

        for (const [position, hero] of allHeroes) {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                const guardians = hero.creatures.filter(creature => 
                    this.isPermanentSkullmaelSkeleton(creature)
                );
                
                if (guardians.length > 0) {
                    permanentGuardians.push({
                        heroPosition: position,
                        heroSide: hero.side,
                        heroAbsoluteSide: hero.absoluteSide,
                        heroName: hero.name,
                        guardians: guardians.map(guardian => ({
                            name: guardian.name,
                            currentHp: guardian.currentHp,
                            maxHp: guardian.maxHp,
                            atk: guardian.atk,
                            alive: guardian.alive,
                            type: 'creature',
                            addedAt: guardian.addedAt,
                            statusEffects: [],
                            temporaryModifiers: {},
                            permanentSkeletonGuardian: true,
                            creationTurn: guardian.creationTurn,
                            physicalAttack: guardian.physicalAttack
                        }))
                    });
                }
            }
        }

        return permanentGuardians;
    }

    // Transfer permanent guardians to formation screen
    static transferPermanentGuardiansToFormation(permanentGuardians, heroSelection) {
        if (!permanentGuardians || permanentGuardians.length === 0 || !heroSelection) {
            return 0;
        }

        let guardiansTransferred = 0;
        const myAbsoluteSide = heroSelection.isHost ? 'host' : 'guest';

        for (const guardianData of permanentGuardians) {
            // Only transfer guardians for this player (not opponent's guardians)
            if (guardianData.heroAbsoluteSide === myAbsoluteSide) {
                const heroPosition = guardianData.heroPosition;
                
                // Add each guardian to the hero's creatures in formation
                for (const guardian of guardianData.guardians) {
                    const success = heroSelection.heroCreatureManager.addCreatureToHero(
                        heroPosition, 
                        guardian.name,
                        guardian // Pass the full guardian data
                    );
                    
                    if (success) {
                        guardiansTransferred++;
                        console.log(`👑 Permanent ${guardian.name} guardian transferred to ${guardianData.heroName} in formation`);
                    }
                }
            }
        }

        if (guardiansTransferred > 0) {
            console.log(`👑 Transferred ${guardiansTransferred} permanent Skeleton King guardians to formation`);
            
            // Update UI to show the new creatures
            if (typeof window !== 'undefined' && window.updateHeroSelectionUI) {
                setTimeout(() => {
                    window.updateHeroSelectionUI();
                }, 100);
            }
        }

        return guardiansTransferred;
    }

    // Inject CSS styles for skeleton summoning (extends boulder summoning styles)
    injectSkeletonSummoningStyles() {
        if (document.getElementById('skeletonSummoningStyles')) {
            return; // Already injected
        }
        
        const style = document.createElement('style');
        style.id = 'skeletonSummoningStyles';
        style.textContent = `
            /* Skeleton King Summoning Effects */
            .skeleton-summoning-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }

            /* Enhanced Skeleton Summoning Circle */
            .summoning-circle.skeleton-circle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 45px;
                height: 45px;
                border: 3px solid rgba(138, 43, 226, 0.9);
                border-radius: 50%;
                box-shadow: 
                    0 0 15px rgba(138, 43, 226, 0.8),
                    inset 0 0 12px rgba(138, 43, 226, 0.4),
                    0 0 25px rgba(75, 0, 130, 0.6);
                animation: skeletonSummonCircleAppear 1.2s ease-out;
            }

            /* Enhanced Skeleton Particles */
            .summon-particle.skeleton-particle {
                position: absolute;
                width: 4px;
                height: 4px;
                background: linear-gradient(45deg, #8a2be2, #4b0082);
                border-radius: 50%;
                box-shadow: 0 0 6px rgba(138, 43, 226, 0.9);
                animation: skeletonSummonParticle 1.2s ease-out;
            }

            /* Skeleton Type Indicator */
            .skeleton-type-indicator {
                position: absolute;
                top: -15px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 8px;
                font-weight: bold;
                color: #8a2be2;
                text-shadow: 0 0 4px rgba(138, 43, 226, 0.8);
                animation: skeletonTypeIndicator 1.2s ease-out;
                background: rgba(0, 0, 0, 0.7);
                padding: 2px 4px;
                border-radius: 3px;
                border: 1px solid rgba(138, 43, 226, 0.5);
            }

            /* Enhanced Keyframe Animations */
            @keyframes skeletonSummonCircleAppear {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                    border-color: rgba(138, 43, 226, 0);
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.3);
                    opacity: 1;
                    border-color: rgba(138, 43, 226, 1);
                    box-shadow: 
                        0 0 20px rgba(138, 43, 226, 1),
                        inset 0 0 15px rgba(138, 43, 226, 0.6),
                        0 0 35px rgba(75, 0, 130, 0.8);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                    border-color: rgba(138, 43, 226, 0);
                }
            }

            @keyframes skeletonSummonParticle {
                0% {
                    transform: scale(0) translateY(15px);
                    opacity: 0;
                }
                25% {
                    transform: scale(2) translateY(5px);
                    opacity: 1;
                    box-shadow: 0 0 12px rgba(138, 43, 226, 1);
                }
                75% {
                    transform: scale(1.2) translateY(-10px);
                    opacity: 1;
                }
                100% {
                    transform: scale(0) translateY(-25px);
                    opacity: 0;
                }
            }

            @keyframes skeletonTypeIndicator {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(5px) scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0) scale(1.1);
                }
                70% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-5px) scale(0.8);
                }
            }

            /* Enhanced skeleton glow during summoning */
            .skeleton-summoning-effect + .creature-sprite-container .creature-sprite {
                filter: brightness(1.4) drop-shadow(0 0 10px rgba(138, 43, 226, 0.7));
                animation: skeletonSummonGlow 1.2s ease-out;
            }

            @keyframes skeletonSummonGlow {
                0% {
                    filter: brightness(1.4) drop-shadow(0 0 10px rgba(138, 43, 226, 0.7));
                }
                50% {
                    filter: brightness(1.8) drop-shadow(0 0 18px rgba(138, 43, 226, 1));
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(138, 43, 226, 0));
                }
            }

            /* Extended particle positions for more skeletons */
            .skeleton-particle.particle-7 {
                top: 30%;
                left: 15%;
                animation-delay: 0.6s;
            }
            .skeleton-particle.particle-8 {
                top: 70%;
                left: 85%;
                animation-delay: 0.7s;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Static method to clean up all Skullmael skeletons after battle ends
    static cleanupSkullmaelSkeletonsAfterBattle(battleManager) {
        if (!battleManager) {
            return 0;
        }

        // Get all heroes from both sides
        const allHeroes = [
            ...Object.values(battleManager.playerHeroes || {}),
            ...Object.values(battleManager.opponentHeroes || {})
        ];

        let skeletonsRemoved = 0;
        
        for (const hero of allHeroes) {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                const originalLength = hero.creatures.length;
                
                // Filter out all skeletons created by Skullmael
                hero.creatures = hero.creatures.filter(creature => 
                    !creature.isSkeletonMinion && !creature.createdFromSkullmael
                );
                
                const removed = originalLength - hero.creatures.length;
                skeletonsRemoved += removed;
                
                if (removed > 0) {
                    console.log(`💀 Removed ${removed} Skullmael skeleton(s) from ${hero.name}`);
                }
            }
        }

        if (skeletonsRemoved > 0) {
            console.log(`🧹 Total: Removed ${skeletonsRemoved} Skullmael skeletons after battle ended`);
        }

        return skeletonsRemoved;
    }

    // Check if a creature is a Skullmael skeleton
    static isSkullmaelSkeleton(creature) {
        return creature && (creature.isSkeletonMinion || creature.createdFromSkullmael);
    }

    // Get Skullmael skeleton count for a hero
    static getSkullmaelSkeletonCount(hero) {
        if (!hero || !hero.creatures) {
            return 0;
        }
        
        return hero.creatures.filter(creature => this.isSkullmaelSkeleton(creature)).length;
    }

    // Clean up active skeleton effects (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up ${this.activeSkeletonEffects.size} active Skeleton King Skullmael effects`);
        
        this.activeSkeletonEffects.forEach(effect => {
            try {
                if (effect && effect.parentNode) {
                    effect.remove();
                }
            } catch (error) {
                console.warn('Error removing skeleton summoning effect during cleanup:', error);
            }
        });
        
        this.activeSkeletonEffects.clear();

        // Also remove any orphaned skeleton summoning elements
        try {
            const orphanedEffects = document.querySelectorAll('.skeleton-summoning-effect');
            orphanedEffects.forEach(effect => {
                if (effect.parentNode) {
                    effect.remove();
                }
            });
            
            if (orphanedEffects.length > 0) {
                console.log(`Cleaned up ${orphanedEffects.length} orphaned Skeleton King summoning effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned skeleton summoning effects:', error);
        }
    }
}

// Static helper methods
export const SkeletonKingSkullmaelHelpers = {
    // Check if any creature in a list is Skeleton King Skullmael
    hasSkeletonKingSkullmaelInList(creatures) {
        return creatures.some(creature => SkeletonKingSkullmaelCreature.isSkeletonKingSkullmael(creature.name));
    },

    // Get all Skeleton King Skullmael creatures from a list
    getSkeletonKingSkullmaelFromList(creatures) {
        return creatures.filter(creature => SkeletonKingSkullmaelCreature.isSkeletonKingSkullmael(creature.name));
    },

    // Add royal glow effect to Skeleton King Skullmael
    addRoyalGlowEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.add('skeleton-king-glowing');
        }
    },

    // Remove royal glow effect from Skeleton King Skullmael
    removeRoyalGlowEffect(creatureElement) {
        if (creatureElement) {
            creatureElement.classList.remove('skeleton-king-glowing');
        }
    }
};

export default SkeletonKingSkullmaelCreature;