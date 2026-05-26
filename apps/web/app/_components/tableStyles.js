


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
