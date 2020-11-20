const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const db = require('./dbConnectExec.js');
const config = require('./config.js')

const auth = require('./middleware/authenticate.js')

const { response } = require('express');
const { executeQuery } = require('./dbConnectExec.js');

//azurewebsites.net, colostate.edu
const app = express();
app.use(express.json())
app.use(cors())

app.post('/customers/logout', auth, (req, res)=> {
    var query = `UPDATE Customer
    SET Token = null
    WHERE CustomerPK = ${req.customer.CustomerPK}`

    db.executeQuery(query)
        .then(()=>{res.status(200).send()})
        .catch((error)=>{
            console.log("error in POST /Customers/logout", error)
            res.status(500).send()

        })
})

app.get("/", (req, res)=> {res.send("Hello World.")})


// const auth = async(req, res, next) => {
//     console.log(req.header("Authorization"))
//     next()
// }

app.get('/Order/me', auth, async(req, res)=>{
    let customerPK = req.customer.CustomerPK;

    var  myQuery = `SELECT *
    FROM OrderTable
    LEFT JOIN Clothes
    ON Clothes.ClothesPK = OrderTable.ClothesFK
    WHERE CustomerFK = ${customerPK}`

    console.log(myQuery)

    db.executeQuery(myQuery)
        .then((orders)=>{
            // console.log("Movies: ", movies)
            if(orders[0]){
                res.send(orders[0])
            }
            else{res.status(404).send('bad request')}
            
        })
        .catch((err)=>{
            console.log("Error in /Order/me", err)
            res.status(500).send()
        })

})


app.post("/Order", auth, async (req, res)=>{
    
    try{var clothesFK = req.body.clothesFK;
        var quantity = req.body.quantity;
        var price = req.body.price;
        var size = req.body.size;
    
        if(!clothesFK || !quantity || !price || !size){res.status(400).send("bad request")}
    
        // summary = summary.replace("'", "''")

        // console.log("here is the contact in /reviews ",req.contact)
        // res.send("here is your response")}

        let insertQuery = `INSERT INTO OrderTable(Quantity, Price, Size, CustomerFK, ClothesFK)
        OUTPUT inserted.OrderPK, inserted.Quantity, inserted.Price, inserted.Size, inserted.ClothesFK
        VALUES(${quantity}, ${price}, '${size}', ${req.customer.CustomerPK}, ${clothesFK})`

        // console.log(insertQuery);

        let insertedReview = await db.executeQuery(insertQuery)

        // console.log(insertReview)
        res.status(500).send(insertedReview[0])
    }
    catch(error){
        console.log("error in POST /order" , error)
        res.status(500).send
    }
   

})

// app.get('/Order/:pk', auth, (req, res)=>{
//     res.send(req.orders)
// })

app.get('/customers/me', auth, (req, res)=> {
    res.send(req.customer)
})


app.get("/hi", (req,res)=>{
    res.send("hello world")
})

app.post("/customers/login", async (req, res)=>{
    //console.log(req.body)

    var email = req.body.email;
    var password = req.body.password;

    if(!email || !password){
        return res.status(400).send('bad request')
    }

    //1. check that user email exists in database
    var query = `SELECT * 
    FROM Customer
    WHERE Email = '${email}'`

    let result;

    try{
        result = await db.executeQuery(query);
    }catch(myError){
        console.log('error in /customers/login', myError);
        return res.status(500).send()
    } 

    // console.log(result)

    if(!result[0]){return res.status(400).send('Invalid user credentials')}

    //2. check that password matches

    let user = result[0]
    // console.log(user)

    if(!bcrypt.compareSync(password,user.Password)){
        console.log("invalid password");
        return res.status(400).send("Invalid user credentials")
    }

    //3. generate a token 
    let token = jwt.sign({pk: user.CustomerPK}, config.JWT, {expiresIn: '60 minutes'})

    // console.log(token)

    //4. save token in database and send token and user info back to user
    let setTokenQuery = `UPDATE Customer
    SET Token = '${token}'
    WHERE CustomerPK = ${user.CustomerPK}`

    try{
        await db.executeQuery(setTokenQuery)

        res.status(200).send({
            token: token,
            user: {
                FirstName: user.FirstName,
                LastName: user.NameLast,
                Email: user.Email,
                CustomerPK: user.CustomerPK
            }
        })
    }
    catch(myError){
        console.log("error setting user token ", myError);
        res.status(500).send()
    }

})

app.post("/customers", async (req, res)=> {
    res.send("creating user")
    console.log("request body", req.body)

    var firstName = req.body.firstName
    var lastName = req.body.lastName
    var email = req.body.email
    var password = req.body.password
    var state = req.body.state

    if(!firstName || !lastName || !email || !password || !state) {
        return res.status(400).send("bad request")
    }

    firstName = firstName.replace("'", "''")
    lastName = lastName.replace("'", "''")

    var emailCheckQuery = `SELECT email 
    FROM customer
    WHERE email ='${email}'`

    var existingUser = await db.executeQuery(emailCheckQuery)
    // console.log("existing user", existingUser)
    if (existingUser[0]) {
        return res.status(409).send('Please enter a different email')
    }

    var hashedPassword = bcrypt.hashSync(password)

    var insertQuery = `INSERT INTO customer(FirstName, LastName, Email, Password, State)
    VALUES('${firstName}', '${lastName}', '${email}', '${hashedPassword}', '${state}')`

    db.executeQuery(insertQuery)
    .then(()=>{
        res.status(201).send()
    })
    .catch((err)=> {
        console.log("error in post /customers", err)
        res.status(500).send()
    })

})

app.get("/clothes", (req,res)=>{
    //get data from database
    db.executeQuery(`SELECT *
    from Clothes
    LEFT JOIN Brand
    ON Brand.BrandPK = clothes.BrandFK`)
    .then((result)=>{
        res.status(200).send(result)
    })
    .catch((err)=>{
        console.log(err)
        res.status(500).send()
    })
})

app.get("/clothes/:pk", (req, res)=> {
    var pk = req.params.pk
    
    var  myQuery = `SELECT *
    FROM Clothes
    LEFT JOIN Brand
    ON Brand.BrandPK = Clothes.BrandFK
    WHERE ClothesPK = ${pk}`

    console.log(myQuery)

    db.executeQuery(myQuery)
        .then((clothes)=>{
            // console.log("Movies: ", movies)
            if(clothes[0]){
                res.send(clothes[0])
            }
            else{res.status(404).send('bad request')}
            
        })
        .catch((err)=>{
            console.log("Error in /clothes/pk", err)
            res.status(500).send()
        })
})

// app.get("/Order/:pk", (req, res)=> {
//     var pk = req.params.pk
    
//     var  myQuery = `SELECT *
//     FROM OrderTable
//     LEFT JOIN Clothes
//     ON Clothes.ClothesPK = OrderTable.ClothesFK
//     WHERE OrderPK = ${pk}`

//     console.log(myQuery)

//     db.executeQuery(myQuery)
//         .then((orders)=>{
//             console.log("Orders: ", orders)
//             if(orders[0]){
//                 res.send(orders[0])
//             }
//             else{res.status(404).send('bad request')}
            
//         })
//         .catch((err)=>{
//             console.log("Error in /orders/pk", err)
//             res.status(500).send()
//         })
// }

// )

const PORT = process.env.PORT || 5000
app.listen(PORT,()=>{console.log(`app is running on port ${PORT}`)})