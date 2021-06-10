const splashback = require('./splashback');

const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/api/sites', async (req, res) => {
    res.send(await splashback.getSites())
})
app.get('/api/sites/:siteId/latestSample', async (req, res) => {
    try {
        const sample = await splashback.getLatestSampleForSite(req.params['siteId'])
        if (sample) {
            res.send(sample)
        }
        res.status(404)
        res.send()
    } catch (e) {
        console.error(e)
        res.status(500)
        res.send()
    }
})

app.listen(port, () => {
    console.log(`Splashback Web Portal Demo listening on http://localhost:${port}`)
})
