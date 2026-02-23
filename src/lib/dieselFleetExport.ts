import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatCurrency, formatNumber } from "./formatters";

export interface DieselExportRecord {
  id: string;
  date: string;
  fleet_number: string;
  driver_name?: string;
  fuel_station?: string;
  litres_filled?: number;
  cost_per_litre?: number;
  total_cost?: number;
  currency?: string;
  km_reading?: number;
  previous_km_reading?: number;
  distance_travelled?: number;
  km_per_litre?: number;
  trip_id?: string;
  debrief_signed?: boolean;
  debrief_signed_by?: string;
  debrief_date?: string;
  notes?: string;
}

export interface FleetExportOptions {
  fleetNumber: string;
  records: DieselExportRecord[];
  dateRange?: { from: string; to: string };
  includeDebriefInfo?: boolean;
}

/**
 * Generate a PDF report for diesel consumption of a specific fleet
 */
export const generateFleetDieselPDF = (options: FleetExportOptions) => {
  const { fleetNumber, records, dateRange, includeDebriefInfo = false } = options;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Filter records for the fleet
  const fleetRecords = records.filter(r => r.fleet_number === fleetNumber);

  if (fleetRecords.length === 0) {
    doc.setFontSize(14);
    doc.text(`No diesel records found for fleet ${fleetNumber}`, pageWidth / 2, 50, { align: "center" });
    doc.save(`diesel-report-${fleetNumber}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    return;
  }

  // Calculate summary statistics
  const totalLitres = fleetRecords.reduce((sum, r) => sum + (r.litres_filled || 0), 0);
  const totalCostZAR = fleetRecords
    .filter(r => (r.currency || 'ZAR') === 'ZAR')
    .reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalCostUSD = fleetRecords
    .filter(r => r.currency === 'USD')
    .reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalDistance = fleetRecords.reduce((sum, r) => sum + (r.distance_travelled || 0), 0);
  const avgKmPerLitre = totalLitres > 0 ? totalDistance / totalLitres : 0;

  // Get unique drivers
  const drivers = [...new Set(fleetRecords.map(r => r.driver_name).filter(Boolean))];

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("DIESEL CONSUMPTION REPORT", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(14);
  doc.text(`Fleet: ${fleetNumber}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  if (dateRange) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Period: ${format(new Date(dateRange.from), "MMM dd, yyyy")} - ${format(new Date(dateRange.to), "MMM dd, yyyy")}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 6;
  }

  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, pageWidth / 2, yPos, { align: "center" });
  doc.setTextColor(0, 0, 0);
  yPos += 15;

  // Summary Box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 40, 3, 3, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  // Row 1
  const row1Y = yPos + 10;
  doc.text("Total Records:", margin + 5, row1Y);
  doc.setFont("helvetica", "normal");
  doc.text(String(fleetRecords.length), margin + 45, row1Y);

  doc.setFont("helvetica", "bold");
  doc.text("Total Litres:", margin + 70, row1Y);
  doc.setFont("helvetica", "normal");
  doc.text(`${formatNumber(totalLitres)} L`, margin + 105, row1Y);

  doc.setFont("helvetica", "bold");
  doc.text("Total Distance:", margin + 140, row1Y);
  doc.setFont("helvetica", "normal");
  doc.text(`${formatNumber(totalDistance)} km`, margin + 175, row1Y);

  // Row 2
  const row2Y = yPos + 22;
  doc.setFont("helvetica", "bold");
  doc.text("Total Cost:", margin + 5, row2Y);
  doc.setFont("helvetica", "normal");
  let costText = formatCurrency(totalCostZAR, 'ZAR');
  if (totalCostUSD > 0) {
    costText += ` + ${formatCurrency(totalCostUSD, 'USD')}`;
  }
  doc.text(costText, margin + 40, row2Y);

  doc.setFont("helvetica", "bold");
  doc.text("Avg km/L:", margin + 105, row2Y);
  doc.setFont("helvetica", "normal");
  doc.text(formatNumber(avgKmPerLitre, 2), margin + 135, row2Y);

  // Row 3
  const row3Y = yPos + 34;
  doc.setFont("helvetica", "bold");
  doc.text("Drivers:", margin + 5, row3Y);
  doc.setFont("helvetica", "normal");
  const driverText = drivers.length > 3
    ? drivers.slice(0, 3).join(", ") + ` +${drivers.length - 3} more`
    : drivers.join(", ") || "N/A";
  doc.text(driverText, margin + 30, row3Y);

  yPos += 50;

  // Table Data
  const tableData = fleetRecords
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(record => {
      const row = [
        format(new Date(record.date), "MMM dd, yyyy"),
        record.driver_name || "N/A",
        record.fuel_station || "N/A",
        `${formatNumber(record.litres_filled || 0)} L`,
        record.cost_per_litre ? formatCurrency(record.cost_per_litre, (record.currency || 'ZAR') as 'ZAR' | 'USD') : "N/A",
        formatCurrency(record.total_cost || 0, (record.currency || 'ZAR') as 'ZAR' | 'USD'),
        record.distance_travelled ? `${formatNumber(record.distance_travelled)} km` : "N/A",
        record.km_per_litre ? formatNumber(record.km_per_litre, 2) : "N/A",
      ];

      if (includeDebriefInfo) {
        row.push(record.debrief_signed ? "Yes" : "No");
      }

      return row;
    });

  const tableHeaders = [
    "Date",
    "Driver",
    "Station",
    "Litres",
    "Cost/L",
    "Total Cost",
    "Distance",
    "km/L",
  ];

  if (includeDebriefInfo) {
    tableHeaders.push("Debriefed");
  }

  // Add table using autoTable
  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 22 }, // Date
      1: { cellWidth: 25 }, // Driver
      2: { cellWidth: 28 }, // Station
      3: { cellWidth: 18, halign: 'right' }, // Litres
      4: { cellWidth: 18, halign: 'right' }, // Cost/L
      5: { cellWidth: 22, halign: 'right' }, // Total Cost
      6: { cellWidth: 22, halign: 'right' }, // Distance
      7: { cellWidth: 15, halign: 'right' }, // km/L
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // Footer on each page
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Fleet ${fleetNumber} Diesel Report | Page ${doc.getNumberOfPages()} | Generated: ${format(new Date(), "MMM dd, yyyy")}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.setTextColor(0, 0, 0);
    },
  });

  // Save the PDF
  const fileName = `diesel-report-${fleetNumber}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};

/**
 * Generate an Excel file for diesel consumption of a specific fleet
 */
export const generateFleetDieselExcel = (options: FleetExportOptions) => {
  const { fleetNumber, records, dateRange, includeDebriefInfo = false } = options;

  // Filter records for the fleet
  const fleetRecords = records.filter(r => r.fleet_number === fleetNumber);

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Calculate summary statistics
  const totalLitres = fleetRecords.reduce((sum, r) => sum + (r.litres_filled || 0), 0);
  const totalCostZAR = fleetRecords
    .filter(r => (r.currency || 'ZAR') === 'ZAR')
    .reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalCostUSD = fleetRecords
    .filter(r => r.currency === 'USD')
    .reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalDistance = fleetRecords.reduce((sum, r) => sum + (r.distance_travelled || 0), 0);
  const avgKmPerLitre = totalLitres > 0 ? totalDistance / totalLitres : 0;
  const drivers = [...new Set(fleetRecords.map(r => r.driver_name).filter(Boolean))];

  // Summary Sheet
  const summaryData = [
    ['DIESEL CONSUMPTION REPORT'],
    [''],
    ['Fleet Number', fleetNumber],
    ['Report Generated', format(new Date(), "MMM dd, yyyy HH:mm")],
    dateRange ? ['Period', `${format(new Date(dateRange.from), "MMM dd, yyyy")} - ${format(new Date(dateRange.to), "MMM dd, yyyy")}`] : ['Period', 'All Time'],
    [''],
    ['SUMMARY'],
    ['Total Records', fleetRecords.length],
    ['Total Litres', totalLitres.toFixed(2)],
    ['Total Cost (ZAR)', totalCostZAR.toFixed(2)],
    ['Total Cost (USD)', totalCostUSD.toFixed(2)],
    ['Total Distance (km)', totalDistance.toFixed(2)],
    ['Average km/L', avgKmPerLitre.toFixed(2)],
    [''],
    ['DRIVERS'],
    ...drivers.map((d, i) => [i + 1, d]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }];

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Transactions Sheet
  const headers = [
    'Date',
    'Driver',
    'Fuel Station',
    'Litres Filled',
    'Cost per Litre',
    'Total Cost',
    'Currency',
    'KM Reading',
    'Previous KM',
    'Distance (km)',
    'km/L',
    'Trip ID',
    'Notes',
  ];

  if (includeDebriefInfo) {
    headers.push('Debriefed', 'Debriefed By', 'Debrief Date');
  }

  const transactionData = [
    headers,
    ...fleetRecords
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(record => {
        const row: (string | number | undefined)[] = [
          format(new Date(record.date), "yyyy-MM-dd"),
          record.driver_name || '',
          record.fuel_station || '',
          record.litres_filled?.toFixed(2) || '',
          record.cost_per_litre?.toFixed(2) || '',
          record.total_cost?.toFixed(2) || '',
          record.currency || 'ZAR',
          record.km_reading || '',
          record.previous_km_reading || '',
          record.distance_travelled || '',
          record.km_per_litre?.toFixed(2) || '',
          record.trip_id || '',
          record.notes || '',
        ];

        if (includeDebriefInfo) {
          row.push(
            record.debrief_signed ? 'Yes' : 'No',
            record.debrief_signed_by || '',
            record.debrief_date || ''
          );
        }

        return row;
      }),
    // Totals row
    [
      'TOTALS',
      '',
      '',
      totalLitres.toFixed(2),
      '',
      (totalCostZAR + totalCostUSD).toFixed(2),
      '',
      '',
      '',
      totalDistance.toFixed(2),
      avgKmPerLitre.toFixed(2),
      '',
      '',
    ],
  ];

  const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);

  // Set column widths
  transactionSheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 20 }, // Driver
    { wch: 25 }, // Station
    { wch: 12 }, // Litres
    { wch: 12 }, // Cost/L
    { wch: 12 }, // Total
    { wch: 8 },  // Currency
    { wch: 10 }, // KM Reading
    { wch: 10 }, // Prev KM
    { wch: 12 }, // Distance
    { wch: 8 },  // km/L
    { wch: 20 }, // Trip ID
    { wch: 30 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, transactionSheet, 'Transactions');

  // Driver Summary Sheet
  const driverSummary = new Map<string, {
    litres: number;
    costZAR: number;
    costUSD: number;
    distance: number;
    fills: number;
  }>();

  fleetRecords.forEach(record => {
    const driver = record.driver_name || 'Unknown';
    const existing = driverSummary.get(driver) || {
      litres: 0,
      costZAR: 0,
      costUSD: 0,
      distance: 0,
      fills: 0,
    };

    existing.litres += record.litres_filled || 0;
    existing.costZAR += (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0;
    existing.costUSD += record.currency === 'USD' ? (record.total_cost || 0) : 0;
    existing.distance += record.distance_travelled || 0;
    existing.fills += 1;

    driverSummary.set(driver, existing);
  });

  const driverData = [
    ['Driver', 'Total Litres', 'Total Cost (ZAR)', 'Total Cost (USD)', 'Total Distance (km)', 'Avg km/L', 'Fill Count'],
    ...Array.from(driverSummary.entries()).map(([driver, stats]) => [
      driver,
      stats.litres.toFixed(2),
      stats.costZAR.toFixed(2),
      stats.costUSD.toFixed(2),
      stats.distance.toFixed(2),
      stats.litres > 0 ? (stats.distance / stats.litres).toFixed(2) : '0.00',
      stats.fills,
    ]),
  ];

  const driverSheet = XLSX.utils.aoa_to_sheet(driverData);
  driverSheet['!cols'] = [
    { wch: 25 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, driverSheet, 'By Driver');

  // Generate and download
  const fileName = `diesel-report-${fleetNumber}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Generate a combined PDF report for all fleets (or selected fleets)
 */
