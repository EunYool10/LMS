import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserAgreements, UserRole } from '../types';
import { storage } from '../services/storage';
import { authApi } from '../services/authApi';
import { useToast } from './ToastContext';
import { isAdminRole, isServiceOwner } from '../utils/rbac';
import { signInWithGoogleAuth } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isServiceOwner: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  isLoadingSession: boolean;
  login: (email: string, password?: string) => Promise<User | null>;
  register: (name: string, email: string, password: string, agreements: UserAgreements) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: { name?: string; nickname?: string; phone?: string; bio?: string; email?: string }) => void | Promise<void>;
  updateAvatar: (avatarUrl: string | null) => void;
  equipAchievement: (achievementId: string | null) => Promise<{ success: boolean; message: string }>;
  refreshUser: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalMode: 'login' | 'register';
  loginWithKakao: () => Promise<User | null>;
  loginWithNaver: () => Promise<User | null>;
  loginWithGoogle: () => Promise<User | null>;
  isKakaoLoading: boolean;
  isNaverLoading: boolean;
  isGoogleLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => storage.getCurrentUser());
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const { showToast } = useToast();

  // One-time legacy mock keys cleanup migration upon application initialization
  useEffect(() => {
    try {
      const legacyMockKeys = [
        'test_user_data',
        'demo_cache',
        'mock_courses',
        'mock_user',
        'mock_users',
        'mock_progress',
        'dummy_courses',
        'dummy_data',
        'legacy_demo_user',
        'tdsnt_demo_user',
        'tdsnt_test_data',
        'demo_user_data',
        'test_cache',
      ];

      // Remove specific known mock keys
      legacyMockKeys.forEach((k) => {
        try {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        } catch {}
      });

      // Scan and remove any lingering keys prefixed with mock_, dummy_, test_, or demo_
      [localStorage, sessionStorage].forEach((store) => {
        try {
          for (let i = store.length - 1; i >= 0; i--) {
            const key = store.key(i);
            if (
              key &&
              (key.startsWith('mock_') ||
                key.startsWith('dummy_') ||
                key.startsWith('test_') ||
                key.startsWith('demo_'))
            ) {
              store.removeItem(key);
            }
          }
        } catch {}
      });
    } catch (err) {
      console.warn('Legacy mock keys migration cleanup error:', err);
    }
  }, []);

  // On mount: Restore session with token and storage validation
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const currentUser = storage.getCurrentUser();
        const token = authApi.getToken();

        if (currentUser) {
          const isProtectedAdmin =
            currentUser.email?.toLowerCase() === 'teamdevstudiont@gmail.com' ||
            currentUser.email?.toLowerCase() === 'eunyool100208@gmail.com' ||
            currentUser.email?.toLowerCase() === 'deer123424@gmail.com' ||
            currentUser.email?.toLowerCase() === 'ayun24song@gmail.com' ||
            currentUser.id === 'TDSNTLMS' ||
            currentUser.id === 'admin_EunYool' ||
            currentUser.id === 'admin_ayun24song';

          if (isProtectedAdmin && (!currentUser.role || currentUser.role === 'USER')) {
            currentUser.role = 'SUPER_ADMIN';
            storage.setCurrentUser(currentUser);
          }

          if (token) {
            // Verify token validity with backend
            const verification = await authApi.verifySession(token);
            if (!verification.valid) {
              // Token invalid/expired
              storage.setCurrentUser(null);
              authApi.clearToken();
              setUser(null);
              setIsLoadingSession(false);
              return;
            }
          }
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (e) {
        // Fallback to local storage user
        const local = storage.getCurrentUser();
        setUser(local);
      } finally {
        setIsLoadingSession(false);
      }
    };

    restoreSession();
  }, []);

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [isNaverLoading, setIsNaverLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Listen for OAuth callback messages (Kakao & Naver) from popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'KAKAO_AUTH_SUCCESS' || event.data?.type === 'NAVER_AUTH_SUCCESS') {
        const incomingUser = event.data.user as User;
        const token = event.data.token as string;
        const providerName = event.data?.type === 'NAVER_AUTH_SUCCESS' ? '네이버' : '카카오';

        if (token) {
          authApi.setToken(token);
        }

        if (incomingUser) {
          storage.setCurrentUser(incomingUser);
          const existing = storage.getUserById(incomingUser.id);
          if (!existing) {
            storage.createUser(incomingUser);
          } else {
            storage.updateUserProfile(incomingUser.id, {
              name: incomingUser.name,
              avatar: incomingUser.avatar,
            });
          }
          setUser(incomingUser);
          closeAuthModal();
          showToast(
            `${incomingUser.name}님 환영합니다! (${providerName} 로그인)`,
            'success',
            `${providerName} 로그인 성공`
          );
        }
      } else if (event.data?.type === 'KAKAO_AUTH_ERROR') {
        showToast(event.data.message || '카카오 로그인에 실패했습니다.', 'error', '카카오 로그인 실패');
      } else if (event.data?.type === 'NAVER_AUTH_ERROR') {
        showToast(event.data.message || '네이버 로그인에 실패했습니다.', 'error', '네이버 로그인 실패');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [closeAuthModal, showToast]);

  // Handle URL redirect query parameters on initial mount (in case of full page redirect)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const loginStatus = params.get('login');
      if (loginStatus === 'kakao_success' || loginStatus === 'naver_success' || loginStatus === 'google_success') {
        const cur = storage.getCurrentUser();
        const provider = loginStatus.replace('_success', '');
        const providerName = provider === 'naver' ? '네이버' : provider === 'google' ? '구글' : '카카오';
        if (cur) {
          setUser(cur);
          showToast(`${cur.name}님 환영합니다! (${providerName} 로그인)`, 'success', `${providerName} 로그인 완료`);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (loginStatus === 'kakao_error' || loginStatus === 'naver_error' || loginStatus === 'google_error') {
        const errMsg = params.get('message') || '소셜 로그인 처리에 실패했습니다.';
        showToast(errMsg, 'error', '로그인 오류');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {}
  }, [showToast]);

  const loginWithKakao = useCallback(async (): Promise<User | null> => {
    setIsKakaoLoading(true);
    try {
      const config = await authApi.getKakaoConfig();
      if (!config.clientId) {
        showToast(
          '카카오 Client ID(REST API 키)가 설정되지 않았습니다. 관리자 콘솔 시스템 설정 또는 환경변수를 확인해주세요.',
          'warning',
          '카카오 로그인 설정 필요'
        );
        setIsKakaoLoading(false);
        return null;
      }

      const redirectUri = config.redirectUri || `${window.location.origin}/api/auth/kakao/callback`;
      const authorizeUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${encodeURIComponent(config.clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

      const width = 480;
      const height = 660;
      const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
      const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

      const popup = window.open(
        authorizeUrl,
        'kakao_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=1`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = authorizeUrl;
        return null;
      }

      return null;
    } catch (err: any) {
      showToast(err.message || '카카오 로그인 시작 중 오류가 발생했습니다.', 'error', '오류');
      return null;
    } finally {
      setIsKakaoLoading(false);
    }
  }, [showToast]);

  const loginWithNaver = useCallback(async (): Promise<User | null> => {
    setIsNaverLoading(true);
    try {
      const config = await authApi.getNaverConfig();
      if (!config.clientId) {
        showToast(
          '네이버 Client ID가 설정되지 않았습니다. 관리자 콘솔 시스템 설정 또는 환경변수를 확인해주세요.',
          'warning',
          '네이버 로그인 설정 필요'
        );
        setIsNaverLoading(false);
        return null;
      }

      const redirectUri = config.redirectUri || `${window.location.origin}/api/auth/naver/callback`;
      const state = Math.random().toString(36).substring(2, 10);
      const authorizeUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${encodeURIComponent(config.clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

      const width = 480;
      const height = 660;
      const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
      const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

      const popup = window.open(
        authorizeUrl,
        'naver_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=1`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = authorizeUrl;
        return null;
      }

      return null;
    } catch (err: any) {
      showToast(err.message || '네이버 로그인 시작 중 오류가 발생했습니다.', 'error', '오류');
      return null;
    } finally {
      setIsNaverLoading(false);
    }
  }, [showToast]);

  const loginWithGoogle = useCallback(async (): Promise<User | null> => {
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogleAuth();
      if (res && res.user) {
        const verified = await authApi.verifyGoogleUser({
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL,
        });

        if (verified.success && verified.user) {
          if (verified.token) {
            authApi.setToken(verified.token);
          }
          storage.setCurrentUser(verified.user);
          const existing = storage.getUserById(verified.user.id);
          if (!existing) {
            storage.createUser(verified.user);
          } else {
            storage.updateUserProfile(verified.user.id, {
              name: verified.user.name,
              avatar: verified.user.avatar,
            });
          }
          setUser(verified.user);
          closeAuthModal();
          showToast(
            `${verified.user.name}님 환영합니다! (Google 로그인)`,
            'success',
            'Google 로그인 성공'
          );
          return verified.user;
        }
      }
      return null;
    } catch (err: any) {
      console.warn('[Google Auth]', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return null;
      }
      showToast(
        err.message || 'Google 로그인 인증 처리 중 오류가 발생했습니다.',
        'error',
        'Google 로그인 실패'
      );
      return null;
    } finally {
      setIsGoogleLoading(false);
    }
  }, [closeAuthModal, showToast]);

  // Throws on failure so the sign-in form can show the reason next to the fields.
  const login = async (email: string, password = ''): Promise<User | null> => {
    const res = await authApi.login(email, password);
    if (res.success && res.user) {
      storage.setCurrentUser(res.user);
      setUser(res.user);
      closeAuthModal();
      showToast(
        `${res.user.name}님 환영합니다.${res.user.role === 'SUPER_ADMIN' ? ' (총관리자 로그인)' : res.user.role === 'ADMIN' ? ' (강의 관리자 로그인)' : ''}`,
        'success',
        '로그인 완료'
      );
      return res.user;
    }
    return null;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    agreements: UserAgreements
  ): Promise<boolean> => {
    try {
      const res = await authApi.register(name, email, password, agreements);
      if (res.success && res.user) {
        storage.setCurrentUser(res.user);
        setUser(res.user);
        closeAuthModal();
        showToast(
          `${res.user.name}님의 수강생 계정이 등록되었습니다. TDSNTLMS에 오신 것을 환영합니다!`,
          'success',
          '회원가입 완료'
        );
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err.message || '회원가입에 실패했습니다.', 'error', '회원가입 실패');
      return false;
    }
  };

  const logout = () => {
    authApi.clearToken();
    storage.setCurrentUser(null);
    setUser(null);
    showToast('안전하게 로그아웃되었습니다.', 'info');
  };

  const refreshUser = useCallback(() => {
    const cur = storage.getCurrentUser();
    if (cur) {
      // Fetch latest from user list in storage
      const latest = storage.getUserById(cur.id);
      if (latest) {
        storage.setCurrentUser(latest);
        setUser(latest);
      } else {
        setUser(cur);
      }
    }
  }, []);

  // Listen for user profile updates across components to keep state synchronized simultaneously
  useEffect(() => {
    const handleProfileUpdated = (e: any) => {
      const updatedUser = e?.detail as User | undefined;
      if (updatedUser) {
        setUser((prev) => {
          if (!prev || prev.id === updatedUser.id) {
            return { ...updatedUser };
          }
          return prev;
        });
      }
    };
    window.addEventListener('user-profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdated);
    };
  }, []);

  const updateProfile = async (data: { name?: string; nickname?: string; phone?: string; bio?: string; email?: string }) => {
    if (!user) return;
    try {
      if (data.email && data.email.trim().toLowerCase() !== user.email.toLowerCase()) {
        await fetch('/api/me/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, email: data.email.trim().toLowerCase(), role: user.role }),
        }).catch(() => {});
      }
    } catch {}

    const updated = storage.updateUserProfile(user.id, data, { id: user.id, name: user.name });
    if (updated) {
      setUser(updated);
      showToast('프로필 정보가 성공적으로 수정되었습니다.', 'success');
    }
  };

  const updateAvatar = (avatarUrl: string | null) => {
    if (!user) return;
    const updated = storage.updateUserAvatar(user.id, avatarUrl, { id: user.id, name: user.name });
    if (updated) {
      setUser(updated);
      showToast(avatarUrl ? '프로필 사진이 적용되었습니다.' : '기본 프로필로 초기화되었습니다.', 'success');
    }
  };

  const equipAchievement = async (achievementId: string | null): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: '로그인이 필요합니다.' };

    try {
      await fetch('/api/me/equipped-achievement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          achievementId,
          role: user.role,
        }),
      });
    } catch {
      // Local fallback continues
    }

    const res = storage.equipAchievement(user.id, achievementId);
    if (res.success && res.user) {
      setUser(res.user);
      showToast(res.message, 'success', '프로필 장식');
    } else {
      showToast(res.message, 'error', '장식 적용 실패');
    }
    return res;
  };

  const role = user?.role || null;
  const isAuthenticated = !!user;
  const serviceOwner = isServiceOwner(role);
  const isSuperAdmin = serviceOwner; // Backwards-compatible alias
  const isServiceOwnerUser = serviceOwner;
  const admin = isAdminRole(role);
  const isStudent = !admin;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isSuperAdmin,
        isServiceOwner: isServiceOwnerUser,
        isAdmin: admin,
        isStudent,
        isLoadingSession,
        login,
        register,
        logout,
        updateProfile,
        updateAvatar,
        equipAchievement,
        refreshUser,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        loginWithKakao,
        loginWithNaver,
        loginWithGoogle,
        isKakaoLoading,
        isNaverLoading,
        isGoogleLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
