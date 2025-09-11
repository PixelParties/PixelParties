// battleLog.js - Centralized Battle Log Module with Scrolling Support and Combat Message Toggle

export class BattleLog {
    constructor(containerId = 'combatLog', maxMessages = 100) {
        this.messages = [];
        this.containerId = containerId;
        this.maxMessages = maxMessages;
        this.container = null;
        this.autoScroll = true;
        this.isInitialized = false;
        this.showCombatMessages = true; // Toggle for attack/HP messages
        this.showCreatureMessages = true; // NEW: Toggle for creature-related messages
        
        // Message type configurations
        this.messageTypes = {
            'info': { color: '#ffffff', icon: '' },
            'success': { color: '#4caf50', icon: '' },
            'error': { color: '#f44336', icon: '' },
            'warning': { color: '#ff9800', icon: '' },
            'combat': { color: '#9c27b0', icon: '' },
            'ability': { color: '#2196f3', icon: '' },
            'spell': { color: '#673ab7', icon: '' },
            'damage': { color: '#e91e63', icon: '' },
            'heal': { color: '#4caf50', icon: '' },
            'system': { color: '#607d8b', icon: '' }
        };
    }

    // Toggle combat message display
    toggleCombatMessages() {
        this.showCombatMessages = !this.showCombatMessages;
        
        // Update the display immediately
        if (this.isInitialized) {
            this.updateUI();
        }
        
        return this.showCombatMessages;
    }

    // Get current combat message display state
    getCombatMessagesEnabled() {
        return this.showCombatMessages;
    }

    // NEW: Toggle creature message display
    toggleCreatureMessages() {
        this.showCreatureMessages = !this.showCreatureMessages;
        
        // Update the display immediately
        if (this.isInitialized) {
            this.updateUI();
        }
        
        return this.showCreatureMessages;
    }

    // NEW: Get current creature message display state
    getCreatureMessagesEnabled() {
        return this.showCreatureMessages;
    }

    // Initialize the battle log
    init() {
        this.container = document.getElementById(this.containerId);
        
        if (!this.container) {
            console.warn(`Battle log container with ID "${this.containerId}" not found`);
            return false;
        }

        // Setup container styles and scrolling
        this.setupContainer();
        
        // Add CSS if not already present
        this.ensureLogStyles();
        
        // Add initial placeholder if no messages
        if (this.messages.length === 0) {
            this.showPlaceholder();
        } else {
            this.updateUI();
        }
        
        this.isInitialized = true;
        return true;
    }

