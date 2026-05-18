/**
 * Shared editorial styles for every react-data-table-component table in the
 * app. Import as:
 *
 *   import { editorialTableStyles } from "@/app/_components/tableStyles";
 *   <DataTable customStyles={editorialTableStyles} ... />
 *
 * Conventions that go with this style (apply at the column level):
 *   - Right-aligned numeric columns:   `right: true`
 *   - Centered columns (status, ⋮):    `center: true`
 *   - Custom `cell` wrappers should use `w-full` + Tailwind alignment so the
 *     inner content stretches to fill the cell.
 *   - Use `tabular-nums` on money/number text so columns of digits line up.
 */
// Tables typically live inside a layout container (flex/overflow rules) — the
// border lives on the responsive wrapper so it always hugs the table itself,
// not whatever wrapper the page chose. Pages should NOT add their own
// `border` around the DataTable — that would double up.
const INTER =
  "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

export const editorialTableStyles = {
  table: {
    style: {
      fontFamily: INTER,
      backgroundColor: "#ffffff",
    },
  },
  responsiveWrapper: {
    style: {
      border: "1px solid #e7e5e4",
      backgroundColor: "#ffffff",
    },
  },
  headRow: {
    style: {
      backgroundColor: "#fafaf9",
      borderBottom: "1px solid #e7e5e4",
      minHeight: "44px",
    },
  },
  headCells: {
    style: {
      fontFamily: INTER,
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "rgba(0,0,0,0.55)",
      paddingLeft: "16px",
      paddingRight: "16px",
    },
  },
  cells: {
    style: {
      fontFamily: INTER,
      fontSize: "13px",
      color: "#171717",
      paddingLeft: "16px",
      paddingRight: "16px",
    },
  },
  rows: {
    style: {
      minHeight: "48px",
      borderBottomColor: "#e7e5e4",
    },
    stripedStyle: {
      backgroundColor: "#fafaf9",
    },
    highlightOnHoverStyle: {
      backgroundColor: "#f5f5f4",
      borderBottomColor: "#e7e5e4",
      outline: "none",
    },
  },
  pagination: {
    style: {
      fontFamily: INTER,
      borderTop: "1px solid #e7e5e4",
      backgroundColor: "#fafaf9",
      fontSize: "12px",
      color: "rgba(0,0,0,0.65)",
    },
  },
  expanderRow: {
    style: {
      backgroundColor: "#fafaf9",
      borderTop: "1px solid #e7e5e4",
      borderBottom: "1px solid #e7e5e4",
    },
  },
  noData: {
    style: {
      fontFamily: INTER,
      padding: "32px",
      color: "rgba(0,0,0,0.55)",
      backgroundColor: "#ffffff",
    },
  },
  progress: {
    style: {
      fontFamily: INTER,
      backgroundColor: "#ffffff",
    },
  },
};
