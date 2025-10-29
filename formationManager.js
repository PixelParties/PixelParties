// formationManager.js - Battle Formation and Drag/Drop Management Module

export class FormationManager {
    constructor() {
        // Battle formation state - tracks which character is in which slot
        this.battleFormation = {
            left: null,
            center: null,
            right: null
        };
        
        // OPPONENT's battle formation - tracks opponent's formation (ALIGNED for proper battlefield view)
        this.opponentBattleFormation = {
            left: null,
            center: null,
            right: null
        };
        
        // Drag and drop state
        this.dragState = {
            isDragging: false,
            draggedCharacter: null,
            originalSlot: null,
            draggedElement: null
        };
    }

    // Initialize with selected character in center
    initWithCharacter(character) {
        this.battleFormation = {
            left: null,
            center: character,
            right: null
        };
    }
    

    // Get player's battle formation
    getBattleFormation() {
        return { ...this.battleFormation };
    }

    // Get the number of heroes currently in the formation
    getHeroCount() {
        let count = 0;
        if (this.battleFormation.left !== null) count++;
        if (this.battleFormation.center !== null) count++;
        if (this.battleFormation.right !== null) count++;
        return count;
    }

    // Get opponent's battle formation (properly aligned for battlefield view)
    getOpponentBattleFormation() {
        return { ...this.opponentBattleFormation };
    }

    // Update hero at specific position (for ascension transformations)
    updateHeroAtPosition(position, newHeroData) {
        if (!['left', 'center', 'right'].includes(position)) {
            console.error('Invalid position for hero update:', position);
            return false;
        }
        
        // Ensure we don't lose any existing hero data by merging
        if (this.battleFormation[position]) {
            this.battleFormation[position] = { 
                ...this.battleFormation[position], // Preserve existing data
                ...newHeroData // Apply new hero data (name, image, stats, etc.)
            };
        } else {
            // If slot was empty, just set the new hero data
            this.battleFormation[position] = { ...newHeroData };
        }
        
        return true;
    }

    // Align opponent's formation since players face each other across the battlefield
    alignOpponentFormation(opponentFormation) {
        if (!opponentFormation) return { left: null, center: null, right: null };
            
        const aligned = {
            left: opponentFormation.left || null,     // Their left aligns with our left view
            center: opponentFormation.center || null, // Center stays center
            right: opponentFormation.right || null    // Their right aligns with our right view
        };
        return aligned;
    }

    // Update opponent's formation (apply alignment for proper battlefield view)
    updateOpponentFormation(formationData) {        
        if (formationData.battleFormation) {
            // Align the opponent's formation since we're facing each other
            this.opponentBattleFormation = this.alignOpponentFormation(formationData.battleFormation);
        }
    }

    // Start dragging a character from battle formation
    startDrag(character, fromSlot, draggedElement) {
        this.dragState = {
            isDragging: true,
            draggedCharacter: character,
            originalSlot: fromSlot,
            draggedElement: draggedElement
        };
        
        // Add visual feedback
        draggedElement.style.opacity = '0.5';
        draggedElement.style.transform = 'scale(0.9)';
        draggedElement.classList.add('dragging');
    }
    
    // Handle drop on a formation slot
    async handleDrop(targetSlot) {
        if (!this.dragState.isDragging) return false;
        
        const draggedCharacter = this.dragState.draggedCharacter;
        const originalSlot = this.dragState.originalSlot;
        const targetCharacter = this.battleFormation[targetSlot];
                
        // Store swap info for abilities update
        let swapInfo = null;
        
        if (targetCharacter) {
            // Swap characters
            this.battleFormation[originalSlot] = targetCharacter;
            this.battleFormation[targetSlot] = draggedCharacter;
            swapInfo = { from: originalSlot, to: targetSlot, wasSwap: true };
        } else {
            // Move to empty slot
            this.battleFormation[originalSlot] = null;
            this.battleFormation[targetSlot] = draggedCharacter;
            swapInfo = { from: originalSlot, to: targetSlot, wasSwap: false };
        }
        
        this.endDrag();
        
        // Return swap info for abilities update
        return swapInfo;
    }
    
    // Handle drop outside valid areas
    handleInvalidDrop() {
        if (!this.dragState.isDragging) return;
        
        this.endDrag();
    }
    
    // End drag operation
    endDrag() {
        if (this.dragState.draggedElement) {
            this.dragState.draggedElement.style.opacity = '';
            this.dragState.draggedElement.style.transform = '';
            this.dragState.draggedElement.classList.remove('dragging');
        }
        
        this.dragState = {
            isDragging: false,
            draggedCharacter: null,
            originalSlot: null,
            draggedElement: null
        };
    }

    // Get drag state
    getDragState() {
        return { ...this.dragState };
    }

    // Check if currently dragging
    isDragging() {
        return this.dragState.isDragging;
    }

    // Export formation state (for saving)
    exportFormationState() {
        return {
            battleFormation: { ...this.battleFormation },
            opponentBattleFormation: { ...this.opponentBattleFormation }
        };
    }

    // Import formation state (for loading)
    importFormationState(formationState, isHost) {
        if (!formationState) return false;
        
        if (formationState.battleFormation) {
            this.battleFormation = { ...formationState.battleFormation };
        }
        
        if (formationState.opponentBattleFormation) {
            this.opponentBattleFormation = { ...formationState.opponentBattleFormation };
        }
        return true;
    }

    // Reset to initial state
    reset() {
        this.battleFormation = { left: null, center: null, right: null };
        this.opponentBattleFormation = { left: null, center: null, right: null };
        this.dragState = {
            isDragging: false,
            draggedCharacter: null,
            originalSlot: null,
            draggedElement: null
        };
    }
}