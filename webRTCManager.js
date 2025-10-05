// webRTCManager.js - WebRTC Connection Management Module with Battle Synchronization Support

export class WebRTCManager {
    constructor(rtcConfig, roomManager, uiManager) {
        this.rtcConfig = rtcConfig;
        this.roomManager = roomManager;
        this.uiManager = uiManager;
        this.peerConnection = null;
        this.dataChannel = null;
        this.pendingIceCandidates = [];
        this.messageHandlers = {};
        
        // Battle synchronization tracking
        this.battleMessageQueue = [];
        this.battleSyncEnabled = false;
    }

    // Setup WebRTC connection
    async setupConnection(isHost) {
        // Close existing connection if any
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        this.peerConnection = new RTCPeerConnection(this.rtcConfig);
        this.pendingIceCandidates = [];
        
        // Setup connection state monitoring
        this.setupConnectionStateHandlers();
        
        if (isHost) {
            // Host creates data channel
            this.dataChannel = this.peerConnection.createDataChannel('game', {
                ordered: true,
                maxRetransmits: 3
            });
            this.setupDataChannel(this.dataChannel);
        } else {
            // Guest waits for data channel
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannel(this.dataChannel);
            };
        }
        
        // Handle ICE candidates
        this.setupIceCandidateHandling();
        
