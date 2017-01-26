var StringDecoder = require('string_decoder').StringDecoder

function Jacket () {
    this._lines = []
    this.object = null
    this.complete = false
    this.valid = false
    this._decoder = new StringDecoder('utf8')
}

Jacket.prototype._json = function () {
    try {
        this.object = JSON.parse(this.json)
        this.valid = true
    } catch (e) {
    }
}

Jacket.prototype.parse = function (buffer, start, end) {
    for (var i = start; i < end; i++) {
        if (buffer[i] == 0xa) {
            this._lines.push(this._decoder.end(buffer.slice(start, i)))
            this.json = this._lines.join('')
            this.completed = true
            this._json()
            return i + 1
        }
    }
    this._lines.push(this._decoder.write(buffer.slice(start, end)))
    return end
}

module.exports = Jacket
