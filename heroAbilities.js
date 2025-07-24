// heroAbilities.js - Hero Ability Zones Management Module with Turn-Based Attachment Limits

import { getCardInfo } from './cardDatabase.js';

export class HeroAbilitiesManager {
    constructor() {
        // Track ability zones for each hero position
        // Each hero has 3 zones, each zone can have stacked abilities
        this.heroAbilityZones = {
            left: {
                zone1: [],  // Array of ability cards (can have duplicates of same ability)
                zone2: [],
                zone3: []
            },
            center: {
                zone1: [],
                zone2: [],
                zone3: []
            },
            right: {
                zone1: [],
                zone2: [],
                zone3: []
            }
        };
        
        // Track which abilities each hero has (for uniqueness check)
        this.heroAbilityRegistry = {
            left: new Set(),    // Set of unique ability names this hero has
            center: new Set(),
            right: new Set()
        };
        
        // NEW: Track which heroes have received an ability this turn
        this.heroAbilityAttachedThisTurn = {
            left: false,
            center: false,
            right: false
        };
        
        // References to other managers (will be set by heroSelection)
        this.handManager = null;
        this.formationManager = null;
        this.onStateChange = null; // Callback for when state changes
        
        console.log('HeroAbilitiesManager initialized with turn-based attachment limits');
    }

    // Initialize with references to other managers
    init(handManager, formationManager, onStateChange) {
        this.handManager = handManager;
        this.formationManager = formationManager;
        this.onStateChange = onStateChange;
        console.log('HeroAbilitiesManager initialized with manager references');
    }

