import { AttendanceStatus, ParsedAttendance, RiskLevel } from './types';

/**
 * Parse attendance string and calculate statistics
 * @param classCheck - Comma-separated attendance string (e.g. "P,A,,L,S,P")
 * @returns Parsed attendance data with statistics
 */
export function parseAttendanceString(classCheck: string): ParsedAttendance {
    if (!classCheck || classCheck.trim() === '') {
        return {
            totalSessions: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            leaveCount: 0,
            noCheckCount: 0,
            attendanceRate: 0,
            absenceRate: 0,
            sessions: []
        };
    }

    // Remove quotes if present
    const cleaned = classCheck.replace(/"/g, '');
    const sessions = cleaned.split(',') as AttendanceStatus[];

    const totalSessions = sessions.length;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let noCheckCount = 0;

    sessions.forEach(session => {
        const status = session.trim();
        switch (status) {
            case 'P':
                presentCount++;
                break;
            case 'A':
                absentCount++;
                break;
            case 'L':
                lateCount++;
                break;
            case 'S':
                leaveCount++;
                break;
            case '':
                noCheckCount++;
                break;
        }
    });

    // Calculate rates (excluding no-check sessions)
    const validSessions = totalSessions - noCheckCount;
    const attendanceRate = validSessions > 0 ? (presentCount / validSessions) * 100 : 0;
    const absenceRate = validSessions > 0 ? (absentCount / validSessions) * 100 : 0;

    return {
        totalSessions,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        noCheckCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        absenceRate: Math.round(absenceRate * 100) / 100,
        sessions
    };
}

/**
 * Calculate risk level based on absence rate
 * @param absenceRate - Percentage of absences
 * @returns Risk level classification
 */
export function calculateStudentRisk(absenceRate: number): RiskLevel {
    if (absenceRate >= 40) {
        return 'critical'; // วิฤต
    } else if (absenceRate >= 20) {
        return 'monitor'; // เฝ้าระวัง
    } else if (absenceRate >= 10) {
        return 'follow_up'; // ติดตาม
    }
    return 'normal';
}

/**
 * Get Thai label for risk level
 */
export function getRiskLabelThai(riskLevel: RiskLevel): string {
    const labels = {
        critical: 'วิฤต',
        monitor: 'เฝ้าระวัง',
        follow_up: 'ติดตาม',
        normal: 'ปกติ'
    };
    return labels[riskLevel];
}

/**
 * Get color class for risk level
 */
export function getRiskColor(riskLevel: RiskLevel): string {
    const colors = {
        critical: 'text-red-600 bg-red-50',
        monitor: 'text-orange-600 bg-orange-50',
        follow_up: 'text-blue-600 bg-blue-50',
        normal: 'text-green-600 bg-green-50'
    };
    return colors[riskLevel];
}

/**
 * Check if a course has no attendance checks (only commas)
 */
export function hasNoAttendanceChecks(classCheck: string): boolean {
    if (!classCheck) return true;
    const cleaned = classCheck.replace(/"/g, '').replace(/,/g, '');
    return cleaned.trim() === '';
}

/**
 * Get study type label in Thai
 */
export function getStudyTypeLabel(studyCode: 'C' | 'L'): string {
    return studyCode === 'C' ? 'ทฤษฎี' : 'ปฏิบัติ';
}

/**
 * Format course display name
 */
export function formatCourseName(courseCode: string, section: string, studyCode: 'C' | 'L'): string {
    return `${courseCode} กลุ่ม ${section} (${getStudyTypeLabel(studyCode)})`;
}
