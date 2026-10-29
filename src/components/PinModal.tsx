"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";

interface PinModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  requireName?: boolean;
  onClose: () => void;
  onSubmit: (data: { name?: string; pin: string }) => Promise<void> | void;
}

export default function PinModal({
  isOpen,
  title,
  description,
  requireName = false,
  onClose,
  onSubmit,
}: PinModalProps) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (requireName && !name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    if (!/^[0-9]{4}$/.test(pin)) {
      setError("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), pin });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "이름 또는 비밀을 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-[#E2E8F0]">
        <h3 className="text-base font-bold text-[#0F172A] mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-[#64748B] mb-4">{description}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {requireName && (
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                관리자 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                className="w-full min-h-[46px] h-[46px] px-3 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              비밀
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="••••"
              className="w-full min-h-[46px] h-[46px] text-center tracking-widest text-lg font-bold border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-500 text-center font-medium">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "확인 중..." : "확인"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
