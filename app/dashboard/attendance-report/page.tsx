'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Home, Download, Filter, TrendingUp, TrendingDown, Minus, Settings2, BarChart3, GraduationCap, Users, ChevronDown, ChevronRight, X } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SARABUN_FONT_BASE64 } from '@/lib/sarabun-font';

interface SessionRate {
    session: number;
    rate: number;
    total: number;
}

interface CourseDetail {
    course_code: string;
    course_name: string | null;
    section: string;
    study_code: string;
    instructor: string | null;
    faculty: string;
    totalStudents: number;
    overallRate: number;
    latestRate: number;
    trend: 'up' | 'down' | 'stable';
    sessionRates: SessionRate[];
}

interface FacultyOverview {
    faculty: string;
    courseCount: number;
    avgRate: number;
    trendsUp: number;
    trendsDown: number;
    trendsStable: number;
}

interface ReportData {
    faculties: string[];
    overview: FacultyOverview[];
    courseDetails: CourseDetail[];
}

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'stable' }) {
    if (trend === 'up') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            <TrendingUp className="w-3 h-3" /> เพิ่มขึ้น
        </span>
    );
    if (trend === 'down') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <TrendingDown className="w-3 h-3" /> ลดลง
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            <Minus className="w-3 h-3" /> คงที่
        </span>
    );
}

function RateBar({ rate }: { rate: number }) {
    let color = 'bg-emerald-500';
    if (rate < 60) color = 'bg-red-500';
    else if (rate < 70) color = 'bg-orange-500';
    else if (rate < 80) color = 'bg-amber-500';

    return (
        <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(rate, 100)}%` }} />
            </div>
            <span className={`text-sm font-bold ${rate < 60 ? 'text-red-600' : rate < 70 ? 'text-orange-600' : rate < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {rate}%
            </span>
        </div>
    );
}

