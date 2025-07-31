// creatures.js - Hero Creature Management Module with Drag & Drop Reordering

import { getCardInfo } from './cardDatabase.js';

export class HeroCreatureManager {
    constructor() {
        // Track creatures for each hero position
        // Each hero has a list of creature cards they've summoned
        this.heroCreatures = {
            left: [],
            center: [],
            right: []
        };

        // Guard Change Mode: Can swap Creatures between Heroes
        this.guardChangeMode = false;
        
        // References to other managers (will be set by heroSelection)
        this.handManager = null;
        this.formationManager = null;
        this.onStateChange = null; // Callback for when state changes
        
        // Drag state for creature reordering
        this.dragState = {
            isDragging: false,
            draggedCreature: null,
            draggedFromHero: null,
            draggedFromIndex: null,
            draggedElement: null
        };
    }

    // Initialize with references to other managers
    init(handManager, formationManager, onStateChange) {
        this.handManager = handManager;
        this.formationManager = formationManager;
        this.onStateChange = onStateChange;
    }

    // Check if a card is a creature spell
    isCreatureSpell(cardName) {
        const cardInfo = getCardInfo(cardName);
        return cardInfo && cardInfo.cardType === 'Spell' && cardInfo.subtype === 'Creature';
    }

    // Set Guard Change mode (called by GlobalSpellManager)
    setGuardChangeMode(active) {
        this.guardChangeMode = active;
    }

    // Move creature between different heroes (only allowed in Guard Change mode)
    moveCreatureBetweenHeroes(fromHeroPosition, fromIndex, toHeroPosition, toIndex) {        
        if (!this.guardChangeMode) {
            console.error('❌ Cannot move creatures between heroes - Guard Change mode not active');
            return false;
        }
        
        if (!this.heroCreatures.hasOwnProperty(fromHeroPosition) || 
            !this.heroCreatures.hasOwnProperty(toHeroPosition)) {
            console.error(`❌ Invalid hero positions: ${fromHeroPosition} or ${toHeroPosition}`);
            return false;
        }
        
        if (!this.hasHeroAtPosition(toHeroPosition)) {
            return false;
        }
        
        const fromCreatures = this.heroCreatures[fromHeroPosition];
        const toCreatures = this.heroCreatures[toHeroPosition];
        
        if (fromIndex < 0 || fromIndex >= fromCreatures.length) {
            console.error(`❌ Invalid source creature index: ${fromIndex}`);
            return false;
        }
        
        if (toIndex < 0 || toIndex > toCreatures.length) {
            console.error(`❌ Invalid target creature index: ${toIndex}`);
            return false;
        }
                
        // Move the creature
        const [movedCreature] = fromCreatures.splice(fromIndex, 1);
        toCreatures.splice(toIndex, 0, movedCreature);
                
        if (this.onStateChange) {
            this.onStateChange();
        } else {
            console.error('⚠️ No onStateChange callback set');
        }
        
        return true;
    }

    // Check if there's a hero at the given position
    hasHeroAtPosition(heroPosition) {
        // Validate position
        if (!this.heroCreatures.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return false;
        }
        
        // Use the direct reference to FormationManager
        if (this.formationManager) {
            const formation = this.formationManager.getBattleFormation();
            const hasHero = formation && formation[heroPosition] !== null && formation[heroPosition] !== undefined;
            
            return hasHero;
        }
        
        // If FormationManager is not available, log an error
        console.error('FormationManager reference not available in HeroCreatureManager');
        return false;
    }

    // Get the creatures for a specific hero
    getHeroCreatures(heroPosition) {
        if (!this.heroCreatures.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return [];
        }
        
        // Return a copy to prevent external modification
        return [...this.heroCreatures[heroPosition]];
    }

    // Add a creature to a hero
    addCreatureToHero(heroPosition, creatureCardName) {
        if (!this.hasHeroAtPosition(heroPosition)) {
            return false;
        }

        // Get the full card info
        const cardInfo = getCardInfo(creatureCardName);
        if (!cardInfo) {
            console.error(`Card not found in database: ${creatureCardName}`);
            return false;
        }

        // Verify it's a creature spell
        if (!this.isCreatureSpell(creatureCardName)) {
            console.error(`Card ${creatureCardName} is not a Creature spell`);
            return false;
        }

        // Add the full card info to the creatures list
        this.heroCreatures[heroPosition].push({
            ...cardInfo,
            addedAt: Date.now() // Track when the creature was added
        });
        
        // Notify state change
        if (this.onStateChange) {
            this.onStateChange();
        }

        return true;
    }

