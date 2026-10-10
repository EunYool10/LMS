import React from 'react';
import { SystemSettingsView } from '../../components/admin/SystemSettingsView';

export const AdminSettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <SystemSettingsView />
    </div>
  );
};
