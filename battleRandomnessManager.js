// battleRandomnessManager.js - Battle-specific Randomness Management
// Wraps BattleRandomness class with battle synchronization and fallback logic

import { BattleRandomness } from './battleRandomness.js';

export class BattleRandomnessManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.randomness = null;
        this.randomnessSeed = null;
        this.randomnessInitialized = false;
    }
    
    // ============================================
    // INITIALIZATION AND SYNCHRONIZATION
    // ============================================
    
    // Initialize randomness system (called by host only)
    initialize(seed = null) {
        if (!this.battleManager.isAuthoritative) {
            console.warn('⚠️ Only host should initialize randomness system');
            return false;
        }
        
        this.randomness = new BattleRandomness(seed);
        this.randomnessSeed = this.randomness.originalSeed;
        this.randomnessInitialized = true;
                
        // Send seed to guest immediately
        this.battleManager.sendBattleUpdate('randomness_seed', {
            seed: this.randomnessSeed,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    // Initialize randomness from received seed (called by guest)
    initializeFromSeed(seed) {
        if (this.battleManager.isAuthoritative) {
            console.warn('⚠️ Host should not receive randomness seed');
            return false;
        }
        
        this.randomness = new BattleRandomness(seed);
        this.randomnessSeed = seed;
        this.randomnessInitialized = true;
                
        return true;
    }
    
    // ============================================
    // CORE RANDOM NUMBER GENERATION
    // ============================================
    
    // Get a random number between 0 and 1
    getRandom() {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using Math.random() as fallback');
            return Math.random();
        }
        return this.randomness.random();
    }
    
    // Get a random integer between min and max (inclusive)
    getRandomInt(min, max) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using Math.random() as fallback');
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        return this.randomness.randomInt(min, max);
    }
    
    // Get a random float between min and max
    getRandomFloat(min, max) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using Math.random() as fallback');
            return Math.random() * (max - min) + min;
        }
        return this.randomness.randomFloat(min, max);
    }
    
    // Get a random boolean with optional probability
    getRandomBool(probability = 0.5) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using Math.random() as fallback');
            return Math.random() < probability;
        }
        return this.randomness.randomBool(probability);
    }
    
    // ============================================
    // ARRAY AND CHOICE OPERATIONS
    // ============================================
    
    // Choose a random element from an array
    getRandomChoice(array) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using Math.random() as fallback');
            if (!Array.isArray(array) || array.length === 0) return null;
            return array[Math.floor(Math.random() * array.length)];
        }
        return this.randomness.randomChoice(array);
    }
    
    // Choose multiple random elements from an array (without replacement)
    getRandomChoices(array, count) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using fallback');
            if (!Array.isArray(array) || array.length === 0 || count <= 0) return [];
            const shuffled = [...array].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, Math.min(count, shuffled.length));
        }
        return this.randomness.randomChoices(array, count);
    }
    
    // Shuffle an array deterministically
    shuffleArray(array) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using Math.random() as fallback');
            const result = [...array];
            for (let i = result.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [result[i], result[j]] = [result[j], result[i]];
            }
            return result;
        }
        return this.randomness.shuffle(array);
    }
    
    // ============================================
    // PERCENTAGE AND CHANCE OPERATIONS
    // ============================================
    
    // Random percentage roll (0-100)
    getRandomPercent() {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using Math.random() as fallback');
            return Math.random() * 100;
        }
        return this.randomness.randomPercent();
    }
    
    // Check if a percentage chance succeeds
    checkChance(percentage) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using Math.random() as fallback');
            return Math.random() * 100 < percentage;
        }
        return this.randomness.chance(percentage);
    }
    
    // ============================================
    // SPECIALIZED RANDOM OPERATIONS
    // ============================================
    
    // Get random damage variance
    getRandomDamageVariance(baseDamage, variancePercent = 10) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using Math.random() as fallback');
            const variance = baseDamage * (variancePercent / 100);
            return Math.round(Math.random() * (variance * 2) + (baseDamage - variance));
        }
        return this.randomness.randomDamageVariance(baseDamage, variancePercent);
    }
    
    // Weighted random choice
    getWeightedChoice(choices, weights) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using fallback weighted choice');
            if (!Array.isArray(choices) || !Array.isArray(weights) || 
                choices.length !== weights.length || choices.length === 0) {
                return null;
            }
            const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
            if (totalWeight <= 0) return null;
            const randomValue = Math.random() * totalWeight;
            let currentWeight = 0;
            for (let i = 0; i < choices.length; i++) {
                currentWeight += weights[i];
                if (randomValue <= currentWeight) {
                    return choices[i];
                }
            }
            return choices[choices.length - 1];
        }
        return this.randomness.weightedChoice(choices, weights);
    }
    
    // Generate random normal distribution (mean, standard deviation)
    getRandomNormal(mean, standardDeviation) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using fallback normal distribution');
            // Box-Muller approximation
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return z0 * standardDeviation + mean;
        }
        return this.randomness.randomNormal(mean, standardDeviation);
    }
    
    // Generate a random ID string
    getRandomId(length = 8) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized, using fallback ID generation');
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
            return result;
        }
        return this.randomness.randomId(length);
    }
    
    // ============================================
    // DEBUG AND STATE MANAGEMENT
    // ============================================
    
    // Get randomness debug info (development only)
    getRandomnessDebugInfo() {
        if (!this.randomnessInitialized) {
            return { status: 'not_initialized' };
        }
        
        return {
            status: 'active',
            ...this.randomness.getDebugInfo(),
            isHost: this.battleManager.isAuthoritative
        };
    }
    
    // Test randomness distribution (development only)
    testRandomnessDistribution(samples = 1000) {
        if (!this.randomnessInitialized) {
            console.warn('⚠️ Randomness not initialized');
            return null;
        }
        
        return this.randomness.testDistribution(samples);
    }
    
    // Export state for persistence
    exportState() {
        if (!this.randomnessInitialized || !this.randomness) {
            return null;
        }
        
        return {
            ...this.randomness.exportState(),
            initialized: true,
            exportedAt: Date.now(),
            exportedBy: this.battleManager.isAuthoritative ? 'host' : 'guest'
        };
    }
    
    // Import state from persistence
    importState(randomnessState) {
        if (!randomnessState || !randomnessState.initialized) {
            return false;
        }
        
        try {
            // Create randomness instance if it doesn't exist
            if (!this.randomness) {
                this.randomness = new BattleRandomness();
            }
            
            // Import the state
            const imported = this.randomness.importState(randomnessState);
            if (imported) {
                this.randomnessSeed = this.randomness.originalSeed;
                this.randomnessInitialized = true;
                return true;
            }
        } catch (error) {
            console.error('❌ Error importing randomness state:', error);
        }
        
        return false;
    }
    
    // Reset randomness system
    reset() {
        this.randomness = null;
        this.randomnessSeed = null;
        this.randomnessInitialized = false;
    }
    
    // Cleanup method
    cleanup() {
        this.reset();
        this.battleManager = null;
    }
    
    // ============================================
    // GETTERS FOR BACKWARD COMPATIBILITY
    // ============================================
    
    get seed() {
        return this.randomnessSeed;
    }
    
    get isInitialized() {
        return this.randomnessInitialized;
    }
    
    get callCount() {
        return this.randomness ? this.randomness.callCount : 0;
    }
}