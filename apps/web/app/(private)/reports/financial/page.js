"use client";

import { useMemo } from "react";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import PageWrapper from "@/app/_components/PageWrapper";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import ReportTabs from "../ReportTabs";
import FinancialFilters from "./components/FinancialFilters";
import FinancialHeader from "./components/FinancialHeader";
import FinancialStats from "./components/FinancialStats";
import FinancialTable from "./components/FinancialTable";
import { useFinancialReport } from "./hooks/useFinancialReport";
import { buildFinancialPdfMetadata } from "./utils/financialReportUtils";

export default function FinancialSummaryPage() {
  const {
    data,
    loading,
    filters,
    filteredData,
    summary,
    exportData,
    netByProperty,
    loadFinancialData,
    updateFilters,
    resetFilters,
  } = useFinancialReport();

  const {
    properties,
    propertyBlocks,
    isLoading: isLoadingFormData,
  } = usePropertyStructure(filters.propertyId, filters.blockId);

  const pdfMetadata = useMemo(
    () =>
      buildFinancialPdfMetadata({
        properties,
        propertyBlocks,
        propertyId: filters.propertyId,
        blockId: filters.blockId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        summary,
      }),
    [filters, properties, propertyBlocks, summary],
  );

  const showingInitialLoading = (loading || isLoadingFormData) && data.length === 0;

  if (showingInitialLoading) {
    return <PageSkeleton cards={5} hasFilters />;
  }

  return (
    <PageWrapper showTitle={false}>
      <div className="space-y-5">
        <FinancialHeader
          loading={loading}
          hasRows={filteredData.length > 0}
          exportData={exportData}
          pdfMetadata={pdfMetadata}
          onRefresh={loadFinancialData}
        />

        <ReportTabs active="financial" />

        <FinancialFilters
          properties={properties}
          propertyBlocks={propertyBlocks}
          filters={filters}
          loading={loading}
          onChange={updateFilters}
          onRefresh={loadFinancialData}
          onReset={resetFilters}
        />

        <FinancialStats summary={summary} />

        <FinancialTable
          data={filteredData}
          loading={loading}
          netByProperty={netByProperty}
        />
      </div>
    </PageWrapper>
  );
}
