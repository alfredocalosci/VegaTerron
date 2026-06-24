<template>
  <div ref="svg-container" class="relative w-screen h-screen overflow-hidden bg-black">
    <svg
      class="absolute inset-0 w-full h-full"
      :viewBox="viewBox"
      :width="canvasSize.width"
      :height="canvasSize.height"
      preserveAspectRatio="xMidYMid meet"
    >

    <!--  Terrain cells -->
      <g>
        <polygon
          v-for="cell in terrainCells"
          :key="`${cell.col}-${cell.row}`"
          :points="hexPoints(cell.x, cell.y, HEX_RADIUS)"
          :fill="TERRAIN_GRAYS[cell.terrain]"
          stroke="rgba(0,0,0,0.2)"
          stroke-width="0.5"
        />
      </g>

      <!-- Blob outlines
      <g>
        <path
          v-for="(d, i) in blobPaths"
          :key="`arc-${i}`"
          :d="d"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </g>
      -->

      <!-- Blob curved outlines
      <g>
        <path
          v-for="(d, i) in blobCurvedPath"
          :key="`curved-${i}`"
          :d="d"
          fill="none"
          stroke="rgba(255,200,100,0.8)"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      -->

      <!-- Blob Bézier outlines -->
      <g>
        <path
          v-for="(d, i) in blobBezierPath"
          :key="`bezier-${i}`"
          :d="d"
          fill="none"
          stroke="#fff"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>

      <!-- River lower boundary -->
      <g>
        <path
          v-for="(d, i) in riverPath"
          :key="`river-${i}`"
          :d="d"
          fill="none"
          stroke="rgba(80,180,255,1)"
          stroke-width="8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    </svg>

    <div class="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 bg-gray-800 shadow-md px-4 py-2 z-10">
      <UBreadcrumb :items="items" />
    </div>

    <div class="absolute bottom-4 right-4 bg-gray-900 px-4 py-3 z-10 flex flex-col gap-1.5 text-xs text-gray-300">
      <p class="text-gray-500 uppercase text-[10px] mb-1">Terrain</p>
      <div v-for="(color, terrain) in TERRAIN_GRAYS" :key="terrain" class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-sm inline-block shrink-0" :style="{ background: color }" />
        {{ terrain }}
      </div>
    </div>

    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 shadow-sm px-4 py-2 z-10 flex items-center gap-3 text-gray-500">
      <span class="text-xs tabular-nums">E {{ elevTime.toFixed(2) }} · M {{ moistTime.toFixed(2) }}</span>
      <UButton size="xs" @click="regenerate">Regenerate</UButton>
      <UButton size="xs" variant="soft" @click="stepElevation">Step elevation</UButton>
      <UButton size="xs" variant="soft" @click="stepMoisture">Step moisture</UButton>
      <UButton size="xs" variant="soft" @click="stepBoth">Step both</UButton>
      <UButton size="xs" variant="soft" @click="createRiver">River</UButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { createNoise3D } from 'simplex-noise'
import type { BreadcrumbItem } from '@nuxt/ui'
import { useTemplateRef, ref, watch, computed } from 'vue'
import { useElementSize } from '@vueuse/core'
import { buildHexGrid, getHexNeighbors, findHexPath } from '~/utils/hexgrid'
import type { HexCell } from '~/utils/hexgrid'

type Terrain = 'scorched' | 'grassland' | 'swamp' | 'desert' | 'shrubland' | 'forest' | 'rock' | 'tundra' | 'snow'

interface TerrainCell extends HexCell {
  terrain: Terrain
  elevation: number
  moisture: number
}

const HEX_RADIUS = 12
const SCALE = 0.0025
const WARP = 100
const TIME_STEP = 0.01

const BIOME_TABLE: Terrain[][] = [
  ['scorched', 'grassland', 'swamp'],
  ['desert', 'shrubland', 'forest'],
  ['rock', 'tundra', 'snow']
]

