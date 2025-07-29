// artifactHandler.js - Centralized Artifact Handler Module
// Handles all artifact-specific drag/click behaviors without bloating core modules

export class ArtifactHandler {
    constructor() {
        this.loadedArtifacts = new Map(); // Cache for loaded artifact modules
        console.log('ArtifactHandler initialized');
    }

    // Main handler for artifact drag operations
    async handleArtifactDrag(cardIndex, cardName, heroSelection) {
        console.log(`🎯 ArtifactHandler: Processing drag for ${cardName}`);
        
        // Route to specific artifact handler
        switch(cardName) {
            case 'TreasureChest':
                return await this.handleTreasureChestDrag(cardIndex, cardName, heroSelection);
            
            case 'MagneticGlove':
                return await this.handleMagneticGloveDrag(cardIndex, cardName, heroSelection);
            
            default:
                // Try to handle as generic artifact
                return await this.handleGenericArtifactDrag(cardIndex, cardName, heroSelection);
        }
    }

    // Main handler for artifact click operations
    async handleArtifactClick(cardIndex, cardName, heroSelection) {
        console.log(`🎯 ArtifactHandler: Processing click for ${cardName}`);
        
        // Route to specific artifact handler
        switch(cardName) {
            case 'TreasureChest':
                return await this.handleTreasureChestClick(cardIndex, cardName, heroSelection);
            
            case 'MagneticGlove':
                return await this.handleMagneticGloveClick(cardIndex, cardName, heroSelection);
            
            default:
                // Try to handle as generic artifact
                return await this.handleGenericArtifactClick(cardIndex, cardName, heroSelection);
        }
    }

    // ===== TREASURE CHEST HANDLERS =====

    async handleTreasureChestDrag(cardIndex, cardName, heroSelection) {
        return await this.handleTreasureChestClick(cardIndex, cardName, heroSelection);
    }

