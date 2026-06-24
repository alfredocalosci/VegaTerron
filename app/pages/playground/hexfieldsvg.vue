<template>
  <div class="relative w-screen h-screen overflow-hidden bg-white">
    <svg ref="svgEl" class="absolute inset-0 w-full h-full" >
    </svg>

    <div class="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 bg-white shadow-md px-4 py-2 z-10">
      <UBreadcrumb :items="items" />
    </div>

    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 bg-white  shadow-sm px-4 py-2 z-10">
      <p>settings here</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Selection, Timer } from 'd3'
import type { HexCell } from '~/utils/hexgrid'
import type { BreadcrumbItem } from '@nuxt/ui'

const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' },
  { label: 'Playground', to: '/playground' },
  { label: 'Hex Field SVG', to: '/playground/hexfieldsvg' }
])

const GRID_RADIUS = 12
const NOISE_SCALE = 0.005
const TIME_STEP = 0.005
const LINE_HALF = GRID_RADIUS * 0.75

const svgEl = ref<SVGSVGElement | null>(null)

let lineSelection: Selection<SVGLineElement, HexCell, SVGSVGElement, unknown> | null = null
let timerInstance: Timer | null = null
let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  if (!svgEl.value) return

  const [{ select, timer }, { createNoise3D }] = await Promise.all([
    import('d3'),
    import('simplex-noise')
  ])

  const noise3D = createNoise3D()
  const svg = select(svgEl.value)
  let time = 0

  function initGrid(width: number, height: number) {
    const hexGrid = buildHexGrid(width, height, GRID_RADIUS)
    svg.attr('width', width).attr('height', height)
    lineSelection = svg
      .selectAll<SVGLineElement, HexCell>('line')
      .data(hexGrid, d => `${d.col}-${d.row}`)
      .join('line')
      .attr('stroke-width', 1)
  }

  initGrid(window.innerWidth, window.innerHeight)

  timerInstance = timer(() => {
    time += TIME_STEP
    lineSelection?.each(function (d) {
      const n = (noise3D(d.x * NOISE_SCALE, d.y * NOISE_SCALE, time) + 1) / 2
      const angle = n * Math.PI * 2
      const dx = Math.cos(angle) * LINE_HALF
      const dy = Math.sin(angle) * LINE_HALF
      const gray = Math.round(n * 255)
      this.setAttribute('x1', String(d.x - dx))
      this.setAttribute('y1', String(d.y - dy))
      this.setAttribute('x2', String(d.x + dx))
      this.setAttribute('y2', String(d.y + dy))
      this.setAttribute('stroke', `rgb(${gray},${gray},${gray})`)
    })
  })

  resizeObserver = new ResizeObserver(() => initGrid(window.innerWidth, window.innerHeight))
  resizeObserver.observe(document.documentElement)
})

onUnmounted(() => {
  timerInstance?.stop()
  resizeObserver?.disconnect()
})
</script>