    // Remove a creature from a hero by index
    removeCreatureFromHero(heroPosition, creatureIndex) {
        if (!this.heroCreatures.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return null;
        }

        const creatures = this.heroCreatures[heroPosition];
        if (creatureIndex < 0 || creatureIndex >= creatures.length) {
            console.error(`Invalid creature index: ${creatureIndex}`);
            return null;
        }

        // Remove and return the creature
        const removedCreature = creatures.splice(creatureIndex, 1)[0];
        
        // Notify state change
        if (this.onStateChange) {
            this.onStateChange();
        }

        return removedCreature;
    }

    // NEW: Reorder creatures within the same hero
    reorderCreaturesWithinHero(heroPosition, fromIndex, toIndex) {
        if (!this.heroCreatures.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return false;
        }

        const creatures = this.heroCreatures[heroPosition];
        
        // Validate indices
        if (fromIndex < 0 || fromIndex >= creatures.length || 
            toIndex < 0 || toIndex >= creatures.length) {
            console.error(`Invalid creature indices: from ${fromIndex}, to ${toIndex}`);
            return false;
        }

        // No change needed
        if (fromIndex === toIndex) {
            return true;
        }

        // Remove creature from original position
        const [draggedCreature] = creatures.splice(fromIndex, 1);
        
        // Insert at new position
        creatures.splice(toIndex, 0, draggedCreature);
        
        // Notify state change
        if (this.onStateChange) {
            this.onStateChange();
        }

        return true;
    }

    // NEW: Get target index for creature drop based on mouse position
    getCreatureDropIndex(heroPosition, mouseX, heroContainer) {
        const creatures = this.heroCreatures[heroPosition];
        if (creatures.length === 0) {
            return 0; // First position if no creatures exist
        }

        const creatureElements = heroContainer.querySelectorAll('.creature-icon');
        if (creatureElements.length === 0) {
            return 0;
        }

        // Find the position based on mouse X coordinate
        for (let i = 0; i < creatureElements.length; i++) {
            const rect = creatureElements[i].getBoundingClientRect();
            const centerX = rect.left + (rect.width / 2);
            
            if (mouseX < centerX) {
                return i; // Insert before this creature
            }
        }
        
        // Insert at the end if mouse is past all creatures
        return creatures.length;
    }

    // NEW: Start creature drag operation
    startCreatureDrag(heroPosition, creatureIndex, draggedElement) {
        const creatures = this.heroCreatures[heroPosition];
        
        if (creatureIndex < 0 || creatureIndex >= creatures.length) {
            console.error(`Invalid creature index for drag: ${creatureIndex}`);
            return false;
        }

        this.dragState = {
            isDragging: true,
            draggedCreature: creatures[creatureIndex],
            draggedFromHero: heroPosition,
            draggedFromIndex: creatureIndex,
            draggedElement: draggedElement
        };

        // Add visual class to dragged element
        if (draggedElement) {
            draggedElement.classList.add('creature-dragging');
        }

        return true;
    }

    // NEW: End creature drag operation
    endCreatureDrag() {
        if (this.dragState.isDragging && this.dragState.draggedElement) {
            this.dragState.draggedElement.classList.remove('creature-dragging');
        }

        this.dragState = {
            isDragging: false,
            draggedCreature: null,
            draggedFromHero: null,
            draggedFromIndex: null,
            draggedElement: null
        };
    }

    // Check if currently dragging a creature
    isCreatureDragging() {
        return this.dragState.isDragging;
    }

    // Get current drag state
    getCreatureDragState() {
        return { ...this.dragState };
    }

    // Handle creature drop operation
    handleCreatureDrop(targetHeroPosition, dropX, targetContainer) {        
        if (!this.dragState.isDragging) {
            return false;
        }

        const fromHeroPosition = this.dragState.draggedFromHero;
        const fromIndex = this.dragState.draggedFromIndex;
        
        // Same hero - handle reordering within hero
        if (targetHeroPosition === fromHeroPosition) {
            
            const targetIndex = this.getCreatureDropIndex(targetHeroPosition, dropX, targetContainer);
            
            const success = this.reorderCreaturesWithinHero(targetHeroPosition, fromIndex, targetIndex);
            
            this.endCreatureDrag();
            return success;
        }
                
        if (!this.guardChangeMode) {
            this.endCreatureDrag();
            return false;
        }

        // Check if target hero exists
        const hasTargetHero = this.hasHeroAtPosition(targetHeroPosition);
        
        if (!hasTargetHero) {
            this.endCreatureDrag();
            return false;
        }

        const targetIndex = this.getCreatureDropIndex(targetHeroPosition, dropX, targetContainer);
        
        const success = this.moveCreatureBetweenHeroes(fromHeroPosition, fromIndex, targetHeroPosition, targetIndex);

        this.endCreatureDrag();
        return success;
    }

    // Check if a hero has a specific creature
    heroHasCreature(heroPosition, creatureName) {
        const creatures = this.getHeroCreatures(heroPosition);
        return creatures.some(creature => creature.name === creatureName);
    }

