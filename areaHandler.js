// areaHandler.js - Area Card Management Module
export class AreaHandler {
    constructor() {
        this.areaCard = null;
        this.opponentAreaCard = null;
        this.heroSelection = null;
    }

    init(heroSelection) {
        this.heroSelection = heroSelection;
        this.setupGlobalFunctions();
    }

    setupGlobalFunctions() {
        if (typeof window !== 'undefined') {
            window.onAreaSlotDragOver = (event) => this.onAreaSlotDragOver(event);
            window.onAreaSlotDragEnter = (event) => this.onAreaSlotDragEnter(event);
            window.onAreaSlotDragLeave = (event) => this.onAreaSlotDragLeave(event);
            window.onAreaSlotDrop = (event) => this.onAreaSlotDrop(event);
            window.onAreaCardDragStart = (event, cardDataJson) => this.onAreaCardDragStart(event, cardDataJson);
            window.onAreaCardDragEnd = (event) => this.onAreaCardDragEnd(event);
        }
    }

    isAreaCard(cardName) {
        if (!this.heroSelection) return false;
        const cardInfo = this.heroSelection.getCardInfo(cardName);
        return cardInfo && cardInfo.subtype === 'Area';
    }

    getAreaCard() { return this.areaCard; }
    setAreaCard(card) { this.areaCard = card; }
    clearAreaCard() { this.areaCard = null; }

    createAreaSlotHTML() {
        const areaCard = this.getAreaCard();
        const slotClass = areaCard ? 'area-slot filled' : 'area-slot empty';
        const areaCardHTML = areaCard ? this.createAreaCardHTML(areaCard) : 
            '<div class="area-placeholder"><div class="area-globe">🌍</div><div class="area-label">Area</div></div>';
        
        return `
            <div class="${slotClass}" data-slot-type="area"
                ondragover="window.onAreaSlotDragOver(event)"
                ondrop="window.onAreaSlotDrop(event)"
                ondragleave="window.onAreaSlotDragLeave(event)"
                ondragenter="window.onAreaSlotDragEnter(event)">
                ${areaCardHTML}
            </div>
        `;
    }

    createAreaCardHTML(areaCard) {
        const cardData = {
            imagePath: areaCard.image,
            displayName: this.formatCardName(areaCard.name),
            cardType: 'area'
        };
        const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
        
        return `
            <div class="area-card" data-area-card="${areaCard.name}" draggable="true"
                ondragstart="window.onAreaCardDragStart(event, '${JSON.stringify(areaCard).replace(/"/g, '&quot;')}')"
                ondragend="window.onAreaCardDragEnd(event)"
                onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                onmouseleave="window.hideCardTooltip()">
                <div class="area-card-image-container">
                    <img src="${areaCard.image}" alt="${areaCard.name}" class="area-card-image"
                        onerror="this.src='./Cards/placeholder.png'">
                </div>
            </div>
        `;
    }

    formatCardName(cardName) {
        return cardName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }

    // Drag and drop handlers
    onAreaSlotDragOver(event) {
        if (this.heroSelection?.handManager?.isHandDragging()) {
            const dragState = this.heroSelection.handManager.getHandDragState();
            if (this.isAreaCard(dragState.draggedCardName)) {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.classList.add('area-drop-ready');
                return;
            }
        }
        event.currentTarget.classList.add('area-drop-invalid');
    }

    onAreaSlotDragEnter(event) {
        // Similar logic to drag over
    }

    onAreaSlotDragLeave(event) {
        const slot = event.currentTarget;
        const rect = slot.getBoundingClientRect();
        const x = event.clientX, y = event.clientY, margin = 10;
        
        if (x < rect.left - margin || x > rect.right + margin || y < rect.top - margin || y > rect.bottom + margin) {
            slot.classList.remove('area-drop-ready', 'area-drop-invalid');
        }
    }

    async onAreaSlotDrop(event) {
        event.preventDefault();
        const slot = event.currentTarget;
        slot.classList.remove('area-drop-ready', 'area-drop-invalid');
        
        if (this.heroSelection?.handManager?.isHandDragging()) {
            const dragState = this.heroSelection.handManager.getHandDragState();
            if (this.isAreaCard(dragState.draggedCardName)) {
                return await this.handleAreaCardDrop(dragState.draggedCardName, dragState.draggedCardIndex);
            }
        }
        return false;
    }