const _TERRAIN_COLORS_SAFE: Record<Terrain, string> = {
  scorched: '#7A5C3A',
  grassland: '#8FBE6E',
  swamp: '#3D6B3F',
  desert: '#D9B96C',
  shrubland: '#B5C27A',
  forest: '#4A8F4A',
  rock: '#9E9E9E',
  tundra: '#AEBFB4',
  snow: '#E8EEF0'
}

const LIGHT_LOW = 60
const LIGHT_HIGH = 80

// Grayscale palette — eIdx drives lightness only (moisture ignored)
function terrainGray(eIdx: number): string {
  const l = LIGHT_LOW + (eIdx / 2) * (LIGHT_HIGH - LIGHT_LOW)
  return `hsl(0, 0%, ${Math.round(l)}%)`
}

const TERRAIN_GRAYS = Object.fromEntries(
  BIOME_TABLE.flatMap((row, eIdx) =>
    row.map(terrain => [terrain, terrainGray(eIdx)])
  )
) as Record<Terrain, string>

const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' },
  { label: 'Playground', to: '/playground' },
  { label: 'HexGrid Shapes', to: '/playground/hexGridShapes' }
])

const svgContainer = useTemplateRef('svg-container')
const { width, height } = useElementSize(svgContainer)
const canvasSize = computed(() => ({ width: width.value, height: height.value }))
const viewBox = computed(() => `0 0 ${canvasSize.value.width} ${canvasSize.value.height}`)

// Noise instances — recreated on Regenerate, stable across step calls
let noiseWarpX = createNoise3D()
let noiseWarpY = createNoise3D()
let noiseElev = createNoise3D()
let noiseMoist = createNoise3D()

const elevTime = ref(0)
const moistTime = ref(0)

const hexCells = ref<HexCell[]>([])
const terrainCells = ref<TerrainCell[]>([])
const initialized = ref(false)

function hexPoints(x: number, y: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i + Math.PI / 6
    return `${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`
  }).join(' ')
}

function computeTerrain(cells: HexCell[]): TerrainCell[] {
  return cells.map((cell) => {
    const nx = cell.x * SCALE
    const ny = cell.y * SCALE

    const wx = noiseWarpX(nx, ny, 0) * WARP
    const wy = noiseWarpY(nx, ny, 0) * WARP

    const elevation = (noiseElev((cell.x + wx) * SCALE, (cell.y + wy) * SCALE, elevTime.value) + 1) / 2
    const moisture = (noiseMoist((cell.x + wx) * SCALE, (cell.y + wy) * SCALE, moistTime.value) + 1) / 2

    const eIdx = elevation < 1 / 3 ? 0 : elevation < 2 / 3 ? 1 : 2
    const mIdx = moisture < 1 / 3 ? 0 : moisture < 2 / 3 ? 1 : 2

    return { ...cell, elevation, moisture, terrain: BIOME_TABLE[eIdx]![mIdx]! }
  })
}

function regenerate() {
  const { width, height } = canvasSize.value
  if (!width || !height) return
  noiseWarpX = createNoise3D()
  noiseWarpY = createNoise3D()
  noiseElev = createNoise3D()
  noiseMoist = createNoise3D()
  elevTime.value = 0
  moistTime.value = 0
  hexCells.value = buildHexGrid(width, height, HEX_RADIUS)
  terrainCells.value = computeTerrain(hexCells.value)
}

function stepElevation() {
  elevTime.value += TIME_STEP
  terrainCells.value = computeTerrain(hexCells.value)
}

function stepMoisture() {
  moistTime.value += TIME_STEP
  terrainCells.value = computeTerrain(hexCells.value)
}

function stepBoth() {
  elevTime.value += TIME_STEP
  moistTime.value += TIME_STEP
  terrainCells.value = computeTerrain(hexCells.value)
}

function buildCellMap(cells: TerrainCell[]): Map<string, TerrainCell> {
  return new Map(cells.map(c => [`${c.col},${c.row}`, c]))
}

function getEIdx(elevation: number): number {
  return elevation < 1 / 3 ? 0 : elevation < 2 / 3 ? 1 : 2
}

