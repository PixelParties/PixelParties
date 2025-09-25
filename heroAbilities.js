// heroAbilities.js - Hero Ability Zones Management Module with Turn-Based Attachment Limits, Leadership Tracking, and Stat Bonus System

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
        
        // Track which heroes have received an ability this turn
        this.heroAbilityAttachedThisTurn = {
            left: false,
            center: false,
            right: false
        };
        
        // Track specific Ability usage per turn
        this.heroLeadershipUsedThisTurn = {
            left: false,
            center: false,
            right: false
        };
        this.heroNavigationUsedThisTurn = {
            left: false,
            center: false,
            right: false
        };

        // References to other managers (will be set by heroSelection)
        this.handManager = null;
        this.formationManager = null;
        this.onStateChange = null; // Callback for when state changes
    }

    // Initialize with references to other managers
    init(handManager, formationManager, onStateChange) {
        this.handManager = handManager;
        this.formationManager = formationManager;
        this.onStateChange = onStateChange;
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

    // === TURN-BASED METHODS ===

    // Check if a hero can receive an ability this turn
    canHeroReceiveAbilityThisTurn(heroPosition) {
        if (!this.heroAbilityAttachedThisTurn.hasOwnProperty(heroPosition)) {
            return false;
        }
        
        return !this.heroAbilityAttachedThisTurn[heroPosition];
    }

    // Mark that a hero has received an ability this turn
    markHeroReceivedAbility(heroPosition) {
        if (this.heroAbilityAttachedThisTurn.hasOwnProperty(heroPosition)) {
            this.heroAbilityAttachedThisTurn[heroPosition] = true;
        }
    }

    // === NEW LEADERSHIP METHODS ===

    // Check if a hero can use Leadership this turn
    canUseLeadership(heroPosition) {
        if (!this.heroLeadershipUsedThisTurn.hasOwnProperty(heroPosition)) {
            return false;
        }
        return !this.heroLeadershipUsedThisTurn[heroPosition];
    }

    // Mark Leadership as used for this hero this turn
    markLeadershipUsed(heroPosition) {
        if (this.heroLeadershipUsedThisTurn.hasOwnProperty(heroPosition)) {
            this.heroLeadershipUsedThisTurn[heroPosition] = true;
            return true;
        }
        return false;
    }

    // Check if hero can use Navigation this turn
    canUseNavigation(heroPosition) {
        if (!this.heroNavigationUsedThisTurn.hasOwnProperty(heroPosition)) {
            return false;
        }
        return !this.heroNavigationUsedThisTurn[heroPosition];
    }

    // Mark Navigation as used for this hero this turn
    markNavigationUsed(heroPosition) {
        if (this.heroNavigationUsedThisTurn.hasOwnProperty(heroPosition)) {
            this.heroNavigationUsedThisTurn[heroPosition] = true;
            return true;
        }
        return false;
    }

    // Reset turn-based tracking (called after battle)
    resetTurnBasedTracking() {
        this.heroAbilityAttachedThisTurn = {
            left: false,
            center: false,
            right: false
        };
        
        // Reset Ability usage
        this.heroLeadershipUsedThisTurn = {
            left: false,
            center: false,
            right: false
        };
        this.heroNavigationUsedThisTurn = {
            left: false,
            center: false,
            right: false
        };
    }

    // Check if there's a hero at the given position
    hasHeroAtPosition(heroPosition) {
        // Validate position
        if (!this.heroAbilityZones.hasOwnProperty(heroPosition)) {
            return false;
        }
        
        // Use the direct reference to FormationManager
        if (this.formationManager) {
            const formation = this.formationManager.getBattleFormation();
            const hasHero = formation && formation[heroPosition] !== null && formation[heroPosition] !== undefined;
            
            return hasHero;
        }
        
        // If FormationManager is not available, log an error
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
        // Check if we're dragging a hand card
        if (!this.handManager || !this.handManager.isHandDragging()) {
            return false;
        }
        
        const dragState = this.handManager.getHandDragState();
        const cardName = dragState.draggedCardName;
        
        // Only allow drop if it's an ability card
        if (!this.isAbilityCard(cardName)) {
            return false;
        }
        
        // Check if there's actually a hero in this slot
        if (!this.hasHeroAtPosition(heroPosition)) {
            return false;
        }
        
        // Check if this hero can receive abilities this turn
        if (!this.canHeroReceiveAbilityThisTurn(heroPosition)) {
            return false;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        // Set drop effect
        event.dataTransfer.dropEffect = 'move';
        
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
        
        // Ensure Leadership tracking exists
        if (this.heroLeadershipUsedThisTurn[heroPosition] === undefined) {
            this.heroLeadershipUsedThisTurn[heroPosition] = false;
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
            this.handManager.handleInvalidDrop();
            return false;
        }
        
        // Check if there's actually a hero in this slot
        if (!this.hasHeroAtPosition(heroPosition)) {
            this.handManager.handleInvalidDrop();
            return false;
        }
        
        // Check turn-based limitation
        if (!this.canHeroReceiveAbilityThisTurn(heroPosition)) {
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
            
            return true;
        } else {
            this.handManager.handleInvalidDrop();
            return false;
        }
    }

    // Show visual feedback when turn limit is reached
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

    // MODIFIED: Enhanced processHeroDrop with immediate stat feedback
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
                
                // NEW: Immediate stat update for increment
                this.triggerStatUpdateForAbility(heroPosition, cardName, 'added');
                
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

    // === EXISTING METHODS ===

    // Initialize hero with their starting abilities
    initializeHeroStartingAbilities(heroPosition, heroData) {
        if (!heroData || !heroPosition) {
            return false;
        }
        
        // Clear any existing abilities for this position
        this.clearHeroAbilities(heroPosition);
        
        // Get the hero's starting abilities
        const ability1 = heroData.ability1;
        const ability2 = heroData.ability2;
        
        if (!ability1 || !ability2) {
            return false;
        }
        
        // Get ability card info
        const ability1Info = getCardInfo(ability1);
        const ability2Info = getCardInfo(ability2);
        
        if (!ability1Info || !ability2Info) {
            return false;
        }
        
        // Check if abilities are the same
        if (ability1 === ability2) {
            // Same ability - add both copies to zone 1
            this.addAbilityToZone(heroPosition, 1, ability1Info);
            // Add second copy, bypassing unique check since it's a starting ability
            this.addAbilityToZone(heroPosition, 1, ability1Info, true);
        } else {
            // Different abilities - sort alphabetically
            const abilities = [
                { name: ability1, info: ability1Info },
                { name: ability2, info: ability2Info }
            ].sort((a, b) => a.name.localeCompare(b.name));
            
            // Add to zones 1 and 2
            this.addAbilityToZone(heroPosition, 1, abilities[0].info);
            this.addAbilityToZone(heroPosition, 2, abilities[1].info);
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
            return false;
        }
        
        // Check if this hero already has this ability anywhere
        return !this.heroAbilityRegistry[heroPosition].has(abilityName);
    }
    
    // MODIFIED: Enhanced addAbilityToZone to trigger stat updates
    addAbilityToZone(heroPosition, zoneNumber, ability, bypassUniqueCheck = false) {
        const zoneName = `zone${zoneNumber}`;
        
        // ENSURE zone structure is valid before proceeding
        this.ensureValidZoneStructure(heroPosition);
        
        if (!this.heroAbilityZones[heroPosition] || !this.heroAbilityZones[heroPosition][zoneName]) {
            return false;
        }
        
        // First check if hero can accept this ability (unless bypassing for starting abilities)
        if (!bypassUniqueCheck && !this.canHeroAcceptAbility(heroPosition, ability.name)) {
            return false;
        }
        
        // Add to zone
        this.heroAbilityZones[heroPosition][zoneName].push(ability);
        
        // Register ability for uniqueness tracking (only if not already registered)
        this.heroAbilityRegistry[heroPosition].add(ability.name);
        
        // NEW: Trigger stat update if this is a stat-affecting ability
        this.triggerStatUpdateForAbility(heroPosition, ability.name, 'added');
        
        return true;
    }
    
    // MODIFIED: Enhanced removeAbilityFromZone to trigger stat updates
    removeAbilityFromZone(heroPosition, zoneNumber, abilityIndex) {
        const zoneName = `zone${zoneNumber}`;
        
        if (!this.heroAbilityZones[heroPosition] || !this.heroAbilityZones[heroPosition][zoneName]) {
            return null;
        }
        
        const zone = this.heroAbilityZones[heroPosition][zoneName];
        if (abilityIndex < 0 || abilityIndex >= zone.length) {
            return null;
        }
        
        // Remove the ability
        const removedAbility = zone.splice(abilityIndex, 1)[0];
        
        // Check if this was the last instance of this ability on this hero
        const stillHasAbility = this.checkIfHeroStillHasAbility(heroPosition, removedAbility.name);
        if (!stillHasAbility) {
            this.heroAbilityRegistry[heroPosition].delete(removedAbility.name);
        }
        
        // NEW: Trigger stat update if this was a stat-affecting ability
        this.triggerStatUpdateForAbility(heroPosition, removedAbility.name, 'removed');
        
        return removedAbility;
    }
    
    // NEW: Trigger stat updates when stat-affecting abilities change
    triggerStatUpdateForAbility(heroPosition, abilityName, action) {
        // Check if this is a stat-affecting ability
        const isStatAffecting = abilityName === 'Toughness' || abilityName === 'Fighting';
        
        if (isStatAffecting) {
            // Trigger UI update with delay to ensure DOM is ready
            setTimeout(() => {
                if (window.heroSelection && window.heroSelection.refreshHeroStats) {
                    window.heroSelection.refreshHeroStats();
                }
                
                // Also trigger a specific stat update for this position
                if (window.updateHeroStats) {
                    window.updateHeroStats(heroPosition);
                }
            }, 50);
        }
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
    
    // MODIFIED: Enhanced moveHeroAbilities to preserve stat bonuses
    moveHeroAbilities(fromPosition, toPosition) {
        // ENSURE both positions have valid zone structures
        this.ensureValidZoneStructure(fromPosition);
        this.ensureValidZoneStructure(toPosition);
        
        // Log stat-affecting abilities being moved
        const fromAbilities = this.heroAbilityZones[fromPosition];
        const toAbilities = this.heroAbilityZones[toPosition];
        
        let fromStatAbilities = this.countStatAbilities(fromAbilities);
        let toStatAbilities = this.countStatAbilities(toAbilities);
        
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
        
        // Swap Leadership usage tracking
        const tempLeadershipTracking = this.heroLeadershipUsedThisTurn[fromPosition];
        this.heroLeadershipUsedThisTurn[fromPosition] = this.heroLeadershipUsedThisTurn[toPosition];
        this.heroLeadershipUsedThisTurn[toPosition] = tempLeadershipTracking;
        
        // Validate structures after swap
        this.ensureValidZoneStructure(fromPosition);
        this.ensureValidZoneStructure(toPosition);
        
        // NEW: Trigger stat updates for both positions after move
        setTimeout(() => {
            if (window.heroSelection && window.heroSelection.refreshHeroStats) {
                window.heroSelection.refreshHeroStats();
            }
        }, 50);
    }
    
    // NEW: Helper method to count stat-affecting abilities
    countStatAbilities(abilities) {
        let toughness = 0;
        let fighting = 0;
        
        if (abilities) {
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (abilities[zone] && Array.isArray(abilities[zone])) {
                    abilities[zone].forEach(ability => {
                        if (ability && ability.name === 'Toughness') {
                            toughness++;
                        } else if (ability && ability.name === 'Fighting') {
                            fighting++;
                        }
                    });
                }
            });
        }
        
        return { toughness, fighting };
    }
    
    // MODIFIED: Enhanced clearHeroAbilities to trigger stat updates
    clearHeroAbilities(heroPosition) {
        // Check what abilities are being cleared for logging
        const currentAbilities = this.heroAbilityZones[heroPosition] || {};
        const statCount = this.countStatAbilities(currentAbilities);
        
        // Force complete reinitialization
        this.heroAbilityZones[heroPosition] = {
            zone1: [],
            zone2: [],
            zone3: []
        };
        this.heroAbilityRegistry[heroPosition] = new Set();
        
        // Reset turn tracking for this position
        this.heroAbilityAttachedThisTurn[heroPosition] = false;
        
        // Reset Leadership tracking for this position
        this.heroLeadershipUsedThisTurn[heroPosition] = false;
        
        // Double-check the structure is valid
        this.ensureValidZoneStructure(heroPosition);
        
        // NEW: Trigger stat update after clearing
        setTimeout(() => {
            if (window.heroSelection && window.heroSelection.refreshHeroStats) {
                window.heroSelection.refreshHeroStats();
            }
            
            if (window.updateHeroStats) {
                window.updateHeroStats(heroPosition);
            }
        }, 50);
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
            heroAbilityAttachedThisTurn: JSON.parse(JSON.stringify(this.heroAbilityAttachedThisTurn)),
            // Include Leadership usage in save state
            heroLeadershipUsedThisTurn: JSON.parse(JSON.stringify(this.heroLeadershipUsedThisTurn)),
            heroNavigationUsedThisTurn: JSON.parse(JSON.stringify(this.heroNavigationUsedThisTurn))
        };
    }
    
    // Enhanced importAbilitiesState to trigger stat updates after import
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
        
        // Import turn-based tracking
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
        
        // Import Ability usage tracking (Leadership, Navigation etc)
        if (state.heroLeadershipUsedThisTurn) {
            this.heroLeadershipUsedThisTurn = JSON.parse(JSON.stringify(state.heroLeadershipUsedThisTurn));
        } else {
            // Default to false if not in save state (backward compatibility)
            this.heroLeadershipUsedThisTurn = {
                left: false,
                center: false,
                right: false
            };
        }
        if (state.heroNavigationUsedThisTurn) {
            this.heroNavigationUsedThisTurn = JSON.parse(JSON.stringify(state.heroNavigationUsedThisTurn));
        } else {
            // Default to false if not in save state (backward compatibility)
            this.heroNavigationUsedThisTurn = {
                left: false,
                center: false,
                right: false
            };
        }

        // Log imported stat abilities and trigger stat updates
        ['left', 'center', 'right'].forEach(position => {
            const statCount = this.countStatAbilities(this.heroAbilityZones[position]);
        });
        
        // Trigger stat updates after import
        setTimeout(() => {
            if (window.heroSelection && window.heroSelection.refreshHeroStats) {
                window.heroSelection.refreshHeroStats();
            }
        }, 100);
        
        return true;
    }

    getAbilityStackCountForPosition(heroPosition, abilityName) {
        // ENSURE zone structure is valid
        this.ensureValidZoneStructure(heroPosition);
        
        const abilities = this.heroAbilityZones[heroPosition];
        if (!abilities) return 0;
        
        let stackCount = 0;
        
        // Check all zones for the specific ability
        for (let i = 1; i <= 3; i++) {
            const zoneName = `zone${i}`;
            const zone = abilities[zoneName];
            
            if (zone && Array.isArray(zone) && zone.length > 0) {
                // If this zone has the ability we're looking for, add its stack count
                if (zone[0].name === abilityName) {
                    stackCount += zone.length;
                }
            }
        }
        
        return stackCount;
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
        
        this.heroAbilityAttachedThisTurn = {
            left: false,
            center: false,
            right: false
        };
        
        // Reset specific Ability tracking
        this.heroLeadershipUsedThisTurn = {
            left: false,
            center: false,
            right: false
        };

        this.heroNavigationUsedThisTurn = {
            left: false,
            center: false,
            right: false
        };
        
        this.handManager = null;
        this.formationManager = null;
        this.onStateChange = null;
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