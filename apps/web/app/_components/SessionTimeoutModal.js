"use client";

import { Clock, LogOut, RefreshCw } from "lucide-react";

export default function SessionTimeoutModal({ secondsLeft, onStay, onLogout }) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`;

  const urgency = secondsLeft <= 60;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Top accent */}
        <div className={`h-1.5 w-full ${urgency ? "bg-red-500" : "bg-amber-400"}`} />

        <div className="px-6 py-6 space-y-5">
          {/* Icon + countdown */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${urgency ? "bg-red-50" : "bg-amber-50"}`}>
              <Clock className={`w-7 h-7 ${urgency ? "text-red-500" : "text-amber-500"}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Session expiring</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                You've been inactive for a while.
              </p>
            </div>
          </div>

          {/* Countdown display */}
          <div className={`rounded-xl px-4 py-3 text-center ${urgency ? "bg-red-50 border border-red-100" : "bg-amber-50 border border-amber-100"}`}>
            <span className={`text-3xl font-bold tabular-nums ${urgency ? "text-red-600" : "text-amber-600"}`}>
              {timeStr}
            </span>
            <p className="text-xs text-gray-500 mt-0.5">until automatic logout</p>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Do you want to stay logged in?
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
            <button
              onClick={onStay}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Stay logged in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
