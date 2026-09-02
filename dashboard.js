// ============================================================
// SLAM 2026 CARSON Telemetry Dashboard
// ============================================================

let dashboard = null;

let map = null;
let trackLayer = null;

let currentParameter = null;

let selectedStartTime = null;
let selectedEndTime = null;


// User-selected color limits.
// These are reset when changing parameters.

let colorRangeSlider = null;

let fullColorMin = null;
let fullColorMax = null;

let userColorMin = null;
let userColorMax = null;


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
	
	getColorLimits();

	initializeColorRangeSlider();
	
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


            // Reset color limits
            // when changing parameter.

            userColorMin = null;
            userColorMax = null;

			getColorLimits();

			initializeColorRangeSlider();

            updateMap();

            updateTimeSeries();

        }
    );

}


// ============================================================
// Initialize map
// ============================================================

function initializeMap() {

    map = L.map("map");


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
// Get filtered indices
// ============================================================

function getFilteredIndices() {

    const indices = [];


    for (
        let i = 0;
        i < dashboard.time.length;
        i++
    ) {

        const t =
            dashboard.time[i];


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
// Get color limits
// ============================================================

function getColorLimits() {

    const values =
        dashboard.parameters[
            currentParameter
        ];

    const validValues =
        values.filter(
            value => Number.isFinite(value)
        );

    fullColorMin =
        Math.min(
            ...validValues
        );

    fullColorMax =
        Math.max(
            ...validValues
        );


    // Default to full data range

    if (
        userColorMin === null ||
        userColorMax === null
    ) {

        userColorMin =
            fullColorMin;

        userColorMax =
            fullColorMax;

    }


    return {

        cmin:
            userColorMin,

        cmax:
            userColorMax

    };

}


function initializeColorRangeSlider() {

    const slider =
        document.getElementById(
            "color-range-slider"
        );


    if (
        colorRangeSlider
    ) {

        colorRangeSlider.destroy();

    }


    slider.innerHTML = "";


    colorRangeSlider =
        noUiSlider.create(

            slider,

            {

                start: [

                    fullColorMin,

                    fullColorMax

                ],


                connect: true,


                range: {

                    min:
                        fullColorMin,

                    max:
                        fullColorMax

                },


                step:
                    (
                        fullColorMax -
                        fullColorMin
                    ) / 1000

            }

        );


    colorRangeSlider.on(

        "update",

        function(values) {

            userColorMin =
                Number(
                    values[0]
                );


            userColorMax =
                Number(
                    values[1]
                );


            updateColorbar(

                dashboard.parameter_metadata[
                    currentParameter
                ],

                userColorMin,

                userColorMax

            );


            updateMapColorsOnly();

        }

    );

}


function updateMapColorsOnly() {

    if (
        !trackLayer
    ) {
        return;
    }


    const values =
        dashboard.parameters[
            currentParameter
        ];


    const layers =
        trackLayer.getLayers();


    layers.forEach(

        function(marker) {

            const latlng =
                marker.getLatLng();


            const index =
                findClosestDataIndex(
                    latlng.lat,
                    latlng.lng
                );


            if (
                index === -1
            ) {
                return;
            }


            const value =
                values[index];


            const color =
                Number.isFinite(value)

                ? valueToColor(

                    value,

                    userColorMin,

                    userColorMax

                )

                : "#999999";


            marker.setStyle({

                color:
                    color,

                fillColor:
                    color

            });

        }

    );

}


function findClosestDataIndex(
    lat,
    lon
) {

    let closestIndex =
        -1;

    let closestDistance =
        Infinity;


    for (
        let i = 0;
        i < dashboard.latitude.length;
        i++
    ) {

        const dLat =
            dashboard.latitude[i] -
            lat;


        const dLon =
            dashboard.longitude[i] -
            lon;


        const distance =
            dLat * dLat +
            dLon * dLon;


        if (
            distance <
            closestDistance
        ) {

            closestDistance =
                distance;

            closestIndex =
                i;

        }

    }


    return closestIndex;

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


    const limits =
        getColorLimits();


    const cmin =
        limits.cmin;


    const cmax =
        limits.cmax;


    // Remove existing map data.

    if (trackLayer) {

        map.removeLayer(
            trackLayer
        );

    }


    const layers = [];


    // --------------------------------------------------------
    // Create colored trajectory points
    // --------------------------------------------------------

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


        marker.bindTooltip(

            `
            <b>Time:</b>
            ${formatMapTime(dashboard.time[i])}<br>

            <b>Latitude:</b>
            ${lat.toFixed(5)}°<br>

            <b>Longitude:</b>
            ${lon.toFixed(5)}°<br>

            <b>${metadata.label}:</b>
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
    // Fit bounds
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


    const minInput =
        document.getElementById(
            "colorbar-min-input"
        );


    const maxInput =
        document.getElementById(
            "colorbar-max-input"
        );


    if (minInput) {

        minInput.value =
            formatInputValue(
                cmin
            );

    }


    if (maxInput) {

        maxInput.value =
            formatInputValue(
                cmax
            );

    }

}


// ============================================================
// Format colorbar values
// ============================================================

function formatColorValue(value) {

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


function formatInputValue(value) {

    if (
        !Number.isFinite(value)
    ) {
        return "";
    }

    return Number(value).toString();

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
        (value - min) /
        (max - min);


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
// Turbo-style color scale
// ============================================================

function turboColor(t) {

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
        (stops.length - 1);


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


	const layout={
		margin:{l:80,r:30,t:20,b:100},

		annotations:[{
			text:"Time Series Extent",
			x:0.5,
			y:-0.1,
			xref:"paper",
			yref:"paper",
			xanchor:"center",
			yanchor:"top",
			showarrow:false,
			font:{size:13}
		}],

		xaxis:{
			type:"date",
			rangeslider:{
				visible:true,
				thickness:0.12
			},
			rangeselector:{
				buttons:[
					{count:1,label:"1d",step:"day",stepmode:"backward"},
					{count:7,label:"7d",step:"day",stepmode:"backward"},
					{step:"all",label:"All"}
				]
			}
		},
	};


    Plotly.react(

        "timeseries",

        [trace],

        layout,

        {
            responsive: true
        }

    ).then(

        attachTimeRangeListener

    );

}


// ============================================================
// Synchronize time range with map
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

        function(eventData) {


            let start = null;
            let end = null;


            // ------------------------------------------------
            // Format 1:
            //
            // xaxis.range[0]
            // xaxis.range[1]
            // ------------------------------------------------

            if (

                eventData[
                    "xaxis.range[0]"
                ] !== undefined

            ) {

                start =
                    eventData[
                        "xaxis.range[0]"
                    ];


                end =
                    eventData[
                        "xaxis.range[1]"
                    ];

            }


            // ------------------------------------------------
            // Format 2:
            //
            // xaxis.range = [start,end]
            //
            // This may occur when using
            // the Plotly range slider.
            // ------------------------------------------------

            else if (

                eventData[
                    "xaxis.range"
                ] !== undefined

            ) {

                start =
                    eventData[
                        "xaxis.range"
                    ][0];


                end =
                    eventData[
                        "xaxis.range"
                    ][1];

            }


            // ------------------------------------------------
            // Update selected range
            // ------------------------------------------------

            if (

                start !== null &&
                end !== null

            ) {

                selectedStartTime =
                    new Date(
                        start
                    ).getTime();


                selectedEndTime =
                    new Date(
                        end
                    ).getTime();


                updateMap();

            }


            // ------------------------------------------------
            // Reset to full range
            // ------------------------------------------------

            if (

                eventData[
                    "xaxis.autorange"
                ] === true

            ) {

                selectedStartTime = null;
                selectedEndTime = null;

                updateMap();

            }

        }

    );

}


// ============================================================
// Colorbar input controls
// ============================================================

function initializeColorbarControls() {

    const minInput =
        document.getElementById(
            "colorbar-min-input"
        );


    const maxInput =
        document.getElementById(
            "colorbar-max-input"
        );


    function updateLimits() {

        const newMin =
            Number(
                minInput.value
            );


        const newMax =
            Number(
                maxInput.value
            );


        if (

            Number.isFinite(newMin) &&
            Number.isFinite(newMax) &&
            newMin < newMax

        ) {

            userColorMin =
                newMin;


            userColorMax =
                newMax;


            updateMap();

        }

    }


    minInput.addEventListener(
        "change",
        updateLimits
    );


    maxInput.addEventListener(
        "change",
        updateLimits
    );

}


// ============================================================
// Format time
// ============================================================

function formatMapTime(timestamp) {

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