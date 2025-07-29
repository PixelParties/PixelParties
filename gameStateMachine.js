// gameStateMachine.js - Simple state machine for game flow

export class GameStateMachine {
    constructor() {
        // Define all possible states
        this.states = {
            // Main game states
            INITIALIZING: 'initializing',
            SELECTING_HERO: 'selecting_hero',
            TEAM_BUILDING: 'team_building',
            WAITING_FOR_BATTLE: 'waiting_for_battle',
            TRANSITIONING_TO_BATTLE: 'transitioning_to_battle',
            IN_BATTLE: 'in_battle',
            VIEWING_REWARDS: 'viewing_rewards',
            
            // Special states
            RECONNECTING: 'reconnecting',
            CLEANING_UP: 'cleaning_up',
            ERROR: 'error'
        };

        // Start in initializing state
        this.currentState = this.states.INITIALIZING;
        this.previousState = null;
        
        // Store additional context about the current state
        this.stateContext = {};
        
        // Define valid transitions (which states can go to which states)
        this.validTransitions = {
            [this.states.INITIALIZING]: [
                this.states.SELECTING_HERO,
                this.states.RECONNECTING,
                this.states.ERROR
            ],
            [this.states.SELECTING_HERO]: [
                this.states.TEAM_BUILDING,
                this.states.RECONNECTING,
                this.states.ERROR
            ],
            [this.states.TEAM_BUILDING]: [
                this.states.WAITING_FOR_BATTLE,
                this.states.RECONNECTING,
                this.states.ERROR
            ],
            [this.states.WAITING_FOR_BATTLE]: [
                this.states.TRANSITIONING_TO_BATTLE,
                this.states.TEAM_BUILDING, // Cancel
                this.states.RECONNECTING,
                this.states.ERROR
            ],
            [this.states.TRANSITIONING_TO_BATTLE]: [
                this.states.IN_BATTLE,
                this.states.ERROR
            ],
            [this.states.IN_BATTLE]: [
                this.states.VIEWING_REWARDS,
                this.states.RECONNECTING,
                this.states.CLEANING_UP,
                this.states.ERROR
            ],
            [this.states.VIEWING_REWARDS]: [
                this.states.TEAM_BUILDING,
                this.states.RECONNECTING,
                this.states.ERROR
            ],
            [this.states.RECONNECTING]: [
                // Can go to any state after reconnecting
                ...Object.values(this.states).filter(s => s !== this.states.RECONNECTING)
            ],
            [this.states.CLEANING_UP]: [
                this.states.INITIALIZING,
                this.states.SELECTING_HERO,
                this.states.TEAM_BUILDING,
                this.states.ERROR
            ],
            [this.states.ERROR]: [
                // Can recover to any state from error
                ...Object.values(this.states).filter(s => s !== this.states.ERROR)
            ]
        };

        // State change listeners
        this.stateChangeListeners = [];
    }

    // Get current state
    getState() {
        return this.currentState;
    }

    // Check if in a specific state
    isInState(state) {
        return this.currentState === state;
    }

    // Check if in any of the provided states
    isInAnyState(states) {
        return states.includes(this.currentState);
    }

    // Transition to a new state
    transitionTo(newState, context = {}) {
        // Check if already in the target state
        if (this.currentState === newState) {
            console.log(`🎮 Already in state: ${newState}, updating context only`);
            // Just update the context without changing state
            this.stateContext = { ...this.stateContext, ...context };
            return true;
        }
        
        // Check if this is a valid transition
        if (!this.canTransitionTo(newState)) {
            console.error(`Invalid state transition: ${this.currentState} -> ${newState}`);
            console.trace(); // Show stack trace to find where this was called
            return false;
        }

        // Store previous state
        this.previousState = this.currentState;
        
        // Update state
        this.currentState = newState;
        this.stateContext = context;
        
        console.log(`🎮 State transition: ${this.previousState} -> ${this.currentState}`, context);
        
        // Notify listeners
        this.notifyStateChange(this.previousState, this.currentState, context);
        
        return true;
    }

    // Check if can transition to a state
    canTransitionTo(newState) {
        const validStates = this.validTransitions[this.currentState] || [];
        return validStates.includes(newState);
    }

    // Add state change listener
    onStateChange(callback) {
        this.stateChangeListeners.push(callback);
    }
    
    // Check if in any of the provided states
    isInAnyState(states) {
        return states.includes(this.currentState);
    }

    // Remove state change listener
    removeStateChangeListener(callback) {
        this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== callback);
    }

    // Notify all listeners of state change
    notifyStateChange(fromState, toState, context) {
        this.stateChangeListeners.forEach(listener => {
            try {
                listener(fromState, toState, context);
            } catch (error) {
                console.error('Error in state change listener:', error);
            }
        });
    }

    // Get state context
    getContext() {
        return this.stateContext;
    }

    // Update context without changing state
    updateContext(updates) {
        this.stateContext = { ...this.stateContext, ...updates };
    }

    // Helper methods for common checks
    canStartBattle() {
        return this.isInState(this.states.WAITING_FOR_BATTLE);
    }

    isInGame() {
        return this.isInAnyState([
            this.states.SELECTING_HERO,
            this.states.TEAM_BUILDING,
            this.states.WAITING_FOR_BATTLE,
            this.states.TRANSITIONING_TO_BATTLE,
            this.states.IN_BATTLE,
            this.states.VIEWING_REWARDS
        ]);
    }

    isInBattleFlow() {
        return this.isInAnyState([
            this.states.WAITING_FOR_BATTLE,
            this.states.TRANSITIONING_TO_BATTLE,
            this.states.IN_BATTLE
        ]);
    }

    // Reset state machine
    reset() {
        this.currentState = this.states.INITIALIZING;
        this.previousState = null;
        this.stateContext = {};
        console.log('🔄 State machine reset to INITIALIZING');
    }
}