// ============================================================
// SLAM 2026 CARSON Telemetry Dashboard
// ============================================================


let dashboard = null;

let map = null;

let trackLayer = null;

let currentParameter = null;


// Current selected time range.
//
// null means the full deployment.

let selectedStartTime = null;

let selectedEndTime = null;


// ============================================================
// Load dashboard JSON
// ============================================================

async function loadDashboard() {

    try {

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

    }

    catch (error) {

        console.error(
            "Could not load dashboard:",
            error
        );


        document.getElementById(
            "dashboard-title"
        ).textContent =
            "Error loading dashboard";

    }

}


// ============================================================
// Initialize dashboard
// ============================================================

function initializeDashboard() {


    document.getElementById(
        "dashboard-title"
    ).textContent =
        "SLAM 2026 CARSON Telemetry";


    document.getElementById(
        "deployment-info"
    ).textContent =
        "Data generated: " +
        dashboard.metadata.generated;


    initializeParameterSelector();


    initializeMap();


    updateTimeSeries();

}


// ============================================================
// Parameter selector
// ============================================================

function initializeParameterSelector() {


    const select =
        document.getElementById(
            "parameter-select"
        );


    select.innerHTML = "";


    for (
        const key
        in dashboard.parameters
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value = key;


        option.textContent =
            dashboard.parameter_metadata[
                key
            ].label;


        select.appendChild(
            option
        );

    }


    currentParameter =
        select.value;


    select.addEventListener(
        "change",
        function () {


            currentParameter =
                this.value;


            // Keep the current
            // time selection.

            updateMap();

            updateTimeSeries();


        }
    );

}


// ============================================================
// Initialize map
// ============================================================

function initializeMap() {


    map =
        L.map("map");


    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            attribution:
                "&copy; OpenStreetMap contributors"

        }

    ).addTo(map);


    updateMap();

}


// ============================================================
// Get filtered data indices
// ============================================================

function getFilteredIndices() {


    const indices = [];


    const time =
        dashboard.time;


    for (
        let i = 0;
        i < time.length;
        i++
    ) {


        const t =
            time[i];


        if (
            selectedStartTime !== null &&
            t < selectedStartTime
        ) {

            continue;

        }


        if (
            selectedEndTime !== null &&
            t > selectedEndTime
        ) {

            continue;

        }


        indices.push(i);

    }


    return indices;

}


// ============================================================
// Update map
// ============================================================

function updateMap() {


    if (!map) return;


    const metadata =
        dashboard.parameter_metadata[
            currentParameter
        ];


    const values =
        dashboard.parameters[
            currentParameter
        ];


    const indices =
        getFilteredIndices();


    // Remove old track

    if (trackLayer) {

        map.removeLayer(
            trackLayer
        );

    }


    // --------------------------------------------------------
    // Determine color range
    // --------------------------------------------------------


    let cmin =
        metadata.cmin;


    let cmax =
        metadata.cmax;


    const validValues =
        values.filter(
            Number.isFinite
        );


    if (
        cmin === null ||
        cmin === undefined
    ) {

        cmin =
            Math.min(
                ...validValues
            );

    }


    if (
        cmax === null ||
        cmax === undefined
    ) {

        cmax =
            Math.max(
                ...validValues
            );

    }


    // --------------------------------------------------------
    // Create map points
    // --------------------------------------------------------


    const layers = [];


    for (
        let j = 0;
        j < indices.length;
        j++
    ) {


        const i =
            indices[j];


        const lat =
            dashboard.latitude[i];


        const lon =
            dashboard.longitude[i];


        const value =
            values[i];


        if (

            !Number.isFinite(lat) ||
            !Number.isFinite(lon)

        ) {

            continue;

        }


        let color =
            "#999999";


        if (
            Number.isFinite(value)
        ) {

            color =
                valueToColor(
                    value,
                    cmin,
                    cmax
                );

        }


        const marker =
            L.circleMarker(

                [lat, lon],

                {

                    radius: 5,

                    color: color,

                    fillColor: color,

                    fillOpacity: 0.9,

                    weight: 1

                }

            );


        // Hover popup

        marker.bindTooltip(

            `
            <b>Time</b>: ${formatMapTime(dashboard.time[i])}<br>

            <b>Latitude</b>: ${lat.toFixed(5)}°<br>

            <b>Longitude</b>: ${lon.toFixed(5)}°<br>

            <b>${metadata.label}</b>:
            ${
                Number.isFinite(value)
                    ? value.toFixed(3)
                    : "NaN"
            }
            ${metadata.units}
            `,

            {

                sticky: true

            }

        );


        layers.push(
            marker
        );

    }


    trackLayer =
        L.layerGroup(
            layers
        ).addTo(map);


    // --------------------------------------------------------
    // Fit map bounds
    // --------------------------------------------------------


    const positions =
        indices

            .map(
                i => [

                    dashboard.latitude[i],

                    dashboard.longitude[i]

                ]
            )

            .filter(
                p =>

                    Number.isFinite(p[0]) &&
                    Number.isFinite(p[1])
            );


    if (
        positions.length > 0
    ) {


        const bounds =
            L.latLngBounds(
                positions
            );


        if (
            bounds.isValid()
        ) {

            map.fitBounds(

                bounds,

                {

                    padding:
                        [30, 30]

                }

            );

        }

    }


    // --------------------------------------------------------
    // Update colorbar
    // --------------------------------------------------------


    updateColorbar(

        metadata,

        cmin,

        cmax

    );

}


