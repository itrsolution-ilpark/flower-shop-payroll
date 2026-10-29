"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";
import { Store, UserCheck, ShieldAlert, ArrowLeft } from "lucide-react";

interface ShopMainPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface Shop {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  name: string;
  is_admin: boolean;
  status: string;
  pin_code: string;
  hourly_wage: number;
}

export default function ShopMainPage({ params }: ShopMainPageProps) {
  const resolvedParams = use(params);
  const shopId = resolvedParams.id;
  const router = useRouter();

  const [shop, setShop] = useState<Shop | null>(null);
  const [activeStaffList, setActiveStaffList] = useState<Staff[]>([]);
  const [adminStaff, setAdminStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 로그인 모달/폼 분기
  const [loginMode, setLoginMode] = useState<"none" | "admin" | "employee">("none");
  const [adminName, setAdminName] = useState<string>("");
  const [adminPin, setAdminPin] = useState<string>("");
  const [selectedStaffName, setSelectedStaffName] = useState<string>("");
  const [staffPin, setStaffPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    fetchShopAndStaff();
  }, [shopId]);

  const fetchShopAndStaff = async () => {
    setLoading(true);
    try {
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .single();

      if (shopError || !shopData) {
        console.error("플라워샵 조회 오류:", shopError);
        router.push("/");
        return;
      }
      setShop(shopData);

      // 플라워샵 관리자 스코핑 버그 해결: shop_id 기준 단독 조회
      const { data: adminData } = await supabase
        .from("staff")
        .select("id, name, is_admin, hourly_wage, status, pin_code")
        .eq("shop_id", shopId)
        .eq("is_admin", true)
        .limit(1)
        .maybeSingle();

      setAdminStaff(adminData || null);
      if (adminData) {
        setAdminName(adminData.name);
      }

      // 재직 직원만 노출: F-05 재직 직원 로그인 및 퇴사자 배제 (active만 노출, resigned 배제)
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, is_admin, hourly_wage, status, pin_code")
        .eq("shop_id", shopId)
        .eq("is_admin", false)
        .eq("status", "active")
        .order("name", { ascending: true });

      setActiveStaffList(staffData || []);
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!adminStaff) {
      setErrorMsg("등록된 관리자가 없습니다.");
      return;
    }

    if (!adminName.trim()) {
      setErrorMsg("관리자 이름을 입력해주세요.");
      return;
    }

    if (!/^[0-9]{4}$/.test(adminPin)) {
      setErrorMsg("4자리 PIN 번호를 정확히 숫자로 입력해주세요.");
      return;
    }

    if (adminStaff.name !== adminName.trim() || adminStaff.pin_code !== adminPin) {
      setErrorMsg("관리자 이름 또는 PIN 번호가 일치하지 않습니다.");
      return;
    }

    localStorage.setItem(
      "flower_shop_user",
      JSON.stringify({
        id: adminStaff.id,
        shop_id: shopId,
        name: adminStaff.name,
        is_admin: true,
        hourly_wage: adminStaff.hourly_wage,
        status: adminStaff.status,
      })
    );
    router.push("/admin");
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedStaffName) {
      setErrorMsg("직원을 선택해주세요.");
      return;
    }

    if (!/^[0-9]{4}$/.test(staffPin)) {
      setErrorMsg("4자리 PIN 번호를 정확히 숫자로 입력해주세요.");
      return;
    }

    const target = activeStaffList.find((s) => s.name === selectedStaffName);
    if (!target) {
      setErrorMsg("선택된 직원을 찾을 수 없습니다.");
      return;
    }

    if (target.pin_code !== staffPin) {
      setErrorMsg("PIN 번호가 일치하지 않습니다.");
      return;
    }

    localStorage.setItem(
      "flower_shop_user",
      JSON.stringify({
        id: target.id,
        shop_id: shopId,
        name: target.name,
        is_admin: false,
        hourly_wage: target.hourly_wage,
        status: target.status,
      })
    );
    router.push("/employee/dashboard");
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-subText">로딩 중...</div>;
  }

  if (!shop) return null;

  return (
    <div className="flex flex-col flex-1 pt-6 px-4 pb-8 space-y-5">
      {/* 1. 상단 헤더: 플라워샵명 타이틀 및 전체 플라워샵 메인으로 이동 링크 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-borderLine shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center font-bold">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-textColor">{shop.name}</h1>
            <p className="text-xs text-subText">플라워샵 메인</p>
          </div>
        </div>
        <Link
          href="/"
          className="px-3 min-h-[46px] h-[46px] border border-borderLine rounded-xl text-xs text-slate-700 font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          전체 플라워샵 메인으로 이동
        </Link>
      </div>

      {/* 2. 관리자 미등록 시 vs 3. 관리자 등록 완료 시 분기 */}
      {!adminStaff ? (
        <div className="p-6 bg-amber-50/60 border border-amber-200 rounded-xl text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-900">
              등록된 관리자가 없습니다
            </h2>
            <p className="text-xs text-amber-700 mt-1">
              매장 운영 및 직원 승인을 위해 먼저 관리자를 등록해주세요.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push(`/admin/setup?shop_id=${shop.id}`)}
          >
            관리자 등록
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 상단: 관리자 로그인 버튼 (PIN 인증 후 /admin 이동) */}
          <div className="bg-white p-5 rounded-xl border border-borderLine shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">관리자 계정</span>
              <span className="text-xs text-subText">소속 직원 및 시급 관리</span>
            </div>

            {loginMode === "admin" ? (
              <form onSubmit={handleAdminLogin} className="space-y-3 pt-2 border-t border-borderLine">
                <div>
                  <label className="block text-xs font-semibold text-textColor mb-1">
                    관리자 이름
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="관리자 이름"
                    className="w-full min-h-[46px] h-[46px] px-3 border border-borderLine rounded-xl text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-textColor mb-1">
                    4자리 PIN 번호
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="••••"
                    className="w-full min-h-[46px] h-[46px] text-center tracking-widest text-lg font-bold border border-borderLine rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
                  />
                </div>
                {errorMsg && (
                  <p className="text-xs text-rose-500 text-center font-medium">
                    {errorMsg}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setLoginMode("none")}>
                    취소
                  </Button>
                  <Button type="submit" variant="secondary">
                    관리자 로그인
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setLoginMode("admin");
                  setErrorMsg("");
                }}
              >
                관리자 로그인
              </Button>
            )}
          </div>

          {/* 중앙: 직원 로그인 영역 (재직 직원 선택 드롭다운, 4자리 PIN 입력, 근무 관리 시작 버튼) */}
          <div className="bg-white p-5 rounded-xl border border-borderLine shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#059669]" />
              <h2 className="text-sm font-bold text-textColor">직원 로그인</h2>
            </div>
            <p className="text-xs text-subText">
              퇴사자를 제외한 승인 완료된 재직자만 선택 가능합니다.
            </p>

            <form onSubmit={handleStaffLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  재직 직원 선택
                </label>
                <select
                  value={selectedStaffName}
                  onChange={(e) => setSelectedStaffName(e.target.value)}
                  className="w-full min-h-[46px] h-[46px] px-3 border border-borderLine rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                >
                  <option value="">재직 직원을 선택하세요</option>
                  {activeStaffList.map((st) => (
                    <option key={st.id} value={st.name}>
                      {st.name} (재직)
                    </option>
                  ))}
                </select>
                {activeStaffList.length === 0 && (
                  <p className="text-[11px] text-subText mt-1">
                    현재 승인된 재직 직원이 없습니다. 신규 가입 후 관리자 승인이 필요합니다.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  4자리 PIN 번호
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="••••"
                  className="w-full min-h-[46px] h-[46px] text-center tracking-widest text-lg font-bold border border-borderLine rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
                />
              </div>

              {errorMsg && loginMode !== "admin" && (
                <p className="text-xs text-rose-500 text-center font-medium">
                  {errorMsg}
                </p>
              )}

              <Button type="submit" variant="primary">
                근무 관리 시작
              </Button>
            </form>
          </div>

          {/* 하단: 신규 직원 가입 신청 버튼 */}
          <div className="pt-1">
            <Button
              variant="outline"
              onClick={() => router.push(`/signup?shop_id=${shop.id}`)}
            >
              신규 직원 가입 신청
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
