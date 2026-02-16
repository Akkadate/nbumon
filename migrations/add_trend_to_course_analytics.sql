-- Add trend column to course_analytics
ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT 'stable';
