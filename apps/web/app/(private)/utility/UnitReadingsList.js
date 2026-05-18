"use client";

import { calcConsumption } from "./utilityConstants";
import { formFieldClass } from "@/app/_components/ui/formStyles";

/**
 * Per-unit meter readings picker used inside BillForm (metered billing).
 * Extracted so BillForm stays focused on form state + submission logic.
 */
export default function UnitReadingsList({
  propertyUnits,
  meterReadings,
  ratePerUnit,
  selectedUnitId,
  setSelectedUnitId,
  onAdd,
  onRemove,
  onSetCurrentReading,
}) {
  const availableUnits = propertyUnits.filter((u) => !meterReadings[u.id]);
  const rate = Number(ratePerUnit) || 0;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Unit readings</label>

      {/* Unit picker row */}
      <div className="flex gap-2">
        <select
          value={selectedUnitId}
          onChange={(e) => setSelectedUnitId(e.target.value)}
          className={`${formFieldClass} flex-1`}
          disabled={availableUnits.length === 0}
        >
          <option value="">
            {availableUnits.length === 0 ? "All units added" : "Select unit to add"}
          </option>
          {availableUnits.map((u) => (
            <option key={u.id} value={u.id}>Unit {u.unit_number}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onAdd}
          disabled={!selectedUnitId}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Added unit rows */}
      {Object.keys(meterReadings).length > 0 && (
        <div className="space-y-2">
          {Object.entries(meterReadings).map(([unitId, r]) => {
            const unit = propertyUnits.find((u) => u.id === unitId);
            const prev = Number(r.previous_reading || 0);
            const curr = Number(r.current_reading || 0);
            const consumption = calcConsumption(prev, curr);
            return (
              <div key={unitId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium w-16 shrink-0">
                  Unit {unit?.unit_number ?? "–"}
                </span>
                <span className="text-xs text-gray-500">
                  Prev: <span className="font-medium text-gray-700">{prev}</span>
                </span>
                <input
                  type="number"
                  value={r.current_reading}
                  onChange={(e) => onSetCurrentReading(unitId, e.target.value)}
                  placeholder="Current"
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {consumption > 0 && (
                  <span className="text-xs text-blue-600">
                    {consumption} units → KSh {(consumption * rate).toLocaleString()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(unitId)}
                  className="ml-auto text-red-500 hover:text-red-700 text-xs"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
