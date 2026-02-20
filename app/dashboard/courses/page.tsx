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
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 20;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1); // Reset to page 1 on search
            fetchCourses(1, search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, filter]);

    // Handle page change
    function handlePageChange(newPage: number) {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            fetchCourses(newPage, search);
        }
    }

    async function fetchCourses(pageNum: number, searchQuery: string) {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter === 'no-checks') {
                params.append('hasNoChecks', 'true');
            } else if (filter === 'high-absence') {
                params.append('minAbsenceRate', '5');
            }
            if (searchQuery) {
                params.append('q', searchQuery);
            }

            const offset = (pageNum - 1) * ITEMS_PER_PAGE;
            params.append('limit', String(ITEMS_PER_PAGE));
            params.append('offset', String(offset));

            const res = await fetch(`/api/courses?${params.toString()}`);
            const data = await res.json();
            setCourses(data.data || []);
            setTotalItems(data.total || 0);
            setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">รายวิชา</h1>
                            <p className="text-sm text-gray-500">ทั้งหมด {totalItems} วิชา</p>
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
                                    placeholder="ค้นหารหัสวิชา ชื่อวิชา อาจารย์..."
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
                ) : courses.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <p className="text-gray-600">ไม่พบข้อมูลรายวิชา</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                รายวิชา
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                อาจารย์ผู้สอน
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                กลุ่ม
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                ประเภท
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                นศ.
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                ขาดมาก
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                % มาเรียน
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                สถานะ
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {courses.map((course) => (
                                            <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {course.course_code}
                                                    </div>
                                                    {course.course_name && (
                                                        <div className="text-xs text-gray-600 max-w-[200px] truncate" title={course.course_name}>
                                                            {course.course_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm text-gray-700 max-w-[150px] truncate" title={course.instructor || ''}>
                                                        {course.instructor || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <div className="text-sm text-gray-900">{course.section}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                                                        {getStudyTypeLabel(course.study_code as 'C' | 'L')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <span className="text-sm text-gray-900">{course.total_students}</span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    {course.students_high_absence > 0 ? (
                                                        <span className="text-sm font-medium text-red-600">
                                                            {course.students_high_absence} คน
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-green-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 w-16 h-2 bg-gray-200 rounded-full mr-2">
                                                            <div
                                                                className="h-2 bg-green-500 rounded-full"
                                                                style={{ width: `${course.avg_attendance_rate}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-gray-900">
                                                            {Number(course.avg_attendance_rate).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    {course.has_no_checks ? (
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                            ไม่มีการเช็ค
                                                        </span>
                                                    ) : course.students_high_absence >= 5 ? (
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                            ต้องติดตาม
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
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

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-xl shadow-md">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    ก่อนหน้า
                                </button>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages}
                                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    ถัดไป
                                </button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        แสดง <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span> ถึง <span className="font-medium">{Math.min(page * ITEMS_PER_PAGE, totalItems)}</span> จาก <span className="font-medium">{totalItems}</span> รายการ
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                            onClick={() => handlePageChange(page - 1)}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        {/* Page Numbers */}
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let p = page;
                                            if (totalPages <= 5) p = i + 1;
                                            else if (page <= 3) p = i + 1;
                                            else if (page >= totalPages - 2) p = totalPages - 4 + i;
                                            else p = page - 2 + i;

                                            return (
                                                <button
                                                    key={p}
                                                    onClick={() => handlePageChange(p)}
                                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${p === page
                                                        ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => handlePageChange(page + 1)}
                                            disabled={page === totalPages}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Next</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
