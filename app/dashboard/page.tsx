'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, BookOpen, AlertTriangle, Home, TrendingDown, BarChart3, FileText, Info, GraduationCap, Activity, ChevronRight, Shield, AlertOctagon } from 'lucide-react';

interface Stats {
    students: {
        total: number;
        critical: number;
        monitor: number;
        followUp: number;
        normal: number;
    };
    courses: {
        total: number;
        withoutChecks: number;
        highAbsence: number;
    };
    records: {
        total: number;
    };
    faculties?: {
        total: number;
        list: string[];
    };
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading || !stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    const riskPercent = stats.students.total > 0
        ? ((stats.students.critical + stats.students.monitor) / stats.students.total * 100).toFixed(1)
        : '0';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/60 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
                                <Activity className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    ระบบดูแลการเรียนของนักศึกษา
                                </h1>
                                <p className="text-xs text-gray-500">Student Monitoring Dashboard</p>
                            </div>
                        </div>
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm"
                        >
                            <Home className="w-4 h-4" />
                            <span className="hidden sm:inline">หน้าแรก</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Hero Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-blue-50 p-2 rounded-xl">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">นักศึกษา</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.students.total}</p>
                        <p className="text-xs text-gray-400 mt-1">คนทั้งหมดในระบบ</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-purple-50 p-2 rounded-xl">
                                <BookOpen className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">รายวิชา</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.courses.total}</p>
                        <p className="text-xs text-gray-400 mt-1">วิชาทั้งหมด</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-indigo-50 p-2 rounded-xl">
                                <GraduationCap className="w-5 h-5 text-indigo-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">คณะ</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.faculties?.total || 0}</p>
                        <p className="text-xs text-gray-400 mt-1">คณะที่มีข้อมูล</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-amber-50 p-2 rounded-xl">
                                <Activity className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">ข้อมูล</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.records.total.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">รายการทั้งหมด</p>
                    </div>
                </div>

                {/* Risk Alert Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Shield className="w-5 h-5 text-red-500" />
                        <h2 className="text-base font-bold text-gray-900">สถานะความเสี่ยงนักศึกษา</h2>
                        <span className="ml-auto text-xs text-gray-400">นักศึกษาที่ต้องดูแล {riskPercent}%</span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link href="/dashboard/students?risk=critical" className="group">
                            <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/60 rounded-xl p-4 hover:shadow-md hover:border-red-300 transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">วิกฤต</span>
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                </div>
                                <p className="text-2xl font-bold text-red-700">{stats.students.critical}</p>
                                <p className="text-xs text-red-500/80 mt-1">ขาดเรียน ≥ 40%</p>
                                <div className="mt-3 w-full bg-red-200/50 rounded-full h-1.5">
                                    <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{
                                        width: `${stats.students.total > 0 ? (stats.students.critical / stats.students.total * 100) : 0}%`
                                    }} />
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/students?risk=monitor" className="group">
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200/60 rounded-xl p-4 hover:shadow-md hover:border-orange-300 transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">เฝ้าระวัง</span>
                                    <TrendingDown className="w-4 h-4 text-orange-400" />
                                </div>
                                <p className="text-2xl font-bold text-orange-700">{stats.students.monitor}</p>
                                <p className="text-xs text-orange-500/80 mt-1">ขาดเรียน 20-39%</p>
                                <div className="mt-3 w-full bg-orange-200/50 rounded-full h-1.5">
                                    <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{
                                        width: `${stats.students.total > 0 ? (stats.students.monitor / stats.students.total * 100) : 0}%`
                                    }} />
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/students?risk=follow_up" className="group">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">ติดตาม</span>
                                    <Users className="w-4 h-4 text-blue-400" />
                                </div>
                                <p className="text-2xl font-bold text-blue-700">{stats.students.followUp}</p>
                                <p className="text-xs text-blue-500/80 mt-1">ขาดเรียน 10-19%</p>
                                <div className="mt-3 w-full bg-blue-200/50 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{
                                        width: `${stats.students.total > 0 ? (stats.students.followUp / stats.students.total * 100) : 0}%`
                                    }} />
                                </div>
                            </div>
                        </Link>

                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">ปกติ</span>
                                <Shield className="w-4 h-4 text-emerald-400" />
                            </div>
                            <p className="text-2xl font-bold text-emerald-700">{stats.students.normal}</p>
                            <p className="text-xs text-emerald-500/80 mt-1">ขาดเรียน &lt; 10%</p>
                            <div className="mt-3 w-full bg-emerald-200/50 rounded-full h-1.5">
                                <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{
                                    width: `${stats.students.total > 0 ? (stats.students.normal / stats.students.total * 100) : 0}%`
                                }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Course Alerts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                        <div className="bg-yellow-50 p-3 rounded-xl flex-shrink-0">
                            <AlertTriangle className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">วิชาที่ไม่มีการเช็คชื่อ</p>
                            <p className="text-xs text-gray-500">ยังไม่มีข้อมูลการเข้าเรียน</p>
                        </div>
                        <span className="text-2xl font-bold text-yellow-600">{stats.courses.withoutChecks}</span>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                        <div className="bg-red-50 p-3 rounded-xl flex-shrink-0">
                            <TrendingDown className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">วิชาที่มีนักศึกษาขาดมาก</p>
                            <p className="text-xs text-gray-500">มีนักศึกษาขาดเกินเกณฑ์</p>
                        </div>
                        <span className="text-2xl font-bold text-red-600">{stats.courses.highAbsence}</span>
                    </div>
                </div>

                {/* Quick Navigation */}
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                    เมนูลัด
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link href="/dashboard/students" className="group">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-gray-900">รายชื่อนักศึกษา</h3>
                                <p className="text-xs text-gray-500">ดูรายละเอียดนักศึกษาแต่ละคน</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                    </Link>

                    <Link href="/dashboard/consecutive-absence" className="group">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-orange-200 transition-all flex items-center gap-4">
                            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                                <AlertOctagon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-gray-900">ขาดเรียนติดต่อกัน</h3>
                                <p className="text-xs text-gray-500">ขาดล่าสุด 3 ครั้งติดกันขึ้นไป</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors" />
                        </div>
                    </Link>

                    <Link href="/dashboard/courses" className="group">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-purple-200 transition-all flex items-center gap-4">
                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-gray-900">รายวิชา</h3>
                                <p className="text-xs text-gray-500">ข้อมูลการเข้าเรียนแต่ละวิชา</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
                        </div>
                    </Link>

                    <Link href="/dashboard/charts" className="group">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-emerald-200 transition-all flex items-center gap-4">
                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-gray-900">กราฟวิเคราะห์</h3>
                                <p className="text-xs text-gray-500">Trend Analysis & Visualization</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                    </Link>

                    <Link href="/dashboard/reports" className="group">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-rose-200 transition-all flex items-center gap-4">
                            <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-gray-900">รายงาน PDF</h3>
                                <p className="text-xs text-gray-500">ดาวน์โหลดสรุปผล</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-rose-500 transition-colors" />
                        </div>
                    </Link>

                    <Link href="/dashboard/manual" className="group">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-indigo-200 transition-all flex items-center gap-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                                <Info className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-gray-900">คู่มือระบบ</h3>
                                <p className="text-xs text-gray-500">เกณฑ์การคำนวณและวิธีใช้งาน</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
