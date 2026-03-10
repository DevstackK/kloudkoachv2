import { useRef, useEffect, useCallback, useState } from 'react';

// --- Configuration ---
// Fallback: if backend doesn't provide MaxDurationMinutes, use 15 min
const DEFAULT_RECONNECT_MS = 15 * 60 * 1000;

// Exponential back-off: 2 s → 4 s → 8 s
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

// How often we probe the data-channel to detect silent disconnects
const HEALTH_CHECK_INTERVAL_MS = 30 * 1000;

// How often we truncate old audio items from the OpenAI context window
const TRUNCATE_INTERVAL_MS = 2 * 60 * 1000; // every 2 minutes

/**
 * Shared hook for managing proactive reconnection, exponential-backoff
 * retries, data-channel health monitoring, and context window truncation
 * for Azure OpenAI Realtime WebRTC sessions.
 */
const useRealtimeReconnect = ({
    connectToAI,
    connectStatus,
    mediaStreamRef,
    dcRef,
    reconnectIntervalMs,
    conversationItemIdsRef,
    onAllRetriesFailed,
}) => {
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectAttempt, setReconnectAttempt] = useState(0);

    // ---------------------------------------------------------------
    // STABLE REFS for callbacks — prevents setInterval from resetting
    // on every render due to inline arrow functions changing identity.
    // ---------------------------------------------------------------
    const connectToAIRef = useRef(connectToAI);
    const onAllRetriesFailedRef = useRef(onAllRetriesFailed);

    useEffect(() => { connectToAIRef.current = connectToAI; }, [connectToAI]);
    useEffect(() => { onAllRetriesFailedRef.current = onAllRetriesFailed; }, [onAllRetriesFailed]);

    // Refs that must survive across renders / closures
    const retryTimerRef = useRef(null);
    const proactiveTimerRef = useRef(null);
    const healthCheckTimerRef = useRef(null);
    const truncateTimerRef = useRef(null);

    // Use backend-provided interval, or fall back to default
    const intervalMs = reconnectIntervalMs || DEFAULT_RECONNECT_MS;

    // ---------------------------------------------------------------
    // Core reconnection (with retry support)
    // Uses refs so this callback has ZERO external deps that change.
    // ---------------------------------------------------------------
    const attemptReconnect = useCallback(async (attempt = 0) => {
        // Guard: can't reconnect without a live media stream
        if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
            console.warn('[Reconnect] ⛔ Media stream is dead — cannot reconnect.');
            if (onAllRetriesFailedRef.current) onAllRetriesFailedRef.current();
            setIsReconnecting(false);
            setReconnectAttempt(0);
            return;
        }

        setIsReconnecting(true);
        setReconnectAttempt(attempt + 1);

        try {
            console.log(`[Reconnect] 🔄 Attempt ${attempt + 1}/${MAX_RETRIES + 1}...`);
            await connectToAIRef.current(true);

            // Success — reset counters
            console.log('[Reconnect] ✅ Reconnect SUCCESS — new session is live');
            setIsReconnecting(false);
            setReconnectAttempt(0);
        } catch (err) {
            console.error(`[Reconnect] ❌ Attempt ${attempt + 1} FAILED:`, err?.response?.status, err?.response?.data || err.message);

            if (attempt < MAX_RETRIES) {
                const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 8000);
                console.log(`[Reconnect] ⏳ Retrying in ${delay}ms...`);

                retryTimerRef.current = setTimeout(() => {
                    attemptReconnect(attempt + 1);
                }, delay);
            } else {
                console.error('[Reconnect] 💀 All retries exhausted — giving up.');
                setIsReconnecting(false);
                setReconnectAttempt(0);
                if (onAllRetriesFailedRef.current) onAllRetriesFailedRef.current();
            }
        }
    }, [mediaStreamRef]); // only depends on the stable ref object

    // ---------------------------------------------------------------
    // Proactive timer — reconnect before the session hard limit
    // Dependencies: connectStatus + intervalMs (both change rarely)
    // attemptReconnect is now STABLE (uses refs), so it won't reset
    // ---------------------------------------------------------------
    useEffect(() => {
        if (connectStatus !== 'connected') {
            clearInterval(proactiveTimerRef.current);
            return;
        }

        console.log(`[Reconnect] ⏰ Proactive timer set for ${(intervalMs / 60000).toFixed(1)} min (${intervalMs}ms)`);
        proactiveTimerRef.current = setInterval(() => {
            console.log('[Reconnect] ♻️ Proactive reconnect triggered — timer fired!');
            attemptReconnect(0);
        }, intervalMs);

        return () => clearInterval(proactiveTimerRef.current);
    }, [connectStatus, intervalMs, attemptReconnect]);

    // ---------------------------------------------------------------
    // Data-channel health check — detect dead connections early
    // ---------------------------------------------------------------
    useEffect(() => {
        if (connectStatus !== 'connected') {
            clearInterval(healthCheckTimerRef.current);
            return;
        }

        healthCheckTimerRef.current = setInterval(() => {
            const dc = dcRef.current;
            if (!dc) {
                console.warn('[Reconnect] 🔍 Health check: DataChannel ref is null — triggering reconnect');
                attemptReconnect(0);
            } else if (dc.readyState !== 'open') {
                console.warn(`[Reconnect] 🔍 Health check: DataChannel state="${dc.readyState}" — triggering reconnect`);
                attemptReconnect(0);
            } else {
                console.debug(`[Reconnect] 🔍 Health check: DataChannel OK (state="${dc.readyState}")`);
            }
        }, HEALTH_CHECK_INTERVAL_MS);

        return () => clearInterval(healthCheckTimerRef.current);
    }, [connectStatus, dcRef, attemptReconnect]);

    // ---------------------------------------------------------------
    // Context window truncation — periodically trim old audio items
    // ---------------------------------------------------------------
    useEffect(() => {
        if (connectStatus !== 'connected') {
            clearInterval(truncateTimerRef.current);
            return;
        }

        truncateTimerRef.current = setInterval(() => {
            const dc = dcRef.current;
            const itemIds = conversationItemIdsRef?.current;

            if (!dc || dc.readyState !== 'open') {
                console.warn('[Truncate] DataChannel not open — skipping truncation');
                return;
            }

            if (!itemIds || itemIds.length === 0) {
                console.log('[Truncate] No tracked conversation items yet — skipping');
                return;
            }

            // Truncate audio from the oldest half of items, keep recent ones
            const cutoff = Math.floor(itemIds.length / 2);
            if (cutoff === 0) {
                console.log('[Truncate] Only 1 item tracked — skipping truncation');
                return;
            }

            const itemsToTruncate = itemIds.slice(0, cutoff);
            console.log(`[Truncate] 🧹 Truncating audio from ${itemsToTruncate.length} oldest items (${itemIds.length} total tracked)`);

            for (const itemId of itemsToTruncate) {
                try {
                    const truncateEvent = {
                        type: "conversation.item.truncate",
                        item_id: itemId,
                        content_index: 0,
                        audio_end_ms: 0,
                    };
                    dc.send(JSON.stringify(truncateEvent));
                    console.log(`[Truncate]   → Truncated item: ${itemId}`);
                } catch (err) {
                    console.warn(`[Truncate] Failed to truncate item ${itemId}:`, err);
                }
            }

            // Remove truncated IDs from the tracking array
            conversationItemIdsRef.current = itemIds.slice(cutoff);
            console.log(`[Truncate] ✅ Done. ${conversationItemIdsRef.current.length} items remaining`);
        }, TRUNCATE_INTERVAL_MS);

        return () => clearInterval(truncateTimerRef.current);
    }, [connectStatus, dcRef, conversationItemIdsRef]);

    // ---------------------------------------------------------------
    // Cleanup on unmount
    // ---------------------------------------------------------------
    useEffect(() => {
        return () => {
            clearTimeout(retryTimerRef.current);
            clearInterval(proactiveTimerRef.current);
            clearInterval(healthCheckTimerRef.current);
            clearInterval(truncateTimerRef.current);
        };
    }, []);

    return {
        isReconnecting,
        reconnectAttempt,
        attemptReconnect,
    };
};

export default useRealtimeReconnect;
