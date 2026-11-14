
"use strict";

/* ==========================================
   FLAME IN FREEFALL
   SPACECRAFT MISSION CONTROL
========================================== */

const DATASET_PATH = "data/FLEX_100_records_clean.csv";
const PAGE_SIZE = 10;

let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
let charts = {};

/* ==========================================
   DOM HELPERS
========================================== */

const $ = (id) => document.getElementById(id);

function getValue(record, key) {
    const value = record[key];

    if (value === undefined || value === null || String(value).trim() === "") {
        return null;
    }

    return String(value).trim();
}

function getNumber(record, key) {
    const value = getValue(record, key);

    if (value === null) return null;

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
}

function displayValue(value) {
    return value === null || value === undefined || value === ""
        ? "N/A"
        : String(value);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

/* ==========================================
   CSV PARSER
========================================== */

function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let insideQuotes = false;

    text = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < text.length; i++) {
        const character = text[i];
        const next = text[i + 1];

        if (character === '"') {
            if (insideQuotes && next === '"') {
                cell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (character === "," && !insideQuotes) {
            row.push(cell);
            cell = "";
        } else if (
            (character === "\n" || character === "\r") &&
            !insideQuotes
        ) {
            if (character === "\r" && next === "\n") {
                i++;
            }

            row.push(cell);

            if (row.some(value => value.trim() !== "")) {
                rows.push(row);
            }

            row = [];
            cell = "";
        } else {
            cell += character;
        }
    }

    row.push(cell);

    if (row.some(value => value.trim() !== "")) {
        rows.push(row);
    }

    if (rows.length < 2) {
        return [];
    }

    const headers = rows[0].map(header => header.trim());

    return rows.slice(1).map(values => {
        const record = {};

        headers.forEach((header, index) => {
            record[header] = (values[index] || "").trim();
        });

        return record;
    });
}

/* ==========================================
   DATASET LOADING
========================================== */

async function loadDataset() {
    const table = $("records-table");

    try {
        const response = await fetch(DATASET_PATH);

        if (!response.ok) {
            throw new Error(
                `Dataset request failed: ${response.status}`
            );
        }

        const csvText = await response.text();

        allRecords = parseCSV(csvText);

        if (allRecords.length === 0) {
            throw new Error("The CSV file contains no usable records.");
        }

        filteredRecords = [...allRecords];

        updateTelemetry();
        populateFilters();
        renderTable();
        createCharts();

        $("result-count").textContent =
            `${allRecords.length} RECORDS LOADED`;

        console.log(
            "FLEX dataset loaded successfully:",
            allRecords.length,
            "records"
        );

    } catch (error) {
        console.error("Dataset loading error:", error);

        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="9">
                        Dataset could not be loaded.
                        Check that ${escapeHTML(DATASET_PATH)}
                        exists in the website's data folder.
                    </td>
                </tr>
            `;
        }

        $("result-count").textContent = "DATASET UNAVAILABLE";
    }
}

/* ==========================================
   TELEMETRY CARDS
========================================== */

function updateTelemetry() {
    $("total-records").textContent = allRecords.length;

    const fuels = new Set(
        allRecords
            .map(record => getValue(record, "Fuel"))
            .filter(Boolean)
    );

    $("fuel-count").textContent =
        String(fuels.size).padStart(2, "0");

    const qualityColumn = "Data Quality Review";

    const hasQualityData = allRecords.some(record =>
        getValue(record, qualityColumn) !== null
    );

    if (!hasQualityData) {
        $("quality-count").textContent = "N/A";
    } else {
        const reviewed = allRecords.filter(record =>
            getValue(record, qualityColumn) !== null
        ).length;

        $("quality-count").textContent =
            `${reviewed}/${allRecords.length}`;
    }
}

/* ==========================================
   FILTER OPTIONS
========================================== */

function populateSelect(selectId, values, defaultLabel) {
    const select = $(selectId);

    if (!select) return;

    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = defaultLabel;

    select.appendChild(defaultOption);

    const uniqueValues = [...new Set(values.filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    uniqueValues.forEach(value => {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = value;

        select.appendChild(option);
    });
}

function populateFilters() {
    populateSelect(
        "fuel-select",
        allRecords.map(record => getValue(record, "Fuel")),
        "ALL FUELS"
    );

    populateSelect(
        "outcome-select",
        allRecords.map(record => getValue(record, "Test End")),
        "ALL OUTCOMES"
    );
}

/* ==========================================
   FILTERING
========================================== */

function applyFilters() {
    const search = $("search-input").value.toLowerCase().trim();
    const selectedFuel = $("fuel-select").value;
    const selectedOutcome = $("outcome-select").value;

    filteredRecords = allRecords.filter(record => {
        const searchFields = [
            getValue(record, "Test #"),
            getValue(record, "FLEX Identifier"),
            getValue(record, "Fuel")
        ];

        const matchesSearch = !search || searchFields.some(value =>
            value && value.toLowerCase().includes(search)
        );

        const matchesFuel =
            !selectedFuel ||
            getValue(record, "Fuel") === selectedFuel;

        const matchesOutcome =
            !selectedOutcome ||
            getValue(record, "Test End") === selectedOutcome;

        return matchesSearch && matchesFuel && matchesOutcome;
    });

    currentPage = 1;

    renderTable();

    $("result-count").textContent =
        `${filteredRecords.length} MATCHING RECORDS`;
}

/* ==========================================
   EXPERIMENT TABLE
========================================== */

function renderTable() {
    const table = $("records-table");

    if (!table) return;

    table.innerHTML = "";

    const totalPages = Math.max(
        1,
        Math.ceil(filteredRecords.length / PAGE_SIZE)
    );

    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;

    const pageRecords = filteredRecords.slice(
        start,
        start + PAGE_SIZE
    );

    if (pageRecords.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="9">NO MATCHING EXPERIMENTS FOUND.</td>
            </tr>
        `;
    }

    pageRecords.forEach(record => {
        const row = document.createElement("tr");

        const values = [
            getValue(record, "Test #"),
            getValue(record, "FLEX Identifier"),
            getValue(record, "Fuel"),
            getValue(record, "Ambient Pressure (mmHg)"),
            getValue(record, "Droplet Initial Diameter (mm)"),
            getValue(record, "Burning Rate (mm/s)"),
            getValue(record, "Burn Time (s)"),
            getValue(record, "Test End")
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = displayValue(value);
            row.appendChild(cell);
        });

        const detailsCell = document.createElement("td");
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = "INSPECT";

        button.addEventListener("click", () => {
            showDetails(record);
        });

        detailsCell.appendChild(button);
        row.appendChild(detailsCell);

        table.appendChild(row);
    });

    $("page-info").textContent =
        `PAGE ${currentPage} / ${totalPages}`;

    $("prev-page").disabled = currentPage <= 1;
    $("next-page").disabled = currentPage >= totalPages;
}