    //Helper function for CamelCase
    formatAbilityName(abilityName) {
        if (!abilityName || typeof abilityName !== 'string') {
            return abilityName;
        }
        
        // Convert camelCase to spaced words
        // This regex finds lowercase letters followed by uppercase letters
        // and inserts a space between them
        return abilityName.replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    // === NEW TURN-BASED METHODS ===

    // Check if a hero can receive an ability this turn
    canHeroReceiveAbilityThisTurn(heroPosition) {
        if (!this.heroAbilityAttachedThisTurn.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return false;
        }
        
        return !this.heroAbilityAttachedThisTurn[heroPosition];
    }

    // Mark that a hero has received an ability this turn
    markHeroReceivedAbility(heroPosition) {
        if (this.heroAbilityAttachedThisTurn.hasOwnProperty(heroPosition)) {
            this.heroAbilityAttachedThisTurn[heroPosition] = true;
            console.log(`${heroPosition} hero marked as having received ability this turn`);
        }
    }

    // Reset turn-based tracking (called after battle)
    resetTurnBasedTracking() {
        this.heroAbilityAttachedThisTurn = {
            left: false,
            center: false,
            right: false
        };
        console.log('Turn-based ability attachment tracking reset for new turn');
    }

    // Check if there's a hero at the given position
    hasHeroAtPosition(heroPosition) {
        // Validate position
        if (!this.heroAbilityZones.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return false;
        }
        
        // Use the direct reference to FormationManager
        if (this.formationManager) {
            const formation = this.formationManager.getBattleFormation();
            const hasHero = formation && formation[heroPosition] !== null && formation[heroPosition] !== undefined;
            
            if (!hasHero) {
                console.log(`No hero in formation at position: ${heroPosition}`);
            }
            
            return hasHero;
        }
        
        // If FormationManager is not available, log an error
        console.error('FormationManager reference not available in HeroAbilitiesManager');
        return false;
    }

    // === SIMPLIFIED DRAG & DROP HANDLER ===

    // Check if a card is an ability card
    isAbilityCard(cardName) {
        const cardInfo = getCardInfo(cardName);
        return cardInfo && cardInfo.cardType === 'Ability';
    }

    // Handle team slot drag over (for ability cards)
    handleTeamSlotDragOver(event, heroPosition) {
        console.log('🎯 handleTeamSlotDragOver called for position:', heroPosition);
        
        // Check if we're dragging a hand card
        if (!this.handManager || !this.handManager.isHandDragging()) {
            console.log('🎯 No hand dragging detected');
            return false;
        }
        
        const dragState = this.handManager.getHandDragState();
        const cardName = dragState.draggedCardName;
        console.log('🎯 Dragged card name:', cardName);
        
        // Only allow drop if it's an ability card
        if (!this.isAbilityCard(cardName)) {
            console.log('🎯 Not an ability card');
            return false;
        }
        
        // Check if there's actually a hero in this slot
        if (!this.hasHeroAtPosition(heroPosition)) {
            console.log('🎯 No hero at position:', heroPosition);
            return false;
        }
        
        // Check if this hero can receive abilities this turn
        if (!this.canHeroReceiveAbilityThisTurn(heroPosition)) {
            console.log('🎯 Hero cannot receive abilities this turn');
            return false;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        // Set drop effect
        event.dataTransfer.dropEffect = 'move';
        
        console.log('🎯 All checks passed, returning true');
        return true;
    }

    // Get tooltip info for dragging ability over a slot
    getAbilityDropTooltipInfo(heroPosition) {
        // Check if there's a hero in this position
        if (!this.hasHeroAtPosition(heroPosition)) {
            return {
                type: 'empty',
                message: "You can't attach Abilities to empty slots!",
                canDrop: false
            };
        }
        
        // Check if hero can receive abilities this turn
        if (!this.canHeroReceiveAbilityThisTurn(heroPosition)) {
            return {
                type: 'limit-reached',
                message: "You can only attach 1 Ability per turn!",
                canDrop: false
            };
        }
        
        // Get hero name from formation
        let heroName = 'Hero';
        if (this.formationManager) {
            const formation = this.formationManager.getBattleFormation();
            if (formation[heroPosition]) {
                heroName = formation[heroPosition].name;
            }
        }
        
        // Get ability name from drag state and FORMAT it
        let abilityName = 'Ability';
        if (this.handManager) {
            const dragState = this.handManager.getHandDragState();
            if (dragState.draggedCardName) {
                // FORMAT the camelCase name to include spaces
                abilityName = this.formatAbilityName(dragState.draggedCardName);
            }
        }
        
        return {
            type: 'can-attach',
            message: `Attach ${abilityName} to ${heroName}`,
            canDrop: true,
            heroName: heroName,
            abilityName: abilityName
        };
    }

    ensureValidZoneStructure(heroPosition) {
        // Ensure the position exists
        if (!this.heroAbilityZones[heroPosition]) {
            this.heroAbilityZones[heroPosition] = {};
        }
        
        // Ensure all three zones exist
        for (let i = 1; i <= 3; i++) {
            const zoneName = `zone${i}`;
            if (!this.heroAbilityZones[heroPosition][zoneName]) {
                this.heroAbilityZones[heroPosition][zoneName] = [];
                console.warn(`Repaired missing ${zoneName} for ${heroPosition} hero`);
            }
        }
        
        // Ensure registry exists
        if (!this.heroAbilityRegistry[heroPosition]) {
            this.heroAbilityRegistry[heroPosition] = new Set();
        }
        
        // Ensure turn tracking exists
        if (this.heroAbilityAttachedThisTurn[heroPosition] === undefined) {
            this.heroAbilityAttachedThisTurn[heroPosition] = false;
        }
    }

    // Handle team slot drop (for ability cards)
    async handleTeamSlotDrop(event, heroPosition) {
        event.preventDefault();
        event.stopPropagation();
        
        // Check if we're dragging a hand card
        if (!this.handManager || !this.handManager.isHandDragging()) {
            return false;
        }
        
        const dragState = this.handManager.getHandDragState();
        const cardName = dragState.draggedCardName;
        const cardIndex = dragState.draggedCardIndex;
        
        // Only allow drop if it's an ability card
        if (!this.isAbilityCard(cardName)) {
            console.log(`${cardName} is not an ability card, cannot drop on hero`);
            this.handManager.handleInvalidDrop();
            return false;
        }
        
        // NEW: Check if there's actually a hero in this slot
        if (!this.hasHeroAtPosition(heroPosition)) {
            console.log(`No hero in ${heroPosition} position, cannot attach ability`);
            this.handManager.handleInvalidDrop();
            return false;
        }
        
        // Check turn-based limitation
        if (!this.canHeroReceiveAbilityThisTurn(heroPosition)) {
            console.log(`${heroPosition} hero has already received an ability this turn`);
            this.handManager.handleInvalidDrop();
            
            // Show feedback to player
            this.showTurnLimitFeedback(heroPosition);
            return false;
        }
        
        // Process drop on hero
        const result = await this.processHeroDrop(cardName, cardIndex, heroPosition);
        
        if (result.success) {
            // Remove card from hand
            this.handManager.removeCardFromHandByIndex(cardIndex);
            this.handManager.endHandCardDrag();
            
            // Mark this hero as having received an ability this turn
            this.markHeroReceivedAbility(heroPosition);
            
            // Notify state change
            if (this.onStateChange) {
                await this.onStateChange();
            }
            
            console.log(result.message);
            return true;
        } else {
            console.log(result.message);
            this.handManager.handleInvalidDrop();
            return false;
        }
    }

    // NEW: Show visual feedback when turn limit is reached
    showTurnLimitFeedback(heroPosition) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (teamSlot) {
            // Add a temporary class for visual feedback
            teamSlot.classList.add('turn-limit-reached');
            
            // Create and show a message
            const message = document.createElement('div');
            message.className = 'turn-limit-message';
            message.textContent = 'This hero already received an ability this turn!';
            teamSlot.appendChild(message);
            
            // Remove after animation
            setTimeout(() => {
                teamSlot.classList.remove('turn-limit-reached');
                message.remove();
            }, 2000);
        }
    }

    // === CORE LOGIC ===

    // Process drop on hero (leftmost free zone or increment existing)
    async processHeroDrop(cardName, cardIndex, heroPosition) {
        // Get ability info
        const abilityInfo = getCardInfo(cardName);
        if (!abilityInfo) {
            return { success: false, message: `Could not find ability info for ${cardName}` };
        }
        
        // Check if hero already has this ability
        if (!this.canHeroAcceptAbility(heroPosition, cardName)) {
            // Hero already has this ability - find and increment it
            const existingZone = this.findAbilityZone(heroPosition, cardName);
            if (existingZone) {
                // Increment the existing ability
                this.addAbilityToZone(heroPosition, existingZone, abilityInfo, true);
                return { 
                    success: true, 
                    message: `Incremented ${cardName} in ${heroPosition} hero's zone ${existingZone}` 
                };
            } else {
                return { 
                    success: false, 
                    message: `Hero has ability ${cardName} but couldn't find which zone` 
                };
            }
        } else {
            // Hero doesn't have this ability - find leftmost free zone
            const freeZone = this.findLeftmostFreeZone(heroPosition);
            
            if (freeZone) {
                // Add to leftmost free zone
                const success = this.addAbilityToZone(heroPosition, freeZone, abilityInfo);
                if (success) {
                    return { 
                        success: true, 
                        message: `Added ${cardName} to ${heroPosition} hero's zone ${freeZone}` 
                    };
                } else {
                    return { 
                        success: false, 
                        message: `Failed to add ${cardName} to zone` 
                    };
                }
            } else {
                // No free zones - return to hand
                return { 
                    success: false, 
                    message: `${heroPosition} hero has no free ability zones` 
                };
            }
        }
    }

    // Find which zone has a specific ability for a hero
    findAbilityZone(heroPosition, abilityName) {
        // ENSURE zone structure is valid
        this.ensureValidZoneStructure(heroPosition);
        
        const zones = this.heroAbilityZones[heroPosition];
        if (!zones) return null;
        
        for (let i = 1; i <= 3; i++) {
            const zoneName = `zone${i}`;
            const zone = zones[zoneName];
            if (zone && zone.length > 0 && zone[0].name === abilityName) {
                return i;
            }
        }
        
        return null;
    }

    // Find leftmost free zone for a hero
    findLeftmostFreeZone(heroPosition) {
        // ENSURE zone structure is valid
        this.ensureValidZoneStructure(heroPosition);
        
        const zones = this.heroAbilityZones[heroPosition];
        if (!zones) return null;
        
        for (let i = 1; i <= 3; i++) {
            const zoneName = `zone${i}`;
            if (!zones[zoneName] || zones[zoneName].length === 0) {
                return i;
            }
        }
        
        return null;
    }

    // === EXISTING METHODS (unchanged) ===

    // Initialize hero with their starting abilities
    initializeHeroStartingAbilities(heroPosition, heroData) {
        if (!heroData || !heroPosition) {
            console.error('Invalid hero data or position for ability initialization');
            return false;
        }
        
        // Clear any existing abilities for this position
        this.clearHeroAbilities(heroPosition);
        
        // Get the hero's starting abilities
        const ability1 = heroData.ability1;
        const ability2 = heroData.ability2;
        
        if (!ability1 || !ability2) {
            console.log(`Hero ${heroData.name} has no starting abilities defined`);
            return false;
        }
        
        // Get ability card info
        const ability1Info = getCardInfo(ability1);
        const ability2Info = getCardInfo(ability2);
        
        if (!ability1Info || !ability2Info) {
            console.error(`Could not find ability info for ${ability1} or ${ability2}`);
            return false;
        }
        
        // Check if abilities are the same
        if (ability1 === ability2) {
            // Same ability - add both copies to zone 1
            this.addAbilityToZone(heroPosition, 1, ability1Info);
            // Add second copy, bypassing unique check since it's a starting ability
            this.addAbilityToZone(heroPosition, 1, ability1Info, true);
            console.log(`Added ${ability1} x2 to ${heroData.name} at ${heroPosition} (zone 1)`);
        } else {
            // Different abilities - sort alphabetically
            const abilities = [
                { name: ability1, info: ability1Info },
                { name: ability2, info: ability2Info }
            ].sort((a, b) => a.name.localeCompare(b.name));
            
            // Add to zones 1 and 2
            this.addAbilityToZone(heroPosition, 1, abilities[0].info);
            this.addAbilityToZone(heroPosition, 2, abilities[1].info);
            
            console.log(`Added ${abilities[0].name} to zone 1 and ${abilities[1].name} to zone 2 for ${heroData.name} at ${heroPosition}`);
        }
        
        return true;
    }

    // Update hero abilities when a new hero is placed
    updateHeroPlacement(heroPosition, heroData) {
        if (!heroData) {
            // Hero removed from this position
            this.clearHeroAbilities(heroPosition);
        } else {
            // New hero placed - initialize with starting abilities
            this.initializeHeroStartingAbilities(heroPosition, heroData);
        }
    }
    
    // Check if a hero can accept a specific ability (not already having it)
    canHeroAcceptAbility(heroPosition, abilityName) {
        if (!this.heroAbilityRegistry[heroPosition]) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return false;
        }
        
        // Check if this hero already has this ability anywhere
        return !this.heroAbilityRegistry[heroPosition].has(abilityName);
    }
    
