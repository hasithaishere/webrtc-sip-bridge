const { Client } = require('rtpengine-client');

class WebRTCHandler {
  constructor() {
    // Initialize Sipwise RTPEngine client
    this.rtpengine = new Client({
      host: process.env.RTPENGINE_HOST || 'localhost',
      port: parseInt(process.env.RTPENGINE_PORT || '2223'),
      timeout: 5000
    });

    this.sessions = new Map();
    
    console.log('Sipwise RTPEngine client initialized');
  }

  /**
   * Process WebRTC offer through Sipwise RTPEngine
   */
  async processOffer(sessionId, sdp) {
    try {
      console.log(`Processing WebRTC offer for session ${sessionId} via Sipwise RTPEngine`);

      // Sipwise RTPEngine offer parameters
      const response = await this.rtpengine.offer({
        'call-id': sessionId,
        'from-tag': `webrtc-${sessionId}`,
        'sdp': sdp,
        // WebRTC to SIP direction
        'direction': ['private', 'public'],
        // ICE handling
        'ICE': 'remove',
        // DTLS (for WebRTC)
        'DTLS': 'passive',
        'DTLS-fingerprint': 'SHA-256',
        // RTCP multiplexing
        'rtcp-mux': ['demux'],
        // SDP manipulation
        'replace': ['origin', 'session-connection'],
        // Codec options
        'codec': {
          'strip': ['all'],
          'offer': ['PCMU', 'PCMA', 'opus'],
          'transcode': ['PCMU', 'PCMA']
        },
        // Flags
        'flags': ['trust-address', 'media-handover'],
        // Transport protocol
        'transport-protocol': 'RTP/AVP',
        // Address family
        'address-family': 'IP4',
        // Media address
        'media-address': process.env.PUBLIC_IP || '127.0.0.1',
        // Record call metadata
        'metadata': {
          'type': 'webrtc-to-sip',
          'session': sessionId
        }
      });

      if (response.result !== 'ok') {
        throw new Error(`Sipwise RTPEngine offer failed: ${response['error-reason'] || 'Unknown error'}`);
      }

      // Store session information
      this.sessions.set(sessionId, {
        callId: sessionId,
        fromTag: `webrtc-${sessionId}`,
        toTag: `sip-${sessionId}`,
        created: Date.now(),
        direction: 'webrtc-to-sip'
      });

      console.log('WebRTC offer processed successfully via Sipwise RTPEngine');
      return response.sdp;

    } catch (error) {
      console.error('Error processing WebRTC offer:', error);
      throw error;
    }
  }

  /**
   * Process SIP answer through Sipwise RTPEngine
   */
  async processAnswer(sessionId, sdp) {
    try {
      console.log(`Processing SIP answer for session ${sessionId} via Sipwise RTPEngine`);

      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Sipwise RTPEngine answer parameters
      const response = await this.rtpengine.answer({
        'call-id': session.callId,
        'from-tag': session.toTag,
        'to-tag': session.fromTag,
        'sdp': sdp,
        // SIP to WebRTC direction
        'direction': ['public', 'private'],
        // ICE handling for WebRTC
        'ICE': 'force',
        // DTLS for WebRTC
        'DTLS': 'passive',
        'DTLS-fingerprint': 'SHA-256',
        // RTCP multiplexing
        'rtcp-mux': ['offer'],
        // SDP manipulation
        'replace': ['origin', 'session-connection'],
        // Codec options
        'codec': {
          'strip': ['all'],
          'offer': ['PCMU', 'PCMA', 'opus'],
          'transcode': ['PCMU', 'PCMA']
        },
        // Flags
        'flags': ['trust-address', 'media-handover'],
        // Transport protocol for WebRTC
        'transport-protocol': 'UDP/TLS/RTP/SAVPF',
        // Address family
        'address-family': 'IP4',
        // Media address
        'media-address': process.env.PUBLIC_IP || '127.0.0.1'
      });

      if (response.result !== 'ok') {
        throw new Error(`Sipwise RTPEngine answer failed: ${response['error-reason'] || 'Unknown error'}`);
      }

      // Update session with complete information
      session.answered = Date.now();
      this.sessions.set(sessionId, session);

      console.log('SIP answer processed successfully via Sipwise RTPEngine');
      return response.sdp;

    } catch (error) {
      console.error('Error processing SIP answer:', error);
      throw error;
    }
  }

  /**
   * Delete RTPEngine session
   */
  async deleteSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        console.log(`Session ${sessionId} not found for deletion`);
        return;
      }

      console.log(`Deleting RTPEngine session ${sessionId}`);

      await this.rtpengine.delete({
        'call-id': session.callId,
        'from-tag': session.fromTag
      });

      this.sessions.delete(sessionId);
      console.log('RTPEngine session deleted');

    } catch (error) {
      console.error('Error deleting RTPEngine session:', error);
      // Don't throw, just log - session cleanup is best effort
    }
  }

  /**
   * Query RTPEngine statistics for a session
   */
  async getStats(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return null;
      }

      const response = await this.rtpengine.query({
        'call-id': session.callId,
        'from-tag': session.fromTag
      });

      return response;

    } catch (error) {
      console.error('Error querying RTPEngine stats:', error);
      return null;
    }
  }

  /**
   * Start recording (if RTPEngine configured for recording)
   */
  async startRecording(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      await this.rtpengine.startRecording({
        'call-id': session.callId,
        'from-tag': session.fromTag
      });

      console.log('Recording started');

    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      await this.rtpengine.stopRecording({
        'call-id': session.callId,
        'from-tag': session.fromTag
      });

      console.log('Recording stopped');

    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Block media stream (mute)
   */
  async blockMedia(sessionId, direction = 'both') {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      await this.rtpengine.blockMedia({
        'call-id': session.callId,
        'from-tag': session.fromTag,
        'direction': direction
      });

      console.log(`Media blocked: ${direction}`);

    } catch (error) {
      console.error('Error blocking media:', error);
      throw error;
    }
  }

  /**
   * Unblock media stream (unmute)
   */
  async unblockMedia(sessionId, direction = 'both') {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      await this.rtpengine.unblockMedia({
        'call-id': session.callId,
        'from-tag': session.fromTag,
        'direction': direction
      });

      console.log(`Media unblocked: ${direction}`);

    } catch (error) {
      console.error('Error unblocking media:', error);
      throw error;
    }
  }
}

module.exports = WebRTCHandler;