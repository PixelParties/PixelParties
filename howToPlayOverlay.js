// howToPlayOverlay.js - In-game How to Play overlay for formation screen

import { generateHowToPlayContent } from './howToPlayScreen.js';

class HowToPlayOverlay {
    constructor() {
        this.isVisible = false;
        this.overlayElement = null;
        this.escapeHandler = null;
    }

    show() {
        if (this.isVisible) return;

        // Create overlay container
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'formationHowToPlayOverlay';
        this.overlayElement.className = 'formation-how-to-play-overlay';

        // Generate content using existing function
        const content = generateHowToPlayContent();
        
        // Replace "Back to Main Menu" button with "Back" button
        const modifiedContent = content.replace(
            'id="backFromHowToPlayBtn" class="anchored-back-button">← Back to Main Menu',
            'id="backFromFormationHowToPlayBtn" class="anchored-back-button">← Back'
        );

        this.overlayElement.innerHTML = modifiedContent;

        // Add to document
        document.body.appendChild(this.overlayElement);

        // Set up event listeners
        this.setupEventListeners();

        // Mark as visible
        this.isVisible = true;

        // Animate in
        requestAnimationFrame(() => {
            this.overlayElement.classList.add('visible');
        });
    }

    hide() {
        if (!this.isVisible || !this.overlayElement) return;

        // Animate out
        this.overlayElement.classList.remove('visible');

        // Remove after animation
        setTimeout(() => {
            if (this.overlayElement) {
                this.overlayElement.remove();
                this.overlayElement = null;
            }
        }, 300);

        // Clean up event listeners
        this.cleanupEventListeners();

        // Mark as hidden
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    setupEventListeners() {
        // Back button
        const backButton = document.getElementById('backFromFormationHowToPlayBtn');
        if (backButton) {
            backButton.addEventListener('click', () => this.hide());
        }

        // Escape key handler
        this.escapeHandler = (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                event.preventDefault();
                event.stopPropagation();
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escapeHandler, true);

        // Card image tooltips
        this.setupCardImageTooltips();
    }

    cleanupEventListeners() {
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler, true);
            this.escapeHandler = null;
        }
    }

    setupCardImageTooltips() {
        const cardImages = this.overlayElement?.querySelectorAll('.guide-section-image[src*="/Cards/"]');
        
        cardImages?.forEach(img => {
            img.addEventListener('mouseenter', (e) => this.showCardImageTooltip(e.target));
            img.addEventListener('mouseleave', () => this.hideCardImageTooltip());
        });
    }

    showCardImageTooltip(imgElement) {
        this.hideCardImageTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.id = 'formationHowToPlayCardTooltip';
        tooltip.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10002;
            pointer-events: none;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #00ffff;
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            max-width: 350px;
            text-align: center;
        `;
        
        const largeImg = document.createElement('img');
        largeImg.src = imgElement.src;
        largeImg.alt = imgElement.alt;
        largeImg.style.cssText = `
            max-width: 320px;
            max-height: 400px;
            object-fit: contain;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            border-radius: 8px;
        `;
        
        const title = document.createElement('div');
        title.textContent = imgElement.alt.replace(' example', '');
        title.style.cssText = `
            color: #00ffff;
            font-size: 16px;
            font-weight: bold;
            margin-top: 10px;
            text-shadow: 0 0 5px #00ffff;
        `;
        
        tooltip.appendChild(largeImg);
        tooltip.appendChild(title);
        document.body.appendChild(tooltip);
    }

    hideCardImageTooltip() {
        const existingTooltip = document.getElementById('formationHowToPlayCardTooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    }
}

// Export singleton instance
export const howToPlayOverlay = new HowToPlayOverlay();

// Expose to window for button onclick
if (typeof window !== 'undefined') {
    window.toggleFormationHowToPlay = () => howToPlayOverlay.toggle();
}