    // Add ability to a specific zone
    addAbilityToZone(heroPosition, zoneNumber, ability, bypassUniqueCheck = false) {
        const zoneName = `zone${zoneNumber}`;
        
        // ENSURE zone structure is valid before proceeding
        this.ensureValidZoneStructure(heroPosition);
        
        if (!this.heroAbilityZones[heroPosition] || !this.heroAbilityZones[heroPosition][zoneName]) {
            console.error(`Invalid hero position or zone: ${heroPosition}, ${zoneName}`);
            console.error('Zone structure:', this.heroAbilityZones[heroPosition]);
            return false;
        }
        
        // First check if hero can accept this ability (unless bypassing for starting abilities)
        if (!bypassUniqueCheck && !this.canHeroAcceptAbility(heroPosition, ability.name)) {
            console.log(`Hero at ${heroPosition} already has ability: ${ability.name}`);
            return false;
        }
        
        // Add to zone
        this.heroAbilityZones[heroPosition][zoneName].push(ability);
        
        // Register ability for uniqueness tracking (only if not already registered)
        this.heroAbilityRegistry[heroPosition].add(ability.name);
        
        console.log(`Added ${ability.name} to ${heroPosition} hero's ${zoneName}`);
        return true;
    }
    
    // Remove ability from a zone
    removeAbilityFromZone(heroPosition, zoneNumber, abilityIndex) {
        const zoneName = `zone${zoneNumber}`;
        
        if (!this.heroAbilityZones[heroPosition] || !this.heroAbilityZones[heroPosition][zoneName]) {
            console.error(`Invalid hero position or zone: ${heroPosition}, ${zoneName}`);
            return null;
        }
        
        const zone = this.heroAbilityZones[heroPosition][zoneName];
        if (abilityIndex < 0 || abilityIndex >= zone.length) {
            console.error(`Invalid ability index: ${abilityIndex}`);
            return null;
        }
        
        // Remove the ability
        const removedAbility = zone.splice(abilityIndex, 1)[0];
        
        // Check if this was the last instance of this ability on this hero
        const stillHasAbility = this.checkIfHeroStillHasAbility(heroPosition, removedAbility.name);
        if (!stillHasAbility) {
            this.heroAbilityRegistry[heroPosition].delete(removedAbility.name);
        }
        
        console.log(`Removed ${removedAbility.name} from ${heroPosition} hero's ${zoneName}`);
        return removedAbility;
    }
    
