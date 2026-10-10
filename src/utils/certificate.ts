/**
 * Utility functions for Course Certificates
 */
import { storage } from '../services/storage';
import { Course, Enrollment, User } from '../types';

export interface VerifiedCertificateResult {
  isValid: boolean;
  isCompleted: boolean;
  certCode: string;
  enrollment?: Enrollment;
  course?: Course;
  user?: User | null;
  completionDate?: string;
  totalLessons?: number;
  completedLessons?: number;
  progressPercentage?: number;
  verifiedAt?: string;
}

export function generateCertificateCode(courseId: string, userId?: string): string {
  const certIdSeed = `${courseId}_${userId || 'guest'}`;
  let hash = 0;
  for (let i = 0; i < certIdSeed.length; i++) {
    hash = (hash << 5) - hash + certIdSeed.charCodeAt(i);
    hash |= 0;
  }
  return `TDSN-${Math.abs(hash).toString(36).toUpperCase().padStart(8, '0').slice(0, 8)}`;
}

export function formatCertificateDate(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(date.getTime())) {
    return new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Validates and retrieves the original certificate data associated with a certificate number
 */
export function verifyCertificateCode(inputCode: string): VerifiedCertificateResult {
  const normalized = inputCode.trim().toUpperCase();
  if (!normalized) {
    return { isValid: false, isCompleted: false, certCode: inputCode };
  }

  const enrollments = storage.getEnrollments();
  const courses = storage.getCourses(true);
  const users = storage.getUsers();

  for (const enr of enrollments) {
    const course = courses.find((c) => c.id === enr.courseId);
    if (!course) continue;

    const user = users.find((u) => u.id === enr.userId) || null;
    const generated = generateCertificateCode(course.id, user?.id || enr.userId);

    // Exact match or match without hyphen
    if (
      generated.toUpperCase() === normalized ||
      generated.replace(/-/g, '').toUpperCase() === normalized.replace(/-/g, '')
    ) {
      const isCompleted = Boolean(enr.completedAt || enr.progressPercentage >= 100);
      const lessons = storage.getLessons(course.id);
      const progressList = storage.getProgressList(user?.id || enr.userId, course.id);
      const completedLessons = progressList.filter((p) => p.isCompleted).length;
      const completionDate = formatCertificateDate(enr.completedAt || enr.enrolledAt);

      return {
        isValid: true,
        isCompleted,
        certCode: generated,
        enrollment: enr,
        course,
        user,
        completionDate,
        totalLessons: lessons.length,
        completedLessons,
        progressPercentage: enr.progressPercentage,
        verifiedAt: new Date().toLocaleString('ko-KR'),
      };
    }
  }

  return {
    isValid: false,
    isCompleted: false,
    certCode: normalized,
  };
}
