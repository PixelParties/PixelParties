// cardPreviewManager.js - Enhanced with Reward Screen Dedicated Tooltip Support (Fixed Layout)

export class CardPreviewManager {
    constructor() {
        this.cardPreviewVisible = false;
        this.currentlyPreviewedCharacter = null;
        
        console.log('CardPreviewManager initialized');
    }

    // Enhanced showCardTooltip with reward screen detection
    showCardTooltip(cardData, cardElement) {
        // Check if we're in reward screen first
        const isRewardScreen = document.getElementById('cardRewardOverlay');
        
        if (isRewardScreen) {
            // Use dedicated reward preview area instead of floating tooltip
            this.showRewardScreenPreview(cardData);
            return;
        }
        
        // Continue with original floating tooltip logic for other screens
        let tooltipContainer = document.getElementById('cardTooltipContainer');
        if (!tooltipContainer) {
            tooltipContainer = document.createElement('div');
            tooltipContainer.id = 'cardTooltipContainer';
            tooltipContainer.className = 'card-tooltip-container';
            document.body.appendChild(tooltipContainer);
        }

        // Set appropriate z-index for battle screen
        const isBattleScreen = document.getElementById('battleArena');
        if (isBattleScreen) {
            tooltipContainer.style.zIndex = '10000'; // Higher than battle UI
        } else {
            tooltipContainer.style.zIndex = '3000'; // Normal tooltip z-index
        }

        const cardHTML = `
            <div class="large-card-tooltip">
                <img src="${cardData.imagePath}" 
                     alt="${cardData.displayName}" 
                     class="large-card-image"
                     style="transform: scale(1.5); transform-origin: center;"
                     onerror="this.src='./Cards/placeholder.png'">
                <div class="card-tooltip-name">${cardData.displayName}</div>
            </div>
        `;

        // Set content and make visible but positioned off-screen for measurement
        tooltipContainer.innerHTML = cardHTML;
        tooltipContainer.style.visibility = 'hidden';
        tooltipContainer.style.display = 'block';
        tooltipContainer.style.position = 'fixed';
        tooltipContainer.style.left = '-9999px';
        tooltipContainer.style.top = '-9999px';
        
        // Force a synchronous layout/reflow to get accurate measurements
        const tooltipContent = tooltipContainer.querySelector('.large-card-tooltip');
        tooltipContent.offsetHeight; // Force reflow
        
        // Now position the tooltip with accurate measurements
        this.positionCardTooltipFixed(tooltipContainer, tooltipContent);
        
        // Make visible at correct position
        tooltipContainer.style.visibility = 'visible';

        console.log(`Showing large card tooltip for: ${cardData.displayName} (z-index: ${tooltipContainer.style.zIndex})`);
    }

    // FIXED: Show preview in dedicated reward screen area with stable layout
    showRewardScreenPreview(cardData) {
        const previewArea = document.getElementById('rewardCardPreview');
        if (!previewArea) {
            console.warn('Reward card preview area not found!');
            return;
        }
        
        // Find or create the stable container
        let stableContainer = previewArea.querySelector('.stable-preview-container');
        if (!stableContainer) {
            // Create stable container that maintains consistent size
            stableContainer = document.createElement('div');
            stableContainer.className = 'stable-preview-container';
            
            // Set fixed dimensions to match the parent container
            stableContainer.style.cssText = `
                width: 100%;
                height: 100%;
                min-height: 500px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            `;
            
            previewArea.innerHTML = '';
            previewArea.appendChild(stableContainer);
        }
        
        // Update only the content inside the stable container
        stableContainer.innerHTML = `
            <div class="preview-card-display">
                <img src="${cardData.imagePath}" 
                     alt="${cardData.displayName}" 
                     class="preview-card-image"
                     onerror="this.src='./Cards/placeholder.png'"
                     style="max-width: 340px; max-height: 85%; object-fit: contain;">
            </div>
        `;
        
        console.log(`Showing reward screen preview for: ${cardData.displayName} (stable layout)`);
    }

    // FIXED: Hide reward screen preview with stable layout
    hideRewardScreenPreview() {
        const previewArea = document.getElementById('rewardCardPreview');
        if (!previewArea) return;
        
        // Find the stable container
        let stableContainer = previewArea.querySelector('.stable-preview-container');
        if (!stableContainer) {
            // Create stable container if it doesn't exist
            stableContainer = document.createElement('div');
            stableContainer.className = 'stable-preview-container';
            
            stableContainer.style.cssText = `
                width: 100%;
                height: 100%;
                min-height: 500px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            `;
            
            previewArea.innerHTML = '';
            previewArea.appendChild(stableContainer);
        }
        
        // Update only the content inside the stable container
        stableContainer.innerHTML = `
            <div class="preview-placeholder">
                <div class="preview-icon" style="font-size: 48px; margin-bottom: 10px; opacity: 0.7;">👁️</div>
                <p style="font-size: 14px; margin: 0; font-style: italic; color: rgba(255, 255, 255, 0.6);">Hover over any card to preview</p>
            </div>
        `;
        
        console.log('Hiding reward screen preview (stable layout)');
    }

