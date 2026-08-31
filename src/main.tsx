import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { StoreProvider, setPresence, getCurrentUserId, useStore } from './data/store';
import { ToastProvider } from './components/Toast';
import { OverdueAlerts } from './components/OverdueAlerts';

function PresenceTracker() {
  const { db } = useStore();
  useEffect(() => {
    // Set presence for current user — defaults to first user (admin) for prototype
    let currentId = getCurrentUserId();
    if (!currentId && db.users.length > 0) {
      currentId = db.users[0].id;
    }
    if (currentId) {
      setPresence(currentId);
      const interval = setInterval(() => setPresence(currentId), 60_000);
      return () => clearInterval(interval);
    }
  }, [db.users]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <ToastProvider>
          <PresenceTracker />
          <OverdueAlerts />
          <App />
        </ToastProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
