"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

interface Shop {
  id: string;
  name: string;
}

export default function MainPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("플라워샵 목록 조회 오류:", error);
      } else if (data) {
        setShops(data);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShop = (shopId: string) => {
    router.push(`/shop/${shopId}`);
  };

  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-primary mb-2">
          플라워샵 근무 관리
        </h1>
        <p className="text-sm text-gray-600">
          관리할 플라워샵을 검색하거나 새로운 플라워샵을 등록하세요.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Button
            variant="primary"
            onClick={() => router.push("/shop/register")}
          >
            + 플라워샵 등록
          </Button>
        </div>

        <div className="pt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="플라워샵 이름 검색..."
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-textColor">플라워샵 목록 리스트</h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12 bg-background rounded-lg border border-secondary p-6">
            <p className="text-sm text-gray-600 mb-2">
              {searchQuery ? "검색 결과가 없습니다." : "등록된 플라워샵이 없습니다."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {filteredShops.map((shop) => (
              <div
                key={shop.id}
                onClick={() => handleSelectShop(shop.id)}
                className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-primary hover:bg-background transition cursor-pointer flex justify-between items-center"
              >
                <span className="font-bold text-textColor text-base">
                  {shop.name}
                </span>
                <span className="text-xs text-primary font-semibold bg-primary/10 px-3 py-1.5 rounded-lg">
                  선택하기 →
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
