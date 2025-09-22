// battleStartManager.js - Centralized Battle Start Effects Manager (FIXED)
// Handles all effects that trigger at the beginning of combat
// FIXED: Race condition in delayed artifact effect clearing

import { applyArrowStartOfBattleEffects } from './arrowSystem.js';
import { NomuHeroEffect } from './Heroes/nomu.js';
import { FriendshipManager } from './Abilities/friendship.js';

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
            // Phase 0: Nomu teleport shield effects (before all other effects)
            await this.applyNomuShieldEffects();
            
            // Phase 1: Arrow system initialization
            await this.applyArrowEffects();

            // Phase 1.5: Area effects (Gathering Storm, etc.)
            await this.applyAreaEffects();

            // Phase 1.75: Friendship effects (before potions)
            await this.applyFriendshipEffects();

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
        } catch (error) {
            console.error('Error applying battle start effects:', error);
        }
    }

    // Phase 1.75: Apply Friendship effects (before potions)
    async applyFriendshipEffects() {
        const bm = this.battleManager;
        
        try {
            if (bm.friendshipManager) {
                await bm.friendshipManager.applyFriendshipEffectsAtBattleStart();
            }
        } catch (error) {
            console.error('Error applying Friendship effects:', error);
        }
    }

    // Phase 0: Apply Nomu teleport shield effects (before all other effects)
    async applyNomuShieldEffects() {
        const bm = this.battleManager;
        
        try {
            await NomuHeroEffect.applyNomuShieldEffects(bm);
        } catch (error) {
            console.error('Error applying Nomu shield effects:', error);
        }
    }

    // Phase 1: Initialize arrow system effects
    async applyArrowEffects() {
        const bm = this.battleManager;
        
        try {
            applyArrowStartOfBattleEffects(bm);
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

            // ============================================
            // Apply Tearing Mountain effects
            // ============================================
            try {
                const { applyTearingMountainBattleEffects } = await import('./Spells/tearingMountain.js');
                await applyTearingMountainBattleEffects(bm);
            } catch (error) {
                console.error('Error applying Tearing Mountain effects:', error);
            }

            // ============================================
            // Apply Graveyard of Limited Power effects
            // ============================================
            try {
                const { applyGraveyardOfLimitedPowerBattleEffects } = await import('./Spells/graveyardOfLimitedPower.js');
                await applyGraveyardOfLimitedPowerBattleEffects(bm);
            } catch (error) {
                console.error('Error applying Graveyard of Limited Power effects:', error);
            }

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

                // Sync creature state to guest after potion effects
                if (bm.isAuthoritative && bm.sendBattleUpdate) {
                    bm.sendBattleUpdate('creature_state_sync', {
                        hostHeroes: this.exportHeroesCreatureState(bm.playerHeroes),
                        guestHeroes: this.exportHeroesCreatureState(bm.opponentHeroes),
                        timestamp: Date.now(),
                        reason: 'post_potion_effects'
                    });
                }
            }
        } catch (error) {
            console.error('Error applying potion effects:', error);
        }
    }

    // Helper method to export creature state
    exportHeroesCreatureState(heroes) {
        const exported = {};
        for (const position in heroes) {
            if (heroes[position]) {
                exported[position] = {
                    creatures: heroes[position].creatures || []
                };
            }
        }
        return exported;
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
        } catch (error) {
            console.error('Error applying hero start effects:', error);
        }


        // Waflav effects
        const { ThunderstruckWaflavHeroEffect } = await import('./Heroes/thunderstruckWaflav.js');
        await ThunderstruckWaflavHeroEffect.applyThunderstruckWaflavEffectsAtBattleStart(bm);
        
        const { FlamebathedWaflavHeroEffect } = await import('./Heroes/flamebathedWaflav.js');
        await FlamebathedWaflavHeroEffect.applyFlamebathedWaflavEffectsAtBattleStart(bm);

        const { DeepDrownedWaflavHeroEffect } = await import('./Heroes/deepDrownedWaflav.js');
        await DeepDrownedWaflavHeroEffect.applyDeepDrownedWaflavEffectsAtBattleStart(bm);


        // Apply Future Tech Drone HP bonuses
        try {
            const { FutureTechDroneCreature } = await import('./Creatures/futureTechDrone.js');
            FutureTechDroneCreature.applyStartOfBattleHPBonuses(bm);
            
            // Re-render creatures after Future Tech Drone effects
            if (bm.battleScreen && typeof bm.battleScreen.renderCreaturesAfterInit === 'function') {
                bm.battleScreen.renderCreaturesAfterInit();
            }

            // Update necromancy displays after HP changes
            if (bm.necromancyManager) {
                bm.necromancyManager.initializeNecromancyStackDisplays();
            }
            
        } catch (error) {
            console.error('Error applying Future Tech Drone effects:', error);
        }
    }

    // Phase 5: Apply delayed artifact effects (BloodSoakedCoin, PoisonedMeat, etc.)
    async applyDelayedArtifactEffects() {
        const bm = this.battleManager;
        
        try {
            const delayedEffects = await bm.getBothPlayersDelayedEffects();
            
            if (delayedEffects) {
                // Apply BloodSoakedCoin effects (blood toll damage) - NO CLEARING
                try {
                    const { applyBothPlayersBloodTollEffectsNoClear } = await import('./Artifacts/bloodSoakedCoin.js');
                    if (applyBothPlayersBloodTollEffectsNoClear) {
                        // Use new no-clear version if available
                        await applyBothPlayersBloodTollEffectsNoClear(delayedEffects.host, delayedEffects.guest, bm);
                    } else {
                        // Fallback to original function (which includes clearing)
                        const { applyBothPlayersBloodTollEffects } = await import('./Artifacts/bloodSoakedCoin.js');
                        await applyBothPlayersBloodTollEffects(delayedEffects.host, delayedEffects.guest, bm);
                    }
                    //bm.addCombatLog('🩸 Blood toll effects applied from both players', 'info');
                } catch (error) {
                    console.error('Error applying BloodSoakedCoin effects:', error);
                }

                // Apply PoisonedMeat effects (poison application) - NO CLEARING
                try {
                    const { applyBothPlayersDelayedEffectsNoClear } = await import('./Artifacts/poisonedMeat.js');
                    if (applyBothPlayersDelayedEffectsNoClear) {
                        // Use new no-clear version if available
                        await applyBothPlayersDelayedEffectsNoClear(delayedEffects.host, delayedEffects.guest, bm);
                    } else {
                        // Fallback to original function (which includes clearing)
                        const { applyBothPlayersDelayedEffects } = await import('./Artifacts/poisonedMeat.js');
                        await applyBothPlayersDelayedEffects(delayedEffects.host, delayedEffects.guest, bm);
                    }
                    //bm.addCombatLog('🥩 Poison curse effects applied from both players', 'info');
                } catch (error) {
                    console.error('Error applying PoisonedMeat effects:', error);
                }

                // This prevents the race condition where individual clearing functions overwrite each other
                await this.clearAllProcessedDelayedEffects(delayedEffects.host, delayedEffects.guest);
            }
        } catch (error) {
            console.error('Error applying delayed artifact effects:', error);
        }
    }

    // Centralized clearing function to prevent race condition
    async clearAllProcessedDelayedEffects(hostEffects, guestEffects) {
        const bm = this.battleManager;
        
        if (!bm.roomManager || !bm.roomManager.getRoomRef()) {
            return;
        }
        
        try {
            const roomRef = bm.roomManager.getRoomRef();
            
            // Filter out ALL processed delayed artifact effect types in one pass
            const filteredHostEffects = hostEffects ? hostEffects.filter(
                effect => !(
                    // BloodSoakedCoin effects
                    (effect.type === 'damage_all_player_heroes' && effect.source === 'BloodSoakedCoin') ||
                    // PoisonedMeat effects
                    (effect.type === 'poison_all_player_targets' && effect.source === 'PoisonedMeat')
                    // Add more delayed effect types here as needed
                )
            ) : [];
            
            const filteredGuestEffects = guestEffects ? guestEffects.filter(
                effect => !(
                    // BloodSoakedCoin effects
                    (effect.type === 'damage_all_player_heroes' && effect.source === 'BloodSoakedCoin') ||
                    // PoisonedMeat effects
                    (effect.type === 'poison_all_player_targets' && effect.source === 'PoisonedMeat')
                    // Add more delayed effect types here as needed
                )
            ) : [];
            
            // CRITICAL FIX: Update local heroSelection state for the HOST
            if (window.heroSelection && bm.isHost) {
                window.heroSelection.delayedArtifactEffects = filteredHostEffects || [];
            }
            
            // NEW: Send message to GUEST to clear their local state too
            if (bm.sendBattleUpdate) {
                bm.sendBattleUpdate('delayed_effects_cleared', {
                    clearedHostEffects: (hostEffects || []).length - filteredHostEffects.length,
                    clearedGuestEffects: (guestEffects || []).length - filteredGuestEffects.length,
                    newGuestEffects: filteredGuestEffects,
                    timestamp: Date.now()
                });
            }
            
            // Single Firebase write removes all processed delayed effect types
            await roomRef.child('gameState').update({
                hostDelayedArtifactEffects: filteredHostEffects.length > 0 ? filteredHostEffects : null,
                guestDelayedArtifactEffects: filteredGuestEffects.length > 0 ? filteredGuestEffects : null,
                allDelayedEffectsProcessedAt: Date.now()
            });
                        
        } catch (error) {
            console.error('Error clearing processed delayed effects (centralized):', error);
        }
    }

    // Phase 6: Apply equipment-based start effects
    async applyEquipmentStartEffects() {
        const bm = this.battleManager;
        
        try {
            if (bm.crusaderArtifactsHandler) {
                await bm.crusaderArtifactsHandler.applyStartOfBattleEffects();
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

            // Heart of the Mountain effects
            try {
                const { applyHeartOfMountainBattleEffects } = await import('./Artifacts/heartOfTheMountain.js');
                await applyHeartOfMountainBattleEffects(bm);
            } catch (error) {
                console.error('Error applying Heart of the Mountain effects:', error);
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