<template>
  <div class="vt_container">
    <UBreadcrumb :items="items" class="mb-6"/>

    <div ref="canvasHolder" class="h-120"></div>
  </div>
</template>

<script lang="ts" setup>
import type p5Type from 'p5'
import type { HexNoiseCell } from '~/utils/hexgrid'

import type { BreadcrumbItem } from '@nuxt/ui'

const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' },
  { label: 'Playground', to: '/playground' },
  { label: 'Hex Grid Field', to: '/playground/hexgridfield' }
])

const GRID_RADIUS = 12

const canvasHolder = ref<HTMLDivElement | null>(null)
let p5Instance: p5Type | null = null
let observer: ResizeObserver | null = null

onMounted(async () => {
  const el = canvasHolder.value
  if (!el) return

  const NOISE_SCALE = 0.008

  const { default: p5 } = await import('p5')
  let noiseField: HexNoiseCell[] = []

  p5Instance = new p5((p: p5Type) => {
    p.setup = () => {
      p.createCanvas(el.clientWidth, el.clientHeight)
      p.noLoop()
      noiseField = buildNoiseField(buildHexGrid(p.width, p.height, GRID_RADIUS), p, NOISE_SCALE)
    }

    p.draw = () => {
      p.background('#fff')
      p.noStroke()
      for (const cell of noiseField) {
        p.fill(cell.noise * 255)
        drawHex(p, cell.x, cell.y, GRID_RADIUS * 0.9)
      }
    }
  }, el)

  observer = new ResizeObserver(() => {
    p5Instance?.resizeCanvas(el.clientWidth, el.clientHeight)
    noiseField = buildNoiseField(buildHexGrid(el.clientWidth, el.clientHeight, GRID_RADIUS), p5Instance as p5Type, NOISE_SCALE)
    p5Instance?.redraw()
  })
  observer.observe(el)
})

onUnmounted(() => {
  observer?.disconnect()
  p5Instance?.remove()
})
</script>
