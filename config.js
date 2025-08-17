// config.js - Configuration Module for Project Pixel Parties

export const firebaseConfig = {
    apiKey: "AIzaSyDovRSsFdaDlE5YoE9c8BxITxeVgvAhcAI",
    authDomain: "project-pixel-parties.firebaseapp.com",
    databaseURL: "https://project-pixel-parties-default-rtdb.firebaseio.com/",
    projectId: "project-pixel-parties",
    storageBucket: "project-pixel-parties.firebasestorage.app",
    messagingSenderId: "505973276392",
    appId: "1:505973276392:web:4ee613d80ac413d773135d"
};

// WebRTC configuration with multiple reliable TURN servers
export const rtcConfig = {
    iceServers: [
        // STUN servers (help discover public IP)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        
        // More reliable free TURN servers (multiple backups)
        {
            urls: [
                'turn:a01.fra1.github.turn.relay.metered.ca:80',
                'turn:a01.fra1.github.turn.relay.metered.ca:80?transport=tcp',
                'turn:a01.fra1.github.turn.relay.metered.ca:443',
                'turn:a01.fra1.github.turn.relay.metered.ca:443?transport=tcp'
            ],
            username: 'f4b4035aeb56b3018b187f78',
            credential: 'NdIgWcPTkKqkWm8HGBgzY/VBTac='
        },
        {
            urls: [
                'turn:global.relay.metered.ca:80',
                'turn:global.relay.metered.ca:80?transport=tcp',
                'turn:global.relay.metered.ca:443',
                'turn:global.relay.metered.ca:443?transport=tcp'
            ],
            username: 'f4b4035aeb56b3018b187f78',
            credential: 'NdIgWcPTkKqkWm8HGBgzY/VBTac='
        },
        
        // Alternative backup TURN servers
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        
        // Additional free TURN server
        {
            urls: [
                'turn:relay1.expressturn.com:3478',
                'turns:relay1.expressturn.com:5349'
            ],
            username: 'ef0SQZTF6318K748ZNQRM',
            credential: 'jCKusKDSw8K7w7J'
        }
    ],
    
    // Enhanced configuration for better connectivity
    iceCandidatePoolSize: 15,
    rtcpMuxPolicy: 'require',
    bundlePolicy: 'max-bundle',
    
    // Additional configuration for reliability
    iceTransportPolicy: 'all', // Use all available methods
    sdpSemantics: 'unified-plan'
};

// Game configuration
export const gameConfig = {
    characterFiles: [
        'Alice.png', 'Cecilia.png', 'Darge.png', 'Gon.png', 'Ida.png', 'Medea.png',
        'Monia.png', 'Nicolas.png', 'Semi.png', 'Sid.png', 'Tharx.png', 'Toras.png', 'Vacarn.png'
    ],
    charactersPath: './Cards/Characters/',
    roomTimeout: 60000000, // 1000 minutes
    activityTimeout: 3000000, // 50 minutes
    activityInterval: 30000 // 30 seconds
};