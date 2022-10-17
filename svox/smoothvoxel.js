// We are combining this file with others in the minified version that will be used also in the worker.
// Do not register the svox component inside the worker
if("undefined"!==typeof window) {

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

/* ********************************
 * TODO:
 * - Cleanup playground HTML and Code
 * - Multiple models combined in a scene
 * - Model layers (combine multiple layers, e.g. weapon models)
 * - Model animation? (including layers?)
 *
 ***********************************/

SVOX.WORKERPOOL = null;

/**
 * Smooth Voxels component for A-Frame.
 */
AFRAME.registerComponent('svox', {
  schema: {
    model: { type:"string" }, 
    worker: { type:"boolean", default:false }
  },

  /**
   * Set if component needs multiple instancing.
   */
  multiple: false,

  _MISSING: "model size=9,scale=0.05,material lighting=flat,colors=A:#FFFFFF B:#FF8800 C:#FF0000,voxels 10B7-2B-C3-C-2B2-C-C2-2B3-C3-2B2-C-C2-2B-C3-C-2B7-11B7-B-6(7A2-)7A-B7-2B-C3-C-B-7A-C7AC-2(7A2-)7A-C7AC-7A-B-C3-C-2B2-C-C2-B-7A2-2(7A-C7AC-)7A2-7A-B2-C-C2-2B3-C3-B-2(7A2-)7A-C7AC-2(7A2-)7A-B3-C3-2B2-C-C2-B-7A2-2(7A-C7AC-)7A2-7A-B2-C-C2-2B-C3-C-B-7A-C7AC-2(7A2-)7A-C7AC-7A-B-C3-C-2B7-B-6(7A2-)7A-B7-11B7-2B-C3-C-2B2-C-C2-2B3-C3-2B2-C-C2-2B-C3-C-2B7-10B",
  _ERROR: "model size=9,scale=0.05,material lighting=flat,colors=B:#FF8800 C:#FF0000 A:#FFFFFF,voxels 10B7-2(2B2-3C2-2B4-C2-)2B2-3C2-2B7-11B7-B-6(7A2-)7A-B7-2B2-3C2-B-6(7A2-)7A-B2-3C2-2B2-C4-B-2(7A-C7A2C)7A-C7AC-7A-B2-C4-2B2-3C2-B3(-7A-C7AC)-7A-B2-3C2-2B2-C4-B-7A-C2(7AC-7A2C)7AC-7A-B2-C4-2B2-3C2-B-6(7A2-)7A-B2-3C2-2B7-B-6(7A2-)7A-B7-11B7-2(2B2-3C2-2B2-C4-)2B2-3C2-2B7-10B",
  _workerPool: null,
  
  /**
   * Called once when component is attached. Generally for initial setup.
   */
  init: function () { 
    let el = this.el;
    let data = this.data;
    let useWorker = data.worker;
    let error = false;
    
    let modelName = data.model;
    let modelString = SVOX.models[modelName];
    if (!modelString) {
      this._logError({ name:'ConfigError', message:'Model not found'});
      modelString = this._MISSING;
      error = true;
      useWorker = false;
    }

    if (!useWorker) {
      this._generateModel(modelString, el, error);
    }
    else {
      this._generateModelInWorker(modelString, el);
    }
  },
  
  _generateModel: function(modelString, el, error) {
    let model;
    try {        
        model = window.model = ModelReader.readFromString(modelString);
    }
    catch (ex) {
      this._logError(ex);
      model = ModelReader.readFromString(this._ERROR);
      error = true;
    }
    
        //let meshGenerator = new MeshGenerator();
        //this.mesh = meshGenerator.generate(model);

      //for (let i = 0; i < 5; i++) {
      //  SvoxMeshGenerator.generate(model);
      //  //SvoxToThreeMeshConverter.generate(svoxmesh);
      //}

        const buffers = new SVOXBuffers(1024 * 1024);
        let t0 = performance.now();
        let svoxmesh = SvoxMeshGenerator.generate(model, buffers);
    console.log(svoxmesh);
        console.log("SvoxMeshGenerator.generate took " + (performance.now() - t0) + " ms.");
        let t1 = performance.now();
        this.mesh = SvoxToThreeMeshConverter.generate(svoxmesh);
    console.log(this.mesh);
      
        // Log stats
        let statsText = `Time: ${Math.round(t1 - t0)}ms. Verts:${svoxmesh.positions.length / 3} Faces:${svoxmesh.indices.length / 3} Materials:${this.mesh.material.length}`;
        //console.log(`SVOX ${this.data.model}:  ${statsText}`);     
        let statsEl = document.getElementById('svoxstats');
        if (statsEl && !error)
          statsEl.innerHTML = `Last render: ` + statsText; 
      
        el.setObject3D('mesh', this.mesh);
  },
  
  _generateModelInWorker: function(svoxmodel, el) {
    // Make sure the element has an Id, create a task in the task array and process it
    if (!el.id)
      el.id = new Date().valueOf().toString(36) + Math.random().toString(36).substr(2);
    let task =  { svoxmodel, elementId:el.id };    
    
    if (!SVOX.WORKERPOOL) {
      SVOX.WORKERPOOL = new WorkerPool("/smoothvoxelworker.1.2.0.js", this, this._processResult);
    }
    SVOX.WORKERPOOL.executeTask(task);
  },
  
  _processResult: function(data) {
    if (data.svoxmesh.error) {
      this._logError(data.svoxmesh.error)
    }
    else {
      let mesh = SvoxToThreeMeshConverter.generate(data.svoxmesh);
      let el = document.querySelector('#' + data.elementId);

      el.setObject3D('mesh', mesh);          
    }
  },
  
  _toSharedArrayBuffer(floatArray) {
    let buffer = new Float32Array(new ArrayBuffer(floatArray.length * 4));
    buffer.set(floatArray, 0);
    return buffer;
  },
  
  /**
   * Log errors to the console and an optional div #svoxerrors (as in the playground)
   * @param {modelName} The name of the model being loaded
   * @param {error} Error object with name and message
   */
  _logError: function(error) {
      let errorText = error.name + ": " + error.message;
      let errorElement = document.getElementById('svoxerrors');
      if (errorElement)
        errorElement.innerHTML = errorText;
      console.error(`SVOXERROR (${this.data.model}) ${errorText}`);    
  },

  /**
   * Called when component is attached and when component data changes.
   * Generally modifies the entity based on the data.
   * @param {object} oldData The previous version of the data
   */
  update: function (oldData) { },

  /**
   * Called when a component is removed (e.g., via removeAttribute).
   */
  remove: function () { 
    let maps = ["map", "normalMap",  "roughnessMap", "metalnessMap", "emissiveMap", "matcap"];

    if (this.mesh) {                 // TODO: Test
    
      while (this.mesh.material.length > 0) {
        
         maps.forEach(function(map){
          if (this.mesh.material[0][map]) {
            this.mesh.material[0][map].dispose;
          }
        }, this);

        this.mesh.material[0].dispose();
        this.mesh.material.shift();
      }      
      
      this.mesh.geometry.dispose();
      this.el.removeObject3D('mesh');
      delete this.mesh;
      
    }
  },
  
  /**
   * Called on each scene tick.
   */
  // tick: function (t) { },

  /**
   * Called when entity pauses.
   * Use to stop or remove any dynamic or background behavior such as events.
   */
  pause: function () { },

  /**
   * Called when entity resumes.
   * Use to continue or add any dynamic or background behavior such as events.
   */
  play: function () { },

  /**
   * Event handlers that automatically get attached or detached based on scene state.
   */
  events: {
    // click: function (evt) { }
  }
});

}
