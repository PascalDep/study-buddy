import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';
import { requireAuth, checkUser, checkEmail, resetUserSession } from '../middleware/authMiddleware.js';
import { fetchChatData } from '../middleware/chatMiddleware.js';

const router = Router();

router.get('*', checkUser);

// Add an SSE route for chat responses
router.get('/chat/sse', chatController.chat_sse);

// routes
router.get('/', requireAuth, checkUser, resetUserSession, fetchChatData, chatController.home_get);

router.get('/chat', requireAuth, checkUser, fetchChatData, chatController.chat_get);
router.post('/chat', requireAuth, checkUser, fetchChatData, chatController.chat_post);
router.post('/chat/lookup', requireAuth, checkEmail, chatController.chatLookup_post);
router.post('/chat/delete', requireAuth, checkEmail, chatController.delete_history_post);

router.get('/help', chatController.help_get);
router.get('/about', chatController.about_get);

router.get('/signup', chatController.signup_get);
router.post('/signup', chatController.signup_post);
router.get('/login', chatController.login_get);
router.post('/login', chatController.login_post);
router.get('/logout', chatController.logout_get);

router.post('/language', chatController.language_post);

export default router;
