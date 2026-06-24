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
  { label: 'Hex Grid', to: '/playground/hexgrid' }
])

const GRID_RADIUS = 12

const canvasHolder = ref<HTMLDivElement | null>(null)
let p5Instance: p5Type | null = null
let observer: ResizeObserver | null = null

onMounted(async () => {
  const el = canvasHolder.value
  if (!el) return

  const { default: p5 } = await import('p5')
  let hexGrid: HexCell[] = []

  p5Instance = new p5((p: p5Type) => {
    p.setup = () => {
      p.createCanvas(el.clientWidth, el.clientHeight)
      p.noLoop()
      hexGrid = buildHexGrid(p.width, p.height, GRID_RADIUS)
    }

    p.draw = () => {
      p.background('#fff')
      p.fill('#000')
      // p.stroke(180)
      for (const hex of hexGrid) {
        // drawHex(p, hex.x, hex.y, GRID_RADIUS * 0.75)
        p.circle(hex.x, hex.y, GRID_RADIUS / 2)
      }
    }
  }, el)

  observer = new ResizeObserver(() => {
    hexGrid = buildHexGrid(el.clientWidth, el.clientHeight, GRID_RADIUS)
    p5Instance?.resizeCanvas(el.clientWidth, el.clientHeight)
    p5Instance?.redraw()
  })
  observer.observe(el)
})

onUnmounted(() => {
  observer?.disconnect()
  p5Instance?.remove()
})
</script>
