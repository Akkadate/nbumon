'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Search, X, BookOpen, AlertTriangle, GraduationCap, User } from 'lucide-react';
import { getRiskLabelThai, getRiskColor, getStudyTypeLabel } from '@/lib/analytics';
import { StudentAnalytics } from '@/lib/types';

interface AtRiskCourse {
    course_code: string;
    course_name?: string;
    revision_code: string;
    section: string;
    study_code: string;
    instructor?: string;
    attendance_rate: number;
    absence_rate: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    total_sessions: number;
}

export default function StudentsPage() {
    const [students, setStudents] = useState<StudentAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [riskFilter, setRiskFilter] = useState<string>('all');
    const [facultyFilter, setFacultyFilter] = useState<string>('all');
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [search, setSearch] = useState('');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalStudent, setModalStudent] = useState<StudentAnalytics | null>(null);
    const [modalCourses, setModalCourses] = useState<AtRiskCourse[]>([]);
    const [modalLoading, setModalLoading] = useState(false);

    // Faculty list for filter
    const [faculties, setFaculties] = useState<string[]>([]);

    useEffect(() => {
        fetchStudents();
    }, [riskFilter, facultyFilter, yearFilter]);

    // Extract unique faculties from data
    useEffect(() => {
        const uniqueFaculties = Array.from(new Set(students.map(s => s.faculty).filter(Boolean) as string[])).sort();
        setFaculties(uniqueFaculties);
    }, [students]);

    async function fetchStudents() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (riskFilter !== 'all') {
                params.append('riskLevel', riskFilter);
            }
            if (facultyFilter !== 'all') {
                params.append('faculty', facultyFilter);
            }
            if (yearFilter !== 'all') {
                params.append('yearLevel', yearFilter);
            }
            params.append('limit', '500');

            const res = await fetch(`/api/students?${params.toString()}`);
            const data = await res.json();
            setStudents(data.data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleClickCourses(student: StudentAnalytics) {
        setModalStudent(student);
        setModalOpen(true);
        setModalLoading(true);
        try {
            const res = await fetch(`/api/student-courses?studentCode=${student.student_code}`);
            const data = await res.json();
            setModalCourses(data.data || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
            setModalCourses([]);
        } finally {
            setModalLoading(false);
        }
    }

    const filteredStudents = students.filter(student => {
        const searchLower = search.toLowerCase();
        return (
            student.student_code.toLowerCase().includes(searchLower) ||
            (student.student_name && student.student_name.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">รายชื่อนักศึกษา</h1>
                            <p className="text-sm text-gray-500">จำนวน {filteredStudents.length} คน</p>
                        </div>
                        <div className="flex gap-4">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors"
                            >
                                <Home className="w-5 h-5" />
                                <span>กลับหน้าแดชบอร์ด</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <div className="flex flex-col gap-4">
                        {/* Row 1: Search + Risk Filter */}
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหารหัสนักศึกษาหรือชื่อ..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Risk Filter */}
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setRiskFilter('all')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${riskFilter === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    ทั้งหมด
                                </button>
                                <button
                                    onClick={() => setRiskFilter('critical')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${riskFilter === 'critical'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                                        }`}
                                >
                                    วิกฤต
                                </button>
                                <button
                                    onClick={() => setRiskFilter('monitor')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${riskFilter === 'monitor'
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                        }`}
                                >
                                    เฝ้าระวัง
                                </button>
                                <button
                                    onClick={() => setRiskFilter('follow_up')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${riskFilter === 'follow_up'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                        }`}
                                >
                                    ติดตาม
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Faculty + Year Level Filters */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-gray-400" />
                                <select
                                    value={facultyFilter}
                                    onChange={(e) => setFacultyFilter(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                                >
                                    <option value="all">คณะทั้งหมด</option>
                                    {faculties.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <select
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
                                >
                                    <option value="all">ชั้นปีทั้งหมด</option>
                                    <option value="1">ปี 1</option>
                                    <option value="2">ปี 2</option>
                                    <option value="3">ปี 3</option>
                                    <option value="4">ปี 4</option>
                                    <option value="5">ปี 5</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Students Table */}
                {loading ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <p className="text-gray-600">ไม่พบข้อมูลนักศึกษา</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            นักศึกษา
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            คณะ
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ชั้นปี
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            GPA
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            วิชา
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            % มาเรียน
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            % ขาดเรียน
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ระดับความเสี่ยง
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            วิชาเสี่ยง
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {student.student_code}
                                                </div>
                                                {student.student_name && (
                                                    <div className="text-xs text-gray-500">
                                                        {student.student_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-xs text-gray-600 max-w-[150px] truncate" title={student.faculty || ''}>
                                                    {student.faculty || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <span className="text-sm text-gray-900">
                                                    {student.year_level || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <span className={`text-sm font-medium ${student.gpa && student.gpa < 2.0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {student.gpa != null ? student.gpa.toFixed(2) : '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <div className="text-sm text-gray-900">{student.total_courses}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 w-16 h-2 bg-gray-200 rounded-full mr-2">
                                                        <div
                                                            className="h-2 bg-green-500 rounded-full"
                                                            style={{ width: `${student.avg_attendance_rate}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-gray-900">
                                                        {student.avg_attendance_rate.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 w-16 h-2 bg-gray-200 rounded-full mr-2">
                                                        <div
                                                            className="h-2 bg-red-500 rounded-full"
                                                            style={{ width: `${student.avg_absence_rate}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-medium text-red-600">
                                                        {student.avg_absence_rate.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskColor(student.risk_level)}`}>
                                                    {getRiskLabelThai(student.risk_level)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                                                {student.courses_at_risk > 0 ? (
                                                    <button
                                                        onClick={() => handleClickCourses(student)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors cursor-pointer border border-red-200 hover:border-red-300 hover:shadow-sm"
                                                    >
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        <span className="font-medium">{student.courses_at_risk} วิชา</span>
                                                        <span className="text-red-400 text-xs ml-1">คลิกดู</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-green-600">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal Popup */}
            {modalOpen && modalStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    วิชาที่มีความเสี่ยง
                                </h2>
                                <p className="text-red-100 text-sm mt-1">
                                    นักศึกษา: <span className="font-mono font-semibold text-white">{modalStudent.student_code}</span>
                                    {modalStudent.student_name && (
                                        <span className="ml-2 text-white">{modalStudent.student_name}</span>
                                    )}
                                </p>
                                {modalStudent.faculty && (
                                    <p className="text-red-200 text-xs mt-0.5">
                                        {modalStudent.faculty} {modalStudent.advisor_name && `• อาจารย์ที่ปรึกษา: ${modalStudent.advisor_name}`}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {modalLoading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-3"></div>
                                    <p className="text-gray-500">กำลังโหลดข้อมูลรายวิชา...</p>
                                </div>
                            ) : modalCourses.length === 0 ? (
                                <div className="text-center py-12">
                                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">ไม่พบวิชาที่มีความเสี่ยง</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500 mb-4">
                                        พบ <span className="font-semibold text-red-600">{modalCourses.length}</span> วิชาที่มีอัตราการขาดเรียนสูง
                                        {modalStudent && (
                                            <span className="ml-1">
                                                ({modalStudent.risk_level === 'critical' ? 'ระดับวิกฤต ≥ 40%' :
                                                    modalStudent.risk_level === 'monitor' ? 'ระดับเฝ้าระวัง 20-39%' :
                                                        modalStudent.risk_level === 'follow_up' ? 'ระดับติดตาม 10-19%' :
                                                            'ขาดเรียน ≥ 20%'})
                                            </span>
                                        )}
                                    </p>

                                    {modalCourses.map((course, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded-xl p-4 hover:border-red-200 hover:bg-red-50/30 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <BookOpen className="w-4 h-4 text-blue-600" />
                                                        <span className="text-base font-semibold text-gray-900">
                                                            {course.course_code}
                                                        </span>
                                                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                                                            {getStudyTypeLabel(course.study_code as 'C' | 'L')}
                                                        </span>
                                                    </div>

                                                    {course.course_name && (
                                                        <div className="text-sm text-gray-700 mb-1 ml-6">
                                                            {course.course_name}
                                                        </div>
                                                    )}

                                                    <div className="text-sm text-gray-600 mb-3 ml-6">
                                                        กลุ่มเรียน: <span className="font-medium">{course.section}</span>
                                                        {course.instructor && (
                                                            <span className="ml-3 text-gray-500">อาจารย์: {course.instructor}</span>
                                                        )}
                                                    </div>

                                                    {/* Attendance Stats */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
                                                            <div className="text-xs text-green-600 mb-0.5">มาเรียน</div>
                                                            <div className="text-sm font-bold text-green-700">{course.present_count}/{course.total_sessions}</div>
                                                        </div>
                                                        <div className="bg-red-50 rounded-lg px-3 py-2 text-center">
                                                            <div className="text-xs text-red-600 mb-0.5">ขาดเรียน</div>
                                                            <div className="text-sm font-bold text-red-700">{course.absent_count}/{course.total_sessions}</div>
                                                        </div>
                                                        <div className="bg-orange-50 rounded-lg px-3 py-2 text-center">
                                                            <div className="text-xs text-orange-600 mb-0.5">สาย</div>
                                                            <div className="text-sm font-bold text-orange-700">{course.late_count}</div>
                                                        </div>
                                                        <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                                                            <div className="text-xs text-gray-600 mb-0.5">% ขาด</div>
                                                            <div className="text-sm font-bold text-red-600">{course.absence_rate.toFixed(1)}%</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Absence Progress Bar */}
                                            <div className="mt-3">
                                                <div className="w-full h-2 bg-gray-200 rounded-full">
                                                    <div
                                                        className={`h-2 rounded-full ${course.absence_rate >= 40 ? 'bg-red-500' : 'bg-orange-400'}`}
                                                        style={{ width: `${Math.min(course.absence_rate, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