    onAreaCardDragStart(event, cardDataJson) {
        // Handle existing area card dragging
        try {
            const cardData = JSON.parse(cardDataJson.replace(/&quot;/g, '"'));
            event.dataTransfer.setData('application/x-area-card', cardDataJson);
            event.target.closest('.area-card').classList.add('area-card-dragging');
        } catch (error) {
            event.preventDefault();
        }
    }

    onAreaCardDragEnd(event) {
        document.querySelectorAll('.area-card-dragging').forEach(el => el.classList.remove('area-card-dragging'));
        document.querySelectorAll('.area-slot').forEach(slot => {
            slot.classList.remove('area-drop-ready', 'area-drop-invalid');
        });
    }

    async handleAreaCardDrop(cardName, cardIndex) {
        if (!this.heroSelection) {
            this.showAreaDropResult('Invalid drop!', false);
            this.heroSelection.handManager.endHandCardDrag();
            return false;
        }

        const cardInfo = this.heroSelection.getCardInfo(cardName);
        if (!cardInfo) {
            this.showAreaDropResult('Invalid area card!', false);
            this.heroSelection.handManager.endHandCardDrag();
            return false;
        }

        // Check if replacing an existing area card
        const isReplacement = this.areaCard !== null;
        const previousAreaName = isReplacement ? this.areaCard.name : null;

        // Create new area card object
        const newAreaCard = {
            name: cardName,
            image: cardInfo.image || `./Cards/Areas/${cardName}.png`,
            cost: cardInfo.cost || 0,
            effects: cardInfo.effects || []
        };

        // Initialize GatheringStorm with counters using gatheringStorm.js
        if (cardName === 'GatheringStorm') {
            // If replacing an existing GatheringStorm, preserve its counters
            if (isReplacement && previousAreaName === 'GatheringStorm' && this.areaCard.stormCounters) {
                newAreaCard.stormCounters = this.areaCard.stormCounters;
            } else {
                // Initialize new GatheringStorm using the external function
                import('../Spells/gatheringStorm.js').then(({ initializeGatheringStormArea }) => {
                    initializeGatheringStormArea(newAreaCard);
                }).catch(error => {
                    // Fallback initialization
                    newAreaCard.stormCounters = 1;
                });
                newAreaCard.stormCounters = 1; // Immediate initialization
            }
        }

        // Handle action costs (only if this card requires an action)
        if (cardInfo.action && this.heroSelection.actionManager) {
            const actionCheck = this.heroSelection.actionManager.canPlayActionCard(cardInfo);
            if (!actionCheck.canPlay) {
                this.heroSelection.handManager.endHandCardDrag();
                return false;
            }
            this.heroSelection.actionManager.consumeAction();
        }

        // Set the new area card (replaces any existing one)
        this.setAreaCard(newAreaCard);

        // Remove card from hand
        this.heroSelection.handManager.removeCardFromHandByIndex(cardIndex);

        // Show appropriate success message
        const formattedName = this.formatCardName(cardName);
        let successMessage;
        
        if (isReplacement) {
            const previousFormatted = this.formatCardName(previousAreaName);
            if (previousAreaName === cardName) {
                if (cardName === 'GatheringStorm') {
                    successMessage = `${formattedName} replaced with a fresh copy! (${newAreaCard.stormCounters}x power)`;
                } else {
                    successMessage = `${formattedName} replaced with a fresh copy!`;
                }
            } else {
                if (cardName === 'GatheringStorm') {
                    successMessage = `${previousFormatted} replaced with ${formattedName}! (${newAreaCard.stormCounters}x power)`;
                } else {
                    successMessage = `${previousFormatted} replaced with ${formattedName}!`;
                }
            }
        } else {
            if (cardName === 'GatheringStorm') {
                successMessage = `${formattedName} placed! (${newAreaCard.stormCounters}x power)`;
            } else {
                successMessage = `${formattedName} placed!`;
            }
        }
        
        this.showAreaDropResult(successMessage, true);

        // Update UI and save state
        this.heroSelection.updateHandDisplay(); // ← ADD THIS LINE
        this.heroSelection.updateActionDisplay(); // ← ADD THIS LINE (for action cost display)
        this.heroSelection.updateBattleFormationUI();
        await this.heroSelection.saveGameState();
        await this.heroSelection.sendFormationUpdate();

        this.heroSelection.handManager.endHandCardDrag();
        return true;
    }

