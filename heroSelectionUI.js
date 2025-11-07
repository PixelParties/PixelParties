// heroSelectionUI.js - Hero Selection UI Generation Module with Enhanced Tooltip Management, Creature Drag & Drop, Nicolas Effect, Hero Stats Display, Permanent Artifacts, and Tooltip Hover Persistence

export class HeroSelectionUI {
    constructor() {
        // Add tooltip hover persistence tracking (hero only)
        this.tooltipHideTimeout = null;
        this.currentTooltipPosition = null;
    }

    // Helper method to format card names
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // ===== PERMANENT ARTIFACTS METHODS =====
    
    // Create permanent artifacts indicator element
    createPermanentArtifactsIndicator() {
        if (!window.artifactHandler) {
            return ''; // No artifact handler available
        }
        
        const permanentArtifacts = window.artifactHandler.getPermanentArtifacts();
        const count = permanentArtifacts.length;
        
        // Don't show if no permanent artifacts have been used
        if (count === 0) {
            return `
                <div class="permanent-artifacts-indicator empty" 
                    id="permanentArtifactsIndicator"
                    onmouseenter="window.showPermanentArtifactsTooltip(this)"
                    onmouseleave="window.hidePermanentArtifactsTooltip()">
                    <span class="artifact-scroll-icon">📜</span>
                    <span class="artifact-count">0</span>
                </div>
            `;
        }
        
        return `
            <div class="permanent-artifacts-indicator" 
                id="permanentArtifactsIndicator"
                onmouseenter="window.showPermanentArtifactsTooltip(this)"
                onmouseleave="window.hidePermanentArtifactsTooltip()">
                <span class="artifact-scroll-icon">📜</span>
                <span class="artifact-count">${count}</span>
            </div>
        `;
    }

    // Create permanent artifacts tooltip content
    createPermanentArtifactsTooltip() {
        if (!window.artifactHandler) {
            return null;
        }
        
        const permanentArtifacts = window.artifactHandler.getPermanentArtifacts();
        
        if (permanentArtifacts.length === 0) {
            return {
                title: 'Permanent Artifacts',
                content: 'No permanent artifacts used yet',
                isEmpty: true
            };
        }
        
        // Group artifacts by name and count them
        const artifactCounts = {};
        permanentArtifacts.forEach(artifact => {
            const name = artifact.name || 'Unknown';
            artifactCounts[name] = (artifactCounts[name] || 0) + 1;
        });
        
        // Sort by most used
        const sortedArtifacts = Object.entries(artifactCounts)
            .sort((a, b) => b[1] - a[1]);
        
        // Build artifact list HTML
        let artifactListHTML = sortedArtifacts.map(([name, count]) => {
            const formattedName = this.formatCardName(name);
            const countText = count > 1 ? ` x${count}` : '';
            
            // Add icon based on artifact name
            let icon = '✨';
            if (name === 'Juice') icon = '🧃';
            else if (name === 'TreasureChest') icon = '📦';
            else if (name === 'MagneticGlove') icon = '🧲';
            
            return `
                <div class="permanent-artifact-item">
                    <span class="artifact-icon">${icon}</span>
                    <span class="artifact-name">${formattedName}</span>
                    <span class="artifact-count-badge">${countText}</span>
                </div>
            `;
        }).join('');
        
        const totalCount = permanentArtifacts.length;
        const uniqueCount = sortedArtifacts.length;
        
        return {
            title: 'Permanent Artifacts Used',
            content: artifactListHTML,
            summary: `${totalCount} total (${uniqueCount} unique)`,
            isEmpty: false
        };
    }

    // Update the permanent artifacts indicator (call this when artifacts change)
    updatePermanentArtifactsIndicator() {
        const indicator = document.getElementById('permanentArtifactsIndicator');
        if (!indicator || !window.artifactHandler) return;
        
        const permanentArtifacts = window.artifactHandler.getPermanentArtifacts();
        const count = permanentArtifacts.length;
        
        // Update count
        const countElement = indicator.querySelector('.artifact-count');
        if (countElement) {
            countElement.textContent = count;
        }
        
        // Update empty state
        if (count === 0) {
            indicator.classList.add('empty');
        } else {
            indicator.classList.remove('empty');
            
            // Add pulse animation for new artifact
            indicator.classList.add('new-artifact-pulse');
            setTimeout(() => {
                indicator.classList.remove('new-artifact-pulse');
            }, 1000);
        }
    }

    // ===== TOOLTIP HOVER PERSISTENCE METHODS (HERO ONLY) =====

    // New method to schedule tooltip hiding with delay
    scheduleTooltipHide() {
        // Only hide if hero is not hovered
        if (!this.isHeroHovered) {
            this.tooltipHideTimeout = setTimeout(() => {
                this.hideHeroSpellbookTooltip();
            }, 100); // Small delay to prevent flickering
        }
    }

    // Method to handle hero hover leave (called from global handler)
    handleHeroHoverLeave() {
        this.isHeroHovered = false;
        
        // Check if we're in locked mode
        if (window.heroTooltipManager && window.heroTooltipManager.isLockedMode()) {
            // Let the locked mode manager handle this
            window.heroTooltipManager.handleHeroHoverLeave();
        } else {
            // Normal behavior - schedule hide with delay
            this.scheduleTooltipHide();
        }
    }

    // Method to handle hero hover enter (called from global handler) 
    handleHeroHoverEnter(position, element) {
        this.isHeroHovered = true;
        this.showHeroSpellbookTooltip(position, element);
    }

