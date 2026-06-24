import { defineEventHandler, readBody, createError } from 'h3'
import { decode as decodeTiff } from 'tiff'
import axios from 'axios'
// @openeo/js-client is CJS; the default ESM import gives us module.exports
import openeoModule from '@openeo/js-client'

const CDSE_TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
const OPENEO_URL = 'https://openeo.dataspace.copernicus.eu'

async function getCopernicusToken(user: string, pass: string): Promise<string> {
  const resp = await axios.post(
    CDSE_TOKEN_URL,
    new URLSearchParams({ grant_type: 'password', username: user, password: pass, client_id: 'cdse-public' }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  return resp.data.access_token as string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OpenEO = (openeoModule as any).OpenEO as {
  connect: (url: string) => Promise<OpenEOConnection>
}

interface OpenEOConnection {
  setAuthToken: (type: string, providerId: string, token: string) => void
  buildProcess: () => Promise<OpenEOBuilder>
  computeResult: (process: unknown) => Promise<{ data: NodeJS.ReadableStream }>
  listProcesses: () => Promise<unknown>
}

interface OpenEOBuilder {
  load_collection: (id: string, bbox: object | null, dates: string[] | null, bands: string[] | null) => unknown
  resample_spatial: (cube: unknown, resolution: number[], projection: number | null, method: string) => unknown
  reduce_dimension: (cube: unknown, reducer: (data: unknown) => unknown, dimension: string) => unknown
  save_result: (cube: unknown, format: string) => unknown
  last: (data: unknown) => unknown
}

interface RequestBody {
  lat: number
  lng: number
  scaleKm: number
  gridCols: number
  gridRows: number
}

interface GeoTerrainResponse {
  elevation: number[]
  lulc: number[]
  gridCols: number
  gridRows: number
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    )
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

function parseGeoTiff(bytes: Buffer): { data: number[], width: number, height: number } {
  const ifds = decodeTiff(bytes)
  const ifd = ifds[0]
  if (!ifd) throw new Error('No image found in GeoTIFF response')
  return { data: Array.from(ifd.data), width: ifd.width, height: ifd.height }
}

export default defineEventHandler(async (event): Promise<GeoTerrainResponse> => {
  // Allow up to 3 minutes for openEO processing
  event.node.res.setTimeout?.(180000)

  const body = await readBody<RequestBody>(event)
  const { lat, lng, scaleKm, gridCols, gridRows } = body

  if (!lat || !lng || !scaleKm || !gridCols || !gridRows) {
    throw createError({ statusCode: 400, message: 'Missing required parameters' })
  }

  const user = process.env.COPERNICUS_USER
  const pass = process.env.COPERNICUS_PASS
  if (!user || !pass) {
    throw createError({ statusCode: 500, message: 'Copernicus credentials not configured' })
  }

  // scaleKm = full map width in km; bbox aspect ratio = gridCols:gridRows
  const cosLat = Math.cos((lat * Math.PI) / 180)
  const lngDelta = scaleKm / 2 / (111.0 * cosLat)
  const latDelta = (scaleKm * (gridRows / gridCols)) / 2 / 111.0
  const bbox = {
    west: lng - lngDelta,
    east: lng + lngDelta,
    south: lat - latDelta,
    north: lat + latDelta
  }

  // Resolution in degrees per pixel (target projection: EPSG:4326)
  const xRes = (bbox.east - bbox.west) / gridCols
  const yRes = (bbox.north - bbox.south) / gridRows

  let con: OpenEOConnection

  try {
    const [token, connection] = await Promise.all([
      getCopernicusToken(user, pass),
      OpenEO.connect(OPENEO_URL)
    ])
    con = connection
    con.setAuthToken('oidc', 'CDSE', token)
    // Pre-fetch process list so parallel builds share the cache
    await con.listProcesses()
  } catch (e: unknown) {
    throw createError({ statusCode: 502, message: `openEO connection/auth failed: ${(e as Error).message}` })
  }

  async function fetchDEM(): Promise<Buffer> {
    const b = await con.buildProcess()
    // COPERNICUS_30 has a single band 'DEM' and a fixed temporal extent
    let cube = b.load_collection('COPERNICUS_30', bbox, ['2010-01-01', '2015-12-31'], ['DEM'])
    cube = b.resample_spatial(cube, [yRes, xRes], 4326, 'near')
    cube = b.save_result(cube, 'GTiff')
    const result = await con.computeResult(cube)
    return streamToBuffer(result.data)
  }

  async function fetchLULC(): Promise<Buffer> {
    const b = await con.buildProcess()
    // ESA WorldCover 2021 — static annual product, 11 land cover classes at 10m
    let cube = b.load_collection('ESA_WORLDCOVER_10M_2021_V2', bbox, ['2021-01-01', '2021-12-31'], ['MAP'])
    cube = b.reduce_dimension(cube, function (this: OpenEOBuilder, data: unknown) { return this.last(data) }, 't')
    cube = b.resample_spatial(cube, [yRes, xRes], 4326, 'near')
    cube = b.save_result(cube, 'GTiff')
    const result = await con.computeResult(cube)
    return streamToBuffer(result.data)
  }

  let elevBuffer: Buffer
  let lulcBuffer: Buffer

  try {
    ;[elevBuffer, lulcBuffer] = await Promise.all([fetchDEM(), fetchLULC()])
  } catch (e: unknown) {
    throw createError({ statusCode: 502, message: `openEO compute failed: ${(e as Error).message}` })
  }

  let elevParsed: { data: number[], width: number, height: number }
  let lulcParsed: { data: number[], width: number, height: number }

  try {
    elevParsed = parseGeoTiff(elevBuffer!)
    lulcParsed = parseGeoTiff(lulcBuffer!)
  } catch (e: unknown) {
    throw createError({ statusCode: 500, message: `GeoTIFF parse failed: ${(e as Error).message}` })
  }

  // Use the actual raster dimensions returned by the backend (may differ from requested gridCols/gridRows)
  const actualCols = elevParsed.width
  const actualRows = elevParsed.height

  // Normalize elevation to [0, 1] within the bbox; treat DEM nodata (< -9000) as 0
  const elevData = elevParsed.data
  const validElev = elevData.filter(v => !isNaN(v) && v > -9000)
  const minE = validElev.length ? Math.min(...validElev) : 0
  const maxE = validElev.length ? Math.max(...validElev) : 1
  const range = maxE - minE || 1
  const elevation = elevData.map(v => (isNaN(v) || v < -9000) ? 0 : (v - minE) / range)

  return { elevation, lulc: lulcParsed.data, gridCols: actualCols, gridRows: actualRows }
})
