// heroSelectionUI.js - Hero Selection UI Generation Module with Enhanced Tooltip Management

export class HeroSelectionUI {
    constructor() {
        console.log('HeroSelectionUI initialized');
    }

    // Helper method to format card names
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Create character card HTML
    createCharacterCardHTML(character, isSelectable = true, isSelected = false, showTooltip = false, isDraggable = false, slotPosition = null, includeAbilityZones = false, heroAbilitiesManager = null) {
        const selectableClass = isSelectable ? 'character-selectable' : '';
        const selectedClass = isSelected ? 'character-selected' : '';
        const draggableClass = isDraggable ? 'character-draggable' : '';
        
        let tooltipEvents = '';
        if (showTooltip) {
            const cardData = {
                imagePath: character.image,
                displayName: character.name,
                cardType: 'character'
            };
            const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
            tooltipEvents = `onmouseenter="window.showCardTooltip('${cardDataJson}', this)" onmouseleave="window.hideCardTooltip()"`;
        }
        
        let dragEvents = '';
        if (isDraggable && slotPosition) {
            const characterJson = JSON.stringify(character).replace(/"/g, '&quot;');
            dragEvents = `
                draggable="true"
                ondragstart="window.onHeroDragStart(event, '${characterJson}', '${slotPosition}')"
                ondragend="window.onHeroDragEnd(event)"
            `;
        }
        
        let hoverEvents = '';
        if (isSelectable && !showTooltip && !isDraggable) {
            hoverEvents = `onmouseenter="window.showCharacterPreview(${character.id})"`;
        }
        
        // Only show character name if NOT in team building (no ability zones)
        const showCharacterName = !includeAbilityZones;
        
        // Add ability zones HTML if requested
        const abilityZonesHTML = includeAbilityZones ? 
            this.createAbilityZonesHTML(slotPosition, heroAbilitiesManager) : '';
        
        return `
            <div class="character-card ${selectableClass} ${selectedClass} ${draggableClass} ${includeAbilityZones ? 'with-ability-zones' : ''}" 
                data-character-id="${character.id}"
                data-slot-position="${slotPosition || ''}"
                ${isSelectable && !isDraggable ? `onclick="window.selectCharacterCard(${character.id})"` : ''}
                ${hoverEvents}>
                <div class="character-image-container">
                    <img src="${character.image}" 
                        alt="${character.name}" 
                        class="character-image"
                        ${tooltipEvents}
                        ${dragEvents}
                        onerror="this.src='./Cards/Characters/placeholder.png'">
                </div>
                ${showCharacterName ? `<div class="character-name">${character.name}</div>` : ''}
                ${abilityZonesHTML}
            </div>
        `;
    }

    // Create ability zones HTML for a hero (visual only, no drop handlers)
    createAbilityZonesHTML(position, heroAbilitiesManager) {
        const abilities = heroAbilitiesManager ? heroAbilitiesManager.getHeroAbilities(position) : null;
        
        const createZoneHTML = (zoneNumber) => {
            const zoneAbilities = abilities ? abilities[`zone${zoneNumber}`] : [];
            const hasAbilities = zoneAbilities && zoneAbilities.length > 0;
            
            if (hasAbilities) {
                const ability = zoneAbilities[0]; // For now, just show the first ability
                const stackCount = zoneAbilities.length;
                
                // Create tooltip data for the ability
                const cardData = {
                    imagePath: ability.image,
                    displayName: this.formatCardName(ability.name),
                    cardType: 'ability'
                };
                const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
                
                return `
                    <div class="ability-zone filled" 
                         data-position="${position}" 
                         data-zone="${zoneNumber}">
                        <img src="${ability.image}" 
                             alt="${ability.name}" 
                             class="ability-card-image"
                             onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                             onmouseleave="window.hideCardTooltip()"
                             onerror="this.src='./Cards/placeholder.png'">
                        <div class="ability-stack-count">${stackCount}</div>
                    </div>
                `;
            } else {
                return `
                    <div class="ability-zone" 
                         data-position="${position}" 
                         data-zone="${zoneNumber}">
                        <div class="zone-placeholder">Z${zoneNumber}</div>
                    </div>
                `;
            }
        };
        
        return `
            <div class="hero-ability-zones" data-hero-position="${position}">
                ${createZoneHTML(1)}
                ${createZoneHTML(2)}
                ${createZoneHTML(3)}
            </div>
        `;
    }

    // Create team building slot HTML
    createTeamSlotHTML(position, character = null, createCharacterCardFn, heroAbilitiesManager = null) {
        const mouseEvents = character ? `
            onmouseenter="window.showHeroSpellbookTooltip('${position}')"
            onmouseleave="window.hideHeroSpellbookTooltip()"
        ` : '';

        const slotClass = character ? 'team-slot filled' : 'team-slot empty';
        const characterHTML = character ? 
            this.createCharacterCardHTML(character, false, false, true, true, position, true, heroAbilitiesManager) : 
            '<div class="slot-placeholder">Empty Slot</div>';
        
        // Add drag handlers for both hero swapping AND ability attachment
        return `
            <div class="${slotClass}" 
                 data-position="${position}"
                 ondragover="window.onTeamSlotDragOver(event, '${position}')"
                 ondrop="window.onTeamSlotDrop(event, '${position}')"
                 ondragleave="window.onTeamSlotDragLeave(event)"
                 ondragenter="window.onTeamSlotDragEnter(event)">
                ${characterHTML}
            </div>
        `;
    }

    // Generate selection screen HTML
    generateSelectionHTML(playerCharacters) {
        console.log('generateSelectionHTML called');
        console.log('Player characters length:', playerCharacters.length);
        console.log('Player characters:', playerCharacters.map(c => c.name));
        
        if (playerCharacters.length === 0) {
            console.log('No player characters available, showing waiting message...');
            return `
                <div class="hero-selection-waiting">
                    <h2>⚔️ Preparing Battle Arena...</h2>
                    <p>Waiting for character assignments...</p>
                </div>
            `;
        }

        console.log('Generating character cards HTML...');
        const playerCardsHTML = playerCharacters
            .map(char => {
                console.log('Creating card for character:', char.name);
                return this.createCharacterCardHTML(char, true, false);
            })
            .join('');

        console.log('Generated player cards HTML length:', playerCardsHTML.length);

        const fullHTML = `
            <div class="hero-selection-container">
                <!-- Left Column - Character Selection -->
                <div class="character-selection-column">
                    <div class="selection-header">
                        <h2>⚔️ Choose Your Hero</h2>
                        <p>Select one character from your roster to fight for victory!</p>
                        <p class="hover-hint">💡 Hover over characters to toggle their card previews!</p>
                    </div>
                    
                    <div class="character-selection-grid">
                        ${playerCardsHTML}
                    </div>
                    
                    <div class="selection-status">
                        <div class="waiting-message">
                            <span class="status-text">Choose your hero...</span>
                            <div class="selection-spinner"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Column - Card Preview -->
                <div class="card-preview-column">
                    <div class="card-preview-placeholder">
                        <div class="preview-icon">🃏</div>
                        <div>Hover over a character to toggle their cards</div>
                    </div>
                </div>
            </div>
        `;

        console.log('Generated full selection HTML length:', fullHTML.length);
        return fullHTML;
    }

    // Generate team building screen HTML
    generateTeamBuildingHTML(selectedCharacter, battleFormation, deckGrid, handDisplay, lifeDisplay, goldDisplay, createTeamSlotFn) {
        if (!selectedCharacter) {
            return '<div class="loading-heroes"><h2>❌ No character selected</h2></div>';
        }

        const leftSlot = createTeamSlotFn('left', battleFormation.left);
        const centerSlot = createTeamSlotFn('center', battleFormation.center);
        const rightSlot = createTeamSlotFn('right', battleFormation.right);

        return `
            ${lifeDisplay}
            <div class="team-building-container">
                <!-- Left Column - Team Formation -->
                <div class="team-building-left">
                    <div class="team-header">
                        <h2>🛡️ Your Battle Formation</h2>
                        <p class="drag-hint">💡 Drag and drop heroes to rearrange your formation!</p>
                        <p class="drag-hint">🎯 Drag ability cards to any hero slot to attach them!</p>
                    </div>
                    
                    <div class="team-slots-container">
                        ${leftSlot}
                        ${centerSlot}
                        ${rightSlot}
                    </div>
                    
                    <!-- Hand directly below hero slots -->
                    <div class="hand-display-area-inline">
                        ${handDisplay}
                    </div>
                </div>
                
                <!-- Right Column - Player's Deck -->
                <div class="team-building-right">
                    ${deckGrid}
                </div>
                
                <!-- Gold Display - Now positioned in center between hand and deck -->
                ${goldDisplay}
            </div>
        `;
    }

    // Update the battle formation UI after drag/drop
    updateBattleFormationUI(battleFormation, createTeamSlotFn) {
        const teamSlotsContainer = document.querySelector('.team-slots-container');
        if (teamSlotsContainer) {
            teamSlotsContainer.innerHTML = `
                ${createTeamSlotFn('left', battleFormation.left)}
                ${createTeamSlotFn('center', battleFormation.center)}
                ${createTeamSlotFn('right', battleFormation.right)}
            `;
        }
    }
}

// ===== ENHANCED DRAG AND DROP HANDLERS WITH IMPROVED TOOLTIP MANAGEMENT =====

// Global tooltip tracking
let currentTooltip = null;
let currentTooltipSlot = null;

// Helper function to clean up any existing tooltips
function cleanupAllAbilityTooltips() {
    const allTooltips = document.querySelectorAll('.ability-drop-tooltip, .spell-drop-tooltip');
    allTooltips.forEach(tooltip => tooltip.remove());
    currentTooltip = null;
    currentTooltipSlot = null;
}

// Enhanced team slot drag over handler
function onTeamSlotDragOver(event, position) {
    // Check if an ability card is being dragged
    if (window.heroSelection && window.heroSelection.heroAbilitiesManager && 
        window.handManager && window.handManager.isHandDragging()) {
        
        const dragState = window.handManager.getHandDragState();
        const cardName = dragState.draggedCardName;
        
        // Check if it's an ability card
        if (window.heroSelection.heroAbilitiesManager.isAbilityCard(cardName)) {
            // Prevent default behavior
            event.preventDefault();
            event.stopPropagation();
            
            const slot = event.currentTarget;
            
            // Clean up tooltip from other slots if we're over a different slot
            if (currentTooltipSlot && currentTooltipSlot !== slot) {
                cleanupAllAbilityTooltips();
                
                // Also clean up visual states from the previous slot
                currentTooltipSlot.classList.remove('ability-drop-ready', 'ability-drop-invalid');
            }
            
            // Check if tooltip already exists for this slot
            let existingTooltip = slot.querySelector('.ability-drop-tooltip');
            
            if (!existingTooltip) {
                console.log('🔍 Creating new centered tooltip for', position);
                
                // Validate the drag operation
                const handled = window.onTeamSlotAbilityDragOver(event, position);
                
                // Get tooltip information
                const tooltipInfo = window.heroSelection.heroAbilitiesManager.getAbilityDropTooltipInfo(position);
                
                // Set appropriate CSS classes
                if (tooltipInfo.canDrop) {
                    slot.classList.add('ability-drop-ready');
                    slot.classList.remove('ability-drop-invalid');
                } else {
                    slot.classList.add('ability-drop-invalid');
                    slot.classList.remove('ability-drop-ready');
                }
                
                // Create tooltip element
                const tooltip = document.createElement('div');
                
                // Determine CSS classes based on tooltip info
                let tooltipClasses = `ability-drop-tooltip ${tooltipInfo.type}`;
                
                // Add class for long text if needed
                if (tooltipInfo.message.length > 30) {
                    tooltipClasses += ' long-text';
                }
                
                tooltip.className = tooltipClasses;
                tooltip.textContent = tooltipInfo.message;
                
                // Important properties for correct display
                tooltip.style.pointerEvents = 'none';
                tooltip.style.userSelect = 'none';
                
                // Add tooltip to slot
                slot.appendChild(tooltip);
                
                // Track current tooltip and slot
                currentTooltip = tooltip;
                currentTooltipSlot = slot;
                
                console.log('🔍 Centered tooltip created:', {
                    message: tooltipInfo.message,
                    length: tooltipInfo.message.length,
                    longText: tooltipInfo.message.length > 30,
                    canDrop: tooltipInfo.canDrop
                });
                
            } else {
                // Tooltip already exists, just update the classes
                const tooltipInfo = window.heroSelection.heroAbilitiesManager.getAbilityDropTooltipInfo(position);
                
                if (tooltipInfo.canDrop) {
                    slot.classList.add('ability-drop-ready');
                    slot.classList.remove('ability-drop-invalid');
                } else {
                    slot.classList.add('ability-drop-invalid');
                    slot.classList.remove('ability-drop-ready');
                }
                
                // Update tracking
                currentTooltip = existingTooltip;
                currentTooltipSlot = slot;
            }
            
            return;
        }

        // Check if it's a spell card
        if (window.heroSelection.heroSpellbookManager.isSpellCard(cardName)) {
            event.preventDefault();
            
            const slot = event.currentTarget;
            
            // Clean up tooltip from other slots if we're over a different slot
            if (currentTooltipSlot && currentTooltipSlot !== slot) {
                cleanupAllAbilityTooltips();
                currentTooltipSlot.classList.remove('spell-drop-ready', 'spell-drop-invalid');
            }
            
            // Check if tooltip already exists for this slot
            let existingTooltip = slot.querySelector('.spell-drop-tooltip');
            
            if (!existingTooltip) {
                // Check if hero can learn the spell
                const learnCheck = window.heroSelection.canHeroLearnSpell(position, cardName);
                
                // Set visual state
                if (learnCheck.canLearn) {
                    slot.classList.add('spell-drop-ready');
                    slot.classList.remove('spell-drop-invalid');
                } else {
                    slot.classList.add('spell-drop-invalid');
                    slot.classList.remove('spell-drop-ready');
                }
                
                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.className = `spell-drop-tooltip ${learnCheck.canLearn ? 'can-learn' : 'cannot-learn'}`;
                
                // Add long-text class if needed
                if (learnCheck.reason && learnCheck.reason.length > 30) {
                    tooltip.className += ' long-text';
                }
                
                tooltip.textContent = learnCheck.canLearn ? 
                    `${learnCheck.heroName} can learn ${window.heroSelection.formatCardName(cardName)}!` : 
                    learnCheck.reason;
                
                // Set initial style for positioning
                tooltip.style.cssText = `
                    position: fixed;
                    z-index: 10000;
                    pointer-events: none;
                    animation: fadeIn 0.3s ease-out;
                `;
                
                // Add to body first to calculate dimensions
                document.body.appendChild(tooltip);
                
                // Calculate position after adding to DOM
                const slotRect = slot.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                const leftPos = slotRect.left + (slotRect.width / 2) - (tooltipRect.width / 2);
                const topPos = slotRect.top - tooltipRect.height - 10; // 10px gap above slot
                
                // Apply calculated position
                tooltip.style.left = `${leftPos}px`;
                tooltip.style.top = `${topPos}px`;
                
                // Check if tooltip goes off screen and adjust
                if (leftPos < 10) {
                    tooltip.style.left = '10px';
                } else if (leftPos + tooltipRect.width > window.innerWidth - 10) {
                    tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
                }
                
                if (topPos < 10) {
                    // If tooltip would go off top, position it below the slot instead
                    tooltip.style.top = `${slotRect.bottom + 10}px`;
                }
                
                // Remove from body and add to slot
                document.body.removeChild(tooltip);
                slot.appendChild(tooltip);
                
                // Update position to be relative to slot
                tooltip.style.position = 'absolute';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.top = `-${tooltipRect.height + 10}px`;
                
                // Track current tooltip and slot
                currentTooltip = tooltip;
                currentTooltipSlot = slot;
            } else {
                // Tooltip already exists, just update the classes
                const learnCheck = window.heroSelection.canHeroLearnSpell(position, cardName);
                
                if (learnCheck.canLearn) {
                    slot.classList.add('spell-drop-ready');
                    slot.classList.remove('spell-drop-invalid');
                } else {
                    slot.classList.add('spell-drop-invalid');
                    slot.classList.remove('spell-drop-ready');
                }
                
                // Update tracking
                currentTooltip = existingTooltip;
                currentTooltipSlot = slot;
            }
            
            return;
        }
    }
    
    // Otherwise handle hero drag
    if (window.heroSelection && window.heroSelection.formationManager.isDragging()) {
        window.onHeroSlotDragOver(event);
    }
}

function onTeamSlotDragEnter(event) {
    // Similar check for drag enter
    if (window.heroSelection && window.heroSelection.heroAbilitiesManager && 
        window.handManager && window.handManager.isHandDragging()) {
        const dragState = window.handManager.getHandDragState();
        const cardName = dragState.draggedCardName;
        
        if (window.heroSelection.heroAbilitiesManager.isAbilityCard(cardName)) {
            const slot = event.currentTarget;
            // Don't add visual state here - let dragOver handle it
            return;
        }
    }
    
    if (window.heroSelection && window.heroSelection.formationManager.isDragging()) {
        window.onHeroSlotDragEnter(event);
    }
}

function onTeamSlotDragLeave(event) {
    const slot = event.currentTarget;
    const rect = slot.getBoundingClientRect();
    
    // Get the related target (where the cursor is going)
    const relatedTarget = event.relatedTarget;
    
    // Check if we're moving to a child element of the slot
    if (relatedTarget && slot.contains(relatedTarget)) {
        return; // Don't remove anything if we're still within the slot
    }
    
    // Use a more generous boundary check
    const x = event.clientX;
    const y = event.clientY;
    const margin = 10; // Add some margin to prevent premature removal
    
    // Only remove classes if we're actually leaving the slot area
    if (x < rect.left - margin || x > rect.right + margin || 
        y < rect.top - margin || y > rect.bottom + margin) {
        
        slot.classList.remove('drag-over', 'ability-drop-ready', 'ability-drop-invalid');
        
        // Remove tooltip if this is the current tooltip slot
        if (currentTooltipSlot === slot) {
            const tooltip = slot.querySelector('.ability-drop-tooltip, .spell-drop-tooltip');
            if (tooltip) {
                console.log('🔍 Removing tooltip on drag leave');
                tooltip.remove();
            }
            currentTooltip = null;
            currentTooltipSlot = null;
        }

        // Also remove spell-specific classes
        slot.classList.remove('spell-drop-ready', 'spell-drop-invalid');
    }
}

async function onTeamSlotDrop(event, targetSlot) {
    event.preventDefault();
    event.stopPropagation();
    
    const slot = event.currentTarget;
    
    // Clean up all tooltips on drop
    cleanupAllAbilityTooltips();
    
    // Clean up visual states
    slot.classList.remove('drag-over', 'ability-drop-ready', 'ability-drop-invalid');
    
    // Check if it's an ability card being dropped
    if (window.heroSelection && window.heroSelection.heroAbilitiesManager && 
        window.handManager && window.handManager.isHandDragging()) {
        const dragState = window.handManager.getHandDragState();
        const cardName = dragState.draggedCardName;
        
        if (window.heroSelection.heroAbilitiesManager.isAbilityCard(cardName)) {
            window.onTeamSlotAbilityDrop(event, targetSlot);
            return false;
        }
    }
    
    // Otherwise, handle hero drop
    if (window.heroSelection) {
        await window.onHeroSlotDrop(event, targetSlot);
    }
    
    return false;
}

// Enhanced drag end handler for hand cards
if (typeof window !== 'undefined' && window.onHandCardDragEnd) {
    const originalOnHandCardDragEnd = window.onHandCardDragEnd;
    window.onHandCardDragEnd = function(event) {
        // Clean up all ability tooltips when any drag ends
        cleanupAllAbilityTooltips();
        
        // Clean up any lingering visual states from all team slots
        const allSlots = document.querySelectorAll('.team-slot');
        allSlots.forEach(slot => {
            slot.classList.remove('ability-drop-ready', 'ability-drop-invalid');
        });
        
        // Call the original handler
        if (originalOnHandCardDragEnd) {
            originalOnHandCardDragEnd(event);
        }
    };
}

// Add global drag end listener as a fallback
if (typeof document !== 'undefined') {
    document.addEventListener('dragend', function(event) {
        // If we still have tooltips after a drag operation ends, clean them up
        if (currentTooltip || document.querySelector('.ability-drop-tooltip')) {
            console.log('🔍 Global dragend cleanup triggered');
            cleanupAllAbilityTooltips();
            
            // Also clean up visual states
            const allSlots = document.querySelectorAll('.team-slot');
            allSlots.forEach(slot => {
                slot.classList.remove('ability-drop-ready', 'ability-drop-invalid');
            });
        }
    });
}

// Add tooltip functions
window.showHeroSpellbookTooltip = function(position) {
    const spellbook = window.heroSelection.heroSpellbookManager.getHeroSpellbook(position);
    if (!spellbook || spellbook.length === 0) return;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'hero-spellbook-tooltip';
    
    // Build spell list
    let spellListHTML = '';
    spellbook.forEach(spell => {
        spellListHTML += `<div>• ${spell.name}</div>`;
    });
    
    tooltip.innerHTML = `
        <div><strong>${hero.name}'s Spellbook</strong> (${spellbook.length} spells)</div>
        ${spellListHTML}
    `;
    
    slot.appendChild(tooltip);
};

// Attach to window
if (typeof window !== 'undefined') {
    window.onTeamSlotDragOver = onTeamSlotDragOver;
    window.onTeamSlotDragEnter = onTeamSlotDragEnter;
    window.onTeamSlotDragLeave = onTeamSlotDragLeave;
    window.onTeamSlotDrop = onTeamSlotDrop;
    window.cleanupAllAbilityTooltips = cleanupAllAbilityTooltips;
}