    // Get count of a specific creature for a hero
    getCreatureCount(heroPosition, creatureName) {
        const creatures = this.getHeroCreatures(heroPosition);
        return creatures.filter(creature => creature.name === creatureName).length;
    }

    // Clear creatures when hero is removed from position
    clearHeroCreatures(heroPosition) {
        if (!this.heroCreatures.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return;
        }

        this.heroCreatures[heroPosition] = [];
    }

    // Move creatures when heroes swap positions
    moveHeroCreatures(fromPosition, toPosition) {
        if (!this.heroCreatures.hasOwnProperty(fromPosition) || 
            !this.heroCreatures.hasOwnProperty(toPosition)) {
            console.error(`Invalid hero positions: ${fromPosition} or ${toPosition}`);
            return;
        }

        // Swap creatures
        const temp = this.heroCreatures[fromPosition];
        this.heroCreatures[fromPosition] = this.heroCreatures[toPosition];
        this.heroCreatures[toPosition] = temp;
        
    }

    // Update hero placement (called when formation changes)
    updateHeroPlacement(heroPosition, heroData) {
        if (!heroData) {
            // Hero removed from this position
            this.clearHeroCreatures(heroPosition);
        }
        // If hero is placed, keep existing creatures (creatures persist)
    }

    // Get all creatures across all heroes
    getAllCreatures() {
        const allCreatures = [];
        
        for (const position in this.heroCreatures) {
            const creatures = this.heroCreatures[position];
            creatures.forEach(creature => {
                allCreatures.push({
                    ...creature,
                    heroPosition: position
                });
            });
        }
        
        return allCreatures;
    }

    // Get total creature count across all heroes
    getTotalCreatureCount() {
        let total = 0;
        for (const position in this.heroCreatures) {
            total += this.heroCreatures[position].length;
        }
        return total;
    }

    // Get creature sprite path
    getCreatureSpritePath(creatureName) {
        return `./Creatures/${creatureName}.png`;
    }

    // Export state for saving
    exportCreaturesState() {
        // Deep copy the creatures
        const exportState = {};
        for (const position in this.heroCreatures) {
            exportState[position] = this.heroCreatures[position].map(creature => ({ ...creature }));
        }
        
        return {
            heroCreatures: exportState
        };
    }

    // Import state for loading
    importCreaturesState(state) {
        if (!state || !state.heroCreatures) {
            return false;
        }

        // Validate the structure
        const validPositions = ['left', 'center', 'right'];
        for (const position of validPositions) {
            if (state.heroCreatures[position] && Array.isArray(state.heroCreatures[position])) {
                this.heroCreatures[position] = state.heroCreatures[position].map(creature => ({ ...creature }));
            } else {
                this.heroCreatures[position] = [];
            }
        }
        
        return true;
    }

    // Reset to initial state
    reset() {
        this.heroCreatures = {
            left: [],
            center: [],
            right: []
        };
        
        this.handManager = null;
        this.formationManager = null;
        this.onStateChange = null;
        
        this.guardChangeMode = false;


        // Reset drag state
        this.dragState = {
            isDragging: false,
            draggedCreature: null,
            draggedFromHero: null,
            draggedFromIndex: null,
            draggedElement: null
        };
    }

    // Control creature animations
    controlCreatureAnimation(heroPosition, creatureIndex, action) {
        const creatureElement = document.querySelector(
            `.hero-creatures[data-hero-position="${heroPosition}"] .creature-icon[data-creature-index="${creatureIndex}"] .creature-sprite`
        );
        
        if (!creatureElement) return;
        
        switch (action) {
            case 'pause':
                creatureElement.style.animationPlayState = 'paused';
                break;
            case 'play':
                creatureElement.style.animationPlayState = 'running';
                break;
            case 'reset':
                creatureElement.style.animation = 'none';
                setTimeout(() => {
                    creatureElement.style.animation = '';
                }, 10);
                break;
            case 'speed-up':
                creatureElement.classList.remove('speed-slow', 'speed-normal');
                creatureElement.classList.add('speed-fast');
                break;
            case 'slow-down':
                creatureElement.classList.remove('speed-fast', 'speed-normal');
                creatureElement.classList.add('speed-slow');
                break;
        }
    }

    // Sync all creature animations
    syncAllCreatureAnimations() {
        const allCreatures = document.querySelectorAll('.creature-sprite');
        
        // Reset all animations
        allCreatures.forEach(sprite => {
            sprite.style.animation = 'none';
        });
        
        // Restart animations after a brief delay
        setTimeout(() => {
            allCreatures.forEach(sprite => {
                sprite.style.animation = '';
            });
        }, 10);
    }
}

// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.HeroCreatureManager = HeroCreatureManager;
}