require('proof/redux')(1, require('cadence')(prove))

function prove (async, assert) {
    var Basin = { Queue: require('../basin.Queue') }
    var queue = new Basin.Queue({
        enqueue: function (envelope, callback) {
            assert(envelope, { body: 1 }, 'enqueue')
            callback(null)
        }
    })
    queue.enqueue({ body: 1 }, async())
}
