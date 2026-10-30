"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Banner from "@/components/Banner";
import StatusBadge from "@/components/StatusBadge";
import { getActiveShopsAction, ActiveShopOption } from "@/actions/authActions";
import { Flower2, LogIn, UserPlus, ShieldAlert, Store, Clock, Users, ChevronRight } from "lucide-react";

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
    <div className="flex flex-col min-h-screen">
      {/* 최상단 고정 헤더 배너 */}
      <Banner />

      <main className="flex-1 max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-8">
        {/* 중앙: 플라워샵 홍보 배너 및 시스템 소개 문구 */}
        <section className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 rounded-2xl p-6 md:p-10 text-white shadow-lg space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-200">
            <Flower2 className="w-4 h-4 text-emerald-300" />
            플라워샵 통합 근태 및 급여 정산 솔루션 v42
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              아름다운 꽃과 함께하는 스마트한 매장 근무 관리
            </h2>
            <p className="text-sm md:text-base text-slate-200 max-w-2xl leading-relaxed">
              대표와 직원이 함께 만족하는 투명한 출퇴근 기록 및 시급·월급 정산 시스템입니다. 
              분/시간 단위 맞춤 급여 계산과 안전한 Neon PostgreSQL 아키텍처로 업무 효율을 극대화하세요.
            </p>
          </div>

          {/* 주요 동작 버튼 ('로그인 바로가기', '직원/관리자 등록 신청') */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/login"
              className="min-h-[46px] px-6 rounded-xl bg-white text-emerald-900 hover:bg-slate-100 font-semibold text-sm transition flex items-center gap-2 shadow-sm"
            >
              <LogIn className="w-4 h-4 text-emerald-700" />
              로그인 바로가기
            </Link>
            <Link
              href="/signup"
              className="min-h-[46px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-white" />
              직원/관리자 등록 신청
            </Link>
          </div>
        </section>

        {/* 활성 플라워샵 목록 */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">운영 중인 플라워샵 목록</h3>
            </div>
            <span className="text-xs text-slate-500">
              총 <span className="font-semibold text-emerald-600">{shops.length}</span>개 매장 등록됨
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">플라워샵 목록을 불러오는 중...</div>
          ) : shops.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              현재 활성화된 플라워샵이 없습니다. 시스템 관리자가 먼저 플라워샵을 개설해야 합니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-emerald-50/50 hover:border-emerald-200 transition group"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition">
                      {shop.name}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>관리자 {shop.adminCount}명</span>
                      <StatusBadge status="active" />
                    </div>
                  </div>
                  <Link
                    href={`/login?shop_id=${shop.id}`}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-300 transition"
                    title="해당 매장으로 로그인"
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
              시스템 관리자(6자리)는 플라워샵 개설 및 운영 상태를 전체적으로 관리할 수 있습니다.
            </p>
          </div>
          <Link
            href="/system/login"
            className="min-h-[46px] px-5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0"
          >
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            시스템 관리자 접속
          </Link>
        </section>
      </main>
    </div>
  );
}
