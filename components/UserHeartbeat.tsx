'use client';

import { useEffect } from 'react';

export default function UserHeartbeat() {
    useEffect(() => {
        const sendHeartbeat = async () => {
            try {
                await fetch('/api/user/heartbeat', { method: 'POST' });
            } catch (err) {
                // Silent fail
                console.error('Heartbeat failed', err);
            }
        };

        // Send immediately on mount
        sendHeartbeat();

        // Then every 60 seconds
        const interval = setInterval(sendHeartbeat, 60000);

        return () => clearInterval(interval);
    }, []);

    return null; // Invisible component
}
