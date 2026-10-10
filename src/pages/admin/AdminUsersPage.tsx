import React from 'react';
import { UserManager } from '../../components/admin/UserManager';

export const AdminUsersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <UserManager />
    </div>
  );
};
