var Procesion = require('procession')
var cadence = require('cadence')

function Responder (object) {
    this._object = object
    this._output = new Procesion
}

Responder.prototype.enqueue = cadence(function (async, value) {
    async(function () {
        this._object.request(value, async())
    }, function (value) {
        if (value != null) {
            this._basin._output.enqueue(value, async())
        }
    })
})

exports.Responder = Responder

function Transformer (object) {
    this._object = object
    this._input = new Consumer(this)
    this._output = new Procesion
}

Transformer.prototype.enqueue = cadence(function (async) {
    async(function () {
        this._object.forward(value, async())
    }, function (value) {
        this._object.spigot._output.enqueue(value, async())
    })
})

exports.Transformer = Transformer
