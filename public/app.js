// Setup details toggle
const overlayElem = document.getElementById('overlay');
const detailsElem = document.getElementById('overlay-body');
function autoToggleDetails() {
    const bodyRect = document.body.getBoundingClientRect();
    const overlayRect = overlayElem.getBoundingClientRect();
    if (bodyRect.height - 40 > overlayRect.height && bodyRect.width - 40 > 2.5 * overlayRect.width) {
        detailsElem.removeAttribute('hidden');
    } else {
        detailsElem.setAttribute('hidden', '');
    }
}
window.addEventListener('resize', autoToggleDetails);
autoToggleDetails();

// Setup OpenLayers Map
const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([135.2076439, -27.7241231]),
        zoom: 5
    })
});

// Query sites and place on OpenLayers Layer
axios.get('/api/sites').then(response => {
    const sites = response.data;

    const layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: sites.map((site) => {
                const feature = new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([site.longitude, site.latitude]))
                });
                feature.setStyle(new ol.style.Style({
                    image: new ol.style.Circle({
                        fill: new ol.style.Fill({
                            color: '#FFCE5C'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#1B0942',
                            width: 6
                        }),
                        radius: 12
                    }),
                }));
                feature.setId(site.id);
                feature.setProperties(site);
                return feature;
            })
        })
    });
    map.addLayer(layer);
});

// Popup showing
const popup = new ol.Overlay({
    element: document.getElementById('popup'),
});
map.addOverlay(popup);
map.on('pointermove', function (event) {
    if (map.hasFeatureAtPixel(event.pixel) === true) {
        const feature = map.getFeaturesAtPixel(event.pixel)[0];

    } else {

    }
});

// Get modal elements
const modalElem = document.getElementById('modal');
const modalTitle = modalElem.querySelector('.uk-modal-title');
const modalBody = modalElem.querySelector('.modal-body');
const modal = UIkit.modal(modalElem);
const chartElem = modalElem.querySelector('.modal-chart');
let chart = null;

async function showModal(site) {
    modalTitle.innerHTML = site.name + ' (' + site.location + ')';
    modalBody.innerHTML = '<small>Loading latest sample...</small>';
    if (chart) {
        echarts.dispose(chart);
        chart = null;
    }
    modal.show();

    const response = await axios.get('/api/sites/' + site.id + '/latestSample');
    const sample = response.data;
    const sampleVariants = sample.sampleVariants;
    const samplingMethods = sampleVariants
        .flatMap(variant => variant.sampleValues)
        .map(value => value.samplingMethod.name)
        .filter((v, i, s) => s.indexOf(v) === i);

    modalBody.innerHTML = `
    <table class="uk-table uk-table-divider">
        <thead><tr>
            <th>Metadata</th>
            <th>Value</th>
        </tr></thead>
        <tbody>
            <tr><td>Program</td><td>${sample.program.name}</td></tr>
            <tr><td>Taken by</td><td>${sample.takenBy}</td></tr>
            <tr><td>Taken at</td><td>${sample.dateTime}</td></tr>
            <tr><td>Sampling methods</td><td>${samplingMethods.join(', ')}</td></tr>
        </tbody>
    </table>
    `;

    const parameters = sampleVariants
        .flatMap(variant => variant.sampleValues)
        .map(value => value.parameter.name)
        .filter((v, i, s) => s.indexOf(v) === i);
    const parameterColours = parameters.map(parameter => uniqolor(parameter, {
        lightness: [30, 40],
        saturation: [80, 90]
    }).color);
    const variantValues = sampleVariants.map(variant => variant.value.toPrecision(3));
    const dataByParameters = parameters.map(parameter => sampleVariants.map(variant => {
        const value = variant.sampleValues.find(value => value.parameter.name === parameter);
        return value ? value.value : null;
    }));
    chart = echarts.init(chartElem);
    chart.setOption({
        legend: {
            data: parameters,
            bottom: 20,
            left: 0
        },
        grid: {
            top: 60 + parameters.length * 5,
            bottom: 140 + parameters.length * 5
        },
        xAxis: dataByParameters.map((_, idx) => ({
            type: 'value',
            axisLabel: {color: parameterColours[idx]},
            min: 'dataMin',
            position: idx % 2 === 0 ? 'top' : 'bottom',
            offset: idx % 2 === 0 ? (idx * 10) : ((idx - 1) * 10)
        })),
        yAxis: {
            type: 'category',
            data: variantValues,
            inverse: true
        },
        series: dataByParameters.map((data, idx) => ({
            data,
            name: parameters[idx],
            itemStyle: {color: parameterColours[idx]},
            type: 'line',
            xAxisIndex: idx
        }))
    });
}

map.on('singleclick', function (event) {
    if (map.hasFeatureAtPixel(event.pixel) === true) {
        const feature = map.getFeaturesAtPixel(event.pixel)[0];
        showModal(feature.getProperties());
    } else {
        modal.hide();
    }
});
