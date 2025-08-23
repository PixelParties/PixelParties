// victoryScreen.js - Victory celebration screen
export class VictoryScreen {
    constructor() {
        this.heroSelection = null;
        this.isActive = false;
    }

    // Show victory screen for the winner
    showVictoryScreen(winnerData, heroSelection) {
        this.heroSelection = heroSelection;
        this.isActive = true;
        
        // Clear any existing victory screen
        this.hideVictoryScreen();
        
        // Create victory overlay
        const overlay = document.createElement('div');
        overlay.id = 'victoryOverlay';
        overlay.className = 'victory-overlay';
        overlay.innerHTML = this.createVictoryHTML(winnerData);
        
        // Add styles
        this.ensureVictoryStyles();
        
        // Prevent body scrolling
        document.body.classList.add('victory-overlay-active');
        
        // Add to body
        document.body.appendChild(overlay);
        
        // Add click handler to exit
        overlay.addEventListener('click', () => this.handleVictoryExit());
        
        // Start fireworks animation
        this.startFireworks();
        
        // Animate in
        overlay.style.animation = 'victoryFadeIn 1s ease-out';
    }

    createVictoryHTML(winnerData) {
        const { playerName, heroes, isLocalPlayer } = winnerData;
        
        return `
            <div class="victory-container">
                <!-- Fireworks container -->
                <div class="fireworks-container" id="fireworksContainer"></div>
                
                <!-- Main victory content -->
                <div class="victory-content">
                    <div class="victory-header">
                        <h1 class="victory-title">${playerName} is the Winner!</h1>
                        <div class="victory-subtitle">${isLocalPlayer ? 'Congratulations!' : 'Well played!'}</div>
                    </div>
                    
                    <div class="victory-heroes">
                        <div class="heroes-title">Champion Heroes</div>
                        <div class="heroes-display">
                            ${heroes.map((hero, index) => this.createHeroHTML(hero, index)).join('')}
                        </div>
                    </div>
                    
                    <div class="victory-footer">
                        <div class="victory-hint">Click anywhere to return to lobby</div>
                    </div>
                </div>
            </div>
        `;
    }

    createHeroHTML(hero, index) {
        if (!hero) return '<div class="hero-placeholder"></div>';
        
        return `
            <div class="victory-hero" style="animation-delay: ${index * 0.2}s">
                <div class="hero-frame">
                    <img src="${hero.image}" alt="${hero.name}" class="hero-image">
                    <div class="hero-name">${hero.name}</div>
                </div>
            </div>
        `;
    }

