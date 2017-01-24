function Socket (multiplexer, id) {
    this._multiplexer = multiplexer
    this._id = id
    this.spigot = new Spigot.Generator
    this.basin = new Basin.Responder(this)
}

Socket.prototype.request = cadence(function (async, envelope) {
    async(function () {
        if (envelope == null) {
            this._multiplexer._output.write(JSON.stringify({
                cookie: 'trailer',
                to: this._id,
                from: this._id,
                body: null
            }, async())
        } else if (Buffer.isBuffer(envelope.body)) {
            this._multiplexer._output.write(JSON.stringify({
                cookie: 'chunk',
                to: this._id,
                from: this._id,
                body: { length: envelope.body.length }
            }) + '\n', async())
            this._multiplexer._output.write(envelope.body)
        } else {
            this._multiplexer._output.write(JSON.stringify({
                cookie: 'envelope',
                to: this._id,
                from: this._id,
                body: envelope
            }) + '\n', async())
        }
    }, function () {
        return [ null ]
    })
})

module.exports = Socket
