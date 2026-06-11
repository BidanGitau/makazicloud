import { Bar, Pie } from "react-chartjs-2";

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PIE_COLORS = [
  "#000000",
  "rgba(0,0,0,0.78)",
  "rgba(0,0,0,0.6)",
  "rgba(0,0,0,0.45)",
  "rgba(0,0,0,0.3)",
  "rgba(0,0,0,0.18)",
];

const tickFont = {
  family: "Inter, sans-serif",
  size: 10,
  weight: "600",
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
      align: "end",
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: false,
        padding: 14,
        color: "rgba(0,0,0,0.6)",
        font: tickFont,
      },
    },
    tooltip: {
      backgroundColor: "#000",
      padding: 12,
      titleFont: { family: "Inter, sans-serif", size: 11, weight: "700" },
      bodyFont: { family: "Inter, sans-serif", size: 11 },
      displayColors: true,
      borderColor: "rgba(255,255,255,0.1)",
      borderWidth: 0,
      cornerRadius: 0,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: "#f5f5f4" },
      ticks: { color: "rgba(0,0,0,0.45)", font: tickFont },
    },
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: { color: "rgba(0,0,0,0.45)", font: tickFont },
    },
  },
};

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: false,
        padding: 14,
        color: "rgba(0,0,0,0.6)",
        font: tickFont,
      },
    },
    tooltip: {
      backgroundColor: "#000",
      padding: 12,
      titleFont: { family: "Inter, sans-serif", size: 11, weight: "700" },
      bodyFont: { family: "Inter, sans-serif", size: 11 },
      cornerRadius: 0,
      borderWidth: 0,
    },
  },
};

export default function DashboardCharts({
  monthlyData,
  filteredOverview,
  selectedYear,
  selectedMonth,
}) {
  const selectedMonthName =
    selectedMonth !== "" ? monthLabels[Number(selectedMonth)] : null;
  const chartLabels = selectedMonthName ? [selectedMonthName] : monthLabels;
  const collectedData = selectedMonthName
    ? [monthlyData.collected[Number(selectedMonth)] || 0]
    : monthlyData.collected;
  const outstandingData = selectedMonthName
    ? [monthlyData.outstanding[Number(selectedMonth)] || 0]
    : monthlyData.outstanding;
  const rentChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Collected (KSh)",
        data: collectedData,
        backgroundColor: "#000000",
        borderRadius: 0,
        borderSkipped: false,
        barPercentage: 0.7,
        categoryPercentage: 0.7,
      },
      {
        label: "Outstanding (KSh)",
        data: outstandingData,
        backgroundColor: "rgba(0,0,0,0.18)",
        borderRadius: 0,
        borderSkipped: false,
        barPercentage: 0.7,
        categoryPercentage: 0.7,
      },
    ],
  };

  const pieRows = filteredOverview.filter(
    (i) => i && i.property_name && Number(i.occupancy_rate || 0) > 0,
  );
  const occupancyPie = {
    labels: pieRows.map((i) => i.property_name),
    datasets: [
      {
        data: pieRows.map((i) => Number(i.occupancy_rate || 0)),
        backgroundColor: PIE_COLORS,
        borderColor: "#fff",
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 gap-px bg-stone-200 lg:grid-cols-3">
      <div className="bg-white p-4 sm:p-5 lg:col-span-2">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="section-label">— Rent Collection —</p>
            <h3
              className="mt-2 text-lg font-black uppercase tracking-tight text-black sm:text-xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Collected vs outstanding.
            </h3>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
              {selectedMonthName
                ? `${selectedMonthName} · ${selectedYear}`
                : `By month · ${selectedYear}`}
            </p>
          </div>
        </div>
        <div className="h-[280px] w-full lg:h-[320px]">
          <Bar data={rentChartData} options={barOptions} />
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5">
        <div className="mb-5">
          <p className="section-label">— Occupancy —</p>
          <h3
            className="mt-2 text-lg font-black uppercase tracking-tight text-black sm:text-xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            By property.
          </h3>
        </div>
        <div className="h-[280px] w-full lg:h-[320px]">
          {pieRows.length ? (
            <Pie data={occupancyPie} options={pieOptions} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="section-label">— No occupied units yet —</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
