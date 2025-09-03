// victoryScreen.js - Enhanced Victory celebration screen with proper winner detection
export class VictoryScreen {
    constructor() {
        this.heroSelection = null;
        this.isActive = false;
        this.hasShownVictory = false; // Prevent multiple victory screens
        this.fireworksInterval = null;
        this.confettiInterval = null;
        this.sparkleInterval = null;
        this.particleAnimations = [];
    }

    // Initialize victory screen with heroSelection reference
    init(heroSelection) {
        this.heroSelection = heroSelection;
        
        // Register for victory messages if we have gameDataSender
        if (heroSelection && heroSelection.gameDataSender) {
            // Register message handler for opponent victory
            if (heroSelection.webRTCManager) {
                heroSelection.webRTCManager.registerMessageHandler('victory_achieved', (data) => {
                    this.handleVictoryMessage(data);
                });
            }
        }
    }

    // Handle victory message from opponent
    handleVictoryMessage(data) {
        // Don't show victory screen if we already showed one
        if (this.hasShownVictory || this.isActive) {
            return;
        }

        const { winner, winnerName } = data.data;
        
        // Determine if the sender won (opponent from our perspective)
        let localWinner, winnerFormation;
        
        if (winner === 'player') {
            // Sender won - they are our opponent
            localWinner = 'opponent';
            winnerFormation = this.heroSelection.formationManager.getOpponentBattleFormation();
        } else {
            // Sender's opponent won - that's us
            localWinner = 'player';  
            winnerFormation = this.heroSelection.formationManager.getBattleFormation();
        }

        // Create winner data
        const winnerData = {
            playerName: winnerName,
            heroes: [winnerFormation.left, winnerFormation.center, winnerFormation.right].filter(h => h),
            isLocalPlayer: localWinner === 'player'
        };

        // Show victory screen
        this.showVictoryScreen(winnerData, this.heroSelection);
    }

    // Show victory screen when local player wins (called from battleManager)
    showLocalVictory(lifeChangeData) {
        // Don't show victory screen if we already showed one
        if (this.hasShownVictory || this.isActive) {
            return;
        }

        const winner = lifeChangeData.winner; // 'player' or 'opponent'
        
        // Get winner's formation data
        const winnerFormation = winner === 'player' ? 
            this.heroSelection.formationManager.getBattleFormation() : 
            this.heroSelection.formationManager.getOpponentBattleFormation();
        
        // Get winner's name
        let winnerName;
        if (winner === 'player') {
            winnerName = this.getCurrentUsername();
        } else {
            winnerName = this.getOpponentUsername();
        }
        
        const winnerData = {
            playerName: winnerName,
            heroes: [winnerFormation.left, winnerFormation.center, winnerFormation.right].filter(h => h),
            isLocalPlayer: winner === 'player'
        };

        // Save victory data to Firebase for reconnection support
        this.saveVictoryDataToFirebase({
            winner: winner === 'player' ? 'host' : 'guest', // Convert to absolute side
            winnerName: winnerName,
            trophies: lifeChangeData.trophies,
            timestamp: Date.now()
        });
        
        // Send victory message to opponent
        if (this.heroSelection.gameDataSender) {
            this.heroSelection.gameDataSender('victory_achieved', {
                winner: winner, // Send our local perspective
                winnerName: winnerName,
                trophies: lifeChangeData.trophies
            });
        }
        
        // Transition to victory state and show victory screen
        if (this.heroSelection.stateMachine) {
            this.heroSelection.stateMachine.transitionTo(this.heroSelection.stateMachine.states.VICTORY);
        }
        
        this.showVictoryScreen(winnerData, this.heroSelection);
    }

    // Get current player username
    getCurrentUsername() {
        if (this.heroSelection && this.heroSelection.uiManager) {
            return this.heroSelection.uiManager.getCurrentUsername();
        }
        return 'You';
    }

    // Get opponent username  
    getOpponentUsername() {
        if (this.heroSelection && this.heroSelection.roomManager) {
            const room = this.heroSelection.roomManager.getCurrentRoom();
            const isHost = this.heroSelection.roomManager.getIsHost();
            
            if (room) {
                return isHost ? (room.guestName || 'Opponent') : (room.hostName || 'Opponent');
            }
        }
        return 'Opponent';
    }

