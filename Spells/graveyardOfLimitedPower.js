// ./Spells/graveyardOfLimitedPower.js - Graveyard of Limited Power Area Effect Implementation
// Debuffs heroes without Necromancy based on graveyard size

export class GraveyardOfLimitedPowerEffect {
    constructor() {
        this.isActive = false;
        this.playerHasGraveyard = false;
        this.opponentHasGraveyard = false;
    }

    // Check if Graveyard of Limited Power should be active at battle start
    checkGraveyardActive(battleManager) {
        if (!battleManager) return { active: false, playerHas: false, opponentHas: false };

        const playerHasGraveyard = battleManager.playerAreaCard && 
                                 battleManager.playerAreaCard.name === 'GraveyardOfLimitedPower';
        const opponentHasGraveyard = battleManager.opponentAreaCard && 
                                   battleManager.opponentAreaCard.name === 'GraveyardOfLimitedPower';

        const active = playerHasGraveyard || opponentHasGraveyard;

        return { 
            active, 
            playerHas: playerHasGraveyard, 
            opponentHas: opponentHasGraveyard 
        };
    }

    // Apply Graveyard of Limited Power effects at battle start
    async applyGraveyardEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) return;

        const graveyardCheck = this.checkGraveyardActive(battleManager);
        
        if (!graveyardCheck.active) return;

        this.isActive = true;
        this.playerHasGraveyard = graveyardCheck.playerHas;
        this.opponentHasGraveyard = graveyardCheck.opponentHas;

        // Get graveyard sizes
        const playerGraveyardSize = this.getGraveyardSize(battleManager, 'player');
        const opponentGraveyardSize = this.getGraveyardSize(battleManager, 'opponent');

        // Log the activation
        if (this.playerHasGraveyard && this.opponentHasGraveyard) {
            battleManager.addCombatLog(
                `💀 Both players have Graveyards of Limited Power! Non-necromancers suffer greatly!`,
                'warning'
            );
        } else {
            const owner = this.playerHasGraveyard ? 'Player' : 'Opponent';
            const graveyardSize = this.playerHasGraveyard ? playerGraveyardSize : opponentGraveyardSize;
            battleManager.addCombatLog(
                `💀 ${owner}'s Graveyard of Limited Power manifests! (${graveyardSize} souls empower it)`,
                'warning'
            );
        }

        // Apply debuffs to all heroes without Necromancy
        const debuffResults = {
            playerHeroes: { affected: 0, total: 0 },
            opponentHeroes: { affected: 0, total: 0 }
        };

        // Apply player graveyard effect (if exists)
        if (this.playerHasGraveyard && playerGraveyardSize > 0) {
            this.applyDebuffsToAllHeroes(battleManager, playerGraveyardSize, 'player', debuffResults);
        }

        // Apply opponent graveyard effect (if exists)
        if (this.opponentHasGraveyard && opponentGraveyardSize > 0) {
            this.applyDebuffsToAllHeroes(battleManager, opponentGraveyardSize, 'opponent', debuffResults);
        }

        // Log the results
        this.logDebuffResults(battleManager, debuffResults, playerGraveyardSize, opponentGraveyardSize);

        // Sync to guest
        this.syncGraveyardState(battleManager, debuffResults, playerGraveyardSize, opponentGraveyardSize);
    }

    // Collect heroes affected by the curse (those without Necromancy)
    collectAffectedHeroes(battleManager, heroes, side, affectedHeroes) {
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && !hero.hasAbility('Necromancy')) {
                affectedHeroes.push({
                    hero: hero,
                    side: side,
                    position: position,
                    element: battleManager.getHeroElement(side, position)
                });
            }
        });
    }

    // Play dark energy animation on all affected heroes
    async playDarkEnergyAnimation(affectedHeroes, battleManager) {
        // Ensure CSS is available
        this.ensureGraveyardCSS();
        
        // Create dark energy effects on each hero simultaneously
        const animationPromises = affectedHeroes.map((heroData, index) => {
            return new Promise((resolve) => {
                // Stagger the start slightly for visual appeal
                setTimeout(() => {
                    this.createDarkEnergyEffect(heroData, battleManager);
                    resolve();
                }, index * 50);
            });
        });
        
        await Promise.all(animationPromises);
        
        // Wait for animation duration
        await battleManager.delay(1000);
        
        // Clean up effects
        this.cleanupDarkEnergyEffects();
    }

    // Get graveyard size for a player
    getGraveyardSize(battleManager, side) {
        const graveyard = side === 'player' ? battleManager.playerGraveyard : battleManager.opponentGraveyard;
        return graveyard ? graveyard.length : 0;
    }

    // Create dark energy effect on a single hero
    createDarkEnergyEffect(heroData, battleManager) {
        const { hero, side, position, element } = heroData;
        
        if (!element) {
            return;
        }
        
        // Create dark energy container
        const darkEnergyContainer = document.createElement('div');
        darkEnergyContainer.className = 'graveyard-dark-energy-container';
        darkEnergyContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 300;
            overflow: visible;
        `;
        
        // Create multiple dark energy wisps
        for (let i = 0; i < 6; i++) {
            const wisp = document.createElement('div');
            wisp.className = 'graveyard-dark-wisp';
            wisp.innerHTML = '💀';
            
            const angle = (i * 60) + Math.random() * 30; // Distribute around the hero
            const distance = 40 + Math.random() * 20;
            
            wisp.style.cssText = `
                position: absolute;
                font-size: 20px;
                opacity: 0;
                transform: rotate(${angle}deg) translate(${distance}px) rotate(-${angle}deg);
                animation: graveyardDarkWisp ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-in-out forwards;
                animation-delay: ${i * 50}ms;
                text-shadow: 0 0 10px rgba(139, 0, 139, 0.8), 0 0 20px rgba(75, 0, 130, 0.6);
                filter: hue-rotate(${Math.random() * 60 - 30}deg);
            `;
            
            darkEnergyContainer.appendChild(wisp);
        }
        
        // Create central dark aura
        const aura = document.createElement('div');
        aura.className = 'graveyard-dark-aura';
        aura.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 80px;
            height: 80px;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, 
                rgba(139, 0, 139, 0.4) 0%, 
                rgba(75, 0, 130, 0.3) 30%, 
                rgba(25, 25, 112, 0.2) 60%, 
                transparent 100%);
            border-radius: 50%;
            opacity: 0;
            animation: graveyardDarkAura ${battleManager.getSpeedAdjustedDelay(1000)}ms ease-in-out forwards;
        `;
        
        darkEnergyContainer.appendChild(aura);
        
        // Add to hero element
        element.style.position = 'relative';
        element.appendChild(darkEnergyContainer);
        
        // Add weakened visual effect to the hero card
        const heroCard = element.querySelector('.battle-hero-card, .hero-card');
        if (heroCard) {
            heroCard.classList.add('graveyard-weakened');
        }
    }

    // Clean up all dark energy effects
    cleanupDarkEnergyEffects() {
        const darkEffects = document.querySelectorAll('.graveyard-dark-energy-container');
        darkEffects.forEach(effect => effect.remove());
        
        const weakenedCards = document.querySelectorAll('.graveyard-weakened');
        weakenedCards.forEach(card => card.classList.remove('graveyard-weakened'));
    }

    // Force visual updates for all heroes
    updateAllHeroVisuals(battleManager) {
        ['left', 'center', 'right'].forEach(position => {
            // Update player heroes
            if (battleManager.playerHeroes[position]) {
                const hero = battleManager.playerHeroes[position];
                battleManager.updateHeroHealthBar('player', position, hero.currentHp, hero.maxHp);
                battleManager.updateHeroAttackDisplay('player', position, hero);
            }
            
            // Update opponent heroes
            if (battleManager.opponentHeroes[position]) {
                const hero = battleManager.opponentHeroes[position];
                battleManager.updateHeroHealthBar('opponent', position, hero.currentHp, hero.maxHp);
                battleManager.updateHeroAttackDisplay('opponent', position, hero);
            }
        });
    }

    // Ensure CSS for dark energy effects
    ensureGraveyardCSS() {
        if (document.getElementById('graveyardLimitedPowerStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'graveyardLimitedPowerStyles';
        style.textContent = `
            @keyframes graveyardDarkWisp {
                0% { 
                    opacity: 0; 
                    transform: rotate(var(--angle, 0deg)) translate(20px) rotate(calc(-1 * var(--angle, 0deg))) scale(0.3); 
                }
                30% { 
                    opacity: 1; 
                    transform: rotate(var(--angle, 0deg)) translate(50px) rotate(calc(-1 * var(--angle, 0deg))) scale(1.2); 
                }
                70% { 
                    opacity: 0.8; 
                    transform: rotate(var(--angle, 0deg)) translate(30px) rotate(calc(-1 * var(--angle, 0deg))) scale(1); 
                }
                100% { 
                    opacity: 0; 
                    transform: rotate(var(--angle, 0deg)) translate(10px) rotate(calc(-1 * var(--angle, 0deg))) scale(0.5); 
                }
            }
            
            @keyframes graveyardDarkAura {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3); 
                }
                50% { 
                    opacity: 0.6; 
                    transform: translate(-50%, -50%) scale(1.2); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.5); 
                }
            }
            
            .graveyard-weakened {
                filter: brightness(0.7) saturate(0.8) hue-rotate(-10deg) !important;
                transition: filter 0.5s ease-out !important;
            }
            
            .graveyard-dark-energy-container {
                will-change: transform, opacity;
            }
            
            .graveyard-dark-wisp {
                will-change: transform, opacity;
                pointer-events: none;
            }
            
            .graveyard-dark-aura {
                will-change: transform, opacity;
                pointer-events: none;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Apply debuffs to all heroes without Necromancy
    async applyDebuffsToAllHeroes(battleManager, graveyardSize, ownerSide, debuffResults) {
        const attackDebuff = -graveyardSize;
        const hpDebuff = -(graveyardSize * 3);

        // Collect all affected heroes first
        const affectedHeroes = [];
        this.collectAffectedHeroes(battleManager, battleManager.playerHeroes, 'player', affectedHeroes);
        this.collectAffectedHeroes(battleManager, battleManager.opponentHeroes, 'opponent', affectedHeroes);

        // Play dark energy animation on all affected heroes
        if (affectedHeroes.length > 0) {
            await this.playDarkEnergyAnimation(affectedHeroes, battleManager);
        }

        // Apply debuffs after animation
        this.applyDebuffsToSide(battleManager, battleManager.playerHeroes, 'player', attackDebuff, hpDebuff, debuffResults, ownerSide);
        this.applyDebuffsToSide(battleManager, battleManager.opponentHeroes, 'opponent', attackDebuff, hpDebuff, debuffResults, ownerSide);

        // Force visual stat updates after debuffs are applied
        this.updateAllHeroVisuals(battleManager);
    }

    // Apply debuffs to heroes on one side
    applyDebuffsToSide(battleManager, heroes, side, attackDebuff, hpDebuff, debuffResults, ownerSide) {
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive) {
                debuffResults[side + 'Heroes'].total++;
                
                // Check if hero has Necromancy ability
                if (!hero.hasAbility('Necromancy')) {
                    // Apply attack debuff
                    this.applyAttackDebuff(hero, attackDebuff);
                    
                    // Apply HP debuff (ensuring it doesn't go below 1)
                    this.applyHpDebuff(hero, hpDebuff);
                    
                    debuffResults[side + 'Heroes'].affected++;
                }
            }
        });
    }

    // Apply attack debuff to hero (ensuring minimum of 1 attack)
    applyAttackDebuff(hero, attackDebuff) {
        const currentAttack = hero.getCurrentAttack();
        const newAttack = Math.max(1, currentAttack + attackDebuff);
        const actualAttackDebuff = newAttack - currentAttack;
        
        // Use the existing battle bonus system with the limited debuff
        hero.battleAttackBonus += actualAttackDebuff;
    }

    // Apply HP debuff to hero (ensuring minimum of 1 HP)
    applyHpDebuff(hero, hpDebuff) {
        const oldMaxHp = hero.maxHp;
        const oldCurrentHp = hero.currentHp;
        
        // Calculate new max HP, ensuring it doesn't go below 1
        const newMaxHp = Math.max(1, hero.maxHp + hpDebuff);
        const actualHpDebuff = newMaxHp - hero.maxHp;
        
        // Apply the debuff using the battle bonus system
        hero.battleHpBonus += actualHpDebuff;
        hero.maxHp = newMaxHp;
        
        // Adjust current HP proportionally, but ensure it doesn't go below 1
        if (oldMaxHp > 0) {
            const hpRatio = oldCurrentHp / oldMaxHp;
            hero.currentHp = Math.max(1, Math.floor(newMaxHp * hpRatio));
        } else {
            hero.currentHp = 1;
        }
    }

    // Log the debuff results
    logDebuffResults(battleManager, debuffResults, playerGraveyardSize, opponentGraveyardSize) {
        const totalAffected = debuffResults.playerHeroes.affected + debuffResults.opponentHeroes.affected;
        const totalHeroes = debuffResults.playerHeroes.total + debuffResults.opponentHeroes.total;
        
        if (totalAffected > 0) {
            let message = `💀 Graveyard curse affects ${totalAffected}/${totalHeroes} heroes!`;
            
            if (this.playerHasGraveyard && this.opponentHasGraveyard) {
                message += ` (${playerGraveyardSize} + ${opponentGraveyardSize} souls)`;
            } else if (this.playerHasGraveyard) {
                message += ` (${playerGraveyardSize} souls)`;
            } else {
                message += ` (${opponentGraveyardSize} souls)`;
            }
            
            battleManager.addCombatLog(message, 'warning');
            
            // Log details
            if (debuffResults.playerHeroes.affected > 0) {
                battleManager.addCombatLog(
                    `💀 Player side: ${debuffResults.playerHeroes.affected}/${debuffResults.playerHeroes.total} heroes cursed`,
                    'error'
                );
            }
            if (debuffResults.opponentHeroes.affected > 0) {
                battleManager.addCombatLog(
                    `💀 Opponent side: ${debuffResults.opponentHeroes.affected}/${debuffResults.opponentHeroes.total} heroes cursed`,
                    'info'
                );
            }
        } else {
            battleManager.addCombatLog(
                `🛡️ All heroes resist the graveyard curse (all have Necromancy)`,
                'info'
            );
        }
    }

    // Sync Graveyard state to guest with stat changes
    syncGraveyardState(battleManager, debuffResults, playerGraveyardSize, opponentGraveyardSize) {
        // Collect actual stat changes for synchronization
        const statChanges = this.collectStatChangesForSync(battleManager, debuffResults, playerGraveyardSize, opponentGraveyardSize);
        
        battleManager.sendBattleUpdate('graveyard_limited_power_effects', {
            isActive: this.isActive,
            playerHas: this.playerHasGraveyard,
            opponentHas: this.opponentHasGraveyard,
            playerGraveyardSize: playerGraveyardSize,
            opponentGraveyardSize: opponentGraveyardSize,
            debuffResults: debuffResults,
            statChanges: statChanges,
            timestamp: Date.now()
        });
    }

    // Collect stat changes for network synchronization
    collectStatChangesForSync(battleManager, debuffResults, playerGraveyardSize, opponentGraveyardSize) {
        const statChanges = {
            playerHeroes: {},
            opponentHeroes: {}
        };

        // Calculate debuff amounts for each area
        const debuffs = [];
        if (this.playerHasGraveyard && playerGraveyardSize > 0) {
            debuffs.push({ attack: -playerGraveyardSize, hp: -(playerGraveyardSize * 3) });
        }
        if (this.opponentHasGraveyard && opponentGraveyardSize > 0) {
            debuffs.push({ attack: -opponentGraveyardSize, hp: -(opponentGraveyardSize * 3) });
        }

        // Collect stat changes for each hero
        ['left', 'center', 'right'].forEach(position => {
            // Player heroes
            const playerHero = battleManager.playerHeroes[position];
            if (playerHero && playerHero.alive && !playerHero.hasAbility('Necromancy')) {
                statChanges.playerHeroes[position] = {
                    name: playerHero.name,
                    oldAttack: playerHero.atk - playerHero.battleAttackBonus,
                    newAttack: playerHero.getCurrentAttack(),
                    oldMaxHp: playerHero.maxHp - playerHero.battleHpBonus,
                    newMaxHp: playerHero.maxHp,
                    currentHp: playerHero.currentHp,
                    debuffs: debuffs
                };
            }

            // Opponent heroes
            const opponentHero = battleManager.opponentHeroes[position];
            if (opponentHero && opponentHero.alive && !opponentHero.hasAbility('Necromancy')) {
                statChanges.opponentHeroes[position] = {
                    name: opponentHero.name,
                    oldAttack: opponentHero.atk - opponentHero.battleAttackBonus,
                    newAttack: opponentHero.getCurrentAttack(),
                    oldMaxHp: opponentHero.maxHp - opponentHero.battleHpBonus,
                    newMaxHp: opponentHero.maxHp,
                    currentHp: opponentHero.currentHp,
                    debuffs: debuffs
                };
            }
        });

        return statChanges;
    }

    // Handle guest-side Graveyard effects with visual updates
    async handleGuestGraveyardEffects(data) {
        if (!data || !window.battleManager) return;

        this.isActive = data.isActive;
        this.playerHasGraveyard = data.playerHas;
        this.opponentHasGraveyard = data.opponentHas;

        const { playerGraveyardSize, opponentGraveyardSize, debuffResults, statChanges } = data;

        // Log the activation on guest side
        if (this.playerHasGraveyard && this.opponentHasGraveyard) {
            window.battleManager.addCombatLog(
                `💀 Both players have Graveyards of Limited Power! Non-necromancers suffer greatly!`,
                'warning'
            );
        } else {
            const owner = this.playerHasGraveyard ? 'Player' : 'Opponent';
            const graveyardSize = this.playerHasGraveyard ? playerGraveyardSize : opponentGraveyardSize;
            window.battleManager.addCombatLog(
                `💀 ${owner}'s Graveyard of Limited Power manifests! (${graveyardSize} souls empower it)`,
                'warning'
            );
        }

        // Apply stat changes to guest's heroes and play animations
        if (statChanges) {
            await this.applyGuestStatChangesWithAnimation(window.battleManager, statChanges);
        }

        // Log the results (same as host)
        this.logGuestDebuffResults(window.battleManager, debuffResults, playerGraveyardSize, opponentGraveyardSize);
    }

    // Apply stat changes on guest side with animation
    async applyGuestStatChangesWithAnimation(battleManager, statChanges) {
        // Collect affected heroes for animation
        const affectedHeroes = [];
        
        // Apply stat changes and collect heroes
        ['left', 'center', 'right'].forEach(position => {
            // Handle player heroes
            if (statChanges.playerHeroes[position]) {
                const hero = battleManager.playerHeroes[position];
                if (hero) {
                    this.applyGuestStatChanges(hero, statChanges.playerHeroes[position]);
                    const element = battleManager.getHeroElement('player', position);
                    if (element) {
                        affectedHeroes.push({ hero, side: 'player', position, element });
                    }
                }
            }

            // Handle opponent heroes
            if (statChanges.opponentHeroes[position]) {
                const hero = battleManager.opponentHeroes[position];
                if (hero) {
                    this.applyGuestStatChanges(hero, statChanges.opponentHeroes[position]);
                    const element = battleManager.getHeroElement('opponent', position);
                    if (element) {
                        affectedHeroes.push({ hero, side: 'opponent', position, element });
                    }
                }
            }
        });

        // Play dark energy animation on guest side
        if (affectedHeroes.length > 0) {
            await this.playDarkEnergyAnimation(affectedHeroes, battleManager);
        }

        // Force visual stat updates after animation
        this.updateAllHeroVisuals(battleManager);
    }

    // Apply individual stat changes on guest side
    applyGuestStatChanges(hero, changes) {
        // Calculate total debuffs from all areas
        let totalAttackDebuff = 0;
        let totalHpDebuff = 0;
        
        changes.debuffs.forEach(debuff => {
            totalAttackDebuff += debuff.attack;
            totalHpDebuff += debuff.hp;
        });

        // Apply attack debuff (ensuring minimum of 1 attack)
        const currentAttack = hero.getCurrentAttack();
        const newAttack = Math.max(1, currentAttack + totalAttackDebuff);
        const actualAttackDebuff = newAttack - currentAttack;
        hero.battleAttackBonus += actualAttackDebuff;
        
        // Apply HP debuff (ensuring minimum of 1 HP)
        const oldMaxHp = hero.maxHp;
        const newMaxHp = Math.max(1, hero.maxHp + totalHpDebuff);
        const actualHpDebuff = newMaxHp - hero.maxHp;
        
        hero.battleHpBonus += actualHpDebuff;
        hero.maxHp = newMaxHp;
        
        // Adjust current HP proportionally, ensuring it doesn't go below 1
        if (oldMaxHp > 0) {
            const hpRatio = hero.currentHp / oldMaxHp;
            hero.currentHp = Math.max(1, Math.floor(newMaxHp * hpRatio));
        } else {
            hero.currentHp = 1;
        }
    }

    // Log debuff results on guest side
    logGuestDebuffResults(battleManager, debuffResults, playerGraveyardSize, opponentGraveyardSize) {
        const totalAffected = debuffResults.playerHeroes.affected + debuffResults.opponentHeroes.affected;
        const totalHeroes = debuffResults.playerHeroes.total + debuffResults.opponentHeroes.total;
        
        if (totalAffected > 0) {
            let message = `💀 Graveyard curse affects ${totalAffected}/${totalHeroes} heroes!`;
            
            if (this.playerHasGraveyard && this.opponentHasGraveyard) {
                message += ` (${playerGraveyardSize} + ${opponentGraveyardSize} souls)`;
            } else if (this.playerHasGraveyard) {
                message += ` (${playerGraveyardSize} souls)`;
            } else {
                message += ` (${opponentGraveyardSize} souls)`;
            }
            
            battleManager.addCombatLog(message, 'warning');
            
            // Log details
            if (debuffResults.playerHeroes.affected > 0) {
                battleManager.addCombatLog(
                    `💀 Player side: ${debuffResults.playerHeroes.affected}/${debuffResults.playerHeroes.total} heroes cursed`,
                    'error'
                );
            }
            if (debuffResults.opponentHeroes.affected > 0) {
                battleManager.addCombatLog(
                    `💀 Opponent side: ${debuffResults.opponentHeroes.affected}/${debuffResults.opponentHeroes.total} heroes cursed`,
                    'info'
                );
            }
        } else {
            battleManager.addCombatLog(
                `🛡️ All heroes resist the graveyard curse (all have Necromancy)`,
                'info'
            );
        }
    }

    // Export state for persistence
    exportState() {
        return {
            isActive: this.isActive,
            playerHasGraveyard: this.playerHasGraveyard,
            opponentHasGraveyard: this.opponentHasGraveyard
        };
    }

    // Import state from persistence
    importState(state) {
        if (!state) return;
        
        this.isActive = state.isActive || false;
        this.playerHasGraveyard = state.playerHasGraveyard || false;
        this.opponentHasGraveyard = state.opponentHasGraveyard || false;
    }

    // Cleanup
    cleanup() {
        this.isActive = false;
        this.playerHasGraveyard = false;
        this.opponentHasGraveyard = false;
    }
}

// Export functions for battle manager integration
export async function applyGraveyardOfLimitedPowerBattleEffects(battleManager) {
    if (!battleManager.graveyardOfLimitedPowerEffect) {
        battleManager.graveyardOfLimitedPowerEffect = new GraveyardOfLimitedPowerEffect();
    }
    
    await battleManager.graveyardOfLimitedPowerEffect.applyGraveyardEffects(battleManager);
}

export function handleGuestGraveyardOfLimitedPowerEffects(data, battleManager) {
    if (!battleManager.graveyardOfLimitedPowerEffect) {
        battleManager.graveyardOfLimitedPowerEffect = new GraveyardOfLimitedPowerEffect();
    }
    
    battleManager.graveyardOfLimitedPowerEffect.handleGuestGraveyardEffects(data);
}

export default GraveyardOfLimitedPowerEffect;