    // Setup the container with proper scrolling
    setupContainer() {
        if (!this.container) return;

        // Add classes for styling
        this.container.classList.add('battle-log-container');
        
        // Setup scroll event listener for auto-scroll detection
        this.container.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.container;
            const isNearBottom = scrollTop + clientHeight >= scrollHeight - 10;
            this.autoScroll = isNearBottom;
        });
    }

    // Log individual attack message
    logAttackMessage(attack) {
        if (!attack || !attack.hero || !attack.target || !attack.damage) return;
        
        const attackerName = attack.hero.name;
        let targetName;
        
        // Determine target name based on target type
        if (attack.target.type === 'creature') {
            targetName = attack.target.creature.name;
        } else if (attack.target.type === 'hero') {
            targetName = attack.target.hero.name;
        } else {
            targetName = 'Unknown Target';
        }
        
        // Determine log type based on attacker's side relative to current player
        // Use the hero's side property ('player' or 'opponent')
        const isPlayerAttacker = attack.hero.side === 'player';
        const logType = isPlayerAttacker ? 'success' : 'error';
        
        // Create attack message
        const message = `⚔️ ${attackerName} attacks ${targetName} for ${attack.damage} damage!`;
        
        // Use the existing addMessage method but mark as combat message
        this.addMessage(message, logType, null, { isCombatMessage: true });
    }

    // Add message to the battle log with combat and creature message flags
    addMessage(message, type = 'info', timestamp = null, metadata = {}) {
        // Validate inputs
        if (!message || typeof message !== 'string') {
            console.warn('Invalid message provided to battle log');
            return;
        }

        // Create message object
        const messageObj = {
            id: this.generateMessageId(),
            message: message.trim(),
            type: type,
            timestamp: timestamp || Date.now(),
            formattedTime: this.formatTime(timestamp || Date.now()),
            isCombatMessage: metadata.isCombatMessage || false, // Flag for combat messages
            isHpBarMessage: metadata.isHpBarMessage || false,    // Flag for HP bar messages
            isCreatureMessage: metadata.isCreatureMessage || false, // NEW: Flag for creature messages
            isCreatureDeathMessage: metadata.isCreatureDeathMessage || false // NEW: Flag for creature death (always show)
        };

        // Add to messages array (ALWAYS add to array regardless of display setting)
        this.messages.push(messageObj);

        // Maintain message limit
        while (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        // Update UI if initialized
        if (this.isInitialized && this.container) {
            // Only add to DOM if message should be displayed
            if (this.shouldDisplayMessage(messageObj)) {
                this.addMessageToDOM(messageObj);
                this.scrollToBottomIfNeeded();
            }
        }

        return messageObj.id;
    }

    // Check if a message should be displayed based on current settings
    shouldDisplayMessage(messageObj) {
        // If combat messages are disabled, hide combat and HP bar messages
        if (!this.showCombatMessages) {
            if (messageObj.isCombatMessage || messageObj.isHpBarMessage) {
                return false;
            }
        }
        
        // If creature messages are disabled, hide creature messages (except death messages)
        if (!this.showCreatureMessages) {
            if (messageObj.isCreatureMessage && !messageObj.isCreatureDeathMessage) {
                return false;
            }
        }
        
        return true;
    }

    // Add multiple messages at once (for restoration)
    addMessages(messages) {
        if (!Array.isArray(messages)) return;

        messages.forEach(msg => {
            if (typeof msg === 'string') {
                this.addMessage(msg);
            } else if (msg && msg.message) {
                const metadata = {
                    isCombatMessage: msg.isCombatMessage || false,
                    isHpBarMessage: msg.isHpBarMessage || false,
                    isCreatureMessage: msg.isCreatureMessage || false,
                    isCreatureDeathMessage: msg.isCreatureDeathMessage || false
                };
                this.addMessage(msg.message, msg.type, msg.timestamp, metadata);
            }
        });
    }

    // Clear all messages
    clear() {
        this.messages = [];
        
        if (this.container) {
            this.container.innerHTML = '';
            this.showPlaceholder();
        }
    }

    // Update the entire UI from current messages (respecting display settings)
    updateUI() {
        if (!this.container) return;

        // Clear existing content
        this.container.innerHTML = '';

        // Filter messages based on current display settings
        const messagesToDisplay = this.messages.filter(msg => this.shouldDisplayMessage(msg));

        // Add filtered messages
        if (messagesToDisplay.length === 0) {
            this.showPlaceholder();
        } else {
            // Remove placeholder first
            this.removePlaceholder();
            
            // Add all visible messages
            messagesToDisplay.forEach(messageObj => {
                this.addMessageToDOM(messageObj);
            });
            
            // Scroll to bottom
            this.scrollToBottom();
        }
    }

    /**
     * Generate an HP bar visualization for combat log
     * @param {Object} target - The target (hero or creature) 
     * @param {number} currentHp - Current HP
     * @param {number} maxHp - Maximum HP
     * @returns {string} Formatted HP bar string
     */
    generateHpBarMessage(target, currentHp, maxHp) {
        // Ensure we have valid numbers
        const current = Math.max(0, currentHp || 0);
        const maximum = Math.max(1, maxHp || 1); // Prevent division by zero
        
        // Calculate percentage (0-100)
        const percentage = Math.floor((current / maximum) * 100);
        
        // Create visual bar with 10 segments
        const barLength = 10;
        let filledSegments = Math.floor((current / maximum) * barLength);
        
        // Ensure at least 1 segment is filled if target has > 0 HP
        if (current > 0 && filledSegments === 0) {
            filledSegments = 1;
        }
        
        const emptySegments = barLength - filledSegments;
        
        // Determine HP bar color class based on percentage
        let colorClass = 'hp-critical'; // Red for < 15%
        if (percentage >= 60) {
            colorClass = 'hp-good'; // Green for >= 60%
        } else if (percentage >= 31) {
            colorClass = 'hp-moderate'; // Yellow for 30-60%
        } else if (percentage >= 21) {
            colorClass = 'hp-low'; // Orange for 15-30%
        }
        
        // Create filled segments with CSS color class
        const filledBar = filledSegments > 0 ? 
            `<span class="hp-bar-filled ${colorClass}">${'▌'.repeat(filledSegments)}</span>` : '';
        
        // Create empty segments
        const emptyBar = emptySegments > 0 ? 
            `<span class="hp-bar-empty">${'▒'.repeat(emptySegments)}</span>` : '';
        
        // Color coding for status icon based on HP percentage
        let statusIcon = '💚'; // Green heart for good health
        if (percentage <= 0) {
            statusIcon = '💀'; // Skull for 0 HP
        } else if (percentage < 15) {
            statusIcon = '❤️'; // Red heart for critical
        } else if (percentage < 30) {
            statusIcon = '🧡'; // Orange heart for low
        } else if (percentage < 60) {
            statusIcon = '💛'; // Yellow heart for moderate
        }
        
        // Return HTML-formatted message
        return `${statusIcon} ${target.name}: [<span class="hp-bar-container">${filledBar}${emptyBar}</span>] ${percentage}% HP (${current}/${maximum})`;
    }

    // Add a flag to mark HP bar messages as safe HTML and combat messages
    addHpBarMessage(target, currentHp, maxHp) {
        const hpBarMessage = this.generateHpBarMessage(target, currentHp, maxHp);
        
        // Determine if target is a creature (has type property or is not a hero)
        const isCreatureTarget = target.type === 'creature' || 
                                (target.type !== 'hero' && !target.position);
        
        // Add message with special HTML flag and combat message flag
        const messageObj = {
            id: this.generateMessageId(),
            message: hpBarMessage,
            type: 'hp_bar', // Special type for HP bar messages
            timestamp: Date.now(),
            formattedTime: this.formatTime(Date.now()),
            allowHtml: true, // Flag to allow HTML content
            isCombatMessage: false,   // HP bars are not attack messages
            isHpBarMessage: true,     // Flag for HP bar messages (affects combat toggle)
            isCreatureMessage: isCreatureTarget, // NEW: Flag for creature HP bars (affects creature toggle)
            isCreatureDeathMessage: false
        };

        // Add to messages array (ALWAYS add regardless of display setting)
        this.messages.push(messageObj);

        // Maintain message limit
        while (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        // Update UI if initialized and message should be displayed
        if (this.isInitialized && this.container && this.shouldDisplayMessage(messageObj)) {
            this.addMessageToDOM(messageObj);
            this.scrollToBottomIfNeeded();
        }

        return messageObj.id;
    }

    // Updated addMessageToDOM method to handle HTML for HP bars
    addMessageToDOM(messageObj) {
        if (!this.container) return;

        // Remove placeholder if it exists
        this.removePlaceholder();

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `log-message log-${messageObj.type}`;
        messageElement.setAttribute('data-message-id', messageObj.id);
        
        // Get message type config
        const typeConfig = this.messageTypes[messageObj.type] || this.messageTypes['info'];
        
        // Handle HP bar messages with HTML content
        if (messageObj.allowHtml && messageObj.type === 'hp_bar') {
            // For HP bar messages, allow HTML but still escape the name portion for safety
            const parts = messageObj.message.split(': ');
            if (parts.length >= 2) {
                const namePart = this.escapeHtml(parts[0]);
                const barPart = parts.slice(1).join(': '); // Don't escape the HP bar HTML
                
                messageElement.innerHTML = `
                    <div class="log-message-content">
                        <span class="log-icon">${typeConfig.icon}</span>
                        <span class="log-text">${namePart}: ${barPart}</span>
                    </div>
                `;
            } else {
                // Fallback - escape everything if format is unexpected
                messageElement.innerHTML = `
                    <div class="log-message-content">
                        <span class="log-icon">${typeConfig.icon}</span>
                        <span class="log-text">${this.escapeHtml(messageObj.message)}</span>
                    </div>
                `;
            }
        } else {
            // For all other messages, escape HTML as before
            messageElement.innerHTML = `
                <div class="log-message-content">
                    <span class="log-icon">${typeConfig.icon}</span>
                    <span class="log-text">${this.escapeHtml(messageObj.message)}</span>
                </div>
            `;
        }

        // Set message color
        messageElement.style.color = typeConfig.color;

        // Add to container
        this.container.appendChild(messageElement);

        // Maintain DOM message limit
        const domMessages = this.container.querySelectorAll('.log-message');
        if (domMessages.length > this.maxMessages + 10) {
            domMessages[0].remove();
        }
    }

    // Show placeholder when no messages
    showPlaceholder() {
        if (!this.container) return;

        const placeholder = document.createElement('div');
        placeholder.className = 'log-placeholder';
        placeholder.innerHTML = `
            <div class="placeholder-content">
                <div class="placeholder-icon">📜</div>
                <p>Battle log will appear here</p>
                <p class="placeholder-subtitle">Combat events and messages</p>
            </div>
        `;
        
        this.container.appendChild(placeholder);
    }

    // Remove placeholder
    removePlaceholder() {
        if (!this.container) return;

        const placeholder = this.container.querySelector('.log-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
    }

    // Scroll to bottom if auto-scroll is enabled
    scrollToBottomIfNeeded() {
        if (this.autoScroll) {
            this.scrollToBottom();
        }
    }

    // Force scroll to bottom
    scrollToBottom() {
        if (!this.container) return;

        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(() => {
            this.container.scrollTop = this.container.scrollHeight;
        });
    }

    // Scroll to top
    scrollToTop() {
        if (!this.container) return;

        this.container.scrollTop = 0;
        this.autoScroll = false; // Disable auto-scroll when manually scrolling
    }

    // Toggle auto-scroll
    toggleAutoScroll() {
        this.autoScroll = !this.autoScroll;
        
        if (this.autoScroll) {
            this.scrollToBottom();
        }
        
        return this.autoScroll;
    }

    // Get recent messages
    getRecentMessages(count = 10) {
        return this.messages.slice(-count);
    }

    // Search messages
    searchMessages(query, type = null) {
        if (!query) return [];

        const searchTerm = query.toLowerCase();
        
        return this.messages.filter(msg => {
            const matchesText = msg.message.toLowerCase().includes(searchTerm);
            const matchesType = !type || msg.type === type;
            return matchesText && matchesType;
        });
    }

    // Export state for persistence (including new toggle states)
    exportState() {
        return {
            messages: this.messages,
            maxMessages: this.maxMessages,
            autoScroll: this.autoScroll,
            showCombatMessages: this.showCombatMessages, // Include toggle state
            showCreatureMessages: this.showCreatureMessages // NEW: Include creature toggle state
        };
    }

    // Import state from persistence (including new toggle states)
    importState(state) {
        if (!state || typeof state !== 'object') return false;

        try {
            if (Array.isArray(state.messages)) {
                this.messages = state.messages;
            } else if (Array.isArray(state)) {
                // Handle legacy format where state was just an array of messages
                this.messages = state.map(item => {
                    if (typeof item === 'string') {
                        return {
                            id: this.generateMessageId(),
                            message: item,
                            type: 'info',
                            timestamp: Date.now(),
                            formattedTime: this.formatTime(Date.now()),
                            isCombatMessage: false,
                            isHpBarMessage: false,
                            isCreatureMessage: false,
                            isCreatureDeathMessage: false
                        };
                    } else if (item && item.message) {
                        return {
                            id: item.id || this.generateMessageId(),
                            message: item.message,
                            type: item.type || 'info',
                            timestamp: item.timestamp || Date.now(),
                            formattedTime: item.formattedTime || this.formatTime(item.timestamp || Date.now()),
                            isCombatMessage: item.isCombatMessage || false,
                            isHpBarMessage: item.isHpBarMessage || false,
                            isCreatureMessage: item.isCreatureMessage || false,
                            isCreatureDeathMessage: item.isCreatureDeathMessage || false
                        };
                    }
                    return null;
                }).filter(Boolean);
            }

            if (typeof state.maxMessages === 'number') {
                this.maxMessages = state.maxMessages;
            }

            if (typeof state.autoScroll === 'boolean') {
                this.autoScroll = state.autoScroll;
            }

            // Import toggle states
            if (typeof state.showCombatMessages === 'boolean') {
                this.showCombatMessages = state.showCombatMessages;
            }

            // NEW: Import creature toggle state
            if (typeof state.showCreatureMessages === 'boolean') {
                this.showCreatureMessages = state.showCreatureMessages;
            }

            // Update UI if initialized
            if (this.isInitialized) {
                this.updateUI();
            }

            return true;
        } catch (error) {
            console.error('Error importing battle log state:', error);
            return false;
        }
    }

    // Get statistics about the log
    getStatistics() {
        const stats = {
            totalMessages: this.messages.length,
            messagesByType: {},
            oldestMessage: null,
            newestMessage: null,
            combatMessages: 0,        // Count combat messages
            hpBarMessages: 0,         // Count HP bar messages
            creatureMessages: 0,      // NEW: Count creature messages
            creatureDeathMessages: 0, // NEW: Count creature death messages
            visibleMessages: 0        // Count currently visible messages
        };

        // Count messages by type and special categories
        this.messages.forEach(msg => {
            stats.messagesByType[msg.type] = (stats.messagesByType[msg.type] || 0) + 1;
            
            if (msg.isCombatMessage) stats.combatMessages++;
            if (msg.isHpBarMessage) stats.hpBarMessages++;
            if (msg.isCreatureMessage) stats.creatureMessages++;
            if (msg.isCreatureDeathMessage) stats.creatureDeathMessages++;
            if (this.shouldDisplayMessage(msg)) stats.visibleMessages++;
        });

        // Get oldest and newest messages
        if (this.messages.length > 0) {
            stats.oldestMessage = this.messages[0];
            stats.newestMessage = this.messages[this.messages.length - 1];
        }

        return stats;
    }

    // Utility method to generate unique message IDs
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Utility method to format timestamps
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }

    // Utility method to escape HTML
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Ensure CSS styles are loaded
    ensureLogStyles() {
        if (document.getElementById('battleLogStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'battleLogStyles';
        style.textContent = `
            /* ============================================
               BATTLE LOG STYLES WITH SCROLLING SUPPORT
               ============================================ */

            .battle-log-container {
                height: 100%;
                max-height: 300px;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 8px;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                font-family: 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.4;
                scroll-behavior: smooth;
            }

            /* Custom scrollbar styling */
            .battle-log-container::-webkit-scrollbar {
                width: 8px;
            }

            .battle-log-container::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            }

            .battle-log-container::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                transition: background 0.2s ease;
            }

            .battle-log-container::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.5);
            }

            /* Firefox scrollbar */
            .battle-log-container {
                scrollbar-width: thin;
                scrollbar-color: rgba(255, 255, 255, 0.3) rgba(0, 0, 0, 0.3);
            }

            /* Log message styling */
            .log-message {
                margin: 4px 0;
                padding: 6px 8px;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.02);
                border-left: 3px solid transparent;
                transition: all 0.2s ease;
                word-wrap: break-word;
                animation: messageSlideIn 0.3s ease-out;
            }

            .log-message:hover {
                background: rgba(255, 255, 255, 0.05);
                transform: translateX(2px);
            }

            /* Message content layout */
            .log-message-content {
                display: flex;
                align-items: baseline;
                gap: 6px;
            }

            .log-time {
                color: rgba(255, 255, 255, 0.5);
                font-size: 11px;
                flex-shrink: 0;
                min-width: 65px;
            }

            .log-icon {
                flex-shrink: 0;
                font-size: 12px;
                width: 16px;
                text-align: center;
            }

            .log-text {
                flex: 1;
                word-break: break-word;
            }

            /* Message type specific styling */
            .log-info {
                border-left-color: #2196f3;
            }

            .log-success {
                border-left-color: #4caf50;
            }

            .log-error {
                border-left-color: #f44336;
            }

            .log-warning {
                border-left-color: #ff9800;
            }

            .log-combat {
                border-left-color: #9c27b0;
                background: rgba(156, 39, 176, 0.05);
            }

            .log-ability {
                border-left-color: #2196f3;
                background: rgba(33, 150, 243, 0.05);
            }

            .log-spell {
                border-left-color: #673ab7;
                background: rgba(103, 58, 183, 0.05);
            }

            .log-damage {
                border-left-color: #e91e63;
                background: rgba(233, 30, 99, 0.05);
            }

            .log-heal {
                border-left-color: #4caf50;
                background: rgba(76, 175, 80, 0.05);
            }

            .log-system {
                border-left-color: #607d8b;
                color: rgba(255, 255, 255, 0.7);
                font-style: italic;
            }

            /* Placeholder styling */
            .log-placeholder {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                min-height: 120px;
                color: rgba(255, 255, 255, 0.4);
                text-align: center;
            }

            .placeholder-content {
                padding: 20px;
            }

            .placeholder-icon {
                font-size: 24px;
                margin-bottom: 8px;
                opacity: 0.6;
            }

            .placeholder-subtitle {
                font-size: 11px;
                margin-top: 4px;
                opacity: 0.6;
            }

            /* Animation for new messages */
            @keyframes messageSlideIn {
                from {
                    opacity: 0;
                    transform: translateX(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .battle-log-container {
                    font-size: 12px;
                    max-height: 250px;
                }

                .log-time {
                    font-size: 10px;
                    min-width: 55px;
                }
            }

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                .battle-log-container {
                    border: 2px solid white;
                    background: black;
                }

                .log-message {
                    background: rgba(255, 255, 255, 0.1);
                }

                .battle-log-container::-webkit-scrollbar-thumb {
                    background: white;
                }
            }

            /* Auto-scroll indicator */
            .battle-log-container.auto-scroll-disabled::after {
                content: '📌 Auto-scroll disabled';
                position: sticky;
                bottom: 0;
                right: 0;
                background: rgba(255, 193, 7, 0.9);
                color: black;
                padding: 2px 6px;
                font-size: 10px;
                border-radius: 4px 0 0 0;
                float: right;
            }


            /* HP Bar Styling */
            .hp-bar-container {
                font-family: monospace;
                font-weight: bold;
                letter-spacing: -1px;
                display: inline-block;
            }
            
            .hp-bar-filled {
                text-shadow: 0 0 3px currentColor;
            }
            
            .hp-bar-empty {
                color: rgba(255, 255, 255, 0.3);
                text-shadow: none;
            }
            
            /* HP Color Classes */
            .hp-good {
                color: #4caf50; /* Green */
                text-shadow: 0 0 4px #4caf50;
            }
            
            .hp-moderate {
                color: #ffeb3b; /* Yellow */
                text-shadow: 0 0 4px #ffeb3b;
            }
            
            .hp-low {
                color: #ff9800; /* Orange */
                text-shadow: 0 0 4px #ff9800;
            }
            
            .hp-critical {
                color: #f44336; /* Red */
                text-shadow: 0 0 4px #f44336;
            }
            
            /* HP Bar message type styling */
            .log-hp_bar {
                border-left-color: #607d8b;
                background: rgba(96, 125, 139, 0.05);
                font-family: monospace;
            }
            
            /* Pulsing animation for critical HP */
            .hp-critical {
                animation: criticalHpPulse 1.5s ease-in-out infinite;
            }
            
            @keyframes criticalHpPulse {
                0%, 100% { 
                    opacity: 1; 
                    text-shadow: 0 0 4px #f44336;
                }
                50% { 
                    opacity: 0.7; 
                    text-shadow: 0 0 8px #f44336, 0 0 12px #ff5252;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Cleanup method
    cleanup() {
        if (this.container) {
            this.container.removeEventListener('scroll', this.scrollHandler);
        }
        
        this.messages = [];
        this.container = null;
        this.isInitialized = false;
    }

    // Set container max height dynamically
    setMaxHeight(height) {
        if (this.container) {
            this.container.style.maxHeight = typeof height === 'number' ? `${height}px` : height;
        }
    }

    // Enable/disable auto-scroll indicator
    updateAutoScrollIndicator() {
        if (!this.container) return;

        if (this.autoScroll) {
            this.container.classList.remove('auto-scroll-disabled');
        } else {
            this.container.classList.add('auto-scroll-disabled');
        }
    }
}

// Export default for ES6 module compatibility
export default BattleLog;