'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, BookOpen, AlertTriangle, Home, TrendingDown } from 'lucide-react';
import { getRiskLabelThai, getRiskColor } from '@/lib/analytics';

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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    ระบบดูแลการเรียนของนักศึกษา
                                </h1>
                                <p className="text-sm text-gray-500">Student Monitoring Dashboard</p>
                            </div>
                        </div>
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                        >
                            <Home className="w-5 h-5" />
                            <span>หน้าแรก</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Students */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-3xl font-bold text-gray-900">
                                {stats.students.total}
                            </span>
                        </div>
                        <h3 className="text-gray-600 font-medium">นักศึกษาทั้งหมด</h3>
                    </div>

                    {/* Critical Students */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-red-100 p-3 rounded-lg">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <span className="text-3xl font-bold text-red-600">
                                {stats.students.critical}
                            </span>
                        </div>
                        <h3 className="text-gray-600 font-medium">นักศึกษาวิฤต</h3>
                        <p className="text-xs text-gray-500 mt-1">ขาดเรียน ≥ 40%</p>
                    </div>

                    {/* Monitor Students */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-orange-100 p-3 rounded-lg">
                                <TrendingDown className="w-6 h-6 text-orange-600" />
                            </div>
                            <span className="text-3xl font-bold text-orange-600">
                                {stats.students.monitor}
                            </span>
                        </div>
                        <h3 className="text-gray-600 font-medium">นักศึกษาเฝ้าระวัง</h3>
                        <p className="text-xs text-gray-500 mt-1">ขาดเรียน 20-39%</p>
                    </div>

                    {/* Follow-up Students */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-3xl font-bold text-blue-600">
                                {stats.students.followUp}
                            </span>
                        </div>
                        <h3 className="text-gray-600 font-medium">นักศึกษาติดตาม</h3>
                        <p className="text-xs text-gray-500 mt-1">ขาดเรียน 10-19%</p>
                    </div>
                </div>

                {/* Course Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-600 font-medium">รายวิชาทั้งหมด</h3>
                            <BookOpen className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.courses.total}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-600 font-medium">วิชาที่ไม่มีการเช็คชื่อ</h3>
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        </div>
                        <p className="text-3xl font-bold text-yellow-600">
                            {stats.courses.withoutChecks}
                        </p>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-600 font-medium">วิชาที่มีนักศึกษาขาดมาก</h3>
                            <TrendingDown className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-3xl font-bold text-red-600">
                            {stats.courses.highAbsence}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link
                        href="/dashboard/students"
                        className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border border-gray-200 hover:border-blue-300"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-blue-100 p-4 rounded-lg">
                                <Users className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    รายชื่อนักศึกษา
                                </h3>
                                <p className="text-gray-600">ดูรายละเอียดนักศึกษาแต่ละคน</p>
                            </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                            <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full">
                                {stats.students.critical} วิฤต
                            </span>
                            <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full">
                                {stats.students.monitor} เฝ้าระวัง
                            </span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
                                {stats.students.followUp} ติดตาม
                            </span>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/courses"
                        className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border border-gray-200 hover:border-purple-300"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-purple-100 p-4 rounded-lg">
                                <BookOpen className="w-8 h-8 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    รายวิชา
                                </h3>
                                <p className="text-gray-600">ดูข้อมูลการเข้าเรียนแต่ละวิชา</p>
                            </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                            <span className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full">
                                {stats.courses.withoutChecks} ไม่มีการเช็ค
                            </span>
                            <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full">
                                {stats.courses.highAbsence} ขาดมาก
                            </span>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
