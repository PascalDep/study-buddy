import jwt from 'jsonwebtoken';
import User from '../models/user.js';


const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt;
    // Check if the JSON Web Token exists and is verified
    if (token) {
        jwt.verify(token, 'sRkv:C9/h)X@qd4>}JM;=ZtrP#F8QgBT', (err, decodedToken) => {
            if (err) {
                console.log(err.message);
                res.redirect('/login');
            } else {
                //console.log(decodedToken);
                next();
            }
        });
    } else {
        res.redirect('/login');
    }
};

// check current user
const checkUser = (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, 'sRkv:C9/h)X@qd4>}JM;=ZtrP#F8QgBT', async (err, decodedToken) => {
            if (err) {
                res.locals.user = null;
                next();
            } else {
                let user = await User.findById(decodedToken.id);
                res.locals.user = user;
                req.user = user;
                next();
            }
        });
    } else {
        res.locals.user = null;
        next();
    }
};

// check current user
const resetUserSession = (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, 'sRkv:C9/h)X@qd4>}JM;=ZtrP#F8QgBT', async (err, decodedToken) => {
            if (!err) {
                let user = await User.findById(decodedToken.id);
                const filter = { _id: user._id };
                const update = { currentSession: -1 };
                const result = await User.updateOne(filter, update);
                next();
            }
        });
    } else {
        res.locals.user = null;
        next();
    }
};

// check current user
const checkEmail = (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, 'sRkv:C9/h)X@qd4>}JM;=ZtrP#F8QgBT', async (err, decodedToken) => {
            if (err) {
                req.userEmail = null; // Set userEmail to null in case of error
                next();
            } else {
                let user = await User.findById(decodedToken.id);
                req.userEmail = user.email;
                next();
            }
        });
    } else {
        req.userEmail = null; // Set userEmail to null when there's no token
        next();
    }
};


export { requireAuth, checkUser, checkEmail, resetUserSession };
