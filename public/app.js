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

// Setup map
const map = L.map('map').setView([-27.7241231, 135.2076439], 4);
L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Powered by Esri. Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community.'
}).addTo(map);

// Query sites and place on map
axios.get('/api/sites').then(response => {
    const sites = response.data;
    const icon = L.icon({
        iconUrl: '/assets/map-marker.svg',
        iconSize: L.point(32, 32)
    });

    for (let site of sites) {
        L.marker([site.latitude, site.longitude], {
            icon: icon,
            title: site.name,
            alt: site.name,
        }).addTo(map).on('click', event => {
            showModal(site);
        });
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
    <small>Tip: Click the legend markers to toggle it on the graph.</small>
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
            type: 'line',
            data,
            name: parameters[idx],
            itemStyle: {color: parameterColours[idx]},
            smooth: false,
            xAxisIndex: idx
        }))
    });
}