    updateAreaDisplay() {
        // Find area slot in the UI
        const areaSlot = document.querySelector('.area-slot');
        if (!areaSlot) return;
        
        const currentArea = this.getAreaCard();
        if (!currentArea) return;
        
        // If it's a GatheringStorm, update the display to show counters
        if (currentArea.name === 'GatheringStorm' && currentArea.stormCounters > 1) {
            // Add a counter display overlay
            let counterDisplay = areaSlot.querySelector('.storm-counter-display');
            
            if (!counterDisplay) {
                counterDisplay = document.createElement('div');
                counterDisplay.className = 'storm-counter-display';
                counterDisplay.style.cssText = `
                    position: absolute;
                    top: -10px;
                    right: -10px;
                    width: 30px;
                    height: 30px;
                    background: linear-gradient(135deg, #4a90e2, #7b68ee);
                    color: white;
                    border: 2px solid #fff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: bold;
                    z-index: 10;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                    animation: counterPulse 2s ease-in-out infinite;
                `;
                areaSlot.appendChild(counterDisplay);
                
                // Add CSS for pulse animation if not already present
                if (!document.getElementById('stormCounterStyles')) {
                    const style = document.createElement('style');
                    style.id = 'stormCounterStyles';
                    style.textContent = `
                        @keyframes counterPulse {
                            0%, 100% { transform: scale(1); opacity: 1; }
                            50% { transform: scale(1.1); opacity: 0.8; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
            
            counterDisplay.textContent = `${currentArea.stormCounters}x`;
        }
    }

    showAreaDropResult(message, success) {
        const areaSlot = document.querySelector('.area-slot');
        if (!areaSlot) return;
        
        const feedback = document.createElement('div');
        feedback.className = `area-drop-feedback ${success ? 'success' : 'error'}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: absolute; top: -40px; left: 50%; transform: translateX(-50%);
            padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: bold;
            z-index: 1000; animation: fadeInOut 2s ease-out; pointer-events: none;
            ${success ? 'background: rgba(76, 175, 80, 0.9); color: white;' : 'background: rgba(244, 67, 54, 0.9); color: white;'}
        `;
        
        areaSlot.style.position = 'relative';
        areaSlot.appendChild(feedback);
        setTimeout(() => feedback.remove(), 2000);
    }

    isDraggingAreaCard() {
        if (!this.heroSelection?.handManager?.isHandDragging()) return false;
        const dragState = this.heroSelection.handManager.getHandDragState();
        return this.isAreaCard(dragState.draggedCardName);
    }

    // State management
    exportAreaState() {
        return { areaCard: this.areaCard, opponentAreaCard: this.opponentAreaCard };
    }

    importAreaState(areaState) {
        if (!areaState) return false;
        this.areaCard = areaState.areaCard || null;
        this.opponentAreaCard = areaState.opponentAreaCard || null;
        return true;
    }

    reset() {
        this.areaCard = null;
        this.opponentAreaCard = null;
    }

    getFormationUpdateData() {
        return { areaCard: this.areaCard };
    }

    handleFormationUpdateReceived(data) {
        if (data.areaCard) {
            this.opponentAreaCard = data.areaCard;
        }
    }

    getBattleInitData() {
        return { playerAreaCard: this.areaCard, opponentAreaCard: this.opponentAreaCard };
    }
}

// CSS injection
if (typeof document !== 'undefined' && !document.getElementById('areaStyles')) {
    const style = document.createElement('style');
    style.id = 'areaStyles';
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
            20% { opacity: 1; transform: translateX(-50%) translateY(0); }
            80% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
    `;
    document.head.appendChild(style);
}

export default AreaHandler;