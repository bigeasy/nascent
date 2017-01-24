function Address (legislator) {
    this._legislator = legislator
    this.spigot = new Spigot(this)
    this.basin = new Basin(this)
}

Address.prototype._basinToSpigot = cadence(function (async, envelope) {
    return { to: this._legislator.properties[envelope.to], from: envelope.from, body: envelope.body }
})

Address.prototype._spigotToBasin = cadence(function (async, envelope) {
    return envelope
})
