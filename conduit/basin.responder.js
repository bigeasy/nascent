var cadence = require('cadence')
var Procesion = require('procession')
var coalesce = require('../coalesce')

function Responder (object) {
    this._object = object
    this.responses = new Procesion
}

Responder.prototype.enqueue = cadence(function (async, envelope) {
    async(function () {
        this._object.request(envelope, async())
    }, function (response) {
        if (envelope.from != null) {
            this.responses.enqueue({
                cookie: coalesce(envelope.cookie),
                to: envelope.from,
                body: coalesce(response)
            }, async())
        }
    })
})

exports.Responder = Responder
