import SIZEHandler from './SIZE'
import XYZIHandler from './XYZI'
import RGBAHandler from './RGBA'
import PACKHandler from './PACK'
import MATTHandler from './MATT'
import nTRNHandler from './nTRN'
import nGRPHandler from './nGRP'
import nSHPHandler from './nSHP'
import LAYRHandler from './LAYR'
import MATLHandler from './MATL'
import rOBJHandler from './rOBJ'
import IMAPHandler from './IMAP'
import SKIPHandler from './SKIP'

const chunkHandlers = {
  SIZE: SIZEHandler,
  XYZI: XYZIHandler,
  RGBA: RGBAHandler,
  PACK: PACKHandler,
  MATT: MATTHandler,
  nTRN: nTRNHandler,
  nGRP: nGRPHandler,
  nSHP: nSHPHandler,
  LAYR: LAYRHandler,
  MATL: MATLHandler,
  rOBJ: rOBJHandler,
  IMAP: IMAPHandler
}

export default function getChunkData (state, id, startIndex, endIndex) {
  if (!chunkHandlers[id]) {
    console.log('Unsupported chunk type ' + id)
    return SKIPHandler(state, startIndex, endIndex)
  }
  return chunkHandlers[id](state, startIndex, endIndex)
};
