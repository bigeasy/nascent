require('proof/redux')(1, require('cadence')(prove))

function prove (async, assert) {
    assert(true, 'prove')
    var Basin = require('../basin')
    var responder = new Basin.Responder({
    })
}
