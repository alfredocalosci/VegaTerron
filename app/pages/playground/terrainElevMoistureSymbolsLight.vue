<template>
  <div ref="svg-container" class="relative w-screen h-screen overflow-hidden bg-mist-700">
    <svg
      class="absolute inset-0 w-full h-full"
      :viewBox="viewBox"
      :width="canvasSize.width"
      :height="canvasSize.height"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
      <symbol id="scorched-l" viewBox="0 0 24 24">
        <!-- small dot -->
       <path d="M10.5 12C10.5 11.171573 11.171573 10.5 12 10.5C12.82843 10.5 13.5 11.171573 13.5 12C13.5 12.82843 12.82843 13.5 12 13.5C11.171573 13.5 10.5 12.82843 10.5 12Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="grassland-l" viewBox="0 0 24 24">
        <!-- diagonal line -->
       <path d="M16.948 5.638L5.636 16.95L7.05 18.364L18.362 7.052Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="swamp-l" viewBox="0 0 24 24">
        <!-- 3 dots -->
       <path
          d="M15 16.5C15 15.671573 15.671573 15 16.5 15C17.32843 15 18 15.671573 18 16.5C18 17.32843 17.32843 18 16.5 18C15.671573 18 15 17.32843 15 16.5Z M6 16.5C6 15.671573 6.671573 15 7.5 15C8.32843 15 9 15.671573 9 16.5C9 17.32843 8.32843 18 7.5 18C6.671573 18 6 17.32843 6 16.5Z  M10.5 8.5C10.5 7.671573 11.171573 7 12 7C12.82843 7 13.5 7.671573 13.5 8.5C13.5 9.32843 12.82843 10 12 10C11.171573 10 10.5 9.32843 10.5 8.5Z"
          fill="currentColor"
          fill-rule="evenodd"
        />
      </symbol>

      <symbol id="desert-l" viewBox="0 0 24 24">
        <path d="M20 11L4 11L4 13L20 13Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="shrubland-l" viewBox="0 0 24 24">
        <path d="M3.338 19.373L11.997 10.577L21.414 20.082L19.993 21.489L18.592 20.075L12.002 13.423L4.061 21.489L2.636 20.086Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="forest-l" viewBox="0 0 24 24">
        <path d="M11 11.59L11 3.5L13 3.5L13 11.589L21.414 20.082L19.993 21.489L12.002 13.423L4.061 21.489L2.636 20.086L3.338 19.373Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="rock-l" viewBox="0 0 24 24">
        <path d="M13 13L13 20L11 20L11 13L4 13L4 11L11 11L11 4L13 4L13 11L20 11L20 13Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="tundra-l" viewBox="0 0 24 24">
        <path d="M12 13.412L6.344 19.068L4.93 17.654L10.586 12L4.93 6.342L6.344 4.928L12 10.584L17.656 4.928L19.07 6.342L13.414 12L19.07 17.654L17.656 19.068Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="snow-l" viewBox="0 0 24 24">
        <path d="M13 13.598L13 20L11 20L11 13.598L5.572 16.732L4.572 15L9 11.866L4.572 8.732L5.572 7L11 10.134L11 4L13 4L13 10.134L18.428 7L19.428 8.732L14 11.866L19.428 15L18.428 16.732Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

       <symbol v-for="icon in ICONS" :id="`icon-${icon.name}`" :key="icon.name" viewBox="0 0 24 24">
        <g v-html="icon.content" />
      </symbol>

      </defs>

      <!-- Blob Bézier outlines -->
      <g>
        <path
          v-for="(item, i) in blobBezierPath"
          :key="`bezier-${i}`"
          :d="item.d"
          :fill="ELEV_FILL_COLORS[item.eIdx]"
          :stroke="ELEV_FILL_COLORS[item.eIdx]"
          stroke-width="0.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>

      <!-- symbol version: -->
      <g>
          <use
            v-for="cell in terrainCells"
            :key="`sym-${cell.col}-${cell.row}`"
            :href="`#${cell.terrain}-l`"
            :x="cell.x - HEX_RADIUS / 2"
            :y="cell.y - HEX_RADIUS / 2"
            :width="HEX_RADIUS * 1.2"
            :height="HEX_RADIUS * 1.2"
            class="text-mist-500"
          />
      </g>

      <!-- River: stroke="rgba(80,180,255,0.9)" -->
      <g>
        <path
          v-for="(d, i) in riverPath"
          :key="`river-${i}`"
          :d="d"
          fill="none"
          stroke="#7dd3fc"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>

       <!-- icon layer -->
      <g>
        <circle
          v-for="p in iconPlacements"
          :key="`icon-bg-${p.name}`"
          :cx="p.x"
          :cy="p.y"
          :r="HEX_RADIUS"
          class="fill-mist-700"
        />

        <use
          v-for="p in iconPlacements"
          :key="`icon-${p.name}`"
          :href="`#icon-${p.name}`"
          :x="p.x - HEX_RADIUS"
          :y="p.y - HEX_RADIUS"
          :width="HEX_RADIUS * 2"
          :height="HEX_RADIUS * 2"
          class="text-white"
        />
      </g>

        <!-- text overlay -->
      <g>
        <g v-for="(cell, i) in hexText" :key="`txt-${i}`">
          <circle
            v-if="cell.char !== ' '"
            :cx="cell.x"
            :cy="cell.y"
            :r="HEX_RADIUS * 0.75"
            class="fill-mist-700"
          />
          <text
            v-if="cell.char !== ' '"
            :x="cell.x"
            :y="cell.y"
            dominant-baseline="middle"
            text-anchor="middle"
            :font-size="HEX_RADIUS"
            dy="0.25em"

            class="font-mono font-bold uppercase fill-white"
          >{{ cell.char }}</text>
        </g>
      </g>

    </svg>

    <div class="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 bg-mist-700 shadow-md px-4 py-2 z-10">
      <UBreadcrumb :items="items" />
    </div>

    <div class="absolute bottom-4 right-4 bg-mist-700 px-4 py-3 z-10 flex flex-col gap-1.5 text-xs text-mist-300">
      <p class="text-mist-100 uppercase text-[10px] mb-1">Terrain</p>
      <div v-for="terrain in BIOME_TABLE.flat()" :key="terrain" class="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" class="shrink-0 text-mist-200">
          <use :href="`#${terrain}-l`" class="text-mist-200"/>
        </svg>
        {{ terrain }}
      </div>
    </div>

    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-mist-700 shadow-sm px-4 py-2 z-10 flex items-center gap-3 text-gray-400">
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
import { buildHexGrid, buildHexText, getHexNeighbors, findHexPath } from '~/utils/hexgrid'
import type { HexCell, TextCell } from '~/utils/hexgrid'

