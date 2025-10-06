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

    // Setup data channel with battle sync support and browser-specific optimizations
    setupDataChannel(channel) {
        // Detect browser type for optimizations
        const isFirefox = navigator.userAgent.includes('Firefox');
        const isChrome = navigator.userAgent.includes('Chrome');
        
        // Configure channel based on browser
        if (isFirefox) {
            // Firefox-specific optimizations
            channel.bufferedAmountLowThreshold = 16384; // 16KB - lower threshold for Firefox
            
            // Monitor buffer status for Firefox
            channel.onbufferedamountlow = () => {
                this.processBattleMessageQueue();
            };
        } else {
            // Chrome/Edge optimizations
            channel.bufferedAmountLowThreshold = 32768; // 32KB for Chromium browsers
        }
        
        channel.onopen = () => {            
            // Test connection with ping
            const pingStart = Date.now();
            this.sendMessage({
                type: 'ping',
                timestamp: pingStart,
                from: this.roomManager.getIsHost() ? 'host' : 'guest',
                browserType: isFirefox ? 'firefox' : (isChrome ? 'chrome' : 'other')
            });
            
            const isHost = this.roomManager.getIsHost();
            const username = this.uiManager.getCurrentUsername();
            
            if (isHost) {
                this.uiManager.showStatus('🎉 Battle Arena Ready! Direct P2P with sync enabled!', 'connected');
                this.uiManager.showConnectionDetails(
                    '✅ Ultra-fast direct connection established!<br>' +
                    '🎮 Real-time battle data ready!<br>' +
                    '⚡ Latency: Testing...<br>' +
                    '🔗 No server needed - pure P2P!<br>' +
                    '⚔️ Battle synchronization active!' +
                    (isFirefox ? '<br>🦊 Firefox mode: Optimized buffering' : '')
                );
                
                this.sendMessage({
                    type: 'welcome',
                    message: `Welcome to the synchronized battle arena, ${username}!`,
                    from: 'host',
                    playerName: username,
                    browserType: isFirefox ? 'firefox' : (isChrome ? 'chrome' : 'other')
                });
            } else {
                this.uiManager.showStatus('🎉 Battle Arena Ready! Connected directly to host with sync!', 'connected');
                this.uiManager.showConnectionDetails(
                    '✅ Ultra-fast direct connection established!<br>' +
                    '🎮 Real-time battle data ready!<br>' +
                    '⚡ Latency: Testing...<br>' +
                    '🔗 No server needed - pure P2P!<br>' +
                    '⚔️ Battle synchronization active!' +
                    (isFirefox ? '<br>🦊 Firefox mode: Optimized buffering' : '')
                );
                
                this.sendMessage({
                    type: 'joined',
                    message: `${username} has entered the synchronized battle arena!`,
                    from: 'guest',
                    playerName: username,
                    browserType: isFirefox ? 'firefox' : (isChrome ? 'chrome' : 'other')
                });
            }
            
            // Enable battle synchronization
            this.battleSyncEnabled = true;
            this.processBattleMessageQueue();
            
            // Set up periodic keep-alive for Firefox
            if (isFirefox) {
                this.keepAliveInterval = setInterval(() => {
                    if (channel.readyState === 'open') {
                        this.sendMessage({
                            type: 'keepalive',
                            timestamp: Date.now()
                        });
                    }
                }, 5000); // Every 5 seconds
            }
        };

        channel.onclose = () => {
            this.battleSyncEnabled = false;
            
            // Clear Firefox keep-alive if exists
            if (this.keepAliveInterval) {
                clearInterval(this.keepAliveInterval);
                this.keepAliveInterval = null;
            }
            
            if (this.roomManager.getRoomRef()) {
                this.uiManager.showStatus('🔄 Direct connection lost, using Firebase relay...', 'waiting', true);
                this.uiManager.showConnectionDetails(
                    '⚡ P2P connection closed<br>' +
                    '📡 Switched to Firebase relay mode<br>' +
                    '🔄 Game sync still active...<br>' +
                    '⚔️ Battle sync via Firebase (higher latency)'
                );
            }
        };
        
        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Track message statistics for debugging
                if (!this.messageStats) {
                    this.messageStats = {
                        received: 0,
                        processed: 0,
                        errors: 0
                    };
                }
                this.messageStats.received++;
                
                // Handle keep-alive messages silently
                if (data.type === 'keepalive') {
                    return; // Don't process further
                }
                
                // Handle system messages
                if (data.type === 'ping') {
                    this.sendMessage({
                        type: 'pong',
                        originalTimestamp: data.timestamp,
                        timestamp: Date.now(),
                        from: this.roomManager.getIsHost() ? 'host' : 'guest',
                        browserType: isFirefox ? 'firefox' : (isChrome ? 'chrome' : 'other')
                    });
                    
                    // Note peer's browser type if provided
                    if (data.browserType) {
                        this.peerBrowserType = data.browserType;
                    }
                } else if (data.type === 'pong') {
                    const latency = Date.now() - data.originalTimestamp;
                    
                    const currentDetails = this.uiManager.elements.connectionDetails.innerHTML;
                    const updatedDetails = currentDetails.replace('Latency: Testing...', `Latency: ${latency}ms ⚡`);
                    this.uiManager.showConnectionDetails(updatedDetails);
                    
                    // Store peer browser info
                    if (data.browserType) {
                        this.peerBrowserType = data.browserType;
                    }
                    
                    // Update battle sync status based on latency
                    if (latency < 50) {
                        console.log('🟢 Excellent latency for battle synchronization');
                    } else if (latency < 100) {
                        console.log('🟡 Good latency for battle synchronization');
                    } else if (latency < 200) {
                        console.log('🟠 Moderate latency - may experience minor sync delays');
                    } else {
                        console.log('🔴 High latency - battle sync may use Firebase fallback');
                        // Consider switching to Firebase for battle messages if latency is too high
                        if (latency > 300) {
                            this.highLatencyMode = true;
                        }
                    }
                } else if (data.type === 'welcome' && !this.roomManager.getIsHost()) {
                    this.uiManager.showConnectionDetails(
                        `🎉 Host says: ${data.message}<br>` +
                        `✅ P2P connection confirmed!<br>` +
                        `🔗 Direct communication established!<br>` +
                        `⚔️ Battle synchronization ready!` +
                        (data.browserType ? `<br>🌐 Host browser: ${data.browserType}` : '')
                    );
                    if (data.browserType) {
                        this.peerBrowserType = data.browserType;
                    }
                } else if (data.type === 'joined' && this.roomManager.getIsHost()) {
                    this.uiManager.showConnectionDetails(
                        `🎉 ${data.message}<br>` +
                        `✅ P2P connection confirmed!<br>` +
                        `🔗 Direct communication established!<br>` +
                        `⚔️ Battle synchronization ready!` +
                        (data.browserType ? `<br>🌐 Guest browser: ${data.browserType}` : '')
                    );
                    if (data.browserType) {
                        this.peerBrowserType = data.browserType;
                    }
                }
                
                // Delegate to registered message handlers
                if (this.messageHandlers[data.type]) {
                    try {
                        this.messageHandlers[data.type](data);
                        this.messageStats.processed++;
                    } catch (handlerError) {
                        console.error(`Error in handler for ${data.type}:`, handlerError);
                        this.messageStats.errors++;
                        
                        // For critical battle messages, request resync
                        if (data.type === 'battle_data' || data.type === 'hero_turn_execution') {
                            console.log('🔄 Requesting state resync after handler error');
                            this.sendMessage({
                                type: 'request_state_sync',
                                reason: 'handler_error',
                                errorType: data.type
                            });
                        }
                    }
                }
            } catch (parseError) {
                console.error('Failed to parse data channel message:', parseError);
                this.messageStats.errors++;
            }
        };
        
        channel.onerror = (error) => {
            console.error('❌ Data channel error:', error);
            this.battleSyncEnabled = false;
            
            // Clear Firefox keep-alive if exists
            if (this.keepAliveInterval) {
                clearInterval(this.keepAliveInterval);
                this.keepAliveInterval = null;
            }
            
            this.uiManager.showStatus('⚠️ P2P connection error - using Firebase backup...', 'waiting', true);
            this.uiManager.showConnectionDetails(
                '❌ Direct P2P error occurred<br>' +
                '📡 Switching to Firebase relay mode<br>' +
                '🔄 Game functionality maintained...<br>' +
                '⚔️ Battle sync via Firebase' +
                (isFirefox ? '<br>🦊 Firefox fallback mode active' : '')
            );
            
            // Process any queued messages through Firebase
            this.processBattleMessageQueue();
        };
        
        // Log statistics periodically for debugging
        if (!this.statsInterval) {
            this.statsInterval = setInterval(() => {
                if (this.messageStats && this.messageStats.received > 0) {
                    console.log('📊 Message stats:', {
                        received: this.messageStats.received,
                        processed: this.messageStats.processed,
                        errors: this.messageStats.errors,
                        errorRate: ((this.messageStats.errors / this.messageStats.received) * 100).toFixed(1) + '%',
                        bufferAmount: channel.bufferedAmount,
                        readyState: channel.readyState
                    });
                }
            }, 30000); // Every 30 seconds
        }
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