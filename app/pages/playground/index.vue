<template>
  <div class="vt_container">

     <UBreadcrumb :items="items" class="mb-6"/>

    <p class="font-semibold text-2xl">
      Code Playground
    </p>

    <p class="font-mono italic">
      a few code examples
    </p>

    <hr class="my-4 border-gray-300">

    <div class="w-full grid grid-cols-1 md:grid-cols-3">

      <div>
        <p class="text-xs text-gray-700 uppercase my-4">p5 canvas examples</p>
        <ul>
      <li>
        <NuxtLink to="/playground/hexgrid" class="text-blue-500 hover:underline">Hex Grid</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/playground/hexgridfield" class="text-blue-500 hover:underline">Hex Grid Field</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/playground/hexgridfieldmotion" class="text-blue-500 hover:underline">Hex Grid Field Motion</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/playground/hexgridfieldmotionlines" class="text-blue-500 hover:underline">Hex Grid Field Motion Lines</NuxtLink>
      </li>
    </ul>
      </div>

      <div>
         <p class="text-xs text-gray-700 uppercase my-4">svg  examples</p>

          <ul>
      <li>
        <NuxtLink to="/playground/hexfieldsvg" class="text-blue-500 hover:underline">Hex Field SVG</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/playground/hexgridsymbols" class="text-blue-500 hover:underline">Hex Grid Symbols</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/playground/terrainGenerator" class="text-blue-500 hover:underline">Terrain Generator</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/playground/terrainGeneratorHex" class="text-blue-500 hover:underline">Terrain Generator Hex</NuxtLink>
      </li>

    </ul>
      </div>

     <div>
       <p class="text-xs text-gray-700 uppercase my-4">svg  elevation moisture</p>

       <ul>
         <li>
          <NuxtLink to="/playground/terrainElevMoisture" class="text-blue-500 hover:underline">Terrain Elev/Moisture</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/playground/terrainElevMoistureSymbols" class="text-blue-500 hover:underline">Terrain Elev/Moisture Symbols</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/playground/terrainElevMoistureSymbolsLight" class="text-blue-500 hover:underline">Terrain Elev/Moisture Symbols Light</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/playground/terrainCopernicusData" class="text-blue-500 hover:underline">Terrain Copernicus Data</NuxtLink>
        </li>
       </ul>

       <p class="text-xs text-gray-700 uppercase my-4">hex grid shapes</p>
       <ul>
         <li>
          <NuxtLink to="/playground/hexGridShapes" class="text-blue-500 hover:underline">Hex Grid Shapes</NuxtLink>
        </li>
       </ul>
     </div>
       </div>

  </div>
</template>

<script lang="ts" setup>
import type { BreadcrumbItem } from '@nuxt/ui'

const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' },
  { label: 'Playground', to: '/playground' }
])

</script>

<style>

</style>
