'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Home, Search, X, BookOpen, AlertTriangle, GraduationCap, User, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getRiskLabelThai, getRiskColor, getStudyTypeLabel } from '@/lib/analytics';
import { StudentAnalytics } from '@/lib/types';

interface StudentCourse {
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
    leave_count: number;
    total_sessions: number;
    class_check_raw?: string;
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
        <span
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white ${colors[status] || 'bg-gray-300'}`}
        >
            {status}
        </span>
    );
}

function getCourseRiskBorder(absenceRate: number): string {
    if (absenceRate >= 40) return 'border-red-300 bg-red-50/40';
    if (absenceRate >= 20) return 'border-orange-300 bg-orange-50/30';
    if (absenceRate >= 10) return 'border-blue-200 bg-blue-50/20';
    return 'border-gray-200 bg-white';
}

function getCourseRiskBadge(absenceRate: number): { text: string; color: string } {
    if (absenceRate >= 40) return { text: 'วิกฤต', color: 'bg-red-600 text-white' };
    if (absenceRate >= 20) return { text: 'เฝ้าระวัง', color: 'bg-orange-500 text-white' };
    if (absenceRate >= 10) return { text: 'ติดตาม', color: 'bg-blue-500 text-white' };
    return { text: 'ปกติ', color: 'bg-emerald-500 text-white' };
}

const PAGE_SIZE = 50;

export default function StudentsPage() {
    const [students, setStudents] = useState<StudentAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [riskFilter, setRiskFilter] = useState<string>('all');
    const [facultyFilter, setFacultyFilter] = useState<string>('all');
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalStudents, setTotalStudents] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalStudent, setModalStudent] = useState<StudentAnalytics | null>(null);
    const [modalCourses, setModalCourses] = useState<StudentCourse[]>([]);
    const [modalLoading, setModalLoading] = useState(false);

    // Faculty list for filter
    const [faculties, setFaculties] = useState<string[]>([]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1); // reset to page 1 on search
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [riskFilter, facultyFilter, yearFilter]);

    // Fetch students with pagination
    useEffect(() => {
        fetchStudents();
    }, [currentPage, riskFilter, facultyFilter, yearFilter, debouncedSearch]);

    // Fetch faculties list once
    useEffect(() => {
        fetchFaculties();
    }, []);

    async function fetchFaculties() {
        try {
            const res = await fetch('/api/students?limit=2000&page=1');
            const data = await res.json();
            const allStudents = data.data || [];
            const uniqueFaculties = Array.from(new Set(allStudents.map((s: StudentAnalytics) => s.faculty).filter(Boolean) as string[])).sort();
            setFaculties(uniqueFaculties);
        } catch (error) {
            console.error('Error fetching faculties:', error);
        }
    }

    async function fetchStudents() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (riskFilter !== 'all') params.append('riskLevel', riskFilter);
            if (facultyFilter !== 'all') params.append('faculty', facultyFilter);
            if (yearFilter !== 'all') params.append('yearLevel', yearFilter);
            if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
            params.append('limit', String(PAGE_SIZE));
            params.append('page', String(currentPage));

            const res = await fetch(`/api/students?${params.toString()}`);
            const data = await res.json();
            setStudents(data.data || []);
            setTotalStudents(data.total || 0);
            setTotalPages(data.totalPages || 1);
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

    function exportExcel() {
        // Export ALL filtered students (not just current page)
        async function doExport() {
            const params = new URLSearchParams();
            if (riskFilter !== 'all') params.append('riskLevel', riskFilter);
            if (facultyFilter !== 'all') params.append('faculty', facultyFilter);
            if (yearFilter !== 'all') params.append('yearLevel', yearFilter);
            if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
            params.append('limit', '5000');
            params.append('page', '1');

            const res = await fetch(`/api/students?${params.toString()}`);
            const data = await res.json();
            const allFiltered = data.data || [];

            const BOM = '\uFEFF';
            const headers = ['ลำดับ', 'รหัสนักศึกษา', 'ชื่อ-สกุล', 'คณะ', 'ปีการศึกษา', 'GPA', 'จำนวนวิชา', 'เข้าเรียนเฉลี่ย(%)', 'ขาดเฉลี่ย(%)', 'วิชาเสี่ยง', 'ระดับความเสี่ยง', 'อาจารย์ที่ปรึกษา'];
            const rows = allFiltered.map((s: StudentAnalytics, i: number) => [
                i + 1,
                s.student_code,
                s.student_name || '-',
                s.faculty || '-',
                s.year_level || '-',
                s.gpa != null ? Number(s.gpa).toFixed(2) : '-',
                s.total_courses,
                Number(s.avg_attendance_rate).toFixed(1),
                Number(s.avg_absence_rate).toFixed(1),
                s.courses_at_risk,
                getRiskLabelThai(s.risk_level),
                s.advisor_name || '-',
            ]);
            const csvContent = BOM + [headers.join(','), ...rows.map((r: (string | number)[]) => r.map(cell => `"${cell}"`).join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `students_${riskFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        }
        doExport();
    }

    const startRecord = (currentPage - 1) * PAGE_SIZE + 1;
    const endRecord = Math.min(currentPage * PAGE_SIZE, totalStudents);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">รายชื่อนักศึกษา</h1>
                            <p className="text-sm text-gray-500">ทั้งหมด {totalStudents} คน</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={exportExcel}
                                disabled={totalStudents === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            >
                                <Download className="w-4 h-4" />
                                Export Excel
                            </button>
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors"
                            >
                                <Home className="w-5 h-5" />
                                <span className="hidden sm:inline">กลับหน้าแดชบอร์ด</span>
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

                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { key: 'all', label: 'ทั้งหมด', active: 'bg-blue-600 text-white', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
                                    { key: 'critical', label: 'วิกฤต', active: 'bg-red-600 text-white', inactive: 'bg-red-50 text-red-600 hover:bg-red-100' },
                                    { key: 'monitor', label: 'เฝ้าระวัง', active: 'bg-orange-600 text-white', inactive: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
                                    { key: 'follow_up', label: 'ติดตาม', active: 'bg-blue-600 text-white', inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                                ].map(btn => (
                                    <button
                                        key={btn.key}
                                        onClick={() => setRiskFilter(btn.key)}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${riskFilter === btn.key ? btn.active : btn.inactive}`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
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
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="all">ชั้นปีทั้งหมด</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(y => (
                                        <option key={y} value={y}>ปี {y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Student Table */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                        <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-md">
                        <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">ไม่พบนักศึกษา</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-left">
                                            <th className="px-4 py-3 font-semibold text-gray-700">#</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">รหัส</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">ชื่อ</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">คณะ</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">ปี</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">GPA</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">% ขาด</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">วิชาเสี่ยง</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {students.map((student, index) => (
                                            <tr key={student.student_code} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-2.5 text-gray-500">{startRecord + index}</td>
                                                <td className="px-4 py-2.5 font-mono text-gray-900 font-medium">{student.student_code}</td>
                                                <td className="px-4 py-2.5 text-gray-700 max-w-[180px] truncate">{student.student_name || '-'}</td>
                                                <td className="px-4 py-2.5 text-gray-600 max-w-[150px] truncate">{student.faculty || '-'}</td>
                                                <td className="px-4 py-2.5 text-gray-600">{student.year_level || '-'}</td>
                                                <td className={`px-4 py-2.5 font-medium ${student.gpa != null && student.gpa < 2.0 ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {student.gpa != null ? Number(student.gpa).toFixed(2) : '-'}
                                                </td>
                                                <td className="px-4 py-2.5 font-semibold text-red-600">{Number(student.avg_absence_rate).toFixed(1)}%</td>
                                                <td className="px-4 py-2.5">
                                                    <button
                                                        onClick={() => handleClickCourses(student)}
                                                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium text-xs"
                                                    >
                                                        {student.courses_at_risk > 0 ? `🔴 ${student.courses_at_risk} วิชา` : 'ดูวิชา'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRiskColor(student.risk_level)}`}>
                                                        {getRiskLabelThai(student.risk_level)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        <div className="mt-4 bg-white rounded-xl shadow-md px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-sm text-gray-500">
                                แสดง <span className="font-semibold text-gray-900">{startRecord}-{endRecord}</span> จาก <span className="font-semibold text-gray-900">{totalStudents}</span> คน
                                <span className="ml-2 text-gray-400">(หน้า {currentPage}/{totalPages})</span>
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="หน้าแรก"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="หน้าก่อน"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                {/* Page Numbers */}
                                {(() => {
                                    const pages: number[] = [];
                                    const maxVisiblePages = 5;
                                    let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                    const end = Math.min(totalPages, start + maxVisiblePages - 1);
                                    if (end - start + 1 < maxVisiblePages) {
                                        start = Math.max(1, end - maxVisiblePages + 1);
                                    }
                                    for (let i = start; i <= end; i++) {
                                        pages.push(i);
                                    }
                                    return pages.map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p === currentPage
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'hover:bg-gray-100 text-gray-700'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ));
                                })()}

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="หน้าถัดไป"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="หน้าสุดท้าย"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Modal Popup — All Courses */}
            {modalOpen && modalStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" />
                                    รายวิชาทั้งหมด
                                </h2>
                                <p className="text-blue-100 text-sm mt-1">
                                    นักศึกษา: <span className="font-mono font-semibold text-white">{modalStudent.student_code}</span>
                                    {modalStudent.student_name && (
                                        <span className="ml-2 text-white">{modalStudent.student_name}</span>
                                    )}
                                </p>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    {modalStudent.faculty && (
                                        <span className="text-blue-200 text-xs">{modalStudent.faculty}</span>
                                    )}
                                    {modalStudent.advisor_name && (
                                        <span className="text-blue-200 text-xs">• ที่ปรึกษา: {modalStudent.advisor_name}</span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${modalStudent.risk_level === 'critical' ? 'bg-red-500 text-white' :
                                            modalStudent.risk_level === 'monitor' ? 'bg-orange-500 text-white' :
                                                modalStudent.risk_level === 'follow_up' ? 'bg-blue-400 text-white' :
                                                    'bg-emerald-400 text-white'
                                        }`}>
                                        ภาพรวม: {getRiskLabelThai(modalStudent.risk_level)} ({Number(modalStudent.avg_absence_rate).toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[65vh]">
                            {modalLoading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                                    <p className="text-gray-500">กำลังโหลดข้อมูลรายวิชา...</p>
                                </div>
                            ) : modalCourses.length === 0 ? (
                                <div className="text-center py-12">
                                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">ไม่พบข้อมูลรายวิชา</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                                        <span>ทั้งหมด <span className="font-bold text-gray-900">{modalCourses.length}</span> วิชา</span>
                                        <span>•</span>
                                        <span className="text-red-600 font-medium">
                                            ⚠ {modalCourses.filter(c => c.absence_rate >= 20).length} วิชาเสี่ยง
                                        </span>
                                    </div>

                                    {modalCourses.map((course, idx) => {
                                        const riskBadge = getCourseRiskBadge(course.absence_rate);
                                        const dots = parseAttendanceDots(course.class_check_raw);

                                        return (
                                            <div key={idx} className={`border rounded-xl p-4 transition-all ${getCourseRiskBorder(course.absence_rate)}`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <BookOpen className="w-4 h-4 text-gray-500" />
                                                            <span className="text-base font-semibold text-gray-900">
                                                                {course.course_code}
                                                            </span>
                                                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                                                                {getStudyTypeLabel(course.study_code as 'C' | 'L')}
                                                            </span>
                                                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${riskBadge.color}`}>
                                                                {riskBadge.text}
                                                            </span>
                                                        </div>

                                                        {course.course_name && (
                                                            <div className="text-sm text-gray-700 mb-1 ml-6">
                                                                {course.course_name}
                                                            </div>
                                                        )}

                                                        <div className="text-sm text-gray-600 ml-6">
                                                            กลุ่มเรียน: <span className="font-medium">{course.section}</span>
                                                            {course.instructor && (
                                                                <span className="ml-3 text-gray-500">อาจารย์: {course.instructor}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Attendance Stats */}
                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                                                    <div className="bg-green-50 rounded-lg px-2 py-1.5 text-center">
                                                        <div className="text-[10px] text-green-600">มาเรียน</div>
                                                        <div className="text-sm font-bold text-green-700">{course.present_count}/{course.total_sessions}</div>
                                                    </div>
                                                    <div className="bg-red-50 rounded-lg px-2 py-1.5 text-center">
                                                        <div className="text-[10px] text-red-600">ขาด</div>
                                                        <div className="text-sm font-bold text-red-700">{course.absent_count}/{course.total_sessions}</div>
                                                    </div>
                                                    <div className="bg-orange-50 rounded-lg px-2 py-1.5 text-center">
                                                        <div className="text-[10px] text-orange-600">สาย</div>
                                                        <div className="text-sm font-bold text-orange-700">{course.late_count}</div>
                                                    </div>
                                                    <div className="bg-blue-50 rounded-lg px-2 py-1.5 text-center">
                                                        <div className="text-[10px] text-blue-600">ลา</div>
                                                        <div className="text-sm font-bold text-blue-700">{course.leave_count || 0}</div>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                                                        <div className="text-[10px] text-gray-600">% ขาด</div>
                                                        <div className={`text-sm font-bold ${course.absence_rate >= 40 ? 'text-red-600' : course.absence_rate >= 20 ? 'text-orange-600' : 'text-gray-700'}`}>
                                                            {Number(course.absence_rate).toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Attendance Dots */}
                                                {dots.length > 0 && (
                                                    <div className="bg-gray-50/80 rounded-lg p-2.5 mt-3">
                                                        <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide">การเช็คชื่อทั้งหมด →</p>
                                                        <div className="flex items-center gap-0.5 flex-wrap">
                                                            {dots.map((status, i) => (
                                                                <StatusDot key={i} status={status} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Progress Bar */}
                                                <div className="mt-2">
                                                    <div className="w-full h-1.5 bg-gray-200 rounded-full">
                                                        <div
                                                            className={`h-1.5 rounded-full ${course.absence_rate >= 40 ? 'bg-red-500' : course.absence_rate >= 20 ? 'bg-orange-400' : course.absence_rate >= 10 ? 'bg-blue-400' : 'bg-emerald-400'}`}
                                                            style={{ width: `${Math.min(course.absence_rate, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> มาเรียน</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> ขาด</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> สาย</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> ลา</span>
                            </div>
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
