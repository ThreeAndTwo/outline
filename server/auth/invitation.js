// @flow

import Router from "koa-router";
import methodOverride from "../middlewares/methodOverride";
import validation from "../middlewares/validation";
import addHours from "date-fns/add_hours";
import {getCookieDomain} from "../utils/domains";
import {v4 as uuidv4} from "uuid";
import {Event, Team, User} from "../models";
import Sequelize from "sequelize";
import invariant from "invariant";
import auth from "../middlewares/authentication";
import crypto from "crypto";
import addMonths from "date-fns/add_months";

const router = new Router();
router.use(methodOverride());
router.use(validation());

router.post("invitation", async (ctx) => {

    const {username, password, invCode} = ctx.body;

    ctx.assertPresent(username, "accountID is required!");
    ctx.assertPresent(password, "accountPwd is required!");
    ctx.assertPresent(invCode, "invCode is required!");

    const team = await Team.findByPk(process.env.TEAM_ID);

    const teamUrl = process.env.TEAM_REDIRECT_URL;

    // ps: ctx.redirect 并不发生实质性的跳转
    // let authInfo = [];

    try {
        // 校验邀请码
        const isValidation = invCodeValidation(invCode);
        if (false === isValidation) {
            console.log("邀请码错误！");
            ctx.body = {
                redirect: `${teamUrl}?notice=invcode_validation`,
                message: "邀请码错误，请重新尝试登陆",
                success: false,
            };
            // 跳转到错误页面
            return;
        }

    } catch (e) {
        console.log("用户名或密码不正确!");
        ctx.body = {
            redirect: `${teamUrl}?notice=ldap_validation`,
            message: "认证失败，请重新尝试登陆",
            success: false,
        };
        // 跳转到错误页面
        return;
    }

    console.log("ppp:", md5Crypto(password));
    const user = await User.findOne({
        where: {
            username: username,
            password: md5Crypto(password),
        },
    });

    if (user) {

        if (!team) {
            ctx.redirect(`/?notice=auth-error`);
            return;
        }

        console.log("service:", user.service);

        if (user.service && "innerInv" !== user.service) {
            ctx.body = {
                redirect: `${teamUrl}/auth/${user.service}`,
            };
            return;
        }
        console.log("认证成功", `${teamUrl}/auth/invitation.callback?accountId=${username}&permit=${md5Crypto(password)}`);
        ctx.body = {
            redirect: `${teamUrl}/auth/invitation.callback?accountId=${username}&permit=${md5Crypto(password)}`
        };
        return;
    }
    ctx.body = {
        redirect: `${teamUrl}/auth/invitation.callback?accountId=${username}&permit=${md5Crypto(password)}`
    };
});

router.get("invitation.callback", auth({required: false}), async (ctx) => {
    const {accountId, permit} = ctx.request.query;
    const state = Math.random().toString(36).substring(7);
    ctx.cookies.set("state", state, {
        httpOnly: false,
        expires: addHours(new Date(), 1),
        domain: getCookieDomain(ctx.request.hostname),
    });

    let userPrimary = uuidv4();
    let team, isFirstUser;
    try {
        [team, isFirstUser] = await Team.findOrCreate({
            where: {
                name: "finance",
            },
            defaults: {
                name: "finance",
                avatarUrl: "https://a.slack-edge.com/80588/img/avatars-teams/ava_0017-88.png",
            },
        });
    } catch (err) {
        if (err instanceof Sequelize.UniqueConstraintError) {
            ctx.redirect(`/?notice=auth-error`);
            ctx.status(307);
            return;
        }
    }
    invariant(team, "Team must exist");

    try {
        const [user, isFirstSignin] = await User.findOrCreate({
            where: {
                username: accountId,
                password: permit,
            },
            defaults: {
                id: userPrimary,
                email: "",
                username: accountId,
                name: accountId,
                password: permit,
                isAdmin: isFirstUser,
                serviceId: userPrimary,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActiveAt: new Date(),
                lastActiveIp: ctx.request.ip,
                lastSignedInAt: new Date(),
                lastSignedInIp: ctx.request.ip,
                teamId: process.env.TEAM_ID,
                avatarUrl: "https://sorel-lookbook.com/wp-content/themes/sorel-microsite-theme/library/img/default-person.png",
                service: "innerInv",
                language: "zh_CN",
            },
        });

        if (isFirstUser) {
            await team.provisionFirstCollection(userPrimary);
            await team.provisionSubdomain(team.domain);
        }

        console.log("222222");
        ctx.signIn(user, team, "innerInv", isFirstSignin);
    } catch (err) {
        if (err instanceof Sequelize.UniqueConstraintError) {
            const exists = await User.findOne({
                where: {
                    service: "innerInv",
                    email: "",
                    teamId: team.id,
                },
            });

            if (exists) {
                ctx.redirect(`${team.url}?notice=email-auth-required`);
            } else {
                ctx.redirect(`${team.url}?notice=auth-error`);
            }
        }
        throw err;
    }

});

function md5Crypto(str) {
    const hash = crypto.createHash('md5')
    hash.update(str)
    return hash.digest('hex');
}

function invCodeValidation(userInvCode) {
    return userInvCode === process.env.INVITATION_CODE;

}

export default router;
