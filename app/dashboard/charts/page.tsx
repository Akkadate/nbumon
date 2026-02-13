'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, BarChart3, TrendingUp, GraduationCap } from 'lucide-react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts';

interface ChartData {
    riskDistribution: Array<{ name: string; value: number; color: string }>;
    absenceDistribution: Array<{ range: string; count: number }>;
    topAbsentCourses: Array<{ course: string; courseName?: string; instructor?: string; studyCode: string; highAbsence: number; totalStudents: number; avgAttendance: number }>;
    facultyDistribution?: Array<{ faculty: string; total: number; critical: number; monitor: number; followUp: number; normal: number }>;
    gpaAbsenceScatter?: Array<{ gpa: number; absence: number; risk: string; faculty: string }>;
    yearDistribution?: Array<{ year: string; total: number; critical: number; monitor: number; followUp: number; normal: number }>;
    summary: { totalStudents: number; avgAbsenceRate: number; avgAttendanceRate: number };
}

const RADIAN = Math.PI / 180;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomizedLabel(props: any) {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.03) return null;

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
}

const RISK_COLORS: Record<string, string> = {
    critical: '#dc2626',
    monitor: '#ea580c',
    follow_up: '#2563eb',
    normal: '#16a34a',
};

export default function ChartsPage() {
    const [data, setData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/charts');
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">📊 กราฟวิเคราะห์</h1>
                            <p className="text-sm text-gray-500">Trend Analysis & Data Visualization</p>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors">
                            <Home className="w-5 h-5" />
                            <span>กลับหน้าแดชบอร์ด</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : !data ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <p className="text-gray-600">ไม่สามารถโหลดข้อมูลได้</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-xl shadow-md p-6 text-center">
                                <p className="text-4xl font-bold text-gray-900">{data.summary.totalStudents}</p>
                                <p className="text-sm text-gray-500 mt-1">นักศึกษาทั้งหมด</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6 text-center">
                                <p className="text-4xl font-bold text-green-600">{data.summary.avgAttendanceRate}%</p>
                                <p className="text-sm text-gray-500 mt-1">% มาเรียนเฉลี่ย</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6 text-center">
                                <p className="text-4xl font-bold text-red-600">{data.summary.avgAbsenceRate}%</p>
                                <p className="text-sm text-gray-500 mt-1">% ขาดเรียนเฉลี่ย</p>
                            </div>
                        </div>

                        {/* Row 1: Pie Chart + Histogram */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Pie Chart: Risk Distribution */}
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                    สัดส่วนระดับความเสี่ยง
                                </h2>
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={data.riskDistribution.filter(d => d.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                            outerRadius={130}
                                            dataKey="value"
                                        >
                                            {data.riskDistribution.filter(d => d.value > 0).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: any) => [`${value} คน`, '']} />
                                        <Legend
                                            formatter={(value: string) => {
                                                const item = data.riskDistribution.find(d => d.name === value);
                                                return `${value} (${item?.value || 0} คน)`;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Histogram: Absence Rate Distribution */}
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-purple-600" />
                                    การกระจายตัวของ % ขาดเรียน
                                </h2>
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={data.absenceDistribution}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="range" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                                        <YAxis label={{ value: 'จำนวน (คน)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                        <Tooltip
                                            formatter={(value: any) => [`${value} คน`, 'จำนวน']}
                                            labelFormatter={(label: any) => `ช่วง: ${label}`}
                                        />
                                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                            {data.absenceDistribution.map((entry, index) => {
                                                let color = '#16a34a'; // green for 0-9
                                                if (index >= 4) color = '#dc2626'; // red for 40+
                                                else if (index >= 2) color = '#ea580c'; // orange for 20-39
                                                else if (index >= 1) color = '#2563eb'; // blue for 10-19
                                                return <Cell key={`cell-${index}`} fill={color} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Row 2: Faculty Risk Distribution (NEW) */}
                        {data.facultyDistribution && data.facultyDistribution.length > 0 && (
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                                    การกระจายความเสี่ยงตามคณะ
                                </h2>
                                <ResponsiveContainer width="100%" height={Math.max(300, data.facultyDistribution.length * 45)}>
                                    <BarChart data={data.facultyDistribution} layout="vertical" margin={{ left: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" label={{ value: 'จำนวนนักศึกษา', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }} />
                                        <YAxis type="category" dataKey="faculty" tick={{ fontSize: 10 }} width={160} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="critical" name="วิกฤต" stackId="risk" fill="#dc2626" />
                                        <Bar dataKey="monitor" name="เฝ้าระวัง" stackId="risk" fill="#ea580c" />
                                        <Bar dataKey="followUp" name="ติดตาม" stackId="risk" fill="#2563eb" />
                                        <Bar dataKey="normal" name="ปกติ" stackId="risk" fill="#16a34a" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Row 3: Year Level + GPA Scatter */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Year Level Distribution (NEW) */}
                            {data.yearDistribution && data.yearDistribution.length > 0 && (
                                <div className="bg-white rounded-xl shadow-md p-6">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-teal-600" />
                                        การกระจายความเสี่ยงตามชั้นปี
                                    </h2>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <BarChart data={data.yearDistribution}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                            <YAxis label={{ value: 'จำนวน (คน)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="critical" name="วิกฤต" stackId="risk" fill="#dc2626" />
                                            <Bar dataKey="monitor" name="เฝ้าระวัง" stackId="risk" fill="#ea580c" />
                                            <Bar dataKey="followUp" name="ติดตาม" stackId="risk" fill="#2563eb" />
                                            <Bar dataKey="normal" name="ปกติ" stackId="risk" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* GPA vs Absence Scatter (NEW) */}
                            {data.gpaAbsenceScatter && data.gpaAbsenceScatter.length > 0 && (
                                <div className="bg-white rounded-xl shadow-md p-6">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-amber-600" />
                                        ความสัมพันธ์ GPA กับ % ขาดเรียน
                                    </h2>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <ScatterChart margin={{ bottom: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" dataKey="gpa" name="GPA" domain={[0, 4]} tick={{ fontSize: 11 }}
                                                label={{ value: 'GPA', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }} />
                                            <YAxis type="number" dataKey="absence" name="% ขาดเรียน" tick={{ fontSize: 11 }}
                                                label={{ value: '% ขาดเรียน', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                            <ZAxis range={[30, 30]} />
                                            <Tooltip
                                                formatter={(value: any, name: any) => {
                                                    if (name === 'GPA') return [value, 'GPA'];
                                                    if (name === '% ขาดเรียน') return [`${value}%`, '% ขาดเรียน'];
                                                    return [value, name];
                                                }}
                                            />
                                            <Scatter
                                                data={data.gpaAbsenceScatter}
                                                fill="#6366f1"
                                            >
                                                {data.gpaAbsenceScatter.map((entry, index) => (
                                                    <Cell key={`scatter-${index}`} fill={RISK_COLORS[entry.risk] || '#6366f1'} opacity={0.6} />
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                    <p className="text-xs text-gray-400 text-center mt-2">สีจุด: แดง=วิกฤต, ส้ม=เฝ้าระวัง, น้ำเงิน=ติดตาม, เขียว=ปกติ</p>
                                </div>
                            )}
                        </div>

                        {/* Row 4: Top Absent Courses */}
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-red-600" />
                                Top 10 วิชาที่มีนักศึกษาขาดเรียนมากที่สุด
                            </h2>
                            {data.topAbsentCourses.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={data.topAbsentCourses} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" label={{ value: 'จำนวนนักศึกษา (คน)', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }} />
                                        <YAxis type="category" dataKey="course" tick={{ fontSize: 11 }} width={120} />
                                        <Tooltip
                                            formatter={(value: any, name: any) => {
                                                if (name === 'highAbsence') return [`${value} คน`, 'ขาดมาก'];
                                                if (name === 'totalStudents') return [`${value} คน`, 'ทั้งหมด'];
                                                return [value, name];
                                            }}
                                            labelFormatter={(label: any) => {
                                                const course = data.topAbsentCourses.find(c => c.course === label);
                                                if (course?.courseName) return `${label}\n${course.courseName}`;
                                                return label;
                                            }}
                                        />
                                        <Legend formatter={(value: string) => value === 'highAbsence' ? 'ขาดมาก (≥30%)' : 'ทั้งหมด'} />
                                        <Bar dataKey="totalStudents" fill="#93c5fd" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="highAbsence" fill="#dc2626" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-500 text-center py-8">ไม่มีข้อมูลวิชาที่มีนักศึกษาขาดเรียนมาก</p>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
