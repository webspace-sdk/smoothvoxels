
class WorkerPool {

  // workerfile: e.g. "/smoothvoxelworker.js"
  constructor(workerFile, resultHandler, resultCallback) {
    this._workerFile = workerFile;
    this._resultHandler = resultHandler;
    this._resultCallback = resultCallback;
    this._nrOfWorkers = window.navigator.hardwareConcurrency;
    this._workers = []; // The actual workers
    this._free = [];    // Array of free worker indexes
    this._tasks = [];   // Array of tasks to perform
  }

  executeTask(task) {
    // Create max nrOfWorkers web workers
    if (this._workers.length < this._nrOfWorkers) {
      
      // Create a new worker and mark it as free by adding its index to the free array
      let worker = new Worker(this._workerFile);
      
      // On message handler
      let _this = this;
      worker.onmessage = function(task) {
        
          // Mark the worker as free again, process the next task and process the result
          _this._free.push(event.data.worker);        
          _this._processNextTask();
          _this._resultCallback.apply(_this._resultHandler, [ event.data ]);
      };
      
      this._free.push(this._workers.length);
      this._workers.push(worker);
    }
    
    this._tasks.push(task);
    
    this._processNextTask();    
  }
  
  _processNextTask() {
    if (this._tasks.length > 0 && this._free.length > 0) {
      let task = this._tasks.shift();
      task.worker = this._free.shift();
      let worker = this._workers[task.worker];
      worker.postMessage(task);
    }    
  }

};