/* ==========================================
   INDIVIDUAL EXPERIMENT DETAILS
========================================== */

function showDetails(record) {
    const panel = $("record-details");
    const content = $("details-content");

    content.innerHTML = "";

    Object.entries(record).forEach(([key, value]) => {
        const item = document.createElement("div");

        item.className = "detail-item";

        const heading = document.createElement("strong");
        heading.textContent = key;

        const paragraph = document.createElement("p");
        paragraph.textContent = displayValue(value);

        item.appendChild(heading);
        item.appendChild(paragraph);

        content.appendChild(item);
    });

    panel.hidden = false;

    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* ==========================================
   CHART CONFIGURATION
========================================== */

const chartColors = {
    cyan: "#45d9f5",
    blue: "#438bff",
    orange: "#ff9d55",
    green: "#4ce0ad",
    grid: "rgba(130, 153, 181, 0.12)",
    text: "#8299b5"
};

function chartOptions(xTitle, yTitle) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: chartColors.text,
                    font: {
                        family: "Inter",
                        size: 10
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: xTitle,
                    color: chartColors.text
                },
                ticks: {
                    color: chartColors.text,
                    maxTicksLimit: 10
                },
                grid: {
                    color: chartColors.grid
                }
            },
            y: {
                title: {
                    display: true,
                    text: yTitle,
                    color: chartColors.text
                },
                ticks: {
                    color: chartColors.text
                },
                grid: {
                    color: chartColors.grid
                }
            }
        }
    };
}

/* ==========================================
   SCIENTIFIC CHARTS
========================================== */

