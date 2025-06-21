'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function SocketDebug() {
    const [socketStatus, setSocketStatus] = useState('Disconnected');
    const [encryptionStatus, setEncryptionStatus] = useState('Not Generated');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev.slice(-5), `${timestamp}: ${message}`]);
        console.log(message);
    };

    useEffect(() => {
        const testEncryption = async () => {
            try {
                addLog('🔐 Testing encryption key generation...');
                const { documentCrypto } = await import('../../../lib/crypto/encryption');
                const key = await documentCrypto.generateKey();
                setEncryptionStatus('Generated Successfully');
                addLog('✅ Encryption key generated successfully');
            } catch (error) {
                setEncryptionStatus(`Error: ${error}`);
                addLog(`❌ Encryption failed: ${error}`);
            }
        };

        let socket: ReturnType<typeof io> | null = null;
        const testSocket = () => {
            addLog('🔌 Testing socket connection...');
            socket = io('http://localhost:3001', {
                transports: ['polling', 'websocket'],
                timeout: 5000
            });

            socket.on('connect', () => {
                setSocketStatus('Connected');
                addLog(`✅ Socket connected with ID: ${socket?.id}`);
            });

            socket.on('connect_error', (err) => {
                setSocketStatus(`Error: ${err.message}`);
                addLog(`❌ Socket connection failed: ${err.message}`);
            });

            socket.on('disconnect', () => {
                setSocketStatus('Disconnected');
                addLog('🔌 Socket disconnected');
            });
        };

        testEncryption();
        testSocket();

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    return (
        <div className="bg-gray-800 text-white p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold mb-3">🔧 Debug Information</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <h4 className="font-medium mb-1">🔌 Socket Status</h4>
                    <div className={`text-sm p-2 rounded ${
                        socketStatus === 'Connected' ? 'bg-green-900' : 
                        socketStatus.includes('Error') ? 'bg-red-900' : 'bg-yellow-900'
                    }`}>
                        {socketStatus}
                    </div>
                </div>
                
                <div>
                    <h4 className="font-medium mb-1">🔐 Encryption Status</h4>
                    <div className={`text-sm p-2 rounded ${
                        encryptionStatus === 'Generated Successfully' ? 'bg-green-900' : 
                        encryptionStatus.includes('Error') ? 'bg-red-900' : 'bg-yellow-900'
                    }`}>
                        {encryptionStatus}
                    </div>
                </div>
            </div>

            <div>
                <h4 className="font-medium mb-1">📋 Recent Logs</h4>
                <div className="bg-gray-900 p-2 rounded text-xs space-y-1 max-h-32 overflow-y-auto">
                    {logs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}
