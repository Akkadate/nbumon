'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, AlertOctagon, Search, ChevronDown, ChevronUp, User, BookOpen, GraduationCap } from 'lucide-react';

interface FlaggedCourse {
    course_code: string;
    course_name: string | null;
    section: string;
    instructor: string | null;
    consecutive_absences: number;
    last_statuses: string[];
    absence_rate: number;
    total_sessions: number;
}

interface FlaggedStudent {
    student_code: string;
    student_name: string | null;
    faculty: string | null;
    year_level: number | null;
    gpa: number | null;
    advisor_name: string | null;
    courses: FlaggedCourse[];
    total_flagged_courses: number;
}

function StatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = {
        P: 'bg-emerald-500',
        A: 'bg-red-500',
        L: 'bg-amber-500',
        S: 'bg-blue-500',
    };
    const labels: Record<string, string> = {
        P: 'มาเรียน',
        A: 'ขาด',
        L: 'สาย',
        S: 'ลา',
    };
    return (
        <span
            title={labels[status] || status}
            className={`inline-block w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${colors[status] || 'bg-gray-300'}`}
        >
            {status}
        </span>
    );
}

export default function ConsecutiveAbsencePage() {
    const [students, setStudents] = useState<FlaggedStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [minConsecutive, setMinConsecutive] = useState(3);

    useEffect(() => {
        fetchData();
    }, [minConsecutive]);

    async function fetchData() {
        setLoading(true);
        try {
            const res = await fetch(`/api/consecutive-absence?min=${minConsecutive}`);
            const json = await res.json();
            setStudents(json.data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredStudents = students.filter(s => {
        const q = search.toLowerCase();
        return (
            s.student_code.toLowerCase().includes(q) ||
            (s.student_name && s.student_name.toLowerCase().includes(q)) ||
            (s.faculty && s.faculty.toLowerCase().includes(q))
        );
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-orange-50/20">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/60 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-red-500 to-orange-500 p-2.5 rounded-xl shadow-lg shadow-red-200">
                                <AlertOctagon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    🔴 นักศึกษาขาดเรียนติดต่อกัน
                                </h1>
                                <p className="text-xs text-gray-500">
                                    นักศึกษาที่ขาดเรียนล่าสุด {minConsecutive} ครั้งติดต่อกันขึ้นไป
                                </p>
                            </div>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm">
                            <Home className="w-4 h-4" />
                            <span className="hidden sm:inline">กลับแดชบอร์ด</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Controls */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="ค้นหารหัส, ชื่อ หรือคณะ..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                            />
                        </div>

                        {/* Min consecutive filter */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 whitespace-nowrap">ขาดขั้นต่ำ:</label>
                            <select
                                value={minConsecutive}
                                onChange={e => setMinConsecutive(parseInt(e.target.value))}
                                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                                <option value={2}>2 ครั้ง</option>
                                <option value={3}>3 ครั้ง</option>
                                <option value={4}>4 ครั้ง</option>
                                <option value={5}>5 ครั้ง</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
                            <p className="text-3xl font-bold text-red-600">{filteredStudents.length}</p>
                            <p className="text-xs text-gray-500 mt-1">นักศึกษาที่พบ</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
                            <p className="text-3xl font-bold text-orange-600">
                                {filteredStudents.reduce((sum, s) => sum + s.total_flagged_courses, 0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">วิชาที่ต้องติดตาม</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center col-span-2 md:col-span-1">
                            <p className="text-3xl font-bold text-gray-900">
                                {filteredStudents.length > 0 ? Math.max(...filteredStudents.flatMap(s => s.courses.map(c => c.consecutive_absences))) : 0}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">ขาดติดต่อสูงสุด (ครั้ง)</p>
                        </div>
                    </div>
                )}

                {/* Student List */}
                {loading ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-3"></div>
                        <p className="text-gray-500">กำลังวิเคราะห์ข้อมูลการเช็คชื่อ...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <AlertOctagon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">ไม่พบนักศึกษาที่ขาดเรียนติดต่อกัน {minConsecutive} ครั้ง</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredStudents.map(student => (
                            <div key={student.student_code} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                {/* Student Header */}
                                <button
                                    onClick={() => setExpandedStudent(
                                        expandedStudent === student.student_code ? null : student.student_code
                                    )}
                                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
                                >
                                    <div className="bg-red-50 p-2.5 rounded-xl flex-shrink-0">
                                        <User className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-gray-900">{student.student_code}</span>
                                            {student.student_name && (
                                                <span className="text-sm text-gray-600">{student.student_name}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                            {student.faculty && (
                                                <span className="flex items-center gap-1">
                                                    <GraduationCap className="w-3 h-3" />
                                                    <span className="truncate max-w-[200px]">{student.faculty}</span>
                                                </span>
                                            )}
                                            {student.year_level && <span>ปี {student.year_level}</span>}
                                            {student.gpa != null && (
                                                <span className={student.gpa < 2.0 ? 'text-red-500 font-medium' : ''}>
                                                    GPA {student.gpa.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="text-right">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">
                                                <AlertOctagon className="w-3 h-3" />
                                                {student.total_flagged_courses} วิชา
                                            </span>
                                        </div>
                                        {expandedStudent === student.student_code ? (
                                            <ChevronUp className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded Course Details */}
                                {expandedStudent === student.student_code && (
                                    <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3">
                                        {student.advisor_name && (
                                            <p className="text-xs text-gray-500 mb-2">
                                                อาจารย์ที่ปรึกษา: <span className="font-medium text-gray-700">{student.advisor_name}</span>
                                            </p>
                                        )}
                                        {student.courses
                                            .sort((a, b) => b.consecutive_absences - a.consecutive_absences)
                                            .map((course, idx) => (
                                                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <BookOpen className="w-4 h-4 text-gray-400" />
                                                                <span className="font-semibold text-gray-900 text-sm">{course.course_code}</span>
                                                                <span className="text-xs text-gray-400">Sec {course.section}</span>
                                                            </div>
                                                            {course.course_name && (
                                                                <p className="text-xs text-gray-600 mt-0.5 ml-6">{course.course_name}</p>
                                                            )}
                                                            {course.instructor && (
                                                                <p className="text-xs text-gray-400 ml-6">ผู้สอน: {course.instructor}</p>
                                                            )}
                                                        </div>
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-lg">
                                                            ขาด {course.consecutive_absences} ครั้งติดกัน
                                                        </span>
                                                    </div>

                                                    {/* Attendance dots */}
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">การเช็คชื่อล่าสุด →</p>
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {course.last_statuses.map((status, i) => (
                                                                <StatusDot key={i} status={status} />
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> มาเรียน</span>
                                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> ขาด</span>
                                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> สาย</span>
                                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> ลา</span>
                                                        </div>
                                                    </div>

                                                    {/* Stats */}
                                                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                                        <span>อัตราขาดเรียน: <span className="font-semibold text-red-600">{course.absence_rate.toFixed(1)}%</span></span>
                                                        <span>เช็คชื่อทั้งหมด: {course.total_sessions} ครั้ง</span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
