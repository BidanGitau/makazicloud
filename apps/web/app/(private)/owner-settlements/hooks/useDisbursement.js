"use client";

import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/app/_components/CustomToast";
import { OwnerSettlements, PropertyNetIncome } from "@/app/_lib/repositories";
import { breakdownColumns, payoutModes } from "../constants";
import { sendOwnerBrief } from "../sendOwnerBrief";
import { closeMonthKey, dateRange, monthValue, netRowTotals } from "../utils/settlementMath";

/** State, figures and release action for the "Disburse funds" slider. */
export function useDisbursement({
  properties,
  propertiesById,
  settlements,
  tenants,
  includeDeposits,
  onReleased,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [disburseMonth, setDisburseMonth] = useState(monthValue());
  const [sliderNetRow, setSliderNetRow] = useState(null);
  const [propertyId, setPropertyId] = useState("");
  const [payoutMode, setPayoutMode] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [savingClose, setSavingClose] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const lastCloseableMonth = monthValue(-1);
  const currentMonth = monthValue(0);

  useEffect(() => {
    if (!isOpen) {
      setSliderNetRow(null);
      return;
    }
    if (!propertyId) {
      setSliderNetRow(null);
      return undefined;
    }
    const period = dateRange(disburseMonth);
    let cancelled = false;
    PropertyNetIncome.getAll({
      match: {
        property_id: propertyId,
        start_date: period.startDate,
        end_date: period.endDate,
        include_deposits: includeDeposits ? "true" : "false",
      },
    })
      .then((rows) => {
        if (cancelled) return;
        setSliderNetRow(
          (rows || []).find((row) => row.property_id === propertyId) || null,
        );
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setSliderNetRow(null);
          showToast.error("Failed to load collection for this month.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, disburseMonth, includeDeposits, propertyId]);

  const propertyTenantCount = useMemo(() => {
    if (!propertyId) return 0;
    return new Set(
      tenants
        .filter((tenant) => tenant.property_id === propertyId)
        .map((tenant) => tenant.tenant_id || tenant.id || tenant.full_name),
    ).size;
  }, [propertyId, tenants]);

  const selectedProperty = properties.find((property) => property.id === propertyId);
  const closeRange = useMemo(() => dateRange(disburseMonth), [disburseMonth]);
  const existingClose = useMemo(
    () =>
      settlements.find(
        (row) =>
          row.property_id === propertyId &&
          closeMonthKey(row.close_month) === disburseMonth,
      ) || null,
    [disburseMonth, propertyId, settlements],
  );
  const liveTotals = useMemo(() => netRowTotals(sliderNetRow), [sliderNetRow]);
  const closeTotals = useMemo(
    () =>
      existingClose
        ? {
            expected: liveTotals.expected,
            expectedPayout: liveTotals.expectedPayout,
            deposits: liveTotals.deposits,
            gross: Number(existingClose.gross_collection || 0),
            commission: Number(existingClose.commission_amount || 0),
            maintenance: Number(existingClose.maintenance_amount || 0),
            advances: Number(existingClose.advances_amount || 0),
            payout: Number(existingClose.owner_payout || 0),
            canDisburse: Number(existingClose.owner_payout || 0),
          }
        : liveTotals,
    [existingClose, liveTotals],
  );

  const overview = useMemo(() => {
    const totalDeductions =
      closeTotals.commission + closeTotals.maintenance + closeTotals.advances;
    return {
      totalDeductions,
      amountToDisburse: existingClose ? closeTotals.payout : closeTotals.canDisburse,
    };
  }, [closeTotals, existingClose]);

  const exportData = useMemo(() => {
    if (!existingClose && !sliderNetRow) return [];

    return [
      {
        item: "Rent Collected",
        amount: closeTotals.gross,
        notes: "Rent received during the selected period",
      },
      {
        item: "Deposits",
        amount: includeDeposits ? closeTotals.deposits || 0 : 0,
        notes: includeDeposits
          ? "Deposits included in this disbursement"
          : "Deposits excluded from this disbursement",
      },
      {
        item: "Commission",
        amount: closeTotals.commission,
        notes: "Agency commission deducted from collection",
      },
      {
        item: "Maintenance",
        amount: closeTotals.maintenance,
        notes: "Maintenance deductions in this period",
      },
      {
        item: "Owner Advances",
        amount: closeTotals.advances,
        notes: "Advances deducted from owner payout",
      },
      {
        item: "Total Deductions",
        amount: overview.totalDeductions,
        notes: "Commission, maintenance, and advances",
      },
      {
        item: "Amount To Disburse",
        amount: overview.amountToDisburse,
        notes: "Net amount payable to owner",
      },
    ];
  }, [closeTotals, overview, existingClose, includeDeposits, sliderNetRow]);

  const pdfSections = useMemo(
    () => [
      {
        title: "Collection And Disbursement Breakdown",
        data: exportData,
        columns: breakdownColumns,
      },
    ],
    [exportData],
  );

  const isFutureOrCurrentMonth = disburseMonth > lastCloseableMonth;
  const hasCollection =
    closeTotals.gross > 0 || (includeDeposits && Number(closeTotals.deposits || 0) > 0);
  const canRelease =
    Boolean(propertyId) &&
    !existingClose &&
    !isFutureOrCurrentMonth &&
    hasCollection &&
    Boolean(payoutMode) &&
    Boolean(reference.trim());
  const pdfMetadata = {
    Period: closeRange.label,
    Property: selectedProperty?.name || "All Properties",
    "Paid By": payoutModes.find((mode) => mode.value === payoutMode)?.label || "-",
    "Payment Ref": reference.trim() || "-",
    "Tenants": propertyTenantCount,
    Generated: new Date().toLocaleDateString("en-KE"),
  };

  useEffect(() => {
    if (!existingClose) {
      setPayoutMode("");
      setReference("");
      setNotes("");
      return;
    }
    setPayoutMode(existingClose.payout_mode || "");
    setReference(existingClose.payout_reference || "");
    setNotes(existingClose.notes || "");
  }, [existingClose]);

  const clampMonth = (value) => {
    const next = /^\d{4}-\d{2}$/.test(value || "") ? value : currentMonth;
    return next > currentMonth ? currentMonth : next;
  };

  const open = (month) => {
    setDisburseMonth(clampMonth(month));
    setSliderNetRow(null);
    setConfirmRelease(false);
    setIsOpen(true);
  };

  const close = () => {
    setConfirmRelease(false);
    setIsOpen(false);
  };

  const requestRelease = () => {
    if (existingClose) {
      showToast.error("This month has already been disbursed and cannot be amended.");
      return;
    }
    if (!propertyId) {
      showToast.error("Choose a property before disbursing.");
      return;
    }
    if (isFutureOrCurrentMonth) {
      showToast.error("You can only disburse after the month has ended.");
      return;
    }
    if (!hasCollection) {
      showToast.error("Nothing has been collected for this month yet.");
      return;
    }
    if (!payoutMode) {
      showToast.error("Choose how the owner will be paid.");
      return;
    }
    if (!reference.trim()) {
      showToast.error("Enter the payment reference.");
      return;
    }
    setConfirmRelease(true);
  };

  const release = async () => {
    if (!canRelease) return;

    setSavingClose(true);
    const payload = {
      property_id: propertyId,
      close_month: `${disburseMonth}-01`,
      gross_collection:
        closeTotals.gross + (includeDeposits ? Number(closeTotals.deposits || 0) : 0),
      commission_amount: closeTotals.commission,
      maintenance_amount: closeTotals.maintenance,
      advances_amount: closeTotals.advances,
      owner_payout: existingClose ? closeTotals.payout : closeTotals.canDisburse,
      payout_mode: payoutMode,
      payout_reference: reference.trim(),
      notes: notes.trim() || null,
      closed_at: new Date().toISOString(),
    };

    try {
      await OwnerSettlements.create(payload);
      showToast.success("Funds disbursed.");
      const property = propertiesById[propertyId] || selectedProperty || {};
      if (property.owner_phone) {
        await sendOwnerBrief(
          {
            ...payload,
            property_id: propertyId,
            property_name: property.name,
            owner_name: property.owner_name,
            owner_phone: property.owner_phone,
            commission_rate: property.commission_rate,
          },
          propertiesById,
        );
      }
      await onReleased?.();
      setConfirmRelease(false);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      showToast.error(err?.message || "Failed to disburse funds.");
    } finally {
      setSavingClose(false);
    }
  };

  return {
    isOpen,
    open,
    close,
    currentMonth,
    disburseMonth,
    setDisburseMonth: (value) => setDisburseMonth(clampMonth(value)),
    propertyId,
    setPropertyId,
    payoutMode,
    setPayoutMode,
    reference,
    setReference,
    notes,
    setNotes,
    selectedProperty,
    closeRange,
    existingClose,
    closeTotals,
    overview,
    exportData,
    pdfSections,
    pdfMetadata,
    hasCollection,
    canRelease,
    savingClose,
    confirmRelease,
    cancelRelease: () => setConfirmRelease(false),
    requestRelease,
    release,
  };
}
