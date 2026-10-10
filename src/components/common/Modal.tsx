import React, { ReactNode } from 'react';
import { BaseModal, BaseModalProps } from './BaseModal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: BaseModalProps['maxWidth'];
}

/**
 * Standard Modal component for backwards compatibility
 * Powered by unified BaseModal with portal & scroll lock
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth={maxWidth}
    >
      {children}
    </BaseModal>
  );
};
