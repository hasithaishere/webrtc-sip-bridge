// WebRTC-SIP Bridge Client
class WebRTCClient {
    constructor() {
        this.ws = null;
        this.pc = null;
        this.sessionId = null;
        this.localStream = null;

        // UI Elements
        this.statusDiv = document.getElementById('status');
        this.callBtn = document.getElementById('callBtn');
        this.hangupBtn = document.getElementById('hangupBtn');
        this.remoteAudio = document.getElementById('remoteAudio');
        this.logsDiv = document.getElementById('logs');

        // WebSocket server URL - change if needed
        this.wsUrl = `ws://${window.location.hostname}:3000`;

        // ICE servers configuration
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ];

        this.init();
    }

    init() {
        this.callBtn.addEventListener('click', () => this.startCall());
        this.hangupBtn.addEventListener('click', () => this.hangup());
        this.connectWebSocket();
    }

    connectWebSocket() {
        this.log('Connecting to signaling server...', 'info');
        this.updateStatus('Connecting...', 'connecting');

        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            this.log('Connected to signaling server', 'success');
            this.updateStatus('Connected - Ready to call', 'connected');
            this.callBtn.disabled = false;
        };

        this.ws.onmessage = (event) => {
            this.handleSignalingMessage(JSON.parse(event.data));
        };

        this.ws.onerror = (error) => {
            this.log(`WebSocket error: ${error}`, 'error');
            this.updateStatus('Connection Error', 'disconnected');
        };

        this.ws.onclose = () => {
            this.log('Disconnected from signaling server', 'error');
            this.updateStatus('Disconnected', 'disconnected');
            this.callBtn.disabled = true;
            this.hangupBtn.disabled = true;
        };
    }

    async handleSignalingMessage(message) {
        this.log(`Received: ${message.type}`, 'info');

        switch (message.type) {
            case 'session-created':
                this.sessionId = message.sessionId;
                this.log(`Session created: ${this.sessionId}`, 'success');
                break;

            case 'answer':
                await this.handleAnswer(message.sdp);
                break;

            case 'ice-candidate':
                await this.handleIceCandidate(message.candidate);
                break;

            case 'hangup':
                this.handleRemoteHangup();
                break;

            case 'error':
                this.log(`Error: ${message.message}`, 'error');
                alert(`Error: ${message.message}`);
                this.cleanup();
                break;

            default:
                this.log(`Unknown message type: ${message.type}`, 'error');
        }
    }

    async startCall() {
        try {
            this.log('Starting call...', 'info');
            this.updateStatus('Setting up call...', 'connecting');
            this.callBtn.disabled = true;

            // Get user media (microphone)
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            this.log('Microphone access granted', 'success');

            // Create peer connection
            this.pc = new RTCPeerConnection({
                iceServers: this.iceServers
            });

            // Add local stream tracks
            this.localStream.getTracks().forEach(track => {
                this.pc.addTrack(track, this.localStream);
                this.log(`Added ${track.kind} track`, 'info');
            });

            // Handle remote stream
            this.pc.ontrack = (event) => {
                this.log('Received remote track', 'success');
                if (this.remoteAudio.srcObject !== event.streams[0]) {
                    this.remoteAudio.srcObject = event.streams[0];
                }
            };

            // Handle ICE candidates
            this.pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.log('ICE candidate generated', 'info');
                    this.sendMessage({
                        type: 'ice-candidate',
                        candidate: event.candidate
                    });
                }
            };

            // Handle connection state changes
            this.pc.onconnectionstatechange = () => {
                this.log(`Connection state: ${this.pc.connectionState}`, 'info');

                switch (this.pc.connectionState) {
                    case 'connected':
                        this.updateStatus('Call Active', 'incall');
                        this.hangupBtn.disabled = false;
                        break;
                    case 'disconnected':
                    case 'failed':
                    case 'closed':
                        this.cleanup();
                        break;
                }
            };

            // Handle ICE connection state
            this.pc.oniceconnectionstatechange = () => {
                this.log(`ICE state: ${this.pc.iceConnectionState}`, 'info');
            };

            // Create and send offer
            const offer = await this.pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });

            await this.pc.setLocalDescription(offer);
            this.log('Created and set local offer', 'success');

            this.sendMessage({
                type: 'offer',
                sdp: offer.sdp
            });

            this.log('Offer sent to server', 'success');

        } catch (error) {
            this.log(`Error starting call: ${error.message}`, 'error');
            alert(`Failed to start call: ${error.message}`);
            this.cleanup();
        }
    }

    async handleAnswer(sdp) {
        try {
            this.log('Received answer from server', 'success');

            const answer = new RTCSessionDescription({
                type: 'answer',
                sdp: sdp
            });

            await this.pc.setRemoteDescription(answer);
            this.log('Remote description set', 'success');

        } catch (error) {
            this.log(`Error handling answer: ${error.message}`, 'error');
            this.cleanup();
        }
    }

    async handleIceCandidate(candidate) {
        try {
            if (this.pc) {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
                this.log('Added ICE candidate', 'info');
            }
        } catch (error) {
            this.log(`Error adding ICE candidate: ${error.message}`, 'error');
        }
    }

    hangup() {
        this.log('Hanging up...', 'info');
        this.sendMessage({ type: 'hangup' });
        this.cleanup();
    }

    handleRemoteHangup() {
        this.log('Remote party hung up', 'info');
        this.cleanup();
    }

    cleanup() {
        this.log('Cleaning up...', 'info');

        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.remoteAudio.srcObject) {
            this.remoteAudio.srcObject.getTracks().forEach(track => track.stop());
            this.remoteAudio.srcObject = null;
        }

        this.updateStatus('Connected - Ready to call', 'connected');
        this.callBtn.disabled = false;
        this.hangupBtn.disabled = true;
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            this.log('WebSocket not connected', 'error');
        }
    }

    updateStatus(text, className) {
        this.statusDiv.textContent = text;
        this.statusDiv.className = `status ${className}`;
    }

    log(message, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.innerHTML = `<span class="log-time">[${time}]</span>${message}`;

        this.logsDiv.appendChild(entry);
        this.logsDiv.scrollTop = this.logsDiv.scrollHeight;

        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Initialize client when page loads
document.addEventListener('DOMContentLoaded', () => {
    new WebRTCClient();
});