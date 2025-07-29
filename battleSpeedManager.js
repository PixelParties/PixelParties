// battleSpeedManager.js - Battle Speed Control Module with Persistence

export class BattleSpeedManager {
    constructor() {
        // Initialize speed configurations FIRST
        this.speedOptions = [
            { value: 1, name: 'Normal', icon: '▶', label: '1x' },
            { value: 2, name: 'Fast', icon: '▶▶', label: '2x' },
            { value: 4, name: 'Super Fast', icon: '▶▶▶', label: '4x' }
        ];
        
        // NOW we can safely load saved speed
        this.currentSpeed = this.loadSavedSpeed();
        
        // Other initializations
        this.isHost = false;
        this.battleManager = null;  // ← Add debugging here
        this.speedLocked = false;
        
        // UI elements
        this.controlsContainer = null;
        this.speedButtons = [];
        this.statusElement = null;
    }

    // Initialize the speed manager with battle context
    init(battleManager, isHost) {
        
        this.battleManager = battleManager;
        this.isHost = isHost;
        
        // Keep the saved/current speed - don't reset to 1
        this.speedLocked = false;
                
        // Inject CSS styles if not already present
        this.injectStyles();
        
        return true;
    }

    // Load saved speed from localStorage
    loadSavedSpeed() {
        try {
            const savedSpeed = localStorage.getItem('battleSpeed');
            if (savedSpeed) {
                const speed = parseInt(savedSpeed);
                // Validate that it's a valid speed option
                const isValidSpeed = this.getValidSpeeds().includes(speed);
                if (isValidSpeed) {
                    return speed;
                }
            }
        } catch (error) {
            console.warn('Error loading saved battle speed:', error);
        }
        
        // Default to normal speed if no valid saved speed
        return 1;
    }

    // Save current speed to localStorage
    saveSpeeds() {
        try {
            localStorage.setItem('battleSpeed', this.currentSpeed.toString());
        } catch (error) {
            console.warn('Error saving battle speed:', error);
        }
    }

    // Get valid speed values
    getValidSpeeds() {
        return this.speedOptions.map(opt => opt.value);
    }

    // Generate HTML for speed controls with persistent indicator
    generateSpeedControlHTML() {
        const buttonsHTML = this.speedOptions.map(option => `
            <button class="speed-button ${option.value === this.currentSpeed ? 'active' : ''}" 
                    data-speed="${option.value}" 
                    id="speed${option.value}x"
                    ${!this.isHost ? 'disabled' : ''}
                    title="${this.isHost ? 'Click to change battle speed' : 'Only host can change battle speed'}">
                <span class="speed-icon">${option.icon}</span>
                <span class="speed-label">${option.label}</span>
            </button>
        `).join('');

        const persistentIndicator = `
            <div class="speed-persistent-indicator" title="Battle speed is saved between battles">
                💾 Persistent
            </div>
        `;

        return `
            <div class="battle-speed-controls" id="battleSpeedControls">
                <div class="speed-control-label">Battle Speed</div>
                <div class="speed-buttons">
                    ${buttonsHTML}
                </div>
                <div class="speed-control-status" id="speedStatus">${this.getCurrentSpeedInfo().name} Speed</div>
                ${persistentIndicator}
            </div>
        `;
    }

    // Initialize speed control UI and event handlers
    initializeUI(containerElement) {
        if (!containerElement) {
            console.error('BattleSpeedManager: No container element provided');
            return false;
        }

        // Insert the speed control HTML
        containerElement.innerHTML = this.generateSpeedControlHTML();
        
        // Cache UI elements
        this.controlsContainer = containerElement.querySelector('#battleSpeedControls');
        this.speedButtons = Array.from(containerElement.querySelectorAll('.speed-button'));
        this.statusElement = containerElement.querySelector('#speedStatus');
        
        if (!this.controlsContainer) {
            console.error('BattleSpeedManager: Failed to find controls container');
            return false;
        }

        // Add host/guest specific classes
        this.controlsContainer.classList.add(this.isHost ? 'host-controls' : 'guest-controls');

        // Set up event handlers for host
        if (this.isHost) {
            this.setupHostEventHandlers();
        }

        // Force UI update to ensure correct initial state
        this.forceUpdateUI();
        

        return true;
    }

    // Refresh UI state (call this after initialization if speed was changed externally)
    refreshUIState() {
        if (this.controlsContainer) {
            this.forceUpdateUI();
        }
    }

