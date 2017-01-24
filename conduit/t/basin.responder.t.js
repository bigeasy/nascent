require('proof/redux')(2, require('cadence')(prove))

function prove (async, assert) {
    var Basin = require('../basin.responder')
    var responder = new Basin.Responder({
        request: function (value, callback) {
            if (value == 1) {
                callback(null, value)
            } else {
                callback()
            }
        }
    })
    var responses = responder.responses.consumer()
    async(function () {
        responder.enqueue(1, async())
    }, function () {
        assert(responses.shift(), 1, 'responder responded')
    }, function () {
        responder.enqueue(2, async())
    }, function () {
        assert(responses.shift(), null, 'responder swallowed')
    })
}
