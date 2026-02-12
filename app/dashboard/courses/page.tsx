'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Search, BookOpen, AlertTriangle } from 'lucide-react';
import { CourseAnalytics } from '@/lib/types';
import { getStudyTypeLabel, formatCourseName } from '@/lib/analytics';

export default function CoursesPage() {
    const [courses, setCourses] = useState<CourseAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchCourses();
    }, [filter]);

    async function fetchCourses() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter === 'no-checks') {
                params.append('hasNoChecks', 'true');
            } else if (filter === 'high-absence') {
                params.append('minAbsenceRate', '5');
            }
            params.append('limit', '200');

            const res = await fetch(`/api/courses?${params.toString()}`);
            const data = await res.json();
            setCourses(data.data || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredCourses = courses.filter(course =>
        course.course_code.toLowerCase().includes(search.toLowerCase()) ||
        course.section.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">รายวิชา</h1>
                            <p className="text-sm text-gray-500">จำนวน {filteredCourses.length} วิชา</p>
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
                                    placeholder="ค้นหารหัสวิชา หรือ กลุ่มเรียน..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                ทั้งหมด
                            </button>
                            <button
                                onClick={() => setFilter('no-checks')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'no-checks'
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                    }`}
                            >
                                ไม่มีการเช็คชื่อ
                            </button>
                            <button
                                onClick={() => setFilter('high-absence')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'high-absence'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                                    }`}
                            >
                                ขาดเรียนมาก
                            </button>
                        </div>
                    </div>
                </div>

                {/* Courses Table */}
                {loading ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <p className="text-gray-600">ไม่พบข้อมูลรายวิชา</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            รหัสวิชา
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            กลุ่มเรียน
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ประเภท
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            นักศึกษา
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ขาดมาก
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            % มาเรียนเฉลี่ย
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            สถานะ
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredCourses.map((course) => (
                                        <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {course.course_code}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Rev. {course.revision_code}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{course.section}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                                                    {getStudyTypeLabel(course.study_code as 'C' | 'L')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <BookOpen className="w-4 h-4 text-gray-400 mr-2" />
                                                    <span className="text-sm text-gray-900">{course.total_students}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {course.students_high_absence > 0 ? (
                                                    <div className="flex items-center">
                                                        <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                                                        <span className="text-sm font-medium text-red-600">
                                                            {course.students_high_absence} คน
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-green-600">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 w-16 h-2 bg-gray-200 rounded-full mr-2">
                                                        <div
                                                            className="h-2 bg-green-500 rounded-full"
                                                            style={{ width: `${course.avg_attendance_rate}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-gray-900">
                                                        {course.avg_attendance_rate.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {course.has_no_checks ? (
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                        ไม่มีการเช็ค
                                                    </span>
                                                ) : course.students_high_absence >= 5 ? (
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                        ต้องติดตาม
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        ปกติ
                                                    </span>
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
