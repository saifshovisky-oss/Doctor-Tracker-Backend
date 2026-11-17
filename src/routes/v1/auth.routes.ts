import { Router } from 'express';
import { loginController, logoutController, meController } from '../../controllers/auth.controller';
import { requireAuth } from '../../middleware/auth';
import { loginLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { loginSchema } from '../../validators/auth';

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginSchema }), loginController);
router.post('/logout', logoutController);
router.get('/me', requireAuth, meController);

export default router;
