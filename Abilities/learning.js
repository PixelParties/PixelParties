// learning.js - Learning Ability Handler
export class LearningAbility {
    constructor() {
        this.name = 'Learning';
    }

    /**
     * Get the Learning ability level for a hero at a specific position
     * @param {Object} heroSelection - The heroSelection instance
     * @param {string} heroPosition - The position ('left', 'center', 'right')
     * @returns {number} The total Learning level (number of Learning abilities)
     */
    getLearningLevel(heroSelection, heroPosition) {
        if (!heroSelection || !heroPosition) return 0;
        
        const heroAbilities = heroSelection.heroAbilitiesManager?.getHeroAbilities(heroPosition);
        if (!heroAbilities) return 0;
        
        let learningLevel = 0;
        
        ['zone1', 'zone2', 'zone3'].forEach(zone => {
            if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                const learningAbilities = heroAbilities[zone].filter(ability => 
                    ability && ability.name === 'Learning'
                );
                learningLevel += learningAbilities.length;
            }
        });
        
        return learningLevel;
    }

    /**
     * Calculate the effective spell level a hero can cast with Learning bonus
     * @param {Object} heroSelection - The heroSelection instance
     * @param {string} heroPosition - The position ('left', 'center', 'right')
     * @param {string} spellSchool - The spell school name
     * @param {number} baseSpellLevel - The base spell level requirement
     * @returns {Object} Object with spellSchoolLevel, learningLevel, and effectiveLevel
     */
    calculateEffectiveSpellLevel(heroSelection, heroPosition, spellSchool, baseSpellLevel) {
        if (!heroSelection || !heroPosition) {
            return {
                spellSchoolLevel: 0,
                learningLevel: 0,
                effectiveLevel: 0
            };
        }
        
        const heroAbilities = heroSelection.heroAbilitiesManager?.getHeroAbilities(heroPosition);
        if (!heroAbilities) {
            return {
                spellSchoolLevel: 0,
                learningLevel: 0,
                effectiveLevel: 0
            };
        }
        
        // Count spell school abilities
        let spellSchoolLevel = 0;
        ['zone1', 'zone2', 'zone3'].forEach(zone => {
            if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                const schoolAbilities = heroAbilities[zone].filter(ability => 
                    ability && ability.name === spellSchool
                );
                spellSchoolLevel += schoolAbilities.length;
            }
        });
        
        // Get Learning level
        const learningLevel = this.getLearningLevel(heroSelection, heroPosition);
        
        // Calculate effective level (spell school + learning)
        const effectiveLevel = spellSchoolLevel + learningLevel;
        
        return {
            spellSchoolLevel,
            learningLevel,
            effectiveLevel
        };
    }
}

// Create singleton instance
export const learningAbility = new LearningAbility();

// Make available globally
if (typeof window !== 'undefined') {
    window.learningAbility = learningAbility;
}