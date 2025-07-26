// goldManager.js - Gold Management Module with Enhanced Tracking

export class GoldManager {
    constructor() {
        this.playerGold = 0;
        this.opponentGold = 0;
        this.goldChangeCallback = null;
        this.animationQueue = [];
        this.isAnimating = false;
        
        // Enhanced tracking for reward system integration
        this.lastGoldChange = 0;
        this.goldHistory = [];
        this.maxHistoryLength = 10;
        
        console.log('GoldManager initialized with enhanced tracking');
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

    // Record gold change in history
    recordGoldChange(amount, reason = 'unknown') {
        const change = {
            amount: amount,
            timestamp: Date.now(),
            reason: reason,
            newTotal: this.playerGold
        };
        
        this.goldHistory.unshift(change);
        
        // Keep history limited
        if (this.goldHistory.length > this.maxHistoryLength) {
            this.goldHistory.pop();
        }
        
        this.lastGoldChange = amount;
    }

    // Add gold to player with enhanced tracking
    addPlayerGold(amount, reason = 'manual') {
        const oldGold = this.playerGold;
        this.playerGold += amount;
        
        // Record the change
        this.recordGoldChange(amount, reason);
        
        console.log(`Player gold: ${oldGold} -> ${this.playerGold} (+${amount}) [${reason}]`);
        
        // Trigger callback if set
        if (this.goldChangeCallback) {
            this.goldChangeCallback({
                type: 'player_gold_change',
                oldValue: oldGold,
                newValue: this.playerGold,
                change: amount,
                reason: reason
            });
        }
        
        // Queue animation
        this.queueGoldAnimation('player', amount);
        
        return this.playerGold;
    }

    // Add gold to opponent
    addOpponentGold(amount, reason = 'manual') {
        const oldGold = this.opponentGold;
        this.opponentGold += amount;
        
        console.log(`Opponent gold: ${oldGold} -> ${this.opponentGold} (+${amount}) [${reason}]`);
        
        // Trigger callback if set
        if (this.goldChangeCallback) {
            this.goldChangeCallback({
                type: 'opponent_gold_change',
                oldValue: oldGold,
                newValue: this.opponentGold,
                change: amount,
                reason: reason
            });
        }
        
        // Queue animation
        this.queueGoldAnimation('opponent', amount);
        
        return this.opponentGold;
    }

    // Set player's gold (for syncing) with enhanced tracking
    setPlayerGold(amount, reason = 'sync') {
        const oldGold = this.playerGold;
        this.playerGold = Math.max(0, amount);
        const change = this.playerGold - oldGold;
        
        // Record the change if significant
        if (Math.abs(change) > 0) {
            this.recordGoldChange(change, reason);
        }
        
        console.log(`Player gold set to: ${this.playerGold} [${reason}]`);
        
        // Trigger callback if set
        if (this.goldChangeCallback) {
            this.goldChangeCallback({
                type: 'player_gold_set',
                oldValue: oldGold,
                newValue: this.playerGold,
                change: change,
                reason: reason
            });
        }
    }

    // Set opponent's gold (for syncing)
    setOpponentGold(amount, reason = 'sync') {
        const oldGold = this.opponentGold;
        this.opponentGold = Math.max(0, amount);
        
        console.log(`Opponent gold set to: ${this.opponentGold} [${reason}]`);
        
        // Trigger callback if set
        if (this.goldChangeCallback) {
            this.goldChangeCallback({
                type: 'opponent_gold_set',
                oldValue: oldGold,
                newValue: this.opponentGold,
                change: this.opponentGold - oldGold,
                reason: reason
            });
        }
    }

    // Award gold directly with reason tracking
    awardGold(amount, isOpponent = false, reason = 'battle_reward') {
        if (amount <= 0) return 0;
        
        if (isOpponent) {
            this.addOpponentGold(amount, reason);
            console.log(`Opponent awarded ${amount} gold from ${reason}`);
        } else {
            this.addPlayerGold(amount, reason);
            console.log(`Player awarded ${amount} gold from ${reason}`);
        }
        
        return amount;
    }

    // DEPRECATED: Award gold based on battle result
    // Kept for backwards compatibility but now returns 0 to prevent double-awarding
    awardBattleGold(result) {
        console.warn('awardBattleGold is deprecated - gold should be awarded through reward screen');
        return 0; // Return 0 to prevent double-awarding
    }

    // DEPRECATED: Award gold to opponent
    // Kept for backwards compatibility but now returns 0 to prevent double-awarding
    awardOpponentBattleGold(result) {
        console.warn('awardOpponentBattleGold is deprecated - gold should be awarded through reward screen');
        return 0; // Return 0 to prevent double-awarding
    }

    // Get last gold change amount
    getLastGoldChange() {
        return this.lastGoldChange;
    }

    // Get recent gold changes
    getGoldHistory(count = 5) {
        return this.goldHistory.slice(0, count);
    }

    // Clear gold history
    clearGoldHistory() {
        this.goldHistory = [];
        this.lastGoldChange = 0;
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
        animationElement.textContent = `${amount > 0 ? '+' : ''}${amount}`;
        animationElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 100%;
            transform: translateY(-50%);
            color: ${amount > 0 ? '#28a745' : '#dc3545'};
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

    // Animate gold counter ticking up/down
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
            
            // Add pulse effect during animation with color for negative amounts
            if (progress < 1) {
                const scale = 1 + (Math.sin(progress * Math.PI * 6) * 0.1);
                goldNumberElement.style.transform = `scale(${scale})`;
                if (amount < 0) {
                    goldNumberElement.style.color = '#dc3545';
                }
                requestAnimationFrame(animate);
            } else {
                goldNumberElement.style.transform = 'scale(1)';
                goldNumberElement.style.color = '';
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

    // Export gold data (for saving/syncing) with enhanced data
    exportGoldData() {
        return {
            playerGold: this.playerGold,
            opponentGold: this.opponentGold,
            lastGoldChange: this.lastGoldChange,
            goldHistory: this.goldHistory,
            timestamp: Date.now()
        };
    }

    // Import gold data (for loading/syncing) with enhanced data
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
        
        // Import enhanced tracking data if available
        if (typeof goldData.lastGoldChange === 'number') {
            this.lastGoldChange = goldData.lastGoldChange;
        }
        
        if (Array.isArray(goldData.goldHistory)) {
            this.goldHistory = goldData.goldHistory.slice(0, this.maxHistoryLength);
        }
        
        console.log(`Imported gold data - Player: ${this.playerGold}, Opponent: ${this.opponentGold}, Last Change: ${this.lastGoldChange}`);
        return true;
    }

    // Reset gold to initial state
    reset() {
        this.playerGold = 0;
        this.opponentGold = 0;
        this.animationQueue = [];
        this.isAnimating = false;
        this.lastGoldChange = 0;
        this.goldHistory = [];
        
        console.log('GoldManager reset');
    }

    // Get gold statistics with enhanced data
    getGoldStats() {
        return {
            playerGold: this.playerGold,
            opponentGold: this.opponentGold,
            totalGold: this.playerGold + this.opponentGold,
            lastGoldChange: this.lastGoldChange,
            recentChanges: this.getGoldHistory(3)
        };
    }

    // Log current gold state (for debugging) with enhanced data
    logGoldState() {
        console.log('=== ENHANCED GOLD STATE ===');
        console.log('Player Gold:', this.playerGold);
        console.log('Opponent Gold:', this.opponentGold);
        console.log('Total Gold:', this.playerGold + this.opponentGold);
        console.log('Last Gold Change:', this.lastGoldChange);
        console.log('Recent History:', this.getGoldHistory(3));
        console.log('===========================');
    }
}