function createCharts() {
    if (typeof Chart === "undefined") {
        console.error("Chart.js did not load.");
        return;
    }

    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};

    // Chart 1: Burning rate by experiment

    const burningRecords = allRecords
        .map(record => ({
            test: getValue(record, "Test #"),
            rate: getNumber(record, "Burning Rate (mm/s)")
        }))
        .filter(item => item.rate !== null);

    charts.burning = new Chart($("burning-chart"), {
        type: "line",
        data: {
            labels: burningRecords.map(item => item.test),
            datasets: [{
                label: "Burning Rate",
                data: burningRecords.map(item => item.rate),
                borderColor: chartColors.cyan,
                backgroundColor: "rgba(69,217,245,0.12)",
                borderWidth: 2,
                pointRadius: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: chartOptions("Test Number", "Burning Rate (mm/s)")
    });

    // Chart 2: Burn time by fuel

    const fuelGroups = {};

    allRecords.forEach(record => {
        const fuel = getValue(record, "Fuel");
        const time = getNumber(record, "Burn Time (s)");

        if (!fuel || time === null) return;

        if (!fuelGroups[fuel]) {
            fuelGroups[fuel] = [];
        }

        fuelGroups[fuel].push(time);
    });

    const fuelLabels = Object.keys(fuelGroups);

    const fuelAverages = fuelLabels.map(fuel => {
        const values = fuelGroups[fuel];

        return values.reduce((sum, value) => sum + value, 0) /
            values.length;
    });

    charts.burntime = new Chart($("burntime-chart"), {
        type: "bar",
        data: {
            labels: fuelLabels,
            datasets: [{
                label: "Average Burn Time",
                data: fuelAverages,
                backgroundColor: [
                    chartColors.cyan,
                    chartColors.blue,
                    chartColors.orange
                ],
                borderRadius: 3
            }]
        },
        options: chartOptions("Fuel Type", "Average Burn Time (s)")
    });

    // Chart 3: Droplet diameter against burning rate

    const scatterRecords = allRecords
        .map(record => ({
            x: getNumber(record, "Droplet Initial Diameter (mm)"),
            y: getNumber(record, "Burning Rate (mm/s)")
        }))
        .filter(item => item.x !== null && item.y !== null);

    charts.diameter = new Chart($("diameter-chart"), {
        type: "scatter",
        data: {
            datasets: [{
                label: "Experimental Measurements",
                data: scatterRecords,
                backgroundColor: chartColors.cyan,
                borderColor: chartColors.cyan,
                pointRadius: 5
            }]
        },
        options: chartOptions(
            "Initial Droplet Diameter (mm)",
            "Burning Rate (mm/s)"
        )
    });
}

/* ==========================================
   CSV EXPORT
========================================== */

function exportCSV() {
    if (filteredRecords.length === 0) {
        alert("There are no records to export.");
        return;
    }

    const headers = Object.keys(filteredRecords[0]);

    const escapeCSV = value => {
        const text = value === null || value === undefined
            ? ""
            : String(value);

        return `"${text.replace(/"/g, '""')}"`;
    };

    const csvRows = [
        headers.map(escapeCSV).join(","),
        ...filteredRecords.map(record =>
            headers.map(header => escapeCSV(record[header])).join(",")
        )
    ];

    const blob = new Blob(
        ["\uFEFF" + csvRows.join("\r\n")],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "flame_in_freefall_experiments.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

/* ==========================================
   EVENT LISTENERS
========================================== */

function initializeEvents() {
    $("search-input").addEventListener("input", applyFilters);
    $("fuel-select").addEventListener("change", applyFilters);
    $("outcome-select").addEventListener("change", applyFilters);

    $("reset-search").addEventListener("click", () => {
        $("search-input").value = "";
        $("fuel-select").value = "";
        $("outcome-select").value = "";

        applyFilters();
    });

    $("export-csv").addEventListener("click", exportCSV);

    $("prev-page").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    $("next-page").addEventListener("click", () => {
        const totalPages = Math.ceil(
            filteredRecords.length / PAGE_SIZE
        );

        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    $("close-details").addEventListener("click", () => {
        $("record-details").hidden = true;
    });
}

/* ==========================================
   NAVIGATION HIGHLIGHT
========================================== */

function initializeNavigation() {
    const links = document.querySelectorAll(".nav-link");

    links.forEach(link => {
        link.addEventListener("click", () => {
            links.forEach(item => item.classList.remove("active"));
            link.classList.add("active");
        });
    });
}

/* ==========================================
   INITIALIZATION
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    initializeEvents();
    initializeNavigation();
    loadDataset();
});
