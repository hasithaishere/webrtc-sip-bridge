require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const Srf = require('drachtio-srf');
const { v4: uuidv4 } = require('uuid');
const DrachtioHandler = require('./drachtio-handler');
const WebRTCHandler = require('./webrtc-handler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize Drachtio SRF
const srf = new Srf();
const drachtioHandler = new DrachtioHandler(srf);
const webrtcHandler = new WebRTCHandler();

// Store active sessions
const sessions = new Map();

// Connect to Drachtio server
srf.connect({
    host: process.env.DRACHTIO_HOST || 'localhost',
    port: process.env.DRACHTIO_PORT || 9022,
    secret: process.env.DRACHTIO_SECRET || 'cymru'
});

srf.on('connect', (err, hostport) => {
    if (err) {
        console.error('Error connecting to Drachtio:', err);
        return;
    }
    console.log(`Connected to Drachtio server at ${hostport}`);
});

srf.on('error', (err) => {
    console.error('Drachtio SRF error:', err);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        drachtio: srf.connected ? 'connected' : 'disconnected',
        activeSessions: sessions.size
    });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    const sessionId = uuidv4();
    console.log(`New WebSocket connection: ${sessionId}`);

    const session = {
        id: sessionId,
        ws: ws,
        webrtcHandler: webrtcHandler,
        drachtioHandler: drachtioHandler,
        sipDialog: null,
        peerConnection: null
    };

    sessions.set(sessionId, session);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Message from ${sessionId}:`, data.type);

            switch (data.type) {
                case 'offer':
                    await handleOffer(session, data.sdp);
                    break;

                case 'ice-candidate':
                    await handleIceCandidate(session, data.candidate);
                    break;

                case 'hangup':
                    await handleHangup(session);
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
    });

    ws.on('close', () => {
        console.log(`WebSocket closed: ${sessionId}`);
        handleHangup(session);
        sessions.delete(sessionId);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${sessionId}:`, error);
    });

    // Send session ID to client
    ws.send(JSON.stringify({
        type: 'session-created',
        sessionId: sessionId
    }));
});

// Handle WebRTC offer and create SIP call
async function handleOffer(session, sdp) {
    try {
        console.log('Handling WebRTC offer...');

        // Process WebRTC SDP through RTPEngine
        const rtpEngineOffer = await webrtcHandler.processOffer(session.id, sdp);

        // Create outbound SIP call through Drachtio
        const { dialog, remoteSdp } = await drachtioHandler.createCall(
            session.id,
            rtpEngineOffer,
            {
                host: process.env.SIP_TRUNK_HOST,
                port: process.env.SIP_TRUNK_PORT || 5060,
                username: process.env.SIP_USERNAME,
                password: process.env.SIP_PASSWORD,
                domain: process.env.SIP_DOMAIN
            }
        );

        session.sipDialog = dialog;

        // Process SIP answer through RTPEngine
        const webrtcAnswer = await webrtcHandler.processAnswer(session.id, remoteSdp);

        // Send answer back to WebRTC client
        session.ws.send(JSON.stringify({
            type: 'answer',
            sdp: webrtcAnswer
        }));

        console.log('Call established successfully');

        // Handle SIP dialog termination
        dialog.on('destroy', () => {
            console.log('SIP dialog destroyed');
            webrtcHandler.deleteSession(session.id);
            session.ws.send(JSON.stringify({ type: 'hangup' }));
        });

    } catch (error) {
        console.error('Error handling offer:', error);
        session.ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to establish call: ' + error.message
        }));
    }
}

// Handle ICE candidates
async function handleIceCandidate(session, candidate) {
    // ICE candidates are handled by RTPEngine, no action needed
    console.log('ICE candidate received (handled by RTPEngine)');
}

// Handle call hangup
async function handleHangup(session) {
    try {
        if (session.sipDialog) {
            await session.sipDialog.destroy();
            session.sipDialog = null;
        }

        await webrtcHandler.deleteSession(session.id);

        if (session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({ type: 'hangup' }));
        }

        console.log(`Call hangup for session ${session.id}`);
    } catch (error) {
        console.error('Error during hangup:', error);
    }
}

// Handle incoming SIP calls (optional)
srf.invite((req, res) => {
    console.log('Incoming SIP call - not implemented yet');
    res.send(501, 'Not Implemented');
});

// Start server
const PORT = process.env.SERVER_PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        srf.disconnect();
        process.exit(0);
    });
});