    // Save victory data to Firebase
    async saveVictoryDataToFirebase(victoryData) {
        if (!this.heroSelection || !this.heroSelection.roomManager) {
            return;
        }

        try {
            const roomRef = this.heroSelection.roomManager.getRoomRef();
            if (roomRef) {
                await roomRef.child('gameState').update({
                    gamePhase: 'Victory',
                    gamePhaseUpdated: Date.now(),
                    victoryData: victoryData
                });
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // Show victory screen for the winner
    showVictoryScreen(winnerData, heroSelection) {
        // Prevent multiple victory screens
        if (this.hasShownVictory || this.isActive) {
            return;
        }

        this.heroSelection = heroSelection;
        this.isActive = true;
        this.hasShownVictory = true;
        
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
        
        // Start all particle effects
        this.startParticleEffects();
        
        // Animate in
        overlay.style.animation = 'victoryFadeIn 1s ease-out';
    }

    createVictoryHTML(winnerData) {
        const { playerName, heroes, isLocalPlayer } = winnerData;
        
        // Customize message based on whether local player won
        const titleText = isLocalPlayer ? "Victory!" : `${playerName} Wins!`;
        const subtitleText = isLocalPlayer ? "Congratulations! You are victorious!" : "Well fought! Better luck next time!";
        
        return `
            <div class="victory-container">
                <!-- Particle effects containers -->
                <div class="fireworks-container" id="fireworksContainer"></div>
                <div class="confetti-container" id="confettiContainer"></div>
                <div class="sparkles-container" id="sparklesContainer"></div>
                <div class="celebration-burst" id="celebrationBurst"></div>
                
                <!-- Main victory content -->
                <div class="victory-content">
                    <div class="victory-header">
                        <h1 class="victory-title ${isLocalPlayer ? 'victory-player' : 'victory-opponent'}">${titleText}</h1>
                        <div class="victory-subtitle">${subtitleText}</div>
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

    startParticleEffects() {
        // Initial celebration burst
        setTimeout(() => this.createCelebrationBurst(), 500);
        
        // Start continuous fireworks
        this.startFireworks();
        
        // Start confetti rain
        this.startConfetti();
        
        // Start sparkles
        this.startSparkles();
        
        // Add some random celebration bursts
        this.scheduleRandomBursts();
    }

    startFireworks() {
        const container = document.getElementById('fireworksContainer');
        if (!container) return;
        
        // Create initial firework show
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                this.createAdvancedFirework(container);
            }, i * 200 + Math.random() * 300);
        }
        
        // Continue fireworks at varied intervals
        this.fireworksInterval = setInterval(() => {
            if (this.isActive) {
                // Random number of fireworks (1-3)
                const count = Math.floor(Math.random() * 3) + 1;
                for (let i = 0; i < count; i++) {
                    setTimeout(() => this.createAdvancedFirework(container), i * 400);
                }
            }
        }, 1500 + Math.random() * 1000);
    }

    createAdvancedFirework(container) {
        // Random position (avoid edges)
        const x = Math.random() * 80 + 10;
        const y = Math.random() * 50 + 15;
        
        // Random firework type
        const types = ['burst', 'ring', 'willow', 'chrysanthemum', 'peony'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Random colors
        const colorSets = [
            ['#ff6b6b', '#ffd93d', '#6bcf7f'],
            ['#4ecdc4', '#45b7d1', '#96ceb4'],
            ['#feca57', '#ff9ff3', '#54a0ff'],
            ['#ff6348', '#ff7675', '#fd79a8'],
            ['#00b894', '#00cec9', '#81ecec']
        ];
        const colors = colorSets[Math.floor(Math.random() * colorSets.length)];
        
        this.createFireworkExplosion(container, x, y, type, colors);
    }

    createFireworkExplosion(container, x, y, type, colors) {
        const particleCount = type === 'ring' ? 16 : (type === 'burst' ? 24 : 20);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = `firework-particle firework-${type}`;
            
            const angle = (2 * Math.PI * i) / particleCount + (Math.random() * 0.5 - 0.25);
            const velocity = 80 + Math.random() * 60;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.left = `${x}%`;
            particle.style.top = `${y}%`;
            particle.style.setProperty('--particle-color', color);
            particle.style.setProperty('--end-x', `${Math.cos(angle) * velocity}px`);
            particle.style.setProperty('--end-y', `${Math.sin(angle) * velocity}px`);
            particle.style.animationDelay = `${Math.random() * 0.1}s`;
            
            container.appendChild(particle);
            
            // Add trailing sparkles for some particles
            if (Math.random() < 0.3) {
                this.createTrailingSpark(container, x, y, angle, velocity, color);
            }
            
            // Remove after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 2500);
        }
    }

    createTrailingSpark(container, startX, startY, angle, velocity, color) {
        const trail = document.createElement('div');
        trail.className = 'firework-trail';
        trail.style.left = `${startX}%`;
        trail.style.top = `${startY}%`;
        trail.style.setProperty('--trail-color', color);
        trail.style.setProperty('--trail-x', `${Math.cos(angle) * velocity * 0.7}px`);
        trail.style.setProperty('--trail-y', `${Math.sin(angle) * velocity * 0.7}px`);
        
        container.appendChild(trail);
        
        setTimeout(() => {
            if (trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
        }, 1500);
    }

    startConfetti() {
        const container = document.getElementById('confettiContainer');
        if (!container) return;
        
        // Create initial confetti shower
        for (let i = 0; i < 50; i++) {
            setTimeout(() => this.createConfettiPiece(container), i * 50);
        }
        
        // Continue confetti
        this.confettiInterval = setInterval(() => {
            if (this.isActive) {
                const count = Math.floor(Math.random() * 8) + 3;
                for (let i = 0; i < count; i++) {
                    this.createConfettiPiece(container);
                }
            }
        }, 300);
    }

    createConfettiPiece(container) {
        const confetti = document.createElement('div');
        const shapes = ['square', 'rectangle', 'circle', 'diamond'];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        
        confetti.className = `confetti confetti-${shape}`;
        
        // Random starting position and properties
        const x = Math.random() * 100;
        const rotation = Math.random() * 360;
        const scale = 0.5 + Math.random() * 0.8;
        const duration = 3 + Math.random() * 2;
        const drift = (Math.random() - 0.5) * 200;
        
        // Random colors
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        confetti.style.left = `${x}%`;
        confetti.style.top = '-10px';
        confetti.style.setProperty('--confetti-color', color);
        confetti.style.setProperty('--rotation', `${rotation}deg`);
        confetti.style.setProperty('--scale', scale);
        confetti.style.setProperty('--duration', `${duration}s`);
        confetti.style.setProperty('--drift', `${drift}px`);
        
        container.appendChild(confetti);
        
        // Remove after animation
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, duration * 1000 + 500);
    }

    startSparkles() {
        const container = document.getElementById('sparklesContainer');
        if (!container) return;
        
        this.sparkleInterval = setInterval(() => {
            if (this.isActive) {
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => this.createSparkle(container), i * 100);
                }
            }
        }, 800);
    }

    createSparkle(container) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        
        // Random position
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = 4 + Math.random() * 8;
        const duration = 0.8 + Math.random() * 0.4;
        
        sparkle.style.left = `${x}%`;
        sparkle.style.top = `${y}%`;
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.animationDuration = `${duration}s`;
        
        container.appendChild(sparkle);
        
        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.parentNode.removeChild(sparkle);
            }
        }, duration * 1000);
    }

    createCelebrationBurst() {
        const container = document.getElementById('celebrationBurst');
        if (!container) return;
        
        // Create a big central celebration burst
        for (let i = 0; i < 60; i++) {
            const particle = document.createElement('div');
            particle.className = 'celebration-particle';
            
            const angle = (2 * Math.PI * i) / 60;
            const velocity = 100 + Math.random() * 150;
            const colors = ['#ffd700', '#ffed4a', '#ffd93d', '#ff6b6b', '#4ecdc4'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.setProperty('--burst-color', color);
            particle.style.setProperty('--burst-x', `${Math.cos(angle) * velocity}px`);
            particle.style.setProperty('--burst-y', `${Math.sin(angle) * velocity}px`);
            particle.style.animationDelay = `${Math.random() * 0.2}s`;
            
            container.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 3000);
        }
    }

    scheduleRandomBursts() {
        if (!this.isActive) return;
        
        // Schedule next random burst
        const delay = 3000 + Math.random() * 4000;
        setTimeout(() => {
            if (this.isActive) {
                this.createCelebrationBurst();
                this.scheduleRandomBursts(); // Schedule next one
            }
        }, delay);
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
        if (this.heroSelection.stateMachine) {
            this.heroSelection.stateMachine.transitionTo(this.heroSelection.stateMachine.states.INITIALIZING);
        }
        
        // Reset hero selection state
        this.heroSelection.reset();
    }

    hideVictoryScreen() {
        this.isActive = false;
        
        // Stop all intervals
        if (this.fireworksInterval) {
            clearInterval(this.fireworksInterval);
            this.fireworksInterval = null;
        }
        
        if (this.confettiInterval) {
            clearInterval(this.confettiInterval);
            this.confettiInterval = null;
        }
        
        if (this.sparkleInterval) {
            clearInterval(this.sparkleInterval);
            this.sparkleInterval = null;
        }
        
        // Cancel any ongoing animations
        this.particleAnimations.forEach(animation => {
            if (animation.cancel) animation.cancel();
        });
        this.particleAnimations = [];
        
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

    // Reset victory screen state (called when starting new game)
    reset() {
        this.hideVictoryScreen();
        this.hasShownVictory = false;
        this.isActive = false;
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
                background: radial-gradient(ellipse at center, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.95) 100%);
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
            
            /* Particle Effect Containers */
            .fireworks-container,
            .confetti-container,
            .sparkles-container,
            .celebration-burst {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 1;
            }
            
            .celebration-burst {
                z-index: 3;
            }
            
            .victory-content {
                position: relative;
                z-index: 4;
                text-align: center;
                color: white;
                max-width: 90%;
            }
            
            .victory-title {
                font-size: 4rem;
                font-weight: 900;
                margin: 0 0 20px 0;
                text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
                background-size: 200% 200%;
                animation: victoryTitleShimmer 3s ease-in-out infinite;
            }
            
            .victory-title.victory-player {
                background: linear-gradient(45deg, #ffd700, #ffed4a, #ffd93d);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .victory-title.victory-opponent {
                background: linear-gradient(45deg, #ff6b6b, #ff8a80, #ffab91);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .victory-subtitle {
                font-size: 1.5rem;
                margin-bottom: 40px;
                opacity: 0.9;
                animation: victorySubtitleFade 3s ease-out;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
            }
            
            .heroes-title {
                font-size: 2rem;
                font-weight: 700;
                margin-bottom: 30px;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
                animation: heroesGlow 2s ease-in-out infinite;
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
                position: relative;
                overflow: hidden;
            }
            
            .hero-frame::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                animation: heroFrameShine 3s ease-in-out infinite;
                pointer-events: none;
            }
            
            .hero-frame:hover {
                transform: scale(1.05);
                border-color: rgba(255, 215, 0, 0.9);
                box-shadow: 0 15px 40px rgba(255, 215, 0, 0.4), 0 0 30px rgba(255, 255, 255, 0.2);
            }
            
            .hero-image {
                width: 120px;
                height: 168px;
                object-fit: cover;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                margin-bottom: 15px;
                position: relative;
                z-index: 2;
            }
            
            .hero-name {
                font-size: 1.2rem;
                font-weight: 600;
                color: #ffd700;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
                position: relative;
                z-index: 2;
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
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            /* Advanced Firework Particles */
            .firework-particle {
                position: absolute;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--particle-color);
                box-shadow: 0 0 6px var(--particle-color);
                animation: fireworkParticle 2.5s ease-out forwards;
            }
            
            .firework-particle.firework-ring {
                animation: fireworkRing 2.5s ease-out forwards;
            }
            
            .firework-particle.firework-willow {
                animation: fireworkWillow 3s ease-out forwards;
            }
            
            .firework-trail {
                position: absolute;
                width: 3px;
                height: 3px;
                border-radius: 50%;
                background: var(--trail-color);
                box-shadow: 0 0 4px var(--trail-color);
                animation: fireworkTrail 1.5s ease-out forwards;
            }
            
            /* Confetti Particles */
            .confetti {
                position: absolute;
                animation: confettiFall var(--duration, 4s) linear forwards;
            }
            
            .confetti-square {
                width: 8px;
                height: 8px;
                background: var(--confetti-color);
            }
            
            .confetti-rectangle {
                width: 12px;
                height: 6px;
                background: var(--confetti-color);
            }
            
            .confetti-circle {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--confetti-color);
            }
            
            .confetti-diamond {
                width: 8px;
                height: 8px;
                background: var(--confetti-color);
                transform: rotate(45deg);
            }
            
            /* Sparkle Effects */
            .sparkle {
                position: absolute;
                background: radial-gradient(circle, #ffffff 0%, #ffd700 50%, transparent 100%);
                border-radius: 50%;
                animation: sparkleGlow 1s ease-in-out;
                pointer-events: none;
            }
            
            /* Celebration Burst Particles */
            .celebration-particle {
                position: absolute;
                width: 8px;
                height: 8px;
                background: var(--burst-color);
                border-radius: 50%;
                box-shadow: 0 0 8px var(--burst-color);
                animation: celebrationBurst 3s ease-out forwards;
            }
            
            /* Enhanced Animations */
            @keyframes victoryFadeIn {
                from { opacity: 0; transform: scale(0.8) rotateY(10deg); }
                to { opacity: 1; transform: scale(1) rotateY(0deg); }
            }
            
            @keyframes victoryTitleShimmer {
                0%, 100% { 
                    background-position: 0% 50%; 
                    transform: scale(1);
                }
                50% { 
                    background-position: 100% 50%; 
                    transform: scale(1.05);
                }
            }
            
            @keyframes victorySubtitleFade {
                0% { opacity: 0; transform: translateY(20px); }
                100% { opacity: 0.9; transform: translateY(0); }
            }
            
            @keyframes heroesGlow {
                0%, 100% { text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6); }
                50% { text-shadow: 0 2px 20px rgba(255, 215, 0, 0.4), 0 2px 10px rgba(0, 0, 0, 0.6); }
            }
            
            @keyframes heroSlideUp {
                0% { opacity: 0; transform: translateY(50px) rotateX(20deg); }
                100% { opacity: 1; transform: translateY(0) rotateX(0deg); }
            }
            
            @keyframes heroFrameShine {
                0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                100% { transform: translateX(200%) translateY(200%) rotate(45deg); }
            }
            
            @keyframes victoryHintBlink {
                0%, 50%, 100% { opacity: 0.8; transform: scale(1); }
                25%, 75% { opacity: 0.4; transform: scale(0.98); }
            }
            
            /* Firework Animations */
            @keyframes fireworkParticle {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--end-x), var(--end-y)) scale(0.3);
                    opacity: 0;
                }
            }
            
            @keyframes fireworkRing {
                0% {
                    transform: translate(0, 0) scale(0.5);
                    opacity: 1;
                }
                50% {
                    opacity: 1;
                    transform: translate(calc(var(--end-x) * 0.7), calc(var(--end-y) * 0.7)) scale(1);
                }
                100% {
                    transform: translate(var(--end-x), var(--end-y)) scale(0.2);
                    opacity: 0;
                }
            }
            
            @keyframes fireworkWillow {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                30% {
                    transform: translate(calc(var(--end-x) * 0.3), calc(var(--end-y) * 0.3)) scale(0.8);
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--end-x), calc(var(--end-y) + 100px)) scale(0.1);
                    opacity: 0;
                }
            }
            
            @keyframes fireworkTrail {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(var(--trail-x), var(--trail-y)) scale(0.1);
                    opacity: 0;
                }
            }
            
            /* Confetti Animation */
            @keyframes confettiFall {
                0% {
                    transform: translateY(0) translateX(0) rotateZ(0deg) scale(var(--scale, 1));
                    opacity: 1;
                }
                100% {
                    transform: translateY(100vh) translateX(var(--drift, 0px)) rotateZ(720deg) scale(var(--scale, 1));
                    opacity: 0;
                }
            }
            
            /* Sparkle Animation */
            @keyframes sparkleGlow {
                0%, 100% {
                    transform: scale(0) rotate(0deg);
                    opacity: 0;
                }
                50% {
                    transform: scale(1) rotate(180deg);
                    opacity: 1;
                }
            }
            
            /* Celebration Burst Animation */
            @keyframes celebrationBurst {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                70% {
                    opacity: 0.8;
                }
                100% {
                    transform: translate(var(--burst-x), var(--burst-y)) scale(0.2);
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
                
                .firework-particle {
                    width: 4px;
                    height: 4px;
                }
                
                .confetti {
                    transform: scale(0.8);
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