// goldManager.js - Gold Management Module

export class GoldManager {
    constructor() {
        this.playerGold = 0;
        this.opponentGold = 0;
        this.goldChangeCallback = null;
        this.animationQueue = [];
        this.isAnimating = false;
        
        console.log('GoldManager initialized');
    }

    // Initialize with callback for gold changes
    init(goldChangeCallback) {
        this.goldChangeCallback = goldChangeCallback;
        console.log('GoldManager initialized with callback');
    }

    // Get player's gold
    getPlayerGold() {
        return this.playerGold;
    }

    // Get opponent's gold
    getOpponentGold() {
        return this.opponentGold;
    }

    // Add gold to player
    addPlayerGold(amount) {
        const oldGold = this.playerGold;
        this.playerGold += amount;
        
        console.log(`Player gold: ${oldGold} -> ${this.playerGold} (+${amount})`);
        
        // Trigger callback if set
        if (this.goldChangeCallback) {
            this.goldChangeCallback({
                type: 'player_gold_change',
                oldValue: oldGold,
                newValue: this.playerGold,
                change: amount
            });
        }
        
        // Queue animation
        this.queueGoldAnimation('player', amount);
        
        return this.playerGold;
    }

    // Add gold to opponent
    addOpponentGold(amount) {
        const oldGold = this.opponentGold;
        this.opponentGold += amount;
        
        console.log(`Opponent gold: ${oldGold} -> ${this.opponentGold} (+${amount})`);
        
        // Trigger callback if set
        if (this.goldChangeCallback) {
            this.goldChangeCallback({
                type: 'opponent_gold_change',
                oldValue: oldGold,
                newValue: this.opponentGold,
                change: amount
            });
        }
        
        // Queue animation
        this.queueGoldAnimation('opponent', amount);
        
        return this.opponentGold;
    }

    // Set player's gold (for syncing)
    setPlayerGold(amount) {
        const oldGold = this.playerGold;
        this.playerGold = Math.max(0, amount);
        
        console.log(`Player gold set to: ${this.playerGold}`);
        
        // Trigger callback if set
        if (this.goldChangeCallback) {
            this.goldChangeCallback({
                type: 'player_gold_set',
                oldValue: oldGold,
                newValue: this.playerGold,
                change: this.playerGold - oldGold
            });
        }
    }

    // Set opponent's gold (for syncing)
    setOpponentGold(amount) {
        const oldGold = this.opponentGold;
        this.opponentGold = Math.max(0, amount);
        
        console.log(`Opponent gold set to: ${this.opponentGold}`);
        
        // Trigger callback if set
        if (this.goldChangeCallback) {
            this.goldChangeCallback({
                type: 'opponent_gold_set',
                oldValue: oldGold,
                newValue: this.opponentGold,
                change: this.opponentGold - oldGold
            });
        }
    }

    // Queue gold animation
    queueGoldAnimation(target, amount) {
        this.animationQueue.push({ target, amount });
        
        if (!this.isAnimating) {
            this.processAnimationQueue();
        }
    }

    // Process animation queue
    async processAnimationQueue() {
        if (this.animationQueue.length === 0) {
            this.isAnimating = false;
            return;
        }
        
        this.isAnimating = true;
        const { target, amount } = this.animationQueue.shift();
        
        await this.playGoldAnimation(target, amount);
        
        // Process next animation after a short delay
        setTimeout(() => {
            this.processAnimationQueue();
        }, 300);
    }

