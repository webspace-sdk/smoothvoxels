import readDict from './read-dict.js'

export default function rOBJHandler (state, startIndex, endIndex) {
  let ret = {}

  // DICT node attributes
  ret = readDict(state)
  return ret
}
