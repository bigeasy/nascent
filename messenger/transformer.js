function Transformer (transform) {
    this._transform = transform
    this.spigot = new Spigot(this)
    this.basin = new Basin(this)
}

Transformer.protoype.enqueue = cadence(function (async, value) {
})

Transformer.protoype.dequeue = cadence(function (async) {
})

module.exports = Terminator
