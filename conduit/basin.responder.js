var cadence = require('cadence')
var Procesion = require('procession')

function Responder (object) {
    this._object = object
    this.responses = new Procesion
}

Responder.prototype.enqueue = cadence(function (async, value) {
    async(function () {
        this._object.request(value, async())
    }, function (value) {
        if (value != null) {
            this.responses.enqueue(value, async())
        }
    })
})

exports.Responder = Responder
