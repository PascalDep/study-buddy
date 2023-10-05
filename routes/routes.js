import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';
import { requireAuth, checkUser, checkEmail } from '../middleware/authMiddleware.js';

const router = Router();

router.get('*', checkUser);

// routes
router.get('/', requireAuth, checkEmail, chatController.home_get);

router.get('/chat', requireAuth, checkEmail, chatController.chat_get);
router.post('/chat', requireAuth, checkEmail, chatController.chat_post);
router.post('/chat/lookup', requireAuth, checkEmail, chatController.chatLookup_post);

router.get('/help', chatController.help_get);
router.get('/about', chatController.about_get);

router.get('/signup', chatController.signup_get);
router.post('/signup', chatController.signup_post);
router.get('/login', chatController.login_get);
router.post('/login', chatController.login_post);
router.get('/logout', chatController.logout_get);

router.post('/language', chatController.language_post);

export default router;