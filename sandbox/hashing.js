const bcrypt = require('bcryptjs')

var  hasehdPassword = bcrypt.hashSync('asdfasdf')

console.log(hasehdPassword)

var hashTest = bcrypt.compareSync('asdfasdf', hasehdPassword)

console.log(hashTest)