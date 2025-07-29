// heroSelectionUI.js - Hero Selection UI Generation Module with Enhanced Tooltip Management and Creature Drag & Drop

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

    // Show spellbook tooltip for a hero in formation screen
    showHeroSpellbookTooltip(position, heroElement) {
        // Get hero data
        const hero = window.heroSelection?.formationManager?.getBattleFormation()?.[position];
        if (!hero) return;
        
        // Get spellbook data
        const spellbook = window.heroSelection?.heroSpellbookManager?.getHeroSpellbook(position);
        if (!spellbook || spellbook.length === 0) return;
        
        // Remove any existing spellbook tooltip
        this.hideHeroSpellbookTooltip();
        
        // Create spellbook tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'formation-spellbook-tooltip';
        tooltip.id = 'formationSpellbookTooltip';
        
        // Sort spells by school first, then by name
        const sortedSpells = [...spellbook].sort((a, b) => {
            const schoolCompare = (a.spellSchool || 'Unknown').localeCompare(b.spellSchool || 'Unknown');
            if (schoolCompare !== 0) return schoolCompare;
            return a.name.localeCompare(b.name);
        });
        
        // Build spellbook HTML
        let spellbookHTML = `
            <div class="spellbook-tooltip-container">
                <h4 class="spellbook-tooltip-title">📜 ${hero.name}'s Spellbook</h4>
                <div class="spellbook-list">
        `;
        
        let currentSchool = null;
        sortedSpells.forEach(spell => {
            const spellSchool = spell.spellSchool || 'Unknown';
            
            // Add school header if new school
            if (spellSchool !== currentSchool) {
                if (currentSchool !== null) {
                    spellbookHTML += '</div>'; // Close previous school section
                }
                currentSchool = spellSchool;
                
                // School styling
                const schoolColors = {
                    'DestructionMagic': '#ff6b6b',
                    'SupportMagic': '#ffd43b',
                    'DecayMagic': '#845ef7',
                    'MagicArts': '#4dabf7',
                    'SummoningMagic': '#51cf66',
                    'Fighting': '#ff8c42',
                    'Unknown': '#868e96'
                };
                const schoolColor = schoolColors[spellSchool] || '#868e96';
                
                const schoolIcons = {
                    'DestructionMagic': '🔥',
                    'SupportMagic': '✨',
                    'DecayMagic': '💀',
                    'MagicArts': '🔮',
                    'SummoningMagic': '🌿',
                    'Fighting': '⚔️',
                    'Unknown': '❓'
                };
                const schoolIcon = schoolIcons[spellSchool] || '❓';
                
                const displaySchoolName = this.formatCardName(spellSchool);
                
                spellbookHTML += `
                    <div class="spell-school-header" style="color: ${schoolColor};">
                        <span class="school-icon">${schoolIcon}</span> ${displaySchoolName}
                    </div>
                    <div class="spell-school-section">
                `;
            }
            
            const spellLevel = spell.level !== undefined ? spell.level : 0;
            const spellName = this.formatCardName(spell.name);
            
            spellbookHTML += `
                <div class="spell-entry">
                    <span class="spell-name">${spellName}</span>
                    <span class="spell-level">Lv${spellLevel}</span>
                </div>
            `;
        });
        
        if (currentSchool !== null) {
            spellbookHTML += '</div>'; // Close last school section
        }
        
        spellbookHTML += `
                </div>
                <div class="spell-count">Total Spells: ${sortedSpells.length}</div>
            </div>
        `;
        
        tooltip.innerHTML = spellbookHTML;
        document.body.appendChild(tooltip);
        
        // Position tooltip to the left of the hero card
        this.positionSpellbookTooltip(tooltip, heroElement);
    }

    // Hide spellbook tooltip
    hideHeroSpellbookTooltip() {
        const tooltip = document.getElementById('formationSpellbookTooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    // Position spellbook tooltip
    positionSpellbookTooltip(tooltip, heroElement) {
        if (!heroElement) return;
        
        const heroRect = heroElement.getBoundingClientRect();
        
        // Calculate position (to the left of the hero)
        const tooltipWidth = 320; // Approximate width
        let leftPos = heroRect.left - tooltipWidth - 20; // 20px gap
        let topPos = heroRect.top;
        
        // Check if it would go off screen on the left
        if (leftPos < 10) {
            // Position to the right instead
            leftPos = heroRect.right + 20;
        }
        
        // Ensure it doesn't go off screen on top
        if (topPos < 10) {
            topPos = 10;
        }
        
        tooltip.style.left = `${leftPos}px`;
        tooltip.style.top = `${topPos}px`;
        
        // Check if card tooltip is visible and adjust position
        const cardTooltip = document.querySelector('.large-card-tooltip:not(.formation-spellbook-tooltip)');
        if (cardTooltip) {
            const cardRect = cardTooltip.getBoundingClientRect();
            
            // If overlapping with card tooltip, reposition
            if (leftPos + tooltipWidth > cardRect.left && leftPos < cardRect.right) {
                // Try to position further left
                leftPos = cardRect.left - tooltipWidth - 20;
                if (leftPos < 10) {
                    // If still no room, stack vertically
                    topPos = cardRect.bottom + 20;
                    leftPos = heroRect.left;
                }
                tooltip.style.left = `${leftPos}px`;
                tooltip.style.top = `${topPos}px`;
            }
        }
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
        
        // Get creatures if available
        const creatures = window.heroSelection?.heroCreatureManager ? 
            window.heroSelection.heroCreatureManager.getHeroCreatures(position) : [];
        
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
                            class="ability-card-image clickable-ability"
                            onclick="window.onAbilityClick('${position}', ${zoneNumber}, '${ability.name}', ${stackCount})"
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
        
        // FIXED: Always create the creatures container, even if empty
        // This ensures drop zones exist for Guard Change mode
        let creaturesHTML = `
            <div class="hero-creatures" 
                data-hero-position="${position}"
                ondragover="window.onCreatureContainerDragOver(event, '${position}')"
                ondrop="window.onCreatureContainerDrop(event, '${position}')"
                ondragleave="window.onCreatureContainerDragLeave(event)">
        `;
        
        // Add creatures if they exist
        if (creatures && creatures.length > 0) {
            creaturesHTML += creatures.map((creature, index) => {
                const creatureSprite = `./Creatures/${creature.name}.png`;
                const cardData = {
                    imagePath: creature.image,
                    displayName: this.formatCardName(creature.name),
                    cardType: 'creature'
                };
                const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
                
                // Prepare creature data for drag operations
                const creatureDataJson = JSON.stringify({
                    name: creature.name,
                    heroPosition: position,
                    index: index
                }).replace(/"/g, '&quot;');
                
                // Vary animation speed for visual interest
                const speedClasses = ['speed-slow', 'speed-normal', 'speed-fast'];
                const speedClass = speedClasses[index % speedClasses.length];
                
                return `
                    <div class="creature-icon" 
                        data-creature-index="${index}"
                        data-hero-position="${position}"
                        draggable="true"
                        ondragstart="window.onCreatureDragStart(event, '${creatureDataJson}')"
                        ondragend="window.onCreatureDragEnd(event)"
                        onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                        onmouseleave="window.hideCardTooltip()">
                        <div class="creature-sprite-container">
                            <img src="${creatureSprite}" 
                                alt="${creature.name}" 
                                class="creature-sprite ${speedClass}"
                                onerror="this.src='./Creatures/placeholder.png'">
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // Add empty state placeholder (optional visual enhancement)
            creaturesHTML += `
                <div class="creature-empty-placeholder" style="display: none;">
                    <!-- Hidden placeholder for empty creature areas -->
                </div>
            `;
        }
        
        // Close the creatures container
        creaturesHTML += '</div>';
        
        return `
            <div class="hero-ability-zones" data-hero-position="${position}">
                ${createZoneHTML(1)}
                ${createZoneHTML(2)}
                ${createZoneHTML(3)}
            </div>
            ${creaturesHTML}
        `;
    }

    // Create team building slot HTML
    createTeamSlotHTML(position, character = null, createCharacterCardFn, heroAbilitiesManager = null) {
        const slotClass = character ? 'team-slot filled' : 'team-slot empty';
        
        // Create character HTML WITHOUT tooltip events (we'll handle them at the slot level)
        const characterHTML = character ? 
            this.createCharacterCardHTML(character, false, false, false, true, position, true, heroAbilitiesManager) : 
            '<div class="slot-placeholder">Empty Slot</div>';
        
        // Add mouse events at the slot level
        const mouseEvents = character ? `
            onmouseenter="window.handleHeroHoverEnter('${position}', this)"
            onmouseleave="window.handleHeroHoverLeave()"
        ` : '';
        
        // Add drag handlers for both hero swapping AND ability attachment
        return `
            <div class="${slotClass}" 
                data-position="${position}"
                ${mouseEvents}
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
                        <p class="drag-hint">📜 Drag spell cards to heroes to add them to their spellbook!</p>
                        <p class="drag-hint">🐾 Drag creatures to reorder them within the same hero!</p>
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
            // NEW: Check if it's a global spell - if so, just prevent default and return
            if (window.globalSpellManager && window.globalSpellManager.isGlobalSpell(cardName, window.heroSelection)) {
                event.preventDefault();
                event.stopPropagation();
                
                // Add visual indicator that this is a global spell
                const slot = event.currentTarget;
                slot.classList.add('global-spell-hover');
                
                return; // Don't show any tooltips
            }
            
            event.preventDefault();
            
            const slot = event.currentTarget;
            
            // Clean up tooltip from other slots if we're over a different slot
            if (currentTooltipSlot && currentTooltipSlot !== slot) {
                cleanupAllAbilityTooltips();
                // Add null check before accessing classList
                if (currentTooltipSlot && currentTooltipSlot.classList) {
                    currentTooltipSlot.classList.remove('spell-drop-ready', 'spell-drop-invalid');
                }
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
        slot.classList.remove('global-spell-hover'); // NEW: Remove global spell hover class
        
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

// ===== CREATURE DRAG AND DROP HANDLERS =====

// Global creature drag state tracking
let creatureDragState = {
    isDragging: false,
    draggedCreature: null,
    draggedFromHero: null,
    draggedFromIndex: null
};

// Creature drag start handler
function onCreatureDragStart(event, creatureDataJson) {
    try {
        const creatureData = JSON.parse(creatureDataJson.replace(/&quot;/g, '"'));
        
        // Create a custom drag image showing only the middle frame
        const originalImg = event.target.closest('.creature-icon').querySelector('.creature-sprite');
        if (originalImg && originalImg.complete && originalImg.naturalWidth > 0) {
            // Create a canvas to extract just the middle frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to match the sprite container
            canvas.width = 32;
            canvas.height = 32;
            
            // Calculate frame width (each frame is 1/3 of total width)
            const frameWidth = originalImg.naturalWidth / 3;
            const frameHeight = originalImg.naturalHeight;
            
            // Draw only the middle frame (frame index 1, which is the second frame)
            ctx.drawImage(
                originalImg,
                frameWidth, 0, frameWidth, frameHeight, // Source: middle frame
                0, 0, canvas.width, canvas.height       // Destination: full canvas
            );
            
            // Set the custom drag image
            event.dataTransfer.setDragImage(canvas, 16, 16); // Center the drag image
        }
        
        // Set up drag data
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/x-creature-drag', creatureDataJson);
        event.dataTransfer.setData('text/plain', creatureData.name);
        
        // Update creature manager drag state
        if (window.heroSelection && window.heroSelection.heroCreatureManager) {
            const success = window.heroSelection.heroCreatureManager.startCreatureDrag(
                creatureData.heroPosition,
                creatureData.index,
                event.target.closest('.creature-icon')
            );
            
            if (!success) {
                event.preventDefault();
                return false;
            }
        }
        
        // Update global drag state
        creatureDragState = {
            isDragging: true,
            draggedCreature: creatureData,
            draggedFromHero: creatureData.heroPosition,
            draggedFromIndex: creatureData.index
        };
        
        // Add visual feedback
        event.target.closest('.creature-icon').classList.add('creature-dragging');
        
        console.log(`Started dragging creature ${creatureData.name} from ${creatureData.heroPosition}[${creatureData.index}]`);
        
    } catch (error) {
        console.error('Error starting creature drag:', error);
        event.preventDefault();
        return false;
    }
}

// Creature drag end handler
function onCreatureDragEnd(event) {
    // Clean up drag state
    if (window.heroSelection && window.heroSelection.heroCreatureManager) {
        window.heroSelection.heroCreatureManager.endCreatureDrag();
    }
    
    creatureDragState = {
        isDragging: false,
        draggedCreature: null,
        draggedFromHero: null,
        draggedFromIndex: null
    };
    
    // Clean up visual feedback
    const draggingElements = document.querySelectorAll('.creature-dragging');
    draggingElements.forEach(el => el.classList.remove('creature-dragging'));
    
    // Clean up drop zone visual feedback
    const creatureContainers = document.querySelectorAll('.hero-creatures');
    creatureContainers.forEach(container => {
        container.classList.remove('creature-drop-ready', 'creature-drop-invalid');
    });
    
    console.log('Creature drag ended');
}

// Creature container drag over handler
function onCreatureContainerDragOver(event, heroPosition) {
    // Only handle creature drags
    if (!creatureDragState.isDragging) {
        return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    const container = event.currentTarget;
    
    // Check if Guard Change mode is active
    const isGuardChangeActive = window.globalSpellManager?.isGuardChangeModeActive() || false;
    const isSameHero = heroPosition === creatureDragState.draggedFromHero;
    
    // Allow drop if same hero OR Guard Change mode is active
    if (isSameHero || isGuardChangeActive) {
        // Valid drop zone
        container.classList.add('creature-drop-ready');
        container.classList.remove('creature-drop-invalid');
        event.dataTransfer.dropEffect = 'move';
    } else {
        // Invalid drop zone - different hero and no Guard Change
        container.classList.add('creature-drop-invalid');
        container.classList.remove('creature-drop-ready');
        event.dataTransfer.dropEffect = 'none';
    }
}

// Creature container drag leave handler
function onCreatureContainerDragLeave(event) {
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    
    const x = event.clientX;
    const y = event.clientY;
    const margin = 5; // Small margin for better UX
    
    // Only remove classes if we're actually leaving the container
    if (x < rect.left - margin || x > rect.right + margin || 
        y < rect.top - margin || y > rect.bottom + margin) {
        
        container.classList.remove('creature-drop-ready', 'creature-drop-invalid');
    }
}

// Creature container drop handler
async function onCreatureContainerDrop(event, heroPosition) {    
    event.preventDefault();
    event.stopPropagation();
    
    const container = event.currentTarget;
    
    // Clean up visual feedback
    container.classList.remove('creature-drop-ready', 'creature-drop-invalid');
    
    // Only handle creature drags
    if (!creatureDragState.isDragging) {
        console.log('❌ Global creatureDragState.isDragging is false, returning');
        return false;
    }
    
    // Check if Guard Change mode is active
    const isGuardChangeActive = window.globalSpellManager?.isGuardChangeModeActive() || false;
    const isSameHero = heroPosition === creatureDragState.draggedFromHero;
    
    // Allow drops within same hero OR if Guard Change mode is active
    if (!isSameHero && !isGuardChangeActive) {
        console.log('❌ Cannot move creature to different hero - Guard Change mode not active');
        return false;
    }
    
    // Check if target hero exists (for cross-hero moves)
    if (!isSameHero && window.heroSelection?.heroCreatureManager) {
        const hasTargetHero = window.heroSelection.heroCreatureManager.hasHeroAtPosition(heroPosition);
        console.log('🔍 hasTargetHero:', hasTargetHero);
        if (!hasTargetHero) {
            console.log(`❌ Cannot move creature to ${heroPosition} - no hero at that position`);
            return false;
        }
    }
    
    // Handle the drop using the creature manager
    if (window.heroSelection && window.heroSelection.heroCreatureManager) {
        console.log('🔍 About to call handleCreatureDrop...');
        
        const success = window.heroSelection.heroCreatureManager.handleCreatureDrop(
            heroPosition,
            event.clientX,
            container
        );
        
        console.log('🔍 handleCreatureDrop returned:', success);
        
        if (success) {
            console.log('✅ Move successful, updating UI...');
            
            // Update the UI
            if (window.heroSelection.updateBattleFormationUI) {
                window.heroSelection.updateBattleFormationUI();
            }
            
            // Save game state
            if (window.heroSelection.saveGameState) {
                await window.heroSelection.saveGameState();
            }
            
            // Send formation update to opponent
            if (window.heroSelection.sendFormationUpdate) {
                await window.heroSelection.sendFormationUpdate();
            }
            
            // Log successful cross-hero move
            if (!isSameHero) {
                console.log(`🛡️ Guard Change: Successfully moved creature from ${creatureDragState.draggedFromHero} to ${heroPosition}`);
            }
        } else {
            console.log('❌ Move failed');
        }
        
        return success;
    }
    
    console.log('❌ No heroSelection or heroCreatureManager found');
    return false;
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

// Enhanced hover handlers for hero slots
window.handleHeroHoverEnter = function(position, element) {
    if (!window.heroSelection) return;
    
    // Show card tooltip
    const hero = window.heroSelection.formationManager.getBattleFormation()[position];
    if (hero) {
        const cardData = {
            imagePath: hero.image,
            displayName: hero.name,
            cardType: 'character'
        };
        window.showCardTooltip(JSON.stringify(cardData), element);
    }
    
    // Show spellbook tooltip if hero has spells
    if (window.heroSelection.heroSelectionUI) {
        window.heroSelection.heroSelectionUI.showHeroSpellbookTooltip(position, element);
    }
};

window.handleHeroHoverLeave = function() {
    // Hide card tooltip
    window.hideCardTooltip();
    
    // Hide spellbook tooltip
    if (window.heroSelection?.heroSelectionUI) {
        window.heroSelection.heroSelectionUI.hideHeroSpellbookTooltip();
    }
};

// Global ability click handler
async function onAbilityClick(heroPosition, zoneNumber, abilityName, stackCount) {
    console.log(`Ability clicked: ${abilityName} at ${heroPosition} zone ${zoneNumber}, stack count: ${stackCount}`);
    
    // Handle specific abilities
    switch(abilityName) {
        case 'Leadership':
            // Handle Leadership ability
            try {
                // Ensure the Leadership ability module is available
                if (window.leadershipAbility) {
                    await window.leadershipAbility.handleClick(heroPosition, stackCount);
                } else {
                    // Dynamically import if not available
                    const { leadershipAbility } = await import('./leadership.js');
                    await leadershipAbility.handleClick(heroPosition, stackCount);
                }
            } catch (error) {
                console.error('Failed to handle Leadership ability:', error);
                
                // Show error feedback to user
                const abilityZone = document.querySelector(`.ability-zone[data-position="${heroPosition}"][data-zone="${zoneNumber}"]`);
                if (abilityZone) {
                    abilityZone.classList.add('ability-error');
                    setTimeout(() => {
                        abilityZone.classList.remove('ability-error');
                    }, 1000);
                }
            }
            break;
            
        case 'Adventurousness':
            // Dynamically import the Adventurousness module
            try {
                const { adventurousnessAbility } = await import('./Abilities/adventurousness.js');
                adventurousnessAbility.handleClick(heroPosition, stackCount);
            } catch (error) {
                console.error('Failed to load Adventurousness ability handler:', error);
            }
            break;
            
        default:
            // For other abilities, just log for now
            console.log(`No specific handler for ${abilityName} yet`);
            
            // Visual feedback for click
            const abilityZone = document.querySelector(`.ability-zone[data-position="${heroPosition}"][data-zone="${zoneNumber}"]`);
            if (abilityZone) {
                abilityZone.classList.add('ability-clicked');
                setTimeout(() => {
                    abilityZone.classList.remove('ability-clicked');
                }, 300);
            }
            break;
    }
}

// Attach to window
if (typeof window !== 'undefined') {
    window.onTeamSlotDragOver = onTeamSlotDragOver;
    window.onTeamSlotDragEnter = onTeamSlotDragEnter;
    window.onTeamSlotDragLeave = onTeamSlotDragLeave;
    window.onTeamSlotDrop = onTeamSlotDrop;
    window.cleanupAllAbilityTooltips = cleanupAllAbilityTooltips;
    window.onAbilityClick = onAbilityClick;
    
    // NEW: Creature drag and drop functions
    window.onCreatureDragStart = onCreatureDragStart;
    window.onCreatureDragEnd = onCreatureDragEnd;
    window.onCreatureContainerDragOver = onCreatureContainerDragOver;
    window.onCreatureContainerDragLeave = onCreatureContainerDragLeave;
    window.onCreatureContainerDrop = onCreatureContainerDrop;
}

// Add clickable ability and creature drag styles
if (typeof document !== 'undefined' && !document.getElementById('clickableAbilityStyles')) {
    const style = document.createElement('style');
    style.id = 'clickableAbilityStyles';
    style.textContent = `
        /* Clickable Ability Styles */
        .ability-card-image.clickable-ability {
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }

        .ability-card-image.clickable-ability:hover {
            transform: scale(1.1);
            filter: brightness(1.2);
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
        }

        .ability-card-image.clickable-ability:active {
            transform: scale(0.95);
        }

        .ability-zone.ability-clicked {
            animation: abilityClickPulse 0.3s ease-out;
        }

        @keyframes abilityClickPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.15); }
            100% { transform: scale(1); }
        }

        /* Make sure ability zones have proper z-index for clicks */
        .ability-zone.filled {
            position: relative;
            z-index: 10;
        }

        .ability-zone.filled .ability-card-image {
            display: block;
            width: 100%;
            height: 100%;
        }

        /* Creature Drag and Drop Styles */
        .creature-icon {
            cursor: grab;
            transition: transform 0.2s ease, opacity 0.2s ease;
            position: relative;
        }

        .creature-icon:hover {
            transform: scale(1.05);
        }

        .creature-icon.creature-dragging {
            opacity: 0.5;
            transform: scale(0.9);
            cursor: grabbing;
        }

        .hero-creatures {
            transition: background-color 0.2s ease, border-color 0.2s ease;
            border: 2px solid transparent;
            border-radius: 8px;
            padding: 4px;
            min-height: 40px;
            position: relative;
        }

        .hero-creatures.creature-drop-ready {
            background-color: rgba(76, 175, 80, 0.1);
            border-color: rgba(76, 175, 80, 0.5);
        }

        .hero-creatures.creature-drop-invalid {
            background-color: rgba(244, 67, 54, 0.1);
            border-color: rgba(244, 67, 54, 0.5);
        }
    `;
    document.head.appendChild(style);
}

// Add CSS for ability error state
if (typeof document !== 'undefined' && !document.getElementById('abilityErrorStyles')) {
    const style = document.createElement('style');
    style.id = 'abilityErrorStyles';
    style.textContent = `
        .ability-zone.ability-error {
            animation: abilityErrorShake 0.5s ease-out;
        }
        
        @keyframes abilityErrorShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
}