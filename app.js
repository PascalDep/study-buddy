import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/routes.js';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';

dotenv.config();

// express app
const app = express();

const dbURI = "mongodb+srv://PascalDeporta1:jKi9gDn8lwtDvtA1@usercluster.syhgxix.mongodb.net/StudyBuddies?retryWrites=true&w=majority";

mongoose.connect(dbURI, {})
    .then((result) => app.listen(3000))
    .then(() => console.log('Listening...'))
    .catch((err) => console.log(err));

// register view engine
app.set('view engine', 'ejs');

// middleware & static files
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(routes);

// 404 page
app.use((req, res) => {
    res.status(404).render('404', { title: '404' });
});


