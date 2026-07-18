<script setup lang="ts">
import { ref } from "vue";
import FlashcardDeck from "./FlashcardDeck.vue";

const props = defineProps<{ ids: string[]; title: string }>();
const open = ref(false);
</script>

<template>
  <button type="button" class="chreview-btn" @click="open = true">
    🃏 Review this chapter
    <small>flashcards · incl. code fill-in</small>
  </button>
  <FlashcardDeck
    v-if="open"
    :queue="props.ids"
    :label="'Chapter review · ' + props.title"
    @close="open = false" />
</template>

<style scoped>
.chreview-btn {
  width: 100%; margin-top: 12px; background: var(--tum); color: #fff; border: 0;
  border-radius: 10px; padding: 11px 14px; font-weight: 600; cursor: pointer;
  font-size: .92rem; display: flex; flex-direction: column; gap: 2px; align-items: flex-start;
}
.chreview-btn:hover { filter: brightness(1.06); }
.chreview-btn small { font-weight: 400; opacity: .85; font-size: .72rem; }
</style>