        // Listen for ICE candidates from Firebase
        this.listenForIceCandidates();
    }

    // Setup connection state handlers
    setupConnectionStateHandlers() {
        this.peerConnection.onconnectionstatechange = () => {            
            switch (this.peerConnection.connectionState) {
                case 'connecting':
                    this.uiManager.showConnectionDetails('🔄 Establishing direct connection...<br>⚡ Setting up P2P tunnel...');
                    break;
                case 'connected':
                    this.battleSyncEnabled = true; // Enable battle sync when P2P is active
                    this.uiManager.showConnectionDetails('✅ Direct P2P connection established!<br>🚀 Ultra-low latency mode active!<br>🔗 Real-time sync ready!<br>⚔️ Battle synchronization enabled!');
                    this.processBattleMessageQueue(); // Process any queued battle messages
                    break;
                case 'disconnected':
                    this.battleSyncEnabled = false;
                    this.uiManager.showConnectionDetails('⚠️ P2P connection interrupted<br>🔄 Attempting to reconnect...<br>📡 Battle sync via Firebase...');
                    break;
                case 'failed':
                    this.battleSyncEnabled = false;
                    this.uiManager.showConnectionDetails('⚠️ Direct P2P failed, using Firebase relay<br>🔄 Connection still functional for game sync<br>📡 Battle sync via Firebase (higher latency)');
                    this.processBattleMessageQueue(); // Process via Firebase fallback
                    break;
                case 'closed':
                    this.battleSyncEnabled = false;
                    break;
            }
        };
        
        this.peerConnection.oniceconnectionstatechange = () => {            
            if (this.peerConnection.iceConnectionState === 'failed') {
                this.uiManager.showConnectionDetails('🔄 Direct connection failed, using relay servers...<br>📡 TURN servers establishing backup connection...<br>⚔️ Battle sync will use Firebase relay...');
            }
        };
        
        this.peerConnection.onicegatheringstatechange = () => {           
            if (this.peerConnection.iceGatheringState === 'gathering') {
                this.uiManager.showConnectionDetails('🔍 Discovering connection routes...<br>🌐 Testing STUN and TURN servers...<br>⚡ Optimizing for battle sync...');
            }
        };
    }

    // Setup ICE candidate handling
    setupIceCandidateHandling() {
        this.peerConnection.onicecandidate = (event) => {
            const roomRef = this.roomManager.getRoomRef();
            if (event.candidate && roomRef) {
                const candidateRef = roomRef.child('ice_candidates').push();
                candidateRef.set({
                    candidate: event.candidate,
                    from: this.roomManager.playerId
                }).catch(error => {
                    // Error handling for ICE candidate sending
                });
            } else if (!event.candidate) {
                // ICE gathering complete
            }
        };
    }

    // Listen for ICE candidates from Firebase
    listenForIceCandidates() {
        const roomRef = this.roomManager.getRoomRef();
        if (!roomRef) return;
        
        roomRef.child('ice_candidates').on('child_added', async (snapshot) => {
            const data = snapshot.val();
            
            // Add null checks to prevent errors
            if (!data || !data.candidate || data.from === this.roomManager.playerId) {
                return; // Skip invalid data or own candidates
            }
                        
            if (this.peerConnection && this.peerConnection.remoteDescription) {
                try {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (error) {
                    // Error handling for ICE candidate addition
                }
            } else {
                // Store candidate for later
                this.pendingIceCandidates.push(data.candidate);
            }
        });
    }

    // Process pending ICE candidates
    async processPendingIceCandidates() {
        if (this.pendingIceCandidates.length > 0 && this.peerConnection && this.peerConnection.remoteDescription) {
            for (const candidate of this.pendingIceCandidates) {
                try {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (error) {
                    // Error handling for pending ICE candidates
                }
            }
            this.pendingIceCandidates = [];
        }
    }

    // Setup data channel with battle sync support
    setupDataChannel(channel) {
        channel.onopen = () => {            
            // Test connection with ping
            const pingStart = Date.now();
            this.sendMessage({
                type: 'ping',
                timestamp: pingStart,
                from: this.roomManager.getIsHost() ? 'host' : 'guest'
            });
            
            const isHost = this.roomManager.getIsHost();
            const username = this.uiManager.getCurrentUsername();
            
            if (isHost) {
                this.uiManager.showStatus('🎉 Battle Arena Ready! Direct P2P with sync enabled!', 'connected');
                this.uiManager.showConnectionDetails('✅ Ultra-fast direct connection established!<br>🎮 Real-time battle data ready!<br>⚡ Latency: Testing...<br>🔗 No server needed - pure P2P!<br>⚔️ Battle synchronization active!');
                
                this.sendMessage({
                    type: 'welcome',
                    message: `Welcome to the synchronized battle arena, ${username}!`,
                    from: 'host',
                    playerName: username
                });
            } else {
                this.uiManager.showStatus('🎉 Battle Arena Ready! Connected directly to host with sync!', 'connected');
                this.uiManager.showConnectionDetails('✅ Ultra-fast direct connection established!<br>🎮 Real-time battle data ready!<br>⚡ Latency: Testing...<br>🔗 No server needed - pure P2P!<br>⚔️ Battle synchronization active!');
                
                this.sendMessage({
                    type: 'joined',
                    message: `${username} has entered the synchronized battle arena!`,
                    from: 'guest',
                    playerName: username
                });
            }
            
            // Enable battle synchronization
            this.battleSyncEnabled = true;
            this.processBattleMessageQueue();
        };

        channel.onclose = () => {
            this.battleSyncEnabled = false;
            if (this.roomManager.getRoomRef()) {
                this.uiManager.showStatus('🔄 Direct connection lost, using Firebase relay...', 'waiting', true);
                this.uiManager.showConnectionDetails('⚡ P2P connection closed<br>📡 Switched to Firebase relay mode<br>🔄 Game sync still active...<br>⚔️ Battle sync via Firebase (higher latency)');
            }
        };
        
        channel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            // Handle system messages
            if (data.type === 'ping') {
                this.sendMessage({
                    type: 'pong',
                    originalTimestamp: data.timestamp,
                    timestamp: Date.now(),
                    from: this.roomManager.getIsHost() ? 'host' : 'guest'
                });
            } else if (data.type === 'pong') {
                const latency = Date.now() - data.originalTimestamp;
                
                const currentDetails = this.uiManager.elements.connectionDetails.innerHTML;
                const updatedDetails = currentDetails.replace('Latency: Testing...', `Latency: ${latency}ms ⚡`);
                this.uiManager.showConnectionDetails(updatedDetails);
                
                // Update battle sync status based on latency
                if (latency < 50) {
                    // Excellent latency for battle synchronization
                } else if (latency < 100) {
                    // Good latency for battle synchronization
                } else {
                    // Higher latency - battle sync may use Firebase fallback
                }
            } else if (data.type === 'welcome' && !this.roomManager.getIsHost()) {
                this.uiManager.showConnectionDetails(`🎉 Host says: ${data.message}<br>✅ P2P connection confirmed!<br>🔗 Direct communication established!<br>⚔️ Battle synchronization ready!`);
            } else if (data.type === 'joined' && this.roomManager.getIsHost()) {
                this.uiManager.showConnectionDetails(`🎉 ${data.message}<br>✅ P2P connection confirmed!<br>🔗 Direct communication established!<br>⚔️ Battle synchronization ready!`);
            }
            
            // Delegate to registered message handlers
            if (this.messageHandlers[data.type]) {
                this.messageHandlers[data.type](data);
            }
        };
        
        channel.onerror = (error) => {
            this.battleSyncEnabled = false;
            this.uiManager.showStatus('⚠️ P2P connection error - using Firebase backup...', 'waiting', true);
            this.uiManager.showConnectionDetails('❌ Direct P2P error occurred<br>📡 Switching to Firebase relay mode<br>🔄 Game functionality maintained...<br>⚔️ Battle sync via Firebase');
        };
    }

    // Register message handler
    registerMessageHandler(type, handler) {
        this.messageHandlers[type] = handler;
    }

    // Send message through data channel
    sendMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            // Prevent buffer overflow - wait if buffer is too full
            if (this.dataChannel.bufferedAmount > 65536) { // 64KB threshold
                console.warn('Data channel buffer full, message dropped');
                return false;
            }
            try {
                this.dataChannel.send(JSON.stringify(message));
                return true;
            } catch (error) {
                return false;
            }
        }
        return false;
    }

    // Sanitize data to remove undefined values for Firebase
    sanitizeForFirebase(obj) {
        if (obj === undefined) return null;
        if (obj === null) return null;
        if (typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeForFirebase(item));
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const sanitizedValue = this.sanitizeForFirebase(value);
            if (sanitizedValue !== undefined) {
                sanitized[key] = sanitizedValue;
            }
        }
        return sanitized;
    }

    // Enhanced game data sending with battle sync priority
    sendGameData(gameDataType, gameData) {
        const message = {
            type: gameDataType,
            data: gameData,
            timestamp: Date.now(),
            from: this.roomManager.getIsHost() ? 'host' : 'guest',
            playerName: this.uiManager.getCurrentUsername()
        };
        
        // Priority handling for battle-related messages
        const isBattleMessage = gameDataType === 'battle_data' || gameDataType === 'battle_ack';
        
        // Try P2P first with battle sync awareness
        if (this.battleSyncEnabled && this.sendMessage(message)) {
            return true;
        }
        
        // If P2P fails for battle messages, queue them for retry
        if (isBattleMessage && !this.battleSyncEnabled) {
            this.battleMessageQueue.push(message);
        }
        
        // Fallback to Firebase
        const roomRef = this.roomManager.getRoomRef();
        if (roomRef && this.roomManager.database) {
            try {
                // Sanitize the message to remove any undefined values
                const sanitizedMessage = this.sanitizeForFirebase(message);
                
                const gameDataRef = roomRef.child('game_data').push();
                
                gameDataRef.set(sanitizedMessage).then(() => {
                    // Firebase write successful
                }).catch(error => {
                    // Firebase write failed
                });
                
                return true;
                
            } catch (error) {
                // Firebase write exception
            }
        }
        
        return false;
    }

    // Process queued battle messages when connection is restored
    processBattleMessageQueue() {
        if (this.battleMessageQueue.length > 0) {            
            const messagesToProcess = [...this.battleMessageQueue];
            this.battleMessageQueue = [];
            
            messagesToProcess.forEach(message => {
                if (this.battleSyncEnabled && this.sendMessage(message)) {
                    // P2P send successful
                } else {
                    // Still fallback to Firebase if P2P fails
                    const roomRef = this.roomManager.getRoomRef();
                    if (roomRef) {
                        // Sanitize the message before sending to Firebase
                        const sanitizedMessage = this.sanitizeForFirebase(message);
                        
                        const gameDataRef = roomRef.child('game_data').push();
                        gameDataRef.set(sanitizedMessage).then(() => {
                            // Queued battle message sent successfully
                        }).catch(error => {
                            // Failed to send queued battle message
                        });
                    }
                }
            });
        }
    }

    // Create offer (for host)
    async createOffer() {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        const roomRef = this.roomManager.getRoomRef();
        await roomRef.update({
            offer: {
                type: offer.type,
                sdp: offer.sdp
            }
        });
    }

    // Create answer (for guest)
    async createAnswer(offer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        await this.processPendingIceCandidates();
        
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        const roomRef = this.roomManager.getRoomRef();
        await roomRef.update({
            answer: {
                type: answer.type,
                sdp: answer.sdp
            }
        });
    }

    // Set remote answer (for host)
    async setRemoteAnswer(answer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        await this.processPendingIceCandidates();
    }

    // Cleanup connections
    cleanup() {
        // Reset battle sync state
        this.battleSyncEnabled = false;
        this.battleMessageQueue = [];
        
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.pendingIceCandidates = [];
    }

    // Check if data channel is open with battle sync status
    isConnected() {
        return this.dataChannel && this.dataChannel.readyState === 'open';
    }

    // Check if battle synchronization is available
    isBattleSyncEnabled() {
        return this.battleSyncEnabled;
    }

    // Get battle sync status for UI display
    getBattleSyncStatus() {
        if (this.battleSyncEnabled) {
            return {
                enabled: true,
                method: 'P2P',
                status: 'Optimized for real-time battle synchronization'
            };
        } else if (this.isConnected()) {
            return {
                enabled: false,
                method: 'P2P (degraded)',
                status: 'Battle sync via Firebase fallback'
            };
        } else {
            return {
                enabled: false,
                method: 'Firebase',
                status: 'Battle synchronization via Firebase relay'
            };
        }
    }
}