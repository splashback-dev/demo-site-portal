const splashback = require('./splashback')

const fs = require('fs')
const path = require('path')

const express = require('express')
const app = express()
const port = parseInt(process.env.APP_PORT) || 3000

let config = {}
const configPath = path.join(__dirname, 'config.json')
if (fs.existsSync(configPath)) {
    config = require(configPath)
} else if (process.env.APP_CONFIG) {
    config = JSON.parse(process.env.APP_CONFIG)
}
config.name = config.name || 'Splashback Site Portal'
config.homepage = config.homepage || 'https://splashback.io'
config.description = config.description || 'Latest profile for each site.'

app.engine('.ejs', require('ejs').__express)
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', function(req, res){
    res.render('index', config)
})

app.get('/api/sites', async (req, res) => {
    res.send(await splashback.getSites())
})
app.get('/api/sites/:siteId/latestSample', async (req, res) => {
    const sample = await splashback.getLatestSampleForSite(req.params['siteId'])
    if (sample) {
        res.send(sample)
    }
    res.status(404).send()
})

app.use(function (err, req, res, next) {
    console.error(err)
    res.status(500).send()
})

app.listen(port, () => {
    console.log(`${config.name} listening on http://localhost:${port}`)
})
