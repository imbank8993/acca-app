'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function UserHeartbeat() {
    const pathname = usePathname();

    useEffect(() => {
        const sendHeartbeat = async () => {
            try {
                await fetch('/api/user/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ location: pathname })
                });
            } catch (err) {
                // Silent fail
                console.error('Heartbeat failed', err);
            }
        };

        // Send immediately on path change or mount
        sendHeartbeat();

        // Then every 30 seconds
        const interval = setInterval(sendHeartbeat, 30000);

        return () => clearInterval(interval);
    }, [pathname]);

    return null; // Invisible component
}
