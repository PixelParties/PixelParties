// bladeOfTheFrostbringer.js - Blade of the Frostbringer Equipment Artifact

/**
 * Blade of the Frostbringer
 * Type: Artifact - Equip
 * Effect: When the equipped hero hits a target with a basic attack,
 *         there is a 20% chance to inflict 1 stack of Frozen on the target.
 *         Each equipped blade has its own independent chance.
 */

export const bladeOfTheFrostbringerArtifact = {
    name: 'BladeOfTheFrostbringer',
    displayName: 'Blade of the Frostbringer',
    type: 'Artifact',
    subtype: 'Equip',
    cost: 4, // Adjust cost as needed for game balance
    
    // This is an equip artifact, so it doesn't have a click handler
    // The effect is handled by the AttackEffectsManager
    handleClick: null,
    
    // Metadata for the effect
    effectData: {
        trigger: 'on_attack_hit',
        chance: 0.20,
        statusEffect: 'frozen',
        stacks: 1,
        description: '20% chance to freeze target on attack'
    },
    
    // Get formatted description for tooltips
    getDescription() {
        return `When equipped hero attacks, 20% chance to freeze the target for 1 turn. Multiple blades roll independently.`;
    },
    
    // Visual effect data
    visualEffect: {
        icon: '❄️',
        color: '#64c8ff',
        animation: 'ice_burst'
    }
};

// Export for artifact handler registration
export default bladeOfTheFrostbringerArtifact;