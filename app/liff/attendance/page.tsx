'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface CourseData {
    course_code: string;
    course_name?: string;
    section: string;
    study_code: string;
    instructor?: string;
    attendance_rate: number;
    absence_rate: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    leave_count: number;
    total_sessions: number;
    class_check_raw?: string;
}

interface StudentData {
    student_code: string;
    student_name?: string;
    faculty?: string;
    year_level?: number;
    gpa?: number;
    avg_attendance_rate: number;
    avg_absence_rate: number;
    total_courses: number;
    courses_at_risk: number;
    risk_level: string;
    advisor_name?: string;
}

function parseAttendanceDots(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map(s => s.trim().toUpperCase()).filter(e => ['P', 'A', 'L', 'S'].includes(e));
}

function StatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = {
        P: 'bg-emerald-500',
        A: 'bg-red-500',
        L: 'bg-amber-500',
        S: 'bg-blue-500',
    };
    return (
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${colors[status] || 'bg-gray-300'}`}>
            {status}
        </span>
    );
}

function getRiskBadge(absenceRate: number): { text: string; bg: string } {
    if (absenceRate >= 40) return { text: 'วิกฤต', bg: 'bg-red-500' };
    if (absenceRate >= 20) return { text: 'เฝ้าระวัง', bg: 'bg-orange-500' };
    if (absenceRate >= 10) return { text: 'ติดตาม', bg: 'bg-blue-500' };
    return { text: 'ปกติ', bg: 'bg-emerald-500' };
}

function getRiskBorder(absenceRate: number): string {
    if (absenceRate >= 40) return 'border-l-4 border-l-red-500';
    if (absenceRate >= 20) return 'border-l-4 border-l-orange-500';
    if (absenceRate >= 10) return 'border-l-4 border-l-blue-400';
    return 'border-l-4 border-l-emerald-400';
}

function AttendanceContent() {
    const searchParams = useSearchParams();
    const lineUserId = searchParams.get('lineUserId') || '';

    const [student, setStudent] = useState<StudentData | null>(null);
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
    const [unlinking, setUnlinking] = useState(false);

    useEffect(() => {
        if (lineUserId) fetchData();
    }, [lineUserId]);

    async function fetchData() {
        setLoading(true);
        try {
            const res = await fetch(`/api/liff/profile?lineUserId=${lineUserId}`);
            const data = await res.json();

            if (!data.registered) {
                window.location.href = `/liff/register?lineUserId=${lineUserId}`;
                return;
            }

            setStudent(data.student);
            setCourses(data.courses || []);
        } catch (err) {
            setError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    }

    async function handleUnlink() {
        if (!confirm('ต้องการเปลี่ยนรหัสนักศึกษา?\nระบบจะยกเลิกการผูกรหัสปัจจุบัน')) return;

        setUnlinking(true);
        try {
            await fetch('/api/liff/unlink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineUserId }),
            });
            window.location.href = `/liff/register?lineUserId=${lineUserId}`;
        } catch {
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
            setUnlinking(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
                    <p className="text-gray-500 text-sm">กำลังโหลดข้อมูลการเข้าเรียน...</p>
                </div>
            </div>
        );
    }

    if (error || !student) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-6 text-center max-w-sm w-full">
                    <p className="text-red-500 font-medium mb-3">{error || 'ไม่พบข้อมูล'}</p>
                    <button onClick={fetchData} className="px-6 py-2 bg-green-500 text-white rounded-xl">
                        ลองใหม่
                    </button>
                </div>
            </div>
        );
    }

    const atRiskCourses = courses.filter(c => c.absence_rate >= 20);
    const overallRisk = getRiskBadge(student.avg_absence_rate);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Student Profile Header */}
            <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 text-white px-4 pt-6 pb-8 rounded-b-3xl shadow-lg">
                <div className="max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-lg font-bold">📊 สถิติการเข้าเรียน</h1>
                        <button
                            onClick={handleUnlink}
                            disabled={unlinking}
                            className="text-xs bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
                        >
                            {unlinking ? '...' : 'เปลี่ยนรหัส'}
                        </button>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-mono text-lg font-bold">{student.student_code}</p>
                                <p className="text-green-100 text-sm">{student.student_name || '-'}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${overallRisk.bg}`}>
                                {overallRisk.text}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white/10 rounded-xl py-2">
                                <p className="text-xl font-bold">{Number(student.avg_attendance_rate).toFixed(0)}%</p>
                                <p className="text-[10px] text-green-200">เข้าเรียน</p>
                            </div>
                            <div className="bg-white/10 rounded-xl py-2">
                                <p className="text-xl font-bold">{student.total_courses}</p>
                                <p className="text-[10px] text-green-200">วิชา</p>
                            </div>
                            <div className="bg-white/10 rounded-xl py-2">
                                <p className="text-xl font-bold text-red-300">{atRiskCourses.length}</p>
                                <p className="text-[10px] text-green-200">วิชาเสี่ยง</p>
                            </div>
                        </div>

                        {student.faculty && (
                            <p className="text-[11px] text-green-200 mt-3">
                                🏫 {student.faculty}
                                {student.year_level && ` • ปี ${student.year_level}`}
                                {student.gpa != null && ` • GPA ${Number(student.gpa).toFixed(2)}`}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Courses List */}
            <div className="px-4 -mt-3 max-w-lg mx-auto">
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 mb-3 bg-white rounded-xl py-2 shadow-sm">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> มาเรียน</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> ขาด</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> สาย</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> ลา</span>
                </div>

                {courses.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                        <p className="text-gray-400">ไม่พบข้อมูลรายวิชา</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {courses.map((course, idx) => {
                            const dots = parseAttendanceDots(course.class_check_raw);
                            const risk = getRiskBadge(course.absence_rate);
                            const isExpanded = expandedCourse === idx;

                            return (
                                <div
                                    key={idx}
                                    className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${getRiskBorder(course.absence_rate)}`}
                                >
                                    {/* Course Header — always visible */}
                                    <button
                                        onClick={() => setExpandedCourse(isExpanded ? null : idx)}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-900 text-sm">{course.course_code}</span>
                                                <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white rounded ${risk.bg}`}>
                                                    {risk.text}
                                                </span>
                                            </div>
                                            {course.course_name && (
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{course.course_name}</p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-lg font-bold ${course.absence_rate >= 40 ? 'text-red-600' : course.absence_rate >= 20 ? 'text-orange-600' : 'text-gray-700'}`}>
                                                {Number(course.absence_rate).toFixed(0)}%
                                            </p>
                                            <p className="text-[10px] text-gray-400">ขาด</p>
                                        </div>
                                        <svg
                                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                                            <div className="text-xs text-gray-500 mb-3">
                                                กลุ่ม {course.section}
                                                {course.instructor && ` • อ.${course.instructor}`}
                                                {` • ${course.study_code === 'C' ? 'บรรยาย' : 'ปฏิบัติ'}`}
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-4 gap-1.5 mb-3">
                                                <div className="bg-green-50 rounded-lg py-1.5 text-center">
                                                    <p className="text-sm font-bold text-green-700">{course.present_count}</p>
                                                    <p className="text-[9px] text-green-600">มาเรียน</p>
                                                </div>
                                                <div className="bg-red-50 rounded-lg py-1.5 text-center">
                                                    <p className="text-sm font-bold text-red-700">{course.absent_count}</p>
                                                    <p className="text-[9px] text-red-600">ขาด</p>
                                                </div>
                                                <div className="bg-amber-50 rounded-lg py-1.5 text-center">
                                                    <p className="text-sm font-bold text-amber-700">{course.late_count}</p>
                                                    <p className="text-[9px] text-amber-600">สาย</p>
                                                </div>
                                                <div className="bg-blue-50 rounded-lg py-1.5 text-center">
                                                    <p className="text-sm font-bold text-blue-700">{course.leave_count || 0}</p>
                                                    <p className="text-[9px] text-blue-600">ลา</p>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mb-3">
                                                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                                    <span>เข้าเรียน {Number(course.attendance_rate).toFixed(0)}%</span>
                                                    <span>{course.present_count}/{course.total_sessions} ครั้ง</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-200 rounded-full">
                                                    <div
                                                        className="h-2 rounded-full bg-emerald-500 transition-all"
                                                        style={{ width: `${Math.min(course.attendance_rate, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Attendance Dots */}
                                            {dots.length > 0 && (
                                                <div className="bg-gray-50 rounded-xl p-3">
                                                    <p className="text-[10px] text-gray-400 mb-2">การเช็คชื่อทั้งหมด →</p>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {dots.map((status, i) => (
                                                            <StatusDot key={i} status={status} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer info */}
                <p className="text-center text-[10px] text-gray-300 mt-6">
                    ข้อมูล ณ วันที่ดึงข้อมูลล่าสุด • Student Monitoring System
                </p>
            </div>
        </div>
    );
}

export default function LiffAttendancePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
        }>
            <AttendanceContent />
        </Suspense>
    );
}