function detectBlobs(
  cells: TerrainCell[],
  cellMap: Map<string, TerrainCell>
): { blobs: TerrainCell[][], blobOf: Map<string, number> } {
  const visited = new Set<string>()
  const blobs: TerrainCell[][] = []
  const blobOf = new Map<string, number>()

  for (const cell of cells) {
    const key = `${cell.col},${cell.row}`
    if (visited.has(key)) continue
    const eIdx = getEIdx(cell.elevation)
    const blob: TerrainCell[] = []
    const queue: TerrainCell[] = [cell]
    visited.add(key)
    while (queue.length) {
      const cur = queue.shift()!
      blob.push(cur)
      blobOf.set(`${cur.col},${cur.row}`, blobs.length)
      for (const nb of getHexNeighbors(cur, cellMap)) {
        if (!nb) continue
        const nk = `${nb.col},${nb.row}`
        if (!visited.has(nk) && getEIdx(nb.elevation) === eIdx) {
          visited.add(nk)
          queue.push(nb)
        }
      }
    }
    blobs.push(blob)
  }
  return { blobs, blobOf }
}

const cellMap = computed(() => buildCellMap(terrainCells.value))

const blobData = computed(() => {
  if (!terrainCells.value.length) return { blobs: [], blobOf: new Map<string, number>() }
  return detectBlobs(terrainCells.value, cellMap.value)
})

type HexSide = { x1: number, y1: number, x2: number, y2: number }

function buildBlobPolygons(
  cells: TerrainCell[],
  blobOf: Map<string, number>,
  blobCount: number,
  map: Map<string, TerrainCell>
): string[] {
  const pr = (n: number) => Math.round(n * 100) / 100
  const ptKey = (x: number, y: number) => `${pr(x)},${pr(y)}`

  // Step 1: collect external sides per blob
  const sidesByBlob: HexSide[][] = Array.from({ length: blobCount }, () => [])

  for (const cell of cells) {
    const nb = getHexNeighbors(cell, map)
    const cIdx = blobOf.get(`${cell.col},${cell.row}`)!

    for (let e = 0; e < 6; e++) {
      const nCell = nb[e]
      const nIdx = nCell ? blobOf.get(`${nCell.col},${nCell.row}`) : undefined
      if (nIdx !== cIdx) {
        const a1 = (Math.PI / 3) * e + Math.PI / 6
        const a2 = (Math.PI / 3) * (e + 1) + Math.PI / 6
        sidesByBlob[cIdx]!.push({
          x1: cell.x + HEX_RADIUS * Math.cos(a1),
          y1: cell.y + HEX_RADIUS * Math.sin(a1),
          x2: cell.x + HEX_RADIUS * Math.cos(a2),
          y2: cell.y + HEX_RADIUS * Math.sin(a2)
        })
      }
    }
  }

  const paths: string[] = []

  for (const sides of sidesByBlob) {
    if (!sides.length) continue

    // Step 2: build vertex → touching sides map
    const vertexSides = new Map<string, HexSide[]>()
    for (const side of sides) {
      for (const k of [ptKey(side.x1, side.y1), ptKey(side.x2, side.y2)]) {
        if (!vertexSides.has(k)) vertexSides.set(k, [])
        vertexSides.get(k)!.push(side)
      }
    }

    const usedSides = new Set<HexSide>()

    for (const startSide of sides) {
      if (usedSides.has(startSide)) continue

      // Step 3: follow the chain until it closes back
      const pts: [number, number][] = [[startSide.x1, startSide.y1]]
      usedSides.add(startSide)
      let cx = startSide.x2, cy = startSide.y2

      while (true) {
        const vk = ptKey(cx, cy)
        const next = (vertexSides.get(vk) ?? []).find(s => !usedSides.has(s))
        if (!next) break
        pts.push([cx, cy])
        usedSides.add(next)
        ;[cx, cy] = ptKey(next.x1, next.y1) === vk
          ? [next.x2, next.y2]
          : [next.x1, next.y1]
      }

      if (pts.length >= 3) {
        paths.push('M ' + pts.map(([x, y]) => `${x} ${y}`).join(' L ') + ' Z')
      }
    }
  }

  return paths
}

