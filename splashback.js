const axios = require('axios');

const host = 'https://api.splashback.io';
const apiKey = process.env.SPLASHBACK_API_KEY;
const poolId = process.env.SPLASHBACK_POOL_ID;

function getHeaders() {
    return {
        'Authorization': 'API-Key ' + apiKey
    }
}
function get(path) {
    return axios.get(host + path, {
        headers: getHeaders()
    })
}
function post(path, body) {
    return axios.post(host + path, body, {
        headers: getHeaders()
    })
}

exports.getSites = async function () {
    return (await get('/data/api/Sites/' + poolId)).data
}

exports.getLatestSampleForSite = async function (siteId) {
    const response = (await post('/data/graphql', {
        query: `
        query ($poolId: Int!, $siteId: Int!) {
            samples(pool_id: $poolId first: 1 order: {dateTime: DESC} where: {siteId: {eq: $siteId}}) {
                nodes {
                    dateTime site {name location} program {name}
                    sampleVariants {
                        value type {name unit}
                        sampleValues {
                            parameter {name unit} samplingMethod {name}
                            value
                        }
                    }
                }
            }
        }`,
        variables: {
            poolId: parseInt(poolId),
            siteId: parseInt(siteId)
        }
    })).data
    const samples = response.data.samples.nodes
    if (samples && samples.length > 0) {
        return samples[0]
    }
}
