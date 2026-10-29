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
}

export default function ShopMainPage({ params }: ShopMainPageProps) {
  const resolvedParams = use(params);
  const shopId = resolvedParams.id;
  const router = useRouter();

  const [shop, setShop] = useState<Shop | null>(null);
  const [activeStaffList, setActiveStaffList] = useState<Staff[]>([]);
  const [adminStaff, setAdminStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

      const { data: adminData } = await supabase
        .from("shop_admins")
        .select("id, name, pin_hash")
        .eq("shop_id", shopId)
        .maybeSingle();

      if (adminData) {
        setAdminStaff({
          id: adminData.id,
          name: adminData.name,
          is_admin: true,
          status: "active",
          pin_code: adminData.pin_hash,
        });
        setAdminName(adminData.name);
      } else {
        const { data: legacyAdmin } = await supabase
          .from("staff")
          .select("id, name, is_admin, status, pin_code")
          .eq("shop_id", shopId)
          .eq("is_admin", true)
          .limit(1)
          .maybeSingle();

        if (legacyAdmin) {
          setAdminStaff(legacyAdmin);
          setAdminName(legacyAdmin.name);
        } else {
          setAdminStaff(null);
        }
      }

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, is_admin, status, pin_code")
        .eq("shop_id", shopId)
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
      setErrorMsg("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    if (adminStaff.name !== adminName.trim() || adminStaff.pin_code !== adminPin) {
      setErrorMsg("이름 또는 비밀을 확인해 주세요.");
      return;
    }

    localStorage.setItem(
      "flower_shop_user",
      JSON.stringify({
        id: adminStaff.id,
        shop_id: shopId,
        name: adminStaff.name,
        is_admin: true,
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
      setErrorMsg("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    const target = activeStaffList.find((s) => s.name === selectedStaffName);
    if (!target) {
      setErrorMsg("선택된 직원을 찾을 수 없습니다.");
      return;
    }

    if (target.pin_code !== staffPin) {
      setErrorMsg("이름 또는 비밀을 확인해 주세요.");
      return;
    }

    localStorage.setItem(
      "flower_shop_user",
      JSON.stringify({
        id: target.id,
        shop_id: shopId,
        name: target.name,
        is_admin: false,
        status: target.status,
      })
    );
    router.push("/employee/dashboard");
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-[#64748B]">로딩 중...</div>;
  }

  if (!shop) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6 text-center">
        <p className="text-sm font-bold text-[#0F172A]">플라워샵을 찾을 수 없습니다.</p>
        <Link href="/" className="mt-3 text-xs text-[#059669] font-semibold underline">
          메인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* 공통 배너 */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 h-[56px] md:h-[64px] flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg md:text-xl font-bold text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
        <Link
          href="/"
          className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          메인으로 돌아가기
        </Link>
      </header>

      <div className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">{shop.name}</h2>
            <p className="text-xs text-[#64748B]">플라워샵 관리 및 직원 로그인</p>
          </div>
        </div>

        {!adminStaff ? (
          <div className="p-8 bg-amber-50/60 border border-amber-200 rounded-2xl text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                등록된 관리자가 없습니다
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                매장 운영 및 직원 승인을 위해 관리자를 등록해주세요.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => router.push(`/admin/setup?shop_id=${shop.id}`)}
              >
                관리자 등록
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 관리자 로그인 */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <span className="text-sm font-bold text-[#0F172A]">관리자 로그인</span>
                <span className="text-xs text-[#64748B]">매장 관리 및 정산</span>
              </div>

              {loginMode === "admin" ? (
                <form onSubmit={handleAdminLogin} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      관리자 이름
                    </label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="관리자 이름"
                      className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      비밀
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="••••"
                      className="w-full min-h-[46px] h-[46px] text-center tracking-widest text-lg font-bold border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
                    />
                  </div>
                  {errorMsg && loginMode === "admin" && (
                    <p className="text-xs text-rose-500 text-center font-medium">
                      {errorMsg}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setLoginMode("none")}>
                      취소
                    </Button>
                    <Button type="submit" variant="secondary">
                      로그인
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

            {/* 직원 로그인 및 가입 신청 */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#059669]" />
                  <span className="text-sm font-bold text-[#0F172A]">직원 로그인</span>
                </div>
                <Link
                  href={`/signup?shop_id=${shop.id}`}
                  className="text-xs text-[#059669] font-semibold hover:underline"
                >
                  직원 가입 신청 &rarr;
                </Link>
              </div>

              <form onSubmit={handleStaffLogin} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    직원 선택 (재직 직원만 표시)
                  </label>
                  <select
                    value={selectedStaffName}
                    onChange={(e) => setSelectedStaffName(e.target.value)}
                    className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  >
                    <option value="">재직 직원을 선택하세요</option>
                    {activeStaffList.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    비밀
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="••••"
                    className="w-full min-h-[46px] h-[46px] text-center tracking-widest text-lg font-bold border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
                  />
                </div>

                {errorMsg && loginMode !== "admin" && (
                  <p className="text-xs text-rose-500 text-center font-medium">
                    {errorMsg}
                  </p>
                )}

                <Button type="submit" variant="primary">
                  직원 로그인
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
