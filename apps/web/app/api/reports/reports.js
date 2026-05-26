import { createCRUD } from "../../_lib/crud";


export const PropertyStatement = {


  async getStatement({ propertyId, startDate, endDate } = {}) {
    const filters = [];

    if (startDate) {
      filters.push({
        column: "reported_date",
        operator: ">=",
        value: startDate,
      });
    }

    if (endDate) {
      filters.push({
        column: "reported_date",
        operator: "<=",
        value: endDate,
      });
    }

    return await createCRUD("v_property_statement").getAll({
      match: propertyId ? { property_id: propertyId } : undefined,
      filter: filters.length ? filters : undefined,
      order: { column: "tenant_name", ascending: true },
    });
  },


  async getSummary({ propertyId, startDate, endDate }) {
    const rows = await this.getStatement({ propertyId, startDate, endDate });
    return rows.reduce(
      (acc, row) => {
        acc.totalIncome += Number(row.total_income || 0);
        acc.totalExpenses += Number(row.total_expenses || 0);
        acc.netProfit += Number(row.net_profit || 0);
        return acc;
      },
      {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
      },
    );
  },
};


export const PropertyStatementTenants = {


  async getStatement({ propertyId, startDate, endDate } = {}) {
    const filters = [];

    if (startDate) {
      filters.push({
        column: "period_month",
        operator: ">=",
        value: startDate,
      });
    }

    if (endDate) {
      filters.push({
        column: "period_month",
        operator: "<=",
        value: endDate,
      });
    }

    const queryOptions = {
      match: propertyId ? { property_id: propertyId } : undefined,
      filter: filters.length ? filters : undefined,
    };

    try {
      return await createCRUD("v_property_statement_tenants").getAll(
        queryOptions,
      );
    } catch (error) {
      console.warn(
        "v_property_statement_tenants unavailable, falling back to v_tenant_payment_overview:",
        error?.message || error,
      );
      return await createCRUD("v_tenant_payment_overview").getAll(queryOptions);
    }
  },


  async getSummary({ propertyId, startDate, endDate } = {}) {
    const data = await createCRUD("v_property_statement_summary").getAll({
      match: propertyId ? { property_id: propertyId } : {},
    });

    return (data || []).reduce(
      (acc, row) => {
        acc.totalRent          += Number(row.rent_collected       || row.total_rent_collected       || 0);
        acc.totalArrears       += Number(row.arrears_paid         || row.total_arrears_paid         || 0);
        acc.totalUtilities     += Number(row.utilities_paid       || row.total_utilities_paid       || 0);
        acc.totalUtilitiesBilled += Number(row.utilities_billed   || row.total_utilities_billed     || 0);
        acc.totalCollected     += Number(row.total_collected                                        || 0);
        return acc;
      },
      { totalRent: 0, totalArrears: 0, totalUtilities: 0, totalUtilitiesBilled: 0, totalCollected: 0 },
    );
  },
};
