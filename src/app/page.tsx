"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProgramBanner from "@/components/ProgramBanner";
import SecretField from "@/components/SecretField";
import Button from "@/components/ui/Button";
import { getShopsAction, ShopSummary } from "@/actions/shopActions";
import { getSystemAdminCountAction, loginSystemAdminAction } from "@/actions/systemAdminActions";
import { ShieldCheck, Search } from "lucide-react";

export default function MainPage() {
  const router = useRouter();
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // 시스템 관리자 모달 상태
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [adminName, setAdminName] = useState<string>("");
  const [adminSecret, setAdminSecret] = useState<string>("");
  const [modalError, setModalError] = useState<string>("");
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  useEffect(() => {
    checkAdminAndFetchShops();
  }, []);

  const checkAdminAndFetchShops = async () => {
    try {
      const adminCount = await getSystemAdminCountAction();
      if (adminCount === 0) {
        router.push("/system-setup");
        return;
      }
      const data = await getShopsAction();
      setShops(data);
    } catch {
      // Build SSR safe
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!adminName.trim()) {
      setModalError("이름 또는 비밀을 확인해 주세요.");
      return;
    }
    if (adminSecret.length !== 4) {
      setModalError("이름 또는 비밀을 확인해 주세요.");
      return;
    }

    setModalLoading(true);
    try {
      const res = await loginSystemAdminAction(adminName, adminSecret);
      if (!res.success) {
        setModalError(res.error || "이름 또는 비밀을 확인해 주세요.");
        return;
      }
      setIsModalOpen(false);
      router.push("/shop/register");
    } catch {
      setModalError("이름 또는 비밀을 확인해 주세요.");
    } finally {
      setModalLoading(false);
    }
  };

  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1">
      {/* 1. 최상단 공통 프로그램 배너 */}
      <ProgramBanner />

      <main className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* 2. 상단 배너 바로 아래 ‘플라워샵 관리’ 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setIsModalOpen(true);
              setModalError("");
              setAdminName("");
              setAdminSecret("");
            }}
            className="px-4 min-h-[46px] h-[46px] bg-[#1E293B] text-white rounded-xl text-xs font-semibold hover:bg-[#0f172a] transition-all duration-200 flex items-center gap-2 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            플라워샵 관리
          </button>
        </div>

        {/* 3. 검색 입력란 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="플라워샵 이름을 검색하세요..."
              className="w-full min-h-[46px] h-[46px] pl-10 pr-4 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white text-sm"
            />
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 4. 별도 영역으로 지정된 ‘등록된 플라워샵’ 목록 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3">
            등록된 플라워샵
          </h2>

          {loading ? (
            <div className="text-center py-12 text-xs text-[#64748B]">로딩 중...</div>
          ) : filteredShops.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#64748B]">
              {searchQuery ? "검색 결과가 없습니다." : "등록된 플라워샵이 없습니다."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredShops.map((shop) => (
                <div
                  key={shop.id}
                  className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3 shadow-sm hover:shadow transition"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-[#0F172A]">{shop.name}</h3>
                    <p className="text-xs text-[#64748B]">
                      재직 직원 수: <span className="font-semibold text-[#059669]">{shop.staffCount}명</span>
                    </p>
                  </div>
                  <Link
                    href={`/shop/${shop.id}`}
                    className="min-h-[46px] h-[46px] px-5 bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    선택
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 시스템 관리자 인증 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-[#E2E8F0]">
            <h3 className="text-base font-bold text-[#0F172A] mb-1">시스템 관리자 인증</h3>
            <p className="text-xs text-[#64748B] mb-4">
              플라워샵 등록 및 관리를 위해 이름과 비밀을 입력하세요.
            </p>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="이름 입력"
                  className="w-full min-h-[46px] h-[46px] px-3 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
                  autoFocus
                />
              </div>

              <SecretField
                label="비밀"
                value={adminSecret}
                onChange={setAdminSecret}
              />

              {modalError && (
                <p className="text-xs text-rose-500 text-center font-medium">
                  {modalError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalLoading}
                >
                  취소
                </Button>
                <Button type="submit" variant="primary" disabled={modalLoading}>
                  {modalLoading ? "확인 중..." : "확인"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
