"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import DataTable from "react-data-table-component";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import ModalSlider from "@/app/_components/ModalSlider";
import PaymentForm from "./PaymentForm";
import { Payments, Tenants } from "@/app/_lib/repositories";
import LoadingSkeleton from "@/app/_components/LoadingSkeleton";
import { Input, Select } from "antd";
import { useFormData } from "@/app/_hooks/useFormData";
import { useAuth } from "@/app/_context/AuthContext";

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("payments:create");
  const handledNewParam = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "true" && !handledNewParam.current) {
      handledNewParam.current = true;
      if (canCreate) setOpen(true);
      window.history.replaceState(window.history.state, "", pathname);
    }
  }, [canCreate, pathname, searchParams]);
  const [payments, setPayments] = useState([]);
  const [tenantOverview, setTenantOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProperty, setFilterProperty] = useState("");
  const [filterMonth, setFilterMonth] = useState(""); // YYYY-MM
  const {
    properties,
    blocks,
    isLoading: isLoadingFormData,
  } = useFormData();

  const loadPayments = async () => {
    setLoading(true);
    try {
      const [paymentsData, tenantRows] = await Promise.all([
        Payments.getAll({
          select: "id,tenant_id,amount,payment_date,method,reference",
        }),
        Tenants.getOverview(),
      ]);

      setPayments(paymentsData || []);
      setTenantOverview(tenantRows || []);
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const tenantMap = useMemo(() => {
    return tenantOverview.map((tenant) => ({
      ...tenant,
      id: tenant.tenant_id || tenant.id,
      unitNumber: tenant.unit_number || "N/A",
      propertyId: tenant.property_id || null,
      propertyName: tenant.property_name || "N/A",
      blockId: tenant.block_id || null,
      blockName: tenant.block_name || null,
    }));
  }, [tenantOverview]);

  const mappedPayments = useMemo(() => {
    return payments.map((payment) => {
      const tenant = tenantMap.find((item) => item.id === payment.tenant_id) || {};

      return {
        ...payment,
        tenantName: tenant.full_name || "Unknown",
        unitNumber: tenant.unitNumber || "N/A",
        propertyId: tenant.propertyId,
        propertyName: tenant.propertyName,
        blockId: tenant.blockId,
        blockName: tenant.blockName,
        formattedDate: new Date(payment.payment_date).toLocaleDateString("en-KE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      };
    });
  }, [payments, tenantMap]);

  const filteredPayments = mappedPayments.filter((p) => {
    const matchesProperty = filterProperty
      ? p.propertyId === filterProperty
      : true;
    const matchesMonth = filterMonth
      ? new Date(p.payment_date).toISOString().slice(0, 7) === filterMonth
      : true;
    return matchesProperty && matchesMonth;
  });

  const TenantPaymentsTable = ({ data, indent = 0 }) => {
    const columns = [
      { name: "Tenant", selector: (r) => r.tenantName, sortable: true },
      { name: "Unit", selector: (r) => r.unitNumber, sortable: true },
      {
        name: "Amount",
        selector: (r) => r.amount,
        sortable: true,
        cell: (r) => (
          <div className="text-right">
            KSh {Number(r.amount).toLocaleString()}
          </div>
        ),
      },
      { name: "Date", selector: (r) => r.formattedDate, sortable: true },
      { name: "Method", selector: (r) => r.method, sortable: true },
      { name: "Reference", selector: (r) => r.reference || "-" },
    ];

    return (
      <div style={{ paddingLeft: `${indent}px` }}>
        <DataTable
          customStyles={editorialTableStyles}
          columns={columns}
          data={data}
          highlightOnHover
          striped
          dense
          noHeader
        />
      </div>
    );
  };

  const BlocksTable = ({ propertyId }) => {
    const propertyPayments = filteredPayments.filter(
      (p) => p.propertyId === propertyId,
    );
    const blocksInProperty = blocks.filter((b) => b.property_id === propertyId);

    if (!blocksInProperty.length)
      return <TenantPaymentsTable data={propertyPayments} indent={20} />;

    const blockData = blocksInProperty.map((block) => {
      const tenantsInBlock = propertyPayments.filter(
        (p) => p.blockId === block.id,
      );
      const totalAmount = tenantsInBlock.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0,
      );
      return { blockName: block.name, tenants: tenantsInBlock, totalAmount };
    });

    const ExpandableBlock = ({ data }) => (
      <TenantPaymentsTable data={data.tenants} indent={40} />
    );

    return (
      <div style={{ paddingLeft: 20 }}>
        <DataTable
          customStyles={editorialTableStyles}
          columns={[
            { name: "Block", selector: (r) => r.blockName, sortable: true },
            {
              name: "Total Payments",
              selector: (r) => r.totalAmount,
              sortable: true,
              cell: (r) => (
                <div className="text-right">
                  KSh {r.totalAmount.toLocaleString()}
                </div>
              ),
            },
          ]}
          data={blockData}
          expandableRows
          expandableRowsComponent={ExpandableBlock}
          highlightOnHover
          striped
          dense
          noHeader
        />
      </div>
    );
  };

  const propertyData = (
    filterProperty
      ? properties.filter((p) => p.id === filterProperty)
      : properties
  ).map((p) => {
    const propertyPayments = filteredPayments.filter(
      (pay) => pay.propertyId === p.id,
    );
    const totalPayments = propertyPayments.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0,
    );
    return { propertyId: p.id, propertyName: p.name, totalPayments };
  });

  const ExpandableProperty = ({ data }) => (
    <BlocksTable propertyId={data.propertyId} />
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-lg sm:text-xl font-semibold">Payments</h1>
        {canCreate && (
          <button
            onClick={() => setOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-700 transition"
          >
            Add Payment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 md:items-end">
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium mb-1">
            Filter by Property
          </label>
          <Select
            value={filterProperty || undefined}
            onChange={(value) => setFilterProperty(value)}
            placeholder="All Properties"
            allowClear
            style={{ width: "100%" }}
            size="large"
          >
            {properties.map((p) => (
              <Select.Option key={p.id} value={p.id}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium mb-1">
            Filter by Month
          </label>
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            size="large"
            className="rounded-lg"
          />
        </div>
      </div>

      {/* DataTable with loading skeleton */}
      {loading || isLoadingFormData ? (
        <LoadingSkeleton rows={6} columns={6} />
      ) : (
        <DataTable
          customStyles={editorialTableStyles}
          columns={[
            {
              name: "Property",
              selector: (r) => r.propertyName,
              sortable: true,
            },
            {
              name: "Total Payments",
              selector: (r) => r.totalPayments,
              sortable: true,
              cell: (r) => (
                <div className="text-right">
                  KSh {r.totalPayments.toLocaleString()}
                </div>
              ),
            },
          ]}
          data={propertyData}
          expandableRows
          expandableRowsComponent={ExpandableProperty}
          highlightOnHover
          striped
          pagination
        />
      )}

      {/* Add Payment Modal */}
      <ModalSlider
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add Payment"
      >
        <PaymentForm
          onSuccess={() => {
            setOpen(false);
            loadPayments();
          }}
        />
      </ModalSlider>
    </div>
  );
}