    // Set up click event handlers for host
    setupHostEventHandlers() {
        this.speedButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (this.speedLocked) {
                    return;
                }
                
                const speed = parseInt(button.dataset.speed);
                this.changeSpeed(speed);
            });
        });
    }

    // Change battle speed (host only) with persistence
    changeSpeed(newSpeed) {
        if (!this.isHost) {
            console.warn('Only host can change battle speed');
            return false;
        }

        if (this.speedLocked) {
            return false;
        }

        const speedOption = this.speedOptions.find(opt => opt.value === newSpeed);
        if (!speedOption) {
            console.warn('Invalid speed value:', newSpeed);
            return false;
        }

        const oldSpeed = this.currentSpeed;
        this.currentSpeed = newSpeed;
        
        // Save the new speed to localStorage
        this.saveSpeeds();
        
        // Force UI update to ensure button states are correct
        this.forceUpdateUI();
        
        // Log the change
        this.addCombatLog(`⚡ Battle speed changed to ${speedOption.name} (${speedOption.label})`, 'info');
                
        // Sync to guest via existing battle data system
        if (this.battleManager && this.battleManager.sendBattleUpdate) {
            this.battleManager.sendBattleUpdate('speed_change', {
                speed: newSpeed,
                speedName: speedOption.name,
                speedLabel: speedOption.label,
                timestamp: Date.now()
            });
        } else {
            console.error('❌ HOST: Cannot send speed change - battleManager or sendBattleUpdate not available!');
        }
        return true;
    }

    // Handle speed change from host (guest side) with persistence
    handleSpeedChange(data) {
        
        if (this.isHost) {
            console.warn('Host should not receive speed change messages');
            return;
        }

        const { speed, speedName, speedLabel } = data;
        
        // Validate speed value
        const isValidSpeed = this.speedOptions.some(opt => opt.value === speed);
        if (!isValidSpeed) {
            console.warn('Received invalid speed value:', speed);
            return;
        }
        
        this.currentSpeed = speed;
        
        // Save the speed change for guest too
        this.saveSpeeds();
        
        // Force UI update with debugging
        this.forceUpdateUI();
        
        // Log the change
        this.addCombatLog(`⚡ Host changed battle speed to ${speedName} (${speedLabel})`, 'info');
    }

    // Update UI to reflect current speed
    updateUI() {
        if (!this.controlsContainer) {
            console.warn('BattleSpeedManager: Cannot update UI - no controls container');
            return;
        }

        // Re-cache elements if needed (in case of DOM changes)
        if (!this.speedButtons || this.speedButtons.length === 0) {
            this.speedButtons = Array.from(this.controlsContainer.querySelectorAll('.speed-button'));
            this.statusElement = this.controlsContainer.querySelector('#speedStatus');
        }

        if (this.speedButtons.length === 0) {
            console.warn('BattleSpeedManager: No speed buttons found for UI update');
            return;
        }


        // Update button states
        this.speedButtons.forEach(button => {
            const buttonSpeed = parseInt(button.dataset.speed);
            if (buttonSpeed === this.currentSpeed) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Update status text
        if (this.statusElement) {
            const speedOption = this.speedOptions.find(opt => opt.value === this.currentSpeed);
            const statusText = speedOption ? `${speedOption.name} Speed` : 'Normal Speed';
            this.statusElement.textContent = statusText;
        }
    }

    // Force UI update with element re-caching (for guest speed changes)
    forceUpdateUI() {
        
        // Always re-cache elements to ensure we have the latest DOM state
        if (this.controlsContainer) {
            this.speedButtons = Array.from(this.controlsContainer.querySelectorAll('.speed-button'));
            this.statusElement = this.controlsContainer.querySelector('#speedStatus');
        }
        
        // Call regular update
        this.updateUI();
        
        // Additional verification - log current button states
        if (this.speedButtons.length > 0) {
            this.speedButtons.forEach(button => {
                const buttonSpeed = parseInt(button.dataset.speed);
                const isActive = button.classList.contains('active');
            });
        }
    }

    // Get speed multiplier for delay calculations
    getSpeedMultiplier() {
        return this.currentSpeed;
    }

    // Calculate adjusted delay time
    calculateAdjustedDelay(originalMs) {
        return Math.max(1, Math.floor(originalMs / this.currentSpeed));
    }

    // Lock/unlock speed changes (for critical battle moments)
    lockSpeedChanges() {
        this.speedLocked = true;
        
        if (this.speedButtons.length > 0) {
            this.speedButtons.forEach(button => {
                if (this.isHost) {
                    button.style.opacity = '0.5';
                    button.style.cursor = 'not-allowed';
                }
            });
        }
    }

    unlockSpeedChanges() {
        this.speedLocked = false;
        
        if (this.speedButtons.length > 0) {
            this.speedButtons.forEach(button => {
                if (this.isHost) {
                    button.style.opacity = '';
                    button.style.cursor = '';
                }
            });
        }
    }

    // Reset to normal speed with persistence
    resetSpeed() {
        if (this.currentSpeed !== 1) {
            this.currentSpeed = 1;
            this.saveSpeeds(); // Save the reset to normal speed
            this.forceUpdateUI(); // Use force update to ensure UI reflects change
            
            if (this.isHost) {
                this.addCombatLog('⚡ Battle speed reset to Normal', 'info');
                
                // Sync to guest
                if (this.battleManager && this.battleManager.sendBattleUpdate) {
                    this.battleManager.sendBattleUpdate('speed_change', {
                        speed: 1,
                        speedName: 'Normal',
                        speedLabel: '1x',
                        timestamp: Date.now()
                    });
                }
            }
        }
    }

    // Add message to combat log (helper method)
    addCombatLog(message, type = 'info') {
        if (this.battleManager && this.battleManager.addCombatLog) {
            this.battleManager.addCombatLog(message, type);
        } else if (this.battleManager && this.battleManager.battleScreen && this.battleManager.battleScreen.addCombatLogMessage) {
            this.battleManager.battleScreen.addCombatLogMessage(message, type);
        }
    }

    // Get current speed info
    getCurrentSpeedInfo() {
        const speedOption = this.speedOptions.find(opt => opt.value === this.currentSpeed);
        return {
            value: this.currentSpeed,
            name: speedOption?.name || 'Normal',
            label: speedOption?.label || '1x',
            icon: speedOption?.icon || '▶'
        };
    }

    // Export speed state (for persistence/sync)
    exportState() {
        return {
            currentSpeed: this.currentSpeed,
            speedLocked: this.speedLocked,
            isHost: this.isHost
        };
    }

    // Import speed state (for restoration) with persistence
    importState(state) {
        if (state && typeof state === 'object') {
            const newSpeed = state.currentSpeed || this.loadSavedSpeed();
            
            // Only update if the speed is different and valid
            if (newSpeed !== this.currentSpeed && this.getValidSpeeds().includes(newSpeed)) {
                this.currentSpeed = newSpeed;
                this.saveSpeeds(); // Save the imported speed
            }
            
            this.speedLocked = state.speedLocked || false;
            
            // Force UI update to ensure imported state is reflected
            this.forceUpdateUI();
        }
    }

    // Method to clear saved speed (for debugging or reset purposes)
    clearSavedSpeed() {
        try {
            localStorage.removeItem('battleSpeed');
            this.currentSpeed = 1;
            this.saveSpeeds(); // Save the reset
            this.forceUpdateUI(); // Use force update to ensure UI reflects change
            
            // Sync to guest if host
            if (this.isHost && this.battleManager && this.battleManager.sendBattleUpdate) {
                this.battleManager.sendBattleUpdate('speed_change', {
                    speed: 1,
                    speedName: 'Normal',
                    speedLabel: '1x',
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.warn('Error clearing saved battle speed:', error);
        }
    }

    // Method to initialize speed from URL parameter (for testing)
    initializeSpeedFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const speedParam = urlParams.get('battleSpeed');
            
            if (speedParam) {
                const speed = parseInt(speedParam);
                if (this.getValidSpeeds().includes(speed)) {
                    this.currentSpeed = speed;
                    this.saveSpeeds();
                    return true;
                }
            }
        } catch (error) {
            console.warn('Error initializing speed from URL:', error);
        }
        return false;
    }

    // Inject CSS styles with persistent indicator
    injectStyles() {
        if (document.getElementById('battleSpeedManagerStyles')) {
            return; // Styles already injected
        }

        const style = document.createElement('style');
        style.id = 'battleSpeedManagerStyles';
        style.textContent = `
            /* ============================================
            BATTLE SPEED MANAGER STYLES - WITH PERSISTENT INDICATOR
            ============================================ */

            .battle-center {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 80px;
                position: relative;
            }

            .battle-speed-controls {
                background: rgba(0, 0, 0, 0.85);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 12px;
                padding: 15px 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                box-shadow: 
                    0 4px 15px rgba(0, 0, 0, 0.5),
                    0 0 20px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(8px);
                min-width: 200px;
                user-select: none;
            }

            .speed-control-label {
                color: white;
                font-size: 14px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 5px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
                letter-spacing: 0.5px;
            }

            .speed-buttons {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .speed-button {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                padding: 8px 12px;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                min-width: 50px;
                font-size: 12px;
                outline: none;
            }

            .speed-button:hover:not(:disabled):not(.speed-locked) {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.5);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }

            .speed-button.active {
                background: rgba(76, 175, 80, 0.3);
                border-color: #4caf50;
                box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
                animation: speedActiveGlow 2s ease-in-out infinite;
            }

            .speed-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .speed-button.speed-locked {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .speed-icon {
                font-size: 16px;
                line-height: 1;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }

            .speed-label {
                font-size: 10px;
                font-weight: bold;
                opacity: 0.9;
                text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
            }

            .speed-control-status {
                color: rgba(255, 255, 255, 0.8);
                font-size: 12px;
                text-align: center;
                font-style: italic;
                margin-top: 5px;
                text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
            }

            /* Persistent indicator styles */
            .speed-persistent-indicator {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                font-size: 10px;
                color: rgba(255, 193, 7, 0.8);
                background: rgba(255, 193, 7, 0.1);
                border: 1px solid rgba(255, 193, 7, 0.3);
                border-radius: 12px;
                padding: 2px 8px;
                margin-top: 2px;
                text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
                cursor: help;
                transition: all 0.2s ease;
            }

            .speed-persistent-indicator:hover {
                background: rgba(255, 193, 7, 0.2);
                border-color: rgba(255, 193, 7, 0.5);
                color: rgba(255, 193, 7, 1);
            }

            /* Host-specific styling */
            .host-controls .speed-button {
                cursor: pointer;
            }

            .host-controls .speed-control-label::after {
                content: " (Host)";
                color: rgba(255, 193, 7, 0.8);
                font-size: 11px;
                font-weight: normal;
            }

            /* Guest-specific styling */
            .guest-controls .speed-button {
                cursor: default;
                opacity: 0.8;
            }

            .guest-controls .speed-control-label::after {
                content: " (Host Only)";
                color: rgba(255, 255, 255, 0.5);
                font-size: 11px;
                font-weight: normal;
            }

            /* Animation for active speed */
            @keyframes speedActiveGlow {
                0%, 100% { 
                    box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
                }
                50% { 
                    box-shadow: 0 0 25px rgba(76, 175, 80, 0.8);
                }
            }

            /* Responsive adjustments */
            @media (max-width: 1200px) {
                .battle-speed-controls {
                    min-width: 180px;
                    padding: 12px 16px;
                }
                
                .speed-button {
                    min-width: 45px;
                    padding: 6px 10px;
                }
                
                .speed-icon {
                    font-size: 14px;
                }
                
                .speed-control-label {
                    font-size: 13px;
                }

                .speed-persistent-indicator {
                    font-size: 9px;
                    padding: 1px 6px;
                }
            }

            @media (max-width: 900px) {
                .battle-speed-controls {
                    min-width: 160px;
                    padding: 10px 14px;
                }
                
                .speed-button {
                    min-width: 40px;
                    padding: 5px 8px;
                }
                
                .speed-control-label {
                    font-size: 12px;
                }

                .speed-persistent-indicator {
                    font-size: 8px;
                    padding: 1px 4px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Cleanup method - preserve persistent speed
    cleanup() {        
        // Remove event listeners
        if (this.isHost && this.speedButtons.length > 0) {
            this.speedButtons.forEach(button => {
                button.replaceWith(button.cloneNode(true)); // Remove all event listeners
            });
        }
        
        // Clear references
        this.controlsContainer = null;
        this.speedButtons = [];
        this.statusElement = null;
        this.battleManager = null;  // This might be the problem!
                
        // Preserve persistent speed - don't reset to 1
        this.speedLocked = false;
    }

    // Reset for new battle - preserve persistent speed
    reset() {
        // Preserve persistent speed - don't reset to 1
        this.speedLocked = false;
        
        // Force UI update to ensure correct state is shown
        if (this.controlsContainer) {
            this.forceUpdateUI();
        }
    }
}

// Export default
export default BattleSpeedManager;