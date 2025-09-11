// artifactHandler.js - Enhanced Centralized Artifact Handler with Exclusive Artifact Management

export class ArtifactHandler {
    constructor() {
        this.loadedArtifacts = new Map(); // Cache for loaded artifact modules
        this.exclusiveArtifactActive = null; // Track currently active exclusive artifact
        this.exclusiveActivatedAt = null; // Timestamp when exclusive was activated
        this.permanentArtifacts = []; // Track permanent artifacts used this game
    }

    // ===== EXCLUSIVE ARTIFACT MANAGEMENT =====

    // Check if any exclusive artifact is currently active
    isExclusiveArtifactActive() {
        return this.exclusiveArtifactActive !== null;
    }

    // Get the name of the currently active exclusive artifact
    getActiveExclusiveArtifact() {
        return this.exclusiveArtifactActive;
    }

    // Set an exclusive artifact as active
    setExclusiveArtifactActive(cardName) {
        this.exclusiveArtifactActive = cardName;
        this.exclusiveActivatedAt = Date.now();
    }

    // Clear the active exclusive artifact
    clearExclusiveArtifactActive() {
        this.exclusiveArtifactActive = null;
        this.exclusiveActivatedAt = null;
    }

    // Check if a specific exclusive artifact can be activated
    // NOTE: With entire hand disabling, this is mainly used for internal logic and debugging
    canActivateExclusiveArtifact(cardName, heroSelection) {
        // Check if this is an exclusive artifact
        if (!this.isExclusiveArtifact(cardName, heroSelection)) {
            return { canActivate: true }; // Non-exclusive artifacts can always activate
        }

        // If no exclusive artifact is active, this one can activate
        if (!this.isExclusiveArtifactActive()) {
            return { canActivate: true };
        }

        // If the same exclusive artifact is trying to activate (shouldn't happen normally)
        if (this.exclusiveArtifactActive === cardName) {
            return { 
                canActivate: false, 
                reason: `${this.formatCardName(cardName)} is already active!`
            };
        }

        // Another exclusive artifact is active
        const activeArtifactFormatted = this.formatCardName(this.exclusiveArtifactActive);
        return {
            canActivate: false,
            reason: `Cannot use ${this.formatCardName(cardName)} while ${activeArtifactFormatted} is active!`,
            activeArtifact: this.exclusiveArtifactActive
        };
    }

    // Check if an artifact is exclusive
    isExclusiveArtifact(cardName, heroSelection) {
        // Get card info to check for exclusive attribute
        const cardInfo = heroSelection?.getCardInfo ? heroSelection.getCardInfo(cardName) : null;
        
        if (cardInfo && cardInfo.exclusive === true) {
            return true;
        }

        // Fallback: hardcoded list of exclusive artifacts for backwards compatibility
        const exclusiveArtifacts = ['MagneticGlove'];
        return exclusiveArtifacts.includes(cardName);
    }

    // Show exclusive restriction error
    showExclusiveRestrictionError(reason, event) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'exclusive-restriction-error';
        errorDiv.innerHTML = `
            <div class="exclusive-error-content">
                <span class="exclusive-error-icon">🔐</span>
                <span class="exclusive-error-text">${reason}</span>
            </div>
        `;
        
        // Position near the cursor or card
        const x = event ? event.clientX : window.innerWidth / 2;
        const y = event ? event.clientY : window.innerHeight / 2;
        