const _blobPaths = computed<string[]>(() => {
  if (!terrainCells.value.length) return []
  const { blobs, blobOf } = blobData.value
  return buildBlobPolygons(terrainCells.value, blobOf, blobs.length, cellMap.value)
})

function lineIntersect(
  ax: number, ay: number, adx: number, ady: number,
  bx: number, by: number, bdx: number, bdy: number
): [number, number] | null {
  const denom = adx * bdy - ady * bdx
  if (Math.abs(denom) < 1e-8) return null
  const t = ((bx - ax) * bdy - (by - ay) * bdx) / denom
  return [ax + t * adx, ay + t * ady]
}

function buildBlobCurvedPaths(
  cells: TerrainCell[],
  blobOf: Map<string, number>,
  blobCount: number,
  map: Map<string, TerrainCell>
): string[] {
  const pr = (n: number) => Math.round(n * 100) / 100
  const ptKey = (x: number, y: number) => `${pr(x)},${pr(y)}`

  const sidesByBlob: HexSide[][] = Array.from({ length: blobCount }, () => [])
  for (const cell of cells) {
    const nb = getHexNeighbors(cell, map)
    const cIdx = blobOf.get(`${cell.col},${cell.row}`)!
    for (let e = 0; e < 6; e++) {
      const nCell = nb[e]
      const nIdx = nCell ? blobOf.get(`${nCell.col},${nCell.row}`) : undefined
      if (nIdx !== cIdx) {
        const a1 = (Math.PI / 3) * e + Math.PI / 6
        const a2 = (Math.PI / 3) * (e + 1) + Math.PI / 6
        sidesByBlob[cIdx]!.push({
          x1: cell.x + HEX_RADIUS * Math.cos(a1),
          y1: cell.y + HEX_RADIUS * Math.sin(a1),
          x2: cell.x + HEX_RADIUS * Math.cos(a2),
          y2: cell.y + HEX_RADIUS * Math.sin(a2)
        })
      }
    }
  }

  const paths: string[] = []

  for (const sides of sidesByBlob) {
    if (!sides.length) continue

    const vertexSides = new Map<string, HexSide[]>()
    for (const side of sides) {
      for (const k of [ptKey(side.x1, side.y1), ptKey(side.x2, side.y2)]) {
        if (!vertexSides.has(k)) vertexSides.set(k, [])
        vertexSides.get(k)!.push(side)
      }
    }

    const usedSides = new Set<HexSide>()

    for (const startSide of sides) {
      if (usedSides.has(startSide)) continue

      const orderedSides: HexSide[] = [startSide]
      usedSides.add(startSide)
      let curX = startSide.x2, curY = startSide.y2

      while (true) {
        const vk = ptKey(curX, curY)
        const next = (vertexSides.get(vk) ?? []).find(s => !usedSides.has(s))
        if (!next) break
        usedSides.add(next)
        orderedSides.push(next)
        ;[curX, curY] = ptKey(next.x1, next.y1) === vk
          ? [next.x2, next.y2]
          : [next.x1, next.y1]
      }

      if (orderedSides.length < 3) continue

      const n = orderedSides.length
      const mids = orderedSides.map((s) => {
        const mx = (s.x1 + s.x2) / 2
        const my = (s.y1 + s.y2) / 2
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1
        return { mx, my, ndx: -dy, ndy: dx }
      })

      let d = `M ${pr(mids[0]!.mx)} ${pr(mids[0]!.my)}`

      for (let i = 0; i < n; i++) {
        const m1 = mids[i]!
        const m2 = mids[(i + 1) % n]!

        const center = lineIntersect(
          m1.mx, m1.my, m1.ndx, m1.ndy,
          m2.mx, m2.my, m2.ndx, m2.ndy
        )

        if (!center) {
          d += ` L ${pr(m2.mx)} ${pr(m2.my)}`
          continue
        }

        const [pcx, pcy] = center
        const r = Math.sqrt((m1.mx - pcx) ** 2 + (m1.my - pcy) ** 2)
        const cross = (m1.mx - pcx) * (m2.my - pcy) - (m1.my - pcy) * (m2.mx - pcx)
        const sweep = cross > 0 ? 1 : 0

        d += ` A ${pr(r)} ${pr(r)} 0 0 ${sweep} ${pr(m2.mx)} ${pr(m2.my)}`
      }

      d += ' Z'
      paths.push(d)
    }
  }

  return paths
}

