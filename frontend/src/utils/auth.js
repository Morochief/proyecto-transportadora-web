import useAuthStore from '../store/authStore';

const ACCESS_EVENT = 'auth:change';

const dispatchAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACCESS_EVENT));
  }
};

export function login({ user, accessToken }) {
  const { setSession } = useAuthStore.getState();
  setSession({ user, accessToken });
  dispatchAuthChange();
}

export function logout() {
  const { clearSession } = useAuthStore.getState();
  clearSession();
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
