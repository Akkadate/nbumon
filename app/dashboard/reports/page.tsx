'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Download, FileText, AlertTriangle, Eye, Users, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentAnalytics } from '@/lib/types';
import { SARABUN_FONT_BASE64 } from '@/lib/sarabun-font';

function getRiskLabel(level: string): string {
    const labels: Record<string, string> = {
        critical: 'วิกฤต',
        monitor: 'เฝ้าระวัง',
        follow_up: 'ติดตาม',
        normal: 'ปกติ'
    };
    return labels[level] || level;
}

export default function ReportsPage() {
    const [students, setStudents] = useState<StudentAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [stats, setStats] = useState<{
        students: { total: number; critical: number; monitor: number; followUp: number; normal: number };
    } | null>(null);

    useEffect(() => {
        fetchStudents();
        fetchStats();
    }, []);

    async function fetchStudents() {
        try {
            const res = await fetch('/api/students?limit=500');
            const data = await res.json();
            setStudents(data.data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchStats() {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function setupThaiFont(doc: jsPDF): void {
        doc.addFileToVFS('Sarabun-Regular.ttf', SARABUN_FONT_BASE64);
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'bold');
        doc.setFont('Sarabun');
    }

    async function generatePDF(filterLevel: string = 'all') {
        setGenerating(true);

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            // Setup Thai font
            setupThaiFont(doc);

            // Title
            doc.setFontSize(18);
            doc.setTextColor(30, 58, 138);
            doc.text('รายงานสรุประบบดูแลการเรียนของนักศึกษา', pageWidth / 2, 20, { align: 'center' });

            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text(`วันที่ออกรายงาน: ${dateStr}`, pageWidth / 2, 28, { align: 'center' });

            let yPos = 35;

            if (filterLevel !== 'all') {
                doc.setFontSize(12);
                doc.setTextColor(220, 50, 50);
                doc.text(`กรอง: เฉพาะระดับ ${getRiskLabel(filterLevel)}`, pageWidth / 2, yPos, { align: 'center' });
                yPos += 8;
            }

            // Summary Statistics
            if (stats) {
                doc.setFontSize(14);
                doc.setTextColor(30, 58, 138);
                doc.text('สรุปภาพรวม', 14, yPos + 5);

                autoTable(doc, {
                    startY: yPos + 8,
                    head: [['ประเภท', 'จำนวน (คน)']],
                    body: [
                        ['นักศึกษาทั้งหมด', String(stats.students.total)],
                        ['วิกฤต (ขาด ≥ 40%)', String(stats.students.critical)],
                        ['เฝ้าระวัง (ขาด 20-39%)', String(stats.students.monitor)],
                        ['ติดตาม (ขาด 10-19%)', String(stats.students.followUp)],
                        ['ปกติ (ขาด < 10%)', String(stats.students.normal)],
                    ],
                    theme: 'grid',
                    headStyles: { fillColor: [30, 58, 138], fontSize: 10, font: 'Sarabun' },
                    bodyStyles: { fontSize: 9, font: 'Sarabun' },
                    columnStyles: {
                        0: { cellWidth: 80 },
                        1: { cellWidth: 40, halign: 'center' as const }
                    },
                    margin: { left: 14, right: 14 }
                });
            }

            // Student List
            const filteredStudents = filterLevel === 'all'
                ? students.filter(s => s.risk_level !== 'normal')
                : students.filter(s => s.risk_level === filterLevel);

            if (filteredStudents.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const startY = ((doc as any).lastAutoTable?.finalY || 90) + 15;

                doc.setFontSize(14);
                doc.setTextColor(30, 58, 138);
                const title = filterLevel === 'all'
                    ? 'รายชื่อนักศึกษาที่มีความเสี่ยง'
                    : `รายชื่อนักศึกษาระดับ${getRiskLabel(filterLevel)}`;
                doc.text(title, 14, startY);

                const tableData = filteredStudents.map((s, idx) => [
                    String(idx + 1),
                    s.student_code,
                    String(s.total_courses),
                    `${s.avg_attendance_rate.toFixed(1)}%`,
                    `${s.avg_absence_rate.toFixed(1)}%`,
                    getRiskLabel(s.risk_level),
                    String(s.courses_at_risk)
                ]);

                autoTable(doc, {
                    startY: startY + 4,
                    head: [['#', 'รหัสนักศึกษา', 'วิชา', '% มาเรียน', '% ขาด', 'ระดับ', 'วิชาเสี่ยง']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [220, 38, 38], fontSize: 8, font: 'Sarabun' },
                    bodyStyles: { fontSize: 8, font: 'Sarabun' },
                    columnStyles: {
                        0: { cellWidth: 10, halign: 'center' as const },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 15, halign: 'center' as const },
                        3: { cellWidth: 25, halign: 'center' as const },
                        4: { cellWidth: 25, halign: 'center' as const },
                        5: { cellWidth: 30, halign: 'center' as const },
                        6: { cellWidth: 25, halign: 'center' as const }
                    },
                    margin: { left: 14, right: 14 },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    didParseCell: (data: any) => {
                        if (data.section === 'body' && data.column.index === 5) {
                            const risk = data.cell.raw;
                            if (risk === 'วิกฤต') {
                                data.cell.styles.textColor = [220, 38, 38];
                                data.cell.styles.fontStyle = 'bold';
                            } else if (risk === 'เฝ้าระวัง') {
                                data.cell.styles.textColor = [234, 88, 12];
                                data.cell.styles.fontStyle = 'bold';
                            } else if (risk === 'ติดตาม') {
                                data.cell.styles.textColor = [37, 99, 235];
                            }
                        }
                    }
                });
            }

            // Footer
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFont('Sarabun');
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`หน้า ${i} จาก ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
                doc.text('ระบบดูแลการเรียนของนักศึกษา', 14, doc.internal.pageSize.getHeight() - 10);
            }

            const fileName = filterLevel === 'all'
                ? `รายงาน-สรุป-${dateStr}.pdf`
                : `รายงาน-${filterLevel}-${dateStr}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('เกิดข้อผิดพลาดในการสร้างรายงาน กรุณาลองอีกครั้ง');
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">📄 รายงาน PDF</h1>
                            <p className="text-sm text-gray-500">สร้างรายงานสรุปเพื่อดาวน์โหลด</p>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors">
                            <Home className="w-5 h-5" />
                            <span>กลับหน้าแดชบอร์ด</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Stats Summary */}
                        {stats && (
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    สรุปข้อมูลปัจจุบัน
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-gray-900">{stats.students.total}</p>
                                        <p className="text-xs text-gray-500">ทั้งหมด</p>
                                    </div>
                                    <div className="bg-red-50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-red-600">{stats.students.critical}</p>
                                        <p className="text-xs text-red-500">วิกฤต</p>
                                    </div>
                                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-orange-600">{stats.students.monitor}</p>
                                        <p className="text-xs text-orange-500">เฝ้าระวัง</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-blue-600">{stats.students.followUp}</p>
                                        <p className="text-xs text-blue-500">ติดตาม</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-green-600">{stats.students.normal}</p>
                                        <p className="text-xs text-green-500">ปกติ</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Report Options */}
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-600" />
                                เลือกรายงาน
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={() => generatePDF('all')}
                                    disabled={generating}
                                    className="flex items-center gap-4 p-5 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left group disabled:opacity-50"
                                >
                                    <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                                        <Download className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">รายงานนักศึกษาที่มีความเสี่ยง</p>
                                        <p className="text-sm text-gray-500">รวมทุกระดับ (วิกฤต + เฝ้าระวัง + ติดตาม)</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => generatePDF('critical')}
                                    disabled={generating}
                                    className="flex items-center gap-4 p-5 border-2 border-gray-200 rounded-xl hover:border-red-400 hover:bg-red-50/30 transition-all text-left group disabled:opacity-50"
                                >
                                    <div className="bg-red-100 p-3 rounded-xl group-hover:bg-red-200 transition-colors">
                                        <AlertTriangle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">รายงานนักศึกษาวิกฤต</p>
                                        <p className="text-sm text-gray-500">เฉพาะระดับวิกฤต (ขาด ≥ 40%)</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => generatePDF('monitor')}
                                    disabled={generating}
                                    className="flex items-center gap-4 p-5 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50/30 transition-all text-left group disabled:opacity-50"
                                >
                                    <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition-colors">
                                        <Eye className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">รายงานนักศึกษาเฝ้าระวัง</p>
                                        <p className="text-sm text-gray-500">เฉพาะระดับเฝ้าระวัง (ขาด 20-39%)</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => generatePDF('follow_up')}
                                    disabled={generating}
                                    className="flex items-center gap-4 p-5 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left group disabled:opacity-50"
                                >
                                    <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                                        <Filter className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">รายงานนักศึกษาติดตาม</p>
                                        <p className="text-sm text-gray-500">เฉพาะระดับติดตาม (ขาด 10-19%)</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {generating && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                <p className="text-blue-700 font-medium">กำลังสร้างรายงาน PDF...</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
