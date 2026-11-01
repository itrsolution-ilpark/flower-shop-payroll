"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Banner from "@/components/Banner";
import StatusBadge from "@/components/StatusBadge";
import { getActiveShopsAction, ActiveShopOption } from "@/actions/authActions";
import { LogIn, UserPlus, ShieldAlert, Store, Clock, Users, ChevronRight, Sparkles } from "lucide-react";

export default function MainPage() {
  const [shops, setShops] = useState<ActiveShopOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveShopsAction()
      .then((data) => setShops(data))
      .catch(() => setShops([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-amber-50/30">
      {/* 최상단 고정 헤더 배너 (펠트 아트 테마 적용) */}
      <Banner />

      <main className="flex-1 max-w-md md:max-w-xl mx-auto w-full px-4 py-6 md:py-8 space-y-6 pb-16">
        {/* 히어로 카드 (Hand-crafted 펠트 아트 그래픽 테마 적용) */}
        <section className="bg-gradient-to-b from-emerald-700 via-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md border-2 border-emerald-600/30 relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/20 backdrop-blur-sm rounded-full text-xs font-semibold text-amber-200 border border-amber-200/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            플라워샵 근태 & 급여 관리
          </div>

          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-amber-50 leading-snug">
              따뜻하고 정교한 플라워샵 근무 관리
            </h2>
            <p className="text-xs md:text-sm text-emerald-100 leading-relaxed">
              대표와 직원이 함께 이용하는 출퇴근 기록 및 정산 솔루션입니다.
              시급(분/시간 정산) 및 월급 맞춤 정산을 안전하게 관리하세요.
            </p>
          </div>

          {/* 주요 액션 버튼: '로그인' 및 '가입 신청' */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/login"
              className="min-h-[48px] h-12 rounded-xl bg-white text-emerald-900 hover:bg-amber-50 font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm border border-emerald-200"
            >
              <LogIn className="w-4 h-4 text-emerald-700" />
              로그인
            </Link>
            <Link
              href="/signup"
              className="min-h-[48px] h-12 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-slate-900" />
              가입 신청
            </Link>
          </div>
        </section>

        {/* 운영 중인 플라워샵 목록 */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">운영 중인 플라워샵</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              총 <span className="font-bold text-emerald-600">{shops.length}</span>개 매장
            </span>
          </div>

          {loading ? (
            <div className="text-center py-6 text-xs text-slate-400">목록을 불러오는 중...</div>
          ) : shops.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              현재 활성화된 플라워샵이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-emerald-50/60 hover:border-emerald-200 transition group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-800 transition">
                        {shop.name}
                      </span>
                      <StatusBadge status="active" />
                    </div>
                    <span className="text-xs text-slate-500 block">관리자 {shop.adminCount}명</span>
                  </div>
                  <Link
                    href={`/login?shop_id=${shop.id}`}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition"
                    title="로그인"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3단계 권한 안내 카드 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">플라워샵 관리자</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              직원 가입 승인 및 퇴사 처리, 시급/월급 급여 조건 설정, 출퇴근 시간 보완, 월별 급여 CSV 다운로드를 관리합니다.
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">플라워샵 직원</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              소속 플라워샵 가입 신청, 일별 출근/퇴근 기록 등록 및 수정, 월별 급여 산정 결과를 실시간 확인합니다.
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">시스템 관리자</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              전체 프로그램 총괄 관리, 플라워샵 개설 및 활성/비활성 제어, 다중 시스템 관리자 등록을 수행합니다.
            </p>
          </div>
        </section>

        {/* 하단: 눈에 띄는 시스템 관리자 전용 링크 ('시스템 관리자 접속') */}
        <section className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-bold text-slate-100">프로그램 총괄 관리가 필요하신가요?</h4>
            <p className="text-xs text-slate-400">
              시스템 관리자는 플라워샵 개설 및 운영 상태를 전체적으로 관리할 수 있습니다.
            </p>
          </div>
          <Link
            href="/system/login"
            className="mt-8 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <ShieldAlert className="w-4 h-4 text-slate-700" />
            시스템 관리자 접속
          </Link>
        </section>
      </main>
    </div>
  );
}