const _blobCurvedPath = computed<string[]>(() => {
  if (!terrainCells.value.length) return []
  const { blobs, blobOf } = blobData.value
  return buildBlobCurvedPaths(terrainCells.value, blobOf, blobs.length, cellMap.value)
})

function buildBlobBezierPaths(
  cells: TerrainCell[],
  blobOf: Map<string, number>,
  blobCount: number,
  map: Map<string, TerrainCell>
): string[] {
  const INRADIUS = HEX_RADIUS * Math.sqrt(3) / 2
  // Bézier handle length for a 60° circular arc approximation
  const HANDLE = (4 / 3) * Math.tan(Math.PI / 12) * INRADIUS

  const pr = (n: number) => Math.round(n * 100) / 100
  const ptKey = (x: number, y: number) => `${pr(x)},${pr(y)}`

  const sidesByBlob: HexSide[][] = Array.from({ length: blobCount }, () => [])
  for (const cell of cells) {
    const nb = getHexNeighbors(cell, map)
    const cIdx = blobOf.get(`${cell.col},${cell.row}`)!
    for (let e = 0; e < 6; e++) {
      const nCell = nb[e]
      const nIdx = nCell ? blobOf.get(`${nCell.col},${nCell.row}`) : undefined
      if (nIdx !== cIdx) {
        const a1 = (Math.PI / 3) * e + Math.PI / 6
        const a2 = (Math.PI / 3) * (e + 1) + Math.PI / 6
        sidesByBlob[cIdx]!.push({
          x1: cell.x + HEX_RADIUS * Math.cos(a1),
          y1: cell.y + HEX_RADIUS * Math.sin(a1),
          x2: cell.x + HEX_RADIUS * Math.cos(a2),
          y2: cell.y + HEX_RADIUS * Math.sin(a2)
        })
      }
    }
  }

  const paths: string[] = []

  for (const sides of sidesByBlob) {
    if (!sides.length) continue

    const vertexSides = new Map<string, HexSide[]>()
    for (const side of sides) {
      for (const key of [ptKey(side.x1, side.y1), ptKey(side.x2, side.y2)]) {
        if (!vertexSides.has(key)) vertexSides.set(key, [])
        vertexSides.get(key)!.push(side)
      }
    }

    const usedSides = new Set<HexSide>()

    for (const startSide of sides) {
      if (usedSides.has(startSide)) continue

      const chain: Array<{ side: HexSide, forward: boolean }> = [{ side: startSide, forward: true }]
      usedSides.add(startSide)
      let curX = startSide.x2, curY = startSide.y2

      while (true) {
        const vk = ptKey(curX, curY)
        const next = (vertexSides.get(vk) ?? []).find(s => !usedSides.has(s))
        if (!next) break
        usedSides.add(next)
        const forward = ptKey(next.x1, next.y1) === vk
        chain.push({ side: next, forward })
        curX = forward ? next.x2 : next.x1
        curY = forward ? next.y2 : next.y1
      }

      if (chain.length < 3) continue

      const nn = chain.length
      const nodes = chain.map(({ side, forward }) => {
        const mx = (side.x1 + side.x2) / 2
        const my = (side.y1 + side.y2) / 2
        const dx = forward ? side.x2 - side.x1 : side.x1 - side.x2
        const dy = forward ? side.y2 - side.y1 : side.y1 - side.y2
        const len = Math.sqrt(dx * dx + dy * dy)
        return { mx, my, tx: dx / len, ty: dy / len }
      })

      const m0 = nodes[0]!
      let d = `M ${pr(m0.mx)} ${pr(m0.my)}`

      for (let i = 0; i < nn; i++) {
        const na = nodes[i]!
        const nb = nodes[(i + 1) % nn]!
        const p1x = na.mx + HANDLE * na.tx
        const p1y = na.my + HANDLE * na.ty
        const p2x = nb.mx - HANDLE * nb.tx
        const p2y = nb.my - HANDLE * nb.ty
        d += ` C ${pr(p1x)} ${pr(p1y)} ${pr(p2x)} ${pr(p2y)} ${pr(nb.mx)} ${pr(nb.my)}`
      }

      d += ' Z'
      paths.push(d)
    }
  }

  return paths
}

