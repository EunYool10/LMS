import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

// In-memory progress store for dev server
const devProgressStore: Record<string, any[]> = {};
const devEnrollmentStore: Record<string, any[]> = {};

// Vite plugin to provide secure server-side API auth endpoints in dev mode
function apiAuthPlugin(): Plugin {
  return {
    name: 'api-auth-plugin',
    configureServer(server) {
      // Session verification
      server.middlewares.use('/api/auth/session', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!token) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: '인증 토큰이 없습니다.' }));
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            valid: true,
            role: token.startsWith('tdsnt_jwt_sa_') ? 'SUPER_ADMIN' : 'USER',
          })
        );
      });

      // Kakao Auth Config fallback for dev
      server.middlewares.use('/api/auth/kakao/config', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const clientId = process.env.KAKAO_CLIENT_ID || process.env.VITE_KAKAO_CLIENT_ID || '';
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            enabled: !!clientId,
            clientId,
            redirectUri: `${req.headers.origin || 'http://localhost:3000'}/api/auth/kakao/callback`,
          })
        );
      });

      // Progress query
      server.middlewares.use('/api/progress/sync', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { userId, progresses } = JSON.parse(body || '{}');
            if (userId && Array.isArray(progresses)) {
              if (!devProgressStore[userId]) devProgressStore[userId] = [];
              const list = devProgressStore[userId];
              progresses.forEach((incoming: any) => {
                const idx = list.findIndex((p: any) => p.lessonId === incoming.lessonId);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], ...incoming };
                } else {
                  list.push(incoming);
                }
              });
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, syncedCount: (progresses || []).length }));
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false }));
          }
        });
      });

      server.middlewares.use('/api/progress/update', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { userId, courseId, lessonId, watchedSeconds, totalSeconds, isCompleted } = JSON.parse(
              body || '{}'
            );
            if (!userId || !courseId || !lessonId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, message: '필수 파라미터가 누락되었습니다.' }));
              return;
            }

            if (!devProgressStore[userId]) devProgressStore[userId] = [];
            const list = devProgressStore[userId];
            const existingIdx = list.findIndex((p: any) => p.lessonId === lessonId);
            const now = new Date().toISOString();

            const record = {
              id:
                existingIdx >= 0
                  ? list[existingIdx].id
                  : `prog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              userId,
              courseId,
              lessonId,
              watchedSeconds: Math.max(0, watchedSeconds || 0),
              totalSeconds: Math.max(0, totalSeconds || 0),
              isCompleted: !!isCompleted,
              lastWatchedAt: now,
            };

            if (existingIdx >= 0) {
              list[existingIdx] = record;
            } else {
              list.push(record);
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, progress: record }));
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false }));
          }
        });
      });

      server.middlewares.use('/api/progress', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const userId = url.searchParams.get('userId') || '';
        const courseId = url.searchParams.get('courseId') || '';

        if (!userId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: 'userId가 필요합니다.' }));
          return;
        }

        const userProgresses = devProgressStore[userId] || [];
        const filtered = courseId
          ? userProgresses.filter((p: any) => p.courseId === courseId)
          : userProgresses;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            progresses: filtered,
            enrollments: devEnrollmentStore[userId] || [],
          })
        );
      });

      server.middlewares.use('/api/auth/login', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const { email, password } = JSON.parse(body || '{}');
            const cleanEmail = (email || '').trim().toLowerCase();
            const cleanPin = (password || '').trim();

            const adminEmail1 = (process.env.SUPER_ADMIN_EMAIL_1 || 'admin1@tdsnt.internal').trim().toLowerCase();
            const adminPin1 = (process.env.SUPER_ADMIN_PIN_1 || '889900').trim();

            const adminEmail2 = (process.env.SUPER_ADMIN_EMAIL_2 || 'admin2@tdsnt.internal').trim().toLowerCase();
            const adminPin2 = (process.env.SUPER_ADMIN_PIN_2 || '778899').trim();

            let matchedAdmin: { id: string; name: string; email: string } | null = null;

            if (cleanEmail === adminEmail1 && cleanPin === adminPin1) {
              matchedAdmin = {
                id: 'super_admin_1',
                name: '총관리자 A',
                email: adminEmail1,
              };
            } else if (cleanEmail === adminEmail2 && cleanPin === adminPin2) {
              matchedAdmin = {
                id: 'super_admin_2',
                name: '총관리자 B',
                email: adminEmail2,
              };
            }

            if (matchedAdmin) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  user: {
                    id: matchedAdmin.id,
                    name: matchedAdmin.name,
                    email: matchedAdmin.email,
                    role: 'SUPER_ADMIN',
                    status: 'active',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                    createdAt: '2026-01-01T00:00:00.000Z',
                  },
                  token: `tdsnt_jwt_sa_${Date.now()}`,
                })
              );
              return;
            }

            // Not super admin: return fallback to allow client-side registered student/manager login
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: false,
                isSuperAdmin: false,
                message: '일반 계정 인증을 진행합니다.',
              })
            );
          } catch (e) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: '잘못된 요청 형식입니다.' }));
          }
        });
      });

      server.middlewares.use('/api/auth/register', (req, res, next) => {
        if (req.method !== 'POST') return next();

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const { name, email, password } = JSON.parse(body || '{}');
            const cleanName = (name || '').trim();
            const cleanEmail = (email || '').trim().toLowerCase();

            if (!cleanName || cleanName.length < 2) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, message: '성명은 2자 이상이어야 합니다.' }));
              return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cleanEmail)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, message: '올바른 이메일 주소를 입력해주세요.' }));
              return;
            }

            if (!password || password.length < 6) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, message: '비밀번호는 최소 6자 이상이어야 합니다.' }));
              return;
            }

            // Strictly enforce USER (student) role on backend, ignoring any role submitted in body
            const newUser = {
              id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: cleanName,
              email: cleanEmail,
              role: 'USER', // student
              status: 'active',
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              createdAt: new Date().toISOString(),
            };

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, user: newUser }));
          } catch (e) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: '회원가입 요청 처리 중 오류가 발생했습니다.' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiAuthPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
