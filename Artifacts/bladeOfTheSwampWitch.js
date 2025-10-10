// bladeOfTheSwampWitch.js - Blade of the Swamp Witch Equipment Artifact

/**
 * Blade of the Swamp Witch
 * Type: Artifact - Equip
 * Effect: When the equipped hero hits a target with a basic attack,
 *         always inflicts 1 stack of Poisoned on the target.
 *         Each equipped blade applies poison independently.
 */

export const bladeOfTheSwampWitchArtifact = {
    name: 'BladeOfTheSwampWitch',
    displayName: 'Blade of the Swamp Witch',
    type: 'Artifact',
    subtype: 'Equip',
    cost: 4, // Adjust cost as needed for game balance
    
    // This is an equip artifact, so it doesn't have a click handler
    // The effect is handled by the AttackEffectsManager
    handleClick: null,
    
    // Metadata for the effect
    effectData: {
        trigger: 'on_attack_hit',
        chance: 1.0, // Always triggers (100%)
        statusEffect: 'poisoned',
        stacks: 1,
        description: 'Always poisons target on attack'
    },
    
    // Get formatted description for tooltips
    getDescription() {
        return `When equipped hero attacks, always poisons the target for 1 stack. Multiple blades stack independently.`;
    },
    
    // Visual effect data
    visualEffect: {
        icon: '☠️',
        color: '#800080',
        animation: 'poison_cloud'
    }
};

// Export for artifact handler registration
export default bladeOfTheSwampWitchArtifact;