const blobBezierPath = computed<string[]>(() => {
  if (!terrainCells.value.length) return []
  const { blobs, blobOf } = blobData.value
  return buildBlobBezierPaths(terrainCells.value, blobOf, blobs.length, cellMap.value)
})

function createHexPath(
  startRow: number, startCol: number,
  endRow: number, endCol: number,
  minElevation: number, maxElevation: number
): TerrainCell[] {
  return findHexPath(
    startCol, startRow,
    endCol, endRow,
    cellMap.value,
    cell => cell.elevation >= minElevation && cell.elevation <= maxElevation
  )
}

const hexRiver = ref<TerrainCell[]>([])

function createRiver() {
  const cells = terrainCells.value
  if (!cells.length) return

  const MIN_ELEV = 1 / 3
  const MAX_ELEV = 2 / 3

  const maxCol = Math.max(...cells.map(c => c.col))

  const startCandidates = cells.filter(c => c.col === 0 && c.elevation >= MIN_ELEV && c.elevation <= MAX_ELEV)
  const endCandidates = cells.filter(c => c.col === maxCol && c.elevation >= MIN_ELEV && c.elevation <= MAX_ELEV)

  if (!startCandidates.length || !endCandidates.length) {
    hexRiver.value = []
    return
  }

  const start = startCandidates[Math.floor(Math.random() * startCandidates.length)]!
  const end = endCandidates[Math.floor(Math.random() * endCandidates.length)]!

  hexRiver.value = createHexPath(start.row, start.col, end.row, end.col, MIN_ELEV, MAX_ELEV)
}

