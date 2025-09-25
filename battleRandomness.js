// battleRandomness.js - Deterministic Battle Randomness System
// Prevents cheating through reconnection by using seeded pseudo-random generation

export class BattleRandomness {
    constructor(seed = null) {
        // Generate a high-quality seed if none provided
        this.seed = seed || this.generateSeed();
        
        // Initialize the PRNG state
        this.state = this.hashSeed(this.seed);
        this.initialState = this.state;
        
        // Track how many random values have been generated
        this.callCount = 0;
        
        // Store the original seed for debugging/logging
        this.originalSeed = this.seed;
    }
    
    // Generate a cryptographically secure seed
    generateSeed() {
        const timestamp = Date.now().toString(36);
        const randomPart = this.generateSecureRandomString(32);
        const combinedSeed = `${timestamp}-${randomPart}`;
        
        // Add additional entropy from battle start conditions
        const additionalEntropy = this.gatherAdditionalEntropy();
        
        return `${combinedSeed}-${additionalEntropy}`;
    }
    
    // Generate secure random string for seed
    generateSecureRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        // Use crypto.getRandomValues if available, fallback to Math.random
        if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            for (let i = 0; i < length; i++) {
                result += chars[array[i] % chars.length];
            }
        } else {
            // Fallback for environments without crypto API
            for (let i = 0; i < length; i++) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
        }
        
        return result;
    }
    
    // Gather additional entropy from current battle conditions
    gatherAdditionalEntropy() {
        const factors = [
            typeof window !== 'undefined' ? window.innerWidth : 1920,
            typeof window !== 'undefined' ? window.innerHeight : 1080,
            new Date().getMilliseconds(),
            Math.floor(Math.random() * 1000000)
        ];
        
        return factors.join('x');
    }
    
    // Hash the seed to create initial PRNG state using a simple but effective hash
    hashSeed(seed) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Ensure positive number and add additional mixing
        hash = Math.abs(hash);
        if (hash === 0) hash = 1; // Avoid zero state
        
        // Additional mixing to improve distribution
        hash ^= hash >>> 13;
        hash *= 0x85ebca6b;
        hash ^= hash >>> 16;
        
        return Math.abs(hash) || 1;
    }
    
    // Core PRNG function using Linear Congruential Generator (LCG)
    // Uses parameters from Numerical Recipes for good distribution
    next() {
        this.callCount++;
        
        // LCG formula: (a * state + c) % m
        // Using constants from Numerical Recipes
        const a = 1664525;
        const c = 1013904223;
        const m = Math.pow(2, 32);
        
        this.state = (a * this.state + c) % m;
        
        return this.state;
    }
    
    // Get a random float between 0 and 1 (exclusive of 1)
    random() {
        return this.next() / Math.pow(2, 32);
    }
    
    // Get a random integer between min and max (inclusive)
    randomInt(min, max) {
        if (min > max) {
            [min, max] = [max, min]; // Swap if needed
        }
        
        const range = max - min + 1;
        return Math.floor(this.random() * range) + min;
    }
    
    // Get a random float between min and max
    randomFloat(min, max) {
        if (min > max) {
            [min, max] = [max, min]; // Swap if needed
        }
        
        return this.random() * (max - min) + min;
    }
    
    // Get a random boolean with optional probability
    randomBool(probability = 0.5) {
        return this.random() < probability;
    }
    
    // Choose a random element from an array
    randomChoice(array) {
        if (!Array.isArray(array) || array.length === 0) {
            return null;
        }
        
        const index = this.randomInt(0, array.length - 1);
        return array[index];
    }
    
    // Choose multiple random elements from an array (without replacement)
    randomChoices(array, count) {
        if (!Array.isArray(array) || array.length === 0 || count <= 0) {
            return [];
        }
        
        const shuffled = this.shuffle([...array]);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }
    
    // Shuffle an array using Fisher-Yates algorithm (deterministic)
    shuffle(array) {
        const result = [...array];
        
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.randomInt(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        
        return result;
    }
    
    // Random percentage roll (0-100)
    randomPercent() {
        return this.randomFloat(0, 100);
    }
    
    // Check if a percentage chance succeeds
    chance(percentage) {
        return this.randomPercent() < percentage;
    }
    
    // Get a random value from a weighted distribution
    weightedChoice(choices, weights) {
        if (!Array.isArray(choices) || !Array.isArray(weights) || 
            choices.length !== weights.length || choices.length === 0) {
            return null;
        }
        
        // Calculate total weight
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        if (totalWeight <= 0) return null;
        
        // Generate random value within total weight
        const randomValue = this.randomFloat(0, totalWeight);
        
        // Find which choice the random value falls into
        let currentWeight = 0;
        for (let i = 0; i < choices.length; i++) {
            currentWeight += weights[i];
            if (randomValue <= currentWeight) {
                return choices[i];
            }
        }
        
        // Fallback (shouldn't reach here)
        return choices[choices.length - 1];
    }
    
    // Generate a random UUID-like string (deterministic)
    randomId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += this.randomChoice(chars);
        }
        
        return result;
    }
    
    // Get a random element from an object's values
    randomObjectValue(obj) {
        const values = Object.values(obj);
        return this.randomChoice(values);
    }
    
    // Get a random key from an object
    randomObjectKey(obj) {
        const keys = Object.keys(obj);
        return this.randomChoice(keys);
    }
    
    // Generate random damage variance (common in games)
    randomDamageVariance(baseDamage, variancePercent = 10) {
        const variance = baseDamage * (variancePercent / 100);
        return Math.round(this.randomFloat(baseDamage - variance, baseDamage + variance));
    }
    
    // Generate random position in a range with normal distribution approximation
    randomNormal(mean, standardDeviation) {
        // Box-Muller transformation approximation using uniform distribution
        const u1 = this.random();
        const u2 = this.random();
        
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * standardDeviation + mean;
    }
    
    // Export state for persistence
    exportState() {
        return {
            seed: this.originalSeed,
            currentState: this.state,
            callCount: this.callCount,
            version: '1.0.0'
        };
    }
    
    // Import state from persistence
    importState(savedState) {
        if (!savedState || savedState.version !== '1.0.0') {
            console.warn('🎲 Invalid or incompatible randomness state, generating new seed');
            return false;
        }
        
        this.originalSeed = savedState.seed;
        this.seed = savedState.seed;
        this.state = savedState.currentState;
        this.callCount = savedState.callCount;
        this.initialState = this.hashSeed(this.seed);
        
        return true;
    }
    
    // Reset to initial state (useful for testing)
    reset() {
        this.state = this.initialState;
        this.callCount = 0;
    }
    
    // Get debug information
    getDebugInfo() {
        return {
            seed: this.originalSeed.slice(0, 16) + '...',
            currentState: this.state,
            callCount: this.callCount,
            lastValues: [] // Could track last few values for debugging
        };
    }
    
    // Test the randomness distribution (useful for development)
    testDistribution(samples = 10000) {
        const results = [];
        const originalState = this.state;
        const originalCallCount = this.callCount;
        
        // Generate test samples
        for (let i = 0; i < samples; i++) {
            results.push(this.random());
        }
        
        // Restore original state
        this.state = originalState;
        this.callCount = originalCallCount;
        
        // Calculate statistics
        const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
        const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / results.length;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            samples: samples,
            mean: mean,
            variance: variance,
            standardDeviation: standardDeviation,
            min: Math.min(...results),
            max: Math.max(...results),
            expectedMean: 0.5,
            expectedVariance: 1/12, // For uniform distribution on [0,1]
            expectedStdDev: Math.sqrt(1/12)
        };
    }
}

// Utility function to create a battle randomness instance
export function createBattleRandomness(seed = null) {
    return new BattleRandomness(seed);
}

// Export for window/global access if needed
if (typeof window !== 'undefined') {
    window.BattleRandomness = BattleRandomness;
    window.createBattleRandomness = createBattleRandomness;
}