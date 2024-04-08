const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { badRequest, cookieConfig } = require("./util");

//Create Prisma client
const client = new PrismaClient();
//@Public: true
//@api  /auth/register
//register user
exports.register = async (req, res) => {
    const {pwd, email} = req.body;
    try {
        if (await findUser(email))
            return res
                .status(409)
                .json({ message: "user with this email already exists" })
                .end();
        const newPwd = await bcrypt.hash(pwd, 10);
        const user = await client.user.create({ data: { ...req.body, pwd:newPwd } });
        const token = generateJwt({ uid: user.id });
        createCookie(res, token);
        res.json(user).end(); // send back newly created user obj
    } catch (err) {
        console.log(err);
        return badRequest(res);
    }
};

exports.logIn = async (req, res) => {
    try {
        const { email, pwd } = req.body;
        const user = await findUser(email);
        //if user doesn't exist
        if (!user)
            return res
                .status(409)
                .json({ message: "no account was registered with this email" })
                .end();
        //Validate password
        const isValidPwd = await bcrypt.compare(pwd, user.pwd);
        if (!isValidPwd)
            return res
                .status(401)
                .json({ message: "password is incorrect :(" })
                .end();
        //Create token
        const token = generateJwt({ uid: user.id });
        await client.user.update({
            where: { id: user.id },
            data: { lastLoggedIn: new Date().toISOString() },
        });
        createCookie(res, token);
        res.json(user).end();
    } catch (err) {
        console.log(err);
        return badRequest(res);
    }
};

//Delete cookie when user log out
exports.logOut = (_, res) => {
    res.clearCookie("pm", cookieConfig).end();
};

//@public: false
exports.changePwd = async (req, res) => {
    try {
        const { oldPwd, newPwd } = req.body;
        const id = +req.user.uid;
        const user = await client.user.findFirst({ where: { id } });
        const isValidPwd = await bcrypt.compare(oldPwd, user.pwd);
        if (!isValidPwd)
            return res
                .status(401)
                .json({ message: "old password is incorrect :(" })
                .end();
        const pwd = await bcrypt.hash(newPwd, 10);
        await client.user.update({ where: { id }, data: { pwd } });
        res.json({ message: "Password changed successfully" });
    } catch (err) {
        console.log(err);
        return badRequest(res);
    }
};

exports.authMiddleware = (req, res, next) => {
    const cookie = req.cookies["pm"];
    if (!cookie)
        return res
            .status(401)
            .json({
                status: 401,
                message: "please log in to access this resource",
            })
            .end();
    const token = JSON.parse(cookie).token;
    try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        console.log(err);
        return res
            .clearCookie("pm", cookieConfig)
            .status(401)
            .json({ message: err.message })
            .end();
    }
};

const generateJwt = (payload) => {
    return jwt.sign(payload, process.env.JWT_ACCESS_TOKEN_SECRET, {
        expiresIn: "15d",
    });
};

const findUser = (email) => {
    return client.user.findFirst({ where: { email } });
};

function createCookie(res, token) {
    res.cookie("pm", JSON.stringify({ token }), {
        expires: new Date(Date.now() + 1296000000), // 15 days
        ...cookieConfig,
    });
}
