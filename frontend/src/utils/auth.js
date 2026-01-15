import api, { refreshSession } from '../api/api';
import useAuthStore from '../store/authStore';

const ACCESS_EVENT = 'auth:change';

const dispatchAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACCESS_EVENT));
  }
};

export function login({ user, accessToken }) {
  const { setSession, setAuthReady } = useAuthStore.getState();
  setSession({ user, accessToken });
  setAuthReady(true);
  dispatchAuthChange();
}

export function logout() {
  const { clearSession, setAuthReady } = useAuthStore.getState();
  clearSession();
  setAuthReady(true);
  dispatchAuthChange();
}

export function getToken() {
  return useAuthStore.getState().accessToken;
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function getCurrentUser() {
  return useAuthStore.getState().user;
}

let bootstrapPromise = null;

export async function bootstrapSession() {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }
  bootstrapPromise = (async () => {
    const { accessToken, user, setSession, clearSession, setAuthReady } = useAuthStore.getState();
    if (accessToken) {
      setAuthReady(true);
      return true;
    }
    try {
      const newAccess = await refreshSession();
      if (!newAccess) {
        return false;
      }
      try {
        const meResponse = await api.get('/auth/me');
        setSession({ user: meResponse.data, accessToken: newAccess });
      } catch (err) {
        if (user) {
          setSession({ user, accessToken: newAccess });
        } else {
          clearSession();
          return false;
        }
      }
      return true;
    } catch (err) {
      const { accessToken: latestToken } = useAuthStore.getState();
      if (!latestToken) {
        clearSession();
      }
      return false;
    } finally {
      setAuthReady(true);
    }
  })();
  return bootstrapPromise;
}

export function onAuthChange(callback) {
  if (typeof window === 'undefined') {
    return () => { };
  }
  const handler = () => callback(isLoggedIn());
  window.addEventListener(ACCESS_EVENT, handler);
  const unsubscribe = useAuthStore.subscribe(() => handler());
  return () => {
    window.removeEventListener(ACCESS_EVENT, handler);
    unsubscribe();
  };
}
