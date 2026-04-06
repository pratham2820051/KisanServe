import React, { useEffect, useState } from 'react';
import { isOnline, onConnectivityChange, getQueue, syncQueue } from '../store/offlineStore';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    const update = () => setPendingCount(getQueue().filter(i => i.status === 'pending' || i.status === 'failed').length);
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cleanup = onConnectivityChange(async (nowOnline) => {
      setOnline(nowOnline);
      if (nowOnline) {
        const token = localStorage.getItem('token');
        if (token) {
          const q = getQueue().filter(i => i.status === 'pending' || i.status === 'failed');
          if (q.length > 0) {
            setSyncing(true);
            setSyncMsg('Syncing offline bookings...');
            const result = await syncQueue(token);
            setSyncing(false);
            setSyncMsg(`✅ Synced ${result.synced} booking${result.synced !== 1 ? 's' : ''}${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
            setTimeout(() => setSyncMsg(''), 4000);
            setPendingCount(getQueue().filter(i => i.status === 'pending' || i.status === 'failed').length);
          }
        }
      }
    });
    return cleanup;
  }, []);

  if (online && pendingCount === 0 && !syncMsg) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
      background: online ? (syncMsg ? '#2d6a4f' : '#f4a261') : '#e63946',
      color: '#fff', borderRadius: 10, padding: '10px 16px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: 13, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 8, maxWidth: 300,
    }}>
      {!online && <span>📵 Offline Mode</span>}
      {!online && pendingCount > 0 && <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 8px' }}>{pendingCount} queued</span>}
      {online && syncing && <span>🔄 {syncMsg}</span>}
      {online && !syncing && syncMsg && <span>{syncMsg}</span>}
      {online && !syncing && !syncMsg && pendingCount > 0 && <span>⚠️ {pendingCount} pending sync</span>}
    </div>
  );
}