export const generateAllFleetsDieselPDF = (
  records: DieselExportRecord[],
  fleetNumbers?: string[],
  dateRange?: { from: string; to: string }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Get unique fleets
  const allFleets = [...new Set(records.map(r => r.fleet_number))].sort();
  const fleetsToExport = fleetNumbers || allFleets;

  // Calculate overall totals
  const filteredRecords = records.filter(r => fleetsToExport.includes(r.fleet_number));
  const totalLitres = filteredRecords.reduce((sum, r) => sum + (r.litres_filled || 0), 0);
  const totalCostZAR = filteredRecords
    .filter(r => (r.currency || 'ZAR') === 'ZAR')
    .reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalCostUSD = filteredRecords
    .filter(r => r.currency === 'USD')
    .reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalDistance = filteredRecords.reduce((sum, r) => sum + (r.distance_travelled || 0), 0);

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("FLEET DIESEL CONSUMPTION SUMMARY", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  if (dateRange) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Period: ${format(new Date(dateRange.from), "MMM dd, yyyy")} - ${format(new Date(dateRange.to), "MMM dd, yyyy")}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 6;
  }

  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, pageWidth / 2, yPos, { align: "center" });
  doc.setTextColor(0, 0, 0);
  yPos += 12;

  // Overall Summary Box
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);

  const summaryY = yPos + 10;
  doc.text(`Fleets: ${fleetsToExport.length}`, margin + 10, summaryY);
  doc.text(`Records: ${filteredRecords.length}`, margin + 50, summaryY);
  doc.text(`Litres: ${formatNumber(totalLitres)}`, margin + 95, summaryY);
  doc.text(`Cost: ${formatCurrency(totalCostZAR + totalCostUSD, 'ZAR')}`, margin + 140, summaryY);

  doc.setTextColor(0, 0, 0);
  yPos += 35;

  // Fleet comparison table
  const fleetData = fleetsToExport.map(fleet => {
    const fleetRecords = filteredRecords.filter(r => r.fleet_number === fleet);
    const litres = fleetRecords.reduce((sum, r) => sum + (r.litres_filled || 0), 0);
    const costZAR = fleetRecords
      .filter(r => (r.currency || 'ZAR') === 'ZAR')
      .reduce((sum, r) => sum + (r.total_cost || 0), 0);
    const costUSD = fleetRecords
      .filter(r => r.currency === 'USD')
      .reduce((sum, r) => sum + (r.total_cost || 0), 0);
    const distance = fleetRecords.reduce((sum, r) => sum + (r.distance_travelled || 0), 0);
    const avgKmL = litres > 0 ? distance / litres : 0;
    const drivers = [...new Set(fleetRecords.map(r => r.driver_name).filter(Boolean))];

    return [
      fleet,
      formatNumber(litres) + ' L',
      formatCurrency(costZAR, 'ZAR'),
      costUSD > 0 ? formatCurrency(costUSD, 'USD') : '-',
      formatNumber(distance) + ' km',
      formatNumber(avgKmL, 2),
      String(fleetRecords.length),
      String(drivers.length),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Fleet', 'Litres', 'Cost (ZAR)', 'Cost (USD)', 'Distance', 'Avg km/L', 'Records', 'Drivers']],
    body: fleetData,
    foot: [[
      'TOTAL',
      formatNumber(totalLitres) + ' L',
      formatCurrency(totalCostZAR, 'ZAR'),
      totalCostUSD > 0 ? formatCurrency(totalCostUSD, 'USD') : '-',
      formatNumber(totalDistance) + ' km',
      totalLitres > 0 ? formatNumber(totalDistance / totalLitres, 2) : '-',
      String(filteredRecords.length),
      '-',
    ]],
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Fleet Diesel Summary | Page ${doc.getNumberOfPages()} | Generated: ${format(new Date(), "MMM dd, yyyy")}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.setTextColor(0, 0, 0);
    },
  });

  // Save
  const fileName = `diesel-all-fleets-summary-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};

/**
 * Generate a combined Excel file for all fleets (or selected fleets)
 */
export const generateAllFleetsDieselExcel = (
  records: DieselExportRecord[],
  fleetNumbers?: string[],
  dateRange?: { from: string; to: string }
) => {
  const wb = XLSX.utils.book_new();

  // Get unique fleets
  const allFleets = [...new Set(records.map(r => r.fleet_number))].sort();
  const fleetsToExport = fleetNumbers || allFleets;

  const filteredRecords = records.filter(r => fleetsToExport.includes(r.fleet_number));

  // Calculate overall totals
  const totalLitres = filteredRecords.reduce((sum, r) => sum + (r.litres_filled || 0), 0);
  const totalCostZAR = filteredRecords
    .filter(r => (r.currency || 'ZAR') === 'ZAR')
    .reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalCostUSD = filteredRecords
    .filter(r => r.currency === 'USD')
    .reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalDistance = filteredRecords.reduce((sum, r) => sum + (r.distance_travelled || 0), 0);

  // Summary Sheet
  const summaryData = [
    ['FLEET DIESEL CONSUMPTION SUMMARY'],
    [''],
    ['Report Generated', format(new Date(), "MMM dd, yyyy HH:mm")],
    dateRange ? ['Period', `${format(new Date(dateRange.from), "MMM dd, yyyy")} - ${format(new Date(dateRange.to), "MMM dd, yyyy")}`] : ['Period', 'All Time'],
    [''],
    ['OVERALL TOTALS'],
    ['Total Fleets', fleetsToExport.length],
    ['Total Records', filteredRecords.length],
    ['Total Litres', totalLitres.toFixed(2)],
    ['Total Cost (ZAR)', totalCostZAR.toFixed(2)],
    ['Total Cost (USD)', totalCostUSD.toFixed(2)],
    ['Total Distance (km)', totalDistance.toFixed(2)],
    ['Average km/L', totalLitres > 0 ? (totalDistance / totalLitres).toFixed(2) : '0.00'],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Fleet Comparison Sheet
  const fleetComparisonData = [
    ['Fleet', 'Total Litres', 'Cost (ZAR)', 'Cost (USD)', 'Distance (km)', 'Avg km/L', 'Records', 'Drivers'],
    ...fleetsToExport.map(fleet => {
      const fleetRecords = filteredRecords.filter(r => r.fleet_number === fleet);
      const litres = fleetRecords.reduce((sum, r) => sum + (r.litres_filled || 0), 0);
      const costZAR = fleetRecords
        .filter(r => (r.currency || 'ZAR') === 'ZAR')
        .reduce((sum, r) => sum + (r.total_cost || 0), 0);
      const costUSD = fleetRecords
        .filter(r => r.currency === 'USD')
        .reduce((sum, r) => sum + (r.total_cost || 0), 0);
      const distance = fleetRecords.reduce((sum, r) => sum + (r.distance_travelled || 0), 0);
      const drivers = [...new Set(fleetRecords.map(r => r.driver_name).filter(Boolean))];

      return [
        fleet,
        litres.toFixed(2),
        costZAR.toFixed(2),
        costUSD.toFixed(2),
        distance.toFixed(2),
        litres > 0 ? (distance / litres).toFixed(2) : '0.00',
        fleetRecords.length,
        drivers.length,
      ];
    }),
    // Totals row
    [
      'TOTAL',
      totalLitres.toFixed(2),
      totalCostZAR.toFixed(2),
      totalCostUSD.toFixed(2),
      totalDistance.toFixed(2),
      totalLitres > 0 ? (totalDistance / totalLitres).toFixed(2) : '0.00',
      filteredRecords.length,
      '',
    ],
  ];

  const fleetSheet = XLSX.utils.aoa_to_sheet(fleetComparisonData);
  fleetSheet['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, fleetSheet, 'Fleet Comparison');

  // All Transactions Sheet
  const transactionHeaders = [
    'Date',
    'Fleet',
    'Driver',
    'Fuel Station',
    'Litres',
    'Cost/L',
    'Total Cost',
    'Currency',
    'Distance',
    'km/L',
  ];

  const transactionData = [
    transactionHeaders,
    ...filteredRecords
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(record => [
        format(new Date(record.date), "yyyy-MM-dd"),
        record.fleet_number,
        record.driver_name || '',
        record.fuel_station || '',
        record.litres_filled?.toFixed(2) || '',
        record.cost_per_litre?.toFixed(2) || '',
        record.total_cost?.toFixed(2) || '',
        record.currency || 'ZAR',
        record.distance_travelled || '',
        record.km_per_litre?.toFixed(2) || '',
      ]),
  ];

  const allTransactionsSheet = XLSX.utils.aoa_to_sheet(transactionData);
  allTransactionsSheet['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 25 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, allTransactionsSheet, 'All Transactions');

  // Generate and download
  const fileName = `diesel-all-fleets-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};