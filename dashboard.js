// ============================================================
// Wave Glider Telemetry Dashboard
// ============================================================

let dashboard = null;

let map = null;
let trackLayer = null;
let vehicleMarker = null;

let currentParameter = null;


// ============================================================
// Load dashboard JSON
// ============================================================

async function loadDashboard() {

    try {

        // Cache-busting is useful later when MATLAB updates the file
        const response = await fetch(
            "data/dashboard.json?t=" + Date.now()
        );

        if (!response.ok) {
            throw new Error(
                `HTTP error ${response.status}`
            );
        }

        dashboard = await response.json();

        initializeDashboard();

    } catch (error) {

        console.error("Could not load dashboard:", error);

        document.getElementById("dashboard-title").textContent =
            "Error loading dashboard";

    }
}


// ============================================================
// Initialize dashboard
// ============================================================

function initializeDashboard() {

    document.getElementById("dashboard-title").textContent =
        dashboard.metadata.vehicle + " Telemetry";

    document.getElementById("deployment-info").textContent =
        "Data generated: " +
        formatDate(dashboard.metadata.generated);


    initializeParameterSelector();

    initializeMap();

    initializeTimeSeries();

}


// ============================================================
// Parameter selector
// ============================================================

function initializeParameterSelector() {

    const select =
        document.getElementById("parameter-select");

    select.innerHTML = "";

    const parameters =
        dashboard.parameters;

    for (const key in parameters) {

        const option =
            document.createElement("option");

        option.value = key;

        option.textContent =
            dashboard.parameter_metadata[key].label;

        select.appendChild(option);
    }

    // First parameter
    currentParameter =
        select.value;

    select.addEventListener(
        "change",
        function () {

            currentParameter =
                this.value;

            updateMap();

            updateTimeSeries();

        }
    );
}


// ============================================================
// Initialize map
// ============================================================

function initializeMap() {

    const lat =
        dashboard.latitude;

    const lon =
        dashboard.longitude;


    map = L.map("map");


    // OpenStreetMap basemap
    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);


    updateMap();

}


// ============================================================
// Update map
// ============================================================

function updateMap() {

    if (!map) return;


    const lat =
        dashboard.latitude;

    const lon =
        dashboard.longitude;

    const values =
        dashboard.parameters[currentParameter];

    const metadata =
        dashboard.parameter_metadata[currentParameter];


    // Remove old track
    if (trackLayer) {

        map.removeLayer(trackLayer);

    }


    // --------------------------------------------------------
    // Determine color range
    // --------------------------------------------------------

    let cmin = metadata.cmin;
    let cmax = metadata.cmax;


    if (cmin === null || cmin === undefined) {

        cmin = Math.min(
            ...values.filter(Number.isFinite)
        );

    }


    if (cmax === null || cmax === undefined) {

        cmax = Math.max(
            ...values.filter(Number.isFinite)
        );

    }


    // --------------------------------------------------------
    // Create colored track
    // --------------------------------------------------------

    const segments = [];


    for (let i = 0; i < lat.length - 1; i++) {

        if (
            !Number.isFinite(lat[i]) ||
            !Number.isFinite(lon[i]) ||
            !Number.isFinite(values[i])
        ) {
            continue;
        }


        const color =
            valueToColor(
                values[i],
                cmin,
                cmax
            );


        const segment =
            L.polyline(
                [
                    [lat[i], lon[i]],
                    [lat[i + 1], lon[i + 1]]
                ],
                {
                    color: color,
                    weight: 5,
                    opacity: 0.9
                }
            );


        segments.push(segment);

    }


    trackLayer =
        L.layerGroup(segments).addTo(map);


    // --------------------------------------------------------
    // Fit map to trajectory
    // --------------------------------------------------------

    const bounds =
        L.latLngBounds(
            lat
                .map((latitude, i) =>
                    [latitude, lon[i]]
                )
                .filter(p =>
                    Number.isFinite(p[0]) &&
                    Number.isFinite(p[1])
                )
        );


    if (bounds.isValid()) {

        map.fitBounds(bounds, {
            padding: [30, 30]
        });

    }


    // --------------------------------------------------------
    // Update title
    // --------------------------------------------------------

    document.getElementById("map-title").textContent =
        metadata.label +
        " (" +
        metadata.units +
        ")";

}


// ============================================================
// Convert value to color
// ============================================================

function valueToColor(value, min, max) {

    if (!Number.isFinite(value)) {
        return "#999999";
    }


    let normalized =
        (value - min) /
        (max - min);


    normalized =
        Math.max(
            0,
            Math.min(1, normalized)
        );


    // Approximate Turbo-like color scale
    return turboColor(normalized);

}


// ============================================================
// Turbo color approximation
// ============================================================

function turboColor(t) {

    const r =
        Math.round(
            255 *
            Math.max(
                0,
                Math.min(
                    1,
                    1.5 * t
                )
            )
        );

    const g =
        Math.round(
            255 *
            Math.sin(
                Math.PI * t
            )
        );

    const b =
        Math.round(
            255 *
            Math.max(
                0,
                Math.min(
                    1,
                    1.5 * (1 - t)
                )
            )
        );


    return `rgb(${r}, ${g}, ${b})`;

}


// ============================================================
// Initialize time series
// ============================================================

function initializeTimeSeries() {

    updateTimeSeries();

}


// ============================================================
// Update time series
// ============================================================

function updateTimeSeries() {

    const values =
        dashboard.parameters[currentParameter];

    const metadata =
        dashboard.parameter_metadata[currentParameter];


    const trace = {

        x: dashboard.time,

        y: values,

        mode: "lines+markers",

        type: "scatter",

        marker: {
            size: 5
        },

        line: {
            width: 1.5
        },

        hovertemplate:
            "%{x|%Y-%m-%d %H:%M:%S}<br>" +
            metadata.label +
            ": %{y:.3f} " +
            metadata.units +
            "<extra></extra>"

    };


    const layout = {

        margin: {
            l: 70,
            r: 30,
            t: 20,
            b: 80
        },

        xaxis: {

            type: "date",

            rangeslider: {
                visible: true
            },

            rangeselector: {

                buttons: [

                    {
                        count: 1,
                        label: "1d",
                        step: "day",
                        stepmode: "backward"
                    },

                    {
                        count: 7,
                        label: "7d",
                        step: "day",
                        stepmode: "backward"
                    },

                    {
                        step: "all",
                        label: "All"
                    }

                ]

            }

        },


        yaxis: {

            title:
                metadata.label +
                " (" +
                metadata.units +
                ")",

            automargin: true

        },


        hovermode: "x unified",

        showlegend: false

    };


    Plotly.newPlot(
        "timeseries",
        [trace],
        layout,
        {
            responsive: true
        }
    );

}
    

// ============================================================
// Format date
// ============================================================

function formatDate(timestamp) {

    const date =
        new Date(timestamp);

    return date.toISOString();

}


// ============================================================
// Start
// ============================================================

loadDashboard();