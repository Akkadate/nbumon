-- Add faculty column to course_analytics for efficient filtering
ALTER TABLE course_analytics 
ADD COLUMN IF NOT EXISTS faculty VARCHAR(100);

-- Create index for faster filtering by faculty
CREATE INDEX IF NOT EXISTS idx_course_analytics_faculty ON course_analytics(faculty);

-- Update comment
COMMENT ON COLUMN course_analytics.faculty IS 'Faculty name for filtering/grouping';
