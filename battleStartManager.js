// battleStartManager.js - Centralized Battle Start Effects Manager
// Handles all effects that trigger at the beginning of combat

import { applyArrowStartOfBattleEffects } from './arrowSystem.js';

export class BattleStartManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
    }

    // Apply all start-of-battle effects in the correct order
    async applyAllStartOfBattleEffects() {
        const bm = this.battleManager;
        
        if (!bm.isAuthoritative) {
            return; // Only host applies start-of-battle effects
        }

        try {
            // Phase 1: Arrow system initialization
            await this.applyArrowEffects();

            // Phase 1.5: Area effects (Gathering Storm, etc.)
            await this.applyAreaEffects();

            // Phase 2: Potion effects from both players
            await this.applyPotionEffects();

            // Phase 3: Diplomacy effects (creature recruitment)
            await this.applyDiplomacyEffects();

            // Phase 4: Hero-specific battle start effects
            await this.applyHeroStartEffects();

            // Phase 5: Delayed artifact effects 
            await this.applyDelayedArtifactEffects();

            // Phase 6: Equipment-based start effects
            await this.applyEquipmentStartEffects();

            // Phase 7: Permanent artifact effects
            await this.applyPermanentArtifactEffects();

            bm.addCombatLog('✨ All battle start effects applied successfully', 'system');

        } catch (error) {
            console.error('Error applying battle start effects:', error);
            bm.addCombatLog('⚠️ Some battle start effects failed to apply', 'warning');
        }
    }

    // Phase 1: Initialize arrow system effects
    async applyArrowEffects() {
        const bm = this.battleManager;
        
        try {
            applyArrowStartOfBattleEffects(bm);
            bm.addCombatLog('🏹 Arrow effects initialized', 'info');
        } catch (error) {
            console.error('Error applying arrow start effects:', error);
        }
    }

    // Phase 1.5: Apply area effects (Gathering Storm, etc.)
    async applyAreaEffects() {
        const bm = this.battleManager;
        
        try {
            // Apply Gathering Storm effects
            const { applyGatheringStormBattleEffects } = await import('./Spells/gatheringStorm.js');
            await applyGatheringStormBattleEffects(bm);
            
            bm.addCombatLog('Area effects processed', 'info');
        } catch (error) {
            console.error('Error applying area effects:', error);
        }
    }

    // Phase 2: Apply potion effects from both players
    async applyPotionEffects() {
        const bm = this.battleManager;
        
        try {
            // Get both players' potion states from Firebase
            const potionStates = await bm.getBothPlayersPotionStates();
            
            // Let the potion handler deal with applying effects from both states
            if (window.potionHandler && potionStates) {
                await window.potionHandler.applyBothPlayersPotionEffectsAtBattleStart(
                    potionStates.host, 
                    potionStates.guest, 
                    bm
                );
                
                // Re-render creatures after potion effects (boulders may have been added)
                if (bm.battleScreen && typeof bm.battleScreen.renderCreaturesAfterInit === 'function') {
                    bm.battleScreen.renderCreaturesAfterInit();
                }

                // Update necromancy displays if boulders were added
                if (bm.necromancyManager) {
                    bm.necromancyManager.initializeNecromancyStackDisplays();
                }

                bm.addCombatLog('🧪 Potion effects applied from both players', 'info');
            }
        } catch (error) {
            console.error('Error applying potion effects:', error);
        }
    }

    // Phase 3: Apply diplomacy effects (creature recruitment)
    async applyDiplomacyEffects() {
        const bm = this.battleManager;
        
        try {
            if (bm.diplomacyManager) {
                await bm.diplomacyManager.applyDiplomacyEffects();
                
                // Re-render creatures after diplomacy effects (creatures may have moved)
                if (bm.battleScreen && typeof bm.battleScreen.renderCreaturesAfterInit === 'function') {
                    bm.battleScreen.renderCreaturesAfterInit();
                }

                // Update necromancy displays if creatures were recruited
                if (bm.necromancyManager) {
                    bm.necromancyManager.initializeNecromancyStackDisplays();
                }

                bm.addCombatLog('🤝 Diplomacy recruitment effects applied', 'info');
            }
        } catch (error) {
            console.error('Error applying diplomacy effects:', error);
        }
    }

    // Phase 4: Apply specific battle start effects
    async applyHeroStartEffects() {
        const bm = this.battleManager;
        
        try {
            // Apply Tharx HP bonus effects (after all creatures are in their final positions)
            const { TharxHeroEffect } = await import('./Heroes/tharx.js');
            TharxHeroEffect.applyTharxEffectsAtBattleStart(bm);

            // Re-render creatures after Tharx effects (HP values may have changed)
            if (bm.battleScreen && typeof bm.battleScreen.renderCreaturesAfterInit === 'function') {
                bm.battleScreen.renderCreaturesAfterInit();
            }

            // Update necromancy displays after HP changes
            if (bm.necromancyManager) {
                bm.necromancyManager.initializeNecromancyStackDisplays();
            }

            bm.addCombatLog('⚡ Hero battle start effects applied', 'info');
        } catch (error) {
            console.error('Error applying hero start effects:', error);
        }

        // Apply Future Tech Drone HP bonuses
        try {
            const { FutureTechDroneCreature } = await import('./Creatures/futureTechDrone.js');
            FutureTechDroneCreature.applyStartOfBattleHPBonuses(bm);
        } catch (error) {
            console.error('Error applying Future Tech Drone effects:', error);
        }
    }

    // Phase 5: Apply delayed artifact effects (like Poisoned Meat)
    async applyDelayedArtifactEffects() {
        const bm = this.battleManager;
        
        try {
            const delayedEffects = await bm.getBothPlayersDelayedEffects();
            
            if (delayedEffects) {
                const { applyBothPlayersDelayedEffects } = await import('./Artifacts/poisonedMeat.js');
                await applyBothPlayersDelayedEffects(delayedEffects.host, delayedEffects.guest, bm);
                bm.addCombatLog('⏳ Delayed artifact effects applied', 'info');
            }
        } catch (error) {
            console.error('Error applying delayed artifact effects:', error);
        }
    }

    // Phase 6: Apply equipment-based start effects
    async applyEquipmentStartEffects() {
        const bm = this.battleManager;
        
        try {
            if (bm.crusaderArtifactsHandler) {
                await bm.crusaderArtifactsHandler.applyStartOfBattleEffects();
                bm.addCombatLog('⚔️ Equipment battle start effects applied', 'info');
            }
        } catch (error) {
            console.error('Error applying equipment start effects:', error);
        }
    }

    // Phase 7: Apply permanent artifact effects
    async applyPermanentArtifactEffects() {
        const bm = this.battleManager;
        
        try {
            // Snow Cannon effects
            try {
                const { applySnowCannonBattleEffects } = await import('./Artifacts/snowCannon.js');
                await applySnowCannonBattleEffects(bm);
            } catch (error) {
                console.error('Error applying Snow Cannon effects:', error);
            }

            // Cloud Pillow effects
            try {
                const { applyCloudPillowBattleEffects } = await import('./Artifacts/cloudPillow.js');
                await applyCloudPillowBattleEffects(bm);
            } catch (error) {
                console.error('Error applying Cloud Pillow effects:', error);
            }

            // Field Standard effects
            try {
                const { applyFieldStandardBattleEffects } = await import('./Artifacts/fieldStandard.js');
                await applyFieldStandardBattleEffects(bm);
            } catch (error) {
                console.error('Error applying Field Standard effects:', error);
            }

            bm.addCombatLog('🏺 Permanent artifact effects applied', 'info');
        } catch (error) {
            console.error('Error applying permanent artifact effects:', error);
        }
    }

    // Utility method to refresh all visual displays after effects
    async refreshAllVisuals() {
        const bm = this.battleManager;
        
        // Final re-render of creatures after all effects
        if (bm.battleScreen && typeof bm.battleScreen.renderCreaturesAfterInit === 'function') {
            bm.battleScreen.renderCreaturesAfterInit();
        }

        // Final update of necromancy displays
        if (bm.necromancyManager) {
            bm.necromancyManager.initializeNecromancyStackDisplays();
        }
    }
}

export default BattleStartManager;