// ============================================================
// Update colorbar
// ============================================================

function updateColorbar(
    metadata,
    cmin,
    cmax
) {


    document.getElementById(
        "colorbar-title"
    ).textContent =
        metadata.label +
        " (" +
        metadata.units +
        ")";


    document.getElementById(
        "colorbar-max"
    ).textContent =
        formatColorValue(
            cmax
        );


    document.getElementById(
        "colorbar-min"
    ).textContent =
        formatColorValue(
            cmin
        );

}


// ============================================================
// Format colorbar values
// ============================================================

function formatColorValue(
    value
) {


    if (
        !Number.isFinite(value)
    ) {

        return "";

    }


    if (
        Math.abs(value) >= 100
    ) {

        return value.toFixed(0);

    }


    if (
        Math.abs(value) >= 10
    ) {

        return value.toFixed(1);

    }


    return value.toFixed(2);

}


// ============================================================
// Convert value to color
// ============================================================

function valueToColor(
    value,
    min,
    max
) {


    if (
        !Number.isFinite(value)
    ) {

        return "#999999";

    }


    let normalized =
        (
            value - min
        )
        /
        (
            max - min
        );


    normalized =
        Math.max(

            0,

            Math.min(
                1,
                normalized
            )

        );


    return turboColor(
        normalized
    );

}


// ============================================================
// Color scale
// ============================================================

function turboColor(
    t
) {


    const stops = [

        [48, 18, 59],

        [65, 69, 171],

        [70, 117, 237],

        [57, 162, 252],

        [27, 207, 212],

        [91, 234, 122],

        [183, 243, 74],

        [247, 209, 61],

        [249, 139, 40],

        [232, 61, 24]

    ];


    const position =
        t *
        (
            stops.length - 1
        );


    const lower =
        Math.floor(
            position
        );


    const upper =
        Math.min(

            lower + 1,

            stops.length - 1

        );


    const fraction =
        position - lower;


    const r =
        Math.round(

            stops[lower][0] +

            fraction *

            (
                stops[upper][0] -
                stops[lower][0]
            )

        );


    const g =
        Math.round(

            stops[lower][1] +

            fraction *

            (
                stops[upper][1] -
                stops[lower][1]
            )

        );


    const b =
        Math.round(

            stops[lower][2] +

            fraction *

            (
                stops[upper][2] -
                stops[lower][2]
            )

        );


    return `rgb(${r},${g},${b})`;

}


// ============================================================
// Update time series
// ============================================================

function updateTimeSeries() {


    const metadata =
        dashboard.parameter_metadata[
            currentParameter
        ];


    const values =
        dashboard.parameters[
            currentParameter
        ];


    const trace = {

        x:
            dashboard.time,

        y:
            values,

        mode:
            "lines+markers",

        type:
            "scatter",

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

            l: 80,

            r: 30,

            t: 20,

            b: 80

        },


        xaxis: {


            type:
                "date",


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

            automargin:
                true

        },


        hovermode:
            "x unified",


        showlegend:
            false

    };


    Plotly.react(

        "timeseries",

        [trace],

        layout,

        {

            responsive:
                true

        }

    )


    .then(
        attachTimeRangeListener
    );

}


// ============================================================
// Connect Plotly time selection to map
// ============================================================

function attachTimeRangeListener() {


    const plot =
        document.getElementById(
            "timeseries"
        );


    plot.removeAllListeners(
        "plotly_relayout"
    );


    plot.on(

        "plotly_relayout",

        function (
            eventData
        ) {


            // User changes
            // x-axis range.


            if (

                eventData[
                    "xaxis.range[0]"
                ] !== undefined

            ) {


                selectedStartTime =
                    new Date(

                        eventData[
                            "xaxis.range[0]"
                        ]

                    ).getTime();


                selectedEndTime =
                    new Date(

                        eventData[
                            "xaxis.range[1]"
                        ]

                    ).getTime();


                updateMap();

            }


            // Reset to autorange


            if (

                eventData[
                    "xaxis.autorange"
                ]

            ) {


                selectedStartTime =
                    null;


                selectedEndTime =
                    null;


                updateMap();

            }

        }

    );

}


// ============================================================
// Format map time
// ============================================================

function formatMapTime(
    timestamp
) {


    const date =
        new Date(
            timestamp
        );


    return date
        .toISOString()
        .replace(
            "T",
            " "
        )
        .replace(
            ".000Z",
            " UTC"
        );

}


// ============================================================
// Start dashboard
// ============================================================

loadDashboard();