// heroSelectionUI.js - Hero Selection UI Generation Module with Enhanced Tooltip Management, Creature Drag & Drop, Nicolas Effect, Hero Stats Display, Permanent Artifacts, and Tooltip Hover Persistence

export class HeroSelectionUI {
    constructor() {
        console.log('HeroSelectionUI initialized');
        
        // Add tooltip hover persistence tracking
        this.tooltipHideTimeout = null;
        this.currentTooltipPosition = null;
        this.isTooltipHovered = false;
        this.isHeroHovered = false;
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

    // ===== TOOLTIP HOVER PERSISTENCE METHODS =====

    // New method to schedule tooltip hiding with delay
    scheduleTooltipHide() {
        // Only hide if neither hero nor tooltip is hovered
        if (!this.isHeroHovered && !this.isTooltipHovered) {
            this.tooltipHideTimeout = setTimeout(() => {
                this.hideHeroSpellbookTooltip();
            }, 100); // Small delay to prevent flickering
        }
    }

    // Method to handle hero hover leave (called from global handler)
    handleHeroHoverLeave() {
        this.isHeroHovered = false;
        this.scheduleTooltipHide();
    }

    // Method to handle hero hover enter (called from global handler) 
    handleHeroHoverEnter(position, element) {
        this.isHeroHovered = true;
        this.showHeroSpellbookTooltip(position, element);
    }


    // Updated showHeroSpellbookTooltip method with hover persistence
    showHeroSpellbookTooltip(position, heroElement) {
        // Prevent tooltips during any drag operation
        if (window.heroSelection?.formationManager?.isDragging()) {
            console.log('🚫 Tooltip blocked - hero drag in progress');
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
        
        // Remove any existing tooltip
        this.hideHeroSpellbookTooltip();
        
        // Create enhanced tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'formation-spellbook-tooltip enhanced-hero-tooltip';
        tooltip.id = 'formationSpellbookTooltip';
        
        let tooltipHTML = `
            <div class="spellbook-tooltip-container">
                <h4 class="spellbook-tooltip-title">📋 ${hero.name}'s Arsenal</h4>
        `;
        
        // Add spellbook section if spells exist
        if (spellbook && spellbook.length > 0) {
            // Sort spells by school first, then by name
            const sortedSpells = [...spellbook].sort((a, b) => {
                const schoolCompare = (a.spellSchool || 'Unknown').localeCompare(b.spellSchool || 'Unknown');
                if (schoolCompare !== 0) return schoolCompare;
                return a.name.localeCompare(b.name);
            });
            
            tooltipHTML += `
                <div class="tooltip-section spellbook-section">
                    <div class="section-header">
                        <span class="section-icon">📜</span>
                        <span class="section-title">Spellbook (${sortedSpells.length})</span>
                    </div>
                    <div class="spellbook-list">
            `;
            
            let currentSchool = null;
            let spellIndexInOriginal = 0; // Track original index for click handling
            
            sortedSpells.forEach((spell, sortedIndex) => {
                // Find the original index of this spell in the unsorted spellbook
                spellIndexInOriginal = spellbook.findIndex((originalSpell, idx) => {
                    // Find the first occurrence of this spell that hasn't been used yet
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
                const isEnabled = spell.enabled !== false; // Default to true for backward compatibility
                
                // NEW: Add click handler and disabled styling
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
            
            tooltipHTML += `
                    </div>
                </div>
            `;
        }
        
        // Add separator and equipment section if equipment exists
        if (equipment && equipment.length > 0) {
            // Add separator if there are spells above
            if (spellbook && spellbook.length > 0) {
                tooltipHTML += '<div class="tooltip-separator"></div>';
            }
            
            tooltipHTML += `
                <div class="tooltip-section equipment-section">
                    <div class="section-header">
                        <span class="section-icon">⚔️</span>
                        <span class="section-title">Equipment (${equipment.length})</span>
                    </div>
                    <div class="equipment-list">
            `;
            
            // Equipment is already sorted alphabetically by getHeroEquipment()
            equipment.forEach((artifact, index) => {
                const artifactName = artifact.name || artifact.cardName || 'Unknown Artifact';
                const artifactCost = artifact.cost || 0;
                const formattedName = this.formatCardName(artifactName);
                
                tooltipHTML += `
                    <div class="equipment-item" data-equipment-index="${index}">
                        <span class="equipment-name">${formattedName}</span>
                        ${artifactCost > 0 ? `<span class="equipment-cost">💰${artifactCost}</span>` : ''}
                    </div>
                `;
            });
            
            tooltipHTML += `
                    </div>
                </div>
            `;
        }
        
        // Add summary line
        const totalItems = (spellbook?.length || 0) + (equipment?.length || 0);
        const enabledSpells = spellbook ? spellbook.filter(spell => spell.enabled !== false).length : 0;
        const disabledSpells = spellbook ? spellbook.length - enabledSpells : 0;
        
        // Enhanced summary with enabled/disabled count
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
        
        tooltip.innerHTML = tooltipHTML;
        
        // Add hover event listeners to the tooltip itself
        tooltip.addEventListener('mouseenter', () => {
            this.isTooltipHovered = true;
            // Clear any pending hide timeout
            if (this.tooltipHideTimeout) {
                clearTimeout(this.tooltipHideTimeout);
                this.tooltipHideTimeout = null;
            }
        });
        
        tooltip.addEventListener('mouseleave', () => {
            this.isTooltipHovered = false;
            this.scheduleTooltipHide();
        });
        
        // Add wheel event listener to the tooltip for direct scrolling
        tooltip.addEventListener('wheel', (event) => {
            this.handleTooltipScroll(event, tooltip);
        });
        
        document.body.appendChild(tooltip);
        
        // Update tracking state
        this.currentTooltipPosition = position;
        this.isHeroHovered = true;
        this.isTooltipHovered = false;
        
        // Position tooltip to the left of the hero card
        this.positionSpellbookTooltip(tooltip, heroElement);
        
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
        const scrollAmount = event.deltaY * 1.0;
        
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
        `;
        
        // Add spellbook section if spells exist
        if (spellbook && spellbook.length > 0) {
            // Sort spells by school first, then by name
            const sortedSpells = [...spellbook].sort((a, b) => {
                const schoolCompare = (a.spellSchool || 'Unknown').localeCompare(b.spellSchool || 'Unknown');
                if (schoolCompare !== 0) return schoolCompare;
                return a.name.localeCompare(b.name);
            });
            
            tooltipHTML += `
                <div class="tooltip-section spellbook-section">
                    <div class="section-header">
                        <span class="section-icon">📜</span>
                        <span class="section-title">Spellbook (${sortedSpells.length})</span>
                    </div>
                    <div class="spellbook-list">
            `;
            
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
            
            tooltipHTML += `
                    </div>
                </div>
            `;
        }
        
        // Add separator and equipment section if equipment exists
        if (equipment && equipment.length > 0) {
            // Add separator if there are spells above
            if (spellbook && spellbook.length > 0) {
                tooltipHTML += '<div class="tooltip-separator"></div>';
            }
            
            tooltipHTML += `
                <div class="tooltip-section equipment-section">
                    <div class="section-header">
                        <span class="section-icon">⚔️</span>
                        <span class="section-title">Equipment (${equipment.length})</span>
                    </div>
                    <div class="equipment-list">
            `;
            
            equipment.forEach((artifact, index) => {
                const artifactName = artifact.name || artifact.cardName || 'Unknown Artifact';
                const artifactCost = artifact.cost || 0;
                const formattedName = this.formatCardName(artifactName);
                
                tooltipHTML += `
                    <div class="equipment-item" data-equipment-index="${index}">
                        <span class="equipment-name">${formattedName}</span>
                        ${artifactCost > 0 ? `<span class="equipment-cost">💰${artifactCost}</span>` : ''}
                    </div>
                `;
            });
            
            tooltipHTML += `
                    </div>
                </div>
            `;
        }
        
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
            
            // Re-add event listeners for the updated tooltip
            existingTooltip.addEventListener('mouseenter', () => {
                this.isTooltipHovered = true;
                if (this.tooltipHideTimeout) {
                    clearTimeout(this.tooltipHideTimeout);
                    this.tooltipHideTimeout = null;
                }
            });
            
            existingTooltip.addEventListener('mouseleave', () => {
                this.isTooltipHovered = false;
                this.scheduleTooltipHide();
            });
            
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

    // Updated hideHeroSpellbookTooltip method
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
        
        // Reset tracking state
        this.currentTooltipPosition = null;
        this.isTooltipHovered = false;
        this.isHeroHovered = false;
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

    // Helper method to get hero stats for display
    getHeroStats(slotPosition) {
        if (!window.heroSelection || !slotPosition) return null;
        
        // NEW: Use the enhanced stat calculation that includes ability bonuses
        const effectiveStats = window.heroSelection.calculateEffectiveHeroStats(slotPosition);
        if (effectiveStats) {
            // Log the stat bonuses for debugging if there are any
            if (effectiveStats.bonuses.hpBonus > 0 || effectiveStats.bonuses.attackBonus > 0) {
                const formation = window.heroSelection.formationManager?.getBattleFormation();
                const hero = formation?.[slotPosition];
                if (hero) {
                    console.log(`📊 ${hero.name} effective stats: ${effectiveStats.maxHp} HP (+${effectiveStats.bonuses.hpBonus}), ${effectiveStats.attack} ATK (+${effectiveStats.bonuses.attackBonus})`);
                }
            }
            
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
        
        // DEBUG: Log hero data to help troubleshoot
        console.log(`Getting fallback stats for hero at ${slotPosition}:`, hero);
        
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
            
            console.log(`Hero stats found:`, stats);
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
                
                console.log(`Hero stats from database:`, stats);
                return stats;
            }
        }
        
        // Fallback - no stats available
        console.warn(`No stats available for hero at position ${slotPosition}:`, hero);
        return null;
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
        console.log('🔄 Updating all hero stats with ability bonuses...');
        
        ['left', 'center', 'right'].forEach(position => {
            this.updateHeroStats(position);
            
            // Log the updated stats for debugging
            const stats = this.getHeroStats(position);
            if (stats && stats.bonuses && (stats.bonuses.hpBonus > 0 || stats.bonuses.attackBonus > 0)) {
                const formation = window.heroSelection?.formationManager?.getBattleFormation();
                const hero = formation?.[position];
                if (hero) {
                    console.log(`✅ Updated ${hero.name} (${position}): ${stats.maxHp} HP, ${stats.attack} ATK`);
                }
            }
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

        // Hero click handler for formation heroes
        let heroClickEvents = '';
        if (isDraggable && slotPosition) {
            if (character.name === 'Nicolas') {
                heroClickEvents = `onclick="window.handleNicolasClick(event, '${slotPosition}', '${character.name}')"`;
            } else if (character.name === 'Vacarn') {
                heroClickEvents = `onclick="window.handleVacarnClick(event, '${slotPosition}', '${character.name}')"`;
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
        
        return `
            <div class="character-card ${selectableClass} ${selectedClass} ${draggableClass} ${includeAbilityZones ? 'with-ability-zones' : ''}" 
                data-character-id="${character.id}"
                data-slot-position="${slotPosition || ''}"
                data-character-name="${character.name}"
                ${isSelectable && !isDraggable ? `onclick="window.selectCharacterCard(${character.id})"` : ''}
                ${hoverEvents}>
                <div class="character-image-container ${character.name === 'Nicolas' && isDraggable ? 'nicolas-clickable' : ''} ${nicolasUsableClass}">
                    <img src="${character.image}" 
                        alt="${character.name}" 
                        class="character-image ${character.name === 'Nicolas' && isDraggable ? 'nicolas-hero-image' : ''}"
                        ${tooltipEvents}
                        ${dragEvents}
                        ${heroClickEvents}
                        onerror="this.src='./Cards/Characters/placeholder.png'">
                    ${heroStatsHTML}
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
            return '<div class="loading-heroes"><h2>⏱ No character selected</h2></div>';
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
                        <p class="drag-hint">💡 Drag and drop Heroes to rearrange your formation!</p>
                        <p class="drag-hint">🎯 Drag Abilities to a Hero slot to attach them!</p>
                        <p class="drag-hint">📜 Drag Spell to Heroes to add them to their Spellbook!</p>
                        <p class="drag-hint">⚔️ Drag Equip Artifacts to Heroes to equip them!</p> <!-- NEW -->
                        <p class="drag-hint">🐾 Drag and drop Creatures to reorder them within the same Hero!</p>
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
            
            // Update hero stats after UI refresh
            setTimeout(() => {
                this.updateAllHeroStats();
            }, 50); // Small delay to ensure DOM is updated
        }
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
    const allTooltips = document.querySelectorAll('.ability-drop-tooltip, .spell-drop-tooltip, .equip-drop-tooltip');
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
                console.log('🎯 Creating new centered tooltip for', position);
                
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
                
                console.log('🎯 Centered tooltip created:', {
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
            // Check if it's a global spell - if so, just prevent default and return
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
                } else if (learnCheck.isSemiGoldLearning) {
                    // Special case for Semi gold learning
                    slot.classList.add('spell-drop-ready');
                    slot.classList.remove('spell-drop-invalid');
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

        // NEW: Check if it's an equip artifact card
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
        slot.classList.remove('spell-drop-ready', 'spell-drop-invalid');
        slot.classList.remove('equip-drop-ready', 'equip-drop-invalid');
        slot.classList.remove('global-spell-hover');
        
        // Remove tooltip if this is the current tooltip slot
        if (currentTooltipSlot === slot) {
            const tooltip = slot.querySelector('.ability-drop-tooltip, .spell-drop-tooltip, .equip-drop-tooltip'); 
            if (tooltip) {
                console.log('🎯 Removing tooltip on drag leave');
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
        
        // NEW: Check for equip artifact card
        if (window.heroSelection.heroEquipmentManager?.isEquipArtifactCard(cardName)) {
            // Handle equipment drop through heroSelection
            const success = await window.heroSelection.handleEquipArtifactDrop(targetSlot);
            return success;
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
            console.log('🎯 Global dragend cleanup triggered');
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
        console.log('🎯 About to call handleCreatureDrop...');
        
        const success = window.heroSelection.heroCreatureManager.handleCreatureDrop(
            heroPosition,
            event.clientX,
            container
        );
        
        console.log('🎯 handleCreatureDrop returned:', success);
        
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

// Enhanced hover handlers for hero slots with tooltip persistence
window.handleHeroHoverEnter = function(position, element) {
    if (!window.heroSelection) return;
    
    // NEW: Don't show any tooltips during drag operations
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
            
        case 'Navigation':
            // Dynamically import the Navigation module
            try {
                const { navigationAbility } = await import('./Abilities/navigation.js');
                await navigationAbility.handleClick(heroPosition, stackCount);
            } catch (error) {
                console.error('Failed to load Navigation ability handler:', error);
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
function handleVacarnClick(event, heroPosition, heroName) {
    event.stopPropagation();
    
    if (heroName !== 'Vacarn' || !window.heroSelection?.vacarnEffectManager) {
        return;
    }
    
    console.log(`💀 Vacarn clicked at position ${heroPosition}`);
    
    // Start bury mode
    window.heroSelection.vacarnEffectManager.startBuryMode(heroPosition, window.heroSelection);
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
    console.log(`🎯 Toggling spell at ${heroPosition}[${spellIndex}]`);
    
    if (!window.heroSelection || !window.heroSelection.heroSpellbookManager) {
        console.error('❌ Hero selection or spellbook manager not available');
        return;
    }
    
    // Toggle the spell
    const newState = window.heroSelection.heroSpellbookManager.toggleSpellEnabled(heroPosition, spellIndex);
    
    if (newState !== false && newState !== true) {
        console.error('❌ Failed to toggle spell');
        return;
    }
    
    console.log(`✅ Spell toggled to: ${newState ? 'enabled' : 'disabled'}`);
    
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