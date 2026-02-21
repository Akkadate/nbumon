'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Home, Search, Users, Shield, TrendingDown, BookOpen, Download, AlertTriangle, Monitor, UserCheck, ChevronRight, ChevronsLeft, ChevronLeft, ChevronsRight } from 'lucide-react';
import { getRiskLabelThai, getRiskColor, getStudyTypeLabel } from '@/lib/analytics';
import { StudentAnalytics } from '@/lib/types';
import { X } from 'lucide-react';

interface Stats {
    students: {
        total: number;
        critical: number;
        monitor: number;
        followUp: number;
        normal: number;
    };
}

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

function getCourseRiskBadge(absenceRate: number): { text: string; color: string } {
    if (absenceRate >= 40) return { text: 'วิกฤต', color: 'bg-red-600 text-white' };
    if (absenceRate >= 20) return { text: 'เฝ้าระวัง', color: 'bg-orange-500 text-white' };
    if (absenceRate >= 10) return { text: 'ติดตาม', color: 'bg-blue-500 text-white' };
    return { text: 'ปกติ', color: 'bg-emerald-500 text-white' };
}

function getCourseRiskBorder(absenceRate: number): string {
    if (absenceRate >= 40) return 'border-red-300 bg-red-50/40';
    if (absenceRate >= 20) return 'border-orange-300 bg-orange-50/30';
    if (absenceRate >= 10) return 'border-blue-200 bg-blue-50/20';
    return 'border-gray-200 bg-white';
}

const PAGE_SIZE = 50;