import cowSvg from '~~/public/svg/icons/cow.svg?raw'
import citySvg from '~~/public/svg/icons/city.svg?raw'
import wheatSvg from '~~/public/svg/icons/wheat.svg?raw'
import pigSvg from '~~/public/svg/icons/pig.svg?raw'
import busSvg from '~~/public/svg/icons/bus.svg?raw'
import anchorSvg from '~~/public/svg/icons/anchor.svg?raw'
import compassSvg from '~~/public/svg/icons/compass.svg?raw'
import tractorSvg from '~~/public/svg/icons/tractor.svg?raw'
import treeSvg from '~~/public/svg/icons/tree.svg?raw'
import manSvg from '~~/public/svg/icons/man.svg?raw'

type Terrain = 'scorched' | 'grassland' | 'swamp' | 'desert' | 'shrubland' | 'forest' | 'rock' | 'tundra' | 'snow'

interface TerrainCell extends HexCell {
  terrain: Terrain
  elevation: number
  moisture: number
}

const HEX_RADIUS = 12 // 14
const SCALE = 0.0025
const ELEV_FILL_COLORS = ['#394447', '#22292b', '#161b1d'].reverse() // mist-700, mist-800, mist-900
const WARP = 100
const TIME_STEP = 0.01

const BIOME_TABLE: Terrain[][] = [
  ['scorched', 'grassland', 'swamp'],
  ['desert', 'shrubland', 'forest'],
  ['rock', 'tundra', 'snow']
]

const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' },
  { label: 'Playground', to: '/playground' },
  { label: 'Terrain Elev/Moisture Light', to: '/playground/terrainElevMoistureSymbolsLight' }
])

const svgContainer = useTemplateRef('svg-container')
const { width, height } = useElementSize(svgContainer)
const canvasSize = computed(() => ({ width: width.value, height: height.value }))
const viewBox = computed(() => `0 0 ${canvasSize.value.width} ${canvasSize.value.height}`)

let noiseWarpX = createNoise3D()
let noiseWarpY = createNoise3D()
let noiseElev = createNoise3D()
let noiseMoist = createNoise3D()

const elevTime = ref(0)
const moistTime = ref(0)

const hexCells = ref<HexCell[]>([])
const terrainCells = ref<TerrainCell[]>([])
const initialized = ref(false)

