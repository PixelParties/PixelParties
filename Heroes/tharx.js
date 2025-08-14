// Heroes/tharx.js - Tharx Hero Implementation
// Tharx's effect: At battle start, increases all team creatures' HP based on Tharx's max HP

export class TharxHeroEffect {
    static applyTharxEffectsAtBattleStart(battleManager) {
        if (!battleManager.isAuthoritative) return;
        
        // Check if either team has Tharx before doing anything
        const playerHasTharx = this.teamHasTharx(battleManager.playerHeroes);
        const opponentHasTharx = this.teamHasTharx(battleManager.opponentHeroes);
        
        if (!playerHasTharx && !opponentHasTharx) {
            return; // No Tharx on either team, skip entirely
        }
        
        console.log('⚔️ Applying Tharx HP bonus effects at battle start...');
        
        // FIXED: Apply effects only for teams that have Tharx
        if (playerHasTharx) {
            this.applyTharxEffectsForTeam(battleManager, 'player');
        }
        if (opponentHasTharx) {
            this.applyTharxEffectsForTeam(battleManager, 'opponent');
        }
        
        console.log('✅ Tharx HP bonus effects applied successfully');
    }
    
    // ... rest of the class remains unchanged
    static applyTharxEffectsForTeam(battleManager, teamSide) {
        const heroes = teamSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        
        // Find all Tharx heroes on this team
        const tharxHeroes = [];
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && hero.name === 'Tharx') {
                tharxHeroes.push(hero);
            }
        });
        
        if (tharxHeroes.length === 0) {
            return; // No Tharx on this team
        }
        
        // Calculate total HP bonus from all Tharx heroes
        let totalHpBonusPercent = 0;
        tharxHeroes.forEach(tharxHero => {
            const tharxMaxHp = tharxHero.maxHp;
            const multiplesOf50 = Math.floor(tharxMaxHp / 50);
            const bonusPercent = multiplesOf50 * 10;
            totalHpBonusPercent += bonusPercent;
            
            console.log(`🛡️ ${tharxHero.name} (${tharxMaxHp} HP) provides ${bonusPercent}% creature HP bonus to ${teamSide} team`);
        });
        
        if (totalHpBonusPercent === 0) {
            return; // No bonus to apply
        }
        
        // Apply bonuses to all creatures on this team
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && hero.creatures && hero.creatures.length > 0) {
                this.applyHpBonusToHeroCreatures(
                    hero, 
                    totalHpBonusPercent, 
                    tharxHeroes.includes(hero), // Double bonus if this hero is Tharx
                    battleManager
                );
            }
        });
    }
    
    static applyHpBonusToHeroCreatures(hero, baseBonusPercent, isOwnerTharx, battleManager) {
        const effectiveBonusPercent = isOwnerTharx ? baseBonusPercent * 2 : baseBonusPercent;
        const multiplier = 1 + (effectiveBonusPercent / 100);
        
        let creaturesAffected = 0;
        
        hero.creatures.forEach(creature => {
            if (creature.alive) {
                // Store original HP values if not already stored (for potential future use)
                if (!creature.originalMaxHp) {
                    creature.originalMaxHp = creature.maxHp;
                    creature.originalCurrentHp = creature.currentHp;
                }
                
                // Calculate new HP values
                const oldMaxHp = creature.maxHp;
                const oldCurrentHp = creature.currentHp;
                
                // Apply bonus to max HP
                creature.maxHp = Math.floor(creature.originalMaxHp * multiplier);
                
                // Apply bonus to current HP (maintaining same ratio if creature was damaged)
                if (creature.originalCurrentHp < creature.originalMaxHp) {
                    // Creature was damaged, maintain the damage ratio
                    const healthRatio = creature.originalCurrentHp / creature.originalMaxHp;
                    creature.currentHp = Math.floor(creature.maxHp * healthRatio);
                } else {
                    // Creature was at full health, give full bonus
                    creature.currentHp = creature.maxHp;
                }
                
                // Ensure current HP doesn't exceed max HP
                creature.currentHp = Math.min(creature.currentHp, creature.maxHp);
                
                creaturesAffected++;
                
                console.log(`🐾 ${creature.name}: HP boosted from ${oldCurrentHp}/${oldMaxHp} to ${creature.currentHp}/${creature.maxHp} (+${effectiveBonusPercent}%)`);
            }
        });
        
        if (creaturesAffected > 0) {
            const ownerType = isOwnerTharx ? "Tharx's own" : "allied";
            battleManager.addCombatLog(
                `⚔️ Tharx's presence boosts ${creaturesAffected} ${ownerType} creatures by ${effectiveBonusPercent}%!`, 
                hero.side === 'player' ? 'success' : 'info'
            );
        }
    }
    
    // Helper method to check if any team has Tharx (for external use)
    static teamHasTharx(heroes) {
        return ['left', 'center', 'right'].some(position => {
            const hero = heroes[position];
            return hero && hero.alive && hero.name === 'Tharx';
        });
    }
    
    // Helper method to get total Tharx HP bonus for a team (for external use)
    static calculateTeamTharxBonus(heroes) {
        let totalBonusPercent = 0;
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && hero.name === 'Tharx') {
                const multiplesOf50 = Math.floor(hero.maxHp / 50);
                totalBonusPercent += multiplesOf50 * 10;
            }
        });
        
        return totalBonusPercent;
    }
}

// Export for ES6 module compatibility
export default TharxHeroEffect;