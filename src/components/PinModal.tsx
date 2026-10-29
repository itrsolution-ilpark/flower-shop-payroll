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
      setError("4자리 숫자 PIN을 정확히 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), pin });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-xl">
        <h3 className="text-lg font-bold text-textColor mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mb-4">{description}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {requireName && (
            <div>
              <label className="block text-xs font-semibold text-textColor mb-1">
                관리자 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-textColor mb-1">
              4자리 PIN 번호
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="••••"
              className="w-full h-12 text-center tracking-widest text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          {error && (
            <p className="text-xs text-errorColor text-center font-medium">
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
