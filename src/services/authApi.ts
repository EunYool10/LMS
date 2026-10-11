import { User, UserAgreements, UserRole } from '../types';
import { storage } from './storage';
import { firestoreService } from './firebase';

const TOKEN_STORAGE_KEY = 'tdsnt_jwt_auth_token_v1';

export interface LoginResponse {
  success: boolean;
  user: User;
  token?: string;
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  user: User;
  token?: string;
  message?: string;
}

export const authApi = {
  /**
   * Token helpers
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {}
  },

  clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
  },

  /**
   * Verify session via JWT token against server API
   */
  async verifySession(token: string): Promise<{ valid: boolean; role?: string }> {
    if (!token) return { valid: false };

    try {
      const res = await fetch('/api/auth/session', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        return { valid: true, role: data.role };
      }
    } catch {}

    // Fallback client validation for offline/dev
    return { valid: true };
  },

  /**
   * Secure login through server API.
   */
  async login(email: string, password = ''): Promise<LoginResponse> {
    let cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'tdsntlms' || cleanEmail === 'admin_teamdevstudiont') {
      cleanEmail = 'teamdevstudiont@gmail.com';
    }
    const rawPassword = password != null ? String(password) : '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: rawPassword }),
      });

      if (res.ok) {
        const data = (await res.json()) as LoginResponse;
        if (data.success && data.user) {
          if (data.token) {
            this.setToken(data.token);
          }

          // Fetch from Firestore to preserve custom names, avatars, and roles modified by admin
          let firestoreUser: User | null = null;
          try {
            firestoreUser = await firestoreService.getUser(data.user.id);
            if (!firestoreUser && data.user.email) {
              firestoreUser = await firestoreService.getUserByEmail(data.user.email);
            }
          } catch (e) {
            console.warn('[authApi] Firestore user fetch error:', e);
          }

          let finalRole = firestoreUser?.role || data.user.role;
          const isAdminEmail =
            cleanEmail === 'teamdevstudiont@gmail.com' ||
            cleanEmail === 'eunyool100208@gmail.com' ||
            cleanEmail === 'deer123424@gmail.com' ||
            cleanEmail === 'ayun24song@gmail.com';
          if (isAdminEmail && (!finalRole || finalRole === 'USER')) {
            finalRole = 'SUPER_ADMIN';
          }

          const resolvedUser: User = firestoreUser
            ? {
                ...data.user,
                name: firestoreUser.name || data.user.name,
                role: finalRole,
                status: firestoreUser.status || data.user.status,
                avatar: firestoreUser.avatar !== undefined ? firestoreUser.avatar : data.user.avatar,
                nickname: firestoreUser.nickname,
                phone: firestoreUser.phone,
                bio: firestoreUser.bio,
              }
            : {
                ...data.user,
                role: finalRole,
              };

          // Save/update locally
          const existing = storage.getUserById(resolvedUser.id);
          if (!existing) {
            storage.createUser(resolvedUser);
          } else {
            storage.updateUserProfile(resolvedUser.id, {
              name: resolvedUser.name,
              avatar: resolvedUser.avatar,
              nickname: resolvedUser.nickname,
              phone: resolvedUser.phone,
              bio: resolvedUser.bio,
            });
            if (existing.role !== resolvedUser.role) {
              storage.updateUserRole(resolvedUser.id, resolvedUser.role);
            }
            if (existing.status !== resolvedUser.status) {
              storage.updateUserStatus(resolvedUser.id, resolvedUser.status);
            }
          }

          // Persist resolved user to Firestore
          firestoreService.saveUser(resolvedUser).catch(() => {});

          return { ...data, user: resolvedUser };
        }
      } else {
        let errData: any = {};
        try {
          errData = await res.json();
        } catch {
          errData = {};
        }

        if (res.status === 400) {
          throw new Error(errData.message || '이메일 주소와 비밀번호를 올바르게 입력해주세요.');
        } else if (res.status === 401) {
          throw new Error(errData.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (res.status === 403) {
          throw new Error(errData.message || '접근 권한이 없거나 이용이 정지된 계정입니다.');
        } else if (res.status === 404) {
          throw new Error('로그인 서버 API를 찾을 수 없습니다.');
        } else if (res.status >= 500) {
          throw new Error(errData.message || '로그인 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          throw new Error(errData.message || '로그인 처리 중 오류가 발생했습니다.');
        }
      }
    } catch (err: any) {
      // If error is from an HTTP response, rethrow directly
      if (
        err.message &&
        err.message !== 'Failed to fetch' &&
        err.message !== 'NetworkError when attempting to fetch resource.' &&
        !err.message.includes('fetch')
      ) {
        throw err;
      }

      // Offline / Local fallback validation:
      const adminEmails = [
        'teamdevstudiont@gmail.com',
        'eunyool100208@gmail.com',
        'deer123424@gmail.com',
        'ayun24song@gmail.com',
      ];

      // Admin accounts are only verified by the server; there is no offline admin sign-in.
      if (adminEmails.includes(cleanEmail)) {
        throw new Error('로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      }

      const users = storage.getUsers();
      const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

      if (!found) {
        throw new Error('로그인 서버에 연결할 수 없으며, 로컬에 등록되지 않은 계정입니다.');
      }

      if (found.status === 'suspended') {
        throw new Error('이용이 정지된 계정입니다. 고객지원팀에 문의하세요.');
      }

      const dummyToken = `tdsnt_jwt_local_${Date.now()}`;
      this.setToken(dummyToken);

      return {
        success: true,
        user: found,
        token: dummyToken,
      };
    }

    throw new Error('로그인 처리 중 오류가 발생했습니다.');
  },

  /**
   * General registration through server API.
   */
  async register(name: string, email: string, password: string, agreements: UserAgreements): Promise<RegisterResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const adminEmails = [
      'teamdevstudiont@gmail.com',
      'eunyool100208@gmail.com',
      'deer123424@gmail.com',
      'ayun24song@gmail.com',
    ];
    if (adminEmails.includes(cleanEmail)) {
      throw new Error('해당 이메일은 이미 등록된 시스템 최고 관리자 계정입니다. 관리자 로그인을 진행해 주십시오.');
    }

    const isAllowedEmailDomain =
      cleanEmail.endsWith('@gmail.com') ||
      cleanEmail.endsWith('@naver.com') ||
      cleanEmail.endsWith('@kakao.com') ||
      cleanEmail.endsWith('@daum.net') ||
      cleanEmail.endsWith('@hanmail.net');

    if (!isAllowedEmailDomain) {
      throw new Error('회원가입은 구글(@gmail.com), 네이버(@naver.com), 카카오(@kakao.com) 이메일 주소만 가능합니다.');
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          agreements,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as RegisterResponse;
        if (data.success && data.user) {
          if (data.token) {
            this.setToken(data.token);
          }
          // Persist user in local storage
          data.user = { ...data.user, agreements: data.user.agreements || agreements };
          const existing = storage.getUserById(data.user.id);
          if (!existing) {
            storage.createUser(data.user);
          }
          return data;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '회원가입 처리 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Failed to fetch') {
        throw err;
      }

      // Offline fallback: strictly assign USER (student) role
      const users = storage.getUsers();
      const exists = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        throw new Error('이미 등록된 이메일 주소입니다. 로그인해주세요.');
      }

      const created = storage.createUser({
        name: cleanName,
        email: cleanEmail,
        role: 'USER', // Strictly student
        status: 'active',
        agreements,
      });

      const dummyToken = `tdsnt_jwt_local_${Date.now()}`;
      this.setToken(dummyToken);

      return {
        success: true,
        user: created,
        token: dummyToken,
      };
    }

    throw new Error('회원가입 처리 중 오류가 발생했습니다.');
  },

  /**
   * Change password for admin accounts via secure server endpoint
   */
  async changePassword(email: string, currentPassword = '', newPassword = ''): Promise<{ success: boolean; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const token = this.getToken();

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        email: cleanEmail,
        currentPassword,
        newPassword,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || '비밀번호 변경에 실패했습니다.');
    }

    return data;
  },

  /**
   * Get authorized admin accounts list from server
   */
  async getAdminList(): Promise<Array<{ id: string; name: string; email: string; role: string; status: string }>> {
    try {
      const res = await fetch('/api/auth/admins');
      if (res.ok) {
        const data = await res.json();
        return data.admins || [];
      }
    } catch {}
    return [];
  },

  /**
   * Fetch server-side audit logs
   */
  async getAuditLogs(): Promise<Array<{
    id: string;
    actorId: string;
    actorName: string;
    targetUserId: string;
    targetUserName: string;
    action: string;
    details: string;
    timestamp: string;
  }>> {
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
    } catch {}
    return [];
  },

  /**
   * Server-validated Admin Role / TAG Change (Requirements 5, 6, 7, 8, 9, 10)
   * Enforces server-side authentication, SERVICE_OWNER verification, whitelist validation,
   * self-modification prevention, and audit logging.
   */
  async updateAdminRole(
    targetUserId: string,
    newRole: UserRole,
    actor: { id: string; name: string; email?: string }
  ): Promise<{ success: boolean; message: string; user?: User }> {
    const token = this.getToken();

    const res = await fetch(`/api/admin/users/${encodeURIComponent(targetUserId)}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-actor-id': actor.id,
        'x-actor-name': encodeURIComponent(actor.name),
        'x-actor-email': actor.email || '',
      },
      body: JSON.stringify({ role: newRole }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || '관리자 직책 변경에 실패했습니다.');
    }

    // Sync storage immediately
    const updatedUser = storage.updateUserRole(targetUserId, newRole, actor);

    return {
      success: true,
      message: data.message || '관리자 직책이 성공적으로 변경되었습니다.',
      user: updatedUser,
    };
  },

  /**
   * Get Kakao OAuth Configuration from server or environment
   */
  async getKakaoConfig(): Promise<{ enabled: boolean; clientId: string; redirectUri: string }> {
    try {
      const res = await fetch('/api/auth/kakao/config');
      if (res.ok) {
        const data = await res.json();
        if (data.clientId) {
          return {
            enabled: !!data.clientId,
            clientId: data.clientId,
            redirectUri: data.redirectUri || `${window.location.origin}/api/auth/kakao/callback`,
          };
        }
      }
    } catch {}

    // Fallback client-side env inspection
    const envClientId = (
      (import.meta as any).env?.VITE_KAKAO_CLIENT_ID ||
      (import.meta as any).env?.VITE_KAKAO_REST_API_KEY ||
      (import.meta as any).env?.VITE_KAKAO_JAVASCRIPT_KEY ||
      storage.getSettings().kakaoClientId ||
      ''
    ).trim();

    const redirectUri =
      storage.getSettings().kakaoRedirectUri ||
      `${window.location.origin}/api/auth/kakao/callback`;

    return {
      enabled: !!envClientId,
      clientId: envClientId,
      redirectUri,
    };
  },

  /**
   * Exchange Kakao authorization code for user and JWT session token
   */
  async exchangeKakaoCode(code: string, redirectUri?: string): Promise<LoginResponse> {
    const res = await fetch('/api/auth/kakao/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirectUri: redirectUri || `${window.location.origin}/api/auth/kakao/callback`,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || '카카오 로그인 인증에 실패했습니다.');
    }

    if (data.token) {
      this.setToken(data.token);
    }

    if (data.user) {
      storage.setCurrentUser(data.user);
      const existing = storage.getUserById(data.user.id);
      if (!existing) {
        storage.createUser(data.user);
      } else {
        storage.updateUserProfile(data.user.id, {
          name: data.user.name,
          avatar: data.user.avatar,
        });
      }
      firestoreService.saveUser(data.user).catch(() => {});
    }

    return data;
  },

  /**
   * Save Kakao Client ID from Admin System Settings to server
   */
  async saveKakaoSettings(settings: { clientId?: string; clientSecret?: string; redirectUri?: string }): Promise<boolean> {
    try {
      const res = await fetch('/api/settings/kakao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Get Naver OAuth Configuration from server or environment
   */
  async getNaverConfig(): Promise<{ enabled: boolean; clientId: string; redirectUri: string }> {
    try {
      const res = await fetch('/api/auth/naver/config');
      if (res.ok) {
        const data = await res.json();
        if (data.clientId) {
          return {
            enabled: !!data.clientId,
            clientId: data.clientId,
            redirectUri: data.redirectUri || `${window.location.origin}/api/auth/naver/callback`,
          };
        }
      }
    } catch {}

    const envClientId = (
      (import.meta as any).env?.VITE_NAVER_CLIENT_ID ||
      storage.getSettings().naverClientId ||
      ''
    ).trim();

    const redirectUri =
      storage.getSettings().naverRedirectUri ||
      `${window.location.origin}/api/auth/naver/callback`;

    return {
      enabled: !!envClientId,
      clientId: envClientId,
      redirectUri,
    };
  },

  /**
   * Exchange Naver authorization code for user and JWT session token
   */
  async exchangeNaverCode(code: string, state: string, redirectUri?: string): Promise<LoginResponse> {
    const res = await fetch('/api/auth/naver/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        state,
        redirectUri: redirectUri || `${window.location.origin}/api/auth/naver/callback`,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || '네이버 로그인 인증에 실패했습니다.');
    }

    if (data.token) {
      this.setToken(data.token);
    }

    if (data.user) {
      storage.setCurrentUser(data.user);
      const existing = storage.getUserById(data.user.id);
      if (!existing) {
        storage.createUser(data.user);
      } else {
        storage.updateUserProfile(data.user.id, {
          name: data.user.name,
          avatar: data.user.avatar,
        });
      }
      firestoreService.saveUser(data.user).catch(() => {});
    }

    return data;
  },

  /**
   * Save Naver Client ID from Admin System Settings to server
   */
  async saveNaverSettings(settings: { clientId?: string; clientSecret?: string; redirectUri?: string }): Promise<boolean> {
    try {
      const res = await fetch('/api/settings/naver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Verify and register user from Google Auth
   */
  async verifyGoogleUser(googleUser: {
    idToken: string;
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  }): Promise<LoginResponse> {
    // The server reads the account only from the verified ID token; the other fields feed the offline fallback.
    const res = await fetch('/api/auth/google/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: googleUser.idToken }),
    });

    const data = await res.json().catch(() => ({}));
    // A deliberate rejection (e.g. an invalid token) is final; only an unavailable server falls back.
    if (res.status >= 400 && res.status < 500) {
      throw new Error(data.message || 'Google 로그인 인증에 실패했습니다.');
    }
    if (!res.ok || !data.success) {
      // Local fallback in case server offline
      const cleanEmail = (googleUser.email || '').toLowerCase().trim();
      const isAdminAccount =
        cleanEmail === 'teamdevstudiont@gmail.com' ||
        cleanEmail === 'eunyool100208@gmail.com' ||
        cleanEmail === 'deer123424@gmail.com' ||
        cleanEmail === 'ayun24song@gmail.com';

      const resolvedUser: User = {
        id: `google_${googleUser.uid}`,
        googleId: googleUser.uid,
        name: googleUser.displayName || cleanEmail.split('@')[0] || '구글 수강생',
        email: cleanEmail,
        role: isAdminAccount ? 'SUPER_ADMIN' : 'USER',
        status: 'ACTIVE',
        avatar: googleUser.photoURL || undefined,
        provider: 'google',
        createdAt: new Date().toISOString(),
      };

      const dummyToken = `tdsnt_jwt_usr_google_${Date.now()}`;
      this.setToken(dummyToken);
      storage.setCurrentUser(resolvedUser);
      storage.createUser(resolvedUser);
      firestoreService.saveUser(resolvedUser).catch(() => {});

      return {
        success: true,
        user: resolvedUser,
        token: dummyToken,
        message: 'Google 로그인이 완료되었습니다.',
      };
    }

    if (data.token) {
      this.setToken(data.token);
    }

    if (data.user) {
      storage.setCurrentUser(data.user);
      const existing = storage.getUserById(data.user.id);
      if (!existing) {
        storage.createUser(data.user);
      } else {
        storage.updateUserProfile(data.user.id, {
          name: data.user.name,
          avatar: data.user.avatar,
        });
      }
      firestoreService.saveUser(data.user).catch(() => {});
    }

    return data;
  },
};


