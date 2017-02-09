require('proof/redux')(6, prove)

function prove (assert) {
    var Destructor = require('..')
    var destructor = new Destructor

    destructor.addDestructor('destructor', function () {
        assert(true, 'destructor ran')
    })
    destructor.addDestructor('invoked', function () {
        assert(true, 'destructor invoked')
    })
    destructor.addDestructor('removed', function () {
        throw new Error('should not run')
    })
    destructor.invokeDestructor('invoked')
    destructor.removeDestructor('removed')
    assert(destructor.getDestructors(), [ 'destructor' ], 'removed')

    destructor.check()

    destructor.destroy(new Error('cause'))
    assert(destructor.destroyed, true, 'destroyed')

    try {
        destructor.check()
    } catch (error) {
        console.log(error.stack)
        assert(/^nascent.destructor#destroyed$/m.test(error.message), 'destroyed')
    }

    destructor.destroy()

    destructor.addDestructor('destroyed', function () {
        assert(true, 'run after destroyed')
    })
}