    // Check if hero still has a specific ability after removal
    checkIfHeroStillHasAbility(heroPosition, abilityName) {
        const zones = this.heroAbilityZones[heroPosition];
        
        for (const zoneName in zones) {
            const zone = zones[zoneName];
            if (zone.some(ability => ability.name === abilityName)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Move all abilities when heroes swap positions
    moveHeroAbilities(fromPosition, toPosition) {
        // ENSURE both positions have valid zone structures
        this.ensureValidZoneStructure(fromPosition);
        this.ensureValidZoneStructure(toPosition);
        
        // Swap ability zones
        const tempZones = this.heroAbilityZones[fromPosition];
        this.heroAbilityZones[fromPosition] = this.heroAbilityZones[toPosition];
        this.heroAbilityZones[toPosition] = tempZones;
        
        // Swap ability registries
        const tempRegistry = this.heroAbilityRegistry[fromPosition];
        this.heroAbilityRegistry[fromPosition] = this.heroAbilityRegistry[toPosition];
        this.heroAbilityRegistry[toPosition] = tempRegistry;
        
        // Swap turn-based tracking
        const tempTurnTracking = this.heroAbilityAttachedThisTurn[fromPosition];
        this.heroAbilityAttachedThisTurn[fromPosition] = this.heroAbilityAttachedThisTurn[toPosition];
        this.heroAbilityAttachedThisTurn[toPosition] = tempTurnTracking;
        
        console.log(`Moved abilities from ${fromPosition} to ${toPosition}`);
        
        // Validate structures after swap
        this.ensureValidZoneStructure(fromPosition);
        this.ensureValidZoneStructure(toPosition);
    }
    
    // Clear abilities when hero is removed from position
    clearHeroAbilities(heroPosition) {
        // Force complete reinitialization
        this.heroAbilityZones[heroPosition] = {
            zone1: [],
            zone2: [],
            zone3: []
        };
        this.heroAbilityRegistry[heroPosition] = new Set();
        
        // NEW: Reset turn tracking for this position
        this.heroAbilityAttachedThisTurn[heroPosition] = false;
        
        console.log(`Cleared abilities for ${heroPosition} hero`);
        
        // Double-check the structure is valid
        this.ensureValidZoneStructure(heroPosition);
    }
    
    // Get abilities for a specific hero
    getHeroAbilities(heroPosition) {
        // ENSURE zone structure is valid
        this.ensureValidZoneStructure(heroPosition);
        
        return this.heroAbilityZones[heroPosition] || null;
    }
    
    // Get stack count for a zone
    getZoneStackCount(heroPosition, zoneNumber) {
        const zoneName = `zone${zoneNumber}`;
        const zone = this.heroAbilityZones[heroPosition]?.[zoneName];
        
        return zone ? zone.length : 0;
    }
    
    // Export state for saving
    exportAbilitiesState() {
        // Convert Sets to Arrays for serialization
        const registryExport = {};
        for (const position in this.heroAbilityRegistry) {
            registryExport[position] = Array.from(this.heroAbilityRegistry[position]);
        }
        
        return {
            heroAbilityZones: JSON.parse(JSON.stringify(this.heroAbilityZones)),
            heroAbilityRegistry: registryExport,
            // NEW: Include turn-based tracking in save state
            heroAbilityAttachedThisTurn: JSON.parse(JSON.stringify(this.heroAbilityAttachedThisTurn))
        };
    }
    
    // Import state for loading
    importAbilitiesState(state) {
        if (!state) return false;
        
        if (state.heroAbilityZones) {
            this.heroAbilityZones = JSON.parse(JSON.stringify(state.heroAbilityZones));
            
            // VALIDATE and repair imported zone structures
            ['left', 'center', 'right'].forEach(position => {
                this.ensureValidZoneStructure(position);
            });
        }
        
        if (state.heroAbilityRegistry) {
            // Convert Arrays back to Sets
            for (const position in state.heroAbilityRegistry) {
                this.heroAbilityRegistry[position] = new Set(state.heroAbilityRegistry[position]);
            }
        }
        
        // NEW: Import turn-based tracking
        if (state.heroAbilityAttachedThisTurn) {
            this.heroAbilityAttachedThisTurn = JSON.parse(JSON.stringify(state.heroAbilityAttachedThisTurn));
        } else {
            // Default to false if not in save state (backward compatibility)
            this.heroAbilityAttachedThisTurn = {
                left: false,
                center: false,
                right: false
            };
        }
        
        console.log('Imported hero abilities state with turn-based tracking and zone validation');
        return true;
    }
    
    // Reset to initial state
    reset() {
        this.heroAbilityZones = {
            left: { zone1: [], zone2: [], zone3: [] },
            center: { zone1: [], zone2: [], zone3: [] },
            right: { zone1: [], zone2: [], zone3: [] }
        };
        
        this.heroAbilityRegistry = {
            left: new Set(),
            center: new Set(),
            right: new Set()
        };
        
        // NEW: Reset turn-based tracking
        this.heroAbilityAttachedThisTurn = {
            left: false,
            center: false,
            right: false
        };
        
        this.handManager = null;
        this.formationManager = null;
        this.onStateChange = null;
        
        console.log('HeroAbilitiesManager reset');
    }
}

// === GLOBAL FUNCTIONS FOR EVENT HANDLERS - SIMPLIFIED ===

// Team slot drag handler for abilities
function onTeamSlotAbilityDragOver(event, heroPosition) {
    if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
        const handled = window.heroSelection.heroAbilitiesManager.handleTeamSlotDragOver(event, heroPosition);
        if (handled) {
            const slot = event.currentTarget;
            slot.classList.add('ability-drop-ready');
        }
        return handled; 
    }
    return false;
}

function onTeamSlotAbilityDragLeave(event) {
    const slot = event.currentTarget;
    slot.classList.remove('ability-drop-ready');
}

function onTeamSlotAbilityDrop(event, heroPosition) {
    if (window.heroSelection && window.heroSelection.heroAbilitiesManager) {
        const slot = event.currentTarget;
        slot.classList.remove('ability-drop-ready');
        window.heroSelection.heroAbilitiesManager.handleTeamSlotDrop(event, heroPosition);
    }
}

// Attach to window
if (typeof window !== 'undefined') {
    window.onTeamSlotAbilityDragOver = onTeamSlotAbilityDragOver;
    window.onTeamSlotAbilityDragLeave = onTeamSlotAbilityDragLeave;
    window.onTeamSlotAbilityDrop = onTeamSlotAbilityDrop;
}