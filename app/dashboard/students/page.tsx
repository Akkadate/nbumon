'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Search, Filter, Download } from 'lucide-react';
import { getRiskLabelThai, getRiskColor } from '@/lib/analytics';
import { StudentAnalytics } from '@/lib/types';

export default function StudentsPage() {
    const [students, setStudents] = useState<StudentAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [riskFilter, setRiskFilter] = useState<string>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchStudents();
    }, [riskFilter]);

    async function fetchStudents() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (riskFilter !== 'all') {
                params.append('riskLevel', riskFilter);
            }
            params.append('limit', '200');

            const res = await fetch(`/api/students?${params.toString()}`);
            const data = await res.json();
            setStudents(data.data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredStudents = students.filter(student =>
        student.student_code.toLowerCase().includes(search.toLowerCase())
    );

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
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="ค้นหารหัสนักศึกษา..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Risk Filter */}
                        <div className="flex gap-2">
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
                                วิฤต
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            รหัสนักศึกษา
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            จำนวนวิชา
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            % มาเรียน
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            % ขาดเรียน
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ระดับความเสี่ยง
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            วิชาที่มีความเสี่ยง
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {student.student_code}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{student.total_courses}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
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
                                            <td className="px-6 py-4 whitespace-nowrap">
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskColor(student.risk_level)}`}>
                                                    {getRiskLabelThai(student.risk_level)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {student.courses_at_risk > 0 ? (
                                                    <span className="text-red-600 font-medium">
                                                        {student.courses_at_risk} วิชา
                                                    </span>
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
        </div>
    );
}
