<template>
  <div class="vt_container">
    <UBreadcrumb :items="items" class="mb-6"/>

    <div ref="canvasHolder" class="h-120"></div>
  </div>
</template>

<script lang="ts" setup>
import type p5Type from 'p5'
import type { HexCell } from '~/utils/hexgrid'

import type { BreadcrumbItem } from '@nuxt/ui'

const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' },
  { label: 'Playground', to: '/playground' },
  { label: 'Hex Grid Field Motion', to: '/playground/hexgridfieldmotion' }
])

const GRID_RADIUS = 12
const NOISE_SCALE = 0.008
const TIME_STEP = 0.005

const canvasHolder = ref<HTMLDivElement | null>(null)
let p5Instance: p5Type | null = null
let observer: ResizeObserver | null = null

onMounted(async () => {
  const el = canvasHolder.value
  if (!el) return

  const { default: p5 } = await import('p5')
  let hexGrid: HexCell[] = []
  let time = 0

  p5Instance = new p5((p: p5Type) => {
    p.setup = () => {
      p.createCanvas(el.clientWidth, el.clientHeight)
      hexGrid = buildHexGrid(p.width, p.height, GRID_RADIUS)
    }

    p.draw = () => {
      time += TIME_STEP
      p.background('#fff')
      p.noStroke()
      for (const cell of hexGrid) {
        const n = p.noise(cell.x * NOISE_SCALE, cell.y * NOISE_SCALE, time)
        p.fill(n * 255)
        drawHex(p, cell.x, cell.y, GRID_RADIUS * 0.9)
      }
    }
  }, el)

  observer = new ResizeObserver(() => {
    hexGrid = buildHexGrid(el.clientWidth, el.clientHeight, GRID_RADIUS)
    p5Instance?.resizeCanvas(el.clientWidth, el.clientHeight)
  })
  observer.observe(el)
})

onUnmounted(() => {
  observer?.disconnect()
  p5Instance?.remove()
})
</script>