export default function AdvisorDashboardPage() {
    const [advisors, setAdvisors] = useState<string[]>([]);
    const [selectedAdvisor, setSelectedAdvisor] = useState<string>('');
    const [loadingAdvisors, setLoadingAdvisors] = useState(true);

    const [stats, setStats] = useState<Stats | null>(null);
    const [students, setStudents] = useState<StudentAnalytics[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalStudents, setTotalStudents] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalStudent, setModalStudent] = useState<StudentAnalytics | null>(null);
    const [modalCourses, setModalCourses] = useState<StudentCourse[]>([]);
    const [modalLoading, setModalLoading] = useState(false);

    // Advisor searchable dropdown
    const [advisorInputValue, setAdvisorInputValue] = useState('');
    const [advisorDropdownOpen, setAdvisorDropdownOpen] = useState(false);
    const advisorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchAdvisors();
    }, []);

    // Close advisor dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (advisorRef.current && !advisorRef.current.contains(e.target as Node)) {
                setAdvisorDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (selectedAdvisor) {
            fetchAdvisorData();
        } else {
            setStats(null);
            setStudents([]);
        }
    }, [selectedAdvisor, currentPage, riskFilter, debouncedSearch]);

    async function fetchAdvisors() {
        try {
            const res = await fetch('/api/advisors');
            const data = await res.json();
            setAdvisors(data.advisors || []);
        } catch (error) {
            console.error('Error fetching advisors:', error);
        } finally {
            setLoadingAdvisors(false);
        }
    }

    async function fetchAdvisorData() {
        setLoadingData(true);
        try {
            // Fetch Stats
            const statsRes = await fetch(`/api/stats?advisor=${encodeURIComponent(selectedAdvisor)}`);
            const statsData = await statsRes.json();
            setStats(statsData);

            // Fetch Students
            const params = new URLSearchParams();
            params.append('advisor', selectedAdvisor);
            params.append('limit', String(PAGE_SIZE));
            params.append('page', String(currentPage));
            if (riskFilter !== 'all') params.append('riskLevel', riskFilter);
            if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

            const studentsRes = await fetch(`/api/students?${params.toString()}`);
            const studentsData = await studentsRes.json();

            setStudents(studentsData.data || []);
            setTotalStudents(studentsData.total || 0);
            setTotalPages(studentsData.totalPages || 1);

        } catch (error) {
            console.error('Error fetching advisor data:', error);
        } finally {
            setLoadingData(false);
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
        if (!selectedAdvisor) return;

        async function doExport() {
            const params = new URLSearchParams();
            params.append('advisor', selectedAdvisor);
            if (riskFilter !== 'all') params.append('riskLevel', riskFilter);
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
            link.download = `advisor_${selectedAdvisor}_${new Date().toISOString().slice(0, 10)}.csv`;
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
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">สำหรับอาจารย์ที่ปรึกษา</h1>
                                <p className="text-sm text-gray-500">Advisor Dashboard</p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm"
                        >
                            <Home className="w-4 h-4" />
                            <span className="hidden sm:inline">หน้าหลัก</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Advisor Selector */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        เลือกชื่ออาจารย์ที่ปรึกษา
                        {advisors.length > 0 && (
                            <span className="ml-2 text-xs text-gray-400 font-normal">({advisors.length} คน)</span>
                        )}
                    </label>
                    <div className="relative max-w-lg" ref={advisorRef}>
                        {/* Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder={loadingAdvisors ? 'กำลังโหลด...' : 'พิมพ์ค้นหาชื่ออาจารย์...'}
                                value={advisorInputValue}
                                onChange={(e) => {
                                    setAdvisorInputValue(e.target.value);
                                    // Clear selection when user edits
                                    if (selectedAdvisor) {
                                        setSelectedAdvisor('');
                                        setCurrentPage(1);
                                    }
                                    setAdvisorDropdownOpen(true);
                                }}
                                onFocus={() => setAdvisorDropdownOpen(true)}
                                disabled={loadingAdvisors}
                                className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                            {loadingAdvisors ? (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : (advisorInputValue || selectedAdvisor) ? (
                                <button
                                    onClick={() => {
                                        setSelectedAdvisor('');
                                        setAdvisorInputValue('');
                                        setAdvisorDropdownOpen(false);
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="ล้างการเลือก"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            ) : null}
                        </div>

                        {/* Selected indicator */}
                        {selectedAdvisor && (
                            <p className="mt-1.5 text-xs text-indigo-600 font-medium">
                                ✓ เลือก: {selectedAdvisor}
                            </p>
                        )}

                        {/* Dropdown list */}
                        {advisorDropdownOpen && !loadingAdvisors && (
                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                {(() => {
                                    const filtered = advisors.filter(adv =>
                                        adv.toLowerCase().includes(advisorInputValue.toLowerCase())
                                    );
                                    if (filtered.length === 0) {
                                        return (
                                            <div className="px-4 py-3 text-sm text-gray-500">
                                                ไม่พบอาจารย์ที่ตรงกับ &quot;{advisorInputValue}&quot;
                                            </div>
                                        );
                                    }
                                    return filtered.map(adv => (
                                        <button
                                            type="button"
                                            key={adv}
                                            onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                                            onClick={() => {
                                                setSelectedAdvisor(adv);
                                                setAdvisorInputValue(adv);
                                                setAdvisorDropdownOpen(false);
                                                setCurrentPage(1);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                                adv === selectedAdvisor
                                                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                                    : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                                            }`}
                                        >
                                            {adv}
                                        </button>
                                    ));
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {selectedAdvisor && (
                    <>
                        {/* Stats Cards */}
                        {stats && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/60 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-red-600 uppercase">วิกฤต</span>
                                        <AlertTriangle className="w-4 h-4 text-red-400" />
                                    </div>
                                    <p className="text-2xl font-bold text-red-700">{stats.students.critical}</p>
                                    <p className="text-xs text-red-600/70 mt-1">ขาดเรียน ≥ 40%</p>
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200/60 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-orange-600 uppercase">เฝ้าระวัง</span>
                                        <TrendingDown className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <p className="text-2xl font-bold text-orange-700">{stats.students.monitor}</p>
                                    <p className="text-xs text-orange-600/70 mt-1">ขาดเรียน 20-39%</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-blue-600 uppercase">ติดตาม</span>
                                        <Monitor className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <p className="text-2xl font-bold text-blue-700">{stats.students.followUp}</p>
                                    <p className="text-xs text-blue-600/70 mt-1">ขาดเรียน 10-19%</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-emerald-600 uppercase">ปกติ</span>
                                        <UserCheck className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-700">{stats.students.normal}</p>
                                    <p className="text-xs text-emerald-600/70 mt-1">ขาดเรียน &lt; 10%</p>
                                </div>
                            </div>
                        )}

                        {/* Student List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Toolbar */}
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="ค้นหารหัสนักศึกษา..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64"
                                        />
                                    </div>
                                    <select
                                        value={riskFilter}
                                        onChange={(e) => setRiskFilter(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="all">ความเสี่ยงทั้งหมด</option>
                                        <option value="critical">วิกฤต (≥40%)</option>
                                        <option value="monitor">เฝ้าระวัง (20-39%)</option>
                                        <option value="follow_up">ติดตาม (10-19%)</option>
                                    </select>
                                </div>
                                <button
                                    onClick={exportExcel}
                                    disabled={totalStudents === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm font-medium"
                                >
                                    <Download className="w-4 h-4" />
                                    Export Excel
                                </button>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                                        <tr>
                                            <th className="px-6 py-3">#</th>
                                            <th className="px-6 py-3">รหัสนักศึกษา</th>
                                            <th className="px-6 py-3">ชื่อ-สกุล</th>
                                            <th className="px-6 py-3">GPA</th>
                                            <th className="px-6 py-3 text-center">% ขาดเรียน</th>
                                            <th className="px-6 py-3 text-center">วิชาเสี่ยง</th>
                                            <th className="px-6 py-3 text-center">สถานะ</th>
                                            <th className="px-6 py-3 text-center">รายละเอียด</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loadingData ? (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                                    กำลังโหลดข้อมูล...
                                                </td>
                                            </tr>
                                        ) : students.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                    ไม่พบนักศึกษา
                                                </td>
                                            </tr>
                                        ) : (
                                            students.map((student, idx) => (
                                                <tr key={student.student_code} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3 text-gray-500">{startRecord + idx}</td>
                                                    <td className="px-6 py-3 font-mono font-medium text-gray-900">{student.student_code}</td>
                                                    <td className="px-6 py-3 text-gray-700">{student.student_name || '-'}</td>
                                                    <td className={`px-6 py-3 font-medium ${student.gpa != null && student.gpa < 2.0 ? 'text-red-600' : 'text-gray-700'}`}>
                                                        {student.gpa != null ? Number(student.gpa).toFixed(2) : '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-center font-bold text-gray-700">
                                                        {Number(student.avg_absence_rate).toFixed(1)}%
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${student.courses_at_risk > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {student.courses_at_risk}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRiskColor(student.risk_level)}`}>
                                                            {getRiskLabelThai(student.risk_level)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <button
                                                            onClick={() => handleClickCourses(student)}
                                                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded transition-colors text-xs font-medium"
                                                        >
                                                            ดูรายวิชา
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <p className="text-sm text-gray-500">
                                    แสดง {totalStudents > 0 ? startRecord : 0}-{endRecord} จาก {totalStudents} คน
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronsLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="mx-2 text-sm text-gray-600">
                                        หน้า {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronsRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {!selectedAdvisor && !loadingAdvisors && (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">กรุณาเลือกอาจารย์ที่ปรึกษา</h3>
                        <p className="text-gray-500 mt-1">
                            เลือกชื่ออาจารย์จากรายการด้านบนเพื่อดูข้อมูลนักศึกษาในความดูแล
                        </p>
                    </div>
                )}
            </main>

            {/* Modal Popup — Matches StudentsPage modal roughly */}
            {modalOpen && modalStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" />
                                    รายวิชาทั้งหมด
                                </h2>
                                <p className="text-indigo-100 text-sm mt-1">
                                    นักศึกษา: <span className="font-mono font-semibold text-white">{modalStudent.student_code}</span>
                                    {modalStudent.student_name && (
                                        <span className="ml-2 text-white">{modalStudent.student_name}</span>
                                    )}
                                </p>
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
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                                    <p className="text-gray-500">กำลังโหลดข้อมูลรายวิชา...</p>
                                </div>
                            ) : modalCourses.length === 0 ? (
                                <div className="text-center py-12">
                                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">ไม่พบข้อมูลรายวิชา</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
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
                                                        </div>
                                                        {course.instructor && (
                                                            <div className="text-sm text-gray-500 ml-6">
                                                                ผู้สอน: <span className="font-medium text-gray-700">{course.instructor}</span>
                                                            </div>
                                                        )}
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
                                                        <div className="flex items-center gap-0.5 flex-wrap">
                                                            {dots.map((status, i) => (
                                                                <StatusDot key={i} status={status} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex items-center justify-end">
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
