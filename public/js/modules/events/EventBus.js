/**
 * EventBus Module
 * Central event management system for modular architecture
 */

export class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {function} callback - Callback function to remove
   */
  off(event, callback) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Data to pass to callbacks
   */
  emit(event, data) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Subscribe to an event only once
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  once(event, callback) {
    const onceWrapper = (data) => {
      callback(data);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Clear all listeners for an event
   * @param {string} event - Event name
   */
  clear(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this.events[event] ? this.events[event].length : 0;
  }
}

// Export default instance
const eventBus = new EventBus();
export default EventBus;