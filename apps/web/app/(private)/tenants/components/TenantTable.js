"use client";

import { useMemo, useCallback, useState } from "react";
import DataTable from "react-data-table-component";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import EllipsisMenu from "@/app/_components/ElpsisMenu";
import ModalSlider from "@/app/_components/ModalSlider";
import PaymentForm from "@/app/(private)/payments/PaymentForm";
import { showToast } from "@/app/_components/CustomToast";
import SendArrearEmailModal from "@/app/_components/SendArrearEmailModal";
import SendDocumentModal from "./SendDocumentModal";
import { getTenantHeaders } from "@/app/_lib/api/client";

const TenantTable = ({
  tenants,
  onViewDetails,
  onShiftTenant,
  onDeleteTenant,
  onCancelLease,
  onRefreshTenants,
  canCreatePayments = false,
  canEditTenants = false,
  canDeleteTenants = false,
}) => {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTenant, setPaymentTenant] = useState(null);
  const [emailTenant, setEmailTenant] = useState(null);
  const [documentModal, setDocumentModal] = useState({ open: false, type: null, tenant: null });

  const openDocModal = useCallback((type, row) => {
    const tenantId = row.tenant_id || row.id;
    setDocumentModal({
      open: true,
      type,
      tenant: { tenant_id: tenantId, tenantName: row.full_name || row.tenant_name, tenantEmail: row.email || "" },
    });
  }, []);

  const downloadDocument = useCallback(async (type, row) => {
    const tenantId = row.tenant_id || row.id;
    if (!tenantId) {
      showToast.error("Tenant id is missing.");
      return;
    }

    try {
      const response = await fetch(`/documents/tenants/${tenantId}/${type}`, {
        headers: getTenantHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || `Failed to download ${type}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match?.[1] || `${type}-${tenantId}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to download ${type}:`, error);
      showToast.error(error.message || `Failed to download ${type}`);
    }
  }, []);

  const formatUnitNumber = useCallback((value) => {
    if (typeof value !== "string") return value;
    return value ? value[0].toUpperCase() + value.slice(1) : value;
  }, []);


  const tenantColumns = useMemo(
    () => [
      {
        name: "Tenant",
        selector: (row) => row.full_name,
        sortable: true,
        cell: (row) => (
          <div className="py-2">
            <p className="font-semibold text-black">{row.full_name}</p>
            <div>
              {row.email && (
                <p className="text-sm text-black/55">{row.email}</p>
              )}
            </div>
          </div>
        ),
        grow: 3,
      },
      {
        name: "Unit",
        selector: (row) => row.unit_number,
        sortable: true,
        cell: (row) => (
          <div>
            <div className="font-semibold text-black">
              #{formatUnitNumber(row.unit_number)}
            </div>
            <div className="text-sm text-black/55">{row.unit_type || "-"}</div>
            <div className="text-xs text-black/40">
              Floor {row.floor || "-"}
            </div>
          </div>
        ),
        grow: 2,
      },
      {
        name: "Lease Start",
        selector: (row) => row.lease_start,
        sortable: true,
        cell: (row) =>
          row.lease_start
            ? new Date(row.lease_start).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "-",
        width: "150px",
      },
      {
        name: "Rent",
        selector: (row) => row.rent_amount,
        sortable: true,
        cell: (row) => (
          <span className="font-mono font-semibold tabular-nums text-black">
            KSh {Number(row.rent_amount || 0).toLocaleString()}
          </span>
        ),
        width: "140px",
      },
      {
        name: "Status",
        selector: (row) => row.status,
        sortable: true,
        cell: (row) => (
          <span
            className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
              String(row.status || "").toLowerCase() === "active"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-stone-200 bg-stone-50 text-black/60"
            }`}
          >
            {row.status}
          </span>
        ),
        width: "130px",
      },
      {
        name: "Actions",
        cell: (row) => (
          <EllipsisMenu
            items={[
              canCreatePayments && {
                label: "Add Payment",
                onClick: () => {
                  setPaymentTenant(row);
                  setIsPaymentOpen(true);
                },
              },
              {
                label: "View Details",
                onClick: () => onViewDetails(row),
              },
              canEditTenants && {
                label: "Shift Tenant",
                onClick: () => onShiftTenant(row),
              },
              {
                label: "Send Invoice",
                onClick: () => openDocModal("invoice", row),
              },
              {
                label: "Download Invoice",
                onClick: () => downloadDocument("invoice", row),
              },
              {
                label: "Send Statement",
                onClick: () => openDocModal("statement", row),
              },
              {
                label: "Download Statement",
                onClick: () => downloadDocument("statement", row),
              },
              {
                label: "Send Arrears Email",
                onClick: () => setEmailTenant({ tenant_id: row.tenant_id || row.id, tenantName: row.full_name || row.tenant_name, tenantEmail: row.email }),
              },


              canEditTenants &&
                String(row.status || "").toLowerCase() !== "inactive" && {
                  label: "Cancel Lease",
                  onClick: () =>
                    onCancelLease(
                      row.tenant_id || row.id,
                      row.full_name || row.tenant_name,
                    ),
                  destructive: true,
                },
              canDeleteTenants && {
                label: "Delete",
                onClick: () => onDeleteTenant(row.tenant_id || row.id),
                destructive: true,
              },
            ].filter(Boolean)}
          />
        ),
        width: "96px",
      },
    ],
    [
      onViewDetails,
      onShiftTenant,
      onDeleteTenant,
      onCancelLease,
      canCreatePayments,
      canEditTenants,
      canDeleteTenants,
      downloadDocument,
      formatUnitNumber,
    ],
  );


  const groupedTenants = useMemo(() => {
    return Object.values(
      tenants.reduce((propertiesMap, tenant) => {
        const propertyName = tenant.property_name || "Unknown Property";
        const blockName = tenant.block_name || null;

        if (!propertiesMap[propertyName]) {
          propertiesMap[propertyName] = {
            name: propertyName,
            blocks: {},
            tenants: [],
          };
        }

        const property = propertiesMap[propertyName];

        if (blockName) {
          if (!property.blocks[blockName]) {
            property.blocks[blockName] = [];
          }
          property.blocks[blockName].push(tenant);
        } else {
          property.tenants.push(tenant);
        }

        return propertiesMap;
      }, {}),
    );
  }, [tenants]);

  const BlockExpandable = ({ data }) => {
    const blockData = Object.entries(data).map(([blockName, tenants]) => ({
      name: blockName === "_no_block" ? "No Block" : blockName,
      tenants,
      totalTenants: tenants.length,
      activeTenants: tenants.filter((tenant) =>
        String(tenant.status || "").toLowerCase() === "active",
      ).length,
    }));

    return (
      <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
        <DataTable
          customStyles={editorialTableStyles}
          columns={[
            {
              name: "Block",
              selector: (row) => row.name,
              sortable: true,
              cell: (row) => <span className="font-semibold text-black">{row.name}</span>,
              grow: 3,
            },
            {
              name: "Tenants",
              selector: (row) => row.totalTenants,
              cell: (row) => (
                <span className="font-mono font-semibold tabular-nums text-black">
                  {row.totalTenants}
                </span>
              ),
              sortable: true,
              width: "130px",
            },
            {
              name: "Active",
              selector: (row) => row.activeTenants,
              cell: (row) => (
                <span className="font-mono font-semibold tabular-nums text-green-700">
                  {row.activeTenants}
                </span>
              ),
              sortable: true,
              width: "130px",
            },
          ]}
          data={blockData}
          keyField="name"
          expandableRows
          expandableRowsComponent={({ data }) => (
            <DataTable
              customStyles={editorialTableStyles}
              columns={tenantColumns}
              data={data.tenants}
              keyField="tenant_id"
              noHeader
              dense
          striped
          highlightOnHover
        />
      )}
      highlightOnHover
      striped
      responsive
          dense
          noHeader
        />
      </div>
    );
  };

  const PropertyExpandable = ({ data }) => (
    <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
      {data.blocks && Object.keys(data.blocks).length > 0 ? (
        <>
          <p className="section-label mb-3">— Blocks in {data.name} —</p>
          <BlockExpandable data={data.blocks} />
        </>
      ) : (
        <div>
          <p className="section-label mb-3">— Tenants in {data.name} —</p>
          <DataTable
            customStyles={editorialTableStyles}
            columns={tenantColumns}
            data={data.tenants || []}
            keyField="tenant_id"
            highlightOnHover
            striped
            responsive
            dense
            noHeader
          />
        </div>
      )}
    </div>
  );

  const propertyColumns = useMemo(
    () => [
      {
        name: "Property",
        selector: (row) => row.name,
        sortable: true,
        cell: (row) => (
          <div className="py-2">
            <p className="font-semibold text-black">{row.name}</p>
            <p className="text-sm text-black/55">
              {row.tenants.length +
                Object.values(row.blocks || {}).reduce(
                  (sum, tenants) => sum + tenants.length,
                  0,
                )}{" "}
              tenants
            </p>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        customStyles={editorialTableStyles}
        columns={propertyColumns}
        data={groupedTenants}
        keyField="name"
        pagination
        highlightOnHover
        striped
        expandableRows
        expandableRowsComponent={({ data }) => (
          <PropertyExpandable data={data} />
        )}
      />

      <ModalSlider
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setPaymentTenant(null);
        }}
        title="Add Payment"
      >
        <PaymentForm
          initialTenantId={paymentTenant?.tenant_id || paymentTenant?.id}
          onSuccess={() => {
            setIsPaymentOpen(false);
            setPaymentTenant(null);
            onRefreshTenants?.();
          }}
        />
      </ModalSlider>

      <SendArrearEmailModal
        isOpen={!!emailTenant}
        onClose={() => setEmailTenant(null)}
        tenants={emailTenant ? [emailTenant] : []}
      />

      <SendDocumentModal
        isOpen={documentModal.open}
        onClose={() => setDocumentModal({ open: false, type: null, tenant: null })}
        docType={documentModal.type}
        tenants={documentModal.tenant ? [documentModal.tenant] : []}
      />
    </>
  );
};

export default TenantTable;