    async handleTreasureChestClick(cardIndex, cardName, heroSelection) {
        try {
            const artifact = await this.loadArtifact('treasureChest');
            if (artifact && artifact.handleClick) {
                await artifact.handleClick(cardIndex, cardName, heroSelection);
                return true;
            } else {
                console.error('TreasureChest artifact missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load TreasureChest artifact:', error);
            return false;
        }
    }

    // ===== MAGNETIC GLOVE HANDLERS =====

    async handleMagneticGloveDrag(cardIndex, cardName, heroSelection) {
        return await this.handleMagneticGloveClick(cardIndex, cardName, heroSelection);
    }

    async handleMagneticGloveClick(cardIndex, cardName, heroSelection) {
        try {
            const artifact = await this.loadArtifact('magneticGlove');
            if (artifact && artifact.handleClick) {
                await artifact.handleClick(cardIndex, cardName, heroSelection);
                return true;
            } else {
                console.error('MagneticGlove artifact missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load MagneticGlove artifact:', error);
            return false;
        }
    }

    // ===== GENERIC ARTIFACT HANDLERS =====

    async handleGenericArtifactDrag(cardIndex, cardName, heroSelection) {
        return await this.handleGenericArtifactClick(cardIndex, cardName, heroSelection);
    }

    async handleGenericArtifactClick(cardIndex, cardName, heroSelection) {
        try {
            // Convert card name to module name (e.g., "ExampleCard" -> "exampleCard")
            const moduleName = this.cardNameToModuleName(cardName);
            const artifact = await this.loadArtifact(moduleName);
            
            if (artifact && artifact.handleClick) {
                await artifact.handleClick(cardIndex, cardName, heroSelection);
                return true;
            } else {
                console.log(`No artifact handler found for ${cardName}`);
                return false;
            }
        } catch (error) {
            console.log(`No artifact module found for ${cardName}:`, error.message);
            return false;
        }
    }

    // ===== UTILITY METHODS =====

    // Load artifact module with caching
    async loadArtifact(moduleName) {
        // Check cache first
        if (this.loadedArtifacts.has(moduleName)) {
            return this.loadedArtifacts.get(moduleName);
        }

        try {
            // Dynamic import
            const module = await import(`./Artifacts/${moduleName}.js`);
            
            // Look for the artifact export (e.g., treasureChestArtifact, magneticGloveArtifact)
            const artifactExportName = `${moduleName}Artifact`;
            const artifact = module[artifactExportName];
            
            if (artifact) {
                // Cache the loaded artifact
                this.loadedArtifacts.set(moduleName, artifact);
                console.log(`✅ Loaded artifact: ${moduleName}`);
                return artifact;
            } else {
                console.error(`Artifact export ${artifactExportName} not found in ${moduleName}.js`);
                return null;
            }
        } catch (error) {
            console.log(`Failed to load artifact ${moduleName}:`, error.message);
            return null;
        }
    }

    // Convert card name to module name
    cardNameToModuleName(cardName) {
        // Convert "CardName" to "cardName"
        return cardName.charAt(0).toLowerCase() + cardName.slice(1);
    }

    // Check if a card is a known artifact that can be dragged
    isDraggableArtifact(cardName) {
        const draggableArtifacts = [
            'TreasureChest',
            'MagneticGlove'
            // Add more artifacts here as they're implemented
        ];
        
        return draggableArtifacts.includes(cardName);
    }

    // Check if a card is a clickable artifact
    isClickableArtifact(cardName, cardInfo = null) {
        // If we have card info, check if it's an artifact type
        if (cardInfo && cardInfo.cardType === 'Artifact') {
            return true;
        }
        
        // Otherwise, check known clickable artifacts
        const clickableArtifacts = [
            'TreasureChest',
            'MagneticGlove'
            // Add more artifacts here as they're implemented
        ];
        
        return clickableArtifacts.includes(cardName);
    }

    // Pre-load specific artifacts (useful for state restoration)
    async preloadArtifact(cardName) {
        const moduleName = this.cardNameToModuleName(cardName);
        return await this.loadArtifact(moduleName);
    }

    // Pre-load all known artifacts
    async preloadAllArtifacts() {
        const knownArtifacts = ['treasureChest', 'magneticGlove'];
        
        console.log('🎯 Pre-loading all known artifacts...');
        
        const loadPromises = knownArtifacts.map(async (moduleName) => {
            try {
                await this.loadArtifact(moduleName);
                return { moduleName, success: true };
            } catch (error) {
                console.log(`Could not pre-load ${moduleName}:`, error.message);
                return { moduleName, success: false, error: error.message };
            }
        });
        
        const results = await Promise.all(loadPromises);
        const successCount = results.filter(r => r.success).length;
        
        console.log(`🎯 Pre-loaded ${successCount}/${knownArtifacts.length} artifacts`);
        return results;
    }

    // Get all loaded artifacts (for debugging)
    getLoadedArtifacts() {
        return Array.from(this.loadedArtifacts.keys());
    }

    // Clear artifact cache (for testing/development)
    clearCache() {
        this.loadedArtifacts.clear();
        console.log('🎯 Artifact cache cleared');
    }

    // Check if artifact supports drag operations
    async artifactSupportsDrag(cardName) {
        try {
            const moduleName = this.cardNameToModuleName(cardName);
            const artifact = await this.loadArtifact(moduleName);
            
            // Check if artifact has handleClick method (required for drag)
            return artifact && typeof artifact.handleClick === 'function';
        } catch (error) {
            return false;
        }
    }

    // Validate artifact module structure
    validateArtifactModule(artifact, moduleName) {
        if (!artifact) {
            console.error(`Artifact ${moduleName} is null or undefined`);
            return false;
        }
        
        if (typeof artifact.handleClick !== 'function') {
            console.error(`Artifact ${moduleName} missing required handleClick method`);
            return false;
        }
        
        console.log(`✅ Artifact ${moduleName} validation passed`);
        return true;
    }
}

// Create global instance
const artifactHandler = new ArtifactHandler();

// Export both the class and the instance
export { artifactHandler };

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.artifactHandler = artifactHandler;
    
    // Pre-load known artifacts on page load
    window.addEventListener('DOMContentLoaded', () => {
        artifactHandler.preloadAllArtifacts();
    });
}

// Legacy function exports for backward compatibility
export async function handleTreasureChestUse(cardIndex, cardName, heroSelection) {
    return await artifactHandler.handleTreasureChestClick(cardIndex, cardName, heroSelection);
}

export async function handleMagneticGloveUse(cardIndex, cardName, heroSelection) {
    return await artifactHandler.handleMagneticGloveClick(cardIndex, cardName, heroSelection);
}

export async function handleArtifactUse(cardIndex, cardName, heroSelection) {
    return await artifactHandler.handleArtifactClick(cardIndex, cardName, heroSelection);
}