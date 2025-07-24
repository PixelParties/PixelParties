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
        
        console.log('FormationManager initialized');
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

    // Get opponent's battle formation (properly aligned for battlefield view)
    getOpponentBattleFormation() {
        console.log('Getting opponent battle formation (aligned):', this.opponentBattleFormation);
        return { ...this.opponentBattleFormation };
    }

    // Notify abilities manager when heroes swap positions
    notifyHeroSwap(fromPosition, toPosition) {
        console.log(`Notifying ability manager of hero swap: ${fromPosition} <-> ${toPosition}`);
    }

    // Align opponent's formation since players face each other across the battlefield
    alignOpponentFormation(opponentFormation) {
        if (!opponentFormation) return { left: null, center: null, right: null };
        
        console.log('Aligning opponent formation - Input:', opponentFormation);
        
        const aligned = {
            left: opponentFormation.left || null,     // Their left aligns with our left view
            center: opponentFormation.center || null, // Center stays center
            right: opponentFormation.right || null    // Their right aligns with our right view
        };
        
        console.log('Aligning opponent formation - Output:', aligned);
        return aligned;
    }

    // Update opponent's formation (apply alignment for proper battlefield view)
    updateOpponentFormation(formationData) {
        console.log('Received formation update from opponent:', formationData);
        
        if (formationData.battleFormation) {
            // Align the opponent's formation since we're facing each other
            this.opponentBattleFormation = this.alignOpponentFormation(formationData.battleFormation);
            console.log('Updated opponent formation (aligned):', this.opponentBattleFormation);
            console.log('Original opponent formation:', formationData.battleFormation);
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
        
        console.log(`Started dragging ${character.name} from ${fromSlot} slot`);
    }
    
    // Handle drop on a formation slot
    async handleDrop(targetSlot) {
        if (!this.dragState.isDragging) return false;
        
        const draggedCharacter = this.dragState.draggedCharacter;
        const originalSlot = this.dragState.originalSlot;
        const targetCharacter = this.battleFormation[targetSlot];
        
        console.log(`Dropping ${draggedCharacter.name} on ${targetSlot} slot`);
        
        // Store swap info for abilities update
        let swapInfo = null;
        
        if (targetCharacter) {
            // Swap characters
            this.battleFormation[originalSlot] = targetCharacter;
            this.battleFormation[targetSlot] = draggedCharacter;
            swapInfo = { from: originalSlot, to: targetSlot, wasSwap: true };
            console.log(`Swapped ${draggedCharacter.name} with ${targetCharacter.name}`);
        } else {
            // Move to empty slot
            this.battleFormation[originalSlot] = null;
            this.battleFormation[targetSlot] = draggedCharacter;
            swapInfo = { from: originalSlot, to: targetSlot, wasSwap: false };
            console.log(`Moved ${draggedCharacter.name} to empty ${targetSlot} slot`);
        }
        
        this.endDrag();
        
        // Return swap info for abilities update
        return swapInfo;
    }
    
    // Handle drop outside valid areas
    handleInvalidDrop() {
        if (!this.dragState.isDragging) return;
        
        console.log(`Invalid drop, returning ${this.dragState.draggedCharacter.name} to ${this.dragState.originalSlot} slot`);
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
        
        console.log('Imported formation state');
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
        console.log('FormationManager reset');
    }
}