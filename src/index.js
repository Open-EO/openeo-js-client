import L from 'leaflet'
import CodeMirror from 'codemirror'
import '../node_modules/codemirror/lib/codemirror.css'
import './styles/main.css'
import '../node_modules/leaflet/dist/leaflet.css'
import { initOpenEO } from './open-eo.js'

let evalScipt

var openEO = initOpenEO()

function recolor (tile) {
  if (!tile.originalImage) {
    return
  }
  const ctx = tile.getContext('2d')
  const tgtData = ctx.getImageData(0, 0, tile.width, tile.height)

  const esFun = eval('(function(input) {' + evalScipt + '})')
  for (var i = 0; i < tgtData.data.length; i += 4) {
    const input = tile.originalImage.data.slice(i, i + 4)
    const es = esFun(input)
    tgtData.data.set(es, i)
  }
  ctx.putImageData(tgtData, 0, 0)
}

var map = new L.Map('map', { center: [45, 15], zoom: 8 })

var tiles = L.tileLayer.wms(
  'http://localhost:8080/download/placeholder/wcs',
  {
    request: 'GetCoverage',
    service: 'WCS',
    coverage: 'CUSTOM',
    format: 'image/jpeg',
    tileSize: 256,
    minZoom: 8
  }
)

function recolorTiles () {
  tiles.recolor()
}

tiles.recolor = function () {
  for (var key in this._tiles) {
    var tile = this._tiles[key]
    recolor(tile.el)
  }
}

tiles.createTile = function (coords) {
  const tile = L.DomUtil.create('canvas', 'leaflet-tile')
  tile.width = tile.height = this.options.tileSize

  const imageObj = new Image()
  imageObj.crossOrigin = ''
  imageObj.onload = function () {
    const ctx = tile.getContext('2d')
    ctx.drawImage(imageObj, 0, 0)

    tile.originalImage = ctx.getImageData(0, 0, tile.width, tile.height)
    recolor(tile)
  }
  imageObj.src = this.getTileUrl(coords)
  return tile
}

L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="http://www.osm.org">OpenStreetMap</a>'
}).addTo(map)

tiles.addTo(map)

document
  .getElementById('runProsScript')
  .addEventListener('click', runProsScript)
document.getElementById('runVisScript').addEventListener('click', runVisScript)

const processingScript = CodeMirror(document.getElementById('proseditor'), {
  value: `return openEO.imagecollection('Sentinel2A-L1C')
      .filter_daterange("2018-01-01","2018-01-31")
      .NDI(3,8)
      .max_time();`,
  // .bbox_filter([16.1, 47.9, 16.6, 48.6], "EPSG:4326")
  mode: 'javascript',
  indentUnit: 4,
  lineNumbers: true
})
const visualisationScript = CodeMirror(document.getElementById('viseditor'), {
  value: `

  function ramp2colors(val, min, max) {
    const clrMin = [240, 220, 150, 255];
    const clrMax = [ 10,  70, 230, 255];
    const m = (val-min)/(max-min);

    return clrMin.map((elMin, i) => m * clrMax[i] + (1 - m) * elMin);
  }
  
  return ramp2colors(input[0], 0, 255)
    `,
  mode: 'javascript',
  indentUnit: 4,
  lineNumbers: true
})

function runProsScript () {
  const scriptArea = document.getElementById('firstTextArea')
  const graph = openEO.parseScript(processingScript.getValue())
  openEO.createJob(graph).then(jobId => {
    tiles.setUrl(openEO.getWcsUrl(jobId), false)
    console.log(openEO.getWcsUrl(jobId))
  })
}

function runVisScript () {
  const scriptArea = document.getElementById('firstTextArea')
  evalScipt = visualisationScript.getValue()
  recolorTiles()
}
