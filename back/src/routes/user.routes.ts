import express from 'express';
import { UserController } from '../controllers/user.controller';

const userRouter = express.Router();

userRouter.route('/login').post(
    (req, res) => new UserController().login(req, res)
);

userRouter.route('/forgotpassword').post(
    (req, res) => new UserController().forgotPassword(req, res)
);
userRouter.route('/forgotpassword').post(
    (req, res) => new UserController().forgotPassword(req, res)
);

userRouter.route('/resetpassword').post(
    (req, res) => new UserController().resetPassword(req, res)
);
userRouter.route('/adminlogin').post(
    (req, res) => new UserController().adminLogin(req, res)
);

userRouter.route('/registruj').post(
    (req, res) => new UserController().registracija(req, res)
);


userRouter.route('/updateprofil').post(
    (req, res) => new UserController().updateProfil(req, res)
);



export default userRouter;
