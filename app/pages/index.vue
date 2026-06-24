<template>
  <div class="vt_container">
    <UBreadcrumb :items="items" class="mb-6"/>

    <p class="font-semibold text-2xl">
      Vega Terrón
    </p>

    <p class="font-mono">
      code playground
    </p>

    <hr class="my-4 border-gray-300">

    <ul>
      <li>
        <NuxtLink
          to="/playground"
          class="text-blue-500 hover:underline"
        >
          Code Playground
        </NuxtLink>
      </li>
    </ul>

  </div>
</template>

<script lang="ts" setup>
import type { BreadcrumbItem } from '@nuxt/ui'

const items = ref<BreadcrumbItem[]>([
  { label: 'Home', to: '/' }
])
</script>