export default function AttendanceReportPage() {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [facultyFilter, setFacultyFilter] = useState('all');
    const [countP, setCountP] = useState(true);
    const [countL, setCountL] = useState(true);
    const [countS, setCountS] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null);
    const [expandedFaculties, setExpandedFaculties] = useState<Set<string>>(new Set());
    const [settingsOpen, setSettingsOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (facultyFilter !== 'all') params.append('faculty', facultyFilter);
            params.append('countP', String(countP));
            params.append('countL', String(countL));
            params.append('countS', String(countS));

            const res = await fetch(`/api/attendance-report?${params.toString()}`);
            const json = await res.json();
            setData(json);
            // Auto-expand all faculties initially
            setExpandedFaculties(new Set((json.overview || []).map((f: FacultyOverview) => f.faculty)));
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [facultyFilter, countP, countL, countS]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function toggleFaculty(faculty: string) {
        setExpandedFaculties(prev => {
            const next = new Set(prev);
            next.has(faculty) ? next.delete(faculty) : next.add(faculty);
            return next;
        });
    }

    // Compute chart summary for selected course
    function getChartSummary(course: CourseDetail) {
        const rates = course.sessionRates;
        if (rates.length < 3) return null;
        const third = Math.ceil(rates.length / 3);
        const earlyAvg = Math.round(rates.slice(0, third).reduce((s, r) => s + r.rate, 0) / third * 10) / 10;
        const lateAvg = Math.round(rates.slice(-third).reduce((s, r) => s + r.rate, 0) / third * 10) / 10;
        return { earlyAvg, lateAvg, earlyRange: `1-${third}`, lateRange: `${rates.length - third + 1}-${rates.length}` };
    }

    // PDF Export
    function generatePDF() {
        if (!data) return;
        const doc = new jsPDF('landscape', 'mm', 'a4');
        doc.addFileToVFS('Sarabun-Regular.ttf', SARABUN_FONT_BASE64);
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
        doc.setFont('Sarabun');

        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 15;

        // Title
        doc.setFontSize(16);
        doc.text('รายงานภาพรวม % เข้าเรียน', pageWidth / 2, y, { align: 'center' });
        y += 7;

        // Settings info
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        const countLabels = [];
        if (countP) countLabels.push('มาเรียน(P)');
        if (countL) countLabels.push('มาสาย(L)');
        if (countS) countLabels.push('ลา(S)');
        doc.text(`นับเป็นเข้าเรียน: ${countLabels.join(' + ')} | วันที่: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += 8;

        // Overview Table
        doc.setFontSize(12);
        doc.text('ตารางภาพรวมแยกตามคณะ', 14, y);
        y += 5;

        autoTable(doc, {
            startY: y,
            head: [['คณะ', 'จำนวนวิชา', '% เข้าเรียนเฉลี่ย', 'แนวโน้มเพิ่ม', 'แนวโน้มลด', 'คงที่']],
            body: data.overview.map(o => [
                o.faculty,
                String(o.courseCount),
                `${o.avgRate}%`,
                String(o.trendsUp),
                String(o.trendsDown),
                String(o.trendsStable),
            ]),
            styles: { font: 'Sarabun', fontSize: 9, cellPadding: 2.5 },
            headStyles: { fillColor: [30, 64, 175], font: 'Sarabun', fontStyle: 'normal' },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 10;

        // Course Details
        doc.setFontSize(12);
        if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 15; }
        doc.text('รายละเอียดรายวิชา', 14, y);
        y += 5;

        autoTable(doc, {
            startY: y,
            head: [['คณะ', 'รหัสวิชา', 'ชื่อวิชา', 'กลุ่ม', 'ผู้สอน', 'นศ.', '% เฉลี่ย', '% ล่าสุด', 'แนวโน้ม']],
            body: data.courseDetails.map(c => [
                c.faculty,
                c.course_code,
                c.course_name || '-',
                `${c.section} (${c.study_code === 'C' ? 'ท' : 'ป'})`,
                c.instructor || '-',
                String(c.totalStudents),
                `${c.overallRate}%`,
                `${c.latestRate}%`,
                c.trend === 'up' ? 'เพิ่มขึ้น' : c.trend === 'down' ? 'ลดลง' : 'คงที่',
            ]),
            styles: { font: 'Sarabun', fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [30, 64, 175], font: 'Sarabun', fontStyle: 'normal' },
            columnStyles: {
                0: { cellWidth: 40 },
                2: { cellWidth: 50 },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            didParseCell: (hookData: any) => {
                if (hookData.section === 'body' && hookData.column.index === 8) {
                    const text = hookData.cell.raw as string;
                    if (text === 'ลดลง') hookData.cell.styles.textColor = [220, 38, 38];
                    else if (text === 'เพิ่มขึ้น') hookData.cell.styles.textColor = [22, 163, 74];
                }
            },
        });

        doc.save(`attendance_overview_${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    // CSV Export
    function exportCSV() {
        if (!data) return;
        const BOM = '\uFEFF';
        const countLabels = [];
        if (countP) countLabels.push('P');
        if (countL) countLabels.push('L');
        if (countS) countLabels.push('S');

        const headers = ['คณะ', 'รหัสวิชา', 'ชื่อวิชา', 'กลุ่ม', 'ประเภท', 'ผู้สอน', 'จำนวน นศ.', `% เข้าเรียนเฉลี่ย (${countLabels.join('+')})`, '% ครั้งล่าสุด', 'แนวโน้ม'];
        const rows = data.courseDetails.map(c => [
            c.faculty,
            c.course_code,
            c.course_name || '-',
            c.section,
            c.study_code === 'C' ? 'ทฤษฎี' : 'ปฏิบัติ',
            c.instructor || '-',
            String(c.totalStudents),
            `${c.overallRate}%`,
            `${c.latestRate}%`,
            c.trend === 'up' ? 'เพิ่มขึ้น' : c.trend === 'down' ? 'ลดลง' : 'คงที่',
        ]);

        const csvContent = BOM + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance_overview_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/60 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">📊 รายงานภาพรวม % เข้าเรียน</h1>
                            <p className="text-sm text-gray-500">Attendance Overview Report</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={generatePDF} disabled={!data || data.courseDetails.length === 0}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50">
                                <Download className="w-4 h-4" /> PDF
                            </button>
                            <button onClick={exportCSV} disabled={!data || data.courseDetails.length === 0}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50">
                                <Download className="w-4 h-4" /> CSV
                            </button>
                            <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-blue-600 transition-colors text-sm">
                                <Home className="w-4 h-4" /> กลับ
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Controls Row */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Faculty Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select
                                value={facultyFilter}
                                onChange={e => setFacultyFilter(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                            >
                                <option value="all">คณะทั้งหมด</option>
                                {data?.faculties.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>

                        {/* Settings Toggle */}
                        <button
                            onClick={() => setSettingsOpen(!settingsOpen)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${settingsOpen ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Settings2 className="w-4 h-4" />
                            ตั้งค่าการคำนวณ
                        </button>
                    </div>

                    {/* Settings Panel */}
                    {settingsOpen && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-blue-600" />
                                    นับเป็น &quot;เข้าเรียน&quot;:
                                </h3>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" checked={countP} onChange={e => setCountP(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="inline-flex items-center gap-1.5 text-sm">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                                            มาเรียน (P)
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" checked={countL} onChange={e => setCountL(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="inline-flex items-center gap-1.5 text-sm">
                                            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                                            มาสาย (L)
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" checked={countS} onChange={e => setCountS(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="inline-flex items-center gap-1.5 text-sm">
                                            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                                            ลา (S)
                                        </span>
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                    สูตร: % = ({[countP && 'P', countL && 'L', countS && 'S'].filter(Boolean).join(' + ') || '-'}) / total × 100
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : !data || data.courseDetails.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">ไม่มีข้อมูลรายงาน</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
                                <p className="text-3xl font-bold text-blue-600">{data.overview.length}</p>
                                <p className="text-xs text-gray-500 mt-1">คณะ</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
                                <p className="text-3xl font-bold text-purple-600">{data.courseDetails.length}</p>
                                <p className="text-xs text-gray-500 mt-1">รายวิชา</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
                                <p className="text-3xl font-bold text-emerald-600">
                                    {data.overview.length > 0 ? Math.round(data.overview.reduce((s, o) => s + o.avgRate, 0) / data.overview.length * 10) / 10 : 0}%
                                </p>
                                <p className="text-xs text-gray-500 mt-1">% เข้าเรียนเฉลี่ย</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
                                <p className="text-3xl font-bold text-red-600">
                                    {data.courseDetails.filter(c => c.trend === 'down').length}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">วิชาแนวโน้มลดลง</p>
                            </div>
                        </div>

                        {/* Overview Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-blue-600" />
                                ภาพรวม % เข้าเรียน แยกตามคณะ
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200">
                                            <th className="text-left py-3 px-4 font-semibold text-gray-600">คณะ</th>
                                            <th className="text-center py-3 px-4 font-semibold text-gray-600">จำนวนวิชา</th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-600">% เข้าเรียนเฉลี่ย</th>
                                            <th className="text-center py-3 px-4 font-semibold text-gray-600">
                                                <span className="text-emerald-600">↑ เพิ่ม</span>
                                            </th>
                                            <th className="text-center py-3 px-4 font-semibold text-gray-600">
                                                <span className="text-red-600">↓ ลด</span>
                                            </th>
                                            <th className="text-center py-3 px-4 font-semibold text-gray-600">
                                                <span className="text-gray-500">→ คงที่</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.overview.map((faculty) => (
                                            <tr key={faculty.faculty} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    const el = document.getElementById(`faculty-${faculty.faculty}`);
                                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    setExpandedFaculties(prev => new Set(prev).add(faculty.faculty));
                                                }}>
                                                <td className="py-3 px-4 font-medium text-gray-900">{faculty.faculty}</td>
                                                <td className="py-3 px-4 text-center text-gray-700">{faculty.courseCount}</td>
                                                <td className="py-3 px-4"><RateBar rate={faculty.avgRate} /></td>
                                                <td className="py-3 px-4 text-center">
                                                    {faculty.trendsUp > 0 && <span className="text-emerald-600 font-semibold">{faculty.trendsUp}</span>}
                                                    {faculty.trendsUp === 0 && <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {faculty.trendsDown > 0 && <span className="text-red-600 font-semibold">{faculty.trendsDown}</span>}
                                                    {faculty.trendsDown === 0 && <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {faculty.trendsStable > 0 && <span className="text-gray-600 font-semibold">{faculty.trendsStable}</span>}
                                                    {faculty.trendsStable === 0 && <span className="text-gray-300">-</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Course Detail: Line Chart Modal */}
                        {selectedCourse && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setSelectedCourse(null)}>
                                <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                📈 {selectedCourse.course_code} {selectedCourse.course_name || ''}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                กลุ่ม {selectedCourse.section} ({selectedCourse.study_code === 'C' ? 'ทฤษฎี' : 'ปฏิบัติ'})
                                                {selectedCourse.instructor && ` — ${selectedCourse.instructor}`}
                                                {` (นศ. ${selectedCourse.totalStudents} คน)`}
                                            </p>
                                        </div>
                                        <button onClick={() => setSelectedCourse(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                            <X className="w-5 h-5 text-gray-400" />
                                        </button>
                                    </div>

                                    {selectedCourse.sessionRates.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height={320}>
                                                <LineChart data={selectedCourse.sessionRates} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis
                                                        dataKey="session"
                                                        tick={{ fontSize: 12 }}
                                                        label={{ value: 'ครั้งที่', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#6b7280' } }}
                                                    />
                                                    <YAxis
                                                        domain={[0, 100]}
                                                        tick={{ fontSize: 12 }}
                                                        label={{ value: '% เข้าเรียน', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
                                                    />
                                                    <Tooltip
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        formatter={(value: any) => [`${value}%`, '% เข้าเรียน']}
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        labelFormatter={(label: any) => `ครั้งที่ ${label}`}
                                                    />
                                                    <ReferenceLine y={80} stroke="#16a34a" strokeDasharray="5 5" label={{ value: '80%', position: 'right', style: { fontSize: 10, fill: '#16a34a' } }} />
                                                    <ReferenceLine y={60} stroke="#dc2626" strokeDasharray="5 5" label={{ value: '60%', position: 'right', style: { fontSize: 10, fill: '#dc2626' } }} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="rate"
                                                        stroke="#3b82f6"
                                                        strokeWidth={2.5}
                                                        dot={{ fill: '#3b82f6', r: 4 }}
                                                        activeDot={{ r: 6, fill: '#1d4ed8' }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>

                                            {/* Chart Summary */}
                                            <div className="mt-4 bg-gray-50 rounded-xl p-4">
                                                <div className="flex flex-wrap items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-600">แนวโน้ม:</span>
                                                        <TrendBadge trend={selectedCourse.trend} />
                                                    </div>
                                                    {(() => {
                                                        const summary = getChartSummary(selectedCourse);
                                                        if (!summary) return null;
                                                        return (
                                                            <p className="text-sm text-gray-600">
                                                                ครั้งที่ {summary.earlyRange}: เฉลี่ย <span className="font-bold">{summary.earlyAvg}%</span>
                                                                {' → '}
                                                                ครั้งที่ {summary.lateRange}: เฉลี่ย <span className="font-bold">{summary.lateAvg}%</span>
                                                            </p>
                                                        );
                                                    })()}
                                                    <div className="ml-auto text-sm text-gray-500">
                                                        ล่าสุด: <span className={`font-bold ${selectedCourse.latestRate < 60 ? 'text-red-600' : selectedCourse.latestRate < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                            {selectedCourse.latestRate}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-gray-500 text-center py-8">ไม่มีข้อมูล session</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Course Lists by Faculty */}
                        <div className="space-y-4">
                            {data.overview.map(faculty => {
                                const courses = data.courseDetails.filter(c => c.faculty === faculty.faculty);
                                const isExpanded = expandedFaculties.has(faculty.faculty);

                                return (
                                    <div key={faculty.faculty} id={`faculty-${faculty.faculty}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <button
                                            onClick={() => toggleFaculty(faculty.faculty)}
                                            className="w-full px-5 py-4 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
                                        >
                                            {isExpanded ?
                                                <ChevronDown className="w-5 h-5 text-blue-500" /> :
                                                <ChevronRight className="w-5 h-5 text-blue-500" />
                                            }
                                            <GraduationCap className="w-5 h-5 text-blue-600" />
                                            <span className="text-base font-bold text-gray-900">{faculty.faculty}</span>
                                            <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                                {courses.length} วิชา • เฉลี่ย {faculty.avgRate}%
                                            </span>
                                        </button>

                                        {isExpanded && (
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                {courses.map((course, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedCourse(course)}
                                                        className="text-left bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-xl p-4 transition-all group"
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-gray-900 truncate">
                                                                    {course.course_code} {course.course_name || ''}
                                                                </p>
                                                                <p className="text-xs text-gray-500 truncate">
                                                                    กลุ่ม {course.section} ({course.study_code === 'C' ? 'ท' : 'ป'})
                                                                    {course.instructor && ` • ${course.instructor}`}
                                                                </p>
                                                            </div>
                                                            <TrendBadge trend={course.trend} />
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                                <Users className="w-3.5 h-3.5" />
                                                                {course.totalStudents} คน
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`text-lg font-bold ${course.latestRate < 60 ? 'text-red-600' : course.latestRate < 70 ? 'text-orange-600' : course.latestRate < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                                    {course.latestRate}%
                                                                </p>
                                                                <p className="text-[10px] text-gray-400">ครั้งล่าสุด</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                                                            <div
                                                                className={`h-1.5 rounded-full transition-all ${course.latestRate < 60 ? 'bg-red-500' : course.latestRate < 70 ? 'bg-orange-500' : course.latestRate < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                style={{ width: `${Math.min(course.latestRate, 100)}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-[10px] text-blue-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            📈 คลิกดูกราฟ trend รายครั้ง
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-6 text-xs text-gray-500">
                            <span className="font-medium text-gray-700">สถานะ:</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> P = มาเรียน</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> L = มาสาย</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> S = ลา</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> A = ขาด</span>
                            <span className="mx-2">|</span>
                            <span>% เข้าเรียน = ({[countP && 'P', countL && 'L', countS && 'S'].filter(Boolean).join('+')} ) / total × 100</span>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
