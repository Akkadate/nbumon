'use client';

import Link from 'next/link';
import { Home, BookOpen, Calculator, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function ManualPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">📖 คู่มือระบบ</h1>
                            <p className="text-sm text-gray-500">เกณฑ์การคำนวณและวิธีใช้งาน</p>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors">
                            <Home className="w-5 h-5" />
                            <span>กลับหน้าแดชบอร์ด</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Section 1: สถานะการเข้าเรียน */}
                <section className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        1. สถานะการเข้าเรียน
                    </h2>
                    <p className="text-gray-600 mb-4">
                        ระบบอ่านข้อมูลจากไฟล์ CSV โดยคอลัมน์ CLASSCHECK จะมีรหัสสถานะแต่ละครั้งที่เช็คชื่อ คั่นด้วยเครื่องหมายจุลภาค
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">รหัส</th>
                                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">ความหมาย</th>
                                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">นับเป็น</th>
                                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">ตัวอย่าง</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-200 px-4 py-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono font-bold">P</span></td>
                                    <td className="border border-gray-200 px-4 py-3">Present (มาเรียน)</td>
                                    <td className="border border-gray-200 px-4 py-3 text-green-600 font-medium">✅ มาเรียน</td>
                                    <td className="border border-gray-200 px-4 py-3 text-gray-500">นับเป็นการเข้าเรียน</td>
                                </tr>
                                <tr className="bg-red-50/50">
                                    <td className="border border-gray-200 px-4 py-3"><span className="px-2 py-1 bg-red-100 text-red-700 rounded font-mono font-bold">A</span></td>
                                    <td className="border border-gray-200 px-4 py-3">Absent (ขาดเรียน)</td>
                                    <td className="border border-gray-200 px-4 py-3 text-red-600 font-medium">🔴 ขาดเรียน</td>
                                    <td className="border border-gray-200 px-4 py-3 text-gray-500">นับเป็นการขาดเรียน ใช้คำนวณ %ขาด</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 px-4 py-3"><span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-mono font-bold">L</span></td>
                                    <td className="border border-gray-200 px-4 py-3">Late (มาสาย)</td>
                                    <td className="border border-gray-200 px-4 py-3 text-orange-600 font-medium">🟡 มาสาย</td>
                                    <td className="border border-gray-200 px-4 py-3 text-gray-500">ไม่นับเป็นขาดเรียน</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono font-bold">S</span></td>
                                    <td className="border border-gray-200 px-4 py-3">Sick/Leave (ลา)</td>
                                    <td className="border border-gray-200 px-4 py-3 text-blue-600 font-medium">🟠 ลา</td>
                                    <td className="border border-gray-200 px-4 py-3 text-gray-500">ไม่นับเป็นขาดเรียน</td>
                                </tr>
                                <tr className="bg-gray-50">
                                    <td className="border border-gray-200 px-4 py-3"><span className="px-2 py-1 bg-gray-200 text-gray-600 rounded font-mono font-bold">(ว่าง)</span></td>
                                    <td className="border border-gray-200 px-4 py-3">ไม่มีการเช็คชื่อ</td>
                                    <td className="border border-gray-200 px-4 py-3 text-gray-500 font-medium">❌ ไม่นับ</td>
                                    <td className="border border-gray-200 px-4 py-3 text-gray-500">ถูกตัดออกจากการคำนวณ</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Section 2: สูตรคำนวณ */}
                <section className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Calculator className="w-6 h-6 text-purple-600" />
                        2. สูตรคำนวณ
                    </h2>

                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-800 mb-2">2.1 % การขาดเรียนต่อวิชา (absence_rate)</h3>
                            <div className="bg-white rounded-lg p-4 text-center font-mono text-lg">
                                <span className="text-red-600 font-bold">% ขาดเรียน</span> = (
                                <span className="text-red-500">จำนวนขาด (A)</span> ÷
                                <span className="text-blue-500">ครั้งที่เช็คชื่อทั้งหมด - ครั้งที่ไม่มีการเช็ค</span>
                                ) × 100
                            </div>
                            <p className="text-sm text-blue-700 mt-2">
                                <Info className="w-4 h-4 inline mr-1" />
                                หมายเหตุ: ครั้งที่ไม่มีการเช็คชื่อ (ว่าง) จะไม่ถูกนำมาคำนวณ
                            </p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h3 className="font-semibold text-green-800 mb-2">2.2 % ขาดเรียนเฉลี่ยของนักศึกษา (avg_absence_rate)</h3>
                            <div className="bg-white rounded-lg p-4 text-center font-mono text-lg">
                                <span className="text-red-600 font-bold">% ขาดเรียนเฉลี่ย</span> =
                                ผลรวม <span className="text-red-500">% ขาดทุกวิชา</span> ÷
                                <span className="text-blue-500">จำนวนวิชาทั้งหมด</span>
                            </div>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h3 className="font-semibold text-purple-800 mb-2">2.3 วิชาที่มีความเสี่ยง (courses_at_risk)</h3>
                            <div className="bg-white rounded-lg p-4 text-center font-mono text-lg">
                                นับวิชาที่มี <span className="text-red-600 font-bold">% ขาดเรียน ≥ 20%</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: เกณฑ์จัดระดับความเสี่ยง */}
                <section className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        3. เกณฑ์จัดระดับความเสี่ยง
                    </h2>
                    <p className="text-gray-600 mb-4">
                        ระบบใช้ <strong>% ขาดเรียนเฉลี่ยทุกวิชา</strong> ของนักศึกษาแต่ละคน ในการจัดระดับความเสี่ยง
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-2 border-red-300 rounded-xl p-5 bg-red-50">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🔴</span>
                                <h3 className="text-lg font-bold text-red-700">วิกฤต (Critical)</h3>
                            </div>
                            <p className="text-3xl font-bold text-red-600 mb-1">≥ 40%</p>
                            <p className="text-sm text-red-600">ขาดเรียนเฉลี่ยตั้งแต่ 40% ขึ้นไป</p>
                            <p className="text-xs text-red-500 mt-2">ต้องดำเนินการแก้ไขด่วน</p>
                        </div>
                        <div className="border-2 border-orange-300 rounded-xl p-5 bg-orange-50">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🟠</span>
                                <h3 className="text-lg font-bold text-orange-700">เฝ้าระวัง (Monitor)</h3>
                            </div>
                            <p className="text-3xl font-bold text-orange-600 mb-1">20% - 39%</p>
                            <p className="text-sm text-orange-600">ขาดเรียนเฉลี่ย 20% ถึง 39%</p>
                            <p className="text-xs text-orange-500 mt-2">ต้องเฝ้าระวังและติดตามอย่างใกล้ชิด</p>
                        </div>
                        <div className="border-2 border-blue-300 rounded-xl p-5 bg-blue-50">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🔵</span>
                                <h3 className="text-lg font-bold text-blue-700">ติดตาม (Follow-up)</h3>
                            </div>
                            <p className="text-3xl font-bold text-blue-600 mb-1">10% - 19%</p>
                            <p className="text-sm text-blue-600">ขาดเรียนเฉลี่ย 10% ถึง 19%</p>
                            <p className="text-xs text-blue-500 mt-2">ติดตามเพื่อป้องกันปัญหาเพิ่มเติม</p>
                        </div>
                        <div className="border-2 border-green-300 rounded-xl p-5 bg-green-50">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🟢</span>
                                <h3 className="text-lg font-bold text-green-700">ปกติ (Normal)</h3>
                            </div>
                            <p className="text-3xl font-bold text-green-600 mb-1">&lt; 10%</p>
                            <p className="text-sm text-green-600">ขาดเรียนเฉลี่ยต่ำกว่า 10%</p>
                            <p className="text-xs text-green-500 mt-2">ไม่จำเป็นต้องดำเนินการเพิ่มเติม</p>
                        </div>
                    </div>
                </section>

                {/* Section 4: ตัวอย่างการคำนวณ */}
                <section className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        4. ตัวอย่างการคำนวณ
                    </h2>
                    <div className="bg-gray-50 rounded-lg p-5 space-y-4">
                        <h3 className="font-semibold text-gray-800">สมมุตินักศึกษา A ลงเรียน 3 วิชา:</h3>

                        <div className="space-y-3">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <p className="font-medium text-gray-700 mb-2">วิชา 1: CLASSCHECK = <code className="bg-gray-100 px-2 py-0.5 rounded">P,P,A,P,A</code></p>
                                <p className="text-sm text-gray-600">→ มา 3, ขาด 2, ทั้งหมด 5 ครั้ง → <span className="text-red-600 font-bold">% ขาด = 2/5 × 100 = 40%</span></p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <p className="font-medium text-gray-700 mb-2">วิชา 2: CLASSCHECK = <code className="bg-gray-100 px-2 py-0.5 rounded">P,P,P,A,P</code></p>
                                <p className="text-sm text-gray-600">→ มา 4, ขาด 1, ทั้งหมด 5 ครั้ง → <span className="text-orange-600 font-bold">% ขาด = 1/5 × 100 = 20%</span></p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <p className="font-medium text-gray-700 mb-2">วิชา 3: CLASSCHECK = <code className="bg-gray-100 px-2 py-0.5 rounded">P,P,P,P,P</code></p>
                                <p className="text-sm text-gray-600">→ มา 5, ขาด 0, ทั้งหมด 5 ครั้ง → <span className="text-green-600 font-bold">% ขาด = 0/5 × 100 = 0%</span></p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                            <p className="font-semibold text-yellow-800">ผลลัพธ์:</p>
                            <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                                <li>• <strong>% ขาดเรียนเฉลี่ย</strong> = (40 + 20 + 0) ÷ 3 = <strong className="text-red-600">20%</strong></li>
                                <li>• <strong>ระดับความเสี่ยง</strong> = 🟠 <strong>เฝ้าระวัง</strong> (เพราะ ≥ 20% แต่ &lt; 40%)</li>
                                <li>• <strong>วิชาที่มีความเสี่ยง</strong> = <strong>2 วิชา</strong> (วิชา 1 และ 2 ที่มี % ขาด ≥ 20%)</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Section 5: การใช้งานระบบ */}
                <section className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Info className="w-6 h-6 text-indigo-600" />
                        5. วิธีใช้งานระบบทั่วไป
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">1</span>
                            <div>
                                <p className="font-medium text-gray-800">แดชบอร์ด</p>
                                <p className="text-sm text-gray-600">ดูสรุปจำนวนนักศึกษาแต่ละระดับความเสี่ยง และสถิติรายวิชา</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">2</span>
                            <div>
                                <p className="font-medium text-gray-800">รายชื่อนักศึกษา</p>
                                <p className="text-sm text-gray-600">กรองตามระดับความเสี่ยง คลิกที่คอลัมน์ "วิชาที่มีความเสี่ยง" เพื่อดูรายละเอียดวิชาที่มีปัญหา</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">3</span>
                            <div>
                                <p className="font-medium text-gray-800">รายวิชา</p>
                                <p className="text-sm text-gray-600">ตรวจสอบวิชาที่ไม่มีการเช็คชื่อ หรือวิชาที่มีนักศึกษาขาดเรียนจำนวนมาก</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 6: รายงานพิเศษ */}
                <section className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Info className="w-6 h-6 text-purple-600" />
                        6. รายงานและการใช้งานพิเศษ
                    </h2>
                    <div className="space-y-6">
                        {/* Advisor Dashboard */}
                        <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                            <h3 className="font-bold text-purple-800 flex items-center gap-2 mb-2">
                                <span className="text-xl">👥</span> สำหรับอาจารย์ที่ปรึกษา (Advisor Dashboard)
                            </h3>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                                <li>เข้าใช้งานที่เมนู <strong>"สำหรับอาจารย์ที่ปรึกษา"</strong> เพื่อดูข้อมูลเฉพาะกลุ่มนักศึกษาของตนเอง</li>
                                <li>เลือกรายชื่ออาจารย์จากตัวเลือกด้านบน</li>
                                <li>ระบบจะแสดงจำนวนนักศึกษาในกลุ่มเสี่ยง (วิกฤต/เฝ้าระวัง) เฉพาะของอาจารย์ท่านนั้น</li>
                                <li>สามารถ <strong>Export Excel</strong> รายชื่อนักศึกษาในความดูแลได้</li>
                            </ul>
                        </div>

                        {/* Faculty Report */}
                        <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30">
                            <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                                <span className="text-xl">📋</span> รายงานคณะ (Faculty Report)
                            </h3>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                                <li>เข้าใช้งานที่เมนู <strong>"รายงานคณะ"</strong></li>
                                <li>แสดงรายชื่อนักศึกษาที่ต้องติดตาม โดยจัดกลุ่มตาม: <strong>คณะ → อาจารย์ที่ปรึกษา → นักศึกษา → รายวิชา</strong></li>
                                <li>เหมาะสำหรับหัวหน้าสาขาหรือคณบดีเพื่อดูภาพรวม</li>
                                <li>สามารถดาวน์โหลดเป็น <strong>PDF</strong> หรือ <strong>CSV</strong> ได้</li>
                            </ul>
                        </div>

                        {/* Attendance Report */}
                        <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/30">
                            <h3 className="font-bold text-emerald-800 flex items-center gap-2 mb-2">
                                <span className="text-xl">📊</span> รายงานเข้าเรียน (Attendance Report)
                            </h3>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                                <li>เข้าใช้งานที่เมนู <strong>"รายงานการเข้าเรียน"</strong></li>
                                <li>ดูแนวโน้ม % การเข้าเรียนของแต่ละวิชา ว่าเพิ่มขึ้นหรือลดลง</li>
                                <li>สามารถ <strong>ตั้งค่าการคำนวณ</strong> ได้ว่าให้นับการ "มาสาย (L)" หรือ "ลา (S)" เป็นการเข้าเรียนด้วยหรือไม่</li>
                                <li>แสดงกราฟแนวโน้มรายสัปดาห์เมื่อคลิกที่รายวิชา</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
