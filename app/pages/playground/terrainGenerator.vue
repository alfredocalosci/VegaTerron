<template>
  <div ref="svg-container" class="relative w-screen h-screen overflow-hidden bg-black">
    <svg
      ref="svgEl"
      class="absolute inset-0 w-full h-full"
      :viewBox="viewBox"
      :width="canvasSize.width"
      :height="canvasSize.height"
      preserveAspectRatio="xMidYMid meet"
      :style="{ cursor: drag.dotId !== null ? 'grabbing' : 'default' }"
      @mousemove="onSVGMousemove"
      @mouseup="onSVGMouseup"
      @mouseleave="onSVGMouseup"
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
        <circle
          v-for="dot in dots"
          :key="dot.id"
          :cx="dot.x"
          :cy="dot.y"
          r="5"
          fill="white"
          opacity="0.85"
          style="cursor: grab"
          @mousedown="(e) => onDotMousedown(e, dot)"
        />
      </g>
    </svg>

    <div class="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 bg-gray-800 shadow-md px-4 py-2 z-10">
      <UBreadcrumb :items="items" />
    </div>

    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/2 bg-gray-800 shadow-sm px-4 py-2 z-10 flex items-center gap-4 text-gray-500">
      <p>{{ dots.length }} dots — drag to reposition</p>
    </div>

  </div>
</template>

<script lang="ts" setup>
import * as d3 from 'd3'
import type { BreadcrumbItem } from '@nuxt/ui'
import { useTemplateRef, ref, watch, computed, onMounted } from 'vue'
import { useElementSize } from '@vueuse/core'

interface Dot { id: number, x: number, y: number }
interface ContourPath { d: string, fill: string }

// UI state
const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' },
  { label: 'Playground', to: '/playground' },
  { label: 'Terrain Generator', to: '/playground/terrainGenerator' }
])

// SVG and canvas state
const svgContainer = useTemplateRef('svg-container')
const svgEl = useTemplateRef<SVGSVGElement>('svgEl')

const { width, height } = useElementSize(svgContainer)
const canvasSize = computed(() => ({ width: width.value, height: height.value }))
const viewBox = computed(() => `0 0 ${canvasSize.value.width} ${canvasSize.value.height}`)

// Dots
const DOT_COUNT = 48
const dots = ref<Dot[]>([])
const contourPaths = ref<ContourPath[]>([])

const drag = ref<{ dotId: number | null, offsetX: number, offsetY: number }>({
  dotId: null,
  offsetX: 0,
  offsetY: 0
})

const initialized = ref(false)

watch(canvasSize, (size) => {
  if (!initialized.value && size.width > 0 && size.height > 0) {
    initialized.value = true
    const rx = d3.randomNormal(size.width / 2, size.width / 4)
    const ry = d3.randomNormal(size.height / 2, size.height / 4)
    dots.value = Array.from({ length: DOT_COUNT }, (_, i) => ({
      id: i,
      x: Math.max(0, Math.min(size.width, rx())),
      y: Math.max(0, Math.min(size.height, ry()))
    }))
    computeContours()
  }
})

function computeContours() {
  const { width, height } = canvasSize.value
  if (!width || !height || dots.value.length === 0) return

  const densityFn = d3.contourDensity<Dot>()
    .x(d => d.x)
    .y(d => d.y)
    .size([width, height])
    .bandwidth(60)
    .thresholds(18) // 18

  const contours = densityFn(dots.value)
  const maxValue = contours[contours.length - 1]?.value ?? 1

  const colorScale = d3.scaleSequential(d3.interpolateGreys).domain([maxValue, 0])
  const pathGen = d3.geoPath()

  contourPaths.value = contours.map(c => ({
    d: pathGen(c) ?? '',
    fill: colorScale(c.value)
  }))
}

function toSVGCoords(e: MouseEvent) {
  const svg = svgEl.value!
  const pt = svg.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  return pt.matrixTransform(svg.getScreenCTM()!.inverse())
}

function onDotMousedown(e: MouseEvent, dot: Dot) {
  e.preventDefault()
  const p = toSVGCoords(e)
  drag.value = { dotId: dot.id, offsetX: p.x - dot.x, offsetY: p.y - dot.y }
}

function onSVGMousemove(e: MouseEvent) {
  if (drag.value.dotId === null) return
  const p = toSVGCoords(e)
  const dot = dots.value.find(d => d.id === drag.value.dotId)!
  dot.x = p.x - drag.value.offsetX
  dot.y = p.y - drag.value.offsetY
}

function onSVGMouseup() {
  if (drag.value.dotId !== null) {
    drag.value.dotId = null
    computeContours()
  }
}

onMounted(() => {})
</script>

<style>
</style>
