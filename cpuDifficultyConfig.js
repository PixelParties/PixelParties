// cpuDifficultyConfig.js - Central configuration for CPU difficulty settings

/**
 * Difficulty configuration object
 * All values organized by difficulty level: Easy, Normal, Hard
 */
export const DIFFICULTY_CONFIG = {
    // Smart Draft Settings
    smartDraft: {
        activationMultiplier: {
            Easy: 0.5,
            Normal: 1.0,
            Hard: 1.5
        }
    },

    // Hero Positioning Settings
    positioning: {
        randomChance: {
            Easy: 0.50,    // 50% random positioning
            Normal: 0.15,  // 15% random positioning
            Hard: 0.05     // 5% random positioning
        },
        preferredPositionMultiplier: {
            Easy: 2.0,
            Normal: 3.0,
            Hard: 4.0
        }
    },

    // Potion Settings
    potions: {
        baseUsages: {
            Easy: 1,
            Normal: 1,
            Hard: 2
        },
        activationChance: {
            Easy: 0.05,    // 5% activation
            Normal: 0.10,  // 10% activation
            Hard: 0.20     // 20% activation
        }
    },

    // Ascension Settings
    ascension: {
        moniaBeato: {
            Easy: 0.10,    // 10% chance
            Normal: 0.25,  // 25% chance
            Hard: 0.35     // 35% chance
        },
        waflavEvolution: {
            Easy: 0.20,    // 20% chance
            Normal: 0.33,  // 33% chance
            Hard: 0.50     // 50% chance
        },
        evolutionCounterGain: {
            Easy: { min: 1, max: 2 },
            Normal: { min: 1, max: 3 },
            Hard: { min: 2, max: 5 }
        }
    },

    // Hero-Specific Effects
    heroEffects: {
        heinz: {
            millingMultiplier: {
                Easy: 0.8,
                Normal: 1.1,
                Hard: 2.0
            },
            millingCap: {
                Easy: 6,
                Normal: 8,
                Hard: 14
            }
        },
        vacarn: {
            summonChance: {
                Easy: 0.80,   // 80%
                Normal: 0.90, // 90%
                Hard: 1.00    // 100%
            }
        },
        luna: {
            buffMultiplierRange: {
                Easy: { min: 0.3, max: 1.0 },
                Normal: { min: 0.5, max: 2.0 },
                Hard: { min: 1.0, max: 3.0 }
            }
        }
    },

    // Hero Selection Settings
    heroSelection: {
        compatibilityWantsMultiplier: {
            Easy: 1.1,
            Normal: 1.2,
            Hard: 1.3
        },
        compatibilityAvoidsMultiplier: {
            Easy: 0.85,
            Normal: 0.7,
            Hard: 0.6
        }
    },

    // Creature Settings
    creatures: {
        cuteBirdEvolution: {
            baseChance: {
                Easy: 0.10,   // 10%
                Normal: 0.10, // 10%
                Hard: 0.25    // 25%
            }
        }
    },

    // Resource Settings
    resources: {
        goldGainMultiplier: {
            Easy: 0.5,
            Normal: 1.0,
            Hard: 2.0
        }
    }
};

/**
 * Get configuration value for a specific difficulty
 * @param {string} difficulty - 'Easy', 'Normal', or 'Hard'
 * @param {string} category - Top-level category (e.g., 'potions')
 * @param {string} setting - Setting name (e.g., 'baseUsages')
 * @returns {*} Configuration value
 */
export function getDifficultyValue(difficulty, category, setting) {
    if (!difficulty) difficulty = 'Normal'; // Default to Normal
    
    const categoryConfig = DIFFICULTY_CONFIG[category];
    if (!categoryConfig) {
        console.error(`Unknown difficulty category: ${category}`);
        return null;
    }

    const settingConfig = categoryConfig[setting];
    if (!settingConfig) {
        console.error(`Unknown difficulty setting: ${category}.${setting}`);
        return null;
    }

    const value = settingConfig[difficulty];
    if (value === undefined) {
        console.error(`Unknown difficulty level: ${difficulty} for ${category}.${setting}`);
        return settingConfig['Normal']; // Fallback to Normal
    }

    return value;
}

/**
 * Validate difficulty string
 * @param {string} difficulty - Difficulty to validate
 * @returns {string} Valid difficulty string (defaults to 'Normal' if invalid)
 */
export function validateDifficulty(difficulty) {
    const valid = ['Easy', 'Normal', 'Hard'];
    return valid.includes(difficulty) ? difficulty : 'Normal';
}