    startFireworks() {
        const container = document.getElementById('fireworksContainer');
        if (!container) return;
        
        // Create multiple firework bursts
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.createFirework(container);
            }, i * 300);
        }
        
        // Continue fireworks every 2 seconds
        this.fireworksInterval = setInterval(() => {
            if (this.isActive) {
                this.createFirework(container);
            }
        }, 2000);
    }

    createFirework(container) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        
        // Random position
        const x = Math.random() * 100;
        const y = Math.random() * 60 + 20; // Keep in upper 60% of screen
        
        firework.style.left = `${x}%`;
        firework.style.top = `${y}%`;
        
        // Random colors
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        firework.style.setProperty('--firework-color', color);
        
        container.appendChild(firework);
        
        // Remove after animation
        setTimeout(() => {
            if (firework.parentNode) {
                firework.parentNode.removeChild(firework);
            }
        }, 1500);
    }

    handleVictoryExit() {
        if (!this.heroSelection) return;
        
        // Send exit message to opponent
        if (this.heroSelection.gameDataSender) {
            this.heroSelection.gameDataSender('victory_exit', {
                message: 'Returning to lobby',
                timestamp: Date.now()
            });
        }
        
        // Handle the exit
        this.exitToLobby();
    }

    async exitToLobby() {
        // Hide victory screen
        this.hideVictoryScreen();
        
        // Reset both players to Not Ready state via room manager
        if (this.heroSelection && this.heroSelection.roomManager) {
            try {
                const roomRef = this.heroSelection.roomManager.getRoomRef();
                if (roomRef) {
                    // Reset ready states and clear game data (like surrender)
                    await roomRef.update({
                        hostGameReady: false,
                        guestGameReady: false,
                        gameStarted: false,
                        gameInProgress: false,
                        gameEndTime: Date.now(),
                        lastVictory: Date.now()
                    });
                    
                    // Clear game state
                    await Promise.all([
                        roomRef.child('gameState').remove(),
                        roomRef.child('game_data').remove()
                    ]);
                }
            } catch (error) {
                console.error('Error resetting room state:', error);
            }
        }
        
        // Transition back to room/lobby UI
        // This should trigger the same flow as after a surrender
        if (this.heroSelection.stateMachine) {
            this.heroSelection.stateMachine.transitionTo(this.heroSelection.stateMachine.states.INITIALIZING);
        }
        
        // Reset hero selection state
        this.heroSelection.reset();
        
        // Show room interface (this should already be handled by the existing system)
        // The room manager and UI manager should handle showing the lobby
    }

    hideVictoryScreen() {
        this.isActive = false;
        
        // Stop fireworks
        if (this.fireworksInterval) {
            clearInterval(this.fireworksInterval);
            this.fireworksInterval = null;
        }
        
        // Remove overlay
        const overlay = document.getElementById('victoryOverlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Re-enable body scrolling
        document.body.classList.remove('victory-overlay-active');
    }

    // Handle opponent victory exit
    handleOpponentVictoryExit() {
        this.exitToLobby();
    }

    ensureVictoryStyles() {
        if (document.getElementById('victoryStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'victoryStyles';
        style.textContent = `
            .victory-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                cursor: pointer;
                overflow: hidden;
            }
            
            body.victory-overlay-active {
                overflow: hidden !important;
            }
            
            .victory-container {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .fireworks-container {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 1;
            }
            
            .victory-content {
                position: relative;
                z-index: 2;
                text-align: center;
                color: white;
                max-width: 90%;
            }
            
            .victory-title {
                font-size: 4rem;
                font-weight: 900;
                margin: 0 0 20px 0;
                text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
                background: linear-gradient(45deg, #ffd700, #ffed4a);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: victoryTitlePulse 2s ease-in-out infinite;
            }
            
            .victory-subtitle {
                font-size: 1.5rem;
                margin-bottom: 40px;
                opacity: 0.9;
                animation: victorySubtitleFade 3s ease-out;
            }
            
            .heroes-title {
                font-size: 2rem;
                font-weight: 700;
                margin-bottom: 30px;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
            }
            
            .heroes-display {
                display: flex;
                justify-content: center;
                gap: 40px;
                margin-bottom: 40px;
                flex-wrap: wrap;
            }
            
            .victory-hero {
                animation: heroSlideUp 1s ease-out both;
            }
            
            .hero-frame {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
                border: 3px solid rgba(255, 215, 0, 0.6);
                border-radius: 20px;
                padding: 20px;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }
            
            .hero-frame:hover {
                transform: scale(1.05);
                border-color: rgba(255, 215, 0, 0.9);
                box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4);
            }
            
            .hero-image {
                width: 120px;
                height: 168px;
                object-fit: cover;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                margin-bottom: 15px;
            }
            
            .hero-name {
                font-size: 1.2rem;
                font-weight: 600;
                color: #ffd700;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
            }
            
            .hero-placeholder {
                width: 160px;
                height: 224px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px dashed rgba(255, 255, 255, 0.3);
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: rgba(255, 255, 255, 0.5);
                font-style: italic;
            }
            
            .victory-footer {
                font-size: 1.1rem;
                opacity: 0.8;
                animation: victoryHintBlink 2s ease-in-out infinite;
            }
            
            .victory-hint {
                background: rgba(0, 0, 0, 0.3);
                padding: 10px 20px;
                border-radius: 25px;
                backdrop-filter: blur(5px);
            }
            
            /* Firework animation */
            .firework {
                position: absolute;
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: var(--firework-color, #ffd700);
                animation: fireworkExplode 1.5s ease-out;
            }
            
            .firework::before,
            .firework::after {
                content: '';
                position: absolute;
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: inherit;
            }
            
            /* Animations */
            @keyframes victoryFadeIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes victoryTitlePulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            @keyframes victorySubtitleFade {
                0% { opacity: 0; transform: translateY(20px); }
                100% { opacity: 0.9; transform: translateY(0); }
            }
            
            @keyframes heroSlideUp {
                0% { opacity: 0; transform: translateY(50px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes victoryHintBlink {
                0%, 50%, 100% { opacity: 0.8; }
                25%, 75% { opacity: 0.4; }
            }
            
            @keyframes fireworkExplode {
                0% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(3);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(6);
                    opacity: 0;
                }
            }
            
            /* Responsive design */
            @media (max-width: 768px) {
                .victory-title {
                    font-size: 2.5rem;
                }
                
                .heroes-display {
                    gap: 20px;
                }
                
                .hero-image {
                    width: 80px;
                    height: 112px;
                }
                
                .hero-frame {
                    padding: 15px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Global function for victory exit handling
if (typeof window !== 'undefined') {
    window.handleVictoryExit = function() {
        if (window.heroSelection && window.heroSelection.victoryScreen) {
            window.heroSelection.victoryScreen.handleVictoryExit();
        }
    };
}

export default VictoryScreen;