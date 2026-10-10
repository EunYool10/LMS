import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, UserStatus, AuditLog, AdminRoleTag } from '../../types';
import { storage, TDSNTLMSStorage } from '../../services/storage';
import { authApi } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { Modal } from '../common/Modal';
import {
  ADMIN_ROLE_TAGS,
  ROLE_METADATA_MAP,
  getRoleMetadata,
  getRoleLabel,
  isServiceOwner,
  isAdminRole,
  canChangeAdminTag,
} from '../../utils/rbac';
import {
  Search,
  UserPlus,
  Trash2,
  Edit3,
  Shield,
  Clock,
  BookOpen,
  Filter,
  CheckCircle2,
  Ban,
  X,
  Save,
  Camera,
  History,
  Users as UsersIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Lock,
  Phone,
  Mail,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UserManager: React.FC = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<User[]>(() => storage.getUsers());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => storage.getAuditLogs());

  // Search, Filter, Sort, Pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'role'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected User Drawer State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Drawer Form State
  const [drawerName, setDrawerName] = useState('');
  const [drawerNickname, setDrawerNickname] = useState('');
  const [drawerPhone, setDrawerPhone] = useState('');
  const [drawerBio, setDrawerBio] = useState('');
  const [drawerRole, setDrawerRole] = useState<UserRole>('USER');
  const [drawerStatus, setDrawerStatus] = useState<UserStatus>('ACTIVE');
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);
  const drawerFileInputRef = useRef<HTMLInputElement>(null);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('CONTENT_MANAGER');

  // Role Change Confirmation Modal State
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    user: User;
    newRole: UserRole;
  } | null>(null);
  const [isExecutingRoleChange, setIsExecutingRoleChange] = useState(false);

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const pageUserIds = paginatedUsers.map((u) => u.id);
    const areAllOnPageSelected =
      pageUserIds.length > 0 && pageUserIds.every((id) => selectedUserIds.includes(id));
    if (areAllOnPageSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !pageUserIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...pageUserIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleBulkStatusUpdate = (status: UserStatus) => {
    if (selectedUserIds.length === 0) return;
    const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;
    const res = storage.bulkUpdateUserStatus(selectedUserIds, status, actor);
    const statusLabel = status === 'ACTIVE' ? '정상 활성' : '정지';
    if (res.updated > 0) {
      showToast(`${res.updated}명의 계정 상태가 [${statusLabel}](으)로 일괄 변경되었습니다.`, 'success');
    }
    if (res.skipped > 0) {
      showToast(`보호 계정 및 본인 계정 ${res.skipped}명은 변경에서 제외되었습니다.`, 'info');
    }
    reloadData();
    setSelectedUserIds([]);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedUserIds.length === 0) return;
    const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;
    const res = storage.bulkDeleteUsers(selectedUserIds, actor);
    if (res.deleted > 0) {
      showToast(`${res.deleted}명의 계정이 성공적으로 일괄 삭제되었습니다.`, 'success');
    }
    if (res.skipped > 0) {
      showToast(`보호 계정 및 본인 계정 ${res.skipped}명은 삭제에서 제외되었습니다.`, 'info');
    }
    setIsBulkDeleteModalOpen(false);
    reloadData();
    setSelectedUserIds([]);
  };

  const reloadData = async () => {
    setUsers(storage.getUsers());
    const localLogs = storage.getAuditLogs();
    try {
      const serverLogs = await authApi.getAuditLogs();
      if (serverLogs && serverLogs.length > 0) {
        const logMap = new Map<string, AuditLog>();
        serverLogs.forEach((l) => logMap.set(l.id, l as any));
        localLogs.forEach((l) => {
          if (!logMap.has(l.id)) logMap.set(l.id, l);
        });
        const combined = Array.from(logMap.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setAuditLogs(combined);
      } else {
        setAuditLogs(localLogs);
      }
    } catch {
      setAuditLogs(localLogs);
    }

    if (selectedUser) {
      const refreshed = storage.getUserById(selectedUser.id);
      if (refreshed) {
        setSelectedUser(refreshed);
      }
    }
  };

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  // Open Drawer for a user
  const handleOpenDrawer = (user: User) => {
    setSelectedUser(user);
    setDrawerName(user.name);
    setDrawerNickname(user.nickname || '');
    setDrawerPhone(user.phone || '');
    setDrawerBio(user.bio || '');
    setDrawerRole(user.role);
    setDrawerStatus(user.status === 'suspended' ? 'SUSPENDED' : (user.status as UserStatus) || 'ACTIVE');
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedUser(null);
  };

  // Execute Role Change with Server RBAC validation (Requirements 5, 6, 7, 8, 9, 10)
  const handleExecuteRoleChange = async () => {
    if (!pendingRoleChange || !currentUser) return;
    const { user: target, newRole } = pendingRoleChange;

    setIsExecutingRoleChange(true);
    try {
      const res = await authApi.updateAdminRole(target.id, newRole, {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
      });

      showToast(
        res.message || `[${target.name}]님의 관리자 직책이 [${getRoleLabel(newRole)}]으로 변경되었습니다.`,
        'success',
        '직책 변경 완료'
      );

      // Update selectedUser if drawer is viewing this user
      if (selectedUser && selectedUser.id === target.id) {
        setSelectedUser({ ...selectedUser, role: newRole });
        setDrawerRole(newRole);
      }

      setPendingRoleChange(null);
      reloadData();
    } catch (err: any) {
      showToast(err.message || '관리자 직책 변경 중 오류가 발생했습니다.', 'error', '직책 변경 실패');
    } finally {
      setIsExecutingRoleChange(false);
    }
  };

  // Save Drawer changes
  const handleSaveDrawerUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!drawerName.trim() || drawerName.trim().length < 2) {
      showToast('사용자 이름은 최소 2자 이상이어야 합니다.', 'error');
      return;
    }

    const isProtected = TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(selectedUser.email.toLowerCase());
    if (isProtected && drawerRole === 'USER') {
      showToast('시스템 최고 관리자 계정은 수강생(일반 회원)으로 권한을 강등할 수 없습니다.', 'error');
      setDrawerRole(selectedUser.role);
      return;
    }
    if (isProtected && selectedUser.email.toLowerCase() === 'teamdevstudiont@gmail.com' && drawerRole !== 'SERVICE_OWNER' && drawerRole !== 'SUPER_ADMIN') {
      showToast('시스템 최상위 총괄 계정은 총괄 직책을 유지해야 합니다.', 'error');
      return;
    }

    if (isProtected && (drawerStatus === 'SUSPENDED' || drawerStatus === 'DELETED')) {
      showToast('시스템 보호 관리자 계정은 정지할 수 없습니다.', 'error');
      return;
    }

    // Role change check
    if (drawerRole !== selectedUser.role) {
      const check = canChangeAdminTag(currentUser?.role, currentUser?.id, selectedUser.id);
      if (!check.allowed) {
        showToast(check.reason || '관리자 직책을 변경할 권한이 없습니다.', 'error');
        setDrawerRole(selectedUser.role);
        return;
      }

      // Save other profile attributes first
      const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;
      storage.updateUserProfile(
        selectedUser.id,
        {
          name: drawerName.trim(),
          nickname: drawerNickname.trim(),
          phone: drawerPhone.trim(),
          bio: drawerBio.trim(),
        },
        actor
      );
      if (drawerStatus !== selectedUser.status) {
        storage.updateUserStatus(selectedUser.id, drawerStatus, actor);
      }

      // Prompt confirmation modal for role change
      setPendingRoleChange({
        user: selectedUser,
        newRole: drawerRole,
      });
      return;
    }

    setIsSavingDrawer(true);
    try {
      const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;

      // 1. Update Profile (Name, Nickname, Phone, Bio)
      storage.updateUserProfile(
        selectedUser.id,
        {
          name: drawerName.trim(),
          nickname: drawerNickname.trim(),
          phone: drawerPhone.trim(),
          bio: drawerBio.trim(),
        },
        actor
      );

      // 2. Update Status if changed
      if (drawerStatus !== selectedUser.status) {
        storage.updateUserStatus(selectedUser.id, drawerStatus, actor);
      }

      reloadData();
      showToast(`[${drawerName}] 사용자의 정보가 성공적으로 수정되었습니다.`, 'success');
      handleCloseDrawer();
    } catch (err: any) {
      showToast(err.message || '사용자 정보 수정 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSavingDrawer(false);
    }
  };

  // Drawer Avatar Upload
  const handleDrawerAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedUser) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다.', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/me/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;

      if (data.success && data.avatarUrl) {
        storage.updateUserAvatar(selectedUser.id, data.avatarUrl, actor);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          storage.updateUserAvatar(selectedUser.id, base64, actor);
          reloadData();
        };
        reader.readAsDataURL(file);
      }

      reloadData();
      showToast('프로필 사진이 변경되었습니다.', 'success');
    } catch (err) {
      showToast('이미지 업로드에 실패했습니다.', 'error');
    } finally {
      if (drawerFileInputRef.current) drawerFileInputRef.current.value = '';
    }
  };

  const handleDrawerResetAvatar = () => {
    if (!selectedUser) return;
    const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;
    storage.updateUserAvatar(selectedUser.id, null, actor);
    reloadData();
    showToast('기본 프로필 아바타로 초기화되었습니다.', 'info');
  };

  // Delete User
  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('현재 로그인된 본인 계정은 삭제할 수 없습니다.', 'warning');
      return;
    }

    if (TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      showToast('보호 대상인 서비스 총괄 계정은 삭제할 수 없습니다.', 'error');
      return;
    }

    setUserToDelete(user);
  };

  const handleConfirmSingleDeleteUser = () => {
    if (!userToDelete) return;
    try {
      const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;
      storage.deleteUser(userToDelete.id, actor);
      reloadData();
      if (selectedUser?.id === userToDelete.id) {
        handleCloseDrawer();
      }
      showToast(`[${userToDelete.name}] 계정이 성공적으로 삭제되었습니다.`, 'info');
      setUserToDelete(null);
    } catch (err: any) {
      showToast(err.message || '사용자 삭제에 실패했습니다.', 'error');
    }
  };

  // Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    try {
      const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;
      storage.createUser(
        {
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          role: newRole,
          status: 'ACTIVE',
        },
        actor
      );
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      reloadData();
      showToast(`새 [${newRole}] 계정이 성공적으로 등록되었습니다.`, 'success');
    } catch (err: any) {
      showToast(err.message || '사용자 생성 중 오류가 발생했습니다.', 'error');
    }
  };

  // Filter and Sort Logic
  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.nickname && u.nickname.toLowerCase().includes(s)) ||
      (u.phone && u.phone.includes(s));

    const matchRole =
      roleFilter === 'all' ||
      (roleFilter === 'USER' && (u.role === 'USER' || !u.role)) ||
      (roleFilter === 'ADMINS' && isAdminRole(u.role)) ||
      u.role === roleFilter;

    const isSuspended = u.status === 'SUSPENDED' || u.status === 'suspended';
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'ACTIVE' && !isSuspended) ||
      (statusFilter === 'SUSPENDED' && isSuspended);

    return matchSearch && matchRole && matchStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'createdAt') {
      comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === 'name') {
      comp = a.name.localeCompare(b.name, 'ko');
    } else if (sortBy === 'role') {
      comp = a.role.localeCompare(b.role);
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage) || 1;
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // User Learning Stats for Drawer
  const selectedUserStats = selectedUser ? storage.getUserLearningStats(selectedUser.id) : null;
  const isSelectedUserProtected = selectedUser
    ? TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(selectedUser.email.toLowerCase())
    : false;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">사용자 및 계정 관리</h3>
            {isSuperAdmin && (
              <Badge variant="purple" size="sm">
                서비스 총괄 전용 제어
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            등록된 수강생과 관리자의 성명, 직책(TAG), 상태, 프로필 사진 및 학습 통계를 실시간으로 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-add-new-user"
            onClick={() => setIsAddModalOpen(true)}
            className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>신규 계정 등록</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 border-b border-slate-100 bg-slate-50/50">
        <button
          type="button"
          id="tab-user-list"
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          사용자 목록 ({users.length}명)
        </button>

        <button
          type="button"
          id="tab-audit-logs"
          onClick={() => {
            setActiveTab('audit');
            reloadData();
          }}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          관리자 감사 로그 ({auditLogs.length}건)
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Filter Bar */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Role Filter */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                {[
                  { key: 'all', label: '전체' },
                  { key: 'USER', label: '수강생' },
                  { key: 'ADMINS', label: '전체 관리자' },
                  { key: 'SERVICE_OWNER', label: '서비스 총괄' },
                  { key: 'SECURITY_MANAGER', label: '보안 관리자' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setRoleFilter(key);
                      setCurrentPage(1);
                    }}
                    className={`py-1 px-2.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      roleFilter === key
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">전체 상태</option>
                <option value="ACTIVE">정상 활성</option>
                <option value="SUSPENDED">정지됨</option>
              </select>

              {/* Sort Order */}
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                title="정렬 방향 토글"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{sortOrder === 'desc' ? '최신순' : '오래된순'}</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="이름, 이메일, 닉네임, 연락처..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedUserIds.length > 0 && (
            <div className="p-3 mx-4 my-2 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  선택된 계정: <strong className="text-indigo-600 font-bold">{selectedUserIds.length}명</strong>
                </span>
                <span className="text-indigo-300">|</span>
                <button
                  type="button"
                  id="btn-clear-user-selection"
                  onClick={handleClearSelection}
                  className="text-slate-500 hover:text-indigo-700 underline cursor-pointer"
                >
                  선택 해제
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  id="btn-bulk-activate-users"
                  onClick={() => handleBulkStatusUpdate('ACTIVE')}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>일괄 정상 활성화</span>
                </button>
                <button
                  type="button"
                  id="btn-bulk-suspend-users"
                  onClick={() => handleBulkStatusUpdate('SUSPENDED')}
                  className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>일괄 계정 정지</span>
                </button>
                <button
                  type="button"
                  id="btn-bulk-delete-users"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>일괄 계정 삭제</span>
                </button>
              </div>
            </div>
          )}

          {/* Mobile Select-All Bar */}
          <div className="md:hidden flex items-center justify-between p-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                id="checkbox-select-all-users-mobile"
                checked={
                  paginatedUsers.length > 0 &&
                  paginatedUsers.every((u) => selectedUserIds.includes(u.id))
                }
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>현재 목록 전체 선택 ({selectedUserIds.length}/{paginatedUsers.length})</span>
            </label>
            <span className="text-[11px] text-slate-400">총 {sortedUsers.length}명</span>
          </div>

          {/* Mobile User Cards (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                검색 조건과 일치하는 사용자가 없습니다.
              </div>
            ) : (
              paginatedUsers.map((u) => {
                const isProtected = TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(
                  u.email.toLowerCase()
                );
                const isSuspended = u.status === 'SUSPENDED' || u.status === 'suspended';
                const isSelf = u.id === currentUser?.id;
                const isSelected = selectedUserIds.includes(u.id);

                return (
                  <div
                    key={`mobile-user-${u.id}`}
                    className={`p-4 transition-colors ${
                      isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectUser(u.id)}
                        className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />

                      {/* Avatar & Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <Avatar user={u} size="md" showRoleBadge={false} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 truncate">
                                {u.name}
                              </span>
                              <VerifiedBadge role={u.role} size="xs" className="shrink-0" />
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 font-semibold">
                                  본인
                                </span>
                              )}
                              {isProtected && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-purple-50 text-purple-700 font-semibold">
                                  보호
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{u.email}</p>
                          </div>
                        </div>

                        {/* Badges & Meta info */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                          {(() => {
                            const meta = getRoleMetadata(u.role);
                            if (meta) {
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold ${meta.badgeClass}`}
                                >
                                  <span>{meta.icon}</span>
                                  <span>{meta.label}</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                수강생
                              </span>
                            );
                          })()}

                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3" />
                              정지됨
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              정상 활성
                            </span>
                          )}

                          {u.phone && (
                            <span className="text-slate-500 font-mono text-[11px]">
                              {u.phone}
                            </span>
                          )}
                          <span className="text-slate-400 text-[10px]">
                            가입: {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Mobile Action Buttons */}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(u)}
                            className="flex-1 min-h-[40px] px-3 py-2 bg-indigo-50 active:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>상세 및 수정</span>
                          </button>

                          {!isProtected && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="min-h-[40px] px-3 py-2 text-rose-600 active:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>삭제</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Users Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      id="checkbox-select-all-users"
                      checked={
                        paginatedUsers.length > 0 &&
                        paginatedUsers.every((u) => selectedUserIds.includes(u.id))
                      }
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="현재 페이지 전체 선택/해제"
                    />
                  </th>
                  <th className="py-3 px-4">사용자</th>
                  <th className="py-3 px-4">권한 (Role)</th>
                  <th className="py-3 px-4">상태</th>
                  <th className="py-3 px-4">연락처 / 닉네임</th>
                  <th className="py-3 px-4">가입일시</th>
                  <th className="py-3 px-4 text-right">관리 작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      검색 조건과 일치하는 사용자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const isProtected = TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(
                      u.email.toLowerCase()
                    );
                    const isSuspended = u.status === 'SUSPENDED' || u.status === 'suspended';
                    const isSelf = u.id === currentUser?.id;
                    const isSelected = selectedUserIds.includes(u.id);

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                          isSelected ? 'bg-indigo-50/40' : ''
                        }`}
                        onClick={() => handleOpenDrawer(u)}
                      >
                        {/* Checkbox column */}
                        <td
                          className="py-3 px-3 w-10 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectUser(u.id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* User Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar user={u} size="sm" showRoleBadge={false} />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {u.name}
                                </span>
                                <VerifiedBadge role={u.role} size="xs" className="shrink-0" />
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 font-semibold">
                                    본인
                                  </span>
                                )}
                                {isProtected && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-sm bg-purple-50 text-purple-700 font-semibold"
                                    title="시스템 보호 관리자 계정"
                                  >
                                    보호 계정
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">{u.email}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">ID: {u.id}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          {(() => {
                            const meta = getRoleMetadata(u.role);
                            if (meta) {
                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${meta.badgeClass}`}
                                >
                                  <span>{meta.icon}</span>
                                  <span>{meta.label}</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                수강생
                              </span>
                            );
                          })()}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3" />
                              정지됨
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              정상 활성
                            </span>
                          )}
                        </td>

                        {/* Contact / Nickname */}
                        <td className="py-3 px-4 text-slate-500">
                          <div>
                            <span>{u.phone || '-'}</span>
                            {u.nickname && (
                              <p className="text-[11px] text-slate-400">별칭: {u.nickname}</p>
                            )}
                          </div>
                        </td>

                        {/* Registered At */}
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        {/* Action buttons */}
                        <td
                          className="py-3 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDrawer(u)}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              title="상세 정보 및 이름/권한 수정"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>수정/상세</span>
                            </button>

                            {!isProtected && !isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="사용자 삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              전체 <strong className="text-slate-800">{sortedUsers.length}</strong>명 중{' '}
              <strong className="text-slate-800">
                {sortedUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
              </strong>
              -
              <strong className="text-slate-800">
                {Math.min(currentPage * itemsPerPage, sortedUsers.length)}
              </strong>
              명 표시
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div>
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">보안 감사 및 관리자 직책 변경 이력</p>
              <p className="text-[11px] text-slate-500">
                서버측 RBAC 검증을 거친 관리자 직책(TAG) 부여, 정보 변경 및 계정 조치 이력이 실시간으로 기록됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={reloadData}
              className="py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>새로고침</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs overflow-x-auto">
            <div className="p-3.5 bg-slate-100/70 font-bold text-slate-600 grid grid-cols-12 gap-2 min-w-[700px]">
              <span className="col-span-3">일시</span>
              <span className="col-span-2">수행 관리자</span>
              <span className="col-span-2">대상 사용자</span>
              <span className="col-span-2">조치 액션</span>
              <span className="col-span-3">상세 내용</span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                기록된 관리자 감사 로그가 없습니다.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3.5 grid grid-cols-12 gap-2 hover:bg-slate-50/70 items-center min-w-[700px] transition-colors ${
                    log.action === 'UPDATE_ROLE' ? 'bg-indigo-50/20' : ''
                  }`}
                >
                  <span className="col-span-3 text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className="col-span-2 font-bold text-slate-800 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span className="truncate">{log.actorName}</span>
                  </span>
                  <span className="col-span-2 font-semibold text-slate-700 truncate">{log.targetUserName}</span>
                  <span className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        log.action === 'UPDATE_ROLE'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : log.action === 'UPDATE_NAME'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : log.action === 'UPDATE_STATUS'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : log.action === 'DELETE_USER'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {log.action === 'UPDATE_ROLE' && <Sparkles className="w-3 h-3 text-purple-600" />}
                      <span>{log.action}</span>
                    </span>
                  </span>
                  <span className="col-span-3 text-slate-600 font-medium truncate" title={log.details}>
                    {log.details}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* User Detail & Edit Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedUser && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDrawer}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Slide-in Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <Avatar user={selectedUser} size="md" showRoleBadge={false} />
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>{selectedUser.name}</span>
                      {isSelectedUserProtected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                          시스템 보호 계정
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{selectedUser.email}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">ID: {selectedUser.id}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6 flex-1">
                {/* Avatar Control */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar user={selectedUser} size="lg" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">프로필 아바타</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {selectedUser.avatar ? '사용자 등록 사진' : 'TDSNTLMS 기본 아바타'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      ref={drawerFileInputRef}
                      onChange={handleDrawerAvatarUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => drawerFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      변경
                    </button>
                    {selectedUser.avatar && (
                      <button
                        type="button"
                        onClick={handleDrawerResetAvatar}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        title="기본 아바타로 복구"
                      >
                        기본화
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit Form */}
                <form id="drawer-user-form" onSubmit={handleSaveDrawerUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      성명 (이름) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="drawer-input-name"
                      value={drawerName}
                      onChange={(e) => setDrawerName(e.target.value)}
                      placeholder="이름을 입력하세요"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">닉네임</label>
                      <input
                        type="text"
                        id="drawer-input-nickname"
                        value={drawerNickname}
                        onChange={(e) => setDrawerNickname(e.target.value)}
                        placeholder="별칭"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">휴대폰 번호</label>
                      <input
                        type="tel"
                        id="drawer-input-phone"
                        value={drawerPhone}
                        onChange={(e) => setDrawerPhone(e.target.value)}
                        placeholder="010-XXXX-XXXX"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Role & Status */}
                  <div className="space-y-4 pt-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          관리자 직책 및 권한 (TAG)
                        </label>
                        {isServiceOwner(currentUser?.role) && selectedUser && selectedUser.id !== currentUser?.id && (
                          <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> 직책 변경 권한 보유
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <select
                          id="drawer-select-role"
                          disabled={
                            !isServiceOwner(currentUser?.role) ||
                            selectedUser?.id === currentUser?.id ||
                            TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(selectedUser?.email?.toLowerCase() || '')
                          }
                          value={drawerRole}
                          onChange={(e) => setDrawerRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed font-medium"
                        >
                          <option value="SUPER_ADMIN">✦ [서비스 총괄] — SUPER_ADMIN</option>
                          <option value="USER">수강생 (일반 회원)</option>
                          <optgroup label="관리자 직책 (Admin TAG)">
                            {ADMIN_ROLE_TAGS.map((tag) => {
                              const meta = ROLE_METADATA_MAP[tag];
                              return (
                                <option key={tag} value={tag}>
                                  {meta.icon} [{meta.label}] — {meta.tag}
                                </option>
                              );
                            })}
                          </optgroup>
                        </select>

                        {/* Authorization Feedback Banner */}
                        {(() => {
                          const isSelf = selectedUser?.id === currentUser?.id;
                          const isRoot = selectedUser?.email.toLowerCase() === 'teamdevstudiont@gmail.com';
                          const isProtectedAdmin = TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(selectedUser?.email?.toLowerCase() || '');

                          if (isProtectedAdmin) {
                            return (
                              <p className="text-[11px] text-indigo-700 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-200 flex items-center gap-1.5 leading-tight">
                                <Shield className="w-3.5 h-3.5 shrink-0" />
                                <span>시스템 최고 관리자 계정은 관리자 직책(권한)이 안전하게 영구 보호됩니다.</span>
                              </p>
                            );
                          }
                          if (!isServiceOwner(currentUser?.role)) {
                            return (
                              <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 flex items-center gap-1.5 leading-tight">
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span>관리자 직책(TAG) 변경은 <strong>서비스 총괄</strong> 전용 권한입니다.</span>
                              </p>
                            );
                          }
                          if (isSelf) {
                            return (
                              <p className="text-[11px] text-slate-500 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 leading-tight">
                                <Shield className="w-3.5 h-3.5 shrink-0" />
                                <span>보안 규칙상 본인의 관리자 직책은 직접 변경할 수 없습니다.</span>
                              </p>
                            );
                          }
                          if (isRoot) {
                            return (
                              <p className="text-[11px] text-purple-700 bg-purple-50 px-3 py-2 rounded-xl border border-purple-200 flex items-center gap-1.5 leading-tight">
                                <Shield className="w-3.5 h-3.5 shrink-0" />
                                <span>시스템 최상위 계정은 서비스 총괄 직책을 영구 유지합니다.</span>
                              </p>
                            );
                          }

                          const selectedMeta = getRoleMetadata(drawerRole);
                          if (selectedMeta) {
                            return (
                              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 space-y-1.5">
                                <div className="flex items-center justify-between font-bold">
                                  <span className="flex items-center gap-1.5">
                                    <span>{selectedMeta.icon}</span>
                                    <span>{selectedMeta.label} ({selectedMeta.tag})</span>
                                  </span>
                                  {drawerRole !== selectedUser?.role && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-bold animate-pulse">
                                      직책 변경 대기
                                    </span>
                                  )}
                                </div>
                                <p className="text-indigo-700 text-[10px] leading-relaxed">{selectedMeta.description}</p>
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        계정 상태 (Status)
                      </label>
                      <select
                        id="drawer-select-status"
                        disabled={isSelectedUserProtected}
                        value={drawerStatus}
                        onChange={(e) => setDrawerStatus(e.target.value as UserStatus)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        <option value="ACTIVE">정상 활성</option>
                        <option value="SUSPENDED">이용 정지</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">자기소개</label>
                    <textarea
                      rows={2}
                      id="drawer-input-bio"
                      value={drawerBio}
                      onChange={(e) => setDrawerBio(e.target.value)}
                      placeholder="자기소개 또는 관리 메모"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
                    />
                  </div>
                </form>

                {/* Learning Stats Section in Drawer */}
                {selectedUserStats && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      실제 수강 이력 및 학습 현황
                    </h3>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 bg-slate-50 rounded-xl text-center">
                        <p className="text-[10px] text-slate-500 font-medium">수강 강의</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">
                          {selectedUserStats.totalEnrolled}개
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl text-center">
                        <p className="text-[10px] text-slate-500 font-medium">완강 강의</p>
                        <p className="text-base font-bold text-emerald-600 mt-0.5">
                          {selectedUserStats.completedCoursesCount}개
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl text-center">
                        <p className="text-[10px] text-slate-500 font-medium">평균 진도</p>
                        <p className="text-base font-bold text-indigo-600 mt-0.5">
                          {selectedUserStats.overallProgressPercent}%
                        </p>
                      </div>
                    </div>

                    {selectedUserStats.enrolledDetails.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedUserStats.enrolledDetails.map((enr) => (
                          <div
                            key={enr.courseId}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                              {enr.courseTitle}
                            </span>
                            <span className="font-bold text-indigo-600 shrink-0">
                              {enr.progressPercentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Danger Zone */}
                {!isSelectedUserProtected && selectedUser.id !== currentUser?.id && (
                  <div className="pt-4 border-t border-rose-100">
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(selectedUser)}
                      className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      이 사용자 계정 영구 삭제
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 sticky bottom-0">
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  form="drawer-user-form"
                  disabled={isSavingDrawer}
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingDrawer ? '저장 중...' : '변경사항 저장'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="신규 사용자 계정 등록"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              성명 (이름) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="new-user-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              이메일 주소 <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              id="new-user-email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">부여할 직책 (권한)</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="USER">수강생 (USER)</option>
              <optgroup label="관리자 직책 (Admin TAG)">
                {ADMIN_ROLE_TAGS.map((tag) => {
                  const meta = ROLE_METADATA_MAP[tag];
                  return (
                    <option key={tag} value={tag}>
                      {meta.icon} [{meta.label}] — {meta.tag}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
            >
              등록 완료
            </button>
          </div>
        </form>
      </Modal>

      {/* Role Change Confirmation Modal (Requirements 8, 9) */}
      <Modal
        isOpen={!!pendingRoleChange}
        onClose={() => {
          if (selectedUser) setDrawerRole(selectedUser.role);
          setPendingRoleChange(null);
        }}
        title="관리자 직책(TAG) 변경 확인"
      >
        {pendingRoleChange && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-2 text-indigo-950 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>관리자 직책 임명 및 권한 변경</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>[{pendingRoleChange.user.name}]</strong> 님의 관리자 직책을{' '}
                <strong className="text-indigo-700">[{getRoleLabel(pendingRoleChange.newRole)}]</strong>(으)로 변경하시겠습니까?
              </p>
            </div>

            {/* Change Details Comparison Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">변경자</span>
                <span className="font-bold text-slate-900">
                  {currentUser?.name} ({getRoleLabel(currentUser?.role)})
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">변경 대상</span>
                <span className="font-bold text-slate-900">
                  {pendingRoleChange.user.name} ({pendingRoleChange.user.email})
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">기존 직책</span>
                <span className="font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  {getRoleLabel(pendingRoleChange.user.role)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">변경 직책</span>
                <span className="font-black text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-300 flex items-center gap-1.5">
                  <span>{ROLE_METADATA_MAP[pendingRoleChange.newRole as AdminRoleTag]?.icon || '🛡️'}</span>
                  <span>{getRoleLabel(pendingRoleChange.newRole)} ({pendingRoleChange.newRole})</span>
                </span>
              </div>
            </div>

            {/* Responsibilities list if admin role */}
            {ROLE_METADATA_MAP[pendingRoleChange.newRole as AdminRoleTag]?.responsibilities && (
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5">
                <p className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  해당 직책의 주요 담당 업무:
                </p>
                <ul className="list-disc pl-5 text-[11px] text-slate-600 space-y-0.5">
                  {ROLE_METADATA_MAP[pendingRoleChange.newRole as AdminRoleTag].responsibilities.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                직책 변경 시 서버측 RBAC 권한 검증이 수행되며, 변경 내역은 감사 로그(Audit Log)에 영구 기록됩니다.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedUser) setDrawerRole(selectedUser.role);
                  setPendingRoleChange(null);
                }}
                disabled={isExecutingRoleChange}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                id="btn-confirm-role-change"
                onClick={handleExecuteRoleChange}
                disabled={isExecutingRoleChange}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isExecutingRoleChange ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>적용 중...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>직책 변경 적용</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="선택 계정 일괄 삭제 확인"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              <p className="font-bold">선택하신 {selectedUserIds.length}개의 계정을 영구 삭제하시겠습니까?</p>
              <p className="mt-1 text-rose-700">
                삭제된 계정의 수강 이력, 진도율, 시험 응시 내역이 함께 영구 삭제되며 복구할 수 없습니다. 시스템 보호 관리자 및 본인 계정은 삭제 대상에서 자동 제외됩니다.
              </p>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
            {selectedUserIds.map((id) => {
              const u = users.find((item) => item.id === id);
              if (!u) return null;
              const isProtected = TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(u.email.toLowerCase());
              const isSelf = u.id === currentUser?.id;
              return (
                <div key={id} className="p-2.5 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-slate-800 truncate">{u.name}</span>
                    <span className="text-[11px] text-slate-400 truncate">({u.email})</span>
                  </div>
                  {(isProtected || isSelf) ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-700 font-semibold shrink-0">
                      삭제 제외 ({isProtected ? '보호 계정' : '본인'})
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-700 font-semibold shrink-0">
                      삭제 대상
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              id="btn-confirm-bulk-delete"
              onClick={handleConfirmBulkDelete}
              className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>일괄 삭제 실행</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Single User Delete Confirmation Modal */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="회원 계정 삭제 확인"
      >
        {userToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed">
                <p className="font-bold">선택하신 회원의 계정을 영구 삭제하시겠습니까?</p>
                <p className="mt-1 text-rose-700">
                  해당 회원의 모든 수강 신청 내역, 진도율, 시험 응시 기록 및 수료증 데이터가 영구 파기되며 복구할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p className="text-slate-500 text-[11px]">삭제 대상 회원:</p>
              <p className="font-bold text-slate-900 text-sm">{userToDelete.name}</p>
              <p className="text-slate-500 text-[11px] font-mono">{userToDelete.email} ({userToDelete.role})</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                id="btn-confirm-single-delete-user"
                onClick={handleConfirmSingleDeleteUser}
                className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>계정 삭제 실행</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