    // Play gold gain animation
    async playGoldAnimation(target, amount) {
        const goldElement = document.querySelector(`.${target}-gold-display`);
        if (!goldElement) {
            console.warn(`Gold element not found for ${target}`);
            return;
        }
        
        // Create animation element
        const animationElement = document.createElement('div');
        animationElement.className = 'gold-gain-animation';
        animationElement.textContent = `+${amount}`;
        animationElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 100%;
            transform: translateY(-50%);
            color: #28a745;
            font-size: 16px;
            font-weight: bold;
            z-index: 100;
            pointer-events: none;
            animation: goldGainFloat 1.5s ease-out forwards;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        `;
        
        // Add to gold element
        goldElement.appendChild(animationElement);
        
        // Animate the gold counter
        this.animateGoldCounter(target, amount);
        
        // Remove animation element after animation completes
        setTimeout(() => {
            if (animationElement.parentNode) {
                animationElement.remove();
            }
        }, 1500);
    }

    // Animate gold counter ticking up
    animateGoldCounter(target, amount) {
        const goldNumberElement = document.querySelector(`.${target}-gold-number`);
        if (!goldNumberElement) return;
        
        const startValue = parseInt(goldNumberElement.textContent) || 0;
        const endValue = startValue + amount;
        const duration = 800; // 0.8 seconds
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (amount * easeOut));
            
            goldNumberElement.textContent = currentValue;
            
            // Add pulse effect during animation
            if (progress < 1) {
                goldNumberElement.style.transform = `scale(${1 + (Math.sin(progress * Math.PI * 6) * 0.1)})`;
                requestAnimationFrame(animate);
            } else {
                goldNumberElement.style.transform = 'scale(1)';
                goldNumberElement.textContent = endValue;
            }
        };
        
        animate();
    }

    // Create gold display HTML
    createGoldDisplay() {
        return `
            <div class="gold-display-enhanced">
                <div class="gold-amount-large">
                    <span class="gold-icon-large">🪙</span>
                    <span class="player-gold-number">${this.playerGold}</span>
                </div>
            </div>
        `;
    }

    // Update gold display
    updateGoldDisplay() {
        const playerGoldNumber = document.querySelector('.player-gold-number');
        const opponentGoldNumber = document.querySelector('.opponent-gold-number');
        
        if (playerGoldNumber) {
            playerGoldNumber.textContent = this.playerGold;
        }
        
        if (opponentGoldNumber) {
            opponentGoldNumber.textContent = this.opponentGold;
        }
    }

    // Award gold based on battle result
    awardBattleGold(result) {
        let playerGoldGain = 0;
        
        switch (result) {
            case 'victory':
                playerGoldGain = 4; // Winner gets 4 gold
                console.log('Player won battle - awarding 4 gold');
                break;
            case 'defeat':
                playerGoldGain = 5; // Loser gets 5 gold (4 + 1 bonus)
                console.log('Player lost battle - awarding 5 gold (including loser bonus)');
                break;
            case 'draw':
                playerGoldGain = 4; // Draw gives base amount
                console.log('Battle was a draw - awarding 4 gold');
                break;
        }
        
        if (playerGoldGain > 0) {
            this.addPlayerGold(playerGoldGain);
        }
        
        return playerGoldGain;
    }

    // Award gold to opponent (called when we receive their battle result)
    awardOpponentBattleGold(result) {
        let opponentGoldGain = 0;
        
        switch (result) {
            case 'victory':
                opponentGoldGain = 4; // Winner gets 4 gold
                console.log('Opponent won battle - they get 4 gold');
                break;
            case 'defeat':
                opponentGoldGain = 5; // Loser gets 5 gold (4 + 1 bonus)
                console.log('Opponent lost battle - they get 5 gold (including loser bonus)');
                break;
            case 'draw':
                opponentGoldGain = 4; // Draw gives base amount
                console.log('Battle was a draw - opponent gets 4 gold');
                break;
        }
        
        if (opponentGoldGain > 0) {
            this.addOpponentGold(opponentGoldGain);
        }
        
        return opponentGoldGain;
    }

    // Export gold data (for saving/syncing)
    exportGoldData() {
        return {
            playerGold: this.playerGold,
            opponentGold: this.opponentGold,
            timestamp: Date.now()
        };
    }

    // Import gold data (for loading/syncing)
    importGoldData(goldData) {
        if (!goldData || typeof goldData !== 'object') {
            console.error('Invalid gold data provided');
            return false;
        }
        
        if (typeof goldData.playerGold === 'number') {
            this.playerGold = Math.max(0, goldData.playerGold);
        }
        
        if (typeof goldData.opponentGold === 'number') {
            this.opponentGold = Math.max(0, goldData.opponentGold);
        }
        
        console.log(`Imported gold data - Player: ${this.playerGold}, Opponent: ${this.opponentGold}`);
        return true;
    }

    // Reset gold to initial state
    reset() {
        this.playerGold = 0;
        this.opponentGold = 0;
        this.animationQueue = [];
        this.isAnimating = false;
        
        console.log('GoldManager reset');
    }

    // Get gold statistics
    getGoldStats() {
        return {
            playerGold: this.playerGold,
            opponentGold: this.opponentGold,
            totalGold: this.playerGold + this.opponentGold
        };
    }

    // Log current gold state (for debugging)
    logGoldState() {
        console.log('=== GOLD STATE ===');
        console.log('Player Gold:', this.playerGold);
        console.log('Opponent Gold:', this.opponentGold);
        console.log('Total Gold:', this.playerGold + this.opponentGold);
        console.log('==================');
    }
}