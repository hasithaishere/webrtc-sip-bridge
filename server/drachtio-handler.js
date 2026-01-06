const sdpTransform = require('sdp-transform');

class DrachtioHandler {
    constructor(srf) {
        this.srf = srf;
    }

    /**
     * Create an outbound SIP call
     */
    async createCall(sessionId, sdp, sipConfig) {
        const { host, port, username, password, domain } = sipConfig;

        // Generate a unique call-id
        const callId = `${sessionId}@${domain || host}`;

        // Construct SIP URI
        const sipUri = `sip:${username}@${host}:${port}`;

        // Prepare SIP headers
        const headers = {
            'Call-ID': callId,
            'User-Agent': 'WebRTC-SIP-Bridge/1.0',
            'Contact': `<sip:bridge@${process.env.PUBLIC_IP || '127.0.0.1'}>`,
            'Content-Type': 'application/sdp'
        };

        // Add authentication if credentials provided
        const auth = password ? {
            username: username,
            password: password
        } : null;

        try {
            console.log(`Creating SIP call to ${sipUri}`);

            const dialog = await this.srf.createUAC(sipUri, {
                localSdp: sdp,
                headers: headers,
                auth: auth
            });

            console.log('SIP dialog created successfully');

            return {
                dialog: dialog,
                remoteSdp: dialog.remote.sdp
            };

        } catch (error) {
            console.error('Error creating SIP call:', error);
            throw new Error(`SIP call failed: ${error.message}`);
        }
    }

    /**
     * Handle incoming SIP INVITE
     */
    async handleIncomingCall(req, res, onAnswer) {
        try {
            console.log('Handling incoming SIP call');

            const offer = req.body;

            // Get answer from callback
            const answer = await onAnswer(offer);

            // Create UAS dialog
            const dialog = await this.srf.createUAS(req, res, {
                localSdp: answer
            });

            console.log('Incoming call dialog created');

            return dialog;

        } catch (error) {
            console.error('Error handling incoming call:', error);
            res.send(500, 'Internal Server Error');
            throw error;
        }
    }

    /**
     * Send DTMF via SIP INFO
     */
    async sendDTMF(dialog, digit) {
        try {
            await dialog.request({
                method: 'INFO',
                headers: {
                    'Content-Type': 'application/dtmf-relay'
                },
                body: `Signal=${digit}\r\nDuration=100`
            });
            console.log(`Sent DTMF: ${digit}`);
        } catch (error) {
            console.error('Error sending DTMF:', error);
        }
    }

    /**
     * Modify SDP for specific requirements
     */
    modifySdp(sdp, options = {}) {
        const parsed = sdpTransform.parse(sdp);

        // Add or modify attributes as needed
        if (options.addAttribute) {
            parsed.media.forEach(m => {
                if (!m.attributes) m.attributes = [];
                m.attributes.push(options.addAttribute);
            });
        }

        // Ensure specific codecs
        if (options.preferredCodecs) {
            parsed.media.forEach(m => {
                if (m.type === 'audio') {
                    const codecs = options.preferredCodecs.join(' ');
                    m.payloads = codecs;
                }
            });
        }

        return sdpTransform.write(parsed);
    }

    /**
     * Extract codec information from SDP
     */
    getCodecs(sdp) {
        const parsed = sdpTransform.parse(sdp);
        const codecs = [];

        parsed.media.forEach(m => {
            if (m.type === 'audio' && m.rtp) {
                m.rtp.forEach(rtp => {
                    codecs.push({
                        payloadType: rtp.payload,
                        codec: rtp.codec,
                        rate: rtp.rate
                    });
                });
            }
        });

        return codecs;
    }
}

module.exports = DrachtioHandler;