    // Enhanced hideCardTooltip with reward screen support
    hideCardTooltip() {
        // Check if we're in reward screen first
        const isRewardScreen = document.getElementById('cardRewardOverlay');
        
        if (isRewardScreen) {
            // Hide reward screen preview instead of floating tooltip
            this.hideRewardScreenPreview();
            return;
        }
        
        // Continue with original logic for other screens
        const tooltipContainer = document.getElementById('cardTooltipContainer');
        if (tooltipContainer) {
            tooltipContainer.style.display = 'none';
        }
    }

    // FIXED positioning logic that uses actual measurements
    positionCardTooltipFixed(tooltipContainer, tooltipContent) {
        // Get actual tooltip dimensions after rendering
        const tooltipRect = tooltipContent.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width || 300; // fallback to 300 if measurement fails
        const tooltipHeight = tooltipRect.height || 420; // fallback to 420 if measurement fails

        // Check if we're in the battle screen (but not reward screen)
        const isBattleScreen = document.getElementById('battleArena') && !document.getElementById('cardRewardOverlay');
        
        if (isBattleScreen) {
            // Battle screen positioning - use battle screen logic
            this.positionTooltipForBattleScreenFixed(tooltipContent, tooltipWidth, tooltipHeight);
        } else {
            // Regular game positioning - near deck area
            this.positionTooltipForGameScreenFixed(tooltipContent, tooltipWidth, tooltipHeight);
        }
    }

    // FIXED position tooltip for battle screen with measured dimensions
    positionTooltipForBattleScreenFixed(tooltipContent, tooltipWidth, tooltipHeight) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Find the battle interface panel to position tooltip within it
        const battleInterfacePanel = document.querySelector('.battle-interface-panel');
        let finalX, finalY;
        
        if (battleInterfacePanel) {
            const panelRect = battleInterfacePanel.getBoundingClientRect();
            
            // Position tooltip within the battle interface panel
            finalX = panelRect.left + 20; // 20px from left edge of panel
            finalY = Math.max(20, (viewportHeight / 2) - (tooltipHeight / 2)); // Vertically centered
            
            // Ensure tooltip doesn't go off-screen to the right
            if (finalX + tooltipWidth > panelRect.right - 20) {
                finalX = panelRect.right - tooltipWidth - 20;
            }
            
            // Ensure tooltip doesn't go off-screen vertically
            if (finalY + tooltipHeight > viewportHeight - 20) {
                finalY = viewportHeight - tooltipHeight - 20;
            }
            if (finalY < 20) {
                finalY = 20;
            }
            
            console.log(`Positioned tooltip within battle interface panel: x=${finalX}, y=${finalY}, w=${tooltipWidth}, h=${tooltipHeight}`);
        } else {
            // Fallback positioning if battle interface panel not found
            finalX = Math.max(20, viewportWidth * 0.75 - (tooltipWidth / 2));
            finalY = Math.max(20, (viewportHeight / 2) - (tooltipHeight / 2));
            console.log(`Using fallback positioning for battle screen: x=${finalX}, y=${finalY}`);
        }
        
