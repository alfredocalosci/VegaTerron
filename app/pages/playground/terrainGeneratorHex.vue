<template>
  <div ref="svg-container" class="relative w-screen h-screen overflow-hidden bg-black">
    <svg
      ref="svgEl"
      class="absolute inset-0 w-full h-full"
      :viewBox="viewBox"
      :width="canvasSize.width"
      :height="canvasSize.height"
      preserveAspectRatio="xMidYMid meet"
    >

      <g>
        <path
          v-for="(cp, i) in contourPaths"
          :key="i"
          :d="cp.d"
          :fill="cp.fill"
          stroke="none"
        />
      </g>

      <g>
        <polygon
          v-for="cell in hexGrid"
          :key="`${cell.col}-${cell.row}`"
          :points="hexPoints(cell.x, cell.y, HEX_RADIUS)"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          stroke-width="0.5"
        />
      </g>

      <g>
        <circle
          v-for="dot in dots"
          :key="dot.id"
          :cx="dot.x"
          :cy="dot.y"
          r="5"
          fill="white"
          opacity="0.6"
        />
      </g>
    </svg>

    <div class="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 bg-gray-800 shadow-md px-4 py-2 z-10">
      <UBreadcrumb :items="items" />
    </div>

    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/2 bg-gray-800 shadow-sm px-4 py-2 z-10 flex items-center gap-4 text-gray-500">
      <p>{{ dots.length }} dots — hex grid placement</p>
      <UButton size="xs" @click="randomize">Randomize</UButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as d3 from 'd3'
import type { BreadcrumbItem } from '@nuxt/ui'
import { useTemplateRef, ref, watch, computed } from 'vue'
import { useElementSize } from '@vueuse/core'
import { buildHexGrid } from '~/utils/hexgrid'
import type { HexCell } from '~/utils/hexgrid'

interface Dot { id: number, x: number, y: number }
interface ContourPath { d: string, fill: string }

const DOT_COUNT = 48
const HEX_RADIUS = 24

const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' },
  { label: 'Playground', to: '/playground' },
  { label: 'Terrain Generator Hex', to: '/playground/terrainGeneratorHex' }
])

const svgContainer = useTemplateRef('svg-container')
const svgEl = useTemplateRef<SVGSVGElement>('svgEl')

const { width, height } = useElementSize(svgContainer)
const canvasSize = computed(() => ({ width: width.value, height: height.value }))
const viewBox = computed(() => `0 0 ${canvasSize.value.width} ${canvasSize.value.height}`)

const hexGrid = ref<HexCell[]>([])
const dots = ref<Dot[]>([])
const contourPaths = ref<ContourPath[]>([])
const initialized = ref(false)

function hexPoints(x: number, y: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i + Math.PI / 6
    return `${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`
  }).join(' ')
}

function sampleDots(cells: HexCell[], count: number): Dot[] {
  return Array.from({ length: count }, (_, idx) => {
    const cell = cells[Math.floor(Math.random() * cells.length)]!
    return { id: idx, x: cell.x, y: cell.y }
  })
}

function computeContours() {
  const { width, height } = canvasSize.value
  if (!width || !height || dots.value.length === 0) return

  const densityFn = d3.contourDensity<Dot>()
    .x(d => d.x)
    .y(d => d.y)
    .size([width, height])
    .bandwidth(60)
    .thresholds(18)

  const contours = densityFn(dots.value)
  const maxValue = contours[contours.length - 1]?.value ?? 1

  const colorScale = d3.scaleSequential(d3.interpolateGreys).domain([maxValue, 0])
  const pathGen = d3.geoPath()

  contourPaths.value = contours.map(c => ({
    d: pathGen(c) ?? '',
    fill: colorScale(c.value)
  }))
}

function randomize() {
  dots.value = sampleDots(hexGrid.value, DOT_COUNT)
  computeContours()
}

watch(canvasSize, (size) => {
  if (!initialized.value && size.width > 0 && size.height > 0) {
    initialized.value = true
    hexGrid.value = buildHexGrid(size.width, size.height, HEX_RADIUS)
    dots.value = sampleDots(hexGrid.value, DOT_COUNT)
    computeContours()
  }
})
</script>

<style>
</style>