    // Updated showHeroSpellbookTooltip method with hero-only persistence
    showHeroSpellbookTooltip(position, heroElement) {
        // Prevent tooltips during any drag operation
        if (window.heroSelection?.formationManager?.isDragging()) {
            return;
        }
        
        // Clear any pending hide timeout
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout);
            this.tooltipHideTimeout = null;
        }
        
        // Get hero data
        const hero = window.heroSelection?.formationManager?.getBattleFormation()?.[position];
        if (!hero) return;
        
        // Get spellbook data
        const spellbook = window.heroSelection?.heroSpellbookManager?.getHeroSpellbook(position);
        
        // Get equipment data
        const equipment = window.heroSelection?.heroEquipmentManager?.getHeroEquipment(position);
        
        // Don't show tooltip if no spells AND no equipment
        if ((!spellbook || spellbook.length === 0) && (!equipment || equipment.length === 0)) return;
        
        // Check if spellbook is locked
        const isSpellbookLocked = window.heroSelection?.heroSpellbookManager?.isSpellbookLocked(position) || false;
        
        // Remove any existing tooltip
        this.hideHeroSpellbookTooltip();
        
        // Create enhanced tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'formation-spellbook-tooltip enhanced-hero-tooltip';
        tooltip.id = 'formationSpellbookTooltip';
        
        // Update the title to show lock status
        let tooltipTitle = `${hero.name}'s Arsenal`;
        if (isSpellbookLocked) {
            tooltipTitle += ' 🔒';
        }
        
        let tooltipHTML = `
            <div class="spellbook-tooltip-container">
                <h4 class="spellbook-tooltip-title">${tooltipTitle}</h4>
                <div class="tooltip-section arsenal-section">
                    <div class="section-header">
                        <span class="section-icon">📜</span>
                        <span class="section-title">Complete Arsenal (${(spellbook?.length || 0) + (equipment?.length || 0)} items)${isSpellbookLocked ? ' - Locked' : ''}</span>
                    </div>
                    <div class="spellbook-list">
        `;
        
        // Add spellbook section if spells exist
        if (spellbook && spellbook.length > 0) {
            // Sort spells by school first, then by name
            const sortedSpells = [...spellbook].sort((a, b) => {
                const schoolCompare = (a.spellSchool || 'Unknown').localeCompare(b.spellSchool || 'Unknown');
                if (schoolCompare !== 0) return schoolCompare;
                return a.name.localeCompare(b.name);
            });
            
            let currentSchool = null;
            let spellIndexInOriginal = 0;
            
            sortedSpells.forEach((spell, sortedIndex) => {
                // Find the original index of this spell in the unsorted spellbook
                spellIndexInOriginal = spellbook.findIndex((originalSpell, idx) => {
                    const usedIndices = sortedSpells.slice(0, sortedIndex)
                        .map(usedSpell => spellbook.findIndex((s, i) => s === usedSpell && i >= 0))
                        .filter(i => i !== -1);
                    
                    return originalSpell === spell && !usedIndices.includes(idx);
                });
                
                const spellSchool = spell.spellSchool || 'Unknown';
                
                // Add school header if new school
                if (spellSchool !== currentSchool) {
                    if (currentSchool !== null) {
                        tooltipHTML += '</div>'; // Close previous school section
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
                    
                    tooltipHTML += `
                        <div class="spell-school-header" style="color: ${schoolColor};">
                            <span class="school-icon">${schoolIcon}</span> ${displaySchoolName}
                        </div>
                        <div class="spell-school-section">
                    `;
                }
                
                const spellLevel = spell.level !== undefined ? spell.level : 0;
                const spellName = this.formatCardName(spell.name);
                const isEnabled = spell.enabled !== false;
                
                // Add disabled class and click handler based on lock status
                const disabledClass = !isEnabled ? 'spell-disabled' : '';
                const lockedClass = isSpellbookLocked ? 'spell-locked' : '';
                const clickHandler = isSpellbookLocked ? '' : `onclick="window.toggleHeroSpell('${position}', ${spellIndexInOriginal})"`;
                const titleText = isSpellbookLocked ? 'Spellbook is locked' : `Click to ${isEnabled ? 'disable' : 'enable'} this spell`;
                
                tooltipHTML += `
                    <div class="spell-entry ${disabledClass} ${lockedClass}" ${clickHandler} data-spell-index="${spellIndexInOriginal}" title="${titleText}">
                        <span class="spell-name">${spellName}</span>
                        <span class="spell-level">Lv${spellLevel}</span>
                    </div>
                `;
            });
            
            if (currentSchool !== null) {
                tooltipHTML += '</div>'; // Close last school section
            }
        }
        
        // Add equipment section if equipment exists (no separator, same scrollable area)
        if (equipment && equipment.length > 0) {
            // Add equipment header
            tooltipHTML += `
                <div class="spell-school-header equipment-header" style="color: #ffc107;">
                    <span class="school-icon">⚔️</span> Equipment
                </div>
                <div class="spell-school-section">
            `;
            
            // Equipment is already sorted alphabetically by getHeroEquipment()
            equipment.forEach((artifact, index) => {
                const artifactName = artifact.name || artifact.cardName || 'Unknown Artifact';
                const artifactCost = artifact.cost || 0;
                const formattedName = this.formatCardName(artifactName);
                
                tooltipHTML += `
                    <div class="equipment-entry" data-equipment-index="${index}">
                        <span class="equipment-name">${formattedName}</span>
                        ${artifactCost > 0 ? `<span class="equipment-cost">💰${artifactCost}</span>` : ''}
                    </div>
                `;
            });
            
            tooltipHTML += '</div>'; // Close equipment school section
        }
        
        tooltipHTML += `
                    </div>
                </div>
        `;
        
        // Add summary line
        const totalItems = (spellbook?.length || 0) + (equipment?.length || 0);
        const enabledSpells = spellbook ? spellbook.filter(spell => spell.enabled !== false).length : 0;
        const disabledSpells = spellbook ? spellbook.length - enabledSpells : 0;
        
        let summaryText = `Total Items: ${totalItems}`;
        if (spellbook && spellbook.length > 0) {
            if (disabledSpells > 0 && !isSpellbookLocked) {
                summaryText += ` • Spells: ${enabledSpells} enabled, ${disabledSpells} disabled`;
            } else {
                summaryText += ` • All ${enabledSpells} spells enabled`;
            }
        }
        
        // Update hint text based on lock status
        const hintText = isSpellbookLocked ? '🔒 Spellbook is locked - spells cannot be toggled' : '💡 Click spells to enable/disable them';
        
        tooltipHTML += `
                <div class="arsenal-summary">${summaryText}</div>
                <div class="spell-toggle-hint">${hintText}</div>
            </div>
        `;
        
        tooltip.innerHTML = tooltipHTML;
        
        // Add wheel event listener to the tooltip for direct scrolling
        tooltip.addEventListener('wheel', (event) => {
            this.handleTooltipScroll(event, tooltip);
        });
        
        // Calculate position BEFORE appending to prevent any visual jump
        if (!heroElement) return;
        
        const heroRect = heroElement.getBoundingClientRect();
        
        // Calculate position (to the left of the hero)
        const tooltipWidth = 320; // Approximate width
        let leftPos = heroRect.right + 10;
        let topPos = heroRect.top;
        
        // Check if it would go off screen on the left
        if (leftPos < 10) {
            // Position to the right instead
            leftPos = heroRect.right + 10;
        }
        
        // Ensure it doesn't go off screen on top
        if (topPos < 10) {
            topPos = 10;
        }
        
        // Set position INLINE before appending to DOM
        tooltip.style.position = 'fixed';
        tooltip.style.left = `${leftPos}px`;
        tooltip.style.top = `${topPos}px`;
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        
        // Now append to DOM
        document.body.appendChild(tooltip);
        tooltip.style.pointerEvents = 'none';

        // Update tracking state - only track hero hover
        this.currentTooltipPosition = position;
        this.isHeroHovered = true;

        // Enhance tooltip for locked mode
        if (window.heroTooltipManager) {
            window.heroTooltipManager.enhanceTooltipForLockedMode(tooltip, position);
        }
        
        // Check if card tooltip is visible and adjust position if needed
        const cardTooltip = document.querySelector('.large-card-tooltip:not(.formation-spellbook-tooltip)');
        if (cardTooltip) {
            const cardRect = cardTooltip.getBoundingClientRect();
            
            // If overlapping with card tooltip, reposition
            if (leftPos + tooltipWidth > cardRect.left && leftPos < cardRect.right) {
                console.log("CHECK CHECK CHECK");
                // Try to position further left
                leftPos = cardRect.left - tooltipWidth - 20;
                if (leftPos < 10) {
                    // If still no room, stack vertically
                    topPos = cardRect.bottom + 50;
                    leftPos = heroRect.left;
                }
                tooltip.style.left = `${leftPos}px`;
                tooltip.style.top = `${topPos}px`;
            }
        }
        
        // Now make tooltip visible after positioning is complete
        requestAnimationFrame(() => {
            tooltip.style.opacity = '';
            tooltip.style.visibility = '';
        });

        // Make tooltip not interfere with mouse events by default
        tooltip.style.pointerEvents = 'none';
        
        // Add wheel event listener to the hero element for scroll forwarding
        this.addHeroScrollSupport(heroElement, position);
        
        // Set up scroll indicators after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.updateScrollIndicators(tooltip);
        }, 50);
    }


    handleTooltipScroll(event, tooltip) {
        const spellbookList = tooltip.querySelector('.spellbook-list');
        if (!spellbookList) return;
        
        // Check if the spellbook list is actually scrollable
        if (spellbookList.scrollHeight <= spellbookList.clientHeight) {
            return; // Not scrollable, ignore
        }
        
        // Prevent default behavior
        event.preventDefault();
        
        // Calculate scroll amount (adjust multiplier for smooth scrolling)
        const scrollAmount = event.deltaY * 1.05;
        
        // Apply scroll
        spellbookList.scrollTop += scrollAmount;
        
        // Add visual feedback
        spellbookList.classList.add('scrolling');
        clearTimeout(spellbookList.scrollTimeout);
        spellbookList.scrollTimeout = setTimeout(() => {
            spellbookList.classList.remove('scrolling');
        }, 150);
    }

    refreshCurrentTooltip() {
        if (!this.currentTooltipPosition) return;
    
        const existingTooltip = document.getElementById('formationSpellbookTooltip');
        if (!existingTooltip) {
            // No existing tooltip, fall back to regular refresh
            this.refreshCurrentTooltip();
            return;
        }
        
        const position = this.currentTooltipPosition;
        
        // Get updated data
        const hero = window.heroSelection?.formationManager?.getBattleFormation()?.[position];
        if (!hero) return;
        
        const spellbook = window.heroSelection?.heroSpellbookManager?.getHeroSpellbook(position);
        const equipment = window.heroSelection?.heroEquipmentManager?.getHeroEquipment(position);
        
        // Don't update if no spells AND no equipment
        if ((!spellbook || spellbook.length === 0) && (!equipment || equipment.length === 0)) {
            this.hideHeroSpellbookTooltip();
            return;
        }
        
        // Store the current dimensions to maintain stability
        const currentWidth = existingTooltip.offsetWidth;
        const currentHeight = existingTooltip.offsetHeight;
        
        // Temporarily freeze dimensions during update to prevent layout shift
        existingTooltip.style.width = currentWidth + 'px';
        existingTooltip.style.minWidth = currentWidth + 'px';
        existingTooltip.style.maxWidth = currentWidth + 'px';
        existingTooltip.style.height = currentHeight + 'px';
        existingTooltip.style.overflow = 'hidden'; // Prevent any scrollbars during update
        
        // Generate new tooltip HTML (same logic as before)
        let tooltipHTML = `
            <div class="spellbook-tooltip-container">
                <h4 class="spellbook-tooltip-title">📋 ${hero.name}'s Arsenal</h4>
                <div class="tooltip-section arsenal-section">
                    <div class="section-header">
                        <span class="section-icon">📜</span>
                        <span class="section-title">Complete Arsenal (${(spellbook?.length || 0) + (equipment?.length || 0)} items)</span>
                    </div>
                    <div class="spellbook-list">
        `;
        
        // Add spellbook section if spells exist
        if (spellbook && spellbook.length > 0) {
            // Sort spells by school first, then by name
            const sortedSpells = [...spellbook].sort((a, b) => {
                const schoolCompare = (a.spellSchool || 'Unknown').localeCompare(b.spellSchool || 'Unknown');
                if (schoolCompare !== 0) return schoolCompare;
                return a.name.localeCompare(b.name);
            });
            
            let currentSchool = null;
            let spellIndexInOriginal = 0;
            
            sortedSpells.forEach((spell, sortedIndex) => {
                // Find the original index of this spell in the unsorted spellbook
                spellIndexInOriginal = spellbook.findIndex((originalSpell, idx) => {
                    const usedIndices = sortedSpells.slice(0, sortedIndex)
                        .map(usedSpell => spellbook.findIndex((s, i) => s === usedSpell && i >= 0))
                        .filter(i => i !== -1);
                    
                    return originalSpell === spell && !usedIndices.includes(idx);
                });
                
                const spellSchool = spell.spellSchool || 'Unknown';
                
                // Add school header if new school
                if (spellSchool !== currentSchool) {
                    if (currentSchool !== null) {
                        tooltipHTML += '</div>'; // Close previous school section
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
                    
                    tooltipHTML += `
                        <div class="spell-school-header" style="color: ${schoolColor};">
                            <span class="school-icon">${schoolIcon}</span> ${displaySchoolName}
                        </div>
                        <div class="spell-school-section">
                    `;
                }
                
                const spellLevel = spell.level !== undefined ? spell.level : 0;
                const spellName = this.formatCardName(spell.name);
                const isEnabled = spell.enabled !== false;
                
                const disabledClass = !isEnabled ? 'spell-disabled' : '';
                const clickHandler = `onclick="window.toggleHeroSpell('${position}', ${spellIndexInOriginal})"`;
                
                tooltipHTML += `
                    <div class="spell-entry ${disabledClass}" ${clickHandler} data-spell-index="${spellIndexInOriginal}" title="Click to ${isEnabled ? 'disable' : 'enable'} this spell">
                        <span class="spell-name">${spellName}</span>
                        <span class="spell-level">Lv${spellLevel}</span>
                    </div>
                `;
            });
            
            if (currentSchool !== null) {
                tooltipHTML += '</div>'; // Close last school section
            }
        }
        
        // Add equipment section if equipment exists (no separator, same scrollable area)
        if (equipment && equipment.length > 0) {
            // Add equipment header
            tooltipHTML += `
                <div class="spell-school-header equipment-header" style="color: #ffc107;">
                    <span class="school-icon">⚔️</span> Equipment
                </div>
                <div class="spell-school-section">
            `;
            
            equipment.forEach((artifact, index) => {
                const artifactName = artifact.name || artifact.cardName || 'Unknown Artifact';
                const artifactCost = artifact.cost || 0;
                const formattedName = this.formatCardName(artifactName);
                
                tooltipHTML += `
                    <div class="equipment-entry" data-equipment-index="${index}">
                        <span class="equipment-name">${formattedName}</span>
                        ${artifactCost > 0 ? `<span class="equipment-cost">💰${artifactCost}</span>` : ''}
                    </div>
                `;
            });
            
            tooltipHTML += '</div>'; // Close equipment school section
        }
        
        tooltipHTML += `
                    </div>
                </div>
        `;
        
        // Add summary line
        const totalItems = (spellbook?.length || 0) + (equipment?.length || 0);
        const enabledSpells = spellbook ? spellbook.filter(spell => spell.enabled !== false).length : 0;
        const disabledSpells = spellbook ? spellbook.length - enabledSpells : 0;
        
        let summaryText = `Total Items: ${totalItems}`;
        if (spellbook && spellbook.length > 0) {
            if (disabledSpells > 0) {
                summaryText += ` • Spells: ${enabledSpells} enabled, ${disabledSpells} disabled`;
            } else {
                summaryText += ` • All ${enabledSpells} spells enabled`;
            }
        }
        
        tooltipHTML += `
                <div class="arsenal-summary">${summaryText}</div>
                <div class="spell-toggle-hint">💡 Click spells to enable/disable them</div>
            </div>
        `;
        
        // Update the existing tooltip content
        existingTooltip.innerHTML = tooltipHTML;
        
        // Use requestAnimationFrame to ensure DOM update is complete before restoring dimensions
        requestAnimationFrame(() => {
            // Restore flexible dimensions after content update
            existingTooltip.style.width = '';
            existingTooltip.style.minWidth = '';
            existingTooltip.style.maxWidth = '';
            existingTooltip.style.height = '';
            existingTooltip.style.overflow = '';
            
            // REMOVED: tooltip hover event listeners - no longer needed
            
            // KEEP: wheel event listener for scrolling functionality
            existingTooltip.addEventListener('wheel', (event) => {
                this.handleTooltipScroll(event, existingTooltip);
            });
            
            // Update scroll indicators after dimensions are restored
            setTimeout(() => {
                this.updateScrollIndicators(existingTooltip);
            }, 50);
        });
    }

    addHeroScrollSupport(heroElement, position) {
        // Remove any existing wheel listener
        if (heroElement.heroWheelListener) {
            heroElement.removeEventListener('wheel', heroElement.heroWheelListener);
        }
        
        // Create new wheel listener
        heroElement.heroWheelListener = (event) => {
            // Only handle if this hero's tooltip is currently visible
            if (this.currentTooltipPosition !== position) return;
            
            const tooltip = document.getElementById('formationSpellbookTooltip');
            if (!tooltip) return;
            
            // Forward the scroll event to the tooltip
            this.handleTooltipScroll(event, tooltip);
        };
        
        // Add the wheel listener with passive: false to allow preventDefault
        heroElement.addEventListener('wheel', heroElement.heroWheelListener, { passive: false });
    }

    // Updated hideHeroSpellbookTooltip method - hero only tracking
    hideHeroSpellbookTooltip() {
        // Clear any pending timeout
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout);
            this.tooltipHideTimeout = null;
        }
        
        const tooltip = document.getElementById('formationSpellbookTooltip');
        if (tooltip) {
            tooltip.remove();
        }
        
        // Clean up wheel listeners from hero elements
        this.cleanupHeroScrollSupport();
        
        // Reset tracking state - hero only
        this.currentTooltipPosition = null;
        this.isHeroHovered = false;

        // Cleanup locked mode state
        if (window.heroTooltipManager) {
            window.heroTooltipManager.cleanup();
        }
    }

    updateScrollIndicators(tooltip) {
        const spellbookList = tooltip.querySelector('.spellbook-list');
        if (!spellbookList) return;
        
        // Check if content is scrollable
        const isScrollable = spellbookList.scrollHeight > spellbookList.clientHeight;
        
        if (isScrollable) {
            spellbookList.setAttribute('data-scrollable', 'true');
            
            // Add scroll event listener to detect when user can scroll more
            spellbookList.addEventListener('scroll', () => {
                const hasMoreContent = spellbookList.scrollTop < (spellbookList.scrollHeight - spellbookList.clientHeight - 5);
                if (hasMoreContent) {
                    spellbookList.classList.add('has-more-content');
                } else {
                    spellbookList.classList.remove('has-more-content');
                }
            });
            
            // Initial check
            const hasMoreContent = spellbookList.scrollHeight > spellbookList.clientHeight;
            if (hasMoreContent) {
                spellbookList.classList.add('has-more-content');
            }
            
            // Add visual hint to hero card
            const heroElement = document.querySelector(`[data-slot-position="${this.currentTooltipPosition}"]`);
            if (heroElement) {
                heroElement.classList.add('tooltip-scrollable');
            }
        } else {
            spellbookList.removeAttribute('data-scrollable');
            spellbookList.classList.remove('has-more-content');
            
            // Remove visual hint from hero card
            const heroElement = document.querySelector(`[data-slot-position="${this.currentTooltipPosition}"]`);
            if (heroElement) {
                heroElement.classList.remove('tooltip-scrollable');
            }
        }
    }

    cleanupHeroScrollSupport() {
        // Find all hero elements that might have wheel listeners
        const heroElements = document.querySelectorAll('.character-card[data-slot-position]');
        heroElements.forEach(heroElement => {
            if (heroElement.heroWheelListener) {
                heroElement.removeEventListener('wheel', heroElement.heroWheelListener);
                delete heroElement.heroWheelListener;
            }
            // Remove visual hints
            heroElement.classList.remove('tooltip-scrollable');
        });
    }

    // Check if Nicolas effect is currently usable
    isNicolasEffectUsable(character) {
        if (character.name !== 'Nicolas') return false;
        
        // Check if we have access to the managers
        if (!window.heroSelection || !window.heroSelection.nicolasEffectManager || !window.heroSelection.goldManager) {
            return false;
        }
        
        const canUse = window.heroSelection.nicolasEffectManager.canUseNicolasEffect(window.heroSelection.goldManager);
        return canUse.canUse;
    }

    // Check if Kazena effect is currently usable
    isKazenaEffectUsable(character) {
        if (character.name !== 'Kazena') return false;
        
        if (!window.heroSelection || !window.heroSelection.kazenaEffectManager) return false;
        
        const handManager = window.heroSelection.handManager;
        const canUse = window.heroSelection.kazenaEffectManager.canUseKazenaEffect(handManager);
        return canUse.canUse;
    }

    // Check if Riffel effect is currently usable
    isRiffelEffectUsable(character) {
        if (character.name !== 'Riffel') return false;
        
        if (!window.heroSelection || !window.heroSelection.riffelEffectManager) {
            return false;
        }
        
        const canUse = window.heroSelection.riffelEffectManager.canUseRiffelEffect();
        return canUse.canUse;
    }

    // Helper method to get hero stats for display
    getHeroStats(slotPosition) {
        if (!window.heroSelection || !slotPosition) return null;
        
        // Use the enhanced stat calculation that includes ability bonuses
        const effectiveStats = window.heroSelection.calculateEffectiveHeroStats(slotPosition);
        if (effectiveStats) {
            return {
                currentHp: effectiveStats.currentHp,
                maxHp: effectiveStats.maxHp,
                attack: effectiveStats.attack,
                // Include bonus information for potential UI enhancements
                bonuses: effectiveStats.bonuses
            };
        }
        
        // Fallback to original logic for backward compatibility
        const formation = window.heroSelection.formationManager?.getBattleFormation();
        if (!formation || !formation[slotPosition]) return null;
        
        const hero = formation[slotPosition];
        
        // Check if this is a Hero instance with stats, or just character data
        if (hero.currentHp !== undefined && hero.maxHp !== undefined && hero.atk !== undefined) {
            // This is a proper Hero instance
            let currentAttack = hero.atk;
            if (typeof hero.getCurrentAttack === 'function') {
                currentAttack = hero.getCurrentAttack();
            }
            
            const stats = {
                currentHp: hero.currentHp,
                maxHp: hero.maxHp,
                attack: currentAttack
            };
            
            return stats;
        } else {
            // This might be basic character data, try to get stats from card database
            const heroInfo = window.heroSelection.getCardInfo ? window.heroSelection.getCardInfo(hero.name) : null;
            if (heroInfo && heroInfo.cardType === 'hero') {
                const stats = {
                    currentHp: heroInfo.hp,
                    maxHp: heroInfo.hp,
                    attack: heroInfo.atk
                };
                
                return stats;
            }
        }
        
        // Fallback - no stats available
        return null;
    }

    createCreatureTooltipData(creatureName, creatureData = null) {
        // Get creature info from card database
        const cardInfo = creatureData || (window.heroSelection?.getCardInfo ? window.heroSelection.getCardInfo(creatureName) : null);
        
        const tooltipData = {
            imagePath: `./Cards/All/${creatureName}.png`,
            displayName: this.formatCardName(creatureName),
            cardType: 'creature'
        };
        
        // Add creature stats if it's a creature spell with HP
        if (cardInfo && (cardInfo.cardType === 'Spell' || cardInfo.cardType === 'Token') && cardInfo.subtype === 'Creature' && cardInfo.hp) {
            tooltipData.creatureStats = {
                maxHp: cardInfo.hp
            };
        }
        
        return tooltipData;
    }

    // Create hero stats display HTML
    createHeroStatsHTML(slotPosition) {
        const stats = this.getHeroStats(slotPosition);
        if (!stats) return '';
        
        // Determine if stats have bonuses for visual indication
        const hasHpBonus = stats.bonuses && stats.bonuses.hpBonus > 0;
        const hasAttackBonus = stats.bonuses && stats.bonuses.attackBonus > 0;
        
        // Add bonus classes for visual styling
        const hpClass = hasHpBonus ? 'hero-stat hero-hp boosted' : 'hero-stat hero-hp';
        const attackClass = hasAttackBonus ? 'hero-stat hero-attack boosted' : 'hero-stat hero-attack';
        
        return `
            <div class="hero-stats-overlay">
                <div class="${hpClass}" data-stat="hp" ${hasHpBonus ? `title="Base + ${stats.bonuses.hpBonus} from Toughness"` : ''}>
                    <span class="stat-value">${stats.currentHp}</span>
                </div>
                <div class="${attackClass}" data-stat="attack" ${hasAttackBonus ? `title="Base + ${stats.bonuses.attackBonus} from Fighting"` : ''}>
                    <span class="stat-value">${stats.attack}</span>
                </div>
            </div>
        `;
    }

    // Update hero stats for a specific position (useful for dynamic updates)
    updateHeroStats(slotPosition) {
        const heroCard = document.querySelector(`[data-slot-position="${slotPosition}"] .hero-stats-overlay`);
        if (!heroCard) return;
        
        const stats = this.getHeroStats(slotPosition);
        if (!stats) return;
        
        const hpStat = heroCard.querySelector('[data-stat="hp"]');
        const attackStat = heroCard.querySelector('[data-stat="attack"]');
        const hpValue = heroCard.querySelector('[data-stat="hp"] .stat-value');
        const attackValue = heroCard.querySelector('[data-stat="attack"] .stat-value');
        
        if (hpValue) hpValue.textContent = stats.currentHp;
        if (attackValue) attackValue.textContent = stats.attack;
        
        // Update bonus styling and tooltips
        if (hpStat && stats.bonuses) {
            const hasHpBonus = stats.bonuses.hpBonus > 0;
            if (hasHpBonus) {
                hpStat.classList.add('boosted');
                hpStat.title = `Base + ${stats.bonuses.hpBonus} from Toughness`;
            } else {
                hpStat.classList.remove('boosted');
                hpStat.removeAttribute('title');
            }
        }
        
        if (attackStat && stats.bonuses) {
            const hasAttackBonus = stats.bonuses.attackBonus > 0;
            if (hasAttackBonus) {
                attackStat.classList.add('boosted');
                attackStat.title = `Base + ${stats.bonuses.attackBonus} from Fighting`;
            } else {
                attackStat.classList.remove('boosted');
                attackStat.removeAttribute('title');
            }
        }
    }

    // Update all hero stats in the formation
    updateAllHeroStats() {
        ['left', 'center', 'right'].forEach(position => {
            this.updateHeroStats(position);
        });
    }

    // Create character card HTML
    createCharacterCardHTML(character, isSelectable = true, isSelected = false, showTooltip = false, isDraggable = false, slotPosition = null, includeAbilityZones = false, heroAbilitiesManager = null) {
        const selectableClass = isSelectable ? 'character-selectable' : '';
        const selectedClass = isSelected ? 'character-selected' : '';
        const draggableClass = isDraggable ? 'character-draggable' : '';
        
        // Check if this is Nicolas and if the effect is usable
        const isNicolasUsable = character.name === 'Nicolas' && isDraggable && this.isNicolasEffectUsable(character);
        const nicolasUsableClass = isNicolasUsable ? 'nicolas-effect-usable' : '';

        // Check if this is Kazena and if the effect is usable
        const isKazenaUsable = character.name === 'Kazena' && isDraggable && this.isKazenaEffectUsable(character);
        const kazenaUsableClass = isKazenaUsable ? 'kazena-effect-usable' : '';

        // Check if this is Riffel and if the effect is usable
        const isRiffelUsable = character.name === 'Riffel' && isDraggable && this.isRiffelEffectUsable(character);
        const riffelUsableClass = isRiffelUsable ? 'riffel-effect-usable' : '';
        
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
        
        // Add hero hover events for team building mode (on the image itself)
        let heroHoverEvents = '';
        if (isDraggable && includeAbilityZones && slotPosition) {
            heroHoverEvents = `
                onmouseenter="window.handleHeroHoverEnter('${slotPosition}', this)"
                onmouseleave="window.handleHeroHoverLeave()"
            `;
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

        // Hero click handler for formation heroes
        let heroClickEvents = '';
        if (isDraggable && slotPosition) {
            if (character.name === 'Nicolas') {
                heroClickEvents = `onclick="window.handleNicolasClick(event, '${slotPosition}', '${character.name}')"`;
            } else if (character.name === 'Kazena') {
                heroClickEvents = `onclick="window.handleKazenaClick(event, '${slotPosition}', '${character.name}')"`;
            } else if (character.name === 'Riffel') {
                heroClickEvents = `onclick="window.handleRiffelClick(event, '${slotPosition}', '${character.name}')"`;
            } else if (character.name === 'Vacarn') {
                heroClickEvents = `onclick="window.handleVacarnClick(event, '${slotPosition}', '${character.name}')"`;
            } else if (character.name.includes('Waflav')) {  // NEW - Waflav click handling
                heroClickEvents = `onclick="window.handleWaflavClick(event, '${slotPosition}', '${character.name}')"`;
            }
        }
        
        // Only show character name if NOT in team building (no ability zones)
        const showCharacterName = !includeAbilityZones;
        
        // Add ability zones HTML if requested
        const abilityZonesHTML = includeAbilityZones ? 
            this.createAbilityZonesHTML(slotPosition, heroAbilitiesManager) : '';
        
        // Add hero stats HTML if in team building mode (includeAbilityZones = true)
        const heroStatsHTML = includeAbilityZones && slotPosition ? 
            this.createHeroStatsHTML(slotPosition) : '';

        // Add evolution counter HTML if this is a Waflav hero in team building mode
        const evolutionCounterHTML = includeAbilityZones && slotPosition && character.name.includes('Waflav') ? 
            this.createEvolutionCounterHTML() : '';

        // Add tags HTML if in selection mode (NOT in team building)
        const tagsHTML = !includeAbilityZones && window.tagsManager ? 
            window.tagsManager.createTagsHTML(character.name, {
                size: 'small',
                layout: 'horizontal',
                animated: true
            }) : '';
        
        return `
            <div class="character-card ${selectableClass} ${selectedClass} ${draggableClass} ${includeAbilityZones ? 'with-ability-zones' : ''}" 
                data-character-id="${character.id}"
                data-slot-position="${slotPosition || ''}"
                data-character-name="${character.name}"
                ${isSelectable && !isDraggable ? `onclick="window.selectCharacterCard(${character.id})"` : ''}
                ${hoverEvents}>
                <div class="character-image-container ${character.name === 'Nicolas' && isDraggable ? 'nicolas-clickable' : ''} ${nicolasUsableClass} ${character.name === 'Kazena' && isDraggable ? 'kazena-clickable' : ''} ${kazenaUsableClass} ${character.name === 'Riffel' && isDraggable ? 'riffel-clickable' : ''} ${riffelUsableClass} ${character.name.includes('Waflav') && isDraggable ? 'waflav-clickable' : ''}">
                    <img src="${character.image}" 
                        alt="${character.name}" 
                        class="character-image ${character.name === 'Nicolas' && isDraggable ? 'nicolas-hero-image' : ''} ${character.name === 'Kazena' && isDraggable ? 'kazena-hero-image' : ''} ${character.name === 'Riffel' && isDraggable ? 'riffel-hero-image' : ''}"
                        ${tooltipEvents}
                        ${heroHoverEvents}
                        ${dragEvents}
                        ${heroClickEvents}
                        onerror="this.src='./Cards/Characters/placeholder.png'">
                    ${heroStatsHTML}
                    ${evolutionCounterHTML}
                    ${tagsHTML}
                </div>
                ${showCharacterName ? `<div class="character-name">${character.name}</div>` : ''}
                ${abilityZonesHTML}
            </div>
        `;
    }

    createEvolutionCounterHTML() {
        if (!window.heroSelection || !window.heroSelection.playerCounters) {
            return '';
        }
        
        const evolutionCounters = window.heroSelection.playerCounters.evolutionCounters;
        
        // Only hide if evolutionCounters is undefined/null, but show 0
        if (evolutionCounters === undefined || evolutionCounters === null) {
            return '';
        }
        
        return `
            <div class="evolution-counter-display">
                ${evolutionCounters}
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
                
                // Check if this is an Inventing ability and get counter count
                let inventingCounterHTML = '';
                if (ability.name === 'Inventing' && window.heroSelection && window.heroSelection.inventingAbility) {
                    // Get hero name from position first
                    const heroName = window.heroSelection.inventingAbility.getHeroNameFromPosition(position);
                    const counterCount = heroName ? 
                        window.heroSelection.inventingAbility.getCountersForHeroAndZone(heroName, zoneNumber) : 0;
                    inventingCounterHTML = `
                        <div class="inventing-counter-display" data-position="${position}" data-zone="${zoneNumber}">
                            <span class="inventing-counter-icon">🔧</span>
                            <span class="inventing-counter-value">${counterCount}</span>
                        </div>
                    `;
                }
                
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
                        ${inventingCounterHTML}
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
                
                // Create enhanced creature tooltip data with stats
                const cardData = this.createCreatureTooltipData(creature.name, creature);
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
    createTeamSlotHTML(position, character = null, createCharacterCardFn = null, heroAbilitiesManager = null) {
        const slotClass = character ? 'team-slot filled' : 'team-slot empty';
        
        // Create character HTML WITHOUT tooltip events (we'll handle them at the image level)
        const characterHTML = character ? 
            this.createCharacterCardHTML(character, false, false, false, true, position, true, heroAbilitiesManager || window.heroSelection?.heroAbilitiesManager) : 
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
        if (playerCharacters.length === 0) {
            return `
                <div class="hero-selection-waiting">
                    <h2>⚔️ Preparing Battle Arena...</h2>
                    <p>Waiting for character assignments...</p>
                </div>
            `;
        }

        const playerCardsHTML = playerCharacters
            .map(char => {
                return this.createCharacterCardHTML(char, true, false);
            })
            .join('');

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

        return fullHTML;
    }

    // Generate team building screen HTML - CONSOLIDATED VERSION
    generateTeamBuildingHTML() {
        if (!window.heroSelection?.selectedCharacter) {
            return '<div class="loading-heroes"><h2>No character selected</h2></div>';
        }

        // Get the battle formation
        const battleFormation = window.heroSelection.formationManager.getBattleFormation();
        
        // Create the area slot using AreaHandler
        const areaSlot = window.heroSelection.areaHandler ? 
            window.heroSelection.areaHandler.createAreaSlotHTML() : 
            '<div class="area-slot empty"><div class="area-placeholder"><div class="area-globe">🌍</div><div class="area-label">Area</div></div></div>';

        // Create the discard pile slot
        const discardPileSlot = this.createDiscardPileSlotHTML();

        // Create the hero team slots
        const leftSlot = this.createTeamSlotHTML('left', battleFormation.left);
        const centerSlot = this.createTeamSlotHTML('center', battleFormation.center);
        const rightSlot = this.createTeamSlotHTML('right', battleFormation.right);
        
        // Create life display
        const lifeDisplay = window.heroSelection.lifeManager.createLifeDisplay();
        
        const permanentArtifactsIndicator = this.createPermanentArtifactsIndicator();

        // Create hand display
        const handDisplay = window.heroSelection.handManager.createHandDisplay(
            (cardName) => window.heroSelection.formatCardName(cardName)
        );
        
        // Create deck grid
        const deckGrid = window.heroSelection.deckManager.createDeckGrid(
            (cardName) => window.heroSelection.formatCardName(cardName)
        );
        
        // Create gold display
        const goldDisplay = window.heroSelection.goldManager.createGoldDisplay();
        
        // Create action display
        const actionDisplay = window.heroSelection.actionManager.createActionDisplay();
        
        // Create potion display
        const potionDisplay = window.potionHandler ? window.potionHandler.createPotionDisplay() : '';
        
        setTimeout(() => this.refreshHeroStats(), 200);
        
        return `
            ${lifeDisplay}
            ${permanentArtifactsIndicator}
            <div class="team-building-container">
                <!-- Left Column - Team Formation -->
                <div class="team-building-left">
                    <div class="team-header" style="text-align: center;">
                        <div class="team-header-title" style="text-align: center;">
                            <h2>🛡️ Your Battle Formation</h2>
                            ${window.heroSelection.globalSpellManager.isGuardChangeModeActive() ? 
                            '<div class="guard-change-indicator">Guard Change Active</div>' : 
                            ''}
                        </div>
                        <p class="drag-hint">💡 Drag and drop Heroes to rearrange your formation!</p>
                        <p class="drag-hint">🎯 Drag cards onto a Hero slot to attach them!</p>
                        <p class="drag-hint">⇄ Drag and drop Creatures to reorder them!</p>
                        <p class="drag-hint">🌍 Drag Area cards to the Area zone!</p>
                    </div>
                    
                    <!-- Decoupled Area, Discard Pile, and Hero slots -->
                    <div class="team-slots-container">
                        <!-- Area slot - positioned independently -->
                        ${areaSlot}
                        
                        <!-- Discard pile slot - positioned below area -->
                        ${discardPileSlot}
                        
                        <!-- Hero slots - wrapped separately -->
                        <div class="hero-slots-container">
                            ${leftSlot}
                            ${centerSlot}
                            ${rightSlot}
                        </div>
                    </div>
                    
                    <!-- Hand directly below hero slots -->
                    <div class="hand-display-area-inline">
                        ${handDisplay}
                    </div>
                </div>
                
                <!-- Right Column - Player's Deck -->
                <div class="team-building-right-wrapper">
                    <!-- Tooltip Container - now a sibling, not a child -->
                    <div class="deck-tooltip-anchor" id="deckTooltipAnchor">
                        <div class="deck-tooltip-content" id="deckTooltipContent" style="display: none;">
                            <!-- Tooltip content will be inserted here -->
                        </div>
                    </div>
                    
                    <!-- Deck Container -->
                    <div class="team-building-right">
                        ${deckGrid}
                    </div>
                </div>
                
                <!-- Gold, Action, and Potion Display - positioned together -->
                <div class="resource-display-container">
                    <div class="resource-top-row">
                        ${goldDisplay}
                        ${potionDisplay}
                    </div>
                    <div class="resource-bottom-row">
                        ${actionDisplay}
                    </div>
                </div>
            </div>
        `;
    }

    // Create discard pile slot HTML
    createDiscardPileSlotHTML() {
        return `
            <div class="discard-pile-slot empty" 
                id="discardPileSlot"
                ondragover="window.onDiscardPileDragOver(event)"
                ondrop="window.onDiscardPileDrop(event)"
                ondragleave="window.onDiscardPileDragLeave(event)"
                ondragenter="window.onDiscardPileDragEnter(event)"
                onmouseenter="window.onDiscardPileHoverEnter(this)"
                onmouseleave="window.onDiscardPileHoverLeave()">
                <div class="discard-placeholder">
                    <div class="discard-icon">🗑️</div>
                    <div class="discard-label">Discard Pile</div>
                </div>
            </div>
        `;
    }

    // Update the battle formation UI after drag/drop
    updateBattleFormationUI() {
        const heroSlotsContainer = document.querySelector('.hero-slots-container');
        if (heroSlotsContainer && window.heroSelection) {
            const battleFormation = window.heroSelection.formationManager.getBattleFormation();
            
            // Only update the hero slots, not the entire team-slots-container
            const leftSlot = this.createTeamSlotHTML('left', battleFormation.left);
            const centerSlot = this.createTeamSlotHTML('center', battleFormation.center);
            const rightSlot = this.createTeamSlotHTML('right', battleFormation.right);
            
            heroSlotsContainer.innerHTML = `
                ${leftSlot}
                ${centerSlot}
                ${rightSlot}
            `;
            
            // Update hero stats after UI refresh
            setTimeout(() => {
                this.refreshHeroStats();
                
                // Also update Inventing counter displays
                if (window.heroSelection && window.heroSelection.inventingAbility) {
                    window.heroSelection.inventingAbility.updateInventingCounterDisplays();
                }
            }, 50);
        }
    }

    // Refresh hero stats - delegated method
    refreshHeroStats() {
        this.updateAllHeroStats();
    }
}

// ===== GLOBAL FUNCTIONS FOR PERMANENT ARTIFACTS TOOLTIP =====

window.showPermanentArtifactsTooltip = function(element) {
    if (!window.heroSelection || !window.heroSelection.heroSelectionUI) return;
    
    const tooltipData = window.heroSelection.heroSelectionUI.createPermanentArtifactsTooltip();
    if (!tooltipData) return;
    
    // Remove any existing tooltip
    window.hidePermanentArtifactsTooltip();
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'permanentArtifactsTooltip';
    tooltip.className = `permanent-artifacts-tooltip ${tooltipData.isEmpty ? 'empty' : ''}`;
    
    tooltip.innerHTML = `
        <div class="tooltip-header">
            <span class="tooltip-icon">📜</span>
            <span class="tooltip-title">${tooltipData.title}</span>
        </div>
        <div class="tooltip-content">
            ${tooltipData.content}
        </div>
        ${tooltipData.summary ? `
            <div class="tooltip-summary">
                ${tooltipData.summary}
            </div>
        ` : ''}
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip above the indicator
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 10;
    
    // Adjust if going off screen
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top < 10) {
        // Show below instead
        top = rect.bottom + 10;
        tooltip.classList.add('below');
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    
    // Add fade in animation
    requestAnimationFrame(() => {
        tooltip.classList.add('visible');
    });
};

window.hidePermanentArtifactsTooltip = function() {
    const tooltip = document.getElementById('permanentArtifactsTooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
        setTimeout(() => {
            tooltip.remove();
        }, 200);
    }
};

// ===== ENHANCED DRAG AND DROP HANDLERS WITH IMPROVED TOOLTIP MANAGEMENT =====

// Global tooltip tracking
let currentTooltip = null;
let currentTooltipSlot = null;

// Helper function to clean up any existing tooltips
function cleanupAllAbilityTooltips() {
    const allTooltips = document.querySelectorAll('.ability-drop-tooltip, .spell-drop-tooltip, .equip-drop-tooltip, .teleport-drop-tooltip');
    allTooltips.forEach(tooltip => tooltip.remove());
    currentTooltip = null;
    currentTooltipSlot = null;
}

// Enhanced team slot drag over handler
async function onTeamSlotDragOver(event, position) {
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
            // Check if it's a global spell - if so, just prevent default and return
            if (window.heroSelection.heroSpellbookManager.isSpellCard(cardName)) {
                // Check if it's a global spell - if so, just prevent default and return
                if (window.globalSpellManager && window.globalSpellManager.isGlobalSpell(cardName, window.heroSelection)) {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Special handling for Teleport - allow drop on heroes
                    if (cardName === 'Teleport') {
                        const slot = event.currentTarget;
                        
                        // Clean up tooltip from other slots if we're over a different slot
                        if (currentTooltipSlot && currentTooltipSlot !== slot) {
                            cleanupAllAbilityTooltips();
                            if (currentTooltipSlot && currentTooltipSlot.classList) {
                                currentTooltipSlot.classList.remove('teleport-drop-ready', 'teleport-drop-invalid');
                            }
                        }
                        
                        // Check if tooltip already exists for this slot
                        let existingTooltip = slot.querySelector('.teleport-drop-tooltip');
                        
                        if (!existingTooltip) {
                            // Use the teleport spell's canActivateOnHero method
                            const canActivateResult = window.teleportSpell ? 
                                window.teleportSpell.canActivateOnHero(window.heroSelection, position) : 
                                { canActivate: false, reason: 'Teleport spell not loaded' };
                            
                            // Set visual state
                            if (canActivateResult.canActivate) {
                                slot.classList.add('teleport-drop-ready');
                                slot.classList.remove('teleport-drop-invalid');
                            } else {
                                slot.classList.add('teleport-drop-invalid');
                                slot.classList.remove('teleport-drop-ready');
                            }
                            
                            // Create tooltip
                            const tooltip = document.createElement('div');
                            let tooltipClass = 'teleport-drop-tooltip';
                            let tooltipMessage = '';
                            
                            if (canActivateResult.canActivate) {
                                tooltipClass += ' can-teleport';
                                tooltipMessage = `Teleport ${canActivateResult.targetHeroName} away!`;
                            } else {
                                tooltipClass += ' cannot-teleport';
                                // Check if the reason is about no heroes having the required spell school
                                if (canActivateResult.reason.includes('No Hero has')) {
                                    tooltipMessage = 'No Hero can cast Teleport!';
                                } else {
                                    tooltipMessage = canActivateResult.reason;
                                }
                            }
                            
                            tooltip.className = tooltipClass;
                            
                            // Add long-text class if needed
                            if (tooltipMessage.length > 30) {
                                tooltip.className += ' long-text';
                            }
                            
                            tooltip.textContent = tooltipMessage;
                            
                            // Style the tooltip
                            tooltip.style.cssText = `
                                position: absolute;
                                top: -40px;
                                left: 50%;
                                transform: translateX(-50%);
                                padding: 8px 16px;
                                border-radius: 4px;
                                font-size: 14px;
                                font-weight: bold;
                                white-space: nowrap;
                                z-index: 1000;
                                pointer-events: none;
                                animation: fadeIn 0.3s ease-out;
                                border: 2px solid rgba(255, 255, 255, 0.3);
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                            `;
                            
                            slot.appendChild(tooltip);
                            
                            // Track current tooltip and slot
                            currentTooltip = tooltip;
                            currentTooltipSlot = slot;
                        } else {
                            // Tooltip already exists, just update the classes
                            const canActivateResult = window.teleportSpell ? 
                                window.teleportSpell.canActivateOnHero(window.heroSelection, position) : 
                                { canActivate: false };
                            
                            if (canActivateResult.canActivate) {
                                slot.classList.add('teleport-drop-ready');
                                slot.classList.remove('teleport-drop-invalid');
                            } else {
                                slot.classList.add('teleport-drop-invalid');
                                slot.classList.remove('teleport-drop-ready');
                            }
                            
                            // Update tracking
                            currentTooltip = existingTooltip;
                            currentTooltipSlot = slot;
                        }
                        
                        return; 
                    } else {
                        // Other global spells show the hint
                        const slot = event.currentTarget;
                        slot.classList.add('global-spell-hover');
                        return;
                    }
                }
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
                } else if (learnCheck.isSemiGoldLearning) {
                    // Special case for Semi gold learning
                    slot.classList.add('spell-drop-ready');
                    slot.classList.remove('spell-drop-invalid');
                } else if (learnCheck.isDarkDealGoldLearning) {
                    tooltipClass += ' darkdeal-gold-learn';
                    tooltipMessage = learnCheck.reason;
                } else {
                    slot.classList.add('spell-drop-invalid');
                    slot.classList.remove('spell-drop-ready');
                }

                // Create tooltip
                const tooltip = document.createElement('div');
                let tooltipClass = 'spell-drop-tooltip';
                let tooltipMessage = '';

                if (learnCheck.canLearn) {
                    tooltipClass += ' can-learn';
                    tooltipMessage = `${learnCheck.heroName} can learn ${window.heroSelection.formatCardName(cardName)}!`;
                } else if (learnCheck.isSemiGoldLearning) {
                    // Special styling for Semi gold learning
                    tooltipClass += ' semi-gold-learn';
                    tooltipMessage = learnCheck.reason; // Already formatted in canHeroLearnSpell
                } else {
                    tooltipClass += ' cannot-learn';
                    tooltipMessage = learnCheck.reason;
                }

                tooltip.className = tooltipClass;

                // Add long-text class if needed
                if (tooltipMessage.length > 30) {
                    tooltip.className += ' long-text';
                }

                tooltip.textContent = tooltipMessage;
                
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
                } else if (learnCheck.isSemiGoldLearning) {
                    // Special case for Semi gold learning
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

        // Check if it's an equip artifact card
        if (window.heroSelection.heroEquipmentManager && 
            window.heroSelection.heroEquipmentManager.isEquipArtifactCard(cardName)) {
            
            event.preventDefault();
            event.stopPropagation();
            
            const slot = event.currentTarget;
            
            // Clean up tooltip from other slots if we're over a different slot
            if (currentTooltipSlot && currentTooltipSlot !== slot) {
                cleanupAllAbilityTooltips();
                if (currentTooltipSlot && currentTooltipSlot.classList) {
                    currentTooltipSlot.classList.remove('equip-drop-ready', 'equip-drop-invalid');
                }
            }
            
            // Check if tooltip already exists for this slot
            let existingTooltip = slot.querySelector('.equip-drop-tooltip');
            
            if (!existingTooltip) {
                // Check if hero can equip the artifact WITHOUT actually equipping it
                const equipCheck = window.heroSelection.heroEquipmentManager.canEquipArtifact(position, cardName);
                const formation = window.heroSelection.formationManager.getBattleFormation();
                const hero = formation[position];
                
                // Set visual state
                if (equipCheck.success) {
                    slot.classList.add('equip-drop-ready');
                    slot.classList.remove('equip-drop-invalid');
                } else {
                    slot.classList.add('equip-drop-invalid');
                    slot.classList.remove('equip-drop-ready');
                }
                
                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.className = `equip-drop-tooltip ${equipCheck.success ? 'can-equip' : 'cannot-equip'}`;
                
                // Add long-text class if needed
                if (equipCheck.reason && equipCheck.reason.length > 30) {
                    tooltip.className += ' long-text';
                }
                
                const heroName = hero ? hero.name : 'Hero';
                
                tooltip.textContent = equipCheck.success ? 
                    `${heroName} can equip ${window.heroSelection.formatCardName(cardName)}!` : 
                    equipCheck.reason;
                
                // Style the tooltip
                tooltip.style.cssText = `
                    position: absolute;
                    top: -40px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: bold;
                    white-space: nowrap;
                    z-index: 1000;
                    pointer-events: none;
                    animation: fadeIn 0.3s ease-out;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                    ${equipCheck.success ? 
                        'background: linear-gradient(135deg, #ffc107 0%, #ffca2c 100%); color: #212529; border-color: rgba(255, 255, 255, 0.5);' : 
                        'background: linear-gradient(135deg, #dc3545 0%, #e63946 100%); color: white; border-color: rgba(255, 255, 255, 0.3);'}
                `;
                
                // Handle long text tooltips
                if (equipCheck.reason && equipCheck.reason.length > 30) {
                    tooltip.style.maxWidth = '250px';
                    tooltip.style.whiteSpace = 'normal';
                    tooltip.style.textAlign = 'center';
                    tooltip.style.lineHeight = '1.3';
                }
                
                slot.appendChild(tooltip);
                
                // Track current tooltip and slot
                currentTooltip = tooltip;
                currentTooltipSlot = slot;
                
            } else {
                // Tooltip already exists, just update the classes
                const equipCheck = window.heroSelection.heroEquipmentManager.canEquipArtifact(position, cardName);
                
                if (equipCheck.canEquip) {
                    slot.classList.add('equip-drop-ready');
                    slot.classList.remove('equip-drop-invalid');
                } else {
                    slot.classList.add('equip-drop-invalid');
                    slot.classList.remove('equip-drop-ready');
                }
                
                // Update tracking
                currentTooltip = existingTooltip;
                currentTooltipSlot = slot;
            }
            
            return;
        }

        // Check if it's a hero-targeting artifact (like SummoningCircle)
        if (window.artifactHandler) {
            const canHandle = await window.artifactHandler.canHandleHeroDrop(cardName);
            if (canHandle) {
                event.preventDefault();
                event.stopPropagation();
                
                const slot = event.currentTarget;
                
                // Clean up tooltip from other slots if we're over a different slot
                if (currentTooltipSlot && currentTooltipSlot !== slot) {
                    cleanupAllAbilityTooltips();
                    if (currentTooltipSlot && currentTooltipSlot.classList) {
                        currentTooltipSlot.classList.remove('hero-artifact-drop-ready', 'hero-artifact-drop-invalid');
                    }
                }
                
                // Add visual feedback (optional - you can customize this)
                slot.classList.add('hero-artifact-drop-ready');
                slot.classList.remove('hero-artifact-drop-invalid');
                
                // Track current slot
                currentTooltipSlot = slot;
                
                return;
            }
        }

        // Check if it's an ascended hero card
        if (window.ascendedManager && window.ascendedManager.isAscendedHero(cardName)) {
            event.preventDefault();
            event.stopPropagation();
            
            const slot = event.currentTarget;
            
            // Clean up tooltip from other slots if we're over a different slot
            if (currentTooltipSlot && currentTooltipSlot !== slot) {
                cleanupAllAbilityTooltips();
                if (currentTooltipSlot && currentTooltipSlot.classList) {
                    currentTooltipSlot.classList.remove('ascension-drop-ready', 'ascension-drop-invalid');
                }
            }
            
            // Check if tooltip already exists for this slot
            let existingTooltip = slot.querySelector('.ascension-drop-tooltip');
            
            if (!existingTooltip) {
                // Get ascension validation info
                const tooltipInfo = window.ascendedManager.getAscensionDropTooltipInfo(position, cardName);
                
                // Set visual state
                if (tooltipInfo.canDrop) {
                    slot.classList.add('ascension-drop-ready');
                    slot.classList.remove('ascension-drop-invalid');
                } else {
                    slot.classList.add('ascension-drop-invalid');
                    slot.classList.remove('ascension-drop-ready');
                }
                
                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.className = `ascension-drop-tooltip ${tooltipInfo.type}`;
                
                // Add long-text class if needed
                if (tooltipInfo.message.length > 30) {
                    tooltip.className += ' long-text';
                }
                
                tooltip.textContent = tooltipInfo.message;
                
                // Style the tooltip
                tooltip.style.cssText = `
                    position: absolute;
                    top: -40px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: bold;
                    white-space: nowrap;
                    z-index: 1000;
                    pointer-events: none;
                    animation: fadeIn 0.3s ease-out;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                `;
                
                slot.appendChild(tooltip);
                
                // Track current tooltip and slot
                currentTooltip = tooltip;
                currentTooltipSlot = slot;
            } else {
                // Tooltip already exists, just update the classes
                const tooltipInfo = window.ascendedManager.getAscensionDropTooltipInfo(position, cardName);
                
                if (tooltipInfo.canDrop) {
                    slot.classList.add('ascension-drop-ready');
                    slot.classList.remove('ascension-drop-invalid');
                } else {
                    slot.classList.add('ascension-drop-invalid');
                    slot.classList.remove('ascension-drop-ready');
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
        slot.classList.remove('spell-drop-ready', 'spell-drop-invalid');
        slot.classList.remove('equip-drop-ready', 'equip-drop-invalid');
        slot.classList.remove('global-spell-hover');
        slot.classList.remove('ascension-drop-ready', 'ascension-drop-invalid');

        slot.classList.remove('teleport-drop-ready', 'teleport-drop-invalid');

        
        // Remove tooltip if this is the current tooltip slot
        if (currentTooltipSlot === slot) {
            const tooltip = slot.querySelector('.ability-drop-tooltip, .spell-drop-tooltip, .equip-drop-tooltip, .teleport-drop-tooltip, .ascension-drop-tooltip');

            if (tooltip) {
                tooltip.remove();
            }
            currentTooltip = null;
            currentTooltipSlot = null;
        }
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
    slot.classList.remove('spell-drop-ready', 'spell-drop-invalid');
    slot.classList.remove('equip-drop-ready', 'equip-drop-invalid'); // NEW
    
    // Check if it's a card being dropped from hand
    if (window.heroSelection && window.handManager && window.handManager.isHandDragging()) {
        const dragState = window.handManager.getHandDragState();
        const cardName = dragState.draggedCardName;
    
        // Check for global spell (including Teleport)
        if (window.globalSpellManager && window.globalSpellManager.isGlobalSpell(cardName, window.heroSelection)) {
            const success = await window.globalSpellManager.handleGlobalSpellDropOnHero(targetSlot, window.heroSelection);
            return success;
        }
        
        // Check for ability card
        if (window.heroSelection.heroAbilitiesManager?.isAbilityCard(cardName)) {
            window.onTeamSlotAbilityDrop(event, targetSlot);
            return false;
        }
        
        // Check for spell card
        if (window.heroSelection.heroSpellbookManager?.isSpellCard(cardName)) {
            // Handle spell drop through heroSelection
            const success = await window.heroSelection.handleSpellDrop(targetSlot);
            return success;
        }
        
        // Check for equip artifact card
        if (window.heroSelection.heroEquipmentManager?.isEquipArtifactCard(cardName)) {
            // Handle equipment drop through heroSelection
            const success = await window.heroSelection.handleEquipArtifactDrop(targetSlot);
            return success;
        }
        // Check for hero-targeting artifacts (like SummoningCircle)
        if (window.artifactHandler) {
            const canHandle = await window.artifactHandler.canHandleHeroDrop(cardName);
            if (canHandle) {
                const success = await window.artifactHandler.handleArtifactHeroDrop(
                    cardName,
                    dragState.draggedCardIndex,
                    targetSlot,
                    window.heroSelection
                );
                return success;
            }
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
        
        // Set drag data
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/x-creature-drag', creatureDataJson);
        event.dataTransfer.setData('text/plain', creatureData.name);
        
        // Use the creature sprite directly as drag image
        let draggedElement = event.target.closest('.creature-icon');
        if (draggedElement) {
            const spriteImg = draggedElement.querySelector('.creature-sprite');
            if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
                // Use the full sprite image as drag image
                event.dataTransfer.setDragImage(spriteImg, 16, 16);
            }
        }
        
        // Rest of existing drag logic...
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
        
        // Update drag state
        creatureDragState = {
            isDragging: true,
            draggedCreature: creatureData,
            draggedFromHero: creatureData.heroPosition,
            draggedFromIndex: creatureData.index
        };
        
        draggedElement = event.target.closest('.creature-icon');
        if (draggedElement) {
            window._currentDraggedCreatureElement = draggedElement;
            
            // Apply visual changes after delay
            setTimeout(() => {
                if (creatureDragState.isDragging && window._currentDraggedCreatureElement) {
                    // Simple visual feedback - no frame manipulation
                    window._currentDraggedCreatureElement.classList.add('creature-dragging-delayed');
                }
            }, 1);
        }
        
        return true;
        
    } catch (error) {
        console.error('[CREATURE DRAG] Error in creature drag start:', error);
        event.preventDefault();
        return false;
    }
}

function createMiddleFrameDragImageSync(creatureName) {
    try {
        // Try to find an already-loaded creature sprite in the DOM to use as source
        const existingSpriteElements = document.querySelectorAll(`.creature-sprite[src*="${creatureName}.png"]`);
        
        for (let spriteElement of existingSpriteElements) {
            if (spriteElement.complete && spriteElement.naturalWidth > 0) {
                // Found a loaded sprite, use it to create middle frame
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size
                canvas.width = 32;
                canvas.height = 32;
                
                // Calculate frame dimensions (3 frames total)
                const frameWidth = spriteElement.naturalWidth / 3;
                const frameHeight = spriteElement.naturalHeight;
                
                // Draw only the middle frame (index 1)
                ctx.drawImage(
                    spriteElement,
                    frameWidth, 0, frameWidth, frameHeight,  // Source: middle frame
                    0, 0, canvas.width, canvas.height        // Destination: full canvas
                );
                return canvas;
            }
        }
        
        // If no existing sprite found, try creating a new image synchronously
        // This will only work if the image is already in browser cache
        const testImg = new Image();
        testImg.src = `./Creatures/${creatureName}.png`;
        
        // Check if image loaded immediately (from cache)
        if (testImg.complete && testImg.naturalWidth > 0) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 32;
            canvas.height = 32;
            
            const frameWidth = testImg.naturalWidth / 3;
            const frameHeight = testImg.naturalHeight;
            
            ctx.drawImage(
                testImg,
                frameWidth, 0, frameWidth, frameHeight,
                0, 0, canvas.width, canvas.height
            );
            return canvas;
        }
        return null;
        
    } catch (error) {
        console.error('[CREATURE DRAG] Error creating sync middle frame:', error);
        return null;
    }
}

// Creature drag end handler
function onCreatureDragEnd(event) {
    // Clean up the delayed styling immediately
    if (window._currentDraggedCreatureElement) {
        const element = window._currentDraggedCreatureElement;
        element.classList.remove('creature-dragging-delayed');
        
        window._currentDraggedCreatureElement = null;
    }
    
    // Clean up drag state through manager
    if (window.heroSelection && window.heroSelection.heroCreatureManager) {
        window.heroSelection.heroCreatureManager.endCreatureDrag();
    }
    
    // Reset global state
    creatureDragState = {
        isDragging: false,
        draggedCreature: null,
        draggedFromHero: null,
        draggedFromIndex: null
    };
    
    // Clean up any remaining visual feedback
    const allDraggingElements = document.querySelectorAll('.creature-dragging-delayed');
    allDraggingElements.forEach(el => {
        el.classList.remove('creature-dragging-delayed');
    });
    
    const creatureContainers = document.querySelectorAll('.hero-creatures');
    creatureContainers.forEach(container => {
        container.classList.remove('creature-drop-ready', 'creature-drop-invalid');
    });
}

// Creature container drag over handler
function onCreatureContainerDragOver(event, heroPosition) {
    // Add Chrome drag validation
    if (!event.dataTransfer.types.includes('application/x-creature-drag')) {
        return;
    }
        
    if (!creatureDragState.isDragging) {
        return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    const container = event.currentTarget;
    const isGuardChangeActive = window.globalSpellManager?.isGuardChangeModeActive() || false;
    const isSameHero = heroPosition === creatureDragState.draggedFromHero;
    
    if (isSameHero || isGuardChangeActive) {
        container.classList.add('creature-drop-ready');
        container.classList.remove('creature-drop-invalid');
        event.dataTransfer.dropEffect = 'move';
        
        if (window.heroSelection && window.heroSelection.heroCreatureManager) {
            const dropIndex = window.heroSelection.heroCreatureManager.getCreatureDropIndex(
                heroPosition, 
                event.clientX, 
                container
            );
            window.heroSelection.heroCreatureManager.showDropIndicator(heroPosition, dropIndex);
        }
    } else {
        container.classList.add('creature-drop-invalid');
        container.classList.remove('creature-drop-ready');
        event.dataTransfer.dropEffect = 'none';
        
        if (window.heroSelection && window.heroSelection.heroCreatureManager) {
            window.heroSelection.heroCreatureManager.clearDropIndicators();
        }
    }
}

// Creature container drag leave handler
function onCreatureContainerDragLeave(event) {
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    
    const x = event.clientX;
    const y = event.clientY;
    const margin = 5;
    
    if (x < rect.left - margin || x > rect.right + margin || 
        y < rect.top - margin || y > rect.bottom + margin) {
        
        container.classList.remove('creature-drop-ready', 'creature-drop-invalid');
        
        if (window.heroSelection && window.heroSelection.heroCreatureManager) {
            window.heroSelection.heroCreatureManager.clearDropIndicators();
        }
    }
}

// Creature container drop handler
async function onCreatureContainerDrop(event, heroPosition) {    
    // Chrome validation - check for proper drag data
    const dragData = event.dataTransfer.getData('application/x-creature-drag');
    if (!dragData) {
        console.error('[CREATURE DRAG] Chrome drop validation failed: No drag data');
        return false;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    const container = event.currentTarget;
    container.classList.remove('creature-drop-ready', 'creature-drop-invalid');
    
    if (!creatureDragState.isDragging) {
        return false;
    }
    
    const isGuardChangeActive = window.globalSpellManager?.isGuardChangeModeActive() || false;
    const isSameHero = heroPosition === creatureDragState.draggedFromHero;
    
    if (!isSameHero && !isGuardChangeActive) {
        return false;
    }
    
    if (!isSameHero && window.heroSelection?.heroCreatureManager) {
        const hasTargetHero = window.heroSelection.heroCreatureManager.hasHeroAtPosition(heroPosition);
        if (!hasTargetHero) {
            return false;
        }
    }
    
    if (window.heroSelection && window.heroSelection.heroCreatureManager) {
        const success = window.heroSelection.heroCreatureManager.handleCreatureDrop(
            heroPosition,
            event.clientX,
            container
        );
                
        if (success) {
            if (window.heroSelection.updateBattleFormationUI) {
                window.heroSelection.updateBattleFormationUI();
            }
            
            try {
                await window.heroSelection.saveGameState();
                await window.heroSelection.sendFormationUpdate();
            } catch (error) {
                console.error('[CREATURE DRAG] Failed to save/update:', error);
            }
        }
        
        return success;
    }
    
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

// Enhanced hover handlers for hero slots with tooltip persistence - HERO ONLY
window.handleHeroHoverEnter = function(position, element) {
    if (!window.heroSelection) return;
    
    // Don't show any tooltips during drag operations
    if (window.heroSelection.formationManager?.isDragging()) {
        return;
    }
    
    // Get hero data
    const hero = window.heroSelection.formationManager.getBattleFormation()[position];
    if (hero) {
        // Get hero stats
        const heroStats = window.heroSelection.heroSelectionUI.getHeroStats(position);
        
        // Create enhanced card data with stats
        const cardData = {
            imagePath: hero.image,
            displayName: hero.name,
            cardType: 'character',
            heroStats: heroStats,
            heroPosition: position
        };
        
        window.showCardTooltip(JSON.stringify(cardData), element);
    }
    
    // Use the new hover persistence method
    if (window.heroSelection.heroSelectionUI) {
        window.heroSelection.heroSelectionUI.handleHeroHoverEnter(position, element);
    }
};

window.handleHeroHoverLeave = function() {
    // Hide card tooltip immediately
    window.hideCardTooltip();
    
    // Use the new hover persistence method for spellbook tooltip
    if (window.heroSelection?.heroSelectionUI) {
        window.heroSelection.heroSelectionUI.handleHeroHoverLeave();
    }
};

// Global ability click handler
async function onAbilityClick(heroPosition, zoneNumber, abilityName, stackCount) {
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
                // Handle error
            }
            break;
            
        case 'Navigation':
            // Dynamically import the Navigation module
            try {
                const { navigationAbility } = await import('./Abilities/navigation.js');
                await navigationAbility.handleClick(heroPosition, stackCount);
            } catch (error) {
                // Handle error
            }
            break;
            
        case 'Premonition':
            // Dynamically import the Premonition module
            try {
                const { premonitionAbility } = await import('./Abilities/premonition.js');
                await premonitionAbility.handleClick(heroPosition, stackCount, window.heroSelection);
            } catch (error) {
                // Handle error
            }
            break;

        case 'Occultism':
            // Handle Occultism ability
            try {
                if (window.occultismAbility) {
                    await window.occultismAbility.handleClick(heroPosition, stackCount);
                }
            } catch (error) {
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
            
        default:
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

// Nicolas click handler
function handleNicolasClick(event, heroPosition, heroName) {
    // Prevent drag from starting if this is a click
    event.stopPropagation();
    
    // Only handle if this is actually Nicolas and we have the effect manager
    if (heroName !== 'Nicolas' || !window.heroSelection?.nicolasEffectManager) {
        return;
    }
        
    // Show Nicolas dialog
    window.heroSelection.nicolasEffectManager.showNicolasDialog(window.heroSelection, heroPosition);
}

// Kazena click handler
function handleKazenaClick(event, heroPosition, heroName) {
    event.stopPropagation();
    
    // Only handle if this is actually Kazena and we have the effect manager
    if (heroName !== 'Kazena' || !window.heroSelection?.kazenaEffectManager) {
        return;
    }
    
    // Show Kazena dialog
    window.heroSelection.kazenaEffectManager.showKazenaDialog(window.heroSelection, heroPosition);
}

// Riffel click handler
function handleRiffelClick(event, heroPosition, heroName) {
    event.stopPropagation();
    
    // Only handle if this is actually Riffel and we have the effect manager
    if (heroName !== 'Riffel' || !window.heroSelection?.riffelEffectManager) {
        return;
    }
    
    // Show Riffel dialog
    window.heroSelection.riffelEffectManager.showRiffelDialog(window.heroSelection, heroPosition);
}

function handleVacarnClick(event, heroPosition, heroName) {
    event.stopPropagation();
    
    if (heroName !== 'Vacarn' || !window.heroSelection?.vacarnEffectManager) {
        return;
    }
    
    // Start bury mode
    window.heroSelection.vacarnEffectManager.startBuryMode(heroPosition, window.heroSelection);
}

function handleWaflavClick(event, heroPosition, heroName) {
    event.stopPropagation();
    
    if (!heroName.includes('Waflav') || !window.heroSelection?.waflavEffectManager) {
        return;
    }
    
    // Use the main Waflav handler that determines evolution vs descension
    window.heroSelection.waflavEffectManager.handleWaflavHeroClick(window.heroSelection, heroPosition);
}

// Attach to window
if (typeof window !== 'undefined') {
    window.onTeamSlotDragOver = onTeamSlotDragOver;
    window.onTeamSlotDragEnter = onTeamSlotDragEnter;
    window.onTeamSlotDragLeave = onTeamSlotDragLeave;
    window.onTeamSlotDrop = onTeamSlotDrop;
    window.cleanupAllAbilityTooltips = cleanupAllAbilityTooltips;
    window.onAbilityClick = onAbilityClick;
    window.handleNicolasClick = handleNicolasClick;
    window.handleVacarnClick = handleVacarnClick;
    window.handleWaflavClick = handleWaflavClick;
    window.handleKazenaClick = handleKazenaClick;
    window.handleRiffelClick = handleRiffelClick;
    
    // Creature drag and drop functions
    window.onCreatureDragStart = onCreatureDragStart;
    window.onCreatureDragEnd = onCreatureDragEnd;
    window.onCreatureContainerDragOver = onCreatureContainerDragOver;
    window.onCreatureContainerDragLeave = onCreatureContainerDragLeave;
    window.onCreatureContainerDrop = onCreatureContainerDrop;
    
    // Hero stats update functions
    window.updateHeroStats = function(slotPosition) {
        if (window.heroSelection && window.heroSelection.heroSelectionUI) {
            window.heroSelection.heroSelectionUI.updateHeroStats(slotPosition);
        }
    };
    
    window.updateAllHeroStats = function() {
        if (window.heroSelection && window.heroSelection.heroSelectionUI) {
            window.heroSelection.heroSelectionUI.updateAllHeroStats();
        }
    };
}

// Global function to toggle hero spell enabled state
window.toggleHeroSpell = function(heroPosition, spellIndex) {
    if (!window.heroSelection || !window.heroSelection.heroSpellbookManager) {
        return;
    }
    
    // Toggle the spell
    const newState = window.heroSelection.heroSpellbookManager.toggleSpellEnabled(heroPosition, spellIndex);
    
    if (newState !== false && newState !== true) {
        return;
    }
    
    // Refresh the tooltip to show the updated state
    if (window.heroSelection.heroSelectionUI && window.heroSelection.heroSelectionUI.refreshCurrentTooltip) {
        window.heroSelection.heroSelectionUI.refreshCurrentTooltip();
    }
    
    // Save game state to persist the change
    if (window.heroSelection.saveGameState) {
        window.heroSelection.saveGameState();
    }
    
    // Add visual feedback
    const spellEntry = document.querySelector(`[data-spell-index="${spellIndex}"]`);
    if (spellEntry) {
        // Add a brief highlight effect
        spellEntry.classList.add('spell-toggled');
        setTimeout(() => {
            spellEntry.classList.remove('spell-toggled');
        }, 300);
    }
};

// ===== CSS STYLES FOR PERMANENT ARTIFACTS =====
if (typeof document !== 'undefined' && !document.getElementById('permanentArtifactsStyles')) {
    const style = document.createElement('style');
    style.id = 'permanentArtifactsStyles';
    style.textContent = `
        /* Permanent Artifacts Indicator */
        
        .permanent-artifacts-indicator:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(111, 66, 193, 0.5);
        }
        
        .permanent-artifacts-indicator.empty {
            opacity: 0.5;
            background: linear-gradient(135deg, #495057 0%, #343a40 100%);
        }
        
        .artifact-scroll-icon {
            font-size: 24px;
            filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.5));
        }
        
        .artifact-count {
            font-size: 18px;
            font-weight: bold;
            color: white;
            min-width: 20px;
            text-align: center;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        /* New artifact pulse animation */
        .permanent-artifacts-indicator.new-artifact-pulse {
            animation: artifactPulse 0.6s ease-out;
        }
        
        @keyframes artifactPulse {
            0% {
                transform: scale(1);
                box-shadow: 0 4px 15px rgba(111, 66, 193, 0.3);
            }
            50% {
                transform: scale(1.2);
                box-shadow: 0 6px 30px rgba(111, 66, 193, 0.8);
            }
            100% {
                transform: scale(1);
                box-shadow: 0 4px 15px rgba(111, 66, 193, 0.3);
            }
        }
        
        /* Permanent Artifacts Tooltip */
        .permanent-artifacts-tooltip {
            position: fixed;
            background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
            border: 2px solid rgba(111, 66, 193, 0.5);
            border-radius: 12px;
            padding: 16px;
            min-width: 250px;
            max-width: 350px;
            z-index: 10000;
            opacity: 0;
            transform: translateY(5px);
            transition: all 0.2s ease;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.8);
            pointer-events: none;
        }
        
        .permanent-artifacts-tooltip.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        .permanent-artifacts-tooltip.below {
            transform: translateY(-5px);
        }
        
        .permanent-artifacts-tooltip.below.visible {
            transform: translateY(0);
        }
        
        .permanent-artifacts-tooltip.empty .tooltip-content {
            color: #868e96;
            font-style: italic;
            text-align: center;
            padding: 10px 0;
        }
        
        .tooltip-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(111, 66, 193, 0.3);
        }
        
        .tooltip-icon {
            font-size: 20px;
        }
        
        .tooltip-title {
            font-size: 16px;
            font-weight: bold;
            color: #fff;
        }
        
        .tooltip-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .permanent-artifact-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            border-left: 3px solid #6f42c1;
            transition: all 0.2s ease;
        }
        
        .permanent-artifact-item:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(2px);
        }
        
        .artifact-icon {
            font-size: 18px;
        }
        
        .artifact-name {
            flex: 1;
            color: #fff;
            font-weight: 500;
        }
        
        .artifact-count-badge {
            color: #ffd700;
            font-weight: bold;
            font-size: 14px;
        }
        
        .tooltip-summary {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(111, 66, 193, 0.3);
            text-align: center;
            color: #adb5bd;
            font-size: 13px;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .permanent-artifacts-indicator {
                top: 10px;
                right: 10px;
                padding: 8px 12px;
            }
            
            .artifact-scroll-icon {
                font-size: 20px;
            }
            
            .artifact-count {
                font-size: 16px;
            }
        }

        .permanent-artifacts-indicator {
            position: fixed;
            top: 88%;
            right: 14.5%;
            background: linear-gradient(135deg, #6f42c1 0%, #495057 100%);
            border-radius: 0.5rem; /* Changed from 50px to match gold/potions displays */
            padding: 6px 12px; /* Adjusted padding to match gold/potions displays */
            display: flex;
            align-items: center;
            gap: 6px; /* Reduced gap to match other displays */
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 
                0 6px 20px rgba(111, 66, 193, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.3); /* Added inset shadow like gold display */
            border: 2px solid #8e24aa; /* More vibrant border like other displays */
            z-index: 100;
            min-width: 85px; /* Added min-width like potion display */
            min-height: 35px; /* Added min-height to match other displays */
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
        }

        .permanent-artifacts-indicator:hover {
            transform: translateY(-1px) scale(1.02); /* Changed to match gold/potions hover effect */
            box-shadow: 
                0 8px 25px rgba(111, 66, 193, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.4); /* Enhanced hover shadow like gold display */
            border-color: #7b1fa2; /* Hover border color change like other displays */
        }

        .permanent-artifacts-indicator.empty {
            opacity: 0.7; /* Reduced opacity to match potion depleted state */
            background: linear-gradient(135deg, #757575 0%, #424242 100%);
            border-color: #9e9e9e;
        }

        .artifact-scroll-icon {
            font-size: 20px; /* Reduced from 24px to better match proportions */
            filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3)); /* Added consistent drop shadow */
            animation: artifactIconFloat 3s ease-in-out infinite; /* Added floating animation like gold icon */
        }

        .artifact-count {
            font-size: 18px;
            font-weight: 900; /* Increased font weight to match gold/potion numbers */
            color: #ffffff;
            min-width: 20px;
            text-align: center;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 10px rgba(111, 66, 193, 0.6); /* Enhanced text shadow like gold/potion displays */
            letter-spacing: 1px; /* Added letter spacing for consistency */
        }

        /* New floating animation for the artifact icon */
        @keyframes artifactIconFloat {
            0%, 100% {
                transform: translateY(0px);
            }
            50% {
                transform: translateY(-2px);
            }
        }

        /* Enhanced new artifact pulse animation */
        .permanent-artifacts-indicator.new-artifact-pulse {
            animation: newArtifactPulse 1s ease-out;
        }

        @keyframes newArtifactPulse {
            0% {
                transform: scale(1);
                box-shadow: 
                    0 6px 20px rgba(111, 66, 193, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
            }
            50% {
                transform: scale(1.1);
                box-shadow: 
                    0 8px 30px rgba(111, 66, 193, 0.8),
                    inset 0 1px 0 rgba(255, 255, 255, 0.5);
            }
            100% {
                transform: scale(1);
                box-shadow: 
                    0 6px 20px rgba(111, 66, 193, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
            }
        }

        /* Responsive adjustments - matching other displays */
        @media (max-width: 768px) {
            .permanent-artifacts-indicator {
                top: 10px;
                right: 10px;
                padding: 5px 10px;
                min-width: 70px;
                min-height: 28px;
            }
            
            .artifact-scroll-icon {
                font-size: 16px;
            }
            
            .artifact-count {
                font-size: 14px;
                letter-spacing: 0.5px;
            }
        }

        @media (max-width: 480px) {
            .permanent-artifacts-indicator {
                padding: 4px 8px;
                min-width: 60px;
                min-height: 26px;
                gap: 4px;
            }
            
            .artifact-scroll-icon {
                font-size: 14px;
            }
            
            .artifact-count {
                font-size: 12px;
                letter-spacing: 0.3px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Add CSS styles for hero stats display
if (typeof document !== 'undefined' && !document.getElementById('heroStatsStyles')) {
    const style = document.createElement('style');
    style.id = 'heroStatsStyles';
    style.textContent = `
        /* Hero Stats Overlay Container */
        .hero-stats-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            pointer-events: none;
            z-index: 10;
            opacity: 0; /* Hide until font loads */
            transition: opacity 0.3s ease;
        }

        /* Show hero stats once font is loaded */
        .fonts-loaded .hero-stats-overlay {
            opacity: 1;
        }

        /* Ensure character image container is positioned relative for stats overlay */
        .character-image-container {
            position: relative;
        }

        /* Individual Hero Stat Elements */
        .hero-stat {
            position: absolute;
            bottom: 2px;
            min-width: 24px;
            text-align: center;
        }

        /* HP Stat - Bottom Left of the IMAGE */
        .hero-stat[data-stat="hp"] {
            left: 35px; 
        }

        /* Attack Stat - Bottom Right of the IMAGE */
        .hero-stat[data-stat="attack"] {
            right: 25px; 
        }

        /* Stat Value Text - Enhanced for proper font loading */
        .hero-stat .stat-value {
            font-family: 'Pixel Intv', monospace, sans-serif;
            font-size: 15px;
            font-weight: bold;
            color: white;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9); /* Strong shadow for readability */
            line-height: 1;
            display: block;
            /* Ensure font loads properly */
            font-display: swap;
        }

        /* Fallback for when fonts don't load */
        .hero-stat .stat-value {
            font-variant-numeric: tabular-nums; /* Ensures consistent number spacing */
        }

        /* Show stats immediately if no font loading detection */
        .no-font-loading .hero-stats-overlay {
            opacity: 1;
        }

        /* Hover Effects */
        .character-card:hover .hero-stat .stat-value {
            transform: scale(1.1);
            transition: transform 0.2s ease;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .hero-stat {
                bottom: 1px;
                min-width: 20px;
            }
            
            .hero-stat[data-stat="hp"] {
                left: 2px;
            }
            
            .hero-stat[data-stat="attack"] {
                right: 2px;
            }
            
            .hero-stat .stat-value {
                font-size: 10px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Add clickable ability and creature drag styles
if (typeof document !== 'undefined' && !document.getElementById('equipmentTooltipStyles')) {
    const style = document.createElement('style');
    style.id = 'equipmentTooltipStyles';
    style.textContent = `
        /* Enhanced Hero Tooltip Styles */
        .enhanced-hero-tooltip {
            min-width: 320px;
            max-width: 400px;
        }
        
        .tooltip-separator {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            margin: 12px 0;
        }
        
        .tooltip-section {
            margin-bottom: 8px;
        }
        
        .section-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        .section-icon {
            font-size: 14px;
        }
        
        .section-title {
            font-size: 13px;
        }
        
        .spellbook-section .section-header {
            color: #4dabf7;
        }
        
        .arsenal-section .section-header {
            color: #4dabf7;
        }
        
        .equipment-section .section-header {
            color: #ffc107;
        }
        
        .equipment-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .equipment-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 8px;
            background: rgba(255, 193, 7, 0.1);
            border-radius: 4px;
            border-left: 3px solid #ffc107;
        }
        
        .equipment-name {
            font-size: 12px;
            color: #fff;
            font-weight: 500;
        }
        
        .equipment-cost {
            font-size: 11px;
            color: #ffc107;
            font-weight: bold;
        }
        
        /* Equipment entries in the unified scrollable list */
        .equipment-entry {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            margin: 4px 0;
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.2);
            border-radius: 6px;
            border-left: 3px solid #ffc107;
            transition: all 0.2s ease;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
        }
        
        .equipment-entry:hover {
            background: rgba(255, 193, 7, 0.15);
            border-color: rgba(255, 193, 7, 0.3);
            transform: translateX(2px);
        }
        
        .equipment-entry .equipment-name {
            font-size: 14px;
            color: #fff;
            font-weight: 600;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            letter-spacing: 0.5px;
        }
        
        .equipment-entry .equipment-cost {
            font-size: 12px;
            padding: 2px 8px;
            background: rgba(255, 193, 7, 0.3);
            border-radius: 12px;
            color: #ffc107;
            font-weight: bold;
            white-space: nowrap;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            letter-spacing: 0.5px;
        }
        
        .arsenal-summary {
            margin-top: 8px;
            text-align: center;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            padding-top: 6px;
        }
        
        /* Equipment Drop States */
        .team-slot.equip-drop-ready {
            background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 202, 44, 0.2) 100%);
            border-color: #ffc107;
            box-shadow: 0 0 15px rgba(255, 193, 7, 0.3);
        }
        
        .team-slot.equip-drop-invalid {
            background: linear-gradient(135deg, rgba(244, 67, 54, 0.2) 0%, rgba(229, 57, 53, 0.2) 100%);
            border-color: #f44336;
            box-shadow: 0 0 15px rgba(244, 67, 54, 0.3);
        }
        
        .equip-drop-tooltip {
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        .equip-drop-tooltip.can-equip {
            background: linear-gradient(135deg, #ffc107 0%, #ffca2c 100%);
            color: #212529;
            border-color: rgba(255, 255, 255, 0.5);
        }
        
        .equip-drop-tooltip.cannot-equip {
            background: linear-gradient(135deg, #dc3545 0%, #e63946 100%);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
        }
        
        .equip-drop-tooltip.long-text {
            max-width: 250px;
            white-space: normal;
            text-align: center;
            line-height: 1.3;
        }
        
        /* Hand Card Equipment Styling */
        .hand-card.equip-artifact-card {
            border: 2px solid #ffc107;
            box-shadow: 0 0 10px rgba(255, 193, 7, 0.3);
            position: relative;
        }
        
        .hand-card.equip-artifact-card:hover {
            border-color: #ffca2c;
            box-shadow: 0 0 15px rgba(255, 193, 7, 0.5);
            transform: translateY(-2px);
        }
        
        .hand-card.equip-artifact-card::before {
            content: "⚔️";
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 12px;
            background: rgba(255, 193, 7, 0.9);
            color: #212529;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            z-index: 10;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .spell-drop-tooltip.cannot-learn {
            background: linear-gradient(135deg, #dc3545 0%, #e63946 100%);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
        }

        .spell-drop-tooltip.semi-gold-learn {
            background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
            color: white;
            border-color: rgba(255, 255, 255, 0.4);
            box-shadow: 0 0 15px rgba(74, 144, 226, 0.4);
        }

        /* Locked tooltip mode styles */
        .formation-spellbook-tooltip.enhanced-hero-tooltip {
            user-select: none; /* Prevent text selection when hovering */
        }

        .tooltip-padlock {
            animation: padlockGlow 2s ease-in-out infinite;
        }

        @keyframes padlockGlow {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1.0; }
        }

        /* Ensure tooltips are interactive in locked mode */
        .formation-spellbook-tooltip {
            pointer-events: none !important; 
        }

        .formation-spellbook-tooltip:not(.locked-mode) {
            pointer-events: none;
        }
        /* Responsive adjustments - matching other displays */
        @media (max-width: 768px) {
            .permanent-artifacts-indicator {
                top: 10px;
                right: 10px;
                padding: 5px 10px;
                min-width: 70px;
                min-height: 28px;
            }
            
            .artifact-scroll-icon {
                font-size: 16px;
            }
            
            .artifact-count {
                font-size: 14px;
                letter-spacing: 0.5px;
            }
        }

        @media (max-width: 480px) {
            .permanent-artifacts-indicator {
                padding: 4px 8px;
                min-width: 60px;
                min-height: 26px;
                gap: 4px;
            }
            
            .artifact-scroll-icon {
                font-size: 14px;
            }
            
            .artifact-count {
                font-size: 12px;
                letter-spacing: 0.3px;
            }
        }

        /* Character Selection Tags Integration */
        .character-card .card-tags-container {
            margin-top: 6px;
            margin-bottom: 8px;
            padding: 0 8px;
            max-width: 100%;
        }

        .character-card.character-selectable .card-tags-container {
            opacity: 0.9;
            transition: opacity 0.3s ease;
        }

        .character-card.character-selectable:hover .card-tags-container {
            opacity: 1;
        }

        .character-card.character-selected .card-tags-container {
            opacity: 1;
        }

        .character-card.character-selected .card-tag {
            animation: selectedCharacterTagGlow 1.5s ease-in-out infinite alternate;
        }

        @keyframes selectedCharacterTagGlow {
            from {
                box-shadow: 
                    0 2px 4px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
            }
            to {
                box-shadow: 
                    0 4px 12px rgba(255, 255, 255, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4);
            }
        }

        /* Character selection grid adjustments to accommodate tags */
        .character-selection-grid .character-card {
            min-height: 240px; /* Increased to accommodate tags */
        }

        /* Teleport Drop Ready State */
        .team-slot.teleport-drop-ready {
            background: linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(63, 81, 181, 0.2) 100%);
            border-color: #9c27b0;
            box-shadow: 0 0 15px rgba(156, 39, 176, 0.4);
            animation: teleportDropPulse 1s ease-in-out infinite;
        }

        @keyframes teleportDropPulse {
            0%, 100% { 
                box-shadow: 0 0 15px rgba(156, 39, 176, 0.4);
            }
            50% { 
                box-shadow: 0 0 25px rgba(156, 39, 176, 0.7);
            }
        }


        /* Teleport Drop States */
        .team-slot.teleport-drop-ready {
            background: linear-gradient(135deg, rgba(63, 81, 181, 0.2) 0%, rgba(156, 39, 176, 0.2) 100%);
            border-color: #3f51b5;
            box-shadow: 0 0 15px rgba(63, 81, 181, 0.4);
            animation: teleportDropPulse 1s ease-in-out infinite;
        }
        
        .team-slot.teleport-drop-invalid {
            background: linear-gradient(135deg, rgba(244, 67, 54, 0.2) 0%, rgba(229, 57, 53, 0.2) 100%);
            border-color: #f44336;
            box-shadow: 0 0 15px rgba(244, 67, 54, 0.3);
        }
        
        @keyframes teleportDropPulse {
            0%, 100% { 
                box-shadow: 0 0 15px rgba(63, 81, 181, 0.4);
            }
            50% { 
                box-shadow: 0 0 25px rgba(63, 81, 181, 0.7);
            }
        }
        
        .teleport-drop-tooltip {
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        .teleport-drop-tooltip.can-teleport {
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
            color: white;
            border-color: rgba(255, 255, 255, 0.5);
        }
        
        .teleport-drop-tooltip.cannot-teleport {
            background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
        }
        
        .teleport-drop-tooltip.long-text {
            max-width: 250px;
            white-space: normal;
            text-align: center;
            line-height: 1.3;
        }

        .spell-drop-tooltip.darkdeal-gold-learn {
            background: linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%);
            color: white;
            border-color: rgba(255, 255, 255, 0.4);
            box-shadow: 0 0 15px rgba(106, 27, 154, 0.4);
        }

        /* Locked spellbook styles */
        .spell-entry.spell-locked {
            cursor: not-allowed !important;
            opacity: 0.8;
        }

        .spell-entry.spell-locked:hover {
            background: rgba(255, 255, 255, 0.05) !important;
            transform: none !important;
        }

        .spellbook-tooltip-title {
            transition: color 0.3s ease;
        }

        .spell-toggle-hint {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            font-style: italic;
            margin-top: 4px;
        }

        /* Ensure tooltips don't interfere with hero hover detection */
        .formation-spellbook-tooltip {
            pointer-events: none; /* Default: don't block mouse events */
        }

        .formation-spellbook-tooltip.locked-mode {
            pointer-events: auto !important; /* In locked mode: allow interaction */
        }


        /* Waflav-specific styles */
        .character-image-container.waflav-clickable {
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .character-image-container.waflav-clickable:hover {
            transform: scale(1.05);
            filter: brightness(1.1);
            box-shadow: 0 0 15px rgba(142, 36, 170, 0.4);
        }

        .evolution-counter-display {
            position: absolute;
            bottom: 2px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #8e24aa 0%, #5e35b1 100%);
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            box-shadow: 0 2px 6px rgba(142, 36, 170, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.3);
            z-index: 15;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            animation: evolutionCounterFloat 3s ease-in-out infinite;
        }

        .evolution-counter-display:hover {
            transform: translateX(-50%) scale(1.1);
            box-shadow: 0 4px 12px rgba(142, 36, 170, 0.6);
        }

        @keyframes evolutionCounterFloat {
            0%, 100% { 
                box-shadow: 0 2px 6px rgba(142, 36, 170, 0.4);
            }
            50% { 
                box-shadow: 0 4px 10px rgba(142, 36, 170, 0.6);
            }
        }

        /* Ensure evolution counters appear above hero stats */
        .hero-stats-overlay {
            z-index: 10;
        }

        /* Kazena clickable hero styling */
        .kazena-clickable {
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .kazena-clickable:hover {
            transform: scale(1.05);
            filter: brightness(1.2) drop-shadow(0 0 10px rgba(59, 130, 246, 0.6));
        }

        .kazena-effect-usable {
            animation: kazenaGlow 2s ease-in-out infinite;
        }

        @keyframes kazenaGlow {
            0%, 100% {
                filter: brightness(1) drop-shadow(0 0 5px rgba(59, 130, 246, 0.4));
            }
            50% {
                filter: brightness(1.3) drop-shadow(0 0 15px rgba(59, 130, 246, 0.8));
            }
        }

        .kazena-hero-image {
            cursor: pointer;
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

// Global discard pile drag and drop handlers
function onDiscardPileDragEnter(event) {
    // Only handle hand card drags
    if (window.handManager && window.handManager.isHandDragging()) {
        event.preventDefault();
        event.stopPropagation();
        
        const discardSlot = event.currentTarget;
        discardSlot.classList.add('discard-drop-ready');
        discardSlot.classList.remove('discard-drop-invalid');
        
        return false;
    }
}

function onDiscardPileDragOver(event) {
    // Only handle hand card drags
    if (window.handManager && window.handManager.isHandDragging()) {
        event.preventDefault();
        event.stopPropagation();
        
        event.dataTransfer.dropEffect = 'move';
        
        return false;
    }
}

function onDiscardPileDragLeave(event) {
    const discardSlot = event.currentTarget;
    const rect = discardSlot.getBoundingClientRect();
    
    const x = event.clientX;
    const y = event.clientY;
    const margin = 10;
    
    // Only remove classes if we're actually leaving the discard pile area
    if (x < rect.left - margin || x > rect.right + margin || 
        y < rect.top - margin || y > rect.bottom + margin) {
        
        discardSlot.classList.remove('discard-drop-ready', 'discard-drop-invalid');
    }
}

async function onDiscardPileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const discardSlot = event.currentTarget;
    
    // Clean up visual states
    discardSlot.classList.remove('discard-drop-ready', 'discard-drop-invalid');
    
    // Check if it's a card being dropped from hand
    if (window.handManager && window.handManager.isHandDragging()) {
        const dragState = window.handManager.getHandDragState();
        const cardIndex = dragState.draggedCardIndex;
        const cardName = dragState.draggedCardName;
        
        // Use the existing disenchant functionality
        if (window.handManager) {
            const cardElement = dragState.draggedElement;
            const success = await window.handManager.disenchantCard(cardIndex, cardName, cardElement);
            
            if (success) {
                // End the drag operation
                window.handManager.endHandCardDrag();
                
                // Show brief success feedback on the discard pile
                const feedback = document.createElement('div');
                feedback.className = 'discard-success-feedback';
                feedback.innerHTML = `
                    <div class="discard-success-content">
                        <span class="discard-success-icon">💰</span>
                        <span class="discard-success-text">+2 Gold</span>
                    </div>
                `;
                
                feedback.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: bold;
                    z-index: 10001;
                    pointer-events: none;
                    animation: discardSuccessFeedback 2s ease-out;
                    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.5);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                `;
                
                discardSlot.appendChild(feedback);
                
                setTimeout(() => {
                    feedback.remove();
                }, 2000);
            } else {
                // Handle failure case
                window.handManager.endHandCardDrag();
            }
            
            return success;
        }
    }
    
    return false;
}

function onDiscardPileHoverEnter(discardPileElement) {
    if (window.showGraveyardTooltip) {
        window.showGraveyardTooltip(discardPileElement);
    }
}

function onDiscardPileHoverLeave() {
    if (window.hideGraveyardTooltip) {
        window.hideGraveyardTooltip();
    }
}

window.preparedDragImage = null;

// Prepare middle frame on mousedown
window.onCreatureMouseDown = function(event, creatureDataJson) {
    // Only prepare for left mouse button
    if (event.button !== 0) return;
    
    try {
        const creatureData = JSON.parse(creatureDataJson.replace(/&quot;/g, '"'));
        
        // Find the sprite image in the clicked element
        const spriteImg = event.currentTarget.querySelector('.creature-sprite');
        if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
            // Create middle frame immediately from the already-loaded sprite
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 32;
            canvas.height = 32;
            
            const frameWidth = spriteImg.naturalWidth / 3;
            const frameHeight = spriteImg.naturalHeight;
            
            ctx.drawImage(
                spriteImg,
                frameWidth, 0, frameWidth, frameHeight,  // Source: middle frame
                0, 0, canvas.width, canvas.height        // Destination: full canvas
            );
            
            // Store as prepared drag image on window object
            window.preparedDragImage = canvas;
        }
    } catch (error) {
        console.error('[CREATURE DRAG] Error preparing drag image:', error);
    }
};

// Export the global functions
if (typeof window !== 'undefined') {
    window.onDiscardPileDragEnter = onDiscardPileDragEnter;
    window.onDiscardPileDragOver = onDiscardPileDragOver;
    window.onDiscardPileDragLeave = onDiscardPileDragLeave;
    window.onDiscardPileDrop = onDiscardPileDrop;
    window.onDiscardPileHoverEnter = onDiscardPileHoverEnter;
    window.onDiscardPileHoverLeave = onDiscardPileHoverLeave;
    window.DarkDealSpell = DarkDealSpell;
}

export default HeroSelectionUI;