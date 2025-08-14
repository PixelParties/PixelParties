// ./Abilities/diplomacy.js - Diplomacy Ability Implementation with P2P Sync
// At battle start, steal random enemy creatures equal to Diplomacy stack count

export class DiplomacyManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.stolenCreatures = new Set(); // Track creatures that have been stolen this battle
        this.diplomacyThefts = new Map(); // Track who stole what for logging
    }

    /**
     * Apply all Diplomacy effects at battle start
     * Called from battleFlowManager.js after other start-of-battle effects
     */
    async applyDiplomacyEffects() {
        if (!this.battleManager.isAuthoritative) {
            return; // Only host processes Diplomacy effects
        }

        console.log('🤝 Processing Diplomacy effects at battle start...');
        
        // Inject visual effect CSS
        this.injectDiplomacyAnimationCSS();
        
        // Get all heroes that have Diplomacy ability
        const diplomacyHeroes = this.findHeroesWithDiplomacy();
        
        if (diplomacyHeroes.length === 0) {
            console.log('🤝 No heroes with Diplomacy found');
            return;
        }

        console.log(`🤝 Found ${diplomacyHeroes.length} heroes with Diplomacy ability`);
        
        // Collect all diplomacy operations before executing them
        const allDiplomacyOperations = [];
        
        // Process each Diplomacy hero in order
        for (const diplomacyHero of diplomacyHeroes) {
            const operations = await this.processDiplomacyForHero(diplomacyHero);
            allDiplomacyOperations.push(...operations);
            
            // Small delay between each hero's diplomacy for visual clarity
            await this.battleManager.delay(300);
        }
        
        // Send all diplomacy operations to guest in one update
        if (allDiplomacyOperations.length > 0) {
            this.battleManager.sendBattleUpdate('diplomacy_effects_complete', {
                operations: allDiplomacyOperations,
                timestamp: Date.now()
            });
            
            // Wait for guest acknowledgment
            try {
                await this.battleManager.waitForGuestAcknowledgment('diplomacy_complete', 1000);
                console.log('🤝 Guest acknowledged diplomacy effects');
            } catch (error) {
                console.warn('🤝 Guest did not acknowledge diplomacy effects:', error);
            }
        }
        
        // Summary log
        if (this.diplomacyThefts.size > 0) {
            this.battleManager.addCombatLog(
                `🤝 Diplomacy effects complete! ${this.stolenCreatures.size} creatures recruited`,
                'info'
            );
        }
    }

    /**
     * Find all heroes that have the Diplomacy ability
     * @returns {Array} Array of hero objects with their diplomacy info
     */
    findHeroesWithDiplomacy() {
        const diplomacyHeroes = [];
        
        // Check all heroes from both sides
        const allHeroes = [
            ...Object.values(this.battleManager.playerHeroes || {}),
            ...Object.values(this.battleManager.opponentHeroes || {})
        ];
        
        for (const hero of allHeroes) {
            if (hero && hero.alive && hero.hasAbility && hero.hasAbility('Diplomacy')) {
                const diplomacyStacks = hero.getAbilityStackCount('Diplomacy');
                if (diplomacyStacks > 0) {
                    diplomacyHeroes.push({
                        hero: hero,
                        stacks: diplomacyStacks,
                        side: hero.side,
                        position: hero.position
                    });
                }
            }
        }
        
        return diplomacyHeroes;
    }

    /**
     * Process Diplomacy effect for a single hero
     * @param {Object} diplomacyHero - Hero info object with diplomacy stacks
     * @returns {Array} Array of diplomacy operations performed
     */
    async processDiplomacyForHero(diplomacyHero) {
        const { hero, stacks, side, position } = diplomacyHero;
        
        console.log(`🤝 Processing Diplomacy for ${hero.name} (${stacks} stacks)`);
        
        // Get all eligible enemy creatures (not already stolen)
        const eligibleTargets = this.getEligibleEnemyCreatures(hero);
        
        if (eligibleTargets.length === 0) {
            this.battleManager.addCombatLog(
                `🤝 ${hero.name}'s Diplomacy finds no creatures to recruit`,
                side === 'player' ? 'info' : 'info'
            );
            return [];
        }
        
        // Determine how many creatures to steal (min of stacks and available targets)
        const creaturesToSteal = Math.min(stacks, eligibleTargets.length);
        
        // Randomly select creatures to steal
        const selectedTargets = this.battleManager.getRandomChoices(eligibleTargets, creaturesToSteal);
        
        console.log(`🤝 ${hero.name} will recruit ${selectedTargets.length} creatures`);
        
        const operations = [];
        
        // Steal each selected creature
        for (const target of selectedTargets) {
            const operation = await this.stealCreature(hero, target);
            if (operation) {
                operations.push(operation);
            }
            
            // Small delay between each theft for visual effect
            await this.battleManager.delay(200);
        }
        
        // Log the diplomacy action
        const logType = side === 'player' ? 'success' : 'error';
        this.battleManager.addCombatLog(
            `🤝 ${hero.name} recruits ${selectedTargets.length} enemy creature(s) through Diplomacy!`,
            logType
        );
        
        return operations;
    }

    /**
     * Get all enemy creatures that can be stolen by diplomacy
     * @param {Object} diplomacyHero - Hero using diplomacy
     * @returns {Array} Array of stealable creature targets
     */
    getEligibleEnemyCreatures(diplomacyHero) {
        const eligibleTargets = [];
        
        // Determine enemy heroes based on diplomacy hero's side
        const enemyHeroes = diplomacyHero.side === 'player' ? 
            Object.values(this.battleManager.opponentHeroes) : 
            Object.values(this.battleManager.playerHeroes);
        
        // Collect all living enemy creatures that haven't been stolen yet
        for (const enemyHero of enemyHeroes) {
            if (enemyHero && enemyHero.alive && enemyHero.creatures) {
                for (let i = 0; i < enemyHero.creatures.length; i++) {
                    const creature = enemyHero.creatures[i];
                    
                    if (creature && creature.alive && !this.isCreatureStolen(creature)) {
                        eligibleTargets.push({
                            creature: creature,
                            ownerHero: enemyHero,
                            creatureIndex: i
                        });
                    }
                }
            }
        }
        
        return eligibleTargets;
    }

    /**
     * Check if a creature has already been stolen this battle
     * @param {Object} creature - Creature to check
     * @returns {boolean} True if already stolen
     */
    isCreatureStolen(creature) {
        // Create a unique identifier for the creature
        const creatureId = `${creature.name}_${creature.addedAt || Date.now()}_${Math.random()}`;
        
        // If creature doesn't have an ID yet, assign one
        if (!creature.diplomacyId) {
            creature.diplomacyId = creatureId;
        }
        
        return this.stolenCreatures.has(creature.diplomacyId);
    }

    /**
     * Mark a creature as stolen
     * @param {Object} creature - Creature to mark
     */
    markCreatureAsStolen(creature) {
        if (!creature.diplomacyId) {
            creature.diplomacyId = `${creature.name}_${creature.addedAt || Date.now()}_${Math.random()}`;
        }
        
        this.stolenCreatures.add(creature.diplomacyId);
        creature.stolenByDiplomacy = true;
    }

    /**
     * Steal a creature from enemy to diplomacy hero
     * @param {Object} diplomacyHero - Hero using diplomacy
     * @param {Object} target - Target info (creature, ownerHero, creatureIndex)
     * @returns {Object} Operation details for guest sync
     */
    async stealCreature(diplomacyHero, target) {
        const { creature, ownerHero, creatureIndex } = target;
        
        console.log(`🤝 ${diplomacyHero.name} recruiting ${creature.name} from ${ownerHero.name}`);
        
        // Mark creature as stolen to prevent re-stealing
        this.markCreatureAsStolen(creature);
        
        // Remove creature from original owner
        const stolenCreature = ownerHero.creatures.splice(creatureIndex, 1)[0];
        
        // Add special properties to track diplomacy recruitment
        stolenCreature.recruitedByDiplomacy = true;
        stolenCreature.originalOwner = ownerHero.name;
        stolenCreature.recruitedAt = Date.now();
        
        // Add creature to diplomacy hero's army
        diplomacyHero.creatures.push(stolenCreature);
        
        // Update necromancy stacks if applicable
        if (diplomacyHero.hasAbility('Necromancy')) {
            const necromancyStacks = diplomacyHero.getAbilityStackCount('Necromancy');
            diplomacyHero.maxNecromancyStacks = necromancyStacks + diplomacyHero.creatures.filter(c => c.alive).length;
        }
        
        // Track this theft for logging
        if (!this.diplomacyThefts.has(diplomacyHero.name)) {
            this.diplomacyThefts.set(diplomacyHero.name, []);
        }
        this.diplomacyThefts.get(diplomacyHero.name).push({
            creature: creature.name,
            from: ownerHero.name
        });
        
        // Play recruitment animation
        this.playRecruitmentAnimation(diplomacyHero, stolenCreature);
        
        console.log(`🤝 ${creature.name} successfully recruited by ${diplomacyHero.name}`);
        
        // Return operation details for guest synchronization
        return {
            type: 'creature_stolen',
            diplomatHero: {
                absoluteSide: diplomacyHero.absoluteSide,
                position: diplomacyHero.position,
                name: diplomacyHero.name
            },
            originalOwner: {
                absoluteSide: ownerHero.absoluteSide,
                position: ownerHero.position,
                name: ownerHero.name
            },
            creature: {
                name: stolenCreature.name,
                currentHp: stolenCreature.currentHp,
                maxHp: stolenCreature.maxHp,
                atk: stolenCreature.atk,
                alive: stolenCreature.alive,
                diplomacyId: stolenCreature.diplomacyId,
                recruitedByDiplomacy: true,
                originalOwner: ownerHero.name,
                recruitedAt: stolenCreature.recruitedAt
            },
            originalIndex: creatureIndex,
            timestamp: Date.now()
        };
    }

    /**
     * Handle guest processing of diplomacy effects
     * @param {Object} data - Diplomacy operations data from host
     */
    handleGuestDiplomacyEffects(data) {
        console.log('🤝 GUEST: Processing diplomacy effects from host');
        
        const { operations } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        
        if (!operations || !Array.isArray(operations)) {
            console.error('🤝 GUEST: Invalid diplomacy operations received');
            return;
        }
        
        // Process each diplomacy operation
        for (const operation of operations) {
            this.processGuestDiplomacyOperation(operation, myAbsoluteSide);
        }
        
        // Re-render creature displays after all operations
        if (this.battleManager.battleScreen && this.battleManager.battleScreen.renderCreaturesAfterInit) {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
            console.log('🤝 GUEST: Re-rendered creatures after diplomacy effects');
        }
        
        // Update necromancy displays if applicable
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.initializeNecromancyStackDisplays();
        }
        
        // Send acknowledgment back to host
        this.battleManager.sendAcknowledgment('diplomacy_complete');
        
        console.log(`🤝 GUEST: Processed ${operations.length} diplomacy operations`);
    }

    /**
     * Process a single diplomacy operation on the guest side
     * @param {Object} operation - Single diplomacy operation
     * @param {string} myAbsoluteSide - Guest's absolute side (host/guest)
     */
    processGuestDiplomacyOperation(operation, myAbsoluteSide) {
        const { diplomatHero: diplomatData, originalOwner: ownerData, creature: creatureData, originalIndex } = operation;
        
        // Determine local sides for diplomat and original owner
        const diplomatLocalSide = (diplomatData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const ownerLocalSide = (ownerData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Get the heroes
        const diplomatHeroes = diplomatLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const ownerHeroes = ownerLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const diplomatHero = diplomatHeroes[diplomatData.position];
        const ownerHero = ownerHeroes[ownerData.position];
        
        if (!diplomatHero || !ownerHero) {
            console.error(`🤝 GUEST: Could not find heroes for diplomacy operation`);
            return;
        }
        
        // Remove creature from original owner
        if (ownerHero.creatures && ownerHero.creatures.length > originalIndex) {
            const removedCreature = ownerHero.creatures.splice(originalIndex, 1)[0];
            console.log(`🤝 GUEST: Removed ${removedCreature.name} from ${ownerHero.name}`);
        } else {
            console.warn(`🤝 GUEST: Could not find creature at index ${originalIndex} for ${ownerHero.name}`);
        }
        
        // Add creature to diplomat hero
        const recruitedCreature = {
            ...creatureData,
            type: 'creature'
        };
        
        diplomatHero.creatures.push(recruitedCreature);
        console.log(`🤝 GUEST: Added ${recruitedCreature.name} to ${diplomatHero.name}`);
        
        // Update necromancy stacks if applicable
        if (diplomatHero.hasAbility && diplomatHero.hasAbility('Necromancy')) {
            const necromancyStacks = diplomatHero.getAbilityStackCount('Necromancy');
            diplomatHero.maxNecromancyStacks = necromancyStacks + diplomatHero.creatures.filter(c => c.alive).length;
        }
        
        // Play recruitment animation on guest side
        setTimeout(() => {
            this.playRecruitmentAnimation(diplomatHero, recruitedCreature);
        }, 100);
        
        // Log the action
        const logType = diplomatLocalSide === 'player' ? 'success' : 'error';
        this.battleManager.addCombatLog(
            `🤝 ${diplomatData.name} recruits ${creatureData.name} through Diplomacy!`,
            logType
        );
    }

    /**
     * Play recruitment animation for a newly recruited creature
     * @param {Object} hero - Hero who recruited the creature
     * @param {Object} creature - Recruited creature
     */
    playRecruitmentAnimation(hero, creature) {
        // Use setTimeout to not block execution
        setTimeout(() => {
            // Find the hero slot element
            const heroElement = document.querySelector(
                `.${hero.side}-slot.${hero.position}-slot`
            );
            
            if (!heroElement) {
                console.warn(`Could not find hero element for recruitment animation`);
                return;
            }

            // Create recruitment effect overlay on the hero
            const recruitmentEffect = document.createElement('div');
            recruitmentEffect.className = 'diplomacy-recruitment-effect';
            recruitmentEffect.innerHTML = `
                <div class="recruitment-aura"></div>
                <div class="recruitment-text">+${creature.name}</div>
                <div class="recruitment-particles">
                    ${Array.from({length: 8}, (_, i) => 
                        `<div class="recruit-particle particle-${i + 1}"></div>`
                    ).join('')}
                </div>
            `;
            
            // Position it over the hero
            heroElement.style.position = 'relative';
            heroElement.appendChild(recruitmentEffect);
            
            // Remove effect after animation completes
            setTimeout(() => {
                if (recruitmentEffect.parentNode) {
                    recruitmentEffect.parentNode.removeChild(recruitmentEffect);
                }
            }, 1200); // Total animation duration
            
        }, 50); // Small delay to ensure DOM is ready
    }

    /**
     * Inject CSS for diplomacy recruitment animations
     */
    injectDiplomacyAnimationCSS() {
        if (document.getElementById('diplomacyStyles')) {
            return; // Already injected
        }
        
        const style = document.createElement('style');
        style.id = 'diplomacyStyles';
        style.textContent = `
            /* Diplomacy Recruitment Effect */
            .diplomacy-recruitment-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 55;
            }

            /* Recruitment Aura */
            .recruitment-aura {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 60px;
                height: 60px;
                border: 3px solid rgba(255, 215, 0, 0.8);
                border-radius: 50%;
                box-shadow: 
                    0 0 15px rgba(255, 215, 0, 0.6),
                    inset 0 0 10px rgba(255, 215, 0, 0.3);
                animation: recruitmentAura 1.2s ease-out;
            }

            /* Recruitment Text */
            .recruitment-text {
                position: absolute;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                color: #FFD700;
                font-size: 12px;
                font-weight: bold;
                text-shadow: 
                    1px 1px 2px rgba(0, 0, 0, 0.8),
                    0 0 8px rgba(255, 215, 0, 0.6);
                animation: recruitmentText 1.2s ease-out;
                white-space: nowrap;
            }

            /* Recruitment Particles */
            .recruitment-particles {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .recruit-particle {
                position: absolute;
                width: 4px;
                height: 4px;
                background: linear-gradient(45deg, #FFD700, #FFA500);
                border-radius: 50%;
                box-shadow: 0 0 6px rgba(255, 215, 0, 0.8);
                animation: recruitParticle 1.2s ease-out;
            }

            /* Particle Positions (8 particles in circle) */
            .particle-1 { top: 10%; left: 50%; animation-delay: 0s; }
            .particle-2 { top: 25%; left: 85%; animation-delay: 0.1s; }
            .particle-3 { top: 50%; left: 90%; animation-delay: 0.2s; }
            .particle-4 { top: 75%; left: 85%; animation-delay: 0.3s; }
            .particle-5 { top: 90%; left: 50%; animation-delay: 0.4s; }
            .particle-6 { top: 75%; left: 15%; animation-delay: 0.5s; }
            .particle-7 { top: 50%; left: 10%; animation-delay: 0.6s; }
            .particle-8 { top: 25%; left: 15%; animation-delay: 0.7s; }

            /* Keyframe Animations */
            @keyframes recruitmentAura {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                    border-color: rgba(255, 215, 0, 0);
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.3);
                    opacity: 1;
                    border-color: rgba(255, 215, 0, 1);
                    box-shadow: 
                        0 0 20px rgba(255, 215, 0, 1),
                        inset 0 0 15px rgba(255, 215, 0, 0.5);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                    border-color: rgba(255, 215, 0, 0);
                }
            }

            @keyframes recruitmentText {
                0% {
                    transform: translateX(-50%) translateY(10px) scale(0.5);
                    opacity: 0;
                }
                30% {
                    transform: translateX(-50%) translateY(0) scale(1.2);
                    opacity: 1;
                }
                60% {
                    transform: translateX(-50%) translateY(-5px) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateX(-50%) translateY(-15px) scale(0.8);
                    opacity: 0;
                }
            }

            @keyframes recruitParticle {
                0% {
                    transform: scale(0) rotate(0deg);
                    opacity: 0;
                }
                30% {
                    transform: scale(1.5) rotate(180deg);
                    opacity: 1;
                    box-shadow: 0 0 12px rgba(255, 215, 0, 1);
                }
                70% {
                    transform: scale(1) rotate(360deg);
                    opacity: 1;
                }
                100% {
                    transform: scale(0) rotate(540deg);
                    opacity: 0;
                }
            }

            /* Add slight glow to hero during recruitment */
            .diplomacy-recruitment-effect + .team-hero-card {
                filter: brightness(1.2) drop-shadow(0 0 10px rgba(255, 215, 0, 0.4));
                animation: diplomacyHeroGlow 1.2s ease-out;
            }

            @keyframes diplomacyHeroGlow {
                0% {
                    filter: brightness(1.2) drop-shadow(0 0 10px rgba(255, 215, 0, 0.4));
                }
                50% {
                    filter: brightness(1.4) drop-shadow(0 0 15px rgba(255, 215, 0, 0.6));
                }
                100% {
                    filter: brightness(1) drop-shadow(0 0 0px rgba(255, 215, 0, 0));
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Static method to clean up diplomacy tracking after battle ends
     * @param {Object} battleManager - Battle manager instance
     * @returns {number} Number of recruited creatures that remain
     */
    static cleanupDiplomacyAfterBattle(battleManager) {
        if (!battleManager) {
            return 0;
        }

        // Get all heroes from both sides
        const allHeroes = [
            ...Object.values(battleManager.playerHeroes || {}),
            ...Object.values(battleManager.opponentHeroes || {})
        ];

        let recruitedCreaturesFound = 0;
        
        for (const hero of allHeroes) {
            if (hero && hero.creatures && Array.isArray(hero.creatures)) {
                // Count creatures recruited by diplomacy (but don't remove them - they stay!)
                const recruited = hero.creatures.filter(creature => 
                    creature.recruitedByDiplomacy || creature.stolenByDiplomacy
                );
                
                recruitedCreaturesFound += recruited.length;
                
                if (recruited.length > 0) {
                    console.log(`🤝 ${hero.name} keeps ${recruited.length} recruited creature(s) from this battle`);
                    
                    // Clear diplomacy flags for next battle
                    recruited.forEach(creature => {
                        delete creature.stolenByDiplomacy;
                        delete creature.diplomacyId;
                        // Keep recruitedByDiplomacy for history tracking if desired
                    });
                }
            }
        }

        if (recruitedCreaturesFound > 0) {
            console.log(`🤝 Total: ${recruitedCreaturesFound} creatures remain with their new owners after battle`);
        }

        return recruitedCreaturesFound;
    }

    /**
     * Get recruitment summary for a hero
     * @param {Object} hero - Hero to check
     * @returns {Object} Summary of recruited creatures
     */
    getRecruitmentSummary(hero) {
        if (!hero || !hero.creatures) {
            return { count: 0, creatures: [] };
        }
        
        const recruited = hero.creatures.filter(creature => 
            creature.recruitedByDiplomacy || creature.stolenByDiplomacy
        );
        
        return {
            count: recruited.length,
            creatures: recruited.map(c => ({
                name: c.name,
                originalOwner: c.originalOwner || 'Unknown',
                hp: `${c.currentHp}/${c.maxHp}`
            }))
        };
    }

    /**
     * Reset diplomacy manager for new battle
     */
    reset() {
        this.stolenCreatures.clear();
        this.diplomacyThefts.clear();
        console.log('🤝 Diplomacy manager reset for new battle');
    }

    /**
     * Cleanup method called when battle ends
     */
    cleanup() {
        this.reset();
    }
}