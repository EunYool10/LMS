import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { storage } from '../../services/storage';
import { AchievementBadge } from '../../types';
import { AchievementBookModal } from '../student/AchievementBookModal';

export const AchievementNotificationListener: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeModalBadge, setActiveModalBadge] = useState<AchievementBadge | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [userBadges, setUserBadges] = useState<AchievementBadge[]>([]);

  // Keep ref to avoid stale closures
  const prevEarnedIdsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef<boolean>(false);

  // Check for badge changes whenever storage triggers an update or on interval
  const checkForNewBadges = useCallback(() => {
    if (!user) return;

    try {
      const allBadges = storage.getBadges(user.id);
      setUserBadges(allBadges);

      const currentlyEarned = allBadges.filter((b) => b.unlocked || b.earned);
      const currentEarnedIds = new Set(currentlyEarned.map((b) => b.id));

      const storageKey = `tdsn_notified_badges_${user.id}`;
      const savedNotifiedRaw = localStorage.getItem(storageKey);
      let notifiedIds: Set<string>;

      if (savedNotifiedRaw) {
        try {
          notifiedIds = new Set(JSON.parse(savedNotifiedRaw));
        } catch {
          notifiedIds = new Set(currentEarnedIds);
        }
      } else {
        // First run on clean user session: initialize with current earned badges
        // so we don't bombard them with old achievements on initial load
        notifiedIds = new Set(currentEarnedIds);
        localStorage.setItem(storageKey, JSON.stringify(Array.from(notifiedIds)));
      }

      if (!isInitializedRef.current) {
        prevEarnedIdsRef.current = currentEarnedIds;
        isInitializedRef.current = true;
        return;
      }

      // Find badges that are newly earned and haven't been notified yet
      const newlyEarned = currentlyEarned.filter(
        (b) => !prevEarnedIdsRef.current.has(b.id) && !notifiedIds.has(b.id)
      );

      if (newlyEarned.length > 0) {
        newlyEarned.forEach((badge) => {
          showToast(
            `'${badge.title}' 업적을 달성했습니다! (${badge.conditionText})`,
            'success',
            `🏆 업적 달성! ${badge.icon}`,
            {
              label: '업적 확인 →',
              onClick: () => {
                setActiveModalBadge(badge);
                setIsBookModalOpen(true);
              },
            },
            6500
          );
          notifiedIds.add(badge.id);
        });

        localStorage.setItem(storageKey, JSON.stringify(Array.from(notifiedIds)));
      }

      prevEarnedIdsRef.current = currentEarnedIds;
    } catch {
      // Ignore errors safely
    }
  }, [user, showToast]);

  useEffect(() => {
    if (!user) {
      isInitializedRef.current = false;
      return;
    }

    // Run check on mount / user change
    checkForNewBadges();

    // Listen for custom progress or lesson events if triggered
    const handleProgressUpdate = () => {
      checkForNewBadges();
    };

    window.addEventListener('storage', handleProgressUpdate);
    window.addEventListener('tdsn-progress-update', handleProgressUpdate);

    // Periodic safety check every 4 seconds for active learning / video viewing
    const interval = setInterval(() => {
      checkForNewBadges();
    }, 4000);

    return () => {
      window.removeEventListener('storage', handleProgressUpdate);
      window.removeEventListener('tdsn-progress-update', handleProgressUpdate);
      clearInterval(interval);
    };
  }, [user, checkForNewBadges]);

  const handleCloseBook = useCallback(() => {
    setIsBookModalOpen(false);
    setActiveModalBadge(null);
  }, []);

  if (!user) return null;

  return (
    <AchievementBookModal
      isOpen={isBookModalOpen}
      onClose={handleCloseBook}
      badges={userBadges}
      userBadgeRank={storage.getUserBadgeTitle(user.id)}
      initialBadge={activeModalBadge}
    />
  );
};
