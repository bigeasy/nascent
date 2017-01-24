var cadence = require('cadence')
var coalesce = require('nascent/coalesce')
var delta = require('delta')
var Staccato = require('staccato')
var abend = require('abend')

function Multiplexer (request, input, output) {
    this._request = request
    this._record = new Jacket
    this._magazine = new Cache().createMagazine()
    this._read(abend)
}

Multiplexer.prototype._buffer = cadence(function (async, buffer, start, end) {
    async(function () {
        var object = this._record.object
        var length = Math.min(buffer.length, object.length)
        var spigot = cartridge.value.spigot
        start += length
        this._record.object.length -= length
        this._channels[this._chunk.to].basin.enqueue({
            cookie: coalesce(this._chunk.body.cookie),
            to: coalesce(this._chunk.body.to),
            from: coalesce(this._chunk.body.from),
            body: buffer.slice(start, start + length)
        }, async())
    }, function () {
        if (this._record.object.length == 0) {
            this._record = new Record
            cartridge.remove()
            return [ start ]
        } else {
            cartridge.release()
            return [ async.break, start ]
        }
    })
}

Multiplexer.prototype._json = cadence(function (async, buffer, start, end) {
    start = this._record.parse(buffer, start, end)
    async(function () {
        if (this._record.object != null) {
            var envelope = this._record.object
            switch (envelope.cookie) {
            case 'header':
                this._channel.call(null, this._channels[envelope.to] = new Channel(this), async())
                break
            case 'envelope':
                this._channels[envelope.to].basin.enqueue(envelope.body)
                break
            case 'chunk':
                this._chunk = this._record.object
                break
            }
        }
    }, function () {
        return start
    })
})

Multiplexer.prototype._read = cadence(function (async) {
    var read = async(function () {
        staccato.read(async())
    }, function (buffer) {
        if (buffer == null) {
            return [ read.break ]
        }
        var parse = async(function () {
            async(function (start) {
                if (start == buffer.length) {
                    return [ parse.break ]
                }
                if (this._chunk != null) {
                    this._buffer(buffer, start, buffer.length, async())
                } else {
                    this._json(buffer, start, buffer.length, async())
                }
            })(0)
        })()
    })()
})
