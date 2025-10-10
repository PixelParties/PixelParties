// menuBackground.js - Animated Card Background for Main Menu

import { getAllCardsExceptTokens } from './cardDatabase.js';

class MenuBackgroundAnimator {
    constructor() {
        this.cards = [];
        this.animationFrame = null;
        this.isRunning = false;
        this.container = null;
        this.availableCards = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 2000; // Spawn new card every 2 seconds
        this.initialDelayComplete = false;
        this.initialDelay = 2000; // Delay before first spawn (2 seconds)
        
        // Configuration
        this.config = {
            cardScale: 0.5, // 50% of normal size
            cardWidth: 150, // Base card width at 100%
            cardHeight: 210, // Base card height at 100% (3:4.2 ratio)
            fallSpeed: 30, // pixels per second
            horizontalSpacing: 20, // pixels between cards horizontally
            verticalSpacing: 20, // pixels between cards vertically
            rowCapacity: 0, // calculated based on screen width
        };
        
        // Calculate scaled dimensions
        this.config.scaledWidth = this.config.cardWidth * this.config.cardScale;
        this.config.scaledHeight = this.config.cardHeight * this.config.cardScale;
    }
    
    /**
     * Initialize the background animator
     */
    init() {
        // Load available cards from database
        this.availableCards = getAllCardsExceptTokens().filter(card => {
            // Filter out any cards without images or that shouldn't be shown
            return card.image && !card.unobtainable;
        });
        
        if (this.availableCards.length === 0) {
            console.warn('No cards available for menu background animation');
            return false;
        }
        
        // Create container for animated cards
        this.createContainer();
        
        // Calculate how many cards fit per row
        this.calculateRowCapacity();
        
        // Add window resize listener
        window.addEventListener('resize', () => this.calculateRowCapacity());
        
        return true;
    }
    
