"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";
import PinModal from "@/components/PinModal";
import { Store, ShieldCheck } from "lucide-react";

interface ShopItem {
  id: string;
  name: string;
  staffCount: number;
}

export default function MainPage() {
  const router = useRouter();
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  useEffect(() => {
    checkSystemAdminAndShops();
  }, []);

  const checkSystemAdminAndShops = async () => {
    try {
      const { data: adminData, error: adminError } = await supabase
        .from("system_admins")
        .select("id");

      if (adminError) {
        console.error("시스템 관리자 확인 오류:", adminError);
      }

      if (!adminData || adminData.length === 0) {
        router.push("/system-setup");
        return;
      }

      const { data: shopsData, error: shopsError } = await supabase
        .from("shops")
        .select("id, name")
        .order("name", { ascending: true });

      if (shopsError) {
        console.error("플라워샵 목록 조회 오류:", shopsError);
      }

      const { data: staffData } = await supabase
        .from("staff")
        .select("shop_id, status, is_admin")
        .eq("status", "active")
        .eq("is_admin", false);

      const countMap: Record<string, number> = {};
      (staffData || []).forEach((st) => {
        countMap[st.shop_id] = (countMap[st.shop_id] || 0) + 1;
      });

      const list: ShopItem[] = (shopsData || []).map((s) => ({
        id: s.id,
        name: s.name,
        staffCount: countMap[s.id] || 0,
      }));

      setShops(list);
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAuthSubmit = async ({
    name,
    pin,
  }: {
    name?: string;
    pin: string;
  }) => {
    const { data, error } = await supabase
      .from("system_admins")
      .select("id, name, pin_code")
      .eq("name", name || "")
      .eq("pin_code", pin)
      .maybeSingle();

    if (error || !data) {
      throw new Error("시스템 관리자 이름 또는 PIN 번호가 일치하지 않습니다.");
    }

    sessionStorage.setItem("system_admin_auth", JSON.stringify({ name: data.name }));
    setIsPinModalOpen(false);
    router.push("/shop/register");
  };

  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 pt-6 px-4 pb-8 space-y-5">
      {/* 1. 상단 헤더: "플라워샵 근무 관리" 로고 및 시스템 관리자 플라워샵 등록/수정 버튼 */}
      <header className="bg-white p-5 rounded-xl border border-borderLine shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-textColor leading-tight">
              플라워샵 근무 관리
            </h1>
            <p className="text-xs text-subText">세련된 멀티 테넌트 근태 및 급여 집계</p>
          </div>
        </div>
        <button
          onClick={() => setIsPinModalOpen(true)}
          className="w-full sm:w-auto px-3.5 min-h-[46px] h-[46px] border border-borderLine rounded-xl text-xs font-semibold text-[#1E293B] hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
        >
          <ShieldCheck className="w-4 h-4 text-[#059669]" />
          시스템 관리자 플라워샵 등록/수정
        </button>
      </header>

      {/* 2. 검색 영역: 상단 배치 실시간 검색 인풋 */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="플라워샵 이름을 검색하세요..."
          className="w-full min-h-[46px] h-[46px] px-3.5 border border-borderLine rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white text-sm"
        />
      </div>

      {/* 3. 매장 목록 그리드: 매장명, 재직 직원 수, 플라워샵 메인 바로가기 버튼 */}
      <div className="flex-1 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-xs text-subText">로딩 중...</div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-borderLine p-6">
            <p className="text-xs text-subText">
              {searchQuery
                ? "검색된 플라워샵이 없습니다."
                : "등록된 플라워샵이 없습니다. 상단 버튼으로 등록해주세요."}
            </p>
          </div>
        ) : (
          filteredShops.map((shop) => (
            <div
              key={shop.id}
              className="p-4 bg-white border border-borderLine rounded-xl shadow-sm hover:shadow-md transition flex items-center justify-between gap-3"
            >
              <div>
                <h3 className="font-bold text-sm text-textColor">{shop.name}</h3>
                <p className="text-xs text-subText mt-0.5">
                  재직 직원 수: <span className="font-semibold text-[#059669]">{shop.staffCount}명</span>
                </p>
              </div>
              <Link
                href={`/shop/${shop.id}`}
                className="min-h-[46px] h-[46px] px-4 bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition flex items-center justify-center active:scale-95"
              >
                플라워샵 메인 바로가기
              </Link>
            </div>
          ))
        )}
      </div>

      <PinModal
        isOpen={isPinModalOpen}
        title="시스템 관리자 인증"
        description="플라워샵 등록 및 관리를 위해 마스터 계정 정보를 입력하세요."
        requireName={true}
        onClose={() => setIsPinModalOpen(false)}
        onSubmit={handleAdminAuthSubmit}
      />
    </div>
  );
}
