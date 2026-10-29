import React from "react";

export type StaffStatus = "pending" | "active" | "resigned" | string;

interface StatusBadgeProps {
  status: StaffStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706]">
          승인대기
        </span>
      );
    case "active":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669]">
          재직
        </span>
      );
    case "resigned":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#64748B]">
          퇴사
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
