"use client";

import { useMemo, useCallback, useState } from "react";
import DataTable from "react-data-table-component";
import { ChevronDown } from "lucide-react";
import { compactEditorialTableStyles } from "@/app/_components/tableStyles";
import EllipsisMenu from "@/app/_components/ElpsisMenu";
import ModalSlider from "@/app/_components/ModalSlider";
import PaymentForm from "@/app/(private)/payments/PaymentForm";
import BillForm from "@/app/(private)/utility/BillForm";
import { showToast } from "@/app/_components/CustomToast";
import SendArrearEmailModal from "@/app/_components/SendArrearEmailModal";
import SendDocumentModal from "./SendDocumentModal";
import { getTenantHeaders } from "@/app/_lib/api/client";
import { Properties } from "@/app/_lib/repositories";

const getTenantId = (row) => row?.tenant_id || row?.id || "";
const getArrearsAmount = (row) =>
  Number(row?.overdueAmount ?? row?.arrears_balance ?? row?.arrears_amount ?? 0);

const TenantTable = ({
  tenants,
  billingMonth,
  onViewDetails,
  onShiftTenant,
  onDeleteTenant,
  onCancelLease,
  onRefreshTenants,
  canCreatePayments = false,
  canSendDocuments = false,
  canEditTenants = false,
  canDeleteTenants = false,
}) => {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTenant, setPaymentTenant] = useState(null);
  const [utilityTenant, setUtilityTenant] = useState(null);
  const [utilityProperties, setUtilityProperties] = useState([]);
  const [emailTenant, setEmailTenant] = useState(null);
  const [documentModal, setDocumentModal] = useState({ open: false, type: null, tenant: null });
  const [expandedProperties, setExpandedProperties] = useState(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());

  const openDocModal = useCallback((type, row) => {
    const tenantId = getTenantId(row);
    setDocumentModal({
      open: true,
      type,
      tenant: { tenant_id: tenantId, tenantName: row.full_name || row.tenant_name, tenantEmail: row.email || "" },
    });
  }, []);

  const openUtilityBill = useCallback(async (row) => {
    try {
      const properties = await Properties.getAll({
        select: "id,name,recurring_bills",
      });
      setUtilityProperties(properties || []);
      setUtilityTenant(row);
    } catch (error) {
      console.error("Failed to load utility properties:", error);
      showToast.error("Failed to prepare utility bill form.");
    }
  }, []);

  const documentUrl = useCallback(
    (tenantId, type) => {
      const params = new URLSearchParams();
      if (billingMonth) params.set("month", billingMonth);
      const query = params.toString();
      return `/documents/tenants/${tenantId}/${type}${query ? `?${query}` : ""}`;
    },
    [billingMonth],
  );

  const downloadDocument = useCallback(async (type, row) => {
    const tenantId = getTenantId(row);
    if (!tenantId) {
      showToast.error("Tenant id is missing.");
      return;
    }

    try {
      const response = await fetch(documentUrl(tenantId, type), {
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
  }, [documentUrl]);

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
          <div className="py-0.5">
            <p className="text-xs font-semibold text-black">{row.full_name}</p>
            <div>
              {row.email && (
                <p className="text-[11px] text-black/55">{row.email}</p>
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
            <div className="text-xs font-semibold text-black">
              #{formatUnitNumber(row.unit_number)}
            </div>
            <div className="text-[11px] text-black/55">{row.unit_type || "-"}</div>
            <div className="text-[10px] text-black/40">
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
        width: "120px",
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
        width: "110px",
      },
      {
        name: "Arrears",
        selector: (row) => getArrearsAmount(row),
        sortable: true,
        cell: (row) => {
          const amount = getArrearsAmount(row);

          return amount > 0 ? (
            <span className="font-mono font-semibold tabular-nums text-red-700">
              KSh {amount.toLocaleString()}
            </span>
          ) : (
            <span className="text-black/35">-</span>
          );
        },
        width: "110px",
      },
      {
        name: "Status",
        selector: (row) => row.status,
        sortable: true,
        cell: (row) => (
          <span
            className={`border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
              String(row.status || "").toLowerCase() === "active"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-stone-200 bg-stone-50 text-black/60"
            }`}
          >
            {row.status}
          </span>
        ),
        width: "100px",
      },
      {
        name: "Actions",
        cell: (row) => (
          <EllipsisMenu
            menuId={getTenantId(row) || row.full_name || "tenant"}
            items={[
              canCreatePayments && {
                label: "Update Payment",
                onClick: () => {
                  const tenantId = getTenantId(row);
                  if (!tenantId) {
                    showToast.error("Tenant id is missing.");
                    return;
                  }
                  setPaymentTenant({ ...row, tenant_id: tenantId });
                  setIsPaymentOpen(true);
                },
              },
              {
                label: "View Details",
                onClick: () => onViewDetails(row),
              },
              {
                label: "Add Utility Bill",
                onClick: () => openUtilityBill(row),
              },
              canEditTenants && {
                label: "Shift Tenant",
                onClick: () => onShiftTenant(row),
              },
              canSendDocuments && {
                label: "Send Invoice",
                onClick: () => openDocModal("invoice", row),
              },
              canSendDocuments && {
                label: "Download Invoice",
                onClick: () => downloadDocument("invoice", row),
              },
              canSendDocuments && {
                label: "Send Statement",
                onClick: () => openDocModal("statement", row),
              },
              canSendDocuments && {
                label: "Download Statement",
                onClick: () => downloadDocument("statement", row),
              },
              canSendDocuments && {
                label: "Send Arrears Email",
                onClick: () => setEmailTenant({ tenant_id: getTenantId(row), tenantName: row.full_name || row.tenant_name, tenantEmail: row.email }),
              },


              canEditTenants &&
                String(row.status || "").toLowerCase() !== "inactive" && {
                  label: "Cancel Lease",
                  onClick: () => onCancelLease(row),
                  destructive: true,
                },
              canDeleteTenants && {
                label: "Delete",
                onClick: () => onDeleteTenant(getTenantId(row)),
                destructive: true,
              },
            ].filter(Boolean)}
          />
        ),
        width: "64px",
      },
    ],
    [
      onViewDetails,
      onShiftTenant,
      onDeleteTenant,
      onCancelLease,
      canCreatePayments,
      canSendDocuments,
      canEditTenants,
      canDeleteTenants,
      downloadDocument,
      formatUnitNumber,
      openDocModal,
      openUtilityBill,
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

  return (
    <>
      <div className="space-y-1">
        {groupedTenants.map((property) => {
          const blockEntries = Object.entries(property.blocks || {});
          const directTenants = property.tenants || [];
          const tenantCount =
            directTenants.length +
            blockEntries.reduce((sum, [, blockTenants]) => sum + blockTenants.length, 0);
          const activeCount = [
            ...directTenants,
            ...blockEntries.flatMap(([, blockTenants]) => blockTenants),
          ].filter((tenant) => String(tenant.status || "").toLowerCase() === "active").length;
          const propertyOpen = expandedProperties.has(property.name);

          return (
            <section key={property.name} className="border border-stone-200 bg-white">
              <button
                type="button"
                onClick={() => toggleSetItem(setExpandedProperties, property.name)}
                className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-4"
                aria-expanded={propertyOpen}
              >
                <div className="flex items-center gap-2 bg-white px-2 py-1.5 sm:col-span-2">
                  <ChevronDown
                    className={`h-3 w-3 text-black/55 transition-transform ${
                      propertyOpen ? "rotate-0" : "-rotate-90"
                    }`}
                    strokeWidth={2}
                  />
                  <p className="min-w-0 flex-1 truncate text-xs font-black text-black">
                    {property.name}
                  </p>
                </div>
                <div className="bg-white px-2 py-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                    Tenants
                  </p>
                  <p className="text-xs font-black tabular-nums text-black">{tenantCount}</p>
                </div>
                <div className="bg-white px-2 py-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                    Active
                  </p>
                  <p className="text-xs font-black tabular-nums text-green-700">{activeCount}</p>
                </div>
              </button>

              {propertyOpen && (
                <div className="space-y-1 bg-stone-50 p-1.5">
                  {blockEntries.map(([blockName, blockTenants]) => {
                    const blockKey = `${property.name}::${blockName}`;
                    const blockOpen = expandedBlocks.has(blockKey);
                    return (
                      <div key={blockKey} className="border border-stone-200 bg-white">
                        <button
                          type="button"
                          onClick={() => toggleSetItem(setExpandedBlocks, blockKey)}
                          className="flex w-full items-center justify-between border-b border-stone-200 px-2 py-1.5 text-left transition-colors hover:bg-stone-50"
                          aria-expanded={blockOpen}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <ChevronDown
                              className={`h-3 w-3 text-black/55 transition-transform ${
                                blockOpen ? "rotate-0" : "-rotate-90"
                              }`}
                              strokeWidth={2}
                            />
                            <p className="truncate text-xs font-semibold text-black">
                              {blockName === "_no_block" ? "No Block" : blockName}
                            </p>
                          </div>
                          <span className="text-[11px] text-black/55">
                            {blockTenants.length} tenant{blockTenants.length === 1 ? "" : "s"}
                          </span>
                        </button>
                        {blockOpen && (
                          <TenantRows columns={tenantColumns} rows={blockTenants} />
                        )}
                      </div>
                    );
                  })}

                  {directTenants.length > 0 && (
                    <div className="border border-stone-200 bg-white">
                      <div className="border-b border-stone-200 px-2 py-1.5">
                        <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                          Direct Tenants
                        </p>
                      </div>
                      <TenantRows columns={tenantColumns} rows={directTenants} />
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <ModalSlider
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setPaymentTenant(null);
        }}
        title="Update Payment"
      >
        <PaymentForm
          key={getTenantId(paymentTenant) || "new-payment"}
          initialTenantId={getTenantId(paymentTenant)}
          initialTenant={paymentTenant}
          onSuccess={() => {
            setIsPaymentOpen(false);
            setPaymentTenant(null);
            onRefreshTenants?.({ silent: true });
          }}
        />
      </ModalSlider>

      <ModalSlider
        isOpen={!!utilityTenant}
        onClose={() => setUtilityTenant(null)}
        title="Add Utility Bill"
      >
        <BillForm
          properties={utilityProperties}
          initialValues={{
            property_id: utilityTenant?.property_id || "",
            block_id: utilityTenant?.block_id || "",
            unit_id:
              utilityTenant?.unit_id && typeof utilityTenant.unit_id === "object"
                ? utilityTenant.unit_id.id
                : utilityTenant?.unit_id || "",
            recurring_auto_assign: false,
          }}
          onSuccess={() => {
            setUtilityTenant(null);
            showToast.success("Utility bill added.");
          }}
        />
      </ModalSlider>

      {canSendDocuments && (
        <SendArrearEmailModal
          isOpen={!!emailTenant}
          onClose={() => setEmailTenant(null)}
          tenants={emailTenant ? [emailTenant] : []}
        />
      )}

      {canSendDocuments && (
        <SendDocumentModal
          isOpen={documentModal.open}
          onClose={() => setDocumentModal({ open: false, type: null, tenant: null })}
          docType={documentModal.type}
          tenants={documentModal.tenant ? [documentModal.tenant] : []}
          billingMonth={billingMonth}
        />
      )}
    </>
  );
};

function TenantRows({ columns, rows }) {
  return (
    <DataTable
      customStyles={compactEditorialTableStyles}
      columns={columns}
      data={rows}
      keyField="tenant_id"
      noHeader
      dense
      striped
      highlightOnHover
      responsive
    />
  );
}

function toggleSetItem(setter, item) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  });
}

export default TenantTable;
