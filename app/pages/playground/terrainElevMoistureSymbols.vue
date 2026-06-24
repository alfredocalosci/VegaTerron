<template>
  <div ref="svg-container" class="relative w-screen h-screen overflow-hidden bg-black">
    <svg
      class="absolute inset-0 w-full h-full"
      :viewBox="viewBox"
      :width="canvasSize.width"
      :height="canvasSize.height"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
      <symbol id="scorched" viewBox="0 0 24 24">
        <!-- small dot -->
       <path d="M10.5 12C10.5 11.171573 11.171573 10.5 12 10.5C12.82843 10.5 13.5 11.171573 13.5 12C13.5 12.82843 12.82843 13.5 12 13.5C11.171573 13.5 10.5 12.82843 10.5 12Z" fill="currentColor" fill-rule="evenodd" />

      </symbol>

      <symbol id="grassland" viewBox="0 0 24 24">
        <!-- diagonal line -->
       <path d="M16.948 5.638L5.636 16.95L7.05 18.364L18.362 7.052Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="swamp" viewBox="0 0 24 24">
        <!-- 3 dots -->
       <path
          d="M15 16.5C15 15.671573 15.671573 15 16.5 15C17.32843 15 18 15.671573 18 16.5C18 17.32843 17.32843 18 16.5 18C15.671573 18 15 17.32843 15 16.5Z M6 16.5C6 15.671573 6.671573 15 7.5 15C8.32843 15 9 15.671573 9 16.5C9 17.32843 8.32843 18 7.5 18C6.671573 18 6 17.32843 6 16.5Z  M10.5 8.5C10.5 7.671573 11.171573 7 12 7C12.82843 7 13.5 7.671573 13.5 8.5C13.5 9.32843 12.82843 10 12 10C11.171573 10 10.5 9.32843 10.5 8.5Z"
          fill="currentColor"
          fill-rule="evenodd"
        />

      </symbol>

      <symbol id="desert" viewBox="0 0 24 24">
        <path d="M20 11L4 11L4 13L20 13Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="shrubland" viewBox="0 0 24 24">
        <path d="M3.338 19.373L11.997 10.577L21.414 20.082L19.993 21.489L18.592 20.075L12.002 13.423L4.061 21.489L2.636 20.086Z" fill="currentColor" fill-rule="evenodd" />

      </symbol>

      <symbol id="forest" viewBox="0 0 24 24">
        <path d="M11 11.59L11 3.5L13 3.5L13 11.589L21.414 20.082L19.993 21.489L12.002 13.423L4.061 21.489L2.636 20.086L3.338 19.373Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="rock" viewBox="0 0 24 24">
         <path d="M13 13L13 20L11 20L11 13L4 13L4 11L11 11L11 4L13 4L13 11L20 11L20 13Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="tundra" viewBox="0 0 24 24">
         <path d="M12 13.412L6.344 19.068L4.93 17.654L10.586 12L4.93 6.342L6.344 4.928L12 10.584L17.656 4.928L19.07 6.342L13.414 12L19.07 17.654L17.656 19.068Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol id="snow" viewBox="0 0 24 24">
        <path d="M13 13.598L13 20L11 20L11 13.598L5.572 16.732L4.572 15L9 11.866L4.572 8.732L5.572 7L11 10.134L11 4L13 4L13 10.134L18.428 7L19.428 8.732L14 11.866L19.428 15L18.428 16.732Z" fill="currentColor" fill-rule="evenodd" />
      </symbol>

      <symbol v-for="icon in ICONS" :id="`icon-${icon.name}`" :key="icon.name" viewBox="0 0 24 24">
        <g v-html="icon.content" />
      </symbol>

      </defs>

      <!-- symbol version: -->
      <g>
          <use
            v-for="cell in terrainCells"
            :key="`sym-${cell.col}-${cell.row}`"
            :href="`#${cell.terrain}`"
            :x="cell.x - HEX_RADIUS / 2"
            :y="cell.y - HEX_RADIUS / 2"
            :width="HEX_RADIUS*1.2"
            :height="HEX_RADIUS*1.2"
             style="color: #999"
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
          class="fill-black"
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
            class="fill-black"
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

    <div class="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 bg-gray-800 shadow-md px-4 py-2 z-10">
      <UBreadcrumb :items="items" />
    </div>

    <div class="absolute bottom-4 right-4 bg-gray-900 px-4 py-3 z-10 flex flex-col gap-1.5 text-xs text-gray-400">
      <p class="text-gray-300 uppercase text-[10px] mb-1">Terrain</p>
      <div v-for="terrain in BIOME_TABLE.flat()" :key="terrain" class="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" class="shrink-0 text-gray-400">
          <use :href="`#${terrain}`" />
        </svg>
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
import { buildHexGrid, buildHexText } from '~/utils/hexgrid'
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

const HEX_RADIUS = 14 // 14
const SCALE = 0.0025
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

watch(canvasSize, (size) => {
  if (!initialized.value && size.width > 0 && size.height > 0) {
    initialized.value = true
    regenerate()
  }
})
</script>

<style>
</style>
