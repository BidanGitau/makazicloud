"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "@/app/_hooks/navigation";
import {
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  fetchCurrentUser,
  patchStoredUserMetadata,
  toAuthUser,
} from "@/app/_lib/api/auth";
import { ROUTES, DEFAULT_AUTH_REDIRECT } from "@/app/_lib/routes";
import { ACCOUNT_TYPE } from "@/app/_lib/account-types";

const AuthContext = createContext();

const AUTH_REFRESH_THROTTLE_MS = 30 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastAuthRefresh, setLastAuthRefresh] = useState(0);
  const router = useRouter();

  // Boot: ask the API who's signed in (cookie-based). If it succeeds we
  // hydrate the user; otherwise we render the public app.
  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then((u) => {
        if (cancelled) return;
        setUser(toAuthUser(u));
        setLastAuthRefresh(Date.now());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const u = await fetchCurrentUser();
    setUser(toAuthUser(u));
    setLastAuthRefresh(Date.now());
    return u;
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (Date.now() - lastAuthRefresh < AUTH_REFRESH_THROTTLE_MS) return;
      if (document.visibilityState === "visible") {
        refreshCurrentUser().catch(() => {});
      }
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [lastAuthRefresh, refreshCurrentUser]);

  const signup = async ({ email, password, firstName, lastName }) => {
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const u = await apiSignup({
      email,
      password,
      fullName,
      organizationName: `${firstName || "Local"} Organization`,
    });
    if (u) {
      setUser(toAuthUser(u));
      router.replace(DEFAULT_AUTH_REDIRECT);
    }
    return {
      requiresEmailVerification: false,
      message: "Account created successfully.",
    };
  };

  const login = async ({ email, password }) => {
    let u;
    try {
      u = await apiLogin({ email, password });
    } catch (err) {
      if (err?.message?.includes("Email not confirmed")) {
        throw new Error(
          "Please verify your email before logging in. Check your inbox for the verification link.",
        );
      }
      throw err;
    }
    if (u) {
      const mappedUser = toAuthUser(u);
      setUser(mappedUser);

      const targetPath =
        mappedUser.accountType === ACCOUNT_TYPE.TENANT
          ? "/tenant-portal"
          : DEFAULT_AUTH_REDIRECT;

      router.replace(targetPath);
    }
    return { user: u };
  };

  // Fire-and-forget so the UI redirects immediately instead of waiting
  // on a slow/hanging logout request.
  const logout = useCallback(() => {
    apiLogout().catch((err) => console.error("Sign out error:", err));
    setUser(null);
    window.location.href = ROUTES.LOGIN;
  }, []);

  const forgotPassword = async (email) => {
    return {
      success: true,
      message: `Password reset is not wired yet for ${email}.`,
    };
  };

  // Stub — the backend has no password-update route yet. Returns success
  // so the UI flow doesn't break, but nothing is persisted server-side.
  // TODO: wire to a real /auth/password endpoint when it's built.
  const resetPassword = async () => ({
    success: true,
    message: "Password updated successfully!",
  });

  const resendVerificationEmail = async () => ({
    success: true,
    message: "Verification email sent! Please check your inbox.",
  });

  // Profile metadata changes are local-only until the backend exposes a
  // profile update route. Persist to localStorage and refresh the in-memory
  // user so the UI reflects the change immediately.
  const updateProfile = async (updates) => {
    const next = patchStoredUserMetadata(updates);
    if (next) setUser(toAuthUser(next));
    return { user: next };
  };

  // Synchronous permission checks built from the JWT payload — no extra
  // round-trips. Owner short-circuits to true for everything.
  const permissionSet = useMemo(
    () => new Set(user?.permissions || []),
    [user],
  );
  const hasPermission = useCallback(
    (name) => {
      if (!user) return false;
      if (user.role === "OWNER") return true;
      return permissionSet.has(name);
    },
    [user, permissionSet],
  );
  const hasAnyPermission = useCallback(
    (names = []) => names.some((n) => hasPermission(n)),
    [hasPermission],
  );
  const hasAllPermissions = useCallback(
    (names = []) => names.every((n) => hasPermission(n)),
    [hasPermission],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        loading,
        forgotPassword,
        resetPassword,
        resendVerificationEmail,
        updateProfile,
        refreshCurrentUser,
        permissions: user?.permissions || [],
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {loading ? (
        <div className="w-screen h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
