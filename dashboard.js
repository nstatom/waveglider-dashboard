// ============================================================
// SLAM 2026 CARSON Telemetry Dashboard
// ============================================================

let dashboards = {};
let deployments = {};

let currentDeployment = null;
let currentVehicle = null;

let dashboard = null;
let currentParameter = null;

let selectedStartTime = null;
let selectedEndTime = null;

let map = null;
let trackLayer = null;


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

async function loadDashboards() {

    const response = await fetch(
        "data/index.json?t=" + Date.now()
    );

    if (!response.ok) {

        throw new Error(
            "Could not load data/index.json"
        );

    }

    const index = await response.json();

    dashboards = {};

    for (const filename of index.files) {

        console.log(
            "Loading:",
            filename
        );

        const response = await fetch(
            "data/" + filename + "?t=" + Date.now()
        );

        if (!response.ok) {

            console.warn(
                "Could not load:",
                filename
            );

            continue;

        }

        const data = await response.json();

        const deployment =
            data.metadata.deployment;

        const vehicle =
            data.metadata.vehicle;


        if (!dashboards[deployment]) {

            dashboards[deployment] = {};

        }


        dashboards[deployment][vehicle] =
            data;

    }


    buildDeploymentTabs();

}


function buildDeploymentTabs() {

    const container =
        document.getElementById(
            "deployment-tabs"
        );

    container.innerHTML = "";


    const deploymentNames =
        Object.keys(dashboards);


    deploymentNames.forEach(
        (deployment, index) => {

            const button =
                document.createElement("button");

            button.className = "tab";

            button.textContent =
                deployment;


            button.addEventListener(
                "click",
                () => {

                    selectDeployment(
                        deployment
                    );

                }
            );


            container.appendChild(button);

        }
    );


    if (deploymentNames.length > 0) {

        selectDeployment(
            deploymentNames[0]
        );

    }

}


function selectDeployment(deployment) {

    currentDeployment =
        deployment;


    updateActiveTabs(
        "deployment-tabs",
        deployment
    );


    buildVehicleTabs();


    const vehicles =
        Object.keys(
            dashboards[deployment]
        );


    if (vehicles.length > 0) {

        selectVehicle(
            vehicles[0]
        );

    }

}


function buildVehicleTabs() {

    const container =
        document.getElementById(
            "vehicle-tabs"
        );

    container.innerHTML = "";


    const vehicles =
        Object.keys(
            dashboards[currentDeployment]
        );


    vehicles.forEach(
        vehicle => {

            const button =
                document.createElement("button");

            button.className = "tab";

            button.textContent =
                vehicle;


            button.addEventListener(
                "click",
                () => {

                    selectVehicle(
                        vehicle
                    );

                }
            );


            container.appendChild(button);

        }
    );

}


function selectVehicle(vehicle) {

    currentVehicle =
        vehicle;


    dashboard =
        dashboards[
            currentDeployment
        ][
            currentVehicle
        ];


    updateActiveTabs(
        "vehicle-tabs",
        vehicle
    );


    initializeDashboard();

}


function updateActiveTabs(
    containerId,
    activeName
) {

    const container =
        document.getElementById(
            containerId
        );


    const tabs =
        container.querySelectorAll(
            ".tab"
        );


    tabs.forEach(tab => {

        if (
            tab.textContent === activeName
        ) {

            tab.classList.add(
                "active"
            );

        } else {

            tab.classList.remove(
                "active"
            );

        }

    });

}


// ============================================================
// Initialize dashboard
// ============================================================

function initializeDashboard() {

    selectedStartTime = null;

    selectedEndTime = null;

    initializeParameterSelector();

    initializeMap();

    initializeColorRangeSlider();

    updateMap();

    updateTimeSeries();

}

//function initializeDashboard() {
//
//    document.getElementById(
//        "dashboard-title"
//    ).textContent =
//        "SLAM 2026 CARSON Telemetry";
//
//
//    document.getElementById(
//        "deployment-info"
//    ).textContent =
//        "Data Generated: " +
//        dashboard.metadata.generated;
//
//
//    initializeParameterSelector();
//
//    initializeMap();
//	
//	getColorLimits();
//
//	initializeColorRangeSlider();
//	
//    updateTimeSeries();
//
//}


// ============================================================
// Parameter selector
// ============================================================

function initializeParameterSelector() {

    const select =
        document.getElementById(
            "parameter-select"
        );


    select.innerHTML = "";


    const parameters =
        Object.keys(
            dashboard.parameters
        );


    parameters.forEach(
        parameter => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                parameter;

            option.textContent =
                dashboard.parameter_metadata[
                    parameter
                ].label;


            select.appendChild(
                option
            );

        }
    );


    currentParameter =
        parameters[0];


    select.value =
        currentParameter;


    select.onchange = () => {

        currentParameter =
            select.value;

        initializeColorLimits();

        updateMap();

        updateTimeSeries();

    };

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


	const layout = {

		margin: {
			l: 80,
			r: 30,
			t: 20,
			b: 60
		},

		xaxis: {

			type: "date",

			title: {
				text: "<b>Time Series Range Slider</b>",
				font: {
					size: 13
				},
				standoff: 20
			},

			rangeslider: {
				visible: true,
				thickness: 0.2
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
		}
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