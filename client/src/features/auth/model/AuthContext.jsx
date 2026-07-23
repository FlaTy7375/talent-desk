import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../../../shared/api/supabase";

const AuthContext = createContext(null);

async function fetchAppUser(accessToken) {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applySession = useCallback(async (session, { silentAuthError = false } = {}) => {
    if (!session?.access_token) {
      setUser(null);
      setAccessToken(null);
      return;
    }

    setAccessToken(session.access_token);
    try {
      const appUser = await fetchAppUser(session.access_token);
      setUser(appUser);
    } catch (err) {
      setUser(null);
      setAccessToken(null);
      if (err.status === 401 || silentAuthError) return;
      throw err;
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!alive) return;
        await applySession(data.session, { silentAuthError: true });
      } catch (err) {
        if (alive) {
          setError(err.message);
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === "SIGNED_OUT") {
            setUser(null);
            setAccessToken(null);
            setError(null);
            return;
          }
          await applySession(session, {
            silentAuthError: event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION",
          });
          setError(null);
        } catch (err) {
          if (err.status !== 401) setError(err.message);
          else setError(null);
          setUser(null);
          setAccessToken(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, [applySession]);

  async function loginWithGoogle() {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  }

  async function loginWithGithub() {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  }

  async function loginWithEmail(email, password) {
    setError(null);
    const { data, error: emailError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (emailError) {
      setError(emailError.message);
      throw emailError;
    }
    return data;
  }

  async function registerWithEmail({ name, email, password }) {
    setError(null);
    const { data, error: emailError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (emailError) {
      setError(emailError.message);
      throw emailError;
    }
    return { ...data, needsConfirmation: !data.session };
  }

  function clearError() {
    setError(null);
  }

  function updateLocalAvatar(avatarUrl) {
    const next =
      typeof avatarUrl === "string" && /^https?:\/\//i.test(avatarUrl.trim())
        ? avatarUrl.trim()
        : null;
    setUser((current) => (current ? { ...current, avatarUrl: next } : current));
  }

  function updateLocalName(name) {
    setUser((current) => (current ? { ...current, name } : current));
  }

  async function logout() {
    setError(null);
    setUser(null);
    setAccessToken(null);
    try {
      await supabase.auth.signOut();
    } catch {

    }
  }

  async function refreshUser() {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    await applySession(data.session);
  }


  async function devSetRole(role) {
    if (!accessToken) throw new Error("Not logged in");
    const res = await fetch("/api/auth/dev/set-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Failed");
    setUser(data.user);
    return data.user;
  }

  const value = {
    user,
    accessToken,
    loading,
    error,
    isAuthenticated: Boolean(user),
    loginWithGoogle,
    loginWithGithub,
    loginWithEmail,
    registerWithEmail,
    clearError,
    updateLocalAvatar,
    updateLocalName,
    logout,
    refreshUser,
    devSetRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
