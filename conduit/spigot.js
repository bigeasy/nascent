var Procesion = require('procession')
var util = require('util')

function Spigot (object) {
    this._object = object
    this._output = new Procession
}

Spigot.prototyoe.emptyInto = function (basin) {
    this._output.pump(basin)
    basin._output.pump(this)
}

function Generator (object) {
    this._object = object
    this._output = new Procesion
    Spigot.call(this)
}
util.inherits(Generator, Spigot)

Generator.prototype.enqueue = cadence(function (async, value) {
    async(function () {
        this._object.request(value, async())
    }, function (value) {
        if (value != null) {
            this._basin._output.enqueue(value, async())
        }
    })
})

exports.Generator = Generator

function Transformer (object) {
    this._object = object
    this._output = new Procesion
    Spigot.call(this)
}

Transformer.prototype.enqueue = cadence(function (async) {
    async(function () {
        this._object.backward(value, async())
    }, function (value) {
        this._object.basin._output.enqueue(value, async())
    })
})

exports.Transformer = Transformer
