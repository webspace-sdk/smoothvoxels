/* global postMessage */

import ModelReader from './modelreader'
import SvoxMeshGenerator from './svoxmeshgenerator'
import Buffers from './buffers'

const buffers = new Buffers(1024 * 1024)

onmessage = function (event) { // eslint-disable-line
  console.log('got message')
  const svoxmesh = generateModel(event.data.svoxmodel)
  postMessage({ svoxmesh, elementId: event.data.elementId, worker: event.data.worker })
}

function generateModel (svoxmodel) {
  const _MISSING = 'model size=9,scale=0.05,material lighting=flat,colors=B:#FF8800 C:#FF0000 A:#FFFFFF,voxels 10B7-2(2B2-3C2-2B4-C2-)2B2-3C2-2B7-11B7-B-6(7A2-)7A-B7-2B2-3C2-B-6(7A2-)7A-B2-3C2-2B2-C4-B-2(7A-C7A2C)7A-C7AC-7A-B2-C4-2B2-3C2-B3(-7A-C7AC)-7A-B2-3C2-2B2-C4-B-7A-C2(7AC-7A2C)7AC-7A-B2-C4-2B2-3C2-B-6(7A2-)7A-B2-3C2-2B7-B-6(7A2-)7A-B7-11B7-2(2B2-3C2-2B2-C4-)2B2-3C2-2B7-10B'
  const _ERROR = 'model size=9,scale=0.05,material lighting=flat,colors=A:#FFFFFF B:#FF8800 C:#FF0000,voxels 10B7-2B-C3-C-2B2-C-C2-2B3-C3-2B2-C-C2-2B-C3-C-2B7-11B7-B-6(7A2-)7A-B7-2B-C3-C-B-7A-C7AC-2(7A2-)7A-C7AC-7A-B-C3-C-2B2-C-C2-B-7A2-2(7A-C7AC-)7A2-7A-B2-C-C2-2B3-C3-B-2(7A2-)7A-C7AC-2(7A2-)7A-B3-C3-2B2-C-C2-B-7A2-2(7A-C7AC-)7A2-7A-B2-C-C2-2B-C3-C-B-7A-C7AC-2(7A2-)7A-C7AC-7A-B-C3-C-2B7-B-6(7A2-)7A-B7-11B7-2B-C3-C-2B2-C-C2-2B3-C3-2B2-C-C2-2B-C3-C-2B7-10B'

  let error
  if (!svoxmodel || svoxmodel.trim() === '') {
    error = { name: 'ConfigError', message: 'Model not found' }
    svoxmodel = _MISSING
  }

  let model = null
  try {
    model = ModelReader.readFromString(svoxmodel)
  } catch (err) {
    error = err
    model = ModelReader.readFromString(_ERROR)
  }

  const svoxmesh = SvoxMeshGenerator.generate(model, buffers)
  svoxmesh.error = error

  return svoxmesh
}