        errorDiv.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y - 50}px;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #6f42c1 0%, #495057 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            animation: exclusiveErrorBounce 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(111, 66, 193, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after animation
        setTimeout(() => {
            errorDiv.style.animation = 'exclusiveErrorFade 0.3s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2500);
    }


    // ===== PERMANENT ARTIFACT TRACKING =====

    // Check if an artifact is permanent
    isPermanentArtifact(cardName, heroSelection) {
        // Get card info to check for permanent subtype
        const cardInfo = heroSelection?.getCardInfo ? heroSelection.getCardInfo(cardName) : null;
        return cardInfo && cardInfo.cardType === 'Artifact' && cardInfo.subtype === 'Permanent';
    }

    // Add a permanent artifact to the tracking list
    addPermanentArtifact(cardName) {
        const permanentArtifact = {
            name: cardName,
            usedAt: Date.now(),
            id: this.generatePermanentArtifactId()
        };
        
        this.permanentArtifacts.push(permanentArtifact);
    }

    // Generate unique ID for permanent artifacts
    generatePermanentArtifactId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Get all permanent artifacts used this game
    getPermanentArtifacts() {
        return [...this.permanentArtifacts];
    }

    // Get count of permanent artifacts
    getPermanentArtifactCount() {
        return this.permanentArtifacts.length;
    }

    // Reset permanent artifacts (for new games only)
    resetPermanentArtifacts() {
        const count = this.permanentArtifacts.length;
        this.permanentArtifacts = [];
    }



    // ===== ENHANCED ARTIFACT HANDLERS =====

    // Main handler for artifact drag operations - simplified for entire hand disabling
    async handleArtifactDrag(cardIndex, cardName, heroSelection) {
        // For exclusive artifacts, the hand disabling is handled at the HandManager level
        // We just need to proceed with normal artifact handling since the HandManager
        // already prevents drags when any exclusive artifact is active
        
        switch(cardName) {
            case 'TreasureChest':
                return await this.handleTreasureChestDrag(cardIndex, cardName, heroSelection);
            
            case 'MagneticGlove':
                return await this.handleMagneticGloveDrag(cardIndex, cardName, heroSelection);
            
            default:
                return await this.handleGenericArtifactDrag(cardIndex, cardName, heroSelection);
        }
    }

    // Main handler for artifact click operations - simplified for entire hand disabling
    async handleArtifactClick(cardIndex, cardName, heroSelection) {
        // Check if it's an equip artifact - these should NOT be handled on click
        const cardInfo = heroSelection?.getCardInfo ? heroSelection.getCardInfo(cardName) : null;
        if (cardInfo && cardInfo.cardType === 'Artifact' && cardInfo.subtype === 'Equip') {
            // Don't handle equip artifacts on click - they should only be drag-and-dropped
            return false;
        }
        
        // For exclusive artifacts, the hand disabling is handled at the HandManager level
        // We just need to proceed with normal artifact handling since the HandManager
        // already prevents clicks when any exclusive artifact is active
        
        switch(cardName) {
            case 'TreasureChest':
                return await this.handleTreasureChestClick(cardIndex, cardName, heroSelection);
            
            case 'MagneticGlove':
                return await this.handleMagneticGloveClick(cardIndex, cardName, heroSelection);
            
            default:
                return await this.handleGenericArtifactClick(cardIndex, cardName, heroSelection);
        }
    }

    // ===== EXISTING HANDLERS (unchanged) =====

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

    async handleGenericArtifactDrag(cardIndex, cardName, heroSelection) {
        return await this.handleGenericArtifactClick(cardIndex, cardName, heroSelection);
    }

    async handleGenericArtifactClick(cardIndex, cardName, heroSelection) {
        try {
            const moduleName = this.cardNameToModuleName(cardName);
            
            const artifact = await this.loadArtifact(moduleName);
            
            if (artifact && artifact.handleClick) {
                await artifact.handleClick(cardIndex, cardName, heroSelection);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    // ===== STATE PERSISTENCE =====

    // Export exclusive artifact state for saving
    exportExclusiveState() {
        return {
            exclusiveArtifactActive: this.exclusiveArtifactActive,
            exclusiveActivatedAt: this.exclusiveActivatedAt
        };
    }

    // Import exclusive artifact state for loading
    importExclusiveState(stateData) {
        if (stateData) {
            this.exclusiveArtifactActive = stateData.exclusiveArtifactActive || null;
            this.exclusiveActivatedAt = stateData.exclusiveActivatedAt || null;
        }
    }

    // Export permanent artifacts state for saving
    exportPermanentArtifactsState() {
        return {
            permanentArtifacts: [...this.permanentArtifacts],
            exportedAt: Date.now()
        };
    }

    // Import permanent artifacts state for loading
    importPermanentArtifactsState(stateData) {
        if (stateData && Array.isArray(stateData.permanentArtifacts)) {
            this.permanentArtifacts = [...stateData.permanentArtifacts];
            return true;
        }
        return false;
    }

    // Reset exclusive state
    resetExclusiveState() {
        this.exclusiveArtifactActive = null;
        this.exclusiveActivatedAt = null;
    }

    // ===== UTILITY METHODS (unchanged) =====

    async loadArtifact(moduleName) {
        if (this.loadedArtifacts.has(moduleName)) {
            return this.loadedArtifacts.get(moduleName);
        }

        try {
            const module = await import(`./Artifacts/${moduleName}.js`);
            const artifactExportName = `${moduleName}Artifact`;
            const artifact = module[artifactExportName];
            
            if (artifact) {
                this.loadedArtifacts.set(moduleName, artifact);
                return artifact;
            } else {
                console.error(`Artifact export ${artifactExportName} not found in ${moduleName}.js`);
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    cardNameToModuleName(cardName) {
        return (cardName.charAt(0).toLowerCase() + cardName.slice(1));
    }

    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    isDraggableArtifact(cardName) {
        const draggableArtifacts = ['TreasureChest', 'MagneticGlove', 'poisonedMeat', 'Wheels', 'AlchemicJournal', 'TreasureHuntersBackpack', 'MagicCobalt', 'MagicTopaz', 'MagicAmethyst', 'MagicSapphire', 'MagicRuby', 'MagicEmerald', 'CloudPillow', 'StormRing', 'FutureTechLamp', 'FutureTechFists', 'FutureTechCopyDevice', 'BirthdayPresent', 'AncientTechInfiniteEnergyCore', 'BloodSoakedCoin', 'StaffOfTheTeleporter', 'GoldenBananas' ];
        return draggableArtifacts.includes(cardName);
    }

    isClickableArtifact(cardName, cardInfo = null) {
        if (cardInfo && cardInfo.cardType === 'Artifact') {
            return true;
        }
        
        const clickableArtifacts = ['TreasureChest', 'MagneticGlove', 'poisonedMeat', 'Wheels', 'AlchemicJournal', 'TreasureHuntersBackpack', 'MagicCobalt', 'MagicTopaz', 'MagicAmethyst', 'MagicSapphire', 'MagicRuby', 'MagicEmerald', 'CloudPillow', 'StormRing', 'FutureTechLamp', 'FutureTechCopyDevice', 'BirthdayPresent', 'BloodSoakedCoin', 'StaffOfTheTeleporter', 'GoldenBananas' ];

        return clickableArtifacts.includes(cardName);
    }

    async preloadArtifact(cardName) {
        const moduleName = this.cardNameToModuleName(cardName);
        return await this.loadArtifact(moduleName);
    }

    async preloadAllArtifacts() {
        // Use card names in PascalCase, then convert them to proper module names
        const knownCardNames = [
            'TreasureChest', 
            'MagneticGlove', 
            'PoisonedMeat', 
            'Wheels', 
            'AlchemicJournal', 
            'TreasureHuntersBackpack', 
            'MagicCobalt', 
            'MagicTopaz', 
            'MagicAmethyst', 
            'MagicSapphire', 
            'MagicRuby', 
            'MagicEmerald',
            'CloudPillow', 
            'StormRing',
            'FutureTechLamp',
            'FutureTechFists', 
            'FutureTechCopyDevice',
            'BirthdayPresent',
            'AncientTechInfiniteEnergyCore',
            'BloodSoakedCoin', 
            'StaffOfTheTeleporter',
            'GoldenBananas' 
        ];
        
        // Convert card names to proper module names using the existing method
        const moduleNames = knownCardNames.map(cardName => this.cardNameToModuleName(cardName));
        
        const loadPromises = moduleNames.map(async (moduleName) => {
            try {
                await this.loadArtifact(moduleName);
                return { moduleName, success: true };
            } catch (error) {
                return { moduleName, success: false, error: error.message };
            }
        });
        
        const results = await Promise.all(loadPromises);
        return results;
    }

    getLoadedArtifacts() {
        return Array.from(this.loadedArtifacts.keys());
    }

    clearCache() {
        this.loadedArtifacts.clear();
    }

    async artifactSupportsDrag(cardName) {
        try {
            const moduleName = this.cardNameToModuleName(cardName);
            const artifact = await this.loadArtifact(moduleName);
            return artifact && typeof artifact.handleClick === 'function';
        } catch (error) {
            return false;
        }
    }

    // Reset all artifact handler state (for new games)
    reset() {
        this.resetExclusiveState();
        this.resetPermanentArtifacts();
    }

    validateArtifactModule(artifact, moduleName) {
        if (!artifact) {
            console.error(`Artifact ${moduleName} is null or undefined`);
            return false;
        }
        
        if (typeof artifact.handleClick !== 'function') {
            console.error(`Artifact ${moduleName} missing required handleClick method`);
            return false;
        }
        
        return true;
    }
}

// Create global instance
const artifactHandler = new ArtifactHandler();

// Add CSS for exclusive restriction errors
if (typeof document !== 'undefined' && !document.getElementById('exclusiveRestrictionStyles')) {
    const style = document.createElement('style');
    style.id = 'exclusiveRestrictionStyles';
    style.textContent = `
        @keyframes exclusiveErrorBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes exclusiveErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        .exclusive-restriction-error {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        
        .exclusive-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .exclusive-error-icon {
            font-size: 20px;
            filter: drop-shadow(0 0 3px rgba(111, 66, 193, 0.8));
        }
        
        .exclusive-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        /* Visual indicator for blocked exclusive artifacts in hand */
        .hand-card[data-exclusive-blocked="true"] {
            position: relative;
            opacity: 0.6;
            filter: grayscale(40%);
        }
        
        .hand-card[data-exclusive-blocked="true"]::after {
            content: "🔐";
            position: absolute;
            top: 5px;
            left: 5px;
            font-size: 18px;
            filter: drop-shadow(0 0 3px rgba(111, 66, 193, 0.8));
            animation: exclusiveBlockedPulse 2s ease-in-out infinite;
        }
        
        @keyframes exclusiveBlockedPulse {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

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