    /**
     * Create the container for animated cards
     */
    createContainer() {
        // Remove existing container if any
        const existing = document.getElementById('menuBackgroundCards');
        if (existing) {
            existing.remove();
        }
        
        // Create new container
        this.container = document.createElement('div');
        this.container.id = 'menuBackgroundCards';
        this.container.className = 'menu-background-cards';
        
        // Add styles
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
            z-index: 0;
        `;
        
        // Insert AFTER the main container, not at the beginning
        const mainContainer = document.querySelector('.container');
        if (mainContainer && mainContainer.nextSibling) {
            document.body.insertBefore(this.container, mainContainer.nextSibling);
        } else {
            document.body.appendChild(this.container);
        }
    }

    
    /**
     * Calculate how many cards fit per row
     */
    calculateRowCapacity() {
        const screenWidth = window.innerWidth;
        const cardTotalWidth = this.config.scaledWidth + this.config.horizontalSpacing;
        this.config.rowCapacity = Math.floor(screenWidth / cardTotalWidth);
        
        // Ensure at least 1 card per row
        if (this.config.rowCapacity < 1) {
            this.config.rowCapacity = 1;
        }
    }
    
    /**
     * Create a new card element
     */
    createCard() {
        // This method is now deprecated, use createCardInColumn instead
        console.warn('createCard() is deprecated, use spawnRow() instead');
    }
    
    /**
     * Update card positions
     */
    update(deltaTime) {
        const screenHeight = window.innerHeight;
        const moveDistance = (this.config.fallSpeed * deltaTime) / 1000;
        
        // Update existing cards
        for (let i = this.cards.length - 1; i >= 0; i--) {
            const card = this.cards[i];
            card.y += moveDistance;
            card.element.style.top = `${card.y}px`;
            
            // Remove cards that are fully off screen
            if (card.y > screenHeight) {
                card.element.remove();
                this.cards.splice(i, 1);
            }
        }
    }
    
    /**
     * Check if we should spawn a new row of cards
     */
    shouldSpawnRow(currentTime) {
        // Check if initial delay has passed
        if (!this.initialDelayComplete) {
            if (currentTime - this.animationStartTime >= this.initialDelay) {
                this.initialDelayComplete = true;
                this.lastSpawnTime = currentTime; // Reset spawn timer after delay
            } else {
                return false;
            }
        }
        
        // Check if enough time has passed since last spawn
        if (currentTime - this.lastSpawnTime < this.spawnInterval) {
            return false;
        }
        
        // If no cards exist, spawn a row
        if (this.cards.length === 0) {
            return true;
        }
        
        // Find the most recently spawned card (highest index, should have lowest Y)
        const recentCards = this.cards.slice(-this.config.rowCapacity);
        if (recentCards.length === 0) {
            return true;
        }
        
        // Check if the most recent row is fully visible (past the top with spacing)
        const youngestCard = recentCards.reduce((youngest, card) => 
            card.y < youngest.y ? card : youngest
        );
        
        const isFullyVisible = youngestCard.y >= this.config.verticalSpacing;
        
        return isFullyVisible;
    }
    
    /**
     * Spawn a full row of cards
     */
    spawnRow() {
        // Create an array of available columns
        const columns = Array.from({ length: this.config.rowCapacity }, (_, i) => i);
        
        // Shuffle columns for randomness
        for (let i = columns.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [columns[i], columns[j]] = [columns[j], columns[i]];
        }
        
        // Spawn cards in each column
        for (const column of columns) {
            this.createCardInColumn(column);
        }
    }
    
    /**
     * Create a card in a specific column
     */
    createCardInColumn(column) {
        // Get random card from database
        const randomCard = this.availableCards[
            Math.floor(Math.random() * this.availableCards.length)
        ];
        
        const cardTotalWidth = this.config.scaledWidth + this.config.horizontalSpacing;
        const startX = column * cardTotalWidth + this.config.horizontalSpacing / 2;
        
        // Create card element
        const cardElement = document.createElement('div');
        cardElement.className = 'menu-bg-card';
        cardElement.style.cssText = `
            position: absolute;
            width: ${this.config.scaledWidth}px;
            height: ${this.config.scaledHeight}px;
            left: ${startX}px;
            top: -${this.config.scaledHeight}px;
            background-image: url('${randomCard.image}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            opacity: 0.7;
            transition: opacity 0.3s ease;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
        `;
        
        this.container.appendChild(cardElement);
        
        // Create card data object
        const cardData = {
            element: cardElement,
            x: startX,
            y: -this.config.scaledHeight,
            column: column,
            name: randomCard.name
        };
        
        this.cards.push(cardData);
        
        return cardData;
    }
    
    /**
     * Main animation loop
     */
    animate(currentTime) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        if (this.lastUpdateTime === undefined) {
            this.lastUpdateTime = currentTime;
        }
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        // Update card positions
        this.update(deltaTime);
        
        // Spawn new row if needed
        if (this.shouldSpawnRow(currentTime)) {
            this.spawnRow();
            this.lastSpawnTime = currentTime;
        }
        
        // Continue animation
        this.animationFrame = requestAnimationFrame((time) => this.animate(time));
    }
    
    /**
     * Start the animation
     */
    start() {
        if (this.isRunning) return;
        
        // Only start if we're on the main menu
        const gameScreen = document.getElementById('gameScreen');
        const container = document.querySelector('.container');
        
        if (gameScreen && !gameScreen.classList.contains('hidden')) {
            // Game is running, don't start menu background
            return;
        }
        
        if (!container || container.classList.contains('hidden')) {
            // Menu is not visible
            return;
        }
    
        this.isRunning = true;
        this.lastUpdateTime = undefined;
        this.lastSpawnTime = 0;
        this.initialDelayComplete = false;
        this.animationStartTime = performance.now();

        if (this.container) {
            this.container.style.display = 'block';
        }
        
        // Spawn initial rows to fill the screen
        const screenHeight = window.innerHeight;
        const rowHeight = this.config.scaledHeight + this.config.verticalSpacing;
        const initialRows = Math.ceil(screenHeight / rowHeight) + 1;
        
        for (let i = 0; i < initialRows; i++) {
            this.spawnRow();
            // Offset each row vertically for initial display with proper spacing
            const rowCards = this.cards.slice(-this.config.rowCapacity);
            rowCards.forEach(card => {
                card.y = -this.config.scaledHeight + (i * rowHeight);
                card.element.style.top = `${card.y}px`;
            });
        }
        
        // Start animation loop
        this.animationFrame = requestAnimationFrame((time) => this.animate(time));
        
        console.log('✨ Menu background animation started');
    }
    
    /**
     * Stop the animation
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.initialDelayComplete = false;
        this.animationStartTime = 0;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Clear all cards
        this.cards.forEach(card => {
            if (card.element && card.element.parentNode) {
                card.element.remove();
            }
        });
        this.cards = [];
        
        // HIDE THE CONTAINER when stopping
        if (this.container) {
            this.container.style.display = 'none';
        }
        
        console.log('⏹️ Menu background animation stopped');
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.stop();
        
        if (this.container && this.container.parentNode) {
            this.container.remove();
        }
        
        this.container = null;
        this.cards = [];
        this.availableCards = [];
        
        window.removeEventListener('resize', () => this.calculateRowCapacity());
    }
}

// Create singleton instance
let backgroundAnimator = null;

/**
 * Initialize and start the menu background animation
 */
export function startMenuBackground() {
    if (!backgroundAnimator) {
        backgroundAnimator = new MenuBackgroundAnimator();
        const success = backgroundAnimator.init();
        if (!success) {
            console.warn('Failed to initialize menu background animator');
            return;
        }
    }
    
    backgroundAnimator.start();
}

/**
 * Stop the menu background animation
 */
export function stopMenuBackground() {
    if (backgroundAnimator) {
        backgroundAnimator.stop();
    }
}

/**
 * Restart the menu background animation
 */
export function restartMenuBackground() {
    stopMenuBackground();
    
    // Small delay to ensure clean restart
    setTimeout(() => {
        startMenuBackground();
    }, 100);
}

/**
 * Destroy the menu background animator
 */
export function destroyMenuBackground() {
    if (backgroundAnimator) {
        backgroundAnimator.destroy();
        backgroundAnimator = null;
    }
}