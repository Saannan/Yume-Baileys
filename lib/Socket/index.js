"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Defaults_1 = require("../Defaults");
const Utils_1 = require("../Utils");
const business_1 = require("./business");
// export the last socket layer
const makeWASocket = (config) => {
    const sock = (0, business_1.makeBusinessSocket)({
        ...Defaults_1.DEFAULT_CONNECTION_CONFIG,
        ...config
    });

    // Auto Reconnect & Session Recovery Configuration
    const autoReconnectConfig = config.autoReconnect || {
        enabled: true,
        maxRetries: 15,
        retryDelay: 2000,
        maxRetryDelay: 10000
    };

    if (autoReconnectConfig.enabled) {
        let reconnectAttempts = 0;
        let reconnectTimeout;

        const attemptReconnect = async () => {
            if (reconnectAttempts >= autoReconnectConfig.maxRetries) {
                sock.logger.error('Max reconnection attempts reached');
                return;
            }

            reconnectAttempts++;
            const delay = Math.min(
                autoReconnectConfig.retryDelay * Math.pow(2, reconnectAttempts - 1),
                autoReconnectConfig.maxRetryDelay
            );

            sock.logger.info(`Attempting to reconnect (${reconnectAttempts}/${autoReconnectConfig.maxRetries}) in ${delay}ms...`);

            reconnectTimeout = setTimeout(async () => {
                try {
                    await sock.reconnect();
                    reconnectAttempts = 0; // Reset on successful reconnect
                    sock.logger.info('Auto reconnection successful!');
                } catch (error) {
                    sock.logger.error({ error }, 'Auto reconnection failed, retrying...');
                    attemptReconnect();
                }
            }, delay);
        };

        // Listen for connection updates
        sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== require('../Types').DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    clearTimeout(reconnectTimeout);
                    attemptReconnect();
                } else {
                    sock.logger.info('Logged out, stopping auto reconnect');
                    clearTimeout(reconnectTimeout);
                }
            } else if (connection === 'open') {
                reconnectAttempts = 0;
                clearTimeout(reconnectTimeout);
                sock.logger.info('Connection restored');
            }
        });

        // Cleanup on process exit
        process.on('SIGINT', () => {
            clearTimeout(reconnectTimeout);
            sock.logger.info('Auto reconnect stopped due to process exit');
        });

        process.on('SIGTERM', () => {
            clearTimeout(reconnectTimeout);
            sock.logger.info('Auto reconnect stopped due to process exit');
        });
    }

    // Anti-Call Feature
    const antiCallConfig = config.antiCall || Defaults_1.DEFAULT_CONNECTION_CONFIG.antiCall;

    if (antiCallConfig.enabled) {
        sock.logger.info('🛡️ Anti-call feature enabled');

        sock.ev.on('call', async (callData) => {
            for (const call of callData) {
                const callerJid = call.from;
                const callId = call.id;
                const callType = call.isVideo ? 'video' : 'voice';

                // Log call attempt
                if (antiCallConfig.logCalls) {
                    sock.logger.info(`📞 Incoming ${callType} call from ${callerJid} (ID: ${callId})`);
                }

                // Check if caller is in allowed list
                const isAllowed = antiCallConfig.allowedNumbers.includes(callerJid);

                if (isAllowed) {
                    if (antiCallConfig.logCalls) {
                        sock.logger.info(`✅ Call from ${callerJid} allowed (whitelisted)`);
                    }
                    continue; // Allow the call
                }

                // Check if we should reject this type of call
                const shouldReject = (call.isVideo && antiCallConfig.rejectVideoCalls) ||
                                   (!call.isVideo && antiCallConfig.rejectVoiceCalls);

                if (shouldReject) {
                    try {
                        // Reject the call
                        await sock.rejectCall(callId, callerJid);

                        if (antiCallConfig.logCalls) {
                            sock.logger.info(`❌ ${callType} call from ${callerJid} rejected`);
                        }

                        // Send custom message if configured
                        if (antiCallConfig.customMessage) {
                            await sock.sendMessage(callerJid, {
                                text: antiCallConfig.customMessage
                            });
                        }

                        // Block the number if configured
                        if (antiCallConfig.blockAfterReject) {
                            await sock.updateBlockStatus(callerJid, 'block');
                            if (antiCallConfig.logCalls) {
                                sock.logger.info(`🚫 ${callerJid} blocked after call rejection`);
                            }
                        }

                    } catch (error) {
                        sock.logger.error({ error }, `Failed to reject ${callType} call from ${callerJid}`);
                    }
                } else {
                    if (antiCallConfig.logCalls) {
                        sock.logger.info(`⏭️ ${callType} call from ${callerJid} not rejected (disabled for this type)`);
                    }
                }
            }
        });
    }

    return sock;
};

/**
 * Create a WhatsApp socket with iOS support
 * Optimized for iOS Safari and Apple devices
 */
const makeWASocketIOS = (config = {}) => {
    // Detect if running on iOS
    const isIOSDevice = (0, Utils_1.isIOS)();

    // iOS specific configuration
    const iosConfig = {
        ...Defaults_1.DEFAULT_CONNECTION_CONFIG,
        ...config,
        // Override with iOS-specific settings
        browser: config.browser || (0, Utils_1.getIOSBrowserConfig)(),
        waWebSocketUrl: config.waWebSocketUrl || 'wss://web.whatsapp.com/ws/chat',
        connectTimeoutMs: config.connectTimeoutMs || 30000,
        keepAliveIntervalMs: config.keepAliveIntervalMs || 25000,
        iosSupport: {
            enabled: true,
            ...Defaults_1.DEFAULT_CONNECTION_CONFIG.iosSupport,
            ...config.iosSupport
        },
        // iOS-specific optimizations
        options: {
            ...Defaults_1.DEFAULT_CONNECTION_CONFIG.options,
            ...config.options,
            // Disable features that might not work well on iOS Safari
            disableMediaPreview: true,
            // Enable iOS-specific workarounds
            iosWorkarounds: true
        }
    };

    // Log iOS detection
    const logger = iosConfig.logger || require('../Utils/logger').default.child({ class: 'baileys-ios' });
    if (isIOSDevice) {
        logger.info('iOS device detected, applying iOS-specific optimizations');
    } else {
        logger.info('Non-iOS device detected, using iOS-compatible configuration');
    }

    return makeWASocket(iosConfig);
};

/**
 * Create a WhatsApp socket optimized for Apple devices (iOS/macOS)
 */
const makeWASocketApple = (config = {}) => {
    const appleConfig = {
        ...Defaults_1.DEFAULT_CONNECTION_CONFIG,
        ...config,
        browser: config.browser || (0, Utils_1.getAppleBrowserConfig)(),
        // Apple device optimizations
        connectTimeoutMs: config.connectTimeoutMs || 25000,
        keepAliveIntervalMs: config.keepAliveIntervalMs || 20000,
        options: {
            ...Defaults_1.DEFAULT_CONNECTION_CONFIG.options,
            ...config.options,
            appleOptimizations: true
        }
    };

    return makeWASocket(appleConfig);
};

exports.default = makeWASocket;
exports.makeWASocketIOS = makeWASocketIOS;
exports.makeWASocketApple = makeWASocketApple;