function buildRiverLowerPath(
  riverCells: TerrainCell[],
  map: Map<string, TerrainCell>
): string[] {
  if (!riverCells.length) return []

  const INRADIUS = HEX_RADIUS * Math.sqrt(3) / 2
  const HANDLE = (4 / 3) * Math.tan(Math.PI / 12) * INRADIUS
  const pr = (n: number) => Math.round(n * 100) / 100
  const ptKey = (x: number, y: number) => `${pr(x)},${pr(y)}`
  const riverKeys = new Set(riverCells.map(c => `${c.col},${c.row}`))
  const sides: HexSide[] = []

  for (const cell of riverCells) {
    const neighbors = getHexNeighbors(cell, map)
    for (let e = 0; e < 6; e++) {
      const nCell = neighbors[e]
      if (!nCell || !riverKeys.has(`${nCell.col},${nCell.row}`)) {
        const a1 = (Math.PI / 3) * e + Math.PI / 6
        const a2 = (Math.PI / 3) * (e + 1) + Math.PI / 6
        sides.push({
          x1: cell.x + HEX_RADIUS * Math.cos(a1),
          y1: cell.y + HEX_RADIUS * Math.sin(a1),
          x2: cell.x + HEX_RADIUS * Math.cos(a2),
          y2: cell.y + HEX_RADIUS * Math.sin(a2)
        })
      }
    }
  }

  if (!sides.length) return []

  const vertexSides = new Map<string, HexSide[]>()
  for (const side of sides) {
    for (const k of [ptKey(side.x1, side.y1), ptKey(side.x2, side.y2)]) {
      if (!vertexSides.has(k)) vertexSides.set(k, [])
      vertexSides.get(k)!.push(side)
    }
  }

  type Node = { mx: number, my: number, tx: number, ty: number }

  const usedSides = new Set<HexSide>()
  const paths: string[] = []

  for (const startSide of sides) {
    if (usedSides.has(startSide)) continue

    const chain: Array<{ side: HexSide, forward: boolean }> = [{ side: startSide, forward: true }]
    usedSides.add(startSide)
    let curX = startSide.x2, curY = startSide.y2

    while (true) {
      const vk = ptKey(curX, curY)
      const next = (vertexSides.get(vk) ?? []).find(s => !usedSides.has(s))
      if (!next) break
      usedSides.add(next)
      const forward = ptKey(next.x1, next.y1) === vk
      chain.push({ side: next, forward })
      curX = forward ? next.x2 : next.x1
      curY = forward ? next.y2 : next.y1
    }

    const isClosed = ptKey(curX, curY) === ptKey(startSide.x1, startSide.y1)
    if (chain.length < 3) continue

    const nodes: Node[] = chain.map(({ side, forward }) => {
      const mx = (side.x1 + side.x2) / 2
      const my = (side.y1 + side.y2) / 2
      const dx = forward ? side.x2 - side.x1 : side.x1 - side.x2
      const dy = forward ? side.y2 - side.y1 : side.y1 - side.y2
      const len = Math.sqrt(dx * dx + dy * dy)
      return { mx, my, tx: dx / len, ty: dy / len }
    })

    const bezierPath = (chain: Node[]) => {
      if (chain.length < 2) return ''
      const m0 = chain[0]!
      let d = `M ${pr(m0.mx)} ${pr(m0.my)}`
      for (let i = 0; i < chain.length - 1; i++) {
        const na = chain[i]!, nb = chain[i + 1]!
        d += ` C ${pr(na.mx + HANDLE * na.tx)} ${pr(na.my + HANDLE * na.ty)}`
        d += ` ${pr(nb.mx - HANDLE * nb.tx)} ${pr(nb.my - HANDLE * nb.ty)}`
        d += ` ${pr(nb.mx)} ${pr(nb.my)}`
      }
      return d
    }

    if (isClosed) {
      const nn = nodes.length
      // Find split points: leftmost (min mx, then max my) and rightmost (max mx, then max my)
      let li = 0, ri = 0
      for (let i = 1; i < nn; i++) {
        if (nodes[i]!.mx < nodes[li]!.mx || (nodes[i]!.mx === nodes[li]!.mx && nodes[i]!.my > nodes[li]!.my)) li = i
        if (nodes[i]!.mx > nodes[ri]!.mx || (nodes[i]!.mx === nodes[ri]!.mx && nodes[i]!.my > nodes[ri]!.my)) ri = i
      }
      // Extract two sub-chains; negate tangents when traversing backward
      const buildSub = (from: number, dir: 1 | -1): Node[] => {
        const result: Node[] = []
        for (let i = from, s = 0; s <= nn; i = (i + dir + nn) % nn, s++) {
          const nd = nodes[i]!
          result.push(dir === 1 ? nd : { ...nd, tx: -nd.tx, ty: -nd.ty })
          if (i === ri) break
        }
        return result
      }
      const sub1 = buildSub(li, 1)
      const sub2 = buildSub(li, -1)
      const avgY = (ch: Node[]) => ch.reduce((s, n) => s + n.my, 0) / ch.length
      const lower = avgY(sub1) >= avgY(sub2) ? sub1 : sub2
      const d = bezierPath(lower)
      if (d) paths.push(d)
    } else {
      const d = bezierPath(nodes)
      if (d) paths.push(d)
    }
  }

  return paths
}

const riverPath = computed<string[]>(() => buildRiverLowerPath(hexRiver.value, cellMap.value))

watch(canvasSize, (size) => {
  if (!initialized.value && size.width > 0 && size.height > 0) {
    initialized.value = true
    regenerate()
  }
})
</script>

<style>
</style>
