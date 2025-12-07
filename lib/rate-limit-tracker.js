const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../.rate-limit-state.json');

/**
 * Rate Limit Tracker - Persistent state management
 * Tracks which models are rate-limited and when they reset
 */
class RateLimitTracker {
  constructor() {
    this.state = this.loadState();
  }

  /**
   * Load state from file (persists across bot runs)
   */
  loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('⚠️ Could not load rate limit state, starting fresh');
    }
    // Default state
    return {
      'gemini-2.0-flash': {
        isLimited: false,
        limitedSince: null,
        resetAt: null,
        failureCount: 0
      },
      'gemini-2.5-flash': {
        isLimited: false,
        limitedSince: null,
        resetAt: null,
        failureCount: 0
      }
    };
  }

  /**
   * Save state to file
   */
  saveState() {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to save rate limit state:', error.message);
    }
  }

  /**
   * Calculate next reset time for Gemini API
   * Free tier resets at midnight UTC (5:30 AM IST)
   */
  calculateResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    // Set to next day midnight UTC
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }

  /**
   * Mark a model as rate-limited
   */
  markAsLimited(modelName) {
    const now = new Date().toISOString();
    const resetAt = this.calculateResetTime();

    this.state[modelName] = {
      isLimited: true,
      limitedSince: now,
      resetAt: resetAt,
      failureCount: (this.state[modelName]?.failureCount || 0) + 1
    };

    this.saveState();

    // Log user-friendly message
    const resetDate = new Date(resetAt);
    const hoursUntilReset = Math.ceil((resetDate - new Date()) / (1000 * 60 * 60));
    
    console.log(`\n⚠️  ${modelName} rate limit detected`);
    console.log(`   Will reset at: ${resetDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Time remaining: ~${hoursUntilReset} hours`);
    
    // Add Groq fallback message if both limited
    if (this.isModelLimited('gemini-2.0-flash') && this.isModelLimited('gemini-2.5-flash')) {
      console.log(`   🚀 Will use Groq API as fallback\n`);
    } else {
      console.log();
    }
  }

  /**
   * Check if a model is currently rate-limited
   */
  isModelLimited(modelName) {
    const modelState = this.state[modelName];
    if (!modelState || !modelState.isLimited) {
      return false;
    }

    // Check if reset time has passed
    const now = new Date();
    const resetAt = new Date(modelState.resetAt);

    if (now >= resetAt) {
      // Reset time passed - clear the limit
      this.clearLimit(modelName);
      return false;
    }

    return true;
  }

  /**
   * Clear rate limit for a model (after reset time)
   */
  clearLimit(modelName) {
    this.state[modelName] = {
      isLimited: false,
      limitedSince: null,
      resetAt: null,
      failureCount: 0
    };
    this.saveState();
    console.log(`✅ ${modelName} rate limit cleared (reset time reached)`);
  }

  /**
   * Get preferred model based on current state
   */
  getPreferredModel() {
    const primary = 'gemini-2.0-flash';
    const fallback = 'gemini-2.5-flash';

    // Check if primary is limited
    if (this.isModelLimited(primary)) {
      console.log(`🔄 Using ${fallback} (${primary} is rate-limited)`);
      return fallback;
    }

    // Check if fallback is also limited
    if (this.isModelLimited(fallback)) {
      console.log(`⚠️  Warning: ${fallback} is also rate-limited!`);
      // Return primary anyway (will fail gracefully)
      return primary;
    }

    return primary;
  }

  /**
   * Get status report (for debugging)
   */
  getStatus() {
    return {
      '2.0-flash': {
        limited: this.isModelLimited('gemini-2.0-flash'),
        resetAt: this.state['gemini-2.0-flash']?.resetAt,
        failures: this.state['gemini-2.0-flash']?.failureCount || 0
      },
      '2.5-flash': {
        limited: this.isModelLimited('gemini-2.5-flash'),
        resetAt: this.state['gemini-2.5-flash']?.resetAt,
        failures: this.state['gemini-2.5-flash']?.failureCount || 0
      }
    };
  }

  /**
   * Manual reset (for testing or manual intervention)
   */
  resetAll() {
    this.state = {
      'gemini-2.0-flash': { isLimited: false, limitedSince: null, resetAt: null, failureCount: 0 },
      'gemini-2.5-flash': { isLimited: false, limitedSince: null, resetAt: null, failureCount: 0 }
    };
    this.saveState();
    console.log('✅ All rate limits manually cleared');
  }
}

// Singleton instance
let tracker = null;

function getTracker() {
  if (!tracker) {
    tracker = new RateLimitTracker();
  }
  return tracker;
}

module.exports = { getTracker };
