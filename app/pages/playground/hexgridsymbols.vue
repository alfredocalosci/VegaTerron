<template>
  <div ref="svg-container" class="relative w-screen h-screen overflow-hidden bg-white">
    <svg
      ref="svgEl"
      class="absolute inset-0 w-full h-full"
      :viewBox="viewBox"
      :width="canvasSize.width"
      :height="canvasSize.height"
      preserveAspectRatio="xMidYMid meet"
    >
    <defs>
      <symbol id="sym-0" viewBox="0 0 24 24">
        <!-- small dot -->
        <circle cx="12" cy="12" r="6" fill="currentColor"/>
      </symbol>
      <symbol id="sym-1" viewBox="0 0 24 24">
        <!-- small square -->
        <rect x="5" y="5" width="14" height="14" fill="currentColor"/>
      </symbol>
      <symbol id="sym-2" viewBox="0 0 24 24">
        <!-- triangle -->
        <polygon points="12,2 22,22 2,22" fill="currentColor"/>
      </symbol>
      <symbol id="sym-3" viewBox="0 0 24 24">
        <!-- inverted triangle -->
        <polygon points="12,22 22,2 2,2" fill="currentColor"/>
      </symbol>
      <symbol id="sym-4" viewBox="0 0 24 24">
        <!-- diamond -->
        <polygon points="12,2 22,12 12,22 2,12" fill="currentColor"/>
      </symbol>
      <symbol id="sym-5" viewBox="0 0 24 24">
        <!-- hexagon -->
        <polygon points="12,3 19.8,7.5 19.8,16.5 12,21 4.2,16.5 4.2,7.5" fill="currentColor"/>
      </symbol>
      <symbol id="sym-6" viewBox="0 0 24 24">
        <path d="M12,3 L12,21 M3,12 L21,12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </symbol>
      <symbol id="sym-7" viewBox="0 0 24 24">
        <!-- cross -->
        <path d="M4,4 L20,20 M20,4 L4,20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </symbol>
      <symbol id="sym-8" viewBox="0 0 24 24">
        <!-- circle -->
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/>
      </symbol>
      <symbol id="sym-9" viewBox="0 0 24 24">
        <!-- square -->
        <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"/>
      </symbol>
      <symbol id="sym-10" viewBox="0 0 24 24">
        <!-- semicircle -->
        <path d="M3,12 A9,9 0 0,1 21,12 Z" fill="currentColor"/>
      </symbol>
      <symbol id="sym-11" viewBox="0 0 24 24">
        <!-- small circle -->
        <circle cx="12" cy="12" r="4" fill="currentColor"/>
      </symbol>
      <symbol id="sym-12" viewBox="0 0 24 24">
        <rect x="2" y="9" width="20" height="6" fill="currentColor"/>
      </symbol>
      <symbol id="sym-13" viewBox="0 0 24 24">
        <rect x="9" y="2" width="6" height="20" fill="currentColor"/>
      </symbol>
      <symbol id="sym-14" viewBox="0 0 24 24">
        <path d="M3,19 L12,5 L21,19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </symbol>
      <symbol id="sym-15" viewBox="0 0 24 24">
        <polygon points="12,3 13.8,10.2 21,12 13.8,13.8 12,21 10.2,13.8 3,12 10.2,10.2" fill="currentColor"/>
      </symbol>
    </defs>

    <!-- hex grid cells rendered as symbols by noiseIndex -->
    <g>

      <!--
      <circle
        v-for="cell in cellNoiseValues"
        :key="`${cell.col}-${cell.row}`"
        :cx="cell.x"
        :cy="cell.y"
        :r="GRID_RADIUS * 0.75"
        fill="#ccc"
        :stroke="'none'"

      />
      -->

      <!-- shades of gray: :style="{ color: `oklch(${0.2 + cell.noise * 0.6} 0 0)` }"-->
      <use
        v-for="cell in cellNoiseValues"
        :key="`${cell.col}-${cell.row}`"
        :href="`#${SYMBOL_IDS[cell.noiseIndex]}`"
        :x="cell.x - GRID_RADIUS / 2"
        :y="cell.y - GRID_RADIUS / 2"
        :width="GRID_RADIUS"
        :height="GRID_RADIUS"
        style="color: #dedede"

      />

    </g>

    <!-- text overlay -->
    <g>
      <g v-for="(cell, i) in hexText" :key="`txt-${i}`">
        <circle
          :cx="cell.x"
          :cy="cell.y"
          :r="GRID_RADIUS * 0.75"
          fill="white"
        />
        <text
          :x="cell.x"
          :y="cell.y"
          dominant-baseline="middle"
          text-anchor="middle"
          :font-size="GRID_RADIUS"
          fill="#333"
          class="font-mono font-bold uppercase"
        >{{ cell.char }}</text>
      </g>
    </g>
    </svg>

    <div class="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 bg-white shadow-md px-4 py-2 z-10">
      <UBreadcrumb :items="items" />
    </div>

    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/2 bg-white shadow-sm px-4 py-2 z-10 flex items-center gap-4">
      <p>hexGrid size: {{ hexGrid.length }} - noise time: {{ noiseTime.toFixed(2) }}</p>
      <UButton @click="noiseTime += NOISE_TIME_STEP">Step noise</UButton>
    </div>

  </div>
</template>

<script lang="ts" setup>
import type { BreadcrumbItem } from '@nuxt/ui'

import { useTemplateRef, ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { HexCell, TextCell } from '~/utils/hexgrid'
import { buildHexGrid, buildHexText } from '~/utils/hexgrid'
import { createNoise3D } from 'simplex-noise'

// UI state
const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' },
  { label: 'Playground', to: '/playground' },
  { label: 'Hex Grid Symbols', to: '/playground/hexgridsymbols' }
])

// SVG and canvas state
const svgContainer = useTemplateRef('svg-container')
const svgEl = useTemplateRef<SVGSVGElement>('svgEl')

const { width, height } = useElementSize(svgContainer)
const canvasSize = computed(() => ({ width: width.value, height: height.value }))
const viewBox = computed(() => `0 0 ${canvasSize.value.width} ${canvasSize.value.height}`)

// hex grid and noise state
const GRID_RADIUS = 12
const SYMBOL_IDS = [
  'sym-0', 'sym-1', 'sym-2', 'sym-3',
  'sym-4', 'sym-5', 'sym-6', 'sym-7',
  'sym-8', 'sym-9', 'sym-10', 'sym-11',
  'sym-12', 'sym-13', 'sym-14', 'sym-15'
]
const NOISE_SCALE = 0.0025
const NOISE_TIME_STEP = 0.01
const noise3D = createNoise3D()

const noiseTime = ref(0)

// sample hexText data structure for text overlay: col, row, x, y, char
const hexText = computed<TextCell[]>(() =>
  buildHexText(4, 24, 'Hic Sunt Leones', GRID_RADIUS)
)

const hexGrid = ref<HexCell[]>([])
watchEffect(() => {
  if (width.value && height.value) {
    hexGrid.value = buildHexGrid(width.value, height.value, GRID_RADIUS)
  }
})

// noise values for each cell
const cellNoiseValues = computed(() => {
  return hexGrid.value.map((cell) => {
    const noiseValue = (noise3D(cell.x * NOISE_SCALE, cell.y * NOISE_SCALE, noiseTime.value) + 1) / 2 // normalize to [0, 1]
    const noiseIndex = Math.min(Math.floor(noiseValue * 16), 15)
    return { ...cell, noise: noiseValue, noiseIndex }
  })
})

onMounted(() => {

})

</script>

<style>

</style>
