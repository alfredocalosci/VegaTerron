<template>
  <div ref="svg-container" class="relative w-screen h-screen overflow-hidden bg-black">
    <svg
      class="absolute inset-0 w-full h-full"
      :viewBox="viewBox"
      :width="canvasSize.width"
      :height="canvasSize.height"
      preserveAspectRatio="xMidYMid meet"
    >
      <g>
        <polygon
          v-for="cell in terrainCells"
          :key="`${cell.col}-${cell.row}`"
          :points="hexPoints(cell.x, cell.y, HEX_RADIUS)"
          :fill="TERRAIN_COLORS[cell.terrain]"
          stroke="rgba(0,0,0,0.2)"
          stroke-width="0.5"
        />
      </g>
    </svg>

    <div class="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 bg-gray-800 shadow-md px-4 py-2 z-10">
      <UBreadcrumb :items="items" />
    </div>

    <div class="absolute bottom-4 right-4 bg-gray-900 px-4 py-3 z-10 flex flex-col gap-1.5 text-xs text-gray-300">
      <p class="text-gray-500 uppercase text-[10px] mb-1">Terrain</p>
      <div v-for="(color, terrain) in TERRAIN_COLORS" :key="terrain" class="flex items-center gap-2">
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
    </div>
  </div>
</template>

<script lang="ts" setup>
import { createNoise3D } from 'simplex-noise'
import type { BreadcrumbItem } from '@nuxt/ui'
import { useTemplateRef, ref, watch, computed } from 'vue'
import { useElementSize } from '@vueuse/core'
import { buildHexGrid } from '~/utils/hexgrid'
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

// Palette variables — tweak to explore
const HUE_DRY = 220 // blue (dry cols)
const HUE_WET = 140 // green (wet cols)
const LIGHT_LOW = 30 // % darkness (low elevation rows)
const LIGHT_HIGH = 80 // % lightness (high elevation rows)
const SATURATION = 40 // % saturation across all cells

function terrainHSL(eIdx: number, mIdx: number): string {
  const h = HUE_DRY + (mIdx / 2) * (HUE_WET - HUE_DRY)
  const l = LIGHT_LOW + (eIdx / 2) * (LIGHT_HIGH - LIGHT_LOW)
  return `hsl(${Math.round(h)}, ${SATURATION}%, ${Math.round(l)}%)`
}

// Derives colors from BIOME_TABLE grid position: eIdx → lightness, mIdx → hue
const TERRAIN_COLORS = Object.fromEntries(
  BIOME_TABLE.flatMap((row, eIdx) =>
    row.map((terrain, mIdx) => [terrain, terrainHSL(eIdx, mIdx)])
  )
) as Record<Terrain, string>

const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' },
  { label: 'Playground', to: '/playground' },
  { label: 'Terrain Elev/Moisture', to: '/playground/terrainElevMoisture' }
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

watch(canvasSize, (size) => {
  if (!initialized.value && size.width > 0 && size.height > 0) {
    initialized.value = true
    regenerate()
  }
})
</script>

<style>
</style>
