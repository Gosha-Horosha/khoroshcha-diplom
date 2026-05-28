<template>
  <div class="profile-view">
    <div class="profile-container">
      <h1>User Profile</h1>
      
      <div v-if="user" class="profile-info">
        <div class="info-card">
          <div class="info-item">
            <label>Username:</label>
            <span>{{ user.username }}</span>
          </div>
          
          <div class="info-item">
            <label>Email:</label>
            <span>{{ user.email }}</span>
          </div>
          
          <div class="info-item">
            <label>Member since:</label>
            <span>{{ formatDate(user.created_at) }}</span>
          </div>
          
          <div class="info-item">
            <label>Status:</label>
            <span :class="user.is_active ? 'status-active' : 'status-inactive'">
              {{ user.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>
        
        <div class="stats-card">
          <h3>Diary Statistics</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-number">{{ totalEntries }}</span>
              <span class="stat-label">Total Entries</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ publicEntries }}</span>
              <span class="stat-label">Public Entries</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ privateEntries }}</span>
              <span class="stat-label">Private Entries</span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="loading">
        Loading profile information...
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'ProfileView',
  computed: {
    ...mapState(['user']),
    ...mapState('diary', ['entries']),
    
    totalEntries() {
      return this.entries.length
    },
    
    publicEntries() {
      return this.entries.filter(entry => entry.is_public).length
    },
    
    privateEntries() {
      return this.entries.filter(entry => !entry.is_public).length
    }
  },
  methods: {
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }
}
</script>

<style scoped>
.profile-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.profile-container h1 {
  color: #2c3e50;
  margin-bottom: 2rem;
  text-align: center;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

.profile-info {
  display: grid;
  gap: 2rem;
}

.info-card, .stats-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid #ecf0f1;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item label {
  font-weight: bold;
  color: #34495e;
}

.info-item span {
  color: #7f8c8d;
}

.status-active {
  color: #27ae60;
  font-weight: bold;
}

.status-inactive {
  color: #e74c3c;
  font-weight: bold;
}

.stats-card h3 {
  margin-bottom: 1.5rem;
  color: #2c3e50;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #7f8c8d;
  font-size: 0.9rem;
}
</style>