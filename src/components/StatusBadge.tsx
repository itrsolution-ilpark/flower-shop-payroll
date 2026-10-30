import React from "react";

export type StaffOrShopStatus = "pending" | "approved" | "resigned" | "active" | "inactive" | string;

interface StatusBadgeProps {
  status: StaffOrShopStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          승인대기
        </span>
      );
    case "approved":
    case "active":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          {status === "active" ? "활성" : "승인(재직)"}
        </span>
      );
    case "resigned":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
          퇴사
        </span>
      );
    case "inactive":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
          비활성
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
          {status}
        </span>
      );
  }
}
