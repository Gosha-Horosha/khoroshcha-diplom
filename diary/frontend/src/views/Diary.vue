<template>
  <div class="diary-view">
    <DiaryEntryList />
  </div>
</template>

<script>
import DiaryEntryList from '../components/DiaryEntryList.vue'

export default {
  name: 'DiaryView',
  components: {
    DiaryEntryList
  }
}
</script>

<style scoped>
.diary-view {
  padding: 2rem;
}
</style>