'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Download, Filter, Users, GraduationCap, ChevronDown, ChevronRight, BookOpen, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SARABUN_FONT_BASE64 } from '@/lib/sarabun-font';

interface CourseItem {
    course_code: string;
    course_name: string | null;
    section: string;
    study_code: string;
    instructor: string | null;
    absence_rate: number;
    attendance_rate: number;
    absent_count: number;
    total_sessions: number;
    class_check_raw?: string;
}

interface StudentItem {
    student_code: string;
    student_name: string | null;
    faculty: string | null;
    year_level: number | null;
    gpa: number | null;
    risk_level: string;
    avg_absence_rate: number;
    courses_at_risk: number;
    courses: CourseItem[];
}

interface AdvisorGroup {
    advisor: string;
    students: StudentItem[];
    totalStudents: number;
}

interface FacultyGroup {
    faculty: string;
    advisors: AdvisorGroup[];
    totalStudents: number;
}

function getRiskBadge(level: string) {
    switch (level) {
        case 'critical': return { text: 'วิกฤต', bg: 'bg-red-600 text-white' };
        case 'monitor': return { text: 'เฝ้าระวัง', bg: 'bg-orange-500 text-white' };
        case 'follow_up': return { text: 'ติดตาม', bg: 'bg-blue-500 text-white' };
        default: return { text: 'ปกติ', bg: 'bg-green-500 text-white' };
    }
}

function StatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = {
        P: 'bg-emerald-500', A: 'bg-red-500', L: 'bg-amber-500', S: 'bg-blue-500',
    };
    return (
        <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white ${colors[status] || 'bg-gray-300'}`}>
            {status}
        </span>
    );
}

function parseAttendanceDots(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map(s => s.trim().toUpperCase()).filter(e => ['P', 'A', 'L', 'S'].includes(e));
}

export default function FacultyReportPage() {
    const [data, setData] = useState<FacultyGroup[]>([]);
    const [faculties, setFaculties] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [facultyFilter, setFacultyFilter] = useState('all');
    const [expandedFaculties, setExpandedFaculties] = useState<Set<string>>(new Set());
    const [expandedAdvisors, setExpandedAdvisors] = useState<Set<string>>(new Set());
    const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchReport();
    }, [facultyFilter]);

    async function fetchReport() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (facultyFilter !== 'all') params.append('faculty', facultyFilter);
            const res = await fetch(`/api/faculty-report?${params.toString()}`);
            const json = await res.json();
            setData(json.data || []);
            if (json.faculties) setFaculties(json.faculties);
            // Auto-expand all faculties
            setExpandedFaculties(new Set((json.data || []).map((f: FacultyGroup) => f.faculty)));
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    function toggleFaculty(faculty: string) {
        setExpandedFaculties(prev => {
            const next = new Set(prev);
            next.has(faculty) ? next.delete(faculty) : next.add(faculty);
            return next;
        });
    }

    function toggleAdvisor(key: string) {
        setExpandedAdvisors(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function toggleStudent(key: string) {
        setExpandedStudents(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function expandAll() {
        const facs = new Set(data.map(f => f.faculty));
        const advs = new Set<string>();
        const studs = new Set<string>();
        data.forEach(f => {
            f.advisors.forEach(a => {
                advs.add(`${f.faculty}::${a.advisor}`);
                a.students.forEach(s => {
                    studs.add(s.student_code);
                });
            });
        });
        setExpandedFaculties(facs);
        setExpandedAdvisors(advs);
        setExpandedStudents(studs);
    }

    function collapseAll() {
        setExpandedFaculties(new Set(data.map(f => f.faculty)));
        setExpandedAdvisors(new Set());
        setExpandedStudents(new Set());
    }

    // PDF Export
    function generatePDF() {
        const doc = new jsPDF('landscape', 'mm', 'a4');

        // Setup Thai font
        doc.addFileToVFS('Sarabun-Regular.ttf', SARABUN_FONT_BASE64);
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
        doc.setFont('Sarabun');

        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 15;

        // Title
        doc.setFontSize(16);
        doc.text('รายงานนักศึกษาที่ต้องติดตาม แยกตามคณะและอาจารย์ที่ปรึกษา', pageWidth / 2, y, { align: 'center' });
        y += 7;
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += 10;

        data.forEach((faculty) => {
            // Check if need new page
            if (y > doc.internal.pageSize.getHeight() - 30) {
                doc.addPage();
                y = 15;
            }

            // Faculty header
            doc.setFontSize(13);
            doc.setTextColor(30, 64, 175);
            doc.text(`📁 ${faculty.faculty} (${faculty.totalStudents} คน)`, 14, y);
            doc.setTextColor(0, 0, 0);
            y += 8;

            faculty.advisors.forEach((advisor) => {
                if (y > doc.internal.pageSize.getHeight() - 30) {
                    doc.addPage();
                    y = 15;
                }

                // Advisor header
                doc.setFontSize(11);
                doc.setTextColor(100, 100, 100);
                doc.text(`อาจารย์ที่ปรึกษา: ${advisor.advisor} (${advisor.totalStudents} คน)`, 18, y);
                doc.setTextColor(0, 0, 0);
                y += 6;

                // Table for this advisor's students
                const tableData: string[][] = [];

                advisor.students.forEach((student) => {
                    const riskLabel = student.risk_level === 'critical' ? 'วิกฤต' :
                        student.risk_level === 'monitor' ? 'เฝ้าระวัง' : 'ติดตาม';

                    student.courses.forEach((course, ci) => {
                        tableData.push([
                            ci === 0 ? student.student_code : '',
                            ci === 0 ? (student.student_name || '-') : '',
                            ci === 0 ? `ปี ${student.year_level || '-'}` : '',
                            ci === 0 ? riskLabel : '',
                            course.course_code,
                            course.course_name || '-',
                            `${course.section} (${course.study_code === 'C' ? 'ทฤษฎี' : 'ปฏิบัติ'})`,
                            `${course.absent_count}/${course.total_sessions}`,
                            `${course.absence_rate.toFixed(1)}%`,
                        ]);
                    });
                });

                autoTable(doc, {
                    startY: y,
                    head: [['รหัส นศ.', 'ชื่อ-สกุล', 'ชั้นปี', 'สถานะ', 'รหัสวิชา', 'ชื่อวิชา', 'กลุ่ม', 'ขาด/ทั้งหมด', '% ขาด']],
                    body: tableData,
                    styles: { font: 'Sarabun', fontSize: 9, cellPadding: 2 },
                    headStyles: { fillColor: [30, 64, 175], font: 'Sarabun', fontStyle: 'normal' },
                    columnStyles: {
                        0: { cellWidth: 28 },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 15 },
                        3: { cellWidth: 18 },
                        4: { cellWidth: 25 },
                        5: { cellWidth: 55 },
                        6: { cellWidth: 30 },
                        7: { cellWidth: 22 },
                        8: { cellWidth: 18 },
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    didParseCell: (hookData: any) => {
                        if (hookData.section === 'body' && hookData.column.index === 8) {
                            const val = parseFloat(hookData.cell.raw as string);
                            if (val >= 40) {
                                hookData.cell.styles.textColor = [220, 38, 38];
                                hookData.cell.styles.fontStyle = 'bold';
                            } else if (val >= 20) {
                                hookData.cell.styles.textColor = [234, 88, 12];
                            }
                        }
                        // Bold the risk level cell
                        if (hookData.section === 'body' && hookData.column.index === 3) {
                            const text = hookData.cell.raw as string;
                            if (text === 'วิกฤต') hookData.cell.styles.textColor = [220, 38, 38];
                            else if (text === 'เฝ้าระวัง') hookData.cell.styles.textColor = [234, 88, 12];
                            else if (text === 'ติดตาม') hookData.cell.styles.textColor = [59, 130, 246];
                        }
                    },
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                y = (doc as any).lastAutoTable.finalY + 8;
            });

            y += 4;
        });

        doc.save(`faculty_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    // CSV Export
    function exportCSV() {
        const BOM = '\uFEFF';
        const headers = ['คณะ', 'อาจารย์ที่ปรึกษา', 'รหัสนักศึกษา', 'ชื่อ-สกุล', 'ชั้นปี', 'GPA', 'ระดับความเสี่ยง', 'รหัสวิชา', 'ชื่อวิชา', 'กลุ่ม', 'ประเภท', 'ขาด/ทั้งหมด', '% ขาด'];
        const rows: string[][] = [];

        data.forEach(fac => {
            fac.advisors.forEach(adv => {
                adv.students.forEach(student => {
                    const riskLabel = student.risk_level === 'critical' ? 'วิกฤต' :
                        student.risk_level === 'monitor' ? 'เฝ้าระวัง' : 'ติดตาม';
                    student.courses.forEach(course => {
                        rows.push([
                            fac.faculty,
                            adv.advisor,
                            student.student_code,
                            student.student_name || '-',
                            String(student.year_level || '-'),
                            student.gpa != null ? student.gpa.toFixed(2) : '-',
                            riskLabel,
                            course.course_code,
                            course.course_name || '-',
                            course.section,
                            course.study_code === 'C' ? 'ทฤษฎี' : 'ปฏิบัติ',
                            `${course.absent_count}/${course.total_sessions}`,
                            `${course.absence_rate.toFixed(1)}%`,
                        ]);
                    });
                });
            });
        });

        const csvContent = BOM + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `faculty_report_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    const totalStudents = data.reduce((sum, f) => sum + f.totalStudents, 0);
    const totalAdvisors = data.reduce((sum, f) => sum + f.advisors.length, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">📋 รายงานนักศึกษาที่ต้องติดตาม</h1>
                            <p className="text-sm text-gray-500">แยกตามคณะ → อาจารย์ที่ปรึกษา → นักศึกษา → รายวิชา</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={generatePDF} disabled={data.length === 0} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50">
                                <Download className="w-4 h-4" /> PDF
                            </button>
                            <button onClick={exportCSV} disabled={data.length === 0} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50">
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
                {/* Controls */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={facultyFilter}
                            onChange={e => setFacultyFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                        >
                            <option value="all">คณะทั้งหมด</option>
                            {faculties.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 ml-auto">
                        <button onClick={expandAll} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                            กางทั้งหมด
                        </button>
                        <button onClick={collapseAll} className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                            พับทั้งหมด
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                {!loading && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
                            <p className="text-3xl font-bold text-blue-600">{data.length}</p>
                            <p className="text-xs text-gray-500 mt-1">คณะ</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
                            <p className="text-3xl font-bold text-purple-600">{totalAdvisors}</p>
                            <p className="text-xs text-gray-500 mt-1">อาจารย์ที่ปรึกษา</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
                            <p className="text-3xl font-bold text-red-600">{totalStudents}</p>
                            <p className="text-xs text-gray-500 mt-1">นักศึกษาที่ต้องติดตาม</p>
                        </div>
                    </div>
                )}

                {/* Report Content */}
                {loading ? (
                    <div className="text-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                        <p className="text-gray-500">กำลังสร้างรายงาน...</p>
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">ไม่พบนักศึกษาที่ต้องติดตาม</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data.map(faculty => (
                            <div key={faculty.faculty} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                {/* Faculty Header */}
                                <button
                                    onClick={() => toggleFaculty(faculty.faculty)}
                                    className="w-full px-5 py-4 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
                                >
                                    {expandedFaculties.has(faculty.faculty) ?
                                        <ChevronDown className="w-5 h-5 text-blue-500" /> :
                                        <ChevronRight className="w-5 h-5 text-blue-500" />
                                    }
                                    <GraduationCap className="w-5 h-5 text-blue-600" />
                                    <span className="text-base font-bold text-gray-900">{faculty.faculty}</span>
                                    <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                        {faculty.totalStudents} คน • {faculty.advisors.length} อ.ที่ปรึกษา
                                    </span>
                                </button>

                                {/* Advisors */}
                                {expandedFaculties.has(faculty.faculty) && (
                                    <div className="px-2 pb-2">
                                        {faculty.advisors.map(advisor => {
                                            const advisorKey = `${faculty.faculty}::${advisor.advisor}`;
                                            const isAdvisorExpanded = expandedAdvisors.has(advisorKey);

                                            return (
                                                <div key={advisorKey} className="mt-2">
                                                    {/* Advisor Header */}
                                                    <button
                                                        onClick={() => toggleAdvisor(advisorKey)}
                                                        className="w-full px-4 py-3 flex items-center gap-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                                    >
                                                        {isAdvisorExpanded ?
                                                            <ChevronDown className="w-4 h-4 text-gray-400" /> :
                                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                                        }
                                                        <Users className="w-4 h-4 text-purple-500" />
                                                        <span className="text-sm font-semibold text-gray-800">{advisor.advisor}</span>
                                                        <span className="ml-auto text-xs text-gray-500">
                                                            {advisor.totalStudents} คน
                                                        </span>
                                                    </button>

                                                    {/* Students Table */}
                                                    {isAdvisorExpanded && (
                                                        <div className="mt-1 ml-6 mr-2 mb-2">
                                                            {advisor.students.map(student => {
                                                                const risk = getRiskBadge(student.risk_level);
                                                                const isStudentExpanded = expandedStudents.has(student.student_code);

                                                                return (
                                                                    <div key={student.student_code} className="border border-gray-100 rounded-lg mb-1.5 overflow-hidden">
                                                                        {/* Student Row */}
                                                                        <button
                                                                            onClick={() => toggleStudent(student.student_code)}
                                                                            className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                                                                        >
                                                                            {isStudentExpanded ?
                                                                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> :
                                                                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                                            }
                                                                            <span className="font-mono text-sm text-gray-900 font-medium w-32 flex-shrink-0">{student.student_code}</span>
                                                                            <span className="text-sm text-gray-700 flex-1 truncate">{student.student_name || '-'}</span>
                                                                            <span className="text-xs text-gray-400 w-12 flex-shrink-0">ปี {student.year_level || '-'}</span>
                                                                            {student.gpa != null && (
                                                                                <span className={`text-xs font-medium w-14 flex-shrink-0 ${student.gpa < 2.0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                                                    GPA {student.gpa.toFixed(2)}
                                                                                </span>
                                                                            )}
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${risk.bg}`}>
                                                                                {risk.text}
                                                                            </span>
                                                                            <span className="text-xs text-red-500 font-semibold w-16 text-right flex-shrink-0">
                                                                                {student.courses.length} วิชา
                                                                            </span>
                                                                        </button>

                                                                        {/* Courses Detail */}
                                                                        {isStudentExpanded && (
                                                                            <div className="bg-gray-50/70 px-4 py-2 border-t border-gray-100">
                                                                                <table className="w-full text-xs">
                                                                                    <thead>
                                                                                        <tr className="text-gray-500">
                                                                                            <th className="text-left py-1 font-medium">รหัสวิชา</th>
                                                                                            <th className="text-left py-1 font-medium">ชื่อวิชา</th>
                                                                                            <th className="text-left py-1 font-medium">กลุ่ม</th>
                                                                                            <th className="text-left py-1 font-medium">ผู้สอน</th>
                                                                                            <th className="text-center py-1 font-medium">ขาด/ทั้งหมด</th>
                                                                                            <th className="text-right py-1 font-medium">% ขาด</th>
                                                                                            <th className="text-left py-1 pl-3 font-medium">การเช็คชื่อ</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {student.courses.map((course, ci) => {
                                                                                            const dots = parseAttendanceDots(course.class_check_raw);
                                                                                            return (
                                                                                                <tr key={ci} className="border-t border-gray-100">
                                                                                                    <td className="py-1.5 text-gray-900 font-medium">{course.course_code}</td>
                                                                                                    <td className="py-1.5 text-gray-600 max-w-[200px] truncate">{course.course_name || '-'}</td>
                                                                                                    <td className="py-1.5 text-gray-600">
                                                                                                        {course.section}
                                                                                                        <span className="ml-1 text-gray-400">({course.study_code === 'C' ? 'ท' : 'ป'})</span>
                                                                                                    </td>
                                                                                                    <td className="py-1.5 text-gray-500 max-w-[120px] truncate">{course.instructor || '-'}</td>
                                                                                                    <td className="py-1.5 text-center font-medium text-gray-700">{course.absent_count}/{course.total_sessions}</td>
                                                                                                    <td className={`py-1.5 text-right font-bold ${course.absence_rate >= 40 ? 'text-red-600' : course.absence_rate >= 20 ? 'text-orange-600' : 'text-blue-600'}`}>
                                                                                                        {course.absence_rate.toFixed(1)}%
                                                                                                    </td>
                                                                                                    <td className="py-1.5 pl-3">
                                                                                                        <div className="flex gap-0.5 flex-wrap max-w-[200px]">
                                                                                                            {dots.map((s, i) => <StatusDot key={i} status={s} />)}
                                                                                                        </div>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            );
                                                                                        })}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Legend */}
                {!loading && data.length > 0 && (
                    <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-6 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">ระดับความเสี่ยง:</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span> วิกฤต (≥40%)</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> เฝ้าระวัง (20-39%)</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> ติดตาม (10-19%)</span>
                        <span className="mx-2">|</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> มาเรียน</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> ขาด</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> สาย</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> ลา</span>
                    </div>
                )}
            </main>
        </div>
    );
}
