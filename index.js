const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.urlencoded({ extended: false }))
app.use(cookieParser());
app.use(express.json());

const articles2 = new mongoose.model('articles2',{ title : String, username : String, description : String});
const users = new mongoose.model('users',{ username : String, email : String, password : String, role : String });

app.get('/',(req,res)=>{
    res.send('Welcome to homepage!');
})


// ----------- User Routes ---------

// Regiter New User
app.post('/register', async(req,res)=>{
    const user = new users({
        username : req.body.username,
        email : req.body.email,
        password : req.body.password,
        role : req.body.role
    })
    try{
        const new_user = await user.save();
        res.status(200).json({ 
            new_user,
            message : 'User Added successfully!'
        })
    }catch(err){
        console.log(err);
    }
})

// Login
app.post('/login',async (req,res) => {
    const user = await users.findOne({ email : req.body.email, password : req.body.password});
    if(user){
        const token = jwt.sign({ username : user.username },"my_secret_key");
        user.token = token;
        console.log(token);
        if(user.role == 'admin'){
            res.status(200).cookie("token",token,{ maxAge : 500 * 1000, httpOnly : true }).redirect('/admin-panel');
        }
        else{
            res.status(200).cookie("token",token,{ maxAge : 500 * 1000, httpOnly : true }).redirect('/my-articles');
        }
    }else{
        res.status(400).send("Invalid Credentials");
    }
})

// ---------- Middleware -------------
function verifyToken(req,res,next){
    const token = req.cookies.token || req.body.token;
    if(!token){
        return res.status(403).send('Forbidden');
    }else{
        try{
            const decoded = jwt.verify(token,'my_secret_key');
            req.user = decoded;
            console.log(decoded);
        }catch(err){
            res.status(401).send('Invalid Token!');
        }
    }
    next();
}

// Admin Panel ----------------

app.get('/admin-panel',verifyToken,async(req,res) => {
    const role = req.user.role;
    console.log(role);
    if(role == 'admin'){
        res.redirect('/admin-panel');
    }
    else{
        res.send('Forbidden!');
    }
    const user = await users.find({}, {_id : 0,password :0});
    res.status(200).json({
        user : user
    })
    // user.forEach(element => {
    //     (` Author : ${element.username}  , Email : ${element.email} , Role : ${element.role}`);
    //   });
})


// ----------- Article Routes ---------

// Get All Articles
app.get('/all-articles',async(req,res)=>{
    const article = await articles2.find({}, { _id : 0 });  // db.student.find({}, {_id:0})
    res.status(200).json({ 
        article : article
    });
})

// Add new Article
app.post('/articles/new', verifyToken, async(req,res) => {
    let new_article = new articles2({
        title : req.body.title,
        username : req.user.username,
        description : req.body.description
    })
    try{
        await new_article.save();
        res.json({
            article : new_article
        })
    }catch(err){
        console.log(err);
    }
})

// Delete Article
app.get('/articles/delete',verifyToken,async(req,res)=>{
    const post_id = req.body.post_id;
    const article = await articles2.findById(post_id);
    if(article.username === req.user.username){
        try{
            await article.delete();
            res.status(200).json({
                message : 'Article has been deleted!'
            })
        }catch(err){
            res.json(err);
        }
    }else{
        res.status(401).json('You can delete your posts only!');
    }
    console.log(post_id);
    res.json({
        article : article
    })
})

// Update Article
app.get('/articles/update',verifyToken,async(req,res)=>{
    const post_id = req.body.post_id;
    const article = await articles2.findById(post_id);
    if(article.username === req.user.username){
        try{
            const new_article = await articles2.findByIdAndUpdate(post_id,{ 
                title : req.body.title,
                username : req.user.username,
                description : req.body.description
            },
            { 
                new : true
            });     
            res.status(200).json({
                    message : 'Article has been Updated successfully!',
                    article : new_article
                });
        }catch(err){
            res.json(err);
        }
    }else{
        res.status(401).json('You can delete your posts only!');
    }
})


// Get My Articles
app.get('/my-articles',verifyToken,async(req,res) => {
    const username  = req.user.username;
    const article = await articles2.find({ username });
    res.json({
        article : article
    })
})


app.listen(3000,()=>{
    try{
        mongoose.connect('mongodb+srv://itzpkhere:itz_pk_here@nodetuts.epwi7.mongodb.net/blogdb2?retryWrites=true&w=majority');
    }catch(err){
        console.log(err);
    }
    console.log("Server Started successfully on port 3000!");
})
