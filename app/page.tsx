import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 p-6 rounded-2xl shadow-lg">
            <BarChart3 className="w-16 h-16 text-white" />
          </div>
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          ระบบดูแลการเรียนของนักศึกษา
        </h1>

        <p className="text-xl text-gray-600 mb-8">
          ติดตามและวิเคราะห์การเข้าเรียนของนักศึกษา เพื่อให้การดูแลที่ดีที่สุด
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <div className="text-3xl font-bold text-blue-600 mb-2">3</div>
            <div className="text-gray-600">ระดับความเสี่ยง</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <div className="text-3xl font-bold text-purple-600 mb-2">Real-time</div>
            <div className="text-gray-600">การอัปเดตข้อมูล</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <div className="text-3xl font-bold text-green-600 mb-2">Smart</div>
            <div className="text-gray-600">การวิเคราะห์ข้อมูล</div>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all hover:shadow-xl hover:scale-105"
        >
          เข้าสู่หน้าแดชบอร์ด →
        </Link>

        <p className="mt-8 text-sm text-gray-500">
          วิเคราะห์ข้อมูลการเช็คชื่อเข้าเรียน แยกตามระดับความเสี่ยง
        </p>
      </div>
    </div>
  );
}