        this.applyTooltipStylesFixed(tooltipContent, finalX, finalY, false); // Pass false for battle screen
    }

    // FIXED position tooltip for game screen with measured dimensions
    positionTooltipForGameScreenFixed(tooltipContent, tooltipWidth, tooltipHeight) {
        const deckColumn = document.querySelector('.team-building-right');
        if (!deckColumn) {
            // Fallback to center if deck column not found
            this.positionTooltipFallbackFixed(tooltipContent, tooltipWidth, tooltipHeight);
            return;
        }

        const deckRect = deckColumn.getBoundingClientRect();
        
        // Position relative to deck area
        const centerX = deckRect.left + (deckColumn.offsetWidth / 2);
        let finalX = centerX - (tooltipWidth / 2) + 5;
        let finalY = deckRect.top - tooltipHeight + 650;
        
        // Ensure tooltip stays within viewport
        const margin = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (finalX < margin) {
            finalX = margin;
        } else if (finalX + tooltipWidth > viewportWidth - margin) {
            finalX = viewportWidth - tooltipWidth - margin;
        }
        
        if (finalY < margin) {
            finalY = margin;
        } else if (finalY + tooltipHeight > viewportHeight - margin) {
            finalY = viewportHeight - tooltipHeight - margin;
        }
        
        this.applyTooltipStylesFixed(tooltipContent, finalX, finalY, false); // Pass false for normal screen
        console.log(`Positioned tooltip for game screen: x=${finalX}, y=${finalY}, w=${tooltipWidth}, h=${tooltipHeight}`);
    }

    // Fallback positioning with measured dimensions
    positionTooltipFallbackFixed(tooltipContent, tooltipWidth, tooltipHeight) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const finalX = Math.max(20, (viewportWidth / 2) - (tooltipWidth / 2));
        const finalY = Math.max(20, (viewportHeight / 2) - (tooltipHeight / 2));

        this.applyTooltipStylesFixed(tooltipContent, finalX, finalY, false);
        console.log('Using fallback tooltip positioning (centered) with measurements');
    }

    // FIXED apply tooltip styles without changing dimensions
    applyTooltipStylesFixed(tooltipContent, x, y, isRewardScreen = false) {
        tooltipContent.style.position = 'fixed';
        tooltipContent.style.left = x + 'px';
        tooltipContent.style.top = y + 'px';
        tooltipContent.style.zIndex = isRewardScreen ? '10001' : '9999'; // Higher z-index for reward screen
        tooltipContent.style.pointerEvents = 'none';
        
        // Apply consistent styling without changing dimensions
        tooltipContent.style.background = 'rgba(0, 0, 0, 0.95)';
        tooltipContent.style.border = '2px solid #555';
        tooltipContent.style.borderRadius = '12px';
        tooltipContent.style.padding = '15px';
        tooltipContent.style.textAlign = 'center';
        tooltipContent.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.8)';
        tooltipContent.style.backdropFilter = 'blur(10px)';
        
        // Remove any width constraints that might cause resizing
        tooltipContent.style.maxWidth = 'none';
        tooltipContent.style.width = 'auto';
        tooltipContent.style.height = 'auto';
        
        // Style the tooltip name
        const tooltipName = tooltipContent.querySelector('.card-tooltip-name');
        if (tooltipName) {
            tooltipName.style.color = '#fff';
            tooltipName.style.fontSize = '16px';
            tooltipName.style.fontWeight = 'bold';
            tooltipName.style.marginTop = '10px';
            tooltipName.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        }
    }

    // Legacy method kept for compatibility (delegates to new method)
    positionCardTooltip(tooltipContainer) {
        const tooltipContent = tooltipContainer.querySelector('.large-card-tooltip');
        if (!tooltipContent) return;
        
        // Force measurement and use new positioning logic
        tooltipContent.offsetHeight; // Force reflow
        this.positionCardTooltipFixed(tooltipContainer, tooltipContent);
    }

    // Comprehensive tooltip cleanup - removes ALL possible tooltips
    clearAllTooltips() {
        console.log('Clearing all tooltips...');
        
        // Clear reward screen preview if present
        this.hideRewardScreenPreview();
        
        // Clear main card tooltip container
        const tooltipContainer = document.getElementById('cardTooltipContainer');
        if (tooltipContainer) {
            tooltipContainer.style.display = 'none';
            tooltipContainer.remove();
            console.log('Removed main tooltip container');
        }
        
        // Clear any floating card tooltips with class
        const floatingTooltips = document.querySelectorAll('.large-card-tooltip, .card-tooltip-container');
        floatingTooltips.forEach(tooltip => {
            tooltip.remove();
            console.log('Removed floating tooltip');
        });
        
        // Clear any battle card preview tooltips
        const battleTooltips = document.querySelectorAll('.preview-card-display, .battle-card-tooltip');
        battleTooltips.forEach(tooltip => {
            tooltip.remove();
            console.log('Removed battle tooltip');
        });
        
        // Clear any card preview content
        const previewColumns = document.querySelectorAll('.card-preview-column');
        previewColumns.forEach(column => {
            const previews = column.querySelectorAll('.card-preview-content');
            previews.forEach(preview => {
                if (preview.querySelector('.large-card-tooltip')) {
                    preview.remove();
                    console.log('Removed preview content with tooltip');
                }
            });
        });
        
        // Reset any hover states that might be stuck
        const hoveredCards = document.querySelectorAll('.hand-card-hover, .preview-card:hover');
        hoveredCards.forEach(card => {
            card.classList.remove('hand-card-hover');
            card.style.transform = '';
            card.style.zIndex = '';
        });
        
        // Clear any positioned elements that might be tooltips
        const allFixed = document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"]');
        allFixed.forEach(element => {
            // Check if it's likely a tooltip based on high z-index and content
            const style = window.getComputedStyle(element);
            const zIndex = parseInt(style.zIndex);
            if (zIndex > 1000 && (
                element.textContent.includes('card') ||
                element.querySelector('img[src*="/Cards/"]') ||
                element.classList.contains('tooltip') ||
                element.id.includes('tooltip') ||
                element.id.includes('preview')
            )) {
                element.remove();
                console.log('Removed potential orphaned tooltip element');
            }
        });
        
        // Reset card preview state
        this.cardPreviewVisible = false;
        this.currentlyPreviewedCharacter = null;
        
        console.log('All tooltips cleared');
    }

    // Show card preview for character in right sidebar
    showCharacterPreview(character, characterCards, formatCardNameFunction) {
        const characterName = character.name;
        const cards = characterCards[characterName];
        
        if (!cards) {
            console.warn(`No cards found for character: ${characterName}`);
            return;
        }

        // Check if this character is already being previewed
        if (this.currentlyPreviewedCharacter && this.currentlyPreviewedCharacter.id === character.id) {
            console.log(`${characterName} cards already visible`);
            return;
        }

        // Show new character's cards
        this.cardPreviewVisible = true;
        this.currentlyPreviewedCharacter = character;
        
        const previewColumn = document.querySelector('.card-preview-column');
        if (previewColumn) {
            const cardGrid = this.createCardGrid(character, cards, formatCardNameFunction);
            previewColumn.innerHTML = cardGrid;
        }
        
        console.log(`Toggled card preview to show ${characterName}'s cards`);
    }

    // Hide card preview and show placeholder
    hideCardPreview() {
        this.cardPreviewVisible = false;
        this.currentlyPreviewedCharacter = null;
        
        this.hideCardTooltip();
        
        const previewColumn = document.querySelector('.card-preview-column');
        if (previewColumn) {
            previewColumn.innerHTML = `
                <div class="card-preview-placeholder">
                    <div class="preview-icon">🃏</div>
                    <div>Hover over a character to toggle their cards</div>
                </div>
            `;
        }
    }

    // Create 3x3 card grid HTML
    createCardGrid(character, cards, formatCardNameFunction) {
        const characterName = character.name;
        const characterCardPath = `./Cards/Characters/${character.filename}`;
        
        const gridPositions = [
            cards[0] || null,           // Top left
            'CHARACTER_CARD',           // Top middle (character card)
            cards[1] || null,           // Top right
            cards[2] || null,           // Middle left
            cards[3] || null,           // Middle center
            cards[4] || null,           // Middle right
            cards[5] || null,           // Bottom left
            cards[6] || null,           // Bottom center
            cards[7] || null            // Bottom right
        ];

        let gridHTML = `
            <div class="card-preview-content">
                <div class="card-preview-header">
                    <h3>🃏 ${characterName}'s Cards</h3>
                </div>
                <div class="card-grid">
        `;

        gridPositions.forEach((item, index) => {
            if (item === 'CHARACTER_CARD') {
                const cardData = {
                    imagePath: characterCardPath,
                    displayName: characterName,
                    cardType: 'character'
                };
                const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
                
                gridHTML += `
                    <div class="card-slot character-card-slot">
                        <img src="${characterCardPath}" 
                             alt="${characterName}" 
                             class="preview-card character-preview-card"
                             onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                             onmouseleave="window.hideCardTooltip()"
                             onerror="this.src='./Cards/placeholder.png'">
                        <div class="card-name">${characterName}</div>
                    </div>
                `;
            } else if (item) {
                const cardPath = `./Cards/All/${item}.png`;
                const cardDisplayName = formatCardNameFunction(item);
                const cardData = {
                    imagePath: cardPath,
                    displayName: cardDisplayName,
                    cardType: 'ability'
                };
                const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
                
                gridHTML += `
                    <div class="card-slot">
                        <img src="${cardPath}" 
                             alt="${cardDisplayName}" 
                             class="preview-card"
                             onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                             onmouseleave="window.hideCardTooltip()"
                             onerror="this.src='./Cards/placeholder.png'">
                        <div class="card-name">${cardDisplayName}</div>
                    </div>
                `;
            } else {
                gridHTML += `
                    <div class="card-slot empty-slot">
                        <div class="empty-card">Empty</div>
                    </div>
                `;
            }
        });

        gridHTML += `
                </div>
            </div>
        `;

        return gridHTML;
    }

    // Get current preview state
    isPreviewVisible() {
        return this.cardPreviewVisible;
    }

    getCurrentlyPreviewedCharacter() {
        return this.currentlyPreviewedCharacter;
    }

    // Reset to initial state
    reset() {
        this.clearAllTooltips();
        this.hideCardPreview();
        console.log('CardPreviewManager reset');
    }
}