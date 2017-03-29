// Progressive parsing of a newline delimited stream of JSON objects.

// <hr>
// Requirements.

//
var StringDecoder = require('string_decoder').StringDecoder

// <hr>
// Create a new JSON object parser.

//
function Jacket () {
    this.object = null
    this.complete = false
    this.valid = false
    this._lines = []
    this._decoder = new StringDecoder('utf8')
}

// <hr>
// We're going to convert a parse exception into flags, but as I write this
// docco I immediately prefer the notion of raising a wrapped exception that can
// be caught by it's message, i.e. using Interrupt.

//
Jacket.prototype._json = function () {
    try {
        this.object = JSON.parse(this.json)
        this.valid = true
    } catch (e) {
    }
}

// <hr>
// Parse the `buffer` at the range given by `start` and `end`.

//
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

// Export as constructor function.
module.exports = Jacket

