import React from 'react';
import {
  Award,
  BookOpen,
  BrainCircuit,
  Briefcase,
  Building2,
  Code2,
  FileSpreadsheet,
  GraduationCap,
  LucideProps,
  MoreHorizontal,
  Palette,
  Target,
  TrendingUp,
  Video,
} from 'lucide-react';
import { getCategoryById, LEGACY_CATEGORY_MAP } from '../../data/categoriesData';

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  Award,
  BrainCircuit,
  Briefcase,
  Building2,
  Code2,
  FileSpreadsheet,
  GraduationCap,
  MoreHorizontal,
  Palette,
  Target,
  TrendingUp,
  Video,
};

export function resolveCategory(categoryId?: string) {
  return getCategoryById(categoryId ? LEGACY_CATEGORY_MAP[categoryId] || categoryId : undefined);
}

interface CategoryIconProps extends LucideProps {
  categoryId?: string;
}

/** Lucide icon registered for a course category (falls back to a book). */
export const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryId, ...props }) => {
  const Icon = ICONS[resolveCategory(categoryId)?.icon || ''] || BookOpen;
  return <Icon {...props} />;
};
