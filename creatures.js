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

        // Sacrifice event callback (will be set by GraveWorm system)
        this.onCreatureSacrificed = null;
        
        // ===== INGO INTEGRATION: Creature summon callback =====
        // Callback triggered when a creature is successfully added (for Ingo and other hero effects)
        this.onCreatureAdded = null;
        // ======================================================
        
        // Drag state for creature reordering
        this.dragState = {
            isDragging: false,
            draggedCreature: null,
            draggedFromHero: null,
            draggedFromIndex: null,
            draggedElement: null,
            previewPosition: null,
            previewHero: null
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
            console.error('⚠️ Cannot move creatures between heroes - Guard Change mode not active');
            return false;
        }
        
        if (!this.heroCreatures.hasOwnProperty(fromHeroPosition) || 
            !this.heroCreatures.hasOwnProperty(toHeroPosition)) {
            console.error(`⚠️ Invalid hero positions: ${fromHeroPosition} or ${toHeroPosition}`);
            return false;
        }
        
        if (!this.hasHeroAtPosition(toHeroPosition)) {
            return false;
        }
        
        const fromCreatures = this.heroCreatures[fromHeroPosition];
        const toCreatures = this.heroCreatures[toHeroPosition];
        
        if (fromIndex < 0 || fromIndex >= fromCreatures.length) {
            console.error(`⚠️ Invalid source creature index: ${fromIndex}`);
            return false;
        }
        
        if (toIndex < 0 || toIndex > toCreatures.length) {
            console.error(`⚠️ Invalid target creature index: ${toIndex}`);
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
            addedAt: Date.now(),
            statusEffects: [],
            type: 'creature',
            counters: 0  
        });
        
        // Notify state change
        if (this.onStateChange) {
            this.onStateChange();
        }

        // ===== INGO INTEGRATION: Trigger creature added callback =====
        // This allows Ingo (and other hero effects) to respond to creature summons
        if (this.onCreatureAdded) {
            this.onCreatureAdded(heroPosition, cardInfo);
        }
        // ==============================================================

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

    // Reorder creatures within the same hero
    reorderCreaturesWithinHero(heroPosition, fromIndex, visualTargetIndex) {
        if (!this.heroCreatures.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return false;
        }

        const creatures = this.heroCreatures[heroPosition];
        
        // Validate source index
        if (fromIndex < 0 || fromIndex >= creatures.length) {
            console.error(`Invalid source index: ${fromIndex}`);
            return false;
        }
        
        // The visualTargetIndex is where the item should end up among visible elements
        // Since we're removing one element first, we need to calculate the final position
        let finalIndex = visualTargetIndex;
        
        
        // Bounds check
        if (finalIndex < 0 || finalIndex >= creatures.length) {
            console.error(`Invalid target index: ${finalIndex}`);
            return false;
        }
        
        // No change needed
        if (fromIndex === finalIndex) {
            return true;
        }

        // Standard array reordering: remove, then insert
        const [draggedCreature] = creatures.splice(fromIndex, 1);
        creatures.splice(finalIndex, 0, draggedCreature);
        
        // Notify state change
        if (this.onStateChange) {
            this.onStateChange();
        }

        return true;
    }

    // Get target index for creature drop based on mouse position
    getCreatureDropIndex(heroPosition, mouseX, heroContainer) {
        // Get visible creature elements (excluding the dragged one)
        const visibleElements = Array.from(heroContainer.querySelectorAll('.creature-icon'))
            .filter(el => !el.classList.contains('creature-dragging'));
        
        if (visibleElements.length === 0) {
            return 0;
        }

        // Find insertion point based on mouse position
        let insertIndex = 0;
        
        for (let i = 0; i < visibleElements.length; i++) {
            const rect = visibleElements[i].getBoundingClientRect();
            const centerX = rect.left + (rect.width / 2);
            
            if (mouseX > centerX) {
                insertIndex++;
            }
        }
        
        return insertIndex;
    }

    // Start creature drag operation
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
            draggedElement: draggedElement,
            originalParent: draggedElement.parentNode,
            originalNextSibling: draggedElement.nextSibling,
            previewPosition: null,
            previewHero: null
        };

        // Style the dragged element as a drag preview
        if (draggedElement) {
            draggedElement.classList.add('creature-dragging');
            // Store original position info for potential restoration
            draggedElement.dataset.originalHero = heroPosition;
            draggedElement.dataset.originalIndex = creatureIndex;
        }

        return true;
    }

    // End creature drag operation
    endCreatureDrag() {
        if (this.dragState.isDragging && this.dragState.draggedElement) {
            const draggedElement = this.dragState.draggedElement;
            
            // Clean up all drag-related classes and styles
            draggedElement.classList.remove('creature-dragging', 'creature-drop-preview');
            draggedElement.style.cssText = ''; // Clear any inline styles
            
            // Remove dataset attributes used for original position tracking
            delete draggedElement.dataset.originalHero;
            delete draggedElement.dataset.originalIndex;
        }

        // Reset drag state
        this.dragState = {
            isDragging: false,
            draggedCreature: null,
            draggedFromHero: null,
            draggedFromIndex: null,
            draggedElement: null,
            originalParent: null,
            originalNextSibling: null,
            previewPosition: null,
            previewHero: null
        };
    }

    showDropIndicator(heroPosition, insertIndex) {
        // Prevent rapid updates
        if (this.dragState.previewHero === heroPosition && 
            this.dragState.previewPosition === insertIndex) {
            return;
        }
        
        // Store state
        this.dragState.previewPosition = insertIndex;
        this.dragState.previewHero = heroPosition;
        
        const heroContainer = document.querySelector(`.hero-creatures[data-hero-position="${heroPosition}"]`);
        if (!heroContainer || !this.dragState.draggedElement) return;
        
        const draggedElement = this.dragState.draggedElement;
        const visibleElements = Array.from(heroContainer.querySelectorAll('.creature-icon'))
            .filter(el => el !== draggedElement); // Exclude the dragged element from calculations
        
        // Remove element from current position
        if (draggedElement.parentNode) {
            draggedElement.parentNode.removeChild(draggedElement);
        }
        
        // Style element as drop indicator
        draggedElement.classList.add('creature-drop-preview');
        draggedElement.style.cssText = `
            opacity: 0.5 !important;
            border: 2px dashed rgba(102, 126, 234, 0.8) !important;
            border-radius: 4px !important;
            background: rgba(102, 126, 234, 0.1) !important;
            animation: creatureDropPreview 1s ease-in-out infinite !important;
        `;
        
        // Insert element at the drop position
        if (insertIndex >= visibleElements.length) {
            heroContainer.appendChild(draggedElement);
        } else if (insertIndex === 0) {
            if (visibleElements.length > 0) {
                heroContainer.insertBefore(draggedElement, visibleElements[0]);
            } else {
                heroContainer.appendChild(draggedElement);
            }
        } else {
            heroContainer.insertBefore(draggedElement, visibleElements[insertIndex]);
        }
    }

    showDragPreview(heroPosition, insertIndex) {
        // Prevent rapid updates that cause flicker
        if (this.dragState.previewHero === heroPosition && 
            this.dragState.previewPosition === insertIndex) {
            return;
        }
        
        // Clear any existing preview
        this.clearDropIndicators();
        
        // Store preview state
        this.dragState.previewPosition = insertIndex;
        this.dragState.previewHero = heroPosition;
        
        // Update UI to show preview
        const heroContainer = document.querySelector(`.hero-creatures[data-hero-position="${heroPosition}"]`);
        if (!heroContainer) return;
        
        // Check if this would result in no change (creature returning to original position)
        const isOriginalPosition = heroPosition === this.dragState.draggedFromHero && 
                                insertIndex === this.dragState.draggedFromIndex;
        
        // Get visible creature elements
        const visibleElements = Array.from(heroContainer.querySelectorAll('.creature-icon'))
            .filter(el => !el.classList.contains('creature-dragging'));
        
        // Create placeholder with creature preview
        const placeholder = document.createElement('div');
        placeholder.className = isOriginalPosition ? 'creature-drop-placeholder original-position' : 'creature-drop-placeholder';
        placeholder.dataset.dropIndex = insertIndex;
        
        // Add the actual creature sprite as a preview (simplified - no frame extraction)
        if (this.dragState.draggedCreature) {
            const previewSprite = document.createElement('img');
            previewSprite.src = `./Creatures/${this.dragState.draggedCreature.name}.png`;
            previewSprite.className = 'creature-preview-sprite';
            previewSprite.alt = this.dragState.draggedCreature.name;
            previewSprite.style.cssText = `
                width: 32px;
                height: 32px;
                object-fit: cover;
                opacity: 0.6;
                filter: brightness(1.2);
            `;
            
            previewSprite.onerror = function() {
                // Fallback to placeholder if sprite fails to load
                const fallback = document.createElement('div');
                fallback.className = 'creature-preview-fallback';
                fallback.textContent = '👾';
                fallback.style.cssText = `
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                `;
                placeholder.replaceChild(fallback, previewSprite);
            };
            
            placeholder.appendChild(previewSprite);
        }
        
        // Insert placeholder at the appropriate position
        if (isOriginalPosition) {
            // For original position, find the hidden dragged element and insert before/after it
            const draggedElement = this.dragState.draggedElement;
            if (draggedElement && draggedElement.parentNode) {
                draggedElement.parentNode.insertBefore(placeholder, draggedElement);
            }
        } else {
            // Normal insertion logic for other positions
            if (insertIndex >= visibleElements.length) {
                heroContainer.appendChild(placeholder);
            } else if (insertIndex === 0) {
                if (visibleElements.length > 0) {
                    heroContainer.insertBefore(placeholder, visibleElements[0]);
                } else {
                    heroContainer.appendChild(placeholder);
                }
            } else {
                heroContainer.insertBefore(placeholder, visibleElements[insertIndex]);
            }
        }
    }

    clearDropIndicators() {
        // Instead of removing indicator elements, restore the dragged element to a neutral state
        if (this.dragState.draggedElement) {
            const draggedElement = this.dragState.draggedElement;
            
            // Remove drop preview styling
            draggedElement.classList.remove('creature-drop-preview');
            draggedElement.style.cssText = ''; // Clear inline styles
            
            // Restore original dragging state
            draggedElement.classList.add('creature-dragging');
        }
        
        this.dragState.previewPosition = null;
        this.dragState.previewHero = null;
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
        
        // Calculate the target drop index
        const targetIndex = this.getCreatureDropIndex(targetHeroPosition, dropX, targetContainer);
        
        // Same hero - handle reordering within hero
        if (targetHeroPosition === fromHeroPosition) {
            const success = this.reorderCreaturesWithinHero(targetHeroPosition, fromIndex, targetIndex);
            
            this.endCreatureDrag();
            return success;
        }
        
        // Different hero - Guard Change mode required
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
            draggedElement: null,
            previewPosition: null,
            previewHero: null
        };
    }

    // Sacrifice a creature (removes it and triggers sacrifice events)
    sacrificeCreature(heroPosition, creatureIndex, source = 'unknown') {
        if (!this.heroCreatures.hasOwnProperty(heroPosition)) {
            console.error(`Invalid hero position: ${heroPosition}`);
            return null;
        }

        const creatures = this.heroCreatures[heroPosition];
        if (creatureIndex < 0 || creatureIndex >= creatures.length) {
            console.error(`Invalid creature index: ${creatureIndex}`);
            return null;
        }

        const sacrificedCreature = creatures[creatureIndex];
        
        // Remove the creature using existing method
        const removedCreature = this.removeCreatureFromHero(heroPosition, creatureIndex);
        
        if (removedCreature && this.onCreatureSacrificed) {
            // Trigger sacrifice event for listeners (like GraveWorm)
            this.onCreatureSacrificed({
                heroPosition: heroPosition,
                creatureIndex: creatureIndex,
                creature: removedCreature,
                source: source
            });
        }
        
        return removedCreature;
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