const ICONS = [
  { name: 'cow', raw: cowSvg },
  { name: 'city', raw: citySvg },
  { name: 'wheat', raw: wheatSvg },
  { name: 'pig', raw: pigSvg },
  { name: 'bus', raw: busSvg },
  { name: 'anchor', raw: anchorSvg },
  { name: 'compass', raw: compassSvg },
  { name: 'tractor', raw: tractorSvg },
  { name: 'tree', raw: treeSvg },
  { name: 'man', raw: manSvg }
].map(icon => ({
  name: icon.name,
  content: icon.raw.replace(/<svg[^>]*>/, '').replace('</svg>', '').trim()
}))

const iconPlacements = computed(() => {
  const cells = hexCells.value
  if (!cells.length) return []
  const used = new Set<number>()
  return ICONS.map((icon) => {
    let idx: number
    do {
      idx = Math.floor(Math.random() * cells.length)
    } while (used.has(idx))
    used.add(idx)
    const cell = cells[idx]!
    return { name: icon.name, x: cell.x, y: cell.y }
  })
})

const HEX_LABELS: { col: number, row: number, text: string }[] = [
  { col: 4, row: 24, text: 'Hic Sunt' },
  { col: 4, row: 25, text: 'Leones' },
  { col: 20, row: 12, text: 'Lorem' },
  { col: 20, row: 13, text: 'Ipsum' }
]

const hexText = computed<TextCell[]>(() =>
  HEX_LABELS.flatMap(({ col, row, text }) => buildHexText(col, row, text, HEX_RADIUS))
)

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

type HexSide = { x1: number, y1: number, x2: number, y2: number }

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
  if (!terrainCells.value.length) return { blobs: [] as TerrainCell[][], blobOf: new Map<string, number>() }
  return detectBlobs(terrainCells.value, cellMap.value)
})

function buildBlobBezierPaths(
  cells: TerrainCell[],
  blobOf: Map<string, number>,
  blobs: TerrainCell[][],
  map: Map<string, TerrainCell>
): { d: string, eIdx: number }[] {
  const INRADIUS = HEX_RADIUS * Math.sqrt(3) / 2
  const HANDLE = (4 / 3) * Math.tan(Math.PI / 12) * INRADIUS
  const pr = (n: number) => Math.round(n * 100) / 100
  const ptKey = (x: number, y: number) => `${pr(x)},${pr(y)}`

  const sidesByBlob: HexSide[][] = Array.from({ length: blobs.length }, () => [])
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

  const paths: { d: string, eIdx: number }[] = []

  for (const [blobIdx, sides] of sidesByBlob.entries()) {
    if (!sides.length) continue
    const eIdx = getEIdx(blobs[blobIdx]![0]!.elevation)

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
      paths.push({ d, eIdx })
    }
  }

  return paths
}

const blobBezierPath = computed<{ d: string, eIdx: number }[]>(() => {
  if (!terrainCells.value.length) return []
  const { blobs, blobOf } = blobData.value
  return buildBlobBezierPaths(terrainCells.value, blobOf, blobs, cellMap.value)
})

const hexRiver = ref<TerrainCell[]>([])

function createRiver() {
  const cells = terrainCells.value
  if (!cells.length) return

  const MIN_ELEV = 1 / 3
  const MAX_ELEV = 2 / 3

  const maxCol = Math.max(...cells.map(c => c.col))
  const maxRow = Math.max(...cells.map(c => c.row))

  const startCandidates = cells.filter(c => c.col === 0 && c.elevation >= MIN_ELEV && c.elevation <= MAX_ELEV)

  // const endCandidates = cells.filter(c => c.col === maxCol && c.elevation >= MIN_ELEV && c.elevation <= MAX_ELEV)

  const endCandidates = cells.filter(c => c.col > maxCol / 2 && c.row === maxRow && c.elevation >= MIN_ELEV && c.elevation <= MAX_ELEV)

  if (!startCandidates.length || !endCandidates.length) {
    hexRiver.value = []
    return
  }

  const start = startCandidates[Math.floor(Math.random() * startCandidates.length)]!
  const end = endCandidates[Math.floor(Math.random() * endCandidates.length)]!

  hexRiver.value = findHexPath(
    start.col, start.row,
    end.col, end.row,
    cellMap.value,
    cell => cell.elevation >= MIN_ELEV && cell.elevation <= MAX_ELEV
  )
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
      let li = 0, ri = 0
      for (let i = 1; i < nn; i++) {
        if (nodes[i]!.mx < nodes[li]!.mx || (nodes[i]!.mx === nodes[li]!.mx && nodes[i]!.my > nodes[li]!.my)) li = i
        if (nodes[i]!.mx > nodes[ri]!.mx || (nodes[i]!.mx === nodes[ri]!.mx && nodes[i]!.my > nodes[ri]!.my)) ri = i
      }
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
