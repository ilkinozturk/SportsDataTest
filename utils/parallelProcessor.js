// Parallel Processing Utilities for API Calls
const Logger = require('./logger');

class ParallelProcessor {
  constructor(concurrencyLimit = 5) {
    this.concurrencyLimit = concurrencyLimit;
    this.logger = new Logger('ParallelProcessor');
  }

  /**
   * Process tasks in parallel with concurrency control
   * @param {Array} tasks - Array of async functions
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Results array (includes errors)
   */
  async processTasks(tasks, options = {}) {
    const { onProgress = null, continueOnError = true, timeout = 30000 } = options;

    const results = new Array(tasks.length);
    const errors = [];
    let completed = 0;

    // Create batches based on concurrency limit
    const batches = [];
    for (let i = 0; i < tasks.length; i += this.concurrencyLimit) {
      batches.push(tasks.slice(i, i + this.concurrencyLimit));
    }

    this.logger.info(`Processing ${tasks.length} tasks in ${batches.length} batches`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartIndex = batchIndex * this.concurrencyLimit;

      try {
        // Add timeout wrapper to each task
        const batchPromises = batch.map((task, index) =>
          this.wrapWithTimeout(task(), timeout)
            .then(result => {
              completed++;
              results[batchStartIndex + index] = { success: true, data: result };

              if (onProgress) {
                onProgress(completed, tasks.length);
              }

              return result;
            })
            .catch(error => {
              completed++;
              const errorInfo = {
                success: false,
                error: error.message,
                index: batchStartIndex + index,
              };

              errors.push(errorInfo);
              results[batchStartIndex + index] = errorInfo;

              if (onProgress) {
                onProgress(completed, tasks.length);
              }

              if (!continueOnError) {
                throw error;
              }

              return null;
            })
        );

        // Wait for batch to complete
        await Promise.all(batchPromises);
      } catch (error) {
        if (!continueOnError) {
          this.logger.error(`Batch processing failed at batch ${batchIndex}`, error);
          throw error;
        }
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`Completed with ${errors.length} errors out of ${tasks.length} tasks`);
    } else {
      this.logger.success(`All ${tasks.length} tasks completed successfully`);
    }

    return results;
  }

  /**
   * Process tasks and return only successful results
   */
  async processTasksSuccessOnly(tasks, options = {}) {
    const results = await this.processTasks(tasks, options);
    return results.filter(r => r && r.success).map(r => r.data);
  }

  /**
   * Map over items in parallel
   */
  async map(items, mapFn, options = {}) {
    const tasks = items.map((item, index) => () => mapFn(item, index));

    return this.processTasksSuccessOnly(tasks, options);
  }

  /**
   * Filter items in parallel
   */
  async filter(items, filterFn, options = {}) {
    const tasks = items.map(
      (item, index) => () => filterFn(item, index).then(result => ({ item, result }))
    );

    const results = await this.processTasksSuccessOnly(tasks, options);
    return results.filter(r => r.result).map(r => r.item);
  }

  /**
   * Wrap promise with timeout
   */
  wrapWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  /**
   * Batch process with rate limiting
   */
  async batchProcessWithRateLimit(items, processFn, options = {}) {
    const {
      batchSize = this.concurrencyLimit,
      delayBetweenBatches = 100,
      ...processOptions
    } = options;

    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchTasks = batch.map(item => () => processFn(item));

      const batchResults = await this.processTasksSuccessOnly(batchTasks, processOptions);
      results.push(...batchResults);

      // Delay between batches (except for last batch)
      if (i + batchSize < items.length && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return results;
  }
}

module.exports = ParallelProcessor;
